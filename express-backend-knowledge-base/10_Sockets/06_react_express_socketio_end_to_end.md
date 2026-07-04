# React + Express WebSocket Guide (Socket.IO)

WebSockets are used when the server must push data to the browser without waiting for the browser to make another HTTP request.

Use cases:

* Chat messages
* Live notifications
* Order/delivery status updates
* Live dashboards
* Multiplayer/game state
* Collaborative editing
* Real-time stock/inventory updates

---

## Key Terms

* **WebSocket** (persistent two-way connection): browser and server can both send messages anytime.
* **Socket.IO** (WebSocket library): adds events, rooms, reconnects, fallbacks, and easier APIs.
* **Socket** (one connected client): one browser tab/device connection.
* **Event** (named message): example `chat:send`, `notification:new`.
* **Emit** (send event): send data from client or server.
* **Listen/on** (receive event): handle an incoming event.
* **Room** (group of sockets): send to one user, order, chat room, or tenant.
* **Namespace** (separate socket area): example `/chat`, `/admin`.
* **Handshake** (initial connection): first request where auth/query data can be checked.
* **Ack** (callback confirmation): receiver confirms it got/processed an event.
* **Ping/pong** (connection heartbeat): checks if connection is still alive.
* **Reconnect** (connect again after disconnect): Socket.IO can retry automatically.

---

## HTTP vs WebSocket

### Normal HTTP

```txt
React -> Express: GET /notifications
Express -> React: response
Connection closes
```

Good for normal request/response APIs.

### WebSocket

```txt
React opens socket connection
Connection stays open
React can send events anytime
Express can send events anytime
```

Good when data changes without user refreshing or polling.

---

## Event Flow

### Client sends event to server

```txt
React socket.emit("chat:send", message)
        |
        v
Express io.on("connection")
Express socket.on("chat:send", handler)
```

### Server sends event to one client

```txt
Express socket.emit("notification:new", data)
        |
        v
React socket.on("notification:new", handler)
```

### Server broadcasts to everyone

```txt
Express io.emit("announcement", data)
        |
        v
All connected React clients receive event
```

### Server sends to one room

```txt
socket.join("user:123")
io.to("user:123").emit("notification:new", data)
```

This is how you send private user-specific updates.

---

## Install Packages

### Backend

```bash
npm install express socket.io cors
npm install -D nodemon
```

### Frontend

```bash
npm install socket.io-client
```

---

## Express Backend Setup

`server.js`

```js
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.emit("server:welcome", {
    socketId: socket.id,
    message: "Connected to Socket.IO server"
  });

  socket.on("chat:send", (payload, ack) => {
    console.log("chat:send received:", payload);

    const message = {
      id: Date.now().toString(),
      text: payload.text,
      senderId: socket.id,
      createdAt: new Date().toISOString()
    };

    io.emit("chat:new", message);

    if (ack) {
      ack({ ok: true, messageId: message.id });
    }
  });

  socket.on("user:join", ({ userId }) => {
    socket.join(`user:${userId}`);
    console.log(`${socket.id} joined room user:${userId}`);
  });

  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", socket.id, reason);
  });
});

app.post("/notify/:userId", (req, res) => {
  const { userId } = req.params;
  const notification = {
    id: Date.now().toString(),
    message: req.body.message,
    createdAt: new Date().toISOString()
  };

  io.to(`user:${userId}`).emit("notification:new", notification);

  res.json({ ok: true, sentToRoom: `user:${userId}`, notification });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`HTTP + Socket.IO server running on http://localhost:${PORT}`);
});
```

Important: Socket.IO must attach to the **HTTP server**, not only the Express app.

```js
const server = http.createServer(app);
const io = new Server(server);
server.listen(3000);
```

---

## React Socket Setup

Create one socket instance and reuse it.

`src/socket.js`

```js
import { io } from "socket.io-client";

export const socket = io("http://localhost:3000", {
  autoConnect: false,
  withCredentials: true,
  transports: ["websocket"]
});
```

`autoConnect: false` lets React decide when to connect, usually after user/auth state is ready.

---

## React Hook

`src/useSocket.js`

```js
import { useEffect, useState } from "react";
import { socket } from "./socket";

export function useSocket(userId) {
  const [connected, setConnected] = useState(socket.connected);
  const [socketId, setSocketId] = useState(socket.id);
  const [messages, setMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!userId) return;

    function onConnect() {
      setConnected(true);
      setSocketId(socket.id);
      socket.emit("user:join", { userId });
    }

    function onDisconnect() {
      setConnected(false);
      setSocketId(undefined);
    }

    function onWelcome(data) {
      console.log("server:welcome", data);
    }

    function onChatNew(message) {
      setMessages((prev) => [...prev, message]);
    }

    function onNotificationNew(notification) {
      setNotifications((prev) => [...prev, notification]);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("server:welcome", onWelcome);
    socket.on("chat:new", onChatNew);
    socket.on("notification:new", onNotificationNew);

    socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("server:welcome", onWelcome);
      socket.off("chat:new", onChatNew);
      socket.off("notification:new", onNotificationNew);
      socket.disconnect();
    };
  }, [userId]);

  function sendChat(text) {
    socket.emit("chat:send", { text }, (response) => {
      console.log("chat:send ack", response);
    });
  }

  return {
    connected,
    socketId,
    messages,
    notifications,
    sendChat
  };
}
```

---

## React Component Example

```jsx
import { useState } from "react";
import { useSocket } from "./useSocket";

