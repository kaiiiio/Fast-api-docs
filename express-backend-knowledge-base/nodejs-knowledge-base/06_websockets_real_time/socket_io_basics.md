# WebSockets & Real-Time Communication in Node.js

Real-time features like chat, live notifications, and collaborative editing require persistent, bidirectional connections between the client and server.

## 1. WebSockets (WS) vs HTTP
- **HTTP**: Request-response, stateless, client-initiated.
- **WebSocket**: Bidirectional, stateful, persistent connection, low latency.

---

## 2. Socket.io (Recommended)
While the native `ws` module exists, **Socket.io** is the industry standard because it provides:
- **Auto-reconnection**
- **Multiplexing** (Namespaces/Rooms)
- **Binary Support**
- **Fallback mechanisms** (HTTP Long Polling)

### Server Setup (Express)
```javascript
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('chat message', (msg) => {
    io.emit('chat message', msg); // Broadcast to everyone
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

server.listen(3000);
```

---

## 3. Rooms & Namespaces
### Rooms (Grouping)
Rooms allow you to broadcast to a specific subset of clients (e.g., a specific chat group).
```javascript
// Joining a room
socket.join('room-101');

// Sending to a room
io.to('room-101').emit('new_event', data);
```

### Namespaces (Logical Separation)
Namespaces allow you to separate concerns (e.g., an `/admin` namespace vs a `/chat` namespace).
```javascript
const adminNamespace = io.of('/admin');
adminNamespace.on('connection', (socket) => {
  // Logic for admin only
});
```

---

## 4. Scalability (Redis Adapter)
By default, Socket.io stores session/room data in memory. If you scale to multiple servers, clients on Server A won't receive messages from Server B.
- **Solution**: Use the **@socket.io/redis-adapter**. It uses Redis as a message broker to synchronize state across all servers.

---

## 5. Best Practices
1. **Authentication**: Use middleware to verify JWTs before allowing a connection.
2. **Rate Limiting**: Prevent socket floods by limiting the number of events a client can emit.
3. **Graceful Disconnection**: Clean up user states in your database when a socket disconnects.
4. **Error Handling**: Listen for `connect_error` on the client and `error` on the server.
5. **Heartbeats**: Use ping/pong mechanisms to detect "zombie" connections.
