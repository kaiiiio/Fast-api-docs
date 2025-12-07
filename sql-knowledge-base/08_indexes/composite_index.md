# Composite Indexes: Multi-Column Indexes

Composite indexes (also called multi-column indexes) index multiple columns together. They're essential for queries that filter or sort by multiple columns.

## What is a Composite Index?

**Composite index** is an index on multiple columns. The order of columns matters - it affects which queries can use the index.

### Basic Syntax

```sql
CREATE INDEX index_name ON table_name(column1, column2, column3);
```

## How Composite Indexes Work

### Column Order Matters

```sql
-- Composite index
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- ✅ Can use index: Query uses leftmost columns
SELECT * FROM orders WHERE user_id = 1;
SELECT * FROM orders WHERE user_id = 1 AND status = 'completed';

-- ❌ Can't use index: Query doesn't use leftmost column
SELECT * FROM orders WHERE status = 'completed';
```

**Rule:** Index can be used if query uses columns from left to right (prefix rule).

## Real-World Examples

### Example 1: User Orders

```sql
-- Composite index for common query pattern
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- Query uses index
SELECT * FROM orders
WHERE user_id = 1 AND status = 'completed';
```

### Example 2: Product Search

```sql
-- Index for category and price filtering
CREATE INDEX idx_products_category_price ON products(category_id, price);

-- Query uses index
SELECT * FROM products
WHERE category_id = 1 AND price BETWEEN 50 AND 100;
```

### Example 3: Date Range Queries

```sql
-- Index for date range queries
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at);

-- Query uses index
SELECT * FROM orders
WHERE user_id = 1 AND created_at >= '2024-01-01';
```

## Column Order Strategy

### Most Selective First

```sql
-- ✅ Good: More selective column first
CREATE INDEX idx_orders_status_user ON orders(status, user_id);
-- If status has few values, user_id is more selective

-- ⚠️ Less optimal: Less selective first
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
-- If user_id is very selective, status adds little
```

### Match Query Patterns

```sql
-- Index matches common query pattern
CREATE INDEX idx_orders_user_status_date ON orders(user_id, status, created_at);

-- Query uses full index
SELECT * FROM orders
WHERE user_id = 1 
  AND status = 'completed'
  AND created_at >= '2024-01-01';
```

## Prefix Rule

### How It Works

```sql
-- Index: (user_id, status, created_at)
CREATE INDEX idx_orders_user_status_date ON orders(user_id, status, created_at);

-- ✅ Can use index:
SELECT * FROM orders WHERE user_id = 1;
SELECT * FROM orders WHERE user_id = 1 AND status = 'completed';
SELECT * FROM orders WHERE user_id = 1 AND status = 'completed' AND created_at >= '2024-01-01';

-- ❌ Can't use index:
SELECT * FROM orders WHERE status = 'completed';
SELECT * FROM orders WHERE created_at >= '2024-01-01';
SELECT * FROM orders WHERE status = 'completed' AND created_at >= '2024-01-01';
```

**Rule:** Must use columns from left to right, can't skip columns.

## Sorting with Composite Indexes

### ORDER BY Optimization

```sql
-- Index supports sorting
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at DESC);

-- Query uses index for filtering AND sorting
SELECT * FROM orders
WHERE user_id = 1
ORDER BY created_at DESC;
```

### Matching WHERE and ORDER BY

```sql
-- Index: (user_id, status, created_at)
CREATE INDEX idx_orders_user_status_date ON orders(user_id, status, created_at);

-- ✅ Good: WHERE matches index prefix, ORDER BY uses next column
SELECT * FROM orders
WHERE user_id = 1 AND status = 'completed'
ORDER BY created_at DESC;

-- ⚠️ Less optimal: ORDER BY doesn't match index
SELECT * FROM orders
WHERE user_id = 1
ORDER BY total DESC;  -- total not in index
```

## Real-World Patterns

### Pattern 1: User Activity

```sql
-- Index for user activity queries
CREATE INDEX idx_orders_user_status_date ON orders(user_id, status, created_at DESC);

-- Fast queries
SELECT * FROM orders
WHERE user_id = 1 
  AND status = 'completed'
ORDER BY created_at DESC
LIMIT 10;
```

### Pattern 2: Product Catalog

