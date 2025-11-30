# Handling Task Results and Timeouts

## 1. Fire and Forget vs Request-Reply

- **Fire and Forget**: "Generate Report". You don't wait.
- **Request-Reply**: "Generate Report". You wait for the PDF URL.

In Async systems, you can't just `return` the value.

---

## 2. CompletableFuture (In-Memory)

If the task is running in the *same* JVM (via `@Async`), you can return a `CompletableFuture`.

```java
@Async
public CompletableFuture<String> generateReport() {
    // ... long work ...
    return CompletableFuture.completedFuture("https://s3.../report.pdf");
}
```

**Controller**:
```java
@GetMapping("/report")
public CompletableFuture<String> getReport() {
    return service.generateReport();
}
```
**Timeout**:
```java
service.generateReport().orTimeout(5, TimeUnit.SECONDS);
```

---

## 3. Polling (Distributed)

If the task is running on a *different* server (Worker), you can't use `CompletableFuture`.

1.  **Client**: `POST /jobs` -> Returns `{"jobId": "123"}`.
2.  **Client**: `GET /jobs/123` -> Returns `{"status": "PROCESSING"}`.
3.  **Worker**: Finishes job. Updates DB `status = COMPLETED`.
4.  **Client**: `GET /jobs/123` -> Returns `{"status": "COMPLETED", "result": "..."}`.

---

## 4. Webhooks (Push)

Instead of the client polling you, you call them.

1.  **Client**: `POST /jobs` with `callbackUrl: "https://client.com/webhook"`.
2.  **Worker**: Finishes job.
3.  **Worker**: `POST https://client.com/webhook` with result.

**Pros**: Real-time. No wasted polling.
**Cons**: Client must expose a public URL.
