# HAVING Clause: Filtering Groups After Aggregation

HAVING filters groups after GROUP BY aggregation, while WHERE filters rows before grouping. Understanding when to use HAVING vs WHERE is crucial for correct query results.

## HAVING vs WHERE

### Key Difference

**WHERE:** Filters rows **before** grouping
**HAVING:** Filters groups **after** grouping

### Visual Comparison

```sql
-- WHERE: Filters individual rows before grouping
SELECT user_id, COUNT(*) AS order_count
FROM orders
WHERE total > 100  -- Filter orders (rows) first
GROUP BY user_id;
-- Only orders with total > 100 are grouped

-- HAVING: Filters groups after grouping
SELECT user_id, COUNT(*) AS order_count
FROM orders
GROUP BY user_id
HAVING COUNT(*) > 5;  -- Filter groups after aggregation
-- Only users with more than 5 orders
```

## Basic HAVING Examples

### Example 1: Filter by Count

```sql
-- Users with more than 5 orders
SELECT 
    user_id,
    COUNT(*) AS order_count
FROM orders
GROUP BY user_id
HAVING COUNT(*) > 5;
```

**Result:**
```
┌─────────┬─────────────┐
│ user_id │ order_count │
├─────────┼─────────────┤
│ 3       │ 8           │
│ 5       │ 6           │
└─────────┴─────────────┘
```

### Example 2: Filter by Sum

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

**Result:**
```
┌─────────┬─────────────┬─────────────┐
│ user_id │ total_spent │ order_count │
├─────────┼─────────────┼─────────────┤
│ 1       │ 1499.95     │ 15          │
│ 3       │ 2399.88     │ 24          │
└─────────┴─────────────┴─────────────┘
```

### Example 3: Filter by Average

```sql
-- Users with average order value > $100
SELECT 
    user_id,
    AVG(total) AS avg_order_value,
    COUNT(*) AS order_count
FROM orders
GROUP BY user_id
HAVING AVG(total) > 100;
```

## Combining WHERE and HAVING

You can use both WHERE and HAVING in the same query.

### Example: Filter Rows, Then Filter Groups

```sql
-- Users with more than 5 completed orders
SELECT 
    user_id,
    COUNT(*) AS completed_order_count,
    SUM(total) AS total_spent
FROM orders
WHERE status = 'completed'  -- Filter rows first (only completed orders)
GROUP BY user_id
HAVING COUNT(*) > 5;  -- Then filter groups (users with 5+ orders)
```

**Execution Order:**
1. **WHERE**: Filter orders where status = 'completed'
2. **GROUP BY**: Group remaining orders by user_id
3. **HAVING**: Filter groups where COUNT(*) > 5
4. **SELECT**: Return results

### Example: Multiple Conditions

```sql
-- Users with 5+ orders and total spent > $500
SELECT 
    user_id,
    COUNT(*) AS order_count,
    SUM(total) AS total_spent,
    AVG(total) AS avg_order_value
FROM orders
WHERE status = 'completed'  -- Only completed orders
GROUP BY user_id
HAVING COUNT(*) >= 5 AND SUM(total) > 500;  -- Multiple HAVING conditions
```

## HAVING with Aggregate Functions

### All Aggregate Functions Work in HAVING

```sql
-- Users with various aggregate conditions
SELECT 
    user_id,
    COUNT(*) AS order_count,
    SUM(total) AS total_spent,
    AVG(total) AS avg_order_value,
    MIN(total) AS smallest_order,
    MAX(total) AS largest_order
FROM orders
GROUP BY user_id
HAVING 
    COUNT(*) > 5  -- More than 5 orders
    AND SUM(total) > 1000  -- Total spent > $1000
    AND AVG(total) > 100  -- Average order > $100
    AND MAX(total) < 500;  -- No single order > $500
```

## Real-World Examples

### Example 1: Top Customers

```sql
-- Top 10 customers by total spent
SELECT 
    u.id,
    u.name,
    u.email,
    COUNT(o.id) AS order_count,
    SUM(o.total) AS total_spent,
    AVG(o.total) AS avg_order_value
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.status = 'completed'
GROUP BY u.id, u.name, u.email
HAVING SUM(o.total) > 1000  -- Only customers who spent > $1000
ORDER BY total_spent DESC
LIMIT 10;
```

### Example 2: Product Performance

```sql
-- Products with sales above threshold
SELECT 
    p.id,
    p.name,
    p.category_id,
    COUNT(oi.id) AS items_sold,
    SUM(oi.quantity * oi.price) AS revenue,
    AVG(oi.price) AS avg_price
FROM products p
JOIN order_items oi ON p.id = oi.product_id
JOIN orders o ON oi.order_id = o.id
WHERE o.status = 'completed'
GROUP BY p.id, p.name, p.category_id
HAVING 
    COUNT(oi.id) >= 10  -- At least 10 items sold
    AND SUM(oi.quantity * oi.price) > 500;  -- Revenue > $500
```

### Example 3: Category Analysis

```sql
-- Categories with multiple products and high sales
SELECT 
    c.id,
    c.name,
    COUNT(DISTINCT p.id) AS product_count,
    COUNT(oi.id) AS items_sold,
    SUM(oi.quantity * oi.price) AS total_revenue
FROM categories c
JOIN products p ON c.id = p.category_id
JOIN order_items oi ON p.id = oi.product_id
JOIN orders o ON oi.order_id = o.id
WHERE o.status = 'completed'
GROUP BY c.id, c.name
HAVING 
    COUNT(DISTINCT p.id) >= 5  -- At least 5 products
    AND SUM(oi.quantity * oi.price) > 1000;  -- Revenue > $1000
```

