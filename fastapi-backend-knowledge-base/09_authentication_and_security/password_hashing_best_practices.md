# Password Hashing: Minimal Guide

## Core Rule
*   **NEVER STORE PLAIN-TEXT PASSWORDS!** Always store a **Hash**.

## Best Practices (Bcrypt)
*   **Bcrypt:** Slow, salted hashing algorithm resistant to brute-force attacks.
*   **Library:** Use `Passlib` (with `bcrypt`) for cross-platform hashing.
*   **Salting:** Bcrypt automatically includes a salt (extra random data) in the hash.

## Implementation Flow
1.  **Registration:** Hash(password) → Store `hashed_password` in DB.
2.  **Login:** `verify(input_password, hashed_password)` → Returns `True` if matches.

## Code Essentials
```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Registation
hash = pwd_context.hash("plain-password")

# Login
is_valid = pwd_context.verify("plain-password", hash)
```

## Security Summary
- ✅ Use **Strong Salt** (built into Bcrypt).
- ✅ Set **Complexity (Rounds)** high enough to slow down attackers but not too slow for your server.
- ✅ Never use MD5, SHA1, or plain SHA256 for passwords (not secure against GPUs).