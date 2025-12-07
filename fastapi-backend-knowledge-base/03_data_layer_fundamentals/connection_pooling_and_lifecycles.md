# Connection Pooling and Lifecycles

Proper connection pool management is crucial for database performance and resource utilization in async FastAPI applications.

## Understanding Connection Pools

A connection pool maintains a cache of database connections that can be reused, avoiding the overhead of creating new connections for each request.

### Why Connection Pools Matter

**Performance:** Reusing connections is much faster than creating new ones. **Resource Management:** Limits concurrent database connections. **Stability:** Prevents connection exhaustion under load.

## SQLAlchemy Async Connection Pooling

### Basic Setup

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

# create_async_engine: Creates connection pool for efficient connection reuse.
engine = create_async_engine(
    "postgresql+asyncpg://user:pass@localhost/db",
    pool_size=10,              # Number of connections to maintain (always ready)
    max_overflow=20,           # Additional connections beyond pool_size (total max = 30)
    pool_timeout=30,           # Seconds to wait for connection (raises error if timeout)
    pool_recycle=3600,         # Recycle connections after 1 hour (prevents stale connections)
    pool_pre_ping=True,        # Verify connections before use (detects dead connections)
    echo=False                 # SQL logging (set True for debugging)
)
```

### Pool Parameters Explained

```python
# Pool size configuration
pool_size=10          # Always maintain 10 connections
max_overflow=20       # Can create up to 20 more = 30 total max
pool_timeout=30       # Wait max 30s for connection

# Connection lifecycle
pool_recycle=3600     # Recreate connections after 1 hour
pool_pre_ping=True    # Check if connection alive before use

# Connection limits
max_connections=100   # Hard limit (if database supports)
```

## Connection Lifecycle Management

### 1. Engine Creation (Application Startup)

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI

# lifespan: Manages engine lifecycle (create on startup, dispose on shutdown).
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create engine (creates connection pool).
    engine = create_async_engine(DATABASE_URL)
    app.state.engine = engine  # Store in app state for access
    yield  # App runs here
    # Shutdown: Dispose engine (closes all connections, returns to pool).
    await engine.dispose()

app = FastAPI(lifespan=lifespan)
```

### 2. Session Management (Per Request)

```python
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# get_db: Dependency manages session lifecycle (per-request scope).
async def get_db() -> AsyncSession:
    """Dependency for database session"""
    async with async_session_maker() as session:
        try:
            yield session  # Session available during request
            await session.commit()  # Commit on success
        except Exception:
            await session.rollback()  # Rollback on error
            raise
        finally:
            await session.close()  # Returns connection to pool (reused for next request)
```

### 3. Session Scope Patterns

#### Request-Scoped (Recommended)

```python
# Request-scoped session: One session per HTTP request (recommended pattern).
@app.get("/users/{user_id}")
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db)  # Session created here
):
    # Session available during request handling.
    user = await db.get(User, user_id)
    # Session closed after response (automatic cleanup)
    return user
```

#### Long-Lived Session (Avoid)

```python
# ❌ Bad: Session lives beyond request
global_session = None

@app.on_event("startup")
async def startup():
    global global_session
    global_session = async_session_maker()

# Problems:
# - Connection not returned to pool
# - Stale data
# - Resource leaks
```

## Pool Configuration Strategies

### Development

```python
engine = create_async_engine(
    DATABASE_URL,
    pool_size=5,           # Small pool for dev
    max_overflow=10,
    echo=True              # Show SQL queries
)
```

### Production

```python
engine = create_async_engine(
    DATABASE_URL,
    pool_size=20,          # Larger pool
    max_overflow=40,       # Handle traffic spikes
    pool_recycle=3600,     # Recycle hourly
    pool_pre_ping=True,    # Verify connections
    echo=False             # Disable SQL logging
)
```

### High Traffic

```python
engine = create_async_engine(
    DATABASE_URL,
    pool_size=50,
    max_overflow=100,
    pool_timeout=10,       # Fail fast if no connection
    pool_recycle=1800,     # Recycle every 30 minutes
    pool_pre_ping=True
)
```

## Monitoring Pool Usage

```python
from sqlalchemy import event
from sqlalchemy.pool import Pool

@event.listens_for(Pool, "connect")
def receive_connect(dbapi_conn, connection_record):
    print("New connection created")

@event.listens_for(Pool, "checkout")
def receive_checkout(dbapi_conn, connection_record, connection_proxy):
    print(f"Connection checked out. Pool size: {connection_proxy._pool.size()}")

@event.listens_for(Pool, "checkin")
def receive_checkin(dbapi_conn, connection_record):
    print("Connection returned to pool")
```

## Common Issues and Solutions

### 1. Connection Exhaustion

