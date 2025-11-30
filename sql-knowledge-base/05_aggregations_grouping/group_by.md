# GROUP BY: Aggregating Data into Groups

GROUP BY groups rows that have the same values in specified columns and allows you to perform aggregate functions on each group. It's essential for summaries, reports, and analytics.

## What is GROUP BY?

**GROUP BY** divides rows into groups based on column values, then applies aggregate functions to each group separately.

### Basic Concept

```sql
-- Without GROUP BY: One aggregate for entire table
SELECT COUNT(*) FROM orders;
-- Result: 1000 (total orders)

-- With GROUP BY: Aggregate per group
SELECT user_id, COUNT(*) 
FROM orders 
GROUP BY user_id;
-- Result: One row per user with their order count
```

## Basic GROUP BY Syntax

```sql
SELECT column1, aggregate_function(column2)
FROM table
WHERE condition
GROUP BY column1
HAVING condition
ORDER BY column1;
```

## Simple GROUP BY Examples

### Example 1: Count Orders Per User

```sql
-- How many orders does each user have?
SELECT 
    user_id,
    COUNT(*) AS order_count
FROM orders
GROUP BY user_id;
```

**Result:**
```
┌─────────┬─────────────┐
│ user_id │ order_count │
├─────────┼─────────────┤
│ 1       │ 5           │
│ 2       │ 3           │
│ 3       │ 8           │
└─────────┴─────────────┘
```

### Example 2: Sum Total Spent Per User

```sql
-- Total amount spent by each user
SELECT 
    user_id,
    SUM(total) AS total_spent,
    COUNT(*) AS order_count,
    AVG(total) AS avg_order_value
FROM orders
GROUP BY user_id;
```

**Result:**
```
┌─────────┬─────────────┬─────────────┬─────────────────┐
│ user_id │ total_spent │ order_count │ avg_order_value │
├─────────┼─────────────┼─────────────┼─────────────────┤
│ 1       │ 499.95      │ 5           │ 99.99           │
│ 2       │ 299.97      │ 3           │ 99.99           │
│ 3       │ 799.92      │ 8           │ 99.99           │
└─────────┴─────────────┴─────────────┴─────────────────┘
```

### Example 3: Group by Multiple Columns

```sql
-- Orders per user per status
SELECT 
    user_id,
    status,
    COUNT(*) AS count
FROM orders
GROUP BY user_id, status;
```

**Result:**
```
┌─────────┬────────────┬───────┐
│ user_id │ status     │ count │
├─────────┼────────────┼───────┤
│ 1       │ pending    │ 2     │
│ 1       │ completed  │ 3     │
│ 2       │ pending    │ 1     │
│ 2       │ completed  │ 2     │
└─────────┴────────────┴───────┘
```

## Aggregate Functions with GROUP BY

### COUNT

```sql
-- Count orders per user
SELECT 
    user_id,
    COUNT(*) AS total_orders,
    COUNT(DISTINCT status) AS unique_statuses  -- Count distinct values
FROM orders
GROUP BY user_id;
```

### SUM

```sql
-- Total revenue per product
SELECT 
    product_id,
    SUM(quantity * price) AS total_revenue,
    SUM(quantity) AS total_quantity_sold
FROM order_items
GROUP BY product_id;
```

### AVG

```sql
-- Average order value per user
SELECT 
    user_id,
    AVG(total) AS avg_order_value,
    COUNT(*) AS order_count
FROM orders
GROUP BY user_id;
```

### MIN and MAX

```sql
-- First and last order per user
SELECT 
    user_id,
    MIN(created_at) AS first_order_date,
    MAX(created_at) AS last_order_date,
    MIN(total) AS smallest_order,
    MAX(total) AS largest_order
FROM orders
GROUP BY user_id;
```

## GROUP BY with JOINs

### Example: User Statistics with User Details

```sql
-- User order statistics with user information
SELECT 
    u.id,
    u.name,
    u.email,
    COUNT(o.id) AS order_count,
    SUM(o.total) AS total_spent,
    AVG(o.total) AS avg_order_value,
    MAX(o.created_at) AS last_order_date
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name, u.email
ORDER BY total_spent DESC;
```

