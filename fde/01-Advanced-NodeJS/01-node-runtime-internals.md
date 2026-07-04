# Lesson 1.1 — Node.js Runtime Internals: What `node app.js` Actually Does

> Module: Advanced Node.js | Level: Senior | FDE Prep Phase 1

Senior engineers are not tested on "Node is single-threaded, non-blocking." They're tested on: *why did our p99 latency spike, why is the event loop lagging, why did crypto calls slow down file uploads, why does this promise resolve before that timer.* This lesson builds the mental model that answers all of those.

---

## 1. The boot sequence — `node app.js`, step by step

Node is a C++ program that embeds two libraries: **V8** (executes JavaScript) and **libuv** (event loop + async I/O). When you run `node app.js`:

1. **Process setup (C++)** — the `node` binary starts, parses CLI flags (`--max-old-space-size`, `--inspect`, etc.), initializes the V8 *platform*.
2. **V8 Isolate created** — an isolate is one independent V8 instance: its own heap, its own GC. One isolate = one JS thread. (Worker Threads = more isolates, not shared heap.)
3. **Context created** — a global object environment inside the isolate. This is where `globalThis` lives.
4. **Node's internal JS bootstraps** — files like `internal/bootstrap/node.js` run *before your code*, wiring up `process`, `require`, timers, the module system. Node ships these pre-compiled in a **V8 startup snapshot** baked into the binary — that's why startup is ~40ms, not ~500ms.
5. **Your module is wrapped**. CommonJS files are not executed bare. Node wraps them:

```js
(function (exports, require, module, __filename, __dirname) {
  // your entire file here
});
```

That's why `require` and `__dirname` "just exist" — they're function parameters, not globals. (ESM works differently: linked declaratively, `import` hoisted and resolved before execution.)

6. **Your code runs to completion** — the entire top-level synchronous code executes as one uninterrupted stack. Async callbacks only get a chance *after* this returns.
7. **libuv event loop starts** — `uv_run()` spins as long as there are **active handles or requests** (open servers, pending timers, in-flight fs calls). When the refcount hits zero, the loop exits and the process ends. This is what `unref()` manipulates: `timer.unref()` says "don't keep the process alive just for me."

**Interview trap:** "When does a Node process exit?" → Not "when the code finishes." When the event loop has no referenced active handles/requests left. A single `setInterval` or open socket keeps it alive forever.

---

## 2. Inside V8 — the compilation pipeline (this is what makes code "fast" or "slow")

V8 is a multi-tier JIT. Your function moves up (and down) this ladder:

```
Parser → Ignition (bytecode interpreter)
       → Sparkplug (baseline compiler, non-optimizing)
       → Maglev (mid-tier optimizer)
       → TurboFan (top-tier optimizing compiler)
       ← deoptimization (falls all the way back)
```

- **Lazy parsing:** V8 doesn't fully parse function bodies until first call — only a fast "pre-parse" for syntax errors. Huge files with unused functions cost less than you'd think; deeply nested IIFEs defeat this.
- **Ignition** compiles to bytecode and, critically, collects **type feedback** in *feedback vectors*: "this `+` always saw two Smis (small integers)", "this property load always saw the same object shape."
- **TurboFan** uses that feedback to generate speculative machine code: it *assumes* the types it has seen, and guards the assumption. If the assumption breaks → **deoptimization**: the optimized code is thrown away, execution bails back to bytecode, and V8 may retry later.

### Hidden classes (Maps) and inline caches — the #1 practical V8 concept

Every object in V8 has a **hidden class** (V8 calls it a *Map*) describing its shape: which properties, in which order, at which offsets.

```js
const a = { x: 1, y: 2 };   // shape: {x, y}
const b = { y: 2, x: 1 };   // DIFFERENT shape: {y, x} — order matters
const c = { x: 1 };
c.y = 2;                     // transitions {x} → {x, y}; ends at same shape as `a`
```

Property access sites cache the shape they've seen (**inline caches / ICs**):

- **Monomorphic** (1 shape seen) → property load compiles to a single memory offset read. Fastest.
- **Polymorphic** (2–4 shapes) → a small if-else chain of shape checks.
- **Megamorphic** (5+ shapes) → gives up, falls back to a hash-table lookup. 10–100x slower per access.

**Production consequences (real, measurable):**

