# Non-Blocking Upload System: Complete System Design

Complete system design solution for handling large file uploads with asynchronous processing.

## Problem Statement

**Scenario**: Building a service like Instagram or Google Drive where users upload large files (4K images, PDFs) requiring heavy processing (thumbnails, text extraction, virus scanning).

**Current Problem**: Synchronous MVP causes:
- All server threads stuck during processing (3+ seconds)
- API becomes unresponsive with 50 concurrent uploads
- Timeouts and poor user experience

**Requirement**: API must return success response in < 200ms, even if processing takes 10 seconds.

---

## System Architecture Overview

### High-Level Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       │ 1. POST /upload (file)
       ▼
┌─────────────────────────────────────┐
│      API Service (Producer)         │
│  ┌──────────────────────────────┐  │
│  │ 1. Accept file                │  │
│  │ 2. Save raw file to S3        │  │
│  │ 3. Create job (DB)            │  │
│  │ 4. Push to Queue              │  │
│  │ 5. Return job_id (< 200ms)   │  │
│  └──────────────────────────────┘  │
└──────┬──────────────────────────────┘
       │
       ├─→ Database (Job Status)
       │
       └─→ Message Queue
              │
              ▼
┌─────────────────────────────────────┐
│    Worker Service (Consumer)         │
│  ┌──────────────────────────────┐  │
│  │ 1. Poll Queue                 │  │
│  │ 2. Fetch file from S3         │  │
│  │ 3. Process (resize, scan)     │  │
│  │ 4. Save processed file        │  │
│  │ 5. Update DB (COMPLETED)      │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────┐
│   Storage   │
│  (S3/Drive) │
└─────────────┘
```

---

## Detailed Component Design

### 1. API Service (Producer)

**Responsibilities**:
- Accept file uploads
- Validate files
- Store raw files
- Create job records
- Enqueue processing tasks
- Return immediate response

**Implementation**:

```javascript
// Express.js Example
const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { uploadToS3, createJob, enqueueJob } = require('./services');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.post('/upload', upload.single('file'), async (req, res) => {
    const startTime = Date.now();
    
    try {
        // 1. Validate file
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        if (req.file.size > 100 * 1024 * 1024) { // 100MB limit
            return res.status(400).json({ error: 'File too large' });
        }

        // 2. Generate job ID
        const jobId = uuidv4();
        
        // 3. Upload raw file to S3 (async, non-blocking)
        const s3Key = `raw/${jobId}/${req.file.originalname}`;
        await uploadToS3(s3Key, req.file.buffer);
        
        // 4. Create job record in DB
        await createJob({
            jobId,
            status: 'PENDING',
            fileName: req.file.originalname,
            fileSize: req.file.size,
            s3Key,
            createdAt: new Date()
        });
        
        // 5. Enqueue processing job
        await enqueueJob({
            jobId,
            s3Key,
            processingType: detectProcessingType(req.file.mimetype)
        });
        
        // 6. Return response (< 200ms)
        const elapsed = Date.now() - startTime;
        res.status(202).json({
            jobId,
            status: 'PENDING',
            message: 'File uploaded successfully, processing started',
            estimatedTime: '10-30 seconds'
        });
        
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});
```

**Performance Metrics**:
- File validation: ~5ms
- S3 upload: ~50-100ms (async)
- DB insert: ~10-20ms
- Queue push: ~5-10ms
- **Total: < 200ms** ✅

---

### 2. Worker Service (Consumer)

**Responsibilities**:
- Poll message queue
- Process files (resize, scan, extract)
- Update job status
- Handle failures and retries

**Implementation**:

```javascript
// Worker Service
const { consumeQueue, updateJobStatus, downloadFromS3, uploadProcessedFile } = require('./services');
const sharp = require('sharp'); // Image processing
const { exec } = require('child_process'); // For other processing

async function processJob(job) {
    const { jobId, s3Key, processingType } = job;
    
    try {
        // Update status to PROCESSING
        await updateJobStatus(jobId, 'PROCESSING');
        
        // Download file from S3
        const fileBuffer = await downloadFromS3(s3Key);
        
        // Process based on type
        let processedFiles = {};
        
        switch (processingType) {
            case 'IMAGE':
                processedFiles = await processImage(fileBuffer);
                break;
            case 'PDF':
                processedFiles = await processPDF(fileBuffer);
                break;
            case 'VIDEO':
                processedFiles = await processVideo(fileBuffer);
                break;
        }
        
        // Upload processed files
        const processedS3Keys = {};
        for (const [type, buffer] of Object.entries(processedFiles)) {
            const key = `processed/${jobId}/${type}`;
            await uploadToS3(key, buffer);
            processedS3Keys[type] = key;
        }
        
        // Update status to COMPLETED
        await updateJobStatus(jobId, 'COMPLETED', {
            processedFiles: processedS3Keys,
            completedAt: new Date()
        });
        
        // Optional: Send notification/webhook
        await notifyCompletion(jobId);
        
    } catch (error) {
        console.error(`Job ${jobId} failed:`, error);
        await handleJobFailure(jobId, error);
    }
}

async function processImage(buffer) {
    const results = {};
    
    // Generate thumbnail (200x200)
    results.thumbnail = await sharp(buffer)
        .resize(200, 200, { fit: 'cover' })
        .toBuffer();
    
    // Generate medium (800x800)
    results.medium = await sharp(buffer)
        .resize(800, 800, { fit: 'inside' })
        .toBuffer();
    
    // Generate large (1920x1920)
    results.large = await sharp(buffer)
        .resize(1920, 1920, { fit: 'inside' })
        .toBuffer();
    
    return results;
}

// Start consuming
consumeQueue('file-processing', processJob);
```

---

### 3. Status Endpoint

**Implementation**:

```javascript
app.get('/status/:jobId', async (req, res) => {
    const { jobId } = req.params;
    
    const job = await getJobStatus(jobId);
    
    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }
    
    const response = {
        jobId: job.jobId,
        status: job.status,
        fileName: job.fileName,
        createdAt: job.createdAt
    };
    
    if (job.status === 'COMPLETED') {
        response.completedAt = job.completedAt;
        response.processedFiles = job.processedFiles;
        response.downloadUrls = generateDownloadUrls(job.processedFiles);
    } else if (job.status === 'PROCESSING') {
        response.progress = calculateProgress(job);
        response.estimatedTimeRemaining = estimateTimeRemaining(job);
    } else if (job.status === 'FAILED') {
        response.error = job.error;
        response.retryCount = job.retryCount;
    }
    
    res.json(response);
});
```

---

## Database Schema

### Jobs Table

```sql
CREATE TABLE jobs (
    job_id UUID PRIMARY KEY,
    status VARCHAR(20) NOT NULL, -- PENDING, PROCESSING, COMPLETED, FAILED
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(50),
    s3_key_raw VARCHAR(500) NOT NULL,
    s3_keys_processed JSONB,
    processing_type VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    failed_at TIMESTAMP,
    error_message TEXT,
    retry_count INT DEFAULT 0,
    metadata JSONB
);

CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at);
CREATE INDEX idx_jobs_status_created ON jobs(status, created_at);
```

---

## Message Queue Design

### Queue Options Comparison

| Queue | Pros | Cons | Use Case |
|-------|------|------|----------|
| **RabbitMQ** | Reliable, durable, ACK support | Complex setup | Production systems |
| **Redis Queue** | Simple, fast, in-memory | Less durable | High throughput |
| **AWS SQS** | Managed, scalable | Vendor lock-in | AWS ecosystem |
| **Kafka** | High throughput, distributed | Complex, overkill | Large scale |

### Recommended: RabbitMQ

```javascript
// Queue Configuration
const amqp = require('amqplib');

async function setupQueue() {
    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();
    
    // Declare exchange
    await channel.assertExchange('file-processing', 'direct', {
        durable: true
    });
    
    // Declare queue with DLQ
    await channel.assertQueue('file-processing-queue', {
        durable: true,
        arguments: {
            'x-dead-letter-exchange': 'file-processing-dlx',
            'x-dead-letter-routing-key': 'failed',
            'x-message-ttl': 3600000 // 1 hour
        }
    });
    
    // Bind queue to exchange
    await channel.bindQueue(
        'file-processing-queue',
        'file-processing',
        'process'
    );
    
    return channel;
}

