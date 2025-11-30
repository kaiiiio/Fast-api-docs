# Monitoring: Tracking Database Health and Performance

Database monitoring tracks database health, performance, and resource usage. It's essential for maintaining optimal database performance and preventing issues.

## What is Database Monitoring?

**Database monitoring** involves tracking database metrics, performance, and health to identify issues, optimize performance, and ensure availability.

### Key Metrics

```
- Query performance
- Connection counts
- Resource usage (CPU, memory, disk)
- Replication lag
- Error rates
```

## PostgreSQL Monitoring

### pg_stat_statements

```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View slow queries
SELECT 
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### pg_stat_activity

```sql
-- View active connections
SELECT 
    pid,
    usename,
    application_name,
    state,
    query,
    query_start,
    state_change
FROM pg_stat_activity
WHERE state = 'active';
```

### Connection Monitoring

```sql
-- Check connection counts
SELECT 
    count(*) AS total_connections,
    count(*) FILTER (WHERE state = 'active') AS active_connections,
    count(*) FILTER (WHERE state = 'idle') AS idle_connections
FROM pg_stat_activity
WHERE datname = 'mydb';
```

## MySQL Monitoring

### Performance Schema

```sql
-- View slow queries
SELECT 
    sql_text,
    exec_count,
    avg_timer_wait / 1000000000000 AS avg_seconds
FROM performance_schema.events_statements_summary_by_digest
ORDER BY avg_timer_wait DESC
LIMIT 10;
```

### Process List

```sql
-- View active processes
SHOW PROCESSLIST;

-- Or query
SELECT 
    id,
    user,
    host,
    db,
    command,
    time,
    state,
    info
FROM information_schema.processlist;
```

## Key Metrics to Monitor

### Query Performance

```sql
-- Slow queries
SELECT 
    query,
    calls,
    mean_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 1000  -- > 1 second
ORDER BY mean_exec_time DESC;
```

### Connection Pool

```sql
-- Connection pool usage
SELECT 
    count(*) AS total_connections,
    max_conn AS max_connections,
    (count(*)::float / max_conn * 100) AS usage_percent
FROM pg_stat_activity, 
     (SELECT setting::int AS max_conn FROM pg_settings WHERE name = 'max_connections') AS max_conn
GROUP BY max_conn;
```

### Replication Lag

```sql
-- PostgreSQL replication lag
SELECT 
    client_addr,
    state,
    pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn) AS lag_bytes,
    EXTRACT(EPOCH FROM (now() - sent_time)) AS lag_seconds
FROM pg_stat_replication;
```

### Disk Usage

```sql
-- PostgreSQL table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Monitoring Tools

### Prometheus + Grafana

```yaml
# Prometheus configuration
scrape_configs:
  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:9187']

# PostgreSQL exporter metrics
# - postgresql_up
# - postgresql_connections
# - postgresql_query_duration_seconds
```

### pgAdmin

```sql
-- Built-in monitoring dashboard
-- Shows:
-- - Active connections
-- - Query performance
-- - Database size
-- - Replication status
```

### Custom Monitoring

```python
# Python monitoring script
import psycopg2
import time

def monitor_database():
    conn = psycopg2.connect("postgresql://...")
    cursor = conn.cursor()
    
    # Check connections
    cursor.execute("SELECT count(*) FROM pg_stat_activity")
    connections = cursor.fetchone()[0]
    
    # Check replication lag
    cursor.execute("""
        SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn)
        FROM pg_stat_replication
    """)
    lag = cursor.fetchone()[0]
    
    # Alert if issues
    if connections > 100:
        send_alert("High connection count")
    
    if lag > 10485760:  # 10MB
        send_alert("High replication lag")
```

## Alerting

### Setting Up Alerts

```python
# Alert on high connection count
def check_connections():
    count = get_connection_count()
    if count > max_connections * 0.8:
        send_alert(f"Connection count high: {count}")

# Alert on slow queries
def check_slow_queries():
    slow_queries = get_slow_queries(threshold=1000)
    if slow_queries:
        send_alert(f"Slow queries detected: {len(slow_queries)}")

# Alert on replication lag
def check_replication_lag():
    lag = get_replication_lag()
    if lag > 10485760:  # 10MB
        send_alert(f"High replication lag: {lag} bytes")
```

## Best Practices

1. **Monitor Key Metrics**: Query performance, connections, replication
2. **Set Up Alerts**: Alert on critical issues
3. **Track Trends**: Monitor metrics over time
4. **Regular Reviews**: Review monitoring data regularly
5. **Document**: Document monitoring setup and procedures

## Common Monitoring Patterns

### Pattern 1: Health Checks

```sql
-- Simple health check
SELECT 1;
-- If succeeds, database is up
```

### Pattern 2: Performance Monitoring

```sql
-- Track query performance
SELECT * FROM pg_stat_statements
ORDER BY mean_exec_time DESC;
```

### Pattern 3: Resource Monitoring

```sql
-- Monitor resource usage
SELECT 
    count(*) AS connections,
    (SELECT setting FROM pg_settings WHERE name = 'max_connections')::int AS max_conn
FROM pg_stat_activity;
```

## Summary

**Monitoring:**

1. **Purpose**: Track database health and performance
2. **Metrics**: Query performance, connections, replication, resources
3. **Tools**: pg_stat_statements, Performance Schema, Prometheus
4. **Alerting**: Set up alerts for critical issues
5. **Best Practice**: Monitor key metrics, track trends, regular reviews

**Key Takeaway:**
Database monitoring tracks health, performance, and resource usage. Monitor query performance, connection counts, replication lag, and resource usage. Use tools like pg_stat_statements (PostgreSQL) or Performance Schema (MySQL). Set up alerts for critical issues. Regularly review monitoring data to identify trends and optimize performance.

**Monitoring Strategy:**
- Track key metrics (queries, connections, lag)
- Set up alerts for critical issues
- Monitor trends over time
- Regular performance reviews
- Document monitoring setup

**Next Steps:**
- Learn [Performance Optimization](../10_performance_optimization/) for tuning
- Study [High Availability](high_availability.md) for HA monitoring
- Master [Scaling Strategies](scaling_strategies.md) for capacity planning

