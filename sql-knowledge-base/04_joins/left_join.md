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

## ORM Equivalents: Prisma and TypeORM

### Prisma Syntax

```javascript
// LEFT JOIN with include
const usersWithOrders = await prisma.user.findMany({
    include: {
        orders: true  // LEFT JOIN - all users, even without orders
    }
});

// Find users without orders
const usersWithoutOrders = await prisma.user.findMany({
    where: {
        orders: {
            none: {}  // No orders
        }
    }
});

// LEFT JOIN with conditions
const usersWithRecentOrders = await prisma.user.findMany({
    include: {
        orders: {
            where: {
                created_at: {
                    gte: new Date('2024-01-01')
                }
            }
        }
    }
});
```

### TypeORM Syntax

```typescript
// LEFT JOIN with relations
const usersWithOrders = await userRepository.find({
    relations: ['orders']  // LEFT JOIN orders
});

// Query builder for explicit LEFT JOIN
const usersWithOrders = await userRepository
    .createQueryBuilder('user')
    .leftJoin('user.orders', 'order')
    .select(['user.id', 'user.email', 'order.id', 'order.total'])
    .getMany();

// Find users without orders
const usersWithoutOrders = await userRepository
    .createQueryBuilder('user')
    .leftJoin('user.orders', 'order')
    .where('order.id IS NULL')
    .getMany();
```

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

---

## 🎯 Interview Questions: SQL

### Q1: Explain LEFT JOIN in detail, including how it differs from INNER JOIN, when to use it, and how NULL values are handled. Provide examples showing common patterns like finding records without relationships and handling aggregations with LEFT JOIN.

**Answer:**

**LEFT JOIN Definition:**

LEFT JOIN (also called LEFT OUTER JOIN) returns all rows from the left table and the matched rows from the right table. If there's no match in the right table, the result still includes the left table row, but with NULL values for all right table columns. This makes LEFT JOIN essential for queries where you need all records from one table regardless of whether they have related data in another table.

**How LEFT JOIN Works:**

**Execution Process:**
1. Start with all rows from the left table
2. For each left table row, look for matching rows in the right table based on the join condition
3. If a match is found, combine the rows
4. If no match is found, include the left row with NULL values for right table columns

**Visual Representation:**

```
LEFT JOIN Process:
┌─────────────┐         ┌─────────────┐
│   Users     │         │   Orders   │
├────┬────────┤         ├────┬───────┤
│ id │ name   │         │ id │user_id│
├────┼────────┤         ├────┼───────┤
│ 1  │ John   │────────▶│ 1  │ 1     │ ✅ Match
│ 2  │ Jane   │────────▶│ 2  │ 1     │ ✅ Match
│ 3  │ Bob    │    ❌   │ 3  │ 2     │ ✅ Match
│ 4  │ Alice  │    ❌   │    │       │ No match
└────┴────────┘         └────┴───────┘

Result:
┌────┬────────┬───────┬────────┐
│ id │ name   │order_id│ total  │
├────┼────────┼───────┼────────┤
│ 1  │ John   │ 1     │ 99.99  │
│ 1  │ John   │ 2     │ 149.99 │
│ 2  │ Jane   │ 3     │ 79.99  │
│ 3  │ Bob    │ NULL  │ NULL   │ ← No orders
│ 4  │ Alice  │ NULL  │ NULL   │ ← No orders
└────┴────────┴───────┴────────┘
```

**LEFT JOIN vs INNER JOIN:**

**INNER JOIN:**
- Returns only rows with matches in both tables
- Excludes unmatched rows completely
- No NULL values in result (except if source data has NULLs)

**LEFT JOIN:**
- Returns all rows from left table
- Includes unmatched rows with NULLs
- Preserves left table data even without matches

**Example Comparison:**

**Schema:**
```sql
CREATE TABLE users (
    id INT PRIMARY KEY,
    name VARCHAR(100)
);

CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id INT REFERENCES users(id),
    total DECIMAL(10,2)
);

-- Data
INSERT INTO users VALUES (1, 'John'), (2, 'Jane'), (3, 'Bob');
INSERT INTO orders VALUES (1, 1, 99.99), (2, 1, 149.99), (3, 2, 79.99);
-- Note: Bob has no orders
```

