# Normalization: Database Design Principles

Normalization is the process of organizing data in a database to eliminate redundancy and ensure data integrity. Understanding normalization levels (1NF, 2NF, 3NF) is essential for designing efficient, maintainable databases.

## What is Normalization?

**Normalization** is a database design technique that:
- Eliminates data redundancy
- Prevents data anomalies (insertion, update, deletion)
- Ensures data integrity
- Reduces storage requirements

**Trade-off:** More normalized = less redundancy but more JOINs (potential performance cost).

## Data Anomalies (Problems Normalization Solves)

### Insertion Anomaly

**Problem:** Cannot insert data without other related data.

```sql
-- ❌ Bad: Unnormalized
CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_name VARCHAR(100),  -- Redundant user data
    user_email VARCHAR(255),  -- Redundant user data
    product_name VARCHAR(200),  -- Redundant product data
    product_price DECIMAL(10, 2),  -- Redundant product data
    quantity INT,
    total DECIMAL(10, 2)
);

-- Problem: Cannot add a new user without creating an order
-- No way to insert user data independently
```

### Update Anomaly

**Problem:** Must update data in multiple places.

```sql
-- ❌ Bad: User email stored in every order
-- If user changes email, must update ALL orders
UPDATE orders 
SET user_email = 'newemail@example.com'
WHERE user_id = 1;  -- Updates 100+ rows!
```

### Deletion Anomaly

**Problem:** Deleting one record removes related data.

```sql
-- ❌ Bad: Product data in orders
-- If delete last order for a product, product info is lost
DELETE FROM orders WHERE id = 123;
-- Product information might be lost if it was only in orders
```

## Normal Forms

### First Normal Form (1NF)

**Rules:**
1. Each column contains atomic (indivisible) values
2. Each row is unique
3. No repeating groups or arrays

#### Example: Violating 1NF

```sql
-- ❌ Bad: Repeating groups (violates 1NF)
CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id INT,
    product1_id INT,
    product1_quantity INT,
    product2_id INT,
    product2_quantity INT,
    product3_id INT,
    product3_quantity INT
);
```

**Problems:**
- Limited to 3 products per order
- Hard to query
- Wasted space if order has 1 product

#### Example: 1NF Compliant

```sql
-- ✅ Good: Atomic values, no repeating groups
CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
    id INT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);
```

**Benefits:**
- Unlimited products per order
- Easy to query
- No wasted space

### Second Normal Form (2NF)

**Rules:**
1. Must be in 1NF
2. All non-key attributes fully depend on the primary key
3. No partial dependencies

#### Example: Violating 2NF

```sql
-- ❌ Bad: Partial dependency (violates 2NF)
CREATE TABLE order_items (
    order_id INT,
    product_id INT,
    product_name VARCHAR(200),  -- Depends only on product_id, not full key
    quantity INT,
    price DECIMAL(10, 2),
    PRIMARY KEY (order_id, product_id)
);
```

**Problem:**
- `product_name` depends only on `product_id`, not the full primary key
- If product name changes, must update all order_items
- Redundant storage

#### Example: 2NF Compliant

```sql
-- ✅ Good: Separate tables, no partial dependencies
CREATE TABLE products (
    id INT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    price DECIMAL(10, 2) NOT NULL
);

CREATE TABLE order_items (
    order_id INT,
    product_id INT,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,  -- Price at time of order
    PRIMARY KEY (order_id, product_id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);
```

**Benefits:**
- Product name stored once
- Easy to update product name
- Order items reference products

### Third Normal Form (3NF)

**Rules:**
1. Must be in 2NF
2. No transitive dependencies
3. Non-key attributes depend only on the primary key

#### Example: Violating 3NF

```sql
-- ❌ Bad: Transitive dependency (violates 3NF)
CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id INT NOT NULL,
    user_name VARCHAR(100),  -- Depends on user_id, not order id
    user_email VARCHAR(255),  -- Depends on user_id, not order id
    total DECIMAL(10, 2) NOT NULL
);
```

