# Pagination Strategies

Efficient pagination is crucial for APIs that return large datasets. This guide covers different pagination strategies and their tradeoffs.

## Offset-Based Pagination

### Basic Implementation

```python
from sqlalchemy import select
from typing import List, Optional

async def get_users(
    session: AsyncSession,
    skip: int = 0,
    limit: int = 20
) -> List[User]:
    result = await session.execute(
        select(User)
        .offset(skip)
        .limit(limit)
        .order_by(User.created_at.desc())
    )
    return list(result.scalars().all())

# API endpoint
@app.get("/users/")
async def list_users(
    page: int = Query(ge=1, default=1),
    size: int = Query(ge=1, le=100, default=20),
    db: AsyncSession = Depends(get_db)
):
    skip = (page - 1) * size
    users = await get_users(db, skip=skip, limit=size)
    
    # Get total count (can be expensive)
    total_result = await db.execute(select(func.count(User.id)))
    total = total_result.scalar()
    
    return {
        "items": users,
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size
    }
```

### Pros and Cons

**Pros:** Simple to implement, can jump to any page, and easy to understand.

**Cons:** Performance degrades with large offsets, inconsistent results if data changes, and total count query can be expensive.

## Cursor-Based Pagination

### Implementation

```python
from typing import Optional

async def get_users_cursor(
    session: AsyncSession,
    cursor: Optional[int] = None,
    limit: int = 20
) -> tuple[List[User], Optional[int]]:
    stmt = select(User).order_by(User.id)
    
    if cursor:
        stmt = stmt.where(User.id > cursor)
    
    # Fetch one extra: Used to detect if there's a next page.
    stmt = stmt.limit(limit + 1)
    
    result = await session.execute(stmt)
    users = list(result.scalars().all())
    
    # Check if there's a next page: If we got limit+1 items, there's more.
    has_next = len(users) > limit
    if has_next:
        users = users[:-1]  # Remove extra item (don't return it)
    
    # Next cursor: ID of last item, used for next page request.
    next_cursor = users[-1].id if users and has_next else None
    
    return users, next_cursor

# API endpoint
@app.get("/users/")
async def list_users(
    cursor: Optional[int] = Query(None),
    limit: int = Query(ge=1, le=100, default=20),
    db: AsyncSession = Depends(get_db)
):
    users, next_cursor = await get_users_cursor(db, cursor=cursor, limit=limit)
    
    return {
        "items": users,
        "next_cursor": next_cursor,
        "has_more": next_cursor is not None
    }
```

### Pros and Cons

**Pros:** Consistent results even if data changes, better performance for large datasets, and no expensive count queries.

**Cons:** Can't jump to arbitrary pages, requires ordered column (usually ID), and slightly more complex.

## Keyset Pagination (Timestamp/Composite)

### Using Timestamps

```python
from datetime import datetime
from typing import Optional

async def get_users_keyset(
    session: AsyncSession,
    cursor: Optional[datetime] = None,
    limit: int = 20
) -> tuple[List[User], Optional[datetime]]:
    stmt = select(User).order_by(
        User.created_at.desc(),
        User.id.desc()  # Secondary sort for tie-breaking
    )
    
    if cursor:
        stmt = stmt.where(
            or_(
                User.created_at < cursor,
                and_(
                    User.created_at == cursor,
                    User.id < cursor_id  # If using composite
                )
            )
        )
    
    stmt = stmt.limit(limit + 1)
    
    result = await session.execute(stmt)
    users = list(result.scalars().all())
    
    has_next = len(users) > limit
    if has_next:
        users = users[:-1]
    
    next_cursor = users[-1].created_at if users and has_next else None
    
    return users, next_cursor
```

## Seek Pagination (Better Performance)

### Implementation

