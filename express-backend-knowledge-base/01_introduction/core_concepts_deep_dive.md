# Express.js Core Concepts: The Pillars of Power

Understanding Express.js core concepts is essential for building robust applications. This guide covers the fundamental building blocks.

## 1. Middleware: The Request Pipeline

Express.js is built around middleware functions. Middleware functions have access to the request object (`req`), the response object (`res`), and the next middleware function in the application's request-response cycle.

### Understanding Middleware

```javascript
// Basic middleware: Logs request details before passing to next handler.
const loggerMiddleware = (req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();  // Pass control to the next middleware/route handler
};

// Use middleware: Apply to all routes.
app.use(loggerMiddleware);
```

**Explanation:** Middleware runs in order. The `next()` call is crucial; it tells Express to move to the next function in the stack. Without `next()`, the request hangs.

### Middleware Types

**Application-level middleware:**
```javascript
// Applies to all routes: Runs for every request.
app.use(express.json());                      // Parse JSON bodies
app.use(express.urlencoded({ extended: true }));  // Parse URL-encoded bodies (forms)
app.use(cors());                              // Enable CORS
```

#### 1) `express.json()` – JSON body parser

**What it does**:  
- Reads the raw request body for `Content-Type: application/json`  
- Parses JSON → attaches result to `req.body`  
- If JSON is invalid, throws a **400 Bad Request** error

**Example:**
```javascript
app.use(express.json());

app.post('/login', (req, res) => {
    // If request is: { "email": "a@b.com", "password": "secret" }
    console.log(req.body);
    // Output in Node:
    // { email: 'a@b.com', password: 'secret' }

    res.json({ ok: true });
});
```

**Request (valid JSON):**
```http
POST /login HTTP/1.1
Content-Type: application/json

{ "email": "a@b.com", "password": "secret" }
```
**Response:**
```json
{ "ok": true }
```

**When it causes errors:**
- **Invalid JSON syntax**:
    ```http
    { email: "a@b.com" }   // missing quotes around key → invalid JSON
    ```
  - Express throws `SyntaxError: Unexpected token e...` internally
  - Default behavior: **400 Bad Request** response (or your error middleware handles it)
- **Wrong Content-Type**:
  - If client sends JSON but **without** `Content-Type: application/json`, `express.json()` **won't parse** it → `req.body` stays `{}`.

#### 2) `express.urlencoded({ extended: true })` – Form body parser

**What it does**:  
- Parses `application/x-www-form-urlencoded` bodies (HTML forms)  
- For example: `name=Nikita&age=25` → `{ name: 'Nikita', age: '25' }`  
- `extended: true` uses `qs` library → supports nested objects/arrays

**Example (simple form):**
```javascript
app.use(express.urlencoded({ extended: true }));

app.post('/contact', (req, res) => {
    console.log(req.body);
    // Request body: name=Nikita&message=Hello
    // Output:
    // { name: 'Nikita', message: 'Hello' }

    res.json({ received: true, data: req.body });
});
```

**Example (nested fields with `extended: true`):**
```http
POST /profile HTTP/1.1
Content-Type: application/x-www-form-urlencoded

user[name]=Nikita&user[skills][]=node&user[skills][]=express
```
```javascript
app.use(express.urlencoded({ extended: true }));

app.post('/profile', (req, res) => {
    console.log(req.body);
    // Output with extended: true
    // {
    //   user: {
    //     name: 'Nikita',
    //     skills: ['node', 'express']
    //   }
    // }
});
```

**When it causes errors / gotchas:**
- Payload too big → if you configure a small `limit`, Express can return **413 Payload Too Large**.
- Wrong content-type → if client sends `application/json` but only `urlencoded` middleware is configured, `req.body` will be `{}`.
- If you use `extended: false`, nested data like `user[name]` will not parse into objects properly (it will be a flat string).

#### 3) `cors()` – Cross-Origin Resource Sharing

**What it does**:  
- Adds CORS headers so browsers can call your API from **different origins** (domains/ports).  
- Without CORS, browser blocks frontend requests like `http://localhost:3000` → `http://localhost:4000`.

