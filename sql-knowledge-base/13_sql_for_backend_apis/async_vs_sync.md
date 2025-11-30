# Async vs Sync Database Clients: Choosing the Right Approach

Understanding async vs sync database clients helps you build scalable applications. The choice affects performance, resource usage, and application architecture.

## Synchronous Database Clients

### How They Work

**Synchronous clients** block the thread while waiting for database responses.

```python
# Synchronous (blocking)
import psycopg2

conn = psycopg2.connect("postgresql://...")
cursor = conn.cursor()
cursor.execute("SELECT * FROM users WHERE id = 1")
user = cursor.fetchone()  # Blocks until database responds
```

### Characteristics

- ⚠️ **Blocking**: Thread waits for database
- ⚠️ **Thread per Request**: Each request needs a thread
- ⚠️ **Limited Concurrency**: Thread pool limits concurrent requests
- ✅ **Simple**: Easier to understand and debug

## Asynchronous Database Clients

### How They Work

**Asynchronous clients** don't block threads while waiting for database responses.

```python
# Asynchronous (non-blocking)
import asyncpg

conn = await asyncpg.connect("postgresql://...")
user = await conn.fetchrow("SELECT * FROM users WHERE id = 1")
# Doesn't block, other requests can be handled
```

### Characteristics

- ✅ **Non-Blocking**: Thread doesn't wait
- ✅ **High Concurrency**: Handle thousands of concurrent requests
- ✅ **Efficient**: Better resource utilization
- ⚠️ **Complex**: Requires async/await understanding

## Performance Comparison

### Synchronous: Thread Pool

```python
# Synchronous: Limited by thread pool
# Thread pool: 100 threads
# Can handle ~100 concurrent database requests
# If 101st request comes, must wait for thread

# Each request:
# 1. Get thread from pool
# 2. Execute query (block thread)
# 3. Wait for database (thread blocked)
# 4. Return result
# 5. Release thread
```

### Asynchronous: Event Loop

```python
# Asynchronous: Limited by event loop
# Event loop: Single thread
# Can handle thousands of concurrent requests

# Each request:
# 1. Start query
# 2. Yield control (don't block)
# 3. Handle other requests
# 4. Resume when database responds
# 5. Return result
```

## Real-World Examples

### Example 1: FastAPI with Async

```python
# FastAPI: Async database client
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

app = FastAPI()
engine = create_async_engine("postgresql+asyncpg://...")

@app.get("/users/{user_id}")
async def get_user(user_id: int):
    async with AsyncSession(engine) as session:
        user = await session.get(User, user_id)  # Non-blocking
        return user
```

### Example 2: Express.js with Async

```javascript
// Express.js: Async database client
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://...'
});

app.get('/users/:id', async (req, res) => {
    const result = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [req.params.id]
    );
    res.json(result.rows[0]);
});
```

## When to Use Each

### Use Synchronous When:

- ✅ Simple applications
- ✅ Low concurrency requirements
- ✅ Team not familiar with async
- ✅ CPU-bound operations
- ✅ Legacy codebases

### Use Asynchronous When:

- ✅ High concurrency requirements
- ✅ I/O-bound operations (most web apps)
- ✅ Real-time applications
- ✅ Microservices
- ✅ Modern frameworks (FastAPI, Express.js)

## Connection Pooling

### Synchronous Pool

```python
# Synchronous connection pool
from psycopg2 import pool

connection_pool = pool.SimpleConnectionPool(
    minconn=1,
    maxconn=20,  # Max 20 connections
    dsn="postgresql://..."
)

# Each connection = one thread
# Max 20 concurrent database operations
```

### Asynchronous Pool

```python
# Asynchronous connection pool
from asyncpg import create_pool

pool = await create_pool(
    "postgresql://...",
    min_size=10,
    max_size=100  # Max 100 connections
)

# Each connection = coroutine
# Can handle thousands of concurrent operations
```

## Performance Impact

### Synchronous: Limited Concurrency

```
Thread Pool: 100 threads
Concurrent Requests: 100
If 101st request: Must wait
```

### Asynchronous: High Concurrency

```
Event Loop: Single thread
Concurrent Requests: 10,000+
All handled efficiently
```

## Best Practices

1. **Use Async for I/O**: Database, API calls, file operations
2. **Use Sync for CPU**: Heavy computations
3. **Connection Pooling**: Always use connection pools
4. **Error Handling**: Proper async error handling
5. **Monitor**: Track connection pool usage

## Common Mistakes

### ❌ Mixing Sync and Async

```python
# ❌ Bad: Mixing sync and async
async def get_user(user_id: int):
    # Async function
    user = sync_db.get_user(user_id)  # Blocking call in async!
    return user

# ✅ Good: All async
async def get_user(user_id: int):
    user = await async_db.get_user(user_id)
    return user
```

### ❌ Blocking in Async

```python
# ❌ Bad: Blocking operation in async
async def process_data():
    result = time.sleep(5)  # Blocks entire event loop!

# ✅ Good: Non-blocking
async def process_data():
    await asyncio.sleep(5)  # Non-blocking
```

## Summary

**Async vs Sync Database Clients:**

1. **Synchronous**: Blocking, thread per request, limited concurrency
2. **Asynchronous**: Non-blocking, high concurrency, efficient
3. **Use Async**: For I/O-bound, high concurrency
4. **Use Sync**: For simple apps, CPU-bound
5. **Connection Pools**: Always use connection pooling

**Key Takeaway:**
Asynchronous database clients provide better performance for I/O-bound operations and high concurrency. Use async for modern web applications, real-time systems, and high-traffic APIs. Use sync for simple applications or CPU-bound operations.

**Decision Guide:**
- High concurrency? → Async
- I/O-bound? → Async
- Simple app? → Sync
- CPU-bound? → Sync

**Next Steps:**
- Learn [Connection Pooling](../09_transactions_concurrency/connection_pooling.md) for pool management
- Study [Performance Optimization](../10_performance_optimization/) for tuning
- Master [Async Patterns](../06_advanced_querying/) for advanced usage

