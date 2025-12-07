# 02. Celery Mastery: Distributed Task Queue

## 1. Introduction

**Celery** is the industry standard for Python background tasks. It's powerful, mature, and integrates perfectly with FastAPI.

It requires two things: **A Broker** (to send messages - Redis/RabbitMQ) and **A Backend** (to store results - Redis/Database).

---

## 2. Setting up with FastAPI

Project Structure:
```
project/
  main.py
  worker.py  <-- Celery App definition
  tasks.py   <-- Actual task logic
```

### `worker.py`
```python
from celery import Celery

# Configure Celery: Broker sends tasks, Backend stores results.
celery_app = Celery(
    "worker",
    broker="redis://localhost:6379/0",  # Message queue (where tasks are sent)
    backend="redis://localhost:6379/0"  # Result storage (where results are stored)
)

# Optional: Configure default task settings (JSON serialization, timezone).
celery_app.conf.update(
    task_serializer="json",  # Serialize tasks as JSON
    accept_content=["json"],  # Only accept JSON
    result_serializer="json",  # Serialize results as JSON
    timezone="UTC",  # Use UTC timezone
    enable_utc=True,  # Enable UTC
)
```

### `tasks.py`
```python
import time
from .worker import celery_app

# Celery task: Runs in background worker process.
@celery_app.task(name="send_email_task")
def send_email_task(email: str, subject: str):
    # Simulate long running process: This runs in worker, not blocking API.
    time.sleep(5)
    return f"Email sent to {email} with subject {subject}"
```

### `main.py` (FastAPI)
```python
from fastapi import FastAPI
from .tasks import send_email_task

app = FastAPI()

@app.post("/send-email")
# .delay(): Pushes task to queue, returns immediately (non-blocking).
def send_email(email: str):
    # .delay() is the magic method to push to queue: Returns immediately.
    task = send_email_task.delay(email, "Welcome!")
    return {"task_id": task.id, "status": "Processing"}  # Task runs in background
```

---

## 3. Advanced Patterns

### Retries (Resilience)
Network glitches happen. Celery can auto-retry failed tasks.

```python
# Retry task: Automatically retries on failure with exponential backoff.
@celery_app.task(bind=True, max_retries=3, default_retry_delay=10)
def unstable_task(self, data):
    try:
        # Do something risky: Network calls, external APIs, etc.
        process_payment(data)
    except ConnectionError as exc:
        # Retry in 10s, 20s, 40s (Exponential Backoff): Prevents overwhelming failing service.
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)
```

### Chains (Workflows)
Execute tasks in a specific order.
`Task A -> Task B -> Task C`

```python
from celery import chain
from .tasks import fetch_data, process_data, save_data

# Chain: Execute tasks in sequence (output of one becomes input of next).
workflow = chain(fetch_data.s(), process_data.s(), save_data.s())
# The output of fetch_data is passed as input to process_data, etc.
workflow.apply_async()  # Start the chain
```

### Periodic Tasks (Celery Beat)
Run a task every Monday at 8 AM.

```python
from celery.schedules import crontab

celery_app.conf.beat_schedule = {
    "daily-report": {
        "task": "generate_report_task",
        "schedule": crontab(hour=8, minute=0), # Every day at 8am
    },
}
```

---

## 4. Running It

You need to run the FastAPI server AND the Celery worker.

**Terminal 1 (API):**
```bash
uvicorn main:app --reload
```

**Terminal 2 (Worker):**
```bash
# -A points to the file where celery_app is defined
# --loglevel=info to see what's happening
celery -A project.worker worker --loglevel=info
```

**Terminal 3 (Beat - Optional for periodic tasks):**
```bash
celery -A project.worker beat --loglevel=info
```

### Monitoring
Use **Flower**, a web UI for Celery.
```bash
pip install flower
celery -A project.worker flower
```
Visit `localhost:5555` to see active tasks, success rates, and worker health.

---

## 🎯 Interview Questions: FastAPI

