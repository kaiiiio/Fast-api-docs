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
# Depends(get_db): Injects the result of get_db into the function.
def read_items(db = Depends(get_db)):
    return db.query(Item).all()
```
**Explanation:**
The `get_db` function is a dependency. The `yield` statement makes it a generator, allowing code execution *after* the request is finished (in the `finally` block) to close the database connection. FastAPI injects the yielded value (`db`) into the route handler.

## Dependency Patterns

### 1. **Function-Based Dependencies**

Simple dependencies that return values. Use for shared logic like extracting query parameters, headers, or simple transformations:

```python
from fastapi import Depends

# get_query_token: Simple dependency that extracts and returns the token.
def get_query_token(token: str):
    return token

@app.get("/items/")
# Depends(get_query_token): Calls get_query_token and injects the return value.
def read_items(token: str = Depends(get_query_token)):
    return {"token": token}
```
**Explanation:**
This is the simplest form of dependency injection. `get_query_token` is called by FastAPI, and its return value is passed to `read_items`. This is useful for shared logic like extracting query parameters or headers.

### 2. **Generator-Based Dependencies (Resource Management)**

For resources that need cleanup (database connections, file handles). The `yield` statement allows code execution before (setup) and after (cleanup) the route handler runs:

```python
from sqlalchemy.ext.asyncio import AsyncSession

# get_db: Generator dependency for database session management.
async def get_db() -> AsyncSession:
    async with async_session_maker() as session:
        try:
            yield session  # Session available during request
            await session.commit()  # Commit after successful request
        except Exception:
            await session.rollback()  # Rollback on error
            raise
        finally:
            # Ensure session is closed even if errors occur.
            await session.close()
```
**Explanation:**
This pattern is crucial for resource management. The `try...finally` block ensures that resources like database connections are always released, preventing leaks. The `yield` pauses execution until the route handler finishes.

### 3. **Class-Based Dependencies**

For more complex dependencies with state. Encapsulates logic and lifecycle management. Use when you need to maintain state between calls or implement context managers:

```python
from typing import Annotated
from fastapi import Depends

# DatabaseService: Context manager class for database operations.
class DatabaseService:
    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        self.session = None
    
    async def __aenter__(self):
        self.session = await create_session(self.connection_string)
        return self
    
    async def __aexit__(self, *args):
        await self.session.close()

# get_db_service: Factory function that returns DatabaseService instance.
def get_db_service() -> DatabaseService:
    return DatabaseService(settings.DATABASE_URL)

@app.get("/items/")
async def read_items(
    # Annotated: Modern way to declare dependencies with type hints.
    db: Annotated[DatabaseService, Depends(get_db_service)]
):
    async with db:
        return await db.session.query(Item).all()
```
**Explanation:**
Class-based dependencies allow you to encapsulate state and logic. Here, `DatabaseService` manages the connection lifecycle. Using `Annotated` (Python 3.9+) makes the dependency injection cleaner and more readable.

## Best Practices

### 1. **Create Reusable Dependency Factories**

Centralize dependencies in a `deps.py` module. This promotes reusability, avoids circular imports, and makes testing easier through dependency overrides:

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

# Database dependency: Manages async session lifecycle with commit/rollback.
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


# Repository dependencies: Injects DB session into repository.
def get_user_repository(
    db: AsyncSession = Depends(get_db)
) -> UserRepository:
    return UserRepository(db)

# Service dependencies: Injects repository into service (dependency composition).
def get_user_service(
    repo: UserRepository = Depends(get_user_repository)
) -> UserService:
    return UserService(repo)

# Authentication dependencies: Validates token and returns current user.
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


# Role-based access: Factory function that creates a dependency for role checking.
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
**Explanation:**
This comprehensive example shows how to structure dependencies for a real-world application. It demonstrates:
1.  **Database Dependency**: Manages the session lifecycle.
2.  **Repository/Service Dependencies**: Injects lower-level components into higher-level ones (Service -> Repository -> DB).
3.  **Authentication**: Verifies tokens and retrieves the current user.
4.  **Role-Based Access**: A factory function (`require_role`) that creates a dependency to check user permissions dynamically.

### 2. **Use Type Annotations with Annotated**

Python 3.9+ supports `Annotated` for clearer dependency declarations. Separates type hints from metadata, improving readability and static analysis:

```python
from typing import Annotated

