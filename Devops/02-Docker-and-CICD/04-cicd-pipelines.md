# CI/CD Pipelines — Explained

## What is CI/CD?

**CI (Continuous Integration)**: Automatically test code when pushed
**CD (Continuous Deployment/Delivery)**: Automatically deploy code to production

---

## Key Terms

* **Pipeline** (automated workflow): test, build, and deploy steps.
* **Stage** (major pipeline phase): example test, build, deploy.
* **Job** (unit of pipeline work): one runnable task inside CI/CD.
* **Runner/Agent** (machine that runs jobs): GitHub runner, Jenkins agent, GitLab runner.
* **Artifact** (build output): compiled app, Docker image, report, or package.
* **Environment** (deployment target): dev, staging, production.
* **Rollback** (return to previous version): used when deployment breaks.
* **Blue-green deployment** (two production environments): switch traffic from old to new.
* **Canary deployment** (small traffic first): release to a few users before everyone.
* **Secret** (sensitive value): token, password, SSH key; never hardcode.
* **Idempotent pipeline** (safe to rerun): rerunning should not corrupt deploy state.
* **Health check** (post-deploy test): confirms app is actually working.

---

## The Problem Without CI/CD

```
Developer → Manual Testing → Manual Build → Manual Deploy → 😰
```

Issues:
* Human error
* Inconsistent environments
* Slow feedback
* Fear of deployment
* No rollback strategy

---

## CI/CD Pipeline Flow

```
Code Push (Git)
 ↓
Run Tests (CI)
 ↓
Build Docker Image
 ↓
Push to Registry
 ↓
Deploy to Server (CD)
 ↓
Health Check
```

---

## CI/CD Benefits

✅ **Fast feedback**: Know if code breaks immediately
✅ **Consistency**: Same process every time
✅ **Confidence**: Tests pass = safe to deploy
✅ **Automation**: No manual steps
✅ **Rollback**: Easy to revert
✅ **Documentation**: Pipeline is the process

---

## CI/CD Tools Comparison

| Tool | Type | Best For |
| ---- | ---- | -------- |
| **GitHub Actions** | Cloud | GitHub projects |
| **GitLab CI** | Cloud/Self-hosted | GitLab projects |
| **Jenkins** | Self-hosted | Enterprise, custom |
| **CircleCI** | Cloud | Fast builds |
| **Travis CI** | Cloud | Open source |
| **AWS CodePipeline** | Cloud | AWS ecosystem |

---

## GitHub Actions Example

### Basic Workflow

**.github/workflows/ci.yml**
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Run linter
        run: npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Build Docker image
        run: docker build -t my-app:${{ github.sha }} .
      
      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Push image
        run: |
          docker tag my-app:${{ github.sha }} myuser/my-app:latest
          docker push myuser/my-app:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            docker pull myuser/my-app:latest
            docker stop my-app || true
            docker rm my-app || true
            docker run -d -p 3000:3000 --name my-app myuser/my-app:latest
```

---

## GitLab CI Example

**.gitlab-ci.yml**
```yaml
stages:
  - test
  - build
  - deploy

variables:
  DOCKER_IMAGE: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

test:
  stage: test
  image: node:18
  script:
    - npm ci
    - npm test
    - npm run lint

build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker build -t $DOCKER_IMAGE .
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker push $DOCKER_IMAGE

deploy:
  stage: deploy
  only:
    - main
  script:
    - ssh user@server "docker pull $DOCKER_IMAGE && docker restart my-app"
