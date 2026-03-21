# JWT Implementation: Complete Guide

JSON Web Tokens (JWT) are the standard for stateless authentication in modern APIs. This guide teaches you JWT from basics to production implementation in Express.js.

## Understanding JWT

**What is JWT?** A compact, URL-safe way to securely transmit information between parties as a JSON object.

**JWT Structure:**
```
header.payload.signature
```

**Parts explained:** **Header** contains algorithm and token type. **Payload** contains claims (data about user). **Signature** verifies token hasn't been tampered with.

**Example:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

**Why JWT?** Stateless (no server-side session storage), scalable (works across multiple servers), self-contained (user info in token), and standard (works with any language).

## Step 1: Installing Dependencies

```bash
npm install jsonwebtoken bcryptjs dotenv
npm install --save-dev @types/jsonwebtoken @types/bcryptjs  # If using TypeScript
```

**What each package does:** `jsonwebtoken` handles JWT encoding/decoding. `bcryptjs` handles password hashing. `dotenv` loads environment variables.

## Step 2: JWT Configuration

```javascript
require('dotenv').config();

// Security configuration: JWT and password settings.
const config = {
    // JWT settings
    JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',  // Used to sign tokens (keep secret!)
    JWT_ALGORITHM: 'HS256',  // Signing algorithm
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '30m',  // Token expiration (30 minutes)
    JWT_REFRESH_EXPIRES_IN: '7d',  // Refresh token expiration (7 days)
    
    // Password hashing
    BCRYPT_ROUNDS: 10  // Number of bcrypt rounds
};

module.exports = config;
```

**Understanding the settings:** `JWT_SECRET` is used to sign/verify tokens (must be secret!). `JWT_ALGORITHM` is how to sign (HS256 = symmetric key). `JWT_EXPIRES_IN` is how long token is valid. `JWT_REFRESH_EXPIRES_IN` is for token refresh (longer-lived).

## Step 3: Creating and Verifying Tokens

### Create Access Token

```javascript
const jwt = require('jsonwebtoken');
const config = require('../config/env');

// createAccessToken: Generate JWT access token with user data.
function createAccessToken(data, expiresIn = null) {
    /**
     * Create a JWT access token.
     * 
     * @param {Object} data - Data to encode in token (typically user ID, email)
     * @param {string} expiresIn - Custom expiration time (optional)
     * @returns {string} Encoded JWT token string
     * 
     * @example
     * const token = createAccessToken({ userId: 123, email: 'user@example.com' });
     */
    const payload = {
        ...data,  // User data (userId, email, etc.)
        type: 'access'  // Token type: Distinguishes access from refresh tokens
    };
    
    // Sign token: Creates JWT with signature.
    const token = jwt.sign(
        payload,
        config.JWT_SECRET,  // Secret key signs token, prevents tampering
        {
            algorithm: config.JWT_ALGORITHM,  // HS256 = symmetric key algorithm
            expiresIn: expiresIn || config.JWT_EXPIRES_IN  // Token expiration time
        }
    );
    
    return token;
}
```

**Understanding the token creation:** Copy user data to payload, add token type, sign with secret key, and return encoded token.

### Verify Access Token

```javascript
// verifyToken: Validate and decode JWT token.
function verifyToken(token) {
    /**
     * Verify and decode a JWT token.
     * 
     * @param {string} token - JWT token string
     * @returns {Object} Decoded payload
     * @throws {Error} If token is invalid, expired, or tampered with
     */
    try {
        // Decode and verify token: Validates signature and expiration automatically.
        const payload = jwt.verify(
            token,
            config.JWT_SECRET,  // Must match key used to sign
            {
                algorithms: [config.JWT_ALGORITHM]  // Must match signing algorithm
            }
        );
        
        // Check token type: Ensures this is an access token, not refresh token.
        if (payload.type !== 'access') {
            throw new Error('Invalid token type');
        }
        
        return payload;
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Token has expired');
        }
        if (error.name === 'JsonWebTokenError') {
            throw new Error('Invalid token');
        }
        throw error;
    }
}
```

**Understanding the verification:** Decode token with secret key, verify signature, check expiration, validate token type, and return payload.

## Step 4: Password Hashing

