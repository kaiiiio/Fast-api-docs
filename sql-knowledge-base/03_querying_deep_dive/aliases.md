# Aliases (AS): Renaming Columns and Tables

Aliases provide temporary names for columns and tables, making queries more readable and allowing you to reference them in other parts of the query.

## Column Aliases

### Basic Syntax

```sql
SELECT column_name AS alias_name
FROM table_name;
```

### Basic Example

```sql
-- Rename column in result
SELECT 
    id,
    name AS user_name,
    email AS user_email
FROM users;
```

### Without AS Keyword

```sql
-- AS is optional
SELECT 
    id,
    name user_name,
    email user_email
FROM users;
```

## Table Aliases

### Basic Syntax

```sql
SELECT alias.column_name
FROM table_name AS alias;
```

### Basic Example

```sql
-- Short table alias
SELECT 
    u.id,
    u.name,
    u.email
FROM users AS u;
```

### Without AS Keyword

```sql
-- AS is optional for tables too
SELECT 
    u.id,
    u.name,
    u.email
FROM users u;
```

## Real-World Examples

### Example 1: Readable Column Names

```sql
-- More readable column names
SELECT 
    id AS user_id,
    name AS full_name,
    email AS email_address,
    created_at AS registration_date
FROM users;
```

### Example 2: JOINs with Aliases

```sql
-- Aliases make JOINs cleaner
SELECT 
    u.id AS user_id,
    u.name AS user_name,
    o.id AS order_id,
    o.total AS order_total
FROM users u
JOIN orders o ON u.id = o.user_id;
```

### Example 3: Calculated Columns

```sql
-- Alias for calculated values
SELECT 
    id,
    name,
    price,
    (price * 0.1) AS discount,
    (price * 0.9) AS final_price
FROM products;
```

### Example 4: Aggregate Functions

```sql
-- Alias for aggregates
SELECT 
    user_id,
    COUNT(*) AS order_count,
    SUM(total) AS total_spent,
    AVG(total) AS avg_order_value
FROM orders
GROUP BY user_id;
```

## Aliases in ORDER BY

### Use Aliases in ORDER BY

```sql
-- Use alias in ORDER BY
SELECT 
    user_id,
    SUM(total) AS total_spent
FROM orders
GROUP BY user_id
ORDER BY total_spent DESC;  -- Use alias
```

## Aliases in HAVING

### Use Aliases in HAVING (Some Databases)

```sql
-- PostgreSQL: Can use alias in HAVING
SELECT 
    user_id,
    COUNT(*) AS order_count
FROM orders
GROUP BY user_id
HAVING order_count > 5;  -- Use alias (PostgreSQL)

-- MySQL: Must repeat expression
SELECT 
    user_id,
    COUNT(*) AS order_count
FROM orders
GROUP BY user_id
HAVING COUNT(*) > 5;  -- Can't use alias in MySQL
```

## Common Patterns

### Pattern 1: Self-Join

```sql
-- Self-join requires aliases
SELECT 
    e.name AS employee_name,
    m.name AS manager_name
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.id;
```

### Pattern 2: Subqueries

```sql
-- Alias for subquery
SELECT 
    u.name,
    order_stats.order_count
FROM users u
JOIN (
    SELECT user_id, COUNT(*) AS order_count
    FROM orders
    GROUP BY user_id
) AS order_stats ON u.id = order_stats.user_id;
```

### Pattern 3: Complex Calculations

```sql
-- Multiple aliases for clarity
SELECT 
    id,
    name,
    price,
    (price * 0.1) AS tax,
    (price * 1.1) AS price_with_tax,
    (price * 1.1 - price) AS tax_amount
FROM products;
```

## Best Practices

1. **Use Descriptive Names**: Make aliases meaningful
2. **Be Consistent**: Use same naming convention
3. **Short but Clear**: Balance brevity and clarity
4. **Use in JOINs**: Essential for readability
5. **Document Complex Aliases**: Comment when needed

## Common Mistakes

### ❌ Using Alias in WHERE

```sql
-- ❌ Error: Can't use alias in WHERE
SELECT 
    name AS user_name
FROM users
WHERE user_name = 'John';  -- Error!

-- ✅ Correct: Use original column name
SELECT 
    name AS user_name
FROM users
WHERE name = 'John';
```

### ❌ Ambiguous Aliases

```sql
-- ❌ Bad: Unclear alias
SELECT id AS i FROM users;

-- ✅ Good: Descriptive alias
SELECT id AS user_id FROM users;
```

## Summary

**Aliases Essentials:**

1. **Purpose**: Rename columns and tables
2. **Syntax**: `column AS alias` or `table AS alias`
3. **AS Optional**: Can omit AS keyword
4. **Use Cases**: Readability, JOINs, calculated columns
5. **Limitations**: Can't use in WHERE (use in ORDER BY)

**Key Takeaway:**
Aliases make queries more readable by providing temporary names. Use them for columns, tables, and calculated values. Essential for JOINs and complex queries. Remember you can't use column aliases in WHERE clauses.

**Common Use Cases:**
- Column names: `SELECT name AS user_name`
- Table shortcuts: `FROM users u`
- Calculations: `SELECT price * 0.1 AS discount`
- Aggregates: `SELECT COUNT(*) AS total`

**Next Steps:**
- Learn [JOINs](../04_joins/inner_join.md) where aliases are essential
- Study [Subqueries](../06_advanced_querying/subqueries.md) for nested queries
- Master [Aggregate Functions](../05_aggregations_grouping/group_by.md) for summaries

