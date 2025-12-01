# Cache Invalidation Patterns

## 1. The Hardest Problem in CS

"There are only two hard things in Computer Science: cache invalidation and naming things." - Phil Karlton.

If you cache data, it **will** become stale.
You need a strategy to delete it when the source of truth (DB) changes.

---

## 2. Pattern 1: TTL (Time To Live) - The "Lazy" Approach

Set an expiration time.
`@Cacheable(value = "users", key = "#id", cacheManager = "tenMinuteCacheManager")`

- **Pros**: Simple. Self-healing (eventually consistent).
- **Cons**: Data is stale for up to 10 minutes.

**Use Case**: Public profiles, Product catalogs (things that don't change often).

---

## 3. Pattern 2: Explicit Eviction (`@CacheEvict`)

Delete the cache entry immediately when you update the DB.

```java
@Service
public class UserService {

    @Cacheable(value = "users", key = "#user.id")
    public User getUser(Long id) { ... }

    @Transactional
    @CacheEvict(value = "users", key = "#user.id")
    public void updateUser(User user) {
        repository.save(user);
    }
}
```

- **Pros**: Strong consistency.
- **Cons**: Easy to miss. If you update the DB via a direct SQL query or another service, the cache remains stale.

---

## 4. Pattern 3: Event-Based Invalidation (Debezium)

For microservices, Service A cannot clear Service B's cache.
Use **CDC (Change Data Capture)**.

1.  Service A updates DB.
2.  Debezium reads DB Transaction Log.
3.  Debezium publishes `UserUpdated` event to Kafka.
4.  Service B listens to Kafka and calls `cacheManager.getCache("users").evict(id)`.

---

## 5. Pattern 4: Soft Expiry (Probabilistic)

Keep the data in Redis *forever*, but store a `refresh_at` timestamp inside the value.

1.  Read value.
2.  If `now > refresh_at`:
    - Return the stale value immediately (Fast!).
    - Trigger a background thread to refresh the cache.

**Use Case**: High-traffic dashboards where you cannot afford a cache miss latency.
