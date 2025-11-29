# Outbox Pattern for Transactional Events: Complete Guide

The Outbox pattern ensures reliable event publishing within database transactions, solving the critical problem of event publication consistency.

## The Problem: Event Publishing Inconsistency

### Problematic Approach

```python
async def create_order_problematic(order_data: dict):
    """Problem: Event published but transaction might fail."""
    # Step 1: Create order
    order = Order(**order_data)
    db.add(order)
    
    # Step 2: Publish event (outside transaction)
    await publish_event("order_created", {"order_id": order.id})  # ⚠️ Published immediately
    
    # Step 3: Commit transaction
    await db.commit()  # ❌ If this fails, event was already published!
    
    # Result: Event says order exists, but it doesn't in database!
```

**What can go wrong:**

**Scenario 1: Transaction Fails After Event Published**
```
Time 0ms: Event published to message queue → "order_created" event in queue
Time 1ms: Database transaction fails → Order NOT in database
Time 2ms: Consumer processes event → Tries to process order that doesn't exist
Result: ❌ Inconsistent state
```

**Scenario 2: Application Crashes After Event Published**
```
Time 0ms: Event published → In queue
Time 1ms: Application crashes → Transaction never committed
Result: ❌ Lost consistency
```

### Why This Matters

**Event-driven architecture dependency:**
- Other services depend on events
- Events must match database state exactly
- Inconsistency causes cascading failures

## The Solution: Outbox Pattern

**Core idea:** Store events in the database within the same transaction. A separate process publishes events.

### Architecture Diagram

```
┌─────────────────────────────────────┐
│  Application Transaction             │
│  ───────────────────────────────    │
│  1. Insert Order                     │
│  2. Insert OutboxEvent               │
│  3. Commit (both atomic)            │
└──────────────┬──────────────────────┘
               │
               ▼ Both in same transaction
┌──────────────────────────────────────┐
│         Database                     │
│  ────────────────────────────────   │
│  orders table                        │
│  ┌──────────┐                        │
│  │ order_1  │                        │
│  └──────────┘                        │
│                                       │
│  outbox_events table                 │
│  ┌──────────────────────┐            │
│  │ id │ event_type      │            │
│  │ 1  │ order_created   │ ← Unprocessed
│  └──────────────────────┘            │
└──────────────┬───────────────────────┘
               │
               ▼ Background process polls
┌──────────────────────────────────────┐
│   Outbox Event Processor             │
│  ────────────────────────────────   │
│  1. Read unprocessed events          │
│  2. Publish to message queue         │
│  3. Mark as processed                │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│   Message Queue (RabbitMQ/Redis)     │
│  ────────────────────────────────   │
│  "order_created" events              │
└──────────────────────────────────────┘
```

## Step 1: Database Schema

### Outbox Events Table

```python
from sqlalchemy import Column, Integer, String, JSON, Boolean, DateTime
from app.db.base import Base

class OutboxEvent(Base):
    """
    Outbox table stores events that need to be published.
    
    Events are inserted in the same transaction as business data,
    ensuring they're only published if the transaction succeeds.
    """
    __tablename__ = "outbox_events"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    event_type = Column(String(100), nullable=False, index=True)  # e.g., "order_created"
    event_data = Column(JSON, nullable=False)  # Event payload
    processed = Column(Boolean, default=False, nullable=False, index=True)  # Published flag
    processed_at = Column(DateTime, nullable=True)  # When published
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    retry_count = Column(Integer, default=0, nullable=False)  # Track retries
    error_message = Column(String(500), nullable=True)  # Last error if any
    
    def __repr__(self):
        return f"<OutboxEvent(id={self.id}, event_type={self.event_type}, processed={self.processed})>"
```

**Understanding the schema:**
- `event_type`: What kind of event (e.g., "order_created", "payment_processed")
- `event_data`: JSON payload with event details
- `processed`: Flag indicating if event was published
- `created_at`: When event was created (for ordering)
- `retry_count`: Track failed publishing attempts

## Step 2: Creating Events in Transaction

### Basic Implementation

```python
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
import json

async def create_order_with_outbox(
    order_data: dict,
    db: AsyncSession
) -> Order:
    """
    Create order and queue event in same database transaction.
    
    This ensures atomicity: Either both order and event are saved,
    or neither is saved.
    """
    async with db.begin():  # Start transaction
        # Step 1: Create order
        order = Order(
            user_id=order_data["user_id"],
            total_amount=order_data["total_amount"],
            items=order_data["items"]
        )
        db.add(order)
        await db.flush()  # Get order.id without committing
        
        # Step 2: Create outbox event (same transaction)
        outbox_event = OutboxEvent(
            event_type="order_created",
            event_data={
                "order_id": order.id,
                "user_id": order.user_id,
                "total_amount": float(order.total_amount),
                "created_at": datetime.utcnow().isoformat()
            },
            processed=False
        )
        db.add(outbox_event)
        
        # Step 3: Commit both together (atomic operation)
        await db.commit()
        
        # Transaction successful = both order and event are saved
        return order
```

