# Reactive MongoDB Driver (WebFlux)

## 1. Blocking vs Non-Blocking

- **Blocking (`MongoTemplate`)**: Thread waits for DB response. 1000 concurrent requests = 1000 threads.
- **Non-Blocking (`ReactiveMongoTemplate`)**: Thread sends request and handles other work. 1000 requests = 1 thread.

Use this for **High Concurrency** apps.

---

## 2. Setup

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-mongodb-reactive</artifactId>
</dependency>
```

---

## 3. Reactive Repository

Return `Mono` (0-1 item) or `Flux` (0-N items).

```java
public interface ReactiveUserRepository extends ReactiveMongoRepository<User, String> {
    
    Flux<User> findByLastName(String lastName);
    
    @Tailable // Keeps connection open for capped collections (Change Stream lite)
    Flux<User> findWithTailableCursorBy();
}
```

---

## 4. The Controller

```java
@RestController
public class UserController {

    @Autowired
    private ReactiveUserRepository repository;

    @GetMapping("/users")
    public Flux<User> getAllUsers() {
        // Returns a stream. The browser receives data chunk by chunk.
        return repository.findAll();
    }
    
    @GetMapping(value = "/users/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<User> streamUsers() {
        // Server-Sent Events (SSE)
        return repository.findAll().delayElements(Duration.ofMillis(100));
    }
}
```

**Warning**: Reactive programming is harder to debug. Stack traces are useless. Only use it if you need the scale.
