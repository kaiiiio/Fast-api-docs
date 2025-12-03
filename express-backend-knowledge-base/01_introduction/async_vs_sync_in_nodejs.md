# Async vs Sync in Node.js

Understanding when and how to use async operations in Express.js is crucial for building high-performance backends.

## The Fundamental Difference

### Synchronous (Sync) Code

In synchronous code, each operation **blocks** until it completes:

```javascript
// Synchronous - blocks the event loop: Event loop waits for I/O to complete.
app.get("/users/:user_id", (req, res) => {
    const user = db.getUserSync(req.params.user_id);  // Blocks here, event loop waiting
    res.json(user);  // Only executes after DB call completes
});
```

**Problems:** One request blocks the event loop. Event loop sits idle waiting for I/O (database, API calls, file reads). Limited concurrency (can't handle other requests during wait). CPU underutilized during I/O waits.

### Asynchronous (Async) Code

In asynchronous code, operations can **yield control** during I/O:

```javascript
// Asynchronous - doesn't block: Yields control during I/O, handles other requests.
app.get("/users/:user_id", async (req, res) => {
    const user = await db.getUser(req.params.user_id);  // Yields control, handles other requests
    res.json(user);  // Resumes when DB responds
});
```

**Benefits:** One event loop can handle thousands of concurrent requests. Event loop switches to other tasks during I/O waits. Better resource utilization. Higher throughput for I/O-bound operations.

## When to Use Async

### ✅ Use Async For:

1. **I/O-bound operations**
   - Database queries (SQL, MongoDB, Redis)
   - HTTP API calls (external services)
   - File I/O operations
   - WebSocket connections

2. **High concurrency needs**
   - Many simultaneous requests
   - Long-polling endpoints
   - Real-time features

3. **Mixed operations**
   - Waiting for multiple services
   - Parallel data fetching

```javascript
// Async allows concurrent operations: Run multiple I/O operations in parallel.
async function getUserProfile(userId) {
    // Promise.all: Executes all operations concurrently, not sequentially.
    const [user, orders, preferences] = await Promise.all([
        db.getUser(userId),
        db.getOrders(userId),
        cache.getPreferences(userId)
    ]);
    return combineProfile(user, orders, preferences);
}
```

**Explanation:** `Promise.all` runs all operations concurrently. Instead of waiting for each one sequentially (3× wait time), they all execute in parallel (1× wait time).

### ❌ Don't Use Async For:

1. **CPU-bound operations**
   - Heavy calculations
   - Image processing
   - Machine learning inference
   - Data transformations

2. **Pure synchronous code**
   - Simple CRUD without async DB drivers
   - Synchronous libraries without async support

```javascript
// CPU-bound - use worker threads or background jobs: Don't block event loop with CPU work.
function calculateStatistics(data) {
    // Heavy computation - blocks event loop
    return complexMathOperation(data);
}

// Better: Move to background job: Don't block response.
const Bull = require('bull');
const statsQueue = new Bull('statistics');

app.post("/analyze", async (req, res) => {
    // Queue job: Runs in background, doesn't block.
    const job = await statsQueue.add({ data: req.body.values });
    res.json({ job_id: job.id });
});
```

**Explanation:** CPU-bound operations should run in worker threads or background jobs. This prevents blocking the async event loop, which is optimized for I/O operations.

## Node.js Event Loop

Node.js uses a single-threaded event loop for async operations:

```javascript
// Event loop: Single thread handles all async I/O efficiently.
app.get("/users/:id", async (req, res) => {
    // Step 1: Request received (event loop)
    const user = await db.getUser(req.params.id);  // Step 2: DB query starts, event loop continues
    // Step 3: Event loop handles other requests while waiting
    // Step 4: DB responds, callback queued
    // Step 5: Event loop processes callback, resumes function
    res.json(user);  // Step 6: Response sent
});
```

**How it works:** When `await` is encountered, Node.js yields control back to the event loop. The event loop can process other requests while waiting for the database. When the database responds, the callback is queued and processed by the event loop.

## Real-World Performance Impact

### Scenario: 1000 concurrent requests fetching from database

**Sync approach:**
- Each request blocks the event loop
- With 4 CPU cores: ~400-800 concurrent requests max
- Memory: ~8MB per thread × 800 = ~6.4GB just for threads
- Slow response times under load

**Async approach:**
- All requests share event loop
- Same 4 cores: easily handle 10,000+ concurrent requests
- Memory: ~50-100MB for event loop
- Fast response times, efficient resource usage

## Common Patterns

### 1. Database Operations

```javascript
// Async database with Sequelize
const { User } = require('../models');

app.get("/users/:user_id", async (req, res, next) => {
    try {
        // Async query: Non-blocking database call.
        const user = await User.findByPk(req.params.user_id);
        res.json(user);
    } catch (error) {
        next(error);  // Pass to error handler
    }
});
```

### 2. Multiple External APIs

```javascript
const axios = require('axios');

// fetchUserData: Fetch from multiple APIs concurrently.
async function fetchUserData(userId) {
    // Promise.all: All requests execute in parallel.
    const [user, orders, analytics] = await Promise.all([
        axios.get(`/api/users/${userId}`),
        axios.get(`/api/orders/${userId}`),
        axios.get(`/api/analytics/${userId}`)
    ]);
    
    return {
        user: user.data,
        orders: orders.data,
        analytics: analytics.data
    };
}
```

### 3. Background Jobs

```javascript
const Bull = require('bull');
const emailQueue = new Bull('email');

// sendEmailNotification: Background job doesn't block response.
async function sendEmailNotification(userId) {
    // This runs in background without blocking
    await emailQueue.add({ userId });
}

app.post("/users/", async (req, res, next) => {
    try {
        const newUser = await db.createUser(req.body);
        // Queue email: Doesn't block response.
        await sendEmailNotification(newUser.id);
        res.status(201).json(newUser);
    } catch (error) {
        next(error);
    }
});
```

## Best Practices

1. **Use async for all I/O operations**
   - Database calls
   - External API calls
   - File operations (with fs.promises)
   - Redis operations

2. **Keep CPU-bound work separate**
   - Use worker threads (worker_threads module)
   - Or process in background jobs (Bull, Agenda)

3. **Handle errors properly**
   - Always use try/catch with async/await
   - Or use .catch() with promises
   - Pass errors to Express error handler

4. **Avoid blocking the event loop**
   - Never use sync versions of I/O functions (fs.readFileSync, etc.)
   - Use async versions (fs.promises.readFile)
   - Move CPU work to workers

## Common Mistakes

### ❌ Blocking the Event Loop

```javascript
// BAD: Synchronous file read blocks event loop.
app.get("/data", (req, res) => {
    const data = fs.readFileSync('large-file.json');  // Blocks!
    res.json(JSON.parse(data));
});
```

### ✅ Non-blocking Alternative

```javascript
// GOOD: Async file read doesn't block.
app.get("/data", async (req, res, next) => {
    try {
        const data = await fs.promises.readFile('large-file.json');
        res.json(JSON.parse(data));
    } catch (error) {
        next(error);
    }
});
```

### ❌ Not Handling Errors

```javascript
// BAD: Unhandled promise rejection.
app.get("/users/:id", async (req, res) => {
    const user = await db.getUser(req.params.id);  // What if this throws?
    res.json(user);
});
```

### ✅ Proper Error Handling

```javascript
// GOOD: Errors caught and handled.
app.get("/users/:id", async (req, res, next) => {
    try {
        const user = await db.getUser(req.params.id);
        res.json(user);
    } catch (error) {
        next(error);  // Pass to error handler middleware
    }
});
```

## Summary

Async operations in Express.js are essential for: High performance (handle thousands of concurrent requests), efficient resource usage (event loop handles I/O), better scalability (single thread, low memory), and non-blocking I/O (database, APIs, files).

**Remember:** Use async for I/O-bound operations, use worker threads for CPU-bound work, always handle errors, and never block the event loop.

---

## 🎯 Interview Questions: Async vs Sync Operations

### Q1: Explain the difference between blocking and non-blocking I/O in Node.js. How does this affect Express.js performance?

**Answer:**

**Blocking I/O** stops execution until the operation completes. **Non-blocking I/O** allows the event loop to handle other operations while waiting.

**Blocking Example:**

```javascript
// ❌ Blocks event loop
app.get('/users/:id', (req, res) => {
    const data = fs.readFileSync('large-file.json'); // Blocks for 2 seconds
    const user = JSON.parse(data).find(u => u.id === req.params.id);
    res.json(user);
    // All other requests wait 2 seconds!
});

// Timeline:
// T=0ms:   Request 1 arrives → starts reading file
// T=0-2000ms: Event loop BLOCKED (can't handle other requests)
// T=2000ms: File read complete → response sent
// T=2001ms: Request 2 can finally be processed
```

**Non-blocking Example:**

```javascript
// ✅ Doesn't block event loop
app.get('/users/:id', async (req, res) => {
    const data = await fs.promises.readFile('large-file.json'); // Yields control
    const user = JSON.parse(data).find(u => u.id === req.params.id);
    res.json(user);
    // Other requests processed while waiting for file read
});

// Timeline:
// T=0ms:   Request 1 arrives → starts reading file (yields)
// T=1ms:   Request 2 arrives → processed immediately
// T=2ms:   Request 3 arrives → processed immediately
// T=2000ms: File read complete → Request 1 resumes → response sent
```

**Visual Comparison:**

```
Blocking I/O:
┌─────────────────────────────────┐
│ Request 1 → File Read (2s)      │ ← Blocks
│ Request 2 → Waiting...          │ ← Blocked
│ Request 3 → Waiting...          │ ← Blocked
│ Request 4 → Waiting...          │ ← Blocked
└─────────────────────────────────┘
Total time: 8 seconds (sequential)

Non-blocking I/O:
┌─────────────────────────────────┐
│ Request 1 → File Read (yield)    │
│ Request 2 → Processed            │ ← Handled immediately
│ Request 3 → Processed            │ ← Handled immediately
│ Request 4 → Processed            │ ← Handled immediately
│ Request 1 → Resumes (2s later)     │
└─────────────────────────────────┘
Total time: ~2 seconds (concurrent)
```

**Performance Impact:**

```
Blocking I/O:
- 1 request at a time
- 1000 requests = 1000 seconds (sequential)
- CPU idle during I/O wait

Non-blocking I/O:
- 10,000+ concurrent requests
- 1000 requests = ~2 seconds (concurrent)
- CPU utilized efficiently
```

---

### Q2: When should you use synchronous operations in Express.js? What are the exceptions?

**Answer:**

**Generally, avoid synchronous operations** in Express.js. However, there are **rare exceptions**:

**✅ Acceptable Synchronous Operations:**

**1. Configuration/Startup:**

```javascript
// ✅ OK: Runs once at startup
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

// ❌ Bad: Runs on every request
app.get('/config', (req, res) => {
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    res.json(config);
});
```

**2. Small, Fast Operations:**

```javascript
// ✅ OK: Very fast, no I/O
const uuid = require('uuid');
app.post('/users', (req, res) => {
    const id = uuid.v4(); // Synchronous but fast (< 1ms)
    // ...
});

// ❌ Bad: Slow synchronous operation
app.get('/process', (req, res) => {
    let sum = 0;
    for (let i = 0; i < 1000000000; i++) {
        sum += i; // Blocks for seconds
    }
    res.json({ sum });
});
```

**3. Critical Path Operations:**

```javascript
// ✅ OK: Must complete before response
app.use((req, res, next) => {
    req.id = crypto.randomUUID(); // Fast, synchronous
    next();
});
```

**When NOT to Use Sync:**

```javascript
// ❌ Database queries
const user = db.getUserSync(id); // Blocks event loop

// ❌ File I/O
const data = fs.readFileSync('file.json'); // Blocks event loop

// ❌ HTTP requests
const response = http.getSync('https://api.example.com'); // Blocks event loop

// ❌ Heavy computation
const result = heavyComputation(data); // Blocks event loop
```

**Rule of Thumb:**

```
Use Synchronous If:
├─ Runs once (startup/config)
├─ Very fast (< 1ms)
├─ No I/O involved
└─ Critical path (must complete)

Use Async If:
├─ I/O operations (DB, files, network)
├─ Can take > 1ms
├─ Called per request
└─ Can yield control
```

---

### Q3: Explain Promise chains vs async/await. When would you use each?

**Answer:**

Both handle asynchronous operations, but with different syntax and use cases.

**Promise Chains:**

```javascript
// Promise chain
app.get('/users/:id', (req, res) => {
    User.findById(req.params.id)
        .then(user => {
            if (!user) {
                return res.status(404).json({ error: 'Not found' });
            }
            return Post.findByUserId(user.id);
        })
        .then(posts => {
            res.json({ user, posts });
        })
        .catch(error => {
            res.status(500).json({ error: error.message });
        });
});
```

**Async/Await:**

```javascript
// Async/await (cleaner)
app.get('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'Not found' });
        }
        const posts = await Post.findByUserId(user.id);
        res.json({ user, posts });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

**Comparison:**

| Feature | Promise Chains | Async/Await |
|---------|---------------|-------------|
| **Readability** | Nested, harder to read | Linear, easier to read |
| **Error Handling** | `.catch()` at end | `try-catch` blocks |
| **Debugging** | Harder (stack traces) | Easier (clear stack) |
| **Conditional Logic** | Complex | Simple (if/else) |
| **Parallel Operations** | `Promise.all()` | `await Promise.all()` |

**When to Use Each:**

**Promise Chains - Use When:**

```javascript
// 1. Simple, single operation
app.get('/users/:id', (req, res) => {
    User.findById(req.params.id)
        .then(user => res.json(user))
        .catch(err => res.status(500).json({ error: err.message }));
});

// 2. Parallel operations with different handling
Promise.all([
    User.findById(1),
    Post.findById(1)
]).then(([user, post]) => {
    // Handle both results
});
```

**Async/Await - Use When:**

```javascript
// 1. Sequential operations
app.get('/users/:id', async (req, res) => {
    const user = await User.findById(req.params.id);
    const posts = await Post.findByUserId(user.id);
    const comments = await Comment.findByPostId(posts[0].id);
    res.json({ user, posts, comments });
});

// 2. Complex conditional logic
app.post('/users', async (req, res) => {
    const existing = await User.findByEmail(req.body.email);
    if (existing) {
        return res.status(400).json({ error: 'Email exists' });
    }
    const user = await User.create(req.body);
    res.json(user);
});
```

**Best Practice:**

```javascript
// ✅ Prefer async/await for most cases
// More readable, easier to debug, better error handling

// ✅ Use Promise.all for parallel operations
const [user, posts] = await Promise.all([
    User.findById(id),
    Post.findByUserId(id)
]);
```

---

### Q4: How do you handle errors in async Express.js route handlers? What are common pitfalls?

**Answer:**

**Common Pitfall: Unhandled Promise Rejections**

```javascript
// ❌ Problem: Error not caught, crashes server
app.get('/users/:id', async (req, res) => {
    const user = await User.findById(req.params.id); // Can throw
    res.json(user);
});
```

**Solution 1: Try-Catch**

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
// Reusable wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Usage
app.get('/users/:id', asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        throw new Error('Not found'); // Automatically caught
    }
    res.json(user);
}));
```

**Solution 3: Express-Async-Errors**

```javascript
// Install: npm install express-async-errors
require('express-async-errors');

// No try-catch needed
app.get('/users/:id', async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        throw new NotFoundError('User not found');
    }
    res.json(user);
});
```

**Error Middleware:**

```javascript
// Must have 4 parameters
app.use((err, req, res, next) => {
    console.error(err.stack);
    
    // Custom error handling
    if (err instanceof NotFoundError) {
        return res.status(404).json({ error: err.message });
    }
    
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
});
```

**Common Pitfalls:**

```javascript
// ❌ Pitfall 1: Forgetting await
app.get('/users/:id', async (req, res) => {
    const user = User.findById(req.params.id); // Missing await
    res.json(user); // user is a Promise, not the actual user
});

// ✅ Fix
const user = await User.findById(req.params.id);

// ❌ Pitfall 2: Not handling null/undefined
app.get('/users/:id', async (req, res) => {
    const user = await User.findById(req.params.id);
    res.json(user.name); // Error if user is null
});

// ✅ Fix
if (!user) {
    return res.status(404).json({ error: 'Not found' });
}

// ❌ Pitfall 3: Error in promise chain not caught
app.get('/users/:id', (req, res) => {
    User.findById(req.params.id)
        .then(user => {
            return Post.findByUserId(user.id); // Error if user is null
        })
        .then(posts => res.json(posts))
        // Missing .catch() - unhandled rejection
});

// ✅ Fix
.catch(err => res.status(500).json({ error: err.message }));
```

---

### Q5: How does Node.js handle concurrent async operations? Explain the event loop's role.

**Answer:**

Node.js uses an **event loop** to handle concurrent async operations with a **single thread**.

**Event Loop Architecture:**

```
┌─────────────────────────────────────────┐
│         Event Loop (Single Thread)      │
│                                         │
│  Phases:                                │
│  1. Timers (setTimeout, setInterval)   │
│  2. Pending Callbacks (I/O callbacks)   │
│  3. Idle, Prepare                      │
│  4. Poll (fetch new I/O events)        │
│  5. Check (setImmediate callbacks)      │
│  6. Close Callbacks                    │
│                                         │
│  Between phases:                        │
│  - process.nextTick() queue            │
│  - Promise microtasks                  │
└─────────────────────────────────────────┘
```

**Concurrent Request Handling:**

```javascript
// 3 requests arrive simultaneously
app.get('/users/:id', async (req, res) => {
    const user = await User.findById(req.params.id); // Yields
    res.json(user);
});

// Timeline:
// T=0ms:   Request 1 → starts DB query (yields to event loop)
// T=1ms:   Request 2 → starts DB query (yields to event loop)
// T=2ms:   Request 3 → starts DB query (yields to event loop)
// T=3-50ms: Event loop handles other operations
// T=50ms:  DB responds to Request 1 → resumes → sends response
// T=51ms:  DB responds to Request 2 → resumes → sends response
// T=52ms:  DB responds to Request 3 → resumes → sends response
```

**Visual Flow:**

```
Request 1: [Start] → [DB Query] ⏸️ → [Resume] → [Response]
Request 2: [Start] → [DB Query] ⏸️ → [Resume] → [Response]
Request 3: [Start] → [DB Query] ⏸️ → [Resume] → [Response]

Event Loop:
[Request 1 yields] → [Request 2 yields] → [Request 3 yields]
→ [Handle other operations]
→ [Request 1 resumes] → [Request 2 resumes] → [Request 3 resumes]
```

**Key Points:**
- **Single thread** handles all requests
- **Non-blocking I/O** allows concurrency
- **Event loop** switches between operations
- **10,000+ concurrent requests** possible

---

### Q6: What happens if you block the event loop in Express.js? How do you identify and fix it?

**Answer:**

**Blocking the event loop** prevents Node.js from handling other requests, causing **timeouts and poor performance**.

**Common Blocking Operations:**

```javascript
// ❌ Problem 1: Synchronous file I/O
app.get('/data', (req, res) => {
    const data = fs.readFileSync('large-file.json'); // Blocks 2 seconds
    res.json(JSON.parse(data));
});

// ❌ Problem 2: CPU-intensive computation
app.get('/process', (req, res) => {
    let sum = 0;
    for (let i = 0; i < 1000000000; i++) {
        sum += i; // Blocks for seconds
    }
    res.json({ sum });
});

// ❌ Problem 3: Synchronous database query
app.get('/users/:id', (req, res) => {
    const user = db.querySync('SELECT * FROM users WHERE id = ?', [req.params.id]);
    res.json(user);
});
```

**Identifying Blocking:**

```javascript
// Monitor event loop lag
const { performance } = require('perf_hooks');

setInterval(() => {
    const start = performance.now();
    setImmediate(() => {
        const lag = performance.now() - start;
        if (lag > 10) {
            console.warn(`Event loop lag: ${lag}ms`);
        }
    });
}, 1000);
```

**Fixing Blocking Operations:**

```javascript
// ✅ Solution 1: Use async I/O
app.get('/data', async (req, res) => {
    const data = await fs.promises.readFile('large-file.json');
    res.json(JSON.parse(data));
});

// ✅ Solution 2: Use worker threads for CPU-intensive
const { Worker } = require('worker_threads');

app.get('/process', (req, res) => {
    const worker = new Worker('./heavy-computation.js');
    worker.postMessage(req.body);
    worker.on('message', (result) => {
        res.json({ result });
    });
});

// ✅ Solution 3: Use async database queries
app.get('/users/:id', async (req, res) => {
    const user = await db.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    res.json(user);
});
```

**Monitoring Tools:**

```javascript
// 1. Event loop monitoring
const { performance } = require('perf_hooks');

// 2. Process monitoring
process.on('SIGUSR2', () => {
    console.log(process.memoryUsage());
    console.log(process.cpuUsage());
});

// 3. APM tools
// New Relic, DataDog, etc.
```

---

## Summary

These interview questions cover:
- ✅ Blocking vs non-blocking I/O and performance impact
- ✅ When to use synchronous operations (rare exceptions)
- ✅ Promise chains vs async/await
- ✅ Error handling in async code
- ✅ Event loop and concurrent operations
- ✅ Identifying and fixing event loop blocking

Master these for mid-level and senior Express.js interviews focusing on async operations and performance.

