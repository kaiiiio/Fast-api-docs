# Multi-Tenant Database Patterns: Isolating Customer Data

Multi-tenant applications serve multiple customers (tenants) from a single database. Choosing the right pattern is crucial for security, performance, and scalability.

## Multi-Tenant Patterns

### Pattern 1: Shared Database, Shared Schema (Row-Level Security)

**All tenants in same tables, isolated by tenant_id.**

```sql
-- All tenants in same tables
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,  -- Tenant identifier
    email VARCHAR(255),
    name VARCHAR(255)
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,  -- Tenant identifier
    user_id INTEGER,
    total DECIMAL(10, 2)
);

-- Index tenant_id for performance
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_orders_tenant ON orders(tenant_id);
```

**Query Pattern:**
```sql
-- Always filter by tenant_id
SELECT * FROM users WHERE tenant_id = :current_tenant_id;
SELECT * FROM orders WHERE tenant_id = :current_tenant_id AND user_id = 1;
```

**Pros:**
- ✅ Simple implementation
- ✅ Easy maintenance
- ✅ Cost-effective
- ✅ Easy to scale

**Cons:**
- ⚠️ Risk of data leakage (must always filter)
- ⚠️ Performance at scale (all tenants in same tables)

### Pattern 2: Shared Database, Separate Schemas

**Each tenant has own schema in same database.**

```sql
-- Tenant 1 schema
CREATE SCHEMA tenant_1;
CREATE TABLE tenant_1.users (...);
CREATE TABLE tenant_1.orders (...);

-- Tenant 2 schema
CREATE SCHEMA tenant_2;
CREATE TABLE tenant_2.users (...);
CREATE TABLE tenant_2.orders (...);
```

**Query Pattern:**
```sql
-- Switch schema based on tenant
SET search_path TO tenant_1;
SELECT * FROM users;  -- Queries tenant_1.users
```

**Pros:**
- ✅ Better isolation
- ✅ Easier migrations per tenant
- ✅ Can customize schema per tenant

**Cons:**
- ⚠️ More complex
- ⚠️ Harder to maintain
- ⚠️ Schema limit per database

### Pattern 3: Separate Databases

**Each tenant has own database.**

```sql
-- Tenant 1 database
CREATE DATABASE tenant_1_db;
USE tenant_1_db;
CREATE TABLE users (...);
CREATE TABLE orders (...);

-- Tenant 2 database
CREATE DATABASE tenant_2_db;
USE tenant_2_db;
CREATE TABLE users (...);
CREATE TABLE orders (...);
```

**Pros:**
- ✅ Complete isolation
- ✅ Best security
- ✅ Independent scaling
- ✅ Easy backups per tenant

**Cons:**
- ❌ Most expensive
- ❌ Complex management
- ❌ Harder to share data

## Row-Level Security (PostgreSQL)

### Implementing RLS

```sql
-- Enable RLS on table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their tenant's data
CREATE POLICY tenant_isolation ON users
FOR ALL
USING (tenant_id = current_setting('app.current_tenant_id')::INTEGER);

-- Set tenant context
SET app.current_tenant_id = 1;

-- Query automatically filtered
SELECT * FROM users;  -- Only returns tenant 1's users
```

### Application-Level Filtering

```sql
-- Always include tenant_id in queries
SELECT * FROM users WHERE tenant_id = :current_tenant_id;

-- In application code
function getUsers(tenantId) {
    return db.query('SELECT * FROM users WHERE tenant_id = $1', [tenantId]);
}
```

## Real-World Implementation

### Example 1: SaaS Application

```sql
-- Shared database, shared schema
CREATE TABLE tenants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    subdomain VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    email VARCHAR(255),
    name VARCHAR(255),
    UNIQUE(tenant_id, email)  -- Email unique per tenant
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    user_id INTEGER REFERENCES users(id),
    total DECIMAL(10, 2)
);

-- Indexes
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_orders_tenant ON orders(tenant_id);
CREATE INDEX idx_orders_tenant_user ON orders(tenant_id, user_id);
```

