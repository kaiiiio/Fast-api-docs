# Advanced Filtering: AND, OR, IN, BETWEEN, LIKE

Advanced filtering techniques using AND, OR, IN, BETWEEN, and LIKE operators for complex query conditions.

## AND Operator

### Basic AND

```sql
-- All conditions must be true
SELECT * FROM users
WHERE is_active = true
  AND role = 'admin'
  AND created_at >= '2024-01-01';
```

### Multiple AND Conditions

```sql
-- Complex AND conditions
SELECT * FROM products
WHERE category_id = 1
  AND price >= 50
  AND price <= 200
  AND stock_quantity > 0
  AND status = 'active';
```

## OR Operator

### Basic OR

```sql
-- Any condition can be true
SELECT * FROM users
WHERE role = 'admin'
   OR role = 'moderator';
```

### Multiple OR Conditions

```sql
-- Multiple OR conditions
SELECT * FROM products
WHERE category_id = 1
   OR category_id = 2
   OR category_id = 3;
```

### OR with IN

```sql
-- OR is equivalent to IN
SELECT * FROM products
WHERE category_id IN (1, 2, 3);

-- Same as:
SELECT * FROM products
WHERE category_id = 1
   OR category_id = 2
   OR category_id = 3;
```

## Combining AND and OR

### With Parentheses

```sql
-- Complex logic with parentheses
SELECT * FROM users
WHERE (role = 'admin' OR role = 'moderator')
  AND is_active = true
  AND created_at >= '2024-01-01';
```

### Without Parentheses (Wrong)

```sql
-- ❌ Wrong: AND has higher precedence
SELECT * FROM users
WHERE role = 'admin' OR role = 'moderator' AND is_active = true;
-- Evaluates as: role = 'admin' OR (role = 'moderator' AND is_active = true)
-- Not what you want!

-- ✅ Correct: Use parentheses
SELECT * FROM users
WHERE (role = 'admin' OR role = 'moderator') AND is_active = true;
```

## IN Operator

### Basic IN

```sql
-- Check if value is in list
SELECT * FROM users
WHERE id IN (1, 2, 3, 5, 8);
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

### Performance: IN vs Multiple OR

```sql
-- ✅ Good: IN is cleaner and often faster
SELECT * FROM products
WHERE category_id IN (1, 2, 3, 4, 5);

-- ⚠️ Less efficient: Multiple ORs
SELECT * FROM products
WHERE category_id = 1
   OR category_id = 2
   OR category_id = 3
   OR category_id = 4
   OR category_id = 5;
```

## BETWEEN Operator

### Numeric Ranges

```sql
-- Products in price range
SELECT * FROM products
WHERE price BETWEEN 50 AND 100;
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

### BETWEEN is Inclusive

```sql
-- BETWEEN includes both endpoints
SELECT * FROM products
WHERE price BETWEEN 50 AND 100;
-- Includes products with price = 50 and price = 100
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

- `%`: Matches any sequence of characters (0 or more)
- `_`: Matches any single character

```sql
-- Names with exactly 5 characters, starting with 'J'
SELECT * FROM users
WHERE name LIKE 'J____';

-- Emails from specific domain
SELECT * FROM users
WHERE email LIKE '%@example.com';

-- Phone numbers with pattern
SELECT * FROM users
WHERE phone LIKE '555-___-____';
```

### Case-Insensitive LIKE

**PostgreSQL:**
```sql
-- ILIKE (case-insensitive)
SELECT * FROM users
WHERE name ILIKE 'john%';
```

**MySQL:**
```sql
-- Use LOWER() or UPPER()
SELECT * FROM users
WHERE LOWER(name) LIKE 'john%';
```

### Escaping Special Characters

```sql
-- Search for literal % or _
SELECT * FROM products
WHERE name LIKE '%\%%' ESCAPE '\';  -- Names containing %

SELECT * FROM products
WHERE name LIKE '%\_%' ESCAPE '\';  -- Names containing _
```

## Real-World Examples

### Example 1: User Search

```sql
-- Search users by name or email
SELECT * FROM users
WHERE 
    (name LIKE '%john%' OR email LIKE '%john%')
    AND is_active = true
    AND created_at >= '2024-01-01';
