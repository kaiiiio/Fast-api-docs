# Avoiding N+1 Queries: Optimizing Relationship Queries

N+1 query problem occurs when you fetch a list of records and then make additional queries for each record's related data. It's a common performance issue that can be easily fixed.

## What is the N+1 Query Problem?

**N+1 queries** means executing 1 query to get N records, then N additional queries to get related data for each record.

### Example: The Problem

```sql
-- Query 1: Get all users (1 query)
SELECT * FROM users;
-- Returns: 100 users

-- Then for each user, query orders (100 queries)
SELECT * FROM orders WHERE user_id = 1;
SELECT * FROM orders WHERE user_id = 2;
SELECT * FROM orders WHERE user_id = 3;
-- ... (100 more queries)

-- Total: 1 + 100 = 101 queries (N+1 problem!)
```

## Solution 1: JOIN (Single Query)

### Using JOIN to Fetch Related Data

```sql
-- ✅ Good: Single query with JOIN
SELECT 
    u.id AS user_id,
    u.name AS user_name,
    o.id AS order_id,
    o.total AS order_total
FROM users u
LEFT JOIN orders o ON u.id = o.user_id;

-- Returns all users with their orders in one query
-- Total: 1 query (solves N+1!)
```

### Handling Multiple Relationships

```sql
-- Users with orders and order items
SELECT 
    u.id AS user_id,
    u.name AS user_name,
    o.id AS order_id,
    o.total AS order_total,
    oi.id AS item_id,
    oi.quantity AS item_quantity
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
LEFT JOIN order_items oi ON o.id = oi.order_id;

-- Single query gets all related data
```

## Solution 2: IN Clause (Two Queries)

### Fetch Related Data with IN

```sql
-- ✅ Good: Two queries instead of N+1
-- Query 1: Get users
SELECT * FROM users;
-- Returns: 100 users

-- Query 2: Get all orders for those users
SELECT * FROM orders 
WHERE user_id IN (1, 2, 3, ..., 100);
-- Returns: All orders for all users

-- Total: 2 queries (much better than 101!)
```

### Application-Level Combination

```python
# Python example
users = db.query("SELECT * FROM users")
user_ids = [user.id for user in users]

orders = db.query(
    "SELECT * FROM orders WHERE user_id IN %s",
    (tuple(user_ids),)
)

# Combine in application
for user in users:
    user.orders = [o for o in orders if o.user_id == user.id]
```

## Solution 3: Subquery (Single Query)

### Using Subquery

```sql
-- ✅ Good: Single query with subquery
SELECT 
    u.*,
    (
        SELECT COUNT(*)
        FROM orders o
        WHERE o.user_id = u.id
    ) AS order_count
FROM users u;

-- Gets users with order count in one query
```

### Correlated Subquery

```sql
-- Get users with latest order
SELECT 
    u.*,
    (
        SELECT o.total
        FROM orders o
        WHERE o.user_id = u.id
        ORDER BY o.created_at DESC
        LIMIT 1
    ) AS latest_order_total
FROM users u;
```

## Real-World Examples

### Example 1: Blog Posts with Comments

```sql
-- ❌ N+1 Problem
-- Query 1: Get posts
SELECT * FROM posts;

-- Query 2-N: Get comments for each post
SELECT * FROM comments WHERE post_id = 1;
SELECT * FROM comments WHERE post_id = 2;
-- ... (N queries)

-- ✅ Solution: JOIN
SELECT 
    p.id AS post_id,
    p.title AS post_title,
    c.id AS comment_id,
    c.content AS comment_content
FROM posts p
LEFT JOIN comments c ON p.id = c.post_id;
```

### Example 2: Products with Categories

```sql
-- ❌ N+1 Problem
SELECT * FROM products;
-- Then: SELECT * FROM categories WHERE id = ? (for each product)

-- ✅ Solution: JOIN
SELECT 
    p.id AS product_id,
    p.name AS product_name,
    c.id AS category_id,
    c.name AS category_name
FROM products p
LEFT JOIN categories c ON p.category_id = c.id;
```

### Example 3: Users with Roles

