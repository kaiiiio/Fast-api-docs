# Cache Invalidation Patterns: Keeping Cache Fresh

Cache invalidation ensures cached data stays synchronized with the database. This guide covers strategies for invalidating cache in Express.js applications.

## What is Cache Invalidation?

**Cache invalidation** removes or updates cached data when the source data changes, ensuring users see fresh data.

### The Problem

```javascript
// Problem: Stale cache
// 1. User data cached
await redis.set('user:1', JSON.stringify(user));

// 2. User updates profile
await User.update({ id: 1 }, { name: 'John Updated' });

// 3. Cache still has old data!
const cached = await redis.get('user:1');  // Old name: 'John'
```

## Invalidation Strategies

### Strategy 1: Time-Based (TTL)

**Time-based invalidation** expires cache after a set time period.

```javascript
// Cache with TTL
await redis.setEx('user:1', 3600, JSON.stringify(user));  // Expires in 1 hour

// Automatic expiration
// After 1 hour, cache is automatically removed
```

**Use When:**
- Data changes infrequently
- Stale data is acceptable for short periods
- Simple to implement

### Strategy 2: Event-Based

**Event-based invalidation** invalidates cache when data changes.

```javascript
// Invalidate on update
app.put('/users/:id', async (req, res) => {
    // Update database
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    // Invalidate cache
    await redis.del(`user:${req.params.id}`);
    
    res.json(user);
});

// Or update cache
app.put('/users/:id', async (req, res) => {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    // Update cache with new data
    await redis.setEx(`user:${req.params.id}`, 3600, JSON.stringify(user));
    
    res.json(user);
});
```

**Use When:**
- Data changes frequently
- Need fresh data immediately
- Can handle invalidation logic

### Strategy 3: Tag-Based

**Tag-based invalidation** invalidates related caches using tags.

```javascript
// Cache with tags
async function cacheUser(user) {
    const cacheKey = `user:${user.id}`;
    await redis.setEx(cacheKey, 3600, JSON.stringify(user));
    
    // Add to tag sets
    await redis.sAdd(`tag:user:${user.id}`, cacheKey);
    await redis.sAdd('tag:all-users', cacheKey);
    await redis.sAdd(`tag:user_email:${user.email}`, cacheKey);
}

// Invalidate by tag
async function invalidateUserCache(userId) {
    // Get all cache keys for this user
    const keys = await redis.sMembers(`tag:user:${userId}`);
    
    if (keys.length > 0) {
        await redis.del(...keys);
    }
    
    // Clear tag set
    await redis.del(`tag:user:${userId}`);
}

// Use in update
app.put('/users/:id', async (req, res) => {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    // Invalidate all user-related caches
    await invalidateUserCache(req.params.id);
    
    res.json(user);
});
```

## Real-World Examples

### Example 1: User Profile Cache

```javascript
// Cache user profile
async function getUserProfile(userId) {
    const cacheKey = `user_profile:${userId}`;
    
    // Check cache
    const cached = await redis.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }
    
    // Query database
    const user = await User.findById(userId)
        .populate('orders')
        .populate('addresses');
    
    // Cache for 30 minutes
    await redis.setEx(cacheKey, 1800, JSON.stringify(user));
    
    return user;
}

// Invalidate on update
app.put('/users/:id', async (req, res) => {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    // Invalidate profile cache
    await redis.del(`user_profile:${req.params.id}`);
    
    // Also invalidate email-based cache if email changed
    if (req.body.email) {
        await redis.del(`user_by_email:${req.body.email}`);
    }
    
    res.json(user);
});
```

### Example 2: Product List Cache

```javascript
// Cache product lists
async function getProducts(categoryId, page = 1) {
    const cacheKey = `products:${categoryId}:${page}`;
    
    const cached = await redis.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }
    
    const products = await Product.find({ category_id: categoryId })
        .limit(20)
        .skip((page - 1) * 20);
    
    await redis.setEx(cacheKey, 3600, JSON.stringify(products));
    return products;
}

// Invalidate on product update
app.put('/products/:id', async (req, res) => {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    // Invalidate all product list caches for this category
    const keys = await redis.keys(`products:${product.category_id}:*`);
    if (keys.length > 0) {
        await redis.del(...keys);
    }
    
    // Also invalidate product detail cache
    await redis.del(`product:${req.params.id}`);
    
    res.json(product);
});
```

### Example 3: Hierarchical Cache Invalidation

```javascript
// Cache with hierarchy
// user:1 → user_profile:1 → user_orders:1

async function invalidateUserHierarchy(userId) {
    // Invalidate all user-related caches
    const patterns = [
        `user:${userId}`,
        `user_profile:${userId}`,
        `user_orders:${userId}`,
        `user_settings:${userId}`
    ];
    
    for (const pattern of patterns) {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    }
}

// Use in update
app.put('/users/:id', async (req, res) => {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    // Invalidate entire user hierarchy
    await invalidateUserHierarchy(req.params.id);
    
    res.json(user);
});
```

