# Metrics Collection: Monitoring Express.js Applications

Metrics collection tracks application performance, health, and usage. This guide covers collecting and monitoring metrics in Express.js applications.

## What are Metrics?

**Metrics** are numerical measurements of application behavior:
- Request count
- Response times
- Error rates
- Resource usage

## Using Prometheus

### Install Prometheus Client

```bash
npm install prom-client
```

### Basic Metrics

```javascript
const client = require('prom-client');

// Create registry
const register = new client.Registry();

// Default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
```

### Metrics Middleware

```javascript
// Metrics middleware
function metricsMiddleware(req, res, next) {
    const startTime = Date.now();
    
    res.on('finish', () => {
        const duration = (Date.now() - startTime) / 1000;
        
        // Record duration
        httpRequestDuration.observe({
            method: req.method,
            route: req.route?.path || req.path,
            status_code: res.statusCode
        }, duration);
        
        // Increment counter
        httpRequestTotal.inc({
            method: req.method,
            route: req.route?.path || req.path,
            status_code: res.statusCode
        });
    });
    
    next();
}

app.use(metricsMiddleware);
```

### Metrics Endpoint

```javascript
// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});
```

## Real-World Examples

### Example 1: Application Metrics

```javascript
const client = require('prom-client');
const register = new client.Registry();

// Request metrics
const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const httpRequestsTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status']
});

// Database metrics
const dbQueryDuration = new client.Histogram({
    name: 'db_query_duration_seconds',
    help: 'Database query duration',
    labelNames: ['operation', 'table'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2]
});

// Error metrics
const errorsTotal = new client.Counter({
    name: 'errors_total',
    help: 'Total errors',
    labelNames: ['type', 'route']
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);
register.registerMetric(dbQueryDuration);
register.registerMetric(errorsTotal);

// Middleware
app.use((req, res, next) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
        const duration = (Date.now() - startTime) / 1000;
        const route = req.route?.path || req.path;
        
        httpRequestDuration.observe({
            method: req.method,
            route,
            status: res.statusCode
        }, duration);
        
        httpRequestsTotal.inc({
            method: req.method,
            route,
            status: res.statusCode
        });
    });
    
    next();
});

// Error tracking
app.use((error, req, res, next) => {
    errorsTotal.inc({
        type: error.name,
        route: req.route?.path || req.path
    });
    next(error);
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});
```

### Example 2: Database Metrics

```javascript
// Track database query performance
async function trackQuery(operation, table, queryFn) {
    const startTime = Date.now();
    
    try {
        const result = await queryFn();
        const duration = (Date.now() - startTime) / 1000;
        
        dbQueryDuration.observe({ operation, table }, duration);
        
        return result;
    } catch (error) {
        const duration = (Date.now() - startTime) / 1000;
        dbQueryDuration.observe({ operation, table, error: 'true' }, duration);
        throw error;
    }
}

// Use in routes
app.get('/users/:id', async (req, res) => {
    const user = await trackQuery('findById', 'users', async () => {
        return await User.findByPk(req.params.id);
    });
    
    res.json(user);
});
```

## Best Practices

1. **Collect Key Metrics**: Request count, duration, errors
2. **Use Labels**: Add labels for filtering
3. **Set Buckets**: Configure histogram buckets appropriately
4. **Monitor**: Set up alerts on metrics
5. **Export**: Export metrics to Prometheus/Grafana

## Summary

**Metrics Collection:**

1. **Purpose**: Track application performance and health
2. **Tools**: Prometheus client, custom metrics
3. **Metrics**: Counters, histograms, gauges
4. **Best Practice**: Collect key metrics, use labels, set alerts
5. **Export**: Expose metrics endpoint for Prometheus

**Key Takeaway:**
Metrics collection tracks application performance and health. Use Prometheus client to collect metrics like request count, duration, and error rates. Add labels for filtering and grouping. Configure histogram buckets appropriately. Export metrics to monitoring systems like Prometheus and Grafana.

**Metrics Strategy:**
- Collect key metrics (requests, duration, errors)
- Use labels for filtering
- Set appropriate buckets
- Export to monitoring systems
- Set up alerts

**Next Steps:**
- Learn [Structured Logging](structured_logging.md) for logging
- Study [Distributed Tracing](../14_observability/distributed_tracing.md) for request tracking
- Master [Error Tracking](../14_observability/error_tracking.md) for error management

