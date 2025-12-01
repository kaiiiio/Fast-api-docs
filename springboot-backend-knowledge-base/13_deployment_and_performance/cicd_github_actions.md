# CI/CD with GitHub Actions

## 1. The Pipeline

1.  **CI (Continuous Integration)**:
    -   Checkout Code.
    -   Set up JDK 17.
    -   Run Tests (`mvn test`).
    -   Build Docker Image.
    -   Push to Registry (ECR/DockerHub).

2.  **CD (Continuous Deployment)**:
    -   Update K8s Manifests.
    -   Apply to Cluster.

---

## 2. GitHub Actions Workflow (`.github/workflows/deploy.yml`)

```yaml
name: Deploy to Production

on:
  push:
    branches: [ "main" ]

env:
  ECR_REGISTRY: 123456789012.dkr.ecr.us-east-1.amazonaws.com
  ECR_REPOSITORY: my-app
  IMAGE_TAG: ${{ github.sha }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up JDK 17
      uses: actions/setup-java@v3
      with:
        java-version: '17'
        distribution: 'temurin'
        cache: maven
        
    - name: Build with Maven
      run: mvn clean package -DskipTests
      
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v1
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1
        
    - name: Login to Amazon ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v1
      
    - name: Build, tag, and push image to Amazon ECR
      run: |
        docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
        docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
    - name: Update Kubeconfig
      run: aws eks update-kubeconfig --name my-cluster
      
    - name: Deploy to K8s
      run: |
        kubectl set image deployment/myapp myapp=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
        kubectl rollout status deployment/myapp
```

---

## 3. GitOps (ArgoCD)

**Advanced**: Don't run `kubectl` in GitHub Actions.
Instead, push the *new image tag* to a `git` repo (e.g., `k8s-manifests`).

**ArgoCD** (running inside K8s) sees the git change and syncs the cluster.
**Benefit**: Your cluster state is always exactly what is in Git. No "drift".