```javascript
const bcrypt = require('bcryptjs');
const config = require('../config/env');

// hashPassword: Hash password using bcrypt.
async function hashPassword(password) {
    /**
     * Hash a password using bcrypt.
     * 
     * @param {string} password - Plain text password
     * @returns {string} Hashed password
     */
    const salt = await bcrypt.genSalt(config.BCRYPT_ROUNDS);  // Generate salt
    const hashed = await bcrypt.hash(password, salt);  // Hash password with salt
    return hashed;
}

// verifyPassword: Compare plain password with hash.
async function verifyPassword(plainPassword, hashedPassword) {
    /**
     * Verify a password against a hash.
     * 
     * @param {string} plainPassword - Plain text password
     * @param {string} hashedPassword - Hashed password from database
     * @returns {boolean} True if password matches
     */
    return await bcrypt.compare(plainPassword, hashedPassword);  // Compare passwords
}
```

## Step 5: Authentication Flow

### Login Endpoint

```javascript
const express = require('express');
const router = express.Router();
const userRepository = require('../repositories/userRepository');
const { hashPassword, verifyPassword } = require('../utils/password');
const { createAccessToken } = require('../utils/jwt');

// POST /auth/login: Login endpoint that returns JWT token.
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        
        // Find user: Look up user by email.
        const user = await userRepository.findByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Verify password: Compare provided password with stored hash.
        const isValid = await verifyPassword(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Create token: Generate JWT with user data.
        const token = createAccessToken({
            userId: user.id,
            email: user.email
        });
        
        // Return token: Send JWT to client.
        res.json({
            access_token: token,
            token_type: 'Bearer',
            expires_in: '30m'
        });
    } catch (error) {
        next(error);  // Pass to error handler
    }
});

module.exports = router;
```

### Authentication Middleware

```javascript
const { verifyToken } = require('../utils/jwt');
const userRepository = require('../repositories/userRepository');

// authenticate: Middleware to verify JWT token on protected routes.
const authenticate = async (req, res, next) => {
    try {
        // Get token: Extract from Authorization header.
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const token = authHeader.substring(7);  // Remove 'Bearer ' prefix
        
        // Verify token: Validate and decode JWT.
        const payload = verifyToken(token);
        
        // Get user: Fetch user from database (optional, for fresh user data).
        const user = await userRepository.findById(payload.userId);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        
        // Attach user to request: Available in route handlers.
        req.user = user;
        req.userId = payload.userId;
        
        next();  // Continue to route handler
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

module.exports = { authenticate };
```

**Explanation:** Middleware extracts token from Authorization header, verifies token, fetches user from database, and attaches user to request object for use in route handlers.

### Protected Route Example

```javascript
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const userController = require('../controllers/userController');

// GET /users/me: Get current user (requires authentication).
router.get('/me', authenticate, userController.getCurrentUser);

// In controller:
async function getCurrentUser(req, res, next) {
    try {
        // req.user is available from authenticate middleware
        res.json(req.user);
    } catch (error) {
        next(error);
    }
}
```

## Step 6: Refresh Tokens

```javascript
// createRefreshToken: Generate long-lived refresh token.
function createRefreshToken(data) {
    const payload = {
        ...data,
        type: 'refresh'  // Token type: Refresh token
    };
    
    return jwt.sign(
        payload,
        config.JWT_SECRET,
        {
            algorithm: config.JWT_ALGORITHM,
            expiresIn: config.JWT_REFRESH_EXPIRES_IN  // Longer expiration (7 days)
        }
    );
}

// Refresh token endpoint: Exchange refresh token for new access token.
router.post('/refresh', async (req, res, next) => {
    try {
        const { refresh_token } = req.body;
        
        // Verify refresh token: Validate refresh token.
        const payload = jwt.verify(refresh_token, config.JWT_SECRET);
        
        if (payload.type !== 'refresh') {
            return res.status(401).json({ error: 'Invalid token type' });
        }
        
        // Create new access token: Generate fresh access token.
        const accessToken = createAccessToken({
            userId: payload.userId,
            email: payload.email
        });
        
        res.json({
            access_token: accessToken,
            token_type: 'Bearer',
            expires_in: '30m'
        });
    } catch (error) {
        res.status(401).json({ error: 'Invalid refresh token' });
    }
});
```

## Best Practices

### 1. **Store Secrets Securely**
Never commit secrets to git. Use environment variables:

```javascript
// .env file (not in git)
JWT_SECRET=your-super-secret-key-here
JWT_EXPIRES_IN=30m
```

### 2. **Token Expiration**
Use short-lived access tokens (15-30 minutes) and longer refresh tokens (7 days):

