# Securing Database Connections: Production Security

Securing database connections protects data in transit and ensures only authorized access. This guide covers securing database connections in Express.js applications.

## Connection Security

### SSL/TLS Encryption

```javascript
const { Pool } = require('pg');

// SSL connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        require: true,
        rejectUnauthorized: true,
        ca: fs.readFileSync('./ca-certificate.crt').toString()
    }
});
```

### Connection String with SSL

```javascript
// SSL in connection string
const connectionString = 'postgresql://user:password@host:5432/db?' +
    'sslmode=require&' +
    'sslcert=./client-cert.crt&' +
    'sslkey=./client-key.key&' +
    'sslrootcert=./ca-cert.crt';
```

## Real-World Examples

### Example 1: Environment-Based SSL

```javascript
// config/database.js
const { Pool } = require('pg');

function createPool() {
    const config = {
        connectionString: process.env.DATABASE_URL
    };
    
    // SSL for production
    if (process.env.NODE_ENV === 'production') {
        config.ssl = {
            require: true,
            rejectUnauthorized: process.env.DB_SSL_VERIFY !== 'false'
        };
        
        // Add CA certificate if provided
        if (process.env.DB_CA_CERT_PATH) {
            config.ssl.ca = fs.readFileSync(process.env.DB_CA_CERT_PATH).toString();
        }
        
        // Client certificates if provided
        if (process.env.DB_CLIENT_CERT_PATH && process.env.DB_CLIENT_KEY_PATH) {
            config.ssl.cert = fs.readFileSync(process.env.DB_CLIENT_CERT_PATH).toString();
            config.ssl.key = fs.readFileSync(process.env.DB_CLIENT_KEY_PATH).toString();
        }
    }
    
    return new Pool(config);
}

module.exports = createPool();
```

### Example 2: Sequelize with SSL

```javascript
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
        ssl: process.env.NODE_ENV === 'production' ? {
            require: true,
            rejectUnauthorized: true,
            ca: process.env.DB_CA_CERT
        } : false
    },
    logging: false
});
```

## Connection Pooling Security

### Secure Pool Configuration

```javascript
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        require: true,
        rejectUnauthorized: true
    },
    max: 20,  // Limit connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
});

// Handle connection errors
pool.on('error', (err) => {
    console.error('Database connection error:', err);
    // Don't expose error details in production
});
```

## Best Practices

1. **Use SSL in Production**: Always use SSL/TLS
2. **Verify Certificates**: Set rejectUnauthorized: true
3. **Secure Credentials**: Store in environment variables
4. **Limit Connections**: Set max pool size
5. **Monitor Connections**: Track connection health

## Summary

**Securing Database Connections:**

1. **Purpose**: Protect data in transit
2. **Method**: SSL/TLS encryption
3. **Configuration**: SSL in connection string or options
4. **Best Practice**: Use SSL in production, verify certificates
5. **Benefits**: Encrypted data, secure access

**Key Takeaway:**
Securing database connections protects data in transit. Use SSL/TLS encryption for all database connections in production. Configure SSL with certificate verification (rejectUnauthorized: true). Store credentials securely in environment variables. Limit connection pool size and monitor connection health.

**Security Strategy:**
- Use SSL in production
- Verify certificates
- Secure credentials
- Limit connections
- Monitor health

**Next Steps:**
- Learn [Connection URI](../05_postgresql_specific/connection_uri_and_ssl_config.md) for configuration
- Study [Encrypting PII](encrypting_pii_at_rest.md) for data protection
- Master [Security Best Practices](../09_authentication_and_security/) for comprehensive security

---

## 🎯 Interview Questions: Securing Database Connections

### Q1: Why is SSL/TLS encryption critical for database connections in production Express.js applications? Explain the difference between "data in transit" and "data at rest," and what attacks does SSL/TLS prevent?

**Answer:**

Encryption in transit via SSL/TLS is the **minimum baseline for database security** in any production environment. It ensures that the communication channel between your Express backend and the database cluster is shielded from network-level threats, preventing the exposure of sensitive credentials and payload data to malicious actors on the wire.

