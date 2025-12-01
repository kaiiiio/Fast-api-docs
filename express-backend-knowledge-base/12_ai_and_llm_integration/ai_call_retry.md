# AI Call Retry and Circuit Breaking: Handling LLM Failures

Retry logic and circuit breaking handle transient LLM API failures. This guide covers implementing retry patterns and circuit breakers for AI calls in Express.js.

## Retry with Exponential Backoff

```javascript
async function callOpenAIWithRetry(prompt, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }]
            });
            return response;
        } catch (error) {
            lastError = error;
            
            // Don't retry on client errors (4xx)
            if (error.status >= 400 && error.status < 500) {
                throw error;
            }
            
            // Exponential backoff
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    throw lastError;
}
```

## Circuit Breaker Pattern

```javascript
class CircuitBreaker {
    constructor(threshold = 5, timeout = 60000) {
        this.failureCount = 0;
        this.threshold = threshold;
        this.timeout = timeout;
        this.state = 'CLOSED';  // CLOSED, OPEN, HALF_OPEN
        this.nextAttempt = Date.now();
    }
    
    async execute(fn) {
        if (this.state === 'OPEN') {
            if (Date.now() < this.nextAttempt) {
                throw new Error('Circuit breaker is OPEN');
            }
            this.state = 'HALF_OPEN';
        }
        
        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }
    
    onSuccess() {
        this.failureCount = 0;
        this.state = 'CLOSED';
    }
    
    onFailure() {
        this.failureCount++;
        if (this.failureCount >= this.threshold) {
            this.state = 'OPEN';
            this.nextAttempt = Date.now() + this.timeout;
        }
    }
}

// Use
const circuitBreaker = new CircuitBreaker(5, 60000);

async function callOpenAI(prompt) {
    return await circuitBreaker.execute(async () => {
        return await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }]
        });
    });
}
```

## Real-World Examples

### Example 1: Complete Retry with Circuit Breaker

```javascript
class AIClient {
    constructor() {
        this.circuitBreaker = new CircuitBreaker(5, 60000);
    }
    
    async call(prompt, options = {}) {
        const { maxRetries = 3, model = 'gpt-3.5-turbo' } = options;
        
        return await this.circuitBreaker.execute(async () => {
            let lastError;
            
            for (let attempt = 0; attempt < maxRetries; attempt++) {
                try {
                    const response = await openai.chat.completions.create({
                        model,
                        messages: [{ role: 'user', content: prompt }]
                    });
                    return response;
                } catch (error) {
                    lastError = error;
                    
                    // Classify error
                    if (this.isRetryableError(error)) {
                        const delay = Math.pow(2, attempt) * 1000;
                        await new Promise(resolve => setTimeout(resolve, delay));
                    } else {
                        throw error;
                    }
                }
            }
            
            throw lastError;
        });
    }
    
    isRetryableError(error) {
        // Retry on network errors, rate limits, server errors
        return error.code === 'ECONNREFUSED' ||
               error.status === 429 ||
               error.status >= 500;
    }
}
```

## Best Practices

1. **Retry Transient Errors**: Network, rate limits, 5xx
2. **Don't Retry Client Errors**: 4xx (except 429)
3. **Use Circuit Breaker**: Prevent cascade failures
4. **Exponential Backoff**: Reduce load on failing service
5. **Monitor**: Track retry rates and circuit breaker state

## Summary

**AI Call Retry and Circuit Breaking:**

1. **Retry**: Exponential backoff for transient failures
2. **Circuit Breaker**: Prevent cascade failures
3. **Error Classification**: Retry only retryable errors
4. **Best Practice**: Use circuit breaker, monitor state
5. **Benefits**: Resilience, prevents cascade failures

**Key Takeaway:**
Retry logic and circuit breaking handle LLM API failures. Use exponential backoff for retries. Implement circuit breaker to prevent cascade failures. Only retry retryable errors (network, rate limits, 5xx). Monitor retry rates and circuit breaker state.

**Resilience Strategy:**
- Retry transient errors
- Use circuit breaker
- Exponential backoff
- Classify errors
- Monitor state

**Next Steps:**
- Learn [Cost Tracking](ai_cost_tracking.md) for monitoring
- Study [OpenAI Integration](openai_integration.md) for basics
- Master [Structured Output](structured_output.md) for parsing