**Problem**: All connections in use, requests timeout

```python
# ❌ Too small pool
pool_size=5  # Only 5 connections for 100 concurrent requests

# ✅ Adequate pool
pool_size=20
max_overflow=40  # Total: 60 connections
```

### 2. Stale Connections

**Problem**: Database closes idle connections, pool still tries to use them

```python
# ✅ Enable pre-ping
pool_pre_ping=True  # Checks connection before use

# ✅ Recycle connections
pool_recycle=3600  # Recreate after 1 hour
```

### 3. Connection Leaks

**Problem**: Sessions not properly closed

```python
# ❌ Bad: Session not closed
async def get_user(user_id: int):
    session = async_session_maker()
    user = await session.get(User, user_id)
    return user  # Session never closed!

# ✅ Good: Proper cleanup
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    return user  # Session auto-closed by dependency
```

## Best Practices

### 1. **Use Dependency Injection**

```python
# ✅ Good: Automatic session management
@app.get("/users/")
async def list_users(db: AsyncSession = Depends(get_db)):
    return await db.execute(select(User))

# ❌ Bad: Manual session management
@app.get("/users/")
async def list_users():
    session = async_session_maker()
    try:
        return await session.execute(select(User))
    finally:
        await session.close()
```

### 2. **Commit or Rollback Explicitly**

```python
async def get_db() -> AsyncSession:
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```

### 3. **Size Pool Appropriately**

```python
# Rule of thumb:
# pool_size = (expected_concurrent_requests * avg_query_time) / response_time

# Example:
# 100 concurrent requests
# Average query: 50ms
# Desired response: 100ms
# pool_size = (100 * 0.05) / 0.1 = 50
```

### 4. **Monitor and Adjust**

```python
# Track pool metrics
from prometheus_client import Gauge

pool_size_gauge = Gauge('db_pool_size', 'Database pool size')
pool_checked_out = Gauge('db_pool_checked_out', 'Connections in use')

# Update metrics in pool event handlers
```

## MongoDB Connection Pooling (Motor)

```python
from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient(
    "mongodb://localhost:27017",
    maxPoolSize=50,          # Max connections
    minPoolSize=10,          # Min connections to maintain
    maxIdleTimeMS=45000,     # Close idle connections after 45s
    serverSelectionTimeoutMS=5000
)

db = client.myapp
```

## Summary

Connection pool management essentials:
- ✅ Use connection pools for performance
- ✅ Size pools based on traffic patterns
- ✅ Enable pre-ping and recycling
- ✅ Use dependency injection for sessions
- ✅ Always commit or rollback transactions
- ✅ Monitor pool usage and adjust as needed

Proper pool management ensures your application can handle load efficiently without exhausting database connections.

---

## 🎯 Interview Questions: FastAPI

### Q1: Explain database connection pooling in FastAPI, including how it works, why it's important, how to configure it properly, and common issues. Provide examples showing connection pool setup for both SQLAlchemy and MongoDB.

**Answer:**

**Connection Pooling Overview:**

Connection pooling is a technique where a pool of database connections is maintained and reused across requests. Instead of creating a new connection for each request, connections are borrowed from the pool, used, and returned. This significantly improves performance and resource utilization.

**Why Connection Pooling is Important:**

**Without Connection Pooling:**
```python
# ❌ Bad: New connection for each request
@app.get("/users/{user_id}")
async def get_user(user_id: int):
    conn = create_connection()  # New connection (50-200ms)
    user = await conn.get_user(user_id)
    conn.close()  # Close connection
    return user

# Problems:
# - Slow: Creating connections is expensive
# - Resource intensive: Each connection uses memory
# - Limited: Database has max connection limit
# - Inefficient: Wastes time creating/destroying connections
```

**With Connection Pooling:**
```python
# ✅ Good: Reuse connections from pool
@app.get("/users/{user_id}")
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    user = await db.get_user(user_id)
    return user
    # Connection returned to pool automatically

# Benefits:
# - Fast: Reuse existing connections (<1ms)
# - Efficient: Connections shared across requests
# - Scalable: Handle more concurrent requests
# - Resource-friendly: Limited number of connections
```

**How Connection Pooling Works:**

**Pool Lifecycle:**
```
1. Application starts: Pool created with initial connections
2. Request arrives: Connection borrowed from pool
3. Request processed: Connection used for queries
4. Request completes: Connection returned to pool
5. Connection reused: Available for next request
```

**SQLAlchemy Connection Pooling:**

