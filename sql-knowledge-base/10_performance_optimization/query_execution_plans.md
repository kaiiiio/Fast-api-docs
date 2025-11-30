# Query Execution Plans: Understanding How Queries Execute

Query execution plans show how the database executes queries. Understanding plans helps optimize queries and identify performance bottlenecks.

## What is an Execution Plan?

**Execution plan** is a step-by-step breakdown of how the database will execute a query. It shows operations, costs, and data flow.

### Viewing Execution Plans

```sql
-- PostgreSQL: EXPLAIN
EXPLAIN SELECT * FROM users WHERE email = 'user@example.com';

-- PostgreSQL: EXPLAIN ANALYZE (actual execution)
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'user@example.com';

-- MySQL: EXPLAIN
EXPLAIN SELECT * FROM users WHERE email = 'user@example.com';
```

## Plan Components

### Node Types

```sql
-- Common plan nodes:
-- 1. Seq Scan: Sequential table scan
-- 2. Index Scan: Index lookup
-- 3. Index Only Scan: Data from index only
-- 4. Bitmap Index Scan: Multiple index lookups
-- 5. Nested Loop: Join algorithm
-- 6. Hash Join: Join algorithm
-- 7. Sort: Sorting operation
-- 8. Aggregate: Aggregation operation
```

### Cost Estimation

```sql
EXPLAIN SELECT * FROM users WHERE email = 'user@example.com';

-- Output:
-- Index Scan using idx_users_email on users
--   (cost=0.42..8.44 rows=1 width=64)
--   Index Cond: (email = 'user@example.com'::text)
-- 
-- cost=0.42..8.44:
-- - 0.42: Startup cost (before first row)
-- - 8.44: Total cost (all rows)
-- rows=1: Estimated rows returned
-- width=64: Average row width in bytes
```

## Common Plan Patterns

### Pattern 1: Simple Index Scan

```sql
EXPLAIN SELECT * FROM users WHERE id = 1;

-- Plan:
-- Index Scan using users_pkey on users
--   (cost=0.29..8.30 rows=1 width=64)
--   Index Cond: (id = 1)
-- 
-- Simple: Index lookup, fetch row
```

### Pattern 2: Sequential Scan

```sql
EXPLAIN SELECT * FROM users WHERE name = 'John';

-- Plan:
-- Seq Scan on users
--   (cost=0.00..1000.00 rows=1 width=64)
--   Filter: (name = 'John'::text)
-- 
-- Sequential: Read all rows, filter
```

### Pattern 3: Join with Index

```sql
EXPLAIN 
SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.email = 'user@example.com';

-- Plan:
-- Nested Loop
--   -> Index Scan using idx_users_email on users
--   -> Index Scan using idx_orders_user_id on orders
-- 
-- Nested Loop: For each user, find orders
```

### Pattern 4: Hash Join

```sql
EXPLAIN 
SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id;

-- Plan:
-- Hash Join
--   Hash Cond: (u.id = o.user_id)
--   -> Seq Scan on users
--   -> Hash
--   -> Seq Scan on orders
-- 
-- Hash Join: Build hash table, probe for matches
```

## Reading Execution Plans

### Tree Structure

```sql
EXPLAIN 
SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.email = 'user@example.com';

-- Plan tree (bottom to top):
-- 1. Index Scan on users (leaf)
-- 2. Index Scan on orders (leaf)
-- 3. Nested Loop (combines results)
```

### Execution Order

```sql
-- Execution order (bottom-up):
-- 1. Execute leaf nodes first
-- 2. Combine results at parent nodes
-- 3. Continue up the tree
```

## Cost Analysis

### Understanding Costs

```sql
-- Cost components:
-- - Sequential page reads
-- - Random page reads
-- - CPU processing
-- - Network I/O

-- Lower cost = faster query (usually)
```

### Comparing Plans

```sql
-- Plan 1: Sequential scan
EXPLAIN SELECT * FROM users WHERE name = 'John';
-- cost=0.00..1000.00

-- Plan 2: Index scan
CREATE INDEX idx_users_name ON users(name);
EXPLAIN SELECT * FROM users WHERE name = 'John';
-- cost=0.42..8.44

-- Index scan has lower cost = faster
```

## Real-World Examples

### Example 1: Simple Query

