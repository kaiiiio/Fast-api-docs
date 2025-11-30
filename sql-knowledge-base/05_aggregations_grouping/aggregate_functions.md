# Aggregate Functions: COUNT, SUM, AVG, MAX, MIN

Aggregate functions perform calculations on a set of rows and return a single value. They're essential for summaries, statistics, and analytics.

## What are Aggregate Functions?

**Aggregate functions** operate on multiple rows and return a single summary value:
- **COUNT**: Count rows
- **SUM**: Sum numeric values
- **AVG**: Average of numeric values
- **MAX**: Maximum value
- **MIN**: Minimum value

## COUNT

### Basic COUNT

```sql
-- Count all rows
SELECT COUNT(*) FROM users;

-- Count non-NULL values in column
SELECT COUNT(email) FROM users;
```

### COUNT with DISTINCT

```sql
-- Count unique values
SELECT COUNT(DISTINCT user_id) FROM orders;

-- Count unique categories
SELECT COUNT(DISTINCT category_id) FROM products;
```

### COUNT with Conditions

```sql
-- Count with condition
SELECT COUNT(*) FROM users WHERE is_active = true;

-- Count with CASE
SELECT 
    COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_count,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_count
FROM orders;
```

## SUM

### Basic SUM

```sql
-- Sum all values
SELECT SUM(total) FROM orders;

-- Sum with condition
SELECT SUM(total) FROM orders WHERE status = 'completed';
```

### SUM with GROUP BY

```sql
-- Total spent per user
SELECT 
    user_id,
    SUM(total) AS total_spent
FROM orders
GROUP BY user_id;
```

### SUM with NULL Handling

```sql
-- SUM ignores NULL values
SELECT SUM(price) FROM products;
-- NULL prices are ignored
```

## AVG (Average)

### Basic AVG

```sql
-- Average price
SELECT AVG(price) FROM products;

-- Average order value
SELECT AVG(total) FROM orders WHERE status = 'completed';
```

### AVG with GROUP BY

```sql
-- Average order value per user
SELECT 
    user_id,
    AVG(total) AS avg_order_value,
    COUNT(*) AS order_count
FROM orders
GROUP BY user_id;
```

### AVG with NULL

```sql
-- AVG ignores NULL values
SELECT AVG(price) FROM products;
-- Only non-NULL prices are averaged
```

## MAX

### Basic MAX

```sql
-- Maximum price
SELECT MAX(price) FROM products;

-- Most recent order
SELECT MAX(created_at) FROM orders;
```

### MAX with GROUP BY

```sql
-- Highest order per user
SELECT 
    user_id,
    MAX(total) AS highest_order
FROM orders
GROUP BY user_id;
```

## MIN

### Basic MIN

```sql
-- Minimum price
SELECT MIN(price) FROM products;

-- Oldest order
SELECT MIN(created_at) FROM orders;
```

### MIN with GROUP BY

```sql
-- Lowest order per user
SELECT 
    user_id,
    MIN(total) AS lowest_order
FROM orders
GROUP BY user_id;
```

## Real-World Examples

### Example 1: Order Statistics

```sql
-- Complete order statistics
SELECT 
    COUNT(*) AS total_orders,
    COUNT(DISTINCT user_id) AS unique_customers,
    SUM(total) AS total_revenue,
    AVG(total) AS avg_order_value,
    MAX(total) AS largest_order,
    MIN(total) AS smallest_order
FROM orders
WHERE status = 'completed';
```

### Example 2: Product Analysis

```sql
-- Product category statistics
SELECT 
    category_id,
    COUNT(*) AS product_count,
    AVG(price) AS avg_price,
    MAX(price) AS max_price,
    MIN(price) AS min_price,
    SUM(stock_quantity) AS total_stock
FROM products
GROUP BY category_id;
```

### Example 3: User Activity

```sql
-- User activity summary
SELECT 
    user_id,
    COUNT(*) AS order_count,
    SUM(total) AS total_spent,
    AVG(total) AS avg_order_value,
    MAX(created_at) AS last_order_date,
    MIN(created_at) AS first_order_date
FROM orders
GROUP BY user_id;
```

## Combining Aggregate Functions

### Multiple Aggregates

```sql
-- Multiple aggregates in one query
SELECT 
    COUNT(*) AS total_users,
    COUNT(email) AS users_with_email,
    COUNT(DISTINCT role) AS unique_roles
FROM users;
```

### Aggregates with Calculations