**Why SSL/TLS is Critical:**

Database connections transmit sensitive data (user credentials, PII, financial information) between the Express.js application and the database. Without encryption, this data travels in **plaintext** over the network, making it vulnerable to interception and tampering.

**Data in Transit vs. Data at Rest:**

**Data in Transit**: Data moving between systems (application → database, client → server)
- **Protection**: SSL/TLS encryption
- **Threat**: Network interception (man-in-the-middle attacks)
- **Example**: SQL queries, query results, authentication credentials

**Data at Rest**: Data stored in databases, files, backups
- **Protection**: Encryption at rest (database-level encryption, file encryption)
- **Threat**: Physical theft, database breaches, backup theft
- **Example**: Database files, backup files, log files

**Visual Representation:**

```
Data in Transit (Network):
Application → [Encrypted] → Database
(SSL/TLS protects network transmission)

Data at Rest (Storage):
Database File: [Encrypted] → Disk
(Encryption protects stored data)
```

**Attacks SSL/TLS Prevents:**

1. **Man-in-the-Middle (MITM)**: Attacker intercepts network traffic
   - Without SSL: Attacker sees all SQL queries, results, credentials
   - With SSL: Traffic encrypted, attacker sees only encrypted data
   - Visual: `SELECT * FROM users` → Encrypted → Attacker cannot read

2. **Eavesdropping**: Network traffic monitoring
   - Without SSL: Network sniffing reveals all data
   - With SSL: Encrypted traffic, cannot be read
   - Example: Wireshark captures encrypted packets (useless without key)

3. **Data Tampering**: Attacker modifies data in transit
   - Without SSL: Attacker can modify queries/results
   - With SSL: Tampering detected (signature verification fails)
   - Example: Change `UPDATE balance SET amount = 1000` to `amount = 1000000`

4. **Credential Theft**: Database passwords intercepted
   - Without SSL: Plaintext passwords visible in network traffic
   - With SSL: Passwords encrypted, cannot be stolen

**SSL/TLS Configuration:**

```javascript
// Secure connection with SSL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        require: true,  // Require SSL
        rejectUnauthorized: true,  // Verify server certificate
        ca: fs.readFileSync('./ca-certificate.crt').toString()  // CA certificate
    }
});
```

**System Design Consideration**: SSL/TLS is **non-negotiable** for production systems. It protects data in transit from interception and tampering. Always use SSL in production (`require: true`), verify server certificates (`rejectUnauthorized: true`), and use CA certificates for certificate validation. Data in transit encryption is the **first line of defense** against network-based attacks.

---

### Q2: Explain the different SSL modes in PostgreSQL (disable, allow, prefer, require, verify-ca, verify-full). When would you use each mode, and what are the security implications?

**Answer:**

The various SSL modes in PostgreSQL provide a **spectrum of security and verification levels**, allowing you to balance strictness against configuration overhead. While basic modes like `require` offer encryption, production environments typically demand `verify-ca` or `verify-full` to prevent man-in-the-middle attacks through rigorous certificate chain validation.

**PostgreSQL SSL Modes:**

PostgreSQL supports different SSL modes that control when SSL is used and how strictly certificates are verified.

**SSL Modes:**

1. **disable**: SSL never used
   - **Use Case**: Development, local testing
   - **Security**: No encryption (insecure)
   - **Risk**: All data in plaintext

2. **allow**: SSL attempted, falls back to non-SSL if unavailable
   - **Use Case**: Legacy systems, gradual migration
   - **Security**: Weak (may not use SSL)
   - **Risk**: May fall back to plaintext

3. **prefer**: SSL preferred, falls back to non-SSL if unavailable
   - **Use Case**: Development with optional SSL
   - **Security**: Weak (may not use SSL)
   - **Risk**: May fall back to plaintext

4. **require**: SSL required, no certificate verification
   - **Use Case**: Internal networks, trusted environments
   - **Security**: Moderate (encrypted but no verification)
   - **Risk**: Vulnerable to MITM (no certificate verification)

