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

---

## 🎯 Interview Questions: SQL

### Q1: Explain the difference between offset-based pagination and cursor-based pagination. Provide detailed performance comparisons, explain when to use each approach, and discuss the problems with offset pagination on large datasets. Include examples showing how to implement both approaches.

**Answer:**

**Pagination Overview:**

Pagination is the process of dividing large result sets into smaller, manageable chunks (pages) for display. There are two main approaches: offset-based pagination (using LIMIT and OFFSET) and cursor-based pagination (using WHERE conditions with cursor values). Each has different performance characteristics and use cases.

**Offset-Based Pagination:**

**How It Works:**

Offset pagination uses `LIMIT` and `OFFSET` to skip a certain number of rows and return the next N rows.

**Syntax:**
```sql
SELECT * FROM table_name
ORDER BY column
LIMIT page_size OFFSET (page_number - 1) * page_size;
```

**Example:**
```sql
-- Page 1: First 20 rows
SELECT * FROM users
ORDER BY id
LIMIT 20 OFFSET 0;

-- Page 2: Next 20 rows
SELECT * FROM users
ORDER BY id
LIMIT 20 OFFSET 20;

-- Page 100: Rows 1,980-2,000
SELECT * FROM users
ORDER BY id
LIMIT 20 OFFSET 1980;
```

**How Database Executes OFFSET:**

**Visual Representation:**
```
Page 1 (OFFSET 0):
┌─────────────────────────────────────┐
│ Database scans and skips: 0 rows    │
│ Returns: Rows 1-20                  │
│ Time: Fast (5ms)                    │
└─────────────────────────────────────┘

Page 100 (OFFSET 1980):
┌─────────────────────────────────────┐
│ Database scans and skips: 1,980 rows│
│ Returns: Rows 1,981-2,000           │
│ Time: Slow (500ms)                   │
│ Problem: Must scan all skipped rows! │
└─────────────────────────────────────┘
```

**Execution Process:**
1. Database scans rows in ORDER BY order
2. Skips OFFSET number of rows (must read but discard them)
3. Returns next LIMIT rows

**Performance Problem:**

**The Problem with Large OFFSETs:**

As OFFSET increases, the database must scan and skip more rows, making queries progressively slower.

**Performance Comparison:**

**Scenario:** 1,000,000 users, 20 rows per page

```sql
-- Page 1: OFFSET 0
SELECT * FROM users ORDER BY id LIMIT 20 OFFSET 0;
-- Execution: Scan 0 rows, return 20
-- Time: ~5ms

-- Page 100: OFFSET 1,980
SELECT * FROM users ORDER BY id LIMIT 20 OFFSET 1980;
-- Execution: Scan 1,980 rows, return 20
-- Time: ~50ms

-- Page 1,000: OFFSET 19,980
SELECT * FROM users ORDER BY id LIMIT 20 OFFSET 19980;
-- Execution: Scan 19,980 rows, return 20
-- Time: ~500ms

-- Page 10,000: OFFSET 199,980
SELECT * FROM users ORDER BY id LIMIT 20 OFFSET 199980;
-- Execution: Scan 199,980 rows, return 20
-- Time: ~5,000ms (5 seconds!)
```

**Why It's Slow:**

**Even with Index:**
```sql
-- Index on id exists
CREATE INDEX idx_users_id ON users(id);

-- Page 10,000 query
SELECT * FROM users ORDER BY id LIMIT 20 OFFSET 199980;

-- Execution:
-- 1. Index scan to position 199,980
-- 2. Must traverse index to skip 199,980 entries
-- 3. Then return next 20
-- Still slow: Index traversal is expensive for large offsets
```

**Additional Problems:**

**1. Inconsistent Results:**
```sql
-- User adds new record between page requests
-- Page 1: Shows users 1-20
-- New user inserted (id=5)
-- Page 2: Shows users 21-40
-- But user 20 might appear again, or user 21 might be skipped
```

