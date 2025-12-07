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

---

## 🎯 Interview Questions: SQL

### Q1: Explain what Common Table Expressions (CTEs) are and how they differ from subqueries and temporary tables. Provide examples showing when CTEs improve query readability and maintainability, and discuss the performance characteristics of CTEs in different database systems.

**Answer:**

**CTE Definition:**

A Common Table Expression (CTE) is a named temporary result set that exists only for the duration of a single SQL statement. CTEs are defined using the `WITH` clause and can be referenced multiple times within the same query. They provide a way to break down complex queries into simpler, more readable parts.

**CTE Syntax:**

```sql
WITH cte_name AS (
    SELECT ...
)
SELECT ...
FROM cte_name;
```

**How CTEs Differ from Subqueries:**

**1. Readability:**

**Subquery (Nested, Hard to Read):**
```sql
-- Complex nested subqueries
SELECT 
    u.name,
    stats.order_count,
    stats.total_spent
FROM users u
JOIN (
    SELECT 
        user_id,
        COUNT(*) AS order_count,
        SUM(total) AS total_spent
    FROM orders
    GROUP BY user_id
) stats ON u.id = stats.user_id
WHERE stats.order_count > (
    SELECT AVG(order_count)
    FROM (
        SELECT COUNT(*) AS order_count
        FROM orders
        GROUP BY user_id
    ) user_orders
);
-- Hard to read: nested subqueries, unclear structure
```

**CTE (Clear, Readable):**
```sql
-- Same query with CTEs
WITH user_order_stats AS (
    SELECT 
        user_id,
        COUNT(*) AS order_count,
        SUM(total) AS total_spent
    FROM orders
    GROUP BY user_id
),
average_order_count AS (
    SELECT AVG(order_count) AS avg_count
    FROM user_order_stats
)
SELECT 
    u.name,
    stats.order_count,
    stats.total_spent
FROM users u
JOIN user_order_stats stats ON u.id = stats.user_id
CROSS JOIN average_order_count avg
WHERE stats.order_count > avg.avg_count;
-- Clear structure: step-by-step, easy to understand
```

**2. Reusability:**

**Subquery (Repeated):**
```sql
-- Must repeat subquery
SELECT 
    u.name,
    (SELECT COUNT(*) FROM orders WHERE user_id = u.id) AS order_count,
    (SELECT SUM(total) FROM orders WHERE user_id = u.id) AS total_spent,
    (SELECT AVG(total) FROM orders WHERE user_id = u.id) AS avg_order
FROM users u;
-- Subquery repeated 3 times, executed 3 times per user
```

**CTE (Reusable):**
```sql
-- Define once, use multiple times
WITH user_stats AS (
    SELECT 
        user_id,
        COUNT(*) AS order_count,
        SUM(total) AS total_spent,
        AVG(total) AS avg_order
    FROM orders
    GROUP BY user_id
)
SELECT 
    u.name,
    stats.order_count,
    stats.total_spent,
    stats.avg_order
FROM users u
JOIN user_stats stats ON u.id = stats.user_id;
-- CTE defined once, used once
-- More efficient
```

**3. Multiple References:**

**Subquery (Cannot Reference Multiple Times):**
```sql
-- Cannot easily reference same calculation twice
SELECT 
    month,
    revenue,
    revenue - (SELECT AVG(revenue) FROM monthly_revenue) AS diff_from_avg,
    revenue / (SELECT AVG(revenue) FROM monthly_revenue) AS ratio_to_avg
FROM monthly_revenue;
-- Subquery executed twice (inefficient)
```

**CTE (Can Reference Multiple Times):**
```sql
-- Define once, reference multiple times
WITH monthly_revenue AS (
    SELECT 
        DATE_TRUNC('month', created_at) AS month,
        SUM(total) AS revenue
    FROM orders
    GROUP BY DATE_TRUNC('month', created_at)
),
avg_revenue AS (
    SELECT AVG(revenue) AS avg_rev
    FROM monthly_revenue
)
SELECT 
    mr.month,
    mr.revenue,
    mr.revenue - avg.avg_rev AS diff_from_avg,
    mr.revenue / avg.avg_rev AS ratio_to_avg
FROM monthly_revenue mr
CROSS JOIN avg_revenue avg;
-- CTE executed once, used multiple times
```

**How CTEs Differ from Temporary Tables:**

**1. Scope:**

