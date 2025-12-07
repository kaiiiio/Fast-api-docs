# Redis Integration: Complete Guide for FastAPI

Redis is an in-memory data store that acts as a cache, session store, and message broker. This guide teaches you Redis from basics to advanced patterns in FastAPI applications.

## Understanding Redis

**What is Redis?** In-memory database (extremely fast), key-value store (like a Python dict, but persistent), supports multiple data structures (strings, lists, sets, hashes, etc.).

**Why use Redis in FastAPI?** Caching (store frequently accessed data, avoid database queries), sessions (store user session data), rate limiting (track API request counts), real-time features (pub/sub for notifications), and task queues (background job queues).

**Think of Redis as:** Super-fast temporary storage, like your app's "memory" - things you need quickly, complementary to your database (not a replacement).

## Step 1: Installation and Basic Setup

### Installation

```bash
pip install redis aioredis
```

**Understanding the packages:**
- `redis` - Official Redis client (sync)
- `aioredis` - Async version (better for FastAPI)

### Basic Connection

```python
import aioredis
from typing import Optional

# Basic connection
redis_client: Optional[aioredis.Redis] = None

# init_redis: Creates async Redis connection for FastAPI.
async def init_redis():
    """Initialize Redis connection."""
    global redis_client
    redis_client = await aioredis.from_url(
        "redis://localhost:6379",  # Default Redis URL
        encoding="utf-8",  # Text encoding
        decode_responses=True  # Automatically decode bytes to strings
    )
    print("Redis connected!")

# close_redis: Cleanup connection on app shutdown.
async def close_redis():
    """Close Redis connection."""
    global redis_client
    if redis_client:
        await redis_client.close()
        print("Redis disconnected!")
```

**Understanding the connection:**
- `redis://localhost:6379` - Default Redis URL
- `encoding="utf-8"` - Text encoding
- `decode_responses=True` - Returns strings instead of bytes

### FastAPI Integration

```python
from fastapi import FastAPI
from contextlib import asynccontextmanager

# lifespan: Manages Redis connection lifecycle (startup/shutdown).
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage Redis connection lifecycle."""
    # Startup: Connect to Redis when app starts.
    await init_redis()
    yield  # App runs here
    # Shutdown: Close connection when app stops.
    await close_redis()

app = FastAPI(lifespan=lifespan)

# Dependency to get Redis client: Inject Redis into routes.
async def get_redis() -> aioredis.Redis:
    """Dependency to get Redis client."""
    return redis_client
```

## Step 2: Basic Operations (Strings)

Strings are the simplest Redis data type. Let's start here:

### Set and Get

```python
async def basic_operations():
    """Basic Redis string operations."""
    redis = await get_redis()
    
    # SET: Store a value (key-value pair).
    await redis.set("user:1:name", "John Doe")
    
    # GET: Retrieve a value by key.
    name = await redis.get("user:1:name")
    print(name)  # "John Doe"
    
    # GET with default: Returns None if key doesn't exist.
    age = await redis.get("user:1:age") or "Unknown"
    
    # SET with expiration: TTL (Time To Live) in seconds.
    await redis.setex("session:abc123", 3600, "user_data")  # Expires in 1 hour
    
    # Check if key exists: Returns 1 if exists, 0 if not.
    exists = await redis.exists("user:1:name")
    print(exists)  # 1 if exists, 0 if not
    
    # Delete a key: Removes key-value pair.
    await redis.delete("user:1:name")
```

**Understanding key naming:**
- `user:1:name` - Use colons to create namespace-like structure
- `session:abc123` - Helps organize keys
- Pattern: `object_type:id:field`

### Expiration (TTL)

```python
async def ttl_examples():
    """Understanding TTL (Time To Live)."""
    redis = await get_redis()
    
    # Set with expiration (seconds)
    await redis.setex("temp:data", 60, "some value")  # Expires in 60 seconds
    
    # Set expiration on existing key
    await redis.set("key", "value")
    await redis.expire("key", 300)  # Expires in 5 minutes
    
    # Check remaining TTL
    ttl = await redis.ttl("key")
    print(f"Key expires in {ttl} seconds")
    # -1 = no expiration
    # -2 = key doesn't exist
    
    # Remove expiration (make key permanent)
    await redis.persist("key")
```

## Step 3: Hash Operations (Perfect for Objects)

Hashes are like Python dictionaries. Perfect for storing objects:

```python
async def hash_operations():
    """Store and retrieve objects using hashes."""
    redis = await get_redis()
    
    # HSET - Set fields in a hash
    await redis.hset(
        "user:1",
        mapping={
            "email": "john@example.com",
            "name": "John Doe",
            "age": "30"
        }
    )
    
    # HGET - Get single field
    email = await redis.hget("user:1", "email")
    
    # HGETALL - Get all fields (returns dict)
    user_data = await redis.hgetall("user:1")
    print(user_data)
    # {"email": "john@example.com", "name": "John Doe", "age": "30"}
    
    # HMSET - Set multiple fields at once
    await redis.hset("user:1", mapping={"status": "active", "last_login": "2024-01-15"})
    
    # HDEL - Delete fields
    await redis.hdel("user:1", "age")
    
    # HINCRBY - Increment numeric field
    await redis.hincrby("user:1", "login_count", 1)
    
    # HEXISTS - Check if field exists
    exists = await redis.hexists("user:1", "email")
```

**When to use hashes:**
- Storing user profiles
- Product information
- Configuration objects
- Any structured data

## Step 4: Lists and Sets

### Lists (Ordered Collections)

```python
async def list_operations():
    """Work with Redis lists."""
    redis = await get_redis()
    
    # LPUSH - Add to left (beginning)
    await redis.lpush("recent_searches:user1", "laptop", "mouse", "keyboard")
    # List: ["keyboard", "mouse", "laptop"]
    
    # RPUSH - Add to right (end)
    await redis.rpush("recent_searches:user1", "monitor")
    # List: ["keyboard", "mouse", "laptop", "monitor"]
    
    # LRANGE - Get range of items
    items = await redis.lrange("recent_searches:user1", 0, 2)
    # Returns first 3 items: ["keyboard", "mouse", "laptop"]
    
    # LLEN - Get list length
    length = await redis.llen("recent_searches:user1")
    
    # LPOP - Remove and return leftmost item
    first = await redis.lpop("recent_searches:user1")
    
    # LTRIM - Keep only range, remove rest
    await redis.ltrim("recent_searches:user1", 0, 9)  # Keep only first 10
```

**Use cases:**
- Recent searches
- Activity feeds
- Queues (FIFO or LIFO)
- Bounded lists

### Sets (Unique Collections)

```python
async def set_operations():
    """Work with Redis sets (unique values)."""
    redis = await get_redis()
    
    # SADD - Add members to set
    await redis.sadd("user:1:tags", "vip", "premium", "gaming")
    
    # SMEMBERS - Get all members
    tags = await redis.smembers("user:1:tags")
    # Returns set: {"vip", "premium", "gaming"}
    
    # SISMEMBER - Check if member exists
    is_vip = await redis.sismember("user:1:tags", "vip")  # True
    
    # SREM - Remove members
    await redis.srem("user:1:tags", "gaming")
    
    # SCARD - Get set size
    count = await redis.scard("user:1:tags")
    
    # Set operations
    await redis.sadd("set1", "a", "b", "c")
    await redis.sadd("set2", "b", "c", "d")
    
    # SINTER - Intersection (common elements)
    common = await redis.sinter("set1", "set2")  # {"b", "c"}
    
    # SUNION - Union (all unique elements)
    all_items = await redis.sunion("set1", "set2")  # {"a", "b", "c", "d"}
```

**Use cases:**
- Tags
- User permissions
- Unique tracking (IP addresses, user IDs)
- Set operations (intersections, unions)

## Step 5: Caching Patterns

This is Redis's primary use case. Let's learn effective caching:

### Pattern 1: Cache-Aside (Lazy Loading)

**Most common pattern:**

```python
async def get_user_cached(user_id: int, db: AsyncSession):
    """
    Get user with caching (cache-aside pattern).
    
    Flow:
    1. Check cache
    2. If found, return cached data
    3. If not, get from database
    4. Store in cache for next time
    """
    redis = await get_redis()
    
    # Step 1: Try cache
    cache_key = f"user:{user_id}"
    cached_user = await redis.hgetall(cache_key)
    
    if cached_user:
        print("Cache hit!")
        return cached_user
    
    # Step 2: Cache miss - get from database
    print("Cache miss - querying database")
    user = await db.get(User, user_id)
    
    if not user:
        return None
    
    # Step 3: Store in cache
    await redis.hset(
        cache_key,
        mapping={
            "id": str(user.id),
            "email": user.email,
            "name": user.full_name
        }
    )
    await redis.expire(cache_key, 3600)  # Cache for 1 hour
    
    return {
        "id": str(user.id),
        "email": user.email,
        "name": user.full_name
    }
```