// Producer
async function enqueueJob(jobData) {
    const channel = await setupQueue();
    channel.publish(
        'file-processing',
        'process',
        Buffer.from(JSON.stringify(jobData)),
        {
            persistent: true,
            messageId: jobData.jobId
        }
    );
}

// Consumer
async function consumeQueue() {
    const channel = await setupQueue();
    
    channel.consume('file-processing-queue', async (msg) => {
        if (msg) {
            const job = JSON.parse(msg.content.toString());
            try {
                await processJob(job);
                channel.ack(msg); // Acknowledge success
            } catch (error) {
                // Reject and requeue (with retry limit)
                if (job.retryCount < 3) {
                    channel.nack(msg, false, true); // Requeue
                } else {
                    channel.nack(msg, false, false); // Send to DLQ
                }
            }
        }
    }, { noAck: false });
}
```

---

## Visual Flow Diagrams

### Upload Flow

```
Client                    API Service              Queue              Worker
  │                          │                      │                  │
  │── POST /upload ──────────>│                      │                  │
  │                          │                      │                  │
  │                          │── Validate ────────>│                  │
  │                          │                      │                  │
  │                          │── Save to S3 ───────>│                  │
  │                          │                      │                  │
  │                          │── Create Job (DB) ───>│                  │
  │                          │                      │                  │
  │                          │── Enqueue ───────────>│                  │
  │                          │                      │                  │
  │<── 202 Accepted ─────────│                      │                  │
  │    {jobId, status}       │                      │                  │
  │                          │                      │                  │
  │                          │                      │── Consume ──────>│
  │                          │                      │                  │
  │                          │                      │                  │── Process
  │                          │                      │                  │
  │                          │<── Update Status ─────│                  │
  │                          │   (PROCESSING)       │                  │
  │                          │                      │                  │
  │                          │<── Update Status ─────│                  │
  │                          │   (COMPLETED)        │                  │
  │                          │                      │                  │
  │── GET /status/{jobId} ───>│                      │                  │
  │                          │── Query DB ──────────>│                  │
  │<── 200 OK ───────────────│                      │                  │
  │    {status: COMPLETED}   │                      │                  │
```

### Processing Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    File Processing Pipeline                   │
└─────────────────────────────────────────────────────────────┘

1. UPLOAD PHASE (< 200ms)
   ┌──────────┐     ┌──────────┐     ┌──────────┐
   │ Validate │ --> │ Save S3  │ --> │ Enqueue  │
   └──────────┘     └──────────┘     └──────────┘
       5ms             50ms             10ms

2. PROCESSING PHASE (10-30s)
   ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
   │ Download │ --> │ Process  │ --> │ Upload   │ --> │ Update   │
   │   from   │     │ (resize, │     │ Processed│     │   DB     │
   │    S3    │     │  scan)   │     │   Files  │     │          │
   └──────────┘     └──────────┘     └──────────┘     └──────────┘
      500ms          10-30s           500ms            20ms

3. STATUS CHECK
   ┌──────────┐     ┌──────────┐
   │  Client  │ --> │   API    │
   │  Polls   │     │  Returns │
   └──────────┘     └──────────┘
```

---

## Challenges & Solutions

### Challenge 1: File Size Limits

