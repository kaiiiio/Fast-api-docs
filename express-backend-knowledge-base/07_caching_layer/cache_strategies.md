# Cache Strategies: Improving Performance with Caching

Caching stores frequently accessed data in fast storage to reduce database load and improve response times. This guide covers caching strategies for Express.js applications.

## What is Caching?

**Caching** stores frequently accessed data in memory (or fast storage) to avoid repeated expensive operations like database queries.

### Benefits

```
- Faster response times
- Reduced database load
- Better scalability
- Lower costs
```

## Cache-Aside Pattern (Lazy Loading)

**Cache-Aside** is the most common caching pattern. The application checks the cache first, then queries the database if not found.

### Implementation

```javascript
const redis = require('redis');
const client = redis.createClient();

// Cache-aside pattern
async function getUser(userId) {
    // 1. Check cache
    const cacheKey = `user:${userId}`;
    const cached = await client.get(cacheKey);
    
    if (cached) {
        return JSON.parse(cached);  // Return from cache
    }
    
    // 2. Cache miss: Query database
    const user = await User.findById(userId);
    
    if (!user) {
        return null;
    }
    
    // 3. Store in cache
    await client.setEx(cacheKey, 3600, JSON.stringify(user));  // TTL: 1 hour
    
    // 4. Return
    return user;
}

// Use in route
app.get('/users/:id', async (req, res) => {
    const user = await getUser(req.params.id);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
});
```

**Explanation:**
Cache-aside checks cache first, queries database on miss, and stores result in cache for future requests.

## Write-Through Cache

**Write-Through** writes to both cache and database simultaneously.

### Implementation

```javascript
async function createUser(userData) {
    // 1. Create in database
    const user = await User.create(userData);
    
    // 2. Update cache immediately
    const cacheKey = `user:${user.id}`;
    await client.setEx(cacheKey, 3600, JSON.stringify(user));
    
    return user;
}

async function updateUser(userId, userData) {
    // 1. Update database
    const user = await User.findByIdAndUpdate(userId, userData, { new: true });
    
    // 2. Update cache
    const cacheKey = `user:${userId}`;
    await client.setEx(cacheKey, 3600, JSON.stringify(user));
    
    return user;
}
```

**Explanation:**
Write-through ensures cache and database are always in sync by updating both on writes.

## Write-Back Cache (Write-Behind)

**Write-Back** writes to cache first, then asynchronously writes to database.

### Implementation

```javascript
const Queue = require('bull');
const writeQueue = new Queue('database-writes');

async function updateUser(userId, userData) {
    // 1. Update cache immediately
    const cacheKey = `user:${userId}`;
    const updatedUser = { ...existingUser, ...userData };
    await client.setEx(cacheKey, 3600, JSON.stringify(updatedUser));
    
    // 2. Queue database write (asynchronous)
    await writeQueue.add('update-user', {
        userId,
        userData
    });
    
    return updatedUser;
}

// Worker processes queue
writeQueue.process('update-user', async (job) => {
    const { userId, userData } = job.data;
    await User.findByIdAndUpdate(userId, userData);
});
```

**Explanation:**
Write-back provides fastest writes by updating cache immediately and writing to database asynchronously.

## Cache Invalidation

### Time-Based (TTL)

```javascript
// Cache expires after time
await client.setEx('user:123', 3600, JSON.stringify(user));  // 1 hour TTL

// Automatic expiration
```

### Event-Based

```javascript
// Invalidate on data change
async function updateUser(userId, userData) {
    // Update database
    const user = await User.findByIdAndUpdate(userId, userData, { new: true });
    
    // Invalidate cache
    await client.del(`user:${userId}`);
    
    // Or update cache
    await client.setEx(`user:${userId}`, 3600, JSON.stringify(user));
    
    return user;
}
```

### Tag-Based

```javascript
// Cache with tags
async function cacheUser(user) {
    const cacheKey = `user:${user.id}`;
    await client.setEx(cacheKey, 3600, JSON.stringify(user));
    
    // Add to tag set
    await client.sAdd(`tag:user:${user.id}`, cacheKey);
    await client.sAdd('tag:all-users', cacheKey);
}

// Invalidate by tag
async function invalidateUserCache(userId) {
    const members = await client.sMembers(`tag:user:${userId}`);
    if (members.length > 0) {
        await client.del(...members);
    }
}
```

## Real-World Examples

### Example 1: User Profile Caching

