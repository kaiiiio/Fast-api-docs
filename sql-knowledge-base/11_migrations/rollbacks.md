# Rollbacks: Reverting Database Migrations

Rollbacks allow you to undo database migrations, reverting schema changes. They're essential for fixing issues and maintaining database state.

## What are Rollbacks?

**Rollback** is the process of undoing a migration, reverting the database to a previous state. It requires down migrations that reverse the changes.

### Basic Concept

```sql
-- Apply migration
Migration 001: Create users table
-- Database: Has users table

-- Rollback migration
Rollback 001: Drop users table
-- Database: No users table (back to previous state)
```

## Rollback Mechanisms

### Down Migrations

```sql
-- Migration file: 001_create_users_table.sql
-- Up: Create table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255)
);

-- Down: Drop table (rollback)
DROP TABLE IF EXISTS users;
```

### Migration Tools

```bash
# Alembic: Rollback one migration
alembic downgrade -1

# Rollback to specific version
alembic downgrade 001

# Rollback all migrations
alembic downgrade base
```

## Rollback Strategies

### Strategy 1: Full Rollback

```sql
-- Rollback entire migration
-- Down migration reverses all changes

-- Up: Create table and index
CREATE TABLE users (id SERIAL PRIMARY KEY, name VARCHAR(255));
CREATE INDEX idx_users_name ON users(name);

-- Down: Drop index and table
DROP INDEX IF EXISTS idx_users_name;
DROP TABLE IF EXISTS users;
```

### Strategy 2: Partial Rollback

```sql
-- Rollback specific changes
-- Up: Add multiple columns
ALTER TABLE users ADD COLUMN email VARCHAR(255);
ALTER TABLE users ADD COLUMN phone VARCHAR(20);

-- Down: Remove columns
ALTER TABLE users DROP COLUMN IF EXISTS phone;
ALTER TABLE users DROP COLUMN IF EXISTS email;
```

## Real-World Examples

### Example 1: Rollback Table Creation

```sql
-- Migration: 001_create_users_table.sql
-- Up
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- Down
DROP INDEX IF EXISTS idx_users_email;
DROP TABLE IF EXISTS users;
```

### Example 2: Rollback Column Addition

```sql
-- Migration: 002_add_phone_to_users.sql
-- Up
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
CREATE INDEX idx_users_phone ON users(phone);

-- Down
DROP INDEX IF EXISTS idx_users_phone;
ALTER TABLE users DROP COLUMN IF EXISTS phone;
```

### Example 3: Rollback Relationship

```sql
-- Migration: 003_create_orders_table.sql
-- Up
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Down
DROP INDEX IF EXISTS idx_orders_user_id;
DROP TABLE IF EXISTS orders;
```

## Irreversible Migrations

### When Rollback is Impossible

```sql
-- ❌ Problem: Data loss migration
-- Up: Drop column with data
ALTER TABLE users DROP COLUMN phone;
-- Data is lost, can't restore

-- Down: Can't restore data
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
-- Column added, but data is NULL (lost)
```

### Handling Irreversible Migrations

```sql
-- Option 1: Backup before migration
-- 1. Backup data
CREATE TABLE users_backup AS SELECT * FROM users;

-- 2. Apply migration
ALTER TABLE users DROP COLUMN phone;

-- 3. If rollback needed, restore from backup
INSERT INTO users SELECT * FROM users_backup;
```

## Rollback Best Practices

### 1. Always Write Down Migrations

```sql
-- ✅ Good: Has down migration
-- Up
ALTER TABLE users ADD COLUMN phone VARCHAR(20);

-- Down
ALTER TABLE users DROP COLUMN phone;

-- ❌ Bad: No down migration
-- Up
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
-- Can't rollback!
```

### 2. Test Rollbacks

```sql
-- Test rollback process:
-- 1. Apply migration
-- 2. Verify changes
-- 3. Rollback migration
-- 4. Verify rollback
-- 5. Re-apply migration
```

