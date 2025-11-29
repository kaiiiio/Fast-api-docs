# Database Query Logging: Complete Guide

Logging database queries helps debug performance issues, understand data access patterns, and optimize slow queries. This comprehensive guide covers query logging from basics to advanced monitoring.

## Understanding Query Logging

**Why log database queries?**
- Debug slow endpoints (find N+1 queries)
- Understand data access patterns
- Identify missing indexes
- Track query performance over time
- Audit data access

**What to log:**
- SQL statement
- Execution time
- Parameters (sanitized)
- Query result size
- Error details

## Step 1: Basic SQLAlchemy Query Logging

### Enable Echo Logging

```python
from sqlalchemy.ext.asyncio import create_async_engine

# Simple echo logging (development only)
engine = create_async_engine(
    DATABASE_URL,
    echo=True  # Logs all SQL to console
)

# This logs:
# 2024-01-15 10:30:45,123 INFO sqlalchemy.engine.Engine SELECT users.id, users.email ...
```

### Configure Python Logging

```python
import logging

# Configure SQLAlchemy logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Set SQLAlchemy engine logger level
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)

# Different verbosity levels
logging.getLogger('sqlalchemy.engine').setLevel(logging.DEBUG)  # More detail
logging.getLogger('sqlalchemy.pool').setLevel(logging.INFO)      # Connection pool events
logging.getLogger('sqlalchemy.dialects').setLevel(logging.INFO)  # SQL dialect info
```

## Step 2: Custom Query Logging with Event Listeners

### Basic Query Timer

```python
from sqlalchemy import event
from sqlalchemy.engine import Engine
import time
import logging

logger = logging.getLogger(__name__)

@event.listens_for(Engine, "before_cursor_execute")
def receive_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    """
    Called before SQL statement execution.
    
    Store start time for duration calculation.
    """
    conn.info.setdefault('query_start_time', []).append(time.time())
    
    logger.debug(
        "Executing query",
        statement=statement[:500],  # First 500 chars
        parameters=str(parameters)[:200] if parameters else None
    )

@event.listens_for(Engine, "after_cursor_execute")
def receive_after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    """
    Called after SQL statement execution.
    
    Calculate duration and log query details.
    """
    total = time.time() - conn.info['query_start_time'].pop(-1)
    
    # Log query details
    logger.info(
        "Query executed",
        statement=statement[:500],
        duration_ms=round(total * 1000, 2),
        parameters=str(parameters)[:200] if parameters else None,
        rowcount=cursor.rowcount if cursor.rowcount >= 0 else None
    )
```

### Enhanced Query Logger

```python
import json
from datetime import datetime
from typing import Optional

class QueryLogger:
    """Comprehensive query logging."""
    
    def __init__(self, logger, slow_query_threshold: float = 1.0):
        self.logger = logger
        self.slow_query_threshold = slow_query_threshold
    
    def log_query(
        self,
        statement: str,
        parameters: Optional[dict],
        duration: float,
        rowcount: Optional[int] = None,
        error: Optional[str] = None
    ):
        """Log query with comprehensive details."""
        # Sanitize statement (remove sensitive data patterns)
        sanitized_statement = self._sanitize_query(statement)
        
        # Determine log level
        log_level = self._determine_log_level(duration, error)
        
        # Build log entry
        log_data = {
            "query": sanitized_statement[:500],
            "duration_ms": round(duration * 1000, 2),
            "duration_s": round(duration, 3),
            "rowcount": rowcount,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if parameters:
            log_data["parameters"] = self._sanitize_parameters(parameters)
        
        if error:
            log_data["error"] = error
        
        # Log based on level
        if log_level == "error":
            self.logger.error("database_query", **log_data)
        elif log_level == "warning":
            self.logger.warning("slow_query", **log_data)
        else:
            self.logger.info("database_query", **log_data)
    
    def _sanitize_query(self, statement: str) -> str:
        """Remove sensitive patterns from query."""
        # Remove password patterns
        statement = re.sub(
            r"(password|pwd|passwd)\s*=\s*['\"][^'\"]+['\"]",
            r"\1 = '***'",
            statement,
            flags=re.IGNORECASE
        )
        return statement
    
    def _sanitize_parameters(self, parameters: dict) -> dict:
        """Sanitize sensitive parameter values."""
        sensitive_keys = ['password', 'pwd', 'token', 'secret', 'api_key']
        sanitized = parameters.copy()
        
        for key in sanitized:
            if any(sensitive in key.lower() for sensitive in sensitive_keys):
                sanitized[key] = '***'
        
        return sanitized
    
    def _determine_log_level(self, duration: float, error: Optional[str]) -> str:
        """Determine appropriate log level."""
        if error:
            return "error"
        if duration > self.slow_query_threshold:
            return "warning"
        return "info"

# Initialize logger
query_logger = QueryLogger(logger, slow_query_threshold=1.0)

@event.listens_for(Engine, "after_cursor_execute")
def log_query_after_execute(conn, cursor, statement, parameters, context, executemany):
    """Log query after execution."""
    duration = time.time() - conn.info['query_start_time'].pop(-1)
    
    query_logger.log_query(
        statement=statement,
        parameters=parameters,
        duration=duration,
        rowcount=cursor.rowcount if cursor.rowcount >= 0 else None
    )
```

