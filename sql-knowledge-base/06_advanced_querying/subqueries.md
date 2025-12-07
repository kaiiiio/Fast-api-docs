# Subqueries: Nested Queries for Complex Data Retrieval

Subqueries (also called nested queries or inner queries) are queries within queries. They're powerful tools for solving complex data retrieval problems that can't be solved with simple JOINs.

## What is a Subquery?

A **subquery** is a SELECT statement nested inside another SQL statement. It can be used in SELECT, INSERT, UPDATE, DELETE, and WHERE clauses.

### Basic Structure

```sql
-- Outer query
SELECT column1
FROM table1
WHERE column2 IN (
    -- Subquery (inner query)
    SELECT column3
    FROM table2
    WHERE condition
);
```

## Types of Subqueries

### 1. Scalar Subquery

Returns a single value (one row, one column).

```sql
-- Get user with their latest order total
SELECT 
    u.id,
    u.name,
    u.email,
    (
        SELECT MAX(total)
        FROM orders
        WHERE user_id = u.id
    ) AS latest_order_total
FROM users u;
```

**Result:**
```
┌────┬──────────────┬──────────────────┬──────────────────┐
│ id │ name         │ email            │ latest_order_total│
├────┼──────────────┼──────────────────┼──────────────────┤
│ 1  │ John Doe     │ john@example.com │ 149.99           │
│ 2  │ Jane Smith   │ jane@example.com │ 79.99            │
│ 3  │ Bob Johnson  │ bob@example.com  │ NULL             │
└────┴──────────────┴──────────────────┴──────────────────┘
```

**Use Cases:**
- Single aggregate value per row
- Comparison with single value
- Calculations based on related data

### 2. Table Subquery

Returns multiple rows and columns (used with IN, EXISTS, or as derived table).

```sql
-- Users who have placed orders
SELECT *
FROM users
WHERE id IN (
    SELECT DISTINCT user_id
    FROM orders
);
```

**Use Cases:**
- Filtering with IN/NOT IN
- EXISTS/NOT EXISTS checks
- Derived tables in FROM clause

### 3. Correlated Subquery

References columns from the outer query.

```sql
-- Users with orders above their average
SELECT u.id, u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.total > (
    -- Correlated: references u.id from outer query
    SELECT AVG(total)
    FROM orders
    WHERE user_id = u.id
);
```

**Key Point:** Correlated subquery executes once per row of outer query.

## Subquery in WHERE Clause

### Using IN

```sql
-- Users who have placed orders
SELECT *
FROM users
WHERE id IN (
    SELECT DISTINCT user_id
    FROM orders
    WHERE total > 100
);
```

### Using NOT IN

```sql
-- Users who have never placed an order
SELECT *
FROM users
WHERE id NOT IN (
    SELECT DISTINCT user_id
    FROM orders
);
```

**⚠️ Warning:** NOT IN with NULL values can give unexpected results:
```sql
-- If subquery returns NULL, NOT IN behaves unexpectedly
SELECT * FROM users
WHERE id NOT IN (SELECT user_id FROM orders);
-- If user_id has NULL, this returns no rows!

-- ✅ Better: Use NOT EXISTS
SELECT * FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM orders o WHERE o.user_id = u.id
);
```

### Using EXISTS

```sql
-- Users who have placed orders (more efficient than IN)
SELECT *
FROM users u
WHERE EXISTS (
    SELECT 1
    FROM orders o
    WHERE o.user_id = u.id
);
```

**EXISTS vs IN:**
- **EXISTS**: Stops at first match (often faster)
- **IN**: Checks all values (can be slower)
- **EXISTS**: Handles NULLs correctly
- **IN**: NULL handling can be tricky

### Using Comparison Operators

```sql
-- Products priced above average
SELECT *
FROM products
WHERE price > (
    SELECT AVG(price)
    FROM products
);
```

### Using ANY/ALL

```sql
-- Products priced above any product in category 1
SELECT *
FROM products
WHERE price > ANY (
    SELECT price
    FROM products
    WHERE category_id = 1
);

-- Products priced above all products in category 1
SELECT *
FROM products
WHERE price > ALL (
    SELECT price
    FROM products
    WHERE category_id = 1
);
```

