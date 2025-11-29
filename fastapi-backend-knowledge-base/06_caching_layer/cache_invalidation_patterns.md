# Cache Invalidation Patterns: Complete Guide

Cache invalidation is hard - knowing when to remove cached data. This guide teaches you effective cache invalidation patterns.

## The Cache Invalidation Problem

**Why it's hard:**
- When data changes, cache becomes stale
- Need to know what to invalidate
- Balance between freshness and performance

## Pattern 1: Time-Based Expiration (TTL)

**Simplest approach - cache expires after time:**

```python
# Cache with TTL
await redis.setex("user:1", 3600, json.dumps(user_data))  # Expires in 1 hour
```

**When to use:**
- Data changes infrequently
- Acceptable to serve stale data temporarily
- Simple to implement

**Trade-offs:**
- ⚠️ Stale data possible
- ✅ Simple implementation

## Pattern 2: Event-Based Invalidation

**Invalidate cache when data changes:**

```python
async def update_user(user_id: int, updates: dict):
    """Update user and invalidate cache."""
    # Update database
    user = await db.get(User, user_id)
    for key, value in updates.items():
        setattr(user, key, value)
    await db.commit()
    
    # Invalidate cache
    await redis.delete(f"user:{user_id}")
    
    return user
```

**When to use:**
- Need immediate consistency
- Can identify what to invalidate

## Pattern 3: Tag-Based Invalidation

**Group related caches with tags:**

```python
async def cache_with_tags(key: str, value: dict, tags: List[str], ttl: int):
    """Cache with tags for bulk invalidation."""
    await redis.setex(key, ttl, json.dumps(value))
    
    for tag in tags:
        await redis.sadd(f"cache_tag:{tag}", key)
        await redis.expire(f"cache_tag:{tag}", ttl)

async def invalidate_by_tag(tag: str):
    """Invalidate all caches with a tag."""
    keys = await redis.smembers(f"cache_tag:{tag}")
    if keys:
        await redis.delete(*keys)
        await redis.delete(f"cache_tag:{tag}")

# Usage
await cache_with_tags(
    "product:1",
    product_data,
    tags=["products", "category:electronics"],
    ttl=3600
)

# Later: Invalidate all electronics
await invalidate_by_tag("category:electronics")
```

**Benefits:**
- Bulk invalidation
- Logical grouping
- Efficient updates

## Pattern 4: Version-Based Invalidation

**Use version numbers for cache keys:**

```python
async def get_user_cached(user_id: int):
    """Get user with versioned cache."""
    # Get cache version
    version = await redis.get(f"user:{user_id}:version") or "1"
    
    # Try cache with version
    cached = await redis.get(f"user:{user_id}:v{version}")
    if cached:
        return json.loads(cached)
    
    # Cache miss - load from DB
    user = await db.get(User, user_id)
    user_data = {"id": user.id, "email": user.email}
    
    # Cache with current version
    await redis.setex(f"user:{user_id}:v{version}", 3600, json.dumps(user_data))
    
    return user_data

async def invalidate_user_cache(user_id: int):
    """Invalidate by bumping version."""
    current_version = await redis.get(f"user:{user_id}:version") or "1"
    new_version = str(int(current_version) + 1)
    await redis.set(f"user:{user_id}:version", new_version)
    # Old cache entries naturally expire or can be cleaned up
```

**Benefits:**
- Gradual invalidation
- No immediate delete needed
- Works well with CDNs

## Pattern 5: Write-Through Cache

**Update cache when writing:**

```python
async def update_user_write_through(user_id: int, updates: dict):
    """Update user and cache simultaneously."""
    # Update database
    user = await db.get(User, user_id)
    for key, value in updates.items():
        setattr(user, key, value)
    await db.commit()
    
    # Update cache immediately
    user_data = {"id": user.id, "email": user.email}
    await redis.setex(f"user:{user_id}", 3600, json.dumps(user_data))
    
    return user
```

**Benefits:**
- Cache always fresh
- No stale data

**Trade-offs:**
- Slower writes (two operations)
- More complex

## Pattern 6: Cache Warming After Invalidation

**Pre-populate cache after invalidation:**

```python
async def invalidate_and_warm(user_id: int):
    """Invalidate and immediately repopulate cache."""
    # Delete cache
    await redis.delete(f"user:{user_id}")
    
    # Warm cache
    user = await db.get(User, user_id)
    user_data = {"id": user.id, "email": user.email}
    await redis.setex(f"user:{user_id}", 3600, json.dumps(user_data))
```

**Benefits:**
- Next request is fast
- Avoids cache stampede

## Best Practices

1. **Combine patterns** - Use TTL + event-based invalidation
2. **Invalidate related caches** - When product changes, invalidate product list cache too
3. **Monitor cache hit rates** - Low hit rate = wrong invalidation strategy
4. **Use tags for complex relationships** - Easier bulk invalidation

## Summary

Cache invalidation patterns:
- ✅ TTL for simple cases
- ✅ Event-based for consistency
- ✅ Tags for bulk operations
- ✅ Version-based for gradual updates
- ✅ Write-through for freshness

Choose the pattern that matches your consistency requirements!

