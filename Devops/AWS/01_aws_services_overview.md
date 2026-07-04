# AWS Services Overview for Fullstack Developers

A comprehensive guide to AWS services organized by importance for fullstack developers deploying Node.js and FastAPI applications.

## Key AWS Terms

* **Region** (geographic AWS area): example `us-east-1`, `ap-south-1`.
* **Availability Zone / AZ** (separate data center): used for high availability inside a region.
* **IAM** (identity and permissions): controls who/what can access AWS resources.
* **VPC** (private cloud network): isolated network for your AWS resources.
* **Subnet** (smaller network section): public for internet-facing, private for internal resources.
* **Security Group** (instance firewall): controls inbound/outbound traffic.
* **Managed service** (AWS handles operations): backups, patching, scaling handled by AWS.
* **Serverless** (no server management): AWS runs/scales compute for you.
* **High availability / HA** (survives failures): app continues if one instance/AZ fails.
* **Auto scaling** (automatic capacity changes): adds/removes compute based on load.

---

## Quick Reference Table

| Service | Category | Importance | Use Case | Monthly Cost (Estimate) |
|---------|----------|------------|----------|------------------------|
| **EC2** | Compute | ⭐⭐⭐⭐⭐ Critical | Virtual servers for backends | $10-100+ |
| **S3** | Storage | ⭐⭐⭐⭐⭐ Critical | Static files, images, backups | $0.023/GB |
| **RDS** | Database | ⭐⭐⭐⭐⭐ Critical | PostgreSQL, MySQL databases | $15-200+ |
| **Lambda** | Compute | ⭐⭐⭐⭐ Important | Serverless functions | $0.20/1M requests |
| **CloudFront** | CDN | ⭐⭐⭐⭐ Important | Content delivery, caching | $0.085/GB |
| **Route 53** | DNS | ⭐⭐⭐⭐ Important | Domain management | $0.50/hosted zone |
| **VPC** | Network | ⭐⭐⭐⭐ Important | Network isolation | Free |
| **ECS/Fargate** | Compute | ⭐⭐⭐ Useful | Container orchestration | $0.04/vCPU/hour |
| **ElastiCache** | Database | ⭐⭐⭐ Useful | Redis/Memcached caching | $15-100+ |
| **CloudWatch** | Monitoring | ⭐⭐⭐ Useful | Logs and metrics | $0.50/GB |
| **CodePipeline** | CI/CD | ⭐⭐ Nice-to-Have | Automated deployments | $1/pipeline |
| **DynamoDB** | Database | ⭐⭐ Nice-to-Have | NoSQL database | $1.25/GB |

---

## Services by Importance

### ⭐⭐⭐⭐⭐ Critical Services (Must Know)

#### 1. EC2 (Elastic Compute Cloud)
**What it is:** Virtual servers in the cloud where you run your backend applications.

**Why it's critical:**
- Most flexible deployment option
- Full control over server environment
- Can run Node.js, FastAPI, databases, anything
- Industry standard for production deployments

**Common Use Cases:**
- Hosting Node.js/Express APIs
- Running FastAPI with Uvicorn
- Database servers (if not using RDS)
- Background job processors

**Alternatives:**
- **DigitalOcean Droplets** - Simpler, cheaper for small projects
- **Linode** - Similar to DigitalOcean
- **Google Compute Engine** - Google Cloud equivalent
- **Azure Virtual Machines** - Microsoft Azure equivalent

**Cost:** $5-100+/month depending on instance size

---

#### 2. S3 (Simple Storage Service)
**What it is:** Object storage for files, images, videos, backups.

**Why it's critical:**
- Store user uploads (profile pictures, documents)
- Host static websites (React, Vue builds)
- Store application backups
- Serve media files
- Extremely cheap and scalable

**Common Use Cases:**
- User-uploaded files
- Static website hosting
- Database backups
- Log storage
- Media files for applications

**Alternatives:**
- **Cloudflare R2** - S3-compatible, no egress fees
- **Backblaze B2** - Cheaper than S3
- **Google Cloud Storage** - Google Cloud equivalent
- **Azure Blob Storage** - Microsoft Azure equivalent

