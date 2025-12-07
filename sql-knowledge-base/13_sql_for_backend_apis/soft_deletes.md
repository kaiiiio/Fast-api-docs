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

---

## 🎯 Interview Questions: SQL

### Q1: Explain soft deletes vs hard deletes, including when to use each approach, their trade-offs, and implementation patterns. Provide examples showing how to implement soft deletes efficiently and handle queries that need to exclude deleted records.

**Answer:**

**Soft Delete vs Hard Delete:**

**Soft Delete:** Marking a record as deleted without actually removing it from the database. The record remains in the table but is marked with a deletion timestamp or flag, making it effectively invisible to normal queries.

**Hard Delete:** Permanently removing a record from the database using DELETE statement. The record is completely removed and cannot be recovered.

**Soft Delete Implementation:**

**Pattern 1: deleted_at Timestamp**

**Schema:**
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(255),
    deleted_at TIMESTAMP NULL  -- NULL = active, timestamp = deleted
);
```

**Soft Delete:**
```sql
-- Mark as deleted
UPDATE users 
SET deleted_at = CURRENT_TIMESTAMP 
WHERE id = 123;
-- Record remains in table, but marked as deleted
```

**Query Active Records:**
```sql
-- Get only active users
SELECT * FROM users 
WHERE deleted_at IS NULL;
```

**Query Deleted Records:**
```sql
-- Get only deleted users
SELECT * FROM users 
WHERE deleted_at IS NOT NULL;
```

**Restore:**
```sql
-- Restore deleted user
UPDATE users 
SET deleted_at = NULL 
WHERE id = 123;
```

**Pattern 2: is_deleted Boolean Flag**

**Schema:**
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(255),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP NULL
);
```

**Soft Delete:**
```sql
UPDATE users 
SET is_deleted = true, 
    deleted_at = CURRENT_TIMESTAMP 
WHERE id = 123;
```

**Query Active Records:**
```sql
SELECT * FROM users 
WHERE is_deleted = false;
```

**When to Use Soft Delete:**

**1. Data Recovery:**
- Need to restore accidentally deleted data
- Audit requirements
- Compliance regulations

**2. Referential Integrity:**
- Foreign keys reference the record
- Cannot hard delete without cascading
- Maintains relationships

**3. Historical Data:**
- Need to preserve history
- Analytics on deleted records
- Audit trails

**4. Legal/Compliance:**
- Data retention requirements
- Legal hold requirements
- Regulatory compliance

**When to Use Hard Delete:**

**1. Privacy Regulations:**
- GDPR "right to be forgotten"
- User requests permanent deletion
- Privacy requirements

**2. Storage Constraints:**
- Limited storage space
- Old data not needed
- Cost optimization

**3. Performance:**
- Large tables with many deleted records
- Queries slow with soft deletes
- Need maximum performance

**4. Temporary Data:**
- Test data
- Temporary records
- No recovery needed

**Trade-offs:**

**Soft Delete Benefits:**
- ✅ Data recovery possible
- ✅ Maintains referential integrity
- ✅ Audit trail preserved
- ✅ Historical data available

**Soft Delete Costs:**
- ❌ More storage (deleted records remain)
- ❌ Queries must filter deleted records
- ❌ Index overhead (if indexing deleted_at)
- ❌ Potential performance impact

**Hard Delete Benefits:**
- ✅ Less storage
- ✅ Simpler queries (no filtering needed)
- ✅ Better performance
- ✅ Privacy compliance

**Hard Delete Costs:**
- ❌ No recovery possible
- ❌ Breaks referential integrity (if foreign keys)
- ❌ No audit trail
- ❌ Historical data lost

**Efficient Implementation:**

**1. Partial Indexes:**

**PostgreSQL:**
```sql
-- Index only active records
CREATE INDEX idx_users_email_active ON users(email) 
WHERE deleted_at IS NULL;

-- Query uses index efficiently
SELECT * FROM users 
WHERE email = 'user@example.com' 
  AND deleted_at IS NULL;
-- Index only contains active records
-- Faster queries!
```

**2. Views for Active Records:**
```sql
-- Create view for active users
CREATE VIEW active_users AS
SELECT * FROM users 
WHERE deleted_at IS NULL;

-- Simple queries
SELECT * FROM active_users;
-- Automatically excludes deleted records
```

**3. Application-Level Abstraction:**
```javascript
// ORM/Application level
class User {
    static findAll() {
        return db.query('SELECT * FROM users WHERE deleted_at IS NULL');
    }
    
    static findDeleted() {
        return db.query('SELECT * FROM users WHERE deleted_at IS NOT NULL');
    }
    
    softDelete(id) {
        return db.query(
            'UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?',
            [id]
        );
    }
}
```

**4. Default Filtering:**
```sql
-- Always filter deleted records by default
-- Use views or application logic
-- Prevent accidental inclusion of deleted records
```

**Performance Considerations:**

**Without Index:**
```sql
SELECT * FROM users 
WHERE deleted_at IS NULL;
-- Sequential scan: Checks deleted_at for all rows
-- Time: ~5,000ms for 1 million rows
```

**With Partial Index:**
```sql
CREATE INDEX idx_users_active ON users(email) 
WHERE deleted_at IS NULL;

SELECT * FROM users 
WHERE email = 'user@example.com' 
  AND deleted_at IS NULL;
-- Index scan: Only active records in index
-- Time: ~5ms
-- 1000x faster!
```

**Query Patterns:**

**1. Always Exclude Deleted:**
```sql
-- ✅ Good: Always filter
SELECT * FROM users 
WHERE deleted_at IS NULL 
  AND email = 'user@example.com';
```

