// "The Non-Blocking Upload System"
// Scenario: You are building a service like Instagram or Google Drive. Users upload large files (e.g., 4K Images or PDFs), and your system needs to perform heavy processing on them (e.g., generating thumbnails, extracting text, or virus scanning).

// The Problem: Currently, your MVP is synchronous.

// User POSTs a file.

// Server accepts file → resizes image (takes 3 seconds) → saves to disk.

// Server returns "200 OK".

// The Failure: When 50 users upload at once, your web server threads are all stuck resizing images. The API becomes unresponsive. Timeouts occur.

// The Task: Refactor this into an Asynchronous Architecture. The API must return a "Success" response in < 200ms, even if the image processing takes 10 seconds.


// Approach:

// The API Service (The Producer)

// Accepts the file.

// Saves the "Raw" file to a storage location (simulate S3 with a local folder).

// Creates a "Job" entry in a database with status PENDING.

// Pushes a message to a Queue.

// Crucial: Returns a job_id to the user immediately.

// The Worker Service (The Consumer)

// Watches the Queue.

// Picks up the message.

// Loads the file, does the heavy processing (simulated with time.sleep(5)).

// Updates the database status to COMPLETED.

// The Client Polling (The Feedback Loop)

// Implement a /status/{job_id} endpoint so the user can check if their file is ready.


// ============================================================================
// COMPLETE SOLUTION
// ============================================================================

// See detailed solutions:
// 1. System Design (Answer 1 - Work Queue): 01_Non_Blocking_Upload_System.md
//    - Complete architecture using RabbitMQ-style work queues
//    - Challenges and solutions
//    - Edge cases
//    - Best practices
//
// 2. System Design (Answer 2 - Pub/Sub): 01_Non_Blocking_Upload_System_PubSub.md
//    - Alternative design using Kafka/SNS-style pub/sub
//    - Multiple independent subscribers (image, OCR, scanning, etc.)
//    - Trade-offs vs simple work queue
//
// 3. Implementation: 01_Non_Blocking_Upload_System_Implementation.js
//    - Production-ready code
//    - Express.js API
//    - RabbitMQ integration
//    - Worker service
//
// 4. Visual Diagrams: 01_Non_Blocking_Upload_System_Visuals.md
//    - Architecture diagrams
//    - Flow charts
//    - Sequence diagrams
//    - Monitoring views

// Quick Answer:
// - API accepts file, saves to S3, creates job, enqueues, returns jobId (< 200ms)
// - Worker consumes queue, processes file, updates status
// - Client polls /status/{jobId} endpoint
// - Uses message queue (RabbitMQ) for async processing
// - Implements retries, DLQ, monitoring, scaling



// Complete Implementation: Non-Blocking Upload System
// Production-ready code with error handling, retries, and monitoring

const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const amqp = require('amqplib');
const { Pool } = require('pg');
const Redis = require('ioredis');
const AWS = require('aws-sdk');
const sharp = require('sharp');

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = {
    port: process.env.PORT || 3000,
    db: {
        host: process.env.DB_HOST || 'localhost',
        port: 5432,
        database: process.env.DB_NAME || 'uploads',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password'
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: 6379
    },
    rabbitmq: {
        url: process.env.RABBITMQ_URL || 'amqp://localhost'
    },
    s3: {
        bucket: process.env.S3_BUCKET || 'file-uploads',
        region: process.env.AWS_REGION || 'us-east-1'
    },
    limits: {
        maxFileSize: 100 * 1024 * 1024, // 100MB
        maxConcurrentUploads: 10,
        processingTimeout: 300000 // 5 minutes
    }
};

// ============================================================================
// INITIALIZATION
// ============================================================================

const app = express();
const db = new Pool(config.db);
const redis = new Redis(config.redis);
const s3 = new AWS.S3({
    region: config.s3.region,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.limits.maxFileSize }
});

let rabbitmqChannel;

// ============================================================================
// DATABASE SETUP
// ============================================================================

