# Denormalization: When and Why to Denormalize

Denormalization is the process of intentionally adding redundant data to improve read performance. While normalization reduces redundancy, denormalization strategically introduces it for performance gains.

## What is Denormalization?

**Denormalization** is the intentional duplication of data across tables to:
- Improve read performance
- Reduce JOIN operations
- Simplify queries
- Speed up analytics

**Trade-off:** Better read performance vs. increased storage and update complexity

## When to Denormalize

### 1. Read-Heavy Workloads

**Scenario:** Frequent reads, infrequent writes

```sql
-- Normalized: Requires JOIN
SELECT 
    o.id,
    o.total,
    u.name AS user_name,
    u.email AS user_email
FROM orders o
JOIN users u ON o.user_id = u.id;

-- Denormalized: No JOIN needed
SELECT 
    id,
    total,
    user_name,  -- Stored directly in orders table
    user_email  -- Stored directly in orders table
FROM orders;
```

**Benefit:** Faster queries, no JOIN overhead

### 2. Analytics and Reporting

**Scenario:** Complex aggregations on large datasets

```sql
-- Normalized: Multiple JOINs
SELECT 
    c.name AS category_name,
    SUM(oi.quantity * oi.price) AS revenue
FROM categories c
JOIN products p ON c.id = p.category_id
JOIN order_items oi ON p.id = oi.product_id
GROUP BY c.name;

-- Denormalized: Pre-aggregated
SELECT 
    category_name,  -- Stored in order_items
    SUM(revenue) AS total_revenue  -- Pre-calculated
FROM order_items
GROUP BY category_name;
```

**Benefit:** Much faster analytics queries

### 3. Real-Time Requirements

**Scenario:** Need fast response times

```sql
-- Normalized: JOIN adds latency
SELECT 
    p.name,
    c.name AS category_name
FROM products p
JOIN categories c ON p.category_id = c.id;

-- Denormalized: Single table read
SELECT 
    name,
    category_name  -- Denormalized
FROM products;
```

**Benefit:** Lower latency, better user experience

## Common Denormalization Patterns

### Pattern 1: Copy Frequently Accessed Data

```sql
-- Denormalize: Store user name in orders
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    user_name VARCHAR(255),  -- Denormalized: Copy from users
    user_email VARCHAR(255),  -- Denormalized: Copy from users
    total DECIMAL(10, 2),
    created_at TIMESTAMP
);

-- Benefit: No JOIN needed
SELECT id, user_name, total FROM orders;
```

**Trade-off:** Must update orders when user name changes

### Pattern 2: Pre-Aggregated Values

```sql
-- Denormalize: Store order count in users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255),
    order_count INTEGER DEFAULT 0,  -- Denormalized: Pre-calculated
    total_spent DECIMAL(10, 2) DEFAULT 0  -- Denormalized: Pre-calculated
);

-- Benefit: Fast user statistics
SELECT name, order_count, total_spent FROM users;
```

**Trade-off:** Must maintain consistency when orders change

### Pattern 3: Flattened Hierarchies

```sql
-- Normalized: Hierarchical categories
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    parent_id INTEGER
);

-- Denormalized: Store full path
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    category_id INTEGER,
    category_path VARCHAR(255)  -- Denormalized: "Electronics > Laptops > Gaming"
);
```

**Benefit:** No recursive queries needed

### Pattern 4: Materialized Views

```sql
-- Denormalized: Materialized view
CREATE MATERIALIZED VIEW product_sales_summary AS
SELECT 
    p.id,
    p.name,
    p.category_id,
    c.name AS category_name,  -- Denormalized
    COUNT(oi.id) AS sales_count,
    SUM(oi.quantity * oi.price) AS revenue
FROM products p
JOIN categories c ON p.category_id = c.id
JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.id, p.name, p.category_id, c.name;

-- Fast queries
SELECT * FROM product_sales_summary
WHERE category_name = 'Electronics';
```

**Benefit:** Pre-computed, fast reads

## Real-World Examples

### Example 1: E-commerce Order History

**Normalized:**
```sql
-- Requires JOIN
SELECT 
    o.id,
    o.total,
    u.name,
    u.email
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.user_id = 1;
```

