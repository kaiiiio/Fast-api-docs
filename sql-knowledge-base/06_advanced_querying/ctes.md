# CTEs (Common Table Expressions): WITH Queries

CTEs (Common Table Expressions) are named temporary result sets that exist only for the duration of a query. They make complex queries more readable and maintainable.

## What is a CTE?

A **CTE** (Common Table Expression) is a temporary named result set defined within a query. It's created using the `WITH` clause and can be referenced multiple times in the main query.

### Basic Syntax

```sql
WITH cte_name AS (
    SELECT ...
)
SELECT * FROM cte_name;
```

## Why Use CTEs?

### Benefits

1. **Readability**: Break complex queries into logical parts
2. **Maintainability**: Easier to understand and modify
3. **Reusability**: Reference CTE multiple times in same query
4. **Debugging**: Test CTE separately
5. **Recursion**: Enable recursive queries (hierarchies, trees)

## Basic CTE Examples

### Simple CTE

```sql
-- Get active users with their order count
WITH user_orders AS (
    SELECT 
        user_id,
        COUNT(*) AS order_count,
        SUM(total) AS total_spent
    FROM orders
    GROUP BY user_id
)
SELECT 
    u.id,
    u.name,
    u.email,
    COALESCE(uo.order_count, 0) AS order_count,
    COALESCE(uo.total_spent, 0) AS total_spent
FROM users u
LEFT JOIN user_orders uo ON u.id = uo.user_id
WHERE u.is_active = true;
```

**What Happens:**
1. CTE `user_orders` is evaluated first
2. Result stored temporarily
3. Main query uses CTE like a table
4. CTE is discarded after query completes

### Multiple CTEs

```sql
-- Chain multiple CTEs
WITH 
    active_users AS (
        SELECT * FROM users WHERE is_active = true
    ),
    user_orders AS (
        SELECT 
            user_id,
            COUNT(*) AS order_count
        FROM orders
        GROUP BY user_id
    ),
    user_stats AS (
        SELECT 
            au.id,
            au.name,
            COALESCE(uo.order_count, 0) AS order_count
        FROM active_users au
        LEFT JOIN user_orders uo ON au.id = uo.user_id
    )
SELECT *
FROM user_stats
WHERE order_count > 5
ORDER BY order_count DESC;
```

**Execution Order:**
1. `active_users` CTE evaluated
2. `user_orders` CTE evaluated
3. `user_stats` CTE uses both previous CTEs
4. Final SELECT uses `user_stats`

## CTE vs Subquery

### Subquery Approach

```sql
-- Complex nested subqueries (hard to read)
SELECT 
    u.name,
    (
        SELECT COUNT(*)
        FROM orders o
        WHERE o.user_id = u.id
          AND o.total > (
              SELECT AVG(total)
              FROM orders
              WHERE user_id = u.id
          )
    ) AS large_order_count
FROM users u;
```

### CTE Approach (Better)

```sql
-- Same query with CTEs (much clearer)
WITH user_avg_order AS (
    SELECT 
        user_id,
        AVG(total) AS avg_order_value
    FROM orders
    GROUP BY user_id
),
large_orders AS (
    SELECT 
        o.user_id,
        COUNT(*) AS large_order_count
    FROM orders o
    JOIN user_avg_order uao ON o.user_id = uao.user_id
    WHERE o.total > uao.avg_order_value
    GROUP BY o.user_id
)
SELECT 
    u.name,
    COALESCE(lo.large_order_count, 0) AS large_order_count
FROM users u
LEFT JOIN large_orders lo ON u.id = lo.user_id;
```

**Benefits:**
- Easier to read and understand
- Can test each CTE separately
- Reusable within query
- Better for complex logic

## CTE Use Cases

### Use Case 1: Data Preparation

```sql
-- Prepare and clean data before main query
WITH cleaned_orders AS (
    SELECT 
        id,
        user_id,
        total,
        created_at
    FROM orders
    WHERE total > 0  -- Remove invalid orders
      AND created_at >= '2024-01-01'  -- Recent orders only
),
user_totals AS (
    SELECT 
        user_id,
        COUNT(*) AS order_count,
        SUM(total) AS total_spent
    FROM cleaned_orders
    GROUP BY user_id
)
SELECT 
    u.name,
    ut.order_count,
    ut.total_spent
FROM users u
JOIN user_totals ut ON u.id = ut.user_id;
```

### Use Case 2: Step-by-Step Calculations

```sql
-- Calculate user statistics step by step
WITH 
    order_counts AS (
        SELECT 
            user_id,
            COUNT(*) AS total_orders
        FROM orders
        GROUP BY user_id
    ),
    order_totals AS (
        SELECT 
            user_id,
            SUM(total) AS total_spent
        FROM orders
        GROUP BY user_id
    ),
    user_stats AS (
        SELECT 
            u.id,
            u.name,
            COALESCE(oc.total_orders, 0) AS order_count,
            COALESCE(ot.total_spent, 0) AS total_spent,
            CASE
                WHEN COALESCE(ot.total_spent, 0) > 5000 THEN 'VIP'
                WHEN COALESCE(ot.total_spent, 0) > 1000 THEN 'Gold'
                ELSE 'Regular'
            END AS tier
        FROM users u
        LEFT JOIN order_counts oc ON u.id = oc.user_id
        LEFT JOIN order_totals ot ON u.id = ot.user_id
    )
SELECT *
FROM user_stats
WHERE tier IN ('VIP', 'Gold')
ORDER BY total_spent DESC;
```

