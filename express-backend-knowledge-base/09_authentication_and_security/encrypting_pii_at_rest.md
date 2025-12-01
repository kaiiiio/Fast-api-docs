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

