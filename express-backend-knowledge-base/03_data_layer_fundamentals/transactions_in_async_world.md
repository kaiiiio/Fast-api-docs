# Transactions in Async World: Managing Database Transactions in Express.js

Transactions ensure data consistency by grouping multiple database operations into atomic units. This guide covers transaction management in Express.js with async/await.

## What are Transactions?

**Transactions** group multiple database operations into a single atomic unit. Either all operations succeed (commit) or all fail (rollback), ensuring data consistency.

### Transaction Properties (ACID)

```
- Atomicity: All or nothing
- Consistency: Data remains valid
- Isolation: Transactions don't interfere
- Durability: Committed changes persist
```

## Basic Transaction Pattern

### Without Transactions

```javascript
// ❌ Bad: No transaction
app.post('/orders', async (req, res) => {
    // Create order
    const [orderResult] = await pool.query(
        'INSERT INTO orders (user_id, total) VALUES (?, ?)',
        [req.body.user_id, req.body.total]
    );
    
    // If this fails, order is created but items are not
    // Data inconsistency!
    for (const item of req.body.items) {
        await pool.query(
            'INSERT INTO order_items (order_id, product_id, quantity) VALUES (?, ?, ?)',
            [orderResult.insertId, item.product_id, item.quantity]
        );
    }
    
    res.json({ orderId: orderResult.insertId });
});
```

### With Transactions

```javascript
// ✅ Good: With transaction
app.post('/orders', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        // Create order
        const [orderResult] = await connection.query(
            'INSERT INTO orders (user_id, total) VALUES (?, ?)',
            [req.body.user_id, req.body.total]
        );
        
        // Create order items
        for (const item of req.body.items) {
            await connection.query(
                'INSERT INTO order_items (order_id, product_id, quantity) VALUES (?, ?, ?)',
                [orderResult.insertId, item.product_id, item.quantity]
            );
        }
        
        await connection.commit();
        res.json({ orderId: orderResult.insertId });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});
```

**Explanation:**
If any operation fails, the transaction is rolled back, ensuring data consistency. All operations succeed together or fail together.

## MySQL Transactions

### Using mysql2

```javascript
const mysql = require('mysql2/promise');

app.post('/transfer', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        // Deduct from source account
        await connection.query(
            'UPDATE accounts SET balance = balance - ? WHERE id = ?',
            [req.body.amount, req.body.from_account_id]
        );
        
        // Add to destination account
        await connection.query(
            'UPDATE accounts SET balance = balance + ? WHERE id = ?',
            [req.body.amount, req.body.to_account_id]
        );
        
        await connection.commit();
        res.json({ success: true });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});
```

## PostgreSQL Transactions

### Using pg

```javascript
const { Pool } = require('pg');

app.post('/transfer', async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Deduct from source account
        await client.query(
            'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
            [req.body.amount, req.body.from_account_id]
        );
        
        // Add to destination account
        await client.query(
            'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
            [req.body.amount, req.body.to_account_id]
        );
        
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});
```

## Sequelize Transactions

### Using Sequelize

```javascript
const { Sequelize } = require('sequelize');

app.post('/orders', async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        // Create order
        const order = await Order.create({
            user_id: req.body.user_id,
            total: req.body.total
        }, { transaction });
        
        // Create order items
        await OrderItem.bulkCreate(
            req.body.items.map(item => ({
                order_id: order.id,
                product_id: item.product_id,
                quantity: item.quantity
            })),
            { transaction }
        );
        
        await transaction.commit();
        res.json({ orderId: order.id });
    } catch (error) {
        await transaction.rollback();
        res.status(500).json({ error: error.message });
    }
});
```

## Real-World Examples

### Example 1: E-Commerce Order Creation

```javascript
app.post('/orders', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        // 1. Create order
        const [orderResult] = await connection.query(
            'INSERT INTO orders (user_id, total, status) VALUES (?, ?, ?)',
            [req.body.user_id, req.body.total, 'pending']
        );
        const orderId = orderResult.insertId;
        
        // 2. Create order items
        for (const item of req.body.items) {
            await connection.query(
                'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                [orderId, item.product_id, item.quantity, item.price]
            );
        }
        
        // 3. Update inventory
        for (const item of req.body.items) {
            const [inventory] = await connection.query(
                'SELECT quantity FROM inventory WHERE product_id = ?',
                [item.product_id]
            );
            
            if (inventory[0].quantity < item.quantity) {
                throw new Error('Insufficient inventory');
            }
            
            await connection.query(
                'UPDATE inventory SET quantity = quantity - ? WHERE product_id = ?',
                [item.quantity, item.product_id]
            );
        }
        
        // 4. Process payment
        await connection.query(
            'INSERT INTO payments (order_id, amount, status) VALUES (?, ?, ?)',
            [orderId, req.body.total, 'completed']
        );
        
        await connection.commit();
        res.json({ orderId, status: 'created' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});
```

