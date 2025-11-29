# Password Hashing Best Practices

Storing passwords securely is non-negotiable. This guide teaches you password hashing from basics to advanced security practices.

## Why Hash Passwords?

**Never store plaintext passwords!**

**The problem:**
```python
# ❌ NEVER DO THIS
user.password = "myPassword123"  # Stored as plaintext
# If database is breached, all passwords are exposed
```

**The solution:**
Hash passwords - one-way encryption that can't be reversed.

## Understanding Password Hashing

**What is hashing?**
One-way function that converts password → hash. Can't reverse hash → password.

**How it works:**
```
"myPassword123" → hash function → "a8f5f167f44f4964e6c998dee827110c"
```

**Verification:**
```
Login attempt: "myPassword123"
→ Hash it → Compare with stored hash
→ Match = correct password
```

## Step 1: Using bcrypt

bcrypt is the industry standard for password hashing:

```python
from passlib.context import CryptContext

# Create password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.
    
    Example:
        hashed = hash_password("myPassword123")
        # Returns: "$2b$12$..."
    """
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash.
    
    Example:
        is_valid = verify_password("myPassword123", stored_hash)
    """
    return pwd_context.verify(plain_password, hashed_password)
```

**Understanding bcrypt:**
- Automatically generates salt (prevents rainbow table attacks)
- Configurable rounds (how many times to hash)
- Slow by design (prevents brute force)

## Step 2: Complete Authentication Flow

Let's build a complete password system:

```python
from sqlalchemy import Column, String
from app.db.base import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True)
    
    # Store hashed password, not plaintext
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
    
    # Hash password
    hashed = hash_password(password)
    
    # Create user
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
    
    # Verify password
    if not verify_password(password, user.hashed_password):
        return None
    
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

