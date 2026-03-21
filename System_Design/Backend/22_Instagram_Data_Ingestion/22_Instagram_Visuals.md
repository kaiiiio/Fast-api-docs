# Instagram ETL Pipeline: Visuals & Architecture

## System High-Level Architecture

```mermaid
graph TD
    A[Cron Scheduler] -->|Trigger Sync| B(Job Producer)
    B -->|Enqueue Jobs| C{Redis / BullMQ}
    
    subgraph Worker Cluster
        D[Worker 1]
        E[Worker 2]
        F[Worker N]
    end
    
    C --> D
    C --> E
    C --> F
    
    subgraph External APIs
        G[Instagram Graph API]
    end
    
    D -->|GET /media| G
    E -->|GET /media| G
    F -->|GET /media| G
    
    subgraph Storage
        H[(MongoDB)]
        I[(Redis Cache)]
    end
    
    D -->|Bulk Upsert| H
    E -->|Bulk Upsert| H
    F -->|Bulk Upsert| H
    
    D -.->|Check Rate Limit| I
    E -.->|Check Rate Limit| I
    F -.->|Check Rate Limit| I
```

## Data Transformation Flow

```mermaid
sequenceDiagram
    participant W as Worker
    participant IG as Instagram API
    participant T as Transformer
    participant DB as MongoDB

    W->>IG: Fetch Media List (Influencer ID)
    IG-->>W: [Media IDs, Timestamps]
    
    loop For each Media
        W->>IG: Fetch Specific Metrics (likes, comments, etc)
        IG-->>W: Raw JSON Metrics
    end
    
    W->>T: Clean & Map Data
    Note right of T: Normalizes field names & handles nested insights
    T-->>W: Validated Media Objects
    
    W->>DB: mongo.bulkWrite(upsert: true)
    DB-->>W: Write Result (Success/Failure)
```

## Scalability Strategy (100k+ Influencers)

| Feature | Large Scale Handling |
| :--- | :--- |
| **API Throttling** | Distributed rate limiting via Redis (`rate-limiter-flexible`). |
| **Job Chunks** | Splitting 100k influencers into smaller batches (e.g., 500 per job). |
| **Worker Pools** | Deploying workers as K8s pods that auto-scale based on queue length. |
| **Database Throughput** | Using Sharded MongoDB or Indexed collections on `igId` and `ownerId`. |
| **Failure Recovery** | Using BullMQ dead-letter queues (DLQ) for manual inspection of repeated failures. |