**Why this works:**
- Both `Order` and `OutboxEvent` in same transaction
- Database ACID guarantees: All or nothing
- If commit fails, both rollback
- Event only exists if order was created

### Reusable Helper Function

```python
async def add_outbox_event(
    event_type: str,
    event_data: dict,
    db: AsyncSession
) -> OutboxEvent:
    """
    Helper to add outbox event to current transaction.
    
    Use this in any transaction that needs to publish events.
    """
    event = OutboxEvent(
        event_type=event_type,
        event_data=event_data,
        processed=False
    )
    db.add(event)
    return event

# Usage in transaction
async def update_order_status(order_id: int, new_status: str, db: AsyncSession):
    """Update order and queue event."""
    async with db.begin():
        # Update order
        order = await db.get(Order, order_id)
        order.status = new_status
        
        # Add event
        await add_outbox_event(
            event_type="order_status_changed",
            event_data={
                "order_id": order_id,
                "old_status": order.status,
                "new_status": new_status,
                "changed_at": datetime.utcnow().isoformat()
            },
            db=db
        )
        
        await db.commit()
```

## Step 3: Event Processor (Background Worker)

The event processor is a background worker that:
1. Polls for unprocessed events
2. Publishes them to message queue
3. Marks them as processed

### Basic Event Processor

```python
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

logger = logging.getLogger(__name__)

class OutboxEventProcessor:
    """Processes outbox events and publishes them."""
    
    def __init__(
        self,
        db_session_factory,
        message_publisher,
        batch_size: int = 100,
        poll_interval: int = 5
    ):
        self.db_session_factory = db_session_factory
        self.message_publisher = message_publisher
        self.batch_size = batch_size
        self.poll_interval = poll_interval
        self.running = False
    
    async def start(self):
        """Start processing events."""
        self.running = True
        logger.info("Outbox event processor started")
        
        while self.running:
            try:
                await self.process_batch()
            except Exception as e:
                logger.error(f"Error processing outbox events: {e}", exc_info=True)
            
            await asyncio.sleep(self.poll_interval)
    
    async def stop(self):
        """Stop processing events."""
        self.running = False
        logger.info("Outbox event processor stopped")
    
    async def process_batch(self):
        """Process a batch of unprocessed events."""
        async with self.db_session_factory() as db:
            # Query unprocessed events (ordered by creation time)
            stmt = (
                select(OutboxEvent)
                .where(OutboxEvent.processed == False)
                .order_by(OutboxEvent.created_at.asc())
                .limit(self.batch_size)
            )
            
            result = await db.execute(stmt)
            events = result.scalars().all()
            
            if not events:
                return  # No events to process
            
            logger.info(f"Processing {len(events)} outbox events")
            
            for event in events:
                try:
                    await self.process_event(event, db)
                except Exception as e:
                    logger.error(
                        f"Failed to process event {event.id}: {e}",
                        exc_info=True
                    )
                    await self.handle_event_failure(event, e, db)
    
    async def process_event(self, event: OutboxEvent, db: AsyncSession):
        """Process a single outbox event."""
        logger.debug(
            f"Processing event {event.id}: {event.event_type}"
        )
        
        # Publish to message queue
        await self.message_publisher.publish(
            event_type=event.event_type,
            event_data=event.event_data
        )
        
        # Mark as processed
        event.processed = True
        event.processed_at = datetime.utcnow()
        event.retry_count = 0  # Reset retry count on success
        
        await db.commit()
        
        logger.info(f"Event {event.id} published and marked as processed")
    
    async def handle_event_failure(
        self,
        event: OutboxEvent,
        error: Exception,
        db: AsyncSession
    ):
        """Handle event processing failure."""
        event.retry_count += 1
        event.error_message = str(error)[:500]  # Truncate long errors
        
        # Give up after max retries
        MAX_RETRIES = 5
        if event.retry_count >= MAX_RETRIES:
            logger.error(
                f"Event {event.id} failed {MAX_RETRIES} times, giving up"
            )
            event.processed = True  # Mark as processed to stop retrying
            # Could also send to dead letter queue
        
        await db.commit()
```

### Message Publisher Interface

```python
from abc import ABC, abstractmethod

class MessagePublisher(ABC):
    """Interface for publishing events."""
    
    @abstractmethod
    async def publish(self, event_type: str, event_data: dict):
        """Publish event to message queue."""
        pass

class RedisPublisher(MessagePublisher):
    """Publish events to Redis pub/sub."""
    
    def __init__(self, redis_client):
        self.redis = redis_client
    
    async def publish(self, event_type: str, event_data: dict):
        """Publish to Redis channel."""
        import json
        message = json.dumps({
            "event_type": event_type,
            "event_data": event_data,
            "timestamp": datetime.utcnow().isoformat()
        })
        await self.redis.publish(f"events:{event_type}", message)

class RabbitMQPublisher(MessagePublisher):
    """Publish events to RabbitMQ."""
    
    def __init__(self, connection):
        self.connection = connection
    
    async def publish(self, event_type: str, event_data: dict):
        """Publish to RabbitMQ exchange."""
        channel = await self.connection.channel()
        await channel.exchange_declare(
            exchange="events",
            exchange_type="topic"
        )
        
        import json
        message = json.dumps(event_data)
        
        await channel.basic_publish(
            exchange="events",
            routing_key=event_type,  # e.g., "order.created"
            body=message
        )
        await channel.close()
```

