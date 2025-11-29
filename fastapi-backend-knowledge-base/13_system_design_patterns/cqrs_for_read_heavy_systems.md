# CQRS for Read-Heavy Systems: Complete Implementation Guide

CQRS (Command Query Responsibility Segregation) separates read and write operations, optimizing each independently. This guide covers comprehensive CQRS implementation for read-heavy systems.

## Understanding CQRS

**What is CQRS?**
Separating read operations (queries) from write operations (commands) into different models and databases.

**Key principle:**
- **Commands**: Change state (writes) - optimized for consistency
- **Queries**: Read data - optimized for performance

**Visual representation:**
```
Write Operations (Commands)
    │
    │ Create Order
    ▼
┌──────────────────┐
│  Write Database  │ (Normalized, ACID)
│  (Write Model)   │
└────────┬─────────┘
         │ Event/Async Update
         ▼
┌──────────────────┐
│  Read Database   │ (Denormalized, Optimized)
│  (Read Model)    │
└──────────────────┘
    │
    │ Query
    ▼
Read Operations (Fast!)
```

## Step 1: Separating Write and Read Models

### Write Model (Normalized)

```python
# app/models/write_models.py
from sqlalchemy import Column, Integer, String, ForeignKey, Numeric
from sqlalchemy.orm import relationship

class Order(Base):
    """Write model - normalized, ACID-compliant."""
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Normalized - reference to items table
    items = relationship("OrderItem", back_populates="order")

class OrderItem(Base):
    """Write model for order items."""
    __tablename__ = "order_items"
    
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    
    order = relationship("Order", back_populates="items")
    product = relationship("Product")
```

### Read Model (Denormalized)

```python
# app/models/read_models.py
from sqlalchemy import Column, Integer, String, JSON, Index

class OrderReadModel(Base):
    """Read model - denormalized for fast queries."""
    __tablename__ = "order_read_models"
    
    id = Column(Integer, primary_key=True)
    
    # Denormalized fields (duplicated for speed)
    user_id = Column(Integer, nullable=False, index=True)
    user_email = Column(String(255), nullable=False, index=True)  # Denormalized
    user_name = Column(String(255))  # Denormalized
    
    status = Column(String(20), nullable=False, index=True)
    total_amount = Column(Numeric(10, 2), nullable=False, index=True)
    
    # Denormalized items (JSON for fast reads)
    items = Column(JSON, nullable=False)  # Full item details
    
    created_at = Column(DateTime, nullable=False, index=True)
    
    # Composite indexes for common queries
    __table_args__ = (
        Index('idx_user_status', 'user_id', 'status'),
        Index('idx_status_created', 'status', 'created_at'),
    )
```

## Step 2: Command Side (Writes)

### Command Service

```python
# app/services/commands/order_command_service.py
from sqlalchemy.ext.asyncio import AsyncSession

class OrderCommandService:
    """Handles write operations (commands)."""
    
    def __init__(self, write_db: AsyncSession):
        self.write_db = write_db
    
    async def create_order(self, order_data: dict) -> Order:
        """
        Create order command.
        
        Writes to normalized write model.
        Read model updated asynchronously.
        """
        # Create order in write database
        order = Order(
            user_id=order_data["user_id"],
            status="pending",
            created_at=datetime.utcnow()
        )
        self.write_db.add(order)
        await self.write_db.flush()  # Get order.id
        
        # Create order items
        for item_data in order_data["items"]:
            order_item = OrderItem(
                order_id=order.id,
                product_id=item_data["product_id"],
                quantity=item_data["quantity"],
                price=item_data["price"]
            )
            self.write_db.add(order_item)
        
        await self.write_db.commit()
        
        # Trigger read model update (async)
        await self._update_read_model(order.id)
        
        return order
    
    async def update_order_status(self, order_id: int, new_status: str):
        """Update order status command."""
        order = await self.write_db.get(Order, order_id)
        if not order:
            raise ValueError(f"Order {order_id} not found")
        
        order.status = new_status
        await self.write_db.commit()
        
        # Update read model
        await self._update_read_model(order_id)
    
    async def _update_read_model(self, order_id: int):
        """Update read model asynchronously."""
        # Trigger background task to update read model
        # This ensures writes are fast
        pass
```

## Step 3: Query Side (Reads)

### Query Service

