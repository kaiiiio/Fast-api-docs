# Connection Pooling: Managing Database Connections Efficiently

Connection pooling reuses database connections instead of creating new ones for each request. It's essential for performance and resource management in production applications.

## What is Connection Pooling?

**Connection pooling** maintains a pool of reusable database connections. Instead of creating/closing connections for each request, connections are reused.

### Without Connection Pooling

```python
# ❌ Bad: Create connection for each request
def get_user(user_id):
    conn = psycopg2.connect("postgresql://...")  # Expensive!
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = %s", [user_id])
    user = cursor.fetchone()
    conn.close()  # Close connection
    return user
# Each request: Create connection (slow), use, close (slow)
```

### With Connection Pooling

```python
# ✅ Good: Reuse connections from pool
pool = psycopg2.pool.SimpleConnectionPool(1, 20, "postgresql://...")

def get_user(user_id):
    conn = pool.getconn()  # Get from pool (fast)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = %s", [user_id])
    user = cursor.fetchone()
    pool.putconn(conn)  # Return to pool (reuse)
    return user
# Each request: Get from pool (fast), use, return to pool (fast)
```

## Connection Pool Parameters

### Basic Parameters

```python
# Connection pool configuration
pool = psycopg2.pool.SimpleConnectionPool(
    minconn=1,      # Minimum connections in pool
    maxconn=20,     # Maximum connections in pool
    dsn="postgresql://..."
)
```

### Parameter Explanation

- **minconn**: Minimum connections to maintain (always available)
- **maxconn**: Maximum connections allowed (prevents overload)
- **Connection Lifetime**: How long connections stay in pool

## Real-World Examples

### Example 1: PostgreSQL with psycopg2

```python
# Synchronous connection pool
from psycopg2 import pool

connection_pool = pool.SimpleConnectionPool(
    minconn=1,
    maxconn=20,
    host="localhost",
    database="mydb",
    user="user",
    password="password"
)

def get_user(user_id):
    conn = connection_pool.getconn()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = %s", [user_id])
        return cursor.fetchone()
    finally:
        connection_pool.putconn(conn)
```

### Example 2: Async with asyncpg

```python
# Asynchronous connection pool
import asyncpg

async def create_pool():
    return await asyncpg.create_pool(
        "postgresql://user:password@localhost/mydb",
        min_size=10,      # Minimum connections
        max_size=100,     # Maximum connections
        max_queries=50000,  # Max queries per connection
        max_inactive_connection_lifetime=300  # 5 minutes
    )

async def get_user(pool, user_id):
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            "SELECT * FROM users WHERE id = $1", user_id
        )
```

### Example 3: SQLAlchemy Connection Pool

```python
# SQLAlchemy connection pool
from sqlalchemy import create_engine

engine = create_engine(
    "postgresql://user:password@localhost/mydb",
    pool_size=10,              # Base pool size
    max_overflow=20,           # Additional connections
    pool_timeout=30,           # Wait time for connection
    pool_recycle=3600,         # Recycle after 1 hour
    pool_pre_ping=True         # Verify connections
)

# Connections managed automatically
with engine.connect() as conn:
    result = conn.execute("SELECT * FROM users WHERE id = 1")
```

## Pool Size Calculation

### Formula

```
Optimal Pool Size = ((Core Count × 2) + Effective Spindle Count)
```

### Example

```python
# Server: 4 cores, 1 database
# Optimal pool size = (4 × 2) + 1 = 9

# But consider:
# - Number of application servers
# - Database connection limit
# - Query duration

# Common values:
# Small app: 5-10 connections
# Medium app: 10-20 connections
# Large app: 20-50 connections
```

## Connection Pool Lifecycle

### Connection States

```
1. Created → Added to pool
2. Acquired → Removed from pool, in use
3. Returned → Back to pool, available
4. Closed → Removed from pool (if error or timeout)
```

### Pool Management

```python
# Connection lifecycle
pool = create_pool()

# 1. Get connection from pool
conn = pool.getconn()

# 2. Use connection
cursor = conn.cursor()
cursor.execute("SELECT * FROM users")

# 3. Return connection to pool
pool.putconn(conn)

# 4. Connection available for next request
```

## Best Practices

### 1. Appropriate Pool Size

```python
# ✅ Good: Reasonable pool size
pool = create_pool(minconn=5, maxconn=20)

# ❌ Bad: Too small (connection wait)
pool = create_pool(minconn=1, maxconn=2)

# ❌ Bad: Too large (wastes resources)
pool = create_pool(minconn=1, maxconn=1000)
```

### 2. Connection Timeout

```python
# Set timeout to prevent indefinite waiting
pool = create_pool(
    maxconn=20,
    timeout=30  # Wait max 30 seconds for connection
)
```

### 3. Connection Health Checks

```python
# Verify connections before use
pool = create_pool(
    maxconn=20,
    pre_ping=True  # Test connection before use
)
```

### 4. Connection Recycling

```python
# Recycle connections periodically
pool = create_pool(
    maxconn=20,
    max_age=3600  # Recycle after 1 hour
)
```

## Common Issues

### Issue 1: Connection Exhaustion

```python
# Problem: All connections in use
# Symptoms: Requests timeout waiting for connection

# Solution: Increase pool size or optimize queries
pool = create_pool(maxconn=50)  # Increase pool size
```

### Issue 2: Stale Connections

```python
# Problem: Database closes idle connections
# Symptoms: Connection errors after idle period

# Solution: Enable connection health checks
pool = create_pool(pre_ping=True)  # Verify before use
```

### Issue 3: Connection Leaks

```python
# Problem: Connections not returned to pool
# Symptoms: Pool exhausted, no connections available

# Solution: Always return connections
def get_user(user_id):
    conn = pool.getconn()
    try:
        # Use connection
        return result
    finally:
        pool.putconn(conn)  # Always return
```

## Monitoring Connection Pools

### Track Pool Usage

```python
# Monitor pool statistics
print(f"Active connections: {pool.getconns()}")
print(f"Available connections: {pool.getconns() - pool.getusedconns()}")
```

### Database-Level Monitoring

```sql
-- PostgreSQL: Check active connections
SELECT 
    count(*) AS total_connections,
    count(*) FILTER (WHERE state = 'active') AS active_connections,
    count(*) FILTER (WHERE state = 'idle') AS idle_connections
FROM pg_stat_activity
WHERE datname = 'mydb';
```

## Summary

**Connection Pooling:**

1. **Purpose**: Reuse connections instead of creating new ones
2. **Benefits**: Better performance, resource efficiency
3. **Configuration**: minconn, maxconn, timeout, health checks
4. **Best Practices**: Appropriate size, timeouts, health checks
5. **Monitoring**: Track pool usage and database connections

**Key Takeaway:**
Connection pooling is essential for production applications. It reuses database connections, improving performance and resource efficiency. Configure pool size appropriately, enable health checks, and monitor pool usage. Always return connections to the pool.

**Common Settings:**
- Small app: 5-10 connections
- Medium app: 10-20 connections
- Large app: 20-50 connections

**Next Steps:**
- Learn [Transaction Control](transaction_control.md) for transaction management
- Study [Performance Optimization](../10_performance_optimization/) for tuning
- Master [Database Configuration](../15_db_infrastructure/) for production setup

