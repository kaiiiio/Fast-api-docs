# How Spring Boot Handles Concurrency

## 1. Thread per Request Model

By default (Tomcat), Spring Boot assigns **One Thread per HTTP Request**.

- **Pool Size**: Default 200 threads.
- **Scenario**: 201 concurrent requests? The 201st waits in a queue.

---

## 2. The Bottleneck: Blocking I/O

If your Controller calls a Database (takes 2s), that thread does **nothing** for 2s. It is "Blocked".
This limits scalability. 200 threads * 2s = Max 100 RPS.

---

## 3. Solution 1: Async Servlets (`Callable`)

```java
@GetMapping("/async")
public Callable<String> hello() {
    return () -> {
        Thread.sleep(2000); // Runs in a separate "TaskExecutor" pool
        return "Hello";
    };
}
```
Releases the Tomcat thread immediately. But still uses a thread in the background.

---

## 4. Solution 2: Reactive (WebFlux)

**Event Loop Model** (Node.js style).
Only 1 thread per CPU core.
Never blocks.

```java
@GetMapping("/reactive")
public Mono<String> hello() {
    return database.find().map(d -> "Hello " + d);
}
```

**Tradeoff**: Complexity. Stack traces are ugly. JDBC drivers don't work (need R2DBC).

---

## 5. Virtual Threads (Java 21+)

**The Game Changer**.
Lightweight threads managed by JVM, not OS.
You can have 1 million Virtual Threads.

Spring Boot 3.2+ supports this:
`spring.threads.virtual.enabled=true`

Now your blocking code scales like non-blocking code!
