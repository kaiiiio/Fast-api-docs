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

Middleware is the **architectural backbone of an Express application**. It represents a series of functions that the request passes through, allowing you to execute code, morph the request and response objects, and terminate the request-response cycle before it even reaches your final route handler.

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

Routing in Express is essentially a **sophisticated pattern-matching engine**. It defines how an application responds to a specific client request based on two criteria: the HTTP method (GET, POST, etc.) and the URI (path), allowing you to modularize your API structure cleanly.

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

The distinction between these two methods centers on **intent and scope**. While `app.use()` is designed for cross-cutting concerns that apply to a broad range of requests, `app.get()` is a specialized filter that only targets a specific HTTP verb and an exact path match.

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

Effective error handling in Express relies on a **centralized notification system**. Instead of handling errors locally within every route, you should leverage Express's specialized 4-parameter middleware, which acts as a catch-all safety net for the entire application.

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

Optimizing an Express application is a **multi-layered effort** aimed at reducing the Event Loop's workload. This includes offloading CPU-intensive tasks, caching frequently accessed data in memory, and ensuring that communication between the application and external resources (like databases) is as efficient as possible.

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

Security in Express is built on the principle of **Defense in Depth**. It involves securing your application at multiple levels—from hardening HTTP headers with Helmet to sanitizing user input and implementing strict rate limiting to prevent brute-force attacks.

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

Managing database connections effectively is a **balancing act between responsiveness and resource constraints**. In Express, this typically means using a connection pool to avoid the expensive overhead of creating and destroying connections for every individual request.

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

Testing an Express application involves **validating the entire request-response contract**. This starts with unit tests for isolated business logic and extends to integration tests that simulate real HTTP requests and assert that your routes return the expected status codes and payloads.

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

Deploying an Express application to production is about **moving from a development sandbox to a resilient, observable environment**. This requires a combination of process management to ensure the server stays alive, environment-specific configuration, and a reverse proxy for load balancing and security.

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

---

## 11. Advanced Node.js Topics

### Q17: Explain the Node.js Event Loop in detail. How does it handle asynchronous operations?

**Answer:**

The Event Loop is the **engine that makes Node.js scalable** despite its single-threaded nature. It operates by offloading I/O operations to the system kernel or a thread pool, allowing the main thread to remain free for executing your JavaScript code and coordinating callbacks as they arrive.

The **Event Loop** is Node.js's core mechanism for handling asynchronous operations. It's a single-threaded loop that continuously processes callbacks.

**Event Loop Phases:**

```
┌─────────────────────────────────────────┐
│         EVENT LOOP CYCLE                │
└─────────────────────────────────────────┘

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
│   Synchronous Code                      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│   process.nextTick() queue              │ ← Highest priority
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│   Promise microtasks                     │ ← High priority
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│   TIMERS Phase                          │
│   (setTimeout, setInterval)             │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│   POLL Phase                            │
│   (I/O callbacks)                       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│   CHECK Phase                           │
│   (setImmediate)                        │
└─────────────────────────────────────────┘
```

**Example:**

```javascript
console.log('1');

setTimeout(() => console.log('2'), 0);
setImmediate(() => console.log('3'));
process.nextTick(() => console.log('4'));
Promise.resolve().then(() => console.log('5'));

console.log('6');

// Output: 1, 6, 4, 5, 2, 3
// Explanation:
// 1. '1' logs (synchronous)
// 2. '6' logs (synchronous)
// 3. '4' logs (nextTick - highest priority)
// 4. '5' logs (Promise - microtask)
// 5. '2' logs (setTimeout - timers phase)
// 6. '3' logs (setImmediate - check phase)
```

**How Async Operations Work:**

```javascript
// Request handling
app.get('/users/:id', async (req, res) => {
    console.log('1: Request received');
    
    // Async operation (yields to event loop)
    const user = await User.findById(req.params.id);
    // Event loop handles other requests here
    
    console.log('2: User fetched');
    res.json(user);
});

// Timeline:
// T=0ms:   Request 1 arrives → starts DB query (yields)
// T=1ms:   Request 2 arrives → starts DB query (yields)
// T=2ms:   Request 3 arrives → starts DB query (yields)
// T=50ms:  DB responds to Request 1 → resumes → sends response
// T=51ms:  DB responds to Request 2 → resumes → sends response
// T=52ms:  DB responds to Request 3 → resumes → sends response
```