## Subquery in SELECT Clause

### Scalar Subquery in SELECT

```sql
-- User with order count
SELECT 
    u.id,
    u.name,
    u.email,
    (
        SELECT COUNT(*)
        FROM orders
        WHERE user_id = u.id
    ) AS order_count,
    (
        SELECT SUM(total)
        FROM orders
        WHERE user_id = u.id
    ) AS total_spent
FROM users u;
```

### Multiple Scalar Subqueries

```sql
-- User statistics
SELECT 
    u.id,
    u.name,
    (
        SELECT COUNT(*)
        FROM orders
        WHERE user_id = u.id
    ) AS order_count,
    (
        SELECT MAX(created_at)
        FROM orders
        WHERE user_id = u.id
    ) AS last_order_date,
    (
        SELECT AVG(total)
        FROM orders
        WHERE user_id = u.id
    ) AS avg_order_value
FROM users u;
```

## Subquery in FROM Clause (Derived Table)

Use subquery result as a table.

```sql
-- Users with their order statistics
SELECT 
    u.name,
    stats.order_count,
    stats.total_spent
FROM users u
JOIN (
    -- Derived table (subquery in FROM)
    SELECT 
        user_id,
        COUNT(*) AS order_count,
        SUM(total) AS total_spent
    FROM orders
    GROUP BY user_id
) stats ON u.id = stats.user_id;
```

**Benefits:**
- Pre-compute aggregations
- Simplify complex queries
- Reuse calculated results

## Correlated Subqueries

Subquery that references outer query columns.

### Basic Correlated Subquery

```sql
-- Orders above user's average order value
SELECT 
    u.name,
    o.id AS order_id,
    o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.total > (
    -- Correlated: uses u.id from outer query
    SELECT AVG(total)
    FROM orders
    WHERE user_id = u.id
);
```

### Performance Consideration

**⚠️ Warning:** Correlated subqueries can be slow:
- Execute once per row of outer query
- For 1000 users = 1000 subquery executions

**Optimization:**
```sql
-- ❌ Slow: Correlated subquery
SELECT 
    u.id,
    u.name,
    (SELECT COUNT(*) FROM orders WHERE user_id = u.id) AS order_count
FROM users u;

-- ✅ Faster: JOIN with aggregation
SELECT 
    u.id,
    u.name,
    COALESCE(COUNT(o.id), 0) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;
```

## Subquery in HAVING Clause

Filter groups based on subquery results.

```sql
-- Users with more orders than average
SELECT 
    u.id,
    u.name,
    COUNT(o.id) AS order_count
FROM users u
JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name
HAVING COUNT(o.id) > (
    SELECT AVG(order_count)
    FROM (
        SELECT COUNT(*) AS order_count
        FROM orders
        GROUP BY user_id
    ) user_orders
);
```

## Subquery Patterns

### Pattern 1: Find Maximum/Minimum

```sql
-- Product with highest price
SELECT *
FROM products
WHERE price = (
    SELECT MAX(price)
    FROM products
);
```

### Pattern 2: Find Records Without Relationships

```sql
-- Products never ordered
SELECT *
FROM products
WHERE id NOT IN (
    SELECT DISTINCT product_id
    FROM order_items
);
```

### Pattern 3: Conditional Aggregation

```sql
-- Users with order statistics
SELECT 
    u.id,
    u.name,
    (
        SELECT COUNT(*)
        FROM orders
        WHERE user_id = u.id
          AND total > 100
    ) AS large_order_count,
    (
        SELECT COUNT(*)
        FROM orders
        WHERE user_id = u.id
          AND created_at > CURRENT_DATE - INTERVAL '30 days'
    ) AS recent_order_count
FROM users u;
```

### Pattern 4: Top N Per Group

```sql
-- Top 3 orders per user
SELECT 
    u.name,
    o.id AS order_id,
    o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.id IN (
    SELECT id
    FROM orders o2
    WHERE o2.user_id = u.id
    ORDER BY o2.total DESC
    LIMIT 3
)
ORDER BY u.name, o.total DESC;
```

## Subquery vs JOIN

### When to Use Subquery