```python
async def get_users_seek(
    session: AsyncSession,
    last_id: Optional[int] = None,
    last_created_at: Optional[datetime] = None,
    limit: int = 20
) -> tuple[List[User], Optional[dict]]:
    stmt = select(User).order_by(
        User.created_at.desc(),
        User.id.desc()
    )
    
    if last_id and last_created_at:
        stmt = stmt.where(
            or_(
                User.created_at < last_created_at,
                and_(
                    User.created_at == last_created_at,
                    User.id < last_id
                )
            )
        )
    
    stmt = stmt.limit(limit + 1)
    
    result = await session.execute(stmt)
    users = list(result.scalars().all())
    
    has_next = len(users) > limit
    if has_next:
        users = users[:-1]
    
    next_cursor = None
    if users and has_next:
        last_user = users[-1]
        next_cursor = {
            "id": last_user.id,
            "created_at": last_user.created_at.isoformat()
        }
    
    return users, next_cursor

# API endpoint
@app.get("/users/")
async def list_users(
    cursor: Optional[str] = Query(None),  # Base64 encoded cursor
    limit: int = Query(ge=1, le=100, default=20),
    db: AsyncSession = Depends(get_db)
):
    last_id = None
    last_created_at = None
    
    if cursor:
        import base64, json
        decoded = json.loads(base64.b64decode(cursor).decode())
        last_id = decoded["id"]
        last_created_at = datetime.fromisoformat(decoded["created_at"])
    
    users, next_cursor = await get_users_seek(
        db,
        last_id=last_id,
        last_created_at=last_created_at,
        limit=limit
    )
    
    # Encode cursor for response
    encoded_cursor = None
    if next_cursor:
        import base64, json
        encoded_cursor = base64.b64encode(
            json.dumps(next_cursor).encode()
        ).decode()
    
    return {
        "items": users,
        "next_cursor": encoded_cursor,
        "has_more": next_cursor is not None
    }
```

## Hybrid Approach

### Combine Offset and Cursor

```python
async def get_users_hybrid(
    session: AsyncSession,
    page: Optional[int] = None,
    cursor: Optional[int] = None,
    limit: int = 20
):
    if cursor:
        # Cursor-based (faster)
        return await get_users_cursor(session, cursor, limit)
    else:
        # Offset-based (allows page jumping)
        skip = (page - 1) * limit if page else 0
        return await get_users(session, skip, limit)
```

## Total Count Tradeoffs

### Option 1: Always Include Count

```python
# Simple but expensive
total = await session.scalar(select(func.count(User.id)))
```

### Option 2: Estimated Count

```python
# PostgreSQL specific - faster approximation
total = await session.scalar(text("""
    SELECT reltuples::bigint AS estimate
    FROM pg_class
    WHERE relname = 'users'
"""))
```

### Option 3: Conditional Count

```python
# Only count on first page
if page == 1:
    total = await session.scalar(select(func.count(User.id)))
else:
    total = None
```

## Response Models

```python
from pydantic import BaseModel
from typing import List, Optional, Generic, TypeVar

T = TypeVar('T')

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: Optional[int] = None
    page: Optional[int] = None
    size: Optional[int] = None
    pages: Optional[int] = None
    next_cursor: Optional[str] = None
    has_more: Optional[bool] = None

# Usage
@app.get("/users/", response_model=PaginatedResponse[UserResponse])
async def list_users(...):
    return PaginatedResponse(
        items=users,
        next_cursor=encoded_cursor,
        has_more=next_cursor is not None
    )
```

## Best Practices

1. **Use cursor-based for large datasets** - Better performance
2. **Use offset-based for small datasets** - Simpler
3. **Index pagination columns** - Created_at, ID, etc.
4. **Avoid total count when possible** - Expensive operation
5. **Use composite cursors** - For stable sorting
6. **Limit page size** - Prevent abuse (max 100-1000)

## Summary

**Offset Pagination:**
- Simple, allows page jumping
- Performance degrades with large offsets

**Cursor Pagination:**
- Better performance, consistent results
- Can't jump to arbitrary pages

**Seek Pagination:**
- Best performance for large datasets
- Most complex to implement

Choose based on your use case: offset for simple cases, cursor/seek for large datasets.

---

## 🎯 Interview Questions: FastAPI

### Q1: Explain pagination strategies in FastAPI, including offset-based, cursor-based, and seek pagination. Discuss when to use each, performance implications, and best practices. Provide detailed examples showing implementation of each strategy.

**Answer:**

**Pagination Overview:**