```sql
-- Index for product filtering
CREATE INDEX idx_products_category_status_price ON products(category_id, status, price);

-- Fast queries
SELECT * FROM products
WHERE category_id = 1 
  AND status = 'active'
  AND price BETWEEN 50 AND 100;
```

### Pattern 3: Time-Series Data

```sql
-- Index for time-series queries
CREATE INDEX idx_logs_timestamp_level ON logs(created_at, level);

-- Fast queries
SELECT * FROM logs
WHERE created_at >= '2024-01-01'
  AND level = 'ERROR'
ORDER BY created_at DESC;
```

## Performance Benefits

### Single Index vs Multiple

```sql
-- ❌ Less efficient: Multiple single-column indexes
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
-- Query may use only one index

-- ✅ Better: Composite index
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
-- Query uses one optimized index
```

### Index-Only Scans

```sql
-- Covering index (includes all needed columns)
CREATE INDEX idx_orders_covering ON orders(user_id, status) 
INCLUDE (total, created_at);

-- Index-only scan (no table access)
SELECT user_id, status, total, created_at
FROM orders
WHERE user_id = 1 AND status = 'completed';
```

## Best Practices

1. **Order Matters**: Most selective or most filtered first
2. **Match Queries**: Index should match common query patterns
3. **Limit Columns**: Don't over-index (3-4 columns max usually)
4. **Test Performance**: Use EXPLAIN to verify index usage
5. **Consider Covering**: Include columns for index-only scans

## Common Mistakes

### ❌ Wrong Column Order

```sql
-- ❌ Bad: Less selective column first
CREATE INDEX idx_orders_status_user ON orders(status, user_id);
-- status has few values, user_id is more selective

-- ✅ Good: More selective first
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
```

### ❌ Too Many Columns

```sql
-- ❌ Bad: Too many columns (index becomes large)
CREATE INDEX idx_orders_all ON orders(user_id, status, created_at, total, payment_method, shipping_method);
-- Index is huge, updates are slow

-- ✅ Good: Only necessary columns
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
```

## Summary

**Composite Indexes:**

1. **Purpose**: Index multiple columns together
2. **Order Matters**: Leftmost columns must be used
3. **Prefix Rule**: Can use index if query uses left-to-right columns
4. **Performance**: Better than multiple single-column indexes
5. **Best Practice**: Match common query patterns

**Key Takeaway:**
Composite indexes index multiple columns together. Column order matters - queries must use columns from left to right. Design indexes to match your common query patterns. Most selective or most frequently filtered columns should come first.

**Common Patterns:**
- User + Status: `(user_id, status)`
- Category + Price: `(category_id, price)`
- User + Date: `(user_id, created_at)`

**Next Steps:**
- Learn [Covering Indexes](covering_index.md) for index-only scans
- Study [Index Selectivity](index_selectivity.md) for optimization
- Master [Performance Optimization](../10_performance_optimization/) for tuning

---

## 🎯 Interview Questions: SQL

### Q1: Explain composite indexes and how column order affects their effectiveness. Provide detailed examples showing which queries can use a composite index and which cannot, and explain the "leftmost prefix rule" for composite indexes.

**Answer:**

**Composite Index Definition:**

A composite index (also called a multi-column index) is an index created on multiple columns of a table. Unlike single-column indexes that index one column, composite indexes index multiple columns together, creating a sorted structure based on the combination of column values. The order of columns in a composite index is crucial because it determines which queries can efficiently use the index.

**How Composite Indexes Work:**

**Structure:**

A composite index on columns (A, B, C) creates a sorted structure where:
- First, rows are sorted by column A
- Within each A value, rows are sorted by column B
- Within each (A, B) combination, rows are sorted by column C

**Visual Representation:**

```
Composite Index on (user_id, status, created_at):

┌──────────┬────────┬─────────────────────┐
│ user_id  │ status │ created_at          │
├──────────┼────────┼─────────────────────┤
│ 1        │ pending│ 2024-01-01 10:00:00 │
│ 1        │ pending│ 2024-01-02 11:00:00 │
│ 1        │ completed│ 2024-01-03 12:00:00 │
│ 1        │ completed│ 2024-01-04 13:00:00 │
│ 2        │ pending│ 2024-01-01 14:00:00 │
│ 2        │ pending│ 2024-01-02 15:00:00 │
│ 2        │ completed│ 2024-01-03 16:00:00 │
└──────────┴────────┴─────────────────────┘

Sorted by: user_id → status → created_at
```

