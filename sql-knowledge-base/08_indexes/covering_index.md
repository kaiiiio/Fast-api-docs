# Covering Indexes: Index-Only Scans

Covering indexes include all columns needed for a query, allowing the database to answer queries using only the index without accessing the table. This dramatically improves performance.

## What is a Covering Index?

**Covering index** contains all columns needed for a query, enabling **index-only scans** (no table access needed).

### Basic Concept

```sql
-- Query needs: user_id, status, total
SELECT user_id, status, total
FROM orders
WHERE user_id = 1 AND status = 'completed';

-- Regular index: Must access table for 'total'
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
-- Index scan + table lookup

-- Covering index: All columns in index
CREATE INDEX idx_orders_covering ON orders(user_id, status) 
INCLUDE (total);
-- Index-only scan (no table access!)
```

## How Covering Indexes Work

### Index-Only Scan

```sql
-- Covering index (PostgreSQL)
CREATE INDEX idx_orders_covering ON orders(user_id, status) 
INCLUDE (total, created_at);

-- Query uses index-only scan
EXPLAIN ANALYZE
SELECT user_id, status, total, created_at
FROM orders
WHERE user_id = 1 AND status = 'completed';

-- Output: Index Only Scan (fastest!)
```

### Regular Index vs Covering Index

**Regular Index:**
```sql
-- Index: (user_id, status)
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- Query execution:
-- 1. Use index to find matching rows
-- 2. Access table to get 'total' column
-- Result: Index scan + table lookup
```

**Covering Index:**
```sql
-- Covering index: (user_id, status) INCLUDE (total)
CREATE INDEX idx_orders_covering ON orders(user_id, status) 
INCLUDE (total);

-- Query execution:
-- 1. Use index to find matching rows
-- 2. Get 'total' from index (no table access!)
-- Result: Index-only scan (much faster)
```

## PostgreSQL: INCLUDE Clause

### Basic Syntax

```sql
-- Covering index with INCLUDE
CREATE INDEX idx_orders_covering ON orders(user_id, status) 
INCLUDE (total, created_at);
```

### Example

```sql
-- Query needs user_id, status, total
SELECT user_id, status, total
FROM orders
WHERE user_id = 1 AND status = 'completed';

-- Covering index
CREATE INDEX idx_orders_covering ON orders(user_id, status) 
INCLUDE (total);

-- EXPLAIN shows: Index Only Scan
```

## MySQL: Composite Index

### MySQL Approach

```sql
-- MySQL: Include columns in index itself
CREATE INDEX idx_orders_covering ON orders(user_id, status, total, created_at);

-- Query uses index
SELECT user_id, status, total, created_at
FROM orders
WHERE user_id = 1 AND status = 'completed';
```

**Note:** In MySQL, all columns are part of the index key.

## Real-World Examples

### Example 1: User Dashboard

```sql
-- Query: User order summary
SELECT 
    user_id,
    status,
    COUNT(*) AS order_count,
    SUM(total) AS total_spent
FROM orders
WHERE user_id = 1
GROUP BY user_id, status;

-- Covering index
CREATE INDEX idx_orders_covering ON orders(user_id, status) 
INCLUDE (total);

-- Index-only scan for aggregation
```

### Example 2: Product Catalog

```sql
-- Query: Product list
SELECT 
    category_id,
    name,
    price,
    stock_quantity
FROM products
WHERE category_id = 1 AND status = 'active';

-- Covering index
CREATE INDEX idx_products_covering ON products(category_id, status) 
INCLUDE (name, price, stock_quantity);

-- Index-only scan
```

### Example 3: Order History

```sql
-- Query: Order list
SELECT 
    id,
    user_id,
    total,
    status,
    created_at
FROM orders
WHERE user_id = 1
ORDER BY created_at DESC
LIMIT 10;

-- Covering index
CREATE INDEX idx_orders_covering ON orders(user_id, created_at DESC) 
INCLUDE (id, total, status);

-- Index-only scan with sorting
```

## Performance Impact

### Speed Comparison

