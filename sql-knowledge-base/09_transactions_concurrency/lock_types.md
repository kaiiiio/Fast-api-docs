# Lock Types: Row, Table, and Advisory Locks

Understanding database locks is crucial for building concurrent applications. Locks prevent conflicts but can cause deadlocks and performance issues if not managed properly.

## What are Locks?

**Locks** prevent concurrent access to the same data, ensuring data consistency. Different lock types serve different purposes.

## Row-Level Locks

### Shared Lock (Read Lock)

```sql
-- Shared lock: Multiple transactions can read, but not write
BEGIN;
SELECT * FROM accounts WHERE id = 1 FOR SHARE;
-- Other transactions can also SELECT FOR SHARE
-- But cannot UPDATE/DELETE until lock released
COMMIT;
```

### Exclusive Lock (Write Lock)

```sql
-- Exclusive lock: Only one transaction can write
BEGIN;
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;
-- Other transactions cannot SELECT FOR UPDATE or UPDATE
-- Until this transaction commits
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;
```

### FOR UPDATE

```sql
-- Lock row for update
BEGIN;
SELECT * FROM orders WHERE id = 1 FOR UPDATE;
-- Row locked, other transactions wait
UPDATE orders SET status = 'processing' WHERE id = 1;
COMMIT;  -- Lock released
```

### FOR SHARE

```sql
-- Lock row for reading (shared lock)
BEGIN;
SELECT * FROM products WHERE id = 1 FOR SHARE;
-- Other transactions can also FOR SHARE
-- But cannot FOR UPDATE
COMMIT;
```

## Table-Level Locks

### Table Lock Types

```sql
-- Access Share Lock (lightest)
-- Automatically acquired for SELECT
SELECT * FROM users;

-- Row Share Lock
-- Acquired for SELECT FOR UPDATE/SHARE
SELECT * FROM users FOR UPDATE;

-- Exclusive Lock
-- Acquired for UPDATE, DELETE, INSERT
UPDATE users SET name = 'New Name' WHERE id = 1;

-- Access Exclusive Lock (heaviest)
-- Acquired for DROP TABLE, ALTER TABLE
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
```

### Explicit Table Lock

```sql
-- Explicit table lock (PostgreSQL)
BEGIN;
LOCK TABLE users IN EXCLUSIVE MODE;
-- Table locked, other transactions wait
-- Perform operations
COMMIT;  -- Lock released
```

## Real-World Examples

### Example 1: Account Balance Update

```sql
-- Prevent concurrent balance updates
BEGIN;
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;
-- Row locked, other transactions wait

-- Check balance
IF balance >= 100 THEN
    UPDATE accounts SET balance = balance - 100 WHERE id = 1;
END IF;

COMMIT;  -- Lock released
```

### Example 2: Inventory Management

```sql
-- Prevent overselling
BEGIN;
SELECT stock_quantity FROM products WHERE id = 1 FOR UPDATE;

-- Check stock
IF stock_quantity >= 5 THEN
    UPDATE products SET stock_quantity = stock_quantity - 5 WHERE id = 1;
    -- Create order item
    INSERT INTO order_items (order_id, product_id, quantity) VALUES (1, 1, 5);
ELSE
    RAISE EXCEPTION 'Insufficient stock';
END IF;

COMMIT;
```

### Example 3: Preventing Race Conditions

```sql
-- Prevent duplicate processing
BEGIN;
SELECT * FROM tasks WHERE id = 1 FOR UPDATE;

-- Check if already processed
IF status = 'pending' THEN
    UPDATE tasks SET status = 'processing' WHERE id = 1;
    -- Process task
    UPDATE tasks SET status = 'completed' WHERE id = 1;
ELSE
    RAISE EXCEPTION 'Task already processed';
END IF;

COMMIT;
```

## Lock Modes

### PostgreSQL Lock Modes

| Lock Mode | Conflicts With | Use Case |
|-----------|----------------|----------|
| **ACCESS SHARE** | ACCESS EXCLUSIVE | SELECT |
| **ROW SHARE** | EXCLUSIVE, ACCESS EXCLUSIVE | SELECT FOR UPDATE/SHARE |
| **ROW EXCLUSIVE** | SHARE, SHARE ROW EXCLUSIVE, EXCLUSIVE, ACCESS EXCLUSIVE | INSERT, UPDATE, DELETE |
| **SHARE** | ROW EXCLUSIVE, SHARE ROW EXCLUSIVE, EXCLUSIVE, ACCESS EXCLUSIVE | CREATE INDEX |
| **SHARE ROW EXCLUSIVE** | ROW EXCLUSIVE, SHARE ROW EXCLUSIVE, EXCLUSIVE, ACCESS EXCLUSIVE | CREATE UNIQUE INDEX |
| **EXCLUSIVE** | ROW SHARE, ROW EXCLUSIVE, SHARE, SHARE ROW EXCLUSIVE, EXCLUSIVE, ACCESS EXCLUSIVE | ALTER TABLE |
| **ACCESS EXCLUSIVE** | All | DROP TABLE, ALTER TABLE |