**Leftmost Prefix Rule:**

The leftmost prefix rule states that a composite index can be used for queries that filter on:
1. The leftmost column(s) of the index
2. Leftmost columns in order (cannot skip columns)
3. All columns in the index

**Key Principle:** You can use a composite index if your query uses columns from left to right, but you cannot skip columns.

**Example Composite Index:**

```sql
CREATE INDEX idx_orders_user_status_date 
ON orders(user_id, status, created_at);
```

**Queries That CAN Use This Index:**

**1. Query with First Column:**
```sql
SELECT * FROM orders WHERE user_id = 123;
-- ✅ Can use index: Uses leftmost column (user_id)
-- Index scan on user_id = 123
```

**2. Query with First Two Columns:**
```sql
SELECT * FROM orders 
WHERE user_id = 123 AND status = 'completed';
-- ✅ Can use index: Uses leftmost columns in order (user_id, status)
-- Index scan on user_id = 123 AND status = 'completed'
```

**3. Query with All Columns:**
```sql
SELECT * FROM orders 
WHERE user_id = 123 
  AND status = 'completed' 
  AND created_at > '2024-01-01';
-- ✅ Can use index: Uses all columns in order
-- Most efficient: Uses entire index
```

**4. Query with Range on Last Column:**
```sql
SELECT * FROM orders 
WHERE user_id = 123 
  AND status = 'completed' 
  AND created_at BETWEEN '2024-01-01' AND '2024-01-31';
-- ✅ Can use index: Equality on first columns, range on last
-- Index scan with range filter on created_at
```

**Queries That CANNOT Use This Index:**

**1. Query Without First Column:**
```sql
SELECT * FROM orders WHERE status = 'completed';
-- ❌ Cannot use index: Missing leftmost column (user_id)
-- Must use sequential scan or separate index on status
```

**2. Query Skipping Middle Column:**
```sql
SELECT * FROM orders 
WHERE user_id = 123 
  AND created_at > '2024-01-01';
-- ❌ Cannot use full index: Skips status column
-- Can only use index for user_id part
-- created_at filter applied after index lookup
```

**3. Query with Wrong Column Order:**
```sql
SELECT * FROM orders 
WHERE status = 'completed' 
  AND user_id = 123;
-- ⚠️ May use index partially: Optimizer might reorder
-- But not optimal: Should have user_id first in WHERE
```

**Why Column Order Matters:**

**Example: Two Different Indexes**

**Index 1: (user_id, status)**
```sql
CREATE INDEX idx_1 ON orders(user_id, status);

-- Query 1: ✅ Efficient
SELECT * FROM orders WHERE user_id = 123;
-- Uses index efficiently

-- Query 2: ✅ Efficient
SELECT * FROM orders WHERE user_id = 123 AND status = 'pending';
-- Uses index efficiently

-- Query 3: ❌ Inefficient
SELECT * FROM orders WHERE status = 'pending';
-- Cannot use index (missing user_id)
-- Sequential scan required
```

**Index 2: (status, user_id)**
```sql
CREATE INDEX idx_2 ON orders(status, user_id);

-- Query 1: ❌ Inefficient
SELECT * FROM orders WHERE user_id = 123;
-- Cannot use index (missing status)
-- Sequential scan required

-- Query 2: ✅ Efficient
SELECT * FROM orders WHERE status = 'pending';
-- Uses index efficiently

-- Query 3: ✅ Efficient
SELECT * FROM orders WHERE status = 'pending' AND user_id = 123;
-- Uses index efficiently
```

**Choosing Column Order:**

**Rule 1: Most Selective First**

The most selective column (most unique values) should come first:

```sql
-- Scenario: 1,000,000 orders, 100,000 users, 5 statuses

-- ❌ Bad: Less selective first
CREATE INDEX idx_bad ON orders(status, user_id);
-- status has only 5 values, not very selective
-- Index not efficient for user_id queries

-- ✅ Good: More selective first
CREATE INDEX idx_good ON orders(user_id, status);
-- user_id has 100,000 values, very selective
-- Index efficient for user_id queries
```

**Rule 2: Most Frequently Filtered First**

The column most often used in WHERE clauses should come first:

