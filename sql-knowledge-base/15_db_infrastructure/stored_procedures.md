# Stored Procedures: Reusable Database Logic

Stored procedures are precompiled SQL code stored in the database that can be executed with parameters. They encapsulate business logic, improve performance, and enhance security.

## What are Stored Procedures?

**Stored procedures** are named blocks of SQL code stored in the database that:
- Accept parameters
- Perform operations
- Return results
- Can be called from applications

**Benefits:**
- **Performance**: Precompiled, faster execution
- **Security**: Control database access
- **Reusability**: Same logic in multiple places
- **Maintainability**: Centralized business logic

## Basic Stored Procedure Syntax

### PostgreSQL Syntax

```sql
CREATE OR REPLACE FUNCTION function_name(param1 type, param2 type)
RETURNS return_type AS $$
BEGIN
    -- SQL statements
    RETURN value;
END;
$$ LANGUAGE plpgsql;
```

### MySQL Syntax

```sql
DELIMITER //
CREATE PROCEDURE procedure_name(IN param1 type, OUT param2 type)
BEGIN
    -- SQL statements
END //
DELIMITER ;
```

## Simple Examples

### Example 1: Basic Procedure

```sql
-- PostgreSQL: Get user by ID
CREATE OR REPLACE FUNCTION get_user(user_id INTEGER)
RETURNS TABLE(id INTEGER, name VARCHAR, email VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.name, u.email
    FROM users u
    WHERE u.id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Call procedure
SELECT * FROM get_user(1);
```

### Example 2: Procedure with Parameters

```sql
-- Create user procedure
CREATE OR REPLACE FUNCTION create_user(
    p_name VARCHAR,
    p_email VARCHAR,
    p_password_hash VARCHAR
)
RETURNS INTEGER AS $$
DECLARE
    new_user_id INTEGER;
BEGIN
    INSERT INTO users (name, email, password_hash)
    VALUES (p_name, p_email, p_password_hash)
    RETURNING id INTO new_user_id;
    
    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql;

-- Call procedure
SELECT create_user('John Doe', 'john@example.com', 'hashed_password');
```

### Example 3: Procedure with Output Parameters

```sql
-- Get user statistics
CREATE OR REPLACE FUNCTION get_user_stats(
    p_user_id INTEGER,
    OUT order_count INTEGER,
    OUT total_spent DECIMAL
) AS $$
BEGIN
    SELECT 
        COUNT(*),
        COALESCE(SUM(total), 0)
    INTO order_count, total_spent
    FROM orders
    WHERE user_id = p_user_id
      AND status = 'completed';
END;
$$ LANGUAGE plpgsql;

-- Call procedure
SELECT * FROM get_user_stats(1);
```

## Real-World Examples

### Example 1: Order Processing

```sql
-- Complete order processing procedure
CREATE OR REPLACE FUNCTION process_order(
    p_user_id INTEGER,
    p_items JSONB  -- Array of {product_id, quantity}
)
RETURNS INTEGER AS $$
DECLARE
    new_order_id INTEGER;
    item JSONB;
    product_price DECIMAL;
    order_total DECIMAL := 0;
BEGIN
    -- Start transaction (implicit in procedure)
    
    -- Create order
    INSERT INTO orders (user_id, total, status)
    VALUES (p_user_id, 0, 'pending')
    RETURNING id INTO new_order_id;
    
    -- Process each item
    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- Get product price
        SELECT price INTO product_price
        FROM products
        WHERE id = (item->>'product_id')::INTEGER
          AND stock_quantity >= (item->>'quantity')::INTEGER;
        
        -- Check if product exists and in stock
        IF product_price IS NULL THEN
            RAISE EXCEPTION 'Product not found or out of stock';
        END IF;
        
        -- Add order item
        INSERT INTO order_items (order_id, product_id, quantity, price)
        VALUES (
            new_order_id,
            (item->>'product_id')::INTEGER,
            (item->>'quantity')::INTEGER,
            product_price
        );
        
        -- Update inventory
        UPDATE products
        SET stock_quantity = stock_quantity - (item->>'quantity')::INTEGER
        WHERE id = (item->>'product_id')::INTEGER;
        
        -- Calculate total
        order_total := order_total + (product_price * (item->>'quantity')::INTEGER);
    END LOOP;
    
    -- Update order total
    UPDATE orders
    SET total = order_total
    WHERE id = new_order_id;
    
    RETURN new_order_id;
END;
$$ LANGUAGE plpgsql;

-- Call procedure
SELECT process_order(
    1,
    '[
        {"product_id": 1, "quantity": 2},
        {"product_id": 2, "quantity": 1}
    ]'::JSONB
);
```

