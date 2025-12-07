# JWT Implementation: Complete Guide

JSON Web Tokens (JWT) are the standard for stateless authentication in modern APIs. This guide teaches you JWT from basics to production implementation in FastAPI.

## Understanding JWT

**What is JWT?**
A compact, URL-safe way to securely transmit information between parties as a JSON object.

**JWT Structure:**
```
header.payload.signature
```

**Parts explained:**
1. **Header**: Algorithm and token type
2. **Payload**: Claims (data about user)
3. **Signature**: Verifies token hasn't been tampered with

**Example:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

**Why JWT?** Stateless (no server-side session storage), scalable (works across multiple servers), self-contained (user info in token), and standard (works with any language).

## Step 1: Installing Dependencies

```bash
pip install python-jose[cryptography] passlib[bcrypt] python-multipart
```

**What each package does:**
- `python-jose`: JWT encoding/decoding
- `passlib`: Password hashing
- `python-multipart`: Form data parsing (for login)

## Step 2: JWT Configuration

```python
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic_settings import BaseSettings

class SecuritySettings(BaseSettings):
    """Security configuration."""
    
    # JWT settings
    secret_key: str  # Used to sign tokens (keep secret!)
    algorithm: str = "HS256"  # Signing algorithm
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    
    class Config:
        env_file = ".env"

settings = SecuritySettings()

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
```

**Understanding the settings:**
- `secret_key`: Used to sign/verify tokens (must be secret!)
- `algorithm`: How to sign (HS256 = symmetric key)
- `access_token_expire_minutes`: How long token is valid
- `refresh_token_expire_days`: For token refresh (longer-lived)

## Step 3: Creating and Verifying Tokens

### Create Access Token

```python
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: Data to encode in token (typically user ID, email)
        expires_delta: Custom expiration time
    
    Returns:
        Encoded JWT token string
    
    Example:
        token = create_access_token(data={"sub": "user123"})
    """
    to_encode = data.copy()
    
    # Set expiration time
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.access_token_expire_minutes
        )
    
    # Add standard claims: JWT standard fields.
    to_encode.update({
        "exp": expire,  # Expiration time: Token becomes invalid after this.
        "iat": datetime.utcnow(),  # Issued at: When token was created.
        "type": "access"  # Token type: Distinguishes access from refresh tokens.
    })
    
    # Encode and sign token: Creates JWT with signature.
    encoded_jwt = jwt.encode(
        to_encode,
        settings.secret_key,  # Secret key signs token, prevents tampering.
        algorithm=settings.algorithm  # HS256 = symmetric key algorithm.
    )
    
    return encoded_jwt
```

**Understanding the token creation:**
1. Copy data to encode
2. Set expiration (`exp` claim)
3. Set issued time (`iat` claim)
4. Sign with secret key
5. Return encoded token

### Verify Access Token

```python
def verify_token(token: str) -> Optional[dict]:
    """
    Verify and decode a JWT token.
    
    Args:
        token: JWT token string
    
    Returns:
        Decoded payload or None if invalid
    
    Raises:
        JWTError: If token is invalid, expired, or tampered with
    """
    try:
        # Decode and verify token: Validates signature and expiration automatically.
        payload = jwt.decode(
            token,
            settings.secret_key,  # Must match key used to sign.
            algorithms=[settings.algorithm]  # Must match signing algorithm.
        )
        
        # Check token type: Ensures this is an access token, not refresh token.
        if payload.get("type") != "access":
            raise JWTError("Invalid token type")
        
        # Check expiration: jwt.decode does this automatically, raises if expired.
        return payload
    
    except JWTError:
        return None  # Invalid, expired, or tampered token.
```

**What verification checks:** Signature is valid (not tampered), token hasn't expired, algorithm matches, and token type is correct.

## Step 4: Password Hashing

Before we can authenticate, we need to hash passwords:

```python
# hash_password: Creates secure bcrypt hash (one-way, can't reverse).
def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return pwd_context.hash(password)

# verify_password: Compares plain password with hash (secure comparison).
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)

# Usage: Never store plain passwords, always hash them.
hashed = hash_password("my_password")
is_valid = verify_password("my_password", hashed)  # True
```

## Step 5: Authentication Flow

### Login Endpoint

```python
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()

@router.post("/auth/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """
    Login endpoint - returns access token.
    
    Flow:
    1. User submits username (email) and password
    2. Verify credentials
    3. Generate JWT token
    4. Return token to client
    """
    # Step 1: Find user by email
    user = await db.execute(
        select(User).where(User.email == form_data.username)
    )
    user = user.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Step 2: Verify password
    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Step 3: Generate access token
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email},  # Subject = user ID
        expires_delta=access_token_expires
    )
    
    # Step 4: Return token
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.access_token_expire_minutes * 60
    }
```

