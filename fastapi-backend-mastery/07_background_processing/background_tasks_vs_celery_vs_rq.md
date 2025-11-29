# Background Tasks: FastAPI vs Celery vs RQ

Choosing the right background task system is crucial. This guide explains when to use FastAPI's built-in BackgroundTasks versus Celery or RQ for more complex scenarios.

## Understanding the Options

**Three main options:**
1. **FastAPI BackgroundTasks** - Built-in, simple
2. **Celery** - Full-featured, powerful
3. **RQ (Redis Queue)** - Simple, Redis-based

Let's understand each deeply.

## FastAPI BackgroundTasks

### What It Is

FastAPI's built-in, simple background task system. Tasks run in the same process after the response is sent.

### How It Works

```python
from fastapi import BackgroundTasks

def send_email(email: str, message: str):
    """Background task - runs after response sent."""
    print(f"Sending email to {email}: {message}")
    # Email sending logic here

@app.post("/signup")
async def signup(
    email: str,
    background_tasks: BackgroundTasks
):
    # Create user immediately
    user = create_user(email)
    
    # Queue email to send after response
    background_tasks.add_task(send_email, email, "Welcome!")
    
    return {"user_id": user.id}  # Response sent immediately
    # Email sent after response (doesn't block user)
```

**Understanding the flow:**
1. Request comes in
2. User is created
3. Email task is queued
4. Response is sent to client
5. Email is sent in background

### When to Use BackgroundTasks

**✅ Use when:**
- Simple, short-running tasks
- Tasks tied to HTTP request lifecycle
- No need for task persistence
- No need for task monitoring
- Tasks run in same process (simpler)

**❌ Don't use when:**
- Long-running tasks (minutes/hours)
- Need task persistence (survive restarts)
- Need task monitoring/retry
- Need distributed workers
- Need scheduled tasks

### Limitations

```python
# ❌ Problems with BackgroundTasks:

# 1. No persistence - tasks lost on restart
# 2. No retry mechanism
# 3. No monitoring
# 4. Same process - blocks if task is slow
# 5. Can't scale across servers
```

## Celery

### What It Is

Distributed task queue with powerful features. Industry standard for complex background processing.

### Architecture

```
FastAPI → Celery Broker (Redis/RabbitMQ) → Celery Workers
              ↓
         Task Queue
              ↓
    Worker 1  Worker 2  Worker 3
```

**How it works:**
1. FastAPI sends task to broker
2. Broker queues task
3. Workers pick up tasks
4. Workers process tasks independently

### Setup

```python
# celery_app.py
from celery import Celery

celery_app = Celery(
    "myapp",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0"
)

@celery_app.task
def send_email_task(email: str, message: str):
    """Celery task definition."""
    print(f"Sending email to {email}: {message}")
    # Email sending logic
    return "Email sent"

# In FastAPI
from celery_app import send_email_task

@app.post("/signup")
async def signup(email: str):
    user = create_user(email)
    
    # Send task to Celery
    send_email_task.delay(email, "Welcome!")
    # Or with result tracking:
    # result = send_email_task.delay(email, "Welcome!")
    # task_id = result.id
    
    return {"user_id": user.id}
```

### Celery Features

**1. Task Persistence**
- Tasks survive server restarts
- Stored in broker (Redis/RabbitMQ)

**2. Retry with Backoff**
```python
@celery_app.task(
    autoretry_for=(Exception,),
    retry_kwargs={'max_retries': 3, 'countdown': 60}
)
def process_payment(payment_id: int):
    # Automatically retries on failure
    pass
```

**3. Task Monitoring**
```python
# Check task status
from celery.result import AsyncResult

task_id = send_email_task.delay(email, "Welcome!").id
result = AsyncResult(task_id, app=celery_app)

if result.ready():
    print(result.result)
```

**4. Scheduled Tasks**
```python
from celery.schedules import crontab

celery_app.conf.beat_schedule = {
    'daily-report': {
        'task': 'tasks.generate_daily_report',
        'schedule': crontab(hour=0, minute=0),  # Midnight
    },
}
```

**5. Distributed Workers**
- Run workers on multiple servers
- Automatic load balancing
- Horizontal scaling

### When to Use Celery

**✅ Use when:**
- Long-running tasks (minutes to hours)
- Need task persistence
- Need retry mechanisms
- Need task monitoring
- Need scheduled tasks (cron-like)
- Need distributed workers
- Complex task workflows

**❌ Overkill when:**
- Simple, short tasks
- Tasks tied to request lifecycle
- Don't need persistence/monitoring

