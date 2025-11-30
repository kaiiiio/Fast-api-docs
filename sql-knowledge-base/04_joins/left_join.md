# LEFT JOIN: Including Unmatched Rows

LEFT JOIN (also called LEFT OUTER JOIN) returns all rows from the left table and matched rows from the right table. If there's no match, NULL values are returned for right table columns.

## Understanding LEFT JOIN

**What it does:** Returns ALL rows from the left table, plus matching rows from the right table. Rows without a match show NULL for right table columns.

**Visual Representation:**
```
Table A (Left)    Table B (Right)   LEFT JOIN Result
┌────┬────┐      ┌────┬────┐      ┌────┬────┬────┬────┐
│ id │val │      │ id │val │      │A.id│A.val│B.id│B.val│
├────┼────┤      ├────┼────┤      ├────┼────┼────┼────┤
│ 1  │ A  │──────→│ 1  │ X  │──────→│ 1  │ A  │ 1  │ X  │
│ 2  │ B  │      │ 3  │ Y  │      │ 2  │ B  │NULL│NULL│ ← No match
│ 3  │ C  │──────→│ 4  │ Z  │      │ 3  │ C  │ 3  │ Y  │
└────┴────┘      └────┴────┘      └────┴────┴────┴────┘
                (id=2 has no match, but included)
                (id=4 has no match, excluded - not in left table)
```

## Basic LEFT JOIN Syntax

```sql
SELECT columns
FROM left_table
LEFT JOIN right_table ON left_table.column = right_table.column;
```

**The `OUTER` keyword is optional:**
```sql
-- These are equivalent:
SELECT * FROM users LEFT JOIN orders ON users.id = orders.user_id;
SELECT * FROM users LEFT OUTER JOIN orders ON users.id = orders.user_id;
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
-- Note: Bob (id=3) has no orders
```

### Basic LEFT JOIN Query

```sql
-- Get all users with their orders (including users with no orders)
SELECT 
    u.id AS user_id,
    u.name AS user_name,
    u.email,
    o.id AS order_id,
    o.total,
    o.created_at AS order_date
FROM users u
LEFT JOIN orders o ON u.id = o.user_id;
```

**Result:**
```
┌─────────┬──────────────┬──────────────────┬──────────┬────────┬─────────────────────┐
│ user_id │ user_name    │ email            │ order_id │ total  │ order_date          │
├─────────┼──────────────┼──────────────────┼──────────┼────────┼─────────────────────┤
│ 1       │ John Doe     │ john@example.com │ 1        │ 99.99  │ 2024-01-15 10:00:00 │
│ 1       │ John Doe     │ john@example.com │ 2        │ 149.99 │ 2024-01-20 14:30:00 │
│ 2       │ Jane Smith   │ jane@example.com │ 3        │ 79.99  │ 2024-01-18 09:15:00 │
│ 3       │ Bob Johnson  │ bob@example.com  │ NULL     │ NULL   │ NULL                │ ← No orders
└─────────┴──────────────┴──────────────────┴──────────┴────────┴─────────────────────┘
```

**Key Point:** Bob appears even though he has no orders (NULL values for order columns).

## Common Use Cases

### Use Case 1: Find Records Without Relationships

**Find users who have never placed an order:**

```sql
-- Users with no orders
SELECT 
    u.id,
    u.name,
    u.email
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.id IS NULL;  -- No matching order
```

**Result:**
```
┌────┬──────────────┬──────────────────┐
│ id │ name         │ email            │
├────┼──────────────┼──────────────────┤
│ 3  │ Bob Johnson  │ bob@example.com  │
└────┴──────────────┴──────────────────┘
```

**Pattern:** `LEFT JOIN ... WHERE right_table.column IS NULL` finds unmatched rows.

### Use Case 2: Count with Zero Handling

**Count orders per user, including users with zero orders:**

```sql
-- Order count per user (including zero)
SELECT 
    u.id,
    u.name,
    u.email,
    COUNT(o.id) AS order_count,  -- COUNT(o.id) counts non-NULL values
    COALESCE(SUM(o.total), 0) AS total_spent  -- Handle NULL sum
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name, u.email
ORDER BY order_count DESC;
```

