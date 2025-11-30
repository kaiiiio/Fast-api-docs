# Savepoints: Nested Transactions

Savepoints allow you to create checkpoints within a transaction, enabling partial rollback to a specific point without rolling back the entire transaction.

## What are Savepoints?

**Savepoints** are named checkpoints within a transaction. You can rollback to a savepoint without rolling back the entire transaction.

### Basic Concept

```sql
BEGIN;
-- Operations
SAVEPOINT before_operation;
-- More operations
ROLLBACK TO SAVEPOINT before_operation;  -- Undo only from savepoint
-- Continue transaction
COMMIT;
```

## Basic Syntax

### Creating Savepoints

```sql
-- Create savepoint
SAVEPOINT savepoint_name;

-- Rollback to savepoint
ROLLBACK TO SAVEPOINT savepoint_name;

-- Release savepoint (optional)
RELEASE SAVEPOINT savepoint_name;
```

## Real-World Examples

### Example 1: Partial Rollback

```sql
-- Complex transaction with savepoints
BEGIN;

-- Step 1: Create order
INSERT INTO orders (user_id, total) VALUES (1, 99.99)
RETURNING id;
-- Get order_id

SAVEPOINT before_items;

-- Step 2: Add order items
INSERT INTO order_items (order_id, product_id, quantity) 
VALUES (order_id, 999, 1);  -- Fails: product doesn't exist

-- Rollback only items, keep order
ROLLBACK TO SAVEPOINT before_items;

-- Step 3: Try different product
INSERT INTO order_items (order_id, product_id, quantity) 
VALUES (order_id, 1, 2);  -- Success

-- Commit entire transaction
COMMIT;
```

### Example 2: Error Recovery

```sql
-- Transaction with error handling
BEGIN;

-- Main operation
UPDATE accounts SET balance = balance - 100 WHERE id = 1;

SAVEPOINT before_secondary;

-- Secondary operation (may fail)
UPDATE accounts SET balance = balance + 100 WHERE id = 999;  -- Fails: account doesn't exist

-- Rollback only secondary operation
ROLLBACK TO SAVEPOINT before_secondary;

-- Continue with transaction
COMMIT;  -- First update committed
```

### Example 3: Conditional Operations

```sql
-- Conditional transaction flow
BEGIN;

-- Step 1: Always execute
INSERT INTO logs (message) VALUES ('Transaction started');

SAVEPOINT before_optional;

-- Step 2: Optional operation
INSERT INTO notifications (user_id, message) 
VALUES (999, 'Welcome!');  -- May fail if user doesn't exist

-- If fails, rollback to savepoint
ROLLBACK TO SAVEPOINT before_optional;

-- Step 3: Always execute
INSERT INTO logs (message) VALUES ('Transaction completed');

COMMIT;
```

## Nested Savepoints

### Multiple Savepoints

```sql
-- Multiple savepoints
BEGIN;

SAVEPOINT sp1;
-- Operations 1

SAVEPOINT sp2;
-- Operations 2

SAVEPOINT sp3;
-- Operations 3

-- Rollback to sp2 (also rolls back sp3)
ROLLBACK TO SAVEPOINT sp2;

-- Continue from sp2
COMMIT;
```

## Use Cases

### Use Case 1: Complex Workflows

```sql
-- Multi-step workflow with error recovery
BEGIN;

-- Step 1: Create main record
INSERT INTO orders (user_id, total) VALUES (1, 0);

SAVEPOINT before_inventory;

-- Step 2: Reserve inventory
UPDATE products SET stock_quantity = stock_quantity - 10 WHERE id = 1;
-- Fails: Insufficient stock

-- Rollback inventory, keep order
ROLLBACK TO SAVEPOINT before_inventory;

-- Step 3: Try different product
UPDATE products SET stock_quantity = stock_quantity - 5 WHERE id = 2;
-- Success

COMMIT;
```

### Use Case 2: Validation Checkpoints

```sql
-- Transaction with validation checkpoints
BEGIN;

-- Insert data
INSERT INTO users (email, name) VALUES ('user@example.com', 'User');

SAVEPOINT before_validation;

-- Validate (may fail)
-- Check business rules...

-- If validation fails
ROLLBACK TO SAVEPOINT before_validation;

-- Continue or commit
COMMIT;
```

## Best Practices

1. **Use Sparingly**: Savepoints add complexity
2. **Name Clearly**: Use descriptive savepoint names
3. **Document Purpose**: Comment why savepoint exists
4. **Test Rollback**: Verify rollback behavior
5. **Keep Simple**: Don't overuse nested savepoints

## Limitations

### PostgreSQL

```sql
-- Savepoints work within transactions
BEGIN;
SAVEPOINT sp1;
-- Works

-- Can't use outside transaction
SAVEPOINT sp2;  -- Error: No transaction
```

### MySQL

```sql
-- MySQL supports savepoints
START TRANSACTION;
SAVEPOINT sp1;
-- Works

ROLLBACK TO SAVEPOINT sp1;
COMMIT;
```

## Common Patterns

### Pattern 1: Try-Catch with Savepoint

```sql
BEGIN;
SAVEPOINT before_operation;
BEGIN
    -- Operations that may fail
    INSERT INTO ...
    UPDATE ...
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK TO SAVEPOINT before_operation;
        -- Continue or raise
END;
COMMIT;
```

### Pattern 2: Conditional Rollback

```sql
BEGIN;
-- Main operations
SAVEPOINT checkpoint;

-- Conditional operations
IF condition THEN
    -- Do something
ELSE
    ROLLBACK TO SAVEPOINT checkpoint;
END IF;

COMMIT;
```

## Summary

**Savepoints:**

1. **Purpose**: Create checkpoints within transactions
2. **Syntax**: `SAVEPOINT name`, `ROLLBACK TO SAVEPOINT name`
3. **Use Cases**: Partial rollback, error recovery, conditional operations
4. **Benefits**: Fine-grained control, error recovery
5. **Best Practice**: Use sparingly, name clearly

**Key Takeaway:**
Savepoints allow partial rollback within transactions. Use them for complex workflows where you need to rollback specific steps without rolling back the entire transaction. Keep savepoint usage simple and well-documented.

**Common Use Cases:**
- Partial rollback in complex transactions
- Error recovery
- Conditional operations
- Multi-step workflows

**Next Steps:**
- Learn [Transaction Control](transaction_control.md) for transaction basics
- Study [Deadlocks](deadlocks.md) for conflict handling
- Master [Isolation Levels](isolation_levels.md) for transaction isolation

