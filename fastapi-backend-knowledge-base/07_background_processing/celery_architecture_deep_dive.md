# Celery Architecture: Deep Dive

Understanding Celery's architecture is crucial for production deployments. This guide explains the internals, message flow, and how each component works together.

## Understanding Celery's Purpose

**What is Celery?**
Celery is a distributed task queue that allows you to execute tasks asynchronously across multiple worker processes or machines.

**Why use Celery?**
- Long-running tasks that would block HTTP requests
- Scheduled tasks (like cron jobs)
- Tasks that need to be distributed across multiple servers
- Tasks that need retry logic and error handling

**Real-world analogy:**
Think of Celery like a restaurant kitchen:
- **FastAPI (Waiter)**: Takes orders (requests) from customers
- **Celery Broker (Kitchen Order Board)**: Displays orders for chefs
- **Celery Workers (Chefs)**: Prepare food (process tasks) in parallel
- **Result Backend (Completed Orders Area)**: Stores finished orders

## Architecture Overview

```
┌─────────────┐
│   FastAPI   │ (Client/Producer)
│ Application │
└──────┬──────┘
       │ task.delay()
       ▼
┌─────────────────┐
│  Celery Client  │ (Serializes task)
└──────┬──────────┘
       │ Serialized message
       ▼
┌─────────────────┐
│   Broker        │ (Message Queue)
│  (Redis/Rabbit) │ ────┐
└─────────────────┘     │
                        │ Workers poll for tasks
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌──────────────┐              ┌──────────────┐
│   Worker 1   │              │   Worker 2   │
│ (Processes)  │              │ (Processes)  │
└──────┬───────┘              └──────┬───────┘
       │                              │
       └──────────┬───────────────────┘
                  │ Result
                  ▼
         ┌─────────────────┐
         │ Result Backend  │
         │  (Redis/DB)     │
         └─────────────────┘
```

## Component 1: Celery Client (Producer)

**What it does:**
The Celery client serializes tasks and sends them to the broker.

### Setting Up the Client

```python
# celery_app.py
from celery import Celery

# Create Celery app instance
celery_app = Celery(
    'myapp',  # App name
    broker='redis://localhost:6379/0',  # Message broker URL
    backend='redis://localhost:6379/0',  # Result backend URL
)

# Configure Celery
celery_app.conf.update(
    task_serializer='json',  # How to serialize tasks
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,  # Track when task starts
    task_time_limit=30 * 60,  # Hard timeout: 30 minutes
    task_soft_time_limit=25 * 60,  # Soft timeout: 25 minutes
)
```

**Understanding the configuration:**
- `broker`: Where tasks are queued (Redis/RabbitMQ)
- `backend`: Where results are stored
- `task_serializer`: How task data is encoded (JSON, pickle, etc.)
- `time_limit`: Maximum execution time (kills task if exceeded)
- `soft_time_limit`: Warning time (raises exception, allows cleanup)

### Defining Tasks

```python
@celery_app.task(name='tasks.send_email')
def send_email_task(email: str, subject: str, body: str):
    """
    Celery task definition.
    
    This function becomes a task that can be executed asynchronously.
    """
    # Task implementation
    send_email(email, subject, body)
    return f"Email sent to {email}"

# Alternative: Using bind=True for access to task context
@celery_app.task(bind=True, max_retries=3)
def process_payment_task(self, payment_id: int):
    """
    Task with bind=True gives access to self (task instance).
    
    self contains:
    - self.request: Task request information
    - self.retry(): Method to retry the task
    - self.update_state(): Update task state
    """
    try:
        result = process_payment(payment_id)
        return result
    except Exception as exc:
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=60)
```

**Understanding task decorator:**
- `@celery_app.task`: Marks function as Celery task
- `bind=True`: Passes task instance as first argument (self)
- `max_retries`: Maximum retry attempts
- `name`: Custom task name (useful for versioning)

## Component 2: Broker (Message Queue)

**What it does:**
The broker stores tasks in a queue until workers pick them up.

### Broker Options

**1. Redis (Recommended for most cases):**
```python
# Advantages:
# - Fast
# - Simple setup
# - Good for small to medium workloads
# - Also works as result backend

broker_url = 'redis://localhost:6379/0'
```

**2. RabbitMQ (Better for complex routing):**
```python
# Advantages:
# - More features (routing, exchanges, queues)
# - Better for complex message patterns
# - More reliable for high-volume systems

broker_url = 'amqp://guest:guest@localhost:5672//'
```

### How Messages Flow Through Broker

```
Task Created
    │
    ▼
┌─────────────────┐
│ Serialization   │ JSON format: {"task": "tasks.send_email", "args": [...]}
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Redis Queue    │ List: ["task1", "task2", "task3"]
│  (celery)       │
└────────┬────────┘
         │
         │ Workers poll this queue
         ▼
┌─────────────────┐
│  Worker picks   │
│  up task        │
└─────────────────┘
```

