# Monitoring Task Queues: Observability for Background Jobs

Monitoring task queues ensures reliability and performance of background job processing. This guide covers monitoring Bull queues in Express.js applications.

## Why Monitor Task Queues?

**Metrics to Track:**
- Queue length
- Processing time
- Failure rates
- Worker status
- Job throughput

## Basic Monitoring

### Queue Metrics

```javascript
const Queue = require('bull');
const emailQueue = new Queue('emails', {
    redis: { host: 'localhost', port: 6379 }
});

// Get queue metrics
async function getQueueMetrics() {
    const waiting = await emailQueue.getWaitingCount();
    const active = await emailQueue.getActiveCount();
    const completed = await emailQueue.getCompletedCount();
    const failed = await emailQueue.getFailedCount();
    
    return {
        waiting,
        active,
        completed,
        failed,
        total: waiting + active + completed + failed
    };
}

// Expose metrics endpoint
app.get('/metrics/queues', async (req, res) => {
    const metrics = await getQueueMetrics();
    res.json(metrics);
});
```

## Real-World Examples

### Example 1: Prometheus Metrics

```javascript
const client = require('prom-client');

// Queue metrics
const queueLength = new client.Gauge({
    name: 'queue_length',
    help: 'Number of jobs in queue',
    labelNames: ['queue_name', 'status']
});

const jobDuration = new client.Histogram({
    name: 'job_duration_seconds',
    help: 'Job processing duration',
    labelNames: ['queue_name', 'job_name'],
    buckets: [1, 5, 10, 30, 60, 120]
});

const jobFailures = new client.Counter({
    name: 'job_failures_total',
    help: 'Total job failures',
    labelNames: ['queue_name', 'job_name', 'error_type']
});

// Update metrics
emailQueue.on('completed', (job) => {
    const duration = (Date.now() - job.timestamp) / 1000;
    jobDuration.observe({ queue_name: 'emails', job_name: job.name }, duration);
});

emailQueue.on('failed', (job, error) => {
    jobFailures.inc({
        queue_name: 'emails',
        job_name: job.name,
        error_type: error.name
    });
});

// Periodic metrics update
setInterval(async () => {
    const waiting = await emailQueue.getWaitingCount();
    const active = await emailQueue.getActiveCount();
    
    queueLength.set({ queue_name: 'emails', status: 'waiting' }, waiting);
    queueLength.set({ queue_name: 'emails', status: 'active' }, active);
}, 5000);
```

### Example 2: Health Check

```javascript
// Queue health check
async function checkQueueHealth() {
    const metrics = await getQueueMetrics();
    
    // Check if queue is backed up
    if (metrics.waiting > 1000) {
        return {
            healthy: false,
            status: 'backed_up',
            message: 'Queue has too many waiting jobs'
        };
    }
    
    // Check failure rate
    const failureRate = metrics.failed / (metrics.completed + metrics.failed);
    if (failureRate > 0.1) {
        return {
            healthy: false,
            status: 'high_failure_rate',
            message: `Failure rate: ${(failureRate * 100).toFixed(2)}%`
        };
    }
    
    return {
        healthy: true,
        status: 'ok',
        metrics
    };
}

app.get('/health/queues', async (req, res) => {
    const health = await checkQueueHealth();
    res.status(health.healthy ? 200 : 503).json(health);
});
```

## Best Practices   -- IMP

1. **Track Key Metrics**: Queue length, processing time, failures
2. **Set Alerts**: Alert on high queue length or failure rate
3. **Monitor Workers**: Track worker status and health
4. **Log Events**: Log job events for debugging
5. **Dashboard**: Create dashboards for visualization

## Summary

**Monitoring Task Queues:**

1. **Purpose**: Ensure reliability and performance
2. **Metrics**: Queue length, duration, failures
3. **Tools**: Prometheus, custom metrics, health checks
4. **Best Practice**: Track key metrics, set alerts
5. **Benefits**: Early problem detection, performance optimization

**Key Takeaway:**
Monitoring task queues ensures reliability and performance. Track queue length, processing time, and failure rates. Use Prometheus for metrics, set up health checks, and create alerts for anomalies. Monitor worker status and log events for debugging.

