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

