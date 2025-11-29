# How FastAPI Handles Concurrency: Deep Dive

Understanding FastAPI's concurrency model is crucial for interviews and building scalable applications. This guide explains the internals of how FastAPI handles concurrent requests.

## The Foundation: ASGI and Async/Await

**FastAPI is built on ASGI (Asynchronous Server Gateway Interface):**

```
HTTP Request → ASGI Server (Uvicorn) → FastAPI App → Your Code
```

**Key difference from WSGI:**
- **WSGI (Flask, Django)**: Synchronous, one request per thread
- **ASGI (FastAPI)**: Asynchronous, handles many requests concurrently

## Understanding the Event Loop

**What is an event loop?**
A single thread that manages all async operations by switching between tasks.

**How it works:**
```python
# Event loop timeline
Time 0ms:  Request 1 arrives → Starts DB query (waits for DB)
Time 1ms:  Request 2 arrives → Starts DB query (waits for DB)
Time 2ms:  Request 3 arrives → Starts DB query (waits for DB)
Time 50ms: Request 1's DB responds → Process response → Send to client
Time 51ms: Request 2's DB responds → Process response → Send to client
Time 52ms: Request 3's DB responds → Process response → Send to client
```

All handled by ONE thread switching between tasks!

## Step-by-Step: Request Processing

Let's trace a request through FastAPI:

### 1. Request Arrives

```python
# Uvicorn receives HTTP request
# Creates async task in event loop
# Routes to FastAPI application
```

### 2. FastAPI Route Handler

```python
@app.get("/users/{user_id}")
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    # This function is a coroutine
    # Event loop can pause and resume it
    user = await db.get(User, user_id)  # ← Yields control here
    return user  # ← Resumes here when DB responds
```

**What happens:**
- `await db.get(...)` yields control to event loop
- Event loop handles other requests
- When DB responds, this function resumes

### 3. Concurrent Request Handling

```python
# Multiple requests processed concurrently:

# Request 1: /users/1
async def get_user(...):
    await db.get(...)  # ← Waiting for DB (yielded)
    
# Request 2: /users/2  
async def get_user(...):
    await db.get(...)  # ← Also waiting (yielded)
    
# Request 3: /products/1
async def get_product(...):
    await db.get(...)  # ← Also waiting (yielded)

# Event loop switches between all three
# When DB responds, resumes the appropriate function
```

## Concurrency Models Comparison

### Synchronous (Flask/Django)

```
Thread 1: Request 1 → DB query (blocked) → Response
Thread 2: Request 2 → DB query (blocked) → Response
Thread 3: Request 3 → DB query (blocked) → Response

Problem: Each thread blocked waiting for I/O
Limited by number of threads (1000 threads = high memory)
```

### Asynchronous (FastAPI)

```
Event Loop: Request 1 → DB query (yield)
         → Request 2 → DB query (yield)
         → Request 3 → DB query (yield)
         → (Wait for DB responses)
         → Resume Request 1 → Response
         → Resume Request 2 → Response
         → Resume Request 3 → Response

Benefit: One thread handles thousands of requests
Efficient: CPU not idle during I/O waits
```

## Practical Example: Concurrent Requests

```python
import asyncio
from datetime import datetime

async def slow_operation(name: str, delay: float):
    """Simulates slow I/O operation."""
    print(f"{datetime.now()}: {name} started")
    await asyncio.sleep(delay)  # Simulates database query
    print(f"{datetime.now()}: {name} completed")
    return f"{name} result"

# Sequential (slow)
async def sequential():
    result1 = await slow_operation("Task 1", 1.0)
    result2 = await slow_operation("Task 2", 1.0)
    result3 = await slow_operation("Task 3", 1.0)
    # Total time: 3 seconds

# Concurrent (fast)
async def concurrent():
    results = await asyncio.gather(
        slow_operation("Task 1", 1.0),
        slow_operation("Task 2", 1.0),
        slow_operation("Task 3", 1.0)
    )
    # Total time: 1 second (all run in parallel)
```

## Gunicorn + Uvicorn Workers

**For production, you run multiple workers:**

```
Gunicorn Master Process
├── Worker 1 (Uvicorn) → Event Loop → Handles requests
├── Worker 2 (Uvicorn) → Event Loop → Handles requests
├── Worker 3 (Uvicorn) → Event Loop → Handles requests
└── Worker 4 (Uvicorn) → Event Loop → Handles requests

Each worker has its own event loop
Each worker can handle 1000s of concurrent requests
Total: 4 workers × 1000s requests = massive concurrency
```

## Interview Answers

### "How does FastAPI handle concurrency?"

**Answer structure:**
1. **Built on ASGI** - Asynchronous server interface
2. **Event loop** - Single thread manages multiple requests
3. **Async/await** - Functions yield during I/O, allowing other tasks
4. **Non-blocking** - CPU never idle during I/O waits
5. **Scalable** - One process handles thousands of requests

**Example answer:**
"FastAPI handles concurrency through async/await and an event loop. When a request arrives, the route handler is a coroutine. When it hits an `await` (like a database query), it yields control back to the event loop, which can handle other requests. When the database responds, that coroutine resumes. This allows one thread to handle thousands of concurrent requests efficiently, unlike synchronous frameworks that need one thread per request."

### "What's the difference between async and threading?"

**Key points:**
- **Threading**: Multiple threads, OS-managed, higher memory overhead
- **Async**: Single thread, application-managed, lower overhead
- **Async better for**: I/O-bound (database, APIs)
- **Threading better for**: CPU-bound (calculations)

## Summary

FastAPI concurrency:
- ✅ Event loop manages all async operations
- ✅ Single thread handles thousands of requests
- ✅ Non-blocking I/O operations
- ✅ Efficient resource usage
- ✅ Gunicorn workers for multi-core utilization

Understanding this helps you build and explain scalable applications!

