# Unit Testing Services: Complete Guide

Unit tests verify individual components work correctly in isolation. This guide teaches you how to write effective unit tests for service layer code in FastAPI.

## Understanding Unit Testing

**What is a unit test?**
Tests a single function or class in isolation, with dependencies mocked.

**Key principles:**
- Fast (run in milliseconds)
- Isolated (no database, no external services)
- Repeatable (same result every time)
- Independent (can run in any order)

**Real-world analogy:**
Testing a car engine in a workshop (isolated) vs testing it while driving (integration test).

## Setting Up Testing Environment

### Project Structure

```
tests/
├── conftest.py          # Shared fixtures
├── unit/
│   ├── test_services/
│   │   ├── test_user_service.py
│   │   └── test_order_service.py
│   └── test_repositories/
└── integration/
    └── test_api.py
```

### Basic Setup

```python
# tests/conftest.py
import pytest
from unittest.mock import AsyncMock, MagicMock
from app.services.user_service import UserService

@pytest.fixture
def mock_user_repository():
    """Mock user repository for testing."""
    return AsyncMock()

@pytest.fixture
def user_service(mock_user_repository):
    """User service with mocked dependencies."""
    return UserService(mock_user_repository)
```

## Step 1: Testing Simple Service Methods

Let's start with our UserService:

```python
# app/services/user_service.py
class UserService:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo
    
    async def get_user(self, user_id: int) -> User:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundError(f"User {user_id} not found")
        return user
```

**Writing the test:**

```python
# tests/unit/test_services/test_user_service.py
import pytest
from unittest.mock import AsyncMock
from app.services.user_service import UserService
from app.core.exceptions import NotFoundError

@pytest.mark.asyncio
async def test_get_user_success(mock_user_repository):
    """
    Test successful user retrieval.
    
    Arrange: Set up mock to return a user
    Act: Call the service method
    Assert: Verify correct user is returned
    """
    # Arrange: Set up mock
    expected_user = User(id=1, email="test@example.com", full_name="Test User")
    mock_user_repository.get_by_id = AsyncMock(return_value=expected_user)
    
    service = UserService(mock_user_repository)
    
    # Act: Call the method
    result = await service.get_user(1)
    
    # Assert: Verify results
    assert result == expected_user
    assert result.id == 1
    assert result.email == "test@example.com"
    
    # Verify repository was called correctly
    mock_user_repository.get_by_id.assert_called_once_with(1)

@pytest.mark.asyncio
async def test_get_user_not_found(mock_user_repository):
    """
    Test error handling when user doesn't exist.
    
    Should raise NotFoundError when user not found.
    """
    # Arrange: Mock returns None (user not found)
    mock_user_repository.get_by_id = AsyncMock(return_value=None)
    
    service = UserService(mock_user_repository)
    
    # Act & Assert: Should raise exception
    with pytest.raises(NotFoundError) as exc_info:
        await service.get_user(999)
    
    # Verify error message
    assert "User 999 not found" in str(exc_info.value)
    
    # Verify repository was called
    mock_user_repository.get_by_id.assert_called_once_with(999)
```

**Understanding the test structure:**
- **Arrange**: Set up mocks and test data
- **Act**: Call the method being tested
- **Assert**: Verify the results

## Step 2: Testing Business Logic

Let's test more complex business logic:

```python
# app/services/user_service.py
class UserService:
    async def create_user(self, user_data: UserCreate) -> User:
        # Business rule: Email must be unique
        if await self.user_repo.email_exists(user_data.email):
            raise ValidationError("Email already registered")
        
        # Business rule: Age restriction
        if user_data.age < 18:
            raise ValidationError("Must be 18 or older")
        
        # Create user
        return await self.user_repo.create(user_data.dict())
```

**Testing business rules:**

