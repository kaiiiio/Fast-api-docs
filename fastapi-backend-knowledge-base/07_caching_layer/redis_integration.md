# Redis Integration: Minimal Guide

## Core Setup
*   **Driver:** `redis-py` (with `asyncio` support).
*   **Client:** `redis.asyncio.from_url("redis://host:port")`.
*   **Operations:** All operations are async (`await`).

## Basic Operations (Async)
```python
# Set with TTL (1 hour)
await redis.set("user:123", "John Doe", ex=3600)

# Get
user = await redis.get("user:123")

# Bulk Get
users = await redis.mget(["user:1", "user:2"])

# Delete
await redis.delete("user:123")

# Exists?
is_cached = await redis.exists("user:123")
```

## Advanced Patterns
*   **Hashes:** Store multiple fields (e.g., `user:123` with `{name: 'John', age: 30}`).
*   **Sets:** Store unique items (e.g., `online_users`).
*   **Pub/Sub:** Send/Receive messages (simple messaging).

## Best Practices
- ✅ Use **Indices** for frequently queried keys (e.g., `user:123`, `post:456`).
- ✅ Single Client Instance: Create once on app start.
- ✅ Serialize complex types (Pydantic objects) to **JSON** before storing.
- ✅ Use meaningful **Namespace prefixes** (e.g., `app_name:user:123`).

## Summary Checklist
- ✅ Async Redis client configured
- ✅ TTL (Expiration) used for all caches
- ✅ Prefix-based keys
- ✅ JSON serialization for data