## RQ (Redis Queue)

### What It Is

Simple Python library for background jobs using Redis. Simpler than Celery.

### Setup

```python
# rq_worker.py
from redis import Redis
from rq import Queue
import redis

redis_conn = Redis()
q = Queue('default', connection=redis_conn)

def send_email_task(email: str, message: str):
    """Task function."""
    print(f"Sending email to {email}: {message}")

# In FastAPI
from rq import Queue
from redis import Redis

redis_conn = Redis()
q = Queue('default', connection=redis_conn)

@app.post("/signup")
async def signup(email: str):
    user = create_user(email)
    
    # Enqueue task
    job = q.enqueue(send_email_task, email, "Welcome!")
    task_id = job.id
    
    return {"user_id": user.id, "task_id": task_id}
```

**Run worker separately:**
```bash
rq worker default
```

### RQ Features

**1. Simple and Lightweight**
- Less overhead than Celery
- Easy to understand
- Good for small to medium projects

**2. Built on Redis**
- Uses Redis as broker and result store
- Simple deployment (just Redis needed)

**3. Basic Monitoring**
```python
from rq.job import Job

job = Job.fetch(job_id, connection=redis_conn)
print(job.status)  # queued, started, finished, failed
```

### When to Use RQ

**✅ Use when:**
- Simpler than Celery needed
- Already using Redis
- Medium complexity tasks
- Python-only (no multi-language needed)

**❌ Don't use when:**
- Need complex scheduling
- Need advanced retry logic
- Need distributed workflows

## Decision Matrix

| Feature | BackgroundTasks | RQ | Celery |
|---------|----------------|-----|--------|
| **Complexity** | ✅ Simple | ⚠️ Medium | ❌ Complex |
| **Persistence** | ❌ No | ✅ Yes | ✅ Yes |
| **Retry** | ❌ No | ⚠️ Basic | ✅ Advanced |
| **Monitoring** | ❌ No | ⚠️ Basic | ✅ Excellent |
| **Scheduling** | ❌ No | ⚠️ Limited | ✅ Full (Beat) |
| **Distributed** | ❌ No | ✅ Yes | ✅ Yes |
| **Setup** | ✅ None | ⚠️ Redis | ⚠️ Broker + Workers |
| **Best For** | Simple tasks | Medium projects | Enterprise |

## When to Use Each

### Use FastAPI BackgroundTasks When:

```python
# ✅ Perfect use cases:
- Sending welcome emails
- Logging analytics events
- Updating counters
- Simple notifications
- Short cleanup tasks
```

### Use RQ When:

```python
# ✅ Good use cases:
- Image processing
- PDF generation
- Data exports
- Moderate complexity tasks
- Need persistence but not complex features
```

### Use Celery When:

```python
# ✅ Best for:
- Video processing
- Complex data pipelines
- Scheduled reports
- Long-running computations
- Enterprise-grade requirements
- Need advanced monitoring/retry
```

## Practical Examples

### Example 1: Email Sending (All Three)

**FastAPI BackgroundTasks:**
```python
@app.post("/signup")
async def signup(email: str, bg: BackgroundTasks):
    user = create_user(email)
    bg.add_task(send_email, email, "Welcome!")
    return user
```

**RQ:**
```python
@app.post("/signup")
async def signup(email: str):
    user = create_user(email)
    q.enqueue(send_email_task, email, "Welcome!")
    return user
```

**Celery:**
```python
@app.post("/signup")
async def signup(email: str):
    user = create_user(email)
    send_email_task.delay(email, "Welcome!")
    return user
```

### Example 2: Long-Running Task (Celery Only)

```python
@celery_app.task
def process_large_dataset(file_path: str):
    """Takes 30 minutes - needs Celery."""
    # Process file
    # Generate reports
    # Send notifications
    return "Processing complete"

@app.post("/upload")
async def upload_file(file: UploadFile):
    # Save file
    file_path = save_file(file)
    
    # Queue long-running task
    task = process_large_dataset.delay(file_path)
    
    return {"task_id": task.id}
```

## Summary

**FastAPI BackgroundTasks:**
- Built-in, simple
- Good for request-tied tasks
- No persistence/monitoring

**RQ:**
- Simple distributed tasks
- Redis-based
- Good middle ground

**Celery:**
- Enterprise-grade
- Full-featured
- Best for complex workflows

Choose based on your needs: simple → BackgroundTasks, medium → RQ, complex → Celery!

