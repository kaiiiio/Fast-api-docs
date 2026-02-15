<!-- RESPONSIBILTIES
Lead end-to-end development across frontend and backend.
Build and maintain scalable React.js frontend applications and NestJS* (Node.js + TypeScript) backend services.
Design and optimize RESTful APIs, database structures, and system workflows.
Guide, mentor, and support team members in problem-solving and technical decisions.
Conduct code reviews, enforce clean coding practices, and ensure delivery quality.
Collaborate with product and management teams to align technology with business goals.
Ensure performance, scalability, and security of applications.
Collaborate with DevOps, Designers and other team members for project.



Required Skills & Qualifications
4–5 years of hands-on experience as a Full Stack Lead Developer.
Strong expertise in React.js (frontend) and Node.js with NestJS + TypeScript (backend).
Proficiency in designing REST APIs, SQL/NoSQL databases, and scalable architectures.
Solid understanding of software engineering best practices, Git, and CI/CD pipelines.
Strong problem-solving, debugging, and optimization skills.
Prior experience as a Team Lead is highly desirable.
Experience with Serverless architecture, AWS ecosystem and Knowledge of microservices and containerization will be plus point. -->


React + Nest + Nodejs + typescript + RestfulAPI, DBMS, Git, and CI/CD pipelines, Serverless architecture, AWS ecosystem
---
### Lead Focus: REST API Best Practices
*   **Statelessness**: Server doesn't store session state; all info is in JWT. **Why**: Enables **Horizontal Scaling**—any server node behind a Load Balancer can handle any request.

*   **Versioning**: `/v1/` path prefix. **Why**: Ensures **Backward Compatibility**; new updates won't break existing mobile/frontend clients still using older routes.

*   **Idempotency**: `PUT`/`PATCH` for updates, `X-Idempotency-Key` for `POST`. 
    *   **Why**: Guaranteed **Safe Retries**; prevents duplicate data if a request is sent twice.
    *   **How**: `PUT` is idempotent by design (replaces state); for `POST`, the server stores the `X-Idempotency-Key` in **Redis** for 24h. If the same key is seen again, the server returns the **cached response** instead of re-running the logic.

*   **Performance**: Cursor Pagination + JSONB. **Why**: Cursors scale better than Offset for large datasets; JSONB allows flexible metadata without frequent DB migrations.

