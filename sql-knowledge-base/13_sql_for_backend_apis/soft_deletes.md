# Soft Deletes vs Hard Deletes: Data Retention Strategies

Soft deletes mark records as deleted without actually removing them. Hard deletes permanently remove records. Choosing the right strategy is crucial for data integrity and compliance.

## Hard Deletes

### What is Hard Delete?

**Hard delete** permanently removes records from the database.

```sql
-- Hard delete: Permanently remove
DELETE FROM users WHERE id = 1;
-- Record is gone forever
```

### Characteristics

- ✅ Permanent removal
- ✅ Frees storage immediately
- ✅ Simple implementation
- ❌ No recovery possible
- ❌ No audit trail
- ❌ Breaks referential integrity

## Soft Deletes

### What is Soft Delete?

**Soft delete** marks records as deleted without removing them.

```sql
-- Soft delete: Mark as deleted
UPDATE users 
SET deleted_at = CURRENT_TIMESTAMP,
    is_active = false
WHERE id = 1;
-- Record still exists, just marked deleted
```

### Basic Implementation

```sql
-- Add deleted_at column
ALTER TABLE users 
ADD COLUMN deleted_at TIMESTAMP NULL;

-- Create index for filtering
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;

-- Soft delete
UPDATE users 
SET deleted_at = CURRENT_TIMESTAMP
WHERE id = 1;

-- Query active records (exclude deleted)
SELECT * FROM users WHERE deleted_at IS NULL;
```

## Real-World Examples

### Example 1: User Accounts

**Soft Delete:**
```sql
-- Users table with soft delete
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    name VARCHAR(255),
    deleted_at TIMESTAMP NULL,
    deleted_by INTEGER NULL
);

-- Soft delete user
UPDATE users 
SET 
    deleted_at = CURRENT_TIMESTAMP,
    deleted_by = :current_user_id
WHERE id = 1;

-- Query active users
SELECT * FROM users WHERE deleted_at IS NULL;

-- Restore user
UPDATE users 
SET deleted_at = NULL, deleted_by = NULL
WHERE id = 1;
```

**Benefits:**
- Can restore accounts
- Maintains order history
- Audit trail

### Example 2: Orders

**Soft Delete:**
```sql
-- Orders with soft delete
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    total DECIMAL(10, 2),
    status VARCHAR(20),
    deleted_at TIMESTAMP NULL,
    deletion_reason TEXT
);

-- Soft delete order
UPDATE orders 
SET 
    deleted_at = CURRENT_TIMESTAMP,
    deletion_reason = 'Customer request'
WHERE id = 1;

-- Query active orders
SELECT * FROM orders 
WHERE deleted_at IS NULL 
  AND status = 'completed';
```

### Example 3: Products

**Soft Delete:**
```sql
-- Products with soft delete
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    price DECIMAL(10, 2),
    deleted_at TIMESTAMP NULL
);

-- Soft delete product
UPDATE products 
SET deleted_at = CURRENT_TIMESTAMP
WHERE id = 1;

-- Query active products
SELECT * FROM products WHERE deleted_at IS NULL;
```

## Querying with Soft Deletes

### Exclude Deleted Records

```sql
-- Always filter deleted records
SELECT * FROM users WHERE deleted_at IS NULL;

-- With other conditions
SELECT * FROM users 
WHERE deleted_at IS NULL 
  AND is_active = true;
```

### Include Deleted Records

```sql
-- Get all records including deleted
SELECT * FROM users;

-- Get only deleted records
SELECT * FROM users WHERE deleted_at IS NOT NULL;
```

### Count with Soft Deletes

```sql
-- Count active users
SELECT COUNT(*) FROM users WHERE deleted_at IS NULL;

-- Count deleted users
SELECT COUNT(*) FROM users WHERE deleted_at IS NOT NULL;
```

## Performance Optimization

### Partial Indexes

```sql
-- Index only active records (PostgreSQL)
CREATE INDEX idx_users_active ON users(email) 
WHERE deleted_at IS NULL;

-- Fast queries on active records
SELECT * FROM users 
WHERE email = 'user@example.com' 
  AND deleted_at IS NULL;
```

### Views for Active Records

```sql
-- View for active users only
CREATE VIEW active_users AS
SELECT * FROM users WHERE deleted_at IS NULL;

-- Simple queries
SELECT * FROM active_users;
```

## Soft Delete Patterns

### Pattern 1: deleted_at Column

```sql
-- Simple: Just deleted_at
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    deleted_at TIMESTAMP NULL
);
```

### Pattern 2: is_deleted Flag

```sql
-- Boolean flag
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP NULL
);

-- Query
SELECT * FROM users WHERE is_deleted = false;
```

### Pattern 3: Status Column

```sql
-- Status-based
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active'  -- 'active', 'deleted', 'archived'
);

-- Query
SELECT * FROM users WHERE status = 'active';
```

## Maintaining Referential Integrity

### Foreign Keys with Soft Deletes

```sql
-- Orders reference users
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    total DECIMAL(10, 2)
);

-- Soft delete user
UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = 1;

-- Orders still reference user (referential integrity maintained)
-- But user is "deleted"
```

### Cascading Soft Deletes

```sql
-- Soft delete user and their orders
BEGIN;
UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = 1;
UPDATE orders SET deleted_at = CURRENT_TIMESTAMP WHERE user_id = 1;
COMMIT;
```

## When to Use Each

### Use Soft Delete When:

- ✅ Need to restore data
- ✅ Audit/compliance requirements
- ✅ Maintain referential integrity
- ✅ Historical data important
- ✅ Legal requirements

### Use Hard Delete When:

- ✅ Privacy regulations (GDPR right to be forgotten)
- ✅ Storage constraints
- ✅ No recovery needed
- ✅ Temporary/test data
- ✅ Performance critical

## Best Practices

1. **Consistent Pattern**: Use same pattern across tables
2. **Index deleted_at**: For performance
3. **Filter Always**: Always exclude deleted in queries
4. **Document Policy**: Document retention policy
5. **Cleanup Strategy**: Plan for permanent deletion

## Common Mistakes

### ❌ Forgetting to Filter

```sql
-- ❌ Bad: Includes deleted records
SELECT * FROM users;

-- ✅ Good: Always filter
SELECT * FROM users WHERE deleted_at IS NULL;
```

### ❌ No Index

```sql
-- ❌ Bad: No index on deleted_at
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    deleted_at TIMESTAMP NULL
);
-- Queries slow on large tables

-- ✅ Good: Index deleted_at
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;
```

## Summary

**Soft vs Hard Deletes:**

1. **Soft Delete**: Mark as deleted, keep data
2. **Hard Delete**: Permanently remove
3. **Soft Delete Benefits**: Recovery, audit trail, referential integrity
4. **Hard Delete Benefits**: Privacy, storage, simplicity
5. **Choose Based On**: Requirements, compliance, recovery needs

**Key Takeaway:**
Soft deletes preserve data for recovery and audit trails, while hard deletes permanently remove data. Use soft deletes when you need data retention, recovery, or compliance. Use hard deletes for privacy, storage efficiency, or when data is truly disposable.

**When to Use:**
- **Soft Delete**: Recovery needed, audit trail, compliance
- **Hard Delete**: Privacy (GDPR), storage, temporary data

**Next Steps:**
- Learn [Auditing Tables](auditing_tables.md) for tracking changes
- Study [Foreign Keys](../01_fundamentals/relational_concepts.md) for referential integrity
- Master [Database Design](../07_database_design/) for complete design

