# Retry with Exponential Backoff

## 1. The Problem

Network calls fail.
- Database is momentarily overloaded.
- External API returns 503 Service Unavailable.

If you retry immediately, you might DDoS the service.
You need **Exponential Backoff**: Wait 1s, then 2s, then 4s...

---

## 2. Spring Retry

Spring has a built-in module for this.

### Dependency
```xml
<dependency>
    <groupId>org.springframework.retry</groupId>
    <artifactId>spring-retry</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework</groupId>
    <artifactId>spring-aspects</artifactId>
</dependency>
```

### Enable Retries
```java
@SpringBootApplication
@EnableRetry
public class App { ... }
```

### Usage
```java
@Service
public class PaymentService {

    @Retryable(
        value = { RemoteServiceException.class }, 
        maxAttempts = 4,
        backoff = @Backoff(delay = 1000, multiplier = 2)
    )
    public void processPayment(String orderId) {
        // 1. Attempt 1: Fails
        // 2. Wait 1s
        // 3. Attempt 2: Fails
        // 4. Wait 2s
        // 5. Attempt 3: Fails
        // 6. Wait 4s
        // 7. Attempt 4: Success!
        externalPaymentGateway.charge(orderId);
    }

    @Recover
    public void recover(RemoteServiceException e, String orderId) {
        // Called after all retries fail
        // e.g., Mark order as FAILED in DB
        System.out.println("Payment failed for order " + orderId);
    }
}
```

---

## 3. Best Practices

1.  **Idempotency**: Ensure the method is safe to call multiple times. If you charge the user twice, Retries are dangerous.
2.  **Circuit Breaker**: If the service is *down* (100% failure rate), stop retrying globally. Use **Resilience4j** for this.
3.  **Jitter**: Add random noise to the delay to prevent "Thundering Herd" (all servers retrying at the exact same millisecond).
