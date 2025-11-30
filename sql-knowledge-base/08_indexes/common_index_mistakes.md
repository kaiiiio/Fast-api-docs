# Common Index Mistakes: What to Avoid

Common indexing mistakes can hurt performance, waste storage, and cause maintenance issues. Understanding these mistakes helps you create effective indexes.

## Mistake 1: Over-Indexing

### Problem

```sql
-- ❌ Bad: Too many indexes
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    status VARCHAR(20),
    created_at TIMESTAMP,
    total DECIMAL(10, 2),
    payment_method VARCHAR(50),
    shipping_method VARCHAR(50)
);

-- Creating indexes on every column
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_orders_total ON orders(total);
CREATE INDEX idx_orders_payment ON orders(payment_method);
CREATE INDEX idx_orders_shipping ON orders(shipping_method);
-- Too many indexes!
```

### Impact

- ⚠️ Slower INSERT/UPDATE/DELETE (each index must be updated)
- ⚠️ More storage used
- ⚠️ Maintenance overhead

### Solution

```sql
-- ✅ Good: Index only frequently queried columns
CREATE INDEX idx_orders_user ON orders(user_id);  -- Frequently filtered
CREATE INDEX idx_orders_user_status ON orders(user_id, status);  -- Common query pattern
-- Only index what's actually used
```

## Mistake 2: Under-Indexing

### Problem

```sql
-- ❌ Bad: No indexes on foreign keys
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),  -- No index!
    product_id INTEGER REFERENCES products(id)  -- No index!
);

-- Slow JOINs
SELECT * FROM orders o
JOIN users u ON o.user_id = u.id;  -- Full table scan on orders
```

### Solution

```sql
-- ✅ Good: Always index foreign keys
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_product_id ON orders(product_id);

-- Fast JOINs
SELECT * FROM orders o
JOIN users u ON o.user_id = u.id;  -- Uses index
```

## Mistake 3: Indexing Low Selectivity Columns

### Problem

```sql
-- ❌ Bad: Index low selectivity column
CREATE INDEX idx_users_gender ON users(gender);
-- gender has only 2-3 values (M, F, Other)
-- Index doesn't help much, wastes storage
```

### Solution

```sql
-- ✅ Good: Use in composite or partial index
CREATE INDEX idx_users_gender_email ON users(gender, email);
-- Or partial index
CREATE INDEX idx_users_male ON users(email) WHERE gender = 'M';
```

## Mistake 4: Wrong Composite Index Order

### Problem

```sql
-- ❌ Bad: Low selectivity column first
CREATE INDEX idx_orders_status_user ON orders(status, user_id);
-- status has only 3-5 values, doesn't narrow down much
-- user_id is more selective but comes second
```

### Solution

```sql
-- ✅ Good: High selectivity column first
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
-- user_id narrows down significantly, then status filters
```

## Mistake 5: Not Indexing ORDER BY Columns

### Problem

```sql
-- ❌ Bad: No index on ORDER BY column
SELECT * FROM orders
WHERE user_id = 1
ORDER BY created_at DESC;  -- Must sort all matching rows
-- Slow for large result sets
```

### Solution

```sql
-- ✅ Good: Index matches ORDER BY
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at DESC);

-- Fast query
SELECT * FROM orders
WHERE user_id = 1
ORDER BY created_at DESC;  -- Uses index for sorting
```

## Mistake 6: Functions on Indexed Columns

### Problem

```sql
-- ❌ Bad: Function prevents index usage
CREATE INDEX idx_users_email ON users(email);

SELECT * FROM users
WHERE LOWER(email) = 'user@example.com';
-- Can't use index (function on column)
```

### Solution

```sql
-- ✅ Good: Store normalized or use expression index
-- Option 1: Store normalized
ALTER TABLE users ADD COLUMN email_lower VARCHAR(255);
CREATE INDEX idx_users_email_lower ON users(email_lower);

-- Option 2: Expression index (PostgreSQL)
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
SELECT * FROM users WHERE LOWER(email) = 'user@example.com';
```

## Mistake 7: Missing Indexes on JOIN Columns

### Problem

```sql
-- ❌ Bad: No index on JOIN column
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER  -- No index!
);

-- Slow JOIN
SELECT * FROM orders o
JOIN users u ON o.user_id = u.id;  -- Full table scan
```

### Solution

```sql
-- ✅ Good: Index JOIN columns
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Fast JOIN
SELECT * FROM orders o
JOIN users u ON o.user_id = u.id;  -- Uses index
```