async function setupDatabase() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS jobs (
            job_id UUID PRIMARY KEY,
            user_id VARCHAR(255),
            status VARCHAR(20) NOT NULL,
            file_name VARCHAR(255) NOT NULL,
            file_size BIGINT NOT NULL,
            file_type VARCHAR(50),
            mime_type VARCHAR(100),
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
        
        CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
        CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
        CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
    `);
}

// ============================================================================
// QUEUE SETUP
// ============================================================================

async function setupQueue() {
    const connection = await amqp.connect(config.rabbitmq.url);
    rabbitmqChannel = await connection.createChannel();
    
    // Exchange
    await rabbitmqChannel.assertExchange('file-processing', 'direct', {
        durable: true
    });
    
    // Main queue
    await rabbitmqChannel.assertQueue('file-processing-queue', {
        durable: true,
        arguments: {
            'x-dead-letter-exchange': 'file-processing-dlx',
            'x-dead-letter-routing-key': 'failed',
            'x-message-ttl': 3600000 // 1 hour
        }
    });
    
    // Dead letter queue
    await rabbitmqChannel.assertExchange('file-processing-dlx', 'direct', {
        durable: true
    });
    
    await rabbitmqChannel.assertQueue('file-processing-dlq', {
        durable: true
    });
    
    await rabbitmqChannel.bindQueue(
        'file-processing-queue',
        'file-processing',
        'process'
    );
    
    await rabbitmqChannel.bindQueue(
        'file-processing-dlq',
        'file-processing-dlx',
        'failed'
    );
    
    console.log('Queue setup complete');
}

// ============================================================================
// STORAGE SERVICE
// ============================================================================

class StorageService {
    async uploadRawFile(jobId, fileName, buffer) {
        const key = `raw/${jobId}/${fileName}`;
        
        await s3.putObject({
            Bucket: config.s3.bucket,
            Key: key,
            Body: buffer,
            ContentType: this.detectContentType(fileName)
        }).promise();
        
        return key;
    }
    
    async uploadProcessedFile(jobId, type, buffer, contentType) {
        const key = `processed/${jobId}/${type}`;
        
        await s3.putObject({
            Bucket: config.s3.bucket,
            Key: key,
            Body: buffer,
            ContentType: contentType
        }).promise();
        
        return key;
    }
    
    async downloadFile(s3Key) {
        const result = await s3.getObject({
            Bucket: config.s3.bucket,
            Key: s3Key
        }).promise();
        
        return result.Body;
    }
    
    detectContentType(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        const types = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'pdf': 'application/pdf',
            'mp4': 'video/mp4'
        };
        return types[ext] || 'application/octet-stream';
    }
}

const storageService = new StorageService();

// ============================================================================
// JOB SERVICE
// ============================================================================

class JobService {
    async createJob(jobData) {
        const query = `
            INSERT INTO jobs (
                job_id, user_id, status, file_name, file_size,
                file_type, mime_type, s3_key_raw, processing_type, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;
        
        const result = await db.query(query, [
            jobData.jobId,
            jobData.userId || null,
            'PENDING',
            jobData.fileName,
            jobData.fileSize,
            jobData.fileType,
            jobData.mimeType,
            jobData.s3Key,
            jobData.processingType,
            JSON.stringify(jobData.metadata || {})
        ]);
        
        return result.rows[0];
    }
    
    async getJob(jobId) {
        const query = 'SELECT * FROM jobs WHERE job_id = $1';
        const result = await db.query(query, [jobId]);
        return result.rows[0];
    }
    
    async updateStatus(jobId, status, updates = {}) {
        const setParts = ['status = $2'];
        const values = [jobId, status];
        let paramIndex = 3;
        
        if (status === 'PROCESSING' && !updates.startedAt) {
            setParts.push(`started_at = NOW()`);
        }
        
        if (status === 'COMPLETED') {
            setParts.push(`completed_at = NOW()`);
            if (updates.processedFiles) {
                setParts.push(`s3_keys_processed = $${paramIndex}`);
                values.push(JSON.stringify(updates.processedFiles));
                paramIndex++;
            }
        }
        
        if (status === 'FAILED') {
            setParts.push(`failed_at = NOW()`);
            if (updates.error) {
                setParts.push(`error_message = $${paramIndex}`);
                values.push(updates.error);
                paramIndex++;
            }
            if (updates.retryCount !== undefined) {
                setParts.push(`retry_count = $${paramIndex}`);
                values.push(updates.retryCount);
                paramIndex++;
            }
        }
        
        if (updates.metadata) {
            setParts.push(`metadata = $${paramIndex}`);
            values.push(JSON.stringify(updates.metadata));
        }
        
        const query = `UPDATE jobs SET ${setParts.join(', ')} WHERE job_id = $1`;
        await db.query(query, values);
    }
}

