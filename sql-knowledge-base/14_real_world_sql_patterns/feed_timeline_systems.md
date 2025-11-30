# Feed/Timeline Systems: Designing Activity Feeds

Feed and timeline systems display chronologically ordered activities (posts, updates, events) to users. This guide covers designing efficient feed systems.

## What are Feed Systems?

**Feed systems** display a stream of activities (posts, comments, likes, follows) in chronological order. They're used in social media, activity streams, and news feeds.

### Core Components

```
- Activities: Individual feed items
- Follows: User relationships
- Aggregation: Combining activities
- Ranking: Sorting by relevance
```

## Basic Feed Schema

### Simple Design

```sql
-- Activities (feed items)
CREATE TABLE activities (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    activity_type VARCHAR(50) NOT NULL,  -- 'post', 'comment', 'like', 'follow'
    object_type VARCHAR(50),  -- 'post', 'user', 'comment'
    object_id INTEGER,
    content TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User follows
CREATE TABLE user_follows (
    follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- Indexes
CREATE INDEX idx_activities_user ON activities(user_id, created_at DESC);
CREATE INDEX idx_activities_created ON activities(created_at DESC);
CREATE INDEX idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX idx_user_follows_following ON user_follows(following_id);
```

## Advanced Feed Schema

### With Aggregation

```sql
-- Activities
CREATE TABLE activities (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    activity_type VARCHAR(50) NOT NULL,
    object_type VARCHAR(50),
    object_id INTEGER,
    content TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Feed entries (aggregated activities)
CREATE TABLE feed_entries (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    activity_id BIGINT NOT NULL REFERENCES activities(id),
    score DECIMAL(10, 2),  -- For ranking
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_feed_entries_user ON feed_entries(user_id, created_at DESC);
CREATE INDEX idx_feed_entries_score ON feed_entries(user_id, score DESC, created_at DESC);
```

## Real-World Examples

### Example 1: Social Media Feed

```sql
-- Posts
CREATE TABLE posts (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    image_url VARCHAR(500),
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User follows
CREATE TABLE user_follows (
    follower_id INTEGER NOT NULL REFERENCES users(id),
    following_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, following_id)
);

-- Feed generation query
-- Get posts from followed users
SELECT p.*
FROM posts p
JOIN user_follows uf ON p.user_id = uf.following_id
WHERE uf.follower_id = 1
ORDER BY p.created_at DESC
LIMIT 20;
```

### Example 2: Activity Stream

```sql
-- Activities
CREATE TABLE activities (
    id BIGSERIAL PRIMARY KEY,
    actor_id INTEGER NOT NULL REFERENCES users(id),  -- Who did it
    verb VARCHAR(50) NOT NULL,  -- 'created', 'liked', 'commented'
    object_type VARCHAR(50) NOT NULL,  -- 'post', 'comment', 'user'
    object_id INTEGER NOT NULL,
    target_type VARCHAR(50),  -- 'post', 'user'
    target_id INTEGER,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User follows
CREATE TABLE user_follows (
    follower_id INTEGER NOT NULL REFERENCES users(id),
    following_id INTEGER NOT NULL REFERENCES users(id),
    PRIMARY KEY (follower_id, following_id)
);

-- Feed query
SELECT a.*
FROM activities a
JOIN user_follows uf ON a.actor_id = uf.following_id
WHERE uf.follower_id = 1
ORDER BY a.created_at DESC
LIMIT 50;
```

### Example 3: Ranked Feed

```sql
-- Activities with scores
CREATE TABLE activities (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    activity_type VARCHAR(50) NOT NULL,
    content TEXT,
    score DECIMAL(10, 2) DEFAULT 0,  -- Calculated score
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Feed entries (pre-computed)
CREATE TABLE feed_entries (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    activity_id BIGINT NOT NULL REFERENCES activities(id),
    score DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for ranked feed
CREATE INDEX idx_feed_entries_ranked 
ON feed_entries(user_id, score DESC, created_at DESC);

-- Ranked feed query
SELECT a.*
FROM feed_entries fe
JOIN activities a ON fe.activity_id = a.id
WHERE fe.user_id = 1
ORDER BY fe.score DESC, fe.created_at DESC
LIMIT 20;
```