**Problem**: Large files (4K videos, high-res images) can cause:
- Memory issues in workers
- Timeout in upload
- Storage costs

**Solutions**:

```javascript
// 1. Chunked Upload
app.post('/upload/chunked', async (req, res) => {
    const { chunkIndex, totalChunks, jobId, chunk } = req.body;
    
    // Save chunk to temporary storage
    await saveChunk(jobId, chunkIndex, chunk);
    
    // If last chunk, trigger assembly
    if (chunkIndex === totalChunks - 1) {
        await assembleChunks(jobId, totalChunks);
        await enqueueJob(jobId);
    }
    
    res.json({ received: true });
});

// 2. Streaming Processing
async function processLargeFile(s3Key) {
    const stream = downloadFromS3Stream(s3Key);
    const processor = sharp().resize(1920, 1920);
    
    return new Promise((resolve, reject) => {
        stream
            .pipe(processor)
            .pipe(uploadToS3Stream(`processed/${jobId}/large`))
            .on('finish', resolve)
            .on('error', reject);
    });
}
```

### Challenge 2: Worker Scaling

**Problem**: Variable load - sometimes 10 files, sometimes 1000

**Solutions**:

```javascript
// Auto-scaling Workers
class WorkerPool {
    constructor(minWorkers = 2, maxWorkers = 10) {
        this.minWorkers = minWorkers;
        this.maxWorkers = maxWorkers;
        this.workers = [];
        this.monitorQueue();
    }
    
    async monitorQueue() {
        setInterval(async () => {
            const queueLength = await getQueueLength();
            const activeWorkers = this.workers.length;
            
            if (queueLength > activeWorkers * 10 && activeWorkers < this.maxWorkers) {
                this.scaleUp();
            } else if (queueLength < activeWorkers * 5 && activeWorkers > this.minWorkers) {
                this.scaleDown();
            }
        }, 5000);
    }
    
    scaleUp() {
        const newWorker = spawnWorker();
        this.workers.push(newWorker);
    }
    
    scaleDown() {
        const worker = this.workers.pop();
        worker.gracefulShutdown();
    }
}
```

### Challenge 3: Failure Handling

**Problem**: Processing can fail due to:
- Corrupted files
- Out of memory
- Network issues
- Invalid file formats

**Solutions**:

```javascript
// Retry with Exponential Backoff
async function processJobWithRetry(job, maxRetries = 3) {
    let attempt = 0;
    
    while (attempt < maxRetries) {
        try {
            await processJob(job);
            return; // Success
        } catch (error) {
            attempt++;
            
            if (attempt >= maxRetries) {
                await updateJobStatus(job.jobId, 'FAILED', {
                    error: error.message,
                    retryCount: attempt
                });
                await sendToDLQ(job);
                return;
            }
            
            // Exponential backoff: 2^attempt seconds
            const delay = Math.pow(2, attempt) * 1000;
            await sleep(delay);
            
            await updateJobStatus(job.jobId, 'RETRYING', {
                attempt,
                nextRetry: new Date(Date.now() + delay)
            });
        }
    }
}

// Dead Letter Queue Handler
async function handleDLQ() {
    consumeQueue('file-processing-dlq', async (msg) => {
        const job = JSON.parse(msg.content.toString());
        
        // Log for manual review
        await logFailedJob(job);
        
        // Notify admin
        await notifyAdmin({
            jobId: job.jobId,
            error: job.error,
            fileName: job.fileName
        });
        
        // Optionally: Manual retry endpoint
        // POST /admin/retry/{jobId}
    });
}
```

### Challenge 4: Duplicate Processing

**Problem**: Same file processed multiple times due to:
- Network retries
- Worker crashes
- Queue duplicates

**Solutions**:

