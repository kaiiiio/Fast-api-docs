# Encrypting PII at Rest: Protecting Sensitive Data

Encrypting Personally Identifiable Information (PII) at rest protects sensitive data stored in databases. This guide covers encrypting PII in Express.js applications.

## What is PII?

**PII** includes:
- Email addresses
- Phone numbers
- Social security numbers
- Credit card numbers
- Addresses

## Encryption Approaches

### Field-Level Encryption

```javascript
const crypto = require('crypto');

// Encryption key (store in environment)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-gcm';

// Encrypt function
function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
    };
}

// Decrypt function
function decrypt(encryptedData) {
    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        Buffer.from(ENCRYPTION_KEY, 'hex'),
        Buffer.from(encryptedData.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}
```

## Real-World Examples

### Example 1: Encrypted User Model

```javascript
const { Sequelize, DataTypes } = require('sequelize');

// Custom encrypted data type
class EncryptedString extends DataTypes.STRING {
    static parse(value) {
        if (!value) return null;
        if (typeof value === 'string') {
            try {
                return decrypt(JSON.parse(value));
            } catch {
                return value;  // Fallback for unencrypted data
            }
        }
        return value;
    }
}

const User = sequelize.define('User', {
    email: {
        type: EncryptedString,
        allowNull: false
    },
    phone: {
        type: EncryptedString,
        allowNull: true
    },
    ssn: {
        type: EncryptedString,
        allowNull: true
    }
}, {
    hooks: {
        beforeCreate: (user) => {
            if (user.email) {
                user.email = JSON.stringify(encrypt(user.email));
            }
            if (user.phone) {
                user.phone = JSON.stringify(encrypt(user.phone));
            }
            if (user.ssn) {
                user.ssn = JSON.stringify(encrypt(user.ssn));
            }
        },
        beforeUpdate: (user) => {
            // Re-encrypt if changed
            if (user.changed('email')) {
                user.email = JSON.stringify(encrypt(user.email));
            }
            if (user.changed('phone')) {
                user.phone = JSON.stringify(encrypt(user.phone));
            }
            if (user.changed('ssn')) {
                user.ssn = JSON.stringify(encrypt(user.ssn));
            }
        }
    }
});
```

### Example 2: Using Fernet (Symmetric Encryption)

```javascript
const fernet = require('fernet');
const secret = new fernet.Secret(process.env.ENCRYPTION_KEY);
const token = new fernet.Token({
    secret: secret,
    time: Date.now(),
    iv: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
});

// Encrypt
function encryptPII(data) {
    return token.encode(data);
}

// Decrypt
function decryptPII(encrypted) {
    return token.decode(encrypted);
}

// Use in model
const User = sequelize.define('User', {
    email: DataTypes.STRING,
    encrypted_email: DataTypes.TEXT
}, {
    getterMethods: {
        email() {
            if (this.encrypted_email) {
                return decryptPII(this.encrypted_email);
            }
            return this.getDataValue('email');
        }
    },
    setterMethods: {
        email(value) {
            this.setDataValue('encrypted_email', encryptPII(value));
        }
    }
});
```

## Database-Level Encryption

### PostgreSQL pgcrypto

```javascript
// Encrypt at database level
await sequelize.query(`
    INSERT INTO users (email, encrypted_email)
    VALUES (
        :email,
        pgp_sym_encrypt(:email, :key)
    )
`, {
    replacements: {
        email: 'user@example.com',
        key: process.env.DB_ENCRYPTION_KEY
    }
});

// Decrypt
const result = await sequelize.query(`
    SELECT 
        id,
        pgp_sym_decrypt(encrypted_email, :key) AS email
    FROM users
    WHERE id = :id
`, {
    replacements: {
        id: userId,
        key: process.env.DB_ENCRYPTION_KEY
    }
});
```

## Best Practices

1. **Key Management**: Store keys securely (AWS KMS, environment variables)
2. **Encrypt Sensitive Fields**: Email, phone, SSN, credit cards
3. **Use Strong Algorithms**: AES-256-GCM, Fernet
4. **Rotate Keys**: Implement key rotation strategy
5. **Audit Access**: Log access to encrypted data

## Summary

**Encrypting PII at Rest:**

1. **Purpose**: Protect sensitive data in databases
2. **Approaches**: Field-level, database-level encryption
3. **Algorithms**: AES-256-GCM, Fernet, pgcrypto
4. **Best Practice**: Secure key management, encrypt sensitive fields
5. **Benefits**: Data protection, compliance

