# ORDER BY: Sorting Query Results

ORDER BY sorts query results by one or more columns in ascending or descending order. It's essential for displaying data in a meaningful sequence.

## Basic ORDER BY Syntax

```sql
SELECT column1, column2, ...
FROM table_name
ORDER BY column1 [ASC|DESC], column2 [ASC|DESC], ...;
```

## Single Column Sorting

### Ascending (Default)

```sql
-- Sort by name (A to Z)
SELECT * FROM users
ORDER BY name;

-- Explicitly ascending
SELECT * FROM users
ORDER BY name ASC;
```

### Descending

```sql
-- Sort by created_at (newest first)
SELECT * FROM users
ORDER BY created_at DESC;
```

## Multiple Column Sorting

### Sort by Multiple Columns

```sql
-- Sort by category, then by price
SELECT * FROM products
ORDER BY category_id ASC, price DESC;
```

**Result Order:**
1. Products in category 1 (sorted by price descending)
2. Products in category 2 (sorted by price descending)
3. Products in category 3 (sorted by price descending)

### Real-World Example

```sql
-- Users sorted by role, then by name
SELECT * FROM users
ORDER BY role ASC, name ASC;
```

## Sorting by Expression

### Calculated Columns

```sql
-- Sort by calculated value
SELECT 
    id,
    name,
    price,
    (price * 0.1) AS discount
FROM products
ORDER BY discount DESC;
```

### Functions

```sql
-- Sort by function result
SELECT 
    id,
    name,
    email
FROM users
ORDER BY LENGTH(name) DESC;  -- Longest names first
```

### Date Functions

```sql
-- Sort by month
SELECT 
    id,
    name,
    created_at
FROM users
ORDER BY DATE_TRUNC('month', created_at) DESC;
```

## NULL Handling

### NULLS FIRST / NULLS LAST

**PostgreSQL:**
```sql
-- NULLs first (default for DESC)
SELECT * FROM users
ORDER BY email DESC NULLS FIRST;

-- NULLs last (default for ASC)
SELECT * FROM users
ORDER BY email ASC NULLS LAST;
```

**MySQL:**
```sql
-- NULLs are sorted first by default
SELECT * FROM users
ORDER BY email ASC;  -- NULLs first

-- To put NULLs last
SELECT * FROM users
ORDER BY 
    CASE WHEN email IS NULL THEN 1 ELSE 0 END,
    email ASC;
```

## Real-World Examples

### Example 1: Recent Orders

```sql
-- Most recent orders first
SELECT * FROM orders
ORDER BY created_at DESC
LIMIT 10;
```

### Example 2: Top Products

```sql
-- Products by price (highest first)
SELECT * FROM products
WHERE status = 'active'
ORDER BY price DESC
LIMIT 10;
```

### Example 3: User List

```sql
-- Users sorted by name
SELECT 
    id,
    name,
    email,
    created_at
FROM users
WHERE is_active = true
ORDER BY name ASC;
```

### Example 4: Complex Sorting

```sql
-- Orders sorted by status, then by date
SELECT * FROM orders
ORDER BY 
    CASE status
        WHEN 'pending' THEN 1
        WHEN 'processing' THEN 2
        WHEN 'completed' THEN 3
        ELSE 4
    END,
    created_at DESC;
```

## Performance Considerations

### 1. Index ORDER BY Columns

```sql
-- Create index for sorting
CREATE INDEX idx_users_created ON users(created_at DESC);

-- Query uses index for sorting
SELECT * FROM users
ORDER BY created_at DESC;
```

### 2. Composite Indexes

```sql
-- Index matches ORDER BY
CREATE INDEX idx_products_category_price ON products(category_id, price DESC);

-- Query uses index
SELECT * FROM products
WHERE category_id = 1
ORDER BY price DESC;
```

### 3. LIMIT with ORDER BY

```sql
-- ✅ Good: LIMIT reduces sorting work
SELECT * FROM products
ORDER BY price DESC
LIMIT 10;  -- Only need top 10

-- ❌ Less efficient: Sort all, then limit
SELECT * FROM products
ORDER BY price DESC;
-- Sorts all rows, then returns all
```

## Common Patterns

### Pattern 1: Latest First

```sql
-- Most recent records first
SELECT * FROM orders
ORDER BY created_at DESC;
```

### Pattern 2: Alphabetical

```sql
-- Alphabetical order
SELECT * FROM users
ORDER BY name ASC;
```

### Pattern 3: Priority Sorting

```sql
-- Custom priority order
SELECT * FROM tasks
ORDER BY 
    CASE priority
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        WHEN 'low' THEN 3
    END,
    created_at ASC;
```

### Pattern 4: Random Order

```sql
-- Random order (PostgreSQL)
SELECT * FROM products
ORDER BY RANDOM()
LIMIT 10;

-- Random order (MySQL)
SELECT * FROM products
ORDER BY RAND()
LIMIT 10;
```

## Best Practices

1. **Index ORDER BY Columns**: For performance
2. **Use LIMIT**: When you don't need all rows
3. **Be Explicit**: Use ASC/DESC for clarity
4. **Handle NULLs**: Use NULLS FIRST/LAST when needed
5. **Composite Indexes**: Match ORDER BY with WHERE

## Common Mistakes

### ❌ Sorting Unindexed Columns

```sql
-- ❌ Bad: No index on name
SELECT * FROM users
ORDER BY name;
-- May be slow on large tables

-- ✅ Good: Create index
CREATE INDEX idx_users_name ON users(name);
SELECT * FROM users
ORDER BY name;
```

### ❌ Sorting After Aggregation

```sql
-- ❌ Wrong: Can't sort by aggregate in WHERE
SELECT user_id, COUNT(*) AS order_count
FROM orders
WHERE COUNT(*) > 5  -- Error!
GROUP BY user_id;

-- ✅ Correct: Use HAVING and ORDER BY
SELECT user_id, COUNT(*) AS order_count
FROM orders
GROUP BY user_id
HAVING COUNT(*) > 5
ORDER BY order_count DESC;
```

## Summary

**ORDER BY Essentials:**

1. **Purpose**: Sort query results
2. **Syntax**: `ORDER BY column [ASC|DESC]`
3. **Multiple Columns**: Sort by multiple columns
4. **NULL Handling**: NULLS FIRST/LAST (PostgreSQL)
5. **Performance**: Index ORDER BY columns

**Key Takeaway:**
ORDER BY sorts query results. Use ASC for ascending, DESC for descending. Sort by multiple columns for complex ordering. Always index ORDER BY columns for performance, especially with LIMIT.

**Common Use Cases:**
- Latest first: `ORDER BY created_at DESC`
- Alphabetical: `ORDER BY name ASC`
- Top N: `ORDER BY price DESC LIMIT 10`
- Custom order: `ORDER BY CASE ... END`

**Next Steps:**
- Learn [LIMIT and OFFSET](pagination.md) for pagination
- Study [Indexes](../08_indexes/what_is_index.md) for performance
- Master [Window Functions](../05_aggregations_grouping/window_functions.md) for advanced sorting

