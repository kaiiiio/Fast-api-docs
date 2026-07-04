# RBAC (Role-Based Access Control): Minimal Guide

## Core Roles
*   **Admin:** Full access (Manager / Superuser).
*   **User:** Standard access (Create/Read/Update own data).
*   **Guest:** Limited access (Read-only / No write ops).

## Implementation (Dependency Injection)
```python
async def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role != "admin": # Check if admin
        raise HTTPException(status_code=403, detail="Admin only")
    return current_user

@app.get("/admin/users/")
async def list_all_users(admin: User = Depends(get_current_admin)):
    # Only admins can reach here
    ...
```

## Permissions (Fine-Grained)
*   **Definition:** List of specific actions (`read:users`, `write:users`, `delete:users`).
*   **Implementation:** Store a list of scopes/permissions on the `User` object or roles.

## Best Practices
- ✅ Use **Depends()** to enforce roles cleanly.
- ✅ Store **Roles** in a dedicated column in the `Users` table.
- ✅ Implement **Group-based permissions** for larger teams.
- ✅ Always return **403 Forbidden** for unauthorized role access.

## Summary Checklist
- ✅ Isolated role-check dependencies
- ✅ Clear role-to-permission mapping
- ✅ Authorization check on every sensitive route
