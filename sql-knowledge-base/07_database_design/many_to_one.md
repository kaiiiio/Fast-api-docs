# Many-to-One Relationships: Foreign Keys

Many-to-one relationships are the most common database relationship. Multiple records in one table relate to a single record in another table.

## What is Many-to-One?

**Many-to-One:** Multiple records in Table A relate to one record in Table B.

**Example:**
- Many orders belong to one user
- Many products belong to one category
- Many comments belong to one post

## Basic Pattern

### Structure

```sql
-- "One" side (parent table)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255)
);

-- "Many" side (child table)
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),  -- Foreign key
    total DECIMAL(10, 2),
    created_at TIMESTAMP
);
```

## Real-World Examples

### Example 1: Orders and Users

```sql
-- Users table (one)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE
);

-- Orders table (many)
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    total DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on foreign key for performance
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Query: Get user's orders
SELECT 
    o.id,
    o.total,
    o.status,
    u.name AS user_name
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE u.id = 1;
```

### Example 2: Products and Categories

```sql
-- Categories table (one)
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

-- Products table (many)
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    stock_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index foreign key
CREATE INDEX idx_products_category_id ON products(category_id);

-- Query: Products in a category
SELECT 
    p.id,
    p.name,
    p.price,
    c.name AS category_name
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE c.id = 1;
```

### Example 3: Comments and Posts

```sql
-- Posts table (one)
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    author_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comments table (many)
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id INTEGER,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index foreign key
CREATE INDEX idx_comments_post_id ON comments(post_id);

-- Query: Post with all comments
SELECT 
    p.title,
    p.content,
    c.content AS comment_content,
    c.created_at AS comment_date
FROM posts p
LEFT JOIN comments c ON p.id = c.post_id
WHERE p.id = 1;
```

## Foreign Key Constraints

### ON DELETE Options

**RESTRICT (Default):**
```sql
-- Prevent deletion if child records exist
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE RESTRICT
);

-- Attempting to delete user with orders fails
DELETE FROM users WHERE id = 1;  -- Error if orders exist
```

**CASCADE:**
```sql
-- Delete child records when parent deleted
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE
);

-- Deleting post deletes all comments
DELETE FROM posts WHERE id = 1;  -- Also deletes comments
```

**SET NULL:**
```sql
-- Set foreign key to NULL when parent deleted
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Deleting user sets user_id to NULL in orders
DELETE FROM users WHERE id = 1;  -- Sets orders.user_id = NULL
```

**NO ACTION:**
```sql
-- Similar to RESTRICT, but checked at end of transaction
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE NO ACTION
);
```

### ON UPDATE Options

```sql
-- Handle parent key updates
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON UPDATE CASCADE
);

-- If user.id changes, orders.user_id updates automatically
UPDATE users SET id = 999 WHERE id = 1;  -- Updates orders.user_id
```

## Indexing Foreign Keys

### Always Index Foreign Keys

```sql
-- ✅ Good: Index foreign key
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id)
);

CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Fast JOINs
SELECT * FROM orders o
JOIN users u ON o.user_id = u.id;
```

### Composite Indexes

```sql
-- Index foreign key + commonly filtered column
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- Fast query
SELECT * FROM orders
WHERE user_id = 1 AND status = 'completed';
```

## Querying Many-to-One

### Get Parent with Children

```sql
-- User with all orders
SELECT 
    u.id,
    u.name,
    o.id AS order_id,
    o.total
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.id = 1;
```

### Count Children

```sql
-- Count orders per user
SELECT 
    u.id,
    u.name,
    COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;
```

### Filter by Parent

```sql
-- Orders for specific user
SELECT * FROM orders
WHERE user_id = 1;
```

## Common Patterns

### Pattern 1: Hierarchical Categories

```sql
-- Self-referential many-to-one
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL
);

-- Query: Category with parent
SELECT 
    c.id,
    c.name,
    p.name AS parent_name
FROM categories c
LEFT JOIN categories p ON c.parent_id = p.id;
```

### Pattern 2: Audit Trail

```sql
-- Many audit logs for one record
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    total DECIMAL(10, 2)
);

CREATE TABLE order_audit_log (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    action VARCHAR(50),
    changed_by INTEGER,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Best Practices

1. **Always Index Foreign Keys**: For JOIN performance
2. **Choose ON DELETE Carefully**: RESTRICT, CASCADE, or SET NULL
3. **Use NOT NULL**: If relationship is required
4. **Name Clearly**: Foreign key names should be descriptive
5. **Document Relationships**: Comment on relationship purpose

## Common Mistakes

### ❌ Missing Foreign Key Index

```sql
-- ❌ Bad: No index on foreign key
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id)
);
-- JOINs will be slow!

-- ✅ Good: Index foreign key
CREATE INDEX idx_orders_user_id ON orders(user_id);
```

### ❌ Wrong ON DELETE

```sql
-- ❌ Bad: CASCADE when you want to keep history
CREATE TABLE orders (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
);
-- Deleting user deletes all orders (loses history!)

-- ✅ Good: RESTRICT or SET NULL
CREATE TABLE orders (
    user_id INTEGER REFERENCES users(id) ON DELETE RESTRICT
);
```

## Summary

**Many-to-One Relationships:**

1. **Pattern**: Foreign key in "many" table references "one" table
2. **Foreign Key**: Enforces referential integrity
3. **ON DELETE**: RESTRICT, CASCADE, SET NULL, NO ACTION
4. **Indexing**: Always index foreign keys
5. **Querying**: Use JOINs to get related data

**Key Takeaway:**
Many-to-one is the most common relationship. Use foreign keys to enforce referential integrity. Always index foreign keys for performance. Choose ON DELETE behavior carefully based on business requirements.

**Common Use Cases:**
- Orders → User
- Products → Category
- Comments → Post
- Employees → Department

**Next Steps:**
- Learn [Many-to-Many](many_to_many.md) for complex relationships
- Study [Foreign Keys](../01_fundamentals/relational_concepts.md) for constraints
- Master [Indexes](../08_indexes/what_is_index.md) for performance