**CTE:**
- Exists only for the duration of the query
- Cannot be referenced in other queries
- Automatically cleaned up

**Temporary Table:**
- Exists for the session or transaction
- Can be referenced in multiple queries
- Must be explicitly dropped

**2. Performance:**

**CTE:**
- May be materialized (PostgreSQL) or inlined (MySQL)
- Optimizer may merge CTE into main query
- No explicit storage

**Temporary Table:**
- Always materialized (stored on disk/memory)
- Explicit storage overhead
- Can be indexed for performance

**3. Use Cases:**

**CTE:**
- Single query complexity
- Query readability
- Step-by-step transformations

**Temporary Table:**
- Multiple queries need same data
- Complex processing across queries
- Need to index intermediate results

**Example: CTE vs Temporary Table**

**Using CTE:**
```sql
-- CTE: Single query use
WITH user_stats AS (
    SELECT user_id, COUNT(*) AS order_count
    FROM orders
    GROUP BY user_id
)
SELECT * FROM user_stats WHERE order_count > 10;
-- CTE only exists for this query
```

**Using Temporary Table:**
```sql
-- Temporary table: Multiple query use
CREATE TEMPORARY TABLE user_stats AS
SELECT user_id, COUNT(*) AS order_count
FROM orders
GROUP BY user_id;

CREATE INDEX idx_order_count ON user_stats(order_count);

-- Use in multiple queries
SELECT * FROM user_stats WHERE order_count > 10;
SELECT * FROM user_stats WHERE order_count < 5;
SELECT AVG(order_count) FROM user_stats;

DROP TABLE user_stats;
```

**Performance Characteristics:**

**PostgreSQL CTE Behavior:**

**Materialization:**
- CTEs are **materialized** (executed and stored)
- CTE is computed once, stored, then used
- Good for CTEs used multiple times
- Can be slower if CTE is large but only used once

**Example:**
```sql
WITH large_cte AS (
    SELECT * FROM huge_table WHERE condition
)
SELECT * FROM large_cte WHERE col1 = 'value';
SELECT * FROM large_cte WHERE col2 = 'value';
-- CTE executed once, stored, used twice
-- Efficient for multiple uses
```

**MySQL CTE Behavior:**

**Inlining:**
- CTEs are often **inlined** (merged into main query)
- Optimizer may rewrite CTE as subquery
- May be re-executed if referenced multiple times
- Can be less efficient for multiple references

**Example:**
```sql
WITH stats AS (
    SELECT user_id, COUNT(*) AS cnt FROM orders GROUP BY user_id
)
SELECT * FROM stats WHERE cnt > 10;
-- May be rewritten as:
-- SELECT * FROM (SELECT user_id, COUNT(*) AS cnt FROM orders GROUP BY user_id) stats
-- WHERE cnt > 10;
```

**Performance Optimization:**

**1. Filter Early in CTE:**
```sql
-- ❌ Bad: Large CTE
WITH all_orders AS (
    SELECT * FROM orders  -- 10 million rows
)
SELECT * FROM all_orders WHERE user_id = 123;

-- ✅ Good: Filter early
WITH user_orders AS (
    SELECT * FROM orders WHERE user_id = 123  -- Filtered to 100 rows
)
SELECT * FROM user_orders;
```

**2. Index Source Tables:**
```sql
-- Ensure source tables are indexed
CREATE INDEX idx_orders_user_id ON orders(user_id);

WITH user_stats AS (
    SELECT user_id, COUNT(*) AS cnt
    FROM orders  -- Uses index
    GROUP BY user_id
)
SELECT * FROM user_stats;
```

**3. Use Temporary Tables for Complex CTEs:**
```sql
-- For very complex CTEs used multiple times
CREATE TEMPORARY TABLE complex_stats AS
SELECT ...  -- Complex calculation
FROM ...;

CREATE INDEX ... ON complex_stats(...);

-- Use multiple times efficiently
SELECT * FROM complex_stats WHERE ...;
```

**Real-World Example: Data Pipeline**

**Scenario:** E-commerce analytics - calculate user lifetime value with multiple steps

