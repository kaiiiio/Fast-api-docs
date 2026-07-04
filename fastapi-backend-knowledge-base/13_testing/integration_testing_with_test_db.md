# Integration Testing: Minimal Guide

## Test Setup
*   **TestClient:** FastAPI's built-in client for hitting endpoints.
*   **Test Database:** Dedicated DB instance (e.g., PostgreSQL with `_test` suffix) for unit/integration tests.
*   **Fixtures (conftest.py):** Reusable resources (e.g., `db_session`, `test_client`) across multiple tests.

## Dependency Overrides
*   **Concept:** Swap production dependencies (e.g., prod DB) with test-only ones (e.g., memory DB).
*   **Code:** `app.dependency_overrides[get_db] = override_get_db`.

## Code Example (Pytest)
```python
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_read_user():
    # Hits the endpoint, using the overridden DB automatically
    response = client.get("/users/1")
    assert response.status_code == 200
    assert response.json()["name"] == "John"
```

## Best Practices
- ✅ Run tests in **Isolation** (each test starts with a clean DB).
- ✅ Use **`pytest-asyncio`** for testing `async def` functions/repos.
- ✅ Group common setups (e.g., creating a dummy user) into **Pytest Fixtures**.
- ✅ Never hardcode URLs; use relative paths.

## Summary Checklist
- ✅ Separate Test DB
- ✅ Dependency overrides for tests
- ✅ Fixtures in conftest.py
- ✅ Isolated test runs
