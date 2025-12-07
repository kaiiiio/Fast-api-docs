# 01. FastAPI Core Concepts: The Pillars of Power

## 1. Pydantic: Data Validation on Steroids

FastAPI doesn't just "use" Pydantic; it is fused with it. Pydantic is the reason you don't write boilerplate validation code.

### The Magic of Parsing

Pydantic doesn't just check types; it **coerces** them automatically.

```python
from pydantic import BaseModel

# Item: Pydantic model automatically converts types.
class Item(BaseModel):
    name: str
    price: float
    is_offer: bool = None

# Input: {"name": "Apple", "price": "5.5", "is_offer": "True"}
# Output: name="Apple", price=5.5, is_offer=True
```

**Explanation:** Pydantic turned the string "5.5" into a float and "True" into a boolean automatically. This type coercion happens during validation, making APIs more forgiving while maintaining type safety.

### Field Validation

You can add custom validation logic easily using validators.

```python
from pydantic import validator

# User: Custom validator enforces business rules.
class User(BaseModel):
    age: int

    @validator('age')
    def check_age(cls, v):
        # Custom validation: Enforce minimum age requirement.
        if v < 18:
            raise ValueError('Must be 18+')
        return v
```

**Explanation:** The `@validator` decorator allows you to add custom validation logic. This runs after type coercion, so you can enforce business rules beyond just type checking.

---

## 2. Dependency Injection: The Secret Weapon

Most frameworks make DI hard. FastAPI makes it trivial.

### What is it?
"I need X to do my job. Don't tell me how to build X, just give it to me."

### The `Depends` System
It's a hierarchical graph resolution system.
1.  Route A needs `User`.
2.  `User` needs `Token`.
3.  `Token` needs `Header`.

FastAPI resolves this graph, executes dependencies in order, and passes the results down.

```python
# get_token: Extracts token from header.
def get_token(header: str = Header(...)):
    return header

# get_user: Depends on get_token, creating dependency chain.
def get_user(token: str = Depends(get_token)):
    return find_user(token)

@app.get("/me")
# Depends(get_user): FastAPI resolves entire dependency graph automatically.
def read_me(user: User = Depends(get_user)):
    return user
```

**Explanation:** This is amazing because: **Reusability** - `get_user` can be used in 50 different routes. **Testing** - You can override `get_user` with a mock during tests. **Automatic resolution** - FastAPI resolves the dependency graph (Header → Token → User) automatically.

---

## 3. Async/Await: Concurrency for Humans

FastAPI is built on **Starlette** and **AnyIO**, making it natively asynchronous.

### `def` vs `async def`
- **`async def`**: Use this if your code uses `await` (e.g., DB calls, API requests). It runs on the main event loop. **FAST**.
- **`def`**: Use this if your code is blocking (e.g., heavy math, standard `time.sleep`). FastAPI runs this in a separate thread pool (threadpool) to prevent blocking the loop. **SAFE**.

**The Golden Rule**: If you are using a library that blocks (like `requests` or standard `sqlite3`), use `def`. If you use `httpx` or `motor`, use `async def`.

---

## 4. Path & Query Parameters

### Path Parameters (`/users/{id}`)

Mandatory parts of the route. FastAPI automatically converts types.

```python
# Path parameter: Type conversion happens automatically.
@app.get("/items/{item_id}")
def read_item(item_id: int):  # FastAPI converts string to int
    return {"item_id": item_id}
```

### Query Parameters (`/users?skip=0&limit=10`)

Optional configuration with default values.

```python
# Query parameters: Default values make them optional.
@app.get("/items/")
def read_items(skip: int = 0, limit: int = 10):
    return fake_items_db[skip : skip + limit]
```

### Validation

You can enforce strict rules on parameters using `Query` and `Path`.

```python
from fastapi import Query

# Query validation: Enforces length and regex patterns.
@app.get("/items/")
def read_items(q: str = Query(None, min_length=3, max_length=50, regex="^fixedquery$")):
    # Query parameter validated before function runs.
    ...
```

---

## 5. Middleware: The Gatekeepers

Middleware runs **before** the request hits your route and **after** the response is generated.

**Use cases:**
- **CORS**: Allowing your frontend to talk to your backend.
- **Process Time Header**: Measuring how long a request took.
- **GZip**: Compressing responses.

