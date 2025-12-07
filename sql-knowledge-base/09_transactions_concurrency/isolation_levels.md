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

---

## 🎯 Interview Questions: SQL

### Q1: Explain the four SQL isolation levels (READ UNCOMMITTED, READ COMMITTED, REPEATABLE READ, SERIALIZABLE) in detail. Describe the concurrency problems each level prevents (dirty reads, non-repeatable reads, phantom reads) and provide practical examples showing when each isolation level is appropriate.

**Answer:**

**Isolation Levels Overview:**

Isolation is one of the ACID properties that determines how transactions interact with each other when accessing the same data concurrently. Different isolation levels provide different guarantees about what one transaction can see of another transaction's uncommitted or committed changes. The trade-off is between data consistency and performance—higher isolation provides better consistency but can reduce concurrency and performance.

**The Four Isolation Levels:**

**1. READ UNCOMMITTED (Lowest Isolation):**

**Definition:** The lowest isolation level where transactions can read uncommitted data from other transactions. This level provides no isolation guarantees and allows all concurrency problems.

**What It Allows:**
- **Dirty Reads**: Can read uncommitted changes
- **Non-Repeatable Reads**: Possible
- **Phantom Reads**: Possible
- **Lost Updates**: Possible

**Example:**
```sql
-- Transaction 1
BEGIN TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
UPDATE accounts SET balance = balance - 1000 WHERE id = 1;
-- Balance changed but not committed yet

-- Transaction 2 (can see uncommitted change)
BEGIN TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
SELECT balance FROM accounts WHERE id = 1;
-- Sees: balance = 4000 (sees Transaction 1's uncommitted change!)
-- If Transaction 1 rolls back, this was a dirty read
```

**When to Use:**
- Almost never in production
- Only for logging/analytics where accuracy isn't critical
- Systems where performance is more important than correctness

**2. READ COMMITTED (Default in Most Databases):**

**Definition:** Transactions can only read data that has been committed by other transactions. This prevents dirty reads but allows non-repeatable reads and phantom reads.

**What It Prevents:**
- ✅ **Dirty Reads**: Cannot read uncommitted data

**What It Allows:**
- ❌ **Non-Repeatable Reads**: Possible (same query returns different results)
- ❌ **Phantom Reads**: Possible (new rows appear in repeated queries)

**Example - Non-Repeatable Read:**
```sql
-- Transaction 1
BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;
SELECT balance FROM accounts WHERE id = 1;
-- Returns: 5000
-- ... do some processing ...

SELECT balance FROM accounts WHERE id = 1;
-- Returns: 4000 (Transaction 2 committed a change)
-- Non-repeatable read: Same query, different result!
COMMIT;
```

**Example - Phantom Read:**
```sql
-- Transaction 1
BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;
SELECT COUNT(*) FROM orders WHERE user_id = 1;
-- Returns: 5 orders

-- Transaction 2 commits a new order for user 1

SELECT COUNT(*) FROM orders WHERE user_id = 1;
-- Returns: 6 orders (phantom row appeared!)
-- Phantom read: New row appeared in repeated query
COMMIT;
```

**When to Use:**
- **Default choice** for most applications
- When small inconsistencies are acceptable
- When performance is important
- Most web applications, APIs, CRUD operations

**3. REPEATABLE READ:**

**Definition:** Transactions see a consistent snapshot of data throughout the transaction. Once a row is read, it cannot change until the transaction commits. This prevents dirty reads and non-repeatable reads, but phantom reads are still possible (except in PostgreSQL where REPEATABLE READ also prevents phantoms).

**What It Prevents:**
- ✅ **Dirty Reads**: Cannot read uncommitted data
- ✅ **Non-Repeatable Reads**: Rows read once cannot change

**What It Allows:**
- ❌ **Phantom Reads**: Possible (in most databases, but not PostgreSQL)

**Example:**
```sql
-- Transaction 1
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;
SELECT balance FROM accounts WHERE id = 1;
-- Returns: 5000
-- Takes a snapshot of this row

-- Transaction 2 tries to update
BEGIN;
UPDATE accounts SET balance = 4000 WHERE id = 1;
-- Blocked! Transaction 1 has a lock on this row
COMMIT;

-- Transaction 1 reads again
SELECT balance FROM accounts WHERE id = 1;
-- Still returns: 5000 (consistent with first read)
-- Non-repeatable read prevented!
COMMIT;
```

