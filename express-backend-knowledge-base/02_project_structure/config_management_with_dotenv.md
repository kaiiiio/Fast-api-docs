# Configuration Management with dotenv

Managing configuration properly is crucial for Express.js applications. This guide covers environment variables, validation, and best practices using `dotenv` and related tools.

## Basic Configuration Setup

### Using dotenv

```javascript
// config/env.js
require('dotenv').config();

// Configuration: Centralized environment variable management.
const config = {
    // Application settings: Basic types with defaults.
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT, 10) || 3000,
    PROJECT_NAME: process.env.PROJECT_NAME || 'My Express App',
    VERSION: process.env.VERSION || '1.0.0',
    
    // Server settings
    HOST: process.env.HOST || '0.0.0.0',
    API_PREFIX: process.env.API_PREFIX || '/api/v1',
    
    // Database: Required field loaded from environment.
    DATABASE_URL: process.env.DATABASE_URL,
    
    // Security: JWT token configuration.
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_ALGORITHM: process.env.JWT_ALGORITHM || 'HS256',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '30m',
    
    // CORS: Allowed origins for cross-origin requests.
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
    
    // Redis: Cache/session storage URL.
    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
};

// Validation: Ensure required environment variables are set.
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
requiredEnvVars.forEach(varName => {
    if (!config[varName]) {
        throw new Error(`Missing required environment variable: ${varName}`);
    }
});

module.exports = config;
```

**Explanation:** This defines a `config` object that reads from `process.env`. It declares configuration fields with defaults and validates required variables. The `dotenv` package automatically loads values from a `.env` file.

### Environment File (.env)

```bash
# .env
NODE_ENV=development
PORT=3000
PROJECT_NAME=My Express App
VERSION=1.0.0

DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_EXPIRES_IN=30m

CORS_ORIGIN=http://localhost:3000

REDIS_URL=redis://localhost:6379
```

**Explanation:** This is a standard `.env` file. `dotenv` reads these key-value pairs and injects them into `process.env`. You need to handle type conversion manually (e.g., `parseInt` for numbers).

## Advanced Configuration Patterns

### 1. **Nested Configuration Objects**

Groups related settings into sub-objects for better organization:

```javascript
// config/database.js: Groups all database-related config.
const databaseConfig = {
    url: process.env.DATABASE_URL,
    poolSize: parseInt(process.env.DB_POOL_SIZE, 10) || 10,
    maxOverflow: parseInt(process.env.DB_MAX_OVERFLOW, 10) || 20,
    echo: process.env.DB_ECHO === 'true',
};

// config/security.js: Groups security config.
const securityConfig = {
    secretKey: process.env.SECURITY_SECRET_KEY,
    algorithm: process.env.SECURITY_ALGORITHM || 'HS256',
    accessTokenExpireMinutes: parseInt(process.env.SECURITY_ACCESS_TOKEN_EXPIRE_MINUTES, 10) || 30,
    refreshTokenExpireDays: parseInt(process.env.SECURITY_REFRESH_TOKEN_EXPIRE_DAYS, 10) || 7,
};

// config/index.js: Main config that nests sub-configs.
const config = {
    projectName: process.env.PROJECT_NAME || 'My Express App',
    database: databaseConfig,  // Nested config
    security: securityConfig,  // Nested config
};

module.exports = config;
```

**Explanation:** This pattern groups related settings into sub-objects (`databaseConfig`, `securityConfig`). Access via `config.database.url` or `config.security.secretKey`. This keeps the configuration namespace organized.

### 2. **Environment-Specific Configuration**

Uses environment variable to automatically configure settings:

```javascript
// config/env.js
const environments = {
    DEVELOPMENT: 'development',
    STAGING: 'staging',
    PRODUCTION: 'production'
};

// Configuration: Environment-specific settings.
const config = {
    environment: process.env.NODE_ENV || environments.DEVELOPMENT,
    
    // Development-specific: Flags that change based on environment.
    debug: process.env.NODE_ENV === environments.DEVELOPMENT,
    reload: process.env.NODE_ENV === environments.DEVELOPMENT,
    
    // Database configuration: Required field loaded from env vars/.env.
    databaseUrl: process.env.DATABASE_URL,
    
    // Helper methods: Computed properties for environment checks.
    isDevelopment() {
        return this.environment === environments.DEVELOPMENT;
    },
    
    isProduction() {
        return this.environment === environments.PRODUCTION;
    }
};

// Auto-configure: Set debug/reload based on environment.
if (config.isDevelopment()) {
    config.debug = true;
    config.reload = true;
}

module.exports = config;
```

**Explanation:** This snippet uses environment checks to automatically configure settings. When `NODE_ENV=development`, debug mode and reload are automatically enabled.

### 3. **Validated Configuration Values**

Uses validation to ensure configuration values meet requirements:

```javascript
// config/validation.js: Validation functions for config values.
function validatePort(port) {
    const numPort = parseInt(port, 10);
    if (isNaN(numPort) || numPort < 1 || numPort > 65535) {
        throw new Error(`Invalid port: ${port}. Must be between 1 and 65535`);
    }
    return numPort;
}

function validateSecretKey(secret) {
    if (!secret || secret.length < 32) {
        throw new Error('JWT_SECRET must be at least 32 characters');
    }
    return secret;
}

// config/env.js: Configuration with validation.
const config = {
    // Validated fields: Enforce constraints.
    port: validatePort(process.env.PORT || 3000),  // Valid port range
    maxWorkers: parseInt(process.env.MAX_WORKERS, 10) || 4,  // Reasonable worker limit
    
    // Custom validation: Enforce security requirements.
    jwtSecret: validateSecretKey(process.env.JWT_SECRET),  // Minimum security requirement
    
    // Array parsing: Handle JSON strings from .env.
    corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS || '[]'),
};

// parseCorsOrigins: Handle JSON string from .env.
function parseCorsOrigins(value) {
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);  // Converts "[\"url1\",\"url2\"]" to array
        } catch {
            return [value];  // Single value as array
        }
    }
    return Array.isArray(value) ? value : [];
}

module.exports = config;
```

**Explanation:** This pattern validates configuration values before use. It ensures the port is valid, the secret key meets security requirements, and arrays are parsed correctly from JSON strings.

## Using Configuration in Express

### In Application

```javascript
// app.js
const config = require('./config/env');
const express = require('express');

const app = express();

// Use config: Access configuration values.
app.set('port', config.port);
app.set('env', config.environment);

// Conditional middleware: Based on environment.
if (config.isDevelopment()) {
    app.use(require('morgan')('dev'));  // Logging in development
}

app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
});
```

### In Services

```javascript
// services/userService.js
const config = require('../config/env');
const jwt = require('jsonwebtoken');

// Use config: Access nested configuration.
function createToken(userId) {
    return jwt.sign(
        { userId },
        config.security.secretKey,  // Access nested config
        { expiresIn: config.security.accessTokenExpireMinutes }
    );
}
```

## Best Practices

### 1. **Never Commit .env Files**

```gitignore
# .gitignore
.env
.env.local
.env.*.local
```

**Create `.gitignore` file (CLI command):**
```bash
echo "# Ignore env files" > .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.*.local" >> .gitignore
```

### 2. **Provide .env.example**

```bash
# .env.example (committed to git)
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET=your-secret-key-here-min-32-chars
```

### 3. **Validate on Startup**

```javascript
// config/validate.js
function validateConfig() {
    const required = ['DATABASE_URL', 'JWT_SECRET'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}

// Call on app startup
validateConfig();
```

### 4. **Type Safety with TypeScript**

```typescript
// config/env.ts: TypeScript provides compile-time type safety.
interface Config {
    port: number;
    databaseUrl: string;
    jwtSecret: string;
    corsOrigins: string[];
}

const config: Config = {
    port: parseInt(process.env.PORT || '3000', 10),
    databaseUrl: process.env.DATABASE_URL!,
    jwtSecret: process.env.JWT_SECRET!,
    corsOrigins: JSON.parse(process.env.CORS_ORIGINS || '[]'),
};

export default config;
```

## Summary

Effective configuration management in Express.js requires: Using dotenv for environment variables, validating required variables on startup, organizing config into logical groups, providing .env.example for documentation, and never committing .env files to git.

---

## 🎯 Interview Questions: Configuration Management

### Q1: How do you manage environment variables in a production Express.js application? What are the security best practices?

**Answer:**

**Environment Variables** store **sensitive configuration** outside code. Never commit secrets to git.

**Basic Setup:**

```javascript
// .env (not committed)
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
JWT_SECRET=super-secret-key-min-32-chars
API_KEY=abc123xyz

// config/env.js
require('dotenv').config();

module.exports = {
    port: process.env.PORT || 3000,
    db: {
        url: process.env.DATABASE_URL
    },
    jwt: {
        secret: process.env.JWT_SECRET
    }
};
```

**Security Best Practices:**

```javascript
// ✅ 1. Validate on startup
function validateConfig() {
    const required = ['DATABASE_URL', 'JWT_SECRET'];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing: ${missing.join(', ')}`);
    }
}

// ✅ 2. Use strong secrets
// JWT_SECRET should be 32+ characters, random
// Generate: openssl rand -base64 32

// ✅ 3. Never log secrets
console.log(process.env.JWT_SECRET); // ❌ Never do this

// ✅ 4. Use different values per environment
// Development: .env.development
// Production: .env.production (or secrets manager)
```

**Production Secrets Management:**

```javascript
// Option 1: AWS Secrets Manager
const { SecretsManager } = require('@aws-sdk/client-secrets-manager');
const client = new SecretsManager({ region: 'us-east-1' });