**INNER JOIN Query:**
```sql
SELECT u.name, o.total
FROM users u
INNER JOIN orders o ON u.id = o.user_id;
```

**Result:**
```
┌────────┬────────┐
│ name   │ total  │
├────────┼────────┤
│ John   │ 99.99  │
│ John   │ 149.99 │
│ Jane   │ 79.99  │
└────────┴────────┘
-- 3 rows: Bob excluded (no orders)
```

**LEFT JOIN Query:**
```sql
SELECT u.name, o.total
FROM users u
LEFT JOIN orders o ON u.id = o.user_id;
```

**Result:**
```
┌────────┬────────┐
│ name   │ total  │
├────────┼────────┤
│ John   │ 99.99  │
│ John   │ 149.99 │
│ Jane   │ 79.99  │
│ Bob    │ NULL   │ ← Included with NULL
└────────┴────────┘
-- 4 rows: Bob included (no orders, but NULL for total)
```

**When to Use LEFT JOIN:**

**1. Find Records Without Relationships:**

**Pattern:** Find records in one table that don't have related records in another table

**Example:**
```sql
-- Find users who have never placed an order
SELECT u.id, u.name, u.email
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.id IS NULL;  -- No matching order
```

**Result:**
```
┌────┬──────┬──────────────────┐
│ id │ name │ email            │
├────┼──────┼──────────────────┤
│ 3  │ Bob  │ bob@example.com  │
└────┴──────┴──────────────────┘
-- Only users without orders
```

**How It Works:**
- LEFT JOIN includes all users
- For users with orders: o.id has a value
- For users without orders: o.id is NULL
- WHERE o.id IS NULL filters to only unmatched rows

**2. Aggregations with Zero Handling:**

**Pattern:** Count related records, including zeros for records without relationships

**Example:**
```sql
-- Count orders per user, including users with 0 orders
SELECT 
    u.id,
    u.name,
    COUNT(o.id) AS order_count,  -- COUNT(o.id) ignores NULLs
    COALESCE(SUM(o.total), 0) AS total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;
```

**Result:**
```
┌────┬──────┬─────────────┬─────────────┐
│ id │ name │ order_count │ total_spent │
├────┼──────┼─────────────┼─────────────┤
│ 1  │ John │ 2           │ 249.98      │
│ 2  │ Jane │ 1           │ 79.99       │
│ 3  │ Bob  │ 0           │ 0.00        │ ← Zero orders
└────┴──────┴─────────────┴─────────────┘
```

**Important:** 
- `COUNT(o.id)` counts non-NULL values → returns 0 for users with no orders
- `COUNT(*)` would count all rows including NULL joins → returns 1 for users with no orders (wrong!)
- `SUM(o.total)` returns NULL for users with no orders → use `COALESCE(SUM(o.total), 0)` to convert to 0

**3. Optional Related Data:**

**Pattern:** Include related data when available, but don't exclude records without it

**Example:**
```sql
-- Get all products with their category names (if category exists)
SELECT 
    p.id,
    p.name,
    p.price,
    c.name AS category_name
FROM products p
LEFT JOIN categories c ON p.category_id = c.id;
```

**Result:**
```
┌────┬──────────┬────────┬──────────────┐
│ id │ name     │ price  │ category_name│
├────┼──────────┼────────┼──────────────┤
│ 1  │ Laptop   │ 999.99 │ Electronics  │
│ 2  │ Book     │ 19.99  │ Books        │
│ 3  │ Widget   │ 5.99   │ NULL         │ ← No category
└────┴──────────┴────────┴──────────────┘
```

**4. Multiple LEFT JOINs:**

**Pattern:** Chain multiple LEFT JOINs for optional relationships

**Example:**
```sql
-- Get all users with their orders and order items (if they exist)
SELECT 
    u.name AS user_name,
    o.id AS order_id,
    o.total AS order_total,
    oi.product_id,
    oi.quantity
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
LEFT JOIN order_items oi ON o.id = oi.order_id;
```

**Result Structure:**
- Users with orders and items: Full data
- Users with orders but no items: NULL for item columns
- Users without orders: NULL for order and item columns

**NULL Handling in LEFT JOIN:**

**1. Filtering on Right Table Columns:**

**Common Mistake:**
```sql
-- ❌ Wrong: Filters out unmatched rows
SELECT u.name, o.total
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.total > 100;  -- This removes users with no orders!
```

