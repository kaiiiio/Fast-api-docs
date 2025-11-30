# UPSERT: INSERT ... ON CONFLICT / ON DUPLICATE KEY UPDATE

UPSERT (UPDATE + INSERT) inserts a row, or updates it if it already exists. It's essential for idempotent operations and handling conflicts.

## What is UPSERT?

**UPSERT** combines INSERT and UPDATE:
- If row exists: Update it
- If row doesn't exist: Insert it

**Use Cases:**
- Idempotent operations
- Handling unique constraint violations
- Syncing data
- Preventing duplicates

## PostgreSQL: INSERT ... ON CONFLICT

### Basic Syntax

```sql
INSERT INTO table_name (column1, column2, ...)
VALUES (value1, value2, ...)
ON CONFLICT (unique_column) 
DO UPDATE SET column1 = EXCLUDED.column1;
```

### Basic Example

```sql
-- Insert or update user
INSERT INTO users (email, name)
VALUES ('user@example.com', 'John Doe')
ON CONFLICT (email) 
DO UPDATE SET name = EXCLUDED.name;
```

**Behavior:**
- If email exists: Update name
- If email doesn't exist: Insert new row

### Update Multiple Columns

```sql
-- Update multiple columns on conflict
INSERT INTO users (email, name, updated_at)
VALUES ('user@example.com', 'John Updated', CURRENT_TIMESTAMP)
ON CONFLICT (email) 
DO UPDATE SET 
    name = EXCLUDED.name,
    updated_at = EXCLUDED.updated_at;
```

### Update Only If Different

```sql
-- Update only if values changed
INSERT INTO users (email, name)
VALUES ('user@example.com', 'New Name')
ON CONFLICT (email) 
DO UPDATE SET 
    name = EXCLUDED.name
WHERE users.name != EXCLUDED.name;
```

### Do Nothing on Conflict

```sql
-- Insert or do nothing if exists
INSERT INTO users (email, name)
VALUES ('user@example.com', 'John Doe')
ON CONFLICT (email) 
DO NOTHING;
```

## MySQL: INSERT ... ON DUPLICATE KEY UPDATE

### Basic Syntax

```sql
INSERT INTO table_name (column1, column2, ...)
VALUES (value1, value2, ...)
ON DUPLICATE KEY UPDATE 
    column1 = VALUES(column1);
```

### Basic Example

```sql
-- Insert or update user
INSERT INTO users (email, name)
VALUES ('user@example.com', 'John Doe')
ON DUPLICATE KEY UPDATE 
    name = VALUES(name);
```

**Note:** MySQL uses `VALUES()` function (or `VALUES(column)` in newer versions).

### Update Multiple Columns

```sql
-- Update multiple columns
INSERT INTO users (email, name, updated_at)
VALUES ('user@example.com', 'John Updated', NOW())
ON DUPLICATE KEY UPDATE 
    name = VALUES(name),
    updated_at = VALUES(updated_at);
```

### MySQL 8.0+ Syntax

```sql
-- MySQL 8.0+: Use column name directly
INSERT INTO users (email, name)
VALUES ('user@example.com', 'John Updated')
ON DUPLICATE KEY UPDATE 
    name = name;  -- Can reference column directly
```

## SQLite: INSERT ... ON CONFLICT

### Basic Syntax

```sql
INSERT INTO table_name (column1, column2, ...)
VALUES (value1, value2, ...)
ON CONFLICT (unique_column) 
DO UPDATE SET column1 = excluded.column1;
```

### Basic Example

```sql
-- Insert or update (SQLite)
INSERT INTO users (email, name)
VALUES ('user@example.com', 'John Doe')
ON CONFLICT (email) 
DO UPDATE SET name = excluded.name;
```

## Real-World Examples

### Example 1: User Registration

```sql
-- Register user or update if exists
INSERT INTO users (email, name, password_hash)
VALUES ('user@example.com', 'John Doe', 'hashed_password')
ON CONFLICT (email) 
DO UPDATE SET 
    name = EXCLUDED.name,
    password_hash = EXCLUDED.password_hash,
    updated_at = CURRENT_TIMESTAMP;
```

### Example 2: Product Sync

```sql
-- Sync products from external source
INSERT INTO products (sku, name, price, stock_quantity)
VALUES ('SKU123', 'Product Name', 99.99, 100)
ON CONFLICT (sku) 
DO UPDATE SET 
    name = EXCLUDED.name,
    price = EXCLUDED.price,
    stock_quantity = EXCLUDED.stock_quantity,
    updated_at = CURRENT_TIMESTAMP;
```

### Example 3: Order Status Update

```sql
-- Update order status (idempotent)
INSERT INTO orders (id, status, updated_at)
VALUES (1, 'completed', CURRENT_TIMESTAMP)
ON CONFLICT (id) 
DO UPDATE SET 
    status = EXCLUDED.status,
    updated_at = EXCLUDED.updated_at;
```

