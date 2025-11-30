# Versioned Migrations: Managing Database Schema Changes

Versioned migrations track database schema changes over time, allowing you to apply and rollback changes systematically. They're essential for team collaboration and production deployments.

## What are Versioned Migrations?

**Versioned migrations** are numbered, sequential files that contain SQL statements to modify database schema. Each migration has a version number and can be applied or rolled back.

### Basic Concept

```
Migration 001: Create users table
Migration 002: Add email column to users
Migration 003: Create orders table
Migration 004: Add index on users.email
```

## Migration File Structure

### Naming Convention

```
001_create_users_table.sql
002_add_email_to_users.sql
003_create_orders_table.sql
```

### Migration File Format

```sql
-- Migration: 001_create_users_table.sql
-- Up: Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Down: Drop users table
DROP TABLE IF EXISTS users;
```

## Migration Tools

### Alembic (Python/SQLAlchemy)

```python
# Generate migration
alembic revision --autogenerate -m "create users table"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

### Prisma (Node.js)

```javascript
// Generate migration
npx prisma migrate dev --name create_users_table

// Apply migrations
npx prisma migrate deploy

// Rollback (manual)
// Edit migration files and reapply
```

### Flyway (Java/Multi-language)

```sql
-- Migration file: V1__Create_users_table.sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255)
);

-- Apply
flyway migrate

-- Rollback
flyway undo
```

## Migration Tracking

### Migration Table

```sql
-- Database tracks applied migrations
CREATE TABLE schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Check applied migrations
SELECT * FROM schema_migrations ORDER BY version;
```

## Up and Down Migrations

### Up Migration (Apply)

```sql
-- Migration: 002_add_email_to_users.sql
-- Up: Add email column
ALTER TABLE users ADD COLUMN email VARCHAR(255);
CREATE INDEX idx_users_email ON users(email);
```

### Down Migration (Rollback)

```sql
-- Migration: 002_add_email_to_users.sql
-- Down: Remove email column
DROP INDEX IF EXISTS idx_users_email;
ALTER TABLE users DROP COLUMN IF EXISTS email;
```

## Real-World Examples

### Example 1: Creating Tables

```sql
-- Migration: 001_create_users_table.sql
-- Up
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Down
DROP TABLE IF EXISTS users;
```

### Example 2: Adding Columns

```sql
-- Migration: 002_add_phone_to_users.sql
-- Up
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
CREATE INDEX idx_users_phone ON users(phone);

-- Down
DROP INDEX IF EXISTS idx_users_phone;
ALTER TABLE users DROP COLUMN IF EXISTS phone;
```

### Example 3: Creating Relationships

```sql
-- Migration: 003_create_orders_table.sql
-- Up
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);

-- Down
DROP TABLE IF EXISTS orders;
```

## Best Practices

### 1. Make Migrations Reversible

```sql
-- ✅ Good: Reversible migration
-- Up
ALTER TABLE users ADD COLUMN phone VARCHAR(20);

-- Down
ALTER TABLE users DROP COLUMN phone;

-- ❌ Bad: Irreversible migration
-- Up
ALTER TABLE users DROP COLUMN phone;
-- Down: Can't restore data!
```

### 2. Test Migrations

```sql
-- Test on development database first
-- 1. Apply migration
-- 2. Verify changes
-- 3. Rollback migration
-- 4. Verify rollback
-- 5. Re-apply migration
```

### 3. Keep Migrations Small

```sql
-- ✅ Good: Small, focused migration
-- Migration: 002_add_email_to_users.sql
ALTER TABLE users ADD COLUMN email VARCHAR(255);

-- ❌ Bad: Large migration with many changes
-- Migration: 002_major_changes.sql
-- Creates 5 tables, adds 10 columns, creates 20 indexes
-- Hard to review, test, and rollback
```

### 4. Never Edit Applied Migrations

```sql
-- ❌ Bad: Edit applied migration
-- Migration 001 was already applied
-- Don't edit it!

-- ✅ Good: Create new migration
-- Migration 003: Fix issue from migration 001
```

## Migration Workflow

### Development

```sql
-- 1. Create migration file
-- 2. Write up and down migrations
-- 3. Test on local database
-- 4. Commit to version control
```

### Production

```sql
-- 1. Backup database
-- 2. Apply migrations in order
-- 3. Verify changes
-- 4. Monitor for issues
```

## Common Patterns

### Pattern 1: Add Column with Default

```sql
-- Up
ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT 'active';

-- Down
ALTER TABLE users DROP COLUMN status;
```

### Pattern 2: Add Not Null Column

```sql
-- Up: Add nullable, populate, then make not null
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
UPDATE users SET phone = '' WHERE phone IS NULL;
ALTER TABLE users ALTER COLUMN phone SET NOT NULL;

-- Down
ALTER TABLE users DROP COLUMN phone;
```

### Pattern 3: Rename Column

```sql
-- Up
ALTER TABLE users RENAME COLUMN old_name TO new_name;

-- Down
ALTER TABLE users RENAME COLUMN new_name TO old_name;
```

## Data Migrations

### Migrating Data

```sql
-- Migration: 004_migrate_user_status.sql
-- Up: Migrate data
UPDATE users 
SET status = 'active' 
WHERE status IS NULL;

-- Down: Can't always reverse data migrations
-- Document what was changed
```

## Summary

**Versioned Migrations:**

1. **Purpose**: Track and apply schema changes systematically
2. **Structure**: Numbered files with up/down migrations
3. **Tools**: Alembic, Prisma, Flyway, etc.
4. **Best Practices**: Reversible, tested, small, never edit applied
5. **Workflow**: Create → Test → Commit → Apply

**Key Takeaway:**
Versioned migrations manage database schema changes over time. Each migration has a version number and contains up (apply) and down (rollback) SQL statements. Use migration tools (Alembic, Prisma, Flyway) to track and apply migrations. Keep migrations small, reversible, and tested. Never edit applied migrations—create new ones instead.

**Migration Principles:**
- Sequential versioning
- Up and down migrations
- Reversible when possible
- Test before production
- Never edit applied migrations

**Next Steps:**
- Learn [Migration Tools](migration_tools.md) for tool-specific guides
- Study [Production Migration Best Practices](production_migration_best_practices.md) for deployment
- Master [Rollbacks](rollbacks.md) for reverting changes

