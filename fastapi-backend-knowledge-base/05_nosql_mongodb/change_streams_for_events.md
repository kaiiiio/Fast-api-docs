# MongoDB Change Streams: Real-Time Event Processing

Change Streams allow you to watch MongoDB collections for changes in real-time. This guide teaches you how to use Change Streams for event-driven architectures in FastAPI.

## Understanding Change Streams

**What are Change Streams?**
A real-time feed of changes happening in a MongoDB collection (inserts, updates, deletes).

**Use cases:**
- Real-time notifications
- Event sourcing
- Data synchronization
- Audit logging
- Cache invalidation

**How it works:**
```
Collection Change → Change Stream → Your Application
```

## Step 1: Basic Change Stream Setup

Let's watch a collection for changes:

```python
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

async def watch_users_collection():
    """Watch users collection for changes."""
    client = AsyncIOMotorClient("mongodb://localhost:27017/")
    db = client.ecommerce
    
    # Open change stream
    async with db.users.watch() as stream:
        async for change in stream:
            print(f"Change detected: {change}")
            
            # Process change
            operation_type = change["operationType"]
            
            if operation_type == "insert":
                print(f"New user created: {change['fullDocument']}")
            elif operation_type == "update":
                print(f"User updated: {change['documentKey']}")
            elif operation_type == "delete":
                print(f"User deleted: {change['documentKey']}")
```

**Understanding change document:**
- `operationType`: "insert", "update", "delete", "replace"
- `fullDocument`: Complete document (for insert/replace)
- `documentKey`: `_id` of changed document
- `updateDescription`: What changed (for updates)

## Step 2: Change Stream with Filters

Filter to specific changes:

```python
async def watch_user_updates():
    """Watch only user updates."""
    client = AsyncIOMotorClient("mongodb://localhost:27017/")
    db = client.ecommerce
    
    # Filter: Only updates to email field
    pipeline = [
        {
            "$match": {
                "operationType": "update",
                "updateDescription.updatedFields.email": {"$exists": True}
            }
        }
    ]
    
    async with db.users.watch(pipeline=pipeline) as stream:
        async for change in stream:
            print(f"Email changed: {change['documentKey']}")
            print(f"New email: {change['updateDescription']['updatedFields']['email']}")
```

## Step 3: Integration with FastAPI

Create a background task to watch changes:

```python
from fastapi import FastAPI
from contextlib import asynccontextmanager
import asyncio

async def process_change(change: dict):
    """Process a change event."""
    operation_type = change["operationType"]
    
    if operation_type == "insert":
        # New user registered - send welcome email
        user = change["fullDocument"]
        await send_welcome_email(user["email"])
    
    elif operation_type == "update":
        # User updated - invalidate cache
        user_id = change["documentKey"]["_id"]
        await invalidate_user_cache(str(user_id))
    
    elif operation_type == "delete":
        # User deleted - cleanup
        user_id = change["documentKey"]["_id"]
        await cleanup_user_data(str(user_id))

async def watch_changes():
    """Background task to watch MongoDB changes."""
    client = AsyncIOMotorClient("mongodb://localhost:27017/")
    db = client.ecommerce
    
    try:
        async with db.users.watch() as stream:
            async for change in stream:
                await process_change(change)
    except Exception as e:
        print(f"Change stream error: {e}")
        # Reconnect logic here

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan."""
    # Start change stream watcher
    task = asyncio.create_task(watch_changes())
    
    yield
    
    # Cleanup
    task.cancel()

app = FastAPI(lifespan=lifespan)
```

## Step 4: Resume Tokens for Reliability

Resume from last processed change:

```python
async def watch_with_resume_token():
    """Watch changes with resume token for reliability."""
    client = AsyncIOMotorClient("mongodb://localhost:27017/")
    db = client.ecommerce
    
    # Get last processed token (from Redis/database)
    last_token = await get_last_resume_token()
    
    options = {}
    if last_token:
        options["resume_after"] = last_token
    
    async with db.users.watch(**options) as stream:
        async for change in stream:
            # Process change
            await process_change(change)
            
            # Store resume token
            resume_token = change["_id"]
            await save_resume_token(resume_token)
```

## Step 5: Change Stream Patterns

### Pattern 1: Real-Time Notifications

```python
async def notify_on_user_change():
    """Send real-time notifications on user changes."""
    client = AsyncIOMotorClient("mongodb://localhost:27017/")
    db = client.ecommerce
    
    async with db.users.watch() as stream:
        async for change in stream:
            if change["operationType"] == "update":
                user_id = str(change["documentKey"]["_id"])
                
                # Publish to Redis pub/sub
                await redis.publish(
                    f"user:{user_id}:updated",
                    json.dumps(change)
                )
```

### Pattern 2: Cache Invalidation

```python
async def invalidate_cache_on_change():
    """Invalidate cache when data changes."""
    client = AsyncIOMotorClient("mongodb://localhost:27017/")
    db = client.ecommerce
    
    async with db.products.watch() as stream:
        async for change in stream:
            product_id = str(change["documentKey"]["_id"])
            
            # Invalidate cache
            cache_keys = [
                f"product:{product_id}",
                "products:list",
                "products:category:*"
            ]
            
            for key in cache_keys:
                await redis.delete(key)
```

### Pattern 3: Event Sourcing

```python
async def log_events_to_event_store():
    """Store all changes as events."""
    client = AsyncIOMotorClient("mongodb://localhost:27017/")
    db = client.ecommerce
    
    async with db.orders.watch() as stream:
        async for change in stream:
            # Store event
            event = {
                "event_type": change["operationType"],
                "entity_type": "order",
                "entity_id": str(change["documentKey"]["_id"]),
                "data": change.get("fullDocument") or change.get("updateDescription"),
                "timestamp": datetime.utcnow()
            }
            
            await db.events.insert_one(event)
```

## Summary

Change Streams provide:
- ✅ Real-time change detection
- ✅ Event-driven architecture
- ✅ Reliable processing with resume tokens
- ✅ Efficient filtering

Use Change Streams to build reactive, event-driven FastAPI applications!