**Understanding the pattern:**
- Application manages cache
- Cache is optional (if Redis down, app still works)
- Most flexible pattern

### Pattern 2: Write-Through

**Update cache when writing to database:**

```python
async def update_user_with_cache(
    user_id: int,
    updates: dict,
    db: AsyncSession
):
    """
    Update user and cache simultaneously.
    
    Flow:
    1. Update database
    2. Update cache immediately
    """
    redis = await get_redis()
    cache_key = f"user:{user_id}"
    
    # Update database
    user = await db.get(User, user_id)
    for key, value in updates.items():
        setattr(user, key, value)
    await db.commit()
    
    # Update cache
    await redis.hset(cache_key, mapping={
        "id": str(user.id),
        "email": user.email,
        "name": user.full_name
    })
    await redis.expire(cache_key, 3600)
    
    return user
```

### Pattern 3: Cache Invalidation

**Remove stale cache when data changes:**

```python
async def invalidate_user_cache(user_id: int):
    """Remove user from cache."""
    redis = await get_redis()
    cache_key = f"user:{user_id}"
    await redis.delete(cache_key)

async def update_user_invalidate_cache(
    user_id: int,
    updates: dict,
    db: AsyncSession
):
    """Update user and invalidate cache."""
    # Update database
    user = await db.get(User, user_id)
    for key, value in updates.items():
        setattr(user, key, value)
    await db.commit()
    
    # Invalidate cache (will be reloaded on next read)
    await invalidate_user_cache(user_id)
    
    return user
```

## Step 6: Rate Limiting with Redis

Redis is perfect for rate limiting:

```python
from datetime import timedelta

async def rate_limit(key: str, limit: int, window: int) -> bool:
    """
    Check if rate limit exceeded.
    
    Args:
        key: Unique identifier (user_id, IP, etc.)
        limit: Maximum requests allowed
        window: Time window in seconds
    
    Returns:
        True if within limit, False if exceeded
    """
    redis = await get_redis()
    
    # Use sliding window log
    now = await redis.time()
    current_time = now[0]  # Unix timestamp
    
    # Clean old entries
    window_start = current_time - window
    await redis.zremrangebyscore(key, 0, window_start)
    
    # Count current requests
    count = await redis.zcard(key)
    
    if count < limit:
        # Add current request
        await redis.zadd(key, {str(current_time): current_time})
        await redis.expire(key, window)
        return True  # Within limit
    
    return False  # Rate limit exceeded

# Usage in FastAPI
@app.get("/api/data")
async def get_data(
    request: Request,
    redis: aioredis.Redis = Depends(get_redis)
):
    client_ip = request.client.host
    key = f"rate_limit:{client_ip}"
    
    if not await rate_limit(key, limit=100, window=60):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Try again later."
        )
    
    return {"data": "..."}
```

## Step 7: Session Storage

Store user sessions in Redis:

```python
async def create_session(user_id: int) -> str:
    """Create a new session."""
    import secrets
    
    redis = await get_redis()
    
    # Generate session token
    session_token = secrets.token_urlsafe(32)
    session_key = f"session:{session_token}"
    
    # Store session data
    await redis.hset(
        session_key,
        mapping={
            "user_id": str(user_id),
            "created_at": datetime.utcnow().isoformat()
        }
    )
    await redis.expire(session_key, 86400)  # 24 hours
    
    return session_token

async def get_session(session_token: str) -> Optional[dict]:
    """Get session data."""
    redis = await get_redis()
    session_key = f"session:{session_token}"
    
    session_data = await redis.hgetall(session_key)
    return session_data if session_data else None

async def delete_session(session_token: str):
    """Delete session (logout)."""
    redis = await get_redis()
    await redis.delete(f"session:{session_token}")
```

## Step 8: Production Configuration