### Q1: Explain Celery for background tasks in FastAPI, including how it works, broker and backend setup, task definition, retries, chains, and monitoring. Provide detailed examples showing a complete Celery implementation with FastAPI.

**Answer:**

**Celery Overview:**

Celery is a distributed task queue system for Python that allows you to run tasks asynchronously in the background. It's essential for handling long-running operations, scheduled tasks, and distributed processing in FastAPI applications.

**Why Celery:**

**Without Celery (Blocking):**
```python
# ❌ Bad: Blocks API during long operation
@app.post("/send-email")
async def send_email(email: str):
    # Blocks for 5 seconds - API unresponsive
    time.sleep(5)
    send_email_service(email)
    return {"status": "sent"}
# Problem: API blocked, can't handle other requests
```

**With Celery (Non-Blocking):**
```python
# ✅ Good: Returns immediately, task runs in background
@app.post("/send-email")
async def send_email(email: str):
    task = send_email_task.delay(email)
    return {"task_id": task.id, "status": "processing"}
# API returns immediately, task processes in worker
```

**Celery Architecture:**

**Components:**
```
1. FastAPI Application: Sends tasks to broker
2. Broker (Redis/RabbitMQ): Message queue storing tasks
3. Celery Workers: Process tasks from broker
4. Backend (Redis/Database): Stores task results
```

**Visual Flow:**
```
FastAPI App → Broker → Worker → Backend
   (send)    (queue)  (process) (store result)
```

**Setting Up Celery:**

**1. Celery App Configuration:**
```python
from celery import Celery

# Create Celery app
celery_app = Celery(
    "worker",
    broker="redis://localhost:6379/0",  # Message queue
    backend="redis://localhost:6379/0"  # Result storage
)

# Configure settings
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,  # Track when task starts
    task_time_limit=30,  # Hard time limit (kills task)
    task_soft_time_limit=25,  # Soft limit (raises exception)
    worker_prefetch_multiplier=4,  # Prefetch tasks
    worker_max_tasks_per_child=1000  # Restart worker after N tasks
)
```

**2. Task Definition:**
```python
from .worker import celery_app
import time

@celery_app.task(name="send_email_task", bind=True)
def send_email_task(self, email: str, subject: str):
    """
    Celery task: Runs in background worker.
    
    Args:
        self: Task instance (needed for bind=True)
        email: Recipient email
        subject: Email subject
    
    Returns:
        Task result
    """
    try:
        # Simulate long operation
        time.sleep(5)
        
        # Actual email sending logic
        send_email_service(email, subject)
        
        return f"Email sent to {email}"
    
    except Exception as exc:
        # Log error
        self.update_state(
            state="FAILURE",
            meta={"error": str(exc)}
        )
        raise
```

**3. FastAPI Integration:**
```python
from fastapi import FastAPI
from .tasks import send_email_task

app = FastAPI()

@app.post("/send-email")
async def send_email(email: str):
    """
    Send email asynchronously using Celery.
    
    Returns immediately with task ID.
    """
    # .delay() pushes task to queue, returns immediately
    task = send_email_task.delay(email, "Welcome!")
    
    return {
        "task_id": task.id,
        "status": "processing",
        "message": "Email queued for sending"
    }

@app.get("/task/{task_id}")
async def get_task_status(task_id: str):
    """Get task status and result."""
    from celery.result import AsyncResult
    
    task_result = AsyncResult(task_id, app=celery_app)
    
    if task_result.ready():
        if task_result.successful():
            return {
                "status": "completed",
                "result": task_result.result
            }
        else:
            return {
                "status": "failed",
                "error": str(task_result.result)
            }
    else:
        return {
            "status": task_result.state,  # PENDING, STARTED, etc.
            "message": "Task still processing"
        }
```

**Task Retries:**

