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

---

## 🎯 Interview Questions: Connection Pooling & Database Lifecycle

### Q1: Explain connection pooling in Express.js. Why is it critical for production applications?

**Answer:**

**Connection Pooling** = Reusing database connections instead of creating new ones for each request.

**Without Connection Pooling:**

```javascript
// ❌ Problem: Creates new connection per request
app.get('/users/:id', async (req, res) => {
    const client = new Client({ /* config */ });
    await client.connect(); // Slow: 50-100ms
    const result = await client.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    await client.end(); // Close connection
    res.json(result.rows[0]);
});

// 1000 requests = 1000 connections created/destroyed
// Time: 1000 * 100ms = 100 seconds
```

**With Connection Pooling:**

```javascript
// ✅ Solution: Reuse connections
const { Pool } = require('pg');
const pool = new Pool({
    max: 20,              // Maximum connections
    min: 2,               // Minimum connections
    idleTimeoutMillis: 30000
});

app.get('/users/:id', async (req, res) => {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    res.json(result.rows[0]);
    // Connection returned to pool automatically
});

// 1000 requests = Reuse 20 connections
// Time: ~10 seconds (50x faster)
```

**How It Works:**

```
Connection Pool:
┌─────────────────────────────────┐
│  Pool (20 connections)         │
│  ┌─────┐ ┌─────┐ ┌─────┐       │
│  │Conn1│ │Conn2│ │Conn3│ ...   │
│  └─────┘ └─────┘ └─────┘       │
└─────────────────────────────────┘
    │
    ├─ Request 1 → Gets Conn1 → Returns to pool
    ├─ Request 2 → Gets Conn2 → Returns to pool
    ├─ Request 3 → Gets Conn3 → Returns to pool
    └─ Request 4 → Waits (if all busy) → Gets available connection
```

**Performance Impact:**

```
Without Pooling:
├─ Connection creation: 50-100ms per request
├─ 1000 requests: 50-100 seconds
└─ Database overhead: High

With Pooling:
├─ Connection reuse: < 1ms per request
├─ 1000 requests: ~10 seconds
└─ Database overhead: Low
```

**Pool Configuration:**

```javascript
const pool = new Pool({
    host: process.env.DB_HOST,
    port: 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    
    // Pool settings
    max: 20,                    // Maximum connections
    min: 2,                     // Minimum connections (kept alive)
    idleTimeoutMillis: 30000,   // Close idle connections after 30s
    connectionTimeoutMillis: 2000, // Timeout waiting for connection
    
    // Connection settings
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000
});
```

**Sizing Guidelines:**

```
Pool Size:
├─ Small app (< 100 req/min): 5-10 connections
├─ Medium app (100-1000 req/min): 10-20 connections
├─ Large app (1000+ req/min): 20-50 connections
└─ Formula: (expected_concurrent_requests / avg_query_time_ms) * 2
```

---

### Q2: How do you handle connection pool exhaustion? What are the symptoms and solutions?

**Answer:**

**Connection Pool Exhaustion** = All connections in pool are busy, new requests wait or timeout.

**Symptoms:**

```javascript
// Error: Connection timeout
Error: Connection terminated unexpectedly
Error: timeout expired waiting for connection from pool

// Slow responses
// Requests taking 2+ seconds (waiting for connection)
```

**Causes:**

```javascript
// 1. Pool too small
const pool = new Pool({ max: 5 }); // Too small for 100 concurrent requests

// 2. Long-running queries
app.get('/slow-query', async (req, res) => {
    // Query takes 10 seconds
    await pool.query('SELECT * FROM large_table WHERE complex_condition...');
    // Connection held for 10 seconds
});

// 3. Connection leaks (not releasing)
app.get('/leak', async (req, res) => {
    const client = await pool.connect();
    // Forgot to release!
    // client.release(); // Missing
    res.json({});
});

// 4. Transaction not committed
await pool.query('BEGIN');
await pool.query('INSERT INTO ...');
// Forgot COMMIT → Connection held indefinitely
```