**Problem:**
- `user_name` and `user_email` depend on `user_id`, not `order_id`
- If user changes email, must update all orders
- Redundant storage

#### Example: 3NF Compliant

```sql
-- ✅ Good: Separate tables, no transitive dependencies
CREATE TABLE users (
    id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id INT NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Benefits:**
- User data stored once
- Easy to update user information
- No redundancy

## Complete Normalization Example

### Starting Point: Unnormalized Table

```sql
-- ❌ Bad: All data in one table (unnormalized)
CREATE TABLE order_data (
    order_id INT,
    order_date DATE,
    user_id INT,
    user_name VARCHAR(100),
    user_email VARCHAR(255),
    user_phone VARCHAR(20),
    product_id INT,
    product_name VARCHAR(200),
    product_category VARCHAR(100),
    product_price DECIMAL(10, 2),
    quantity INT,
    line_total DECIMAL(10, 2)
);
```

**Problems:**
- User data repeated for each order
- Product data repeated for each order
- Hard to maintain
- Data anomalies

### Step 1: 1NF (Eliminate Repeating Groups)

```sql
-- ✅ 1NF: Separate order items
CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id INT,
    order_date DATE,
    total DECIMAL(10, 2)
);

CREATE TABLE order_items (
    id INT PRIMARY KEY,
    order_id INT,
    product_id INT,
    user_name VARCHAR(100),  -- Still redundant
    product_name VARCHAR(200),  -- Still redundant
    quantity INT,
    price DECIMAL(10, 2)
);
```

### Step 2: 2NF (Eliminate Partial Dependencies)

```sql
-- ✅ 2NF: Separate products
CREATE TABLE products (
    id INT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    price DECIMAL(10, 2) NOT NULL
);

CREATE TABLE order_items (
    id INT PRIMARY KEY,
    order_id INT,
    product_id INT,
    user_name VARCHAR(100),  -- Still redundant
    quantity INT,
    price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id)
);
```

### Step 3: 3NF (Eliminate Transitive Dependencies)

```sql
-- ✅ 3NF: Separate users
CREATE TABLE users (
    id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20)
);

CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id INT NOT NULL,
    order_date DATE NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE products (
    id INT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category_id INT,
    price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE order_items (
    id INT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,  -- Price at time of order
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);
```

**Result:**
- No redundancy
- Easy to maintain
- Data integrity
- Normalized to 3NF

## When to Normalize

### ✅ Normalize When:

1. **Data Integrity Critical**
   - Financial systems
   - User management
   - Inventory systems

2. **Frequent Updates**
   - User profiles
   - Product catalogs
   - Configuration data

3. **Complex Relationships**
   - E-commerce
   - CRM systems
   - Content management

### ⚠️ Consider Denormalization When:

1. **Read-Heavy Workloads**
   - Analytics
   - Reporting
   - Dashboards

2. **Performance Critical**
   - High-traffic applications
   - Real-time systems
   - Caching layers

3. **Simple Data Models**
   - Logging
   - Event streams
   - Time-series data

## Denormalization: When to Break the Rules

Sometimes, denormalization (intentionally breaking normalization rules) improves performance.

### Example: Denormalized Read Model

```sql
-- Normalized write model (3NF)
CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id INT NOT NULL,
    total DECIMAL(10, 2) NOT NULL
);

CREATE TABLE users (
    id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL
);