**Basic Setup:**
```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Create engine with connection pool
engine = create_async_engine(
    "postgresql+asyncpg://user:pass@localhost/db",
    pool_size=20,              # Number of connections to maintain
    max_overflow=10,           # Additional connections beyond pool_size
    pool_pre_ping=True,        # Verify connections before use
    pool_recycle=3600,         # Recycle connections after 1 hour
    echo=False
)

# Create session factory
async_session_maker = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Dependency for getting database session
async def get_db():
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```

**Pool Configuration Parameters:**

**pool_size:**
```python
pool_size=20  # Number of connections to maintain
# - Too small: Requests wait for available connections
# - Too large: Wastes resources, may exceed DB limit
# - Rule of thumb: (concurrent_requests × avg_query_time) / response_time
```

**max_overflow:**
```python
max_overflow=10  # Additional connections beyond pool_size
# - Total max connections = pool_size + max_overflow = 30
# - Used when pool is exhausted
# - Temporary connections, closed when not needed
```

**pool_pre_ping:**
```python
pool_pre_ping=True  # Verify connection before use
# - Checks if connection is still alive
# - Replaces stale connections automatically
# - Prevents "connection closed" errors
```

**pool_recycle:**
```python
pool_recycle=3600  # Recycle connections after 1 hour
# - Prevents using stale connections
# - Some databases close idle connections
# - Recreates connections periodically
```

**Sizing the Pool:**

**Calculation:**
```python
# Formula:
# pool_size = (expected_concurrent_requests × avg_query_time) / response_time

# Example:
# - 100 concurrent requests
# - Average query time: 50ms
# - Desired response time: 100ms
# pool_size = (100 × 0.05) / 0.1 = 50

# In practice:
pool_size=50
max_overflow=10  # 20% of pool_size
```

**Common Issues and Solutions:**

**1. Pool Exhaustion:**

**Problem:** All connections in use, requests wait or timeout

```python
# Symptoms:
# - Slow responses under load
# - "Pool exhausted" errors
# - Requests timing out

# Solutions:
# ✅ Increase pool_size
pool_size=50  # More connections

# ✅ Increase max_overflow
max_overflow=20  # More temporary connections

# ✅ Reduce connection hold time
# Use dependency injection (automatic cleanup)
async def get_db():
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        finally:
            await session.close()  # Always close
```

**2. Stale Connections:**

**Problem:** Database closes idle connections, pool still tries to use them

```python
# ✅ Enable pre-ping
pool_pre_ping=True  # Checks connection before use

# ✅ Recycle connections
pool_recycle=3600  # Recreate after 1 hour
```

**3. Connection Leaks:**

**Problem:** Sessions not properly closed, connections accumulate

```python
# ❌ Bad: Session not closed
async def get_user(user_id: int):
    session = async_session_maker()
    user = await session.get(User, user_id)
    return user  # Session never closed!

# ✅ Good: Proper cleanup with dependency injection
async def get_db():
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()  # Always closed

@app.get("/users/{user_id}")
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    return user  # Session auto-closed
```

**MongoDB Connection Pooling (Motor):**

**Setup:**
```python
from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient(
    "mongodb://localhost:27017",
    maxPoolSize=50,          # Max connections in pool
    minPoolSize=10,          # Min connections to maintain
    maxIdleTimeMS=45000,     # Close idle connections after 45s
    serverSelectionTimeoutMS=5000,  # Timeout for server selection
    connectTimeoutMS=10000   # Connection timeout
)

db = client.myapp

# Dependency
async def get_db():
    yield db
```

**Best Practices:**

**1. Use Dependency Injection:**
```python
# ✅ Good: Automatic session management
@app.get("/users/")
async def list_users(db: AsyncSession = Depends(get_db)):
    return await db.execute(select(User))

# ❌ Bad: Manual session management
@app.get("/users/")
async def list_users():
    session = async_session_maker()
    try:
        return await session.execute(select(User))
    finally:
        await session.close()
```

**2. Commit or Rollback Explicitly:**
```python
async def get_db():
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()  # Commit on success
        except Exception:
            await session.rollback()  # Rollback on error
            raise
        finally:
            await session.close()
```

**3. Monitor Pool Usage:**
```python
from prometheus_client import Gauge

pool_size_gauge = Gauge('db_pool_size', 'Database pool size')
pool_checked_out = Gauge('db_pool_checked_out', 'Connections in use')

# Update metrics in pool event handlers
```

**System Design Consideration**: Connection pooling is crucial for:
1. **Performance**: Reusing connections is much faster than creating new ones
2. **Scalability**: Handling high concurrent load efficiently
3. **Resource Management**: Efficient use of database connections
4. **Reliability**: Preventing connection exhaustion

Connection pooling is essential for high-performance FastAPI applications. It allows reusing database connections, significantly improving performance and enabling applications to handle high concurrent loads. Proper configuration, monitoring, and using dependency injection for automatic resource management are key to effective connection pooling.