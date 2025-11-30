# Row Level Security: Fine-Grained Access Control

Row Level Security (RLS) allows you to control access to individual rows in a table based on user context. It's a powerful PostgreSQL feature for multi-tenant applications and data isolation.

## What is Row Level Security?

**Row Level Security** is a PostgreSQL feature that restricts which rows users can SELECT, INSERT, UPDATE, or DELETE based on security policies. It provides fine-grained access control at the row level.

### Basic Concept

```sql
-- Without RLS: All users see all rows
SELECT * FROM orders;  -- Returns all orders

-- With RLS: Users only see their own rows
SELECT * FROM orders;  -- Returns only current user's orders
```

## Enabling Row Level Security

### Enable RLS on Table

```sql
-- Enable RLS on table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Now RLS policies control access
```

### Check RLS Status

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'orders';
```

## Creating Policies

### Policy Syntax

```sql
-- Create policy
CREATE POLICY policy_name
ON table_name
FOR operation  -- ALL, SELECT, INSERT, UPDATE, DELETE
TO role_name  -- User or role
USING (condition);  -- Condition for SELECT/UPDATE/DELETE
WITH CHECK (condition);  -- Condition for INSERT/UPDATE
```

### Example: User-Scoped Data

```sql
-- Users can only see their own orders
CREATE POLICY user_orders_policy
ON orders
FOR ALL
TO authenticated_users
USING (user_id = current_user_id())
WITH CHECK (user_id = current_user_id());

-- current_user_id() returns current user's ID
```

## Real-World Examples

### Example 1: Multi-Tenant Application

```sql
-- Orders table with tenant_id
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    total DECIMAL(10, 2)
);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policy: Users only see their tenant's data
CREATE POLICY tenant_isolation_policy
ON orders
FOR ALL
TO application_user
USING (tenant_id = current_setting('app.current_tenant_id')::INTEGER)
WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::INTEGER);

-- Set tenant context
SET app.current_tenant_id = '123';
SELECT * FROM orders;  -- Only sees tenant 123's orders
```

### Example 2: User Data Isolation

```sql
-- Users can only access their own data
CREATE POLICY user_data_policy
ON users
FOR ALL
TO authenticated_users
USING (id = current_user_id())
WITH CHECK (id = current_user_id());

-- Users can only see/update their own profile
```

### Example 3: Role-Based Access

```sql
-- Admins see all, users see only their own
CREATE POLICY admin_full_access
ON orders
FOR ALL
TO admin_role
USING (true)  -- Admins see everything
WITH CHECK (true);

CREATE POLICY user_own_orders
ON orders
FOR ALL
TO user_role
USING (user_id = current_user_id())
WITH CHECK (user_id = current_user_id());
```

## Policy Types

### SELECT Policy

```sql
-- Control which rows can be selected
CREATE POLICY select_own_orders
ON orders
FOR SELECT
TO authenticated_users
USING (user_id = current_user_id());
```

### INSERT Policy

```sql
-- Control what can be inserted
CREATE POLICY insert_own_orders
ON orders
FOR INSERT
TO authenticated_users
WITH CHECK (user_id = current_user_id());
```

### UPDATE Policy

```sql
-- Control what can be updated
CREATE POLICY update_own_orders
ON orders
FOR UPDATE
TO authenticated_users
USING (user_id = current_user_id())  -- Can only update own
WITH CHECK (user_id = current_user_id());  -- Must stay own
```

### DELETE Policy

```sql
-- Control what can be deleted
CREATE POLICY delete_own_orders
ON orders
FOR DELETE
TO authenticated_users
USING (user_id = current_user_id());
```

## Using Functions for Context

### Current User Function

```sql
-- Function to get current user ID
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS INTEGER AS $$
BEGIN
    RETURN current_setting('app.current_user_id', true)::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- Set user context
SET app.current_user_id = '123';
```

### Tenant Context Function

```sql
-- Function to get current tenant ID
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS INTEGER AS $$
BEGIN
    RETURN current_setting('app.current_tenant_id', true)::INTEGER;
END;
$$ LANGUAGE plpgsql;
```

## Bypassing RLS

### Superuser Bypass

```sql
-- Superusers bypass RLS by default
-- Can see all rows regardless of policies
```

### Policy Bypass

```sql
-- Create policy that allows bypass
CREATE POLICY bypass_policy
ON orders
FOR ALL
TO admin_role
USING (true)  -- No restrictions
WITH CHECK (true);
```

## Best Practices

1. **Enable RLS**: Enable on all tables with sensitive data
2. **Test Policies**: Thoroughly test all policy scenarios
3. **Use Functions**: Use functions for context (user_id, tenant_id)
4. **Document**: Document policies and their purposes
5. **Monitor**: Monitor policy performance

## Common Patterns

### Pattern 1: User Isolation

```sql
-- Users only see their own data
CREATE POLICY user_isolation
ON table_name
FOR ALL
TO application_user
USING (user_id = current_user_id())
WITH CHECK (user_id = current_user_id());
```

### Pattern 2: Tenant Isolation

```sql
-- Tenants only see their own data
CREATE POLICY tenant_isolation
ON table_name
FOR ALL
TO application_user
USING (tenant_id = current_tenant_id())
WITH CHECK (tenant_id = current_tenant_id());
```

### Pattern 3: Role-Based

```sql
-- Admins see all, users see own
CREATE POLICY admin_access ON table_name FOR ALL TO admin USING (true);
CREATE POLICY user_access ON table_name FOR ALL TO user USING (user_id = current_user_id());
```

## Common Mistakes

### ❌ Forgetting to Enable RLS

```sql
-- ❌ Bad: Policy created but RLS not enabled
CREATE POLICY ... ON orders ...;
-- Policy exists but RLS disabled, no effect

-- ✅ Good: Enable RLS first
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY ... ON orders ...;
```

### ❌ Missing WITH CHECK

```sql
-- ❌ Bad: Only USING clause
CREATE POLICY insert_orders
ON orders
FOR INSERT
USING (user_id = current_user_id());
-- Can insert with any user_id!

-- ✅ Good: WITH CHECK for INSERT
CREATE POLICY insert_orders
ON orders
FOR INSERT
WITH CHECK (user_id = current_user_id());
```

## Summary

**Row Level Security:**

1. **Purpose**: Control row-level access based on user context
2. **Enable**: ALTER TABLE ... ENABLE ROW LEVEL SECURITY
3. **Policies**: Define who can access which rows
4. **Context**: Use functions for user_id, tenant_id
5. **Use Cases**: Multi-tenant, user isolation, role-based access

**Key Takeaway:**
Row Level Security provides fine-grained access control at the row level. Enable RLS on tables with sensitive data, create policies that define access rules, and use context functions (current_user_id, current_tenant_id) to determine which rows users can access. RLS is essential for multi-tenant applications and data isolation.

**RLS Principles:**
- Enable RLS on sensitive tables
- Create policies for each operation
- Use context functions for user/tenant
- Test policies thoroughly
- Document access rules

**Next Steps:**
- Learn [Database Roles & Permissions](database_roles_permissions.md) for user management
- Study [SQL Injection Prevention](sql_injection_prevention.md) for security
- Master [Prepared Statements](prepared_statements.md) for query safety

