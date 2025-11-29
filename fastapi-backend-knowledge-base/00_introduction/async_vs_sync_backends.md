# Async vs Sync Backends

Understanding when and how to use async operations in FastAPI is crucial for building high-performance backends.

## The Fundamental Difference

### Synchronous (Sync) Backends

In synchronous code, each operation **blocks** until it completes:

```python
# Synchronous - blocks the thread
@app.get("/users/{user_id}")
def get_user(user_id: int):
    user = db.get_user(user_id)  # Blocks here, thread waiting
    return user  # Only executes after DB call completes
```

**Problems:**
- One request = one thread
- Thread sits idle waiting for I/O (database, API calls, file reads)
- Limited concurrency (e.g., 1000 threads = high memory usage)
- CPU underutilized during I/O waits

### Asynchronous (Async) Backends

In asynchronous code, operations can **yield control** during I/O:

```python
# Asynchronous - doesn't block
@app.get("/users/{user_id}")
async def get_user(user_id: int):
    user = await db.get_user(user_id)  # Yields control, handles other requests
    return user  # Resumes when DB responds
```

**Benefits:**
- One thread can handle thousands of concurrent requests
- Thread switches to other tasks during I/O waits
- Better resource utilization
- Higher throughput for I/O-bound operations

## When to Use Async

### ✅ Use Async For:

1. **I/O-bound operations**
   - Database queries (SQL, MongoDB, Redis)
   - HTTP API calls (external services)
   - File I/O operations
   - WebSocket connections

2. **High concurrency needs**
   - Many simultaneous requests
   - Long-polling endpoints
   - Real-time features

3. **Mixed operations**
   - Waiting for multiple services
   - Parallel data fetching

```python
# Async allows concurrent operations
async def get_user_profile(user_id: int):
    user, orders, preferences = await asyncio.gather(
        db.get_user(user_id),
        db.get_orders(user_id),
        cache.get_preferences(user_id)
    )
    return combine_profile(user, orders, preferences)
```

### ❌ Don't Use Async For:

1. **CPU-bound operations**
   - Heavy calculations
   - Image processing
   - Machine learning inference
   - Data transformations

2. **Pure synchronous code**
   - Simple CRUD without async DB drivers
   - Synchronous libraries without async support

```python
# CPU-bound - use sync or background tasks
def calculate_statistics(data: List[float]):
    # Heavy computation - blocks is fine
    return complex_math_operation(data)

# Better: Move to background task
@app.post("/analyze")
async def analyze_data(data: DataSet):
    task_id = background_tasks.add_task(
        calculate_statistics, 
        data.values
    )
    return {"task_id": task_id}
```

## FastAPI's Approach

FastAPI supports **both** sync and async:

```python
# Async endpoint
@app.get("/async-endpoint")
async def async_route():
    result = await async_db_call()
    return result

# Sync endpoint (FastAPI runs it in thread pool)
@app.get("/sync-endpoint")
def sync_route():
    result = sync_db_call()
    return result
```

**Important:** FastAPI automatically runs sync functions in a thread pool, so you won't block the event loop, but async is still more efficient.

## Real-World Performance Impact

### Scenario: 1000 concurrent requests fetching from database

**Sync approach:**
- Each request needs a thread
- With 4 CPU cores: ~400-800 concurrent requests max
- Memory: ~8MB per thread × 800 = ~6.4GB just for threads
- Slow response times under load

**Async approach:**
- All requests share event loop
- Same 4 cores: easily handle 10,000+ concurrent requests
- Memory: ~50-100MB for event loop
- Fast response times, efficient resource usage

## Common Patterns

### 1. Database Operations

```python
# Async SQLAlchemy
from sqlalchemy.ext.asyncio import AsyncSession

@app.get("/users/{user_id}")
async def get_user(
    user_id: int,
    session: AsyncSession = Depends(get_db_session)
):
    result = await session.execute(
        select(User).where(User.id == user_id)
    )
    return result.scalar_one_or_none()
```

### 2. Multiple External APIs

```python
async def fetch_user_data(user_id: int):
    async with httpx.AsyncClient() as client:
        user, orders, analytics = await asyncio.gather(
            client.get(f"/api/users/{user_id}"),
            client.get(f"/api/orders/{user_id}"),
            client.get(f"/api/analytics/{user_id}")
        )
        return {
            "user": user.json(),
            "orders": orders.json(),
            "analytics": analytics.json()
        }
```

### 3. Background Tasks

```python
from fastapi import BackgroundTasks

async def send_email_notification(user_id: int):
    # This runs in background without blocking
    await email_service.send(user_id)

@app.post("/users/")
async def create_user(
    user: UserCreate,
    background_tasks: BackgroundTasks
):
    new_user = await db.create_user(user)
    background_tasks.add_task(send_email_notification, new_user.id)
    return new_user
```

## Best Practices

1. **Use async for all I/O operations**
   - Database calls
   - External API calls
   - File operations (with aiofiles)

2. **Keep CPU-bound work separate**
   - Use background tasks (Celery, RQ)
   - Or process in thread pool

3. **Choose async-compatible libraries**
   - `asyncpg` for PostgreSQL
   - `motor` for MongoDB
   - `aioredis` for Redis
   - `httpx` for HTTP requests

4. **Avoid blocking operations in async code**
   ```python
   # ❌ Bad: Blocking call in async function
   async def bad_example():
       time.sleep(1)  # Blocks event loop!
   
   # ✅ Good: Use async sleep
   async def good_example():
       await asyncio.sleep(1)  # Yields control
   ```

## Migration Path

If you have existing sync code:

1. **Gradual migration**: Start with new endpoints
2. **Use sync endpoints**: FastAPI handles them in thread pool
3. **Replace drivers**: Switch to async database drivers
4. **Refactor incrementally**: Convert endpoints one by one

## Conclusion

Async is essential for modern, high-performance backends. FastAPI makes it easy:
- Write async code naturally with `async/await`
- Mix sync and async as needed
- Achieve high concurrency with minimal resources
- Build scalable, efficient APIs

For I/O-bound operations (which most backend APIs are), async provides significant performance improvements with minimal complexity overhead.

