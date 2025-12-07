# CORS Configuration: Cross-Origin Resource Sharing

CORS (Cross-Origin Resource Sharing) allows browsers to make requests to different origins. Understanding CORS is essential for API integration.

## What is CORS?

**CORS** is a security mechanism that allows or restricts cross-origin requests.

### Same-Origin Policy

```javascript
// Same origin: Same protocol, domain, port
https://example.com → https://example.com/api  // ✅ Same origin

// Different origin: Different domain
https://example.com → https://api.example.com  // ❌ Different origin

// CORS allows cross-origin requests
```

## CORS Headers

### Access-Control-Allow-Origin

```javascript
// Allow all origins
'Access-Control-Allow-Origin': '*'

// Allow specific origin
'Access-Control-Allow-Origin': 'https://example.com'
```

### Access-Control-Allow-Methods

```javascript
// Allow specific methods
'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE'
```

### Access-Control-Allow-Headers

```javascript
// Allow specific headers
'Access-Control-Allow-Headers': 'Content-Type, Authorization'
```

## Preflight Requests

**Preflight** is an OPTIONS request sent before actual request for complex requests.

```javascript
// Browser sends preflight for:
// - PUT, DELETE, PATCH methods
// - Custom headers
// - Content-Type other than simple

// Preflight request
OPTIONS /api/users HTTP/1.1
Origin: https://example.com
Access-Control-Request-Method: POST
Access-Control-Request-Headers: Content-Type

// Server response
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://example.com
Access-Control-Allow-Methods: POST
Access-Control-Allow-Headers: Content-Type
```

## Real-World Examples

### Example 1: CORS Configuration

```javascript
// Express.js CORS middleware
const cors = require('cors');

app.use(cors({
    origin: 'https://example.com',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
```

## Best Practices

1. **Specific Origins**: Don't use '*' in production
2. **Credentials**: Set credentials: true for cookies
3. **Methods**: Allow only needed methods
4. **Headers**: Allow only needed headers
5. **Preflight**: Handle OPTIONS requests

## Summary

**CORS Configuration:**

1. **Purpose**: Allow cross-origin requests
2. **Headers**: Access-Control-Allow-Origin, Methods, Headers
3. **Preflight**: OPTIONS request for complex requests
4. **Best Practice**: Specific origins, needed methods/headers
5. **Security**: Don't use '*' in production

**Key Takeaway:**
CORS allows cross-origin requests. Configure with Access-Control-Allow-Origin, Methods, and Headers. Handle preflight (OPTIONS) requests. Use specific origins, not '*'. Allow only needed methods and headers. Set credentials: true for cookies.

**CORS Strategy:**
- Specific origins
- Needed methods
- Needed headers
- Handle preflight
- Secure configuration

**Next Steps:**
- Learn [XSS Prevention](xss_prevention.md) for security
- Study [CSRF Prevention](csrf_prevention.md) for attacks
- Master [Security Best Practices](security_best_practices.md) for comprehensive security

---

## 🎯 Interview Questions: Frontend

### Q1: Explain CORS (Cross-Origin Resource Sharing) in detail, including why it exists, how it works, preflight requests, and how to configure it properly. Provide examples showing CORS configuration and common issues.

**Answer:**

**CORS Definition:**

CORS (Cross-Origin Resource Sharing) is a security mechanism implemented by browsers that allows web pages to make requests to a different domain than the one serving the web page. It's an extension of the Same-Origin Policy that provides controlled access to resources across origins.

**Same-Origin Policy:**

**What is Same-Origin:**
Two URLs have the same origin if they have the same:
- Protocol (http/https)
- Domain (example.com)
- Port (80, 443, 3000, etc.)

**Examples:**
```javascript
// Same origin
https://example.com/page1 → https://example.com/api
// ✅ Same protocol, domain, port

// Different origin
https://example.com → https://api.example.com
// ❌ Different domain

https://example.com → http://example.com
// ❌ Different protocol

https://example.com → https://example.com:3000
// ❌ Different port
```

**Why CORS Exists:**

**Security:**
- Prevents malicious websites from accessing resources
- Protects user data from unauthorized access
- Maintains security boundaries

**Necessity:**
- Modern web apps need to access APIs from different domains
- Microservices architecture requires cross-origin requests
- CDN and API hosting on different domains

**How CORS Works:**

**Simple Request:**
```javascript
// Simple request (no preflight)
// Conditions:
// - GET, POST, or HEAD method
// - Only simple headers (Accept, Content-Language, Content-Type)
// - Content-Type: text/plain, application/x-www-form-urlencoded, multipart/form-data

fetch('https://api.example.com/users', {
    method: 'GET',
    headers: {
        'Accept': 'application/json'
    }
});

// Browser automatically includes:
// Origin: https://example.com

// Server must respond with:
// Access-Control-Allow-Origin: https://example.com
```

**Preflight Request:**

**When Preflight is Sent:**
- PUT, DELETE, PATCH methods
- Custom headers (Authorization, X-Custom-Header)
- Content-Type: application/json

