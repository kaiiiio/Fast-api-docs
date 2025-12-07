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

---

## 🎯 Interview Questions: SQL

### Q1: Explain the most important SQL query optimization techniques. Provide detailed examples showing how each technique improves performance, and explain when to use each approach. Include performance comparisons and best practices.

**Answer:**

**Query Optimization Overview:**

Query optimization is the process of improving SQL query performance through various techniques including proper indexing, efficient query structure, and database configuration. Understanding optimization techniques is crucial for building scalable, performant applications.

**1. Proper Indexing:**

**Technique:** Create indexes on columns used in WHERE, JOIN, and ORDER BY clauses.

**Example:**
```sql
-- ❌ Without index: Sequential scan
SELECT * FROM users WHERE email = 'user@example.com';
-- Execution: Scans all 1,000,000 rows
-- Time: ~5,000ms
-- Disk reads: ~10,000 pages

-- ✅ With index: Index scan
CREATE INDEX idx_users_email ON users(email);
SELECT * FROM users WHERE email = 'user@example.com';
-- Execution: Index lookup, then table access
-- Time: ~5ms
-- Disk reads: ~5 pages
-- 1000x faster!
```

**When to Index:**
- Columns in WHERE clauses
- Foreign keys (for JOINs)
- Columns in ORDER BY
- Frequently filtered columns

**2. Filter Early and Use Indexed Columns:**

**Technique:** Apply filters as early as possible, preferably on indexed columns.

**Example:**
```sql
-- ❌ Bad: Filter after join
SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2024-01-01' AND o.total > 100;
-- Joins 1,000,000 users with 10,000,000 orders first
-- Then filters: Very slow!

-- ✅ Good: Filter before join
SELECT u.name, o.total
FROM (SELECT * FROM users WHERE created_at > '2024-01-01') u
JOIN (SELECT * FROM orders WHERE total > 100) o ON u.id = o.user_id;
-- Filters first: 10,000 users, 1,000,000 orders
-- Then joins: Much faster!
```

**Performance Impact:**
- Reduces data processed in joins
- Enables index usage earlier
- Can reduce join result set by orders of magnitude

**3. Use LIMIT to Reduce Result Sets:**

**Technique:** Use LIMIT to restrict the number of rows returned.

**Example:**
```sql
-- ❌ Bad: Returns all rows
SELECT * FROM orders
WHERE user_id = 123
ORDER BY created_at DESC;
-- Returns: 10,000 rows
-- Time: ~500ms
-- Network: 10MB data transfer

-- ✅ Good: Limit result set
SELECT * FROM orders
WHERE user_id = 123
ORDER BY created_at DESC
LIMIT 20;
-- Returns: 20 rows
-- Time: ~5ms
-- Network: 20KB data transfer
-- 100x faster!
```

**Benefits:**
- Faster query execution
- Less network traffic
- Less memory usage
- Better user experience

**4. Avoid SELECT *:**

**Technique:** Select only the columns you need.

**Example:**
```sql
-- ❌ Bad: Select all columns
SELECT * FROM users WHERE id = 1;
-- Returns: 20 columns, 2KB per row
-- Network: 2KB transfer

-- ✅ Good: Select needed columns
SELECT id, name, email FROM users WHERE id = 1;
-- Returns: 3 columns, 100 bytes per row
-- Network: 100 bytes transfer
-- 20x less data!
```

**Additional Benefits:**
- Enables covering indexes (index-only scans)
- Reduces I/O operations
- Faster query execution

**5. Use EXISTS Instead of COUNT:**

**Technique:** Use EXISTS for existence checks instead of COUNT(*).

**Example:**
```sql
-- ❌ Bad: COUNT scans all rows
SELECT *
FROM users u
WHERE (
    SELECT COUNT(*) FROM orders o
    WHERE o.user_id = u.id
) > 0;
-- For each user: Counts all orders
-- Time: ~10,000ms for 1,000 users

-- ✅ Good: EXISTS stops at first match
SELECT *
FROM users u
WHERE EXISTS (
    SELECT 1 FROM orders o
    WHERE o.user_id = u.id
);
-- For each user: Stops at first order found
-- Time: ~100ms for 1,000 users
-- 100x faster!
```

**Why EXISTS is Faster:**
- Stops scanning at first match
- COUNT must scan all matching rows
- EXISTS can use index more efficiently

**6. Optimize JOINs:**