```javascript
// Idempotency with Job Locking
async function processJob(job) {
    const lockKey = `job:lock:${job.jobId}`;
    
    // Try to acquire lock (Redis)
    const lockAcquired = await redis.set(
        lockKey,
        'locked',
        'EX', 300, // 5 min expiry
        'NX' // Only if not exists
    );
    
    if (!lockAcquired) {
        console.log(`Job ${job.jobId} already being processed`);
        return; // Another worker is handling it
    }
    
    try {
        // Check if already completed
        const existingJob = await getJobStatus(job.jobId);
        if (existingJob.status === 'COMPLETED') {
            return; // Already done
        }
        
        await processJob(job);
    } finally {
        await redis.del(lockKey);
    }
}
```

---

## Edge Cases & Handling

### Edge Case 1: Concurrent Status Checks

**Problem**: Multiple clients polling same job simultaneously

**Solution**: Cache status responses

```javascript
const cache = new Map();

app.get('/status/:jobId', async (req, res) => {
    const { jobId } = req.params;
    
    // Check cache first
    const cached = cache.get(jobId);
    if (cached && Date.now() - cached.timestamp < 1000) {
        return res.json(cached.data);
    }
    
    const job = await getJobStatus(jobId);
    const response = formatStatusResponse(job);
    
    // Cache for 1 second
    cache.set(jobId, {
        data: response,
        timestamp: Date.now()
    });
    
    res.json(response);
});
```

### Edge Case 2: Worker Crash During Processing

**Problem**: Worker crashes mid-processing, job stuck in PROCESSING

**Solution**: Heartbeat mechanism

```javascript
// Worker sends heartbeat
setInterval(async () => {
    await redis.set(`worker:heartbeat:${workerId}`, Date.now(), 'EX', 30);
}, 10000);

// Monitor checks for stale workers
async function detectStaleWorkers() {
    const workers = await redis.keys('worker:heartbeat:*');
    
    for (const key of workers) {
        const lastHeartbeat = await redis.get(key);
        if (Date.now() - lastHeartbeat > 60000) { // 1 min timeout
            const workerId = key.split(':')[2];
            await recoverWorkerJobs(workerId);
        }
    }
}
```

### Edge Case 3: Queue Overflow

**Problem**: Queue fills up faster than workers can process

**Solution**: Backpressure and rate limiting

```javascript
// Rate limiting on upload endpoint
const rateLimiter = require('express-rate-limit');

const uploadLimiter = rateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 uploads per minute per IP
    message: 'Too many uploads, please try again later'
});

app.post('/upload', uploadLimiter, upload.single('file'), ...);

// Backpressure: Reject if queue too full
async function enqueueJob(jobData) {
    const queueLength = await getQueueLength();
    
    if (queueLength > 10000) {
        throw new Error('Queue overloaded, please try again later');
    }
    
    await queue.publish(jobData);
}
```

### Edge Case 4: Storage Quota

**Problem**: S3/storage fills up

**Solution**: Pre-check and cleanup

```javascript
async function checkStorageQuota() {
    const used = await getStorageUsage();
    const quota = await getStorageQuota();
    
    if (used / quota > 0.9) { // 90% full
        // Reject new uploads
        throw new Error('Storage quota exceeded');
    }
}

// Cleanup old files
async function cleanupOldFiles() {
    const oldJobs = await db.query(`
        SELECT job_id, s3_key_raw, s3_keys_processed
        FROM jobs
        WHERE status = 'COMPLETED'
        AND completed_at < NOW() - INTERVAL '30 days'
    `);
    
    for (const job of oldJobs) {
        await deleteFromS3(job.s3_key_raw);
        await deleteFromS3(Object.values(job.s3_keys_processed));
    }
}
```

---

## Alternative Architectures

### Alternative 1: Event-Driven with WebSockets

**Architecture**: Real-time updates instead of polling