**Use Subquery When:**
- Need single value per row (scalar)
- EXISTS/NOT EXISTS checks
- Complex conditions
- Derived tables for clarity

### When to Use JOIN

**Use JOIN When:**
- Need columns from multiple tables
- Performance is critical
- Simple relationships
- Aggregations across tables

### Comparison Example

**Subquery Approach:**
```sql
-- User with order count (subquery)
SELECT 
    u.id,
    u.name,
    (SELECT COUNT(*) FROM orders WHERE user_id = u.id) AS order_count
FROM users u;
```

**JOIN Approach:**
```sql
-- User with order count (JOIN - usually faster)
SELECT 
    u.id,
    u.name,
    COALESCE(COUNT(o.id), 0) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;
```

**Performance:** JOIN is usually faster, especially for correlated subqueries.

## Common Mistakes

### ❌ Subquery Returns Multiple Rows

```sql
-- ❌ Error: Subquery returns multiple rows
SELECT *
FROM users
WHERE id = (
    SELECT user_id FROM orders  -- Multiple user_ids!
);

-- ✅ Correct: Use IN
SELECT *
FROM users
WHERE id IN (
    SELECT user_id FROM orders
);
```

### ❌ NULL Handling with NOT IN

```sql
-- ❌ Problem: If subquery has NULL, NOT IN fails
SELECT * FROM users
WHERE id NOT IN (
    SELECT user_id FROM orders  -- If user_id has NULL...
);
-- Returns no rows if subquery has any NULL!

-- ✅ Correct: Use NOT EXISTS
SELECT * FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM orders o WHERE o.user_id = u.id
);
```

### ❌ Correlated Subquery Performance

```sql
-- ❌ Slow: Executes for each row
SELECT 
    u.id,
    (SELECT COUNT(*) FROM orders WHERE user_id = u.id) AS count
FROM users u;

-- ✅ Faster: Use JOIN
SELECT 
    u.id,
    COUNT(o.id) AS count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id;
```

## Best Practices

1. **Use EXISTS for Existence Checks**: More efficient than IN
2. **Avoid Correlated Subqueries When Possible**: Use JOINs instead
3. **Handle NULLs Properly**: Use NOT EXISTS instead of NOT IN
4. **Test Subquery Separately**: Ensure it returns expected results
5. **Consider Performance**: Subqueries can be slower than JOINs
6. **Use Derived Tables**: For complex aggregations
7. **Index Subquery Columns**: For performance

## Summary

**Subquery Essentials:**

1. **Types**: Scalar (single value), Table (multiple rows), Correlated (references outer)
2. **Locations**: WHERE, SELECT, FROM, HAVING clauses
3. **Operators**: IN, NOT IN, EXISTS, NOT EXISTS, comparison operators
4. **Performance**: Correlated subqueries can be slow, consider JOINs
5. **NULL Handling**: Use EXISTS/NOT EXISTS instead of IN/NOT IN when NULLs possible
6. **Use Cases**: Complex filtering, single-value lookups, derived tables

**Key Takeaway:**
Subqueries are powerful for complex queries, but JOINs are often faster. Use subqueries when you need single values, existence checks, or complex conditions. Always test subqueries separately and consider performance implications.

**When to Use:**
- Single value per row (scalar subquery)
- Existence checks (EXISTS)
- Complex conditions
- Derived tables for clarity

**When to Avoid:**
- Can be replaced with JOIN (usually faster)
- Correlated subqueries on large datasets
- NOT IN with potential NULLs

**Next Steps:**
- Learn [CTEs (WITH queries)](ctes.md) for cleaner subqueries
- Study [EXISTS vs IN](exists_vs_in.md) for performance
- Master [Window Functions](../05_aggregations_grouping/window_functions.md) for advanced analytics

---

## 🎯 Interview Questions: SQL

### Q1: Explain the different types of subqueries in SQL (scalar, correlated, and table subqueries). Provide detailed examples of each type, explain when to use subqueries vs JOINs, and discuss the performance implications of correlated subqueries.

**Answer:**

**Subquery Types:**

Subqueries are queries nested inside other queries. They can be classified into different types based on their return value and relationship with the outer query. Understanding these types is crucial for writing efficient SQL and choosing the right approach for different scenarios.

