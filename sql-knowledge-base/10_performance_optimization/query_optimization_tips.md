# Query Optimization Tips: Practical Performance Improvements

Practical tips and techniques to optimize SQL queries for better performance. These are actionable strategies you can apply immediately.

## 1. Use Indexes Effectively

### Index Frequently Queried Columns

```sql
-- ✅ Good: Index on WHERE clause columns
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- Query uses index
SELECT * FROM users WHERE email = 'user@example.com';
SELECT * FROM orders WHERE user_id = 1 AND status = 'completed';
```

### Composite Indexes for Multiple Columns

```sql
-- ✅ Good: Composite index for multi-column queries
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at);

-- Query uses composite index
SELECT * FROM orders
WHERE user_id = 1 AND created_at >= '2024-01-01';
```

### Covering Indexes

```sql
-- ✅ Good: Index includes all needed columns
CREATE INDEX idx_products_covering ON products(category_id, price)
INCLUDE (name, stock_quantity);

-- Query uses index only (no table access)
SELECT category_id, price, name, stock_quantity
FROM products
WHERE category_id = 1 AND price BETWEEN 50 AND 100;
```

## 2. Write Efficient WHERE Clauses

### Filter Early

```sql
-- ✅ Good: Filter before JOIN
SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.status = 'completed'  -- Filter early
  AND o.created_at >= '2024-01-01';

-- ❌ Less efficient: Filter after JOIN
SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.status = 'completed';
-- More rows joined before filtering
```

### Use Indexed Columns

```sql
-- ✅ Good: Use indexed column in WHERE
SELECT * FROM users WHERE email = 'user@example.com';
-- Uses index on email

-- ❌ Less efficient: Function on indexed column
SELECT * FROM users WHERE LOWER(email) = 'user@example.com';
-- Can't use index (function prevents index usage)
```

### Avoid Functions on Columns

```sql
-- ❌ Bad: Function prevents index usage
SELECT * FROM orders
WHERE DATE(created_at) = '2024-01-01';

-- ✅ Good: Range query uses index
SELECT * FROM orders
WHERE created_at >= '2024-01-01' 
  AND created_at < '2024-01-02';
```

## 3. Optimize JOINs

### Join Order Matters

```sql
-- ✅ Good: Join smaller table first
SELECT *
FROM (SELECT * FROM orders WHERE status = 'completed') o
JOIN users u ON o.user_id = u.id;
-- Filter orders first (smaller result set)

-- ❌ Less efficient: Join large table first
SELECT *
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.status = 'completed';
```

### Use Appropriate Join Types

```sql
-- ✅ Good: INNER JOIN when both sides required
SELECT u.name, o.total
FROM users u
INNER JOIN orders o ON u.id = o.user_id;

-- ⚠️ Less efficient: LEFT JOIN when INNER JOIN works
SELECT u.name, o.total
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.id IS NOT NULL;  -- Effectively INNER JOIN
```

### Index Join Columns

```sql
-- ✅ Good: Index foreign keys
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- JOIN uses index
SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id;
```

## 4. Limit Result Sets

### Use LIMIT

```sql
-- ✅ Good: Limit results
SELECT * FROM products
WHERE category_id = 1
ORDER BY created_at DESC
LIMIT 20;

-- ❌ Less efficient: Return all rows
SELECT * FROM products
WHERE category_id = 1
ORDER BY created_at DESC;
-- May return thousands of rows
```

### Pagination

```sql
-- ✅ Good: Cursor-based pagination
SELECT * FROM orders
WHERE id > :cursor
ORDER BY id
LIMIT 20;

-- ❌ Less efficient: Offset-based pagination
SELECT * FROM orders
ORDER BY id
LIMIT 20 OFFSET 1000;
-- Must skip 1000 rows
```

## 5. Avoid SELECT *

### Select Only Needed Columns

```sql
-- ✅ Good: Select only needed columns
SELECT id, name, email
FROM users
WHERE id = 1;

-- ❌ Less efficient: Select all columns
SELECT *
FROM users
WHERE id = 1;
-- Transfers unnecessary data
```

### Benefits

- Less data transferred
- Better index usage (covering indexes)
- Faster query execution

## 6. Use EXISTS Instead of COUNT

### EXISTS is Faster

```sql
-- ✅ Good: EXISTS stops at first match
SELECT *
FROM users u
WHERE EXISTS (
    SELECT 1 FROM orders o
    WHERE o.user_id = u.id
);

-- ❌ Less efficient: COUNT scans all rows
SELECT *
FROM users u
WHERE (
    SELECT COUNT(*) FROM orders o
    WHERE o.user_id = u.id
) > 0;
```

## 7. Optimize Subqueries

### Use JOINs When Possible

```sql
-- ✅ Good: JOIN is often faster
SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id;

-- ❌ Less efficient: Correlated subquery
SELECT 
    name,
    (SELECT total FROM orders WHERE user_id = users.id LIMIT 1) AS total
FROM users;
```

### Avoid Correlated Subqueries

```sql
-- ❌ Bad: Correlated subquery (slow)
SELECT 
    id,
    name,
    (SELECT COUNT(*) FROM orders WHERE user_id = users.id) AS order_count
FROM users;

-- ✅ Good: JOIN with GROUP BY
SELECT 
    u.id,
    u.name,
    COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;
```

## 8. Use Appropriate Data Types

### Right-Sized Types

