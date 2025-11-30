# Junction Tables: Implementing Many-to-Many Relationships

Junction tables (also called join tables, associative tables, or bridge tables) implement many-to-many relationships between two tables. They're essential for modeling complex relationships.

## What is a Junction Table?

**Junction table** is an intermediate table that connects two tables in a many-to-many relationship. It contains foreign keys to both tables.

### Basic Structure

```
Table A ←→ Junction Table ←→ Table B
```

## Basic Pattern

### Simple Junction Table

```sql
-- Main tables
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255)
);

CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255)
);

-- Junction table
CREATE TABLE student_courses (
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    PRIMARY KEY (student_id, course_id)  -- Composite primary key
);
```

## Real-World Examples

### Example 1: Users and Roles

```sql
-- Users can have multiple roles
-- Roles can be assigned to multiple users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    name VARCHAR(255)
);

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE,
    description TEXT
);

-- Junction table
CREATE TABLE user_roles (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES users(id),
    PRIMARY KEY (user_id, role_id)
);

-- Indexes for performance
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
```

### Example 2: Products and Tags

```sql
-- Products can have multiple tags
-- Tags can be on multiple products
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    price DECIMAL(10, 2)
);

CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE,
    slug VARCHAR(50) UNIQUE
);

-- Junction table
CREATE TABLE product_tags (
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (product_id, tag_id)
);

-- Query: Products with specific tag
SELECT 
    p.id,
    p.name,
    p.price
FROM products p
JOIN product_tags pt ON p.id = pt.product_id
JOIN tags t ON pt.tag_id = t.id
WHERE t.name = 'electronics';
```

### Example 3: Orders and Products

```sql
-- Orders can have multiple products
-- Products can be in multiple orders
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    total DECIMAL(10, 2),
    created_at TIMESTAMP
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    price DECIMAL(10, 2)
);

-- Junction table (order_items) with additional data
CREATE TABLE order_items (
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,  -- Snapshot price at time of order
    PRIMARY KEY (order_id, product_id)
);

-- Query: Order with products
SELECT 
    o.id AS order_id,
    o.total,
    p.name AS product_name,
    oi.quantity,
    oi.price AS item_price,
    (oi.quantity * oi.price) AS line_total
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
WHERE o.id = 1;
```

## Junction Table with Additional Data

### Storing Relationship Metadata

```sql
-- Junction table with additional columns
CREATE TABLE student_courses (
    student_id INTEGER REFERENCES students(id),
    course_id INTEGER REFERENCES courses(id),
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    grade CHAR(1),  -- Additional data about the relationship
    credits INTEGER,
    semester VARCHAR(20),
    PRIMARY KEY (student_id, course_id)
);

-- Query with relationship data
SELECT 
    s.name AS student_name,
    c.name AS course_name,
    sc.grade,
    sc.enrolled_at
FROM students s
JOIN student_courses sc ON s.id = sc.student_id
JOIN courses c ON sc.course_id = c.id
WHERE s.id = 1;
```

## Self-Referential Many-to-Many

### Users Following Users

```sql
-- Users can follow other users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255)
);

-- Self-referential junction table
CREATE TABLE user_follows (
    follower_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    following_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, following_id),
    CHECK (follower_id != following_id)  -- Can't follow yourself
);

-- Query: Who user follows
SELECT 
    u.name AS following_name,
    uf.created_at AS followed_at
FROM users u
JOIN user_follows uf ON u.id = uf.following_id
WHERE uf.follower_id = 1;

-- Query: Who follows user
SELECT 
    u.name AS follower_name,
    uf.created_at AS followed_at
FROM users u
JOIN user_follows uf ON u.id = uf.follower_id
WHERE uf.following_id = 1;
```

## Querying Junction Tables

### Get All Relationships

```sql
-- All user-role assignments
SELECT 
    u.name AS user_name,
    r.name AS role_name,
    ur.assigned_at
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id;
```

### Count Relationships

```sql
-- Count roles per user
SELECT 
    u.id,
    u.name,
    COUNT(ur.role_id) AS role_count
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
GROUP BY u.id, u.name;
```

### Filter by Relationship

