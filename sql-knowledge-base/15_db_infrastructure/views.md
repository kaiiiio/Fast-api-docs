# Database Views: Virtual Tables for Simplified Queries

Views are virtual tables based on the result of a SQL query. They simplify complex queries, provide abstraction, and enhance security by controlling data access.

## What are Views?

**Views** are saved SQL queries that act like tables. They don't store data themselves but display data from underlying tables.

### Key Benefits

1. **Simplify Complex Queries**: Encapsulate complex logic
2. **Security**: Control what data users can see
3. **Abstraction**: Hide table structure changes
4. **Reusability**: Use same query logic in multiple places

## Basic View Syntax

### Creating a View

```sql
CREATE VIEW view_name AS
SELECT column1, column2, ...
FROM table1
WHERE condition;
```

### Basic Example

```sql
-- Create view for active users
CREATE VIEW active_users AS
SELECT 
    id,
    name,
    email,
    created_at
FROM users
WHERE is_active = true;

-- Use view like a table
SELECT * FROM active_users;
```

## Simple Views

### Example 1: Filtered View

```sql
-- View of completed orders
CREATE VIEW completed_orders AS
SELECT 
    id,
    user_id,
    total,
    created_at
FROM orders
WHERE status = 'completed';

-- Query the view
SELECT * FROM completed_orders
WHERE total > 100;
```

### Example 2: Calculated Columns

```sql
-- View with calculated fields
CREATE VIEW order_summary AS
SELECT 
    o.id,
    o.user_id,
    o.total,
    o.created_at,
    COUNT(oi.id) AS item_count,
    SUM(oi.quantity) AS total_quantity
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, o.user_id, o.total, o.created_at;

-- Use the view
SELECT * FROM order_summary
WHERE item_count > 5;
```

### Example 3: Joined View

```sql
-- View joining multiple tables
CREATE VIEW user_orders AS
SELECT 
    u.id AS user_id,
    u.name AS user_name,
    u.email,
    o.id AS order_id,
    o.total,
    o.status,
    o.created_at AS order_date
FROM users u
JOIN orders o ON u.id = o.user_id;

-- Query the view
SELECT * FROM user_orders
WHERE user_id = 1;
```

## Updating Views

### Modifying a View

```sql
-- Drop and recreate
DROP VIEW IF EXISTS active_users;

CREATE VIEW active_users AS
SELECT 
    id,
    name,
    email,
    created_at,
    last_login_at  -- Added new column
FROM users
WHERE is_active = true;
```

### ALTER VIEW (PostgreSQL)

```sql
-- Alter view definition
ALTER VIEW active_users AS
SELECT 
    id,
    name,
    email,
    created_at,
    last_login_at
FROM users
WHERE is_active = true;
```

## Materialized Views

**Materialized Views** store the query results physically, improving performance for expensive queries.

### Creating Materialized View

```sql
-- Create materialized view
CREATE MATERIALIZED VIEW product_sales_summary AS
SELECT 
    p.id,
    p.name,
    COUNT(oi.id) AS items_sold,
    SUM(oi.quantity * oi.price) AS revenue
FROM products p
JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.id, p.name;

-- Query materialized view (fast!)
SELECT * FROM product_sales_summary
ORDER BY revenue DESC;
```

### Refreshing Materialized View

```sql
-- Refresh materialized view (updates stored data)
REFRESH MATERIALIZED VIEW product_sales_summary;

-- Refresh concurrently (doesn't lock table)
REFRESH MATERIALIZED VIEW CONCURRENTLY product_sales_summary;
```

**When to Use:**
- Expensive queries run frequently
- Data doesn't need to be real-time
- Performance is critical

## Real-World Examples

### Example 1: User Dashboard View

```sql
-- Comprehensive user statistics view
CREATE VIEW user_dashboard AS
SELECT 
    u.id,
    u.name,
    u.email,
    COUNT(o.id) AS total_orders,
    SUM(o.total) AS total_spent,
    AVG(o.total) AS avg_order_value,
    MAX(o.created_at) AS last_order_date
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.status = 'completed' OR o.id IS NULL
GROUP BY u.id, u.name, u.email;

-- Use in API
SELECT * FROM user_dashboard
WHERE id = :user_id;
```

### Example 2: Product Catalog View

```sql
-- Product catalog with category and pricing
CREATE VIEW product_catalog AS
SELECT 
    p.id,
    p.name,
    p.description,
    p.price,
    p.stock_quantity,
    c.name AS category_name,
    pi.image_url AS primary_image,
    COALESCE(AVG(r.rating), 0) AS avg_rating,
    COUNT(r.id) AS review_count
FROM products p
JOIN categories c ON p.category_id = c.id
LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
LEFT JOIN reviews r ON p.id = r.product_id AND r.is_approved = true
WHERE p.status = 'active'
GROUP BY p.id, p.name, p.description, p.price, p.stock_quantity, 
         c.name, pi.image_url;

-- Query catalog
SELECT * FROM product_catalog
WHERE category_name = 'Electronics'
ORDER BY avg_rating DESC;
```

### Example 3: Sales Report View

```sql
-- Monthly sales summary
CREATE VIEW monthly_sales AS
SELECT 
    DATE_TRUNC('month', created_at) AS month,
    COUNT(*) AS order_count,
    COUNT(DISTINCT user_id) AS unique_customers,
    SUM(total) AS revenue,
    AVG(total) AS avg_order_value
FROM orders
WHERE status = 'completed'
GROUP BY DATE_TRUNC('month', created_at);

-- Query sales report
SELECT * FROM monthly_sales
ORDER BY month DESC
LIMIT 12;
```

