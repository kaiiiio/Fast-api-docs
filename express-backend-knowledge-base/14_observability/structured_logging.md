# Structured Logging: Better Logging for Express.js Applications

Structured logging formats logs as structured data (JSON) instead of plain text, making them easier to parse, search, and analyze. This guide covers implementing structured logging in Express.js.

## What is Structured Logging?

**Structured logging** formats logs as structured data (typically JSON) with consistent fields, making logs machine-readable and easier to analyze.

### Plain Text vs Structured

```javascript
// ❌ Plain text logging
console.log('User logged in: john@example.com at 2023-01-01 10:00:00');
// Hard to parse, search, and analyze

// ✅ Structured logging
logger.info({
    event: 'user_login',
    user_id: 123,
    email: 'john@example.com',
    timestamp: '2023-01-01T10:00:00Z',
    ip_address: '192.168.1.1'
});
// Easy to parse, search, and analyze
```

## Using Winston for Structured Logging

### Install Winston

```bash
npm install winston
```

### Basic Setup

```javascript
// logger.js
const winston = require('winston');

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.json(),  // JSON format
    defaultMeta: { service: 'api' },
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

module.exports = logger;
```

### Advanced Configuration

```javascript
const winston = require('winston');

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: {
        service: 'api',
        environment: process.env.NODE_ENV
    },
    transports: [
        // Error logs
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 5242880,  // 5MB
            maxFiles: 5
        }),
        // All logs
        new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 5242880,
            maxFiles: 5
        })
    ]
});

// Console in development
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ level, message, timestamp, ...meta }) => {
                return `${timestamp} [${level}]: ${message} ${JSON.stringify(meta)}`;
            })
        )
    }));
}

module.exports = logger;
```

## Using in Express Routes

### Basic Logging

```javascript
const logger = require('./logger');

app.get('/users/:id', async (req, res) => {
    const startTime = Date.now();
    
    try {
        logger.info({
            event: 'get_user',
            user_id: req.params.id,
            method: req.method,
            path: req.path
        });
        
        const user = await User.findById(req.params.id);
        
        if (!user) {
            logger.warn({
                event: 'user_not_found',
                user_id: req.params.id
            });
            return res.status(404).json({ error: 'User not found' });
        }
        
        const duration = Date.now() - startTime;
        logger.info({
            event: 'get_user_success',
            user_id: req.params.id,
            duration_ms: duration
        });
        
        res.json(user);
    } catch (error) {
        logger.error({
            event: 'get_user_error',
            user_id: req.params.id,
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({ error: 'Internal server error' });
    }
});
```

## Request Logging Middleware

### Request/Response Logging

```javascript
// Middleware for request logging
const logger = require('./logger');

function requestLogger(req, res, next) {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] || generateRequestId();
    
    // Attach request ID to request
    req.requestId = requestId;
    
    // Log request
    logger.info({
        event: 'request_start',
        request_id: requestId,
        method: req.method,
        path: req.path,
        query: req.query,
        ip: req.ip,
        user_agent: req.get('user-agent')
    });
    
    // Log response
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        
        logger.info({
            event: 'request_end',
            request_id: requestId,
            method: req.method,
            path: req.path,
            status_code: res.statusCode,
            duration_ms: duration
        });
    });
    
    next();
}

app.use(requestLogger);
```

## Context Binding

### Adding Context to Logs

```javascript
// Create child logger with context
function createContextLogger(req) {
    return logger.child({
        request_id: req.requestId,
        user_id: req.user?.id,
        ip_address: req.ip
    });
}

// Use in routes
app.get('/users/:id', async (req, res) => {
    const log = createContextLogger(req);
    
    log.info({ event: 'get_user', target_user_id: req.params.id });
    
    try {
        const user = await User.findById(req.params.id);
        log.info({ event: 'get_user_success', target_user_id: req.params.id });
        res.json(user);
    } catch (error) {
        log.error({ event: 'get_user_error', error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});
```

## Real-World Examples

### Example 1: API Request Logging

```javascript
const logger = require('./logger');

// Request logging middleware
app.use((req, res, next) => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] || require('crypto').randomUUID();
    req.requestId = requestId;
    
    // Log request
    logger.info({
        event: 'http_request',
        request_id: requestId,
        method: req.method,
        url: req.url,
        path: req.path,
        query: req.query,
        headers: {
            'user-agent': req.get('user-agent'),
            'content-type': req.get('content-type')
        },
        ip: req.ip,
        user_id: req.user?.id
    });
    
    // Log response
    const originalSend = res.send;
    res.send = function(data) {
        const duration = Date.now() - startTime;
        
        logger.info({
            event: 'http_response',
            request_id: requestId,
            method: req.method,
            url: req.url,
            status_code: res.statusCode,
            duration_ms: duration,
            response_size: Buffer.byteLength(data)
        });
        
        return originalSend.call(this, data);
    };
    
    next();
});
```

### Example 2: Error Logging

```javascript
// Error logging middleware
app.use((error, req, res, next) => {
    logger.error({
        event: 'error',
        request_id: req.requestId,
        error: {
            message: error.message,
            stack: error.stack,
            name: error.name
        },
        request: {
            method: req.method,
            url: req.url,
            body: req.body,
            query: req.query
        },
        user_id: req.user?.id
    });
    
    res.status(error.status || 500).json({
        error: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : error.message
    });
});
```

## Best Practices

1. **Use JSON Format**: Format logs as JSON for parsing
2. **Include Context**: Add request ID, user ID, timestamps
3. **Log Levels**: Use appropriate levels (error, warn, info, debug)
4. **Structured Fields**: Use consistent field names
5. **Don't Log Sensitive Data**: Avoid logging passwords, tokens, PII

## Summary

**Structured Logging:**

1. **Purpose**: Machine-readable logs for analysis
2. **Format**: JSON with consistent fields
3. **Tools**: Winston, Pino, Bunyan
4. **Best Practice**: Include context, use appropriate levels, avoid sensitive data
5. **Benefits**: Easy parsing, searching, analysis

**Key Takeaway:**
Structured logging formats logs as JSON with consistent fields, making them machine-readable and easier to analyze. Use tools like Winston for structured logging, include context (request ID, user ID), and use appropriate log levels. Avoid logging sensitive data like passwords or tokens.

**Logging Strategy:**
- Use JSON format
- Include context (request ID, user ID)
- Use appropriate log levels
- Don't log sensitive data
- Centralize log collection

**Next Steps:**
- Learn [Metrics Collection](../14_observability/metrics_collection.md) for monitoring
- Study [Distributed Tracing](../14_observability/distributed_tracing.md) for request tracking
- Master [Error Handling](../14_observability/error_tracking.md) for error management

