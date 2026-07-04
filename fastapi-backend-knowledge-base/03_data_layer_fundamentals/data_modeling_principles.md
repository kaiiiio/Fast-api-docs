# Data Modeling: Minimal Guide

## Core Principles
*   **Normalization:** Split data into multiple tables (e.g., `Users`, `Posts`, `Comments`) to reduce redundancy.
*   **Foreign Keys:** Connect tables using IDs (e.g., `user_id` in `Posts` table points to `User.id`).
*   **Indexing:** Use indexes on frequently queried columns (e.g., `email`, `id`) to speed up SELECT queries.

## Modeling in FastAPI/SQLAlchemy
1.  **ORM Models (app/db/schemas/):** Define how Python classes match database tables (SQLAlchemy `Base`).
2.  **Pydantic Models (app/models/):** Define how Python classes match request/response JSON (Pydantic `BaseModel`).

## Best Practices
- ✅ Keep **ORM Models** separate from **Pydantic Models**.
- ✅ Use **Indices** for search columns (e.g., `db_index=True`).
- ✅ Define **Relationships** (`relationship()`) in ORM to fetch related data (e.g., `user.posts`) easily via `selectinload`.
- ✅ Avoid using `Generic` data types; be as specific as possible for database optimization.
- ✅ Implement **Migrations** (Alembic) to manage schema changes over time.

## Summary Checklist
- ✅ Normalized tables
- ✅ Correct indices and foreign keys
- ✅ Clean Pydantic schemas for API inputs
- ✅ Clear separation between DB layer and API layer models
