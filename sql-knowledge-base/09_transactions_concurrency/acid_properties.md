# ACID Properties: Database Transaction Guarantees

ACID is an acronym for four critical properties that guarantee reliable database transactions. Understanding ACID is essential for building robust applications that handle data correctly.

## What is ACID?

**ACID** stands for:
- **A**tomicity
- **C**onsistency
- **I**solation
- **D**urability

These properties ensure that database transactions are processed reliably, even in the face of errors, power failures, or concurrent access.

## Real-World Analogy: Bank Transfer

Imagine transferring $100 from Account A to Account B:

```
Account A: $1000
Account B: $500

Transfer $100:
1. Debit $100 from Account A → $900
2. Credit $100 to Account B → $600
```

**Without ACID:**
- What if step 1 succeeds but step 2 fails?
- Account A loses $100, Account B doesn't get it
- Money disappears! 💸

**With ACID:**
- Both steps succeed together, or both fail together
- Money is never lost
- Transaction is reliable

## A: Atomicity

**Definition:** All operations in a transaction succeed together, or all fail together. There's no partial completion.

**Analogy:** Like a light switch - it's either ON or OFF, never halfway.

### Example: Order Creation

```sql
-- Create order with items (must be atomic)
BEGIN;

-- Step 1: Create order
INSERT INTO orders (user_id, total) 
VALUES (1, 249.98);

-- Step 2: Add order items
INSERT INTO order_items (order_id, product_id, quantity, price)
VALUES 
    (LAST_INSERT_ID(), 1, 2, 99.99),
    (LAST_INSERT_ID(), 2, 1, 50.00);

-- Step 3: Update inventory
UPDATE products SET stock_quantity = stock_quantity - 2 WHERE id = 1;
UPDATE products SET stock_quantity = stock_quantity - 1 WHERE id = 2;

-- If ANY step fails, ALL changes are rolled back
COMMIT;
```

**What Atomicity Guarantees:**

✅ **Success Case:**
- Order created
- Items added
- Inventory updated
- All changes committed

❌ **Failure Case:**
- If inventory update fails (e.g., out of stock)
- Order creation is rolled back
- Items are rolled back
- **Nothing is committed** - database returns to original state

### Without Atomicity (Bad)

```sql
-- ❌ Bad: No transaction
INSERT INTO orders (user_id, total) VALUES (1, 249.98);
-- If this succeeds but next fails:
INSERT INTO order_items (order_id, product_id) VALUES (1, 999);  -- Fails!
-- Result: Orphaned order (no items) - data inconsistency!
```

### With Atomicity (Good)

```sql
-- ✅ Good: Transaction ensures atomicity
BEGIN;
INSERT INTO orders (user_id, total) VALUES (1, 249.98);
INSERT INTO order_items (order_id, product_id) VALUES (1, 999);  -- Fails!
ROLLBACK;  -- Order creation also rolled back
-- Result: No orphaned data - database remains consistent
```

## C: Consistency

**Definition:** Database remains in a valid state before and after transaction. All constraints, rules, and relationships are maintained.

**Analogy:** Like a scale - it must always balance. If you add weight to one side, you must adjust the other.

### Example: Account Balance

```sql
-- Consistency rule: balance >= 0
CREATE TABLE accounts (
    id INT PRIMARY KEY,
    balance DECIMAL(10, 2) NOT NULL,
    CONSTRAINT balance_non_negative CHECK (balance >= 0)
);

-- Transaction: Withdraw $100
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
-- If balance becomes negative, transaction fails
-- Database enforces constraint - transaction rolled back
COMMIT;
```

**What Consistency Guarantees:**

✅ **Valid States:**
- All constraints satisfied
- Foreign keys valid
- Data types correct
- Business rules enforced

❌ **Invalid States Prevented:**
- Negative balances
- Orphaned records (foreign key violations)
- Invalid data types
- Constraint violations

### Consistency Rules

```sql
-- Example: E-commerce consistency rules

-- Rule 1: Order total must equal sum of items
CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id INT NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Rule 2: Cannot order more than available stock
CREATE TABLE order_items (
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    CHECK (quantity > 0),
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Transaction enforces all rules
BEGIN;
INSERT INTO orders (user_id, total) VALUES (1, 249.98);
INSERT INTO order_items (order_id, product_id, quantity) 
VALUES (1, 1, 1000);  -- More than stock available
-- Consistency check: Transaction fails if stock insufficient
COMMIT;
```

