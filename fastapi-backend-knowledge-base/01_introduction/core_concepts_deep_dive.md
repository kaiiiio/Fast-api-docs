# FastAPI Core Concepts: Minimal Guide

## 1. Pydantic (Validation & Coercion)
*   **Type Coercion:** Automatically converts types (e.g., string `"5.5"` → float `5.5`, `"True"` → `True`).
*   **Custom Validators:** Use `@validator('field')` for business rules. Raises `ValueError` to trigger a **422 Unprocessable Entity** error.
*   **Benefits:** No manual validation code, automatic OpenAPI docs, and runtime type safety.

## 2. Dependency Injection (`Depends`)
*   **Concept:** Declare what a function needs (DB, Auth, Config) via `Depends()`. FastAPI handles the "how".
*   **Resolution:** Resolves entire chains (e.g., Header → Token → User → Route) automatically.
*   **Resource Management:** Use `yield` for auto-cleanup (e.g., closing DB sessions/connections after response).
*   **Testing:** Use `app.dependency_overrides` to swap production dependencies with mocks for tests.
*   **Caching:** By default, dependencies are cached per request (`use_cache=True`).

## 3. Concurrency (Async vs Sync)
*   **`async def`**: Use for I/O tasks (DB, APIs) with `await`. Runs on the main event loop.
*   **`def`**: Use for blocking/CPU tasks. FastAPI runs these in a **thread pool** to avoid blocking the server.
*   **Rule:** Use `async def` for `httpx`/`motor`/`asyncpg`; use `def` for `requests`/`sqlite3`.

## 4. Parameters & Middleware
*   **Path Params:** Mandatory, in URL (e.g., `/users/{id}`). Converts types automatically.
*   **Query Params:** Optional, after `?` (e.g., `/items?skip=0`). Use defaults to make them optional.
*   **Validation:** Use `Query(..., gt=0)` or `Path(..., min_length=3)` for extra constraints.
*   **Middleware:** Global logic (CORS, Logging, GZip) that runs before the request hits the route and after the response.

## Summary Checklist
- ✅ Pydantic for validation & coercion.
- ✅ `Depends()` for modularity and isolation.
- ✅ `async def` for I/O; `def` for CPU.
- ✅ Middleware for cross-cutting concerns (CORS, Auth).
- ✅ Path/Query parameters for flexible APIs.
