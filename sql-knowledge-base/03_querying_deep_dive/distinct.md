# DISTINCT: Removing Duplicate Rows

DISTINCT removes duplicate rows from query results, returning only unique values.

## Basic DISTINCT Syntax

```sql
SELECT DISTINCT column1, column2, ...
FROM table_name;
```

## Single Column DISTINCT

### Basic Usage

```sql
-- Get unique categories
SELECT DISTINCT category_id
FROM products;
```

### With ORDER BY

```sql
-- Unique categories, sorted
SELECT DISTINCT category_id
FROM products
ORDER BY category_id;
```

## Multiple Column DISTINCT

### Distinct Combinations

```sql
-- Unique combinations of user_id and status
SELECT DISTINCT user_id, status
FROM orders;
```

**Result:**
```
┌─────────┬────────────┐
│ user_id │ status     │
├─────────┼────────────┤
│ 1       │ pending    │
│ 1       │ completed  │
│ 2       │ pending    │
│ 2       │ completed  │
└─────────┴────────────┘
```

## DISTINCT with Aggregates

### COUNT DISTINCT

```sql
-- Count unique users
SELECT COUNT(DISTINCT user_id)
FROM orders;
```

### Other Aggregates

```sql
-- Average price per unique category
SELECT 
    category_id,
    AVG(DISTINCT price) AS avg_price
FROM products
GROUP BY category_id;
```

## Real-World Examples

### Example 1: Unique Values

```sql
-- All unique user emails
SELECT DISTINCT email
FROM users;
```

### Example 2: Unique Combinations

```sql
-- Unique user-product combinations
SELECT DISTINCT user_id, product_id
FROM order_items;
```

### Example 3: Count Unique

```sql
-- Number of unique customers
SELECT COUNT(DISTINCT user_id) AS unique_customers
FROM orders;
```

## Performance Considerations

### DISTINCT Can Be Expensive

```sql
-- DISTINCT requires sorting/grouping
SELECT DISTINCT name
FROM users;
-- Database must compare all rows
```

### Use GROUP BY Instead

```sql
-- ✅ Often faster: GROUP BY
SELECT name
FROM users
GROUP BY name;

-- ⚠️ May be slower: DISTINCT
SELECT DISTINCT name
FROM users;
```

## Common Patterns

### Pattern 1: Unique List

```sql
-- Get unique list of values
SELECT DISTINCT category_name
FROM products;
```

### Pattern 2: Count Unique

```sql
-- Count unique values
SELECT COUNT(DISTINCT user_id)
FROM orders;
```

### Pattern 3: Unique Combinations

```sql
-- Unique pairs
SELECT DISTINCT user_id, product_id
FROM order_items;
```

## Best Practices

1. **Use When Needed**: Only when duplicates matter
2. **Consider GROUP BY**: May be faster
3. **Index Columns**: For better performance
4. **Avoid with Large Tables**: Can be slow

## Summary

**DISTINCT Essentials:**

1. **Purpose**: Remove duplicate rows
2. **Syntax**: `SELECT DISTINCT column`
3. **Multiple Columns**: Unique combinations
4. **Performance**: Can be expensive on large tables
5. **Alternative**: GROUP BY may be faster

**Key Takeaway:**
DISTINCT removes duplicate rows. Use for unique values or combinations. Be aware it can be expensive on large tables. Consider GROUP BY as an alternative.

**Common Use Cases:**
- Unique values: `SELECT DISTINCT category_id`
- Count unique: `SELECT COUNT(DISTINCT user_id)`
- Unique combinations: `SELECT DISTINCT col1, col2`

**Next Steps:**
- Learn [GROUP BY](../05_aggregations_grouping/group_by.md) for grouping
- Study [Aliases](aliases.md) for column naming
- Master [Performance Optimization](../10_performance_optimization/) for tuning

