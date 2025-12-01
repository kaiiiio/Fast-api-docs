# DELETE: Removing Data from Tables

The `DELETE` statement removes rows from a table. Understanding DELETE patterns, safety, and alternatives (like soft deletes) is crucial for data management.

## Basic DELETE Syntax

```sql
DELETE FROM table_name
WHERE condition;
```

## Simple DELETE Examples

### Delete Single Row

```sql
-- Delete user by ID
DELETE FROM users
WHERE id = 1;
```

**Result:**
```
1 row deleted
```

### Delete Multiple Rows

```sql
-- Delete inactive users
DELETE FROM users
WHERE is_active = false;
```

**Result:**
```
25 rows deleted
```

### Delete All Rows (Dangerous!)

```sql
-- ⚠️ DANGEROUS: Deletes ALL rows!
DELETE FROM users;
-- Table structure remains, but all data is gone
```

**Alternative (Faster):**
```sql
-- Faster: Truncate table (PostgreSQL, MySQL)
TRUNCATE TABLE users;
-- Resets auto-increment, faster than DELETE
```

## DELETE with WHERE Clause

**⚠️ CRITICAL: Always use WHERE clause (unless deleting all rows intentionally)**

### Safe DELETE

```sql
-- ✅ Good: Specific condition
DELETE FROM users
WHERE id = 1;
```

### Dangerous DELETE (No WHERE)

```sql
-- ❌ DANGEROUS: Deletes ALL rows!
DELETE FROM users;
-- All users deleted!
```

**Always test DELETE queries with SELECT first:**
```sql
-- Step 1: See what will be deleted
SELECT * FROM users WHERE id = 1;

-- Step 2: Verify the WHERE clause
SELECT COUNT(*) FROM users WHERE id = 1;  -- Should be 1

-- Step 3: Execute DELETE
DELETE FROM users WHERE id = 1;
```

## DELETE with Subqueries

### Delete Based on Another Table

```sql
-- Delete users who have no orders
DELETE FROM users
WHERE id NOT IN (
    SELECT DISTINCT user_id FROM orders
);
```

### Delete with EXISTS

```sql
-- Delete products that have never been ordered
DELETE FROM products
WHERE NOT EXISTS (
    SELECT 1 FROM order_items WHERE product_id = products.id
);
```

### Delete with JOIN (PostgreSQL, MySQL)

```sql
-- Delete orders older than 1 year
DELETE o FROM orders o
WHERE o.created_at < CURRENT_DATE - INTERVAL '1 year';
```

**MySQL Syntax:**
```sql
DELETE o FROM orders o
INNER JOIN users u ON o.user_id = u.id
WHERE u.is_active = false;
```

## DELETE with RETURNING (PostgreSQL)

Get deleted rows back immediately.

### Basic RETURNING

```sql
-- Delete and get the deleted row
DELETE FROM users
WHERE id = 1
RETURNING *;
```

**Result:**
```
┌────┬──────────────────┬──────────────┬─────────────────────┐
│ id │ email            │ name         │ created_at          │
├────┼──────────────────┼──────────────┼─────────────────────┤
│ 1  │ john@example.com │ John Doe     │ 2024-01-15 10:00:00 │
└────┴──────────────────┴──────────────┴─────────────────────┘
1 row deleted
```

### RETURNING Specific Columns

```sql
-- Return only id and email
DELETE FROM users
WHERE id = 1
RETURNING id, email;
```

## CASCADE DELETE

When deleting a parent record, automatically delete related child records.

### Foreign Key with CASCADE

```sql
-- Orders table with CASCADE delete
CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id INT NOT NULL,
    FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE  -- Delete orders when user is deleted
);

-- Delete user (orders automatically deleted)
DELETE FROM users WHERE id = 1;
-- All orders for user_id = 1 are also deleted
```

### CASCADE vs RESTRICT

```sql
-- CASCADE: Delete related records
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE

-- RESTRICT: Prevent deletion if related records exist
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT

-- SET NULL: Set foreign key to NULL
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
```

## Soft Delete vs Hard Delete

### Hard Delete (Permanent)

```sql
-- Permanently remove from database
DELETE FROM users WHERE id = 1;
-- Data is gone forever
```

**When to Use:**
- GDPR compliance (right to be forgotten)
- Truly unnecessary data
- Test/development data

### Soft Delete (Recommended)

Mark as deleted instead of actually deleting.

```sql
-- Add deleted_at column
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP;

-- Soft delete: Mark as deleted
UPDATE users
SET 
    deleted_at = CURRENT_TIMESTAMP,
    is_active = false
WHERE id = 1;

-- Query excludes soft-deleted records
SELECT * FROM users 
WHERE deleted_at IS NULL;
```

