# Common SQL Query Patterns: Real-World Solutions

Collection of common SQL query patterns you'll use in real-world applications. These are practical, copy-paste ready solutions.

## Pattern 1: Find Duplicates

### Find Duplicate Emails

```sql
-- Users with duplicate emails
SELECT email, COUNT(*) AS count
FROM users
GROUP BY email
HAVING COUNT(*) > 1;
```

### Find Duplicate Records

```sql
-- Find duplicate rows (all columns)
SELECT *
FROM users
WHERE id NOT IN (
    SELECT MIN(id)
    FROM users
    GROUP BY email, name
);
```

### Remove Duplicates (Keep First)

```sql
-- Delete duplicates, keep first occurrence
DELETE FROM users
WHERE id NOT IN (
    SELECT MIN(id)
    FROM users
    GROUP BY email
);
```

## Pattern 2: Find Missing Records

### Users Without Orders

```sql
-- Users who haven't placed any orders
SELECT u.*
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.id IS NULL;
```

### Products Never Ordered

```sql
-- Products that have never been ordered
SELECT p.*
FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
WHERE oi.id IS NULL;
```

## Pattern 3: Top N Per Group

### Top 3 Orders Per User

```sql
-- Top 3 orders by total for each user
WITH ranked_orders AS (
    SELECT 
        id,
        user_id,
        total,
        ROW_NUMBER() OVER (
            PARTITION BY user_id 
            ORDER BY total DESC
        ) AS rank
    FROM orders
)
SELECT *
FROM ranked_orders
WHERE rank <= 3;
```

### Latest Order Per User

```sql
-- Most recent order for each user
SELECT DISTINCT ON (user_id)
    id,
    user_id,
    total,
    created_at
FROM orders
ORDER BY user_id, created_at DESC;
```

## Pattern 4: Running Totals

### Running Total by Date

```sql
-- Daily revenue with running total
SELECT 
    DATE(created_at) AS sale_date,
    SUM(total) AS daily_revenue,
    SUM(SUM(total)) OVER (
        ORDER BY DATE(created_at)
        ROWS UNBOUNDED PRECEDING
    ) AS running_total
FROM orders
WHERE status = 'completed'
GROUP BY DATE(created_at)
ORDER BY sale_date;
```

## Pattern 5: Month-over-Month Growth

### Revenue Growth

```sql
-- Month-over-month revenue growth
WITH monthly_revenue AS (
    SELECT 
        DATE_TRUNC('month', created_at) AS month,
        SUM(total) AS revenue
    FROM orders
    WHERE status = 'completed'
    GROUP BY DATE_TRUNC('month', created_at)
)
SELECT 
    month,
    revenue,
    LAG(revenue) OVER (ORDER BY month) AS prev_month_revenue,
    revenue - LAG(revenue) OVER (ORDER BY month) AS growth,
    ROUND(
        (revenue - LAG(revenue) OVER (ORDER BY month)) 
        / LAG(revenue) OVER (ORDER BY month) * 100, 
        2
    ) AS growth_percent
FROM monthly_revenue
ORDER BY month DESC;
```

## Pattern 6: Find Gaps in Sequence

### Missing IDs

```sql
-- Find gaps in ID sequence
WITH id_series AS (
    SELECT generate_series(
        (SELECT MIN(id) FROM orders),
        (SELECT MAX(id) FROM orders)
    ) AS id
)
SELECT s.id AS missing_id
FROM id_series s
LEFT JOIN orders o ON s.id = o.id
WHERE o.id IS NULL;
```

## Pattern 7: Pivot Data

### Pivot by Category

```sql
-- Pivot: Products per category
SELECT 
    category_id,
    COUNT(CASE WHEN price < 50 THEN 1 END) AS low_price_count,
    COUNT(CASE WHEN price BETWEEN 50 AND 100 THEN 1 END) AS mid_price_count,
    COUNT(CASE WHEN price > 100 THEN 1 END) AS high_price_count
FROM products
GROUP BY category_id;
```

## Pattern 8: Find Active Users

### Users Active in Last 30 Days

```sql
-- Users who placed orders in last 30 days
SELECT DISTINCT u.*
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.created_at >= CURRENT_DATE - INTERVAL '30 days';
```

### Users Active This Month

```sql
-- Users active this month
SELECT DISTINCT u.*
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE DATE_TRUNC('month', o.created_at) = DATE_TRUNC('month', CURRENT_DATE);
```

## Pattern 9: Calculate Percentiles

### Revenue Percentiles

```sql
-- Revenue percentiles by user
SELECT 
    user_id,
    SUM(total) AS total_revenue,
    PERCENT_RANK() OVER (ORDER BY SUM(total)) AS percentile
FROM orders
WHERE status = 'completed'
GROUP BY user_id;
```

## Pattern 10: Find Consecutive Records

### Consecutive Days with Orders

```sql
-- Users with orders on consecutive days
WITH daily_orders AS (
    SELECT 
        user_id,
        DATE(created_at) AS order_date,
        LAG(DATE(created_at)) OVER (
            PARTITION BY user_id 
            ORDER BY DATE(created_at)
        ) AS prev_date
    FROM orders
)
SELECT DISTINCT user_id
FROM daily_orders
WHERE order_date = prev_date + INTERVAL '1 day';
```

