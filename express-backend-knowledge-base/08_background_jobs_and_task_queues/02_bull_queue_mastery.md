# Bull Queue Mastery: Distributed Task Queue for Express.js

**Bull** is the most popular job queue library for Node.js. It's powerful, Redis-based, and perfect for background processing in Express.js applications.

## 1. Introduction

**Bull** requires Redis as a broker. It provides:
- Job queues with priorities
- Delayed jobs
- Job retries
- Job progress tracking
- Job events (completed, failed, etc.)

## 2. Setting up with Express.js

### Installation

```bash
npm install bull
npm install redis  # Bull requires Redis
```

### Project Structure

```
project/
├── app.js              # Express app
├── queues/
│   ├── index.js        # Queue configuration
│   └── emailQueue.js  # Email queue
└── workers/
    └── emailWorker.js  # Worker process
```

### Basic Queue Setup

```javascript
// queues/emailQueue.js
const Queue = require('bull');
const redis = require('redis');

// Configure queue: Bull uses Redis as broker.
const emailQueue = new Queue('email', {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
    },
    defaultJobOptions: {
        attempts: 3,  // Retry 3 times on failure
        backoff: {
            type: 'exponential',  // Exponential backoff
            delay: 2000,  // Start with 2 seconds
        },
        removeOnComplete: true,  // Remove completed jobs
        removeOnFail: false,  // Keep failed jobs for debugging
    },
});

module.exports = emailQueue;
```

### Define Jobs

```javascript
// workers/emailWorker.js
const emailQueue = require('../queues/emailQueue');

// Process jobs: Worker processes jobs from queue.
emailQueue.process(async (job) => {
    const { email, subject, body } = job.data;
    
    // Simulate email sending: This runs in background worker.
    console.log(`Sending email to ${email}...`);
    await sendEmail(email, subject, body);
    
    return { status: 'sent', email };
});

// Job events: Listen for job completion/failure.
emailQueue.on('completed', (job, result) => {
    console.log(`Job ${job.id} completed:`, result);
});

emailQueue.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed:`, err);
});
```

### Add Jobs from Express

```javascript
// app.js
const emailQueue = require('./queues/emailQueue');

// Add job: Pushes job to queue, returns immediately (non-blocking).
app.post('/send-email', async (req, res) => {
    const { email, subject, body } = req.body;
    
    // .add(): Pushes job to queue, returns job object.
    const job = await emailQueue.add({
        email,
        subject,
        body,
    }, {
        priority: 1,  // Higher priority = processed first
        delay: 0,  // Process immediately (or set delay in ms)
    });
    
    res.json({
        jobId: job.id,
        status: 'queued',
        message: 'Email queued for sending'
    });
});
```

## 3. Advanced Patterns

### Delayed Jobs

```javascript
// Delayed job: Process job after delay.
app.post('/send-reminder', async (req, res) => {
    const { email, delayHours } = req.body;
    
    // Delay: Process job after specified time (in milliseconds).
    const job = await emailQueue.add({
        email,
        subject: 'Reminder',
        body: 'This is a reminder',
    }, {
        delay: delayHours * 60 * 60 * 1000,  // Convert hours to milliseconds
    });
    
    res.json({ jobId: job.id, scheduledFor: new Date(Date.now() + delayHours * 60 * 60 * 1000) });
});
```

### Job Priorities

```javascript
// Priority jobs: Higher priority processed first.
app.post('/send-urgent-email', async (req, res) => {
    const job = await emailQueue.add({
        email: req.body.email,
        subject: 'URGENT',
        body: req.body.body,
    }, {
        priority: 10,  // High priority (higher number = higher priority)
    });
    
    res.json({ jobId: job.id });
});
```

### Job Retries

```javascript
// Retry configuration: Automatic retries on failure.
emailQueue.process('send-email', {
    attempts: 5,  // Retry 5 times
    backoff: {
        type: 'exponential',
        delay: 2000,  // Start with 2 seconds, double each retry
    },
}, async (job) => {
    const { email, subject, body } = job.data;
    
    try {
        await sendEmail(email, subject, body);
        return { status: 'sent' };
    } catch (error) {
        // Job will automatically retry: Exponential backoff (2s, 4s, 8s, 16s, 32s).
        throw error;  // Throw error to trigger retry
    }
});
```

### Job Progress

```javascript
// Progress tracking: Update job progress during processing.
emailQueue.process('process-large-file', async (job) => {
    const { filePath } = job.data;
    const totalLines = 1000;
    
    for (let i = 0; i < totalLines; i++) {
        // Process line
        await processLine(filePath, i);
        
        // Update progress: Report progress to queue.
        await job.progress(Math.round((i / totalLines) * 100));
    }
    
    return { status: 'completed', linesProcessed: totalLines };
});

