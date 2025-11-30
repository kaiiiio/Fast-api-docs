# Production Migration Best Practices: Safe Database Deployments

Production migrations require careful planning and execution to avoid downtime and data loss. This guide covers best practices for running migrations in production.

## Pre-Migration Checklist

### 1. Review Migration

```sql
-- ✅ Review migration thoroughly
-- Check:
-- - SQL syntax
-- - Data types
-- - Constraints
-- - Indexes
-- - Performance impact
```

### 2. Test in Staging

```sql
-- ✅ Test migration in staging first
-- 1. Apply migration
-- 2. Verify changes
-- 3. Test application
-- 4. Rollback if needed
-- 5. Re-apply after fixes
```

### 3. Backup Database

```sql
-- ✅ Backup before migration
-- PostgreSQL
pg_dump mydb > backup_before_migration.sql

-- MySQL
mysqldump mydb > backup_before_migration.sql

-- Verify backup
-- Test restore process
```

## Safe Migration Practices

### Practice 1: Non-Blocking Migrations

```sql
-- ✅ Good: Non-blocking (adds column, doesn't lock)
ALTER TABLE users ADD COLUMN phone VARCHAR(20);

-- ❌ Bad: Blocking (locks table)
ALTER TABLE users ALTER COLUMN email TYPE VARCHAR(500);
-- Locks table during conversion
```

### Practice 2: Add Columns Safely

```sql
-- ✅ Safe: Add nullable column
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
-- Fast, non-blocking

-- ✅ Safe: Add column with default
ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT 'active';
-- Fast, sets default for existing rows

-- ⚠️ Risky: Add NOT NULL without default
ALTER TABLE users ADD COLUMN phone VARCHAR(20) NOT NULL;
-- Requires updating all rows (slow, blocking)
```

### Practice 3: Index Creation

```sql
-- ✅ Good: Create index concurrently (PostgreSQL)
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
-- Non-blocking, doesn't lock table

-- ⚠️ Risky: Regular index creation
CREATE INDEX idx_users_email ON users(email);
-- Locks table during creation
```

## Migration Strategies

### Strategy 1: Zero-Downtime Migrations

```sql
-- Step 1: Add new column (nullable)
ALTER TABLE users ADD COLUMN new_column VARCHAR(255);

-- Step 2: Backfill data (application code)
UPDATE users SET new_column = calculate_value(id);

-- Step 3: Make NOT NULL (after backfill)
ALTER TABLE users ALTER COLUMN new_column SET NOT NULL;
```

### Strategy 2: Blue-Green Deployment

```sql
-- Blue environment: Current version
-- Green environment: New version with migration

-- 1. Apply migration to green
-- 2. Test green environment
-- 3. Switch traffic to green
-- 4. Keep blue as backup
```

### Strategy 3: Feature Flags

```sql
-- Use feature flags to control migration impact
-- 1. Apply migration
-- 2. Enable feature flag gradually
-- 3. Monitor for issues
-- 4. Disable if problems
```

## Risky Operations

### ⚠️ Column Type Changes

```sql
-- ⚠️ Risky: Changing column type
ALTER TABLE users ALTER COLUMN age TYPE INTEGER;
-- May lock table, data conversion issues

-- ✅ Safer: Multi-step approach
-- 1. Add new column
ALTER TABLE users ADD COLUMN age_new INTEGER;

-- 2. Backfill data
UPDATE users SET age_new = age::INTEGER;

-- 3. Drop old column, rename new
ALTER TABLE users DROP COLUMN age;
ALTER TABLE users RENAME COLUMN age_new TO age;
```

### ⚠️ Dropping Columns

```sql
-- ⚠️ Risky: Dropping column
ALTER TABLE users DROP COLUMN phone;
-- Data loss, can't rollback

-- ✅ Safer: Deprecate first
-- 1. Remove from application code
-- 2. Monitor for usage
-- 3. Drop after confirmation
ALTER TABLE users DROP COLUMN phone;
```

### ⚠️ Renaming Columns

