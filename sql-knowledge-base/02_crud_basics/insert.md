# INSERT: Adding Data to Tables

The `INSERT` statement adds new rows to a table. Understanding different INSERT patterns is essential for efficient data management.

## Basic INSERT Syntax

```sql
INSERT INTO table_name (column1, column2, column3, ...)
VALUES (value1, value2, value3, ...);
```

## Simple INSERT Examples

### Insert Single Row

```sql
-- Insert a new user
INSERT INTO users (email, name, created_at)
VALUES ('john@example.com', 'John Doe', CURRENT_TIMESTAMP);
```

**Result:**
```
1 row inserted
```

### Insert with All Columns

```sql
-- If inserting into all columns, can omit column list
INSERT INTO users
VALUES (1, 'john@example.com', 'John Doe', CURRENT_TIMESTAMP);
```

**⚠️ Warning:** Not recommended - fragile if table structure changes.

### Insert with Default Values

```sql
-- Use DEFAULT keyword or omit column
INSERT INTO users (email, name)
VALUES ('jane@example.com', 'Jane Smith');
-- created_at will use DEFAULT value (CURRENT_TIMESTAMP)
```

### Insert Multiple Rows

```sql
-- Insert multiple rows in one statement
INSERT INTO users (email, name, created_at)
VALUES 
    ('alice@example.com', 'Alice Brown', CURRENT_TIMESTAMP),
    ('bob@example.com', 'Bob Johnson', CURRENT_TIMESTAMP),
    ('charlie@example.com', 'Charlie Wilson', CURRENT_TIMESTAMP);
```

**Benefits:**
- Single database round-trip
- Faster than multiple INSERTs
- Atomic operation (all or nothing)

## INSERT with SELECT (Copy Data)

Insert data from another table or query result.

### Copy from Another Table

```sql
-- Copy all active users to archived_users
INSERT INTO archived_users (email, name, created_at)
SELECT email, name, created_at
FROM users
WHERE is_active = false;
```

### Insert with Calculations

```sql
-- Insert calculated values
INSERT INTO order_summaries (user_id, total_orders, total_spent, avg_order_value)
SELECT 
    user_id,
    COUNT(*) AS total_orders,
    SUM(total) AS total_spent,
    AVG(total) AS avg_order_value
FROM orders
GROUP BY user_id;
```

### Insert from JOIN

```sql
-- Insert data from joined tables
INSERT INTO user_order_summary (user_email, user_name, order_count)
SELECT 
    u.email,
    u.name,
    COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.email, u.name;
```

## INSERT with RETURNING (PostgreSQL)

Get inserted data back immediately (PostgreSQL feature).

### Basic RETURNING

```sql
-- Insert and get the new row
INSERT INTO users (email, name)
VALUES ('newuser@example.com', 'New User')
RETURNING *;
```

**Result:**
```
┌────┬──────────────────────┬──────────┬─────────────────────┐
│ id │ email                │ name     │ created_at          │
├────┼──────────────────────┼──────────┼─────────────────────┤
│ 5  │ newuser@example.com  │ New User │ 2024-11-30 10:00:00 │
└────┴──────────────────────┴──────────┴─────────────────────┘
```

### RETURNING Specific Columns

```sql
-- Return only id and email
INSERT INTO users (email, name)
VALUES ('newuser@example.com', 'New User')
RETURNING id, email;
```

### RETURNING with Calculations

```sql
-- Return calculated values
INSERT INTO orders (user_id, total)
VALUES (1, 99.99)
RETURNING 
    id,
    total,
    total * 1.08 AS total_with_tax;
```

## INSERT with ON CONFLICT (UPSERT)

Handle conflicts when inserting (PostgreSQL, MySQL 8.0+).

### ON CONFLICT DO NOTHING

```sql
-- Ignore if email already exists
INSERT INTO users (email, name)
VALUES ('john@example.com', 'John Doe')
ON CONFLICT (email) DO NOTHING;
```

**Use Case:** Idempotent inserts - safe to retry.

### ON CONFLICT DO UPDATE (UPSERT)

```sql
-- Update if exists, insert if not
INSERT INTO users (email, name, last_login)
VALUES ('john@example.com', 'John Doe', CURRENT_TIMESTAMP)
ON CONFLICT (email) 
DO UPDATE SET 
    last_login = EXCLUDED.last_login,
    updated_at = CURRENT_TIMESTAMP;
```

