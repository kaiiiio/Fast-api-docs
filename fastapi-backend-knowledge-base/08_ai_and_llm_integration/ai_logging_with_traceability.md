# AI Logging with Traceability: Complete Observability Guide

Comprehensive logging helps debug and audit AI operations. This guide covers structured logging, traceability, and complete observability for AI-powered applications.

## Understanding AI Logging Requirements

**Why comprehensive logging?**
- Debug AI failures and unexpected outputs
- Audit AI usage and decisions
- Track costs and performance
- Comply with regulations
- Trace requests end-to-end

**What to log:**
- Input prompts and parameters
- Model responses and outputs
- Token usage and costs
- Latency and performance
- Errors and failures
- User interactions

## Step 1: Structured Logging Setup

### Basic Structured Logging

```python
import structlog
import logging
from datetime import datetime

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()  # JSON output
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()
```

## Step 2: LLM Call Logging

### Comprehensive LLM Request Logging

```python
import uuid
import time
from typing import Optional, Dict, Any

class LLMLogger:
    """Logger for LLM operations with traceability."""
    
    def __init__(self, request_id: Optional[str] = None):
        self.request_id = request_id or str(uuid.uuid4())
        self.logger = logger.bind(request_id=self.request_id)
    
    async def log_llm_request(
        self,
        prompt: str,
        model: str,
        user_id: Optional[int] = None,
        endpoint: Optional[str] = None,
        parameters: Optional[Dict[str, Any]] = None
    ):
        """Log LLM request initiation."""
        # Hash prompt for privacy (optional)
        prompt_hash = hashlib.md5(prompt.encode()).hexdigest()[:16]
        
        self.logger.info(
            "llm_request_started",
            model=model,
            user_id=user_id,
            endpoint=endpoint,
            prompt_length=len(prompt),
            prompt_hash=prompt_hash,  # For deduplication
            prompt_preview=prompt[:100] + "..." if len(prompt) > 100 else prompt,  # First 100 chars
            parameters=parameters or {},
            timestamp=datetime.utcnow().isoformat()
        )
    
    async def log_llm_response(
        self,
        response: Any,
        duration_ms: float,
        model: str,
        usage: Optional[Dict[str, int]] = None
    ):
        """Log LLM response completion."""
        self.logger.info(
            "llm_request_completed",
            model=model,
            duration_ms=duration_ms,
            tokens_input=usage.get("prompt_tokens") if usage else None,
            tokens_output=usage.get("completion_tokens") if usage else None,
            tokens_total=usage.get("total_tokens") if usage else None,
            response_length=len(response) if isinstance(response, str) else None,
            response_preview=response[:100] + "..." if isinstance(response, str) and len(response) > 100 else response,
            timestamp=datetime.utcnow().isoformat()
        )
    
    async def log_llm_error(
        self,
        error: Exception,
        model: str,
        duration_ms: Optional[float] = None
    ):
        """Log LLM request failure."""
        self.logger.error(
            "llm_request_failed",
            model=model,
            error_type=type(error).__name__,
            error_message=str(error),
            duration_ms=duration_ms,
            timestamp=datetime.utcnow().isoformat(),
            exc_info=True  # Include stack trace
        )

# Usage
async def call_llm_with_logging(prompt: str, model: str = "gpt-4", user_id: Optional[int] = None):
    """LLM call with comprehensive logging."""
    llm_logger = LLMLogger()
    
    start_time = time.time()
    
    try:
        # Log request
        await llm_logger.log_llm_request(
            prompt=prompt,
            model=model,
            user_id=user_id,
            endpoint="/chat"
        )
        
        # Call LLM
        response = await openai_client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}]
        )
        
        duration = (time.time() - start_time) * 1000
        
        # Log response
        await llm_logger.log_llm_response(
            response=response.choices[0].message.content,
            duration_ms=duration,
            model=model,
            usage={
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }
        )
        
        return response
    
    except Exception as e:
        duration = (time.time() - start_time) * 1000
        await llm_logger.log_llm_error(e, model=model, duration_ms=duration)
        raise
```

## Step 3: Correlation IDs and Tracing

### End-to-End Request Tracing