### Example 2: User Registration with Validation

```sql
-- User registration with validation
CREATE OR REPLACE FUNCTION register_user(
    p_email VARCHAR,
    p_name VARCHAR,
    p_password_hash VARCHAR
)
RETURNS INTEGER AS $$
DECLARE
    new_user_id INTEGER;
    email_exists BOOLEAN;
BEGIN
    -- Check if email exists
    SELECT EXISTS(SELECT 1 FROM users WHERE email = p_email) INTO email_exists;
    
    IF email_exists THEN
        RAISE EXCEPTION 'Email already registered';
    END IF;
    
    -- Validate email format (basic)
    IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid email format';
    END IF;
    
    -- Create user
    INSERT INTO users (email, name, password_hash, is_active, is_email_verified)
    VALUES (p_email, p_name, p_password_hash, true, false)
    RETURNING id INTO new_user_id;
    
    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql;

-- Call procedure
SELECT register_user('newuser@example.com', 'New User', 'hashed_password');
```

### Example 3: Monthly Report Generation

```sql
-- Generate monthly sales report
CREATE OR REPLACE FUNCTION generate_monthly_report(
    p_month DATE
)
RETURNS TABLE(
    order_count BIGINT,
    total_revenue DECIMAL,
    unique_customers BIGINT,
    avg_order_value DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT AS order_count,
        COALESCE(SUM(total), 0) AS total_revenue,
        COUNT(DISTINCT user_id)::BIGINT AS unique_customers,
        COALESCE(AVG(total), 0) AS avg_order_value
    FROM orders
    WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', p_month)
      AND status = 'completed';
END;
$$ LANGUAGE plpgsql;

-- Call procedure
SELECT * FROM generate_monthly_report('2024-11-01');
```

## Error Handling

### Exception Handling

```sql
-- Procedure with error handling
CREATE OR REPLACE FUNCTION safe_update_price(
    p_product_id INTEGER,
    p_new_price DECIMAL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Validate price
    IF p_new_price <= 0 THEN
        RAISE EXCEPTION 'Price must be greater than 0';
    END IF;
    
    -- Update price
    UPDATE products
    SET price = p_new_price
    WHERE id = p_product_id;
    
    -- Check if product exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found';
    END IF;
    
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error (in real application)
        RAISE;
END;
$$ LANGUAGE plpgsql;
```

## Calling Stored Procedures

### From SQL

```sql
-- Call procedure
SELECT * FROM get_user(1);

-- Call with parameters
SELECT create_user('John', 'john@example.com', 'hash');

-- Call with output
SELECT * FROM get_user_stats(1);
```

### From Application Code

**Python (psycopg2):**
```python
# Call stored procedure
cursor.callproc('get_user', [1])
result = cursor.fetchall()
```

**Node.js (pg):**
```javascript
// Call stored procedure
const result = await db.query('SELECT * FROM get_user($1)', [1]);
```

**SQLAlchemy:**
```python
# Call stored procedure
result = session.execute(
    text("SELECT * FROM get_user(:user_id)"),
    {"user_id": 1}
)
```

## Advanced Patterns

### Pattern 1: Cursor for Large Results

```sql
-- Return cursor for large result sets
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS REFCURSOR AS $$
DECLARE
    user_cursor REFCURSOR;
BEGIN
    OPEN user_cursor FOR
    SELECT id, name, email
    FROM users
    ORDER BY created_at;
    
    RETURN user_cursor;
END;
$$ LANGUAGE plpgsql;

-- Use cursor
BEGIN;
SELECT get_all_users();
FETCH ALL FROM "<unnamed portal 1>";
COMMIT;
```

### Pattern 2: Dynamic SQL

```sql
-- Dynamic query based on parameters
CREATE OR REPLACE FUNCTION search_products(
    p_search_term VARCHAR,
    p_category_id INTEGER DEFAULT NULL
)
RETURNS TABLE(id INTEGER, name VARCHAR, price DECIMAL) AS $$
DECLARE
    query_text TEXT;
BEGIN
    query_text := '
        SELECT id, name, price
        FROM products
        WHERE name ILIKE ''%' || p_search_term || '%''
    ';
    
    IF p_category_id IS NOT NULL THEN
        query_text := query_text || ' AND category_id = ' || p_category_id;
    END IF;
    
    RETURN QUERY EXECUTE query_text;
END;
$$ LANGUAGE plpgsql;
```

