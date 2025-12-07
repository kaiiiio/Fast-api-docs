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

---

## 🎯 Interview Questions: SQL

### Q1: Explain what window functions are and how they differ from aggregate functions with GROUP BY. Provide detailed examples showing when to use window functions vs GROUP BY, and explain the performance implications of each approach.

**Answer:**

**Window Functions Definition:**

Window functions perform calculations across a set of table rows that are somehow related to the current row. Unlike aggregate functions with GROUP BY, window functions do not collapse rows—they return a value for each row while performing calculations across a "window" of rows. This makes them powerful for analytics, rankings, and comparisons without losing row-level detail.

**Key Difference from GROUP BY:**

**GROUP BY:**
- **Collapses rows** into groups
- Returns **one row per group**
- Loses individual row details
- Must include all non-aggregated columns in GROUP BY

**Window Functions:**
- **Preserves all rows**
- Returns **one row per input row**
- Keeps individual row details
- Can add aggregated values to each row

**Visual Comparison:**

**GROUP BY Example:**
```sql
SELECT user_id, COUNT(*) AS order_count, SUM(total) AS total_spent
FROM orders
GROUP BY user_id;
```

**Result (Collapsed):**
```
┌─────────┬─────────────┬─────────────┐
│ user_id │ order_count │ total_spent │
├─────────┼─────────────┼─────────────┤
│ 1       │ 5           │ 500.00      │
│ 2       │ 3           │ 300.00      │
│ 3       │ 2           │ 200.00      │
└─────────┴─────────────┴─────────────┘
-- 3 rows (one per user group)
-- Individual order details lost
```

**Window Function Example:**
```sql
SELECT 
    id,
    user_id,
    total,
    COUNT(*) OVER (PARTITION BY user_id) AS order_count,
    SUM(total) OVER (PARTITION BY user_id) AS total_spent
FROM orders;
```

**Result (All Rows Preserved):**
```
┌────┬─────────┬────────┬─────────────┬─────────────┐
│ id │ user_id │ total  │ order_count │ total_spent │
├────┼─────────┼────────┼─────────────┼─────────────┤
│ 1  │ 1       │ 100.00 │ 5           │ 500.00      │
│ 2  │ 1       │ 150.00 │ 5           │ 500.00      │
│ 3  │ 1       │ 250.00 │ 5           │ 500.00      │
│ 4  │ 2       │ 100.00 │ 3           │ 300.00      │
│ 5  │ 2       │ 200.00 │ 3           │ 300.00      │
└────┴─────────┴────────┴─────────────┴─────────────┘
-- 5 rows (all orders preserved)
-- Individual order details + aggregated values
```

**When to Use Window Functions:**

**1. Rankings and Ordering:**

```sql
-- Top 3 orders per user (preserving order details)
SELECT 
    id,
    user_id,
    total,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY total DESC) AS rank
FROM orders
WHERE ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY total DESC) <= 3;

-- With GROUP BY, you'd lose individual order details
-- Window function preserves which specific orders are top 3
```

**2. Running Totals and Moving Averages:**

```sql
-- Daily revenue with running total
SELECT 
    DATE(created_at) AS sale_date,
    SUM(total) AS daily_revenue,
    SUM(SUM(total)) OVER (ORDER BY DATE(created_at)) AS running_total
FROM orders
GROUP BY DATE(created_at)
ORDER BY sale_date;

-- GROUP BY can't calculate running totals
-- Window function adds cumulative calculation
```

**3. Comparing with Previous/Next Rows:**

```sql
-- Month-over-month growth
SELECT 
    DATE_TRUNC('month', created_at) AS month,
    SUM(total) AS revenue,
    LAG(SUM(total)) OVER (ORDER BY DATE_TRUNC('month', created_at)) AS prev_month,
    SUM(total) - LAG(SUM(total)) OVER (ORDER BY DATE_TRUNC('month', created_at)) AS growth
FROM orders
GROUP BY DATE_TRUNC('month', created_at);

-- Window function enables comparing with previous period
-- GROUP BY alone can't access previous group's value
```

**4. Percentiles and Relative Rankings:**

```sql
-- Products ranked by price percentile
SELECT 
    id,
    name,
    price,
    PERCENT_RANK() OVER (ORDER BY price) AS price_percentile,
    CASE 
        WHEN PERCENT_RANK() OVER (ORDER BY price) >= 0.9 THEN 'Premium'
        WHEN PERCENT_RANK() OVER (ORDER BY price) >= 0.5 THEN 'Mid-range'
        ELSE 'Budget'
    END AS price_tier
FROM products;

-- Window function calculates relative position
-- GROUP BY can't determine percentile rankings
```

