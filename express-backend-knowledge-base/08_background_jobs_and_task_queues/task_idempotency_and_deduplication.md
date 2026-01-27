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

---

## 🎯 Interview Questions: Task Idempotency and Deduplication

### Q1: What is the fundamental difference between "idempotency" and "deduplication" in the context of background job processing? Provide a clear conceptual explanation with examples.

**Answer:**

While often used interchangeably, idempotency and deduplication represent **different levels of the reliability stack**. Idempotency is an inherent design property of an operation that makes it safe to repeat, whereas deduplication is a tactical infrastructure check that physically prevents the second execution of a task, regardless of its underlying logic.

**Idempotency** is a property of an operation: performing it multiple times produces the same result as performing it once. It's about **operation semantics**—the operation itself is designed to be safe to retry.

**Deduplication** is a mechanism to prevent processing the same task multiple times. It's about **preventing duplicate execution**—ensuring a task runs only once even if it's submitted multiple times.

**Conceptual Difference:**

- **Idempotency**: "This operation is safe to retry" (operation design)
- **Deduplication**: "Don't process this task twice" (execution control)

**Example: Idempotent Operation**

```javascript
// Idempotent: UPDATE is safe to retry
await User.update(
    { status: 'active' },
    { where: { id: userId } }
);
// Calling multiple times: Same result (user.status = 'active')
```

**Example: Non-Idempotent Operation**

```javascript
// Non-idempotent: SEND EMAIL is NOT safe to retry
await sendEmail(userId, 'Welcome!');
// Calling multiple times: User receives multiple emails (side effect)
```

**Example: Deduplication**

```javascript
// Deduplication prevents processing same task twice
const jobId = `welcome-email:${userId}`;
if (await redis.exists(jobId)) {
    return;  // Already processed, skip
}
await emailQueue.add('send-email', data, { jobId });
```

**Visual Representation:**

```
Idempotency (Operation Property):
Operation: UPDATE user.status = 'active'
Call 1: user.status = 'active' ✓
Call 2: user.status = 'active' ✓ (same result)
Call 3: user.status = 'active' ✓ (same result)
→ Safe to retry, same outcome

Deduplication (Execution Control):
Task: Send welcome email to user123
Submit 1: Process → Email sent ✓
Submit 2: Skip (already processed) → No email
Submit 3: Skip (already processed) → No email
→ Prevents duplicate execution
```

**When to Use Each:**

- **Idempotency**: Design operations to be idempotent (use UPDATE instead of INSERT, use upserts)
- **Deduplication**: Use when operation is NOT idempotent (sending emails, charging payments, notifications)

**System Design Consideration**: Idempotency is a **design principle** (make operations safe to retry), while deduplication is an **implementation mechanism** (prevent duplicate execution). Both are essential for reliable distributed systems where retries and duplicate submissions are common.

---

### Q2: Explain the "check-before-execute" pattern for implementing idempotency in Express.js background jobs. What race conditions can occur, and how would you prevent them?

**Answer:**

The "check-before-execute" pattern is a **logic-level guard** that attempts to verify the state of the system before committing to a non-reversible action. However, without additional synchronization like database constraints or distributed locks, it remains vulnerable to race conditions where two workers might simultaneously believe they are the first to execute the task.

The **check-before-execute** pattern checks if an operation has already been performed before executing it. It's used when operations are not inherently idempotent (e.g., sending emails, charging payments).

**Basic Pattern:**

```javascript
emailQueue.process('send-email', async (job) => {
    const { userId, emailType } = job.data;
    
    // CHECK: Has this email already been sent?
    const sent = await EmailLog.findOne({
        where: { user_id: userId, email_type: emailType }
    });
    
    if (sent) {
        return;  // Already sent, skip (idempotent behavior)
    }
    
    // EXECUTE: Send email
    await sendEmail(userId, emailType);
    
    // LOG: Record that email was sent
    await EmailLog.create({
        user_id: userId,
        email_type: emailType,
        sent_at: new Date()
    });
});
```

**Race Condition Problem:**

When multiple workers process the same job simultaneously, both may pass the "check" before either completes the "execute," leading to duplicate execution.

**Race Condition Timeline:**