**Basic usage:**
```javascript
const cors = require('cors');

// Allow all origins (dev only; not recommended for strict prod)
app.use(cors());

// Locked-down example: only allow specific origin
// app.use(cors({
//   origin: 'https://my-frontend.com'
// }));

app.get('/public', (req, res) => {
    res.json({ message: 'This is public data' });
});
```

**Response headers with `cors()` (dev mode):**
```http
HTTP/1.1 200 OK
Access-Control-Allow-Origin: *
Content-Type: application/json; charset=utf-8

{ "message": "This is public data" }
```

**When CORS causes issues:**
- **No CORS middleware**:
  - Browser shows: `CORS error / Access-Control-Allow-Origin missing` in console.
  - API works in tools like Postman, but fails from browser frontend.
- **Misconfigured origin**:
  ```javascript
  app.use(cors({ origin: 'https://prod.com' }));
  ```
  - If you call API from `http://localhost:3000` in dev → CORS blocked.
- **Preflight (OPTIONS) not handled**:
  - For non-simple requests (PUT/DELETE, custom headers), browser sends an `OPTIONS` request first.
  - `cors()` handles this automatically; without it, preflight can fail.

**Router-level middleware:**
```javascript
// Applies to specific routes: Only runs for matching routes.
router.use('/users', authenticateToken);  // Only for /users routes
```

**Error-handling middleware:**
```javascript
// Error handler: Must have 4 parameters (err, req, res, next).
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});
```

## 2. Routing: Organizing Endpoints

Express routing matches URL patterns to handler functions.

### Basic Routing

```javascript
// GET route: Handle GET requests.
app.get('/users/:id', (req, res) => {
    const userId = req.params.id;  // Extract from URL
    res.json({ id: userId, name: 'John Doe' });
});

// POST route: Handle POST requests.
app.post('/users', (req, res) => {
    const userData = req.body;  // Request body (parsed by express.json())
    res.status(201).json({ id: 1, ...userData });
});
```

### Router Module

```javascript
// routes/users.routes.js: Organize routes into modules.
const express = require('express');
const router = express.Router();

// Route handlers: Group related routes.
router.get('/', async (req, res, next) => {
    try {
        const users = await userService.getAllUsers();
        res.json(users);
    } catch (error) {
        next(error);
    }
});

router.get('/:id', async (req, res, next) => {
    try {
        const user = await userService.getUser(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
```

```javascript
// app.js: Mount router.
const usersRouter = require('./routes/users.routes');
app.use('/api/v1/users', usersRouter);  // All routes prefixed with /api/v1/users
```

## 3. Request and Response Objects

### Request Object (`req`)

```javascript
app.get('/example/:id', (req, res) => {
    // URL parameters: From route path.
    const id = req.params.id;  // /example/123 → id = "123"
    
    // Query parameters: From URL query string.
    const page = req.query.page;  // /example/123?page=2 → page = "2"
    
    // Request body: Parsed by body-parser middleware.
    const data = req.body;  // POST/PUT request body
    
    // Headers: HTTP headers.
    const auth = req.headers['authorization'];
    
    // Cookies: Parsed cookies (requires cookie-parser).
    const sessionId = req.cookies.sessionId;
    
    // Files: Uploaded files (requires multer).
    const file = req.file;
});
```

### Response Object (`res`)

```javascript
app.get('/example', (req, res) => {
    // Send JSON: Automatically sets Content-Type.
    res.json({ message: 'Hello' });
    
    // Send status: Set status code.
    res.status(201).json({ id: 1 });
    
    // Send text: Plain text response.
    res.send('Hello World');
    
    // Set headers: Custom headers.
    res.setHeader('X-Custom-Header', 'value');
    
    // Set cookies: Requires cookie-parser.
    res.cookie('sessionId', 'abc123', { maxAge: 3600000 });
    
    // Redirect: Redirect to another URL.
    res.redirect('/login');
});
```

## 4. Error Handling

### Try-Catch Pattern

```javascript
// Error handling: Catch errors and pass to error handler.
app.get('/users/:id', async (req, res, next) => {
    try {
        const user = await userService.getUser(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        next(error);  // Pass to error handler middleware
    }
});
```

### Centralized Error Handler

