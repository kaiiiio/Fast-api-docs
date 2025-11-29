# Handling Task Results and Timeouts: Complete Guide

Managing task results and timeouts properly prevents hanging requests, resource exhaustion, and improves user experience. This guide covers comprehensive result handling and timeout strategies.

## Understanding Task Results

**What are task results?**
When you send a task to Celery, you get a result object that represents the task's execution state and outcome.

**Result states:**
- `PENDING`: Task waiting to be executed
- `STARTED`: Task currently executing
- `SUCCESS`: Task completed successfully
- `FAILURE`: Task failed with exception
- `RETRY`: Task is being retried
- `REVOKED`: Task was cancelled

## Getting Task Results

### Basic Result Retrieval

```python
from celery import Celery
from celery.result import AsyncResult

celery_app = Celery('myapp', broker='redis://localhost:6379/0')

@celery_app.task
def calculate_sum(numbers: list) -> int:
    """Example task that returns a result."""
    return sum(numbers)

# Send task
task = calculate_sum.delay([1, 2, 3, 4, 5])
task_id = task.id  # Unique task ID

# Get result object
result = AsyncResult(task_id, app=celery_app)

# Check status
print(result.state)  # 'PENDING', 'SUCCESS', etc.

# Get result when ready
if result.ready():
    print(result.result)  # 15 (sum of numbers)
```

### Checking Task State

```python
def check_task_status(task_id: str):
    """Check task status and handle different states."""
    result = AsyncResult(task_id, app=celery_app)
    
    if result.state == 'PENDING':
        # Task is waiting to be executed
        return {"status": "pending", "message": "Task is queued"}
    
    elif result.state == 'STARTED':
        # Task is currently running
        return {"status": "processing", "message": "Task is being executed"}
    
    elif result.state == 'SUCCESS':
        # Task completed successfully
        return {
            "status": "completed",
            "result": result.result,
            "message": "Task completed successfully"
        }
    
    elif result.state == 'FAILURE':
        # Task failed
        return {
            "status": "failed",
            "error": str(result.info),  # Exception message
            "traceback": result.traceback
        }
    
    elif result.state == 'RETRY':
        # Task is being retried
        return {
            "status": "retrying",
            "message": f"Task will be retried (attempt {result.info.get('retries', 0)})"
        }
    
    elif result.state == 'REVOKED':
        # Task was cancelled
        return {"status": "cancelled", "message": "Task was revoked"}
    
    else:
        return {"status": "unknown", "state": result.state}
```

## Waiting for Results with Timeouts

### Synchronous Waiting (Blocking)

```python
from celery.exceptions import TimeoutError

def wait_for_result(task_id: str, timeout: int = 30):
    """
    Wait for task result with timeout.
    
    Args:
        task_id: Task identifier
        timeout: Maximum seconds to wait
    
    Returns:
        Task result or None if timeout
    
    Raises:
        TimeoutError: If task doesn't complete within timeout
    """
    result = AsyncResult(task_id, app=celery_app)
    
    try:
        # Wait for result (blocks until ready or timeout)
        task_result = result.get(timeout=timeout)
        return task_result
    except TimeoutError:
        print(f"Task {task_id} did not complete within {timeout} seconds")
        return None
    except Exception as e:
        print(f"Task {task_id} failed: {e}")
        raise
```

**Understanding `get(timeout=...)`:**
- Blocks execution until task completes
- Raises `TimeoutError` if timeout exceeded
- Returns result immediately if already ready
- Not suitable for async/await contexts

### Async Result Waiting (Non-blocking)

```python
import asyncio

async def wait_for_result_async(task_id: str, timeout: int = 30):
    """
    Wait for task result asynchronously.
    
    Better for FastAPI async endpoints - doesn't block event loop.
    """
    result = AsyncResult(task_id, app=celery_app)
    start_time = asyncio.get_event_loop().time()
    
    # Poll for result
    while True:
        if result.ready():
            if result.successful():
                return result.result
            else:
                raise Exception(f"Task failed: {result.info}")
        
        # Check timeout
        elapsed = asyncio.get_event_loop().time() - start_time
        if elapsed >= timeout:
            raise TimeoutError(f"Task {task_id} timed out after {timeout}s")
        
        # Wait before next poll
        await asyncio.sleep(0.5)

# Usage in FastAPI
@router.get("/tasks/{task_id}/wait")
async def wait_for_task(task_id: str, timeout: int = 30):
    """Wait for task completion."""
    try:
        result = await wait_for_result_async(task_id, timeout)
        return {"status": "success", "result": result}
    except TimeoutError as e:
        raise HTTPException(status_code=408, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### Progressive Polling Strategy

```python
async def poll_result_with_backoff(task_id: str, max_wait: int = 60):
    """
    Poll for result with exponential backoff.
    
    More efficient: polls frequently at first, less frequently later.
    """
    result = AsyncResult(task_id, app=celery_app)
    start_time = time.time()
    poll_interval = 0.5  # Start with 0.5 seconds
    
    while True:
        if result.ready():
            return result.result
        
        # Check total timeout
        if time.time() - start_time > max_wait:
            raise TimeoutError(f"Task {task_id} timed out")
        
        # Wait with current interval
        await asyncio.sleep(poll_interval)
        
        # Increase interval (cap at 5 seconds)
        poll_interval = min(poll_interval * 1.5, 5.0)
