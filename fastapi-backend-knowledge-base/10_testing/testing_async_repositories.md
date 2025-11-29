# Testing Async Repositories: Complete Guide

Testing async repositories requires proper async test setup, mocking strategies, and integration patterns. This guide covers comprehensive testing approaches for repository layers.

## Understanding Repository Testing

**What to test:**
- CRUD operations
- Query methods
- Filters and pagination
- Error handling
- Edge cases

**Testing approaches:**
- Unit tests (mocked database)
- Integration tests (real database)
- Both (comprehensive coverage)

## Step 1: Basic Repository Test Structure

### Test Setup

```python
import pytest
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession

@pytest.fixture
def mock_db_session() -> AsyncSession:
    """Mock database session for unit tests."""
    session = AsyncMock(spec=AsyncSession)
    return session

@pytest.fixture
async def db_session(test_engine) -> AsyncSession:
    """Real database session for integration tests."""
    async_session_maker = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False
    )
    async with async_session_maker() as session:
        yield session
        await session.rollback()
```

### Basic CRUD Tests

```python
from app.repositories.user_repository import UserRepository

class TestUserRepository:
    """Test suite for UserRepository."""
    
    @pytest.mark.asyncio
    async def test_create_user(self, db_session: AsyncSession):
        """Test creating a user."""
        repo = UserRepository(db_session)
        
        user = await repo.create(
            email="test@example.com",
            name="Test User"
        )
        
        assert user.id is not None
        assert user.email == "test@example.com"
        assert user.name == "Test User"
        
        # Verify in database
        found = await db_session.get(User, user.id)
        assert found is not None
        assert found.email == user.email
    
    @pytest.mark.asyncio
    async def test_get_user_by_id(self, db_session: AsyncSession):
        """Test getting user by ID."""
        repo = UserRepository(db_session)
        
        # Create test user
        user = await repo.create(
            email="test@example.com",
            name="Test User"
        )
        await db_session.commit()
        
        # Get user
        found = await repo.get_by_id(user.id)
        
        assert found is not None
        assert found.id == user.id
        assert found.email == user.email
    
    @pytest.mark.asyncio
    async def test_get_user_not_found(self, db_session: AsyncSession):
        """Test getting non-existent user."""
        repo = UserRepository(db_session)
        
        found = await repo.get_by_id(99999)
        
        assert found is None
    
    @pytest.mark.asyncio
    async def test_update_user(self, db_session: AsyncSession):
        """Test updating user."""
        repo = UserRepository(db_session)
        
        # Create user
        user = await repo.create(
            email="test@example.com",
            name="Test User"
        )
        await db_session.commit()
        
        # Update user
        updated = await repo.update(
            user.id,
            {"name": "Updated Name", "email": "updated@example.com"}
        )
        
        assert updated.name == "Updated Name"
        assert updated.email == "updated@example.com"
        
        # Verify in database
        found = await db_session.get(User, user.id)
        assert found.name == "Updated Name"
    
    @pytest.mark.asyncio
    async def test_delete_user(self, db_session: AsyncSession):
        """Test deleting user."""
        repo = UserRepository(db_session)
        
        # Create user
        user = await repo.create(
            email="test@example.com",
            name="Test User"
        )
        user_id = user.id
        await db_session.commit()
        
        # Delete user
        await repo.delete(user_id)
        await db_session.commit()
        
        # Verify deleted
        found = await db_session.get(User, user_id)
        assert found is None
```

## Step 2: Testing Query Methods

### Filter and Search Tests

```python
@pytest.mark.asyncio
async def test_find_by_email(self, db_session: AsyncSession):
    """Test finding user by email."""
    repo = UserRepository(db_session)
    
    # Create test users
    user1 = await repo.create(email="john@example.com", name="John")
    user2 = await repo.create(email="jane@example.com", name="Jane")
    await db_session.commit()
    
    # Find by email
    found = await repo.find_by_email("john@example.com")
    
    assert found is not None
    assert found.id == user1.id
    assert found.email == "john@example.com"

@pytest.mark.asyncio
async def test_find_by_email_pattern(self, db_session: AsyncSession):
    """Test finding users by email pattern."""
    repo = UserRepository(db_session)
    
    # Create test users
    await repo.create(email="john@example.com", name="John")
    await repo.create(email="jane@example.com", name="Jane")
    await repo.create(email="joe@test.com", name="Joe")
    await db_session.commit()
    
    # Find by pattern
    users = await repo.find_by_email_pattern("@example.com")
    
    assert len(users) == 2
    assert all(user.email.endswith("@example.com") for user in users)

@pytest.mark.asyncio
async def test_find_active_users(self, db_session: AsyncSession):
    """Test finding only active users."""
    repo = UserRepository(db_session)
    
    # Create users with different statuses
    active_user = await repo.create(
        email="active@example.com",
        name="Active",
        is_active=True
    )
    inactive_user = await repo.create(
        email="inactive@example.com",
        name="Inactive",
        is_active=False
    )
    await db_session.commit()
    
    # Find active users
    active_users = await repo.find_active()
    
    assert len(active_users) == 1
    assert active_users[0].id == active_user.id
    assert all(user.is_active for user in active_users)
```