**Understanding the flow:**
1. Client sends email/password
2. Server verifies credentials
3. Server creates token with user info
4. Client stores token and sends with requests

### Protected Endpoint

```python
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Dependency to get current authenticated user.
    
    Extracts token from Authorization header and verifies it.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Verify token
        payload = verify_token(token)
        if payload is None:
            raise credentials_exception
        
        # Extract user ID from token
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    
    except JWTError:
        raise credentials_exception
    
    # Get user from database
    user = await db.get(User, int(user_id))
    if user is None:
        raise credentials_exception
    
    return user

# Use in protected endpoints
@router.get("/users/me")
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current user's information."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name
    }
```

**How it works:**
1. Client sends: `Authorization: Bearer <token>`
2. FastAPI extracts token automatically
3. `get_current_user` verifies token
4. Returns user object
5. Route has access to authenticated user

## Step 6: Refresh Tokens

For better security, use short-lived access tokens with refresh tokens:

```python
def create_refresh_token(data: dict) -> str:
    """Create a long-lived refresh token."""
    to_encode = data.copy()
    
    expire = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "refresh"  # Different type
    })
    
    return jwt.encode(
        to_encode,
        settings.secret_key,
        algorithm=settings.algorithm
    )

@router.post("/auth/refresh")
async def refresh_token(
    refresh_token: str,
    db: AsyncSession = Depends(get_db)
):
    """Refresh access token using refresh token."""
    try:
        payload = jwt.decode(
            refresh_token,
            settings.secret_key,
            algorithms=[settings.algorithm]
        )
        
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        user_id = payload.get("sub")
        user = await db.get(User, int(user_id))
        
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        # Create new access token
        new_access_token = create_access_token(data={"sub": str(user.id)})
        
        return {
            "access_token": new_access_token,
            "token_type": "bearer"
        }
    
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
```

## Step 7: Token Blacklisting (Optional)

For logout functionality, blacklist tokens:

```python
async def blacklist_token(token: str, redis: aioredis.Redis):
    """Add token to blacklist until it expires."""
    payload = verify_token(token)
    if payload:
        expires_at = datetime.fromtimestamp(payload["exp"])
        ttl = (expires_at - datetime.utcnow()).total_seconds()
        
        await redis.setex(
            f"blacklist:{token}",
            int(ttl),
            "1"
        )

async def is_token_blacklisted(token: str, redis: aioredis.Redis) -> bool:
    """Check if token is blacklisted."""
    blacklisted = await redis.get(f"blacklist:{token}")
    return blacklisted is not None

# Updated get_current_user
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    redis: aioredis.Redis = Depends(get_redis),
    db: AsyncSession = Depends(get_db)
) -> User:
    # Check blacklist first
    if await is_token_blacklisted(token, redis):
        raise HTTPException(status_code=401, detail="Token has been revoked")
    
    # ... rest of verification
```

## Security Best Practices

### 1. Strong Secret Key

```python
# Generate secure secret key
import secrets
secret_key = secrets.token_urlsafe(32)  # 32 bytes = 256 bits

# Store in environment variable, never in code!
```

### 2. HTTPS Only

```python
# In production, only accept tokens over HTTPS
# Set Secure flag in cookie (if using cookie-based)
```

### 3. Token Expiration

```python
# Short-lived access tokens (15-30 minutes)
# Longer refresh tokens (7-30 days)
# Balance security vs user experience
```

### 4. Token Rotation

```python
# When refreshing, issue new refresh token too
# Prevents token reuse attacks
```

## Summary

JWT authentication provides:
- ✅ Stateless authentication
- ✅ Scalable architecture
- ✅ Standard implementation
- ✅ Self-contained tokens

Key components:
- Token creation and verification
- Password hashing
- Protected routes
- Refresh tokens
- Security best practices

Implement JWT properly and you have production-ready authentication!

---

## 🎯 Interview Questions: FastAPI

### Q1: Explain JWT (JSON Web Token) authentication in FastAPI, including how it works, token creation and verification, refresh tokens, and security best practices. Provide detailed examples showing a complete JWT authentication implementation.

**Answer:**

**JWT Authentication Overview:**

JWT (JSON Web Token) is a stateless authentication mechanism that allows servers to verify user identity without storing session data. It's ideal for distributed systems, microservices, and scalable applications.

**How JWT Works:**

