# Scaling WebSockets (The Relay Pattern)

## 1. The Problem

**Scenario**:
- **User A** connects to **Server 1**.
- **User B** connects to **Server 2**.
- User A sends a message to "Chat Room 1".

**Result**: User B sees **nothing**.
Server 1 only knows about its own connections. It doesn't know User B exists on Server 2.

---

## 2. The Solution: External Message Broker

You need a "Backplane" or "Relay" to sync messages between servers.
**RabbitMQ** or **Redis** or **ActiveMQ**.

---

## 3. Configuring RabbitMQ Relay

Spring has built-in support for STOMP Broker Relay.
Instead of handling messages in-memory (`enableSimpleBroker`), it forwards them to RabbitMQ.

```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Use External Broker (RabbitMQ)
        config.enableStompBrokerRelay("/topic", "/queue")
            .setRelayHost("localhost")
            .setRelayPort(61613) // STOMP port of RabbitMQ
            .setClientLogin("guest")
            .setClientPasscode("guest");
            
        config.setApplicationDestinationPrefixes("/app");
    }
}
```

**Flow**:
1.  User A sends to Server 1.
2.  Server 1 forwards to RabbitMQ Topic.
3.  RabbitMQ broadcasts to **Server 1 AND Server 2**.
4.  Server 2 receives message and pushes to User B.

---

## 4. Redis Pub/Sub (Alternative)

If you don't use STOMP Relay, you can manually implement Redis Pub/Sub.
1.  On `@MessageMapping`, publish to Redis Channel.
2.  All servers listen to Redis Channel.
3.  On receive, use `SimpMessagingTemplate` to push to local users.
