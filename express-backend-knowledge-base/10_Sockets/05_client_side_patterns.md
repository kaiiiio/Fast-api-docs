# Client-Side WebSocket Patterns: Frontend Integration

Client-side WebSocket patterns ensure reliable real-time communication in frontend applications. This guide covers reconnection, message queuing, and state management.

## Basic WebSocket Client

```javascript
class WebSocketClient {
    constructor(url) {
        this.url = url;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.messageQueue = [];
    }
    
    connect() {
        this.ws = new WebSocket(this.url);
        
        this.ws.onopen = () => {
            console.log('Connected');
            this.reconnectAttempts = 0;
            this.flushQueue();
        };
        
        this.ws.onmessage = (event) => {
            this.handleMessage(JSON.parse(event.data));
        };
        
        this.ws.onclose = () => {
            this.reconnect();
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }
    
    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            this.messageQueue.push(data);
        }
    }
    
    flushQueue() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.send(message);
        }
    }
    
    reconnect() {
        if (this.reconnectAttempts < 10) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
            setTimeout(() => this.connect(), delay);
        }
    }
    
    handleMessage(data) {
        // Handle message
    }
}
```

## React Hook Pattern

```javascript
import { useState, useEffect, useRef } from 'react';

function useWebSocket(url) {
    const [isConnected, setIsConnected] = useState(false);
    const [messages, setMessages] = useState([]);
    const ws = useRef(null);
    
    useEffect(() => {
        ws.current = new WebSocket(url);
        
        ws.current.onopen = () => {
            setIsConnected(true);
        };
        
        ws.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setMessages(prev => [...prev, data]);
        };
        
        ws.current.onclose = () => {
            setIsConnected(false);
            // Reconnect logic
        };
        
        return () => {
            ws.current.close();
        };
    }, [url]);
    
    const sendMessage = (data) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(data));
        }
    };
    
    return { isConnected, messages, sendMessage };
}

// Use
function ChatComponent() {
    const { isConnected, messages, sendMessage } = useWebSocket('ws://localhost:3000');
    
    return (
        <div>
            <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
            {messages.map((msg, i) => (
                <div key={i}>{msg.content}</div>
            ))}
            <button onClick={() => sendMessage({ type: 'chat', content: 'Hello' })}>
                Send
            </button>
        </div>
    );
}
```

## Message Queueing

```javascript
class MessageQueue {
    constructor() {
        this.queue = [];
        this.maxSize = 100;
    }
    
    enqueue(message) {
        if (this.queue.length >= this.maxSize) {
            this.queue.shift();  // Remove oldest
        }
        this.queue.push({
            ...message,
            timestamp: Date.now()
        });
    }
    
    dequeue() {
        return this.queue.shift();
    }
    
    flush() {
        const messages = [...this.queue];
        this.queue = [];
        return messages;
    }
}

// Use with WebSocket
const messageQueue = new MessageQueue();

ws.onopen = () => {
    // Send queued messages
    const queued = messageQueue.flush();
    queued.forEach(msg => ws.send(JSON.stringify(msg)));
};
```

## Best Practices

1. **Reconnection**: Exponential backoff
2. **Message Queueing**: Queue when offline
3. **State Management**: Track connection state
4. **Error Handling**: Handle errors gracefully
5. **Cleanup**: Close connections properly

## Summary

**Client-Side WebSocket Patterns:**

1. **Patterns**: Reconnection, message queuing, state management
2. **React**: Custom hooks for WebSocket
3. **Best Practice**: Queue messages, handle reconnection
4. **Benefits**: Reliable real-time communication
5. **Use Cases**: Chat, notifications, live updates

**Key Takeaway:**
Client-side WebSocket patterns ensure reliable real-time communication. Implement reconnection with exponential backoff, queue messages when offline, and manage connection state. Use React hooks for integration. Handle errors gracefully and cleanup connections properly.

**Client Strategy:**
- Reconnection with backoff
- Message queuing
- State management
- Error handling
- Proper cleanup

**Next Steps:**
- Learn [WebSocket Theory](01_theory_and_internals.md) for fundamentals
- Study [Security](03_security_and_auth.md) for secure connections
- Master [Reliability](04_reliability_and_performance.md) for production

