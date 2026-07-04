# GitHub Actions — Deep Dive

## What is GitHub Actions?

GitHub Actions is a **CI/CD platform integrated into GitHub** that automates workflows.

**Key Features**:
* YAML-based configuration
* Runs on GitHub-hosted or self-hosted runners
* Marketplace with 10,000+ pre-built actions
* Free tier for public repos

---

## Key Terms

* **Workflow** (automation file): YAML file inside `.github/workflows`.
* **Event** (trigger): push, pull request, schedule, manual dispatch.
* **Job** (group of steps): runs on one runner.
* **Step** (single command/action): one task inside a job.
* **Action** (reusable step): prebuilt automation from marketplace or repo.
* **Runner** (machine executing job): GitHub-hosted or self-hosted.
* **Matrix** (run same job many ways): test multiple Node/Python versions.
* **Artifact** (saved output): build files, reports, coverage.
* **Cache** (reuse dependencies): speeds up installs between runs.
* **Secret** (encrypted sensitive value): API keys, deploy keys, tokens.

---

## Core Concepts

### 1. Workflow
A YAML file that defines automation (`.github/workflows/*.yml`)

### 2. Event
Triggers that start a workflow (push, pull_request, schedule, etc.)

### 3. Job
A set of steps that run on the same runner

### 4. Step
Individual task (run command, use action)

### 5. Runner
Server that executes workflows (ubuntu, windows, macos)

### 6. Action
Reusable unit of code (from marketplace or custom)

---

## Workflow Structure

```yaml
name: Workflow Name

on: [push, pull_request]  # Events

jobs:
  job-name:
    runs-on: ubuntu-latest  # Runner
    
    steps:
      - name: Step 1
        uses: actions/checkout@v3  # Action
      
      - name: Step 2
        run: npm install  # Command
```

---

## Common Events (Triggers)

```yaml
# On push to main
on:
  push:
    branches: [ main ]

# On pull request
on:
  pull_request:
    branches: [ main, develop ]

# On schedule (cron)
on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight

# Manual trigger
on:
  workflow_dispatch:

# Multiple events
on:
  push:
    branches: [ main ]
  pull_request:
  workflow_dispatch:
```

---

## Complete CI/CD Example

**.github/workflows/deploy.yml**

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  NODE_VERSION: '18'
  DOCKER_IMAGE: my-app