**Without CTEs (Hard to Read):**
```sql
SELECT 
    u.id,
    u.name,
    order_stats.order_count,
    order_stats.total_spent,
    order_stats.avg_order_value,
    CASE
        WHEN order_stats.total_spent > 5000 THEN 'VIP'
        WHEN order_stats.total_spent > 1000 THEN 'Gold'
        ELSE 'Regular'
    END AS tier,
    order_stats.total_spent / NULLIF(order_stats.order_count, 0) AS lifetime_value
FROM users u
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) AS order_count,
        SUM(total) AS total_spent,
        AVG(total) AS avg_order_value
    FROM orders
    GROUP BY user_id
) order_stats ON u.id = order_stats.user_id
WHERE order_stats.total_spent > (
    SELECT AVG(total_spent)
    FROM (
        SELECT SUM(total) AS total_spent
        FROM orders
        GROUP BY user_id
    ) user_totals
)
ORDER BY order_stats.total_spent DESC;
-- Very hard to read and maintain
```

**With CTEs (Clear and Maintainable):**
```sql
WITH user_order_stats AS (
    SELECT 
        user_id,
        COUNT(*) AS order_count,
        SUM(total) AS total_spent,
        AVG(total) AS avg_order_value
    FROM orders
    GROUP BY user_id
),
average_user_spending AS (
    SELECT AVG(total_spent) AS avg_spent
    FROM user_order_stats
),
user_tiers AS (
    SELECT 
        u.id,
        u.name,
        COALESCE(stats.order_count, 0) AS order_count,
        COALESCE(stats.total_spent, 0) AS total_spent,
        COALESCE(stats.avg_order_value, 0) AS avg_order_value,
        CASE
            WHEN COALESCE(stats.total_spent, 0) > 5000 THEN 'VIP'
            WHEN COALESCE(stats.total_spent, 0) > 1000 THEN 'Gold'
            ELSE 'Regular'
        END AS tier,
        COALESCE(stats.total_spent, 0) / 
            NULLIF(COALESCE(stats.order_count, 0), 0) AS lifetime_value
    FROM users u
    LEFT JOIN user_order_stats stats ON u.id = stats.user_id
)
SELECT *
FROM user_tiers
CROSS JOIN average_user_spending avg
WHERE total_spent > avg.avg_spent
ORDER BY total_spent DESC;
-- Clear, step-by-step, easy to understand and maintain
```

**Benefits:**
- **Readability**: Each step is clear
- **Maintainability**: Easy to modify individual steps
- **Testability**: Can test each CTE separately
- **Documentation**: CTE names document intent

**System Design Consideration**: CTEs are valuable for:
1. **Code Quality**: Improving query readability and maintainability
2. **Complex Queries**: Breaking down complex logic into understandable steps
3. **Development**: Easier to write, test, and debug
4. **Team Collaboration**: More understandable for team members

CTEs are a powerful tool for writing maintainable SQL. They improve readability significantly compared to nested subqueries, enable code reuse within queries, and make complex queries easier to understand and maintain. While performance characteristics vary by database, CTEs are generally a good choice for complex queries where readability and maintainability are important.

---

### Q2: Explain recursive CTEs and how they work. Provide a detailed example traversing a hierarchical structure (like an employee hierarchy or category tree), and explain the execution mechanism, termination conditions, and performance considerations for recursive CTEs.

**Answer:**

**Recursive CTE Definition:**

A recursive CTE is a CTE that references itself, enabling queries that traverse hierarchical or tree-structured data. Recursive CTEs consist of two parts: a base case (anchor) that provides the starting point, and a recursive case that references the CTE itself to build upon previous results.

**Recursive CTE Structure:**

```sql
WITH RECURSIVE cte_name AS (
    -- Base case (anchor): Initial rows
    SELECT ...  -- Starting point
    
    UNION ALL  -- Must use UNION ALL (not UNION)
    
    -- Recursive case: References cte_name
    SELECT ...
    FROM cte_name  -- References itself!
    WHERE condition  -- Termination condition
)
SELECT * FROM cte_name;
```

**How Recursive CTEs Work:**

**Execution Mechanism:**

**1. Initialization:**
- Execute base case query
- Store results in working table
- This becomes iteration 0

**2. Recursion Loop:**
- Execute recursive case using current working table
- Append new results to working table
- Repeat until recursive case returns no rows (termination)

**3. Termination:**
- When recursive case returns 0 rows, recursion stops
- Return accumulated results

**Visual Execution Flow:**

