# Relational Database Concepts: The Foundation

Understanding relational database concepts is essential for designing effective schemas and writing efficient queries. This guide covers all fundamental concepts with real-world examples.

## What is a Relational Database?

A **relational database** organizes data into **tables** (relations) that can be linked together through **relationships**. The structure is based on mathematical set theory and relational algebra.

### Key Characteristics

1. **Tables (Relations)**: Data organized in rows and columns
2. **Rows (Tuples)**: Individual records
3. **Columns (Attributes)**: Fields/properties of records
4. **Relationships**: Links between tables
5. **Constraints**: Rules that ensure data integrity

## Tables: The Foundation

A **table** is a collection of related data organized in rows and columns.

### Example: Users Table

```sql
CREATE TABLE users (
    id INT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Structure:**
```
┌────┬──────────────────┬──────────────┬─────────────────────┐
│ id │ email            │ name         │ created_at          │
├────┼──────────────────┼──────────────┼─────────────────────┤
│ 1  │ john@example.com │ John Doe     │ 2024-01-15 10:00:00 │
│ 2  │ jane@example.com │ Jane Smith   │ 2024-01-16 11:30:00 │
│ 3  │ bob@example.com  │ Bob Johnson  │ 2024-01-17 09:15:00 │
└────┴──────────────────┴──────────────┴─────────────────────┘
```

**Key Points:**
- Each row represents one user
- Each column represents one attribute
- All rows have the same structure
- Column names must be unique within a table

## Primary Key

A **Primary Key** uniquely identifies each row in a table.

### Characteristics

1. **Unique**: No two rows can have the same primary key value
2. **Not NULL**: Primary key cannot be empty
3. **Immutable**: Should not change (best practice)
4. **One per table**: Each table has exactly one primary key

### Example

```sql
CREATE TABLE products (
    id INT PRIMARY KEY,  -- Primary key
    name VARCHAR(200) NOT NULL,
    price DECIMAL(10, 2) NOT NULL
);
```

**Why Primary Keys Matter:**
- Enable fast lookups (indexed automatically)
- Ensure data integrity (no duplicates)
- Required for foreign key relationships
- Used for joins between tables

### Composite Primary Key

Sometimes a single column isn't enough. Use multiple columns:

```sql
CREATE TABLE order_items (
    order_id INT,
    product_id INT,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    PRIMARY KEY (order_id, product_id)  -- Composite key
);
```

**Use Case:** An order can have multiple items, and an item can be in multiple orders. The combination of `order_id` and `product_id` uniquely identifies each order-item relationship.

## Foreign Key

A **Foreign Key** creates a relationship between two tables by referencing the primary key of another table.

### Example: Orders Table

```sql
CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id INT NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)  -- Foreign key
);
```

**What This Means:**
- Every `user_id` in `orders` must exist in `users.id`
- Database enforces referential integrity
- Cannot delete a user who has orders (unless CASCADE)
- Cannot insert an order with invalid `user_id`

### Foreign Key Benefits

1. **Data Integrity**: Prevents orphaned records
2. **Referential Integrity**: Ensures relationships are valid
3. **Cascading Actions**: Can automatically update/delete related records

### Cascading Actions

```sql
CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id INT NOT NULL,
    FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE  -- Delete orders when user is deleted
        ON UPDATE CASCADE -- Update order.user_id when users.id changes
);
```

**Cascade Options:**
- `ON DELETE CASCADE`: Delete related records
- `ON DELETE SET NULL`: Set foreign key to NULL
- `ON DELETE RESTRICT`: Prevent deletion if related records exist
- `ON UPDATE CASCADE`: Update foreign key when primary key changes

## Unique Constraints

A **Unique Constraint** ensures no two rows have the same value in specified column(s).

### Example

```sql
CREATE TABLE users (
    id INT PRIMARY KEY,
    email VARCHAR(255) UNIQUE,  -- Unique constraint
    username VARCHAR(50) UNIQUE NOT NULL
);
```

**Key Points:**
- Unlike primary key, unique columns can be NULL (but only one NULL allowed in some databases)
- Multiple unique constraints per table allowed
- Automatically creates an index for fast lookups

### Composite Unique Constraint

```sql
CREATE TABLE user_permissions (
    user_id INT,
    permission_id INT,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, permission_id)  -- User can't have same permission twice
);
```

## Check Constraints

A **Check Constraint** ensures data meets specific conditions.

### Example

```sql
CREATE TABLE products (
    id INT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INT NOT NULL,
    discount_percent INT,
    
    -- Check constraints
    CONSTRAINT price_positive CHECK (price > 0),
    CONSTRAINT stock_non_negative CHECK (stock_quantity >= 0),
    CONSTRAINT discount_valid CHECK (discount_percent >= 0 AND discount_percent <= 100)
);
```

**Use Cases:**
- Ensure price is positive
- Validate email format
- Ensure age is reasonable (0-150)
- Validate date ranges

### Real-World Example

```sql
CREATE TABLE employees (
    id INT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    salary DECIMAL(10, 2) NOT NULL,
    hire_date DATE NOT NULL,
    department_id INT,
    
    CONSTRAINT valid_email CHECK (email LIKE '%@%.%'),
    CONSTRAINT salary_range CHECK (salary >= 30000 AND salary <= 500000),
    CONSTRAINT hire_date_reasonable CHECK (hire_date >= '2000-01-01'),
    FOREIGN KEY (department_id) REFERENCES departments(id)
);
```

## Default Values

**Default Values** are automatically assigned when a row is inserted without specifying a value.

### Example

```sql
CREATE TABLE posts (
    id INT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    published BOOLEAN DEFAULT false,  -- Default value
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Current time
    view_count INT DEFAULT 0,  -- Default to zero
    status VARCHAR(20) DEFAULT 'draft'  -- Default status
);
```

**Usage:**
```sql
-- These are equivalent:
INSERT INTO posts (title, content) VALUES ('My Post', 'Content here');
INSERT INTO posts (title, content, published, created_at, view_count, status) 
VALUES ('My Post', 'Content here', false, CURRENT_TIMESTAMP, 0, 'draft');
```

## NOT NULL Constraint

**NOT NULL** ensures a column must have a value (cannot be NULL).

### Example

```sql
CREATE TABLE users (
    id INT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,  -- Required
    name VARCHAR(100) NOT NULL,   -- Required
    phone VARCHAR(20),            -- Optional (can be NULL)
    bio TEXT                      -- Optional
);
```

**When to Use NOT NULL:**
- Required fields (email, name, password)
- Critical data that must exist
- Foreign keys (usually)
- Primary keys (always)

**When NOT to Use:**
- Optional fields (middle name, phone)
- Fields that might not be known yet
- Historical data that might be incomplete

## Relationships Between Tables

### One-to-Many (1:N)

**Most common relationship type.**

**Example:** One user has many orders

```sql
-- One side (users table)
CREATE TABLE users (
    id INT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL
);