### Example 4: Monthly Sales Thresholds

```sql
-- Months with sales above average
WITH monthly_sales AS (
    SELECT 
        DATE_TRUNC('month', created_at) AS month,
        SUM(total) AS monthly_revenue,
        COUNT(*) AS order_count
    FROM orders
    WHERE status = 'completed'
    GROUP BY DATE_TRUNC('month', created_at)
)
SELECT 
    month,
    monthly_revenue,
    order_count
FROM monthly_sales
HAVING monthly_revenue > (
    SELECT AVG(monthly_revenue) FROM monthly_sales
)
ORDER BY month DESC;
```

## Common Patterns

### Pattern 1: Filter by Multiple Aggregates

```sql
-- Users meeting multiple criteria
SELECT 
    user_id,
    COUNT(*) AS order_count,
    SUM(total) AS total_spent,
    AVG(total) AS avg_order_value
FROM orders
GROUP BY user_id
HAVING 
    COUNT(*) >= 5  -- At least 5 orders
    AND SUM(total) >= 500  -- Total spent >= $500
    AND AVG(total) >= 50;  -- Average order >= $50
```

### Pattern 2: Percentage Thresholds

```sql
-- Products with market share > 5%
SELECT 
    p.id,
    p.name,
    SUM(oi.quantity * oi.price) AS product_revenue,
    SUM(oi.quantity * oi.price) * 100.0 / (
        SELECT SUM(quantity * price) FROM order_items
    ) AS market_share_percent
FROM products p
JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.id, p.name
HAVING 
    SUM(oi.quantity * oi.price) * 100.0 / (
        SELECT SUM(quantity * price) FROM order_items
    ) > 5;  -- Market share > 5%
```

### Pattern 3: Conditional Aggregation in HAVING

```sql
-- Users with more completed than cancelled orders
SELECT 
    user_id,
    COUNT(*) AS total_orders,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_orders,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled_orders
FROM orders
GROUP BY user_id
HAVING 
    COUNT(CASE WHEN status = 'completed' THEN 1 END) > 
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END);
```

## Performance Considerations

### 1. WHERE Before HAVING

```sql
-- ✅ Good: Filter in WHERE (before grouping)
SELECT user_id, COUNT(*)
FROM orders
WHERE status = 'completed'  -- Filter first (fewer rows to group)
GROUP BY user_id
HAVING COUNT(*) > 5;

-- ❌ Less efficient: Filter in HAVING (after grouping)
SELECT user_id, COUNT(*)
FROM orders
GROUP BY user_id
HAVING COUNT(*) > 5 AND status = 'completed';  -- Groups all, then filters
-- Error: Can't use non-aggregated column in HAVING
```

### 2. Index GROUP BY Columns

```sql
-- Create index for GROUP BY
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- Query uses index
SELECT user_id, COUNT(*)
FROM orders
WHERE status = 'completed'
GROUP BY user_id
HAVING COUNT(*) > 5;
```

## Common Mistakes

### ❌ Using WHERE with Aggregates

```sql
-- ❌ Error: Can't use aggregate in WHERE
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

### ❌ Using HAVING with Non-Aggregated Columns

```sql
-- ❌ Error: Can't use non-aggregated column in HAVING
SELECT user_id, COUNT(*) AS order_count
FROM orders
GROUP BY user_id
HAVING status = 'completed';  -- Error: status not in GROUP BY

-- ✅ Correct: Use WHERE for non-aggregated columns
SELECT user_id, COUNT(*) AS order_count
FROM orders
WHERE status = 'completed'  -- Filter rows first
GROUP BY user_id;
```

### ❌ Confusing WHERE and HAVING

```sql
-- ❌ Wrong: Using WHERE for group filtering
SELECT category_id, AVG(price)
FROM products
WHERE AVG(price) > 100  -- Error: Aggregate in WHERE
GROUP BY category_id;

-- ✅ Correct: Use HAVING for group filtering
SELECT category_id, AVG(price)
FROM products
GROUP BY category_id
HAVING AVG(price) > 100;
```

## Best Practices

1. **Use WHERE First**: Filter rows before grouping (more efficient)
2. **Use HAVING for Aggregates**: Filter groups after aggregation
3. **Combine Both**: Use WHERE to filter rows, HAVING to filter groups
4. **Index GROUP BY Columns**: For performance
5. **Test Logic**: Verify HAVING conditions work as expected

## Summary

**HAVING Essentials:**

1. **Purpose**: Filter groups after GROUP BY aggregation
2. **Difference**: WHERE filters rows, HAVING filters groups
3. **Use Cases**: Filter by COUNT, SUM, AVG, MIN, MAX
4. **Combination**: Can use both WHERE and HAVING together
5. **Performance**: Filter in WHERE first, then HAVING

**Key Takeaway:**
HAVING filters groups after aggregation, while WHERE filters rows before grouping. Use WHERE to filter individual rows, then HAVING to filter groups based on aggregate values. Always filter in WHERE first for better performance.

**When to Use:**
- **WHERE**: Filter rows before grouping
- **HAVING**: Filter groups after aggregation
- **Both**: Filter rows first, then filter groups

**Common Patterns:**
- Filter by count: `HAVING COUNT(*) > 5`
- Filter by sum: `HAVING SUM(total) > 1000`
- Filter by average: `HAVING AVG(total) > 100`
- Multiple conditions: `HAVING COUNT(*) > 5 AND SUM(total) > 1000`

**Next Steps:**
- Learn [GROUP BY](group_by.md) for grouping basics
- Study [Aggregate Functions](aggregate_functions.md) for more functions
- Master [Window Functions](window_functions.md) for advanced analytics

