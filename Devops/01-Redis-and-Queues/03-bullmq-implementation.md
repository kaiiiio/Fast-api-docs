# BullMQ (Redis-based Queue)

## Why BullMQ Exists

* Node.js friendly
* Uses Redis lists & streams
* Built-in retry logic
* Job prioritization
* Delayed jobs support
* Progress tracking

BullMQ exists because many backend tasks should not happen inside the user's HTTP request. If a user signs up, the API should create the user quickly and return a response. Sending emails, generating PDFs, resizing images, syncing analytics, and retrying webhooks can happen in the background.

BullMQ is especially natural when:

* Your backend is Node.js
* You already use Redis
* You need background jobs, not a full enterprise message broker
* You want retries, delays, priorities, and job progress with simple code

Plain-English definition:

> BullMQ is a Node.js job queue. It stores jobs in Redis, lets workers process them later, and tracks whether each job is waiting, active, completed, failed, delayed, or retried.

---

## BullMQ Components

### 1. Queue (Producer)
Adds jobs to the queue.

The producer is usually your API service. It should add a small job payload, then return quickly to the user.

```ts
import { Queue } from 'bullmq';

const emailQueue = new Queue('email', {
  connection: {
    host: 'localhost',
    port: 6379
  }
});

// Add a job
await emailQueue.add('send-welcome', {
  email: 'user@example.com',
  name: 'John'
});
```

### 2. Worker (Consumer)
Processes jobs from the queue.

The worker is usually a separate process/container. This separation is important because the API can stay fast even when background work is slow.

```ts
import { Worker } from 'bullmq';

const worker = new Worker('email', async (job) => {
  console.log(`Processing job ${job.id}`);
  
  // Your business logic
  await sendEmail(job.data.email, job.data.name);
  
  return { success: true };
}, {
  connection: {
    host: 'localhost',
    port: 6379
  }
});

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.log(`Job ${job.id} failed:`, err);
});
```

### 3. Redis (Storage)
Stores job data and state

Redis is the central storage for BullMQ. BullMQ uses Redis data structures and Lua scripts to update job state safely.

Redis stores things like:

* Job payload
* Job state
* Retry count
* Delay timestamp
* Priority
* Progress
* Failed reason
* Completed/failed history

---

## BullMQ Terms and What They Help With

* **Queue** (job waiting area): API adds jobs here; workers pick from here.
* **Worker** (job processor): runs slow work outside the API process.
* **Job state** (current status): `waiting`, `active`, `completed`, `failed`, `delayed`, `stalled`.
* **Attempts** (retry count): how many times BullMQ should try a failed job.
* **Backoff** (retry delay): how long BullMQ waits before the next retry.
* **Delayed job** (run later): useful for reminders, webhook retries, unpaid-order cancellation.
* **Repeatable job** (cron job): useful for reports, cleanup, scheduled syncs.
* **Job ID** (unique job key): helps avoid duplicate jobs like duplicate invoice emails.
* **Idempotent worker** (safe if job repeats): worker checks whether the side effect already happened.
* **Concurrency** (parallel jobs per worker): higher for network work, lower for CPU-heavy work.
* **Stalled job** (worker lost the job lock): BullMQ can retry it with another worker.
* **Remove on complete/fail** (cleanup policy): prevents Redis memory bloat while keeping enough failed-job history for debugging.

Example:

```txt
send-invoice-email with jobId=invoice-email:123
If API adds it twice, BullMQ can avoid duplicate job creation.
Worker still checks DB before sending, because retries can happen.
```

---

## Advanced Features

### Job Options

```ts
await queue.add('send-email', data, {
  // Retry configuration
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000
  },
  
  // Priority (higher = processed first)
  priority: 10,
  
  // Delay execution
  delay: 5000, // 5 seconds
  
  // Remove on complete
  removeOnComplete: true,
  removeOnFail: false
});
```

### Job Progress

```ts
const worker = new Worker('video-processing', async (job) => {
  await job.updateProgress(25);
  // ... process part 1
  
  await job.updateProgress(50);
  // ... process part 2
  
  await job.updateProgress(75);
  // ... process part 3
  
  await job.updateProgress(100);
  return { done: true };
});
```

### Scheduled/Cron Jobs

