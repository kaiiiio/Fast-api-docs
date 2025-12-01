# Async Methods vs Spring Batch

## 1. The `@Async` Annotation

Spring's simplest way to do background work.

### Setup
```java
@SpringBootApplication
@EnableAsync
public class App { ... }
```

### Usage
```java
@Service
public class EmailService {

    @Async
    public void sendWelcomeEmail(User user) {
        // Runs in a separate thread
        try {
            Thread.sleep(1000);
            System.out.println("Email sent to " + user.getEmail());
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }
}
```

**Pros**: Extremely simple.
**Cons**:
- **No Persistence**: If server restarts, task is lost.
- **No Retries**: Unless you combine with `@Retryable`.
- **No Monitoring**: Hard to track progress.

---

## 2. When to use what?

| Feature | `@Async` | Spring Batch | Quartz / Scheduler |
| :--- | :--- | :--- | :--- |
| **Use Case** | Sending 1 email, Fire & Forget | Processing 1M rows, ETL | Running a task every day at 9 AM |
| **Complexity** | Low | High | Medium |
| **Persistence** | No (In-Memory) | Yes (DB) | Yes (DB) |
| **Retries** | Manual | Built-in | Built-in |
| **Transaction** | Per method | Per Chunk | Per Job |

### The "Golden Rule"
- If it takes **< 1 minute** and is okay to fail occasionally -> **`@Async`**.
- If it takes **> 1 minute** or involves **bulk data** -> **Spring Batch**.
- If it needs to run on a **Schedule** -> **Quartz** (which can trigger a Spring Batch job).
