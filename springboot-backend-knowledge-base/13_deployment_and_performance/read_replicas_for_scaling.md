# Read Replicas for Scaling

## 1. The Bottleneck

Your app is 90% Reads, 10% Writes.
A single Postgres instance can handle writes, but is choked by reads.

**Solution**: Add Read Replicas.
- **Primary**: Handles Writes (and critical reads).
- **Replicas**: Handle Reads.

---

## 2. Spring Boot Configuration

Spring doesn't support this out of the box with a simple property.
You need a **RoutingDataSource**.

```java
public class RoutingDataSource extends AbstractRoutingDataSource {
    @Override
    protected Object determineCurrentLookupKey() {
        return TransactionSynchronizationManager.isCurrentTransactionReadOnly() ? "REPLICA" : "PRIMARY";
    }
}
```

---

## 3. Setup

```java
@Bean
public DataSource dataSource() {
    Map<Object, Object> targetDataSources = new HashMap<>();
    targetDataSources.put("PRIMARY", primaryDataSource());
    targetDataSources.put("REPLICA", replicaDataSource());

    RoutingDataSource routingDataSource = new RoutingDataSource();
    routingDataSource.setTargetDataSources(targetDataSources);
    routingDataSource.setDefaultTargetDataSource(primaryDataSource());
    return routingDataSource;
}
```

---

## 4. Usage

```java
@Service
public class UserService {

    @Transactional(readOnly = true) // Goes to REPLICA
    public User getUser(Long id) {
        return repository.findById(id);
    }

    @Transactional // Goes to PRIMARY
    public void createUser(User user) {
        repository.save(user);
    }
}
```

**Warning**: Replication Lag. The replica might be 100ms behind. If you create a user and immediately read it, it might not be there yet.