### 3. Handle Data Carefully

```sql
-- For data migrations:
-- Up: Migrate data
UPDATE users SET status = 'active' WHERE status IS NULL;

-- Down: Document what changed
-- Note: Can't fully reverse data migration
-- Document original state if possible
```

## Rollback Scenarios

### Scenario 1: Failed Migration

```sql
-- Problem: Migration failed partway through
-- Applied: CREATE TABLE users
-- Failed: CREATE INDEX (error)

-- Solution: Rollback
-- Rollback migration 001
DROP TABLE IF EXISTS users;

-- Fix migration, re-apply
```

### Scenario 2: Wrong Migration

```sql
-- Problem: Applied wrong migration
-- Applied: Migration 005 (wrong one)

-- Solution: Rollback
alembic downgrade -1

-- Apply correct migration
```

### Scenario 3: Production Issue

```sql
-- Problem: Migration causes production issue
-- Applied: Migration causes performance problem

-- Solution: Rollback
-- 1. Rollback migration
-- 2. Investigate issue
-- 3. Fix migration
-- 4. Re-apply when ready
```

## Rollback Safety

### Safe Rollbacks

```sql
-- ✅ Safe: Adding nullable column
-- Up: ALTER TABLE users ADD COLUMN phone VARCHAR(20);
-- Down: ALTER TABLE users DROP COLUMN phone;
-- Safe: No data loss

-- ✅ Safe: Creating new table
-- Up: CREATE TABLE orders (...);
-- Down: DROP TABLE orders;
-- Safe: New table, no existing data
```

### Risky Rollbacks

```sql
-- ⚠️ Risky: Dropping column
-- Up: ALTER TABLE users DROP COLUMN phone;
-- Down: ALTER TABLE users ADD COLUMN phone VARCHAR(20);
-- Risky: Data lost, can't restore

-- ⚠️ Risky: Changing data type
-- Up: ALTER TABLE users ALTER COLUMN age TYPE INTEGER;
-- Down: ALTER TABLE users ALTER COLUMN age TYPE VARCHAR;
-- Risky: Data conversion issues
```

## Best Practices

1. **Always Write Down**: Every up migration needs down
2. **Test Rollbacks**: Verify rollbacks work before production
3. **Backup Data**: Backup before risky migrations
4. **Document**: Document irreversible changes
5. **Monitor**: Monitor rollback execution

## Common Mistakes

### ❌ No Down Migration

```sql
-- ❌ Bad: No rollback capability
-- Up
ALTER TABLE users ADD COLUMN phone VARCHAR(20);

-- Missing: Down migration
-- Can't rollback!
```

### ❌ Wrong Rollback Order

```sql
-- ❌ Bad: Wrong order
-- Rollback migration 003 before 002
-- May cause errors if 003 depends on 002

-- ✅ Good: Rollback in reverse order
-- Rollback 003, then 002, then 001
```

## Summary

**Rollbacks:**

1. **Purpose**: Undo migrations, revert schema changes
2. **Mechanism**: Down migrations reverse up migrations
3. **Tools**: Migration tools (Alembic, Prisma, Flyway)
4. **Safety**: Some rollbacks are safe, others risky
5. **Best Practice**: Always write down migrations, test rollbacks

**Key Takeaway:**
Rollbacks allow you to undo database migrations. They require down migrations that reverse the changes made in up migrations. Always write down migrations for every up migration. Test rollbacks before production. Some migrations are irreversible (data loss), so backup data before risky migrations.

**Rollback Principles:**
- Every up migration needs down migration
- Test rollbacks in development
- Backup before risky migrations
- Rollback in reverse order
- Document irreversible changes

**Next Steps:**
- Learn [Versioned Migrations](versioned_migrations.md) for migration management
- Study [Production Migration Best Practices](production_migration_best_practices.md) for deployment
- Master [Schema Drift](schema_drift.md) for consistency