## Performance Benefits

### 1. Precompiled Execution

```sql
-- Procedure is compiled once
CREATE OR REPLACE FUNCTION get_user(user_id INTEGER) ...

-- Subsequent calls are faster (no parsing/planning)
SELECT * FROM get_user(1);  -- Fast!
SELECT * FROM get_user(2);  -- Fast!
```

### 2. Reduced Network Traffic

```sql
-- Instead of multiple queries from application:
-- 1. SELECT * FROM users WHERE id = 1
-- 2. SELECT COUNT(*) FROM orders WHERE user_id = 1
-- 3. SELECT SUM(total) FROM orders WHERE user_id = 1

-- Single procedure call:
SELECT * FROM get_user_complete_stats(1);
-- Returns all data in one call
```

## Security Benefits

### 1. Access Control

```sql
-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user(INTEGER) TO app_user;

-- Revoke direct table access
REVOKE SELECT ON users FROM app_user;

-- Users can only access through procedure
```

### 2. Input Validation

```sql
-- Procedure validates input
CREATE OR REPLACE FUNCTION update_user_email(
    p_user_id INTEGER,
    p_new_email VARCHAR
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Validate email format
    IF p_new_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid email format';
    END IF;
    
    -- Check if email exists
    IF EXISTS(SELECT 1 FROM users WHERE email = p_new_email) THEN
        RAISE EXCEPTION 'Email already in use';
    END IF;
    
    -- Update email
    UPDATE users SET email = p_new_email WHERE id = p_user_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;
```

## Best Practices

1. **Use Meaningful Names**: Clear procedure names
2. **Document Parameters**: Comment what each parameter does
3. **Handle Errors**: Use exception handling
4. **Validate Input**: Check parameters before use
5. **Return Consistent Types**: Use consistent return types
6. **Test Thoroughly**: Test all code paths

## Common Mistakes

### ❌ No Error Handling

```sql
-- ❌ Bad: No error handling
CREATE OR REPLACE FUNCTION divide(a INTEGER, b INTEGER)
RETURNS INTEGER AS $$
BEGIN
    RETURN a / b;  -- Crashes if b = 0
END;
$$ LANGUAGE plpgsql;

-- ✅ Good: Error handling
CREATE OR REPLACE FUNCTION divide(a INTEGER, b INTEGER)
RETURNS INTEGER AS $$
BEGIN
    IF b = 0 THEN
        RAISE EXCEPTION 'Division by zero';
    END IF;
    RETURN a / b;
END;
$$ LANGUAGE plpgsql;
```

### ❌ SQL Injection in Dynamic SQL

```sql
-- ❌ Bad: SQL injection risk
CREATE OR REPLACE FUNCTION search_products(search_term VARCHAR)
RETURNS TABLE(...) AS $$
BEGIN
    RETURN QUERY EXECUTE 'SELECT * FROM products WHERE name LIKE ''%' || search_term || '%''';
END;
$$ LANGUAGE plpgsql;

-- ✅ Good: Use parameters
CREATE OR REPLACE FUNCTION search_products(search_term VARCHAR)
RETURNS TABLE(...) AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM products
    WHERE name LIKE '%' || search_term || '%';
END;
$$ LANGUAGE plpgsql;
```

## Summary

**Stored Procedures Essentials:**

1. **Purpose**: Precompiled SQL code stored in database
2. **Benefits**: Performance, security, reusability
3. **Syntax**: CREATE FUNCTION/PROCEDURE with parameters
4. **Error Handling**: Use exception handling
5. **Security**: Control access, validate input
6. **Performance**: Precompiled, reduced network traffic

**Key Takeaway:**
Stored procedures encapsulate business logic in the database, improving performance and security. They're precompiled for faster execution and can control database access. Use them for complex operations, data validation, and centralized business logic.

**When to Use:**
- Complex business logic
- Performance-critical operations
- Security-sensitive operations
- Reusable database operations
- Data validation

**Common Use Cases:**
- Order processing
- User registration
- Report generation
- Data migration
- Complex calculations

**Next Steps:**
- Learn [Triggers](triggers.md) for automated actions
- Study [Views](views.md) for simplified queries
- Master [Performance Optimization](../10_performance_optimization/) for tuning