```sql
EXPLAIN ANALYZE
SELECT * FROM users WHERE id = 1;

-- Output:
-- Index Scan using users_pkey on users
--   (cost=0.29..8.30 rows=1 width=64)
--   (actual time=0.015..0.016 rows=1 loops=1)
--   Index Cond: (id = 1)
-- Planning Time: 0.050 ms
-- Execution Time: 0.030 ms
-- 
-- actual time: Real execution time
-- rows: Actual rows returned
-- loops: Number of iterations
```

### Example 2: Join Query

```sql
EXPLAIN ANALYZE
SELECT u.name, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;

-- Plan:
-- HashAggregate
--   Group Key: u.id, u.name
--   -> Hash Right Join
--       Hash Cond: (o.user_id = u.id)
--       -> Seq Scan on orders
--       -> Hash
--       -> Seq Scan on users
```

### Example 3: Complex Query

```sql
EXPLAIN ANALYZE
SELECT 
    u.name,
    o.total,
    p.name AS product_name
FROM users u
JOIN orders o ON u.id = o.user_id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
WHERE u.email = 'user@example.com';

-- Plan shows:
-- - Index scan on users (email filter)
-- - Index scan on orders (user_id)
-- - Index scan on order_items (order_id)
-- - Index scan on products (product_id)
-- - Nested loops joining results
```

## Optimizing Based on Plans

### Identify Bottlenecks

```sql
-- Look for:
-- 1. High cost operations
-- 2. Sequential scans on large tables
-- 3. Missing indexes
-- 4. Expensive joins
-- 5. Large row estimates
```

### Add Missing Indexes

```sql
-- Plan shows sequential scan
EXPLAIN SELECT * FROM users WHERE email = 'user@example.com';
-- Seq Scan on users

-- Add index
CREATE INDEX idx_users_email ON users(email);

-- Re-check plan
EXPLAIN SELECT * FROM users WHERE email = 'user@example.com';
-- Index Scan using idx_users_email
```

### Rewrite Queries

```sql
-- Plan shows expensive subquery
EXPLAIN 
SELECT * FROM users 
WHERE id IN (SELECT user_id FROM orders);

-- Rewrite with JOIN
EXPLAIN 
SELECT DISTINCT u.*
FROM users u
JOIN orders o ON u.id = o.user_id;
-- Often more efficient
```

## PostgreSQL-Specific Features

### EXPLAIN Options

```sql
-- Verbose: More details
EXPLAIN (VERBOSE) SELECT * FROM users;

-- Buffers: I/O statistics
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM users;

-- Format: JSON, XML, YAML
EXPLAIN (FORMAT JSON) SELECT * FROM users;
```

### pg_stat_statements

```sql
-- View actual query performance
SELECT 
    query,
    calls,
    mean_exec_time,
    max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## Best Practices

1. **Always EXPLAIN**: Check plans before optimizing
2. **Use ANALYZE**: Get actual execution times
3. **Update Statistics**: Run ANALYZE regularly
4. **Monitor**: Track slow queries
5. **Test Changes**: Verify improvements

## Common Issues

### Issue 1: Outdated Statistics

```sql
-- Problem: Plan based on old statistics
-- Solution: Update statistics
ANALYZE users;

-- Re-check plan
EXPLAIN SELECT * FROM users WHERE email = 'user@example.com';
```

### Issue 2: Parameter Sniffing

```sql
-- Problem: Plan optimized for first parameter value
-- Solution: Use EXPLAIN with actual values
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM users WHERE email = $1;
```

## Summary

**Query Execution Plans:**

1. **Purpose**: Show how database executes queries
2. **View**: Use EXPLAIN and EXPLAIN ANALYZE
3. **Components**: Nodes, costs, row estimates
4. **Optimization**: Identify bottlenecks, add indexes
5. **Monitoring**: Track actual performance

**Key Takeaway:**
Query execution plans show how the database executes queries step-by-step. Use EXPLAIN to see estimated costs and EXPLAIN ANALYZE for actual execution times. Analyze plans to identify bottlenecks like sequential scans or missing indexes. Use plans to guide optimization efforts.

**Plan Analysis:**
- Look for high costs
- Identify sequential scans
- Check for missing indexes
- Compare before/after optimization

**Next Steps:**
- Learn [EXPLAIN ANALYZE](explain_analyze.md) for detailed analysis
- Study [Slow Query Analysis](slow_query_analysis.md) for troubleshooting
- Master [Query Optimization Tips](query_optimization_tips.md) for techniques