**Denormalized:**
```sql
-- No JOIN needed
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    user_name VARCHAR(255),  -- Denormalized
    user_email VARCHAR(255),  -- Denormalized
    total DECIMAL(10, 2)
);

SELECT id, total, user_name, user_email
FROM orders
WHERE user_id = 1;
```

**Benefit:** Faster order history queries

### Example 2: User Dashboard

**Normalized:**
```sql
-- Multiple JOINs and aggregations
SELECT 
    u.id,
    u.name,
    COUNT(o.id) AS order_count,
    SUM(o.total) AS total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;
```

**Denormalized:**
```sql
-- Pre-calculated values
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    order_count INTEGER DEFAULT 0,  -- Denormalized
    total_spent DECIMAL(10, 2) DEFAULT 0  -- Denormalized
);

SELECT id, name, order_count, total_spent
FROM users;
```

**Benefit:** Instant dashboard load

### Example 3: Product Catalog

**Normalized:**
```sql
-- JOIN required
SELECT 
    p.name,
    c.name AS category_name,
    AVG(r.rating) AS avg_rating
FROM products p
JOIN categories c ON p.category_id = c.id
LEFT JOIN reviews r ON p.id = r.product_id
GROUP BY p.id, p.name, c.name;
```

**Denormalized:**
```sql
-- All data in one table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    category_name VARCHAR(255),  -- Denormalized
    avg_rating DECIMAL(3, 2)  -- Denormalized: Pre-calculated
);

SELECT name, category_name, avg_rating
FROM products;
```

**Benefit:** Fast catalog queries

## Maintaining Denormalized Data

### Strategy 1: Application-Level Updates

```sql
-- Update denormalized data when source changes
-- When user name changes:
UPDATE users SET name = 'New Name' WHERE id = 1;
UPDATE orders SET user_name = 'New Name' WHERE user_id = 1;  -- Maintain consistency
```

### Strategy 2: Triggers

```sql
-- Automatic updates via triggers
CREATE TRIGGER update_order_user_name
AFTER UPDATE ON users
FOR EACH ROW
WHEN (OLD.name != NEW.name)
EXECUTE FUNCTION update_orders_user_name();
```

### Strategy 3: Periodic Refresh

```sql
-- Refresh denormalized data periodically
-- For materialized views
REFRESH MATERIALIZED VIEW product_sales_summary;
```

## When NOT to Denormalize

### ❌ Don't Denormalize When:

1. **Write-Heavy Workloads**: Updates become expensive
2. **Data Changes Frequently**: Consistency issues
3. **Storage is Limited**: Denormalization increases storage
4. **Complex Relationships**: Hard to maintain
5. **Early Development**: Premature optimization

## Best Practices

1. **Measure First**: Profile queries before denormalizing
2. **Start Normalized**: Normalize first, denormalize later
3. **Document Changes**: Document what's denormalized and why
4. **Maintain Consistency**: Use triggers or application logic
5. **Monitor Performance**: Track query improvements

## Denormalization Checklist

- ✅ Read performance is critical
- ✅ Writes are infrequent
- ✅ Storage is not a concern
- ✅ Consistency strategy defined
- ✅ Performance gains measured

## Summary

**Denormalization Essentials:**

1. **Purpose**: Improve read performance by adding redundancy
2. **When**: Read-heavy workloads, analytics, real-time requirements
3. **Patterns**: Copy data, pre-aggregate, flatten hierarchies
4. **Trade-offs**: Better reads vs. update complexity
5. **Maintenance**: Triggers, application logic, or periodic refresh

**Key Takeaway:**
Denormalization strategically adds redundancy to improve read performance. Use it for read-heavy workloads, analytics, and real-time requirements. Always maintain consistency and measure performance gains. Start normalized, denormalize when needed.

**Common Patterns:**
- Copy frequently accessed columns
- Pre-aggregate values
- Flatten hierarchies
- Use materialized views

**Next Steps:**
- Learn [Normalization](normalization.md) for database design
- Study [Indexes](../08_indexes/what_is_index.md) for performance
- Master [Materialized Views](../15_db_infrastructure/views.md) for denormalization

