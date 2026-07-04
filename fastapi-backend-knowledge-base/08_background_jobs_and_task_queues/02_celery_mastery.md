# Celery Mastery: Minimal Guide

## Core Concepts
*   **Broker:** Intermediate that stores tasks (e.g., **Redis**, **RabbitMQ**).
*   **Worker:** Process that pulls and executes tasks from the Broker.
*   **Backend:** Stores the result of the task (usually **Redis**).

## Setup
```python
from celery import Celery

# Init Celery app
celery_app = Celery("my_app", broker="redis://", backend="redis://")

@celery_app.task
def send_email(email: str):
    # Long task logic here
    ...
```

## Running Tasks
*   **Delay:** `send_email.delay("john@example.com")` (Basic asynchronous call).
*   **Apply Async:** `send_email.apply_async(args=["..."], countdown=10)` (With 10s delay).
*   **Scheduling:** Use `celery-beat` for periodic tasks (crontab equivalent).

## Commands (Terminal)
*   **Worker:** `celery -A main.celery_app worker --loglevel=info`
*   **Beat:** `celery -A main.celery_app beat --loglevel=info`
*   **Flower:** `celery -A main.celery_app flower` (UI Monitoring)

## Best Practices
- ✅ Always use **`delay()`** or **`apply_async()`** from your API to trigger tasks.
- ✅ Explicitly define **Task Names** to avoid mismatch during deployments.
- ✅ Implement **Exponential Backoff** for retries.
- ✅ Use **Flower** to monitor task success/failure and throughput.

## Summary Checklist
- ✅ Broker/Backend (Redis)
- ✅ Worker process running
- ✅ Tasks defined with @celery.task
- ✅ Monitoring (Flower)