---

### Q18: What is event-driven programming? How does Node.js implement it?

**Answer:**

Event-driven programming is a **design paradigm where the flow of execution is triggered by specific occurrences**. In Node.js, this is primarily implemented through the `EventEmitter` class, providing a powerful way to decouple components of your application through a publish-subscribe model.

**Event-Driven Programming** = Program flow determined by events (user actions, I/O completion, messages).

**Node.js Event-Driven Architecture:**

```javascript
// Node.js is built on events
const EventEmitter = require('events');

// Create event emitter
const emitter = new EventEmitter();

// Listen for events
emitter.on('user-created', (user) => {
    console.log('User created:', user);
    // Send welcome email
});

emitter.on('user-created', (user) => {
    console.log('Logging user creation:', user);
    // Log to database
});

// Emit event
emitter.emit('user-created', { id: 1, name: 'John' });
// Both listeners execute
```

**Express.js Uses Events:**

```javascript
// HTTP server is event-driven
const http = require('http');

const server = http.createServer((req, res) => {
    // This is an event handler
    res.end('Hello');
});

// Server listens for 'request' events
server.on('request', (req, res) => {
    // Handle request
});

// Start listening (triggers 'listening' event)
server.listen(3000, () => {
    console.log('Server listening'); // 'listening' event handler
});
```

**Event-Driven Benefits:**

```
Event-Driven Programming:
├─ Decoupling: Components don't know about each other
├─ Scalability: Easy to add new listeners
├─ Flexibility: Dynamic event handling
└─ Asynchronous: Non-blocking operations
```

**Real-world Example:**

```javascript
// Order service emits events
class OrderService extends EventEmitter {
    async createOrder(orderData) {
        const order = await Order.create(orderData);
        
        // Emit events
        this.emit('order.created', order);
        return order;
    }
}

const orderService = new OrderService();

// Multiple listeners (decoupled)
orderService.on('order.created', async (order) => {
    // Send confirmation email
    await emailService.sendConfirmation(order);
});

orderService.on('order.created', async (order) => {
    // Update inventory
    await inventoryService.update(order);
});

orderService.on('order.created', async (order) => {
    // Send notification
    await notificationService.notify(order);
});

// Create order triggers all listeners
await orderService.createOrder(orderData);
```

---

### Q19: Compare building APIs with raw Node.js vs Express.js. When would you use each?

**Answer:**

The choice between raw Node.js and Express is a **trade-off between fine-grained control and developer productivity**. While raw Node.js gives you direct access to the HTTP request and response streams, Express abstracts this complexity into a declarative API for routing and middleware.

**Raw Node.js HTTP Server:**

```javascript
const http = require('http');

const server = http.createServer((req, res) => {
    // Manual routing
    if (req.method === 'GET' && req.url === '/users') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ users: [] }));
    } else if (req.method === 'POST' && req.url === '/users') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            const user = JSON.parse(body);
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ id: 1, ...user }));
        });
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(3000);
```

**Express.js:**

```javascript
const express = require('express');
const app = express();

app.use(express.json()); // Built-in body parser

app.get('/users', (req, res) => {
    res.json({ users: [] });
});

app.post('/users', (req, res) => {
    const user = req.body; // Already parsed
    res.status(201).json({ id: 1, ...user });
});

app.listen(3000);
```

**Comparison:**

| Aspect | Raw Node.js | Express.js |
|--------|-------------|------------|
| **Code** | Verbose, manual | Concise, declarative |
| **Routing** | Manual if/else | Built-in router |
| **Middleware** | Manual implementation | Built-in support |
| **Body Parsing** | Manual stream handling | Built-in parsers |
| **Learning Curve** | Steeper | Easier |
| **Flexibility** | Full control | Framework constraints |
| **Use Case** | Simple APIs, learning | Production APIs |

**When to Use Raw Node.js:**

```javascript
// ✅ Simple API, minimal dependencies
const http = require('http');

const server = http.createServer((req, res) => {
    if (req.url === '/health') {
        res.writeHead(200);
        res.end('OK');
    }
});

server.listen(3000);
```

**When to Use Express.js:**