export default function ChatPage() {
  const userId = "123";
  const { connected, socketId, messages, notifications, sendChat } = useSocket(userId);
  const [text, setText] = useState("");

  function handleSend(e) {
    e.preventDefault();
    if (!text.trim()) return;
    sendChat(text.trim());
    setText("");
  }

  return (
    <main>
      <h1>Socket Demo</h1>

      <p>Status: {connected ? "Connected" : "Disconnected"}</p>
      <p>Socket ID: {socketId || "-"}</p>

      <form onSubmit={handleSend}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type message"
        />
        <button type="submit" disabled={!connected}>
          Send
        </button>
      </form>

      <h2>Messages</h2>
      <ul>
        {messages.map((msg) => (
          <li key={msg.id}>{msg.text}</li>
        ))}
      </ul>

      <h2>Notifications</h2>
      <ul>
        {notifications.map((item) => (
          <li key={item.id}>{item.message}</li>
        ))}
      </ul>
    </main>
  );
}
```

---

## How to Verify Socket Is Connected in Frontend

### 1. React UI

Show these values:

```jsx
<p>{socket.connected ? "Connected" : "Disconnected"}</p>
<p>{socket.id}</p>
```

If connected, `socket.id` should have a value like:

```txt
U6D4kQ8K7UvYh9a_AAAB
```

### 2. Browser DevTools

Open:

```txt
DevTools -> Network -> WS
```

You should see a Socket.IO/WebSocket request like:

```txt
ws://localhost:3000/socket.io/?EIO=4&transport=websocket
```

Click it and check:

* **Headers**: status should be `101 Switching Protocols`
* **Messages/Frames**: events should appear when you send/receive data
* **Timing**: connection should remain open

### 3. Browser Console

Expose the socket temporarily while debugging:

```js
window.socket = socket;
```

Then check:

```js
socket.connected
socket.id
socket.emit("chat:send", { text: "hello from console" })
```

### 4. Backend Logs

Server should print:

```txt
Socket connected: <socket-id>
chat:send received: { text: "hello" }
Socket disconnected: <socket-id> transport close
```

### 5. Test Server-to-User Event

After React connects and joins `user:123`, call:

```bash
curl -X POST http://localhost:3000/notify/123 ^
  -H "Content-Type: application/json" ^
  -d "{\"message\":\"Your order shipped\"}"
```

React should receive `notification:new`.

PowerShell version:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:3000/notify/123 `
  -ContentType "application/json" `
  -Body '{"message":"Your order shipped"}'
```

---

## Common Event Patterns

### One user sends, everyone receives

```js
socket.on("chat:send", (message) => {
  io.emit("chat:new", message);
});
```

### One user sends, everyone except sender receives

```js
socket.on("typing:start", (data) => {
  socket.broadcast.emit("typing:start", data);
});
```

### Send only to one socket

```js
socket.emit("private:event", data);
```

### Send to one user room

```js
io.to(`user:${userId}`).emit("notification:new", data);
```

### Send to chat room

```js
socket.join(`room:${roomId}`);
io.to(`room:${roomId}`).emit("chat:new", message);
```

### Send with acknowledgment

Client:

```js
socket.emit("chat:send", { text: "hello" }, (response) => {
  console.log(response);
});
```

Server:

```js
socket.on("chat:send", async (payload, ack) => {
  const saved = await saveMessage(payload);
  ack({ ok: true, id: saved.id });
});
```

---

## Authentication

Frontend:

```js
export const socket = io("http://localhost:3000", {
  autoConnect: false,
  auth: {
    token: localStorage.getItem("accessToken")
  }
});
```

Backend:

```js
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error("Unauthorized"));
  }

  try {
    const user = verifyJwt(token);
    socket.user = user;
    next();
  } catch (error) {
    next(new Error("Unauthorized"));
  }
});
```

Connection handler:

```js
io.on("connection", (socket) => {
  socket.join(`user:${socket.user.id}`);
});
```

Important:

* Do not trust `userId` sent from frontend for private rooms.
* Prefer reading user identity from JWT/session.
* Use `wss://` in production.

---

## Reconnection

Socket.IO reconnects automatically by default.

```js
const socket = io("http://localhost:3000", {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000
});
```

Useful events:

```js
socket.on("connect", () => console.log("connected"));
socket.on("disconnect", (reason) => console.log("disconnected", reason));
socket.io.on("reconnect_attempt", (attempt) => console.log("attempt", attempt));
socket.io.on("reconnect_failed", () => console.log("reconnect failed"));
```

