# Password Hashing Best Practices

Storing passwords securely is non-negotiable. This guide teaches you password hashing from basics to advanced security practices.

## Why Hash Passwords?

**Never store plaintext passwords!**

**The problem:**
```python
# ❌ NEVER DO THIS: Plaintext passwords are a security disaster.
user.password = "myPassword123"  # Stored as plaintext
# If database is breached, all passwords are exposed
```

**The solution:** Hash passwords - one-way encryption that can't be reversed. Even if database is breached, attackers can't get original passwords.

## Understanding Password Hashing

**What is hashing?** One-way function that converts password → hash. Can't reverse hash → password.

**How it works:** "myPassword123" → hash function → "a8f5f167f44f4964e6c998dee827110c"

**Verification:** Login attempt: "myPassword123" → Hash it → Compare with stored hash → Match = correct password

## Step 1: Using bcrypt

bcrypt is the industry standard for password hashing:

```python
from passlib.context import CryptContext

# Create password hashing context: bcrypt is industry standard.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# hash_password: Creates one-way hash (can't reverse, secure).
def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.
    
    Example:
        hashed = hash_password("myPassword123")
        # Returns: "$2b$12$..." (includes salt automatically)
    """
    return pwd_context.hash(password)

# verify_password: Compares plain password with hash (secure comparison).
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash.
    
    Example:
        is_valid = verify_password("myPassword123", stored_hash)
    """
    return pwd_context.verify(plain_password, hashed_password)
```

**Understanding bcrypt:** Automatically generates salt (prevents rainbow table attacks), configurable rounds (how many times to hash), and slow by design (prevents brute force).

## Step 2: Complete Authentication Flow

Let's build a complete password system:

```python
from sqlalchemy import Column, String
from app.db.base import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True)
    
    # Store hashed password, not plaintext: Never store original password.
    hashed_password = Column(String(255), nullable=False)

# User registration
async def register_user(
    email: str,
    password: str,
    db: AsyncSession
):
    """Register a new user with hashed password."""
    # Check if email exists
    existing = await db.execute(
        select(User).where(User.email == email)
    )
    if existing.scalar_one_or_none():
        raise ValueError("Email already registered")
    
    # Hash password: Convert plaintext to secure hash.
    hashed = hash_password(password)
    
    # Create user: Store hash, never plaintext!
    user = User(
        email=email,
        hashed_password=hashed  # Store hash, not plaintext!
    )
    
    db.add(user)
    await db.commit()
    
    return user

# User login
async def authenticate_user(
    email: str,
    password: str,
    db: AsyncSession
) -> Optional[User]:
    """Authenticate user by email and password."""
    # Find user
    result = await db.execute(
        select(User).where(User.email == email)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        return None
    
    # Verify password: Compare plain password with stored hash.
    if not verify_password(password, user.hashed_password):
        return None  # Password doesn't match
    
    return user
```

## Step 3: Password Requirements

Enforce strong passwords:

```python
import re

class PasswordValidator:
    """Validate password strength."""
    
    MIN_LENGTH = 8
    REQUIRE_UPPERCASE = True
    REQUIRE_LOWERCASE = True
    REQUIRE_DIGIT = True
    REQUIRE_SPECIAL = True
    
    @classmethod
    def validate(cls, password: str) -> tuple[bool, str]:
        """
        Validate password meets requirements.
        
        Returns:
            (is_valid, error_message)
        """
        if len(password) < cls.MIN_LENGTH:
            return False, f"Password must be at least {cls.MIN_LENGTH} characters"
        
        if cls.REQUIRE_UPPERCASE and not re.search(r'[A-Z]', password):
            return False, "Password must contain uppercase letter"
        
        if cls.REQUIRE_LOWERCASE and not re.search(r'[a-z]', password):
            return False, "Password must contain lowercase letter"
        
        if cls.REQUIRE_DIGIT and not re.search(r'\d', password):
            return False, "Password must contain a digit"
        
        if cls.REQUIRE_SPECIAL and not re.search(r'[!@#$%^&*]', password):
            return False, "Password must contain special character"
        
        return True, ""

# Usage
is_valid, error = PasswordValidator.validate("MyP@ssw0rd")
if not is_valid:
    raise ValueError(error)
```

