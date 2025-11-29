# Caching Query Results: Practical Guide

Caching database query results is one of the highest-impact optimizations. This guide shows you how to cache queries effectively, when to cache, and how to handle cache invalidation.

## Understanding Query Caching

**The problem:**
Same queries execute repeatedly:
- User profile (accessed on every request)
- Product listings (same products shown to many users)
- Category lists (rarely changes)

**The solution:**
Cache query results. First request hits database, subsequent requests use cache.

## Step 1: Simple Query Caching

Let's cache a user lookup:

```python
import json
import hashlib
from functools import wraps

def cache_key_from_query(query_string: str, params: dict = None) -> str:
    """Generate cache key from query and parameters."""
    key_data = json.dumps({
        "query": query_string,
        "params": params or {}
    }, sort_keys=True)
    return hashlib.md5(key_data.encode()).hexdigest()

async def get_user_cached(
    user_id: int,
    redis: aioredis.Redis,
    db: AsyncSession
):
    """Get user with query result caching."""
    cache_key = f"query:user:{user_id}"
    
    # Try cache
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)
    
    # Cache miss - query database
    user = await db.get(User, user_id)
    if not user:
        return None
    
    # Serialize and cache
    user_data = {
        "id": user.id,
        "email": user.email,
        "name": user.full_name
    }
    
    await redis.setex(
        cache_key,
        3600,  # 1 hour
        json.dumps(user_data)
    )
    
    return user_data
```

## Step 2: Decorator for Query Caching

Create reusable caching decorator:

```python
from functools import wraps
import json
import inspect

def cache_query_result(ttl: int = 3600, key_prefix: str = "query"):
    """
    Decorator to cache function results.
    
    Usage:
        @cache_query_result(ttl=3600)
        async def get_user(user_id: int):
            return await db.get(User, user_id)
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get Redis from kwargs or function signature
            redis = kwargs.get('redis') or args[-1] if args else None
            
            # Generate cache key from function name and arguments
            key_parts = [key_prefix, func.__name__]
            key_parts.extend(str(arg) for arg in args)
            key_parts.extend(f"{k}:{v}" for k, v in sorted(kwargs.items()))
            cache_key = ":".join(key_parts)
            
            # Try cache
            cached = await redis.get(cache_key)
            if cached:
                return json.loads(cached)
            
            # Cache miss - execute function
            result = await func(*args, **kwargs)
            
            # Cache result
            if result is not None:
                await redis.setex(
                    cache_key,
                    ttl,
                    json.dumps(result, default=str)  # Handle datetime, etc.
                )
            
            return result
        
        return wrapper
    return decorator

# Usage
@cache_query_result(ttl=3600)
async def get_user_by_id(user_id: int, redis: aioredis.Redis, db: AsyncSession):
    user = await db.get(User, user_id)
    return {
        "id": user.id,
        "email": user.email
    } if user else None
```

## Step 3: Caching Complex Queries

Cache expensive aggregation queries:

```python
async def get_category_stats_cached(
    category_id: int,
    redis: aioredis.Redis,
    db: AsyncSession
):
    """Get category statistics with caching."""
    cache_key = f"stats:category:{category_id}"
    
    # Try cache
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)
    
    # Expensive query
    stmt = select(
        Category.name,
        func.count(Product.id).label('product_count'),
        func.avg(Product.price).label('avg_price')
    ).join(
        Product, Category.id == Product.category_id
    ).where(
        Category.id == category_id
    ).group_by(Category.id)
    
    result = await db.execute(stmt)
    stats = result.first()
    
    if stats:
        stats_dict = {
            "name": stats.name,
            "product_count": stats.product_count,
            "avg_price": float(stats.avg_price)
        }
        
        # Cache for 1 hour
        await redis.setex(cache_key, 3600, json.dumps(stats_dict))
        return stats_dict
    
    return None
```

## Step 4: Cache Invalidation on Updates

Invalidate cache when data changes:

```python
async def update_product_with_cache_invalidation(
    product_id: int,
    updates: dict,
    redis: aioredis.Redis,
    db: AsyncSession
):
    """Update product and invalidate related caches."""
    # Update database
    product = await db.get(Product, product_id)
    for key, value in updates.items():
        setattr(product, key, value)
    await db.commit()
    
    # Invalidate caches
    cache_keys = [
        f"query:product:{product_id}",
        f"stats:category:{product.category_id}",
        "query:products:all",  # Product list cache
    ]
    
    # Delete all related caches
    if cache_keys:
        await redis.delete(*cache_keys)
    
    return product
```

## Step 5: Tag-Based Cache Invalidation

Group related caches for bulk invalidation:

```python
async def cache_with_tags(
    key: str,
    value: dict,
    tags: List[str],
    ttl: int,
    redis: aioredis.Redis
):
    """Cache data with tags for bulk invalidation."""
    # Store data
    await redis.setex(key, ttl, json.dumps(value))
    
    # Store key in tag sets
    for tag in tags:
        await redis.sadd(f"cache_tag:{tag}", key)
        await redis.expire(f"cache_tag:{tag}", ttl)

async def invalidate_by_tag(tag: str, redis: aioredis.Redis):
    """Invalidate all caches with a specific tag."""
    # Get all keys with this tag
    keys = await redis.smembers(f"cache_tag:{tag}")
    
    if keys:
        await redis.delete(*keys)
        await redis.delete(f"cache_tag:{tag}")

# Usage
await cache_with_tags(
    "product:1",
    product_data,
    tags=["products", "category:electronics"],
    ttl=3600,
    redis=redis
)

# Later: Invalidate all electronics products
await invalidate_by_tag("category:electronics", redis)
```

## Step 6: Repository Pattern with Caching

Integrate caching into repositories:

```python
class CachedProductRepository:
    """Product repository with built-in caching."""
    
    def __init__(self, session: AsyncSession, redis: aioredis.Redis):
        self.session = session
        self.redis = redis
        self.base_repo = ProductRepository(session)
    
    async def get_by_id(self, product_id: int, use_cache: bool = True):
        """Get product with optional caching."""
        cache_key = f"product:{product_id}"
        
        if use_cache:
            cached = await self.redis.get(cache_key)
            if cached:
                return json.loads(cached)
        
        # Get from database
        product = await self.base_repo.get_by_id(product_id)
        
        if product and use_cache:
            product_data = {
                "id": product.id,
                "name": product.name,
                "price": float(product.price)
            }
            await self.redis.setex(cache_key, 3600, json.dumps(product_data))
        
        return product
    
    async def update(self, product_id: int, updates: dict):
        """Update product and invalidate cache."""
        product = await self.base_repo.update(product_id, updates)
        
        # Invalidate cache
        await self.redis.delete(f"product:{product_id}")
        await self.redis.delete("products:list")  # List cache
        
        return product
```

## Summary

Query caching provides:
- ✅ Faster response times
- ✅ Reduced database load
- ✅ Better scalability

Key strategies:
- Cache frequently accessed queries
- Use TTL for automatic expiration
- Invalidate on data changes
- Use tags for bulk invalidation

Cache wisely and your application will be much faster!