-- Denormalized read model (for performance)
CREATE TABLE order_summary (
    order_id INT PRIMARY KEY,
    user_id INT NOT NULL,
    user_name VARCHAR(100),  -- Denormalized
    user_email VARCHAR(255),  -- Denormalized
    order_total DECIMAL(10, 2) NOT NULL,
    order_date DATE NOT NULL
);
```

**Benefits:**
- Faster reads (no JOINs)
- Better for analytics
- Simpler queries

**Costs:**
- Redundant storage
- Must keep in sync
- More complex updates

## Normalization Checklist

### 1NF Checklist
- ✅ Each column has atomic values
- ✅ No repeating groups
- ✅ Each row is unique

### 2NF Checklist
- ✅ In 1NF
- ✅ All non-key attributes depend on full primary key
- ✅ No partial dependencies

### 3NF Checklist
- ✅ In 2NF
- ✅ No transitive dependencies
- ✅ Non-key attributes depend only on primary key

## Common Mistakes

### ❌ Over-Normalization

```sql
-- ❌ Too normalized: Unnecessary tables
CREATE TABLE user_first_names (user_id INT, first_name VARCHAR(50));
CREATE TABLE user_last_names (user_id INT, last_name VARCHAR(50));
-- Should be one table: users (id, first_name, last_name)
```

### ❌ Under-Normalization

```sql
-- ❌ Not normalized: Too much redundancy
CREATE TABLE orders (
    id INT,
    user_name VARCHAR(100),
    user_email VARCHAR(255),
    product_name VARCHAR(200),
    product_price DECIMAL(10, 2),
    -- All data in one table
);
```

### ❌ Ignoring Performance

```sql
-- ❌ Normalized but slow
-- 10 JOINs for simple query
SELECT ...
FROM users u
JOIN orders o ON u.id = o.user_id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
JOIN categories c ON p.category_id = c.id
-- ... 5 more JOINs
-- Consider denormalized read model
```

## Best Practices

1. **Start Normalized**: Design in 3NF first
2. **Measure Performance**: Test with real data volumes
3. **Denormalize Selectively**: Only where needed for performance
4. **Document Decisions**: Why denormalized, how to keep in sync
5. **Use Views**: Create views for common denormalized queries
6. **Separate Read/Write Models**: CQRS pattern for complex systems

## Summary

**Normalization Essentials:**

1. **1NF**: Atomic values, no repeating groups
2. **2NF**: No partial dependencies (all attributes depend on full key)
3. **3NF**: No transitive dependencies (attributes depend only on primary key)
4. **Purpose**: Eliminate redundancy, ensure data integrity
5. **Trade-off**: More normalized = less redundancy but more JOINs
6. **Denormalization**: Sometimes needed for performance

**Key Takeaway:**
Normalization eliminates redundancy and ensures data integrity. Start with 3NF, then denormalize selectively for performance where needed. Balance between normalization (data integrity) and denormalization (performance) based on your use case.

**Normalization Benefits:**
- Eliminates data redundancy
- Prevents update anomalies
- Ensures data integrity
- Reduces storage

**Denormalization Benefits:**
- Faster reads (fewer JOINs)
- Simpler queries
- Better for analytics

**Next Steps:**
- Learn [Denormalization](denormalization.md) for performance optimization
- Study [Data Modeling](data_modeling.md) for schema design
- Master [Performance Optimization](../10_performance_optimization/) for query tuning

---

## 🎯 Interview Questions: SQL

### Q1: Explain database normalization, including 1NF, 2NF, and 3NF. Provide a detailed example showing the normalization process step-by-step, and explain the problems that normalization solves (update anomalies, insertion anomalies, deletion anomalies).

**Answer:**

**Normalization Definition:**

Database normalization is the process of organizing data in a database to eliminate redundancy and dependency issues. It involves dividing large tables into smaller, related tables and defining relationships between them. The goal is to ensure data integrity, reduce storage requirements, and prevent data anomalies that can occur when data is duplicated or improperly structured.

**Normal Forms:**

Normalization is achieved through a series of "normal forms" (1NF, 2NF, 3NF, etc.), each addressing specific types of redundancy and dependency issues. Higher normal forms build upon lower ones, with each level eliminating more potential problems.

**Problems Normalization Solves:**

**1. Update Anomalies:**

When the same data is stored in multiple places, updating it requires updating all occurrences. If you miss one, data becomes inconsistent.

**Example:**
```sql
-- Unnormalized table
CREATE TABLE orders (
    order_id INT,
    user_id INT,
    user_name VARCHAR(100),  -- Redundant
    user_email VARCHAR(255),  -- Redundant
    product_id INT,
    product_name VARCHAR(200),  -- Redundant
    product_price DECIMAL(10,2),  -- Redundant
    quantity INT,
    total DECIMAL(10,2)
);

