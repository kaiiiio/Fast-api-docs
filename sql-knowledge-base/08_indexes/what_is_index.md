# What is an Index: Understanding Database Indexes

Indexes are one of the most important concepts in database performance. Understanding how they work is crucial for writing efficient queries and designing performant databases.

## What is an Index?

An **index** is a data structure that improves the speed of data retrieval operations on a database table. Think of it like an index in a book - instead of reading every page to find a topic, you look it up in the index and go directly to the right page.

### Real-World Analogy

**Without an index (Full Table Scan):**
```
Finding "John Doe" in a phone book without alphabetization:
- Start at page 1
- Read every name
- Continue until you find "John Doe"
- Time: O(n) - linear search
```

**With an index (Index Scan):**
```
Finding "John Doe" in an alphabetized phone book:
- Jump to "J" section
- Find "Doe"
- Find "John"
- Time: O(log n) - binary search
```

## How Indexes Work

### Without an Index

```sql
-- Query: Find user by email
SELECT * FROM users WHERE email = 'john@example.com';
```

**What happens:**
1. Database scans entire `users` table row by row
2. Compares each `email` value with 'john@example.com'
3. Returns matching row(s)
4. **Time Complexity: O(n)** - Must check every row

**For 1 million users:**
- Worst case: Check all 1,000,000 rows
- Average case: Check ~500,000 rows
- **Very slow!**

### With an Index

```sql
-- Create index on email
CREATE INDEX idx_users_email ON users(email);

-- Same query
SELECT * FROM users WHERE email = 'john@example.com';
```

**What happens:**
1. Database uses index to find email quickly
2. Index points directly to row location
3. Database retrieves only that row
4. **Time Complexity: O(log n)** - Binary search in index

**For 1 million users:**
- Index lookup: ~20 comparisons (log₂(1,000,000) ≈ 20)
- Direct row access: 1 row read
- **Very fast!**

## Index Structure: B-Tree

Most database indexes use **B-Tree** (Balanced Tree) data structure.

### B-Tree Visualization

```
                    [50]
                   /    \
              [25]        [75]
             /   \       /    \
        [10] [30]   [60] [90]
        / |  / |   / |  / |
      [5][15][20][35][55][65][80][95]
```

**Properties:**
- **Balanced**: All leaf nodes at same depth
- **Sorted**: Data is sorted within the tree
- **Efficient**: O(log n) search, insert, delete
- **Wide**: Each node can have many children (reduces depth)

### How B-Tree Index Works

**Example: Finding user with id = 42**

```
Index Structure (simplified):
                    [50]
                   /    \
              [25]        [75]
             /   \       /    \
        [10] [30]   [60] [90]

Search Process:
1. Start at root [50]
   - 42 < 50, go left
2. Check [25]
   - 42 > 25, go right
3. Check [30]
   - 42 > 30, continue right
4. Found! Points to row location
```

**Only 3-4 comparisons instead of scanning thousands of rows!**

## Types of Indexes

### 1. Single-Column Index

Index on one column.

```sql
-- Create index on email column
CREATE INDEX idx_users_email ON users(email);

-- Query uses index
SELECT * FROM users WHERE email = 'john@example.com';
```

**Use when:**
- Frequently filtering by this column
- Column used in WHERE clauses
- Column used in JOIN conditions

### 2. Composite Index (Multi-Column)

Index on multiple columns.

```sql
-- Create composite index
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at);

-- Query uses index
SELECT * FROM orders 
WHERE user_id = 1 AND created_at > '2024-01-01';
```

**Column Order Matters:**
```sql
-- ✅ Uses index (matches leftmost column)
SELECT * FROM orders WHERE user_id = 1;

-- ✅ Uses index (matches both columns)
SELECT * FROM orders 
WHERE user_id = 1 AND created_at > '2024-01-01';

-- ❌ May not use index efficiently (doesn't match leftmost)
SELECT * FROM orders WHERE created_at > '2024-01-01';
```

**Rule:** Leftmost prefix rule - index is used if query matches columns from left to right.

### 3. Unique Index

Ensures uniqueness and provides fast lookups.