**2. Include Deleted When Needed:**
```sql
-- Get all records including deleted
SELECT * FROM users;

-- Get only deleted
SELECT * FROM users 
WHERE deleted_at IS NOT NULL;
```

**3. Count with Soft Deletes:**
```sql
-- Count active users
SELECT COUNT(*) FROM users 
WHERE deleted_at IS NULL;

-- Count deleted users
SELECT COUNT(*) FROM users 
WHERE deleted_at IS NOT NULL;
```

**System Design Consideration**: Choosing between soft and hard deletes depends on:
1. **Recovery Needs**: Can you recover from mistakes?
2. **Compliance**: Legal/regulatory requirements
3. **Performance**: Query performance impact
4. **Storage**: Cost of keeping deleted data

Soft deletes provide data recovery and audit trails but require careful implementation to maintain performance. Hard deletes are simpler and more performant but offer no recovery. The choice depends on your specific requirements for recovery, compliance, and performance.

---

### Q2: Explain how to implement efficient search and filtering in SQL queries. Discuss different search strategies (LIKE, full-text search), filtering patterns, and performance optimization techniques. Provide examples showing how to build dynamic WHERE clauses for flexible filtering.

**Answer:**

**Search and Filtering Strategies:**

Implementing efficient search and filtering requires understanding different search methods, when to use each, and how to optimize for performance. The approach depends on search requirements, data volume, and performance needs.

**1. LIKE/ILIKE Pattern Matching:**

**Basic LIKE:**
```sql
-- Case-sensitive search
SELECT * FROM products 
WHERE name LIKE '%laptop%';
-- Matches: "Laptop", "laptop", "Gaming Laptop"
-- Case-sensitive: "Laptop" matches, "LAPTOP" doesn't
```

**ILIKE (PostgreSQL):**
```sql
-- Case-insensitive search
SELECT * FROM products 
WHERE name ILIKE '%laptop%';
-- Matches: "Laptop", "LAPTOP", "laptop", "Gaming Laptop"
-- Case-insensitive
```

**Performance:**
```sql
-- ❌ Slow: Leading wildcard
SELECT * FROM products 
WHERE name LIKE '%laptop%';
-- Cannot use index efficiently
-- Sequential scan required
-- Time: ~5,000ms for 1 million rows

-- ✅ Faster: Trailing wildcard
SELECT * FROM products 
WHERE name LIKE 'laptop%';
-- Can use index (prefix search)
-- Index scan possible
-- Time: ~50ms
```

**2. Full-Text Search:**

**PostgreSQL Full-Text Search:**
```sql
-- Create full-text search vector
ALTER TABLE products 
ADD COLUMN search_vector tsvector 
GENERATED ALWAYS AS (
    to_tsvector('english', 
        COALESCE(name, '') || ' ' || 
        COALESCE(description, '')
    )
) STORED;

-- Create GIN index
CREATE INDEX idx_products_search ON products 
USING GIN(search_vector);

-- Full-text search query
SELECT 
    id,
    name,
    description,
    ts_rank(search_vector, query) AS rank
FROM products, to_tsquery('english', 'laptop & gaming') query
WHERE search_vector @@ query
ORDER BY rank DESC;
```

**Benefits:**
- Fast: Uses GIN index
- Relevance ranking
- Handles word variations
- Better than LIKE for large datasets

**3. Dynamic WHERE Clauses:**

**Building Dynamic Filters:**
```javascript
function buildProductQuery(filters) {
    const conditions = [];
    const params = [];
    let paramIndex = 1;
    
    // Category filter
    if (filters.category_id) {
        conditions.push(`category_id = $${paramIndex}`);
        params.push(filters.category_id);
        paramIndex++;
    }
    
    // Price range
    if (filters.min_price) {
        conditions.push(`price >= $${paramIndex}`);
        params.push(filters.min_price);
        paramIndex++;
    }
    
    if (filters.max_price) {
        conditions.push(`price <= $${paramIndex}`);
        params.push(filters.max_price);
        paramIndex++;
    }
    
    // Search
    if (filters.search) {
        conditions.push(`name ILIKE $${paramIndex}`);
        params.push(`%${filters.search}%`);
        paramIndex++;
    }
    
    // Status
    if (filters.status) {
        conditions.push(`status = $${paramIndex}`);
        params.push(filters.status);
        paramIndex++;
    }
    
    // Build query
    const whereClause = conditions.length > 0 
        ? 'WHERE ' + conditions.join(' AND ')
        : '';
    
    const query = `
        SELECT * FROM products
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(filters.limit || 20);
    params.push((filters.page - 1) * (filters.limit || 20));
    
    return { query, params };
}
```

**4. Performance Optimization:**

**Index Filter Columns:**
```sql
-- Index frequently filtered columns
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_status ON products(status);

-- Composite index for common filter combinations
CREATE INDEX idx_products_category_price 
ON products(category_id, price);
```

**Partial Indexes:**
```sql
-- Index only active products
CREATE INDEX idx_products_active 
ON products(category_id, price) 
WHERE status = 'active';
-- Smaller index, faster queries
```

**Covering Indexes:**
```sql
-- Covering index for list queries
CREATE INDEX idx_products_covering 
ON products(category_id, price) 
INCLUDE (id, name, stock_quantity);
-- Index-only scan possible
```

**System Design Consideration**: Efficient search and filtering requires:
1. **Index Strategy**: Indexing filter columns
2. **Query Structure**: Building dynamic WHERE clauses
3. **Search Method**: Choosing LIKE vs full-text search
4. **Performance**: Optimizing for speed

Efficient search and filtering requires proper indexing, appropriate search methods (LIKE for simple, full-text for complex), and dynamic query building. Always use parameterized queries, index filter columns, and optimize for your specific use case.