Pagination is the process of dividing large result sets into smaller, manageable pages. It's essential for performance and user experience when dealing with large datasets.

**Why Pagination:**

**Without Pagination:**
```python
# ❌ Bad: Load all data at once
@app.get("/users/")
async def get_users(db: AsyncSession = Depends(get_db)):
    users = await db.execute(select(User))
    return list(users.scalars().all())  # Loads all users - slow, memory intensive
```

**With Pagination:**
```python
# ✅ Good: Load data in pages
@app.get("/users/")
async def get_users(
    page: int = 1,
    size: int = 20,
    db: AsyncSession = Depends(get_db)
):
    skip = (page - 1) * size
    users = await db.execute(
        select(User).offset(skip).limit(size)
    )
    return list(users.scalars().all())  # Loads only 20 users - fast
```

**Offset-Based Pagination:**

**Implementation:**
```python
async def get_users(
    session: AsyncSession,
    skip: int = 0,
    limit: int = 20
) -> List[User]:
    """Get users with offset-based pagination."""
    stmt = select(User).offset(skip).limit(limit)
    result = await session.execute(stmt)
    return list(result.scalars().all())

@app.get("/users/")
async def list_users(
    page: int = Query(ge=1, default=1),
    size: int = Query(ge=1, le=100, default=20),
    db: AsyncSession = Depends(get_db)
):
    skip = (page - 1) * size
    users = await get_users(db, skip=skip, limit=size)
    
    # Get total count (expensive!)
    total = await db.scalar(select(func.count(User.id)))
    
    return {
        "items": users,
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size
    }
```

**Pros and Cons:**
```python
# Pros:
# - Simple to implement
# - Allows jumping to any page
# - Easy to understand

# Cons:
# - Performance degrades with large offsets
# - Inconsistent results if data changes
# - Total count is expensive
```

**Cursor-Based Pagination:**

**Implementation:**
```python
async def get_users_cursor(
    session: AsyncSession,
    cursor: Optional[int] = None,
    limit: int = 20
) -> tuple[List[User], Optional[int]]:
    """Get users with cursor-based pagination."""
    stmt = select(User).order_by(User.id)
    
    if cursor:
        stmt = stmt.where(User.id > cursor)
    
    stmt = stmt.limit(limit + 1)  # Fetch one extra to check if more exists
    result = await session.execute(stmt)
    users = list(result.scalars().all())
    
    has_more = len(users) > limit
    if has_more:
        users = users[:limit]
        next_cursor = users[-1].id
    else:
        next_cursor = None
    
    return users, next_cursor

@app.get("/users/")
async def list_users(
    cursor: Optional[int] = Query(None),
    limit: int = Query(ge=1, le=100, default=20),
    db: AsyncSession = Depends(get_db)
):
    users, next_cursor = await get_users_cursor(db, cursor=cursor, limit=limit)
    
    return {
        "items": users,
        "next_cursor": next_cursor,
        "has_more": next_cursor is not None
    }
```

**Pros and Cons:**
```python
# Pros:
# - Consistent results (stable sorting)
# - Better performance (indexed cursor)
# - No total count needed

# Cons:
# - Can't jump to arbitrary page
# - Requires stable sort column
# - More complex implementation
```

**Seek Pagination (Composite Cursor):**
```python
async def get_users_seek(
    session: AsyncSession,
    last_id: Optional[int] = None,
    last_created_at: Optional[datetime] = None,
    limit: int = 20
) -> tuple[List[User], Optional[dict]]:
    """Get users with seek pagination (composite cursor)."""
    stmt = select(User).order_by(User.created_at, User.id)
    
    if last_id and last_created_at:
        stmt = stmt.where(
            or_(
                User.created_at > last_created_at,
                and_(
                    User.created_at == last_created_at,
                    User.id > last_id
                )
            )
        )
    
    stmt = stmt.limit(limit + 1)
    result = await session.execute(stmt)
    users = list(result.scalars().all())
    
    has_more = len(users) > limit
    if has_more:
        users = users[:limit]
        next_cursor = {
            "id": users[-1].id,
            "created_at": users[-1].created_at.isoformat()
        }
    else:
        next_cursor = None
    
    return users, next_cursor
```

