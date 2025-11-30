# UPDATE: Modifying Existing Data

The `UPDATE` statement modifies existing rows in a table. Understanding UPDATE patterns, safety, and performance is crucial for data management.

## Basic UPDATE Syntax

```sql
UPDATE table_name
SET column1 = value1, column2 = value2, ...
WHERE condition;
```

## Simple UPDATE Examples

### Update Single Row

```sql
-- Update user's email
UPDATE users
SET email = 'newemail@example.com'
WHERE id = 1;
```

**Result:**
```
1 row updated
```

### Update Multiple Columns

```sql
-- Update user's name and phone
UPDATE users
SET 
    name = 'John Smith',
    phone = '123-456-7890',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 1;
```

### Update Multiple Rows

```sql
-- Update all active users
UPDATE users
SET last_login = CURRENT_TIMESTAMP
WHERE is_active = true;
```

**Result:**
```
150 rows updated
```

## UPDATE with WHERE Clause

**⚠️ CRITICAL: Always use WHERE clause (unless updating all rows intentionally)**

### Safe UPDATE

```sql
-- ✅ Good: Specific condition
UPDATE users
SET email = 'newemail@example.com'
WHERE id = 1;
```

### Dangerous UPDATE (No WHERE)

```sql
-- ❌ DANGEROUS: Updates ALL rows!
UPDATE users
SET email = 'newemail@example.com';
-- Updates every user in table!
```

**Always test UPDATE queries with SELECT first:**
```sql
-- Step 1: See what will be updated
SELECT * FROM users WHERE id = 1;

-- Step 2: Verify the WHERE clause
SELECT COUNT(*) FROM users WHERE id = 1;  -- Should be 1

-- Step 3: Execute UPDATE
UPDATE users SET email = 'newemail@example.com' WHERE id = 1;
```

## UPDATE with Calculations

### Increment/Decrement Values

```sql
-- Increment view count
UPDATE posts
SET view_count = view_count + 1
WHERE id = 123;

-- Decrement stock quantity
UPDATE products
SET stock_quantity = stock_quantity - 1
WHERE id = 456 AND stock_quantity > 0;
```

### Update with Expressions

```sql
-- Apply discount
UPDATE products
SET price = price * 0.9  -- 10% discount
WHERE category_id = 1;

-- Calculate total
UPDATE orders
SET total = (
    SELECT SUM(quantity * price)
    FROM order_items
    WHERE order_id = orders.id
);
```

## UPDATE with Subqueries

### Update from Another Table

```sql
-- Update user's last order date
UPDATE users u
SET last_order_date = (
    SELECT MAX(created_at)
    FROM orders o
    WHERE o.user_id = u.id
);
```

### Update with JOIN (PostgreSQL, MySQL)

```sql
-- Update product prices from price_history
UPDATE products p
SET price = ph.new_price
FROM price_history ph
WHERE p.id = ph.product_id
  AND ph.effective_date = CURRENT_DATE;
```

**MySQL Syntax:**
```sql
UPDATE products p
INNER JOIN price_history ph ON p.id = ph.product_id
SET p.price = ph.new_price
WHERE ph.effective_date = CURDATE();
```

## UPDATE with CASE WHEN

Conditional updates based on multiple conditions.

### Basic CASE

```sql
-- Update status based on order total
UPDATE orders
SET status = CASE
    WHEN total > 1000 THEN 'premium'
    WHEN total > 500 THEN 'standard'
    ELSE 'basic'
END
WHERE status IS NULL;
```

### Complex CASE

```sql
-- Update user tier based on multiple factors
UPDATE users
SET tier = CASE
    WHEN total_orders > 50 AND total_spent > 5000 THEN 'VIP'
    WHEN total_orders > 20 AND total_spent > 1000 THEN 'Gold'
    WHEN total_orders > 10 THEN 'Silver'
    ELSE 'Bronze'
END;
```

## UPDATE with RETURNING (PostgreSQL)

Get updated rows back immediately.

### Basic RETURNING

```sql
-- Update and get the updated row
UPDATE users
SET name = 'John Smith', updated_at = CURRENT_TIMESTAMP
WHERE id = 1
RETURNING *;
```

