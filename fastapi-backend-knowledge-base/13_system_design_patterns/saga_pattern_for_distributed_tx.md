# Saga Pattern for Distributed Transactions: Complete Guide

Saga pattern manages distributed transactions across multiple services without distributed locks. This guide covers orchestration and choreography approaches with complete implementations.

## Understanding the Saga Pattern

**The problem:**
In microservices, you can't use ACID transactions across services. But you still need consistency.

**The solution:**
Saga pattern - break transaction into steps, each with a compensation action.

**Visual representation:**
```
Order Creation Saga:
    │
    ├─ Step 1: Create Order ✅
    │      │
    ├─ Step 2: Reserve Inventory ✅
    │      │
    ├─ Step 3: Process Payment ❌ (FAILS)
    │      │
    └─ Compensate:
        ├─ Release Inventory ✅ (compensate Step 2)
        └─ Cancel Order ✅ (compensate Step 1)
```

## Step 1: Orchestration Pattern

### Saga Orchestrator

```python
from enum import Enum
from typing import List, Tuple, Optional
from dataclasses import dataclass
from datetime import datetime

class SagaStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    COMPENSATING = "compensating"
    FAILED = "failed"

@dataclass
class SagaStep:
    """Represents a step in the saga."""
    name: str
    execute_func: callable
    compensate_func: callable
    executed: bool = False
    compensated: bool = False
    result: Optional[dict] = None
    error: Optional[str] = None

class OrderSagaOrchestrator:
    """Orchestrates order creation saga across services."""
    
    def __init__(self):
        self.steps: List[SagaStep] = []
        self.status = SagaStatus.PENDING
        self.executed_steps: List[Tuple[str, dict]] = []  # Track for compensation
    
    def add_step(
        self,
        name: str,
        execute_func: callable,
        compensate_func: callable
    ):
        """Add a step to the saga."""
        step = SagaStep(
            name=name,
            execute_func=execute_func,
            compensate_func=compensate_func
        )
        self.steps.append(step)
    
    async def execute(self) -> dict:
        """
        Execute saga steps sequentially.
        
        If any step fails, compensate all completed steps.
        """
        self.status = SagaStatus.IN_PROGRESS
        
        try:
            for step in self.steps:
                logger.info(f"Executing saga step: {step.name}")
                
                # Execute step
                result = await step.execute_func()
                
                step.executed = True
                step.result = result
                self.executed_steps.append((step.name, result))
                
                logger.info(f"Saga step {step.name} completed")
            
            self.status = SagaStatus.COMPLETED
            return {"status": "completed", "steps": self.executed_steps}
        
        except Exception as e:
            logger.error(f"Saga failed at step: {step.name}, error: {e}")
            
            # Start compensation
            self.status = SagaStatus.COMPENSATING
            await self.compensate()
            
            self.status = SagaStatus.FAILED
            raise
    
    async def compensate(self):
        """Compensate all executed steps in reverse order."""
        logger.info("Starting saga compensation")
        
        # Compensate in reverse order
        for step_name, step_result in reversed(self.executed_steps):
            # Find step
            step = next(s for s in self.steps if s.name == step_name)
            
            if not step.compensated:
                try:
                    logger.info(f"Compensating step: {step_name}")
                    await step.compensate_func(step_result)
                    step.compensated = True
                except Exception as e:
                    logger.error(f"Compensation failed for {step_name}: {e}")
                    # Continue compensating other steps
```

## Step 2: Order Creation Saga Implementation

### Complete Saga Example

```python
class OrderCreationSaga(OrderSagaOrchestrator):
    """Complete order creation saga."""
    
    def __init__(
        self,
        order_service,
        inventory_service,
        payment_service,
        order_data: dict
    ):
        super().__init__()
        self.order_service = order_service
        self.inventory_service = inventory_service
        self.payment_service = payment_service
        self.order_data = order_data
    
    async def setup_saga(self):
        """Setup saga steps."""
        
        # Step 1: Create Order
        async def create_order_step():
            order = await self.order_service.create_order(self.order_data)
            return {"order_id": order.id}
        
        async def cancel_order_compensate(result: dict):
            order_id = result["order_id"]
            await self.order_service.cancel_order(order_id)
        
        self.add_step("create_order", create_order_step, cancel_order_compensate)
        
        # Step 2: Reserve Inventory
        async def reserve_inventory_step():
            order_result = self.executed_steps[-1][1]  # Get order from previous step
            order_id = order_result["order_id"]
            
            reservation = await self.inventory_service.reserve_items(
                order_id=order_id,
                items=self.order_data["items"]
            )
            return {"reservation_id": reservation.id, "order_id": order_id}
        
        async def release_inventory_compensate(result: dict):
            reservation_id = result["reservation_id"]
            await self.inventory_service.release_reservation(reservation_id)
        
        self.add_step("reserve_inventory", reserve_inventory_step, release_inventory_compensate)
        
        # Step 3: Process Payment
        async def process_payment_step():
            order_result = next(
                (name, result) for name, result in self.executed_steps
                if name == "create_order"
            )[1]
            order_id = order_result["order_id"]
            
            payment = await self.payment_service.process_payment(
                order_id=order_id,
                amount=self.order_data["total_amount"]
            )
            return {"payment_id": payment.id, "transaction_id": payment.transaction_id}
        
        async def refund_payment_compensate(result: dict):
            payment_id = result["payment_id"]
            await self.payment_service.refund_payment(payment_id)
        
        self.add_step("process_payment", process_payment_step, refund_payment_compensate)
```

