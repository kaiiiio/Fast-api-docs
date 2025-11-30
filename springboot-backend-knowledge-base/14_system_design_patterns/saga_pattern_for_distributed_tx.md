# Saga Pattern for Distributed Transactions

## 1. The Problem

Microservices don't share a database. You can't use `@Transactional` across services.
**Scenario**: "Book Trip"
1.  Book Flight (Service A)
2.  Book Hotel (Service B)
3.  Charge Card (Service C)

If Service C fails, you must **Undo** A and B.

---

## 2. Choreography (Event Driven)

Services talk to each other via Events.

1.  Order Service: `OrderCreated` -> Publishes Event.
2.  Inventory Service: Listens `OrderCreated`. Reserves stock. Publishes `StockReserved`.
3.  Payment Service: Listens `StockReserved`. Charges card. Fails! Publishes `PaymentFailed`.
4.  Inventory Service: Listens `PaymentFailed`. **Compensating Transaction** (Release stock).
5.  Order Service: Listens `PaymentFailed`. Cancels Order.

**Pros**: Decoupled.
**Cons**: Hard to visualize flow. Cyclic dependencies.

---

## 3. Orchestration (Central Coordinator)

A central "Saga Orchestrator" tells services what to do.

```java
public class OrderSaga {
    
    public void processOrder(Order order) {
        try {
            inventoryClient.reserve(order);
            paymentClient.charge(order);
            shippingClient.ship(order);
        } catch (Exception e) {
            // Rollback
            paymentClient.refund(order);
            inventoryClient.release(order);
            orderRepository.updateStatus(FAILED);
        }
    }
}
```

**Pros**: Clear logic.
**Cons**: Single point of failure (The Orchestrator).
