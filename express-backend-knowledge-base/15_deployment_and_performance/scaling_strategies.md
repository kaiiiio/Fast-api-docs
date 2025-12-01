# Scaling Strategies: Growing Your Express.js Application

Scaling strategies help applications handle increasing load. This guide covers vertical and horizontal scaling approaches for Express.js applications.

## Scaling Types

### Vertical Scaling (Scale Up)

**Vertical scaling** increases server resources (CPU, memory).

```javascript
// Before: 2 CPU, 4GB RAM
// After: 4 CPU, 8GB RAM
// Same server, more resources
```

### Horizontal Scaling (Scale Out)

**Horizontal scaling** adds more servers.

```javascript
// Before: 1 server
// After: 3 servers (load balanced)
// More servers, distribute load
```

## Scaling Strategies

### Strategy 1: Load Balancing

```javascript
// Multiple Express.js instances behind load balancer
// Nginx or AWS ALB distributes requests

// Server 1: localhost:3000
// Server 2: localhost:3001
// Server 3: localhost:3002

// Load balancer routes requests
```

### Strategy 2: Database Scaling

```javascript
// Read replicas for read scaling
const readPool = new Pool({
    host: 'read-replica.example.com',
    // Read operations
});

const writePool = new Pool({
    host: 'primary.example.com',
    // Write operations
});

// Route reads to replicas
async function getUser(userId) {
    return await readPool.query('SELECT * FROM users WHERE id = $1', [userId]);
}

// Route writes to primary
async function createUser(userData) {
    return await writePool.query('INSERT INTO users ...', userData);
}
```

### Strategy 3: Caching

```javascript
// Cache frequently accessed data
const redis = require('redis');
const client = redis.createClient();

async function getUser(userId) {
    const cacheKey = `user:${userId}`;
    
    const cached = await client.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }
    
    const user = await User.findById(userId);
    await client.setEx(cacheKey, 3600, JSON.stringify(user));
    
    return user;
}
```

### Strategy 4: Connection Pooling

```javascript
// Optimize connection usage
const pool = new Pool({
    max: 20,  // Maximum connections
    min: 5,   // Minimum connections
    idleTimeoutMillis: 30000
});
```

## Real-World Examples

### Example 1: Multi-Instance Deployment

```yaml
# docker-compose.yml
version: '3.8'

services:
  api1:
    build: .
    ports:
      - "3000:3000"
    environment:
      - INSTANCE_ID=1
  
  api2:
    build: .
    ports:
      - "3001:3000"
    environment:
      - INSTANCE_ID=2
  
  api3:
    build: .
    ports:
      - "3002:3000"
    environment:
      - INSTANCE_ID=3
  
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
```

```nginx
# nginx.conf
upstream api {
    server api1:3000;
    server api2:3000;
    server api3:3000;
}

server {
    listen 80;
    
    location / {
        proxy_pass http://api;
    }
}
```

### Example 2: Read Replicas

```javascript
// Database scaling with read replicas
const readReplicas = [
    new Pool({ host: 'replica1.example.com' }),
    new Pool({ host: 'replica2.example.com' }),
    new Pool({ host: 'replica3.example.com' })
];

let replicaIndex = 0;

function getReadConnection() {
    const replica = readReplicas[replicaIndex];
    replicaIndex = (replicaIndex + 1) % readReplicas.length;
    return replica;
}

// Use for reads
app.get('/users', async (req, res) => {
    const conn = getReadConnection();
    const users = await conn.query('SELECT * FROM users');
    res.json(users.rows);
});

// Use primary for writes
const primaryPool = new Pool({ host: 'primary.example.com' });

app.post('/users', async (req, res) => {
    const user = await primaryPool.query('INSERT INTO users ...', req.body);
    res.json(user.rows[0]);
});
```

## Best Practices

1. **Start Simple**: Optimize code first
2. **Scale Horizontally**: Add more instances
3. **Use Load Balancer**: Distribute load
4. **Cache Aggressively**: Reduce database load
5. **Monitor**: Track performance and scale accordingly

## Summary

**Scaling Strategies:**

1. **Vertical**: Increase server resources
2. **Horizontal**: Add more servers
3. **Techniques**: Load balancing, read replicas, caching
4. **Best Practice**: Start simple, scale horizontally, monitor
5. **Iterative**: Continuously measure and scale

**Key Takeaway:**
Scaling strategies help applications handle increasing load. Start with code optimization, then scale horizontally by adding more instances behind a load balancer. Use read replicas for database scaling and caching to reduce load. Monitor performance and scale iteratively based on metrics.

**Scaling Approach:**
- Optimize code first
- Scale horizontally
- Use load balancing
- Cache aggressively
- Monitor and iterate

**Next Steps:**
- Learn [Performance Optimization](performance_optimization.md) for tuning
- Study [Dockerizing Express](dockerizing_express.md) for containerization
- Master [Monitoring](../14_observability/) for performance tracking

