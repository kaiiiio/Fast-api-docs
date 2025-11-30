# Database Roles & Permissions: Managing Access Control

Database roles and permissions control who can access what in the database. Proper role management is essential for security and access control.

## What are Database Roles?

**Database roles** are named entities that have database privileges. Roles can represent users or groups of users with similar access needs.

### Basic Concept

```sql
-- Create role
CREATE ROLE app_user;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON users TO app_user;

-- Users with this role have these permissions
```

## Role Types

### User Roles

```sql
-- User role (can login)
CREATE ROLE app_user WITH LOGIN PASSWORD 'secure_password';

-- Connect as this role
psql -U app_user -d mydb
```

### Group Roles

```sql
-- Group role (cannot login)
CREATE ROLE app_readonly;

-- Grant to other roles
GRANT app_readonly TO app_user;
```

## Creating Roles

### Basic Role Creation

```sql
-- Create role
CREATE ROLE role_name;

-- With options
CREATE ROLE app_user WITH
    LOGIN
    PASSWORD 'secure_password'
    CREATEDB
    CREATEROLE;
```

### Role Attributes

```sql
-- Common attributes:
-- LOGIN: Can connect to database
-- CREATEDB: Can create databases
-- CREATEROLE: Can create roles
-- SUPERUSER: Full access
-- REPLICATION: Can replicate
```

## Granting Permissions

### Table Permissions

```sql
-- Grant SELECT
GRANT SELECT ON users TO app_user;

-- Grant multiple
GRANT SELECT, INSERT, UPDATE ON users TO app_user;

-- Grant all
GRANT ALL ON users TO app_user;

-- Grant on all tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_user;
```

### Schema Permissions

```sql
-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO app_user;

-- Grant all on schema
GRANT ALL ON SCHEMA public TO app_user;
```

### Column-Level Permissions

```sql
-- Grant on specific columns
GRANT SELECT (id, name, email) ON users TO app_user;
-- Can only SELECT these columns
```

## Real-World Examples

### Example 1: Application Roles

```sql
-- Read-only role
CREATE ROLE app_readonly;
GRANT CONNECT ON DATABASE mydb TO app_readonly;
GRANT USAGE ON SCHEMA public TO app_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_readonly;

-- Read-write role
CREATE ROLE app_readwrite;
GRANT CONNECT ON DATABASE mydb TO app_readwrite;
GRANT USAGE ON SCHEMA public TO app_readwrite;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_readwrite;

-- Admin role
CREATE ROLE app_admin;
GRANT ALL ON DATABASE mydb TO app_admin;
GRANT ALL ON SCHEMA public TO app_admin;
GRANT ALL ON ALL TABLES IN SCHEMA public TO app_admin;
```

### Example 2: User-Specific Roles

```sql
-- User role
CREATE ROLE user_john WITH LOGIN PASSWORD 'password';

-- Grant to group role
GRANT app_readwrite TO user_john;

-- User has read-write access
```

### Example 3: Service Roles

```sql
-- API service role
CREATE ROLE api_service WITH LOGIN PASSWORD 'api_password';
GRANT app_readwrite TO api_service;

-- Background job role
CREATE ROLE background_jobs WITH LOGIN PASSWORD 'job_password';
GRANT app_readwrite TO background_jobs;

-- Analytics role (read-only)
CREATE ROLE analytics WITH LOGIN PASSWORD 'analytics_password';
GRANT app_readonly TO analytics;
```

## Revoking Permissions

### Revoke Permissions

```sql
-- Revoke SELECT
REVOKE SELECT ON users FROM app_user;

-- Revoke all
REVOKE ALL ON users FROM app_user;

-- Revoke from all
REVOKE ALL ON users FROM PUBLIC;
```

## Role Hierarchy

### Granting Roles to Roles

```sql
-- Create base role
CREATE ROLE base_user;

-- Create specialized role
CREATE ROLE admin_user;

-- Grant base to specialized
GRANT base_user TO admin_user;

-- Admin has both roles' permissions
```

## Default Permissions

### Set Default Permissions

```sql
-- Default permissions for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_readwrite;

-- Future tables automatically have these permissions
```

## Viewing Permissions

### Check Role Permissions

```sql
-- List roles
\du

-- Check table permissions
SELECT 
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'users';
```

## Best Practices

1. **Principle of Least Privilege**: Grant minimum necessary permissions
2. **Use Group Roles**: Create roles for permission sets, grant to users
3. **Separate Concerns**: Different roles for different services
4. **Regular Audits**: Review permissions regularly
5. **Document**: Document role purposes and permissions

## Common Patterns

### Pattern 1: Three-Tier Access

```sql
-- Read-only
CREATE ROLE readonly;
GRANT SELECT ON ALL TABLES TO readonly;

-- Read-write
CREATE ROLE readwrite;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES TO readwrite;

-- Admin
CREATE ROLE admin;
GRANT ALL ON ALL TABLES TO admin;
```

### Pattern 2: Service-Specific Roles

```sql
-- API role
CREATE ROLE api_service;
GRANT SELECT, INSERT, UPDATE ON users, orders TO api_service;

-- Background jobs role
CREATE ROLE background_jobs;
GRANT SELECT, UPDATE ON orders TO background_jobs;
```

## Common Mistakes

### ❌ Too Permissive

```sql
-- ❌ Bad: Grant all to everyone
GRANT ALL ON ALL TABLES TO PUBLIC;
-- Too permissive, security risk

-- ✅ Good: Grant only what's needed
GRANT SELECT ON users TO app_user;
```

### ❌ Superuser for Application

```sql
-- ❌ Bad: Application uses superuser
-- Security risk, too much access

-- ✅ Good: Application uses limited role
CREATE ROLE app_user WITH LOGIN;
GRANT SELECT, INSERT, UPDATE ON users TO app_user;
```

## Summary

**Database Roles & Permissions:**

1. **Roles**: Named entities with database privileges
2. **Types**: User roles (can login), group roles (cannot login)
3. **Permissions**: GRANT/REVOKE for tables, schemas, columns
4. **Hierarchy**: Roles can be granted to other roles
5. **Best Practice**: Principle of least privilege

**Key Takeaway:**
Database roles and permissions control access to database objects. Create roles for different access levels (read-only, read-write, admin) and grant them to users or services. Follow the principle of least privilege—grant only necessary permissions. Use group roles for permission sets and grant them to user roles.

**Role Management:**
- Create roles for permission sets
- Grant roles to users/services
- Use principle of least privilege
- Regular permission audits
- Document role purposes

**Next Steps:**
- Learn [Row Level Security](row_level_security.md) for row-level access
- Study [SQL Injection Prevention](sql_injection_prevention.md) for security
- Master [Prepared Statements](prepared_statements.md) for query safety

