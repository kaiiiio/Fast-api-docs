# SQLAlchemy ORM vs Core: When to Use Each

SQLAlchemy provides two different interfaces: ORM (Object-Relational Mapping) and Core (SQL Expression Language). Understanding when to use each is crucial for optimal performance and code clarity.

## ORM vs Core Overview

### ORM (Object-Relational Mapping)
- Works with Python objects
- Automatic relationship handling
- Higher abstraction
- More convenient for most use cases

### Core (SQL Expression Language)
- Works closer to SQL
- More control and performance
- Better for complex queries
- Lower abstraction level

## When to Use ORM

### 1. **Standard CRUD Operations**

```python
from sqlalchemy.orm import Session
from app.models import User

# ✅ ORM: Simple, readable
async def create_user(user_data: dict, session: AsyncSession):
    user = User(**user_data)
    session.add(user)
    await session.commit()
    return user

async def get_user(user_id: int, session: AsyncSession):
    return await session.get(User, user_id)

async def update_user(user_id: int, updates: dict, session: AsyncSession):
    user = await session.get(User, user_id)
    for key, value in updates.items():
        setattr(user, key, value)
    await session.commit()
    return user
```

### 2. **Relationships and Navigation**

```python
# ✅ ORM: Easy relationship access
user = await session.get(User, user_id)
for order in user.orders:  # Automatic join
    print(order.total)
    for item in order.items:  # Nested relationships
        print(item.product.name)

# Relationships are loaded automatically (or with eager loading)
```

### 3. **Model-Based Validation**

```python
class User(Base):
    email: str
    age: int
    
    @validates('email')
    def validate_email(self, key, value):
        if '@' not in value:
            raise ValueError("Invalid email")
        return value

# ✅ ORM: Validation at model level
user = User(email="invalid", age=25)
# Raises ValueError automatically
```

## When to Use Core

### 1. **Complex Queries**

```python
from sqlalchemy import select, func, case
from sqlalchemy.orm import Session

# ✅ Core: Complex aggregations
async def get_user_statistics(session: AsyncSession):
    stmt = select(
        User.id,
        func.count(Order.id).label('order_count'),
        func.sum(Order.total).label('total_spent'),
        case(
            (func.count(Order.id) > 10, 'VIP'),
            (func.count(Order.id) > 5, 'Regular'),
            else_='New'
        ).label('status')
    ).join(
        Order, User.id == Order.user_id
    ).group_by(User.id)
    
    result = await session.execute(stmt)
    return result.all()

# ORM equivalent would be more verbose
```

### 2. **Bulk Operations**

```python
from sqlalchemy import insert, update, delete

# ✅ Core: Efficient bulk inserts
async def bulk_create_users(users_data: List[dict], session: AsyncSession):
    stmt = insert(User).values(users_data)
    await session.execute(stmt)
    await session.commit()

# Much faster than ORM:
# for user_data in users_data:
#     user = User(**user_data)
#     session.add(user)
# await session.commit()

# ✅ Core: Bulk updates
async def bulk_update_status(user_ids: List[int], status: str, session: AsyncSession):
    stmt = update(User).where(
        User.id.in_(user_ids)
    ).values(status=status)
    await session.execute(stmt)
    await session.commit()
```

### 3. **Raw SQL Queries**

```python
from sqlalchemy import text

# ✅ Core: Raw SQL for complex queries
async def get_complex_report(session: AsyncSession):
    stmt = text("""
        WITH monthly_stats AS (
            SELECT 
                user_id,
                DATE_TRUNC('month', created_at) as month,
                COUNT(*) as order_count,
                SUM(total) as total_revenue
            FROM orders
            GROUP BY user_id, DATE_TRUNC('month', created_at)
        )
        SELECT 
            u.id,
            u.email,
            AVG(ms.order_count) as avg_monthly_orders,
            SUM(ms.total_revenue) as lifetime_value
        FROM users u
        LEFT JOIN monthly_stats ms ON u.id = ms.user_id
        GROUP BY u.id, u.email
        HAVING SUM(ms.total_revenue) > 1000
        ORDER BY lifetime_value DESC
    """)
    
    result = await session.execute(stmt)
    return result.all()
```

### 4. **Performance-Critical Queries**

