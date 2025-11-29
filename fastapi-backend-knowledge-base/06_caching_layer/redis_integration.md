# Redis Integration: Complete Guide for FastAPI

Redis is an in-memory data store that acts as a cache, session store, and message broker. This guide teaches you Redis from basics to advanced patterns in FastAPI applications.

## Understanding Redis

**What is Redis?**
- In-memory database (extremely fast)
- Key-value store (like a Python dict, but persistent)
- Supports multiple data structures (strings, lists, sets, hashes, etc.)

**Why use Redis in FastAPI?**
- **Caching**: Store frequently accessed data (avoid database queries)
- **Sessions**: Store user session data
- **Rate limiting**: Track API request counts
- **Real-time features**: Pub/sub for notifications
- **Task queues**: Background job queues

**Think of Redis as:**
- Super-fast temporary storage
- Like your app's "memory" - things you need quickly
- Complementary to your database (not a replacement)

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

async def init_redis():
    """Initialize Redis connection."""
    global redis_client
    redis_client = await aioredis.from_url(
        "redis://localhost:6379",
        encoding="utf-8",
        decode_responses=True  # Automatically decode bytes to strings
    )
    print("Redis connected!")

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

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage Redis connection lifecycle."""
    # Startup
    await init_redis()
    yield
    # Shutdown
    await close_redis()

app = FastAPI(lifespan=lifespan)

# Dependency to get Redis client
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
    
    # SET - Store a value
    await redis.set("user:1:name", "John Doe")
    
    # GET - Retrieve a value
    name = await redis.get("user:1:name")
    print(name)  # "John Doe"
    
    # GET with default if not found
    age = await redis.get("user:1:age") or "Unknown"
    
    # SET with expiration (TTL - Time To Live)
    await redis.setex("session:abc123", 3600, "user_data")  # Expires in 1 hour
    
    # Check if key exists
    exists = await redis.exists("user:1:name")
    print(exists)  # 1 if exists, 0 if not
    
    # Delete a key
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