**Cost:** $0.023/GB/month + $0.09/GB transfer

---

#### 3. RDS (Relational Database Service)
**What it is:** Managed PostgreSQL, MySQL, MariaDB databases.

**Why it's critical:**
- Automated backups
- Automatic software patching
- High availability with Multi-AZ
- Easy scaling
- No database administration needed

**Common Use Cases:**
- Production PostgreSQL for Node.js/FastAPI
- MySQL for legacy applications
- Multi-region database replication

**Alternatives:**
- **Self-managed on EC2** - More control, more work
- **PlanetScale** - Serverless MySQL
- **Supabase** - PostgreSQL with real-time features
- **Google Cloud SQL** - Google Cloud equivalent
- **Azure Database** - Microsoft Azure equivalent

**Cost:** $15-200+/month depending on instance size

---

### ⭐⭐⭐⭐ Important Services (Should Know)

#### 4. Lambda
**What it is:** Serverless compute - run code without managing servers.

**Why it's important:**
- Pay only for execution time
- Auto-scales automatically
- Perfect for APIs with variable traffic
- No server management

**Common Use Cases:**
- Serverless APIs (Node.js, Python)
- Image processing triggers
- Scheduled tasks (cron jobs)
- Webhooks

**Alternatives:**
- **Vercel Functions** - Easier for Next.js
- **Netlify Functions** - Similar to Vercel
- **Google Cloud Functions** - Google Cloud equivalent
- **Azure Functions** - Microsoft Azure equivalent

**Cost:** $0.20 per 1 million requests + $0.0000166667/GB-second

---

#### 5. CloudFront (CDN)
**What it is:** Content Delivery Network for fast global content delivery.

**Why it's important:**
- Speeds up static file delivery
- Reduces S3 costs (caching)
- SSL/TLS certificates (free)
- DDoS protection

**Common Use Cases:**
- Serving React/Vue builds
- Caching API responses
- Delivering images/videos globally
- SSL termination

**Alternatives:**
- **Cloudflare CDN** - Free tier, very popular
- **Fastly** - Developer-friendly CDN
- **Google Cloud CDN** - Google Cloud equivalent
- **Azure CDN** - Microsoft Azure equivalent

**Cost:** $0.085/GB transferred

---

#### 6. Route 53 (DNS Service)
**What it is:** Domain Name System (DNS) management.

**Why it's important:**
- Manage domain names
- Route traffic to EC2, Load Balancers, S3
- Health checks and failover
- Low latency DNS resolution

**Common Use Cases:**
- Pointing domain to EC2 instance
- Load balancing across regions
- Subdomain management

**Alternatives:**
- **Cloudflare DNS** - Free, faster
- **Google Cloud DNS** - Google Cloud equivalent
- **Namecheap DNS** - Simple, cheap
- **Domain registrar DNS** - GoDaddy, Namecheap, etc.

**Cost:** $0.50/hosted zone + $0.40/million queries

---

#### 7. VPC (Virtual Private Cloud)
**What it is:** Isolated network for your AWS resources.

**Why it's important:**
- Network security and isolation
- Control IP address ranges
- Public and private subnets
- Security groups and firewalls

**Common Use Cases:**
- Isolating production from development
- Private database servers
- Secure multi-tier applications

**Alternatives:**
- None - VPC is fundamental to AWS networking

**Cost:** Free (data transfer costs apply)

---

#### 8. Application Load Balancer (ALB)
**What it is:** Distributes traffic across multiple EC2 instances.

**Why it's important:**
- High availability
- Auto-scaling support
- SSL termination
- Health checks

**Common Use Cases:**
- Load balancing Node.js/FastAPI instances
- Blue-green deployments
- A/B testing

**Alternatives:**
- **Nginx** - Self-managed on EC2
- **HAProxy** - Self-managed load balancer
- **Google Cloud Load Balancing** - Google Cloud equivalent

**Cost:** $16/month + $0.008/LCU-hour

---

### ⭐⭐⭐ Useful Services (Good to Know)

#### 9. ECS/Fargate (Container Orchestration)
**What it is:** Run Docker containers without managing servers (Fargate) or on EC2 (ECS).

