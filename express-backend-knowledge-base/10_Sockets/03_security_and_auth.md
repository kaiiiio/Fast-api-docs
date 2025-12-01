# WebSocket Security and Authentication: Securing Real-Time Connections

WebSocket security requires different approaches than HTTP due to connection limitations. This guide covers securing WebSocket connections in Express.js applications.

## The Problem: No Custom Headers

**WebSocket API limitation:** JavaScript WebSocket API doesn't support custom headers.

```javascript
// ❌ This throws an error
const ws = new WebSocket("ws://api.com", {
    headers: { "Authorization": "Bearer token" }  // Not supported!
});
```

## Strategy 1: Query Parameters (Standard)

**Pass token in URL:** `ws://api.com/ws?token=eyJhbGciOiJIUz...`

```javascript
const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');

const wss = new WebSocketServer({ server });

wss.on('connection', async (ws, req) => {
    // Extract token from query
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    
    if (!token) {
        ws.close(1008, 'Authentication required');  // Policy violation
        return;
    }
    
    // Verify token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        ws.userId = decoded.userId;
        ws.user = decoded;
    } catch (error) {
        ws.close(1008, 'Invalid token');
        return;
    }
    
    ws.send(JSON.stringify({ type: 'connected', userId: ws.userId }));
    
    // Handle messages
    ws.on('message', (message) => {
        // Process message...
    });
});
```

**Risk:** URLs logged in server logs. **Mitigation:** Use short-lived tokens, mask token in logs.

## Strategy 2: Ticket Pattern (Secure)

**Two-step authentication:** HTTP POST to get ticket, then connect with ticket.

```javascript
// Step 1: Get ticket via HTTP
app.post('/auth/ticket', requireAuth, async (req, res) => {
    const ticket = require('crypto').randomUUID();
    
    // Store ticket in Redis with 10s TTL
    await redis.setEx(`ticket:${ticket}`, 10, req.user.id.toString());
    
    res.json({ ticket });
});

// Step 2: Connect with ticket
wss.on('connection', async (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const ticket = url.searchParams.get('ticket');
    
    if (!ticket) {
        ws.close(1008, 'Ticket required');
        return;
    }
    
    // Verify ticket
    const userId = await redis.get(`ticket:${ticket}`);
    if (!userId) {
        ws.close(1008, 'Invalid or expired ticket');
        return;
    }
    
    // Delete ticket (one-time use)
    await redis.del(`ticket:${ticket}`);
    
    ws.userId = userId;
    ws.send(JSON.stringify({ type: 'connected' }));
});
```

## Strategy 3: Protocol-Level Auth

**Connect first, authenticate second.**

```javascript
wss.on('connection', (ws, req) => {
    ws.authenticated = false;
    
    ws.on('message', async (message) => {
        const data = JSON.parse(message);
        
        if (data.type === 'auth' && !ws.authenticated) {
            // Authenticate
            try {
                const decoded = jwt.verify(data.token, process.env.JWT_SECRET);
                ws.userId = decoded.userId;
                ws.authenticated = true;
                ws.send(JSON.stringify({ type: 'auth_success' }));
            } catch (error) {
                ws.close(1008, 'Authentication failed');
            }
        } else if (ws.authenticated) {
            // Process authenticated messages
            handleMessage(ws, data);
        } else {
            ws.close(1008, 'Not authenticated');
        }
    });
});
```

## WSS (TLS/SSL) is Mandatory

**Never use `ws://` in production. Always use `wss://`.**

```javascript
// ✅ Production: WSS
const wss = new WebSocketServer({
    server: httpsServer,  // HTTPS server
    path: '/ws'
});

// ❌ Development only: WS
// const wss = new WebSocketServer({ server: httpServer });
```

**Benefits:**
- Encryption prevents MITM attacks
- Firewalls trust port 443
- Better compatibility

## Origin Validation

```javascript
const ALLOWED_ORIGINS = ['https://myapp.com', 'https://www.myapp.com'];

wss.on('connection', (ws, req) => {
    const origin = req.headers.origin;
    
    if (!ALLOWED_ORIGINS.includes(origin)) {
        ws.close(1008, 'Origin not allowed');
        return;
    }
    
    // Continue with connection...
});
```

## Real-World Examples

### Example 1: Complete Secure WebSocket

```javascript
const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');

const wss = new WebSocketServer({ 
    server,
    verifyClient: (info) => {
        // Verify origin
        const origin = info.origin;
        if (!ALLOWED_ORIGINS.includes(origin)) {
            return false;
        }
        return true;
    }
});

wss.on('connection', async (ws, req) => {
    // Extract token from query
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    
    // Authenticate
    if (!token) {
        ws.close(1008, 'Authentication required');
        return;
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        ws.userId = decoded.userId;
        ws.user = decoded;
    } catch (error) {
        ws.close(1008, 'Invalid token');
        return;
    }
    
    // Send welcome
    ws.send(JSON.stringify({ type: 'connected', userId: ws.userId }));
    
    // Handle messages
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleMessage(ws, data);
        } catch (error) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid message' }));
        }
    });
    
    // Handle close
    ws.on('close', () => {
        console.log(`User ${ws.userId} disconnected`);
    });
});
```

## Best Practices

1. **Use WSS**: Always use TLS in production
2. **Validate Origin**: Check origin header
3. **Short-Lived Tokens**: Use short expiration for query tokens
4. **Ticket Pattern**: Use for high-security applications
5. **Rate Limiting**: Limit connection attempts

## Summary

**WebSocket Security and Authentication:**

1. **Strategies**: Query parameters, ticket pattern, protocol-level
2. **WSS Required**: Always use TLS in production
3. **Origin Validation**: Check origin header
4. **Best Practice**: Use ticket pattern for high security
5. **Benefits**: Secure real-time communication

**Key Takeaway:**
WebSocket security requires different approaches than HTTP. Use query parameters for standard apps, ticket pattern for high-security apps. Always use WSS (TLS) in production. Validate origin headers. Use short-lived tokens and implement rate limiting.

**Security Strategy:**
- Use WSS in production
- Validate origin
- Authenticate connections
- Use ticket pattern for high security
- Rate limit connections

**Next Steps:**
- Learn [WebSocket Theory](01_theory_and_internals.md) for fundamentals
- Study [Socket.IO Basics](02_socketio_basics.md) for easier implementation
- Master [Reliability](05_reliability_and_performance.md) for production