### Use Case 3: Reusable Calculations

```sql
-- Use same calculation multiple times
WITH monthly_revenue AS (
    SELECT 
        DATE_TRUNC('month', created_at) AS month,
        SUM(total) AS revenue
    FROM orders
    GROUP BY DATE_TRUNC('month', created_at)
)
SELECT 
    month,
    revenue,
    revenue - LAG(revenue) OVER (ORDER BY month) AS revenue_change,
    revenue / (SELECT AVG(revenue) FROM monthly_revenue) AS revenue_ratio
FROM monthly_revenue
ORDER BY month;
```

## Recursive CTEs

CTEs can reference themselves, enabling recursive queries for hierarchical data.

### Basic Recursive CTE Structure

```sql
WITH RECURSIVE cte_name AS (
    -- Base case (anchor)
    SELECT ...
    
    UNION ALL
    
    -- Recursive case
    SELECT ...
    FROM cte_name  -- References itself!
    WHERE condition  -- Termination condition
)
SELECT * FROM cte_name;
```

### Example: Employee Hierarchy

```sql
-- Schema
CREATE TABLE employees (
    id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    manager_id INT,
    FOREIGN KEY (manager_id) REFERENCES employees(id)
);

-- Find all subordinates of a manager
WITH RECURSIVE employee_hierarchy AS (
    -- Base case: Start with manager
    SELECT 
        id,
        name,
        manager_id,
        0 AS level,
        ARRAY[id] AS path
    FROM employees
    WHERE id = 1  -- Manager ID
    
    UNION ALL
    
    -- Recursive case: Find direct reports
    SELECT 
        e.id,
        e.name,
        e.manager_id,
        eh.level + 1,
        eh.path || e.id  -- Add to path
    FROM employees e
    JOIN employee_hierarchy eh ON e.manager_id = eh.id
    WHERE NOT (e.id = ANY(eh.path))  -- Prevent cycles
)
SELECT * FROM employee_hierarchy;
```

**Result:**
```
┌────┬──────────────┬─────────────┬───────┬──────────┐
│ id │ name         │ manager_id │ level │ path     │
├────┼──────────────┼─────────────┼───────┼──────────┤
│ 1  │ CEO          │ NULL        │ 0     │ {1}      │
│ 2  │ VP Engineering│ 1          │ 1     │ {1,2}    │
│ 3  │ VP Sales     │ 1          │ 1     │ {1,3}    │
│ 4  │ Senior Eng   │ 2          │ 2     │ {1,2,4}  │
│ 5  │ Junior Eng   │ 2          │ 2     │ {1,2,5}  │
└────┴──────────────┴─────────────┴───────┴──────────┘
```

### Example: Category Tree

```sql
-- Find all subcategories of a category
WITH RECURSIVE category_tree AS (
    -- Base case: Root category
    SELECT 
        id,
        name,
        parent_id,
        0 AS depth,
        name AS path
    FROM categories
    WHERE id = 1  -- Root category
    
    UNION ALL
    
    -- Recursive case: Child categories
    SELECT 
        c.id,
        c.name,
        c.parent_id,
        ct.depth + 1,
        ct.path || ' > ' || c.name
    FROM categories c
    JOIN category_tree ct ON c.parent_id = ct.id
)
SELECT * FROM category_tree;
```

## CTE in Different Clauses

### CTE in UPDATE

```sql
-- Update products based on CTE
WITH low_stock_products AS (
    SELECT id
    FROM products
    WHERE stock_quantity < 10
)
UPDATE products
SET needs_restock = true
WHERE id IN (SELECT id FROM low_stock_products);
```

### CTE in DELETE

```sql
-- Delete old orders using CTE
WITH old_orders AS (
    SELECT id
    FROM orders
    WHERE created_at < CURRENT_DATE - INTERVAL '1 year'
      AND status = 'completed'
)
DELETE FROM orders
WHERE id IN (SELECT id FROM old_orders);
```

### CTE in INSERT

```sql
-- Insert summary data from CTE
WITH monthly_summary AS (
    SELECT 
        DATE_TRUNC('month', created_at) AS month,
        COUNT(*) AS order_count,
        SUM(total) AS revenue
    FROM orders
    GROUP BY DATE_TRUNC('month', created_at)
)
INSERT INTO monthly_reports (month, order_count, revenue)
SELECT month, order_count, revenue
FROM monthly_summary;
```

## Performance Considerations

### CTE Materialization

