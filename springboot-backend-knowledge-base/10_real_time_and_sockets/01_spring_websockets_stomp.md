# 01. Spring Boot WebSockets: STOMP, SockJS, and Real-Time Magic

## 1. The Spring Ecosystem vs FastAPI

In FastAPI, we dealt with raw WebSockets. We had to invent our own "Protocol" (e.g., `{"type": "chat", "msg": "hello"}`).

Spring Boot is an Enterprise framework. It says: **"Raw WebSockets are too low-level. Let's use a standard protocol."**

Enter **STOMP** (Simple Text Oriented Messaging Protocol).
- It defines a format for messages (Commands, Headers, Body).
- It defines a Pub/Sub model (Topics, Queues).
- It handles routing for you.

You *can* do raw WebSockets in Spring, but 99% of the time, you want STOMP.

---

## 2. Setting Up

### Dependencies (`pom.xml`)
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-websocket</artifactId>
</dependency>
```

### Configuration (`WebSocketConfig.java`)

```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // 1. The Endpoint: Where clients connect
        registry.addEndpoint("/ws")
                .setAllowedOrigins("*") // CORS
                .withSockJS(); // Fallback for old browsers
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // 2. The Broker: Where messages are routed
        
        // Messages sent to "/app" go to @MessageMapping methods in Controllers
        registry.setApplicationDestinationPrefixes("/app");
        
        // Messages sent to "/topic" or "/queue" go to the Broker (In-Memory or RabbitMQ)
        registry.enableSimpleBroker("/topic", "/queue");
    }
}
```

**Key Concepts**:
- **`/ws`**: The URL the JS client connects to.
- **`withSockJS()`**: If WebSockets are blocked by a firewall, it falls back to HTTP Long Polling automatically. Magic.
- **`/app`**: Prefix for messages *from* Client *to* Server logic.
- **`/topic`**: Prefix for messages *from* Server *to* Client (Broadcast).

---

## 3. The Controller

It looks just like a REST Controller, but with `@MessageMapping`.

```java
@Controller
public class ChatController {

    @MessageMapping("/chat.sendMessage") // Client sends to /app/chat.sendMessage
    @SendTo("/topic/public")             // Server broadcasts to /topic/public
    public ChatMessage sendMessage(@Payload ChatMessage chatMessage) {
        return chatMessage;
    }

    @MessageMapping("/chat.addUser")
    @SendTo("/topic/public")
    public ChatMessage addUser(@Payload ChatMessage chatMessage, 
                               SimpMessageHeaderAccessor headerAccessor) {
        // Add username in web socket session
        headerAccessor.getSessionAttributes().put("username", chatMessage.getSender());
        return chatMessage;
    }
}
```

---

## 4. The Client (JavaScript)

You need `sockjs-client` and `stompjs`.

```javascript
var socket = new SockJS('/ws');
var stompClient = Stomp.over(socket);

stompClient.connect({}, function (frame) {
    console.log('Connected: ' + frame);
    
    // Subscribe to the Public Topic
    stompClient.subscribe('/topic/public', function (chatMessage) {
        showGreeting(JSON.parse(chatMessage.body).content);
    });
    
    // Send a message
    stompClient.send("/app/chat.sendMessage", {}, JSON.stringify({
        'sender': "Alice",
        'content': "Hello World"
    }));
});
```

---

## 5. Scaling: The External Broker

The `enableSimpleBroker` above is **In-Memory**. It has the same problem as our basic FastAPI example: it doesn't scale across multiple servers.

To scale Spring Boot WebSockets, you use a **real Message Broker** like **RabbitMQ** or **ActiveMQ**.

### Updated Config
```java
@Override
public void configureMessageBroker(MessageBrokerRegistry registry) {
    registry.setApplicationDestinationPrefixes("/app");

    // Use RabbitMQ as the broker
    registry.enableStompBrokerRelay("/topic", "/queue")
            .setRelayHost("localhost")
            .setRelayPort(61613)
            .setClientLogin("guest")
            .setClientPasscode("guest");
}
```

Now, Spring acts as a **Relay**.
1.  Client sends message.
2.  Spring forwards it to RabbitMQ.
3.  RabbitMQ broadcasts it to ALL Spring servers.
4.  All Spring servers push it to their connected clients.

This is Enterprise-grade scaling out of the box.