**Result:**
```
┌────┬──────────────┬──────────────────┬─────────────┬─────────────┐
│ id │ name         │ email            │ order_count │ total_spent │
├────┼──────────────┼──────────────────┼─────────────┼─────────────┤
│ 1  │ John Doe     │ john@example.com │ 2           │ 249.98      │
│ 2  │ Jane Smith   │ jane@example.com │ 1           │ 79.99       │
│ 3  │ Bob Johnson  │ bob@example.com  │ 0           │ 0.00        │ ← Zero orders
└────┴──────────────┴──────────────────┴─────────────┴─────────────┘
```

**Key Points:**
- `COUNT(o.id)` returns 0 for users with no orders (counts non-NULL)
- `COUNT(*)` would return 1 (counts rows, including NULL joins)
- `COALESCE(SUM(o.total), 0)` converts NULL to 0

### Use Case 3: Optional Related Data

**Get all products with optional category information:**

```sql
-- All products, even if category is missing
SELECT 
    p.id,
    p.name,
    p.price,
    c.name AS category_name,
    c.description AS category_description
FROM products p
LEFT JOIN categories c ON p.category_id = c.id;
```

**Benefits:**
- Products without categories still appear
- Can identify products needing categorization
- Complete product list

## Multiple LEFT JOINs

Chain multiple LEFT JOINs together.

### Example: Users → Orders → Order Items

```sql
-- Get all users with their orders and order items
SELECT 
    u.name AS user_name,
    o.id AS order_id,
    o.total AS order_total,
    oi.quantity,
    p.name AS product_name,
    oi.price AS item_price
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN products p ON oi.product_id = p.id
ORDER BY u.name, o.id;
```

**Result Structure:**
- Users with orders: Full order and item details
- Users without orders: NULL for order columns
- Orders without items: NULL for item columns

## LEFT JOIN with WHERE Clause

Combine LEFT JOIN with filtering.

### Filter on Left Table

```sql
-- Active users with their orders
SELECT 
    u.name,
    u.email,
    o.id AS order_id,
    o.total
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.is_active = true;  -- Filter left table
```

### Filter on Right Table (Be Careful!)

```sql
-- ❌ Wrong: Filters out unmatched rows
SELECT 
    u.name,
    o.total
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.total > 100;  -- This removes users with no orders!

-- ✅ Correct: Filter in JOIN condition or use subquery
SELECT 
    u.name,
    o.total
FROM users u
LEFT JOIN orders o ON u.id = o.user_id AND o.total > 100;  -- Filter in JOIN
```

**Key Difference:**
- `WHERE o.total > 100`: Filters final result (removes NULL rows)
- `ON u.id = o.user_id AND o.total > 100`: Filters during join (keeps unmatched)

## LEFT JOIN vs INNER JOIN

### Comparison

**INNER JOIN:**
```sql
-- Only users with orders
SELECT u.name, o.total
FROM users u
INNER JOIN orders o ON u.id = o.user_id;
-- Result: 3 rows (John appears twice, Jane once, Bob excluded)
```

**LEFT JOIN:**
```sql
-- All users, including those without orders
SELECT u.name, o.total
FROM users u
LEFT JOIN orders o ON u.id = o.user_id;
-- Result: 4 rows (John appears twice, Jane once, Bob once with NULL)
```

### When to Use Each

**Use INNER JOIN when:**
- You only want rows with matches in both tables
- Missing relationships indicate data quality issues
- You're building reports requiring complete data

**Use LEFT JOIN when:**
- You want all rows from left table
- Missing relationships are expected/normal
- You need to identify records without relationships
- You're doing counts that should include zeros

## Advanced Patterns

### Pattern 1: Find Missing Relationships

```sql
-- Products never ordered
SELECT p.*
FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
WHERE oi.id IS NULL;
```

### Pattern 2: Conditional Aggregation

