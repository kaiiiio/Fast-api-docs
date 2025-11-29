# Task Idempotency and Deduplication: Complete Guide

Ensuring tasks are idempotent and preventing duplicates is critical for reliable, distributed systems. This guide covers comprehensive strategies for idempotency and deduplication.

## Understanding Idempotency

**What is idempotency?**
An idempotent operation produces the same result regardless of how many times it's executed with the same inputs.

**Mathematical analogy:**
- `f(f(x)) = f(x)` - Applying the function twice equals applying it once
- Example: `abs(abs(-5)) = abs(-5) = 5`

**Why it matters:**
- Tasks might be retried
- Network issues cause duplicate requests
- Race conditions in distributed systems
- Users accidentally clicking twice

## Idempotency Patterns

### Pattern 1: Database Upsert (Idempotent by Design)

```python
@celery_app.task
def update_user_score(user_id: int, points: int):
    """
    Idempotent: Uses database operations that are naturally idempotent.
    
    Database UPDATE is idempotent - running it multiple times
    with same values produces same result.
    """
    db.execute(
        "UPDATE users SET score = score + %s WHERE id = %s",
        (points, user_id)
    )
    # Safe to retry! Multiple executions = same result
```

**Why this is idempotent:**
- Adding points multiple times = correct total
- Database guarantees consistency
- No side effects beyond database update

### Pattern 2: Check-Before-Execute

```python
@celery_app.task
def send_notification(user_id: int, notification_id: str, message: str):
    """
    Idempotent: Checks if already sent before sending.
    
    Uses notification_id as idempotency key.
    """
    # Check if already sent
    if db.execute(
        "SELECT id FROM notifications WHERE notification_id = %s",
        (notification_id,)
    ).first():
        logger.info(f"Notification {notification_id} already sent, skipping")
        return "Already sent"  # Same result as if we sent it
    
    # Send notification
    send_notification_logic(user_id, message)
    
    # Mark as sent
    db.execute(
        "INSERT INTO notifications (notification_id, user_id, sent_at) VALUES (%s, %s, NOW())",
        (notification_id, user_id)
    )
    
    return "Sent"
```

**Idempotency guarantee:**
- First execution: Sends notification, stores record
- Subsequent executions: Finds existing record, returns "Already sent"
- Same input → Same output

### Pattern 3: Idempotency Keys

```python
import hashlib
import json

def generate_idempotency_key(task_name: str, **kwargs) -> str:
    """
    Generate idempotency key from task arguments.
    
    Same arguments = same key = same result.
    """
    # Sort kwargs for consistent hashing
    sorted_kwargs = json.dumps(kwargs, sort_keys=True)
    
    # Create hash
    key_data = f"{task_name}:{sorted_kwargs}"
    return hashlib.md5(key_data.encode()).hexdigest()

@celery_app.task(bind=True)
def process_payment_task(self, payment_id: int, amount: float):
    """
    Idempotent payment processing with idempotency key.
    """
    # Generate idempotency key
    idempotency_key = generate_idempotency_key(
        'process_payment',
        payment_id=payment_id,
        amount=amount
    )
    
    # Check if already processed
    existing = db.execute(
        "SELECT result FROM payment_results WHERE idempotency_key = %s",
        (idempotency_key,)
    ).first()
    
    if existing:
        logger.info(f"Payment {payment_id} already processed (key: {idempotency_key})")
        return existing.result  # Return cached result
    
    # Process payment
    result = payment_gateway.charge(payment_id, amount)
    
    # Store result
    db.execute(
        """
        INSERT INTO payment_results 
        (idempotency_key, payment_id, result, created_at) 
        VALUES (%s, %s, %s, NOW())
        """,
        (idempotency_key, payment_id, json.dumps(result))
    )
    
    return result
```

## Deduplication Strategies

### Strategy 1: Redis-Based Deduplication

```python
from redis import Redis
import json

redis_client = Redis()

@celery_app.task(bind=True)
def process_order(self, order_id: int):
    """
    Prevent duplicate task execution using Redis locks.
    """
    lock_key = f"task:process_order:{order_id}"
    lock_ttl = 3600  # Lock expires after 1 hour
    
    # Try to acquire lock (nx=True means "set if not exists")
    acquired = redis_client.set(
        lock_key,
        self.request.id,  # Store task ID
        nx=True,  # Only set if key doesn't exist
        ex=lock_ttl  # Expire after TTL
    )
    
    if not acquired:
        # Lock already exists - another task is processing
        existing_task_id = redis_client.get(lock_key)
        logger.warning(
            f"Order {order_id} already being processed by task {existing_task_id}"
        )
        raise Exception(f"Task already running for order {order_id}")
    
    try:
        # Process order
        result = process_order_logic(order_id)
        return result
    
    finally:
        # Release lock
        # Verify we own the lock before releasing
        if redis_client.get(lock_key) == self.request.id.encode():
            redis_client.delete(lock_key)
```

### Strategy 2: Database-Based Deduplication

