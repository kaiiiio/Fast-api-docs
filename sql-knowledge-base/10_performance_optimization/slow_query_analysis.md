# Slow Query Analysis: Identifying and Fixing Performance Issues

Analyzing slow queries is essential for maintaining database performance. This guide covers techniques for identifying bottlenecks and optimizing slow queries.

## Identifying Slow Queries

### Enable Query Logging

**PostgreSQL:**
```sql
-- Log queries longer than 1 second
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();

-- Check slow queries in log
-- Or use pg_stat_statements extension
```

**MySQL:**
```sql
-- Enable slow query log
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;  -- Log queries > 1 second
```

### Using pg_stat_statements (PostgreSQL)

```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View slow queries
SELECT 
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## Analyzing Query Performance

### Step 1: Use EXPLAIN ANALYZE

```sql
-- Analyze query execution
EXPLAIN ANALYZE
SELECT * FROM orders
WHERE user_id = 1 AND status = 'completed'
ORDER BY created_at DESC;
```

### Step 2: Identify Problems

**Look for:**
- ❌ Sequential scans on large tables
- ❌ High execution times
- ❌ Large row estimates
- ❌ Missing indexes
- ❌ Expensive operations

### Step 3: Check Index Usage

```sql
-- Verify index is being used
EXPLAIN ANALYZE
SELECT * FROM users WHERE email = 'user@example.com';

-- Should show: Index Scan using idx_users_email
-- If shows: Seq Scan → Index missing or not being used
```

## Common Slow Query Patterns

### Pattern 1: Missing Index

```sql
-- ❌ Slow: No index
EXPLAIN ANALYZE
SELECT * FROM orders WHERE user_id = 1;
-- Seq Scan on orders (cost=0.00..1000.00 rows=1000)
-- Execution Time: 500ms

-- ✅ Fast: With index
CREATE INDEX idx_orders_user_id ON orders(user_id);
EXPLAIN ANALYZE
SELECT * FROM orders WHERE user_id = 1;
-- Index Scan using idx_orders_user_id (cost=0.42..8.44 rows=1)
-- Execution Time: 5ms
```

### Pattern 2: Function on Indexed Column

```sql
-- ❌ Slow: Function prevents index usage
EXPLAIN ANALYZE
SELECT * FROM users WHERE LOWER(email) = 'user@example.com';
-- Seq Scan (can't use index)

-- ✅ Fast: Expression index or store normalized
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
EXPLAIN ANALYZE
SELECT * FROM users WHERE LOWER(email) = 'user@example.com';
-- Index Scan using idx_users_email_lower
```

### Pattern 3: Large OFFSET

```sql
-- ❌ Slow: Large OFFSET
EXPLAIN ANALYZE
SELECT * FROM orders ORDER BY id LIMIT 20 OFFSET 100000;
-- Execution Time: 2000ms (must skip 100,000 rows)

-- ✅ Fast: Cursor-based pagination
EXPLAIN ANALYZE
SELECT * FROM orders WHERE id > 100000 ORDER BY id LIMIT 20;
-- Execution Time: 5ms (uses index)
```

### Pattern 4: N+1 Query Problem

```sql
-- ❌ Slow: N+1 queries (application level)
-- SELECT * FROM users;
-- For each user: SELECT * FROM orders WHERE user_id = ?

-- ✅ Fast: Single query with JOIN
SELECT 
    u.id,
    u.name,
    o.id AS order_id,
    o.total
FROM users u
LEFT JOIN orders o ON u.id = o.user_id;
```

### Pattern 5: Unnecessary JOINs

```sql
-- ❌ Slow: Unnecessary JOIN
SELECT u.name
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.id = 1;
-- JOIN not needed if we only need user name

-- ✅ Fast: Direct query
SELECT u.name
FROM users u
WHERE u.id = (SELECT user_id FROM orders WHERE id = 1);
-- Or better: Get user_id from order first, then query user
```

## Optimization Techniques

### Technique 1: Add Missing Indexes

```sql
-- Identify missing indexes
EXPLAIN ANALYZE
SELECT * FROM orders WHERE user_id = 1 AND status = 'completed';
-- If shows Seq Scan, create index

CREATE INDEX idx_orders_user_status ON orders(user_id, status);
-- Re-run EXPLAIN ANALYZE to verify improvement
```

### Technique 2: Rewrite Query

```sql
-- ❌ Slow: Subquery
SELECT * FROM users
WHERE id IN (SELECT user_id FROM orders WHERE total > 100);

-- ✅ Faster: JOIN
SELECT DISTINCT u.*
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.total > 100;
```

### Technique 3: Use EXISTS Instead of IN

```sql
-- ❌ Less efficient: IN with large subquery
SELECT * FROM users
WHERE id IN (SELECT user_id FROM orders);

-- ✅ More efficient: EXISTS
SELECT * FROM users u
WHERE EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id);
```

### Technique 4: Limit Result Sets

```sql
-- ❌ Slow: Return all rows
SELECT * FROM orders WHERE user_id = 1;

