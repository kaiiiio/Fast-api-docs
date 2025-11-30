# Isolation Levels: Transaction Isolation Explained

Isolation levels control how transactions interact with each other, preventing issues like dirty reads, non-repeatable reads, and phantom reads.

## What are Isolation Levels?

**Isolation levels** define the degree to which one transaction is isolated from other concurrent transactions. They balance between data consistency and performance.

## ACID Isolation

**Isolation** is one of the ACID properties:
- **Atomicity**: All or nothing
- **Consistency**: Valid state
- **Isolation**: Transactions don't interfere
- **Durability**: Committed changes persist

## Isolation Levels (Lowest to Highest)

### 1. READ UNCOMMITTED (Lowest)

**Behavior:** Transactions can see uncommitted changes from other transactions.

**Issues:**
- ✅ No locks (fastest)
- ❌ Dirty reads possible
- ❌ Non-repeatable reads
- ❌ Phantom reads

**Example:**
```sql
-- Transaction 1
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
-- Not committed yet

-- Transaction 2 (READ UNCOMMITTED)
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
BEGIN;
SELECT balance FROM accounts WHERE id = 1;
-- Sees uncommitted -100 (dirty read!)
```

**Use Case:** Rarely used, mostly for logging/analytics

### 2. READ COMMITTED (Default in PostgreSQL)

**Behavior:** Transactions only see committed changes.

**Issues:**
- ✅ No dirty reads
- ❌ Non-repeatable reads possible
- ❌ Phantom reads possible

**Example:**
```sql
-- Transaction 1
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
-- Not committed

-- Transaction 2 (READ COMMITTED - default)
BEGIN;
SELECT balance FROM accounts WHERE id = 1;
-- Sees old value (no dirty read)

-- Transaction 1 commits
COMMIT;

-- Transaction 2 reads again
SELECT balance FROM accounts WHERE id = 1;
-- Sees new value (non-repeatable read)
```

**Use Case:** Default for most applications

### 3. REPEATABLE READ

**Behavior:** Same data throughout transaction, but new rows can appear.

**Issues:**
- ✅ No dirty reads
- ✅ No non-repeatable reads
- ❌ Phantom reads possible

**Example:**
```sql
-- Transaction 1 (REPEATABLE READ)
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;
SELECT COUNT(*) FROM orders WHERE user_id = 1;
-- Returns 5

-- Transaction 2
BEGIN;
INSERT INTO orders (user_id, total) VALUES (1, 99.99);
COMMIT;

-- Transaction 1 reads again
SELECT COUNT(*) FROM orders WHERE user_id = 1;
-- Still returns 5 (no phantom read in PostgreSQL)
-- But in MySQL, might return 6 (phantom read)
```

**Use Case:** When you need consistent reads within transaction

### 4. SERIALIZABLE (Highest)

**Behavior:** Transactions execute as if serial (one after another).

**Issues:**
- ✅ No dirty reads
- ✅ No non-repeatable reads
- ✅ No phantom reads
- ❌ Slowest (most locking)

**Example:**
```sql
-- Transaction 1 (SERIALIZABLE)
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
SELECT SUM(balance) FROM accounts;

-- Transaction 2 (SERIALIZABLE)
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
UPDATE accounts SET balance = balance + 100 WHERE id = 1;
-- May be blocked or cause serialization error
```

**Use Case:** When absolute consistency is required

## Isolation Level Comparison

| Level | Dirty Reads | Non-Repeatable Reads | Phantom Reads | Performance |
|-------|-------------|---------------------|---------------|-------------|
| **READ UNCOMMITTED** | ✅ Possible | ✅ Possible | ✅ Possible | ⚡ Fastest |
| **READ COMMITTED** | ❌ No | ✅ Possible | ✅ Possible | ⚡ Fast |
| **REPEATABLE READ** | ❌ No | ❌ No | ⚠️ Possible* | 🐌 Slower |
| **SERIALIZABLE** | ❌ No | ❌ No | ❌ No | 🐌 Slowest |

*PostgreSQL prevents phantom reads in REPEATABLE READ

## Setting Isolation Level

### PostgreSQL

