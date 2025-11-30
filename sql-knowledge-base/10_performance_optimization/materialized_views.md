# Materialized Views: Pre-Computed Query Results

Materialized views store the results of a query as a physical table. They're useful for expensive aggregations and complex queries that don't need real-time data.

## What is a Materialized View?

**Materialized view** is a database object that contains the results of a query, stored as a physical table. Unlike regular views, materialized views store data.

### Regular View vs Materialized View

```sql
-- Regular View: Query executed each time
CREATE VIEW user_order_stats AS
SELECT 
    u.id,
    u.name,
    COUNT(o.id) AS order_count,
    SUM(o.total) AS total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;

-- Each SELECT executes the query
SELECT * FROM user_order_stats;  -- Runs query

-- Materialized View: Results stored
CREATE MATERIALIZED VIEW user_order_stats_mv AS
SELECT 
    u.id,
    u.name,
    COUNT(o.id) AS order_count,
    SUM(o.total) AS total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;

-- SELECT reads from stored data (fast!)
SELECT * FROM user_order_stats_mv;  -- Reads stored data
```

## Creating Materialized Views

### Basic Syntax

```sql
-- Create materialized view
CREATE MATERIALIZED VIEW view_name AS
SELECT ... FROM ... WHERE ...;

-- Query materialized view
SELECT * FROM view_name;
```

### Example: Sales Summary

```sql
-- Materialized view for sales summary
CREATE MATERIALIZED VIEW sales_summary AS
SELECT 
    DATE_TRUNC('month', created_at) AS month,
    region,
    SUM(amount) AS total_sales,
    COUNT(*) AS order_count,
    AVG(amount) AS avg_order
FROM orders
GROUP BY DATE_TRUNC('month', created_at), region;

-- Fast queries
SELECT * FROM sales_summary 
WHERE month = '2023-01-01' AND region = 'North';
```

## Refreshing Materialized Views

### Manual Refresh

```sql
-- Refresh materialized view
REFRESH MATERIALIZED VIEW sales_summary;

-- Rebuilds the view with current data
-- Can be slow for large views
```

### Concurrent Refresh

```sql
-- Refresh without locking (PostgreSQL)
REFRESH MATERIALIZED VIEW CONCURRENTLY sales_summary;

-- Requires unique index on materialized view
CREATE UNIQUE INDEX ON sales_summary (month, region);
```

## Real-World Examples

### Example 1: User Statistics

```sql
-- Materialized view for user statistics
CREATE MATERIALIZED VIEW user_stats AS
SELECT 
    u.id AS user_id,
    u.name AS user_name,
    COUNT(o.id) AS order_count,
    SUM(o.total) AS total_spent,
    AVG(o.total) AS avg_order,
    MAX(o.created_at) AS last_order_date
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;

-- Fast user statistics queries
SELECT * FROM user_stats WHERE user_id = 1;
SELECT * FROM user_stats ORDER BY total_spent DESC LIMIT 10;
```

### Example 2: Product Performance

```sql
-- Materialized view for product performance
CREATE MATERIALIZED VIEW product_performance AS
SELECT 
    p.id AS product_id,
    p.name AS product_name,
    COUNT(oi.id) AS times_ordered,
    SUM(oi.quantity) AS total_quantity,
    SUM(oi.price * oi.quantity) AS total_revenue,
    AVG(oi.price) AS avg_price
FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.id, p.name;

-- Fast product analytics
SELECT * FROM product_performance 
ORDER BY total_revenue DESC 
LIMIT 10;
```

### Example 3: Daily Aggregations

```sql
-- Materialized view for daily metrics
CREATE MATERIALIZED VIEW daily_metrics AS
SELECT 
    DATE(created_at) AS date,
    COUNT(*) AS total_orders,
    SUM(total) AS total_revenue,
    COUNT(DISTINCT user_id) AS unique_customers,
    AVG(total) AS avg_order_value
FROM orders
GROUP BY DATE(created_at);

-- Fast daily reports
SELECT * FROM daily_metrics 
WHERE date BETWEEN '2023-01-01' AND '2023-01-31';
```

## Indexes on Materialized Views

### Add Indexes for Performance

```sql
-- Create materialized view
CREATE MATERIALIZED VIEW user_stats AS
SELECT 
    u.id AS user_id,
    COUNT(o.id) AS order_count,
    SUM(o.total) AS total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id;

-- Add index for fast lookups
CREATE INDEX idx_user_stats_user_id ON user_stats(user_id);

-- Fast queries
SELECT * FROM user_stats WHERE user_id = 1;
```

## Automated Refresh

### Using Cron/Job Scheduler

```sql
-- Refresh materialized views periodically
-- Example: Refresh every hour

-- Cron job (Linux)
-- 0 * * * * psql -d mydb -c "REFRESH MATERIALIZED VIEW sales_summary;"
```

### Using Database Triggers

```sql
-- Refresh on data change (PostgreSQL)
CREATE OR REPLACE FUNCTION refresh_sales_summary()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW sales_summary;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_sales_summary_trigger
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_sales_summary();
```

## When to Use Materialized Views

### ✅ Good Use Cases

```sql
-- ✅ Expensive aggregations
-- Complex GROUP BY queries
-- JOINs across multiple tables
-- Calculations that don't need real-time data
```

### ❌ Not Suitable For

```sql
-- ❌ Real-time data requirements
-- ❌ Frequently changing data
-- ❌ Simple queries (overhead not worth it)
```

## Best Practices

1. **Refresh Strategy**: Manual, scheduled, or trigger-based
2. **Add Indexes**: Index materialized views for fast queries
3. **Monitor Size**: Materialized views can be large
4. **Refresh Frequency**: Balance freshness vs performance
5. **Concurrent Refresh**: Use CONCURRENTLY to avoid locks

## Common Mistakes

### ❌ Over-Using Materialized Views

```sql
-- ❌ Bad: Materialized view for simple query
CREATE MATERIALIZED VIEW simple_users AS
SELECT * FROM users;
-- Overhead not worth it for simple queries

-- ✅ Good: Materialized view for expensive aggregation
CREATE MATERIALIZED VIEW user_stats AS
SELECT 
    u.id,
    COUNT(o.id) AS order_count,
    SUM(o.total) AS total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id;
```

### ❌ Not Refreshing

```sql
-- ❌ Bad: Never refresh
CREATE MATERIALIZED VIEW sales_summary AS ...;
-- Data becomes stale

-- ✅ Good: Refresh periodically
REFRESH MATERIALIZED VIEW sales_summary;  -- Daily/hourly
```

## Summary

**Materialized Views:**

1. **Purpose**: Store pre-computed query results
2. **Benefits**: Fast queries on expensive aggregations
3. **Refresh**: Manual, scheduled, or trigger-based
4. **Indexes**: Add indexes for fast lookups
5. **Use Cases**: Analytics, reporting, dashboards

**Key Takeaway:**
Materialized views store the results of expensive queries as physical tables, providing fast access to pre-computed data. They're ideal for complex aggregations, analytics, and reporting where real-time data isn't required. Refresh materialized views periodically to keep data current. Add indexes for fast lookups.

**When to Use:**
- Expensive aggregations
- Complex JOINs
- Analytics and reporting
- Data doesn't need to be real-time

**Next Steps:**
- Learn [Views](../15_db_infrastructure/views.md) for regular views
- Study [Query Optimization Tips](query_optimization_tips.md) for techniques
- Master [Performance Optimization](../10_performance_optimization/) for tuning