**Monitoring Strategy:**
- Track key metrics
- Set up alerts
- Monitor workers
- Log events
- Create dashboards

**Next Steps:**
- Learn [Bull Queue Mastery](02_bull_queue_mastery.md) for implementation
- Study [Retry Patterns](retry_with_exponential_backoff.md) for error handling
- Master [Observability](../14_observability/) for comprehensive monitoring

---

## 🎯 Interview Questions: Monitoring Task Queues  --- IMP

### Q1: Why is monitoring task queues critical for production Express.js applications? What are the key metrics you would track, and how do they help identify system health issues?

**Answer:**

Monitoring task queues is essential because background jobs are asynchronous and decoupled from the main request-response cycle. Without visibility, failures can go unnoticed, queues can back up silently, and performance degradation can occur without immediate symptoms.

**Key Metrics to Track:**

1. **Queue Length (Waiting Jobs)**: Indicates backlog and potential processing delays
   - High waiting count suggests workers are overwhelmed or too slow
   - Visual: `waiting_count` → Alert threshold: > 1000 jobs

2. **Active Jobs Count**: Shows current processing capacity utilization
   - If active count equals worker concurrency limit, system is at capacity
   - Visual: `active_count` → Compare with `worker_concurrency_limit`

3. **Job Duration (Processing Time)**: Measures performance and identifies slow operations
   - Histogram distribution reveals outliers and performance degradation
   - Visual: `job_duration_seconds` → P50, P95, P99 percentiles

4. **Failure Rate**: Indicates system reliability and error patterns
   - High failure rate suggests infrastructure issues or buggy code
   - Visual: `failed_count / (completed_count + failed_count)` → Alert if > 10%

5. **Throughput (Jobs/Second)**: Measures system capacity and processing speed
   - Declining throughput indicates bottlenecks or resource exhaustion
   - Visual: `completed_count / time_window` → Track trends over time

**How Metrics Help Identify Issues:**

- **Queue Backlog**: If `waiting_count` spikes, either increase workers or optimize job processing speed
- **High Failure Rate**: Indicates transient failures (network, DB) or permanent bugs (code errors)
- **Increasing Duration**: Suggests resource contention (DB locks, API rate limits) or inefficient algorithms
- **Zero Throughput**: Workers may be crashed, Redis connection lost, or jobs stuck in processing state

**System Design Consideration**: Monitoring enables proactive scaling (auto-scale workers based on queue length), alerting (SLA violations), and capacity planning (predicting when to add infrastructure).

---

### Q2: Explain the concept of "queue health checks" in the context of Express.js background job systems. What conditions would make a queue "unhealthy," and how would you design a health check endpoint?

**Answer:**

Queue health checks are automated assessments that determine whether a background job processing system can reliably handle workloads. They combine multiple metrics to provide a binary "healthy/unhealthy" status for load balancers, orchestration systems (Kubernetes), and monitoring dashboards.

**Unhealthy Conditions:**

1. **Queue Backlog Threshold**: Too many waiting jobs indicates processing cannot keep up with demand
   - Condition: `waiting_count > threshold` (e.g., 1000 jobs)
   - Impact: Latency increases, SLA violations, potential memory issues

2. **High Failure Rate**: Excessive failures suggest systemic problems
   - Condition: `failure_rate > 10%` over a time window
   - Impact: Data inconsistency, user experience degradation, potential cascading failures

3. **Stale Active Jobs**: Jobs stuck in "active" state indicate worker crashes or deadlocks
   - Condition: `active_jobs` with `processing_time > max_expected_duration`
   - Impact: Workers blocked, queue starvation, resource leaks

4. **Worker Availability**: No workers processing jobs indicates infrastructure failure
   - Condition: `active_workers === 0` AND `waiting_count > 0`
   - Impact: Complete system failure, jobs never processed

5. **Redis Connection Loss**: Queue backend unavailable means no job processing possible
   - Condition: Cannot connect to Redis or Redis returns errors
   - Impact: Jobs cannot be added or processed, system completely down

**Health Check Design:**