```sql
-- If 90% of queries filter by user_id, 10% by status
-- ✅ Good: user_id first
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
```

**Rule 3: Equality Before Range**

Columns used with equality (=) should come before columns used with ranges (<, >, BETWEEN):

```sql
-- ✅ Good: Equality columns first
CREATE INDEX idx_good ON orders(user_id, status, created_at);
-- user_id = ? AND status = ? AND created_at > ?

-- ❌ Bad: Range column first
CREATE INDEX idx_bad ON orders(created_at, user_id, status);
-- created_at > ? makes index less useful for user_id, status
```

**Detailed Examples:**

**Example 1: E-commerce Orders**

**Table:**
```sql
CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id INT,
    status VARCHAR(20),
    created_at TIMESTAMP,
    total DECIMAL(10,2)
);
```

**Common Queries:**
```sql
-- Query 1: User's orders (most common)
SELECT * FROM orders WHERE user_id = 123;

-- Query 2: User's orders by status
SELECT * FROM orders WHERE user_id = 123 AND status = 'completed';

-- Query 3: User's recent orders
SELECT * FROM orders 
WHERE user_id = 123 
  AND created_at > '2024-01-01';
```

**Optimal Index:**
```sql
CREATE INDEX idx_orders_user_status_date 
ON orders(user_id, status, created_at);
```

**Why This Order:**
- `user_id` first: Most selective, most frequently filtered
- `status` second: Often filtered with user_id
- `created_at` last: Used for range queries, less selective

**Query Performance:**

**Query 1:**
```sql
SELECT * FROM orders WHERE user_id = 123;
-- ✅ Uses index: Scans index for user_id = 123
-- Efficient: Only scans user 123's orders
```

**Query 2:**
```sql
SELECT * FROM orders WHERE user_id = 123 AND status = 'completed';
-- ✅ Uses index: Scans index for user_id = 123 AND status = 'completed'
-- Very efficient: Narrow scan
```

**Query 3:**
```sql
SELECT * FROM orders 
WHERE user_id = 123 AND created_at > '2024-01-01';
-- ⚠️ Partially uses index: Uses user_id part
-- created_at filter applied after index lookup
-- Still efficient because user_id filter is selective
```

**Example 2: Wrong Column Order**

**Bad Index:**
```sql
CREATE INDEX idx_bad ON orders(status, user_id);
```

**Query Performance:**

**Query:**
```sql
SELECT * FROM orders WHERE user_id = 123;
-- ❌ Cannot use index efficiently
-- Must scan all status values for user_id = 123
-- Sequential scan or separate index needed
```

**Example 3: Multiple Composite Indexes**

Sometimes you need multiple indexes for different query patterns:

```sql
-- Index 1: For user queries
CREATE INDEX idx_orders_user_status 
ON orders(user_id, status);

-- Index 2: For date range queries
CREATE INDEX idx_orders_date_user 
ON orders(created_at, user_id);

-- Index 3: For status filtering
CREATE INDEX idx_orders_status_date 
ON orders(status, created_at);
```

**Trade-off:** More indexes = faster queries but slower writes and more storage

**Index Selectivity and Order:**

**Selectivity Calculation:**

```sql
-- Column selectivity = distinct_values / total_rows

-- Example: 1,000,000 orders
-- user_id: 100,000 distinct values → selectivity = 0.1 (10%)
-- status: 5 distinct values → selectivity = 0.000005 (0.0005%)

-- Higher selectivity = more selective = better for index
-- user_id is more selective, should come first
```

**Visual Comparison:**

```
Index (user_id, status):
┌──────────┬────────┬────────┐
│ user_id  │ status │ orders │
├──────────┼────────┼────────┤
│ 1        │ pending│ 10     │ ← Narrow range
│ 1        │ completed│ 5   │
│ 2        │ pending│ 8      │
│ 2        │ completed│ 12  │
└──────────┴────────┴────────┘
-- Efficient: Can quickly find user 1's pending orders

Index (status, user_id):
┌────────┬──────────┬────────┐
│ status │ user_id  │ orders │
├────────┼──────────┼────────┤
│ pending│ 1        │ 10     │ ← Wide range
│ pending│ 2        │ 8      │
│ pending│ 3        │ 15     │
│ ...    │ ...      │ ...    │
│ pending│ 100000   │ 12     │
└────────┴──────────┴────────┘
-- Less efficient: Must scan many users for status filter
```

