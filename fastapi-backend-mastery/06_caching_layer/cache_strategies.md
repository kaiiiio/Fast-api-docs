# Cache Strategies: Complete Guide

Caching is one of the most effective ways to improve application performance. This guide teaches you different caching strategies, when to use each, and how to implement them in FastAPI.

## Understanding Caching

**What is caching?**
Storing frequently accessed data in fast storage (memory) to avoid slow operations (database queries, API calls, computations).

**The goal:**
Serve data faster by avoiding expensive operations.

**Real-world analogy:**
- Your computer's cache: Stores recently used files in RAM (fast) instead of reading from disk (slow)
- Web browser cache: Stores images locally so they don't need to be downloaded again
- Application cache: Stores database query results so you don't query the database every time

## Cache-Aside Pattern (Lazy Loading)

**Most common pattern.** Application manages cache.

### How It Works

```
Request → Check Cache → Cache Hit? → Yes → Return Cached Data
                          ↓ No
                    Query Database → Store in Cache → Return Data
```

**Characteristics:**
- Application controls cache
- Cache is optional (if Redis down, app still works)
- Data might be stale until cache expires

### Implementation

```python
from functools import wraps
import json
import hashlib

def cache_key(*args, **kwargs):
    """Generate cache key from function arguments."""
    key_data = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True)
    return hashlib.md5(key_data.encode()).hexdigest()

async def get_user_cached(user_id: int, redis: aioredis.Redis, db: AsyncSession):
    """
    Get user with cache-aside pattern.
    
    Flow:
    1. Check Redis cache
    2. If found (cache hit), return cached data
    3. If not found (cache miss), query database
    4. Store result in cache
    5. Return data
    """
    cache_key = f"user:{user_id}"
    
    # Step 1: Try cache
    cached_data = await redis.get(cache_key)
    if cached_data:
        print("✅ Cache HIT - returning cached data")
        return json.loads(cached_data)
    
    # Step 2: Cache miss - query database
    print("❌ Cache MISS - querying database")
    user = await db.get(User, user_id)
    
    if not user:
        return None
    
    # Step 3: Store in cache
    user_data = {
        "id": user.id,
        "email": user.email,
        "name": user.full_name
    }
    await redis.setex(
        cache_key,
        3600,  # TTL: 1 hour
        json.dumps(user_data)
    )
    
    return user_data
```

**When to use:**
- ✅ Flexible cache management
- ✅ Cache is optional
- ✅ Data can be slightly stale
- ✅ Most common use case

## Write-Through Pattern

**Update cache when writing to database.**

### How It Works

```
Write Request → Update Database → Update Cache → Return
```

**Characteristics:**
- Cache always consistent with database
- Writes are slower (two writes)
- Reads are fast (cache hit)

### Implementation

```python
async def update_user_write_through(
    user_id: int,
    updates: dict,
    redis: aioredis.Redis,
    db: AsyncSession
):
    """
    Update user with write-through cache.
    
    Updates both database and cache simultaneously.
    """
    # Step 1: Update database
    user = await db.get(User, user_id)
    if not user:
        raise ValueError("User not found")
    
    for key, value in updates.items():
        setattr(user, key, value)
    await db.commit()
    
    # Step 2: Update cache immediately
    cache_key = f"user:{user_id}"
    user_data = {
        "id": user.id,
        "email": user.email,
        "name": user.full_name
    }
    await redis.setex(
        cache_key,
        3600,
        json.dumps(user_data)
    )
    
    return user
```

**When to use:**
- ✅ Cache consistency critical
- ✅ Data changes infrequently
- ✅ Worth the write performance cost

## Write-Behind Pattern (Write-Back)

**Write to cache first, database later.**

### How It Works

```
Write Request → Write to Cache → Return Immediately
                        ↓ (async)
                  Write to Database (background)
```

**Characteristics:**
- Writes are very fast (cache only)
- Risk of data loss if cache fails
- Database eventually consistent

### Implementation

```python
from fastapi import BackgroundTasks

async def create_user_write_behind(
    user_data: dict,
    redis: aioredis.Redis,
    background_tasks: BackgroundTasks
):
    """
    Create user with write-behind cache.
    
    Writes to cache immediately, database in background.
    """
    # Generate ID
    user_id = await redis.incr("user_id_counter")
    
    user = {
        "id": user_id,
        **user_data
    }
    
    # Write to cache immediately
    cache_key = f"user:{user_id}"
    await redis.setex(
        cache_key,
        86400,  # 24 hours
        json.dumps(user)
    )
    
    # Queue database write for background
    background_tasks.add_task(
        persist_user_to_db,
        user_id,
        user_data
    )
    
    return user  # Return immediately
```

**When to use:**
- ✅ High write throughput needed
- ✅ Can tolerate eventual consistency
- ✅ Use with caution (data loss risk)

## Cache-Aside with TTL

**Most practical pattern with automatic expiration:**

