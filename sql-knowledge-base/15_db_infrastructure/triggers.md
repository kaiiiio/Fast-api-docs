# Database Triggers: Automated Actions on Data Changes

Triggers are database objects that automatically execute in response to specific events (INSERT, UPDATE, DELETE). They're useful for audit trails, data validation, and maintaining data consistency.

## What are Triggers?

**Triggers** are stored procedures that automatically execute when specific database events occur:
- **BEFORE**: Execute before the event
- **AFTER**: Execute after the event
- **INSTEAD OF**: Replace the event (for views)

**Common Use Cases:**
- Audit logging
- Data validation
- Maintaining denormalized data
- Enforcing business rules
- Auto-updating timestamps

## Basic Trigger Syntax

### PostgreSQL Syntax

```sql
CREATE TRIGGER trigger_name
BEFORE|AFTER|INSTEAD OF event
ON table_name
FOR EACH ROW|STATEMENT
EXECUTE FUNCTION function_name();
```

### MySQL Syntax

```sql
CREATE TRIGGER trigger_name
BEFORE|AFTER event
ON table_name
FOR EACH ROW
BEGIN
    -- SQL statements
END;
```

## Simple Examples

### Example 1: Auto-Update Timestamp

```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update updated_at on UPDATE
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Test: Update user
UPDATE users SET name = 'New Name' WHERE id = 1;
-- updated_at automatically set to current timestamp
```

### Example 2: Audit Logging

```sql
-- Audit log table
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    operation VARCHAR(10) NOT NULL,  -- INSERT, UPDATE, DELETE
    record_id INTEGER,
    old_data JSONB,
    new_data JSONB,
    changed_by INTEGER,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Function to log changes
CREATE OR REPLACE FUNCTION log_user_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, operation, record_id, new_data, changed_by)
        VALUES ('users', 'INSERT', NEW.id, row_to_json(NEW), NEW.id);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, operation, record_id, old_data, new_data, changed_by)
        VALUES ('users', 'UPDATE', NEW.id, row_to_json(OLD), row_to_json(NEW), NEW.id);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, operation, record_id, old_data, changed_by)
        VALUES ('users', 'DELETE', OLD.id, row_to_json(OLD), OLD.id);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Log all user changes
CREATE TRIGGER users_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW
EXECUTE FUNCTION log_user_changes();

-- Test: Changes are logged automatically
UPDATE users SET name = 'Updated Name' WHERE id = 1;
-- Audit log entry created automatically
```

### Example 3: Data Validation

```sql
-- Function to validate email before insert/update
CREATE OR REPLACE FUNCTION validate_user_email()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate email format
    IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid email format: %', NEW.email;
    END IF;
    
    -- Check for duplicate email
    IF EXISTS(SELECT 1 FROM users WHERE email = NEW.email AND id != NEW.id) THEN
        RAISE EXCEPTION 'Email already exists: %', NEW.email;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Validate email before insert/update
CREATE TRIGGER validate_users_email
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION validate_user_email();

-- Test: Invalid email rejected
INSERT INTO users (email, name) VALUES ('invalid-email', 'Test');
-- Error: Invalid email format
```

## Real-World Examples

### Example 1: Maintain Denormalized Data

```sql
-- Update order count in users table when order is created
CREATE OR REPLACE FUNCTION update_user_order_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE users
        SET order_count = order_count + 1
        WHERE id = NEW.user_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE users
        SET order_count = order_count - 1
        WHERE id = OLD.user_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update order count
CREATE TRIGGER update_user_order_count_trigger
AFTER INSERT OR DELETE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_user_order_count();

-- Test: Order count updated automatically
INSERT INTO orders (user_id, total) VALUES (1, 99.99);
-- user.order_count automatically incremented
```

### Example 2: Soft Delete

```sql
-- Function to handle soft delete
CREATE OR REPLACE FUNCTION soft_delete_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Instead of deleting, set deleted_at
    UPDATE users
    SET deleted_at = CURRENT_TIMESTAMP,
        is_active = false
    WHERE id = OLD.id;
    
    RETURN NULL;  -- Prevent actual delete
END;
$$ LANGUAGE plpgsql;

-- Trigger: Soft delete instead of hard delete
CREATE TRIGGER soft_delete_users_trigger
BEFORE DELETE ON users
FOR EACH ROW
EXECUTE FUNCTION soft_delete_user();

-- Test: Delete becomes soft delete
DELETE FROM users WHERE id = 1;
-- Row not deleted, deleted_at set instead
```

### Example 3: Inventory Management

```sql
-- Function to update inventory on order
CREATE OR REPLACE FUNCTION update_inventory_on_order()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Decrease inventory
        UPDATE products
        SET stock_quantity = stock_quantity - NEW.quantity
        WHERE id = NEW.product_id;
        
        -- Check for low stock
        IF (SELECT stock_quantity FROM products WHERE id = NEW.product_id) < 10 THEN
            -- Log low stock alert
            INSERT INTO low_stock_alerts (product_id, current_quantity, alert_time)
            VALUES (NEW.product_id, (SELECT stock_quantity FROM products WHERE id = NEW.product_id), CURRENT_TIMESTAMP);
        END IF;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Restore inventory
        UPDATE products
        SET stock_quantity = stock_quantity + OLD.quantity
        WHERE id = OLD.product_id;
        
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update inventory
CREATE TRIGGER update_inventory_trigger
AFTER INSERT OR DELETE ON order_items
FOR EACH ROW
EXECUTE FUNCTION update_inventory_on_order();

-- Test: Inventory updated automatically
INSERT INTO order_items (order_id, product_id, quantity) VALUES (1, 1, 5);
-- product.stock_quantity automatically decreased
```

### Example 4: Calculate Order Total