```

---

## Jenkins Pipeline

**Jenkinsfile**
```groovy
pipeline {
    agent any
    
    environment {
        DOCKER_IMAGE = "my-app:${env.BUILD_ID}"
    }
    
    stages {
        stage('Checkout') {
            steps {
                git 'https://github.com/user/repo.git'
            }
        }
        
        stage('Test') {
            steps {
                sh 'npm ci'
                sh 'npm test'
            }
        }
        
        stage('Build') {
            steps {
                sh "docker build -t ${DOCKER_IMAGE} ."
            }
        }
        
        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                sh "docker push ${DOCKER_IMAGE}"
                sh "ssh user@server 'docker pull ${DOCKER_IMAGE} && docker restart my-app'"
            }
        }
    }
    
    post {
        failure {
            mail to: 'team@example.com',
                 subject: "Build Failed: ${env.JOB_NAME}",
                 body: "Build ${env.BUILD_NUMBER} failed"
        }
    }
}
```

---

## CI/CD Best Practices

### 1. Fast Feedback
✅ Run tests in parallel
✅ Cache dependencies
✅ Fail fast (stop on first error)

### 2. Security
✅ Use secrets management
✅ Scan for vulnerabilities
✅ Don't commit credentials

### 3. Reliability
✅ Make pipelines idempotent
✅ Use specific versions (not `latest`)
✅ Implement health checks

### 4. Observability
✅ Log everything
✅ Send notifications on failure
✅ Track deployment metrics

---

## Common Pipeline Patterns

### 1. Branch-based Deployment

```yaml
deploy-dev:
  if: branch == 'develop'
  script: deploy to dev

deploy-staging:
  if: branch == 'staging'
  script: deploy to staging

deploy-prod:
  if: branch == 'main'
  script: deploy to production
```

### 2. Manual Approval

```yaml
deploy-prod:
  when: manual  # Requires manual trigger
  script: deploy to production
```

### 3. Rollback Strategy

```yaml
deploy:
  script:
    - docker tag my-app:latest my-app:previous
    - docker pull my-app:new
    - docker run my-app:new
    - health_check || rollback
```

---

## Environment Variables & Secrets

### GitHub Actions
```yaml
env:
  NODE_ENV: production
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

Add secrets in: **Settings → Secrets and variables → Actions**

### GitLab CI
```yaml
variables:
  NODE_ENV: production
  DATABASE_URL: $DATABASE_URL  # Set in CI/CD settings
```

---

## Caching Dependencies

### GitHub Actions
```yaml
- name: Cache node modules
  uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

### GitLab CI
```yaml
cache:
  paths:
    - node_modules/
```

---

## Multi-Environment Deployment

```yaml
deploy-dev:
  environment: development
  script: deploy to dev server

deploy-staging:
  environment: staging
  script: deploy to staging server

deploy-prod:
  environment: production
  when: manual
  script: deploy to production server
```

---

## Interview Questions

**Q: What is the difference between CI and CD?**
A: CI (Continuous Integration) automatically tests code. CD (Continuous Deployment) automatically deploys code to production.

**Q: Why use CI/CD?**
A: Fast feedback, consistency, automation, confidence in deployments, easy rollbacks.

**Q: What happens if tests fail in CI?**
A: The pipeline stops, and the code is not deployed. Developer is notified to fix.

**Q: How do you handle secrets in CI/CD?**
A: Use the platform's secrets management (GitHub Secrets, GitLab CI/CD variables, etc.). Never commit secrets to code.

**Q: What is a deployment strategy?**
A: Methods like blue-green, canary, or rolling deployments to minimize downtime and risk.

---

## Deployment Strategies

### 1. Rolling Deployment
```
Server 1: v1 → v2
Server 2: v1 → v2
Server 3: v1 → v2
```
One at a time, no downtime.

### 2. Blue-Green Deployment
```
Blue (v1) ← Traffic
Green (v2) ← Deploy here
Switch traffic → Green
```
Instant rollback by switching back.

### 3. Canary Deployment
```
v1: 90% traffic
v2: 10% traffic (test)
If OK → 100% to v2
```
Gradual rollout, low risk.

---

## Summary

| Stage | Purpose |
| ----- | ------- |
| **Test** | Verify code quality |
| **Build** | Create deployable artifact |
| **Deploy** | Ship to production |

**Key Insight**: CI/CD automates the path from code to production, making deployments safe and frequent.