### Example 2: User Registration with Profile

```javascript
app.post('/register', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        // 1. Create user
        const [userResult] = await connection.query(
            'INSERT INTO users (email, password_hash) VALUES (?, ?)',
            [req.body.email, hashedPassword]
        );
        const userId = userResult.insertId;
        
        // 2. Create profile
        await connection.query(
            'INSERT INTO profiles (user_id, name, phone) VALUES (?, ?, ?)',
            [userId, req.body.name, req.body.phone]
        );
        
        // 3. Assign default role
        await connection.query(
            'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
            [userId, 1]  // Default role ID
        );
        
        await connection.commit();
        res.json({ userId, message: 'User created successfully' });
    } catch (error) {
        await connection.rollback();
        
        // Handle duplicate email
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Email already exists' });
        }
        
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});
```

### Example 3: Transaction Helper Function

```javascript
// utils/transaction.js
async function withTransaction(pool, callback) {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        const result = await callback(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

// Use helper
app.post('/orders', async (req, res) => {
    try {
        const orderId = await withTransaction(pool, async (connection) => {
            const [orderResult] = await connection.query(
                'INSERT INTO orders (user_id, total) VALUES (?, ?)',
                [req.body.user_id, req.body.total]
            );
            
            for (const item of req.body.items) {
                await connection.query(
                    'INSERT INTO order_items (order_id, product_id, quantity) VALUES (?, ?, ?)',
                    [orderResult.insertId, item.product_id, item.quantity]
                );
            }
            
            return orderResult.insertId;
        });
        
        res.json({ orderId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

## Best Practices

### 1. Always Use Try-Catch-Finally

```javascript
// ✅ Good: Proper error handling
const connection = await pool.getConnection();
try {
    await connection.beginTransaction();
    // ... operations
    await connection.commit();
} catch (error) {
    await connection.rollback();
    throw error;
} finally {
    connection.release();
}
```

### 2. Keep Transactions Short

```javascript
// ✅ Good: Short transaction
await connection.beginTransaction();
await connection.query('UPDATE ...');
await connection.query('INSERT ...');
await connection.commit();

// ❌ Bad: Long transaction (blocks other operations)
await connection.beginTransaction();
await connection.query('UPDATE ...');
await someSlowOperation();  // Don't do this!
await connection.query('INSERT ...');
await connection.commit();
```

### 3. Handle Specific Errors

```javascript
try {
    await connection.beginTransaction();
    // ... operations
    await connection.commit();
} catch (error) {
    await connection.rollback();
    
    if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Duplicate entry' });
    }
    
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({ error: 'Invalid reference' });
    }
    
    throw error;
}
```

## Common Mistakes

### ❌ Forgetting to Release Connection

```javascript
// ❌ Bad: Connection not released
app.post('/orders', async (req, res) => {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    // ... operations
    await connection.commit();
    // Missing: connection.release()
    // Connection leak!
});

// ✅ Good: Always release
app.post('/orders', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        // ... operations
        await connection.commit();
    } finally {
        connection.release();  // Always release
    }
});
```

### ❌ Nested Transactions

```javascript
// ❌ Bad: Nested transactions (not supported in MySQL)
await connection.beginTransaction();
await connection.query('INSERT ...');
await connection.beginTransaction();  // Error!
await connection.query('INSERT ...');
await connection.commit();
await connection.commit();
```

## Summary

**Transactions in Async World:**

1. **Purpose**: Ensure data consistency by grouping operations
2. **Pattern**: BEGIN → operations → COMMIT/ROLLBACK
3. **Error Handling**: Always use try-catch-finally
4. **Best Practice**: Keep transactions short, always release connections
5. **Common Issues**: Connection leaks, nested transactions

**Key Takeaway:**
Transactions ensure data consistency by grouping multiple database operations into atomic units. Use transactions for operations that must succeed or fail together. Always handle errors properly with try-catch-finally, and always release connections. Keep transactions short to avoid blocking other operations.

**Transaction Pattern:**
- Get connection from pool
- Begin transaction
- Execute operations
- Commit on success, rollback on error
- Always release connection

**Next Steps:**
- Learn [Connection Pooling](connection_pooling_and_lifecycles.md) for pool management
- Study [Sequelize Deep Dive](../04_relational_databases_sql/sequelize_deep_dive.md) for ORM transactions
- Master [Data Validation](../03_data_layer_fundamentals/data_validation_vs_business_validation.md) for validation

---

## 🎯 Interview Questions: Transactions & Data Consistency

### Q1: Explain database transactions in Express.js. How do you ensure atomicity in async operations?

**Answer:**

**Transactions** group multiple database operations into a **single atomic unit** - all succeed or all fail.

**Basic Transaction:**

```javascript
const { Pool } = require('pg');
const pool = new Pool();