```sql
-- Users with specific role
SELECT u.*
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE r.name = 'admin';
```

### Find Missing Relationships

```sql
-- Users without any roles
SELECT u.*
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.user_id IS NULL;
```

## Best Practices

### 1. Composite Primary Key

```sql
-- ✅ Good: Composite primary key prevents duplicates
CREATE TABLE user_roles (
    user_id INTEGER,
    role_id INTEGER,
    PRIMARY KEY (user_id, role_id)  -- Prevents duplicate assignments
);
```

### 2. Index Both Foreign Keys

```sql
-- Index both directions for performance
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);

-- Fast queries in both directions
SELECT * FROM user_roles WHERE user_id = 1;  -- Uses index
SELECT * FROM user_roles WHERE role_id = 2;  -- Uses index
```

### 3. Cascade Deletes

```sql
-- Define cascade behavior
CREATE TABLE user_roles (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);
-- When user deleted, their role assignments deleted
-- When role deleted, all user assignments deleted
```

### 4. Additional Columns

```sql
-- Junction table can store relationship metadata
CREATE TABLE user_roles (
    user_id INTEGER,
    role_id INTEGER,
    assigned_at TIMESTAMP,
    assigned_by INTEGER,
    expires_at TIMESTAMP,  -- Additional data
    PRIMARY KEY (user_id, role_id)
);
```

## Common Patterns

### Pattern 1: Simple Junction

```sql
-- Basic many-to-many
CREATE TABLE table1_table2 (
    table1_id INTEGER,
    table2_id INTEGER,
    PRIMARY KEY (table1_id, table2_id)
);
```

### Pattern 2: With Metadata

```sql
-- Junction with relationship data
CREATE TABLE student_courses (
    student_id INTEGER,
    course_id INTEGER,
    enrolled_at TIMESTAMP,
    grade CHAR(1),
    PRIMARY KEY (student_id, course_id)
);
```

### Pattern 3: Self-Referential

```sql
-- Same table, many-to-many
CREATE TABLE user_follows (
    follower_id INTEGER REFERENCES users(id),
    following_id INTEGER REFERENCES users(id),
    PRIMARY KEY (follower_id, following_id),
    CHECK (follower_id != following_id)
);
```

## Performance Considerations

### Index Both Foreign Keys

```sql
-- Always index both foreign keys
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);

-- Fast queries in both directions
```

### Composite Indexes

```sql
-- Composite index for common query patterns
CREATE INDEX idx_user_roles_user_role ON user_roles(user_id, role_id);
-- Covers both directions
```

## Common Mistakes

### ❌ Missing Composite Primary Key

```sql
-- ❌ Bad: Allows duplicates
CREATE TABLE user_roles (
    user_id INTEGER,
    role_id INTEGER
);
-- Can insert same user-role pair multiple times!

-- ✅ Good: Composite primary key
CREATE TABLE user_roles (
    user_id INTEGER,
    role_id INTEGER,
    PRIMARY KEY (user_id, role_id)
);
```

### ❌ No Indexes

```sql
-- ❌ Bad: No indexes
CREATE TABLE user_roles (
    user_id INTEGER,
    role_id INTEGER,
    PRIMARY KEY (user_id, role_id)
);
-- Queries may be slow

-- ✅ Good: Index both keys
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
```

## Summary

**Junction Tables:**

1. **Purpose**: Implement many-to-many relationships
2. **Structure**: Two foreign keys, composite primary key
3. **Additional Data**: Can store relationship metadata
4. **Indexing**: Always index both foreign keys
5. **Cascade**: Define ON DELETE behavior

**Key Takeaway:**
Junction tables implement many-to-many relationships using two foreign keys and a composite primary key. Always index both foreign keys for performance. Junction tables can store additional metadata about the relationship. Use cascade deletes appropriately.

**Common Use Cases:**
- Users and roles
- Products and tags
- Students and courses
- Orders and products

**Next Steps:**
- Learn [Many-to-Many](many_to_many.md) for relationship patterns
- Study [Foreign Keys](../01_fundamentals/relational_concepts.md) for constraints
- Master [Indexes](../08_indexes/what_is_index.md) for performance