**When to Use:**
- When you need consistent reads within a transaction
- Calculating totals, balances, or aggregations
- When non-repeatable reads would cause problems
- Financial calculations that span multiple queries

**4. SERIALIZABLE (Highest Isolation):**

**Definition:** The highest isolation level that ensures transactions execute as if they were running serially (one after another), even though they may run concurrently. This prevents all concurrency problems but can significantly impact performance.

**What It Prevents:**
- ✅ **Dirty Reads**: Cannot read uncommitted data
- ✅ **Non-Repeatable Reads**: Rows cannot change
- ✅ **Phantom Reads**: New rows cannot appear
- ✅ **Lost Updates**: All update conflicts are prevented

**How It Works:**
- Uses strict locking or optimistic concurrency control
- May serialize transactions that would otherwise run in parallel
- Highest consistency, lowest concurrency

**Example:**
```sql
-- Transaction 1
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
SELECT SUM(balance) FROM accounts WHERE type = 'checking';
-- Locks all checking accounts (or uses predicate locking)

-- Transaction 2 tries to insert
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
INSERT INTO accounts (type, balance) VALUES ('checking', 1000);
-- May be blocked or cause serialization error
-- Prevents phantom read
COMMIT;

-- Transaction 1 reads again
SELECT SUM(balance) FROM accounts WHERE type = 'checking';
-- Same result (no phantoms)
COMMIT;
```

**When to Use:**
- Financial transactions where absolute consistency is required
- Critical business logic where any inconsistency is unacceptable
- When you can accept slower performance for correctness
- Systems where data integrity is paramount

**Concurrency Problems Explained:**

**1. Dirty Read:**

Reading uncommitted data that may be rolled back.

**Example:**
```
Transaction 1:                    Transaction 2:
BEGIN;                            BEGIN;
UPDATE accounts                   SELECT balance
SET balance = 4000                FROM accounts
WHERE id = 1;                     WHERE id = 1;
(Not committed)                   -- Sees: 4000 (dirty read!)
                                  -- If T1 rolls back, this is wrong data
ROLLBACK;                         
                                  COMMIT;
```

**2. Non-Repeatable Read:**

The same query returns different results within a transaction because another transaction committed changes.

**Example:**
```
Transaction 1:                    Transaction 2:
BEGIN;                            BEGIN;
SELECT balance                    UPDATE accounts
FROM accounts                     SET balance = 4000
WHERE id = 1;                     WHERE id = 1;
-- Returns: 5000                   COMMIT;

                                  (T2 committed)

SELECT balance
FROM accounts
WHERE id = 1;
-- Returns: 4000 (different!)
-- Non-repeatable read!
COMMIT;
```

**3. Phantom Read:**

New rows appear in repeated queries within a transaction because another transaction inserted rows.

**Example:**
```
Transaction 1:                    Transaction 2:
BEGIN;                            BEGIN;
SELECT COUNT(*)                   INSERT INTO orders
FROM orders                       (user_id, total)
WHERE user_id = 1;                VALUES (1, 100);
-- Returns: 5                      COMMIT;

                                  (T2 committed)

SELECT COUNT(*)
FROM orders
WHERE user_id = 1;
-- Returns: 6 (new row appeared!)
-- Phantom read!
COMMIT;
```

**Visual Comparison:**

```
Isolation Level          Dirty  Non-Repeatable  Phantom
                        Reads      Reads        Reads
───────────────────────────────────────────────────────
READ UNCOMMITTED         ❌          ❌           ❌
READ COMMITTED           ✅          ❌           ❌
REPEATABLE READ          ✅          ✅           ❌*
SERIALIZABLE             ✅          ✅           ✅

* PostgreSQL REPEATABLE READ also prevents phantoms
```

**Practical Examples:**

**Example 1: E-commerce Order Processing (READ COMMITTED)**

