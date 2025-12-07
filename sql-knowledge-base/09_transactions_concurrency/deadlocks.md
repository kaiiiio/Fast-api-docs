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

---

## 🎯 Interview Questions: SQL

### Q1: Explain deadlocks in detail, including how they occur, how databases detect and resolve them, and strategies to prevent them. Provide examples showing deadlock scenarios and solutions.

**Answer:**

**Deadlock Definition:**

A deadlock is a situation in a database where two or more transactions are waiting for each other to release locks, creating a circular dependency that prevents any of them from proceeding. Deadlocks are a common concurrency problem that can cause transactions to hang indefinitely if not handled properly.

**How Deadlocks Occur:**

**Circular Lock Dependency:**

Deadlocks occur when transactions acquire locks in different orders, creating a cycle where each transaction waits for a lock held by another transaction.

**Example Scenario:**

**Transaction 1:**
```sql
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;  -- Locks account 1
-- ... processing ...
UPDATE accounts SET balance = balance + 100 WHERE id = 2;  -- Waits for account 2
COMMIT;
```

**Transaction 2:**
```sql
BEGIN;
UPDATE accounts SET balance = balance - 50 WHERE id = 2;   -- Locks account 2
-- ... processing ...
UPDATE accounts SET balance = balance + 50 WHERE id = 1;   -- Waits for account 1
COMMIT;
```

**Deadlock Formation:**

```
Time    Transaction 1              Transaction 2
─────────────────────────────────────────────────────
T1      Locks account 1            -
T2      -                          Locks account 2
T3      Waits for account 2        -
T4      -                          Waits for account 1
T5      ⚠️ DEADLOCK!              ⚠️ DEADLOCK!
        (Circular wait)            (Circular wait)
```

**Visual Representation:**

```
Deadlock Cycle:
    ┌─────────────────┐
    │ Transaction 1   │
    │ Has lock on:    │──┐
    │ Account 1       │  │
    │                 │  │ Waits for
    │ Waits for:      │  │ Account 2
    │ Account 2       │◄─┘
    └─────────────────┘
           ▲
           │
           │ Waits for
           │ Account 1
           │
    ┌──────┴──────────┐
    │ Transaction 2   │
    │ Has lock on:    │
    │ Account 2       │
    │                 │
    │ Waits for:      │
    │ Account 1       │
    └─────────────────┘
    
    Circular dependency = DEADLOCK
```

**How Databases Detect Deadlocks:**

**1. Deadlock Detection Algorithm:**

**Wait-For Graph:**
- Database maintains a wait-for graph
- Nodes represent transactions
- Edges represent "transaction A waits for transaction B"
- Cycle in graph = deadlock detected

**Example:**
```
Wait-For Graph:
T1 ──waits for──> T2
T2 ──waits for──> T1

Cycle detected: DEADLOCK!
```

**2. Detection Process:**

**Periodic Checking:**
```
Every N milliseconds:
1. Build wait-for graph
2. Check for cycles
3. If cycle found:
   - Select victim transaction (usually one that has done less work)
   - Rollback victim transaction
   - Release its locks
   - Allow other transaction to proceed
```

**3. Victim Selection:**

**Criteria:**
- Transaction that has done less work
- Transaction with lower priority
- Transaction that's been waiting longer
- Random selection (if equal)

**How Databases Resolve Deadlocks:**

**Automatic Resolution:**

**PostgreSQL:**
```sql
-- Deadlock detected
ERROR: deadlock detected
DETAIL: Process 12345 waits for ShareLock on transaction 54321; blocked by process 67890.
Process 67890 waits for ShareLock on transaction 12345; blocked by process 12345.
HINT: See server log for query details.
```

**Resolution:**
1. Database detects deadlock
2. Selects victim (usually transaction with less work)
3. Rolls back victim transaction
4. Returns error to application
5. Other transaction proceeds

**Application Handling:**

**Retry Logic:**
```python
import time
from psycopg2.errors import DeadlockDetected

max_retries = 3
for attempt in range(max_retries):
    try:
        # Transaction
        cursor.execute("BEGIN")
        cursor.execute("UPDATE accounts SET balance = balance - 100 WHERE id = 1")
        cursor.execute("UPDATE accounts SET balance = balance + 100 WHERE id = 2")
        cursor.execute("COMMIT")
        break  # Success
    except DeadlockDetected:
        if attempt < max_retries - 1:
            # Exponential backoff
            time.sleep(0.1 * (2 ** attempt))
            continue
        else:
            raise  # Max retries reached
```

**Prevention Strategies:**

**1. Consistent Lock Order:**

**Problem:**
```sql
-- Transaction 1: Locks 1, then 2
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;

-- Transaction 2: Locks 2, then 1 (different order!)
UPDATE accounts SET balance = balance - 50 WHERE id = 2;
UPDATE accounts SET balance = balance + 50 WHERE id = 1;
-- Deadlock possible!
```

