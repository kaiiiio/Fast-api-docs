# FastAPI Security Implementation Guide

A comprehensive guide to implementing authentication and authorization in FastAPI applications, covering JWT tokens, OAuth2, password hashing, and security best practices.

## Table of Contents
1. [Security Overview](#security-overview)
2. [Password Hashing](#password-hashing)
3. [JWT Token Authentication](#jwt-token-authentication)
4. [OAuth2 with Password Flow](#oauth2-with-password-flow)
5. [Role-Based Access Control](#role-based-access-control)
6. [API Key Authentication](#api-key-authentication)
7. [Security Best Practices](#security-best-practices)

---

## Security Overview  ---  IMP

FastAPI provides built-in security utilities that integrate with OpenAPI standards, making it easy to implement secure authentication and authorization.

### Key Security Concepts

**Authentication:** Verifying who the user is (login with username/password, API keys, OAuth2 tokens).

**Authorization:** Determining what an authenticated user can do (roles, permissions, access control).

**JWT (JSON Web Token):** A compact, self-contained way to securely transmit information between parties as a JSON object. Used for stateless authentication.

**OAuth2:** An authorization framework that enables applications to obtain limited access to user accounts. FastAPI supports OAuth2 password flow out of the box.

**Password Hashing:** Converting passwords into irreversible hashes using algorithms like bcrypt. Never store plain-text passwords.

---

## Password Hashing

### Why Hash Passwords?

**Security:** If your database is compromised, attackers cannot read plain-text passwords.

**Best Practice:** Use bcrypt, argon2, or scrypt (slow hashing algorithms designed for passwords).

### Implementation with Passlib

```python
# app/core/security.py
from passlib.context import CryptContext

# CryptContext - Passlib utility for password hashing
# schemes=["bcrypt"] - Use bcrypt algorithm (slow, secure, designed for passwords)
# deprecated="auto" - Automatically marks old hashes as deprecated
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """
    Hash a plain-text password using bcrypt.
    
    Args:
        password: Plain-text password from user
        
    Returns:
        Hashed password string (safe to store in database)
    """
    # pwd_context.hash() - Generates bcrypt hash with random salt
    # Each call produces different hash (salt is random)
    # Example: "password123" → "$2b$12$KIX..."
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain-text password against a hashed password.
    
    Args:
        plain_password: Password provided by user during login
        hashed_password: Hashed password from database
        
    Returns:
        True if password matches, False otherwise
    """
    # pwd_context.verify() - Compares plain password with hash
    # Extracts salt from hash, hashes plain password, compares
    # Returns True if match, False otherwise
    return pwd_context.verify(plain_password, hashed_password)
```

**Usage Example:**
```python
# During user registration
hashed = hash_password("user_password_123")
# Store hashed in database: user.password = hashed

# During login
is_valid = verify_password("user_password_123", user.password)
if is_valid:
    # Password correct, generate token
    pass
else:
    # Password incorrect, reject login
    raise HTTPException(status_code=401, detail="Incorrect password")
```

---

## JWT Token Authentication

### What is JWT?

JWT (JSON Web Token) is a compact, URL-safe token format for transmitting claims between parties. It consists of three parts:

**Structure:** `header.payload.signature`

**Header:** Algorithm and token type (e.g., `{"alg": "HS256", "typ": "JWT"}`)

**Payload:** Claims (user data, expiration, etc.) (e.g., `{"sub": "user@example.com", "exp": 1234567890}`)

**Signature:** Cryptographic signature to verify token hasn't been tampered with

### JWT Implementation

```python
# app/core/security.py
from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import HTTPException, status

# Configuration (from settings)
SECRET_KEY = "your-secret-key-here"  # Must be kept secret!
ALGORITHM = "HS256"  # HMAC with SHA-256
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: Dictionary of claims to encode (e.g., {"sub": "user@example.com"})
        expires_delta: Optional custom expiration time
        
    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()
    
    # Set expiration time
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Add expiration claim to payload
    # "exp" - Standard JWT claim for expiration timestamp
    to_encode.update({"exp": expire})
    
    # jwt.encode() - Creates JWT token
    # to_encode - Payload (claims)
    # SECRET_KEY - Secret for signing (must be kept secure)
    # algorithm - Hashing algorithm (HS256 = HMAC-SHA256)
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> dict:
    """
    Decode and verify a JWT access token.
    
    Args:
        token: JWT token string
        
    Returns:
        Decoded payload (claims) as dictionary
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # jwt.decode() - Verifies signature and decodes payload
        # Checks: signature valid, token not expired, algorithm matches
        # Raises JWTError if any check fails
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Extract user identifier from "sub" claim
        # "sub" (subject) - Standard JWT claim for user identifier
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
            
        return payload
    except JWTError:
        # Token invalid, expired, or tampered with
        raise credentials_exception
```

**Token Creation Example:**
```python
# During login, after password verification
access_token = create_access_token(
    data={"sub": user.email},  # Subject claim (user identifier)
    expires_delta=timedelta(minutes=30)
)

# Return token to client
return {
    "access_token": access_token,
    "token_type": "bearer"  # OAuth2 standard
}
```

---

## OAuth2 with Password Flow

### OAuth2 Password Flow Overview

**Flow:**
1. Client sends username + password to `/token` endpoint
2. Server validates credentials
3. Server returns access token
4. Client includes token in `Authorization: Bearer <token>` header for subsequent requests
5. Server validates token and grants access

### Implementation

```python
# app/core/security.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

# OAuth2PasswordBearer - FastAPI security scheme
# tokenUrl - Endpoint where clients get tokens (relative path)
# Automatically extracts token from "Authorization: Bearer <token>" header
# Adds "Authorize" button in Swagger UI
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),  # Extracts token from header
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Dependency to get the current authenticated user from JWT token.
    
    Args:
        token: JWT token extracted from Authorization header
        db: Database session
        
    Returns:
        Authenticated User object
        
    Raises:
        HTTPException: If token is invalid or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Decode and verify token
    payload = decode_access_token(token)
    email: str = payload.get("sub")
    if email is None:
        raise credentials_exception
    
    # Fetch user from database
    user = await UserRepository(db).get_by_email(email)
    if user is None:
        raise credentials_exception
    
    return user

# Login endpoint
@app.post("/api/v1/auth/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),  # username + password
    db: AsyncSession = Depends(get_db)
):
    """
    OAuth2 compatible token login endpoint.
    
    OAuth2PasswordRequestForm provides:
    - username: User's username or email
    - password: User's password
    - scope: Optional OAuth2 scopes
    """
    # Verify user exists
    user = await UserRepository(db).get_by_email(form_data.username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    # Verify password
    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": user.email})
    
    # Return token (OAuth2 standard format)
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

# Protected endpoint example
@app.get("/api/v1/users/me")
async def read_users_me(
    current_user: User = Depends(get_current_user)  # Requires authentication
):
    """
    Get current user's profile.
    
    Requires valid JWT token in Authorization header.
    """
    return current_user
```

**Client Usage:**
```bash
# 1. Login to get token
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=user@example.com&password=password123"

# Response: {"access_token": "eyJ...", "token_type": "bearer"}

# 2. Use token in subsequent requests
curl -X GET "http://localhost:8000/api/v1/users/me" \
  -H "Authorization: Bearer eyJ..."
```

---

## Role-Based Access Control (RBAC)

### Implementation

```python
# app/models/user.py
from enum import Enum

class UserRole(str, Enum):
    """User roles for access control."""
    ADMIN = "admin"
    USER = "user"
    GUEST = "guest"

class User(BaseModel):
    id: int
    email: str
    role: UserRole
    is_active: bool

# app/api/deps.py
from fastapi import Depends, HTTPException, status

def require_role(required_role: UserRole):
    """
    Factory function to create role-checking dependency.
    
    Args:
        required_role: Minimum role required to access endpoint
        
    Returns:
        Dependency function that checks user role
    """
    async def role_checker(
        current_user: User = Depends(get_current_user)
    ) -> User:
        """Check if current user has required role."""
        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role: {required_role}"
            )
        return current_user
    return role_checker

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to require admin role."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

# Usage in endpoints
@app.get("/api/v1/admin/users")
async def list_all_users(
    admin_user: User = Depends(require_admin)  # Only admins can access
):
    """Admin-only endpoint to list all users."""
    return await UserRepository(db).get_all()

@app.delete("/api/v1/users/{user_id}")
async def delete_user(
    user_id: int,
    admin_user: User = Depends(require_role(UserRole.ADMIN))  # Dynamic role check
):
    """Delete a user (admin only)."""
    return await UserRepository(db).delete(user_id)
```

---

## API Key Authentication

### Implementation

```python
# app/core/security.py
from fastapi import Security, HTTPException, status
from fastapi.security import APIKeyHeader

# APIKeyHeader - FastAPI security scheme for API key in header
# name - Header name to extract API key from
# auto_error - If True, raises 403 automatically if key missing
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=True)

async def verify_api_key(api_key: str = Security(api_key_header)) -> str:
    """
    Verify API key from header.
    
    Args:
        api_key: API key extracted from X-API-Key header
        
    Returns:
        Validated API key
        
    Raises:
        HTTPException: If API key is invalid
    """
    # In production, check against database or environment variable
    valid_api_keys = {
        "secret-key-1": "user1",
        "secret-key-2": "user2"
    }
    
    if api_key not in valid_api_keys:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API key"
        )
    
    return api_key

# Usage
@app.get("/api/v1/protected")
async def protected_endpoint(
    api_key: str = Depends(verify_api_key)  # Requires valid API key
):
    """Endpoint protected by API key."""
    return {"message": "Access granted"}
```

**Client Usage:**
```bash
curl -X GET "http://localhost:8000/api/v1/protected" \
  -H "X-API-Key: secret-key-1"
```

---

## Security Best Practices

### 1. **Use HTTPS in Production**

**Why:** Prevents man-in-the-middle attacks, protects tokens and passwords in transit.

```python
# Force HTTPS redirect
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware

if settings.ENVIRONMENT == "production":
    app.add_middleware(HTTPSRedirectMiddleware)
```

### 2. **Set Secure Token Expiration**

**Why:** Limits damage if token is stolen.

```python
# Short-lived access tokens
ACCESS_TOKEN_EXPIRE_MINUTES = 15  # 15 minutes

# Long-lived refresh tokens (for token refresh flow)
REFRESH_TOKEN_EXPIRE_DAYS = 7  # 7 days
```

### 3. **Use Strong Secret Keys**

**Why:** Weak secrets can be brute-forced, allowing attackers to forge tokens.

```python
# Generate secure secret key
import secrets

SECRET_KEY = secrets.token_urlsafe(32)  # 32 bytes = 256 bits
# Store in environment variable, never in code!
```

### 4. **Implement Rate Limiting**

**Why:** Prevents brute-force attacks on login endpoints.

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/api/v1/auth/login")
@limiter.limit("5/minute")  # Max 5 login attempts per minute
async def login(...):
    pass
```

### 5. **Validate Input Thoroughly**

**Why:** Prevents injection attacks and data corruption.

```python
from pydantic import BaseModel, EmailStr, validator

class UserCreate(BaseModel):
    email: EmailStr  # Validates email format
    password: str
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain at least one digit')
        return v
```

### 6. **Use CORS Properly**

**Why:** Prevents unauthorized cross-origin requests.

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],  # Specific origins only
    allow_credentials=True,
    allow_methods=["GET", "POST"],  # Specific methods only
    allow_headers=["Authorization", "Content-Type"],
)
```

### 7. **Log Security Events**

**Why:** Helps detect and respond to security incidents.

```python
import logging

logger = logging.getLogger(__name__)

@app.post("/api/v1/auth/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await authenticate_user(form_data.username, form_data.password)
    
    if not user:
        # Log failed login attempt
        logger.warning(
            f"Failed login attempt for user: {form_data.username} "
            f"from IP: {request.client.host}"
        )
        raise HTTPException(status_code=401, detail="Incorrect credentials")
    
    # Log successful login
    logger.info(f"User {user.email} logged in successfully")
    return create_token(user)
```

### 8. **Implement Token Refresh**

**Why:** Allows users to stay logged in without exposing long-lived access tokens.

```python
def create_refresh_token(data: dict) -> str:
    """Create long-lived refresh token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

@app.post("/api/v1/auth/refresh")
async def refresh_token(refresh_token: str):
    """Exchange refresh token for new access token."""
    payload = decode_access_token(refresh_token)
    
    # Verify it's a refresh token
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")
    
    # Create new access token
    access_token = create_access_token(data={"sub": payload.get("sub")})
    return {"access_token": access_token, "token_type": "bearer"}
```

---

## Summary

**Key Security Components:**
- **Password Hashing:** Use bcrypt/argon2, never store plain-text passwords
- **JWT Tokens:** Stateless authentication with signed tokens
- **OAuth2:** Standard authentication flow with FastAPI support
- **RBAC:** Role-based access control for authorization
- **API Keys:** Alternative authentication for machine-to-machine communication

**Best Practices:**
- Use HTTPS in production
- Set short token expiration times
- Use strong secret keys
- Implement rate limiting
- Validate all input
- Configure CORS properly
- Log security events
- Implement token refresh

**FastAPI Security Advantages:**
- Built-in OAuth2 support
- Automatic OpenAPI/Swagger UI integration
- Type-safe security dependencies
- Easy testing with dependency overrides
- Standards-compliant (OAuth2, JWT)

Security is critical for any production application. FastAPI provides excellent tools to implement robust authentication and authorization with minimal boilerplate.