```sql
-- ✅ Good: Appropriate data types
CREATE TABLE users (
    id INTEGER,  -- Not BIGINT if not needed
    email VARCHAR(255),  -- Not TEXT if max length known
    age SMALLINT  -- Not INTEGER if values small
);

-- ❌ Less efficient: Over-sized types
CREATE TABLE users (
    id BIGINT,  -- Unnecessary if IDs < 2 billion
    email TEXT,  -- Unnecessary if emails < 255 chars
    age INTEGER  -- Unnecessary if ages < 32767
);
```

## 9. Batch Operations

### Batch Inserts

```sql
-- ✅ Good: Batch insert
INSERT INTO orders (user_id, total)
VALUES 
    (1, 99.99),
    (2, 149.99),
    (3, 79.99);
-- Single transaction

-- ❌ Less efficient: Multiple inserts
INSERT INTO orders (user_id, total) VALUES (1, 99.99);
INSERT INTO orders (user_id, total) VALUES (2, 149.99);
INSERT INTO orders (user_id, total) VALUES (3, 79.99);
-- Multiple transactions
```

### Batch Updates

```sql
-- ✅ Good: Single UPDATE with CASE
UPDATE products
SET price = CASE
    WHEN id = 1 THEN 99.99
    WHEN id = 2 THEN 149.99
    WHEN id = 3 THEN 79.99
END
WHERE id IN (1, 2, 3);

-- ❌ Less efficient: Multiple UPDATEs
UPDATE products SET price = 99.99 WHERE id = 1;
UPDATE products SET price = 149.99 WHERE id = 2;
UPDATE products SET price = 79.99 WHERE id = 3;
```

## 10. Use EXPLAIN ANALYZE

### Analyze Query Plans

```sql
-- See execution plan
EXPLAIN ANALYZE
SELECT * FROM users WHERE email = 'user@example.com';

-- Look for:
-- - Sequential scans (bad)
-- - Index scans (good)
-- - High costs
-- - Large row estimates
```

### Identify Bottlenecks

```sql
-- Find slow operations
EXPLAIN ANALYZE
SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.status = 'completed';

-- Check:
-- - Which operation is slow?
-- - Are indexes being used?
-- - Are row estimates accurate?
```

## 11. Update Statistics

### Keep Statistics Current

```sql
-- Update table statistics
ANALYZE users;
ANALYZE orders;

-- Helps query planner make better decisions
```

### Auto-Analyze

```sql
-- PostgreSQL: Enable auto-analyze
ALTER TABLE users SET (autovacuum_analyze_scale_factor = 0.1);

-- Statistics updated automatically
```

## 12. Avoid N+1 Queries

### Use JOINs

```sql
-- ✅ Good: Single query with JOIN
SELECT 
    u.id,
    u.name,
    o.id AS order_id,
    o.total
FROM users u
LEFT JOIN orders o ON u.id = o.user_id;

-- ❌ Bad: N+1 queries (application level)
-- SELECT * FROM users;
-- For each user: SELECT * FROM orders WHERE user_id = ?
```

## 13. Use CTEs for Complex Queries

### Improve Readability

```sql
-- ✅ Good: CTE for complex query
WITH user_stats AS (
    SELECT 
        user_id,
        COUNT(*) AS order_count,
        SUM(total) AS total_spent
    FROM orders
    GROUP BY user_id
)
SELECT 
    u.name,
    us.order_count,
    us.total_spent
FROM users u
JOIN user_stats us ON u.id = us.user_id;
```

## 14. Cache Expensive Queries

### Materialized Views

```sql
-- ✅ Good: Materialized view for expensive query
CREATE MATERIALIZED VIEW product_sales_summary AS
SELECT 
    product_id,
    COUNT(*) AS sales_count,
    SUM(quantity * price) AS revenue
FROM order_items
GROUP BY product_id;

-- Fast queries
SELECT * FROM product_sales_summary
ORDER BY revenue DESC;

-- Refresh periodically
REFRESH MATERIALIZED VIEW product_sales_summary;
```

## 15. Monitor and Profile

### Track Slow Queries

```sql
-- Enable query logging
SET log_min_duration_statement = 1000;  -- Log queries > 1 second

-- Review slow queries
SELECT * FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
```

## Summary

**Query Optimization Tips:**

1. **Indexes**: Index frequently queried columns
2. **WHERE Clauses**: Filter early, use indexed columns
3. **JOINs**: Optimize join order, index join columns
4. **LIMIT**: Limit result sets
5. **SELECT**: Avoid SELECT *
6. **EXISTS**: Use instead of COUNT when possible
7. **Subqueries**: Use JOINs when possible
8. **Data Types**: Use appropriate sizes
9. **Batch Operations**: Group operations
10. **EXPLAIN ANALYZE**: Analyze query plans
11. **Statistics**: Keep statistics updated
12. **N+1 Queries**: Use JOINs instead
13. **CTEs**: For complex queries
14. **Caching**: Materialized views for expensive queries
15. **Monitoring**: Track slow queries

**Key Takeaway:**
Query optimization requires understanding how databases execute queries. Use indexes effectively, write efficient WHERE clauses, optimize JOINs, and always analyze query plans. Small changes can have significant performance impacts.

**Quick Wins:**
- Add indexes on WHERE/JOIN columns
- Use LIMIT for large result sets
- Avoid SELECT *
- Use EXISTS instead of COUNT
- Analyze query plans regularly

**Next Steps:**
- Learn [EXPLAIN ANALYZE](explain_analyze.md) for query analysis
- Study [Indexes](../08_indexes/what_is_index.md) for indexing strategies
- Master [Performance Monitoring](../14_observability/) for tracking

