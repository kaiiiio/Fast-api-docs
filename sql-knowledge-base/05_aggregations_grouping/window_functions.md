# Window Functions: Advanced Analytics Without GROUP BY

Window functions perform calculations across a set of table rows related to the current row. Unlike aggregate functions with GROUP BY, window functions don't collapse rows - they return a value for each row.

## What are Window Functions?

**Window functions** compute a value for each row based on a "window" of rows. They're like aggregate functions, but they don't group rows together.

### Key Difference: Aggregate vs Window Function

**Aggregate Function (GROUP BY):**
```sql
-- Collapses rows: Returns one row per group
SELECT 
    user_id,
    COUNT(*) AS order_count,
    SUM(total) AS total_spent
FROM orders
GROUP BY user_id;
-- Result: One row per user
```

**Window Function:**
```sql
-- Keeps all rows: Returns value for each row
SELECT 
    id,
    user_id,
    total,
    COUNT(*) OVER (PARTITION BY user_id) AS order_count,
    SUM(total) OVER (PARTITION BY user_id) AS total_spent
FROM orders;
-- Result: All order rows, with aggregated values added
```

## Window Function Syntax

```sql
function_name([arguments])
OVER (
    [PARTITION BY column1, column2, ...]
    [ORDER BY column1 [ASC|DESC], ...]
    [ROWS|RANGE BETWEEN start AND end]
)
```

### Components

