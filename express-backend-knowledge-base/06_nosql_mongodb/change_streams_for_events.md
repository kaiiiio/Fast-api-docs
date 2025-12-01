# Change Streams for Events: Real-Time Database Changes

MongoDB Change Streams provide real-time notifications of database changes. This guide covers using change streams in Express.js for event-driven architectures.

## What are Change Streams?

**Change Streams** allow you to watch for changes in MongoDB collections and receive real-time notifications when documents are inserted, updated, or deleted.

### Basic Concept

```javascript
// Watch for changes in collection
const changeStream = collection.watch();

changeStream.on('change', (change) => {
    console.log('Change detected:', change);
    // Handle change event
});
```

**Explanation:**
Change streams provide real-time notifications of database changes, enabling event-driven architectures and real-time features.

## Setting Up Change Streams

### Basic Change Stream

```javascript
const { MongoClient } = require('mongodb');

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db('mydb');
const collection = db.collection('users');

// Watch for changes
const changeStream = collection.watch();

changeStream.on('change', (change) => {
    console.log('Change type:', change.operationType);
    console.log('Document:', change.fullDocument);
    console.log('Document ID:', change.documentKey._id);
});
```

### With Mongoose

```javascript
const mongoose = require('mongoose');

// Watch User model changes
const User = mongoose.model('User', userSchema);

const changeStream = User.watch();

changeStream.on('change', (change) => {
    console.log('Change:', change);
});
```

## Change Event Types

### Insert Operation

```javascript
changeStream.on('change', (change) => {
    if (change.operationType === 'insert') {
        console.log('New document inserted:', change.fullDocument);
        
        // Handle new user
        const newUser = change.fullDocument;
        // Send welcome email, create profile, etc.
    }
});
```

### Update Operation

```javascript
changeStream.on('change', (change) => {
    if (change.operationType === 'update') {
        console.log('Document updated:', change.documentKey);
        console.log('Updated fields:', change.updateDescription.updatedFields);
        console.log('Removed fields:', change.updateDescription.removedFields);
        
        // Handle update
        if (change.updateDescription.updatedFields.email) {
            // Email changed, send verification
        }
    }
});
```

### Delete Operation

```javascript
changeStream.on('change', (change) => {
    if (change.operationType === 'delete') {
        console.log('Document deleted:', change.documentKey);
        
        // Handle deletion
        // Clean up related data, send notification, etc.
    }
});
```

## Real-World Examples

### Example 1: User Registration Events

```javascript
// Watch for new user registrations
const userChangeStream = User.watch([
    { $match: { 'operationType': 'insert' } }
]);

userChangeStream.on('change', async (change) => {
    if (change.operationType === 'insert') {
        const newUser = change.fullDocument;
        
        // Send welcome email
        await sendWelcomeEmail(newUser.email);
        
        // Create default profile
        await Profile.create({
            user_id: newUser._id,
            settings: defaultSettings
        });
        
        // Log registration event
        await EventLog.create({
            type: 'user_registered',
            user_id: newUser._id,
            metadata: { email: newUser.email }
        });
    }
});
```

### Example 2: Order Status Updates

```javascript
// Watch for order status changes
const orderChangeStream = Order.watch([
    {
        $match: {
            'operationType': 'update',
            'updateDescription.updatedFields.status': { $exists: true }
        }
    }
]);

orderChangeStream.on('change', async (change) => {
    if (change.operationType === 'update') {
        const orderId = change.documentKey._id;
        const newStatus = change.updateDescription.updatedFields.status;
        
        // Get full order document
        const order = await Order.findById(orderId);
        
        // Send status update notification
        if (newStatus === 'shipped') {
            await sendShippingNotification(order.user_id, order);
        } else if (newStatus === 'delivered') {
            await sendDeliveryNotification(order.user_id, order);
        }
        
        // Update analytics
        await updateOrderAnalytics(orderId, newStatus);
    }
});
```

### Example 3: Real-Time Notifications