## Step 4: Password Reset Flow

Secure password reset:

```python
import secrets
from datetime import datetime, timedelta

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    token = Column(String(100), unique=True, index=True)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)

async def create_password_reset_token(user_id: int, db: AsyncSession) -> str:
    """Create secure password reset token."""
    # Generate random token
    token = secrets.token_urlsafe(32)
    
    # Store in database
    reset_token = PasswordResetToken(
        user_id=user_id,
        token=token,
        expires_at=datetime.utcnow() + timedelta(hours=1)  # Valid for 1 hour
    )
    
    db.add(reset_token)
    await db.commit()
    
    return token

async def reset_password(
    token: str,
    new_password: str,
    db: AsyncSession
) -> bool:
    """Reset password using token."""
    # Find token
    result = await db.execute(
        select(PasswordResetToken).where(
            PasswordResetToken.token == token,
            PasswordResetToken.used == False,
            PasswordResetToken.expires_at > datetime.utcnow()
        )
    )
    reset_token = result.scalar_one_or_none()
    
    if not reset_token:
        return False
    
    # Hash new password
    hashed = hash_password(new_password)
    
    # Update user password
    user = await db.get(User, reset_token.user_id)
    user.hashed_password = hashed
    
    # Mark token as used
    reset_token.used = True
    
    await db.commit()
    return True
```

## Security Best Practices

1. **Never log passwords** - Even in error logs
2. **Use HTTPS only** - Never send passwords over HTTP
3. **Rate limit login attempts** - Prevent brute force
4. **Use strong hashing** - bcrypt with sufficient rounds
5. **Salt is automatic** - bcrypt handles this

## Summary

Password security essentials:
- ✅ Always hash passwords (never plaintext)
- ✅ Use bcrypt (industry standard)
- ✅ Validate password strength
- ✅ Secure password reset flow
- ✅ Rate limit login attempts

Follow these practices and your users' passwords will be secure!

---

## 🎯 Interview Questions: FastAPI

### Q1: Explain password hashing in FastAPI, including why we hash passwords, how bcrypt works, salt generation, password verification, and security best practices. Provide detailed examples showing a complete password authentication system.

**Answer:**

**Password Hashing Overview:**

Password hashing is the process of converting plaintext passwords into irreversible hash values. It's essential for security because even if a database is breached, attackers cannot retrieve original passwords from hashes.

**Why Hash Passwords:**

**Without Hashing (Plaintext):**
```python
# ❌ Bad: Plaintext passwords are a security disaster
user.password = "myPassword123"  # Stored as plaintext
# If database is breached, all passwords are exposed immediately
```

**With Hashing:**
```python
# ✅ Good: Hashed passwords are secure
user.hashed_password = hash_password("myPassword123")
# Returns: "$2b$12$..." (irreversible hash)
# Even if database is breached, original password cannot be retrieved
```

**How Hashing Works:**

**Hash Function:**
```
Input: "myPassword123"
↓
Hash Function (bcrypt)
↓
Output: "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqBWVHxkd0"
```

**Verification Process:**
```
1. User enters: "myPassword123"
2. Hash it: hash("myPassword123") → "$2b$12$..."
3. Compare with stored hash
4. Match = correct password
5. No match = incorrect password
```

**bcrypt Implementation:**

**Basic Hashing:**
```python
from passlib.context import CryptContext

# Create password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.
    
    bcrypt automatically:
    - Generates unique salt for each password
    - Applies configurable rounds (hashing iterations)
    - Returns hash with salt embedded
    """
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash.
    
    Process:
    1. Extract salt from hash
    2. Hash plain password with same salt
    3. Compare with stored hash
    """
    return pwd_context.verify(plain_password, hashed_password)
```

