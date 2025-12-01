# Database Query Logging: Tracking SQL Performance

Database query logging tracks SQL queries for debugging and performance analysis. This guide covers logging database queries in Express.js applications.

## Basic Query Logging

### Sequelize Logging

```javascript
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
    // ... config
    logging: (sql, timing) => {
        console.log(`[SQL] ${sql} [${timing}ms]`);
    }
});
```

## Custom Query Logger

```javascript
const logger = require('./logger');

// Custom logging function
function logQuery(sql, timing, options) {
    logger.info({
        event: 'database_query',
        sql: sql.replace(/\s+/g, ' ').trim(),
        duration_ms: timing,
        table: extractTable(sql),
        operation: extractOperation(sql)
    });
}

function extractTable(sql) {
    const match = sql.match(/FROM\s+(\w+)/i);
    return match ? match[1] : null;
}

function extractOperation(sql) {
    if (sql.match(/^SELECT/i)) return 'SELECT';
    if (sql.match(/^INSERT/i)) return 'INSERT';
    if (sql.match(/^UPDATE/i)) return 'UPDATE';
    if (sql.match(/^DELETE/i)) return 'DELETE';
    return 'UNKNOWN';
}

// Use with Sequelize
const sequelize = new Sequelize({
    logging: logQuery
});
```

## Real-World Examples

### Example 1: Query Performance Monitoring

```javascript
const logger = require('./logger');

// Track slow queries
function logQuery(sql, timing) {
    if (timing > 1000) {  // Log slow queries (>1s)
        logger.warn({
            event: 'slow_query',
            sql: sanitizeSQL(sql),
            duration_ms: timing
        });
    }
    
    // Log all queries in development
    if (process.env.NODE_ENV === 'development') {
        logger.debug({
            event: 'database_query',
            sql: sanitizeSQL(sql),
            duration_ms: timing
        });
    }
}

function sanitizeSQL(sql) {
    // Remove sensitive data
    return sql.replace(/password\s*=\s*'[^']*'/gi, "password = '***'");
}
```

## Best Practices

1. **Log Slow Queries**: Track queries > threshold
2. **Sanitize SQL**: Remove sensitive data
3. **Structured Logging**: Use structured format
4. **Performance Metrics**: Track query duration
5. **Production**: Reduce logging in production

## Summary

**Database Query Logging:**

1. **Purpose**: Track SQL queries for debugging
2. **Logging**: Sequelize logging, custom loggers
3. **Best Practice**: Log slow queries, sanitize SQL
4. **Benefits**: Performance analysis, debugging
5. **Use Cases**: Slow query detection, performance tuning

**Key Takeaway:**
Database query logging tracks SQL queries for debugging and performance analysis. Use Sequelize logging or custom loggers. Log slow queries (> threshold). Sanitize SQL to remove sensitive data. Use structured logging. Track query duration for performance metrics.

**Logging Strategy:**
- Log slow queries
- Sanitize SQL
- Structured logging
- Performance metrics
- Reduce in production

**Next Steps:**
- Learn [Structured Logging](structured_logging.md) for logging
- Study [Metrics Collection](metrics_collection.md) for monitoring
- Master [Performance Optimization](../15_deployment_and_performance/performance_optimization.md) for tuning