```sql
-- Appropriate: READ COMMITTED
BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- Check inventory
SELECT stock FROM products WHERE id = 123;
-- Returns: 10

-- Another transaction might sell some, but that's OK
-- We'll check again when we actually reserve

-- Reserve item
UPDATE products SET stock = stock - 1 WHERE id = 123 AND stock > 0;

COMMIT;
-- Small inconsistency acceptable, performance important
```

**Example 2: Financial Balance Calculation (REPEATABLE READ)**

```sql
-- Appropriate: REPEATABLE READ
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;

-- Get starting balance
SELECT balance FROM accounts WHERE id = 1;
-- Returns: 5000

-- Calculate interest (takes time)
-- ... complex calculation ...

-- Get balance again (must be same!)
SELECT balance FROM accounts WHERE id = 1;
-- Still: 5000 (consistent)
-- Non-repeatable read would break calculation

COMMIT;
```

**Example 3: Bank Transfer (SERIALIZABLE)**

```sql
-- Appropriate: SERIALIZABLE
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- Check both accounts exist and have sufficient funds
SELECT balance FROM accounts WHERE id IN (1, 2);
-- Must be consistent throughout transaction

-- Transfer
UPDATE accounts SET balance = balance - 1000 WHERE id = 1;
UPDATE accounts SET balance = balance + 1000 WHERE id = 2;

COMMIT;
-- Absolute consistency required, performance less critical
```

**Performance Impact:**

**Locking Behavior:**

```
READ COMMITTED:
- Locks released after each statement
- High concurrency
- Fast performance

REPEATABLE READ:
- Locks held until commit
- Medium concurrency
- Moderate performance

SERIALIZABLE:
- Strictest locking
- Low concurrency
- Slower performance
- May serialize transactions
```

**System Design Consideration**: Choosing the right isolation level is crucial for:
1. **Data Consistency**: Ensuring data integrity matches business requirements
2. **Performance**: Balancing consistency with performance needs
3. **Concurrency**: Allowing multiple transactions to proceed efficiently
4. **Correctness**: Preventing data corruption and inconsistencies

Isolation levels provide a spectrum of consistency guarantees. READ COMMITTED is the default and sufficient for most applications. Increase to REPEATABLE READ when you need consistent reads, or SERIALIZABLE when absolute consistency is required. Understanding the concurrency problems each level prevents helps you choose the right isolation level for your use case.

---

### Q2: Explain how different isolation levels are implemented using locking mechanisms. Describe the difference between shared locks, exclusive locks, and how they prevent concurrency problems. Provide examples of how lock conflicts occur and how databases resolve them.

**Answer:**

**Locking Mechanisms for Isolation:**

Isolation levels are implemented using various locking strategies that control when and how transactions can access data. Locks prevent concurrent transactions from interfering with each other, ensuring data consistency at the chosen isolation level.

**Types of Locks:**

**1. Shared Locks (Read Locks):**

**Definition:** Shared locks allow multiple transactions to read the same data simultaneously. They prevent other transactions from modifying the data while it's being read, but allow other transactions to also acquire shared locks for reading.

**Characteristics:**
- Multiple transactions can hold shared locks on the same resource
- Prevents exclusive locks (writes) while shared lock exists
- Allows other shared locks (reads)
- Released when transaction completes (varies by isolation level)

**Example:**
```sql
-- Transaction 1
BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;
SELECT balance FROM accounts WHERE id = 1;
-- Acquires shared lock on row
-- Lock released after SELECT completes (READ COMMITTED)

-- Transaction 2 (can also read)
BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;
SELECT balance FROM accounts WHERE id = 1;
-- Also acquires shared lock
-- Both can read simultaneously
COMMIT;
```

**2. Exclusive Locks (Write Locks):**

**Definition:** Exclusive locks prevent any other transaction from reading or writing the locked data. Only one transaction can hold an exclusive lock on a resource at a time.

**Characteristics:**
- Only one transaction can hold exclusive lock
- Prevents both shared and exclusive locks from other transactions
- Required for INSERT, UPDATE, DELETE
- Held until transaction commits or rolls back

**Example:**
```sql
-- Transaction 1
BEGIN;
UPDATE accounts SET balance = 4000 WHERE id = 1;
-- Acquires exclusive lock on row
-- Lock held until COMMIT

-- Transaction 2 (blocked)
BEGIN;
SELECT balance FROM accounts WHERE id = 1;
-- Waits for Transaction 1's exclusive lock
-- Blocked until Transaction 1 commits
```