```python
from pydantic_settings import BaseSettings

class RedisSettings(BaseSettings):
    """Redis configuration."""
    
    redis_url: str = "redis://localhost:6379"
    redis_password: str = None
    redis_db: int = 0
    redis_max_connections: int = 50
    
    @property
    def redis_connection_string(self) -> str:
        """Build Redis connection string."""
        if self.redis_password:
            # redis://password@host:port/db
            return f"redis://:{self.redis_password}@{self.redis_url.split('://')[1]}/{self.redis_db}"
        return f"{self.redis_url}/{self.redis_db}"
    
    class Config:
        env_file = ".env"

settings = RedisSettings()

# Create connection pool
redis_pool = aioredis.ConnectionPool.from_url(
    settings.redis_connection_string,
    max_connections=settings.redis_max_connections,
    decode_responses=True
)

redis_client = aioredis.Redis(connection_pool=redis_pool)
```

## Summary

Redis provides:
- ✅ Ultra-fast caching
- ✅ Session storage
- ✅ Rate limiting
- ✅ Pub/sub messaging
- ✅ Task queues

Key patterns:
- Cache-aside for flexible caching
- Write-through for consistency
- Hash for objects
- Sets for unique collections
- Expiration for TTL management

Redis is an essential tool for high-performance FastAPI applications!

---

## 🎯 Interview Questions: FastAPI

### Q1: Explain Redis integration in FastAPI, including connection setup, caching patterns (cache-aside, write-through, write-back), data structures (strings, hashes, lists, sets), and use cases like rate limiting and session storage. Provide detailed examples.

**Answer:**

**Redis Overview:**

Redis is an in-memory data structure store used as a database, cache, and message broker. In FastAPI, Redis is primarily used for caching, session storage, rate limiting, and pub/sub messaging.

**Why Redis:**

**Without Redis (Database Only):**
```python
# ❌ Bad: Every request hits database
@app.get("/users/{user_id}")
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)  # Database query every time
    return user
# Problem: Slow, database overload
```

**With Redis (Caching):**
```python
# ✅ Good: Cache frequently accessed data
@app.get("/users/{user_id}")
async def get_user(user_id: int, redis: Redis = Depends(get_redis)):
    # Check cache first
    cached = await redis.get(f"user:{user_id}")
    if cached:
        return json.loads(cached)  # Fast cache hit
    
    # Cache miss: query database
    user = await db.get(User, user_id)
    # Store in cache
    await redis.setex(
        f"user:{user_id}",
        3600,  # TTL: 1 hour
        json.dumps(user.dict())
    )
    return user
# Benefit: Fast cache hits, reduced database load
```

**Redis Connection Setup:**

**Async Redis Client:**
```python
import aioredis
from fastapi import Depends

# Create connection pool
redis_pool = aioredis.ConnectionPool.from_url(
    "redis://localhost:6379",
    max_connections=50,
    decode_responses=True  # Auto-decode bytes to strings
)

redis_client = aioredis.Redis(connection_pool=redis_pool)

# Dependency injection
async def get_redis() -> aioredis.Redis:
    return redis_client
```

**Caching Patterns:**

**1. Cache-Aside (Lazy Loading):**
```python
async def get_user_cached(user_id: int, db: AsyncSession):
    """
    Cache-aside pattern: Application manages cache.
    
    Flow:
    1. Check cache
    2. If found, return cached data
    3. If not, get from database
    4. Store in cache for next time
    """
    redis = await get_redis()
    cache_key = f"user:{user_id}"
    
    # Step 1: Try cache
    cached_user = await redis.get(cache_key)
    if cached_user:
        return json.loads(cached_user)  # Cache hit
    
    # Step 2: Cache miss - get from database
    user = await db.get(User, user_id)
    if not user:
        return None
    
    # Step 3: Store in cache
    await redis.setex(
        cache_key,
        3600,  # TTL: 1 hour
        json.dumps(user.dict())
    )
    
    return user.dict()
```

**2. Write-Through:**
```python
async def update_user_with_cache(
    user_id: int,
    updates: dict,
    db: AsyncSession
):
    """
    Write-through pattern: Update cache when writing to database.
    
    Flow:
    1. Update database
    2. Update cache immediately
    """
    redis = await get_redis()
    cache_key = f"user:{user_id}"
    
    # Update database
    user = await db.get(User, user_id)
    for key, value in updates.items():
        setattr(user, key, value)
    await db.commit()
    
    # Update cache
    await redis.setex(
        cache_key,
        3600,
        json.dumps(user.dict())
    )
    
    return user
```