## I: Isolation

**Definition:** Concurrent transactions don't interfere with each other. Each transaction sees a consistent snapshot of data.

**Analogy:** Like separate checkout lanes - each customer's transaction is independent, even though they're happening simultaneously.

### Example: Concurrent Updates

**Scenario:** Two users trying to buy the last item in stock.

```sql
-- Transaction 1 (User A)
BEGIN;
SELECT stock_quantity FROM products WHERE id = 1;  -- Returns 1
-- User A sees: 1 item available
UPDATE products SET stock_quantity = stock_quantity - 1 WHERE id = 1;
COMMIT;

-- Transaction 2 (User B) - Happening simultaneously
BEGIN;
SELECT stock_quantity FROM products WHERE id = 1;  -- Returns 1 (before Transaction 1 commits)
-- User B also sees: 1 item available
UPDATE products SET stock_quantity = stock_quantity - 1 WHERE id = 1;
COMMIT;
```

**Problem:** Both users think they got the last item!

**Solution: Isolation Levels**

### Isolation Levels

**1. READ UNCOMMITTED (Lowest Isolation)**
```sql
-- Can see uncommitted changes from other transactions
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
-- Problem: Dirty reads (see uncommitted data)
```

**2. READ COMMITTED (Default in PostgreSQL)**
```sql
-- Only see committed changes
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
-- Prevents dirty reads
-- Problem: Non-repeatable reads (data can change between reads)
```

**3. REPEATABLE READ**
```sql
-- Same data throughout transaction
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
-- Prevents dirty reads and non-repeatable reads
-- Problem: Phantom reads (new rows can appear)
```

**4. SERIALIZABLE (Highest Isolation)**
```sql
-- Transactions execute as if serial (one after another)
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
-- Prevents all concurrency issues
-- Cost: Lower performance, more locking
```

### Isolation Example: Preventing Double Booking

```sql
-- Use SERIALIZABLE to prevent double booking
BEGIN ISOLATION LEVEL SERIALIZABLE;

-- Check availability
SELECT COUNT(*) FROM bookings 
WHERE room_id = 101 AND date = '2024-12-01';
-- Returns 0 (available)

-- Book room
INSERT INTO bookings (room_id, date, user_id)
VALUES (101, '2024-12-01', 1);

COMMIT;
-- If another transaction tries same booking, one will fail
-- Ensures only one booking succeeds
```

## D: Durability

**Definition:** Once a transaction is committed, changes are permanent. They survive system crashes, power failures, and restarts.

**Analogy:** Like writing in permanent ink - once written, it can't be erased, even if the paper gets wet.

### Example: Order Payment

```sql
-- Payment transaction
BEGIN;

-- Deduct from account
UPDATE accounts SET balance = balance - 100 WHERE id = 1;

-- Record payment
INSERT INTO payments (order_id, amount, status)
VALUES (123, 100, 'completed');

COMMIT;
-- Changes are now durable
-- Even if database crashes immediately after, changes are saved
```

**What Durability Guarantees:**

✅ **Committed Changes Persist:**
- Written to disk (not just memory)
- Survives power failures
- Survives system crashes
- Survives database restarts

❌ **Uncommitted Changes Lost:**
- If crash happens before COMMIT
- Changes are rolled back
- Database returns to last committed state

### How Durability Works

**Write-Ahead Logging (WAL):**
```
1. Transaction makes changes
2. Changes written to WAL (Write-Ahead Log) on disk
3. COMMIT written to WAL
4. Changes applied to actual data files
5. Even if crash happens, WAL can replay changes
```

## ACID in Practice

### Complete Example: E-commerce Order

```sql
BEGIN;  -- Start transaction

-- Step 1: Create order
INSERT INTO orders (user_id, total, status)
VALUES (1, 249.98, 'pending');

-- Step 2: Add order items
INSERT INTO order_items (order_id, product_id, quantity, price)
VALUES 
    (LAST_INSERT_ID(), 1, 2, 99.99),
    (LAST_INSERT_ID(), 2, 1, 50.00);

-- Step 3: Reserve inventory
UPDATE products 
SET stock_quantity = stock_quantity - 2 
WHERE id = 1 AND stock_quantity >= 2;

UPDATE products 
SET stock_quantity = stock_quantity - 1 
WHERE id = 2 AND stock_quantity >= 1;

-- Step 4: Check if all inventory updates succeeded
-- If any product is out of stock, rollback everything

-- Step 5: Deduct payment
UPDATE accounts 
SET balance = balance - 249.98 
WHERE id = 1 AND balance >= 249.98;

-- Step 6: Update order status
UPDATE orders 
SET status = 'paid' 
WHERE id = LAST_INSERT_ID();

COMMIT;  -- All or nothing
```

