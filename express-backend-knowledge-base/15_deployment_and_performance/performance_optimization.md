# Performance Optimization: Making Express.js Applications Fast

Performance optimization improves application speed and efficiency. This guide covers techniques for optimizing Express.js applications.

## Performance Optimization Techniques

### 1. Enable Compression

```javascript
const compression = require('compression');

// Enable gzip compression
app.use(compression());
```

### 2. Use Production Mode

```javascript
// Set NODE_ENV to production
process.env.NODE_ENV = 'production';

// Express optimizations in production
// - Caching view templates
// - Less verbose error messages
// - Better performance
```

### 3. Connection Pooling

```javascript
// Use connection pooling for databases
const pool = mysql.createPool({
    connectionLimit: 20,
    host: 'localhost',
    user: 'user',
    password: 'password',
    database: 'mydb'
});
```

### 4. Caching

```javascript
// Cache frequently accessed data
const redis = require('redis');
const client = redis.createClient();

async function getUser(userId) {
    const cacheKey = `user:${userId}`;
    const cached = await client.get(cacheKey);
    
    if (cached) {
        return JSON.parse(cached);
    }
    
    const user = await User.findById(userId);
    await client.setEx(cacheKey, 3600, JSON.stringify(user));
    return user;
}
```

### 5. Optimize Queries

```javascript
// Use indexes
await User.createIndex({ email: 1 });

// Select only needed fields
const users = await User.find({}, 'name email');  // Only name and email

// Use pagination
const users = await User.find().limit(20).skip(0);
```

### 6. Async Operations

```javascript
// Use async/await for non-blocking operations
app.get('/users', async (req, res) => {
    const users = await User.find();  // Non-blocking
    res.json(users);
});
```

## Real-World Optimizations

### Example 1: Response Caching

```javascript
const express = require('express');
const redis = require('redis');
const client = redis.createClient();

// Cache middleware
function cacheMiddleware(ttl = 3600) {
    return async (req, res, next) => {
        const cacheKey = `cache:${req.originalUrl}`;
        
        const cached = await client.get(cacheKey);
        if (cached) {
            return res.json(JSON.parse(cached));
        }
        
        // Store original json method
        const originalJson = res.json;
        res.json = function(data) {
            // Cache response
            client.setEx(cacheKey, ttl, JSON.stringify(data));
            return originalJson.call(this, data);
        };
        
        next();
    };
}

// Use middleware
app.get('/products', cacheMiddleware(1800), async (req, res) => {
    const products = await Product.find({ published: true });
    res.json(products);
});
```

### Example 2: Database Query Optimization

```javascript
// Optimize queries with indexes and projections
app.get('/users', async (req, res) => {
    // Use projection to select only needed fields
    const users = await User.find(
        { isActive: true },
        'name email createdAt'  // Only these fields
    )
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();  // Return plain objects (faster)
    
    res.json(users);
});

// Use aggregation for complex queries
app.get('/stats', async (req, res) => {
    const stats = await User.aggregate([
        { $match: { isActive: true } },
        {
            $group: {
                _id: '$role',
                count: { $sum: 1 },
                avgAge: { $avg: '$age' }
            }
        }
    ]);
    
    res.json(stats);
});
```

## Best Practices

1. **Enable Compression**: Use gzip compression
2. **Connection Pooling**: Pool database connections
3. **Caching**: Cache frequently accessed data
4. **Optimize Queries**: Use indexes, projections, pagination
5. **Monitor Performance**: Track response times and bottlenecks

## Summary

**Performance Optimization:**

1. **Techniques**: Compression, connection pooling, caching, query optimization
2. **Tools**: Redis for caching, connection pools for databases
3. **Best Practice**: Enable compression, pool connections, cache data, optimize queries
4. **Monitoring**: Track performance metrics
5. **Iterative**: Continuously measure and optimize

**Key Takeaway:**
Performance optimization improves application speed through compression, connection pooling, caching, and query optimization. Enable gzip compression, use connection pools, cache frequently accessed data, and optimize database queries with indexes and projections. Monitor performance and iterate on optimizations.

**Optimization Strategy:**
- Enable compression
- Use connection pooling
- Cache hot data
- Optimize queries
- Monitor performance

**Next Steps:**
- Learn [Scaling Strategies](scaling_strategies.md) for growth
- Study [Dockerizing Express](dockerizing_express.md) for deployment
- Master [Monitoring](../14_observability/) for performance tracking