**System Design Consideration**: Composite indexes are crucial for:
1. **Query Performance**: Enabling efficient multi-column filtering
2. **Index Strategy**: Designing indexes that match query patterns
3. **Storage Efficiency**: One composite index vs multiple single-column indexes
4. **Write Performance**: Balancing read performance with write overhead

Composite indexes are powerful tools for optimizing multi-column queries. The column order is critical—the leftmost prefix rule determines which queries can use the index. Place the most selective and frequently filtered columns first, and consider equality columns before range columns. Understanding composite indexes helps you design efficient database schemas that support your application's query patterns.

---

### Q2: Explain when to use a composite index vs multiple single-column indexes. Provide performance comparisons and explain the trade-offs. Discuss covering indexes and how composite indexes can enable index-only scans.

**Answer:**

**Composite Index vs Multiple Single-Column Indexes:**

This is a fundamental database design decision that affects query performance, storage, and write performance. Understanding when to use each approach is crucial for optimizing database performance.

**Single-Column Indexes:**

**Definition:** Separate indexes on individual columns.

**Example:**
```sql
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
```

**Composite Index:**

**Definition:** One index on multiple columns together.

**Example:**
```sql
CREATE INDEX idx_orders_user_status_date 
ON orders(user_id, status, created_at);
```

**When to Use Composite Index:**

**1. Queries Filter Multiple Columns Together:**

**Scenario:** Most queries filter by user_id AND status together

**Single-Column Indexes:**
```sql
CREATE INDEX idx_user ON orders(user_id);
CREATE INDEX idx_status ON orders(status);

-- Query
SELECT * FROM orders 
WHERE user_id = 123 AND status = 'completed';

-- Execution:
-- 1. Use idx_user to find user_id = 123 → 1000 rows
-- 2. Use idx_status to find status = 'completed' → 200,000 rows
-- 3. Intersect results → 50 rows
-- Problem: Must intersect two large result sets
-- Time: ~100ms
```

**Composite Index:**
```sql
CREATE INDEX idx_user_status ON orders(user_id, status);

-- Same Query
SELECT * FROM orders 
WHERE user_id = 123 AND status = 'completed';

-- Execution:
-- 1. Use idx_user_status to find user_id=123 AND status='completed'
-- 2. Direct lookup → 50 rows
-- Much faster: Single index lookup
-- Time: ~5ms
-- 20x faster!
```

**2. Queries with ORDER BY on Multiple Columns:**

**Scenario:** Order by user_id, then by created_at

**Single-Column Indexes:**
```sql
CREATE INDEX idx_user ON orders(user_id);
CREATE INDEX idx_date ON orders(created_at);

-- Query
SELECT * FROM orders 
WHERE user_id = 123 
ORDER BY created_at DESC;

-- Execution:
-- 1. Use idx_user → find user 123's orders
-- 2. Sort by created_at in memory
-- Problem: Must sort results
-- Time: ~50ms
```

**Composite Index:**
```sql
CREATE INDEX idx_user_date ON orders(user_id, created_at DESC);

-- Same Query
SELECT * FROM orders 
WHERE user_id = 123 
ORDER BY created_at DESC;

-- Execution:
-- 1. Use idx_user_date → results already sorted by created_at
-- 2. No sorting needed!
-- Time: ~5ms
-- 10x faster!
```

**3. Covering Indexes (Index-Only Scans):**

**Scenario:** Query only needs columns that are in the index

**Composite Index as Covering Index:**
```sql
-- Composite index includes all needed columns
CREATE INDEX idx_covering ON orders(user_id, status, total, created_at);

-- Query (only uses indexed columns)
SELECT user_id, status, total, created_at
FROM orders
WHERE user_id = 123 AND status = 'completed';

-- Execution:
-- Index-only scan: Data comes entirely from index
-- No table access needed!
-- Time: ~2ms
-- Very fast!
```

**When to Use Single-Column Indexes:**

**1. Queries Filter Single Columns Independently:**

**Scenario:** Queries filter by user_id OR status (not both)

**Single-Column Indexes:**
```sql
CREATE INDEX idx_user ON orders(user_id);
CREATE INDEX idx_status ON orders(status);

-- Query 1: Filter by user_id only
SELECT * FROM orders WHERE user_id = 123;
-- ✅ Uses idx_user efficiently

-- Query 2: Filter by status only
SELECT * FROM orders WHERE status = 'completed';
-- ✅ Uses idx_status efficiently

-- Both queries are fast with single-column indexes
```