```sql
-- Regular index: ~10ms
-- Index scan + table lookup
SELECT user_id, status, total
FROM orders
WHERE user_id = 1;

-- Covering index: ~2ms
-- Index-only scan (5x faster!)
SELECT user_id, status, total
FROM orders
WHERE user_id = 1;
```

### Storage Trade-off

```sql
-- Covering index uses more storage
-- Regular index: ~100MB
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- Covering index: ~150MB (includes total)
CREATE INDEX idx_orders_covering ON orders(user_id, status) 
INCLUDE (total);

-- Trade-off: More storage for better performance
```

## When to Use Covering Indexes

### Use When:

- ✅ Query reads same columns frequently
- ✅ Table is large (table access is expensive)
- ✅ Query performance is critical
- ✅ Storage is not a concern

### Don't Use When:

- ❌ Columns change frequently (index updates expensive)
- ❌ Storage is limited
- ❌ Query patterns vary (hard to cover all)

## Best Practices

1. **Identify Hot Queries**: Find frequently executed queries
2. **Analyze Columns**: Determine which columns are always selected
3. **Test Performance**: Use EXPLAIN to verify index-only scans
4. **Monitor Storage**: Covering indexes use more storage
5. **Update Strategically**: Don't include frequently updated columns

## Common Patterns

### Pattern 1: List Queries

```sql
-- Common list query
SELECT id, name, price FROM products WHERE category_id = 1;

-- Covering index
CREATE INDEX idx_products_covering ON products(category_id) 
INCLUDE (id, name, price);
```

### Pattern 2: Aggregation Queries

```sql
-- Aggregation query
SELECT user_id, status, SUM(total) 
FROM orders 
GROUP BY user_id, status;

-- Covering index
CREATE INDEX idx_orders_covering ON orders(user_id, status) 
INCLUDE (total);
```

## Summary

**Covering Indexes:**

1. **Purpose**: Include all query columns in index
2. **Benefit**: Index-only scans (no table access)
3. **Performance**: 5-10x faster for covered queries
4. **Trade-off**: More storage, slower updates
5. **Use Case**: Frequently executed queries on large tables

**Key Takeaway:**
Covering indexes include all columns needed for a query, enabling index-only scans. This dramatically improves performance by avoiding table access. Use for frequently executed queries on large tables, but be aware of storage and update costs.

**When to Use:**
- Frequently executed queries
- Large tables
- Performance critical
- Storage available

**Next Steps:**
- Learn [Composite Indexes](composite_index.md) for multi-column indexes
- Study [Index Selectivity](index_selectivity.md) for optimization
- Master [Performance Optimization](../10_performance_optimization/) for tuning

---

## 🎯 Interview Questions: SQL

### Q1: Explain covering indexes in detail, including how they enable index-only scans, when to use them, and their performance benefits. Provide examples showing the difference between regular indexes and covering indexes, and explain the trade-offs.

**Answer:**

**Covering Index Definition:**

A covering index (also called an index-only scan) is an index that contains all the columns needed to satisfy a query, eliminating the need to access the actual table data. When a query can be satisfied entirely from the index, the database performs an "index-only scan" which is significantly faster than an index scan followed by table access.

**How Covering Indexes Work:**

**Regular Index Process:**
```
1. Index Scan: Find matching rows in index
2. Get Row IDs: Extract row identifiers
3. Table Access: Look up rows in table using row IDs
4. Return Data: Return columns from table
```

**Covering Index Process:**
```
1. Index Scan: Find matching rows in index
2. Return Data: Return columns directly from index
3. No Table Access: All data comes from index!
```

**Visual Comparison:**

