# Leaderboard: Ranking Functions for Competitive Features

Leaderboards rank users, products, or entities by scores, points, or metrics. SQL ranking functions make implementing leaderboards efficient and straightforward.

## Basic Leaderboard

### Simple Ranking

```sql
-- Top users by total spent
SELECT 
    u.id,
    u.name,
    SUM(o.total) AS total_spent,
    RANK() OVER (ORDER BY SUM(o.total) DESC) AS rank
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.status = 'completed'
GROUP BY u.id, u.name
ORDER BY total_spent DESC
LIMIT 10;
```

## Ranking Functions

### RANK()

```sql
-- Rank with gaps for ties
SELECT 
    user_id,
    total_spent,
    RANK() OVER (ORDER BY total_spent DESC) AS rank
FROM (
    SELECT 
        user_id,
        SUM(total) AS total_spent
    FROM orders
    WHERE status = 'completed'
    GROUP BY user_id
) user_totals
ORDER BY rank;
```

**Result:**
```
┌─────────┬─────────────┬──────┐
│ user_id │ total_spent │ rank │
├─────────┼─────────────┼──────┤
│ 1       │ 1000.00     │ 1    │
│ 2       │ 800.00      │ 2    │
│ 3       │ 800.00      │ 2    │ ← Tie: both rank 2
│ 4       │ 500.00      │ 4    │ ← Rank 3 skipped
└─────────┴─────────────┴──────┘
```

### DENSE_RANK()

```sql
-- Rank without gaps
SELECT 
    user_id,
    total_spent,
    DENSE_RANK() OVER (ORDER BY total_spent DESC) AS rank
FROM (
    SELECT user_id, SUM(total) AS total_spent
    FROM orders
    WHERE status = 'completed'
    GROUP BY user_id
) user_totals
ORDER BY rank;
```

**Result:**
```
┌─────────┬─────────────┬──────┐
│ user_id │ total_spent │ rank │
├─────────┼─────────────┼──────┤
│ 1       │ 1000.00     │ 1    │
│ 2       │ 800.00      │ 2    │
│ 3       │ 800.00      │ 2    │ ← Tie: both rank 2
│ 4       │ 500.00      │ 3    │ ← No gap (DENSE_RANK)
└─────────┴─────────────┴──────┘
```

### ROW_NUMBER()

```sql
-- Unique sequential numbers
SELECT 
    user_id,
    total_spent,
    ROW_NUMBER() OVER (ORDER BY total_spent DESC) AS rank
FROM (
    SELECT user_id, SUM(total) AS total_spent
    FROM orders
    WHERE status = 'completed'
    GROUP BY user_id
) user_totals
ORDER BY rank;
```

**Result:**
```
┌─────────┬─────────────┬──────┐
│ user_id │ total_spent │ rank │
├─────────┼─────────────┼──────┤
│ 1       │ 1000.00     │ 1    │
│ 2       │ 800.00      │ 2    │
│ 3       │ 800.00      │ 3    │ ← Different ranks even if tied
│ 4       │ 500.00      │ 4    │
└─────────┴─────────────┴──────┘
```

## Real-World Examples

### Example 1: Global Leaderboard

```sql
-- Top 100 users globally
SELECT 
    u.id,
    u.name,
    u.email,
    SUM(o.total) AS total_spent,
    COUNT(o.id) AS order_count,
    RANK() OVER (ORDER BY SUM(o.total) DESC) AS global_rank
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.status = 'completed'
GROUP BY u.id, u.name, u.email
ORDER BY global_rank
LIMIT 100;
```

### Example 2: Category Leaderboard

```sql
-- Top products by category
SELECT 
    p.id,
    p.name,
    c.name AS category_name,
    SUM(oi.quantity * oi.price) AS revenue,
    RANK() OVER (
        PARTITION BY c.id 
        ORDER BY SUM(oi.quantity * oi.price) DESC
    ) AS category_rank
FROM products p
JOIN categories c ON p.category_id = c.id
JOIN order_items oi ON p.id = oi.product_id
JOIN orders o ON oi.order_id = o.id
WHERE o.status = 'completed'
GROUP BY p.id, p.name, c.id, c.name
ORDER BY c.name, category_rank;
```

### Example 3: Time-Based Leaderboard

```sql
-- Monthly leaderboard
SELECT 
    u.id,
    u.name,
    SUM(o.total) AS monthly_spent,
    RANK() OVER (ORDER BY SUM(o.total) DESC) AS monthly_rank
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.status = 'completed'
  AND DATE_TRUNC('month', o.created_at) = DATE_TRUNC('month', CURRENT_DATE)
GROUP BY u.id, u.name
ORDER BY monthly_rank
LIMIT 10;
```

### Example 4: User's Rank

```sql
-- Get user's rank and nearby users
WITH user_ranks AS (
    SELECT 
        u.id,
        u.name,
        SUM(o.total) AS total_spent,
        RANK() OVER (ORDER BY SUM(o.total) DESC) AS rank
    FROM users u
    JOIN orders o ON u.id = o.user_id
    WHERE o.status = 'completed'
    GROUP BY u.id, u.name
)
SELECT *
FROM user_ranks
WHERE rank BETWEEN (
    SELECT rank - 5 FROM user_ranks WHERE id = :user_id
) AND (
    SELECT rank + 5 FROM user_ranks WHERE id = :user_id
)
ORDER BY rank;
```

