# Non-Blocking Upload System – Alternative Design with Pub/Sub

Alternative solution for the same problem using a **pub/sub event bus** (Kafka / SNS+SQS / Pulsar) instead of a simple work queue.

---

## Problem Recap

**Scenario**: Users upload large files (4K images, PDFs). System must:
- Accept uploads quickly (< 200ms)
- Perform heavy processing asynchronously (thumbnails, OCR, virus scanning)
- Scale to high concurrency

**Original Answer** (in `01_Non_Blocking_Upload_System.md`):
- Uses **work queue** (RabbitMQ) + workers
- Job table for tracking status
- Client polls `/status/{jobId}`

**This Answer**:
- Uses a **pub/sub event bus** (e.g., Kafka topic, AWS SNS → SQS fanout)
- Multiple independent consumers (processors) subscribe
- Better decoupling and extensibility, same non-blocking behavior

---

## High-Level Pub/Sub Architecture

```text
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       │ 1. POST /upload (file)
       ▼
┌───────────────────────────────────────┐
│          API Gateway / LB            │
└───────────────┬──────────────────────┘
                │
      ┌─────────┴─────────┐
      ▼                   ▼
┌─────────────┐    ┌─────────────┐
│  API Svc 1  │    │  API Svc 2  │  ... (horizontally scalable)
└──────┬──────┘    └──────┬──────┘
       │                  │
       └──────────┬───────┘
                  │
                  ▼
        ┌────────────────────┐
        │  Database (Jobs)   │
        └─────────┬──────────┘
                  │
                  ▼
        ┌────────────────────┐
        │  Object Storage     │
        │ (S3 / GCS / Blob)  │
        └─────────┬──────────┘
                  │
                  ▼
        ┌─────────────────────────────┐
        │  Event Bus / PubSub Topic   │
        │  (Kafka / SNS / Pulsar)     │
        └─────────┬─────────┬────────┘
                  │         │
                  │         │
        ┌─────────▼───┐ ┌───▼────────┐
        │  Image Proc │ │  OCR Proc  │  ... more processors
        └──────┬──────┘ └────┬───────┘
               │             │
               └─────────────┴───────► update DB, upload processed outputs
```

**Key difference vs work-queue**:
- Event bus is **broadcast** → multiple consumers can independently react to the same event
- Each service has its own subscription (e.g., Kafka consumer group, SNS → multiple SQS queues)

---

## API Design (Upload Flow with Pub/Sub)

### 1. Upload Endpoint (Non-Blocking)

```javascript
// Pseudo-code: Express + Kafka (or SNS)
app.post('/upload', upload.single('file'), async (req, res) => {
  const start = Date.now();

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const jobId = uuidv4();
    const mimeType = req.file.mimetype;
    const fileName = req.file.originalname;

    // 1) Store raw file in object storage
    const objectKey = `raw/${jobId}/${fileName}`;
    await storage.putObject(objectKey, req.file.buffer, mimeType);

    // 2) Create job record
    await db.insertJob({
      jobId,
      status: 'PENDING',
      fileName,
      fileSize: req.file.size,
      mimeType,
      objectKey,
      createdAt: new Date(),
    });

    // 3) Publish event to event bus
    await eventBus.publish('file.uploaded', {
      jobId,
      objectKey,
      fileName,
      mimeType,
      createdAt: new Date().toISOString(),
    });

    // 4) Respond immediately
    const elapsed = Date.now() - start;
    res.status(202).json({
      jobId,
      status: 'PENDING',
      message: 'Upload accepted, processing via pub/sub started',
      uploadTimeMs: elapsed,
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});
```

**Properties**:
- Still **non-blocking** (all heavy work moves to subscribers).
- Event bus carries a **domain event** (`file.uploaded`) with metadata.

---

## Subscribers / Consumers

### 2. Image Processing Subscriber

```javascript
// Pseudo-code using Kafka consumer group
eventBus.subscribe('file.uploaded', 'image-processor-group', async (event) => {
  const { jobId, objectKey, mimeType } = event;

  if (!mimeType.startsWith('image/')) {
    // Ignore non-image files
    return;
  }

  await db.updateJob(jobId, { status: 'IMAGE_PROCESSING' });

  const fileBuffer = await storage.getObject(objectKey);

  // Generate multiple resolutions
  const processed = await processImageVariants(fileBuffer); // thumbnails, medium, large

  const processedKeys = {};
  for (const [variant, buffer] of Object.entries(processed)) {
    const processedKey = `processed/${jobId}/${variant}.jpg`;
    await storage.putObject(processedKey, buffer, 'image/jpeg');
    processedKeys[variant] = processedKey;
  }

  await db.updateJob(jobId, {
    status: 'IMAGE_PROCESSED',
    processedFiles: db.mergeJsonField('processedFiles', { image: processedKeys }),
  });
});
```

### 3. OCR Subscriber (PDF/Text Extraction)

