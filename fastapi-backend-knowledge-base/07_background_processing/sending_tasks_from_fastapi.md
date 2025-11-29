# Sending Tasks from FastAPI to Celery: Complete Integration Guide

This comprehensive guide shows you how to integrate Celery with FastAPI, covering task creation, sending, tracking, and best practices.

## Understanding the Integration

**Why Celery with FastAPI?**
- FastAPI handles HTTP requests (fast, async)
- Celery handles background tasks (long-running, scheduled)
- Together: Responsive API + powerful background processing

**Architecture:**
```
HTTP Request → FastAPI Endpoint → Enqueue Task → Return Immediately
                                      ↓
                              Celery Worker Processes Task
                                      ↓
                              Result Stored (optional)
```

## Step 1: Celery Application Setup

### Basic Celery Setup

```python
# celery_app.py
from celery import Celery

# Create Celery instance
celery_app = Celery(
    'myapp',  # Application name
    broker='redis://localhost:6379/0',  # Message broker
    backend='redis://localhost:6379/0'  # Result backend
)

# Configure Celery
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
)

# Define tasks
@celery_app.task(name='tasks.send_email')
def send_email_task(email: str, subject: str, body: str):
    """Send email asynchronously."""
    # Email sending logic
    print(f"Sending email to {email}")
    # Actual implementation:
    # send_email_via_smtp(email, subject, body)
    return f"Email sent to {email}"
```

### Production Configuration

```python
# celery_app.py
from celery import Celery
from celery.schedules import crontab

celery_app = Celery(
    'myapp',
    broker='redis://localhost:6379/0',
    backend='redis://localhost:6379/0'
)

# Production settings
celery_app.conf.update(
    # Serialization
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    
    # Timezone
    timezone='UTC',
    enable_utc=True,
    
    # Task settings
    task_track_started=True,  # Track when task starts
    task_time_limit=30 * 60,  # 30 minute hard timeout
    task_soft_time_limit=25 * 60,  # 25 minute soft timeout
    
    # Result backend
    result_expires=3600,  # Results expire after 1 hour
    
    # Worker settings
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000,
    
    # Beat schedule (periodic tasks)
    beat_schedule={
        'daily-report': {
            'task': 'tasks.generate_daily_report',
            'schedule': crontab(hour=0, minute=0),  # Midnight
        },
        'cleanup-old-data': {
            'task': 'tasks.cleanup_old_data',
            'schedule': crontab(hour=2, minute=0),  # 2 AM
        },
    },
)
```

## Step 2: FastAPI Integration

### Basic Integration

```python
# main.py
from fastapi import FastAPI
from celery_app import send_email_task

app = FastAPI()

@app.post("/users")
async def create_user(user_data: UserCreate):
    """Create user and send welcome email."""
    # Create user in database
    user = await create_user_in_db(user_data)
    
    # Send task to Celery (non-blocking)
    task = send_email_task.delay(
        email=user.email,
        subject="Welcome!",
        body="Thanks for joining our platform"
    )
    
    return {
        "user_id": user.id,
        "message": "User created successfully",
        "task_id": task.id  # For tracking
    }
```