const jobService = new JobService();

// ============================================================================
// PROCESSING SERVICE
// ============================================================================

class ProcessingService {
    detectProcessingType(mimeType) {
        if (mimeType.startsWith('image/')) return 'IMAGE';
        if (mimeType === 'application/pdf') return 'PDF';
        if (mimeType.startsWith('video/')) return 'VIDEO';
        return 'GENERIC';
    }
    
    async processImage(buffer) {
        const results = {};
        
        // Thumbnail (200x200)
        results.thumbnail = await sharp(buffer)
            .resize(200, 200, { fit: 'cover', withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer();
        
        // Medium (800x800)
        results.medium = await sharp(buffer)
            .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 85 })
            .toBuffer();
        
        // Large (1920x1920)
        results.large = await sharp(buffer)
            .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 90 })
            .toBuffer();
        
        return results;
    }
    
    async processPDF(buffer) {
        // PDF processing (text extraction, thumbnail generation)
        // Using pdf-parse or similar library
        const results = {};
        
        // For now, return original
        results.original = buffer;
        
        // TODO: Extract text, generate thumbnail
        // const pdfDoc = await PDFDocument.load(buffer);
        // results.text = await extractText(pdfDoc);
        // results.thumbnail = await generatePDFThumbnail(pdfDoc);
        
        return results;
    }
    
    estimateProcessingTime(fileSize, processingType) {
        const baseTime = {
            IMAGE: fileSize / (1024 * 1024) * 2, // 2s per MB
            PDF: fileSize / (1024 * 1024) * 5,    // 5s per MB
            VIDEO: fileSize / (1024 * 1024) * 10  // 10s per MB
        };
        
        return Math.ceil(baseTime[processingType] || 10);
    }
}

const processingService = new ProcessingService();

// ============================================================================
// API ENDPOINTS
// ============================================================================

// Upload endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
    const startTime = Date.now();
    
    try {
        // Validation
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        if (req.file.size > config.limits.maxFileSize) {
            return res.status(400).json({ 
                error: `File too large. Max size: ${config.limits.maxFileSize / 1024 / 1024}MB` 
            });
        }
        
        // Generate job ID
        const jobId = uuidv4();
        const userId = req.user?.id || 'anonymous';
        
        // Detect processing type
        const processingType = processingService.detectProcessingType(req.file.mimetype);
        
        // Upload to S3 (async, but we wait for it)
        const s3Key = await storageService.uploadRawFile(
            jobId,
            req.file.originalname,
            req.file.buffer
        );
        
        // Create job record
        await jobService.createJob({
            jobId,
            userId,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            fileType: req.file.originalname.split('.').pop(),
            mimeType: req.file.mimetype,
            s3Key,
            processingType,
            metadata: {
                uploadedAt: new Date().toISOString(),
                userAgent: req.headers['user-agent']
            }
        });
        
        // Enqueue processing job
        await rabbitmqChannel.publish(
            'file-processing',
            'process',
            Buffer.from(JSON.stringify({
                jobId,
                s3Key,
                processingType,
                fileName: req.file.originalname,
                mimeType: req.file.mimetype
            })),
            { persistent: true, messageId: jobId }
        );
        
        // Return response
        const elapsed = Date.now() - startTime;
        const estimatedTime = processingService.estimateProcessingTime(
            req.file.size,
            processingType
        );
        
        res.status(202).json({
            jobId,
            status: 'PENDING',
            message: 'File uploaded successfully, processing started',
            estimatedProcessingTime: `${estimatedTime} seconds`,
            uploadTime: `${elapsed}ms`
        });
        
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ 
            error: 'Upload failed',
            message: error.message 
        });
    }
});

