# Task Idempotency and Deduplication: Preventing Duplicate Processing

Idempotency ensures tasks can be safely retried without side effects. Deduplication prevents processing the same task multiple times. This guide covers implementing idempotency in Express.js background jobs.

## What is Idempotency?

**Idempotency** means performing an operation multiple times has the same effect as performing it once.

```javascript
// Idempotent: Safe to retry
await updateUserStatus(userId, 'active');
await updateUserStatus(userId, 'active');  // Same result

// Non-idempotent: Not safe to retry
await sendEmail(userId, 'Welcome!');
await sendEmail(userId, 'Welcome!');  // Sends twice!
```

## Implementing Idempotency

### Pattern 1: Idempotency Keys

```javascript
const Queue = require('bull');
const emailQueue = new Queue('emails', {
    redis: { host: 'localhost', port: 6379 }
});

// Add job with idempotency key
async function sendWelcomeEmail(userId, email) {
    const idempotencyKey = `welcome-email:${userId}`;
    
    // Check if already processed
    const existing = await redis.get(idempotencyKey);
    if (existing) {
        console.log('Email already sent, skipping');
        return;
    }
    
    // Add job with idempotency key
    await emailQueue.add('send-welcome-email', {
        userId,
        email
    }, {
        jobId: idempotencyKey  // Use as job ID
    });
}

// Process job
emailQueue.process('send-welcome-email', async (job) => {
    const { userId, email } = job.data;
    
    // Check again (race condition protection)
    const idempotencyKey = `welcome-email:${userId}`;
    const existing = await redis.get(idempotencyKey);
    if (existing) {
        return;  // Already processed
    }
    
    // Mark as processing
    await redis.setEx(idempotencyKey, 3600, 'processing');
    
    try {
        await sendEmail(email, 'Welcome!');
        
        // Mark as completed
        await redis.setEx(idempotencyKey, 86400, 'completed');
    } catch (error) {
        // Remove on failure (allow retry)
        await redis.del(idempotencyKey);
        throw error;
    }
});
```

### Pattern 2: Database Upsert

```javascript
// Idempotent user creation
async function createUserIfNotExists(userData) {
    const [user, created] = await User.findOrCreate({
        where: { email: userData.email },
        defaults: userData
    });
    
    return user;  // Always returns same user
}
```

### Pattern 3: Check Before Execute

```javascript
// Check before sending email
emailQueue.process('send-email', async (job) => {
    const { userId, emailType } = job.data;
    
    // Check if already sent
    const sent = await EmailLog.findOne({
        where: {
            user_id: userId,
            email_type: emailType
        }
    });
    
    if (sent) {
        console.log('Email already sent, skipping');
        return;
    }
    
    // Send email
    await sendEmail(userId, emailType);
    
    // Log
    await EmailLog.create({
        user_id: userId,
        email_type: emailType,
        sent_at: new Date()
    });
});
```

## Deduplication

### Redis-Based Deduplication

```javascript
// Deduplicate using Redis
async function addJobWithDeduplication(queue, jobName, data, ttl = 3600) {
    const dedupeKey = `${jobName}:${JSON.stringify(data)}`;
    const hash = require('crypto').createHash('md5').update(dedupeKey).digest('hex');
    
    // Check if duplicate
    const exists = await redis.set(`dedupe:${hash}`, '1', {
        EX: ttl,
        NX: true  // Only set if not exists
    });
    
    if (!exists) {
        console.log('Duplicate job, skipping');
        return null;
    }
    
    // Add job
    return await queue.add(jobName, data);
}
```

## Real-World Examples

### Example 1: Payment Processing

```javascript
// Idempotent payment processing
paymentQueue.process('process-payment', async (job) => {
    const { orderId, amount, paymentId } = job.data;
    
    // Check if already processed
    const existing = await Payment.findOne({
        where: { payment_id: paymentId }
    });
    
    if (existing) {
        return existing;  // Already processed
    }
    
    // Process payment (idempotent operation)
    const payment = await Payment.create({
        order_id: orderId,
        amount,
        payment_id: paymentId,
        status: 'processing'
    });
    
    // Charge payment (idempotent API call)
    const result = await chargePayment(paymentId, amount);
    
    // Update status
    payment.status = result.success ? 'completed' : 'failed';
    await payment.save();
    
    return payment;
});
```

### Example 2: Data Synchronization

```javascript
// Idempotent data sync
syncQueue.process('sync-data', async (job) => {
    const { sourceId, lastSyncTime } = job.data;
    
    // Get changes since last sync
    const changes = await getChangesSince(sourceId, lastSyncTime);
    
    // Upsert changes (idempotent)
    for (const change of changes) {
        await DataRecord.upsert({
            id: change.id,
            source_id: sourceId,
            data: change.data,
            updated_at: change.updated_at
        });
    }
    
    // Update last sync time
    await updateLastSyncTime(sourceId, Date.now());
});
```

## Best Practices

1. **Use Idempotency Keys**: Unique keys for operations
2. **Check Before Execute**: Verify not already processed
3. **Database Upserts**: Use upsert for idempotent writes
4. **Log Operations**: Track processed operations
5. **Handle Race Conditions**: Use locks or transactions

## Summary

**Task Idempotency and Deduplication:**

1. **Purpose**: Prevent duplicate processing
2. **Patterns**: Idempotency keys, upserts, check-before-execute
3. **Implementation**: Redis, database checks
4. **Best Practice**: Use idempotency keys, check before execute
5. **Benefits**: Safe retries, no duplicate side effects

**Key Takeaway:**
Idempotency ensures tasks can be safely retried without side effects. Use idempotency keys, check before executing, and use database upserts for idempotent operations. Implement deduplication to prevent processing the same task multiple times. Handle race conditions with locks or transactions.

**Idempotency Strategy:**
- Use idempotency keys
- Check before execute
- Use upserts
- Log operations
- Handle race conditions

**Next Steps:**
- Learn [Retry Patterns](retry_with_exponential_backoff.md) for error handling
- Study [Monitoring](monitoring_task_queues.md) for observability
- Master [Bull Queue](02_bull_queue_mastery.md) for implementation