**Key Takeaway:**
Encrypting PII at rest protects sensitive data stored in databases. Use field-level encryption for application-level control or database-level encryption (pgcrypto) for database-managed encryption. Store encryption keys securely (AWS KMS, environment variables). Encrypt sensitive fields like email, phone, SSN, and credit cards. Implement key rotation and audit access.

**Encryption Strategy:**
- Encrypt sensitive fields
- Use strong algorithms
- Secure key management
- Rotate keys
- Audit access

**Next Steps:**
- Learn [Security Best Practices](../09_authentication_and_security/) for comprehensive security
- Study [GDPR Compliance](gdpr_compliance_design.md) for data protection
- Master [Database Security](securing_database_connections.md) for connection security

---

## 🎯 Interview Questions: Encrypting PII at Rest

### Q1: Explain the fundamental difference between "encryption at rest" and "encryption in transit." Why is encrypting PII at rest necessary even when database connections are secured with SSL/TLS?

**Answer:**

**Encryption at Rest vs. Encryption in Transit:**

**Encryption in Transit** protects data while it moves between systems (application → database, client → server). It uses SSL/TLS to encrypt network traffic, preventing interception during transmission. However, once data reaches the database, it is stored in **plaintext** (unless encrypted at rest).

**Encryption at Rest** protects data stored in databases, files, backups, and disk storage. It encrypts data before writing to disk and decrypts when reading. This protects data even if the storage medium is physically accessed or the database is breached.

**Why Both Are Necessary:**

SSL/TLS protects data **during transmission** but does **not protect stored data**. If an attacker gains access to the database (SQL injection, compromised credentials, insider threat, physical access), they can read all data in plaintext. Encryption at rest ensures that even if the database is breached, the data remains encrypted and unusable without the encryption key.

**Attack Scenarios:**

1. **Database Breach**: Attacker gains database access (SQL injection, stolen credentials)
   - Without encryption at rest: All PII readable in plaintext
   - With encryption at rest: Data encrypted, attacker sees only ciphertext

2. **Backup Theft**: Database backups stolen (physical theft, cloud misconfiguration)
   - Without encryption at rest: Backup files contain plaintext PII
   - With encryption at rest: Backup files encrypted, unusable without key

3. **Insider Threat**: Authorized user with database access
   - Without encryption at rest: User can read all PII directly
   - With encryption at rest: User needs encryption key to decrypt (additional security layer)

4. **Physical Access**: Attacker gains physical access to database server
   - Without encryption at rest: Can read database files directly from disk
   - With encryption at rest: Database files encrypted, cannot be read without key

**System Design Consideration**: Encryption at rest and encryption in transit are **complementary security layers**. Encryption in transit protects data during transmission (network attacks), while encryption at rest protects stored data (database breaches, backup theft, physical access). Both are essential for **defense in depth**—multiple security layers ensure that a failure in one layer doesn't expose all data. For PII (personally identifiable information), encryption at rest is often **legally required** (GDPR, HIPAA, PCI-DSS) and is a **best practice** for all sensitive data.

---

### Q2: Explain the difference between "symmetric encryption" and "asymmetric encryption" for encrypting PII at rest. When would you choose each approach, and what are the trade-offs?

**Answer:**

**Symmetric Encryption:**

Symmetric encryption uses the **same key** for both encryption and decryption. The key is shared between the encrypting and decrypting parties. Algorithms include AES (Advanced Encryption Standard), which is the most common for data at rest.

**How It Works:**
- Encryption: `ciphertext = encrypt(plaintext, key)`
- Decryption: `plaintext = decrypt(ciphertext, key)`
- Same key used for both operations

**Asymmetric Encryption:**

Asymmetric encryption uses a **key pair** (public key and private key). Data encrypted with the public key can only be decrypted with the private key. Algorithms include RSA, ECC (Elliptic Curve Cryptography).

**How It Works:**
- Encryption: `ciphertext = encrypt(plaintext, public_key)`
- Decryption: `plaintext = decrypt(ciphertext, private_key)`
- Different keys for encryption and decryption

**Key Differences:**

