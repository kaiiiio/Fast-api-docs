# Metrics for Data Layer: Complete Monitoring Guide

Metrics help monitor database performance, identify bottlenecks, and ensure system health. This comprehensive guide covers data layer metrics from setup to advanced monitoring.

## Understanding Data Layer Metrics

**What to measure:**
- Query performance (duration, count)
- Connection pool usage
- Transaction metrics
- Error rates
- Throughput

**Why metrics matter:**
- Detect performance degradation early
- Optimize slow queries
- Capacity planning
- SLA monitoring

## Step 1: Basic Prometheus Metrics

### Core Database Metrics

```python
from prometheus_client import Counter, Histogram, Gauge, Summary
from contextlib import contextmanager
import time

# Query metrics
db_query_count = Counter(
    'db_queries_total',
    'Total database queries',
    ['operation', 'table', 'status']  # Labels for filtering
)

db_query_duration = Histogram(
    'db_query_duration_seconds',
    'Database query duration',
    ['operation', 'table'],
    buckets=(0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 5.0, 10.0)  # Duration buckets
)

db_query_errors = Counter(
    'db_query_errors_total',
    'Database query errors',
    ['operation', 'table', 'error_type']
)

# Connection pool metrics
db_pool_size = Gauge(
    'db_pool_size',
    'Database connection pool size',
    ['state']  # checked_out, available, total
)

db_pool_wait_time = Histogram(
    'db_pool_wait_seconds',
    'Time waiting for connection from pool',
    buckets=(0.001, 0.01, 0.1, 0.5, 1.0, 5.0)
)
```

### Transaction Metrics

```python
db_transaction_count = Counter(
    'db_transactions_total',
    'Total database transactions',
    ['status']  # committed, rolled_back
)

db_transaction_duration = Histogram(
    'db_transaction_duration_seconds',
    'Transaction duration',
    buckets=(0.1, 0.5, 1.0, 5.0, 10.0, 30.0)
)
```

## Step 2: Query Tracking Decorator

### Context Manager for Query Tracking

```python
@contextmanager
def track_query(operation: str, table: str):
    """
    Track query execution with metrics.
    
    Usage:
        with track_query('select', 'users'):
            user = await db.get(User, user_id)
    """
    start_time = time.time()
    error_type = None
    
    try:
        yield
    
    except Exception as e:
        error_type = type(e).__name__
        db_query_errors.labels(
            operation=operation,
            table=table,
            error_type=error_type
        ).inc()
        raise
    
    finally:
        duration = time.time() - start_time
        
        # Record metrics
        db_query_count.labels(
            operation=operation,
            table=table,
            status='error' if error_type else 'success'
        ).inc()
        
        db_query_duration.labels(
            operation=operation,
            table=table
        ).observe(duration)
```

### Repository Integration

```python
class UserRepository:
    """Repository with automatic metrics tracking."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def get_by_id(self, user_id: int) -> User:
        """Get user with automatic metrics."""
        with track_query('select', 'users'):
            user = await self.session.get(User, user_id)
            return user
    
    async def create(self, user_data: dict) -> User:
        """Create user with metrics."""
        with track_query('insert', 'users'):
            user = User(**user_data)
            self.session.add(user)
            await self.session.commit()
            return user
    
    async def update(self, user_id: int, updates: dict) -> User:
        """Update user with metrics."""
        with track_query('update', 'users'):
            user = await self.session.get(User, user_id)
            for key, value in updates.items():
                setattr(user, key, value)
            await self.session.commit()
            return user
```

## Step 3: Connection Pool Metrics

### Pool Size Tracking