async function getSecret(name) {
    const response = await client.getSecretValue({ SecretId: name });
    return JSON.parse(response.SecretString);
}

// Option 2: HashiCorp Vault
const vault = require('node-vault')();
const secret = await vault.read('secret/data/myapp');

// Option 3: Environment variables (Kubernetes, Docker)
// Set in deployment config, not in code
```

**Common Mistakes:**

```javascript
// ❌ Mistake 1: Hardcoded secrets
const secret = 'my-secret-key'; // Never!

// ❌ Mistake 2: Committing .env
// Add to .gitignore
.env
.env.local
.env.*.local

// ❌ Mistake 3: Weak secrets
JWT_SECRET=12345 // Too short, predictable

// ✅ Correct
JWT_SECRET=$(openssl rand -base64 32) // Strong, random
```

---

### Q2: How would you design a configuration system that supports multiple environments (dev, staging, production)?

**Answer:**

Design a **hierarchical configuration system** with environment-specific overrides.

**Structure:**

```
config/
├── default.js      # Base configuration
├── development.js  # Development overrides
├── staging.js      # Staging overrides
├── production.js   # Production overrides
└── index.js        # Loader
```

**Implementation:**

```javascript
// config/default.js
module.exports = {
    app: {
        name: 'MyApp',
        port: 3000
    },
    db: {
        pool: {
            min: 2,
            max: 10
        }
    },
    logging: {
        level: 'info'
    }
};

// config/development.js
module.exports = {
    db: {
        host: 'localhost',
        port: 5432
    },
    logging: {
        level: 'debug' // More verbose in dev
    }
};

// config/production.js
module.exports = {
    db: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        ssl: true // SSL in production
    },
    logging: {
        level: 'error' // Less verbose in prod
    }
};

// config/index.js
const _ = require('lodash');
const env = process.env.NODE_ENV || 'development';

const defaultConfig = require('./default');
const envConfig = require(`./${env}`);

// Merge: env config overrides default
const config = _.merge({}, defaultConfig, envConfig);

module.exports = config;
```

**Usage:**

```javascript
// app.js
const config = require('./config');

app.listen(config.app.port, () => {
    console.log(`Server running on port ${config.app.port}`);
});
```

**Environment Detection:**

```javascript
// Automatic environment detection
const env = process.env.NODE_ENV || 'development';

// Or explicit
const env = process.env.APP_ENV || 'development';

// Validate environment
const validEnvs = ['development', 'staging', 'production'];
if (!validEnvs.includes(env)) {
    throw new Error(`Invalid environment: ${env}`);
}
```

---

### Q3: Explain the difference between configuration and secrets. How do you handle each?

**Answer:**

**Configuration** = Non-sensitive settings (ports, timeouts, feature flags)  
**Secrets** = Sensitive data (passwords, API keys, tokens)

**Configuration (Can be in code/config files):**

```javascript
// config/app.js
module.exports = {
    port: 3000,
    timeout: 5000,
    maxRetries: 3,
    features: {
        enableCache: true,
        enableMetrics: false
    }
};
```

**Secrets (Must be in environment/secrets manager):**

```javascript
// ❌ Never in code
const secret = 'my-password';

// ✅ In environment
const secret = process.env.DB_PASSWORD;

// ✅ In secrets manager (production)
const secret = await getSecretFromVault('db-password');
```

**Handling Strategy:**

```
Configuration:
├─ Store in: config files, code
├─ Version control: ✅ Yes
├─ Examples: ports, timeouts, feature flags
└─ Security: Low risk

Secrets:
├─ Store in: environment variables, secrets manager
├─ Version control: ❌ Never
├─ Examples: passwords, API keys, tokens
└─ Security: High risk
```

**Best Practice:**

```javascript
// config/index.js
module.exports = {
    // Configuration (safe to commit)
    app: {
        port: process.env.PORT || 3000,
        env: process.env.NODE_ENV || 'development'
    },
    
    // Secrets (from environment only)
    secrets: {
        dbPassword: process.env.DB_PASSWORD, // Required
        jwtSecret: process.env.JWT_SECRET,     // Required
        apiKey: process.env.API_KEY            // Required
    }
};

// Validate secrets on startup
function validateSecrets() {
    const required = ['DB_PASSWORD', 'JWT_SECRET'];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing secrets: ${missing.join(', ')}`);
    }
}
```

---

## Summary

These interview questions cover:
- ✅ Environment variable management and security
- ✅ Multi-environment configuration systems
- ✅ Configuration vs secrets handling
- ✅ Production secrets management
- ✅ Best practices and common mistakes

Master these for mid-level and senior interviews focusing on configuration management and security.

