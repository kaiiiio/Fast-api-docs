# B-Tree Index: The Most Common Index Type

B-Tree indexes are the default and most common index type in relational databases. They provide efficient lookups for equality and range queries.

## What is a B-Tree Index?

**B-Tree** (Balanced Tree) is a self-balancing tree data structure that maintains sorted data. It's optimized for disk-based storage and provides efficient search, insertion, and deletion.

### Key Characteristics

- **Balanced**: All leaf nodes at same depth
- **Sorted**: Data stored in sorted order
- **Efficient**: O(log n) search, insert, delete
- **Disk-Optimized**: Designed for block-based storage

## B-Tree Structure

### Visual Representation

```
                    [50]
                   /    \
              [25]        [75]
             /    \      /    \
          [10]  [30]  [60]  [90]
         /  \   /  \  /  \  /  \
      [5][15][20][35][55][65][80][95]
```

### Node Structure

```
Internal Node:
- Keys: [10, 25, 50]
- Pointers: [→<10, →10-25, →25-50, →>50]

Leaf Node:
- Keys: [5, 15]
- Pointers: [→row1, →row2]
- Next pointer: →next leaf
```

## How B-Tree Works

### Search Operation

```sql
-- Find value 35 in B-Tree
-- 1. Start at root: Compare 35 with 50 → go left
-- 2. Compare 35 with 25 → go right
-- 3. Compare 35 with 30 → go right
-- 4. Found at leaf: 35
-- 5. Follow pointer to row
```

### Insert Operation

```sql
-- Insert value 42
-- 1. Find correct leaf node
-- 2. Insert value in sorted order
-- 3. If node full, split node
-- 4. Promote middle value to parent
-- 5. Rebalance if needed
```

### Delete Operation

```sql
-- Delete value 35
-- 1. Find value in leaf node
-- 2. Remove value
-- 3. If node underflows, merge with sibling
-- 4. Rebalance tree
```

## B-Tree Index in Databases

### Default Index Type

```sql
-- PostgreSQL, MySQL, SQL Server default to B-Tree
CREATE INDEX idx_users_email ON users(email);
-- Creates B-Tree index (default)

-- Explicitly specify (PostgreSQL)
CREATE INDEX idx_users_email ON users USING btree(email);
```

### When B-Tree is Used

```sql
-- ✅ Equality queries
SELECT * FROM users WHERE email = 'user@example.com';

-- ✅ Range queries
SELECT * FROM users WHERE age BETWEEN 18 AND 65;

-- ✅ Comparison queries
SELECT * FROM users WHERE created_at > '2023-01-01';

-- ✅ ORDER BY
SELECT * FROM users ORDER BY email;

-- ✅ LIKE (with prefix)
SELECT * FROM users WHERE email LIKE 'user%@example.com';
```

## B-Tree Properties

### Balanced Tree

```
All leaf nodes at same depth:
- Ensures consistent performance
- No worst-case scenarios
- Predictable query time
```

### Sorted Order

```
Values stored in sorted order:
- Enables range queries
- Efficient ORDER BY
- Supports prefix matching
```

### Node Capacity

```
Each node can hold multiple keys:
- Reduces tree height
- Fewer disk reads
- Better cache utilization
```

## Real-World Examples

### Example 1: User Lookup

```sql
-- B-Tree index on email
CREATE INDEX idx_users_email ON users(email);

-- Query uses index
EXPLAIN SELECT * FROM users WHERE email = 'user@example.com';
-- Index Scan using idx_users_email
```

### Example 2: Range Query

```sql
-- B-Tree index on created_at
CREATE INDEX idx_orders_created ON orders(created_at);

-- Range query uses index
EXPLAIN SELECT * FROM orders 
WHERE created_at BETWEEN '2023-01-01' AND '2023-12-31';
-- Index Scan using idx_orders_created
```

### Example 3: Composite B-Tree

```sql
-- Composite B-Tree index
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- Query uses index
EXPLAIN SELECT * FROM orders 
WHERE user_id = 1 AND status = 'completed';
-- Index Scan using idx_orders_user_status
```

## B-Tree vs Other Index Types

### B-Tree vs Hash Index

```sql
-- B-Tree: Supports range queries
SELECT * FROM users WHERE age BETWEEN 18 AND 65;  -- ✅ Works

-- Hash Index: Only equality
SELECT * FROM users WHERE age = 25;  -- ✅ Works
SELECT * FROM users WHERE age BETWEEN 18 AND 65;  -- ❌ Doesn't work
```