```python
from sqlalchemy.exc import IntegrityError

class TaskExecution(Base):
    """Track task executions to prevent duplicates."""
    __tablename__ = "task_executions"
    
    id = Column(Integer, primary_key=True)
    task_name = Column(String(100), nullable=False)
    task_key = Column(String(255), nullable=False, unique=True)  # Unique constraint
    status = Column(String(20), default='processing')
    result = Column(JSON, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

@celery_app.task(bind=True)
def process_with_dedup(self, data: dict):
    """Process with database-based deduplication."""
    # Create unique key from task arguments
    task_key = f"{self.name}:{hash(json.dumps(data, sort_keys=True))}"
    
    try:
        # Try to create execution record (unique constraint prevents duplicates)
        execution = TaskExecution(
            task_name=self.name,
            task_key=task_key,
            status='processing'
        )
        db.add(execution)
        db.commit()
        
    except IntegrityError:
        # Record already exists - duplicate task
        db.rollback()
        existing = db.query(TaskExecution).filter_by(task_key=task_key).first()
        
        if existing.status == 'completed':
            logger.info(f"Task {task_key} already completed, returning cached result")
            return existing.result
        
        elif existing.status == 'processing':
            logger.warning(f"Task {task_key} already in progress")
            raise Exception("Task already being processed")
    
    try:
        # Execute task
        result = process_data(data)
        
        # Update execution record
        execution.status = 'completed'
        execution.result = result
        execution.completed_at = datetime.utcnow()
        db.commit()
        
        return result
    
    except Exception as e:
        # Mark as failed
        execution.status = 'failed'
        execution.result = {"error": str(e)}
        execution.completed_at = datetime.utcnow()
        db.commit()
        raise
```

### Strategy 3: Message Queue Deduplication

```python
@celery_app.task(bind=True)
def process_with_message_dedup(self, data: dict):
    """Use message queue's built-in deduplication."""
    # Generate deduplication key
    dedup_key = hashlib.md5(
        json.dumps(data, sort_keys=True).encode()
    ).hexdigest()
    
    # Some brokers (like SQS) support message deduplication
    # For Redis, we implement our own:
    
    seen_key = f"seen_message:{dedup_key}"
    
    # Check if message already processed
    if redis_client.get(seen_key):
        logger.info(f"Message {dedup_key} already processed, skipping")
        return "Duplicate message skipped"
    
    # Process message
    result = process_data(data)
    
    # Mark as seen (expire after 24 hours)
    redis_client.setex(seen_key, 86400, "1")
    
    return result
```

## Combining Idempotency and Deduplication

### Complete Example: Payment Processing

```python
@celery_app.task(bind=True, max_retries=3)
def process_payment_complete(
    self,
    payment_id: int,
    amount: float,
    idempotency_key: str
):
    """
    Complete payment processing with both idempotency and deduplication.
    """
    # Step 1: Deduplication - prevent concurrent execution
    lock_key = f"lock:payment:{payment_id}"
    lock_acquired = redis_client.set(
        lock_key,
        self.request.id,
        nx=True,
        ex=300  # 5 minute lock
    )
    
    if not lock_acquired:
        existing_task = redis_client.get(lock_key)
        logger.warning(f"Payment {payment_id} locked by task {existing_task}")
        raise Exception("Payment processing already in progress")
    
    try:
        # Step 2: Idempotency - check if already processed
        existing_result = db.execute(
            """
            SELECT result, status FROM payment_processing_log 
            WHERE idempotency_key = %s
            """,
            (idempotency_key,)
        ).first()
        
        if existing_result:
            if existing_result.status == 'completed':
                logger.info(f"Payment already processed (idempotency_key: {idempotency_key})")
                return existing_result.result
            
            elif existing_result.status == 'processing':
                logger.warning(f"Payment still processing (idempotency_key: {idempotency_key})")
                raise Exception("Payment processing in progress")
        
        # Step 3: Mark as processing
        db.execute(
            """
            INSERT INTO payment_processing_log 
            (idempotency_key, payment_id, status, started_at)
            VALUES (%s, %s, 'processing', NOW())
            """,
            (idempotency_key, payment_id)
        )
        db.commit()
        
        # Step 4: Process payment (idempotent operation)
        result = payment_gateway.charge(
            payment_id=payment_id,
            amount=amount,
            idempotency_key=idempotency_key  # Gateway also checks idempotency
        )
        
        # Step 5: Store result
        db.execute(
            """
            UPDATE payment_processing_log 
            SET status = 'completed', result = %s, completed_at = NOW()
            WHERE idempotency_key = %s
            """,
            (json.dumps(result), idempotency_key)
        )
        db.commit()
        
        return result
    
    except PaymentGatewayError as exc:
        # Update status
        db.execute(
            """
            UPDATE payment_processing_log 
            SET status = 'failed', error = %s, completed_at = NOW()
            WHERE idempotency_key = %s
            """,
            (str(exc), idempotency_key)
        )
        db.commit()
        
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)
    
    finally:
        # Release lock
        if redis_client.get(lock_key) == self.request.id.encode():
            redis_client.delete(lock_key)
```

## Best Practices

1. **Use idempotency keys**: Generate keys from task inputs
2. **Store results**: Cache results for idempotency checks
3. **Use locks for deduplication**: Prevent concurrent execution
4. **Set appropriate TTLs**: Clean up old locks and cache
5. **Log duplicate attempts**: Monitor for issues
6. **Test idempotency**: Verify tasks are truly idempotent

## Testing Idempotency

```python
def test_task_idempotency():
    """Test that task is idempotent."""
    task_id = "test_task_123"
    data = {"key": "value"}
    
    # Execute task first time
    result1 = process_task.delay(task_id, data).get()
    
    # Execute task second time with same inputs
    result2 = process_task.delay(task_id, data).get()
    
    # Results should be identical
    assert result1 == result2
    
    # Verify no duplicate side effects
    executions = db.query(TaskExecution).filter_by(task_key=task_id).all()
    assert len(executions) == 1  # Only one execution record
```

## Summary

Idempotency and deduplication ensure:
- ✅ Safe task retries
- ✅ Prevention of duplicate processing
- ✅ Consistent results
- ✅ Reliable distributed systems

Implement these patterns for production-ready task processing!
