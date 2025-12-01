# Retry with Exponential Backoff: Handling Transient Failures

Retry with exponential backoff handles transient failures by retrying operations with increasing delays. This guide covers implementing retry logic in Express.js background jobs.

## What is Exponential Backoff?

**Exponential backoff** increases the delay between retries exponentially, reducing load on failing systems and improving success rates.

### Basic Concept

```
Attempt 1: Immediate
Attempt 2: Wait 1 second
Attempt 3: Wait 2 seconds
Attempt 4: Wait 4 seconds
Attempt 5: Wait 8 seconds
...
```

## Implementation with Bull Queue

### Basic Retry

```javascript
const Queue = require('bull');

const emailQueue = new Queue('emails', {
    redis: { host: 'localhost', port: 6379 }
});

// Job with retry
emailQueue.process('send-email', async (job) => {
    await sendEmail(job.data);
});

// Add job with retry options
await emailQueue.add('send-email', {
    to: 'user@example.com',
    subject: 'Welcome'
}, {
    attempts: 5,  // Retry 5 times
    backoff: {
        type: 'exponential',
        delay: 2000  // Start with 2 seconds
    }
});
```

### Custom Retry Logic

```javascript
// Custom retry with exponential backoff
emailQueue.process('send-email', async (job) => {
    try {
        await sendEmail(job.data);
    } catch (error) {
        // Check if retryable error
        if (isRetryableError(error)) {
            // Calculate delay: 2^attempt seconds
            const delay = Math.pow(2, job.attemptsMade) * 1000;
            
            // Retry with delay
            throw new Error(`Retryable error: ${error.message}`);
        } else {
            // Non-retryable, fail immediately
            throw error;
        }
    }
});

function isRetryableError(error) {
    // Retry on network errors, timeouts
    return error.code === 'ECONNREFUSED' || 
           error.code === 'ETIMEDOUT' ||
           error.status >= 500;
}
```

## Real-World Examples

### Example 1: API Call Retry

```javascript
const axios = require('axios');

async function callAPIWithRetry(url, data, maxRetries = 5) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await axios.post(url, data);
            return response.data;
        } catch (error) {
            lastError = error;
            
            // Don't retry on client errors (4xx)
            if (error.response && error.response.status < 500) {
                throw error;
            }
            
            // Calculate exponential backoff delay
            const delay = Math.pow(2, attempt) * 1000;
            
            // Add jitter (random variation)
            const jitter = Math.random() * 1000;
            const totalDelay = delay + jitter;
            
            console.log(`Attempt ${attempt + 1} failed, retrying in ${totalDelay}ms`);
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, totalDelay));
        }
    }
    
    throw lastError;
}

// Use in queue
emailQueue.process('send-email', async (job) => {
    const { email, subject, body } = job.data;
    
    await callAPIWithRetry('https://api.email-service.com/send', {
        to: email,
        subject,
        body
    });
});
```

### Example 2: Database Operation Retry

```javascript
async function executeWithRetry(operation, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            
            // Check if retryable
            if (!isRetryableDBError(error)) {
                throw error;
            }
            
            // Exponential backoff
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    throw lastError;
}

function isRetryableDBError(error) {
    // Retry on connection errors, deadlocks
    return error.code === 'ECONNREFUSED' ||
           error.code === 'ETIMEDOUT' ||
           error.code === '40P01';  // PostgreSQL deadlock
}

// Use in queue
orderQueue.process('process-order', async (job) => {
    const { orderId } = job.data;
    
    await executeWithRetry(async () => {
        const order = await Order.findByPk(orderId);
        // Process order...
    });
});
```

## Using Tenacity Library

### Install Tenacity

```bash
npm install tenacity
```

### Implementation

```javascript
const { retry, stopAfterAttempt, waitExponential } = require('tenacity');

// Retry with exponential backoff
const sendEmailWithRetry = retry(
    stopAfterAttempt(5),  // Max 5 attempts
    waitExponential({ initialDelay: 1000, maxDelay: 30000 })  // 1s to 30s
)(async (email, subject, body) => {
    await sendEmail(email, subject, body);
});

// Use in queue
emailQueue.process('send-email', async (job) => {
    await sendEmailWithRetry(
        job.data.email,
        job.data.subject,
        job.data.body
    );
});
```

## Best Practices

1. **Max Retries**: Set reasonable max retry limit
2. **Exponential Delay**: Use exponential backoff
3. **Jitter**: Add random jitter to prevent thundering herd
4. **Error Classification**: Only retry retryable errors
5. **Dead Letter Queue**: Move permanently failed tasks to DLQ

## Summary

**Retry with Exponential Backoff:**

1. **Purpose**: Handle transient failures with retries
2. **Strategy**: Exponential delay between retries
3. **Implementation**: Bull queue retry, custom logic, libraries
4. **Best Practice**: Classify errors, add jitter, set max retries
5. **Use Cases**: API calls, database operations, external services

**Key Takeaway:**
Retry with exponential backoff handles transient failures by retrying with increasing delays. Use exponential backoff (2^attempt seconds) to reduce load on failing systems. Add jitter to prevent synchronized retries. Only retry retryable errors (network, timeouts, 5xx), not client errors (4xx). Set maximum retry limits and use dead letter queues for permanently failed tasks.

**Retry Strategy:**
- Exponential delay: 2^attempt seconds
- Add jitter for randomness
- Classify retryable errors
- Set max retry limit
- Use DLQ for permanent failures

**Next Steps:**
- Learn [Bull Queue Mastery](02_bull_queue_mastery.md) for queue implementation
- Study [Task Monitoring](../08_background_jobs_and_task_queues/monitoring_task_queues.md) for observability
- Master [Error Handling](../08_background_jobs_and_task_queues/error_handling_patterns.md) for failure management