```
Iteration 0 (Base Case):
┌─────────────────┐
│ Working Table   │
│ ┌─────────────┐ │
│ │ id │ name   │ │
│ ├─────────────┤ │
│ │ 1  │ CEO    │ │ ← Base case result
│ └─────────────┘ │
└─────────────────┘
         │
         ▼
Iteration 1 (Recursive):
┌─────────────────┐
│ Working Table   │
│ ┌─────────────┐ │
│ │ id │ name   │ │
│ ├─────────────┤ │
│ │ 1  │ CEO    │ │ (from previous)
│ │ 2  │ VP Eng │ │ ← New from recursive case
│ │ 3  │ VP Sales│ │ ← New from recursive case
│ └─────────────┘ │
└─────────────────┘
         │
         ▼
Iteration 2 (Recursive):
┌─────────────────┐
│ Working Table   │
│ ┌─────────────┐ │
│ │ id │ name   │ │
│ ├─────────────┤ │
│ │ 1  │ CEO    │ │ (from previous)
│ │ 2  │ VP Eng │ │ (from previous)
│ │ 3  │ VP Sales│ │ (from previous)
│ │ 4  │ Sr Eng │ │ ← New from recursive case
│ │ 5  │ Jr Eng │ │ ← New from recursive case
│ └─────────────┘ │
└─────────────────┘
         │
         ▼
Iteration 3 (Recursive):
┌─────────────────┐
│ Working Table   │
│ ┌─────────────┐ │
│ │ ... (all previous) │
│ │ (no new rows) │ │ ← Recursive case returns 0 rows
│ └─────────────┘ │
└─────────────────┘
         │
         ▼
Termination: Return all accumulated rows
```

**Detailed Example: Employee Hierarchy**

**Schema:**
```sql
CREATE TABLE employees (
    id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    manager_id INT,
    title VARCHAR(100),
    FOREIGN KEY (manager_id) REFERENCES employees(id)
);

-- Sample Data:
INSERT INTO employees VALUES
(1, 'CEO', NULL, 'Chief Executive Officer'),
(2, 'VP Engineering', 1, 'Vice President'),
(3, 'VP Sales', 1, 'Vice President'),
(4, 'Senior Engineer', 2, 'Senior'),
(5, 'Junior Engineer', 2, 'Junior'),
(6, 'Sales Manager', 3, 'Manager'),
(7, 'Sales Rep', 6, 'Representative');
```

**Hierarchy Structure:**
```
                    CEO (1)
                   /      \
          VP Engineering (2)  VP Sales (3)
                 /              \
        Senior Eng (4)    Sales Manager (6)
        Junior Eng (5)         |
                          Sales Rep (7)
```

**Recursive CTE to Traverse Hierarchy:**

```sql
WITH RECURSIVE employee_hierarchy AS (
    -- Base case: Start with CEO (no manager)
    SELECT 
        id,
        name,
        manager_id,
        title,
        0 AS level,                    -- Depth level
        ARRAY[id] AS path,             -- Path from root
        name AS hierarchy_path         -- Human-readable path
    FROM employees
    WHERE manager_id IS NULL  -- Root of hierarchy
    
    UNION ALL
    
    -- Recursive case: Find direct reports
    SELECT 
        e.id,
        e.name,
        e.manager_id,
        e.title,
        eh.level + 1,                  -- Increment level
        eh.path || e.id,               -- Add to path
        eh.hierarchy_path || ' > ' || e.name  -- Build path string
    FROM employees e
    JOIN employee_hierarchy eh ON e.manager_id = eh.id
    WHERE NOT (e.id = ANY(eh.path))    -- Prevent cycles
)
SELECT 
    id,
    name,
    title,
    level,
    hierarchy_path
FROM employee_hierarchy
ORDER BY path;  -- Order by hierarchy path
```

**Execution Step-by-Step:**

**Iteration 0 (Base Case):**
```sql
SELECT id, name, manager_id, title, 0 AS level, ARRAY[id] AS path, name AS hierarchy_path
FROM employees
WHERE manager_id IS NULL;
-- Returns: CEO (id=1)
```

**Result:**
```
┌────┬─────┬─────────────┬───────┬──────┬──────────┐
│ id │name │ manager_id  │ level │ path │hierarchy │
├────┼─────┼─────────────┼───────┼──────┼──────────┤
│ 1  │ CEO │ NULL        │ 0     │ {1}  │ CEO      │
└────┴─────┴─────────────┴───────┴──────┴──────────┘
```

