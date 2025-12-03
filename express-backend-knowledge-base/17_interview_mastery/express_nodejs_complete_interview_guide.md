# Express.js & Node.js: Complete Interview Guide

Comprehensive interview questions and answers for Express.js and Node.js with detailed explanations, visuals, and examples.

---

## Table of Contents

1. [Node.js Fundamentals](#1-nodejs-fundamentals)
2. [Event Loop & Asynchrony](#2-event-loop--asynchrony)
3. [Express.js Core Concepts](#3-expressjs-core-concepts)
4. [Middleware & Routing](#4-middleware--routing)
5. [Error Handling](#5-error-handling)
6. [Performance & Optimization](#6-performance--optimization)
7. [Security](#7-security)
8. [Database Integration](#8-database-integration)
9. [Testing](#9-testing)
10. [Deployment & Production](#10-deployment--production)

---

## 1. Node.js Fundamentals

### Q1: What is Node.js and how does it differ from traditional server-side languages?

**Answer:**

Node.js is a JavaScript runtime built on Chrome's V8 engine that allows JavaScript to run on the server. Unlike traditional languages like Java or Python, Node.js uses an **event-driven, non-blocking I/O model**.

**Key Differences:**

```
Traditional (Java/Python):
┌─────────┐
│ Request │ → Thread Pool → Blocked during I/O → Response
└─────────┘
- Each request = new thread
- Thread blocked during DB query
- Limited by thread count (1000 threads = high memory)

Node.js:
┌─────────┐
│ Request │ → Event Loop → Yields during I/O → Response
└─────────┘
- Single thread handles all requests
- Non-blocking: yields control during I/O
- Handles thousands of concurrent connections
```

**Visual Comparison:**

```
Traditional Server (Multi-threaded):
Thread 1: [Request 1] → [DB Query] ⏸️ → [Response]
Thread 2: [Request 2] → [DB Query] ⏸️ → [Response]
Thread 3: [Request 3] → [DB Query] ⏸️ → [Response]
...
Thread N: [Request N] → [DB Query] ⏸️ → [Response]

Node.js (Event Loop):
Event Loop: [Request 1] → [DB Query] ⏸️
          → [Request 2] → [DB Query] ⏸️
          → [Request 3] → [DB Query] ⏸️
          → [DB Response 1] → [Resume Request 1] → [Response]
          → [DB Response 2] → [Resume Request 2] → [Response]
```

**Example:**

```javascript
// Traditional (blocking):
const data = database.query("SELECT * FROM users"); // Blocks thread
console.log(data); // Waits for query

// Node.js (non-blocking):
database.query("SELECT * FROM users", (err, data) => {
    // Callback executed when query completes
    console.log(data);
});
// Code continues immediately, doesn't wait
```

**When to Use Node.js:**
- ✅ Real-time applications (chat, gaming)
- ✅ API servers with high I/O operations
- ✅ Microservices architecture
- ✅ Data streaming applications

**When NOT to Use:**
- ❌ CPU-intensive tasks (image processing, ML)
- ❌ Heavy computational workloads
- ❌ Applications requiring strict thread safety

---

### Q2: Explain the Node.js module system (CommonJS vs ESM).

**Answer:**

Node.js supports two module systems: **CommonJS** (traditional) and **ES Modules** (modern).

**CommonJS (require/module.exports):**

```javascript
// math.js
function add(a, b) {
    return a + b;
}

function subtract(a, b) {
    return a - b;
}

module.exports = { add, subtract };
// or: module.exports.add = add;

// app.js
const { add, subtract } = require('./math');
console.log(add(5, 3)); // 8
```

**Characteristics:**
- Synchronous loading
- Runtime resolution
- `require()` can be called anywhere
- Default in Node.js (no config needed)

**ES Modules (import/export):**

```javascript
// math.mjs (or package.json with "type": "module")
export function add(a, b) {
    return a + b;
}

export function subtract(a, b) {
    return a - b;
}

// app.mjs
import { add, subtract } from './math.mjs';
console.log(add(5, 3)); // 8
```

**Characteristics:**
- Static analysis (parsed before execution)
- Top-level only (can't use in conditionals)
- Better tree-shaking
- Standard JavaScript (works in browsers)

**Comparison:**

| Feature | CommonJS | ESM |
|---------|----------|-----|
| Syntax | `require()` / `module.exports` | `import` / `export` |
| Loading | Runtime (dynamic) | Compile-time (static) |
| Top-level | Can be anywhere | Must be top-level |
| Default | Yes (Node.js) | Needs config |
| Browser | No | Yes |

**Migration Example:**

```javascript
// CommonJS
const fs = require('fs');
const path = require('path');

// ESM
import fs from 'fs';
import path from 'path';
```

---

### Q3: What is the difference between `process.nextTick()`, `setImmediate()`, and `setTimeout()`?

**Answer:**

These are different ways to schedule callbacks in Node.js, with different priorities in the event loop.

**Event Loop Phases:**

```
┌─────────────────────────────────────────┐
│         Event Loop Phases              │
├─────────────────────────────────────────┤
│ 1. Timers (setTimeout, setInterval)    │
│ 2. Pending Callbacks (I/O callbacks)   │
│ 3. Idle, Prepare (internal)            │
│ 4. Poll (fetch new I/O events)          │
│ 5. Check (setImmediate callbacks)       │
│ 6. Close Callbacks (socket.on('close'))│
│                                         │
│ Between each phase:                    │
│ → process.nextTick queue (highest)     │
│ → Promise microtasks                   │
└─────────────────────────────────────────┘
```

**1. `process.nextTick()` - Highest Priority**

```javascript
console.log('1');

process.nextTick(() => {
    console.log('2');
});

console.log('3');

// Output: 1, 3, 2
```

**Characteristics:**
- Executes **before** any other async operation
- Runs after current phase, before next phase
- Can cause starvation if overused

**2. `setImmediate()` - Check Phase**

```javascript
console.log('1');

setImmediate(() => {
    console.log('2');
});

setTimeout(() => {
    console.log('3');
}, 0);

console.log('4');

// Output: 1, 4, 3, 2 (or 1, 4, 2, 3 depending on phase)
```

**Characteristics:**
- Executes in the "Check" phase
- After I/O events callbacks
- Designed for immediate execution after current phase

**3. `setTimeout(fn, 0)` - Timers Phase**

```javascript
console.log('1');

setTimeout(() => {
    console.log('2');
}, 0);

console.log('3');

// Output: 1, 3, 2
```

**Characteristics:**
- Minimum delay is ~1ms (not truly 0)
- Executes in "Timers" phase
- Can be delayed by other operations

**Visual Execution Order:**

```
Current Code
    │
    ├─→ process.nextTick() ──┐
    │                        │ (Highest Priority)
    ├─→ Promise.then() ──────┤
    │                        │
    ├─→ setTimeout(0) ───────┼─→ Timers Phase
    │                        │
    └─→ setImmediate() ──────┘─→ Check Phase
```

**Practical Example:**

```javascript
console.log('Start');

setTimeout(() => console.log('setTimeout'), 0);
setImmediate(() => console.log('setImmediate'));
process.nextTick(() => console.log('nextTick'));
Promise.resolve().then(() => console.log('Promise'));

console.log('End');

// Output:
// Start
// End
// nextTick        ← Highest priority
// Promise         ← Microtask
// setTimeout      ← Timers phase
// setImmediate    ← Check phase
```

---

## 2. Event Loop & Asynchrony

### Q4: Explain the Node.js Event Loop in detail.

**Answer:**

The Event Loop is Node.js's mechanism for handling asynchronous operations. It's a single-threaded loop that continuously checks for and executes callbacks.

**Event Loop Phases:**

```
┌─────────────────────────────────────────────────────┐
│              EVENT LOOP CYCLE                       │
└─────────────────────────────────────────────────────┘

Phase 1: TIMERS
├─ Execute setTimeout() and setInterval() callbacks
└─ Only callbacks scheduled before this phase

Phase 2: PENDING CALLBACKS
├─ Execute I/O callbacks deferred to next iteration
└─ System-level callbacks (TCP errors, etc.)

Phase 3: IDLE, PREPARE
├─ Internal use only
└─ Preparation for next phase

Phase 4: POLL
├─ Fetch new I/O events
├─ Execute I/O-related callbacks
└─ Block here if no timers scheduled

Phase 5: CHECK
├─ Execute setImmediate() callbacks
└─ After poll phase completes

Phase 6: CLOSE CALLBACKS
├─ Execute close callbacks (socket.on('close'))
└─ Cleanup operations

Between each phase:
├─ process.nextTick() queue (drains completely)
└─ Promise microtasks (drains completely)
```

**Visual Flow:**

```
┌─────────────────────────────────────────┐
│         Event Loop Iteration            │
└─────────────────────────────────────────┘
              │
              ▼
    ┌─────────────────────┐
    │   TIMERS Phase      │ ← setTimeout, setInterval
    └──────────┬──────────┘
               │
               ▼
    ┌─────────────────────┐
    │ process.nextTick()  │ ← Highest priority
    └──────────┬──────────┘
               │
               ▼
    ┌─────────────────────┐
    │  PENDING CALLBACKS  │ ← Deferred I/O
    └──────────┬──────────┘
               │
               ▼
    ┌─────────────────────┐
    │      POLL Phase      │ ← Fetch I/O events
    └──────────┬──────────┘
               │
               ▼
    ┌─────────────────────┐
    │     CHECK Phase     │ ← setImmediate
    └──────────┬──────────┘
               │
               ▼
    ┌─────────────────────┐
    │  CLOSE CALLBACKS    │ ← Cleanup
    └──────────┬──────────┘
               │
               └─→ Next iteration
```

**Example with All Phases:**

```javascript
const fs = require('fs');

console.log('1: Start');

// Timer
setTimeout(() => console.log('2: setTimeout'), 0);

// Check
setImmediate(() => console.log('3: setImmediate'));

// NextTick (highest priority)
process.nextTick(() => console.log('4: nextTick'));

// Promise (microtask)
Promise.resolve().then(() => console.log('5: Promise'));

// I/O (Poll phase)
fs.readFile(__filename, () => {
    console.log('6: File read');
    
    setTimeout(() => console.log('7: setTimeout in I/O'), 0);
    setImmediate(() => console.log('8: setImmediate in I/O'));
    process.nextTick(() => console.log('9: nextTick in I/O'));
});

console.log('10: End');

// Output:
// 1: Start
// 10: End
// 4: nextTick        ← Before any phase
// 5: Promise         ← Microtask
// 2: setTimeout      ← Timers phase
// 3: setImmediate    ← Check phase
// 6: File read       ← I/O callback (Poll phase)
// 9: nextTick in I/O ← NextTick in I/O callback
// 8: setImmediate in I/O ← Check phase (after I/O)
// 7: setTimeout in I/O ← Next iteration timers
```

**Key Points:**
- Event loop is **single-threaded**
- Each phase has a **queue of callbacks**
- `process.nextTick()` and Promises execute **between phases**
- I/O operations are handled by **libuv** (C++ thread pool)
- Event loop **blocks** only when no callbacks are pending

---

### Q5: What is the difference between `setTimeout()` and `setImmediate()`?

**Answer:**

Both schedule callbacks, but in different phases of the event loop.

**`setTimeout(fn, delay)`:**
- Executes in the **Timers phase**
- Minimum delay is ~1-4ms (not truly 0)
- Can be delayed by other operations

**`setImmediate(fn)`:**
- Executes in the **Check phase**
- Designed to execute immediately after current phase
- More predictable timing

**Comparison:**

```javascript
// Inside I/O callback:
fs.readFile('file.txt', () => {
    setTimeout(() => console.log('setTimeout'), 0);
    setImmediate(() => console.log('setImmediate'));
    
    // Output: setImmediate, setTimeout
    // Reason: setImmediate is in Check phase (after Poll)
    // setTimeout is in Timers phase (next iteration)
});

// Outside I/O callback:
setTimeout(() => console.log('setTimeout'), 0);
setImmediate(() => console.log('setImmediate'));

// Output: setTimeout, setImmediate (or vice versa)
// Reason: Depends on current event loop phase
```

**Visual:**

```
I/O Callback Context:
┌─────────────────────┐
│  Poll Phase (I/O)   │
│  └─→ Your callback  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Check Phase       │ ← setImmediate executes here
│   └─→ setImmediate  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Next Iteration     │
│  └─→ Timers Phase   │ ← setTimeout executes here
│      └─→ setTimeout │
└─────────────────────┘
```

**When to Use:**

```javascript
// Use setImmediate for:
// - Cleanup after I/O operations
// - When you need predictable execution order

fs.readFile('data.json', (err, data) => {
    if (err) return;
    
    // Process data
    processData(data);
    
    // Schedule cleanup after current phase
    setImmediate(() => {
        cleanup();
    });
});

// Use setTimeout for:
// - Actual delays
// - Retry logic with backoff

function retryWithBackoff(fn, retries = 3) {
    fn().catch(err => {
        if (retries > 0) {
            setTimeout(() => {
                retryWithBackoff(fn, retries - 1);
            }, 1000 * (4 - retries)); // Exponential backoff
        }
    });
}
```

---

### Q6: Explain Promises, async/await, and their relationship with the event loop.

**Answer:**

Promises and async/await are modern ways to handle asynchronous operations in JavaScript/Node.js.

**Promises:**

```javascript
// Creating a Promise
const fetchUser = (id) => {
    return new Promise((resolve, reject) => {
        // Simulate async operation
        setTimeout(() => {
            if (id > 0) {
                resolve({ id, name: 'John' });
            } else {
                reject(new Error('Invalid ID'));
            }
        }, 1000);
    });
};

// Using Promise
fetchUser(1)
    .then(user => console.log(user))
    .catch(err => console.error(err));
```

**Promise States:**

```
┌─────────────┐
│   PENDING   │ ← Initial state
└──────┬──────┘
       │
   ┌───┴───┐
   │       │
   ▼       ▼
┌─────┐  ┌─────┐
│FULFILLED│  │REJECTED│
└─────┘  └─────┘
   │       │
   └───┬───┘
       ▼
   .then() or .catch()
```

**Async/Await:**

```javascript
// Same function using async/await
async function getUser(id) {
    try {
        const user = await fetchUser(id);
        console.log(user);
        return user;
    } catch (err) {
        console.error(err);
        throw err;
    }
}

getUser(1);
```

**How They Work with Event Loop:**

```javascript
console.log('1');

Promise.resolve().then(() => {
    console.log('2');
});

setTimeout(() => {
    console.log('3');
}, 0);

console.log('4');

// Output: 1, 4, 2, 3
// Reason: Promises are microtasks (execute before next phase)
```

**Event Loop Priority:**

```
┌─────────────────────────────────┐
│   Synchronous Code              │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│   process.nextTick()            │ ← Highest
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│   Promise Microtasks            │ ← High (before timers)
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│   Timers (setTimeout)           │ ← Lower
└─────────────────────────────────┘
```

**Async Function Execution:**

```javascript
async function example() {
    console.log('1');
    
    await Promise.resolve();
    console.log('2');
    
    await new Promise(resolve => setTimeout(resolve, 0));
    console.log('3');
}

example();
console.log('4');

// Output: 1, 4, 2, 3
// Explanation:
// 1. '1' logs (synchronous)
// 2. await Promise.resolve() → yields to event loop
// 3. '4' logs (synchronous code continues)
// 4. Promise resolves → '2' logs
// 5. setTimeout completes → '3' logs
```

**Visual Flow:**

```
async function fetchData() {
    console.log('Start');
    
    const data = await fetch('/api');  // ← Yields here
    console.log('Got data');            // ← Resumes here
    
    return data;
}

Execution:
┌─────────────────┐
│ fetchData()     │
│   Start         │ ← Executes
│   await fetch() │ ← Yields to event loop
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Event Loop      │
│ (handles other  │
│  operations)    │
└────────┬────────┘
         │
         ▼ (when fetch completes)
┌─────────────────┐
│ Resume fetchData│
│   Got data      │ ← Executes
│   return data   │
└─────────────────┘
```

**Error Handling:**

```javascript
// Promise
fetchUser(1)
    .then(user => processUser(user))
    .catch(err => handleError(err));

// Async/Await
try {
    const user = await fetchUser(1);
    processUser(user);
} catch (err) {
    handleError(err);
}

// Both equivalent, async/await is cleaner
```

---

## 3. Express.js Core Concepts

### Q7: What is Express.js and how does it work?

**Answer:**

Express.js is a minimal, unopinionated web framework for Node.js that provides a thin layer of fundamental web application features.

**Architecture:**

```
┌─────────────────────────────────────────┐
│           HTTP Request                  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         Node.js HTTP Server             │
│      (http.createServer())              │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         Express Application            │
│  ┌──────────────────────────────────┐  │
│  │  Middleware Stack                │  │
│  │  ├─ express.json()               │  │
│  │  ├─ express.urlencoded()         │  │
│  │  ├─ cors()                       │  │
│  │  ├─ logger()                     │  │
│  │  └─ Route Handlers               │  │
│  └──────────────────────────────────┘  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         Response                        │
└─────────────────────────────────────────┘
```

**Basic Setup:**

```javascript
const express = require('express');
const app = express();

// Middleware
app.use(express.json());

// Routes
app.get('/users/:id', (req, res) => {
    const userId = req.params.id;
    res.json({ id: userId, name: 'John' });
});

// Start server
app.listen(3000, () => {
    console.log('Server running on port 3000');
});
```

**Request Flow:**

```
1. Request arrives
   ↓
2. Express creates req/res objects
   ↓
3. Middleware stack executes (in order)
   ├─ express.json()
   ├─ logger()
   ├─ authentication()
   └─ ...
   ↓
4. Route handler matches
   ↓
5. Handler executes
   ↓
6. Response sent
```

**Key Features:**
- **Routing**: URL pattern matching
- **Middleware**: Request/response pipeline
- **Templates**: View rendering (optional)
- **Static Files**: Serve static assets
- **Error Handling**: Centralized error management

---

### Q8: Explain Express middleware in detail.

**Answer:**

Middleware functions are functions that have access to the request object (`req`), response object (`res`), and the next middleware function in the application's request-response cycle.

**Middleware Signature:**

```javascript
function middleware(req, res, next) {
    // Do something with req/res
    next(); // Pass to next middleware
}
```

**Types of Middleware:**

**1. Application-level Middleware:**

```javascript
const app = express();

// Runs for every request
app.use((req, res, next) => {
    console.log('Request received');
    next();
});

// Runs for specific path
app.use('/api', (req, res, next) => {
    console.log('API request');
    next();
});
```

**2. Router-level Middleware:**

```javascript
const router = express.Router();

router.use((req, res, next) => {
    console.log('Router middleware');
    next();
});

router.get('/users', (req, res) => {
    res.json({ users: [] });
});
```

**3. Error-handling Middleware:**

```javascript
// Must have 4 parameters
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});
```

**4. Built-in Middleware:**

```javascript
app.use(express.json());                      // Parse JSON
app.use(express.urlencoded({ extended: true })); // Parse forms
app.use(express.static('public'));            // Serve static files
```

**Middleware Execution Order:**

```
Request
  │
  ▼
┌─────────────────────┐
│ Middleware 1        │
│ app.use(logger)     │
└──────────┬──────────┘
           │ next()
           ▼
┌─────────────────────┐
│ Middleware 2        │
│ app.use(auth)       │
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

**Example: Custom Middleware:**

```javascript
// Logger middleware
const logger = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
    });
    
    next();
};

// Authentication middleware
const authenticate = (req, res, next) => {
    const token = req.headers.authorization;
    
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Verify token
    const user = verifyToken(token);
    req.user = user; // Attach user to request
    next();
};

// Usage
app.use(logger);
app.use('/api', authenticate);
```

**Common Middleware Patterns:**

```javascript
// 1. Request logging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// 2. CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE');
    next();
});

// 3. Request ID
app.use((req, res, next) => {
    req.id = uuidv4();
    next();
});

// 4. Rate limiting
const rateLimit = {};
app.use((req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    
    if (!rateLimit[ip] || now - rateLimit[ip].lastRequest > 1000) {
        rateLimit[ip] = { count: 1, lastRequest: now };
        next();
    } else {
        rateLimit[ip].count++;
        if (rateLimit[ip].count > 10) {
            return res.status(429).json({ error: 'Too many requests' });
        }
        next();
    }
});
```

---

### Q9: How does Express handle routing?

**Answer:**

Express routing matches URL patterns to handler functions using HTTP methods and URL paths.

**Basic Routing:**

```javascript
// GET request
app.get('/users', (req, res) => {
    res.json({ users: [] });
});

// POST request
app.post('/users', (req, res) => {
    const user = req.body;
    res.status(201).json({ id: 1, ...user });
});

// PUT request
app.put('/users/:id', (req, res) => {
    const id = req.params.id;
    res.json({ id, updated: true });
});

// DELETE request
app.delete('/users/:id', (req, res) => {
    res.status(204).send();
});
```

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

// Optional parameter
app.get('/users/:id?', (req, res) => {
    const userId = req.params.id || 'all';
    res.json({ id: userId });
});
```

**Query Parameters:**

```javascript
// GET /users?page=1&limit=10
app.get('/users', (req, res) => {
    const page = req.query.page;     // "1"
    const limit = req.query.limit;   // "10"
    res.json({ page, limit });
});
```

**Route Matching:**

```
Request: GET /users/123

Routes checked in order:
1. /users          ❌ (doesn't match)
2. /users/:id      ✅ (matches, id = "123")
3. /users/:id/posts ❌ (doesn't match)

First match wins!
```

**Router Module:**

```javascript
// routes/users.js
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.json({ users: [] });
});

router.get('/:id', (req, res) => {
    res.json({ user: { id: req.params.id } });
});

router.post('/', (req, res) => {
    res.status(201).json({ created: true });
});

module.exports = router;

// app.js
const usersRouter = require('./routes/users');
app.use('/api/users', usersRouter);

// Now routes are:
// GET  /api/users
// GET  /api/users/:id
// POST /api/users
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
// /users/new will match /users/:id (id = "new")

// ✅ Correct order
app.get('/users/new', (req, res) => {
    res.json({ form: 'new user' });
});

app.get('/users/:id', (req, res) => {
    res.json({ user: req.params.id });
});
// Specific routes first, then parameterized
```

**Route Handlers:**

```javascript
// Single handler
app.get('/users', (req, res) => {
    res.json({ users: [] });
});

// Multiple handlers
app.get('/users',
    authenticate,        // Middleware
    validateQuery,       // Middleware
    (req, res) => {      // Handler
        res.json({ users: [] });
    }
);

// Array of handlers
const handlers = [authenticate, validateQuery, getUsers];
app.get('/users', handlers);
```

---

## 4. Middleware & Routing

### Q10: What is the difference between `app.use()` and `app.get()`?

**Answer:**

Both register middleware, but with different matching behavior.

**`app.use()` - All Methods:**

```javascript
// Matches ALL HTTP methods (GET, POST, PUT, DELETE, etc.)
app.use('/api', (req, res, next) => {
    console.log('API request');
    next();
});

// Matches:
// GET    /api/users
// POST   /api/users
// PUT    /api/users/1
// DELETE /api/users/1
// etc.
```

**`app.get()` - Specific Method:**

```javascript
// Matches ONLY GET requests
app.get('/api/users', (req, res) => {
    res.json({ users: [] });
});

// Matches:
// ✅ GET /api/users
// ❌ POST /api/users (404)
// ❌ PUT /api/users (404)
```

**Visual Comparison:**

```
app.use('/api', middleware):
┌─────────────────────────────────┐
│  GET  /api/users     ✅ Match   │
│  POST /api/users     ✅ Match   │
│  PUT  /api/users/1   ✅ Match   │
│  DELETE /api/users  ✅ Match   │
└─────────────────────────────────┘

app.get('/api/users', handler):
┌─────────────────────────────────┐
│  GET  /api/users     ✅ Match   │
│  POST /api/users     ❌ 404     │
│  PUT  /api/users/1   ❌ 404     │
│  DELETE /api/users   ❌ 404     │
└─────────────────────────────────┘
```

**Common Use Cases:**

```javascript
// app.use() for:
// 1. Global middleware
app.use(express.json());
app.use(cors());

// 2. Path prefix middleware
app.use('/api', authenticate);

// 3. Error handling
app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message });
});

// app.get() for:
// 1. Specific GET routes
app.get('/users', getUsers);
app.get('/users/:id', getUser);

// 2. Route handlers
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});
```

**Execution Order:**

```javascript
app.use((req, res, next) => {
    console.log('1: use middleware');
    next();
});

app.get('/test', (req, res, next) => {
    console.log('2: get handler');
    next();
});

app.use((req, res, next) => {
    console.log('3: use middleware');
    next();
});

// Request: GET /test
// Output: 1, 2, 3
// (use runs before get, but both are in order)
```

---

## 5. Error Handling

### Q11: How do you handle errors in Express.js?

**Answer:**

Express provides several ways to handle errors, from try-catch to centralized error handlers.

**1. Try-Catch in Async Handlers:**

```javascript
app.get('/users/:id', async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        next(error); // Pass to error handler
    }
});
```

**2. Error-handling Middleware:**

```javascript
// Must have 4 parameters: (err, req, res, next)
app.use((err, req, res, next) => {
    console.error(err.stack);
    
    // Custom error response
    res.status(err.status || 500).json({
        error: {
            message: err.message || 'Internal Server Error',
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        }
    });
});
```

**3. Custom Error Class:**

```javascript
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

// Usage
app.get('/users/:id', async (req, res, next) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        return next(new AppError('User not found', 404));
    }
    res.json(user);
});
```

**4. Async Handler Wrapper:**

```javascript
// Wrapper to catch errors automatically
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

// Usage
app.get('/users/:id', asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        throw new AppError('User not found', 404);
    }
    res.json(user);
}));
```

**Error Handling Flow:**

```
Request
  │
  ▼
┌─────────────────────┐
│ Route Handler       │
│ (throws error)      │
└──────────┬──────────┘
           │ next(error)
           ▼
┌─────────────────────┐
│ Error Middleware    │
│ (4 parameters)      │
└──────────┬──────────┘
           │
           ▼
      Response
```

**Complete Example:**

```javascript
const express = require('express');
const app = express();

// Custom error class
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}

// Async handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Route with error
app.get('/users/:id', asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        throw new AppError('User not found', 404);
    }
    res.json(user);
}));

// Error handler
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        error: {
            message: err.message,
            statusCode
        }
    });
});

app.listen(3000);
```

---

## 6. Performance & Optimization

### Q12: How do you optimize Express.js applications?

**Answer:**

Several strategies to optimize Express.js applications for performance.

**1. Enable Compression:**

```javascript
const compression = require('compression');
app.use(compression());
// Reduces response size by 70-90%
```

**2. Use Cluster Mode:**

```javascript
const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
    const numWorkers = os.cpus().length;
    for (let i = 0; i < numWorkers; i++) {
        cluster.fork();
    }
} else {
    // Worker process
    const app = express();
    app.listen(3000);
}
```

**3. Connection Pooling:**

```javascript
const { Pool } = require('pg');
const pool = new Pool({
    max: 20,              // Maximum connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Reuse connections instead of creating new ones
app.get('/users', async (req, res) => {
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows);
});
```

**4. Caching:**

```javascript
const redis = require('redis');
const client = redis.createClient();

app.get('/users/:id', async (req, res) => {
    const cacheKey = `user:${req.params.id}`;
    
    // Check cache
    const cached = await client.get(cacheKey);
    if (cached) {
        return res.json(JSON.parse(cached));
    }
    
    // Fetch from DB
    const user = await User.findById(req.params.id);
    
    // Cache for 1 hour
    await client.setex(cacheKey, 3600, JSON.stringify(user));
    
    res.json(user);
});
```

**5. Avoid Blocking Operations:**

```javascript
// ❌ Bad: Blocks event loop
app.get('/process', (req, res) => {
    let sum = 0;
    for (let i = 0; i < 1000000000; i++) {
        sum += i;
    }
    res.json({ sum });
});

// ✅ Good: Use worker threads
const { Worker } = require('worker_threads');

app.get('/process', (req, res) => {
    const worker = new Worker('./heavy-computation.js');
    worker.on('message', (result) => {
        res.json({ result });
    });
});
```

**6. Optimize Middleware:**

```javascript
// ❌ Bad: Runs for all routes
app.use((req, res, next) => {
    expensiveOperation();
    next();
});

// ✅ Good: Only for specific routes
app.use('/api', (req, res, next) => {
    expensiveOperation();
    next();
});
```

**Performance Metrics:**

```
Before Optimization:
- Requests/sec: 500
- Response time: 200ms
- Memory: 200MB

After Optimization:
- Requests/sec: 2000
- Response time: 50ms
- Memory: 150MB
```

---

## 7. Security

### Q13: What security best practices should you follow in Express.js?

**Answer:**

Security is critical for production Express.js applications.

**1. Helmet.js (Security Headers):**

```javascript
const helmet = require('helmet');
app.use(helmet());
// Sets various HTTP headers for security
```

**2. Input Validation:**

```javascript
const { body, validationResult } = require('express-validator');

app.post('/users',
    body('email').isEmail(),
    body('password').isLength({ min: 8 }),
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        // Process valid input
    }
);
```

**3. SQL Injection Prevention:**

```javascript
// ❌ Vulnerable
app.get('/users', (req, res) => {
    const query = `SELECT * FROM users WHERE id = ${req.query.id}`;
    // SQL injection possible
});

// ✅ Safe: Use parameterized queries
app.get('/users', async (req, res) => {
    const result = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [req.query.id]
    );
    res.json(result.rows);
});
```

**4. XSS Prevention:**

```javascript
// Sanitize user input
const xss = require('xss');

app.post('/comments', (req, res) => {
    const sanitized = xss(req.body.comment);
    // Store sanitized version
});
```

**5. Rate Limiting:**

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

**6. CORS Configuration:**

```javascript
const cors = require('cors');

app.use(cors({
    origin: 'https://yourdomain.com',
    credentials: true
}));
```

**7. Environment Variables:**

```javascript
// ❌ Bad: Hardcoded secrets
const secret = 'my-secret-key';

// ✅ Good: Environment variables
const secret = process.env.JWT_SECRET;
```

---

## 8. Database Integration

### Q14: How do you handle database connections in Express.js?

**Answer:**

Proper database connection management is crucial for performance and reliability.

**Connection Pooling:**

```javascript
const { Pool } = require('pg');

// Create pool (reused across requests)
const pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 20,                    // Maximum connections
    idleTimeoutMillis: 30000,  // Close idle connections
    connectionTimeoutMillis: 2000
});

// Use in routes
app.get('/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

**Connection Lifecycle:**

```
Application Start
    │
    ▼
Create Connection Pool
    │
    ▼
Request Arrives
    │
    ▼
Get Connection from Pool
    │
    ▼
Execute Query
    │
    ▼
Return Connection to Pool
    │
    ▼
Next Request (reuses connection)
```

**Error Handling:**

```javascript
// Handle pool errors
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    await pool.end();
    process.exit(0);
});
```

---

## 9. Testing

### Q15: How do you test Express.js applications?

**Answer:**

Testing Express.js applications requires proper setup and tools.

**Setup with Jest and Supertest:**

```javascript
// __tests__/users.test.js
const request = require('supertest');
const app = require('../app');

describe('GET /users', () => {
    test('should return users', async () => {
        const response = await request(app)
            .get('/users')
            .expect(200);
        
        expect(response.body).toHaveProperty('users');
        expect(Array.isArray(response.body.users)).toBe(true);
    });
});

describe('POST /users', () => {
    test('should create user', async () => {
        const response = await request(app)
            .post('/users')
            .send({ name: 'John', email: 'john@example.com' })
            .expect(201);
        
        expect(response.body).toHaveProperty('id');
    });
});
```

**Mocking Database:**

```javascript
// Mock database
jest.mock('../db', () => ({
    query: jest.fn()
}));

const db = require('../db');

test('should fetch user', async () => {
    db.query.mockResolvedValue({
        rows: [{ id: 1, name: 'John' }]
    });
    
    const response = await request(app)
        .get('/users/1')
        .expect(200);
    
    expect(response.body.name).toBe('John');
});
```

---

## 10. Deployment & Production

### Q16: How do you deploy Express.js applications to production?

**Answer:**

Production deployment requires several considerations.

**1. Environment Variables:**

```javascript
// Use dotenv for development
require('dotenv').config();

const port = process.env.PORT || 3000;
const env = process.env.NODE_ENV || 'development';
```

**2. Process Manager (PM2):**

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start app.js

# Cluster mode
pm2 start app.js -i max

# Monitor
pm2 monit
```

**3. Reverse Proxy (Nginx):**

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**4. Health Checks:**

```javascript
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
```

**5. Logging:**

```javascript
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
});
```

---

## Summary

This guide covers essential Express.js and Node.js interview topics:

1. **Node.js Fundamentals**: Event loop, modules, async operations
2. **Express.js Core**: Middleware, routing, request handling
3. **Best Practices**: Error handling, security, performance
4. **Production**: Deployment, monitoring, optimization

Each topic includes:
- Detailed explanations
- Code examples
- Visual diagrams
- Best practices
- Common pitfalls

Use this guide to prepare for interviews and deepen your understanding of Express.js and Node.js.

