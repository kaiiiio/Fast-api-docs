# Caching Query Results (Hibernate + Redis)

## 1. The N+1 Problem and Caching

Caching isn't just for `findById`. It's for complex queries.
`SELECT * FROM orders WHERE user_id = 1 AND status = 'PAID'`

### Caching List Results

```java
@Cacheable(value = "user_orders", key = "#userId")
public List<Order> getPaidOrders(Long userId) {
    return orderRepository.findByUserIdAndStatus(userId, OrderStatus.PAID);
}
```

**The Danger**: If you add a *new* order for this user, the cache is now stale. The user won't see their new order until the TTL expires.

### The Fix: `@CacheEvict`

```java
@Transactional
@CacheEvict(value = "user_orders", key = "#order.userId")
public Order createOrder(Order order) {
    return orderRepository.save(order);
}
```
This deletes the *entire list* from the cache. The next read will fetch the updated list from the DB.

---

## 2. Hibernate Second Level Cache (L2)

Hibernate has its own caching layer.
- **L1 Cache**: Session level (Transaction scope). On by default.
- **L2 Cache**: SessionFactory level (App scope). Off by default.

You can plug Redis into Hibernate L2.

### Configuration
```properties
spring.jpa.properties.hibernate.cache.use_second_level_cache=true
spring.jpa.properties.hibernate.cache.region.factory_class=org.redisson.hibernate.RedissonRegionFactory
```

### Usage
Annotate your Entities.

```java
@Entity
@Cacheable
@org.hibernate.annotations.Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
public class Product {
    ...
}
```

**When to use L2?**
- For "Reference Data" (Countries, Currencies, Roles) that rarely changes.
- **Avoid** for rapidly changing transactional data (Orders, Payments). The overhead of invalidation is too high.