// Get job progress: Check job status from Express.
app.get('/job/:jobId', async (req, res) => {
    const job = await emailQueue.getJob(req.params.jobId);
    
    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }
    
    const state = await job.getState();
    const progress = job.progress();
    
    res.json({
        id: job.id,
        state,  // 'waiting', 'active', 'completed', 'failed', 'delayed'
        progress,  // 0-100
        data: job.data,
    });
});
```

## 4. Running Workers

You need to run the Express server AND the worker process.

**Terminal 1 (API):**
```bash
node app.js
```

**Terminal 2 (Worker):**
```bash
node workers/emailWorker.js
```

Or use PM2 to run both:

```bash
# ecosystem.config.js
module.exports = {
    apps: [
        {
            name: 'api',
            script: 'app.js',
        },
        {
            name: 'worker',
            script: 'workers/emailWorker.js',
        },
    ],
};
```

```bash
pm2 start ecosystem.config.js
```

## 5. Monitoring with Bull Board

Bull Board provides a web UI for monitoring queues.

```bash
npm install bull-board
```

```javascript
// app.js
const { createBullBoard } = require('bull-board');
const { BullAdapter } = require('bull-board/bullAdapter');
const emailQueue = require('./queues/emailQueue');

// Bull Board: Web UI for monitoring queues.
const { router } = createBullBoard([
    new BullAdapter(emailQueue),
]);

app.use('/admin/queues', router);  // Access at /admin/queues
```

Visit `http://localhost:3000/admin/queues` to see:
- Active jobs
- Completed jobs
- Failed jobs
- Job details

## 6. Multiple Queues

```javascript
// queues/index.js
const Queue = require('bull');

// Multiple queues: Separate queues for different job types.
const emailQueue = new Queue('email', { redis: { host: 'localhost', port: 6379 } });
const imageQueue = new Queue('image', { redis: { host: 'localhost', port: 6379 } });
const reportQueue = new Queue('report', { redis: { host: 'localhost', port: 6379 } });

module.exports = {
    emailQueue,
    imageQueue,
    reportQueue,
};
```

## 7. Job Events

```javascript
// Job events: Listen for queue events.
emailQueue.on('waiting', (jobId) => {
    console.log(`Job ${jobId} is waiting`);
});

emailQueue.on('active', (job) => {
    console.log(`Job ${job.id} started processing`);
});

emailQueue.on('completed', (job, result) => {
    console.log(`Job ${job.id} completed:`, result);
});

emailQueue.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed:`, err);
});

emailQueue.on('stalled', (job) => {
    console.warn(`Job ${job.id} stalled`);
});
```

## 8. Cleanup and Maintenance

```javascript
// Cleanup: Remove old completed/failed jobs.
async function cleanupQueue() {
    // Remove completed jobs older than 1 day
    await emailQueue.clean(24 * 60 * 60 * 1000, 'completed');
    
    // Remove failed jobs older than 7 days
    await emailQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed');
}

// Run cleanup periodically
setInterval(cleanupQueue, 60 * 60 * 1000);  // Every hour
```

## Best Practices

1. **Separate Queues**: Use different queues for different job types
2. **Error Handling**: Always handle errors in job processors
3. **Job Timeouts**: Set timeouts for long-running jobs
4. **Monitoring**: Use Bull Board for production monitoring
5. **Cleanup**: Regularly clean up old jobs

## Summary

Bull queue mastery requires: Setting up Redis-backed queues, defining job processors, adding jobs from Express, handling retries and delays, tracking job progress, monitoring with Bull Board, and cleaning up old jobs. Bull provides a robust, production-ready job queue system for Express.js applications.

---

## 🎯 Interview Questions: Bull Queue (Bull/BullMQ)

### Q1: Architecturally, where does Bull fit in your Express.js system? What problems is it solving?

**Answer:**

Bull functions as a **robust bridge between your synchronous API and asynchronous processing units**. It ensures that high-latency tasks don't degrade the user experience while providing a reliable persistence layer using Redis to track every job's lifecycle.

Bull sits between your **HTTP layer** (Express) and **background workers** as a **Redis-backed job queue**:

```
Client → Express API → Bull Queue (Redis) → Worker Processes
                                 │
                                 ├─ Retries with backoff
                                 ├─ Delayed jobs
                                 └─ Dead-letter queues
```

It solves:
- **Latency:** Offloads slow tasks (emails, reports, image processing) out of the request path.
- **Reliability:** Built‑in retries, backoff, and failure tracking so transient errors don’t immediately fail user flows.
- **Scalability:** Workers can be scaled horizontally independent of API servers.
- **Scheduling:** Delayed and repeatable jobs (cron‑like) without separate cron infra.

### Q2: From a design perspective, what are the key things you must get right when using Bull in production?

**Answer (theory‑first):**

Transitioning Bull to production requires moving beyond simple job enqueueing to a **holistic job-lifecycle strategy**. This involves defining clear boundaries for your job data, ensuring failures are handled gracefully with retries, and maintaining visibility into queue health via real-time monitoring.

- **Job Contract:**
  - Define a **clear payload schema** (what fields a job expects) and version it when evolving.
  - Ensure jobs are **idempotent** (safe to run multiple times).
- **Failure Semantics:**
  - Decide what counts as “retryable” vs “terminal” failure (e.g., network vs validation errors).
  - Configure retry counts, backoff strategy, and dead‑letter queues accordingly.
- **Throughput vs Fairness:**
  - Use **separate queues** for different domains (emails vs CPU‑heavy jobs) so one class of work doesn’t starve another.
  - Control concurrency per worker to match CPU/IO characteristics.
- **Observability:**
  - Track metrics like active jobs, failed jobs, processing time, and retry counts.
  - Use Bull Board or custom dashboards to understand system health.

In interviews, focus less on Bull APIs and more on: **idempotency, contracts, backoff, DLQs, and observability**.