```
Time:  T1    T2    T3    T4
Worker1: CHECK → (no record) → EXECUTE → LOG
Worker2:        CHECK → (no record) → EXECUTE → LOG
                  ↑
            Both pass check!
            → Duplicate execution
```

**Prevention Strategies:**

1. **Database Unique Constraint**: Use database-level uniqueness to prevent duplicates
   ```javascript
   // EmailLog table has UNIQUE(user_id, email_type)
   try {
       await EmailLog.create({ user_id, email_type, sent_at });
       await sendEmail(userId, emailType);  // Only if insert succeeds
   } catch (error) {
       if (error.name === 'SequelizeUniqueConstraintError') {
           return;  // Already sent, skip
       }
       throw error;
   }
   ```

2. **Distributed Lock**: Use Redis lock to ensure only one worker processes
   ```javascript
   const lockKey = `lock:send-email:${userId}:${emailType}`;
   const lock = await redis.set(lockKey, 'locked', { EX: 30, NX: true });
   
   if (!lock) {
       return;  // Another worker is processing, skip
   }
   
   try {
       // Check and execute...
   } finally {
       await redis.del(lockKey);  // Release lock
   }
   ```

3. **Atomic Operation**: Use Redis SET with NX (only if not exists)
   ```javascript
   const idempotencyKey = `email:${userId}:${emailType}`;
   const set = await redis.set(idempotencyKey, 'processing', { EX: 3600, NX: true });
   
   if (!set) {
       return;  // Already processing or completed
   }
   
   try {
       await sendEmail(userId, emailType);
       await redis.set(idempotencyKey, 'completed', { EX: 3600 });
   } catch (error) {
       await redis.del(idempotencyKey);  // Allow retry on failure
       throw error;
   }
   ```

4. **Database Transaction with SELECT FOR UPDATE**: Lock row during check-execute
   ```javascript
   const transaction = await sequelize.transaction();
   try {
       const sent = await EmailLog.findOne({
           where: { user_id: userId, email_type: emailType },
           lock: transaction.LOCK.UPDATE,  // Lock row
           transaction
       });
       
       if (sent) {
           await transaction.rollback();
           return;
       }
       
       await sendEmail(userId, emailType);
       await EmailLog.create({ user_id, email_type, sent_at }, { transaction });
       await transaction.commit();
   } catch (error) {
       await transaction.rollback();
       throw error;
   }
   ```

**System Design Consideration**: Race conditions are inevitable in distributed systems with concurrent workers. Use **database constraints** (strongest guarantee), **distributed locks** (Redis), or **atomic operations** (Redis SET NX) to ensure only one execution succeeds. The choice depends on **consistency requirements** (strong: database, eventual: Redis) and **performance** (locks add latency).

---

### Q3: How do idempotency keys work in payment processing systems? Explain the flow from HTTP request to background job completion, including how idempotency is maintained across retries.

**Answer:**

Idempotency keys act as a **unique transaction identifier** that shields the payment gateway and your internal ledgers from duplicate charges. They create a reliable handshake where the client can confidently retry a timed-out request, and the server can safely return the original result instead of initiating a new, duplicate financial transaction.

**Idempotency keys** are unique identifiers provided by the client (or generated server-side) that ensure the same operation is not processed twice, even if the request is retried due to network failures or timeouts.

**Payment Processing Flow:**

```
HTTP Request → Idempotency Check → Process Payment → Store Result → Return Response
     ↓              ↓                    ↓              ↓              ↓
  Client      Redis/DB Check        Charge API      Cache Result   200/201
     ↓              ↓                    ↓              ↓              ↓
  Retry?      Already Processed?    External API    Idempotency    Same Response
     ↓              ↓                    ↓              ↓              ↓
  Same Key    Return Cached         Idempotent      Key → Result   Idempotent
```

**Detailed Flow:**

1. **Client Request**: Client includes idempotency key in request
   ```javascript
   POST /api/payments
   Headers: {
       'Idempotency-Key': 'payment-12345-abcde'
   }
   Body: { orderId: 'order-123', amount: 100 }
   ```

