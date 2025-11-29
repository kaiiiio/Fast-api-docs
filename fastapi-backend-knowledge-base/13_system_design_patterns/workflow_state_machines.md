# Workflow State Machines: Complete Implementation Guide

State machines manage complex workflows with clear state transitions, preventing invalid state changes and providing predictable behavior. This guide teaches you how to implement robust state machines in FastAPI applications.

## Understanding State Machines

**What is a state machine?**
A computational model that defines:
- **States**: The possible conditions of a system
- **Transitions**: Rules for moving between states
- **Actions**: What happens during transitions

**Real-world analogy:**
Think of a traffic light:
- **States**: Red, Yellow, Green
- **Transitions**: Red → Green (never Red → Yellow directly!)
- **Actions**: Turn on light, start timer

**Why use state machines?**
- Prevent invalid state transitions
- Make workflow logic explicit
- Easier to reason about system behavior
- Better error handling

## Visual State Machine: Order Processing

```
         [PENDING]
             │
             │ customer confirms
             ▼
      [PROCESSING]
         │      │
         │      │ payment fails
         │      ▼
         │  [CANCELLED] ← terminal
         │
         │ payment succeeds
         ▼
      [PAID]
         │
         │ fulfill order
         ▼
      [SHIPPED]
         │
         │ delivery confirmed
         ▼
      [DELIVERED] ← terminal
```

## Step 1: Define States as Enum

```python
from enum import Enum

class OrderStatus(str, Enum):
    """
    Order status states.
    
    Using string enum allows database storage and JSON serialization.
    """
    PENDING = "pending"           # Order created, awaiting payment
    PROCESSING = "processing"     # Payment being processed
    PAID = "paid"                 # Payment successful
    SHIPPED = "shipped"           # Order shipped to customer
    DELIVERED = "delivered"       # Order delivered (terminal)
    CANCELLED = "cancelled"       # Order cancelled (terminal)
    
    @classmethod
    def get_terminal_states(cls):
        """Get states that cannot transition to other states."""
        return {cls.DELIVERED, cls.CANCELLED}
    
    @classmethod
    def get_active_states(cls):
        """Get states that are still in progress."""
        return {cls.PENDING, cls.PROCESSING, cls.PAID, cls.SHIPPED}
```

## Step 2: Define Valid Transitions

```python
from typing import Dict, Set

class OrderStateMachine:
    """
    Defines valid state transitions for orders.
    
    Transition matrix defines what states can transition to which other states.
    """
    
    # Define valid transitions (from_state -> set of allowed to_states)
    TRANSITIONS: Dict[OrderStatus, Set[OrderStatus]] = {
        OrderStatus.PENDING: {
            OrderStatus.PROCESSING,  # Customer confirms, start payment
            OrderStatus.CANCELLED    # Customer cancels before payment
        },
        OrderStatus.PROCESSING: {
            OrderStatus.PAID,        # Payment succeeds
            OrderStatus.CANCELLED    # Payment fails or timeout
        },
        OrderStatus.PAID: {
            OrderStatus.SHIPPED,     # Order fulfilled and shipped
            OrderStatus.CANCELLED    # Refund requested
        },
        OrderStatus.SHIPPED: {
            OrderStatus.DELIVERED,   # Delivery confirmed
            OrderStatus.CANCELLED    # Return requested
        },
        # Terminal states have no transitions
        OrderStatus.DELIVERED: set(),   # Cannot leave this state
        OrderStatus.CANCELLED: set(),   # Cannot leave this state
    }
    
    @classmethod
    def can_transition(
        cls,
        from_state: OrderStatus,
        to_state: OrderStatus
    ) -> bool:
        """
        Check if transition from one state to another is valid.
        
        Args:
            from_state: Current state
            to_state: Desired new state
        
        Returns:
            True if transition is valid, False otherwise
        """
        allowed_transitions = cls.TRANSITIONS.get(from_state, set())
        return to_state in allowed_transitions
    
    @classmethod
    def get_allowed_transitions(cls, current_state: OrderStatus) -> Set[OrderStatus]:
        """
        Get all states that can be reached from current state.
        
        Useful for UI to show available actions.
        """
        return cls.TRANSITIONS.get(current_state, set())
```