**Benefits:**
- Can recover accidentally deleted data
- Maintains referential integrity
- Audit trail
- Can query deleted records if needed

**Implementation:**
```sql
-- Add soft delete columns
ALTER TABLE users 
ADD COLUMN deleted_at TIMESTAMP,
ADD COLUMN is_deleted BOOLEAN DEFAULT false;

-- Soft delete function
CREATE OR REPLACE FUNCTION soft_delete_user(user_id INT)
RETURNS void AS $$
BEGIN
    UPDATE users
    SET 
        deleted_at = CURRENT_TIMESTAMP,
        is_deleted = true,
        is_active = false
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Use function
SELECT soft_delete_user(1);
```

## DELETE in Transactions

### Safe Multi-Step Delete

```sql
BEGIN;

-- Step 1: Delete order items
DELETE FROM order_items WHERE order_id = 123;

-- Step 2: Delete order
DELETE FROM orders WHERE id = 123;

-- Step 3: Update user stats
UPDATE users
SET total_orders = total_orders - 1
WHERE id = (SELECT user_id FROM orders WHERE id = 123);

-- If any step fails, all changes rolled back
COMMIT;
```

## Common Patterns

### Pattern 1: Delete Old Records

```sql
-- Delete logs older than 90 days
DELETE FROM access_logs
WHERE created_at < CURRENT_DATE - INTERVAL '90 days';
```

### Pattern 2: Delete Duplicates

```sql
-- Keep only the latest record, delete older duplicates
DELETE FROM users u1
WHERE EXISTS (
    SELECT 1 FROM users u2
    WHERE u2.email = u1.email
      AND u2.id > u1.id  -- Keep the one with higher ID
);
```

### Pattern 3: Delete Orphaned Records

```sql
-- Delete order items for non-existent orders
DELETE FROM order_items oi
WHERE NOT EXISTS (
    SELECT 1 FROM orders o WHERE o.id = oi.order_id
);
```

### Pattern 4: Conditional Delete

```sql
-- Delete only if condition met
DELETE FROM sessions
WHERE expires_at < CURRENT_TIMESTAMP
  AND user_id NOT IN (
      SELECT id FROM users WHERE is_premium = true
  );
```

## Performance Considerations

### 1. **Index Columns in WHERE Clause**

```sql
-- ✅ Fast: Uses index on id
DELETE FROM users WHERE id = 1;

-- ⚠️ Slow: Full table scan
DELETE FROM users WHERE email = 'user@example.com';
-- Create index: CREATE INDEX idx_users_email ON users(email);
```

### 2. **Limit Rows Deleted**

```sql
-- ✅ Good: Limits scope
DELETE FROM logs
WHERE created_at < CURRENT_DATE - INTERVAL '90 days'
LIMIT 1000;  -- Delete in batches
```

### 3. **Batch Deletes**

```sql
-- For large deletes, do in batches
DELETE FROM logs
WHERE id IN (
    SELECT id FROM logs 
    WHERE created_at < CURRENT_DATE - INTERVAL '90 days'
    LIMIT 1000
);

-- Repeat until no more rows to delete
```

### 4. **TRUNCATE vs DELETE**

```sql
-- DELETE: Row-by-row deletion, slower, can rollback
DELETE FROM temp_table;

-- TRUNCATE: Fast, resets auto-increment, cannot rollback
TRUNCATE TABLE temp_table;

-- TRUNCATE CASCADE: Also truncate related tables
TRUNCATE TABLE users CASCADE;
```

## Common Mistakes

### ❌ Forgetting WHERE Clause

```sql
-- ❌ DANGEROUS: Deletes all rows!
DELETE FROM users;
-- Should be:
DELETE FROM users WHERE id = 1;
```

### ❌ Wrong WHERE Condition

```sql
-- ❌ Wrong: Deletes wrong rows
DELETE FROM users WHERE id = 2;
-- Meant to delete id = 1

-- ✅ Always verify with SELECT first
SELECT * FROM users WHERE id = 1;  -- Verify
DELETE FROM users WHERE id = 1;
```

### ❌ Not Handling Foreign Keys

```sql
-- ❌ Error: Cannot delete user with orders
DELETE FROM users WHERE id = 1;
-- Error: Foreign key constraint violation

-- ✅ Options:
-- 1. Delete orders first
DELETE FROM orders WHERE user_id = 1;
DELETE FROM users WHERE id = 1;

-- 2. Use CASCADE
-- (if foreign key has ON DELETE CASCADE)

-- 3. Soft delete
UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = 1;
```

