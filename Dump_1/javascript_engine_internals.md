# JavaScript Engine Internals & Execution

A comprehensive guide to how JavaScript code executes in V8 engine, covering memory management, execution contexts, and optimization.

## Table of Contents
1. [V8 Engine Architecture](#v8-engine-architecture)
2. [Memory: Stack vs Heap](#memory-stack-vs-heap)
3. [Execution Context](#execution-context)
4. [Compilation & Execution Flow](#compilation--execution-flow)
5. [Garbage Collection](#garbage-collection)
6. [Performance Optimization](#performance-optimization)

---

## V8 Engine Architecture

### **Core Components**

```
Source Code
    ↓
Parser (Tokenization → AST)
    ↓
Ignition (Interpreter → Bytecode)
    ↓
Execution (Call Stack + Heap)
    ↓
TurboFan (JIT Compiler → Optimized Machine Code)
    ↓
Garbage Collector
```

**1. Parser**
- Converts source code → tokens → Abstract Syntax Tree (AST)
- Example: `let x = 10;` becomes:
  ```
  VariableDeclaration
   ├─ kind: 'let'
   └─ declarations
       └─ VariableDeclarator
           ├─ id: Identifier (x)
           └─ init: Literal (10)
  ```

**2. Ignition (Interpreter)**
- Converts AST → bytecode
- Executes bytecode line-by-line
- Fast startup, low memory footprint
- Example bytecode: `LdaConstant 10` → `StaGlobal x`

**3. TurboFan (JIT Compiler)**
- Watches "hot" functions (frequently executed)
- Compiles bytecode → optimized machine code
- Uses runtime feedback (type information, inline caches)
- Can **deoptimize** if assumptions fail

**4. Garbage Collector**
- Generational GC (New Space + Old Space)
- Mark-and-Sweep algorithm
- Runs asynchronously in parallel

---

## Memory: Stack vs Heap

### **🔴 Critical Concept: Where Variables Live**

| Type | Storage Location | Lifetime | Example |
|------|-----------------|----------|---------|
| **Primitives** (number, boolean, string, null, undefined) | **Stack** (in execution context) | Short-lived (function scope) | `let x = 10;` |
| **Objects, Arrays, Functions** | **Heap** | Until garbage collected | `let obj = { name: "John" };` |
| **Closures** | **Heap** (lexical environment) | As long as referenced | Inner function referencing outer variables |

### **Stack (Call Stack)**

> **What:** LIFO structure storing execution contexts/frames

**Characteristics:**
- Fast allocation/deallocation
- Fixed size (stack overflow if exceeded)
- Stores:
  - Execution context pointers
  - Primitive values
  - References to heap objects
  - Return addresses

**Example:**
```javascript
function a() {
  b();
}
function b() {
  console.log("Hi");
}
a();
```

**Call Stack Flow:**
```
[Global Execution Context]
→ a() called → push a()
→ b() called → push b()
→ console.log() → push log()
→ log() finishes → pop
→ b() finishes → pop
→ a() finishes → pop
→ GEC remains until end
```

### **Heap**

> **What:** Large memory region for dynamic data

**Characteristics:**
- Slower than stack
- Garbage collected
- Stores:
  - Objects: `{ name: "John" }`
  - Arrays: `[1, 2, 3]`
  - Functions: `function foo() {}`
  - Closures: Lexical environments

**Example:**
```javascript
const user = { name: "Karan" };

// Stack:
// user → ref: 0x001

// Heap:
// 0x001: { name: "Karan" }
```

---

## Execution Context

### **What is an Execution Context?**

> **Definition:** Runtime container tracking everything needed to run code

**Every EC contains:**
1. **LexicalEnvironment** - `let`, `const`, function declarations, scope chain
2. **VariableEnvironment** - `var` declarations (function-scoped)
3. **ThisBinding** - Value of `this`
4. **Outer reference** - Link to parent scope

### **Types of Execution Contexts**

1. **Global Execution Context (GEC)**
   - Created when script first runs
   - `this` → `window` (browser) or `global` (Node.js)
   - Only one per program

2. **Function Execution Context (FEC)**
   - Created when function is called
   - Has own scope, `this`, and `arguments`

3. **Eval Execution Context** (rarely used)

### **Creation vs Execution Phases**

#### **Creation Phase (Hoisting)**

```javascript
let a = 10;
function greet() {
  console.log("Hi");
}
```

**Memory Setup:**
```
a → uninitialized (TDZ - Temporal Dead Zone)
greet → function object (stored in heap)
```

#### **Execution Phase**

```
a = 10 (initialized)
greet() → creates new FEC
```

### **Scope Chain & Lexical Environment**

> **Key:** Functions remember the scope where they were **defined**, not called

```javascript
function outer() {
  let x = 10;
  function inner() {
    console.log(x); // Accesses outer's x
  }
  return inner;
}

const fn = outer();
fn(); // prints 10 (closure!)
```

**How it works:**
1. `outer()` creates lexical environment with `x = 10`
2. `inner()` stores reference to `outer`'s lexical environment
3. Even after `outer()` returns, `inner` keeps `x` alive (closure)
4. Lexical environment moved to **heap** (not garbage collected)

---

## Compilation & Execution Flow

### **Complete Flow Example**

```javascript
let a = 10;

function multiply(x, y) {
  return x * y;
}

let result = multiply(a, 5);
console.log(result);
```

**Step-by-step:**

1. **Parsing**
   - AST built for all declarations

2. **Bytecode Generation**
   - Ignition compiles to bytecode

3. **Create Global Execution Context**
   ```
   a → uninitialized
   multiply → function object
   result → uninitialized
   ```

4. **Execute Global Code**
   ```
   a = 10
   call multiply(a, 5) → create FEC
   ```

5. **Inside multiply EC:**
   ```
   x = 10
   y = 5
   returns 50
   → pop multiply EC off stack
   ```

6. **Back to global:**
   ```
   result = 50
   console.log(50)
   ```

7. **Cleanup:**
   - GEC popped
   - Heap cleaned by GC

### **JIT Optimization (TurboFan)**

**Example:**
```javascript
function addOne(x) { return x + 1; }

for (let i = 0; i < 1_000_000; i++) {
  addOne(i);
}
```

**What happens:**
1. Initial runs → Ignition executes bytecode
2. After ~few thousand calls → TurboFan detects "hot" function
3. ICs (Inline Caches) record types (Smis - small integers)
4. TurboFan compiles specialized machine code for integers
5. Much faster execution!

**Deoptimization:**
- If later called with `float` or `object` → assumptions fail
- Engine **deoptimizes** → falls back to bytecode
- May recompile with more general version

---

## Garbage Collection

### **Generational GC Strategy**

> **Hypothesis:** Most objects die young

**Two Spaces:**
1. **New Space (Young Generation)**
   - Most allocations go here
   - Fast, frequent minor GC (Scavenger)
   - Survivors promoted to Old Space

2. **Old Space (Old Generation)**
   - Long-lived objects
   - Infrequent major GC (Mark-Compact)
   - Concurrent/incremental marking

### **Mark-and-Sweep Algorithm**

1. **Mark Phase**
   - Start from roots (global object, stack)
   - Mark all reachable objects

2. **Sweep Phase**
   - Free memory of unmarked objects

3. **Compact Phase** (optional)
   - Reduce fragmentation

**Runs asynchronously** - doesn't block execution

---

## Performance Optimization

### **Hidden Classes (Maps)**

> **Why:** JS objects are dynamic, but V8 optimizes using hidden classes

```javascript
// ✅ Good - Same hidden class
function makeUser1() {
  return { a: 1, b: 2 };
}

function makeUser2() {
  return { a: 1, b: 2 };
}

// ❌ Bad - Different hidden classes
function makeUser3() {
  let o = {};
  o.a = 1;
  o.b = 2;
  return o;
}

function makeUser4() {
  let o = {};
  o.b = 2; // Different order!
  o.a = 1;
  return o;
}
```

**Key:** Consistent object construction order = same hidden class = faster property access

### **Inline Caches (ICs)**

- Cache property access patterns
- **Monomorphic** (one shape) → fast
- **Polymorphic** (few shapes) → slower
- **Megamorphic** (many shapes) → slowest

### **Best Practices**

1. **Consistent object shapes**
   ```javascript
   // ✅ Good
   class User {
     constructor(name, age) {
       this.name = name;
       this.age = age;
     }
   }
   ```

2. **Avoid changing types**
   ```javascript
   // ❌ Bad
   let x = 10;
   x = "hello"; // Type changed!
   
   // ✅ Good
   let num = 10;
   let str = "hello";
   ```

3. **Use typed arrays for numeric data**
   ```javascript
   const arr = new Int32Array(1000);
   ```

4. **Avoid `delete` on objects**
   ```javascript
   // ❌ Bad
   delete obj.prop;
   
   // ✅ Good
   obj.prop = undefined;
   ```

---

## Interview Questions

### **Core Engine & Execution**

### Q1: Explain the difference between Stack and Heap

**Answer:**
- **Stack:** LIFO structure storing execution contexts and primitive values. Fast, fixed size, automatically managed.
- **Heap:** Large region for objects, arrays, functions. Garbage collected, slower, flexible size.
- **Key:** Primitives go on stack, objects go on heap. Stack stores references to heap objects.

### Q2: What is a closure and how does it work?

**Answer:**
A closure is when an inner function retains access to its outer function's variables even after the outer function has returned. This works because the inner function stores a reference to the outer function's lexical environment, which is kept alive on the heap.

```javascript
function outer() {
  let x = 10;
  return function inner() {
    console.log(x); // Closure!
  };
}
const fn = outer();
fn(); // 10
```

### Q3: What is the Temporal Dead Zone (TDZ)?

**Answer:**
The TDZ is the period between entering a scope and the actual initialization of a `let`/`const` variable. Accessing the variable during TDZ throws `ReferenceError`.

```javascript
console.log(x); // ReferenceError (TDZ)
let x = 10;

console.log(y); // undefined (var is hoisted)
var y = 20;
```

### Q4: How does V8 optimize JavaScript code?

**Answer:**
1. **Ignition** interprets bytecode for fast startup
2. **TurboFan** compiles hot functions to machine code
3. **Inline Caches** optimize property access
4. **Hidden Classes** make object property access fast
5. **Deoptimization** falls back if assumptions fail

### Q5: Explain hoisting

**Answer:**
During the creation phase, the engine:
- `var` → hoisted and initialized to `undefined`
- `function` → hoisted as complete function object
- `let`/`const` → hoisted but not initialized (TDZ)

```javascript
console.log(a); // undefined
var a = 10;

greet(); // "Hi" (works!)
function greet() { console.log("Hi"); }

console.log(b); // ReferenceError
let b = 20;
```

---

### **Web Performance & Optimization**

### Q6: What are Preload, Reconnect, Prefetch, and Prerender?

**Answer:** These are **Resource Hints** to improve loading performance:

- **Preload:** Fetch resource early before discovered in HTML
  ```html
  <link rel="preload" href="styles.css" as="style">
  ```

- **Prefetch:** Download resources for future navigations
  ```html
  <link rel="prefetch" href="next-page.js">
  ```

- **Preconnect:** Establish early connections (DNS, TCP, TLS)
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  ```

- **Prerender:** Fully render page in background
  ```html
  <link rel="prerender" href="https://example.com/next-page">
  ```

### Q7: How can you do caching on a website?

**Answer:**

1. **Browser Caching:** Via response headers
   ```
   Cache-Control: max-age=3600, public
   ETag: "abc123"
   ```

2. **Service Worker Caching:** Store assets in Cache API
   ```javascript
   caches.open('v1').then(cache => cache.add('/index.html'))
   ```

3. **CDN Caching:** Edge servers deliver static assets

4. **Local Storage:** Client-side temporary data

### Q8: What are ETag, Cache-Control, and DocumentFragment?

**Answer:**

- **ETag:** Unique fingerprint for resource version. Browser sends via `If-None-Match` to check freshness.

- **Cache-Control:** Defines caching policy
  ```
  Cache-Control: no-cache, must-revalidate
  ```

- **DocumentFragment:** Lightweight DOM container for batching operations (no reflows/repaints)
  ```javascript
  const fragment = document.createDocumentFragment();
  for(let i=0; i<1000; i++){
    const div = document.createElement('div');
    fragment.appendChild(div);
  }
  document.body.appendChild(fragment);
  ```

### Q9: How do you optimize assets? Image compression formats?

**Answer:**

**Asset Optimization:**
- Minify JS/CSS
- Bundle modules (Webpack/Vite)
- Lazy loading
- CDNs and compression (Gzip, Brotli)

**Image Formats:**
- **WebP:** Modern, efficient, supports transparency + animation, smallest size
- **PNG:** Lossless, good for graphics/logos with transparency
- **JPG/JPEG:** Lossy, best for photos

### Q10: What is a Memory Leak?

**Answer:**
Memory leak occurs when allocated memory is not released even though it's no longer needed.

**Common causes:**
- Unremoved event listeners
- Global variables not cleaned up
- Detached DOM nodes still referenced
- Large arrays or closures retaining references

**Detection:** Chrome DevTools → Performance → Memory tab

### Q11: Difference between Repaint and Reflow?

**Answer:**
- **Reflow (Layout):** Geometry changes (adding/removing elements, changing size)
- **Repaint:** Visual appearance changes (color, background) but layout stays same

**Order:** Reflow → Repaint (Reflow is more expensive)

### Q12: Cancel old API calls when button clicked multiple times?

**Answer:** Use **AbortController**

```javascript
let controller;
function fetchData() {
  if (controller) controller.abort();
  controller = new AbortController();
  
  fetch('/api/data', { signal: controller.signal })
    .then(res => res.json())
    .then(console.log)
    .catch(err => {
      if (err.name !== 'AbortError') console.error(err);
    });
}
```

---

### **Async & Promises**

### Q13: Does React use Promise.allSettled() for parallel API calls?

**Answer:**
React doesn't directly use `Promise.allSettled()` in normal rendering, but Suspense + concurrent features can handle multiple async calls.

**Promise.allSettled()** waits for all promises to resolve or reject, returning their status and value.

```javascript
const results = await Promise.allSettled([
  fetch('/api/1'),
  fetch('/api/2'),
  fetch('/api/3')
]);
// Returns: [{ status: 'fulfilled', value: ... }, ...]
```

### Q14: How does JavaScript handle asynchronous operations?

**Answer:**
Uses:
- **Event Loop**
- **Callback Queue**
- **Promises**
- **Async/Await**
- **Web APIs** (fetch, setTimeout, etc.)

Event Loop continuously checks if call stack is empty and executes queued tasks.

---

### **Arrays & Algorithms**

### Q15: What algorithm does Array.prototype.sort() use?

**Answer:**
Modern JS (V8) uses **Timsort** (hybrid of merge + insertion sort).

Sort converts elements to **strings** unless compare function provided.

```javascript
[1, null, 5, 2, undefined].sort()
// Output: [1, 2, 5, null, undefined]
```

---

### **Browser & Rendering**

### Q16: What happens when we hit a URL in the browser? What is CRP?

**Answer:**

**Steps:**
1. DNS Lookup → IP found
2. TCP Handshake + TLS (if HTTPS)
3. HTTP Request → Response received
4. Parse HTML → Build DOM
5. Parse CSS → Build CSSOM
6. Combine → Render Tree → Layout → Paint

**CRP (Critical Rendering Path):** All steps from receiving HTML to painting pixels.

### Q17: What events can we use when a website is loading?

**Answer:**
- `DOMContentLoaded`: DOM ready (no CSS/images required)
- `load`: Full page with assets loaded
- `beforeunload`: Before leaving page
- `visibilitychange`: User switches tabs

### Q18: What are render-blocking resources?

**Answer:**
CSS and JS that block browser from rendering until loaded.

**Fix:**
- Use `defer` or `async` for scripts
- Inline critical CSS
- Lazy-load scripts

### Q19: Event Capturing vs Delegation vs Bubbling

**Answer:**
- **Capturing:** Event goes from root → target
- **Bubbling:** Event goes from target → root
- **Delegation:** Attach one listener to parent, handle events from children

```javascript
// Delegation example
document.getElementById('parent').addEventListener('click', (e) => {
  if (e.target.matches('.child')) {
    console.log('Child clicked!');
  }
});
```

---

### **OOP & Prototypes**

### Q20: Difference between Prototypal and Classical Inheritance

**Answer:**
- **Classical (OOP):** Copy-based (Java, C#)
- **Prototypal (JS):** Reference-based — objects inherit from other objects

```javascript
const parent = { greet() { console.log("Hello"); } };
const child = Object.create(parent);
child.greet(); // Hello
```

### Q21: What are SOLID Principles?

**Answer:**
1. **S**ingle Responsibility
2. **O**pen/Closed
3. **L**iskov Substitution
4. **I**nterface Segregation
5. **D**ependency Inversion

### Q22: How do we use OOP in JavaScript?

**Answer:**
JS supports OOP using **classes**, **objects**, and **prototypes**.

```javascript
class Car {
  constructor(name) { this.name = name; }
  start() { console.log(`${this.name} started`); }
}
const car = new Car("Tesla");
car.start();
```

### Q23: What is the use of the `new` operator?

**Answer:**
Creates instance of constructor function and sets up prototype chain.

```javascript
function Person(name){ this.name = name; }
const user = new Person("Nikita");
```

---

### **this, call, apply, bind**

### Q24: Can we bind `this` in an arrow function?

**Answer:**
No. Arrow functions don't have their own `this`; they inherit from lexical scope.
Using `new` with arrow function throws error.

```javascript
const obj = {
  name: "JS",
  regular: function() { console.log(this.name); },
  arrow: () => console.log(this.name),
};
obj.regular(); // JS
obj.arrow();   // undefined (inherits outer scope)
```

### Q25: Difference between call, apply, and bind?

**Answer:**
- `call(thisArg, arg1, arg2, ...)` - Calls immediately
- `apply(thisArg, [args])` - Calls with array
- `bind(thisArg)` - Returns new function with bound `this`

```javascript
function greet(greeting) {
  console.log(greeting + " " + this.name);
}
const user = { name: "Nikita" };

greet.call(user, "Hi");      // Hi Nikita
greet.apply(user, ["Hello"]); // Hello Nikita
const boundGreet = greet.bind(user);
boundGreet("Hey");           // Hey Nikita
```

---

### **Modern JavaScript**

### Q26: Difference between Map and Object

**Answer:**
- **Map:** Ordered, keys can be any type, has built-in size/iteration
- **Object:** Keys must be strings/symbols

```javascript
const map = new Map();
map.set(1, 'one');
map.set('1', 'string one');
console.log(map.size); // 2

const obj = {};
obj[1] = 'one';
obj['1'] = 'string one';
console.log(Object.keys(obj).length); // 1 (keys coerced to strings)
```

### Q27: What are Symbols and Generators?

**Answer:**

**Symbol:** Unique and immutable primitive for object keys
```javascript
const id = Symbol('id');
const obj = { [id]: 123 };
```

**Generator:** Function that can pause execution using `yield`
```javascript
function* gen() {
  yield 1;
  yield 2;
}
const g = gen();
console.log(g.next().value); // 1
console.log(g.next().value); // 2
```

---

### **HTML & CSS**

### Q28: What are Semantic HTML Elements?

**Answer:**
HTML elements that clearly describe their meaning.

Examples: `<header>`, `<footer>`, `<article>`, `<section>`, `<nav>`

Benefits: Accessibility, SEO, code readability

### Q29: What is srcset in HTML?

**Answer:**
Serves different images for different resolutions/devices.

```html
<img src="small.jpg" 
     srcset="large.jpg 1024w, medium.jpg 640w, small.jpg 320w" 
     sizes="(max-width: 600px) 480px, 800px" alt="image">
```

### Q30: Difference between display: none and visibility: hidden

**Answer:**
- `display: none`: Removes element from DOM flow completely
- `visibility: hidden`: Keeps element space but hides content

---

### **Web APIs & Modern Features**

### Q31: What are Web Components, Service Worker, Web Worker, and PWA?

**Answer:**

- **Web Components:** Reusable encapsulated custom HTML elements
- **Service Worker:** Proxy between app and network for offline caching
- **Web Worker:** Runs JS in background threads
- **PWA:** Web app with offline support, installable, fast

### Q32: What are Web Core Vitals?

**Answer:**
Metrics by Google for user experience:

- **LCP (Largest Contentful Paint):** ≤ 2.5s
- **FID (First Input Delay):** ≤ 100ms
- **CLS (Cumulative Layout Shift):** ≤ 0.1

**Improve with:** Image optimization, preload fonts, lazy loading

### Q33: Explain Web Performance Metrics

**Answer:**
- **TTFB:** Time to First Byte
- **FCP:** First Contentful Paint
- **LCP, FID, CLS:** Core Web Vitals
- **TTI:** Time to Interactive

**Tools:** Lighthouse, PageSpeed Insights, Web Vitals API

---

### **HTTP & Headers**

### Q34: What is the use of Headers in HTTP requests?

**Answer:**
Headers carry **metadata**:

- Authentication: `Authorization: Bearer token`
- Caching: `Cache-Control`
- Content type: `Content-Type: application/json`

---

### **Build Tools & Architecture**

### Q35: Explain the Webpack build process

**Answer:**
1. **Entry** (main.js)
2. **Loaders** (transform files like CSS, images)
3. **Plugins** (optimize output)
4. **Output** (bundle.js)

### Q36: How would you architect an app to support multiple devices?

**Answer:**
- Responsive UI (CSS Grid, Flexbox)
- Media queries and adaptive images
- API design responsive to device capabilities
- Service Workers for offline and PWA support

---

### **Advanced Concepts**

### Q37: What are Closure, Event Loop, Hoisting, and Currying?

**Answer:**

- **Closure:** Function accessing variables from parent scope even after parent finished
- **Event Loop:** Mechanism for async execution
- **Hoisting:** Variable/function declarations moved to top during compile
- **Currying:** Breaking function with multiple arguments into nested single-argument functions

```javascript
// Currying example
const add = (a) => (b) => (c) => a + b + c;
console.log(add(1)(2)(3)); // 6
```

---

### **Advanced Promise & Async Patterns**

### Q38: How can you implement a sleep() function using Promises?

**Answer:**
```javascript
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async function run() {
  console.log("Start");
  await sleep(2000);
  console.log("After 2s");
})();
```

### Q39: What happens if you await inside a loop?

**Answer:**
Each iteration waits for the previous one — **serial execution** (slow).
Use `Promise.all()` for **parallel execution**.

```javascript
// ❌ Serial (slow)
for (let item of arr) await fetchData(item);

// ✅ Parallel (fast)
await Promise.all(arr.map(fetchData));
```

### Q40: What happens when you forget to handle Promise rejection?

**Answer:**
Uncaught rejections throw a **global unhandledrejection** event in browsers and may terminate Node.js processes.

```javascript
window.addEventListener('unhandledrejection', e => {
  console.error('Unhandled:', e.reason);
});
```

---

### **Tricky Language Behaviors**

### Q41: What's the output of these expressions?

**Answer:**
```javascript
console.log([] + []);      // ""
console.log([] + {});      // "[object Object]"
console.log({} + []);      // 0 (parsed as empty block + array)
console.log(true + true);  // 2
console.log("5" - 3);      // 2
```

### Q42: Why does [] == ![] return true?

**Answer:**
- `![]` → `false` (array is truthy)
- `[] == false`
- `[]` → `""` (toPrimitive → string)
- `"" == false` → `0 == 0` → `true`

### Q43: Difference between Object.is(), ===, and ==

**Answer:**
- `==` allows coercion
- `===` strict comparison
- `Object.is()` like `===` but treats `NaN` and signed zeros differently

```javascript
NaN === NaN;           // false
Object.is(NaN, NaN);   // true

+0 === -0;             // true
Object.is(+0, -0);     // false
```

### Q44: How are symbols compared?

**Answer:**
Each `Symbol()` call creates a unique value even with same description.

```javascript
Symbol("id") === Symbol("id");           // false
Symbol.for("id") === Symbol.for("id");   // true (global registry)
```

---

### **Advanced Closures & Scope**

### Q45: Why is var problematic inside loops?

**Answer:**
`var` has **function scope**, not block scope.

```javascript
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// Output: 3 3 3

// Fix with let (block scope)
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// Output: 0 1 2
```

### Q46: What is IIFE and why does it work?

**Answer:**
**IIFE (Immediately Invoked Function Expression)** - Parentheses turn function declaration into expression, making it executable immediately.

```javascript
(function() {
  console.log("Runs immediately!");
})();

// Arrow function IIFE
(() => console.log("Also works!"))();
```

---

### **Event Loop & Task Scheduling**

### Q47: Predict the output

**Answer:**
```javascript
console.log("A");
setTimeout(() => console.log("B"), 0);
Promise.resolve().then(() => console.log("C"));
queueMicrotask(() => console.log("D"));
console.log("E");

// Output: A E C D B
```

**Why?**
- Stack: `A` `E`
- Microtasks (run first): Promises, queueMicrotask → `C` `D`
- Macrotasks (run after): setTimeout → `B`

### Q48: Difference between microtask & macrotask?

**Answer:**

| Microtasks | Macrotasks |
|-----------|-----------|
| Promises, MutationObserver, queueMicrotask | setTimeout, setInterval, I/O, UI events |
| Executed **before** repaint | Executed **after** repaint |
| Higher priority | Lower priority |

### Q49: What is requestIdleCallback?

**Answer:**
Allows browser to execute code **when it's idle**, without blocking UI.

```javascript
requestIdleCallback(() => {
  console.log("Idle time task");
  // Good for: analytics, prefetching, non-critical work
});
```

---

### **Memory Management**

### Q50: Why can WeakMap and WeakSet prevent memory leaks?

**Answer:**
They hold **weak references** — garbage collector can remove the object even if it's in a WeakMap/Set.

```javascript
let wm = new WeakMap();
let obj = {};
wm.set(obj, "data");
obj = null; // object removed, weakmap entry gone
```

### Q51: Difference between shallow copy and deep copy?

**Answer:**
- **Shallow copy:** Copies reference for nested objects
- **Deep copy:** Copies entire structure recursively

```javascript
const obj = { a: 1, b: { c: 2 } };

// Shallow copy
const shallow = { ...obj };
shallow.b.c = 100;
console.log(obj.b.c); // 100 (modified original!)

// Deep copy
const deep = structuredClone(obj);
deep.b.c = 200;
console.log(obj.b.c); // 100 (original unchanged)
```

---

### **Object Internals**

### Q52: What's the difference between enumerable, writable, and configurable?

**Answer:**
**Property descriptors** controlling how object properties behave.

```javascript
const obj = {};
Object.defineProperty(obj, "x", {
  value: 10,
  writable: false,      // Can't change value
  enumerable: false,    // Won't show in for...in
  configurable: true,   // Can delete/reconfigure
});
```

### Q53: Object.seal() vs Object.freeze()?

**Answer:**
- `seal()` → Can't add/delete, but **can modify** existing props
- `freeze()` → Can't add/delete/**modify** any property

```javascript
const o = { a: 1 };

Object.seal(o);
o.a = 2;    // ✅ Works
o.b = 3;    // ❌ Fails (can't add)

Object.freeze(o);
o.a = 5;    // ❌ Fails (can't modify)
```

---

### **Generators & Iterators**

### Q54: How do Generators differ from normal functions?

**Answer:**
Generators can **pause execution** and **resume later** using `yield`.

```javascript
function* gen() {
  yield 1;
  yield 2;
  yield 3;
}

const it = gen();
console.log(it.next().value); // 1
console.log(it.next().value); // 2
console.log(it.next().value); // 3
console.log(it.next().done);  // true
```

### Q55: How can Generators handle async flow (before async/await)?

**Answer:**
```javascript
function* fetchSequence() {
  const user = yield fetch("/user").then(r => r.json());
  const posts = yield fetch(`/posts/${user.id}`).then(r => r.json());
  console.log(posts);
}

// Runner function needed to execute
function run(gen) {
  const it = gen();
  function handle(result) {
    if (result.done) return;
    result.value.then(val => handle(it.next(val)));
  }
  handle(it.next());
}

run(fetchSequence);
```

---

### **Event Delegation & Custom Events**

### Q56: What is Event Delegation?

**Answer:**
Instead of attaching listeners to multiple child elements, attach one to their common parent and use event bubbling.

```javascript
document.querySelector("#list").addEventListener("click", (e) => {
  if (e.target.tagName === "LI") {
    console.log("Clicked:", e.target.textContent);
  }
});
```

### Q57: How to create and dispatch a custom event?

**Answer:**
```javascript
// Create custom event
const event = new CustomEvent("myEvent", { 
  detail: { msg: "Hello" } 
});

// Listen for it
document.addEventListener("myEvent", (e) => {
  console.log(e.detail.msg); // Hello
});

// Dispatch it
document.dispatchEvent(event);
```

---

## Multi-Tenancy Architecture (SaaS Fundamentals)

### **What is Multi-Tenancy?**

> **Definition:** "One application, multiple customers (tenants)."

Each **tenant** (company, user group, or organization) uses the **same app instance**, but their data, configurations, and usage are **isolated and secure** from each other.

**Analogy:** Like Gmail — one big system, millions of users, but each person only sees their own inbox.

---

### **Core Components**

| Layer | Purpose | Example |
|-------|---------|---------|
| **Tenant isolation** | Keeps customer data separate | `tenant_id` column in every table |
| **Configurable logic** | Tenants can customize (branding, limits, roles) | custom theme, feature flags |
| **Authentication / Authorization** | Identify which tenant each user belongs to | JWT includes `tenant_id` |
| **Provisioning** | Create, suspend, delete tenants | tenant onboarding APIs |
| **Billing / Metering** | Charge each tenant separately | Stripe, Razorpay, etc. |
| **Monitoring & Audit** | Track tenant activity & resource usage | logs per tenant |

---

### **Multi-Tenant Models**

#### **A. Shared Database, Shared Schema** (Most Common for SaaS MVPs)

- One database
- Every table has a `tenant_id` column
- Data isolation via queries

**Pros:**
✅ Simple to scale
✅ Easy maintenance

**Cons:**
⚠️ Strict data-security enforcement required in code

```sql
SELECT * FROM users WHERE tenant_id = 't123';
```

#### **B. Shared Database, Separate Schemas**

- One database, each tenant has its own schema (`tenant1.users`, `tenant2.users`)

**Pros:**
✅ Stronger isolation

**Cons:**
⚠️ Schema management gets complex as tenants grow

#### **C. Separate Database per Tenant**

- Each tenant has its **own database** instance

**Pros:**
✅ Best data isolation & performance

**Cons:**
⚠️ Harder to maintain (backups, migrations, connections)

**Used by:** Large-scale or enterprise SaaS like Shopify, Salesforce

---

### **Why Multi-Tenancy is Core of SaaS**

**Enables:**
- **Scalability:** Add new tenants without redeploying code
- **Cost efficiency:** Shared infrastructure (CPU, memory, DB)
- **Security:** Strict tenant isolation at data & auth layer
- **Customization:** Per-tenant configs, features, themes, pricing
- **Maintainability:** One codebase → easier updates & bug fixes

**Without multi-tenancy** → You'd need to deploy a separate instance per customer = not scalable.

---

### **Architecture Diagram**

```
                 ┌────────────────────┐
                 │     SaaS App       │
                 │ (One Codebase)     │
                 └────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
   Tenant A            Tenant B          Tenant C
   ┌─────────┐          ┌─────────┐        ┌─────────┐
   │ Data A  │          │ Data B  │        │ Data C  │
   │Config A │          │Config B │        │Config C │
   └─────────┘          └─────────┘        └─────────┘
```

Each tenant feels like they have their own app — but under the hood, it's **one shared infrastructure**.

---

### **Database Schema Example**

```sql
-- Extension for UUID convenience
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password TEXT,
  firebase_token TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_users_tenant_email ON users(tenant_id, email);

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES users(id),
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_projects_tenant_owner ON projects(tenant_id, owner_id);
CREATE INDEX idx_projects_tenant ON projects(tenant_id);

CREATE TABLE versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  name TEXT,
  audio_cdn_url TEXT,
  image_cdn_url TEXT,
  genres TEXT[],
  moods TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_versions_tenant_project ON versions(tenant_id, project_id);
```

---

### **Tenant Identification Methods**

1. **Subdomain:** `tenant1.myapp.com`
2. **JWT claims:** `tenant_id` in token
3. **Custom header:** `x-tenant-id`

**Recommended:** Use JWT approach for APIs.

---

### **FastAPI Implementation Example**

```python
from fastapi import Depends, Header, HTTPException
import jwt

SECRET = "your_jwt_secret"

def get_tenant_id_from_auth(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(401, "Missing Authorization")
    
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET, algorithms=["HS256"])
    except Exception:
        raise HTTPException(401, "Invalid token")
    
    tenant_id = payload.get("tenant_id")
    if not tenant_id:
        raise HTTPException(400, "tenant_id missing in token")
    
    return tenant_id

# Usage in endpoint
@router.get("/projects")
def list_projects(
    tenant_id: str = Depends(get_tenant_id_from_auth),
    db: Session = Depends(get_db)
):
    return db.query(Project).filter(Project.tenant_id == tenant_id).all()
```

**Important:** Never trust a client-sent `tenant_id` header alone without auth verification.

---

### **Row-Level Security (RLS) in PostgreSQL**

RLS ensures SQL-level isolation:

```sql
-- Enable RLS on projects table
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create policy for tenant isolation
CREATE POLICY tenant_isolation ON projects
  USING (tenant_id = current_setting('app.current_tenant')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant')::uuid);

-- Set tenant context per session/transaction
SET app.current_tenant = 'the-tenant-uuid';
```

**In connection pooling scenarios:**
```sql
BEGIN;
SET LOCAL app.current_tenant = '...';
-- do selects/updates
COMMIT;
```

**FastAPI example:**
```python
# Before each request
db.execute(text("SET LOCAL app.current_tenant = :t"), {"t": tenant_id})
```

---

### **Modern Enhancements**

- **Tenant-aware caching:** Redis keys prefixed with `tenant_id`
  ```
  cache:{tenant_id}:user:123
  ```

- **Tenant-level rate limiting:** Token-bucket keyed on `tenant_id`

- **Tenant-based feature flags:** Store in `tenant_settings` table

- **Per-tenant analytics dashboards**

- **Isolation using Row-Level Security (RLS)** in Postgres

---

### **Best Practices**

✅ **Index composite columns** used in WHERE:
```sql
CREATE INDEX idx_versions_tenant_project ON versions(tenant_id, project_id);
CREATE INDEX idx_users_tenant_email ON users(tenant_id, email);
```

✅ **Full-text search per tenant:** Use GIN indexes on `to_tsvector`

✅ **Tenant provisioning API:**
```python
@router.post("/tenants")
def create_tenant(name: str, db: Session = Depends(get_db)):
    tenant = Tenant(name=name)
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    
    # Create default admin user
    admin = User(
        email="owner@example.com",
        tenant_id=tenant.id,
        role="admin"
    )
    db.add(admin)
    db.commit()
    
    return {"tenant_id": str(tenant.id)}
```

✅ **Helper functions for tenant-scoped queries:**
```python
def get_user_by_email(db: Session, tenant_id: str, email: str):
    return db.query(User).filter(
        User.tenant_id == tenant_id,
        User.email == email
    ).first()

def create_project(db: Session, tenant_id: str, owner_id: str, name: str):
    p = Project(tenant_id=tenant_id, owner_id=owner_id, name=name)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p
```

---

## Key Takeaways

✅ **Stack** = Execution contexts + primitives (fast, LIFO)
✅ **Heap** = Objects, arrays, functions (GC managed)
✅ **Execution Context** = Runtime container with scope, `this`, variables
✅ **Closures** = Inner functions + outer lexical environment (heap-stored)
✅ **V8 Pipeline** = Parse → Bytecode → Interpret → Optimize (TurboFan)
✅ **GC** = Mark-and-Sweep, generational (New + Old space)
✅ **Optimization** = Consistent object shapes, avoid type changes, use hidden classes
✅ **Performance** = Preload, prefetch, lazy loading, caching, CDN
✅ **Web Vitals** = LCP ≤ 2.5s, FID ≤ 100ms, CLS ≤ 0.1

---

This guide covers the essential internals of JavaScript execution and 37 interview questions. Master these concepts for interviews and performance optimization! 🚀
