# Redis Integration: Complete Guide for Express.js

Redis is an in-memory data store that acts as a cache, session store, and message broker. This guide teaches you Redis from basics to advanced patterns in Express.js applications.

## Understanding Redis

**What is Redis?** In-memory database (extremely fast), key-value store (like a JavaScript object, but persistent), supports multiple data structures (strings, lists, sets, hashes, etc.).

**Why use Redis in Express.js?** Caching (store frequently accessed data, avoid database queries), sessions (store user session data), rate limiting (track API request counts), real-time features (pub/sub for notifications), and task queues (background job queues).

**Think of Redis as:** Super-fast temporary storage, like your app's "memory" - things you need quickly, complementary to your database (not a replacement).

## Step 1: Installation and Basic Setup

### Installation   -- IMP

```bash
npm install redis
npm install --save-dev @types/redis  # If using TypeScript
```

**Understanding the package:** `redis` is the official Redis client for Node.js with async/await support.

### Basic Connection

```javascript
const redis = require('redis');

// Basic connection: Create Redis client.
let redisClient = null;

// initRedis: Creates Redis connection for Express.js.
async function initRedis() {
    /**
     * Initialize Redis connection.
     */
    redisClient = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'  // Default Redis URL
    });
    
    // Error handling: Listen for connection errors.
    redisClient.on('error', (err) => {
        console.error('Redis Client Error', err);
    });
    
    // Connect: Establish connection to Redis server.
    await redisClient.connect();
    console.log('Redis connected!');
}

// closeRedis: Cleanup connection on app shutdown.
async function closeRedis() {
    /**
     * Close Redis connection.
     */
    if (redisClient) {
        await redisClient.quit();  // Gracefully close connection
        console.log('Redis disconnected!');
    }
}
```

**Understanding the connection:** `redis://localhost:6379` is the default Redis URL. The client automatically handles reconnection and error handling.

### Express.js Integration

```javascript
const express = require('express');
const app = express();

// Initialize Redis on app startup: Connect when server starts.
async function startServer() {
    try {
        await initRedis();
        
        app.listen(3000, () => {
            console.log('Server running on port 3000');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown: Close Redis on process termination.
process.on('SIGTERM', async () => {
    await closeRedis();
    process.exit(0);
});

// Middleware to inject Redis: Make Redis available in routes.
function getRedis(req, res, next) {
    req.redis = redisClient;  // Attach Redis client to request
    next();
}

app.use(getRedis);  // Apply to all routes

startServer();
```

## Step 2: Basic Operations (Strings)

Strings are the simplest Redis data type. Let's start here:

### Set and Get

```javascript
// basicOperations: Basic Redis string operations.
async function basicOperations() {
    const redis = redisClient;
    
    // SET: Store a value (key-value pair).
    await redis.set("user:1:name", "John Doe");
    
    // GET: Retrieve a value by key.
    const name = await redis.get("user:1:name");
    console.log(name);  // "John Doe"
    
    // GET with default: Returns null if key doesn't exist.
    const age = await redis.get("user:1:age") || "Unknown";
    
    // SET with expiration: TTL (Time To Live) in seconds.
    await redis.setEx("session:abc123", 3600, "user_data");  // Expires in 1 hour
    
    // Check if key exists: Returns 1 if exists, 0 if not.
    const exists = await redis.exists("user:1:name");
    console.log(exists);  // 1 if exists, 0 if not
    
    // Delete a key: Removes key-value pair.
    await redis.del("user:1:name");
}
```

**Understanding key naming:** `user:1:name` uses colons to create namespace-like structure. `session:abc123` helps organize keys. Pattern: `object_type:id:field`.

### Expiration (TTL)

```javascript
// ttlExamples: Understanding TTL (Time To Live).
async function ttlExamples() {
    const redis = redisClient;
    
    // Set with expiration (seconds)
    await redis.setEx("temp:data", 60, "some value");  // Expires in 60 seconds
    
    // Set expiration on existing key
    await redis.set("key", "value");
    await redis.expire("key", 300);  // Expires in 5 minutes
    
    // Check remaining TTL
    const ttl = await redis.ttl("key");
    console.log(`Key expires in ${ttl} seconds`);
    // -1 = no expiration
    // -2 = key doesn't exist
    
    // Remove expiration (make key permanent)
    await redis.persist("key");
}
```

## Step 3: Hash Operations (Perfect for Objects)

Hashes are like JavaScript objects. Perfect for storing objects:

```javascript
// hashOperations: Store and retrieve objects using hashes.
async function hashOperations() {
    const redis = redisClient;
    
    // HSET - Set fields in a hash
    await redis.hSet(
        "user:1",
        {
            email: "john@example.com",
            name: "John Doe",
            age: "30"
        }
    );
    
    // HGET - Get single field
    const email = await redis.hGet("user:1", "email");
    
    // HGETALL - Get all fields (returns object)
    const userData = await redis.hGetAll("user:1");
    console.log(userData);
    // { email: "john@example.com", name: "John Doe", age: "30" }
    
    // HSET - Set multiple fields at once
    await redis.hSet("user:1", {
        status: "active",
        last_login: "2024-01-15"
    });
    
    // HDEL - Delete fields
    await redis.hDel("user:1", "age");
    
    // HINCRBY - Increment numeric field
    await redis.hIncrBy("user:1", "login_count", 1);
    
    // HEXISTS - Check if field exists
    const exists = await redis.hExists("user:1", "email");
}
```

**When to use hashes:** Storing user profiles, product information, configuration objects, and any structured data.

## Step 4: Lists and Sets

### Lists (Ordered Collections)