**2. Duplicate or Missing Rows:**
- New rows inserted → duplicates
- Rows deleted → gaps
- Data changes → inconsistent pagination

**Cursor-Based Pagination:**

**How It Works:**

Cursor pagination uses a WHERE condition with a cursor value (typically the last seen ID or timestamp) to fetch the next page.

**Syntax:**
```sql
SELECT * FROM table_name
WHERE id > last_seen_id
ORDER BY id
LIMIT page_size;
```

**Example:**
```sql
-- Page 1: First 20 rows
SELECT * FROM users
ORDER BY id
LIMIT 20;
-- Returns: users with id 1-20
-- Cursor: 20 (last id seen)

-- Page 2: Next 20 rows after cursor
SELECT * FROM users
WHERE id > 20
ORDER BY id
LIMIT 20;
-- Returns: users with id 21-40
-- Cursor: 40

-- Page 100: Next 20 rows after cursor
SELECT * FROM users
WHERE id > 1980
ORDER BY id
LIMIT 20;
-- Returns: users with id 1981-2000
-- Cursor: 2000
```

**How Database Executes Cursor Pagination:**

**Visual Representation:**
```
Page 1:
┌─────────────────────────────────────┐
│ Index scan: Start from beginning    │
│ Returns: Rows 1-20                  │
│ Time: Fast (5ms)                    │
└─────────────────────────────────────┘

Page 100:
┌─────────────────────────────────────┐
│ Index scan: WHERE id > 1980         │
│ Returns: Rows 1981-2000             │
│ Time: Fast (5ms)                    │
│ Advantage: Direct index lookup!     │
└─────────────────────────────────────┘
```

**Execution Process:**
1. Database uses index to find rows where id > cursor
2. Returns next LIMIT rows
3. No scanning/skipping needed!

**Performance Advantage:**

**Consistent Performance:**
```sql
-- Page 1: Cursor 0
SELECT * FROM users WHERE id > 0 ORDER BY id LIMIT 20;
-- Time: ~5ms (index lookup)

-- Page 100: Cursor 1980
SELECT * FROM users WHERE id > 1980 ORDER BY id LIMIT 20;
-- Time: ~5ms (index lookup)
-- Same performance regardless of page!

-- Page 10,000: Cursor 199,980
SELECT * FROM users WHERE id > 199980 ORDER BY id LIMIT 20;
-- Time: ~5ms (index lookup)
-- Still fast!
```

**Performance Comparison:**

**Test Scenario:** 1,000,000 users, 20 rows per page

| Page | Offset-Based | Cursor-Based | Improvement |
|------|--------------|--------------|-------------|
| 1 | 5ms | 5ms | Same |
| 100 | 50ms | 5ms | 10x faster |
| 1,000 | 500ms | 5ms | 100x faster |
| 10,000 | 5,000ms | 5ms | 1,000x faster |

**Cursor pagination maintains consistent performance regardless of page number!**

**When to Use Each:**

**Use Offset Pagination When:**

**1. Small Datasets:**
- Few thousand rows total
- Performance is acceptable
- Users rarely go beyond first few pages

**2. Need to Jump to Specific Pages:**
- "Go to page 50" functionality
- Table of contents with page numbers
- Users need random page access

**3. Simple Implementation:**
- Quick to implement
- Works with any ORDER BY
- No cursor management needed

**Example:**
```sql
-- Blog posts: 1,000 total posts
-- Users typically only view first 10 pages
SELECT * FROM posts
ORDER BY created_at DESC
LIMIT 20 OFFSET (:page - 1) * 20;
-- Acceptable performance for small dataset
```

**Use Cursor Pagination When:**

**1. Large Datasets:**
- Millions of rows
- Performance critical
- Users browse sequentially (infinite scroll)

**2. Real-Time Data:**
- Data changes frequently
- Need consistent results
- Avoid duplicates/gaps

**3. High-Traffic APIs:**
- Many concurrent users
- Need consistent performance
- Scalability important