## Security with Views

### Restricting Column Access

```sql
-- View with limited columns (hide sensitive data)
CREATE VIEW public_user_info AS
SELECT 
    id,
    name,
    email,
    created_at
FROM users;
-- Doesn't include password_hash, phone, etc.

-- Grant access to view, not table
GRANT SELECT ON public_user_info TO public_user_role;
REVOKE SELECT ON users FROM public_user_role;
```

### Row-Level Security

```sql
-- View that filters rows based on user
CREATE VIEW my_orders AS
SELECT *
FROM orders
WHERE user_id = CURRENT_USER_ID();  -- Function returns current user

-- Users can only see their own orders
```

## Updatable Views

Some views can be updated (INSERT, UPDATE, DELETE).

### Simple Updatable View

```sql
-- Simple view (updatable)
CREATE VIEW active_users AS
SELECT id, name, email
FROM users
WHERE is_active = true;

-- Can update through view
UPDATE active_users
SET name = 'New Name'
WHERE id = 1;
-- Updates underlying users table
```

### Restrictions

Views are updatable only if:
- Based on single table
- No aggregate functions
- No DISTINCT, GROUP BY, HAVING
- No UNION, INTERSECT, EXCEPT

## View Best Practices

### 1. Document Views

```sql
-- Add comment to view
COMMENT ON VIEW user_dashboard IS 
'Comprehensive user statistics including order counts and spending';
```

### 2. Use Views for Complex Queries

```sql
-- Instead of repeating complex query
SELECT 
    u.id,
    u.name,
    COUNT(o.id) AS order_count,
    SUM(o.total) AS total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;

-- Create view once
CREATE VIEW user_stats AS ...;

-- Use view everywhere
SELECT * FROM user_stats;
```

### 3. Index Underlying Tables

```sql
-- Views use indexes from underlying tables
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- View query uses index
SELECT * FROM user_orders
WHERE user_id = 1 AND status = 'completed';
```

## Common Patterns

### Pattern 1: Aggregation View

```sql
-- Pre-aggregated data
CREATE VIEW daily_sales AS
SELECT 
    DATE(created_at) AS sale_date,
    COUNT(*) AS order_count,
    SUM(total) AS revenue
FROM orders
WHERE status = 'completed'
GROUP BY DATE(created_at);

-- Fast queries
SELECT * FROM daily_sales
WHERE sale_date >= CURRENT_DATE - INTERVAL '30 days';
```

### Pattern 2: Denormalized View

```sql
-- Denormalized view for performance
CREATE VIEW order_details AS
SELECT 
    o.id AS order_id,
    o.total,
    o.created_at,
    u.name AS user_name,
    u.email AS user_email,
    p.name AS product_name,
    oi.quantity,
    oi.price
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id;

-- Single query instead of multiple joins
SELECT * FROM order_details
WHERE order_id = 1;
```

### Pattern 3: Filtered View

```sql
-- View with common filters
CREATE VIEW recent_orders AS
SELECT *
FROM orders
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND status = 'completed';

-- Simplified queries
SELECT * FROM recent_orders
WHERE total > 100;
```

## Performance Considerations

### 1. Views Don't Store Data

```sql
-- View executes query each time
SELECT * FROM complex_view;
-- Underlying query runs every time (may be slow)

-- Solution: Use materialized view for expensive queries
CREATE MATERIALIZED VIEW complex_view_materialized AS ...;
```

### 2. Index Underlying Tables

```sql
-- Indexes on underlying tables help view performance
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);

-- View query uses indexes
SELECT * FROM user_orders
WHERE user_id = 1;
```

### 3. Materialized Views for Expensive Queries

```sql
-- Expensive aggregation
CREATE MATERIALIZED VIEW product_stats AS
SELECT 
    product_id,
    COUNT(*) AS sales_count,
    SUM(quantity * price) AS revenue
FROM order_items
GROUP BY product_id;

-- Fast queries
SELECT * FROM product_stats
ORDER BY revenue DESC;
```

## Common Mistakes

### ❌ Overusing Views

```sql
-- ❌ Bad: View for simple query
CREATE VIEW all_users AS
SELECT * FROM users;

-- ✅ Better: Query table directly
SELECT * FROM users;
```

### ❌ Nested Views

```sql
-- ❌ Bad: View based on view (can be slow)
CREATE VIEW view1 AS SELECT * FROM table1;
CREATE VIEW view2 AS SELECT * FROM view1;

-- ✅ Better: Direct view or materialized view
```

## Summary

**Views Essentials:**

1. **Purpose**: Virtual tables based on SQL queries
2. **Benefits**: Simplify queries, security, abstraction
3. **Types**: Regular views (dynamic) and materialized views (stored)
4. **Updatable**: Simple views can be updated
5. **Performance**: Index underlying tables, use materialized views for expensive queries

**Key Takeaway:**
Views simplify complex queries and provide security by controlling data access. Use regular views for dynamic data and materialized views for expensive queries that don't need real-time updates. Always index underlying tables for performance.

**When to Use:**
- **Regular Views**: Simplify complex queries, security, abstraction
- **Materialized Views**: Expensive queries, performance-critical, data doesn't need to be real-time

**Common Use Cases:**
- Dashboard queries
- Report generation
- Security (restrict column/row access)
- API endpoints (simplify queries)

**Next Steps:**
- Learn [Stored Procedures](stored_procedures.md) for reusable logic
- Study [Triggers](triggers.md) for automated actions
- Master [Performance Optimization](../10_performance_optimization/) for view tuning

