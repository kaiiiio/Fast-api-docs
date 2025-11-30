# Index Scans vs Sequential Scans: Understanding Query Execution

Understanding when the database uses index scans vs sequential scans helps you optimize queries and interpret EXPLAIN output. This guide covers the differences and when each is used.

## Sequential Scan (Seq Scan)

**Sequential scan** reads every row in the table from start to finish, checking each row against the query condition.

### How It Works

```sql
-- Sequential scan process
SELECT * FROM users WHERE age > 30;

-- Database:
-- 1. Start at first row
-- 2. Check if age > 30
-- 3. If yes, include in result
-- 4. Move to next row
-- 5. Repeat for all rows
-- Time: O(n) - linear with table size
```

### When Sequential Scan is Used

```sql
-- ✅ Small tables (faster than index overhead)
SELECT * FROM small_table WHERE id = 1;
-- Table has 100 rows, index overhead not worth it

-- ✅ No index on queried column
SELECT * FROM users WHERE name = 'John';
-- No index on name column

-- ✅ Query returns most rows
SELECT * FROM users WHERE status != 'deleted';
-- Returns 90% of rows, index not helpful

-- ✅ Full table scan needed
SELECT COUNT(*) FROM users;
-- Must read all rows anyway
```

## Index Scan

**Index scan** uses an index to quickly locate matching rows, then fetches those rows from the table.

### How It Works

```sql
-- Index scan process
SELECT * FROM users WHERE email = 'user@example.com';
-- Index exists on email

-- Database:
-- 1. Search index for 'user@example.com'
-- 2. Find matching index entries (O(log n))
-- 3. Follow pointers to table rows
-- 4. Fetch rows from table
-- Time: O(log n) + number of matching rows
```

### When Index Scan is Used

```sql
-- ✅ Index exists on queried column
SELECT * FROM users WHERE email = 'user@example.com';
-- Index on email column

-- ✅ Query returns few rows
SELECT * FROM users WHERE id = 1;
-- Returns 1 row, index very helpful

-- ✅ Equality or range query
SELECT * FROM users WHERE age BETWEEN 18 AND 65;
-- Index on age, returns subset of rows
```

## EXPLAIN Output

### Sequential Scan

```sql
EXPLAIN SELECT * FROM users WHERE name = 'John';

-- Output:
-- Seq Scan on users (cost=0.00..1000.00 rows=1 width=64)
--   Filter: (name = 'John'::text)
-- 
-- cost: Estimated cost (0.00 to start, 1000.00 total)
-- rows: Estimated rows returned
-- Filter: Condition applied during scan
```

### Index Scan

```sql
EXPLAIN SELECT * FROM users WHERE email = 'user@example.com';

-- Output:
-- Index Scan using idx_users_email on users (cost=0.42..8.44 rows=1 width=64)
--   Index Cond: (email = 'user@example.com'::text)
-- 
-- Index Scan: Using index idx_users_email
-- Index Cond: Condition used in index
-- cost: Lower cost (index is faster)
```

## When Database Chooses Each

### Factors Affecting Choice

```sql
-- Database considers:
-- 1. Table size
-- 2. Index selectivity
-- 3. Query selectivity (how many rows returned)
-- 4. Index cost vs scan cost
-- 5. Statistics (ANALYZE)
```

### Example: Small Table

```sql
-- Small table: Sequential scan
CREATE TABLE small_table (id INTEGER, name VARCHAR(255));
-- 100 rows

SELECT * FROM small_table WHERE id = 1;
-- Sequential scan (index overhead not worth it)
```

### Example: Large Table

```sql
-- Large table: Index scan
CREATE TABLE large_table (id INTEGER, name VARCHAR(255));
-- 1,000,000 rows
CREATE INDEX idx_large_table_id ON large_table(id);

SELECT * FROM large_table WHERE id = 1;
-- Index scan (much faster than sequential scan)
```

## Index Scan Types

### Index Scan

```sql
-- Basic index scan
EXPLAIN SELECT * FROM users WHERE email = 'user@example.com';
-- Index Scan using idx_users_email
-- Fetches rows from table after index lookup
```

### Index Only Scan