```sql
-- Revenue statistics
SELECT 
    COUNT(*) AS order_count,
    SUM(total) AS total_revenue,
    AVG(total) AS avg_order_value,
    SUM(total) / COUNT(*) AS calculated_avg,  -- Same as AVG
    MAX(total) - MIN(total) AS price_range
FROM orders;
```

## NULL Handling

### How Aggregates Handle NULL

```sql
-- COUNT(*) counts all rows (including NULL)
SELECT COUNT(*) FROM users;  -- Counts all rows

-- COUNT(column) counts non-NULL values
SELECT COUNT(email) FROM users;  -- Only non-NULL emails

-- SUM, AVG, MAX, MIN ignore NULL
SELECT SUM(price) FROM products;  -- NULL prices ignored
SELECT AVG(price) FROM products;  -- NULL prices ignored
```

### Handling NULL in Aggregates

```sql
-- Use COALESCE to handle NULL
SELECT 
    AVG(COALESCE(price, 0)) AS avg_price_with_default
FROM products;

-- Or filter NULL first
SELECT AVG(price) FROM products WHERE price IS NOT NULL;
```

## Performance Considerations

### Index Aggregate Columns

```sql
-- Create index for aggregate queries
CREATE INDEX idx_orders_total ON orders(total);
CREATE INDEX idx_orders_user ON orders(user_id);

-- Queries use indexes
SELECT SUM(total) FROM orders WHERE user_id = 1;
```

### Aggregate with WHERE

```sql
-- ✅ Good: Filter before aggregating
SELECT SUM(total) FROM orders
WHERE status = 'completed';

-- ❌ Less efficient: Filter after (if possible)
SELECT SUM(total) FROM orders
HAVING status = 'completed';  -- Error: Can't use HAVING without GROUP BY
```

## Common Patterns

### Pattern 1: Summary Statistics

```sql
-- Complete summary
SELECT 
    COUNT(*) AS total,
    SUM(amount) AS total_amount,
    AVG(amount) AS avg_amount,
    MAX(amount) AS max_amount,
    MIN(amount) AS min_amount
FROM transactions;
```

### Pattern 2: Conditional Aggregates

```sql
-- Count with conditions
SELECT 
    COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled
FROM orders;
```

### Pattern 3: Percentage Calculations

```sql
-- Calculate percentages
SELECT 
    COUNT(*) AS total,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed,
    ROUND(
        COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*),
        2
    ) AS completion_rate
FROM orders;
```

## Best Practices

1. **Use COUNT(*)**: For counting all rows
2. **Use COUNT(column)**: For counting non-NULL values
3. **Handle NULL**: Be aware how aggregates handle NULL
4. **Index Columns**: For aggregate performance
5. **Filter First**: Use WHERE before aggregating

## Common Mistakes

### ❌ COUNT with DISTINCT Wrong

```sql
-- ❌ Wrong: DISTINCT inside COUNT
SELECT COUNT(DISTINCT *) FROM users;  -- Error!

-- ✅ Correct: DISTINCT on column
SELECT COUNT(DISTINCT user_id) FROM orders;
```

### ❌ Aggregate in WHERE

```sql
-- ❌ Error: Can't use aggregate in WHERE
SELECT * FROM orders
WHERE COUNT(*) > 10;  -- Error!

-- ✅ Correct: Use HAVING with GROUP BY
SELECT user_id, COUNT(*) AS order_count
FROM orders
GROUP BY user_id
HAVING COUNT(*) > 10;
```

## Summary

**Aggregate Functions:**

1. **COUNT**: Count rows or non-NULL values
2. **SUM**: Sum numeric values
3. **AVG**: Average of numeric values
4. **MAX**: Maximum value
5. **MIN**: Minimum value
6. **NULL Handling**: COUNT(*) counts all, others ignore NULL

**Key Takeaway:**
Aggregate functions summarize data. COUNT counts rows, SUM adds values, AVG calculates average, MAX/MIN find extremes. Use with GROUP BY for per-group summaries. Be aware of NULL handling.

**Common Use Cases:**
- Statistics: `SELECT COUNT(*), SUM(total), AVG(total)`
- Per-group: `SELECT user_id, COUNT(*) FROM orders GROUP BY user_id`
- Conditional: `SELECT COUNT(CASE WHEN ... THEN 1 END)`

**Next Steps:**
- Learn [GROUP BY](group_by.md) for grouping
- Study [HAVING](having.md) for filtering groups
- Master [Window Functions](window_functions.md) for advanced analytics