```javascript
const redis = require('redis');
const client = redis.createClient();

async function getUserProfile(userId) {
    const cacheKey = `user_profile:${userId}`;
    
    // Check cache
    const cached = await client.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }
    
    // Query database
    const user = await User.findById(userId)
        .populate('orders')
        .populate('addresses');
    
    if (!user) {
        return null;
    }
    
    // Cache for 30 minutes
    await client.setEx(cacheKey, 1800, JSON.stringify(user));
    
    return user;
}

// Invalidate on update
app.put('/users/:id', async (req, res) => {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    // Invalidate cache
    await client.del(`user_profile:${req.params.id}`);
    
    res.json(user);
});
```

### Example 2: Product List Caching

```javascript
async function getProducts(categoryId, page = 1) {
    const cacheKey = `products:${categoryId}:${page}`;
    
    // Check cache
    const cached = await client.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }
    
    // Query database
    const products = await Product.find({ category_id: categoryId })
        .limit(20)
        .skip((page - 1) * 20)
        .sort({ created_at: -1 });
    
    // Cache for 1 hour
    await client.setEx(cacheKey, 3600, JSON.stringify(products));
    
    return products;
}

// Invalidate on product update
app.put('/products/:id', async (req, res) => {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    // Invalidate all product caches for this category
    const keys = await client.keys(`products:${product.category_id}:*`);
    if (keys.length > 0) {
        await client.del(...keys);
    }
    
    res.json(product);
});
```

### Example 3: Session Caching

```javascript
// Cache user sessions
async function getSession(sessionId) {
    const cacheKey = `session:${sessionId}`;
    
    const cached = await client.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }
    
    // Session not found or expired
    return null;
}

// Store session
async function setSession(sessionId, sessionData) {
    const cacheKey = `session:${sessionId}`;
    await client.setEx(cacheKey, 3600, JSON.stringify(sessionData));  // 1 hour
}

// Middleware
app.use(async (req, res, next) => {
    const sessionId = req.cookies.sessionId;
    if (sessionId) {
        const session = await getSession(sessionId);
        if (session) {
            req.user = session.user;
        }
    }
    next();
});
```

## Best Practices

1. **Cache Hot Data**: Cache frequently accessed data
2. **Set TTL**: Always set expiration time
3. **Invalidate on Updates**: Keep cache fresh
4. **Handle Cache Misses**: Graceful degradation
5. **Monitor Hit Rate**: Track cache effectiveness

## Common Mistakes

### ❌ Caching Everything

```javascript
// ❌ Bad: Cache rarely accessed data
async function getData(key) {
    const cached = await client.get(key);
    if (cached) return JSON.parse(cached);
    
    const data = await db.query(key);
    await client.setEx(key, 3600, JSON.stringify(data));
    return data;
}

// ✅ Good: Cache only hot data
async function getHotData(key) {
    if (isHotKey(key)) {  // Check if frequently accessed
        const cached = await client.get(key);
        if (cached) return JSON.parse(cached);
        
        const data = await db.query(key);
        await client.setEx(key, 3600, JSON.stringify(data));
        return data;
    }
    return await db.query(key);  // Don't cache cold data
}
```

### ❌ No Invalidation

```javascript
// ❌ Bad: Never invalidate
await client.set('user:1', JSON.stringify(user));  // No TTL, never expires

// ✅ Good: Invalidate on update
app.put('/users/:id', async (req, res) => {
    const user = await User.findByIdAndUpdate(req.params.id, req.body);
    await client.del(`user:${req.params.id}`);  // Invalidate
    res.json(user);
});
```

## Summary

**Cache Strategies:**

1. **Cache-Aside**: Check cache, query DB on miss
2. **Write-Through**: Write to cache and DB
3. **Write-Back**: Write to cache, async to DB
4. **Invalidation**: TTL, event-based, tag-based
5. **Best Practice**: Cache hot data, set TTL, invalidate on updates

**Key Takeaway:**
Caching significantly improves performance by storing frequently accessed data in fast storage. Use cache-aside for reads, write-through for consistency, and write-back for performance. Implement proper cache invalidation (TTL, events, tags) to keep data fresh. Cache hot data, monitor hit rates, and handle cache misses gracefully.

**Cache Patterns:**
- Cache-Aside: Most common, simple
- Write-Through: Strong consistency
- Write-Back: Best performance, eventual consistency

**Next Steps:**
- Learn [Redis Integration](redis_integration.md) for caching implementation
- Study [Cache Invalidation Patterns](cache_invalidation_patterns.md) for invalidation
- Master [Performance Optimization](../15_deployment_and_performance/) for tuning