**Understanding queues:**
- Tasks are stored in Redis list or RabbitMQ queue
- Workers poll (check) the queue for new tasks
- First-in-first-out (FIFO) by default
- Can use priority queues for important tasks

### Queue Configuration

```python
celery_app.conf.update(
    # Default queue
    task_default_queue='default',
    task_default_exchange='default',
    task_default_routing_key='default',
    
    # Priority queues
    task_routes={
        'tasks.send_email': {'queue': 'emails', 'priority': 5},
        'tasks.process_payment': {'queue': 'payments', 'priority': 10},  # Higher priority
        'tasks.generate_report': {'queue': 'reports', 'priority': 1},
    },
    
    # Worker assignment
    worker_prefetch_multiplier=4,  # Prefetch 4 tasks at once
)
```

**Understanding priorities:**
- Higher priority tasks are processed first
- Useful for time-sensitive tasks
- Different queues can have different worker pools

## Component 3: Workers

**What they do:**
Workers are processes that execute tasks. They poll the broker for tasks and process them.

### Starting Workers

```bash
# Basic worker
celery -A celery_app worker --loglevel=info

# With concurrency
celery -A celery_app worker --loglevel=info --concurrency=4

# Specific queue
celery -A celery_app worker --loglevel=info -Q emails,payments

# Multiple queues with priorities
celery -A celery_app worker --loglevel=info -Q emails=10,reports=1
```

**Understanding concurrency:**
- `--concurrency=4`: Run 4 worker processes in parallel
- More workers = more tasks processed simultaneously
- Balance: More workers use more memory/CPU

### Worker Types

