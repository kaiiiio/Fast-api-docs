# RETURNING Clause: PostgreSQL-Specific Feature

The RETURNING clause is a PostgreSQL feature that returns data from INSERT, UPDATE, or DELETE operations. It's extremely useful for getting generated values or confirming what was changed.

## What is RETURNING?

**RETURNING** allows you to get data back from INSERT, UPDATE, or DELETE operations without a separate SELECT query.

**Benefits:**
- Get generated IDs immediately
- Confirm what was updated/deleted
- Reduce database round trips
- Atomic operations

## RETURNING with INSERT

### Basic Usage

```sql
-- Insert and get the new row
INSERT INTO users (name, email)
VALUES ('John Doe', 'john@example.com')
RETURNING *;
```

**Result:**
```
┌────┬──────────┬──────────────────┬─────────────────────┐
│ id │ name     │ email            │ created_at          │
├────┼──────────┼──────────────────┼─────────────────────┤
│ 1  │ John Doe │ john@example.com │ 2024-11-30 10:00:00 │
└────┴──────────┴──────────────────┴─────────────────────┘
```

### Get Specific Columns

```sql
-- Return only specific columns
INSERT INTO users (name, email)
VALUES ('Jane Smith', 'jane@example.com')
RETURNING id, name, email;
```

### Get Generated ID

```sql
-- Most common use case: Get auto-generated ID
INSERT INTO users (name, email)
VALUES ('Bob Johnson', 'bob@example.com')
RETURNING id;

-- Result: Returns the new user's ID
-- Use in application to get the ID immediately
```

### Multiple Rows

```sql
-- Insert multiple rows and get all IDs
INSERT INTO users (name, email)
VALUES 
    ('Alice', 'alice@example.com'),
    ('Charlie', 'charlie@example.com'),
    ('David', 'david@example.com')
RETURNING id, name;
```

**Result:**
```
┌────┬─────────┐
│ id │ name    │
├────┼─────────┤
│ 2  │ Alice   │
│ 3  │ Charlie │
│ 4  │ David   │
└────┴─────────┘
```

## RETURNING with UPDATE

### Basic Usage

```sql
-- Update and get updated rows
UPDATE users
SET name = 'John Updated'
WHERE id = 1
RETURNING *;
```

**Result:**
```
┌────┬──────────────┬──────────────────┐
│ id │ name         │ email             │
├────┼──────────────┼──────────────────┤
│ 1  │ John Updated │ john@example.com │
└────┴──────────────┴──────────────────┘
```

### Get Updated Count

```sql
-- Update and see what changed
UPDATE users
SET is_active = false
WHERE created_at < '2024-01-01'
RETURNING id, name, email;
-- Returns all updated rows
```

### Conditional Updates

```sql
-- Update with condition and return results
UPDATE products
SET price = price * 1.1
WHERE category_id = 1
RETURNING id, name, price;
-- Returns all products that were updated
```

## RETURNING with DELETE

### Basic Usage

```sql
-- Delete and get deleted rows
DELETE FROM users
WHERE id = 1
RETURNING *;
```

**Result:**
```
┌────┬──────────┬──────────────────┐
│ id │ name     │ email            │
├────┼──────────┼──────────────────┤
│ 1  │ John Doe │ john@example.com │
└────┴──────────┴──────────────────┘
```

### Confirm Deletion

```sql
-- Delete and confirm what was deleted
DELETE FROM orders
WHERE status = 'cancelled'
  AND created_at < '2024-01-01'
RETURNING id, user_id, total;
-- Returns all deleted orders
```

## Real-World Examples

### Example 1: Create Order with Items

```sql
-- Create order and get ID immediately
INSERT INTO orders (user_id, total, status)
VALUES (1, 0, 'pending')
RETURNING id;

-- Use the returned ID to insert order items
-- (In application: use returned ID for next query)
```

**Application Code (Python):**
```python
# Insert order and get ID
result = await db.execute(
    "INSERT INTO orders (user_id, total, status) VALUES ($1, $2, $3) RETURNING id",
    (user_id, 0, 'pending')
)
order_id = result.fetchone()[0]

# Use order_id for order items
await db.execute(
    "INSERT INTO order_items (order_id, product_id, quantity) VALUES ($1, $2, $3)",
    (order_id, product_id, quantity)
)
```

### Example 2: Update and Get New Values

```sql
-- Update user and get updated data
UPDATE users
SET 
    name = 'New Name',
    email = 'newemail@example.com',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 1
RETURNING id, name, email, updated_at;
```

### Example 3: Soft Delete with Confirmation