```sql
-- Index only scan (covering index)
CREATE INDEX idx_users_email_name ON users(email, name);

EXPLAIN SELECT email, name FROM users WHERE email = 'user@example.com';
-- Index Only Scan using idx_users_email_name
-- Doesn't need to access table (all data in index)
```

### Bitmap Index Scan

```sql
-- Bitmap index scan (multiple conditions)
EXPLAIN SELECT * FROM users 
WHERE email LIKE 'user%@example.com' AND age > 30;
-- Bitmap Index Scan on idx_users_email
-- Bitmap Index Scan on idx_users_age
-- BitmapAnd
-- Recheck Cond
-- Bitmap Heap Scan on users
```

## Performance Comparison

### Sequential Scan

```
Time: O(n)
- Reads all rows
- Simple but slow for large tables
- Good for small tables or full scans
```

### Index Scan

```
Time: O(log n) + matching rows
- Fast lookup in index
- Fetches only matching rows
- Good for selective queries
```

## Real-World Examples

### Example 1: Selective Query

```sql
-- Query returns 1 row out of 1M
SELECT * FROM users WHERE email = 'user@example.com';

-- Sequential scan: Read 1M rows, check each
-- Index scan: Search index, fetch 1 row
-- Winner: Index scan (much faster)
```

### Example 2: Non-Selective Query

```sql
-- Query returns 900K rows out of 1M
SELECT * FROM users WHERE status != 'deleted';

-- Sequential scan: Read 1M rows
-- Index scan: Search index, fetch 900K rows
-- Winner: Sequential scan (index overhead not worth it)
```

### Example 3: Small Table

```sql
-- Table has 100 rows
SELECT * FROM small_table WHERE id = 1;

-- Sequential scan: Read 100 rows (fast)
-- Index scan: Index lookup + fetch (overhead)
-- Winner: Sequential scan (index overhead not worth it)
```

## Forcing Index Usage

### PostgreSQL: enable_seqscan

```sql
-- Disable sequential scans (for testing)
SET enable_seqscan = OFF;

EXPLAIN SELECT * FROM users WHERE name = 'John';
-- Will try to use index even if not optimal

-- Re-enable
SET enable_seqscan = ON;
```

### MySQL: USE INDEX

```sql
-- Force index usage
SELECT * FROM users USE INDEX (idx_users_name) WHERE name = 'John';

-- Ignore index
SELECT * FROM users IGNORE INDEX (idx_users_name) WHERE name = 'John';
```

## Best Practices

1. **Let Database Decide**: Usually makes good choices
2. **Analyze Statistics**: Run ANALYZE for accurate decisions
3. **Monitor EXPLAIN**: Check if index is used when expected
4. **Add Indexes**: For frequently queried columns
5. **Consider Selectivity**: Index helps when query is selective

## Common Issues

### Issue 1: Index Not Used

```sql
-- Problem: Index exists but not used
EXPLAIN SELECT * FROM users WHERE LOWER(email) = 'user@example.com';
-- Sequential scan (function on column prevents index use)

-- Solution: Expression index
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
```

### Issue 2: Statistics Outdated

```sql
-- Problem: Statistics outdated, wrong choice
-- Solution: Update statistics
ANALYZE users;

-- Re-run EXPLAIN
EXPLAIN SELECT * FROM users WHERE email = 'user@example.com';
```

## Summary

**Index Scans vs Sequential Scans:**

1. **Sequential Scan**: Reads all rows, O(n) time
2. **Index Scan**: Uses index to find rows, O(log n) + matches
3. **Database Chooses**: Based on cost estimation
4. **Factors**: Table size, selectivity, index availability
5. **Monitor**: Use EXPLAIN to verify index usage

**Key Takeaway:**
The database chooses between index scans and sequential scans based on cost estimation. Sequential scans read all rows and are good for small tables or non-selective queries. Index scans use indexes to quickly find matching rows and are good for selective queries on large tables. Use EXPLAIN to see which is used and optimize accordingly.

**When Each is Used:**
- Sequential: Small tables, no index, non-selective queries
- Index: Large tables, selective queries, index available

**Next Steps:**
- Learn [EXPLAIN ANALYZE](../10_performance_optimization/explain_analyze.md) for query analysis
- Study [Query Optimization](../10_performance_optimization/query_optimization_tips.md) for techniques
- Master [Index Selectivity](index_selectivity.md) for optimization