**Iteration 1 (Recursive):**
```sql
SELECT e.id, e.name, e.manager_id, e.title, eh.level + 1, ...
FROM employees e
JOIN employee_hierarchy eh ON e.manager_id = eh.id
WHERE NOT (e.id = ANY(eh.path));
-- Uses iteration 0 result (CEO)
-- Finds: VP Engineering (manager_id=1), VP Sales (manager_id=1)
```

**Result:**
```
┌────┬──────────────┬─────────────┬───────┬──────┬──────────────────┐
│ id │ name         │ manager_id  │ level │ path │ hierarchy        │
├────┼──────────────┼─────────────┼───────┼──────┼──────────────────┤
│ 1  │ CEO          │ NULL        │ 0     │ {1}  │ CEO              │
│ 2  │ VP Engineering│ 1         │ 1     │ {1,2}│ CEO > VP Eng     │
│ 3  │ VP Sales     │ 1           │ 1     │ {1,3}│ CEO > VP Sales   │
└────┴──────────────┴─────────────┴───────┴──────┴──────────────────┘
```

**Iteration 2 (Recursive):**
```sql
-- Uses iteration 1 results
-- Finds: Senior Engineer (manager_id=2), Junior Engineer (manager_id=2), Sales Manager (manager_id=3)
```

**Result:**
```
┌────┬──────────────┬─────────────┬───────┬────────┬──────────────────────────┐
│ id │ name         │ manager_id  │ level │ path   │ hierarchy                │
├────┼──────────────┼─────────────┼───────┼────────┼──────────────────────────┤
│ 1  │ CEO          │ NULL        │ 0     │ {1}    │ CEO                      │
│ 2  │ VP Engineering│ 1           │ 1     │ {1,2}  │ CEO > VP Engineering     │
│ 3  │ VP Sales     │ 1           │ 1     │ {1,3}  │ CEO > VP Sales           │
│ 4  │ Senior Eng   │ 2           │ 2     │ {1,2,4}│ CEO > VP Eng > Sr Eng    │
│ 5  │ Junior Eng   │ 2           │ 2     │ {1,2,5}│ CEO > VP Eng > Jr Eng    │
│ 6  │ Sales Manager│ 3           │ 2     │ {1,3,6}│ CEO > VP Sales > Mgr     │
└────┴──────────────┴─────────────┴───────┴────────┴──────────────────────────┘
```

**Iteration 3 (Recursive):**
```sql
-- Finds: Sales Rep (manager_id=6)
```

**Final Result:**
```
┌────┬──────────────┬───────┬────────┬─────────────────────────────────┐
│ id │ name         │ level │ path   │ hierarchy                        │
├────┼──────────────┼───────┼────────┼─────────────────────────────────┤
│ 1  │ CEO          │ 0     │ {1}    │ CEO                              │
│ 2  │ VP Engineering│ 1     │ {1,2}  │ CEO > VP Engineering             │
│ 3  │ VP Sales     │ 1     │ {1,3}  │ CEO > VP Sales                   │
│ 4  │ Senior Eng   │ 2     │ {1,2,4}│ CEO > VP Engineering > Sr Eng    │
│ 5  │ Junior Eng   │ 2     │ {1,2,5}│ CEO > VP Engineering > Jr Eng    │
│ 6  │ Sales Manager│ 2     │ {1,3,6}│ CEO > VP Sales > Sales Manager   │
│ 7  │ Sales Rep    │ 3     │ {1,3,6,7}│ CEO > VP Sales > Mgr > Rep   │
└────┴──────────────┴───────┴────────┴─────────────────────────────────┘
```

**Termination Conditions:**

**1. Natural Termination:**

Recursion stops when the recursive case returns no rows:

```sql
WITH RECURSIVE hierarchy AS (
    SELECT id, manager_id FROM employees WHERE id = 1
    UNION ALL
    SELECT e.id, e.manager_id
    FROM employees e
    JOIN hierarchy h ON e.manager_id = h.id
    -- Stops when no employees have manager_id matching any h.id
    -- i.e., when we reach leaf nodes (employees with no reports)
)
SELECT * FROM hierarchy;
```

**2. Explicit Depth Limit:**

Prevent infinite recursion with depth check:

```sql
WITH RECURSIVE hierarchy AS (
    SELECT id, name, manager_id, 0 AS depth
    FROM employees WHERE id = 1
    UNION ALL
    SELECT e.id, e.name, e.manager_id, h.depth + 1
    FROM employees e
    JOIN hierarchy h ON e.manager_id = h.id
    WHERE h.depth < 10  -- Maximum depth limit
)
SELECT * FROM hierarchy;
```

**3. Cycle Prevention:**

Prevent infinite loops in cyclic data:

```sql
WITH RECURSIVE hierarchy AS (
    SELECT id, name, manager_id, ARRAY[id] AS path
    FROM employees WHERE id = 1
    UNION ALL
    SELECT e.id, e.name, e.manager_id, h.path || e.id
    FROM employees e
    JOIN hierarchy h ON e.manager_id = h.id
    WHERE NOT (e.id = ANY(h.path))  -- Prevent cycles
)
SELECT * FROM hierarchy;
```

**Performance Considerations:**

**1. Depth of Recursion:**

**Shallow Hierarchy (Good Performance):**
```
CEO
├─ VP
   ├─ Manager
      └─ Employee
-- 4 levels, ~10 iterations, fast
```

**Deep Hierarchy (Slower):**
```
Level 1
└─ Level 2
   └─ Level 3
      └─ ... (100 levels)
-- 100 iterations, slower
```

**2. Breadth of Tree:**

**Narrow Tree (Good Performance):**
```
Root
└─ Child 1
   └─ Child 2
      └─ Child 3
-- Linear, one path, fast
```

**Wide Tree (Slower):**
```
Root
├─ Child 1
│  ├─ Grandchild 1
│  └─ Grandchild 2
├─ Child 2
│  ├─ Grandchild 3
│  └─ Grandchild 4
└─ Child 3
   └─ ... (1000 children)
-- Many paths, more iterations, slower
```

**3. Index Usage:**

**With Index (Fast):**
```sql
CREATE INDEX idx_employees_manager_id ON employees(manager_id);

WITH RECURSIVE hierarchy AS (
    ...
    JOIN hierarchy h ON e.manager_id = h.id
    -- Uses index on manager_id: O(log n) per lookup
)
```

**Without Index (Slow):**
```sql
-- No index on manager_id
-- Sequential scan for each iteration: O(n) per lookup
-- Very slow for large tables
```

**4. Materialization:**

Some databases materialize recursive CTEs, which can be memory-intensive:

```sql
-- PostgreSQL: May materialize entire result set
WITH RECURSIVE large_tree AS (
    ...
)
SELECT * FROM large_tree;
-- Entire tree stored in memory
-- Can be large for wide/deep trees
```

**Optimization Tips:**

**1. Filter Early:**
```sql
-- ❌ Bad: Process entire tree
WITH RECURSIVE all_descendants AS (
    SELECT id FROM employees WHERE id = 1
    UNION ALL
    SELECT e.id FROM employees e
    JOIN all_descendants ad ON e.manager_id = ad.id
)
SELECT * FROM all_descendants WHERE department = 'Engineering';

-- ✅ Good: Filter in recursive case
WITH RECURSIVE engineering_descendants AS (
    SELECT id FROM employees 
    WHERE id = 1 AND department = 'Engineering'
    UNION ALL
    SELECT e.id FROM employees e
    JOIN engineering_descendants ed ON e.manager_id = ed.id
    WHERE e.department = 'Engineering'  -- Filter early
)
SELECT * FROM engineering_descendants;
```

**2. Use Appropriate Indexes:**
```sql
-- Index on foreign key used in join
CREATE INDEX idx_employees_manager_id ON employees(manager_id);

-- Makes recursive joins fast
```

**3. Limit Depth When Possible:**
```sql
-- If you only need first 3 levels
WITH RECURSIVE hierarchy AS (
    ...
    WHERE depth < 3  -- Stop early
)
```

**System Design Consideration**: Recursive CTEs are powerful for:
1. **Hierarchical Data**: Employee org charts, category trees, folder structures
2. **Graph Traversal**: Finding paths, connections
3. **Data Processing**: Step-by-step transformations
4. **Maintainability**: Cleaner than multiple queries or application-level recursion

Recursive CTEs are an elegant solution for hierarchical data traversal. They eliminate the need for application-level recursion and multiple database round trips. However, they can be performance-intensive for very deep or wide hierarchies, so proper indexing and depth limits are important. Understanding the execution mechanism and termination conditions helps write efficient recursive CTEs.