**Result:**
```
┌────┬──────────────────┬──────────────┬─────────────────────┐
│ id │ email            │ name         │ updated_at          │
├────┼──────────────────┼──────────────┼─────────────────────┤
│ 1  │ john@example.com │ John Smith   │ 2024-11-30 10:00:00 │
└────┴──────────────────┴──────────────┴─────────────────────┘
```

### RETURNING Specific Columns

```sql
-- Return only id and updated timestamp
UPDATE users
SET last_login = CURRENT_TIMESTAMP
WHERE id = 1
RETURNING id, last_login;
```

### RETURNING with Calculations

```sql
-- Update price and return new price with tax
UPDATE products
SET price = price * 1.1
WHERE id = 123
RETURNING 
    id,
    name,
    price,
    price * 1.08 AS price_with_tax;
```

## Bulk UPDATE Patterns

### Pattern 1: Update Based on Category

```sql
-- Update all products in a category
UPDATE products
SET discount_percent = 20
WHERE category_id = 1;
```

### Pattern 2: Update from Staging Table

```sql
-- Update products from import table
UPDATE products p
SET 
    price = s.new_price,
    stock_quantity = s.new_stock,
    updated_at = CURRENT_TIMESTAMP
FROM staging_products s
WHERE p.id = s.product_id;
```

### Pattern 3: Conditional Bulk Update

```sql
-- Update only if condition met
UPDATE orders
SET status = 'cancelled',
    cancelled_at = CURRENT_TIMESTAMP
WHERE status = 'pending'
  AND created_at < CURRENT_DATE - INTERVAL '30 days';
```

## UPDATE with Constraints

### Handling NOT NULL

```sql
-- ❌ Error: Cannot set to NULL if column is NOT NULL
UPDATE users
SET email = NULL
WHERE id = 1;

-- ✅ Correct: Provide valid value
UPDATE users
SET email = 'newemail@example.com'
WHERE id = 1;
```

### Handling UNIQUE Constraints

```sql
-- ❌ Error: Email already exists
UPDATE users
SET email = 'existing@example.com'
WHERE id = 1;

-- ✅ Handle with subquery check
UPDATE users
SET email = 'newemail@example.com'
WHERE id = 1
  AND NOT EXISTS (
      SELECT 1 FROM users 
      WHERE email = 'newemail@example.com' AND id != 1
  );
```

### Handling FOREIGN KEY Constraints

```sql
-- ❌ Error: category_id doesn't exist
UPDATE products
SET category_id = 999
WHERE id = 1;

-- ✅ Correct: Use valid category_id
UPDATE products
SET category_id = 2
WHERE id = 1;
```

## UPDATE in Transactions

### Safe Multi-Step Update

```sql
BEGIN;

-- Step 1: Update order status
UPDATE orders
SET status = 'processing'
WHERE id = 123;

-- Step 2: Reserve inventory
UPDATE products
SET stock_quantity = stock_quantity - 1
WHERE id IN (
    SELECT product_id FROM order_items WHERE order_id = 123
);

-- Step 3: Update order total
UPDATE orders
SET total = (
    SELECT SUM(quantity * price)
    FROM order_items
    WHERE order_id = 123
)
WHERE id = 123;

-- If any step fails, all changes rolled back
COMMIT;
```

## Common Patterns

### Pattern 1: Update Timestamp

```sql
-- Update updated_at on every change
UPDATE users
SET 
    name = 'New Name',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 1;
```

### Pattern 2: Increment Counter

```sql
-- Increment view/like count
UPDATE posts
SET 
    view_count = view_count + 1,
    last_viewed_at = CURRENT_TIMESTAMP
WHERE id = 123;
```

### Pattern 3: Soft Delete

```sql
-- Mark as deleted instead of actually deleting
UPDATE users
SET 
    deleted_at = CURRENT_TIMESTAMP,
    is_active = false
WHERE id = 1;
```

### Pattern 4: Status Transitions

