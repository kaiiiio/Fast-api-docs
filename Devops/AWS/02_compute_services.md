# AWS Compute Services: EC2, Lambda, and ECS

A deep dive into the primary compute options on AWS for fullstack developers.

## 1. Amazon EC2 (Elastic Compute Cloud)
**The Foundation:** Virtual machines where you have full control over the OS and stack.

### Key Concepts
- **AMI (Amazon Machine Image):** Pre-configured templates for your instances (e.g., Ubuntu 22.04).
- **Instance Types:** Different combinations of CPU, memory, and storage (e.g., `t3.micro` for dev, `c6g.large` for compute-heavy).
- **Security Groups:** Virtual firewalls controlling traffic to/from your instance.
- **Key Pairs:** SSH keys for secure access.

### Production Workflow
1. **Launch:** Pick an Ubuntu AMI and a `t3.small`+ instance.
2. **Configure:** Open ports 22 (SSH), 80 (HTTP), and 443 (HTTPS).
3. **Connect:** Use `ssh -i key.pem ubuntu@ip`.
4. **Deploy:** Install Node/FastAPI, use PM2/Systemd, and Nginx as a reverse proxy.

---

## 2. AWS Lambda
**Serverless:** Run code in response to events without managing servers.

### When to use?
- **Variable Traffic:** Scales to zero when no one is using it.
- **Event-Driven:** Trigger logic on S3 uploads, DynamoDB changes, or Cron schedules.
- **Short Tasks:** Maximum execution time is 15 minutes.

### Best Practices
- **Keep it stateless:** Data must be stored in a database or S3.
- **Optimize Cold Starts:** Use lower memory settings for small tasks or "Provisioned Concurrency."
- **Mangum/Serverless-Express:** Use adapters to run standard frameworks on Lambda.

---

## 3. Amazon ECS (Elastic Container Service)
**Container Orchestration:** Run Docker containers at scale.

### Launch Types
- **Fargate:** Serverless container execution. You don't manage any EC2s. Recommended for most teams.
- **EC2:** You manage the underlying servers where containers run. Better for cost optimization at extreme scale.

### Core Components
- **Task Definition:** The blueprint (Docker image, ports, env vars).
- **Service:** Maintains the desired number of tasks.
- **Cluster:** Logical grouping of services.

---

## Which one to choose?
- **Small Project/Full Control:** EC2 (PM2/Nginx).
- **Spiky Traffic/Low Cost:** Lambda.
- **Microservices/Modern DevOps:** ECS Fargate.
