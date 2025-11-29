# Monitoring Celery with Flower and Prometheus: Complete Guide

Monitoring is essential for production Celery deployments. This comprehensive guide covers Flower (web UI) and Prometheus (metrics) for complete observability.

## Why Monitor Celery?

**What you need to know:**
- Are workers healthy and processing tasks?
- How long are tasks taking?
- Which tasks are failing?
- Are there bottlenecks?
- Is the queue backing up?

**Monitoring helps:**
- Detect issues before they become critical
- Optimize performance
- Understand system behavior
- Debug problems quickly

## Part 1: Flower - Web-Based Monitoring

**What is Flower?**
A real-time web-based tool for monitoring and administrating Celery workers.

### Installation and Basic Setup

```bash
# Install Flower
pip install flower

# Run Flower (basic)
celery -A celery_app flower

# Run with options
celery -A celery_app flower \
    --port=5555 \
    --broker=redis://localhost:6379/0 \
    --broker_api=redis://localhost:6379/0
```

### Configuration File

```python
# flowerconfig.py
broker_api = 'redis://localhost:6379/0'
port = 5555
basic_auth = ['admin:password']  # Optional: add authentication
url_prefix = '/flower'  # Optional: serve under path
```

Run with config:
```bash
celery -A celery_app flower --conf=flowerconfig.py
```

### Flower Features Overview

**1. Workers Tab**
- List all active workers
- CPU usage, memory usage
- Active tasks count
- Uptime, status

**2. Tasks Tab**
- Recent tasks with status
- Task details (args, kwargs, result)
- Task duration, traceback
- Filter by status, worker, task name

**3. Monitor Tab**
- Real-time task rate
- Success/failure rates
- Task duration graphs
- Worker statistics

**4. Broker Tab**
- Queue lengths
- Message rates
- Broker connection status

### Accessing Flower

Once running, access at:
```
http://localhost:5555
```

**Default pages:**
- `/`: Dashboard overview
- `/workers`: Worker status
- `/tasks`: Task list
- `/monitor`: Real-time monitoring
- `/broker`: Broker statistics

## Part 2: Prometheus Metrics

**What is Prometheus?**
A time-series database and monitoring system. Collect metrics, query them, and create alerts.

### Setting Up Prometheus Metrics

#### Step 1: Install Dependencies

```bash
pip install prometheus-client
```

#### Step 2: Create Metrics

```python
# metrics.py
from prometheus_client import Counter, Histogram, Gauge, start_http_server
import time

# Task execution metrics
celery_tasks_total = Counter(
    'celery_tasks_total',
    'Total number of tasks executed',
    ['task_name', 'status']  # Labels for filtering
)

celery_task_duration = Histogram(
    'celery_task_duration_seconds',
    'Task execution duration in seconds',
    ['task_name'],
    buckets=(0.1, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0, float('inf'))
)

celery_task_queue_time = Histogram(
    'celery_task_queue_time_seconds',
    'Time task spent in queue before execution',
    ['task_name']
)

# Worker metrics
celery_active_tasks = Gauge(
    'celery_active_tasks',
    'Number of tasks currently being executed',
    ['worker_name']
)

celery_workers_online = Gauge(
    'celery_workers_online',
    'Number of online workers'
)
```

#### Step 3: Instrument Tasks

```python
from metrics import (
    celery_tasks_total,
    celery_task_duration,
    celery_task_queue_time
)

@celery_app.task(bind=True)
def monitored_task(self, data: dict):
    """Task with comprehensive metrics."""
    task_name = self.name
    start_time = time.time()
    
    # Calculate queue time (if available)
    if hasattr(self.request, 'eta') and self.request.eta:
        queue_time = (time.time() - self.request.eta.timestamp())
        celery_task_queue_time.labels(task_name=task_name).observe(queue_time)
    
    try:
        # Execute task logic
        result = process_data(data)
        
        # Record success
        celery_tasks_total.labels(
            task_name=task_name,
            status='success'
        ).inc()
        
        return result
    
    except Exception as e:
        # Record failure
        celery_tasks_total.labels(
            task_name=task_name,
            status='failure'
        ).inc()
        
        raise
    
    finally:
        # Record duration
        duration = time.time() - start_time
        celery_task_duration.labels(task_name=task_name).observe(duration)
```

#### Step 4: Start Metrics Server

```python
# Start Prometheus metrics HTTP server
# Serves metrics at http://localhost:8000/metrics
start_http_server(8000)
```

### Custom Metrics Examples

#### Task Retry Metrics

```python
celery_task_retries = Counter(
    'celery_task_retries_total',
    'Total task retries',
    ['task_name', 'reason']
)

@celery_app.task(bind=True, max_retries=3)
def retryable_task(self, data: dict):
    try:
        process_data(data)
    except TransientError as e:
        celery_task_retries.labels(
            task_name=self.name,
            reason='transient_error'
        ).inc()
        raise self.retry(exc=e)
```

