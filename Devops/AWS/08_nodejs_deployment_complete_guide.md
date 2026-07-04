# Complete Node.js/Express Deployment Guide on AWS

A comprehensive guide covering all deployment methods for Node.js applications on AWS with step-by-step procedures, Linux commands, and best practices.

## Key Terms

* **PM2** (Node process manager): keeps Node app running and restarts on crash.
* **Cluster mode** (multi-core Node): runs multiple app instances on one server.
* **Nginx reverse proxy** (front server): handles HTTPS and forwards traffic to Node.
* **Elastic IP** (fixed public IP): IP stays same after EC2 restart.
* **Security Group** (server firewall): opens SSH/HTTP/HTTPS ports.
* **Environment variable** (runtime config): `DATABASE_URL`, `JWT_SECRET`, `PORT`.
* **Secrets Manager** (secure secret storage): safer than hardcoded `.env` secrets.
* **ECR** (Docker image registry): stores images for ECS/Fargate.
* **Task definition** (ECS container blueprint): image, ports, env vars, resources.
* **Health check** (is app alive test): used by Docker/ECS/load balancer.
* **SSL certificate** (HTTPS identity): proves domain and encrypts traffic.

## Table of Contents
1. [Deployment Methods Comparison](#deployment-methods-comparison)
2. [Method 1: EC2 with PM2](#method-1-ec2-with-pm2-recommended)
3. [Method 2: Lambda Serverless](#method-2-lambda-serverless)
4. [Method 3: ECS/Fargate with Docker](#method-3-ecsfargate-with-docker)
5. [Method 4: Elastic Beanstalk](#method-4-elastic-beanstalk)
6. [Environment Variables Management](#environment-variables-management)
7. [SSL/HTTPS Setup](#sslhttps-setup)
8. [Database Connection](#database-connection)

---

## Deployment Methods Comparison

| Method | Pros | Cons | Best For | Monthly Cost |
|--------|------|------|----------|--------------|
| **EC2 + PM2** | Full control, flexible, cost-effective | Manual setup, server management | Production apps, consistent traffic | $10-50 |
| **Lambda** | Serverless, auto-scaling, pay-per-use | Cold starts, 15min timeout, complex setup | APIs with variable traffic, webhooks | $0-20 |
| **ECS/Fargate** | Modern, Docker-based, auto-scaling | More complex, higher cost | Microservices, containerized apps | $30-100 |
| **Elastic Beanstalk** | Easiest setup, managed platform | Less control, AWS lock-in | Quick deployments, MVPs | $20-60 |

---

## Method 1: EC2 with PM2 (Recommended)

### Overview
Deploy Node.js app on EC2 instance with PM2 process manager and Nginx reverse proxy.

**Pros:**
- Full control over environment
- Cost-effective for consistent traffic
- Easy to debug and monitor
- Industry standard

**Cons:**
- Manual server management
- Need to handle scaling manually

---

### Step 1: Launch EC2 Instance

```bash
# 1. Go to AWS Console → EC2 → Launch Instance
# 2. Choose Ubuntu Server 22.04 LTS
# 3. Instance type: t3.micro (free tier) or t3.small (production)
# 4. Create new key pair (download .pem file)
# 5. Security Group: Allow SSH (22), HTTP (80), HTTPS (443)
# 6. Launch instance
```

---

### Step 2: Connect to EC2

```bash
# Make key file secure
chmod 400 your-key.pem

# Connect via SSH
ssh -i your-key.pem ubuntu@your-ec2-public-ip

# Example:
ssh -i my-key.pem ubuntu@54.123.45.67
```

---

### Step 3: Install Node.js

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x

# Install build tools (for native modules)
sudo apt install -y build-essential
```

---

### Step 4: Install PM2

```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify installation
pm2 --version
```

---

### Step 5: Deploy Your Application

```bash
# Create app directory
sudo mkdir -p /var/www/myapp
sudo chown -R ubuntu:ubuntu /var/www/myapp
cd /var/www/myapp

# Clone your repository
git clone https://github.com/yourusername/your-nodejs-app.git .

# Or upload files using SCP
# scp -i your-key.pem -r ./local-app-folder ubuntu@your-ec2-ip:/var/www/myapp

# Install dependencies
npm install --production

# Create .env file
nano .env
```

**.env file:**
```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET=your-secret-key-here
```

---

### Step 6: Start Application with PM2

```bash
# Start app with PM2
pm2 start server.js --name "myapp"

# Or use ecosystem file (recommended)
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs myapp

# Monitor
pm2 monit
```

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [{
    name: 'myapp',
    script: './server.js',
    instances: 'max',  // Use all CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

---

### Step 7: Configure PM2 Startup

```bash
# Generate startup script
pm2 startup systemd

# This will output a command like:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

# Run the command it outputs
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

# Save PM2 process list
pm2 save

# Test reboot
sudo reboot

# After reboot, reconnect and check
pm2 list  # Should show your app running
```

---

### Step 8: Install and Configure Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/myapp
```

**Nginx configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/myapp /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Enable Nginx on boot
sudo systemctl enable nginx
```

---

### Step 9: Setup SSL with Let's Encrypt

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

# Certbot auto-renews via cron job
```

---

### Step 10: Setup Firewall

```bash
# Enable UFW firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Check status
sudo ufw status
```

---

## Method 2: Lambda Serverless

### Overview
Deploy Node.js as serverless functions using AWS Lambda + API Gateway.

**Best for:** APIs with variable traffic, webhooks, event-driven applications

---

### Step 1: Prepare Application

**Install Serverless Framework:**
```bash
npm install -g serverless

# Create new serverless project
serverless create --template aws-nodejs --path my-lambda-app
cd my-lambda-app
```

**serverless.yml:**
```yaml
service: my-nodejs-api

provider:
  name: aws
  runtime: nodejs20.x
  region: us-east-1
  environment:
    NODE_ENV: production
    DATABASE_URL: ${env:DATABASE_URL}
  
functions:
  api:
    handler: handler.main
    events:
      - httpApi:
          path: /{proxy+}
          method: ANY
    timeout: 30
    memorySize: 512

plugins:
  - serverless-offline
```

**handler.js:**
```javascript
const serverless = require('serverless-http');
const express = require('express');
const app = express();

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/users', async (req, res) => {
  // Your logic here
  res.json({ users: [] });
});

module.exports.main = serverless(app);
```

---

### Step 2: Deploy to Lambda

```bash
# Install dependencies
npm install express serverless-http

# Deploy
serverless deploy

# Output will show API Gateway URL:
# https://abc123.execute-api.us-east-1.amazonaws.com/

# View logs
serverless logs -f api --tail

# Remove deployment
serverless remove
```

---

### Step 3: Environment Variables

```bash
# Set environment variables
serverless deploy --param="DATABASE_URL=postgresql://..."

# Or use AWS Systems Manager Parameter Store
aws ssm put-parameter \
  --name "/myapp/DATABASE_URL" \
  --value "postgresql://..." \
  --type "SecureString"
```

---

## Method 3: ECS/Fargate with Docker

### Overview
Deploy containerized Node.js app using Docker on AWS ECS with Fargate (serverless containers).

**Best for:** Microservices, modern DevOps practices, auto-scaling needs

---

### Step 1: Create Dockerfile

**Dockerfile:**
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node healthcheck.js || exit 1

# Start application
CMD ["node", "server.js"]
```

**.dockerignore:**
```
node_modules
npm-debug.log
.env
.git
.gitignore
README.md
```

---

### Step 2: Build and Test Locally

```bash
# Build image
docker build -t my-nodejs-app .

# Run locally
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=postgresql://... \
  my-nodejs-app

# Test
curl http://localhost:3000/api/health
```

---

### Step 3: Push to ECR (Elastic Container Registry)

```bash
# Create ECR repository
aws ecr create-repository --repository-name my-nodejs-app

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789012.dkr.ecr.us-east-1.amazonaws.com

# Tag image
docker tag my-nodejs-app:latest \
  123456789012.dkr.ecr.us-east-1.amazonaws.com/my-nodejs-app:latest

# Push image
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-nodejs-app:latest
```

---

### Step 4: Create ECS Cluster and Task Definition

```bash
# Create cluster
aws ecs create-cluster --cluster-name my-cluster

# Create task definition (task-definition.json)
```

**task-definition.json:**
```json
{
  "family": "my-nodejs-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "my-nodejs-app",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/my-nodejs-app:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:myapp/db-url"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/my-nodejs-app",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

```bash
# Register task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create service
aws ecs create-service \
  --cluster my-cluster \
  --service-name my-nodejs-service \
  --task-definition my-nodejs-app \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-12345],securityGroups=[sg-12345],assignPublicIp=ENABLED}"
```

---

## Method 4: Elastic Beanstalk

### Overview
Easiest AWS deployment - upload code, Beanstalk handles everything.

**Best for:** Quick deployments, teams without DevOps expertise, MVPs

---

### Step 1: Install EB CLI

```bash
# Install EB CLI
pip install awsebcli

# Verify installation
eb --version
```

---

### Step 2: Initialize Application

```bash
# Navigate to your app directory
cd my-nodejs-app

# Initialize Elastic Beanstalk
eb init

# Follow prompts:
# - Select region
# - Create new application
# - Choose Node.js platform
# - Setup SSH (optional)
```

---

### Step 3: Create Environment and Deploy

```bash
# Create environment and deploy
eb create my-nodejs-env

# This will:
# - Create EC2 instance
# - Install Node.js
# - Deploy your app
# - Setup load balancer
# - Configure auto-scaling

# Open in browser
eb open

# View logs
eb logs

# SSH into instance
eb ssh
```

---

### Step 4: Configure Environment Variables

```bash
# Set environment variables
eb setenv NODE_ENV=production DATABASE_URL=postgresql://...

# Or use .ebextensions/environment.config
```

**.ebextensions/environment.config:**
```yaml
option_settings:
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
    PORT: 8080
```

---

### Step 5: Deploy Updates

```bash
# Deploy new version
eb deploy

# Check health
eb health

# Terminate environment
eb terminate my-nodejs-env
```

---

## Environment Variables Management

### Method 1: .env File (EC2)
```bash
# Create .env file
nano /var/www/myapp/.env

# Add variables
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=your-secret-key
```

### Method 2: AWS Secrets Manager (Recommended)
```bash
# Store secret
aws secretsmanager create-secret \
  --name myapp/database-url \
  --secret-string "postgresql://user:pass@host:5432/db"

# Retrieve in code
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();

async function getSecret(secretName) {
  const data = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
  return data.SecretString;
}
```

### Method 3: Systems Manager Parameter Store (Free)
```bash
# Store parameter
aws ssm put-parameter \
  --name "/myapp/database-url" \
  --value "postgresql://..." \
  --type "SecureString"

# Retrieve
aws ssm get-parameter \
  --name "/myapp/database-url" \
  --with-decryption
```

---

## SSL/HTTPS Setup

### Option 1: Let's Encrypt (Free)
```bash
# Already covered in EC2 setup above
sudo certbot --nginx -d yourdomain.com
```

### Option 2: AWS Certificate Manager (Free)
```bash
# Request certificate
aws acm request-certificate \
  --domain-name yourdomain.com \
  --subject-alternative-names www.yourdomain.com \
  --validation-method DNS

# Add DNS records for validation
# Attach certificate to Load Balancer
```

---

## Database Connection

### PostgreSQL Connection (Node.js)
```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

module.exports = pool;
```

### MongoDB Connection
```javascript
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
});
```

---

## Monitoring and Logging

### PM2 Monitoring
```bash
# View logs
pm2 logs

# Monitor resources
pm2 monit

# Web dashboard
pm2 install pm2-server-monit
```

### CloudWatch Logs
```bash
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

# Configure
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard
```

---

## Troubleshooting

### Common Issues

**1. App not starting:**
```bash
# Check PM2 logs
pm2 logs myapp --lines 100

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Check system logs
sudo journalctl -u nginx -f
```

**2. Port already in use:**
```bash
# Find process using port
sudo lsof -i :3000

# Kill process
sudo kill -9 <PID>
```

**3. Permission denied:**
```bash
# Fix ownership
sudo chown -R ubuntu:ubuntu /var/www/myapp

# Fix permissions
chmod -R 755 /var/www/myapp
```

---

## Best Practices

1. ✅ **Use environment variables** for secrets
2. ✅ **Enable HTTPS** with SSL certificates
3. ✅ **Use PM2 cluster mode** for multiple cores
4. ✅ **Setup monitoring** with CloudWatch
5. ✅ **Enable auto-restart** with PM2 startup
6. ✅ **Use Nginx** as reverse proxy
7. ✅ **Setup firewall** with UFW
8. ✅ **Regular backups** of application and database
9. ✅ **Use CI/CD** for automated deployments
10. ✅ **Monitor costs** with AWS billing alerts

---

## Next Steps

- **Read EC2 Detailed Guide** for advanced PM2 configuration
- **Read Lambda Guide** for serverless deployment
- **Read Docker/ECS Guide** for container deployment
- **Setup CI/CD** with GitHub Actions

This guide covers all major deployment methods for Node.js on AWS. Choose the method that best fits your needs and scale.