## Step 4: Integration with FastAPI

### Starting Processor on Startup

```python
from fastapi import FastAPI
from contextlib import asynccontextmanager
import asyncio

# Global processor instance
outbox_processor = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage outbox processor lifecycle."""
    global outbox_processor
    
    # Startup: Create and start processor
    db_session_factory = lambda: get_async_session()
    redis_client = await get_redis_client()
    message_publisher = RedisPublisher(redis_client)
    
    outbox_processor = OutboxEventProcessor(
        db_session_factory=db_session_factory,
        message_publisher=message_publisher,
        batch_size=100,
        poll_interval=5
    )
    
    # Start processing in background
    processor_task = asyncio.create_task(outbox_processor.start())
    
    yield
    
    # Shutdown: Stop processor
    await outbox_processor.stop()
    processor_task.cancel()
    try:
        await processor_task
    except asyncio.CancelledError:
        pass

app = FastAPI(lifespan=lifespan)
```

### Using Outbox in Routes

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()

@router.post("/orders")
async def create_order(
    order_data: OrderCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create order with outbox event."""
    order = await create_order_with_outbox(
        order_data.dict(),
        db=db
    )
    
    # Event will be published by background processor
    # No need to wait for publication
    
    return {
        "order_id": order.id,
        "status": "created",
        "message": "Order created, notification will be sent shortly"
    }
```

## Step 5: Idempotency and Deduplication

### Preventing Duplicate Events

```python
async def process_event_with_idempotency(
    event: OutboxEvent,
    db: AsyncSession
):
    """Process event with idempotency check."""
    # Check if event was already processed (race condition protection)
    await db.refresh(event)  # Reload from database
    
    if event.processed:
        logger.warning(f"Event {event.id} already processed, skipping")
        return
    
    # Use database lock to prevent concurrent processing
    # SELECT ... FOR UPDATE locks the row
    stmt = (
        select(OutboxEvent)
        .where(
            OutboxEvent.id == event.id,
            OutboxEvent.processed == False
        )
        .with_for_update()  # Row-level lock
    )
    
    locked_event = await db.scalar(stmt)
    if not locked_event:
        return  # Already processed by another worker
    
    # Process event
    await self.message_publisher.publish(
        event_type=locked_event.event_type,
        event_data=locked_event.event_data
    )
    
    locked_event.processed = True
    await db.commit()
```

## Step 6: Monitoring and Observability

### Metrics

```python
from prometheus_client import Counter, Histogram

outbox_events_processed = Counter(
    'outbox_events_processed_total',
    'Total outbox events processed',
    ['event_type', 'status']
)

outbox_processing_duration = Histogram(
    'outbox_processing_duration_seconds',
    'Time to process outbox event',
    ['event_type']
)

async def process_event_with_metrics(
    event: OutboxEvent,
    db: AsyncSession
):
    """Process event with metrics."""
    start_time = time.time()
    
    try:
        await self.process_event(event, db)
        
        outbox_events_processed.labels(
            event_type=event.event_type,
            status="success"
        ).inc()
        
    except Exception as e:
        outbox_events_processed.labels(
            event_type=event.event_type,
            status="failure"
        ).inc()
        raise
    
    finally:
        duration = time.time() - start_time
        outbox_processing_duration.labels(
            event_type=event.event_type
        ).observe(duration)
```

## Benefits of Outbox Pattern

1. **Transactional Consistency**: Events only exist if data transaction succeeded
2. **Reliability**: Events are never lost (stored in database)
3. **Exactly-Once Delivery**: Can implement idempotency
4. **Observability**: Can track which events were published
5. **Error Handling**: Failed events remain for retry

## When to Use Outbox Pattern

**Use when:**
- ✅ Publishing events within transactions
- ✅ Need guaranteed event delivery
- ✅ Event order matters
- ✅ Can't afford event/data inconsistency

**Don't use when:**
- ❌ Events are optional (best-effort is fine)
- ❌ Very high event volume (performance overhead)
- ❌ Simple systems without event-driven architecture

## Summary

Outbox pattern provides:
- ✅ Transactional event publishing
- ✅ Guaranteed consistency
- ✅ Reliable event delivery
- ✅ Error handling and retries

Implement the Outbox pattern to ensure reliable event publishing in your distributed systems!
