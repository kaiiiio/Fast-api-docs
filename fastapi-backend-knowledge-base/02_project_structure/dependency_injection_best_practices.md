# Dependency Injection: Minimal Guide

## Core Concepts
*   **`Depends()`:** Declare what a function needs in the signature. FastAPI resolves and injects it.
*   **Isolation:** Each request gets its own instance/session (via `Depends(get_db)`).
*   **Cleanup:** Use `yield` inside a dependency; everything after it runs *after* the response is sent.

## Hierarchical DI
- **Global:** `FastAPI(dependencies=[Depends(global_auth)])`.
- **Router:** `APIRouter(dependencies=[Depends(router_auth)])`.
- **Route:** `def route(service: Service = Depends(get_service))`.

## Annotated Dependency Injection
*   **Annotated[Type, Depends()]:** Cleaner way to separate type hints from dependency logic.
*   **Example:** `db: Annotated[AsyncSession, Depends(get_db)]`.

## Best Practices
- ✅ Inject **Interfaces** (via `Protocol`) for better decoupling and easier mocking.
- ✅ Use **Dependency Overrides** (`app.dependency_overrides`) for integration tests.
- ✅ Keep business logic in **Services**, and inject those into your **Endpoints** (Routes).
- ✅ Avoid manual initialization (`service = Service()`) inside a route; always use `Depends()`.

## Summary Checklist
- ✅ Resource lifecycle management (`yield`)
- ✅ Shared dependencies across routes
- ✅ Isolated per-request sessions
- ✅ Simple testing with mocking