```
Regular Index:
┌─────────────────────────────────────┐
│ Index: (user_id) → row_id           │
│ ┌──────────┬────────┐               │
│ │ user_id │ row_id │               │
│ ├──────────┼────────┤               │
│ │ 1        │ 100    │──────────┐   │
│ │ 1        │ 101    │          │   │
│ └──────────┴────────┘          │   │
│                                │   │
│ Query: SELECT user_id, total   │   │
│        FROM orders             │   │
│        WHERE user_id = 1       │   │
│                                │   │
│ Process:                        │   │
│ 1. Index scan → row_ids        │   │
│ 2. Table lookup → get total     │   │
│                                │   │
│ I/O: Index pages + Table pages │   │
│ Time: ~10ms                    │   │
└────────────────────────────────┴───┘

Covering Index:
┌─────────────────────────────────────┐
│ Index: (user_id) INCLUDE (total)    │
│ ┌──────────┬────────┬────────┐     │
│ │ user_id │ row_id │ total  │     │
│ ├──────────┼────────┼────────┤     │
│ │ 1        │ 100    │ 99.99  │     │
│ │ 1        │ 101    │ 149.99 │     │
│ └──────────┴────────┴────────┘     │
│                                      │
│ Query: SELECT user_id, total        │
│        FROM orders                  │
│        WHERE user_id = 1            │
│                                      │
│ Process:                             │
│ 1. Index scan → all data            │
│ 2. No table access needed!           │
│                                      │
│ I/O: Index pages only                │
│ Time: ~2ms (5x faster!)             │
└──────────────────────────────────────┘
```

**Example: Regular Index vs Covering Index**

**Table Structure:**
```sql
CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id INT,
    status VARCHAR(20),
    total DECIMAL(10,2),
    created_at TIMESTAMP,
    shipping_address TEXT,  -- Large column
    billing_address TEXT     -- Large column
);
```

**Query:**
```sql
SELECT user_id, status, total
FROM orders
WHERE user_id = 123;
```

**Regular Index:**
```sql
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Execution:
-- 1. Index scan: Find rows with user_id = 123 → 10 row IDs
-- 2. Table access: Look up 10 rows in table → Read table pages
-- 3. Extract: Get status and total from table
-- Time: ~10ms
-- I/O: Index pages (2) + Table pages (5) = 7 pages
```

**Covering Index:**
```sql
CREATE INDEX idx_orders_covering 
ON orders(user_id) 
INCLUDE (status, total);
-- PostgreSQL: INCLUDE clause
-- MySQL: Add columns to index: (user_id, status, total)

-- Execution:
-- 1. Index scan: Find rows with user_id = 123 → All data in index
-- 2. No table access needed!
-- Time: ~2ms
-- I/O: Index pages only (2 pages)
-- 5x faster!
```

**Performance Benefits:**

**1. Eliminates Table Access:**

**Regular Index:**
```
Index pages: 2 reads
Table pages: 5 reads (for 10 rows)
Total: 7 page reads
Time: ~10ms
```

**Covering Index:**
```
Index pages: 2 reads (all data in index)
Table pages: 0 reads
Total: 2 page reads
Time: ~2ms
71% reduction in I/O!
```

**2. Faster for Large Tables:**

**Scenario:** Table with 100 million rows, wide rows (many columns)

**Regular Index:**
```sql
-- Table rows are large (many columns)
-- Each table page holds fewer rows
-- More table pages to read
-- Time: ~100ms
```

**Covering Index:**
```sql
-- Index contains only needed columns
-- Index pages are smaller, more rows per page
-- Fewer pages to read
-- Time: ~10ms
-- 10x faster!
```

**3. Better for Read-Heavy Workloads:**

**High-Volume Queries:**
```sql
-- Query executed 10,000 times per minute
-- Regular index: 10,000 × 10ms = 100 seconds
-- Covering index: 10,000 × 2ms = 20 seconds
-- Saves 80 seconds per minute!
```

**When to Use Covering Indexes:**

**1. Frequently Executed Queries:**

**Identify Hot Queries:**
```sql
-- Find frequently executed queries
SELECT 
    query,
    calls,
    mean_exec_time
FROM pg_stat_statements
ORDER BY calls DESC
LIMIT 10;

-- If query is executed thousands of times per day
-- Covering index provides significant benefit
```

**2. Large Tables:**

**Wide Tables:**
```sql
-- Table with many columns
CREATE TABLE orders (
    id INT,
    user_id INT,
    status VARCHAR(20),
    total DECIMAL(10,2),
    -- ... 50 more columns ...
    metadata JSONB
);

-- Query only needs few columns
SELECT user_id, status, total FROM orders WHERE user_id = 123;

-- Covering index: Avoids reading 50+ unused columns
-- Significant I/O savings
```

