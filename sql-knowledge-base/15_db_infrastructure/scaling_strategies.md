# Scaling Strategies: Growing Your Database

Scaling strategies help databases handle increasing load and data volume. This guide covers vertical and horizontal scaling approaches.

## Scaling Types

### Vertical Scaling (Scale Up)

**Vertical scaling** increases resources (CPU, memory, disk) on a single server.

```
Before: 4 CPU, 16GB RAM
After:  8 CPU, 32GB RAM
```

### Horizontal Scaling (Scale Out)

**Horizontal scaling** adds more servers to distribute load.

```
Before: 1 server
After:  3 servers (primary + 2 replicas)
```

## Vertical Scaling

### When to Scale Up

```
✅ Good for:
- Moderate load increases
- Single server can handle
- Simple to implement
- No application changes needed

❌ Limitations:
- Hardware limits
- Cost increases
- Single point of failure
```

### Implementation

```sql
-- Upgrade server resources
-- 1. Increase CPU cores
-- 2. Increase RAM
-- 3. Increase disk space
-- 4. Upgrade to faster disks (SSD)

-- Database configuration
-- Increase connection pool
max_connections = 200

-- Increase memory
shared_buffers = 8GB
work_mem = 64MB
```

## Horizontal Scaling

### Read Scaling

```sql
-- Add read replicas
Primary (writes)
    │
    ├── Replica 1 (reads)
    ├── Replica 2 (reads)
    └── Replica 3 (reads)

-- Route reads to replicas
-- Route writes to primary
```

### Write Scaling

```sql
-- Sharding for write scaling
Shard 1 (users 1-1000)
Shard 2 (users 1001-2000)
Shard 3 (users 2001-3000)

-- Distribute writes across shards
```

## Scaling Strategies

### Strategy 1: Read Replicas

```python
# Add read replicas for read scaling
read_replicas = [
    'replica1.example.com',
    'replica2.example.com',
    'replica3.example.com',
]

def get_read_connection():
    return connect_to(random.choice(read_replicas))

def get_write_connection():
    return connect_to('primary.example.com')
```

### Strategy 2: Caching

```python
# Cache frequently accessed data
import redis

cache = redis.Redis()

def get_user(user_id):
    # Check cache first
    user = cache.get(f"user:{user_id}")
    if user:
        return user
    
    # Cache miss: Query database
    user = db.query("SELECT * FROM users WHERE id = %s", user_id)
    cache.set(f"user:{user_id}", user, ttl=3600)
    return user
```

### Strategy 3: Connection Pooling

```python
# Optimize connection usage
from sqlalchemy import create_engine

engine = create_engine(
    "postgresql://...",
    pool_size=20,        # Base pool size
    max_overflow=10,     # Additional connections
    pool_timeout=30,     # Wait time for connection
    pool_recycle=3600    # Recycle connections
)
```

### Strategy 4: Query Optimization

```sql
-- Optimize queries
-- Add indexes
CREATE INDEX idx_users_email ON users(email);

-- Optimize queries
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'user@example.com';

-- Use materialized views
CREATE MATERIALIZED VIEW user_stats AS
SELECT user_id, COUNT(*) AS order_count
FROM orders
GROUP BY user_id;
```

### Strategy 5: Partitioning

```sql
-- Partition large tables
CREATE TABLE orders (
    ...
) PARTITION BY RANGE (created_at);

-- Partition by month
CREATE TABLE orders_2023_01 PARTITION OF orders
    FOR VALUES FROM ('2023-01-01') TO ('2023-02-01');
```

### Strategy 6: Sharding

```python
# Shard database for horizontal scaling
def get_shard(user_id):
    shard_index = hash(user_id) % num_shards
    return f'shard{shard_index}'

# Route queries to appropriate shard
shard = get_shard(user_id)
result = shard.execute("SELECT * FROM users WHERE id = %s", user_id)
```

## Scaling Decision Tree

```
Start
  │
  ├─ Can optimize queries/indexes? → Optimize
  │
  ├─ Can add caching? → Add caching
  │
  ├─ Read-heavy? → Add read replicas
  │
  ├─ Write-heavy? → Consider sharding
  │
  ├─ Single table too large? → Partition
  │
  └─ Still need more? → Scale up or shard
```

## Real-World Examples

### Example 1: E-Commerce Scaling

```python
# Phase 1: Optimize
# - Add indexes
# - Optimize queries
# - Add caching

# Phase 2: Read replicas
# - Add 2 read replicas
# - Route reads to replicas

# Phase 3: Partition
# - Partition orders table by date

# Phase 4: Shard (if needed)
# - Shard users by user_id
```

### Example 2: Social Media Scaling

```python
# Phase 1: Caching
# - Cache user feeds
# - Cache user profiles

# Phase 2: Read replicas
# - Multiple read replicas
# - Geographic distribution

# Phase 3: Sharding
# - Shard by user_id
# - Shard by region
```

## Best Practices

1. **Start Simple**: Optimize queries and add indexes first
2. **Add Caching**: Cache frequently accessed data
3. **Read Replicas**: Add replicas for read scaling
4. **Partition**: Partition large tables
5. **Shard Last**: Only shard when necessary

## Common Mistakes

### ❌ Premature Scaling

```python
# ❌ Bad: Shard before optimizing
# Sharding adds complexity
# Should optimize first

# ✅ Good: Optimize first
# 1. Add indexes
# 2. Optimize queries
# 3. Add caching
# 4. Then consider sharding
```

### ❌ Over-Scaling

```python
# ❌ Bad: Too many replicas for small load
# 10 read replicas for 100 users
# Waste of resources

# ✅ Good: Scale appropriately
# Start with 1-2 replicas
# Add more as needed
```

## Summary

**Scaling Strategies:**

1. **Vertical**: Increase server resources (scale up)
2. **Horizontal**: Add more servers (scale out)
3. **Strategies**: Read replicas, caching, partitioning, sharding
4. **Decision**: Start simple, scale as needed
5. **Best Practice**: Optimize first, then scale

**Key Takeaway:**
Scaling strategies help databases handle increasing load. Start with simple optimizations (indexes, query optimization, caching) before scaling. Use read replicas for read scaling, partitioning for large tables, and sharding for very large datasets. Scale vertically (up) for moderate increases, horizontally (out) for large increases. Only shard when necessary—it adds significant complexity.

**Scaling Approach:**
- Optimize first (queries, indexes)
- Add caching
- Use read replicas
- Partition large tables
- Shard only when necessary

**Next Steps:**
- Learn [Read Replicas](read_replicas.md) for read scaling
- Study [Partitioning](partitioning.md) for large tables
- Master [Sharding](sharding.md) for horizontal scaling

