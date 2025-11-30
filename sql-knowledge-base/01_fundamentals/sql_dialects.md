# SQL Dialects: PostgreSQL vs MySQL Differences

Different SQL databases have slight syntax differences. Understanding these dialects helps you write portable code and avoid errors when switching databases.

## Overview

**SQL Dialects:**
- **PostgreSQL**: Advanced SQL standard compliance
- **MySQL**: Simpler syntax, some non-standard features
- **SQLite**: Minimal SQL implementation

## Key Differences

### 1. Auto-Increment IDs

**PostgreSQL:**
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,  -- SERIAL = auto-increment
    name VARCHAR(255)
);
```

**MySQL:**
```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,  -- AUTO_INCREMENT
    name VARCHAR(255)
);
```

**SQLite:**
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,  -- AUTOINCREMENT
    name TEXT
);
```

### 2. String Concatenation

**PostgreSQL:**
```sql
-- Use || operator
SELECT first_name || ' ' || last_name AS full_name
FROM users;

-- Or CONCAT function
SELECT CONCAT(first_name, ' ', last_name) AS full_name
FROM users;
```

**MySQL:**
```sql
-- Use CONCAT function
SELECT CONCAT(first_name, ' ', last_name) AS full_name
FROM users;
```

**SQLite:**
```sql
-- Use || operator
SELECT first_name || ' ' || last_name AS full_name
FROM users;
```

### 3. LIMIT and OFFSET

**PostgreSQL:**
```sql
SELECT * FROM users
LIMIT 10 OFFSET 20;  -- Standard SQL
```

**MySQL:**
```sql
SELECT * FROM users
LIMIT 20, 10;  -- OFFSET, LIMIT (non-standard)
-- Or standard:
LIMIT 10 OFFSET 20;
```

**SQLite:**
```sql
SELECT * FROM users
LIMIT 10 OFFSET 20;  -- Standard SQL
```

### 4. Boolean Type

**PostgreSQL:**
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    is_active BOOLEAN DEFAULT true  -- Native boolean
);

SELECT * FROM users WHERE is_active = true;
```

**MySQL:**
```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    is_active TINYINT(1) DEFAULT 1  -- Use TINYINT
);

SELECT * FROM users WHERE is_active = 1;
```

**SQLite:**
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    is_active INTEGER DEFAULT 1  -- Use INTEGER (0/1)
);

SELECT * FROM users WHERE is_active = 1;
```

### 5. Date Functions

**PostgreSQL:**
```sql
-- Current date/time
SELECT CURRENT_DATE;
SELECT CURRENT_TIMESTAMP;
SELECT NOW();

-- Date arithmetic
SELECT created_at + INTERVAL '1 day' FROM orders;
SELECT created_at - INTERVAL '1 month' FROM orders;
```

**MySQL:**
```sql
-- Current date/time
SELECT CURDATE();
SELECT NOW();
SELECT CURRENT_TIMESTAMP;

-- Date arithmetic
SELECT DATE_ADD(created_at, INTERVAL 1 DAY) FROM orders;
SELECT DATE_SUB(created_at, INTERVAL 1 MONTH) FROM orders;
```

**SQLite:**
```sql
-- Current date/time
SELECT DATE('now');
SELECT DATETIME('now');

-- Date arithmetic
SELECT DATE(created_at, '+1 day') FROM orders;
```

### 6. String Functions

**PostgreSQL:**
```sql
-- Case conversion
SELECT UPPER(name), LOWER(name) FROM users;

-- Substring
SELECT SUBSTRING(email, 1, 5) FROM users;

-- Position
SELECT POSITION('@' IN email) FROM users;
```

**MySQL:**
```sql
-- Case conversion
SELECT UPPER(name), LOWER(name) FROM users;

-- Substring
SELECT SUBSTRING(email, 1, 5) FROM users;

-- Position
SELECT LOCATE('@', email) FROM users;
```

### 7. IF/ELSE Logic

**PostgreSQL:**
```sql
-- Use CASE WHEN
SELECT 
    name,
    CASE 
        WHEN age >= 18 THEN 'Adult'
        ELSE 'Minor'
    END AS age_group
FROM users;
```

**MySQL:**
```sql
-- Use CASE WHEN or IF function
SELECT 
    name,
    IF(age >= 18, 'Adult', 'Minor') AS age_group
FROM users;

-- Or CASE WHEN (standard)
SELECT 
    name,
    CASE 
        WHEN age >= 18 THEN 'Adult'
        ELSE 'Minor'
    END AS age_group
FROM users;
```

### 8. Upsert (INSERT ... ON CONFLICT)

