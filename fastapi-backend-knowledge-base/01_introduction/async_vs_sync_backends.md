# Async vs Sync Backends

Understanding when and how to use async operations in FastAPI is crucial for building high-performance backends.

## The Fundamental Difference

### Synchronous (Sync) Backends

In synchronous code, each operation **blocks** until it completes:

```python
# Synchronous - blocks the thread: Thread waits for I/O to complete.
@app.get("/users/{user_id}")
def get_user(user_id: int):
    user = db.get_user(user_id)  # Blocks here, thread waiting
    return user  # Only executes after DB call completes
```

**Problems:** One request = one thread. Thread sits idle waiting for I/O (database, API calls, file reads). Limited concurrency (e.g., 1000 threads = high memory usage). CPU underutilized during I/O waits.

### Asynchronous (Async) Backends

In asynchronous code, operations can **yield control** during I/O:

```python
# Asynchronous - doesn't block: Yields control during I/O, handles other requests.
@app.get("/users/{user_id}")
async def get_user(user_id: int):
    user = await db.get_user(user_id)  # Yields control, handles other requests
    return user  # Resumes when DB responds
```

**Benefits:** One thread can handle thousands of concurrent requests. Thread switches to other tasks during I/O waits. Better resource utilization. Higher throughput for I/O-bound operations.

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
# Async allows concurrent operations: Run multiple I/O operations in parallel.
async def get_user_profile(user_id: int):
    # asyncio.gather: Executes all operations concurrently, not sequentially.
    user, orders, preferences = await asyncio.gather(
        db.get_user(user_id),
        db.get_orders(user_id),
        cache.get_preferences(user_id)
    )
    return combine_profile(user, orders, preferences)
```

**Explanation:** `asyncio.gather` runs all operations concurrently. Instead of waiting for each one sequentially (3× wait time), they all execute in parallel (1× wait time).

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
# CPU-bound - use sync or background tasks: Don't block event loop with CPU work.
def calculate_statistics(data: List[float]):
    # Heavy computation - blocks is fine (runs in thread pool)
    return complex_math_operation(data)

# Better: Move to background task: Don't block response.
@app.post("/analyze")
async def analyze_data(data: DataSet):
    # BackgroundTasks: Runs after response is sent, doesn't block.
    task_id = background_tasks.add_task(
        calculate_statistics, 
        data.values
    )
    return {"task_id": task_id}
```

**Explanation:** CPU-bound operations should run in background tasks or thread pools. This prevents blocking the async event loop, which is optimized for I/O operations.

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

**Key Points:** Async is essential for modern, high-performance backends. FastAPI makes it easy: write async code naturally with `async/await`, mix sync and async as needed, achieve high concurrency with minimal resources, and build scalable, efficient APIs.

**Best For:** I/O-bound operations (which most backend APIs are). Async provides significant performance improvements with minimal complexity overhead.

---

## 🎯 Interview Questions: FastAPI

### Q1: Explain the difference between async and sync backends in FastAPI, including when to use each, performance implications, and how FastAPI handles both. Provide detailed examples showing async patterns and best practices.

**Answer:**

**Async vs Sync Overview:**

Understanding async and sync operations in FastAPI is crucial for building high-performance backends. FastAPI supports both patterns, but choosing the right one significantly impacts performance and resource utilization.

**Synchronous (Sync) Backends:**

**How Sync Works:**
In synchronous code, each operation blocks the thread until it completes. The thread sits idle waiting for I/O operations to finish.

**Example:**
```python
# Synchronous - blocks the thread
@app.get("/users/{user_id}")
def get_user(user_id: int):
    user = db.get_user(user_id)  # Blocks here, thread waiting
    orders = db.get_orders(user_id)  # Blocks again
    return {"user": user, "orders": orders}

# Problems:
# - One request = one thread
# - Thread sits idle during I/O waits
# - Limited concurrency (e.g., 1000 threads = high memory)
# - CPU underutilized during I/O
```

**Performance Characteristics:**
```
Sync Backend:
- Each request needs a thread
- 4 CPU cores: ~400-800 concurrent requests max
- Memory: ~8MB per thread × 800 = ~6.4GB
- Response time: Slower under load
- CPU utilization: Low (idle during I/O)
```

**Asynchronous (Async) Backends:**

**How Async Works:**
In asynchronous code, operations can yield control during I/O, allowing the event loop to handle other requests while waiting.

**Example:**
```python
# Asynchronous - doesn't block
@app.get("/users/{user_id}")
async def get_user(user_id: int):
    user = await db.get_user(user_id)  # Yields control, handles other requests
    orders = await db.get_orders(user_id)  # Yields control again
    return {"user": user, "orders": orders}

# Benefits:
# - One event loop handles thousands of requests
# - Yields control during I/O, processes other requests
# - Better resource utilization
# - Higher throughput for I/O-bound operations
```

**Performance Characteristics:**
```
Async Backend:
- All requests share event loop
- Same 4 cores: 10,000+ concurrent requests easily
- Memory: ~50-100MB for event loop
- Response time: Fast, efficient resource usage
- CPU utilization: High (processes other requests during I/O)
```