5. **verify-ca**: SSL required, verify CA certificate
   - **Use Case**: Production, internal networks
   - **Security**: Good (encrypted + CA verification)
   - **Risk**: Vulnerable to MITM if CA compromised

6. **verify-full**: SSL required, verify CA + hostname
   - **Use Case**: Production, highest security
   - **Security**: Best (encrypted + full verification)
   - **Risk**: Minimal (full certificate chain verification)

**Visual Comparison:**

```
Security Level:
disable     < allow < prefer < require < verify-ca < verify-full
(No SSL)    (Weak)  (Weak)   (Moderate) (Good)     (Best)
```

**When to Use Each:**

**Development:**
- **disable** or **prefer**: Local development, no security requirements

**Staging:**
- **require**: Encrypted but no certificate verification (simpler setup)

**Production (Internal Network):**
- **verify-ca**: Encrypted + CA verification (trusted internal CA)

**Production (Public/Cloud):**
- **verify-full**: Encrypted + full verification (highest security)

**Implementation:**

```javascript
// Development
const devConfig = {
    ssl: false  // disable
};

// Staging
const stagingConfig = {
    ssl: {
        require: true,
        rejectUnauthorized: false  // require (no verification)
    }
};

// Production
const prodConfig = {
    ssl: {
        require: true,
        rejectUnauthorized: true,  // verify-full
        ca: fs.readFileSync('./ca-certificate.crt').toString()
    }
};
```

**Security Implications:**

**No SSL (disable, allow, prefer):**
- **Risk**: All data in plaintext, vulnerable to interception
- **Impact**: Credentials, PII, financial data exposed
- **Compliance**: Fails GDPR, PCI-DSS, HIPAA requirements

**SSL Without Verification (require):**
- **Risk**: Encrypted but vulnerable to MITM (attacker can present fake certificate)
- **Impact**: Attacker can intercept and decrypt traffic
- **Use Case**: Only in trusted internal networks

**SSL With Verification (verify-ca, verify-full):**
- **Risk**: Minimal (encrypted + certificate verified)
- **Impact**: Protects against MITM, ensures connection to legitimate server
- **Use Case**: Production, compliance requirements

**System Design Consideration**: Always use **verify-full** in production for maximum security. It provides encryption and prevents MITM attacks through certificate verification. Use **require** only in trusted internal networks where certificate management is complex. Never use **disable**, **allow**, or **prefer** in production (may fall back to plaintext). SSL mode choice directly impacts security posture and compliance (GDPR, PCI-DSS require encryption in transit).

---

### Q3: How would you securely manage database credentials (connection strings, passwords) in an Express.js application? Explain the security risks of hardcoding credentials and best practices for credential management.

**Answer:**

Secure credential management is about **removing sensitive secrets from the application's source code**. Hardcoding database passwords is a significant liability that can be mitigated through the use of environment-specific configuration and dedicated secret management vaults, ensuring that credentials are never accidentally exposed in version control or logs.

**Security Risks of Hardcoding Credentials:**

1. **Version Control Exposure**: Credentials committed to Git
   - Risk: Anyone with repository access sees credentials
   - Impact: Credentials exposed in Git history (even if later removed)

2. **Code Sharing**: Credentials visible in code reviews, open source
   - Risk: Credentials shared with team members, external contributors
   - Impact: Unauthorized database access

3. **Deployment Exposure**: Credentials in deployment artifacts
   - Risk: Credentials in Docker images, deployment packages
   - Impact: Anyone with artifact access can extract credentials

4. **Logging Exposure**: Credentials logged in application logs
   - Risk: Connection strings logged (error messages, debug logs)
   - Impact: Credentials visible in log files, monitoring systems

**Best Practices:**

**1. Environment Variables:**

```javascript
// BAD: Hardcoded credentials
const pool = new Pool({
    host: 'localhost',
    user: 'admin',
    password: 'secret123',
    database: 'mydb'
});

// GOOD: Environment variables
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
    // DATABASE_URL=postgresql://user:password@host:5432/db
});
```

**2. .env Files (Development):**

