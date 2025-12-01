# Event Sourcing vs CRUD

## 1. CRUD (Create, Read, Update, Delete)

Current state is stored.
`Balance: $100`.
You don't know *how* it got there. Was it one deposit of $100? Or $200 deposit and $100 withdrawal?

---

## 2. Event Sourcing

Store the **Events**, not the State.
1.  `AccountOpened`
2.  `Deposited($200)`
3.  `Withdrawn($100)`

**Current State** = Sum of all events.

---

## 3. Implementation (Axon Framework)

Spring ecosystem uses **Axon**.

```java
@Aggregate
public class BankAccount {

    @AggregateIdentifier
    private String id;
    private int balance;

    @CommandHandler
    public BankAccount(CreateAccountCommand cmd) {
        apply(new AccountCreatedEvent(cmd.id));
    }

    @EventSourcingHandler
    public void on(AccountCreatedEvent event) {
        this.id = event.id;
        this.balance = 0;
    }
    
    @CommandHandler
    public void handle(DepositCommand cmd) {
        apply(new MoneyDepositedEvent(this.id, cmd.amount));
    }
    
    @EventSourcingHandler
    public void on(MoneyDepositedEvent event) {
        this.balance += event.amount;
    }
}
```

**Pros**:
- Audit Trail is built-in.
- Time Travel (What was the balance last Tuesday?).

**Cons**:
- Hard to query ("Find all accounts with > $100"). You need CQRS (Projections).
- Snapshots needed for performance (Don't replay 1 million events).
