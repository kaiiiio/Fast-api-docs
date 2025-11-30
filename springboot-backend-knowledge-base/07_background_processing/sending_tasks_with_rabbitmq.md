# Sending Tasks with RabbitMQ

## 1. Why RabbitMQ?

`@Async` is in-memory. If the server crashes, the task is lost.
RabbitMQ persists the task to disk.

---

## 2. Setup

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-amqp</artifactId>
</dependency>
```

### Configuration
```java
@Configuration
public class RabbitConfig {
    
    @Bean
    public Queue myQueue() {
        return new Queue("task-queue", true); // true = durable
    }
    
    @Bean
    public Jackson2JsonMessageConverter converter() {
        return new Jackson2JsonMessageConverter(); // Send JSON, not Java Serialization
    }
}
```

---

## 3. Producer (Sender)

```java
@Service
public class TaskProducer {

    @Autowired
    private RabbitTemplate rabbitTemplate;

    public void sendTask(TaskPayload payload) {
        rabbitTemplate.convertAndSend("task-queue", payload);
    }
}
```

---

## 4. Consumer (Worker)

```java
@Service
public class TaskConsumer {

    @RabbitListener(queues = "task-queue")
    public void processTask(TaskPayload payload) {
        System.out.println("Processing: " + payload);
        // If this method throws Exception, the message is NACKed and requeued.
        // If it returns normally, the message is ACKed and deleted.
    }
}
```

---

## 5. Dead Letter Queue (DLQ)

If a message fails 5 times, don't retry forever. Move it to a DLQ.
You can inspect the DLQ later to debug.

```properties
spring.rabbitmq.listener.simple.retry.enabled=true
spring.rabbitmq.listener.simple.retry.max-attempts=3
# Spring automatically handles DLQ routing if configured
```