```javascript
// WebSocket Server
const io = require('socket.io')(server);

io.on('connection', (socket) => {
    socket.on('subscribe-job', (jobId) => {
        socket.join(`job:${jobId}`);
    });
});

// Worker notifies on completion
async function notifyJobCompletion(jobId) {
    io.to(`job:${jobId}`).emit('job-completed', {
        jobId,
        status: 'COMPLETED',
        downloadUrls: generateDownloadUrls(job.processedFiles)
    });
}
```

**Pros**: Real-time, no polling overhead  
**Cons**: Connection management, scaling complexity

### Alternative 2: Serverless Functions

**Architecture**: AWS Lambda / Cloud Functions

```javascript
// Upload triggers Lambda
exports.handler = async (event) => {
    const s3Event = event.Records[0].s3;
    const jobId = extractJobId(s3Event.object.key);
    
    // Process in Lambda
    await processFile(s3Event.bucket.name, s3Event.object.key);
    
    return { statusCode: 200 };
};
```

**Pros**: Auto-scaling, pay-per-use  
**Cons**: Cold starts, timeout limits (15 min)

### Alternative 3: Direct Database Polling

**Architecture**: Workers poll database instead of queue

```javascript
// Worker polls DB
async function pollDatabase() {
    const jobs = await db.query(`
        SELECT * FROM jobs
        WHERE status = 'PENDING'
        ORDER BY created_at ASC
        LIMIT 10
        FOR UPDATE SKIP LOCKED
    `);
    
    for (const job of jobs) {
        await processJob(job);
    }
}

setInterval(pollDatabase, 1000);
```

**Pros**: Simple, no queue infrastructure  
**Cons**: Database load, less efficient

---

## Best Possible Solution

### Recommended Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Production Architecture                   │
└─────────────────────────────────────────────────────────────┘

API Layer (Load Balanced)
├── API Server 1 (Express/Fastify)
├── API Server 2
└── API Server 3

Message Queue (RabbitMQ Cluster)
├── Primary Queue (file-processing)
├── Retry Queue (with TTL)
└── Dead Letter Queue (failed jobs)

Worker Pool (Auto-scaling)
├── Worker 1 (Image Processing)
├── Worker 2 (PDF Processing)
├── Worker 3 (Video Processing)
└── Worker N (Scales based on queue length)

Storage (S3/CDN)
├── Raw Files (S3 Standard)
├── Processed Files (S3 Standard-IA)
└── CDN (CloudFront) for delivery

Database (PostgreSQL with Read Replicas)
├── Primary (Writes)
└── Replicas (Reads for status checks)

Cache (Redis)
├── Job Status Cache
├── Worker Heartbeats
└── Rate Limiting
```

### Complete Implementation

```javascript
// Complete System Implementation

// 1. API Service
class UploadService {
    async handleUpload(file, userId) {
        // Validate
        await this.validateFile(file);
        
        // Generate job
        const jobId = uuidv4();
        
        // Parallel operations
        const [s3Key] = await Promise.all([
            this.uploadToS3(file, jobId),
            this.createJobRecord(jobId, file, userId),
            this.enqueueProcessing(jobId, file)
        ]);
        
        return {
            jobId,
            status: 'PENDING',
            estimatedTime: this.estimateProcessingTime(file)
        };
    }
    
    async getStatus(jobId) {
        // Check cache first
        const cached = await redis.get(`job:status:${jobId}`);
        if (cached) return JSON.parse(cached);
        
        // Query DB
        const job = await db.query('SELECT * FROM jobs WHERE job_id = $1', [jobId]);
        
        // Cache for 1 second
        await redis.setex(`job:status:${jobId}`, 1, JSON.stringify(job));
        
        return this.formatStatusResponse(job);
    }
}

