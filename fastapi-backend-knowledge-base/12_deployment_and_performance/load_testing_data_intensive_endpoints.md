# Load Testing Data Intensive Endpoints: Complete Guide

Load testing ensures endpoints handle production traffic. This comprehensive guide covers load testing strategies, tools, and optimization techniques.

## Understanding Load Testing

**What is load testing?**
Testing your application under expected and peak load conditions to identify bottlenecks and performance limits.

**Types of load tests:**
- **Baseline**: Normal expected load
- **Stress**: Beyond normal capacity
- **Spike**: Sudden traffic increases
- **Endurance**: Sustained load over time

## Step 1: Setting Up Locust

### Basic Locust Test

```python
# locustfile.py
from locust import HttpUser, task, between, events
from locust.contrib.fasthttp import FastHttpUser
import random

class DataIntensiveUser(FastHttpUser):
    """
    Simulate user making data-intensive requests.
    
    FastHttpUser is faster than HttpUser for high concurrency.
    """
    wait_time = between(1, 3)  # Wait 1-3 seconds between tasks
    
    def on_start(self):
        """Called when user starts (login, setup)."""
        # Login and get auth token
        response = self.client.post("/auth/login", json={
            "email": f"user{random.randint(1, 1000)}@example.com",
            "password": "password"
        })
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.client.headers = {"Authorization": f"Bearer {self.token}"}
    
    @task(3)  # Weight: 3x more frequent
    def search_products(self):
        """Test product search endpoint."""
        queries = ["laptop", "phone", "book", "gaming", "electronics"]
        query = random.choice(queries)
        
        with self.client.get(
            f"/products/search?q={query}&limit=20",
            catch_response=True,
            name="/products/search"
        ) as response:
            if response.status_code == 200:
                data = response.json()
                if len(data.get("results", [])) == 0:
                    response.failure("No results returned")
            else:
                response.failure(f"Status code: {response.status_code}")
    
    @task(2)
    def get_user_profile(self):
        """Test user profile endpoint."""
        user_id = random.randint(1, 1000)
        self.client.get(f"/users/{user_id}")
    
    @task(1)
    def get_user_orders(self):
        """Test orders listing."""
        user_id = random.randint(1, 1000)
        self.client.get(f"/users/{user_id}/orders?limit=10")
    
    @task(1)
    def get_product_details(self):
        """Test product details."""
        product_id = random.randint(1, 5000)
        self.client.get(f"/products/{product_id}")
```

### Advanced Locust Configuration

```python
# locustfile.py
from locust import HttpUser, task, events
import gevent

class AdvancedLoadTest(HttpUser):
    wait_time = between(0.5, 2)
    
    @task
    def complex_query(self):
        """Test complex database query."""
        self.client.get("/reports/sales?start_date=2024-01-01&end_date=2024-12-31")
    
    @task
    def paginated_list(self):
        """Test pagination."""
        page = random.randint(1, 100)
        self.client.get(f"/products?page={page}&limit=20")

# Test configuration
class WebsiteUser(HttpUser):
    tasks = [DataIntensiveUser, AdvancedLoadTest]
    host = "http://localhost:8000"
    min_wait = 1
    max_wait = 3
```

## Step 2: Running Load Tests

### Basic Execution

```bash
# Run Locust
locust -f locustfile.py

# With options
locust -f locustfile.py \
    --host http://localhost:8000 \
    --users 100 \
    --spawn-rate 10 \
    --headless \
    --run-time 5m
```

### Distributed Load Testing

```bash
# Master node
locust -f locustfile.py --master

# Worker nodes (run on different machines)
locust -f locustfile.py --worker --master-host=<master-ip>
```

## Step 3: Performance Metrics Collection

### Track Metrics in FastAPI

```python
from fastapi import Request
import time
from prometheus_client import Histogram, Counter

request_duration = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration',
    ['method', 'endpoint', 'status_code'],
    buckets=(0.01, 0.05, 0.1, 0.5, 1.0, 2.5, 5.0, 10.0)
)

request_count = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status_code']
)

@app.middleware("http")
async def track_performance(request: Request, call_next):
    """Track request performance."""
    start_time = time.time()
    
    # Process request
    response = await call_next(request)
    
    duration = time.time() - start_time
    
    # Record metrics
    endpoint = request.url.path
    request_duration.labels(
        method=request.method,
        endpoint=endpoint,
        status_code=response.status_code
    ).observe(duration)
    
    request_count.labels(
        method=request.method,
        endpoint=endpoint,
        status_code=response.status_code
    ).inc()
    
    # Add timing header
    response.headers["X-Response-Time"] = f"{duration:.3f}"
    
    return response
```

