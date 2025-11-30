# LIMIT and OFFSET: Pagination Basics

LIMIT restricts the number of rows returned, and OFFSET skips a specified number of rows. Together, they enable pagination for large result sets.

## Basic Syntax

```sql
SELECT column1, column2, ...
FROM table_name
LIMIT number_of_rows
OFFSET number_to_skip;
```

## LIMIT

### Basic LIMIT

```sql
-- Get first 10 users
SELECT * FROM users
LIMIT 10;
```

### LIMIT with ORDER BY

```sql
-- Get top 10 most expensive products
SELECT * FROM products
ORDER BY price DESC
LIMIT 10;
```

## OFFSET

### Basic OFFSET

```sql
-- Skip first 10 rows, get next 10
SELECT * FROM users
LIMIT 10 OFFSET 10;
```

### Pagination Pattern

```sql
-- Page 1: Rows 1-10
SELECT * FROM users
ORDER BY id
LIMIT 10 OFFSET 0;

-- Page 2: Rows 11-20
SELECT * FROM users
ORDER BY id
LIMIT 10 OFFSET 10;

-- Page 3: Rows 21-30
SELECT * FROM users
ORDER BY id
LIMIT 10 OFFSET 20;
```

## MySQL Syntax Difference

### PostgreSQL / SQLite

```sql
-- Standard SQL
SELECT * FROM users
LIMIT 10 OFFSET 20;
```

### MySQL

```sql
-- MySQL alternative syntax
SELECT * FROM users
LIMIT 20, 10;  -- OFFSET, LIMIT (not LIMIT, OFFSET)
```

## Real-World Examples

### Example 1: Simple Pagination

```sql
-- Paginate users
SELECT * FROM users
ORDER BY created_at DESC
LIMIT :page_size OFFSET :offset;

-- Parameters:
-- page_size = 20
-- offset = (page - 1) * page_size
```

### Example 2: Top Products

```sql
-- Top 10 best-selling products
SELECT 
    p.id,
    p.name,
    SUM(oi.quantity) AS total_sold
FROM products p
JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.id, p.name
ORDER BY total_sold DESC
LIMIT 10;
```

### Example 3: Recent Activity

```sql
-- Most recent 5 orders per user
SELECT DISTINCT ON (user_id)
    user_id,
    id AS order_id,
    total,
    created_at
FROM orders
ORDER BY user_id, created_at DESC
LIMIT 5;
```

## Performance Considerations

### 1. Always Use ORDER BY

```sql
-- ✅ Good: Consistent ordering
SELECT * FROM users
ORDER BY id
LIMIT 10 OFFSET 20;

-- ❌ Bad: Unpredictable order
SELECT * FROM users
LIMIT 10 OFFSET 20;
-- Order may change between queries
```

### 2. Index ORDER BY Columns

```sql
-- Create index for sorting
CREATE INDEX idx_users_created ON users(created_at DESC);

-- Query uses index
SELECT * FROM users
ORDER BY created_at DESC
LIMIT 10;
```

### 3. OFFSET Performance

```sql
-- ⚠️ Warning: Large OFFSETs are slow
SELECT * FROM users
ORDER BY id
LIMIT 10 OFFSET 10000;
-- Must skip 10,000 rows (slow!)

-- ✅ Better: Use cursor-based pagination
SELECT * FROM users
WHERE id > :last_id
ORDER BY id
LIMIT 10;
```

## Cursor-Based Pagination

### Alternative to OFFSET

```sql
-- Cursor-based (faster for large offsets)
SELECT * FROM users
WHERE id > :cursor
ORDER BY id
LIMIT 10;

-- Next page uses last ID from previous page
```

## Common Patterns

### Pattern 1: API Pagination

```sql
-- Backend API pagination
SELECT * FROM products
WHERE category_id = :category_id
ORDER BY created_at DESC
LIMIT :limit OFFSET :offset;

-- Parameters from API:
-- limit = query parameter (default: 20, max: 100)
-- offset = (page - 1) * limit
```

### Pattern 2: Top N Queries

```sql
-- Top 5 products by revenue
SELECT 
    p.id,
    p.name,
    SUM(oi.quantity * oi.price) AS revenue
FROM products p
JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.id, p.name
ORDER BY revenue DESC
LIMIT 5;
```

### Pattern 3: Recent Records

```sql
-- Most recent records
SELECT * FROM orders
ORDER BY created_at DESC
LIMIT 10;
```

## Best Practices

1. **Always ORDER BY**: For consistent results
2. **Index ORDER BY**: For performance
3. **Use LIMIT**: Don't return all rows
4. **Avoid Large OFFSETs**: Use cursor-based pagination
5. **Set Max LIMIT**: Prevent excessive queries

## Common Mistakes

### ❌ No ORDER BY

```sql
-- ❌ Bad: Unpredictable order
SELECT * FROM users
LIMIT 10;

-- ✅ Good: Explicit ordering
SELECT * FROM users
ORDER BY id
LIMIT 10;
```

### ❌ Large OFFSET

```sql
-- ❌ Bad: Very slow
SELECT * FROM users
ORDER BY id
LIMIT 10 OFFSET 100000;

-- ✅ Better: Cursor-based
SELECT * FROM users
WHERE id > :last_id
ORDER BY id
LIMIT 10;
```

## Summary

**LIMIT and OFFSET:**

1. **LIMIT**: Restricts number of rows
2. **OFFSET**: Skips rows before returning
3. **Pagination**: LIMIT + OFFSET for pages
4. **Performance**: Index ORDER BY, avoid large OFFSETs
5. **Best Practice**: Always use ORDER BY with LIMIT

**Key Takeaway:**
LIMIT and OFFSET enable pagination. Always use ORDER BY for consistent results. Index ORDER BY columns for performance. For large offsets, consider cursor-based pagination instead.

**Common Use Cases:**
- Pagination: `LIMIT 20 OFFSET 40`
- Top N: `ORDER BY price DESC LIMIT 10`
- Recent: `ORDER BY created_at DESC LIMIT 5`

**Next Steps:**
- Learn [Pagination Queries](../13_sql_for_backend_apis/pagination_queries.md) for advanced patterns
- Study [Indexes](../08_indexes/what_is_index.md) for performance
- Master [Window Functions](../05_aggregations_grouping/window_functions.md) for rankings

