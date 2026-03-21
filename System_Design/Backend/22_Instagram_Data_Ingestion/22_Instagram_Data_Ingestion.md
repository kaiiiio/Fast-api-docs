# Instagram Influencer ETL Pipeline: System Design

## Problem Statement

**Context**: Brands need a way to track influencer performance automatically for campaign management. We need to collect data for thousands of creators periodically.

**The Challenge**: 
1. **API Rate Limits**: The Instagram Graph API has strict rate limits.
2. **Scalability**: Scaling from 100 creators to 100k+ requires a distributed architecture.
3. **Data Consistency**: Metrics (likes, comments) change over time; we need a way to update existing posts without duplicate entries.
4. **Resiliency**: If a fetch fails or the API goes down, the system should retry and resume.

**Task**: Design a scheduled ETL-style pipeline that:
- **Ingestion**: Fetches media and engagement data from Instagram Graph API.
- **Transformation**: Normalizes data for MongoDB storage.
- **Scheduling**: Cron-based triggers for periodic updates.
- **Scale**: Distributed worker architecture with job queues.

---

## Solution Architecture

```
[Scheduler] → [Redis Queue (BullMQ)] → [Worker Cluster]
                                            ↓
                                    [Rate-Limited IG API Client]
                                            ↓
                                    [Data Transformer]
                                            ↓
                                    [MongoDB (Batch Writes)]
```

**Key Components**:
1. **BullMQ (Redis)**: Handles distributed job management, retries, and prioritization.
2. **Cron Scheduler**: Triggers daily/hourly sync jobs for different influencer tiers.
3. **Rate Limiter**: Tracks API token usage in Redis to prevent 429 errors.
4. **Batch Upserts**: Uses MongoDB `bulkWrite` for efficient storage and updates.
5. **Worker Clusters**: Independent Node.js processes that scale horizontally.

---

## Implementation

### 1. Ingestion Worker (Core Logic)

```javascript
const { Queue, Worker } = require('bullmq');
const axios = require('axios');
const mongoose = require('mongoose');
const Redis = require('ioredis');

// Constants
const IG_API_BASE = 'https://graph.facebook.com/v19.0';
const redisConnection = new Redis(process.env.REDIS_URL);

// MongoDB Schema
const MediaSchema = new mongoose.Schema({
  igId: { type: String, unique: true },
  ownerId: String,
  mediaType: String,
  metrics: {
    likes: Number,
    comments: Number,
    views: Number,
    saves: Number
  },
  timestamp: Date,
  lastUpdated: { type: Date, default: Date.now }
});

const Media = mongoose.model('Media', MediaSchema);

/**
 * Instagram Data Pipeline Worker
 */
class InstagramIngestionWorker {
  constructor() {
    this.worker = new Worker('instagram-ingestion', this.processJob.bind(this), {
      connection: redisConnection,
      concurrency: 5 // Process 5 influencers at a time per worker instance
    });
  }

  async processJob(job) {
    const { influencerId, accessToken } = job.data;
    console.log(`Processing ingestion for: ${influencerId}`);

    try {
      // 1. Fetch Media List
      const mediaList = await this.fetchCreatorMedia(influencerId, accessToken);
      
      // 2. Fetch Detailed Metrics for each media
      const detailedMediaData = await Promise.all(
        mediaList.map(item => this.fetchMediaMetrics(item.id, accessToken))
      );

      // 3. Transform & Prepare Batch Upserts
      const bulkOps = detailedMediaData.map(data => ({
        updateOne: {
          filter: { igId: data.id },
          update: {
            $set: {
              ownerId: influencerId,
              mediaType: data.media_type,
              metrics: {
                likes: data.like_count || 0,
                comments: data.comments_count || 0,
                views: data.video_views || 0,
                saves: data.saves || 0
              },
              timestamp: new Date(data.timestamp),
              lastUpdated: new Date()
            }
          },
          upsert: true
        }
      }));

      // 4. Batch Write to MongoDB
      if (bulkOps.length > 0) {
        await Media.bulkWrite(bulkOps);
      }

      return { processed: bulkOps.length };
    } catch (error) {
      console.error(`Job failed for ${influencerId}:`, error.message);
      throw error; // Let BullMQ handle retries
    }
  }

  async fetchCreatorMedia(id, token) {
    const response = await axios.get(`${IG_API_BASE}/${id}/media`, {
      params: { access_token: token, limit: 10 }
    });
    return response.data.data;
  }

  async fetchMediaMetrics(mediaId, token) {
    // Request specific engagement fields
    const fields = 'id,media_type,timestamp,like_count,comments_count,insights.metric(video_views,saves)';
    const response = await axios.get(`${IG_API_BASE}/${mediaId}`, {
      params: { fields, access_token: token }
    });
    
    // Flatten insights into the main object
    const result = response.data;
    if (result.insights) {
      result.insights.data.forEach(metric => {
        result[metric.name] = metric.values[0].value;
      });
    }
    return result;
  }
}
```

