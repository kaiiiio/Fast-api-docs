# WebSocket Theory and Internals: Understanding Real-Time Communication

WebSockets provide full-duplex communication over a single TCP connection. This guide covers WebSocket theory and internals for Express.js applications.

## What are WebSockets?

**WebSockets** enable persistent, bidirectional communication between client and server, unlike HTTP's request-response model.

### HTTP vs WebSocket

```javascript
// HTTP: Request-Response (one-way)
Client → Request → Server
Server → Response → Client
// Connection closed

// WebSocket: Persistent, bidirectional
Client ←→ Server (persistent connection)
// Both can send messages anytime
```

## WebSocket Handshake

### HTTP Upgrade Request

```http
GET /socket.io/?EIO=4&transport=websocket HTTP/1.1
Host: localhost:3000
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
```

### Server Response

```http
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

**Explanation:**
The handshake upgrades the HTTP connection to WebSocket. After handshake, both sides can send messages.

## WebSocket Frames

### Frame Structure

```
0                   1                   2                   3
0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-------+-+-------------+-------------------------------+
|F|R|R|R| opcode|M| Payload len |    Extended payload length    |
|I|S|S|S|  (4)  |A|     (7)     |             (16/64)           |
|N|V|V|V|       |S|             |   (if payload len==126/127)   |
| |1|2|3|       |K|             |                               |
+-+-+-+-+-------+-+-------------+ - - - - - - - - - - - - - - - +
|     Extended payload length continued, if payload len == 127  |
+ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +
|                     Masking-key, if MASK set to 1             |
+-------------------------------+-------------------------------+
| Masking-key (continued)       |          Payload Data         |
+-------------------------------- - - - - - - - - - - - - - - - +
:                     Payload Data continued ...                :
+ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +
|                     Payload Data continued ...                |
+---------------------------------------------------------------+
```

### Frame Types

```javascript
// Text frame (opcode 0x1)
// Binary frame (opcode 0x2)
// Close frame (opcode 0x8)
// Ping frame (opcode 0x9)
// Pong frame (opcode 0xA)
```

## Real-World Examples

### Example 1: Basic WebSocket Server

```javascript
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');

const app = express();
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
    console.log('Client connected');
    
    // Send welcome message
    ws.send(JSON.stringify({ type: 'welcome', message: 'Connected!' }));
    
    // Handle messages
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        console.log('Received:', data);
        
        // Echo back
        ws.send(JSON.stringify({ type: 'echo', data }));
    });
    
    // Handle close
    ws.on('close', () => {
        console.log('Client disconnected');
    });
    
    // Handle errors
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

server.listen(3000, () => {
    console.log('Server listening on port 3000');
});
```

### Example 2: Chat Application

```javascript
const wss = new WebSocketServer({ server });

// Store connected clients
const clients = new Map();

wss.on('connection', (ws, req) => {
    const clientId = req.url.split('?userId=')[1];
    clients.set(clientId, ws);
    
    console.log(`Client ${clientId} connected`);
    
    // Broadcast to all clients
    function broadcast(message, excludeClientId) {
        clients.forEach((client, id) => {
            if (id !== excludeClientId && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    }
    
    // Handle messages
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        
        if (data.type === 'chat') {
            // Broadcast chat message
            broadcast({
                type: 'chat',
                userId: clientId,
                message: data.message,
                timestamp: new Date().toISOString()
            }, clientId);
        }
    });
    
    // Handle disconnect
    ws.on('close', () => {
        clients.delete(clientId);
        broadcast({
            type: 'user_left',
            userId: clientId
        });
    });
});
```

## Best Practices

1. **Handle Reconnection**: Implement reconnection logic
2. **Heartbeats**: Use ping/pong for connection health
3. **Error Handling**: Handle connection errors gracefully
4. **Message Format**: Use structured message format (JSON)
5. **Rate Limiting**: Limit message frequency

## Summary

**WebSocket Theory and Internals:**

1. **Purpose**: Persistent, bidirectional communication
2. **Handshake**: HTTP upgrade to WebSocket
3. **Frames**: Binary protocol for messages
4. **Best Practice**: Handle reconnection, use heartbeats
5. **Use Cases**: Real-time chat, notifications, gaming

**Key Takeaway:**
WebSockets provide persistent, bidirectional communication over a single TCP connection. The connection starts with an HTTP upgrade handshake, then uses a binary framing protocol for messages. Implement reconnection logic, use heartbeats (ping/pong) for connection health, and handle errors gracefully.

**WebSocket Features:**
- Persistent connection
- Bidirectional communication
- Low latency
- Binary and text frames
- Built-in ping/pong

**Next Steps:**
- Learn [Socket.IO Basics](02_socketio_basics.md) for easier WebSocket usage
- Study [WebSocket Security](../10_Sockets/security_and_auth.md) for secure connections
- Master [Client-Side Patterns](../10_Sockets/client_side_patterns.md) for frontend integration

