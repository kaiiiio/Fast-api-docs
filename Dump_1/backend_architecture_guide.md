# Backend Architecture & System Design

A comprehensive guide covering Microservices, Caching, Event-Driven Architecture, and other backend essentials for interviews and production systems.

## Table of Contents
1. [Microservices Architecture](#microservices-architecture)
2. [Caching Strategies](#caching-strategies)
3. [Event-Driven Systems](#event-driven-systems)
4. [Database Design & Optimization](#database-design--optimization)
5. [Authentication & Authorization](#authentication--authorization)
6. [API Gateway & Rate Limiting](#api-gateway--rate-limiting)

---

## Microservices Architecture

### **What is it?**

> **Definition:** Architectural style decomposing applications into small, independently deployable services, each owning a bounded context (single business capability) and its data.

### **Why Microservices?**

| Monolith Problem | Microservices Solution |
|-----------------|----------------------|
| All features in one codebase → hard to scale | Small services, independently deployed |
| One DB → schema coupling | Each service has its own data |
| One failure → entire system down | Fault isolation per service |
| Hard for large teams | Teams own independent services |

### **Core Principles**

1. **Single Responsibility** - One service = one business capability
2. **Decentralized Data** - Each service owns its database
3. **APIs as Contracts** - Well-defined interfaces (REST/gRPC/Events)
4. **Independent Deployment** - Deploy without redeploying entire system
5. **Automation & Observability** - CI/CD, logs, metrics, tracing

### **Architecture Diagram**

```
                   ┌────────────────┐
                   │ API Gateway    │
                   │ (Auth, Routing)│
                   └──────┬─────────┘
                          │
      ┌───────────────────┼───────────────────┐
      │                   │                   │
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│ User Service│     │ Order Service│     │ Payment Svc  │
│(users, auth)│     │(orders CRUD) │     │(transactions)│
└─────┬───────┘     └────┬────────┘     └────┬─────────┘
      │                  │                    │
      ▼                  ▼                    ▼
┌─────────────┐   ┌──────────────┐     ┌──────────────┐
│ user_db     │   │ order_db     │     │ payment_db   │
└─────────────┘   └──────────────┘     └──────────────┘
      │                  │                    │
      └─────────► Event Bus ◄──────────────────┘
             (Kafka / NATS / RabbitMQ)
```

### **Communication Patterns**

#### **1. Synchronous (Request/Response)**

```
Client → API Gateway → User Service → DB
```

**Pros:** Simple, direct
**Cons:** Tight coupling, chain failures

**Example:**
```javascript
// Order Service calling User Service
const user = await axios.get('http://user-service:4001/users/123');
```

#### **2. Asynchronous (Event-Driven)**

```
Order Service publishes "order_created"
→ Payment Service consumes it
→ Notification Service sends confirmation
```

**Pros:** Decoupled, scalable, resilient
**Cons:** Harder to debug, eventual consistency

**Example:**
```javascript
// Order Service publishes event
nc.publish('order.created', JSON.stringify({ orderId: 123 }));

// Payment Service subscribes
const sub = nc.subscribe('order.created');
for await (const m of sub) {
  const order = JSON.parse(m.data);
  processPayment(order);
}
```

### **Key Patterns**

#### **1. API Gateway**
- Single entry point for clients
- Handles: routing, auth, rate limiting, aggregation
- Tools: Kong, NGINX, AWS API Gateway

#### **2. Service Discovery**
- Services register their location (IP/port)
- Tools: Consul, Eureka, Kubernetes DNS

#### **3. Circuit Breaker**
- Prevents cascading failures
- If service fails repeatedly → open circuit (stop calls)
- Libraries: resilience4j, Hystrix

#### **4. Saga Pattern (Distributed Transactions)**

```
Order Service → "Order Created"
→ Payment Service → "Payment Done"
→ Order Service updates "Completed"

If payment fails:
→ Emit "Payment Failed"
→ Rollback order
```

### **Best Practices**

✅ Split along clear domain boundaries
✅ Define API contracts first (OpenAPI/Protobuf)
✅ One database per service
✅ Use API gateway for cross-cutting concerns
✅ Automate CI/CD and infrastructure as code
✅ Implement health checks, circuit breakers, retries

### **Common Pitfalls**

❌ Chatty services (too many small RPC calls) → high latency
❌ Cross-service transactions assumed synchronous
❌ Not enough telemetry → debugging nightmares
❌ Over-splitting ("too micro")

---

## Caching Strategies

### **Why Caching?**

> **Goal:** Reduce latency and database load by storing frequently-accessed data closer to the consumer

### **Cache Layers**

```
Client-side (browser storage)
    ↓
CDN (edge caching for static assets)
    ↓
Application cache (in-process LRU)
    ↓
Distributed cache (Redis, Memcached)
    ↓
Database
```

### **Caching Patterns**

#### **1. Cache-Aside (Lazy Loading)**

> **Most common pattern for read-heavy workloads**

```javascript
async function getUser(userId) {
  const key = `user:${userId}`;
  
  // 1. Check cache
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  
  // 2. Cache miss → fetch from DB
  const user = await db.query('SELECT * FROM users WHERE id=$1', [userId]);
  
  // 3. Populate cache
  if (user) await redis.set(key, JSON.stringify(user), 'EX', 60); // TTL 60s
  
  return user;
}
```

**Pros:** Simple, works well for reads
**Cons:** Cache miss penalty, stale data possible

#### **2. Write-Through**

```javascript
async function updateUser(userId, data) {
  // 1. Update DB
  await db.query('UPDATE users SET name=$1 WHERE id=$2', [data.name, userId]);
  
  // 2. Update cache
  await redis.set(`user:${userId}`, JSON.stringify(data), 'EX', 60);
}
```

**Pros:** Cache always consistent
**Cons:** Write latency (two operations)

#### **3. Write-Back (Write-Behind)**

```javascript
async function updateUser(userId, data) {
  // 1. Write to cache immediately
  await redis.set(`user:${userId}`, JSON.stringify(data), 'EX', 60);
  
  // 2. Asynchronously flush to DB
  queue.add('db-write', { userId, data });
}
```

**Pros:** Faster writes
**Cons:** Risk of data loss if cache fails

### **Invalidation Strategies**

> **"There are only two hard things in Computer Science: cache invalidation and naming things."**

#### **1. Explicit Invalidation**

```javascript
async function updateUser(userId, data) {
  await db.query('UPDATE users SET name=$1 WHERE id=$2', [data.name, userId]);
  
  // Delete cache key
  await redis.del(`user:${userId}`);
}
```

#### **2. TTL (Time-To-Live)**

```javascript
await redis.set(key, value, 'EX', 300); // Expires in 5 minutes
```

#### **3. Event-Driven Invalidation**

```javascript
// On user update, publish event
pubsub.publish('user.updated', { userId });

// Cache service listens and invalidates
pubsub.subscribe('user.updated', async (msg) => {
  await redis.del(`user:${msg.userId}`);
});
```

### **Common Pitfalls**

❌ **Cache Stampede:** Many clients rebuild cache simultaneously when TTL expires
- **Solution:** Use locks, request coalescing, or randomized TTLs

❌ **Stale Data:** Users see outdated information
- **Solution:** Transactional invalidation or short TTLs

❌ **Memory Leaks:** In-process caches grow unbounded
- **Solution:** Use LRU eviction policy with size limits

### **Best Practices**

✅ Use cache-aside for read-heavy workloads
✅ Implement cache invalidation on writes
✅ Set appropriate TTLs based on data volatility
✅ Monitor cache hit/miss ratios
✅ Use distributed cache (Redis) for multi-instance apps

---

## Event-Driven Systems

### **Why Event-Driven?**

> **Goal:** Decouple producers and consumers, enabling asynchronous processing, better resiliency, and scalability

### **Key Components**

```
Producer → Message Broker → Consumer(s)
```

**Message Brokers:**
- RabbitMQ (AMQP)
- Kafka (distributed log)
- AWS SQS/SNS
- Google Pub/Sub
- NATS

### **Topic vs Queue**

| Type | Description | Use Case |
|------|------------|----------|
| **Topic** (Pub/Sub) | One message → many subscribers | Notifications, event broadcasting |
| **Queue** (Work Queue) | One message → one consumer | Task processing, load distribution |

### **Design Considerations**

#### **1. Delivery Semantics**

- **At-most-once:** Message may be lost (fast, no guarantees)
- **At-least-once:** Message delivered ≥1 times (duplicates possible)
- **Exactly-once:** Message delivered exactly once (hard, requires idempotency)

#### **2. Idempotency**

> **Critical:** Consumers must handle duplicate messages

```javascript
// ❌ Bad - Not idempotent
async function processPayment(orderId, amount) {
  await db.query('INSERT INTO payments VALUES ($1, $2)', [orderId, amount]);
}

// ✅ Good - Idempotent
async function processPayment(orderId, amount) {
  await db.query(`
    INSERT INTO payments (order_id, amount) 
    VALUES ($1, $2)
    ON CONFLICT (order_id) DO NOTHING
  `, [orderId, amount]);
}
```

#### **3. Message Ordering**

- **Kafka:** Guarantees ordering per partition
- **SQS:** Unordered (unless FIFO queue)
- **RabbitMQ:** Ordered within queue

#### **4. Dead Letter Queue (DLQ)**

```javascript
// After 3 retries, send to DLQ
const sub = nc.subscribe('orders', {
  max_deliver: 3,
  ack_wait: 30_000, // 30s
});

for await (const m of sub) {
  try {
    await processOrder(m.data);
    m.ack();
  } catch (err) {
    // After max retries, goes to DLQ
    m.nak();
  }
}
```

### **Patterns**

#### **1. Event Sourcing**

> **Concept:** Persist events as source of truth; state is derived by replaying events

```javascript
// Events
const events = [
  { type: 'ORDER_CREATED', orderId: 1, items: [...] },
  { type: 'PAYMENT_RECEIVED', orderId: 1, amount: 100 },
  { type: 'ORDER_SHIPPED', orderId: 1 }
];

// Rebuild state by replaying
function getOrderState(orderId) {
  return events
    .filter(e => e.orderId === orderId)
    .reduce((state, event) => applyEvent(state, event), {});
}
```

#### **2. CQRS (Command Query Responsibility Segregation)**

```
Write Model (Commands) → Event Store
                            ↓
                    Event Handlers
                            ↓
                    Read Model (Queries)
```

**Benefits:**
- Separate read/write optimization
- Scale reads independently
- Event history for auditing

### **Example: Order Processing System**

```javascript
// Order Service - Publishes event
app.post('/orders', async (req, res) => {
  const order = await db.createOrder(req.body);
  
  // Publish event
  await kafka.publish('order.created', {
    orderId: order.id,
    userId: req.user.id,
    items: order.items,
    total: order.total
  });
  
  res.json({ orderId: order.id, status: 'pending' });
});

// Payment Service - Consumes event
kafka.subscribe('order.created', async (msg) => {
  const { orderId, total } = msg;
  
  const payment = await processPayment(orderId, total);
  
  if (payment.success) {
    await kafka.publish('payment.completed', { orderId });
  } else {
    await kafka.publish('payment.failed', { orderId, reason: payment.error });
  }
});

// Notification Service - Consumes events
kafka.subscribe('payment.completed', async (msg) => {
  await sendEmail(msg.orderId, 'Payment successful!');
});
```

### **Best Practices**

✅ Make consumers idempotent
✅ Use schema versioning (Avro, Protobuf)
✅ Implement DLQs for failed messages
✅ Monitor queue depth and consumer lag
✅ Use correlation IDs for tracing
✅ Design for eventual consistency

### **Common Pitfalls**

❌ Not designing for schema evolution → breaking consumers
❌ Lack of idempotency → duplicate side effects
❌ Relying on synchronous responses from async flows
❌ Not monitoring consumer lag

---

## Database Design & Optimization

### **Core Principles**

> **"Design for the queries you'll run"**

### **Indexing**

#### **When to Use Indexes**

```sql
-- ✅ Good - Index on frequently queried column
CREATE INDEX idx_users_email ON users(email);

-- Query benefits from index
SELECT * FROM users WHERE email = 'john@example.com';

-- ✅ Composite index for multi-column queries
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at);

SELECT * FROM orders WHERE user_id = 123 AND created_at > '2024-01-01';
```

#### **Index Types**

- **B-tree:** Default, good for equality and range queries
- **Hash:** Fast equality lookups, no range queries
- **GIN (Generalized Inverted Index):** Full-text search, JSONB
- **GiST:** Geometric data, full-text search

#### **Covering Index**

```sql
-- Index includes all columns needed by query
CREATE INDEX idx_users_email_name ON users(email, name);

-- Query uses index-only scan (no table access)
SELECT name FROM users WHERE email = 'john@example.com';
```

### **Query Optimization**

```sql
-- ❌ Bad - SELECT *
SELECT * FROM users WHERE email = 'john@example.com';

-- ✅ Good - Select only needed columns
SELECT id, name, email FROM users WHERE email = 'john@example.com';

-- Use EXPLAIN to analyze
EXPLAIN ANALYZE SELECT id, name FROM users WHERE email = 'john@example.com';
```

### **Partitioning**

```sql
-- Range partitioning by date
CREATE TABLE orders (
    id SERIAL,
    user_id INT,
    created_at DATE,
    ...
) PARTITION BY RANGE (created_at);

CREATE TABLE orders_2024_01 PARTITION OF orders
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

### **Sharding**

> **Horizontal partitioning across multiple databases**

```
User ID 1-1000   → Shard 1
User ID 1001-2000 → Shard 2
User ID 2001-3000 → Shard 3
```

**Shard Key Selection:**
- Even distribution
- Avoid hot partitions
- Support common queries

### **Best Practices**

✅ Use `EXPLAIN ANALYZE` to identify slow queries
✅ Add indexes for `WHERE`, `JOIN`, `ORDER BY` columns
✅ Use connection pooling (pgbouncer, HikariCP)
✅ Avoid `SELECT *`
✅ Use batching for bulk operations
✅ Monitor locks and long transactions

---

## Authentication & Authorization

### **JWT (JSON Web Tokens)**

#### **Structure**

```
header.payload.signature

eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

#### **Implementation**

```javascript
const jwt = require('jsonwebtoken');

// Generate token
const token = jwt.sign(
  { userId: 123, email: 'john@example.com' },
  process.env.JWT_SECRET,
  { expiresIn: '15m' } // Short-lived access token
);

// Verify token
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).send('No token');
  
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).send('Invalid token');
  }
}
```

### **Best Practices**

✅ Short-lived access tokens (15min) + long-lived refresh tokens
✅ Use HTTPS only
✅ Validate signature, expiry (`exp`), issuer (`iss`), audience (`aud`)
✅ Never put secrets in JWT payload (it's base64, not encrypted!)
✅ Use RS256 for public/private key signing
✅ Rotate keys periodically

### **OAuth2 Flows**

- **Authorization Code:** Server-side apps
- **PKCE:** Mobile/SPA apps
- **Client Credentials:** Machine-to-machine
- **Implicit:** Deprecated (security issues)

### **RBAC vs ABAC**

- **RBAC (Role-Based):** User → Role → Permissions
- **ABAC (Attribute-Based):** Policy evaluates attributes (user, resource, environment)

---

## API Gateway & Rate Limiting

### **API Gateway Responsibilities**

✅ Authentication & Authorization
✅ Routing (path-based, host-based)
✅ Rate limiting & throttling
✅ Request/response transformation
✅ Aggregation (fan-out and combine)
✅ Telemetry & logging

### **Rate Limiting Algorithms**

#### **1. Token Bucket**

```javascript
class TokenBucket {
  constructor(capacity, refillRate) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillRate; // tokens per second
    this.lastRefill = Date.now();
  }
  
  tryConsume() {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens--;
      return true;
    }
    return false;
  }
  
  refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}
```

#### **2. Fixed Window**

```javascript
// Redis-based
async function rateLimit(userId) {
  const key = `rate:${userId}:${Math.floor(Date.now() / 60000)}`; // 1-minute window
  const count = await redis.incr(key);
  await redis.expire(key, 60);
  
  if (count > 100) {
    throw new Error('Rate limit exceeded');
  }
}
```

### **Best Practices**

✅ Rate limit by API key, user, or IP
✅ Use distributed counters (Redis) for multi-instance apps
✅ Return HTTP 429 with `Retry-After` header
✅ Combine with quotas for monetization

---

## Interview Questions

### Q1: When would you use microservices vs monolith?

**Answer:**
- **Monolith:** Small teams, simple domain, rapid prototyping
- **Microservices:** Large teams, complex domain, need independent scaling/deployment, polyglot requirements

### Q2: How do you handle distributed transactions in microservices?

**Answer:** Use **Saga pattern** with compensating transactions. Avoid 2PC (two-phase commit). Design for eventual consistency with event-driven choreography or orchestration.

### Q3: Explain cache invalidation strategies

**Answer:**
1. **Explicit invalidation:** Delete cache on write
2. **TTL:** Auto-expire after time
3. **Event-driven:** Publish invalidation events
4. **Write-through:** Update cache and DB together

### Q4: What is idempotency and why is it important?

**Answer:** An operation is idempotent if calling it multiple times has the same effect as calling it once. Critical for event-driven systems with at-least-once delivery to prevent duplicate side effects.

### Q5: How do you prevent cache stampede?

**Answer:**
1. Use locks (only one client rebuilds cache)
2. Request coalescing (combine concurrent requests)
3. Randomized TTLs (prevent simultaneous expiry)
4. Probabilistic early expiration

---

## Key Takeaways

✅ **Microservices** = Independent services, own data, API contracts
✅ **Caching** = Cache-aside for reads, invalidate on writes, use TTLs
✅ **Events** = Decouple services, idempotent consumers, use DLQs
✅ **Databases** = Index wisely, use EXPLAIN, partition large tables
✅ **Auth** = Short-lived JWTs, HTTPS only, validate claims
✅ **Rate Limiting** = Token bucket, distributed counters, return 429

---

This guide covers essential backend architecture concepts for interviews and production systems! 🚀