- Initialize all properties in the constructor / object literal, in a fixed order. Don't add properties conditionally later.
- `delete obj.prop` forces the object into slow "dictionary mode." Set to `undefined` or `null` instead.
- Keep arrays element-kind stable: an array of Smis that gets a float pushed transitions `PACKED_SMI → PACKED_DOUBLE`; add a string → `PACKED_ELEMENTS`; write past the end or `delete` an index → `HOLEY_*`. Transitions are one-way (never back to faster kinds) and holey arrays disable a class of optimizations.
- Functions handling wildly different object shapes (e.g., generic `merge(obj)`) go megamorphic. Hot paths deserve shape discipline.

### Garbage collection (what you tune in production)

V8's heap is **generational**:

- **New space (young gen)** — small (~16–32MB), collected by **Scavenger** (Orinoco): a copying collector, very fast, runs often. Objects surviving 2 scavenges get promoted.
- **Old space** — collected by **Mark-Sweep-Compact**, mostly *concurrent and incremental* (marking happens on background threads while your JS runs), but still has stop-the-world pauses.

Ops-relevant facts:

- `--max-old-space-size=4096` — the flag you set when a container gets OOM-killed; V8's default heap limit (~2–4GB depending on version/RAM) is *not* container-aware in older versions.
- A "memory leak" in Node is almost always: growing `Map`/array caches without eviction, closures capturing large scopes, listeners never removed (`EventEmitter` leak warning at 10+), or module-level accumulation. Diagnose with `--inspect` + Chrome DevTools heap snapshots (compare two snapshots, look at *retainers*), or `v8.getHeapStatistics()` in-process.
- High GC time shows up as event-loop lag with no obvious blocking code. `--trace-gc` confirms it.

---

## 3. libuv — the actual event loop

The "event loop" is not V8 and not JavaScript. It's a C loop inside libuv (`uv_run`). One iteration ("tick") walks through **phases**, each with its own FIFO callback queue:

```
   ┌─> 1. timers          — expired setTimeout / setInterval callbacks
   │   2. pending callbacks — deferred system-level cbs (e.g. TCP errors)
   │   3. idle, prepare    — internal
   │   4. poll             — ★ compute how long to block; block on epoll/
   │                          kqueue/IOCP waiting for I/O; run I/O callbacks
   │   5. check            — setImmediate callbacks
   └── 6. close callbacks  — socket.on('close'), handle teardown
```

Key mechanics seniors are expected to know:

- **The poll phase is where Node "waits."** If there are no expired timers and no `setImmediate` scheduled, the loop *blocks* in the OS poll call (`epoll_wait` on Linux, `kqueue` on macOS, IOCP via `GetQueuedCompletionStatus` on Windows) with a timeout equal to the nearest timer's deadline. This is why an idle Node server uses ~0% CPU.
- **Timers are a min-heap, not a queue**, keyed by deadline. `setTimeout(fn, 0)` is actually clamped to 1ms. Timers fire *no earlier* than their deadline — a blocked loop delays them arbitrarily. `setTimeout(fn, 100)` means "≥100ms", never "=100ms."
- **Network I/O never uses threads.** Sockets are event-driven directly through epoll/kqueue/IOCP. One thread can multiplex 100k connections — that's Node's whole value proposition.
- **The libuv threadpool (default 4 threads)** exists only for things the OS can't do asynchronously:
  - `fs.*` (all file I/O!)
  - `dns.lookup()` (because it calls the blocking `getaddrinfo`)
  - `crypto.pbkdf2`, `crypto.scrypt`, `crypto.randomBytes` (async forms)
  - `zlib` async methods

  Size it with `UV_THREADPOOL_SIZE` (max 1024), **set before startup**.

### The classic senior war story (asked in interviews constantly)

Your API also serves file downloads. Someone adds password hashing with `crypto.pbkdf2`. Suddenly *unrelated* fs reads have 500ms+ p99. Why?

→ pbkdf2 jobs (CPU-heavy, ~100ms each) occupy all 4 threadpool threads; fs requests queue behind them. Even nastier: `dns.lookup` (used by default in `http.request` when you pass a hostname!) also queues behind them — so *outbound HTTP calls* stall too, and it looks like a network problem.

Fixes: raise `UV_THREADPOOL_SIZE`; move hashing to a Worker Thread or dedicated service; use `dns.resolve`* (c-ares, no threadpool) or keep-alive agents; cache DNS.

---

## 4. Microtasks — the queues that run *between* everything

Besides the phase queues (macrotasks), there are two higher-priority queues drained **after every single callback**, not once per phase (Node ≥11 semantics — Node 10 and browsers-vs-old-Node ordering is a legacy trivia trap):

