# Using Redis Streams for Messaging

Redis Streams provide pub/sub messaging with persistence. This guide teaches you how to use Redis Streams for event-driven messaging in FastAPI.

## Understanding Redis Streams

**What are Redis Streams?**
A log-like data structure for pub/sub messaging with persistence and consumer groups.

**Benefits over regular pub/sub:**
- Messages are persisted
- Multiple consumers (consumer groups)
- Message acknowledgment
- Range queries on history

## Step 1: Basic Stream Operations

```python
import aioredis

async def basic_stream_operations():
    """Basic stream create and read."""
    redis = await aioredis.from_url("redis://localhost:6379")
    
    # Add message to stream
    message_id = await redis.xadd(
        "events:user_created",
        {
            "user_id": "123",
            "email": "user@example.com",
            "timestamp": "2024-01-15T10:00:00"
        }
    )
    
    # Read messages from stream
    messages = await redis.xread({"events:user_created": "0"}, count=10)
    
    for stream, msgs in messages:
        for msg_id, data in msgs:
            print(f"Message {msg_id}: {data}")
```

## Step 2: Producer in FastAPI

```python
from fastapi import APIRouter

router = APIRouter()

@router.post("/users")
async def create_user(user_data: UserCreate, redis: aioredis.Redis = Depends(get_redis)):
    """Create user and publish event."""
    # Create user
    user = await create_user_in_db(user_data)
    
    # Publish to stream
    await redis.xadd(
        "events:user_created",
        {
            "user_id": str(user.id),
            "email": user.email,
            "event_type": "user_created"
        }
    )
    
    return user
```

## Step 3: Consumer (Background Worker)

```python
async def process_user_events():
    """Background worker to process user events."""
    redis = await aioredis.from_url("redis://localhost:6379")
    
    while True:
        try:
            # Read new messages
            messages = await redis.xread(
                {"events:user_created": "$"},  # Read new messages
                block=5000,  # Block for 5 seconds
                count=10
            )
            
            for stream, msgs in messages:
                for msg_id, data in msgs:
                    await handle_user_created_event(data)
                    
                    # Optional: Acknowledge processing
                    # await redis.xack("events:user_created", "group1", msg_id)
        
        except asyncio.TimeoutError:
            continue
        except Exception as e:
            print(f"Error processing events: {e}")
            await asyncio.sleep(1)

async def handle_user_created_event(data: dict):
    """Handle user created event."""
    user_id = data[b"user_id"].decode()
    email = data[b"email"].decode()
    
    # Send welcome email
    await send_welcome_email(email)
    
    # Update analytics
    await track_user_registration(user_id)
```

## Step 4: Consumer Groups

**Multiple consumers with load balancing:**

```python
async def setup_consumer_group():
    """Setup consumer group for parallel processing."""
    redis = await aioredis.from_url("redis://localhost:6379")
    
    try:
        # Create consumer group
        await redis.xgroup_create(
            "events:user_created",
            "email_workers",
            id="0",  # Start from beginning
            mkstream=True
        )
    except aioredis.ResponseError as e:
        if "BUSYGROUP" in str(e):
            # Group already exists
            pass

async def consumer_worker(worker_id: str):
    """Worker in consumer group."""
    redis = await aioredis.from_url("redis://localhost:6379")
    
    while True:
        try:
            # Read messages assigned to this consumer
            messages = await redis.xreadgroup(
                "email_workers",  # Group name
                worker_id,  # Consumer name
                {"events:user_created": ">"},  # Read pending messages
                count=10,
                block=5000
            )
            
            for stream, msgs in messages:
                for msg_id, data in msgs:
                    try:
                        await handle_user_created_event(data)
                        
                        # Acknowledge message
                        await redis.xack(
                            "events:user_created",
                            "email_workers",
                            msg_id
                        )
                    except Exception as e:
                        print(f"Error processing {msg_id}: {e}")
                        # Message will remain in pending list for retry
        
        except asyncio.TimeoutError:
            continue
```

## Step 5: FastAPI Integration

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start consumer workers on startup."""
    # Setup consumer groups
    await setup_consumer_group()
    
    # Start workers
    tasks = [
        asyncio.create_task(consumer_worker(f"worker-{i}"))
        for i in range(3)  # 3 workers
    ]
    
    yield
    
    # Cleanup
    for task in tasks:
        task.cancel()

app = FastAPI(lifespan=lifespan)
```

## Summary

Redis Streams provide:
- ✅ Persistent messaging
- ✅ Consumer groups for scaling
- ✅ Message acknowledgment
- ✅ Event-driven architecture

Use Redis Streams for reliable event processing in FastAPI!