**Solutions:**

**1. Increase Pool Size:**

```javascript
// Calculate based on load
const poolSize = Math.ceil(
    (expectedConcurrentRequests * avgQueryTimeMs) / 1000
);

const pool = new Pool({
    max: poolSize, // e.g., 50 for high load
    min: 10
});
```

**2. Query Timeout:**

```javascript
// Set query timeout
const pool = new Pool({
    max: 20,
    statement_timeout: 5000 // 5 seconds max per query
});

// Or per query
await pool.query({
    text: 'SELECT * FROM ...',
    rowMode: 'array'
}, 5000); // 5 second timeout
```

**3. Connection Leak Detection:**

```javascript
// Monitor pool usage
setInterval(() => {
    const poolStats = {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
    };
    
    console.log('Pool stats:', poolStats);
    
    if (pool.waitingCount > 10) {
        console.warn('Many requests waiting for connections!');
    }
    
    if (pool.idleCount === 0 && pool.totalCount === pool.max) {
        console.error('Pool exhausted! All connections busy');
    }
}, 5000);
```

**4. Always Release Connections:**

```javascript
// ✅ Always use try-finally
app.get('/users/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
        res.json(result.rows[0]);
    } finally {
        client.release(); // Always release
    }
});

// ✅ Or use pool.query() (automatic release)
app.get('/users/:id', async (req, res) => {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    res.json(result.rows[0]);
    // Automatically released
});
```

**5. Graceful Degradation:**

```javascript
// Handle pool exhaustion gracefully
app.get('/users/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
        res.json(result.rows[0]);
    } catch (error) {
        if (error.code === 'ETIMEDOUT') {
            // Pool exhausted, return cached data or error
            return res.status(503).json({ 
                error: 'Service temporarily unavailable',
                retryAfter: 5
            });
        }
        throw error;
    }
});
```

---

### Q3: Explain database connection lifecycle in Express.js. How do you manage connections from startup to shutdown?

**Answer:**

**Connection Lifecycle:**

```
Application Start
    │
    ▼
Create Connection Pool
    │
    ▼
Request Arrives
    │
    ▼
Get Connection from Pool
    │
    ▼
Execute Query
    │
    ▼
Return Connection to Pool
    │
    ▼
Next Request (reuses connection)
    │
    ▼
Application Shutdown
    │
    ▼
Close All Connections
```

**Implementation:**

```javascript
// app.js
const { Pool } = require('pg');

// 1. Create pool at startup
const pool = new Pool({
    max: 20,
    min: 2,
    idleTimeoutMillis: 30000
});

// 2. Handle pool errors
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    // Don't exit - pool will create new connections
});

// 3. Use in routes
app.get('/users/:id', async (req, res) => {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    res.json(result.rows[0]);
});

// 4. Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing pool...');
    await pool.end(); // Close all connections
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, closing pool...');
    await pool.end();
    process.exit(0);
});
```

**Health Checks:**

```javascript
// Periodic health check
setInterval(async () => {
    try {
        const result = await pool.query('SELECT 1');
        console.log('Database connection healthy');
    } catch (error) {
        console.error('Database connection unhealthy:', error);
        // Alert monitoring system
    }
}, 30000); // Every 30 seconds
```

**Connection States:**

```
Connection States:
├─ Idle: Available in pool
├─ Active: Currently executing query
├─ Waiting: Request waiting for connection
└─ Closed: Connection closed/removed
```

**Monitoring:**

```javascript
// Pool metrics
function getPoolMetrics() {
    return {
        total: pool.totalCount,
        idle: pool.idleCount,
        active: pool.totalCount - pool.idleCount,
        waiting: pool.waitingCount,
        max: pool.options.max
    };
}

// Expose metrics endpoint
app.get('/metrics/pool', (req, res) => {
    res.json(getPoolMetrics());
});
```

---

### Q4: How do you implement connection pooling with multiple databases (read replicas) in Express.js?