**Key Point:** All non-aggregated columns must be in GROUP BY.

### Example: Product Sales by Category

```sql
-- Sales statistics per category
SELECT 
    c.name AS category_name,
    COUNT(DISTINCT oi.product_id) AS product_count,
    COUNT(oi.id) AS items_sold,
    SUM(oi.quantity * oi.price) AS total_revenue,
    AVG(oi.price) AS avg_item_price
FROM categories c
JOIN products p ON c.id = p.category_id
JOIN order_items oi ON p.id = oi.product_id
GROUP BY c.id, c.name
ORDER BY total_revenue DESC;
```

## GROUP BY Rules

### Rule 1: All Non-Aggregated Columns Must Be in GROUP BY

```sql
-- ❌ Error: 'name' not in GROUP BY
SELECT 
    user_id,
    name,  -- Not aggregated, not in GROUP BY
    COUNT(*) AS order_count
FROM users
JOIN orders ON users.id = orders.user_id
GROUP BY user_id;

-- ✅ Correct: Include 'name' in GROUP BY
SELECT 
    user_id,
    name,
    COUNT(*) AS order_count
FROM users
JOIN orders ON users.id = orders.user_id
GROUP BY user_id, name;
```

### Rule 2: Aggregate Functions Can't Be in GROUP BY

```sql
-- ❌ Error: Aggregate in GROUP BY
SELECT 
    user_id,
    COUNT(*) AS order_count
FROM orders
GROUP BY user_id, COUNT(*);  -- Can't group by aggregate

-- ✅ Correct: Only columns in GROUP BY
SELECT 
    user_id,
    COUNT(*) AS order_count
FROM orders
GROUP BY user_id;
```

### Rule 3: WHERE vs HAVING

```sql
-- WHERE: Filters rows BEFORE grouping
SELECT 
    user_id,
    COUNT(*) AS order_count
FROM orders
WHERE total > 100  -- Filter orders before grouping
GROUP BY user_id;

-- HAVING: Filters groups AFTER grouping
SELECT 
    user_id,
    COUNT(*) AS order_count
FROM orders
GROUP BY user_id
HAVING COUNT(*) > 5;  -- Filter groups after aggregation
```

## HAVING Clause

HAVING filters groups after aggregation (WHERE filters rows before grouping).

### Basic HAVING

```sql
-- Users with more than 5 orders
SELECT 
    user_id,
    COUNT(*) AS order_count
FROM orders
GROUP BY user_id
HAVING COUNT(*) > 5;
```

### HAVING with Aggregate Functions

```sql
-- Users who spent more than $1000
SELECT 
    user_id,
    SUM(total) AS total_spent,
    COUNT(*) AS order_count
FROM orders
GROUP BY user_id
HAVING SUM(total) > 1000;
```

### HAVING with Multiple Conditions

```sql
-- Users with 5+ orders and average order > $100
SELECT 
    user_id,
    COUNT(*) AS order_count,
    AVG(total) AS avg_order_value
FROM orders
GROUP BY user_id
HAVING COUNT(*) >= 5 AND AVG(total) > 100;
```

## Real-World Examples

### Example 1: Monthly Sales Report

```sql
-- Sales statistics by month
SELECT 
    DATE_TRUNC('month', created_at) AS month,
    COUNT(*) AS order_count,
    COUNT(DISTINCT user_id) AS unique_customers,
    SUM(total) AS revenue,
    AVG(total) AS avg_order_value
FROM orders
WHERE status = 'completed'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;
```

### Example 2: Top Selling Products

```sql
-- Top 10 best-selling products
SELECT 
    p.id,
    p.name,
    p.category_id,
    SUM(oi.quantity) AS total_quantity_sold,
    SUM(oi.quantity * oi.price) AS total_revenue,
    COUNT(DISTINCT oi.order_id) AS order_count
FROM products p
JOIN order_items oi ON p.id = oi.product_id
JOIN orders o ON oi.order_id = o.id
WHERE o.status = 'completed'
GROUP BY p.id, p.name, p.category_id
ORDER BY total_quantity_sold DESC
LIMIT 10;
```