**Preflight Flow:**
```
1. Browser sends OPTIONS request (preflight)
   OPTIONS /api/users HTTP/1.1
   Origin: https://example.com
   Access-Control-Request-Method: POST
   Access-Control-Request-Headers: Content-Type, Authorization

2. Server responds with CORS headers
   HTTP/1.1 200 OK
   Access-Control-Allow-Origin: https://example.com
   Access-Control-Allow-Methods: POST, GET, PUT, DELETE
   Access-Control-Allow-Headers: Content-Type, Authorization
   Access-Control-Max-Age: 86400

3. Browser sends actual request (if preflight succeeds)
   POST /api/users HTTP/1.1
   Origin: https://example.com
   Content-Type: application/json
   Authorization: Bearer token
   { "name": "John" }

4. Server responds with CORS headers
   HTTP/1.1 201 Created
   Access-Control-Allow-Origin: https://example.com
   { "id": 1, "name": "John" }
```

**CORS Headers:**

**Access-Control-Allow-Origin:**
```javascript
// Allow specific origin
'Access-Control-Allow-Origin': 'https://example.com'

// Allow all origins (NOT recommended for production)
'Access-Control-Allow-Origin': '*'

// Dynamic origin (check and allow)
const allowedOrigins = ['https://example.com', 'https://app.example.com'];
const origin = req.headers.origin;
if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
}
```

**Access-Control-Allow-Methods:**
```javascript
// Allow specific methods
'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE'

// Allow all methods (not recommended)
'Access-Control-Allow-Methods': '*'
```

**Access-Control-Allow-Headers:**
```javascript
// Allow specific headers
'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Custom-Header'

// Allow all headers (not recommended)
'Access-Control-Allow-Headers': '*'
```

**Access-Control-Allow-Credentials:**
```javascript
// Allow cookies/credentials
'Access-Control-Allow-Credentials': 'true'

// When using credentials, cannot use '*' for origin
// Must specify exact origin
```

**Access-Control-Max-Age:**
```javascript
// Cache preflight response (in seconds)
'Access-Control-Max-Age': '86400'  // 24 hours
```

**CORS Configuration Examples:**

**Express.js:**
```javascript
const express = require('express');
const cors = require('cors');
const app = express();

// Simple CORS
app.use(cors());

// Specific origin
app.use(cors({
    origin: 'https://example.com'
}));

// Multiple origins
app.use(cors({
    origin: ['https://example.com', 'https://app.example.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Dynamic origin
app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = [
            'https://example.com',
            'https://app.example.com',
            'http://localhost:3000'  // Development
        ];
        
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
```

**Manual CORS Headers:**
```javascript
// Express middleware
app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = ['https://example.com'];
    
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    next();
});
```

**Common CORS Issues:**

**1. CORS Error: No 'Access-Control-Allow-Origin' Header**
```javascript
// Problem: Server not sending CORS headers
// Solution: Add CORS headers to server response

// Error message:
// Access to fetch at 'https://api.example.com/users' from origin 
// 'https://example.com' has been blocked by CORS policy: 
// No 'Access-Control-Allow-Origin' header is present
```

**2. Credentials with Wildcard Origin**
```javascript
// ❌ Problem: Cannot use '*' with credentials
app.use(cors({
    origin: '*',  // Wildcard
    credentials: true  // Error!
}));

// ✅ Solution: Specify exact origin
app.use(cors({
    origin: 'https://example.com',  // Specific origin
    credentials: true
}));
```

**3. Preflight Not Handled**
```javascript
// Problem: OPTIONS request not handled
// Solution: Handle OPTIONS request

app.options('/api/users', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', 'https://example.com');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(200).end();
});
```

**4. Missing Headers in Preflight Response**
```javascript
// Problem: Preflight succeeds but actual request fails
// Solution: Include all needed headers in preflight response

// Preflight response must include:
Access-Control-Allow-Origin: https://example.com
Access-Control-Allow-Methods: POST
Access-Control-Allow-Headers: Content-Type, Authorization
```

**Best Practices:**

**1. Specific Origins:**
```javascript
// ✅ Good: Specific origins
origin: ['https://example.com', 'https://app.example.com']

// ❌ Bad: Wildcard in production
origin: '*'
```

**2. Minimal Methods:**
```javascript
// ✅ Good: Only needed methods
methods: ['GET', 'POST']

// ❌ Bad: All methods
methods: ['*']
```

**3. Minimal Headers:**
```javascript
// ✅ Good: Only needed headers
allowedHeaders: ['Content-Type', 'Authorization']

// ❌ Bad: All headers
allowedHeaders: ['*']
```

**4. Credentials Handling:**
```javascript
// ✅ Good: Explicit credentials
credentials: true
// Must specify exact origin (not '*')

// ❌ Bad: Credentials with wildcard
origin: '*',
credentials: true  // Error!
```

**5. Preflight Caching:**
```javascript
// ✅ Good: Cache preflight
Access-Control-Max-Age: 86400

// Reduces preflight requests
```

**System Design Consideration**: CORS is essential for:
1. **Security**: Controlled cross-origin access
2. **API Design**: Enabling cross-origin API access
3. **Microservices**: Communication between services
4. **User Experience**: Seamless cross-origin requests

CORS allows controlled cross-origin requests while maintaining security. Understanding preflight requests, CORS headers, and proper configuration is crucial for building secure web applications. Always use specific origins in production, handle preflight requests, and configure minimal required permissions.

