# Dependency Injection Best Practices in FastAPI

FastAPI's dependency injection system is one of its most powerful features. It enables clean, testable, and maintainable code by managing dependencies automatically.

## Understanding FastAPI Dependencies

FastAPI's `Depends()` provides dependency injection similar to Angular or Spring. Dependencies are resolved automatically and can depend on other dependencies.

### Basic Example

```python
from fastapi import Depends, FastAPI

def get_db():
    db = create_db_connection()
    try:
        yield db
    finally:
        db.close()

@app.get("/items/")
def read_items(db = Depends(get_db)):
    return db.query(Item).all()
```

## Dependency Patterns

### 1. **Function-Based Dependencies**

Simple dependencies that return values:

```python
from fastapi import Depends

def get_query_token(token: str):
    return token

@app.get("/items/")
def read_items(token: str = Depends(get_query_token)):
    return {"token": token}
```

### 2. **Generator-Based Dependencies (Resource Management)**

For resources that need cleanup (database connections, file handles):

```python
from sqlalchemy.ext.asyncio import AsyncSession

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
```

### 3. **Class-Based Dependencies**

For more complex dependencies with state:

```python
from typing import Annotated
from fastapi import Depends

class DatabaseService:
    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        self.session = None
    
    async def __aenter__(self):
        self.session = await create_session(self.connection_string)
        return self
    
    async def __aexit__(self, *args):
        await self.session.close()

def get_db_service() -> DatabaseService:
    return DatabaseService(settings.DATABASE_URL)

@app.get("/items/")
async def read_items(
    db: Annotated[DatabaseService, Depends(get_db_service)]
):
    async with db:
        return await db.session.query(Item).all()
```

## Best Practices

### 1. **Create Reusable Dependency Factories**

```python
# app/api/deps.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import verify_token
from app.db.session import async_session_maker
from app.repositories.user_repository import UserRepository

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


# Database dependency
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


# Repository dependencies
def get_user_repository(
    db: AsyncSession = Depends(get_db)
) -> UserRepository:
    return UserRepository(db)


# Service dependencies
def get_user_service(
    repo: UserRepository = Depends(get_user_repository)
) -> UserService:
    return UserService(repo)


# Authentication dependencies
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials"
    )
    payload = verify_token(token, credentials_exception)
    user = await UserRepository(db).get_by_email(payload.get("sub"))
    if user is None:
        raise credentials_exception
    return user


# Role-based access
def require_role(required_role: str):
    async def role_checker(
        current_user: User = Depends(get_current_user)
    ) -> User:
        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user
    return role_checker
```

### 2. **Use Type Annotations with Annotated**

Python 3.9+ supports `Annotated` for clearer dependency declarations:

```python
from typing import Annotated

from fastapi import Depends

# ✅ Clear and explicit
@app.get("/users/")
async def get_users(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    pass

# Still works, but less explicit
@app.get("/users/")
async def get_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    pass
```

### 3. **Compose Dependencies**

Dependencies can depend on other dependencies:

```python
# Service depends on repository
def get_user_service(
    repo: UserRepository = Depends(get_user_repository)
) -> UserService:
    return UserService(repo)

# Repository depends on database
def get_user_repository(
    db: AsyncSession = Depends(get_db)
) -> UserRepository:
    return UserRepository(db)

# Endpoint depends on service
@app.get("/users/{user_id}")
async def get_user(
    user_id: int,
    service: UserService = Depends(get_user_service)
):
    return await service.get_user(user_id)
```

### 4. **Share Dependencies Across Routes**

Create a shared dependency module:

```python
# app/api/deps.py
from fastapi import Depends

# Shared dependencies
async def get_db(): ...
def get_current_user(): ...
def get_user_service(): ...

# app/api/v1/endpoints/users.py
from app.api.deps import get_user_service

@router.get("/users/")
async def list_users(service = Depends(get_user_service)):
    pass

# app/api/v1/endpoints/products.py
from app.api.deps import get_db, get_current_user

@router.get("/products/")
async def list_products(
    db = Depends(get_db),
    user = Depends(get_current_user)
):
    pass
```

### 5. **Cache Dependencies When Appropriate**

Use `cache=True` to cache dependency results:

```python
from fastapi import Depends

# Cache the configuration - only created once
def get_config():
    return load_config_from_file()

@app.get("/items/")
def read_items(config = Depends(get_config, use_cache=True)):
    return config.items
```

### 6. **Handle Resource Cleanup Properly**

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def get_resource():
    resource = await create_resource()
    try:
        yield resource
    finally:
        await cleanup_resource(resource)

# FastAPI handles the context manager automatically
@app.get("/items/")
async def read_items(resource = Depends(get_resource)):
    # Resource is available here
    return await resource.fetch_items()
    # Cleanup happens automatically after response