## Pattern 11: Compare Periods

### Year-over-Year Comparison

```sql
-- Compare current year with previous year
WITH yearly_revenue AS (
    SELECT 
        EXTRACT(YEAR FROM created_at) AS year,
        SUM(total) AS revenue
    FROM orders
    WHERE status = 'completed'
    GROUP BY EXTRACT(YEAR FROM created_at)
)
SELECT 
    year,
    revenue,
    LAG(revenue) OVER (ORDER BY year) AS prev_year_revenue,
    revenue - LAG(revenue) OVER (ORDER BY year) AS yoy_growth
FROM yearly_revenue
ORDER BY year DESC;
```

## Pattern 12: Find Most Recent Record

### Latest Order Per User

```sql
-- Most recent order for each user
SELECT DISTINCT ON (user_id)
    id,
    user_id,
    total,
    created_at
FROM orders
ORDER BY user_id, created_at DESC;
```

## Pattern 13: Calculate Averages

### Moving Average

```sql
-- 7-day moving average of daily revenue
WITH daily_revenue AS (
    SELECT 
        DATE(created_at) AS sale_date,
        SUM(total) AS revenue
    FROM orders
    WHERE status = 'completed'
    GROUP BY DATE(created_at)
)
SELECT 
    sale_date,
    revenue,
    AVG(revenue) OVER (
        ORDER BY sale_date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS moving_avg_7_days
FROM daily_revenue
ORDER BY sale_date;
```

## Pattern 14: Find Records in Range

### Orders in Date Range

```sql
-- Orders in specific date range
SELECT *
FROM orders
WHERE created_at BETWEEN '2024-01-01' AND '2024-12-31'
  AND status = 'completed';
```

## Pattern 15: Count Distinct with Conditions

### Conditional Counts

```sql
-- Count orders by status
SELECT 
    user_id,
    COUNT(*) AS total_orders,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_orders,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_orders,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled_orders
FROM orders
GROUP BY user_id;
```

## Pattern 16: Find Records Not in Another Table

### Products Not in Any Order

```sql
-- Products that have never been ordered
SELECT p.*
FROM products p
WHERE NOT EXISTS (
    SELECT 1 FROM order_items oi
    WHERE oi.product_id = p.id
);
```

## Pattern 17: Calculate Differences

### Price Changes

```sql
-- Compare current price with previous price
SELECT 
    id,
    name,
    price,
    LAG(price) OVER (PARTITION BY id ORDER BY updated_at) AS prev_price,
    price - LAG(price) OVER (PARTITION BY id ORDER BY updated_at) AS price_change
FROM products
ORDER BY id, updated_at;
```

## Pattern 18: Find Records Matching Multiple Conditions

### Users Meeting Multiple Criteria

```sql
-- Users with 5+ orders AND total spent > $1000
SELECT 
    u.id,
    u.name,
    COUNT(o.id) AS order_count,
    SUM(o.total) AS total_spent
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.status = 'completed'
GROUP BY u.id, u.name
HAVING COUNT(o.id) >= 5 AND SUM(o.total) > 1000;
```

## Pattern 19: Rank Records

### Rank Products by Sales

```sql
-- Rank products by total sales
SELECT 
    p.id,
    p.name,
    SUM(oi.quantity * oi.price) AS total_revenue,
    RANK() OVER (ORDER BY SUM(oi.quantity * oi.price) DESC) AS sales_rank
FROM products p
JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.id, p.name
ORDER BY sales_rank;
```

## Pattern 20: Find First and Last

### First and Last Order Dates

```sql
-- First and last order date per user
SELECT 
    user_id,
    MIN(created_at) AS first_order_date,
    MAX(created_at) AS last_order_date,
    MAX(created_at) - MIN(created_at) AS customer_lifetime_days
FROM orders
GROUP BY user_id;
```

## Summary

**Common Query Patterns:**

1. **Duplicates**: Find and remove duplicates
2. **Missing Records**: Find records not in another table
3. **Top N Per Group**: Window functions for rankings
4. **Running Totals**: Cumulative calculations
5. **Growth**: Month-over-month, year-over-year
6. **Gaps**: Find missing sequences
7. **Pivot**: Transform rows to columns
8. **Active Users**: Time-based filtering
9. **Percentiles**: Rank calculations
10. **Consecutive**: Find patterns in sequences
11. **Comparisons**: Period-over-period
12. **Most Recent**: Latest record per group
13. **Averages**: Moving averages
14. **Ranges**: Date/price ranges
15. **Conditional Counts**: Count with conditions
16. **Not Exists**: Records not in another table
17. **Differences**: Calculate changes
18. **Multiple Conditions**: Complex filtering
19. **Ranking**: Rank records
20. **First/Last**: Min/max per group

**Key Takeaway:**
These patterns solve common real-world problems. Keep them as reference and adapt to your specific needs. Understanding these patterns makes you more productive.

**Next Steps:**
- Learn [Window Functions](../05_aggregations_grouping/window_functions.md) for advanced analytics
- Study [Performance Optimization](../10_performance_optimization/) for query tuning
- Master [E-commerce Schema](ecommerce_schema.md) for complete examples