**1. Scalar Subqueries:**

**Definition:** A scalar subquery returns exactly one row and one column (a single value). It can be used anywhere a single value is expected—in SELECT lists, WHERE clauses, HAVING clauses, etc.

**Characteristics:**
- Returns single value
- Must return exactly one row (or NULL)
- Can be used in expressions
- Executed once (if not correlated)

**Example 1: In SELECT List**
```sql
-- Get user with their order count
SELECT 
    id,
    name,
    email,
    (SELECT COUNT(*) 
     FROM orders 
     WHERE user_id = users.id) AS order_count
FROM users;
```

**Result:**
```
┌────┬──────────┬──────────────────┬─────────────┐
│ id │ name     │ email            │ order_count │
├────┼──────────┼──────────────────┼─────────────┤
│ 1  │ John     │ john@example.com │ 5           │
│ 2  │ Jane     │ jane@example.com │ 3           │
│ 3  │ Bob      │ bob@example.com  │ 0           │
└────┴──────────┴──────────────────┴─────────────┘
```

**Example 2: In WHERE Clause**
```sql
-- Users who have placed more orders than average
SELECT id, name, email
FROM users
WHERE (SELECT COUNT(*) 
       FROM orders 
       WHERE user_id = users.id) > 
      (SELECT AVG(order_count)
       FROM (SELECT COUNT(*) AS order_count
             FROM orders
             GROUP BY user_id) user_orders);
```

**Example 3: In HAVING Clause**
```sql
-- Categories with above-average product count
SELECT category_id, COUNT(*) AS product_count
FROM products
GROUP BY category_id
HAVING COUNT(*) > (SELECT AVG(cnt)
                   FROM (SELECT COUNT(*) AS cnt
                         FROM products
                         GROUP BY category_id) cat_counts);
```

**2. Correlated Subqueries:**

**Definition:** A correlated subquery references columns from the outer query. It executes once for each row processed by the outer query, using values from the current outer query row.

**Characteristics:**
- References outer query columns
- Executes multiple times (once per outer row)
- Can be slow for large datasets
- Useful when you need row-by-row comparisons

**Example:**
```sql
-- Orders above user's average order value
SELECT 
    u.name,
    o.id AS order_id,
    o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.total > (
    -- Correlated: uses u.id from outer query
    SELECT AVG(total)
    FROM orders
    WHERE user_id = u.id  -- References outer query's u.id
);
```

**How It Works:**
```
For each user-order combination:
1. Get user (e.g., user_id = 1)
2. Execute subquery: AVG(total) WHERE user_id = 1
3. Compare order.total with that average
4. Include row if condition true
5. Move to next user-order combination
6. Repeat for all combinations
```

**Performance Impact:**
- For 1,000 users with 10 orders each = 10,000 subquery executions
- Can be very slow without proper indexes
- Each execution requires database round trip

**3. Table Subqueries (Derived Tables):**

**Definition:** A table subquery (derived table) returns multiple rows and columns, and is used in the FROM clause as if it were a table. It creates a temporary result set that can be joined with other tables.

**Characteristics:**
- Returns multiple rows and columns
- Used in FROM clause
- Can be joined like a regular table
- Useful for pre-computing aggregations

**Example:**
```sql
-- Users with their order statistics
SELECT 
    u.name,
    u.email,
    stats.order_count,
    stats.total_spent,
    stats.avg_order_value
FROM users u
JOIN (
    -- Derived table (table subquery)
    SELECT 
        user_id,
        COUNT(*) AS order_count,
        SUM(total) AS total_spent,
        AVG(total) AS avg_order_value
    FROM orders
    GROUP BY user_id
) stats ON u.id = stats.user_id;
```

**Execution:**
```
1. Execute subquery first:
   - Group orders by user_id
   - Calculate aggregations
   - Result: Temporary table with user statistics

2. Join with users table:
   - Join users with statistics
   - Combine user info with order stats
```

**Subqueries vs JOINs:**

**When to Use Subqueries:**

**1. Single Value Needed:**
```sql
-- Subquery: Get single value
SELECT 
    name,
    (SELECT MAX(price) FROM products) AS max_price
FROM users;

-- JOIN would be overkill for single value
```