### Example 2: Query with Tenant Context

```sql
-- Get tenant from subdomain
SELECT id FROM tenants WHERE subdomain = 'acme';

-- Query with tenant filter
SELECT 
    u.id,
    u.name,
    u.email,
    COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id AND o.tenant_id = :tenant_id
WHERE u.tenant_id = :tenant_id
GROUP BY u.id, u.name, u.email;
```

## Security Considerations

### Always Filter by Tenant

```sql
-- ❌ Dangerous: Missing tenant filter
SELECT * FROM users WHERE id = 1;
-- Could return data from any tenant!

-- ✅ Safe: Always include tenant filter
SELECT * FROM users WHERE id = 1 AND tenant_id = :current_tenant_id;
```

### Application-Level Enforcement

```javascript
// Application code: Always include tenant_id
function getUser(userId, tenantId) {
    return db.query(
        'SELECT * FROM users WHERE id = $1 AND tenant_id = $2',
        [userId, tenantId]
    );
}
```

## Performance Optimization

### Index Tenant Columns

```sql
-- Always index tenant_id
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_orders_tenant ON orders(tenant_id);

-- Composite indexes with tenant_id first
CREATE INDEX idx_orders_tenant_user ON orders(tenant_id, user_id);
CREATE INDEX idx_orders_tenant_date ON orders(tenant_id, created_at);
```

### Partitioning by Tenant

```sql
-- Partition large tables by tenant (PostgreSQL)
CREATE TABLE orders (
    id SERIAL,
    tenant_id INTEGER,
    total DECIMAL(10, 2),
    created_at TIMESTAMP
) PARTITION BY HASH (tenant_id);

-- Create partitions
CREATE TABLE orders_tenant_1 PARTITION OF orders
FOR VALUES WITH (MODULUS 10, REMAINDER 0);
```

## Best Practices

1. **Always Filter**: Every query must include tenant_id
2. **Index Tenant ID**: Always index tenant_id column
3. **Composite Indexes**: Include tenant_id first in composite indexes
4. **Application Enforcement**: Enforce at application level
5. **Row-Level Security**: Use RLS for additional protection (PostgreSQL)

## Common Mistakes

### ❌ Missing Tenant Filter

```sql
-- ❌ Dangerous: No tenant filter
SELECT * FROM users WHERE email = 'user@example.com';
-- Could return data from any tenant!

-- ✅ Safe: Always filter by tenant
SELECT * FROM users 
WHERE email = 'user@example.com' 
  AND tenant_id = :current_tenant_id;
```

### ❌ No Index on Tenant ID

```sql
-- ❌ Bad: No index on tenant_id
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,  -- No index!
    email VARCHAR(255)
);

-- Slow queries
SELECT * FROM users WHERE tenant_id = 1;  -- Full table scan

-- ✅ Good: Index tenant_id
CREATE INDEX idx_users_tenant ON users(tenant_id);
```

## Summary

**Multi-Tenant Patterns:**

1. **Shared DB, Shared Schema**: Row-level isolation (most common)
2. **Shared DB, Separate Schemas**: Schema per tenant
3. **Separate Databases**: Database per tenant (best isolation)
4. **Row-Level Security**: PostgreSQL RLS for automatic filtering
5. **Always Filter**: Every query must include tenant_id

**Key Takeaway:**
Multi-tenant applications require careful data isolation. Use shared database with tenant_id filtering for most cases. Always index tenant_id, include it in every query, and enforce at application level. Consider Row-Level Security for additional protection.

**Decision Guide:**
- Most cases: Shared DB, Shared Schema (tenant_id)
- Better isolation: Separate Schemas
- Maximum isolation: Separate Databases

**Next Steps:**
- Learn [Foreign Keys](../01_fundamentals/relational_concepts.md) for relationships
- Study [Indexes](../08_indexes/what_is_index.md) for performance
- Master [Security](../12_security/) for data protection

