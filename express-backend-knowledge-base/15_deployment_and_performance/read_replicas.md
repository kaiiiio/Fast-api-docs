# Read Replicas: Scaling Database Reads

Read replicas distribute read load across multiple database instances. This guide covers using read replicas in Express.js applications.

## What are Read Replicas?

**Read replicas** are copies of the primary database that handle read operations, reducing load on the primary.

## Implementation

```javascript
const { Pool } = require('pg');

// Primary (writes)
const writePool = new Pool({
    host: process.env.DB_PRIMARY_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

// Read replicas (reads)
const readPools = [
    new Pool({
        host: process.env.DB_REPLICA1_HOST,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD
    }),
    new Pool({
        host: process.env.DB_REPLICA2_HOST,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD
    })
];

let replicaIndex = 0;

function getReadConnection() {
    const pool = readPools[replicaIndex];
    replicaIndex = (replicaIndex + 1) % readPools.length;
    return pool;
}
```

## Real-World Examples

### Example 1: Read/Write Separation

```javascript
// Read operations use replicas
app.get('/users', async (req, res) => {
    const readPool = getReadConnection();
    const result = await readPool.query('SELECT * FROM users');
    res.json(result.rows);
});

// Write operations use primary
app.post('/users', async (req, res) => {
    const result = await writePool.query(
        'INSERT INTO users (email, name) VALUES ($1, $2) RETURNING *',
        [req.body.email, req.body.name]
    );
    res.status(201).json(result.rows[0]);
});
```

### Example 2: Health-Checked Replicas

```javascript
const healthyReplicas = [];

async function checkReplicaHealth() {
    healthyReplicas.length = 0;
    
    for (const pool of readPools) {
        try {
            await pool.query('SELECT 1');
            healthyReplicas.push(pool);
        } catch (error) {
            console.error('Replica unhealthy:', error);
        }
    }
    
    if (healthyReplicas.length === 0) {
        // Fallback to primary
        healthyReplicas.push(writePool);
    }
}

// Check health periodically
setInterval(checkReplicaHealth, 30000);

function getReadConnection() {
    if (healthyReplicas.length === 0) {
        return writePool;  // Fallback
    }
    const index = Math.floor(Math.random() * healthyReplicas.length);
    return healthyReplicas[index];
}
```

## Best Practices

1. **Health Checks**: Monitor replica health
2. **Fallback**: Use primary if replicas fail
3. **Load Balancing**: Distribute reads evenly
4. **Monitor Lag**: Track replication lag
5. **Separate Writes**: Always write to primary

## Summary

**Read Replicas:**

1. **Purpose**: Scale database reads
2. **Implementation**: Separate pools for reads/writes
3. **Best Practice**: Health checks, fallback, load balancing
4. **Benefits**: Reduced primary load, better performance
5. **Use Cases**: High read workloads

**Key Takeaway:**
Read replicas distribute read load across multiple database instances. Use separate connection pools for reads (replicas) and writes (primary). Implement health checks and fallback to primary if replicas fail. Load balance reads across replicas. Monitor replication lag.

**Replica Strategy:**
- Separate read/write pools
- Health check replicas
- Fallback to primary
- Load balance reads
- Monitor lag

**Next Steps:**
- Learn [Connection Pooling](../03_data_layer_fundamentals/connection_pooling_and_lifecycles.md) for pool management
- Study [Scaling Strategies](scaling_strategies.md) for growth
- Master [Performance Optimization](performance_optimization.md) for tuning

