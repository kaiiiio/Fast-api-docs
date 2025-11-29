# Encrypting PII at Rest: Complete Security Guide

Protecting Personally Identifiable Information (PII) at rest is critical for compliance and security. This guide covers comprehensive encryption strategies for sensitive data.

## Understanding PII Encryption

**What is PII?**
Personally Identifiable Information - data that can identify individuals:
- Names, emails, phone numbers
- Social security numbers
- Credit card numbers
- Addresses
- Biometric data

**Why encrypt at rest?**
- Compliance requirements (GDPR, HIPAA, PCI-DSS)
- Protect against data breaches
- Defense in depth security
- Legal obligations

## Step 1: Field-Level Encryption

### Using Fernet (Symmetric Encryption)

```python
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
import base64
import os

class EncryptionService:
    """Service for encrypting/decrypting data."""
    
    def __init__(self, key: Optional[bytes] = None):
        if key is None:
            key = self._generate_key()
        self.cipher = Fernet(key)
    
    @staticmethod
    def _generate_key() -> bytes:
        """Generate encryption key."""
        return Fernet.generate_key()
    
    @staticmethod
    def derive_key_from_password(password: str, salt: bytes) -> bytes:
        """Derive key from password (for user-specific encryption)."""
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
            backend=default_backend()
        )
        key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
        return key
    
    def encrypt(self, plaintext: str) -> bytes:
        """Encrypt plaintext."""
        return self.cipher.encrypt(plaintext.encode())
    
    def decrypt(self, ciphertext: bytes) -> str:
        """Decrypt ciphertext."""
        return self.cipher.decrypt(ciphertext).decode()
```

### SQLAlchemy Encrypted Type

```python
from sqlalchemy.types import TypeDecorator, LargeBinary

class EncryptedString(TypeDecorator):
    """SQLAlchemy type for automatically encrypted strings."""
    
    impl = LargeBinary
    cache_ok = True
    
    def __init__(self, encryption_service: EncryptionService, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.encryption_service = encryption_service
    
    def process_bind_param(self, value: Optional[str], dialect) -> Optional[bytes]:
        """Encrypt value before storing in database."""
        if value is not None:
            return self.encryption_service.encrypt(value)
        return None
    
    def process_result_value(self, value: Optional[bytes], dialect) -> Optional[str]:
        """Decrypt value when reading from database."""
        if value is not None:
            return self.encryption_service.decrypt(value)
        return None

# Initialize encryption service (singleton)
encryption_service = EncryptionService(key=os.getenv("ENCRYPTION_KEY").encode())

# Use in models
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    username = Column(String(100))
    
    # Encrypted fields
    email = Column(EncryptedString(encryption_service))  # Automatically encrypted
    phone = Column(EncryptedString(encryption_service))
    ssn = Column(EncryptedString(encryption_service))
```

## Step 2: Database-Level Encryption

### PostgreSQL Transparent Data Encryption

```python
# PostgreSQL supports encryption at multiple levels:
# 1. Tablespace encryption
# 2. Column-level encryption (using pgcrypto extension)

from sqlalchemy import text

# Enable pgcrypto extension
await db.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto"))

# Encrypt data using SQL
class UserRepository:
    async def create_user_encrypted(self, user_data: dict):
        """Create user with database-level encryption."""
        stmt = text("""
            INSERT INTO users (username, email, phone)
            VALUES (
                :username,
                pgp_sym_encrypt(:email, :encryption_key),
                pgp_sym_encrypt(:phone, :encryption_key)
            )
            RETURNING id
        """)
        
        result = await db.execute(stmt, {
            "username": user_data["username"],
            "email": user_data["email"],
            "phone": user_data["phone"],
            "encryption_key": os.getenv("PG_ENCRYPTION_KEY")
        })
        
        return result.scalar()
    
    async def get_user_encrypted(self, user_id: int):
        """Get user with automatic decryption."""
        stmt = text("""
            SELECT 
                id,
                username,
                pgp_sym_decrypt(email::bytea, :encryption_key) as email,
                pgp_sym_decrypt(phone::bytea, :encryption_key) as phone
            FROM users
            WHERE id = :user_id
        """)
        
        result = await db.execute(stmt, {
            "user_id": user_id,
            "encryption_key": os.getenv("PG_ENCRYPTION_KEY")
        })
        
        return result.fetchone()
```

