# INNER JOIN: Combining Data from Multiple Tables

INNER JOIN is the most common type of join. It returns only rows where there's a match in both tables based on the join condition.

## Understanding INNER JOIN

**What it does:** Returns rows where the join condition is satisfied in BOTH tables. Rows without a match are excluded.

**Visual Representation:**
```
Table A          Table B          INNER JOIN Result
┌────┬────┐     ┌────┬────┐     ┌────┬────┬────┬────┐
│ id │val │     │ id │val │     │A.id│A.val│B.id│B.val│
├────┼────┤     ├────┼────┤     ├────┼────┼────┼────┤
│ 1  │ A  │     │ 1  │ X  │────→│ 1  │ A  │ 1  │ X  │
│ 2  │ B  │     │ 3  │ Y  │     │ 3  │ C  │ 3  │ Y  │
│ 3  │ C  │     │ 4  │ Z  │     └────┴────┴────┴────┘
└────┴────┘     └────┴────┘
                (id=2 has no match, excluded)
                (id=4 has no match, excluded)
```

## Basic INNER JOIN Syntax

```sql
SELECT columns
FROM table1
INNER JOIN table2 ON table1.column = table2.column;
```

**The `INNER` keyword is optional:**
```sql
-- These are equivalent:
SELECT * FROM users INNER JOIN orders ON users.id = orders.user_id;
SELECT * FROM users JOIN orders ON users.id = orders.user_id;
```

## Real-World Example: Users and Orders

### Database Schema

```sql
-- Users table
CREATE TABLE users (
    id INT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL
);

-- Orders table
CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id INT NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Sample Data

```sql
-- Users
┌────┬──────────────────┬──────────────┐
│ id │ email            │ name         │
├────┼──────────────────┼──────────────┤
│ 1  │ john@example.com │ John Doe     │
│ 2  │ jane@example.com │ Jane Smith   │
│ 3  │ bob@example.com  │ Bob Johnson  │
└────┴──────────────────┴──────────────┘

-- Orders
┌────┬─────────┬────────┬─────────────────────┐
│ id │ user_id │ total  │ created_at          │
├────┼─────────┼────────┼─────────────────────┤
│ 1  │ 1       │ 99.99  │ 2024-01-15 10:00:00 │
│ 2  │ 1       │ 149.99 │ 2024-01-20 14:30:00 │
│ 3  │ 2       │ 79.99  │ 2024-01-18 09:15:00 │
└────┴─────────┴────────┴─────────────────────┘
```

### Basic INNER JOIN Query

```sql
-- Get users with their orders
SELECT 
    u.id AS user_id,
    u.name AS user_name,
    u.email,
    o.id AS order_id,
    o.total,
    o.created_at AS order_date