```javascript
// ✅ Production API with routing, middleware, etc.
const express = require('express');
const app = express();

app.use(express.json());
app.use(cors());
app.use('/api', router);

app.listen(3000);
```

---

### Q20: Explain libuv, Worker Threads, and async callbacks. How do they work together in Node.js?

**Answer:**

**libuv** = C++ library that provides event loop and thread pool for Node.js.

**Architecture:**

```
┌─────────────────────────────────────────┐
│         Node.js Application            │
│  (JavaScript - Single Thread)          │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         Event Loop (libuv)              │
│  (Single Thread - JavaScript execution) │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
    ▼                     ▼
┌─────────┐        ┌──────────────┐
│ I/O     │        │ Thread Pool  │
│ (epoll, │        │ (libuv)      │
│ kqueue) │        │ 4 threads    │
└─────────┘        └──────────────┘
    │                     │
    │                     ▼
    │              ┌──────────────┐
    │              │ File I/O     │
    │              │ DNS          │
    │              │ Crypto       │
    │              │ CPU-intensive│
    │              └──────────────┘
    │
    ▼
┌──────────────┐
│ Network I/O   │
│ (non-blocking)│
└──────────────┘
```

**How They Work:**

**1. Async Callbacks (Event Loop):**

```javascript
// Non-blocking I/O (handled by libuv)
app.get('/users/:id', async (req, res) => {
    // DB query uses libuv's thread pool or OS async I/O
    const user = await User.findById(req.params.id);
    // Event loop handles other requests while waiting
    res.json(user);
});
```

**2. libuv Thread Pool (CPU-intensive):**

```javascript
// File operations use thread pool
const fs = require('fs');

// Uses thread pool (4 threads by default)
fs.readFile('large-file.txt', (err, data) => {
    // Executed in thread pool worker
    console.log(data);
});

// Increase thread pool size
process.env.UV_THREADPOOL_SIZE = 8; // Default: 4
```

**3. Worker Threads (Heavy CPU work):**

```javascript
// For CPU-intensive tasks (don't block event loop)
const { Worker } = require('worker_threads');

app.get('/process', (req, res) => {
    const worker = new Worker('./heavy-computation.js');
    
    worker.postMessage(req.body.data);
    
    worker.on('message', (result) => {
        res.json({ result });
    });
    
    // Event loop free to handle other requests
});
```

**Comparison:**

| Feature | Event Loop | libuv Thread Pool | Worker Threads |
|---------|-----------|-------------------|----------------|
| **Use Case** | I/O operations | File I/O, DNS | CPU-intensive |
| **Threads** | 1 (main) | 4 (default) | Unlimited |
| **Blocking** | Non-blocking | Blocks worker | Blocks worker |
| **Example** | DB queries, HTTP | fs.readFile | Image processing |

**Visual:**

```
Request → Event Loop
    │
    ├─ I/O (DB, HTTP) → OS async I/O (non-blocking)
    │
    ├─ File I/O → Thread Pool (4 workers)
    │
    └─ CPU-intensive → Worker Thread (separate thread)
```

---

### Q21: What is `assert` in Node.js? How do you use it for testing and validation?

**Answer:**

**`assert`** = Built-in module for writing assertions (test conditions).

**Basic Usage:**

```javascript
const assert = require('assert');

// Assert equality
assert.strictEqual(1 + 1, 2); // Passes
assert.strictEqual(1 + 1, 3); // Throws AssertionError

// Assert truthiness
assert(user !== null, 'User should not be null');

// Assert deep equality
assert.deepStrictEqual({ a: 1 }, { a: 1 }); // Passes
assert.deepStrictEqual({ a: 1 }, { a: 2 }); // Throws
```

**In Tests:**

```javascript
// tests/user.test.js
const assert = require('assert');
const UserService = require('../services/user.service');

describe('UserService', () => {
    test('should create user', async () => {
        const user = await UserService.createUser({
            email: 'test@example.com',
            name: 'Test'
        });
        
        assert(user.id !== undefined, 'User should have id');
        assert.strictEqual(user.email, 'test@example.com');
    });
    
    test('should throw error for duplicate email', async () => {
        await UserService.createUser({ email: 'test@example.com' });
        
        await assert.rejects(
            async () => {
                await UserService.createUser({ email: 'test@example.com' });
            },
            { message: 'Email already exists' }
        );
    });
});
```