**1. Prefork (Default - Multiple Processes):**
```bash
celery -A celery_app worker --pool=prefork --concurrency=4
```
- **How it works**: Creates 4 separate Python processes
- **Use when**: CPU-bound tasks or tasks that might crash
- **Pros**: Isolated processes (one crash doesn't affect others)
- **Cons**: Higher memory usage

**Visual representation:**
```
Worker Process
├── Worker 1 (PID 1234) → Task 1
├── Worker 2 (PID 1235) → Task 2
├── Worker 3 (PID 1236) → Task 3
└── Worker 4 (PID 1237) → Task 4
```

**2. Gevent (Green Threads):**
```bash
celery -A celery_app worker --pool=gevent --concurrency=1000
```
- **How it works**: Uses green threads (lightweight, cooperative multitasking)
- **Use when**: I/O-bound tasks (API calls, database queries)
- **Pros**: Can handle thousands of concurrent tasks
- **Cons**: Not suitable for CPU-bound tasks

**3. Solo (Single Process - Testing Only):**
```bash
celery -A celery_app worker --pool=solo
```
- **How it works**: Single process, no concurrency
- **Use when**: Development/testing only

### Worker Lifecycle

```
Worker Starts
    │
    ▼
Connect to Broker
    │
    ▼
Register with Broker (announce availability)
    │
    ▼
┌─────────────────┐
│  Poll Loop      │
│  ────────────   │
│  1. Check queue │
│  2. Get task    │
│  3. Execute     │
│  4. Send result │
│  5. Repeat      │
└─────────────────┘
    │
    ▼
Worker Shuts Down (gracefully finish current tasks)
```

### Worker Internals: Task Execution

```python
# What happens when worker receives a task:

# Step 1: Deserialize task
task_data = json.loads(message)  # {"task": "tasks.send_email", "args": [...]}

# Step 2: Import task function
task_func = import_task(task_data['task'])  # Import from celery_app

# Step 3: Create task request
request = TaskRequest(
    id=task_data['id'],
    task=task_data['task'],
    args=task_data['args'],
    kwargs=task_data['kwargs'],
)

# Step 4: Update task state to STARTED
update_state(state='STARTED')

# Step 5: Execute task
try:
    result = task_func(*args, **kwargs)
    update_state(state='SUCCESS', result=result)
except Exception as exc:
    update_state(state='FAILURE', error=str(exc))
    raise
```

## Component 4: Result Backend

**What it does:**
Stores task results so clients can retrieve them.

### Setting Up Result Backend

```python
celery_app.conf.update(
    result_backend='redis://localhost:6379/0',
    result_expires=3600,  # Results expire after 1 hour
    result_serializer='json',
)
```

### How Results Are Stored

```python
# Task result storage structure (Redis):
# Key: celery-task-meta-{task_id}
# Value: JSON with result data
{
    "status": "SUCCESS",
    "result": "Email sent to user@example.com",
    "traceback": null,
    "children": [],
    "date_done": "2024-01-15T10:30:00"
}
```

### Retrieving Results in FastAPI

```python
from celery.result import AsyncResult
from fastapi import APIRouter

router = APIRouter()

@router.post("/send-email")
async def send_email(email: str, subject: str):
    """Send email asynchronously."""
    # Send task
    task = send_email_task.delay(email, subject, "Body")
    
    return {"task_id": task.id, "status": "pending"}

@router.get("/tasks/{task_id}")
async def get_task_status(task_id: str):
    """Get task result."""
    result = AsyncResult(task_id, app=celery_app)
    
    if result.ready():
        if result.successful():
            return {
                "status": "completed",
                "result": result.result
            }
        else:
            return {
                "status": "failed",
                "error": str(result.result)  # Exception message
            }
    else:
        return {
            "status": result.state,  # PENDING, STARTED, etc.
            "result": None
        }
```

## Message Flow: Complete Example

Let's trace a complete task execution:

### Step 1: Client Sends Task

```python
# In FastAPI
@app.post("/process-order")
async def process_order(order_id: int):
    """Process order in background."""
    task = process_order_task.delay(order_id)
    return {"task_id": task.id}

# What happens:
# 1. Task is serialized to JSON
# 2. Unique task ID is generated: "abc123-def456-..."
# 3. Message is sent to Redis queue "celery"
```

**Message structure:**
```json
{
    "id": "abc123-def456-ghi789",
    "task": "tasks.process_order",
    "args": [12345],
    "kwargs": {},
    "retries": 0,
    "eta": null,
    "expires": null
}
```

### Step 2: Worker Receives Task

```python
# Worker polling loop:
while True:
    # Get message from queue (blocking wait)
    message = redis.blpop('celery', timeout=5)
    
    if message:
        # Deserialize
        task_data = json.loads(message[1])
        
        # Execute task
        execute_task(task_data)
```

### Step 3: Task Execution

```python
# Worker execution:
def execute_task(task_data):
    task_id = task_data['id']
    
    # Update state
    result_backend.store_result(
        task_id,
        state='STARTED',
        result=None
    )
    
    # Execute
    try:
        result = process_order_task(order_id)
        result_backend.store_result(
            task_id,
            state='SUCCESS',
            result=result
        )
    except Exception as exc:
        result_backend.store_result(
            task_id,
            state='FAILURE',
            result=str(exc)
        )
```

### Step 4: Client Retrieves Result

```python
# FastAPI retrieves result:
result = AsyncResult(task_id, app=celery_app)

if result.ready():
    if result.successful():
        print(f"Task completed: {result.result}")
    else:
        print(f"Task failed: {result.result}")
```

## Production Architecture

### Multi-Worker Setup

```
┌─────────────────────────────────────┐
│         FastAPI Application         │
│      (Load Balancer in Front)       │
└──────────────┬──────────────────────┘
               │
               ▼
       ┌───────────────┐
       │   Redis       │
       │   Broker      │
       └───────┬───────┘
               │
    ┌──────────┼──────────┐
    │          │          │
    ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐
│Worker 1│ │Worker 2│ │Worker 3│
│Server 1│ │Server 2│ │Server 3│
└────────┘ └────────┘ └────────┘
```

### Configuration for Production

```python
# Production Celery configuration
celery_app.conf.update(
    # Task execution
    task_acks_late=True,  # Acknowledge after task completion
    task_reject_on_worker_lost=True,  # Retry if worker dies
    
    # Worker settings
    worker_prefetch_multiplier=1,  # Fair task distribution
    worker_max_tasks_per_child=1000,  # Restart worker after 1000 tasks
    
    # Result backend
    result_backend_transport_options={
        'master_name': 'mymaster',  # Redis sentinel
        'visibility_timeout': 3600,
    },
    
    # Monitoring
    worker_send_task_events=True,
    task_send_sent_event=True,
)
```

## Best Practices

1. **Task Idempotency**: Make tasks safe to retry
2. **Timeout Configuration**: Set appropriate time limits
3. **Result Expiration**: Clean up old results
4. **Worker Health**: Monitor worker processes
5. **Queue Separation**: Use different queues for different priorities
6. **Error Handling**: Proper exception handling in tasks

## Troubleshooting

### Task Not Executing

**Check:**
- Workers are running
- Worker is listening to correct queue
- Broker is accessible
- Task name matches exactly

### Tasks Stuck

**Check:**
- Worker is alive
- Task timeout settings
- Dead letter queue for failed tasks

### Memory Issues

**Solutions:**
- Reduce worker concurrency
- Use worker_max_tasks_per_child to restart workers
- Monitor task memory usage

Understanding Celery's architecture helps you build robust, scalable background processing systems!