```

## Advanced Patterns

### 1. **Dependency Overrides for Testing**

```python
# app/api/deps.py
def get_db():
    async with async_session_maker() as session:
        yield session

# tests/conftest.py
from fastapi.testclient import TestClient
from app.main import app
from app.api.deps import get_db

async def override_get_db():
    async with test_session_maker() as session:
        yield session

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)
```

### 2. **Conditional Dependencies**

```python
from fastapi import Depends, Header, HTTPException

def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != "secret-key":
        raise HTTPException(status_code=403)
    return x_api_key

# Only some routes use this
@app.get("/protected/")
def protected_route(key: str = Depends(verify_api_key)):
    return {"status": "ok"}
```

### 3. **Multiple Dependencies**

```python
@app.get("/items/")
async def read_items(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    config: Config = Depends(get_config)
):
    # All dependencies are resolved and available
    return await db.query(Item).filter_by(user_id=current_user.id).all()
```

### 4. **Sub-dependencies**

```python
def get_query_params(q: Optional[str] = None, skip: int = 0, limit: int = 100):
    return {"q": q, "skip": skip, "limit": limit}

def get_database_and_params(
    params: dict = Depends(get_query_params),
    db: AsyncSession = Depends(get_db)
):
    return {"db": db, **params}

@app.get("/items/")
async def read_items(
    deps: dict = Depends(get_database_and_params)
):
    db = deps["db"]
    q = deps["q"]
    # ...
```

## Common Patterns

### Authentication Pattern

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    user = await verify_token(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    return user

@app.get("/users/me")
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user
```

### Pagination Pattern

```python
from typing import Optional
from pydantic import BaseModel

class PaginationParams(BaseModel):
    page: int = 1
    size: int = 20
    
    @property
    def skip(self):
        return (self.page - 1) * self.size
    
    @property
    def limit(self):
        return self.size

def get_pagination(
    page: int = 1,
    size: int = Query(ge=1, le=100, default=20)
) -> PaginationParams:
    return PaginationParams(page=page, size=size)

@app.get("/items/")
async def read_items(pagination: PaginationParams = Depends(get_pagination)):
    return await get_items(skip=pagination.skip, limit=pagination.limit)
```

### Rate Limiting Pattern

```python
from collections import defaultdict
from datetime import datetime, timedelta

rate_limit_store = defaultdict(list)

def check_rate_limit(
    request: Request,
    limit: int = 100,
    window: int = 60
):
    client_ip = request.client.host
    now = datetime.now()
    window_start = now - timedelta(seconds=window)
    
    # Clean old entries
    rate_limit_store[client_ip] = [
        timestamp for timestamp in rate_limit_store[client_ip]
        if timestamp > window_start
    ]
    
    if len(rate_limit_store[client_ip]) >= limit:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded"
        )
    
    rate_limit_store[client_ip].append(now)

@app.get("/items/")
async def read_items(_ = Depends(check_rate_limit)):
    return {"items": []}
```

## Testing with Dependencies

```python
# tests/conftest.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

from app.api.deps import get_db, get_current_user
from tests.factories import create_test_user

# Override dependencies
@pytest.fixture
def override_get_db():
    async def _get_db():
        async with test_session_maker() as session:
            yield session
    return _get_db

@pytest.fixture
def override_get_current_user():
    def _get_current_user():
        return create_test_user()
    return _get_current_user

@pytest.fixture
def client(override_get_db, override_get_current_user):
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    yield TestClient(app)
    app.dependency_overrides.clear()

# tests/test_endpoints.py
def test_get_users(client):
    response = client.get("/api/v1/users/")
    assert response.status_code == 200
```

## Anti-Patterns to Avoid

### ❌ Don't: Create dependencies inside routes

```python
# ❌ Bad
@app.get("/users/")
async def get_users():
    db = get_db()  # Creates dependency manually
    return db.query(User).all()
```

### ❌ Don't: Mix dependencies with business logic

```python
# ❌ Bad
@app.get("/users/")
async def get_users(db = Depends(get_db)):
    # Business logic mixed with dependency resolution
    if not db:
        raise HTTPException(...)
    users = db.query(User).all()
    # More business logic...
```

### ❌ Don't: Ignore resource cleanup

```python
# ❌ Bad - resource leak
def get_connection():
    return create_connection()  # Never closed

# ✅ Good
def get_connection():
    conn = create_connection()
    try:
        yield conn
    finally:
        conn.close()
```

## Summary

FastAPI's dependency injection enables:
- ✅ Clean separation of concerns
- ✅ Easy testing with overrides
- ✅ Reusable components
- ✅ Automatic resource management
- ✅ Type-safe dependencies

Use dependencies for:
- Database sessions
- Authentication/authorization
- Service layer instances
- Configuration
- Resource management
- Shared utilities

Avoid:
- Creating dependencies manually in routes
- Mixing dependency resolution with business logic
- Ignoring resource cleanup

