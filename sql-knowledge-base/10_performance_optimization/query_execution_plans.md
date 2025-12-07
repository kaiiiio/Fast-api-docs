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

---

## 🎯 Interview Questions: SQL

### Q1: Explain what a query execution plan is and how to read it. Describe the key components of an execution plan (nodes, costs, row estimates) and explain how to use execution plans to identify performance bottlenecks and optimize queries.

**Answer:**

**Query Execution Plan Definition:**

A query execution plan is a detailed roadmap that shows how a database will execute a SQL query. It breaks down the query into a series of operations (nodes) that the database will perform, showing the order of operations, the algorithms used, and estimated costs. Understanding execution plans is essential for query optimization and performance tuning.

**How to View Execution Plans:**

**PostgreSQL:**
```sql
-- Show estimated plan (doesn't execute query)
EXPLAIN SELECT * FROM users WHERE email = 'john@example.com';

-- Show actual plan with execution statistics
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'john@example.com';

-- Show detailed plan with I/O statistics
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM users WHERE email = 'john@example.com';
```

**MySQL:**
```sql
-- Show execution plan
EXPLAIN SELECT * FROM users WHERE email = 'john@example.com';

-- Show detailed plan
EXPLAIN FORMAT=JSON SELECT * FROM users WHERE email = 'john@example.com';
```

**Key Components of Execution Plans:**

**1. Plan Nodes (Operations):**

Each node represents an operation the database will perform. Common nodes include:

**Scan Nodes:**
- **Seq Scan** (Sequential Scan): Reads entire table row by row
- **Index Scan**: Uses index to find rows
- **Index Only Scan**: Gets data entirely from index (covering index)
- **Bitmap Index Scan**: Uses bitmap to combine multiple index conditions

**Join Nodes:**
- **Nested Loop**: Iterates through outer table, looks up in inner table
- **Hash Join**: Builds hash table from one table, probes with other
- **Merge Join**: Merges two sorted inputs

**Other Nodes:**
- **Sort**: Sorts rows
- **Aggregate**: Performs aggregations (SUM, COUNT, etc.)
- **Limit**: Applies LIMIT clause
- **Filter**: Applies WHERE conditions

**2. Cost Estimates:**

Cost represents the estimated "expense" of an operation, typically in arbitrary units. It's composed of:
- **Startup Cost**: Cost before first row is returned
- **Total Cost**: Total cost to return all rows

**Cost Components:**
- **I/O Cost**: Disk reads/writes
- **CPU Cost**: Processing time
- **Memory Cost**: Memory usage

**3. Row Estimates:**

The optimizer estimates how many rows each operation will process or return:
- **Rows**: Estimated number of rows
- **Width**: Estimated average row size in bytes

**Example Execution Plan:**

```sql
EXPLAIN ANALYZE
SELECT u.name, o.total
FROM users u
INNER JOIN orders o ON u.id = o.user_id
WHERE u.country = 'USA'
ORDER BY o.total DESC
LIMIT 10;
```

**Execution Plan Output:**
```
Limit (cost=1250.50..1250.52 rows=10 width=32) (actual time=15.234..15.245 rows=10 loops=1)
  -> Sort (cost=1250.50..1275.00 rows=9800 width=32) (actual time=15.230..15.240 rows=9800 loops=1)
        Sort Key: o.total DESC
        Sort Method: quicksort Memory: 1024kB
        -> Hash Join (cost=250.00..850.00 rows=9800 width=32) (actual time=5.123..12.456 rows=9800 loops=1)
              Hash Cond: (o.user_id = u.id)
              -> Seq Scan on orders o (cost=0.00..400.00 rows=50000 width=12) (actual time=0.012..3.456 rows=50000 loops=1)
              -> Hash (cost=200.00..200.00 rows=10000 width=20) (actual time=2.123..2.123 rows=10000 loops=1)
                    Buckets: 16384  Batches: 1  Memory Usage: 512kB
                    -> Seq Scan on users u (cost=0.00..200.00 rows=10000 width=20) (actual time=0.012..1.234 rows=10000 loops=1)
                          Filter: (country = 'USA'::text)
                          Rows Removed by Filter: 90000
Planning Time: 0.123 ms
Execution Time: 15.456 ms
```

**Reading the Plan (Bottom to Top):**