```javascript
// Error handler middleware: Must be last middleware.
app.use((err, req, res, next) => {
    console.error(err.stack);
    
    // Custom error types: Handle different error types.
    if (err instanceof ValidationError) {
        return res.status(400).json({ error: err.message });
    }
    
    if (err instanceof NotFoundError) {
        return res.status(404).json({ error: err.message });
    }
    
    // Default: 500 Internal Server Error
    res.status(500).json({ error: 'Internal server error' });
});
```

## 5. Async/Await in Express

Express supports async route handlers natively (since Express 5, or with express-async-errors).

### Async Route Handlers

```javascript
// Async route: Express handles promises automatically.
app.get('/users/:id', async (req, res, next) => {
    try {
        const user = await userService.getUser(req.params.id);
        res.json(user);
    } catch (error) {
        next(error);  // Pass errors to error handler
    }
});
```

### Express-Async-Errors (Express 4)

```javascript
// Install: npm install express-async-errors
require('express-async-errors');  // Must be imported before routes

// No try-catch needed: Errors automatically passed to error handler.
app.get('/users/:id', async (req, res) => {
    const user = await userService.getUser(req.params.id);
    res.json(user);  // If error occurs, automatically passed to error handler
});
```

## 6. Validation: Request Validation

### Joi Validation

```javascript
const Joi = require('joi');

// Validation schema: Define validation rules.
const userCreateSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    age: Joi.number().integer().min(18).required(),
});

// Validation middleware: Validate request body.
function validateRequest(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body);
        
        if (error) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.details.map(d => d.message)
            });
        }
        
        req.validatedData = value;  // Attach validated data
        next();
    };
}

// Use validation: Apply to route.
app.post('/users', validateRequest(userCreateSchema), async (req, res) => {
    const user = await userService.createUser(req.validatedData);
    res.status(201).json(user);
});
```

## 7. Path & Query Parameters

### Path Parameters (`/users/:id`)

```javascript
// Path parameter: Extract from URL path.
app.get('/users/:id', (req, res) => {
    const userId = req.params.id;  // Type is string, convert if needed
    const userIdInt = parseInt(req.params.id, 10);
    res.json({ id: userIdInt });
});

// Multiple parameters: Multiple path params.
app.get('/users/:userId/posts/:postId', (req, res) => {
    const { userId, postId } = req.params;
    res.json({ userId, postId });
});
```

### Query Parameters (`/users?page=1&limit=10`)

```javascript
// Query parameters: Optional configuration with defaults.
app.get('/users', (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;  // Default to 1
    const limit = parseInt(req.query.limit, 10) || 10;  // Default to 10
    
    res.json({ page, limit });
});
```

## 8. Static Files

```javascript
// Serve static files: Serve files from directory.
app.use(express.static('public'));  // Serve files from /public directory

// Access: GET /images/logo.png → serves public/images/logo.png
```

## 9. Template Engines

```javascript
// Set template engine: For server-side rendering.
app.set('view engine', 'ejs');
app.set('views', './views');

// Render template: Server-side rendering.
app.get('/profile', (req, res) => {
    res.render('profile', { user: req.user });  // Renders views/profile.ejs
});
```

## Summary

Express.js core concepts include:

1. **Middleware** - Request pipeline functions
2. **Routing** - URL pattern matching
3. **Request/Response** - HTTP request and response handling
4. **Error Handling** - Centralized error management
5. **Async/Await** - Asynchronous route handlers
6. **Validation** - Request data validation
7. **Path/Query Parameters** - URL parameter extraction
8. **Static Files** - Serving static assets
9. **Template Engines** - Server-side rendering

Understanding these concepts is essential for building robust Express.js applications.

---

## 🎯 Interview Questions: Express.js Core Concepts

### Q1: Explain the Express.js middleware execution flow. What happens if you forget to call `next()`?

**Answer:**

Express middleware executes in a **sequential pipeline**. Each middleware receives `req`, `res`, and `next`. Calling `next()` passes control to the next middleware; without it, the request **hangs indefinitely**.

**Execution Flow:**

```
Request
  │
  ▼
┌─────────────────────┐
│ Middleware 1        │
│ (logger)            │
└──────────┬──────────┘
           │ next()
           ▼
┌─────────────────────┐
│ Middleware 2        │
│ (auth)              │
└──────────┬──────────┘
           │ next()
           ▼
┌─────────────────────┐
│ Route Handler       │
│ app.get('/users')   │
└──────────┬──────────┘
           │
           ▼
      Response
```

