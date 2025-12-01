# Workflow State Machines (Spring Statemachine)

## 1. The "Boolean Flag" Hell

`isPaid`, `isShipped`, `isCancelled`, `isReturned`.
Logic becomes: `if (isPaid && !isShipped && !isCancelled) ...`

Use a **State Machine**.
States: `CREATED` -> `PAID` -> `SHIPPED` -> `COMPLETED`.

---

## 2. Spring Statemachine

```java
@Configuration
@EnableStateMachineFactory
public class StateMachineConfig extends EnumStateMachineConfigurerAdapter<OrderState, OrderEvent> {

    @Override
    public void configure(StateMachineTransitionConfigurer<OrderState, OrderEvent> transitions) 
            throws Exception {
        transitions
            .withExternal()
                .source(OrderState.CREATED).target(OrderState.PAID)
                .event(OrderEvent.PAY)
                .and()
            .withExternal()
                .source(OrderState.PAID).target(OrderState.SHIPPED)
                .event(OrderEvent.SHIP);
    }
}
```

---

## 3. Usage

```java
@Service
public class OrderService {

    @Autowired
    private StateMachineFactory<OrderState, OrderEvent> factory;

    public void pay(Long orderId) {
        StateMachine<OrderState, OrderEvent> sm = factory.getStateMachine(orderId.toString());
        sm.start();
        
        // Send Event
        boolean accepted = sm.sendEvent(OrderEvent.PAY);
        
        if (!accepted) {
            throw new IllegalStateException("Cannot pay in current state: " + sm.getState().getId());
        }
    }
}
```

**Benefit**: It guarantees valid transitions. You cannot SHIP an order before it is PAID.
