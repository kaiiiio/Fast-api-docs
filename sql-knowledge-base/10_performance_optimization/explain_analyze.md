# EXPLAIN and EXPLAIN ANALYZE: Understanding Query Execution

EXPLAIN and EXPLAIN ANALYZE are essential tools for understanding how databases execute queries. They show the query execution plan, helping you identify performance bottlenecks and optimize queries.

## What is EXPLAIN?

**EXPLAIN** shows the query execution plan without actually running the query. It tells you:
- How the database will execute the query
- Which indexes will be used
- Join algorithms
- Estimated costs and row counts

## Basic EXPLAIN Usage

### Simple EXPLAIN

```sql
-- See execution plan
EXPLAIN
SELECT * FROM users WHERE email = 'john@example.com';
```

**Output (PostgreSQL):**
```
QUERY PLAN
─────────────────────────────────────────────────────────────
Index Scan using idx_users_email on users
  Index Cond: (email = 'john@example.com'::text)
  (cost=0.42..8.44 rows=1 width=64)
```

**Understanding the Output:**
- **Index Scan**: Uses index (good!)
- **cost=0.42..8.44**: Estimated cost (lower is better)
- **rows=1**: Estimated rows returned
- **width=64**: Estimated row size in bytes

### EXPLAIN ANALYZE

**EXPLAIN ANALYZE** actually runs the query and shows real execution statistics.

```sql
-- Run query and show actual execution stats
EXPLAIN ANALYZE
SELECT * FROM users WHERE email = 'john@example.com';
```

**Output:**
```
QUERY PLAN
─────────────────────────────────────────────────────────────
Index Scan using idx_users_email on users
  Index Cond: (email = 'john@example.com'::text)
  (cost=0.42..8.44 rows=1 width=64) (actual time=0.123..0.124 rows=1 loops=1)
Planning Time: 0.045 ms
Execution Time: 0.156 ms
```

**Key Metrics:**
- **actual time**: Real execution time (ms)
- **rows**: Actual rows returned
- **loops**: Number of times node executed
- **Planning Time**: Time to create plan
- **Execution Time**: Total query time

## Understanding Execution Plans

### Sequential Scan (Full Table Scan)

```sql
EXPLAIN
SELECT * FROM products WHERE name LIKE '%laptop%';
```

**Output:**
```
QUERY PLAN
─────────────────────────────────────────────────────────────
Seq Scan on products
  Filter: (name ~~ '%laptop%'::text)
  (cost=0.00..1000.00 rows=100 width=200)
```

**What it means:**
- **Seq Scan**: Scans entire table row by row
- **Very slow** for large tables
- **Solution**: Create index or rewrite query

### Index Scan

```sql
-- With index
CREATE INDEX idx_users_email ON users(email);

EXPLAIN
SELECT * FROM users WHERE email = 'john@example.com';
```

**Output:**
```
QUERY PLAN
─────────────────────────────────────────────────────────────
Index Scan using idx_users_email on users
  Index Cond: (email = 'john@example.com'::text)
  (cost=0.42..8.44 rows=1 width=64)
```

**What it means:**
- **Index Scan**: Uses index (fast!)
- **Much faster** than sequential scan
- **Good**: This is what you want

### Index Only Scan

```sql
-- Query only uses indexed columns
EXPLAIN
SELECT email FROM users WHERE email = 'john@example.com';
```

**Output:**
```
QUERY PLAN
─────────────────────────────────────────────────────────────
Index Only Scan using idx_users_email on users
  Index Cond: (email = 'john@example.com'::text)
  (cost=0.42..4.44 rows=1 width=32)
```

**What it means:**
- **Index Only Scan**: Doesn't need to read table, only index
- **Fastest**: No table access needed
- **Best case scenario**

### Bitmap Index Scan

```sql
EXPLAIN
SELECT * FROM orders WHERE user_id IN (1, 2, 3, 4, 5);
```

**Output:**
```
QUERY PLAN
─────────────────────────────────────────────────────────────
Bitmap Heap Scan on orders
  Recheck Cond: (user_id = ANY ('{1,2,3,4,5}'::integer[]))
  -> Bitmap Index Scan on idx_orders_user_id
      Index Cond: (user_id = ANY ('{1,2,3,4,5}'::integer[]))
```

**What it means:**
- **Bitmap Index Scan**: Efficient for multiple values
- **Good for**: IN clauses, OR conditions
- **Faster than multiple index scans**