**What happens without `next()`:**

```javascript
// ❌ Problem: Request hangs
app.use((req, res, next) => {
    console.log('Middleware 1');
    // Missing next() - request stops here
});

app.get('/users', (req, res) => {
    res.json({ users: [] }); // Never reached
});

// ✅ Solution: Always call next()
app.use((req, res, next) => {
    console.log('Middleware 1');
    next(); // Pass to next middleware
});
```

**Use Cases:**
- **Authentication**: Check token, call `next()` if valid, send 401 if invalid
- **Logging**: Log request, always call `next()` to continue
- **Rate Limiting**: Check limit, call `next()` or send 429

---

### Q2: How does Express handle async errors in route handlers? What's the difference between throwing an error and calling `next(error)`?

**Answer:**

Express **doesn't automatically catch** async errors. You must either use try-catch or pass errors to `next()`.

**Problem with async/await:**

```javascript
// ❌ Error not caught - crashes server
app.get('/users/:id', async (req, res) => {
    const user = await User.findById(req.params.id); // Throws if DB fails
    res.json(user);
});
```

**Solution 1: Try-Catch with next()**

```javascript
// ✅ Proper error handling
app.get('/users/:id', async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'Not found' });
        }
        res.json(user);
    } catch (error) {
        next(error); // Pass to error middleware
    }
});
```

**Solution 2: Async Handler Wrapper**

```javascript
// Wrapper function
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Usage
app.get('/users/:id', asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    res.json(user); // Error automatically caught
}));
```

**Error Middleware:**

```javascript
// Must have 4 parameters
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        error: err.message
    });
});
```

**Key Difference:**
- **`throw error`**: Crashes if not caught
- **`next(error)`**: Passes to error middleware (proper way)

---

### Q3: Explain the difference between `app.use()` and `app.get()`. When would you use each?

**Answer:**

**`app.use()` - All HTTP Methods:**

```javascript
// Matches ALL methods (GET, POST, PUT, DELETE, etc.)
app.use('/api', (req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Matches:
// ✅ GET    /api/users
// ✅ POST   /api/users
// ✅ PUT    /api/users/1
// ✅ DELETE /api/users/1
```

**`app.get()` - Specific Method:**

```javascript
// Matches ONLY GET requests
app.get('/api/users', (req, res) => {
    res.json({ users: [] });
});

// Matches:
// ✅ GET  /api/users
// ❌ POST /api/users (404)
```

**Visual Comparison:**

```
app.use('/api', middleware):
┌─────────────────────────────────┐
│  GET  /api/users     ✅ Match   │
│  POST /api/users     ✅ Match   │
│  PUT  /api/users/1   ✅ Match   │
└─────────────────────────────────┘

app.get('/api/users', handler):
┌─────────────────────────────────┐
│  GET  /api/users     ✅ Match   │
│  POST /api/users     ❌ 404     │
└─────────────────────────────────┘
```

**When to Use:**

- **`app.use()`**: Global middleware, path prefixes, error handlers
- **`app.get()`**: Specific route handlers, RESTful endpoints

---

### Q4: How does Express parse request bodies? What's the difference between `express.json()` and `express.urlencoded()`?

**Answer:**

Express uses **body-parser middleware** to parse request bodies. Without it, `req.body` is `undefined`.

**`express.json()` - JSON Bodies:**

```javascript
app.use(express.json());

// Handles: Content-Type: application/json
app.post('/users', (req, res) => {
    // req.body = { name: "John", email: "john@example.com" }
    console.log(req.body.name); // "John"
    res.json({ created: true });
});
```

**Request Example:**
```http
POST /users HTTP/1.1
Content-Type: application/json

{ "name": "John", "email": "john@example.com" }
```

**`express.urlencoded()` - Form Bodies:**

```javascript
app.use(express.urlencoded({ extended: true }));

// Handles: Content-Type: application/x-www-form-urlencoded
app.post('/login', (req, res) => {
    // req.body = { email: "john@example.com", password: "secret" }
    console.log(req.body.email); // "john@example.com"
    res.json({ success: true });
});
```

