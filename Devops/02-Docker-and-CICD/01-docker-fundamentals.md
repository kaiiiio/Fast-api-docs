# Docker — Fundamentals

## Docker is NOT a VM

| VM      | Docker        |
| ------- | ------------- |
| Full OS | Shared kernel |
| Heavy   | Lightweight   |
| Slow boot (minutes) | Fast (seconds) |
| GB of disk | MB of disk |
| Hardware virtualization | Process isolation |

**Docker = Process isolation using Linux kernel features (namespaces, cgroups)**

---

## Key Terms

* **Image** (read-only app package): code + dependencies + runtime.
* **Container** (running image): isolated process created from an image.
* **Dockerfile** (image recipe): instructions to build an image.
* **Layer** (cached build step): each Dockerfile instruction creates reusable image history.
* **Build context** (files sent to Docker): usually current project folder.
* **Registry** (image storage): Docker Hub, ECR, GitHub Container Registry.
* **Volume** (persistent container data): keeps data after container is removed.
* **Bind mount** (host folder mounted inside container): useful in local development.
* **Port mapping** (host port to container port): example `-p 3000:3000`.
* **Health check** (container self-test): tells Docker/orchestrator if app is healthy.
* **Multi-stage build** (build in one stage, run in another): reduces final image size.
* **Layer caching** (reuse unchanged build steps): makes builds faster.

---

## Docker Lifecycle

```
Dockerfile → Image → Container
```

### 1. Dockerfile
A recipe/blueprint to build an image

### 2. Image
A read-only template with application code + dependencies

### 3. Container
A running instance of an image

---

## Dockerfile Example

```dockerfile
# Base image
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

# Start command
CMD ["node", "server.js"]
```

---

## Docker Commands

### Build Image
```bash
docker build -t my-app:1.0 .
```

### Run Container
```bash
docker run -d -p 3000:3000 --name my-app-container my-app:1.0
```

### List Containers
```bash
docker ps        # Running
docker ps -a     # All
```

### View Logs
```bash
docker logs my-app-container
docker logs -f my-app-container  # Follow
```

### Execute Command in Container
```bash
docker exec -it my-app-container sh
```

### Stop/Remove Container
```bash
docker stop my-app-container
docker rm my-app-container
```

### Remove Image
```bash
docker rmi my-app:1.0
```

---

## Docker Volumes

**Problem**: Data in containers is lost when container is removed.

**Solution**: Volumes persist data outside the container.

```bash
# Named volume
docker run -v my-data:/app/data my-app

# Bind mount (development)
docker run -v $(pwd):/app my-app
```

---

## Docker Networks

Containers can communicate via networks:

```bash
# Create network
docker network create my-network

# Run containers on same network
docker run --network my-network --name db postgres
docker run --network my-network --name api my-app
```

Inside `api` container, you can connect to `db` using hostname `db`.

---

## Docker Compose

Manage multi-container applications:

**docker-compose.yml**
```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://db:5432/mydb
    depends_on:
      - db
      - redis
    volumes:
      - ./logs:/app/logs

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=mydb
      - POSTGRES_PASSWORD=secret
    volumes:
      - db-data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  db-data:
```

### Commands
```bash
docker-compose up -d        # Start all services
docker-compose down         # Stop and remove
docker-compose logs -f api  # View logs
docker-compose ps           # List services
```

---

## Common Docker Mistakes

❌ **Running DB inside container in production**
- Use managed services (RDS, etc.)
- Containers are ephemeral

❌ **No volume mounts**
- Data is lost on container restart

❌ **No .dockerignore**
- Copies unnecessary files (node_modules, .git)

❌ **Running as root**
- Security risk

❌ **Large images**
- Use alpine variants
- Multi-stage builds

❌ **Not using layer caching**
- Copy package.json before code

---

## Best Practices

### 1. Use .dockerignore
```
node_modules
.git
.env
*.log
```

### 2. Multi-stage Builds
```dockerfile
# Build stage
FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY package*.json ./
RUN npm ci --only=production
CMD ["node", "dist/server.js"]
```

### 3. Use Specific Tags
```dockerfile
# ❌ Bad
FROM node

# ✅ Good
FROM node:18-alpine
```

### 4. Run as Non-Root User
```dockerfile
FROM node:18-alpine
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs
```

### 5. Health Checks
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node healthcheck.js
```

---

## Production Dockerfile Example

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Build application
COPY . .
RUN npm run build

# Production image
FROM node:18-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy built files
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node dist/healthcheck.js || exit 1

# Start application
CMD ["node", "dist/server.js"]
```

---

## Interview Questions

**Q: What is the difference between CMD and ENTRYPOINT?**
A: 
- `CMD`: Default command, can be overridden
- `ENTRYPOINT`: Always runs, CMD becomes arguments

```dockerfile
ENTRYPOINT ["node"]
CMD ["server.js"]

# docker run my-app           → node server.js
# docker run my-app app.js    → node app.js
```

**Q: How do you reduce Docker image size?**
A:
1. Use alpine base images
2. Multi-stage builds
3. Remove unnecessary files
4. Combine RUN commands
5. Use .dockerignore

**Q: What happens when a container crashes?**
A: It stops. Use restart policies:
```bash
docker run --restart=always my-app
```

**Q: How do containers communicate?**
A: Via Docker networks. Containers on the same network can use service names as hostnames.

---

## Docker in Production

### Orchestration Tools
- **Docker Swarm**: Built-in, simple
- **Kubernetes**: Industry standard, complex
- **ECS/Fargate**: AWS managed

### Monitoring
```bash
docker stats  # Resource usage
```

### Logging
```bash
docker logs --tail 100 -f container-name
```

### Security
✅ Scan images for vulnerabilities
✅ Use official base images
✅ Run as non-root
✅ Limit resources (CPU, memory)
✅ Use secrets management

---

## Summary

| Concept | Purpose |
| ------- | ------- |
| Dockerfile | Build recipe |
| Image | Template |
| Container | Running instance |
| Volume | Persist data |
| Network | Container communication |
| Compose | Multi-container apps |

**Key Insight**: Docker solves "works on my machine" by packaging everything together.