```javascript
// listOperations: Work with Redis lists.
async function listOperations() {
    const redis = redisClient;
    
    // LPUSH - Add to left (beginning)
    await redis.lPush("recent_searches:user1", "laptop", "mouse", "keyboard");
    
    // RPUSH - Add to right (end)
    await redis.rPush("recent_searches:user1", "monitor");
    
    // LRANGE - Get range of items
    const searches = await redis.lRange("recent_searches:user1", 0, -1);  // All items
    
    // LPOP - Remove and get from left
    const first = await redis.lPop("recent_searches:user1");
    
    // LLEN - Get list length
    const length = await redis.lLen("recent_searches:user1");
}
```

### Sets (Unique Collections)

```javascript
// setOperations: Work with Redis sets.
async function setOperations() {
    const redis = redisClient;
    
    // SADD - Add members to set
    await redis.sAdd("user:1:tags", "premium", "vip", "active");
    
    // SMEMBERS - Get all members
    const tags = await redis.sMembers("user:1:tags");
    
    // SISMEMBER - Check if member exists
    const isPremium = await redis.sIsMember("user:1:tags", "premium");
    
    // SREM - Remove member
    await redis.sRem("user:1:tags", "active");
}
```

## Step 5: Using Redis in Express Routes

### Caching Database Queries

```javascript
// GET /users/:id: Cache user data to avoid database queries.
app.get("/users/:id", async (req, res, next) => {
    try {
        const { id } = req.params;
        const cacheKey = `user:${id}`;
        
        // Check cache: Look for cached data first.
        const cached = await req.redis.get(cacheKey);
        if (cached) {
            return res.json(JSON.parse(cached));  // Return cached data
        }
        
        // Cache miss: Fetch from database.
        const user = await db.getUser(id);
        
        // Store in cache: Cache for 1 hour.
        await req.redis.setEx(cacheKey, 3600, JSON.stringify(user));
        
        res.json(user);
    } catch (error) {
        next(error);
    }
});
```

### Session Storage

```javascript
// Session middleware: Store session data in Redis.
async function sessionMiddleware(req, res, next) {
    const sessionId = req.cookies.sessionId;
    
    if (sessionId) {
        // Get session: Retrieve session data from Redis.
        const sessionData = await req.redis.get(`session:${sessionId}`);
        if (sessionData) {
            req.session = JSON.parse(sessionData);
        }
    }
    
    // Create new session if needed
    if (!req.session) {
        req.session = { id: generateSessionId() };
        await req.redis.setEx(
            `session:${req.session.id}`,
            3600,
            JSON.stringify(req.session)
        );
    }
    
    next();
}
```

## Best Practices  -- IMP

### 1. **Key Naming Conventions**

```javascript
// Good: Use consistent naming pattern.
const keys = {
    user: (id) => `user:${id}`,
    userProfile: (id) => `user:${id}:profile`,
    userOrders: (id) => `user:${id}:orders`,
    session: (id) => `session:${id}`,
};
```

### 2. **Error Handling**

```javascript
// Wrap Redis operations: Handle connection errors gracefully.
async function safeRedisGet(key) {
    try {
        return await redisClient.get(key);
    } catch (error) {
        console.error('Redis error:', error);
        return null;  // Fallback to database
    }
}
```

### 3. **Connection Pooling**

```javascript
// Production: Use connection pool for better performance.
const redisClient = redis.createClient({
    url: process.env.REDIS_URL,
    socket: {
        reconnectStrategy: (retries) => {
            if (retries > 10) {
                return new Error('Too many reconnection attempts');
            }
            return Math.min(retries * 50, 500);  // Exponential backoff
        }
    }
});
```

## Summary

Redis integration in Express.js requires: Installing redis package, creating connection on app startup, using basic operations (SET, GET, hashes, lists), caching database queries, storing sessions, and handling errors gracefully. Redis provides fast, temporary storage that complements your database for caching, sessions, and real-time features.

---

## 🎯 Interview Questions: Redis Integration

### Q1: Why is Redis a good fit as a cache for Express.js backends? Focus on concepts, not commands.

**Answer:**

Redis is designed as an **in-memory data store**, which means:

- **Latency:** Operations complete in microseconds–milliseconds (much faster than disk-based DB).  
- **Data Structures:** Strings, hashes, lists, sets, sorted sets, streams → map naturally to many backend needs (sessions, queues, rankings).  
- **Persistence Options:** Can act as pure cache (no persistence) or as a durable store (AOF/RDB) depending on requirements.  
- **Single-threaded Event Loop:** Simple concurrency model, high throughput with proper sharding/cluster.

Conceptually, Redis sits **between** your app and primary DB:

```
Client → Express API → Redis (cache) → (maybe) DB
```

You use it where:
- Reads are frequent, writes less frequent.  
- Data can be recomputed or re-fetched if lost.  
- Low latency matters (rate limiting, feature flags, sessions).

### Q2: What are the main concerns when using Redis in production?

**Answer:**

- **Data Loss Tolerance:**  
  - As a cache, data loss is acceptable (can rebuild).  
  - As a store, configure persistence and backups.
- **Eviction Policies:**  
  - When memory is full, Redis must evict keys (LRU, LFU, random).  
  - You must design key TTLs and patterns so eviction doesn’t break correctness.
- **Security:**  
  - Never expose Redis directly to the internet.  
  - Use AUTH, TLS, network-level restrictions (VPC, security groups).
- **Operational Concerns:**  
  - Monitoring memory, keyspace size, eviction stats, latency.  
  - Planning for clustering and sharding as data grows.

---

## Summary

These interview questions cover:
- ✅ Conceptual reasons to use Redis
- ✅ Production concerns (eviction, security, durability)

They help you talk about Redis as a system component, not just a key-value store.