**Assert Methods:**

```javascript
// Equality
assert.strictEqual(actual, expected);
assert.notStrictEqual(actual, expected);
assert.deepStrictEqual(actual, expected);

// Truthiness
assert(value, message);
assert.ok(value, message);

// Exceptions
assert.throws(() => { throw new Error(); });
assert.rejects(async () => { throw new Error(); });

// Comparison
assert(actual === expected, 'Values should be equal');
```

**Best Practices:**

```javascript
// ✅ Use in tests
assert.strictEqual(result, expected);

// ✅ Use for validation (development)
if (process.env.NODE_ENV === 'development') {
    assert(user !== null, 'User should exist');
}

// ❌ Don't use in production (throws, crashes app)
// Use proper error handling instead
if (!user) {
    throw new Error('User not found'); // Better for production
}
```

---

### Q22: Explain `setImmediate()` vs `process.nextTick()` in backend context. When would you use each?

**Answer:**

**Execution Order:**

```
Priority (highest to lowest):
1. process.nextTick()
2. Promise microtasks
3. setImmediate()
4. setTimeout()
```

**`process.nextTick()` - Highest Priority:**

```javascript
console.log('1');

process.nextTick(() => {
    console.log('2'); // Executes before any other async
});

console.log('3');

// Output: 1, 3, 2
```

**Characteristics:**
- Executes **before** any other async operation
- Runs after current phase, before next phase
- Can cause **starvation** if overused (blocks event loop)

**`setImmediate()` - Check Phase:**

```javascript
console.log('1');

setImmediate(() => {
    console.log('2'); // Executes in CHECK phase
});

setTimeout(() => {
    console.log('3'); // Executes in TIMERS phase
}, 0);

console.log('4');

// Output: 1, 4, 3, 2 (or 1, 4, 2, 3 depending on phase)
```

**Characteristics:**
- Executes in **CHECK phase** (after I/O events)
- Designed for immediate execution after current phase
- More predictable than `setTimeout(0)`

**Backend Use Cases:**

**`process.nextTick()` - Use For:**

```javascript
// 1. Error handling (before other operations)
app.use((req, res, next) => {
    process.nextTick(() => {
        // Ensure error is handled before other middleware
        if (error) {
            next(error);
        }
    });
});

// 2. Cleanup (immediate)
function cleanup() {
    process.nextTick(() => {
        // Cleanup before next operation
        closeConnections();
    });
}
```

**`setImmediate()` - Use For:**

```javascript
// 1. After I/O operations
fs.readFile('file.txt', (err, data) => {
    // Process file
    processFile(data);
    
    // Schedule cleanup after current phase
    setImmediate(() => {
        cleanup();
    });
});

// 2. Defer heavy operations
app.post('/process', (req, res) => {
    res.json({ status: 'processing' });
    
    // Process after response sent
    setImmediate(() => {
        heavyProcessing(req.body);
    });
});
```

**Visual Comparison:**

```
Inside I/O Callback:
┌─────────────────────┐
│  Poll Phase (I/O)   │
│  └─→ Your callback  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ process.nextTick()  │ ← Executes first
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

**Best Practices:**

```
process.nextTick():
├─ Use: Error handling, immediate cleanup
├─ Avoid: Heavy operations (can starve event loop)
└─ Limit: Don't create nextTick loops

setImmediate():
├─ Use: Defer operations after I/O
├─ Use: Schedule work after current phase
└─ Better: More predictable than setTimeout(0)
```

---

## 12. System Design Questions

### Q23: Design a High-Write Throughput Monitoring System (500,000 writes/second)

**Problem:** 5,000 servers sending CPU/RAM metrics every 10 seconds = 500,000 writes/second. Database at 100% CPU, disk I/O saturated.

**Solution Architecture:**

```
┌─────────────────────────────────────────────────────────┐
│              5,000 Servers                              │
│  (Sending metrics every 10 seconds)                     │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│          API Gateway / Load Balancer                    │
│  (Rate limiting, batching)                              │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│          Message Queue (Kafka/RabbitMQ)                 │
│  (Buffers writes, decouples producers/consumers)       │
└──────────────┬──────────────────────────────────────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
    ▼          ▼          ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│ Worker  │ │ Worker  │ │ Worker  │