**3. Performance-Critical Queries:**

**API Endpoints:**
```sql
-- High-traffic API endpoint
-- GET /api/users/:id/orders
SELECT id, user_id, total, status, created_at
FROM orders
WHERE user_id = :user_id
ORDER BY created_at DESC
LIMIT 20;

-- Covering index enables fast response
CREATE INDEX idx_orders_covering 
ON orders(user_id, created_at DESC) 
INCLUDE (id, total, status);
```

**Trade-offs:**

**1. Storage Cost:**

**Regular Index:**
```sql
CREATE INDEX idx_orders_user ON orders(user_id);
-- Size: ~50MB (only user_id)
```

**Covering Index:**
```sql
CREATE INDEX idx_orders_covering 
ON orders(user_id) 
INCLUDE (status, total, created_at);
-- Size: ~80MB (includes additional columns)
-- 60% more storage
```

**2. Update Overhead:**

**Regular Index:**
```sql
-- Update only affects index if indexed column changes
UPDATE orders SET total = 200 WHERE id = 1;
-- If user_id unchanged: No index update needed
```

**Covering Index:**
```sql
-- Update affects index if any included column changes
UPDATE orders SET total = 200 WHERE id = 1;
-- total is in index: Must update index
-- More index maintenance overhead
```

**3. Index Size:**

**Large Included Columns:**
```sql
-- ❌ Bad: Including large columns
CREATE INDEX idx_orders_covering 
ON orders(user_id) 
INCLUDE (description);  -- TEXT column, very large
-- Index becomes huge, negates benefits
```

**Best Practices:**

**1. Include Only Frequently Selected Columns:**
```sql
-- Analyze which columns are always selected
-- Query: SELECT user_id, status, total FROM orders WHERE user_id = ?
-- Covering index: Include status and total
CREATE INDEX idx_orders_covering 
ON orders(user_id) 
INCLUDE (status, total);
```

**2. Use for Read-Heavy Workloads:**
```sql
-- If table is read-heavy (few updates)
-- Covering index overhead is acceptable
-- Significant read performance benefit
```

**3. Monitor Index Usage:**
```sql
-- Verify covering index is used
EXPLAIN ANALYZE
SELECT user_id, status, total
FROM orders
WHERE user_id = 123;

-- Should show: Index Only Scan
-- Not: Index Scan + Table access
```

**4. Consider Composite Covering Indexes:**
```sql
-- Covering index with multiple key columns
CREATE INDEX idx_orders_covering 
ON orders(user_id, status) 
INCLUDE (total, created_at);

-- Covers queries with user_id filter
-- And queries with user_id + status filter
```

**Real-World Example:**

**E-commerce Product Listing:**

**Query:**
```sql
SELECT id, name, price, stock_quantity
FROM products
WHERE category_id = 1
  AND status = 'active'
ORDER BY created_at DESC
LIMIT 20;
```

**Regular Index:**
```sql
CREATE INDEX idx_products_category_status 
ON products(category_id, status, created_at DESC);

-- Execution:
-- Index scan → 20 row IDs
-- Table access → Get id, name, price, stock_quantity
-- Time: ~15ms
```

**Covering Index:**
```sql
CREATE INDEX idx_products_covering 
ON products(category_id, status, created_at DESC) 
INCLUDE (id, name, price, stock_quantity);

-- Execution:
-- Index-only scan → All data from index
-- Time: ~3ms
-- 5x faster!
```

**System Design Consideration**: Covering indexes are powerful for:
1. **Performance**: Dramatically faster queries
2. **Scalability**: Better performance as tables grow
3. **Cost**: Reduced database load
4. **User Experience**: Faster API responses

Covering indexes enable index-only scans by including all query columns in the index, eliminating table access. They provide significant performance improvements (5-10x faster) for frequently executed queries, especially on large tables. The trade-off is increased storage and update overhead, but for read-heavy workloads, the benefits far outweigh the costs.

