# High Availability: Ensuring Database Uptime

High availability (HA) ensures databases remain accessible even during failures. This guide covers HA strategies and implementations.

## What is High Availability?

**High availability** is the ability of a system to remain operational and accessible even when components fail. For databases, this means minimal downtime and automatic failover.

### HA Goals

```
- Minimize downtime
- Automatic failover
- Data redundancy
- Load distribution
```

## HA Architectures

### Architecture 1: Primary-Replica (Master-Slave)

```
Primary (Master)
    │
    ├── Replica 1 (Read)
    ├── Replica 2 (Read)
    └── Replica 3 (Standby)
```

### Architecture 2: Primary-Secondary

```
Primary
    │
    └── Secondary (Hot Standby)
```

## PostgreSQL High Availability

### Streaming Replication

```sql
-- Primary server configuration
-- In postgresql.conf:
wal_level = replica
max_wal_senders = 3
wal_keep_segments = 32

-- In pg_hba.conf:
host replication replica_user 192.168.1.0/24 md5

-- Replica server configuration
-- Create recovery.conf:
standby_mode = 'on'
primary_conninfo = 'host=primary_host user=replica_user'
trigger_file = '/tmp/promote_standby'
```

### Automatic Failover (Patroni)

```yaml
# Patroni configuration for automatic failover
scope: mycluster
name: node1

restapi:
  listen: 0.0.0.0:8008
  connect_address: 192.168.1.10:8008

etcd:
  host: 192.168.1.20:2379

bootstrap:
  dcs:
    ttl: 30
    loop_wait: 10
    retry_timeout: 30
    maximum_lag_on_failover: 1048576
```

## MySQL High Availability

### Master-Slave Replication

```sql
-- Master configuration
-- In my.cnf:
[mysqld]
server-id = 1
log-bin = mysql-bin
binlog-format = ROW

-- Create replication user
CREATE USER 'replica'@'%' IDENTIFIED BY 'password';
GRANT REPLICATION SLAVE ON *.* TO 'replica'@'%';

-- Slave configuration
-- In my.cnf:
[mysqld]
server-id = 2
relay-log = mysql-relay-bin

-- Start replication
CHANGE MASTER TO
  MASTER_HOST='master_host',
  MASTER_USER='replica',
  MASTER_PASSWORD='password',
  MASTER_LOG_FILE='mysql-bin.000001',
  MASTER_LOG_POS=0;

START SLAVE;
```

### MySQL Group Replication

```sql
-- Multi-primary replication
-- All nodes can accept writes
-- Automatic conflict resolution
```

## Load Balancing

### Read Load Balancing

```python
# Application-level load balancing
read_replicas = [
    'replica1.example.com',
    'replica2.example.com',
    'replica3.example.com'
]

def get_read_connection():
    # Round-robin or random selection
    return connect_to(random.choice(read_replicas))

def get_write_connection():
    # Always use primary
    return connect_to('primary.example.com')
```

### Proxy Load Balancing

```yaml
# HAProxy configuration
global
    daemon

defaults
    mode tcp
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms

frontend postgres_frontend
    bind *:5432
    default_backend postgres_backend

backend postgres_backend
    option pgsql-check user postgres
    server primary 192.168.1.10:5432 check
    server replica1 192.168.1.11:5432 check backup
    server replica2 192.168.1.12:5432 check backup
```

## Failover Strategies

### Automatic Failover

```python
# Health check and automatic failover
def check_primary_health():
    try:
        conn = connect_to_primary()
        conn.execute("SELECT 1")
        return True
    except:
        return False

def promote_replica():
    # Promote replica to primary
    # Update DNS/load balancer
    # Notify application
    pass

# Monitor primary
while True:
    if not check_primary_health():
        promote_replica()
        break
    time.sleep(5)
```

### Manual Failover

```sql
-- PostgreSQL: Promote replica
-- On replica server:
pg_ctl promote

-- Or create trigger file
touch /tmp/promote_standby
```

## Monitoring HA

### Health Checks

```sql
-- Check replication lag
SELECT 
    client_addr,
    state,
    sync_state,
    pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn) AS lag_bytes
FROM pg_stat_replication;
```

### Alerting

```python
# Monitor replication lag
def check_replication_lag():
    lag = get_replication_lag()
    if lag > 10485760:  # 10MB
        send_alert("High replication lag detected")
```

## Best Practices

1. **Multiple Replicas**: Have at least 2 replicas
2. **Automatic Failover**: Use tools like Patroni
3. **Monitor Health**: Regular health checks
4. **Test Failover**: Regularly test failover procedures
5. **Documentation**: Document HA setup and procedures

## Common Patterns

### Pattern 1: Primary-Replica

```
Primary (writes)
    │
    ├── Replica 1 (reads)
    └── Replica 2 (reads, standby)
```

### Pattern 2: Multi-Region

```
Region 1: Primary
    │
Region 2: Replica
    │
Region 3: Replica
```

## Summary

**High Availability:**

1. **Goal**: Minimize downtime, automatic failover
2. **Architecture**: Primary-replica, primary-secondary
3. **Replication**: Streaming replication, logical replication
4. **Failover**: Automatic or manual
5. **Monitoring**: Health checks, replication lag

**Key Takeaway:**
High availability ensures databases remain accessible during failures. Use primary-replica architecture with streaming replication. Implement automatic failover using tools like Patroni. Monitor replication health and lag. Test failover procedures regularly. Use load balancers to distribute read traffic across replicas.

**HA Principles:**
- Multiple replicas
- Automatic failover
- Health monitoring
- Regular testing
- Load balancing

**Next Steps:**
- Learn [Read Replicas](read_replicas.md) for scaling reads
- Study [Backups & Restore](backups_restore.md) for data protection
- Master [Monitoring](monitoring.md) for HA monitoring

