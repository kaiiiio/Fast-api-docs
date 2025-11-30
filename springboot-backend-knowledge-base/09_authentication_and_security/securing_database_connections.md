# Securing Database Connections

## 1. The Basics

- **Never** expose DB port (5432) to the public internet.
- Use a **Firewall** (Security Group) to allow access ONLY from the App Server IP.

---

## 2. TLS/SSL Encryption

Data in transit must be encrypted.
By default, JDBC might connect in cleartext.

**PostgreSQL**:
```properties
spring.datasource.url=jdbc:postgresql://db-host:5432/mydb?sslmode=verify-full&sslrootcert=root.crt
```

- `sslmode=require`: Encrypts data.
- `sslmode=verify-full`: Encrypts + Verifies Server Identity (Prevents Man-in-the-Middle).

---

## 3. Credential Rotation (Spring Cloud Vault)

Don't hardcode passwords.
Use **Dynamic Secrets**.

1.  App connects to Vault.
2.  Vault creates a *temporary* DB user (`user_abc123`) valid for 1 hour.
3.  App uses this user.
4.  After 1 hour, Vault deletes the user and gives a new one.

**Spring Cloud Vault Config**:
```properties
spring.cloud.vault.database.enabled=true
spring.cloud.vault.database.role=my-app-role
```

---

## 4. IAM Authentication (AWS RDS)

If running on AWS, don't use passwords at all. Use **IAM Roles**.

1.  App Pod has an IAM Role.
2.  RDS allows that IAM Role to connect.
3.  JDBC Driver generates a temporary auth token using the AWS SDK.

```java
// Requires AWS JDBC Driver wrapper
spring.datasource.driver-class-name=software.amazon.jdbc.Driver
spring.datasource.url=jdbc:aws-wrapper:postgresql://...
```
