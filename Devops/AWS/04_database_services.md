# AWS Database Services: RDS, DynamoDB, and ElastiCache

Choosing and managing the right data store for your application.

## 1. Amazon RDS (Relational Database Service)
**Managed SQL:** PostgreSQL, MySQL, MariaDB, SQL Server, and Oracle.

### Benefits
- **Multi-AZ Deployment:** Automatic failover to a standby instance in another zone.
- **Read Replicas:** Scale "Read" heavy applications by offloading queries.
- **Automated Backups:** Daily snapshots and transaction logs for point-in-time recovery.

### Tips for Developers
- Use **IAM Authentication** if possible instead of password strings.
- Always put RDS in a **Private Subnet** (no direct internet access).
- Monitor `FreeStorageSpace` and `CPUUtilization`.

---

## 2. Amazon DynamoDB
**Serverless NoSQL:** High-performance, key-value, and document database.

### Key Concepts
- **Primary Key:** Partition Key (compulsory) + Sort Key (optional).
- **On-Demand Scaling:** Pay exactly for what you use.
- **Transactions:** Support for ACID transactions across multiple items.

### When to choose DynamoDB?
- You need extreme scale (millions of requests/sec).
- You have simple, well-defined query patterns.
- You want zero operational overhead.

---

## 3. Amazon ElastiCache
**Managed Cache:** Redis or Memcached.

### Use Cases
- **Database Caching:** Cache results of heavy SQL queries to reduce latency.
- **Session Management:** Centralized storage for user sessions.
- **Pub/Sub:** Real-time messaging and notifications.

---

## Summary Checklist
1. **Relational Data?** → RDS (Postgres).
2. **Key-Value Store/Millions of Users?** → DynamoDB.
3. **Speed up Queries?** → ElastiCache (Redis).