## Using Change Streams for Invalidation

### MongoDB Change Streams

```javascript
// Watch for changes and invalidate cache
const changeStream = User.watch();

changeStream.on('change', async (change) => {
    if (change.operationType === 'update') {
        const userId = change.documentKey._id;
        
        // Invalidate cache
        await redis.del(`user:${userId}`);
        await redis.del(`user_profile:${userId}`);
    } else if (change.operationType === 'delete') {
        const userId = change.documentKey._id;
        
        // Invalidate all user caches
        await invalidateUserHierarchy(userId);
    }
});
```

## Best Practices

1. **Invalidate on Writes**: Always invalidate on create/update/delete
2. **Use Patterns**: Invalidate related caches together
3. **Consider TTL**: Combine TTL with event-based invalidation
4. **Handle Race Conditions**: Use locks for critical updates
5. **Monitor**: Track cache hit/miss rates

## Common Patterns

### Pattern 1: Write-Through Cache

```javascript
// Update cache and database together
async function updateUser(userId, userData) {
    // Update database
    const user = await User.findByIdAndUpdate(userId, userData, { new: true });
    
    // Update cache immediately
    await redis.setEx(`user:${userId}`, 3600, JSON.stringify(user));
    
    return user;
}
```

### Pattern 2: Write-Around Cache

```javascript
// Write to database, invalidate cache
async function updateUser(userId, userData) {
    // Update database
    const user = await User.findByIdAndUpdate(userId, userData, { new: true });
    
    // Invalidate cache (will be repopulated on next read)
    await redis.del(`user:${userId}`);
    
    return user;
}
```

## Summary

**Cache Invalidation Patterns:**

1. **Time-Based**: TTL expiration
2. **Event-Based**: Invalidate on data changes
3. **Tag-Based**: Invalidate related caches
4. **Change Streams**: Automatic invalidation
5. **Best Practice**: Combine strategies, invalidate on writes

**Key Takeaway:**
Cache invalidation keeps cached data fresh by removing or updating cache when source data changes. Use time-based invalidation (TTL) for infrequently changing data, event-based for immediate freshness, and tag-based for related caches. Always invalidate cache on writes (create/update/delete) to ensure data consistency.

**Invalidation Strategies:**
- TTL: Simple, automatic
- Event-based: Immediate freshness
- Tag-based: Related caches
- Change streams: Automatic

---

## 🎯 Interview Questions: Cache Invalidation

### Q1: Why is cache invalidation considered a hard problem? Explain the main strategies conceptually.

**Answer:**

Cache invalidation is famously difficult because it creates a **distributed state problem**. You must decide when to "break" the existing link between the cached copy and the source of truth, balancing the risk of serving stale data against the performance cost of frequent re-computation.

Cache invalidation is hard because you must keep **fast but stale-prone** data (cache) in sync with the **source of truth** (DB) without over-complicating logic or hurting performance.

**Key Strategies (Theory):**

- **Time-based (TTL):**  
  - Set expiration time; cache auto-expires.  
  - Simple, good when data tolerance to staleness is high.  
  - Risk: Data may be stale between writes and TTL expiry.
- **Event-based:**  
  - Invalidate when a **write** happens (create/update/delete).  
  - More accurate; requires hooks in write paths or change streams.  
  - Harder to implement across multiple services.
- **Tag-based / Key grouping:**  
  - Group related keys under logical tags (e.g., `user:123:*`).  
  - Invalidate whole group when entity changes.  
  - Useful when one write affects many cached views (profile + dashboard + recommendations).

### Q2: How do you reason about consistency levels with caching?

**Answer:**

Choosing a consistency level is a **design trade-off between speed and accuracy**. In high-throughput Express applications, you rarely need perfect consistency for every field; identifying which data points can afford "eventual" freshness allows for a much more scalable caching architecture.

Think in terms of **“how fresh does this data need to be?”** rather than always requiring perfect consistency:

- **Strong consistency:**  
  - Users must never see stale data (e.g., balances, permissions).  
  - Use **write-through** or **immediate invalidation on write**.  
  - Might accept extra latency / complexity.
- **Eventual consistency:**  
  - Temporary staleness acceptable (e.g., like counts, view counters).  
  - Use TTL + async invalidation; refresh lazily.  
  - Much simpler and faster, good for most read-heavy data.

---

## Summary

These interview questions cover:
- ✅ Why cache invalidation is hard
- ✅ Conceptual strategies (TTL, event-based, tag-based)
- ✅ Consistency vs freshness trade-offs

Use them to discuss reasoning, not just code, in interviews.

**Next Steps:**
- Learn [Cache Strategies](cache_strategies.md) for caching patterns
- Study [Redis Integration](redis_integration.md) for implementation
- Master [Performance Optimization](../15_deployment_and_performance/) for tuning

