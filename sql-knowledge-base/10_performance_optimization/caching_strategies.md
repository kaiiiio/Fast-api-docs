# Caching Strategies: Improving Database Performance

Caching reduces database load by storing frequently accessed data in memory. This guide covers caching strategies for SQL databases.

## What is Caching?

**Caching** stores frequently accessed data in fast storage (memory) to avoid repeated database queries. It significantly improves response times.

### Cache Levels

```
1. Application Cache (Redis, Memcached)
2. Query Cache (Database-level)
3. Connection Pool Cache
4. OS Cache (File system cache)
```

## Cache-Aside Pattern

### How It Works

```sql
-- Pattern:
-- 1. Check cache first
-- 2. If cache miss, query database
-- 3. Store result in cache
-- 4. Return result
```

### Implementation

```python
# Python example
def get_user(user_id):
    # 1. Check cache
    user = cache.get(f"user:{user_id}")
    if user:
        return user
    
    # 2. Cache miss: Query database
    user = db.query("SELECT * FROM users WHERE id = ?", user_id)
    
    # 3. Store in cache
    cache.set(f"user:{user_id}", user, ttl=3600)
    
    # 4. Return
    return user
```

## Write-Through Cache

### How It Works

```sql
-- Pattern:
-- 1. Write to database
-- 2. Update cache immediately
-- 3. Cache always in sync with database
```

### Implementation

```python
def update_user(user_id, data):
    # 1. Update database
    db.execute("UPDATE users SET ... WHERE id = ?", user_id, data)
    
    # 2. Update cache
    user = db.query("SELECT * FROM users WHERE id = ?", user_id)
    cache.set(f"user:{user_id}", user, ttl=3600)
```

## Write-Back Cache

### How It Works

```sql
-- Pattern:
-- 1. Write to cache first
-- 2. Write to database asynchronously
-- 3. Faster writes, eventual consistency
```

### Implementation

```python
def update_user(user_id, data):
    # 1. Update cache immediately
    user = {...}  # Updated user data
    cache.set(f"user:{user_id}", user, ttl=3600)
    
    # 2. Queue database write
    queue.enqueue(update_database, user_id, data)
```

## Cache Invalidation

### Time-Based (TTL)

```python
# Cache expires after time
cache.set("user:1", user_data, ttl=3600)  # 1 hour

# Automatic invalidation after TTL
```

### Event-Based

```python
# Invalidate on data change
def update_user(user_id, data):
    db.execute("UPDATE users SET ... WHERE id = ?", user_id, data)
    
    # Invalidate cache
    cache.delete(f"user:{user_id}")
    
    # Or update cache
    user = db.query("SELECT * FROM users WHERE id = ?", user_id)
    cache.set(f"user:{user_id}", user, ttl=3600)
```

### Tag-Based

```python
# Invalidate by tags
cache.set("user:1", user_data, tags=["user", "profile"])

# Invalidate all user caches
cache.delete_by_tag("user")
```

## Database Query Cache

### MySQL Query Cache

```sql
-- Enable query cache
SET GLOBAL query_cache_size = 67108864;  -- 64MB
SET GLOBAL query_cache_type = ON;

-- Cached queries
SELECT * FROM users WHERE id = 1;  -- Cached
SELECT * FROM users WHERE id = 1;  -- Served from cache
```

### PostgreSQL: No Built-in Query Cache

```sql
-- PostgreSQL doesn't have query cache
-- Use application-level caching (Redis, Memcached)
```

## Caching Query Results

### Cache Expensive Queries

```python
# Expensive aggregation query
def get_user_stats(user_id):
    cache_key = f"user_stats:{user_id}"
    
    # Check cache
    stats = cache.get(cache_key)
    if stats:
        return stats
    
    # Expensive query
    stats = db.query("""
        SELECT 
            COUNT(*) AS order_count,
            SUM(total) AS total_spent,
            AVG(total) AS avg_order
        FROM orders
        WHERE user_id = ?
    """, user_id)
    
    # Cache for 1 hour
    cache.set(cache_key, stats, ttl=3600)
    return stats
```

## Real-World Examples

### Example 1: User Profile Cache

