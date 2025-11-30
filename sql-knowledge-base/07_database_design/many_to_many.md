# Many-to-Many Relationships: Junction Tables

Many-to-many relationships occur when multiple records in one table relate to multiple records in another table. Junction tables (also called join tables or associative tables) are used to implement these relationships.

## What is Many-to-Many?

**Many-to-Many:** Each record in Table A can relate to multiple records in Table B, and each record in Table B can relate to multiple records in Table A.

**Example:**
- A student can enroll in multiple courses
- A course can have multiple students

## Junction Table Pattern

### Basic Structure

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

-- Junction table (many-to-many relationship)
CREATE TABLE student_courses (
    student_id INTEGER REFERENCES students(id),
    course_id INTEGER REFERENCES courses(id),
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
    name VARCHAR(255),
    email VARCHAR(255)
);

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE
);

-- Junction table
CREATE TABLE user_roles (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id)
);

-- Query: Get user with roles
SELECT 
    u.name,
    r.name AS role_name
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE u.id = 1;
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
    name VARCHAR(50) UNIQUE
);

-- Junction table
CREATE TABLE product_tags (
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, tag_id)
);

-- Query: Products with specific tag
SELECT 
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

-- Junction table (order_items)
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
    p.name AS product_name,
    oi.quantity,
    oi.price
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
WHERE o.id = 1;
```

## Junction Table Best Practices

### 1. Composite Primary Key

```sql
-- ✅ Good: Composite primary key prevents duplicates
CREATE TABLE user_roles (
    user_id INTEGER,
    role_id INTEGER,
    PRIMARY KEY (user_id, role_id)  -- Prevents duplicate assignments
);
```

### 2. Additional Columns

```sql
-- Junction table can have additional columns
CREATE TABLE student_courses (
    student_id INTEGER,
    course_id INTEGER,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    grade CHAR(1),  -- Additional data about the relationship
    PRIMARY KEY (student_id, course_id)
);
```

### 3. Indexes

```sql
-- Index both foreign keys for performance
CREATE TABLE user_roles (
    user_id INTEGER,
    role_id INTEGER,
    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
```

### 4. Cascade Deletes

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

## Querying Many-to-Many

### Get All Relationships

```sql
-- All users with their roles
SELECT 
    u.name AS user_name,
    r.name AS role_name
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id;
```

### Count Relationships

```sql
-- Count roles per user
SELECT 
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

## Common Patterns

### Pattern 1: Simple Junction Table

```sql
-- Basic many-to-many
CREATE TABLE table1_table2 (
    table1_id INTEGER,
    table2_id INTEGER,
    PRIMARY KEY (table1_id, table2_id)
);
```

### Pattern 2: Junction with Metadata

```sql
-- Junction table with additional data
CREATE TABLE student_courses (
    student_id INTEGER,
    course_id INTEGER,
    enrolled_at TIMESTAMP,
    grade CHAR(1),
    PRIMARY KEY (student_id, course_id)
);
```

### Pattern 3: Self-Referential Many-to-Many

```sql
-- Users following other users
CREATE TABLE user_follows (
    follower_id INTEGER REFERENCES users(id),
    following_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, following_id),
    CHECK (follower_id != following_id)  -- Can't follow yourself
);
```

## Performance Considerations

### Index Both Foreign Keys

```sql
-- Create indexes for both directions
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);

-- Fast queries in both directions
SELECT * FROM user_roles WHERE user_id = 1;  -- Uses index
SELECT * FROM user_roles WHERE role_id = 2;  -- Uses index
```

### Avoid N+1 Queries

```sql
-- ✅ Good: Single query with JOINs
SELECT 
    u.name,
    r.name AS role_name
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id;

-- ❌ Bad: N+1 queries (application level)
-- SELECT * FROM users;
-- For each user: SELECT * FROM user_roles WHERE user_id = ?
```

## Best Practices

1. **Composite Primary Key**: Prevent duplicates
2. **Index Both Keys**: For performance
3. **Cascade Deletes**: Define behavior
4. **Additional Columns**: Store relationship metadata
5. **Naming**: Use descriptive junction table names

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

**Many-to-Many Relationships:**

1. **Pattern**: Use junction table with two foreign keys
2. **Primary Key**: Composite key on both foreign keys
3. **Indexes**: Index both foreign keys for performance
4. **Additional Data**: Junction table can store relationship metadata
5. **Queries**: Use JOINs to query relationships

**Key Takeaway:**
Many-to-many relationships require a junction table with two foreign keys. Use a composite primary key to prevent duplicates, index both keys for performance, and add additional columns for relationship metadata when needed.

**Common Use Cases:**
- Users and roles
- Products and tags
- Students and courses
- Orders and products

**Next Steps:**
- Learn [One-to-Many](many_to_one.md) for simpler relationships
- Study [Junction Tables](junction_tables.md) for advanced patterns
- Master [Database Design](../07_database_design/) for complete design