│ Pool    │ │ Pool    │ │ Pool    │
│ (Batch) │ │ (Batch) │ │ (Batch) │
└────┬────┘ └────┬────┘ └────┬────┘
     │           │           │
     └───────────┼───────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│      Time-Series Database (InfluxDB/TimescaleDB)        │
│  (Optimized for high write throughput)                   │
└─────────────────────────────────────────────────────────┘
```

**Why This Architecture:**

**1. Message Queue (Kafka):**
- **Why**: Buffers writes, handles spikes
- **How**: Producers write to queue, consumers batch process
- **Benefit**: Decouples servers from database

**2. Batch Processing:**
- **Why**: Reduces database writes (500k → 50k batches)
- **How**: Workers collect metrics, batch insert
- **Benefit**: 10x reduction in writes

**3. Time-Series Database:**
- **Why**: Optimized for time-series data (InfluxDB, TimescaleDB)
- **How**: Columnar storage, compression
- **Benefit**: 10-100x faster than PostgreSQL for time-series

**Implementation:**

```javascript
// 1. API receives metrics
app.post('/metrics', async (req, res) => {
    const metrics = req.body; // { serverId, cpu, ram, timestamp }
    
    // Send to Kafka (non-blocking)
    await kafkaProducer.send({
        topic: 'metrics',
        messages: [{ value: JSON.stringify(metrics) }]
    });
    
    res.status(202).json({ received: true }); // Accepted, not processed
});

// 2. Workers batch process
async function processMetrics() {
    const batch = [];
    
    kafkaConsumer.on('message', (message) => {
        batch.push(JSON.parse(message.value));
        
        if (batch.length >= 1000) {
            // Batch insert to InfluxDB
            await influxDB.writePoints(batch);
            batch.length = 0;
        }
    });
}

// 3. InfluxDB storage (optimized for time-series)
// Automatically handles:
// - Compression
// - Retention policies
// - Downsampling
```

**Alternative Solutions:**

**Option 1: Write-Ahead Log (WAL) + Batch:**
```
Servers → WAL → Batch Processor → PostgreSQL
```
- Pros: Uses existing PostgreSQL
- Cons: Still slower than time-series DB

**Option 2: Redis + Background Worker:**
```
Servers → Redis (in-memory) → Background Worker → Database
```
- Pros: Very fast writes
- Cons: Risk of data loss if Redis crashes

**Best Solution: Kafka + Time-Series DB**
- ✅ Handles 500k+ writes/sec
- ✅ Durable (Kafka persistence)
- ✅ Scalable (add workers)
- ✅ Optimized storage (time-series DB)

---

### Q24: Design an Idempotent Payment System (Exactly-Once Processing)

**Problem:** User clicks "Pay $50" twice due to network issues. System charges $100 instead of $50.

**Solution: Idempotency Keys**

**Architecture:**

```
┌─────────────────────────────────────────────────────────┐
│              Client (Mobile App)                        │
│  Generates: idempotency_key = uuid()                    │
└──────────────┬──────────────────────────────────────────┘
               │
               │ POST /payments
               │ Headers: { "Idempotency-Key": "abc-123" }
               ▼
┌─────────────────────────────────────────────────────────┐
│          API Gateway / Load Balancer                     │
└──────────────┬──────────────────────────────────────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
    ▼          ▼          ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│ Server 1│ │ Server 2 │ │ Server 3│
│ (Check  │ │ (Check   │ │ (Check  │
│  Redis) │ │  Redis)   │ │  Redis) │
└────┬────┘ └────┬────┘ └────┬────┘
     │           │           │
     └───────────┼───────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│          Redis (Idempotency Store)                       │
│  Key: "idempotency:abc-123"                             │
│  Value: { status: "processing", paymentId: "pay_123" }  │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│          Payment Gateway (Stripe)                        │
│  (External API)                                          │
└─────────────────────────────────────────────────────────┘
```

**Implementation:**

```javascript
// 1. Generate idempotency key (client-side)
const idempotencyKey = uuidv4();