**1. Leaf Nodes (Bottom):**
```
Seq Scan on users u
  Cost: 0.00..200.00
  Rows: 10,000 estimated, 10,000 actual
  Filter: country = 'USA'
  Rows Removed: 90,000 (filtered out)
```
- Scans users table
- Filters for USA users
- 10,000 rows match

**2. Hash Build:**
```
Hash
  Buckets: 16,384
  Memory: 512kB
  Builds hash table from filtered users
```

**3. Hash Join:**
```
Hash Join
  Hash Cond: o.user_id = u.id
  Joins orders with users using hash table
  Result: 9,800 rows
```

**4. Sort:**
```
Sort
  Sort Key: o.total DESC
  Method: quicksort
  Memory: 1024kB
  Sorts 9,800 rows
```

**5. Limit:**
```
Limit
  Returns top 10 rows
```

**Identifying Performance Bottlenecks:**

**1. High Cost Operations:**

Look for nodes with high costs relative to others:

```sql
EXPLAIN ANALYZE
SELECT * FROM large_table WHERE column1 = 'value';

-- Bad Plan:
Seq Scan on large_table (cost=0.00..500000.00 rows=1 width=100)
  -- Cost: 500,000 - Very high!
  -- Sequential scan on large table
  -- Solution: Create index on column1
```

**2. Sequential Scans on Large Tables:**

Sequential scans are often the biggest bottleneck:

```sql
-- Problem: Sequential scan
Seq Scan on orders (cost=0.00..250000.00 rows=1000000 width=50)
  -- Scanning 1 million rows sequentially
  -- Very slow!

-- Solution: Add index
CREATE INDEX idx_orders_user_id ON orders(user_id);
-- New plan: Index Scan using idx_orders_user_id
```

**3. Large Row Estimates vs Actual:**

If estimated rows differ significantly from actual rows, statistics may be outdated:

```sql
-- Estimated: 100 rows
-- Actual: 100,000 rows
-- Problem: Optimizer made poor decisions based on wrong estimates
-- Solution: Update statistics
ANALYZE table_name;
```

**4. Expensive Sorts:**

Large sorts can be slow and memory-intensive:

```sql
Sort (cost=50000.00..75000.00 rows=1000000 width=50)
  Sort Method: external merge  Disk: 50000kB
  -- Sorting 1 million rows
  -- Using disk (not enough memory)
  -- Very slow!

-- Solution: Add index on sort column
CREATE INDEX idx_orders_total ON orders(total);
-- Enables index scan (already sorted)
```

**5. Nested Loops with Large Inner Table:**

Nested loops can be slow if inner table is large:

```sql
Nested Loop (cost=0.00..1000000.00 rows=10000 width=50)
  -> Seq Scan on users (cost=0.00..1000.00 rows=10000)
  -> Index Scan on orders (cost=0.00..100.00 rows=1)
      Index Cond: (user_id = users.id)
  -- 10,000 iterations of index scan
  -- May be slow if index is not efficient

-- Solution: Consider hash join for large datasets
```

**Using Plans for Optimization:**

**Step 1: Identify the Bottleneck**

```sql
EXPLAIN ANALYZE
SELECT u.name, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;

-- Look for:
-- 1. Highest cost node
-- 2. Sequential scans
-- 3. Large row estimates
-- 4. Expensive operations
```

**Step 2: Add Indexes**

```sql
-- If plan shows sequential scan:
Seq Scan on orders (cost=0.00..250000.00 rows=1000000)

-- Add index:
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Re-check plan:
Index Scan using idx_orders_user_id (cost=0.43..2500.00 rows=1000000)
-- Much better!
```

**Step 3: Rewrite Query**

```sql
-- Original (slow):
SELECT * FROM users 
WHERE id IN (SELECT user_id FROM orders WHERE total > 100);

-- Plan may show: Sequential scan + subquery

-- Rewritten (faster):
SELECT DISTINCT u.*
FROM users u
INNER JOIN orders o ON u.id = o.user_id
WHERE o.total > 100;

-- Plan may show: Hash join (more efficient)
```

**Step 4: Verify Improvement**

```sql
-- Compare plans before and after
EXPLAIN ANALYZE <query>;
-- Note execution time

-- Make optimization
CREATE INDEX ...;

-- Re-check
EXPLAIN ANALYZE <query>;
-- Compare execution time - should be faster
```