```javascript
// Health check combines multiple conditions
async function checkQueueHealth() {
    const metrics = await getQueueMetrics();
    const issues = [];
    
    // Check backlog
    if (metrics.waiting > 1000) {
        issues.push({
            severity: 'warning',
            type: 'backlog',
            message: `Queue backlog: ${metrics.waiting} jobs`
        });
    }
    
    // Check failure rate
    const total = metrics.completed + metrics.failed;
    const failureRate = total > 0 ? metrics.failed / total : 0;
    if (failureRate > 0.1) {
        issues.push({
            severity: 'critical',
            type: 'high_failure_rate',
            message: `Failure rate: ${(failureRate * 100).toFixed(2)}%`
        });
    }
    
    // Check stale jobs
    const staleJobs = await checkStaleActiveJobs();
    if (staleJobs.length > 0) {
        issues.push({
            severity: 'critical',
            type: 'stale_jobs',
            message: `${staleJobs.length} jobs stuck in processing`
        });
    }
    
    // Determine overall health
    const hasCritical = issues.some(i => i.severity === 'critical');
    const hasWarnings = issues.some(i => i.severity === 'warning');
    
    return {
        healthy: !hasCritical,
        status: hasCritical ? 'unhealthy' : (hasWarnings ? 'degraded' : 'healthy'),
        issues,
        metrics
    };
}
```

**HTTP Endpoint Design:**

- **GET /health/queues**: Returns 200 if healthy, 503 if unhealthy
- Response includes status, issues, and current metrics
- Used by Kubernetes liveness/readiness probes, load balancers, monitoring systems

**System Design Consideration**: Health checks enable automated recovery (restart workers, scale horizontally), graceful degradation (disable non-critical queues), and observability (dashboards, alerting).

---

### Q3: How would you implement distributed tracing for background jobs in an Express.js application? Why is correlation between HTTP requests and background jobs important?

**Answer:**

Distributed tracing tracks a request's journey across multiple services and asynchronous operations. For background jobs, tracing is crucial because jobs are decoupled from the original HTTP request, making it difficult to understand the full request lifecycle.

**Implementation Approach:**

1. **Correlation IDs**: Propagate a unique identifier from HTTP request to background job
   ```javascript
   // In Express middleware
   app.use((req, res, next) => {
       req.correlationId = req.headers['x-correlation-id'] || generateUUID();
       res.setHeader('X-Correlation-ID', req.correlationId);
       next();
   });
   
   // When adding job
   await emailQueue.add('send-email', data, {
       correlationId: req.correlationId  // Propagate ID
   });
   ```

2. **Trace Context Propagation**: Use OpenTelemetry or similar to maintain trace context
   ```javascript
   const { trace, context } = require('@opentelemetry/api');
   
   // In job processor
   emailQueue.process('send-email', async (job) => {
       const span = trace.getActiveSpan();
       span.setAttribute('job.id', job.id);
       span.setAttribute('job.correlation_id', job.data.correlationId);
       
       // Job processing...
   });
   ```

3. **Structured Logging**: Include correlation ID in all logs
   ```javascript
   logger.info('Processing email job', {
       correlationId: job.data.correlationId,
       jobId: job.id,
       userId: job.data.userId
   });
   ```

**Why Correlation Matters:**

- **End-to-End Visibility**: Trace a user action (e.g., "Sign Up") through HTTP request → job creation → email sending → completion
- **Debugging**: When a user reports "I didn't receive email," correlation ID links HTTP request to background job logs
- **Performance Analysis**: Understand total latency including async operations
- **Business Metrics**: Track conversion rates (signup → email sent → email opened)

**System Design Consideration**: Correlation enables observability across synchronous and asynchronous boundaries, critical for microservices architectures where operations span multiple systems and timeframes.

---

### Q4: Explain the difference between "queue length" and "throughput" metrics. How would you use these metrics to make scaling decisions for background job workers?

**Answer:**

**Queue Length (Backlog)**: The number of jobs waiting to be processed at a given point in time. It's a **stock** metric (accumulated quantity).

**Throughput**: The rate at which jobs are processed (jobs per second/minute). It's a **flow** metric (rate of change).

**Key Differences:**

- **Queue Length** = Current state (snapshot): "How many jobs are waiting right now?"
- **Throughput** = Rate of processing: "How fast are we completing jobs?"

**Visual Representation:**

