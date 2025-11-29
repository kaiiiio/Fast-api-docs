# Soft Delete Patterns: Complete Guide

Soft delete is a critical pattern in production systems. This guide explains why it matters, how it works, and how to implement it correctly using our e-commerce example.

## The Problem: Why Not Just DELETE?

Let's start with a real scenario from our e-commerce system:

**The Situation:**
- A customer places an order for $500
- The order contains 3 products
- Customer asks to cancel/delete their account

**What happens if we just DELETE the user?**

```sql
DELETE FROM users WHERE id = 1;
```

**Problems:**
1. **Financial records are broken**: Orders reference a user that no longer exists
2. **Audit trail is lost**: Can't see who placed orders
3. **Compliance issues**: GDPR, accounting requirements need data retention
4. **Relationships break**: Foreign keys might fail or leave orphaned records
5. **Recovery is impossible**: Deleted data is gone forever

**Real-world example:**
- An accountant needs to generate a report showing all orders by deleted users
- Legal needs to prove a customer's purchase history
- You need to restore a user who was accidentally deleted

Soft delete solves all of these problems.

## What is Soft Delete?

**Concept:**
Instead of removing a record from the database, mark it as deleted. The record stays in the database but is "invisible" to normal queries.

**How it works:**
- Add a `deleted_at` column (timestamp, nullable)
- `NULL` = not deleted (active record)
- `datetime` = deleted (the timestamp shows when)

**Visual representation:**

```
Before soft delete:
users table:
  id | email           | full_name
  1  | john@example.com| John Doe      ← Active
  2  | jane@example.com| Jane Smith    ← Active

After soft delete (user 1 deleted):
users table:
  id | email           | full_name      | deleted_at
  1  | john@example.com| John Doe       | 2024-01-15 10:30:00  ← Soft deleted
  2  | jane@example.com| Jane Smith     | NULL                  ← Still active
```

The record still exists, but queries filter it out automatically.

## Step 1: Adding Soft Delete to Models

Let's add soft delete to our User model:

```python
from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from typing import Optional

class User(Base):
    """
    User model with soft delete support.
    """
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    full_name = Column(String(200), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Soft delete field
    deleted_at = Column(DateTime, nullable=True, index=True)
    
    def soft_delete(self):
        """Mark this user as deleted."""
        self.deleted_at = datetime.utcnow()
    
    def restore(self):
        """Restore a soft-deleted user."""
        self.deleted_at = None
    
    @property
    def is_deleted(self) -> bool:
        """Check if user is soft deleted."""
        return self.deleted_at is not None
    
    def __repr__(self):
        status = "DELETED" if self.is_deleted else "ACTIVE"
        return f"<User(id={self.id}, email='{self.email}', status={status})>"
```

**Understanding the design:**

**1. `deleted_at = Column(DateTime, nullable=True, index=True)`**
- `nullable=True` - New users don't have this set (not deleted)
- `index=True` - Speeds up queries filtering by deleted_at
- Stores timestamp of when deletion happened

**2. Helper methods:**
- `soft_delete()` - Sets timestamp to now
- `restore()` - Sets back to NULL
- `is_deleted` - Convenient property to check status

## Step 2: Creating a Base Mixin for Reusability

Since we want soft delete on multiple tables, let's create a reusable mixin:

```python
from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy import Column, DateTime, Index
from datetime import datetime

class SoftDeleteMixin:
    """
    Mixin to add soft delete functionality to any model.
    
    Usage:
        class User(Base, SoftDeleteMixin):
            __tablename__ = "users"
            ...
    """
    
    # Use declared_attr so each model gets its own column
    @declared_attr
    def deleted_at(cls):
        """deleted_at column for soft delete."""
        return Column(DateTime, nullable=True, index=True)
    
    @declared_attr
    def __table_args__(cls):
        """Create index on deleted_at for faster queries."""
        return (
            Index(f'idx_{cls.__tablename__}_deleted_at', 'deleted_at'),
        )
    
    def soft_delete(self):
        """Mark record as soft deleted."""
        self.deleted_at = datetime.utcnow()
    
    def restore(self):
        """Restore soft-deleted record."""
        self.deleted_at = None
    
    @property
    def is_deleted(self) -> bool:
        """Check if record is soft deleted."""
        return self.deleted_at is not None
    
    @classmethod
    def active_filter(cls):
        """
        Return SQLAlchemy filter for active (non-deleted) records.
        
        Usage:
            stmt = select(User).where(User.active_filter())
        """
        return cls.deleted_at.is_(None)
    
    @classmethod
    def deleted_filter(cls):
        """
        Return SQLAlchemy filter for deleted records.
        
        Usage:
            stmt = select(User).where(User.deleted_filter())
        """
        return cls.deleted_at.isnot(None)

# Now use it in multiple models
class User(Base, SoftDeleteMixin):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True)

class Product(Base, SoftDeleteMixin):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True)
    name = Column(String(200))
    price = Column(Numeric(10, 2))
```

**Understanding mixins:**

Mixins let you share functionality across multiple classes. When you inherit from both `Base` and `SoftDeleteMixin`, you get all the soft delete methods automatically.

## Step 3: Querying Active Records (Excluding Deleted)

This is the critical part - we need to filter out deleted records automatically:

### Basic Query Filtering

```python
from sqlalchemy import select

async def get_active_users():
    """
    Get all active (non-deleted) users.
    
    This query automatically excludes soft-deleted users.
    """
    async with async_session_maker() as session:
        stmt = select(User).where(
            User.deleted_at.is_(None)  # Only active users
        )
        
        result = await session.execute(stmt)
        return list(result.scalars().all())
```

**Understanding `.is_(None)`:**
- `deleted_at IS NULL` in SQL
- Means "not deleted" (no deletion timestamp)

### Using the Helper Method

```python
async def get_active_users_with_helper():
    """Using the active_filter() helper method."""
    async with async_session_maker() as session:
        stmt = select(User).where(
            User.active_filter()  # Cleaner syntax
        )
        
        result = await session.execute(stmt)
        return list(result.scalars().all())
```

### Querying Deleted Records

Sometimes you need to see deleted records (admin functions, recovery):

```python
async def get_deleted_users():
    """Get all soft-deleted users."""
    async with async_session_maker() as session:
        stmt = select(User).where(
            User.deleted_filter()  # Only deleted users
        )
        
        result = await session.execute(stmt)
        return list(result.scalars().all())
```

### Querying All Records (Including Deleted)

```python
async def get_all_users_including_deleted():
    """Get all users, both active and deleted."""
    async with async_session_maker() as session:
        stmt = select(User)  # No filter - gets everything
        result = await session.execute(stmt)
        return list(result.scalars().all())
```

## Step 4: Repository Pattern with Soft Delete

Let's build a complete repository that handles soft delete:

```python
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

class UserRepository:
    """User repository with soft delete support."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def get_by_id(self, user_id: int, include_deleted: bool = False) -> Optional[User]:
        """
        Get user by ID.
        
        Args:
            user_id: User ID
            include_deleted: If True, returns deleted users too
        
        Returns:
            User object or None
        """
        user = await self.session.get(User, user_id)
        
        # If user is deleted and we don't want deleted, return None
        if user and user.is_deleted and not include_deleted:
            return None
        
        return user
    
    async def get_active_users(self, skip: int = 0, limit: int = 100) -> List[User]:
        """Get all active users only."""
        stmt = select(User).where(
            User.active_filter()
        ).offset(skip).limit(limit)
        
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
    
    async def soft_delete_user(self, user_id: int) -> Optional[User]:
        """
        Soft delete a user.
        
        This marks them as deleted but keeps the record.
        """
        user = await self.get_by_id(user_id, include_deleted=False)
        
        if not user:
            return None
        
        # Use the helper method
        user.soft_delete()
        
        await self.session.flush()
        await self.session.commit()
        
        return user
    
    async def restore_user(self, user_id: int) -> Optional[User]:
        """
        Restore a soft-deleted user.
        
        This makes them active again.
        """
        user = await self.get_by_id(user_id, include_deleted=True)
        
        if not user or not user.is_deleted:
            return None
        
        user.restore()
        
        await self.session.flush()
        await self.session.commit()
        
        return user
    
    async def hard_delete_user(self, user_id: int) -> bool:
        """
        Permanently delete a user.
        
        WARNING: This is irreversible! Only use for compliance cleanup.
        """
        user = await self.get_by_id(user_id, include_deleted=True)
        
        if not user:
            return False
        
        # Check if user has orders (business rule)
        if user.orders:
            raise ValueError(
                f"Cannot hard delete user {user_id}: "
                f"they have {len(user.orders)} orders. "
                f"Use soft delete instead."
            )
        
        await self.session.delete(user)
        await self.session.commit()
        
        return True
```