**Technique:** Index join columns, consider join order, use appropriate join types.

**Example:**
```sql
-- ❌ Bad: No indexes on join columns
SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id;
-- Sequential scans on both tables
-- Time: ~50,000ms

-- ✅ Good: Indexed join columns
CREATE INDEX idx_orders_user_id ON orders(user_id);
SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id;
-- Index scans
-- Time: ~500ms
-- 100x faster!
```

**Join Order Optimization:**
```sql
-- Optimizer may reorder, but you can guide it
-- Join smaller tables first when possible
SELECT ...
FROM small_table s
JOIN large_table l ON s.id = l.id;
-- Smaller intermediate result set
```

**7. Use Appropriate Data Types:**

**Technique:** Use the smallest data type that fits your data.

**Example:**
```sql
-- ❌ Bad: Over-sized types
CREATE TABLE users (
    id BIGINT,           -- Unnecessary if IDs < 2 billion
    email TEXT,          -- Unnecessary if emails < 255 chars
    age INTEGER,         -- Unnecessary if ages < 32767
    status VARCHAR(100)  -- Unnecessary if status < 20 chars
);

-- ✅ Good: Right-sized types
CREATE TABLE users (
    id INTEGER,          -- Sufficient for most cases
    email VARCHAR(255),  -- Appropriate size
    age SMALLINT,        -- Sufficient for ages
    status VARCHAR(20)   -- Appropriate size
);
```

**Benefits:**
- Less storage space
- Faster queries (less data to process)
- Better index efficiency
- Less memory usage

**8. Batch Operations:**

**Technique:** Group multiple operations into single statements.

**Example:**
```sql
-- ❌ Bad: Multiple individual inserts
INSERT INTO orders (user_id, total) VALUES (1, 99.99);
INSERT INTO orders (user_id, total) VALUES (2, 149.99);
INSERT INTO orders (user_id, total) VALUES (3, 79.99);
-- 3 separate transactions
-- Time: 3 × 10ms = 30ms

-- ✅ Good: Batch insert
INSERT INTO orders (user_id, total) VALUES
    (1, 99.99),
    (2, 149.99),
    (3, 79.99);
-- Single transaction
-- Time: ~15ms
-- 2x faster!
```

**9. Use EXPLAIN ANALYZE:**

**Technique:** Analyze query execution plans to identify bottlenecks.

**Example:**
```sql
EXPLAIN ANALYZE
SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.email = 'user@example.com';

-- Look for:
-- - Sequential scans (bad)
-- - Index scans (good)
-- - High costs
-- - Large row estimates
```

**10. Update Statistics:**

**Technique:** Keep table statistics current for optimal query planning.

**Example:**
```sql
-- Update statistics
ANALYZE users;
ANALYZE orders;

-- Helps optimizer make better decisions
-- Should run after bulk inserts/updates
```

**Performance Comparison Summary:**

| Technique | Improvement | Use Case |
|-----------|-------------|----------|
| **Indexing** | 10-1000x | WHERE, JOIN, ORDER BY |
| **Early Filtering** | 10-100x | Large tables with filters |
| **LIMIT** | 10-100x | Pagination, top N queries |
| **SELECT specific columns** | 2-20x | Reducing data transfer |
| **EXISTS vs COUNT** | 10-100x | Existence checks |
| **JOIN optimization** | 10-100x | Multi-table queries |
| **Right data types** | 1.5-3x | Storage and processing |
| **Batch operations** | 2-5x | Bulk inserts/updates |

**Best Practices:**

**1. Index Strategy:**
- Index foreign keys
- Index frequently filtered columns
- Create composite indexes for multi-column queries
- Monitor index usage

**2. Query Structure:**
- Filter early
- Use LIMIT when possible
- Select only needed columns
- Use appropriate JOIN types

**3. Monitoring:**
- Use EXPLAIN ANALYZE regularly
- Monitor slow queries
- Track index usage
- Update statistics

**4. Application Level:**
- Avoid N+1 queries
- Use connection pooling
- Cache expensive queries
- Batch operations when possible

**System Design Consideration**: Query optimization is crucial for:
1. **Performance**: Fast response times
2. **Scalability**: Handling growth
3. **Cost**: Reducing database load
4. **User Experience**: Responsive applications

Query optimization requires understanding how databases execute queries and applying appropriate techniques. Proper indexing, early filtering, using LIMIT, avoiding SELECT *, and using EXISTS are among the most impactful optimizations. Always analyze query plans and monitor performance to identify optimization opportunities.

