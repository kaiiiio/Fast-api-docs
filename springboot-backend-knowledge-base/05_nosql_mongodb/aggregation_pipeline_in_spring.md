# Aggregation Pipeline in Spring Data MongoDB

## 1. Why Aggregation?

`repository.findAll()` is fine for simple lists.
But if you need:
- "Average salary per department"
- "Top 10 users by post count"
- "Join (Lookup) Users with Orders"

You need the **Aggregation Pipeline**.

---

## 2. The `MongoTemplate`

Spring Data Repositories are too simple for this. You need `MongoTemplate`.

```java
@Autowired
private MongoTemplate mongoTemplate;
```

---

## 3. Example: Sales Report

**Goal**: Calculate total sales per product category.

```java
import static org.springframework.data.mongodb.core.aggregation.Aggregation.*;

public List<CategorySales> getSalesByCategory() {
    
    Aggregation aggregation = newAggregation(
        // 1. Filter (Match) - Optional
        match(Criteria.where("status").is("COMPLETED")),
        
        // 2. Group by Category and Sum Amount
        group("category").sum("amount").as("totalSales"),
        
        // 3. Sort by Total Sales Descending
        sort(Sort.Direction.DESC, "totalSales"),
        
        // 4. Project (Map to Output Class)
        project("totalSales").and("category").previousOperation()
    );

    AggregationResults<CategorySales> results = 
        mongoTemplate.aggregate(aggregation, "orders", CategorySales.class);
        
    return results.getMappedResults();
}
```

---

## 4. The `$lookup` (Join)

MongoDB is NoSQL, but sometimes you need to join.

```java
Aggregation aggregation = newAggregation(
    // Join 'users' collection where local 'userId' == foreign '_id'
    lookup("users", "userId", "_id", "userDetails"),
    
    // Unwind the array (since lookup returns a list)
    unwind("userDetails")
);
```

**Warning**: `$lookup` is slow. Use it sparingly. If you use it everywhere, your data model is wrong.