```sql
-- ❌ N+1 Problem (Many-to-Many)
SELECT * FROM users;
-- Then: SELECT * FROM user_roles WHERE user_id = ? (for each user)
-- Then: SELECT * FROM roles WHERE id = ? (for each role)

-- ✅ Solution: JOINs
SELECT 
    u.id AS user_id,
    u.name AS user_name,
    r.id AS role_id,
    r.name AS role_name
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id;
```

## ORM Patterns

### Django ORM

```python
# ❌ N+1 Problem
users = User.objects.all()
for user in users:
    print(user.orders.all())  # Query for each user

# ✅ Solution: select_related or prefetch_related
users = User.objects.prefetch_related('orders')
for user in users:
    print(user.orders.all())  # No additional queries
```

### SQLAlchemy

```python
# ❌ N+1 Problem
users = session.query(User).all()
for user in users:
    print(user.orders)  # Query for each user

# ✅ Solution: joinedload
from sqlalchemy.orm import joinedload

users = session.query(User).options(joinedload(User.orders)).all()
for user in users:
    print(user.orders)  # No additional queries
```

### Sequelize

```javascript
// ❌ N+1 Problem
const users = await User.findAll();
for (const user of users) {
    const orders = await user.getOrders();  // Query for each user
}

// ✅ Solution: include
const users = await User.findAll({
    include: [{ model: Order }]
});
// All orders loaded in one query
```

## Performance Impact

### N+1 Queries

```
100 users × 1 query each = 100 queries
+ 1 initial query = 101 total queries
Time: 101 × 10ms = 1,010ms (1 second)
```

### Optimized (JOIN)

```
1 query with JOIN = 1 query
Time: 1 × 50ms = 50ms
Improvement: 20x faster!
```

## Best Practices

1. **Always JOIN**: Use JOINs for related data
2. **Use IN**: When JOINs aren't suitable
3. **ORM Eager Loading**: Use ORM features (prefetch_related, include)
4. **Monitor Queries**: Log queries to detect N+1
5. **Test Performance**: Measure before/after optimization

## Detecting N+1 Queries

### Query Logging

```sql
-- Enable query logging
SET log_statement = 'all';
SET log_duration = on;

-- Check logs for repeated patterns
```

### Application Monitoring

```python
# Count queries
query_count = 0

def log_query(query):
    global query_count
    query_count += 1
    print(f"Query {query_count}: {query}")

# After operation, check query_count
# If count >> expected, likely N+1 problem
```

## Common Mistakes

### ❌ Fetching in Loop

```python
# ❌ Bad: N+1 queries
users = get_all_users()
for user in users:
    orders = get_orders_for_user(user.id)  # Query in loop!

# ✅ Good: Single query
users = get_all_users()
all_orders = get_all_orders_for_users([u.id for u in users])
# Combine in application
```

### ❌ Missing JOIN

```sql
-- ❌ Bad: Separate queries
SELECT * FROM users;
SELECT * FROM orders WHERE user_id = 1;
SELECT * FROM orders WHERE user_id = 2;

-- ✅ Good: JOIN
SELECT u.*, o.*
FROM users u
LEFT JOIN orders o ON u.id = o.user_id;
```

## Summary

**Avoiding N+1 Queries:**

1. **Problem**: 1 query + N queries for related data
2. **Solution 1**: JOIN (single query)
3. **Solution 2**: IN clause (2 queries)
4. **Solution 3**: Subquery (single query)
5. **Impact**: Massive performance improvement

**Key Takeaway:**
N+1 queries are a common performance problem where you fetch N records and then make N additional queries for related data. Solve it by using JOINs, IN clauses, or subqueries to fetch all related data in fewer queries. Use ORM eager loading features. Always monitor queries to detect N+1 problems.

**Solutions:**
- JOIN: Single query with all data
- IN: Two queries (fetch list, then fetch related)
- Subquery: Single query with aggregated data

**Next Steps:**
- Learn [JOINs](../04_joins/inner_join.md) for relationship queries
- Study [Query Optimization Tips](query_optimization_tips.md) for techniques
- Master [Performance Optimization](../10_performance_optimization/) for tuning

