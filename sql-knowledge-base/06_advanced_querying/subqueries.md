# Subqueries: Nested Queries for Complex Data Retrieval

Subqueries (also called nested queries or inner queries) are queries within queries. They're powerful tools for solving complex data retrieval problems that can't be solved with simple JOINs.

## What is a Subquery?

A **subquery** is a SELECT statement nested inside another SQL statement. It can be used in SELECT, INSERT, UPDATE, DELETE, and WHERE clauses.

### Basic Structure

```sql
-- Outer query
SELECT column1
FROM table1
WHERE column2 IN (
    -- Subquery (inner query)
    SELECT column3
    FROM table2
    WHERE condition
);
```

## Types of Subqueries

### 1. Scalar Subquery

Returns a single value (one row, one column).

```sql
-- Get user with their latest order total
SELECT 
    u.id,
    u.name,
    u.email,
    (
        SELECT MAX(total)
        FROM orders
        WHERE user_id = u.id
    ) AS latest_order_total
FROM users u;
```

**Result:**
```
┌────┬──────────────┬──────────────────┬──────────────────┐
│ id │ name         │ email            │ latest_order_total│
├────┼──────────────┼──────────────────┼──────────────────┤
│ 1  │ John Doe     │ john@example.com │ 149.99           │
│ 2  │ Jane Smith   │ jane@example.com │ 79.99            │
│ 3  │ Bob Johnson  │ bob@example.com  │ NULL             │
└────┴──────────────┴──────────────────┴──────────────────┘
```

**Use Cases:**
- Single aggregate value per row
- Comparison with single value
- Calculations based on related data

### 2. Table Subquery

Returns multiple rows and columns (used with IN, EXISTS, or as derived table).

```sql
-- Users who have placed orders
SELECT *
FROM users
WHERE id IN (
    SELECT DISTINCT user_id
    FROM orders
);
```

**Use Cases:**
- Filtering with IN/NOT IN
- EXISTS/NOT EXISTS checks
- Derived tables in FROM clause

### 3. Correlated Subquery

References columns from the outer query.

```sql
-- Users with orders above their average
SELECT u.id, u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.total > (
    -- Correlated: references u.id from outer query
    SELECT AVG(total)
    FROM orders
    WHERE user_id = u.id
);
```

**Key Point:** Correlated subquery executes once per row of outer query.

## Subquery in WHERE Clause

### Using IN

```sql
-- Users who have placed orders
SELECT *
FROM users
WHERE id IN (
    SELECT DISTINCT user_id
    FROM orders
    WHERE total > 100
);
```

### Using NOT IN

```sql
-- Users who have never placed an order
SELECT *
FROM users
WHERE id NOT IN (
    SELECT DISTINCT user_id
    FROM orders
);
```

**⚠️ Warning:** NOT IN with NULL values can give unexpected results:
```sql
-- If subquery returns NULL, NOT IN behaves unexpectedly
SELECT * FROM users
WHERE id NOT IN (SELECT user_id FROM orders);
-- If user_id has NULL, this returns no rows!

-- ✅ Better: Use NOT EXISTS
SELECT * FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM orders o WHERE o.user_id = u.id
);
```

### Using EXISTS

```sql
-- Users who have placed orders (more efficient than IN)
SELECT *
FROM users u
WHERE EXISTS (
    SELECT 1
    FROM orders o
    WHERE o.user_id = u.id
);
```

**EXISTS vs IN:**
- **EXISTS**: Stops at first match (often faster)
- **IN**: Checks all values (can be slower)
- **EXISTS**: Handles NULLs correctly
- **IN**: NULL handling can be tricky

### Using Comparison Operators

```sql
-- Products priced above average
SELECT *
FROM products
WHERE price > (
    SELECT AVG(price)
    FROM products
);
```

### Using ANY/ALL

```sql
-- Products priced above any product in category 1
SELECT *
FROM products
WHERE price > ANY (
    SELECT price
    FROM products
    WHERE category_id = 1
);

-- Products priced above all products in category 1
SELECT *
FROM products
WHERE price > ALL (
    SELECT price
    FROM products
    WHERE category_id = 1
);
```