jobs:
  # Job 1: Test
  test:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run tests
        run: npm test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  # Job 2: Build Docker Image
  build:
    needs: test  # Wait for test job
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: |
            ${{ secrets.DOCKER_USERNAME }}/${{ env.DOCKER_IMAGE }}:latest
            ${{ secrets.DOCKER_USERNAME }}/${{ env.DOCKER_IMAGE }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # Job 3: Deploy to Server
  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Deploy to production
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            docker pull ${{ secrets.DOCKER_USERNAME }}/${{ env.DOCKER_IMAGE }}:latest
            docker stop my-app || true
            docker rm my-app || true
            docker run -d \
              -p 3000:3000 \
              --name my-app \
              --restart always \
              -e NODE_ENV=production \
              -e DATABASE_URL=${{ secrets.DATABASE_URL }} \
              ${{ secrets.DOCKER_USERNAME }}/${{ env.DOCKER_IMAGE }}:latest
            
            # Health check
            sleep 5
            curl -f http://localhost:3000/health || exit 1
      
      - name: Notify on success
        if: success()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Deployment successful! 🚀'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
      
      - name: Notify on failure
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Deployment failed! ❌'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

## Advanced Patterns

### Matrix Strategy (Test Multiple Versions)

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: [16, 18, 20]
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm test
```

### Conditional Steps

```yaml
steps:
  - name: Deploy to staging
    if: github.ref == 'refs/heads/develop'
    run: deploy-staging.sh
  
  - name: Deploy to production
    if: github.ref == 'refs/heads/main'
    run: deploy-production.sh
```

### Reusable Workflows

**.github/workflows/reusable-deploy.yml**
```yaml
name: Reusable Deploy

on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploying to ${{ inputs.environment }}"
```

**Use it:**
```yaml
jobs:
  deploy-staging:
    uses: ./.github/workflows/reusable-deploy.yml
    with:
      environment: staging
```

### Artifacts (Share Files Between Jobs)

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: npm run build
      - uses: actions/upload-artifact@v3
        with:
          name: build-files
          path: dist/
  
  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v3
        with:
          name: build-files
      - run: deploy.sh
```

---

## Secrets Management

### Add Secrets
1. Go to **Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Add name and value

### Use in Workflow
```yaml
steps:
  - name: Use secret
    env:
      API_KEY: ${{ secrets.API_KEY }}
    run: echo "Secret is set"
```

---

## Caching Dependencies

```yaml
steps:
  - uses: actions/checkout@v3
  
  - name: Cache node modules
    uses: actions/cache@v3
    with:
      path: ~/.npm
      key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
      restore-keys: |
        ${{ runner.os }}-node-
  
  - run: npm ci
```

---

## Environment Variables

### Workflow-level
```yaml
env:
  NODE_ENV: production

jobs:
  build:
    steps:
      - run: echo $NODE_ENV
```

### Job-level
```yaml
jobs:
  build:
    env:
      BUILD_TYPE: release
    steps:
      - run: echo $BUILD_TYPE
```

### Step-level
```yaml
steps:
  - name: Build
    env:
      API_URL: https://api.example.com
    run: npm run build
```

---

## Self-Hosted Runners

For private infrastructure:

```yaml
jobs:
  build:
    runs-on: self-hosted  # Use your own server
    steps:
      - run: ./deploy.sh
```

**Setup**:
1. Go to **Settings → Actions → Runners**
2. Click **New self-hosted runner**
3. Follow instructions to install on your server

---

## Common Actions from Marketplace

```yaml
# Checkout code
- uses: actions/checkout@v3

# Setup Node.js
- uses: actions/setup-node@v3
  with:
    node-version: '18'

# Setup Python
- uses: actions/setup-python@v4
  with:
    python-version: '3.11'

# Docker build and push
- uses: docker/build-push-action@v4

# Deploy to AWS
- uses: aws-actions/configure-aws-credentials@v2

# Slack notification
- uses: 8398a7/action-slack@v3

# Create GitHub release
- uses: actions/create-release@v1
```

---

## Debugging Workflows

### Enable Debug Logging
Add secrets:
- `ACTIONS_STEP_DEBUG` = `true`
- `ACTIONS_RUNNER_DEBUG` = `true`

### SSH into Runner (for debugging)
```yaml
- name: Setup tmate session
  uses: mxschmitt/action-tmate@v3
```

---

## Best Practices

✅ **Use specific action versions** (`@v3`, not `@main`)
✅ **Cache dependencies** to speed up builds
✅ **Use matrix for multi-version testing**
✅ **Fail fast** with `fail-fast: true`
✅ **Use secrets** for sensitive data
✅ **Add status badges** to README
✅ **Use reusable workflows** for common tasks

❌ Don't commit secrets
❌ Don't use `latest` tags
❌ Don't run untrusted code

---

## Status Badge

Add to README.md:
```markdown
![CI](https://github.com/username/repo/workflows/CI/badge.svg)
```

---

## Interview Questions

**Q: What is the difference between `runs-on` and `uses`?**
A: `runs-on` specifies the runner OS. `uses` imports a pre-built action.

**Q: How do you share data between jobs?**
A: Use artifacts (`upload-artifact` and `download-artifact`).

**Q: What is the difference between `on: push` and `on: pull_request`?**
A: `push` triggers on commits to branches. `pull_request` triggers when PRs are opened/updated.

**Q: How do you prevent secrets from being exposed in logs?**
A: GitHub automatically masks secrets in logs. Never `echo` secrets directly.

---

## Summary

| Feature | Purpose |
| ------- | ------- |
| **Workflow** | Automation definition |
| **Event** | Trigger (push, PR, schedule) |
| **Job** | Group of steps |
| **Step** | Individual task |
| **Action** | Reusable code |
| **Secret** | Sensitive data |

**Key Insight**: GitHub Actions makes CI/CD accessible with minimal setup and deep GitHub integration.
