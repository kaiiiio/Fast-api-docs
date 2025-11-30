# Notification Table Structure: Designing Notification Systems

Notification tables store user notifications for in-app, email, and push notifications. This guide covers designing efficient notification systems.

## What are Notifications?

**Notifications** are messages sent to users to inform them of events, updates, or actions. They can be in-app, email, push, or SMS.

### Notification Types

```
- In-app notifications
- Email notifications
- Push notifications (mobile)
- SMS notifications
```

## Basic Notification Schema

### Simple Design

```sql
CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL,  -- 'info', 'warning', 'success', 'error'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read) WHERE read = FALSE;
```

## Advanced Notification Schema

### With Channels

```sql
CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    channel VARCHAR(50) NOT NULL,  -- 'in_app', 'email', 'push', 'sms'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_url VARCHAR(500),  -- Link to related resource
    metadata JSONB,  -- Additional data
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    sent_at TIMESTAMP,  -- When notification was sent
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX idx_notifications_channel ON notifications(channel, sent_at);
```

## Real-World Examples

### Example 1: In-App Notifications

```sql
CREATE TABLE in_app_notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL,  -- 'order_shipped', 'new_message', 'friend_request'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    icon VARCHAR(100),  -- Icon identifier
    action_url VARCHAR(500),  -- Link to action
    entity_type VARCHAR(50),  -- 'order', 'message', 'user'
    entity_id INTEGER,
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX idx_in_app_notifications_user_unread 
ON in_app_notifications(user_id, created_at DESC) 
WHERE read = FALSE;

CREATE INDEX idx_in_app_notifications_user_all 
ON in_app_notifications(user_id, created_at DESC);
```

### Example 2: Notification Preferences

```sql
-- User notification preferences
CREATE TABLE notification_preferences (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    email_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    email_frequency VARCHAR(20) DEFAULT 'immediate',  -- 'immediate', 'daily', 'weekly'
    push_frequency VARCHAR(20) DEFAULT 'immediate',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notification channels
CREATE TABLE notification_channels (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    channel VARCHAR(50) NOT NULL,  -- 'email', 'push', 'sms'
    address VARCHAR(255) NOT NULL,  -- email, device token, phone
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, channel, address)
);
```

### Example 3: Notification Queue

```sql
-- Queue for sending notifications
CREATE TABLE notification_queue (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    channel VARCHAR(50) NOT NULL,  -- 'email', 'push', 'sms'
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'sent', 'failed'
    attempts INTEGER DEFAULT 0,
    sent_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_notification_queue_pending 
ON notification_queue(status, scheduled_at) 
WHERE status = 'pending';

CREATE INDEX idx_notification_queue_user 
ON notification_queue(user_id, created_at DESC);
```

## Querying Notifications

### Unread Notifications

```sql
-- Get unread notifications for user
SELECT * FROM notifications
WHERE user_id = 1 AND read = FALSE
ORDER BY created_at DESC;
```

### Recent Notifications

```sql
-- Get recent notifications
SELECT * FROM notifications
WHERE user_id = 1
ORDER BY created_at DESC
LIMIT 20;
```

### Mark as Read

```sql
-- Mark notification as read
UPDATE notifications
SET read = TRUE, read_at = CURRENT_TIMESTAMP
WHERE id = 1 AND user_id = 1;
```

### Mark All as Read

```sql
-- Mark all notifications as read
UPDATE notifications
SET read = TRUE, read_at = CURRENT_TIMESTAMP
WHERE user_id = 1 AND read = FALSE;
```

## Notification Patterns

### Pattern 1: Simple Notifications

```sql
-- Basic notification table
CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    type VARCHAR(50),
    title VARCHAR(255),
    message TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Pattern 2: Multi-Channel

```sql
-- Notifications with multiple channels
CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    channel VARCHAR(50),  -- 'in_app', 'email', 'push'
    ...
);
```

### Pattern 3: Notification Queue

```sql
-- Queue for async notification sending
CREATE TABLE notification_queue (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    channel VARCHAR(50),
    status VARCHAR(20),  -- 'pending', 'sent', 'failed'
    ...
);
```

## Best Practices

1. **Index Unread**: Index unread notifications for fast queries
2. **Partition by Time**: Partition large notification tables
3. **Soft Deletes**: Use soft deletes for notification history
4. **Batch Operations**: Batch mark-as-read operations
5. **Archive Old**: Archive old read notifications

## Common Patterns

### Pattern 1: Unread Count

```sql
-- Get unread count
SELECT COUNT(*) FROM notifications
WHERE user_id = 1 AND read = FALSE;
```

### Pattern 2: Pagination

```sql
-- Paginated notifications
SELECT * FROM notifications
WHERE user_id = 1
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;
```

### Pattern 3: Notification Preferences

```sql
-- Check if user wants notifications
SELECT * FROM notification_preferences
WHERE user_id = 1 AND email_enabled = TRUE;
```

## Summary

**Notification Table Structure:**

1. **Purpose**: Store user notifications for various channels
2. **Design**: Include user_id, type, title, message, read status
3. **Channels**: Support multiple channels (in-app, email, push)
4. **Indexing**: Index unread notifications for performance
5. **Queue**: Use queue table for async notification sending

**Key Takeaway:**
Notification tables store user notifications for in-app, email, and push notifications. Design tables with user_id, type, title, message, and read status. Support multiple channels. Index unread notifications for fast queries. Use a queue table for async notification sending. Archive old read notifications to maintain performance.

**Design Principles:**
- Include essential fields (user, type, message, read)
- Support multiple channels
- Index unread notifications
- Use queue for async sending
- Archive old notifications

**Next Steps:**
- Learn [Event Logs Table Design](event_logs_table_design.md) for event tracking
- Study [Chat Application Schema](chat_application_schema.md) for messaging
- Master [Feed/Timeline Systems](feed_timeline_systems.md) for activity feeds