**Composite Index:**
```sql
CREATE INDEX idx_user_status ON orders(user_id, status);

-- Query 1: Filter by user_id only
SELECT * FROM orders WHERE user_id = 123;
-- ✅ Can use composite index (leftmost prefix)

-- Query 2: Filter by status only
SELECT * FROM orders WHERE status = 'completed';
-- ❌ Cannot use composite index efficiently
-- Must use sequential scan or separate index
```

**2. Different Query Patterns:**

**Scenario:** Different queries need different column combinations

**Example:**
```sql
-- Query 1: Filter by user_id
SELECT * FROM orders WHERE user_id = 123;

-- Query 2: Filter by status
SELECT * FROM orders WHERE status = 'pending';

-- Query 3: Filter by created_at
SELECT * FROM orders WHERE created_at > '2024-01-01';

-- Query 4: Filter by user_id AND status
SELECT * FROM orders WHERE user_id = 123 AND status = 'pending';
```

**Solution: Multiple Indexes**
```sql
-- Single-column indexes for independent queries
CREATE INDEX idx_user ON orders(user_id);
CREATE INDEX idx_status ON orders(status);
CREATE INDEX idx_date ON orders(created_at);

-- Composite index for combined queries
CREATE INDEX idx_user_status ON orders(user_id, status);
```

**Performance Comparison:**

**Test Scenario:**
- Table: 1,000,000 orders
- Queries: Filter by user_id AND status
- user_id: 100,000 distinct values
- status: 5 distinct values

**Approach 1: Single-Column Indexes**
```sql
CREATE INDEX idx_user ON orders(user_id);
CREATE INDEX idx_status ON orders(status);

-- Query
SELECT * FROM orders 
WHERE user_id = 123 AND status = 'completed';

-- Execution Plan:
-- 1. Index scan on idx_user → 10 rows (user_id = 123)
-- 2. Index scan on idx_status → 200,000 rows (status = 'completed')
-- 3. Bitmap intersection → 2 rows
-- Time: ~80ms
-- I/O: ~500 page reads
```

**Approach 2: Composite Index**
```sql
CREATE INDEX idx_user_status ON orders(user_id, status);

-- Same Query
SELECT * FROM orders 
WHERE user_id = 123 AND status = 'completed';

-- Execution Plan:
-- 1. Index scan on idx_user_status → 2 rows (direct lookup)
-- Time: ~3ms
-- I/O: ~5 page reads
-- 26x faster!
```

**Storage Comparison:**

**Single-Column Indexes:**
```sql
-- 3 separate indexes
CREATE INDEX idx_user ON orders(user_id);        -- 50 MB
CREATE INDEX idx_status ON orders(status);        -- 30 MB
CREATE INDEX idx_date ON orders(created_at);     -- 60 MB
-- Total: 140 MB
```

**Composite Index:**
```sql
-- 1 composite index
CREATE INDEX idx_user_status_date 
ON orders(user_id, status, created_at);  -- 80 MB
-- Total: 80 MB
-- 43% less storage!
```

**Write Performance Impact:**

**Single-Column Indexes:**
```sql
-- Insert requires updating 3 indexes
INSERT INTO orders (user_id, status, created_at) 
VALUES (123, 'pending', NOW());
-- Updates: idx_user, idx_status, idx_date
-- Time: ~15ms
```

**Composite Index:**
```sql
-- Insert requires updating 1 index
INSERT INTO orders (user_id, status, created_at) 
VALUES (123, 'pending', NOW());
-- Updates: idx_user_status_date
-- Time: ~5ms
-- 3x faster writes!
```

**Covering Indexes (Index-Only Scans):**

**Definition:** A covering index contains all columns needed for a query, allowing the database to satisfy the query entirely from the index without accessing the table.

**Benefits:**
- **Faster**: No table access needed
- **Less I/O**: Only read index pages
- **Better Performance**: Especially for read-heavy workloads

**Example 1: Basic Covering Index**

**Table:**
```sql
CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id INT,
    status VARCHAR(20),
    total DECIMAL(10,2),
    created_at TIMESTAMP,
    shipping_address TEXT  -- Large column
);
```