```python
# ✅ Core: Select only needed columns
async def get_user_emails_only(session: AsyncSession):
    stmt = select(User.email)  # Only email column
    result = await session.execute(stmt)
    return result.scalars().all()

# ORM loads entire object:
# users = await session.execute(select(User))
# emails = [user.email for user in users]  # Loads all columns
```

## Hybrid Approach

### Combine ORM Models with Core Queries

```python
from sqlalchemy import select
from app.models import User, Order

# ✅ Hybrid: Use ORM models with Core queries
async def get_users_with_order_count(session: AsyncSession):
    stmt = select(
        User,
        func.count(Order.id).label('order_count')
    ).outerjoin(
        Order, User.id == Order.user_id
    ).group_by(User.id)
    
    result = await session.execute(stmt)
    return [
        {"user": row.User, "order_count": row.order_count}
        for row in result.all()
    ]
```

### Use Core for Read, ORM for Write

```python
# ✅ Pattern: Core for reads, ORM for writes
async def get_user_fast(user_id: int, session: AsyncSession):
    # Core: Fast read, only needed columns
    stmt = select(User.id, User.email, User.name).where(User.id == user_id)
    result = await session.execute(stmt)
    return result.one()

async def update_user(user_id: int, data: dict, session: AsyncSession):
    # ORM: Convenient write with validation
    user = await session.get(User, user_id)
    for key, value in data.items():
        setattr(user, key, value)
    await session.commit()
    return user
```

## Performance Comparison

### ORM Overhead

```python
# ORM: Creates objects, tracks changes, loads relationships
user = await session.get(User, user_id)  # Loads all columns
user.email = "new@example.com"  # Change tracking
await session.commit()  # Generates UPDATE with all columns
```

### Core Efficiency

```python
# Core: Direct SQL, only specified columns
stmt = update(User).where(User.id == user_id).values(email="new@example.com")
await session.execute(stmt)  # UPDATE users SET email = ... WHERE id = ...
await session.commit()
```

## Decision Matrix

| Scenario | Use ORM | Use Core |
|----------|---------|----------|
| Simple CRUD | ✅ | ❌ |
| Complex queries | ⚠️ | ✅ |
| Bulk operations | ❌ | ✅ |
| Relationships | ✅ | ⚠️ |
| Raw SQL needed | ❌ | ✅ |
| Performance critical | ⚠️ | ✅ |
| Rapid development | ✅ | ❌ |
| Database-specific features | ❌ | ✅ |

## Best Practices

### 1. **Start with ORM, Optimize with Core**

```python
# Development: Use ORM
async def get_user_orders(user_id: int, session: AsyncSession):
    user = await session.get(User, user_id)
    return user.orders

# Production: Optimize with Core if needed
async def get_user_orders_optimized(user_id: int, session: AsyncSession):
    stmt = select(Order).where(Order.user_id == user_id)
    result = await session.execute(stmt)
    return result.scalars().all()
```

### 2. **Use Core for Reports and Analytics**

```python
# ✅ Core: Better for analytics
async def get_sales_report(start_date: datetime, session: AsyncSession):
    stmt = select(
        func.date(Order.created_at).label('date'),
        func.count(Order.id).label('orders'),
        func.sum(Order.total).label('revenue')
    ).where(
        Order.created_at >= start_date
    ).group_by(
        func.date(Order.created_at)
    ).order_by('date')
    
    return await session.execute(stmt).all()
```

### 3. **Use ORM for Business Logic**

```python
# ✅ ORM: Better for business logic with relationships
class Order(Base):
    def calculate_total(self):
        return sum(item.price * item.quantity for item in self.items)
    
    def can_be_cancelled(self):
        return self.status == OrderStatus.PENDING

# Easy to use in business logic
order = await session.get(Order, order_id)
if order.can_be_cancelled():
    order.total = order.calculate_total()
```

## Summary

- **Use ORM for:**
  - Standard CRUD operations
  - Relationship navigation
  - Business logic in models
  - Rapid development

- **Use Core for:**
  - Complex queries and aggregations
  - Bulk operations
  - Performance-critical reads
  - Raw SQL requirements
  - Database-specific features

- **Hybrid Approach:**
  - Use ORM models with Core queries
  - Core for reads, ORM for writes
  - Optimize performance-critical paths with Core

The key is to start with ORM for simplicity and switch to Core when you need better performance or more control.