**Automatic Retries:**
```python
@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=10,
    autoretry_for=(ConnectionError, TimeoutError)
)
def unstable_task(self, data):
    """
    Task with automatic retries.
    
    Retries on ConnectionError or TimeoutError.
    """
    try:
        # Risky operation: Network call, external API
        result = external_api_call(data)
        return result
    
    except (ConnectionError, TimeoutError) as exc:
        # Exponential backoff: 10s, 20s, 40s
        countdown = 2 ** self.request.retries
        
        raise self.retry(
            exc=exc,
            countdown=countdown,
            max_retries=3
        )
```

**Task Chains (Workflows):**
```python
from celery import chain
from .tasks import fetch_data, process_data, save_data

@app.post("/process-workflow")
async def process_workflow(data_id: int):
    """
    Execute tasks in sequence.
    
    Task A → Task B → Task C
    Output of one becomes input of next.
    """
    # Chain: Execute in sequence
    workflow = chain(
        fetch_data.s(data_id),      # Step 1: Fetch
        process_data.s(),            # Step 2: Process (receives fetch result)
        save_data.s()               # Step 3: Save (receives process result)
    )
    
    # Start chain
    result = workflow.apply_async()
    
    return {
        "workflow_id": result.id,
        "status": "started"
    }
```

**Periodic Tasks (Celery Beat):**
```python
from celery.schedules import crontab

# Configure periodic tasks
celery_app.conf.beat_schedule = {
    "daily-report": {
        "task": "generate_report_task",
        "schedule": crontab(hour=8, minute=0),  # Every day at 8 AM
    },
    "weekly-cleanup": {
        "task": "cleanup_old_data_task",
        "schedule": crontab(hour=2, minute=0, day_of_week=1),  # Monday 2 AM
    },
    "hourly-stats": {
        "task": "update_statistics_task",
        "schedule": 3600.0,  # Every hour (in seconds)
    },
}

# Run beat scheduler
# celery -A project.worker beat --loglevel=info
```

**Monitoring with Flower:**
```python
# Install: pip install flower
# Run: celery -A project.worker flower

# Access at: http://localhost:5555

# Features:
# - Active tasks
# - Task history
# - Worker status
# - Success/failure rates
# - Task execution times
```

**Best Practices:**

**1. Task Idempotency:**
```python
@celery_app.task
def idempotent_task(data_id: int):
    """Task that can be safely retried."""
    # Check if already processed
    if is_already_processed(data_id):
        return "Already processed"
    
    # Process and mark as done
    process_data(data_id)
    mark_as_processed(data_id)
    
    return "Processed"
```

**2. Error Handling:**
```python
@celery_app.task(bind=True)
def robust_task(self, data):
    """Task with comprehensive error handling."""
    try:
        return process_data(data)
    
    except RetryableError as exc:
        # Retry on transient errors
        raise self.retry(exc=exc, countdown=60)
    
    except PermanentError as exc:
        # Don't retry on permanent errors
        logger.error(f"Permanent error: {exc}")
        return {"error": str(exc)}
    
    except Exception as exc:
        # Log unexpected errors
        logger.exception("Unexpected error")
        raise
```

**3. Task Prioritization:**
```python
# High priority task
@celery_app.task(priority=9)
def high_priority_task(data):
    return process_urgent(data)

# Low priority task
@celery_app.task(priority=1)
def low_priority_task(data):
    return process_background(data)
```

**System Design Consideration**: Celery provides:
1. **Scalability**: Distribute tasks across multiple workers
2. **Reliability**: Retries, error handling, monitoring
3. **Flexibility**: Chains, groups, periodic tasks
4. **Performance**: Non-blocking API responses

Celery is essential for background task processing in FastAPI. Understanding broker/backend setup, task definition, retries, chains, and monitoring is crucial for building scalable, reliable applications. Always design tasks to be idempotent and handle errors gracefully.

---

### Q2: Explain when to use Celery vs FastAPI BackgroundTasks, task prioritization, worker scaling, and monitoring strategies. Discuss trade-offs and best practices for production deployments.

**Answer:**

**Celery vs FastAPI BackgroundTasks:**