**Complete Authentication Flow:**

**User Registration:**
```python
async def register_user(
    email: str,
    password: str,
    db: AsyncSession
):
    """Register a new user with hashed password."""
    # Check if email exists
    existing = await db.execute(
        select(User).where(User.email == email)
    )
    if existing.scalar_one_or_none():
        raise ValueError("Email already registered")
    
    # Validate password strength
    is_valid, error = PasswordValidator.validate(password)
    if not is_valid:
        raise ValueError(error)
    
    # Hash password before storing
    hashed = hash_password(password)
    
    # Create user with hashed password
    user = User(
        email=email,
        hashed_password=hashed  # Never store plaintext!
    )
    
    db.add(user)
    await db.commit()
    return user
```

**User Login:**
```python
async def authenticate_user(
    email: str,
    password: str,
    db: AsyncSession
) -> Optional[User]:
    """Authenticate user by email and password."""
    # Find user
    result = await db.execute(
        select(User).where(User.email == email)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        return None
    
    # Verify password: Compare plain password with stored hash
    if not verify_password(password, user.hashed_password):
        return None  # Password doesn't match
    
    return user
```

**Password Validation:**
```python
import re

class PasswordValidator:
    """Validate password strength."""
    
    MIN_LENGTH = 8
    REQUIRE_UPPERCASE = True
    REQUIRE_LOWERCASE = True
    REQUIRE_DIGIT = True
    REQUIRE_SPECIAL = True
    
    @classmethod
    def validate(cls, password: str) -> tuple[bool, str]:
        """Validate password meets requirements."""
        if len(password) < cls.MIN_LENGTH:
            return False, f"Password must be at least {cls.MIN_LENGTH} characters"
        
        if cls.REQUIRE_UPPERCASE and not re.search(r'[A-Z]', password):
            return False, "Password must contain uppercase letter"
        
        if cls.REQUIRE_LOWERCASE and not re.search(r'[a-z]', password):
            return False, "Password must contain lowercase letter"
        
        if cls.REQUIRE_DIGIT and not re.search(r'\d', password):
            return False, "Password must contain a digit"
        
        if cls.REQUIRE_SPECIAL and not re.search(r'[!@#$%^&*]', password):
            return False, "Password must contain special character"
        
        return True, ""
```

**Password Reset Flow:**
```python
import secrets
from datetime import datetime, timedelta

async def create_password_reset_token(user_id: int, db: AsyncSession) -> str:
    """Create secure password reset token."""
    # Generate cryptographically secure random token
    token = secrets.token_urlsafe(32)
    
    # Store in database with expiration
    reset_token = PasswordResetToken(
        user_id=user_id,
        token=token,
        expires_at=datetime.utcnow() + timedelta(hours=1)  # Valid for 1 hour
    )
    
    db.add(reset_token)
    await db.commit()
    return token

async def reset_password(
    token: str,
    new_password: str,
    db: AsyncSession
) -> bool:
    """Reset password using token."""
    # Find valid token
    result = await db.execute(
        select(PasswordResetToken).where(
            PasswordResetToken.token == token,
            PasswordResetToken.used == False,
            PasswordResetToken.expires_at > datetime.utcnow()
        )
    )
    reset_token = result.scalar_one_or_none()
    
    if not reset_token:
        return False
    
    # Validate new password
    is_valid, error = PasswordValidator.validate(new_password)
    if not is_valid:
        raise ValueError(error)
    
    # Hash new password
    hashed = hash_password(new_password)
    
    # Update user password
    user = await db.get(User, reset_token.user_id)
    user.hashed_password = hashed
    
    # Mark token as used
    reset_token.used = True
    
    await db.commit()
    return True
```

**Security Best Practices:**

