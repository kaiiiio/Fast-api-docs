# DB Connection Pooling: Minimal Guide

## Core Concepts
*   **Pool Size:** How many connections stay open (e.g., `pool_size=10`).
*   **Max Overflow:** Additional temporary connections under load (e.g., `max_overflow=20`).
*   **Total Connections:** `pool_size` + `max_overflow`.
*   **Checkout Timeout:** How long to wait for a connection before failing (default 30s).

### Connection Pooling Diagram
```mermaid
graph LR
    A[Requests] --> B{Pool Cache}
    B -->|Found| C[Use Connection]
    B -->|Empty| D[Create Connection (up to Max Overflow)]
    D --> E[Use Connection]
    E --> F[Return to Pool]
    C --> F
```

## Configuration
```python
engine = create_async_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True, # Health check before use
    pool_recycle=3600   # Refresh every hour
)
```

## How it works?
- **Hit Cache:** If a connection is available, use it immediately.
- **Queue:** If all `pool_size` are taken, it creates up to `max_overflow` more.
- **Fail:** If all `pool_size` + `max_overflow` are taken, the next request **waits** and then **fails** after the timeout.

## Best Practices
- ✅ Adjust based on **Number of workers** (Gunicorn/Uvicorn).
- ✅ Total DB server connections = `(pool_size + max_overflow) * total_app_instances`.
- ✅ Increase `pool_size` if you have high volume but consistent traffic.
- ✅ Increase `max_overflow` for bursty traffic (spikes).
- ✅ Always use **`pool_pre_ping=True`** (reconnect safely).

## Summary Checklist
- ✅ Pool size adjusted (10-20 per instance)
- ✅ Max overflow configured (for bursts)
- ✅ Health checks (pre-ping)
- ✅ Recycle time set (avoid DB timeouts)
- ✅ Monitoring DB connections