```ts
import { QueueScheduler } from 'bullmq';

const scheduler = new QueueScheduler('email');

// Add repeatable job
await queue.add('daily-report', {}, {
  repeat: {
    pattern: '0 9 * * *' // Every day at 9 AM
  }
});
```

---

## When BullMQ is Enough

✅ Monoliths or small microservices
✅ Medium traffic (< 10k jobs/min)
✅ Background jobs (emails, notifications)
✅ Already using Redis
✅ Node.js ecosystem

❌ Not ideal for:
* Event streaming (use Kafka)
* Massive fan-out (use RabbitMQ)
* Multi-language services (use RabbitMQ)
* Complex routing (use RabbitMQ)

---

## Why Choose BullMQ Over RabbitMQ?

Choose BullMQ when the problem is mainly **background job processing inside a Node.js system**.

BullMQ is usually better for:

* Sending emails after signup/order
* Image resizing
* PDF generation
* Webhook retries
* Scheduled jobs
* Simple notification jobs
* Node.js monolith or small service architecture

Reasons:

* Less infrastructure if Redis already exists
* Very simple developer experience in Node.js
* Built-in job lifecycle tracking
* Built-in delayed/repeatable jobs
* Easy progress updates
* Easy retry/backoff configuration

Interview answer:

> I would use BullMQ when I need a job queue for a Node.js backend: delayed jobs, retries, background workers, and simple scaling. I would not choose it for complex cross-service routing or polyglot enterprise messaging; that is where RabbitMQ fits better.

## When BullMQ Becomes the Wrong Tool

BullMQ can be the wrong tool when:

* Many services in different languages must communicate
* Messages must be routed to many consumers using routing patterns
* You need broker-level pub/sub, request/reply, or topic routing
* Redis memory pressure could put queue reliability at risk
* Teams need strict messaging semantics across many services

In those cases, RabbitMQ is usually a better fit.

---

## Production Setup

### 1. Separate Queue and Worker

**api-service.ts** (Producer)
```ts
const queue = new Queue('tasks');
await queue.add('process-order', orderData);
```

**worker-service.ts** (Consumer)
```ts
const worker = new Worker('tasks', processJob);
```

### 2. Error Handling

```ts
worker.on('failed', async (job, err) => {
  // Log to monitoring service
  logger.error(`Job ${job.id} failed`, { error: err, data: job.data });
  
  // Alert if critical
  if (job.data.critical) {
    await alertTeam(err);
  }
});
```

### 3. Monitoring

```ts
const queue = new Queue('tasks');

// Get queue metrics
const jobCounts = await queue.getJobCounts();
console.log(jobCounts);
// { waiting: 5, active: 2, completed: 100, failed: 3 }

// Get failed jobs
const failed = await queue.getFailed();
```

---

## Interview Questions

**Q: How does BullMQ ensure job reliability?**
A: Jobs are stored in Redis with state tracking. If a worker crashes, the job is automatically re-queued after a timeout.

**Q: Can multiple workers process the same queue?**
A: Yes! BullMQ supports horizontal scaling. Multiple workers can process jobs from the same queue in parallel.

**Q: What happens if Redis goes down?**
A: Jobs in Redis are lost unless you have Redis persistence enabled (RDB/AOF). Always enable persistence in production.

---

## Best Practices

✅ Use separate Redis instance for queues
✅ Enable Redis persistence (AOF)
✅ Set appropriate job timeouts
✅ Monitor queue length and processing time
✅ Implement graceful shutdown for workers
✅ Use job IDs for idempotency

```ts
// Graceful shutdown
process.on('SIGTERM', async () => {
  await worker.close();
  process.exit(0);
});
```

---

## Common Patterns

### Pattern 1: Chain Jobs
```ts
await queue.add('step1', data);

worker.on('completed', async (job) => {
  if (job.name === 'step1') {
    await queue.add('step2', job.returnvalue);
  }
});
```

### Pattern 2: Batch Processing
```ts
const jobs = users.map(user => ({
  name: 'send-email',
  data: { email: user.email }
}));

await queue.addBulk(jobs);
```

### Pattern 3: Rate Limiting
```ts
const worker = new Worker('api-calls', processJob, {
  limiter: {
    max: 10,      // 10 jobs
    duration: 1000 // per second
  }
});
```
