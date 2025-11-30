# Encrypting Data at Rest and in Transit: Database Security

Encrypting data at rest and in transit protects sensitive information from unauthorized access. This guide covers encryption strategies for databases.

## Data at Rest vs Data in Transit

### Data at Rest

**Data at rest** is data stored on disk (database files, backups). Encryption protects data if storage is compromised.

### Data in Transit

**Data in transit** is data being transmitted over the network (client to database). Encryption protects data from network interception.

## Encrypting Data at Rest

### Database-Level Encryption

```sql
-- PostgreSQL: Transparent Data Encryption (TDE)
-- Encrypts entire database files
-- Automatic, transparent to applications
```

### Column-Level Encryption

```sql
-- Encrypt specific columns
-- Example: Encrypt PII (Personally Identifiable Information)

-- Using pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt on insert
INSERT INTO users (name, email_encrypted) VALUES
    ('John', pgp_sym_encrypt('john@example.com', 'encryption_key'));

-- Decrypt on select
SELECT 
    name,
    pgp_sym_decrypt(email_encrypted, 'encryption_key') AS email
FROM users;
```

### Application-Level Encryption

```python
# Python: Encrypt before storing
from cryptography.fernet import Fernet

key = Fernet.generate_key()
cipher = Fernet(key)

# Encrypt
encrypted_email = cipher.encrypt(b'user@example.com')

# Store in database
db.execute(
    "INSERT INTO users (email_encrypted) VALUES (%s)",
    (encrypted_email,)
)

# Decrypt when reading
encrypted = db.query("SELECT email_encrypted FROM users WHERE id = 1")
email = cipher.decrypt(encrypted)
```

## Encrypting Data in Transit

### SSL/TLS Connections

```sql
-- PostgreSQL: Require SSL
-- In postgresql.conf:
ssl = on
require_ssl = on

-- Connection string with SSL
postgresql://user:password@host:5432/db?sslmode=require
```

### Connection Encryption

```python
# Python: SSL connection
import psycopg2

conn = psycopg2.connect(
    host='localhost',
    database='mydb',
    user='user',
    password='password',
    sslmode='require'  # Require SSL
)
```

## Real-World Examples

### Example 1: Encrypting PII

```sql
-- Encrypt sensitive user data
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Table with encrypted columns
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email_encrypted BYTEA,  -- Encrypted email
    phone_encrypted BYTEA,   -- Encrypted phone
    ssn_encrypted BYTEA       -- Encrypted SSN
);

-- Insert with encryption
INSERT INTO users (name, email_encrypted, phone_encrypted) VALUES
    (
        'John Doe',
        pgp_sym_encrypt('john@example.com', 'encryption_key'),
        pgp_sym_encrypt('555-1234', 'encryption_key')
    );

-- Query with decryption
SELECT 
    name,
    pgp_sym_decrypt(email_encrypted, 'encryption_key') AS email,
    pgp_sym_decrypt(phone_encrypted, 'encryption_key') AS phone
FROM users
WHERE id = 1;
```

### Example 2: Encrypted Backups

```bash
# Encrypted backup
pg_dump mydb | gpg --encrypt --recipient backup@example.com > backup.sql.gpg

# Restore
gpg --decrypt backup.sql.gpg | psql mydb
```

### Example 3: Application-Level Encryption

```python
# Python: Field-level encryption
from cryptography.fernet import Fernet
import os

# Generate key (store securely)
key = os.environ.get('ENCRYPTION_KEY')
cipher = Fernet(key)

class User:
    def __init__(self, name, email):
        self.name = name
        self.email_encrypted = cipher.encrypt(email.encode())
    
    def get_email(self):
        return cipher.decrypt(self.email_encrypted).decode()

# Store encrypted
user = User('John', 'john@example.com')
db.execute(
    "INSERT INTO users (name, email_encrypted) VALUES (%s, %s)",
    (user.name, user.email_encrypted)
)
```

## Key Management

### Environment Variables

```python
# Store encryption key in environment
import os

encryption_key = os.environ.get('ENCRYPTION_KEY')
# Never hardcode keys!
```

### Key Management Services

```python
# AWS KMS example
import boto3

kms = boto3.client('kms')

# Encrypt
response = kms.encrypt(
    KeyId='key-id',
    Plaintext='sensitive-data'
)
encrypted = response['CiphertextBlob']

# Decrypt
response = kms.decrypt(
    CiphertextBlob=encrypted
)
decrypted = response['Plaintext']
```

## Best Practices

1. **Encrypt Sensitive Data**: PII, passwords, financial data
2. **Use SSL/TLS**: Always encrypt connections
3. **Key Management**: Store keys securely (env vars, KMS)
4. **Backup Encryption**: Encrypt database backups
5. **Access Control**: Limit who can decrypt data

## Common Mistakes

### ❌ Hardcoded Keys

```python
# ❌ Bad: Hardcoded encryption key
key = 'my-secret-key-12345'
cipher = Fernet(key)

# ✅ Good: Key from environment
key = os.environ.get('ENCRYPTION_KEY')
cipher = Fernet(key)
```

### ❌ No SSL

```python
# ❌ Bad: Unencrypted connection
conn = psycopg2.connect(
    host='localhost',
    database='mydb',
    user='user',
    password='password'
    # No SSL!
)

# ✅ Good: SSL required
conn = psycopg2.connect(
    host='localhost',
    database='mydb',
    user='user',
    password='password',
    sslmode='require'
)
```

## Summary

**Encrypting Data at Rest and in Transit:**

1. **At Rest**: Encrypt database files, backups, sensitive columns
2. **In Transit**: Use SSL/TLS for connections
3. **Methods**: Database-level, column-level, application-level
4. **Key Management**: Store keys securely (env vars, KMS)
5. **Best Practice**: Encrypt sensitive data, always use SSL

**Key Takeaway:**
Encrypt data at rest (on disk) and in transit (over network) to protect sensitive information. Use database-level encryption for entire databases, column-level encryption for specific sensitive fields, and SSL/TLS for connections. Store encryption keys securely using environment variables or key management services. Never hardcode keys.

**Encryption Strategy:**
- Encrypt sensitive data (PII, passwords, financial)
- Use SSL/TLS for all connections
- Encrypt database backups
- Secure key management
- Limit decryption access

**Next Steps:**
- Learn [Row Level Security](row_level_security.md) for access control
- Study [Database Roles & Permissions](database_roles_permissions.md) for user management
- Master [SQL Injection Prevention](sql_injection_prevention.md) for query security