| Aspect | Symmetric | Asymmetric |
|--------|-----------|------------|
| **Keys** | Single shared key | Key pair (public/private) |
| **Speed** | Fast (efficient algorithms) | Slow (computationally expensive) |
| **Key Distribution** | Challenging (must share secret key) | Easy (public key can be shared) |
| **Use Case** | Bulk data encryption | Key exchange, digital signatures |
| **Algorithm** | AES-256-GCM | RSA-2048, ECC |

**When to Choose Symmetric Encryption:**

Symmetric encryption is the **standard choice** for encrypting PII at rest because:
1. **Performance**: Much faster than asymmetric encryption (suitable for large volumes of data)
2. **Efficiency**: Lower CPU usage, better for high-throughput applications
3. **Standard Practice**: AES-256-GCM is the industry standard for data at rest

**When to Choose Asymmetric Encryption:**

Asymmetric encryption is used for **key management**, not direct data encryption:
1. **Key Encryption**: Encrypt symmetric keys with asymmetric encryption (hybrid approach)
2. **Key Exchange**: Securely share encryption keys without exposing them
3. **Digital Signatures**: Verify data integrity and authenticity

**Hybrid Approach (Best Practice):**

Most production systems use a **hybrid approach**: asymmetric encryption to protect symmetric keys, symmetric encryption to protect data.

```
Data Encryption Flow:
1. Generate symmetric key (AES-256)
2. Encrypt PII with symmetric key → Fast encryption
3. Encrypt symmetric key with public key (RSA) → Secure key storage
4. Store: encrypted_data + encrypted_key

Decryption Flow:
1. Decrypt symmetric key with private key (RSA)
2. Decrypt data with symmetric key (AES) → Fast decryption
```

**Trade-offs:**

**Symmetric Encryption:**
- **Pros**: Fast, efficient, industry standard
- **Cons**: Key management challenge (must securely store and share key)

**Asymmetric Encryption:**
- **Pros**: Secure key distribution, no shared secret
- **Cons**: Slow, computationally expensive, not suitable for bulk data

**System Design Consideration**: For encrypting PII at rest, use **symmetric encryption (AES-256-GCM)** for data encryption due to performance and efficiency. Use **asymmetric encryption (RSA/ECC)** for key management (encrypting symmetric keys) to solve the key distribution problem. The hybrid approach provides the **best of both worlds**: fast data encryption with secure key management. This is the standard pattern used by cloud providers (AWS KMS, Azure Key Vault) and encryption libraries.

---

### Q3: Explain the concept of "key management" in the context of encrypting PII at rest. What are the security risks of poor key management, and how would you implement secure key management in an Express.js application?

**Answer:**

**Key Management:**

Key management involves generating, storing, rotating, and protecting encryption keys. The security of encrypted data depends entirely on key security—if keys are compromised, all encrypted data can be decrypted.

**Security Risks of Poor Key Management:**

1. **Key Storage in Code**: Keys hardcoded in application code
   - Risk: Keys exposed in version control, code reviews, deployment artifacts
   - Impact: Anyone with code access can decrypt all data

2. **Key Storage in Database**: Keys stored in same database as encrypted data
   - Risk: Database breach exposes both encrypted data and keys
   - Impact: Attacker can decrypt all data immediately

3. **Key Sharing**: Keys shared via insecure channels (email, Slack, plaintext files)
   - Risk: Keys intercepted during transmission
   - Impact: Attacker gains key, can decrypt data

4. **No Key Rotation**: Keys never changed
   - Risk: Long-lived keys increase exposure window
   - Impact: If key compromised, all historical data remains decryptable

5. **Key Loss**: Keys not backed up or lost
   - Risk: Cannot decrypt data if key is lost
   - Impact: Permanent data loss (encrypted data is unrecoverable)

**Secure Key Management Implementation:**

**1. Key Management Service (KMS):**

Use a dedicated key management service (AWS KMS, Azure Key Vault, HashiCorp Vault) that handles key generation, storage, rotation, and access control.

```javascript
// AWS KMS example
const AWS = require('aws-sdk');
const kms = new AWS.KMS({ region: 'us-east-1' });

// Encrypt data
async function encryptPII(data, keyId) {
    const result = await kms.encrypt({
        KeyId: keyId,
        Plaintext: data
    }).promise();
    
    return result.CiphertextBlob.toString('base64');
}

// Decrypt data
async function decryptPII(encryptedData) {
    const result = await kms.decrypt({
        CiphertextBlob: Buffer.from(encryptedData, 'base64')
    }).promise();
    
    return result.Plaintext.toString('utf8');
}
```