**When to Use GROUP BY:**

**1. Simple Aggregations:**

```sql
-- Total revenue per user (don't need order details)
SELECT user_id, SUM(total) AS total_spent
FROM orders
GROUP BY user_id;

-- Simpler and more efficient than window function
-- No need to preserve individual rows
```

**2. Filtering on Aggregates:**

```sql
-- Users who spent more than $1000
SELECT user_id, SUM(total) AS total_spent
FROM orders
GROUP BY user_id
HAVING SUM(total) > 1000;

-- GROUP BY with HAVING is straightforward
-- Window function would require subquery/CTE
```

**3. Small Result Sets:**

```sql
-- Count orders per status
SELECT status, COUNT(*) AS count
FROM orders
GROUP BY status;

-- Only a few groups (statuses)
-- GROUP BY is more efficient
```

**Performance Implications:**

**1. Result Set Size:**

**GROUP BY:**
- Smaller result set (one row per group)
- Less data to process, transfer, and store
- More efficient for large datasets when details aren't needed

**Window Functions:**
- Larger result set (one row per input row)
- More data to process and transfer
- May be slower for very large tables

**2. Memory Usage:**

**GROUP BY:**
- Memory for groups (typically small)
- Efficient for many groups

**Window Functions:**
- Memory for window partitions
- May require sorting entire partitions
- Can be memory-intensive for large partitions

**3. Execution Strategy:**

**GROUP BY:**
```sql
-- Execution plan:
HashAggregate (cost=...)
  -> Seq Scan on orders
-- Single pass, groups rows, calculates aggregates
```

**Window Functions:**
```sql
-- Execution plan:
WindowAgg (cost=...)
  -> Sort (cost=...)  -- May need to sort for PARTITION BY/ORDER BY
      -> Seq Scan on orders
-- May require sorting, then window calculation
```

**4. Index Usage:**

**GROUP BY:**
- Can use indexes for filtering
- Less dependent on ORDER BY for performance

**Window Functions:**
- Benefit greatly from indexes on PARTITION BY and ORDER BY columns
- Without indexes, may require expensive sorts

**Performance Comparison Example:**

**Scenario:** 1 million orders, 100,000 users

**Query 1: GROUP BY (Total per user)**
```sql
SELECT user_id, SUM(total) AS total_spent
FROM orders
GROUP BY user_id;
-- Result: 100,000 rows
-- Execution: Fast (single pass, hash aggregate)
-- Memory: ~100,000 groups
```

**Query 2: Window Function (Total per user, all orders)**
```sql
SELECT 
    id,
    user_id,
    total,
    SUM(total) OVER (PARTITION BY user_id) AS total_spent
FROM orders;
-- Result: 1,000,000 rows
-- Execution: Slower (must process all rows, maintain partitions)
-- Memory: Partitions for 100,000 users
```

**When Window Functions Are More Efficient:**

**1. Top N Per Group:**
```sql
-- Window function (efficient with index)
SELECT *
FROM (
    SELECT 
        *,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY total DESC) AS rn
    FROM orders
) ranked
WHERE rn <= 3;

-- vs GROUP BY approach (less efficient)
-- Would require self-join or correlated subquery
```

**2. Avoiding Multiple Passes:**
```sql
-- Window function: Single pass
SELECT 
    user_id,
    total,
    COUNT(*) OVER (PARTITION BY user_id) AS order_count,
    SUM(total) OVER (PARTITION BY user_id) AS total_spent,
    AVG(total) OVER (PARTITION BY user_id) AS avg_order
FROM orders;

-- GROUP BY approach: Would require multiple queries or self-joins
```

**System Design Consideration**: Understanding when to use window functions vs GROUP BY is crucial for:
1. **Query Efficiency**: Choosing the right approach for performance
2. **Data Requirements**: Preserving row details vs. aggregating
3. **Analytics**: Enabling complex analytical queries
4. **Maintainability**: Writing clear, efficient queries

Window functions and GROUP BY serve different purposes. GROUP BY is better for simple aggregations where you don't need row-level details. Window functions are essential for analytics, rankings, and comparisons where you need aggregated values alongside individual row data. The choice depends on your data requirements and performance needs.

---

