# CRUD & Repository Pattern: Minimal Guide

## Layered Architecture
*   **API (Endponts):** Handle HTTP (Request/Response). Delegates to **Services**.
*   **Service (Business):** Business logic and rules. Orchestrates **Repositories**.
*   **Repository (Data):** Only database operations (CRUD).

## Why Repository?
- ✅ **Decoupling:** Business logic doesn't care how SQL is written.
- ✅ **Testability:** Easy to swap DB Repository with Mock Repository in tests.
- ✅ **Reusability:** Common CRUD methods (get, list, delete) shared across multiple services.

## Basic Repository Pattern
```python
class BaseRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, model, id: int):
        return await self.session.get(model, id)

    async def list(self, model):
        stmt = select(model)
        result = await self.session.execute(stmt)
        return result.scalars().all()
```

## Best Practices
- ✅ Keep Repository thin; no business logic.
- ✅ Use **Indices** for frequently queried fields (e.g., `id`, `email`).
- ✅ Inherit from a **`BaseRepo`** for generic CRUD methods.
- ✅ Always use **`Depends(get_db_session)`** for per-request instances.

## Summary Checklist
- ✅ Repository (DB Logic)
- ✅ Service (Business Logic)
- ✅ API (HTTP Logic)