**When to Use Async:**

**✅ Use Async For:**

**1. I/O-Bound Operations:**
```python
# Database queries
async def get_user(user_id: int):
    user = await db.get_user(user_id)  # I/O-bound
    return user

# HTTP API calls
async def fetch_external_data():
    async with httpx.AsyncClient() as client:
        response = await client.get("https://api.example.com/data")
        return response.json()

# File I/O (with aiofiles)
async def read_file(filename: str):
    async with aiofiles.open(filename, 'r') as f:
        content = await f.read()
        return content

# WebSocket connections
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        data = await websocket.receive_text()
        await websocket.send_text(f"Echo: {data}")
```

**2. High Concurrency Needs:**
```python
# Many simultaneous requests
@app.get("/users/{user_id}")
async def get_user(user_id: int):
    # Can handle thousands of concurrent requests
    user = await db.get_user(user_id)
    return user
```

**3. Parallel Operations:**
```python
# Run multiple I/O operations concurrently
async def get_user_profile(user_id: int):
    # asyncio.gather: Executes all operations concurrently
    user, orders, preferences = await asyncio.gather(
        db.get_user(user_id),
        db.get_orders(user_id),
        cache.get_preferences(user_id)
    )
    return combine_profile(user, orders, preferences)

# Benefits:
# - Instead of: wait for user (100ms) + wait for orders (100ms) + wait for preferences (100ms) = 300ms
# - We get: all execute in parallel = ~100ms total
```

**When NOT to Use Async:**

**❌ Don't Use Async For:**

**1. CPU-Bound Operations:**
```python
# ❌ Bad: CPU-bound work blocks event loop
async def calculate_statistics(data: List[float]):
    # Heavy computation blocks event loop
    result = complex_math_operation(data)  # Blocks!
    return result

# ✅ Good: Use sync or background task
def calculate_statistics(data: List[float]):
    # Heavy computation - runs in thread pool
    return complex_math_operation(data)

# Better: Move to background task
@app.post("/analyze")
async def analyze_data(
    data: DataSet,
    background_tasks: BackgroundTasks
):
    # BackgroundTasks: Runs after response, doesn't block
    task_id = background_tasks.add_task(
        calculate_statistics,
        data.values
    )
    return {"task_id": task_id}
```

**2. Blocking Operations:**
```python
# ❌ Bad: Blocking call in async function
async def bad_example():
    time.sleep(1)  # Blocks event loop!

# ✅ Good: Use async sleep
async def good_example():
    await asyncio.sleep(1)  # Yields control
```

**FastAPI's Approach:**

**FastAPI supports both sync and async:**

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

**Real-World Performance Impact:**

**Scenario: 1000 concurrent requests fetching from database**

**Sync Approach:**
```
- Each request needs a thread
- With 4 CPU cores: ~400-800 concurrent requests max
- Memory: ~8MB per thread × 800 = ~6.4GB just for threads
- Slow response times under load
- CPU sits idle during database waits
```

**Async Approach:**
```
- All requests share event loop
- Same 4 cores: easily handle 10,000+ concurrent requests
- Memory: ~50-100MB for event loop
- Fast response times, efficient resource usage
- CPU processes other requests during database waits
```

**Common Patterns:**

**1. Database Operations:**
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

**2. Multiple External APIs:**
```python
async def fetch_user_data(user_id: int):
    async with httpx.AsyncClient() as client:
        # Run all requests concurrently
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

**3. Background Tasks:**
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

**Best Practices:**

**1. Use async for all I/O operations:**
```python
# ✅ Good: Async database calls
async def get_user(user_id: int):
    return await db.get_user(user_id)

# ✅ Good: Async HTTP requests
async def fetch_data():
    async with httpx.AsyncClient() as client:
        return await client.get("https://api.example.com")
```

**2. Keep CPU-bound work separate:**
```python
# ✅ Good: Use background tasks for CPU work
@app.post("/process")
async def process_data(
    data: DataSet,
    background_tasks: BackgroundTasks
):
    background_tasks.add_task(cpu_intensive_task, data)
    return {"status": "processing"}
```

**3. Choose async-compatible libraries:**
```python
# ✅ Good: Async libraries
- asyncpg for PostgreSQL
- motor for MongoDB
- aioredis for Redis
- httpx for HTTP requests
- aiofiles for file I/O
```

**4. Avoid blocking operations in async code:**
```python
# ❌ Bad: Blocking call
async def bad_example():
    time.sleep(1)  # Blocks event loop!

# ✅ Good: Async sleep
async def good_example():
    await asyncio.sleep(1)  # Yields control
```

**System Design Consideration**: Async vs sync choice impacts:
1. **Performance**: Concurrency and throughput
2. **Resource Usage**: Memory and CPU utilization
3. **Scalability**: Handling high load
4. **Complexity**: Code structure and debugging

Async is essential for modern, high-performance backends. FastAPI makes it easy: write async code naturally with `async/await`, mix sync and async as needed, achieve high concurrency with minimal resources, and build scalable, efficient APIs. Use async for I/O-bound operations and sync or background tasks for CPU-bound work.

