# Data vs Business Validation: Minimal Guide

## Data Validation (Pydantic/API Layer)
*   **Definition:** Automated, format-based checks.
*   **Checks:** Type (`str`/`int`), Range (`age > 18`), Format (Email), Required fields.
*   **Implementation:** Handled via Pydantic (`BaseModel`, `Field`, `validator`).
*   **Response:** Automatic **422 Unprocessable Entity**.

## Business Validation (Service/Business Layer)
*   **Definition:** Logic-based, domain-specific rules.
*   **Checks:** Uniqueness ("is email taken?"), Permissions ("does user have access?"), Logic ("is this order valid for discount?").
*   **Implementation:** Handled via your Service classes/functions.
*   **Response:** Custom exceptions (e.g., **400 Bad Request**, **403 Forbidden**).

## Key Comparison
| Feature | Data Validation | Business Validation |
|---------|-----------------|---------------------|
| **Layer** | API (Pydantic) | Service (Logic) |
| **Check** | Syntax/Format | Logic/Database |
| **Auto?** | ✅ Auto-Magic | 🐌 Manual Code |
| **Error** | 422 Unprocessable | 400/403 Custom |

## Summary Checklist
- ✅ Use **Pydantic** for basic format checks.
- ✅ Put **DB-heavy checks** in the Service layer.
- ✅ Raise **Application Exceptions** (e.g., `NotFoundError`) from Service layer.
- ✅ Map **Application Exceptions** to **FastAPI Exceptions** via middleware or global handlers.
