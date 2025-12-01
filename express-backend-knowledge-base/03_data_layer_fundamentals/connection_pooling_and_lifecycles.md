# Connection Pooling and Lifecycles: Managing Database Connections in Express.js

Connection pooling is essential for managing database connections efficiently in Express.js applications. This guide covers connection pool setup, lifecycle management, and best practices.

## What is Connection Pooling?

**Connection pooling** maintains a pool of reusable database connections instead of creating new connections for each request. This improves performance and resource utilization.

### Without Connection Pooling

```javascript
// ❌ Bad: Create connection for each request
app.get('/users/:id', async (req, res) => {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'user',
        password: 'password',
        database: 'mydb'
    });
    
    const [rows] = await connection.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    await connection.end();  // Close connection
    
    res.json(rows[0]);
});
// Problem: Creating/closing connections is expensive
```

### With Connection Pooling

```javascript
// ✅ Good: Reuse connections from pool
const pool = mysql.createPool({
    connectionLimit: 10,
    host: 'localhost',
    user: 'user',
    password: 'password',
    database: 'mydb'
});

app.get('/users/:id', async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
    // Connection automatically returned to pool
});
// Benefit: Connections reused, much faster
```

**Explanation:**
Connection pooling reuses connections instead of creating new ones for each request, significantly improving performance.

## MySQL Connection Pooling

### Basic Pool Setup

```javascript
// mysql2 package
const mysql = require('mysql2/promise');

// Create connection pool
const pool = mysql.createPool({
    connectionLimit: 10,        // Maximum connections in pool
    host: 'localhost',
    user: 'user',
    password: 'password',
    database: 'mydb',
    waitForConnections: true,   // Wait if pool is full
    queueLimit: 0,              // No limit on queued requests
    enableKeepAlive: true,      // Keep connections alive
    keepAliveInitialDelay: 0
});

// Use pool in routes
app.get('/users/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

### Pool Configuration

```javascript
const pool = mysql.createPool({
    connectionLimit: 20,              // Base pool size
    maxIdle: 10,                      // Maximum idle connections
    idleTimeout: 60000,               // Close idle connections after 60s
    host: 'localhost',
    user: 'user',
    password: 'password',
    database: 'mydb',
    waitForConnections: true,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    reconnect: true                   // Auto-reconnect on connection loss
});
```

## PostgreSQL Connection Pooling

### Using pg (node-postgres)

```javascript
const { Pool } = require('pg');

// Create connection pool
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mydb',
    user: 'user',
    password: 'password',
    max: 20,                          // Maximum connections
    min: 5,                           // Minimum connections
    idleTimeoutMillis: 30000,         // Close idle connections after 30s
    connectionTimeoutMillis: 2000,   // Timeout when getting connection
});

