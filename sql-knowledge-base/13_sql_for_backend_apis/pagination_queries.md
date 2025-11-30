# Pagination Queries: Efficient Data Retrieval for APIs

Pagination is essential for APIs that return large datasets. This guide covers efficient pagination strategies, performance optimization, and common patterns for backend APIs.

## Why Pagination?

**Problems without pagination:**
- Slow response times (loading all data)
- High memory usage (server and client)
- Poor user experience (long wait times)
- Database overload (large result sets)

**Solution:** Return data in small, manageable chunks (pages).

## Offset-Based Pagination

### Basic Implementation

```sql
-- Get page of users
SELECT *
FROM users
ORDER BY id
LIMIT 20 OFFSET 0;  -- Page 1: rows 1-20

SELECT *
FROM users
ORDER BY id
LIMIT 20 OFFSET 20;  -- Page 2: rows 21-40
```

### API Implementation

```sql
-- Backend API endpoint pattern
-- GET /api/users?page=1&size=20

SELECT *
FROM users
ORDER BY created_at DESC
LIMIT :size OFFSET (:page - 1) * :size;
```

**Parameters:**
- `page`: Page number (1-based)
- `size`: Items per page (default: 20, max: 100)

### Getting Total Count

```sql
-- Get total count for pagination metadata
SELECT COUNT(*) AS total
FROM users;

-- Combined query
SELECT 
    (SELECT COUNT(*) FROM users) AS total,
    u.*
FROM users u
ORDER BY u.created_at DESC
LIMIT 20 OFFSET 0;
```

**Performance Issue:** COUNT(*) can be slow on large tables.

### Offset Pagination Problems

**Problem 1: Performance Degrades with Offset**

```sql
-- Page 1: Fast
SELECT * FROM users ORDER BY id LIMIT 20 OFFSET 0;
-- Execution: ~5ms

-- Page 100: Slow
SELECT * FROM users ORDER BY id LIMIT 20 OFFSET 2000;
-- Execution: ~200ms (must skip 2000 rows!)
```

**Problem 2: Inconsistent Results**

```sql
-- User requests page 2
SELECT * FROM users ORDER BY id LIMIT 20 OFFSET 20;
-- Returns rows 21-40

-- New user inserted (id=15)
-- User requests page 2 again
SELECT * FROM users ORDER BY id LIMIT 20 OFFSET 20;
-- Returns rows 21-41 (row 21 now different, row 40 missing)
```

## Cursor-Based Pagination

### Basic Implementation

```sql
-- Get first page
SELECT *
FROM users
ORDER BY id
LIMIT 21;  -- Fetch one extra to check for next page

-- Get next page (using cursor)
SELECT *
FROM users
WHERE id > :last_id  -- Cursor from previous page
ORDER BY id
LIMIT 21;
```

### API Implementation

```sql
-- GET /api/users?cursor=123&limit=20

SELECT *
FROM users
WHERE id > :cursor
ORDER BY id
LIMIT :limit + 1;  -- Fetch one extra

-- In application:
-- If result has limit+1 rows, there's a next page
-- Return limit rows, use last row's id as next cursor
```

**Benefits:**
- Consistent results (even if data changes)
- Better performance (no OFFSET)
- Scales well

### Cursor Pagination Response

```json
{
  "items": [...],
  "next_cursor": 123,
  "has_more": true
}
```

## Keyset Pagination (Timestamp-Based)

### Implementation

```sql
-- First page
SELECT *
FROM orders
ORDER BY created_at DESC, id DESC
LIMIT 21;

-- Next page
SELECT *
FROM orders
WHERE (created_at, id) < (:last_created_at, :last_id)
ORDER BY created_at DESC, id DESC
LIMIT 21;
```

**Why Composite Cursor:**
- `created_at` alone may have duplicates
- Adding `id` ensures unique ordering

### API Pattern

```sql
-- GET /api/orders?cursor=2024-11-30T10:00:00Z,123&limit=20

SELECT *
FROM orders
WHERE (created_at, id) < (:cursor_timestamp, :cursor_id)
ORDER BY created_at DESC, id DESC
LIMIT :limit + 1;
```

## Performance Optimization

### 1. Index ORDER BY Columns

```sql
-- Create index for pagination
CREATE INDEX idx_users_created_id ON users(created_at DESC, id DESC);

-- Query uses index
SELECT *
FROM users
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

### 2. Covering Indexes

```sql
-- If query only needs specific columns
SELECT id, name, email
FROM users
ORDER BY created_at DESC
LIMIT 20;

-- Create covering index
CREATE INDEX idx_users_covering ON users(created_at DESC) 
INCLUDE (id, name, email);

-- Index Only Scan (fastest!)
```

### 3. Avoid COUNT(*) for Large Tables

```sql
-- ❌ Slow: COUNT(*) on large table
SELECT COUNT(*) FROM users;  -- May take seconds

-- ✅ Better: Estimate or cache
-- Option 1: Use table statistics
SELECT reltuples::BIGINT AS estimate
FROM pg_class
WHERE relname = 'users';