**Visual Plan Representation:**

```
Execution Plan Tree:
                    Limit
                     │
                     ▼
                    Sort
                     │
                     ▼
                 Hash Join
                /         \
               ▼           ▼
         Seq Scan      Hash Build
        (orders)            │
                            ▼
                       Seq Scan
                       (users)
                            │
                      Filter: country='USA'
```

**System Design Consideration**: Understanding execution plans is essential for:
1. **Performance Tuning**: Identifying slow operations and optimizing them
2. **Index Design**: Creating indexes that the optimizer can use effectively
3. **Query Optimization**: Rewriting queries to enable better execution plans
4. **Capacity Planning**: Understanding resource usage (memory, I/O, CPU)

Query execution plans are the key to understanding database performance. They reveal how queries are executed, where time is spent, and how to optimize. Learning to read and interpret execution plans is one of the most valuable skills for database performance tuning and optimization.

---

### Q2: Explain how to use EXPLAIN and EXPLAIN ANALYZE to diagnose query performance issues. What is the difference between estimated costs and actual execution times, and why might they differ? Provide examples of common performance problems and how to identify them in execution plans.

**Answer:**

**EXPLAIN vs EXPLAIN ANALYZE:**

**EXPLAIN:**
- Shows the **estimated** execution plan
- Does **not execute** the query
- Provides cost estimates and row estimates
- Fast (no query execution)
- Useful for understanding optimizer decisions

**EXPLAIN ANALYZE:**
- Shows the **actual** execution plan
- **Executes** the query
- Provides actual execution times and row counts
- Slower (query is executed)
- Essential for performance diagnosis

**Key Differences:**

**1. Execution:**
- **EXPLAIN**: Query is NOT executed
- **EXPLAIN ANALYZE**: Query IS executed

**2. Timing Information:**
- **EXPLAIN**: No timing information
- **EXPLAIN ANALYZE**: Actual execution times

**3. Row Counts:**
- **EXPLAIN**: Estimated row counts
- **EXPLAIN ANALYZE**: Actual row counts

**4. Use Cases:**
- **EXPLAIN**: Quick plan inspection, understanding optimizer choices
- **EXPLAIN ANALYZE**: Performance diagnosis, verifying optimizations

**Understanding Cost vs Actual Time:**

**Cost Estimates:**

Cost is an abstract unit representing the "expense" of an operation. It's calculated based on:
- Table statistics (row counts, data distribution)
- Index availability
- System configuration
- Estimated I/O and CPU usage

**Actual Execution Time:**

Actual time is measured in milliseconds and represents real execution time. It includes:
- Actual I/O operations
- Actual CPU processing
- Network latency (for remote queries)
- Lock contention
- Cache hits/misses

**Why They Differ:**

**1. Outdated Statistics:**

```sql
-- Table has grown significantly, but statistics are old
EXPLAIN SELECT * FROM users WHERE country = 'USA';
-- Estimated rows: 10,000 (based on old stats)
-- Actual rows: 100,000 (table grew)

EXPLAIN ANALYZE SELECT * FROM users WHERE country = 'USA';
-- Actual rows: 100,000
-- Actual time: Much higher than estimated
-- Problem: Statistics outdated
-- Solution: Run ANALYZE users;
```

**2. Cache Effects:**

```sql
-- First execution (cold cache)
EXPLAIN ANALYZE SELECT * FROM users WHERE id = 1;
-- Actual time: 15.234 ms (data loaded from disk)

-- Second execution (warm cache)
EXPLAIN ANALYZE SELECT * FROM users WHERE id = 1;
-- Actual time: 0.123 ms (data in memory)
-- Cost estimate: Same (doesn't account for cache)
```

**3. Data Distribution:**

```sql
-- Optimizer assumes uniform distribution
EXPLAIN SELECT * FROM orders WHERE status = 'pending';
-- Estimated: 10% of rows (uniform assumption)
-- Cost: Based on 10% estimate

-- Actual distribution: 90% are pending
EXPLAIN ANALYZE SELECT * FROM orders WHERE status = 'pending';
-- Actual: 90% of rows
-- Actual time: Much higher (9x more rows than estimated)
-- Problem: Poor statistics on data distribution
-- Solution: Create histogram statistics
```

**4. Index Selectivity:**