// Use pool in routes
app.get('/users/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

### Pool Lifecycle Management

```javascript
// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('Closing connection pool...');
    await pool.end();  // Close all connections
    process.exit(0);
});
```

## Sequelize Connection Pooling

### Sequelize Pool Configuration

```javascript
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('mydb', 'user', 'password', {
    host: 'localhost',
    dialect: 'postgres',
    pool: {
        max: 20,                      // Maximum connections
        min: 5,                       // Minimum connections
        acquire: 30000,               // Timeout when getting connection
        idle: 10000                   // Close idle connections after 10s
    },
    logging: false
});

// Use in models
const User = sequelize.define('User', {
    name: Sequelize.STRING,
    email: Sequelize.STRING
});

// Routes use connection pool automatically
app.get('/users/:id', async (req, res) => {
    const user = await User.findByPk(req.params.id);
    res.json(user);
});
```

## Connection Lifecycle

### Connection States

```
1. Created → Added to pool
2. Acquired → Removed from pool, in use
3. Returned → Back to pool, available
4. Closed → Removed from pool (if error or timeout)
```

### Managing Connection Lifecycle

```javascript
// Manual connection management (if needed)
app.get('/users/:id', async (req, res) => {
    let connection;
    try {
        // Get connection from pool
        connection = await pool.getConnection();
        
        // Use connection
        const [rows] = await connection.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
        
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        // Always release connection back to pool
        if (connection) {
            connection.release();
        }
    }
});
```

## Real-World Examples

### Example 1: Express App with Connection Pool

```javascript
// db/pool.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    connectionLimit: 20,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    queueLimit: 0
});

module.exports = pool;

// routes/users.js
const pool = require('../db/pool');

router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
```

### Example 2: Connection Pool with Health Checks

```javascript
const pool = mysql.createPool({
    connectionLimit: 20,
    host: 'localhost',
    user: 'user',
    password: 'password',
    database: 'mydb',
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'healthy', pool: {
            total: pool.pool._allConnections.length,
            free: pool.pool._freeConnections.length,
            queued: pool.pool._connectionQueue.length
        }});
    } catch (error) {
        res.status(503).json({ status: 'unhealthy', error: error.message });
    }
});
```

### Example 3: Transaction with Connection Pool

```javascript
// Using connection for transaction
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

## Best Practices

### 1. Appropriate Pool Size

```javascript
// Calculate optimal pool size
// Formula: (core_count * 2) + effective_spindle_count
// Common values:
// Small app: 5-10 connections
// Medium app: 10-20 connections
// Large app: 20-50 connections

const pool = mysql.createPool({
    connectionLimit: 20,  // Adjust based on load
    // ...
});
```

### 2. Connection Timeout

```javascript
const pool = mysql.createPool({
    connectionLimit: 20,
    acquireTimeout: 30000,  // Wait max 30s for connection
    // ...
});
```

### 3. Health Checks

```javascript
// Periodic health check
setInterval(async () => {
    try {
        await pool.query('SELECT 1');
    } catch (error) {
        console.error('Pool health check failed:', error);
    }
}, 60000);  // Every minute
```

### 4. Graceful Shutdown

```javascript
// Close pool on app shutdown
process.on('SIGTERM', async () => {
    console.log('Closing connection pool...');
    await pool.end();
    process.exit(0);
});
```

## Common Issues

### Issue 1: Connection Exhaustion

```javascript
// Problem: All connections in use
// Symptoms: Requests timeout waiting for connection

// Solution: Increase pool size or optimize queries
const pool = mysql.createPool({
    connectionLimit: 50,  // Increase pool size
    // ...
});
```

### Issue 2: Stale Connections

```javascript
// Problem: Database closes idle connections
// Symptoms: Connection errors after idle period

// Solution: Enable keep-alive
const pool = mysql.createPool({
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    // ...
});
```

### Issue 3: Connection Leaks

```javascript
// Problem: Connections not returned to pool
// Symptoms: Pool exhausted, no connections available

// Solution: Always release connections
app.get('/users/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        // Use connection
        const [rows] = await connection.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
        res.json(rows[0]);
    } finally {
        connection.release();  // Always release
    }
});
```

## Summary

**Connection Pooling and Lifecycles:**

1. **Purpose**: Reuse connections instead of creating new ones
2. **Benefits**: Better performance, resource efficiency
3. **Configuration**: connectionLimit, timeouts, keep-alive
4. **Best Practices**: Appropriate size, health checks, graceful shutdown
5. **Common Issues**: Connection exhaustion, stale connections, leaks

**Key Takeaway:**
Connection pooling is essential for production Express.js applications. It reuses database connections, improving performance and resource efficiency. Configure pool size appropriately, enable keep-alive for long-running apps, and always release connections. Monitor pool usage and handle graceful shutdown.

**Pool Configuration:**
- Small app: 5-10 connections
- Medium app: 10-20 connections
- Large app: 20-50 connections

**Next Steps:**
- Learn [Transactions](../03_data_layer_fundamentals/transactions_in_async_world.md) for transaction management
- Study [Sequelize Deep Dive](../04_relational_databases_sql/sequelize_deep_dive.md) for ORM pooling
- Master [Performance Optimization](../15_deployment_and_performance/) for tuning