**Example:**
```sql
-- Social media feed: 100 million posts
-- Users scroll through feed
SELECT * FROM posts
WHERE id > :cursor
ORDER BY id
LIMIT 20;
-- Consistent performance for any page
```

**Implementation Examples:**

**Offset-Based API:**

**Backend:**
```python
def get_users(page=1, per_page=20):
    offset = (page - 1) * per_page
    users = db.query("""
        SELECT * FROM users
        ORDER BY id
        LIMIT ? OFFSET ?
    """, per_page, offset)
    
    total = db.query("SELECT COUNT(*) FROM users")[0]['count']
    
    return {
        'data': users,
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': total,
            'total_pages': (total + per_page - 1) // per_page
        }
    }
```

**API Response:**
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

**Cursor-Based API:**

**Backend:**
```python
def get_users(cursor=None, limit=20):
    if cursor:
        users = db.query("""
            SELECT * FROM users
            WHERE id > ?
            ORDER BY id
            LIMIT ?
        """, cursor, limit + 1)  # Fetch one extra to check has_more
    else:
        users = db.query("""
            SELECT * FROM users
            ORDER BY id
            LIMIT ?
        """, limit + 1)
    
    has_more = len(users) > limit
    if has_more:
        users = users[:-1]  # Remove extra row
    
    next_cursor = users[-1]['id'] if users else None
    
    return {
        'data': users,
        'pagination': {
            'next_cursor': next_cursor,
            'has_more': has_more
        }
    }
```

**API Response:**
```json
{
  "data": [...],
  "pagination": {
    "next_cursor": 20,
    "has_more": true
  }
}
```

**Client Usage:**
```javascript
// First page
let response = await fetch('/api/users');
let users = response.data;
let cursor = response.pagination.next_cursor;

// Next page
response = await fetch(`/api/users?cursor=${cursor}`);
users = response.data;
cursor = response.pagination.next_cursor;
```

**Keyset Pagination (Timestamp-Based):**

**For Time-Ordered Data:**
```sql
-- First page
SELECT * FROM posts
ORDER BY created_at DESC, id DESC
LIMIT 20;

-- Next page (using last seen timestamp and id)
SELECT * FROM posts
WHERE (created_at, id) < (:last_created_at, :last_id)
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

**Why Composite Cursor:**
- `created_at` alone may have duplicates
- Adding `id` ensures unique ordering
- Prevents missing or duplicate rows

**System Design Consideration**: Choosing the right pagination strategy is crucial for:
1. **Performance**: Cursor pagination scales better
2. **User Experience**: Consistent response times
3. **Data Consistency**: Cursor pagination avoids duplicates
4. **Scalability**: Handling large datasets efficiently

Offset pagination is simple but degrades with large offsets. Cursor pagination maintains consistent performance but requires cursor management. For large datasets and high-traffic applications, cursor pagination is the better choice. For small datasets or when users need to jump to specific pages, offset pagination is acceptable.

---

### Q2: Explain how to implement efficient pagination with filtering and sorting. Discuss the challenges of combining pagination with WHERE clauses and ORDER BY, and provide solutions for maintaining performance. Include examples of composite indexes for pagination queries.

**Answer:**

**Pagination with Filtering and Sorting:**

Real-world pagination often requires filtering (WHERE clauses) and sorting (ORDER BY) in addition to pagination. Combining these features efficiently requires careful index design and query optimization.

**Challenge: Filtering + Pagination**

**Problem:**
```sql
-- Filtered pagination query
SELECT * FROM orders
WHERE status = 'completed'
  AND created_at >= '2024-01-01'
