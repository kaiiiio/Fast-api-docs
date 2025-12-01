# Change Streams for Events (Real-Time MongoDB)

## 1. What are Change Streams?

Instead of polling the database ("Did anything change?"), MongoDB pushes changes to you.
It's like a built-in Message Broker for your database events (Insert, Update, Delete, Replace).

**Use Cases**:
- Real-time Dashboard updates.
- Invalidate Cache when DB changes.
- Audit Logging.

---

## 2. Setup (`MessageListenerContainer`)

Spring Data MongoDB provides a container to listen to these streams asynchronously.

```java
@Configuration
public class ChangeStreamConfig {

    @Bean
    MessageListenerContainer messageListenerContainer(MongoTemplate template) {
        
        MessageListenerContainer container = new DefaultMessageListenerContainer(template);
        
        // Define the Task
        ChangeStreamRequest<Document> request = ChangeStreamRequest.builder()
            .collection("orders") // Listen to 'orders' collection
            .filter(newAggregation(match(where("operationType").in("insert", "update"))))
            .publishTo(event -> {
                // Handle the Event
                System.out.println("Received Event: " + event.getBody().toJson());
            })
            .build();
            
        container.register(request, Document.class);
        container.start();
        
        return container;
    }
}
```

---

## 3. Reactive Approach (WebFlux)

If you use `spring-boot-starter-data-mongodb-reactive`, it's even easier.

```java
@Service
public class OrderWatcher {

    @Autowired
    private ReactiveMongoTemplate template;

    public Flux<ChangeStreamEvent<Order>> watchOrders() {
        return template.changeStream(Order.class)
            .watchCollection("orders")
            .listen()
            .doOnNext(event -> System.out.println("Changed: " + event.getBody()));
    }
}
```

**Note**: Change Streams require MongoDB to be running as a **Replica Set** (even a single-node replica set). They do not work on a standalone instance.