**Solution:**
```sql
-- Always lock in same order (e.g., by ID)
-- Transaction 1:
UPDATE accounts SET balance = balance - 100 WHERE id = LEAST(1, 2);  -- Lock smaller ID first
UPDATE accounts SET balance = balance + 100 WHERE id = GREATEST(1, 2);

-- Transaction 2:
UPDATE accounts SET balance = balance - 50 WHERE id = LEAST(2, 1);   -- Same order!
UPDATE accounts SET balance = balance + 50 WHERE id = GREATEST(2, 1);
-- No deadlock: Both lock in ID order
```

**2. Acquire All Locks at Once:**

**Problem:**
```sql
-- Locks acquired one at a time
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
-- ... processing ...
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
-- Window for deadlock between locks
```

**Solution:**
```sql
-- Lock all rows at once
BEGIN;
SELECT * FROM accounts WHERE id IN (1, 2) FOR UPDATE;  -- Lock both immediately
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
-- No window for deadlock
```

**3. Shorter Transactions:**

**Problem:**
```sql
-- Long transaction holds locks longer
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
-- ... long processing (5 seconds) ...
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
-- Locks held for 5 seconds = higher deadlock risk
```

**Solution:**
```sql
-- Short transaction releases locks quickly
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;  -- Quick commit, locks released immediately
-- Lower deadlock risk
```

**4. Lock Timeout:**

**Set Timeout:**
```sql
-- PostgreSQL
SET lock_timeout = '5s';  -- Fail after 5 seconds of waiting

-- MySQL
SET innodb_lock_wait_timeout = 5;  -- Fail after 5 seconds
```

**Benefits:**
- Prevents indefinite waiting
- Fails fast if deadlock likely
- Allows retry with backoff

**5. Lower Isolation Level:**

**Trade-off:**
```sql
-- Higher isolation = more locking = higher deadlock risk
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;  -- Most locking

-- Lower isolation = less locking = lower deadlock risk
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;  -- Less locking
```

**Real-World Example: Account Transfer**

**Vulnerable Code:**
```python
def transfer(from_id, to_id, amount):
    # Transaction 1: Transfer from 1 to 2
    # Transaction 2: Transfer from 2 to 1
    # Different lock orders = deadlock risk
    
    db.execute("BEGIN")
    db.execute("UPDATE accounts SET balance = balance - ? WHERE id = ?", [amount, from_id])
    db.execute("UPDATE accounts SET balance = balance + ? WHERE id = ?", [amount, to_id])
    db.execute("COMMIT")
```

**Deadlock Scenario:**
```
T1: Locks account 1, waits for account 2
T2: Locks account 2, waits for account 1
→ DEADLOCK!
```

**Fixed Code:**
```python
def transfer(from_id, to_id, amount):
    # Always lock in ID order
    first_id = min(from_id, to_id)
    second_id = max(from_id, to_id)
    
    db.execute("BEGIN")
    # Lock in consistent order
    db.execute("SELECT * FROM accounts WHERE id IN (?, ?) FOR UPDATE", [first_id, second_id])
    db.execute("UPDATE accounts SET balance = balance - ? WHERE id = ?", [amount, from_id])
    db.execute("UPDATE accounts SET balance = balance + ? WHERE id = ?", [amount, to_id])
    db.execute("COMMIT")
    # No deadlock: Consistent lock order
```

**Monitoring Deadlocks:**

**PostgreSQL:**
```sql
-- Check deadlock statistics
SELECT 
    datname,
    deadlocks
FROM pg_stat_database
WHERE datname = 'mydb';

-- Check for blocking queries
SELECT 
    blocked_locks.pid AS blocked_pid,
    blocking_locks.pid AS blocking_pid,
    blocked_activity.query AS blocked_query,
    blocking_activity.query AS blocking_query
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity 
    ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks 
    ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity 
    ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

**Best Practices:**

**1. Consistent Lock Order:**
- Always acquire locks in same order
- Use ID-based ordering when possible
- Document lock order in code

**2. Short Transactions:**
- Keep transactions as short as possible
- Do processing outside transactions
- Commit quickly

**3. Retry Logic:**
- Implement retry with exponential backoff
- Handle deadlock errors gracefully
- Log deadlock occurrences

**4. Monitoring:**
- Track deadlock frequency
- Monitor blocking queries
- Set up alerts for high deadlock rates

**System Design Consideration**: Deadlock prevention is crucial for:
1. **Reliability**: Ensuring transactions complete
2. **Performance**: Avoiding transaction hangs
3. **User Experience**: Preventing timeouts
4. **System Stability**: Maintaining database health

Deadlocks are a common concurrency problem that occurs when transactions wait for each other in a circle. Databases automatically detect and resolve deadlocks by rolling back one transaction. Prevention strategies include consistent lock ordering, shorter transactions, acquiring all locks at once, and implementing retry logic. Understanding deadlocks helps you design robust, concurrent database applications.

