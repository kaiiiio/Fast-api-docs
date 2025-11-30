# How Indexes Work Internally: Understanding Database Index Mechanics

Understanding how indexes work internally helps you make better indexing decisions and optimize query performance. This guide covers the internal mechanics of database indexes.

## What Happens When You Create an Index?

### Step 1: Index Creation

```sql
-- Create index
CREATE INDEX idx_users_email ON users(email);

-- Database:
-- 1. Scans entire table
-- 2. Extracts indexed column values
-- 3. Builds index structure (B-Tree)
-- 4. Stores index on disk
```

### Step 2: Index Structure

```
Index is a separate data structure:
- Contains sorted values
- Points to table rows
- Stored separately from table data
```

## B-Tree Index Structure

### B-Tree Overview

**B-Tree** (Balanced Tree) is the most common index structure. It's a self-balancing tree that maintains sorted data.

```
                    [50]
                   /    \
              [25]        [75]
             /    \      /    \
          [10]  [30]  [60]  [90]
         /  \   /  \  /  \  /  \
      [5][15][20][35][55][65][80][95]
```

### B-Tree Properties

- **Balanced**: All leaf nodes at same depth
- **Sorted**: Values in sorted order
- **Efficient**: O(log n) search time
- **Nodes**: Internal nodes contain keys, leaf nodes contain data pointers

## Index Lookup Process

### Step-by-Step Lookup

```sql
-- Query: Find user with email = 'user@example.com'
SELECT * FROM users WHERE email = 'user@example.com';

-- With index idx_users_email:
-- 1. Start at root node
-- 2. Compare 'user@example.com' with root keys
-- 3. Navigate to appropriate child node
-- 4. Repeat until leaf node
-- 5. Find matching value
-- 6. Follow pointer to table row
-- 7. Return row
```

### Visual Example

```
B-Tree Index (email):
                    [m@example.com]
                   /                \
          [a@example.com]      [z@example.com]
         /              \      /              \
    [a@...]      [g@...]  [m@...]      [s@...]
    
Search for 'user@example.com':
1. Root: Compare with 'm@example.com' → go right
2. Node: Compare with 'z@example.com' → go left
3. Leaf: Find 'user@example.com' → follow pointer to row
```

## Index vs Table Scan

### Table Scan (Sequential Scan)

```sql
-- Without index: Sequential scan
SELECT * FROM users WHERE email = 'user@example.com';

-- Process:
-- 1. Read first row, check email
-- 2. Read second row, check email
-- 3. Read third row, check email
-- ... (continues through entire table)
-- Time: O(n) - linear with table size
```

### Index Scan

```sql
-- With index: Index scan
SELECT * FROM users WHERE email = 'user@example.com';

-- Process:
-- 1. Search index (B-Tree): O(log n)
-- 2. Follow pointer to row: O(1)
-- Time: O(log n) - logarithmic
```

## Index Storage

### Physical Structure

```
Index File Structure:
- Header: Metadata (type, columns, statistics)
- Root Node: Top of B-Tree
- Internal Nodes: Navigation nodes
- Leaf Nodes: Contain keys and row pointers
```

### Row Pointers

```sql
-- Index entry contains:
-- 1. Indexed value (email)
-- 2. Row pointer (physical location or row ID)
-- 3. Additional metadata

Index Entry:
{
    key: 'user@example.com',
    pointer: (page_number, row_number),
    ...
}
```

## Index Maintenance

### Insert Operations

```sql
-- Insert new row
INSERT INTO users (email, name) VALUES ('new@example.com', 'New User');

-- Index maintenance:
-- 1. Insert row into table
-- 2. Find correct position in index
-- 3. Insert index entry
-- 4. Rebalance B-Tree if needed
```

### Update Operations

```sql
-- Update indexed column
UPDATE users SET email = 'updated@example.com' WHERE id = 1;

-- Index maintenance:
-- 1. Delete old index entry
-- 2. Insert new index entry
-- 3. Rebalance if needed
```

### Delete Operations

