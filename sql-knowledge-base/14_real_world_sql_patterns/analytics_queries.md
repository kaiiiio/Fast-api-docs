# Analytics Queries: Business Intelligence Patterns

Analytics queries aggregate and analyze data for business intelligence, reporting, and decision-making. These patterns are essential for dashboards and reports.

## Common Analytics Patterns

### Pattern 1: Time-Series Analysis

```sql
-- Daily revenue
SELECT 
    DATE(created_at) AS sale_date,
    COUNT(*) AS order_count,
    SUM(total) AS revenue,
    AVG(total) AS avg_order_value,
    COUNT(DISTINCT user_id) AS unique_customers
FROM orders
WHERE status = 'completed'
  AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY sale_date DESC;
```

### Pattern 2: Cohort Analysis

```sql
-- User cohort: First purchase month
WITH user_cohorts AS (
    SELECT 
        user_id,
        DATE_TRUNC('month', MIN(created_at)) AS cohort_month
    FROM orders
    GROUP BY user_id
),
monthly_orders AS (
    SELECT 
        uc.cohort_month,
        DATE_TRUNC('month', o.created_at) AS order_month,
        COUNT(DISTINCT o.user_id) AS users,
        SUM(o.total) AS revenue
    FROM user_cohorts uc
    JOIN orders o ON uc.user_id = o.user_id
    WHERE o.status = 'completed'
    GROUP BY uc.cohort_month, DATE_TRUNC('month', o.created_at)
)
SELECT 
    cohort_month,
    order_month,
    EXTRACT(MONTH FROM AGE(order_month, cohort_month)) AS month_number,
    users,
    revenue
FROM monthly_orders
ORDER BY cohort_month, month_number;
```

### Pattern 3: Funnel Analysis

```sql
-- Conversion funnel
SELECT 
    'Visited' AS stage,
    COUNT(DISTINCT session_id) AS count
FROM page_views
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'

UNION ALL

SELECT 
    'Added to Cart' AS stage,
    COUNT(DISTINCT session_id) AS count
FROM cart_events
WHERE event_type = 'add_to_cart'
  AND created_at >= CURRENT_DATE - INTERVAL '7 days'

UNION ALL

SELECT 
    'Checked Out' AS stage,
    COUNT(DISTINCT user_id) AS count
FROM orders
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'

UNION ALL

SELECT 
    'Completed' AS stage,
    COUNT(DISTINCT user_id) AS count
FROM orders
WHERE status = 'completed'
  AND created_at >= CURRENT_DATE - INTERVAL '7 days';
```

### Pattern 4: Customer Segmentation

```sql
-- Segment customers by spending
SELECT 
    CASE
        WHEN total_spent >= 1000 THEN 'VIP'
        WHEN total_spent >= 500 THEN 'Premium'
        WHEN total_spent >= 100 THEN 'Regular'
        ELSE 'New'
    END AS customer_segment,
    COUNT(*) AS customer_count,
    AVG(total_spent) AS avg_spent,
    SUM(total_spent) AS total_revenue
FROM (
    SELECT 
        user_id,
        SUM(total) AS total_spent
    FROM orders
    WHERE status = 'completed'
    GROUP BY user_id
) customer_totals
GROUP BY customer_segment
ORDER BY avg_spent DESC;
```

### Pattern 5: Product Performance

```sql
-- Product performance metrics
SELECT 
    p.id,
    p.name,
    p.category_id,
    COUNT(oi.id) AS units_sold,
    SUM(oi.quantity * oi.price) AS revenue,
    AVG(oi.price) AS avg_selling_price,
    COUNT(DISTINCT o.user_id) AS unique_customers,
    SUM(oi.quantity * oi.price) / COUNT(DISTINCT o.user_id) AS revenue_per_customer
FROM products p
JOIN order_items oi ON p.id = oi.product_id
JOIN orders o ON oi.order_id = o.id
WHERE o.status = 'completed'
  AND o.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY p.id, p.name, p.category_id
ORDER BY revenue DESC
LIMIT 20;
```

### Pattern 6: Retention Analysis

```sql
-- Monthly retention
WITH user_first_month AS (
    SELECT 
        user_id,
        DATE_TRUNC('month', MIN(created_at)) AS first_month
    FROM orders
    GROUP BY user_id
),
monthly_active AS (
    SELECT 
        DATE_TRUNC('month', o.created_at) AS month,
        COUNT(DISTINCT o.user_id) AS active_users
    FROM orders o
    JOIN user_first_month ufm ON o.user_id = ufm.user_id
    WHERE o.status = 'completed'
    GROUP BY DATE_TRUNC('month', o.created_at)
)
SELECT 
    month,
    active_users,
    LAG(active_users) OVER (ORDER BY month) AS prev_month_users,
    ROUND(
        (active_users - LAG(active_users) OVER (ORDER BY month)) * 100.0 
        / LAG(active_users) OVER (ORDER BY month), 
        2
    ) AS retention_rate_percent
FROM monthly_active
ORDER BY month DESC;
```