## Step 3: Testing Pagination

### Pagination Tests

```python
@pytest.mark.asyncio
async def test_paginate_users(self, db_session: AsyncSession):
    """Test user pagination."""
    repo = UserRepository(db_session)
    
    # Create 25 users
    for i in range(25):
        await repo.create(
            email=f"user{i}@example.com",
            name=f"User {i}"
        )
    await db_session.commit()
    
    # Test pagination
    page1 = await repo.paginate(page=1, page_size=10)
    
    assert len(page1.items) == 10
    assert page1.total == 25
    assert page1.page == 1
    assert page1.page_size == 10
    assert page1.has_next == True
    assert page1.has_prev == False
    
    # Test next page
    page2 = await repo.paginate(page=2, page_size=10)
    
    assert len(page2.items) == 10
    assert page2.page == 2
    assert page2.has_next == True
    assert page2.has_prev == True
    
    # Test last page
    page3 = await repo.paginate(page=3, page_size=10)
    
    assert len(page3.items) == 5  # Remaining users
    assert page3.has_next == False
    assert page3.has_prev == True
```

## Step 4: Testing with Mocked Database

### Unit Tests with Mocks

```python
@pytest.mark.asyncio
async def test_create_user_unit(mock_db_session: AsyncSession):
    """Unit test with mocked database."""
    repo = UserRepository(mock_db_session)
    
    # Setup mock
    expected_user = User(
        id=1,
        email="test@example.com",
        name="Test User"
    )
    
    mock_db_session.add = MagicMock()
    mock_db_session.commit = AsyncMock()
    mock_db_session.refresh = AsyncMock()
    
    # Mock the refresh to set the ID
    async def mock_refresh(obj):
        obj.id = 1
    
    mock_db_session.refresh.side_effect = mock_refresh
    
    # Execute
    user = await repo.create(
        email="test@example.com",
        name="Test User"
    )
    
    # Verify
    assert user.email == "test@example.com"
    mock_db_session.add.assert_called_once()
    mock_db_session.commit.assert_awaited_once()
    mock_db_session.refresh.assert_awaited_once()

@pytest.mark.asyncio
async def test_get_user_by_id_unit(mock_db_session: AsyncSession):
    """Unit test for get_by_id with mock."""
    repo = UserRepository(mock_db_session)
    
    expected_user = User(id=1, email="test@example.com", name="Test")
    mock_db_session.get = AsyncMock(return_value=expected_user)
    
    user = await repo.get_by_id(1)
    
    assert user == expected_user
    mock_db_session.get.assert_awaited_once_with(User, 1)
```

## Step 5: Testing Complex Queries

### Join and Relationship Tests

```python
@pytest.mark.asyncio
async def test_get_user_with_orders(self, db_session: AsyncSession):
    """Test getting user with related orders."""
    repo = UserRepository(db_session)
    
    # Create user
    user = await repo.create(email="test@example.com", name="Test")
    await db_session.commit()
    
    # Create orders
    order1 = Order(user_id=user.id, total_amount=100.0)
    order2 = Order(user_id=user.id, total_amount=200.0)
    db_session.add_all([order1, order2])
    await db_session.commit()
    
    # Get user with orders
    user_with_orders = await repo.get_with_orders(user.id)
    
    assert user_with_orders is not None
    assert len(user_with_orders.orders) == 2
    assert all(order.user_id == user.id for order in user_with_orders.orders)

@pytest.mark.asyncio
async def test_find_users_by_order_count(self, db_session: AsyncSession):
    """Test finding users with minimum order count."""
    repo = UserRepository(db_session)
    
    # Create users with different order counts
    user1 = await repo.create(email="user1@example.com", name="User1")
    user2 = await repo.create(email="user2@example.com", name="User2")
    await db_session.commit()
    
    # Create orders
    for i in range(5):
        order = Order(user_id=user1.id, total_amount=100.0)
        db_session.add(order)
    
    for i in range(2):
        order = Order(user_id=user2.id, total_amount=100.0)
        db_session.add(order)
    
    await db_session.commit()
    
    # Find users with at least 3 orders
    users = await repo.find_by_min_order_count(min_orders=3)
    
    assert len(users) == 1
    assert users[0].id == user1.id
```

## Step 6: Testing Error Handling

### Exception Tests

