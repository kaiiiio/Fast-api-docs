# UNION, INTERSECT, EXCEPT: Combining Query Results

UNION, INTERSECT, and EXCEPT combine results from multiple SELECT statements. They're useful for comparing datasets, merging results, and finding differences.

## UNION: Combine Results

**UNION** combines results from multiple SELECT statements, removing duplicates.

### Basic Syntax

```sql
SELECT column1, column2 FROM table1
UNION
SELECT column1, column2 FROM table2;
```

### Basic Example

```sql
-- Combine users from two tables
SELECT id, name, email FROM users_active
UNION
SELECT id, name, email FROM users_inactive;
```

**Result:**
```
┌────┬──────┬──────────────────┐
│ id │ name │ email            │
├────┼──────┼──────────────────┤
│ 1  │ John │ john@example.com │
│ 2  │ Jane │ jane@example.com │
│ 3  │ Bob  │ bob@example.com  │
└────┴──────┴──────────────────┘
-- Duplicates removed automatically
```

### UNION ALL: Keep Duplicates

```sql
-- UNION ALL keeps all rows, including duplicates
SELECT id, name FROM users_active
UNION ALL
SELECT id, name FROM users_inactive;
```

**Difference:**
- **UNION**: Removes duplicates (slower, needs sorting)
- **UNION ALL**: Keeps duplicates (faster, no sorting)

### UNION Requirements

**Column Count Must Match:**
```sql
-- ✅ Correct: Same number of columns
SELECT id, name FROM users
UNION
SELECT id, name FROM customers;

-- ❌ Error: Different column counts
SELECT id, name, email FROM users
UNION
SELECT id, name FROM customers;  -- Error!
```

**Data Types Must Be Compatible:**
```sql
-- ✅ Correct: Compatible types
SELECT id, name FROM users
UNION
SELECT user_id, user_name FROM customers;

-- ⚠️ May work but be careful: Different types
SELECT id, created_at FROM users
UNION
SELECT id, '2024-01-01' FROM customers;  -- String vs date
```

## INTERSECT: Common Results

**INTERSECT** returns only rows that appear in both result sets.

### Basic Syntax

```sql
SELECT column1, column2 FROM table1
INTERSECT
SELECT column1, column2 FROM table2;
```

### Basic Example

```sql
-- Users who have both active and inactive orders
SELECT user_id FROM orders_active
INTERSECT
SELECT user_id FROM orders_inactive;
```

**Result:**
```
┌─────────┐
│ user_id │
├─────────┤
│ 1       │ ← User 1 has both active and inactive orders
│ 3       │ ← User 3 has both
└─────────┘
```

### Real-World Example

```sql
-- Products ordered in both January and February
SELECT product_id 
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE DATE_TRUNC('month', o.created_at) = '2024-01-01'
INTERSECT
SELECT product_id 
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE DATE_TRUNC('month', o.created_at) = '2024-02-01';
```

## EXCEPT: Difference

**EXCEPT** (or **MINUS** in some databases) returns rows from first query that don't appear in second query.

### Basic Syntax

```sql
SELECT column1, column2 FROM table1
EXCEPT
SELECT column1, column2 FROM table2;
```

### Basic Example

```sql
-- Users with active orders but no inactive orders
SELECT user_id FROM orders_active
EXCEPT
SELECT user_id FROM orders_inactive;
```

**Result:**
```
┌─────────┐
│ user_id │
├─────────┤
│ 2       │ ← User 2 has active orders but no inactive orders
│ 5       │ ← User 5 has active orders but no inactive orders
└─────────┘
```

### Real-World Example

```sql
-- Products in catalog but never ordered
SELECT id FROM products
EXCEPT
SELECT DISTINCT product_id FROM order_items;
```

## Real-World Examples

### Example 1: Merge User Lists

```sql
-- Combine users from multiple sources
SELECT 
    id,
    name,
    email,
    'source1' AS source
FROM users_source1
UNION
SELECT 
    id,
    name,
    email,
    'source2' AS source
FROM users_source2
ORDER BY id;
```

### Example 2: Find Common Customers

```sql
-- Customers who bought in both Q1 and Q2
SELECT user_id
FROM orders
WHERE DATE_TRUNC('quarter', created_at) = '2024-01-01'
INTERSECT
SELECT user_id
FROM orders
WHERE DATE_TRUNC('quarter', created_at) = '2024-04-01';
```

### Example 3: Find New Customers

```sql
-- Customers in Q2 who weren't in Q1
SELECT user_id
FROM orders
WHERE DATE_TRUNC('quarter', created_at) = '2024-04-01'
EXCEPT
SELECT user_id
FROM orders
WHERE DATE_TRUNC('quarter', created_at) = '2024-01-01';
```

### Example 4: Compare Two Datasets

```sql
-- Compare old and new product catalogs
-- Products in both
SELECT id, name FROM products_old
INTERSECT
SELECT id, name FROM products_new;

-- Products only in old (removed)
SELECT id, name FROM products_old
EXCEPT
SELECT id, name FROM products_new;

-- Products only in new (added)
SELECT id, name FROM products_new
EXCEPT
SELECT id, name FROM products_old;

-- All products (merged)
SELECT id, name FROM products_old
UNION
SELECT id, name FROM products_new;
```

### Example 5: Monthly Comparison

```sql
-- Products sold in January but not February
SELECT DISTINCT product_id
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE DATE_TRUNC('month', o.created_at) = '2024-01-01'
EXCEPT
SELECT DISTINCT product_id
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE DATE_TRUNC('month', o.created_at) = '2024-02-01';
```