**Problem:**
- WHERE clause filters the final result
- `o.total > 100` evaluates to FALSE for NULL values
- Users with no orders (o.total = NULL) are excluded
- LEFT JOIN becomes effectively INNER JOIN

**Correct Approach:**
```sql
-- ✅ Correct: Filter in JOIN condition
SELECT u.name, o.total
FROM users u
LEFT JOIN orders o ON u.id = o.user_id AND o.total > 100;
-- Keeps all users, only includes orders > 100
```

**Difference:**
- `WHERE o.total > 100`: Filters after join → excludes unmatched rows
- `ON ... AND o.total > 100`: Filters during join → keeps unmatched rows

**2. Aggregations with NULL:**

**Problem:**
```sql
-- ❌ Wrong: SUM returns NULL for users with no orders
SELECT 
    u.name,
    SUM(o.total) AS total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;
-- Bob's total_spent = NULL (not 0)
```

**Solution:**
```sql
-- ✅ Correct: Use COALESCE
SELECT 
    u.name,
    COALESCE(SUM(o.total), 0) AS total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;
-- Bob's total_spent = 0
```

**3. COUNT with LEFT JOIN:**

**Problem:**
```sql
-- ❌ Wrong: COUNT(*) counts NULL joins
SELECT 
    u.name,
    COUNT(*) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;
-- Bob's order_count = 1 (counts the NULL join row)
```

**Solution:**
```sql
-- ✅ Correct: COUNT(column) ignores NULLs
SELECT 
    u.name,
    COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;
-- Bob's order_count = 0
```

**Performance Considerations:**

**1. Index Foreign Keys:**
```sql
-- Index the join column for performance
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- LEFT JOIN uses index efficiently
SELECT u.*, o.*
FROM users u
LEFT JOIN orders o ON u.id = o.user_id;
```

**2. Filter Early:**
```sql
-- ✅ Good: Filter left table before join
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

**3. WHERE IS NULL Performance:**
```sql
-- ✅ Good: Indexed column in WHERE IS NULL
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

**System Design Consideration**: LEFT JOIN is essential for:
1. **Data Completeness**: Including all records regardless of relationships
2. **Analytics**: Accurate counts and aggregations including zeros
3. **User Experience**: Showing all data with optional related information
4. **Data Quality**: Identifying missing relationships

LEFT JOIN is a fundamental tool for queries that need to preserve all records from one table while optionally including related data. Understanding NULL handling, especially in aggregations and filtering, is crucial for writing correct queries. LEFT JOIN enables patterns like finding missing relationships and accurate aggregations that include zeros.

---

### Q2: Explain the difference between filtering in the ON clause vs the WHERE clause when using LEFT JOIN. Provide detailed examples showing how each affects the result set, and explain when to use each approach. Discuss the performance implications.

**Answer:**

**ON Clause vs WHERE Clause in LEFT JOIN:**

This is a critical distinction that affects both query results and performance. Understanding when to filter in the ON clause versus the WHERE clause is essential for writing correct LEFT JOIN queries.

**Key Difference:**

**ON Clause:**
- Filters during the join operation
- Applied before the join result is formed
- Affects which rows from the right table are included
- Does NOT exclude unmatched rows from the left table

**WHERE Clause:**
- Filters after the join operation
- Applied to the final joined result set
- Can exclude unmatched rows (NULL values)
- Acts on the complete result set

**Detailed Examples:**

**Scenario Setup:**
```sql
CREATE TABLE users (
    id INT PRIMARY KEY,
    name VARCHAR(100)
);

CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id INT REFERENCES users(id),
    total DECIMAL(10,2),
    status VARCHAR(20)
);

-- Data
INSERT INTO users VALUES 
    (1, 'John'), 
    (2, 'Jane'), 
    (3, 'Bob');

INSERT INTO orders VALUES 
    (1, 1, 99.99, 'completed'),
    (2, 1, 149.99, 'pending'),
    (3, 2, 79.99, 'completed');
-- Bob has no orders
```

**Example 1: Filtering Right Table by Status**

**Query 1: Filter in WHERE Clause**
```sql
SELECT u.name, o.total, o.status
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.status = 'completed';
```

