# Architecture Philosophy: Minimal Guide

## Pydantic (Core Foundation)
*   **Definition:** Data validation/serialization library using Python type hints.
*   **BaseModel:** Automatically validates types, converts compatible types (e.g., "1" → 1), and provides `.dict()`/`.json()` serialization at runtime.
*   **Pydantic vs TS:** Pydantic is runtime validation + conversion; TypeScript is compile-time only (no runtime checks).
*   **FastAPI Integration:** Uses Pydantic for automatic request validation (422 error), OpenAPI schema generation (`/docs`), and IDE type safety.

## Modularity & Layered Architecture
*   **Structure:** API Layer (Routes/HTTP) → Service Layer (Business Logic/Orchestration) → Repository Layer (Data Access/DB Ops) → Domain Models (Pydantic).
*   **Benefits:** Each module has a single responsibility, easy to test in isolation, and clear dependencies.

## Dependency Injection (DI)
*   **Definition:** Passing dependencies (DB, services) into functions rather than creating them inside.
*   **FastAPI DI:** Managed via `Depends()`. Provides per-request life-cycle (auto-cleanup/transactions per request), isolation, and easy testing (dependency overrides).
*   **DI vs Express:** Express uses global middleware (shared pool); FastAPI uses DI for isolated, auto-managed per-request sessions.

## Testability & Clean Code
*   **Principles:** Use DI (inject mocks), use Protocols/Interfaces for dependencies, and write Pure Functions (no side effects).
*   **Config:** Use `BaseSettings` (Pydantic) to load/validate environment variables from `.env`.
*   **Error Handling:** Use centralized exception handlers (FastAPI `exception_handler`) to return consistent JSON responses.

## Key Design Patterns
*   **Repository:** Abstracts data access from business logic.
*   **Service:** Encapsulates business rules and orchestrates multiple repositories/services.
*   **DI Pattern:** Injects dependencies to improve flexibility and testability.

## Summary Checklist
- ✅ Modular, Layered structure
- ✅ Isolated per-request sessions (via DI)
- ✅ Explicit dependencies (via `Depends`)
- ✅ Runtime validation (via Pydantic)
- ✅ Environment-based configuration (`BaseSettings`)