```

## Task Timeouts

### Hard Timeout vs Soft Timeout

**Hard timeout:**
- Kills the task process immediately
- No cleanup possible
- Use when task must stop

**Soft timeout:**
- Raises exception in task
- Allows cleanup code to run
- Use when cleanup is needed

### Setting Task-Level Timeouts

```python
from celery.exceptions import SoftTimeLimitExceeded

@celery_app.task(
    time_limit=300,      # Hard timeout: 5 minutes (kills task)
    soft_time_limit=250  # Soft timeout: 4 minutes 10 seconds (raises exception)
)
def process_large_file(file_path: str):
    """
    Process file with timeout protection.
    
    time_limit: Maximum execution time (hard kill)
    soft_time_limit: Warning time (allows cleanup)
    """
    try:
        # Process file
        result = process_file_chunks(file_path)
        return result
    
    except SoftTimeLimitExceeded:
        """
        Raised when soft_time_limit is reached.
        Worker will still be killed at time_limit, but we can cleanup first.
        """
        logger.warning(f"Soft timeout reached for {file_path}, cleaning up...")
        
        # Cleanup partial work
        cleanup_partial_files(file_path)
        
        # Release resources
        release_file_locks(file_path)
        
        # Raise to mark task as failed
        raise
```

**Timeline visualization:**
```
Time 0s:    Task starts processing file
Time 250s:  Soft timeout reached → Exception raised → Cleanup code runs
Time 255s:  Cleanup completes
Time 300s:  Hard timeout → Task process killed (if still running)
```

### Dynamic Timeout Based on Task Size

```python
@celery_app.task(bind=True)
def process_with_dynamic_timeout(self, file_path: str, file_size: int):
    """Set timeout based on file size."""
    # Calculate timeout: 1 minute per MB, minimum 60s, maximum 3600s
    estimated_time = max(60, min(file_size / (1024 * 1024) * 60, 3600))
    
    # Update task's time_limit dynamically
    self.update_state(
        state='PROCESSING',
        meta={'estimated_time': estimated_time}
    )
    
    # Note: Can't change time_limit after task starts
    # This is informational only - set time_limit when defining task
    # Or use separate task types for different sizes
    
    process_file(file_path)
```

### Global Timeout Configuration

```python
# celery_config.py
CELERY_CONFIG = {
    # Global timeouts (applies to all tasks)
    'task_time_limit': 600,        # 10 minutes hard timeout
    'task_soft_time_limit': 540,   # 9 minutes soft timeout
    
    # Per-task timeouts (override global)
    'task_annotations': {
        'tasks.process_email': {
            'time_limit': 60,
            'soft_time_limit': 50
        },
        'tasks.process_video': {
            'time_limit': 3600,
            'soft_time_limit': 3300
        }
    }
}

celery_app.conf.update(CELERY_CONFIG)
```

## Result Backend Configuration

### Choosing Result Backend

```python
# Option 1: Redis (fast, in-memory)
celery_app = Celery(
    'myapp',
    broker='redis://localhost:6379/0',
    backend='redis://localhost:6379/0'  # Store results in Redis
)

# Option 2: Database (persistent)
celery_app = Celery(
    'myapp',
    broker='redis://localhost:6379/0',
    backend='db+postgresql://user:pass@localhost/db'  # Store in PostgreSQL
)

# Option 3: RPC (results return to caller, no storage)
celery_app = Celery(
    'myapp',
    broker='redis://localhost:6379/0',
    backend='rpc://'  # Results sent back via message queue
)
```

### Result Expiration

```python
celery_app.conf.update(
    result_expires=3600,  # Results expire after 1 hour
    
    # Or per-task expiration
    task_result_expires=3600,
)