---

### Q2: Explain how to identify and fix slow queries. Discuss the tools and techniques for query analysis, common performance problems, and systematic approaches to optimization. Provide examples showing the optimization process from problem identification to solution.

**Answer:**

**Identifying Slow Queries:**

**1. Query Logging:**

**Enable Slow Query Log:**
```sql
-- PostgreSQL
SET log_min_duration_statement = 1000;  -- Log queries > 1 second
SET log_statement = 'all';  -- Log all queries

-- MySQL
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;  -- Log queries > 1 second
```

**2. Query Statistics:**

**PostgreSQL:**
```sql
-- View slow queries
SELECT 
    query,
    calls,
    mean_exec_time,
    max_exec_time,
    total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**3. Application Monitoring:**

**Track Query Performance:**
```javascript
// Log slow queries in application
const start = Date.now();
const result = await db.query(query);
const duration = Date.now() - start;

if (duration > 1000) {
    console.warn(`Slow query: ${duration}ms`, query);
    // Log to monitoring system
}
```

**Analyzing Query Performance:**

**1. Use EXPLAIN ANALYZE:**

**Basic Analysis:**
```sql
EXPLAIN ANALYZE
SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.email = 'user@example.com';
```

**Output Analysis:**
```
Hash Join (cost=250.00..1250.00 rows=1 width=32) (actual time=5.123..12.456 rows=1 loops=1)
  Hash Cond: (o.user_id = u.id)
  -> Seq Scan on orders o (cost=0.00..1000.00 rows=10000 width=12) (actual time=0.012..8.456 rows=10000 loops=1)
  -> Hash (cost=200.00..200.00 rows=10000 width=20) (actual time=2.123..2.123 rows=10000 loops=1)
        -> Seq Scan on users u (cost=0.00..200.00 rows=10000 width=20) (actual time=0.012..1.234 rows=10000 loops=1)
              Filter: (email = 'user@example.com'::text)
              Rows Removed by Filter: 9999
Planning Time: 0.123 ms
Execution Time: 12.456 ms
```

**Problems Identified:**
- Sequential scan on users (should use index)
- Sequential scan on orders (should use index)
- Filtering 9,999 rows (inefficient)

**2. Identify Bottlenecks:**

**Look For:**
- **Sequential Scans**: `Seq Scan` on large tables
- **High Costs**: Operations with high cost values
- **Large Row Estimates**: Estimated vs actual row mismatches
- **Expensive Operations**: Sorts, aggregations on large datasets

**Common Performance Problems:**

**Problem 1: Missing Indexes**

**Symptom:**
```sql
EXPLAIN ANALYZE
SELECT * FROM users WHERE email = 'user@example.com';

-- Output:
Seq Scan on users (cost=0.00..25000.00 rows=1 width=100)
  Filter: (email = 'user@example.com'::text)
  Rows Removed by Filter: 999999
Execution Time: 5000.123 ms
```

**Problem:** Sequential scan on 1 million rows

**Solution:**
```sql
-- Add index
CREATE INDEX idx_users_email ON users(email);

-- Re-check
EXPLAIN ANALYZE
SELECT * FROM users WHERE email = 'user@example.com';

-- Output:
Index Scan using idx_users_email (cost=0.43..8.45 rows=1 width=100)
  Index Cond: (email = 'user@example.com'::text)
Execution Time: 0.015 ms
-- 333,000x faster!
```

**Problem 2: N+1 Queries**

**Symptom:**
```javascript
// Application code
const users = await db.query('SELECT * FROM users');
for (const user of users) {
    const orders = await db.query('SELECT * FROM orders WHERE user_id = ?', [user.id]);
    // 1,000 users = 1,001 queries!
}
```

**Problem:** Multiple queries instead of one

**Solution:**
```sql
-- Single query with JOIN
SELECT u.*, o.id AS order_id, o.total
FROM users u
LEFT JOIN orders o ON u.id = o.user_id;
-- 1 query instead of 1,001!
```

**Problem 3: Large OFFSET**

**Symptom:**
```sql
SELECT * FROM orders
ORDER BY created_at DESC
LIMIT 20 OFFSET 100000;
-- Must skip 100,000 rows!
Execution Time: 5000.123 ms
```

**Problem:** Large offset requires scanning many rows

**Solution:**
```sql
-- Use cursor-based pagination
SELECT * FROM orders
WHERE id > :last_seen_id
ORDER BY id
LIMIT 20;
-- Direct index lookup
Execution Time: 5.123 ms
```

**Problem 4: Correlated Subqueries**

**Symptom:**
```sql
SELECT 
    u.id,
    u.name,
    (SELECT COUNT(*) FROM orders WHERE user_id = u.id) AS order_count
