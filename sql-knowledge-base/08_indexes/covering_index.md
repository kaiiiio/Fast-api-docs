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

