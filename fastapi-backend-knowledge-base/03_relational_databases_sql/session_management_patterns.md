# Session Management Patterns

Proper session management is critical for database operations in FastAPI. This guide covers different session management patterns and when to use each.

## Request-Scoped Sessions (Recommended)

### Pattern: One Session Per HTTP Request

```python
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def get_db() -> AsyncSession:
    """Dependency for database session"""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

# Usage in routes
@app.get("/users/{user_id}")
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    user = await db.get(User, user_id)
    return user  # Session automatically closed after response
```

**Benefits:**
- ✅ Automatic cleanup after request
- ✅ Transaction isolation per request
- ✅ No connection leaks
- ✅ Works well with async FastAPI

## Long-Lived Sessions (Avoid)

### Anti-Pattern: Global Session

```python
# ❌ Bad: Global session
global_session = None

@app.on_event("startup")
async def startup():
    global global_session
    global_session = async_session_maker()

@app.get("/users/{user_id}")
async def get_user(user_id: int):
    user = await global_session.get(User, user_id)
    return user
```

**Problems:**
- ❌ Connection never returned to pool
- ❌ Stale data (no refresh)
- ❌ Thread safety issues
- ❌ Connection exhaustion

## Session Per Service Pattern

### Pattern: Create Session in Service

```python
class UserService:
    def __init__(self, session_factory: async_sessionmaker):
        self.session_factory = session_factory
    
    async def get_user(self, user_id: int):
        async with self.session_factory() as session:
            user = await session.get(User, user_id)
            return user
    
    async def create_user(self, user_data: dict):
        async with self.session_factory() as session:
            user = User(**user_data)
            session.add(user)
            await session.commit()
            return user
```

**Use when:**
- Services need independent transactions
- Multiple services in one request
- Background tasks

## Nested Session Pattern

### Pattern: Session Within Session

```python
async def get_db() -> AsyncSession:
    """Primary session"""
    async with async_session_maker() as session:
        yield session

async def create_order_with_items(
    order_data: OrderCreate,
    items: List[OrderItemCreate],
    db: AsyncSession = Depends(get_db)
):
    # Primary transaction
    order = Order(**order_data.dict())
    db.add(order)
    await db.flush()  # Get order.id
    
    # Items in same transaction
    for item_data in items:
        item = OrderItem(order_id=order.id, **item_data.dict())
        db.add(item)
    
    await db.commit()  # All or nothing
    return order
```

## Context Manager Pattern

### Pattern: Explicit Session Context

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def db_session():
    """Context manager for explicit session control"""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

# Usage
async def complex_operation():
    async with db_session() as session:
        # Multiple operations
        user = User(email="test@example.com")
        session.add(user)
        await session.flush()
        
        order = Order(user_id=user.id)
        session.add(order)
        # Commit happens automatically on exit
```

## Unit of Work Pattern

### Pattern: Track All Changes, Commit Together

```python
class UnitOfWork:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.committed = False
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if exc_type is None:
            await self.commit()
        else:
            await self.rollback()
    
    async def commit(self):
        await self.session.commit()
        self.committed = True
    
    async def rollback(self):
        await self.session.rollback()
    
    def add(self, instance):
        self.session.add(instance)
    
    def delete(self, instance):
        await self.session.delete(instance)

# Usage
async def create_order_with_payment(
    order_data: OrderCreate,
    payment_data: PaymentCreate,
    db: AsyncSession = Depends(get_db)
):
    async with UnitOfWork(db) as uow:
        order = Order(**order_data.dict())
        uow.add(order)
        await db.flush()
        
        payment = Payment(order_id=order.id, **payment_data.dict())
        uow.add(payment)
        
        # All changes committed together
        # Or all rolled back if error