```javascript
const accessToken = createAccessToken(data, '30m');  // Short-lived
const refreshToken = createRefreshToken(data);  // Long-lived
```

### 3. **Secure Token Storage**
Store tokens securely on client (httpOnly cookies or secure storage):

```javascript
// Set httpOnly cookie (more secure than localStorage)
res.cookie('token', token, {
    httpOnly: true,  // Not accessible via JavaScript
    secure: process.env.NODE_ENV === 'production',  // HTTPS only in production
    sameSite: 'strict'  // CSRF protection
});
```

### 4. **Error Handling**
Provide clear error messages:

```javascript
catch (error) {
    if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
    }
    next(error);
}
```

## Summary

JWT implementation in Express.js requires: Installing dependencies (jsonwebtoken, bcryptjs), configuring JWT settings (secret, algorithm, expiration), creating and verifying tokens, hashing passwords with bcrypt, implementing authentication middleware, and handling refresh tokens for long-lived sessions.

---

## 🎯 Interview Questions: JWT Implementation

### Q1: Explain the fundamental architecture of JWT (JSON Web Tokens) and why they are stateless. What are the three parts of a JWT, and how does statelessness impact scalability in Express.js applications?

**Answer:**

A JSON Web Token (JWT) is fundamentally a **cryptographic container for claims**, designed to be completely self-sufficient. Its stateless nature means that the server can trust the information inside the token simply by verifying its digital signature, eliminating the need for expensive database lookups or shared session storage across a cluster of Express servers.

**JWT Architecture:**

A JWT is a **self-contained token** that encodes claims (user data) in a JSON format, signed to ensure integrity. It consists of three parts separated by dots: `header.payload.signature`.

**Three Parts:**

1. **Header**: Algorithm and token type
   ```json
   {
     "alg": "HS256",
     "typ": "JWT"
   }
   ```
   - Encoded as Base64URL

2. **Payload**: Claims (user data, expiration, issuer)
   ```json
   {
     "sub": "user123",
     "iat": 1234567890,
     "exp": 1234571490
   }
   ```
   - Encoded as Base64URL

3. **Signature**: HMAC signature of header + payload
   ```
   HMACSHA256(
     base64UrlEncode(header) + "." + base64UrlEncode(payload),
     secret
   )
   ```

**Statelessness:**

JWTs are **stateless** because the server doesn't store session data. All necessary information (user ID, permissions) is encoded in the token itself. The server verifies the token's signature to ensure it hasn't been tampered with, but doesn't need to look up session data in a database or cache.

**Impact on Scalability:**

1. **Horizontal Scaling**: No shared session store needed
   - Traditional sessions: Require Redis/database for session storage (single point of failure, scaling bottleneck)
   - JWTs: Stateless, any server can verify token (no shared state)

2. **Reduced Database Load**: No session lookups on every request
   - Traditional: `SELECT * FROM sessions WHERE session_id = ?` on every request
   - JWTs: Verify signature (CPU operation, no I/O)

3. **Microservices**: Token can be passed between services
   - Service A validates token, passes to Service B (no shared session store)
   - Each service can independently verify token

**Visual Comparison:**

```
Stateless (JWT):
Client → Server1: Token → Verify Signature → Process Request
Client → Server2: Token → Verify Signature → Process Request
(No shared state, any server can verify)

Stateful (Sessions):
Client → Server1: Session ID → Lookup Redis → Process Request
Client → Server2: Session ID → Lookup Redis → Process Request
(Shared Redis required, scaling bottleneck)
```