**Lock Compatibility Matrix:**

```
            Shared Lock    Exclusive Lock
Shared          ✅              ❌
Exclusive       ❌              ❌

✅ = Compatible (can coexist)
❌ = Incompatible (one must wait)
```

**How Isolation Levels Use Locks:**

**1. READ COMMITTED Locking:**

**Lock Behavior:**
- **Read Operations**: Acquire shared lock, release immediately after read
- **Write Operations**: Acquire exclusive lock, hold until commit
- **Lock Duration**: Very short for reads, until commit for writes

**Example:**
```sql
-- Transaction 1
BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;
SELECT balance FROM accounts WHERE id = 1;
-- Shared lock acquired
-- Shared lock released immediately after SELECT
-- Row can now be modified by other transactions

-- Transaction 2 (can proceed immediately)
BEGIN;
UPDATE accounts SET balance = 4000 WHERE id = 1;
-- Exclusive lock acquired (no shared lock blocking it)
COMMIT;

-- Transaction 1 reads again
SELECT balance FROM accounts WHERE id = 1;
-- Sees new value: 4000 (non-repeatable read allowed)
COMMIT;
```

**2. REPEATABLE READ Locking:**

**Lock Behavior:**
- **Read Operations**: Acquire shared lock, hold until commit
- **Write Operations**: Acquire exclusive lock, hold until commit
- **Lock Duration**: Until transaction commits for both reads and writes

**Example:**
```sql
-- Transaction 1
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;
SELECT balance FROM accounts WHERE id = 1;
-- Shared lock acquired
-- Shared lock held until COMMIT
-- Row cannot be modified by other transactions

-- Transaction 2 (blocked)
BEGIN;
UPDATE accounts SET balance = 4000 WHERE id = 1;
-- Tries to acquire exclusive lock
-- Blocked! Transaction 1 holds shared lock
-- Must wait until Transaction 1 commits

-- Transaction 1 reads again
SELECT balance FROM accounts WHERE id = 1;
-- Still sees: 5000 (consistent, lock prevented change)
COMMIT;  -- Releases shared lock

-- Transaction 2 can now proceed
-- Exclusive lock acquired
UPDATE accounts SET balance = 4000 WHERE id = 1;
COMMIT;
```

**3. SERIALIZABLE Locking:**

**Lock Behavior:**
- **Range Locks**: Locks ranges of rows, not just individual rows
- **Predicate Locks**: Locks based on query predicates
- **Strict Locking**: Prevents phantoms by locking ranges
- **Lock Duration**: Until transaction commits

**Example:**
```sql
-- Transaction 1
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
SELECT SUM(balance) FROM accounts WHERE type = 'checking';
-- Acquires range lock on all checking accounts
-- Prevents new checking accounts from being inserted

-- Transaction 2 (blocked or serialization error)
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
INSERT INTO accounts (type, balance) VALUES ('checking', 1000);
-- Tries to insert into locked range
-- Blocked or serialization conflict error
-- Prevents phantom read

-- Transaction 1 completes
COMMIT;  -- Releases range lock

-- Transaction 2 can now proceed
COMMIT;
```

**Lock Conflicts and Resolution:**

**1. Read-Write Conflict:**

**Scenario:**
```
Transaction 1 (Read):              Transaction 2 (Write):
BEGIN;                            BEGIN;
SELECT * FROM accounts            UPDATE accounts
WHERE id = 1;                     SET balance = 4000
-- Shared lock acquired            WHERE id = 1;
                                   -- Tries exclusive lock
                                   -- BLOCKED (waits for shared lock)
                                   ...
                                   (waits)
COMMIT;  -- Releases shared lock
                                   -- Exclusive lock acquired
                                   -- Update proceeds
                                   COMMIT;
```

**Resolution:** Transaction 2 waits until Transaction 1 releases its lock.

**2. Write-Write Conflict:**