```sql
-- ⚠️ Risky: Renaming column
ALTER TABLE users RENAME COLUMN old_name TO new_name;
-- Breaks application code immediately

-- ✅ Safer: Multi-step
-- 1. Add new column
ALTER TABLE users ADD COLUMN new_name VARCHAR(255);

-- 2. Backfill
UPDATE users SET new_name = old_name;

-- 3. Update application to use new_name
-- 4. Drop old column after migration period
ALTER TABLE users DROP COLUMN old_name;
```

## Monitoring Migrations

### Monitor During Migration

```sql
-- Monitor:
-- - Migration progress
-- - Table locks
-- - Query performance
-- - Error logs
-- - Application errors
```

### Rollback Plan

```sql
-- Always have rollback plan:
-- 1. Down migration ready
-- 2. Tested rollback process
-- 3. Backup available
-- 4. Rollback procedure documented
```

## Real-World Examples

### Example 1: Adding Index

```sql
-- ✅ Safe: Concurrent index creation
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);

-- Monitor:
-- - Index creation progress
-- - No table locks
-- - Application continues working
```

### Example 2: Adding Column

```sql
-- ✅ Safe: Add nullable column
ALTER TABLE users ADD COLUMN phone VARCHAR(20);

-- Application:
-- - Handles NULL values
-- - Gradually populates data
-- - Makes NOT NULL later if needed
```

### Example 3: Data Migration

```sql
-- ⚠️ Risky: Large data migration
UPDATE users SET status = 'active' WHERE status IS NULL;
-- May lock table, slow

-- ✅ Safer: Batch updates
DO $$
DECLARE
    batch_size INTEGER := 1000;
BEGIN
    WHILE EXISTS (SELECT 1 FROM users WHERE status IS NULL) LOOP
        UPDATE users 
        SET status = 'active' 
        WHERE id IN (
            SELECT id FROM users 
            WHERE status IS NULL 
            LIMIT batch_size
        );
        COMMIT;
    END LOOP;
END $$;
```

## Best Practices

1. **Backup First**: Always backup before migration
2. **Test in Staging**: Test thoroughly before production
3. **Non-Blocking**: Use CONCURRENTLY when possible
4. **Monitor**: Watch migration progress and application
5. **Rollback Ready**: Have rollback plan and tested procedure
6. **Communicate**: Notify team about migration
7. **Low Traffic**: Run during low traffic periods when possible

## Common Mistakes

### ❌ No Backup

```sql
-- ❌ Bad: No backup before migration
ALTER TABLE users DROP COLUMN phone;
-- If something goes wrong, data lost!

-- ✅ Good: Backup first
pg_dump mydb > backup.sql
ALTER TABLE users DROP COLUMN phone;
```

### ❌ Blocking Operations

```sql
-- ❌ Bad: Blocking index creation
CREATE INDEX idx_users_email ON users(email);
-- Locks table, application may hang

-- ✅ Good: Concurrent index
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
```

### ❌ No Testing

```sql
-- ❌ Bad: Apply untested migration to production
-- Migration not tested in staging

-- ✅ Good: Test in staging first
-- 1. Apply in staging
-- 2. Test thoroughly
-- 3. Then apply in production
```

## Migration Timing

### When to Run Migrations

```sql
-- ✅ Good: Low traffic periods
-- - Off-peak hours
-- - Maintenance windows
-- - Scheduled downtime

-- ❌ Bad: Peak traffic
-- - High load periods
-- - Business hours
-- - Critical operations
```

## Summary

**Production Migration Best Practices:**

1. **Pre-Migration**: Review, test, backup
2. **Safe Operations**: Non-blocking, concurrent when possible
3. **Strategies**: Zero-downtime, blue-green, feature flags
4. **Risky Operations**: Handle carefully, multi-step approach
5. **Monitoring**: Watch progress, have rollback plan

**Key Takeaway:**
Production migrations require careful planning and execution. Always backup before migrations, test in staging, and use non-blocking operations when possible. Use CONCURRENTLY for index creation, add columns safely, and handle risky operations with multi-step approaches. Monitor migrations and have a rollback plan ready.

**Production Principles:**
- Backup first
- Test in staging
- Non-blocking operations
- Monitor during migration
- Rollback plan ready

**Next Steps:**
- Learn [Versioned Migrations](versioned_migrations.md) for migration management
- Study [Rollbacks](rollbacks.md) for reverting changes
- Master [Schema Drift](schema_drift.md) for consistency