**Token Structure:**
```
JWT = Header.Payload.Signature

Header: {"alg": "HS256", "typ": "JWT"}
Payload: {"sub": "user_id", "email": "user@example.com", "exp": 1234567890}
Signature: HMACSHA256(base64UrlEncode(header) + "." + base64UrlEncode(payload), secret)
```

**Authentication Flow:**
```
1. User logs in with credentials
2. Server verifies credentials
3. Server creates JWT token
4. Server returns token to client
5. Client stores token (localStorage, cookie, etc.)
6. Client sends token with requests (Authorization header)
7. Server verifies token on each request
8. Server processes request if token valid
```

**Token Creation:**

**Basic Token Creation:**
```python
from datetime import datetime, timedelta
from jose import jwt
from typing import Optional

SECRET_KEY = "your-secret-key"  # In production: from environment
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: Data to encode in token (typically user ID, email)
        expires_delta: Optional expiration time
    
    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,  # Expiration time
        "iat": datetime.utcnow(),  # Issued at
        "type": "access"  # Token type
    })
    
    encoded_jwt = jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )
    
    return encoded_jwt
```

**Token Verification:**

**Verify Token:**
```python
from jose import JWTError

def verify_token(token: str) -> Optional[dict]:
    """
    Verify and decode JWT token.
    
    Args:
        token: JWT token string
    
    Returns:
        Decoded payload or None if invalid
    """
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )
        return payload
    except JWTError:
        return None
```

**Login Endpoint:**

**Complete Login Implementation:**
```python
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()

@router.post("/auth/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """
    Authenticate user and return JWT token.
    
    Flow:
    1. User submits username (email) and password
    2. Verify credentials
    3. Generate JWT token
    4. Return token to client
    """
    # Step 1: Find user by email
    stmt = select(User).where(User.email == form_data.username)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Step 2: Verify password
    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Step 3: Generate access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email},
        expires_delta=access_token_expires
    )
    
    # Step 4: Return token
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }
```

**Protected Endpoints:**

**Get Current User Dependency:**
```python
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Dependency to get current authenticated user.
    
    Extracts token from Authorization header and verifies it.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Verify token
        payload = verify_token(token)
        if payload is None:
            raise credentials_exception
        
        # Extract user ID from token
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    
    except JWTError:
        raise credentials_exception
    
    # Get user from database
    user = await db.get(User, int(user_id))
    if user is None:
        raise credentials_exception
    
    return user

# Use in protected endpoints
@router.get("/users/me")
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current user's information."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name
    }
```

**Refresh Tokens:**

**Refresh Token Implementation:**
```python
REFRESH_TOKEN_EXPIRE_DAYS = 7

def create_refresh_token(data: dict) -> str:
    """Create a long-lived refresh token."""
    to_encode = data.copy()
    
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "refresh"  # Different type
    })
    
    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

@router.post("/auth/refresh")
async def refresh_token(
    refresh_token: str,
    db: AsyncSession = Depends(get_db)
):
    """Refresh access token using refresh token."""
    try:
        payload = jwt.decode(
            refresh_token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )
        
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        user_id = payload.get("sub")
        user = await db.get(User, int(user_id))
        
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        # Create new access token
        new_access_token = create_access_token(
            data={"sub": str(user.id), "email": user.email}
        )
        
        return {
            "access_token": new_access_token,
            "token_type": "bearer"
        }
    
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
```

**Token Blacklisting (Logout):**

**Blacklist Implementation:**
```python
import aioredis

async def blacklist_token(token: str, redis: aioredis.Redis):
    """Add token to blacklist until it expires."""
    payload = verify_token(token)
    if payload:
        expires_at = datetime.fromtimestamp(payload["exp"])
        ttl = (expires_at - datetime.utcnow()).total_seconds()
        
        await redis.setex(
            f"blacklist:{token}",
            int(ttl),
            "1"
        )

async def is_token_blacklisted(token: str, redis: aioredis.Redis) -> bool:
    """Check if token is blacklisted."""
    blacklisted = await redis.get(f"blacklist:{token}")
    return blacklisted is not None

# Updated get_current_user
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    redis: aioredis.Redis = Depends(get_redis),
    db: AsyncSession = Depends(get_db)
) -> User:
    # Check blacklist first
    if await is_token_blacklisted(token, redis):
        raise HTTPException(status_code=401, detail="Token has been revoked")
    
    # ... rest of verification
```

**Security Best Practices:**

**1. Strong Secret Key:**
```python
import secrets

# Generate secure secret key
secret_key = secrets.token_urlsafe(32)  # 32 bytes = 256 bits

# Store in environment variable, never in code!
# .env file:
# SECRET_KEY=your-generated-secret-key
```

