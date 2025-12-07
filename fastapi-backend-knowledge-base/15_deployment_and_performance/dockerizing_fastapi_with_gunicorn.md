# Dockerizing FastAPI with Gunicorn: Production Deployment

Dockerizing your FastAPI application properly is essential for production. This guide teaches you how to create production-ready Docker images and run them with Gunicorn.

## Understanding the Components

**What you need:** **Docker** (containerizes your application), **Gunicorn** (production WSGI/ASGI server), and **Uvicorn Workers** (ASGI workers for FastAPI).

**Why Gunicorn + Uvicorn?** Gunicorn manages workers (process management), Uvicorn workers handle async requests, and together they provide multi-process, multi-threaded, production-ready setup.

## Step 1: Basic Dockerfile

Let's start with a simple Dockerfile:

```dockerfile
# Use Python 3.11 slim image: Smaller size, faster builds.
FROM python:3.11-slim

# Set working directory: All commands run from /app.
WORKDIR /app

# Set environment variables: Unbuffered output, no .pyc files.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Install system dependencies: PostgreSQL client for DB connections.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*  # Clean up to reduce image size

# Copy requirements first: Docker caches this layer (faster rebuilds).
COPY requirements.txt .

# Install Python dependencies: --no-cache-dir reduces image size.
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code: This layer changes most often.
COPY . .

# Expose port: Document which port the app uses.
EXPOSE 8000

# Run with Gunicorn + Uvicorn: Production-ready ASGI server.
CMD ["gunicorn", "app.main:app", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
```

**Understanding each line:** `FROM python:3.11-slim` is base image (Python 3.11, minimal size), `WORKDIR /app` sets working directory inside container, `ENV` sets environment variables, `COPY requirements.txt` copies dependencies file first (Docker layers cache), `RUN pip install` installs dependencies, `COPY .` copies application code, and `CMD` is command to run when container starts.

## Step 2: Production-Ready Dockerfile

Optimized for production:

```dockerfile
FROM python:3.11-slim as builder

# Install build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc \
    postgresql-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.11-slim

# Runtime dependencies only
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /root/.local /root/.local

# Make sure scripts in .local are usable
ENV PATH=/root/.local/bin:$PATH

# Copy application
COPY . .

# Create non-root user: Security best practice (don't run as root).
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser  # Switch to non-root user

# Health check: Docker monitors container health automatically.
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8000/health')"

# Expose port
EXPOSE 8000

# Gunicorn command with proper configuration
CMD ["gunicorn", \
     "app.main:app", \
     "-k", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "4", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--log-level", "info", \
     "--timeout", "120"]
```

**Understanding multi-stage build:** **Builder stage** installs build tools and compiles packages. **Production stage** includes only runtime dependencies, resulting in a smaller image.

## Step 3: Gunicorn Configuration

Create a gunicorn config file:

```python
# gunicorn_conf.py
import multiprocessing
import os

# Server socket
bind = "0.0.0.0:8000"
backlog = 2048

# Worker processes: Formula: (2 × CPU cores) + 1 (optimal for most cases).
workers = int(os.getenv("WORKERS", multiprocessing.cpu_count() * 2 + 1))
worker_class = "uvicorn.workers.UvicornWorker"  # ASGI worker for FastAPI
worker_connections = 1000  # Max connections per worker
timeout = 120  # Worker timeout (seconds)
keepalive = 5  # Keep connections alive

# Logging
accesslog = "-"  # stdout
errorlog = "-"   # stderr
loglevel = os.getenv("LOG_LEVEL", "info")
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = "fastapi_app"

# Server mechanics
daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None

def on_starting(server):
    """Called just before the master process is initialized."""
    server.log.info("Starting FastAPI application")

def on_reload(server):
    """Called to recycle workers during a reload via SIGHUP."""
    server.log.info("Reloading application")

def worker_int(worker):
    """Called when a worker receives SIGINT or SIGQUIT."""
    worker.log.info("Worker received INT or QUIT signal")

def pre_fork(server, worker):
    """Called just before a worker is forked."""
    pass

def post_fork(server, worker):
    """Called just after a worker has been forked."""
    server.log.info(f"Worker spawned (pid: {worker.pid})")

def post_worker_init(worker):
    """Called just after a worker has initialized the application."""
    worker.log.info("Worker initialized")
```

**Update Dockerfile to use config:**

```dockerfile
CMD ["gunicorn", "app.main:app", "-c", "gunicorn_conf.py"]
```

## Step 4: Docker Compose for Development

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+asyncpg://user:password@db:5432/app
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    volumes:
      - .:/app  # Mount code for development
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: app
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

## Step 5: Production Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  web:
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - WORKERS=4
    depends_on:
      - db
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G

  db:
    image: postgres:15
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Step 6: .dockerignore

Exclude unnecessary files:

```
# .dockerignore
__pycache__
*.pyc
*.pyo
*.pyd
.Python
*.so
*.egg
*.egg-info
dist
build
.env
.venv
venv/
*.db
*.sqlite
.git
.gitignore
.pytest_cache
.coverage
htmlcov/
.DS_Store
*.log
```

## Step 7: Building and Running

```bash
# Build image
docker build -t fastapi-app .

# Run container
docker run -p 8000:8000 \
  -e DATABASE_URL="postgresql+asyncpg://..." \
  fastapi-app

# Or with docker-compose
docker-compose up -d
```

## Best Practices

1. **Multi-stage builds** - Smaller production images
2. **Non-root user** - Security
3. **Health checks** - Container orchestration
4. **Environment variables** - Configuration
5. **.dockerignore** - Faster builds

## Summary

Production Docker setup provides:
- ✅ Consistent environments
- ✅ Easy deployment
- ✅ Scalability
- ✅ Isolation

Follow these patterns for production-ready FastAPI deployments!

---

## 🎯 Interview Questions: FastAPI

### Q1: Explain Dockerizing FastAPI applications with Gunicorn, including multi-stage builds, Gunicorn configuration, Docker Compose setup, and production best practices. Provide detailed examples showing a complete production deployment setup.

**Answer:**

**Docker Overview:**

Docker containerizes FastAPI applications, ensuring consistent environments across development, staging, and production. Gunicorn serves as the production WSGI/ASGI server, handling multiple worker processes.

**Why Docker + Gunicorn:**

**Without Docker (Inconsistent):**
```python
# ❌ Bad: Different environments
# Development: Python 3.11, dependencies X
# Production: Python 3.9, dependencies Y
# Problem: "Works on my machine" issues
```

**With Docker (Consistent):**
```python
# ✅ Good: Same environment everywhere
# Docker image ensures consistency
# Gunicorn handles production workload
```

**Multi-Stage Dockerfile:**
```dockerfile
# Stage 1: Build dependencies
FROM python:3.11-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Stage 2: Production image
FROM python:3.11-slim

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /root/.local /root/.local

# Copy application code
COPY . .

# Make sure scripts are executable
ENV PATH=/root/.local/bin:$PATH

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Run with Gunicorn
CMD ["gunicorn", "app.main:app", "-k", "uvicorn.workers.UvicornWorker", "-w", "4", "-b", "0.0.0.0:8000"]
```

**Gunicorn Configuration:**
```python
# gunicorn_config.py
import multiprocessing

# Server socket
bind = "0.0.0.0:8000"
backlog = 2048

# Worker processes
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000
timeout = 30
keepalive = 2

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"

# Process naming
proc_name = "fastapi-app"

# Server mechanics
daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None
```

**Docker Compose:**
```yaml
version: '3.8'

services:
  web:
    build: .
    restart: unless-stopped
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - db
      - redis
    ports:
      - "8000:8000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

**Best Practices:**

**1. Multi-Stage Builds:**
```dockerfile
# Smaller production images
# Separate build and runtime
# Security: Fewer packages in production
```

**2. Non-Root User:**
```dockerfile
# Security best practice
# Run as non-root user
# Reduce attack surface
```

**3. Health Checks:**
```yaml
# Container orchestration
# Automatic restart on failure
# Traffic routing decisions
```

**System Design Consideration**: Docker + Gunicorn provides:
1. **Consistency**: Same environment everywhere
2. **Scalability**: Multiple workers handle load
3. **Security**: Isolated containers
4. **Deployment**: Easy CI/CD integration

Dockerizing FastAPI with Gunicorn is essential for production deployments. Understanding multi-stage builds, Gunicorn configuration, Docker Compose, and best practices is crucial for building scalable, secure applications.

---

### Q2: Explain Gunicorn worker configuration, worker types (sync vs async), worker count optimization, and monitoring. Discuss when to use Gunicorn vs Uvicorn directly and performance considerations.

**Answer:**

**Gunicorn Workers:**

**Sync Workers:**
```python
# Standard workers for sync code
worker_class = "sync"
workers = 4
```

**Async Workers (Uvicorn):**
```python
# For async FastAPI applications
worker_class = "uvicorn.workers.UvicornWorker"
workers = (2 * CPU_COUNT) + 1
```

**Worker Count Optimization:**
```python
# Formula: (2 × CPU_COUNT) + 1
# Too few: Underutilized CPU
# Too many: Context switching overhead
```

**Monitoring:**
```python
# Track worker health
# Monitor request rates
# Watch for worker timeouts
```

**System Design Consideration**: Gunicorn configuration requires:
1. **Worker Type**: Choose sync vs async
2. **Worker Count**: Optimize for CPU
3. **Monitoring**: Track performance
4. **Scaling**: Adjust based on load

Understanding Gunicorn workers, optimization, and monitoring is essential for production deployments.