```sql
-- Delete row
DELETE FROM users WHERE id = 1;

-- Index maintenance:
-- 1. Delete row from table
-- 2. Delete index entry
-- 3. Rebalance if needed
```

## Index Types and Internal Structures

### B-Tree Index (Default)

```
Structure: Balanced tree
Use: Equality and range queries
Search: O(log n)
```

### Hash Index

```
Structure: Hash table
Use: Equality queries only
Search: O(1) average
Limitation: No range queries
```

### Bitmap Index

```
Structure: Bitmap per value
Use: Low cardinality columns
Search: Bitwise operations
```

## Index Selectivity

### High Selectivity

```sql
-- Email column: High selectivity (unique values)
CREATE INDEX idx_users_email ON users(email);

-- Index is very useful:
-- - Most queries return 1 row
-- - Index eliminates most rows
```

### Low Selectivity

```sql
-- Status column: Low selectivity (few values)
CREATE INDEX idx_orders_status ON orders(status);

-- Index less useful:
-- - Many rows per value
-- - Still need to scan many rows
```

## Index Size

### Factors Affecting Size

```sql
-- Index size depends on:
-- 1. Number of rows
-- 2. Key size (indexed column size)
-- 3. Number of indexes
-- 4. Overhead (pointers, metadata)

-- Example:
-- Table: 1M rows
-- Email: 50 bytes average
-- Index size: ~50MB (plus overhead)
```

## Index Usage in Queries

### When Index is Used

```sql
-- ✅ Index used: Equality
SELECT * FROM users WHERE email = 'user@example.com';

-- ✅ Index used: Range
SELECT * FROM users WHERE created_at > '2023-01-01';

-- ✅ Index used: ORDER BY
SELECT * FROM users ORDER BY email;
```

### When Index is NOT Used

```sql
-- ❌ Index not used: Function on column
SELECT * FROM users WHERE LOWER(email) = 'user@example.com';

-- ❌ Index not used: LIKE with leading wildcard
SELECT * FROM users WHERE email LIKE '%@example.com';

-- ❌ Index not used: Expression
SELECT * FROM users WHERE email || '@' = 'user@example.com';
```

## Composite Index Internals

### Multi-Column Index Structure

```sql
-- Composite index
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- Structure:
-- B-Tree sorted by (user_id, status)
-- First by user_id, then by status within same user_id
```

### Index Usage

```sql
-- ✅ Uses index: Both columns
SELECT * FROM orders WHERE user_id = 1 AND status = 'completed';

-- ✅ Uses index: First column only
SELECT * FROM orders WHERE user_id = 1;

-- ❌ Doesn't use index: Second column only
SELECT * FROM orders WHERE status = 'completed';
```

## Best Practices

1. **Understand Structure**: Know how B-Trees work
2. **Monitor Size**: Track index size
3. **Maintain**: Rebuild indexes periodically
4. **Analyze**: Use EXPLAIN to verify index usage
5. **Balance**: Don't over-index (writes become slower)

## Summary

**How Indexes Work Internally:**

1. **Structure**: B-Tree (balanced tree) for most indexes
2. **Lookup**: O(log n) search time vs O(n) table scan
3. **Storage**: Separate structure with pointers to rows
4. **Maintenance**: Updated on INSERT/UPDATE/DELETE
5. **Usage**: Used for equality, range, ORDER BY queries

**Key Takeaway:**
Indexes are separate data structures (usually B-Trees) that store sorted values and pointers to table rows. They enable O(log n) lookups instead of O(n) table scans. Indexes require maintenance on data changes and consume storage space. Understanding internal mechanics helps make better indexing decisions.

**Internal Process:**
- Index creation: Builds B-Tree structure
- Lookup: Navigate tree to find value, follow pointer to row
- Maintenance: Update index on data changes

**Next Steps:**
- Learn [What is an Index](what_is_index.md) for basics
- Study [B-Tree Index](b_tree_index.md) for details
- Master [Query Optimization](../10_performance_optimization/) for performance

