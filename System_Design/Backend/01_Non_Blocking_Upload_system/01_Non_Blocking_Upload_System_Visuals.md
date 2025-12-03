# Non-Blocking Upload System: Visual Diagrams

Complete visual representations of the system architecture and flows.

## 1. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │  Web App │  │ Mobile   │  │   CLI    │  │   API    │      │
│  │          │  │   App    │  │  Client  │  │  Client  │      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘      │
└───────┼──────────────┼──────────────┼──────────────┼──────────┘
        │              │              │              │
        └──────────────┴──────────────┴──────────────┘
                    │ HTTPS
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LOAD BALANCER                                  │
│                    (Nginx/ALB)                                    │
└───────────────────────┬─────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  API Server │ │  API Server │ │  API Server │
│      1      │ │      2       │ │      N      │
└──────┬──────┘ └──────┬──────┘ └──────┬──────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  PostgreSQL │ │   Redis     │ │  RabbitMQ   │
│  (Primary)  │ │   (Cache)   │ │   (Queue)   │
└─────────────┘ └─────────────┘ └──────┬───────┘
                                      │
                                      ▼
                            ┌─────────────────┐
                            │  Message Queue   │
                            │  (file-processing│
                            │     -queue)      │
                            └────────┬─────────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        │                            │                            │
        ▼                            ▼                            ▼
┌─────────────┐            ┌─────────────┐            ┌─────────────┐
│   Worker    │            │   Worker    │            │   Worker    │
│   (Image)   │            │    (PDF)    │            │   (Video)   │
└──────┬──────┘            └──────┬──────┘            └──────┬──────┘
       │                           │                           │
       └───────────────────────────┼───────────────────────────┘
                                   │
                                   ▼
                        ┌──────────────────┐
                        │   AWS S3 / GCS   │
                        │   (Storage)      │
                        └──────────────────┘
```

## 2. Upload Flow Sequence Diagram

```
Client          API Service        Database        Queue          Worker          S3
  │                  │                │              │              │              │
  │── POST /upload ──>│                │              │              │              │
  │    (file)         │                │              │              │              │
  │                   │                │              │              │              │
  │                   │── Validate ───>│              │              │              │
  │                   │                │              │              │              │
  │                   │── Save ────────────────────────────────────────────────────>│
  │                   │                │              │              │              │
  │                   │── Create Job ─>│              │              │              │
  │                   │                │              │              │              │
  │                   │── Enqueue ────────────────────>│              │              │
  │                   │                │              │              │              │
  │<── 202 Accepted ──│                │              │              │              │
  │    {jobId}        │                │              │              │              │
  │                   │                │              │              │              │
  │                   │                │              │── Consume ────>│              │
  │                   │                │              │              │              │
  │                   │<── Update ──────│              │              │              │
  │                   │   PROCESSING   │              │              │              │
  │                   │                │              │              │              │
  │                   │                │              │              │── Download ──>│
  │                   │                │              │              │              │
  │                   │                │              │              │── Process ────>│
  │                   │                │              │              │              │
  │                   │                │              │              │── Upload ─────>│
  │                   │                │              │              │              │
  │                   │<── Update ──────│              │              │              │
  │                   │   COMPLETED    │              │              │              │
  │                   │                │              │              │              │
  │── GET /status ────>│                │              │              │              │
  │                   │── Query ───────>│              │              │              │
  │<── 200 OK ────────│                │              │              │              │
  │    {COMPLETED}    │                │              │              │              │
```

## 3. Processing Pipeline Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    PROCESSING PIPELINE                       │
└─────────────────────────────────────────────────────────────┘

UPLOAD PHASE (< 200ms)
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Validate │───>│ Save S3  │───>│ Create   │───>│ Enqueue  │
│  File    │    │  Raw     │    │  Job     │    │  Task    │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
   5ms            50-100ms         10-20ms        5-10ms
                                                      │
                                                      ▼
PROCESSING PHASE (10-30s)
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Download │───>│ Process   │───>│ Upload   │───>│ Update   │
│ from S3  │    │ (resize,  │    │ Processed│    │  Status  │
│          │    │  scan)    │    │  Files   │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
   500ms          10-30s           500ms          20ms
                                                      │
                                                      ▼
STATUS CHECK PHASE (< 50ms)
┌──────────┐    ┌──────────┐
│  Client  │───>│   API    │
│  Polls   │    │ Returns  │
└──────────┘    └──────────┘
```

## 4. Queue Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MESSAGE QUEUE ARCHITECTURE                │
└─────────────────────────────────────────────────────────────┘

EXCHANGE: file-processing (direct)
    │
    ├─── ROUTING KEY: "process"
    │         │
    │         ▼
    │    ┌─────────────────────────────┐
    │    │  file-processing-queue       │
    │    │  (Main Queue)                │
    │    │  - Durable: true             │
    │    │  - TTL: 1 hour                │
    │    │  - DLX: file-processing-dlx   │
    │    └───────────┬───────────────────┘
    │                │
    │                ├───> Worker 1 (consumes)
    │                ├───> Worker 2 (consumes)
    │                └───> Worker N (consumes)
    │
    └─── ROUTING KEY: "failed" (after max retries)
              │
              ▼
         ┌─────────────────────────────┐
         │  file-processing-dlq          │
         │  (Dead Letter Queue)          │
         │  - Manual review              │
         │  - Admin notification         │
         └──────────────────────────────┘