```

### Example 2: Product Filtering

```sql
-- Complex product filtering
SELECT * FROM products
WHERE 
    category_id IN (1, 2, 3)
    AND price BETWEEN 50 AND 200
    AND (name LIKE '%laptop%' OR description LIKE '%laptop%')
    AND stock_quantity > 0
    AND status = 'active';
```

### Example 3: Order History

```sql
-- Recent orders with multiple statuses
SELECT * FROM orders
WHERE 
    user_id = 1
    AND status IN ('completed', 'shipped', 'delivered')
    AND created_at BETWEEN '2024-01-01' AND CURRENT_DATE
    AND total >= 50;
```

### Example 4: Advanced Search

```sql
-- Multi-criteria search
SELECT * FROM users
WHERE 
    (
        name LIKE '%search%'
        OR email LIKE '%search%'
        OR phone LIKE '%search%'
    )
    AND (role = 'admin' OR role = 'user')
    AND is_active = true
    AND created_at BETWEEN '2024-01-01' AND CURRENT_DATE;
```

## Performance Considerations

### 1. Index IN Columns

```sql
-- Create index for IN queries
CREATE INDEX idx_products_category ON products(category_id);

-- Query uses index
SELECT * FROM products
WHERE category_id IN (1, 2, 3);
```

### 2. LIKE Performance

```sql
-- ✅ Good: LIKE with prefix (can use index)
SELECT * FROM users
WHERE email LIKE 'user@%';  -- Prefix match

-- ❌ Bad: LIKE with wildcard at start (can't use index)
SELECT * FROM users
WHERE email LIKE '%@example.com';  -- Full table scan
```

### 3. BETWEEN with Indexes

```sql
-- Create index for range queries
CREATE INDEX idx_orders_created ON orders(created_at);

-- Query uses index
SELECT * FROM orders
WHERE created_at BETWEEN '2024-01-01' AND '2024-12-31';
```

## Common Patterns

### Pattern 1: Multiple Categories

```sql
-- Products in multiple categories
SELECT * FROM products
WHERE category_id IN (1, 2, 3);
```

### Pattern 2: Price Range

```sql
-- Products in price range
SELECT * FROM products
WHERE price BETWEEN :min_price AND :max_price;
```

### Pattern 3: Text Search

```sql
-- Search across multiple fields
SELECT * FROM products
WHERE 
    name LIKE '%search%'
    OR description LIKE '%search%'
    OR tags LIKE '%search%';
```

### Pattern 4: Status Filtering

```sql
-- Multiple statuses
SELECT * FROM orders
WHERE status IN ('pending', 'processing', 'shipped');
```

## Best Practices

1. **Use IN**: Instead of multiple ORs
2. **Use Parentheses**: When combining AND and OR
3. **Index Columns**: For IN, BETWEEN, and prefix LIKE
4. **Avoid Leading Wildcards**: In LIKE patterns
5. **Be Specific**: Most selective conditions first

## Summary

**Advanced Filtering:**

1. **AND**: All conditions must be true
2. **OR**: Any condition can be true
3. **IN**: Check if value in list
4. **BETWEEN**: Range queries (inclusive)
5. **LIKE**: Pattern matching with wildcards

**Key Takeaway:**
Advanced filtering allows complex query conditions. Use AND/OR with parentheses for correct logic, IN for multiple values, BETWEEN for ranges, and LIKE for pattern matching. Always index filtered columns for performance.

**Common Patterns:**
- Multiple values: `WHERE id IN (1, 2, 3)`
- Ranges: `WHERE price BETWEEN 50 AND 100`
- Patterns: `WHERE name LIKE '%john%'`
- Complex: `WHERE (condition1 OR condition2) AND condition3`

**Next Steps:**
- Learn [WHERE Clauses](where_clauses.md) for basics
- Study [ORDER BY](order_by.md) for sorting
- Master [Indexes](../08_indexes/what_is_index.md) for performance

