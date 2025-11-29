# Dockerizing FastAPI with Gunicorn: Production Deployment

Dockerizing your FastAPI application properly is essential for production. This guide teaches you how to create production-ready Docker images and run them with Gunicorn.

## Understanding the Components

**What you need:**
- **Docker**: Containerizes your application
- **Gunicorn**: Production WSGI/ASGI server
- **Uvicorn Workers**: ASGI workers for FastAPI

**Why Gunicorn + Uvicorn?**
- Gunicorn manages workers (process management)
- Uvicorn workers handle async requests
- Together: Multi-process, multi-threaded, production-ready

## Step 1: Basic Dockerfile

Let's start with a simple Dockerfile:

```dockerfile
# Use Python 3.11 slim image (smaller size)
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (for better caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run with Gunicorn + Uvicorn
CMD ["gunicorn", "app.main:app", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
```

**Understanding each line:**
- `FROM python:3.11-slim` - Base image (Python 3.11, minimal size)
- `WORKDIR /app` - Working directory inside container
- `ENV` - Environment variables
- `COPY requirements.txt` - Copy dependencies file first (Docker layers cache)
- `RUN pip install` - Install dependencies
- `COPY .` - Copy application code
- `CMD` - Command to run when container starts

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

# Create non-root user for security
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Health check
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

**Understanding multi-stage build:**
- **Builder stage**: Installs build tools, compiles packages
- **Production stage**: Only runtime dependencies, smaller image

## Step 3: Gunicorn Configuration

Create a gunicorn config file:

```python
# gunicorn_conf.py
import multiprocessing
import os

# Server socket
bind = "0.0.0.0:8000"
backlog = 2048

# Worker processes
workers = int(os.getenv("WORKERS", multiprocessing.cpu_count() * 2 + 1))
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000
timeout = 120
keepalive = 5

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