1. **Function**: Aggregate, ranking, or value function
2. **PARTITION BY**: Divides rows into groups (like GROUP BY, but doesn't collapse)
3. **ORDER BY**: Orders rows within partition
4. **Frame**: Defines which rows to include (ROWS or RANGE)

## Types of Window Functions

### 1. Aggregate Window Functions

Standard aggregates (COUNT, SUM, AVG, MAX, MIN) used as window functions.

#### Basic Example

```sql
-- Order total and running total
SELECT 
    id,
    user_id,
    total,
    SUM(total) OVER (PARTITION BY user_id ORDER BY created_at) AS running_total
FROM orders;
```

**Result:**
```
┌────┬─────────┬────────┬──────────────┐
│ id │ user_id │ total  │ running_total│
├────┼─────────┼────────┼──────────────┤
│ 1  │ 1       │ 99.99  │ 99.99        │
│ 2  │ 1       │ 149.99 │ 249.98       │ ← Running sum
│ 3  │ 1       │ 79.99  │ 329.97       │
│ 4  │ 2       │ 199.99 │ 199.99       │ ← New partition
└────┴─────────┴────────┴──────────────┘
```

#### Common Aggregate Window Functions

```sql
-- Count orders per user (without GROUP BY)
SELECT 
    id,
    user_id,
    total,
    COUNT(*) OVER (PARTITION BY user_id) AS user_order_count,
    SUM(total) OVER (PARTITION BY user_id) AS user_total_spent,
    AVG(total) OVER (PARTITION BY user_id) AS user_avg_order,
    MAX(total) OVER (PARTITION BY user_id) AS user_max_order,
    MIN(total) OVER (PARTITION BY user_id) AS user_min_order
FROM orders;
```

### 2. Ranking Functions

Assign ranks to rows within partitions.

#### ROW_NUMBER()

Assigns unique sequential numbers.

```sql
-- Number each order per user
SELECT 
    id,
    user_id,
    total,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) AS order_number
FROM orders;
```

**Result:**
```
┌────┬─────────┬────────┬──────────────┐
│ id │ user_id │ total  │ order_number │
├────┼─────────┼────────┼──────────────┤
│ 1  │ 1       │ 99.99  │ 1            │
│ 2  │ 1       │ 149.99 │ 2            │
│ 3  │ 1       │ 79.99  │ 3            │
│ 4  │ 2       │ 199.99 │ 1            │ ← Resets for new user
└────┴─────────┴────────┴──────────────┘
```

#### RANK()

Assigns ranks with gaps for ties.

```sql
-- Rank products by price (ties get same rank, next rank skipped)
SELECT 
    id,
    name,
    price,
    RANK() OVER (ORDER BY price DESC) AS price_rank
FROM products;
```

**Result:**
```
┌────┬──────────┬────────┬────────────┐
│ id │ name     │ price  │ price_rank │
├────┼──────────┼────────┼────────────┤
│ 1  │ Laptop   │ 999.99 │ 1          │
│ 2  │ Mouse    │ 29.99  │ 2          │
│ 3  │ Keyboard │ 29.99  │ 2          │ ← Tie: both rank 2
│ 4  │ Cable    │ 9.99   │ 4          │ ← Rank 3 skipped
└────┴──────────┴────────┴────────────┘
```

#### DENSE_RANK()

Assigns ranks without gaps for ties.

```sql
-- Dense rank: No gaps
SELECT 
    id,
    name,
    price,
    DENSE_RANK() OVER (ORDER BY price DESC) AS price_rank
FROM products;
```

**Result:**
```
┌────┬──────────┬────────┬────────────┐
│ id │ name     │ price  │ price_rank │
├────┼──────────┼────────┼────────────┤
│ 1  │ Laptop   │ 999.99 │ 1          │
│ 2  │ Mouse    │ 29.99  │ 2          │
│ 3  │ Keyboard │ 29.99  │ 2          │ ← Tie: both rank 2
│ 4  │ Cable    │ 9.99   │ 3          │ ← No gap (DENSE_RANK)
└────┴──────────┴────────┴────────────┘
```

#### PERCENT_RANK()

Returns relative rank (0 to 1).

```sql
-- Percentile rank
SELECT 
    id,
    name,
    price,
    PERCENT_RANK() OVER (ORDER BY price) AS price_percentile
FROM products;
-- 0.0 = lowest price, 1.0 = highest price
```

### 3. Value Functions

Access values from other rows.

#### LAG() and LEAD()

Access previous/next row values.

```sql
-- Compare with previous order
SELECT 
    id,
    user_id,
    total,
    created_at,
    LAG(total) OVER (PARTITION BY user_id ORDER BY created_at) AS previous_order_total,
    total - LAG(total) OVER (PARTITION BY user_id ORDER BY created_at) AS difference
FROM orders;
```

**Result:**
```
┌────┬─────────┬────────┬─────────────────────┬──────────────────────┬────────────┐
│ id │ user_id │ total  │ created_at           │ previous_order_total │ difference │
├────┼─────────┼────────┼─────────────────────┼──────────────────────┼────────────┤
│ 1  │ 1       │ 99.99  │ 2024-01-15 10:00:00  │ NULL                 │ NULL       │
│ 2  │ 1       │ 149.99 │ 2024-01-20 14:30:00  │ 99.99                │ 50.00      │
│ 3  │ 1       │ 79.99  │ 2024-01-25 09:15:00 │ 149.99               │ -70.00     │
└────┴─────────┴────────┴─────────────────────┴──────────────────────┴────────────┘
```

#### FIRST_VALUE() and LAST_VALUE()

Get first/last value in window.

```sql
-- First and last order per user
SELECT 
    id,
    user_id,
    total,
    created_at,
    FIRST_VALUE(total) OVER (
        PARTITION BY user_id 
        ORDER BY created_at
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS first_order_total,
    LAST_VALUE(total) OVER (
        PARTITION BY user_id 
        ORDER BY created_at
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS last_order_total
FROM orders;
```

## Window Frame Specification

Define which rows to include in the window.

### Frame Types

#### ROWS: Physical rows

```sql
-- Moving average of last 3 orders
SELECT 
    id,
    total,
    AVG(total) OVER (
        ORDER BY created_at
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ) AS moving_avg_3
FROM orders;
```

**Frame Options:**
- `UNBOUNDED PRECEDING`: From start of partition
- `n PRECEDING`: n rows before current
- `CURRENT ROW`: Current row
- `n FOLLOWING`: n rows after current
- `UNBOUNDED FOLLOWING`: To end of partition

#### RANGE: Logical range

```sql
-- Average of orders within 7 days
SELECT 
    id,
    total,
    created_at,
    AVG(total) OVER (
        ORDER BY created_at
        RANGE BETWEEN INTERVAL '7 days' PRECEDING AND CURRENT ROW
    ) AS avg_last_7_days
FROM orders;
```

### Common Frame Patterns

```sql
-- Running total (from start to current)
SUM(total) OVER (ORDER BY created_at ROWS UNBOUNDED PRECEDING)

-- Last 3 rows
AVG(total) OVER (ORDER BY created_at ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)

-- Current and next row
SUM(total) OVER (ORDER BY created_at ROWS BETWEEN CURRENT ROW AND 1 FOLLOWING)

-- Entire partition
SUM(total) OVER (PARTITION BY user_id)
```

## Real-World Examples

### Example 1: Running Totals

```sql
-- Daily sales with running total
SELECT 
    DATE(created_at) AS sale_date,
    SUM(total) AS daily_revenue,
    SUM(SUM(total)) OVER (
        ORDER BY DATE(created_at)
        ROWS UNBOUNDED PRECEDING
    ) AS running_total
FROM orders
GROUP BY DATE(created_at)
ORDER BY sale_date;
```

### Example 2: Top N Per Group

```sql
-- Top 3 orders per user
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

### Example 3: Percentile Calculations

```sql
-- Products in top 10% by price
SELECT 
    id,
    name,
    price,
    PERCENT_RANK() OVER (ORDER BY price) AS percentile
FROM products
WHERE PERCENT_RANK() OVER (ORDER BY price) >= 0.9;
```

### Example 4: Moving Averages

```sql
-- 7-day moving average of daily revenue
WITH daily_revenue AS (
    SELECT 
        DATE(created_at) AS sale_date,
        SUM(total) AS revenue
    FROM orders
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

### Example 5: Year-over-Year Growth

```sql
-- Compare current month with same month last year
SELECT 
    DATE_TRUNC('month', created_at) AS month,
    SUM(total) AS revenue,
    LAG(SUM(total), 12) OVER (ORDER BY DATE_TRUNC('month', created_at)) AS revenue_last_year,
    (SUM(total) - LAG(SUM(total), 12) OVER (ORDER BY DATE_TRUNC('month', created_at))) 
        / LAG(SUM(total), 12) OVER (ORDER BY DATE_TRUNC('month', created_at)) * 100 
        AS yoy_growth_percent
FROM orders
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month;
```

## Multiple Window Functions

Use multiple window functions in the same query.

```sql
-- Comprehensive order analysis
SELECT 
    id,
    user_id,
    total,
    created_at,
    -- Ranking
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) AS order_number,
    RANK() OVER (PARTITION BY user_id ORDER BY total DESC) AS price_rank,
    -- Aggregates
    COUNT(*) OVER (PARTITION BY user_id) AS user_order_count,
    SUM(total) OVER (PARTITION BY user_id) AS user_total_spent,
    AVG(total) OVER (PARTITION BY user_id) AS user_avg_order,
    -- Comparisons
    LAG(total) OVER (PARTITION BY user_id ORDER BY created_at) AS previous_order,
    total - LAG(total) OVER (PARTITION BY user_id ORDER BY created_at) AS difference,
    -- Percentiles
    PERCENT_RANK() OVER (PARTITION BY user_id ORDER BY total) AS order_percentile
FROM orders;
```

## Performance Considerations

### 1. **Index ORDER BY Columns**

```sql
-- Create index for window function ORDER BY
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at);

-- Window function uses index
SELECT 
    *,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at)
FROM orders;
```

### 2. **Partition Size Matters**

```sql
-- Small partitions: Fast
ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at)
-- If few orders per user, very fast

-- Large partitions: Slower
ROW_NUMBER() OVER (ORDER BY created_at)
-- Entire table as one partition, may be slow
```

### 3. **Frame Specification Impact**

```sql
-- Unbounded frame: Must scan entire partition
SUM(total) OVER (PARTITION BY user_id)

-- Bounded frame: Only scans frame rows
SUM(total) OVER (
    PARTITION BY user_id 
    ORDER BY created_at
    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
)
-- Faster: Only 3 rows per calculation
```

## Common Patterns

### Pattern 1: Remove Duplicates

```sql
-- Keep only first occurrence
WITH ranked AS (
    SELECT 
        *,
        ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at) AS rn
    FROM users
)
SELECT * FROM ranked WHERE rn = 1;
```

### Pattern 2: Find Gaps

```sql
-- Find gaps in sequence
SELECT 
    id,
    LAG(id) OVER (ORDER BY id) AS prev_id,
    id - LAG(id) OVER (ORDER BY id) AS gap
FROM orders
WHERE id - LAG(id) OVER (ORDER BY id) > 1;
```

### Pattern 3: Calculate Differences

```sql
-- Month-over-month growth
SELECT 
    month,
    revenue,
    LAG(revenue) OVER (ORDER BY month) AS prev_month_revenue,
    revenue - LAG(revenue) OVER (ORDER BY month) AS mom_growth
FROM monthly_revenue;
```

## Common Mistakes

### ❌ Forgetting PARTITION BY

```sql
-- ❌ Wrong: Ranks entire table
SELECT 
    id,
    total,
    RANK() OVER (ORDER BY total DESC) AS rank
FROM orders;
-- All orders ranked together

-- ✅ Correct: Rank per user
SELECT 
    id,
    user_id,
    total,
    RANK() OVER (PARTITION BY user_id ORDER BY total DESC) AS rank
FROM orders;
```

### ❌ Wrong Frame Specification

```sql
-- ❌ Wrong: Default frame may not include all rows
LAST_VALUE(total) OVER (PARTITION BY user_id ORDER BY created_at)
-- May not return last value!

-- ✅ Correct: Specify full frame
LAST_VALUE(total) OVER (
    PARTITION BY user_id 
    ORDER BY created_at
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
)
```

## Best Practices

1. **Use PARTITION BY**: For per-group calculations
2. **Specify Frames Explicitly**: Don't rely on defaults
3. **Index ORDER BY Columns**: For performance
4. **Use Appropriate Function**: ROW_NUMBER vs RANK vs DENSE_RANK
5. **Test with Small Data**: Verify logic before scaling

## Summary

**Window Functions Essentials:**

1. **Purpose**: Calculations across rows without GROUP BY
2. **Syntax**: `function() OVER (PARTITION BY ... ORDER BY ...)`
3. **Types**: Aggregate, Ranking, Value functions
4. **Frames**: ROWS or RANGE to define window
5. **Use Cases**: Running totals, rankings, comparisons, moving averages
6. **Performance**: Index ORDER BY columns, consider partition size

**Key Takeaway:**
Window functions enable powerful analytics without collapsing rows. They're perfect for running calculations, rankings, and comparisons. Use them when you need aggregated values but want to keep all rows in the result.

**When to Use:**
- Running totals/averages
- Rankings and percentiles
- Comparing with previous/next rows
- Moving averages
- Top N per group

**Next Steps:**
- Learn [GROUP BY](../05_aggregations_grouping/group_by.md) for comparison
- Study [CTEs](../06_advanced_querying/ctes.md) with window functions
- Master [Performance Optimization](../10_performance_optimization/) for window function tuning