```python
# Middleware: Runs before request and after response.
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)  # Pass to route handler
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)  # Add header
    return response
```

**Explanation:** Middleware runs before the request hits your route and after the response is generated. Use cases: CORS, process time headers, GZip compression, authentication checks.

---

## 🎯 Interview Questions: FastAPI

### Q1: Explain FastAPI's core concepts including Pydantic models, dependency injection, async/await, path/query parameters, and middleware. Provide detailed examples showing how each concept works and when to use them.

**Answer:**

**FastAPI Core Concepts Overview:**

FastAPI is built on several powerful concepts that make it efficient and developer-friendly. Understanding these core concepts is essential for building robust APIs with FastAPI.

**1. Pydantic: Data Validation on Steroids**

**What is Pydantic:**

Pydantic is a data validation library that uses Python type annotations to validate data. FastAPI is deeply integrated with Pydantic, using it for request/response validation, type coercion, and automatic documentation.

**Type Coercion:**

Pydantic doesn't just check types; it automatically converts compatible types:

```python
from pydantic import BaseModel

class Item(BaseModel):
    name: str
    price: float
    is_offer: bool = None

# Input: {"name": "Apple", "price": "5.5", "is_offer": "True"}
# Pydantic automatically converts:
# - "5.5" (string) → 5.5 (float)
# - "True" (string) → True (boolean)
# Output: name="Apple", price=5.5, is_offer=True
```

**Custom Validation:**

You can add custom validation logic using validators:

```python
from pydantic import BaseModel, validator

class User(BaseModel):
    email: str
    age: int
    
    @validator('email')
    def validate_email(cls, v):
        if '@' not in v:
            raise ValueError('Invalid email format')
        return v
    
    @validator('age')
    def validate_age(cls, v):
        if v < 18:
            raise ValueError('Must be 18 or older')
        if v > 150:
            raise ValueError('Invalid age')
        return v

# Usage in FastAPI
@app.post("/users/")
async def create_user(user: User):
    # By the time we reach here:
    # - user.email is validated and guaranteed to contain '@'
    # - user.age is validated and guaranteed to be 18-150
    return await create_user_in_db(user)
```

**Benefits:**
- Automatic type conversion
- Custom validation rules
- Detailed error messages
- Type safety at runtime

**2. Dependency Injection: The Secret Weapon**

**What is Dependency Injection:**

Dependency Injection (DI) is a design pattern where dependencies are provided to a function rather than created inside it. FastAPI makes DI trivial with the `Depends` system.

**Basic Dependency:**

```python
from fastapi import Depends

def get_db():
    db = create_connection()
    try:
        yield db  # Resource available during request
    finally:
        db.close()  # Always cleanup

@app.get("/users/{user_id}")
async def get_user(user_id: int, db = Depends(get_db)):
    # db is automatically created and closed for you
    return await db.get_user(user_id)
```

**Dependency Chains:**

Dependencies can depend on other dependencies, creating a dependency graph:

```python
# get_token: Extracts token from header
def get_token(header: str = Header(...)):
    return header

# get_user: Depends on get_token
def get_user(token: str = Depends(get_token)):
    return find_user(token)

@app.get("/me")
# FastAPI resolves: Header → Token → User
async def read_me(user: User = Depends(get_user)):
    return user
```

**Benefits:**
- Reusability: Dependencies can be used across multiple routes
- Testing: Easy to override dependencies with mocks
- Automatic resolution: FastAPI resolves dependency graph
- Resource management: Automatic cleanup

**3. Async/Await: Concurrency for Humans**

**def vs async def:**

FastAPI supports both synchronous and asynchronous functions:

```python
# async def: Use for I/O-bound operations
@app.get("/users/{user_id}")
async def get_user(user_id: int):
    user = await db.get_user(user_id)  # Non-blocking
    return user

# def: Use for CPU-bound or blocking operations
@app.get("/calculate")
def calculate(data: List[float]):
    result = complex_math_operation(data)  # Blocking is OK
    return result
```

**The Golden Rule:**
- Use `async def` if your code uses `await` (DB calls, API requests)
- Use `def` if your code is blocking (heavy math, standard libraries)

**Concurrent Operations:**

