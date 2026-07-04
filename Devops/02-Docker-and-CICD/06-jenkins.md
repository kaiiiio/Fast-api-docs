# Jenkins — Deep Dive

## What is Jenkins?

Jenkins is a **self-hosted, open-source automation server** for CI/CD.

**Why Companies Still Use It**:
* Legacy systems
* Custom pipelines
* Self-hosted (data stays in-house)
* Extensive plugin ecosystem (1800+)
* Full control

**Downsides**:
* Maintenance overhead
* Steeper learning curve
* UI can be clunky
* Requires server management

---

## Key Terms

* **Controller/Master** (central Jenkins server): schedules jobs and manages configuration.
* **Agent/Node** (worker machine): runs pipeline jobs.
* **Jenkinsfile** (pipeline as code): version-controlled pipeline definition.
* **Declarative pipeline** (structured syntax): simpler, recommended Jenkinsfile style.
* **Scripted pipeline** (Groovy logic): more flexible but harder to read.
* **Stage** (pipeline phase): checkout, test, build, deploy.
* **Workspace** (job working folder): files checked out for a build.
* **Credential** (stored secret): password, token, SSH key managed by Jenkins.
* **Multibranch pipeline** (pipeline per branch): auto-discovers branches/PRs.
* **Post action** (after-build cleanup/notification): runs on success/failure/always.

---

## Jenkins vs GitHub Actions

| Feature | Jenkins | GitHub Actions |
| ------- | ------- | -------------- |
| **Hosting** | Self-hosted | Cloud (or self-hosted) |
| **Setup** | Complex | Simple |
| **Cost** | Free (but server costs) | Free tier available |
| **Plugins** | 1800+ | Marketplace actions |
| **Configuration** | UI + Groovy | YAML |
| **Maintenance** | You manage | GitHub manages |
| **Best for** | Enterprise, custom needs | GitHub projects |

---

## Jenkins Architecture

```
Jenkins Master (Controller)
 ↓
Jenkins Agents (Workers)
 ↓
Execute Jobs
```

**Components**:
1. **Master**: Schedules jobs, monitors agents
2. **Agents**: Execute builds
3. **Jobs**: Build configurations
4. **Plugins**: Extend functionality

---

## Installation

### Docker (Easiest)
```bash
docker run -d \
  -p 8080:8080 \
  -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  --name jenkins \
  jenkins/jenkins:lts
```

Access: `http://localhost:8080`

### Get Initial Password
```bash
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

---

## Pipeline Types

### 1. Freestyle Project
UI-based configuration (legacy, not recommended)

### 2. Pipeline (Declarative)
Modern, code-based approach

### 3. Multibranch Pipeline
Automatically creates pipelines for each branch

---

## Jenkinsfile (Declarative Pipeline)

**Jenkinsfile** (in repo root)

```groovy
pipeline {
    agent any
    
    environment {
        NODE_VERSION = '18'
        DOCKER_IMAGE = 'my-app'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }
        
        stage('Test') {
            steps {
                sh 'npm test'
            }
        }
        
        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }
        
        stage('Docker Build') {
            steps {
                script {
                    docker.build("${DOCKER_IMAGE}:${env.BUILD_ID}")
                }
            }
        }
        
        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                sh '''
                    docker stop my-app || true
                    docker rm my-app || true
                    docker run -d -p 3000:3000 --name my-app ${DOCKER_IMAGE}:${env.BUILD_ID}
                '''
            }
        }
    }
    
    post {
        success {
            echo 'Build succeeded!'
            // Send notification
        }
        failure {
            echo 'Build failed!'
            mail to: 'team@example.com',
                 subject: "Build Failed: ${env.JOB_NAME}",
                 body: "Build ${env.BUILD_NUMBER} failed"
        }
        always {
            cleanWs()  // Clean workspace
        }
    }
}
```

---

## Scripted Pipeline (Advanced)

More flexible, uses Groovy:

```groovy
node {
    stage('Checkout') {
        checkout scm
    }
    
    stage('Build') {
        try {
            sh 'npm install'
            sh 'npm run build'
        } catch (Exception e) {
            currentBuild.result = 'FAILURE'
            throw e
        }
    }
    
    stage('Deploy') {
        if (env.BRANCH_NAME == 'main') {
            sh './deploy.sh'
        }
    }
}
```

---

## Common Pipeline Features

### Parallel Execution

```groovy
stage('Test') {
    parallel {
        stage('Unit Tests') {
            steps {
                sh 'npm run test:unit'
            }
        }
        stage('Integration Tests') {
            steps {
                sh 'npm run test:integration'
            }
        }
        stage('Linting') {
            steps {
                sh 'npm run lint'
            }
        }
    }
}
```

### Conditional Stages

```groovy
stage('Deploy to Production') {
    when {
        allOf {
            branch 'main'
            environment name: 'DEPLOY_ENV', value: 'production'
        }
    }
    steps {
        sh './deploy-prod.sh'
    }
}
```

### Input (Manual Approval)

```groovy
stage('Deploy to Production') {
    steps {
        input message: 'Deploy to production?', ok: 'Deploy'
        sh './deploy.sh'
    }
}
```

### Retry

```groovy
stage('Deploy') {
    steps {
        retry(3) {
            sh './deploy.sh'
        }
    }
}
```

### Timeout

```groovy
stage('Test') {
    steps {
        timeout(time: 10, unit: 'MINUTES') {
            sh 'npm test'
        }
    }
}
```

---

## Environment Variables

### Built-in Variables

```groovy
pipeline {
    stages {
        stage('Info') {
            steps {
                echo "Job: ${env.JOB_NAME}"
                echo "Build: ${env.BUILD_NUMBER}"
                echo "Branch: ${env.BRANCH_NAME}"
                echo "Workspace: ${env.WORKSPACE}"
            }
        }
    }
}
```

### Custom Variables

```groovy
environment {
    MY_VAR = 'value'
    PATH = "/usr/local/bin:${env.PATH}"
}
```

---

## Credentials Management

### Add Credentials
1. **Manage Jenkins → Credentials**
2. Add username/password, SSH key, or secret text

### Use in Pipeline

```groovy
pipeline {
    stages {
        stage('Deploy') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'docker-hub',
                        usernameVariable: 'DOCKER_USER',
                        passwordVariable: 'DOCKER_PASS'
                    )
                ]) {
                    sh 'docker login -u $DOCKER_USER -p $DOCKER_PASS'
                }
            }
        }
    }
}
```

---

## Multibranch Pipeline

Automatically creates pipelines for each branch.

### Setup
1. **New Item → Multibranch Pipeline**
2. Configure Git repository
3. Jenkins scans branches and creates jobs

### Jenkinsfile per Branch
Each branch can have its own `Jenkinsfile`.

---

## Agents (Distributed Builds)

### Use Specific Agent

```groovy
pipeline {
    agent {
        label 'linux'  // Run on agent with 'linux' label
    }
    stages {
        stage('Build') {
            steps {
                sh 'make'
            }
        }
    }
}
```

### Docker Agent

```groovy
pipeline {
    agent {
        docker {
            image 'node:18'
        }
    }
    stages {
        stage('Build') {
            steps {
                sh 'npm install'
            }
        }
    }
}
```

### Different Agents per Stage

```groovy
pipeline {
    agent none
    stages {
        stage('Build') {
            agent {
                docker { image 'node:18' }
            }
            steps {
                sh 'npm run build'
            }
        }
        stage('Test') {
            agent {
                docker { image 'node:18' }
            }
            steps {
                sh 'npm test'
            }
        }
    }
}
```

---

## Essential Plugins

| Plugin | Purpose |
| ------ | ------- |
| **Git** | Git integration |
| **Docker** | Docker build/push |
| **Pipeline** | Pipeline support |
| **Blue Ocean** | Modern UI |
| **Slack** | Notifications |
| **Email Extension** | Email notifications |
| **Credentials** | Secrets management |
| **NodeJS** | Node.js support |

---

## Blue Ocean (Modern UI)

Install: **Manage Jenkins → Plugins → Blue Ocean**

Access: `http://localhost:8080/blue`