```javascript
eventBus.subscribe('file.uploaded', 'ocr-processor-group', async (event) => {
  const { jobId, objectKey, mimeType } = event;

  if (mimeType !== 'application/pdf') return;

  await db.updateJob(jobId, { status: 'OCR_PROCESSING' });

  const fileBuffer = await storage.getObject(objectKey);
  const text = await runOcrOnPdf(fileBuffer); // heavy operation

  const ocrKey = `processed/${jobId}/text.json`;
  await storage.putObject(ocrKey, Buffer.from(JSON.stringify({ text })), 'application/json');

  await db.updateJob(jobId, {
    status: 'OCR_PROCESSED',
    processedFiles: db.mergeJsonField('processedFiles', { ocr: { text: ocrKey } }),
  });
});
```

### 4. Aggregator / Final Status

You can:
- Either set final status from each consumer independently (e.g., `COMPLETED_IMAGE`, `COMPLETED_OCR`)
- Or have a **Job Orchestrator** subscriber that listens to **internal events** (`image.processed`, `ocr.processed`) and decides when the job is **fully completed**.

```javascript
// Example simple rule: complete when all required processors are done
async function maybeMarkJobCompleted(jobId) {
  const job = await db.getJob(jobId);
  const required = ['image', 'ocr']; // configurable per file type

  if (required.every((k) => job.processedFiles && job.processedFiles[k])) {
    await db.updateJob(jobId, { status: 'COMPLETED', completedAt: new Date() });
  }
}
```

---

## Status Endpoint (Same as Original)

Status endpoint largely **reuses** the logic from the original design:

```javascript
app.get('/status/:jobId', async (req, res) => {
  const { jobId } = req.params;

  // Try cache first
  const cached = await redis.get(`job:status:${jobId}`);
  if (cached) return res.json(JSON.parse(cached));

  const job = await db.getJob(jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const response = {
    jobId: job.jobId,
    status: job.status,
    fileName: job.fileName,
    createdAt: job.createdAt,
    processedFiles: job.processedFiles || {},
  };

  // Cache briefly
  await redis.setex(`job:status:${jobId}`, 1, JSON.stringify(response));

  res.json(response);
});
```

---

## Pub/Sub vs Work Queue

### Work Queue (Original RabbitMQ Design)
- **Semantics**: Distribute work across workers (each message consumed by one worker).
- **Good for**: Single processing pipeline per file.
- **Tight coupling**: One consumer type “owns” the event.

### Pub/Sub Event Bus (This Answer)
- **Semantics**: Broadcast events to multiple subscribers.
  - Kafka topic with multiple consumer groups.
  - SNS topic with multiple SQS queues.
- **Good for**:
  - Multiple independent processing flows per file:
    - Image resizing
    - OCR
    - Virus scanning
    - AI embedding, etc.
  - Easy to add new services without touching the uploader.

---

## Visual: Pub/Sub Event Flow

```text
Client
  │
  │  POST /upload
  ▼
API Service
  │ 1. Save file → Storage
  │ 2. Create Job in DB
  │ 3. Publish `file.uploaded` event
  ▼
Event Bus (Topic: file.uploaded)
  │
  ├────────────► Image Processor (consumer group: image-processor)
  │               - Generates thumbnails
  │               - Updates job status
  │
  ├────────────► OCR Processor (consumer group: ocr-processor)
  │               - Extracts text
  │               - Updates job status
  │
  └────────────► Security Scanner (consumer group: virus-scanner)
                  - Scans for malware
                  - Updates job status

Client
  │
  │  GET /status/{jobId}
  ▼
API reads from DB (with Redis cache) and returns aggregated status
```

---

## Challenges & How Pub/Sub Helps

### 1. Extensibility
- **Problem**: New processing requirements (e.g., AI embeddings).
- **With pub/sub**: Just add a new subscriber for the same `file.uploaded` event.
- **No changes** to upload API or existing processors.

### 2. Decoupling
- Producers don’t know who consumes events.
- Each consumer scales independently.

### 3. Backpressure & Scaling
- Each consumer group handles its own throughput and scaling:
  - Image processing cluster
  - OCR processing cluster
  - Virus scanning cluster

### 4. Observability
- Event buses like Kafka expose offsets, lag, partitions:
  - Easy to see which consumer is slow.

---

## Trade-offs of Pub/Sub Approach

### Pros
- **Highly extensible**: New processing pipelines can be added without touching the uploader.
- **Loose coupling**: Upload service doesn’t depend on specific processors.
- **Independent scaling**: Different processors can scale based on their own workload.
- **Good fit for event-driven architectures** and microservices.

### Cons
- **More infra**: Event bus + multiple consumers = more deployment pieces.
- **Eventual consistency**: Multiple processors finishing at different times.
- **Orchestration complexity**: Need a way to know when all required processors are done (job orchestrator).

---

## When to Prefer Pub/Sub over Simple Queue

- You have **many independent consumers** per upload (image, OCR, scanning, analytics).
- You want to **add/remove processing flows** frequently.
- You need **clear separation** between teams (each owning a processor).
- You already use Kafka / SNS+SQS / Pulsar in your infra.

If your use case is **single processing pipeline**, a simple work queue is enough.  

