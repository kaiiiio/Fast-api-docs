# Redis — Deep Dive (Beyond Caching)

## What Redis Actually Is

Redis is a **single-threaded, in-memory data structure server**.

It is used as:

* Cache
* Session store
* Rate limiter
* Queue backend
* Distributed lock system

> Redis is fast because **RAM + single-thread + no joins**

---

## Redis Data Structures (IMPORTANT)

| Type       | Use Case             |
| ---------- | -------------------- |
| String     | Cache values         |
| Hash       | User/session objects |
| List       | Queues               |
| Set        | Unique values        |
| Sorted Set | Leaderboards         |

Example:

```ts
SET user:1 "{name: 'A'}" EX 60
HSET session:123 userId 1
```

---

## Redis in Real Systems

```
API Request
 ↓
Check Redis Cache
 ↓ (MISS)
Database
 ↓
Save to Redis
```

Why Redis instead of DB?

* DB = disk + CPU heavy
* Redis = memory

---

## Redis Failure Modes

❌ Cache stampede
❌ Data loss if not persisted
❌ Single point if not clustered

Solutions:

* TTLs
* Redis Cluster
* Fallback to DB

---

## Important Redis Terms

* **Atomic** (all-or-nothing operation): Redis finishes one command fully before another command interrupts it.
* **Lock contention** (many processes waiting for the same lock): causes slowdowns when many workers fight for one shared resource.
* **Memory bloat** (memory growing due to old/large data): happens when keys, completed jobs, or failed jobs are not cleaned up.
* **Eviction policy** (rule for what Redis removes when memory is full): safe for cache Redis, risky for queue Redis if job keys get removed.

Common eviction policies:

| Policy | Short Meaning |
| ------ | ------------- |
| `noeviction` | Do not delete keys; reject writes |
| `allkeys-lru` | Remove least recently used key |
| `allkeys-lfu` | Remove least frequently used key |
| `volatile-lru` | Remove least recently used key only if it has TTL |
| `volatile-ttl` | Remove key nearest to expiry |

---

## Interview Questions

**Q: Why is Redis single-threaded?**
A: To avoid lock contention and maintain predictable performance. All operations are atomic.

**Q: When would you NOT use Redis?**
A: When you need complex queries, joins, or guaranteed durability without configuration.

**Q: How do you handle cache invalidation?**
A: Use TTLs, event-based invalidation, or cache-aside pattern with manual invalidation.

---

## Real-World Use Cases

1. **Session Management**: Store user sessions across multiple servers
2. **Rate Limiting**: Track API calls per user/IP
3. **Leaderboards**: Sorted sets for real-time rankings
4. **Pub/Sub**: Real-time messaging and notifications
5. **Distributed Locks**: Coordinate work across multiple services

---

## Best Practices

✅ Always set TTLs to prevent memory bloat
✅ Use Redis Cluster for high availability
✅ Monitor memory usage
✅ Use appropriate data structures
✅ Implement fallback to database
✅ Use connection pooling

❌ Don't store large objects (>100KB)
❌ Don't use as primary database
❌ Don't ignore eviction policies
