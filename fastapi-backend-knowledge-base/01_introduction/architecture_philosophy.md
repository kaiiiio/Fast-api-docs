# Architecture Philosophy: Building Maintainable FastAPI Applications

FastAPI's design encourages clean, maintainable architectures. Understanding these principles will help you build scalable, testable applications.

## What is Pydantic?

**Pydantic** is a data validation library that uses Python type hints to validate data at runtime. It's the foundation of FastAPI's automatic request validation, serialization, and documentation generation.

### Key Concepts

**BaseModel:**
- Base class for creating data models with automatic validation
- Similar to TypeScript interfaces but with runtime validation
- Automatically converts and validates data types

```python
from pydantic import BaseModel

class User(BaseModel):
    id: int
    name: str
    email: str
    age: int

# Automatic validation
user = User(id=1, name="John", email="john@example.com", age=30)  # ✅ Valid

# Type conversion
user = User(id="1", name="John", email="john@example.com", age="30")  # ✅ Converts strings to int

# Validation error
user = User(id="abc", name="John", email="john@example.com", age=30)  # ❌ Raises ValidationError
```

**How Pydantic Works:**

```
Input Data → Pydantic BaseModel → Validation → Type Conversion → Validated Object
   ↓                                  ↓              ↓                    ↓
{"id": "1"}              Check types    "1" → 1        User(id=1, ...)
```

**Key Features:**

1. **Automatic Validation:**
```python
class UserCreate(BaseModel):
    email: str
    age: int
    
# Pydantic automatically validates:
# - email must be a string
# - age must be an integer
# - Both fields are required (unless Optional)
```

2. **Type Conversion:**
```python
# Pydantic converts compatible types
user = UserCreate(email="john@example.com", age="25")  # age: "25" → 25
```

3. **Serialization:**
```python
user = User(id=1, name="John", email="john@example.com", age=30)

# Convert to dictionary
user.dict()  # {"id": 1, "name": "John", "email": "john@example.com", "age": 30}

# Convert to JSON
user.json()  # '{"id": 1, "name": "John", "email": "john@example.com", "age": 30}'
```

4. **Advanced Validation:**
```python
from pydantic import BaseModel, EmailStr, validator

class User(BaseModel):
    email: EmailStr  # Validates email format
    age: int
    
    @validator('age')
    def age_must_be_positive(cls, v):
        if v < 0:
            raise ValueError('Age must be positive')
        return v
```

**Pydantic vs TypeScript:**

| Feature | TypeScript | Pydantic |
|---------|-----------|----------|
| **Type Checking** | Compile-time only | Runtime validation |
| **Validation** | No automatic validation | Automatic validation |
| **Conversion** | No type conversion | Automatic type conversion |
| **Use Case** | Frontend type safety | Backend data validation |

```typescript
// TypeScript - Compile-time only
interface User {
    id: number;
    name: string;
}

const user: User = { id: "1", name: "John" };  // ❌ Compile error
// But at runtime, JavaScript doesn't validate!
```

```python
# Pydantic - Runtime validation
class User(BaseModel):
    id: int
    name: str

user = User(id="1", name="John")  # ✅ Converts "1" to 1 at runtime
user = User(id="abc", name="John")  # ❌ Raises ValidationError at runtime
```

**Why FastAPI Uses Pydantic:**

1. **Automatic Request Validation:**
```python
@app.post("/users/")
async def create_user(user: UserCreate):  # Pydantic validates request body
    # If validation fails, FastAPI returns 422 error automatically
    return user
```

2. **Automatic Documentation:**
```python
# Pydantic models generate OpenAPI schema automatically
# Visit /docs to see interactive API documentation
```

3. **Type Safety:**
```python
# Your IDE knows the exact types
user = await get_user(1)
user.email  # IDE autocompletes and knows it's a string
```

---

## Core Principles

### 1. **Modularity**

Organize code into focused, independent modules that have clear responsibilities.

**Anti-pattern:**
```python
# Everything in one file
@app.get("/users/{user_id}")
async def get_user(user_id: int):
    # Database logic
    # ⚠️ For Express Developers: Why not get connection in main.py?
    # FastAPI uses Dependency Injection instead of middleware for database connections.
    # This gives per-request lifecycle management (auto-cleanup, transactions per request).
    # Express: app.use(middleware) → global, shared across all routes
    # FastAPI: Depends(get_db) → injected per route, isolated, auto-managed
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
# BaseModel - Pydantic's base class for data validation and serialization
# Automatically validates types, converts data, and provides JSON serialization
# Think of it as a TypeScript interface + runtime validation + serialization
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

**Benefits:** Each module has a single responsibility, easy to test individual components, easy to modify one part without affecting others, and clear dependencies between layers.

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

**API Layer** - Handles HTTP concerns (request/response, status codes, exceptions):

```python
# app/api/routes/users.py
from fastapi import APIRouter, Depends, HTTPException

router = APIRouter(prefix="/api/v1/users", tags=["users"])

