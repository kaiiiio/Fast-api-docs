# Integration Testing with Test Database

Integration tests verify that multiple components work together correctly. This guide teaches you how to set up a test database and write integration tests for your FastAPI application.

## Understanding Integration Tests

**What are integration tests?**
Tests that verify multiple components work together (database, services, repositories).

**Difference from unit tests:**
- Unit tests: Mock everything, test in isolation
- Integration tests: Use real database, test interactions

**When to use:**
- Test database queries work correctly
- Test transactions behave properly
- Test relationships between components
- Verify end-to-end flows

## Step 1: Setting Up Test Database

### Configuration

```python
# tests/conftest.py
import pytest
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.db.base import Base
from app.main import app

# Test database URL (separate from production)
TEST_DATABASE_URL = "postgresql+asyncpg://test_user:test_password@localhost:5432/test_db"

# Create test engine
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,  # Don't log in tests
    pool_pre_ping=True
)

# Test session factory
test_session_maker = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False
)

@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def setup_test_db():
    """Create test database tables."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield
    
    # Cleanup: Drop all tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await test_engine.dispose()

@pytest.fixture
async def db_session(setup_test_db):
    """Create a database session for each test."""
    async with test_session_maker() as session:
        yield session
        await session.rollback()  # Rollback any uncommitted changes
```

**Understanding the setup:**
- `scope="session"`: Run once for all tests (create/drop tables)
- `scope="function"`: Run for each test (fresh session)
- Rollback after each test keeps database clean

## Step 2: Basic Integration Tests

Let's test our repository with a real database:

```python
# tests/integration/test_user_repository.py
import pytest
from app.repositories.user_repository import UserRepository
from app.models import User

@pytest.mark.asyncio
async def test_create_user(db_session: AsyncSession):
    """Test creating a user in the database."""
    repo = UserRepository(db_session)
    
    # Act
    user = await repo.create(
        email="test@example.com",
        full_name="Test User"
    )
    
    await db_session.commit()
    
    # Assert
    assert user.id is not None
    assert user.email == "test@example.com"
    
    # Verify it's actually in the database
    found = await repo.get_by_id(user.id)
    assert found is not None
    assert found.email == "test@example.com"

@pytest.mark.asyncio
async def test_get_user_by_email(db_session: AsyncSession):
    """Test finding user by email."""
    repo = UserRepository(db_session)
    
    # Arrange: Create user first
    created = await repo.create(
        email="findme@example.com",
        full_name="Find Me"
    )
    await db_session.commit()
    
    # Act
    found = await repo.get_by_email("findme@example.com")
    
    # Assert
    assert found is not None
    assert found.id == created.id
    assert found.email == "findme@example.com"
```

## Step 3: Testing Transactions

Test that transactions work correctly:

```python
@pytest.mark.asyncio
async def test_order_creation_transaction(db_session: AsyncSession):
    """Test that order creation is atomic (all or nothing)."""
    from app.repositories.order_repository import OrderRepository
    from app.repositories.product_repository import ProductRepository
    from app.repositories.user_repository import UserRepository
    
    user_repo = UserRepository(db_session)
    product_repo = ProductRepository(db_session)
    order_repo = OrderRepository(db_session)
    
    # Arrange: Create user and product
    user = await user_repo.create(email="test@example.com", full_name="Test")
    product = await product_repo.create(
        name="Laptop",
        price=100.0,
        category_id=1,
        stock_quantity=10
    )
    await db_session.commit()
    
    # Act: Create order (should update stock)
    order = await order_repo.create_order(
        user_id=user.id,
        items=[{"product_id": product.id, "quantity": 2}]
    )
    
    await db_session.commit()
    
    # Assert: Verify stock was reduced
    await db_session.refresh(product)
    assert product.stock_quantity == 8  # 10 - 2 = 8
    
    # Verify order exists
    found_order = await order_repo.get_by_id(order.id)
    assert found_order is not None
    assert found_order.total_amount == 200.0

@pytest.mark.asyncio
async def test_order_rollback_on_error(db_session: AsyncSession):
    """Test that transaction rolls back on error."""
    # This test verifies atomicity
    # If any part fails, nothing should be saved
    pass  # Implementation similar to above but with error
```

## Step 4: Testing with FastAPI TestClient

Test your API endpoints with real database:

```python
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def client(db_session: AsyncSession):
    """Create test client with database override."""
    def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_create_user_endpoint(client: TestClient):
    """Test user creation endpoint."""
    # Act
    response = client.post(
        "/api/v1/users/",
        json={
            "email": "newuser@example.com",
            "full_name": "New User",
            "age": 25
        }
    )
    
    # Assert
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert "id" in data

@pytest.mark.asyncio
async def test_get_user_endpoint(client: TestClient, db_session: AsyncSession):
    """Test getting user endpoint."""
    # Arrange: Create user first
    repo = UserRepository(db_session)
    user = await repo.create(
        email="getme@example.com",
        full_name="Get Me"
    )
    await db_session.commit()
    
    # Act
    response = client.get(f"/api/v1/users/{user.id}")
    
    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == user.id
    assert data["email"] == "getme@example.com"
```

## Summary

Integration testing provides:
- ✅ Confidence that components work together
- ✅ Real database behavior verification
- ✅ Transaction testing
- ✅ End-to-end flow validation

Use integration tests alongside unit tests for comprehensive coverage!

