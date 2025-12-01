# Cache Strategies in Spring Boot

## 1. Read-Through (The Default)

This is what `@Cacheable` does.
1.  App asks Cache.
2.  Miss? App asks DB.
3.  App updates Cache.
4.  App returns data.

**Pros**: Simple. Lazy loading (only caches what is requested).
**Cons**: First request is slow (Cold Start). Data can get stale.

---

## 2. Write-Through

Update the cache *at the same time* you update the DB.

```java
@Service
public class UserProfileService {

    @Transactional
    @CachePut(value = "users", key = "#user.id") // Updates cache with return value
    public User updateUser(User user) {
        return repository.save(user);
    }
}
```

**Pros**: Data in cache is always fresh. Reads are fast.
**Cons**: Write latency is higher (writing to 2 places).

---

## 3. Cache Aside (Manual)

Sometimes Annotations aren't enough. You need fine-grained control.

```java
public Product getProduct(Long id) {
    String key = "product:" + id;
    
    // 1. Check Cache
    Product cached = (Product) redisTemplate.opsForValue().get(key);
    if (cached != null) return cached;
    
    // 2. Check DB
    Product dbProduct = repository.findById(id).orElse(null);
    
    // 3. Update Cache (with TTL)
    if (dbProduct != null) {
        redisTemplate.opsForValue().set(key, dbProduct, Duration.ofMinutes(5));
    }
    
    return dbProduct;
}
```

---

## 4. The Thundering Herd Problem

If 10,000 users request `product:123` at the exact moment it expires:
1.  10,000 requests hit the Cache.
2.  10,000 Misses.
3.  **10,000 requests hit the Database.**
4.  Database crashes.

### Solution: Mutex (Locking)
Only allow ONE thread to rebuild the cache.

```java
public Product getProductSafe(Long id) {
    Product cached = getFromCache(id);
    if (cached != null) return cached;
    
    synchronized(this) {
        // Double-check locking
        cached = getFromCache(id);
        if (cached != null) return cached;
        
        Product db = repository.findById(id);
        putInCache(id, db);
        return db;
    }
}
```
*Note: In a distributed system, use a Redis Lock (Redisson), not `synchronized`.*