1. **`process.nextTick` queue** — drained first, completely
2. **Promise microtask queue** (V8's) — drained second, completely

"Completely" = if a microtask enqueues another microtask, it runs before the loop moves on. This is how you **starve the event loop**:

```js
function block() { process.nextTick(block); }
block(); // no timer, no I/O callback will EVER run again
```

Same is true of a recursive promise chain. `setImmediate` recursion is safe — it yields one full loop iteration each time. This is *the* answer to "how do I break up a long synchronous job without Worker Threads."

### The ordering katas

**Kata 1:**

```js
setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));
```

Output order: **non-deterministic.** The 1ms timer clamp races against how fast the process reaches the timers phase. If loop entry takes <1ms, timer isn't expired → immediate first. Anyone who answers confidently either way fails.

**Kata 2 — same two, inside I/O:**

```js
fs.readFile(__filename, () => {
  setTimeout(() => console.log('timeout'), 0);
  setImmediate(() => console.log('immediate'));
});
```

Output: **always `immediate` first.** The readFile callback runs in the poll phase; the next phase is check (`setImmediate`), while timers must wait for the next loop iteration. Deterministic. Explaining *why* Kata 1 races and Kata 2 doesn't is the whole point.

**Kata 3 — full ordering:**

```js
console.log('1');
setTimeout(() => console.log('2'), 0);
setImmediate(() => console.log('3'));
Promise.resolve().then(() => console.log('4'));
process.nextTick(() => console.log('5'));
queueMicrotask(() => console.log('6'));
console.log('7');
```

Answer: `1, 7` (sync) → `5` (nextTick beats all) → `4, 6` (promise microtasks, FIFO) → then `2`/`3` race per Kata 1.

**`await` note:** `await x` schedules the continuation as a microtask — since Node 12's resumed-await optimization, exactly **one** microtask hop (it used to be three; another legacy-trivia trap). Everything after `await` in a function body is effectively a `.then` callback.

---

## 5. Observing the loop in production (what actually goes on a dashboard)

**Event-loop delay** is *the* Node health metric — it directly measures "how blocked are we":

```js
const { monitorEventLoopDelay } = require('perf_hooks');
const h = monitorEventLoopDelay({ resolution: 20 });
h.enable();
setInterval(() => {
  console.log({
    p50: h.percentile(50) / 1e6,  // ms
    p99: h.percentile(99) / 1e6,
    max: h.max / 1e6,
  });
  h.reset();
}, 10_000);
```

- Healthy service: p99 loop delay in single-digit ms.
- Sustained 50–100ms+: something is doing synchronous work on the loop (JSON.parse of huge payloads, sync crypto/fs, regex catastrophic backtracking, GC pressure).
- Find the culprit: `--cpu-prof` / `--prof`, clinic.js flame graphs, or 0x.
- Also watch `process.memoryUsage()` (`rss` vs `heapUsed` divergence → Buffer/native leaks, since Buffers live outside the V8 heap in external memory).

**Rules of thumb this model gives you:**

| Symptom | Mechanism | First move |
|---|---|---|
| All requests slow, CPU high | Sync work / GC on the loop | CPU profile, check loop delay |
| fs + outbound HTTP slow, CPU low | Threadpool exhaustion | Check pbkdf2/zlib/dns usage, `UV_THREADPOOL_SIZE` |
| Timers firing late | Loop blocked or overloaded | Loop delay histogram |
| Memory grows, GC time grows | Old-space accumulation | Heap snapshot diff, retainers |
| RSS grows, heap flat | Buffers / native addons | `memoryUsage().external`, arrayBuffers |

---

## 6. Self-check (answer without looking)

1. Why does `http.request('http://api.internal/...')` potentially slow down when someone adds bcrypt hashing elsewhere in the app?
2. What exactly does `deopt` mean, what triggers it, and why does property order in object literals matter?
3. Why is recursive `setImmediate` safe but recursive `process.nextTick` fatal?
4. A container with 8GB RAM gets OOM-killed but heap snapshots show 1.5GB. Name two places the memory could be.
5. When you `await` a fetch, what data structure is your function's continuation sitting in, and what has to happen before it runs?

Next lesson: **1.2 — Streams & Backpressure** (why `pipe` exists, `highWaterMark`, `pipeline` vs `pipe`, and building a memory-safe 10GB file processor), then Worker Threads & Cluster.
