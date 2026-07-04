# PM2 vs Docker — Comparison

## What is PM2?

PM2 is a **process manager for Node.js applications**.

Features:
* Auto-restart on crash
* Cluster mode (multi-core)
* Log management
* Monitoring
* Zero-downtime reload

---

## Key Terms

* **Process manager** (keeps app running): starts, restarts, and monitors app processes.
* **Daemon** (background manager process): PM2 itself keeps running in the background.
* **Cluster mode** (multiple Node processes): uses multiple CPU cores for one app.
* **Zero-downtime reload** (restart without dropping traffic): reloads workers one by one.
* **Startup script** (auto-start after reboot): restores PM2 apps when server restarts.
* **Container isolation** (Docker boundary): app gets isolated filesystem, network, and dependencies.
* **Restart policy** (auto-restart rule): Docker restarts crashed containers.
* **Immutable image** (same package everywhere): deploy a built image instead of changing server manually.

---

## What is Docker?

Docker is a **containerization platform** for any application.

Features:
* Process isolation
* Dependency packaging
* Portable across environments
* Language-agnostic
* Orchestration support

---

## PM2 vs Docker Comparison

| Feature | PM2 | Docker |
| ------- | --- | ------ |
| **Language** | Node.js only | Any language |
| **Isolation** | ❌ Process level only | ✅ Full isolation |
| **Dependencies** | System-level | Packaged in image |
| **Portability** | ❌ "Works on my machine" | ✅ Runs anywhere |
| **Scaling** | Limited (single server) | High (orchestration) |
| **Restart on crash** | ✅ | ✅ (with restart policy) |
| **Zero-downtime** | ✅ | ✅ (with orchestrator) |
| **Monitoring** | Built-in | External tools |
| **Learning curve** | Low | Medium |
| **Production use** | Small apps | Industry standard |

---

## PM2 Usage

### Installation
```bash
npm install -g pm2
```

### Basic Commands
```bash
# Start application
pm2 start server.js --name my-app

# Start with cluster mode (use all CPU cores)
pm2 start server.js -i max

# List processes
pm2 list

# Monitor
pm2 monit

# Logs
pm2 logs my-app

# Restart
pm2 restart my-app

# Stop
pm2 stop my-app

# Delete
pm2 delete my-app

# Save process list (auto-restart on reboot)
pm2 save
pm2 startup
```

### Ecosystem File (pm2.config.js)
```javascript
module.exports = {
  apps: [{
    name: 'api',
    script: './server.js',
    instances: 4,  // or 'max' for all CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    max_memory_restart: '500M',
    autorestart: true,
    watch: false
  }]
};
```

Start with ecosystem file:
```bash
pm2 start pm2.config.js
```

---

## Docker Usage

### Dockerfile
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

### Build and Run
```bash
# Build image
docker build -t my-app .

# Run container
docker run -d -p 3000:3000 --name my-app-container --restart=always my-app
```

### Docker Compose
```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3000:3000"
    restart: always
    environment:
      - NODE_ENV=production
```

```bash
docker-compose up -d
```

---

## When to Use PM2

✅ **Small to medium Node.js applications**
✅ **Single server deployment**
✅ **Quick setup needed**
✅ **Team familiar with Node.js only**
✅ **Development/staging environments**

### Example Use Cases:
- Personal projects
- Startups with single server
- Internal tools
- Prototypes

---

## When to Use Docker

✅ **Multi-language applications**
✅ **Microservices architecture**
✅ **Need for isolation**
✅ **CI/CD pipelines**
✅ **Cloud deployments (AWS, GCP, Azure)**
✅ **Kubernetes/orchestration**

### Example Use Cases:
- Production applications
- Microservices
- Multi-environment deployments
- Team with diverse tech stack

---

## Can You Use Both?

**Yes!** PM2 inside Docker for Node.js apps:

```dockerfile
FROM node:18-alpine

# Install PM2
RUN npm install -g pm2

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

EXPOSE 3000

# Start with PM2
CMD ["pm2-runtime", "start", "pm2.config.js"]
```

**Benefits**:
- Docker isolation + PM2 cluster mode
- Best of both worlds

**When to do this**:
- Need cluster mode in Docker
- Want PM2 monitoring inside container

---

## Production Deployment Comparison

### PM2 Deployment
```bash
# SSH into server
ssh user@server

# Pull latest code
git pull

# Install dependencies
npm install

# Restart with PM2
pm2 restart all
```

### Docker Deployment
```bash
# Build image
docker build -t my-app:v2 .

# Push to registry
docker push my-registry/my-app:v2

# Pull and run on server
ssh user@server
docker pull my-registry/my-app:v2
docker stop my-app-container
docker rm my-app-container
docker run -d -p 3000:3000 --name my-app-container my-registry/my-app:v2
```

---

## Modern Production Stack

```
PM2        → Small apps, single server
Docker     → Standard for most apps
Kubernetes → Large-scale, multi-service
```

**Industry trend**: Docker is becoming the standard, even for small apps.

---

## Interview Questions

**Q: When would you choose PM2 over Docker?**
A: For simple Node.js apps on a single server where quick setup is needed and team is not familiar with Docker.

**Q: Can PM2 provide the same isolation as Docker?**
A: No. PM2 only manages processes. Docker provides full isolation (filesystem, network, resources).

**Q: What is cluster mode in PM2?**
A: PM2 can spawn multiple instances of your app (one per CPU core) and load balance between them.

**Q: Why is Docker preferred in production?**
A: Consistency across environments, better isolation, easier scaling, and works with orchestration tools like Kubernetes.

---

## Migration Path

If you're currently using PM2:

1. **Start small**: Dockerize one service
2. **Learn Docker Compose**: Manage multi-container apps
3. **CI/CD integration**: Automate builds
4. **Consider orchestration**: Kubernetes for scale

---

## Best Practices

### PM2
✅ Use ecosystem file
✅ Enable `pm2 startup` for auto-restart
✅ Monitor logs regularly
✅ Set memory limits
✅ Use cluster mode for CPU-intensive apps

### Docker
✅ Use multi-stage builds
✅ Run as non-root user
✅ Set restart policies
✅ Use health checks
✅ Keep images small

---

## Summary

| Scenario | Recommendation |
| -------- | -------------- |
| Node.js app, single server | PM2 |
| Multi-language, microservices | Docker |
| Need isolation | Docker |
| Quick prototype | PM2 |
| Production (modern) | Docker |
| Large scale | Docker + Kubernetes |

**Key Insight**: PM2 is great for Node.js simplicity. Docker is the industry standard for production deployments.