```javascript
const io = require('socket.io')(server);

// Watch for changes and emit to clients
const postChangeStream = Post.watch();

postChangeStream.on('change', (change) => {
    if (change.operationType === 'insert') {
        // New post created
        const newPost = change.fullDocument;
        
        // Emit to relevant users
        io.to(`user:${newPost.author_id}`).emit('new_post', newPost);
        
        // Emit to followers
        getFollowers(newPost.author_id).then(followers => {
            followers.forEach(follower => {
                io.to(`user:${follower.id}`).emit('feed_update', newPost);
            });
        });
    }
});
```

## Filtering Change Streams

### Filter by Operation Type

```javascript
// Only watch for inserts
const changeStream = collection.watch([
    { $match: { operationType: 'insert' } }
]);
```

### Filter by Document Fields

```javascript
// Watch for changes to specific documents
const changeStream = collection.watch([
    {
        $match: {
            'fullDocument.status': 'active',
            'fullDocument.priority': 'high'
        }
    }
]);
```

### Filter Updates by Fields

```javascript
// Watch for specific field updates
const changeStream = collection.watch([
    {
        $match: {
            operationType: 'update',
            'updateDescription.updatedFields.status': { $exists: true }
        }
    }
]);
```

## Error Handling

### Handle Change Stream Errors

```javascript
const changeStream = collection.watch();

changeStream.on('change', (change) => {
    // Handle change
});

changeStream.on('error', (error) => {
    console.error('Change stream error:', error);
    
    // Reconnect logic
    if (error.code === 43) {  // Change stream invalidated
        // Recreate change stream
        reconnectChangeStream();
    }
});

// Reconnect function
async function reconnectChangeStream() {
    try {
        const newStream = collection.watch();
        setupChangeStreamHandlers(newStream);
    } catch (error) {
        console.error('Failed to reconnect:', error);
        // Retry with exponential backoff
        setTimeout(reconnectChangeStream, 5000);
    }
}
```

## Best Practices

1. **Handle Errors**: Implement error handling and reconnection
2. **Filter Early**: Use $match to filter at database level
3. **Resume Tokens**: Use resume tokens for reliability
4. **Monitor Performance**: Watch for performance impact
5. **Idempotency**: Handle duplicate events

## Common Patterns

### Pattern 1: Event Sourcing

```javascript
// Use change streams for event sourcing
const changeStream = collection.watch();

changeStream.on('change', async (change) => {
    // Store event
    await EventStore.create({
        eventType: change.operationType,
        aggregateId: change.documentKey._id,
        eventData: change.fullDocument || change.updateDescription,
        timestamp: change.clusterTime
    });
});
```

### Pattern 2: Cache Invalidation

```javascript
// Invalidate cache on changes
const changeStream = collection.watch();

changeStream.on('change', async (change) => {
    const documentId = change.documentKey._id;
    
    // Invalidate cache
    await redis.del(`user:${documentId}`);
    await redis.del(`user_profile:${documentId}`);
    
    // Invalidate related caches
    if (change.operationType === 'update') {
        const updatedFields = Object.keys(change.updateDescription.updatedFields);
        if (updatedFields.includes('email')) {
            await redis.del(`user_by_email:${change.fullDocument.email}`);
        }
    }
});
```

## Summary

**Change Streams for Events:**

1. **Purpose**: Real-time notifications of database changes
2. **Operations**: Insert, update, delete events
3. **Use Cases**: Event-driven architecture, real-time features, cache invalidation
4. **Best Practice**: Handle errors, filter early, use resume tokens
5. **Implementation**: Works with both native driver and Mongoose

**Key Takeaway:**
MongoDB Change Streams provide real-time notifications of database changes, enabling event-driven architectures. Use change streams for real-time features, cache invalidation, and event sourcing. Filter changes at the database level for performance, handle errors and reconnection, and ensure idempotency when processing events.

**Change Stream Use Cases:**
- Real-time notifications
- Cache invalidation
- Event sourcing
- Analytics updates
- WebSocket updates

**Next Steps:**
- Learn [Mongoose Setup](mongoose_setup_and_basics.md) for ODM usage
- Study [Aggregation Pipeline](aggregation_pipeline.md) for complex queries
- Master [Socket.IO](../10_Sockets/02_socketio_basics.md) for real-time communication

