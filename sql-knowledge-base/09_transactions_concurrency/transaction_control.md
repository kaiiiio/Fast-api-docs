# Transaction Control: BEGIN, COMMIT, ROLLBACK

Transactions ensure multiple database operations succeed or fail together. Understanding transaction control (BEGIN, COMMIT, ROLLBACK) is essential for data integrity.

## What is a Transaction?

A **transaction** is a sequence of database operations that are executed as a single unit. Either all operations succeed, or all are rolled back.

### Transaction Properties (ACID)

- **Atomicity**: All or nothing
- **Consistency**: Database remains valid
- **Isolation**: Concurrent transactions don't interfere
- **Durability**: Committed changes are permanent

## Basic Transaction Control

### BEGIN: Start Transaction

```sql
-- Start a new transaction
BEGIN;
-- or
BEGIN TRANSACTION;
-- or (PostgreSQL)
START TRANSACTION;
```

**What happens:**
- Database starts tracking changes
- Changes are not visible to other transactions yet
- Changes can be rolled back

### COMMIT: Save Changes

```sql
-- Commit transaction (make changes permanent)
COMMIT;
-- or
COMMIT TRANSACTION;
```

**What happens:**
- All changes become permanent
- Changes are visible to other transactions
- Transaction ends

### ROLLBACK: Undo Changes

```sql
-- Rollback transaction (undo all changes)
ROLLBACK;
-- or
ROLLBACK TRANSACTION;
```

**What happens:**
- All changes since BEGIN are undone
- Database returns to state before transaction
- Transaction ends

## Basic Transaction Example

### Successful Transaction

```sql
-- Transfer $100 from Account A to Account B
BEGIN;

-- Step 1: Debit from Account A
UPDATE accounts 
SET balance = balance - 100 
WHERE id = 1;

-- Step 2: Credit to Account B
UPDATE accounts 
SET balance = balance + 100 
WHERE id = 2;

-- Both steps succeeded, commit
COMMIT;
-- Changes are now permanent
```

### Failed Transaction (Rollback)

```sql
BEGIN;

-- Step 1: Debit from Account A
UPDATE accounts 
SET balance = balance - 100 
WHERE id = 1;
-- Succeeds

-- Step 2: Credit to Account B
UPDATE accounts 
SET balance = balance + 100 
WHERE id = 2;
-- Fails: Account 2 doesn't exist

-- Rollback: Undo step 1
ROLLBACK;
-- Account A balance restored, no changes committed
```

## Transaction Patterns

### Pattern 1: Explicit Transaction

```sql
-- Explicit control
BEGIN;
-- Operations
UPDATE ...;
INSERT ...;
DELETE ...;
COMMIT;  -- or ROLLBACK on error
```

### Pattern 2: Auto-Commit (Default)

```sql
-- Each statement is its own transaction
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
-- Automatically committed

UPDATE accounts SET balance = balance + 100 WHERE id = 2;
-- Automatically committed
-- If this fails, first update is already committed!
```

**⚠️ Warning:** Auto-commit can lead to partial updates. Use explicit transactions for related operations.

### Pattern 3: Error Handling

```sql
BEGIN;

BEGIN
    -- Operations
    UPDATE accounts SET balance = balance - 100 WHERE id = 1;
    UPDATE accounts SET balance = balance + 100 WHERE id = 2;
    COMMIT;
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END;
```

## Real-World Examples

### Example 1: Order Creation

```sql
-- Create order with items (must be atomic)
BEGIN;

-- Step 1: Create order
INSERT INTO orders (user_id, total, status)
VALUES (1, 249.98, 'pending')
RETURNING id;
-- Get order_id

-- Step 2: Add order items
INSERT INTO order_items (order_id, product_id, quantity, price)
VALUES 
    (order_id, 1, 2, 99.99),
    (order_id, 2, 1, 50.00);

-- Step 3: Update inventory
UPDATE products SET stock_quantity = stock_quantity - 2 WHERE id = 1;
UPDATE products SET stock_quantity = stock_quantity - 1 WHERE id = 2;

-- Step 4: Check inventory (business rule)
-- If any product out of stock, rollback

-- All steps succeeded
COMMIT;
```

