# Role-Based Access Control (RBAC): Complete Guide

RBAC restricts access based on user roles. This guide teaches you how to implement comprehensive role-based access control in FastAPI.

## Understanding RBAC

**The concept:**
Users have roles, roles have permissions. Check permissions before allowing actions.

**Example:**
- **Admin**: Can do everything
- **Moderator**: Can edit content, can't delete users
- **User**: Can only edit own content

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
async def check_permission(
    user: User,
    required_permission: Permission,
    db: AsyncSession
) -> bool:
    """Check if user has required permission."""
    # Get all user roles
    user_roles = await get_user_roles(user.id, db)
    
    # Check if any role has the permission
    for role in user_roles:
        role_permissions = await get_role_permissions(role.id, db)
        if required_permission in [p.name for p in role_permissions]:
            return True
    
    return False

async def require_permission(permission: Permission):
    """Dependency to require specific permission."""
    async def permission_checker(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
    ) -> User:
        has_permission = await check_permission(current_user, permission, db)
        if not has_permission:
            raise HTTPException(
                status_code=403,
                detail=f"Permission denied: {permission.value} required"
            )
        return current_user
    
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

RBAC provides:
- ✅ Flexible access control
- ✅ Permission-based authorization
- ✅ Role management
- ✅ Secure API endpoints

Implement RBAC properly and you have enterprise-grade access control!