**Performance Comparison:**
```python
# Offset pagination:
# Page 1: Fast (offset 0)
# Page 100: Slower (offset 2000)
# Page 1000: Very slow (offset 20000)

# Cursor pagination:
# All pages: Fast (indexed cursor)
# Consistent performance regardless of position
```

**Best Practices:**

**1. Index Pagination Columns:**
```python
# Create indexes on columns used for pagination
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_id ON users(id);
```

**2. Limit Page Size:**
```python
# Prevent abuse
size: int = Query(ge=1, le=100, default=20)  # Max 100 items
```

**3. **Avoid Total Count When Possible:**
```python
# Total count is expensive
# Only include if necessary
# Use estimated count for large datasets
```

**System Design Consideration**: Pagination provides:
1. **Performance**: Reduces data transfer and memory usage
2. **User Experience**: Faster page loads
3. **Scalability**: Works with large datasets
4. **Consistency**: Stable results with cursor-based

Pagination is essential for handling large datasets efficiently. Understanding offset-based, cursor-based, and seek pagination, their trade-offs, and best practices is crucial for building performant APIs. Always index pagination columns, limit page size, and avoid expensive total counts when possible.

---

### Q2: Explain cursor-based pagination in detail, including how to implement it, handle edge cases, encode/decode cursors, and when to use it vs offset pagination. Discuss performance implications and best practices.

**Answer:**

**Cursor-Based Pagination Deep Dive:**

**How It Works:**
```
1. Sort by stable column (ID, created_at)
2. Use cursor (last seen value) instead of offset
3. Fetch records after cursor
4. Return next cursor for next page
```

**Implementation:**
```python
async def get_users_cursor(
    session: AsyncSession,
    cursor: Optional[int] = None,
    limit: int = 20
) -> tuple[List[User], Optional[int]]:
    """Get users with cursor-based pagination."""
    stmt = select(User).order_by(User.id)
    
    if cursor:
        stmt = stmt.where(User.id > cursor)
    
    stmt = stmt.limit(limit + 1)  # Fetch extra to check if more exists
    result = await session.execute(stmt)
    users = list(result.scalars().all())
    
    has_more = len(users) > limit
    if has_more:
        users = users[:limit]
        next_cursor = users[-1].id
    else:
        next_cursor = None
    
    return users, next_cursor
```

**Cursor Encoding:**
```python
import base64
import json

def encode_cursor(cursor_data: dict) -> str:
    """Encode cursor for URL-safe transmission."""
    return base64.b64encode(
        json.dumps(cursor_data).encode()
    ).decode()

def decode_cursor(encoded: str) -> dict:
    """Decode cursor from URL."""
    return json.loads(
        base64.b64decode(encoded).decode()
    )

# Usage
cursor = {"id": 123, "created_at": "2024-01-01T00:00:00"}
encoded = encode_cursor(cursor)  # "eyJpZCI6IDEyMywg..."
decoded = decode_cursor(encoded)  # {"id": 123, ...}
```

**Edge Cases:**

**1. Empty Results:**
```python
# Handle gracefully
if not users:
    return [], None
```

**2. Duplicate Values:**
```python
# Use composite cursor (ID + created_at)
# Ensures stable sorting
```

**3. Data Changes:**
```python
# Cursor-based is more stable than offset
# But still can miss/duplicate if data changes
# Acceptable trade-off for performance
```

**When to Use Cursor vs Offset:**

**Use Cursor When:**
- Large datasets (> 10k records)
- Performance is critical
- Consistent results needed
- Infinite scroll UI

**Use Offset When:**
- Small datasets (< 1k records)
- Need to jump to specific page
- Simple implementation needed
- Traditional page numbers

**System Design Consideration**: Cursor pagination provides:
1. **Performance**: O(1) regardless of position
2. **Consistency**: Stable results
3. **Scalability**: Works with millions of records
4. **Efficiency**: No total count needed

Understanding cursor-based pagination, edge cases, encoding, and when to use it is essential for building scalable APIs. Always use composite cursors for stable sorting, handle edge cases gracefully, and choose the right pagination strategy based on use case.