```python
from sqlalchemy import event

@event.listens_for(Engine, "connect")
def track_connection_created(dbid, connection_rec):
    """Track when connection is created."""
    pool = connection_rec.info.get('pool')
    if pool:
        total = pool.size() + pool.max_overflow
        available = pool.size() - pool.checkedout()
        checked_out = pool.checkedout()
        
        db_pool_size.labels(state='total').set(total)
        db_pool_size.labels(state='available').set(available)
        db_pool_size.labels(state='checked_out').set(checked_out)

@event.listens_for(Engine, "checkout")
def track_connection_checkout(dbapi_conn, connection_rec, connection_proxy):
    """Track connection checkout with timing."""
    checkout_start = time.time()
    connection_rec.info['checkout_start'] = checkout_start
    
    # Update pool metrics
    pool = connection_rec.info.get('pool')
    if pool:
        db_pool_size.labels(state='checked_out').set(pool.checkedout())
        db_pool_size.labels(state='available').set(
            pool.size() - pool.checkedout()
        )

@event.listens_for(Engine, "checkin")
def track_connection_checkin(dbapi_conn, connection_rec):
    """Track connection checkin."""
    checkout_start = connection_rec.info.get('checkout_start')
    if checkout_start:
        wait_time = time.time() - checkout_start
        db_pool_wait_time.observe(wait_time)
    
    pool = connection_rec.info.get('pool')
    if pool:
        db_pool_size.labels(state='checked_out').set(pool.checkedout())
        db_pool_size.labels(state='available').set(
            pool.size() - pool.checkedout()
        )
```

## Step 4: Transaction Metrics

### Track Transaction Lifecycle

```python
@event.listens_for(Engine, "begin")
def track_transaction_start(conn):
    """Track transaction start."""
    conn.info['transaction_start'] = time.time()

@event.listens_for(Engine, "commit")
def track_transaction_commit(conn):
    """Track successful transaction commit."""
    start_time = conn.info.get('transaction_start')
    if start_time:
        duration = time.time() - start_time
        
        db_transaction_count.labels(status='committed').inc()
        db_transaction_duration.observe(duration)

@event.listens_for(Engine, "rollback")
def track_transaction_rollback(conn):
    """Track transaction rollback."""
    start_time = conn.info.get('transaction_start')
    if start_time:
        duration = time.time() - start_time
        
        db_transaction_count.labels(status='rolled_back').inc()
        db_transaction_duration.observe(duration)
```

## Step 5: Advanced Metrics

### Query Pattern Analysis

```python
db_query_patterns = Counter(
    'db_query_patterns_total',
    'Query patterns (normalized SQL)',
    ['pattern']  # Normalized query pattern
)

def normalize_query(query: str) -> str:
    """Normalize query for pattern matching."""
    # Remove specific values
    normalized = re.sub(r'\d+', '?', query)
    normalized = re.sub(r"'[^']*'", '?', normalized)
    return normalized

@event.listens_for(Engine, "after_cursor_execute")
def track_query_pattern(conn, cursor, statement, parameters, context, executemany):
    """Track query patterns."""
    pattern = normalize_query(statement)
    db_query_patterns.labels(pattern=pattern[:100]).inc()  # Truncate long patterns
```

### Slow Query Tracking

```python
slow_query_counter = Counter(
    'db_slow_queries_total',
    'Slow queries (above threshold)',
    ['operation', 'table']
)

SLOW_QUERY_THRESHOLD = 1.0  # 1 second

@event.listens_for(Engine, "after_cursor_execute")
def track_slow_queries(conn, cursor, statement, parameters, context, executemany):
    """Track slow queries."""
    duration = time.time() - conn.info['query_start_time'].pop(-1)
    
    if duration > SLOW_QUERY_THRESHOLD:
        operation, table = parse_query(statement)
        
        slow_query_counter.labels(
            operation=operation,
            table=table
        ).inc()
```

## Step 6: Metrics Endpoint

### Expose Metrics

```python
from fastapi import APIRouter
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import Response

router = APIRouter()

@router.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint."""
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )
```

## Step 7: Grafana Dashboard Queries

### Sample PromQL Queries

```promql
# Query rate (queries per second)
rate(db_queries_total[5m])

# Average query duration
rate(db_query_duration_seconds_sum[5m]) / 
rate(db_query_duration_seconds_count[5m])

# Error rate
rate(db_query_errors_total[5m]) / 
rate(db_queries_total[5m])

# Pool usage percentage
db_pool_size{state="checked_out"} / 
db_pool_size{state="total"} * 100

# Slow query rate
rate(db_slow_queries_total[5m])
```

## Summary

Data layer metrics provide:
- ✅ Performance monitoring
- ✅ Bottleneck identification
- ✅ Capacity planning
- ✅ SLA tracking

Implement comprehensive metrics for production database monitoring!
