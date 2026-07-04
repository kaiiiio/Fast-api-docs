# Production Failures — Why Systems Fail

## Key Terms

* **Retry** (try again after temporary failure): useful for network/provider glitches.
* **Exponential backoff** (increasing retry delay): avoids hammering a failing dependency.
* **Timeout** (max wait time): prevents stuck calls from consuming resources forever.
* **Circuit breaker** (stop calling broken service): prevents cascading failures.
* **Cascading failure** (one failure spreads): failing dependency overloads other services.
* **Fallback** (backup behavior): return cached/default response when dependency fails.
* **Bulkhead** (failure isolation): separate pools so one broken area does not sink all traffic.
* **Backpressure** (slow/reject input): protects system when workers cannot keep up.
* **Rate limit** (request cap): protects API from abuse or overload.
* **Graceful degradation** (reduced but working service): non-critical features fail without full outage.
* **Idempotency** (safe to repeat): retrying should not duplicate payments/emails/updates.

---

## Common Production Failure Patterns

### 1. No Retries
**Problem**: Single failure causes complete breakdown

```javascript
// ❌ Bad
async function fetchData() {
  return await api.call();  // Fails if network glitch
}

// ✅ Good
async function fetchData() {
  let retries = 3;
  while (retries > 0) {
    try {
      return await api.call();
    } catch (error) {
      retries--;
      if (retries === 0) throw error;
      await sleep(1000 * (4 - retries));  // Exponential backoff
    }
  }
}
```

---

### 2. No Timeouts
**Problem**: Hanging requests consume resources

```javascript
// ❌ Bad
const response = await fetch(url);  // Hangs forever if server doesn't respond

// ✅ Good
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 5000);

try {
  const response = await fetch(url, { signal: controller.signal });
  return response;
} finally {
  clearTimeout(timeout);
}
```

---

### 3. No Circuit Breakers
**Problem**: Cascading failures

```
Service A → Service B (down) → Keep trying → Service A crashes
```

**Solution**: Circuit Breaker Pattern

```javascript
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureCount = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'CLOSED';  // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = Date.now();
  }

  async call(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
}
```

---

### 4. No Backpressure Handling
**Problem**: System overwhelmed by requests

```javascript
// ❌ Bad
app.post('/process', async (req, res) => {
  await heavyProcessing(req.body);  // Queue grows infinitely
  res.send('OK');
});

// ✅ Good
const queue = new BullMQ('processing', {
  limiter: {
    max: 100,      // Max 100 jobs
    duration: 1000 // per second
  }
});

app.post('/process', async (req, res) => {
  const queueLength = await queue.count();
  if (queueLength > 1000) {
    return res.status(503).send('System overloaded, try again later');
  }
  
  await queue.add('process', req.body);
  res.send('Queued for processing');
});
```

---

### 5. No Monitoring/Alerting
**Problem**: You find out from users

**Solution**: Implement observability

```javascript
// Metrics
const metrics = {
  requestCount: 0,
  errorCount: 0,
  responseTime: []
};

app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    metrics.requestCount++;
    metrics.responseTime.push(Date.now() - start);
    
    if (res.statusCode >= 500) {
      metrics.errorCount++;
      
      // Alert if error rate > 5%
      if (metrics.errorCount / metrics.requestCount > 0.05) {
        alertTeam('High error rate detected!');
      }
    }
  });
  
  next();
});
```

---

### 6. Database Connection Pool Exhaustion
**Problem**: All connections used, new requests hang

```javascript
// ❌ Bad
const db = new Database({ maxConnections: 10 });

// ✅ Good
const db = new Database({
  maxConnections: 20,
  connectionTimeout: 5000,
  idleTimeout: 30000,
  acquireTimeout: 10000  // Fail fast if can't get connection
});
```

---

### 7. Memory Leaks
**Problem**: Application crashes after running for days

**Common Causes**:
* Event listeners not removed
* Global variables accumulating
* Unclosed database connections
* Large objects in closures

```javascript
// ❌ Bad
const cache = {};  // Grows forever
app.get('/user/:id', (req, res) => {
  cache[req.params.id] = fetchUser(req.params.id);
  res.send(cache[req.params.id]);
});

// ✅ Good
const cache = new Map();
const MAX_CACHE_SIZE = 1000;

app.get('/user/:id', (req, res) => {
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);  // LRU eviction
  }
  
  const user = fetchUser(req.params.id);
  cache.set(req.params.id, user);
  res.send(user);
});
```

---

### 8. Unhandled Promise Rejections
**Problem**: Silent failures

```javascript
// ❌ Bad
async function processData() {
  const data = await fetchData();  // If this fails, no one knows
  return data;
}

// ✅ Good
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  logger.error('Unhandled promise rejection', { reason, promise });
  // Alert monitoring system
});

async function processData() {
  try {
    const data = await fetchData();
    return data;
  } catch (error) {
    logger.error('Failed to process data', error);
    throw error;
  }
}
```

---

### 9. Single Point of Failure
**Problem**: One component down = entire system down

```
User → Single Server → Database
```

**Solution**: Redundancy

```
User → Load Balancer → Server 1
                     → Server 2
                     → Server 3
                     ↓
                  Database (with replica)
```

---

### 10. No Rate Limiting
**Problem**: DDoS or abuse crashes system

```javascript
// ✅ Good
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later'
});

app.use('/api/', limiter);
```

---

## Production Readiness Checklist

### Reliability
- [ ] Retry logic with exponential backoff
- [ ] Timeouts on all external calls
- [ ] Circuit breakers for dependencies
- [ ] Graceful degradation
- [ ] Health check endpoints

### Scalability
- [ ] Horizontal scaling capability
- [ ] Database connection pooling
- [ ] Caching strategy
- [ ] Queue for async processing
- [ ] Rate limiting

### Observability
- [ ] Structured logging
- [ ] Metrics collection
- [ ] Distributed tracing
- [ ] Alerting on critical errors
- [ ] Dashboard for key metrics

### Security
- [ ] Input validation
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] CSRF tokens
- [ ] Secrets in environment variables

### Deployment
- [ ] Zero-downtime deployments
- [ ] Rollback strategy
- [ ] Database migrations
- [ ] Feature flags
- [ ] Canary deployments

---

## Interview Questions

**Q: What is a circuit breaker and why is it important?**
A: A circuit breaker prevents cascading failures by stopping requests to a failing service. After a threshold of failures, it "opens" and fails fast instead of waiting for timeouts.

**Q: How do you handle database connection pool exhaustion?**
A: Set appropriate pool size, implement connection timeouts, use connection pooling libraries, and monitor active connections.

**Q: What is backpressure?**
A: When a system is overwhelmed with requests, backpressure is the mechanism to slow down or reject new requests to prevent system collapse.

**Q: Why are timeouts important?**
A: Timeouts prevent resources from being held indefinitely, allowing the system to fail fast and recover.

---

## Senior Engineer Mindset

> "My code works" ❌
> "My system survives failures" ✅

**Things seniors think about**:
* What happens when this service is down?
* How do I monitor this in production?
* What's the blast radius of this change?
* How do I roll back if needed?
* What's the cost of this solution?

---

## Summary

| Failure Pattern | Solution |
| --------------- | -------- |
| No retries | Exponential backoff |
| No timeouts | Set aggressive timeouts |
| Cascading failures | Circuit breakers |
| Overload | Backpressure, rate limiting |
| No visibility | Monitoring, logging |
| Memory leaks | Proper cleanup, limits |
| Single point | Redundancy, HA |

**Key Insight**: Production systems fail. Design for failure, not success.