```bash
# .env (never commit to Git)
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
DB_HOST=localhost
DB_USER=admin
DB_PASSWORD=secret123
DB_NAME=mydb
```

```javascript
// Load .env in development
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
```

**3. .gitignore:**

```gitignore
# Never commit .env files
.env
.env.local
.env.*.local
```

**4. Secret Management Services (Production):**

**AWS Secrets Manager:**
```javascript
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();

async function getDatabaseCredentials() {
    const secret = await secretsManager.getSecretValue({
        SecretId: 'prod/database/credentials'
    }).promise();
    
    return JSON.parse(secret.SecretString);
}
```

**HashiCorp Vault:**
```javascript
const vault = require('node-vault');

async function getDatabaseCredentials() {
    const vaultClient = vault({
        endpoint: process.env.VAULT_ADDR,
        token: process.env.VAULT_TOKEN
    });
    
    const secret = await vaultClient.read('secret/data/database');
    return secret.data.data;
}
```

**5. Connection String Security:**

```javascript
// Parse connection string securely
const url = require('url');
const connectionString = process.env.DATABASE_URL;

// Validate connection string format
if (!connectionString || !connectionString.startsWith('postgresql://')) {
    throw new Error('Invalid DATABASE_URL');
}

// Use connection string directly (no parsing needed for pg library)
const pool = new Pool({
    connectionString: connectionString,
    ssl: process.env.NODE_ENV === 'production' ? {
        require: true,
        rejectUnauthorized: true
    } : false
});
```

**6. Credential Rotation:**

```javascript
// Support credential rotation without code changes
async function getDatabasePool() {
    const credentials = await getDatabaseCredentials();  // Fetch from secrets manager
    
    return new Pool({
        connectionString: `postgresql://${credentials.user}:${credentials.password}@${credentials.host}:5432/${credentials.database}`,
        ssl: { require: true, rejectUnauthorized: true }
    });
}

// Credentials automatically refreshed from secrets manager
```

**7. Least Privilege:**

```javascript
// Use different credentials for different operations
// Read-only user for queries
const readPool = new Pool({
    connectionString: process.env.DATABASE_READ_URL  // Read-only user
});

// Write user for mutations
const writePool = new Pool({
    connectionString: process.env.DATABASE_WRITE_URL  // Write user
});
```

**System Design Consideration**: Credential management is **critical** for security. Never hardcode credentials (exposed in version control, logs, code reviews). Use **environment variables** for development, **secret management services** (AWS Secrets Manager, Vault) for production. Implement **credential rotation** (automated password changes) and **least privilege** (different credentials for different operations). Credential exposure is a **common attack vector** (GitHub scraping, log analysis), so proper management is essential.

---

### Q4: Explain connection pooling security considerations in Express.js applications. What are the risks of connection pool exhaustion, and how would you prevent and monitor it?

**Answer:**

Connection pool exhaustion is a **denial-of-service vulnerability** that can bring down even the most well-written Express application. Effective pool management requires setting strict resource limits and implementing robust monitoring to detect connection leaks early, ensuring that your application remains responsive under high load.

**Connection Pooling Security:**

Connection pooling manages a pool of database connections that are reused across requests. Security considerations include limiting pool size, preventing connection leaks, and monitoring pool health.

**Risks of Pool Exhaustion:**

1. **Denial of Service (DoS)**: Attacker exhausts connection pool
   - Attack: Send many requests, each holds a connection
   - Impact: Legitimate requests cannot get connections, application fails
   - Visual: Pool (20 connections) → All held by attacker → Legitimate requests blocked

2. **Connection Leaks**: Connections not released back to pool
   - Cause: Unhandled errors, missing `pool.end()`, long-running queries
   - Impact: Pool gradually exhausted, no connections available
   - Example: Error in route handler → Connection not released → Pool depleted

3. **Resource Exhaustion**: Too many connections consume database resources
   - Impact: Database overwhelmed, performance degradation
   - Example: 1000 connections → Database CPU/memory exhausted

**Prevention Strategies:**

**1. Limit Pool Size:**

```javascript
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,  // Maximum connections in pool
    min: 2,   // Minimum connections (always available)
    idleTimeoutMillis: 30000,  // Close idle connections after 30s
    connectionTimeoutMillis: 2000  // Timeout if no connection available
});
```

**2. Connection Timeout:**

```javascript
// Fail fast if pool exhausted
const pool = new Pool({
    max: 20,
    connectionTimeoutMillis: 2000  // Throw error if no connection in 2s
});

