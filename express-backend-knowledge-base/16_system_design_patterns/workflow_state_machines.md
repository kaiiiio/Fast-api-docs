# Workflow State Machines: Managing Complex Workflows

State machines manage complex workflows with defined states and transitions. This guide covers implementing state machines in Express.js applications.

## What is a State Machine?

**State Machine:** System with defined states and valid transitions between states.

```javascript
// Order states
const ORDER_STATES = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled'
};

// Valid transitions
const TRANSITIONS = {
    [ORDER_STATES.PENDING]: [ORDER_STATES.PROCESSING, ORDER_STATES.CANCELLED],
    [ORDER_STATES.PROCESSING]: [ORDER_STATES.SHIPPED, ORDER_STATES.CANCELLED],
    [ORDER_STATES.SHIPPED]: [ORDER_STATES.DELIVERED],
    [ORDER_STATES.DELIVERED]: [],  // Terminal state
    [ORDER_STATES.CANCELLED]: []   // Terminal state
};
```

## Implementation

### State Machine Class

```javascript
class StateMachine {
    constructor(initialState, transitions) {
        this.currentState = initialState;
        this.transitions = transitions;
    }
    
    canTransition(toState) {
        const validTransitions = this.transitions[this.currentState] || [];
        return validTransitions.includes(toState);
    }
    
    transition(toState) {
        if (!this.canTransition(toState)) {
            throw new Error(`Invalid transition from ${this.currentState} to ${toState}`);
        }
        this.currentState = toState;
    }
    
    getState() {
        return this.currentState;
    }
}
```

## Real-World Examples

### Example 1: Order State Machine

```javascript
const OrderStateMachine = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled'
};

const ORDER_TRANSITIONS = {
    [OrderStateMachine.PENDING]: [OrderStateMachine.PROCESSING, OrderStateMachine.CANCELLED],
    [OrderStateMachine.PROCESSING]: [OrderStateMachine.SHIPPED, OrderStateMachine.CANCELLED],
    [OrderStateMachine.SHIPPED]: [OrderStateMachine.DELIVERED],
    [OrderStateMachine.DELIVERED]: [],
    [OrderStateMachine.CANCELLED]: []
};

class OrderService {
    async updateOrderStatus(orderId, newStatus) {
        const order = await Order.findByPk(orderId);
        
        // Validate transition
        const validTransitions = ORDER_TRANSITIONS[order.status] || [];
        if (!validTransitions.includes(newStatus)) {
            throw new Error(`Invalid transition from ${order.status} to ${newStatus}`);
        }
        
        // Update status
        order.status = newStatus;
        await order.save();
        
        // Trigger state-specific actions
        await this.handleStateChange(order, newStatus);
        
        return order;
    }
    
    async handleStateChange(order, newStatus) {
        if (newStatus === OrderStateMachine.SHIPPED) {
            await this.sendShippingNotification(order);
        } else if (newStatus === OrderStateMachine.DELIVERED) {
            await this.sendDeliveryNotification(order);
        }
    }
}
```

## Best Practices

1. **Define States**: Clear state definitions
2. **Validate Transitions**: Check valid transitions
3. **State Actions**: Trigger actions on state changes
4. **Persistence**: Store state in database
5. **Audit**: Log state transitions

## Summary

**Workflow State Machines:**

1. **Purpose**: Manage complex workflows
2. **Pattern**: States and transitions
3. **Implementation**: Validate transitions, trigger actions
4. **Best Practice**: Define states, validate, persist
5. **Use Cases**: Orders, approvals, workflows

**Key Takeaway:**
State machines manage complex workflows with defined states and transitions. Define all possible states. Define valid transitions between states. Validate transitions before allowing them. Trigger actions on state changes. Persist state in database and log transitions.

**State Machine Strategy:**
- Define states clearly
- Define valid transitions
- Validate transitions
- Trigger actions
- Persist and audit

**Next Steps:**
- Learn [Event Sourcing](event_sourcing_vs_crud.md) for events
- Study [Saga Pattern](saga_pattern_for_distributed_tx.md) for transactions
- Master [CQRS](cqrs_for_read_heavy_systems.md) for separation