**Understanding the transition matrix:**
- Each state maps to a set of allowed next states
- Empty sets mean terminal states (no transitions)
- Explicit definition prevents invalid transitions

## Step 3: Database Model with State

```python
from sqlalchemy import Column, Integer, String, DateTime, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Order(Base):
    """Order model with state machine."""
    
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False)
    total_amount = Column(Numeric(10, 2), nullable=False)
    
    # State field
    status = Column(
        SQLEnum(OrderStatus),
        default=OrderStatus.PENDING,
        nullable=False,
        index=True  # Index for queries by status
    )
    
    # State change tracking
    status_changed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    status_changed_by = Column(Integer, nullable=True)  # User ID or system
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def can_transition_to(self, new_status: OrderStatus) -> bool:
        """Check if this order can transition to new status."""
        return OrderStateMachine.can_transition(self.status, new_status)
    
    def transition_to(
        self,
        new_status: OrderStatus,
        changed_by: Optional[int] = None
    ):
        """
        Transition order to new status.
        
        Raises:
            ValueError: If transition is invalid
        """
        if not self.can_transition_to(new_status):
            raise ValueError(
                f"Cannot transition order {self.id} from {self.status.value} "
                f"to {new_status.value}. Valid transitions: "
                f"{[s.value for s in OrderStateMachine.get_allowed_transitions(self.status)]}"
            )
        
        # Update state
        old_status = self.status
        self.status = new_status
        self.status_changed_at = datetime.utcnow()
        self.status_changed_by = changed_by
        
        return old_status  # Return previous state for logging
```

## Step 4: State Transition Service

```python
from sqlalchemy.ext.asyncio import AsyncSession
import logging

logger = logging.getLogger(__name__)

class OrderStateService:
    """Service for managing order state transitions."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def transition_order_status(
        self,
        order_id: int,
        new_status: OrderStatus,
        changed_by: Optional[int] = None,
        context: Optional[dict] = None
    ) -> Order:
        """
        Transition order to new status with validation and side effects.
        
        Args:
            order_id: Order to transition
            new_status: Target status
            changed_by: User ID making the change
            context: Additional context for transition
        
        Returns:
            Updated order
        
        Raises:
            ValueError: If transition is invalid
            StateMachineError: If transition fails
        """
        # Load order
        order = await self.db.get(Order, order_id)
        if not order:
            raise ValueError(f"Order {order_id} not found")
        
        old_status = order.status
        
        # Validate transition
        if not order.can_transition_to(new_status):
            raise ValueError(
                f"Invalid transition: {old_status.value} → {new_status.value}"
            )
        
        # Pre-transition hooks (validate business rules)
        await self._before_transition(order, old_status, new_status, context)
        
        try:
            # Perform transition
            order.transition_to(new_status, changed_by=changed_by)
            
            # Commit state change
            await self.db.commit()
            
            # Post-transition hooks (side effects)
            await self._after_transition(order, old_status, new_status, context)
            
            logger.info(
                f"Order {order_id} transitioned: {old_status.value} → {new_status.value}"
            )
            
            return order
        
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to transition order {order_id}: {e}")
            raise
    
    async def _before_transition(
        self,
        order: Order,
        old_status: OrderStatus,
        new_status: OrderStatus,
        context: Optional[dict]
    ):
        """Validate business rules before transition."""
        # Example: Can't ship unpaid order
        if new_status == OrderStatus.SHIPPED:
            if order.status != OrderStatus.PAID:
                raise ValueError("Can only ship paid orders")
        
        # Example: Can't cancel delivered order
        if new_status == OrderStatus.CANCELLED:
            if old_status == OrderStatus.DELIVERED:
                raise ValueError("Cannot cancel delivered order")
    
    async def _after_transition(
        self,
        order: Order,
        old_status: OrderStatus,
        new_status: OrderStatus,
        context: Optional[dict]
    ):
        """Execute side effects after transition."""
        # Send notifications
        if new_status == OrderStatus.SHIPPED:
            await send_shipping_notification(order.id)
        
        if new_status == OrderStatus.DELIVERED:
            await send_delivery_confirmation(order.id)
        
        # Publish events
        await publish_event(
            event_type="order_status_changed",
            event_data={
                "order_id": order.id,
                "old_status": old_status.value,
                "new_status": new_status.value
            }
        )
```