-- Problem: User changes email
-- Must update ALL orders for that user
UPDATE orders 
SET user_email = 'newemail@example.com' 
WHERE user_id = 1;
-- If this fails partway, some orders have old email, some have new
-- Data inconsistency!
```

**2. Insertion Anomalies:**

Cannot insert data about one entity without data about another entity.

**Example:**
```sql
-- Problem: Cannot add a new product without an order
INSERT INTO orders (product_id, product_name, product_price)
VALUES (999, 'New Product', 50.00);
-- Error: order_id and user_id are required
-- But we just want to add a product, not create an order!
```

**3. Deletion Anomalies:**

Deleting data about one entity accidentally deletes data about another entity.

**Example:**
```sql
-- Problem: Deleting last order for a product deletes product info
DELETE FROM orders WHERE order_id = 100;
-- If this was the only order with product_id = 5,
-- We lose all information about that product!
```

**Step-by-Step Normalization Example:**

**Starting Point: Unnormalized Table**

```sql
-- ❌ Unnormalized: All data in one table
CREATE TABLE order_data (
    order_id INT,
    order_date DATE,
    user_id INT,
    user_name VARCHAR(100),
    user_email VARCHAR(255),
    user_phone VARCHAR(20),
    product_id INT,
    product_name VARCHAR(200),
    product_category VARCHAR(100),
    product_price DECIMAL(10,2),
    quantity INT,
    line_total DECIMAL(10,2)
);

-- Sample Data:
INSERT INTO order_data VALUES
(1, '2024-01-15', 1, 'John Doe', 'john@example.com', '555-0101', 
 101, 'Laptop', 'Electronics', 999.99, 1, 999.99),
(2, '2024-01-15', 1, 'John Doe', 'john@example.com', '555-0101',
 102, 'Mouse', 'Electronics', 29.99, 2, 59.98),
(3, '2024-01-16', 2, 'Jane Smith', 'jane@example.com', '555-0202',
 101, 'Laptop', 'Electronics', 999.99, 1, 999.99);
```

**Problems:**
- User data repeated (John's info in rows 1 and 2)
- Product data repeated (Laptop info in rows 1 and 3)
- Update anomaly: Change John's email requires updating 2 rows
- Insertion anomaly: Can't add product without order
- Deletion anomaly: Delete order 1, lose Laptop product info if it was only order

**Step 1: First Normal Form (1NF)**

**Rules:**
- Each column contains atomic (indivisible) values
- No repeating groups
- Each row is unique

**Transformation:**
```sql
-- ✅ 1NF: Separate order items into own table
CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id INT,
    order_date DATE,
    total DECIMAL(10,2)
);

CREATE TABLE order_items (
    id INT PRIMARY KEY,
    order_id INT,
    product_id INT,
    user_name VARCHAR(100),  -- Still redundant
    product_name VARCHAR(200),  -- Still redundant
    quantity INT,
    price DECIMAL(10,2),
    line_total DECIMAL(10,2),
    FOREIGN KEY (order_id) REFERENCES orders(id)
);
```

**Improvements:**
- ✅ Atomic values
- ✅ No repeating groups
- ❌ Still has redundancy (user_name, product_name repeated)

**Step 2: Second Normal Form (2NF)**

**Rules:**
- Must be in 1NF
- All non-key attributes must depend on the full primary key
- No partial dependencies

**Analysis:**
- `order_items` primary key: `(id)` or `(order_id, product_id)`
- `user_name` depends only on `order_id` (partial dependency)
- `product_name` depends only on `product_id` (partial dependency)

**Transformation:**
```sql
-- ✅ 2NF: Remove partial dependencies
CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id INT,
    user_name VARCHAR(100),  -- Still redundant across orders
    order_date DATE,
    total DECIMAL(10,2)
);