// 2. Worker Service
class ProcessingWorker {
    async process(job) {
        // Acquire lock
        const lock = await this.acquireLock(job.jobId);
        if (!lock) return; // Already processing
        
        try {
            // Update status
            await this.updateStatus(job.jobId, 'PROCESSING');
            
            // Download
            const file = await this.downloadFromS3(job.s3Key);
            
            // Process
            const results = await this.processFile(file, job.type);
            
            // Upload results
            const processedKeys = await this.uploadProcessed(results, job.jobId);
            
            // Update status
            await this.updateStatus(job.jobId, 'COMPLETED', {
                processedFiles: processedKeys
            });
            
            // Notify
            await this.notifyCompletion(job.jobId);
            
        } catch (error) {
            await this.handleError(job.jobId, error);
        } finally {
            await this.releaseLock(job.jobId);
        }
    }
}

// 3. Monitoring & Observability
class MonitoringService {
    trackMetrics() {
        // Queue length
        // Processing time
        // Success/failure rates
        // Worker utilization
        // Storage usage
    }
    
    alertOnAnomalies() {
        // Queue backup
        // High failure rate
        // Worker crashes
        // Storage quota
    }
}
```

---

## Performance Metrics

### Target Metrics

| Metric | Target | Current (Synchronous) |
|--------|--------|----------------------|
| Upload Response Time | < 200ms | 3000ms+ |
| Throughput | 1000 req/min | 50 req/min |
| Worker Utilization | 70-80% | N/A |
| Queue Processing Rate | 100 jobs/min | N/A |
| Status Check Latency | < 50ms | N/A |

### Monitoring Dashboard

```javascript
// Metrics Collection
const metrics = {
    uploadsPerMinute: 0,
    averageProcessingTime: 0,
    queueLength: 0,
    workerCount: 0,
    successRate: 0,
    failureRate: 0
};

// Prometheus Metrics
const promClient = require('prom-client');

const uploadCounter = new promClient.Counter({
    name: 'file_uploads_total',
    help: 'Total file uploads'
});

const processingDuration = new promClient.Histogram({
    name: 'file_processing_duration_seconds',
    help: 'File processing duration'
});
```

---

## Security Considerations

### 1. File Validation

```javascript
async function validateFile(file) {
    // Size check
    if (file.size > MAX_FILE_SIZE) {
        throw new Error('File too large');
    }
    
    // Type check (magic numbers, not just extension)
    const fileType = await detectFileType(file.buffer);
    if (!ALLOWED_TYPES.includes(fileType)) {
        throw new Error('File type not allowed');
    }
    
    // Virus scanning (async)
    const scanResult = await virusScan(file.buffer);
    if (scanResult.infected) {
        throw new Error('File contains virus');
    }
}
```

### 2. Access Control

```javascript
// JWT-based authentication
app.post('/upload', authenticate, upload.single('file'), ...);

