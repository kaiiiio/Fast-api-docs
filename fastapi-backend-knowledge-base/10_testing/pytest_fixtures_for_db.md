# Pytest Fixtures for Database Testing: Complete Guide

Proper fixtures make database testing clean, efficient, and isolated. This comprehensive guide covers fixture patterns, transaction management, and best practices for async database testing.

## Understanding Test Fixtures

**What are fixtures?**
Reusable setup/teardown code that prepares test environment and cleans up afterwards.

**Benefits:**
- DRY (Don't Repeat Yourself)
- Consistent test environment
- Automatic cleanup
- Isolated tests

**Fixture scopes:**
- `function`: New fixture per test (default)
- `class`: One fixture per test class
- `module`: One fixture per test module
- `session`: One fixture per test session

## Step 1: Database Engine Fixture

### Session-Scoped Engine

```python
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine
from sqlalchemy.pool import StaticPool

@pytest.fixture(scope="session")
async def test_engine() -> AsyncEngine:
    """
    Create test database engine (session-scoped).
    
    Created once per test session, shared across all tests.
    """
    # Use in-memory SQLite for fast tests, or separate test database
    TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
    
    # Or use PostgreSQL test database
    # TEST_DATABASE_URL = "postgresql+asyncpg://test:test@localhost/test_db"
    
    engine = create_async_engine(
        TEST_DATABASE_URL,
        poolclass=StaticPool,  # Single connection for in-memory
        connect_args={"check_same_thread": False},  # For SQLite
        echo=False  # Don't echo SQL in tests
    )
    
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    # Cleanup: Drop all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()

# For PostgreSQL - use separate test database
@pytest.fixture(scope="session")
async def postgres_test_engine() -> AsyncEngine:
    """Test engine using PostgreSQL."""
    TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL")
    
    engine = create_async_engine(
        TEST_DATABASE_URL,
        pool_pre_ping=True,
        echo=False
    )
    
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    # Cleanup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()
```

## Step 2: Database Session Fixtures

### Basic Session Fixture

```python
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

@pytest.fixture
async def db_session(test_engine: AsyncEngine) -> AsyncSession:
    """
    Create database session for each test.
    
    Automatically cleaned up after test.
    """
    async_session_maker = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False
    )
    
    async with async_session_maker() as session:
        yield session
        # Cleanup: Rollback any uncommitted changes
        await session.rollback()
```

### Transaction-Based Session (Isolated Tests)

```python
@pytest.fixture
async def db_session_transaction(test_engine: AsyncEngine) -> AsyncSession:
    """
    Session with transaction that always rolls back.
    
    Each test runs in isolated transaction that never commits.
    """
    # Create connection
    connection = await test_engine.connect()
    
    # Begin transaction
    transaction = await connection.begin()
    
    # Create session bound to connection
    session = AsyncSession(bind=connection)
    
    yield session
    
    # Cleanup: Always rollback
    await session.close()
    await transaction.rollback()
    await connection.close()

# Usage
@pytest.mark.asyncio
async def test_create_user(db_session_transaction: AsyncSession):
    """Test with transaction rollback."""
    repo = UserRepository(db_session_transaction)
    user = await repo.create(email="test@example.com")
    
    # Changes will be rolled back after test
    assert user.id is not None
```

## Step 3: Clean Database Fixture

### Reset Database Between Tests

```python
@pytest.fixture
async def clean_db(db_session: AsyncSession) -> AsyncSession:
    """
    Clean database before each test.
    
    Deletes all data from all tables.
    """
    # Delete all data (respect foreign key constraints)
    # Delete in reverse order of dependencies
    for table in reversed(Base.metadata.sorted_tables):
        await db_session.execute(delete(table))
    
    await db_session.commit()
    
    yield db_session

# Alternative: Truncate (faster)
@pytest.fixture
async def clean_db_truncate(db_session: AsyncSession) -> AsyncSession:
    """Clean database using TRUNCATE (faster than DELETE)."""
    # Disable foreign key checks temporarily
    await db_session.execute(text("SET session_replication_role = 'replica'"))
    
    for table in Base.metadata.sorted_tables:
        await db_session.execute(text(f"TRUNCATE TABLE {table.name} CASCADE"))
    
    await db_session.execute(text("SET session_replication_role = 'origin'"))
    await db_session.commit()
    
    yield db_session
```

## Step 4: Test Data Fixtures

### Factory Fixtures

```python
@pytest.fixture
async def test_user(db_session: AsyncSession) -> User:
    """Create test user fixture."""
    user = User(
        email="test@example.com",
        name="Test User",
        is_active=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    
    return user

@pytest.fixture
async def test_users(db_session: AsyncSession) -> List[User]:
    """Create multiple test users."""
    users = [
        User(email=f"user{i}@example.com", name=f"User {i}")
        for i in range(5)
    ]
    db_session.add_all(users)
    await db_session.commit()
    
    for user in users:
        await db_session.refresh(user)
    
    return users

# Usage
@pytest.mark.asyncio
async def test_get_user(db_session: AsyncSession, test_user: User):
    """Test with pre-created user."""
    repo = UserRepository(db_session)
    found_user = await repo.get_by_id(test_user.id)
    
    assert found_user.id == test_user.id
    assert found_user.email == test_user.email
```

### Factory Pattern

```python
class UserFactory:
    """Factory for creating test users."""
    
    @staticmethod
    async def create(
        db: AsyncSession,
        email: Optional[str] = None,
        name: Optional[str] = None,
        **kwargs
    ) -> User:
        """Create user with defaults."""
        user = User(
            email=email or f"user_{uuid.uuid4().hex[:8]}@example.com",
            name=name or "Test User",
            **kwargs
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user
    
    @staticmethod
    async def create_batch(
        db: AsyncSession,
        count: int,
        **defaults
    ) -> List[User]:
        """Create multiple users."""
        users = []
        for i in range(count):
            user = await UserFactory.create(
                db,
                email=f"user{i}@example.com",
                **defaults
            )
            users.append(user)
        return users

# Usage
@pytest.mark.asyncio
async def test_with_factory(db_session: AsyncSession):
    """Test using factory."""
    user = await UserFactory.create(db_session, email="custom@example.com")
    assert user.email == "custom@example.com"
```

## Step 5: Repository Fixture

### Repository with Database

```python
@pytest.fixture
def user_repository(db_session: AsyncSession) -> UserRepository:
    """Create user repository with test session."""
    return UserRepository(db_session)

# Usage
@pytest.mark.asyncio
async def test_repository_method(user_repository: UserRepository):
    """Test repository methods."""
    user = await user_repository.create(
        email="test@example.com",
        name="Test"
    )
    assert user.id is not None
```

## Step 6: Client Fixture (FastAPI)

### Test Client with Database

```python
from fastapi.testclient import TestClient
from httpx import AsyncClient

@pytest.fixture
def client(test_engine: AsyncEngine) -> TestClient:
    """Create FastAPI test client."""
    # Override database dependency
    def override_get_db():
        async_session_maker = async_sessionmaker(
            test_engine,
            class_=AsyncSession,
            expire_on_commit=False
        )
        return async_session_maker()
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    # Cleanup
    app.dependency_overrides.clear()

# Async client (for async endpoints)
@pytest.fixture
async def async_client(test_engine: AsyncEngine) -> AsyncClient:
    """Create async FastAPI test client."""
    async def override_get_db():
        async_session_maker = async_sessionmaker(
            test_engine,
            class_=AsyncSession,
            expire_on_commit=False
        )
        async with async_session_maker() as session:
            yield session
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client
    
    app.dependency_overrides.clear()
```

## Step 7: Advanced Fixture Patterns

### Fixture with Setup/Teardown

```python
@pytest.fixture
async def setup_test_data(db_session: AsyncSession):
    """Setup test data before tests."""
    # Setup
    users = await UserFactory.create_batch(db_session, count=10)
    products = await ProductFactory.create_batch(db_session, count=5)
    
    yield {
        "users": users,
        "products": products
    }
    
    # Teardown (optional - transaction rollback handles it)

# Usage
@pytest.mark.asyncio
async def test_with_setup(db_session: AsyncSession, setup_test_data: dict):
    """Test with pre-setup data."""
    users = setup_test_data["users"]
    assert len(users) == 10
```

### Parameterized Fixtures

```python
@pytest.fixture(params=["sqlite", "postgresql"])
async def database_engine(request):
    """Test with different databases."""
    if request.param == "sqlite":
        engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    else:
        engine = create_async_engine(TEST_POSTGRES_URL)
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

# This test runs with both databases
@pytest.mark.asyncio
async def test_works_with_all_databases(database_engine: AsyncEngine):
    """Test that works with multiple databases."""
    # Test implementation
    pass
```

## Step 8: Complete Fixture Setup

### Production-Ready Fixture Configuration

```python
# conftest.py
import pytest
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool

# Configuration
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", "sqlite+aiosqlite:///:memory:")

@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def test_engine():
    """Test database engine."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        poolclass=StaticPool,
        echo=False
    )
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest.fixture
async def db_session(test_engine) -> AsyncSession:
    """Database session with transaction rollback."""
    connection = await test_engine.connect()
    transaction = await connection.begin()
    
    session = AsyncSession(bind=connection)
    
    yield session
    
    await session.close()
    await transaction.rollback()
    await connection.close()

@pytest.fixture
def client(test_engine) -> TestClient:
    """FastAPI test client."""
    def override_get_db():
        async_session_maker = async_sessionmaker(
            test_engine,
            class_=AsyncSession,
            expire_on_commit=False
        )
        async def _get_db():
            async with async_session_maker() as session:
                yield session
        
        return _get_db()
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()
```

## Best Practices

1. **✅ Use transactions**: Rollback for isolation
2. **✅ Clean between tests**: Fresh state per test
3. **✅ Scope appropriately**: Session for engine, function for sessions
4. **✅ Use factories**: Create test data easily
5. **✅ Override dependencies**: Replace real DB with test DB

## Summary

Database fixtures provide:
- ✅ Clean test environment
- ✅ Isolated tests
- ✅ Automatic cleanup
- ✅ Reusable test data

Implement comprehensive fixtures for reliable database testing!
