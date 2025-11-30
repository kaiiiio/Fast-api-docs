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

