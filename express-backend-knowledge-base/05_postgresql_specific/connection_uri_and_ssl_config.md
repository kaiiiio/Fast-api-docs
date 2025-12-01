# Connection URI and SSL Config: Secure PostgreSQL Connections

Configuring PostgreSQL connections with proper URIs and SSL is essential for production security. This guide covers connection configuration in Express.js.

## Connection URI Format

**Connection URI** is a standardized string that contains all connection parameters.

### Basic URI Format

```
postgresql://[user[:password]@][host][:port][/database][?parameters]
```

### Examples

```javascript
// Basic connection
const uri = 'postgresql://user:password@localhost:5432/mydb';

// With SSL
const uri = 'postgresql://user:password@localhost:5432/mydb?sslmode=require';

// Remote connection
const uri = 'postgresql://user:password@db.example.com:5432/mydb?sslmode=require';

// Connection pool
const uri = 'postgresql://user:password@localhost:5432/mydb?pool_size=20';
```

## Using Connection URI

### With pg (node-postgres)

```javascript
const { Pool } = require('pg');

// Use connection URI
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// Or parse URI
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : false
});
```

### With Sequelize

```javascript
const { Sequelize } = require('sequelize');

// Use connection URI
const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
        ssl: process.env.NODE_ENV === 'production' ? {
            require: true,
            rejectUnauthorized: false
        } : false
    }
});
```

## SSL Configuration

### SSL Modes

```javascript
// sslmode options:
// - disable: No SSL
// - allow: Try SSL, fallback to non-SSL
// - prefer: Prefer SSL, fallback to non-SSL
// - require: Require SSL
// - verify-ca: Require SSL and verify CA
// - verify-full: Require SSL, verify CA and hostname
```

### Production SSL Config

```javascript
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        require: true,
        rejectUnauthorized: true,
        ca: fs.readFileSync('./ca-certificate.crt').toString(),
        cert: fs.readFileSync('./client-certificate.crt').toString(),
        key: fs.readFileSync('./client-key.key').toString()
    }
});
```

### Environment-Based SSL

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
            rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
        };
        
        // Add CA certificate if provided
        if (process.env.DB_CA_CERT) {
            config.ssl.ca = process.env.DB_CA_CERT;
        }
    }
    
    return new Pool(config);
}

module.exports = createPool();
```

## Real-World Examples

### Example 1: Environment-Based Configuration

```javascript
// config/database.js
require('dotenv').config();
const { Sequelize } = require('sequelize');

const getDatabaseConfig = () => {
    const baseConfig = {
        dialect: 'postgres',
        logging: process.env.NODE_ENV === 'development' ? console.log : false
    };
    
    // Development: Local database
    if (process.env.NODE_ENV === 'development') {
        return {
            ...baseConfig,
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME,
            username: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        };
    }
    
    // Production: Connection URI with SSL
    return {
        ...baseConfig,
        url: process.env.DATABASE_URL,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: true
            }
        }
    };
};

const sequelize = new Sequelize(getDatabaseConfig());

module.exports = sequelize;
```

### Example 2: Connection Pool with SSL

```javascript
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
        require: true,
        rejectUnauthorized: false  // For cloud databases (AWS RDS, etc.)
    } : false,
    max: 20,  // Maximum connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
});

// Test connection
pool.on('connect', () => {
    console.log('Database connected');
});

pool.on('error', (err) => {
    console.error('Database connection error:', err);
});

module.exports = pool;
```

## Connection String Parameters

### Common Parameters

```javascript
// Connection string with parameters
const uri = 'postgresql://user:password@host:5432/db?' +
    'sslmode=require&' +
    'connect_timeout=10&' +
    'application_name=myapp';

// Parameters:
// - sslmode: SSL mode
// - connect_timeout: Connection timeout (seconds)
// - application_name: Application identifier
// - pool_size: Connection pool size
```

## Best Practices

1. **Use Environment Variables**: Never hardcode credentials
2. **SSL in Production**: Always use SSL in production
3. **Connection Pooling**: Configure appropriate pool size
4. **Error Handling**: Handle connection errors gracefully
5. **Health Checks**: Monitor connection health

## Summary

**Connection URI and SSL Config:**

1. **URI Format**: Standardized connection string
2. **SSL Modes**: Multiple SSL options for security
3. **Configuration**: Environment-based configuration
4. **Best Practice**: Use SSL in production, environment variables
5. **Security**: Secure credentials, verify certificates

**Key Takeaway:**
PostgreSQL connection URIs provide a standardized way to configure connections. Use SSL in production for secure connections. Configure SSL based on environment (require SSL in production). Use environment variables for credentials, never hardcode them. Configure connection pooling appropriately for performance.

**Connection Security:**
- Use SSL in production
- Store credentials in environment variables
- Verify certificates when possible
- Use connection pooling
- Monitor connection health

**Next Steps:**
- Learn [Connection Pooling](../03_data_layer_fundamentals/connection_pooling_and_lifecycles.md) for pool management
- Study [Sequelize Deep Dive](../04_relational_databases_sql/sequelize_deep_dive.md) for ORM usage
- Master [Security Best Practices](../09_authentication_and_security/) for comprehensive security