**Execution:**
1. LEFT JOIN: Include all users, match with orders
2. Result after join:
   ```
   ┌──────┬────────┬───────────┐
   │ name │ total  │ status    │
   ├──────┼────────┼───────────┤
   │ John │ 99.99  │ completed │
   │ John │ 149.99 │ pending   │
   │ Jane │ 79.99  │ completed │
   │ Bob  │ NULL   │ NULL      │
   └──────┴────────┴───────────┘
   ```
3. WHERE o.status = 'completed': Filter result
4. Final result:
   ```
   ┌──────┬────────┬───────────┐
   │ name │ total  │ status    │
   ├──────┼────────┼───────────┤
   │ John │ 99.99  │ completed │
   │ Jane │ 79.99  │ completed │
   └──────┴────────┴───────────┘
   -- Bob excluded! (o.status = NULL, not 'completed')
   ```

**Query 2: Filter in ON Clause**
```sql
SELECT u.name, o.total, o.status
FROM users u
LEFT JOIN orders o ON u.id = o.user_id AND o.status = 'completed';
```

**Execution:**
1. LEFT JOIN with condition: Include all users, match only with completed orders
2. Result:
   ```
   ┌──────┬────────┬───────────┐
   │ name │ total  │ status    │
   ├──────┼────────┼───────────┤
   │ John │ 99.99  │ completed │
   │ John │ NULL   │ NULL      │ ← Pending order excluded
   │ Jane │ 79.99  │ completed │
   │ Bob  │ NULL   │ NULL      │ ← No orders, but user included
   └──────┴────────┴───────────┘
   ```
3. No WHERE clause: All rows included
4. Final result: All users included, only completed orders shown

**Key Difference:**
- **WHERE clause**: Excludes Bob (no completed orders)
- **ON clause**: Includes Bob (user preserved, no matching completed orders)

**Example 2: Finding Users Without Specific Orders**

**Scenario:** Find users who don't have any completed orders

**Query 1: Wrong Approach (WHERE clause)**
```sql
SELECT u.name
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.status != 'completed' OR o.status IS NULL;
```

**Problem:**
- Users with both completed and pending orders appear
- Logic is complex and error-prone
- May not give desired result

**Query 2: Correct Approach (ON clause + WHERE IS NULL)**
```sql
SELECT u.name
FROM users u
LEFT JOIN orders o ON u.id = o.user_id AND o.status = 'completed'
WHERE o.id IS NULL;
```

**Execution:**
1. LEFT JOIN: All users, match only with completed orders
2. Result:
   ```
   ┌──────┬──────┐
   │ name │ o.id │
   ├──────┼──────┤
   │ John │ 1    │ ← Has completed order
   │ Jane │ 3    │ ← Has completed order
   │ Bob  │ NULL │ ← No completed orders
   └──────┴──────┘
   ```
3. WHERE o.id IS NULL: Only users without completed orders
4. Final result:
   ```
   ┌──────┐
   │ name │
   ├──────┤
   │ Bob  │
   └──────┘
   ```

**Example 3: Conditional Aggregation**

**Scenario:** Count total orders and completed orders per user

**Query with WHERE Clause (Wrong):**
```sql
SELECT 
    u.name,
    COUNT(*) AS total_orders,
    COUNT(CASE WHEN o.status = 'completed' THEN 1 END) AS completed_orders
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.status = 'completed'  -- ❌ Wrong!
GROUP BY u.id, u.name;
```

**Problem:**
- WHERE filters out users without completed orders
- Bob excluded from result
- Total orders count is wrong (only counts completed)

**Query with ON Clause (Correct):**
```sql
SELECT 
    u.name,
    COUNT(o.id) AS total_orders,
    COUNT(CASE WHEN o.status = 'completed' THEN 1 END) AS completed_orders
FROM users u
LEFT JOIN orders o ON u.id = o.user_id AND o.status = 'completed'
GROUP BY u.id, u.name;
```

**Still Wrong!** This only counts completed orders. Need different approach:

**Correct Query:**
```sql
SELECT 
    u.name,
    COUNT(o_all.id) AS total_orders,
    COUNT(o_completed.id) AS completed_orders
FROM users u
LEFT JOIN orders o_all ON u.id = o_all.user_id
LEFT JOIN orders o_completed ON u.id = o_completed.user_id 
    AND o_completed.status = 'completed'
GROUP BY u.id, u.name;
```