### B-Tree vs Bitmap Index

```sql
-- B-Tree: Good for high cardinality
CREATE INDEX idx_users_email ON users(email);  -- Many unique values

-- Bitmap: Good for low cardinality
CREATE INDEX idx_orders_status ON orders(status);  -- Few values (pending, completed, cancelled)
```

## B-Tree Performance

### Search Time

```
B-Tree search: O(log n)
- n = number of rows
- Logarithmic time complexity
- Efficient even for large tables
```

### Example Performance

```
Table size: 1,000,000 rows
B-Tree height: ~20 levels
Disk reads: ~20 (one per level)
Time: Milliseconds

Without index:
Disk reads: 1,000,000 (full table scan)
Time: Seconds to minutes
```

## B-Tree Maintenance

### Insert Impact

```sql
-- Insert new row
INSERT INTO users (email, name) VALUES ('new@example.com', 'New');

-- B-Tree maintenance:
-- 1. Find correct leaf node: O(log n)
-- 2. Insert entry: O(1)
-- 3. Split if needed: O(1)
-- Total: O(log n)
```

### Update Impact

```sql
-- Update indexed column
UPDATE users SET email = 'updated@example.com' WHERE id = 1;

-- B-Tree maintenance:
-- 1. Delete old entry: O(log n)
-- 2. Insert new entry: O(log n)
-- Total: O(log n)
```

## Best Practices

1. **Default Choice**: Use B-Tree for most cases
2. **Composite Indexes**: Order columns by selectivity
3. **Monitor Size**: B-Tree indexes can grow large
4. **Rebuild Periodically**: Rebuild to maintain performance
5. **Analyze Usage**: Use EXPLAIN to verify index usage

## Common Mistakes

### ❌ Over-Indexing

```sql
-- ❌ Bad: Too many indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_name ON users(name);
CREATE INDEX idx_users_phone ON users(phone);
-- Slows down INSERT/UPDATE/DELETE

-- ✅ Good: Index only frequently queried columns
CREATE INDEX idx_users_email ON users(email);  -- Most common query
```

### ❌ Wrong Column Order

```sql
-- ❌ Bad: Low selectivity first
CREATE INDEX idx_orders_status_user ON orders(status, user_id);
-- status has few values, less selective

-- ✅ Good: High selectivity first
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
-- user_id more selective, better index usage
```

## Summary

**B-Tree Index:**

1. **Type**: Default index type in most databases
2. **Structure**: Balanced tree with sorted data
3. **Performance**: O(log n) search, insert, delete
4. **Use Cases**: Equality, range, ORDER BY queries
5. **Maintenance**: Automatic on data changes

**Key Takeaway:**
B-Tree indexes are the default and most versatile index type. They provide efficient O(log n) lookups for equality and range queries. They're balanced, sorted, and optimized for disk storage. Use B-Tree indexes for most indexing needs unless you have specific requirements for other index types.

**When to Use:**
- Most common queries (equality, range)
- Need sorted results (ORDER BY)
- General-purpose indexing

**Next Steps:**
- Learn [How Indexes Work Internally](how_indexes_work_internally.md) for mechanics
- Study [Composite Index](composite_index.md) for multi-column indexes
- Master [Index Selectivity](index_selectivity.md) for optimization

---

## 🎯 Interview Questions: SQL

### Q1: Explain B-tree indexes in detail, including their internal structure, how they work, and why they are the default index type in most databases. Provide examples showing how B-tree indexes improve query performance and explain their time complexity.

**Answer:**

**B-Tree Index Definition:**

A B-tree (Balanced Tree) index is a self-balancing tree data structure that maintains sorted data and allows efficient searches, insertions, and deletions. B-tree indexes are the default index type in most relational databases (PostgreSQL, MySQL, SQL Server) because they provide excellent performance for a wide range of query types while maintaining data in sorted order.

**B-Tree Structure:**

**Tree Properties:**
- **Balanced**: All leaf nodes are at the same depth
- **Sorted**: Data is stored in sorted order
- **Multi-level**: Tree has multiple levels (root, internal nodes, leaf nodes)
- **Node Capacity**: Each node can hold multiple keys and pointers

**Visual Structure:**