## Join Algorithms

### Nested Loop Join

```sql
EXPLAIN
SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.id = 1;
```

**Output:**
```
QUERY PLAN
─────────────────────────────────────────────────────────────
Nested Loop
  -> Index Scan using users_pkey on users u
      Index Cond: (id = 1)
  -> Index Scan using idx_orders_user_id on orders o
      Index Cond: (user_id = u.id)
```

**What it means:**
- **Nested Loop**: For each row in outer table, scan inner table
- **Good for**: Small datasets, indexed joins
- **Cost**: O(n × m) where n and m are table sizes

### Hash Join

```sql
EXPLAIN
SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id;
```

**Output:**
```
QUERY PLAN
─────────────────────────────────────────────────────────────
Hash Join
  Hash Cond: (o.user_id = u.id)
  -> Seq Scan on orders o
  -> Hash
      -> Seq Scan on users u
```

**What it means:**
- **Hash Join**: Builds hash table from smaller table
- **Good for**: Larger datasets, no indexes
- **Cost**: O(n + m) - linear

### Merge Join

```sql
EXPLAIN
SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id
ORDER BY u.id;
```

**Output:**
```
QUERY PLAN
─────────────────────────────────────────────────────────────
Merge Join
  Merge Cond: (u.id = o.user_id)
  -> Index Scan using users_pkey on users u
  -> Index Scan using idx_orders_user_id on orders o
```

**What it means:**
- **Merge Join**: Both inputs sorted, merge together
- **Good for**: Sorted data, large datasets
- **Cost**: O(n + m) - linear

## Cost Analysis

### Understanding Costs

```sql
EXPLAIN
SELECT * FROM users WHERE email = 'john@example.com';
```

**Output:**
```
Index Scan using idx_users_email on users
  (cost=0.42..8.44 rows=1 width=64)
```

**Cost Breakdown:**
- **0.42**: Startup cost (time to get first row)
- **8.44**: Total cost (time to get all rows)
- **rows=1**: Estimated rows
- **width=64**: Bytes per row

### Comparing Plans

```sql
-- Plan 1: Without index
EXPLAIN SELECT * FROM users WHERE name = 'John';
-- Seq Scan (cost=0.00..1000.00)

-- Plan 2: With index
CREATE INDEX idx_users_name ON users(name);
EXPLAIN SELECT * FROM users WHERE name = 'John';
-- Index Scan (cost=0.42..8.44)

-- Index scan is ~118x cheaper!
```

## Real Execution Statistics

### EXPLAIN ANALYZE Example

```sql
EXPLAIN ANALYZE
SELECT u.name, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;
```

**Output:**
```
QUERY PLAN
─────────────────────────────────────────────────────────────
HashAggregate
  Group Key: u.id, u.name
  -> Hash Right Join
      Hash Cond: (o.user_id = u.id)
      -> Seq Scan on orders o
          (actual time=0.123..45.678 rows=10000 loops=1)
      -> Hash
          -> Seq Scan on users u
              (actual time=0.012..12.345 rows=1000 loops=1)
Planning Time: 0.123 ms
Execution Time: 67.890 ms
```

**Key Metrics:**
- **actual time**: Real execution time
- **rows**: Actual rows processed
- **loops**: Number of iterations
- **Planning Time**: Query planning overhead
- **Execution Time**: Total time

## Identifying Problems

### Problem 1: Sequential Scan on Large Table

```sql
EXPLAIN ANALYZE
SELECT * FROM orders WHERE total > 100;
```

**Output:**
```
Seq Scan on orders
  Filter: (total > 100::numeric)
  (actual time=0.123..1234.567 rows=50000 loops=1)
Execution Time: 1234.567 ms  -- Very slow!
```

**Solution:**
```sql
-- Create index
CREATE INDEX idx_orders_total ON orders(total);

-- Re-run EXPLAIN
EXPLAIN ANALYZE
SELECT * FROM orders WHERE total > 100;
-- Now uses Index Scan, much faster
```

### Problem 2: Missing Index on JOIN

```sql
EXPLAIN ANALYZE
SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id;
```

**Output:**
```
Hash Join
  -> Seq Scan on orders o  -- No index on user_id!
      (actual time=0.123..456.789 rows=10000 loops=1)
```

**Solution:**
```sql
-- Create index on foreign key
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Re-run EXPLAIN
-- Now uses Index Scan, faster
```