-- Many side (orders table)
CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id INT NOT NULL,  -- Foreign key
    total DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Characteristics:**
- Foreign key goes on the "many" side
- One user can have multiple orders
- Each order belongs to one user

### Many-to-Many (M:N)

**Requires a junction/join table.**

**Example:** Users can have many roles, roles can have many users

```sql
-- Users table
CREATE TABLE users (
    id INT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL
);

-- Roles table
CREATE TABLE roles (
    id INT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

-- Junction table (many-to-many relationship)
CREATE TABLE user_roles (
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id),  -- Composite primary key
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);
```

**Characteristics:**
- Requires a third table (junction table)
- Junction table has foreign keys to both tables
- Composite primary key prevents duplicates

### One-to-One (1:1)

**Less common, used for optional or split data.**

**Example:** User and UserProfile (optional detailed info)

```sql
-- Users table (main table)
CREATE TABLE users (
    id INT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL
);

-- User profiles table (optional, one-to-one)
CREATE TABLE user_profiles (
    user_id INT PRIMARY KEY,  -- Primary key AND foreign key
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    bio TEXT,
    avatar_url VARCHAR(500),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Characteristics:**
- Foreign key is also the primary key
- Each user has at most one profile
- Each profile belongs to exactly one user

## Data Types

### Common Data Types

**Integer Types:**
```sql
INT           -- 32-bit integer (-2 billion to +2 billion)
BIGINT        -- 64-bit integer (very large numbers)
SMALLINT      -- 16-bit integer (-32,768 to 32,767)
SERIAL        -- Auto-incrementing integer (PostgreSQL)
```

**Decimal Types:**
```sql
DECIMAL(10, 2)  -- Exact decimal: 10 digits total, 2 after decimal
NUMERIC(10, 2)   -- Same as DECIMAL
FLOAT            -- Approximate floating point
REAL             -- Single precision float
```

**String Types:**
```sql
VARCHAR(255)     -- Variable length string (max 255 chars)
CHAR(10)          -- Fixed length string (always 10 chars)
TEXT              -- Unlimited length text
```

**Date/Time Types:**
```sql
DATE              -- Date only (YYYY-MM-DD)
TIME              -- Time only (HH:MM:SS)
TIMESTAMP         -- Date and time (YYYY-MM-DD HH:MM:SS)
TIMESTAMPTZ       -- Timestamp with timezone (PostgreSQL)
```

**Boolean:**
```sql
BOOLEAN           -- TRUE or FALSE
```

**JSON (PostgreSQL, MySQL 5.7+):**
```sql
JSON              -- JSON data type
JSONB             -- Binary JSON (PostgreSQL, faster)
```

## Indexes (Brief Overview)

**Indexes** speed up queries by creating a data structure that allows fast lookups.

```sql
-- Create index on email for fast lookups
CREATE INDEX idx_users_email ON users(email);