**ACID Guarantees:**

1. **Atomicity**: All steps succeed or all fail
2. **Consistency**: Constraints maintained (stock >= 0, balance >= 0)
3. **Isolation**: Other transactions don't see partial changes
4. **Durability**: Once committed, order is permanent

## ACID vs NoSQL

### SQL Databases (ACID Compliant)

```sql
-- PostgreSQL, MySQL, SQL Server
-- Full ACID support
BEGIN;
-- Multiple operations
COMMIT;
-- All ACID properties guaranteed
```

### NoSQL Databases (Often Not ACID)

```javascript
// MongoDB: Often eventual consistency
// May sacrifice ACID for performance/scalability
db.orders.insertOne({ ... });
// No transaction guarantee across multiple collections
```

**Trade-off:**
- **SQL**: ACID guarantees, but may be slower
- **NoSQL**: Better performance/scalability, but weaker guarantees

## When ACID Matters

### ✅ Critical for:

1. **Financial Transactions**
   - Money transfers
   - Payments
   - Account balances

2. **Inventory Management**
   - Stock updates
   - Reservations
   - Order fulfillment

3. **User Accounts**
   - Registration
   - Authentication
   - Profile updates

4. **Critical Business Logic**
   - Order processing
   - Subscription management
   - Billing

### ⚠️ Less Critical for:

1. **Analytics Data**
   - Logs
   - Metrics
   - Event streams

2. **Caching**
   - Session data
   - Temporary data
   - Frequently changing data

3. **High-Volume Writes**
   - IoT sensor data
   - Click tracking
   - Social media posts

## Best Practices

1. **Use Transactions for Related Operations**
   ```sql
   -- ✅ Good: Related operations in transaction
   BEGIN;
   INSERT INTO orders ...;
   INSERT INTO order_items ...;
   UPDATE inventory ...;
   COMMIT;
   ```

2. **Keep Transactions Short**
   ```sql
   -- ✅ Good: Quick transaction
   BEGIN;
   UPDATE accounts SET balance = balance - 100 WHERE id = 1;
   COMMIT;
   
   -- ❌ Bad: Long transaction (locks resources)
   BEGIN;
   -- Complex processing...
   -- Network calls...
   -- Heavy computation...
   COMMIT;
   ```

3. **Handle Errors Properly**
   ```sql
   BEGIN;
   -- Operations
   IF error THEN
       ROLLBACK;
   ELSE
       COMMIT;
   END IF;
   ```

4. **Choose Appropriate Isolation Level**
   ```sql
   -- Use SERIALIZABLE only when necessary
   -- Default (READ COMMITTED) is usually sufficient
   ```

## Common Mistakes

### ❌ Not Using Transactions

```sql
-- Bad: No transaction
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
-- If second fails, first still committed - money lost!
```

### ❌ Long-Running Transactions

```sql
-- Bad: Transaction holds locks too long
BEGIN;
-- Do work...
-- Wait for user input...
-- More work...
COMMIT;
-- Blocks other transactions
```

### ❌ Ignoring Errors

```sql
-- Bad: Don't check for errors
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;  -- What if update failed?
```

## Summary

**ACID Properties:**

1. **Atomicity**: All or nothing - transactions complete fully or not at all
2. **Consistency**: Database remains valid - constraints and rules maintained
3. **Isolation**: Concurrent transactions don't interfere - each sees consistent data
4. **Durability**: Committed changes are permanent - survive crashes and failures

**Key Takeaway:**
ACID properties ensure database transactions are reliable and correct. They prevent data corruption, ensure consistency, and guarantee that committed changes are permanent. Always use transactions for related operations that must succeed or fail together.

**When to Use:**
- Financial operations
- Critical business logic
- Data integrity requirements
- Multi-step operations

**Next Steps:**
- Learn [Transaction Control](transaction_control.md) for BEGIN/COMMIT/ROLLBACK
- Study [Isolation Levels](isolation_levels.md) for concurrency control
- Master [Deadlocks](deadlocks.md) for handling conflicts