### Problem 3: High Row Estimates

```sql
EXPLAIN ANALYZE
SELECT * FROM users WHERE created_at > '2024-01-01';
```

**Output:**
```
Seq Scan on users
  Filter: (created_at > '2024-01-01'::date)
  (cost=0.00..1000.00 rows=10000 width=64)
  (actual time=0.123..234.567 rows=50 loops=1)
  -- Estimated 10,000 rows, actual 50 rows
```

**Problem:**
- **Bad statistics**: Database thinks 10,000 rows, actually 50
- **Poor plan**: May choose wrong join algorithm

**Solution:**
```sql
-- Update statistics
ANALYZE users;

-- Re-run EXPLAIN
-- Better estimates, better plan
```

## Optimization Techniques

### Technique 1: Add Missing Indexes

```sql
-- Before: Sequential scan
EXPLAIN SELECT * FROM orders WHERE user_id = 1;
-- Seq Scan (slow)

-- After: Create index
CREATE INDEX idx_orders_user_id ON orders(user_id);
EXPLAIN SELECT * FROM orders WHERE user_id = 1;
-- Index Scan (fast)
```

### Technique 2: Use Covering Indexes

```sql
-- Query only needs indexed columns
EXPLAIN
SELECT user_id, total FROM orders WHERE user_id = 1;
-- Index Scan (good)

-- Create covering index
CREATE INDEX idx_orders_user_total ON orders(user_id, total);
EXPLAIN
SELECT user_id, total FROM orders WHERE user_id = 1;
-- Index Only Scan (best - no table access!)
```

### Technique 3: Rewrite Query

```sql
-- Before: Subquery (may be slow)
EXPLAIN
SELECT * FROM users
WHERE id IN (SELECT user_id FROM orders WHERE total > 100);
-- May use nested loop

-- After: JOIN (often faster)
EXPLAIN
SELECT DISTINCT u.*
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.total > 100;
-- May use hash join (faster)
```

## Common Patterns

### Pattern 1: Check Index Usage

```sql
-- Verify index is being used
EXPLAIN
SELECT * FROM users WHERE email = 'user@example.com';

-- Look for "Index Scan" in output
-- If "Seq Scan", index not being used
```

### Pattern 2: Compare Plans

```sql
-- Compare two query approaches
EXPLAIN ANALYZE
-- Approach 1: Subquery
SELECT * FROM users WHERE id IN (SELECT user_id FROM orders);

EXPLAIN ANALYZE
-- Approach 2: EXISTS
SELECT * FROM users u WHERE EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id);

-- Compare Execution Time
```

### Pattern 3: Identify Bottlenecks

```sql
EXPLAIN ANALYZE
SELECT u.name, o.total, p.name
FROM users u
JOIN orders o ON u.id = o.user_id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id;

-- Look for nodes with high "actual time"
-- Those are bottlenecks
```

## Best Practices

1. **Always Use EXPLAIN ANALYZE**: Get real execution stats
2. **Check for Seq Scans**: On large tables, should use indexes
3. **Verify Index Usage**: Ensure indexes are actually used
4. **Compare Plans**: Test different query approaches
5. **Update Statistics**: Run ANALYZE regularly
6. **Look for High Costs**: Focus optimization on expensive operations

## Summary

**EXPLAIN Essentials:**

1. **EXPLAIN**: Shows execution plan without running
2. **EXPLAIN ANALYZE**: Runs query and shows real stats
3. **Key Metrics**: Cost, rows, actual time, execution time
4. **Scan Types**: Seq Scan (bad), Index Scan (good), Index Only Scan (best)
5. **Join Types**: Nested Loop, Hash Join, Merge Join
6. **Optimization**: Add indexes, rewrite queries, update statistics

**Key Takeaway:**
EXPLAIN and EXPLAIN ANALYZE are essential for query optimization. They show how the database executes queries, helping you identify bottlenecks and optimize performance. Always check execution plans for slow queries.

**What to Look For:**
- ✅ Index Scans (good)
- ✅ Low costs and execution times
- ❌ Sequential Scans on large tables (bad)
- ❌ High row estimate errors
- ❌ Expensive join operations

**Next Steps:**
- Learn [Query Execution Plans](execution_plans.md) for deeper analysis
- Study [Slow Query Analysis](slow_query_analysis.md) for troubleshooting
- Master [Proper Index Usage](proper_index_usage.md) for optimization