## Step 5: FastAPI Integration

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()

@router.post("/orders/{order_id}/status")
async def update_order_status(
    order_id: int,
    new_status: OrderStatus,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update order status with state machine validation."""
    state_service = OrderStateService(db)
    
    try:
        order = await state_service.transition_order_status(
            order_id=order_id,
            new_status=new_status,
            changed_by=current_user.id
        )
        
        return {
            "order_id": order.id,
            "status": order.status.value,
            "message": f"Order status updated to {new_status.value}"
        }
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/orders/{order_id}/status/available")
async def get_available_statuses(
    order_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get available status transitions for order."""
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    available = OrderStateMachine.get_allowed_transitions(order.status)
    
    return {
        "current_status": order.status.value,
        "available_statuses": [status.value for status in available]
    }
```

## Step 6: State History Tracking

Track state changes over time:

```python
class OrderStatusHistory(Base):
    """Track order status changes over time."""
    
    __tablename__ = "order_status_history"
    
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    from_status = Column(SQLEnum(OrderStatus), nullable=True)  # None for initial
    to_status = Column(SQLEnum(OrderStatus), nullable=False)
    changed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    changed_by = Column(Integer, nullable=True)
    reason = Column(String(500), nullable=True)  # Optional reason

async def transition_with_history(
    order_id: int,
    new_status: OrderStatus,
    reason: Optional[str] = None,
    db: AsyncSession
):
    """Transition with history tracking."""
    order = await db.get(Order, order_id)
    old_status = order.status
    
    # Create history entry
    history = OrderStatusHistory(
        order_id=order_id,
        from_status=old_status,
        to_status=new_status,
        changed_by=current_user.id,
        reason=reason
    )
    db.add(history)
    
    # Perform transition
    order.transition_to(new_status)
    
    await db.commit()
```

## Step 7: State Machine Visualization

Generate state diagram for documentation:

```python
def generate_state_diagram() -> str:
    """Generate Mermaid state diagram."""
    diagram = ["stateDiagram-v2", "    [*] --> PENDING"]
    
    for from_state, to_states in OrderStateMachine.TRANSITIONS.items():
        for to_state in to_states:
            diagram.append(f"    {from_state.value.upper()} --> {to_state.value.upper()}")
        
        if not to_states:  # Terminal state
            diagram.append(f"    {from_state.value.upper()} --> [*]")
    
    return "\n".join(diagram)

# Output:
# stateDiagram-v2
#     [*] --> PENDING
#     PENDING --> PROCESSING
#     PENDING --> CANCELLED
#     PROCESSING --> PAID
#     PROCESSING --> CANCELLED
#     ...
```

## Advanced: Conditional Transitions

Some transitions depend on conditions:

```python
class ConditionalStateMachine(OrderStateMachine):
    """State machine with conditional transitions."""
    
    @classmethod
    def can_transition_conditionally(
        cls,
        order: Order,
        new_status: OrderStatus
    ) -> tuple[bool, Optional[str]]:
        """
        Check if transition is valid with conditions.
        
        Returns:
            (is_valid, reason_if_invalid)
        """
        # Check basic transition validity
        if not cls.can_transition(order.status, new_status):
            return False, f"Invalid transition from {order.status.value}"
        
        # Conditional checks
        if new_status == OrderStatus.SHIPPED:
            if order.total_amount > 1000 and not order.requires_approval:
                return False, "Large orders require approval before shipping"
        
        if new_status == OrderStatus.CANCELLED:
            if order.status == OrderStatus.DELIVERED:
                return False, "Cannot cancel delivered orders"
        
        return True, None
```

## Best Practices

1. **Explicit transitions**: Define all valid transitions clearly
2. **Terminal states**: Mark states that cannot transition
3. **History tracking**: Log all state changes for audit
4. **Validation**: Check business rules before transitions
5. **Side effects**: Handle notifications/events after transitions
6. **Error handling**: Provide clear error messages

## Summary

State machines provide:
- ✅ Explicit workflow definition
- ✅ Invalid transition prevention
- ✅ Predictable behavior
- ✅ Easier debugging and testing

Implement state machines for complex workflows to ensure reliability and clarity!