**System Design Consideration**: Statelessness enables **horizontal scaling** (add servers without shared state) and **microservices architecture** (services don't share session store). However, JWTs cannot be revoked easily (requires blacklist or short expiration), so use refresh tokens for long-lived sessions and access tokens for short-lived operations.

---

### Q2: What is the difference between "access tokens" and "refresh tokens" in JWT-based authentication? Explain the security implications and when you would use each type.

**Answer:**

The dual-token strategy is a **security-in-depth pattern** designed to balance session longevity with the risk of token theft. Access tokens act as short-lived keys for immediate API consumption, while refresh tokens reside in more secure storage to handle session renewal without requiring the user to repeatedly re-authenticate.

**Access Token**: Short-lived token (e.g., 15 minutes) used for API requests. Contains user identity and permissions.

**Refresh Token**: Long-lived token (e.g., 7 days) used to obtain new access tokens. Stored securely (HTTP-only cookie) and not sent with every request.

**Key Differences:**

| Aspect | Access Token | Refresh Token |
|--------|--------------|---------------|
| **Lifetime** | Short (15 min - 1 hour) | Long (7-30 days) |
| **Usage** | Every API request | Only to refresh access token |
| **Storage** | Memory (JavaScript) | HTTP-only cookie or secure storage |
| **Revocation** | Expires quickly | Can be revoked server-side |
| **Scope** | Contains user data | Minimal data (just token ID) |

**Security Implications:**

1. **Access Token Exposure**: If stolen, short lifetime limits damage
   - Attacker has access for only 15 minutes (vs. 7 days if access token was long-lived)
   - Visual: Stolen token → Used for 15 min → Expires → Attacker loses access

2. **Refresh Token Security**: Stored in HTTP-only cookie prevents XSS
   - JavaScript cannot access HTTP-only cookies (XSS protection)
   - Refresh token not exposed in client-side code

3. **Token Rotation**: Refresh tokens can be rotated on each use
   - Old refresh token invalidated, new one issued
   - Prevents replay attacks if refresh token is stolen

**Implementation Flow:**

```
1. Login:
   POST /auth/login
   → Verify credentials
   → Generate access token (15 min) + refresh token (7 days)
   → Return access token in response body
   → Set refresh token in HTTP-only cookie

2. API Request:
   GET /api/users/me
   Headers: { Authorization: Bearer <access_token> }
   → Verify access token signature
   → Process request

3. Access Token Expired:
   GET /api/users/me
   → Access token expired (401 Unauthorized)
   → Client calls refresh endpoint

4. Refresh:
   POST /auth/refresh
   Cookie: refresh_token=<token>
   → Verify refresh token
   → Generate new access token
   → Optionally rotate refresh token
   → Return new access token
```

**When to Use Each:**

- **Access Token**: Every authenticated API request (user data, permissions)
- **Refresh Token**: Only when access token expires (obtain new access token)

**System Design Consideration**: This two-token pattern provides **security** (short-lived access tokens limit exposure) and **usability** (refresh tokens maintain session without re-login). Access tokens are **stateless** (no revocation), while refresh tokens can be **revoked** (stored in database, can be invalidated). Essential for production systems where token theft is a concern.

---

### Q3: Explain how JWT signature verification works and why it prevents token tampering. What happens if someone modifies the payload of a JWT without changing the signature?

**Answer:**

Signature verification is the **trust mechanism that guarantees the integrity** of a JWT. By recalculating the cryptographic hash of the token's content using a private secret, the server can instantly detect if even a single character in the payload has been altered, ensuring that the user's identity and permissions haven't been maliciously escalated.

**JWT Signature Verification:**

The signature is created by hashing the header and payload with a secret key. When verifying, the server recalculates the signature and compares it with the signature in the token. If they match, the token is authentic; if not, it has been tampered with.

**Signature Creation:**

```
Signature = HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  secret_key
)
```

**Verification Process:**

1. **Extract Parts**: Split token by `.` to get header, payload, signature
2. **Recalculate Signature**: Use same algorithm and secret to hash header + payload
3. **Compare**: If calculated signature matches token signature → valid, else → tampered

**Visual Flow:**

```
Token: header.payload.signature

Verification:
1. Extract: header, payload, signature
2. Calculate: HMACSHA256(header + "." + payload, secret) = new_signature
3. Compare: new_signature === signature?
   - Match → Token valid ✓
   - Mismatch → Token tampered ✗
```

**What Happens if Payload is Modified:**

If someone modifies the payload (e.g., changes `user_id` from `123` to `456`) without recalculating the signature:

```
Original Token:
header.payload.signature
(All parts match)

Modified Token:
header.modified_payload.signature
(Old signature doesn't match new payload)

Verification:
HMACSHA256(header + "." + modified_payload, secret) ≠ old_signature
→ Verification FAILS
→ Token rejected as tampered
```

**Why This Works:**

- **Cryptographic Hash**: HMAC-SHA256 is a one-way function (cannot reverse)
- **Secret Key**: Only server knows secret (attacker cannot generate valid signature)
- **Integrity Check**: Signature proves token hasn't been modified

**Security Properties:**

1. **Authenticity**: Signature proves token came from server (knows secret)
2. **Integrity**: Any modification invalidates signature
3. **Non-Repudiation**: Server cannot deny creating token (signature proves origin)

**System Design Consideration**: Signature verification is the **core security mechanism** of JWTs. It ensures tokens cannot be tampered with (modify user ID, permissions) without detection. However, **signature verification doesn't prevent token theft** (if token is stolen, attacker can use it until expiration). Use HTTPS to prevent token interception and short expiration times to limit damage from theft.

---

### Q4: What are the security vulnerabilities of JWTs, and how would you mitigate them in a production Express.js application? Discuss token storage, XSS attacks, and token revocation.

**Answer:**

Securing JWTs in production requires a **multi-pronged defense strategy** against common web vulnerabilities. This involves moving beyond basic token issuance to address persistent threats like Cross-Site Scripting (XSS), Man-in-the-Middle (MITM) attacks, and the inherent difficulty of revoking stateless credentials before they expire.

**Common JWT Vulnerabilities:**

1. **XSS (Cross-Site Scripting)**: Stolen tokens from localStorage
2. **Token Theft**: Intercepted tokens (man-in-the-middle)
3. **No Revocation**: Cannot invalidate token until expiration
4. **Algorithm Confusion**: Weak algorithms (HS256 vs RS256)
5. **Token Size**: Large tokens increase request size

**Mitigation Strategies:**

**1. Token Storage (XSS Prevention):**

**Vulnerable (localStorage):**
```javascript
// BAD: XSS can steal token
localStorage.setItem('token', accessToken);
// Attacker's script: const token = localStorage.getItem('token');
```

**Secure (HTTP-only Cookie):**
```javascript
// GOOD: HTTP-only cookie not accessible to JavaScript
res.cookie('access_token', accessToken, {
    httpOnly: true,  // Not accessible via JavaScript
    secure: true,    // HTTPS only
    sameSite: 'strict'  // CSRF protection
});
```

**2. XSS Attack Prevention:**

- **Input Sanitization**: Sanitize user input to prevent script injection
- **Content Security Policy (CSP)**: Restrict script sources
- **HTTP-only Cookies**: Tokens not accessible to JavaScript (XSS cannot steal)

**3. Token Revocation:**

**Problem**: JWTs are stateless, cannot be revoked until expiration.

**Solutions:**

**A. Token Blacklist (Redis):**
```javascript
// On logout or revocation
await redis.setEx(`blacklist:${tokenId}`, expirationTime, '1');

// In middleware
const tokenId = jwt.decode(token).jti;  // JWT ID
const blacklisted = await redis.get(`blacklist:${tokenId}`);
if (blacklisted) {
    return res.status(401).json({ error: 'Token revoked' });
}
```

**B. Short Expiration + Refresh Tokens:**
```javascript
// Access token: 15 minutes (short-lived, no revocation needed)
// Refresh token: 7 days (can be revoked in database)
const refreshToken = await RefreshToken.findOne({ where: { token } });
if (!refreshToken || refreshToken.revoked) {
    return res.status(401).json({ error: 'Token revoked' });
}
```

**C. Database Session Check:**
```javascript
// Store token ID in database, check on each request
const tokenRecord = await Token.findOne({ where: { jti: tokenId } });
if (!tokenRecord || tokenRecord.revoked) {
    return res.status(401).json({ error: 'Token revoked' });
}
```

**4. Algorithm Confusion:**

**Vulnerable:**
```javascript
// BAD: Accepts any algorithm
jwt.verify(token, secret);  // May accept 'none' algorithm
```

**Secure:**
```javascript
// GOOD: Explicitly specify algorithm
jwt.verify(token, secret, { algorithms: ['HS256'] });
```

**5. HTTPS (Token Theft Prevention):**

- **Always use HTTPS**: Prevents man-in-the-middle attacks
- **Secure Flag**: Cookies only sent over HTTPS
- **HSTS**: Force HTTPS connections

**Complete Security Implementation:**

```javascript
// Secure JWT middleware
async function authenticateToken(req, res, next) {
    const token = req.cookies.access_token;  // HTTP-only cookie
    
    if (!token) {
        return res.status(401).json({ error: 'No token' });
    }
    
    try {
        // Verify with explicit algorithm
        const decoded = jwt.verify(token, process.env.JWT_SECRET, {
            algorithms: ['HS256']  // Prevent algorithm confusion
        });
        
        // Check blacklist
        const blacklisted = await redis.get(`blacklist:${decoded.jti}`);
        if (blacklisted) {
            return res.status(401).json({ error: 'Token revoked' });
        }
        
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}
```

**System Design Consideration**: JWT security requires **defense in depth**: secure storage (HTTP-only cookies), input sanitization (XSS prevention), token revocation (blacklist or short expiration), algorithm specification (prevent confusion), and HTTPS (prevent interception). No single measure is sufficient; combine multiple strategies for production-grade security.

---

### Q5: Explain the concept of "JWT claims" and how you would implement role-based access control (RBAC) using JWT claims in an Express.js application. What are the trade-offs of embedding permissions in tokens vs. looking them up from a database?

**Answer:**

JWT claims are the **building blocks of identity-aware APIs**, allowing you to embed authorization logic directly within the credential itself. Using these claims for Role-Based Access Control (RBAC) allows Express middleware to make instantaneous, high-performance security decisions without the latency of a database round-trip.

**JWT Claims:**

Claims are **key-value pairs** in the JWT payload that represent information about the user (identity, permissions, metadata). Standard claims include `sub` (subject/user ID), `iat` (issued at), `exp` (expiration), while custom claims can include roles, permissions, or any application-specific data.

**RBAC with JWT Claims:**

**Embedding Roles in Token:**

```javascript
// Create token with roles
const token = jwt.sign({
    sub: user.id,
    email: user.email,
    roles: ['user', 'admin'],  // Custom claim
    permissions: ['read:users', 'write:users']  // Custom claim
}, process.env.JWT_SECRET, { expiresIn: '15m' });

// Middleware to check roles
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        const userRoles = req.user.roles || [];
        const hasRole = allowedRoles.some(role => userRoles.includes(role));
        
        if (!hasRole) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
}

// Usage
app.get('/admin/users', authenticateToken, requireRole('admin'), async (req, res) => {
    // Only admins can access
});
```

**Permission-Based Access:**

```javascript
// Check specific permission
function requirePermission(permission) {
    return (req, res, next) => {
        const userPermissions = req.user.permissions || [];
        
        if (!userPermissions.includes(permission)) {
            return res.status(403).json({ error: 'Permission denied' });
        }
        next();
    };
}

// Usage
app.delete('/users/:id', 
    authenticateToken, 
    requirePermission('delete:users'),
    async (req, res) => {
        // Only users with 'delete:users' permission
    }
);
```

**Trade-offs: Embedding vs. Database Lookup**

**Embedding in Token (Stateless):**

**Pros:**
- **Performance**: No database query on each request (faster)
- **Scalability**: Stateless, works across multiple servers
- **Offline Validation**: Can verify permissions without database

**Cons:**
- **Token Size**: Large tokens (more data = bigger token)
- **Stale Data**: Permissions updated in DB don't reflect in token until re-login
- **No Revocation**: Cannot revoke permissions until token expires
- **Security Risk**: If token stolen, attacker has permissions until expiration

**Database Lookup (Stateful):**

**Pros:**
- **Real-Time Updates**: Permissions changes take effect immediately
- **Revocation**: Can revoke permissions instantly
- **Smaller Tokens**: Token only contains user ID
- **Audit Trail**: Can log permission checks

**Cons:**
- **Performance**: Database query on every request (slower)
- **Scalability**: Database becomes bottleneck (shared state)
- **Availability**: Requires database to be available

**Hybrid Approach (Best Practice):**

```javascript
// Token contains roles (lightweight)
const token = jwt.sign({
    sub: user.id,
    roles: ['user', 'admin']  // Roles change infrequently
}, process.env.JWT_SECRET);

// Permissions cached in Redis (fast lookup, can be invalidated)
async function getUserPermissions(userId) {
    const cacheKey = `permissions:${userId}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
        return JSON.parse(cached);
    }
    
    // Fetch from database
    const permissions = await getPermissionsFromDB(userId);
    await redis.setEx(cacheKey, 3600, JSON.stringify(permissions));  // 1 hour TTL
    
    return permissions;
}

// Middleware
async function requirePermission(permission) {
    return async (req, res, next) => {
        const permissions = await getUserPermissions(req.user.sub);
        
        if (!permissions.includes(permission)) {
            return res.status(403).json({ error: 'Permission denied' });
        }
        next();
    };
}
```

**System Design Consideration**: Use **embedded claims** for **infrequently changing data** (roles, user ID) and **database/cache lookup** for **frequently changing data** (permissions, feature flags). Balance between **performance** (stateless tokens) and **flexibility** (real-time permission updates). For high-security systems, prefer database lookup with caching for immediate revocation; for high-performance systems, embed permissions with short token expiration.