```

## 5. Worker Processing Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    WORKER PROCESSING FLOW                     │
└─────────────────────────────────────────────────────────────┘

Worker receives message
        │
        ▼
┌──────────────────┐
│ Acquire Lock     │
│ (Redis)          │
└───────┬──────────┘
        │
        ├─ Lock exists? ──> Yes ──> ACK message, skip
        │
        └─ No ──> Continue
                │
                ▼
        ┌──────────────────┐
        │ Check Job Status   │
        │ (Already done?)    │
        └───────┬────────────┘
                │
                ├─ Completed? ──> Yes ──> ACK message, skip
                │
                └─ No ──> Continue
                        │
                        ▼
                ┌──────────────────┐
                │ Update:          │
                │ PROCESSING       │
                └───────┬──────────┘
                        │
                        ▼
                ┌──────────────────┐
                │ Download from S3  │
                └───────┬───────────┘
                        │
                        ▼
                ┌──────────────────┐
                │ Process File      │
                │ (Resize, Scan)    │
                └───────┬───────────┘
                        │
                        ├─ Success ──> Continue
                        │
                        └─ Error ──> Retry Logic
                                    │
                                    ├─ Retries < 3 ──> Requeue
                                    │
                                    └─ Retries >= 3 ──> DLQ
                        │
                        ▼
                ┌──────────────────┐
                │ Upload Processed  │
                │ Files to S3       │
                └───────┬───────────┘
                        │
                        ▼
                ┌──────────────────┐
                │ Update:           │
                │ COMPLETED         │
                └───────┬──────────┘
                        │
                        ▼
                ┌──────────────────┐
                │ Release Lock      │
                │ Invalidate Cache  │
                └───────┬───────────┘
                        │
                        ▼
                ┌──────────────────┐
                │ ACK Message       │
                │ Notify Client     │
                └───────────────────┘
```

## 6. Failure Handling Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    FAILURE HANDLING FLOW                      │
└─────────────────────────────────────────────────────────────┘

Processing Error Occurs
        │
        ▼
┌──────────────────┐
│ Catch Error      │
└───────┬──────────┘
        │
        ▼
┌──────────────────┐
│ Get Retry Count  │
└───────┬──────────┘
        │
        ├─ Retry Count < 3 ──> RETRY PATH
        │                         │
        │                         ▼
        │                 ┌──────────────────┐
        │                 │ Update: RETRYING │
        │                 │ Increment count   │
        │                 └───────┬──────────┘
        │                         │
        │                         ▼
        │                 ┌──────────────────┐
        │                 │ Exponential      │
        │                 │ Backoff Delay    │
        │                 │ (2^attempt sec)  │
        │                 └───────┬──────────┘
        │                         │
        │                         ▼
        │                 ┌──────────────────┐
        │                 │ Requeue Message  │
        │                 │ (NACK with requeue)│
        │                 └──────────────────┘
        │
        └─ Retry Count >= 3 ──> FAILURE PATH
                                  │
                                  ▼
                          ┌──────────────────┐
                          │ Update: FAILED   │
                          │ Log Error        │
                          └───────┬──────────┘
                                  │
                                  ▼
                          ┌──────────────────┐
                          │ Send to DLQ      │
                          │ (NACK no requeue)│
                          └───────┬──────────┘
                                  │
                                  ▼
                          ┌──────────────────┐
                          │ Notify Admin     │
                          │ Log for Review   │
                          └──────────────────┘
```

## 7. Scaling Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SCALING ARCHITECTURE                       │
└─────────────────────────────────────────────────────────────┘

HORIZONTAL SCALING

API Layer:
┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐
│ API  │  │ API  │  │ API  │  │ API  │
│  1   │  │  2   │  │  3   │  │  N   │
└──┬───┘  └──┬───┘  └──┬───┘  └──┬───┘
   └─────────┴─────────┴─────────┘
            │
            ▼
      Load Balancer
            │
            ▼
    Shared Resources
    (DB, Queue, Cache)

Worker Layer:
┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐
│Worker 1│  │Worker 2│  │Worker 3│  │Worker N│
│(Image) │  │ (PDF) │  │(Video) │  │(Auto)  │
└───┬────┘  └───┬────┘  └───┬────┘  └───┬────┘
    └───────────┴───────────┴───────────┘
            │
            ▼
    Message Queue
    (Distributes work)

AUTO-SCALING LOGIC:
Queue Length > Workers * 10  ──> Scale Up
Queue Length < Workers * 5   ──> Scale Down
```

## 8. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      DATA FLOW DIAGRAM                       │
└─────────────────────────────────────────────────────────────┘

UPLOAD PATH:
Client File
    │
    ▼
API Server (Memory)
    │
    ├─> Validate (5ms)
    │
    ├─> Upload to S3 (50-100ms)
    │   └─> S3: raw/{jobId}/{filename}
    │
    ├─> Insert to DB (10-20ms)
    │   └─> PostgreSQL: jobs table
    │
    └─> Push to Queue (5-10ms)
        └─> RabbitMQ: file-processing-queue

