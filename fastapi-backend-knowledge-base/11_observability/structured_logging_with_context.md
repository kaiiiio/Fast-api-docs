# Structured Logging with Context: Complete Guide

Structured logging with context enables better debugging, monitoring, and traceability. This guide covers comprehensive structured logging setup with contextual information.

## Understanding Structured Logging

**What is structured logging?**
Logging in a structured format (JSON) with key-value pairs, making logs machine-readable and searchable.

**Benefits:**
- Easy to query and filter
- Better for log aggregation systems
- Preserves context across services
- Better debugging experience

**Example:**
```json
{
  "timestamp": "2024-01-15T10:30:45Z",
  "level": "info",
  "event": "user_created",
  "user_id": 123,
  "correlation_id": "abc-123",
  "duration_ms": 45.2
}
```

## Step 1: Structlog Setup

### Basic Configuration

```python
import structlog
import logging
import sys

# Configure structlog
structlog.configure(
    processors=[
        # Filter logs by level
        structlog.stdlib.filter_by_level,
        
        # Add logger name
        structlog.stdlib.add_logger_name,
        
        # Add log level
        structlog.stdlib.add_log_level,
        
        # Format positional arguments
        structlog.stdlib.PositionalArgumentsFormatter(),
        
        # Add timestamp
        structlog.processors.TimeStamper(fmt="iso"),
        
        # Add stack info
        structlog.processors.StackInfoRenderer(),
        
        # Format exceptions
        structlog.processors.format_exc_info,
        
        # Decode Unicode
        structlog.processors.UnicodeDecoder(),
        
        # Output as JSON
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)
```

### Production Configuration

```python
def configure_structlog(environment: str = "production"):
    """Configure structlog based on environment."""
    processors = [
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
    ]
    
    if environment == "development":
        # Pretty print in development
        processors.append(structlog.dev.ConsoleRenderer())
    else:
        # JSON in production
        processors.append(structlog.processors.JSONRenderer())
    
    structlog.configure(
        processors=processors,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
```

## Step 2: Adding Context

### Manual Context Binding

```python
from fastapi import APIRouter, Request

router = APIRouter()

@router.post("/users")
async def create_user(user_data: UserCreate, request: Request):
    """Create user with structured logging."""
    # Create logger with initial context
    log = logger.bind(
        endpoint="/users",
        method="POST",
        correlation_id=request.headers.get("X-Correlation-ID"),
        user_id=None  # Will update later
    )
    
    log.info("user_creation_started", email=user_data.email)
    
    try:
        user = await create_user_in_db(user_data)
        
        # Update context with user ID
        log = log.bind(user_id=user.id)
        log.info("user_creation_completed", email=user.email)
        
        return user
    
    except Exception as e:
        log.error("user_creation_failed", error=str(e), error_type=type(e).__name__)
        raise
```

### Context Inheritance

```python
async def create_user_with_profile(user_data: dict, request: Request):
    """Create user with profile - context flows through."""
    # Parent context
    log = logger.bind(
        operation="create_user_with_profile",
        correlation_id=request.headers.get("X-Correlation-ID")
    )
    
    log.info("operation_started")
    
    # Child operations inherit context
    user = await create_user(user_data, log)  # Pass logger
    profile = await create_profile(user.id, log)  # Same logger = same context
    
    log.info("operation_completed", user_id=user.id)
    return user

async def create_user(user_data: dict, parent_log):
    """Create user - inherits context from parent."""
    log = parent_log.bind(step="create_user")
    log.info("creating_user")
    # ... create user logic
    return user
```

## Step 3: Request Context Middleware

### Automatic Context Injection

```python
from fastapi import Request
import uuid

@app.middleware("http")
async def add_logging_context(request: Request, call_next):
    """Add request context to all logs."""
    # Generate or extract correlation ID
    correlation_id = (
        request.headers.get("X-Correlation-ID") or 
        str(uuid.uuid4())
    )
    
    # Add to response headers
    request.state.correlation_id = correlation_id
    
    # Clear any existing context
    structlog.contextvars.clear_contextvars()
    
    # Bind context variables (available to all loggers in this request)
    structlog.contextvars.bind_contextvars(
        correlation_id=correlation_id,
        path=request.url.path,
        method=request.method,
        request_id=str(uuid.uuid4()),
        client_ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    
    # Process request
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    
    # Log request completion
    logger.info(
        "request_completed",
        status_code=response.status_code,
        duration_ms=duration * 1000
    )
    
    # Add correlation ID to response
    response.headers["X-Correlation-ID"] = correlation_id
    
    return response
```

### Context in Logs (Automatic)