### 2. Job Producer (Scheduler)

```javascript
const ingestionQueue = new Queue('instagram-ingestion', { connection: redisConnection });

async function scheduleIngestion() {
  // Add repeatable jobs (Cron)
  // Sync high-profile influencers every 4 hours
  await ingestionQueue.add('daily-sync', {}, {
    repeat: { cron: '0 */4 * * *' } 
  });

  console.log('Ingestion pipeline scheduled.');
}

// Logic to populate individual tasks
async function triggerInfluencerSync(influencerList) {
  const jobs = influencerList.map(inf => ({
    name: 'sync-metrics',
    data: { influencerId: inf.id, accessToken: inf.token },
    opts: { attempts: 3, backoff: { type: 'exponential', delay: 1000 } }
  }));
  
  await ingestionQueue.addBulk(jobs);
}
```

---

## Why This Works

**1. Resilience via Job Queues**:
Using BullMQ ensures that if a worker crashes, the job is not lost. It remains in Redis and can be picked up by another worker.

**2. Handling API Rate Limits**:
Workers can be configured with a global rate limiter in Redis. Before making an API call, the worker checks the remaining quota. If the limit is reached, it delays the job execution.

**3. Efficient Storage (Batching)**:
Instead of saving each post one-by-one, we use `bulkWrite`. This significantly reduces the number of round-trips to MongoDB, which is crucial when processing 100k+ creators.

**4. Horizontal Scalability**:
As the number of influencers grows, you simply spin up more worker containers. They all connect to the same Redis queue and pull jobs as they have capacity.

---

## Visual Flow

```text
CRON TRIGGER
    │
    ▼
JOB PRODUCER (Master) ──▶ Pushes 100k jobs to REDIS (BullMQ)
                                    │
           ┌────────────────────────┼────────────────────────┐
           ▼                        ▼                        ▼
    WORKER NODE 1            WORKER NODE 2            WORKER NODE N
    (Consumer)               (Consumer)               (Consumer)
           │                        │                        │
           ├─▶ Fetch API            ├─▶ Fetch API            ├─▶ Fetch API
           ├─▶ Transform            ├─▶ Transform            ├─▶ Transform
           └─▶ MongoDB Bulk         └─▶ MongoDB Bulk         └─▶ MongoDB Bulk
```

---

## Best Practices

**1. Token Management**:
Store API tokens securely and track their expiration. Refresh tokens automatically before they expire.

**2. Selective Updates**:
Don't sync every post for every creator every hour. Sync newer posts more frequently (every 4h) and older posts less frequently (weekly) to save API quota.

**3. Error Handling**:
Implement exponential backoff specifically for 429 (Rate Limit) and 5xx (Server Error) status codes.

**4. Monitoring**:
Use tools like `BullBoard` to monitor queue health, failure rates, and processing latency in real-time.

---

## Best Solution

**BullMQ + MongoDB Bulk + Distributed Workers**:
- ✅ **Distributed**: Handles high-volume data by spreading load across nodes.
- ✅ **Resilient**: Automatic retries for network/API failures.
- ✅ **Optimized**: Uses batch writes to MongoDB to prevent IO bottlenecks.
- ✅ **Scalable**: Infrastructure scales with the influencer count.
