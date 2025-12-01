# Dockerizing Express.js: Containerizing Your Application

Dockerizing Express.js applications enables consistent deployments across environments. This guide covers creating Docker images and running Express.js applications in containers.

## What is Docker?

**Docker** packages applications and dependencies into containers that run consistently across different environments.

### Benefits

```
- Consistent environments
- Easy deployment
- Isolation
- Scalability
```

## Basic Dockerfile

### Simple Dockerfile

```dockerfile
# Use Node.js LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "server.js"]
```

### Multi-Stage Build

```dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY . .

# Build application (if needed)
RUN npm run build

# Stage 2: Production
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3000

CMD ["node", "server.js"]
```

## Docker Compose

### docker-compose.yml

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@db:5432/mydb
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=mydb
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## Real-World Examples

### Example 1: Production Dockerfile

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Rebuild source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER nodejs

EXPOSE 3000

ENV PORT=3000

CMD ["node", "dist/server.js"]
```

### Example 2: With Health Check

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node healthcheck.js

CMD ["node", "server.js"]
```

```javascript
// healthcheck.js
const http = require('http');

const options = {
    host: 'localhost',
    port: process.env.PORT || 3000,
    path: '/health',
    timeout: 2000
};

const request = http.request(options, (res) => {
    if (res.statusCode === 200) {
        process.exit(0);
    } else {
        process.exit(1);
    }
});

request.on('error', () => {
    process.exit(1);
});

request.end();
```

## Best Practices

1. **Use Multi-Stage Builds**: Reduce image size
2. **Non-Root User**: Run as non-root user
3. **Layer Caching**: Order Dockerfile for better caching
4. **Health Checks**: Add health checks
5. **.dockerignore**: Exclude unnecessary files

### .dockerignore

```
node_modules
npm-debug.log
.git
.env
.env.local
dist
coverage
*.md
```

## Summary

**Dockerizing Express.js:**

1. **Purpose**: Containerize applications for consistent deployment
2. **Dockerfile**: Multi-stage builds, non-root user, health checks
3. **Docker Compose**: Multi-container applications
4. **Best Practice**: Use multi-stage builds, non-root user, health checks
5. **Benefits**: Consistent environments, easy deployment, scalability

**Key Takeaway:**
Dockerizing Express.js applications enables consistent deployments across environments. Use multi-stage builds to reduce image size, run as non-root user for security, and add health checks for monitoring. Use Docker Compose for multi-container applications with databases and Redis.

**Docker Best Practices:**
- Multi-stage builds
- Non-root user
- Health checks
- Layer caching
- .dockerignore

**Next Steps:**
- Learn [Performance Optimization](performance_optimization.md) for tuning
- Study [Scaling Strategies](scaling_strategies.md) for growth
- Master [Monitoring](../14_observability/) for observability