FROM users u;
-- Subquery executes once per user
Execution Time: 10000.456 ms
```

**Problem:** Subquery executes N times

**Solution:**
```sql
-- Use JOIN with GROUP BY
SELECT 
    u.id,
    u.name,
    COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;
-- Single pass
Execution Time: 500.123 ms
```

**Problem 5: Unnecessary Sorting**

**Symptom:**
```sql
SELECT * FROM orders
WHERE user_id = 123
ORDER BY created_at DESC;
-- Must sort results
Execution Time: 1000.456 ms
```

**Problem:** Sorting large result set

**Solution:**
```sql
-- Add index on sort columns
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at DESC);

-- Re-check
EXPLAIN ANALYZE
SELECT * FROM orders
WHERE user_id = 123
ORDER BY created_at DESC;
-- Index already sorted, no sort needed
Execution Time: 10.123 ms
```

**Systematic Optimization Process:**

**Step 1: Identify Slow Queries**
```sql
-- Find slow queries
SELECT 
    query,
    mean_exec_time,
    calls
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- Queries > 100ms
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Step 2: Analyze Query Plan**
```sql
-- Get execution plan
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT ...;  -- Your slow query
```

**Step 3: Identify Bottlenecks**
- Look for sequential scans
- Check for missing indexes
- Identify expensive operations
- Compare estimated vs actual rows

**Step 4: Apply Optimizations**
- Add missing indexes
- Rewrite query if needed
- Optimize JOINs
- Add filters early

**Step 5: Verify Improvement**
```sql
-- Re-analyze after optimization
EXPLAIN ANALYZE
SELECT ...;  -- Optimized query

-- Compare execution times
-- Should see improvement
```

**Step 6: Monitor**
```sql
-- Continue monitoring
SELECT * FROM pg_stat_statements
WHERE query LIKE '%your_query%';
-- Track performance over time
```

**Real-World Example:**

**Initial Problem:**
```sql
-- Slow query
SELECT 
    u.name,
    u.email,
    COUNT(o.id) AS order_count,
    SUM(o.total) AS total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2024-01-01'
GROUP BY u.id, u.name, u.email
ORDER BY total_spent DESC
LIMIT 100;

-- Execution Time: 15,000ms (15 seconds)
```

**Analysis:**
```sql
EXPLAIN ANALYZE ...;
-- Shows:
-- - Sequential scan on users (no index on created_at)
-- - Sequential scan on orders (no index on user_id)
-- - Hash join on large datasets
-- - Sort operation
```

**Optimizations Applied:**
```sql
-- 1. Add index on users.created_at
CREATE INDEX idx_users_created ON users(created_at);

-- 2. Add index on orders.user_id
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- 3. Add composite index for covering
CREATE INDEX idx_orders_user_total ON orders(user_id, total);
```

**Result:**
```sql
-- Re-check
EXPLAIN ANALYZE ...;
-- Shows:
-- - Index scan on users
-- - Index scan on orders
-- - Efficient join
-- Execution Time: 150ms
-- 100x faster!
```

**Best Practices:**

**1. Regular Monitoring:**
- Set up query logging
- Monitor slow queries daily
- Track performance trends
- Set up alerts for degradation

**2. Proactive Optimization:**
- Analyze new queries before deployment
- Review query plans in code reviews
- Test with production-like data volumes
- Benchmark before/after changes

**3. Documentation:**
- Document optimization decisions
- Record performance improvements
- Share learnings with team
- Maintain optimization playbook

**System Design Consideration**: Query optimization is an ongoing process:
1. **Monitoring**: Continuous performance tracking
2. **Analysis**: Systematic problem identification
3. **Optimization**: Applying proven techniques
4. **Verification**: Measuring improvements
5. **Iteration**: Continuous improvement

Identifying and fixing slow queries requires systematic analysis using EXPLAIN ANALYZE, identifying bottlenecks like missing indexes or inefficient patterns, and applying appropriate optimizations. The key is to measure, optimize, and verify improvements continuously.