app.post('/orders', async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Operation 1: Create order
        const orderResult = await client.query(
            'INSERT INTO orders (user_id, total) VALUES ($1, $2) RETURNING *',
            [req.body.userId, req.body.total]
        );
        
        // Operation 2: Update inventory
        await client.query(
            'UPDATE inventory SET quantity = quantity - $1 WHERE product_id = $2',
            [req.body.quantity, req.body.productId]
        );
        
        // Operation 3: Create payment
        await client.query(
            'INSERT INTO payments (order_id, amount) VALUES ($1, $2)',
            [orderResult.rows[0].id, req.body.total]
        );
        
        await client.query('COMMIT');
        res.json(orderResult.rows[0]);
        
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release(); // Always release connection
    }
});
```

**Transaction Flow:**

```
BEGIN Transaction
    │
    ├─ Operation 1: Create Order
    ├─ Operation 2: Update Inventory
    └─ Operation 3: Create Payment
    │
    ├─ All succeed → COMMIT ✅
    └─ Any fails → ROLLBACK ❌
```

**Why Atomicity Matters:**

```javascript
// ❌ Problem: Without transaction
app.post('/transfer', async (req, res) => {
    // Step 1: Deduct from account A
    await db.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [100, 'A']);
    
    // Server crashes here → Account A lost $100, Account B didn't receive
    
    // Step 2: Add to account B
    await db.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [100, 'B']);
});

// ✅ Solution: With transaction
app.post('/transfer', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [100, 'A']);
        await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [100, 'B']);
        
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (error) {
        await client.query('ROLLBACK'); // Both operations rolled back
        throw error;
    } finally {
        client.release();
    }
});
```

---

### Q2: How do you handle distributed transactions across multiple services in a microservices architecture?

**Answer:**

**Distributed Transactions** = Transactions spanning multiple services (hard to implement with ACID).

**Challenge:**

```
Service A (Orders)     Service B (Inventory)     Service C (Payments)
    │                        │                        │
    ├─ Create Order          │                        │
    │                        ├─ Reserve Inventory     │
    │                        │                        ├─ Charge Payment
    │                        │                        │
    └─ If any fails, all must rollback (hard across services)
```

**Solution 1: Saga Pattern (Recommended):**

```javascript
// Saga: Sequence of local transactions with compensation

class OrderSaga {
    async createOrder(orderData) {
        const steps = [];
        
        try {
            // Step 1: Create order
            const order = await orderService.create(orderData);
            steps.push({ type: 'order', id: order.id, compensate: () => orderService.cancel(order.id) });
            
            // Step 2: Reserve inventory
            await inventoryService.reserve(orderData.productId, orderData.quantity);
            steps.push({ type: 'inventory', compensate: () => inventoryService.release(orderData.productId, orderData.quantity) });
            
            // Step 3: Charge payment
            await paymentService.charge(orderData.userId, orderData.amount);
            steps.push({ type: 'payment', compensate: () => paymentService.refund(orderData.userId, orderData.amount) });
            
            return order;
            
        } catch (error) {
            // Compensate in reverse order
            for (let i = steps.length - 1; i >= 0; i--) {
                await steps[i].compensate();
            }
            throw error;
        }
    }
}
```

**Solution 2: Two-Phase Commit (Complex):**

```javascript
// Coordinator manages transaction across services
class TransactionCoordinator {
    async execute(services, operations) {
        // Phase 1: Prepare (all services ready to commit)
        const prepared = [];
        for (const service of services) {
            try {
                await service.prepare(operations[service.name]);
                prepared.push(service);
            } catch (error) {
                // Abort all
                for (const s of prepared) {
                    await s.abort();
                }
                throw error;
            }
        }
        
        // Phase 2: Commit (all services commit)
        for (const service of prepared) {
            await service.commit();
        }
    }
}
```

**Solution 3: Event Sourcing + Outbox Pattern:**

```javascript
// Use events for eventual consistency