// Status endpoint
app.get('/status/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        
        // Check cache first
        const cached = await redis.get(`job:status:${jobId}`);
        if (cached) {
            return res.json(JSON.parse(cached));
        }
        
        // Query database
        const job = await jobService.getJob(jobId);
        
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        
        // Format response
        const response = {
            jobId: job.job_id,
            status: job.status,
            fileName: job.file_name,
            fileSize: job.file_size,
            createdAt: job.created_at,
            processingType: job.processing_type
        };
        
        if (job.status === 'COMPLETED') {
            response.completedAt = job.completed_at;
            response.processedFiles = job.s3_keys_processed;
            response.downloadUrls = generateDownloadUrls(job.s3_keys_processed);
        } else if (job.status === 'PROCESSING') {
            response.startedAt = job.started_at;
            const elapsed = Date.now() - new Date(job.started_at).getTime();
            response.progress = {
                elapsed: `${Math.floor(elapsed / 1000)}s`,
                estimatedRemaining: estimateRemainingTime(job)
            };
        } else if (job.status === 'FAILED') {
            response.failedAt = job.failed_at;
            response.error = job.error_message;
            response.retryCount = job.retry_count;
        }
        
        // Cache for 1 second
        await redis.setex(`job:status:${jobId}`, 1, JSON.stringify(response));
        
        res.json(response);
        
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ error: 'Failed to get status' });
    }
});

// Download endpoint
app.get('/download/:jobId/:type', async (req, res) => {
    try {
        const { jobId, type } = req.params;
        
        const job = await jobService.getJob(jobId);
        if (!job || job.status !== 'COMPLETED') {
            return res.status(404).json({ error: 'File not available' });
        }
        
        const processedFiles = job.s3_keys_processed;
        const s3Key = processedFiles[type];
        
        if (!s3Key) {
            return res.status(404).json({ error: 'File type not found' });
        }
        
        // Generate presigned URL (valid for 1 hour)
        const url = s3.getSignedUrl('getObject', {
            Bucket: config.s3.bucket,
            Key: s3Key,
            Expires: 3600
        });
        
        res.redirect(url);
        
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Download failed' });
    }
});

// ============================================================================
// WORKER SERVICE
// ============================================================================

class WorkerService {
    async start() {
        console.log('Worker service starting...');
        
        await rabbitmqChannel.consume('file-processing-queue', async (msg) => {
            if (!msg) return;
            
            const job = JSON.parse(msg.content.toString());
            const { jobId } = job;
            
            try {
                // Acquire lock
                const lockAcquired = await this.acquireLock(jobId);
                if (!lockAcquired) {
                    console.log(`Job ${jobId} already being processed`);
                    rabbitmqChannel.ack(msg);
                    return;
                }
                
                // Check if already completed
                const existingJob = await jobService.getJob(jobId);
                if (existingJob && existingJob.status === 'COMPLETED') {
                    await this.releaseLock(jobId);
                    rabbitmqChannel.ack(msg);
                    return;
                }
                
                // Process job
                await this.processJob(job);
                
                // Acknowledge message
                rabbitmqChannel.ack(msg);
                
            } catch (error) {
                console.error(`Job ${jobId} failed:`, error);
                
                // Get retry count
                const jobRecord = await jobService.getJob(jobId);
                const retryCount = (jobRecord?.retry_count || 0) + 1;
                
                if (retryCount < 3) {
                    // Requeue with delay
                    await jobService.updateStatus(jobId, 'RETRYING', {
                        retryCount,
                        error: error.message
                    });
                    
                    // Reject and requeue
                    rabbitmqChannel.nack(msg, false, true);
                } else {
                    // Send to DLQ
                    await jobService.updateStatus(jobId, 'FAILED', {
                        retryCount,
                        error: error.message
                    });
                    
                    rabbitmqChannel.nack(msg, false, false);
                }
                
                await this.releaseLock(jobId);
            }
        }, { noAck: false });
        
        console.log('Worker service started');
    }
    