### ❌ Delete in Loop (Application Code)

```javascript
// ❌ Bad: One DELETE per row
for (const id of userIds) {
    await db.query('DELETE FROM users WHERE id = $1', [id]);
}

// ✅ Good: Single DELETE
await db.query('DELETE FROM users WHERE id = ANY($1)', [userIds]);
```

## Best Practices

1. **Always Use WHERE**: Unless intentionally deleting all rows
2. **Test with SELECT First**: Verify what will be deleted
3. **Use Soft Deletes**: When possible, for recovery and audit
4. **Use Transactions**: For multi-step deletes
5. **Index WHERE Columns**: For performance
6. **Batch Large Deletes**: Delete in chunks
7. **Handle Foreign Keys**: Delete children first or use CASCADE
8. **Backup First**: For critical data, backup before delete

## Soft Delete Implementation

### Complete Soft Delete Pattern

```sql
-- 1. Add soft delete columns
ALTER TABLE users 
ADD COLUMN deleted_at TIMESTAMP,
ADD COLUMN deleted_by INT,
ADD COLUMN is_deleted BOOLEAN DEFAULT false;

-- 2. Create index for queries
CREATE INDEX idx_users_deleted ON users(deleted_at) 
WHERE deleted_at IS NULL;

-- 3. Soft delete function
CREATE OR REPLACE FUNCTION soft_delete_user(
    user_id INT,
    deleted_by_user_id INT
)
RETURNS void AS $$
BEGIN
    UPDATE users
    SET 
        deleted_at = CURRENT_TIMESTAMP,
        deleted_by = deleted_by_user_id,
        is_deleted = true,
        is_active = false
    WHERE id = user_id AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. Restore function
CREATE OR REPLACE FUNCTION restore_user(user_id INT)
RETURNS void AS $$
BEGIN
    UPDATE users
    SET 
        deleted_at = NULL,
        deleted_by = NULL,
        is_deleted = false,
        is_active = true
    WHERE id = user_id AND deleted_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- 5. Query excludes soft-deleted
CREATE VIEW active_users AS
SELECT * FROM users WHERE deleted_at IS NULL;
```

## ORM Equivalents: Prisma and TypeORM

### Prisma Syntax

```javascript
// Delete single row
await prisma.user.delete({
    where: { id: 1 }
});

// Delete multiple rows
await prisma.user.deleteMany({
    where: { is_active: false }
});

// Delete with relations (cascade)
await prisma.user.delete({
    where: { id: 1 },
    include: {
        orders: true  // Also deletes related orders if cascade
    }
});
```

### TypeORM Syntax

```typescript
// Delete single row
await userRepository.delete(1);

// Delete multiple rows
await userRepository.delete({ is_active: false });

// Delete with query builder
await userRepository
    .createQueryBuilder()
    .delete()
    .from(User)
    .where('id = :id', { id: 1 })
    .execute();

// Soft delete (if implemented)
const user = await userRepository.findOne({ where: { id: 1 } });
user.deleted_at = new Date();
await userRepository.save(user);
```

## Summary

**DELETE Statement Essentials:**

1. **Basic Syntax**: `DELETE FROM table WHERE condition`
2. **Always Use WHERE**: Prevent accidental deletion of all rows
3. **Test First**: Use SELECT to verify what will be deleted
4. **Soft Deletes**: Prefer soft deletes for recovery and audit
5. **CASCADE**: Handle related records with CASCADE or manual deletion
6. **RETURNING**: Get deleted rows back (PostgreSQL)
7. **Transactions**: Use for multi-step deletes
8. **Performance**: Index WHERE columns, batch large deletes

**Key Takeaway:**
DELETE is permanent and dangerous if misused. Always use WHERE clauses, test with SELECT first, and consider soft deletes for important data. Handle foreign key relationships properly and use transactions for related deletes.

**Safety Checklist:**
- ✅ WHERE clause present and correct
- ✅ Tested with SELECT first
- ✅ Foreign keys handled
- ✅ Transaction for related deletes
- ✅ Backup for critical data
- ✅ Consider soft delete instead

**Alternatives to DELETE:**
- **Soft Delete**: Mark as deleted, don't actually delete
- **Archive**: Move to archive table
- **Partition**: Use table partitioning for old data

**Next Steps:**
- Learn [Soft Deletes](../13_sql_for_backend_apis/soft_deletes.md) for production patterns
- Study [Transactions](../09_transactions_concurrency/transaction_control.md) for data integrity
- Master [CASCADE](../01_fundamentals/relational_concepts.md) for foreign key behavior

