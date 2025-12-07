# 02. FastAPI Implementation: The Basics

## 1. The `WebSocket` Endpoint

FastAPI wraps Starlette's WebSocket implementation. It handles the handshake, framing, and event loop integration.

```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI()

# WebSocket endpoint: Handles bidirectional real-time communication.
@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: int):
    # 1. Accept: Must accept connection before sending/receiving.
    await websocket.accept()
    
    try:
        while True:
            # 2. Receive: Wait for message from client (non-blocking).
            data = await websocket.receive_text()
            
            # 3. Process & Send: Send response back to client.
            await websocket.send_text(f"You said: {data}")
            
    except WebSocketDisconnect:
        # Handle disconnect gracefully: Client closed connection.
        print(f"Client {client_id} disconnected")
```

### Critical Rules

1. **Always `await`**: WebSockets are async. If you use `time.sleep(1)`, you block the entire server. Use `asyncio.sleep(1)`.

2. **Handle Disconnects**: The `try...except WebSocketDisconnect` block is mandatory. Without it, your server logs will be flooded with errors every time a user closes a tab.

3. **Accept First**: You cannot send or receive data before `await websocket.accept()`.

---

## 2. The Connection Manager Pattern

You need a way to store active connections. Do not rely on global variables in `main.py` if you can avoid it, but for a single-process app, a class-based manager is standard.

```python
from typing import List

# ConnectionManager: Manages active WebSocket connections for broadcasting.
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []  # Track all active connections

    async def connect(self, websocket: WebSocket):
        await websocket.accept()  # Accept connection
        self.active_connections.append(websocket)  # Add to active list

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)  # Remove from active list

    async def send_personal_message(self, message: str, websocket: WebSocket):
        # Send message to specific client.
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        # Broadcast to all connected clients: Iterate over copy to avoid modification errors.
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except RuntimeError:
                # Connection might be closed already: Handle gracefully.
                pass

manager = ConnectionManager()
```

---

## 3. Handling JSON

Most modern apps send JSON, not raw text. FastAPI provides `receive_json()` and `send_json()` for automatic JSON handling.

```python
# JSON WebSocket: FastAPI automatically handles JSON serialization/deserialization.
@app.websocket("/ws/json")
async def json_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        # receive_json: Automatically parses JSON string to Python Dict.
        data = await websocket.receive_json() 
        
        # data is now a dict, e.g., {"action": "chat", "msg": "hello"}
        if data.get("action") == "chat":
            response = {"status": "ok", "echo": data["msg"]}
            
            # send_json: Automatically dumps Python Dict to JSON string.
            await websocket.send_json(response)
```

## 4. Concurrency: `run_in_executor`

If you need to do something CPU intensive (image processing) or blocking (synchronous DB call) inside a WebSocket loop, do not do it directly. Use `run_in_executor` to avoid blocking the event loop.

```python
import asyncio

# Heavy computation: Use thread pool to avoid blocking event loop.
@app.websocket("/ws/heavy")
async def heavy_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        data = await websocket.receive_text()
        
        # BAD: Blocks the event loop (don't do this!).
        # result = heavy_computation(data) 
        
        # GOOD: Runs in a thread pool (non-blocking).
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, heavy_computation, data)
        
        await websocket.send_text(str(result))

---

## 🎯 Interview Questions: FastAPI

### Q1: Explain WebSocket implementation in FastAPI, including how WebSockets work, connection management, message handling, broadcasting, and best practices. Provide detailed examples showing a complete WebSocket application.

**Answer:**

**WebSocket Overview:**

WebSockets provide full-duplex communication between client and server over a single TCP connection. Unlike HTTP, WebSockets maintain a persistent connection, enabling real-time bidirectional communication.

**Why WebSockets:**

**Without WebSockets (HTTP Polling):**
```python
# ❌ Bad: Client polls server repeatedly
# Client: GET /messages (every 1 second)
# Server: Returns messages
# Problem: High latency, server load, inefficient
```

**With WebSockets:**
```python
# ✅ Good: Persistent connection
# Client: WebSocket connection
# Server: Push messages immediately
# Benefit: Low latency, efficient, real-time
```

**Basic WebSocket Endpoint:**
```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI()

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: int):
    # 1. Accept connection (required before sending/receiving)
    await websocket.accept()
    
    try:
        while True:
            # 2. Receive message from client
            data = await websocket.receive_text()
            
            # 3. Process and send response
            await websocket.send_text(f"You said: {data}")
            
    except WebSocketDisconnect:
        # Handle disconnect gracefully
        print(f"Client {client_id} disconnected")