## Subquery in SELECT Clause

### Scalar Subquery in SELECT

```sql
-- User with order count
SELECT 
    u.id,
    u.name,
    u.email,
    (
        SELECT COUNT(*)
        FROM orders
        WHERE user_id = u.id
    ) AS order_count,
    (
        SELECT SUM(total)
        FROM orders
        WHERE user_id = u.id
    ) AS total_spent
FROM users u;
```

### Multiple Scalar Subqueries

```sql
-- User statistics
SELECT 
    u.id,
    u.name,
    (
        SELECT COUNT(*)
        FROM orders
        WHERE user_id = u.id
    ) AS order_count,
    (
        SELECT MAX(created_at)
        FROM orders
        WHERE user_id = u.id
    ) AS last_order_date,
    (
        SELECT AVG(total)
        FROM orders
        WHERE user_id = u.id
    ) AS avg_order_value
FROM users u;
```

## Subquery in FROM Clause (Derived Table)

Use subquery result as a table.

```sql
-- Users with their order statistics
SELECT 
    u.name,
    stats.order_count,
    stats.total_spent
FROM users u
JOIN (
    -- Derived table (subquery in FROM)
    SELECT 
        user_id,
        COUNT(*) AS order_count,
        SUM(total) AS total_spent
    FROM orders
    GROUP BY user_id
) stats ON u.id = stats.user_id;
```

**Benefits:**
- Pre-compute aggregations
- Simplify complex queries
- Reuse calculated results

## Correlated Subqueries

Subquery that references outer query columns.

### Basic Correlated Subquery

```sql
-- Orders above user's average order value
SELECT 
    u.name,
    o.id AS order_id,
    o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.total > (
    -- Correlated: uses u.id from outer query
    SELECT AVG(total)
    FROM orders
    WHERE user_id = u.id
);
```

### Performance Consideration

**⚠️ Warning:** Correlated subqueries can be slow:
- Execute once per row of outer query
- For 1000 users = 1000 subquery executions

**Optimization:**
```sql
-- ❌ Slow: Correlated subquery
SELECT 
    u.id,
    u.name,
    (SELECT COUNT(*) FROM orders WHERE user_id = u.id) AS order_count
FROM users u;

-- ✅ Faster: JOIN with aggregation
SELECT 
    u.id,
    u.name,
    COALESCE(COUNT(o.id), 0) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;
```

## Subquery in HAVING Clause

Filter groups based on subquery results.

```sql
-- Users with more orders than average
SELECT 
    u.id,
    u.name,
    COUNT(o.id) AS order_count
FROM users u
JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name
HAVING COUNT(o.id) > (
    SELECT AVG(order_count)
    FROM (
        SELECT COUNT(*) AS order_count
        FROM orders
        GROUP BY user_id
    ) user_orders
);
```

## Subquery Patterns

### Pattern 1: Find Maximum/Minimum

```sql
-- Product with highest price
SELECT *
FROM products
WHERE price = (
    SELECT MAX(price)
    FROM products
);
```

### Pattern 2: Find Records Without Relationships

```sql
-- Products never ordered
SELECT *
FROM products
WHERE id NOT IN (
    SELECT DISTINCT product_id
    FROM order_items
);
```

### Pattern 3: Conditional Aggregation

```sql
-- Users with order statistics
SELECT 
    u.id,
    u.name,
    (
        SELECT COUNT(*)
        FROM orders
        WHERE user_id = u.id
          AND total > 100
    ) AS large_order_count,
    (
        SELECT COUNT(*)
        FROM orders
        WHERE user_id = u.id
          AND created_at > CURRENT_DATE - INTERVAL '30 days'
    ) AS recent_order_count
FROM users u;
```

### Pattern 4: Top N Per Group

