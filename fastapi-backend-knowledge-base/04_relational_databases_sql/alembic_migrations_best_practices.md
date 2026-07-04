# Alembic Migrations: Minimal Guide

## Setup Commands
1.  **Init:** `alembic init alembic` (Create environment).
2.  **Config:** Update `env.py` to point to your `Base.metadata`.
3.  **URL:** Update `sqlalchemy.url` in `alembic.ini`.

## Common Commands
*   **Revision:** `alembic revision --autogenerate -m "description"` (Detects schema changes).
*   **Upgrade:** `alembic upgrade head` (Applies recent migrations).
*   **Downgrade:** `alembic downgrade -1` (Goes back one version).
*   **History:** `alembic history` (List of versions).

## Best Practices
- ✅ **Review manual changes:** Autogenerate is ~90% perfect. Always check `upgrade()` and `downgrade()`.
- ✅ **One change per revision:** Keep migrations smaller and focused.
- ✅ **Never delete migrations:** If you made a mistake, create a new revision to fix it.
- ✅ **Branching:** If multiple devs are working, use `alembic merge` to consolidate.
- ✅ **Prod Safety:** Always back up your database before `upgrade head` in production!

## Implementation Checklist
- ✅ Correct `metadata` imported in `env.py`.
- ✅ `target_metadata = Base.metadata` set.
- ✅ `sqlalchemy.url` handled via `BaseSettings` during build.