**2. EXISTS/NOT EXISTS Checks:**
```sql
-- Subquery: Existence check
SELECT *
FROM users u
WHERE EXISTS (
    SELECT 1 
    FROM orders o 
    WHERE o.user_id = u.id
);

-- More efficient than JOIN + DISTINCT
```

**3. Complex Conditions:**
```sql
-- Subquery: Complex filtering
SELECT *
FROM products
WHERE price > (SELECT AVG(price) FROM products)
  AND category_id IN (
      SELECT id FROM categories WHERE name = 'Electronics'
  );

-- Cleaner than multiple JOINs
```

**4. Derived Tables for Clarity:**
```sql
-- Subquery: Pre-compute for clarity
SELECT u.name, stats.total
FROM users u
JOIN (
    SELECT user_id, SUM(total) AS total
    FROM orders
    GROUP BY user_id
) stats ON u.id = stats.user_id;
-- Clear separation of aggregation and join
```

**When to Use JOINs:**

**1. Need Multiple Columns:**
```sql
-- JOIN: Get multiple columns from related table
SELECT 
    u.name,
    o.id AS order_id,
    o.total,
    o.created_at
FROM users u
JOIN orders o ON u.id = o.user_id;
-- More efficient than subquery for multiple columns
```

**2. Performance Critical:**
```sql
-- JOIN: Usually faster
SELECT 
    u.id,
    u.name,
    COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;

-- vs Subquery (slower):
SELECT 
    u.id,
    u.name,
    (SELECT COUNT(*) FROM orders WHERE user_id = u.id) AS order_count
FROM users u;
-- Subquery executes once per user (correlated)
```

**3. Simple Relationships:**
```sql
-- JOIN: Simple one-to-many relationship
SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id;
-- Straightforward, efficient
```

**Performance Implications of Correlated Subqueries:**

**The N+1 Problem:**

Correlated subqueries can cause the "N+1 query problem":

```sql
-- Correlated subquery
SELECT 
    u.id,
    u.name,
    (SELECT COUNT(*) FROM orders WHERE user_id = u.id) AS order_count
FROM users u;
```

**Execution Pattern:**
```
1. Query users table → 1,000 users
2. For each user (1,000 iterations):
   - Execute: SELECT COUNT(*) FROM orders WHERE user_id = ?
   - 1,000 separate queries!
3. Total: 1 + 1,000 = 1,001 queries
```

**Performance Comparison:**

**Correlated Subquery:**
```sql
SELECT 
    u.id,
    u.name,
    (SELECT COUNT(*) FROM orders WHERE user_id = u.id) AS order_count
FROM users u;
-- Execution: O(n * m) where n = users, m = avg orders per user
-- Queries: 1 + n (one per user)
-- Time: ~5 seconds for 1,000 users
```

**JOIN Alternative:**
```sql
SELECT 
    u.id,
    u.name,
    COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;
-- Execution: O(n + m) - single pass
-- Queries: 1
-- Time: ~0.1 seconds for 1,000 users
-- 50x faster!
```

**When Correlated Subqueries Are Acceptable:**

**1. Highly Selective Outer Query:**
```sql
-- Only 10 users match condition
SELECT 
    u.id,
    u.name,
    (SELECT COUNT(*) FROM orders WHERE user_id = u.id) AS order_count
FROM users u
WHERE u.country = 'Monaco';  -- Very few users
-- Only 10 subquery executions, acceptable
```

**2. Indexed Correlation Column:**
```sql
-- Index on orders.user_id makes subquery fast
CREATE INDEX idx_orders_user_id ON orders(user_id);

SELECT 
    u.id,
    (SELECT COUNT(*) FROM orders WHERE user_id = u.id) AS order_count
FROM users u;
-- Each subquery uses index: O(log m) instead of O(m)
-- Much faster with index
```

**3. Complex Logic:**
```sql
-- Subquery with complex logic that's hard to express with JOIN
SELECT 
    u.id,
    (SELECT COUNT(*) 
     FROM orders o
     JOIN order_items oi ON o.id = oi.order_id
     WHERE o.user_id = u.id
       AND oi.price > 100
       AND o.created_at > CURRENT_DATE - INTERVAL '30 days'
    ) AS recent_large_order_count
FROM users u;
-- Complex conditions may be clearer in subquery
```

