# Distributed Tracing with OpenTelemetry: Complete Guide

Distributed tracing tracks requests across services, databases, and external APIs. This guide teaches you how to implement comprehensive distributed tracing with OpenTelemetry in FastAPI.

## Understanding Distributed Tracing

**What is distributed tracing?**
Tracing follows a single request as it flows through multiple services, showing where time is spent and where failures occur.

**Visual representation:**
```
Request: GET /api/users/123
│
├─ FastAPI Service (10ms)
│  ├─ Database Query (5ms)
│  └─ Redis Cache (2ms)
│
├─ Email Service (50ms)
│  └─ SMTP Call (45ms)
│
└─ Analytics Service (30ms)
   └─ Event Logging (25ms)
```

**Benefits:**
- Debug complex distributed systems
- Identify performance bottlenecks
- Understand service dependencies
- Track request flow across services

## Step 1: OpenTelemetry Setup

### Installation

```bash
pip install opentelemetry-api opentelemetry-sdk
pip install opentelemetry-instrumentation-fastapi
pip install opentelemetry-instrumentation-sqlalchemy
pip install opentelemetry-exporter-jaeger
pip install opentelemetry-exporter-otlp
```

### Basic Configuration

```python
# tracing.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

def setup_tracing(service_name: str = "fastapi-app"):
    """Setup OpenTelemetry tracing."""
    
    # Create resource with service name
    resource = Resource.create({
        "service.name": service_name,
        "service.version": "1.0.0",
        "deployment.environment": "production"
    })
    
    # Setup tracer provider
    provider = TracerProvider(resource=resource)
    trace.set_tracer_provider(provider)
    
    # Export to Jaeger
    jaeger_exporter = JaegerExporter(
        agent_host_name="localhost",
        agent_port=6831,
    )
    
    # Use batch processor for performance
    span_processor = BatchSpanProcessor(jaeger_exporter)
    provider.add_span_processor(span_processor)
    
    # Also export to console (development)
    console_exporter = ConsoleSpanExporter()
    console_processor = BatchSpanProcessor(console_exporter)
    provider.add_span_processor(console_processor)
    
    return trace.get_tracer(__name__)

# Initialize
tracer = setup_tracing("ecommerce-api")
```

## Step 2: FastAPI Instrumentation

### Automatic Instrumentation

```python
from fastapi import FastAPI
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

app = FastAPI()

# Automatically instrument FastAPI
FastAPIInstrumentor.instrument_app(app)
```

**What this does:**
- Automatically creates spans for all HTTP requests
- Adds trace context to request headers
- Tracks request/response details

### Manual Span Creation

```python
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

@router.get("/users/{user_id}")
async def get_user(user_id: int):
    """Get user with custom spans."""
    # Create span for this operation
    with tracer.start_as_current_span("get_user") as span:
        span.set_attribute("user.id", user_id)
        
        # Nested span for database query
        with tracer.start_as_current_span("database.query") as db_span:
            db_span.set_attribute("db.statement", "SELECT * FROM users WHERE id = ?")
            user = await db.get(User, user_id)
            db_span.set_attribute("db.rows_returned", 1 if user else 0)
        
        return user
```

## Step 3: Database Query Tracing

### SQLAlchemy Instrumentation

```python
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

# Instrument SQLAlchemy
SQLAlchemyInstrumentor().instrument(
    engine=engine.sync_engine,  # Sync engine for instrumentation
    enable_commenter=True,  # Add trace comments to SQL
    commenter_options={"db_driver": True}
)
```

**What this does:**
- Automatically creates spans for all SQL queries
- Adds query details as span attributes
- Tracks query duration

### Manual Database Span Creation

```python
async def get_user_with_tracing(user_id: int, db: AsyncSession):
    """Get user with detailed tracing."""
    with tracer.start_as_current_span("database.get_user") as span:
        span.set_attributes({
            "db.system": "postgresql",
            "db.statement": "SELECT * FROM users WHERE id = ?",
            "db.user.id": user_id
        })
        
        start_time = time.time()
        user = await db.get(User, user_id)
        duration = time.time() - start_time
        
        span.set_attributes({
            "db.duration_ms": duration * 1000,
            "db.rows_returned": 1 if user else 0
        })
        
        if user:
            span.set_attribute("user.email", user.email)
        
        return user
```

## Step 4: External Service Tracing

### HTTP Client Tracing

```python
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
import httpx

# Instrument httpx client
HTTPXClientInstrumentor().instrument()

async def call_external_api(url: str, data: dict):
    """Call external API with automatic tracing."""
    with tracer.start_as_current_span("external_api.call") as span:
        span.set_attributes({
            "http.url": url,
            "http.method": "POST"
        })
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=data)
            
            span.set_attributes({
                "http.status_code": response.status_code,
                "http.response_size": len(response.content)
            })
            
            if response.status_code >= 400:
                span.record_exception(Exception(f"HTTP {response.status_code}"))
                span.set_status(trace.Status(trace.StatusCode.ERROR))
            
            return response.json()
```

## Step 5: Custom Business Logic Tracing

### Tracing Service Methods