## Step 3: Key Management

### Secure Key Storage

```python
from pydantic_settings import BaseSettings

class EncryptionSettings(BaseSettings):
    """Encryption configuration."""
    
    encryption_key: str  # From environment or secrets manager
    key_rotation_enabled: bool = False
    key_rotation_interval_days: int = 90
    
    class Config:
        env_file = ".env"
        env_prefix = "ENCRYPTION_"

# AWS KMS Integration
import boto3

class AWSKMSEncryption:
    """Encryption using AWS KMS."""
    
    def __init__(self, kms_key_id: str):
        self.kms_client = boto3.client("kms")
        self.key_id = kms_key_id
    
    def encrypt(self, plaintext: str) -> bytes:
        """Encrypt using AWS KMS."""
        response = self.kms_client.encrypt(
            KeyId=self.key_id,
            Plaintext=plaintext.encode()
        )
        return response["CiphertextBlob"]
    
    def decrypt(self, ciphertext: bytes) -> str:
        """Decrypt using AWS KMS."""
        response = self.kms_client.decrypt(
            CiphertextBlob=ciphertext
        )
        return response["Plaintext"].decode()

# HashiCorp Vault Integration
import hvac

class VaultEncryption:
    """Encryption using HashiCorp Vault."""
    
    def __init__(self, vault_url: str, vault_token: str, transit_path: str = "transit"):
        self.client = hvac.Client(url=vault_url, token=vault_token)
        self.transit_path = transit_path
    
    def encrypt(self, plaintext: str, key_name: str) -> str:
        """Encrypt using Vault Transit."""
        response = self.client.secrets.transit.encrypt_data(
            name=key_name,
            plaintext=base64.b64encode(plaintext.encode()).decode()
        )
        return response["data"]["ciphertext"]
    
    def decrypt(self, ciphertext: str, key_name: str) -> str:
        """Decrypt using Vault Transit."""
        response = self.client.secrets.transit.decrypt_data(
            name=key_name,
            ciphertext=ciphertext
        )
        return base64.b64decode(response["data"]["plaintext"]).decode()
```

## Step 4: Encrypted Model Pattern

### Complete Encrypted User Model

```python
class User(Base):
    """User model with encrypted PII."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    username = Column(String(100), unique=True, nullable=False)
    
    # Encrypted fields (stored as binary)
    _email_encrypted = Column(LargeBinary, name="email")
    _phone_encrypted = Column(LargeBinary, name="phone")
    _ssn_encrypted = Column(LargeBinary, name="ssn")
    
    # Non-sensitive fields (not encrypted)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    @property
    def email(self) -> Optional[str]:
        """Decrypt email when accessed."""
        if self._email_encrypted:
            return encryption_service.decrypt(self._email_encrypted)
        return None
    
    @email.setter
    def email(self, value: Optional[str]):
        """Encrypt email when set."""
        if value:
            self._email_encrypted = encryption_service.encrypt(value)
        else:
            self._email_encrypted = None
    
    @property
    def phone(self) -> Optional[str]:
        """Decrypt phone when accessed."""
        if self._phone_encrypted:
            return encryption_service.decrypt(self._phone_encrypted)
        return None
    
    @phone.setter
    def phone(self, value: Optional[str]):
        """Encrypt phone when set."""
        if value:
            self._phone_encrypted = encryption_service.encrypt(value)
        else:
            self._phone_encrypted = None

# Usage
user = User(username="john_doe")
user.email = "john@example.com"  # Automatically encrypted
user.phone = "+1234567890"  # Automatically encrypted

await db.commit()

# Reading automatically decrypts
email = user.email  # Automatically decrypted
```

## Step 5: Search on Encrypted Data

### Deterministic Encryption for Search