### Example 3: User Lifetime Value

```sql
-- Calculate customer lifetime value
SELECT 
    u.id,
    u.email,
    u.name,
    COUNT(o.id) AS total_orders,
    SUM(o.total) AS lifetime_value,
    AVG(o.total) AS avg_order_value,
    MIN(o.created_at) AS first_order_date,
    MAX(o.created_at) AS last_order_date,
    EXTRACT(DAY FROM (MAX(o.created_at) - MIN(o.created_at))) AS customer_days
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.status = 'completed'
GROUP BY u.id, u.email, u.name
ORDER BY lifetime_value DESC;
```

### Example 4: Category Performance

```sql
-- Category sales performance
SELECT 
    c.id,
    c.name,
    COUNT(DISTINCT p.id) AS product_count,
    COUNT(oi.id) AS items_sold,
    SUM(oi.quantity * oi.price) AS revenue,
    AVG(oi.price) AS avg_item_price,
    SUM(oi.quantity * oi.price) / COUNT(DISTINCT oi.order_id) AS revenue_per_order
FROM categories c
JOIN products p ON c.id = p.category_id
JOIN order_items oi ON p.id = oi.product_id
JOIN orders o ON oi.order_id = o.id
WHERE o.status = 'completed'
GROUP BY c.id, c.name
ORDER BY revenue DESC;
```

## GROUP BY with Date Functions

### Daily Statistics

```sql
-- Daily order statistics
SELECT 
    DATE(created_at) AS order_date,
    COUNT(*) AS order_count,
    SUM(total) AS daily_revenue,
    AVG(total) AS avg_order_value,
    COUNT(DISTINCT user_id) AS unique_customers
FROM orders
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY order_date DESC;
```

### Weekly Statistics

```sql
-- Weekly sales summary
SELECT 
    DATE_TRUNC('week', created_at) AS week_start,
    COUNT(*) AS order_count,
    SUM(total) AS weekly_revenue,
    COUNT(DISTINCT user_id) AS unique_customers
FROM orders
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY week_start DESC;
```

### Monthly Trends

```sql
-- Month-over-month growth
WITH monthly_stats AS (
    SELECT 
        DATE_TRUNC('month', created_at) AS month,
        SUM(total) AS revenue,
        COUNT(*) AS order_count
    FROM orders
    WHERE status = 'completed'
    GROUP BY DATE_TRUNC('month', created_at)
)
SELECT 
    month,
    revenue,
    order_count,
    LAG(revenue) OVER (ORDER BY month) AS prev_month_revenue,
    revenue - LAG(revenue) OVER (ORDER BY month) AS revenue_growth,
    ROUND(
        (revenue - LAG(revenue) OVER (ORDER BY month)) 
        / LAG(revenue) OVER (ORDER BY month) * 100, 
        2
    ) AS growth_percent
FROM monthly_stats
ORDER BY month DESC;
```

## Common Patterns

### Pattern 1: Percentage of Total

```sql
-- Product sales as percentage of total
SELECT 
    p.name,
    SUM(oi.quantity * oi.price) AS product_revenue,
    SUM(oi.quantity * oi.price) * 100.0 / (
        SELECT SUM(quantity * price) FROM order_items
    ) AS revenue_percentage
FROM products p
JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.id, p.name
ORDER BY product_revenue DESC;
```

### Pattern 2: Ranking Within Groups

```sql
-- Top 3 products per category
WITH ranked_products AS (
    SELECT 
        c.name AS category_name,
        p.name AS product_name,
        SUM(oi.quantity) AS total_sold,
        ROW_NUMBER() OVER (
            PARTITION BY c.id 
            ORDER BY SUM(oi.quantity) DESC
        ) AS rank
    FROM categories c
    JOIN products p ON c.id = p.category_id
    JOIN order_items oi ON p.id = oi.product_id
    GROUP BY c.id, c.name, p.id, p.name
)
SELECT *
FROM ranked_products
WHERE rank <= 3;
```

### Pattern 3: Conditional Aggregation