```sql
-- Set for current transaction
BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- Set globally
ALTER DATABASE mydb SET default_transaction_isolation = 'read committed';
```

### MySQL

```sql
-- Set for current session
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- Set globally
SET GLOBAL TRANSACTION ISOLATION LEVEL READ COMMITTED;
```

## Real-World Examples

### Example 1: Banking Transaction

**Scenario:** Transfer money between accounts

**Isolation Level:** SERIALIZABLE or REPEATABLE READ

```sql
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;

-- Check balance
SELECT balance FROM accounts WHERE id = 1;
-- Returns 1000

-- Deduct
UPDATE accounts SET balance = balance - 100 WHERE id = 1;

-- Add
UPDATE accounts SET balance = balance + 100 WHERE id = 2;

COMMIT;
```

**Why:** Need consistent balance throughout transaction

### Example 2: Report Generation

**Scenario:** Generate monthly report

**Isolation Level:** READ COMMITTED

```sql
BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;

SELECT 
    DATE_TRUNC('month', created_at) AS month,
    SUM(total) AS revenue
FROM orders
WHERE created_at >= '2024-01-01'
GROUP BY DATE_TRUNC('month', created_at);

COMMIT;
```

**Why:** Can see committed changes, acceptable for reports

### Example 3: User Dashboard

**Scenario:** Display user statistics

**Isolation Level:** READ COMMITTED (default)

```sql
BEGIN;

SELECT 
    COUNT(*) AS order_count,
    SUM(total) AS total_spent
FROM orders
WHERE user_id = 1;

COMMIT;
```

**Why:** Default is sufficient, small inconsistency acceptable

## Choosing Isolation Level

### Use READ COMMITTED When:
- ✅ Default is usually fine
- ✅ Small inconsistencies acceptable
- ✅ Performance is important
- ✅ Most applications

### Use REPEATABLE READ When:
- ✅ Need consistent reads within transaction
- ✅ Calculating totals/balances
- ✅ Can't tolerate non-repeatable reads

### Use SERIALIZABLE When:
- ✅ Absolute consistency required
- ✅ Financial transactions
- ✅ Critical data integrity
- ⚠️ Accept slower performance

### Avoid READ UNCOMMITTED:
- ❌ Almost never use
- ❌ Data integrity issues
- ❌ Only for logging/analytics

## Performance Impact

### Locking Behavior

```sql
-- READ COMMITTED: Row-level locks, released after statement
BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;
SELECT * FROM accounts WHERE id = 1;  -- Lock released after SELECT
UPDATE accounts SET balance = 100 WHERE id = 1;  -- Lock held until commit

-- REPEATABLE READ: Locks held until commit
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;
SELECT * FROM accounts WHERE id = 1;  -- Lock held until commit
```

### Deadlock Risk

```sql
-- Higher isolation = more locking = higher deadlock risk
-- SERIALIZABLE has highest deadlock risk
```

## Best Practices

1. **Start with Default**: READ COMMITTED is usually sufficient
2. **Increase When Needed**: Only increase for specific requirements
3. **Test Performance**: Higher isolation = slower performance
4. **Document Decisions**: Note why specific level chosen
5. **Monitor Deadlocks**: Higher isolation increases deadlock risk

## Summary

**Isolation Levels:**

1. **READ UNCOMMITTED**: Lowest, dirty reads possible
2. **READ COMMITTED**: Default, no dirty reads
3. **REPEATABLE READ**: Consistent reads, no phantoms (PostgreSQL)
4. **SERIALIZABLE**: Highest, absolute consistency

**Key Takeaway:**
Isolation levels balance consistency and performance. Start with READ COMMITTED (default). Increase to REPEATABLE READ for consistent reads, or SERIALIZABLE for absolute consistency. Higher isolation means better consistency but slower performance.

**Decision Guide:**
- Default: READ COMMITTED
- Consistent reads: REPEATABLE READ
- Absolute consistency: SERIALIZABLE
- Avoid: READ UNCOMMITTED

**Next Steps:**
- Learn [ACID Properties](acid_properties.md) for transaction guarantees
- Study [Deadlocks](deadlocks.md) for conflict handling
- Master [Transaction Control](transaction_control.md) for transaction management