**Scenario:**
```
Transaction 1 (Write):            Transaction 2 (Write):
BEGIN;                            BEGIN;
UPDATE accounts                   UPDATE accounts
SET balance = 4000                SET balance = 5000
WHERE id = 1;                     WHERE id = 1;
-- Exclusive lock acquired        -- Tries exclusive lock
                                  -- BLOCKED (waits)
                                  ...
                                  (waits)
COMMIT;  -- Releases exclusive lock
                                  -- Exclusive lock acquired
                                  -- Update proceeds
                                  COMMIT;
```

**Resolution:** One transaction waits; the other proceeds first.

**3. Deadlock:**

**Scenario:**
```
Transaction 1:                    Transaction 2:
BEGIN;                            BEGIN;
UPDATE accounts                   UPDATE accounts
SET balance = 4000                SET balance = 5000
WHERE id = 1;                     WHERE id = 2;
-- Lock on account 1              -- Lock on account 2

UPDATE accounts                   UPDATE accounts
SET balance = 5000                SET balance = 4000
WHERE id = 2;                     WHERE id = 1;
-- Waits for lock on account 2    -- Waits for lock on account 1
-- (held by T2)                    -- (held by T1)
                                  -- DEADLOCK!
```

**Resolution:** Database detects deadlock, rolls back one transaction (usually the one that has done less work).

**Lock Granularity:**

**1. Row-Level Locks:**

Locks individual rows. Most common in modern databases.

**Advantages:**
- High concurrency (only locks affected rows)
- Minimal blocking
- Good for OLTP workloads

**Example:**
```sql
UPDATE accounts SET balance = 4000 WHERE id = 1;
-- Only row with id=1 is locked
-- Other rows can be accessed concurrently
```

**2. Table-Level Locks:**

Locks entire table. Used in some databases or for specific operations.

**Advantages:**
- Simple implementation
- Low overhead

**Disadvantages:**
- Low concurrency (blocks entire table)
- Poor for concurrent access

**3. Page-Level Locks:**

Locks database pages (groups of rows). Middle ground between row and table locks.

**4. Predicate Locks (SERIALIZABLE):**

Locks based on query predicates, preventing phantoms.

**Example:**
```sql
SELECT * FROM accounts WHERE balance > 1000;
-- Predicate lock: "balance > 1000"
-- Prevents inserts/updates that would match this predicate
```

**Visual Lock Representation:**

```
READ COMMITTED:
┌─────────────────────────────────────┐
│ Transaction 1                       │
│ SELECT (shared lock)                │
│   └─▶ Lock acquired                │
│   └─▶ Lock released immediately     │
│                                      │
│ Transaction 2 can proceed           │
└─────────────────────────────────────┘

REPEATABLE READ:
┌─────────────────────────────────────┐
│ Transaction 1                       │
│ SELECT (shared lock)                │
│   └─▶ Lock acquired                │
│   └─▶ Lock held until COMMIT      │
│                                      │
│ Transaction 2 BLOCKED               │
│   └─▶ Waits for lock release       │
└─────────────────────────────────────┘

SERIALIZABLE:
┌─────────────────────────────────────┐
│ Transaction 1                       │
│ SELECT ... WHERE type='checking'    │
│   └─▶ Range lock on type='checking'│
│   └─▶ Lock held until COMMIT       │
│                                      │
│ Transaction 2 BLOCKED               │
│ INSERT ... type='checking'          │
│   └─▶ Cannot insert in locked range│
└─────────────────────────────────────┘
```

**Lock Escalation:**

When many row locks are held, databases may escalate to table locks to reduce lock overhead:

```sql
-- Many row locks
UPDATE accounts SET status = 'active' WHERE country = 'USA';
-- Locks 100,000 rows

-- Database may escalate to table lock
-- Reduces lock management overhead
-- But reduces concurrency
```

**System Design Consideration**: Understanding locking is crucial for:
1. **Performance**: Lock contention is a major performance bottleneck
2. **Deadlock Prevention**: Designing transactions to avoid deadlocks
3. **Isolation Level Choice**: Understanding lock implications of each level
4. **Concurrency**: Balancing consistency with concurrent access

Locking mechanisms are the foundation of transaction isolation. Different isolation levels use different locking strategies to balance consistency and performance. Understanding how locks work helps you choose appropriate isolation levels, design transactions that avoid conflicts, and diagnose performance issues related to lock contention.