```python
from fastapi import Request, Header
from typing import Optional

class RequestTracer:
    """Tracer for end-to-end request tracking."""
    
    def __init__(self, correlation_id: Optional[str] = None):
        self.correlation_id = correlation_id or str(uuid.uuid4())
        self.logger = logger.bind(correlation_id=self.correlation_id)
    
    def bind_context(self, **kwargs):
        """Bind additional context to logger."""
        self.logger = self.logger.bind(**kwargs)
        return self.logger

# Middleware for correlation ID
@app.middleware("http")
async def add_correlation_id(request: Request, call_next):
    """Add correlation ID to all requests."""
    correlation_id = (
        request.headers.get("X-Correlation-ID") or
        request.headers.get("X-Request-ID") or
        str(uuid.uuid4())
    )
    
    # Bind to structlog context
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(
        correlation_id=correlation_id,
        path=request.url.path,
        method=request.method,
        user_agent=request.headers.get("user-agent")
    )
    
    # Add to request state
    request.state.correlation_id = correlation_id
    
    # Process request
    response = await call_next(request)
    
    # Add to response headers
    response.headers["X-Correlation-ID"] = correlation_id
    
    return response

# Usage in routes
@router.post("/chat")
async def chat(
    prompt: str,
    request: Request,
    user_id: int = Depends(get_current_user_id)
):
    """Chat endpoint with traceability."""
    correlation_id = request.state.correlation_id
    
    # All logs automatically include correlation_id
    logger.info(
        "chat_request",
        user_id=user_id,
        prompt_length=len(prompt)
    )
    
    # Call LLM (logs will include same correlation_id)
    response = await call_llm_with_logging(
        prompt=prompt,
        user_id=user_id
    )
    
    logger.info(
        "chat_response",
        user_id=user_id,
        response_length=len(response)
    )
    
    return {
        "response": response,
        "correlation_id": correlation_id
    }
```

## Step 4: Storing Logs in Database

### Persistent Log Storage

```python
from sqlalchemy import Column, Text, JSON, Index

class LLMRequestLog(Base):
    """Store LLM requests for analysis and auditing."""
    __tablename__ = "llm_request_logs"
    
    id = Column(Integer, primary_key=True)
    correlation_id = Column(String(100), nullable=False, index=True)
    request_id = Column(String(100), nullable=False, unique=True)
    
    # Request details
    model = Column(String(50), nullable=False, index=True)
    prompt_hash = Column(String(64), index=True)  # Hash for privacy
    prompt_preview = Column(Text)  # First 500 chars
    prompt_length = Column(Integer)
    
    # Response details
    response_preview = Column(Text)  # First 500 chars
    response_length = Column(Integer)
    
    # Performance
    duration_ms = Column(Float)
    tokens_input = Column(Integer)
    tokens_output = Column(Integer)
    tokens_total = Column(Integer)
    
    # Context
    user_id = Column(Integer, index=True)
    endpoint = Column(String(255), index=True)
    parameters = Column(JSON)  # Model parameters
    
    # Status
    success = Column(Boolean, default=True, index=True)
    error_type = Column(String(100))
    error_message = Column(Text)
    
    # Timestamps
    started_at = Column(DateTime, nullable=False, index=True)
    completed_at = Column(DateTime)
    
    __table_args__ = (
        Index('idx_logs_user_timestamp', 'user_id', 'started_at'),
        Index('idx_logs_model_timestamp', 'model', 'started_at'),
    )

async def store_llm_log(
    db: AsyncSession,
    correlation_id: str,
    request_id: str,
    model: str,
    prompt: str,
    response: Optional[str] = None,
    error: Optional[Exception] = None,
    duration_ms: Optional[float] = None,
    usage: Optional[Dict] = None,
    user_id: Optional[int] = None,
    endpoint: Optional[str] = None
):
    """Store LLM request log in database."""
    prompt_hash = hashlib.md5(prompt.encode()).hexdigest()
    
    log_entry = LLMRequestLog(
        correlation_id=correlation_id,
        request_id=request_id,
        model=model,
        prompt_hash=prompt_hash,
        prompt_preview=prompt[:500],
        prompt_length=len(prompt),
        response_preview=response[:500] if response else None,
        response_length=len(response) if response else None,
        duration_ms=duration_ms,
        tokens_input=usage.get("prompt_tokens") if usage else None,
        tokens_output=usage.get("completion_tokens") if usage else None,
        tokens_total=usage.get("total_tokens") if usage else None,
        user_id=user_id,
        endpoint=endpoint,
        success=error is None,
        error_type=type(error).__name__ if error else None,
        error_message=str(error) if error else None,
        started_at=datetime.utcnow(),
        completed_at=datetime.utcnow()
    )
    
    db.add(log_entry)
    await db.commit()
    
    return log_entry
```

## Step 5: Logging Decorator

### Automatic Logging Decorator