2. **Server Check**: Server checks if key already processed
   ```javascript
   app.post('/api/payments', async (req, res) => {
       const idempotencyKey = req.headers['idempotency-key'];
       
       // Check if already processed
       const cached = await redis.get(`idempotency:${idempotencyKey}`);
       if (cached) {
           return res.status(200).json(JSON.parse(cached));  // Return cached result
       }
       
       // Mark as processing (prevent concurrent processing)
       const processing = await redis.set(
           `idempotency:${idempotencyKey}`,
           'processing',
           { EX: 300, NX: true }  // 5 min TTL, only if not exists
       );
       
       if (!processing) {
           // Another request is processing, wait or return 409 Conflict
           return res.status(409).json({ error: 'Request already processing' });
       }
       
       // Add to queue
       await paymentQueue.add('process-payment', {
           idempotencyKey,
           orderId: req.body.orderId,
           amount: req.body.amount
       });
       
       res.status(202).json({ message: 'Payment processing' });
   });
   ```

3. **Background Job Processing**: Job checks idempotency before processing
   ```javascript
   paymentQueue.process('process-payment', async (job) => {
       const { idempotencyKey, orderId, amount } = job.data;
       
       // Check database for existing payment
       const existing = await Payment.findOne({
           where: { idempotency_key: idempotencyKey }
       });
       
       if (existing) {
           // Already processed, return cached result
           await redis.set(
               `idempotency:${idempotencyKey}`,
               JSON.stringify(existing),
               { EX: 3600 }
           );
           return existing;
       }
       
       // Process payment (idempotent API call)
       const result = await chargePaymentAPI({
           idempotencyKey,  // Payment gateway also uses this
           orderId,
           amount
       });
       
       // Store payment record
       const payment = await Payment.create({
           idempotency_key: idempotencyKey,
           order_id: orderId,
           amount,
           status: result.success ? 'completed' : 'failed',
           gateway_response: result
       });
       
       // Cache result
       await redis.set(
           `idempotency:${idempotencyKey}`,
           JSON.stringify(payment),
           { EX: 3600 }
       );
       
       return payment;
   });
   ```

4. **Client Retry**: If client retries with same key, returns cached result
   ```javascript
   // Client retries (network timeout, etc.)
   POST /api/payments
   Headers: { 'Idempotency-Key': 'payment-12345-abcde' }  // Same key
   
   // Server returns cached result (same payment, not charged twice)
   Response: { id: 'pay-123', status: 'completed', amount: 100 }
   ```

**Key Properties:**

- **Idempotency Key Uniqueness**: Each operation gets unique key (client-provided or server-generated)
- **Caching**: Results cached in Redis/DB for quick lookup on retries
- **Atomic Check**: Redis SET NX ensures only one request processes
- **Gateway Idempotency**: Payment gateway also uses idempotency key (prevents double charge)

**System Design Consideration**: Idempotency keys are essential for **financial operations** where duplicate processing has severe consequences (double charging). The pattern ensures **exactly-once semantics** (or at-least-once with idempotency) in distributed systems where network failures and retries are common. Critical for **payment, order processing, and financial transactions**.

---

### Q4: What is the difference between "idempotency" implemented at the application level vs. the database level? When would you choose each approach?

**Answer:**

The distinction between application and database-level idempotency is a **choice between architectural flexibility and absolute consistency**. Database-level enforcement leverages strong ACID guarantees to prevent duplicates at the point of persistence, while application-level logic allows for more complex, multi-system coordination that may be difficult to express through simple database constraints.

**Application-Level Idempotency**: Application code checks and enforces idempotency (e.g., check-before-execute, idempotency keys)

**Database-Level Idempotency**: Database constraints and operations ensure idempotency (e.g., unique constraints, upserts, transactions)

**Key Differences:**

| Aspect | Application-Level | Database-Level |
|--------|------------------|----------------|
| **Enforcement** | Code logic | Database constraints |
| **Performance** | May require extra queries | Optimized by DB |
| **Consistency** | Eventual (race conditions possible) | Strong (ACID guarantees) |
| **Flexibility** | Custom logic, complex rules | Limited to DB capabilities |
| **Failure Handling** | Application handles | Database handles |

**Application-Level Example:**