**Request Example:**
```http
POST /login HTTP/1.1
Content-Type: application/x-www-form-urlencoded

email=john@example.com&password=secret
```

**Key Differences:**

| Feature | `express.json()` | `express.urlencoded()` |
|--------|------------------|------------------------|
| Content-Type | `application/json` | `application/x-www-form-urlencoded` |
| Format | JSON object | URL-encoded string |
| Use Case | API requests | HTML forms |
| Nested Objects | Native support | Needs `extended: true` |

**Common Errors:**

```javascript
// ❌ Missing middleware
app.post('/users', (req, res) => {
    console.log(req.body); // undefined
});

// ✅ With middleware
app.use(express.json());
app.post('/users', (req, res) => {
    console.log(req.body); // { name: "John" }
});
```

---

### Q5: Explain Express routing with parameters. How does route order affect matching?

**Answer:**

Express matches routes **in the order they're defined**. First match wins, so **specific routes must come before parameterized routes**.

**Route Parameters:**

```javascript
// Single parameter
app.get('/users/:id', (req, res) => {
    const userId = req.params.id; // "123"
    res.json({ id: userId });
});

// Multiple parameters
app.get('/users/:userId/posts/:postId', (req, res) => {
    const { userId, postId } = req.params;
    res.json({ userId, postId });
});
```

**Route Order Matters:**

```javascript
// ❌ Wrong order
app.get('/users/:id', (req, res) => {
    res.json({ user: req.params.id });
});

app.get('/users/new', (req, res) => {
    res.json({ form: 'new user' });
});
// Problem: GET /users/new matches /users/:id (id = "new")

// ✅ Correct order
app.get('/users/new', (req, res) => {
    res.json({ form: 'new user' });
});

app.get('/users/:id', (req, res) => {
    res.json({ user: req.params.id });
});
// Solution: Specific routes first
```

**Matching Algorithm:**

```
Request: GET /users/123

Routes checked in order:
1. /users          ❌ (doesn't match)
2. /users/new      ❌ (doesn't match)
3. /users/:id      ✅ (matches, id = "123")
   → Stops here (first match wins)
```

**Query Parameters:**

```javascript
// GET /users?page=1&limit=10
app.get('/users', (req, res) => {
    const page = req.query.page;     // "1" (string)
    const limit = req.query.limit;   // "10" (string)
    res.json({ page: parseInt(page), limit: parseInt(limit) });
});
```

**Use Cases:**
- **RESTful APIs**: `/users/:id`, `/posts/:postId/comments`
- **Pagination**: `/users?page=1&limit=10`
- **Filtering**: `/products?category=electronics&price_min=100`

---

### Q6: How would you design a middleware system for request validation, authentication, and rate limiting in a production Express app?

**Answer:**

Design a **layered middleware stack** with clear separation of concerns.

**Architecture:**

```
Request
  │
  ▼
┌─────────────────────┐
│ 1. Request Logger   │ ← Log all requests
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 2. Rate Limiting    │ ← Prevent abuse
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 3. Body Parser      │ ← Parse body
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 4. Validation       │ ← Validate input
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 5. Authentication   │ ← Verify token
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 6. Authorization    │ ← Check permissions
└──────────┬──────────┘
           │
           ▼
      Route Handler
```

**Implementation:**

```javascript
// 1. Request Logger
const logger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
    });
    next();
};

// 2. Rate Limiting
const rateLimiter = require('express-rate-limit');
const limiter = rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // 100 requests per window
});

// 3. Body Parser (built-in)
app.use(express.json());

// 4. Validation Middleware
const validateUser = (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }
    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be 8+ characters' });
    }
    next();
};

// 5. Authentication
const authenticate = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const user = await verifyToken(token);
        req.user = user; // Attach user to request
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// 6. Authorization
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    };
};

// Apply middleware
app.use(logger);
app.use('/api/', limiter);
app.use(express.json());

// Route with all middleware
app.post('/api/users',
    validateUser,
    authenticate,
    authorize('admin'),
    async (req, res) => {
        const user = await createUser(req.body);
        res.status(201).json(user);
    }
);
```

**Best Practices:**
- **Order matters**: Logger → Rate Limit → Parser → Validation → Auth → Handler
- **Fail fast**: Return early on errors
- **Reusable**: Create middleware functions for common patterns
- **Testable**: Each middleware should be testable in isolation