-- Option 2: Cache count, update periodically
-- Store in Redis or separate table
```

## Real-World API Patterns

### Pattern 1: RESTful Pagination

```sql
-- GET /api/users?page=1&per_page=20

-- Backend implementation
SELECT 
    id,
    name,
    email,
    created_at
FROM users
WHERE is_active = true
ORDER BY created_at DESC
LIMIT :per_page OFFSET (:page - 1) * :per_page;
```

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 1000,
    "total_pages": 50
  }
}
```

### Pattern 2: Cursor-Based API

```sql
-- GET /api/users?cursor=123&limit=20

SELECT *
FROM users
WHERE id > :cursor
ORDER BY id
LIMIT :limit + 1;
```

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "next_cursor": 143,
    "has_more": true
  }
}
```

### Pattern 3: GraphQL-Style Pagination

```sql
-- Supports both first/after and last/before
-- GET /graphql?query={users(first: 20, after: "cursor123")}

SELECT *
FROM users
WHERE id > :after_cursor
ORDER BY id
LIMIT :first + 1;
```

## Common Pagination Patterns

### Pattern 1: Search with Pagination

```sql
-- Search users with pagination
SELECT 
    id,
    name,
    email
FROM users
WHERE 
    name ILIKE '%' || :search || '%'
    OR email ILIKE '%' || :search || '%'
ORDER BY created_at DESC
LIMIT :limit OFFSET :offset;
```

### Pattern 2: Filtered Pagination

```sql
-- Paginate filtered results
SELECT *
FROM orders
WHERE 
    user_id = :user_id
    AND status = :status
    AND created_at >= :start_date
ORDER BY created_at DESC
LIMIT :limit OFFSET :offset;
```

### Pattern 3: Related Data Pagination

```sql
-- Paginate orders with user info
SELECT 
    o.id,
    o.total,
    o.created_at,
    u.name AS user_name,
    u.email AS user_email
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE u.is_active = true
ORDER BY o.created_at DESC
LIMIT :limit OFFSET :offset;
```

## Performance Comparison

### Offset Pagination

```sql
-- Page 1: Fast
EXPLAIN ANALYZE
SELECT * FROM users ORDER BY id LIMIT 20 OFFSET 0;
-- Execution Time: 5ms

-- Page 1000: Slow
EXPLAIN ANALYZE
SELECT * FROM users ORDER BY id LIMIT 20 OFFSET 20000;
-- Execution Time: 500ms (must skip 20,000 rows!)
```

### Cursor Pagination

```sql
-- Any page: Fast (consistent)
EXPLAIN ANALYZE
SELECT * FROM users WHERE id > 20000 ORDER BY id LIMIT 20;
-- Execution Time: 5ms (uses index, no skipping)
```

## Best Practices

1. **Use Cursor Pagination**: For large datasets, better performance
2. **Index ORDER BY Columns**: Essential for performance
3. **Limit Page Size**: Max 100 items per page
4. **Avoid COUNT(*)**: For large tables, use estimates or cache
5. **Consistent Ordering**: Always use ORDER BY
6. **Handle Edge Cases**: Empty results, invalid cursors

## Common Mistakes

### ❌ No ORDER BY

```sql
-- ❌ Bad: Unpredictable order
SELECT * FROM users LIMIT 20;

-- ✅ Good: Explicit ordering
SELECT * FROM users ORDER BY id LIMIT 20;
```

### ❌ Large OFFSET

```sql
-- ❌ Bad: Very slow
SELECT * FROM users ORDER BY id LIMIT 20 OFFSET 100000;

-- ✅ Better: Use cursor pagination
SELECT * FROM users WHERE id > :cursor ORDER BY id LIMIT 20;
```

### ❌ COUNT(*) on Every Request

```sql
-- ❌ Bad: Slow COUNT on every pagination request
SELECT COUNT(*) FROM users;  -- Takes seconds

-- ✅ Better: Cache or estimate
-- Update count periodically, not on every request
```

## Summary

**Pagination Essentials:**

1. **Offset-Based**: Simple, but degrades with large offsets
2. **Cursor-Based**: Consistent, performant, scales well
3. **Keyset Pagination**: Timestamp-based, good for time-ordered data
4. **Performance**: Index ORDER BY columns, avoid large OFFSETs
5. **API Design**: Clear pagination parameters and response format

**Key Takeaway:**
Pagination is essential for API performance. Use cursor-based pagination for large datasets, always index ORDER BY columns, and avoid COUNT(*) on every request. Choose the right strategy based on your use case.

**When to Use:**
- **Offset**: Small datasets, need to jump to specific pages
- **Cursor**: Large datasets, infinite scroll, consistent results
- **Keyset**: Time-ordered data, social media feeds

**Next Steps:**
- Learn [Search + Filtering](search_filtering.md) for advanced pagination
- Study [Performance Optimization](../10_performance_optimization/) for query tuning
- Master [Indexes](../08_indexes/what_is_index.md) for pagination performance

