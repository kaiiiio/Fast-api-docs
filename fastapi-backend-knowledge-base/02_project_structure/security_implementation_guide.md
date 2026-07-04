# Security Implementation: Minimal Guide

## Core Security Components
*   **Hashing:** Use `Passlib` (with `bcrypt`) to hash passwords.
*   **JWT:** Use `PyJWT` or `python-jose` for encoding/decoding tokens.
*   **OAuth2:** Use `OAuth2PasswordBearer` to extract tokens from headers.

## JWT Authentication Flow
1.  **Frontend:** Sends `username` and `password` to `/login`.
2.  **Backend:** Validates password, returns a **JWT (access_token)**.
3.  **Frontend:** Stores token (in Cookie or LocalStorage).
4.  **Backend Auth:** Uses a dependency (`Depends(get_current_user)`) for all protected routes.

## Code Essentials
- ✅ Use **`secret_key`** and `ALGORITHM` (HS256) for signing JWTs.
- ✅ Use **`access_token_expires`** to set token duration.
- ✅ Store hashed passwords (`password_hash`), never plain text!

## Implementation Summary
| Concern | Library/Pattern |
|---------|-----------------|
| **Hashing** | `passlib.context` |
| **Auth** | `OAuth2PasswordBearer` |
| **Tokens** | `jose` (JWT) |
| **Validation** | `Depends(get_current_user)` |

## Best Practices
- ✅ Use **HTTPS** (mandatory for secure cookies/headers).
- ✅ Store **Refresh tokens** separately (longer expiry than access tokens).
- ✅ Implement **CORS Middleware** (`CORSMiddleware`) for browser security.
- ✅ Sanitize user input (Pydantic models do this by default).