**3. Write-Back (Write-Behind):**
```python
async def update_user_write_back(
    user_id: int,
    updates: dict,
    db: AsyncSession
):
    """
    Write-back pattern: Write to cache first, database later.
    
    Flow:
    1. Update cache immediately
    2. Queue database update (async)
    3. Database updated in background
    """
    redis = await get_redis()
    cache_key = f"user:{user_id}"
    
    # Get current data
    user = await db.get(User, user_id)
    for key, value in updates.items():
        setattr(user, key, value)
    
    # Update cache immediately
    await redis.setex(
        cache_key,
        3600,
        json.dumps(user.dict())
    )
    
    # Queue database update (async)
    await background_update_db(user_id, updates)
    
    return user
```

**4. Cache Invalidation:**
```python
async def invalidate_user_cache(user_id: int):
    """Remove user from cache."""
    redis = await get_redis()
    await redis.delete(f"user:{user_id}")

async def update_user_invalidate(
    user_id: int,
    updates: dict,
    db: AsyncSession
):
    """Update user and invalidate cache."""
    # Update database
    user = await db.get(User, user_id)
    for key, value in updates.items():
        setattr(user, key, value)
    await db.commit()
    
    # Invalidate cache (will be reloaded on next read)
    await invalidate_user_cache(user_id)
    
    return user
```

**Redis Data Structures:**

**1. Strings (Simple Key-Value):**
```python
# Set value
await redis.set("key", "value")
await redis.setex("key", 3600, "value")  # With TTL

# Get value
value = await redis.get("key")

# Increment/decrement
await redis.incr("counter")
await redis.decr("counter")
```

**2. Hashes (Objects):**
```python
# Set hash fields
await redis.hset(
    "user:1",
    mapping={
        "id": "1",
        "email": "user@example.com",
        "name": "John Doe"
    }
)

# Get hash field
email = await redis.hget("user:1", "email")

# Get all fields
user = await redis.hgetall("user:1")

# Increment hash field
await redis.hincrby("user:1", "login_count", 1)
```

**3. Lists (Ordered Collections):**
```python
# Add to list
await redis.lpush("recent_searches:user1", "laptop")
await redis.rpush("recent_searches:user1", "mouse")

# Get range
items = await redis.lrange("recent_searches:user1", 0, 9)  # First 10

# Remove items
first = await redis.lpop("recent_searches:user1")

# Trim list
await redis.ltrim("recent_searches:user1", 0, 9)  # Keep only first 10
```

**4. Sets (Unique Collections):**
```python
# Add to set
await redis.sadd("user:1:tags", "vip", "premium")

# Check membership
is_vip = await redis.sismember("user:1:tags", "vip")

# Get all members
tags = await redis.smembers("user:1:tags")

# Set operations
common = await redis.sinter("set1", "set2")  # Intersection
all_items = await redis.sunion("set1", "set2")  # Union
```

**Rate Limiting:**
```python
async def rate_limit(key: str, limit: int, window: int) -> bool:
    """
    Rate limiting using Redis.
    
    Args:
        key: Unique identifier (user_id, IP, etc.)
        limit: Maximum requests allowed
        window: Time window in seconds
    
    Returns:
        True if within limit, False if exceeded
    """
    redis = await get_redis()
    
    # Sliding window log
    now = await redis.time()
    current_time = now[0]
    
    # Clean old entries
    window_start = current_time - window
    await redis.zremrangebyscore(key, 0, window_start)
    
    # Count current requests
    count = await redis.zcard(key)
    
    if count < limit:
        # Add current request
        await redis.zadd(key, {str(current_time): current_time})
        await redis.expire(key, window)
        return True
    
    return False

@app.get("/api/data")
async def get_data(
    request: Request,
    redis: aioredis.Redis = Depends(get_redis)
):
    client_ip = request.client.host
    key = f"rate_limit:{client_ip}"
    
    if not await rate_limit(key, limit=100, window=60):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded"
        )
    
    return {"data": "..."}
```

**Session Storage:**
```python
async def create_session(user_id: int) -> str:
    """Create a new session."""
    import secrets
    
    redis = await get_redis()
    session_token = secrets.token_urlsafe(32)
    session_key = f"session:{session_token}"
    
    # Store session data
    await redis.hset(
        session_key,
        mapping={
            "user_id": str(user_id),
            "created_at": datetime.utcnow().isoformat()
        }
    )
    await redis.expire(session_key, 86400)  # 24 hours
    
    return session_token

async def get_session(session_token: str) -> Optional[dict]:
    """Get session data."""
    redis = await get_redis()
    session_key = f"session:{session_token}"
    return await redis.hgetall(session_key)
```

