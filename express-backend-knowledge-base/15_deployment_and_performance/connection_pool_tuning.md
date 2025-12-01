# Connection Pool Tuning: Optimizing Database Connections

Connection pool tuning optimizes database connection usage. This guide covers tuning connection pools in Express.js applications.

## Pool Configuration

```javascript
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 20,              // Maximum connections
    min: 5,               // Minimum connections
    idleTimeoutMillis: 30000,  // Close idle connections after 30s
    connectionTimeoutMillis: 2000  // Timeout for getting connection
});
```

## Calculating Pool Size

```javascript
// Formula: (core_count * 2) + effective_spindle_count
// For most apps: 20-50 connections

const poolSize = Math.min(
    (os.cpus().length * 2) + 1,  // Based on CPU cores
    50  // Maximum
);

const pool = new Pool({
    max: poolSize,
    min: Math.floor(poolSize / 4)
});
```

## Real-World Examples

### Example 1: Optimized Pool

```javascript
const pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    max: 20,
    min: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    // Connection validation
    allowExitOnIdle: false
});

// Monitor pool
pool.on('connect', () => {
    console.log('New connection established');
});

pool.on('error', (err) => {
    console.error('Pool error:', err);
});

// Get pool stats
function getPoolStats() {
    return {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
    };
}
```

## Best Practices

1. **Right Size**: Calculate based on workload
2. **Monitor**: Track pool usage
3. **Timeouts**: Set appropriate timeouts
4. **Health Checks**: Validate connections
5. **Tune Iteratively**: Adjust based on metrics

## Summary

**Connection Pool Tuning:**

1. **Purpose**: Optimize database connection usage
2. **Configuration**: Max, min, timeouts
3. **Calculation**: Based on CPU cores and workload
4. **Best Practice**: Monitor, tune iteratively
5. **Benefits**: Better performance, resource usage

**Key Takeaway:**
Connection pool tuning optimizes database connection usage. Configure max and min connections based on workload. Use formula: (core_count * 2) + effective_spindle_count. Set appropriate timeouts. Monitor pool usage and tune iteratively. Validate connections with health checks.

**Tuning Strategy:**
- Calculate pool size
- Set timeouts
- Monitor usage
- Health check connections
- Tune iteratively

**Next Steps:**
- Learn [Connection Pooling](../03_data_layer_fundamentals/connection_pooling_and_lifecycles.md) for basics
- Study [Performance Optimization](performance_optimization.md) for tuning
- Master [Scaling Strategies](scaling_strategies.md) for growth