**Use Case:** Update user's last login, create if new user.

### ON CONFLICT with Multiple Columns

```sql
-- Handle conflict on composite unique constraint
INSERT INTO user_permissions (user_id, permission_id, granted_at)
VALUES (1, 5, CURRENT_TIMESTAMP)
ON CONFLICT (user_id, permission_id) 
DO UPDATE SET granted_at = EXCLUDED.granted_at;
```

## INSERT with Subqueries

Insert data based on query results.

### Insert from Subquery

```sql
-- Insert top 10 products by sales
INSERT INTO featured_products (product_id, featured_at)
SELECT product_id
FROM order_items
GROUP BY product_id
ORDER BY SUM(quantity) DESC
LIMIT 10;
```

### Insert with Conditional Logic

```sql
-- Insert users with their order count
INSERT INTO user_stats (user_id, order_count, status)
SELECT 
    u.id,
    COUNT(o.id) AS order_count,
    CASE
        WHEN COUNT(o.id) > 10 THEN 'VIP'
        WHEN COUNT(o.id) > 5 THEN 'Regular'
        ELSE 'New'
    END AS status
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id;
```

## Bulk INSERT Patterns

### Pattern 1: Batch Insert

```sql
-- Insert in batches (better for large datasets)
INSERT INTO products (name, price, category_id)
VALUES 
    ('Product 1', 99.99, 1),
    ('Product 2', 149.99, 1),
    ('Product 3', 79.99, 2),
    -- ... up to 1000 rows per batch
    ('Product 1000', 199.99, 3);
```

**Best Practice:** Insert 100-1000 rows per statement for optimal performance.

### Pattern 2: Copy from File (PostgreSQL)

```sql
-- Fast bulk insert from CSV
COPY products (name, price, category_id)
FROM '/path/to/products.csv'
WITH (FORMAT csv, HEADER true);
```

### Pattern 3: Insert from Application

```javascript
// Node.js example: Batch insert
const values = products.map(p => 
    `('${p.name}', ${p.price}, ${p.categoryId})`
).join(',');

await db.query(`
    INSERT INTO products (name, price, category_id)
    VALUES ${values}
`);
```

## INSERT with Auto-Generated Values

### Auto-Increment IDs

```sql
-- ID automatically generated
INSERT INTO users (email, name)
VALUES ('user@example.com', 'User Name');

-- Get the generated ID (PostgreSQL)
INSERT INTO users (email, name)
VALUES ('user@example.com', 'User Name')
RETURNING id;
```

### UUIDs

```sql
-- Generate UUID (PostgreSQL)
INSERT INTO users (id, email, name)
VALUES (gen_random_uuid(), 'user@example.com', 'User Name');

-- Or use DEFAULT
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255)
);

INSERT INTO users (email) VALUES ('user@example.com');
-- id automatically generated
```

### Timestamps

```sql
-- Use CURRENT_TIMESTAMP
INSERT INTO users (email, name, created_at)
VALUES ('user@example.com', 'User Name', CURRENT_TIMESTAMP);

-- Or rely on DEFAULT
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (email) VALUES ('user@example.com');
-- created_at automatically set
```

## INSERT with Constraints

### Handling NOT NULL Constraints

```sql
-- ❌ Error: name is NOT NULL
INSERT INTO users (email) VALUES ('user@example.com');

-- ✅ Correct: Provide all required fields
INSERT INTO users (email, name) VALUES ('user@example.com', 'User Name');
```

### Handling UNIQUE Constraints

```sql
-- ❌ Error: Email already exists
INSERT INTO users (email, name)
VALUES ('existing@example.com', 'New Name');

-- ✅ Handle with ON CONFLICT
INSERT INTO users (email, name)
VALUES ('existing@example.com', 'New Name')
ON CONFLICT (email) DO NOTHING;
```

### Handling FOREIGN KEY Constraints

```sql
-- ❌ Error: category_id doesn't exist
INSERT INTO products (name, price, category_id)
VALUES ('Product', 99.99, 999);

-- ✅ Correct: Use valid category_id
INSERT INTO products (name, price, category_id)
VALUES ('Product', 99.99, 1);
```