```python
# app/services/queries/order_query_service.py

class OrderQueryService:
    """Handles read operations (queries) - optimized for performance."""
    
    def __init__(self, read_db: AsyncSession):
        self.read_db = read_db
    
    async def get_order(self, order_id: int) -> dict:
        """
        Get order query.
        
        Reads from optimized read model.
        Much faster than joining normalized tables!
        """
        read_model = await self.read_db.get(OrderReadModel, order_id)
        if not read_model:
            return None
        
        # Already denormalized - no joins needed!
        return {
            "id": read_model.id,
            "user": {
                "id": read_model.user_id,
                "email": read_model.user_email,
                "name": read_model.user_name
            },
            "status": read_model.status,
            "total_amount": float(read_model.total_amount),
            "items": read_model.items,  # Already in JSON format
            "created_at": read_model.created_at.isoformat()
        }
    
    async def get_user_orders(
        self,
        user_id: int,
        status: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> List[dict]:
        """
        Get user orders query.
        
        Optimized with composite index on (user_id, status).
        """
        stmt = select(OrderReadModel).where(
            OrderReadModel.user_id == user_id
        )
        
        if status:
            stmt = stmt.where(OrderReadModel.status == status)
        
        stmt = stmt.order_by(OrderReadModel.created_at.desc())
        stmt = stmt.limit(limit).offset(offset)
        
        result = await self.read_db.execute(stmt)
        orders = result.scalars().all()
        
        return [self._to_dict(order) for order in orders]
    
    async def search_orders(
        self,
        filters: dict,
        sort_by: str = "created_at",
        limit: int = 20
    ) -> List[dict]:
        """Search orders - optimized for read queries."""
        stmt = select(OrderReadModel)
        
        # Apply filters (uses indexes)
        if filters.get("status"):
            stmt = stmt.where(OrderReadModel.status == filters["status"])
        if filters.get("min_amount"):
            stmt = stmt.where(OrderReadModel.total_amount >= filters["min_amount"])
        if filters.get("date_from"):
            stmt = stmt.where(OrderReadModel.created_at >= filters["date_from"])
        
        # Sort (uses indexes)
        if sort_by == "amount":
            stmt = stmt.order_by(OrderReadModel.total_amount.desc())
        else:
            stmt = stmt.order_by(OrderReadModel.created_at.desc())
        
        stmt = stmt.limit(limit)
        
        result = await self.read_db.execute(stmt)
        return [self._to_dict(order) for order in result.scalars().all()]
    
    def _to_dict(self, read_model: OrderReadModel) -> dict:
        """Convert read model to dict."""
        return {
            "id": read_model.id,
            "user_email": read_model.user_email,
            "status": read_model.status,
            "total_amount": float(read_model.total_amount),
            "items": read_model.items,
            "created_at": read_model.created_at.isoformat()
        }
```

## Step 4: Read Model Projection

### Updating Read Model from Write Model

```python
# app/services/projections/order_projection.py

class OrderProjectionService:
    """Projects write model changes to read model."""
    
    def __init__(
        self,
        write_db: AsyncSession,
        read_db: AsyncSession
    ):
        self.write_db = write_db
        self.read_db = read_db
    
    async def project_order(self, order_id: int):
        """
        Project order from write model to read model.
        
        Called after write model changes.
        """
        # Get order from write model (with relationships)
        order = await self.write_db.get(Order, order_id)
        if not order:
            return
        
        # Get user for denormalization
        user = await self.write_db.get(User, order.user_id)
        
        # Calculate total from items
        total_amount = sum(
            float(item.price * item.quantity)
            for item in order.items
        )
        
        # Denormalize items
        items_json = [
            {
                "product_id": item.product_id,
                "product_name": item.product.name,  # Join once, store
                "quantity": item.quantity,
                "price": float(item.price),
                "subtotal": float(item.price * item.quantity)
            }
            for item in order.items
        ]
        
        # Create/update read model
        read_model = OrderReadModel(
            id=order.id,
            user_id=order.user_id,
            user_email=user.email,  # Denormalized
            user_name=user.full_name,  # Denormalized
            status=order.status,
            total_amount=total_amount,
            items=items_json,  # Denormalized
            created_at=order.created_at
        )
        
        # Upsert read model
        await self.read_db.merge(read_model)
        await self.read_db.commit()
```

## Step 5: Event-Driven Projection

### Using Events to Update Read Model

```python
# When order changes, publish event
# Event handler updates read model

@router.post("/orders")
async def create_order(
    order_data: OrderCreate,
    command_service: OrderCommandService = Depends(get_order_command_service)
):
    """Create order - triggers read model update."""
    order = await command_service.create_order(order_data.dict())
    
    # Publish event (async)
    await publish_event("order_created", {"order_id": order.id})
    
    return {"order_id": order.id, "status": "created"}

# Event handler
async def handle_order_created(event: dict):
    """Update read model when order created."""
    order_id = event["order_id"]
    projection_service = OrderProjectionService(write_db, read_db)
    await projection_service.project_order(order_id)
```

## Step 6: FastAPI Integration

### Separate Endpoints for Commands and Queries

```python
# app/api/commands/orders.py
router_commands = APIRouter(prefix="/api/v1/orders", tags=["orders"])

@router_commands.post("/")
async def create_order(
    order_data: OrderCreate,
    command_service: OrderCommandService = Depends(get_order_command_service)
):
    """Command endpoint - creates order."""
    order = await command_service.create_order(order_data.dict())
    return {"order_id": order.id}

# app/api/queries/orders.py
router_queries = APIRouter(prefix="/api/v1/orders", tags=["orders"])

@router_queries.get("/{order_id}")
async def get_order(
    order_id: int,
    query_service: OrderQueryService = Depends(get_order_query_service)
):
    """Query endpoint - reads order."""
    order = await query_service.get_order(order_id)
    if not order:
        raise HTTPException(404, "Order not found")
    return order

@router_queries.get("/")
async def search_orders(
    status: Optional[str] = None,
    min_amount: Optional[float] = None,
    query_service: OrderQueryService = Depends(get_order_query_service)
):
    """Query endpoint - searches orders."""
    filters = {
        "status": status,
        "min_amount": min_amount
    }
    orders = await query_service.search_orders(filters)
    return {"orders": orders}
```

## Benefits of CQRS

1. **Optimized reads**: Denormalized read model = no joins = fast queries
2. **Scalable**: Can scale read and write databases independently
3. **Flexible**: Different databases for reads and writes
4. **Performance**: Reads are much faster

## When to Use CQRS

**✅ Use when:**
- Read-heavy workloads
- Read and write patterns are very different
- Need to scale reads independently
- Complex read queries

**❌ Don't use when:**
- Simple CRUD operations
- Read/write patterns are similar
- Team unfamiliar with pattern

## Summary

CQRS provides:
- ✅ Optimized read performance
- ✅ Independent scaling
- ✅ Flexible data models
- ✅ Better query performance

Implement CQRS for read-heavy systems needing high performance!
