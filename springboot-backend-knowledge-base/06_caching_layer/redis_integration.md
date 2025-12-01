# Redis Integration in Spring Boot

## 1. Why Redis?

Spring Boot's default cache is a simple `ConcurrentHashMap`. This is fine for "Hello World", but bad for production:
1.  **Memory Leak**: It grows forever until your app crashes (OOM).
2.  **No Persistence**: If you restart the app, the cache is gone.
3.  **Not Distributed**: If you have 2 servers, Server A doesn't know about Server B's cache.

**Redis** solves all of this.

---

## 2. Setup

### Dependencies (`pom.xml`)
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

### Configuration (`application.properties`)
```properties
spring.data.redis.host=localhost
spring.data.redis.port=6379
# Optional: Password
# spring.data.redis.password=secret
```

---

## 3. The `RedisTemplate`

The low-level way to talk to Redis.

```java
@Configuration
public class RedisConfig {

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        
        // Use String serialization for keys (readable in redis-cli)
        template.setKeySerializer(new StringRedisSerializer());
        
        // Use JSON serialization for values
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        
        return template;
    }
}
```

### Usage
```java
@Service
public class UserService {

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    public void cacheUser(User user) {
        redisTemplate.opsForValue().set("user:" + user.getId(), user);
    }

    public User getCachedUser(Long id) {
        return (User) redisTemplate.opsForValue().get("user:" + id);
    }
}
```

---

## 4. The `@Cacheable` Abstraction (The Spring Way)

Don't write `redisTemplate` calls everywhere. Use Annotations.

### Enable Caching
```java
@SpringBootApplication
@EnableCaching
public class Application { ... }
```

### Annotate Methods
```java
@Service
public class ProductService {

    @Cacheable(value = "products", key = "#id")
    public Product getProduct(Long id) {
        simulateSlowService();
        return repository.findById(id).orElseThrow();
    }

    @CacheEvict(value = "products", key = "#id")
    public void updateProduct(Long id, Product product) {
        repository.save(product);
    }
}
```

**How it works**:
1.  Spring checks Redis for key `products::123`.
2.  If found, returns it (Method is NOT executed).
3.  If not found, executes method, saves result to Redis, returns it.

---

## 5. TTL (Time To Live)

By default, `@Cacheable` entries live forever. This is dangerous.
You can configure TTL globally or per cache.

```java
@Bean
public RedisCacheConfiguration cacheConfiguration() {
    return RedisCacheConfiguration.defaultCacheConfig()
        .entryTtl(Duration.ofMinutes(10)) // Default 10 mins
        .disableCachingNullValues()
        .serializeValuesWith(SerializationPair.fromSerializer(new GenericJackson2JsonRedisSerializer()));
}
```