**2. Token Expiration:**
```python
# Short-lived access tokens (15-30 minutes)
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Longer refresh tokens (7-30 days)
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Balance security vs user experience
```

**3. HTTPS Only:**
```python
# In production, only accept tokens over HTTPS
# Set Secure flag in cookie (if using cookie-based)
# Validate token transmission security
```

**4. Token Rotation:**
```python
# When refreshing, issue new refresh token too
# Prevents token reuse attacks
# Invalidate old refresh token
```

**5. Token Storage:**
```python
# Client-side storage options:
# - localStorage: Easy but vulnerable to XSS
# - httpOnly cookies: More secure, protected from XSS
# - Memory: Most secure but lost on refresh

# Recommendation: Use httpOnly cookies in production
```

**System Design Consideration**: JWT authentication provides:
1. **Stateless**: No server-side session storage
2. **Scalable**: Works across multiple servers
3. **Standard**: Industry-standard implementation
4. **Flexible**: Self-contained tokens

JWT authentication in FastAPI provides stateless, scalable authentication. Understanding token creation, verification, refresh tokens, and security best practices is essential for building secure APIs. Always use strong secret keys, short-lived access tokens, and proper token storage mechanisms.

---

### Q2: Explain refresh tokens, token blacklisting, and security considerations for JWT authentication. Discuss when to use refresh tokens, how to implement logout, and best practices for token management in production.

**Answer:**

**Refresh Tokens:**

**Why Refresh Tokens:**

Access tokens are short-lived (15-30 minutes) for security. Refresh tokens are long-lived (7-30 days) and used to obtain new access tokens without re-authentication.

**Benefits:**
- Better security: Short-lived access tokens limit exposure
- Better UX: Users don't need to login frequently
- Token rotation: Can invalidate refresh tokens on refresh

**Implementation:**
```python
def create_refresh_token(data: dict) -> str:
    """Create a long-lived refresh token."""
    to_encode = data.copy()
    
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "refresh"
    })
    
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

@router.post("/auth/refresh")
async def refresh_token(
    refresh_token: str,
    db: AsyncSession = Depends(get_db)
):
    """Refresh access token using refresh token."""
    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        user_id = payload.get("sub")
        user = await db.get(User, int(user_id))
        
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        # Create new access token
        new_access_token = create_access_token(
            data={"sub": str(user.id), "email": user.email}
        )
        
        return {
            "access_token": new_access_token,
            "token_type": "bearer"
        }
    
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
```

**Token Blacklisting (Logout):**

**Problem:** JWTs are stateless - once issued, they're valid until expiration. To implement logout, we need to blacklist tokens.

**Solution:**
```python
async def blacklist_token(token: str, redis: aioredis.Redis):
    """Add token to blacklist until it expires."""
    payload = verify_token(token)
    if payload:
        expires_at = datetime.fromtimestamp(payload["exp"])
        ttl = (expires_at - datetime.utcnow()).total_seconds()
        
        await redis.setex(
            f"blacklist:{token}",
            int(ttl),
            "1"
        )

async def is_token_blacklisted(token: str, redis: aioredis.Redis) -> bool:
    """Check if token is blacklisted."""
    blacklisted = await redis.get(f"blacklist:{token}")
    return blacklisted is not None

@router.post("/auth/logout")
async def logout(
    current_user: User = Depends(get_current_user),
    token: str = Depends(oauth2_scheme),
    redis: aioredis.Redis = Depends(get_redis)
):
    """Logout user by blacklisting token."""
    await blacklist_token(token, redis)
    return {"message": "Logged out successfully"}
```

**Security Best Practices:**

**1. Secret Key Management:**
```python
# ✅ Good: From environment
SECRET_KEY = os.getenv("SECRET_KEY")

# ❌ Bad: Hardcoded
SECRET_KEY = "my-secret-key"
```

**2. Token Expiration:**
```python
# Short-lived access tokens
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Longer refresh tokens
REFRESH_TOKEN_EXPIRE_DAYS = 7
```

**3. HTTPS Only:**
```python
# Always use HTTPS in production
# Tokens transmitted securely
# Prevents man-in-the-middle attacks
```

**System Design Consideration**: JWT security requires:
1. **Strong Secrets**: Secure key generation and storage
2. **Token Expiration**: Short-lived access tokens
3. **Refresh Tokens**: Long-lived tokens for UX
4. **Blacklisting**: Logout functionality
5. **HTTPS**: Secure transmission

Refresh tokens provide better UX while maintaining security. Token blacklisting enables logout functionality. Always use strong secret keys, short-lived access tokens, and HTTPS in production.


