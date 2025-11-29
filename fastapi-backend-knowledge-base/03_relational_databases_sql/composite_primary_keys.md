# Composite Primary Keys

Composite primary keys use multiple columns to uniquely identify rows. This guide covers when and how to use them effectively.

## When to Use Composite Primary Keys

### Use Cases

1. **Natural Keys**
   - Many-to-many relationship tables
   - Historical/time-series data
   - User roles and permissions

2. **Avoid Surrogate Keys**
   - When natural composite key exists
   - Junction tables
   - Legacy system integration

## Basic Implementation

### SQLAlchemy Model

```python
from sqlalchemy import Column, Integer, String, ForeignKey, Table
from sqlalchemy.orm import relationship

# Many-to-many relationship table
user_roles = Table(
    'user_roles',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('role_id', Integer, ForeignKey('roles.id'), primary_key=True),
    Column('assigned_at', DateTime, default=datetime.utcnow)
)
```

### Using Mapped Classes

```python
from sqlalchemy.orm import Mapped, mapped_column

class UserRole(Base):
    __tablename__ = 'user_roles'
    
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), primary_key=True)
    role_id: Mapped[int] = mapped_column(ForeignKey('roles.id'), primary_key=True)
    assigned_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    
    user: Mapped["User"] = relationship()
    role: Mapped["Role"] = relationship()

# Query
user_role = await session.get(UserRole, (user_id, role_id))
```

## Composite Keys with Additional Columns

### Order Items Example

```python
class OrderItem(Base):
    __tablename__ = 'order_items'
    
    order_id: Mapped[int] = mapped_column(ForeignKey('orders.id'), primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey('products.id'), primary_key=True)
    sequence: Mapped[int] = mapped_column(primary_key=True)  # For duplicates
    
    quantity: Mapped[int]
    price: Mapped[Decimal]
    
    order: Mapped["Order"] = relationship()
    product: Mapped["Product"] = relationship()

# Accessing
item = await session.get(OrderItem, (order_id, product_id, sequence))
```

## Querying with Composite Keys

### Get by Composite Key

```python
from sqlalchemy import select

# Method 1: Using get()
item = await session.get(OrderItem, (order_id, product_id, sequence))

# Method 2: Using select()
result = await session.execute(
    select(OrderItem).where(
        and_(
            OrderItem.order_id == order_id,
            OrderItem.product_id == product_id,
            OrderItem.sequence == sequence
        )
    )
)
item = result.scalar_one_or_none()
```

### Filtering and Joins

```python
# Get all items for an order
items = await session.execute(
    select(OrderItem)
    .where(OrderItem.order_id == order_id)
    .order_by(OrderItem.sequence)
)

# Join with related tables
result = await session.execute(
    select(OrderItem, Product)
    .join(Product, OrderItem.product_id == Product.id)
    .where(OrderItem.order_id == order_id)
)
```

## Relationships with Composite Keys

### Foreign Keys to Composite Keys

```python
class OrderItem(Base):
    __tablename__ = 'order_items'
    
    order_id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(primary_key=True)
    
    # Foreign key to composite primary key
    shipment_id: Mapped[int] = mapped_column(ForeignKey('shipments.id'))
    
    shipment: Mapped["Shipment"] = relationship()

# Cannot directly reference composite key as foreign key
# Use separate foreign keys or junction table
```

## Repository Pattern with Composite Keys

```python
class OrderItemRepository:
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def get_by_key(
        self,
        order_id: int,
        product_id: int,
        sequence: int
    ) -> Optional[OrderItem]:
        return await self.session.get(
            OrderItem,
            (order_id, product_id, sequence)
        )
    
    async def get_by_order(self, order_id: int) -> List[OrderItem]:
        result = await session.execute(
            select(OrderItem).where(OrderItem.order_id == order_id)
        )
        return list(result.scalars().all())
    
    async def create(self, order_id: int, product_id: int, **kwargs) -> OrderItem:
        # Get next sequence if needed
        max_sequence = await session.execute(
            select(func.max(OrderItem.sequence))
            .where(
                OrderItem.order_id == order_id,
                OrderItem.product_id == product_id
            )
        )
        sequence = (max_sequence.scalar() or 0) + 1
        
        item = OrderItem(
            order_id=order_id,
            product_id=product_id,
            sequence=sequence,
            **kwargs
        )
        session.add(item)
        await session.flush()
        return item
```

## Alternative: Composite Unique Index

### When Composite Key Not Needed

```python
class OrderItem(Base):
    __tablename__ = 'order_items'
    
    id: Mapped[int] = mapped_column(primary_key=True)  # Surrogate key
    order_id: Mapped[int] = mapped_column(ForeignKey('orders.id'))
    product_id: Mapped[int] = mapped_column(ForeignKey('products.id'))
    
    __table_args__ = (
        UniqueConstraint('order_id', 'product_id', name='uq_order_product'),
    )

# Benefits:
# - Simpler queries
# - Easier relationships
# - Still prevents duplicates
```

## Best Practices

1. **Use for Junction Tables** - Many-to-many relationships
2. **Consider Surrogate Keys** - If relationships become complex
3. **Index All Key Columns** - For query performance
4. **Document Key Order** - Important for tuple access
5. **Use Unique Constraints** - As alternative when single PK preferred

## Summary

Composite primary keys are useful for:
- Junction tables (many-to-many)
- Natural multi-column keys
- Historical data tracking

Consider surrogate keys when:
- Relationships become complex
- Query performance is critical
- Simpler API is preferred

Choose based on your specific use case and query patterns.