**PostgreSQL:**
```sql
-- INSERT ... ON CONFLICT
INSERT INTO users (email, name)
VALUES ('user@example.com', 'John')
ON CONFLICT (email) 
DO UPDATE SET name = EXCLUDED.name;
```

**MySQL:**
```sql
-- INSERT ... ON DUPLICATE KEY UPDATE
INSERT INTO users (email, name)
VALUES ('user@example.com', 'John')
ON DUPLICATE KEY UPDATE name = VALUES(name);
```

**SQLite:**
```sql
-- INSERT ... ON CONFLICT (similar to PostgreSQL)
INSERT INTO users (email, name)
VALUES ('user@example.com', 'John')
ON CONFLICT (email) 
DO UPDATE SET name = excluded.name;
```

### 9. JSON Support

**PostgreSQL:**
```sql
-- Excellent JSONB support
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    data JSONB
);

INSERT INTO products (data)
VALUES ('{"name": "Laptop", "price": 999}'::JSONB);

SELECT data->>'name' FROM products;
SELECT data->'price' FROM products;
```

**MySQL:**
```sql
-- Limited JSON support (MySQL 5.7+)
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    data JSON
);

INSERT INTO products (data)
VALUES ('{"name": "Laptop", "price": 999}');

SELECT JSON_EXTRACT(data, '$.name') FROM products;
SELECT data->>'$.name' FROM products;  -- MySQL 5.7+
```

### 10. Window Functions

**PostgreSQL:**
```sql
-- Full window function support
SELECT 
    id,
    name,
    ROW_NUMBER() OVER (ORDER BY created_at) AS row_num,
    RANK() OVER (PARTITION BY category_id ORDER BY price) AS price_rank
FROM products;
```

**MySQL:**
```sql
-- Window functions (MySQL 8.0+)
SELECT 
    id,
    name,
    ROW_NUMBER() OVER (ORDER BY created_at) AS row_num,
    RANK() OVER (PARTITION BY category_id ORDER BY price) AS price_rank
FROM products;
```

**SQLite:**
```sql
-- Limited window function support (SQLite 3.25+)
SELECT 
    id,
    name,
    ROW_NUMBER() OVER (ORDER BY created_at) AS row_num
FROM products;
```

## Common Patterns

### Pattern 1: Portable Auto-Increment

```sql
-- Use SERIAL in PostgreSQL, AUTO_INCREMENT in MySQL
-- Application code handles differences
```

### Pattern 2: Portable String Concatenation

```sql
-- Use CONCAT() for portability
SELECT CONCAT(first_name, ' ', last_name) AS full_name
FROM users;
-- Works in PostgreSQL, MySQL, SQLite
```

### Pattern 3: Portable Date Functions

```sql
-- Use standard functions when possible
SELECT CURRENT_TIMESTAMP;  -- Works in most databases
SELECT DATE('now');  -- SQLite specific
```

## Migration Tips

### PostgreSQL to MySQL

```sql
-- Change SERIAL to AUTO_INCREMENT
-- Change || to CONCAT()
-- Change JSONB to JSON
-- Adjust date functions
```

### MySQL to PostgreSQL

```sql
-- Change AUTO_INCREMENT to SERIAL
-- Change TINYINT(1) to BOOLEAN
-- Use || for string concatenation
-- Use JSONB instead of JSON
```

## Best Practices

1. **Use Standard SQL**: When possible, use standard SQL
2. **Abstract Differences**: Use ORMs to handle differences
3. **Test on Target DB**: Always test on your target database
4. **Document Dialect**: Note database-specific code
5. **Use Functions**: Prefer functions over operators for portability

## Summary

**SQL Dialect Differences:**

1. **Auto-Increment**: SERIAL vs AUTO_INCREMENT vs AUTOINCREMENT
2. **String Concatenation**: || vs CONCAT()
3. **Boolean**: BOOLEAN vs TINYINT(1) vs INTEGER
4. **Date Functions**: Different function names
5. **Upsert**: ON CONFLICT vs ON DUPLICATE KEY UPDATE
6. **JSON**: JSONB vs JSON with different operators
7. **Window Functions**: Full support vs limited support

**Key Takeaway:**
SQL dialects have subtle but important differences. Use standard SQL when possible, and be aware of database-specific features. ORMs help abstract these differences, but understanding them is crucial for optimization and debugging.

**Portability Tips:**
- Use CONCAT() instead of ||
- Use standard date functions
- Use CASE WHEN instead of IF()
- Test on target database
- Document dialect-specific code

**Next Steps:**
- Learn [Database Engines](database_engines.md) for engine selection
- Study [CRUD Basics](../02_crud_basics/) for standard operations
- Master [Advanced Querying](../06_advanced_querying/) for complex queries

