# Outbox Pattern for Transactional Events

## 1. The Dual Write Problem

You want to:
1.  Save Order to DB.
2.  Publish `OrderCreated` to Kafka.

```java
@Transactional
public void createOrder(Order order) {
    repository.save(order); // DB Transaction
    kafkaTemplate.send("orders", order); // Network Call
}
```

**Failure Scenarios**:
- DB commits, Kafka fails -> Data inconsistency.
- Kafka sends, DB rolls back -> Ghost message.

---

## 2. The Outbox Pattern

Save the message *in the same database transaction* as the entity.

**Table: `outbox`**
| id | topic | payload | status |
|---|---|---|---|
| 1 | orders | {...} | PENDING |

```java
@Transactional
public void createOrder(Order order) {
    repository.save(order);
    
    OutboxEvent event = new OutboxEvent("orders", toJson(order));
    outboxRepository.save(event);
}
```

**Result**: Atomicity. Either both happen, or neither.

---

## 3. The Relay

A background process (Debezium or Polling) reads the `outbox` table and pushes to Kafka.

```java
@Scheduled(fixedDelay = 1000)
public void relay() {
    List<OutboxEvent> events = outboxRepository.findByStatus("PENDING");
    for (OutboxEvent event : events) {
        try {
            kafkaTemplate.send(event.getTopic(), event.getPayload());
            event.setStatus("SENT");
            outboxRepository.save(event);
        } catch (Exception e) {
            // Retry later
        }
    }
}
```