```python
@pytest.mark.asyncio
async def test_create_user_email_already_exists(mock_user_repository):
    """Test that creating user with existing email fails."""
    # Arrange
    mock_user_repository.email_exists = AsyncMock(return_value=True)
    service = UserService(mock_user_repository)
    
    user_data = UserCreate(
        email="existing@example.com",
        age=25,
        full_name="Test User"
    )
    
    # Act & Assert
    with pytest.raises(ValidationError) as exc_info:
        await service.create_user(user_data)
    
    assert "Email already registered" in str(exc_info.value)
    
    # Verify email_exists was checked
    mock_user_repository.email_exists.assert_called_once_with("existing@example.com")
    
    # Verify create was NOT called
    mock_user_repository.create.assert_not_called()

@pytest.mark.asyncio
async def test_create_user_age_restriction(mock_user_repository):
    """Test that users under 18 cannot register."""
    # Arrange
    mock_user_repository.email_exists = AsyncMock(return_value=False)
    service = UserService(mock_user_repository)
    
    user_data = UserCreate(
        email="young@example.com",
        age=17,  # Under 18
        full_name="Young User"
    )
    
    # Act & Assert
    with pytest.raises(ValidationError) as exc_info:
        await service.create_user(user_data)
    
    assert "Must be 18 or older" in str(exc_info.value)

@pytest.mark.asyncio
async def test_create_user_success(mock_user_repository):
    """Test successful user creation."""
    # Arrange
    mock_user_repository.email_exists = AsyncMock(return_value=False)
    expected_user = User(
        id=1,
        email="new@example.com",
        age=25,
        full_name="New User"
    )
    mock_user_repository.create = AsyncMock(return_value=expected_user)
    
    service = UserService(mock_user_repository)
    
    user_data = UserCreate(
        email="new@example.com",
        age=25,
        full_name="New User"
    )
    
    # Act
    result = await service.create_user(user_data)
    
    # Assert
    assert result == expected_user
    assert result.email == "new@example.com"
    
    # Verify flow
    mock_user_repository.email_exists.assert_called_once()
    mock_user_repository.create.assert_called_once()
```

## Step 3: Testing Complex Service Methods

Testing order creation with business logic:

```python
# app/services/order_service.py
class OrderService:
    def __init__(
        self,
        order_repo: OrderRepository,
        product_repo: ProductRepository,
        user_repo: UserRepository
    ):
        self.order_repo = order_repo
        self.product_repo = product_repo
        self.user_repo = user_repo
    
    async def create_order(
        self,
        user_id: int,
        items: List[Dict]
    ) -> Order:
        # Validate user exists
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundError(f"User {user_id} not found")
        
        # Validate all products exist and have stock
        total = 0
        for item in items:
            product = await self.product_repo.get_by_id(item["product_id"])
            if not product:
                raise ValidationError(f"Product {item['product_id']} not found")
            
            if product.stock_quantity < item["quantity"]:
                raise ValidationError(
                    f"Insufficient stock for {product.name}"
                )
            
            total += float(product.price) * item["quantity"]
        
        # Business rule: Minimum order value
        if total < 10.0:
            raise ValidationError("Minimum order value is $10.00")
        
        # Create order
        return await self.order_repo.create_order(user_id, items)
```

**Testing the complex method:**

```python
@pytest.mark.asyncio
async def test_create_order_user_not_found(mock_order_repo, mock_product_repo, mock_user_repo):
    """Test order creation fails if user doesn't exist."""
    # Arrange
    mock_user_repo.get_by_id = AsyncMock(return_value=None)
    service = OrderService(mock_order_repo, mock_product_repo, mock_user_repo)
    
    # Act & Assert
    with pytest.raises(NotFoundError):
        await service.create_order(user_id=999, items=[{"product_id": 1, "quantity": 1}])
    
    # Verify user check happened
    mock_user_repo.get_by_id.assert_called_once_with(999)

@pytest.mark.asyncio
async def test_create_order_insufficient_stock(mock_order_repo, mock_product_repo, mock_user_repo):
    """Test order creation fails if product out of stock."""
    # Arrange
    user = User(id=1, email="test@example.com")
    product = Product(id=1, name="Laptop", price=100.0, stock_quantity=5)
    
    mock_user_repo.get_by_id = AsyncMock(return_value=user)
    mock_product_repo.get_by_id = AsyncMock(return_value=product)
    
    service = OrderService(mock_order_repo, mock_product_repo, mock_user_repo)
    
    # Act & Assert
    with pytest.raises(ValidationError) as exc_info:
        await service.create_order(
            user_id=1,
            items=[{"product_id": 1, "quantity": 10}]  # More than stock
        )
    
    assert "Insufficient stock" in str(exc_info.value)

@pytest.mark.asyncio
async def test_create_order_minimum_value(mock_order_repo, mock_product_repo, mock_user_repo):
    """Test order creation fails if below minimum value."""
    # Arrange
    user = User(id=1, email="test@example.com")
    product = Product(id=1, name="Item", price=5.0, stock_quantity=1)
    
    mock_user_repo.get_by_id = AsyncMock(return_value=user)
    mock_product_repo.get_by_id = AsyncMock(return_value=product)
    
    service = OrderService(mock_order_repo, mock_product_repo, mock_user_repo)
    
    # Act & Assert
    with pytest.raises(ValidationError) as exc_info:
        await service.create_order(
            user_id=1,
            items=[{"product_id": 1, "quantity": 1}]  # Total: $5 < $10 minimum
        )
    
    assert "Minimum order value" in str(exc_info.value)

@pytest.mark.asyncio
async def test_create_order_success(mock_order_repo, mock_product_repo, mock_user_repo):
    """Test successful order creation."""
    # Arrange
    user = User(id=1, email="test@example.com")
    product = Product(id=1, name="Laptop", price=100.0, stock_quantity=10)
    expected_order = Order(id=1, user_id=1, total_amount=100.0)
    
    mock_user_repo.get_by_id = AsyncMock(return_value=user)
    mock_product_repo.get_by_id = AsyncMock(return_value=product)
    mock_order_repo.create_order = AsyncMock(return_value=expected_order)
    
    service = OrderService(mock_order_repo, mock_product_repo, mock_user_repo)
    
    # Act
    result = await service.create_order(
        user_id=1,
        items=[{"product_id": 1, "quantity": 1}]
    )
    
    # Assert
    assert result == expected_order
    assert result.total_amount == 100.0
    
    # Verify all validations happened
    mock_user_repo.get_by_id.assert_called_once_with(1)
    mock_product_repo.get_by_id.assert_called_once_with(1)
    mock_order_repo.create_order.assert_called_once()
```