```

**Connection Manager:**
```python
from typing import List

class ConnectionManager:
    """Manages active WebSocket connections."""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        """Accept and track connection."""
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        """Remove connection."""
        self.active_connections.remove(websocket)
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        """Send message to specific client."""
        await websocket.send_text(message)
    
    async def broadcast(self, message: str):
        """Broadcast to all connected clients."""
        for connection in self.active_connections.copy():
            try:
                await connection.send_text(message)
            except RuntimeError:
                # Connection closed, remove it
                self.active_connections.remove(connection)

manager = ConnectionManager()
```

**JSON Messages:**
```python
@app.websocket("/ws/json")
async def json_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        # Receive JSON (automatically parsed)
        data = await websocket.receive_json()
        
        # Process
        if data.get("action") == "chat":
            response = {"status": "ok", "echo": data["msg"]}
            
            # Send JSON (automatically serialized)
            await websocket.send_json(response)
```

**Handling CPU-Intensive Tasks:**
```python
import asyncio

@app.websocket("/ws/heavy")
async def heavy_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        data = await websocket.receive_text()
        
        # ❌ Bad: Blocks event loop
        # result = heavy_computation(data)
        
        # ✅ Good: Run in thread pool
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, heavy_computation, data)
        
        await websocket.send_text(str(result))
```

**Best Practices:**

**1. Always Handle Disconnects:**
```python
# Use try/except WebSocketDisconnect
# Prevents server errors on client disconnect
```

**2. Use Async Operations:**
```python
# Never use blocking operations
# Use asyncio.sleep, not time.sleep
# Use run_in_executor for CPU-bound tasks
```

**3. Accept Before Sending:**
```python
# Must call await websocket.accept() first
# Cannot send/receive before accepting
```

**System Design Consideration**: WebSockets provide:
1. **Real-time**: Low latency communication
2. **Efficiency**: Persistent connection
3. **Bidirectional**: Full-duplex communication
4. **Scalability**: Handle many connections

WebSockets are essential for real-time applications. Understanding connection management, message handling, broadcasting, and best practices is crucial for building scalable real-time systems.

---

### Q2: Explain WebSocket connection lifecycle, error handling, scaling WebSockets across multiple servers, and performance optimization. Discuss when to use WebSockets vs HTTP polling vs Server-Sent Events.

**Answer:**

**Connection Lifecycle:**
```
1. Client initiates WebSocket handshake
2. Server accepts connection
3. Bidirectional communication
4. Client/server closes connection
5. Cleanup resources
```

**Error Handling:**
```python
# Handle disconnects gracefully
# Retry logic for failed connections
# Timeout handling
```

**Scaling:**
```python
# Use Redis pub/sub for multi-server
# Connection manager per server
# Broadcast via message broker
```

**WebSockets vs Alternatives:**

**WebSockets:**
- Full-duplex, low latency
- Best for: Chat, gaming, real-time updates

**HTTP Polling:**
- Simple, one-way
- Best for: Simple updates, low frequency

**Server-Sent Events:**
- One-way, server to client
- Best for: Notifications, live feeds

**System Design Consideration**: WebSocket scaling requires:
1. **Message Broker**: Redis pub/sub
2. **Connection Management**: Per-server managers
3. **Load Balancing**: Sticky sessions
4. **Monitoring**: Track connections

Understanding WebSocket lifecycle, scaling, and when to use WebSockets vs alternatives is essential for building scalable real-time systems.

```
