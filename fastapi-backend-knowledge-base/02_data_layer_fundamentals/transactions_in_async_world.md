# Transactions in Async World

Managing transactions correctly in async FastAPI applications requires understanding how async context managers and database sessions interact.

## Understanding Transactions

A transaction ensures multiple database operations either all succeed or all fail (ACID properties).

### Basic Transaction Pattern

```python
async def transfer_funds(
    from_account_id: int,
    to_account_id: int,
    amount: Decimal,
    db: AsyncSession
):
    # Start transaction (implicit with session)
    try:
        # Withdraw from source
        from_account = await db.get(Account, from_account_id)
        from_account.balance -= amount
        if from_account.balance < 0:
            raise ValueError("Insufficient funds")
        
        # Deposit to destination
        to_account = await db.get(Account, to_account_id)
        to_account.balance += amount
        
        # Commit transaction
        await db.commit()
        return {"status": "success"}
    
    except Exception:
        # Rollback on error
        await db.rollback()
        raise
```

## Async Transaction Patterns

### 1. **Explicit Transaction Context**

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def transaction(db: AsyncSession):
    """Context manager for explicit transactions"""
    try:
        yield db
        await db.commit()
    except Exception:
        await db.rollback()
        raise

# Usage
async def create_order_with_items(
    order_data: OrderCreate,
    items: List[OrderItemCreate],
    db: AsyncSession
):
    async with transaction(db):
        # Create order
        order = Order(**order_data.dict())
        db.add(order)
        await db.flush()  # Get order.id
        
        # Create items
        for item_data in items:
            item = OrderItem(order_id=order.id, **item_data.dict())
            db.add(item)
        
        # Commit happens automatically in context manager
```

### 2. **Nested Transactions (Savepoints)**

```python
async def process_order(order_id: int, db: AsyncSession):
    try:
        # Outer transaction
        order = await db.get(Order, order_id)
        
        # Nested transaction (savepoint)
        async with db.begin_nested():
            try:
                # Reserve inventory
                await reserve_inventory(order.items, db)
            except InsufficientInventory:
                # Rollback only savepoint
                await db.rollback()
                order.status = "cancelled"
        
        # Continue outer transaction
        await db.commit()
    
    except Exception:
        await db.rollback()
        raise
```

### 3. **Transaction with Retry Logic**

```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10)
)
async def process_with_retry(db: AsyncSession):
    try:
        # Transaction logic
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise

async def update_user_balance(
    user_id: int,
    amount: Decimal,
    db: AsyncSession
):
    await process_with_retry(db)
```

## Testing Transactions

### Test Transaction Isolation

```python
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

@pytest.mark.asyncio
async def test_transaction_rollback(test_db: AsyncSession):
    # Start transaction
    user = User(email="test@example.com", balance=100)
    test_db.add(user)
    await test_db.flush()
    
    # Try invalid operation
    with pytest.raises(ValueError):
        user.balance = -50  # Invalid
        await test_db.commit()
    
    # Rollback should have occurred
    await test_db.rollback()
    
    # Verify no changes persisted
    result = await test_db.get(User, user.id)
    assert result is None  # Transaction rolled back
```

### Test with Database Fixtures

```python
@pytest.fixture
async def db_transaction(test_db: AsyncSession):
    """Fixture that wraps each test in a transaction"""
    async with test_db.begin() as transaction:
        yield test_db
        await transaction.rollback()  # Always rollback test

@pytest.mark.asyncio
async def test_create_user(db_transaction: AsyncSession):
    user = User(email="test@example.com")
    db_transaction.add(user)
    await db_transaction.commit()
    
    # Test will rollback after completion
```

## Common Pitfalls

### 1. **Forgetting to Commit**

```python
# ❌ Bad: No commit
async def create_user(user_data: UserCreate, db: AsyncSession):
    user = User(**user_data.dict())
    db.add(user)
    # Missing: await db.commit()
    return user  # Changes not persisted!

# ✅ Good: Explicit commit
async def create_user(user_data: UserCreate, db: AsyncSession):
    user = User(**user_data.dict())
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
```

### 2. **Exception Handling**

```python
# ❌ Bad: Swallowing exceptions
async def update_user(user_id: int, db: AsyncSession):
    try:
        user = await db.get(User, user_id)
        user.email = "new@example.com"
        await db.commit()
    except Exception:
        pass  # Transaction left hanging!

# ✅ Good: Proper rollback
async def update_user(user_id: int, db: AsyncSession):
    try:
        user = await db.get(User, user_id)
        user.email = "new@example.com"
        await db.commit()
    except Exception:
        await db.rollback()
        raise
```

### 3. **Stale Data After Commit**

```python
# ❌ Bad: Accessing stale data
async def get_user(user_id: int, db: AsyncSession):
    user = await db.get(User, user_id)
    await db.commit()
    print(user.email)  # Might be stale if other transaction updated

# ✅ Good: Refresh or use new session
async def get_user(user_id: int, db: AsyncSession):
    user = await db.get(User, user_id)
    await db.refresh(user)  # Reload from database
    return user
```

## Best Practices

### 1. **Keep Transactions Short**

```python
# ❌ Bad: Long transaction
async def process_order(order_id: int, db: AsyncSession):
    order = await db.get(Order, order_id)
    # ... long processing ...
    await external_api_call()  # Blocks transaction!
    await db.commit()

# ✅ Good: Short transaction
async def process_order(order_id: int, db: AsyncSession):
    order = await db.get(Order, order_id)
    await db.commit()  # Commit early
    
    # Do external calls after commit
    await external_api_call()
```

### 2. **Use Isolation Levels Appropriately**

```python
from sqlalchemy import event
from sqlalchemy.engine import Engine

# Set isolation level
@event.listens_for(Engine, "connect")
def set_isolation_level(dbapi_conn, connection_record):
    dbapi_conn.isolation_level = "READ COMMITTED"  # Default
    # Options: READ UNCOMMITTED, READ COMMITTED, 
    #          REPEATABLE READ, SERIALIZABLE
```

### 3. **Handle Deadlocks**

```python
from sqlalchemy.exc import OperationalError

async def transfer_with_retry(
    from_id: int,
    to_id: int,
    amount: Decimal,
    db: AsyncSession
):
    max_retries = 3
    for attempt in range(max_retries):
        try:
            # Lock rows explicitly
            from_acc = await db.get(Account, from_id, with_for_update=True)
            to_acc = await db.get(Account, to_id, with_for_update=True)
            
            from_acc.balance -= amount
            to_acc.balance += amount
            await db.commit()
            return
            
        except OperationalError as e:
            if "deadlock" in str(e).lower() and attempt < max_retries - 1:
                await db.rollback()
                await asyncio.sleep(0.1 * (attempt + 1))
                continue
            raise
```

## Summary

Async transaction management requires:
- ✅ Understanding async context managers
- ✅ Proper commit/rollback handling
- ✅ Exception handling in transactions
- ✅ Testing transaction behavior
- ✅ Keeping transactions short
- ✅ Handling concurrency issues

Proper transaction management ensures data consistency and prevents common async database issues.