## Mistake 8: Indexing Every Column in WHERE

### Problem

```sql
-- ❌ Bad: Separate indexes for each WHERE column
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_status ON products(status);

-- Query uses only one index
SELECT * FROM products
WHERE category_id = 1 AND price > 100 AND status = 'active';
```

### Solution

```sql
-- ✅ Good: Composite index matching query
CREATE INDEX idx_products_category_price_status ON products(category_id, price, status);

-- Query uses composite index efficiently
SELECT * FROM products
WHERE category_id = 1 AND price > 100 AND status = 'active';
```

## Mistake 9: Not Updating Statistics

### Problem

```sql
-- ❌ Bad: Statistics outdated
-- After bulk insert, statistics not updated
INSERT INTO users (name, email) VALUES (...), (...), (...);  -- 100,000 rows
-- Statistics still show old row count
-- Query planner makes poor decisions
```

### Solution

```sql
-- ✅ Good: Update statistics after bulk operations
INSERT INTO users (name, email) VALUES (...), (...), (...);  -- 100,000 rows
ANALYZE users;  -- Update statistics

-- Query planner has accurate information
```

## Mistake 10: Indexing Frequently Updated Columns

### Problem

```sql
-- ❌ Bad: Index on frequently updated column
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    last_activity TIMESTAMP,  -- Updated on every request
    data JSONB
);

CREATE INDEX idx_sessions_activity ON sessions(last_activity);
-- Index updated on every request (expensive!)
```

### Solution

```sql
-- ✅ Good: Don't index or use partial index
-- Option 1: Don't index (if not frequently queried)
-- Option 2: Partial index (only recent activity)
CREATE INDEX idx_sessions_recent_activity ON sessions(last_activity) 
WHERE last_activity > CURRENT_TIMESTAMP - INTERVAL '1 day';
```

## Best Practices Summary

1. ✅ **Index Foreign Keys**: Always index foreign keys
2. ✅ **Index WHERE Columns**: Columns frequently in WHERE clauses
3. ✅ **Index ORDER BY Columns**: For sorting performance
4. ✅ **Composite Indexes**: Match common query patterns
5. ✅ **High Selectivity First**: In composite indexes
6. ✅ **Partial Indexes**: For low selectivity with filters
7. ✅ **Update Statistics**: After bulk operations
8. ✅ **Monitor Usage**: Remove unused indexes

## Common Patterns to Avoid

### ❌ Pattern 1: Index Everything

```sql
-- Don't index every column
CREATE INDEX idx_table_col1 ON table(col1);
CREATE INDEX idx_table_col2 ON table(col2);
CREATE INDEX idx_table_col3 ON table(col3);
-- ... on every column
```

### ❌ Pattern 2: Ignore Query Patterns

```sql
-- Don't create indexes without analyzing queries
-- Create indexes based on actual query patterns
```

### ❌ Pattern 3: Forget Composite Indexes

```sql
-- Don't create separate indexes for each column
-- Create composite indexes matching query patterns
```

## Summary

**Common Index Mistakes:**

1. **Over-Indexing**: Too many indexes slow writes
2. **Under-Indexing**: Missing indexes on foreign keys, WHERE, ORDER BY
3. **Low Selectivity**: Indexing columns with few unique values
4. **Wrong Order**: Low selectivity first in composite indexes
5. **Functions**: Functions on indexed columns prevent index usage
6. **Missing JOIN Indexes**: No indexes on JOIN columns
7. **Separate Indexes**: Instead of composite indexes
8. **Outdated Statistics**: Not updating after bulk operations

**Key Takeaway:**
Common index mistakes include over-indexing, under-indexing, wrong composite order, and indexing low-selectivity columns. Always index foreign keys, WHERE columns, and ORDER BY columns. Create composite indexes matching query patterns. Monitor index usage and remove unused indexes.

**Quick Checklist:**
- ✅ Index foreign keys
- ✅ Index WHERE columns
- ✅ Index ORDER BY columns
- ✅ Composite indexes for common patterns
- ✅ High selectivity first
- ✅ Update statistics
- ✅ Monitor and remove unused indexes

**Next Steps:**
- Learn [Index Selectivity](index_selectivity.md) for choosing columns
- Study [Composite Indexes](composite_index.md) for multi-column indexes
- Master [Performance Optimization](../10_performance_optimization/) for tuning