```python
async def get_product_with_ttl(
    product_id: int,
    redis: aioredis.Redis,
    db: AsyncSession,
    ttl: int = 3600  # 1 hour default
):
    """Get product with TTL-based cache."""
    cache_key = f"product:{product_id}"
    
    # Try cache
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)
    
    # Cache miss
    product = await db.get(Product, product_id)
    if not product:
        return None
    
    product_data = {
        "id": product.id,
        "name": product.name,
        "price": float(product.price)
    }
    
    # Cache with TTL
    await redis.setex(cache_key, ttl, json.dumps(product_data))
    
    return product_data
```

## Refresh-Ahead Pattern

**Preemptively refresh cache before expiration.**

### How It Works

```
Cache Entry → Check TTL → If < 20% remaining → Refresh in Background
                                                      ↓
                                      Keep serving stale data while refreshing
```

**Benefits:**
- Users rarely see cache misses
- Always fresh data
- Background refresh doesn't block requests

### Implementation

```python
async def get_product_refresh_ahead(
    product_id: int,
    redis: aioredis.Redis,
    db: AsyncSession
):
    """Get product with refresh-ahead caching."""
    cache_key = f"product:{product_id}"
    
    # Get cached data and TTL
    cached_data = await redis.get(cache_key)
    ttl = await redis.ttl(cache_key)
    
    if cached_data:
        # If TTL < 20% remaining, refresh in background
        if ttl > 0 and ttl < 720:  # Less than 20% of 3600
            # Trigger background refresh (non-blocking)
            asyncio.create_task(refresh_product_cache(product_id, redis, db))
        
        return json.loads(cached_data)
    
    # Cache miss - normal flow
    return await load_and_cache_product(product_id, redis, db)
```

## Cache Invalidation Strategies

### Time-Based Expiration (TTL)

```python
# Simple - cache expires after time
await redis.setex("key", 3600, "value")  # Expires in 1 hour
```

### Event-Based Invalidation

```python
async def invalidate_on_update(product_id: int, redis: aioredis.Redis):
    """Invalidate cache when data changes."""
    cache_key = f"product:{product_id}"
    await redis.delete(cache_key)

async def update_product(
    product_id: int,
    updates: dict,
    redis: aioredis.Redis,
    db: AsyncSession
):
    """Update product and invalidate cache."""
    # Update database
    product = await db.get(Product, product_id)
    for key, value in updates.items():
        setattr(product, key, value)
    await db.commit()
    
    # Invalidate cache
    await invalidate_on_update(product_id, redis)
    
    return product
```

### Tag-Based Invalidation

```python
async def cache_with_tags(key: str, value: str, tags: List[str], ttl: int):
    """Cache data with tags for bulk invalidation."""
    redis = await get_redis()
    
    # Store data
    await redis.setex(key, ttl, value)
    
    # Store key in tag sets
    for tag in tags:
        await redis.sadd(f"tag:{tag}", key)
        await redis.expire(f"tag:{tag}", ttl)

async def invalidate_by_tag(tag: str):
    """Invalidate all keys with a specific tag."""
    redis = await get_redis()
    
    # Get all keys with this tag
    keys = await redis.smembers(f"tag:{tag}")
    
    # Delete all keys
    if keys:
        await redis.delete(*keys)
    
    # Delete tag set
    await redis.delete(f"tag:{tag}")

# Usage
await cache_with_tags(
    "product:1",
    json.dumps(product_data),
    tags=["products", "category:electronics"],
    ttl=3600
)

# Later: Invalidate all electronics
await invalidate_by_tag("category:electronics")
```

## Cache Warming

**Pre-populate cache before users request data:**

```python
async def warm_cache():
    """Pre-load frequently accessed data into cache."""
    redis = await get_redis()
    db = await get_db()
    
    # Warm up: Top 100 products
    top_products = await db.execute(
        select(Product)
        .order_by(Product.view_count.desc())
        .limit(100)
    )
    
    for product in top_products.scalars().all():
        cache_key = f"product:{product.id}"
        product_data = {
            "id": product.id,
            "name": product.name,
            "price": float(product.price)
        }
        await redis.setex(
            cache_key,
            3600,
            json.dumps(product_data)
        )
    
    print("Cache warmed up!")

# Run on application startup
@app.on_event("startup")
async def startup():
    await warm_cache()
```

## Choosing the Right Strategy

| Strategy | Read Speed | Write Speed | Consistency | Complexity |
|----------|-----------|-------------|-------------|------------|
| Cache-Aside | Fast | Normal | Stale possible | Low |
| Write-Through | Fast | Slower | Always fresh | Medium |
| Write-Behind | Fast | Very Fast | Eventually | High |
| Refresh-Ahead | Very Fast | Normal | Fresh | High |

**Guidelines:**
- **Cache-Aside**: Default choice, most flexible
- **Write-Through**: When consistency matters
- **Write-Behind**: High write throughput
- **Refresh-Ahead**: Critical data, high traffic

## Summary

Caching strategies provide:
- ✅ Faster response times
- ✅ Reduced database load
- ✅ Better scalability

Choose based on your consistency and performance requirements. Cache-aside is the safest starting point!