```python
@router.get("/users/{user_id}")
async def get_user(user_id: int):
    """
    All logs in this function automatically include:
    - correlation_id
    - path
    - method
    - request_id
    """
    # No need to manually add context - it's already there!
    logger.info("fetching_user", user_id=user_id)
    
    user = await db.get(User, user_id)
    
    logger.info("user_fetched", user_id=user_id, email=user.email)
    
    return user
```

## Step 4: Error Logging with Context

### Comprehensive Error Logging

```python
@router.post("/orders")
async def create_order(order_data: OrderCreate, request: Request):
    """Create order with comprehensive error logging."""
    log = logger.bind(
        operation="create_order",
        correlation_id=request.state.correlation_id
    )
    
    log.info("order_creation_started", user_id=order_data.user_id)
    
    try:
        # Validate user
        user = await db.get(User, order_data.user_id)
        if not user:
            log.warning("user_not_found", user_id=order_data.user_id)
            raise HTTPException(404, "User not found")
        
        log = log.bind(user_id=user.id, user_email=user.email)
        
        # Create order
        order = await create_order_logic(order_data)
        log = log.bind(order_id=order.id)
        
        log.info("order_created", total_amount=float(order.total_amount))
        
        return order
    
    except HTTPException:
        # Re-raise HTTP exceptions (no logging needed)
        raise
    
    except ValidationError as e:
        log.error(
            "order_validation_failed",
            error=str(e),
            error_type="validation_error",
            validation_errors=e.errors() if hasattr(e, 'errors') else None
        )
        raise HTTPException(400, detail=str(e))
    
    except Exception as e:
        log.error(
            "order_creation_failed",
            error=str(e),
            error_type=type(e).__name__,
            exc_info=True  # Include full traceback
        )
        raise HTTPException(500, "Internal server error")
```

## Step 5: Performance Logging

### Logging Request Duration

```python
@router.get("/products/search")
async def search_products(query: str, db: AsyncSession = Depends(get_db)):
    """Search products with performance logging."""
    start_time = time.time()
    
    log = logger.bind(
        operation="search_products",
        query=query
    )
    
    log.info("search_started")
    
    try:
        # Execute search
        products = await db.execute(
            select(Product).where(Product.name.ilike(f"%{query}%"))
        )
        results = products.scalars().all()
        
        duration = time.time() - start_time
        
        log.info(
            "search_completed",
            duration_ms=duration * 1000,
            result_count=len(results),
            query_duration_ms=duration * 1000
        )
        
        return {"products": results, "count": len(results)}
    
    except Exception as e:
        duration = time.time() - start_time
        log.error(
            "search_failed",
            duration_ms=duration * 1000,
            error=str(e)
        )
        raise
```

## Step 6: Business Event Logging

### Logging Business Events

```python
async def process_payment(order_id: int, amount: float):
    """Process payment with business event logging."""
    log = logger.bind(
        event_type="payment_processing",
        order_id=order_id,
        amount=amount
    )
    
    log.info("payment_initiated")
    
    try:
        # Process payment
        result = payment_gateway.charge(order_id, amount)
        
        log.info(
            "payment_succeeded",
            transaction_id=result.transaction_id,
            payment_method=result.payment_method
        )
        
        return result
    
    except PaymentGatewayError as e:
        log.error(
            "payment_failed",
            error=str(e),
            error_code=e.code,
            retryable=e.retryable
        )
        raise
```

## Step 7: Log Aggregation Integration

### ELK Stack Integration

```python
import logging
import structlog
from pythonjsonlogger import jsonlogger

# Configure handler for ELK
logHandler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter(
    '%(timestamp)s %(level)s %(name)s %(message)s'
)
logHandler.setFormatter(formatter)

# Add handler
root_logger = logging.getLogger()
root_logger.addHandler(logHandler)
root_logger.setLevel(logging.INFO)

# Structlog will use this handler
```

### CloudWatch Integration

```python
import watchtower

# CloudWatch handler
handler = watchtower.CloudWatchLogHandler(
    log_group="fastapi-app",
    stream_name="api",
    use_queues=False
)

logging.getLogger().addHandler(handler)
```

## Best Practices

1. **Always include correlation_id**: Track requests across services
2. **Log at appropriate levels**: Info for normal flow, error for failures
3. **Include context**: User ID, request ID, operation type
4. **Don't log sensitive data**: Passwords, tokens, PII
5. **Use structured fields**: Key-value pairs, not free text
6. **Sample high-volume logs**: Don't log every request in high-traffic endpoints

## Summary

Structured logging provides:
- ✅ Better debugging with context
- ✅ Machine-readable logs
- ✅ Distributed tracing support
- ✅ Production-ready logging

Implement structured logging for comprehensive observability!
