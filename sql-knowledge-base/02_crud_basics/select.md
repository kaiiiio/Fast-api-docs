# SELECT: Retrieving Data from Databases

The `SELECT` statement is the most fundamental and frequently used SQL command. It retrieves data from one or more tables based on specified criteria.

## Basic SELECT Syntax

```sql
SELECT column1, column2, ...
FROM table_name
WHERE condition
ORDER BY column
LIMIT number;
```

## Simple SELECT Examples

### Select All Columns

```sql
-- Select all columns from users table
SELECT * FROM users;
```

**Result:**
```
┌────┬──────────────────┬──────────────┬─────────────────────┐
│ id │ email            │ name         │ created_at          │
├────┼──────────────────┼──────────────┼─────────────────────┤
│ 1  │ john@example.com │ John Doe     │ 2024-01-15 10:00:00 │
│ 2  │ jane@example.com │ Jane Smith   │ 2024-01-16 11:30:00 │
└────┴──────────────────┴──────────────┴─────────────────────┘
```

**When to Use `*`:**
- Quick exploration of data
- Development/testing
- When you need all columns

**When NOT to Use `*`:**
- Production code (performance, clarity)
- When you only need specific columns
- When table structure might change

### Select Specific Columns

```sql
-- Select only email and name
SELECT email, name FROM users;
```

**Result:**
```
┌──────────────────┬──────────────┐
│ email            │ name         │
├──────────────────┼──────────────┤
│ john@example.com │ John Doe     │
│ jane@example.com │ Jane Smith   │
└──────────────────┴──────────────┘
```

