# Architecture Philosophy: Building Maintainable FastAPI Applications

FastAPI's design encourages clean, maintainable architectures. Understanding these principles will help you build scalable, testable applications.

## Core Principles

### 1. **Modularity**

Organize code into focused, independent modules that have clear responsibilities.

**Anti-pattern:**
```python
# Everything in one file
@app.get("/users/{user_id}")
async def get_user(user_id: int):
    # Database logic
    conn = await get_db_connection()
    user = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
    
    # Business logic
    if user:
        user["status"] = "active" if user["last_login"] > datetime.now() - timedelta(days=30) else "inactive"
    
    # Response formatting
    return {"id": user["id"], "name": user["name"], "status": user["status"]}
```

**Good pattern:**
```python
# Separated concerns
# app/models/user.py
class User(BaseModel):
    id: int
    name: str
    status: str

# app/repositories/user_repository.py
class UserRepository:
    async def get_by_id(self, user_id: int) -> Optional[User]:
        # Only database logic
        pass

# app/services/user_service.py
class UserService:
    def __init__(self, repo: UserRepository):
        self.repo = repo
    
    async def get_user(self, user_id: int) -> User:
        user = await self.repo.get_by_id(user_id)
        if user:
            user.status = self._calculate_status(user)
        return user

# app/api/routes/users.py
@router.get("/users/{user_id}", response_model=User)
async def get_user(
    user_id: int,
    service: UserService = Depends(get_user_service)
):
    return await service.get_user(user_id)
```

**Benefits:**
- Each module has a single responsibility
- Easy to test individual components
- Easy to modify one part without affecting others
- Clear dependencies between layers

### 2. **Separation of Concerns**

Divide your application into distinct layers:

```
┌─────────────────────────────────────┐
│         API Layer (Routes)          │  ← HTTP handling, request/response
├─────────────────────────────────────┤
│        Service Layer (Business)     │  ← Business logic, orchestration
├─────────────────────────────────────┤
│     Repository Layer (Data Access)  │  ← Database operations
├─────────────────────────────────────┤
│          Domain Models              │  ← Data structures, validation
└─────────────────────────────────────┘
```

**API Layer** - Handles HTTP concerns:
```python
# app/api/routes/users.py
from fastapi import APIRouter, Depends, HTTPException

router = APIRouter(prefix="/api/v1/users", tags=["users"])

@router.post("/", response_model=UserResponse, status_code=201)
async def create_user(
    user_data: UserCreate,
    service: UserService = Depends(get_user_service)
):
    try:
        return await service.create_user(user_data)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
```

**Service Layer** - Contains business logic:
```python
# app/services/user_service.py
class UserService:
    def __init__(
        self,
        user_repo: UserRepository,
        email_service: EmailService
    ):
        self.user_repo = user_repo
        self.email_service = email_service
    
    async def create_user(self, user_data: UserCreate) -> User:
        # Business rules
        if await self.user_repo.email_exists(user_data.email):
            raise ValidationError("Email already exists")
        
        # Create user
        user = await self.user_repo.create(user_data)
        
        # Side effects
        await self.email_service.send_welcome_email(user.email)
        
        return user
```

**Repository Layer** - Handles data access:
```python
# app/repositories/user_repository.py
class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def create(self, user_data: UserCreate) -> User:
        user = User(**user_data.dict())
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)
        return user
    
    async def email_exists(self, email: str) -> bool:
        result = await self.session.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none() is not None
```

### 3. **Testability**

Design components that are easy to test in isolation.

**Key principles:**

1. **Dependency Injection**: Pass dependencies rather than creating them
```python
# ✅ Testable - dependencies injected
class UserService:
    def __init__(self, repo: UserRepository):
        self.repo = repo

# ❌ Hard to test - creates own dependencies
class UserService:
    def __init__(self):
        self.repo = UserRepository(get_db_connection())
```

2. **Interface Abstractions**: Use protocols/interfaces for dependencies
```python
# app/interfaces/user_repository.py
from typing import Protocol

class UserRepositoryProtocol(Protocol):
    async def get_by_id(self, user_id: int) -> Optional[User]:
        ...

# app/services/user_service.py
class UserService:
    def __init__(self, repo: UserRepositoryProtocol):
        self.repo = repo

# tests/mocks/mock_repository.py
class MockUserRepository:
    async def get_by_id(self, user_id: int) -> Optional[User]:
        return User(id=user_id, name="Test User")
```

3. **Pure Functions**: Business logic without side effects
```python
# ✅ Pure function - easy to test
def calculate_discount(price: float, user_tier: str) -> float:
    discounts = {"gold": 0.2, "silver": 0.1, "bronze": 0.05}
    return price * discounts.get(user_tier, 0)

# Test
assert calculate_discount(100, "gold") == 20.0
```

