# Testing WebSockets

## 1. The Challenge

Testing WebSockets is hard because they are asynchronous.
You send a message, and the response comes "sometime later".

---

## 2. Integration Test (`WebSocketStompClient`)

Spin up the full server (`@SpringBootTest`) and connect a real Client.

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class WebSocketTest {

    @LocalServerPort
    private Integer port;

    private WebSocketStompClient stompClient;

    @BeforeEach
    public void setup() {
        stompClient = new WebSocketStompClient(new StandardWebSocketClient());
        stompClient.setMessageConverter(new MappingJackson2MessageConverter());
    }

    @Test
    public void verifyGreeting() throws Exception {
        // 1. Connect
        StompSession session = stompClient
            .connect("ws://localhost:" + port + "/ws", new StompSessionHandlerAdapter() {})
            .get(1, TimeUnit.SECONDS);

        // 2. Subscribe (Wait for response via BlockingQueue)
        BlockingQueue<String> queue = new ArrayBlockingQueue<>(1);
        
        session.subscribe("/topic/greetings", new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) { return String.class; }
            
            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                queue.add((String) payload);
            }
        });

        // 3. Send
        session.send("/app/hello", "Alice");

        // 4. Assert
        String response = queue.poll(5, TimeUnit.SECONDS);
        assertEquals("Hello, Alice!", response);
    }
}
```

---

## 3. Unit Testing Controllers

You can unit test the `@Controller` method directly, but it misses the Broker logic.
Integration tests are preferred for WebSockets.
