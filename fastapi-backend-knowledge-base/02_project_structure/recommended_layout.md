# Recommended Project Layout for FastAPI Applications

A well-organized project structure is crucial for maintainability, scalability, and team collaboration. This guide presents production-ready layouts for FastAPI applications.

## Standard Production Layout

```
my_fastapi_app/
├── app/
│   ├── __init__.py
│   ├── main.py                      # Application entry point
│   │
│   ├── core/                        # Core functionality
│   │   ├── __init__.py
│   │   ├── config.py               # Settings and configuration
│   │   ├── security.py             # Authentication, encryption
│   │   ├── logging.py              # Logging configuration
│   │   └── exceptions.py           # Custom exceptions
│   │
│   ├── api/                        # API layer
│   │   ├── __init__.py
│   │   ├── deps.py                 # Route dependencies
│   │   └── v1/                     # API versioning
│   │       ├── __init__.py
│   │       ├── router.py           # Router aggregation
│   │       └── endpoints/          # Route handlers
│   │           ├── __init__.py
│   │           ├── users.py
│   │           ├── auth.py
│   │           └── products.py
│   │
│   ├── schemas/                    # Pydantic models (request/response)
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── auth.py
│   │   └── product.py
│   │
│   ├── models/                     # SQLAlchemy ORM models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   └── product.py
│   │
│   ├── db/                         # Database configuration
│   │   ├── __init__.py
│   │   ├── base.py                 # Base class for models
│   │   ├── session.py              # Session management
│   │   └── init_db.py              # Database initialization
│   │
│   ├── repositories/               # Data access layer
│   │   ├── __init__.py
│   │   ├── base.py                 # Base repository
│   │   ├── user_repository.py
│   │   └── product_repository.py
│   │
│   ├── services/                   # Business logic layer
│   │   ├── __init__.py
│   │   ├── user_service.py
│   │   ├── auth_service.py
│   │   └── product_service.py
│   │
│   └── utils/                      # Utility functions
│       ├── __init__.py
│       └── helpers.py
│
├── tests/                          # Test suite
│   ├── __init__.py
│   ├── conftest.py                 # Pytest configuration
│   ├── unit/
│   │   ├── test_services.py
│   │   └── test_repositories.py
│   ├── integration/
│   │   ├── test_api.py
│   │   └── test_db.py
│   └── fixtures/
│       └── factories.py 
│
├── alembic/                        # Database migrations
│   ├── versions/
│   ├── env.py
│   └── script.py.mako
│
├── scripts/                        # Utility scripts
│   └── init_data.py
│
├── .env                            # Environment variables (not in git)
├── .env.example                    # Example environment file
├── .gitignore
├── requirements.txt                # Production dependencies
├── requirements-dev.txt            # Development dependencies
├── pyproject.toml                  # Project metadata
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## Detailed Breakdown

### 1. `app/main.py` - Application Entry Point

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import setup_logging
from app.db.session import engine
from app.models import Base
from app.api.v1.router import api_router


# lifespan: Context manager for app startup/shutdown. Handles initialization and cleanup.
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Runs once when app starts.
    setup_logging()
    async with engine.begin() as conn:
        # Create tables (only in dev/test): Auto-create schema in development.
        if settings.DEBUG:
            await conn.run_sync(Base.metadata.create_all)
    yield  # App runs here
    # Shutdown: Runs when app stops. Cleanup resources.
    await engine.dispose()


# FastAPI app: Initialize with settings and lifespan.
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan  # Startup/shutdown logic
)

# Middleware: CORS allows frontend to call API from different origins.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers: Aggregates all API routes under /api/v1 prefix.
app.include_router(api_router, prefix="/api/v1")
```
**Explanation:**
The `main.py` file is the entry point. It sets up the `FastAPI` app, middleware (like CORS), and includes the main API router. The `lifespan` context manager handles startup (logging, DB tables) and shutdown (DB connection cleanup) logic efficiently.

### 2. `app/core/config.py` - Configuration Management

```python
from pydantic_settings import BaseSettings
from typing import List


# Settings: Centralized configuration using Pydantic BaseSettings.
class Settings(BaseSettings):
    PROJECT_NAME: str = "My FastAPI App"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Database: Required field, loaded from environment.
    DATABASE_URL: str
    
    # Security: JWT token configuration.
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS: Allowed origins for cross-origin requests.
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    
    # Redis: Cache/session storage URL.
    REDIS_URL: str = "redis://localhost:6379"
    
    class Config:
        env_file = ".env"  # Load from .env file
        case_sensitive = True  # Distinguish DEBUG from debug


settings = Settings()  # Instantiate once, used throughout app
```
**Explanation:**
Configuration is centralized in `config.py` using Pydantic's `BaseSettings`. This ensures type safety and automatic loading of environment variables. Other parts of the app import `settings` from here, keeping configuration consistent.

