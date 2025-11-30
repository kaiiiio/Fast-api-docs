# Deadlocks: Understanding and Preventing

Deadlocks occur when two or more transactions are waiting for each other to release locks, creating a circular dependency. Understanding deadlocks is crucial for building robust applications.

## What is a Deadlock?

**Deadlock** occurs when:
- Transaction A holds a lock on resource X and waits for resource Y
- Transaction B holds a lock on resource Y and waits for resource X
- Both transactions are blocked, waiting forever

**Result:** Database detects deadlock and aborts one transaction

## Deadlock Example

### Scenario

```sql
-- Transaction 1
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;  -- Locks account 1
-- Waiting for account 2...

-- Transaction 2
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 2;  -- Locks account 2
-- Waiting for account 1...

-- DEADLOCK! Both waiting for each other
```

### Visual Representation

```
Transaction 1          Transaction 2
     │                      │
     ├─ Lock Account 1      ├─ Lock Account 2
     │                      │
     ├─ Wait for Account 2  ├─ Wait for Account 1
     │                      │
     └─ DEADLOCK! ──────────┘
```

## Real-World Deadlock Scenarios

### Scenario 1: Account Transfer

```sql
-- Transaction 1: Transfer from Account 1 to Account 2
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;  -- Locks 1
-- ... processing ...
UPDATE accounts SET balance = balance + 100 WHERE id = 2;  -- Waits for 2

-- Transaction 2: Transfer from Account 2 to Account 1 (opposite direction)
BEGIN;
UPDATE accounts SET balance = balance - 50 WHERE id = 2;  -- Locks 2
-- ... processing ...
UPDATE accounts SET balance = balance + 50 WHERE id = 1;  -- Waits for 1

-- DEADLOCK!
```

**Solution:** Always lock accounts in same order

```sql
-- ✅ Good: Always lock in same order (by ID)
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;  -- Lock 1 first
UPDATE accounts SET balance = balance + 100 WHERE id = 2;  -- Then 2
COMMIT;
```

### Scenario 2: Order Processing

```sql
-- Transaction 1: Process order
BEGIN;
UPDATE orders SET status = 'processing' WHERE id = 1;  -- Locks order 1
UPDATE inventory SET quantity = quantity - 5 WHERE product_id = 10;  -- Waits for product 10

-- Transaction 2: Update inventory
BEGIN;
UPDATE inventory SET quantity = quantity + 10 WHERE product_id = 10;  -- Locks product 10
UPDATE orders SET status = 'completed' WHERE id = 1;  -- Waits for order 1

-- DEADLOCK!
```

## Deadlock Detection

### PostgreSQL

```sql
-- Deadlock detected automatically
ERROR: deadlock detected
DETAIL: Process 12345 waits for ShareLock on transaction 67890; blocked by process 11111.
Process 11111 waits for ShareLock on transaction 67890; blocked by process 12345.
HINT: See server log for query details.
```

### MySQL

```sql
-- Deadlock detected
ERROR 1213 (40001): Deadlock found when trying to get lock; try restarting transaction
```

## Preventing Deadlocks

### Strategy 1: Consistent Lock Order

```sql
-- ✅ Good: Always lock in same order
-- Lock accounts by ID (ascending)
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;

-- Even if transferring from 2 to 1, lock 1 first, then 2
BEGIN;
UPDATE accounts SET balance = balance - 50 WHERE id = 1;  -- Lock 1 first
UPDATE accounts SET balance = balance + 50 WHERE id = 2;  -- Then 2
COMMIT;
```

### Strategy 2: Lock Timeout

```sql
-- Set lock timeout (PostgreSQL)
SET lock_timeout = '5s';

BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
-- If can't get lock within 5s, transaction aborts
```

### Strategy 3: Retry Logic

```python
# Application-level retry
max_retries = 3
for attempt in range(max_retries):
    try:
        # Execute transaction
        db.execute("BEGIN")
        db.execute("UPDATE accounts SET balance = balance - 100 WHERE id = 1")
        db.execute("UPDATE accounts SET balance = balance + 100 WHERE id = 2")
        db.execute("COMMIT")
        break  # Success
    except DeadlockError:
        if attempt < max_retries - 1:
            sleep(0.1 * (2 ** attempt))  # Exponential backoff
            continue
        else:
            raise  # Max retries reached
```

### Strategy 4: Shorter Transactions

```sql
-- ✅ Good: Short transaction
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;  -- Quick commit

-- ❌ Bad: Long transaction
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
-- ... long processing ...
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;  -- Long lock duration
```

### Strategy 5: Use SELECT FOR UPDATE

```sql
-- Lock rows explicitly
BEGIN;
SELECT * FROM accounts WHERE id IN (1, 2) FOR UPDATE;  -- Lock both
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
```

## Monitoring Deadlocks

### PostgreSQL

```sql
-- Check deadlock statistics
SELECT * FROM pg_stat_database WHERE datname = 'mydb';

-- Check for blocking queries
SELECT 
    blocked_locks.pid AS blocked_pid,
    blocking_locks.pid AS blocking_pid,
    blocked_activity.query AS blocked_query,
    blocking_activity.query AS blocking_query
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

### MySQL

```sql
-- Check for deadlocks
SHOW ENGINE INNODB STATUS;

-- Check for blocking
SELECT * FROM information_schema.INNODB_LOCKS;
```

## Best Practices

1. **Consistent Lock Order**: Always lock in same order
2. **Short Transactions**: Reduce lock duration
3. **Retry Logic**: Handle deadlocks gracefully
4. **Lock Timeout**: Set reasonable timeouts
5. **Monitor**: Track deadlock frequency

## Common Patterns

### Pattern 1: Account Transfer

```sql
-- Always lock in ID order
BEGIN;
-- Lock smaller ID first
UPDATE accounts SET balance = balance - 100 
WHERE id = LEAST(:from_id, :to_id);
UPDATE accounts SET balance = balance + 100 
WHERE id = GREATEST(:from_id, :to_id);
COMMIT;
```

### Pattern 2: Batch Updates

```sql
-- Lock all rows at once
BEGIN;
SELECT * FROM accounts WHERE id IN (1, 2, 3) FOR UPDATE;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance - 100 WHERE id = 2;
UPDATE accounts SET balance = balance - 100 WHERE id = 3;
COMMIT;
```

## Summary

**Deadlocks:**

1. **Cause**: Circular lock dependencies
2. **Detection**: Automatic by database
3. **Prevention**: Consistent lock order, short transactions
4. **Handling**: Retry logic, lock timeouts
5. **Monitoring**: Track deadlock statistics

**Key Takeaway:**
Deadlocks occur when transactions wait for each other in a circle. Prevent by locking resources in consistent order, keeping transactions short, and implementing retry logic. Databases detect and abort deadlocked transactions automatically.

**Prevention Strategies:**
- Consistent lock order
- Short transactions
- Retry logic
- Lock timeouts
- Explicit locking (SELECT FOR UPDATE)

**Next Steps:**
- Learn [Isolation Levels](isolation_levels.md) for transaction isolation
- Study [Lock Types](lock_types.md) for lock understanding
- Master [Transaction Control](transaction_control.md) for transaction management

