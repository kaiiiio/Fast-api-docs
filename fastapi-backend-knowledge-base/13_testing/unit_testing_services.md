# Unit Testing Services: Minimal Guide

## Core Concept
*   **Definition:** Fast, focused tests that only check a single function/class's logic.
*   **No Database:** All external calls (Repositories, API, AI) should be **Mocked**.

## Mocking (unittest.mock)
*   **Concept:** Create a dummy version of a class that returns a fixed value.
*   **Implementation:** `mock_repo = MagicMock(); mock_repo.get_by_id.return_value = User(...)`.

## Best Practices
- ✅ Pass **Mocks** via Service constructor (Dependency Injection).
- ✅ Assert function **Return Values** and **Exception Raising** (e.g., `with pytest.raises(NotFoundError)`).
- ✅ Keep tests simple; don't test SQLAlchemy or external APIs (only test your code).
- ✅ Aim for **Fast execution** (<50ms per test).

## Summary Checklist
- ✅ Service under test (isolated)
- ✅ Mocks for repositories/services
- ✅ Assert return values
- ✅ Check edge cases (errors, empty)
