# Technology Comparisons — Interview Gold

## Key Terms

* **Latency** (response delay): how long one request takes.
* **Throughput** (work per second): how many requests/messages can be handled.
* **Durability** (data survives failure): data is not lost after restart/crash.
* **Availability** (system stays usable): service continues during failures.
* **Consistency** (same correct data everywhere): reads reflect expected writes.
* **Horizontal scaling** (add more machines): scale out.
* **Vertical scaling** (bigger machine): scale up.
* **Replay** (read old events again): common in Kafka/event logs.
* **Retention** (how long data is kept): message/event/log storage duration.
* **Schema** (data shape/rules): strict in SQL, flexible in many NoSQL systems.
* **ACID** (transaction safety): atomicity, consistency, isolation, durability.
* **Eventual consistency** (sync later): data becomes consistent after delay.

---

## Redis vs Memcached

| Feature | Redis | Memcached |
| ------- | ----- | --------- |
| **Data structures** | String, Hash, List, Set, Sorted Set | String only |
| **Persistence** | Yes (RDB, AOF) | No |
| **Replication** | Yes | No |
| **Pub/Sub** | Yes | No |
| **Transactions** | Yes | No |
| **Lua scripting** | Yes | No |
| **Max value size** | 512 MB | 1 MB |
| **Use case** | Cache, session, queue, pub/sub | Simple cache only |

**When to use Redis**: Almost always (more features, same performance)
**When to use Memcached**: Very simple caching needs, already using it

---

## RabbitMQ vs Kafka

| Feature | RabbitMQ | Kafka |
| ------- | -------- | ----- |
| **Type** | Message broker | Event stream |
| **Message retention** | Deleted after consumption | Configurable (days/weeks) |
| **Replay** | ❌ | ✅ |
| **Ordering** | Per queue | Per partition |
| **Throughput** | Medium (10k-100k/sec) | Very high (1M+/sec) |
| **Latency** | Low (ms) | Low-Medium (ms) |
| **Use case** | Task queues, RPC | Analytics, event sourcing |
| **Complexity** | Medium | High |
| **Routing** | Advanced (exchanges) | Simple (topics) |

**When to use RabbitMQ**:
* Microservices communication
* Task distribution
* Complex routing
* Request-response patterns

**When to use Kafka**:
* Event streaming
* Log aggregation
* Analytics pipelines
* Event sourcing
* High throughput needed

---

## BullMQ vs RabbitMQ vs Kafka

| Feature | BullMQ | RabbitMQ | Kafka |
| ------- | ------ | -------- | ----- |
| **Dependency** | Redis | None | None |
| **Language** | Node.js | Any | Any |
| **Complexity** | Low | Medium | High |
| **Throughput** | Medium | Medium | Very High |
| **Replay** | ❌ | ❌ | ✅ |
| **Best for** | Background jobs | Microservices | Event streaming |

**Decision tree**:
```
Need event replay? → Kafka
Multi-language? → RabbitMQ or Kafka
Node.js only + simple? → BullMQ
```

---

## PostgreSQL vs MongoDB

| Feature | PostgreSQL | MongoDB |
| ------- | ---------- | ------- |
| **Type** | Relational (SQL) | Document (NoSQL) |
| **Schema** | Strict | Flexible |
| **Joins** | Yes | Limited (lookup) |
| **Transactions** | ACID | ACID (4.0+) |
| **Scaling** | Vertical | Horizontal |
| **Query language** | SQL | MongoDB Query Language |
| **Use case** | Structured data, complex queries | Flexible schema, rapid iteration |

**When to use PostgreSQL**:
* Need ACID transactions
* Complex relationships
* Structured data
* Reporting and analytics

**When to use MongoDB**:
* Flexible schema
* Rapid prototyping
* Hierarchical data
* Horizontal scaling

---

## REST vs GraphQL vs gRPC

| Feature | REST | GraphQL | gRPC |
| ------- | ---- | ------- | ---- |
| **Protocol** | HTTP | HTTP | HTTP/2 |
| **Format** | JSON | JSON | Protobuf (binary) |
| **Over-fetching** | Yes | No | No |
| **Under-fetching** | Yes | No | No |
| **Type safety** | No | Yes (schema) | Yes (protobuf) |
| **Performance** | Good | Good | Excellent |
| **Browser support** | ✅ | ✅ | Limited |
| **Learning curve** | Low | Medium | High |

**When to use REST**:
* Simple CRUD APIs
* Public APIs
* Standard HTTP clients

**When to use GraphQL**:
* Complex data requirements
* Mobile apps (reduce requests)
* Flexible client needs

**When to use gRPC**:
* Microservices communication
* High performance needed
* Strong typing required

---

## MySQL vs PostgreSQL

| Feature | MySQL | PostgreSQL |
| ------- | ----- | ---------- |
| **ACID compliance** | Yes (InnoDB) | Yes |
| **JSON support** | Basic | Advanced |
| **Full-text search** | Yes | Yes (better) |
| **Replication** | Yes | Yes |
| **Extensions** | Limited | Many (PostGIS, etc.) |
| **Performance** | Read-heavy | Balanced |
| **Concurrency** | Good | Better (MVCC) |