## Step 3: Saga State Persistence

### Storing Saga State

```python
from sqlalchemy import Column, Integer, String, JSON, Enum as SQLEnum

class SagaExecution(Base):
    """Store saga execution state for recovery."""
    
    __tablename__ = "saga_executions"
    
    id = Column(Integer, primary_key=True)
    saga_type = Column(String(50), nullable=False, index=True)  # "order_creation"
    saga_id = Column(String(100), unique=True, nullable=False, index=True)
    status = Column(SQLEnum(SagaStatus), nullable=False, index=True)
    executed_steps = Column(JSON, nullable=False)  # List of executed steps
    compensation_data = Column(JSON, nullable=True)  # Data needed for compensation
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

class SagaOrchestratorWithPersistence(OrderSagaOrchestrator):
    """Saga orchestrator with state persistence."""
    
    def __init__(self, db: AsyncSession):
        super().__init__()
        self.db = db
        self.saga_id = str(uuid.uuid4())
        self.saga_type = "order_creation"
    
    async def save_state(self):
        """Save saga execution state."""
        saga_execution = SagaExecution(
            saga_type=self.saga_type,
            saga_id=self.saga_id,
            status=self.status,
            executed_steps=[
                {"name": name, "result": result}
                for name, result in self.executed_steps
            ]
        )
        
        self.db.add(saga_execution)
        await self.db.commit()
    
    async def execute(self) -> dict:
        """Execute with state persistence."""
        await self.save_state()  # Save initial state
        
        try:
            result = await super().execute()
            await self.save_state()  # Save completion
            return result
        except Exception as e:
            await self.save_state()  # Save failure state
            raise
    
    async def compensate(self):
        """Compensate with state persistence."""
        await self.save_state()  # Save compensating state
        await super().compensate()
        await self.save_state()  # Save final state
```

## Step 4: Choreography Pattern

### Event-Driven Saga

```python
# In Order Service
@router.post("/orders")
async def create_order(order_data: OrderCreate):
    """Create order - publishes event."""
    order = await order_service.create_order(order_data.dict())
    
    # Publish event
    await publish_event("order_created", {
        "order_id": order.id,
        "items": order_data.items,
        "total_amount": order_data.total_amount
    })
    
    return {"order_id": order.id}

# In Inventory Service
async def handle_order_created(event: dict):
    """Handle order created event."""
    try:
        reservation = await inventory_service.reserve_items(
            order_id=event["order_id"],
            items=event["items"]
        )
        
        # Publish success event
        await publish_event("inventory_reserved", {
            "order_id": event["order_id"],
            "reservation_id": reservation.id
        })
    
    except InsufficientInventoryError as e:
        # Publish failure event - triggers compensation
        await publish_event("inventory_reservation_failed", {
            "order_id": event["order_id"],
            "error": str(e)
        })

# In Payment Service
async def handle_inventory_reserved(event: dict):
    """Handle inventory reserved event."""
    try:
        payment = await payment_service.process_payment(
            order_id=event["order_id"],
            amount=event["total_amount"]
        )
        
        await publish_event("payment_processed", {
            "order_id": event["order_id"],
            "payment_id": payment.id
        })
    
    except PaymentError as e:
        # Publish failure - triggers compensation
        await publish_event("payment_failed", {
            "order_id": event["order_id"],
            "error": str(e)
        })

# Compensation handlers
async def handle_payment_failed(event: dict):
    """Compensate when payment fails."""
    order_id = event["order_id"]
    
    # Release inventory
    await publish_event("release_inventory", {"order_id": order_id})
    
    # Cancel order
    await publish_event("cancel_order", {"order_id": order_id})
```

## Step 5: Saga Recovery

### Recovering Failed Sagas

```python
class SagaRecoveryService:
    """Recover and complete failed sagas."""
    
    async def recover_failed_sagas(self, db: AsyncSession):
        """Recover sagas that failed mid-execution."""
        # Find sagas that are compensating or failed
        stmt = select(SagaExecution).where(
            SagaExecution.status.in_([SagaStatus.COMPENSATING, SagaStatus.FAILED])
        )
        
        result = await db.execute(stmt)
        failed_sagas = result.scalars().all()
        
        for saga in failed_sagas:
            await self.recover_saga(saga)
    
    async def recover_saga(self, saga: SagaExecution):
        """Recover a specific saga."""
        if saga.status == SagaStatus.COMPENSATING:
            # Complete compensation
            await self.complete_compensation(saga)
        elif saga.status == SagaStatus.FAILED:
            # Retry or complete compensation
            await self.handle_failed_saga(saga)
```

## Summary

Saga pattern provides:
- ✅ Distributed transaction management
- ✅ Compensation for failures
- ✅ No distributed locks needed
- ✅ Eventual consistency

Use saga pattern for distributed transactions across microservices!