#### Queue Length Metrics

```python
from celery import Celery
from redis import Redis

celery_queue_length = Gauge(
    'celery_queue_length',
    'Number of tasks in queue',
    ['queue_name']
)

def update_queue_metrics():
    """Update queue length metrics."""
    redis_client = Redis()
    
    # Get queue lengths
    queues = ['default', 'emails', 'payments']
    for queue in queues:
        length = redis_client.llen(f'celery')  # Adjust based on your setup
        celery_queue_length.labels(queue_name=queue).set(length)

# Update periodically
import threading
def metrics_updater():
    while True:
        update_queue_metrics()
        time.sleep(10)

threading.Thread(target=metrics_updater, daemon=True).start()
```

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s  # How often to scrape metrics

scrape_configs:
  - job_name: 'celery'
    static_configs:
      - targets: ['localhost:8000']  # Where metrics are exposed
        labels:
          environment: 'production'
          service: 'celery'
```

Start Prometheus:
```bash
prometheus --config.file=prometheus.yml
```

## Part 3: Integration with FastAPI

### Expose Metrics Endpoint

```python
from fastapi import FastAPI
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

app = FastAPI()

@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint."""
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )
```

### Worker Health Check

```python
from celery import Celery
from prometheus_client import Gauge

celery_worker_status = Gauge(
    'celery_worker_status',
    'Worker status (1=online, 0=offline)',
    ['worker_name']
)

@celery_app.task
def health_check():
    """Periodic health check task."""
    # Check worker status
    inspect = celery_app.control.inspect()
    active_workers = inspect.active()
    
    if active_workers:
        for worker_name in active_workers.keys():
            celery_worker_status.labels(worker_name=worker_name).set(1)
    else:
        # No workers online
        celery_worker_status.labels(worker_name='all').set(0)
```

## Part 4: Grafana Dashboards

**Visualize metrics with Grafana:**

### Sample Queries

```promql
# Task execution rate
rate(celery_tasks_total[5m])

# Success rate
sum(rate(celery_tasks_total{status="success"}[5m])) / 
sum(rate(celery_tasks_total[5m]))

# Average task duration
rate(celery_task_duration_seconds_sum[5m]) / 
rate(celery_task_duration_seconds_count[5m])

# Queue length
celery_queue_length

# Active tasks
sum(celery_active_tasks)
```

### Dashboard Panels

1. **Task Rate Panel**
   - Query: `rate(celery_tasks_total[5m])`
   - Visualization: Line graph
   - Shows: Tasks per second over time

2. **Success Rate Panel**
   - Query: Success rate formula above
   - Visualization: Gauge
   - Shows: Percentage of successful tasks

3. **Task Duration Panel**
   - Query: Average duration formula above
   - Visualization: Line graph
   - Shows: Task execution time trends

4. **Queue Length Panel**
   - Query: `celery_queue_length`
   - Visualization: Bar chart
   - Shows: Tasks waiting in queue

## Part 5: Alerting Rules

### Prometheus Alert Rules

```yaml
# alerts.yml
groups:
  - name: celery
    interval: 30s
    rules:
      - alert: HighTaskFailureRate
        expr: |
          sum(rate(celery_tasks_total{status="failure"}[5m])) / 
          sum(rate(celery_tasks_total[5m])) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High task failure rate detected"
          description: "{{ $value }}% of tasks are failing"

      - alert: LongTaskQueue
        expr: celery_queue_length > 1000
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Task queue is backing up"
          description: "Queue has {{ $value }} tasks waiting"

      - alert: NoWorkersOnline
        expr: celery_workers_online == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "No Celery workers online"
          description: "All workers are down!"

      - alert: SlowTaskExecution
        expr: |
          rate(celery_task_duration_seconds_sum[5m]) / 
          rate(celery_task_duration_seconds_count[5m]) > 60
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Tasks are taking too long"
          description: "Average task duration is {{ $value }} seconds"
```

## Part 6: Production Deployment

### Docker Compose Setup

```yaml
version: '3.8'

services:
  flower:
    image: mher/flower:latest
    command: celery -A celery_app flower --port=5555
    ports:
      - "5555:5555"
    environment:
      - CELERY_BROKER_URL=redis://redis:6379/0
    depends_on:
      - redis

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
```

## Best Practices

1. **Monitor everything**: Tasks, workers, queues, brokers
2. **Set up alerts**: Get notified of issues early
3. **Create dashboards**: Visualize system health
4. **Track trends**: Understand normal vs abnormal
5. **Log metrics**: Correlate with application logs

## Summary

Monitoring with Flower and Prometheus provides:
- ✅ Real-time visibility into Celery operations
- ✅ Historical metrics and trends
- ✅ Alerting for critical issues
- ✅ Performance optimization insights

Set up comprehensive monitoring for production Celery deployments!
