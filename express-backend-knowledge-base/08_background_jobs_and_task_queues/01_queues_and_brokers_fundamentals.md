# Queues and Brokers Fundamentals: Decoupling Slow Operations

Queues and brokers decouple slow operations from fast API responses, improving user experience and system scalability. This guide covers queue fundamentals in Express.js applications.

## The Problem: Slow API Responses

**Problem:** Slow operations block API responses, making users wait.

```javascript
// ❌ Bad: Synchronous slow operations
app.post('/register', async (req, res) => {
    // 1. Save user (10ms)
    const user = await User.create(req.body);
    
    // 2. Resize avatar (500ms) - User waits!
    await resizeAvatar(user.avatar);
    
    // 3. Send welcome email (2000ms) - User waits!
    await sendWelcomeEmail(user.email);
    
    // 4. Update analytics (50ms) - User waits!
    await updateAnalytics('user_registered');
    
    res.json(user);  // User waited 2.5+ seconds!
});
```

**Solution:** Use queues for background processing.

```javascript
// ✅ Good: Queue slow operations
app.post('/register', async (req, res) => {
    // 1. Save user (10ms)
    const user = await User.create(req.body);
    
    // 2-4. Queue background tasks
    await emailQueue.add('send-welcome-email', { userId: user.id });
    await imageQueue.add('resize-avatar', { userId: user.id, avatar: user.avatar });
    await analyticsQueue.add('track-event', { event: 'user_registered', userId: user.id });
    
    res.json(user);  // User gets response in 10ms!
});
```

## Core Concepts

### Producer-Consumer Pattern

```
Producer (Express App)
    ↓
    Creates Task → Queue/Broker
    ↓
Consumer (Worker)
    ↓
    Executes Task
```

**Components:**
- **Producer**: Express.js app creates tasks
- **Broker**: Queue system (Redis, RabbitMQ) stores tasks
- **Consumer**: Worker processes tasks

### Message Durability

```javascript
// In-Memory (Redis default)
// ✅ Fast
// ❌ Tasks lost on server crash

// Durable (RabbitMQ, Redis with persistence)
// ✅ Tasks survive crashes
// ⚠️ Slightly slower
```

### Ack/Nack

```javascript
// Acknowledgment (Ack)
// Worker tells broker: "Task completed, delete it"

// Negative Acknowledgment (Nack)
// Worker tells broker: "Task failed, retry it"

// Visibility Timeout
// If worker doesn't ack in 30s, broker assumes worker died
// Re-queues task for another worker
```

### Dead Letter Queue (DLQ)

```javascript
// Tasks that fail repeatedly go to DLQ
// Prevents infinite retry loops
// Allows manual inspection
```

## Choosing a Broker

### Redis

```javascript
// ✅ Good for:
// - Simple background jobs
// - Fast processing
// - Simple setup

// ❌ Not ideal for:
// - Complex routing
// - Enterprise reliability needs
```

### RabbitMQ

```javascript
// ✅ Good for:
// - Complex routing
// - Enterprise reliability
// - Message durability

// ❌ Not ideal for:
// - Simple use cases (overkill)
```

### Bull/BullMQ (Redis-based)

```javascript
// ✅ Good for:
// - Node.js applications
// - Redis-based queues
// - Job scheduling

// Built on Redis, easy to use
```

## Real-World Examples

### Example 1: Email Queue

```javascript
const Queue = require('bull');
const emailQueue = new Queue('emails', {
    redis: {
        host: 'localhost',
        port: 6379
    }
});

// Producer: Add email task
app.post('/users', async (req, res) => {
    const user = await User.create(req.body);
    
    // Queue welcome email
    await emailQueue.add('send-welcome-email', {
        userId: user.id,
        email: user.email,
        name: user.name
    });
    
    res.status(201).json(user);
});

// Consumer: Process email task
emailQueue.process('send-welcome-email', async (job) => {
    const { userId, email, name } = job.data;
    
    await sendWelcomeEmail(email, name);
    console.log(`Welcome email sent to ${email}`);
});
```

### Example 2: Image Processing Queue

```javascript
const imageQueue = new Queue('images', {
    redis: { host: 'localhost', port: 6379 }
});

// Producer
app.post('/users/:id/avatar', upload.single('avatar'), async (req, res) => {
    const user = await User.findByPk(req.params.id);
    user.avatar_url = req.file.path;
    await user.save();
    
    // Queue image processing
    await imageQueue.add('resize-avatar', {
        userId: user.id,
        imagePath: req.file.path
    });
    
    res.json({ message: 'Avatar uploaded, processing...' });
});

// Consumer
imageQueue.process('resize-avatar', async (job) => {
    const { userId, imagePath } = job.data;
    
    // Resize image
    const resized = await resizeImage(imagePath, { width: 200, height: 200 });
    
    // Update user
    await User.update(
        { avatar_thumbnail: resized },
        { where: { id: userId } }
    );
});
```

## Best Practices

1. **Idempotent Tasks**: Tasks should be safe to retry
2. **Error Handling**: Handle failures gracefully
3. **Monitoring**: Monitor queue length and processing time
4. **Retry Logic**: Implement retry with exponential backoff
5. **Dead Letter Queue**: Use DLQ for failed tasks

## Summary

**Queues and Brokers Fundamentals:**

1. **Purpose**: Decouple slow operations from API responses
2. **Pattern**: Producer → Broker → Consumer
3. **Brokers**: Redis, RabbitMQ, Bull/BullMQ
4. **Concepts**: Durability, Ack/Nack, DLQ
5. **Best Practice**: Use queues for slow operations

**Key Takeaway:**
Queues and brokers decouple slow operations from fast API responses. Use queues for operations like email sending, image processing, and analytics that don't need to block the API response. Choose Redis/Bull for simple use cases, RabbitMQ for complex routing. Implement proper error handling, retry logic, and monitoring.

**Queue Strategy:**
- Queue slow operations
- Use appropriate broker
- Handle errors and retries
- Monitor queue health
- Use DLQ for failed tasks

**Next Steps:**
- Learn [Bull Queue Mastery](02_bull_queue_mastery.md) for implementation
- Study [Retry Patterns](../08_background_jobs_and_task_queues/retry_with_exponential_backoff.md) for error handling
- Master [Task Monitoring](../08_background_jobs_and_task_queues/monitoring_task_queues.md) for observability