```python
from functools import wraps

def log_llm_operation(
    log_to_db: bool = True,
    sanitize_prompt: bool = False
):
    """Decorator to automatically log LLM operations."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            request_id = str(uuid.uuid4())
            correlation_id = structlog.contextvars.get_contextvars().get("correlation_id")
            
            # Extract prompt and model
            prompt = kwargs.get("prompt") or (args[0] if args else "")
            model = kwargs.get("model") or "gpt-4"
            
            logger.info(
                "llm_operation_started",
                request_id=request_id,
                correlation_id=correlation_id,
                function=func.__name__,
                model=model
            )
            
            start_time = time.time()
            error = None
            
            try:
                result = await func(*args, **kwargs)
                
                duration = (time.time() - start_time) * 1000
                
                logger.info(
                    "llm_operation_completed",
                    request_id=request_id,
                    correlation_id=correlation_id,
                    function=func.__name__,
                    duration_ms=duration,
                    success=True
                )
                
                # Store in database if enabled
                if log_to_db and 'db' in kwargs:
                    await store_llm_log(
                        db=kwargs['db'],
                        correlation_id=correlation_id or "",
                        request_id=request_id,
                        model=model,
                        prompt=prompt,
                        response=str(result) if result else None,
                        duration_ms=duration,
                        user_id=kwargs.get("user_id")
                    )
                
                return result
            
            except Exception as e:
                duration = (time.time() - start_time) * 1000
                error = e
                
                logger.error(
                    "llm_operation_failed",
                    request_id=request_id,
                    correlation_id=correlation_id,
                    function=func.__name__,
                    duration_ms=duration,
                    error_type=type(e).__name__,
                    error_message=str(e),
                    exc_info=True
                )
                
                raise
        
        return wrapper
    return decorator

# Usage
@log_llm_operation(log_to_db=True)
async def parse_resume(resume_text: str, model: str = "gpt-4", db: AsyncSession = None):
    """Parse resume with automatic logging."""
    response = await openai_client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": f"Parse this resume: {resume_text}"}]
    )
    return response
```

## Step 6: Audit Trail for AI Decisions

### Decision Logging

```python
class AIDecisionLog(Base):
    """Log AI decisions for audit trail."""
    __tablename__ = "ai_decision_logs"
    
    id = Column(Integer, primary_key=True)
    correlation_id = Column(String(100), index=True)
    
    # Decision context
    decision_type = Column(String(100), nullable=False)  # 'job_match', 'resume_parse', etc.
    input_data_hash = Column(String(64))  # Hash of input for privacy
    decision_result = Column(JSON)  # Decision output
    
    # Model details
    model = Column(String(50))
    confidence_score = Column(Float)  # If available
    reasoning = Column(Text)  # Model reasoning if provided
    
    # Context
    user_id = Column(Integer, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

async def log_ai_decision(
    db: AsyncSession,
    decision_type: str,
    input_data: Dict,
    decision_result: Dict,
    model: str,
    user_id: Optional[int] = None,
    confidence_score: Optional[float] = None,
    reasoning: Optional[str] = None
):
    """Log AI decision for audit trail."""
    correlation_id = structlog.contextvars.get_contextvars().get("correlation_id", "")
    input_hash = hashlib.md5(json.dumps(input_data, sort_keys=True).encode()).hexdigest()
    
    log_entry = AIDecisionLog(
        correlation_id=correlation_id,
        decision_type=decision_type,
        input_data_hash=input_hash,
        decision_result=decision_result,
        model=model,
        confidence_score=confidence_score,
        reasoning=reasoning,
        user_id=user_id
    )
    
    db.add(log_entry)
    await db.commit()
    
    return log_entry
```

## Step 7: Log Analysis and Monitoring

### Query Logs by Correlation ID

```python
async def get_request_trace(correlation_id: str, db: AsyncSession) -> Dict:
    """Get complete trace for a request."""
    # Get all logs for this correlation ID
    stmt = select(LLMRequestLog).where(
        LLMRequestLog.correlation_id == correlation_id
    ).order_by(LLMRequestLog.started_at)
    
    result = await db.execute(stmt)
    logs = result.scalars().all()
    
    return {
        "correlation_id": correlation_id,
        "logs": [
            {
                "model": log.model,
                "endpoint": log.endpoint,
                "duration_ms": log.duration_ms,
                "success": log.success,
                "timestamp": log.started_at.isoformat()
            }
            for log in logs
        ],
        "total_llm_calls": len(logs),
        "total_tokens": sum(log.tokens_total or 0 for log in logs)
    }

@router.get("/trace/{correlation_id}")
async def get_trace(correlation_id: str, db: AsyncSession = Depends(get_db)):
    """Get complete trace for debugging."""
    trace = await get_request_trace(correlation_id, db)
    return trace
```

## Best Practices

1. **✅ Use correlation IDs**: Track requests across services
2. **✅ Hash sensitive data**: Don't log full prompts/responses
3. **✅ Store logs persistently**: Database for analysis
4. **✅ Include context**: User ID, endpoint, timestamps
5. **✅ Log errors completely**: Stack traces, error types
6. **✅ Sanitize PII**: Remove sensitive information before logging

## Summary

Comprehensive AI logging provides:
- ✅ End-to-end traceability
- ✅ Debugging capabilities
- ✅ Audit trail for compliance
- ✅ Performance monitoring

Implement comprehensive logging for production AI applications!