```sql
-- Orders by status with conditional counts
SELECT 
    user_id,
    COUNT(*) AS total_orders,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_orders,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_orders,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled_orders,
    SUM(CASE WHEN status = 'completed' THEN total ELSE 0 END) AS completed_revenue
FROM orders
GROUP BY user_id;
```

## Performance Considerations

### 1. Index GROUP BY Columns

```sql
-- Create index for GROUP BY
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at);

-- Query uses index
SELECT user_id, COUNT(*) 
FROM orders 
GROUP BY user_id;
```

### 2. Filter Before Grouping

```sql
-- ✅ Good: Filter in WHERE (before grouping)
SELECT user_id, COUNT(*)
FROM orders
WHERE created_at >= '2024-01-01'  -- Filter first
GROUP BY user_id;

-- ❌ Less efficient: Filter in HAVING (after grouping)
SELECT user_id, COUNT(*)
FROM orders
GROUP BY user_id
HAVING MAX(created_at) >= '2024-01-01';  -- Groups all, then filters
```

### 3. Limit GROUP BY Columns

```sql
-- ✅ Good: Only necessary columns
SELECT user_id, COUNT(*)
FROM orders
GROUP BY user_id;

-- ⚠️ Less efficient: Too many columns
SELECT user_id, status, payment_method, shipping_method, COUNT(*)
FROM orders
GROUP BY user_id, status, payment_method, shipping_method;
-- Creates many small groups
```

## Common Mistakes

### ❌ Non-Aggregated Columns Not in GROUP BY

```sql
-- ❌ Error: 'name' not in GROUP BY
SELECT user_id, name, COUNT(*)
FROM users
JOIN orders ON users.id = orders.user_id
GROUP BY user_id;

-- ✅ Correct: Include all non-aggregated columns
SELECT user_id, name, COUNT(*)
FROM users
JOIN orders ON users.id = orders.user_id
GROUP BY user_id, name;
```

### ❌ Using WHERE Instead of HAVING

```sql
-- ❌ Wrong: Can't use aggregate in WHERE
SELECT user_id, COUNT(*) AS order_count
FROM orders
WHERE COUNT(*) > 5  -- Error: Aggregate in WHERE
GROUP BY user_id;

-- ✅ Correct: Use HAVING for aggregate conditions
SELECT user_id, COUNT(*) AS order_count
FROM orders
GROUP BY user_id
HAVING COUNT(*) > 5;
```

### ❌ GROUP BY with DISTINCT

```sql
-- ❌ Unnecessary: DISTINCT with GROUP BY
SELECT DISTINCT user_id, COUNT(*)
FROM orders
GROUP BY user_id;
-- GROUP BY already makes rows unique

-- ✅ Correct: GROUP BY is sufficient
SELECT user_id, COUNT(*)
FROM orders
GROUP BY user_id;
```

## Best Practices

1. **Index GROUP BY Columns**: For performance
2. **Filter in WHERE**: Before grouping (more efficient)
3. **Use HAVING**: For aggregate conditions
4. **Include All Non-Aggregated Columns**: In GROUP BY
5. **Limit Grouping Columns**: Only what's necessary
6. **Test with Small Data**: Verify logic before scaling

## Summary

**GROUP BY Essentials:**

1. **Purpose**: Group rows and apply aggregates per group
2. **Syntax**: `GROUP BY column1, column2, ...`
3. **Rules**: All non-aggregated columns must be in GROUP BY
4. **HAVING**: Filters groups (WHERE filters rows)
5. **Aggregates**: COUNT, SUM, AVG, MIN, MAX
6. **Performance**: Index GROUP BY columns, filter in WHERE

**Key Takeaway:**
GROUP BY is essential for summaries and analytics. It groups rows and applies aggregate functions to each group. Always include all non-aggregated columns in GROUP BY, use WHERE for row filtering, and HAVING for group filtering.

**Common Use Cases:**
- Counts per category
- Sums per group
- Averages per user
- Reports and analytics
- Data summaries

**Next Steps:**
- Learn [HAVING](having.md) for group filtering
- Study [Aggregate Functions](aggregate_functions.md) for more functions
- Master [Window Functions](window_functions.md) for advanced analytics

