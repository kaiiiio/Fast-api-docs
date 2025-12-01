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

## Best Practices

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