**Benefits**:
* Visual pipeline editor
* Better pipeline visualization
* Easier to debug

---

## Webhooks (Auto-trigger on Git Push)

### GitHub Webhook
1. **Repo Settings → Webhooks → Add webhook**
2. Payload URL: `http://jenkins-url/github-webhook/`
3. Content type: `application/json`
4. Events: `Just the push event`

### Jenkins Configuration
1. **Job → Configure → Build Triggers**
2. Check **GitHub hook trigger for GITScm polling**

---

## Best Practices

✅ **Use Jenkinsfile** (pipeline as code)
✅ **Version control Jenkinsfile** (in repo)
✅ **Use multibranch pipelines**
✅ **Implement proper error handling**
✅ **Clean workspace** after builds
✅ **Use credentials plugin** for secrets
✅ **Set timeouts** to prevent hanging builds
✅ **Use parallel stages** for speed
✅ **Regular backups** of Jenkins home

❌ Don't hardcode credentials
❌ Don't run everything on master
❌ Don't ignore failed builds
❌ Don't skip testing

---

## Backup & Restore

### Backup
```bash
# Backup Jenkins home directory
tar -czf jenkins-backup.tar.gz /var/jenkins_home
```

### Restore
```bash
# Extract to Jenkins home
tar -xzf jenkins-backup.tar.gz -C /var/jenkins_home
```

---

## Interview Questions

**Q: Why would you choose Jenkins over GitHub Actions?**
A: When you need self-hosted solution, have complex custom requirements, or need to keep data in-house.

**Q: What is the difference between Declarative and Scripted pipelines?**
A: Declarative is simpler, structured (recommended). Scripted is more flexible, uses full Groovy.

**Q: How do you handle secrets in Jenkins?**
A: Use the Credentials plugin and reference them with `withCredentials` in pipelines.

**Q: What is a Multibranch Pipeline?**
A: Automatically creates pipeline jobs for each branch in a repository.

---

## Migration from Jenkins to GitHub Actions

Many companies are migrating because:
* Less maintenance
* Better GitHub integration
* Simpler YAML syntax
* No server management

---

## Summary

| Aspect | Jenkins |
| ------ | ------- |
| **Type** | Self-hosted automation server |
| **Configuration** | Jenkinsfile (Groovy) |
| **Best for** | Enterprise, custom needs |
| **Pros** | Full control, extensive plugins |
| **Cons** | Maintenance, complexity |

**Key Insight**: Jenkins is powerful but requires maintenance. Great for enterprises with specific needs, but GitHub Actions is simpler for most modern projects.
