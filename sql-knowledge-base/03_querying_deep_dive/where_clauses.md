# WHERE Clauses: Filtering Data

The WHERE clause filters rows based on specified conditions. It's one of the most fundamental and important SQL features.

## Basic WHERE Syntax

```sql
SELECT column1, column2, ...
FROM table_name
WHERE condition;
```

## Comparison Operators

### Basic Comparisons

```sql
-- Equal
SELECT * FROM users WHERE id = 1;

-- Not equal
SELECT * FROM users WHERE id != 1;
-- or
SELECT * FROM users WHERE id <> 1;

-- Greater than
SELECT * FROM products WHERE price > 100;

-- Less than
SELECT * FROM products WHERE price < 50;

-- Greater than or equal
SELECT * FROM products WHERE price >= 100;

-- Less than or equal
SELECT * FROM products WHERE price <= 50;
```

## Logical Operators

### AND

```sql
-- Multiple conditions (all must be true)
SELECT * FROM users
WHERE is_active = true
  AND created_at >= '2024-01-01';
```

### OR

```sql
-- Multiple conditions (any can be true)
SELECT * FROM users
WHERE role = 'admin'
   OR role = 'moderator';
```

### NOT

```sql
-- Negate condition
SELECT * FROM users
WHERE NOT is_active = true;

-- Equivalent to
SELECT * FROM users
WHERE is_active = false;
```

### Combining AND, OR, NOT

```sql
-- Complex conditions with parentheses
SELECT * FROM users
WHERE (role = 'admin' OR role = 'moderator')
  AND is_active = true
  AND created_at >= '2024-01-01';
```

## IN Operator

### Basic IN

```sql
-- Check if value is in list
SELECT * FROM users
WHERE id IN (1, 2, 3, 5, 8);

-- Equivalent to
SELECT * FROM users
WHERE id = 1 OR id = 2 OR id = 3 OR id = 5 OR id = 8;
```

### IN with Subquery

```sql
-- Users who have placed orders
SELECT * FROM users
WHERE id IN (
    SELECT DISTINCT user_id FROM orders
);
```

### NOT IN

```sql
-- Users who haven't placed orders
SELECT * FROM users
WHERE id NOT IN (
    SELECT DISTINCT user_id FROM orders
);
```

## BETWEEN Operator

### Numeric Ranges

```sql
-- Products in price range
SELECT * FROM products
WHERE price BETWEEN 50 AND 100;

-- Equivalent to
SELECT * FROM products
WHERE price >= 50 AND price <= 100;
```

### Date Ranges

```sql
-- Orders in date range
SELECT * FROM orders
WHERE created_at BETWEEN '2024-01-01' AND '2024-12-31';
```

### NOT BETWEEN

```sql
-- Products outside price range
SELECT * FROM products
WHERE price NOT BETWEEN 50 AND 100;
```

## LIKE Operator

### Pattern Matching

```sql
-- Names starting with 'John'
SELECT * FROM users
WHERE name LIKE 'John%';

-- Names ending with 'Doe'
SELECT * FROM users
WHERE name LIKE '%Doe';

-- Names containing 'John'
SELECT * FROM users
WHERE name LIKE '%John%';
```

### Wildcards

- `%`: Matches any sequence of characters
- `_`: Matches any single character

```sql
-- Names with exactly 5 characters, starting with 'J'
SELECT * FROM users
WHERE name LIKE 'J____';

-- Emails from specific domain
SELECT * FROM users
WHERE email LIKE '%@example.com';
```

### Case Sensitivity

```sql
-- PostgreSQL: ILIKE (case-insensitive)
SELECT * FROM users
WHERE name ILIKE 'john%';

-- MySQL: Use LOWER() or UPPER()
SELECT * FROM users
WHERE LOWER(name) LIKE 'john%';
```

## NULL Handling

### IS NULL

```sql
-- Users without email
SELECT * FROM users
WHERE email IS NULL;
```

### IS NOT NULL

```sql
-- Users with email
SELECT * FROM users
WHERE email IS NOT NULL;
```

### NULL with Comparisons

```sql
-- ❌ Wrong: NULL comparisons don't work
SELECT * FROM users WHERE email = NULL;  -- Always false!

-- ✅ Correct: Use IS NULL
SELECT * FROM users WHERE email IS NULL;
```

## Real-World Examples

### Example 1: User Search

```sql
-- Search users by multiple criteria
SELECT * FROM users
WHERE 
    (name LIKE '%john%' OR email LIKE '%john%')
    AND is_active = true
    AND created_at >= '2024-01-01';
```

### Example 2: Product Filtering

```sql
-- Filter products
SELECT * FROM products
WHERE 
    category_id IN (1, 2, 3)
    AND price BETWEEN 50 AND 200
    AND stock_quantity > 0
    AND status = 'active';
```

### Example 3: Order History

```sql
-- Recent completed orders
SELECT * FROM orders
WHERE 
    user_id = 1
    AND status = 'completed'
    AND created_at BETWEEN '2024-01-01' AND CURRENT_DATE;
```

## Performance Tips

### 1. Index WHERE Columns

```sql
-- Create index on filtered columns
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- Queries use indexes
SELECT * FROM users WHERE email = 'user@example.com';
SELECT * FROM orders WHERE user_id = 1 AND status = 'completed';
```

### 2. Avoid Functions on Columns

```sql
-- ❌ Bad: Function prevents index usage
SELECT * FROM users
WHERE LOWER(email) = 'user@example.com';

-- ✅ Good: Index can be used
SELECT * FROM users
WHERE email = 'user@example.com';
```

### 3. Use Specific Conditions First

```sql
-- ✅ Good: Most selective condition first
SELECT * FROM orders
WHERE user_id = 1  -- Specific (uses index)
  AND status = 'completed'
  AND created_at >= '2024-01-01';
```

## Common Patterns

### Pattern 1: Active Records

```sql
-- Get active records
SELECT * FROM users
WHERE is_active = true
  AND deleted_at IS NULL;
```

### Pattern 2: Recent Records

```sql
-- Records from last 30 days
SELECT * FROM orders
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';
```

### Pattern 3: Multiple Values

```sql
-- Filter by multiple values
SELECT * FROM products
WHERE category_id IN (1, 2, 3)
  AND status IN ('active', 'featured');
```

## Best Practices

1. **Use Indexes**: Index columns in WHERE clauses
2. **Avoid Functions**: Don't use functions on indexed columns
3. **Be Specific**: Use most selective conditions first
4. **Use IN**: For multiple OR conditions
5. **Handle NULL**: Use IS NULL, not = NULL

## Summary

**WHERE Clause Essentials:**

1. **Purpose**: Filter rows based on conditions
2. **Operators**: =, !=, >, <, >=, <=, IN, BETWEEN, LIKE
3. **Logical**: AND, OR, NOT
4. **NULL**: IS NULL, IS NOT NULL
5. **Performance**: Index WHERE columns, avoid functions

**Key Takeaway:**
WHERE clauses are essential for filtering data. Use appropriate operators, combine conditions with AND/OR, handle NULL correctly, and always index WHERE columns for performance.

**Common Use Cases:**
- Filter by ID: `WHERE id = 1`
- Range queries: `WHERE price BETWEEN 50 AND 100`
- Pattern matching: `WHERE name LIKE '%john%'`
- Multiple conditions: `WHERE condition1 AND condition2`

**Next Steps:**
- Learn [Filtering](filtering.md) for advanced patterns
- Study [ORDER BY](order_by.md) for sorting
- Master [Indexes](../08_indexes/what_is_index.md) for performance