## Common Patterns

### Pattern 1: Insert with Defaults

```sql
-- Insert with all defaults
INSERT INTO users DEFAULT VALUES;
-- Uses DEFAULT for all columns
```

### Pattern 2: Insert from Stored Procedure

```sql
-- Call function that returns data
INSERT INTO user_backup (id, email, name)
SELECT * FROM get_inactive_users();
```

### Pattern 3: Insert with Validation

```sql
-- Insert only valid data
INSERT INTO products (name, price, category_id)
SELECT name, price, category_id
FROM staging_products
WHERE price > 0 
  AND category_id IN (SELECT id FROM categories)
  AND name IS NOT NULL;
```

## Performance Considerations

### 1. **Batch Inserts**

```sql
-- ❌ Slow: One INSERT per row
INSERT INTO products (name, price) VALUES ('Product 1', 99.99);
INSERT INTO products (name, price) VALUES ('Product 2', 149.99);
-- ... 1000 more times

-- ✅ Fast: Batch INSERT
INSERT INTO products (name, price)
VALUES 
    ('Product 1', 99.99),
    ('Product 2', 149.99),
    -- ... 1000 rows
    ('Product 1000', 199.99);
```

### 2. **Disable Indexes During Bulk Insert**

```sql
-- PostgreSQL: Disable index temporarily
ALTER TABLE products DISABLE TRIGGER ALL;
-- Bulk insert
INSERT INTO products ... -- many rows
ALTER TABLE products ENABLE TRIGGER ALL;
-- Rebuild indexes
REINDEX TABLE products;
```

### 3. **Use COPY for Very Large Datasets**

```sql
-- Much faster than INSERT for large files
COPY products FROM '/path/to/large_file.csv' WITH CSV;
```

## Common Mistakes

### ❌ Not Handling Conflicts

```sql
-- Bad: Will fail if email exists
INSERT INTO users (email, name)
VALUES ('existing@example.com', 'Name');
```

### ❌ Inserting NULL into NOT NULL Column

```sql
-- Bad: Will fail
INSERT INTO users (email) VALUES ('user@example.com');
-- name is NOT NULL but not provided
```

### ❌ Wrong Column Order

```sql
-- Bad: Values don't match column order
INSERT INTO users (email, name, age)
VALUES ('user@example.com', 30, 'John Doe');
-- Type mismatch!
```

### ❌ Not Using Transactions for Multiple Inserts

```sql
-- Bad: Partial failure possible
INSERT INTO orders (user_id, total) VALUES (1, 99.99);
INSERT INTO order_items (order_id, product_id) VALUES (1, 5);
-- If second fails, first still inserted (orphaned order)

-- Good: Use transaction
BEGIN;
INSERT INTO orders (user_id, total) VALUES (1, 99.99);
INSERT INTO order_items (order_id, product_id) VALUES (1, 5);
COMMIT;
```

## Best Practices

1. **Always Specify Column Names**: Don't rely on column order
2. **Use Batch Inserts**: Insert multiple rows in one statement
3. **Handle Conflicts**: Use ON CONFLICT for idempotent operations
4. **Validate Data**: Check constraints before inserting
5. **Use Transactions**: For multiple related inserts
6. **Use RETURNING**: When you need the inserted data
7. **Consider Performance**: Use COPY for very large datasets

## Summary

**INSERT Statement Essentials:**

1. **Basic Syntax**: `INSERT INTO table (columns) VALUES (values)`
2. **Multiple Rows**: Insert multiple rows in one statement
3. **INSERT SELECT**: Copy data from queries
4. **RETURNING**: Get inserted data back (PostgreSQL)
5. **ON CONFLICT**: Handle duplicates (UPSERT)
6. **Bulk Operations**: Batch inserts, COPY for large datasets
7. **Constraints**: Handle NOT NULL, UNIQUE, FOREIGN KEY

**Key Takeaway:**
INSERT is straightforward, but mastering batch inserts, conflict handling, and performance optimization is crucial for production applications. Always use transactions for related inserts and handle constraints properly.

**Next Steps:**
- Learn [UPDATE](update.md) to modify existing data
- Study [RETURNING](returning.md) for PostgreSQL-specific features
- Master [Transactions](../09_transactions_concurrency/transaction_control.md) for data integrity

