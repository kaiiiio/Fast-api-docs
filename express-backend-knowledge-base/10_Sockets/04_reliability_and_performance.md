# WebSocket Reliability and Performance: Production Patterns

WebSocket reliability and performance patterns ensure stable real-time communication. This guide covers heartbeats, reconnection, and performance optimization.

## Heartbeats (Keep-Alive)

**Problem:** Connections can silently die. **Solution:** Ping/pong heartbeats.

```javascript
const { WebSocketServer } = require('ws');

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
    let isAlive = true;
    
    // Mark as alive on pong
    ws.on('pong', () => {
        isAlive = true;
    });
    
    // Send ping every 30 seconds
    const heartbeat = setInterval(() => {
        if (!isAlive) {
            ws.terminate();  // Connection dead
            return;
        }
        
        isAlive = false;
        ws.ping();
    }, 30000);
    
    ws.on('close', () => {
        clearInterval(heartbeat);
    });
});
```

## Reconnection Logic

### Client-Side Reconnection

```javascript
// Client-side reconnection with exponential backoff
class WebSocketClient {
    constructor(url) {
        this.url = url;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 1000;
    }
    
    connect() {
        this.ws = new WebSocket(this.url);
        
        this.ws.on('open', () => {
            console.log('Connected');
            this.reconnectAttempts = 0;
            this.reconnectDelay = 1000;
        });
        
        this.ws.on('close', () => {
            this.reconnect();
        });
        
        this.ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
    }
    
    reconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            return;
        }
        
        this.reconnectAttempts++;
        const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
        
        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
        
        setTimeout(() => {
            this.connect();
        }, delay);
    }
}
```

## Backpressure Handling

```javascript
// Handle backpressure
wss.on('connection', (ws) => {
    ws.isReady = true;
    
    ws.on('drain', () => {
        ws.isReady = true;
    });
    
    function send(data) {
        if (ws.isReady) {
            ws.isReady = ws.send(JSON.stringify(data));
        } else {
            // Queue message or drop
            console.warn('Backpressure, message dropped');
        }
    }
});
```

## Load Balancer Configuration

### Nginx Configuration

```nginx
upstream websocket {
    server app1:3000;
    server app2:3000;
    server app3:3000;
}

server {
    listen 80;
    
    location /ws {
        proxy_pass http://websocket;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

## Real-World Examples

### Example 1: Complete Reliable WebSocket

```javascript
const { WebSocketServer } = require('ws');

const wss = new WebSocketServer({ 
    server,
    clientTracking: true,
    perMessageDeflate: true  // Compression
});

wss.on('connection', (ws, req) => {
    let isAlive = true;
    const userId = extractUserId(req);
    
    // Heartbeat
    ws.on('pong', () => {
        isAlive = true;
    });
    
    const heartbeat = setInterval(() => {
        if (!isAlive) {
            ws.terminate();
            return;
        }
        isAlive = false;
        ws.ping();
    }, 30000);
    
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
        clearInterval(heartbeat);
        removeUser(userId);
    });
    
    // Handle errors
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});
```

## Best Practices

1. **Heartbeats**: Implement ping/pong
2. **Reconnection**: Client-side with exponential backoff
3. **Backpressure**: Handle send buffer
4. **Load Balancing**: Configure properly
5. **Monitoring**: Track connections and errors

## Summary

**WebSocket Reliability and Performance:**

1. **Heartbeats**: Ping/pong for connection health
2. **Reconnection**: Exponential backoff on client
3. **Backpressure**: Handle send buffer
4. **Load Balancing**: Configure timeouts
5. **Best Practice**: Monitor connections, handle errors

**Key Takeaway:**
WebSocket reliability requires heartbeats (ping/pong), client-side reconnection with exponential backoff, and backpressure handling. Configure load balancers with proper timeouts. Monitor connections and errors. Use compression for performance.

**Reliability Strategy:**
- Implement heartbeats
- Client-side reconnection
- Handle backpressure
- Configure load balancers
- Monitor connections

**Next Steps:**
- Learn [Security](03_security_and_auth.md) for secure connections
- Study [Client Patterns](06_client_side_patterns.md) for frontend
- Master [Scaling](03_scaling_architecture.md) for growth

