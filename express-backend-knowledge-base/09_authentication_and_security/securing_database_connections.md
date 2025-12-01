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