// Handle timeout
try {
    const client = await pool.connect();
    // Use connection
    client.release();
} catch (error) {
    if (error.code === 'ETIMEDOUT') {
        // Pool exhausted, return 503 Service Unavailable
        return res.status(503).json({ error: 'Service temporarily unavailable' });
    }
    throw error;
}
```

**3. Connection Leak Detection:**

```javascript
// Track connection usage
const activeConnections = new Map();

pool.on('connect', (client) => {
    const connectionId = client.processID;
    activeConnections.set(connectionId, {
        startTime: Date.now(),
        query: null
    });
});

pool.on('remove', (client) => {
    const connectionId = client.processID;
    activeConnections.delete(connectionId);
});

// Monitor for leaks (connections held > 5 minutes)
setInterval(() => {
    const now = Date.now();
    activeConnections.forEach((info, connectionId) => {
        const age = now - info.startTime;
        if (age > 300000) {  // 5 minutes
            console.error(`Connection leak detected: ${connectionId} held for ${age}ms`);
        }
    });
}, 60000);  // Check every minute
```

**4. Rate Limiting:**

```javascript
// Limit requests per IP to prevent pool exhaustion
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 60 * 1000,  // 1 minute
    max: 100  // 100 requests per minute
});

app.use('/api/', limiter);
```

**5. Query Timeout:**

```javascript
// Timeout long-running queries
const pool = new Pool({
    max: 20,
    query_timeout: 5000  // 5 second query timeout
});

// Or per-query timeout
await pool.query({
    text: 'SELECT * FROM users',
    rowMode: 'array',
    timeout: 5000  // 5 seconds
});
```

**Monitoring:**

```javascript
// Monitor pool health
app.get('/health/database', async (req, res) => {
    const poolStats = {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
        active: pool.totalCount - pool.idleCount
    };
    
    // Check if pool is healthy
    const isHealthy = poolStats.waiting === 0 && poolStats.active < poolStats.total;
    
    res.status(isHealthy ? 200 : 503).json({
        healthy: isHealthy,
        pool: poolStats
    });
});
```

**System Design Consideration**: Connection pool exhaustion is a **common attack vector** (DoS) and **operational issue** (connection leaks). Prevent with **pool size limits**, **connection timeouts**, **query timeouts**, and **rate limiting**. Monitor pool health (active, idle, waiting connections) and implement alerts for pool exhaustion. Connection pooling is essential for performance but requires careful configuration to prevent security and availability issues.

---

### Q5: How would you implement secure database connection handling with automatic retry and failover in a production Express.js application? Explain the trade-offs between different retry strategies and when to use each.

**Answer:**

Automated retry and failover strategies are the **pillars of database resilience** in a distributed Express architecture. By intelligently handling transient failures through patterns like exponential backoff and circuit breakers, you can ensure that your application recovers gracefully from database outages without overwhelming the upstream systems during a restart.

**Secure Connection Handling:**

Production systems must handle database connection failures gracefully (network issues, database restarts, connection timeouts) while maintaining security (SSL, credential management).

**Retry Strategies:**

**1. Exponential Backoff:**

```javascript
async function connectWithRetry(pool, maxRetries = 5) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const client = await pool.connect();
            return client;
        } catch (error) {
            lastError = error;
            
            // Don't retry on authentication errors
            if (error.code === '28P01') {  // Invalid password
                throw error;
            }
            
            // Exponential backoff: 1s, 2s, 4s, 8s
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    throw lastError;
}
```

**2. Circuit Breaker Pattern:**

```javascript
class CircuitBreaker {
    constructor(threshold = 5, timeout = 60000) {
        this.failureCount = 0;
        this.threshold = threshold;
        this.timeout = timeout;
        this.state = 'closed';  // closed, open, half-open
        this.nextAttempt = Date.now();
    }
    