**Optimization Strategies:**

**1. Rewrite as JOIN:**
```sql
-- Before: Correlated subquery
SELECT 
    u.id,
    (SELECT COUNT(*) FROM orders WHERE user_id = u.id) AS count
FROM users u;

-- After: JOIN (usually faster)
SELECT 
    u.id,
    COUNT(o.id) AS count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id;
```

**2. Use EXISTS Instead of COUNT:**
```sql
-- Before: COUNT subquery
SELECT *
FROM users u
WHERE (SELECT COUNT(*) FROM orders WHERE user_id = u.id) > 0;

-- After: EXISTS (stops at first match)
SELECT *
FROM users u
WHERE EXISTS (SELECT 1 FROM orders WHERE user_id = u.id);
-- Faster: stops scanning when first order found
```

**3. Add Indexes:**
```sql
-- Index on correlation column
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Makes correlated subquery much faster
SELECT 
    u.id,
    (SELECT COUNT(*) FROM orders WHERE user_id = u.id) AS count
FROM users u;
-- Each subquery uses index lookup
```

**System Design Consideration**: Understanding subquery types is crucial for:
1. **Query Performance**: Choosing efficient approaches
2. **Code Clarity**: Writing readable, maintainable queries
3. **Optimization**: Identifying and fixing performance issues
4. **Best Practices**: Using the right tool for each situation

Subqueries are powerful tools, but correlated subqueries can be performance killers. Understanding when to use subqueries vs JOINs, and how to optimize correlated subqueries, is essential for writing efficient SQL. The key is recognizing the N+1 problem and rewriting correlated subqueries as JOINs when possible, or ensuring proper indexing when subqueries are necessary.

---

### Q2: Explain the difference between EXISTS and IN when used with subqueries. Provide performance comparisons, explain when each is more efficient, and discuss NULL handling differences. Include examples showing when to use EXISTS vs IN vs JOINs.

**Answer:**

**EXISTS vs IN Overview:**

Both EXISTS and IN are used to check for the existence of values in subqueries, but they work differently and have different performance characteristics. Understanding when to use each is crucial for writing efficient SQL queries.

**IN Operator:**

**How It Works:**
- The subquery is executed **once** and returns a list of values
- The outer query checks if the column value is **in** that list
- Uses set membership testing
- Returns all matching rows

**Example:**
```sql
-- Find users who have placed orders
SELECT *
FROM users
WHERE id IN (
    SELECT DISTINCT user_id 
    FROM orders
);
```

**Execution:**
```
1. Execute subquery: SELECT DISTINCT user_id FROM orders
   → Returns: [1, 2, 3, 5, 7, ...] (list of user IDs)

2. For each user:
   - Check if user.id IN [1, 2, 3, 5, 7, ...]
   - If yes, include in result
```

**EXISTS Operator:**

**How It Works:**
- The subquery is executed **for each row** of the outer query
- Returns TRUE if subquery returns **any rows**, FALSE otherwise
- Stops as soon as **first match** is found (short-circuit)
- More efficient for existence checks

**Example:**
```sql
-- Find users who have placed orders
SELECT *
FROM users u
WHERE EXISTS (
    SELECT 1 
    FROM orders o 
    WHERE o.user_id = u.id
);
```

**Execution:**
```
1. For each user:
   - Execute subquery: SELECT 1 FROM orders WHERE user_id = ?
   - If any row found → EXISTS returns TRUE
   - Stops at first match (doesn't need to count all)
   - If no rows found → EXISTS returns FALSE
```

**Performance Comparison:**

**Scenario:** Find users who have placed orders
- Users: 100,000
- Orders: 1,000,000
- Users with orders: 50,000

**Query 1: Using IN**
```sql
SELECT *
FROM users
WHERE id IN (
    SELECT DISTINCT user_id 
    FROM orders
);
```

**Execution Plan:**
```
1. Execute subquery: SELECT DISTINCT user_id FROM orders
   - Scan orders table: 1,000,000 rows
   - Build distinct set: 50,000 unique user_ids
   - Time: ~2 seconds
   - Memory: Store 50,000 values

2. For each user (100,000):
   - Check if id IN (50,000 value set)
   - Hash lookup or binary search
   - Time: ~1 second

Total: ~3 seconds
```