## Step 3: Slow Query Detection and Alerting

### Slow Query Logger

```python
SLOW_QUERY_THRESHOLD = 1.0  # 1 second
CRITICAL_QUERY_THRESHOLD = 5.0  # 5 seconds

@event.listens_for(Engine, "after_cursor_execute")
def detect_slow_queries(conn, cursor, statement, parameters, context, executemany):
    """Detect and alert on slow queries."""
    duration = time.time() - conn.info['query_start_time'].pop(-1)
    
    # Extract query type
    query_type = statement.strip().split()[0].upper() if statement.strip() else "UNKNOWN"
    
    if duration > CRITICAL_QUERY_THRESHOLD:
        logger.critical(
            "critical_slow_query",
            query=statement[:500],
            duration_s=duration,
            query_type=query_type,
            rowcount=cursor.rowcount,
            threshold=CRITICAL_QUERY_THRESHOLD
        )
        
        # Send alert
        asyncio.create_task(send_slow_query_alert(
            query=statement,
            duration=duration,
            severity="critical"
        ))
    
    elif duration > SLOW_QUERY_THRESHOLD:
        logger.warning(
            "slow_query_detected",
            query=statement[:500],
            duration_s=duration,
            query_type=query_type,
            rowcount=cursor.rowcount,
            threshold=SLOW_QUERY_THRESHOLD
        )

async def send_slow_query_alert(query: str, duration: float, severity: str):
    """Send alert for slow query."""
    # Send to monitoring system
    pass
```

## Step 4: Query Performance Metrics

### Prometheus Metrics

```python
from prometheus_client import Histogram, Counter

db_query_duration = Histogram(
    'db_query_duration_seconds',
    'Database query duration',
    ['operation', 'table'],
    buckets=(0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 5.0, 10.0)
)

db_query_count = Counter(
    'db_queries_total',
    'Total database queries',
    ['operation', 'table', 'status']
)

slow_query_count = Counter(
    'db_slow_queries_total',
    'Slow database queries',
    ['operation', 'table']
)

@event.listens_for(Engine, "after_cursor_execute")
def track_query_metrics(conn, cursor, statement, parameters, context, executemany):
    """Track query performance metrics."""
    duration = time.time() - conn.info['query_start_time'].pop(-1)
    
    # Parse query to extract operation and table
    operation, table = parse_query(statement)
    
    # Record metrics
    db_query_duration.labels(operation=operation, table=table).observe(duration)
    db_query_count.labels(operation=operation, table=table, status='success').inc()
    
    # Track slow queries
    if duration > SLOW_QUERY_THRESHOLD:
        slow_query_count.labels(operation=operation, table=table).inc()

def parse_query(statement: str) -> tuple[str, str]:
    """Extract operation and table from SQL statement."""
    statement_upper = statement.strip().upper()
    
    # Extract operation
    if statement_upper.startswith('SELECT'):
        operation = 'SELECT'
    elif statement_upper.startswith('INSERT'):
        operation = 'INSERT'
    elif statement_upper.startswith('UPDATE'):
        operation = 'UPDATE'
    elif statement_upper.startswith('DELETE'):
        operation = 'DELETE'
    else:
        operation = 'OTHER'
    
    # Extract table (simplified - regex would be better)
    table = 'unknown'
    # Could use SQL parsing library for accurate extraction
    
    return operation, table
```

## Step 5: Query Logging with Structured Logging

### Structured Query Logs

