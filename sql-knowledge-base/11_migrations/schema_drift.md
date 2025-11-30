# Schema Drift: Detecting and Preventing Database Divergence

Schema drift occurs when database schemas in different environments (development, staging, production) become inconsistent. This guide covers detecting and preventing schema drift.

## What is Schema Drift?

**Schema drift** is when database schemas diverge between environments or from the expected state defined in migrations. It causes inconsistencies and deployment issues.

### Common Causes

```
1. Manual schema changes (not through migrations)
2. Failed migrations (partial application)
3. Different migration order
4. Direct database access
5. Missing migrations in some environments
```

## Detecting Schema Drift

### Compare Schemas

```sql
-- PostgreSQL: Compare schemas
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Compare output between environments
```

### Migration Status

```sql
-- Check applied migrations
SELECT * FROM schema_migrations 
ORDER BY version;

-- Compare with expected migrations
-- Missing migrations = drift
```

### Using Migration Tools

```bash
# Alembic: Check current revision
alembic current

# Compare with expected
alembic heads

# Show migration history
alembic history
```

## Preventing Schema Drift

### Rule 1: Always Use Migrations

```sql
-- ❌ Bad: Manual schema change
-- Directly in database:
ALTER TABLE users ADD COLUMN phone VARCHAR(20);

-- ✅ Good: Through migration
-- Create migration file:
-- 002_add_phone_to_users.sql
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
```

### Rule 2: No Direct Database Access

```sql
-- ❌ Bad: Developers modifying production directly
-- Can cause drift

-- ✅ Good: All changes through migrations
-- Version controlled, reviewed, tested
```

### Rule 3: Single Source of Truth

```sql
-- ✅ Good: Migrations are source of truth
-- All environments apply same migrations
-- Schema defined in code, not in database
```

## Detecting Drift in Practice

### Method 1: Schema Comparison

```sql
-- Generate schema dump
pg_dump --schema-only mydb > schema.sql

-- Compare between environments
diff dev_schema.sql prod_schema.sql
```

### Method 2: Migration Tool Checks

```python
# Alembic: Check for drift
alembic check

# Detects:
# - Unapplied migrations
# - Schema differences
# - Migration conflicts
```

### Method 3: Automated Checks

```python
# Script to detect drift
def check_schema_drift():
    # Get expected schema from migrations
    expected_schema = get_expected_schema()
    
    # Get actual schema from database
    actual_schema = get_actual_schema()
    
    # Compare
    differences = compare_schemas(expected_schema, actual_schema)
    
    if differences:
        raise Exception(f"Schema drift detected: {differences}")
```

## Fixing Schema Drift

### Step 1: Identify Differences

```sql
-- Compare schemas
-- Identify what's different:
-- - Missing tables
-- - Missing columns
-- - Different data types
-- - Missing indexes
```

### Step 2: Create Migrations

```sql
-- Create migrations to fix drift
-- Migration: 010_fix_schema_drift.sql

-- Add missing column
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Add missing index
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
```

### Step 3: Apply Migrations

```sql
-- Apply fix migrations
-- In all environments
alembic upgrade head
```

## Real-World Examples

### Example 1: Missing Column

```sql
-- Problem: Column exists in production, not in dev
-- Production has: users.phone
-- Development missing: users.phone

-- Solution: Create migration
-- Migration: 002_add_phone_to_users.sql
ALTER TABLE users ADD COLUMN phone VARCHAR(20);

-- Apply in development
-- Production already has it (no-op or skip)
```

### Example 2: Different Indexes

```sql
-- Problem: Different indexes in environments
-- Production: idx_users_email
-- Development: Missing index

-- Solution: Create migration
-- Migration: 003_add_email_index.sql
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Apply in all environments
```

### Example 3: Manual Changes

```sql
-- Problem: Someone manually added column
-- Production: users.phone (manual)
-- Migrations: No migration for phone

-- Solution: 
-- 1. Create migration to match production
-- 2. Or remove manual change and apply migration
```

## Best Practices

1. **Always Use Migrations**: Never make manual schema changes
2. **Regular Checks**: Periodically check for drift
3. **Automated Detection**: Use tools to detect drift
4. **Fix Immediately**: Address drift as soon as detected
5. **Document**: Document any necessary manual changes

## Prevention Strategies

### Strategy 1: Migration-Only Policy

```sql
-- Policy: All schema changes through migrations
-- Enforce in CI/CD
-- Block direct database access in production
```

### Strategy 2: Schema Validation

```python
# Validate schema matches migrations
def validate_schema():
    expected = get_expected_schema()
    actual = get_actual_schema()
    
    if expected != actual:
        raise SchemaDriftError("Schema drift detected")
```

### Strategy 3: Regular Audits

```sql
-- Regular schema audits
-- Compare all environments
-- Document any differences
-- Create migrations to fix
```

## Common Mistakes

### ❌ Manual Production Changes

```sql
-- ❌ Bad: Manual change in production
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
-- Causes drift: Other environments don't have this

-- ✅ Good: Migration
-- Create migration file, apply everywhere
```

### ❌ Skipping Migrations

```sql
-- ❌ Bad: Skip migration in some environments
-- Environment A: Applied migration 001-010
-- Environment B: Applied migration 001-009 (skipped 010)
-- Causes drift

-- ✅ Good: Apply all migrations in order
```

## Summary

**Schema Drift:**

1. **Problem**: Schemas diverge between environments
2. **Causes**: Manual changes, failed migrations, different order
3. **Detection**: Schema comparison, migration status checks
4. **Prevention**: Always use migrations, no direct access
5. **Fixing**: Create migrations to align schemas

**Key Takeaway:**
Schema drift occurs when database schemas become inconsistent between environments. Prevent it by always using migrations, avoiding manual changes, and regularly checking for differences. Detect drift through schema comparison and migration status checks. Fix drift by creating migrations to align all environments.

**Prevention:**
- Always use migrations
- No direct database access
- Regular schema checks
- Single source of truth (migrations)

**Next Steps:**
- Learn [Versioned Migrations](versioned_migrations.md) for migration management
- Study [Production Migration Best Practices](production_migration_best_practices.md) for deployment
- Master [Rollbacks](rollbacks.md) for reverting changes