```python
import asyncio

async def get_user_profile(user_id: int):
    # Run multiple operations concurrently
    user, orders, preferences = await asyncio.gather(
        db.get_user(user_id),
        db.get_orders(user_id),
        cache.get_preferences(user_id)
    )
    return combine_profile(user, orders, preferences)

# Benefits:
# - Instead of: 100ms + 100ms + 100ms = 300ms
# - We get: all execute in parallel = ~100ms
```

**4. Path & Query Parameters**

**Path Parameters:**

Mandatory parts of the route. FastAPI automatically converts types:

```python
@app.get("/items/{item_id}")
def read_item(item_id: int):  # FastAPI converts string to int
    return {"item_id": item_id}

# Request: GET /items/123
# item_id is automatically converted to integer 123
```

**Query Parameters:**

Optional configuration with default values:

```python
@app.get("/items/")
def read_items(skip: int = 0, limit: int = 10):
    return fake_items_db[skip : skip + limit]

# Request: GET /items/?skip=20&limit=50
# skip=20, limit=50
# Request: GET /items/
# skip=0, limit=10 (defaults)
```

**Validation:**

You can enforce strict rules using `Query` and `Path`:

```python
from fastapi import Query, Path

@app.get("/items/")
def read_items(
    q: str = Query(None, min_length=3, max_length=50),
    skip: int = Query(0, ge=0),  # Greater than or equal to 0
    limit: int = Query(10, ge=1, le=100)  # Between 1 and 100
):
    # Query parameters validated before function runs
    return {"items": []}

@app.get("/items/{item_id}")
def read_item(
    item_id: int = Path(..., gt=0)  # Must be greater than 0
):
    return {"item_id": item_id}
```

**5. Middleware: The Gatekeepers**

**What is Middleware:**

Middleware runs before the request hits your route and after the response is generated. It can modify requests and responses.

**Basic Middleware:**

```python
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)  # Pass to route handler
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response
```

**Common Use Cases:**

**CORS:**
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://example.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Authentication:**
```python
@app.middleware("http")
async def authenticate(request: Request, call_next):
    token = request.headers.get("Authorization")
    if not token or not verify_token(token):
        return JSONResponse(
            status_code=401,
            content={"detail": "Unauthorized"}
        )
    response = await call_next(request)
    return response
```

**System Design Consideration**: FastAPI's core concepts work together to provide:
1. **Type Safety**: Pydantic validation
2. **Modularity**: Dependency injection
3. **Performance**: Async/await concurrency
4. **Flexibility**: Path/query parameters
5. **Cross-cutting Concerns**: Middleware

Understanding FastAPI's core concepts (Pydantic, dependency injection, async/await, parameters, middleware) is essential for building robust APIs. Each concept serves a specific purpose and works together to provide type safety, performance, and developer experience.

---

### Q2: Explain FastAPI's dependency injection system in detail, including how it works, dependency chains, resource management, and best practices. Provide examples showing advanced patterns like dependency overrides for testing and conditional dependencies.

**Answer:**

**Dependency Injection System:**

FastAPI's dependency injection system is one of its most powerful features. It allows you to declare dependencies that FastAPI automatically resolves and injects into your route handlers.

**How Dependency Injection Works:**

**Basic Pattern:**

```python
from fastapi import Depends

def get_db():
    db = create_connection()
    try:
        yield db  # Resource available during request
    finally:
        db.close()  # Always cleanup

@app.get("/users/{user_id}")
async def get_user(user_id: int, db = Depends(get_db)):
    # db is automatically created and closed
    return await db.get_user(user_id)
```

**Dependency Resolution Process:**

```
1. FastAPI sees Depends(get_db) in route signature
2. Calls get_db() function
3. Yields db connection
4. Passes db to route handler
5. After route handler completes, executes finally block
6. Closes db connection
```

**Dependency Chains:**

Dependencies can depend on other dependencies, creating a hierarchical graph:

```python
# Level 1: Extract token from header
def get_token(header: str = Header(...)):
    return header

# Level 2: Validate token and get user
def get_user(token: str = Depends(get_token)):
    return verify_token_and_get_user(token)

# Level 3: Route handler
@app.get("/me")
async def read_me(user: User = Depends(get_user)):
    return user

# FastAPI resolves: Header → Token → User → Route
```

**Resource Management:**

**Generator Pattern:**

