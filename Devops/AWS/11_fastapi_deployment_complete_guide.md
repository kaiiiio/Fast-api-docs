# Complete FastAPI Deployment Guide on AWS

A comprehensive guide covering all deployment methods for FastAPI applications on AWS with step-by-step procedures, Linux commands, and best practices.

## Table of Contents
1. [Deployment Methods Comparison](#deployment-methods-comparison)
2. [Method 1: EC2 with Uvicorn + Nginx](#method-1-ec2-with-uvicorn--nginx-recommended)
3. [Method 2: Lambda with Mangum](#method-2-lambda-with-mangum)
4. [Method 3: ECS/Fargate with Docker](#method-3-ecsfargate-with-docker)
5. [Method 4: Elastic Beanstalk](#method-4-elastic-beanstalk)
6. [Database Connections](#database-connections)
7. [Environment Variables](#environment-variables)
8. [SSL/HTTPS Setup](#sslhttps-setup)

---

## Deployment Methods Comparison

| Method | Pros | Cons | Best For | Monthly Cost |
|--------|------|------|----------|--------------|
| **EC2 + Uvicorn** | Full control, async support, cost-effective | Manual setup, server management | Production APIs, WebSocket support | $10-50 |
| **Lambda + Mangum** | Serverless, auto-scaling, pay-per-use | Cold starts, no WebSocket, 15min timeout | REST APIs, variable traffic | $0-20 |
| **ECS/Fargate** | Docker-based, auto-scaling, modern | More complex, higher cost | Microservices, containerized apps | $30-100 |
| **Elastic Beanstalk** | Easiest setup, managed platform | Less control, AWS lock-in | Quick deployments, MVPs | $20-60 |

---

## Method 1: EC2 with Uvicorn + Nginx (Recommended)

### Overview
Deploy FastAPI on EC2 with Uvicorn ASGI server and Nginx reverse proxy.

**Pros:**
- Full async/await support
- WebSocket support
- High performance
- Full control

**Cons:**
- Manual server management
- Need to handle scaling

---

### Step 1: Launch EC2 Instance

```bash
# 1. AWS Console → EC2 → Launch Instance
# 2. Choose Ubuntu Server 22.04 LTS
# 3. Instance type: t3.micro (free tier) or t3.small (production)
# 4. Create key pair (download .pem file)
# 5. Security Group: Allow SSH (22), HTTP (80), HTTPS (443)
# 6. Launch instance
```

---

### Step 2: Connect to EC2

```bash
# Make key secure
chmod 400 your-key.pem

# Connect via SSH
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

---

### Step 3: Install Python and Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python 3.11
sudo apt install -y python3.11 python3.11-venv python3-pip

# Verify installation
python3.11 --version  # Should show Python 3.11.x

# Install system dependencies
sudo apt install -y build-essential libpq-dev python3-dev
```

---

### Step 4: Setup Application

```bash
# Create app directory
sudo mkdir -p /var/www/fastapi-app
sudo chown -R ubuntu:ubuntu /var/www/fastapi-app
cd /var/www/fastapi-app

# Clone repository
git clone https://github.com/yourusername/your-fastapi-app.git .

# Or upload via SCP
# scp -i your-key.pem -r ./local-app ubuntu@your-ec2-ip:/var/www/fastapi-app

# Create virtual environment
python3.11 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Install Uvicorn and Gunicorn
pip install uvicorn[standard] gunicorn
```

**requirements.txt:**
```txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
gunicorn==21.2.0
pydantic==2.5.0
pydantic-settings==2.1.0
python-multipart==0.0.6
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
sqlalchemy==2.0.25
asyncpg==0.29.0  # For PostgreSQL
aioredis==2.0.1  # For Redis
python-dotenv==1.0.0
```

---

### Step 5: Create Environment File

```bash
# Create .env file
nano .env
```

**.env:**
```bash
# Application
APP_NAME=MyFastAPI
ENVIRONMENT=production
DEBUG=False

# Server
HOST=0.0.0.0
PORT=8000

# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/dbname

# Redis
REDIS_URL=redis://localhost:6379/0

# Security
SECRET_KEY=your-super-secret-key-here-change-this
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
CORS_ORIGINS=["https://yourdomain.com"]
```

---

### Step 6: Create Systemd Service

```bash
# Create service file
sudo nano /etc/systemd/system/fastapi.service
```

**/etc/systemd/system/fastapi.service:**
```ini
[Unit]
Description=FastAPI Application
After=network.target

[Service]
Type=notify
User=ubuntu
Group=ubuntu
WorkingDirectory=/var/www/fastapi-app
Environment="PATH=/var/www/fastapi-app/venv/bin"
EnvironmentFile=/var/www/fastapi-app/.env

# Gunicorn with Uvicorn workers (recommended for production)
ExecStart=/var/www/fastapi-app/venv/bin/gunicorn \
    -k uvicorn.workers.UvicornWorker \
    -w 4 \
    --bind 0.0.0.0:8000 \
    --timeout 120 \
    --access-logfile /var/www/fastapi-app/logs/access.log \
    --error-logfile /var/www/fastapi-app/logs/error.log \
    main:app

# Or use Uvicorn directly (simpler)
# ExecStart=/var/www/fastapi-app/venv/bin/uvicorn \
#     main:app \
#     --host 0.0.0.0 \
#     --port 8000 \
#     --workers 4 \
#     --log-level info

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Create logs directory
mkdir -p /var/www/fastapi-app/logs

# Reload systemd
sudo systemctl daemon-reload

# Start service
sudo systemctl start fastapi

# Enable on boot
sudo systemctl enable fastapi

# Check status
sudo systemctl status fastapi

# View logs
sudo journalctl -u fastapi -f
```

---

### Step 7: Install and Configure Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/fastapi
```

**/etc/nginx/sites-available/fastapi:**
```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

upstream fastapi_backend {
    server 127.0.0.1:8000;
    keepalive 32;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    client_max_body_size 10M;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    location / {
        # Rate limiting
        limit_req zone=api_limit burst=20 nodelay;
        
        proxy_pass http://fastapi_backend;
        proxy_http_version 1.1;
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffering
        proxy_buffering off;
        proxy_request_buffering off;
    }
    
    # WebSocket support
    location /ws {
        proxy_pass http://fastapi_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }
    
    # Static files (if any)
    location /static {
        alias /var/www/fastapi-app/static;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/fastapi /etc/nginx/sites-enabled/

# Remove default
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Enable on boot
sudo systemctl enable nginx
```

---

### Step 8: Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow prompts:
# - Enter email
# - Agree to terms
# - Choose redirect HTTP to HTTPS (option 2)

# Test auto-renewal
sudo certbot renew --dry-run

# Certificate auto-renews via cron
```

---

### Step 9: Setup Firewall

```bash
# Enable UFW
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Check status
sudo ufw status
```

---

### Step 10: Database Migrations

```bash
# Activate virtual environment
cd /var/www/fastapi-app
source venv/bin/activate

# Run Alembic migrations
alembic upgrade head

# Or create initial migration
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

---

## Method 2: Lambda with Mangum

### Overview
Deploy FastAPI as serverless function using Mangum adapter.

**Best for:** REST APIs with variable traffic (no WebSocket support)

---

### Step 1: Install Mangum

```bash
# Install Mangum
pip install mangum

# Update requirements.txt
echo "mangum==0.17.0" >> requirements.txt
```

---

### Step 2: Modify main.py

**main.py:**
```python
from fastapi import FastAPI
from mangum import Mangum

app = FastAPI(
    title="My FastAPI",
    root_path="/prod"  # API Gateway stage name
)

@app.get("/")
async def root():
    return {"message": "Hello from Lambda!"}

@app.get("/api/users")
async def get_users():
    return {"users": []}

# Lambda handler
handler = Mangum(app, lifespan="off")
```

---

### Step 3: Create Deployment Package

```bash
# Create deployment directory
mkdir lambda-package
cd lambda-package

# Install dependencies
pip install -r ../requirements.txt -t .

# Copy application code
cp ../main.py .
cp -r ../app .

# Create ZIP file
zip -r ../fastapi-lambda.zip .
cd ..
```

---

### Step 4: Deploy to Lambda

```bash
# Create Lambda function
aws lambda create-function \
  --function-name fastapi-lambda \
  --runtime python3.11 \
  --role arn:aws:iam::123456789012:role/lambda-execution-role \
  --handler main.handler \
  --zip-file fileb://fastapi-lambda.zip \
  --timeout 30 \
  --memory-size 512 \
  --environment Variables={DATABASE_URL=postgresql://...}

# Update function code
aws lambda update-function-code \
  --function-name fastapi-lambda \
  --zip-file fileb://fastapi-lambda.zip
```

---

### Step 5: Setup API Gateway

```bash
# Create HTTP API
aws apigatewayv2 create-api \
  --name fastapi-api \
  --protocol-type HTTP \
  --target arn:aws:lambda:us-east-1:123456789012:function:fastapi-lambda

# Output will show API endpoint:
# https://abc123.execute-api.us-east-1.amazonaws.com
```

---

## Method 3: ECS/Fargate with Docker

### Overview
Deploy containerized FastAPI using Docker on AWS ECS with Fargate.

**Best for:** Microservices, modern DevOps, auto-scaling

---

### Step 1: Create Dockerfile

**Dockerfile:**
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD python -c "import requests; requests.get('http://localhost:8000/health')" || exit 1

# Run with Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

**.dockerignore:**
```
__pycache__
*.pyc
*.pyo
*.pyd
.Python
venv/
.env
.git
.gitignore
README.md
.pytest_cache
.coverage
htmlcov/
```

---

### Step 2: Build and Test Locally

```bash
# Build image
docker build -t fastapi-app .

# Run locally
docker run -p 8000:8000 \
  -e DATABASE_URL=postgresql://... \
  -e SECRET_KEY=your-secret \
  fastapi-app

# Test
curl http://localhost:8000/docs
```

---

### Step 3: Push to ECR

```bash
# Create ECR repository
aws ecr create-repository --repository-name fastapi-app

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789012.dkr.ecr.us-east-1.amazonaws.com

# Tag image
docker tag fastapi-app:latest \
  123456789012.dkr.ecr.us-east-1.amazonaws.com/fastapi-app:latest

# Push
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/fastapi-app:latest
```

---

### Step 4: Create ECS Task Definition

**task-definition.json:**
```json
{
  "family": "fastapi-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "fastapi-app",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/fastapi-app:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "ENVIRONMENT",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:fastapi/db-url"
        },
        {
          "name": "SECRET_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:fastapi/secret-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/fastapi-app",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

```bash
# Register task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create cluster
aws ecs create-cluster --cluster-name fastapi-cluster

# Create service
aws ecs create-service \
  --cluster fastapi-cluster \
  --service-name fastapi-service \
  --task-definition fastapi-app \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-12345],securityGroups=[sg-12345],assignPublicIp=ENABLED}"
```

---

## Method 4: Elastic Beanstalk

### Overview
Easiest deployment - upload code, Beanstalk handles everything.

---

### Step 1: Install EB CLI

```bash
pip install awsebcli
```

---

### Step 2: Create Application

```bash
# Initialize
eb init -p python-3.11 fastapi-app

# Create environment
eb create fastapi-env

# Deploy
eb deploy

# Open in browser
eb open
```

---

### Step 3: Configure

**.ebextensions/python.config:**
```yaml
option_settings:
  aws:elasticbeanstalk:container:python:
    WSGIPath: main:app
  aws:elasticbeanstalk:application:environment:
    PYTHONPATH: "/var/app/current:$PYTHONPATH"
```

**Procfile:**
```
web: uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## Database Connections

### PostgreSQL with SQLAlchemy (Async)

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "postgresql+asyncpg://user:pass@host:5432/db"

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_size=20,
    max_overflow=0,
    pool_pre_ping=True,
    pool_recycle=3600,
)

async_session_maker = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def get_db():
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```

---

## Environment Variables

### Using Pydantic Settings

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "FastAPI"
    environment: str = "production"
    debug: bool = False
    
    database_url: str
    redis_url: str
    secret_key: str
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
```

---

## SSL/HTTPS Setup

Same as Node.js guide - use Let's Encrypt or AWS Certificate Manager.

---

## Monitoring

### Application Logs

```bash
# View systemd logs
sudo journalctl -u fastapi -f

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# View application logs
tail -f /var/www/fastapi-app/logs/access.log
```

---

## Troubleshooting

### Common Issues

**1. Service won't start:**
```bash
# Check service status
sudo systemctl status fastapi

# View logs
sudo journalctl -u fastapi -n 100

# Test manually
cd /var/www/fastapi-app
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000
```

**2. Database connection errors:**
```bash
# Test database connection
python3 -c "import asyncpg; import asyncio; asyncio.run(asyncpg.connect('postgresql://...'))"

# Check PostgreSQL is running
sudo systemctl status postgresql
```

**3. Permission errors:**
```bash
# Fix ownership
sudo chown -R ubuntu:ubuntu /var/www/fastapi-app

# Fix permissions
chmod -R 755 /var/www/fastapi-app
```

---

## Best Practices

1. ✅ **Use async database drivers** (asyncpg, motor)
2. ✅ **Use Gunicorn with Uvicorn workers** for production
3. ✅ **Enable HTTPS** with SSL certificates
4. ✅ **Use environment variables** for configuration
5. ✅ **Setup proper logging** with rotation
6. ✅ **Use connection pooling** for databases
7. ✅ **Enable CORS** properly
8. ✅ **Setup monitoring** with CloudWatch
9. ✅ **Use systemd** for process management
10. ✅ **Regular backups** of database

---

## Performance Optimization

### 1. Use Gunicorn with Multiple Workers

```bash
gunicorn -k uvicorn.workers.UvicornWorker -w 4 main:app
# Workers = (2 x CPU cores) + 1
```

### 2. Enable Gzip Compression

**Nginx:**
```nginx
gzip on;
gzip_types text/plain application/json;
gzip_min_length 1000;
```

### 3. Use Redis for Caching

```python
from aioredis import Redis

redis = Redis.from_url("redis://localhost")

@app.get("/cached-data")
async def get_cached_data():
    cached = await redis.get("data")
    if cached:
        return json.loads(cached)
    
    data = await fetch_data()
    await redis.setex("data", 3600, json.dumps(data))
    return data
```

---

## Next Steps

- **Read Docker/ECS Guide** for advanced container deployment
- **Read Security Best Practices** for production hardening
- **Setup CI/CD** with GitHub Actions
- **Configure monitoring** with CloudWatch

This guide covers all major FastAPI deployment methods on AWS. Choose based on your needs and scale accordingly.