**PostgreSQL:** CTEs are materialized (executed once, stored)
```sql
-- CTE executed once, result stored
WITH user_stats AS (
    SELECT user_id, COUNT(*) AS order_count
    FROM orders
    GROUP BY user_id
)
SELECT * FROM user_stats WHERE order_count > 10;
SELECT * FROM user_stats WHERE order_count < 5;
-- CTE executed only once
```

**MySQL:** CTEs are inlined (reexecuted each time)
```sql
-- CTE may be reexecuted for each reference
-- Consider using temporary table for complex CTEs
```

### Optimization Tips

1. **Index CTE Columns**: If CTE is large, ensure source tables are indexed
2. **Limit CTE Size**: Filter early in CTE definition
3. **Use Temporary Tables**: For very complex CTEs that are used multiple times

```sql
-- For complex, reusable CTEs
CREATE TEMPORARY TABLE user_stats AS
SELECT user_id, COUNT(*) AS order_count
FROM orders
GROUP BY user_id;

-- Use multiple times
SELECT * FROM user_stats WHERE order_count > 10;
SELECT * FROM user_stats WHERE order_count < 5;
```

## Common Patterns

### Pattern 1: Data Transformation Pipeline

```sql
WITH 
    raw_data AS (
        SELECT * FROM staging_table
    ),
    cleaned_data AS (
        SELECT 
            id,
            TRIM(LOWER(email)) AS email,
            UPPER(name) AS name
        FROM raw_data
        WHERE email IS NOT NULL
    ),
    validated_data AS (
        SELECT *
        FROM cleaned_data
        WHERE email LIKE '%@%.%'
    )
INSERT INTO users (email, name)
SELECT email, name FROM validated_data;
```

### Pattern 2: Ranking and Filtering

```sql
WITH ranked_products AS (
    SELECT 
        id,
        name,
        price,
        ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY price DESC) AS rank
    FROM products
)
SELECT *
FROM ranked_products
WHERE rank <= 3;  -- Top 3 products per category
```

### Pattern 3: Time Series Analysis

```sql
WITH 
    daily_sales AS (
        SELECT 
            DATE(created_at) AS sale_date,
            SUM(total) AS daily_revenue
        FROM orders
        GROUP BY DATE(created_at)
    ),
    moving_average AS (
        SELECT 
            sale_date,
            daily_revenue,
            AVG(daily_revenue) OVER (
                ORDER BY sale_date
                ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
            ) AS seven_day_avg
        FROM daily_sales
    )
SELECT *
FROM moving_average
WHERE sale_date >= CURRENT_DATE - INTERVAL '30 days';
```

## Common Mistakes

### ❌ CTE Scope

```sql
-- ❌ Error: CTE only exists for one statement
WITH user_stats AS (...)
SELECT * FROM user_stats;

SELECT * FROM user_stats;  -- Error: CTE doesn't exist here
```

### ❌ Recursive CTE Without Termination

```sql
-- ❌ Infinite loop: No termination condition
WITH RECURSIVE infinite AS (
    SELECT 1 AS n
    UNION ALL
    SELECT n + 1 FROM infinite  -- Never stops!
)
SELECT * FROM infinite;
```

### ❌ Missing UNION ALL in Recursive CTE

```sql
-- ❌ Error: Recursive CTE needs UNION ALL
WITH RECURSIVE hierarchy AS (
    SELECT ...
    -- Missing UNION ALL!
    SELECT ... FROM hierarchy
)
```

## Best Practices

1. **Use CTEs for Readability**: Break complex queries into logical parts
2. **Name CTEs Clearly**: Use descriptive names
3. **Test CTEs Separately**: Verify each CTE before combining
4. **Consider Performance**: CTEs may be materialized or inlined
5. **Use Recursive CTEs**: For hierarchical/tree data
6. **Limit Recursion Depth**: Prevent infinite loops
7. **Index Source Tables**: For CTE performance

## Summary

**CTE Essentials:**

1. **Syntax**: `WITH cte_name AS (SELECT ...) SELECT ...`
2. **Purpose**: Named temporary result sets for query duration
3. **Benefits**: Readability, maintainability, reusability
4. **Types**: Regular CTEs and Recursive CTEs
5. **Use Cases**: Data preparation, step-by-step calculations, hierarchies
6. **Performance**: May be materialized (PostgreSQL) or inlined (MySQL)

**Key Takeaway:**
CTEs make complex queries readable and maintainable. They're perfect for breaking down complex logic into understandable steps. Recursive CTEs enable powerful hierarchical queries. Use CTEs when queries become hard to read with subqueries.

**When to Use:**
- Complex queries with multiple steps
- Need to reference same calculation multiple times
- Hierarchical/tree data (recursive CTEs)
- Improving query readability

**When to Avoid:**
- Simple queries (overkill)
- Performance-critical (may be slower than subqueries)
- Need result set beyond query scope (use temp table)

**Next Steps:**
- Learn [Recursive CTEs](recursive_ctes.md) for hierarchies
- Study [Window Functions](../05_aggregations_grouping/window_functions.md) with CTEs
- Master [Performance Optimization](../10_performance_optimization/) for CTE tuning