---

### Q7: Explain CORS in Express. When and why do you need it? How do you configure it properly?

**Answer:**

**CORS (Cross-Origin Resource Sharing)** allows browsers to make requests from one domain to another. By default, browsers **block cross-origin requests** for security.

**The Problem:**

```
Browser (https://frontend.com)
    │
    ├─→ Request to https://api.com/users
    │
    └─→ ❌ Blocked by browser (different origin)
```

**Why CORS is Needed:**

- **Frontend** (React/Vue) on `https://frontend.com`
- **Backend API** on `https://api.com`
- Browser blocks the request without CORS headers

**Solution: CORS Middleware**

```javascript
const cors = require('cors');

// Simple: Allow all origins (development only)
app.use(cors());

// Production: Specific origins
app.use(cors({
    origin: 'https://frontend.com',
    credentials: true, // Allow cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
```

**How CORS Works:**

```
1. Browser sends OPTIONS request (preflight)
   ↓
2. Server responds with CORS headers
   ↓
3. Browser checks headers
   ↓
4. If allowed, sends actual request
   ↓
5. Server responds with CORS headers
   ↓
6. Browser allows response
```

**CORS Headers:**

```javascript
// Response headers server sends:
Access-Control-Allow-Origin: https://frontend.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

**Common Issues:**

```javascript
// ❌ Problem: No CORS headers
app.get('/api/users', (req, res) => {
    res.json({ users: [] });
    // Browser blocks response
});

// ✅ Solution: Add CORS
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));
```

**Use Cases:**
- **SPA Applications**: React/Vue frontend calling Express API
- **Mobile Apps**: Mobile app calling API
- **Third-party Integrations**: External services accessing your API

---

### Q8: How does Express handle static files? When would you use it vs a CDN?

**Answer:**

Express can serve **static files** (images, CSS, JS) directly from a directory.

**Basic Setup:**

```javascript
// Serve files from 'public' directory
app.use(express.static('public'));

// Now accessible at:
// http://localhost:3000/image.jpg
// http://localhost:3000/css/style.css
// http://localhost:3000/js/app.js
```

**Directory Structure:**

```
project/
├── public/
│   ├── images/
│   │   └── logo.png
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
└── app.js
```

**Advanced Configuration:**

```javascript
// Multiple static directories
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// With options
app.use(express.static('public', {
    maxAge: '1d',           // Cache for 1 day
    etag: true,             // Enable ETag
    lastModified: true      // Enable Last-Modified
}));
```

**Express Static vs CDN:**

| Feature | Express Static | CDN |
|---------|---------------|-----|
| **Location** | Same server | Distributed servers |
| **Performance** | Limited by server | Global edge locations |
| **Cost** | Free (server resources) | Paid (bandwidth) |
| **Scalability** | Limited | Highly scalable |
| **Use Case** | Small apps, dev | Production, high traffic |

**When to Use Each:**

```javascript
// ✅ Express Static: Development, small apps
app.use(express.static('public'));

// ✅ CDN: Production, high traffic
// Upload files to S3/CloudFront
// Serve via CDN URL: https://cdn.example.com/image.jpg
```

**Best Practice:**

```javascript
// Development: Express static
if (process.env.NODE_ENV === 'development') {
    app.use(express.static('public'));
}

// Production: CDN
// Files served from CDN, API only handles dynamic content
```

---

### Q9: Explain the Express request/response lifecycle. What happens from when a request arrives to when a response is sent?

**Answer:**

Understanding the **complete request lifecycle** is crucial for debugging and optimization.

**Lifecycle Flow:**

```
1. HTTP Request Arrives
   ↓
2. Node.js HTTP Server Receives
   ↓
3. Express Creates req/res Objects
   ↓
4. Middleware Stack Executes (in order)
   ├─ express.json()
   ├─ logger()
   ├─ authentication()
   └─ ...
   ↓
5. Route Handler Matches
   ↓
6. Handler Executes (async operations)
   ↓
7. Response Sent
   ↓
8. Connection Closed
```

**Detailed Breakdown:**

```javascript
// 1. Request arrives
app.use((req, res, next) => {
    console.log('1. Request received');
    console.log('   Method:', req.method);
    console.log('   URL:', req.url);
    next();
});