-- ✅ Fast: Limit results
SELECT * FROM orders 
WHERE user_id = 1 
ORDER BY created_at DESC 
LIMIT 20;
```

### Technique 5: Use Materialized Views

```sql
-- ❌ Slow: Complex aggregation every time
SELECT 
    category_id,
    COUNT(*) AS product_count,
    AVG(price) AS avg_price
FROM products
GROUP BY category_id;

-- ✅ Fast: Materialized view
CREATE MATERIALIZED VIEW category_stats AS
SELECT 
    category_id,
    COUNT(*) AS product_count,
    AVG(price) AS avg_price
FROM products
GROUP BY category_id;

-- Refresh periodically
REFRESH MATERIALIZED VIEW category_stats;

-- Fast queries
SELECT * FROM category_stats;
```

## Monitoring Tools

### PostgreSQL: pg_stat_statements

```sql
-- Top slow queries
SELECT 
    LEFT(query, 100) AS query_preview,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### MySQL: Performance Schema

```sql
-- Slow queries
SELECT 
    sql_text,
    exec_count,
    avg_timer_wait / 1000000000000 AS avg_seconds
FROM performance_schema.events_statements_summary_by_digest
ORDER BY avg_timer_wait DESC
LIMIT 10;
```

## Systematic Analysis Process

### Step 1: Identify Slow Queries

```sql
-- Use pg_stat_statements or slow query log
-- Find queries with high mean_exec_time
```

### Step 2: Analyze with EXPLAIN

```sql
-- Run EXPLAIN ANALYZE on slow query
EXPLAIN ANALYZE
-- ... slow query ...
```

### Step 3: Identify Bottlenecks

```sql
-- Look for:
-- - Sequential scans
-- - High costs
-- - Missing indexes
-- - Large row estimates
```

### Step 4: Optimize

```sql
-- Apply optimizations:
-- - Add indexes
-- - Rewrite query
-- - Use materialized views
-- - Limit results
```

### Step 5: Verify Improvement

```sql
-- Re-run EXPLAIN ANALYZE
-- Compare execution times
-- Verify index usage
```

## Real-World Example

### Slow Query

```sql
-- Slow query: User order history
SELECT 
    u.name,
    o.id,
    o.total,
    o.created_at
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.email = 'user@example.com'
ORDER BY o.created_at DESC;
-- Execution Time: 500ms
```

### Analysis

```sql
EXPLAIN ANALYZE
SELECT 
    u.name,
    o.id,
    o.total,
    o.created_at
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.email = 'user@example.com'
ORDER BY o.created_at DESC;

-- Problems identified:
-- 1. No index on users.email
-- 2. No index on orders.user_id
-- 3. No index on orders.created_at
```

### Optimization

```sql
-- Add indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at DESC);

-- Re-run query
-- Execution Time: 10ms (50x improvement!)
```

## Best Practices

1. **Monitor Regularly**: Track slow queries continuously
2. **Use EXPLAIN**: Always analyze before optimizing
3. **Add Indexes**: Index frequently queried columns
4. **Rewrite Queries**: Simplify complex queries
5. **Test Changes**: Verify improvements with EXPLAIN ANALYZE

## Summary

**Slow Query Analysis:**

1. **Identify**: Use pg_stat_statements or slow query log
2. **Analyze**: Use EXPLAIN ANALYZE
3. **Optimize**: Add indexes, rewrite queries
4. **Verify**: Re-run EXPLAIN ANALYZE
5. **Monitor**: Track continuously

**Key Takeaway:**
Slow query analysis involves identifying bottlenecks, analyzing execution plans, and applying optimizations. Use EXPLAIN ANALYZE to understand query execution, identify missing indexes, and verify improvements. Monitor slow queries regularly and optimize systematically.

**Common Issues:**
- Missing indexes
- Functions on indexed columns
- Large OFFSETs
- N+1 queries
- Unnecessary JOINs

**Next Steps:**
- Learn [EXPLAIN ANALYZE](explain_analyze.md) for query analysis
- Study [Query Optimization Tips](query_optimization_tips.md) for techniques
- Master [Indexes](../08_indexes/what_is_index.md) for performance

