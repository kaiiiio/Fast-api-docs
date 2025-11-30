# RSocket: The Future of Reactive Streams

## 1. What is RSocket?

WebSockets are just "TCP for the Web". They are dumb pipes.
**RSocket** is a binary protocol that adds **Reactive Streams** semantics (Backpressure) over TCP/WebSocket.

**Features**:
- **Request-Response**: 1 request, 1 response.
- **Fire-and-Forget**: 1 request, 0 response.
- **Request-Stream**: 1 request, Many responses (Flux).
- **Channel**: Many requests, Many responses (Bi-directional Flux).

---

## 2. Setup

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-rsocket</artifactId>
</dependency>
```

`application.properties`:
```properties
spring.rsocket.server.port=7000
```

---

## 3. The Controller

It looks like a normal Controller, but uses `@MessageMapping`.

```java
@Controller
public class RSocketController {

    // Request-Stream
    @MessageMapping("stock-prices")
    public Flux<Double> getStockPrice(String symbol) {
        return Flux.interval(Duration.ofSeconds(1))
                   .map(i -> Math.random() * 100);
    }
    
    // Channel (Bi-Directional)
    @MessageMapping("chat")
    public Flux<String> chat(Flux<String> incoming) {
        return incoming
            .map(msg -> "Echo: " + msg)
            .log();
    }
}
```

---

## 4. The Client (`RSocketRequester`)

```java
@Autowired
private RSocketRequester.Builder builder;

public void consume() {
    RSocketRequester requester = builder.tcp("localhost", 7000);
    
    requester.route("stock-prices")
             .data("AAPL")
             .retrieveFlux(Double.class)
             .subscribe(price -> System.out.println("Price: " + price));
}
```

**Why use it?**
Microservice-to-Microservice communication. It's faster than HTTP/REST and supports streaming natively.
