# Event Sourcing vs CRUD: When to Use Each

Event Sourcing stores changes as a sequence of events rather than updating state. This guide explains when to use Event Sourcing versus traditional CRUD.

## Understanding CRUD (Traditional)

**How CRUD works:**
```
Create → INSERT INTO users ...
Read   → SELECT * FROM users ...
Update → UPDATE users SET email = ...
Delete → DELETE FROM users ...
```

**State-based:**
- Store current state
- Updates overwrite previous state
- History is lost

## Understanding Event Sourcing

**How Event Sourcing works:**
```
Instead of: UPDATE users SET email = "new@example.com"
Store event: UserEmailChangedEvent(user_id=1, new_email="new@example.com", timestamp=...)

Current state = Apply all events from beginning
```

**Event-based:**
- Store all events (changes)
- Rebuild state by replaying events
- Complete history preserved

## When to Use Event Sourcing

**✅ Use when:**
- Audit trail critical
- Need to replay/reconstruct state
- Time-travel debugging
- Complex state machines
- Financial/legal requirements

**❌ Don't use when:**
- Simple CRUD operations
- No audit requirements
- Performance is critical
- Team unfamiliar with pattern

## Summary

Choose CRUD for simplicity, Event Sourcing for auditability and state reconstruction!