**Query 2: Using EXISTS**
```sql
SELECT *
FROM users u
WHERE EXISTS (
    SELECT 1 
    FROM orders o 
    WHERE o.user_id = u.id
);
```

**Execution Plan:**
```
1. For each user (100,000):
   - Index lookup on orders.user_id
   - If index exists: O(log m) per lookup
   - Stops at first match
   - Average: 1-2 lookups per user (most have orders)
   - Time: ~0.5 seconds

Total: ~0.5 seconds
```

**Performance: EXISTS is 6x faster in this case!**

**When IN is More Efficient:**

**1. Small Result Set from Subquery:**
```sql
-- Subquery returns only 10 values
SELECT *
FROM users
WHERE id IN (
    SELECT user_id 
    FROM orders 
    WHERE total > 10000  -- Very selective, only 10 users
);
-- IN is efficient: small set to check against
```

**2. Non-Correlated Subquery:**
```sql
-- Subquery doesn't depend on outer query
SELECT *
FROM products
WHERE category_id IN (
    SELECT id 
    FROM categories 
    WHERE name IN ('Electronics', 'Books')
);
-- Subquery executes once, returns small set
-- IN is efficient
```

**3. Indexed IN List:**
```sql
-- Database can optimize IN with index
SELECT *
FROM users
WHERE email IN ('user1@example.com', 'user2@example.com', ...);
-- Small list, can use index efficiently
```

**When EXISTS is More Efficient:**

**1. Correlated Subquery:**
```sql
-- EXISTS with correlation
SELECT *
FROM users u
WHERE EXISTS (
    SELECT 1 
    FROM orders o 
    WHERE o.user_id = u.id
);
-- EXISTS can use index on orders.user_id efficiently
-- Stops at first match
```

**2. Large Subquery Result:**
```sql
-- Subquery returns many values
SELECT *
FROM users
WHERE id IN (
    SELECT user_id FROM orders  -- 500,000 values!
);
-- IN must store and check 500,000 values
-- EXISTS only needs to find first match
```

**3. Existence Check (Not Value Comparison):**
```sql
-- Just checking existence, not comparing values
SELECT *
FROM products p
WHERE EXISTS (
    SELECT 1 
    FROM order_items oi 
    WHERE oi.product_id = p.id
);
-- EXISTS is semantically correct and efficient
```

**NULL Handling Differences:**

**IN with NULLs:**

```sql
-- Problem: IN with NULLs
SELECT *
FROM users
WHERE id NOT IN (
    SELECT user_id FROM orders
    -- If user_id has any NULL values...
);
```

**What Happens:**
```sql
-- If subquery returns: [1, 2, 3, NULL]
-- NOT IN (1, 2, 3, NULL) becomes:
-- id != 1 AND id != 2 AND id != 3 AND id != NULL
-- Since id != NULL is UNKNOWN (not TRUE),
-- Entire expression is UNKNOWN
-- Result: No rows returned! (even if user 4, 5, etc. should match)
```

**Example:**
```sql
-- Users table: [1, 2, 3, 4, 5]
-- Orders table: user_id = [1, 2, NULL]

SELECT * FROM users WHERE id NOT IN (SELECT user_id FROM orders);
-- Expected: Users 3, 4, 5 (not in orders)
-- Actual: No rows! (NULL breaks NOT IN)
```

**EXISTS with NULLs:**

```sql
-- Solution: EXISTS handles NULLs correctly
SELECT *
FROM users u
WHERE NOT EXISTS (
    SELECT 1 
    FROM orders o 
    WHERE o.user_id = u.id
);
-- Works correctly even if user_id has NULLs
-- NULLs don't match, so they don't affect result
```

**Detailed Comparison Examples:**

**Example 1: Simple Existence Check**

**Using IN:**
```sql
SELECT *
FROM products
WHERE id IN (
    SELECT product_id 
    FROM order_items
);
-- Subquery: 100,000 product_ids (with duplicates)
-- Must deduplicate: 10,000 unique products
-- Check: 50,000 products against 10,000 value set
-- Time: ~1 second
```

