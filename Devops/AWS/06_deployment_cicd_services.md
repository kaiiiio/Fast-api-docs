# AWS CI/CD & Deployment Services

Automating the journey from code commit to production.

## 1. AWS CodePipeline
**Orchestration:** The glue that connects your source code to your build and deployment steps.

- **Source Stage:** Connects to GitHub, Bitbucket, or AWS CodeCommit.
- **Build Stage:** Triggers unit tests and creates build artifacts.
- **Deploy Stage:** Sends the code to EC2, Lambda, or ECS.

---

## 2. AWS CodeBuild
**Continuous Integration:** A fully managed build service that compiles source code, runs tests, and produces software packages.

### buildspec.yml
Crucial file in your root directory that tells CodeBuild what to do.
```yaml
version: 0.2
phases:
  install:
    commands:
      - npm install
  build:
    commands:
      - npm run build
      - npm test
artifacts:
  files:
    - '**/*'
```

---

## 3. AWS CodeDeploy
**Deployment Automation:** Handles the heavy lifting of updating instances or containers with minimal downtime.

### appspec.yml
Defines the deployment actions (which files go where and what scripts to run).
```yaml
version: 0.0
os: linux
files:
  - source: /
    destination: /var/www/myapp
hooks:
  AfterInstall:
    - location: scripts/install_dependencies.sh
  ApplicationStart:
    - location: scripts/start_server.sh
```

---

## 4. ECR (Elastic Container Registry)
**Docker Registry:** Private registry to store and manage your Docker images.
- Integrates natively with ECS and EKS.
- Highly secure with IAM based image access.

---

## Summary Checklist
- **Pipeline Orchestrator:** CodePipeline.
- **Compiler/Tester:** CodeBuild.
- **Deployment Agent:** CodeDeploy.
- **Docker Repo:** ECR.
