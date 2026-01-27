# Connection URI and SSL Config: Secure PostgreSQL in TypeORM

Setting up secure, reliable database connections is a prerequisite for any production-grade Express.js application. This guide covers how to handle Connection URIs and SSL configurations specifically for TypeORM.

## 📝 Interview-Ready Definitions  --- IMP

**Connection URI:** A single string that encapsulates the protocol, credentials, host, port, and database name. It is the industry standard for passing database configuration via environment variables (e.g., `DATABASE_URL`).

**SSL/TLS (Secure Sockets Layer):** A cryptographic protocol that encrypts the data moving between your Express.js server and your PostgreSQL database, preventing "man-in-the-middle" attacks.

**rejectUnauthorized:** A critical security setting. When `true`, it requires the database server to provide a certificate signed by a trusted Certificate Authority (CA). Setting this to `false` is common in development but dangerous in production unless you are on a private network.

---

## 1. Using Connection URIs in TypeORM

TypeORM's `DataSource` allows you to pass a `url` parameter instead of individual host/port/username fields.

### Simple Configuration
```typescript
import { DataSource } from "typeorm";

export const AppDataSource = new DataSource({
    type: "postgres",
    url: process.env.DATABASE_URL, // Example: postgresql://user:pass@localhost:5432/mydb
    synchronize: false,
    logging: true,
    entities: ["src/entity/**/*.ts"],
});
```

---

## 2. SSL Configuration for Production

When connecting to cloud databases like AWS RDS, Heroku Postgres, or DigitalOcean, SSL is usually mandatory.

### Basic Production SSL
```typescript
{
    type: "postgres",
    url: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Often required for Heroku/DigitalOcean
    },
    // Alternative for more strict security
    /*
    ssl: {
        ca: fs.readFileSync("/path/to/ca-cert.pem").toString(),
        rejectUnauthorized: true,
    }
    */
}
```

### Environment-Based Configuration Strategy

```typescript
import { DataSourceOptions } from "typeorm";

const getOptions = (): DataSourceOptions => {
  const isProd = process.env.NODE_ENV === "production";

  return {
    type: "postgres",
    url: process.env.DATABASE_URL,
    synchronize: false,
    entities: ["src/entity/**/*.ts"],
    // Secure SSL config for production
    extra: isProd ? {
      ssl: {
        rejectUnauthorized: true,
        ca: process.env.CA_CERT 
      }
    } : undefined
  };
};
```

---

## 3. Best Practices  --- IMP

1. **Use `DATABASE_URL`:** Stick to a single environment variable for the connection string. This makes it easy to swap databases across environments (Dev, Staging, Prod).
2. **Never hardcode credentials:** Always use `process.env`.
3. **Configure the Pool:** Use the `extra` property in TypeORM to configure the underlying `pg` pool settings (e.g., `max: 20`, `idleTimeoutMillis: 30000`).
4. **Graceful Shutdown:** Always close the DataSource when your Express server stops to release database connections.

---

## 🎯 Interview Questions: Connection & Security

### Q1: Why is `rejectUnauthorized: false` commonly used, and is it safe?

**Answer:**

It is commonly used because many managed database providers (like Heroku) use self-signed certificates that don't match the public CA store of the server. 
It is **safe only if** your Express server and the database are communicating over a secure, private VPC where external interception is impossible. In a truly public environment, you should always set it to `true` and provide the specific **CA certificate** from your provider.

### Q2: How does TypeORM manage a connection pool behind the scenes?

**Answer:**

TypeORM uses the `pg` (node-postgres) driver under the hood for PostgreSQL. When you initialize a `DataSource`, it creates a **Pool**. The pool maintains a set of open connections that are reused for every query. This is much faster than opening a new connection for every HTTP request. You can tune this pool via the `extra` object in your TypeORM configuration.

### Q3: What is the advantage of using a Connection URI over discrete variables?

**Answer:**

A Connection URI is **standardized**. Almost every tool (CLI tools, GUI clients, cloud providers) understands the `postgresql://` format. It reduces the number of environment variables you need to manage and makes the configuration less error-prone when moving between different environments.

---

## Summary

1. **Connection URIs** provide a clean, one-line configuration method.
2. **SSL** is mandatory for all production traffic.
3. **rejectUnauthorized** should be handled with caution based on your network architecture.
4. **Environment-dependent config** is the correct way to manage DataSource options in TypeORM.