**Why it's useful:**
- Modern deployment with Docker
- Easy scaling
- Better resource utilization
- CI/CD friendly

**Common Use Cases:**
- Dockerized Node.js/FastAPI apps
- Microservices architecture
- Auto-scaling applications

**Alternatives:**
- **Kubernetes (EKS)** - More complex, more powerful
- **Google Cloud Run** - Simpler than ECS
- **Azure Container Instances** - Microsoft Azure equivalent
- **Railway** - Simpler container deployment

**Cost:** Fargate: $0.04048/vCPU/hour + $0.004445/GB/hour

---

#### 10. ElastiCache (Redis/Memcached)
**What it is:** Managed in-memory caching service.

**Why it's useful:**
- Speed up database queries
- Session storage
- Rate limiting
- Real-time leaderboards

**Common Use Cases:**
- Caching database queries
- Session management
- Pub/Sub for real-time features
- Rate limiting

**Alternatives:**
- **Self-managed Redis on EC2** - Cheaper, more work
- **Upstash** - Serverless Redis
- **Redis Cloud** - Managed Redis
- **Google Memorystore** - Google Cloud equivalent

**Cost:** $15-100+/month depending on instance size

---

#### 11. CloudWatch (Monitoring & Logging)
**What it is:** Monitoring, logging, and alerting service.

**Why it's useful:**
- Application logs
- Performance metrics
- Alerts for errors
- Dashboards

**Common Use Cases:**
- Viewing application logs
- Setting up error alerts
- Monitoring CPU/memory usage
- Creating dashboards

**Alternatives:**
- **Datadog** - More features, expensive
- **New Relic** - Application performance monitoring
- **Grafana + Prometheus** - Self-hosted, free
- **Google Cloud Logging** - Google Cloud equivalent

**Cost:** $0.50/GB ingested + $0.03/GB stored

---

#### 12. Elastic Beanstalk
**What it is:** Platform as a Service (PaaS) for deploying applications.

**Why it's useful:**
- Easiest AWS deployment
- Handles infrastructure automatically
- Good for beginners
- Supports Node.js, Python out of the box

**Common Use Cases:**
- Quick Node.js/FastAPI deployments
- Prototypes and MVPs
- Teams without DevOps expertise

**Alternatives:**
- **Heroku** - Simpler, more expensive
- **Render** - Modern Heroku alternative
- **Railway** - Developer-friendly PaaS
- **Google App Engine** - Google Cloud equivalent

**Cost:** Free (you pay for underlying EC2, RDS, etc.)

---

### ⭐⭐ Nice-to-Have Services

#### 13. CodePipeline / CodeBuild / CodeDeploy
**What it is:** CI/CD services for automated deployments.

**Why it's nice-to-have:**
- Automated testing and deployment
- Integration with GitHub
- Blue-green deployments

**Alternatives:**
- **GitHub Actions** - Free, easier, recommended
- **GitLab CI/CD** - If using GitLab
- **CircleCI** - Popular CI/CD
- **Jenkins** - Self-hosted, free

**Cost:** $1/pipeline/month

---

#### 14. DynamoDB
**What it is:** Serverless NoSQL database.

**Why it's nice-to-have:**
- Serverless (no server management)
- Auto-scaling
- Low latency
- Good for specific use cases

**Common Use Cases:**
- Session storage
- User profiles
- Real-time applications
- IoT data

**Alternatives:**
- **MongoDB Atlas** - More familiar for developers
- **Firebase Firestore** - Easier for beginners
- **Google Cloud Firestore** - Google Cloud equivalent

**Cost:** $1.25/GB stored + $1.25/million writes

---

#### 15. Secrets Manager
**What it is:** Securely store API keys, passwords, database credentials.

**Why it's nice-to-have:**
- Secure secret storage
- Automatic rotation
- Audit logging

**Alternatives:**
- **Environment variables** - Simple, less secure
- **AWS Systems Manager Parameter Store** - Free alternative
- **HashiCorp Vault** - Self-hosted, more features

**Cost:** $0.40/secret/month + $0.05/10,000 API calls

---