@celery_app.task(result_expires=86400)  # This task's results last 24 hours
def long_term_task():
    return "result stored for 24 hours"
```

## FastAPI Integration: Complete Example

### Endpoint with Result Polling

```python
from fastapi import APIRouter, HTTPException, status
from celery.result import AsyncResult
import asyncio

router = APIRouter()

@router.post("/process-data")
async def process_data(data: dict):
    """Start data processing task."""
    task = process_data_task.delay(data)
    
    return {
        "task_id": task.id,
        "status": "queued",
        "status_url": f"/tasks/{task.id}/status"
    }

@router.get("/tasks/{task_id}/status")
async def get_task_status(task_id: str):
    """Get current task status (non-blocking)."""
    result = AsyncResult(task_id, app=celery_app)
    
    response = {
        "task_id": task_id,
        "status": result.state
    }
    
    if result.ready():
        if result.successful():
            response.update({
                "result": result.result,
                "completed_at": result.date_done.isoformat() if result.date_done else None
            })
        else:
            response.update({
                "error": str(result.info),
                "traceback": result.traceback
            })
    else:
        # Task still running
        if result.state == 'STARTED':
            response["progress"] = result.info.get('progress', 0) if isinstance(result.info, dict) else None
    
    return response

@router.get("/tasks/{task_id}/wait")
async def wait_for_task_completion(
    task_id: str,
    timeout: int = 30,
    poll_interval: float = 1.0
):
    """
    Wait for task completion with timeout.
    
    Polls for result, returns when task completes or times out.
    """
    result = AsyncResult(task_id, app=celery_app)
    start_time = asyncio.get_event_loop().time()
    
    while True:
        if result.ready():
            if result.successful():
                return {
                    "status": "completed",
                    "result": result.result
                }
            else:
                raise HTTPException(
                    status_code=500,
                    detail=f"Task failed: {result.info}"
                )
        
        # Check timeout
        elapsed = asyncio.get_event_loop().time() - start_time
        if elapsed >= timeout:
            return {
                "status": "timeout",
                "message": f"Task did not complete within {timeout} seconds",
                "current_status": result.state
            }
        
        await asyncio.sleep(poll_interval)
```

### WebSocket for Real-Time Updates

```python
from fastapi import WebSocket

@router.websocket("/tasks/{task_id}/stream")
async def stream_task_status(websocket: WebSocket, task_id: str):
    """Stream task status updates via WebSocket."""
    await websocket.accept()
    
    result = AsyncResult(task_id, app=celery_app)
    
    try:
        while True:
            status_data = {
                "task_id": task_id,
                "status": result.state
            }
            
            if result.ready():
                if result.successful():
                    status_data["result"] = result.result
                    await websocket.send_json(status_data)
                    break  # Task complete, close connection
                else:
                    status_data["error"] = str(result.info)
                    await websocket.send_json(status_data)
                    break
            
            await websocket.send_json(status_data)
            await asyncio.sleep(1)  # Poll every second
    
    except Exception as e:
        await websocket.close(code=1011, reason=str(e))
```

## Error Handling Patterns

### Handling Different Result States

```python
def handle_task_result(task_id: str):
    """Comprehensive result handling with all error cases."""
    result = AsyncResult(task_id, app=celery_app)
    
    try:
        # Try to get result (waits if not ready)
        task_result = result.get(timeout=10)
        return {"success": True, "result": task_result}
    
    except TimeoutError:
        return {
            "success": False,
            "error": "timeout",
            "message": "Task did not complete within timeout",
            "current_state": result.state
        }
    
    except Exception as e:
        # Task failed with exception
        return {
            "success": False,
            "error": "task_failed",
            "message": str(e),
            "traceback": result.traceback if result.traceback else None,
            "state": result.state
        }
```

## Best Practices

1. **Set appropriate timeouts**: Not too short (premature failures) or too long (resource waste)
2. **Use soft timeouts**: Allow cleanup before hard timeout
3. **Poll efficiently**: Use exponential backoff for polling
4. **Handle all states**: Don't assume tasks always succeed
5. **Set result expiration**: Clean up old results automatically
6. **Use async polling**: Don't block event loop in async code

## Summary

Proper result and timeout handling provides:
- ✅ Better user experience (status updates, timeouts)
- ✅ Resource protection (timeouts prevent runaway tasks)
- ✅ Error recovery (soft timeouts allow cleanup)
- ✅ System stability (prevent resource exhaustion)

Implement comprehensive timeout and result handling for production-ready task processing!
