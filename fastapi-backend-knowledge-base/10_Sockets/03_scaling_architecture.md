# 03. Scaling Architecture: Beyond a Single Server

## 1. The Problem: Memory Isolation

When you deploy FastAPI to production, you don't run `python main.py`. You run a process manager like Gunicorn with Uvicorn workers.

```bash
# Gunicorn: Creates multiple worker processes for scaling.
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app
```

This creates 4 separate processes. **Process 1** has a list of 100 users. **Process 2** has a list of 50 users. **Process 1 CANNOT see Process 2's list.** If User A (on Process 1) sends a message "Hello", Process 1 iterates through its list. Users on Process 2 hear silence.

---

## 2. The Solution: The Pub/Sub Backplane

We need a central nervous system. **Redis** is the standard choice for pub/sub messaging.

### The Flow: **User A** sends "Hello" to **Worker 1**. **Worker 1** publishes "Hello" to Redis Channel `chat_room`. **Worker 2** (and 3, and 4) are subscribed to `chat_room`. **Worker 2** receives "Hello" from Redis. **Worker 2** pushes "Hello" to all its connected users.

---

## 3. Implementation: Using `broadcaster`

Writing raw `aioredis` code for this is error-prone (handling race conditions, reconnects). Use `broadcaster` library.

```python
# pip install broadcaster[redis]: Install broadcaster with Redis support.
from broadcaster import Broadcast
from fastapi import FastAPI, WebSocket
import asyncio

# Broadcast instance: Handles pub/sub with Redis automatically.
broadcast = Broadcast("redis://localhost:6379")
# FastAPI integration: Connect on startup, disconnect on shutdown.
app = FastAPI(on_startup=[broadcast.connect], on_shutdown=[broadcast.disconnect])

@app.websocket("/ws/{channel_id}")
async def websocket_endpoint(websocket: WebSocket, channel_id: str):
    await websocket.accept()
    
    # 1. Subscribe to Redis: Subscribe to channel for pub/sub messaging.
    async with broadcast.subscribe(channel=channel_id) as subscriber:
        try:
            while True:
                # 2. Wait for EITHER (Client Message) OR (Redis Message): Handle both simultaneously.
                
                # Task A: Listen to Client: Wait for message from WebSocket client.
                client_task = asyncio.create_task(websocket.receive_text())
                
                # Task B: Listen to Redis: Wait for message from Redis pub/sub.
                redis_task = asyncio.create_task(subscriber.get())
                
                # Wait for first one to complete: Handle whichever arrives first.
                done, pending = await asyncio.wait(
                    [client_task, redis_task],
                    return_when=asyncio.FIRST_COMPLETED  # Return when first task completes
                )
                
                # Cleanup pending task: Cancel the task that didn't complete.
                for task in pending:
                    task.cancel()
                
                # Handle client message: Client sent message, publish to Redis.
                if client_task in done:
                    # Client spoke -> Publish to Redis: Broadcast to all subscribers.
                    msg = client_task.result()
                    await broadcast.publish(channel=channel_id, message=msg)
                    
                # Handle Redis message: Redis received message, send to client.
                if redis_task in done:
                    # Redis spoke -> Send to Client: Forward message to WebSocket client.
                    event = redis_task.result()
                    await websocket.send_text(event.message)
                    
        except WebSocketDisconnect:
            pass
```

### Why this works: It doesn't matter which worker a user connects to. It doesn't matter if you have 4 workers or 400 servers. Redis handles the routing.

---

## 4. Alternative: Kafka / RabbitMQ?

- **Redis Pub/Sub:** Fire and forget. Fast. If a worker is offline, it misses the message. Perfect for Chat.
- **Kafka/RabbitMQ:** Durable. If a worker is offline, the message waits. Overkill for Chat, but good for "Job Queues" or "Notifications that MUST be delivered".

For 99% of WebSocket use cases (Chat, Notifications, Live Sports), **Redis** is the correct choice.