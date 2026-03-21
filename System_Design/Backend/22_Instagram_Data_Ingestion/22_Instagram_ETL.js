/**
 * Instagram Data Ingestion (ETL) Pipeline Implementation
 * 
 * Features:
 * - Distributed Job Processing (BullMQ)
 * - Rate-Limited API Interaction
 * - Batch Database Writes (MongoDB)
 * - Scalable Worker Cluster Architecture
 */

const { Queue, Worker, QueueScheduler } = require('bullmq');
const axios = require('axios');
const mongoose = require('mongoose');
const Redis = require('ioredis');

// --- Configuration & Setup ---
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/influencer_analytics';
const IG_API_VERSION = 'v19.0';
const IG_BASE_URL = `https://graph.facebook.com/${IG_API_VERSION}`;

const redisConn = new Redis(REDIS_URL);

// --- MongoDB Schema ---
const mediaSchema = new mongoose.Schema({
    igId: { type: String, unique: true, index: true },
    ownerId: { type: String, index: true },
    mediaType: String,
    caption: String,
    metrics: {
        likes: Number,
        comments: Number,
        views: { type: Number, default: 0 },
        saves: { type: Number, default: 0 }
    },
    publishedAt: Date,
    lastFetchedAt: { type: Date, default: Date.now }
});

const Media = mongoose.model('Media', mediaSchema);

// --- Ingestion Pipeline Worker ---
class IngestionWorker {
    constructor(queueName = 'instagram-ingestion') {
        this.worker = new Worker(queueName, this.processIngestion.bind(this), {
            connection: redisConn,
            concurrency: 10, // Process 10 influencer syncs concurrently
            limiter: {
                max: 100, // Max 100 jobs
                duration: 60000 // per minute (Global rate limit across all workers)
            }
        });

        this.worker.on('completed', job => console.log(`Job ${job.id} completed.`));
        this.worker.on('failed', (job, err) => console.error(`Job ${job.id} failed: ${err.message}`));
    }

    /**
     * Main ETL Process for a single Influencer
     */
    async processIngestion(job) {
        const { influencerId, accessToken } = job.data;

        try {
            // 1. EXTRACT: Fetch recent media items
            const mediaList = await this.getRecentMedia(influencerId, accessToken);

            // 2. TRANSFORM: Enrich with metrics and normalize
            const enrichedData = await Promise.all(
                mediaList.map(item => this.getMediaDetails(item.id, accessToken))
            );

            // 3. LOAD: Bulk Upsert into MongoDB
            await this.saveToDatabase(influencerId, enrichedData);

            return { status: 'success', count: enrichedData.length };
        } catch (error) {
            if (error.response && error.response.status === 429) {
                // Specific handling for rate limiting - retry with delay
                console.warn(`Rate limit hit for ${influencerId}. Retrying...`);
                throw new Error('RATE_LIMIT_EXCEEDED');
            }
            throw error;
        }
    }

    async getRecentMedia(influencerId, token) {
        const url = `${IG_BASE_URL}/${influencerId}/media`;
        const response = await axios.get(url, {
            params: { access_token: token, limit: 20 }
        });
        return response.data.data || [];
    }

    async getMediaDetails(mediaId, token) {
        const fields = 'id,media_type,caption,timestamp,like_count,comments_count,insights.metric(video_views,saves)';
        const response = await axios.get(`${IG_BASE_URL}/${mediaId}`, {
            params: { fields, access_token: token }
        });

        const data = response.data;
        // Transform the nested insights array into flat metrics
        const metrics = {
            likes: data.like_count || 0,
            comments: data.comments_count || 0,
            views: 0,
            saves: 0
        };

        if (data.insights && data.insights.data) {
            data.insights.data.forEach(m => {
                if (m.name === 'video_views') metrics.views = m.values[0].value;
                if (m.name === 'saves') metrics.saves = m.values[0].value;
            });
        }

        return {
            igId: data.id,
            mediaType: data.media_type,
            caption: data.caption,
            publishedAt: new Date(data.timestamp),
            metrics
        };
    }

    async saveToDatabase(influencerId, items) {
        const operations = items.map(item => ({
            updateOne: {
                filter: { igId: item.igId },
                update: {
                    $set: {
                        ...item,
                        ownerId: influencerId,
                        lastFetchedAt: new Date()
                    }
                },
                upsert: true
            }
        }));

        if (operations.length > 0) {
            await Media.bulkWrite(operations);
        }
    }
}

// --- Scheduler / Producer ---
const ingestionQueue = new Queue('instagram-ingestion', { connection: redisConn });

/**
 * Trigger sync for a list of influencers
 */
async function addSyncJobs(influencers) {
    const jobs = influencers.map(inf => ({
        name: 'sync-influencer',
        data: { influencerId: inf.id, accessToken: inf.token },
        opts: {
            attempts: 5,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: true
        }
    }));

    await ingestionQueue.addBulk(jobs);
    console.log(`Added ${jobs.length} jobs to queue.`);
}

// --- Initialize ---
async function startSystem() {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    new IngestionWorker();
    console.log('Worker cluster active');
}

// Example usage
if (require.main === module) {
    startSystem().catch(console.error);
}

module.exports = { IngestionWorker, addSyncJobs };
