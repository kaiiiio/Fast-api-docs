# Async SQLAlchemy: Minimal Guide

## Core Async Components
*   **`create_async_engine`:** Use with async drivers (e.g., `postgresql+asyncpg://`).
*   **`AsyncSession`:** The primary interface for non-blocking DB operations.
*   **`async_sessionmaker`:** Recommended factory for per-request sessions.
*   **`AsyncAttrs`:** Mixin for models to support deferred attribute loading.

## Basic Query Pattern
```python
from sqlalchemy import select

# Standard Async SELECT
async def get_user_by_id(session: AsyncSession, user_id: int):
    stmt = select(User).where(User.id == user_id)
    result = await session.execute(stmt)
    return result.scalars().one_or_none() # Single row or None
```

## Eager Loading (Avoid N+1)
*   **`selectinload`:** Best for many-to-one or one-to-many. Runs a separate SELECT query.
*   **`joinedload`:** Best for one-to-one or simple joins. Uses a SQL JOIN.

## Session Lifecycle
1.  **Open:** `AsyncSession = async_sessionmaker(engine)`
2.  **Request:** `Depends(get_db)` provides per-request session.
3.  **Atomic:** `async with session.begin():` auto-commits/rollbacks.
4.  **Close:** Always `await session.close()`.

## Best Practices
- ✅ Use **Indices** for frequently queried fields (e.g., `email`).
- ✅ Use **Foreign Keys** carefully to maintain data integrity.
- ✅ Always explicitly use **`await`** for `execute`, `commit`, and `close`.
- ✅ Prefer **`Annotated[AsyncSession, Depends(get_db)]`** for cleaner code.