```

## Repository Pattern with Session

### Pattern: Repository Owns Session

```python
class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def get_by_id(self, user_id: int) -> Optional[User]:
        result = await self.session.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()
    
    async def create(self, user_data: dict) -> User:
        user = User(**user_data)
        self.session.add(user)
        await self.session.flush()
        await self.session.refresh(user)
        return user
    
    async def commit(self):
        await self.session.commit()
    
    async def rollback(self):
        await self.session.rollback()

# Usage with service
class UserService:
    def __init__(self, session: AsyncSession):
        self.repo = UserRepository(session)
    
    async def create_user(self, user_data: dict):
        user = await self.repo.create(user_data)
        await self.repo.commit()  # Explicit commit
        return user
```

## Session Scoping Strategies

### 1. Request-Scoped (Most Common)

```python
# One session per HTTP request
async def get_db() -> AsyncSession:
    async with async_session_maker() as session:
        yield session
        # Session closed after response
```

### 2. Operation-Scoped

```python
# New session for each operation
async def get_user(user_id: int):
    async with async_session_maker() as session:
        return await session.get(User, user_id)
```

### 3. Transaction-Scoped

```python
# Session tied to business transaction
async def process_order(order_id: int):
    async with async_session_maker() as session:
        # Multiple operations, one transaction
        order = await session.get(Order, order_id)
        # ... process order ...
        await session.commit()
```

## Best Practices

### 1. **Always Use Request-Scoped for API Routes**

```python
# ✅ Good: Request-scoped
@app.get("/users/{user_id}")
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    return await db.get(User, user_id)

# ❌ Bad: Creating new session in route
@app.get("/users/{user_id}")
async def get_user(user_id: int):
    async with async_session_maker() as session:
        return await session.get(User, user_id)
```

### 2. **Commit or Rollback Explicitly**

```python
# ✅ Good: Explicit transaction management
async def get_db() -> AsyncSession:
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

# ❌ Bad: Letting session close without commit
async def get_db() -> AsyncSession:
    async with async_session_maker() as session:
        yield session
        # No commit/rollback!
```

### 3. **Don't Share Sessions Across Requests**

```python
# ❌ Bad: Shared session
shared_session = async_session_maker()

@app.get("/users/{user_id}")
async def get_user(user_id: int):
    return await shared_session.get(User, user_id)
    # Session shared across all requests - thread safety issues!
```

### 4. **Use Session for Single Request Only**

```python
# ✅ Good: Session used once per request
@app.get("/users/{user_id}")
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    user = await db.get(User, user_id)
    return user  # Session closed

# ❌ Bad: Session used across multiple requests
stored_session = None

async def get_db() -> AsyncSession:
    global stored_session
    if stored_session is None:
        stored_session = async_session_maker()
    return stored_session
```

## Testing Patterns

### Test with Transaction Rollback

```python
@pytest.fixture
async def db_session():
    """Session that rolls back after test"""
    async with async_session_maker() as session:
        async with session.begin() as transaction:
            yield session
            await transaction.rollback()

@pytest.mark.asyncio
async def test_create_user(db_session: AsyncSession):
    user = User(email="test@example.com")
    db_session.add(user)
    await db_session.commit()
    
    # Test will rollback, no cleanup needed
```

### Test with Fresh Session Per Test

```python
@pytest.fixture
async def db():
    """Fresh session for each test"""
    async with async_session_maker() as session:
        yield session
        await session.close()

@pytest.mark.asyncio
async def test_user_operations(db: AsyncSession):
    # Each test gets fresh session
    user = User(email="test@example.com")
    db.add(user)
    await db.commit()
```

## Summary

**Recommended Pattern: Request-Scoped Sessions**
- ✅ One session per HTTP request
- ✅ Automatic cleanup
- ✅ Transaction isolation
- ✅ Works well with FastAPI dependency injection

**Key Principles:**
1. Always commit or rollback explicitly
2. Don't share sessions across requests
3. Use dependency injection for session management
4. Let FastAPI manage session lifecycle
5. Test with transaction rollback

The request-scoped pattern with dependency injection is the most maintainable and safe approach for FastAPI applications.