// 2. Body parsing
app.use(express.json());

// 3. Authentication
app.use(async (req, res, next) => {
    const token = req.headers.authorization;
    if (token) {
        req.user = await verifyToken(token);
    }
    next();
});

// 4. Route handler
app.get('/users/:id', async (req, res) => {
    console.log('4. Route handler executing');
    
    // Async operation (yields to event loop)
    const user = await User.findById(req.params.id);
    
    // Response sent
    res.json(user);
    console.log('5. Response sent');
});

// 5. Response finished
app.use((req, res, next) => {
    res.on('finish', () => {
        console.log('6. Response finished');
    });
    next();
});
```

**Timing Visualization:**

```
Time →
│
├─ 0ms:   Request arrives
├─ 1ms:   Middleware 1 (logger)
├─ 2ms:   Middleware 2 (auth)
├─ 3ms:   Route handler starts
├─ 4ms:   await DB query (yields to event loop)
│         (other requests can be processed here)
├─ 50ms:  DB responds, handler resumes
├─ 51ms:  res.json() called
├─ 52ms:  Response sent
└─ 53ms:  Connection closed
```

**Key Points:**
- **Synchronous**: Middleware executes synchronously until `await`
- **Asynchronous**: `await` yields to event loop, other requests processed
- **Response**: Once `res.send()` called, response is sent
- **No modification**: Can't modify response after it's sent

---

### Q10: How would you implement request ID tracking and distributed tracing in Express for a microservices architecture?

**Answer:**

**Request ID tracking** allows tracing a request across multiple services for debugging and monitoring.

**Basic Implementation:**

```javascript
const { v4: uuidv4 } = require('uuid');

// Generate request ID
app.use((req, res, next) => {
    // Check if client sent request ID (for distributed tracing)
    req.id = req.headers['x-request-id'] || uuidv4();
    
    // Add to response headers
    res.setHeader('X-Request-ID', req.id);
    
    // Attach to logger context
    req.logger = logger.child({ requestId: req.id });
    
    next();
});

// Use in routes
app.get('/users/:id', async (req, res) => {
    req.logger.info('Fetching user', { userId: req.params.id });
    
    const user = await User.findById(req.params.id);
    
    req.logger.info('User fetched', { userId: user.id });
    res.json(user);
});
```

**Distributed Tracing:**

```javascript
// Service A (API Gateway)
app.use((req, res, next) => {
    req.traceId = req.headers['x-trace-id'] || uuidv4();
    req.spanId = uuidv4();
    
    // Forward to downstream services
    req.downstreamHeaders = {
        'X-Trace-ID': req.traceId,
        'X-Span-ID': req.spanId,
        'X-Parent-Span-ID': req.spanId
    };
    
    next();
});

// Service B (User Service)
app.use((req, res, next) => {
    req.traceId = req.headers['x-trace-id'];
    req.parentSpanId = req.headers['x-parent-span-id'];
    req.spanId = uuidv4();
    
    // Log with trace context
    logger.info('Processing request', {
        traceId: req.traceId,
        spanId: req.spanId,
        parentSpanId: req.parentSpanId
    });
    
    next();
});
```

**Visual Flow:**

```
Request → API Gateway
    │
    ├─ Generate Trace ID: abc-123
    │
    ├─→ User Service
    │   ├─ Trace ID: abc-123
    │   ├─ Span ID: span-1
    │   └─ Parent: (none)
    │
    └─→ Order Service
        ├─ Trace ID: abc-123
        ├─ Span ID: span-2
        └─ Parent: span-1
```

**Use Cases:**
- **Debugging**: Trace request across services
- **Performance**: Identify slow services
- **Monitoring**: Track error rates per trace
- **Logging**: Correlate logs by trace ID

---

## Summary

These interview questions cover:
- ✅ Middleware execution and error handling
- ✅ Routing and parameter matching
- ✅ Request/response lifecycle
- ✅ Body parsing and CORS
- ✅ Static file serving
- ✅ Production patterns (validation, auth, rate limiting)
- ✅ Distributed tracing

Master these concepts for mid-level and senior Express.js interviews at product-based companies.