### Example 2: User Registration

```sql
-- Register user with profile (atomic)
BEGIN;

-- Step 1: Create user
INSERT INTO users (email, password_hash, name)
VALUES ('user@example.com', 'hashed_password', 'User Name')
RETURNING id;

-- Step 2: Create profile
INSERT INTO user_profiles (user_id, bio, avatar_url)
VALUES (user_id, 'Bio here', 'avatar.jpg');

-- Step 3: Send welcome email (if fails, rollback everything)
-- Email service call...

-- All succeeded
COMMIT;
```

### Example 3: Bulk Update with Validation

```sql
-- Update multiple products, all or nothing
BEGIN;

UPDATE products SET price = price * 1.1 WHERE category_id = 1;
UPDATE products SET price = price * 1.15 WHERE category_id = 2;
UPDATE products SET price = price * 1.2 WHERE category_id = 3;

-- Validate: Check if any price exceeds limit
SELECT COUNT(*) INTO invalid_count
FROM products
WHERE price > 1000;

IF invalid_count > 0 THEN
    ROLLBACK;  -- Undo all updates
    RAISE EXCEPTION 'Price limit exceeded';
ELSE
    COMMIT;  -- All updates valid
END IF;
```

## Savepoints: Nested Transactions

Savepoints allow partial rollback within a transaction.

### Basic Savepoint

```sql
BEGIN;

-- Main transaction
INSERT INTO orders (user_id, total) VALUES (1, 99.99);

-- Create savepoint
SAVEPOINT before_items;

-- Try to add items
INSERT INTO order_items (order_id, product_id, quantity)
VALUES (1, 999, 1);  -- Fails: product doesn't exist

-- Rollback to savepoint (undo items, keep order)
ROLLBACK TO SAVEPOINT before_items;

-- Continue transaction
INSERT INTO order_items (order_id, product_id, quantity)
VALUES (1, 1, 2);  -- Success

-- Commit entire transaction
COMMIT;
```

### Savepoint Example: Partial Rollback

```sql
BEGIN;

-- Step 1: Create order
INSERT INTO orders (user_id, total) VALUES (1, 199.99);

SAVEPOINT before_inventory;

-- Step 2: Try to reserve inventory
UPDATE products SET stock_quantity = stock_quantity - 10 WHERE id = 1;
-- Fails: Insufficient stock

-- Rollback only inventory update
ROLLBACK TO SAVEPOINT before_inventory;

-- Step 3: Try different product
UPDATE products SET stock_quantity = stock_quantity - 5 WHERE id = 2;
-- Success

-- Commit: Order created with product 2
COMMIT;
```

## Transaction Isolation Levels

Control how transactions interact with each other.

### Setting Isolation Level

```sql
-- Set isolation level for transaction
BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- Or set globally
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
```

### Isolation Levels

1. **READ UNCOMMITTED** (Lowest)
   - Can see uncommitted changes
   - Dirty reads possible

2. **READ COMMITTED** (Default in PostgreSQL)
   - Only see committed changes
   - Prevents dirty reads

3. **REPEATABLE READ**
   - Same data throughout transaction
   - Prevents non-repeatable reads

4. **SERIALIZABLE** (Highest)
   - Transactions execute as if serial
   - Prevents all concurrency issues

## Common Patterns

### Pattern 1: Try-Catch with Rollback

```sql
BEGIN;
BEGIN
    -- Operations
    UPDATE accounts SET balance = balance - 100 WHERE id = 1;
    UPDATE accounts SET balance = balance + 100 WHERE id = 2;
    COMMIT;
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        -- Log error
        RAISE;
END;
```

### Pattern 2: Conditional Commit

```sql
BEGIN;

-- Operations
UPDATE products SET price = price * 1.1 WHERE category_id = 1;

-- Validate
IF (SELECT COUNT(*) FROM products WHERE price > 1000) > 0 THEN
    ROLLBACK;
ELSE
    COMMIT;
END IF;
```

### Pattern 3: Transaction with Retry

