# Raw WebSockets vs STOMP

## 1. The Hierarchy

1.  **TCP**: The transport layer.
2.  **WebSocket**: A thin protocol over TCP (Upgrade Header).
3.  **STOMP**: A messaging protocol *over* WebSocket (Pub/Sub semantics).

---

## 2. Raw WebSockets (`WebSocketHandler`)

Spring allows "Raw" access. You get a stream of bytes/text.
**You** must invent the protocol ("If message starts with 'A', it's a chat...").

```java
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {
    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(new MyHandler(), "/raw-ws");
    }
}

public class MyHandler extends TextWebSocketHandler {
    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        // "Hello" -> "Echo: Hello"
        session.sendMessage(new TextMessage("Echo: " + message.getPayload()));
    }
}
```

**Pros**: Maximum control. Low overhead.
**Cons**: You must handle routing, parsing, and pub/sub yourself.

---

## 3. STOMP (Simple Text Oriented Messaging Protocol)

Standardizes the "Command".
`SEND`, `SUBSCRIBE`, `MESSAGE`.

```text
SEND
destination:/app/chat
content-type:application/json

{"text":"Hello"}
\0
```

Spring handles the routing:
- `/app` -> Goes to `@MessageMapping` Controller.
- `/topic` -> Goes to Broker (and then to Subscribers).

**Pros**: Built-in Routing, Pub/Sub, Security integration.
**Cons**: Slightly higher overhead.

---

## 4. When to use which?

- **Chat App / Notifications**: Use **STOMP** (Pub/Sub is hard to build from scratch).
- **High Frequency Trading / Gaming**: Use **Raw WebSockets** (Every byte counts).