### Example 5: Percentile Ranking

```sql
-- Users by percentile
SELECT 
    u.id,
    u.name,
    SUM(o.total) AS total_spent,
    PERCENT_RANK() OVER (ORDER BY SUM(o.total) DESC) AS percentile_rank,
    CASE
        WHEN PERCENT_RANK() OVER (ORDER BY SUM(o.total) DESC) <= 0.1 THEN 'Top 10%'
        WHEN PERCENT_RANK() OVER (ORDER BY SUM(o.total) DESC) <= 0.25 THEN 'Top 25%'
        WHEN PERCENT_RANK() OVER (ORDER BY SUM(o.total) DESC) <= 0.5 THEN 'Top 50%'
        ELSE 'Bottom 50%'
    END AS percentile_tier
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.status = 'completed'
GROUP BY u.id, u.name
ORDER BY total_spent DESC;
```

## Performance Optimization

### Index for Ranking

```sql
-- Index for ranking queries
CREATE INDEX idx_orders_user_total ON orders(user_id, total) 
WHERE status = 'completed';

-- Fast leaderboard query
SELECT 
    user_id,
    SUM(total) AS total_spent,
    RANK() OVER (ORDER BY SUM(total) DESC) AS rank
FROM orders
WHERE status = 'completed'
GROUP BY user_id
ORDER BY rank
LIMIT 10;
```

### Materialized View for Leaderboards

```sql
-- Materialized view for leaderboard
CREATE MATERIALIZED VIEW user_leaderboard AS
SELECT 
    u.id,
    u.name,
    SUM(o.total) AS total_spent,
    COUNT(o.id) AS order_count,
    RANK() OVER (ORDER BY SUM(o.total) DESC) AS rank
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.status = 'completed'
GROUP BY u.id, u.name;

-- Refresh periodically
REFRESH MATERIALIZED VIEW user_leaderboard;

-- Fast queries
SELECT * FROM user_leaderboard
ORDER BY rank
LIMIT 100;
```

## Common Patterns

### Pattern 1: Top N

```sql
-- Top 10 users
SELECT 
    user_id,
    total_spent,
    RANK() OVER (ORDER BY total_spent DESC) AS rank
FROM (
    SELECT user_id, SUM(total) AS total_spent
    FROM orders
    WHERE status = 'completed'
    GROUP BY user_id
) user_totals
ORDER BY rank
LIMIT 10;
```

### Pattern 2: User's Position

```sql
-- Get user's rank
SELECT 
    rank
FROM (
    SELECT 
        user_id,
        RANK() OVER (ORDER BY SUM(total) DESC) AS rank
    FROM orders
    WHERE status = 'completed'
    GROUP BY user_id
) user_ranks
WHERE user_id = :user_id;
```

### Pattern 3: Rank Changes

```sql
-- Compare current rank with previous rank
WITH current_ranks AS (
    SELECT 
        user_id,
        RANK() OVER (ORDER BY SUM(total) DESC) AS current_rank
    FROM orders
    WHERE status = 'completed'
      AND created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY user_id
),
previous_ranks AS (
    SELECT 
        user_id,
        RANK() OVER (ORDER BY SUM(total) DESC) AS previous_rank
    FROM orders
    WHERE status = 'completed'
      AND created_at >= CURRENT_DATE - INTERVAL '60 days'
      AND created_at < CURRENT_DATE - INTERVAL '30 days'
    GROUP BY user_id
)
SELECT 
    c.user_id,
    c.current_rank,
    p.previous_rank,
    p.previous_rank - c.current_rank AS rank_change
FROM current_ranks c
LEFT JOIN previous_ranks p ON c.user_id = p.user_id
ORDER BY c.current_rank;
```

## Best Practices

1. **Use Appropriate Function**: RANK, DENSE_RANK, or ROW_NUMBER
2. **Index Ranking Columns**: For performance
3. **Materialized Views**: For frequently accessed leaderboards
4. **Limit Results**: Use LIMIT for top N
5. **Cache Results**: Cache leaderboard data

## Summary

**Leaderboard Implementation:**

1. **Ranking Functions**: RANK(), DENSE_RANK(), ROW_NUMBER()
2. **Top N Queries**: Use LIMIT with ranking
3. **Partitioned Rankings**: RANK() OVER (PARTITION BY ...)
4. **Performance**: Index ranking columns, use materialized views
5. **Caching**: Cache leaderboard results

**Key Takeaway:**
Leaderboards rank entities by metrics using ranking functions. Use RANK() for standard rankings, DENSE_RANK() to avoid gaps, or ROW_NUMBER() for unique ranks. Optimize with indexes and materialized views. Cache results for frequently accessed leaderboards.

**Common Use Cases:**
- Top users by spending
- Top products by sales
- Category rankings
- Time-based leaderboards

**Next Steps:**
- Learn [Window Functions](../05_aggregations_grouping/window_functions.md) for advanced rankings
- Study [Performance Optimization](../10_performance_optimization/) for tuning
- Master [Materialized Views](../15_db_infrastructure/views.md) for caching