### 3. `app/api/v1/endpoints/users.py` - Route Handlers

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.schemas.user import UserResponse, UserCreate
from app.services.user_service import UserService

router = APIRouter()  # Create router for this endpoint group

@router.post("/users/", response_model=UserResponse, status_code=201)
# Route handler: Thin layer that delegates to service. Business logic in service.
async def create_user(
    user_data: UserCreate,  # Pydantic validates request body
    db: AsyncSession = Depends(get_db),  # Database session dependency
    current_user = Depends(get_current_user)  # Authentication dependency
):
    """Create a new user"""
    service = UserService(db)  # Create service with DB session
    return await service.create_user(user_data)  # Delegate to service

@router.get("/users/me", response_model=UserResponse)
# Simple route: Returns authenticated user from dependency.
async def get_current_user_info(
    current_user = Depends(get_current_user)  # User already validated by dependency
):
    """Get current user information"""
    return current_user  # No business logic, just return user
```
**Explanation:**
Route handlers should be thin—they receive validated data (via Pydantic schemas), call the appropriate service, and return the response. Business logic lives in the service layer, keeping routes focused on HTTP concerns.

### 4. `app/api/v1/router.py` - Router Aggregation

```python
from fastapi import APIRouter

from app.api.v1.endpoints import users, auth, products

# api_router: Aggregates all endpoint routers into one main router.
api_router = APIRouter()

# Include routers: Each domain has its own router, combined here.
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(products.router, prefix="/products", tags=["products"])
```
**Explanation:**
The router aggregation pattern keeps the main app file clean. Each domain (users, auth, products) has its own router, and they're all combined in `api_router`. This makes it easy to organize and version your API.

### 5. `app/db/session.py` - Database Session Management

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.core.config import settings

# engine: Database connection pool. Created once, reused for all requests.
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,  # Log SQL queries in debug mode
    pool_pre_ping=True,  # Verify connections before use
    pool_size=10,  # Connection pool size
    max_overflow=20  # Additional connections when pool exhausted
)

# async_session_maker: Factory for creating database sessions.
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False  # Keep objects accessible after commit
)

# get_db: Dependency that manages session lifecycle (create, commit, rollback, close).
async def get_db() -> AsyncSession:
    """Dependency for getting database session"""
    async with async_session_maker() as session:
        try:
            yield session  # Session available during request
            await session.commit()  # Commit on success
        except Exception:
            await session.rollback()  # Rollback on error
            raise
        finally:
            await session.close()  # Always close session
```
**Explanation:**
This is the standard database session dependency. It creates a session, yields it to the route handler, commits on success, rolls back on error, and always closes the connection. This pattern prevents connection leaks and ensures transactional integrity.

### 6. `app/repositories/user_repository.py` - Data Access Layer

```python
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.schemas.user import UserCreate


# UserRepository: Data access layer. Abstracts database operations for User model.
class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session  # Injected database session
    
    async def get_by_id(self, user_id: int) -> Optional[User]:
        # Query by ID: Returns User or None if not found.
        result = await self.session.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()
    
    async def get_by_email(self, email: str) -> Optional[User]:
        # Query by email: Used for authentication lookups.
        result = await self.session.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()
    
    async def create(self, user_data: UserCreate) -> User:
        # Create user: Converts Pydantic schema to ORM model, saves to DB.
        user = User(**user_data.dict())  # Convert schema to model
        self.session.add(user)
        await self.session.flush()  # Flush to get ID
        await self.session.refresh(user)  # Refresh to get all fields
        return user
```
**Explanation:**
The Repository pattern abstracts database operations. Each repository handles CRUD operations for a specific model. This separation makes it easy to swap databases, mock data access in tests, and keep business logic independent of database details.

### 7. `app/services/user_service.py` - Business Logic Layer

```python
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate
from app.core.exceptions import NotFoundError, ValidationError
from sqlalchemy.ext.asyncio import AsyncSession


# UserService: Business logic layer. Orchestrates repositories and enforces business rules.
class UserService:
    def __init__(self, session: AsyncSession):
        self.repository = UserRepository(session)  # Inject repository
    
    async def create_user(self, user_data: UserCreate):
        # Business logic: Check if email exists. Enforces uniqueness rule.
        if await self.repository.get_by_email(user_data.email):
            raise ValidationError("Email already registered")
        
        # Create user: Delegates to repository after validation.
        return await self.repository.create(user_data)
    
    async def get_user(self, user_id: int):
        # Get user: Throws domain exception if not found (not HTTP exception).
        user = await self.repository.get_by_id(user_id)
        if not user:
            raise NotFoundError(f"User {user_id} not found")
        return user
```
**Explanation:**
The Service layer contains business logic and orchestrates repositories. It enforces business rules (like "email must be unique") and throws domain-specific exceptions. Services are injected into route handlers via dependencies.

## Alternative Layouts

### Microservices Layout

For microservices, each service has its own structure:

```
services/
├── user-service/
│   ├── app/
│   │   └── ... (same structure as above)
│   └── Dockerfile
├── product-service/
│   └── ...
└── gateway/
    └── ...
```

### Monorepo Layout

For monorepos with shared code:

```
monorepo/
├── apps/
│   ├── api/
│   └── worker/
├── packages/
│   ├── shared/
│   │   ├── models/
│   │   └── utils/
│   └── database/
└── packages/
```

### Domain-Driven Design Layout

For complex domains:

```
app/
├── domains/
│   ├── user/
│   │   ├── models.py
│   │   ├── repositories.py
│   │   ├── services.py
│   │   └── schemas.py
│   └── product/
│       └── ...
└── api/
    └── v1/
        └── endpoints/
            ├── users.py
            └── products.py
```

## Best Practices

### 1. **Separate Concerns**

**Why:** Each layer has a single responsibility. API routes handle HTTP, services contain business logic, repositories handle data access. This makes code testable and maintainable.

### 2. **Use Dependency Injection**

**Why:** Dependency injection makes code testable and flexible. Inject dependencies via constructors or FastAPI's `Depends()` instead of creating them internally.

```python
# ✅ Good: Dependencies injected, can be overridden in tests.
def get_user_service(db: AsyncSession = Depends(get_db)) -> UserService:
    return UserService(db)

# ❌ Bad: Dependencies created internally, hard to test or override.
service = UserService()  # Creates dependencies internally
```
**Explanation:**
Dependency injection makes code testable and flexible. Instead of creating dependencies inside classes, inject them via constructors or FastAPI's `Depends()`. This allows you to swap implementations (e.g., mock database for tests).

### 3. **Version Your API**

**Why:** API versioning allows evolution without breaking existing clients. When you need breaking changes, create a new version while keeping the old one running.

```python
# Version your API: Multiple versions can coexist.
app.include_router(api_router, prefix="/api/v1")  # Old version
app.include_router(api_router_v2, prefix="/api/v2")  # New version
```
**Explanation:**
API versioning (via URL prefix like `/api/v1`) allows you to evolve your API without breaking existing clients. When you need breaking changes, create a new version (`/api/v2`) while keeping the old one running.

### 4. **Keep Routes Thin**

**Why:** Route handlers should delegate to services. Mixing business logic with HTTP handling makes code hard to test and reuse.

```python
# ✅ Good: Route delegates to service. Business logic in service layer.
@router.post("/users/")
async def create_user(user: UserCreate, service: UserService = Depends(...)):
    return await service.create_user(user)  # Thin route, logic in service

# ❌ Bad: Business logic in route. Hard to test, violates separation of concerns.
@router.post("/users/")
async def create_user(user: UserCreate, db: AsyncSession = Depends(...)):
    # Business logic mixed with HTTP handling
    if await db.query(User).filter(User.email == user.email).first():
        raise HTTPException(...)
    # ...
```
**Explanation:**
Route handlers should delegate to services. Mixing business logic (like checking if email exists) with HTTP handling makes code hard to test and reuse. Keep routes thin—they should only handle request/response mapping.

### 5. **Use Pydantic for Validation**

**Why:** Pydantic schemas define the shape and validation rules for request/response data. Validation happens automatically, keeping logic declarative and separate from business code.

```python
# app/schemas/user.py
from pydantic import BaseModel, EmailStr, Field

# UserCreate: Pydantic schema validates request body automatically.
class UserCreate(BaseModel):
    email: EmailStr  # Validates email format
    password: str = Field(min_length=8)  # Enforces minimum length
    age: int = Field(gt=0, lt=150)  # Validates age range
```
**Explanation:**
Pydantic schemas define the shape and validation rules for request/response data. Use them to validate inputs (like email format, password length) automatically. This keeps validation logic declarative and separate from business logic.

## Testing Structure

```
tests/
├── conftest.py              # Shared fixtures
├── unit/
│   ├── test_services.py
│   └── test_repositories.py
├── integration/
│   ├── test_api_endpoints.py
│   └── test_database.py
└── fixtures/
    └── factories.py         # Test data factories
```

## Key Files Explained

| File/Folder | Purpose |
|------------|---------|
| `main.py` | Application initialization, middleware, lifespan |
| `core/` | Configuration, security, logging, exceptions |
| `api/` | Route handlers and API dependencies |
| `schemas/` | Pydantic models for request/response validation |
| `models/` | SQLAlchemy ORM models (database structure) |
| `repositories/` | Data access abstraction layer |
| `services/` | Business logic orchestration |
| `db/` | Database connection and session management |

## Conclusion

**Key Benefits:** Clear separation of concerns, easy to navigate and understand, testable components, scalable architecture, and team collaboration friendly.

**Adaptation:** Adapt the structure based on your project size and team preferences, but maintain clear boundaries between layers. Start with this structure and evolve as needed.