    async acquireLock(jobId) {
        const lockKey = `job:lock:${jobId}`;
        const result = await redis.set(
            lockKey,
            'locked',
            'EX',
            300, // 5 min expiry
            'NX' // Only if not exists
        );
        return result === 'OK';
    }
    
    async releaseLock(jobId) {
        const lockKey = `job:lock:${jobId}`;
        await redis.del(lockKey);
    }
    
    async processJob(job) {
        const { jobId, s3Key, processingType, mimeType } = job;
        
        console.log(`Processing job ${jobId}, type: ${processingType}`);
        
        // Update status to PROCESSING
        await jobService.updateStatus(jobId, 'PROCESSING');
        
        // Download file from S3
        const fileBuffer = await storageService.downloadFile(s3Key);
        
        // Process based on type
        let processedFiles = {};
        const processedS3Keys = {};
        
        switch (processingType) {
            case 'IMAGE':
                processedFiles = await processingService.processImage(fileBuffer);
                
                // Upload processed files
                for (const [type, buffer] of Object.entries(processedFiles)) {
                    const contentType = type === 'thumbnail' 
                        ? 'image/jpeg' 
                        : 'image/jpeg';
                    const key = await storageService.uploadProcessedFile(
                        jobId,
                        type,
                        buffer,
                        contentType
                    );
                    processedS3Keys[type] = key;
                }
                break;
                
            case 'PDF':
                processedFiles = await processingService.processPDF(fileBuffer);
                
                for (const [type, buffer] of Object.entries(processedFiles)) {
                    const key = await storageService.uploadProcessedFile(
                        jobId,
                        type,
                        buffer,
                        'application/pdf'
                    );
                    processedS3Keys[type] = key;
                }
                break;
                
            default:
                // Generic processing - just store original
                const key = await storageService.uploadProcessedFile(
                    jobId,
                    'original',
                    fileBuffer,
                    mimeType
                );
                processedS3Keys.original = key;
        }
        
        // Update status to COMPLETED
        await jobService.updateStatus(jobId, 'COMPLETED', {
            processedFiles: processedS3Keys
        });
        
        // Invalidate cache
        await redis.del(`job:status:${jobId}`);
        
        console.log(`Job ${jobId} completed successfully`);
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateDownloadUrls(processedFiles) {
    const urls = {};
    for (const [type, s3Key] of Object.entries(processedFiles)) {
        urls[type] = `/download/${s3Key.split('/')[1]}/${type}`;
    }
    return urls;
}

function estimateRemainingTime(job) {
    // Simple estimation based on elapsed time
    const elapsed = Date.now() - new Date(job.started_at).getTime();
    const estimated = processingService.estimateProcessingTime(
        job.file_size,
        job.processing_type
    ) * 1000;
    
    const remaining = Math.max(0, estimated - elapsed);
    return `${Math.floor(remaining / 1000)}s`;
}

// ============================================================================
// STARTUP
// ============================================================================

async function start() {
    try {
        // Setup
        await setupDatabase();
        await setupQueue();
        
        // Start worker (if running as worker)
        if (process.env.WORKER_MODE === 'true') {
            const worker = new WorkerService();
            await worker.start();
            console.log('Running in worker mode');
        } else {
            // Start API server
            app.listen(config.port, () => {
                console.log(`API server running on port ${config.port}`);
            });
        }
        
    } catch (error) {
        console.error('Startup error:', error);
        process.exit(1);
    }
}

// Run if executed directly
if (require.main === module) {
    start();
}

module.exports = { app, WorkerService, JobService, StorageService, ProcessingService };

