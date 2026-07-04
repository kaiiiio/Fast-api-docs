# WebSocket Basics (FastAPI): Minimal Guide

## Core Pattern
*   **Definition:** Bidirectional, real-time communication between client and server over a single TCP connection.
*   **Status:** Starts as HTTP (Upgrade request) → Handshake → WebSocket connection.

## Implementation Example
```python
from fastapi import WebSocket, WebSocketDisconnect

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept() # 🤝 Starts connection
    try:
        while True:
            data = await websocket.receive_text() # 📩 Listen
            await websocket.send_text(f"Echo: {data}") # 📨 Reply
    except WebSocketDisconnect: # 🔌 Handles client exit
        print("Client disconnected")
```

## Connection Lifecycle
1.  **Accept:** `await websocket.accept()` must be the first thing.
2.  **Loop:** `while True` to keep the connection alive.
3.  **Close:** Client or server can close the connection (handled via `WebSocketDisconnect`).

## Best Practices
- ✅ Handle **Disconnects** cleanly in a `try...finally` or `try...except` block.
- ✅ Rate-Limit: Monitor message frequency to prevent spam/abuse.
- ✅ Token Auth: Pass token via Query Params (`/ws?token=XYZ`) or initial message (Headers are inconsistent).
- ✅ Keep it **Async**: WebSockets are natively async; never block the loop.

## Summary Checklist
- ✅ `websocket.accept()` called
- ✅ `while True` loop established
- ✅ `WebSocketDisconnect` handled
- ✅ Token-based auth on connection
