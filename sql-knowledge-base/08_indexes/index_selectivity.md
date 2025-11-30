# Index Selectivity: Choosing the Right Columns to Index

Index selectivity measures how unique values are in a column. High selectivity means many unique values, low selectivity means few unique values. Understanding selectivity helps you create effective indexes.

## What is Selectivity?

**Selectivity** = Number of unique values / Total number of rows

- **High Selectivity**: Many unique values (good for indexing)
- **Low Selectivity**: Few unique values (less useful for indexing)

### Example

```sql
-- High selectivity: Email (each user has unique email)
-- 10,000 rows, 10,000 unique emails
-- Selectivity = 10,000 / 10,000 = 1.0 (100% unique)

-- Low selectivity: Gender (only 2-3 values)
-- 10,000 rows, 2 unique values (M, F)
-- Selectivity = 2 / 10,000 = 0.0002 (0.02% unique)
```

## High Selectivity Columns

### Good for Indexing

```sql
-- High selectivity columns
CREATE TABLE users (
    id SERIAL PRIMARY KEY,  -- 100% unique (perfect)
    email VARCHAR(255) UNIQUE,  -- 100% unique (excellent)
    phone VARCHAR(20),  -- ~90% unique (very good)
    username VARCHAR(50) UNIQUE  -- 100% unique (excellent)
);

-- These columns are excellent for indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
```

### Characteristics

- ✅ Many unique values
- ✅ Good for equality lookups
- ✅ Efficient index usage
- ✅ Small result sets

## Low Selectivity Columns

### Less Useful for Indexing

```sql
-- Low selectivity columns
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    gender CHAR(1),  -- Only 2-3 values (M, F, Other)
    status VARCHAR(20),  -- Only 3-5 values (active, inactive, pending)
    country_code CHAR(2)  -- ~200 values for 1M rows (low selectivity)
);

-- ⚠️ Less effective indexes
CREATE INDEX idx_users_gender ON users(gender);  -- Not very useful
CREATE INDEX idx_users_status ON users(status);  -- May not help much
```

### When to Index Low Selectivity

```sql
-- Index low selectivity if:
-- 1. Frequently filtered
-- 2. Combined with high selectivity column
-- 3. Partial index (only specific value)

-- Composite index: status + user_id
CREATE INDEX idx_orders_status_user ON orders(status, user_id);
-- status has low selectivity, but combined with user_id (high) it's useful

-- Partial index: Only active users
CREATE INDEX idx_users_active ON users(email) 
WHERE status = 'active';
-- Index only active users (reduces index size)
```

## Measuring Selectivity

### Calculate Selectivity

```sql
-- Calculate selectivity
SELECT 
    COUNT(DISTINCT column_name) AS unique_values,
    COUNT(*) AS total_rows,
    ROUND(COUNT(DISTINCT column_name) * 100.0 / COUNT(*), 2) AS selectivity_percent
FROM table_name;

-- Example: Email selectivity
SELECT 
    COUNT(DISTINCT email) AS unique_emails,
    COUNT(*) AS total_users,
    ROUND(COUNT(DISTINCT email) * 100.0 / COUNT(*), 2) AS email_selectivity
FROM users;
-- Result: 100.00% (perfect selectivity)
```

### Check Index Usage

```sql
-- Check if index is being used
EXPLAIN ANALYZE
SELECT * FROM users WHERE email = 'user@example.com';
-- Look for "Index Scan" in output
```

## Selectivity Guidelines

### High Selectivity (> 50%)

```sql
-- Excellent for indexing
-- Examples: ID, email, phone, unique codes
CREATE INDEX idx_users_email ON users(email);  -- 100% unique
CREATE INDEX idx_products_sku ON products(sku);  -- 100% unique
```

### Medium Selectivity (10-50%)

```sql
-- Good for indexing, especially in composite indexes
-- Examples: category_id, user_id (in orders table)
CREATE INDEX idx_orders_user ON orders(user_id);  -- ~30% unique
CREATE INDEX idx_products_category ON products(category_id);  -- ~20% unique
```

### Low Selectivity (< 10%)

```sql
-- Less useful alone, but useful in composite indexes
-- Examples: status, gender, boolean flags
-- Don't index alone:
CREATE INDEX idx_users_gender ON users(gender);  -- Only 2-3 values

-- But useful in composite:
CREATE INDEX idx_orders_status_user ON orders(status, user_id);
-- status filters first, then user_id (high selectivity) narrows down
```