```sql
-- Users with order statistics (including zero orders)
SELECT 
    u.id,
    u.name,
    COUNT(o.id) AS total_orders,
    COUNT(CASE WHEN o.total > 100 THEN 1 END) AS large_orders,
    COUNT(CASE WHEN o.created_at > CURRENT_DATE - INTERVAL '30 days' THEN 1 END) AS recent_orders
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;
```

### Pattern 3: Latest Record Per Group

```sql
-- Each user's most recent order
SELECT 
    u.id,
    u.name,
    o.id AS latest_order_id,
    o.total AS latest_order_total,
    o.created_at AS latest_order_date
FROM users u
LEFT JOIN LATERAL (
    SELECT *
    FROM orders
    WHERE user_id = u.id
    ORDER BY created_at DESC
    LIMIT 1
) o ON true;
```

## Performance Considerations

### 1. **Index Foreign Keys**

```sql
-- Index the join column
CREATE INDEX idx_orders_user_id ON orders(user_id);
```

### 2. **Filter Early**

```sql
-- ✅ Good: Filter before join
SELECT u.name, o.total
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2024-01-01';  -- Filter users first

-- ❌ Less efficient: Filter after join
SELECT u.name, o.total
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2024-01-01' OR o.total > 100;
```

### 3. **Use WHERE IS NULL Efficiently**

```sql
-- ✅ Good: Indexed column in WHERE
SELECT u.*
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.id IS NULL;  -- Uses index on orders.id

-- ⚠️ Less efficient: Non-indexed column
SELECT u.*
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.total IS NULL;  -- May not use index
```

## Common Mistakes

### ❌ Using WHERE Instead of ON for Right Table Filters

```sql
-- ❌ Wrong: Excludes unmatched rows
SELECT u.name, o.total
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.total > 100;  -- Users with no orders excluded!

-- ✅ Correct: Filter in JOIN condition
SELECT u.name, o.total
FROM users u
LEFT JOIN orders o ON u.id = o.user_id AND o.total > 100;
```

### ❌ COUNT(*) Instead of COUNT(column)

```sql
-- ❌ Wrong: Counts all rows including NULL joins
SELECT u.name, COUNT(*) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;
-- Returns 1 for users with no orders (counts the NULL join row)

-- ✅ Correct: Count non-NULL values
SELECT u.name, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;
-- Returns 0 for users with no orders
```

### ❌ Not Handling NULL in Aggregations

```sql
-- ❌ Wrong: SUM returns NULL for users with no orders
SELECT u.name, SUM(o.total) AS total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;

-- ✅ Correct: Use COALESCE
SELECT u.name, COALESCE(SUM(o.total), 0) AS total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;
```

## Best Practices

1. **Use LEFT JOIN for Optional Relationships**: When right table data may not exist
2. **Filter in ON Clause**: For right table filters that shouldn't exclude unmatched rows
3. **Use COUNT(column)**: Not COUNT(*) with LEFT JOIN
4. **Handle NULLs**: Use COALESCE for aggregations
5. **Index Join Columns**: For performance
6. **Be Explicit**: Use LEFT JOIN when you need all left table rows

## Summary

**LEFT JOIN Essentials:**

1. **Purpose**: Include all rows from left table, matched rows from right
2. **Syntax**: `FROM left_table LEFT JOIN right_table ON condition`
3. **NULL Handling**: Unmatched rows show NULL for right table columns
4. **Common Pattern**: `LEFT JOIN ... WHERE right_table.column IS NULL` finds unmatched
5. **Aggregations**: Use `COUNT(column)` and `COALESCE()` for proper handling
6. **Filtering**: Filter right table in ON clause, not WHERE clause

**Key Takeaway:**
LEFT JOIN is essential when you need all rows from one table regardless of matches. It's perfect for finding missing relationships, handling optional data, and ensuring counts include zeros.

**Use Cases:**
- Find records without relationships
- Count with zero handling
- Optional related data
- Complete lists with missing information

**Next Steps:**
- Learn [RIGHT JOIN](right_join.md) for the opposite scenario
- Study [FULL JOIN](full_join.md) for both sides
- Master [When to Use Which JOIN](when_to_use_which_join.md) for decision making

