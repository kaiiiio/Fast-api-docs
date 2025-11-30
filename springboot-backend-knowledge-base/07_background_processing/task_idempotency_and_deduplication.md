# Task Idempotency and Deduplication

## 1. The "At Least Once" Guarantee

RabbitMQ/Kafka guarantee "At Least Once" delivery.
This means **your consumer might receive the same message twice**.

If the message is "Deduct $100", and you run it twice, the user loses $200.
You must make your tasks **Idempotent**.

---

## 2. Strategy 1: Database Constraints (Strongest)

Use the `messageId` (or a business key like `orderId`) as a Unique Key in the DB.

```java
@Transactional
public void processPayment(String orderId) {
    if (paymentRepository.existsByOrderId(orderId)) {
        return; // Already processed
    }
    
    // ... process ...
    
    paymentRepository.save(new Payment(orderId));
}
```

**Race Condition**: If two threads check `exists` at the same time, both pass.
**Fix**: Rely on the DB Unique Constraint Exception.
```java
try {
    paymentRepository.save(new Payment(orderId));
} catch (DataIntegrityViolationException e) {
    // Ignore, already processed
}
```

---

## 3. Strategy 2: Redis (Distributed Lock)

If you don't have a DB transaction (e.g., sending an email), use Redis.

```java
public void sendEmail(String emailId) {
    // Set key only if it doesn't exist. Expire in 24 hours.
    Boolean isNew = redisTemplate.opsForValue()
        .setIfAbsent("email:" + emailId, "SENT", Duration.ofHours(24));
        
    if (Boolean.FALSE.equals(isNew)) {
        return; // Already sent
    }
    
    emailClient.send(...);
}
```

---

## 4. Designing Idempotent Payloads

**Bad**: `UPDATE account SET balance = balance - 100`
**Good**: `UPDATE account SET balance = 900 WHERE balance = 1000` (Optimistic Locking)

Always prefer absolute values over relative updates.
