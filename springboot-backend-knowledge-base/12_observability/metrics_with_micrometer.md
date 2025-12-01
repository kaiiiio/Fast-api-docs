# Metrics with Micrometer

## 1. The Facade

Micrometer is "SLF4J for Metrics".
You code against Micrometer.
You export to Prometheus, Datadog, New Relic, etc.

---

## 2. Standard Metrics

Actuator gives you these for free:
- `jvm.memory.used`
- `http.server.requests` (Latency, Count, Errors)
- `jdbc.connections.active`

---

## 3. Custom Metrics

### Counters (Monotonically increasing)
"Total emails sent".

```java
Counter counter = registry.counter("emails.sent", "type", "welcome");
counter.increment();
```

### Gauges (Instantaneous value)
"Current queue size".

```java
List<String> queue = new ArrayList<>();
registry.gauge("queue.size", queue, List::size);
```

### Timers (Distribution)
"How long did it take?"

```java
Timer timer = registry.timer("api.latency");
timer.record(() -> {
    expensiveOperation();
});
```

---

## 4. Tagging

Always use Tags (Labels).
**Bad**: `registry.counter("emails.sent.welcome")`
**Good**: `registry.counter("emails.sent", "type", "welcome")`

This allows you to query:
- `sum(emails_sent)` -> Total emails.
- `sum(emails_sent{type="welcome"})` -> Welcome emails.
