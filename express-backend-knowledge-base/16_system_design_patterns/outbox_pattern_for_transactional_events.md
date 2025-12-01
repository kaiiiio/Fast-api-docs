# Outbox Pattern: Transactional Events

Outbox pattern ensures events are published reliably within database transactions. This guide covers implementing the outbox pattern in Express.js applications.

## The Problem

**Problem:** Publishing events outside transactions can cause inconsistencies.

```javascript
// ❌ Problem: Event published but transaction fails
await sequelize.transaction(async (t) => {
    await User.create({ email: 'user@example.com' }, { transaction: t });
    await publishEvent('user_created', { email: 'user@example.com' });  // Published
    throw new Error('Transaction failed');  // Transaction rolled back, but event already published!
});
```

## The Solution: Outbox Pattern

**Outbox Pattern:** Store events in database within transaction, then publish asynchronously.

```javascript
// ✅ Solution: Event stored in transaction
await sequelize.transaction(async (t) => {
    await User.create({ email: 'user@example.com' }, { transaction: t });
    await OutboxEvent.create({
        event_type: 'user_created',
        event_data: JSON.stringify({ email: 'user@example.com' }),
        status: 'pending'
    }, { transaction: t });
    // Both succeed or both fail
});
```

## Implementation

### Database Schema

```sql
CREATE TABLE outbox_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(255) NOT NULL,
    event_data JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP
);

CREATE INDEX idx_outbox_pending ON outbox_events(status, created_at) 
WHERE status = 'pending';
```

### Outbox Service

```javascript
class OutboxService {
    async createEvent(eventType, eventData, transaction) {
        return await OutboxEvent.create({
            event_type: eventType,
            event_data: JSON.stringify(eventData),
            status: 'pending'
        }, { transaction });
    }
    
    async processPendingEvents() {
        const events = await OutboxEvent.findAll({
            where: { status: 'pending' },
            order: [['created_at', 'ASC']],
            limit: 100
        });
        
        for (const event of events) {
            try {
                await this.publishEvent(event);
                event.status = 'processed';
                event.processed_at = new Date();
                await event.save();
            } catch (error) {
                console.error('Failed to publish event:', error);
                // Retry later
            }
        }
    }
    
    async publishEvent(event) {
        // Publish to message broker
        await messageQueue.publish(event.event_type, JSON.parse(event.event_data));
    }
}
```

## Real-World Examples

### Example 1: User Registration with Events

```javascript
// User registration with outbox
app.post('/users', async (req, res) => {
    await sequelize.transaction(async (t) => {
        // Create user
        const user = await User.create({
            email: req.body.email,
            name: req.body.name
        }, { transaction: t });
        
        // Store event in outbox (within transaction)
        await OutboxEvent.create({
            event_type: 'user_created',
            event_data: JSON.stringify({
                userId: user.id,
                email: user.email,
                name: user.name
            }),
            status: 'pending'
        }, { transaction: t });
        
        // Transaction commits, event stored
    });
    
    res.status(201).json({ message: 'User created' });
});

// Background worker processes outbox
setInterval(async () => {
    await outboxService.processPendingEvents();
}, 5000);  // Process every 5 seconds
```

## Best Practices

1. **Atomic Operations**: Store events within transactions
2. **Idempotent Publishing**: Make publishing idempotent
3. **Retry Logic**: Retry failed publications
4. **Monitoring**: Track pending events
5. **Cleanup**: Archive processed events

## Summary

**Outbox Pattern:**

1. **Purpose**: Reliable event publishing within transactions
2. **Implementation**: Store events in database, publish asynchronously
3. **Benefits**: Consistency, reliability
4. **Best Practice**: Atomic operations, idempotent publishing
5. **Use Cases**: Event-driven architectures, microservices

**Key Takeaway:**
Outbox pattern ensures events are published reliably within database transactions. Store events in an outbox table within the transaction. Process outbox events asynchronously. Make publishing idempotent. Retry failed publications. Monitor pending events.

**Outbox Strategy:**
- Store events in transaction
- Process asynchronously
- Idempotent publishing
- Retry logic
- Monitor and cleanup

**Next Steps:**
- Learn [Event Sourcing](event_sourcing_vs_crud.md) for event storage
- Study [Saga Pattern](saga_pattern_for_distributed_tx.md) for transactions
- Master [CQRS](cqrs_for_read_heavy_systems.md) for separation