**2. Environment Variables (Development):**

For development, store keys in environment variables (never in code).

```javascript
// .env file (never commit to Git)
ENCRYPTION_KEY=your-32-byte-key-here

// Load key
const encryptionKey = process.env.ENCRYPTION_KEY;
if (!encryptionKey || encryptionKey.length !== 64) {  // 32 bytes = 64 hex chars
    throw new Error('Invalid encryption key');
}
```

**3. Key Rotation:**

Implement key rotation to limit exposure window and comply with security policies.

```javascript
// Key rotation strategy
class KeyManager {
    constructor() {
        this.currentKeyId = process.env.CURRENT_KEY_ID;
        this.previousKeyIds = process.env.PREVIOUS_KEY_IDS?.split(',') || [];
    }
    
    async encrypt(data) {
        // Use current key for encryption
        return await this.encryptWithKey(data, this.currentKeyId);
    }
    
    async decrypt(encryptedData, keyId) {
        // Try current key first
        try {
            return await this.decryptWithKey(encryptedData, this.currentKeyId);
        } catch (error) {
            // Try previous keys (for data encrypted with old keys)
            for (const oldKeyId of this.previousKeyIds) {
                try {
                    return await this.decryptWithKey(encryptedData, oldKeyId);
                } catch (e) {
                    continue;
                }
            }
            throw error;
        }
    }
    
    async rotateKey() {
        // Generate new key
        const newKeyId = await this.generateNewKey();
        
        // Update environment
        this.previousKeyIds.push(this.currentKeyId);
        this.currentKeyId = newKeyId;
        
        // Re-encrypt all data with new key (background job)
        await this.reencryptAllData();
    }
}
```

**4. Key Access Control:**

Limit who can access encryption keys (principle of least privilege).

```javascript
// IAM roles for key access
// Application role: Can encrypt/decrypt
// Admin role: Can rotate keys
// Auditor role: Can view key metadata (not decrypt)

// Key access logging
async function encryptWithAudit(data, userId) {
    const encrypted = await encryptPII(data);
    
    // Log key access
    await AuditLog.create({
        action: 'encrypt',
        user_id: userId,
        timestamp: new Date()
    });
    
    return encrypted;
}
```

**5. Key Backup and Recovery:**

Backup keys securely (encrypted, in separate location) for disaster recovery.

```javascript
// Key backup (encrypted, stored separately)
async function backupKey(keyId) {
    const key = await kms.getKey(keyId);
    
    // Encrypt backup with separate key
    const backup = encrypt(key, backupEncryptionKey);
    
    // Store in separate secure location (different region, different account)
    await storeBackup(backup);
}
```

**System Design Consideration**: Key management is the **most critical aspect** of encryption at rest. Poor key management negates all encryption benefits (if keys are compromised, data is compromised). Use **dedicated key management services** (AWS KMS, Vault) that handle key generation, storage, rotation, and access control. Never store keys in code, databases, or plaintext files. Implement **key rotation** to limit exposure window and **key backup** for disaster recovery. Key management is often more complex than encryption itself, so use managed services when possible.

---

### Q4: Explain the difference between "field-level encryption" and "database-level encryption" for PII. What are the advantages and disadvantages of each approach, and when would you choose one over the other?

**Answer:**

**Field-Level Encryption:**

Field-level encryption encrypts **individual fields** (columns) at the application level before storing in the database. The application handles encryption/decryption, and the database stores encrypted values.

**How It Works:**
- Application encrypts PII before database insert
- Database stores encrypted values (ciphertext)
- Application decrypts when reading from database

**Database-Level Encryption:**

Database-level encryption encrypts **entire database files** or **tables** at the storage level. The database engine handles encryption/decryption transparently, and the application works with plaintext.

**How It Works:**
- Database engine encrypts data before writing to disk
- Application sends/receives plaintext (database handles encryption)
- Database decrypts when reading from disk

**Key Differences:**

| Aspect | Field-Level | Database-Level |
|--------|-------------|----------------|
| **Granularity** | Per-field (selective encryption) | Entire database/tables |
| **Control** | Application controls what to encrypt | Database controls encryption |
| **Performance** | Application overhead (encrypt/decrypt per field) | Database overhead (transparent to app) |
| **Querying** | Cannot query encrypted fields (must decrypt first) | Can query (database handles encryption) |
| **Flexibility** | Choose which fields to encrypt | All-or-nothing |
| **Key Management** | Application manages keys | Database manages keys |