// 2. Payment endpoint with idempotency
app.post('/payments', async (req, res) => {
    const { idempotencyKey } = req.headers;
    const { amount, userId } = req.body;
    
    if (!idempotencyKey) {
        return res.status(400).json({ error: 'Idempotency-Key required' });
    }
    
    // Check if already processed
    const cached = await redis.get(`idempotency:${idempotencyKey}`);
    if (cached) {
        const result = JSON.parse(cached);
        return res.json(result); // Return cached result
    }
    
    // Lock: Prevent concurrent processing
    const lockKey = `lock:${idempotencyKey}`;
    const locked = await redis.set(lockKey, '1', 'EX', 30, 'NX');
    
    if (!locked) {
        // Another request is processing, wait and retry
        await new Promise(resolve => setTimeout(resolve, 100));
        const cached = await redis.get(`idempotency:${idempotencyKey}`);
        return res.json(JSON.parse(cached));
    }
    
    try {
        // Process payment
        const payment = await stripe.charges.create({
            amount: amount * 100,
            currency: 'usd',
            customer: userId
        }, {
            idempotencyKey: idempotencyKey // Stripe also uses idempotency
        });
        
        // Save to database (transaction)
        const dbPayment = await db.transaction(async (trx) => {
            const paymentRecord = await Payment.create({
                id: payment.id,
                userId,
                amount,
                status: 'completed'
            }, { transaction: trx });
            
            // Update order
            await Order.update(
                { status: 'paid', paymentId: payment.id },
                { where: { userId }, transaction: trx }
            );
            
            return paymentRecord;
        });
        
        // Cache result
        const result = {
            id: payment.id,
            status: 'completed',
            amount
        };
        await redis.setex(
            `idempotency:${idempotencyKey}`,
            86400, // 24 hours
            JSON.stringify(result)
        );
        
        // Release lock
        await redis.del(lockKey);
        
        res.json(result);
        
    } catch (error) {
        await redis.del(lockKey);
        
        // Handle partial failure
        if (error.code === 'card_declined') {
            await redis.setex(
                `idempotency:${idempotencyKey}`,
                86400,
                JSON.stringify({ error: 'Payment declined' })
            );
        }
        
        throw error;
    }
});
```

**Handling Network Partitions:**

```javascript
// Problem: Stripe charged, but database crashed
// Solution: Reconciliation job

async function reconcilePayments() {
    // Find payments in "processing" state > 5 minutes
    const stuckPayments = await Payment.findAll({
        where: {
            status: 'processing',
            createdAt: { [Op.lt]: new Date(Date.now() - 5 * 60 * 1000) }
        }
    });
    
    for (const payment of stuckPayments) {
        // Check Stripe
        const stripePayment = await stripe.charges.retrieve(payment.stripeId);
        
        if (stripePayment.status === 'succeeded') {
            // Update database
            await Payment.update(
                { status: 'completed' },
                { where: { id: payment.id } }
            );
        }
    }
}

// Run every minute
setInterval(reconcilePayments, 60000);
```

**Why This Works:**

```
Idempotency Key:
├─ Client generates unique key per payment attempt
├─ Server checks Redis before processing
├─ If exists: Return cached result
├─ If not: Process and cache result
└─ Result: Same request = same result (idempotent)

Distributed Lock:
├─ Prevents concurrent processing
├─ Redis SET with NX (only if not exists)
├─ Expires after timeout
└─ Ensures only one server processes

Reconciliation:
├─ Handles partial failures
├─ Checks external payment gateway
├─ Updates database if needed
└─ Ensures consistency
```

---

### Q25: Design Twitter Timeline System (100 Million Followers)

**Problem:** Celebrity tweets → must appear in 100M followers' timelines. Inserting 100M rows would take hours.

**Solution: Hybrid Approach (Push + Pull)**

**Architecture:**

```
┌─────────────────────────────────────────────────────────┐
│          User Tweets                                     │
│  (Justin Bieber tweets)                                 │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│      Timeline Service                                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Check: Follower count > 1M?                      │  │
│  └──────────┬───────────────────────────────────────┘  │
│             │                                           │
│    ┌────────┴────────┐                                  │
│    │                 │                                  │
│    ▼                 ▼                                 │
│ ┌─────────┐     ┌─────────┐                            │
│ │ Push    │     │ Pull    │                            │
│ │ (Fans)  │     │ (Celeb) │                            │
│ └─────────┘     └─────────┘                            │
└──────────┬──────────────────┬───────────────────────────┘
           │                  │
           ▼                  ▼