## Advisory Locks

### What are Advisory Locks?

**Advisory locks** are application-level locks managed by the database. They don't lock data, but coordinate application logic.

### PostgreSQL Advisory Locks

```sql
-- Acquire advisory lock
SELECT pg_advisory_lock(12345);
-- Lock acquired (blocks other transactions trying to lock same ID)

-- Perform operations
-- ...

-- Release advisory lock
SELECT pg_advisory_unlock(12345);
```

### Use Case: Distributed Locking

```sql
-- Prevent duplicate processing across servers
BEGIN;
SELECT pg_try_advisory_lock(12345);  -- Try to acquire lock
-- Returns true if acquired, false if already locked

-- If lock acquired, process
-- ...

SELECT pg_advisory_unlock(12345);  -- Release lock
COMMIT;
```

## Lock Timeout

### Setting Lock Timeout

```sql
-- Set lock timeout (PostgreSQL)
SET lock_timeout = '5s';

BEGIN;
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;
-- If can't acquire lock within 5s, transaction aborts
```

### Handling Lock Timeouts

```sql
-- Handle lock timeout
BEGIN;
SET lock_timeout = '5s';
BEGIN
    SELECT * FROM accounts WHERE id = 1 FOR UPDATE;
    UPDATE accounts SET balance = balance - 100 WHERE id = 1;
EXCEPTION
    WHEN lock_not_available THEN
        -- Lock timeout, retry or abort
        RAISE EXCEPTION 'Could not acquire lock';
END;
COMMIT;
```

## Monitoring Locks

### Check Current Locks

```sql
-- PostgreSQL: Check locks
SELECT 
    locktype,
    relation::regclass,
    mode,
    granted,
    pid
FROM pg_locks
WHERE relation = 'users'::regclass;
```

### Find Blocking Queries

```sql
-- Find queries waiting for locks
SELECT 
    blocked_locks.pid AS blocked_pid,
    blocking_locks.pid AS blocking_pid,
    blocked_activity.query AS blocked_query,
    blocking_activity.query AS blocking_query
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
WHERE NOT blocked_locks.granted;
```

## Best Practices

1. **Lock Minimally**: Lock only what you need
2. **Lock Briefly**: Release locks quickly
3. **Consistent Order**: Lock in same order to prevent deadlocks
4. **Use Timeouts**: Set lock timeouts
5. **Monitor Locks**: Track lock contention

## Common Mistakes

### ❌ Long-Held Locks

```sql
-- ❌ Bad: Lock held for long time
BEGIN;
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;
-- ... long processing (network call, computation) ...
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;  -- Lock held during entire processing

-- ✅ Good: Lock only during update
BEGIN;
-- Do processing first
-- ...
-- Lock just before update
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;  -- Lock held briefly
```

### ❌ Locking Too Much

```sql
-- ❌ Bad: Lock entire table
LOCK TABLE users IN EXCLUSIVE MODE;
-- Blocks all operations on table

-- ✅ Good: Lock only specific rows
SELECT * FROM users WHERE id = 1 FOR UPDATE;
-- Only locks row 1
```

## Summary

**Lock Types:**

1. **Row-Level**: FOR UPDATE, FOR SHARE
2. **Table-Level**: Various modes for different operations
3. **Advisory Locks**: Application-level coordination
4. **Lock Timeout**: Prevent indefinite waiting
5. **Monitoring**: Track lock contention

**Key Takeaway:**
Locks prevent concurrent access conflicts. Use row-level locks (FOR UPDATE) for data updates, table locks sparingly, and advisory locks for application coordination. Keep locks brief, use timeouts, and monitor lock contention.

**Common Use Cases:**
- Prevent race conditions: `SELECT ... FOR UPDATE`
- Inventory management: Lock before decrement
- Account updates: Lock before balance change

**Next Steps:**
- Learn [Deadlocks](deadlocks.md) for conflict handling
- Study [Isolation Levels](isolation_levels.md) for transaction isolation
- Master [Transaction Control](transaction_control.md) for transaction management