**FastAPI BackgroundTasks (Simple Cases):**
```python
from fastapi import BackgroundTasks

@app.post("/send-email")
async def send_email(
    email: str,
    background_tasks: BackgroundTasks
):
    """Use for simple, short-running tasks."""
    background_tasks.add_task(send_email_simple, email)
    return {"status": "queued"}

# When to use:
# - Simple tasks (< 30 seconds)
# - No retry needed
# - No task tracking needed
# - Single server deployment
```

**Celery (Complex Cases):**
```python
@app.post("/send-email")
async def send_email(email: str):
    """Use for complex, long-running tasks."""
    task = send_email_task.delay(email)
    return {"task_id": task.id}

# When to use:
# - Long-running tasks (> 30 seconds)
# - Need retries
# - Need task tracking
# - Distributed workers
# - Scheduled tasks
# - Task prioritization
```

**Task Prioritization:**

**Priority Levels:**
```python
# High priority (urgent)
@celery_app.task(priority=9)
def urgent_task(data):
    return process_urgent(data)

# Normal priority
@celery_app.task(priority=5)
def normal_task(data):
    return process_normal(data)

# Low priority (background)
@celery_app.task(priority=1)
def background_task(data):
    return process_background(data)
```

**Worker Scaling:**

**Horizontal Scaling:**
```bash
# Run multiple workers on different machines
# Worker 1
celery -A project.worker worker --hostname=worker1@%h

# Worker 2
celery -A project.worker worker --hostname=worker2@%h

# Worker 3
celery -A project.worker worker --hostname=worker3@%h
```

**Vertical Scaling:**
```python
# Configure worker concurrency
celery -A project.worker worker --concurrency=4  # 4 processes

# Auto-scaling
celery -A project.worker worker --autoscale=10,3  # Max 10, min 3
```

**Monitoring Strategies:**

**1. Flower (Web UI):**
```bash
celery -A project.worker flower
# Access: http://localhost:5555
```

**2. Prometheus Metrics:**
```python
from celery.signals import task_prerun, task_postrun

@task_prerun.connect
def task_prerun_handler(sender=None, task_id=None, **kwargs):
    # Track task start
    metrics.task_started.inc()

@task_postrun.connect
def task_postrun_handler(sender=None, task_id=None, state=None, **kwargs):
    # Track task completion
    if state == "SUCCESS":
        metrics.task_success.inc()
    else:
        metrics.task_failure.inc()
```

**3. Logging:**
```python
import logging

logger = logging.getLogger(__name__)

@celery_app.task
def logged_task(data):
    logger.info(f"Processing task with data: {data}")
    try:
        result = process(data)
        logger.info(f"Task completed: {result}")
        return result
    except Exception as e:
        logger.error(f"Task failed: {e}", exc_info=True)
        raise
```

**Production Best Practices:**

**1. Connection Pooling:**
```python
# Use connection pools for database
from sqlalchemy.pool import QueuePool

# Configure worker pool
celery_app.conf.worker_pool = "prefork"
celery_app.conf.worker_max_tasks_per_child = 1000
```

**2. Task Time Limits:**
```python
@celery_app.task(
    time_limit=300,  # Hard limit (kills task)
    soft_time_limit=240  # Soft limit (raises exception)
)
def time_limited_task(data):
    return process_with_timeout(data)
```

**3. Result Expiration:**
```python
@celery_app.task(
    result_expires=3600  # Results expire after 1 hour
)
def task_with_expiry(data):
    return process(data)
```

**System Design Consideration**: Production Celery requires:
1. **Monitoring**: Flower, Prometheus, logging
2. **Scaling**: Horizontal and vertical scaling
3. **Reliability**: Retries, error handling, time limits
4. **Performance**: Connection pooling, task prioritization

Understanding when to use Celery vs BackgroundTasks, task prioritization, worker scaling, and monitoring is essential for production deployments. Always monitor task execution, scale workers based on load, and implement proper error handling and retries.