┌──────────────────┐  ┌──────────────────┐
│ Fan Timelines    │  │ Celebrity Cache  │
│ (Pre-computed)   │  │ (On-demand)     │
└──────────────────┘  └──────────────────┘
```

**Implementation:**

```javascript
// 1. Tweet creation
app.post('/tweets', async (req, res) => {
    const { content, userId } = req.body;
    
    // Create tweet
    const tweet = await Tweet.create({ content, userId });
    
    // Get follower count
    const followerCount = await Follower.count({ where: { followingId: userId } });
    
    if (followerCount < 1000000) {
        // Push model: Insert into all followers' timelines
        await pushToTimelines(tweet, userId);
    } else {
        // Pull model: Store in celebrity cache, fetch on-demand
        await storeInCelebrityCache(tweet, userId);
    }
    
    res.json(tweet);
});

// Push model (for regular users)
async function pushToTimelines(tweet, userId) {
    const followers = await Follower.findAll({
        where: { followingId: userId },
        attributes: ['followerId']
    });
    
    // Batch insert
    const timelineEntries = followers.map(f => ({
        userId: f.followerId,
        tweetId: tweet.id,
        createdAt: new Date()
    }));
    
    await Timeline.bulkCreate(timelineEntries);
}

// Pull model (for celebrities)
async function storeInCelebrityCache(tweet, userId) {
    // Store in Redis (sorted set by timestamp)
    await redis.zadd(
        `celebrity:${userId}:tweets`,
        Date.now(),
        JSON.stringify(tweet)
    );
    
    // Set TTL (keep last 7 days)
    await redis.expire(`celebrity:${userId}:tweets`, 7 * 24 * 60 * 60);
}

// Timeline fetch (handles both)
app.get('/timeline', async (req, res) => {
    const userId = req.user.id;
    
    // Get regular users' tweets (pre-computed)
    const regularTweets = await Timeline.findAll({
        where: { userId },
        include: [Tweet],
        order: [['createdAt', 'DESC']],
        limit: 20
    });
    
    // Get celebrities followed (on-demand)
    const celebrities = await Follower.findAll({
        where: { followerId: userId },
        include: [{
            model: User,
            where: { isCelebrity: true }
        }]
    });
    
    const celebrityTweets = [];
    for (const celeb of celebrities) {
        const tweets = await redis.zrevrange(
            `celebrity:${celeb.followingId}:tweets`,
            0,
            19  // Last 20 tweets
        );
        celebrityTweets.push(...tweets.map(t => JSON.parse(t)));
    }
    
    // Merge and sort
    const allTweets = [...regularTweets, ...celebrityTweets]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 20);
    
    res.json(allTweets);
});
```

**Why This Works:**

```
Push Model (Regular Users):
├─ Pre-compute timelines
├─ Fast reads (already in database)
├─ Slower writes (insert into N timelines)
└─ Good for: < 1M followers

Pull Model (Celebrities):
├─ Store tweets in cache
├─ Fast writes (single insert)
├─ Slower reads (fetch on-demand)
└─ Good for: > 1M followers

Hybrid:
├─ Best of both worlds
├─ Regular users: Push (fast reads)
├─ Celebrities: Pull (fast writes)
└─ Scales to millions of users
```

**Alternative Solutions:**

**Option 1: Pure Push:**
- ❌ 100M inserts per celebrity tweet
- ❌ Takes hours
- ❌ Database overload

**Option 2: Pure Pull:**
- ❌ Slow timeline loads (fetch from many celebrities)
- ❌ High database load on reads
- ❌ Poor user experience

**Best Solution: Hybrid (Push + Pull)**
- ✅ Fast writes for celebrities
- ✅ Fast reads for regular users
- ✅ Scales to millions
- ✅ Good user experience

---

## Summary

This comprehensive guide covers:

**Advanced Node.js Topics:**
- ✅ Event Loop detailed explanation
- ✅ Event-driven programming
- ✅ Node.js vs Express.js API building
- ✅ libuv, Worker Threads, async callbacks
- ✅ Assert module usage
- ✅ setImmediate vs nextTick

**System Design:**
- ✅ High-write throughput monitoring system
- ✅ Idempotent payment system
- ✅ Twitter timeline architecture
- ✅ Multiple solution approaches
- ✅ Best practices and trade-offs

Master these topics for senior-level interviews at product-based companies focusing on system design and Node.js internals.