```sql
-- Create unique index
CREATE UNIQUE INDEX idx_users_email_unique ON users(email);

-- Automatically created when you define UNIQUE constraint
ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
```

**Benefits:**
- Fast lookups (like regular index)
- Enforces uniqueness
- Prevents duplicate values

### 4. Partial Index

Index on subset of rows (PostgreSQL).

```sql
-- Index only active users
CREATE INDEX idx_users_active_email ON users(email) 
WHERE is_active = true;

-- Query uses index
SELECT * FROM users 
WHERE is_active = true AND email = 'john@example.com';
```

**Benefits:**
- Smaller index size
- Faster for filtered queries
- Less maintenance overhead

## When to Create Indexes

### ✅ Create Indexes For:

1. **Primary Keys** (automatic)
   ```sql
   -- Automatically indexed
   CREATE TABLE users (id INT PRIMARY KEY);
   ```

2. **Foreign Keys** (usually)
   ```sql
   -- Index for JOINs
   CREATE INDEX idx_orders_user_id ON orders(user_id);
   ```

3. **Frequently Queried Columns**
   ```sql
   -- Users often search by email
   CREATE INDEX idx_users_email ON users(email);
   ```

4. **Columns in WHERE Clauses**
   ```sql
   -- Filter by status often
   CREATE INDEX idx_orders_status ON orders(status);
   ```

5. **Columns in ORDER BY**
   ```sql
   -- Sort by created_at often
   CREATE INDEX idx_orders_created ON orders(created_at);
   ```

6. **Columns in JOIN Conditions**
   ```sql
   -- Join on user_id
   CREATE INDEX idx_orders_user_id ON orders(user_id);
   ```

### ❌ Don't Create Indexes For:

1. **Small Tables** (< 1000 rows)
   - Index overhead may exceed benefits
   - Full table scan is fast enough

2. **Columns Rarely Queried**
   - Index maintenance cost > query benefit

3. **Columns with Low Selectivity**
   ```sql
   -- Bad: Only 2-3 distinct values
   CREATE INDEX idx_users_gender ON users(gender);  -- M/F/Other
   ```

4. **Frequently Updated Columns**
   - Every update requires index maintenance
   - Balance: Query speed vs. Write speed

5. **Text Columns (Very Long)**
   ```sql
   -- Very expensive for long text
   CREATE INDEX idx_posts_content ON posts(content);  -- content is TEXT
   ```

## Index Trade-offs

### Benefits

1. **Faster Queries**: O(log n) vs O(n) lookups
2. **Faster Sorts**: Index is already sorted
3. **Faster JOINs**: Index helps find matching rows
4. **Enforce Uniqueness**: Unique indexes prevent duplicates

### Costs

1. **Storage Space**: Indexes take disk space
   ```sql
   -- Index might be 10-20% of table size
   -- Table: 1GB → Index: ~150MB
   ```

2. **Write Performance**: Slower INSERTs, UPDATEs, DELETEs
   ```sql
   -- Every INSERT must update index
   INSERT INTO users (email, name) VALUES ('new@example.com', 'New User');
   -- Updates: users table + email index
   ```

3. **Maintenance Overhead**: Indexes need to be maintained
   - Rebuilding after bulk operations
   - Statistics updates
   - Vacuum operations (PostgreSQL)

## Index Usage Examples

### Example 1: Simple Lookup

```sql
-- Without index
EXPLAIN SELECT * FROM users WHERE email = 'john@example.com';
-- Seq Scan on users (cost=0.00..1000.00 rows=1 width=64)

-- With index
CREATE INDEX idx_users_email ON users(email);
EXPLAIN SELECT * FROM users WHERE email = 'john@example.com';
-- Index Scan using idx_users_email (cost=0.42..8.44 rows=1 width=64)
```

**Performance Improvement:**
- Without index: 1000 cost units
- With index: 8.44 cost units
- **~118x faster!**

### Example 2: Range Query

```sql
-- Index on created_at
CREATE INDEX idx_orders_created ON orders(created_at);

-- Range query uses index
SELECT * FROM orders 
WHERE created_at BETWEEN '2024-01-01' AND '2024-01-31';
-- Index Scan using idx_orders_created
```

