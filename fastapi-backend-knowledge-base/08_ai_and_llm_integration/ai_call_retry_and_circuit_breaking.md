# AI Call Retry and Circuit Breaking: Complete Resilience Guide

LLM APIs can be unreliable. Retry logic and circuit breakers ensure resilience and prevent cascading failures. This comprehensive guide covers production-ready patterns for AI API reliability.

## Understanding the Problem

**Why LLM APIs fail:**
- Rate limits (API throttling)
- Network timeouts
- Service outages
- Token limit errors
- Transient errors

**Without resilience:**
- Single failure breaks entire application
- Cascading failures
- Poor user experience
- Unpredictable behavior

## Step 1: Basic Retry Logic

### Simple Retry with Tenacity

```python
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log
)
import openai
import logging

logger = logging.getLogger(__name__)

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10),
    retry=retry_if_exception_type((openai.RateLimitError, openai.APITimeoutError)),
    before_sleep=before_sleep_log(logger, logging.WARNING)
)
async def call_llm_with_retry(prompt: str, model: str = "gpt-4"):
    """
    Call LLM with automatic retry for transient errors.
    
    Retries on:
    - RateLimitError (429)
    - APITimeoutError
    - Connection errors
    """
    try:
        response = await openai_client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            timeout=30.0
        )
        return response
    except openai.RateLimitError as e:
        logger.warning(f"Rate limit hit, retrying... Error: {e}")
        raise  # Retry with exponential backoff
    except openai.APITimeoutError as e:
        logger.warning(f"Timeout, retrying... Error: {e}")
        raise
    except openai.APIError as e:
        # Don't retry on non-retryable errors
        logger.error(f"Non-retryable API error: {e}")
        raise
```

### Understanding Retry Parameters

**stop_after_attempt(3):**
- Maximum number of retry attempts
- Total attempts = 3 (1 initial + 2 retries)

**wait_exponential(multiplier=1, min=4, max=10):**
- Exponential backoff: 4s, 8s, 16s (capped at 10s)
- Prevents overwhelming failing service
- Jitter automatically added

**retry_if_exception_type:**
- Only retry on specific exceptions
- Don't retry on client errors (4xx)

## Step 2: Advanced Retry Strategies

### Error Classification

```python
from enum import Enum

class ErrorCategory(str, Enum):
    RETRYABLE = "retryable"  # Should retry
    NON_RETRYABLE = "non_retryable"  # Don't retry
    CRITICAL = "critical"  # Stop immediately

def classify_error(error: Exception) -> ErrorCategory:
    """Classify error for retry decision."""
    if isinstance(error, openai.RateLimitError):
        return ErrorCategory.RETRYABLE
    elif isinstance(error, openai.APITimeoutError):
        return ErrorCategory.RETRYABLE
    elif isinstance(error, openai.APIConnectionError):
        return ErrorCategory.RETRYABLE
    elif isinstance(error, openai.AuthenticationError):
        return ErrorCategory.CRITICAL  # Don't retry auth errors
    elif isinstance(error, openai.APIError):
        # Check status code
        if hasattr(error, 'status_code'):
            if error.status_code >= 500:
                return ErrorCategory.RETRYABLE  # Server errors
            else:
                return ErrorCategory.NON_RETRYABLE  # Client errors
    return ErrorCategory.NON_RETRYABLE

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10),
    retry=retry_if(lambda e: classify_error(e) == ErrorCategory.RETRYABLE),
    reraise=True
)
async def call_llm_with_smart_retry(prompt: str):
    """Call LLM with intelligent error classification."""
    try:
        return await openai_client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}]
        )
    except Exception as e:
        category = classify_error(e)
        if category == ErrorCategory.CRITICAL:
            logger.error(f"Critical error, not retrying: {e}")
            raise
        raise  # Retry will be handled by decorator
```

### Rate Limit Handling

```python
from tenacity import wait_exponential, stop_after_delay

@retry(
    stop=stop_after_delay(300),  # Stop after 5 minutes total
    wait=wait_exponential(multiplier=2, min=10, max=120),
    retry=retry_if_exception_type(openai.RateLimitError)
)
async def call_llm_with_rate_limit_handling(prompt: str):
    """
    Handle rate limits with longer backoff.
    
    Rate limits typically require longer waits.
    """
    response = await openai_client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}]
    )
    return response
```

### Token Limit Handling