    async execute(operation) {
        if (this.state === 'open') {
            if (Date.now() < this.nextAttempt) {
                throw new Error('Circuit breaker open');
            }
            this.state = 'half-open';
        }
        
        try {
            const result = await operation();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }
    
    onSuccess() {
        this.failureCount = 0;
        this.state = 'closed';
    }
    
    onFailure() {
        this.failureCount++;
        if (this.failureCount >= this.threshold) {
            this.state = 'open';
            this.nextAttempt = Date.now() + this.timeout;
        }
    }
}

const circuitBreaker = new CircuitBreaker();

// Use circuit breaker
async function queryWithCircuitBreaker(query, params) {
    return await circuitBreaker.execute(async () => {
        return await pool.query(query, params);
    });
}
```

**3. Connection Pool with Automatic Retry:**

```javascript
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    connectionTimeoutMillis: 2000,
    // Pool automatically retries connections
    retry: {
        max: 3,
        delay: 1000
    }
});

// Handle pool errors
pool.on('error', (err) => {
    console.error('Unexpected pool error:', err);
    // Pool automatically handles reconnection
});
```

**4. Failover (Primary-Replica):**

```javascript
// Primary database (write)
const primaryPool = new Pool({
    connectionString: process.env.DATABASE_PRIMARY_URL
});

// Replica database (read)
const replicaPool = new Pool({
    connectionString: process.env.DATABASE_REPLICA_URL
});

// Automatic failover
async function queryWithFailover(query, params, isWrite = false) {
    const pool = isWrite ? primaryPool : replicaPool;
    
    try {
        return await pool.query(query, params);
    } catch (error) {
        // If replica fails, try primary
        if (!isWrite && error.code === 'ECONNREFUSED') {
            console.warn('Replica failed, using primary');
            return await primaryPool.query(query, params);
        }
        throw error;
    }
}
```

**Trade-offs:**   -- IMP

| Strategy | Pros | Cons | Use Case |
|----------|------|------|----------|
| **Exponential Backoff** | Simple, handles transient failures | May delay failure detection | Network issues, temporary outages |
| **Circuit Breaker** | Prevents cascading failures | Complex, may block legitimate requests | Repeated failures, database overload |
| **Pool Retry** | Automatic, transparent | Limited control | Standard connection issues |
| **Failover** | High availability | Complex setup, data consistency | Production, multi-region |

**When to Use Each:**

- **Exponential Backoff**: Transient network issues, database restarts
- **Circuit Breaker**: Repeated failures, prevent overwhelming database
- **Pool Retry**: Standard connection pool management
- **Failover**: High availability requirements, read replicas

**Complete Implementation:**

```javascript
class SecureDatabaseConnection {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: {
                require: true,
                rejectUnauthorized: true,
                ca: fs.readFileSync('./ca-cert.crt').toString()
            },
            max: 20,
            connectionTimeoutMillis: 2000
        });
        
        this.circuitBreaker = new CircuitBreaker();
    }
    
    async query(sql, params) {
        return await this.circuitBreaker.execute(async () => {
            try {
                return await this.pool.query(sql, params);
            } catch (error) {
                // Retry on connection errors
                if (this.isRetryableError(error)) {
                    await this.retryWithBackoff(() => this.pool.query(sql, params));
                }
                throw error;
            }
        });
    }
    
    isRetryableError(error) {
        return error.code === 'ECONNREFUSED' || 
               error.code === 'ETIMEDOUT' ||
               error.code === '57P01';  // Admin shutdown
    }
}
```

**System Design Consideration**: Connection handling must balance **availability** (retry on transient failures) and **security** (maintain SSL, credential security). Use **exponential backoff** for transient failures, **circuit breaker** for repeated failures, and **failover** for high availability. Monitor connection health and implement alerts for persistent failures. Connection handling is critical for **resilience** in production systems.

