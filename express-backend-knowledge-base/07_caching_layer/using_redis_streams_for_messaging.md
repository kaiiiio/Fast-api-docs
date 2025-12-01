# Using Redis Streams for Messaging: Event-Driven Architecture

Redis Streams provide a log-like data structure for messaging and event streaming. This guide covers using Redis Streams in Express.js applications.

## What are Redis Streams?

**Redis Streams** are append-only logs that enable:
- Message queuing
- Event streaming
- Consumer groups
- Message acknowledgment

## Basic Usage

### Producer: Add Messages

```javascript
const redis = require('redis');
const client = redis.createClient();

// Add message to stream
async function publishEvent(streamName, event) {
    await client.xAdd(streamName, '*', {
        event: JSON.stringify(event),
        timestamp: Date.now()
    });
}

// Use
await publishEvent('user-events', {
    type: 'user_created',
    userId: 123,
    email: 'john@example.com'
});
```

### Consumer: Read Messages

```javascript
// Read messages from stream
async function consumeEvents(streamName, lastId = '0') {
    const messages = await client.xRead(
        { key: streamName, id: lastId },
        { COUNT: 10, BLOCK: 5000 }  // Read 10, block 5s
    );
    
    return messages;
}

// Process events
async function processEvents() {
    let lastId = '0';
    
    while (true) {
        const messages = await consumeEvents('user-events', lastId);
        
        for (const message of messages) {
            for (const [id, fields] of message.messages) {
                const event = JSON.parse(fields.event);
                await handleEvent(event);
                lastId = id;
            }
        }
    }
}
```

## Consumer Groups

### Create Consumer Group

```javascript
// Create consumer group
await client.xGroupCreate('user-events', 'email-processors', '0', {
    MKSTREAM: true
});

// Read from consumer group
async function readFromGroup(groupName, consumerName) {
    const messages = await client.xReadGroup(
        groupName,
        consumerName,
        { key: 'user-events', id: '>' },
        { COUNT: 10, BLOCK: 5000 }
    );
    
    return messages;
}

// Acknowledge message
async function acknowledgeMessage(streamName, groupName, messageId) {
    await client.xAck(streamName, groupName, messageId);
}
```

## Real-World Examples

### Example 1: Event-Driven User Registration

```javascript
// Producer: User registration
app.post('/users', async (req, res) => {
    const user = await User.create(req.body);
    
    // Publish event
    await client.xAdd('user-events', '*', {
        type: 'user_created',
        userId: user.id.toString(),
        email: user.email,
        timestamp: Date.now().toString()
    });
    
    res.status(201).json(user);
});

// Consumer: Process user events
async function processUserEvents() {
    const groupName = 'user-processors';
    const consumerName = 'worker-1';
    
    while (true) {
        const messages = await client.xReadGroup(
            groupName,
            consumerName,
            { key: 'user-events', id: '>' },
            { COUNT: 10, BLOCK: 5000 }
        );
        
        for (const message of messages) {
            for (const [id, fields] of message.messages) {
                try {
                    const event = JSON.parse(fields.event);
                    
                    if (event.type === 'user_created') {
                        await sendWelcomeEmail(event.email);
                        await createUserProfile(event.userId);
                    }
                    
                    // Acknowledge
                    await client.xAck('user-events', groupName, id);
                } catch (error) {
                    console.error('Error processing event:', error);
                    // Don't ack, will be retried
                }
            }
        }
    }
}
```

### Example 2: Order Processing Pipeline

```javascript
// Publish order event
app.post('/orders', async (req, res) => {
    const order = await Order.create(req.body);
    
    await client.xAdd('order-events', '*', {
        type: 'order_created',
        orderId: order.id.toString(),
        userId: order.user_id.toString(),
        total: order.total.toString(),
        timestamp: Date.now().toString()
    });
    
    res.status(201).json(order);
});

// Multiple consumers for different tasks
async function processOrderPayment() {
    const messages = await client.xReadGroup(
        'payment-processors',
        'payment-worker-1',
        { key: 'order-events', id: '>' },
        { COUNT: 10, BLOCK: 5000 }
    );
    
    // Process payment...
}

async function processOrderShipping() {
    const messages = await client.xReadGroup(
        'shipping-processors',
        'shipping-worker-1',
        { key: 'order-events', id: '>' },
        { COUNT: 10, BLOCK: 5000 }
    );
    
    // Process shipping...
}
```

## Best Practices

1. **Consumer Groups**: Use for parallel processing
2. **Acknowledgment**: Always ack processed messages
3. **Error Handling**: Handle errors gracefully
4. **Monitoring**: Monitor stream length and lag
5. **Idempotency**: Make handlers idempotent

## Summary

**Using Redis Streams for Messaging:**

1. **Purpose**: Event-driven messaging and streaming
2. **Features**: Producer-consumer, consumer groups, acknowledgment
3. **Use Cases**: Event processing, task queues, event sourcing
4. **Best Practice**: Use consumer groups, acknowledge messages
5. **Benefits**: Scalable, reliable messaging

**Key Takeaway:**
Redis Streams provide log-like messaging for event-driven architectures. Use streams for event publishing and consumption. Consumer groups enable parallel processing. Always acknowledge processed messages. Handle errors gracefully and make handlers idempotent.

**Streams Strategy:**
- Use streams for events
- Consumer groups for parallel processing
- Acknowledge messages
- Handle errors
- Monitor stream health

**Next Steps:**
- Learn [Cache Strategies](cache_strategies.md) for caching
- Study [Background Jobs](../08_background_jobs_and_task_queues/) for task processing
- Master [Event Sourcing](../16_system_design_patterns/) for event patterns

