# Health Checks: Monitoring Application and Dependencies

Health checks verify application and dependency health. This guide covers implementing health checks in Express.js applications.

## Basic Health Checks

### Liveness Check

```javascript
// Liveness: Is app running?
app.get('/health/live', (req, res) => {
    res.json({ status: 'alive', timestamp: new Date().toISOString() });
});
```

### Readiness Check

```javascript
// Readiness: Can app serve traffic?
app.get('/health/ready', async (req, res) => {
    const checks = {
        database: await checkDatabase(),
        cache: await checkCache()
    };
    
    const allHealthy = Object.values(checks).every(check => check.healthy);
    
    res.status(allHealthy ? 200 : 503).json({
        status: allHealthy ? 'ready' : 'not_ready',
        checks
    });
});

async function checkDatabase() {
    try {
        await sequelize.authenticate();
        return { healthy: true };
    } catch (error) {
        return { healthy: false, error: error.message };
    }
}

async function checkCache() {
    try {
        await redis.ping();
        return { healthy: true };
    } catch (error) {
        return { healthy: false, error: error.message };
    }
}
```

## Real-World Examples

### Example 1: Comprehensive Health Check

```javascript
app.get('/health', async (req, res) => {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        checks: {}
    };
    
    // Database check
    try {
        await sequelize.query('SELECT 1');
        health.checks.database = { status: 'healthy' };
    } catch (error) {
        health.checks.database = { status: 'unhealthy', error: error.message };
        health.status = 'unhealthy';
    }
    
    // Cache check
    try {
        await redis.ping();
        health.checks.cache = { status: 'healthy' };
    } catch (error) {
        health.checks.cache = { status: 'unhealthy', error: error.message };
        health.status = 'unhealthy';
    }
    
    // External service check
    try {
        const response = await axios.get('https://api.external.com/health', { timeout: 5000 });
        health.checks.external_api = { status: 'healthy' };
    } catch (error) {
        health.checks.external_api = { status: 'unhealthy', error: error.message };
        // Don't fail overall health for external services
    }
    
    res.status(health.status === 'healthy' ? 200 : 503).json(health);
});
```

## Best Practices

1. **Separate Endpoints**: Liveness vs readiness
2. **Check Dependencies**: Database, cache, external services
3. **Fast Response**: Health checks should be fast
4. **Timeout**: Set timeouts for checks
5. **Status Codes**: 200 for healthy, 503 for unhealthy

## Summary

**Health Checks:**

1. **Purpose**: Monitor application and dependency health
2. **Types**: Liveness, readiness
3. **Checks**: Database, cache, external services
4. **Best Practice**: Fast, timeout, proper status codes
5. **Benefits**: Orchestration, monitoring, routing

**Key Takeaway:**
Health checks verify application and dependency health. Use liveness checks for app running status. Use readiness checks for serving traffic capability. Check all dependencies (database, cache, external services). Make health checks fast with timeouts. Return proper status codes (200 healthy, 503 unhealthy).

**Health Strategy:**
- Separate endpoints
- Check dependencies
- Fast response
- Set timeouts
- Proper status codes

**Next Steps:**
- Learn [Dockerizing Express](dockerizing_express.md) for deployment
- Study [Scaling Strategies](scaling_strategies.md) for growth
- Master [Performance Optimization](performance_optimization.md) for tuning