```python
@retry(
    stop=stop_after_attempt(1),  # Don't retry token errors
    retry=retry_if_exception_type()  # Never retry
)
async def call_llm_with_token_check(prompt: str, max_tokens: int = 1000):
    """Handle token limit errors without retry."""
    try:
        response = await openai_client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens
        )
        return response
    except openai.APIError as e:
        if "token" in str(e).lower() or "length" in str(e).lower():
            logger.error(f"Token limit error: {e}")
            # Reduce prompt or max_tokens
            # Don't retry - will fail again
            raise ValueError(f"Token limit exceeded: {e}")
        raise
```

## Step 3: Circuit Breaker Pattern

### Basic Circuit Breaker

**What is a circuit breaker?**
A pattern that prevents cascading failures by "opening" the circuit after too many failures, failing fast instead of retrying.

**States:**
- **Closed**: Normal operation, requests pass through
- **Open**: Too many failures, requests fail fast
- **Half-Open**: Testing if service recovered

### Circuit Breaker Implementation

```python
from enum import Enum
from datetime import datetime, timedelta
from typing import Optional

class CircuitState(str, Enum):
    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Failing fast
    HALF_OPEN = "half_open"  # Testing recovery

class CircuitBreaker:
    """Simple circuit breaker implementation."""
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        success_threshold: int = 2
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.success_threshold = success_threshold
        
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time: Optional[datetime] = None
        self.opened_at: Optional[datetime] = None
    
    def call(self, func: callable, *args, **kwargs):
        """Execute function with circuit breaker protection."""
        if self.state == CircuitState.OPEN:
            # Check if recovery timeout passed
            if datetime.utcnow() - self.opened_at > timedelta(seconds=self.recovery_timeout):
                logger.info("Circuit breaker: Attempting recovery (half-open)")
                self.state = CircuitState.HALF_OPEN
                self.success_count = 0
            else:
                raise Exception("Circuit breaker is OPEN - service unavailable")
        
        # Try to call function
        try:
            result = func(*args, **kwargs)
            
            # Success - reset failure count
            if self.state == CircuitState.HALF_OPEN:
                self.success_count += 1
                if self.success_count >= self.success_threshold:
                    logger.info("Circuit breaker: Recovered (closed)")
                    self.state = CircuitState.CLOSED
                    self.failure_count = 0
            elif self.state == CircuitState.CLOSED:
                self.failure_count = 0
            
            return result
        
        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = datetime.utcnow()
            
            if self.failure_count >= self.failure_threshold:
                logger.error(f"Circuit breaker: Opening after {self.failure_count} failures")
                self.state = CircuitState.OPEN
                self.opened_at = datetime.utcnow()
            
            raise

# Usage
circuit_breaker = CircuitBreaker(failure_threshold=5, recovery_timeout=60)

@circuit_breaker.call
async def call_llm_safe(prompt: str):
    """LLM call protected by circuit breaker."""
    return await openai_client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}]
    )
```

### Using CircuitBreaker Library

```python
from circuitbreaker import circuit

@circuit(
    failure_threshold=5,
    recovery_timeout=60,
    expected_exception=openai.APIError
)
async def call_llm_with_circuit_breaker(prompt: str):
    """LLM call with circuit breaker from library."""
    return await openai_client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}]
    )

# If 5 failures occur:
# - Circuit opens for 60 seconds
# - All requests fail fast with CircuitBreakerError
# - After timeout, attempts recovery
```

## Step 4: Combined Approach (Retry + Circuit Breaker)

### Layered Resilience

```python
from circuitbreaker import circuit
from tenacity import retry, stop_after_attempt, wait_exponential

# Layer 1: Circuit breaker (prevents cascading failures)
@circuit(failure_threshold=5, recovery_timeout=60)
# Layer 2: Retry (handles transient errors)
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10),
    retry=retry_if_exception_type((openai.RateLimitError, openai.APITimeoutError))
)
async def resilient_llm_call(prompt: str, model: str = "gpt-4"):
    """
    LLM call with both retry and circuit breaker.
    
    Flow:
    1. Circuit breaker checks if service is available
    2. If closed/half-open, attempt call
    3. On failure, retry with exponential backoff (up to 3 times)
    4. If all retries fail, circuit breaker records failure
    5. After threshold failures, circuit opens (fail fast)
    """
    response = await openai_client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        timeout=30.0
    )
    return response
```

## Step 5: Fallback Strategies

### Graceful Degradation