## Multiple UNION Operations

### Chain Multiple Queries

```sql
-- Combine results from multiple tables
SELECT id, name, 'users' AS source FROM users
UNION
SELECT id, name, 'customers' AS source FROM customers
UNION
SELECT id, name, 'vendors' AS source FROM vendors
ORDER BY source, name;
```

### UNION with Different Columns

```sql
-- Combine with NULL for missing columns
SELECT 
    id,
    name,
    email,
    NULL AS phone
FROM users
UNION
SELECT 
    id,
    name,
    NULL AS email,
    phone
FROM customers;
```

## Performance Considerations

### 1. UNION vs UNION ALL

```sql
-- UNION: Removes duplicates (slower)
SELECT id FROM table1
UNION
SELECT id FROM table2;
-- Database must sort and deduplicate

-- UNION ALL: Keeps duplicates (faster)
SELECT id FROM table1
UNION ALL
SELECT id FROM table2;
-- No sorting, just concatenate

-- Use UNION ALL if duplicates don't matter
```

### 2. Index Usage

```sql
-- Create indexes for better performance
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_created ON orders(created_at);

-- Queries use indexes
SELECT user_id FROM orders WHERE created_at >= '2024-01-01'
UNION
SELECT user_id FROM orders WHERE created_at < '2024-01-01';
```

### 3. Limit Results Before UNION

```sql
-- ✅ Good: Limit before UNION
SELECT * FROM (
    SELECT id, name FROM users LIMIT 100
) t1
UNION
SELECT * FROM (
    SELECT id, name FROM customers LIMIT 100
) t2;

-- ❌ Less efficient: Limit after UNION
SELECT * FROM (
    SELECT id, name FROM users
    UNION
    SELECT id, name FROM customers
) combined
LIMIT 100;
```

## Common Patterns

### Pattern 1: Data Reconciliation

```sql
-- Find differences between two tables
-- In table1 but not table2
SELECT id, name FROM table1
EXCEPT
SELECT id, name FROM table2;

-- In table2 but not table1
SELECT id, name FROM table2
EXCEPT
SELECT id, name FROM table1;

-- In both
SELECT id, name FROM table1
INTERSECT
SELECT id, name FROM table2;
```

### Pattern 2: Time-Based Comparison

```sql
-- Customers who ordered in both months
SELECT user_id
FROM orders
WHERE DATE_TRUNC('month', created_at) = '2024-01-01'
INTERSECT
SELECT user_id
FROM orders
WHERE DATE_TRUNC('month', created_at) = '2024-02-01';
```

### Pattern 3: Category Analysis

```sql
-- Products in multiple categories (using UNION to find all)
SELECT product_id FROM product_categories WHERE category_id = 1
UNION
SELECT product_id FROM product_categories WHERE category_id = 2;
-- Products in category 1 OR category 2
```

## Best Practices

1. **Use UNION ALL**: When duplicates don't matter (faster)
2. **Match Column Counts**: All SELECTs must have same number of columns
3. **Compatible Types**: Ensure data types are compatible
4. **Index Columns**: For better performance
5. **Limit Before UNION**: When possible, limit individual queries

## Common Mistakes

### ❌ Different Column Counts

```sql
-- ❌ Error: Different column counts
SELECT id, name FROM users
UNION
SELECT id FROM customers;  -- Error!

-- ✅ Correct: Same column counts
SELECT id, name FROM users
UNION
SELECT id, name FROM customers;
```

### ❌ Incompatible Data Types

```sql
-- ⚠️ May cause issues: Different types
SELECT id, created_at FROM users
UNION
SELECT id, 'text' FROM customers;  -- Date vs string

-- ✅ Better: Ensure compatible types
SELECT id, created_at::text FROM users
UNION
SELECT id, 'text' FROM customers;
```

### ❌ Using UNION Instead of JOIN

```sql
-- ❌ Wrong: Using UNION to combine related data
SELECT user_id, order_id FROM users
UNION
SELECT user_id, order_id FROM orders;
-- This doesn't join, just combines rows

-- ✅ Correct: Use JOIN for related data
SELECT u.id, o.id
FROM users u
JOIN orders o ON u.id = o.user_id;
```

## Summary

**UNION, INTERSECT, EXCEPT:**

1. **UNION**: Combines results, removes duplicates
2. **UNION ALL**: Combines results, keeps duplicates (faster)
3. **INTERSECT**: Returns common rows from both queries
4. **EXCEPT**: Returns rows from first query not in second
5. **Requirements**: Same column count, compatible types
6. **Performance**: UNION ALL is faster than UNION

**Key Takeaway:**
UNION combines results from multiple queries, INTERSECT finds common rows, and EXCEPT finds differences. Use UNION ALL when duplicates don't matter for better performance. Ensure all queries have the same column count and compatible data types.

**When to Use:**
- **UNION**: Merge results from multiple sources
- **INTERSECT**: Find common records
- **EXCEPT**: Find differences between datasets
- **UNION ALL**: When duplicates are acceptable (faster)

**Common Use Cases:**
- Merging user lists
- Comparing datasets
- Finding new/removed records
- Time-based comparisons

**Next Steps:**
- Learn [Subqueries](subqueries.md) for nested queries
- Study [CTEs](ctes.md) for complex queries
- Master [Performance Optimization](../10_performance_optimization/) for query tuning

