# Proper Index Usage: Best Practices for Indexing

Proper index usage is crucial for database performance. This guide covers best practices for creating and using indexes effectively.

## When to Create Indexes

### ✅ Good Candidates for Indexing

```sql
-- ✅ Primary keys (automatically indexed)
CREATE TABLE users (
    id SERIAL PRIMARY KEY  -- Indexed automatically
);

-- ✅ Foreign keys (often queried)
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id)  -- Should be indexed
);
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- ✅ Frequently queried columns
SELECT * FROM users WHERE email = 'user@example.com';
CREATE INDEX idx_users_email ON users(email);

-- ✅ Columns in WHERE clauses
SELECT * FROM orders WHERE status = 'completed';
CREATE INDEX idx_orders_status ON orders(status);

-- ✅ Columns in JOIN conditions
SELECT * FROM users u
JOIN orders o ON u.id = o.user_id;
-- Index on o.user_id (already foreign key)

-- ✅ Columns in ORDER BY
SELECT * FROM users ORDER BY created_at DESC;
CREATE INDEX idx_users_created ON users(created_at);
```

### ❌ Don't Index These

```sql
-- ❌ Rarely queried columns
-- Don't index columns that are never in WHERE/JOIN/ORDER BY

-- ❌ Very low selectivity
CREATE TABLE users (
    status VARCHAR(10)  -- Only 3 values: 'active', 'inactive', 'pending'
);
-- Index on status may not help much (low selectivity)

-- ❌ Very small tables
-- Tables with < 1000 rows: Index overhead may not be worth it

-- ❌ Frequently updated columns
-- Indexes slow down INSERT/UPDATE/DELETE
-- Balance: Query speed vs write speed
```

## Index Column Order

### Composite Index Order Matters

```sql
-- ❌ Bad: Low selectivity first
CREATE INDEX idx_orders_status_user ON orders(status, user_id);
-- status has few values, less selective

-- ✅ Good: High selectivity first
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
-- user_id more selective, better index usage

-- Rule: Most selective column first
```

### Left-Prefix Rule

```sql
-- Composite index: (user_id, status, created_at)
CREATE INDEX idx_orders_composite ON orders(user_id, status, created_at);

-- ✅ Uses index: All columns
SELECT * FROM orders 
WHERE user_id = 1 AND status = 'completed' AND created_at > '2023-01-01';

-- ✅ Uses index: First column
SELECT * FROM orders WHERE user_id = 1;

-- ✅ Uses index: First two columns
SELECT * FROM orders WHERE user_id = 1 AND status = 'completed';

-- ❌ Doesn't use index: Second column only
SELECT * FROM orders WHERE status = 'completed';

-- ❌ Doesn't use index: Third column only
SELECT * FROM orders WHERE created_at > '2023-01-01';
```

## Index Types by Use Case

### Equality Queries

```sql
-- B-Tree index (default)
CREATE INDEX idx_users_email ON users(email);
SELECT * FROM users WHERE email = 'user@example.com';
```

### Range Queries

```sql
-- B-Tree index
CREATE INDEX idx_users_created ON users(created_at);
SELECT * FROM users WHERE created_at BETWEEN '2023-01-01' AND '2023-12-31';
```

### Full-Text Search

```sql
-- GIN index (PostgreSQL)
CREATE INDEX idx_articles_content_gin 
ON articles USING gin(to_tsvector('english', content));
SELECT * FROM articles 
WHERE to_tsvector('english', content) @@ to_tsquery('database');
```

### Array Queries

```sql
-- GIN index (PostgreSQL)
CREATE INDEX idx_products_tags_gin ON products USING gin(tags);
SELECT * FROM products WHERE 'electronics' = ANY(tags);
```

## Covering Indexes

### Index-Only Scans

```sql
-- Covering index: All columns in query are in index
CREATE INDEX idx_users_email_name ON users(email, name);

-- Query uses index only (no table access)
SELECT email, name FROM users WHERE email = 'user@example.com';
-- Index Only Scan (very fast!)

-- Query needs table access
SELECT email, name, age FROM users WHERE email = 'user@example.com';
-- Index Scan + Table access (slower)
```

## Partial Indexes

### Index Subset of Rows