**System Design Consideration**: Redis provides:
1. **Performance**: Ultra-fast in-memory access
2. **Caching**: Reduce database load
3. **Rate Limiting**: Protect APIs
4. **Session Storage**: Scalable sessions
5. **Pub/Sub**: Real-time messaging

Redis is essential for high-performance FastAPI applications. Understanding caching patterns, data structures, rate limiting, and session storage is crucial for building scalable systems. Always use appropriate TTLs, handle cache misses gracefully, and monitor Redis memory usage.

---

### Q2: Explain Redis data structures (strings, hashes, lists, sets, sorted sets), when to use each, and advanced patterns like pub/sub, distributed locks, and cache invalidation strategies. Provide examples showing real-world use cases.

**Answer:**

**Redis Data Structures:**

**1. Strings:**
```python
# Use for: Simple values, counters, flags
await redis.set("user:1:status", "active")
await redis.setex("session:token", 3600, "user_id")
await redis.incr("page:views")
await redis.decr("inventory:product:1")
```

**2. Hashes:**
```python
# Use for: Objects, user profiles, configurations
await redis.hset("user:1", mapping={
    "email": "user@example.com",
    "name": "John",
    "age": "30"
})
user = await redis.hgetall("user:1")
```

**3. Lists:**
```python
# Use for: Queues, activity feeds, recent items
await redis.lpush("activity:user:1", "action1", "action2")
recent = await redis.lrange("activity:user:1", 0, 9)
```

**4. Sets:**
```python
# Use for: Tags, permissions, unique tracking
await redis.sadd("user:1:tags", "vip", "premium")
tags = await redis.smembers("user:1:tags")
```

**5. Sorted Sets:**
```python
# Use for: Leaderboards, rankings, time-series
await redis.zadd("leaderboard", {"user:1": 100, "user:2": 200})
top_users = await redis.zrevrange("leaderboard", 0, 9, withscores=True)
```

**Pub/Sub (Publish-Subscribe):**
```python
# Publisher
async def publish_event(channel: str, message: dict):
    redis = await get_redis()
    await redis.publish(channel, json.dumps(message))

# Subscriber
async def subscribe_events(channel: str):
    redis = await get_redis()
    pubsub = redis.pubsub()
    await pubsub.subscribe(channel)
    
    async for message in pubsub.listen():
        if message["type"] == "message":
            data = json.loads(message["data"])
            process_event(data)
```

**Distributed Locks:**
```python
async def acquire_lock(key: str, timeout: int = 10) -> bool:
    """Acquire distributed lock."""
    redis = await get_redis()
    lock_key = f"lock:{key}"
    
    # Try to acquire lock
    acquired = await redis.set(
        lock_key,
        "locked",
        ex=timeout,
        nx=True  # Only set if not exists
    )
    
    return acquired is not None

async def release_lock(key: str):
    """Release distributed lock."""
    redis = await get_redis()
    await redis.delete(f"lock:{key}")
```

**Cache Invalidation Strategies:**

**1. TTL-Based:**
```python
# Automatic expiration
await redis.setex("user:1", 3600, user_data)  # Expires in 1 hour
```

**2. Event-Based:**
```python
# Invalidate on update
async def update_user(user_id: int, updates: dict):
    # Update database
    user = await update_db(user_id, updates)
    
    # Invalidate cache
    await redis.delete(f"user:{user_id}")
    
    # Publish invalidation event
    await publish_event("cache:invalidate", {"key": f"user:{user_id}"})
```

**3. Tag-Based:**
```python
# Invalidate by tags
async def invalidate_by_tag(tag: str):
    redis = await get_redis()
    pattern = f"tag:{tag}:*"
    
    # Find all keys with tag
    keys = []
    async for key in redis.scan_iter(match=pattern):
        keys.append(key)
    
    # Delete all
    if keys:
        await redis.delete(*keys)
```

**System Design Consideration**: Redis data structures enable:
1. **Flexibility**: Choose right structure for use case
2. **Performance**: Optimized operations
3. **Scalability**: Distributed patterns
4. **Reliability**: Distributed locks, pub/sub

Understanding Redis data structures, pub/sub, distributed locks, and cache invalidation is essential for building scalable, distributed systems. Always choose the right data structure for your use case and implement proper cache invalidation strategies.


