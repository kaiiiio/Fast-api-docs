# Self Join: Joining a Table to Itself

Self join joins a table to itself, useful for hierarchical data, comparing rows within the same table, or finding relationships within the same table.

## What is Self Join?

**Self join** is joining a table to itself. You use table aliases to distinguish between the two instances of the same table.

## Basic Syntax

```sql
SELECT alias1.column, alias2.column
FROM table_name alias1
JOIN table_name alias2 ON alias1.column = alias2.column;
```

## Real-World Examples

### Example 1: Employee-Manager Hierarchy

```sql
-- Employees and their managers
SELECT 
    e.id AS employee_id,
    e.name AS employee_name,
    m.id AS manager_id,
    m.name AS manager_name
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.id;
```

**Result:**
```
┌─────────────┬──────────────┬────────────┬──────────────┐
│ employee_id │ employee_name│ manager_id │ manager_name │
├─────────────┼──────────────┼────────────┼──────────────┤
│ 1           │ John         │ NULL       │ NULL         │ ← CEO
│ 2           │ Jane         │ 1          │ John         │ ← Reports to John
│ 3           │ Bob          │ 1          │ John         │ ← Reports to John
│ 4           │ Alice        │ 2          │ Jane         │ ← Reports to Jane
└─────────────┴──────────────┴────────────┴──────────────┘
```

### Example 2: Find Pairs

```sql
-- Find users who share the same city
SELECT 
    u1.id AS user1_id,
    u1.name AS user1_name,
    u2.id AS user2_id,
    u2.name AS user2_name,
    u1.city
FROM users u1
JOIN users u2 ON u1.city = u2.city
WHERE u1.id < u2.id;  -- Avoid duplicates and self-pairs
```

### Example 3: Compare Rows

```sql
-- Products with price changes
SELECT 
    p1.id,
    p1.name,
    p1.price AS old_price,
    p2.price AS new_price,
    p2.price - p1.price AS price_change
FROM products p1
JOIN products p2 ON p1.id = p2.id
WHERE p1.updated_at < p2.updated_at
  AND p1.price != p2.price;
```

### Example 4: Hierarchical Categories

```sql
-- Categories and their parent categories
SELECT 
    c.id AS category_id,
    c.name AS category_name,
    p.id AS parent_id,
    p.name AS parent_name
FROM categories c
LEFT JOIN categories p ON c.parent_id = p.id;
```

## Common Patterns

### Pattern 1: Manager Hierarchy

```sql
-- Multi-level manager hierarchy
WITH RECURSIVE manager_hierarchy AS (
    -- Base case: Top-level managers
    SELECT 
        id,
        name,
        manager_id,
        1 AS level
    FROM employees
    WHERE manager_id IS NULL
    
    UNION ALL
    
    -- Recursive case: Employees reporting to managers
    SELECT 
        e.id,
        e.name,
        e.manager_id,
        mh.level + 1
    FROM employees e
    JOIN manager_hierarchy mh ON e.manager_id = mh.id
)
SELECT * FROM manager_hierarchy;
```

### Pattern 2: Find Duplicates

```sql
-- Find duplicate emails
SELECT 
    u1.id,
    u1.email,
    u1.name
FROM users u1
JOIN users u2 ON u1.email = u2.email
WHERE u1.id < u2.id;  -- Avoid duplicates
```

### Pattern 3: Compare Adjacent Rows

```sql
-- Compare consecutive orders
SELECT 
    o1.id AS order1_id,
    o1.total AS order1_total,
    o2.id AS order2_id,
    o2.total AS order2_total,
    o2.total - o1.total AS difference
FROM orders o1
JOIN orders o2 ON o1.user_id = o2.user_id
WHERE o2.created_at = (
    SELECT MIN(created_at)
    FROM orders
    WHERE user_id = o1.user_id
      AND created_at > o1.created_at
);
```

## Performance Considerations

### Index Join Columns

```sql
-- Create index for self-join
CREATE INDEX idx_employees_manager ON employees(manager_id);

-- Query uses index
SELECT 
    e.name,
    m.name AS manager_name
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.id;
```

## Best Practices

1. **Use Aliases**: Always use table aliases
2. **Avoid Duplicates**: Use `WHERE alias1.id < alias2.id`
3. **Index Join Columns**: For performance
4. **Use LEFT JOIN**: For optional relationships
5. **Consider Recursive CTEs**: For hierarchies

## Common Mistakes

### ❌ Forgetting Aliases

```sql
-- ❌ Error: Ambiguous column names
SELECT id, name, manager_id
FROM employees e
JOIN employees m ON e.manager_id = m.id;

-- ✅ Correct: Use aliases
SELECT 
    e.id,
    e.name,
    m.name AS manager_name
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.id;
```

### ❌ Creating Duplicates

```sql
-- ❌ Bad: Creates duplicate pairs
SELECT 
    u1.id,
    u2.id
FROM users u1
JOIN users u2 ON u1.city = u2.city;

-- ✅ Good: Avoid duplicates
SELECT 
    u1.id,
    u2.id
FROM users u1
JOIN users u2 ON u1.city = u2.city
WHERE u1.id < u2.id;
```

## Summary

**Self Join Essentials:**

1. **Purpose**: Join table to itself
2. **Syntax**: Use aliases to distinguish instances
3. **Use Cases**: Hierarchies, comparisons, relationships
4. **Performance**: Index join columns
5. **Best Practice**: Use aliases, avoid duplicates

**Key Takeaway:**
Self join joins a table to itself using aliases. Essential for hierarchical data (employees-managers), finding pairs, and comparing rows. Always use table aliases and be careful to avoid duplicate results.

**Common Use Cases:**
- Employee-manager relationships
- Hierarchical categories
- Finding pairs/duplicates
- Comparing rows in same table

**Next Steps:**
- Learn [INNER JOIN](inner_join.md) for related tables
- Study [Recursive CTEs](../06_advanced_querying/ctes.md) for hierarchies
- Master [Performance Optimization](../10_performance_optimization/) for tuning