```python
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import os

class DeterministicEncryption:
    """Deterministic encryption - same plaintext = same ciphertext (for search)."""
    
    def __init__(self, key: bytes):
        self.key = key
    
    def encrypt(self, plaintext: str) -> bytes:
        """Encrypt with deterministic encryption."""
        # Use AES-GCM with fixed nonce (not recommended for general use)
        # Better: Use searchable encryption schemes
        aesgcm = AESGCM(self.key)
        nonce = os.urandom(12)
        ciphertext = aesgcm.encrypt(nonce, plaintext.encode(), None)
        return nonce + ciphertext
    
    def encrypt_searchable(self, plaintext: str) -> str:
        """Encrypt for searchability (hash-based approach)."""
        # Hash for exact match search
        hash_value = hashlib.sha256(plaintext.encode()).hexdigest()
        return hash_value
    
    def search_hash(self, plaintext: str) -> str:
        """Get search hash for query."""
        return hashlib.sha256(plaintext.encode()).hexdigest()

# Store both encrypted and searchable hash
class User(Base):
    email_encrypted = Column(LargeBinary)  # Encrypted
    email_search_hash = Column(String(64), index=True)  # For searching

# Create user
user.email = "user@example.com"  # Sets email_encrypted
user.email_search_hash = deterministic_encryption.search_hash("user@example.com")

# Search
search_hash = deterministic_encryption.search_hash("user@example.com")
user = await db.execute(
    select(User).where(User.email_search_hash == search_hash)
)
```

## Step 6: Key Rotation

### Rotating Encryption Keys

```python
class KeyRotationService:
    """Service for rotating encryption keys."""
    
    def __init__(self, old_key: bytes, new_key: bytes):
        self.old_cipher = Fernet(old_key)
        self.new_cipher = Fernet(new_key)
    
    async def rotate_user_data(self, user: User):
        """Re-encrypt user data with new key."""
        # Decrypt with old key
        old_email = self.old_cipher.decrypt(user._email_encrypted).decode()
        old_phone = self.old_cipher.decrypt(user._phone_encrypted).decode()
        
        # Encrypt with new key
        user._email_encrypted = self.new_cipher.encrypt(old_email.encode())
        user._phone_encrypted = self.new_cipher.encrypt(old_phone.encode())
        
        await db.commit()
    
    async def bulk_rotate(self, batch_size: int = 100):
        """Rotate keys for all users in batches."""
        offset = 0
        
        while True:
            users = await db.execute(
                select(User)
                .where(User._email_encrypted.isnot(None))
                .limit(batch_size)
                .offset(offset)
            )
            
            user_list = users.scalars().all()
            if not user_list:
                break
            
            for user in user_list:
                await self.rotate_user_data(user)
            
            offset += batch_size
```

## Step 7: Compliance and Audit

### Audit Logging for PII Access

```python
class PIIAccessLog(Base):
    """Log all PII access for compliance."""
    __tablename__ = "pii_access_logs"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, index=True)  # Whose PII was accessed
    accessed_by = Column(Integer, index=True)  # Who accessed it
    access_type = Column(String(50))  # 'read', 'update', 'delete'
    fields_accessed = Column(JSON)  # Which fields: ['email', 'phone']
    reason = Column(Text)  # Why accessed
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    ip_address = Column(String(45))
    
    __table_args__ = (
        Index('idx_pii_logs_user_timestamp', 'user_id', 'timestamp'),
    )

def audit_pii_access(
    user_id: int,
    accessed_by: int,
    access_type: str,
    fields: List[str],
    reason: str,
    ip_address: Optional[str] = None
):
    """Log PII access for audit trail."""
    log_entry = PIIAccessLog(
        user_id=user_id,
        accessed_by=accessed_by,
        access_type=access_type,
        fields_accessed=fields,
        reason=reason,
        ip_address=ip_address
    )
    
    db.add(log_entry)
    await db.commit()
```

## Best Practices

1. **✅ Encrypt sensitive fields**: Email, phone, SSN, etc.
2. **✅ Secure key storage**: Use secrets manager, never hardcode
3. **✅ Key rotation**: Rotate keys periodically
4. **✅ Audit logging**: Track all PII access
5. **✅ Access control**: Limit who can decrypt data
6. **✅ Minimize PII**: Only collect what you need

## Summary

PII encryption at rest provides:
- ✅ Compliance with regulations
- ✅ Protection against breaches
- ✅ Defense in depth security
- ✅ Audit trail capabilities

Implement comprehensive PII encryption for production systems!
