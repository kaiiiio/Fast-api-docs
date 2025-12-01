# Distributed Tracing: Tracking Requests Across Services

Distributed tracing tracks requests across services, databases, and external APIs. This guide covers implementing distributed tracing in Express.js applications.

## What is Distributed Tracing?

**Distributed tracing** follows a single request as it flows through multiple services, showing where time is spent.

## OpenTelemetry Setup

```bash
npm install @opentelemetry/api @opentelemetry/sdk-node
npm install @opentelemetry/instrumentation-http @opentelemetry/instrumentation-express
npm install @opentelemetry/exporter-jaeger
```

## Basic Configuration

```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');

const sdk = new NodeSDK({
    traceExporter: new JaegerExporter({
        endpoint: 'http://localhost:14268/api/traces'
    }),
    instrumentations: [
        new HttpInstrumentation(),
        new ExpressInstrumentation()
    ]
});

sdk.start();
```

## Manual Span Creation

```javascript
const { trace } = require('@opentelemetry/api');
const tracer = trace.getTracer('my-service');

// Create span
app.get('/users/:id', async (req, res) => {
    const span = tracer.startSpan('get_user');
    
    try {
        const user = await User.findByPk(req.params.id);
        span.setAttribute('user.id', user.id);
        res.json(user);
    } catch (error) {
        span.recordException(error);
        span.setStatus({ code: 1, message: error.message });
        throw error;
    } finally {
        span.end();
    }
});
```

## Real-World Examples

### Example 1: Database Tracing

```javascript
const { SequelizeInstrumentation } = require('@opentelemetry/instrumentation-sequelize');

const sdk = new NodeSDK({
    traceExporter: new JaegerExporter({
        endpoint: 'http://localhost:14268/api/traces'
    }),
    instrumentations: [
        new HttpInstrumentation(),
        new ExpressInstrumentation(),
        new SequelizeInstrumentation()
    ]
});
```

## Best Practices

1. **Instrument All Services**: HTTP, database, external APIs
2. **Add Context**: Include user ID, request ID
3. **Monitor Performance**: Track slow operations
4. **Error Tracking**: Record exceptions
5. **Sampling**: Sample traces for performance

## Summary

**Distributed Tracing:**

1. **Purpose**: Track requests across services
2. **Tools**: OpenTelemetry, Jaeger
3. **Instrumentation**: HTTP, Express, database
4. **Best Practice**: Instrument all services, add context
5. **Benefits**: Debugging, performance optimization

**Key Takeaway:**
Distributed tracing tracks requests across services. Use OpenTelemetry for instrumentation. Export traces to Jaeger for visualization. Instrument HTTP, Express, and database operations. Add context (user ID, request ID) to spans. Monitor performance and track errors.

**Tracing Strategy:**
- Instrument all services
- Add context
- Monitor performance
- Track errors
- Sample traces

**Next Steps:**
- Learn [Structured Logging](structured_logging.md) for logging
- Study [Metrics Collection](metrics_collection.md) for monitoring
- Master [Error Tracking](../14_observability/error_tracking.md) for errors

