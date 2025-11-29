# Data Modeling Principles

Effective data modeling is the foundation of a robust backend. This guide covers core principles for designing data models in FastAPI applications.

## Core Principles

### 1. **Normalization vs Denormalization**

Normalization reduces data redundancy, while denormalization improves read performance.

**Normalized Approach (3NF):**
```python
# Separate tables
class User(Base):
    id: int
    email: str

class UserProfile(Base):
    user_id: int  # Foreign key
    first_name: str
    last_name: str
    bio: str

class UserPreferences(Base):
    user_id: int  # Foreign key
    theme: str
    language: str
```

**Denormalized Approach:**
```python
# Single document/table
class User(Base):
    id: int
    email: str
    profile: JSON  # Embedded data
    preferences: JSON  # Embedded data
```

**When to Use:**
- **Normalize** when: Data integrity is critical, writes are frequent, relationships are complex
- **Denormalize** when: Read performance is critical, data doesn't change often, simple relationships

### 2. **Idempotency Keys**

Ensure operations can be safely retried.

```python
class Payment(Base):
    id: int
    idempotency_key: str = Field(unique=True, index=True)
    amount: float
    status: str

# Usage
async def process_payment(
    idempotency_key: str,
    amount: float,
    db: AsyncSession
):
    # Check if already processed
    existing = await db.execute(
        select(Payment).where(
            Payment.idempotency_key == idempotency_key
        )
    )
    if existing.scalar_one_or_none():
        return existing  # Return existing result
    
    # Process payment
    payment = Payment(
        idempotency_key=idempotency_key,
        amount=amount,
        status="pending"
    )
    db.add(payment)
    await db.commit()
    return payment
```

### 3. **Soft Deletes**

Keep records for audit trails while making them invisible to normal queries.

```python
class User(Base):
    id: int
    email: str
    deleted_at: Optional[datetime] = None
    
    @hybrid_property
    def is_deleted(self):
        return self.deleted_at is not None

# Query filter
def get_active_users():
    return select(User).where(User.deleted_at.is_(None))
```

### 4. **Audit Fields**

Track creation and modification times.

```python
class BaseModel(Base):
    __abstract__ = True
    
    id: int = Field(primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    
    @event.listens_for(BaseModel, "before_update")
    def receive_before_update(mapper, connection, target):
        target.updated_at = datetime.utcnow()
```

### 5. **Immutable Primary Keys**

Use immutable, stable identifiers.

```python
# ✅ Good: UUID or auto-incrementing integer
class User(Base):
    id: UUID = Field(default_factory=uuid4, primary_key=True)

# ❌ Bad: Email or name as primary key
class User(Base):
    email: str = Field(primary_key=True)  # Can change!
```

## Common Patterns

### 1. **Polymorphic Associations**

Handle different entity types in relationships.

```python
class Event(Base):
    id: int
    event_type: str  # "user_created", "payment_processed"
    entity_type: str  # "User", "Payment"
    entity_id: int
    metadata: JSON
```

### 2. **Versioned Entities**

Track changes over time.

```python
class UserVersion(Base):
    id: int
    user_id: int
    version: int
    data: JSON  # Snapshot of user data
    created_at: datetime

class User(Base):
    id: int
    email: str
    version: int = 1
    
    async def save_with_version(self, db: AsyncSession):
        # Save version before update
        version = UserVersion(
            user_id=self.id,
            version=self.version,
            data=self.to_dict()
        )
        db.add(version)
        self.version += 1
        await db.commit()
```

### 3. **Status State Machines**

Model state transitions explicitly.

```python
from enum import Enum

class OrderStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class Order(Base):
    id: int
    status: OrderStatus = OrderStatus.PENDING
    status_history: List[JSON] = Field(default_factory=list)
    
    def transition_to(self, new_status: OrderStatus):
        valid_transitions = {
            OrderStatus.PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
            OrderStatus.CONFIRMED: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
            # ...
        }
        if new_status not in valid_transitions.get(self.status, []):
            raise ValueError(f"Invalid transition: {self.status} -> {new_status}")
        
        self.status_history.append({
            "from": self.status,
            "to": new_status,
            "at": datetime.utcnow()
        })
        self.status = new_status
```

## Best Practices

### 1. **Use Appropriate Data Types**

```python
# ✅ Good
class User(Base):
    email: EmailStr  # Validated email
    age: int = Field(ge=0, le=150)  # Constrained
    balance: Decimal = Field(decimal_places=2)  # Precise

# ❌ Bad
class User(Base):
    email: str  # No validation
    age: str  # Wrong type
    balance: float  # Precision issues
```

### 2. **Index Strategically**

```python
class User(Base):
    id: int = Field(primary_key=True)
    email: str = Field(index=True, unique=True)  # Frequently queried
    created_at: datetime = Field(index=True)  # Range queries
    status: str = Field(index=True)  # Filtered queries
    
    # Composite index
    __table_args__ = (
        Index('idx_user_status_created', 'status', 'created_at'),
    )
```

### 3. **Handle Relationships Properly**

```python
# One-to-Many
class User(Base):
    id: int
    orders: List["Order"] = relationship("Order", back_populates="user")

class Order(Base):
    id: int
    user_id: int = Field(foreign_key="users.id")
    user: User = relationship("User", back_populates="orders")

# Many-to-Many
order_items = Table(
    'order_items',
    Base.metadata,
    Column('order_id', Integer, ForeignKey('orders.id')),
    Column('item_id', Integer, ForeignKey('items.id'))
)
```

### 4. **Consider Query Patterns**

Design models based on how data is accessed:

```python
# If you always fetch user with profile
class User(Base):
    id: int
    profile: UserProfile = relationship(
        "UserProfile",
        lazy="joined"  # Always fetch together
    )

# If profile is rarely needed
class User(Base):
    id: int
    profile: UserProfile = relationship(
        "UserProfile",
        lazy="select"  # Lazy load when accessed
    )
```

## Summary

Effective data modeling requires:
- ✅ Balancing normalization with performance needs
- ✅ Using idempotency for safe retries
- ✅ Implementing audit trails
- ✅ Choosing appropriate data types
- ✅ Strategic indexing
- ✅ Modeling relationships correctly