```sql
-- Top 3 orders per user
SELECT 
    u.name,
    o.id AS order_id,
    o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.id IN (
    SELECT id
    FROM orders o2
    WHERE o2.user_id = u.id
    ORDER BY o2.total DESC
    LIMIT 3
)
ORDER BY u.name, o.total DESC;
```

## Subquery vs JOIN

### When to Use Subquery

**Use Subquery When:**
- Need single value per row (scalar)
- EXISTS/NOT EXISTS checks
- Complex conditions
- Derived tables for clarity

### When to Use JOIN

**Use JOIN When:**
- Need columns from multiple tables
- Performance is critical
- Simple relationships
- Aggregations across tables

### Comparison Example

**Subquery Approach:**
```sql
-- User with order count (subquery)
SELECT 
    u.id,
    u.name,
    (SELECT COUNT(*) FROM orders WHERE user_id = u.id) AS order_count
FROM users u;
```

**JOIN Approach:**
```sql
-- User with order count (JOIN - usually faster)
SELECT 
    u.id,
    u.name,
    COALESCE(COUNT(o.id), 0) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;
```

**Performance:** JOIN is usually faster, especially for correlated subqueries.

## Common Mistakes

### ❌ Subquery Returns Multiple Rows

```sql
-- ❌ Error: Subquery returns multiple rows
SELECT *
FROM users
WHERE id = (
    SELECT user_id FROM orders  -- Multiple user_ids!
);

-- ✅ Correct: Use IN
SELECT *
FROM users
WHERE id IN (
    SELECT user_id FROM orders
);
```

### ❌ NULL Handling with NOT IN

```sql
-- ❌ Problem: If subquery has NULL, NOT IN fails
SELECT * FROM users
WHERE id NOT IN (
    SELECT user_id FROM orders  -- If user_id has NULL...
);
-- Returns no rows if subquery has any NULL!

-- ✅ Correct: Use NOT EXISTS
SELECT * FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM orders o WHERE o.user_id = u.id
);
```

### ❌ Correlated Subquery Performance

```sql
-- ❌ Slow: Executes for each row
SELECT 
    u.id,
    (SELECT COUNT(*) FROM orders WHERE user_id = u.id) AS count
FROM users u;

-- ✅ Faster: Use JOIN
SELECT 
    u.id,
    COUNT(o.id) AS count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id;
```

## Best Practices

1. **Use EXISTS for Existence Checks**: More efficient than IN
2. **Avoid Correlated Subqueries When Possible**: Use JOINs instead
3. **Handle NULLs Properly**: Use NOT EXISTS instead of NOT IN
4. **Test Subquery Separately**: Ensure it returns expected results
5. **Consider Performance**: Subqueries can be slower than JOINs
6. **Use Derived Tables**: For complex aggregations
7. **Index Subquery Columns**: For performance

## Summary

**Subquery Essentials:**

1. **Types**: Scalar (single value), Table (multiple rows), Correlated (references outer)
2. **Locations**: WHERE, SELECT, FROM, HAVING clauses
3. **Operators**: IN, NOT IN, EXISTS, NOT EXISTS, comparison operators
4. **Performance**: Correlated subqueries can be slow, consider JOINs
5. **NULL Handling**: Use EXISTS/NOT EXISTS instead of IN/NOT IN when NULLs possible
6. **Use Cases**: Complex filtering, single-value lookups, derived tables

**Key Takeaway:**
Subqueries are powerful for complex queries, but JOINs are often faster. Use subqueries when you need single values, existence checks, or complex conditions. Always test subqueries separately and consider performance implications.

**When to Use:**
- Single value per row (scalar subquery)
- Existence checks (EXISTS)
- Complex conditions
- Derived tables for clarity

**When to Avoid:**
- Can be replaced with JOIN (usually faster)
- Correlated subqueries on large datasets
- NOT IN with potential NULLs

**Next Steps:**
- Learn [CTEs (WITH queries)](ctes.md) for cleaner subqueries
- Study [EXISTS vs IN](exists_vs_in.md) for performance
- Master [Window Functions](../05_aggregations_grouping/window_functions.md) for advanced analytics

