# Event Sourcing vs CRUD: Complete Comparison Guide

Event Sourcing stores changes as a sequence of events rather than updating state. This guide explains when to use Event Sourcing versus traditional CRUD in Express.js applications.

## Understanding CRUD (Traditional Approach)

**What is CRUD?** Create, Read, Update, Delete - the traditional approach to data management. Stores current state only, overwrites previous state on updates.

### CRUD Example

```javascript
// Traditional CRUD approach
class UserRepository {
    // Create user - stores current state directly
    async createUser(userData) {
        const user = await User.create({
            name: userData.name,
            email: userData.email,
            status: 'active'
        });
        return user;
    }
    
    // Update user - overwrites previous state
    async updateUser(userId, updates) {
        const user = await User.findByPk(userId);
        user.email = updates.email || user.email;  // Old email overwritten
        user.name = updates.name || user.name;     // Old name overwritten
        await user.save();
        return user;
    }
    
    // Get user - returns current state only
    async getUser(userId) {
        return await User.findByPk(userId);
    }
}
```

**Database schema (CRUD):**
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255),
    status VARCHAR(20),
    updated_at TIMESTAMP
    -- Only current state stored
);
```

## Understanding Event Sourcing

**What is Event Sourcing?** Store all changes as a sequence of events. Reconstruct current state by replaying events. Complete audit trail, time-travel capability.

### Event Sourcing Example

```javascript
// Events
class UserCreatedEvent {
    constructor(userId, name, email, timestamp) {
        this.userId = userId;
        this.name = name;
        this.email = email;
        this.timestamp = timestamp;
        this.type = 'UserCreatedEvent';
    }
}

class UserEmailChangedEvent {
    constructor(userId, oldEmail, newEmail, timestamp) {
        this.userId = userId;
        this.oldEmail = oldEmail;
        this.newEmail = newEmail;
        this.timestamp = timestamp;
        this.type = 'UserEmailChangedEvent';
    }
}

// Event Store
class EventStore {
    async appendEvent(event) {
        await Event.create({
            stream_id: event.userId,
            event_type: event.type,
            event_data: JSON.stringify(event),
            version: event.version
        });
    }
    
    async getEvents(streamId) {
        return await Event.findAll({
            where: { stream_id: streamId },
            order: [['version', 'ASC']]
        });
    }
}

// Aggregate Root
class User {
    constructor(userId) {
        this.userId = userId;
        this.name = null;
        this.email = null;
        this.status = null;
        this.version = 0;
    }
    
    // Apply event to rebuild state
    applyEvent(event) {
        const eventData = typeof event.event_data === 'string' 
            ? JSON.parse(event.event_data) 
            : event.event_data;
        
        if (event.event_type === 'UserCreatedEvent') {
            this.name = eventData.name;
            this.email = eventData.email;
            this.status = 'active';
        } else if (event.event_type === 'UserEmailChangedEvent') {
            this.email = eventData.newEmail;
        } else if (event.event_type === 'UserStatusChangedEvent') {
            this.status = eventData.newStatus;
        }
        
        this.version = event.version;
    }
    
    // Rebuild user from events
    static fromEvents(userId, events) {
        const user = new User(userId);
        events.forEach(event => {
            user.applyEvent(event);
        });
        return user;
    }
}

// Repository
class UserEventSourcingRepository {
    constructor(eventStore) {
        this.eventStore = eventStore;
    }
    
    async createUser(userData) {
        const userId = require('crypto').randomUUID();
        
        const event = new UserCreatedEvent(
            userId,
            userData.name,
            userData.email,
            new Date()
        );
        
        await this.eventStore.appendEvent({
            ...event,
            version: 1
        });
        
        return userId;
    }
    
    async getUser(userId) {
        const events = await this.eventStore.getEvents(userId);
        return User.fromEvents(userId, events);
    }
    
    async changeEmail(userId, newEmail) {
        const events = await this.eventStore.getEvents(userId);
        const user = User.fromEvents(userId, events);
        
        const event = new UserEmailChangedEvent(
            userId,
            user.email,
            newEmail,
            new Date()
        );
        
        await this.eventStore.appendEvent({
            ...event,
            version: user.version + 1
        });
    }
}
```

## When to Use Each

### Use CRUD When:
- Simple applications
- Current state is sufficient
- No audit trail needed
- Performance is critical
- Team familiar with CRUD

### Use Event Sourcing When:
- Complete audit trail needed
- Time-travel required
- Complex business logic
- Multiple read models
- Compliance requirements

## Best Practices

1. **CRUD**: Simple, fast, familiar
2. **Event Sourcing**: Complex, audit trail, time-travel
3. **Hybrid**: Use both where appropriate
4. **Performance**: Consider snapshotting for Event Sourcing
5. **Complexity**: Event Sourcing adds complexity

## Summary

**Event Sourcing vs CRUD:**

1. **CRUD**: Stores current state, simple, fast
2. **Event Sourcing**: Stores events, audit trail, time-travel
3. **Choose CRUD**: Simple apps, performance critical
4. **Choose Event Sourcing**: Audit trail, compliance, complex logic
5. **Hybrid**: Use both where appropriate

**Key Takeaway:**
CRUD stores current state and is simple and fast. Event Sourcing stores all changes as events, providing complete audit trail and time-travel capability. Use CRUD for simple applications. Use Event Sourcing when you need audit trails, compliance, or complex business logic. Consider hybrid approaches.

**Decision Framework:**
- Simple app → CRUD
- Need audit trail → Event Sourcing
- Performance critical → CRUD
- Complex logic → Event Sourcing
- Compliance required → Event Sourcing

**Next Steps:**
- Learn [CQRS](cqrs_for_read_heavy_systems.md) for read/write separation
- Study [Outbox Pattern](outbox_pattern_for_transactional_events.md) for events
- Master [Saga Pattern](saga_pattern_for_distributed_tx.md) for transactions