ORDER BY created_at DESC
LIMIT 20 OFFSET 100;
```

**Without Proper Index:**
```sql
-- Execution plan:
-- 1. Sequential scan on orders table
-- 2. Filter: status = 'completed' AND created_at >= '2024-01-01'
-- 3. Sort results
-- 4. Skip 100 rows, return 20
-- Time: Very slow (seconds)
```

**Solution: Composite Index**

**Optimal Index:**
```sql
-- Index matches query pattern
CREATE INDEX idx_orders_status_date 
ON orders(status, created_at DESC);
```

**With Index:**
```sql
-- Execution plan:
-- 1. Index scan: status = 'completed'
-- 2. Range scan: created_at >= '2024-01-01'
-- 3. Results already sorted by created_at DESC
-- 4. Skip 100, return 20
-- Time: Fast (~10ms)
```

**Challenge: Multiple Filters + Pagination**

**Query:**
```sql
SELECT * FROM orders
WHERE user_id = 123
  AND status = 'completed'
  AND created_at >= '2024-01-01'
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;
```

**Index Design:**

**Option 1: Match Filter Order**
```sql
-- Index matches WHERE clause order
CREATE INDEX idx_orders_user_status_date 
ON orders(user_id, status, created_at DESC);
```

**Why This Works:**
- `user_id` first: Most selective filter
- `status` second: Second filter
- `created_at` last: Used for ORDER BY and range filter

**Query Performance:**
```sql
-- Uses index efficiently
-- Index scan: user_id = 123 AND status = 'completed'
-- Range: created_at >= '2024-01-01'
-- Already sorted: No additional sort needed
-- Fast!
```

**Option 2: Covering Index**
```sql
-- Include all selected columns
CREATE INDEX idx_orders_covering 
ON orders(user_id, status, created_at DESC)
INCLUDE (total, payment_method);
-- PostgreSQL: INCLUDE clause
```

**Benefits:**
- Index-only scan possible
- No table access needed
- Even faster!

**Challenge: Sorting on Different Column**

**Query:**
```sql
SELECT * FROM orders
WHERE user_id = 123
  AND status = 'completed'
ORDER BY total DESC  -- Different from filter columns!
LIMIT 20;
```

**Problem:**
```sql
-- Index on (user_id, status, created_at)
-- Cannot use for ORDER BY total
-- Must sort in memory after filtering
```

**Solution 1: Add Sort Column to Index**
```sql
-- Include sort column in index
CREATE INDEX idx_orders_user_status_total 
ON orders(user_id, status, total DESC);
```

**Query Performance:**
```sql
-- Uses index for filtering AND sorting
-- No in-memory sort needed
-- Fast!
```

**Solution 2: Multiple Indexes**
```sql
-- Index for different sort orders
CREATE INDEX idx_orders_user_status_date 
ON orders(user_id, status, created_at DESC);

CREATE INDEX idx_orders_user_status_total 
ON orders(user_id, status, total DESC);

-- Database chooses appropriate index based on ORDER BY
```

**Challenge: Cursor Pagination with Filters**

**Query:**
```sql
-- First page
SELECT * FROM orders
WHERE user_id = 123
  AND status = 'completed'
ORDER BY created_at DESC, id DESC
LIMIT 20;

-- Next page (cursor-based)
SELECT * FROM orders
WHERE user_id = 123
  AND status = 'completed'
  AND (created_at, id) < (:last_created_at, :last_id)
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

**Index:**
```sql
-- Composite index for filtering and cursor
CREATE INDEX idx_orders_user_status_date_id 
ON orders(user_id, status, created_at DESC, id DESC);
```

**Why Composite Cursor:**
- `created_at` may have duplicates
- Adding `id` ensures unique ordering
- Prevents pagination issues

**Performance:**
```sql
-- Consistent performance for any page
-- Index lookup: O(log n)
-- No OFFSET scanning
-- Fast!
```

**Real-World Example: E-commerce Orders API**

**Endpoint:** GET /api/orders?user_id=123&status=completed&sort=date&page=1

**Query:**
```sql
SELECT 
    id,
    total,
    status,
    created_at,
    payment_method
FROM orders
WHERE user_id = :user_id
  AND status = :status
ORDER BY created_at DESC, id DESC
LIMIT 20 OFFSET (:page - 1) * 20;
```

**Optimal Index:**
```sql
CREATE INDEX idx_orders_user_status_date_id 
ON orders(user_id, status, created_at DESC, id DESC)
INCLUDE (total, payment_method);
-- Covering index: All columns in SELECT
```

