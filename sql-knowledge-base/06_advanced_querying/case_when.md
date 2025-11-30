# CASE WHEN: Conditional Logic in SQL

CASE WHEN provides conditional logic in SQL, similar to if-else statements. It's essential for data transformation, categorization, and conditional calculations.

## Basic CASE Syntax

```sql
CASE
    WHEN condition1 THEN result1
    WHEN condition2 THEN result2
    ELSE result3
END
```

## Simple CASE

### Basic Example

```sql
-- Categorize orders by status
SELECT 
    id,
    total,
    CASE status
        WHEN 'pending' THEN 'Waiting'
        WHEN 'processing' THEN 'In Progress'
        WHEN 'completed' THEN 'Done'
        ELSE 'Unknown'
    END AS status_label
FROM orders;
```

## Searched CASE

### Multiple Conditions

```sql
-- Categorize by price range
SELECT 
    id,
    name,
    price,
    CASE
        WHEN price < 50 THEN 'Budget'
        WHEN price BETWEEN 50 AND 100 THEN 'Mid-range'
        WHEN price > 100 THEN 'Premium'
        ELSE 'Unknown'
    END AS price_category
FROM products;
```

## Real-World Examples

### Example 1: User Status Labels

```sql
-- Convert status codes to labels
SELECT 
    id,
    name,
    CASE
        WHEN is_active = true AND is_email_verified = true THEN 'Active Verified'
        WHEN is_active = true THEN 'Active Unverified'
        WHEN is_active = false THEN 'Inactive'
        ELSE 'Unknown'
    END AS user_status
FROM users;
```

### Example 2: Order Priority

```sql
-- Assign priority based on total
SELECT 
    id,
    total,
    CASE
        WHEN total > 1000 THEN 'High Priority'
        WHEN total > 500 THEN 'Medium Priority'
        ELSE 'Low Priority'
    END AS priority
FROM orders;
```

### Example 3: Age Groups

```sql
-- Categorize users by age
SELECT 
    id,
    name,
    age,
    CASE
        WHEN age < 18 THEN 'Minor'
        WHEN age BETWEEN 18 AND 65 THEN 'Adult'
        WHEN age > 65 THEN 'Senior'
        ELSE 'Unknown'
    END AS age_group
FROM users;
```

## CASE in SELECT

### Conditional Columns

```sql
-- Conditional column values
SELECT 
    id,
    name,
    CASE
        WHEN stock_quantity > 100 THEN 'In Stock'
        WHEN stock_quantity > 0 THEN 'Low Stock'
        ELSE 'Out of Stock'
    END AS stock_status
FROM products;
```

## CASE in WHERE

### Conditional Filtering

```sql
-- Filter based on condition
SELECT * FROM users
WHERE 
    CASE
        WHEN role = 'admin' THEN is_active = true
        WHEN role = 'user' THEN is_email_verified = true
        ELSE false
    END;
```

## CASE in ORDER BY

### Custom Sorting

```sql
-- Custom sort order
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

## CASE with Aggregates

### Conditional Aggregation

```sql
-- Count by condition
SELECT 
    COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_count,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_count,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled_count
FROM orders;
```

### Sum with Conditions

```sql
-- Sum with conditions
SELECT 
    SUM(CASE WHEN status = 'completed' THEN total ELSE 0 END) AS completed_revenue,
    SUM(CASE WHEN status = 'pending' THEN total ELSE 0 END) AS pending_revenue
FROM orders;
```

## Nested CASE

### Complex Logic

```sql
-- Nested CASE for complex logic
SELECT 
    id,
    name,
    price,
    CASE
        WHEN category_id = 1 THEN
            CASE
                WHEN price > 100 THEN 'Premium Electronics'
                ELSE 'Standard Electronics'
            END
        WHEN category_id = 2 THEN
            CASE
                WHEN price > 50 THEN 'Premium Clothing'
                ELSE 'Standard Clothing'
            END
        ELSE 'Other'
    END AS category_label