-- Composite index for queries on multiple columns
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at);
```

**Note:** Indexes are covered in detail in [Section 8: Indexes](../08_indexes/what_is_index.md)

## Best Practices

### 1. **Always Use Primary Keys**
```sql
-- ✅ Good
CREATE TABLE products (
    id INT PRIMARY KEY,
    name VARCHAR(200) NOT NULL
);

-- ❌ Bad
CREATE TABLE products (
    name VARCHAR(200) NOT NULL  -- No primary key!
);
```

### 2. **Use Meaningful Foreign Keys**
```sql
-- ✅ Good: Clear naming
CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id INT NOT NULL,  -- Clear: references users
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ❌ Bad: Unclear
CREATE TABLE orders (
    id INT PRIMARY KEY,
    uid INT NOT NULL,  -- What does uid reference?
    FOREIGN KEY (uid) REFERENCES users(id)
);
```

### 3. **Add Constraints for Data Integrity**
```sql
-- ✅ Good: Multiple constraints
CREATE TABLE products (
    id INT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INT NOT NULL,
    CONSTRAINT price_positive CHECK (price > 0),
    CONSTRAINT stock_non_negative CHECK (stock_quantity >= 0)
);
```

### 4. **Use Appropriate Data Types**
```sql
-- ✅ Good: Specific types
price DECIMAL(10, 2)  -- Exact decimal for money
email VARCHAR(255)    -- Reasonable length
created_at TIMESTAMP  -- Date and time

-- ❌ Bad: Too generic
price TEXT           -- Should be DECIMAL
email TEXT           -- VARCHAR is better
created_at TEXT      -- Should be TIMESTAMP
```

### 5. **Normalize, But Not Excessively**
- Eliminate redundancy
- But don't over-normalize (performance tradeoff)
- See [Normalization](../07_database_design/normalization.md) for details

## Common Mistakes

### ❌ Missing Primary Keys
```sql
-- Bad: No way to uniquely identify rows
CREATE TABLE logs (
    message TEXT,
    created_at TIMESTAMP
);
```

### ❌ Foreign Keys Without Constraints
```sql
-- Bad: No referential integrity
CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id INT  -- No foreign key constraint!
);
```

### ❌ Overly Permissive Data Types
```sql
-- Bad: Everything is TEXT
CREATE TABLE users (
    id TEXT,
    email TEXT,
    age TEXT,  -- Should be INT
    created_at TEXT  -- Should be TIMESTAMP
);
```

## Summary

**Relational Database Concepts:**

1. **Tables**: Collections of related data (rows and columns)
2. **Primary Key**: Uniquely identifies each row
3. **Foreign Key**: Links tables together (relationships)
4. **Constraints**: Rules that ensure data integrity
   - Unique: No duplicates
   - Check: Validates conditions
   - NOT NULL: Required fields
   - Default: Automatic values
5. **Relationships**: 
   - One-to-Many (most common)
   - Many-to-Many (requires junction table)
   - One-to-One (less common)

**Key Takeaway:**
Understanding these concepts is fundamental to designing effective database schemas. Always use primary keys, foreign keys, and appropriate constraints to ensure data integrity.

**Next Steps:**
- Learn [SQL vs NoSQL](sql_vs_nosql.md) to understand when to use relational databases
- Master [CRUD Basics](../02_crud_basics/select.md) to start querying
- Study [Database Design](../07_database_design/normalization.md) for schema design

