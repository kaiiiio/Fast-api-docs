# Indexing in MongoDB

## 1. The Basics

Without an index, MongoDB performs a **Collection Scan** (checks every single document). This is O(N) and kills performance.

### Creating an Index in Spring
```java
@Document
@CompoundIndex(def = "{'lastName': 1, 'age': -1}", name = "lastname_age_idx")
public class User {

    @Id
    private String id;

    @Indexed(unique = true)
    private String email;

    @Indexed(direction = IndexDirection.DESCENDING)
    private int score;
}
```

- **`@Indexed`**: Single field index.
- **`@CompoundIndex`**: Multi-field index. Order matters! `lastName` first, then `age`.

---

## 2. Text Indexes (Search)

For simple search engines.

```java
@Document
public class Product {
    @TextIndexed(weight = 2)
    private String title;

    @TextIndexed
    private String description;
}
```

**Query**:
```java
TextQuery query = TextQuery.queryText(new TextCriteria().matching("coffee"));
List<Product> results = mongoTemplate.find(query, Product.class);
```

---

## 3. TTL Indexes (Auto-Delete)

Great for Sessions, OTPs, Logs.

```java
@Document
public class Session {
    
    @Indexed(expireAfterSeconds = 3600) // Delete after 1 hour
    private LocalDateTime createdAt;
}
```

---

## 4. Explain Plan

Always check if your query is using an index.

```javascript
db.users.find({ email: "alice@example.com" }).explain("executionStats")
```

Look for:
- **`IXSCAN`**: Good (Index Scan).
- **`COLLSCAN`**: Bad (Collection Scan).