// Service A: Create order, emit event
await orderService.create(orderData);
await eventBus.emit('order.created', { orderId: order.id, ...orderData });

// Service B: Listen to event, reserve inventory
eventBus.on('order.created', async (event) => {
    await inventoryService.reserve(event.productId, event.quantity);
    await eventBus.emit('inventory.reserved', { orderId: event.orderId });
});

// Service C: Listen to event, charge payment
eventBus.on('inventory.reserved', async (event) => {
    await paymentService.charge(event.userId, event.amount);
});
```

**Comparison:**

| Approach | Complexity | Consistency | Use Case |
|----------|-----------|-------------|----------|
| **Saga** | Medium | Eventually consistent | Most microservices |
| **2PC** | High | Strong consistency | Critical systems |
| **Events** | Medium | Eventually consistent | Event-driven systems |

---

### Q3: Explain transaction isolation levels. How do they affect concurrent operations in Express.js?

**Answer:**

**Isolation Levels** control how transactions see each other's changes.

**Levels (from weakest to strongest):**

**1. READ UNCOMMITTED (Lowest):**

```javascript
// Transaction 1
await client.query('BEGIN');
await client.query('UPDATE users SET balance = balance - 100 WHERE id = 1');
// Not committed yet

// Transaction 2 (READ UNCOMMITTED)
await client2.query('BEGIN');
const result = await client2.query('SELECT balance FROM users WHERE id = 1');
// Sees uncommitted change: balance = 900 (dirty read)
```

**2. READ COMMITTED (PostgreSQL Default):**

```javascript
// Transaction 1
await client.query('BEGIN');
await client.query('UPDATE users SET balance = balance - 100 WHERE id = 1');
// Not committed

// Transaction 2 (READ COMMITTED)
await client2.query('BEGIN');
const result = await client2.query('SELECT balance FROM users WHERE id = 1');
// Waits for Transaction 1 to commit
// Sees committed value only
```

**3. REPEATABLE READ:**

```javascript
// Transaction 1
await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ');
const user1 = await client.query('SELECT balance FROM users WHERE id = 1');
// Reads: balance = 1000

// Transaction 2 (concurrent)
await client2.query('UPDATE users SET balance = 1500 WHERE id = 1');
await client2.query('COMMIT');

// Transaction 1 (same query again)
const user2 = await client.query('SELECT balance FROM users WHERE id = 1');
// Still reads: balance = 1000 (same as first read - repeatable)
```

**4. SERIALIZABLE (Highest):**

```javascript
// Prevents all anomalies (phantom reads, etc.)
// Most restrictive, slowest performance

await client.query('BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE');
// All transactions execute as if serial (one after another)
```

**Visual Comparison:**

```
READ UNCOMMITTED:
├─ Dirty reads: ✅ Possible
├─ Non-repeatable reads: ✅ Possible
└─ Phantom reads: ✅ Possible

READ COMMITTED:
├─ Dirty reads: ❌ Prevented
├─ Non-repeatable reads: ✅ Possible
└─ Phantom reads: ✅ Possible

REPEATABLE READ:
├─ Dirty reads: ❌ Prevented
├─ Non-repeatable reads: ❌ Prevented
└─ Phantom reads: ✅ Possible

SERIALIZABLE:
├─ Dirty reads: ❌ Prevented
├─ Non-repeatable reads: ❌ Prevented
└─ Phantom reads: ❌ Prevented
```

**Express.js Usage:**

```javascript
// Set isolation level per transaction
app.post('/transfer', async (req, res) => {
    const client = await pool.connect();
    try {
        // Use SERIALIZABLE for financial transactions
        await client.query('BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE');
        
        await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [100, 'A']);
        await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [100, 'B']);
        
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
});
```

---

## Summary

These interview questions cover:
- ✅ Transaction fundamentals and atomicity
- ✅ Distributed transactions in microservices
- ✅ Transaction isolation levels
- ✅ Saga pattern and compensation
- ✅ Real-world transaction scenarios

Master these for senior-level interviews focusing on data consistency and transaction management.

