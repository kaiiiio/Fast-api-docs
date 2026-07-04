# Caching Strategies: Minimal Guide

## Common Strategies
1.  **Cache Aside (Most Common):**
    - Check Cache.
    - If **Hit** → Return data.
    - If **Miss** → Fetch from DB → Set Cache (TTL) → Return data.

2.  **Write-Through:**
    - Always update **DB and Cache** at the same time.
    - Pros: Cache is always up-to-date.
    - Cons: Slower writes.

3.  **Write-Behind (Write-Back):**
    - Update **Cache** first → Update **DB** in the background.
    - Pros: Extremely fast writes.
    - Cons: Risk of data loss if Redis crashes before DB update.

## Comparison Summary
| Strategy | Reading | Writing | Best For |
|----------|---------|---------|----------|
| **Cache Aside** | ⚡ Fast (Hit) | 🐌 Normal | Most General Use |
| **Write-Through**| ✅ Accurate | 🐌 Slow | Low-latency critical data |
| **Write-Behind** | 🚀 Ultra-Fast| 🚀 Ultra-Fast | Heavy logs/counters |

## Implementation Tip (FastAPI)
- Use a **Decorator** to wrap your route functions and automatically check/set Redis cache.
- Set a reasonable **TTL (Time-To-Live)** (e.g., 5-60 mins) to prevent stale data.

## Best Practices
- ✅ Don't cache **Everything**; focus on heavy DB queries.
- ✅ Use **TTL** for all cache keys.
- ✅ Implement **Manual Invalidation** when data changes (e.g., delete key on `PUT/POST`).
- ✅ Monitor **Cache Hit Ratio** (should be >80-90% for efficiency).

## Summary Checklist
- ✅ Strategy chosen for each domain
- ✅ TTL configured per dataset
- ✅ Invalidation on data update
- ✅ Key-prefixes used
- ✅ Performance monitored