### Example 3: JOIN Performance

```sql
-- Index on foreign key
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- JOIN uses index
SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.id = 1;
-- Uses index on orders.user_id for fast lookup
```

## Monitoring Index Usage

### PostgreSQL: Check Index Usage

```sql
-- See which indexes are being used
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,  -- Number of times index was used
    idx_tup_read,  -- Rows read via index
    idx_tup_fetch  -- Rows fetched via index
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Find Unused Indexes

```sql
-- Indexes never used (candidates for removal)
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexname NOT LIKE '%_pkey'  -- Don't remove primary keys
ORDER BY pg_relation_size(indexrelid) DESC;  -- Largest unused indexes first
```

## Index Maintenance

### Rebuild Indexes

```sql
-- PostgreSQL: Rebuild index
REINDEX INDEX idx_users_email;

-- Rebuild all indexes on table
REINDEX TABLE users;

-- Rebuild all indexes in database
REINDEX DATABASE mydb;
```

### Update Statistics

```sql
-- Update table statistics (helps query planner)
ANALYZE users;

-- Analyze all tables
ANALYZE;
```

## Best Practices

### 1. **Index Foreign Keys**

```sql
-- Always index foreign keys (used in JOINs)
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
```

### 2. **Composite Index Column Order**

```sql
-- Order by selectivity (most selective first)
-- If user_id filters to 1% of rows, created_at to 10%:
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at);
-- Not: (created_at, user_id)
```

### 3. **Don't Over-Index**

```sql
-- ❌ Bad: Too many indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_name ON users(name);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_created ON users(created_at);
-- Every INSERT updates 4 indexes!

-- ✅ Good: Index only what's needed
CREATE INDEX idx_users_email ON users(email);  -- Most queried
CREATE INDEX idx_users_created ON users(created_at);  -- Used in sorting
```

### 4. **Monitor and Remove Unused Indexes**

```sql
-- Regularly check for unused indexes
-- Remove if not used for 30+ days
DROP INDEX idx_unused_column;
```

### 5. **Use EXPLAIN to Verify**

```sql
-- Always check if index is being used
EXPLAIN ANALYZE 
SELECT * FROM users WHERE email = 'john@example.com';

-- Look for "Index Scan" in output
```

## Common Mistakes

### ❌ Indexing Every Column

```sql
-- Bad: Indexes on everything
CREATE INDEX idx_users_id ON users(id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_name ON users(name);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_created ON users(created_at);
-- Slows down writes significantly!
```

### ❌ Wrong Composite Index Order

```sql
-- Bad: Less selective column first
CREATE INDEX idx_orders_status_user ON orders(status, user_id);
-- status has only 5 values, user_id has thousands

-- Good: More selective column first
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
```

### ❌ Not Indexing Foreign Keys

```sql
-- Bad: No index on foreign key
CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id INT REFERENCES users(id)  -- No index!
);
-- JOINs will be slow!

-- Good: Index foreign key
CREATE INDEX idx_orders_user_id ON orders(user_id);
```

## Summary

**Index Essentials:**

1. **What**: Data structure for fast lookups (like book index)
2. **Structure**: Usually B-Tree (balanced, sorted tree)
3. **Performance**: O(log n) vs O(n) without index
4. **Types**: Single-column, composite, unique, partial
5. **When to Use**: Foreign keys, frequently queried columns, WHERE/ORDER BY
6. **Trade-offs**: Faster reads, slower writes, storage cost
7. **Best Practice**: Index foreign keys, monitor usage, don't over-index

**Key Takeaway:**
Indexes are essential for database performance. They transform slow O(n) scans into fast O(log n) lookups. Always index foreign keys and frequently queried columns, but avoid over-indexing as it slows down writes.

**Performance Impact:**
- Without index: 1,000,000 row scan = ~1 second
- With index: 1,000,000 row lookup = ~0.01 seconds
- **100x faster!**

**Next Steps:**
- Learn [How Indexes Work Internally](how_indexes_work.md) for deeper understanding
- Study [Composite Indexes](composite_index.md) for multi-column scenarios
- Master [Index Scans vs Seq Scans](index_scans_vs_seq_scans.md) for query optimization

