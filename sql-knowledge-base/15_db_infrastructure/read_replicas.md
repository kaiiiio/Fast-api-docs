# Read Replicas: Scaling Read Operations

Read replicas are copies of the primary database used for read operations. They distribute read load and improve performance for read-heavy applications.

## What are Read Replicas?

**Read replicas** are database copies that receive updates from the primary database and handle read queries. They scale read operations and reduce load on the primary.

### Benefits

```
- Scale read operations
- Reduce primary database load
- Geographic distribution
- Disaster recovery
```

## PostgreSQL Read Replicas

### Setup Streaming Replication

```sql
-- Primary server configuration
-- In postgresql.conf:
wal_level = replica
max_wal_senders = 3
wal_keep_segments = 32

-- In pg_hba.conf:
host replication replica_user 192.168.1.0/24 md5

-- Create replication user
CREATE USER replica_user WITH REPLICATION PASSWORD 'password';

-- Replica server configuration
-- Create recovery.conf:
standby_mode = 'on'
primary_conninfo = 'host=primary_host user=replica_user password=password'
```

### Query Read Replicas

```python
# Application: Route reads to replicas
read_replicas = [
    'replica1.example.com:5432',
    'replica2.example.com:5432',
    'replica3.example.com:5432'
]

primary_db = 'primary.example.com:5432'

def get_read_connection():
    # Round-robin selection
    return connect_to(random.choice(read_replicas))

def get_write_connection():
    # Always use primary
    return connect_to(primary_db)
```

## MySQL Read Replicas

### Setup Replication

```sql
-- Master configuration
-- In my.cnf:
[mysqld]
server-id = 1
log-bin = mysql-bin

-- Create replication user
CREATE USER 'replica'@'%' IDENTIFIED BY 'password';
GRANT REPLICATION SLAVE ON *.* TO 'replica'@'%';

-- Slave configuration
CHANGE MASTER TO
  MASTER_HOST='master_host',
  MASTER_USER='replica',
  MASTER_PASSWORD='password',
  MASTER_LOG_FILE='mysql-bin.000001',
  MASTER_LOG_POS=0;

START SLAVE;
```

## Application Integration

### Read/Write Splitting

```python
# Python: Read/write splitting
class DatabaseRouter:
    def __init__(self):
        self.primary = connect_to('primary')
        self.replicas = [
            connect_to('replica1'),
            connect_to('replica2'),
        ]
        self.replica_index = 0
    
    def get_read_connection(self):
        # Round-robin
        conn = self.replicas[self.replica_index]
        self.replica_index = (self.replica_index + 1) % len(self.replicas)
        return conn
    
    def get_write_connection(self):
        return self.primary

# Usage
router = DatabaseRouter()

# Read query
read_conn = router.get_read_connection()
result = read_conn.execute("SELECT * FROM users WHERE id = 1")

# Write query
write_conn = router.get_write_connection()
write_conn.execute("INSERT INTO users (name) VALUES ('John')")
```

## Load Balancing

### Application-Level

```python
# Round-robin
replicas = ['replica1', 'replica2', 'replica3']
current = 0

def get_replica():
    global current
    replica = replicas[current]
    current = (current + 1) % len(replicas)
    return replica
```

### Proxy-Level

```yaml
# HAProxy for read load balancing
backend postgres_read
    balance roundrobin
    option pgsql-check user postgres
    server replica1 192.168.1.11:5432 check
    server replica2 192.168.1.12:5432 check
    server replica3 192.168.1.13:5432 check
```

## Replication Lag

### Monitoring Lag

```sql
-- PostgreSQL: Check replication lag
SELECT 
    client_addr,
    state,
    pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn) AS lag_bytes,
    EXTRACT(EPOCH FROM (now() - sent_time)) AS lag_seconds
FROM pg_stat_replication;
```

### Handling Lag

```python
# Route to primary if lag too high
def get_read_connection():
    replica = get_replica()
    lag = get_replication_lag(replica)
    
    if lag > 1000:  # 1 second lag
        return get_primary_connection()
    
    return replica
```

## Best Practices

1. **Multiple Replicas**: Use multiple replicas for redundancy
2. **Monitor Lag**: Track replication lag
3. **Load Balance**: Distribute reads across replicas
4. **Handle Failures**: Route to primary if replica fails
5. **Geographic Distribution**: Place replicas close to users

## Common Patterns

### Pattern 1: Simple Read Replica

```
Primary (writes + reads)
    │
    └── Replica (reads only)
```

### Pattern 2: Multiple Replicas

```
Primary (writes)
    │
    ├── Replica 1 (reads)
    ├── Replica 2 (reads)
    └── Replica 3 (reads)
```

### Pattern 3: Geographic Distribution

```
Primary (US East)
    │
    ├── Replica (US West)
    ├── Replica (Europe)
    └── Replica (Asia)
```

## Summary

**Read Replicas:**

1. **Purpose**: Scale read operations, reduce primary load
2. **Setup**: Streaming replication (PostgreSQL), master-slave (MySQL)
3. **Application**: Read/write splitting, load balancing
4. **Monitoring**: Track replication lag
5. **Best Practice**: Multiple replicas, geographic distribution

**Key Takeaway:**
Read replicas scale read operations by distributing read queries across database copies. Set up streaming replication (PostgreSQL) or master-slave replication (MySQL). Implement read/write splitting in applications to route reads to replicas and writes to primary. Monitor replication lag and handle replica failures gracefully.

**Read Replica Strategy:**
- Multiple replicas for redundancy
- Load balance reads
- Monitor replication lag
- Handle replica failures
- Geographic distribution

**Next Steps:**
- Learn [High Availability](high_availability.md) for redundancy
- Study [Sharding](sharding.md) for horizontal scaling
- Master [Monitoring](monitoring.md) for replica health

