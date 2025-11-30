# CROSS JOIN: Cartesian Product

CROSS JOIN returns the Cartesian product of two tables - every row from the first table combined with every row from the second table.

## What is CROSS JOIN?

**CROSS JOIN** combines every row from the first table with every row from the second table, creating all possible combinations.

### Visual Representation

```
Table A        Table B
┌────┬───┐     ┌────┬───┐
│ id │ x │     │ id │ y │
├────┼───┤     ├────┼───┤
│ 1  │ A │     │ 1  │ X │
│ 2  │ B │     │ 2  │ Y │
└────┴───┘     └────┴───┘

CROSS JOIN Result:
┌────┬───┬────┬───┐
│ id │ x │ id │ y │
├────┼───┼────┼───┤
│ 1  │ A │ 1  │ X │
│ 1  │ A │ 2  │ Y │
│ 2  │ B │ 1  │ X │
│ 2  │ B │ 2  │ Y │
└────┴───┴────┴───┘
-- 2 rows × 2 rows = 4 rows
```

## Basic Syntax

```sql
-- Explicit CROSS JOIN
SELECT *
FROM table1
CROSS JOIN table2;

-- Implicit CROSS JOIN (comma)
SELECT *
FROM table1, table2;
```

## Basic Example

```sql
-- Cross join users and products
SELECT 
    u.name AS user_name,
    p.name AS product_name
FROM users u
CROSS JOIN products p;
```

**Result:**
- If users has 100 rows and products has 50 rows
- Result: 100 × 50 = 5,000 rows

## Real-World Use Cases

### Use Case 1: Generate Combinations

```sql
-- Generate all size-color combinations
SELECT 
    s.size_name,
    c.color_name
FROM sizes s
CROSS JOIN colors c;
```

**Result:**
```
┌───────────┬────────────┐
│ size_name │ color_name │
├───────────┼────────────┤
│ Small     │ Red        │
│ Small     │ Blue       │
│ Small     │ Green      │
│ Medium    │ Red        │
│ Medium    │ Blue       │
│ Medium    │ Green      │
│ Large     │ Red        │
│ Large     │ Blue       │
│ Large     │ Green      │
└───────────┴────────────┘
```

### Use Case 2: Generate Test Data

```sql
-- Generate test data combinations
SELECT 
    u.id AS user_id,
    p.id AS product_id,
    RANDOM() AS rating
FROM (SELECT id FROM users LIMIT 10) u
CROSS JOIN (SELECT id FROM products LIMIT 5) p;
```

### Use Case 3: Date Ranges

```sql
-- Generate date range combinations
SELECT 
    d.date,
    u.id AS user_id
FROM generate_series('2024-01-01'::date, '2024-12-31'::date, '1 day') d
CROSS JOIN users u;
```

## CROSS JOIN with WHERE

### Filtering Results

```sql
-- Cross join with condition (becomes INNER JOIN)
SELECT 
    u.name,
    p.name
FROM users u
CROSS JOIN products p
WHERE u.id = 1;  -- Filter to specific user
```

**Note:** CROSS JOIN with WHERE is effectively an INNER JOIN.

## Performance Warning

### CROSS JOIN Can Be Expensive

```sql
-- ⚠️ Warning: Large result sets
SELECT *
FROM users u
CROSS JOIN products p;
-- If users has 10,000 rows and products has 1,000 rows
-- Result: 10,000,000 rows!
```

### Always Use LIMIT

```sql
-- ✅ Good: Limit results
SELECT *
FROM users u
CROSS JOIN products p
LIMIT 100;
```

## Common Patterns

### Pattern 1: Generate Combinations

```sql
-- All possible combinations
SELECT 
    category.name AS category,
    size.name AS size
FROM categories category
CROSS JOIN sizes size;
```

### Pattern 2: Test Data

```sql
-- Generate test combinations
SELECT 
    test_user.id AS user_id,
    test_product.id AS product_id
FROM (SELECT id FROM users LIMIT 5) test_user
CROSS JOIN (SELECT id FROM products LIMIT 3) test_product;
```

## When NOT to Use CROSS JOIN

### ❌ Usually Wrong

```sql
-- ❌ Wrong: Usually you want INNER JOIN
SELECT 
    u.name,
    o.total
FROM users u
CROSS JOIN orders o
WHERE u.id = o.user_id;  -- Should use INNER JOIN instead!

-- ✅ Correct: Use INNER JOIN
SELECT 
    u.name,
    o.total
FROM users u
INNER JOIN orders o ON u.id = o.user_id;
```

## Best Practices

1. **Use Sparingly**: CROSS JOIN creates large result sets
2. **Always LIMIT**: When testing or generating data
3. **Consider Alternatives**: Usually INNER JOIN is what you want
4. **Understand Size**: Result = rows1 × rows2
5. **Use for Combinations**: When you need all combinations

## Summary

**CROSS JOIN Essentials:**

1. **Purpose**: Cartesian product (all combinations)
2. **Result Size**: rows1 × rows2
3. **Use Cases**: Generate combinations, test data
4. **Warning**: Can create very large result sets
5. **Best Practice**: Use LIMIT, consider alternatives

**Key Takeaway:**
CROSS JOIN returns all possible combinations of rows from two tables. Use it sparingly for generating combinations or test data. Be aware it can create very large result sets. Usually, you want INNER JOIN instead.

**When to Use:**
- Generate all combinations
- Create test data
- Date range combinations
- Size/color matrices

**When NOT to Use:**
- Joining related tables (use INNER JOIN)
- Most real-world queries
- Large tables without LIMIT

**Next Steps:**
- Learn [INNER JOIN](inner_join.md) for related data
- Study [Self Join](self_join.md) for same-table joins
- Master [Performance Optimization](../10_performance_optimization/) for large queries

