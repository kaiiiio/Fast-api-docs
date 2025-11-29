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


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    setup_logging()
    async with engine.begin() as conn:
        # Create tables (only in dev/test)
        if settings.DEBUG:
            await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(api_router, prefix="/api/v1")
```

### 2. `app/core/config.py` - Configuration Management

```python
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    PROJECT_NAME: str = "My FastAPI App"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Database
    DATABASE_URL: str
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
```

### 3. `app/api/v1/endpoints/users.py` - Route Handlers

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.schemas.user import UserResponse, UserCreate
from app.services.user_service import UserService

router = APIRouter()


@router.post("/users/", response_model=UserResponse, status_code=201)
async def create_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new user"""
    service = UserService(db)
    return await service.create_user(user_data)


@router.get("/users/me", response_model=UserResponse)
async def get_current_user_info(
    current_user = Depends(get_current_user)
):
    """Get current user information"""
    return current_user
```

### 4. `app/api/v1/router.py` - Router Aggregation

```python
from fastapi import APIRouter

from app.api.v1.endpoints import users, auth, products

api_router = APIRouter()

api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(products.router, prefix="/products", tags=["products"])
```

### 5. `app/db/session.py` - Database Session Management

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)


async def get_db() -> AsyncSession:
    """Dependency for getting database session"""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```

### 6. `app/repositories/user_repository.py` - Data Access Layer

```python
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.schemas.user import UserCreate


class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def get_by_id(self, user_id: int) -> Optional[User]:
        result = await self.session.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()
    
    async def get_by_email(self, email: str) -> Optional[User]:
        result = await self.session.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()
    
    async def create(self, user_data: UserCreate) -> User:
        user = User(**user_data.dict())
        self.session.add(user)
        await self.session.flush()
        await self.session.refresh(user)
        return user
```

### 7. `app/services/user_service.py` - Business Logic Layer

```python
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate
from app.core.exceptions import NotFoundError, ValidationError
from sqlalchemy.ext.asyncio import AsyncSession


class UserService:
    def __init__(self, session: AsyncSession):
        self.repository = UserRepository(session)
    
    async def create_user(self, user_data: UserCreate):
        # Business logic: Check if email exists
        if await self.repository.get_by_email(user_data.email):
            raise ValidationError("Email already registered")
        
        # Create user
        return await self.repository.create(user_data)
    
    async def get_user(self, user_id: int):
        user = await self.repository.get_by_id(user_id)
        if not user:
            raise NotFoundError(f"User {user_id} not found")
        return user
```

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
- API routes handle HTTP
- Services contain business logic
- Repositories handle data access

### 2. **Use Dependency Injection**
```python
# ✅ Good
def get_user_service(db: AsyncSession = Depends(get_db)) -> UserService:
    return UserService(db)

# ❌ Bad
service = UserService()  # Creates dependencies internally
```

### 3. **Version Your API**
```python
app.include_router(api_router, prefix="/api/v1")
app.include_router(api_router_v2, prefix="/api/v2")
```

### 4. **Keep Routes Thin**
```python
# ✅ Good: Route delegates to service
@router.post("/users/")
async def create_user(user: UserCreate, service: UserService = Depends(...)):
    return await service.create_user(user)

# ❌ Bad: Business logic in route
@router.post("/users/")
async def create_user(user: UserCreate, db: AsyncSession = Depends(...)):
    # Business logic mixed with HTTP handling
    if await db.query(User).filter(User.email == user.email).first():
        raise HTTPException(...)
    # ...
```

### 5. **Use Pydantic for Validation**
```python
# app/schemas/user.py
from pydantic import BaseModel, EmailStr, Field

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    age: int = Field(gt=0, lt=150)
```

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

This structure provides:
- ✅ Clear separation of concerns
- ✅ Easy to navigate and understand
- ✅ Testable components
- ✅ Scalable architecture
- ✅ Team collaboration friendly

Adapt the structure based on your project size and team preferences, but maintain clear boundaries between layers.

