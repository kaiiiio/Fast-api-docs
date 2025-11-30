# Load Testing with JMeter

## 1. Why Load Test?

"It works on my machine" != "It works for 10,000 users".
You need to find the **Breaking Point**.
- Is it the DB connection pool?
- Is it the CPU?
- Is it the Garbage Collector?

---

## 2. Creating a Test Plan (JMeter)

1.  **Thread Group**: Simulates Users.
    - Number of Threads: 100
    - Ramp-up Period: 10s (Start 10 users per second)
    - Loop Count: Infinite (Duration 5 mins)

2.  **HTTP Request**:
    - Method: POST
    - Path: `/api/orders`
    - Body: `{"productId": 123}`

3.  **Listeners**:
    - View Results Tree (Debug)
    - Summary Report (Stats)

---

## 3. Interpreting Results

- **Throughput**: Requests per second (RPS). Higher is better.
- **Latency (99th Percentile)**: 99% of requests took less than X ms.
- **Error Rate**: Should be 0%.

**Scenario**:
- 100 Users -> 20ms Latency.
- 1000 Users -> 50ms Latency.
- 5000 Users -> **5000ms Latency (Timeout)**.

**Conclusion**: Your capacity is ~2000 concurrent users.

---

## 4. Automating in CI/CD

Don't run GUI in CI. Run CLI mode.

```bash
jmeter -n -t test-plan.jmx -l results.jtl
```

Fail the build if error rate > 1%.