## Feed Generation Strategies

### Strategy 1: Real-Time (Pull)

```sql
-- Generate feed on-demand
SELECT a.*
FROM activities a
JOIN user_follows uf ON a.user_id = uf.following_id
WHERE uf.follower_id = 1
ORDER BY a.created_at DESC
LIMIT 20;

-- Pros: Always fresh
-- Cons: Slow for large follow lists
```

### Strategy 2: Pre-Computed (Push)

```sql
-- Pre-compute feed entries
CREATE TABLE feed_entries (
    user_id INTEGER NOT NULL,
    activity_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- When activity created, insert into all followers' feeds
INSERT INTO feed_entries (user_id, activity_id)
SELECT follower_id, 123  -- New activity ID
FROM user_follows
WHERE following_id = 1;  -- Activity creator

-- Pros: Fast reads
-- Cons: Slower writes, storage overhead
```

### Strategy 3: Hybrid

```sql
-- Pre-compute for active users
-- Real-time for inactive users
-- Balance between performance and freshness
```

## Querying Feeds

### User Feed

```sql
-- Get user's feed (followed users' activities)
SELECT a.*
FROM activities a
JOIN user_follows uf ON a.user_id = uf.following_id
WHERE uf.follower_id = 1
ORDER BY a.created_at DESC
LIMIT 20;
```

### Pagination

```sql
-- Cursor-based pagination
SELECT a.*
FROM activities a
JOIN user_follows uf ON a.user_id = uf.following_id
WHERE uf.follower_id = 1
  AND a.created_at < '2023-01-01'  -- Cursor
ORDER BY a.created_at DESC
LIMIT 20;
```

### Ranked Feed

```sql
-- Feed sorted by score
SELECT a.*
FROM feed_entries fe
JOIN activities a ON fe.activity_id = a.id
WHERE fe.user_id = 1
ORDER BY fe.score DESC, fe.created_at DESC
LIMIT 20;
```

## Best Practices

1. **Index Strategically**: Index by user_id and created_at
2. **Use Pagination**: Cursor-based pagination for feeds
3. **Consider Caching**: Cache feed entries for performance
4. **Pre-Compute**: Pre-compute feeds for active users
5. **Archive Old**: Archive old activities to maintain performance

## Common Patterns

### Pattern 1: Simple Feed

```sql
-- Activities from followed users
SELECT * FROM activities
WHERE user_id IN (SELECT following_id FROM user_follows WHERE follower_id = 1)
ORDER BY created_at DESC;
```

### Pattern 2: Pre-Computed Feed

```sql
-- Pre-computed feed entries
CREATE TABLE feed_entries (
    user_id INTEGER,
    activity_id BIGINT,
    created_at TIMESTAMP
);
```

### Pattern 3: Ranked Feed

```sql
-- Feed with ranking scores
SELECT * FROM feed_entries
WHERE user_id = 1
ORDER BY score DESC, created_at DESC;
```

## Summary

**Feed/Timeline Systems:**

1. **Components**: Activities, follows, feed entries
2. **Strategies**: Real-time (pull), pre-computed (push), hybrid
3. **Design**: Support chronological and ranked feeds
4. **Indexing**: Index by user_id and timestamp
5. **Performance**: Use pagination, pre-compute, cache

**Key Takeaway:**
Feed systems display chronologically ordered activities. Design tables for activities, user follows, and optionally pre-computed feed entries. Use real-time generation for small follow lists, pre-computed feeds for large lists. Index by user_id and created_at for performance. Use cursor-based pagination for large feeds.

**Design Principles:**
- Store activities with user, type, content
- Track user follows for feed generation
- Consider pre-computing feeds
- Index for performance
- Use pagination

**Next Steps:**
- Learn [Event Logs Table Design](event_logs_table_design.md) for event tracking
- Study [Chat Application Schema](chat_application_schema.md) for messaging
- Master [Pagination Strategies](../04_relational_databases_sql/pagination_strategies.md) for feed pagination

