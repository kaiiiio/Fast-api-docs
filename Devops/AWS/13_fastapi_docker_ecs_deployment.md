# Docker + ECS Deployment for FastAPI

The modern, containerized approach to deploying FastAPI at scale.

## Key Terms

* **Docker image** (packaged app): FastAPI code + Python runtime + dependencies.
* **Container** (running image): isolated FastAPI process.
* **ECR** (AWS image registry): stores Docker images for ECS.
* **ECS cluster** (container environment): logical group for running tasks.
* **Task definition** (container blueprint): image, ports, env vars, CPU/memory.
* **Service** (keeps tasks running): maintains desired number of containers.
* **Fargate** (serverless container runtime): no EC2 server management.
* **Load balancer** (traffic distributor): sends requests to healthy tasks.
* **Target group** (backend task group): load balancer health-checks and routes here.
* **Rolling deployment** (replace gradually): updates tasks without full downtime.

---

## 1. Dockerizing FastAPI
**Dockerfile (Optimized for Production):**
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run with Gunicorn/Uvicorn
CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "main:app", "--bind", "0.0.0.0:80"]
```

---

## 2. ECR (Elastic Container Registry) Setup
1. **Create Repo:** `aws ecr create-repository --repository-name my-fastapi-app`
2. **Authenticate:** `aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com`
3. **Build & Push:**
```bash
docker build -t my-fastapi-app .
docker tag my-fastapi-app:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/my-fastapi-app:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/my-fastapi-app:latest
```

---

## 3. ECS Fargate Setup
1. **Cluster:** Create a "Networking Only" cluster.
2. **Task Definition:** 
   - Choose Fargate.
   - Define CPU/RAM.
   - Container Image: Your ECR URL.
   - Env Vars: Source from **AWS Secrets Manager**.
3. **Service:** 
   - Create Service in the Cluster.
   - Enable **Load Balancer** (ALB).
   - Configure Security Groups (Allow ALB to talk to Tasks).

---

## 4. CI/CD with GitHub Actions
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Amazon ECS
on: [push]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1
      - name: Build, tag, and push image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
        run: |
          docker build -t $ECR_REGISTRY/my-fastapi-app:latest .
          docker push $ECR_REGISTRY/my-fastapi-app:latest
```