```sql
-- Optimizer may overestimate index selectivity
EXPLAIN SELECT * FROM users WHERE email = 'john@example.com';
-- Estimated: 1 row (assumes unique)
-- Cost: Low (index scan expected)

-- Actual: Email not unique, 100 rows match
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'john@example.com';
-- Actual: 100 rows
-- Actual time: Higher (more rows than estimated)
```

**Common Performance Problems in Execution Plans:**

**Problem 1: Sequential Scan on Large Table**

**Symptom:**
```sql
EXPLAIN ANALYZE
SELECT * FROM orders WHERE user_id = 123;

Seq Scan on orders (cost=0.00..250000.00 rows=1 width=50) 
  (actual time=1234.567..1234.890 rows=1 loops=1)
  Filter: (user_id = 123)
  Rows Removed by Filter: 9999999
Planning Time: 0.123 ms
Execution Time: 1234.890 ms
```

**Analysis:**
- Sequential scan on 10 million row table
- Scanned all rows, filtered out 9,999,999
- Very slow (1.2 seconds)
- No index used

**Solution:**
```sql
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- New plan:
Index Scan using idx_orders_user_id (cost=0.43..8.45 rows=1 width=50)
  (actual time=0.012..0.015 rows=1 loops=1)
  Index Cond: (user_id = 123)
Planning Time: 0.123 ms
Execution Time: 0.015 ms
-- 80,000x faster!
```

**Problem 2: Poor Join Order**

**Symptom:**
```sql
EXPLAIN ANALYZE
SELECT u.name, o.total
FROM large_table l
JOIN users u ON l.user_id = u.id
JOIN orders o ON u.id = o.user_id
WHERE l.status = 'active';

Hash Join (cost=500000.00..1000000.00 rows=1000000 width=32)
  (actual time=5000.123..10000.456 rows=1000000 loops=1)
  Hash Cond: (u.id = o.user_id)
  -> Hash Join (cost=250000.00..500000.00 rows=5000000 width=20)
        Hash Cond: (l.user_id = u.id)
        -> Seq Scan on large_table l (cost=0.00..200000.00 rows=5000000)
              Filter: (status = 'active'::text)
        -> Seq Scan on users u (cost=0.00..50000.00 rows=1000000)
  -> Seq Scan on orders o (cost=0.00..250000.00 rows=10000000)
```

**Analysis:**
- Joining large tables first
- Creating huge intermediate result (5 million rows)
- Then joining with another large table
- Very inefficient

**Solution:**
```sql
-- Filter early, join smaller tables first
-- Add indexes
CREATE INDEX idx_large_table_status ON large_table(status);
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Optimizer may choose better join order
-- Or rewrite query to guide optimizer
SELECT u.name, o.total
FROM (SELECT user_id FROM large_table WHERE status = 'active') l
JOIN users u ON l.user_id = u.id
JOIN orders o ON u.id = o.user_id;
```

**Problem 3: Expensive Sort Operation**

**Symptom:**
```sql
EXPLAIN ANALYZE
SELECT * FROM orders ORDER BY total DESC LIMIT 10;

Limit (cost=250000.00..250012.50 rows=10 width=50)
  (actual time=5000.123..5000.234 rows=10 loops=1)
  -> Sort (cost=250000.00..275000.00 rows=10000000 width=50)
        (actual time=5000.120..5000.230 rows=10 loops=1)
        Sort Key: total DESC
        Sort Method: external merge  Disk: 500000kB
        -> Seq Scan on orders (cost=0.00..200000.00 rows=10000000 width=50)
              (actual time=0.012..2000.456 rows=10000000 loops=1)
Planning Time: 0.123 ms
Execution Time: 5000.234 ms
```

**Analysis:**
- Sorting 10 million rows
- Using disk (external merge) - not enough memory
- Very slow (5 seconds)
- Only need top 10, but sorting everything

**Solution:**
```sql
-- Option 1: Add index (enables index scan, already sorted)
CREATE INDEX idx_orders_total_desc ON orders(total DESC);

-- New plan:
Limit (cost=0.43..1.23 rows=10 width=50)
  (actual time=0.012..0.015 rows=10 loops=1)
  -> Index Scan using idx_orders_total_desc (cost=0.43..250000.00 rows=10000000)
        (actual time=0.012..0.015 rows=10 loops=1)
-- Much faster! Index is already sorted
```

