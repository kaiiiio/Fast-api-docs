# Role-Based Access Control (RBAC): Complete Guide

RBAC restricts access based on user roles. This guide teaches you how to implement comprehensive role-based access control in FastAPI.

## Understanding RBAC

**The concept:** Users have roles, roles have permissions. Check permissions before allowing actions.

**Example:** **Admin** can do everything, **Moderator** can edit content (can't delete users), and **User** can only edit own content.

## Step 1: Defining Roles and Permissions

```python
from enum import Enum
from sqlalchemy import Column, Integer, String, Table, ForeignKey
from sqlalchemy.orm import relationship

class Role(str, Enum):
    ADMIN = "admin"
    MODERATOR = "moderator"
    USER = "user"

class Permission(str, Enum):
    # User permissions
    READ_OWN_PROFILE = "read_own_profile"
    EDIT_OWN_PROFILE = "edit_own_profile"
    
    # Moderator permissions
    EDIT_ANY_CONTENT = "edit_any_content"
    DELETE_ANY_CONTENT = "delete_any_content"
    
    # Admin permissions
    MANAGE_USERS = "manage_users"
    VIEW_ANALYTICS = "view_analytics"

# Many-to-many: Users ↔ Roles
user_roles = Table(
    'user_roles',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('role_id', Integer, ForeignKey('roles.id'), primary_key=True)
)

# Many-to-many: Roles ↔ Permissions
role_permissions = Table(
    'role_permissions',
    Base.metadata,
    Column('role_id', Integer, ForeignKey('roles.id'), primary_key=True),
    Column('permission_id', Integer, ForeignKey('permissions.id'), primary_key=True)
)

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True)
    roles = relationship("Role", secondary=user_roles, back_populates="users")

class Role(Base):
    __tablename__ = "roles"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True)
    users = relationship("User", secondary=user_roles, back_populates="roles")
    permissions = relationship("Permission", secondary=role_permissions, back_populates="roles")

class Permission(Base):
    __tablename__ = "permissions"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True)
    roles = relationship("Role", secondary=role_permissions, back_populates="permissions")
```

## Step 2: Permission Checking

```python
# check_permission: Verifies if user has required permission through their roles.
async def check_permission(
    user: User,
    required_permission: Permission,
    db: AsyncSession
) -> bool:
    """Check if user has required permission."""
    # Get all user roles: User can have multiple roles.
    user_roles = await get_user_roles(user.id, db)
    
    # Check if any role has the permission: Check all roles until permission found.
    for role in user_roles:
        role_permissions = await get_role_permissions(role.id, db)
        if required_permission in [p.name for p in role_permissions]:
            return True  # User has permission through this role
    
    return False  # No role has the required permission

# require_permission: FastAPI dependency factory for permission-based access control.
async def require_permission(permission: Permission):
    """Dependency to require specific permission."""
    async def permission_checker(
        current_user: User = Depends(get_current_user),  # Get authenticated user
        db: AsyncSession = Depends(get_db)
    ) -> User:
        # Check permission: Verify user has required permission.
        has_permission = await check_permission(current_user, permission, db)
        if not has_permission:
            raise HTTPException(
                status_code=403,  # Forbidden
                detail=f"Permission denied: {permission.value} required"
            )
        return current_user  # User has permission, allow access
    
    return permission_checker

# Usage
@app.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(require_permission(Permission.MANAGE_USERS))
):
    # Only users with MANAGE_USERS permission can access
    pass
```

## Step 3: Role-Based Route Protection

```python
def require_role(required_role: Role):
    """Dependency to require specific role."""
    async def role_checker(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
    ) -> User:
        user_roles = await get_user_roles(current_user.id, db)
        role_names = [r.name for r in user_roles]
        
        if required_role.value not in role_names:
            raise HTTPException(
                status_code=403,
                detail=f"Role required: {required_role.value}"
            )
        return current_user
    
    return role_checker

# Usage
@app.get("/admin/users")
async def list_all_users(
    current_user: User = Depends(require_role(Role.ADMIN))
):
    # Only admins can access
    pass
```

## Summary

**RBAC provides:** Flexible access control, permission-based authorization, role management, and secure API endpoints.

Implement RBAC properly and you have enterprise-grade access control!

---

## 🎯 Interview Questions: FastAPI

### Q1: Explain Role-Based Access Control (RBAC) in FastAPI, including how it works, role and permission models, permission checking, dependency-based authorization, and best practices. Provide detailed examples showing a complete RBAC implementation.

**Answer:**

**RBAC Overview:**

Role-Based Access Control (RBAC) is an authorization mechanism that restricts access based on user roles and permissions. Users are assigned roles, and roles have permissions that determine what actions users can perform.

**Why RBAC:**

**Without RBAC (Hardcoded Checks):**
```python
# ❌ Bad: Hardcoded role checks
@app.delete("/users/{user_id}")
async def delete_user(user_id: int, current_user: User):
    if current_user.email != "admin@example.com":
        raise HTTPException(status_code=403)
    # Problem: Hard to maintain, not scalable
```

**With RBAC (Flexible System):**
```python
# ✅ Good: Permission-based checks
@app.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(require_permission(Permission.MANAGE_USERS))
):
    # Clean, maintainable, scalable
```

**RBAC Model:**

**Roles and Permissions:**
```python
from enum import Enum

class Role(str, Enum):
    ADMIN = "admin"
    MODERATOR = "moderator"
    USER = "user"

class Permission(str, Enum):
    # User permissions
    READ_OWN_PROFILE = "read_own_profile"
    EDIT_OWN_PROFILE = "edit_own_profile"
    
    # Moderator permissions
    EDIT_ANY_CONTENT = "edit_any_content"
    DELETE_ANY_CONTENT = "delete_any_content"
    
    # Admin permissions
    MANAGE_USERS = "manage_users"
    VIEW_ANALYTICS = "view_analytics"
```

**Database Schema:**
```python
# Many-to-many: Users ↔ Roles
user_roles = Table(
    'user_roles',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('role_id', Integer, ForeignKey('roles.id'), primary_key=True)
)

# Many-to-many: Roles ↔ Permissions
role_permissions = Table(
    'role_permissions',
    Base.metadata,
    Column('role_id', Integer, ForeignKey('roles.id'), primary_key=True),
    Column('permission_id', Integer, ForeignKey('permissions.id'), primary_key=True)
)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True)
    roles = relationship("Role", secondary=user_roles, back_populates="users")

class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True)
    users = relationship("User", secondary=user_roles, back_populates="roles")
    permissions = relationship("Permission", secondary=role_permissions, back_populates="roles")

class Permission(Base):
    __tablename__ = "permissions"
    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True)
    roles = relationship("Role", secondary=role_permissions, back_populates="permissions")
```

**Permission Checking:**
```python
async def check_permission(
    user: User,
    required_permission: Permission,
    db: AsyncSession
) -> bool:
    """
    Check if user has required permission through their roles.
    
    Process:
    1. Get all user roles
    2. For each role, get permissions
    3. Check if any role has required permission
    """
    # Get all user roles
    user_roles = await get_user_roles(user.id, db)
    
    # Check if any role has the permission
    for role in user_roles:
        role_permissions = await get_role_permissions(role.id, db)
        if required_permission in [p.name for p in role_permissions]:
            return True  # User has permission through this role
    
    return False  # No role has the required permission
```

**Dependency-Based Authorization:**
```python
from fastapi import Depends, HTTPException, status

async def require_permission(permission: Permission):
    """
    Dependency factory for permission-based access control.
    
    Returns a dependency function that checks permission.
    """
    async def permission_checker(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
    ) -> User:
        # Check permission
        has_permission = await check_permission(current_user, permission, db)
        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {permission.value} required"
            )
        return current_user  # User has permission, allow access
    
    return permission_checker

# Usage
@app.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(require_permission(Permission.MANAGE_USERS))
):
    """Only users with MANAGE_USERS permission can access."""
    await delete_user_service(user_id)
    return {"message": "User deleted"}
```

**Role-Based Route Protection:**
```python
def require_role(required_role: Role):
    """Dependency factory for role-based access control."""
    async def role_checker(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
    ) -> User:
        user_roles = await get_user_roles(current_user.id, db)
        role_names = [r.name for r in user_roles]
        
        if required_role.value not in role_names:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role required: {required_role.value}"
            )
        return current_user
    
    return role_checker

# Usage
@app.get("/admin/users")
async def list_all_users(
    current_user: User = Depends(require_role(Role.ADMIN))
):
    """Only admins can access."""
    return await get_all_users_service()
```

**Multiple Permissions:**
```python
async def require_any_permission(*permissions: Permission):
    """Require at least one of the specified permissions."""
    async def permission_checker(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
    ) -> User:
        for permission in permissions:
            if await check_permission(current_user, permission, db):
                return current_user
        
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Requires one of: {[p.value for p in permissions]}"
        )
    
    return permission_checker

async def require_all_permissions(*permissions: Permission):
    """Require all specified permissions."""
    async def permission_checker(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
    ) -> User:
        for permission in permissions:
            if not await check_permission(current_user, permission, db):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Requires all: {[p.value for p in permissions]}"
                )
        return current_user
    
    return permission_checker
```

**Best Practices:**

**1. Cache Permissions:**
```python
# Cache user permissions in Redis
# Avoid repeated database queries
# Invalidate cache on role/permission changes
```

**2. Principle of Least Privilege:**
```python
# Grant minimum permissions needed
# Review permissions regularly
# Remove unused permissions
```

**3. Audit Logging:**
```python
# Log all permission checks
# Track access attempts
# Monitor for suspicious activity
```

**System Design Consideration**: RBAC provides:
1. **Flexibility**: Easy to add roles and permissions
2. **Scalability**: Works for large user bases
3. **Maintainability**: Centralized authorization logic
4. **Security**: Fine-grained access control

RBAC is essential for enterprise-grade access control. Understanding role and permission models, permission checking, dependency-based authorization, and best practices is crucial for building secure, maintainable applications. Always implement proper permission caching, follow principle of least privilege, and audit access attempts.

---

### Q2: Explain the difference between role-based and permission-based access control, when to use each, and how to implement hierarchical roles and permission inheritance. Discuss performance optimization and caching strategies.

**Answer:**

**Role-Based vs Permission-Based:**

**Role-Based (Simpler):**
```python
# Check if user has specific role
if user.role == "admin":
    allow_access()
```

**Permission-Based (More Flexible):**
```python
# Check if user has specific permission
if user.has_permission("manage_users"):
    allow_access()
```

**When to Use Each:**

**Use Role-Based When:**
- Simple access control needed
- Few roles (admin, user, guest)
- Roles rarely change
- Performance is critical

**Use Permission-Based When:**
- Complex access control needed
- Many permissions
- Permissions change frequently
- Need fine-grained control

**Hierarchical Roles:**
```python
# Roles can inherit permissions from parent roles
class RoleHierarchy:
    ADMIN = {
        "permissions": ["*"],  # All permissions
        "children": ["MODERATOR", "USER"]
    }
    MODERATOR = {
        "permissions": ["edit_content", "delete_content"],
        "children": ["USER"]
    }
    USER = {
        "permissions": ["read_own_profile", "edit_own_profile"]
    }

async def get_all_permissions(user: User, db: AsyncSession) -> set:
    """Get all permissions including inherited ones."""
    user_roles = await get_user_roles(user.id, db)
    all_permissions = set()
    
    for role in user_roles:
        # Direct permissions
        role_perms = await get_role_permissions(role.id, db)
        all_permissions.update([p.name for p in role_perms])
        
        # Inherited permissions from parent roles
        parent_perms = await get_inherited_permissions(role.id, db)
        all_permissions.update([p.name for p in parent_perms])
    
    return all_permissions
```

**Performance Optimization:**

**1. Cache Permissions:**
```python
# Cache user permissions in Redis
async def get_cached_permissions(user_id: int) -> set:
    redis = await get_redis()
    cache_key = f"permissions:user:{user_id}"
    
    cached = await redis.get(cache_key)
    if cached:
        return set(json.loads(cached))
    
    # Load from database
    permissions = await get_all_permissions(user_id)
    
    # Cache for 1 hour
    await redis.setex(cache_key, 3600, json.dumps(list(permissions)))
    return permissions
```

**2. Eager Load Relationships:**
```python
# Load roles and permissions in single query
stmt = select(User).options(
    selectinload(User.roles).selectinload(Role.permissions)
).where(User.id == user_id)
```

**System Design Consideration**: RBAC requires:
1. **Caching**: Cache permissions for performance
2. **Hierarchy**: Support role inheritance
3. **Performance**: Optimize permission checks
4. **Flexibility**: Support both roles and permissions

Understanding the difference between role-based and permission-based access control, hierarchical roles, and performance optimization is essential for building scalable authorization systems. Always cache permissions, use eager loading, and implement proper permission inheritance.


