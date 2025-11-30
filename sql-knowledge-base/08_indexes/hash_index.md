# Hash Index: Fast Equality Lookups

Hash indexes provide O(1) average-case lookups for equality queries. They're faster than B-Tree for exact matches but don't support range queries.

## What is a Hash Index?

**Hash index** uses a hash table structure where keys are hashed to determine storage location. It provides very fast equality lookups but doesn't support range queries or sorting.

### Key Characteristics

- **Fast Lookups**: O(1) average case for equality
- **No Range Queries**: Only supports equality (=)
- **No Sorting**: Can't be used for ORDER BY
- **Memory Efficient**: Good for in-memory databases

## Hash Index Structure

### Hash Table

```
Hash Function: h(key) → bucket_index

Buckets:
[0] → [key1, key2, ...]
[1] → [key3, ...]
[2] → [key4, key5, ...]
...
[n] → [key6, ...]
```

### How It Works

```sql
-- Hash index lookup
-- 1. Hash the key: h('user@example.com') → 42
-- 2. Go to bucket 42
-- 3. Search bucket for exact match
-- 4. Follow pointer to row
```

## Hash Index in Databases

### PostgreSQL

```sql
-- Create hash index
CREATE INDEX idx_users_email_hash ON users USING hash(email);

-- Query uses hash index
EXPLAIN SELECT * FROM users WHERE email = 'user@example.com';
-- Index Scan using idx_users_email_hash
```

### MySQL (InnoDB)

```sql
-- MySQL InnoDB uses adaptive hash index automatically
-- For frequently accessed index pages
-- No explicit hash index creation needed
```

## When to Use Hash Index

### ✅ Good Use Cases

```sql
-- ✅ Equality queries only
SELECT * FROM users WHERE email = 'user@example.com';

-- ✅ Exact match lookups
SELECT * FROM products WHERE sku = 'ABC123';

-- ✅ Primary key lookups (if supported)
SELECT * FROM users WHERE id = 1;
```

### ❌ Not Suitable For

```sql
-- ❌ Range queries
SELECT * FROM users WHERE age BETWEEN 18 AND 65;  -- Not supported

-- ❌ Comparison operators
SELECT * FROM users WHERE created_at > '2023-01-01';  -- Not supported

-- ❌ ORDER BY
SELECT * FROM users ORDER BY email;  -- Not supported

-- ❌ LIKE queries
SELECT * FROM users WHERE email LIKE 'user%@example.com';  -- Not supported
```

## Hash Index vs B-Tree

### Performance Comparison

```sql
-- Hash Index: O(1) average
SELECT * FROM users WHERE email = 'user@example.com';
-- Very fast for exact matches

-- B-Tree: O(log n)
SELECT * FROM users WHERE email = 'user@example.com';
-- Fast, but slightly slower than hash
```

### Feature Comparison

| Feature | Hash Index | B-Tree Index |
|---------|-----------|--------------|
| Equality (=) | ✅ O(1) | ✅ O(log n) |
| Range (>, <, BETWEEN) | ❌ No | ✅ Yes |
| ORDER BY | ❌ No | ✅ Yes |
| LIKE (prefix) | ❌ No | ✅ Yes |
| Memory Usage | Lower | Higher |

## Real-World Examples

### Example 1: User Lookup

```sql
-- Hash index for exact email lookup
CREATE INDEX idx_users_email_hash ON users USING hash(email);

-- Fast equality query
SELECT * FROM users WHERE email = 'user@example.com';
-- Uses hash index, very fast
```

### Example 2: Product SKU

```sql
-- Hash index for SKU lookup
CREATE INDEX idx_products_sku_hash ON products USING hash(sku);

-- Exact SKU lookup
SELECT * FROM products WHERE sku = 'ABC123';
-- Uses hash index
```

## Hash Collisions

### What are Collisions?

```
Hash function maps different keys to same bucket:
h('key1') → 5
h('key2') → 5  -- Collision!

Bucket 5: [key1, key2]
```

### Handling Collisions

```sql
-- Common methods:
-- 1. Chaining: Linked list in bucket
-- 2. Open addressing: Find next available slot

-- Chaining example:
Bucket 5: [key1 → key2 → key3]
```

## Limitations

### No Range Queries

```sql
-- ❌ Hash index can't help
SELECT * FROM users WHERE age BETWEEN 18 AND 65;

-- Must use B-Tree index
CREATE INDEX idx_users_age ON users(age);  -- B-Tree
```

### No Sorting

```sql
-- ❌ Hash index can't help
SELECT * FROM users ORDER BY email;

-- Must use B-Tree index
CREATE INDEX idx_users_email ON users(email);  -- B-Tree
```

## Best Practices

1. **Use for Equality Only**: Hash indexes only for exact matches
2. **Consider B-Tree**: If you need range queries or sorting
3. **Monitor Collisions**: Too many collisions degrade performance
4. **PostgreSQL Note**: Hash indexes not crash-safe before PostgreSQL 10
5. **MySQL**: Uses adaptive hash index automatically

## When to Choose Hash vs B-Tree

### Choose Hash When:

- ✅ Only equality queries (=)
- ✅ Very high lookup frequency
- ✅ No need for range queries
- ✅ No need for sorting

### Choose B-Tree When:

- ✅ Need range queries (>, <, BETWEEN)
- ✅ Need ORDER BY
- ✅ Need LIKE (prefix)
- ✅ General-purpose indexing

## Summary

**Hash Index:**

1. **Type**: Hash table structure
2. **Performance**: O(1) average for equality
3. **Limitations**: No range queries, no sorting
4. **Use Cases**: Exact match lookups only
5. **Trade-off**: Speed vs flexibility

**Key Takeaway:**
Hash indexes provide very fast O(1) equality lookups but don't support range queries or sorting. Use hash indexes when you only need exact match queries and performance is critical. For most use cases, B-Tree indexes are more versatile and are the better choice.

**When to Use:**
- Exact match lookups only
- Very high query frequency
- No range or sorting needs

**Next Steps:**
- Learn [B-Tree Index](b_tree_index.md) for general-purpose indexing
- Study [Index Selectivity](index_selectivity.md) for optimization
- Master [Query Optimization](../10_performance_optimization/) for performance

