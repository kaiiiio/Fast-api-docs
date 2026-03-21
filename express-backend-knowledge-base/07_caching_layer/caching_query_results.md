# Caching Query Results: Optimizing Database Performance

Caching query results reduces database load and improves response times. This guide covers caching database queries in Express.js applications.

## Why Cache Query Results?

**Benefits:**
- Faster response times
- Reduced database load
- Better scalability
- Lower costs

## Basic Query Caching

### Simple Cache Pattern

```javascript
const redis = require('redis');
const client = redis.createClient();

// Cache query results
async function getUsersWithCache() {
    const cacheKey = 'users:all';
    
    // Check cache
    const cached = await client.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }
    
    // Query database
    const users = await User.findAll();
    
    // Cache for 5 minutes
    await client.setEx(cacheKey, 300, JSON.stringify(users));
    
    return users;
}
```

## Real-World Examples

### Example 1: Caching User Queries

```javascript
// Cache user by ID
async function getUserById(userId) {
    const cacheKey = `user:${userId}`;
    
    const cached = await client.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }
    
    const user = await User.findByPk(userId, {
        include: ['profile', 'orders']
    });
    
    if (user) {
        await client.setEx(cacheKey, 3600, JSON.stringify(user));
    }
    
    return user;
}

// Invalidate on update
app.put('/users/:id', async (req, res) => {
    const user = await User.update(req.body, {
        where: { id: req.params.id },
        returning: true
    });
    
    // Invalidate cache
    await client.del(`user:${req.params.id}`);
    
    res.json(user);
});
```

### Example 2: Caching Complex Queries

```javascript
// Cache complex aggregation queries
async function getProductStats(categoryId) {
    const cacheKey = `stats:products:category:${categoryId}`;
    
    const cached = await client.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }
    
    const stats = await sequelize.query(`
        SELECT 
            COUNT(*) as total_products,
            AVG(price) as avg_price,
            MAX(price) as max_price,
            MIN(price) as min_price
        FROM products
        WHERE category_id = :categoryId
    `, {
        replacements: { categoryId },
        type: sequelize.QueryTypes.SELECT
    });
    
    // Cache for 1 hour
    await client.setEx(cacheKey, 3600, JSON.stringify(stats[0]));
    
    return stats[0];
}
```

## Cache-Aside Pattern

```javascript
// Cache-aside: Check cache, then database
async function getData(key, fetchFn, ttl = 3600) {
    // Try cache first
    const cached = await client.get(key);
    if (cached) {
        return JSON.parse(cached);
    }
    
    // Fetch from database
    const data = await fetchFn();
    
    // Store in cache
    if (data) {
        await client.setEx(key, ttl, JSON.stringify(data));
    }
    
    return data;
}

// Use
const user = await getData(
    `user:${userId}`,
    () => User.findByPk(userId),
    3600
);
```

## Best Practices   -- IMP

1. **Cache Hot Data**: Cache frequently accessed data
2. **Set TTL**: Use appropriate expiration times
3. **Invalidate on Writes**: Clear cache on updates
4. **Monitor Hit Rate**: Track cache effectiveness
5. **Handle Cache Misses**: Gracefully handle cache failures

## Summary

**Caching Query Results:**

1. **Purpose**: Reduce database load, improve performance
2. **Pattern**: Cache-aside pattern
3. **Implementation**: Redis for caching
4. **Best Practice**: Cache hot data, invalidate on writes
5. **Benefits**: Faster responses, reduced load

**Key Takeaway:**
Caching query results reduces database load and improves response times. Use cache-aside pattern: check cache first, then database, then update cache. Set appropriate TTLs and invalidate cache on writes. Monitor cache hit rates for effectiveness.

**Caching Strategy:**
- Cache frequently accessed data
- Set appropriate TTLs
- Invalidate on writes
- Monitor hit rates
- Handle cache failures

---

## 🎯 Interview Questions: Caching Query Results

### Q1: Conceptually, how does caching query results change the performance profile of an Express.js API?

**Answer:**

Without caching, every request goes to the **database**, so latency and throughput are bounded by DB performance.

With caching:

```
Request Flow (with Cache-Aside):
Client → API → Cache
              ├─ Hit  → Return value (few ms)
              └─ Miss → Query DB → Store in cache → Return
```

- **Cold path (first request):** Same as no cache (hits DB once).  
- **Warm path (subsequent requests):** Served from memory (Redis), often **10–100x faster**.  
- **Effect on DB:** Fewer repeated reads → more capacity for writes / complex queries.

### Q2: What are the main risks of caching query results and how do you mitigate them?

**Answer:**

**Risks (Theory):**

- **Stale Data:** Cache may return outdated results if not invalidated.  
  → Mitigate with TTL + event-based invalidation for critical writes.
- **Cache Stampede:** Many concurrent requests miss at once and all hit DB.  
  → Mitigate with request coalescing (single “leader” populates cache) or random jitter in TTL.
- **Thundering Herd on Expiry:** Many keys expiring simultaneously cause DB spike.  
  → Mitigate with **staggered TTLs** and background refresh.
- **Incorrect Invalidation:** Bugs in invalidation logic cause subtle consistency issues.  
  → Keep invalidation rules simple and close to write paths.

---

## Summary

These interview questions cover:
- ✅ How caching reshapes latency/throughput
- ✅ Conceptual risk analysis (staleness, stampede, herd)

They help you explain not just “how to cache” but “how to think about caching safely”.

**Next Steps:**
- Learn [Cache Strategies](cache_strategies.md) for patterns
- Study [Cache Invalidation](cache_invalidation_patterns.md) for management
- Master [Redis Integration](redis_integration.md) for implementation