**Why include_deleted parameter?**

Sometimes you need deleted records (recovery, admin panel). Having an explicit parameter makes it clear when you're including deleted records.

## Step 5: Handling Relationships with Soft Delete

This is where it gets interesting. What happens to related data when we soft delete?

### Scenario: Soft Delete User with Orders

**The challenge:**
- User has orders
- We soft delete the user
- Orders still reference the user (that's fine - user still exists in DB)
- But queries for "orders by active users" might break

**Solution: Check parent status in queries**

```python
async def get_orders_for_active_users():
    """Get orders only from active (non-deleted) users."""
    from sqlalchemy.orm import selectinload
    
    stmt = select(Order).options(
        selectinload(Order.user)
    ).join(
        User, Order.user_id == User.id
    ).where(
        User.active_filter()  # Only orders from active users
    )
    
    result = await session.execute(stmt)
    return list(result.scalars().all())
```

### Cascade Soft Delete (Optional Pattern)

Sometimes you want to soft delete related records too:

```python
async def soft_delete_user_with_orders(user_id: int):
    """
    Soft delete user and all their orders.
    
    This maintains referential integrity while marking everything deleted.
    """
    async with async_session_maker() as session:
        user = await session.get(User, user_id)
        if not user:
            return None
        
        # Soft delete user
        user.soft_delete()
        
        # Soft delete all their orders
        for order in user.orders:
            order.soft_delete()
            
            # Soft delete all items in each order
            for item in order.items:
                item.soft_delete()
        
        await session.commit()
        return user
```

## Step 6: Handling Unique Constraints

This is a common problem! Let's say we have:

```python
class User(Base, SoftDeleteMixin):
    email = Column(String(255), unique=True, nullable=False)
```

**The problem:**
- User "john@example.com" exists
- We soft delete them
- Try to create new user "john@example.com"
- Database error: unique constraint violation (old record still exists!)

**Solution: Partial unique index**

PostgreSQL allows unique indexes with conditions:

```python
# Migration (Alembic)
from alembic import op

def upgrade():
    # Drop the regular unique constraint
    op.drop_constraint('users_email_key', 'users', type_='unique')
    
    # Create partial unique index (only for active users)
    op.execute("""
        CREATE UNIQUE INDEX uq_users_email_active
        ON users (email)
        WHERE deleted_at IS NULL
    """)

def downgrade():
    op.drop_index('uq_users_email_active', table_name='users')
    op.create_unique_constraint('users_email_key', 'users', ['email'])
```

**What this does:**
- `WHERE deleted_at IS NULL` - Only enforces uniqueness for active users
- Deleted users can have same email as active users
- Active users can't duplicate each other's emails
- You can restore a user even if someone else took their email

**In the application:**

```python
async def create_user(email: str, full_name: str):
    """Create user - handles soft-deleted email conflicts."""
    async with async_session_maker() as session:
        # Check if email exists for active user
        existing_active = await session.execute(
            select(User).where(
                User.email == email,
                User.active_filter()
            )
        )
        
        if existing_active.scalar_one_or_none():
            raise ValueError(f"Email {email} is already in use")
        
        # Check if there's a soft-deleted user with this email
        existing_deleted = await session.execute(
            select(User).where(
                User.email == email,
                User.deleted_filter()
            )
        )
        
        deleted_user = existing_deleted.scalar_one_or_none()
        
        if deleted_user:
            # Option 1: Restore the deleted user
            deleted_user.restore()
            deleted_user.full_name = full_name  # Update name
            await session.commit()
            return deleted_user
        
        # Option 2: Create new user
        user = User(email=email, full_name=full_name)
        session.add(user)
        await session.commit()
        return user
```

## Step 7: Automatic Filtering (Advanced Pattern)

Wouldn't it be nice if soft-deleted records were automatically filtered out? Here's how:

### Custom Query Class

```python
from sqlalchemy.orm import Query

class SoftDeleteQuery(Query):
    """Query class that automatically filters soft-deleted records."""
    
    def __new__(cls, *args, **kwargs):
        """Create query with default filtering."""
        return super().__new__(cls)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._with_deleted = False
    
    def with_deleted(self):
        """Include soft-deleted records in query."""
        self._with_deleted = True
        return self
    
    def _get_entities(self):
        """Override to add soft delete filter automatically."""
        entities = super()._get_entities()
        
        if not self._with_deleted:
            # Add filter for each entity with SoftDeleteMixin
            for entity in entities:
                if hasattr(entity, 'active_filter'):
                    self = self.filter(entity.active_filter())
        
        return entities

# Configure session to use custom query class
from sqlalchemy.orm import sessionmaker

async_session_maker = sessionmaker(
    engine,
    class_=AsyncSession,
    query_cls=SoftDeleteQuery,  # Use custom query class
    expire_on_commit=False
)
```

**How it works:**
- By default, all queries automatically exclude soft-deleted records
- Use `.with_deleted()` to include them
- Makes the code cleaner (no need to add `.where(active_filter())` everywhere)

**Usage:**
```python
# Automatically excludes deleted users
users = await session.execute(select(User)).scalars().all()

# Include deleted users
users = await session.execute(
    select(User).with_deleted()
).scalars().all()
```

## Step 8: Cleanup Old Deleted Records

Eventually, you'll want to permanently delete old soft-deleted records (GDPR, storage):

```python
async def cleanup_old_deleted_records(days_old: int = 90):
    """
    Permanently delete records that were soft-deleted more than X days ago.
    
    This is typically run as a scheduled job.
    
    Args:
        days_old: Delete records older than this many days
    """
    from datetime import datetime, timedelta
    
    cutoff_date = datetime.utcnow() - timedelta(days=days_old)
    
    async with async_session_maker() as session:
        # Find old deleted users
        stmt = select(User).where(
            User.deleted_filter(),
            User.deleted_at < cutoff_date
        )
        
        result = await session.execute(stmt)
        old_deleted_users = result.scalars().all()
        
        # Check if they have important relationships
        for user in old_deleted_users:
            # Business rule: Don't delete if they have orders
            if user.orders:
                print(f"Skipping user {user.id}: has {len(user.orders)} orders")
                continue
            
            # Hard delete
            await session.delete(user)
            print(f"Hard deleted user {user.id} (deleted on {user.deleted_at})")
        
        await session.commit()
```

## Step 9: API Endpoints with Soft Delete

Let's see how this works in FastAPI routes:

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Soft delete a user.
    
    The user is marked as deleted but their data is preserved
    for audit and compliance purposes.
    """
    repo = UserRepository(db)
    
    user = await repo.soft_delete_user(user_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "message": "User deleted successfully",
        "user_id": user_id,
        "deleted_at": user.deleted_at.isoformat()
    }

@router.post("/users/{user_id}/restore")
async def restore_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)  # Only admins
):
    """
    Restore a soft-deleted user.
    
    This makes them active again.
    """
    repo = UserRepository(db)
    
    user = await repo.restore_user(user_id)
    
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found or already active"
        )
    
    return {
        "message": "User restored successfully",
        "user_id": user_id
    }

@router.get("/users/{user_id}")
async def get_user(
    user_id: int,
    include_deleted: bool = False,  # Query parameter
    db: AsyncSession = Depends(get_db)
):
    """
    Get user by ID.
    
    By default, only returns active users.
    Set include_deleted=true to get deleted users.
    """
    repo = UserRepository(db)
    
    user = await repo.get_by_id(user_id, include_deleted=include_deleted)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user
```

## Step 10: Testing Soft Delete

Let's test our implementation:

```python
import pytest
from datetime import datetime

@pytest.mark.asyncio
async def test_soft_delete_user(test_db: AsyncSession):
    """Test that soft delete marks user as deleted but keeps the record."""
    repo = UserRepository(test_db)
    
    # Create user
    user = await repo.create(email="test@example.com", full_name="Test User")
    user_id = user.id
    
    assert user.is_deleted is False
    assert user.deleted_at is None
    
    # Soft delete
    deleted_user = await repo.soft_delete_user(user_id)
    
    assert deleted_user.is_deleted is True
    assert deleted_user.deleted_at is not None
    assert isinstance(deleted_user.deleted_at, datetime)
    
    # User still exists in database
    all_users = await test_db.execute(select(User))
    assert len(list(all_users.scalars().all())) == 1
    
    # But not in active users
    active_users = await repo.get_active_users()
    assert len(active_users) == 0
    
    # Can get by ID with include_deleted
    found = await repo.get_by_id(user_id, include_deleted=True)
    assert found is not None
    assert found.is_deleted is True
    
    # Can't get without include_deleted
    not_found = await repo.get_by_id(user_id, include_deleted=False)
    assert not_found is None

@pytest.mark.asyncio
async def test_restore_user(test_db: AsyncSession):
    """Test that restore makes user active again."""
    repo = UserRepository(test_db)
    
    # Create and delete user
    user = await repo.create(email="test@example.com", full_name="Test User")
    await repo.soft_delete_user(user.id)
    
    # Restore
    restored = await repo.restore_user(user.id)
    
    assert restored.is_deleted is False
    assert restored.deleted_at is None
    
    # Now appears in active users
    active_users = await repo.get_active_users()
    assert len(active_users) == 1
    assert active_users[0].id == user.id
```

## Common Patterns and Best Practices

### Pattern 1: Audit Trail

Keep track of who deleted what:

```python
class User(Base, SoftDeleteMixin):
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Who deleted
    
    def soft_delete(self, deleted_by: Optional[int] = None):
        self.deleted_at = datetime.utcnow()
        self.deleted_by = deleted_by
```

### Pattern 2: Reason for Deletion

Store why something was deleted:

```python
class User(Base, SoftDeleteMixin):
    deleted_at = Column(DateTime, nullable=True)
    deletion_reason = Column(String(500), nullable=True)
    
    def soft_delete(self, reason: str = None):
        self.deleted_at = datetime.utcnow()
        self.deletion_reason = reason
```

### Pattern 3: Expiration Date

Automatically hard delete after a certain time:

```python
async def auto_hard_delete_expired():
    """Hard delete records soft-deleted more than 1 year ago."""
    one_year_ago = datetime.utcnow() - timedelta(days=365)
    
    old_deleted = await session.execute(
        select(User).where(
            User.deleted_filter(),
            User.deleted_at < one_year_ago
        )
    )
    
    for user in old_deleted.scalars().all():
        await session.delete(user)
    
    await session.commit()
```

## Summary: Key Takeaways

1. **Soft delete preserves data** - Critical for audit trails and compliance
2. **Use NULL for active, timestamp for deleted** - Simple and efficient
3. **Always filter by `deleted_at IS NULL`** - Exclude deleted in queries
4. **Handle unique constraints** - Use partial indexes
5. **Provide restore functionality** - Users make mistakes
6. **Clean up old records** - Run scheduled jobs for permanent deletion
7. **Document in API** - Make it clear when endpoints include deleted records

Soft delete is essential for production systems. Use it whenever you need to preserve data history!