```sql
-- Retry logic (application level)
DO $$
DECLARE
    retry_count INT := 0;
    max_retries INT := 3;
BEGIN
    LOOP
        BEGIN
            BEGIN;
            -- Operations
            UPDATE accounts SET balance = balance - 100 WHERE id = 1;
            COMMIT;
            EXIT;  -- Success, exit loop
        EXCEPTION
            WHEN deadlock_detected THEN
                ROLLBACK;
                retry_count := retry_count + 1;
                IF retry_count >= max_retries THEN
                    RAISE;
                END IF;
                -- Wait before retry
                PERFORM pg_sleep(0.1);
        END;
    END LOOP;
END $$;
```

## Performance Considerations

### 1. Keep Transactions Short

```sql
-- ✅ Good: Quick transaction
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;  -- Fast, releases locks quickly

-- ❌ Bad: Long transaction
BEGIN;
-- Complex processing...
-- Network calls...
-- Heavy computation...
COMMIT;  -- Holds locks for long time
```

### 2. Avoid Long-Running Operations in Transactions

```sql
-- ❌ Bad: Network call in transaction
BEGIN;
UPDATE orders SET status = 'processing';
-- Call external API (slow!)
CALL external_payment_api(...);
COMMIT;  -- Transaction holds locks during API call

-- ✅ Good: Do external calls outside transaction
BEGIN;
UPDATE orders SET status = 'processing';
COMMIT;

-- Then call external API
CALL external_payment_api(...);

-- Update status based on result
BEGIN;
UPDATE orders SET status = 'completed' WHERE ...;
COMMIT;
```

### 3. Batch Operations

```sql
-- ✅ Good: Batch in one transaction
BEGIN;
INSERT INTO logs (message) VALUES ('Log 1');
INSERT INTO logs (message) VALUES ('Log 2');
-- ... 1000 inserts
COMMIT;  -- One transaction for all

-- ❌ Bad: Many small transactions
INSERT INTO logs (message) VALUES ('Log 1');  -- Auto-commit
INSERT INTO logs (message) VALUES ('Log 2');  -- Auto-commit
-- ... 1000 transactions (slow!)
```

## Common Mistakes

### ❌ Forgetting to Commit

```sql
-- ❌ Bad: No commit
BEGIN;
UPDATE users SET name = 'New Name' WHERE id = 1;
-- Missing COMMIT!
-- Changes may be rolled back on connection close
```

### ❌ Committing Too Early

```sql
-- ❌ Bad: Partial commit
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;  -- Too early!

UPDATE accounts SET balance = balance + 100 WHERE id = 2;
-- If this fails, first update is already committed!
```

### ❌ Not Handling Errors

```sql
-- ❌ Bad: No error handling
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 999;  -- Fails
COMMIT;  -- Error, but no rollback!
```

## Best Practices

1. **Use Transactions for Related Operations**: All or nothing
2. **Keep Transactions Short**: Release locks quickly
3. **Handle Errors**: Always rollback on error
4. **Test Rollback Scenarios**: Ensure data integrity
5. **Use Savepoints**: For partial rollback when needed
6. **Avoid Long Operations**: Don't do network calls in transactions
7. **Batch Operations**: Group related operations

## Summary

**Transaction Control Essentials:**

1. **BEGIN**: Start transaction
2. **COMMIT**: Save changes permanently
3. **ROLLBACK**: Undo all changes
4. **SAVEPOINT**: Create checkpoint for partial rollback
5. **Isolation Levels**: Control concurrency behavior
6. **Error Handling**: Always rollback on error
7. **Performance**: Keep transactions short

**Key Takeaway:**
Transactions ensure data integrity by making related operations atomic. Always use transactions for operations that must succeed or fail together. Keep transactions short, handle errors properly, and use savepoints for complex scenarios.

**When to Use:**
- Multiple related operations
- Data integrity critical
- Financial transactions
- Order processing
- User registration

**Safety Checklist:**
- ✅ BEGIN before related operations
- ✅ COMMIT after all succeed
- ✅ ROLLBACK on any error
- ✅ Test error scenarios
- ✅ Keep transactions short

**Next Steps:**
- Learn [ACID Properties](acid_properties.md) for transaction guarantees
- Study [Isolation Levels](isolation_levels.md) for concurrency
- Master [Deadlocks](deadlocks.md) for conflict handling