@router.post("/", response_model=UserResponse, status_code=201)
# Route handler: Thin layer, delegates to service.
async def create_user(
    user_data: UserCreate,  # Pydantic validates request
    service: UserService = Depends(get_user_service)  # Dependency injection
):
    try:
        return await service.create_user(user_data)  # Delegate to service
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))  # Convert to HTTP error
```

**Service Layer** - Contains business logic (rules, orchestration, side effects):

```python
# app/services/user_service.py
# UserService: Business logic layer (enforces rules, orchestrates operations).
class UserService:
    def __init__(
        self,
        user_repo: UserRepository,  # Injected dependencies
        email_service: EmailService
    ):
        self.user_repo = user_repo
        self.email_service = email_service
    
    async def create_user(self, user_data: UserCreate) -> User:
        # Business rules: Enforce domain constraints.
        if await self.user_repo.email_exists(user_data.email):
            raise ValidationError("Email already exists")
        
        # Create user: Delegate to repository.
        user = await self.user_repo.create(user_data)
        
        # Side effects: Send welcome email (not part of core creation).
        await self.email_service.send_welcome_email(user.email)
        
        return user
```

**Repository Layer** - Handles data access (database operations only):

```python
# app/repositories/user_repository.py
# UserRepository: Data access layer (only database operations, no business logic).
class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session  # Injected database session
    
    async def create(self, user_data: UserCreate) -> User:
        # Database operation: Create record.
        # .dict() - Pydantic method that converts BaseModel to dictionary
        # **user_data.dict() - Unpacks dictionary as keyword arguments
        # Example: User(**{"id": 1, "name": "John"}) → User(id=1, name="John")
        user = User(**user_data.dict())
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)  # Get auto-generated fields
        return user
    
    async def email_exists(self, email: str) -> bool:
        # Database query: Check existence.
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

# Protocol - Python's way to define interfaces (structural typing)
# Any class with matching methods satisfies this protocol (duck typing)
# Used for dependency injection and testing (easy to create mocks)
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
# BaseSettings - Pydantic class for loading configuration from environment variables
# Automatically reads from .env file, validates types, and provides defaults
# Similar to dotenv but with type validation and better error messages
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

**For Express Developers: Why Dependency Injection Instead of Middleware?**

In Express, you typically set up database connections globally using middleware:

```javascript
// Express approach - Global middleware
const express = require('express');
const app = express();

// Database connection in main file
const db = require('./db');
app.use((req, res, next) => {
    req.db = db;  // Attach to request object
    next();
});

// Routes use the global connection
app.get('/users/:id', async (req, res) => {
    const user = await req.db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    res.json(user);
});
```

FastAPI uses **Dependency Injection** instead, which provides several advantages:

**1. Automatic Lifecycle Management:**
```python
# FastAPI - Each request gets its own session, auto-cleaned up
@router.get("/users/{user_id}")
async def get_user(
    user_id: int,
    session: AsyncSession = Depends(get_db_session)  # Auto-created and closed
):
    user = await session.get(User, user_id)
    return user
# Session automatically committed and closed after response
```

**2. Per-Request Isolation:**
```
Express (Middleware):
┌─────────────────────────────────┐
│  Global DB Connection Pool      │ ← Shared across all requests
├─────────────────────────────────┤
│  Request 1 → req.db → Query     │ ← Uses pool connection
│  Request 2 → req.db → Query     │ ← Uses pool connection
│  Request 3 → req.db → Query     │ ← Uses pool connection
└─────────────────────────────────┘

FastAPI (Dependency Injection):
┌─────────────────────────────────┐
│  Request 1 → Depends(get_db)    │ ← Own session, auto-cleanup
├─────────────────────────────────┤
│  Request 2 → Depends(get_db)    │ ← Own session, auto-cleanup
├─────────────────────────────────┤
│  Request 3 → Depends(get_db)    │ ← Own session, auto-cleanup
└─────────────────────────────────┘
Each request gets isolated session with automatic transaction management
```

**3. Testability:**
```python
# Easy to mock dependencies for testing
async def test_get_user():
    # Override dependency with mock
    app.dependency_overrides[get_db_session] = lambda: mock_session
    
    response = client.get("/users/1")
    assert response.status_code == 200
```

**4. Explicit Dependencies:**
```python
# Clear what each route needs
@router.get("/users/{user_id}")
async def get_user(
    user_id: int,
    session: AsyncSession = Depends(get_db_session),  # Needs DB
    current_user: User = Depends(get_current_user)    # Needs auth
):
    # Dependencies are explicit in function signature
    pass
```

**Summary:**
- **Express:** Global middleware, manual cleanup, shared connections
- **FastAPI:** Dependency injection, auto-cleanup, isolated per-request sessions
- **Benefit:** Better resource management, easier testing, clearer dependencies


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
# SQLAlchemyUserRepository - Concrete implementation of UserRepository interface
# Uses SQLAlchemy for database operations (could swap with MongoRepository, etc.)
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
# UserService - Business logic layer (orchestrates operations, enforces rules)
# Depends on repository interface, not concrete implementation (dependency inversion)
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

**What is Dependency Injection?**
A design pattern where dependencies (like database connections, services) are "injected" into a class/function rather than created inside it. This makes code more testable, flexible, and follows the Dependency Inversion Principle.

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
    
    # pytest.raises - Context manager that asserts an exception is raised
    # Used to test error handling (ensures NotFoundError is thrown)
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