```sql
-- Soft delete and get deleted records
UPDATE users
SET 
    deleted_at = CURRENT_TIMESTAMP,
    is_active = false
WHERE id = 1
RETURNING id, name, email, deleted_at;
```

### Example 4: Bulk Insert with IDs

```sql
-- Insert multiple products and get all IDs
INSERT INTO products (name, price, category_id)
VALUES 
    ('Product 1', 99.99, 1),
    ('Product 2', 149.99, 1),
    ('Product 3', 79.99, 2)
RETURNING id, name;
```

## Advanced Patterns

### Pattern 1: INSERT with Computed Values

```sql
-- Insert with computed values and return
INSERT INTO orders (user_id, total, status, order_number)
VALUES (
    1,
    249.98,
    'pending',
    'ORD-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD') || '-' || LPAD(nextval('order_seq')::text, 6, '0')
)
RETURNING id, order_number;
```

### Pattern 2: UPDATE with JOIN

```sql
-- Update with JOIN and return results
UPDATE orders o
SET status = 'completed'
FROM users u
WHERE o.user_id = u.id
  AND u.email = 'user@example.com'
RETURNING o.id, o.total, o.status;
```

### Pattern 3: Conditional RETURNING

```sql
-- Update and return only if condition met
UPDATE products
SET stock_quantity = stock_quantity - 1
WHERE id = 1
  AND stock_quantity > 0
RETURNING id, name, stock_quantity;
-- Returns row only if stock was actually decreased
```

## Performance Benefits

### Reduce Round Trips

**Without RETURNING:**
```sql
-- Two database round trips
INSERT INTO users (name, email) VALUES ('John', 'john@example.com');
SELECT id FROM users WHERE email = 'john@example.com';
```

**With RETURNING:**
```sql
-- One database round trip
INSERT INTO users (name, email) 
VALUES ('John', 'john@example.com')
RETURNING id;
```

### Atomic Operations

```sql
-- Atomic: Insert and get ID in one operation
INSERT INTO orders (user_id, total)
VALUES (1, 99.99)
RETURNING id;
-- No race condition possible
```

## Common Use Cases

### Use Case 1: Get Generated ID

```sql
-- Most common: Get auto-generated ID
INSERT INTO users (name, email)
VALUES ('John', 'john@example.com')
RETURNING id;
```

### Use Case 2: Confirm Updates

```sql
-- Verify what was updated
UPDATE products
SET price = price * 1.1
WHERE category_id = 1
RETURNING id, name, price;
```

### Use Case 3: Audit Deletions

```sql
-- Log what was deleted
DELETE FROM old_orders
WHERE created_at < '2020-01-01'
RETURNING id, user_id, total;
-- Save returned data to audit log
```

## Limitations

### Not Available in All Databases

- ✅ **PostgreSQL**: Full support
- ✅ **SQLite**: Limited support (3.35+)
- ❌ **MySQL**: Not available (use separate SELECT)

### MySQL Alternative

```sql
-- MySQL: Use LAST_INSERT_ID()
INSERT INTO users (name, email) VALUES ('John', 'john@example.com');
SELECT LAST_INSERT_ID();  -- Get the ID

-- Or use separate query
INSERT INTO users (name, email) VALUES ('John', 'john@example.com');
SELECT id FROM users WHERE email = 'john@example.com';
```

## Best Practices

1. **Use for Generated IDs**: Most common use case
2. **Reduce Round Trips**: Combine operations
3. **Confirm Changes**: Verify updates/deletes
4. **Handle Errors**: RETURNING still needs error handling
5. **Use in Transactions**: Combine with transactions for safety

## Summary

**RETURNING Clause:**

1. **Purpose**: Get data from INSERT/UPDATE/DELETE
2. **Benefits**: Reduce round trips, get IDs, confirm changes
3. **Use Cases**: Generated IDs, confirm updates, audit deletes
4. **Performance**: Fewer database round trips
5. **Limitation**: PostgreSQL-specific (mostly)

**Key Takeaway:**
RETURNING is a powerful PostgreSQL feature that reduces database round trips and provides immediate feedback from write operations. Use it to get generated IDs, confirm updates, and audit deletions. It's especially useful for getting auto-generated IDs without a separate SELECT query.

**Common Patterns:**
- Get generated ID: `INSERT ... RETURNING id`
- Confirm update: `UPDATE ... RETURNING *`
- Audit delete: `DELETE ... RETURNING *`

**Next Steps:**
- Learn [INSERT](insert.md) for basic insert operations
- Study [UPDATE](update.md) for update operations
- Master [Transactions](../09_transactions_concurrency/transaction_control.md) for atomic operations

