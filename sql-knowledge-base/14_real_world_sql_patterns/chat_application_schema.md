# Chat Application Schema: Designing Messaging Systems

Chat applications require efficient schemas for messages, conversations, and real-time delivery. This guide covers designing chat application databases.

## What is a Chat Schema?

**Chat schema** stores messages, conversations, participants, and delivery status for real-time messaging applications.

### Core Components

```
- Messages: Individual chat messages
- Conversations: Chat rooms or threads
- Participants: Users in conversations
- Delivery Status: Read receipts, delivery status
```

## Basic Chat Schema

### Simple Design

```sql
-- Conversations (chat rooms)
CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    type VARCHAR(50) NOT NULL,  -- 'direct', 'group'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Participants
CREATE TABLE conversation_participants (
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (conversation_id, user_id)
);

-- Messages
CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text',  -- 'text', 'image', 'file'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_user ON messages(user_id, created_at DESC);
CREATE INDEX idx_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX idx_participants_user ON conversation_participants(user_id);
```

## Advanced Chat Schema

### With Read Receipts

```sql
-- Messages
CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text',
    reply_to_message_id BIGINT REFERENCES messages(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Read receipts
CREATE TABLE message_reads (
    message_id BIGINT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (message_id, user_id)
);

-- Indexes
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_message_reads_user ON message_reads(user_id, read_at DESC);
```

## Real-World Examples

### Example 1: Direct Messages

```sql
-- Direct message conversations
CREATE TABLE direct_message_conversations (
    id SERIAL PRIMARY KEY,
    user1_id INTEGER NOT NULL REFERENCES users(id),
    user2_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user1_id, user2_id),
    CHECK (user1_id < user2_id)  -- Ensure consistent ordering
);

-- Direct messages
CREATE TABLE direct_messages (
    id BIGSERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES direct_message_conversations(id),
    sender_id INTEGER NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_direct_messages_conversation 
ON direct_messages(conversation_id, created_at DESC);

CREATE INDEX idx_direct_messages_unread 
ON direct_messages(conversation_id, read) 
WHERE read = FALSE;
```

### Example 2: Group Chat

```sql
-- Group conversations
CREATE TABLE group_conversations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    creator_id INTEGER NOT NULL REFERENCES users(id),
    avatar_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Group participants
CREATE TABLE group_participants (
    group_id INTEGER NOT NULL REFERENCES group_conversations(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',  -- 'admin', 'member'
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, user_id)
);

-- Group messages
CREATE TABLE group_messages (
    id BIGSERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES group_conversations(id),
    sender_id INTEGER NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Group message reads
CREATE TABLE group_message_reads (
    message_id BIGINT NOT NULL REFERENCES group_messages(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (message_id, user_id)
);
```

### Example 3: Rich Messages

```sql
-- Messages with attachments
CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id),
    sender_id INTEGER NOT NULL REFERENCES users(id),
    content TEXT,
    message_type VARCHAR(50) NOT NULL,  -- 'text', 'image', 'file', 'video'
    file_url VARCHAR(500),
    file_name VARCHAR(255),
    file_size BIGINT,
    thumbnail_url VARCHAR(500),
    reply_to_message_id BIGINT REFERENCES messages(id),
    edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMP,
    deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Message reactions
CREATE TABLE message_reactions (
    message_id BIGINT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji VARCHAR(10) NOT NULL,  -- '👍', '❤️', '😂'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (message_id, user_id, emoji)
);
```

## Querying Chat Data

### Get Conversation Messages

```sql
-- Get messages for conversation
SELECT 
    m.*,
    u.name AS sender_name,
    u.avatar_url AS sender_avatar
FROM messages m
JOIN users u ON m.user_id = u.id
WHERE m.conversation_id = 1
ORDER BY m.created_at DESC
LIMIT 50;
```

### Get Unread Messages

```sql
-- Get unread messages for user
SELECT 
    m.*,
    c.name AS conversation_name
FROM messages m
JOIN conversations c ON m.conversation_id = c.id
LEFT JOIN message_reads mr ON m.id = mr.message_id AND mr.user_id = 1
WHERE c.id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = 1
)
AND mr.message_id IS NULL
ORDER BY m.created_at DESC;
```

### Get Conversations for User

```sql
-- Get user's conversations with latest message
SELECT 
    c.*,
    m.content AS last_message,
    m.created_at AS last_message_at,
    COUNT(DISTINCT CASE WHEN mr.message_id IS NULL THEN m.id END) AS unread_count
FROM conversations c
JOIN conversation_participants cp ON c.id = cp.conversation_id
LEFT JOIN messages m ON c.id = m.conversation_id
LEFT JOIN message_reads mr ON m.id = mr.message_id AND mr.user_id = 1
WHERE cp.user_id = 1
GROUP BY c.id, m.id, m.content, m.created_at
ORDER BY last_message_at DESC;
```

## Best Practices

1. **Index Messages**: Index by conversation_id and created_at
2. **Soft Deletes**: Use soft deletes for message history
3. **Pagination**: Use cursor-based pagination for messages
4. **Read Receipts**: Track read status efficiently
5. **Archive Old**: Archive old messages to maintain performance

## Common Patterns

### Pattern 1: Direct Messages

```sql
-- Two-user conversations
CREATE TABLE direct_messages (
    conversation_id INTEGER,
    sender_id INTEGER,
    receiver_id INTEGER,
    ...
);
```

### Pattern 2: Group Chat

```sql
-- Multi-user conversations
CREATE TABLE group_conversations (...);
CREATE TABLE group_participants (...);
CREATE TABLE group_messages (...);
```

### Pattern 3: Read Receipts

```sql
-- Track message reads
CREATE TABLE message_reads (
    message_id BIGINT,
    user_id INTEGER,
    read_at TIMESTAMP
);
```

## Summary

**Chat Application Schema:**

1. **Components**: Conversations, participants, messages, read receipts
2. **Design**: Support direct and group messages
3. **Features**: Read receipts, reactions, attachments
4. **Indexing**: Index by conversation and timestamp
5. **Performance**: Use pagination, archive old messages

**Key Takeaway:**
Chat application schemas store messages, conversations, and participants. Design tables for conversations (direct and group), participants, messages with content and metadata, and read receipts. Index messages by conversation_id and created_at for fast queries. Use soft deletes for message history. Implement pagination for large message lists.

**Design Principles:**
- Separate conversations, participants, messages
- Support direct and group chats
- Track read receipts
- Index for performance
- Use soft deletes

**Next Steps:**
- Learn [Feed/Timeline Systems](feed_timeline_systems.md) for activity feeds
- Study [Event Logs Table Design](event_logs_table_design.md) for event tracking
- Master [Pagination Strategies](../04_relational_databases_sql/pagination_strategies.md) for message pagination