**Understanding `.delay()`:**
- Returns immediately (doesn't wait for task)
- Returns `AsyncResult` object with task ID
- Task is queued in broker
- Worker will process it asynchronously

### Dependency Injection Pattern

```python
from fastapi import Depends
from celery import Celery

# Dependency to get Celery app
def get_celery_app() -> Celery:
    """Dependency to get Celery application."""
    return celery_app

@app.post("/send-notification")
async def send_notification(
    notification: NotificationCreate,
    celery: Celery = Depends(get_celery_app)
):
    """Send notification using Celery."""
    # Access tasks via Celery app
    task = celery.send_task(
        'tasks.send_email',
        args=[notification.email, notification.subject, notification.body]
    )
    
    return {"task_id": task.id}
```

## Step 3: Task Status Tracking

### Simple Status Endpoint

```python
from celery.result import AsyncResult
from fastapi import APIRouter, HTTPException

router = APIRouter()

@router.get("/tasks/{task_id}/status")
async def get_task_status(task_id: str):
    """Get task execution status."""
    result = AsyncResult(task_id, app=celery_app)
    
    return {
        "task_id": task_id,
        "status": result.state,  # PENDING, STARTED, SUCCESS, FAILURE
        "result": result.result if result.ready() else None
    }
```

### Comprehensive Status Endpoint

```python
@router.get("/tasks/{task_id}")
async def get_task_details(task_id: str):
    """Get comprehensive task details."""
    result = AsyncResult(task_id, app=celery_app)
    
    response = {
        "task_id": task_id,
        "status": result.state,
        "ready": result.ready(),
    }
    
    if result.ready():
        if result.successful():
            response.update({
                "status": "success",
                "result": result.result,
                "completed_at": result.date_done.isoformat() if result.date_done else None
            })
        else:
            response.update({
                "status": "failure",
                "error": str(result.info),
                "traceback": result.traceback
            })
    else:
        # Task still running
        if result.state == 'STARTED':
            # Get progress if available
            if isinstance(result.info, dict):
                response["progress"] = result.info.get('progress')
                response["current"] = result.info.get('current')
                response["total"] = result.info.get('total')
    
    return response
```

## Step 4: Different Ways to Send Tasks

### Method 1: Using .delay() (Simplest)

```python
# Simple way - positional arguments
task = send_email_task.delay(email, subject, body)

# Keyword arguments
task = send_email_task.delay(
    email=email,
    subject=subject,
    body=body
)
```

### Method 2: Using .apply_async() (More Control)

```python
# With options
task = send_email_task.apply_async(
    args=[email, subject, body],
    countdown=10,  # Execute after 10 seconds
    expires=3600,  # Expire if not executed within 1 hour
    priority=5,    # Higher priority
    queue='emails' # Specific queue
)

# Scheduled execution
from datetime import datetime, timedelta

task = send_email_task.apply_async(
    args=[email, subject, body],
    eta=datetime.utcnow() + timedelta(hours=1)  # Execute in 1 hour
)
```

### Method 3: Using send_task() (Dynamic)

```python
# Send task by name (useful when task might not be imported)
task = celery_app.send_task(
    'tasks.send_email',
    args=[email, subject, body],
    kwargs={}
)
```

## Step 5: Task Chaining and Grouping

### Chaining Tasks (Sequential)

```python
from celery import chain

# Execute tasks in sequence
workflow = chain(
    process_data_task.s(data),
    analyze_results_task.s(),
    send_report_task.s()
)

result = workflow.apply_async()
# Tasks execute one after another
```

### Grouping Tasks (Parallel)

```python
from celery import group

# Execute multiple tasks in parallel
job = group(
    send_email_task.s(email1, subject, body),
    send_email_task.s(email2, subject, body),
    send_email_task.s(email3, subject, body)
)

result = job.apply_async()
# All tasks execute simultaneously
```

### Chords (Parallel + Final Task)

```python
from celery import chord

# Execute tasks in parallel, then a callback
callback = send_summary_task.s()
header = group(
    process_chunk_task.s(chunk1),
    process_chunk_task.s(chunk2),
    process_chunk_task.s(chunk3)
)

result = chord(header)(callback)
# All chunks process in parallel, then summary task runs
```

## Step 6: Real-World Example: User Registration Flow

```python
from fastapi import APIRouter, Depends
from celery import chain, group
from celery.result import AsyncResult

router = APIRouter()

@router.post("/register")
async def register_user(user_data: UserCreate):
    """Complete user registration with background tasks."""
    # Step 1: Create user (synchronous)
    user = await create_user_in_db(user_data)
    
    # Step 2: Chain background tasks
    workflow = chain(
        # Task 1: Send welcome email
        send_welcome_email_task.s(user.id, user.email),
        
        # Task 2: Create user profile (after email sent)
        create_user_profile_task.s(user.id),
        
        # Task 3: Send to marketing system (after profile created)
        sync_to_marketing_task.s(user.id)
    )
    
    # Execute workflow
    workflow_result = workflow.apply_async()
    
    # Also execute parallel tasks (don't wait for chain)
    parallel_tasks = group(
        # Analytics tracking
        track_user_registration_task.s(user.id),
        # Notification to admins
        notify_admin_task.s(user.id)
    )
    parallel_tasks.apply_async()
    
    return {
        "user_id": user.id,
        "message": "Registration initiated",
        "workflow_task_id": workflow_result.id
    }

@router.get("/register/{user_id}/status")
async def get_registration_status(user_id: int):
    """Check registration workflow status."""
    # In real app, you'd store workflow task ID with user
    # For this example, we'll query by user_id pattern
    
    # Get workflow status
    # (In production, store task_id in database with user)
    
    return {
        "user_id": user_id,
        "status": "processing",
        "message": "Registration tasks in progress"
    }
```

## Step 7: Error Handling

### Handling Task Failures

```python
from celery.result import AsyncResult

@router.get("/tasks/{task_id}/result")
async def get_task_result(task_id: str):
    """Get task result with error handling."""
    result = AsyncResult(task_id, app=celery_app)
    
    try:
        if result.ready():
            if result.successful():
                return {
                    "status": "success",
                    "result": result.result
                }
            else:
                # Task failed
                error_info = {
                    "status": "failed",
                    "error_type": type(result.info).__name__ if result.info else "Unknown",
                    "error_message": str(result.info),
                }
                
                if result.traceback:
                    error_info["traceback"] = result.traceback
                
                raise HTTPException(status_code=500, detail=error_info)
        else:
            return {
                "status": result.state,
                "message": "Task is still processing"
            }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving task result: {str(e)}"
        )
```

### Retry Pattern in FastAPI

```python
import asyncio
from fastapi import HTTPException

async def wait_for_task_result(task_id: str, timeout: int = 30):
    """Wait for task result with timeout."""
    result = AsyncResult(task_id, app=celery_app)
    start_time = asyncio.get_event_loop().time()
    
    while True:
        if result.ready():
            if result.successful():
                return result.result
            else:
                raise Exception(f"Task failed: {result.info}")
        
        elapsed = asyncio.get_event_loop().time() - start_time
        if elapsed > timeout:
            raise TimeoutError(f"Task {task_id} timed out")
        
        await asyncio.sleep(1)

@router.post("/process-sync")
async def process_synchronously(data: dict):
    """Process task and wait for result."""
    task = process_data_task.delay(data)
    
    try:
        result = await wait_for_task_result(task.id, timeout=60)
        return {"status": "completed", "result": result}
    except TimeoutError:
        return {
            "status": "timeout",
            "task_id": task.id,
            "message": "Task is taking longer than expected, check status later"
        }
```

## Step 8: Task Result Backend Configuration

### Choosing Result Backend

```python
# Option 1: Redis (fast, good for most cases)
celery_app = Celery(
    'myapp',
    broker='redis://localhost:6379/0',
    backend='redis://localhost:6379/0'
)

# Option 2: Database (persistent, for important results)
celery_app = Celery(
    'myapp',
    broker='redis://localhost:6379/0',
    backend='db+postgresql://user:pass@localhost/db'
)

# Option 3: RPC (results return to caller)
celery_app = Celery(
    'myapp',
    broker='redis://localhost:6379/0',
    backend='rpc://'
)
```

## Step 9: Production Best Practices

### Task Naming and Organization

```python
# Organize tasks in modules
# tasks/__init__.py
from celery import Celery

celery_app = Celery('myapp')

# Import task modules
from tasks.email_tasks import send_email_task
from tasks.data_tasks import process_data_task
from tasks.report_tasks import generate_report_task

# tasks/email_tasks.py
@celery_app.task(name='tasks.email.send_welcome')
def send_welcome_email_task(user_id: int, email: str):
    """Send welcome email."""
    pass

@celery_app.task(name='tasks.email.send_notification')
def send_notification_task(user_id: int, message: str):
    """Send notification."""
    pass
```

### Configuration Management

```python
from pydantic_settings import BaseSettings

class CelerySettings(BaseSettings):
    broker_url: str = "redis://localhost:6379/0"
    result_backend: str = "redis://localhost:6379/0"
    task_serializer: str = "json"
    result_serializer: str = "json"
    accept_content: list = ["json"]
    
    class Config:
        env_file = ".env"
        env_prefix = "CELERY_"

settings = CelerySettings()

celery_app = Celery(
    'myapp',
    broker=settings.broker_url,
    backend=settings.result_backend
)

celery_app.conf.update(
    task_serializer=settings.task_serializer,
    result_serializer=settings.result_serializer,
    accept_content=settings.accept_content,
)
```

## Step 10: Testing Tasks

### Testing Task Execution

```python
# tests/test_tasks.py
import pytest
from celery_app import send_email_task

@pytest.fixture
def celery_app():
    """Use test Celery app."""
    app = Celery('test')
    app.conf.update(
        broker_url='memory://',
        result_backend='cache+memory://'
    )
    return app

def test_send_email_task(celery_app):
    """Test email task execution."""
    # Execute task synchronously for testing
    result = send_email_task.apply(
        args=['test@example.com', 'Test', 'Body']
    )
    
    assert result.successful()
    assert 'sent' in result.result.lower()
```

## Summary

Sending tasks from FastAPI to Celery provides:
- ✅ Non-blocking background processing
- ✅ Task tracking and status monitoring
- ✅ Flexible task execution patterns
- ✅ Production-ready integration

Follow this guide for seamless FastAPI-Celery integration!