**Result:**
```
┌──────┬──────────────┬──────────────────┐
│ name │ total_orders │ completed_orders │
├──────┼──────────────┼──────────────────┤
│ John │ 2            │ 1                │
│ Jane │ 1            │ 1                │
│ Bob  │ 0            │ 0                │
└──────┴──────────────┴──────────────────┘
```

**When to Use Each:**

**Use ON Clause When:**

**1. Filtering Right Table Without Excluding Left Rows:**
```sql
-- Want all users, but only show certain orders
SELECT u.name, o.total
FROM users u
LEFT JOIN orders o ON u.id = o.user_id AND o.total > 100;
-- All users included, only orders > 100 shown
```

**2. Finding Records Without Specific Relationships:**
```sql
-- Users without completed orders
SELECT u.name
FROM users u
LEFT JOIN orders o ON u.id = o.user_id AND o.status = 'completed'
WHERE o.id IS NULL;
```

**3. Preserving Left Table Rows:**
```sql
-- Need all left table rows regardless of right table matches
SELECT u.*, o.*
FROM users u
LEFT JOIN orders o ON u.id = o.user_id AND o.created_at > '2024-01-01';
-- All users, only recent orders
```

**Use WHERE Clause When:**

**1. Filtering Left Table:**
```sql
-- Filter users before join
SELECT u.name, o.total
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.is_active = true;  -- Filter left table
```

**2. Filtering Final Result:**
```sql
-- Want only users who have orders (effectively INNER JOIN)
SELECT u.name, o.total
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.id IS NOT NULL;  -- Exclude users without orders
```

**3. Complex Conditions on Final Result:**
```sql
-- Conditions involving multiple columns from result
SELECT u.name, o.total
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2024-01-01' OR o.total > 100;
-- Complex condition on final result
```

**Performance Implications:**

**1. Filter in ON Clause:**
```sql
-- Filter applied during join
SELECT u.name, o.total
FROM users u
LEFT JOIN orders o ON u.id = o.user_id AND o.status = 'completed';
```

**Execution:**
- Join processes fewer rows from right table
- Index can be used for both join and filter
- More efficient: Less data to process

**2. Filter in WHERE Clause:**
```sql
-- Filter applied after join
SELECT u.name, o.total
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.status = 'completed';
```

**Execution:**
- Join processes all rows from right table
- Filter applied to larger result set
- Less efficient: More data processed then filtered

**Visual Comparison:**

```
Filter in ON Clause:
┌─────────┐    ┌─────────┐
│ Users   │    │ Orders  │
│ (1000)  │    │ (10000) │
└────┬────┘    └────┬────┘
     │             │
     │  Filter:    │
     │  status=    │
     │  'completed'│
     │  (2000 rows)│
     │             │
     ▼             ▼
  Join: 1000 users × 2000 orders
  Result: 1000-3000 rows
  Efficient!

Filter in WHERE Clause:
┌─────────┐    ┌─────────┐
│ Users   │    │ Orders  │
│ (1000)  │    │ (10000) │
└────┬────┘    └────┬────┘
     │             │
     │  No filter  │
     │             │
     ▼             ▼
  Join: 1000 users × 10000 orders
  Result: 1000-10000 rows
  Then filter: status='completed'
  Final: 1000-3000 rows
  Less efficient!
```

**Best Practices:**

**1. Filter Right Table in ON Clause:**
```sql
-- ✅ Good: Filter during join
LEFT JOIN orders o ON u.id = o.user_id AND o.status = 'completed'
```

**2. Filter Left Table in WHERE Clause:**
```sql
-- ✅ Good: Filter left table in WHERE
WHERE u.is_active = true
```

**3. Use WHERE for Final Result Filtering:**
```sql
-- ✅ Good: Filter final result
WHERE o.id IS NULL  -- Find unmatched
```

**System Design Consideration**: Understanding ON vs WHERE in LEFT JOIN is crucial for:
1. **Correctness**: Getting the right results
2. **Performance**: Efficient query execution
3. **Maintainability**: Clear, understandable queries
4. **Data Integrity**: Preserving all necessary records

The key principle: Use ON clause to filter which rows from the right table are included in the join, preserving all left table rows. Use WHERE clause to filter the final result set. Filtering in the ON clause is generally more efficient because it reduces the data processed during the join operation.