FROM users u
INNER JOIN orders o ON u.id = o.user_id;
```

**Result:**
```
┌─────────┬──────────────┬──────────────────┬──────────┬────────┬─────────────────────┐
│ user_id │ user_name    │ email            │ order_id │ total  │ order_date          │
├─────────┼──────────────┼──────────────────┼──────────┼────────┼─────────────────────┤
│ 1       │ John Doe     │ john@example.com │ 1        │ 99.99  │ 2024-01-15 10:00:00 │
│ 1       │ John Doe     │ john@example.com │ 2        │ 149.99 │ 2024-01-20 14:30:00 │
│ 2       │ Jane Smith   │ jane@example.com │ 3        │ 79.99  │ 2024-01-18 09:15:00 │
└─────────┴──────────────┴──────────────────┴──────────┴────────┴─────────────────────┘
```

**Note:** Bob Johnson (id=3) doesn't appear because he has no orders.

## Multiple INNER JOINs

Join three or more tables together.

### Example: Users → Orders → Order Items → Products

```sql
-- Schema
CREATE TABLE order_items (
    id INT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE products (
    id INT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    price DECIMAL(10, 2) NOT NULL
);
```

### Query with Multiple JOINs

```sql
-- Get user orders with product details
SELECT 
    u.name AS user_name,
    u.email,
    o.id AS order_id,
    o.total AS order_total,
    oi.quantity,
    p.name AS product_name,
    oi.price AS item_price,
    (oi.quantity * oi.price) AS line_total
FROM users u
INNER JOIN orders o ON u.id = o.user_id
INNER JOIN order_items oi ON o.id = oi.order_id
INNER JOIN products p ON oi.product_id = p.id
ORDER BY u.name, o.id;
```

**Result:**
```
┌──────────────┬──────────────────┬──────────┬──────────────┬──────────┬──────────────┬────────────┬────────────┐
│ user_name    │ email            │ order_id │ order_total  │ quantity │ product_name │ item_price │ line_total │
├──────────────┼──────────────────┼──────────┼──────────────┼──────────┼──────────────┼────────────┼────────────┤
│ John Doe     │ john@example.com │ 1        │ 99.99        │ 2        │ Laptop       │ 49.99      │ 99.98      │
│ John Doe     │ john@example.com │ 2        │ 149.99       │ 1        │ Mouse        │ 29.99      │ 29.99      │
│ Jane Smith   │ jane@example.com │ 3        │ 79.99        │ 1        │ Keyboard     │ 79.99      │ 79.99      │
└──────────────┴──────────────────┴──────────┴──────────────┴──────────┴──────────────┴────────────┴────────────┘
```

## INNER JOIN with WHERE Clause

Combine JOIN with filtering.

```sql
-- Get orders for active users only
SELECT 
    u.name,
    u.email,
    o.id AS order_id,
    o.total
FROM users u
INNER JOIN orders o ON u.id = o.user_id
WHERE u.is_active = true
  AND o.total > 100
ORDER BY o.total DESC;
```

## INNER JOIN with Aggregations

Use JOINs with GROUP BY for summaries.

```sql
-- Total spent per user
SELECT 
    u.id,
    u.name,
    u.email,
    COUNT(o.id) AS order_count,
    SUM(o.total) AS total_spent,
    AVG(o.total) AS average_order_value,
    MAX(o.created_at) AS last_order_date
FROM users u
INNER JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name, u.email
ORDER BY total_spent DESC;
```

**Result:**
```
┌────┬──────────────┬──────────────────┬─────────────┬─────────────┬──────────────────┬─────────────────────┐
│ id │ name         │ email            │ order_count │ total_spent │ avg_order_value  │ last_order_date     │
├────┼──────────────┼──────────────────┼─────────────┼─────────────┼──────────────────┼─────────────────────┤
│ 1  │ John Doe     │ john@example.com │ 2           │ 249.98      │ 124.99           │ 2024-01-20 14:30:00 │
│ 2  │ Jane Smith   │ jane@example.com │ 1           │ 79.99       │ 79.99            │ 2024-01-18 09:15:00 │
└────┴──────────────┴──────────────────┴─────────────┴─────────────┴──────────────────┴─────────────────────┘
```

## INNER JOIN with Different Join Conditions

### Join on Multiple Columns

```sql
-- Join on multiple conditions
SELECT 
    u.name,
    o.id AS order_id,
    oi.product_id,
    p.name AS product_name
FROM users u
INNER JOIN orders o ON u.id = o.user_id
INNER JOIN order_items oi ON o.id = oi.order_id 
    AND oi.quantity > 1  -- Additional condition
INNER JOIN products p ON oi.product_id = p.id;
```

### Join with Inequality

```sql
-- Find products that cost more than user's average order
SELECT 
    u.name,
    p.name AS product_name,
    p.price,
    AVG(o.total) AS user_avg_order
FROM users u
INNER JOIN orders o ON u.id = o.user_id
INNER JOIN order_items oi ON o.id = oi.order_id
INNER JOIN products p ON oi.product_id = p.id
GROUP BY u.id, u.name, p.id, p.name, p.price
HAVING p.price > AVG(o.total);
```

## Self-Join (INNER JOIN on Same Table)

Join a table to itself.

### Example: Employee Hierarchy

```sql
-- Schema
CREATE TABLE employees (
    id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    manager_id INT,  -- References another employee
    FOREIGN KEY (manager_id) REFERENCES employees(id)
);
```

```sql
-- Get employees with their managers
SELECT 
    e.id AS employee_id,
    e.name AS employee_name,
    m.id AS manager_id,
    m.name AS manager_name
FROM employees e
INNER JOIN employees m ON e.manager_id = m.id;
```

**Result:**
```
┌─────────────┬──────────────┬───────────┬──────────────┐
│ employee_id │ employee_name│ manager_id│ manager_name │
├─────────────┼──────────────┼───────────┼──────────────┤
│ 2           │ Jane Smith   │ 1         │ John Doe     │
│ 3           │ Bob Johnson  │ 1         │ John Doe     │
│ 4           │ Alice Brown  │ 2         │ Jane Smith   │
└─────────────┴──────────────┴───────────┴──────────────┘
```

## INNER JOIN vs WHERE (Old Syntax)

### Old Syntax (Not Recommended)

```sql
-- Old way (implicit join, not recommended)
SELECT u.name, o.total
FROM users u, orders o
WHERE u.id = o.user_id;
```

### Modern Syntax (Recommended)

```sql
-- Modern way (explicit join, recommended)
SELECT u.name, o.total
FROM users u
INNER JOIN orders o ON u.id = o.user_id;
```

**Why use explicit JOINs:**
- Clearer intent
- Easier to read
- Better for multiple joins
- Separates join logic from filtering

## Performance Considerations

### 1. **Index Foreign Keys**

```sql
-- Create indexes on join columns
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
```

### 2. **Join Order Matters**

The database optimizer usually handles this, but understanding helps:

```sql
-- Database might reorder joins for optimization
SELECT *
FROM large_table l
INNER JOIN small_table s ON l.id = s.id
INNER JOIN medium_table m ON s.id = m.id;

-- Optimizer might execute as:
-- 1. Join small_table and medium_table first (smaller result)
-- 2. Then join with large_table
```

### 3. **Select Only Needed Columns**

```sql
-- ❌ Bad: Selects all columns from all tables
SELECT * 
FROM users u
INNER JOIN orders o ON u.id = o.user_id;

-- ✅ Good: Selects only needed columns
SELECT 
    u.id,
    u.name,
    o.id AS order_id,
    o.total
FROM users u
INNER JOIN orders o ON u.id = o.user_id;
```

## Common Patterns

### Pattern 1: Find Records with Related Data

```sql
-- Users who have placed orders
SELECT DISTINCT u.*
FROM users u
INNER JOIN orders o ON u.id = o.user_id;
```

### Pattern 2: Count Related Records

```sql
-- Count orders per user
SELECT 
    u.id,
    u.name,
    COUNT(o.id) AS order_count
FROM users u
INNER JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;
```

### Pattern 3: Filter on Joined Table

```sql
-- Users who ordered in last 30 days
SELECT DISTINCT u.*
FROM users u
INNER JOIN orders o ON u.id = o.user_id
WHERE o.created_at >= CURRENT_DATE - INTERVAL '30 days';
```

## Common Mistakes

### ❌ Forgetting Join Condition

```sql
-- ❌ Wrong: Missing ON clause (creates CROSS JOIN)
SELECT * FROM users u INNER JOIN orders o;

-- ✅ Correct: Has join condition
SELECT * FROM users u INNER JOIN orders o ON u.id = o.user_id;
```

### ❌ Using WHERE Instead of ON

```sql
-- ❌ Less clear: Join condition in WHERE
SELECT u.name, o.total
FROM users u
INNER JOIN orders o ON u.id = o.user_id
WHERE u.id = o.user_id;  -- Redundant

-- ✅ Better: Join condition in ON
SELECT u.name, o.total
FROM users u
INNER JOIN orders o ON u.id = o.user_id;
```

### ❌ Ambiguous Column Names

```sql
-- ❌ Error: Which table's id?
SELECT id, name, total
FROM users u
INNER JOIN orders o ON u.id = o.user_id;

-- ✅ Correct: Qualify column names
SELECT u.id, u.name, o.total
FROM users u
INNER JOIN orders o ON u.id = o.user_id;
```

## When to Use INNER JOIN

**Use INNER JOIN when:**
- You only want rows with matches in both tables
- You need related data from multiple tables
- You want to filter out records without relationships
- You're building reports that require complete data

**Don't use INNER JOIN when:**
- You need all rows from one table (use LEFT JOIN)
- You need all rows from both tables (use FULL JOIN)
- You want to find records without relationships (use LEFT JOIN with WHERE IS NULL)

## Summary

**INNER JOIN Essentials:**

1. **Purpose**: Combine data from multiple tables where there's a match
2. **Syntax**: `FROM table1 INNER JOIN table2 ON condition`
3. **Result**: Only rows with matches in both tables
4. **Multiple JOINs**: Chain multiple INNER JOINs for complex queries
5. **Performance**: Index foreign keys, select only needed columns
6. **Best Practice**: Use explicit JOIN syntax, qualify column names

**Key Takeaway:**
INNER JOIN is the workhorse of relational queries. It combines related data while excluding unmatched rows. Always ensure your join conditions are correct and indexed for performance.

**Next Steps:**
- Learn [LEFT JOIN](left_join.md) to include unmatched rows
- Study [When to Use Which JOIN](when_to_use_which_join.md) for join selection
- Master [Advanced Querying](../06_advanced_querying/subqueries.md) for complex scenarios