*   **Security**: Rate-Limiting + DTO Whitelisting. **Why**: Prevents **DoS attacks** and **Mass-Assignment** vulnerabilities (users hacking fields they shouldn't).
---

DSA, queries, machine code(hooks)

IMP
------------------------------------------------------

# Interview Preparation Guide: DecodeUp (Full Stack Lead)

## 1. Microservices Architecture: Key Patterns
Since the JD mentions Microservices as a plus point, expect these foundational questions.

### Main Patterns
1. **Database per Service**: 
   - **What it is**: Each microservice has its own private database. Other services cannot access it directly.
   - **Benefits**: Ensures loose coupling; one service's DB failure/update doesn't break others.
   - **Challenge**: Data consistency (requires Saga pattern or Eventual Consistency).

2. **API Gateway Pattern**:
   - **What it is**: A single entry point for all client requests. It routes requests to the appropriate microservice.
   - **Benefits**: Handles Authentication, SSL termination, and Response Aggregation (BFF).
   - **Challenge**: Can become a single point of failure if not scaled properly.

3. **Saga Pattern (Consistency across services)**:
   - **Choreography**: Each service publishes an event that triggers the next service. **Pros**: No single point of control, easy for simple flows. **Cons**: Hard to track state across many services; can lead to cyclic dependencies.
   - **Orchestration**: A central "Orchestrator" service coordinates all transactions. **Pros**: State is centralized and easy to monitor; prevents cyclic dependencies. **Cons**: Orchestrator becomes a complex "God Service" and a single point of failure.
   - **Compensating Transactions**: Every Saga step must have a "Rollback" action if a later step fails (e.g., if Payment fails, notify Shipping to cancel).

**Example: Saga Orchestration (Pseudo-code)**
```javascript
async function createOrderSaga(orderData) {
  try {
    const order = await OrderService.create(orderData);
    await PaymentService.charge(order.total);
    await InventoryService.reserve(order.items);
    await OrderService.markAsPaid(order.id);
  } catch (err) {
    // Compensating Transactions
    await OrderService.cancel(order.id);
    await PaymentService.refund(order.total);
    await InventoryService.release(order.items);
  }
}
```

### Inter-service Communication
*   **Synchronous (Request/Response)**: 
    - **Protocols**: HTTP/REST, gRPC.
    - **Trade-off**: Simple to implement but causes **Temporal Coupling** (Service A must be UP for Service B to succeed). Can lead to "Distributed Monoliths".
*   **Asynchronous (Event-Driven)**: 
    - **Systems**: RabbitMQ, Apache Kafka, AWS SQS/SNS.
    - **Concepts**: **Pub/Sub** and **Message Queues**.
    - **Trade-off**: Decouples services, provides **High Availability** (messages wait in queue if consumer is down), and enables scaling. **Challenge**: Eventual Consistency and complexity in tracking "failed" events (DLQ - Dead Letter Queues).

---

## 2. Technical Interview Q&A (NestJS & React)

### NestJS (Backend)
**Q: How does Dependency Injection (DI) work in NestJS?**
**A:** DI is a design pattern where a class requests dependencies from external sources rather than creating them. 
- **IoC Container**: NestJS uses an Internal Inversion of Control (IoC) container to manage these dependencies.
- **Scopes**:
    - **DEFAULT (Singleton)**: One instance is shared across the entire app (v. efficient).
    - **REQUEST**: A new instance is created for every incoming request (useful for tenant-specific data).
    - **TRANSIENT**: A new instance is created every time it's injected.
- **Custom Providers**: Can use `useValue`, `useClass`, or `useFactory` for complex injection logic (e.g., dynamic DB connections).

**Q: Explain the lifecycle of a request in NestJS.**
**A:** In a Lead context, understanding the *execution order* and *purpose* of each layer is critical:
1.  **Guards**: Processed first. Used for **Authentication & Authorization** (Can the requester proceed?).
2.  **Interceptors (Pre-controller)**: Implement Aspect-Oriented Programming (AOP). Can transform the stream or bind extra logic to the request.
3.  **Pipes**: Used for **Validation & Transformation** (is the data correct? e.g., `ParseIntPipe`).
4.  **Controller**: Maps the request to a specific method handler.
5.  **Service**: Contains the core business logic.
6.  **Interceptors (Post-controller)**: Can transform the result (e.g., wrapping in a `data` object).
7.  **Exception Filters**: The last stop for any unhandled errors. Formats the error response for the client.

**Q: How do you handle circular dependencies in NestJS?**
**A:** Circular dependencies occur when Class A requires Class B, and Class B requires Class A. NestJS cannot instantiate them because it doesn't know which one to create first.
- **The Fix (`forwardRef`)**: We use the `forwardRef(() => ClassName)` utility. This tells NestJS to "wait" and resolve the reference later (lazy resolution) during the instantiation process.
- **Where to apply**: 
    1. **Modules**: In the `imports` array of both modules.
    2. **Constructors**: Using the `@Inject(forwardRef(() => ServiceName))` decorator in the class constructors.
- **Lead Tip**: While `forwardRef` works, frequent circular dependencies often signal poor architectural design. Consider refactoring common logic into a third "Shared" module or using a **Mediator Pattern**.

### React (Frontend)
**Q: How do you optimize a large-scale React application?**  IMP

**A:** Beyond simple memoization, a Lead must understand the **Reconciliation** process:
- **Fiber Engine**: React's core algorithm that allows "incremental rendering"—breaking rendering work into chunks and spreading it out over multiple frames to keep the UI responsive.
- **Code Splitting**: Use `React.lazy` and `Suspense` to load components only when needed, reducing initial bundle size. Use **Route-based splitting** for major sections.
- **State Colocation**: Keep state only as high as necessary. Moving state up for convenience causes massive re-renders. Use `Zustand` or `Recoil` for selective state subscription.
- **Virtualization**: For datasets > 500 items, use `react-window` to only render what's visible in the viewport.
- **Transition API (`useTransition`)**: Mark non-urgent updates (like search filtering) as transitions to keep high-priority interactions (like typing) snappy.

**Q: What is the difference between Server Components and Client Components in React 18?**
**A:** Server Components render on the server, reducing the JS bundle size on the client. They can be `async` and fetch data directly from the DB. Client Components are traditional components that use hooks (`useState`, `useEffect`) and run on the client.

**Example: Server Component (Next.js)**
```javascript
// ProductList.js - Server Component
import { db } from './lib/db';

export default async function ProductList() {
  const products = await db.product.findMany(); // Direct DB access
  
  return (
    <ul>
      {products.map(p => <li key={p.id}>{p.name}</li>)}
    </ul>
  );
}
```

**Q: When would you use `useTransition` or `useDeferredValue`?**  IMP
**A:** 
- **useTransition**: Used to mark a state update as a "transition" that doesn't block the UI. Useful for heavy UI updates that can wait (e.g., filtering a long list).
- **useDeferredValue**: Used to defer a value that is expensive to render. It lets React prioritize more urgent updates (like input typing) over the expensive render.

**Example: useTransition**
```javascript
function Search() {
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [list, setList] = useState(bigList);

  const handleChange = (e) => {
    setQuery(e.target.value); // Urgent: Update input field
    startTransition(() => {
      // Non-urgent: Update list (can be interrupted)
      setList(bigList.filter(item => item.includes(e.target.value)));
    });
  };

  return (
    <div>
      <input value={query} onChange={handleChange} />
      {isPending ? <p>Loading...</p> : <List items={list} />}
    </div>
  );
}
```

**Example: useDeferredValue**
```javascript
function SearchPage({ query }) {
  // query updates immediately as you type.
  // deferredQuery "lags behind" until the main thread is free.
  const deferredQuery = useDeferredValue(query);
  
  return (
    <Suspense fallback="Loading results...">
      <SlowResults query={deferredQuery} />
    </Suspense>
  );
}
```

**Q: React SPA vs. Next.js (SSR, SSG, ISR)?**
**A:** A Lead must justify the architecture based on project needs:
- **React SPA (CSR)**: Client-side rendering. Best for gated dashboards. **Pros**: Full control after load. **Cons**: Poor SEO, slow "First Meaningful Paint".
- **Next.js SSG (Static Site Generation)**: HTML generated at **Build Time**. Best for Blogs/Marketing. **Pros**: Extremely fast (Edge). **Cons**: Data can be stale.
- **Next.js SSR (Server-Side Rendering)**: HTML generated at **Request Time**. Best for dynamic data (e.g., User Feed). **Pros**: Always fresh data + SEO. **Cons**: Server load, slower TTFB.
- **Next.js ISR (Incremental Static Regeneration)**: Allows updating static pages *after* build in the background. **The Gold Standard** for large e-commerce. You refresh the cache every X seconds (e.g., `revalidate: 60`).

---

## 3. Lead & Architectural Questions

**Q: How do you handle a bottleneck in a SQL database?**
**A:** Identify if the bottleneck is **RAM, CPU, or I/O**:
- **Read Replicas**: Offload READ traffic to replicas. Handle the **Replication Lag** (reading stale data) by forcing "Critical Reads" (e.g., profile updates) to hit the Primary DB.
- **Connection Pooling**: Use a tool like **PgBouncer** to prevent the "Too many connections" error in high-concurrency Node.js apps.
- **Normalization vs. Denormalization**: In heavy read apps, cautiously denormalize (redundant data) to avoid expensive JOINs.
- **Vertical vs. Horizontal Sharding**: 
    - **Vertical**: Split tables into different DBs based on domain.
    - **Horizontal (Sharding)**: Split data within one table across multiple DB instances based on a **Shard Key** (e.g., `user_id % 10`).
- **Index Optimization**: Use `EXPLAIN ANALYZE` to find slow queries and add missing indexes (or remove redundant ones).

**Q: In-Memory Caching (Redis vs. Memcached): When to use what and which strategies to apply?**
**A:** As a Lead, you must choose caching based on scale and data complexity:
- **Redis (Recommended)**: Supports complex data types (Lists, Sets, Hashes), persistence (AOF/RDB), and Pub/Sub. Best for session management, leaderboards, and rate-limiting.
- **Memcached**: Simple, multi-threaded, and extremely fast for simple key-value pairs. Use if you only need a basic object cache with high concurrent read throughput.
- **Caching Strategies**:
    1. **Cache-Aside (Lazy Loading)**: The app checks the cache; if a "miss," it fetches from DB and populates the cache. *Pros*: Resilient to cache failure. *Cons*: First request is always slow.
    2. **Write-Through**: Data is written to both the cache and the DB simultaneously. *Pros*: Ensures consistency. *Cons*: Higher write latency.
    3. **Write-Behind (Write-Back)**: Data is written to the cache and then asynchronously to the DB. *Pros*: High write performance. *Cons*: Risk of data loss if the cache crashes before the DB write.
- **Eviction Policies**: Always mention **LRU (Least Recently Used)** and **TTL-based expiration** to prevent the cache from running out of memory.

**Q: Explain the CAP Theorem and its extension PACELC.**   IMP

**A:** 
- **CAP Theorem**: In a distributed system, you can only have 2 of 3:
    - **Consistency (C)**: Every read receives the most recent write.
    - **Availability (A)**: Every request receives a response (not guaranteed to be the latest data).
    - **Partition Tolerance (P)**: The system continues to operate despite network failures.
- **Lead Perspective (PACELC)**: Since "P" is usually non-negotiable in distributed systems, we choose between:
    - **P + A**: Availability over Consistency.
    - **P + C**: Consistency over Availability.
- **The Extension**: PACELC adds: "Else (in the absence of a partition), how does the system behave (Latency vs. Consistency)?" 
    - E.g., DynamoDB (AP) vs. MongoDB (CP).

**Q: What is the Circuit Breaker pattern and why is it important specifically for microservices?**
**A:** It prevents a failure in one provider service from cascading to the rest of the system.
- **States of a Circuit Breaker**:
    1. **CLOSED**: Request flows normally. Failures are tracked.
    2. **OPEN**: If failures exceed a threshold, the breaker "trips". Requests are rejected immediately (fail-fast) without hitting the backend, giving it time to recover.
    3. **HALF-OPEN**: After a timeout, the breaker allows a *limited* number of test requests. If they succeed, it returns to CLOSED; if they fail, it goes back to OPEN.
- **Tools**: `Resilience4j` (Java), `Hystrix` (Legacy), or `Opossum` (Node.js).

**Example: Opossum (Node.js)**
```javascript
const circuit = new CircuitBreaker(asyncFetchData, options);

circuit.fallback(() => ({ error: "Service currently unavailable" }));

circuit.on('open', () => console.log('Circuit is OPEN'));
circuit.fire(args).then(console.log).catch(console.error);
```

**Q: How do you conduct an effective Code Review?**
**A:** Focus on:
- **Logic & Correctness**: Does the code solve the problem?
- **Readability**: Is the code clean and well-documented?
- **Security**: Any vulnerabilities (SQL injection, XSS)?
- **Performance**: Are there nested loops or unoptimized DB queries?
- **Maintainability**: Does it follow the established architecture?

**Q: Experience with Serverless/AWS? (Lambda + NestJS)**
**A:** 
- **Concept**: Serverless doesn't mean "no servers". It means you don't manage them. It's **Event-driven** and **Auto-scaling**.
- **Pros**: Pay-only-for-what-you-use, zero maintenance, high availability.
- **Cons**: **Cold Start** latency (first request after idle time), execution time limits (max 15 min for Lambda).
- **NestJS on Lambda**: Since Lambda expects a single function, we use an adapter like `@vendia/serverless-express` to wrap the entire NestJS app into a handler.
- **Core AWS Services for a Full Stack Lead**:
    - **S3**: Object storage for images/videos.
    - **Cognito**: Managed Auth (JWT, OAuth, Social logins).
    - **SQS/SNS**: For background jobs and inter-service communication (Pub/Sub).
    - **Lambda**: Compute layer for business logic.
    - **DynamoDB**: NoSQL for high-speed, scale-at-will data.

---

## 4. Tips to Crack DecodeUp (Surat Based Lead Role)
- **Local Context**: Being a Surat company, they might value stability and the ability to build a team locally.
- **Ownership**: Since it's a Lead role, show that you take ownership of the "End-to-End" delivery, not just writing code.
- **Mentorship**: Prepare examples of how you've helped junior devs grow.
- **System Design**: Be ready to draw a high-level architecture of a scalable app on a whiteboard/tool.

---

## 5. Machine Coding & Practical Tasks

### Frontend: Debounce Function
**Task:** Implement a custom `debounce` function.
```javascript
const debounce = (fn, delay) => {
    let timeoutId;
    return (...args) => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            fn(...args);
        }, delay);
    };
};
```

### Backend: NestJS Logger Interceptor
**Task:** Create an interceptor that logs the time taken for each request. --- IMP
```typescript
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    return next
      .handle() // Mandatory to call handle() to execute the route handler
      .pipe(
        tap(() => console.log(`Time taken: ${Date.now() - now}ms`))
      );
  }
}
```

**Syntax Breakdown:**
1.  **`intercept(...)`**: The core method required by the `NestInterceptor` interface. It is the entry point for the interception logic.
2.  **`context: ExecutionContext`**: An object that provides information about the current request. It allows you to:
    - Determine which controller/class is being called (`context.getClass()`).
    - Determine which specific method/handler is being called (`context.getHandler()`).
    - Switch contexts using `switchToHttp()` to access the raw Express/Fastify `Request` and `Response` objects.
3.  **`next: CallHandler`**: Represents the next step in the request execution pipe. You **must** call `next.handle()` to trigger the actual route handler (the method in your controller). If you don't return `next.handle()`, the request will never reach your controller.
4.  **`Observable<any>`**: In NestJS, interceptors use **RxJS**. `next.handle()` returns an Observable. This is powerful because it allows you to use operators like `tap` (for side effects like logging), `map` (to transform the response body), or `catchError` (to handle errors globally).

### Frontend: Custom Hook `useLocalStorage`
**Task:** Create a hook to sync state with localStorage.
```javascript
function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValue = (value) => {
    setStoredValue(value);
    window.localStorage.setItem(key, JSON.stringify(value));
  };

  return [storedValue, setValue];
}
```

---

## 6. Data Structures & Algorithms (For Interviews)

**Q: Group Anagrams**
**Input:** `["eat", "tea", "tan", "ate", "nat", "bat"]`
**Logic:** Use a HashMap where the key is the sorted string and the value is an array of strings.
```javascript
var groupAnagrams = function(strs) {
    let obj = {};
    for (let str of strs) {
        let sortedStr = str.split('').sort().join('');
        if (!obj[sortedStr]) obj[sortedStr] = [];
        obj[sortedStr].push(str);
    }
    return Object.values(obj);
};
```

**Q: Longest Substring Without Repeating Characters**
**Concept:** Use the **Sliding Window** technique with a Set to track characters.

**Q: Flatten a Deeply Nested Object**
**Logic:** Use **Recursion**. Base case is when the value is not an object.
```javascript
const flattenObj = (obj, parent = '', res = {}) => {
    for (let key in obj) {
        let propName = parent ? parent + '_' + key : key;
        if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
            flattenObj(obj[key], propName, res);
        } else {
            res[propName] = obj[key];
        }
    }
    return res;
};
```

**Q: Two Sum (Classic DSA)**
**Logic:** Use a Map to store "needed complement" for each number.
```javascript
const twoSum = (nums, target) => {
    let map = new Map();
    for (let i = 0; i < nums.length; i++) {
        let complement = target - nums[i];
        if (map.has(complement)) return [map.get(complement), i];
        map.set(nums[i], i);
    }
    return [];
};
```

### Machine Coding: Custom EventEmitter
**Task:** Build a simple EventEmitter class with `on`, `emit`, and `off`.
```javascript
class MyEventEmitter {
    constructor() {
        this.events = {};
    }
    on(event, cb) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(cb);
    }
    emit(event, ...args) {
        if (this.events[event]) {
            this.events[event].forEach(cb => cb(...args));
        }
    }
    off(event, cb) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(l => l !== cb);
        }
    }
}
```

### Backend: Simple Rate Limiter (Memory-based)
**Task:** Implement a basic rate limiter that allows $X$ requests per $Y$ seconds.
```javascript
const rateLimit = {};
const REQUEST_LIMIT = 5;
const WINDOW_TIME = 60 * 1000; // 1 minute

const isRateLimited = (userId) => {
    const now = Date.now();
    if (!rateLimit[userId]) {
        rateLimit[userId] = [now];
        return false;
    }
    // Remove old timestamps
    rateLimit[userId] = rateLimit[userId].filter(time => now - time < WINDOW_TIME);
    
    if (rateLimit[userId].length >= REQUEST_LIMIT) return true;
    
    rateLimit[userId].push(now);
    return false;
};
```

### Frontend: Advanced `useFetch` Hook
**Task:** Create a hook with AbortController, Caching, and loading state.
```javascript
const cache = {};

function useFetch(url) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (cache[url]) {
            setData(cache[url]);
            setLoading(false);
            return;
        }

        const controller = new AbortController();
        fetch(url, { signal: controller.signal })
            .then(res => res.json())
            .then(json => {
                cache[url] = json;
                setData(json);
                setLoading(false);
            })
            .catch(err => {
                if (err.name !== 'AbortError') console.error(err);
            });

        return () => controller.abort();
    }, [url]);

    return { data, loading };
}
```

---

## 7. Database Query Writing & Optimization

**Q: Write a query to find the 2nd Highest Salary.**
```sql
-- Using LIMIT and OFFSET
SELECT Salary FROM Employees ORDER BY Salary DESC LIMIT 1 OFFSET 1;

-- Using Subquery
SELECT MAX(Salary) FROM Employees WHERE Salary < (SELECT MAX(Salary) FROM Employees);

-- Using Window Function
SELECT Salary FROM (
    SELECT Salary, DENSE_RANK() OVER(ORDER BY Salary DESC) as rnk FROM Employees
) as temp WHERE rnk = 2;
```

**Q: Find Duplicates in a Table.**
```sql
SELECT email, COUNT(email) 
FROM Users 
GROUP BY email 
HAVING COUNT(email) > 1;
```

**Q: Query to Join Users, Orders, and Products.**
```sql
SELECT u.name, o.order_date, p.product_name
FROM Users u
INNER JOIN Orders o ON u.id = o.user_id
INNER JOIN Order_Items oi ON o.id = oi.order_id
INNER JOIN Products p ON oi.product_id = p.id;
```

**Optimization Tip:** Always mention **Indexing** (B-Tree), **Execution Plans** (EXPLAIN), and avoiding **N+1 queries** in ORMs like TypeORM or Prisma.

---

## 8. Advanced SQL & Scenario Queries


**Q: Calculate cumulative sum of sales by date.**
```sql
SELECT 
    sale_date, 
    amount,
    SUM(amount) OVER (ORDER BY sale_date) as cumulative_sales
FROM Sales;
```

**Q: Using CTE (Common Table Expression) to find high-performing employees.**
```sql
WITH DeptAvg AS (
    SELECT dept_id, AVG(salary) as avg_sal
    FROM Employees
    GROUP BY dept_id
)
SELECT e.name, e.salary, d.avg_sal
FROM Employees e
JOIN DeptAvg d ON e.dept_id = d.dept_id
WHERE e.salary > d.avg_sal;
```

**Q: Recursive CTE for Organizational Hierarchy (Manager-Employee relationship).**
```sql
WITH RECURSIVE OrgChart AS (
    -- Anchor member: Start with the CEO
    SELECT id, name, manager_id, 1 as level
    FROM Employees WHERE manager_id IS NULL
    UNION ALL
    -- Recursive member: Find employees for each manager
    SELECT e.id, e.name, e.manager_id, oc.level + 1
    FROM Employees e
    JOIN OrgChart oc ON e.manager_id = oc.id
)
SELECT * FROM OrgChart ORDER BY level;
```

---

## 9. Performance Tuning (Node.js & React)

**Q: How do you identify and fix a memory leak in Node.js?**
**A:**
- **Symptoms**: High resident set size (RSS) or increasing heap usage over time.
- **Tools**: Use `node --inspect` with Chrome DevTools or `clinic.js`.
- **Causes**: Global variables, forgotten timers, closures holding large data.
- **Fix**: Take heap snapshots, compare them, and refactor code to release references.

**Q: What is the "Event Loop" and how can you block it?**
**A:** Node.js is single-threaded but achieves high throughput by offloading I/O operations to the system kernel. The **Event Loop** is the mechanism that orchestrates this.
- **Phases of Execution**:
    1. **Timers**: `setTimeout` and `setInterval` callbacks.
    2. **I/O Callbacks**: Most callbacks except timers and close events.
    3. **Poll**: Retrieving new I/O events (where Node stays longest).
    4. **Check**: `setImmediate()` callbacks.
    5. **Close**: `socket.on('close')` etc.
- **Macrotask Queue (Task Queue)**:
    - `setTimeout()` / `setInterval()`
    - `setImmediate()` (Node.js specific)
    - I/O tasks (File system, Network)
    - UI Rendering (Browser specific)
- **Microtask Queue**:
    - `process.nextTick()` (Executed immediately after the current operation, before the next phase)
    - `Promises` (`.then`, `.catch`, `.finally`)
    - `Async/Await` (Syntactic sugar for Promises)
- **Execution Order**: 
    1. Executing Macrotasks. 
    2. Emptying Microtask queue.
    3. Emptying Render queue (for browsers).

**Example: Loop Execution Order**
```javascript
console.log("1. Start"); 

setTimeout(() => console.log("2. Timeout (Macrotask)"), 0);

Promise.resolve().then(() => console.log("3. Promise (Microtask)"));

process.nextTick(() => console.log("4. nextTick (Microtask)"));

console.log("5. End");

// Output Order: 1, 5, 4, 3, 2
```

- **Blocking the Loop**: Running heavy synchronous code (CPU tasks like encryption, large JSON parsing, or image processing) prevents the loop from proceeding. This freezes the entire process for *all* users.
- **How to Fix**:
    - **Worker Threads**: Offload CPU tasks to separate threads using the `worker_threads` module.
    - **Partitioning**: Break large synchronous tasks into chunks using `setImmediate()`.
    - **Offloading**: Move heavy logic to a separate microservice or a background worker (Redis/BullMQ).

---

## 10. Advanced Lead Topics: Security & Scaling

**Q: How do you secure a NestJS API?**
**A:** In a Lead role, security must be multi-layered:
- **Authentication (JWT Deep Dive)**: Use Passport.js with JWT. 
    - **Access/Refresh Pattern**: Issue a short-lived Access Token (15m) and a long-lived Refresh Token (stored in an **HttpOnly, Secure cookie**) to mitigate XSS.

**Example: Refresh Token Flow (Pseudo-code)**
```javascript
// Auth Controller
@Post('refresh')
async refresh(@Req() req, @Res() res) {
  const refreshToken = req.cookies['refresh_token'];
  const user = await this.authService.validateRefresh(refreshToken);
  
  const newAccessToken = this.authService.generateAccessToken(user);
  return res.send({ accessToken: newAccessToken });
}
```
- **Authorization**: Implement **RBAC** (Role-Based) or **ABAC** (Attribute-Based) using NestJS Guards and Decorators.
- **Input Validation**: Use `class-validator` with `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` to prevent mass-assignment attacks.
- **Security Headers**: Integrate `helmet` to set CSP, HSTS, and prevent Clickjacking.
- **Throttling**: Use `@nestjs/throttler` to implement rate-limiting per IP/User to prevent Brute-force and DoS.

**Q: Horizontal vs Vertical Scaling?**
**A:**
- **Vertical Scaling (Scale UP)**: Increasing the capacity of a single server (more RAM/CPU). 
    - **Pros**: Easy setup, no code changes. 
    - **Cons**: Upward limit (hardware ceiling), Single Point of Failure, expensive legacy hardware.
- **Horizontal Scaling (Scale OUT)**: Adding more server instances to the pool.
    - **Pros**: Infinite scaling, high availability, cost-effective (cheap commodity servers).
    - **Cons**: Requires a **Load Balancer**, necessitates **Stateless** architecture (no local sessions), adds complexity to deployment and data consistency.

---

## 11. Testing & Quality Assurance

**Q: What is your Testing Strategy for a Full Stack app?**
**A:** A Lead must advocate for the **Testing Pyramid**:
1.  **Unit Tests (60-70%)**: Test isolated logic (services, utils) using **Jest**. High speed, low cost.
2.  **Integration Tests (20-30%)**: Test how modules, controllers, and DB work together (e.g., NestJS `TestingModule`). Verifies the "wiring".
3.  **E2E Tests (5-10%)**: Real user flows (Playwright/Cypress). High confidence, high cost/slow.
- **Lead Metrics**: Monitor **Code Coverage** (aim for 80%) and implement **Contract Testing** (Pact) for microservices to ensure API changes don't break consumers.

---

## 12. DevOps & Deployment (CI/CD)

**Q: Describe a standard CI/CD Pipeline & Deployment Strategies.**
**A:**
- **Pipeline Stages**:
    1. **Build & Test**: Compile TypeScript, run Unit/Integration tests.
    2. **Lint & Analysis**: Check code quality (ESLint, SonarQube).
    3. **Containerization**: Build Docker images and push to a registry (e.g., AWS ECR).
    4. **Staging**: Deploy to a mirror of production for final QA.
- **Deployment Strategies**:
    - **Blue-Green**: Have two identical environments. Deploy to "Green" and switch the Load Balancer once verified. Zero-downtime + instant rollback.
    - **Canary**: Deploy the new version to a small subset of users (e.g., 5%) and monitor error rates before rolling out to everyone.
    - **Rolling Update**: Incrementally replace old instances with new ones. Balanced but requires backward compatibility (at the DB level).

---

## 13. Scenario-Based Lead Q&A

**Q: A critical bug is found in production 30 mins before a long weekend. What do you do?**
**A:** 
1. **Assess Impact**: How many users are affected?
2. **Mitigate**: Rollback if it was a recent deployment.
3. **Hotfix**: If rollback isn't possible, fix and push immediately.
4. **Communicate**: Keep stakeholders informed.
5. **Post-Mortem**: Analyze why it happened and prevent recurrence.

**Q: Your management wants to use a new technology just because it's "hype". How do you handle this?**
**A:** 
- Ask for a **POC (Proof of Concept)**. 
- Conduct a **Cost-Benefit Analysis**: Community support, learning curve, performance, and long-term maintainability.
- Present a data-backed comparison between the current tech and the new one.

**Q: Two of your developers are having a personal conflict that is affecting the project. How do you handle it?**
**A:** 
1. **Private Discussion**: Talk to each person separately to understand their perspective.
2. **Mediation**: Bring them together to find common ground, focusing strictly on work impact.
3. **Set Boundaries**: Reinforce professional standards and the team's goals.
4. **Follow Up**: Monitor the situation; if it persists, involve HR or higher management.

**Q: A project manager introduces a major requirement change mid-sprint. How do you respond?**
**A:** 
1. **Analyze Impact**: How does this affect current tasks and the sprint goal?
2. **Transparent Conversation**: Explain the trade-offs (e.g., "We can add this, but Feature X will have to move to the next sprint").
3. **Negotiate**: Suggest a phased approach—add a simplified version now and the full one later.
4. **Decision**: Let the stakeholders decide once they understand the impact on the timeline.

---

## 14. High-Level System Design (Lead Level)

**Q: Design a Real-time Task Management System (like Jira/Asana).**
**A:**
- **Frontend**: React with **Zustand** (lightweight state) or **Redux Toolkit**. Use **WebSockets** (Socket.io) for real-time updates.
- **Backend**: NestJS Microservices.
    - **Auth Service**: Identity management (JWT/OAuth).
    - **Project Service**: CRUD for projects and tasks.
    - **Notification Service**: Sends emails/push notifications (Async communication via **RabbitMQ**).
- **Database**:
    - **PostgreSQL**: For relational data (Users, Projects, Permissions).
    - **Redis**: For caching task details and managing real-time session presence.
- **Infrastructure**: AWS Lambda (Serverless) for light tasks or EKS (Kubernetes) for the main API. Use **S3** for file attachments.

**Q: WebSockets vs. Server-Sent Events (SSE) for Real-time apps?**
**A:** 
- **WebSockets**:
    - **Concept**: Bi-directional, full-duplex communication.
    - **Pros**: Low overhead once established; supports "Chat" (Server -> Client AND Client -> Server).
    - **Cons**: Requires dedicated server resources; not standard HTTP; harder to scale through load balancers (sticky sessions).
- **SSE**:
    - **Concept**: Unidirectional (Server -> Client) over standard HTTP.
    - **Pros**: Works over HTTP; perfect for "Feeds" (Notifications, Stock updates); automatic reconnection; easier to proxy.
    - **Cons**: One-way only.

---

## 15. Advanced State Management (React)

**Q: When would you use Context API vs Redux vs Zustand?**
**A:**
- **Context API**: Native to React. Best for static data (Theme, User Locale). **Limit**: Is NOT a state management tool; it's a DI tool. Frequent updates cause the "Unnecessary Re-render" problem for all consumers.
- **Zustand**: Lightweight (1KB). Uses a store outside React, avoiding the context overhead. Supports **middleware** (persist, devtools) and **shallow comparison** to minimize renders.
- **Redux Toolkit (RTK)**: Best for complex, event-driven apps. 
    - **Flux Architecture**: Unidirectional data flow (Action -> Reducer -> Store -> View).
    - **RTK Query**: Powerful tool for caching API state, deduplication, and polling.

**Q: Monorepo vs. Polyrepo (Multiple Repos)?**
**A:** 
- **Monorepo (Nx, Turbo)**: Shared code/types is easy. Atomic commits across services. **Downside**: Large repo size, complex build pipelines.
- **Polyrepo**: True independence for teams. Smaller, faster builds. **Downside**: Hard to sync shared libraries and breaking changes across services.

---

## 16. NestJS Advanced: Background Jobs & Decorators

**Q: How do you handle background processing (e.g., sending 10k emails)?**
**A:** Use **BullMQ** (Redis-based queue).
- **Producer**: Adds a job to the queue.
- **Consumer**: Processes the job in the background.

**Example: BullMQ (NestJS)**
```typescript
@Injectable()
export class EmailService {
  constructor(@InjectQueue('emails') private emailQueue: Queue) {}

  async sendBulkEmails(users: User[]) {
    await this.emailQueue.addBulk(users.map(u => ({ name: 'send', data: u })));
  }
}
```

**Q: What is a Custom Decorator and why use it?**
**A:** It allows you to extract logic into a reusable annotation. For example, a `@User()` decorator to extract the user object from the request:
```typescript
export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

// Usage in Controller
@Get('me')
getMe(@User() user: UserEntity) {
  return user;
}
```

---

## 17. Engineering Leadership: Technical Debt

**Q: How do you handle Technical Debt as a Lead?**
**A:**
- **Visibility**: Track debt in the backlog just like features.
- **Percentage Rule**: Advocate for spending ~20% of every sprint on refactoring/cleaning up debt.
- **Impact vs Effort**: Prioritize debt that blocks new features or causes production bugs.
- **Documentation**: Use "Architecture Decision Records" (ADRs) to explain why certain shortcuts were taken.

---

---

## 18. Testing in NestJS (Lead Perspective)

**Q: How do you mock dependencies in NestJS unit tests?**
**A:** Use `Test.createTestingModule` and the `overrideProvider` or simply provide a mock object in the `providers` array.
```typescript
const module: TestingModule = await Test.createTestingModule({
  providers: [
    UserService,
    {
      provide: getRepositoryToken(User),
      useValue: mockRepository, // mock object
    },
  ],
}).compile();
```

---

## 19. React Design Patterns

**Q: High Order Components (HOC) vs Custom Hooks?**
**A:** 
- **Hooks**: Modern, easier to read, and handle logic reuse without changing the component hierarchy. (Recommended).
- **HOCs**: Useful for cross-cutting concerns that need to be applied to many components at once (e.g., `withAuth`, `withAnalytics`). They can cause "wrapper hell".

---

## 20. Database Indexing Deep Dive

**Q: Difference between B-Tree and Hash Index?**
**A:** 
- **B-Tree**: Balanced tree structure. Excellent for **Range Queries** (`>`, `<`, `BETWEEN`) and sorting. Default in Postgres/MySQL.
- **Hash Index**: Uses a hash table. Extremely fast (`O(1)`) for **Equality Checks** (`=`, `IN`) but cannot be used for ranges or sorting.
- **Clustered vs. Non-Clustered Index**:
    - **Clustered**: Determines the physical order of data in the table. Usually the Primary Key. One per table.
    - **Non-Clustered**: A separate structure that points to the data rows. Multiple per table. Adding too many slows down `INSERT/UPDATE` operations.

---

## 21. Microservices Data Filtering & Search

**Q: How do you implement global search across multiple microservices?**
**A:** 
- **Option A: API Aggregation**: Gateway calls all services and merges results. (Slow).
- **Option B: Search Service (CQRS)**: All services sync data (via events) to a central **ElasticSearch** instance.

**Example: CQRS Listener (Pseudo-code)**
```javascript
// Inside Notification/Search Service
on('user.updated', async (event) => {
  const { userId, newDetails } = event.data;
  await elasticSearch.update({
    index: 'users',
    id: userId,
    body: { doc: newDetails }
  });
});
```

---

## 22. Estimation & Project Planning (Lead Role)

**Q: How do you estimate a complex project/feature?**
**A:** 
1. **Breakdown**: Divide the feature into the smallest possible tasks (Atomic tasks).
2. **Buffer**: Add 20-30% buffer for unforeseen bugs/integration issues.
3. **Complexity Levels**: Use T-shirt sizing (S, M, L, XL) or Fibonacci (1, 2, 3, 5, 8).
4. **Historical Data**: Compare with similar past tasks.
5. **Review**: Discuss with the team to find hidden complexities.

---

## 23. Observability & Monitoring

**Q: How do you monitor a production app?**
**A:** 
- **Logging**: Error tracking with **Sentry** or **ELK Stack**.
- **Metrics**: **Prometheus & Grafana** for CPU/RAM and custom metrics (e.g., successful checkouts).
- **APM**: **New Relic** or **Datadog** for tracing performance bottlenecks.
- **Alerting**: Set up Slack/PagerDuty alerts for 500 errors or high latency.

---

## 24. GraphQL vs REST (Architectural Choice)

**Q: When would you choose GraphQL over REST?**
**A:** 
- **GraphQL**: Best for apps with many complex data relations, multiple frontend platforms (web/mobile), and wanting to avoid over-fetching/under-fetching.

**Example: GraphQL Schema (Typed Relations)**
```graphql
type User {
  id: ID!
  name: String
  orders: [Order] # Fetch user and orders in ONE request
}

type Order {
  id: ID!
  amount: Float
}
```

---

## 25. Large Scale Node.js: Streams

**Q: How do you handle 1GB file upload/processing in Node.js?**
**A:** Never load the whole file into buffer memory. Use **Streams**.
- **The Concept**: Process data chunk-by-chunk. `fs.createReadStream() -> pipe() -> res`.
- **Backpressure**: Node pauses the reader if the writer is overwhelmed.

**Example: Streaming a Large File**
```javascript
const fs = require('fs');
const server = require('http').createServer();

server.on('request', (req, res) => {
  const src = fs.createReadStream('./big.file');
  src.pipe(res); // Automatic backpressure management
});
```

---

---

## 26. Soft Skills & Stakeholder Management (Lead Role)

**Q: How do you explain a technical delay to a non-technical product manager?**
**A:** 
- **Avoid Jargon**: Don't talk about "memory leaks" or "race conditions". Use analogies (e.g., "The foundation needs more reinforcement before we build the next floor").
- **Focus on Impact**: Explain how the delay prevents future crashes or security risks.
- **Provide Options**: "We can release Feature A now but Feature B will take 2 more days, OR we can release both on Wednesday."

---

## 27. Code Quality & Enforcing Standards

**Q: How do you ensure the whole team follows the same coding style?**
**A:** 
- **ESLint & Prettier**: Automated linting and formatting.
- **Husky & lint-staged**: Git hooks to prevent committing code that fails linting.
- **Shared Config**: Maintain a internal `@company/eslint-config`.
- **Code Reviews**: Not just for bugs, but for consistency.

---

## 28. Micro-frontends (The Plus point)

**Q: When would you use Micro-frontends?**
**A:** 
- When multiple teams need to work on the same large application independently.
- **Implementation**: Module Federation (Webpack 5).

**Example: Module Federation Config (Host)**
```javascript
new ModuleFederationPlugin({
  name: 'app_shell',
  remotes: {
    'auth_app': 'auth@http://localhost:3001/remoteEntry.js',
    'dashboard': 'dashboard@http://localhost:3002/remoteEntry.js',
  },
})
```

---

---

## 29. Redis Deep Dive

**Q: Why is Redis so fast?**
**A:** 
- **In-Memory**: Operates directly on RAM.
- **Single-threaded**: Avoids context switching and lock contention (standard Redis).
- **Efficient Data Structures**: Uses specialized structures tailored for performance (Hashes, Sorted Sets).

**Q: Redis Use Cases beyond Caching?**
**A:** 
- **Session Store**: Global user sessions.
- **Pub/Sub**: Real-time messaging/chat.
- **Rate Limiting**: Using Lua scripts or increments.
- **Locks**: Distributed locking (Redlock).

---

## 30. Infrastructure as Code (IaC) & Cloud Native

**Q: Why use IaC (Terraform/Pulumi) instead of manual AWS Console config?**
**A:** 
- **Reproducibility**: Easily recreate environments (Staging/Prod).
- **Version Control**: Infrastructure changes are reviewed via PRs.
- **Speed**: Automates the provisioning of complex stacks (VPC, RDS, Lambda).

**Q: What is a "Static Site" vs. "Server-Side Rendered" in the context of AWS?**
**A:** 
- **Static**: Hosted on S3 + CloudFront (Edge). Zero server cost, infinite scale.
- **SSR**: Requires a running server/Lambda. Better for dynamic/personalized content.

---

## 31. Caching Strategies & Cache Invalidation

**Q: Explain Cache-Aside vs. Write-Through caching.**
**A:** 
- **Cache-Aside**: App checks cache first. If "miss", it fetches from DB and updates cache. (Most common).
- **Write-Through**: Data is written to cache and DB simultaneously.

**Example: Cache-Aside Pattern**
```javascript
async function getUser(id) {
  let user = await redis.get(`user:${id}`);
  if (!user) {
    user = await db.users.find(id);
    await redis.set(`user:${id}`, JSON.stringify(user), 'EX', 3600);
  }
  return JSON.parse(user);
}
```

**Q: How do you handle cache invalidation?**
**A:** "There are only two hard things in Computer Science: cache invalidation and naming things."
- **TTL (Time to Live)**: Automatic expiration.
- **Event-based**: Invalidate specific keys when DB updates happen.
- **Versioned Keys**: Change the key name (e.g., `user_v2`) to force a fresh fetch.

---

## 32. API Design & Versioning

**Q: How do you ensure an API remains idempotent?**
**A:** Ensure that making the same call multiple times has the same result as one call.
- **POST**: Use an `Idempotency-Key` header. If the server sees the same key again, it returns the cached response.

**Example: Idempotency Key (NestJS Interceptor)**
```typescript
async intercept(context: ExecutionContext, next: CallHandler) {
  const req = context.switchToHttp().getRequest();
  const key = req.headers['idempotency-key'];
  
  const cached = await this.redis.get(key);
  if (cached) return JSON.parse(cached); // Return previous result

  return next.handle().pipe(tap(res => this.redis.set(key, JSON.stringify(res))));
}
```

**Q: URI vs. Header Versioning?**
**A:** 
- **URI (`/v1/users`)**: Clear, easy to cache, but breaks the "one URL per resource" rule.
- **Header (`Accept: version=1`)**: Cleaner URLs, but harder for browsers/proxies to manage.

---

## 33. Engineering Management: Handling Underperformance

**Q: How do you handle a consistently underperforming developer in your team?**
**A:** 
1. **Identify Root Cause**: Is it a skill gap, personal issue, or lack of clarity?
2. **Immediate Feedback**: Don't wait for a review. Point it out politely in 1-on-1s.
3. **PIP (Performance Improvement Plan)**: Set clear, measurable goals for 30-60 days.
4. **Mentorship**: Pair them with a senior dev or provide training.
5. **Final Step**: If no improvement, work with HR for a transition or exit.

---

## 34. Resilience Patterns (Beyond Circuit Breaker)

**Q: Difference between Retry and Timeout?**
**A:** 
- **Timeout**: Stops waiting for a response after X seconds to prevent hanging.
- **Retry**: Attempts the call again (with **Exponential Backoff**) in case of transient errors.

**Q: What is a Fallback?**
**A:** A default response when a service call fails. (e.g., "Return a cached list of products if the Search service is down").

---

---
 
## 35. Advanced NestJS: Microservices & Hybrid Apps

**Q: What is a "Hybrid Application" in NestJS?**
**A:** An application that listens for requests from two or more different sources. For example, a web server (HTTP) that also listens for messages from a Microservice (e.g., via RabbitMQ or gRPC).

**Q: When would you use gRPC over REST?**
**A:** 
- **gRPC**: Best for internal service-to-service communication. Uses Protocol Buffers (binary data), making it faster and smaller than JSON. Supports bi-directional streaming.
- **REST**: Best for public APIs and browser-to-server communication due to standard HTTP support and easy debugging.

---

## 36. Database: Distributed Transactions & ACID vs BASE

**Q: ACID vs. BASE?**
**A:** 
- **ACID (SQl)**: Atomicity, Consistency, Isolation, Durability. Focuses on immediate consistency (e.g., Banking).
- **BASE (NoSQL)**: Basically Available, Soft state, Eventual consistency. Focuses on high availability and scaling (e.g., Social Media feeds).

**Q: How do you handle a transaction across two different DBs in Microservices?**
**A:** Use the **Saga Pattern**. Since distributed transactions (2PC - Two-Phase Commit) are slow and don't scale well, Sagas use a sequence of local transactions with "Compensating Transactions" to undo changes if a failure occurs.

---

## 37. Frontend Performance: Lighthouse & Core Web Vitals

**Q: What are the 3 Core Web Vitals you monitor?**
**A:** 
1. **LCP (Largest Contentful Paint)**: Measures loading performance (aim for < 2.5s).
2. **FID (First Input Delay)**: Measures interactivity (aim for < 100ms). *Note: Being replaced by INP (Interaction to Next Paint).*
3. **CLS (Cumulative Layout Shift)**: Measures visual stability (aim for < 0.1).

**Q: How do you fix a high CLS?**
**A:** 
- Always include size attributes (`width` and `height`) on images and video elements.
- Reserve space for dynamic content (ads, fragments) using placeholders/skeletons.
- Avoid inserting content above existing content, except in response to user interaction.

---

## 38. Security: OAuth2 vs OpenID Connect  
IMP

**Q: What is the difference between OAuth2 and OpenID Connect (OIDC)?**
**A:** 
- **OAuth2**: Focused on **Authorization** (Accessing resources). It gives you an `access_token`.
- **OIDC**: An identity layer on top of OAuth2 focused on **Authentication** (Who you are). It gives you an `id_token`.

**Q: How do you prevent XSS (Cross-Site Scripting) in a React app?**
**A:** 
- React automatically escapes content rendered in JSX.
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary (and sanitize it using `DOMPurify`).
- Use **Content Security Policy (CSP)** headers to restrict where scripts can be loaded from.

---

## 39. Leadership: Mentorship & Building Technical Culture

**Q: How do you help a Junior developer improve their technical skills?**
**A:** 
- **Pair Programming**: Real-time knowledge transfer.
- **Constructive Code Reviews**: Explain *why* a change is needed, not just *what* to change.
- **Learning Path**: Assign tasks that are slightly above their current level to encourage growth.
- **Regular 1-on-1s**: Discuss career goals and provide a safe space for questions.

---

---

## 40. Advanced "Under the Hood" (Machine Level)

### Node.js Internals
- **Libuv & The Thread Pool**: Node is single-threaded for JavaScript, but uses **Libuv** for all I/O. Asynchronous tasks like File System or Crypto are offloaded to the **Libuv Thread Pool** (default size 4).
- **V8 Engine Garbage Collection**: Uses **Generational GC** (Young vs Old Space). A `Mark-and-Sweep` algorithm periodically cleans up unreferenced objects.
- **Microtasks vs Macrotasks**: `process.nextTick()` and `Promises` are Microtasks and execute *immediately* after the current operation, before the next event loop phase. `setTimeout` is a Macrotask.

### React Hooks: Under the Hood
- **Linked Lists**: React stores hooks state in a **Linked List** on the fiber node. This is why hook order *must* be consistent (no hooks in loops or conditionals).
- **Concurrent Mode (Fiber)**: Breakdown of work into "units of work". It allows React to pause rendering to let the browser handle higher-priority tasks (like user input).

---

## 41. Database: Queries & Indexing Deep Dive
- **B-Tree Index (Standard)**: Organizes data in a balanced tree so lookups, inserts, and deletes take `O(log n)`. Best for range queries.
- **Hash Index**: Best for exact equality matches (`=`), but cannot handle range queries or sorting.
- **Vacuuming (PostgreSQL)**: Removes "dead tuples" created by UPDATES/DELETES. Without vacuuming, DB "bloat" happens, slowing down everything.
- **WAL (Write-Ahead Logging)**: Changes are written to the log *before* being applied to the DB to ensure durability (ACID) during crashes.

---

## 42. Final Interview Mastery Checklist
- [x] Review **Core Responsibilities** in the header.
- [ ] Be ready to explain your **most complex project**.
- [ ] Understand the **"Why"** behind every choice (e.g., Why NestJS over Express?).
- [ ] Show **Leadership**: Conflict resolution and mentorship.
- [ ] Ask **Smart Questions**: About tech debt, team structure, and roadmaps.