#### 16. X-Ray (Distributed Tracing)
**What it is:** Debug and analyze microservices applications.

**Why it's nice-to-have:**
- Trace requests across services
- Identify performance bottlenecks
- Debug distributed systems

**Alternatives:**
- **Datadog APM** - More features
- **New Relic** - Application monitoring
- **Jaeger** - Open-source tracing

**Cost:** $5/million traces

---

## Recommended Stack for Fullstack Developers

### Minimal Stack (Budget: ~$30/month)
- **EC2 t3.micro** ($10) - Backend server
- **RDS db.t3.micro** ($15) - PostgreSQL database
- **S3** ($2) - File storage
- **Route 53** ($1) - DNS
- **CloudFront** ($2) - CDN

**Total:** ~$30/month

---

### Production Stack (Budget: ~$100/month)
- **EC2 t3.small** ($20) - Backend server
- **RDS db.t3.small** ($30) - PostgreSQL database
- **ElastiCache t3.micro** ($15) - Redis caching
- **S3** ($5) - File storage
- **CloudFront** ($10) - CDN
- **Route 53** ($1) - DNS
- **Application Load Balancer** ($16) - Load balancing
- **CloudWatch** ($3) - Monitoring

**Total:** ~$100/month

---

### Serverless Stack (Budget: ~$20/month for low traffic)
- **Lambda** ($5) - Serverless functions
- **API Gateway** ($3) - API management
- **DynamoDB** ($5) - NoSQL database
- **S3** ($2) - File storage
- **CloudFront** ($3) - CDN
- **Route 53** ($1) - DNS

**Total:** ~$20/month (scales with usage)

---

## Service Selection Guide

### When to Use EC2
- Need full control over environment
- Running long-lived processes
- Complex applications
- Cost-effective for consistent traffic

### When to Use Lambda
- Variable traffic (spiky)
- Event-driven architecture
- Want zero server management
- Microservices

### When to Use ECS/Fargate
- Docker-based deployments
- Microservices architecture
- Need container orchestration
- Modern DevOps practices

### When to Use Elastic Beanstalk
- Quick deployments
- Don't want to manage infrastructure
- Small team without DevOps
- Prototypes and MVPs

---

## Next Steps

1. **Read Compute Services Guide** - Deep dive into EC2, Lambda, ECS
2. **Read Storage Services Guide** - S3, EBS, EFS details
3. **Read Database Services Guide** - RDS, DynamoDB, ElastiCache
4. **Choose Deployment Method** - Node.js or FastAPI deployment guides

---

## Cost Optimization Tips

1. **Use Reserved Instances** - Save 30-70% on EC2/RDS
2. **Right-size instances** - Don't over-provision
3. **Use S3 Intelligent-Tiering** - Automatic cost optimization
4. **Enable CloudWatch billing alerts** - Avoid surprises
5. **Delete unused resources** - Snapshots, old AMIs, etc.
6. **Use Spot Instances** - For non-critical workloads (90% discount)

---

## Common Mistakes to Avoid

1. ❌ **Leaving resources running** - Always stop/terminate unused instances
2. ❌ **Not using IAM roles** - Hardcoding credentials is dangerous
3. ❌ **Public S3 buckets** - Security risk
4. ❌ **No backups** - Always enable automated backups
5. ❌ **Ignoring security groups** - Properly configure firewalls
6. ❌ **Not monitoring costs** - Set up billing alerts
7. ❌ **Using root account** - Create IAM users instead

---

## Interview Preparation

**Common Questions:**
1. **Difference between EC2 and Lambda?** - EC2 is always-on servers, Lambda is event-driven serverless
2. **When to use RDS vs DynamoDB?** - RDS for relational data, DynamoDB for NoSQL/high-scale
3. **What is VPC?** - Virtual Private Cloud for network isolation
4. **How to secure S3 buckets?** - Block public access, use IAM policies, enable encryption
5. **What is CloudFront?** - CDN for fast global content delivery
6. **Difference between ECS and EKS?** - ECS is AWS-specific, EKS is managed Kubernetes

---

This overview provides a foundation for understanding AWS services. Dive into specific service guides for detailed deployment procedures and code examples.
