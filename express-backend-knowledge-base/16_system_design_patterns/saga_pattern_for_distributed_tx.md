# Saga Pattern: Distributed Transactions

Saga pattern manages distributed transactions across multiple services. This guide covers implementing saga pattern in Express.js applications.

## The Problem

**Problem:** Distributed transactions across services are complex. ACID transactions don't work across services.

```javascript
// ❌ Problem: What if payment succeeds but order creation fails?
await paymentService.charge(userId, amount);
await orderService.createOrder(orderData);  // Fails!
// Payment charged but order not created - inconsistent state!
```

## The Solution: Saga Pattern

**Saga Pattern:** Break transaction into steps with compensation actions.

```javascript
// ✅ Solution: Saga with compensation
async function createOrderSaga(orderData) {
    const steps = [];
    
    try {
        // Step 1: Reserve inventory
        const inventory = await inventoryService.reserve(orderData.items);
        steps.push({ type: 'inventory', action: 'release', data: inventory });
        
        // Step 2: Charge payment
        const payment = await paymentService.charge(orderData.userId, orderData.total);
        steps.push({ type: 'payment', action: 'refund', data: payment });
        
        // Step 3: Create order
        const order = await orderService.createOrder(orderData);
        
        return order;
    } catch (error) {
        // Compensate: Rollback in reverse order
        for (let i = steps.length - 1; i >= 0; i--) {
            const step = steps[i];
            if (step.type === 'payment') {
                await paymentService.refund(step.data);
            } else if (step.type === 'inventory') {
                await inventoryService.release(step.data);
            }
        }
        throw error;
    }
}
```

## Real-World Examples

### Example 1: Order Creation Saga

```javascript
class OrderSaga {
    async execute(orderData) {
        const sagaId = require('crypto').randomUUID();
        const steps = [];
        
        try {
            // Step 1: Validate inventory
            const inventory = await this.reserveInventory(orderData.items, sagaId);
            steps.push({ type: 'inventory', sagaId, data: inventory });
            
            // Step 2: Charge payment
            const payment = await this.chargePayment(orderData.userId, orderData.total, sagaId);
            steps.push({ type: 'payment', sagaId, data: payment });
            
            // Step 3: Create order
            const order = await this.createOrder(orderData, sagaId);
            steps.push({ type: 'order', sagaId, data: order });
            
            // Mark saga as completed
            await this.completeSaga(sagaId);
            
            return order;
        } catch (error) {
            // Compensate
            await this.compensate(sagaId, steps);
            throw error;
        }
    }
    
    async reserveInventory(items, sagaId) {
        const result = await inventoryService.reserve(items, sagaId);
        return result;
    }
    
    async chargePayment(userId, amount, sagaId) {
        const result = await paymentService.charge(userId, amount, sagaId);
        return result;
    }
    
    async createOrder(orderData, sagaId) {
        const result = await orderService.create(orderData, sagaId);
        return result;
    }
    
    async compensate(sagaId, steps) {
        // Compensate in reverse order
        for (let i = steps.length - 1; i >= 0; i--) {
            const step = steps[i];
            try {
                if (step.type === 'payment') {
                    await paymentService.refund(step.data.id);
                } else if (step.type === 'inventory') {
                    await inventoryService.release(step.data.id);
                } else if (step.type === 'order') {
                    await orderService.cancel(step.data.id);
                }
            } catch (error) {
                console.error(`Compensation failed for ${step.type}:`, error);
                // Log for manual intervention
            }
        }
    }
}
```

## Best Practices

1. **Idempotent Steps**: Make steps idempotent
2. **Compensation**: Always provide compensation
3. **Saga ID**: Track saga with unique ID
4. **Retry Logic**: Retry failed steps
5. **Monitoring**: Track saga state

## Summary

**Saga Pattern:**

1. **Purpose**: Manage distributed transactions
2. **Pattern**: Steps with compensation actions
3. **Implementation**: Orchestration or choreography
4. **Best Practice**: Idempotent steps, compensation
5. **Use Cases**: Microservices, distributed systems

**Key Takeaway:**
Saga pattern manages distributed transactions across services. Break transaction into steps with compensation actions. Execute steps sequentially. If any step fails, compensate previous steps in reverse order. Make steps idempotent. Track saga with unique ID.

**Saga Strategy:**
- Break into steps
- Provide compensation
- Execute sequentially
- Compensate on failure
- Track with saga ID

**Next Steps:**
- Learn [Event Sourcing](event_sourcing_vs_crud.md) for events
- Study [Outbox Pattern](outbox_pattern_for_transactional_events.md) for reliability
- Master [CQRS](cqrs_for_read_heavy_systems.md) for separation