## Step 4: Database Query Performance

### Track Query Performance

```python
from sqlalchemy import event

query_duration = Histogram(
    'db_query_duration_seconds',
    'Database query duration',
    ['operation', 'table']
)

@event.listens_for(Engine, "after_cursor_execute")
def track_query_performance(conn, cursor, statement, parameters, context, executemany):
    """Track query performance during load test."""
    duration = time.time() - conn.info['query_start_time'].pop(-1)
    
    operation, table = parse_query(statement)
    
    query_duration.labels(
        operation=operation,
        table=table
    ).observe(duration)
    
    # Log slow queries
    if duration > 1.0:
        logger.warning(
            "slow_query_during_load_test",
            query=statement[:200],
            duration=duration,
            operation=operation,
            table=table
        )
```

## Step 5: Load Testing Scenarios

### Scenario 1: Gradual Ramp-Up

```python
# locustfile.py
from locust import LoadTestShape

class GradualRampUp(LoadTestShape):
    """
    Gradually ramp up users over time.
    
    Time 0-60s:   10 users
    Time 60-120s: 50 users
    Time 120-180s: 100 users
    Time 180-240s: 200 users
    """
    def tick(self):
        run_time = self.get_run_time()
        
        if run_time < 60:
            return (10, 2)  # 10 users, spawn rate 2/s
        elif run_time < 120:
            return (50, 5)
        elif run_time < 180:
            return (100, 10)
        elif run_time < 240:
            return (200, 20)
        else:
            return None  # Stop test
```

### Scenario 2: Spike Test

```python
class SpikeTest(LoadTestShape):
    """Sudden traffic spike."""
    def tick(self):
        run_time = self.get_run_time()
        
        if run_time < 60:
            return (10, 1)  # Normal load
        elif run_time < 120:
            return (500, 50)  # Spike!
        elif run_time < 180:
            return (10, 1)  # Back to normal
        else:
            return None
```

## Step 6: Analyzing Results

### Key Metrics to Monitor

```python
# After load test, analyze:

# 1. Response times
# - P50 (median)
# - P95 (95th percentile)
# - P99 (99th percentile)
# - Max

# 2. Error rates
# - Total errors
# - Error percentage
# - Error types

# 3. Throughput
# - Requests per second
# - Successful requests per second

# 4. Database performance
# - Query duration
# - Connection pool usage
# - Slow queries
```

### Generate Report

```python
@router.get("/load-test/report")
async def generate_load_test_report():
    """Generate load test report from metrics."""
    # Query Prometheus for metrics
    # Analyze results
    # Return report
    
    report = {
        "test_duration": "5 minutes",
        "total_requests": 50000,
        "requests_per_second": 166,
        "p50_response_time_ms": 45,
        "p95_response_time_ms": 150,
        "p99_response_time_ms": 300,
        "error_rate_percent": 0.1,
        "slow_queries": [
            {"query": "SELECT ...", "avg_duration_ms": 1200}
        ]
    }
    
    return report
```

## Step 7: Optimization Based on Results

### Identify Bottlenecks

1. **Slow queries**: Add indexes, optimize queries
2. **Connection pool exhaustion**: Increase pool size
3. **N+1 queries**: Add eager loading
4. **Missing cache**: Implement caching
5. **Slow external APIs**: Add timeouts, circuit breakers

## Best Practices

1. **Test realistic scenarios**: Match production traffic patterns
2. **Monitor all layers**: Application, database, cache, external services
3. **Test incrementally**: Start small, gradually increase
4. **Measure before and after**: Track improvements
5. **Test failure scenarios**: How does system handle overload?

## Summary

Load testing provides:
- ✅ Performance validation
- ✅ Bottleneck identification
- ✅ Capacity planning
- ✅ Confidence in production

Implement comprehensive load testing for production readiness!
