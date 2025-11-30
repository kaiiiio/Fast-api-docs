# Auditing Tables: Tracking CreatedAt, UpdatedAt, and Changes

Auditing tables track when records are created, modified, and by whom. This is essential for compliance, debugging, and maintaining data history.

## Basic Audit Fields

### Timestamp Fields

```sql
-- Basic audit fields
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### User Tracking

```sql
-- Track who created/updated
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER
);
```

## Auto-Updating Timestamps

### PostgreSQL: Trigger

```sql
-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on users table
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Test
UPDATE users SET name = 'New Name' WHERE id = 1;
-- updated_at automatically set to current timestamp
```

### MySQL: ON UPDATE

```sql
-- MySQL: Automatic update
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- updated_at updates automatically on UPDATE
```

## Complete Audit Table

### Full Audit Trail

```sql
-- Complete audit table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255),
    
    -- Creation audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by INTEGER,
    
    -- Update audit
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by INTEGER,
    
    -- Deletion audit (soft delete)
    deleted_at TIMESTAMP NULL,
    deleted_by INTEGER NULL,
    
    -- Version tracking
    version INTEGER DEFAULT 1
);
```

## Audit Log Table

### Separate Audit Log

```sql
-- Separate table for audit log
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id INTEGER NOT NULL,
    operation VARCHAR(10) NOT NULL,  -- 'INSERT', 'UPDATE', 'DELETE'
    old_values JSONB,
    new_values JSONB,
    changed_by INTEGER,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Index for queries
CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_changed_at ON audit_log(changed_at);
```

### Trigger for Audit Log

```sql
-- Function to log changes
CREATE OR REPLACE FUNCTION log_user_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, record_id, operation, new_values, changed_by)
        VALUES ('users', NEW.id, 'INSERT', row_to_json(NEW), NEW.created_by);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, record_id, operation, old_values, new_values, changed_by)
        VALUES ('users', NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW), NEW.updated_by);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, record_id, operation, old_values, changed_by)
        VALUES ('users', OLD.id, 'DELETE', row_to_json(OLD), OLD.deleted_by);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER users_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW
EXECUTE FUNCTION log_user_changes();
```

## Real-World Examples

### Example 1: User Management

```sql
-- Users with full audit
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    name VARCHAR(255),
    role VARCHAR(20),
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER,
    deleted_at TIMESTAMP NULL,
    deleted_by INTEGER NULL
);

-- Query: Who created this user?
SELECT 
    u.*,
    creator.name AS created_by_name
FROM users u
LEFT JOIN users creator ON u.created_by = creator.id
WHERE u.id = 1;
```

### Example 2: Order Tracking

```sql
-- Orders with audit trail
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    total DECIMAL(10, 2),
    status VARCHAR(20),
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER,
    status_changed_at TIMESTAMP,
    status_changed_by INTEGER
);

-- Track status changes
UPDATE orders 
SET 
    status = 'completed',
    status_changed_at = CURRENT_TIMESTAMP,
    status_changed_by = :current_user_id,
    updated_at = CURRENT_TIMESTAMP,
    updated_by = :current_user_id
WHERE id = 1;
```

### Example 3: Change History

```sql
-- Track all changes to a record
SELECT 
    operation,
    old_values->>'email' AS old_email,
    new_values->>'email' AS new_email,
    changed_by,
    changed_at
FROM audit_log
WHERE table_name = 'users' 
  AND record_id = 1
ORDER BY changed_at DESC;
```

## Best Practices

1. **Always Include Timestamps**: created_at, updated_at
2. **Track Users**: created_by, updated_by
3. **Use Triggers**: Auto-update timestamps
4. **Index Audit Fields**: For query performance
5. **Separate Audit Log**: For detailed history

## Common Patterns

### Pattern 1: Basic Audit

```sql
-- Minimal audit fields
CREATE TABLE table_name (
    id SERIAL PRIMARY KEY,
    -- ... other columns ...
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Pattern 2: Full Audit

```sql
-- Complete audit fields
CREATE TABLE table_name (
    id SERIAL PRIMARY KEY,
    -- ... other columns ...
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER,
    deleted_at TIMESTAMP NULL,
    deleted_by INTEGER NULL
);
```

### Pattern 3: Audit Log Table

```sql
-- Separate audit log
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100),
    record_id INTEGER,
    operation VARCHAR(10),
    old_values JSONB,
    new_values JSONB,
    changed_by INTEGER,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Summary

**Auditing Tables:**

1. **Basic Fields**: created_at, updated_at
2. **User Tracking**: created_by, updated_by
3. **Auto-Update**: Triggers or ON UPDATE
4. **Audit Log**: Separate table for history
5. **Best Practice**: Always include audit fields

**Key Takeaway:**
Auditing tables track when and by whom records are created/modified. Use created_at/updated_at for timestamps, created_by/updated_by for user tracking, and triggers for automatic updates. Consider separate audit log tables for detailed change history.

**Common Fields:**
- created_at, updated_at (timestamps)
- created_by, updated_by (user tracking)
- deleted_at, deleted_by (soft deletes)
- version (version tracking)

**Next Steps:**
- Learn [Soft Deletes](soft_deletes.md) for data retention
- Study [Triggers](../15_db_infrastructure/triggers.md) for automation
- Master [Database Design](../07_database_design/) for complete design