After reconnect, rejoin rooms:

```js
socket.on("connect", () => {
  socket.emit("user:join", { userId });
});
```

---

## React Mistakes to Avoid

### Mistake 1: Creating socket inside component body

Bad:

```js
function App() {
  const socket = io("http://localhost:3000");
}
```

This can create a new socket on every render.

Good:

```js
// socket.js
export const socket = io("http://localhost:3000", { autoConnect: false });
```

### Mistake 2: Not cleaning listeners

Bad:

```js
useEffect(() => {
  socket.on("chat:new", onMessage);
}, []);
```

Good:

```js
useEffect(() => {
  socket.on("chat:new", onMessage);
  return () => socket.off("chat:new", onMessage);
}, []);
```

### Mistake 3: Duplicate events in React Strict Mode

In development, React Strict Mode can mount/unmount effects twice. If cleanup is missing, events appear duplicated.

Fix:

* Use named handler functions
* Always call `socket.off(event, handler)` in cleanup
* Avoid creating multiple socket instances

---

## Production Setup with NGINX

Socket.IO uses HTTP upgrade for WebSocket.

```nginx
server {
    listen 80;
    server_name api.example.com;

    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Use production URL in React:

```js
const socket = io("https://api.example.com", {
  transports: ["websocket"]
});
```

Browser uses:

```txt
https:// -> wss://
http://  -> ws://
```

---

## Scaling Multiple Express Servers

Problem:

```txt
User A connected to Server 1
Server 2 emits event to User A
Server 2 does not know User A's socket
```

Solution: use Redis adapter.

```bash
npm install @socket.io/redis-adapter redis
```

```js
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("redis");

const pubClient = createClient({ url: "redis://localhost:6379" });
const subClient = pubClient.duplicate();

await pubClient.connect();
await subClient.connect();

io.adapter(createAdapter(pubClient, subClient));
```

Now events can reach sockets connected to other server instances.

---

## Socket.IO vs Raw WebSocket

| Feature | Raw WebSocket | Socket.IO |
| ------- | ------------- | --------- |
| Browser support | Built-in | Needs library |
| Named events | Manual JSON parsing | Built-in |
| Reconnection | Manual | Built-in |
| Rooms | Manual | Built-in |
| Fallback transport | No | Yes |
| Scaling adapter | Manual | Redis adapter available |
| Best for | Simple/protocol-level use | Most React + Express apps |

Rule of thumb:

* Use **Socket.IO** for app features like chat, notifications, rooms, dashboards.
* Use **raw WebSocket** when you need a very thin protocol or must avoid extra library behavior.

---

## Debugging Checklist

### Frontend says disconnected

Check:

* Is backend running?
* Is URL correct? `http://localhost:3000`
* Is CORS origin matching frontend? `http://localhost:5173`
* Are you calling `socket.connect()`?
* Is React cleanup immediately disconnecting due to missing dependency logic?

### Events are received twice

Check:

* Are you registering listeners multiple times?
* Did you forget `socket.off(...)` cleanup?
* Are there multiple socket instances?
* Is React Strict Mode exposing missing cleanup?

### Backend receives connection but not event

Check:

* Event name exactly matches: `chat:send` vs `chat:new`
* Payload shape is correct
* Listener is inside `io.on("connection")`
* Frontend emits after `connect`

### Server emits but frontend does not receive

Check:

* Frontend has `socket.on("event:name", handler)`
* User joined correct room
* Server emits to correct room/socket
* Multiple server instances need Redis adapter

### Works locally but not production

Check:

* NGINX supports `Upgrade` and `Connection` headers
* HTTPS site uses secure socket `wss://`
* Load balancer timeout is long enough
* CORS allows production domain
* Sticky sessions or Redis adapter configured

---

## Interview Explanation

**Q: How does a WebSocket connection work between React and Express?**

A: React opens a persistent socket connection to the Express/Socket.IO server. The server receives a `connection` event and gets a unique `socket.id`. After that, both sides can emit named events. React sends events using `socket.emit`, Express receives them using `socket.on`, and Express can push events back using `socket.emit`, `io.emit`, or `io.to(room).emit`.

**Q: How do you verify WebSocket is connected in frontend?**

A: Check `socket.connected`, display `socket.id`, listen to `connect` and `disconnect`, inspect DevTools Network WS tab, and confirm backend logs show the socket connection.

**Q: Why use rooms?**

A: Rooms let the server send events to a group, like `user:123` or `order:456`, without sending to every connected client.

**Q: Why is Redis needed when scaling Socket.IO?**

A: If users are connected to different server instances, one server may not know about sockets on another server. Redis adapter shares events across instances.

---

## Quick Mental Model

```txt
React connects
  -> Express logs socket.id
  -> React joins user room
  -> User sends message
  -> Express receives event
  -> Express saves/validates data
  -> Express emits event back
  -> React listener updates UI
```