```javascript
// Check before execute (application logic)
const existing = await Payment.findOne({ where: { idempotency_key } });
if (existing) return existing;

const payment = await Payment.create({ idempotency_key, amount });
// Race condition: Two requests may both pass check
```

**Database-Level Example:**

```javascript
// Upsert (database enforces uniqueness)
const [payment, created] = await Payment.findOrCreate({
    where: { idempotency_key },
    defaults: { amount, status: 'pending' }
});
// Database ensures only one record created (unique constraint)
```

**When to Choose Application-Level:**

1. **Complex Business Logic**: Idempotency depends on business rules, not just uniqueness
   - Example: "Send email only if user hasn't received welcome email in last 7 days"
   - Application logic checks date, database can't enforce this

2. **External System Integration**: Idempotency involves external APIs
   - Example: Payment gateway idempotency, email service deduplication
   - Application coordinates between DB and external systems

3. **Performance Optimization**: Avoid database round-trips for simple checks
   - Example: Redis-based idempotency for high-throughput systems
   - Application uses fast cache, database for persistence

4. **Flexible Error Handling**: Different handling for different scenarios
   - Example: Retry on transient failure, skip on duplicate
   - Application logic provides fine-grained control

**When to Choose Database-Level:**

1. **Strong Consistency Required**: Financial transactions, critical operations
   - Example: Payment processing, order creation
   - Database ACID guarantees prevent race conditions

2. **Simple Uniqueness**: Idempotency based on single unique field
   - Example: User email, order ID, payment idempotency key
   - Database unique constraint is simplest and strongest

3. **Performance Critical**: Database operations are optimized
   - Example: High-throughput systems, bulk operations
   - Database indexes and constraints are faster than application checks

4. **Data Integrity**: Prevent invalid states at database level
   - Example: Prevent duplicate orders, ensure referential integrity
   - Database constraints enforce data rules

**Hybrid Approach (Best Practice):**

```javascript
// Application-level check (fast path)
const cached = await redis.get(`idempotency:${key}`);
if (cached) return JSON.parse(cached);

// Database-level enforcement (strong guarantee)
try {
    const payment = await Payment.create({
        idempotency_key: key,
        amount,
        status: 'processing'
    });
    
    // Process payment...
    
    await redis.set(`idempotency:${key}`, JSON.stringify(payment), { EX: 3600 });
    return payment;
} catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
        // Already processed, fetch from DB
        const existing = await Payment.findOne({ where: { idempotency_key: key } });
        await redis.set(`idempotency:${key}`, JSON.stringify(existing), { EX: 3600 });
        return existing;
    }
    throw error;
}
```

**System Design Consideration**: Use **database-level** for **strong consistency** (financial operations), **application-level** for **flexibility** (complex business rules), and **hybrid** for **performance** (cache + database). The choice depends on **consistency requirements**, **performance needs**, and **complexity of idempotency rules**.

---

### Q5: Explain how deduplication works in a distributed system with multiple Express.js workers processing jobs from the same queue. What are the challenges, and how would you solve them?

**Answer:**

Deduplication in a distributed environment is a **coordination challenge** that requires a shared, authoritative state across all worker nodes. By using a fast, atomic store like Redis or a unique field in a distributed database, workers can effectively signal their intent to process a job, ensuring that no two nodes simultaneously attempt the same work in a high-concurrency scenario.

**Deduplication** ensures the same job is not processed multiple times, even when multiple workers pull jobs from the same queue concurrently. The challenge is preventing **race conditions** where multiple workers process the same job.

**The Problem:**

```
Queue: [Job-A, Job-B, Job-C]
Worker1: Pulls Job-A → Processing...
Worker2: Pulls Job-A → Also Processing! (duplicate)
Worker3: Pulls Job-B → Processing...
→ Job-A processed twice (duplicate execution)
```

**Challenges:**

1. **Race Condition**: Multiple workers pull same job before it's marked as "processing"
2. **Job Distribution**: Queue may distribute same job to multiple workers
3. **Retry Duplication**: Failed job retries may be picked by different workers
4. **Network Partitions**: Workers may not see each other's state

**Solutions:**

**1. Job ID-Based Deduplication (Bull Queue):**