### 4. **Configuration Management**

Separate configuration from code:

```python
# app/core/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "My API"
    database_url: str
    redis_url: str
    secret_key: str
    debug: bool = False
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
```

**Benefits:**
- Environment-specific configs (dev, staging, prod)
- Secrets not in code
- Easy to change without redeploying

### 5. **Error Handling**

Centralized error handling with clear error types:

```python
# app/core/exceptions.py
class ApplicationError(Exception):
    """Base application error"""
    pass

class NotFoundError(ApplicationError):
    """Resource not found"""
    pass

class ValidationError(ApplicationError):
    """Validation error"""
    pass

# app/core/handlers.py
from fastapi import Request, status
from fastapi.responses import JSONResponse

@app.exception_handler(NotFoundError)
async def not_found_handler(request: Request, exc: NotFoundError):
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": str(exc)}
    )
```

### 6. **Dependency Injection**

FastAPI's dependency injection system enables clean architecture:

```python
# app/core/dependencies.py
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

async def get_db_session() -> AsyncSession:
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

def get_user_repository(
    session: AsyncSession = Depends(get_db_session)
) -> UserRepository:
    return UserRepository(session)

def get_user_service(
    repo: UserRepository = Depends(get_user_repository)
) -> UserService:
    return UserService(repo)
```

**Benefits:**
- Automatic lifecycle management
- Easy to swap implementations (e.g., test vs production)
- Clear dependency graph

## Recommended Project Structure

```
app/
├── api/                      # API routes
│   ├── routes/
│   │   ├── users.py
│   │   └── products.py
│   └── dependencies.py       # Route-level dependencies
├── core/                     # Core functionality
│   ├── config.py            # Configuration
│   ├── exceptions.py        # Custom exceptions
│   └── security.py          # Auth, encryption
├── models/                   # Pydantic models
│   ├── user.py
│   └── product.py
├── schemas/                  # Database models (SQLAlchemy)
│   ├── user.py
│   └── product.py
├── repositories/             # Data access layer
│   ├── user_repository.py
│   └── product_repository.py
├── services/                 # Business logic
│   ├── user_service.py
│   └── product_service.py
├── interfaces/               # Protocols/interfaces
│   └── repositories.py
└── main.py                   # Application entry point
```

## Design Patterns for FastAPI

### 1. Repository Pattern

Abstracts data access logic:

```python
# Interface
class UserRepository(ABC):
    @abstractmethod
    async def get_by_id(self, user_id: int) -> Optional[User]:
        pass

# Implementation
class SQLAlchemyUserRepository(UserRepository):
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def get_by_id(self, user_id: int) -> Optional[User]:
        result = await self.session.get(User, user_id)
        return result
```

### 2. Service Layer Pattern

Encapsulates business logic:

```python
class UserService:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo
    
    async def get_active_user(self, user_id: int) -> User:
        user = await self.user_repo.get_by_id(user_id)
        if not user or not user.is_active:
            raise NotFoundError("User not found or inactive")
        return user
```

### 3. Dependency Injection Pattern

Managed by FastAPI:

```python
def get_user_service(
    repo: UserRepository = Depends(get_user_repository)
) -> UserService:
    return UserService(repo)

@router.get("/users/{user_id}")
async def get_user(
    user_id: int,
    service: UserService = Depends(get_user_service)
):
    return await service.get_active_user(user_id)
```

## Testing Strategy

With good architecture, testing becomes straightforward:

```python
# tests/services/test_user_service.py
async def test_get_active_user_success():
    # Arrange
    mock_repo = MockUserRepository()
    mock_repo.users = {1: User(id=1, is_active=True)}
    service = UserService(mock_repo)
    
    # Act
    user = await service.get_active_user(1)
    
    # Assert
    assert user.id == 1
    assert user.is_active is True

async def test_get_active_user_not_found():
    mock_repo = MockUserRepository()
    service = UserService(mock_repo)
    
    with pytest.raises(NotFoundError):
        await service.get_active_user(999)
```

## Summary

FastAPI architecture philosophy emphasizes:

1. **Modularity** - Focused, independent components
2. **Separation of Concerns** - Clear layer boundaries
3. **Testability** - Easy to test in isolation
4. **Dependency Injection** - Managed dependencies
5. **Configuration Management** - Separated from code
6. **Error Handling** - Centralized and consistent

By following these principles, you build applications that are:
- ✅ Easy to understand and navigate
- ✅ Easy to test and debug
- ✅ Easy to modify and extend
- ✅ Production-ready and maintainable