**Using EXISTS:**
```sql
SELECT *
FROM products p
WHERE EXISTS (
    SELECT 1 
    FROM order_items oi 
    WHERE oi.product_id = p.id
);
-- For each product: index lookup
-- Stops at first match
-- Time: ~0.2 seconds
-- 5x faster!
```

**Example 2: With Additional Conditions**

**Using IN:**
```sql
SELECT *
FROM users
WHERE id IN (
    SELECT user_id 
    FROM orders 
    WHERE total > 100
      AND created_at > '2024-01-01'
);
-- Subquery executes once
-- Returns: 5,000 user_ids
-- Check: 100,000 users against 5,000 value set
```

**Using EXISTS:**
```sql
SELECT *
FROM users u
WHERE EXISTS (
    SELECT 1 
    FROM orders o 
    WHERE o.user_id = u.id
      AND o.total > 100
      AND o.created_at > '2024-01-01'
);
-- For each user: index lookup with conditions
-- Can use composite index on (user_id, total, created_at)
-- More efficient filtering
```

**Example 3: Multiple Conditions**

**Using IN (Problematic):**
```sql
-- Find users with orders > $100 AND orders in last 30 days
SELECT *
FROM users
WHERE id IN (
    SELECT user_id FROM orders WHERE total > 100
)
AND id IN (
    SELECT user_id FROM orders WHERE created_at > CURRENT_DATE - INTERVAL '30 days'
);
-- Two subqueries, two IN checks
-- Less efficient
```

**Using EXISTS (Better):**
```sql
SELECT *
FROM users u
WHERE EXISTS (
    SELECT 1 
    FROM orders o 
    WHERE o.user_id = u.id
      AND o.total > 100
      AND o.created_at > CURRENT_DATE - INTERVAL '30 days'
);
-- Single subquery with all conditions
-- More efficient
```

**EXISTS vs IN vs JOINs:**

**Comparison Table:**

| Aspect | EXISTS | IN | JOIN |
|--------|--------|----|----|
| **Execution** | Once per outer row | Once total | Single pass |
| **Efficiency** | Good with index | Good for small sets | Best for large datasets |
| **NULL Handling** | Handles NULLs correctly | NULL breaks NOT IN | Handles NULLs correctly |
| **Use Case** | Existence checks | Value membership | Need related data |
| **Result Columns** | Outer query only | Outer query only | Can include both tables |

**When to Use Each:**

**Use EXISTS When:**
- Checking existence (not comparing values)
- Correlated subquery
- Large subquery result set
- NULLs might be present
- Performance is critical

**Use IN When:**
- Small, known value set
- Non-correlated subquery
- Simple value membership
- List of literal values

**Use JOIN When:**
- Need columns from both tables
- Performance is critical
- Simple relationships
- Aggregations needed

**Example: All Three Approaches**

**Scenario:** Find users who have placed orders

**1. Using IN:**
```sql
SELECT *
FROM users
WHERE id IN (SELECT user_id FROM orders);
-- Good if orders.user_id has few distinct values
-- Problem if NULLs exist
```

**2. Using EXISTS:**
```sql
SELECT *
FROM users u
WHERE EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id);
-- Best for existence checks
-- Handles NULLs correctly
-- Efficient with index
```

**3. Using JOIN:**
```sql
SELECT DISTINCT u.*
FROM users u
INNER JOIN orders o ON u.id = o.user_id;
-- Good if you need order data too
-- May return duplicates (need DISTINCT)
-- Very efficient
```

**System Design Consideration**: Choosing between EXISTS, IN, and JOINs is crucial for:
1. **Performance**: EXISTS is often fastest for existence checks
2. **Correctness**: EXISTS handles NULLs correctly, IN doesn't with NOT IN
3. **Clarity**: Each has appropriate use cases
4. **Scalability**: EXISTS scales better for large datasets

EXISTS is generally preferred for existence checks because it's more efficient, handles NULLs correctly, and is semantically clearer. IN is good for small value sets or literal lists. JOINs are best when you need data from both tables or when performance is critical. Understanding these differences helps you write efficient, correct SQL queries.