```python
@pytest.mark.asyncio
async def test_create_duplicate_email(self, db_session: AsyncSession):
    """Test creating user with duplicate email raises error."""
    repo = UserRepository(db_session)
    
    # Create first user
    await repo.create(email="test@example.com", name="Test")
    await db_session.commit()
    
    # Try to create duplicate
    with pytest.raises(IntegrityError):
        await repo.create(email="test@example.com", name="Duplicate")
        await db_session.commit()

@pytest.mark.asyncio
async def test_update_nonexistent_user(self, db_session: AsyncSession):
    """Test updating non-existent user."""
    repo = UserRepository(db_session)
    
    with pytest.raises(ValueError, match="User not found"):
        await repo.update(99999, {"name": "Updated"})

@pytest.mark.asyncio
async def test_delete_nonexistent_user(self, db_session: AsyncSession):
    """Test deleting non-existent user."""
    repo = UserRepository(db_session)
    
    with pytest.raises(ValueError, match="User not found"):
        await repo.delete(99999)
```

## Step 7: Testing Soft Deletes

### Soft Delete Tests

```python
@pytest.mark.asyncio
async def test_soft_delete_user(self, db_session: AsyncSession):
    """Test soft deleting user."""
    repo = UserRepository(db_session)
    
    user = await repo.create(email="test@example.com", name="Test")
    await db_session.commit()
    
    # Soft delete
    await repo.soft_delete(user.id)
    await db_session.commit()
    
    # Verify soft deleted (not in regular queries)
    found = await repo.get_by_id(user.id)
    assert found is None
    
    # But exists in database
    raw_user = await db_session.get(User, user.id)
    assert raw_user is not None
    assert raw_user.deleted_at is not None

@pytest.mark.asyncio
async def test_find_including_deleted(self, db_session: AsyncSession):
    """Test finding users including deleted."""
    repo = UserRepository(db_session)
    
    user = await repo.create(email="test@example.com", name="Test")
    await db_session.commit()
    
    await repo.soft_delete(user.id)
    await db_session.commit()
    
    # Find including deleted
    found = await repo.get_by_id(user.id, include_deleted=True)
    assert found is not None
    assert found.deleted_at is not None
```

## Step 8: Testing Transactions

### Transaction Tests

```python
@pytest.mark.asyncio
async def test_create_user_with_profile_transaction(self, db_session: AsyncSession):
    """Test transaction - both succeed or both fail."""
    repo = UserRepository(db_session)
    
    try:
        # Create user
        user = await repo.create(email="test@example.com", name="Test")
        
        # Create profile (will fail if user creation failed)
        profile = UserProfile(
            user_id=user.id,
            bio="Test bio"
        )
        db_session.add(profile)
        
        await db_session.commit()
        
        # Both should exist
        found_user = await db_session.get(User, user.id)
        found_profile = await db_session.get(UserProfile, user.id)
        
        assert found_user is not None
        assert found_profile is not None
    
    except Exception:
        await db_session.rollback()
        # Verify nothing was created
        users = await db_session.execute(select(User))
        assert users.scalar_one_or_none() is None

@pytest.mark.asyncio
async def test_transaction_rollback_on_error(self, db_session: AsyncSession):
    """Test that transaction rolls back on error."""
    repo = UserRepository(db_session)
    
    try:
        user = await repo.create(email="test@example.com", name="Test")
        
        # Cause error
        raise ValueError("Test error")
        
    except ValueError:
        await db_session.rollback()
    
    # Verify nothing committed
    users = await db_session.execute(select(User))
    assert users.scalar_one_or_none() is None
```

## Step 9: Performance Tests

### Testing Query Performance

```python
import time

@pytest.mark.asyncio
async def test_query_performance(self, db_session: AsyncSession):
    """Test that queries are fast enough."""
    repo = UserRepository(db_session)
    
    # Create test data
    for i in range(1000):
        await repo.create(
            email=f"user{i}@example.com",
            name=f"User {i}"
        )
    await db_session.commit()
    
    # Measure query time
    start = time.time()
    users = await repo.find_all(limit=100)
    duration = time.time() - start
    
    assert len(users) == 100
    assert duration < 1.0  # Should complete in under 1 second

@pytest.mark.asyncio
async def test_index_usage(self, db_session: AsyncSession):
    """Test that indexes are used for queries."""
    repo = UserRepository(db_session)
    
    # Create users
    await repo.create(email="test@example.com", name="Test")
    await db_session.commit()
    
    # Query should use index
    # Check query plan (PostgreSQL specific)
    result = await db_session.execute(text("""
        EXPLAIN ANALYZE
        SELECT * FROM users WHERE email = 'test@example.com'
    """))
    
    plan = result.fetchone()[0]
    assert "Index Scan" in plan  # Should use index
```

## Best Practices

1. **✅ Test both unit and integration**: Mocked and real database
2. **✅ Test edge cases**: Empty results, errors, boundaries
3. **✅ Test transactions**: Rollback behavior
4. **✅ Use factories**: Create test data easily
5. **✅ Clean between tests**: Fresh state

## Summary

Repository testing provides:
- ✅ Confidence in data layer
- ✅ Early bug detection
- ✅ Documentation through tests
- ✅ Refactoring safety

Implement comprehensive repository tests for reliable data layer!