CREATE TABLE products (
    id INT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    price DECIMAL(10,2) NOT NULL
);

CREATE TABLE order_items (
    id INT PRIMARY KEY,
    order_id INT,
    product_id INT,
    quantity INT,
    price DECIMAL(10,2) NOT NULL,  -- Price at time of order
    line_total DECIMAL(10,2),
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);
```

**Improvements:**
- ✅ No partial dependencies
- ✅ Product data in separate table
- ❌ Still has redundancy (user_name in orders table)

**Step 3: Third Normal Form (3NF)**

**Rules:**
- Must be in 2NF
- No transitive dependencies
- Non-key attributes depend only on the primary key, not on other non-key attributes

**Analysis:**
- In `orders` table: `user_name` depends on `user_id`, not on `order_id` (transitive dependency)
- `user_id` → `user_name` (user_name should be in users table)

**Transformation:**
```sql
-- ✅ 3NF: Remove transitive dependencies
CREATE TABLE users (
    id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20)
);

CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id INT NOT NULL,
    order_date DATE NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE categories (
    id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE products (
    id INT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category_id INT,
    price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE order_items (
    id INT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,  -- Snapshot price at order time
    line_total DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);
```

**Final Normalized Structure:**
```
users (1NF, 2NF, 3NF)
  ├─ id (PK)
  ├─ name
  ├─ email
  └─ phone

orders (1NF, 2NF, 3NF)
  ├─ id (PK)
  ├─ user_id (FK → users)
  ├─ order_date
  └─ total

products (1NF, 2NF, 3NF)
  ├─ id (PK)
  ├─ name
  ├─ category_id (FK → categories)
  └─ price

order_items (1NF, 2NF, 3NF)
  ├─ id (PK)
  ├─ order_id (FK → orders)
  ├─ product_id (FK → products)
  ├─ quantity
  ├─ price (snapshot)
  └─ line_total
```

**How Normalization Solves Problems:**

**1. Update Anomalies - SOLVED:**

```sql
-- Before (unnormalized): Update user email in multiple places
UPDATE order_data SET user_email = 'new@example.com' WHERE user_id = 1;
-- Must update all rows, risk of inconsistency

-- After (normalized): Update once
UPDATE users SET email = 'new@example.com' WHERE id = 1;
-- Single source of truth, always consistent
```

**2. Insertion Anomalies - SOLVED:**

```sql
-- Before: Cannot add product without order
-- After: Can add product independently
INSERT INTO products (name, category_id, price)
VALUES ('New Product', 1, 50.00);
-- No order required!
```

**3. Deletion Anomalies - SOLVED:**

```sql
-- Before: Delete order might delete product info
DELETE FROM order_data WHERE order_id = 1;
-- If this was only order with product, product info lost

-- After: Delete order, product remains
DELETE FROM orders WHERE id = 1;
-- Product still exists in products table
```

**Visual Comparison:**

```
Unnormalized (Problems):
┌─────────────────────────────────────────────┐
│ order_data                                   │
│ ┌────────┬────────┬────────┬──────────────┐│
│ │order_id│user_id │user_name│product_name  ││
│ ├────────┼────────┼────────┼──────────────┤│
│ │ 1      │ 1      │ John   │ Laptop       ││
│ │ 2      │ 1      │ John   │ Mouse        ││ ← Redundant
│ │ 3      │ 2      │ Jane   │ Laptop       ││ ← Redundant
│ └────────┴────────┴────────┴──────────────┘│
│ Problems:                                    │
│ • Update: Change John's name → update 2 rows │
│ • Insert: Can't add product without order    │
│ • Delete: Delete order → lose product info   │
└─────────────────────────────────────────────┘

Normalized (3NF):
┌─────────┐    ┌─────────┐    ┌──────────┐
│  users  │    │ orders  │    │ products │
│ ┌──────┐│    │ ┌──────┐│    │ ┌──────┐ │
│ │id|name││◄───┤ │id|uid││    │ │id|name││
│ └──────┘│    │ └──┬───┘│    │ └──┬───┘ │
└─────────┘    └────┼────┘    └────┼─────┘
                    │              │
                    ▼              ▼
              ┌──────────────────────┐
              │   order_items        │
              │ ┌────┬────┬────────┐ │
              │ │oid │pid │qty|prc│ │
              │ └────┴────┴────────┘ │
              └──────────────────────┘
Benefits:
• Update: Change name once in users table
• Insert: Add product independently
• Delete: Delete order, product remains
```

**System Design Consideration**: Normalization is fundamental for:
1. **Data Integrity**: Ensuring consistent, accurate data
2. **Maintainability**: Easier to update and maintain
3. **Storage Efficiency**: Reducing redundancy saves space
4. **Flexibility**: Easier to extend and modify schema

Normalization is a critical database design principle that eliminates redundancy and ensures data integrity. While it may require more JOINs in queries, the benefits in data consistency, maintainability, and integrity far outweigh the performance costs in most cases. Understanding normalization helps you design robust, maintainable database schemas.

---

### Q2: Explain the trade-offs between normalization and denormalization. When should you normalize, and when should you denormalize? Provide examples showing how denormalization can improve query performance and when it's worth the cost of maintaining redundant data.

**Answer:**

**Normalization vs Denormalization Trade-offs:**

Normalization and denormalization represent opposite approaches to database design. Normalization eliminates redundancy for data integrity, while denormalization introduces controlled redundancy for performance. The choice between them depends on your application's read/write patterns, performance requirements, and data consistency needs.

**Normalization Benefits:**

**1. Data Integrity:**
- Single source of truth for each piece of data
- Updates happen in one place
- No risk of inconsistent data

**2. Storage Efficiency:**
- No redundant data storage
- Smaller database size
- Lower storage costs

**3. Maintainability:**
- Easier to update (change once, affects everywhere)
- Clearer data relationships
- Easier to understand schema

**4. Flexibility:**
- Easier to modify schema
- Can add new relationships
- Better for evolving requirements

**Normalization Costs:**

**1. Query Complexity:**
- More JOINs required
- More complex queries
- Harder to write and understand

**2. Performance:**
- JOINs can be expensive
- More I/O operations
- Slower for read-heavy workloads

**3. Development Time:**
- More complex queries
- More time to write queries
- More potential for errors

**Denormalization Benefits:**

**1. Query Performance:**
- Fewer or no JOINs
- Faster queries
- Better for read-heavy workloads

**2. Simplicity:**
- Simpler queries
- Easier to write
- Less complex code

**3. Scalability:**
- Better performance at scale
- Can handle high read loads
- Reduced database load

**Denormalization Costs:**

**1. Data Redundancy:**
- Same data stored multiple times
- Increased storage requirements
- Higher storage costs

**2. Update Complexity:**
- Must update multiple places
- Risk of inconsistency
- More complex update logic

**3. Maintenance Overhead:**
- Must keep redundant data in sync
- Triggers, application logic, or ETL processes needed
- More code to maintain

**When to Normalize:**

**1. Write-Heavy Workloads:**

When your application performs many updates, normalization is better because:
- Updates happen in one place
- No risk of inconsistent updates
- Better write performance

**Example:**
```sql
-- Normalized: User management system
-- Frequent updates to user profiles
UPDATE users SET email = 'new@example.com' WHERE id = 1;
-- Single update, always consistent
-- Better than updating user_email in 1000 order records
```

**2. Data Integrity Critical:**

When data accuracy is paramount:
- Financial systems
- User account management
- Inventory systems
- Medical records

**3. Storage Constraints:**

When storage is limited or expensive:
- Normalized schema uses less storage
- No redundant data

**4. Complex Relationships:**

When data has many relationships:
- Normalization handles complexity better
- Easier to maintain relationships

**When to Denormalize:**

**1. Read-Heavy Workloads:**

When reads far outnumber writes, denormalization can significantly improve performance.

**Example:**
```sql
-- Normalized (slow for reads):
SELECT 
    u.name,
    u.email,
    COUNT(o.id) AS order_count,
    SUM(o.total) AS total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name, u.email;
-- Requires JOIN and GROUP BY
-- Slower for frequent reads

-- Denormalized (fast for reads):
SELECT 
    name,
    email,
    order_count,  -- Pre-calculated
    total_spent   -- Pre-calculated
FROM user_statistics;
-- No JOINs, instant results
-- Much faster for dashboard queries
```

**2. Analytics and Reporting:**

When building analytics dashboards or reports:
- Denormalized read models are faster
- Simpler queries
- Better for aggregations

**Example:**
```sql
-- Analytics query on normalized schema (slow):
SELECT 
    DATE_TRUNC('month', o.created_at) AS month,
    c.name AS category,
    SUM(oi.quantity * oi.price) AS revenue
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
JOIN categories c ON p.category_id = c.id
GROUP BY month, c.name;
-- 4 JOINs, expensive

-- Denormalized read model (fast):
SELECT 
    month,
    category,
    revenue  -- Pre-aggregated
FROM monthly_category_revenue;
-- No JOINs, instant
```

**3. High-Traffic Applications:**

When you need to handle high read loads:
- Denormalization reduces database load
- Faster response times
- Better user experience

**4. Simple Data Models:**

When relationships are simple:
- Denormalization overhead is manageable
- Easier to keep in sync

**Detailed Example: E-commerce System**

**Scenario:** E-commerce platform with:
- 10 million users
- 100 million orders
- Heavy read traffic (product pages, order history)
- Moderate write traffic (new orders, user updates)

**Normalized Schema (Write Model):**

```sql
-- Normalized for data integrity
CREATE TABLE users (
    id INT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(255)
);

CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id INT REFERENCES users(id),
    created_at TIMESTAMP,
    total DECIMAL(10,2)
);

CREATE TABLE products (
    id INT PRIMARY KEY,
    name VARCHAR(200),
    price DECIMAL(10,2)
);

CREATE TABLE order_items (
    id INT PRIMARY KEY,
    order_id INT REFERENCES orders(id),
    product_id INT REFERENCES products(id),
    quantity INT,
    price DECIMAL(10,2)
);
```

**Query Performance (Normalized):**

```sql
-- User order history (frequent query)
SELECT 
    o.id,
    o.created_at,
    o.total,
    p.name AS product_name,
    oi.quantity,
    oi.price
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
WHERE o.user_id = 123
ORDER BY o.created_at DESC
LIMIT 20;

-- Execution:
-- 1. Index scan on orders (user_id) → 100 orders
-- 2. Join with order_items → 300 items
-- 3. Join with products → 300 lookups
-- Time: ~50-100ms
-- I/O: ~500 page reads
```

**Denormalized Read Model:**

```sql
-- Denormalized for read performance
CREATE TABLE user_order_history (
    order_id INT PRIMARY KEY,
    user_id INT,
    user_name VARCHAR(100),  -- Denormalized
    order_date TIMESTAMP,
    order_total DECIMAL(10,2),
    product_id INT,
    product_name VARCHAR(200),  -- Denormalized
    product_price DECIMAL(10,2),  -- Denormalized
    quantity INT,
    line_total DECIMAL(10,2),
    INDEX idx_user_date (user_id, order_date)
);
```

**Query Performance (Denormalized):**

```sql
-- Same query on denormalized table
SELECT 
    order_id,
    order_date,
    order_total,
    product_name,
    quantity,
    product_price
FROM user_order_history
WHERE user_id = 123
ORDER BY order_date DESC
LIMIT 20;

-- Execution:
-- 1. Index scan on user_order_history (user_id, order_date)
-- 2. No JOINs needed!
-- Time: ~5-10ms
-- I/O: ~20 page reads
-- 10x faster!
```

**Maintaining Denormalized Data:**

**Option 1: Application-Level Sync**

```sql
-- When order is created, update denormalized table
BEGIN;
INSERT INTO orders (user_id, total) VALUES (123, 99.99);
INSERT INTO order_items (order_id, product_id, quantity, price)
VALUES (1000, 5, 2, 49.99);

-- Update denormalized read model
INSERT INTO user_order_history (
    order_id, user_id, user_name, order_date, order_total,
    product_id, product_name, product_price, quantity, line_total
)
SELECT 
    o.id,
    o.user_id,
    u.name,
    o.created_at,
    o.total,
    oi.product_id,
    p.name,
    oi.price,
    oi.quantity,
    oi.price * oi.quantity
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
WHERE o.id = 1000;
COMMIT;
```

**Option 2: Database Triggers**

```sql
-- Automatically sync on updates
CREATE OR REPLACE FUNCTION sync_order_history()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_order_history (
        order_id, user_id, user_name, order_date, order_total,
        product_id, product_name, product_price, quantity, line_total
    )
    SELECT 
        NEW.id,
        NEW.user_id,
        u.name,
        NEW.created_at,
        NEW.total,
        oi.product_id,
        p.name,
        oi.price,
        oi.quantity,
        oi.price * oi.quantity
    FROM users u
    JOIN order_items oi ON NEW.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    WHERE u.id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_order_history_trigger
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION sync_order_history();
```

**Option 3: ETL/Background Jobs**

```sql
-- Periodic sync job
-- Run every few minutes to sync denormalized tables
INSERT INTO user_order_history (...)
SELECT ... FROM orders o
JOIN users u ON o.user_id = u.id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
WHERE o.created_at > (SELECT MAX(order_date) FROM user_order_history);
```

**When Denormalization is Worth It:**

**1. Read/Write Ratio:**

If reads >> writes (e.g., 100:1 or 1000:1), denormalization is often worth it:
- Performance gain from faster reads outweighs update cost
- Most operations benefit from denormalization

**2. Query Performance Critical:**

When query performance directly impacts user experience:
- Real-time dashboards
- High-traffic APIs
- Mobile applications

**3. Storage is Cheap:**

When storage costs are low compared to compute costs:
- Cloud storage is inexpensive
- Performance is more valuable than storage

**4. Update Frequency is Low:**

When denormalized data changes infrequently:
- Historical data
- Reference data
- Snapshot data

**When Denormalization is NOT Worth It:**

**1. Frequent Updates:**

If data changes frequently:
- High sync overhead
- Risk of inconsistency
- May be slower overall

**2. Storage Constraints:**

When storage is expensive or limited:
- Denormalization increases storage significantly
- May not be feasible

**3. Data Integrity Critical:**

When consistency is more important than performance:
- Financial transactions
- Medical records
- Critical business data

**Hybrid Approach (CQRS Pattern):**

**Best of Both Worlds:**

```sql
-- Normalized Write Model (for updates)
-- Maintains data integrity
CREATE TABLE users (...);
CREATE TABLE orders (...);
CREATE TABLE products (...);

-- Denormalized Read Model (for queries)
-- Optimized for reads
CREATE TABLE user_order_summary (
    user_id INT,
    order_count INT,
    total_spent DECIMAL(10,2),
    last_order_date TIMESTAMP
);

-- Keep in sync with triggers or background jobs
```

**System Design Consideration**: The normalization vs denormalization decision is crucial for:
1. **Performance**: Balancing read and write performance
2. **Data Integrity**: Ensuring data consistency
3. **Maintainability**: Managing complexity
4. **Scalability**: Handling growth

Normalization and denormalization are complementary strategies. Start with normalization for data integrity, then selectively denormalize for performance where needed. The key is understanding your access patterns and making informed trade-offs between consistency and performance.