```
B-Tree Index on users.email:

                    [m@example.com]
                   /              \
          [d@example.com]    [s@example.com]
         /      |      \    /      |      \
    [a@...] [f@...] [j@...] [p@...] [t@...] [z@...]
     │      │      │      │      │      │
   Leaf   Leaf   Leaf   Leaf   Leaf   Leaf
   Nodes  Nodes  Nodes  Nodes  Nodes  Nodes
     │      │      │      │      │      │
   Data   Data   Data   Data   Data   Data
   Pages  Pages  Pages  Pages  Pages  Pages
```

**How B-Tree Index Works:**

**1. Search Operation:**

**Finding a Value:**
```sql
-- Query
SELECT * FROM users WHERE email = 'user@example.com';

-- B-Tree search process:
-- 1. Start at root node
-- 2. Compare 'user@example.com' with root keys
-- 3. Follow pointer to appropriate child node
-- 4. Repeat until leaf node reached
-- 5. Search leaf node for exact match
-- 6. Follow pointer to data page
-- 7. Return row
```

**Search Path:**
```
Root: [m@example.com]
  ↓ Compare: 'user@example.com' > 'm@example.com' → Go right
Internal: [s@example.com]
  ↓ Compare: 'user@example.com' > 's@example.com' → Go right
Leaf: [t@example.com, u@example.com, v@example.com]
  ↓ Found: 'user@example.com'
Data Page: Row with email = 'user@example.com'
```

**2. Range Queries:**

**B-Tree Supports Range Queries:**
```sql
-- Range query
SELECT * FROM users WHERE age BETWEEN 25 AND 35;

-- B-Tree process:
-- 1. Find first matching value (age = 25)
-- 2. Traverse leaf nodes in sorted order
-- 3. Continue until upper bound (age = 35)
-- 4. Return all matching rows
```

**Why B-Tree Supports Ranges:**
- Data is stored in sorted order
- Leaf nodes are linked together
- Can traverse sequentially from start to end

**3. Insert Operation:**

**Inserting a New Value:**
```sql
INSERT INTO users (email, name) VALUES ('new@example.com', 'New User');
```

**B-Tree Insert Process:**
1. **Search**: Find correct leaf node for 'new@example.com'
2. **Insert**: Add key to leaf node (if space available)
3. **Split**: If leaf node is full, split into two nodes
4. **Propagate**: If split occurred, update parent node
5. **Balance**: Tree remains balanced after insert

**Time Complexity:**
- **Search**: O(log n) - Height of tree
- **Insert**: O(log n) - Find position + insert
- **Delete**: O(log n) - Find + delete
- **Range Query**: O(log n + k) - Find start + traverse k results

**Why B-Tree is Default:**

**1. Versatility:**

**Supports Multiple Query Types:**
```sql
-- Equality: ✅ Efficient
SELECT * FROM users WHERE email = 'user@example.com';

-- Range: ✅ Efficient
SELECT * FROM users WHERE age BETWEEN 25 AND 35;

-- ORDER BY: ✅ Efficient (data already sorted)
SELECT * FROM users ORDER BY email;

-- Prefix: ✅ Efficient
SELECT * FROM users WHERE email LIKE 'user%@example.com';
```

**2. Balanced Structure:**

**Consistent Performance:**
```
B-Tree height for 1 million rows: ~20 levels
Search time: ~20 disk reads (one per level)
Consistent: Always O(log n), regardless of data distribution
```

**3. Disk-Optimized:**

**Node Size Matches Disk Pages:**
```
Typical disk page: 4KB or 8KB
B-Tree node: Matches page size
Efficient: One disk read per level
Minimizes I/O operations
```

**4. Maintains Sorted Order:**

**Benefits:**
- Efficient ORDER BY queries
- Range queries work well
- Can use for covering indexes
- Supports index-only scans

**Performance Examples:**

**Example 1: Equality Lookup**

**Without Index:**
```sql
SELECT * FROM users WHERE email = 'user@example.com';
-- Sequential scan: O(n)
-- 1,000,000 rows: Must check each row
-- Time: ~5,000ms (5 seconds)
-- Disk reads: ~10,000 pages
```

**With B-Tree Index:**
```sql
CREATE INDEX idx_users_email ON users(email);

SELECT * FROM users WHERE email = 'user@example.com';
-- Index scan: O(log n)
-- 1,000,000 rows: ~20 comparisons
-- Time: ~5ms
-- Disk reads: ~20 pages (one per level)
-- 1000x faster!
```

**Example 2: Range Query**

