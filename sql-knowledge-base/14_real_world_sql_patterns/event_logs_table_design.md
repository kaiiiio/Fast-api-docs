# Event Logs Table Design: Storing Application Events

Event logs track application events for auditing, debugging, and analytics. This guide covers designing efficient event log tables.

## What are Event Logs?

**Event logs** record application events (user actions, system events, errors) for later analysis. They're essential for debugging, auditing, and understanding system behavior.

### Common Events

```
- User actions (login, logout, purchase)
- System events (errors, warnings, info)
- API calls (requests, responses)
- Data changes (creates, updates, deletes)
```

## Basic Event Log Schema

### Simple Design

```sql
CREATE TABLE event_logs (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    user_id INTEGER,
    entity_type VARCHAR(100),  -- 'user', 'order', 'product'
    entity_id INTEGER,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_event_logs_type ON event_logs(event_type);
CREATE INDEX idx_event_logs_user ON event_logs(user_id);
CREATE INDEX idx_event_logs_created ON event_logs(created_at);
CREATE INDEX idx_event_logs_entity ON event_logs(entity_type, entity_id);
```

## Advanced Event Log Design

### Partitioned by Time

```sql
-- Partition by month for performance
CREATE TABLE event_logs (
    id BIGSERIAL,
    event_type VARCHAR(100) NOT NULL,
    user_id INTEGER,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create partitions
CREATE TABLE event_logs_2023_01 PARTITION OF event_logs
    FOR VALUES FROM ('2023-01-01') TO ('2023-02-01');

CREATE TABLE event_logs_2023_02 PARTITION OF event_logs
    FOR VALUES FROM ('2023-02-01') TO ('2023-03-01');
```

### With Severity Levels

```sql
CREATE TABLE event_logs (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL,  -- 'info', 'warning', 'error', 'critical'
    user_id INTEGER,
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    message TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_event_logs_severity ON event_logs(severity);
CREATE INDEX idx_event_logs_type_severity ON event_logs(event_type, severity);
CREATE INDEX idx_event_logs_created_severity ON event_logs(created_at, severity);
```

## Real-World Examples

### Example 1: User Activity Logs

```sql
CREATE TABLE user_activity_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    action VARCHAR(100) NOT NULL,  -- 'login', 'logout', 'view_page', 'purchase'
    resource_type VARCHAR(50),  -- 'page', 'product', 'order'
    resource_id INTEGER,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX idx_user_activity_user ON user_activity_logs(user_id, created_at DESC);
CREATE INDEX idx_user_activity_action ON user_activity_logs(action, created_at DESC);
CREATE INDEX idx_user_activity_resource ON user_activity_logs(resource_type, resource_id);
```

### Example 2: API Request Logs

```sql
CREATE TABLE api_request_logs (
    id BIGSERIAL PRIMARY KEY,
    method VARCHAR(10) NOT NULL,  -- 'GET', 'POST', 'PUT', 'DELETE'
    path VARCHAR(500) NOT NULL,
    user_id INTEGER,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER,
    request_body JSONB,
    response_body JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_api_logs_path ON api_request_logs(path, created_at DESC);
CREATE INDEX idx_api_logs_user ON api_request_logs(user_id, created_at DESC);
CREATE INDEX idx_api_logs_status ON api_request_logs(status_code, created_at DESC);
CREATE INDEX idx_api_logs_created ON api_request_logs(created_at DESC);
```

### Example 3: Audit Logs

```sql
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,  -- 'create', 'update', 'delete'
    table_name VARCHAR(100) NOT NULL,
    record_id INTEGER NOT NULL,
    user_id INTEGER,
    old_values JSONB,  -- Before change
    new_values JSONB,  -- After change
    changed_fields TEXT[],  -- Array of changed field names
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_event ON audit_logs(event_type, created_at DESC);
```

## Querying Event Logs

### Recent Events

```sql
-- Recent events
SELECT * FROM event_logs
ORDER BY created_at DESC
LIMIT 100;
```

### Events by User

```sql
-- User's recent activity
SELECT * FROM user_activity_logs
WHERE user_id = 1
ORDER BY created_at DESC
LIMIT 50;
```

### Events by Type

```sql
-- All login events
SELECT * FROM event_logs
WHERE event_type = 'login'
ORDER BY created_at DESC;
```

### Time Range Queries

```sql
-- Events in last 24 hours
SELECT * FROM event_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

## Performance Optimization

### Partitioning

```sql
-- Partition by month for large tables
CREATE TABLE event_logs (
    ...
) PARTITION BY RANGE (created_at);

-- Old partitions can be archived or dropped
```

### Archiving Old Data

```sql
-- Archive old events
CREATE TABLE event_logs_archive (LIKE event_logs INCLUDING ALL);

-- Move old data
INSERT INTO event_logs_archive
SELECT * FROM event_logs
WHERE created_at < NOW() - INTERVAL '1 year';

-- Delete archived data
DELETE FROM event_logs
WHERE created_at < NOW() - INTERVAL '1 year';
```

### Indexing Strategy

```sql
-- Index frequently queried columns
CREATE INDEX idx_event_logs_created ON event_logs(created_at DESC);
CREATE INDEX idx_event_logs_user_created ON event_logs(user_id, created_at DESC);
CREATE INDEX idx_event_logs_type_created ON event_logs(event_type, created_at DESC);
```

## Best Practices

1. **Partition by Time**: Partition large log tables by time
2. **Index Strategically**: Index frequently queried columns
3. **Archive Old Data**: Move old logs to archive tables
4. **Use JSONB**: Store flexible metadata in JSONB
5. **Monitor Size**: Monitor table size and performance

## Common Patterns

### Pattern 1: Simple Event Log

```sql
-- Basic event log
CREATE TABLE event_logs (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(100),
    user_id INTEGER,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Pattern 2: Partitioned Logs

```sql
-- Partitioned by month
CREATE TABLE event_logs (
    ...
) PARTITION BY RANGE (created_at);
```

### Pattern 3: Audit Trail

```sql
-- Track data changes
CREATE TABLE audit_logs (
    event_type VARCHAR(100),
    table_name VARCHAR(100),
    record_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP
);
```

## Summary

**Event Logs Table Design:**

1. **Purpose**: Track application events for auditing and debugging
2. **Design**: Include event_type, user_id, metadata, created_at
3. **Partitioning**: Partition by time for large tables
4. **Indexing**: Index frequently queried columns
5. **Archiving**: Archive old data to maintain performance

**Key Takeaway:**
Event logs track application events for auditing, debugging, and analytics. Design log tables with event_type, user_id, metadata (JSONB), and created_at. Partition large log tables by time for performance. Index frequently queried columns. Archive old data to maintain performance.

**Design Principles:**
- Include essential fields (type, user, timestamp)
- Use JSONB for flexible metadata
- Partition by time for large tables
- Index for common queries
- Archive old data

**Next Steps:**
- Learn [Notification Table Structure](notification_table_structure.md) for notifications
- Study [Analytics Queries](analytics_queries.md) for log analysis
- Master [Partitioning](../15_db_infrastructure/partitioning.md) for large tables

