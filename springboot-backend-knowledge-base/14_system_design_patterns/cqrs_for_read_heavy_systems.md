# CQRS for Read-Heavy Systems

## 1. Command Query Responsibility Segregation

**CRUD**: Same model for Read and Write.
`User` entity has `password` field. You don't want to return `password` on Read. You add `@JsonIgnore`. It gets messy.

**CQRS**: Split them.
- **Command Model**: Optimized for Write (Normalized, Validation logic).
- **Query Model**: Optimized for Read (Denormalized, DTOs).

---

## 2. Simple CQRS (Same DB)

Just use different classes.

**Command (Write)**
```java
public void createUser(CreateUserCommand cmd) {
    User user = new User(cmd.username, cmd.password); // Domain Entity
    repository.save(user);
}
```

**Query (Read)**
```java
public UserSummaryDto getUser(Long id) {
    // Native Query directly to DTO (Skip Hibernate overhead)
    return jdbcTemplate.queryForObject(
        "SELECT id, username FROM users WHERE id = ?", 
        new UserSummaryRowMapper(), id
    );
}
```

---

## 3. Advanced CQRS (Separate DBs)

- **Write DB**: PostgreSQL (Relational, ACID).
- **Read DB**: Elasticsearch (Search, Fast).

**Sync**:
1.  Write to Postgres.
2.  Publish Event `UserCreated`.
3.  Listener updates Elasticsearch.

**Pros**: Infinite Read Scaling.
**Cons**: Eventual Consistency. Complexity.