**Advantages of Field-Level Encryption:**

1. **Selective Encryption**: Encrypt only sensitive fields (email, SSN), not all data
2. **Application Control**: Application decides what to encrypt and when
3. **Key Management**: Application controls encryption keys (can use KMS)
4. **Compliance**: Fine-grained control for compliance requirements (encrypt PII, not metadata)

**Disadvantages of Field-Level Encryption:**

1. **Performance Overhead**: Encryption/decryption on every read/write
2. **Query Limitations**: Cannot search, filter, or index encrypted fields
3. **Application Complexity**: Application must handle encryption logic
4. **Key Management**: Application responsible for key security

**Advantages of Database-Level Encryption:**

1. **Transparent**: Application doesn't need encryption logic
2. **Query Support**: Can query encrypted data (database handles encryption)
3. **Performance**: Database-optimized encryption (may be faster)
4. **Simplicity**: No application code changes needed

**Disadvantages of Database-Level Encryption:**

1. **All-or-Nothing**: Encrypts entire database (cannot selectively encrypt)
2. **Key Management**: Database manages keys (less control)
3. **Compliance**: May encrypt non-sensitive data unnecessarily
4. **Vendor Lock-in**: Database-specific encryption features

**When to Choose Field-Level Encryption:**

- **Selective Encryption**: Only some fields contain PII (email, phone, SSN)
- **Compliance Requirements**: Need fine-grained control (encrypt PII, not metadata)
- **Key Management Control**: Want application-level key management (KMS integration)
- **Multi-Database**: Support multiple database types (encryption logic in application)

**When to Choose Database-Level Encryption:**

- **Full Database Encryption**: All data is sensitive (healthcare, financial)
- **Simplicity**: Want transparent encryption (no application changes)
- **Query Requirements**: Need to search/filter encrypted fields
- **Database Features**: Database provides advanced encryption features (TDE, column-level encryption)

**Hybrid Approach (Best Practice):**

Many systems use **both**: database-level encryption for general data protection, field-level encryption for highly sensitive PII.

```javascript
// Field-level encryption for PII
const User = sequelize.define('User', {
    id: DataTypes.INTEGER,
    email: {
        type: EncryptedString,  // Field-level encryption
        allowNull: false
    },
    name: DataTypes.STRING,  // Not encrypted (non-sensitive)
    created_at: DataTypes.DATE  // Not encrypted (metadata)
});

// Database-level encryption (TDE) protects entire database files
// Field-level encryption provides additional layer for PII
```

**System Design Consideration**: Choose **field-level encryption** when you need **selective encryption** (only PII fields) and **application control** over key management. Choose **database-level encryption** when you need **transparent encryption** (no application changes) and **query support** for encrypted data. For maximum security, use **both**: database-level encryption for general protection, field-level encryption for highly sensitive PII. The choice depends on **compliance requirements**, **performance needs**, and **query patterns**.

---

### Q5: How would you implement encryption key rotation for PII at rest in a production Express.js application? Explain the challenges and provide a strategy for seamless key rotation without downtime.

**Answer:**

**Key Rotation:**

Key rotation is the process of replacing old encryption keys with new keys. It's essential for security because it limits the exposure window—if a key is compromised, only data encrypted with that key is at risk. Regular rotation (e.g., annually) reduces long-term risk.

**Challenges:**

1. **Data Re-encryption**: All existing encrypted data must be re-encrypted with new key
2. **Downtime**: Re-encryption process may require application downtime
3. **Dual Key Support**: Application must support both old and new keys during transition
4. **Performance Impact**: Re-encryption is CPU-intensive and time-consuming
5. **Data Consistency**: Ensure no data loss during re-encryption

**Seamless Key Rotation Strategy:**

**1. Key Versioning:**

Store key version with encrypted data to support multiple keys simultaneously.

```javascript
// Encrypted data structure
{
    version: 2,  // Key version
    data: "encrypted_ciphertext_here"
}

// Key manager with version support
class KeyManager {
    constructor() {
        this.keys = {
            1: process.env.ENCRYPTION_KEY_V1,  // Old key
            2: process.env.ENCRYPTION_KEY_V2   // Current key
        };
        this.currentVersion = 2;
    }
    
    async encrypt(data) {
        const encrypted = await this.encryptWithKey(data, this.keys[this.currentVersion]);
        return {
            version: this.currentVersion,
            data: encrypted
        };
    }
    
    async decrypt(encryptedData) {
        const version = encryptedData.version || 1;  // Default to version 1 for legacy data
        const key = this.keys[version];
        
        if (!key) {
            throw new Error(`Key version ${version} not found`);
        }
        
        return await this.decryptWithKey(encryptedData.data, key);
    }
}
```