```python
# Cache user profiles
def get_user_profile(user_id):
    cache_key = f"user_profile:{user_id}"
    
    profile = cache.get(cache_key)
    if profile:
        return profile
    
    profile = db.query("""
        SELECT u.*, COUNT(o.id) AS order_count
        FROM users u
        LEFT JOIN orders o ON u.id = o.user_id
        WHERE u.id = ?
        GROUP BY u.id
    """, user_id)
    
    cache.set(cache_key, profile, ttl=1800)  # 30 minutes
    return profile

# Invalidate on update
def update_user_profile(user_id, data):
    db.execute("UPDATE users SET ... WHERE id = ?", user_id, data)
    cache.delete(f"user_profile:{user_id}")
```

### Example 2: Product Catalog Cache

```python
# Cache product listings
def get_products(category_id, page=1):
    cache_key = f"products:{category_id}:{page}"
    
    products = cache.get(cache_key)
    if products:
        return products
    
    products = db.query("""
        SELECT * FROM products
        WHERE category_id = ?
        ORDER BY created_at DESC
        LIMIT 20 OFFSET ?
    """, category_id, (page - 1) * 20)
    
    cache.set(cache_key, products, ttl=3600)  # 1 hour
    return products

# Invalidate on product update
def update_product(product_id, data):
    db.execute("UPDATE products SET ... WHERE id = ?", product_id, data)
    # Invalidate all product caches for this category
    cache.delete_pattern(f"products:*")
```

## Cache Warming

### Preload Frequently Accessed Data

```python
# Warm cache on startup
def warm_cache():
    # Preload top users
    top_users = db.query("""
        SELECT * FROM users
        ORDER BY created_at DESC
        LIMIT 100
    """)
    
    for user in top_users:
        cache.set(f"user:{user.id}", user, ttl=3600)
```

## Best Practices

1. **Cache Hot Data**: Frequently accessed data
2. **Set TTL**: Expire stale data
3. **Invalidate on Updates**: Keep cache fresh
4. **Monitor Hit Rate**: Track cache effectiveness
5. **Handle Cache Misses**: Graceful degradation

## Common Mistakes

### ❌ Cache Everything

```python
# ❌ Bad: Cache everything
def get_data(key):
    data = cache.get(key)
    if not data:
        data = db.query("SELECT * FROM table WHERE key = ?", key)
        cache.set(key, data, ttl=3600)  # Caching rarely accessed data
    return data

# ✅ Good: Cache only hot data
def get_hot_data(key):
    if is_hot_key(key):  # Check if frequently accessed
        data = cache.get(key)
        if not data:
            data = db.query("SELECT * FROM table WHERE key = ?", key)
            cache.set(key, data, ttl=3600)
        return data
    else:
        return db.query("SELECT * FROM table WHERE key = ?", key)
```

### ❌ No Invalidation

```python
# ❌ Bad: Never invalidate
cache.set("user:1", user_data)  # No TTL, never expires

# ✅ Good: Invalidate on update
def update_user(user_id, data):
    db.execute("UPDATE users SET ... WHERE id = ?", user_id, data)
    cache.delete(f"user:{user_id}")  # Invalidate
```

## Summary

**Caching Strategies:**

1. **Cache-Aside**: Check cache, query DB on miss
2. **Write-Through**: Write to DB and cache
3. **Write-Back**: Write to cache, async to DB
4. **Invalidation**: TTL, event-based, tag-based
5. **Warming**: Preload frequently accessed data

**Key Takeaway:**
Caching significantly improves database performance by storing frequently accessed data in memory. Use cache-aside for reads, write-through for consistency, and write-back for performance. Implement proper cache invalidation (TTL, events, tags) to keep data fresh. Cache hot data, monitor hit rates, and handle cache misses gracefully.

**Cache Patterns:**
- Cache-Aside: Most common, simple
- Write-Through: Strong consistency
- Write-Back: Best performance, eventual consistency

**Next Steps:**
- Learn [Materialized Views](materialized_views.md) for database-level caching
- Study [Redis Integration](../../fastapi-backend-knowledge-base/07_caching_layer/redis_integration.md) for application caching
- Master [Performance Optimization](../10_performance_optimization/) for tuning