```python
import structlog

logger = structlog.get_logger()

@event.listens_for(Engine, "after_cursor_execute")
def log_structured_query(conn, cursor, statement, parameters, context, executemany):
    """Log query with structured logging."""
    duration = time.time() - conn.info['query_start_time'].pop(-1)
    
    # Build structured log
    log_entry = {
        "event": "database_query",
        "query_type": statement.strip().split()[0].upper(),
        "duration_ms": round(duration * 1000, 2),
        "rowcount": cursor.rowcount if cursor.rowcount >= 0 else None,
    }
    
    # Add query hash for deduplication
    query_hash = hashlib.md5(statement.encode()).hexdigest()[:8]
    log_entry["query_hash"] = query_hash
    
    # Conditionally include full query (only for slow queries)
    if duration > SLOW_QUERY_THRESHOLD:
        log_entry["query"] = statement[:1000]
        log_entry["parameters"] = str(parameters)[:500] if parameters else None
    
    logger.info(**log_entry)
```

## Step 6: Query Log Storage

### Store Queries in Database

```python
from sqlalchemy import Column, String, Float, DateTime, Text, Integer

class QueryLog(Base):
    """Store query logs in database for analysis."""
    
    __tablename__ = "query_logs"
    
    id = Column(Integer, primary_key=True)
    query_hash = Column(String(32), index=True)  # For deduplication
    query_type = Column(String(20), index=True)  # SELECT, INSERT, etc.
    table_name = Column(String(100), index=True)
    query_text = Column(Text)  # Full query
    duration_ms = Column(Float, index=True)
    rowcount = Column(Integer)
    executed_at = Column(DateTime, default=datetime.utcnow, index=True)
    error_message = Column(Text, nullable=True)

async def store_query_log(
    query: str,
    duration: float,
    rowcount: int,
    db: AsyncSession
):
    """Store query log in database."""
    query_hash = hashlib.md5(query.encode()).hexdigest()
    query_type = query.strip().split()[0].upper()
    
    log_entry = QueryLog(
        query_hash=query_hash,
        query_type=query_type,
        query_text=query[:5000],  # Truncate very long queries
        duration_ms=duration * 1000,
        rowcount=rowcount
    )
    
    db.add(log_entry)
    await db.commit()
```

## Step 7: Query Analysis and Reporting

### Analyze Query Patterns

```python
async def analyze_slow_queries(db: AsyncSession, limit: int = 10):
    """Find most common slow queries."""
    stmt = (
        select(
            QueryLog.query_hash,
            QueryLog.query_type,
            QueryLog.table_name,
            func.count(QueryLog.id).label('execution_count'),
            func.avg(QueryLog.duration_ms).label('avg_duration'),
            func.max(QueryLog.duration_ms).label('max_duration')
        )
        .where(QueryLog.duration_ms > SLOW_QUERY_THRESHOLD * 1000)
        .group_by(QueryLog.query_hash, QueryLog.query_type, QueryLog.table_name)
        .order_by(func.avg(QueryLog.duration_ms).desc())
        .limit(limit)
    )
    
    result = await db.execute(stmt)
    return result.all()

async def get_query_statistics(db: AsyncSession, hours: int = 24):
    """Get query statistics for last N hours."""
    since = datetime.utcnow() - timedelta(hours=hours)
    
    stmt = (
        select(
            func.count(QueryLog.id).label('total_queries'),
            func.avg(QueryLog.duration_ms).label('avg_duration'),
            func.max(QueryLog.duration_ms).label('max_duration'),
            func.count().filter(QueryLog.duration_ms > 1000).label('slow_queries')
        )
        .where(QueryLog.executed_at >= since)
    )
    
    result = await db.execute(stmt)
    return result.first()
```

## Step 8: Production Configuration

### Environment-Based Logging

```python
from pydantic_settings import BaseSettings

class LoggingSettings(BaseSettings):
    log_queries: bool = True
    log_slow_queries: bool = True
    slow_query_threshold: float = 1.0
    log_query_parameters: bool = False  # Security: don't log params in prod
    log_full_queries: bool = False  # Only log for slow queries
    
    class Config:
        env_file = ".env"

settings = LoggingSettings()

# Configure based on environment
if settings.log_queries:
    # Set up query logging
    pass

# Only log slow queries in production
if settings.log_slow_queries:
    # Set up slow query detection
    pass
```

## Summary

Database query logging provides:
- ✅ Performance debugging
- ✅ Slow query detection
- ✅ Query pattern analysis
- ✅ Data access auditing

Implement comprehensive query logging for production database monitoring!
