# Connection Pooling: Minimal Guide

## Core Concepts
*   **Pool Size:** Max number of persistent DB connections.
*   **Max Overflow:** Additional temporary connections for traffic spikes.
*   **Pool Pre-Ping:** Automatically checks and reconnects dead connections.
*   **Recycle:** Frequency (e.g., 3600s) to refresh connections and avoid timeouts.

## Implementation Essentials
```python
engine = create_async_engine(
    DATABASE_URL,
    pool_size=10,        # Keep 10 connections open
    max_overflow=20,    # Allow 20 more under load
    pool_pre_ping=True, # Auto-check health
    pool_recycle=3600   # Refresh every hour
)
```

## Lifecycle Management
*   **Per-Request Session:** Create a new `AsyncSession` for each request using `Depends()`.
*   **Auto-Cleanup:** Use `yield` inside the dependency to ensure `await session.close()` is always called.
*   **Consistency:** Isolated sessions prevent cross-request data leaks and connection exhaustion.

## Best Practices
- ✅ Don't make `pool_size` too small (leads to wait times) or too large (overwhelms DB).
- ✅ Always close sessions (`await session.close()`) to return connections to the pool.
- ✅ Use **`httpx.AsyncClient`** for external API connection pooling (same concepts).