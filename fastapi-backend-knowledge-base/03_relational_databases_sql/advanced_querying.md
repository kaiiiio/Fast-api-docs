# Advanced Querying in SQLAlchemy

Advanced querying techniques for complex data retrieval in SQLAlchemy async.

## Joins

### Inner Join

```python
from sqlalchemy import select
from app.models import User, Order

# Users with orders
result = await session.execute(
    select(User, Order)
    .join(Order, User.id == Order.user_id)
)
for user, order in result.all():
    print(f"{user.email}: {order.total}")
```

### Left Outer Join

```python
# All users, including those without orders
result = await session.execute(
    select(User, Order)
    .outerjoin(Order, User.id == Order.user_id)
)
```

### Multiple Joins

```python
from app.models import User, Order, OrderItem, Product

result = await session.execute(
    select(User, Order, OrderItem, Product)
    .join(Order, User.id == Order.user_id)
    .join(OrderItem, Order.id == OrderItem.order_id)
    .join(Product, OrderItem.product_id == Product.id)
)
```

## Aggregations

### Group By

```python
from sqlalchemy import func, select

# Orders per user
result = await session.execute(
    select(
        User.id,
        User.email,
        func.count(Order.id).label('order_count'),
        func.sum(Order.total).label('total_spent')
    )
    .join(Order, User.id == Order.user_id)
    .group_by(User.id, User.email)
)

for row in result.all():
    print(f"{row.email}: {row.order_count} orders, ${row.total_spent}")
```

### Having Clause

```python
# Users with more than 10 orders
result = await session.execute(
    select(
        User.id,
        User.email,
        func.count(Order.id).label('order_count')
    )
    .join(Order, User.id == Order.user_id)
    .group_by(User.id, User.email)
    .having(func.count(Order.id) > 10)
)
```

## Subqueries

### Scalar Subquery

```python
from sqlalchemy import select, func

# User with their latest order total
subquery = select(
    func.max(Order.total)
).where(
    Order.user_id == User.id
).scalar_subquery()

result = await session.execute(
    select(User, subquery.label('latest_order_total'))
)
```

### Correlated Subquery

```python
# Users with orders above average
avg_order = select(func.avg(Order.total)).scalar_subquery()

result = await session.execute(
    select(User)
    .where(
        select(func.count(Order.id))
        .where(Order.user_id == User.id)
        .where(Order.total > avg_order)
        .scalar_subquery() > 0
    )
)
```

## Common Table Expressions (CTEs)

```python
from sqlalchemy import select, func

# Monthly order statistics
monthly_stats = select(
    func.date_trunc('month', Order.created_at).label('month'),
    func.count(Order.id).label('order_count'),
    func.sum(Order.total).label('revenue')
).group_by(
    func.date_trunc('month', Order.created_at)
).cte('monthly_stats')

result = await session.execute(
    select(monthly_stats)
    .order_by(monthly_stats.c.month)
)
```

## Window Functions

```python
from sqlalchemy import func, select
from sqlalchemy.sql import func as sql_func

# Ranking users by order total
result = await session.execute(
    select(
        User.id,
        User.email,
        func.sum(Order.total).label('total'),
        func.rank().over(
            order_by=func.sum(Order.total).desc()
        ).label('rank')
    )
    .join(Order, User.id == Order.user_id)
    .group_by(User.id, User.email)
)
```

## Filtering and Conditions

### Complex Where Clauses

```python
from sqlalchemy import and_, or_, not_

# Multiple conditions
result = await session.execute(
    select(User)
    .where(
        and_(
            User.is_active == True,
            User.created_at > datetime(2024, 1, 1),
            or_(
                User.role == "admin",
                User.role == "moderator"
            )
        )
    )
)
```

### Case Statements

```python
from sqlalchemy import case

# Categorize users by order count
result = await session.execute(
    select(
        User.id,
        User.email,
        func.count(Order.id).label('order_count'),
        case(
            (func.count(Order.id) > 10, 'VIP'),
            (func.count(Order.id) > 5, 'Regular'),
            else_='New'
        ).label('status')
    )
    .outerjoin(Order, User.id == Order.user_id)
    .group_by(User.id, User.email)
)
```

## Eager Loading Strategies

### Selectin Load

```python
from sqlalchemy.orm import selectinload

# Load relationships in separate query
result = await session.execute(
    select(User)
    .options(selectinload(User.orders))
)
users = result.scalars().all()
# user.orders already loaded
```

### Joined Load

```python
from sqlalchemy.orm import joinedload

# Load relationships in same query with JOIN
result = await session.execute(
    select(User)
    .options(joinedload(User.orders))
)
users = result.scalars().all()
```

### Multiple Relationships

```python
result = await session.execute(
    select(User)
    .options(
        selectinload(User.orders).selectinload(Order.items),
        selectinload(User.profile)
    )
)
```

## Bulk Operations

### Bulk Insert

```python
from sqlalchemy import insert

users_data = [
    {"email": f"user{i}@example.com", "name": f"User {i}"}
    for i in range(100)
]

await session.execute(
    insert(User).values(users_data)
)
await session.commit()
```

### Bulk Update

```python
from sqlalchemy import update

# Update multiple rows
await session.execute(
    update(User)
    .where(User.is_active == False)
    .values(is_active=True, updated_at=datetime.utcnow())
)
await session.commit()
```

### Bulk Delete

```python
from sqlalchemy import delete

# Delete inactive users older than 1 year
await session.execute(
    delete(User)
    .where(
        and_(
            User.is_active == False,
            User.created_at < datetime(2023, 1, 1)
        )
    )
)
await session.commit()
```

## Text SQL Queries

```python
from sqlalchemy import text

# Raw SQL for complex queries
result = await session.execute(text("""
    WITH monthly_revenue AS (
        SELECT 
            DATE_TRUNC('month', created_at) as month,
            SUM(total) as revenue
        FROM orders
        GROUP BY DATE_TRUNC('month', created_at)
    )
    SELECT 
        month,
        revenue,
        LAG(revenue) OVER (ORDER BY month) as prev_revenue,
        revenue - LAG(revenue) OVER (ORDER BY month) as growth
    FROM monthly_revenue
    ORDER BY month
"""))

for row in result:
    print(f"{row.month}: ${row.revenue} (growth: ${row.growth})")
```

## Best Practices

1. **Use joins for related data** - Avoid N+1 queries
2. **Eager load relationships** - Use selectinload or joinedload
3. **Use subqueries for complex logic** - When joins become unwieldy
4. **Use CTEs for readability** - Break complex queries into parts
5. **Bulk operations for many rows** - More efficient than loops
6. **Index frequently queried columns** - Improve performance

## Summary

Advanced querying techniques:
- Joins for related data
- Aggregations and grouping
- Subqueries for complex logic
- CTEs for readability
- Window functions for rankings
- Bulk operations for efficiency
- Eager loading to avoid N+1 queries

Use these techniques to write efficient, readable queries for complex data retrieval.

