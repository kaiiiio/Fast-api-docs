# Bulk Inserts & Bulk Updates: Efficient Batch Operations

Bulk operations process multiple rows in a single statement, dramatically improving performance compared to individual operations. Essential for data imports, migrations, and batch processing.

## Bulk INSERT

### Basic Bulk Insert

```sql
-- Insert multiple rows at once
INSERT INTO users (name, email)
VALUES 
    ('John Doe', 'john@example.com'),
    ('Jane Smith', 'jane@example.com'),
    ('Bob Johnson', 'bob@example.com');
```

### Performance Comparison

```sql
-- ❌ Slow: Individual inserts (3 round trips)
INSERT INTO users (name, email) VALUES ('John', 'john@example.com');
INSERT INTO users (name, email) VALUES ('Jane', 'jane@example.com');
INSERT INTO users (name, email) VALUES ('Bob', 'bob@example.com');

-- ✅ Fast: Bulk insert (1 round trip)
INSERT INTO users (name, email)
VALUES 
    ('John', 'john@example.com'),
    ('Jane', 'jane@example.com'),
    ('Bob', 'bob@example.com');
```

### Large Batch Insert

```sql
-- Insert 1000 rows at once
INSERT INTO products (name, price, category_id)
VALUES 
    ('Product 1', 99.99, 1),
    ('Product 2', 149.99, 1),
    -- ... 998 more rows ...
    ('Product 1000', 79.99, 2);
```

## INSERT from SELECT

### Copy from Another Table

```sql
-- Insert from SELECT (bulk copy)
INSERT INTO users_archive (id, name, email, created_at)
SELECT id, name, email, created_at
FROM users
WHERE created_at < '2020-01-01';
```

### Transform During Insert

```sql
-- Insert with transformation
INSERT INTO products (name, price, category_id)
SELECT 
    name,
    price * 1.1 AS new_price,  -- 10% increase
    category_id
FROM old_products
WHERE status = 'active';
```

## Bulk UPDATE

### Update Multiple Rows

```sql
-- Update multiple rows with same value
UPDATE products
SET price = price * 1.1
WHERE category_id = 1;
```

### Conditional Bulk Update

```sql
-- Update with CASE (different values)
UPDATE products
SET price = CASE
    WHEN category_id = 1 THEN price * 1.1
    WHEN category_id = 2 THEN price * 1.15
    WHEN category_id = 3 THEN price * 1.2
    ELSE price
END
WHERE category_id IN (1, 2, 3);
```

### Update from Another Table

```sql
-- Update from JOIN
UPDATE products p
SET price = o.avg_price
FROM (
    SELECT product_id, AVG(price) AS avg_price
    FROM order_items
    GROUP BY product_id
) o
WHERE p.id = o.product_id;
```

## Real-World Examples

### Example 1: Data Import

```sql
-- Import users from CSV (application level)
-- Build bulk INSERT
INSERT INTO users (name, email, created_at)
VALUES 
    ('User 1', 'user1@example.com', '2024-01-01'),
    ('User 2', 'user2@example.com', '2024-01-02'),
    -- ... 1000 rows ...
    ('User 1000', 'user1000@example.com', '2024-01-1000');
```

### Example 2: Price Update

```sql
-- Bulk price update by category
UPDATE products
SET 
    price = CASE category_id
        WHEN 1 THEN price * 1.1
        WHEN 2 THEN price * 1.15
        WHEN 3 THEN price * 1.2
    END,
    updated_at = CURRENT_TIMESTAMP
WHERE category_id IN (1, 2, 3);
```

### Example 3: Status Migration

```sql
-- Bulk status update
UPDATE orders
SET 
    status = CASE
        WHEN payment_status = 'paid' AND shipped_at IS NOT NULL THEN 'delivered'
        WHEN payment_status = 'paid' AND shipped_at IS NULL THEN 'shipped'
        WHEN payment_status = 'pending' THEN 'processing'
        ELSE status
    END,
    updated_at = CURRENT_TIMESTAMP
WHERE status = 'pending';
```

## Performance Optimization

### Batch Size