```sql
-- Partial index: Only index active users
CREATE INDEX idx_users_active_email 
ON users(email) 
WHERE status = 'active';

-- ✅ Uses index
SELECT * FROM users WHERE email = 'user@example.com' AND status = 'active';

-- ❌ Doesn't use index
SELECT * FROM users WHERE email = 'user@example.com' AND status = 'inactive';
```

### Benefits

```sql
-- Smaller index size
-- Faster queries on indexed subset
-- Less maintenance overhead
```

## Expression Indexes

### Index on Expressions

```sql
-- Index on function result
CREATE INDEX idx_users_email_lower ON users(LOWER(email));

-- ✅ Uses index
SELECT * FROM users WHERE LOWER(email) = 'user@example.com';

-- ❌ Doesn't use index
SELECT * FROM users WHERE email = 'user@example.com';
```

### Common Use Cases

```sql
-- Case-insensitive search
CREATE INDEX idx_users_email_lower ON users(LOWER(email));

-- Date truncation
CREATE INDEX idx_orders_date ON orders(DATE(created_at));

-- JSONB paths
CREATE INDEX idx_users_metadata_role 
ON users USING gin((metadata->>'role'));
```

## Monitoring Index Usage

### Check Index Usage

```sql
-- PostgreSQL: pg_stat_user_indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan AS index_scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan;

-- Unused indexes: idx_scan = 0
-- Consider dropping unused indexes
```

### Identify Missing Indexes

```sql
-- Check for sequential scans on large tables
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'user@example.com';
-- If shows "Seq Scan", consider adding index
```

## Index Maintenance

### Rebuild Indexes

```sql
-- PostgreSQL: REINDEX
REINDEX INDEX idx_users_email;

-- Rebuild all indexes on table
REINDEX TABLE users;

-- Rebuild all indexes in database
REINDEX DATABASE mydb;
```

### Update Statistics

```sql
-- Update statistics for query planner
ANALYZE users;

-- Update all tables
ANALYZE;
```

## Common Mistakes

### ❌ Over-Indexing

```sql
-- ❌ Bad: Too many indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_name ON users(name);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_address ON users(address);
-- Slows down INSERT/UPDATE/DELETE

-- ✅ Good: Index only frequently queried columns
CREATE INDEX idx_users_email ON users(email);  -- Most common query
```

### ❌ Wrong Column Order

```sql
-- ❌ Bad: Low selectivity first
CREATE INDEX idx_orders_status_user ON orders(status, user_id);

-- ✅ Good: High selectivity first
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
```

### ❌ Indexing Every Column

```sql
-- ❌ Bad: Index every column
CREATE INDEX idx_users_id ON users(id);
CREATE INDEX idx_users_name ON users(name);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
-- ... (indexes on all columns)

-- ✅ Good: Index based on query patterns
-- Analyze queries, index only what's needed
```

## Best Practices

1. **Index Foreign Keys**: Often used in JOINs
2. **Index WHERE Clauses**: Columns in WHERE conditions
3. **Index ORDER BY**: Columns used for sorting
4. **Composite Indexes**: Order by selectivity
5. **Monitor Usage**: Track index usage, drop unused
6. **Update Statistics**: Run ANALYZE regularly
7. **Rebuild Periodically**: Maintain index performance

## Summary

**Proper Index Usage:**

1. **When**: Index foreign keys, WHERE columns, ORDER BY columns
2. **Order**: High selectivity first in composite indexes
3. **Types**: Choose right index type for use case
4. **Covering**: Include all query columns when possible
5. **Monitor**: Track usage, drop unused indexes

**Key Takeaway:**
Proper index usage requires understanding when to index, what to index, and how to order composite indexes. Index foreign keys, frequently queried columns, and columns in WHERE/ORDER BY clauses. Order composite indexes by selectivity. Monitor index usage and maintain indexes regularly. Don't over-index—balance query speed with write performance.

**Index Strategy:**
- Index foreign keys
- Index WHERE/JOIN/ORDER BY columns
- Order composite indexes by selectivity
- Monitor and maintain indexes

**Next Steps:**
- Learn [Index Selectivity](../08_indexes/index_selectivity.md) for optimization
- Study [Composite Index](../08_indexes/composite_index.md) for multi-column indexes
- Master [Query Optimization Tips](query_optimization_tips.md) for techniques