```python
async def call_llm_with_fallback(prompt: str):
    """
    Try primary model, fallback to cheaper/faster model.
    """
    try:
        # Try GPT-4 (best quality)
        return await resilient_llm_call(prompt, model="gpt-4")
    except Exception as e:
        logger.warning(f"GPT-4 failed, falling back to GPT-3.5: {e}")
        try:
            # Fallback to GPT-3.5 (cheaper, faster)
            return await resilient_llm_call(prompt, model="gpt-3.5-turbo")
        except Exception as e2:
            logger.error(f"All models failed: {e2}")
            # Return default response or cached result
            return {"error": "AI service unavailable", "message": "Please try again later"}
```

### Cached Fallback

```python
from functools import lru_cache
import hashlib

def hash_prompt(prompt: str) -> str:
    """Hash prompt for cache key."""
    return hashlib.md5(prompt.encode()).hexdigest()

async def call_llm_with_cache_fallback(prompt: str):
    """Use cached result if API fails."""
    cache_key = f"llm_cache:{hash_prompt(prompt)}"
    
    try:
        # Try API call
        response = await resilient_llm_call(prompt)
        
        # Cache successful response
        await redis.setex(cache_key, 3600, json.dumps(response))
        
        return response
    
    except Exception as e:
        logger.warning(f"LLM call failed, checking cache: {e}")
        
        # Fallback to cache
        cached = await redis.get(cache_key)
        if cached:
            logger.info("Returning cached response")
            return json.loads(cached)
        
        # No cache, raise error
        raise
```

## Step 6: Monitoring and Metrics

### Track Circuit Breaker State

```python
from prometheus_client import Gauge, Counter

circuit_breaker_state = Gauge(
    'llm_circuit_breaker_state',
    'Circuit breaker state (0=closed, 1=open, 2=half-open)',
    ['model']
)

circuit_breaker_failures = Counter(
    'llm_circuit_breaker_failures_total',
    'Total circuit breaker failures',
    ['model']
)

class MonitoredCircuitBreaker(CircuitBreaker):
    """Circuit breaker with metrics."""
    
    def __init__(self, model: str, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.model = model
    
    def _update_state(self, new_state: CircuitState):
        """Update state and metrics."""
        self.state = new_state
        
        state_values = {
            CircuitState.CLOSED: 0,
            CircuitState.OPEN: 1,
            CircuitState.HALF_OPEN: 2
        }
        
        circuit_breaker_state.labels(model=self.model).set(
            state_values[new_state]
        )
        
        if new_state == CircuitState.OPEN:
            circuit_breaker_failures.labels(model=self.model).inc()
```

## Step 7: FastAPI Integration

### Dependency Injection

```python
from fastapi import Depends

# Create circuit breaker per model
gpt4_circuit_breaker = MonitoredCircuitBreaker(model="gpt-4")
gpt35_circuit_breaker = MonitoredCircuitBreaker(model="gpt-3.5-turbo")

async def get_llm_service(model: str = "gpt-4") -> LLMService:
    """Get LLM service with circuit breaker."""
    circuit_breaker = (
        gpt4_circuit_breaker if model == "gpt-4" else gpt35_circuit_breaker
    )
    return LLMService(circuit_breaker=circuit_breaker)

@router.post("/chat")
async def chat(
    prompt: str,
    model: str = "gpt-4",
    llm_service: LLMService = Depends(get_llm_service)
):
    """Chat endpoint with resilient LLM calls."""
    try:
        response = await llm_service.call_with_retry(prompt, model=model)
        return {"response": response.choices[0].message.content}
    except Exception as e:
        logger.error(f"LLM call failed: {e}")
        raise HTTPException(status_code=503, detail="AI service temporarily unavailable")
```

## Best Practices

1. **✅ Classify errors**: Only retry retryable errors
2. **✅ Use exponential backoff**: Prevent overwhelming service
3. **✅ Set timeouts**: Don't wait indefinitely
4. **✅ Implement circuit breakers**: Prevent cascading failures
5. **✅ Provide fallbacks**: Graceful degradation
6. **✅ Monitor metrics**: Track failure rates and circuit state
7. **✅ Log appropriately**: Debug without noise

## Summary

Retry and circuit breaking provide:
- ✅ Resilience to transient failures
- ✅ Prevention of cascading failures
- ✅ Better user experience
- ✅ Production-ready AI integrations

Implement comprehensive resilience patterns for reliable AI applications!