FROM products;
```

## Real-World Patterns

### Pattern 1: Status Mapping

```sql
-- Map status codes to readable labels
SELECT 
    id,
    CASE status
        WHEN 0 THEN 'Pending'
        WHEN 1 THEN 'Active'
        WHEN 2 THEN 'Completed'
        WHEN 3 THEN 'Cancelled'
        ELSE 'Unknown'
    END AS status_name
FROM orders;
```

### Pattern 2: Tier Classification

```sql
-- Classify customers by spending
SELECT 
    user_id,
    SUM(total) AS total_spent,
    CASE
        WHEN SUM(total) > 1000 THEN 'Gold'
        WHEN SUM(total) > 500 THEN 'Silver'
        WHEN SUM(total) > 100 THEN 'Bronze'
        ELSE 'Regular'
    END AS customer_tier
FROM orders
GROUP BY user_id;
```

### Pattern 3: Conditional Calculations

```sql
-- Calculate discount based on quantity
SELECT 
    product_id,
    quantity,
    price,
    CASE
        WHEN quantity >= 10 THEN price * 0.9  -- 10% discount
        WHEN quantity >= 5 THEN price * 0.95  -- 5% discount
        ELSE price
    END AS final_price
FROM order_items;
```

## Performance Considerations

### CASE vs Multiple Queries

```sql
-- ✅ Good: Single query with CASE
SELECT 
    COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending
FROM orders;

-- ❌ Less efficient: Multiple queries
SELECT COUNT(*) FROM orders WHERE status = 'completed';
SELECT COUNT(*) FROM orders WHERE status = 'pending';
```

## Best Practices

1. **Use ELSE**: Always include ELSE for completeness
2. **Order Matters**: First matching condition wins
3. **Be Specific**: Most specific conditions first
4. **Keep Simple**: Avoid deeply nested CASE
5. **Document Logic**: Comment complex CASE statements

## Common Mistakes

### ❌ Missing ELSE

```sql
-- ❌ Bad: No ELSE clause
SELECT 
    CASE status
        WHEN 'pending' THEN 'Waiting'
        WHEN 'completed' THEN 'Done'
    END AS label
FROM orders;
-- Returns NULL for other statuses

-- ✅ Good: Include ELSE
SELECT 
    CASE status
        WHEN 'pending' THEN 'Waiting'
        WHEN 'completed' THEN 'Done'
        ELSE 'Unknown'
    END AS label
FROM orders;
```

### ❌ Wrong Order

```sql
-- ❌ Bad: General condition first
SELECT 
    CASE
        WHEN price > 0 THEN 'Has Price'
        WHEN price > 100 THEN 'Expensive'  -- Never reached!
        ELSE 'Free'
    END
FROM products;

-- ✅ Good: Specific conditions first
SELECT 
    CASE
        WHEN price > 100 THEN 'Expensive'
        WHEN price > 0 THEN 'Has Price'
        ELSE 'Free'
    END
FROM products;
```

## Summary

**CASE WHEN Essentials:**

1. **Purpose**: Conditional logic in SQL
2. **Syntax**: `CASE WHEN condition THEN result ELSE default END`
3. **Use Cases**: Categorization, conditional calculations, custom sorting
4. **Performance**: Single query vs multiple queries
5. **Best Practice**: Always include ELSE, order conditions correctly

**Key Takeaway:**
CASE WHEN provides conditional logic in SQL. Use it for categorization, conditional calculations, and custom sorting. Always include ELSE for completeness, and order conditions from most specific to least specific.

**Common Use Cases:**
- Status labels: `CASE status WHEN 'pending' THEN 'Waiting'`
- Categories: `CASE WHEN price > 100 THEN 'Premium'`
- Conditional counts: `COUNT(CASE WHEN ... THEN 1 END)`
- Custom sorting: `ORDER BY CASE ... END`

**Next Steps:**
- Learn [Aggregate Functions](../05_aggregations_grouping/aggregate_functions.md) for summaries
- Study [GROUP BY](../05_aggregations_grouping/group_by.md) for grouping
- Master [Window Functions](../05_aggregations_grouping/window_functions.md) for advanced analytics