### Pattern 7: Revenue Trends

```sql
-- Month-over-month revenue growth
WITH monthly_revenue AS (
    SELECT 
        DATE_TRUNC('month', created_at) AS month,
        SUM(total) AS revenue,
        COUNT(*) AS order_count,
        COUNT(DISTINCT user_id) AS unique_customers
    FROM orders
    WHERE status = 'completed'
    GROUP BY DATE_TRUNC('month', created_at)
)
SELECT 
    month,
    revenue,
    order_count,
    unique_customers,
    LAG(revenue) OVER (ORDER BY month) AS prev_month_revenue,
    revenue - LAG(revenue) OVER (ORDER BY month) AS revenue_growth,
    ROUND(
        (revenue - LAG(revenue) OVER (ORDER BY month)) * 100.0 
        / LAG(revenue) OVER (ORDER BY month), 
        2
    ) AS growth_percent
FROM monthly_revenue
ORDER BY month DESC;
```

### Pattern 8: Top Performers

```sql
-- Top 10 customers by revenue
SELECT 
    u.id,
    u.name,
    u.email,
    COUNT(o.id) AS order_count,
    SUM(o.total) AS total_spent,
    AVG(o.total) AS avg_order_value,
    MAX(o.created_at) AS last_order_date
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.status = 'completed'
GROUP BY u.id, u.name, u.email
ORDER BY total_spent DESC
LIMIT 10;
```

### Pattern 9: Geographic Analysis

```sql
-- Revenue by region
SELECT 
    u.country,
    COUNT(DISTINCT u.id) AS customer_count,
    COUNT(o.id) AS order_count,
    SUM(o.total) AS revenue,
    AVG(o.total) AS avg_order_value
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.status = 'completed'
  AND o.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY u.country
ORDER BY revenue DESC;
```

### Pattern 10: A/B Test Analysis

```sql
-- Compare two variants
SELECT 
    variant,
    COUNT(DISTINCT user_id) AS users,
    COUNT(*) AS conversions,
    ROUND(COUNT(*) * 100.0 / COUNT(DISTINCT user_id), 2) AS conversion_rate,
    SUM(revenue) AS total_revenue,
    AVG(revenue) AS avg_revenue_per_user
FROM (
    SELECT 
        user_id,
        variant,
        CASE WHEN order_id IS NOT NULL THEN 1 ELSE 0 END AS conversion,
        COALESCE(total, 0) AS revenue
    FROM experiments e
    LEFT JOIN orders o ON e.user_id = o.user_id
) experiment_results
GROUP BY variant;
```

## Performance Optimization

### Materialized Views for Analytics

```sql
-- Materialized view for daily analytics
CREATE MATERIALIZED VIEW daily_analytics AS
SELECT 
    DATE(created_at) AS sale_date,
    COUNT(*) AS order_count,
    SUM(total) AS revenue,
    COUNT(DISTINCT user_id) AS unique_customers
FROM orders
WHERE status = 'completed'
GROUP BY DATE(created_at);

-- Refresh periodically
REFRESH MATERIALIZED VIEW daily_analytics;

-- Fast queries
SELECT * FROM daily_analytics
WHERE sale_date >= CURRENT_DATE - INTERVAL '30 days';
```

### Indexes for Analytics

```sql
-- Index for time-series queries
CREATE INDEX idx_orders_created_status ON orders(created_at, status) 
WHERE status = 'completed';

-- Index for aggregations
CREATE INDEX idx_orders_user_status_total ON orders(user_id, status, total);
```

## Best Practices

1. **Use Materialized Views**: For frequently run analytics
2. **Index Appropriately**: Index GROUP BY and WHERE columns
3. **Filter Early**: Use WHERE before GROUP BY
4. **Limit Results**: Use LIMIT for top N queries
5. **Cache Results**: Cache expensive analytics queries

## Summary

**Analytics Queries:**

1. **Time-Series**: Daily/monthly aggregations
2. **Cohort Analysis**: User behavior over time
3. **Funnel Analysis**: Conversion tracking
4. **Segmentation**: Customer categorization
5. **Performance**: Product/customer metrics
6. **Retention**: User retention analysis
7. **Trends**: Growth and comparison
8. **Top Performers**: Ranking queries

**Key Takeaway:**
Analytics queries aggregate data for business intelligence. Use time-series analysis, cohort analysis, funnels, and segmentation patterns. Optimize with materialized views and proper indexes. Cache results for frequently accessed analytics.

**Common Patterns:**
- Time-series: `GROUP BY DATE(created_at)`
- Cohorts: First purchase month analysis
- Funnels: Stage conversion tracking
- Segmentation: Customer categorization

**Next Steps:**
- Learn [Window Functions](../05_aggregations_grouping/window_functions.md) for advanced analytics
- Study [Materialized Views](../15_db_infrastructure/views.md) for performance
- Master [Performance Optimization](../10_performance_optimization/) for tuning