**1. Never Log Passwords:**
```python
# ❌ Bad: Never log passwords
logger.error(f"Login failed for {email} with password {password}")

# ✅ Good: Log without password
logger.error(f"Login failed for {email}")
```

**2. Use HTTPS Only:**
```python
# Always use HTTPS in production
# Never send passwords over HTTP
# Configure SSL/TLS properly
```

**3. Rate Limit Login Attempts:**
```python
# Prevent brute force attacks
# Limit login attempts per IP
# Lock account after N failed attempts
```

**4. Use Strong Hashing:**
```python
# bcrypt with sufficient rounds (12+)
# Automatically generates salt
# Slow by design (prevents brute force)
```

**System Design Consideration**: Password hashing provides:
1. **Security**: Irreversible password storage
2. **Protection**: Even if database breached, passwords safe
3. **Verification**: Secure password comparison
4. **Compliance**: Meets security standards

Password hashing is essential for secure authentication. Understanding bcrypt, salt generation, password verification, and security best practices is crucial for building secure applications. Always hash passwords before storing, validate password strength, and implement proper password reset flows.

---

### Q2: Explain bcrypt internals, salt generation, work factor (rounds), and why bcrypt is preferred over other hashing algorithms. Discuss security considerations and performance trade-offs.

**Answer:**

**bcrypt Internals:**

**How bcrypt Works:**
```
1. Generate random salt (unique per password)
2. Combine salt with password
3. Hash multiple times (work factor/rounds)
4. Store: algorithm + rounds + salt + hash
```

**Salt Generation:**
```python
# bcrypt automatically generates salt
# Each password gets unique salt
# Prevents rainbow table attacks
# Salt is embedded in hash string

# Hash format: $2b$12$salt22charactershash31characters
# $2b$ = algorithm identifier
# 12 = rounds (2^12 = 4096 iterations)
# salt = 22 characters
# hash = 31 characters
```

**Work Factor (Rounds):**
```python
# Higher rounds = more secure but slower
# Default: 12 rounds (2^12 = 4096 iterations)
# Recommended: 12-14 rounds

# Performance impact:
# 12 rounds: ~300ms per hash (acceptable)
# 14 rounds: ~1.2s per hash (more secure, slower)
# 16 rounds: ~4.8s per hash (too slow for most use cases)
```

**Why bcrypt Over Other Algorithms:**

**MD5/SHA1 (Insecure):**
```python
# ❌ Bad: Fast, no salt, vulnerable
# Can be cracked quickly
# No protection against rainbow tables
```

**bcrypt (Secure):**
```python
# ✅ Good: Slow, salted, secure
# Designed to be slow (prevents brute force)
# Automatic salt generation
# Configurable work factor
```

**Security Considerations:**

**1. Work Factor Selection:**
```python
# Balance security vs performance
# 12 rounds: Good for most applications
# 14 rounds: Higher security, slower
# Adjust based on hardware and security requirements
```

**2. Salt Uniqueness:**
```python
# bcrypt generates unique salt per password
# Even same password has different hashes
# Prevents rainbow table attacks
```

**3. Timing Attacks:**
```python
# bcrypt uses constant-time comparison
# Prevents timing-based attacks
# Always takes same time regardless of password
```

**Performance Trade-offs:**

**Hashing Time:**
```python
# 12 rounds: ~300ms (acceptable)
# 14 rounds: ~1.2s (more secure)
# 16 rounds: ~4.8s (too slow)

# Consider:
# - User registration: Can be slower
# - Login verification: Should be fast
# - Password reset: Can be slower
```

**System Design Consideration**: bcrypt provides:
1. **Security**: Slow, salted hashing
2. **Protection**: Against brute force and rainbow tables
3. **Flexibility**: Configurable work factor
4. **Industry Standard**: Widely used and trusted

Understanding bcrypt internals, salt generation, work factor, and security considerations is essential for implementing secure password hashing. Always use appropriate work factors, understand performance trade-offs, and follow security best practices.


