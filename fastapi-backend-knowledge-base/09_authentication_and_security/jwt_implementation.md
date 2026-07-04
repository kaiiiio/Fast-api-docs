# JWT Implementation: Minimal Guide

## JWT Core Parts
1.  **Header:** Algorithm (`HS256`) and Token type (`JWT`).
2.  **Payload:** Claims (Data) like `user_id`, `sub`, and `exp` (Expiration).
3.  **Signature:** Final hash to verify the token hasn't been tampered with.

## Authentication Flow
*   **Login (/login):** Validate `username/password` → Generate JWT → Return `access_token` and `token_type` (bearer).
*   **Auth (Protected):** Extract token from `Authorization: Bearer <token>` header → Decode with `SECRET_KEY` → Get `user_id` → Proceed.

## Code Essentials
- ✅ Use **`jose` (JWT)** or **`PyJWT`** for tokens.
- ✅ Store **`SECRET_KEY`** in environment variables only.
- ✅ Always set an **`exp` (Expiration)** time (e.g., 30 mins) to limit security risk.

## Token Best Practices
- ✅ Logged out? You can't truly invalidate a JWT without a **Blacklist** (Redis) until its `exp` time is reached.
- ✅ Use **Refresh Tokens** for long-lived sessions (stored in HTTP-Only cookies).
- ✅ Keep Payload small; don't store PII or secrets (it's only Base64 encoded, not encrypted).
