# Using Redis Streams for Messaging

## 1. Redis is not just a Cache

Redis Streams (added in Redis 5.0) is a log-based data structure, similar to Kafka but lighter.
It allows **Consumer Groups**, **Acknowledgements**, and **Persistence**.

**Why use it over Kafka?**
- You already have Redis.
- You don't want to manage a Zookeeper/Kafka cluster.
- You need sub-millisecond latency.

---

## 2. Writing to a Stream

```java
@Autowired
private StringRedisTemplate redisTemplate;

public void produceEvent(String orderId) {
    Map<String, String> fields = new HashMap<>();
    fields.put("orderId", orderId);
    fields.put("status", "CREATED");
    
    // XADD orders * orderId 123 status CREATED
    redisTemplate.opsForStream().add("orders", fields);
}
```

---

## 3. Reading from a Stream (Consumer Group)

Spring Data Redis provides a container for this.

```java
@Configuration
public class StreamConfig {

    @Bean
    public StreamMessageListenerContainer<String, MapRecord<String, String, String>> container(
            RedisConnectionFactory factory) {
        
        StreamMessageListenerContainer.StreamMessageListenerContainerOptions<String, MapRecord<String, String, String>> options =
                StreamMessageListenerContainer.StreamMessageListenerContainerOptions.builder()
                        .pollTimeout(Duration.ofMillis(100))
                        .build();

        StreamMessageListenerContainer<String, MapRecord<String, String, String>> container =
                StreamMessageListenerContainer.create(factory, options);

        // Define Consumer Group
        try {
            redisTemplate.opsForStream().createGroup("orders", "inventory-service");
        } catch (Exception e) {
            // Group already exists
        }

        // Listen
        container.receive(
                Consumer.from("inventory-service", "instance-1"),
                StreamOffset.create("orders", ReadOffset.lastConsumed()),
                message -> {
                    System.out.println("Received: " + message.getValue());
                    // ACK
                    redisTemplate.opsForStream().acknowledge("orders", "inventory-service", message.getId());
                });

        container.start();
        return container;
    }
}
```

---

## 4. When to use?

- **Good for**: Job queues, Chat history, Notification streams.
- **Bad for**: Long-term storage (RAM is expensive). Use Kafka for that.
