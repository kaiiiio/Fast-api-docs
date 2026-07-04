# Load Testing: Minimal Guide

## Terminology
*   **Load Testing:** Testing system performance under **Normal** loads. 
*   **Stress Testing:** Testing system performance under **High** loads (find the breaking point).
*   **Throughput (RPS):** Number of requests handled per second.
*   **Latency (ms):** Time taken to process a request (ms).

### Load Testing Lifecycle
```mermaid
graph LR
    A[Start] --> B[Gradual Ramp-up]
    B --> C[Peak Load]
    C --> D[Identify Bottleneck]
    D --> E[SLA (Pass/Fail)]
```

## Core Tools
1.  **Locust (Python):** Best for write-intensive/complex user flows. Distributed and script-based.
2.  **K6 (JS):** High-performance, modern scripting, lightweight.
3.  **Apache Bench (ab) / wrk:** Simple for high-frequency testing of single endpoints.

## Implementation Essentials
```python
# Simple Locust File Example
from locust import HttpUser, task, between

class APIUser(HttpUser):
    wait_time = between(1, 2)

    @task
    def get_users(self):
        self.client.get("/api/v1/users")
```

## Best Practices
- ✅ **Test in Production-like environment**, not your local laptop.
- ✅ Monitor **DB & Memory** (CPU, RAM, DB Connections) during the load test.
- ✅ Identify **Bottlenecks** (N+1 queries, slow DB, CPU-bound code).
- ✅ Increase load **Gradually** (Ramp-up).
- ✅ Set **SLA** (e.g., 99th percentile < 100ms).

## Summary Checklist
- ✅ Load testing tool chosen (Locust/K6)
- ✅ Realistic user profiles
- ✅ Monitoring (CPU, RAM, DB)
- ✅ Bottlenecks identified
- ✅ SLAs defined