```sql
-- ✅ Good: Reasonable batch size (100-1000 rows)
INSERT INTO users (name, email)
VALUES 
    -- 500 rows at a time
    (...),
    (...),
    -- ... 500 rows ...
;

-- ❌ Bad: Too large (may hit limits)
INSERT INTO users (name, email)
VALUES 
    -- 100,000 rows (may be too large)
    ...
;
```

### Transaction Management

```sql
-- ✅ Good: Batch in transactions
BEGIN;
INSERT INTO users (name, email) VALUES (...), (...), (...);  -- 1000 rows
COMMIT;

-- ❌ Bad: One huge transaction
BEGIN;
INSERT INTO users (name, email) VALUES (...), (...), (...);  -- 1,000,000 rows
COMMIT;  -- Very long transaction
```

### Disable Constraints Temporarily

```sql
-- For large imports, temporarily disable constraints
BEGIN;
ALTER TABLE users DISABLE TRIGGER ALL;  -- Disable triggers
-- Bulk insert
INSERT INTO users (name, email) VALUES (...), (...), (...);
ALTER TABLE users ENABLE TRIGGER ALL;  -- Re-enable
COMMIT;
```

## Application-Level Patterns

### Pattern 1: Chunked Inserts

```python
# Python: Chunked bulk insert
def bulk_insert_users(users_data, chunk_size=1000):
    for chunk in chunks(users_data, chunk_size):
        placeholders = ','.join(['(%s, %s)'] * len(chunk))
        query = f"INSERT INTO users (name, email) VALUES {placeholders}"
        db.execute(query, [item for user in chunk for item in [user.name, user.email]])
```

### Pattern 2: Prepared Statements

```python
# Python: Prepared statement for bulk insert
stmt = "INSERT INTO users (name, email) VALUES ($1, $2)"
for user in users:
    db.execute(stmt, (user.name, user.email))
```

## Common Patterns

### Pattern 1: Upsert Bulk

```sql
-- Bulk upsert (PostgreSQL)
INSERT INTO users (email, name)
VALUES 
    ('user1@example.com', 'User 1'),
    ('user2@example.com', 'User 2'),
    ('user3@example.com', 'User 3')
ON CONFLICT (email) 
DO UPDATE SET name = EXCLUDED.name;
```

### Pattern 2: Update with Subquery

```sql
-- Update from aggregated data
UPDATE products p
SET avg_rating = (
    SELECT AVG(rating)
    FROM reviews r
    WHERE r.product_id = p.id
)
WHERE EXISTS (
    SELECT 1 FROM reviews WHERE product_id = p.id
);
```

## Best Practices

1. **Batch Size**: 100-1000 rows per batch
2. **Use Transactions**: Batch operations in transactions
3. **Monitor Performance**: Track execution time
4. **Handle Errors**: Rollback on failure
5. **Test First**: Test on small dataset first

## Common Mistakes

### ❌ Too Large Batches

```sql
-- ❌ Bad: Single huge insert
INSERT INTO users (name, email)
VALUES 
    -- 1,000,000 rows (may timeout or fail)
    ...
;

-- ✅ Good: Chunked inserts
-- Insert 1000 rows at a time, multiple batches
```

### ❌ No Error Handling

```sql
-- ❌ Bad: No error handling
INSERT INTO users (name, email) VALUES (...), (...), (...);
-- If one row fails, entire batch fails

-- ✅ Good: Handle errors
BEGIN;
INSERT INTO users (name, email) VALUES (...), (...), (...);
COMMIT;
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        -- Log error, retry, etc.
```

## Summary

**Bulk Operations:**

1. **Bulk INSERT**: Insert multiple rows in one statement
2. **Bulk UPDATE**: Update multiple rows efficiently
3. **Performance**: Much faster than individual operations
4. **Batch Size**: 100-1000 rows optimal
5. **Best Practice**: Use transactions, handle errors

**Key Takeaway:**
Bulk operations process multiple rows in a single statement, dramatically improving performance. Use bulk INSERT for data imports, bulk UPDATE for batch changes. Keep batch sizes reasonable (100-1000 rows) and always use transactions.

**Common Use Cases:**
- Data imports
- Batch updates
- Migrations
- Bulk status changes

**Next Steps:**
- Learn [INSERT](../02_crud_basics/insert.md) for basic inserts
- Study [UPDATE](../02_crud_basics/update.md) for updates
- Master [Performance Optimization](../10_performance_optimization/) for tuning