```javascript
const Queue = require('bull');

const emailQueue = new Queue('emails', {
    redis: { host: 'localhost', port: 6379 }
});

// Use deterministic job ID (prevents duplicate jobs)
async function addEmailJob(userId, emailData) {
    const jobId = `email:${userId}:${emailData.type}`;
    
    // Bull ensures only one job with this ID exists
    await emailQueue.add('send-email', emailData, {
        jobId: jobId  // Unique job ID
    });
}

// Worker processes job
emailQueue.process('send-email', async (job) => {
    // Bull ensures only one worker processes this job ID
    const { userId, type } = job.data;
    await sendEmail(userId, type);
});
```

**2. Redis-Based Deduplication:**

```javascript
async function addJobWithDeduplication(queue, jobName, data, ttl = 3600) {
    // Generate deterministic deduplication key
    const dedupeKey = `${jobName}:${JSON.stringify(data)}`;
    const hash = crypto.createHash('md5').update(dedupeKey).digest('hex');
    
    // Atomic check-and-set (prevents race condition)
    const exists = await redis.set(
        `dedupe:${hash}`,
        'processing',
        { EX: ttl, NX: true }  // Only set if not exists
    );
    
    if (!exists) {
        console.log('Duplicate job detected, skipping');
        return null;  // Already exists, don't add
    }
    
    // Add job to queue
    const job = await queue.add(jobName, data);
    
    // Mark as completed after processing
    job.on('completed', () => {
        redis.set(`dedupe:${hash}`, 'completed', { EX: ttl });
    });
    
    return job;
}
```

**3. Database-Based Deduplication:**

```javascript
// Use database unique constraint
async function processJobWithDeduplication(jobData) {
    const transaction = await sequelize.transaction();
    
    try {
        // Check if already processed (with lock)
        const existing = await JobLog.findOne({
            where: {
                job_type: jobData.type,
                job_signature: jobData.signature  // Unique identifier
            },
            lock: transaction.LOCK.UPDATE,
            transaction
        });
        
        if (existing) {
            await transaction.rollback();
            return existing.result;  // Already processed
        }
        
        // Process job
        const result = await processJob(jobData);
        
        // Log job completion
        await JobLog.create({
            job_type: jobData.type,
            job_signature: jobData.signature,
            result: result,
            processed_at: new Date()
        }, { transaction });
        
        await transaction.commit();
        return result;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}
```

**4. Distributed Lock (Redis Redlock):**

```javascript
const Redlock = require('redlock');
const redlock = new Redlock([redis], { retryCount: 0 });

async function processJobWithLock(jobData) {
    const lockKey = `lock:job:${jobData.signature}`;
    
    // Acquire distributed lock (prevents concurrent processing)
    const lock = await redlock.acquire([lockKey], 30000);  // 30s TTL
    
    try {
        // Check if already processed
        const existing = await redis.get(`job:${jobData.signature}`);
        if (existing) {
            return JSON.parse(existing);
        }
        
        // Process job
        const result = await processJob(jobData);
        
        // Cache result
        await redis.set(`job:${jobData.signature}`, JSON.stringify(result), { EX: 3600 });
        
        return result;
    } finally {
        await lock.release();  // Release lock
    }
}
```

**Visual Comparison:**

```
Without Deduplication:
Queue: [Job-A]
Worker1: Pull Job-A → Process → Complete
Worker2: Pull Job-A → Process → Complete (DUPLICATE!)
→ Job-A executed twice

With Deduplication (Job ID):
Queue: [Job-A (ID: email:123)]
Worker1: Pull Job-A → Process → Complete
Worker2: Try Pull Job-A → Already processed (skipped)
→ Job-A executed once

With Deduplication (Redis Lock):
Queue: [Job-A]
Worker1: Acquire Lock → Process → Release Lock
Worker2: Try Acquire Lock → Locked (wait or skip)
→ Job-A executed once
```

**System Design Consideration**: Deduplication in distributed systems requires **coordination** between workers. Use **job IDs** (simplest, Bull handles), **Redis atomic operations** (SET NX for check-and-set), **database locks** (strongest consistency), or **distributed locks** (Redlock for multi-Redis). Choose based on **consistency requirements** (strong: database, eventual: Redis) and **performance** (locks add latency but prevent duplicates).