### Q2: Explain how window function frames work (ROWS vs RANGE). Provide detailed examples of different frame specifications and explain when to use each. How do frames affect performance and what are the implications of UNBOUNDED vs bounded frames?

**Answer:**

**Window Function Frames:**

A window frame defines which rows are included in the window function calculation for each row. It specifies the range of rows relative to the current row that should be considered. Frames are specified using `ROWS` (physical rows) or `RANGE` (logical range based on values).

**ROWS vs RANGE:**

**ROWS:**
- Specifies a **physical number of rows** before/after the current row
- Based on row position in the ordered result set
- Precise, deterministic
- More efficient (doesn't need to evaluate values)

**RANGE:**
- Specifies a **logical range** based on the ORDER BY column values
- Based on the actual values, not row positions
- May include variable numbers of rows
- Less efficient (must evaluate values)

**Frame Syntax:**

```sql
function() OVER (
    PARTITION BY column
    ORDER BY column
    ROWS BETWEEN start AND end
    -- OR
    RANGE BETWEEN start AND end
)
```

**Frame Boundaries:**

**Start Options:**
- `UNBOUNDED PRECEDING`: From the start of the partition
- `n PRECEDING`: n rows before current row (ROWS) or n units before (RANGE)
- `CURRENT ROW`: Current row

**End Options:**
- `CURRENT ROW`: Current row
- `n FOLLOWING`: n rows after current row (ROWS) or n units after (RANGE)
- `UNBOUNDED FOLLOWING`: To the end of the partition

**ROWS Examples:**

**1. Current Row Only:**
```sql
SELECT 
    id,
    total,
    SUM(total) OVER (ORDER BY id ROWS BETWEEN CURRENT ROW AND CURRENT ROW) AS current_only
FROM orders;
-- Frame: Just the current row
-- Result: Same as total (no aggregation across rows)
```

**2. Previous 2 Rows + Current:**
```sql
SELECT 
    id,
    total,
    AVG(total) OVER (
        ORDER BY created_at 
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ) AS moving_avg_3
FROM orders;
```

**Result:**
```
┌────┬────────┬──────────────┐
│ id │ total  │ moving_avg_3│
├────┼────────┼──────────────┤
│ 1  │ 100.00 │ 100.00      │ (only row 1)
│ 2  │ 150.00 │ 125.00      │ (rows 1-2: (100+150)/2)
│ 3  │ 200.00 │ 150.00      │ (rows 1-3: (100+150+200)/3)
│ 4  │ 250.00 │ 200.00      │ (rows 2-4: (150+200+250)/3)
│ 5  │ 300.00 │ 250.00      │ (rows 3-5: (200+250+300)/3)
└────┴────────┴──────────────┘
```

**3. Running Total (Unbounded Preceding):**
```sql
SELECT 
    id,
    total,
    SUM(total) OVER (
        ORDER BY created_at 
        ROWS UNBOUNDED PRECEDING
    ) AS running_total
FROM orders;
```

**Result:**
```
┌────┬────────┬──────────────┐
│ id │ total  │ running_total│
├────┼────────┼──────────────┤
│ 1  │ 100.00 │ 100.00       │ (100)
│ 2  │ 150.00 │ 250.00       │ (100+150)
│ 3  │ 200.00 │ 450.00       │ (100+150+200)
│ 4  │ 250.00 │ 700.00       │ (100+150+200+250)
└────┴────────┴──────────────┘
```

**4. Current + Next Row:**
```sql
SELECT 
    id,
    total,
    SUM(total) OVER (
        ORDER BY created_at 
        ROWS BETWEEN CURRENT ROW AND 1 FOLLOWING
    ) AS current_and_next
FROM orders;
```

**RANGE Examples:**

**1. Range with Date Intervals:**
```sql
SELECT 
    id,
    total,
    created_at,
    SUM(total) OVER (
        ORDER BY created_at 
        RANGE BETWEEN INTERVAL '7 days' PRECEDING AND CURRENT ROW
    ) AS sum_last_7_days
FROM orders;
```

**Key Difference:**
- **ROWS**: "Last 3 physical rows" (always exactly 3 rows)
- **RANGE**: "All rows within 7 days" (variable number of rows)

**Example:**
```
Orders:
┌────┬────────┬─────────────────────┐
│ id │ total  │ created_at          │
├────┼────────┼─────────────────────┤
│ 1  │ 100.00 │ 2024-01-01 10:00:00 │
│ 2  │ 150.00 │ 2024-01-02 11:00:00 │
│ 3  │ 200.00 │ 2024-01-08 12:00:00 │ (7 days later)
│ 4  │ 250.00 │ 2024-01-09 13:00:00 │
└────┴────────┴─────────────────────┘

For row 3 (2024-01-08):
- ROWS BETWEEN 2 PRECEDING: rows 1, 2, 3 (3 rows)
- RANGE BETWEEN 7 DAYS PRECEDING: rows 3 only (row 1 is 7 days ago, excluded)
```

**2. Range with Numeric Values:**
```sql
SELECT 
    id,
    price,
    SUM(quantity) OVER (
        ORDER BY price 
        RANGE BETWEEN 10 PRECEDING AND CURRENT ROW
    ) AS quantity_within_10
FROM products;
```

**Frame: All products within $10 of current product's price**

**Performance Implications:**

**1. UNBOUNDED Frames:**

**UNBOUNDED PRECEDING/FOLLOWING:**
```sql
SUM(total) OVER (PARTITION BY user_id)
-- Frame: Entire partition
-- Must scan entire partition for each row
-- Memory: Stores entire partition
-- Performance: O(n) per row = O(n²) total for partition
```

**Performance Impact:**
- Must process entire partition
- Higher memory usage
- Slower for large partitions
- May require disk-based sorting

**2. Bounded Frames:**

**Bounded (e.g., 2 PRECEDING to CURRENT ROW):**
```sql
AVG(total) OVER (
    ORDER BY created_at 
    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
)
-- Frame: Only 3 rows (current + 2 preceding)
-- Only needs to maintain 3 rows in memory
-- Performance: O(1) per row = O(n) total
```

**Performance Impact:**
- Only processes frame rows
- Lower memory usage
- Much faster for large datasets
- Can use sliding window optimization

**Performance Comparison:**

**Scenario:** 1 million orders, calculating running totals

**UNBOUNDED Frame:**
```sql
SELECT 
    id,
    total,
    SUM(total) OVER (ORDER BY created_at ROWS UNBOUNDED PRECEDING) AS running_total
FROM orders;
-- Execution: Must maintain running sum for all previous rows
-- Memory: Grows with partition size
-- Time: O(n) but with overhead for each row
```

**Bounded Frame:**
```sql
SELECT 
    id,
    total,
    AVG(total) OVER (
        ORDER BY created_at 
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS moving_avg_7
FROM orders;
-- Execution: Only maintains last 7 rows
-- Memory: Constant (7 rows)
-- Time: O(n) with constant overhead
```

**ROWS vs RANGE Performance:**

**ROWS:**
- More efficient (physical row access)
- Deterministic (always same number of rows)
- Can use index efficiently
- Better for performance

**RANGE:**
- Less efficient (must evaluate values)
- Variable number of rows
- May require sorting and value comparison
- Slower, especially with many duplicate values

**Example Performance Difference:**

```sql
-- ROWS: Fast
AVG(total) OVER (
    ORDER BY created_at 
    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
)
-- Always exactly 3 rows
-- Direct row access

-- RANGE: Slower
AVG(total) OVER (
    ORDER BY created_at 
    RANGE BETWEEN INTERVAL '1 day' PRECEDING AND CURRENT ROW
)
-- Variable number of rows
-- Must evaluate date differences
-- May include many rows if many orders on same day
```

**Common Frame Patterns:**

**1. Running Total:**
```sql
SUM(value) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING)
```

**2. Moving Average:**
```sql
AVG(value) OVER (
    ORDER BY date 
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
)
```

**3. Current and Previous:**
```sql
LAG(value) OVER (ORDER BY date ROWS BETWEEN 1 PRECEDING AND CURRENT ROW)
-- Or simply: LAG(value) OVER (ORDER BY date)
```

**4. Entire Partition:**
```sql
SUM(value) OVER (PARTITION BY group)
-- Default frame: UNBOUNDED PRECEDING TO UNBOUNDED FOLLOWING
```

**System Design Consideration**: Understanding window frames is crucial for:
1. **Performance**: Bounded frames are much faster than unbounded
2. **Correctness**: ROWS vs RANGE can produce different results
3. **Memory Usage**: Frame size affects memory requirements
4. **Query Optimization**: Choosing appropriate frames for efficiency

Window function frames are powerful but can significantly impact performance. UNBOUNDED frames process entire partitions and can be slow for large datasets. Bounded frames are much more efficient. ROWS is generally faster than RANGE. Understanding these differences helps write efficient window function queries that perform well at scale.