// Job ownership
app.get('/status/:jobId', authenticate, async (req, res) => {
    const job = await getJobStatus(req.params.jobId);
    
    if (job.userId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(job);
});
```

### 3. Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 uploads per 15 min
    keyGenerator: (req) => req.user.id // Per user
});
```

---

## Scalability Considerations

### Horizontal Scaling

```
┌─────────────┐
│ Load Balancer│
└──────┬───────┘
       │
   ┌───┴───┬────────┬────────┐
   │       │        │        │
┌──▼──┐ ┌──▼──┐ ┌──▼──┐ ┌──▼──┐
│ API │ │ API │ │ API │ │ API │
│  1  │ │  2  │ │  3  │ │  N  │
└──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘
   │       │        │        │
   └───┬───┴────────┴────────┘
       │
   ┌───▼───────────┐
   │ Message Queue │
   └───┬───────────┘
       │
   ┌───┴───┬────────┬────────┐
   │       │        │        │
┌──▼──┐ ┌──▼──┐ ┌──▼──┐ ┌──▼──┐
│Worker│ │Worker│ │Worker│ │Worker│
│  1   │ │  2   │ │  3   │ │  N   │
└──────┘ └──────┘ └──────┘ └──────┘
```

### Database Scaling

- **Read Replicas**: For status checks
- **Sharding**: By user_id or date
- **Caching**: Redis for hot data

### Storage Scaling

- **S3 Lifecycle Policies**: Move to cheaper storage
- **CDN**: CloudFront for delivery
- **Compression**: Compress processed files

---

## Deployment Strategy

### Docker Compose Setup

```yaml
version: '3.8'
services:
  api:
    build: ./api
    ports:
      - "3000:3000"
    environment:
      - DB_HOST=postgres
      - REDIS_HOST=redis
      - RABBITMQ_HOST=rabbitmq
    depends_on:
      - postgres
      - redis
      - rabbitmq
  
  worker:
    build: ./worker
    environment:
      - DB_HOST=postgres
      - REDIS_HOST=redis
      - RABBITMQ_HOST=rabbitmq
    deploy:
      replicas: 3
    depends_on:
      - postgres
      - redis
      - rabbitmq
  
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: uploads
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:7
    volumes:
      - redis_data:/data
  
  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "15672:15672"
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
```

---

## Testing Strategy

### Unit Tests

```javascript
describe('UploadService', () => {
    it('should return jobId in < 200ms', async () => {
        const start = Date.now();
        const result = await uploadService.handleUpload(mockFile);
        const duration = Date.now() - start;
        
        expect(duration).toBeLessThan(200);
        expect(result.jobId).toBeDefined();
    });
});
```

### Integration Tests

```javascript
describe('Processing Pipeline', () => {
    it('should process file end-to-end', async () => {
        // Upload
        const { jobId } = await uploadFile();
        
        // Wait for processing
        await waitForCompletion(jobId, 30000);
        
        // Verify
        const status = await getStatus(jobId);
        expect(status.status).toBe('COMPLETED');
        expect(status.processedFiles).toBeDefined();
    });
});
```

### Load Tests

```javascript
// k6 load test
import http from 'k6/http';

export let options = {
    stages: [
        { duration: '1m', target: 50 },
        { duration: '3m', target: 100 },
        { duration: '1m', target: 0 }
    ]
};

export default function() {
    const file = open('test-image.jpg', 'b');
    const formData = { file: http.file(file, 'test.jpg') };
    
    const res = http.post('http://api/upload', formData);
    check(res, {
        'status is 202': (r) => r.status === 202,
        'response time < 200ms': (r) => r.timings.duration < 200
    });
}
```

---

## Cost Optimization

### Storage Costs

```javascript
// Lifecycle policies
const lifecyclePolicy = {
    Rules: [{
        Id: 'MoveToIA',
        Status: 'Enabled',
        Transitions: [{
            Days: 30,
            StorageClass: 'STANDARD_IA' // Cheaper
        }],
        Expiration: {
            Days: 365 // Delete after 1 year
        }
    }]
};
```

### Compute Costs

- **Spot Instances**: For workers (can handle interruptions)
- **Reserved Instances**: For API servers (stable load)
- **Auto-scaling**: Scale down during low traffic

---

## Summary

### Key Takeaways

1. **Separation of Concerns**: API handles uploads, workers handle processing
2. **Async Processing**: Queue-based architecture for scalability
3. **Fast Response**: Return immediately, process later
4. **Reliability**: Retries, DLQ, monitoring
5. **Scalability**: Horizontal scaling, auto-scaling workers
6. **Observability**: Metrics, logging, alerting

### Architecture Decision Matrix

| Requirement | Solution |
|-------------|----------|
| Fast upload response | Async queue |
| Scalability | Horizontal scaling |
| Reliability | Retries + DLQ |
| Monitoring | Metrics + Logging |
| Cost | Auto-scaling + Lifecycle policies |

---

## References

- [RabbitMQ Best Practices](https://www.rabbitmq.com/best-practices.html)
- [AWS S3 Lifecycle Policies](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html)
- [Message Queue Patterns](https://www.enterpriseintegrationpatterns.com/)

