# Transactions in Async: Minimal Guide

## Core Concepts
*   **Atomicity:** All-or-nothing changes. If one part fails, the entire transaction is rolled back.
*   **`await session.begin()`:** Modern way to handle transactions automatically.
*   **Context Manager:** Use `async with session.begin()` to automatically `commit()` or `rollback()`.

## Implementation Example
```python
# Automatic Transaction Management
async with async_session_maker() as session:
    async with session.begin():  # ⚡ Starts transaction
        await session.add(user)
        # ... more DB ops ...
    # 🏁 Auto-commits if no error; Auto-rollbacks if Exception occurs
```

## Manual Control
```python
try:
    await session.add(user)
    await session.commit()  # ⚡ Manual commit
except Exception:
    await session.rollback() # ⚠️ Manual rollback
    raise
finally:
    await session.close()   # 🏁 Always close
```

## Nested Transactions (`Savepoints`)
*   **Usage:** For complex logic with internal "checkpoints".
*   **Implementation:** Use `session.begin_nested()`.

## Best Practices
- ✅ Use **Per-Request Transactions** via `Depends()`.
- ✅ Default to **Automatic Context Managers** (`async with session.begin()`) to avoid resource leaks.
- ✅ Always use **`await session.commit()`** for writes (POST/PUT/DELETE).
- ✅ Handles **Rollback** only on Exceptions.