**Execution:**
```sql
-- Index-only scan
-- No table access
-- Very fast!
```

**Challenge: Dynamic Filters**

**Problem:** Filters change based on user input

**Query:**
```sql
-- Sometimes: WHERE user_id = ? AND status = ?
-- Sometimes: WHERE user_id = ? AND status = ? AND category = ?
-- Sometimes: WHERE status = ? (no user_id)
```

**Solution: Multiple Indexes**

```sql
-- Index 1: For user_id + status queries
CREATE INDEX idx_orders_user_status 
ON orders(user_id, status, created_at DESC);

-- Index 2: For status-only queries
CREATE INDEX idx_orders_status 
ON orders(status, created_at DESC);

-- Index 3: For user_id + status + category queries
CREATE INDEX idx_orders_user_status_category 
ON orders(user_id, status, category_id, created_at DESC);
```

**Database Optimizer:**
- Chooses appropriate index based on query
- May use multiple indexes and combine results

**Best Practices:**

**1. Index ORDER BY Columns:**
```sql
-- Always index columns used in ORDER BY
-- Especially for cursor pagination
CREATE INDEX idx_orders_date_id 
ON orders(created_at DESC, id DESC);
```

**2. Match Index to Query Pattern:**
```sql
-- Analyze common query patterns
-- Create indexes that match WHERE + ORDER BY
CREATE INDEX idx_orders_user_date 
ON orders(user_id, created_at DESC);
```

**3. Use Covering Indexes:**
```sql
-- Include frequently selected columns
CREATE INDEX idx_orders_covering 
ON orders(user_id, status, created_at DESC)
INCLUDE (total, payment_method);
```

**4. Composite Cursors for Consistency:**
```sql
-- Use (timestamp, id) for cursor
-- Prevents duplicates and gaps
WHERE (created_at, id) < (:last_created_at, :last_id)
```

**5. Avoid COUNT(*) on Large Tables:**
```sql
-- ❌ Slow: COUNT(*) on every pagination request
SELECT COUNT(*) FROM orders WHERE user_id = 123;

-- ✅ Better: Cache count or use estimates
-- Update count periodically, not on every request
```

**Performance Comparison:**

**Test Scenario:** 10,000,000 orders, filter by user_id + status, page 1000

**Without Index:**
```sql
SELECT * FROM orders
WHERE user_id = 123 AND status = 'completed'
ORDER BY created_at DESC
LIMIT 20 OFFSET 19980;
-- Time: ~10,000ms (10 seconds)
-- Sequential scan + sort + skip
```

**With Single-Column Indexes:**
```sql
CREATE INDEX idx_user ON orders(user_id);
CREATE INDEX idx_status ON orders(status);

-- Same query
-- Time: ~5,000ms
-- Must intersect two indexes, then sort
```

**With Composite Index:**
```sql
CREATE INDEX idx_user_status_date 
ON orders(user_id, status, created_at DESC);

-- Same query
-- Time: ~50ms
-- Direct index lookup, already sorted
-- 200x faster!
```

**With Covering Index:**
```sql
CREATE INDEX idx_covering 
ON orders(user_id, status, created_at DESC)
INCLUDE (total, payment_method);

-- Same query (only selects indexed columns)
-- Time: ~20ms
-- Index-only scan, no table access
-- 500x faster!
```

**System Design Consideration**: Efficient pagination with filtering requires:
1. **Index Design**: Matching indexes to query patterns
2. **Covering Indexes**: Enabling index-only scans
3. **Composite Cursors**: Ensuring consistent pagination
4. **Query Optimization**: Minimizing sorting and scanning

Efficient pagination with filtering and sorting requires careful index design. Composite indexes that match your query patterns (WHERE + ORDER BY) are essential. Covering indexes can enable index-only scans for even better performance. Always analyze your query patterns and design indexes accordingly. Cursor pagination maintains consistent performance, while offset pagination degrades with large offsets.