## Step 4: Testing Edge Cases

Always test edge cases:

```python
@pytest.mark.asyncio
async def test_create_order_empty_items(mock_order_repo, mock_product_repo, mock_user_repo):
    """Test order creation with no items."""
    user = User(id=1, email="test@example.com")
    mock_user_repo.get_by_id = AsyncMock(return_value=user)
    
    service = OrderService(mock_order_repo, mock_product_repo, mock_user_repo)
    
    with pytest.raises(ValidationError):
        await service.create_order(user_id=1, items=[])

@pytest.mark.asyncio
async def test_create_order_multiple_products(mock_order_repo, mock_product_repo, mock_user_repo):
    """Test order creation with multiple products."""
    user = User(id=1, email="test@example.com")
    product1 = Product(id=1, name="Laptop", price=100.0, stock_quantity=10)
    product2 = Product(id=2, name="Mouse", price=20.0, stock_quantity=10)
    expected_order = Order(id=1, user_id=1, total_amount=220.0)
    
    mock_user_repo.get_by_id = AsyncMock(return_value=user)
    mock_product_repo.get_by_id = AsyncMock(side_effect=[product1, product2])
    mock_order_repo.create_order = AsyncMock(return_value=expected_order)
    
    service = OrderService(mock_order_repo, mock_product_repo, mock_user_repo)
    
    result = await service.create_order(
        user_id=1,
        items=[
            {"product_id": 1, "quantity": 2},  # $200
            {"product_id": 2, "quantity": 1}   # $20
        ]
    )
    
    assert result.total_amount == 220.0
    assert mock_product_repo.get_by_id.call_count == 2
```

## Step 5: Using Fixtures Effectively

Create reusable fixtures:

```python
# tests/conftest.py
@pytest.fixture
def sample_user():
    """Sample user for testing."""
    return User(
        id=1,
        email="test@example.com",
        full_name="Test User",
        age=25
    )

@pytest.fixture
def sample_product():
    """Sample product for testing."""
    return Product(
        id=1,
        name="Test Product",
        price=99.99,
        stock_quantity=10
    )

@pytest.fixture
def mock_user_service():
    """Mock user service."""
    return AsyncMock(spec=UserService)

# Use in tests
@pytest.mark.asyncio
async def test_example(sample_user, mock_user_service):
    mock_user_service.get_user = AsyncMock(return_value=sample_user)
    # ...
```

## Step 6: Testing Async Code

**Key points for async testing:**

```python
# Always use @pytest.mark.asyncio
@pytest.mark.asyncio
async def test_async_method():
    # Test async code here
    result = await some_async_function()
    assert result is not None

# Mock async functions properly
mock_repo.method = AsyncMock(return_value=value)
# Not: mock_repo.method = Mock(return_value=value)  # Wrong for async!
```

## Best Practices

1. **Test one thing at a time** - Each test should verify one behavior
2. **Use descriptive names** - `test_create_user_with_existing_email_fails`
3. **Arrange-Act-Assert** - Clear structure
4. **Mock external dependencies** - Don't use real database/external services
5. **Test edge cases** - Empty lists, None values, boundaries
6. **Test error cases** - Exceptions, validation failures

## Summary

Unit testing services provides:
- ✅ Fast feedback on code changes
- ✅ Confidence in business logic
- ✅ Documentation of expected behavior
- ✅ Safety net for refactoring

Write unit tests for all business logic, and you'll catch bugs before they reach production!