Use generators with `yield` for resources that need cleanup:

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def get_db():
    session = async_session_maker()
    try:
        yield session  # Resource available
    finally:
        await session.close()  # Always cleanup

@app.get("/users/")
async def list_users(db: AsyncSession = Depends(get_db)):
    # Session is available here
    return await db.execute(select(User))
    # Session is automatically closed after response
```

**Benefits:**
- Automatic resource cleanup
- Exception-safe (cleanup always happens)
- Reusable across routes

**Advanced Patterns:**

**1. Dependency Overrides for Testing:**

```python
# app/api/deps.py
def get_db():
    async with async_session_maker() as session:
        yield session

# tests/conftest.py
from fastapi.testclient import TestClient
from app.main import app
from app.api.deps import get_db

# Override for testing
async def override_get_db():
    async with test_session_maker() as session:
        yield session

# Override original dependency
app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

# Now all routes use test database
def test_get_user():
    response = client.get("/users/123")
    assert response.status_code == 200
```

**2. Conditional Dependencies:**

Dependencies can raise exceptions to abort requests:

```python
from fastapi import Depends, Header, HTTPException

def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != "secret-key":
        raise HTTPException(status_code=403, detail="Invalid API key")
    return x_api_key

@app.get("/protected/")
async def protected_route(key: str = Depends(verify_api_key)):
    # Only executes if API key is valid
    return {"status": "ok"}
```

**3. Multiple Dependencies:**

A single route can have multiple dependencies:

```python
@app.get("/items/")
async def read_items(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    config: Config = Depends(get_config)
):
    # All dependencies resolved and available
    return await db.query(Item).filter_by(user_id=current_user.id).all()
```

**4. Caching Dependencies:**

FastAPI caches dependency results within a single request:

```python
def get_config():
    return load_config_from_file()  # Expensive operation

@app.get("/items/")
async def read_items(config = Depends(get_config, use_cache=True)):
    # get_config is called only once per request
    return config.items

# If get_config is used multiple times in same request,
# it's only executed once (cached)
```

**Best Practices:**

**1. Use Annotated for Type Hints:**

```python
from typing import Annotated

@app.get("/users/")
async def get_users(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    # Type and dependency clearly separated
    pass
```

**2. Compose Dependencies:**

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

**3. Share Dependencies:**

Create a shared dependency module:

```python
# app/api/deps.py
async def get_db(): ...
def get_current_user(): ...
def get_user_service(): ...

# app/api/v1/endpoints/users.py
from app.api.deps import get_user_service

@router.get("/users/")
async def list_users(service = Depends(get_user_service)):
    pass
```

**4. Handle Resource Cleanup:**

Always use `try...finally` or context managers:

```python
# ✅ Good: Proper cleanup
def get_db():
    db = create_connection()
    try:
        yield db
    finally:
        db.close()

# ❌ Bad: Resource leak
def get_db():
    return create_connection()  # Never closed!
```

**Anti-Patterns to Avoid:**

**1. Don't Create Dependencies Inside Routes:**

```python
# ❌ Bad: Bypasses DI system
@app.get("/users/")
async def get_users():
    db = get_db()  # Manual creation
    return db.query(User).all()

# ✅ Good: Use Depends
@app.get("/users/")
async def get_users(db = Depends(get_db)):
    return await db.query(User).all()
```

**2. Don't Mix Business Logic with Dependencies:**

```python
# ❌ Bad: Business logic in route
@app.get("/users/")
async def get_users(db = Depends(get_db)):
    # Business logic should be in service layer
    if not db:
        raise HTTPException(...)
    users = db.query(User).all()
    # More business logic...

# ✅ Good: Use service layer
@app.get("/users/")
async def get_users(service = Depends(get_user_service)):
    return await service.get_users()
```

**System Design Consideration**: Dependency injection provides:
1. **Modularity**: Reusable components
2. **Testability**: Easy to override with mocks
3. **Resource Management**: Automatic cleanup
4. **Separation of Concerns**: Clean architecture
5. **Type Safety**: Type hints and validation

FastAPI's dependency injection system is powerful and elegant. It provides automatic resource management, dependency graph resolution, easy testing with overrides, and clean separation of concerns. Understanding dependency injection patterns is essential for building maintainable FastAPI applications.
