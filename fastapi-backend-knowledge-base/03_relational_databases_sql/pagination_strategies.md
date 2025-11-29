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

**Pros:**
- ✅ Simple to implement
- ✅ Can jump to any page
- ✅ Easy to understand

**Cons:**
- ❌ Performance degrades with large offsets
- ❌ Inconsistent results if data changes
- ❌ Total count query can be expensive

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
    
    stmt = stmt.limit(limit + 1)  # Fetch one extra
    
    result = await session.execute(stmt)
    users = list(result.scalars().all())
    
    has_next = len(users) > limit
    if has_next:
        users = users[:-1]  # Remove extra item
    
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

**Pros:**
- ✅ Consistent results even if data changes
- ✅ Better performance for large datasets
- ✅ No expensive count queries

**Cons:**
- ❌ Can't jump to arbitrary pages
- ❌ Requires ordered column (usually ID)
- ❌ Slightly more complex

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