**When to use MySQL**:
* Read-heavy workloads
* Simple queries
* Already familiar with it

**When to use PostgreSQL**:
* Complex queries
* JSON data
* Need advanced features
* Write-heavy workloads

---

## S3 vs GCS (Google Cloud Storage)

| Feature | AWS S3 | GCS |
| ------- | ------ | --- |
| **Provider** | AWS | Google Cloud |
| **Pricing** | Competitive | Slightly cheaper |
| **Performance** | Excellent | Excellent |
| **Ecosystem** | Larger | Growing |
| **Use case** | Object storage | Object storage |

**Difference**: Minimal. Choose based on cloud provider.

---

## Docker vs Kubernetes

| Feature | Docker | Kubernetes |
| ------- | ------ | ---------- |
| **Purpose** | Containerization | Orchestration |
| **Scope** | Single host | Multi-host cluster |
| **Scaling** | Manual | Automatic |
| **Load balancing** | Manual | Built-in |
| **Self-healing** | No | Yes |
| **Complexity** | Low | High |

**Relationship**: Docker creates containers, Kubernetes manages them at scale.

**When to use Docker alone**:
* Small apps
* Single server
* Simple deployments

**When to use Kubernetes**:
* Microservices
* Auto-scaling needed
* High availability
* Large scale

---

## PM2 vs Docker vs Kubernetes

| Feature | PM2 | Docker | Kubernetes |
| ------- | --- | ------ | ---------- |
| **Scope** | Process manager | Container platform | Orchestrator |
| **Language** | Node.js | Any | Any |
| **Isolation** | Process | Container | Container |
| **Scaling** | Limited | Manual | Automatic |
| **Use case** | Small Node.js apps | Standard apps | Large-scale systems |

**Progression**: PM2 → Docker → Kubernetes (as you scale)

---

## Monolith vs Microservices

| Feature | Monolith | Microservices |
| ------- | -------- | ------------- |
| **Deployment** | Single unit | Independent services |
| **Scaling** | Vertical | Horizontal (per service) |
| **Development** | Simple | Complex |
| **Team size** | Small | Large |
| **Technology** | Single stack | Polyglot |
| **Debugging** | Easier | Harder |
| **Performance** | Better (no network) | Overhead (network calls) |

**When to use Monolith**:
* Small team
* MVP/prototype
* Simple domain
* Startup

**When to use Microservices**:
* Large team
* Complex domain
* Need independent scaling
* Mature product

---

## Horizontal vs Vertical Scaling

### Vertical Scaling (Scale Up)
```
Server: 2 CPU, 4GB RAM
   ↓
Server: 8 CPU, 32GB RAM
```

**Pros**: Simple, no code changes
**Cons**: Limited, expensive, single point of failure

### Horizontal Scaling (Scale Out)
```
1 Server
   ↓
3 Servers (behind load balancer)
```

**Pros**: Unlimited, fault-tolerant
**Cons**: Requires stateless design, more complex

---

## Synchronous vs Asynchronous Processing

### Synchronous
```
User → API → Process → Response (waits)
```

**Pros**: Simple, immediate feedback
**Cons**: Slow, blocking, timeouts

### Asynchronous
```
User → API → Queue → Worker
         ↓
      Response (instant)
```

**Pros**: Fast response, scalable, resilient
**Cons**: Complex, eventual consistency

---

## Interview Questions

**Q: When would you choose MongoDB over PostgreSQL?**
A: When you need flexible schema, rapid iteration, or horizontal scaling. Use PostgreSQL for structured data with complex relationships.

**Q: What's the difference between RabbitMQ and Kafka?**
A: RabbitMQ is a message broker (queue). Kafka is an event stream (log). Use RabbitMQ for task distribution, Kafka for event streaming.

**Q: Why use Redis instead of in-memory cache?**
A: Redis is shared across instances, persistent, and supports complex data structures.

**Q: When do you need Kubernetes?**
A: When you have microservices, need auto-scaling, or require high availability at scale.

---

## Summary Decision Matrix

### Caching
* **Simple**: In-memory
* **Shared**: Redis
* **Distributed**: Redis Cluster

### Queues
* **Node.js, simple**: BullMQ
* **Microservices**: RabbitMQ
* **Event streaming**: Kafka

### Database
* **Structured, relational**: PostgreSQL
* **Flexible schema**: MongoDB
* **Time-series**: InfluxDB
* **Graph**: Neo4j

### Deployment
* **Small app**: PM2 or Docker
* **Standard**: Docker + Docker Compose
* **Large scale**: Kubernetes

### API
* **Public, simple**: REST
* **Complex queries**: GraphQL
* **Internal, performance**: gRPC

**Key Insight**: There's no "best" technology, only the right tool for the job.