```sql
-- Function to recalculate order total
CREATE OR REPLACE FUNCTION recalculate_order_total()
RETURNS TRIGGER AS $$
DECLARE
    new_total DECIMAL;
BEGIN
    -- Calculate new total
    SELECT COALESCE(SUM(quantity * price), 0)
    INTO new_total
    FROM order_items
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
    
    -- Update order total
    UPDATE orders
    SET total = new_total
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger: Recalculate total when items change
CREATE TRIGGER recalculate_order_total_trigger
AFTER INSERT OR UPDATE OR DELETE ON order_items
FOR EACH ROW
EXECUTE FUNCTION recalculate_order_total();

-- Test: Order total updated automatically
INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (1, 1, 2, 99.99);
-- order.total automatically recalculated
```

## Trigger Types

### BEFORE Triggers

```sql
-- Execute before the event
CREATE TRIGGER before_insert_user
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION validate_user_data();

-- Can modify NEW values
CREATE OR REPLACE FUNCTION set_defaults()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.created_at IS NULL THEN
        NEW.created_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### AFTER Triggers

```sql
-- Execute after the event
CREATE TRIGGER after_insert_order
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION log_order_creation();

-- Cannot modify data, but can perform side effects
```

### INSTEAD OF Triggers (Views)

```sql
-- Replace the event (for views)
CREATE TRIGGER instead_of_insert_view
INSTEAD OF INSERT ON user_orders_view
FOR EACH ROW
EXECUTE FUNCTION handle_view_insert();

-- Used for making views updatable
```

## FOR EACH ROW vs FOR EACH STATEMENT

### FOR EACH ROW

```sql
-- Executes once per row
CREATE TRIGGER row_trigger
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION log_order();

-- If 100 rows inserted, function called 100 times
```

### FOR EACH STATEMENT

```sql
-- Executes once per statement
CREATE TRIGGER statement_trigger
AFTER INSERT ON orders
FOR EACH STATEMENT
EXECUTE FUNCTION log_bulk_insert();

-- If 100 rows inserted, function called once
```

## Common Patterns

### Pattern 1: Audit Trail

```sql
-- Complete audit trail trigger
CREATE OR REPLACE FUNCTION audit_trail()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (
        table_name,
        operation,
        record_id,
        old_data,
        new_data,
        changed_at
    ) VALUES (
        TG_TABLE_NAME,
        TG_OP,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
        CURRENT_TIMESTAMP
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply to multiple tables
CREATE TRIGGER users_audit AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION audit_trail();

CREATE TRIGGER orders_audit AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW EXECUTE FUNCTION audit_trail();
```

### Pattern 2: Auto-Increment Counter

```sql
-- Maintain counter in related table
CREATE OR REPLACE FUNCTION increment_counter()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE counters
    SET count = count + 1
    WHERE table_name = TG_TABLE_NAME;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Pattern 3: Cascading Updates

```sql
-- Update related records
CREATE OR REPLACE FUNCTION cascade_category_update()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.name != NEW.name THEN
        UPDATE products
        SET category_name = NEW.name
        WHERE category_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Best Practices

1. **Keep Triggers Simple**: Complex logic in functions
2. **Document Triggers**: Comment what each trigger does
3. **Test Thoroughly**: Test all trigger paths
4. **Avoid Recursive Triggers**: Can cause infinite loops
5. **Use Functions**: Reusable trigger logic
6. **Monitor Performance**: Triggers add overhead

## Common Mistakes

### ❌ Infinite Loop

```sql
-- ❌ Bad: Trigger updates same table
CREATE TRIGGER update_users
AFTER UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_users();  -- Updates users table again!

-- ✅ Good: Update different table
CREATE TRIGGER update_user_stats
AFTER UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_user_statistics();  -- Updates stats table
```

### ❌ Missing RETURN Statement

```sql
-- ❌ Bad: Missing RETURN
CREATE OR REPLACE FUNCTION my_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Do something
    -- Missing RETURN!
END;
$$ LANGUAGE plpgsql;

-- ✅ Good: Always return
CREATE OR REPLACE FUNCTION my_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Do something
    RETURN NEW;  -- or RETURN OLD
END;
$$ LANGUAGE plpgsql;
```

## Performance Considerations

### 1. Triggers Add Overhead

```sql
-- Every INSERT triggers function execution
INSERT INTO orders (user_id, total) VALUES (1, 99.99);
-- Trigger executes, adds overhead

-- Consider: Is trigger necessary? Can it be done in application?
```

### 2. Batch Operations

```sql
-- FOR EACH ROW: Called for each row
INSERT INTO orders (user_id, total)
SELECT user_id, total FROM temp_orders;
-- Trigger called 1000 times if 1000 rows

-- FOR EACH STATEMENT: Called once
-- Better for bulk operations
```

## Summary

**Triggers Essentials:**

1. **Purpose**: Automatically execute on database events
2. **Types**: BEFORE, AFTER, INSTEAD OF
3. **Scope**: FOR EACH ROW or FOR EACH STATEMENT
4. **Use Cases**: Audit trails, validation, denormalized data
5. **Performance**: Add overhead, use carefully

**Key Takeaway:**
Triggers automatically execute in response to database events. Use them for audit trails, data validation, and maintaining denormalized data. Keep triggers simple, test thoroughly, and be aware of performance overhead.

**When to Use:**
- Audit logging
- Data validation
- Maintaining denormalized data
- Enforcing business rules
- Auto-updating timestamps

**Common Patterns:**
- Audit trails
- Soft deletes
- Inventory management
- Order total calculation
- Data validation

**Next Steps:**
- Learn [Stored Procedures](stored_procedures.md) for reusable logic
- Study [Views](views.md) for simplified queries
- Master [Performance Optimization](../10_performance_optimization/) for tuning