**Answer:**

**Read Replicas** = Separate database servers for reads (scales read operations).

**Architecture:**

```
┌─────────────────┐
│  Primary DB     │
│  (Writes)       │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐ ┌─────────┐
│Replica 1│ │Replica 2│
│ (Reads) │ │ (Reads) │
└─────────┘ └─────────┘
```

**Implementation:**

```javascript
// config/database.js
const { Pool } = require('pg');

// Primary pool (writes)
const primaryPool = new Pool({
    host: process.env.DB_PRIMARY_HOST,
    database: process.env.DB_NAME,
    max: 20
});

// Replica pools (reads)
const replicaPools = [
    new Pool({
        host: process.env.DB_REPLICA1_HOST,
        database: process.env.DB_NAME,
        max: 10
    }),
    new Pool({
        host: process.env.DB_REPLICA2_HOST,
        database: process.env.DB_NAME,
        max: 10
    })
];

// Round-robin replica selection
let replicaIndex = 0;
function getReplicaPool() {
    const pool = replicaPools[replicaIndex];
    replicaIndex = (replicaIndex + 1) % replicaPools.length;
    return pool;
}

module.exports = {
    primary: primaryPool,
    replica: getReplicaPool
};
```

**Usage:**

```javascript
const { primary, replica } = require('./config/database');

// Writes: Use primary
app.post('/users', async (req, res) => {
    const result = await primary.query(
        'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
        [req.body.name, req.body.email]
    );
    res.json(result.rows[0]);
});

// Reads: Use replica
app.get('/users/:id', async (req, res) => {
    const replicaPool = replica(); // Get next replica
    const result = await replicaPool.query(
        'SELECT * FROM users WHERE id = $1',
        [req.params.id]
    );
    res.json(result.rows[0]);
});
```

**Read-Write Split Service:**

```javascript
class DatabaseService {
    constructor(primaryPool, replicaPools) {
        this.primary = primaryPool;
        this.replicas = replicaPools;
        this.replicaIndex = 0;
    }
    
    // Write operations
    async write(query, params) {
        return await this.primary.query(query, params);
    }
    
    // Read operations (load balanced)
    async read(query, params) {
        const replica = this.getReplica();
        return await replica.query(query, params);
    }
    
    getReplica() {
        const replica = this.replicas[this.replicaIndex];
        this.replicaIndex = (this.replicaIndex + 1) % this.replicas.length;
        return replica;
    }
}

// Usage
const db = new DatabaseService(primaryPool, replicaPools);

app.get('/users/:id', async (req, res) => {
    const result = await db.read('SELECT * FROM users WHERE id = $1', [req.params.id]);
    res.json(result.rows[0]);
});

app.post('/users', async (req, res) => {
    const result = await db.write(
        'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
        [req.body.name, req.body.email]
    );
    res.json(result.rows[0]);
});
```

**Replication Lag Handling:**

```javascript
// Problem: Replica might be behind primary
// Solution: Read-after-write consistency

app.post('/users', async (req, res) => {
    // Write to primary
    const result = await primary.query(
        'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
        [req.body.name, req.body.email]
    );
    
    // For immediate reads, use primary
    res.json(result.rows[0]);
});

app.get('/users/:id', async (req, res) => {
    // Check if recently written
    const recentlyWritten = await checkRecentlyWritten(req.params.id);
    
    if (recentlyWritten) {
        // Read from primary (consistent)
        const result = await primary.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
        res.json(result.rows[0]);
    } else {
        // Read from replica (eventually consistent is OK)
        const replicaPool = replica();
        const result = await replicaPool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
        res.json(result.rows[0]);
    }
});
```

---

## Summary

These interview questions cover:
- ✅ Connection pooling fundamentals and performance
- ✅ Pool exhaustion symptoms and solutions
- ✅ Connection lifecycle management
- ✅ Read replica implementation and load balancing
- ✅ Production best practices

Master these for senior-level interviews focusing on database performance and scalability.

