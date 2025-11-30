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