## Composite Index Selectivity

### Order by Selectivity

```sql
-- ✅ Good: High selectivity first
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
-- user_id: ~30% unique (high)
-- status: ~5% unique (low)
-- Query: WHERE user_id = 1 AND status = 'completed'
-- Index efficiently filters by user_id first, then status

-- ⚠️ Less optimal: Low selectivity first
CREATE INDEX idx_orders_status_user ON orders(status, user_id);
-- status: ~5% unique (low)
-- user_id: ~30% unique (high)
-- Less efficient: status doesn't narrow down much
```

### Selectivity in Composite Indexes

```sql
-- Composite index selectivity
-- Index: (category_id, price, name)
-- category_id: 10% unique (low)
-- price: 80% unique (high)
-- name: 100% unique (very high)

-- Query: WHERE category_id = 1 AND price = 99.99
-- Index uses category_id (narrows to 10%), then price (narrows to 1 row)
-- Very efficient!
```

## Real-World Examples

### Example 1: User Lookup

```sql
-- High selectivity: Email (100% unique)
CREATE INDEX idx_users_email ON users(email);

-- Query uses index efficiently
SELECT * FROM users WHERE email = 'user@example.com';
-- Index narrows down to exactly 1 row
```

### Example 2: Order Filtering

```sql
-- Medium selectivity: user_id (~30% unique)
CREATE INDEX idx_orders_user ON orders(user_id);

-- Query uses index
SELECT * FROM orders WHERE user_id = 1;
-- Index narrows down to ~30% of rows (still useful)
```

### Example 3: Status Filtering

```sql
-- Low selectivity: status (only 3-5 values)
-- ❌ Not useful alone
CREATE INDEX idx_orders_status ON orders(status);
-- Index doesn't help much (only 3-5 values)

-- ✅ Useful in composite
CREATE INDEX idx_orders_status_date ON orders(status, created_at);
-- status filters first, then created_at (high selectivity) narrows down
```

## Partial Indexes for Low Selectivity

### Index Only Specific Values

```sql
-- Low selectivity column, but index only active records
CREATE INDEX idx_users_active_email ON users(email) 
WHERE status = 'active';
-- Index only ~50% of rows (active users)
-- Much smaller index, faster queries

-- Query uses partial index
SELECT * FROM users 
WHERE email = 'user@example.com' 
  AND status = 'active';
```

## Best Practices

1. **Index High Selectivity**: Columns with many unique values
2. **Composite Order**: High selectivity columns first
3. **Partial Indexes**: For low selectivity with filters
4. **Measure Selectivity**: Calculate before creating index
5. **Test Performance**: Use EXPLAIN to verify index usage

## Common Mistakes

### ❌ Indexing Low Selectivity Alone

```sql
-- ❌ Bad: Index low selectivity column alone
CREATE INDEX idx_users_gender ON users(gender);
-- Only 2-3 values, index doesn't help much

-- ✅ Good: Use in composite or partial index
CREATE INDEX idx_users_gender_email ON users(gender, email);
-- Or
CREATE INDEX idx_users_male_email ON users(email) WHERE gender = 'M';
```

### ❌ Wrong Composite Order

```sql
-- ❌ Bad: Low selectivity first
CREATE INDEX idx_orders_status_user ON orders(status, user_id);
-- status has only 3-5 values, doesn't narrow down much

-- ✅ Good: High selectivity first
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
-- user_id narrows down significantly, then status filters
```

## Summary

**Index Selectivity:**

1. **High Selectivity**: Many unique values (excellent for indexing)
2. **Low Selectivity**: Few unique values (less useful alone)
3. **Composite Order**: High selectivity columns first
4. **Partial Indexes**: For low selectivity with filters
5. **Measure**: Calculate selectivity before indexing

**Key Takeaway:**
Index selectivity measures how unique values are. High selectivity columns (many unique values) are excellent for indexing. Low selectivity columns are less useful alone but can be effective in composite indexes or partial indexes. Always measure selectivity and test index usage.

**Guidelines:**
- High selectivity (>50%): Excellent for indexing
- Medium selectivity (10-50%): Good for indexing
- Low selectivity (<10%): Use in composite or partial indexes

**Next Steps:**
- Learn [Composite Indexes](composite_index.md) for multi-column indexes
- Study [Covering Indexes](covering_index.md) for index-only scans
- Master [Performance Optimization](../10_performance_optimization/) for tuning