**Problem 4: N+1 Query Pattern (Multiple Executions)**

**Symptom:**
```sql
EXPLAIN ANALYZE
SELECT u.name, 
       (SELECT COUNT(*) FROM orders WHERE user_id = u.id) AS order_count
FROM users u;

Seq Scan on users u (cost=0.00..25000.00 rows=100000 width=20)
  (actual time=0.012..5000.123 rows=100000 loops=1)
  SubPlan 1
    -> Aggregate (cost=25.00..25.01 rows=1 width=8)
          (actual time=0.050..0.050 rows=1 loops=100000)
          -> Index Scan using idx_orders_user_id (cost=0.43..24.58 rows=10)
                (actual time=0.012..0.045 rows=10 loops=100000)
Planning Time: 0.123 ms
Execution Time: 10000.456 ms
```

**Analysis:**
- Subquery executed 100,000 times (once per user)
- Each execution: 0.050 ms
- Total: 100,000 * 0.050 = 5,000 ms just for subquery
- Very inefficient

**Solution:**
```sql
-- Rewrite with JOIN and GROUP BY
EXPLAIN ANALYZE
SELECT u.name, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;

HashAggregate (cost=275000.00..300000.00 rows=100000 width=28)
  (actual time=2000.123..2500.456 rows=100000 loops=1)
  Group Key: u.id, u.name
  -> Hash Right Join (cost=250000.00..270000.00 rows=1000000 width=20)
        (actual time=500.123..1500.456 rows=1000000 loops=1)
        Hash Cond: (o.user_id = u.id)
        -> Seq Scan on orders o (cost=0.00..200000.00 rows=1000000)
        -> Hash (cost=25000.00..25000.00 rows=100000 width=20)
              -> Seq Scan on users u (cost=0.00..25000.00 rows=100000)
Planning Time: 0.123 ms
Execution Time: 2500.456 ms
-- 4x faster!
```

**Problem 5: Missing Index on WHERE Clause**

**Symptom:**
```sql
EXPLAIN ANALYZE
SELECT * FROM users WHERE email = 'john@example.com' AND status = 'active';

Seq Scan on users (cost=0.00..250000.00 rows=1 width=50)
  (actual time=1234.567..1234.890 rows=1 loops=1)
  Filter: ((email = 'john@example.com'::text) AND (status = 'active'::text))
  Rows Removed by Filter: 9999999
Planning Time: 0.123 ms
Execution Time: 1234.890 ms
```

**Analysis:**
- Sequential scan
- Filtering 10 million rows
- Very slow

**Solution:**
```sql
-- Add composite index
CREATE INDEX idx_users_email_status ON users(email, status);

-- New plan:
Index Scan using idx_users_email_status (cost=0.43..8.45 rows=1 width=50)
  (actual time=0.012..0.015 rows=1 loops=1)
  Index Cond: ((email = 'john@example.com'::text) AND (status = 'active'::text))
-- Much faster!
```

**Diagnostic Workflow:**

**Step 1: Run EXPLAIN ANALYZE**
```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT ...;
```

**Step 2: Identify Bottlenecks**
- Look for highest actual time
- Find sequential scans
- Check for large row estimate differences
- Identify expensive operations

**Step 3: Check Statistics**
```sql
-- Update statistics if estimates are wrong
ANALYZE table_name;

-- Check table statistics
SELECT * FROM pg_stats WHERE tablename = 'table_name';
```

**Step 4: Add Indexes**
```sql
-- Based on plan, add missing indexes
CREATE INDEX ...;
```

**Step 5: Verify Improvement**
```sql
-- Re-run EXPLAIN ANALYZE
-- Compare execution times
-- Ensure actual time decreased
```

**System Design Consideration**: Using EXPLAIN and EXPLAIN ANALYZE effectively is crucial for:
1. **Performance Diagnosis**: Identifying why queries are slow
2. **Optimization**: Verifying that optimizations actually improve performance
3. **Capacity Planning**: Understanding resource usage
4. **Index Strategy**: Creating indexes that actually help

EXPLAIN and EXPLAIN ANALYZE are essential tools for query performance tuning. Understanding the difference between estimated costs and actual times, and knowing how to identify common performance problems in execution plans, enables effective database optimization and performance improvement.

