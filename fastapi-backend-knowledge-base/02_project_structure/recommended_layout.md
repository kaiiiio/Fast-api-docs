# Recommended Project Structure: Minimal Guide

## Folder Structure
```
app/
├── api/          # Route handlers (Routes/Controllers)
├── core/         # Config, security, exceptions, shared helpers
├── models/       # Pydantic models (Request/Response schemas)
├── db/           # SQLAlchemy/DB models (SQLSchema/Base)
├── repositories/ # Data access (Only DB ops)
├── services/     # Business logic (Business rules/Orchestration)
├── interfaces/   # Protocols/Interfaces
└── main.py       # API entry point (FastAPI initialization)
```

## Layers of Concern
1.  **API Layer:** HTTP/Route handling. Delegates to **Services**.
2.  **Service Layer:** Business logic and rules. Orchestrates multiple **Repositories**.
3.  **Repository Layer:** Only database operations (SQL queries/CRUD).
4.  **Models Layer:** Data validation/serialization (Pydantic/Domain Models).

## Key Components
*   **`app/core/settings.py`:** Configuration via `BaseSettings`.
*   **`app/api/deps.py`:** Shared dependencies (DB, Auth).
*   **`app/db/base.py`:** Database base model and session maker.

## Best Practices
- ✅ Keep **Routes (API layer)** thin.
- ✅ Put **Validation logic** in Pydantic Models.
- ✅ Put **Complex business rules** only in Services.
- ✅ Use **Alembic** (migrations folder) for database versioning.