## Composite Unique Constraints

### Multiple Columns

```sql
-- UPSERT with composite unique constraint
INSERT INTO user_preferences (user_id, preference_key, preference_value)
VALUES (1, 'theme', 'dark')
ON CONFLICT (user_id, preference_key) 
DO UPDATE SET preference_value = EXCLUDED.preference_value;
```

## Conditional Updates

### Update Only If Condition Met

```sql
-- Update only if new value is different
INSERT INTO products (id, price)
VALUES (1, 99.99)
ON CONFLICT (id) 
DO UPDATE SET 
    price = EXCLUDED.price
WHERE products.price != EXCLUDED.price;
```

### Update Only If Newer

```sql
-- Update only if timestamp is newer
INSERT INTO data_sync (id, data, sync_timestamp)
VALUES (1, 'new data', '2024-11-30 10:00:00')
ON CONFLICT (id) 
DO UPDATE SET 
    data = EXCLUDED.data,
    sync_timestamp = EXCLUDED.sync_timestamp
WHERE EXCLUDED.sync_timestamp > data_sync.sync_timestamp;
```

## Performance Considerations

### Indexes

```sql
-- UPSERT requires unique index/constraint
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- UPSERT uses index for conflict detection
INSERT INTO users (email, name)
VALUES ('user@example.com', 'John')
ON CONFLICT (email) 
DO UPDATE SET name = EXCLUDED.name;
```

### Batch UPSERT

```sql
-- Batch UPSERT (PostgreSQL)
INSERT INTO users (email, name)
VALUES 
    ('user1@example.com', 'User 1'),
    ('user2@example.com', 'User 2'),
    ('user3@example.com', 'User 3')
ON CONFLICT (email) 
DO UPDATE SET name = EXCLUDED.name;
```

## Common Patterns

### Pattern 1: Idempotent Operations

```sql
-- Idempotent: Can run multiple times safely
INSERT INTO processed_files (file_id, processed_at)
VALUES ('file123', CURRENT_TIMESTAMP)
ON CONFLICT (file_id) 
DO NOTHING;  -- Already processed, skip
```

### Pattern 2: Increment Counter

```sql
-- Increment counter or create new
INSERT INTO counters (key, count)
VALUES ('page_views', 1)
ON CONFLICT (key) 
DO UPDATE SET count = counters.count + 1;
```

### Pattern 3: Last-Write-Wins

```sql
-- Update with latest data
INSERT INTO cache (key, value, updated_at)
VALUES ('cache_key', 'new_value', CURRENT_TIMESTAMP)
ON CONFLICT (key) 
DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = EXCLUDED.updated_at;
```

## Best Practices

1. **Use Unique Constraints**: Required for UPSERT
2. **Handle All Columns**: Update all relevant columns
3. **Use Timestamps**: Track when records updated
4. **Test Idempotency**: Ensure safe to run multiple times
5. **Index Conflict Columns**: For performance

## Common Mistakes

### ❌ Missing Unique Constraint

```sql
-- ❌ Error: No unique constraint
INSERT INTO users (email, name)
VALUES ('user@example.com', 'John')
ON CONFLICT (email) 
DO UPDATE SET name = EXCLUDED.name;
-- Error: No unique constraint on email

-- ✅ Correct: Create unique constraint first
CREATE UNIQUE INDEX idx_users_email ON users(email);
```

### ❌ Wrong Conflict Target

```sql
-- ❌ Error: Wrong column in ON CONFLICT
INSERT INTO users (email, name)
VALUES ('user@example.com', 'John')
ON CONFLICT (name)  -- Error: name is not unique!
DO UPDATE SET name = EXCLUDED.name;

-- ✅ Correct: Use unique column
ON CONFLICT (email) 
DO UPDATE SET name = EXCLUDED.name;
```

## Summary

**UPSERT Essentials:**

1. **PostgreSQL**: `INSERT ... ON CONFLICT ... DO UPDATE`
2. **MySQL**: `INSERT ... ON DUPLICATE KEY UPDATE`
3. **SQLite**: Similar to PostgreSQL
4. **Requires**: Unique constraint/index
5. **Use Cases**: Idempotent operations, syncing data

**Key Takeaway:**
UPSERT combines INSERT and UPDATE. If row exists (based on unique constraint), update it; otherwise, insert it. Essential for idempotent operations and handling conflicts. Requires unique constraint on conflict column.

**Common Use Cases:**
- User registration: Insert or update user
- Data syncing: Sync from external source
- Idempotent operations: Safe to run multiple times
- Counters: Increment or create

**Next Steps:**
- Learn [INSERT](../02_crud_basics/insert.md) for basic inserts
- Study [UPDATE](../02_crud_basics/update.md) for updates
- Master [Transactions](../09_transactions_concurrency/transaction_control.md) for atomicity