PROCESSING PATH:
Queue Message
    │
    ▼
Worker (Consumes)
    │
    ├─> Download from S3 (500ms)
    │   └─> S3: raw/{jobId}/{filename}
    │
    ├─> Process File (10-30s)
    │   └─> Memory: Processed buffers
    │
    ├─> Upload Processed (500ms)
    │   └─> S3: processed/{jobId}/{type}
    │
    └─> Update DB (20ms)
        └─> PostgreSQL: Update status

STATUS PATH:
Client Request
    │
    ▼
API Server
    │
    ├─> Check Cache (Redis) ──> Hit ──> Return (< 1ms)
    │
    └─> Miss ──> Query DB (10-20ms)
        └─> PostgreSQL: SELECT job
            └─> Cache Result (1s TTL)
                └─> Return to Client
```

## 9. Monitoring Dashboard View

```
┌─────────────────────────────────────────────────────────────┐
│                  MONITORING DASHBOARD                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  SYSTEM HEALTH                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ API: OK  │  │ Queue: OK│  │ Workers: │  │ Storage: │   │
│  │ 3/3      │  │ Healthy  │  │ 5/10     │  │ 45% Used│   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  METRICS                                                     │
│  Uploads/min:    150  │  Avg Processing:  12s              │
│  Queue Length:    45   │  Success Rate:    98.5%            │
│  Active Workers:   5   │  Failure Rate:    1.5%             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  RECENT JOBS                                                 │
│  Job ID          │ Status    │ Type    │ Time              │
│  abc-123         │ COMPLETED │ IMAGE   │ 15s                │
│  def-456         │ PROCESSING│ PDF     │ 8s                 │
│  ghi-789         │ PENDING   │ VIDEO   │ 2s                 │
└─────────────────────────────────────────────────────────────┘
```

## 10. Error Recovery Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    ERROR RECOVERY FLOW                        │
└─────────────────────────────────────────────────────────────┘

Worker Crash Detection
        │
        ▼
┌──────────────────┐
│ Heartbeat Missing│
│ (> 1 min)        │
└───────┬──────────┘
        │
        ▼
┌──────────────────┐
│ Find Stale Jobs  │
│ (PROCESSING      │
│  > 5 min)        │
└───────┬──────────┘
        │
        ▼
┌──────────────────┐
│ Reset Status     │
│ PENDING          │
└───────┬──────────┘
        │
        ▼
┌──────────────────┐
│ Requeue Job      │
│ (Another worker) │
└──────────────────┘
```

## 11. Cost Optimization Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                  COST OPTIMIZATION                           │
└─────────────────────────────────────────────────────────────┘

STORAGE COSTS:
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Raw Files    │───>│ After 30 days│───>│ After 365   │
│ S3 Standard  │    │ S3 Standard-IA│   │ Delete      │
│ $0.023/GB    │    │ $0.0125/GB   │   │ (Lifecycle) │
└──────────────┘    └──────────────┘    └──────────────┘

COMPUTE COSTS:
┌──────────────┐    ┌──────────────┐
│ API Servers  │    │ Workers      │
│ Reserved     │    │ Spot         │
│ Instances    │    │ Instances    │
│ (Stable)     │    │ (Can handle  │
│              │    │  interruption)│
└──────────────┘    └──────────────┘

AUTO-SCALING:
High Load ──> Scale Up (More workers)
Low Load  ──> Scale Down (Fewer workers)
```

## 12. Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                           │
└─────────────────────────────────────────────────────────────┘

LAYER 1: AUTHENTICATION
┌──────────────┐
│ JWT Tokens   │
│ OAuth2       │
│ API Keys     │
└──────┬───────┘
       │
       ▼
LAYER 2: AUTHORIZATION
┌──────────────┐
│ User owns    │
│ job?         │
│ Role-based   │
│ access       │
└──────┬───────┘
       │
       ▼
LAYER 3: VALIDATION
┌──────────────┐
│ File size    │
│ File type    │
│ Magic numbers│
└──────┬───────┘
       │
       ▼
LAYER 4: SCANNING
┌──────────────┐
│ Virus scan   │
│ (Async)      │
│ Content check│
└──────┬───────┘
       │
       ▼
LAYER 5: ENCRYPTION
┌──────────────┐
│ TLS in transit│
│ Encryption    │
│ at rest      │
└──────────────┘
```

---

## Key Visualizations Summary

1. **System Architecture**: Overall system structure
2. **Upload Flow**: Step-by-step upload process
3. **Processing Pipeline**: Time breakdown for each phase
4. **Queue Architecture**: Message queue structure
5. **Worker Flow**: Detailed worker processing
6. **Failure Handling**: Retry and DLQ logic
7. **Scaling**: Horizontal scaling approach
8. **Data Flow**: Data movement through system
9. **Monitoring**: Dashboard view
10. **Error Recovery**: Crash recovery process
11. **Cost Optimization**: Storage and compute costs
12. **Security**: Multi-layer security

