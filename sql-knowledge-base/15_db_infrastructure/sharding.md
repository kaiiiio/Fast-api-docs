# Sharding: Horizontal Database Scaling

Sharding splits a database into smaller, independent pieces (shards) distributed across multiple servers. It enables horizontal scaling for very large databases.

## What is Sharding?

**Sharding** is the practice of partitioning data across multiple database instances. Each shard contains a subset of data and operates independently.

### Sharding Concepts

```
Database
    │
    ├── Shard 1 (users 1-1000)
    ├── Shard 2 (users 1001-2000)
    ├── Shard 3 (users 2001-3000)
    └── Shard 4 (users 3001-4000)
```

## Sharding Strategies

### Strategy 1: Range-Based Sharding

```sql
-- Shard by user ID range
-- Shard 1: user_id 1-1000000
-- Shard 2: user_id 1000001-2000000
-- Shard 3: user_id 2000001-3000000

-- Shard selection
def get_shard(user_id):
    if user_id <= 1000000:
        return 'shard1'
    elif user_id <= 2000000:
        return 'shard2'
    else:
        return 'shard3'
```

### Strategy 2: Hash-Based Sharding

```python
# Shard by hash of shard key
import hashlib

def get_shard(user_id, num_shards):
    hash_value = int(hashlib.md5(str(user_id).encode()).hexdigest(), 16)
    shard_index = hash_value % num_shards
    return f'shard{shard_index + 1}'

# Example
user_id = 12345
shard = get_shard(user_id, num_shards=4)
# Returns: shard2 (consistent)
```

### Strategy 3: Directory-Based Sharding

```sql
-- Shard mapping table
CREATE TABLE shard_mapping (
    shard_key VARCHAR(255) PRIMARY KEY,
    shard_id INTEGER NOT NULL
);

-- Lookup shard
SELECT shard_id FROM shard_mapping WHERE shard_key = 'user_12345';
```

## Real-World Examples

### Example 1: User Sharding

```python
# Shard users by user_id
class ShardedDatabase:
    def __init__(self):
        self.shards = {
            'shard1': connect_to('shard1.example.com'),
            'shard2': connect_to('shard2.example.com'),
            'shard3': connect_to('shard3.example.com'),
        }
    
    def get_shard(self, user_id):
        # Hash-based sharding
        shard_index = hash(user_id) % len(self.shards)
        return list(self.shards.values())[shard_index]
    
    def get_user(self, user_id):
        shard = self.get_shard(user_id)
        return shard.execute("SELECT * FROM users WHERE id = %s", user_id)
    
    def create_user(self, user_id, name, email):
        shard = self.get_shard(user_id)
        return shard.execute(
            "INSERT INTO users (id, name, email) VALUES (%s, %s, %s)",
            (user_id, name, email)
        )
```

### Example 2: Geographic Sharding

```python
# Shard by geographic region
def get_shard_by_region(region):
    shard_map = {
        'us-east': 'shard1',
        'us-west': 'shard2',
        'europe': 'shard3',
        'asia': 'shard4',
    }
    return shard_map.get(region, 'shard1')
```

### Example 3: Multi-Tenant Sharding

```python
# Shard by tenant_id
def get_shard_by_tenant(tenant_id):
    # Each tenant in separate shard
    shard_index = tenant_id % num_shards
    return f'shard{shard_index}'
```

## Sharding Challenges

### Challenge 1: Cross-Shard Queries

```python
# Problem: Query across shards
# Get all users with specific email

# Solution: Query all shards
def find_user_by_email(email):
    results = []
    for shard in shards:
        user = shard.execute(
            "SELECT * FROM users WHERE email = %s",
            email
        )
        if user:
            results.append(user)
    return results
```

### Challenge 2: Transactions Across Shards

```python
# Problem: Transaction spanning multiple shards
# Solution: Two-phase commit or eventual consistency

# Two-phase commit (complex)
def transfer_money(from_user, to_user, amount):
    # Phase 1: Prepare
    from_shard = get_shard(from_user)
    to_shard = get_shard(to_user)
    
    from_shard.begin_transaction()
    to_shard.begin_transaction()
    
    # Phase 2: Commit or rollback
    try:
        from_shard.execute("UPDATE accounts SET balance = balance - %s", amount)
        to_shard.execute("UPDATE accounts SET balance = balance + %s", amount)
        from_shard.commit()
        to_shard.commit()
    except:
        from_shard.rollback()
        to_shard.rollback()
```

### Challenge 3: Rebalancing

```python
# Problem: Shard becomes too large
# Solution: Split shard or migrate data

def rebalance_shard(shard_id, new_shards):
    # Migrate data from old shard to new shards
    old_shard = get_shard(shard_id)
    data = old_shard.execute("SELECT * FROM users")
    
    for user in data:
        new_shard = get_shard(user.id)
        new_shard.execute("INSERT INTO users ...", user)
```

## Best Practices

1. **Choose Shard Key Carefully**: Use frequently queried column
2. **Avoid Cross-Shard Queries**: Design to minimize cross-shard operations
3. **Plan for Growth**: Design for easy shard addition
4. **Monitor Shard Sizes**: Balance data across shards
5. **Handle Failures**: Implement shard failover

## When to Shard

### ✅ Good Candidates

```
- Very large datasets (billions of rows)
- High write throughput
- Geographic distribution needed
- Multi-tenant applications
```

### ❌ Not Suitable

```
- Small to medium databases
- Complex cross-shard queries
- Strong consistency requirements
- Limited resources
```

## Summary

**Sharding:**

1. **Purpose**: Horizontal scaling for very large databases
2. **Strategies**: Range-based, hash-based, directory-based
3. **Challenges**: Cross-shard queries, transactions, rebalancing
4. **Best Practice**: Choose shard key carefully, minimize cross-shard operations
5. **When**: Very large datasets, high throughput, geographic distribution

**Key Takeaway:**
Sharding splits databases into smaller pieces distributed across multiple servers for horizontal scaling. Use range-based, hash-based, or directory-based sharding strategies. Sharding adds complexity (cross-shard queries, transactions, rebalancing) but enables scaling to very large datasets. Only shard when necessary—consider read replicas and caching first.

**Sharding Strategy:**
- Choose appropriate shard key
- Minimize cross-shard operations
- Plan for growth and rebalancing
- Handle shard failures
- Monitor shard sizes

**Next Steps:**
- Learn [Partitioning](partitioning.md) for single-database partitioning
- Study [Read Replicas](read_replicas.md) for read scaling
- Master [Scaling Strategies](scaling_strategies.md) for overall scaling