**2. Background Re-encryption:**

Re-encrypt data in background without blocking application operations.

```javascript
// Re-encryption job
async function reencryptAllData() {
    const batchSize = 100;
    let offset = 0;
    
    while (true) {
        // Fetch batch of encrypted records
        const records = await User.findAll({
            where: {
                email_encrypted_version: { [Op.lt]: currentKeyVersion }
            },
            limit: batchSize,
            offset: offset
        });
        
        if (records.length === 0) {
            break;  // All data re-encrypted
        }
        
        // Re-encrypt each record
        for (const record of records) {
            const transaction = await sequelize.transaction();
            
            try {
                // Decrypt with old key
                const decrypted = await keyManager.decrypt({
                    version: record.email_encrypted_version,
                    data: record.email_encrypted
                });
                
                // Encrypt with new key
                const reencrypted = await keyManager.encrypt(decrypted);
                
                // Update record
                await record.update({
                    email_encrypted: reencrypted.data,
                    email_encrypted_version: reencrypted.version
                }, { transaction });
                
                await transaction.commit();
            } catch (error) {
                await transaction.rollback();
                console.error(`Failed to re-encrypt record ${record.id}:`, error);
            }
        }
        
        offset += batchSize;
    }
}
```

**3. Gradual Migration:**

Support both old and new keys during migration period.

```javascript
// Encryption with automatic re-encryption on read
async function getDecryptedEmail(userId) {
    const user = await User.findByPk(userId);
    
    // Decrypt (supports both old and new keys)
    const email = await keyManager.decrypt({
        version: user.email_encrypted_version,
        data: user.email_encrypted
    });
    
    // If using old key, re-encrypt with new key (lazy re-encryption)
    if (user.email_encrypted_version < keyManager.currentVersion) {
        const reencrypted = await keyManager.encrypt(email);
        await user.update({
            email_encrypted: reencrypted.data,
            email_encrypted_version: reencrypted.version
        });
    }
    
    return email;
}
```

**4. Key Rotation Schedule:**

Plan rotation during low-traffic periods to minimize performance impact.

```javascript
// Scheduled key rotation
const cron = require('node-cron');

// Rotate keys annually (during maintenance window)
cron.schedule('0 2 * * 0', async () => {  // Sunday 2 AM
    console.log('Starting key rotation...');
    
    // 1. Generate new key
    const newKeyVersion = keyManager.currentVersion + 1;
    const newKey = await generateNewKey();
    keyManager.keys[newKeyVersion] = newKey;
    keyManager.currentVersion = newKeyVersion;
    
    // 2. Start background re-encryption
    await reencryptAllData();
    
    // 3. After re-encryption complete, remove old keys (after grace period)
    setTimeout(() => {
        delete keyManager.keys[newKeyVersion - 1];
    }, 30 * 24 * 60 * 60 * 1000);  // 30 days grace period
});
```

**5. Monitoring and Rollback:**

Monitor re-encryption progress and support rollback if issues occur.

```javascript
// Re-encryption monitoring
async function getReencryptionStatus() {
    const total = await User.count();
    const reencrypted = await User.count({
        where: {
            email_encrypted_version: keyManager.currentVersion
        }
    });
    
    return {
        total,
        reencrypted,
        remaining: total - reencrypted,
        progress: (reencrypted / total) * 100
    };
}

// Rollback support (keep old keys during grace period)
async function rollbackKeyRotation() {
    keyManager.currentVersion = keyManager.currentVersion - 1;
    // Old key still available for decryption
}
```

**System Design Consideration**: Key rotation is **essential for long-term security** but requires careful planning to avoid downtime and data loss. Use **key versioning** to support multiple keys simultaneously, **background re-encryption** to avoid blocking operations, and **gradual migration** with lazy re-encryption. Plan rotation during **low-traffic periods**, **monitor progress**, and maintain **rollback capability** during grace period. Key rotation is a **continuous process** (not one-time), so design the system to support regular rotations without manual intervention.