```python
class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.tracer = trace.get_tracer(__name__)
    
    async def create_user_with_profile(self, user_data: dict):
        """Create user with profile - fully traced."""
        with self.tracer.start_as_current_span("user_service.create_with_profile") as span:
            span.set_attribute("user.email", user_data.get("email"))
            
            # Step 1: Create user
            with self.tracer.start_as_current_span("create_user") as create_span:
                user = await self._create_user(user_data)
                create_span.set_attribute("user.id", user.id)
            
            # Step 2: Create profile
            with self.tracer.start_as_current_span("create_profile") as profile_span:
                profile = await self._create_profile(user.id, user_data)
                profile_span.set_attribute("profile.id", profile.id)
            
            # Step 3: Send welcome email
            with self.tracer.start_as_current_span("send_welcome_email") as email_span:
                try:
                    await self._send_welcome_email(user.email)
                    email_span.set_status(trace.Status(trace.StatusCode.OK))
                except Exception as e:
                    email_span.record_exception(e)
                    email_span.set_status(trace.Status(trace.StatusCode.ERROR))
                    # Don't fail entire operation if email fails
            
            span.set_attribute("user.id", user.id)
            return user
```

## Step 6: Trace Context Propagation

### Propagating Trace Across Services

```python
from opentelemetry.propagate import inject, extract
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator

async def call_downstream_service(url: str, data: dict):
    """Call downstream service with trace context."""
    headers = {}
    
    # Inject trace context into headers
    inject(headers)
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            url,
            json=data,
            headers=headers  # Trace context in headers
        )
    
    return response.json()

# In downstream service, extract trace context
async def receive_request(request: Request):
    """Extract trace context from incoming request."""
    headers = dict(request.headers)
    
    # Extract trace context
    context = extract(headers)
    trace.set_tracer_provider(context)
    
    # Continue trace from parent service
    with tracer.start_as_current_span("process_request", context=context):
        # Process request
        pass
```

## Step 7: Error Tracing

### Recording Exceptions

```python
@router.post("/users")
async def create_user(user_data: UserCreate):
    """Create user with error tracing."""
    with tracer.start_as_current_span("create_user") as span:
        try:
            user = await create_user_in_db(user_data)
            span.set_attribute("user.id", user.id)
            return user
        
        except ValueError as e:
            # Record exception in trace
            span.record_exception(e)
            span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            span.set_attribute("error.type", "validation_error")
            raise
        
        except Exception as e:
            span.record_exception(e, attributes={
                "error.type": type(e).__name__,
                "error.message": str(e)
            })
            span.set_status(trace.Status(trace.StatusCode.ERROR))
            raise
```

## Step 8: Trace Sampling

### Configuring Sampling

```python
from opentelemetry.sdk.trace.sampling import TraceIdRatioBased

# Sample 10% of traces (reduce overhead)
sampler = TraceIdRatioBased(0.1)

provider = TracerProvider(
    resource=resource,
    sampler=sampler  # Only trace 10% of requests
)

# Or custom sampling logic
class CustomSampler:
    """Sample based on specific conditions."""
    
    def should_sample(self, context, trace_id, name, kind, attributes):
        # Sample all errors
        if attributes.get("error"):
            return SamplingResult(SamplingDecision.RECORD_AND_SAMPLE)
        
        # Sample slow requests (> 1 second)
        if attributes.get("duration_ms", 0) > 1000:
            return SamplingResult(SamplingDecision.RECORD_AND_SAMPLE)
        
        # Sample 5% of others
        if trace_id % 20 == 0:
            return SamplingResult(SamplingDecision.RECORD_AND_SAMPLE)
        
        return SamplingResult(SamplingDecision.DROP)
```

## Step 9: Integration with FastAPI

### Complete FastAPI Integration

```python
from fastapi import FastAPI, Request
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

app = FastAPI()

# Instrument FastAPI
FastAPIInstrumentor.instrument_app(app)

@app.middleware("http")
async def add_trace_context(request: Request, call_next):
    """Add trace context to requests."""
    # Trace context is automatically handled by FastAPIInstrumentor
    # But we can add custom attributes
    with tracer.start_as_current_span("http_request") as span:
        span.set_attributes({
            "http.method": request.method,
            "http.url": str(request.url),
            "http.path": request.url.path,
            "http.user_agent": request.headers.get("user-agent")
        })
        
        response = await call_next(request)
        
        span.set_attribute("http.status_code", response.status_code)
        return response
```

## Step 10: Viewing Traces in Jaeger

### Jaeger Setup

```yaml
# docker-compose.yml
version: '3.8'

services:
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"  # Jaeger UI
      - "6831:6831/udp"  # Jaeger agent
      - "6832:6832/udp"
```

### Access Jaeger UI

```
http://localhost:16686
```

**Features:**
- View trace timeline
- See span details
- Filter by service, operation, tags
- Compare traces

## Summary

Distributed tracing provides:
- ✅ End-to-end request visibility
- ✅ Performance bottleneck identification
- ✅ Error tracking across services
- ✅ Service dependency mapping

Implement distributed tracing for production observability!