**Query:**
```sql
SELECT user_id, status, total, created_at
FROM orders
WHERE user_id = 123 AND status = 'completed';
```

**Without Covering Index:**
```sql
CREATE INDEX idx_user_status ON orders(user_id, status);

-- Execution:
-- 1. Use index to find matching rows → 10 row IDs
-- 2. Access table to get total, created_at → 10 table reads
-- Time: ~8ms
-- I/O: Index pages + table pages
```

**With Covering Index:**
```sql
CREATE INDEX idx_covering 
ON orders(user_id, status) 
INCLUDE (total, created_at);
-- PostgreSQL: INCLUDE clause
-- MySQL: Add columns to index

-- Execution:
-- 1. Use index to get all data → Index-only scan
-- 2. No table access needed!
-- Time: ~2ms
-- I/O: Only index pages
-- 4x faster!
```

**Example 2: Composite Covering Index**

**Query:**
```sql
SELECT user_id, status, COUNT(*) AS order_count, SUM(total) AS total_spent
FROM orders
WHERE user_id = 123
GROUP BY user_id, status;
```

**Covering Index:**
```sql
CREATE INDEX idx_covering 
ON orders(user_id, status, total);
-- All columns in query are in index

-- Execution:
-- Index-only scan: All data from index
-- No table access
-- Very fast!
```

**PostgreSQL INCLUDE Syntax:**
```sql
-- Include non-key columns in index
CREATE INDEX idx_covering 
ON orders(user_id, status) 
INCLUDE (total, created_at);
-- user_id, status: Indexed (can be used in WHERE, ORDER BY)
-- total, created_at: Included (available for SELECT, but not indexed)
```

**When Covering Indexes Are Most Beneficial:**

**1. Read-Heavy Workloads:**
- Queries that only need indexed columns
- Frequent SELECT queries
- Analytics and reporting

**2. Large Tables:**
- Table pages are large
- Avoiding table access saves significant I/O
- Especially beneficial with wide tables

**3. Frequently Accessed Columns:**
- Columns often selected together
- Can create covering index for common query patterns

**Trade-offs Summary:**

| Aspect | Composite Index | Single-Column Indexes |
|--------|----------------|----------------------|
| **Multi-column queries** | ✅ Excellent | ⚠️ Good (must intersect) |
| **Single-column queries** | ⚠️ Good (if leftmost) | ✅ Excellent |
| **Storage** | ✅ Less (one index) | ❌ More (multiple indexes) |
| **Write Performance** | ✅ Faster (one index) | ❌ Slower (multiple indexes) |
| **Covering Index** | ✅ Possible | ⚠️ Limited |
| **Flexibility** | ⚠️ Less (order matters) | ✅ More (independent) |

**Best Practices:**

**1. Analyze Query Patterns:**
```sql
-- Identify common query patterns
-- Most queries: WHERE user_id = ? AND status = ?
-- → Use composite index (user_id, status)
```

**2. Use Composite for Combined Filters:**
```sql
-- If queries often filter multiple columns together
CREATE INDEX idx_composite ON orders(user_id, status, created_at);
```

**3. Use Single-Column for Independent Filters:**
```sql
-- If queries filter columns independently
CREATE INDEX idx_user ON orders(user_id);
CREATE INDEX idx_status ON orders(status);
```

**4. Create Covering Indexes for Common SELECTs:**
```sql
-- If SELECT only needs specific columns
CREATE INDEX idx_covering 
ON orders(user_id, status) 
INCLUDE (total, created_at);
```

**5. Monitor and Adjust:**
```sql
-- Use EXPLAIN to verify index usage
EXPLAIN ANALYZE SELECT ...;
-- Adjust indexes based on actual query patterns
```

**System Design Consideration**: Choosing between composite and single-column indexes is crucial for:
1. **Query Performance**: Matching indexes to query patterns
2. **Storage Efficiency**: Minimizing index storage overhead
3. **Write Performance**: Balancing read and write performance
4. **Scalability**: Ensuring indexes scale with data growth

Composite indexes are superior when queries filter multiple columns together, while single-column indexes are better when columns are filtered independently. Covering indexes can dramatically improve performance by enabling index-only scans. The key is understanding your query patterns and designing indexes that match them, balancing read performance with write overhead and storage costs.