```
Queue Length Over Time:
    |
1000|     ╱╲
    |    ╱  ╲
 500|   ╱    ╲
    |  ╱      ╲
   0|_╱________╲___
     Time →

Throughput Over Time:
    |
 50 |  ▁▁▁▁▁▁▁▁▁▁
    |  ██████████
 25 |  ██████████
    |  ██████████
   0|__██████████___
     Time →
```

**Scaling Decisions:**

1. **High Queue Length + Low Throughput**: Workers are slow or insufficient
   - Action: Increase worker concurrency OR optimize job processing speed
   - Formula: `required_workers = queue_length / (throughput_per_worker * target_processing_time)`

2. **High Queue Length + High Throughput**: Temporary spike, system catching up
   - Action: Monitor; may not need scaling if throughput is increasing
   - Check: Is throughput increasing? If yes, wait; if no, scale

3. **Low Queue Length + Low Throughput**: System idle or jobs are rare
   - Action: No scaling needed; may scale down to save resources
   - Consider: Cost optimization vs. latency requirements

4. **Low Queue Length + High Throughput**: Optimal state
   - Action: Maintain current worker count
   - System is processing jobs faster than they arrive

**System Design Consideration**: Use **queue length** for reactive scaling (scale up when backlog grows) and **throughput** for proactive capacity planning (predict future needs based on arrival rate trends). Combine both metrics: if queue length is growing despite high throughput, arrival rate exceeds processing capacity.

---

### Q5: What is a "dead letter queue" (DLQ) in the context of background job processing? When would you move a job to a DLQ, and how does it help with system reliability?

**Answer:**

A **Dead Letter Queue (DLQ)** is a special queue that holds jobs that have permanently failed after exhausting all retry attempts. It serves as a "quarantine" for problematic jobs, preventing them from blocking normal processing and enabling manual investigation.

**When to Move to DLQ:**

1. **Max Retries Exceeded**: Job failed after all retry attempts (e.g., 5 retries)
   - Condition: `job.attemptsMade >= maxAttempts` AND job still fails
   - Reason: Further retries unlikely to succeed (permanent failure)

2. **Non-Retryable Errors**: Errors that indicate permanent failure (not transient)
   - Examples: Validation errors (4xx), authentication failures, malformed data
   - Reason: Retrying won't fix the underlying issue

3. **Timeout Exceeded**: Job processing time exceeds maximum allowed duration
   - Condition: `processing_time > max_duration` (e.g., 5 minutes)
   - Reason: Job may be stuck or processing is fundamentally too slow

4. **Manual Intervention Required**: Jobs that need human review
   - Examples: Suspicious payment, data inconsistency, business rule violation
   - Reason: Automated retry cannot resolve the issue

**How DLQ Helps Reliability:**

1. **Prevents Queue Poisoning**: Failed jobs don't consume worker resources repeatedly
   - Without DLQ: Same job retries forever, blocking workers
   - With DLQ: Failed job moved out, workers process other jobs

2. **Enables Investigation**: DLQ provides a "failed jobs" log for debugging
   - Engineers can inspect failed jobs, identify patterns, fix root causes
   - Visual: DLQ dashboard shows error types, frequencies, job data

3. **Prevents Cascading Failures**: Isolates problematic jobs from healthy processing
   - If one job type fails repeatedly, it doesn't affect other job types
   - System continues processing other jobs normally

4. **Supports Manual Recovery**: Allows reprocessing after fixes
   - After fixing bug, jobs can be manually moved back to main queue
   - Enables "replay" of failed operations

**Implementation Pattern:**

```javascript
// Bull queue with DLQ
const emailQueue = new Queue('emails', {
    defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: false  // Keep failed jobs for DLQ
    }
});

// Move to DLQ after max retries
emailQueue.on('failed', async (job, error) => {
    if (job.attemptsMade >= job.opts.attempts) {
        await deadLetterQueue.add('failed-email', {
            originalJob: job.data,
            error: error.message,
            attemptsMade: job.attemptsMade
        });
    }
});
```

**System Design Consideration**: DLQ is essential for production systems to maintain reliability and observability. It transforms "silent failures" into "visible, actionable issues" that can be investigated and resolved, improving overall system health over time.