**Without Index:**
```sql
SELECT * FROM orders WHERE created_at BETWEEN '2024-01-01' AND '2024-01-31';
-- Sequential scan: O(n)
-- 10,000,000 rows: Must check each row
-- Time: ~50,000ms (50 seconds)
```

**With B-Tree Index:**
```sql
CREATE INDEX idx_orders_created ON orders(created_at);

SELECT * FROM orders WHERE created_at BETWEEN '2024-01-01' AND '2024-01-31';
-- Index range scan: O(log n + k)
-- Find start: ~20 comparisons
-- Traverse range: Sequential read
-- Time: ~100ms
-- 500x faster!
```

**Example 3: ORDER BY**

**Without Index:**
```sql
SELECT * FROM users ORDER BY email;
-- Must sort entire table: O(n log n)
-- 1,000,000 rows: Sort in memory or disk
-- Time: ~10,000ms
```

**With B-Tree Index:**
```sql
CREATE INDEX idx_users_email ON users(email);

SELECT * FROM users ORDER BY email;
-- Index already sorted: O(n)
-- Traverse index in order
-- Time: ~500ms
-- 20x faster!
```

**B-Tree vs Other Index Types:**

**1. B-Tree vs Hash Index:**

**B-Tree:**
```sql
-- ✅ Supports range queries
SELECT * FROM users WHERE age BETWEEN 25 AND 35;

-- ✅ Supports ORDER BY
SELECT * FROM users ORDER BY age;

-- ✅ Supports prefix searches
SELECT * FROM users WHERE email LIKE 'user%@example.com';
```

**Hash Index:**
```sql
-- ✅ Only equality queries
SELECT * FROM users WHERE email = 'user@example.com';

-- ❌ No range queries
SELECT * FROM users WHERE age BETWEEN 25 AND 35;  -- Cannot use hash index

-- ❌ No ORDER BY
SELECT * FROM users ORDER BY email;  -- Cannot use hash index
```

**2. B-Tree vs Bitmap Index:**

**B-Tree:**
```sql
-- ✅ Good for high cardinality (many unique values)
CREATE INDEX idx_users_email ON users(email);
-- email has many unique values
```

**Bitmap Index:**
```sql
-- ✅ Good for low cardinality (few unique values)
CREATE INDEX idx_orders_status ON orders(status);
-- status has few values (pending, completed, cancelled)
```

**B-Tree Maintenance:**

**1. Insert Impact:**

**Cost:**
```sql
INSERT INTO users (email, name) VALUES ('new@example.com', 'New');
-- 1. Find leaf node: O(log n)
-- 2. Insert key: O(1)
-- 3. Split if needed: O(1)
-- Total: O(log n)
```

**2. Update Impact:**

**If Indexed Column Updated:**
```sql
UPDATE users SET email = 'updated@example.com' WHERE id = 1;
-- 1. Delete old index entry: O(log n)
-- 2. Insert new index entry: O(log n)
-- Total: O(log n)
```

**3. Delete Impact:**

**Cost:**
```sql
DELETE FROM users WHERE id = 1;
-- 1. Find index entry: O(log n)
-- 2. Delete entry: O(log n)
-- Total: O(log n)
```

**Best Practices:**

**1. Index Frequently Queried Columns:**
```sql
-- Index columns used in WHERE, JOIN, ORDER BY
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_user_id ON orders(user_id);
```

**2. Consider Selectivity:**
```sql
-- High selectivity: Good for index
CREATE INDEX idx_users_email ON users(email);
-- email has many unique values

-- Low selectivity: May not help much
CREATE INDEX idx_users_gender ON users(gender);
-- gender has few values (M, F, Other)
```

**3. Monitor Index Usage:**
```sql
-- Check if index is being used
EXPLAIN SELECT * FROM users WHERE email = 'user@example.com';
-- Should show: Index Scan using idx_users_email
```

**System Design Consideration**: B-tree indexes are fundamental for:
1. **Query Performance**: Enabling fast lookups and range queries
2. **Scalability**: Maintaining performance as data grows
3. **Versatility**: Supporting multiple query patterns
4. **Database Design**: Understanding index choice impacts performance

B-tree indexes are the workhorse of database indexing. They provide O(log n) performance for searches, inserts, and deletes while maintaining sorted data. Their balanced structure ensures consistent performance, and their versatility supports equality, range, and sorted queries. Understanding B-tree indexes is essential for database performance optimization and query tuning.

