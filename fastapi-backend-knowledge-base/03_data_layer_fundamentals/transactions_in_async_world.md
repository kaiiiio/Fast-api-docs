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

---

## 🎯 Interview Questions: FastAPI

### Q1: Explain transaction management in async FastAPI applications, including how async transactions work, commit/rollback patterns, exception handling, isolation levels, and best practices. Provide detailed examples showing proper transaction handling.

**Answer:**

**Transaction Management Overview:**

Transactions ensure data consistency by grouping multiple database operations into atomic units. In async FastAPI, transactions require careful handling of async context managers and proper commit/rollback logic.

**Why Transactions:**

**Without Transactions (Inconsistent):**
```python
# ❌ Bad: No transaction
async def transfer_money(from_id: int, to_id: int, amount: float):
    from_acc = await db.get(Account, from_id)
    from_acc.balance -= amount  # Operation 1
    
    to_acc = await db.get(Account, to_id)
    to_acc.balance += amount  # Operation 2
    
    # If error occurs between operations, data inconsistent
```

**With Transactions (Consistent):**
```python
# ✅ Good: Transaction ensures atomicity
async def transfer_money(from_id: int, to_id: int, amount: float):
    try:
        from_acc = await db.get(Account, from_id)
        from_acc.balance -= amount
        
        to_acc = await db.get(Account, to_id)
        to_acc.balance += amount
        
        await db.commit()  # Both operations committed together
    except Exception:
        await db.rollback()  # Both operations rolled back
        raise
```

**Basic Transaction Pattern:**
```python
async def get_db() -> AsyncSession:
    """Dependency with transaction management."""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()  # Commit on success
        except Exception:
            await session.rollback()  # Rollback on error
            raise
        finally:
            await session.close()  # Always cleanup
```

**Exception Handling:**
```python
# ✅ Good: Proper rollback
async def update_user(user_id: int, db: AsyncSession):
    try:
        user = await db.get(User, user_id)
        user.email = "new@example.com"
        await db.commit()
    except Exception:
        await db.rollback()  # Rollback on error
        raise
```

**Isolation Levels:**
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

**Deadlock Handling:**
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
                await asyncio.sleep(0.1 * (attempt + 1))  # Exponential backoff
                continue
            raise
```

**Best Practices:**

**1. Keep Transactions Short:**
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

**2. Use Explicit Locks:**
```python
# Lock rows to prevent concurrent modifications
from_acc = await db.get(Account, from_id, with_for_update=True)
```

**3. Handle Stale Data:**
```python
# Refresh after commit if needed
user = await db.get(User, user_id)
await db.commit()
await db.refresh(user)  # Reload from database
```

**System Design Consideration**: Transaction management provides:
1. **Consistency**: Atomic operations
2. **Isolation**: Prevent concurrent issues
3. **Durability**: Committed changes persist
4. **Reliability**: Proper error handling

Transaction management is essential for data consistency. Understanding async transactions, commit/rollback patterns, exception handling, isolation levels, and best practices is crucial for building reliable applications.

---

### Q2: Explain transaction isolation levels, deadlock handling, nested transactions, and when to use explicit locks. Discuss performance implications and best practices for high-concurrency scenarios.

**Answer:**

**Transaction Isolation Levels:**

**READ UNCOMMITTED:**
```python
# Lowest isolation, fastest
# Can read uncommitted changes
# Dirty reads possible
```

**READ COMMITTED (Default):**
```python
# Can only read committed changes
# Prevents dirty reads
# Non-repeatable reads possible
```

**REPEATABLE READ:**
```python
# Consistent reads within transaction
# Prevents non-repeatable reads
# Phantom reads possible
```

**SERIALIZABLE:**
```python
# Highest isolation, slowest
# Prevents all concurrency issues
# Can cause deadlocks
```

**Deadlock Handling:**
```python
# Retry with exponential backoff
# Lock rows in consistent order
# Use shorter transactions
```

**Explicit Locks:**
```python
# Use when needed to prevent race conditions
from_acc = await db.get(Account, from_id, with_for_update=True)
```

**System Design Consideration**: Transaction isolation requires:
1. **Balance**: Isolation vs performance
2. **Deadlock Prevention**: Consistent lock order
3. **Performance**: Shorter transactions
4. **Monitoring**: Track deadlocks

Understanding isolation levels, deadlock handling, and explicit locks is essential for high-concurrency scenarios. Always balance isolation with performance and implement proper deadlock handling.