```sql
-- Update order status with validation
UPDATE orders
SET 
    status = 'shipped',
    shipped_at = CURRENT_TIMESTAMP
WHERE id = 123
  AND status = 'processing'  -- Only if current status is processing
  AND EXISTS (
      SELECT 1 FROM shipments WHERE order_id = 123
  );
```

## Performance Considerations

### 1. **Index Columns in WHERE Clause**

```sql
-- ✅ Fast: Uses index on id
UPDATE users SET name = 'New Name' WHERE id = 1;

-- ⚠️ Slow: Full table scan
UPDATE users SET name = 'New Name' WHERE email = 'user@example.com';
-- Create index: CREATE INDEX idx_users_email ON users(email);
```

### 2. **Limit Rows Updated**

```sql
-- ✅ Good: Limits scope
UPDATE products
SET discount_percent = 20
WHERE category_id = 1 AND discount_percent IS NULL;

-- ❌ Bad: Updates too many rows
UPDATE products SET discount_percent = 20;
```

### 3. **Batch Updates**

```sql
-- For large updates, do in batches
UPDATE products
SET price = price * 1.1
WHERE id BETWEEN 1 AND 1000;

UPDATE products
SET price = price * 1.1
WHERE id BETWEEN 1001 AND 2000;
-- Continue in batches
```

## Common Mistakes

### ❌ Forgetting WHERE Clause

```sql
-- ❌ DANGEROUS: Updates all rows!
UPDATE users SET is_active = false;
-- Should be:
UPDATE users SET is_active = false WHERE id = 1;
```

### ❌ Wrong WHERE Condition

```sql
-- ❌ Wrong: Updates wrong rows
UPDATE users SET email = 'admin@example.com' WHERE id = 2;
-- Meant to update id = 1

-- ✅ Always verify with SELECT first
SELECT * FROM users WHERE id = 1;  -- Verify
UPDATE users SET email = 'admin@example.com' WHERE id = 1;
```

### ❌ Not Handling NULL

```sql
-- ❌ Wrong: Doesn't handle NULL
UPDATE products
SET price = price * 1.1
WHERE category_id = 1;
-- If price is NULL, result is NULL

-- ✅ Correct: Handle NULL
UPDATE products
SET price = COALESCE(price, 0) * 1.1
WHERE category_id = 1;
```

### ❌ Update in Loop (Application Code)

```javascript
// ❌ Bad: One UPDATE per row
for (const user of users) {
    await db.query('UPDATE users SET last_login = $1 WHERE id = $2', 
        [new Date(), user.id]);
}

// ✅ Good: Single UPDATE
await db.query(`
    UPDATE users 
    SET last_login = $1 
    WHERE id = ANY($2)
`, [new Date(), userIds]);
```

## Best Practices

1. **Always Use WHERE**: Unless intentionally updating all rows
2. **Test with SELECT First**: Verify what will be updated
3. **Use Transactions**: For multi-step updates
4. **Index WHERE Columns**: For performance
5. **Handle NULLs**: Use COALESCE when needed
6. **Batch Large Updates**: Update in chunks
7. **Use RETURNING**: When you need updated data back
8. **Validate Constraints**: Check before updating

## Summary

**UPDATE Statement Essentials:**

1. **Basic Syntax**: `UPDATE table SET column = value WHERE condition`
2. **Always Use WHERE**: Prevent accidental updates to all rows
3. **Calculations**: Can use expressions and calculations
4. **Subqueries**: Update based on other tables
5. **RETURNING**: Get updated rows back (PostgreSQL)
6. **Transactions**: Use for multi-step updates
7. **Performance**: Index WHERE columns, batch large updates

**Key Takeaway:**
UPDATE is powerful but dangerous if misused. Always use WHERE clauses, test with SELECT first, and use transactions for related updates. Performance depends on proper indexing and batching large operations.

**Safety Checklist:**
- ✅ WHERE clause present and correct
- ✅ Tested with SELECT first
- ✅ Transaction for related updates
- ✅ Constraints handled
- ✅ NULL values considered

**Next Steps:**
- Learn [DELETE](delete.md) to remove data
- Study [RETURNING](returning.md) for PostgreSQL features
- Master [Transactions](../09_transactions_concurrency/transaction_control.md) for data integrity

