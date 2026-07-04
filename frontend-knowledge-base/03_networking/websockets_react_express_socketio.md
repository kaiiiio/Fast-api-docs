# WebSockets in React + Express

For the full end-to-end guide, read:

[React + Express WebSocket Guide (Socket.IO)](../../express-backend-knowledge-base/10_Sockets/06_react_express_socketio_end_to_end.md)

Quick frontend meanings:

* **WebSocket** (persistent two-way connection): browser and server can send anytime.
* **Socket.IO client** (frontend socket library): connects React to Express Socket.IO server.
* **socket.emit** (send event): React sends data to backend.
* **socket.on** (receive event): React listens for backend events.
* **socket.connected** (connection status): boolean to show connected/disconnected UI.
* **socket.id** (connection ID): unique ID assigned after connect.
* **DevTools WS tab** (connection verification): inspect WebSocket frames/messages.

Minimal React check:

```jsx
<p>Status: {socket.connected ? "Connected" : "Disconnected"}</p>
<p>Socket ID: {socket.id || "-"}</p>
```

Browser verification:

```txt
DevTools -> Network -> WS -> /socket.io/?EIO=4&transport=websocket
```