**Benefits:**
- Better performance (less data transferred)
- Clearer intent (explicit about what you need)
- Safer (won't break if table structure changes)

## WHERE Clause: Filtering Rows

The `WHERE` clause filters rows based on conditions.

### Basic WHERE Examples

```sql
-- Find user by ID
SELECT * FROM users WHERE id = 1;

-- Find active users
SELECT * FROM users WHERE is_active = true;

-- Find users created this year
SELECT * FROM users 
WHERE created_at >= '2024-01-01' 
  AND created_at < '2025-01-01';
```

### Comparison Operators

```sql
-- Equality
SELECT * FROM products WHERE price = 99.99;

-- Not equal (two ways)
SELECT * FROM products WHERE price != 99.99;
SELECT * FROM products WHERE price <> 99.99;

-- Greater than / Less than
SELECT * FROM products WHERE price > 100;
SELECT * FROM products WHERE price < 50;
SELECT * FROM products WHERE price >= 100;
SELECT * FROM products WHERE price <= 50;

-- Between (inclusive)
SELECT * FROM products WHERE price BETWEEN 50 AND 100;
-- Equivalent to: price >= 50 AND price <= 100

-- IN (match any value in list)
SELECT * FROM users WHERE id IN (1, 2, 3, 5, 8);
SELECT * FROM products WHERE category_id IN (1, 2, 3);

-- NOT IN
SELECT * FROM users WHERE id NOT IN (1, 2, 3);

-- LIKE (pattern matching)
SELECT * FROM users WHERE email LIKE '%@gmail.com';
SELECT * FROM products WHERE name LIKE 'Laptop%';  -- Starts with
SELECT * FROM products WHERE name LIKE '%Pro';     -- Ends with
SELECT * FROM products WHERE name LIKE '%Mac%';    -- Contains

-- IS NULL / IS NOT NULL
SELECT * FROM users WHERE phone IS NULL;
SELECT * FROM users WHERE phone IS NOT NULL;
```

### Logical Operators

```sql
-- AND: Both conditions must be true
SELECT * FROM products 
WHERE price > 100 AND stock_quantity > 0;

-- OR: Either condition can be true
SELECT * FROM users 
WHERE role = 'admin' OR role = 'moderator';

-- NOT: Negate condition
SELECT * FROM products WHERE NOT (price > 100);
SELECT * FROM users WHERE NOT is_active;

-- Combining operators (use parentheses for clarity)
SELECT * FROM products 
WHERE (price > 100 OR discount_percent > 20) 
  AND stock_quantity > 0;
```

## ORDER BY: Sorting Results

Sort results by one or more columns.

### Basic Sorting

```sql
-- Sort by name (ascending, default)
SELECT * FROM users ORDER BY name;

-- Sort by name (explicit ascending)
SELECT * FROM users ORDER BY name ASC;

-- Sort by created_at (descending - newest first)
SELECT * FROM users ORDER BY created_at DESC;

-- Sort by multiple columns
SELECT * FROM users 
ORDER BY is_active DESC, created_at DESC;
-- First by active status, then by creation date
```

### Real-World Example

```sql
-- Get top 10 most expensive products in stock
SELECT id, name, price, stock_quantity
FROM products
WHERE stock_quantity > 0
ORDER BY price DESC
LIMIT 10;
```

## LIMIT and OFFSET: Pagination

Control how many rows to return and skip.

### LIMIT

```sql
-- Get first 10 users
SELECT * FROM users LIMIT 10;

-- Get first 5 products
SELECT * FROM products ORDER BY price DESC LIMIT 5;
```

### OFFSET

```sql
-- Skip first 10, get next 10 (pagination)
SELECT * FROM users 
ORDER BY created_at DESC
LIMIT 10 OFFSET 10;  -- Page 2 (rows 11-20)

-- Alternative syntax (MySQL, PostgreSQL)
SELECT * FROM users 
ORDER BY created_at DESC
LIMIT 10, 10;  -- LIMIT offset, count (MySQL)
```

### Pagination Pattern

```sql
-- Page 1 (rows 1-20)
SELECT * FROM users 
ORDER BY id
LIMIT 20 OFFSET 0;

-- Page 2 (rows 21-40)
SELECT * FROM users 
ORDER BY id
LIMIT 20 OFFSET 20;

-- Page N (rows (N-1)*20+1 to N*20)
SELECT * FROM users 
ORDER BY id
LIMIT 20 OFFSET ((page_number - 1) * 20);
```

## DISTINCT: Removing Duplicates

Get unique values from a column or combination of columns.

### Basic DISTINCT

```sql
-- Get unique email domains
SELECT DISTINCT 
    SUBSTRING(email, POSITION('@' IN email) + 1) AS domain
FROM users;

-- Get unique combinations
SELECT DISTINCT user_id, status 
FROM orders;
```

### DISTINCT with Multiple Columns

```sql
-- Unique combinations of category and status
SELECT DISTINCT category_id, status 
FROM products;
```

## Aliases (AS): Renaming Columns

Make column names more readable or create calculated columns.

### Column Aliases

```sql
-- Rename columns in result
SELECT 
    id AS user_id,
    email AS user_email,
    name AS full_name,
    created_at AS registration_date
FROM users;

-- AS keyword is optional
SELECT 
    id user_id,
    email user_email
FROM users;
```

### Table Aliases

```sql
-- Shorten table names for readability
SELECT u.id, u.email, u.name
FROM users u
WHERE u.is_active = true;

-- Essential for joins (covered in Joins section)
SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id;
```

## Calculated Columns

Perform calculations in SELECT.

### Arithmetic Operations

```sql
-- Calculate total with tax
SELECT 
    id,
    name,
    price,
    price * 1.08 AS price_with_tax  -- 8% tax
FROM products;

-- Calculate discount amount
SELECT 
    id,
    name,
    price,
    discount_percent,
    price * (discount_percent / 100.0) AS discount_amount,
    price - (price * (discount_percent / 100.0)) AS final_price
FROM products
WHERE discount_percent > 0;
```

### String Functions

```sql
-- Concatenate strings
SELECT 
    first_name || ' ' || last_name AS full_name  -- PostgreSQL
FROM users;

-- MySQL uses CONCAT
SELECT 
    CONCAT(first_name, ' ', last_name) AS full_name
FROM users;

-- Uppercase/Lowercase
SELECT 
    UPPER(name) AS name_upper,
    LOWER(email) AS email_lower
FROM users;

-- Substring
SELECT 
    email,
    SUBSTRING(email, 1, POSITION('@' IN email) - 1) AS username
FROM users;
```

### Date Functions

```sql
-- Extract parts of date
SELECT 
    id,
    created_at,
    EXTRACT(YEAR FROM created_at) AS year,
    EXTRACT(MONTH FROM created_at) AS month,
    EXTRACT(DAY FROM created_at) AS day
FROM users;

-- Age calculation
SELECT 
    id,
    name,
    birth_date,
    EXTRACT(YEAR FROM AGE(birth_date)) AS age  -- PostgreSQL
FROM users;

-- MySQL age calculation
SELECT 
    id,
    name,
    birth_date,
    TIMESTAMPDIFF(YEAR, birth_date, CURDATE()) AS age
FROM users;
```

## CASE WHEN: Conditional Logic

Add conditional logic to SELECT statements.

### Basic CASE

```sql
-- Categorize products by price
SELECT 
    id,
    name,
    price,
    CASE
        WHEN price > 1000 THEN 'Expensive'
        WHEN price > 100 THEN 'Moderate'
        ELSE 'Affordable'
    END AS price_category
FROM products;
```

### CASE with Multiple Conditions

```sql
-- User status based on multiple factors
SELECT 
    id,
    email,
    is_active,
    created_at,
    CASE
        WHEN is_active = false THEN 'Inactive'
        WHEN created_at > CURRENT_DATE - INTERVAL '30 days' THEN 'New User'
        WHEN created_at > CURRENT_DATE - INTERVAL '90 days' THEN 'Recent User'
        ELSE 'Established User'
    END AS user_status
FROM users;
```

## SELECT from Multiple Tables (Preview)

```sql
-- Select from multiple tables (will be covered in Joins)
SELECT 
    u.id,
    u.email,
    o.id AS order_id,
    o.total
FROM users u
JOIN orders o ON u.id = o.user_id;
```

## Common Patterns

### Pattern 1: Get Latest Record

```sql
-- Get most recent order for each user
SELECT *
FROM orders
WHERE user_id = 1
ORDER BY created_at DESC
LIMIT 1;
```

### Pattern 2: Search with Multiple Criteria

```sql
-- Search products with filters
SELECT *
FROM products
WHERE 
    (name ILIKE '%laptop%' OR description ILIKE '%laptop%')
    AND price BETWEEN 500 AND 2000
    AND stock_quantity > 0
    AND category_id IN (1, 2, 3)
ORDER BY price ASC;
```

### Pattern 3: Count Records

```sql
-- Count total users
SELECT COUNT(*) AS total_users FROM users;

-- Count active users
SELECT COUNT(*) AS active_users 
FROM users 
WHERE is_active = true;

-- Count with conditions
SELECT 
    COUNT(*) AS total,
    COUNT(CASE WHEN is_active THEN 1 END) AS active_count,
    COUNT(CASE WHEN created_at > '2024-01-01' THEN 1 END) AS new_users
FROM users;
```

## Performance Considerations

### 1. **Select Only Needed Columns**

```sql
-- ❌ Bad: Selects all columns
SELECT * FROM users WHERE id = 1;

-- ✅ Good: Selects only needed columns
SELECT id, email, name FROM users WHERE id = 1;
```

### 2. **Use WHERE to Filter Early**

```sql
-- ❌ Bad: Filters after selecting all rows
SELECT * FROM users;
-- Then filter in application code

-- ✅ Good: Filter in database
SELECT * FROM users WHERE is_active = true;
```

### 3. **Use LIMIT for Large Result Sets**

```sql
-- ❌ Bad: Returns all rows
SELECT * FROM orders ORDER BY created_at DESC;

-- ✅ Good: Limits results
SELECT * FROM orders 
ORDER BY created_at DESC 
LIMIT 20;
```

### 4. **Index Columns Used in WHERE and ORDER BY**

```sql
-- Create index for frequently queried columns
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at);
```

## Common Mistakes

### ❌ Using `*` in Production

```sql
-- Bad: Unclear, inefficient
SELECT * FROM users WHERE id = 1;
```

### ❌ Not Using WHERE

```sql
-- Bad: Loads all data, filters in application
SELECT * FROM products;
-- Then filter in code
```

### ❌ Incorrect NULL Handling

```sql
-- ❌ Wrong: NULL comparisons don't work with =
SELECT * FROM users WHERE phone = NULL;  -- Always returns nothing!

-- ✅ Correct: Use IS NULL
SELECT * FROM users WHERE phone IS NULL;
```

### ❌ String Comparison Case Sensitivity

```sql
-- PostgreSQL: Case-sensitive by default
SELECT * FROM users WHERE email = 'John@Example.com';  -- Might not match

-- Use ILIKE for case-insensitive (PostgreSQL)
SELECT * FROM users WHERE email ILIKE 'john@example.com';

-- Or use LOWER/UPPER
SELECT * FROM users WHERE LOWER(email) = LOWER('John@Example.com');
```

## Best Practices

1. **Be Explicit**: List columns instead of using `*`
2. **Filter Early**: Use WHERE to reduce data early
3. **Use LIMIT**: Always limit large result sets
4. **Index Appropriately**: Index columns in WHERE and ORDER BY
5. **Use Aliases**: Make calculated columns readable
6. **Handle NULLs**: Use IS NULL/IS NOT NULL correctly
7. **Test Performance**: Use EXPLAIN to analyze query plans

## Summary

**SELECT Statement Essentials:**

1. **Basic Syntax**: `SELECT columns FROM table WHERE conditions`
2. **Filtering**: WHERE clause with comparison and logical operators
3. **Sorting**: ORDER BY for sorted results
4. **Pagination**: LIMIT and OFFSET for controlled results
5. **Uniqueness**: DISTINCT for unique values
6. **Aliases**: AS for readable column names
7. **Calculations**: Arithmetic, string, and date functions
8. **Conditional Logic**: CASE WHEN for conditional values

**Key Takeaway:**
SELECT is the foundation of data retrieval. Master filtering, sorting, and limiting to write efficient queries. Always be explicit about what columns you need and filter data as early as possible.

## ORM Equivalents: Prisma and TypeORM

### Prisma Syntax

```javascript
// Select all columns
const users = await prisma.user.findMany();

// Select specific columns
const users = await prisma.user.findMany({
    select: {
        email: true,
        name: true
    }
});

// WHERE clause
const user = await prisma.user.findUnique({
    where: { id: 1 }
});

const activeUsers = await prisma.user.findMany({
    where: {
        is_active: true,
        created_at: {
            gte: new Date('2024-01-01'),
            lt: new Date('2025-01-01')
        }
    }
});

// ORDER BY
const users = await prisma.user.findMany({
    orderBy: {
        created_at: 'desc'
    }
});

// LIMIT and OFFSET (pagination)
const users = await prisma.user.findMany({
    skip: 20,  // OFFSET
    take: 10,   // LIMIT
    orderBy: {
        created_at: 'desc'
    }
});

// DISTINCT
const domains = await prisma.user.findMany({
    select: {
        email: true
    },
    distinct: ['email']
});
```

### TypeORM Syntax

```typescript
// Select all columns
const users = await userRepository.find();

// Select specific columns
const users = await userRepository.find({
    select: ['email', 'name']
});

// WHERE clause
const user = await userRepository.findOne({
    where: { id: 1 }
});

const activeUsers = await userRepository.find({
    where: {
        is_active: true,
        created_at: MoreThanOrEqual(new Date('2024-01-01'))
    }
});

// ORDER BY
const users = await userRepository.find({
    order: {
        created_at: 'DESC'
    }
});

// LIMIT and OFFSET
const users = await userRepository.find({
    skip: 20,  // OFFSET
    take: 10,   // LIMIT
    order: {
        created_at: 'DESC'
    }
});

// Query Builder for complex queries
const users = await userRepository
    .createQueryBuilder('user')
    .where('user.is_active = :isActive', { isActive: true })
    .orderBy('user.created_at', 'DESC')
    .skip(20)
    .take(10)
    .getMany();
```

**Next Steps:**
- Learn [INSERT](../02_crud_basics/insert.md) to add data
- Master [WHERE Clauses](../03_querying_deep_dive/where_clauses.md) for advanced filtering
- Study [Joins](../04_joins/inner_join.md) to combine data from multiple tables