from fastapi import Depends

# ✅ Clear and explicit: Annotated separates type from dependency metadata.
@app.get("/users/")
async def get_users(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    pass

# Still works, but less explicit: Type and dependency mixed together.
@app.get("/users/")
async def get_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    pass
```
**Explanation:**
`Annotated` is the recommended way to declare dependencies in modern FastAPI. It separates the type hint (`AsyncSession`) from the metadata (`Depends(get_db)`), making the function signature cleaner and easier for static analysis tools to understand.

### 3. **Compose Dependencies**

Dependencies can depend on other dependencies. FastAPI automatically resolves the dependency graph, creating instances from bottom to top. This enables clean layering (Service → Repository → DB):

```python
# Service depends on repository: Dependency composition example.
def get_user_service(
    repo: UserRepository = Depends(get_user_repository)
) -> UserService:
    return UserService(repo)

# Repository depends on database: Lower-level dependency.
def get_user_repository(
    db: AsyncSession = Depends(get_db)
) -> UserRepository:
    return UserRepository(db)

# Endpoint depends on service: FastAPI resolves entire dependency graph automatically.
@app.get("/users/{user_id}")
async def get_user(
    user_id: int,
    service: UserService = Depends(get_user_service)
):
    return await service.get_user(user_id)
```
**Explanation:**
Dependencies can form a graph. Here, the endpoint requires `UserService`, which requires `UserRepository`, which requires `AsyncSession`. FastAPI resolves this graph automatically, creating instances from the bottom up. This promotes modularity and reusability.

### 4. **Share Dependencies Across Routes**

Create a shared dependency module. Import from `deps.py` in multiple routers to maintain consistency and reduce duplication:

```python
# app/api/deps.py
from fastapi import Depends

# Shared dependencies: Centralized in one module for reuse.
async def get_db(): ...
def get_current_user(): ...
def get_user_service(): ...

# app/api/v1/endpoints/users.py
from app.api.deps import get_user_service

@router.get("/users/")
# Import and use shared dependencies from deps.py.
async def list_users(service = Depends(get_user_service)):
    pass

# app/api/v1/endpoints/products.py
from app.api.deps import get_db, get_current_user

@router.get("/products/")
# Multiple routers can import the same dependencies.
async def list_products(
    db = Depends(get_db),
    pass
```
**Explanation:**
Centralizing dependencies in a `deps.py` module is a best practice for larger projects. It avoids circular imports and makes it easy to find and reuse dependency logic across different routers.

### 5. **Cache Dependencies When Appropriate**

Use `use_cache=True` (default) to cache dependency results within a single request. If the same dependency is used multiple times in one request, it executes only once, improving performance:

```python
from fastapi import Depends

# get_config: Configuration loader - expensive operation, should be cached.
def get_config():
    return load_config_from_file()

@app.get("/items/")
# use_cache=True: Default behavior. Ensures get_config is called only once per request.
def read_items(config = Depends(get_config, use_cache=True)):
    return config.items
```
**Explanation:**
By default, FastAPI caches the result of a dependency within a single request. If `get_config` is used multiple times in the same request, it will only be executed once. This is efficient for things like loading configuration or database sessions.

### 6. **Handle Resource Cleanup Properly**

Always use `try...finally` or context managers for resources that need cleanup. FastAPI ensures cleanup code runs even if the route handler raises an exception:

```python
from contextlib import asynccontextmanager

# get_resource: Context manager pattern for resource lifecycle.
@asynccontextmanager
async def get_resource():
    resource = await create_resource()  # Setup
    try:
        yield resource  # Resource available during request
    finally:
        await cleanup_resource(resource)  # Cleanup after response

# FastAPI handles the context manager automatically.
@app.get("/items/")
async def read_items(resource = Depends(get_resource)):
    # Resource is available here
    # Cleanup happens automatically after response
```
**Explanation:**
Using `asynccontextmanager` with `yield` is the standard way to handle resources that need setup and teardown (like opening and closing a network connection). FastAPI ensures the `finally` block runs after the response is sent.

## Advanced Patterns

### 1. **Dependency Overrides for Testing**

Use `app.dependency_overrides` to replace real dependencies with mocks or test versions. Essential for unit testing without modifying application code:

```python
# app/api/deps.py
def get_db():
    async with async_session_maker() as session:
        yield session

# tests/conftest.py
from fastapi.testclient import TestClient
from app.main import app
from app.api.deps import get_db

# override_get_db: Test version using test database instead of production.
async def override_get_db():
    async with test_session_maker() as session:
        yield session

# Override original dependency with test version.
app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)
```
**Explanation:**
`dependency_overrides` is a powerful feature for testing. It allows you to replace a real dependency (like a database connection) with a mock or test version (like an in-memory database) globally for the application, without changing the application code.

### 2. **Conditional Dependencies**

Dependencies can raise exceptions to abort requests. Perfect for guards, validation, and authorization checks. If a dependency raises `HTTPException`, the request stops immediately:

```python
from fastapi import Depends, Header, HTTPException

# verify_api_key: Conditional dependency that raises exception if validation fails.
def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != "secret-key":
        raise HTTPException(status_code=403)  # Aborts request immediately
    return x_api_key

# Only some routes use this: Selective protection.
@app.get("/protected/")
def protected_route(key: str = Depends(verify_api_key)):
    return {"status": "ok"}
```
**Explanation:**
Dependencies can raise exceptions (like `HTTPException`). If `verify_api_key` raises an error, the request is aborted immediately, and the error response is sent to the client. This is perfect for guards and validation.

### 3. **Multiple Dependencies**

A single route can have multiple dependencies. FastAPI resolves them all in parallel. Shared sub-dependencies are created only once per request (unless `use_cache=False`), optimizing performance:

```python
@app.get("/items/")
# Multiple dependencies: FastAPI resolves all in parallel, sharing sub-dependencies.
async def read_items(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    config: Config = Depends(get_config)
):
    # All dependencies are resolved and available
    return await db.query(Item).filter_by(user_id=current_user.id).all()
```
**Explanation:**
A single route can have multiple dependencies. FastAPI resolves them all. If they share sub-dependencies (like both needing a DB connection), FastAPI is smart enough to create the sub-dependency only once per request (unless `use_cache=False`).

### 4. **Sub-dependencies (Bundling Pattern)**

Group common dependencies into a single function to keep route signatures clean. Useful when multiple endpoints share the same set of dependencies:

```python
# get_query_params: Extracts and validates query parameters.
def get_query_params(q: Optional[str] = None, skip: int = 0, limit: int = 100):
    return {"q": q, "skip": skip, "limit": limit}

# get_database_and_params: Bundles multiple dependencies into one.
def get_database_and_params(
    params: dict = Depends(get_query_params),
    db: AsyncSession = Depends(get_db)
):
    return {"db": db, **params}

@app.get("/items/")
# Single dependency bundles multiple sub-dependencies, keeping signature clean.
async def read_items(
    deps: dict = Depends(get_database_and_params)
):
    db = deps["db"]
    q = deps["q"]
    # ...
```
**Explanation:**
This pattern ("Bundling") allows you to group common dependencies into a single function (`get_database_and_params`). This keeps your route signatures clean, especially when you have many standard dependencies for a set of endpoints.

## Common Patterns

### Authentication Pattern

Extract token from request, validate it, and return the authenticated user. If validation fails, raise `HTTPException` to protect the route:

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# get_current_user: Extracts token, validates it, and returns authenticated user.
async def get_current_user(token: str = Depends(oauth2_scheme)):
    user = await verify_token(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    return user

@app.get("/users/me")
# Route receives validated User object directly from dependency.
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user
```
**Explanation:**
Authentication is one of the most common uses of dependencies. The `get_current_user` dependency parses the token, validates it, and fetches the user. If any step fails, it raises an exception, protecting the route. The route handler receives the validated `User` object directly.

### Pagination Pattern

Encapsulate pagination logic in a Pydantic model and dependency. Validates query parameters and provides computed properties (`skip`, `limit`) for consistent pagination across all list endpoints:

```python
from typing import Optional
from pydantic import BaseModel

# PaginationParams: Pydantic model with computed properties for pagination logic.
class PaginationParams(BaseModel):
    page: int = 1
    size: int = 20
    
    @property
    def skip(self):
        return (self.page - 1) * self.size
    
    @property
    def limit(self):
        return self.size

# get_pagination: Validates query params and returns PaginationParams instance.
def get_pagination(
    page: int = 1,
    size: int = Query(ge=1, le=100, default=20)
) -> PaginationParams:
    return PaginationParams(page=page, size=size)

@app.get("/items/")
# Depends(get_pagination): Injects a PaginationParams object with parsed/validated query params.
async def read_items(pagination: PaginationParams = Depends(get_pagination)):
    return await get_items(skip=pagination.skip, limit=pagination.limit)
```
**Explanation:**
This pattern encapsulates logic for parsing and validating query parameters (like `page` and `size`) into a reusable class (`PaginationParams`) and dependency (`get_pagination`). This keeps controller logic clean and consistent across all list endpoints.

### Rate Limiting Pattern

Dependencies can be used purely for side effects (no return value needed). This pattern tracks request counts per IP and raises an exception if the limit is exceeded, protecting your API from abuse:

```python
from collections import defaultdict
from datetime import datetime, timedelta

rate_limit_store = defaultdict(list)

# check_rate_limit: Side-effect dependency (no return value) that tracks and enforces rate limits.
def check_rate_limit(
    request: Request,
    limit: int = 100,
    window: int = 60
):
    client_ip = request.client.host
    now = datetime.now()
    window_start = now - timedelta(seconds=window)
    
    # Clean old entries: Remove timestamps outside the time window.
    rate_limit_store[client_ip] = [
        timestamp for timestamp in rate_limit_store[client_ip]
        if timestamp > window_start
    ]
    
    if len(rate_limit_store[client_ip]) >= limit:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded"
        )
    
    rate_limit_store[client_ip].append(now)  # Record this request

@app.get("/items/")
# Using _ for unused dependency return value (only side effects matter).
async def read_items(_ = Depends(check_rate_limit)):
    return {"items": []}
```
**Explanation:**
Dependencies don't always need to return a value. `check_rate_limit` is used here purely for its side effects (checking and updating the rate limit store). If the limit is exceeded, it raises an exception; otherwise, the request proceeds.

## Testing with Dependencies

Override dependencies in test fixtures using `app.dependency_overrides`. Map original dependencies to test versions (mocks, test database). Always clear overrides after tests to avoid affecting other tests:

```python
# tests/conftest.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

from app.api.deps import get_db, get_current_user
from tests.factories import create_test_user

# Override dependencies: Create test fixtures that return override functions.
@pytest.fixture
def override_get_db():
    async def _get_db():
        async with test_session_maker() as session:
            yield session
    return _get_db

@pytest.fixture
def override_get_current_user():
    def _get_current_user():
        return create_test_user()  # Return mock user instead of real DB lookup
    return _get_current_user

@pytest.fixture
# client: Sets up overrides before test, clears them after (prevents test pollution).
def client(override_get_db, override_get_current_user):
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    yield TestClient(app)
    app.dependency_overrides.clear()  # Clean up after test

# tests/test_endpoints.py
    response = client.get("/api/v1/users/")
    assert response.status_code == 200
```
**Explanation:**
This test setup shows how to override dependencies for testing. `app.dependency_overrides` is a dictionary where you map the original dependency function to the override function. When the app runs during the test, it uses the override, allowing you to use mock data or a test database.

## Anti-Patterns to Avoid

### ❌ Don't: Create dependencies inside routes

**Why:** Bypasses FastAPI's DI system, losing automatic resource management, caching, and testability. Always use `Depends()`:

```python
# ❌ Bad: Manually calling dependency bypasses FastAPI's DI system.
@app.get("/users/")
async def get_users():
    db = get_db()  # Creates dependency manually - loses cleanup, caching, testability
    return db.query(User).all()
```
**Explanation:**
**Why this is bad:** Calling dependency functions directly bypasses FastAPI's dependency injection system. This means you lose automatic resource management (cleanup), caching, and the ability to override dependencies for testing. Always use `Depends()`.

### ❌ Don't: Mix dependencies with business logic

**Why:** Route handlers should focus on HTTP request/response. Move complex business logic to Service layer or domain models for better testability and reusability:

```python
# ❌ Bad: Business logic should be in Service layer, not route handlers.
@app.get("/users/")
async def get_users(db = Depends(get_db)):
    # Business logic mixed with dependency resolution
    if not db:
        raise HTTPException(...)
    users = db.query(User).all()
    # More business logic...  # Should be: service.get_users()
```
**Explanation:**
**Why this is bad:** Route handlers (controllers) should focus on handling the HTTP request and response. Complex business logic should be moved to a Service layer or domain model. This makes the code easier to test and reuse.

### ❌ Don't: Ignore resource cleanup

**Why:** Unclosed resources (DB connections, file handles) cause leaks and can crash your application under load. Always use `try...finally` or context managers:

```python
# ❌ Bad - resource leak: Connection never closed, will accumulate and crash app.
def get_connection():
    return create_connection()  # Never closed

# ✅ Good: Generator with finally block ensures cleanup always happens.
def get_connection():
    conn = create_connection()
    try:
        yield conn
    finally:
        conn.close()  # Always executed, even on exceptions
```
**Explanation:**
**Why this is bad:** Not closing resources (like DB connections or file handles) leads to resource leaks, which can crash your application under load. Always use `try...finally` or context managers (`with` statements) to ensure cleanup.

## Summary

**Key Benefits:** Clean separation of concerns, easy testing with overrides, reusable components, automatic resource management, and type-safe dependencies.

**Use for:** Database sessions, authentication/authorization, service layer instances, configuration, resource management, and shared utilities.

**Avoid:** Creating dependencies manually in routes, mixing dependency resolution with business logic, and ignoring resource cleanup.

---

## 🎯 Interview Questions: FastAPI

### Q1: Explain FastAPI's dependency injection system, including how it works, dependency composition, resource management, testing with overrides, and best practices. Provide detailed examples showing advanced dependency patterns.

**Answer:**

**Dependency Injection Overview:**

FastAPI's dependency injection system allows you to declare dependencies that are automatically resolved and injected into route handlers. It promotes clean separation of concerns, testability, and reusable components.

**Why Dependency Injection:**

**Without DI (Manual Creation):**
```python
# ❌ Bad: Manual dependency creation
@app.get("/users/{user_id}")
async def get_user(user_id: int):
    db = create_db_session()  # Manual creation
    user = await db.get(User, user_id)
    db.close()  # Manual cleanup
    return user
# Problems: Hard to test, resource leaks, code duplication
```

**With DI (Automatic Resolution):**
```python
# ✅ Good: Automatic dependency injection
@app.get("/users/{user_id}")
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db)  # Automatic injection
):
    user = await db.get(User, user_id)
    return user
# Benefits: Testable, automatic cleanup, reusable
```

**Basic Dependency:**
```python
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

async def get_db() -> AsyncSession:
    """Dependency to get database session."""
    async with async_session_maker() as session:
        try:
            yield session  # Provide session
            await session.commit()  # Commit on success
        except Exception:
            await session.rollback()  # Rollback on error
            raise
        finally:
            await session.close()  # Always cleanup

@app.get("/users/{user_id}")
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db)  # Injected automatically
):
    return await db.get(User, user_id)
```

**Dependency Composition:**
```python
# Dependencies can depend on other dependencies
# FastAPI resolves the entire dependency graph

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

# FastAPI resolves: get_db → get_user_repository → get_user_service → endpoint
```

**Resource Management:**
```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def get_resource():
    """Context manager for resource lifecycle."""
    resource = await create_resource()  # Setup
    try:
        yield resource  # Resource available during request
    finally:
        await cleanup_resource(resource)  # Cleanup after response

@app.get("/items/")
async def read_items(resource = Depends(get_resource)):
    # Resource is available here
    # Cleanup happens automatically after response
    return {"items": []}
```

**Dependency Overrides for Testing:**
```python
# Override dependencies in tests
from fastapi.testclient import TestClient

# Test version of dependency
async def override_get_db():
    async with test_session_maker() as session:
        yield session

# Override in tests
app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)
# Now all routes use test database
```

**Conditional Dependencies:**
```python
from fastapi import Depends, Header, HTTPException

def verify_api_key(x_api_key: str = Header(...)):
    """Dependency that raises exception if validation fails."""
    if x_api_key != "secret-key":
        raise HTTPException(status_code=403)  # Aborts request
    return x_api_key

@app.get("/protected/")
def protected_route(key: str = Depends(verify_api_key)):
    return {"status": "ok"}
```

**Caching Dependencies:**
```python
# Dependencies are cached within a single request by default
def get_config():
    return load_config_from_file()  # Expensive operation

@app.get("/items/")
def read_items(
    config1 = Depends(get_config, use_cache=True),  # Cached
    config2 = Depends(get_config, use_cache=True)   # Uses cached result
):
    # get_config() called only once
    return config1.items
```

**System Design Consideration**: Dependency injection provides:
1. **Testability**: Easy to mock dependencies
2. **Maintainability**: Centralized dependency logic
3. **Reusability**: Share dependencies across routes
4. **Resource Management**: Automatic cleanup
5. **Type Safety**: Type hints for dependencies

FastAPI's dependency injection system is powerful and essential for building maintainable applications. Understanding dependency composition, resource management, testing with overrides, and best practices is crucial for building scalable, testable APIs.

---

### Q2: Explain dependency composition, sub-dependencies, dependency overrides for testing, and advanced patterns like conditional dependencies and dependency caching. Discuss when to use each pattern and best practices.

**Answer:**

**Dependency Composition:**

**Multiple Dependencies:**
```python
@app.get("/items/")
async def read_items(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    config: Config = Depends(get_config)
):
    # All dependencies resolved in parallel
    # Shared sub-dependencies created only once
    return await db.query(Item).filter_by(user_id=current_user.id).all()
```

**Sub-dependencies (Bundling):**
```python
# Group common dependencies
def get_query_params(q: Optional[str] = None, skip: int = 0, limit: int = 100):
    return {"q": q, "skip": skip, "limit": limit}

def get_database_and_params(
    params: dict = Depends(get_query_params),
    db: AsyncSession = Depends(get_db)
):
    return {"db": db, **params}

@app.get("/items/")
async def read_items(deps: dict = Depends(get_database_and_params)):
    db = deps["db"]
    q = deps["q"]
    # Clean signature with bundled dependencies
```

**Testing with Overrides:**
```python
# Override dependencies for testing
@pytest.fixture
def override_get_db():
    async def _get_db():
        async with test_session_maker() as session:
            yield session
    return _get_db

@pytest.fixture
def client(override_get_db):
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()  # Clean up
```

**System Design Consideration**: Advanced dependency patterns provide:
1. **Flexibility**: Conditional and cached dependencies
2. **Testability**: Easy overrides for testing
3. **Performance**: Dependency caching
4. **Clean Code**: Bundled dependencies

Understanding dependency composition, sub-dependencies, overrides, and advanced patterns is essential for building maintainable, testable applications. Always use dependency overrides for testing, cache expensive dependencies, and bundle common dependencies for cleaner code.


