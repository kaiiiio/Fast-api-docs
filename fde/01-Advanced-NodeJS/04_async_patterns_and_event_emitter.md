# Async Patterns and EventEmitter - Senior Interview Deep Dive

Every Node abstraction — streams, sockets, HTTP, process — sits on top of EventEmitter, and every production outage story eventually involves a promise that rejected with nobody listening, a listener that leaked, or a shutdown that dropped in-flight requests. This file covers EventEmitter internals, cancellation with AbortController, hand-built concurrency control, AsyncLocalStorage (the machinery under every APM tool), and the process-level error-handling and graceful-shutdown patterns that separate "works on my machine" from production-grade.

---

### Q1. How does EventEmitter work internally? What are the exact semantics of `emit`, and in what order do listeners run?

**Answer:**
An EventEmitter is a thin wrapper around `this._events` — a null-prototype object mapping event name → listener function (single) or array of functions (multiple; single-listener case avoids array allocation as an optimization). Everything is **synchronous**:

- `emit('x', ...args)` iterates a **copy** of the listener array and calls each listener synchronously, in registration order, with `this` bound to the emitter. `emit` returns `true` if there was at least one listener, `false` otherwise.
- Because it iterates a copy, listeners added *during* an emit don't run for that emit; listeners removed during an emit *were already captured* and still run.
- `once(name, fn)` wraps `fn` so it removes itself before invoking — so a `once` listener that throws is still removed.
- `prependListener` exists because order is registration order and sometimes you must run first (e.g., instrumenting).

```js
const { EventEmitter } = require('events');
const e = new EventEmitter();

e.on('tick', () => console.log('A'));
e.on('tick', () => {
  console.log('B');
  e.on('tick', () => console.log('LATE'));   // added mid-emit: not called this round
});
console.log('before');
e.emit('tick');    // A, B — synchronously, right here
console.log('after');
// Output: before, A, B, after. Next emit would print A, B, LATE.
```

The synchronous nature is the part interviewers probe: `emit` is just a function call loop. If a listener throws, the throw propagates out of `emit()` synchronously and **subsequent listeners do not run**. If a listener does 200 ms of work, `emit` takes 200 ms. There is no queue, no tick boundary, no isolation between listeners.

**Interview trap:** "Events are async, right?" No — `emit` is fully synchronous. What's async is *when* Node core chooses to call `emit` (e.g., socket data arrives on a future loop iteration). Your own `emitter.emit()` in a request handler runs inline like any function call.

---

### Q2. Why is the `'error'` event special, and what exactly happens when it's emitted with no listener?

**Answer:**
`emit('error', err)` with **zero `'error'` listeners throws the error synchronously** from the `emit` call site. If nothing up the (synchronous) stack catches it, it becomes an `uncaughtException` and crashes the process. This is deliberate: errors must never be silently dropped.

Nuances that show depth:
- If the emitted value isn't an `Error`, Node wraps the throw with `ERR_UNHANDLED_ERROR` and attaches the value as `context`.
- `events.errorMonitor` (a symbol) lets you *observe* errors without consuming them — install a listener keyed by `EventEmitter.errorMonitor` and the "throw if unhandled" behavior is preserved. This is how monitoring/APM libraries watch errors without changing app semantics.
- The dangerous case is emitters that error *later*: you create a socket, `await` something, and attach the error handler two ticks later — the error that arrives in between crashes you. Attach `'error'` handlers **in the same tick you create the emitter**.

```js
const { EventEmitter, errorMonitor } = require('events');
const e = new EventEmitter();

e.on(errorMonitor, (err) => metrics.count('emitter_errors'));  // observe only
e.emit('error', new Error('boom'));   // still THROWS here — errorMonitor doesn't consume

// The classic time-gap bug:
const net = require('net');
async function connect(host) {
  const sock = net.connect(443, host);
  await loadTlsConfig();               // if the socket errors during this await...
  sock.on('error', handle);            // ...too late: process already crashed
}
// Fix: net.connect(...); sock.on('error', handle); THEN await.
```

---

### Q3. Explain the MaxListeners warning. Is it a limit? How do real leaks through EventEmitter happen?

**Answer:**
`MaxListenersExceededWarning` fires when a single event name on a single emitter exceeds `getMaxListeners()` — default **10**. It is **not a limit**: all listeners still work; it's a heuristic leak detector, because legitimate code rarely attaches 11 handlers for one event on one emitter, but *a loop that attaches and never detaches* does exactly that.

The canonical leak shape — attaching per-request listeners to a long-lived emitter:

```js
// LEAK: one listener added per request to a process-lifetime emitter.
// Each closure captures req/res => retained forever => heap grows monotonically.
const bus = new EventEmitter();     // module-level, lives forever

app.get('/orders', (req, res) => {
  bus.on('order-updated', (order) => {     // never removed!
    if (!res.writableEnded) res.write(`data: ${JSON.stringify(order)}\n\n`);
  });
});
```

After 10 requests: warning. After a week: hundreds of thousands of closures, each pinning a request, response, socket buffers — a multi-GB leak whose heap snapshot shows "Array of functions retained by _events" (see file 05 for finding it).

Correct version — tie listener lifetime to the shorter-lived object:

```js
app.get('/orders', (req, res) => {
  const onUpdate = (order) => { if (!res.writableEnded) res.write(`data: ${JSON.stringify(order)}\n\n`); };
  bus.on('order-updated', onUpdate);
  res.on('close', () => bus.removeListener('order-updated', onUpdate));  // lifetime coupling
});
```

Related API knowledge: `setMaxListeners(n)` per-emitter or `events.setMaxListeners(n, ...emitters)` (also works on AbortSignals — see Q6); `emitter.listenerCount(name)`; `removeAllListeners(name)` (blunt — removes other modules' listeners too, use sparingly); and the rule of thumb: *any `on()` in per-request code must have a paired `removeListener` on a close/finish event, or use `once()`, or use `{ signal }`*:

```js
bus.on('order-updated', onUpdate, { signal: ac.signal });  // Node >= 20: auto-removed on abort
```

**Production war story:** A Socket.IO app attached a Redis-subscriber handler per connected socket to one shared Redis client and removed it in a `disconnect` handler — but the removal referenced a *different function instance* (`.bind(this)` creates a new function every call, so `removeListener(fn.bind(this))` removes nothing). Memory grew 2 GB/day; every Redis message fanned out to every listener ever attached, so CPU grew too. Fix: store the bound reference once and remove that exact reference. `removeListener` uses identity equality — bind/arrow-wrapper at removal time is a no-op.

---

### Q4. `events.once()`, async iteration of emitters, and `captureRejections` — the modern EventEmitter toolkit.

**Answer:**

```js
const { once, on, EventEmitter } = require('events');

// 1. events.once(emitter, name): promise for the next event — AND it rejects
//    if 'error' fires first. This is the correct way to await emitter state.
const server = app.listen(0);
await once(server, 'listening');            // rejects on 'error' (e.g., EADDRINUSE)

// With cancellation:
const ac = new AbortController();
await once(socket, 'connect', { signal: ac.signal });   // AbortError if aborted

// 2. events.on(emitter, name): async iterator over events. Buffers events
//    that arrive while your loop body awaits (unbounded! — know this).
for await (const [msg] of on(bus, 'message', { signal: ac.signal })) {
  await handle(msg);         // events arriving during this await queue up in memory
}

// 3. captureRejections: what happens when an ASYNC listener rejects?
//    By default: unhandledRejection (invisible to the emitter!). With capture:
const e = new EventEmitter({ captureRejections: true });
e.on('job', async () => { throw new Error('async fail'); });
e.on('error', (err) => console.error('caught:', err.message));  // routed here
e.emit('job');
```

The `captureRejections` point is the senior one: `emit` can't see into promises, so an `async` listener's rejection normally bypasses the emitter's error handling entirely and surfaces as a process-level `unhandledRejection`. `captureRejections: true` (per-emitter, or globally `events.captureRejections = true`) routes listener rejections to the emitter's `'error'` event / `Symbol.for('nodejs.rejection')` method.

**Interview trap:** the `events.on()` iterator's internal queue is **unbounded** — a fast emitter with a slow loop body buffers events without limit; there's no backpressure because emitters are push-only. If you need backpressure, you want a stream (or an explicit bounded queue), not an event iterator. Being able to articulate "EventEmitter = push, no backpressure; streams = push/pull with backpressure" is the conceptual dividing line.

---

### Q5. Design an AbortController-first async function. How do you compose timeouts, upstream signals, and manual cancellation?

**Answer:**
AbortController/AbortSignal is Node's standard cancellation primitive (stable since ~v15, used by `fetch`, `setTimeout` promises, streams, `fs`, `child_process`, `http.request`, `events.once`...). The pattern: every async function that does I/O accepts `{ signal }`, checks it, forwards it, and cleans up on abort.

```js
const { setTimeout: sleep } = require('timers/promises');

// Composition helpers you should know cold:
// AbortSignal.timeout(ms)      — auto-aborting signal (fires TimeoutError)
// AbortSignal.any([s1, s2])    — aborts when ANY input aborts (Node >= 20)
// signal.throwIfAborted()      — sync check
// signal.reason                — whatever was passed to abort()

async function fetchUser(id, { signal } = {}) {
  signal?.throwIfAborted();                       // fast-fail before doing work
  const res = await fetch(`https://api.internal/users/${id}`, { signal });  // forward!
  if (!res.ok) throw new Error(`upstream ${res.status}`);
  return res.json();
}

// Request handler composing three cancellation sources:
app.get('/users/:id', async (req, res, next) => {
  const signal = AbortSignal.any([
    AbortSignal.timeout(2_000),                   // budget: 2s max
    requestAbortSignal(req),                      // client disconnected
    shutdownController.signal,                    // process is draining (Q13)
  ]);
  try {
    res.json(await fetchUser(req.params.id, { signal }));
  } catch (err) {
    if (err.name === 'TimeoutError') return res.status(504).end();
    if (err.name === 'AbortError')  return;       // client gone / shutting down — nothing to send
    next(err);
  }
});

function requestAbortSignal(req) {
  const ac = new AbortController();
  req.once('close', () => { if (!req.readableEnded || !req.res.writableEnded) ac.abort(); });
  return ac.signal;
}
```

Making your *own* primitives abortable — the part hand-rolled code always gets wrong is **removing the abort listener afterward** (otherwise every call leaks a listener on a long-lived signal, e.g., the shutdown signal — the exact leak from Q3):

```js
function abortableDelay(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
    const t = setTimeout(() => { cleanup(); resolve(); }, ms);
    const onAbort = () => { clearTimeout(t); cleanup(); reject(signal.reason); };
    const cleanup = () => signal?.removeEventListener('abort', onAbort);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
```

Why cancellation matters in production terms: without it, a client that gives up (or an LB that times out at 30 s) leaves your server still executing the query, holding the DB connection, rendering the response — work for nobody. Under overload this is the death spiral: timeouts increase → clients retry → abandoned work stacks up → more timeouts. Cancellation propagated to the DB driver (`pg` supports it via `query.cancel`; `fetch` aborts the socket) is the difference between graceful degradation and collapse.

**Interview trap:** aborting doesn't stop synchronous code or a non-cooperating promise — a signal is a *notification*, honored only by code that listens for it. `signal.abort()` mid-`JSON.parse(hugeString)` does nothing until the parse finishes.

---

### Q6. Why do AbortSignals leak listeners, and what's the fix?

**Answer:**
The leak: a long-lived signal (per-server shutdown signal, or one long request's signal) has short-lived operations attach `'abort'` listeners. Each `fetch(url, { signal })` adds a listener to your signal; if the fetch completes normally, undici removes it — but hand-written code often doesn't, and even correct code triggers the MaxListeners warning at 10+ concurrent uses (AbortSignal is an EventTarget with the same warning heuristic).

```js
const { setMaxListeners } = require('events');

const shutdownAC = new AbortController();
setMaxListeners(0, shutdownAC.signal);   // 0 = unlimited: this signal legitimately fans out
// (Doing this silences the warning — only do it when you KNOW listeners are removed on completion.)
```

Rules: (1) every `addEventListener('abort', ...)` needs `{ once: true }` *plus* explicit removal on the success path (once only helps if abort actually fires); (2) prefer `AbortSignal.any([longLived, opLocal])` — the composite signal is garbage-collectable when the operation ends, decoupling the op from the long-lived signal's listener list (modern Node implements `any`/dependent signals with weak refs for exactly this reason); (3) treat the MaxListeners warning on a signal as a real finding, not noise — it's the same monotonic-growth signature as emitter leaks.

---

### Q7. Build `p-limit` (promise concurrency limiter) from scratch and explain why unbounded `Promise.all` is a production bug.

**Answer:**
`Promise.all(items.map(fn))` starts **all** operations immediately — `map` runs every `fn` before `all` is even called. 50k items = 50k simultaneous DB queries/HTTP requests: connection-pool exhaustion, `EMFILE`, upstream rate-limit bans, memory spikes. Concurrency must be explicit.

```js
// pLimit: returns a function that runs tasks with at most `concurrency` in flight.
function pLimit(concurrency) {
  if (!Number.isInteger(concurrency) || concurrency < 1) throw new TypeError('concurrency >= 1');
  let active = 0;
  const queue = [];                      // pending task starters (FIFO)

  const next = () => {
    active--;
    if (queue.length) queue.shift()();   // start the oldest waiting task
  };

  return function limit(fn, ...args) {
    return new Promise((resolve, reject) => {
      const run = () => {
        active++;
        // Promise.resolve().then(fn) — normalizes sync throws AND sync returns into the promise
        Promise.resolve().then(() => fn(...args)).then(
          (v) => { resolve(v); next(); },
          (e) => { reject(e); next(); },   // failures release the slot too — critical
        );
      };
      active < concurrency ? run() : queue.push(run);
    });
  };
}

// Usage: 5 concurrent, order of RESULTS preserved by Promise.all as usual.
const limit = pLimit(5);
const users = await Promise.all(ids.map((id) => limit(fetchUser, id)));
```

Points to narrate while whiteboarding:
- The slot **must** be released in both success and failure paths (`next()` in both handlers) — a limiter that leaks slots on error deadlocks at exactly `concurrency` failures. This is the bug interviewers look for.
- `Promise.resolve().then(() => fn())` ensures a synchronously-throwing `fn` rejects the promise instead of blowing up the limiter.
- With `Promise.all`, one rejection rejects the aggregate immediately — but the other in-flight tasks **keep running** (promises aren't cancellable). For all-results semantics use `Promise.allSettled`; for cancel-on-first-failure, combine with an AbortController that each task honors.

A batched alternative and why it's inferior: `for` over chunks of 5 with `Promise.all` per chunk waits for the *slowest of each chunk* before starting the next — utilization gaps. The sliding-window limiter above keeps exactly N in flight continuously. Also mention the built-in that covers many cases now: `Readable.from(ids).map(fetchUser, { concurrency: 5 })` (file 02, Q13).

**Interview trap:** `Promise.race` for timeouts leaves the losing operation running (and its eventual rejection must still be handled or it's an unhandledRejection — attach a no-op `.catch` to the loser, or use AbortSignal.timeout and cancel the work for real).

---

### Q8. Implement retry with exponential backoff, jitter, and abort support — production-grade, not the blog version.

**Answer:**

```js
async function retry(fn, {
  attempts = 5,
  baseMs = 100,
  maxMs = 10_000,
  signal,
  retryOn = (err) => err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT'
                  || (err.status >= 500 && err.status !== 501) || err.status === 429,
} = {}) {
  let lastErr;
  for (let attempt = 0; attempt < attempts; attempt++) {
    signal?.throwIfAborted();
    try {
      return await fn({ attempt, signal });
    } catch (err) {
      lastErr = err;
      if (!retryOn(err) || attempt === attempts - 1) throw err;

      // Full jitter: random(0, min(cap, base * 2^attempt)).
      // Honor Retry-After if the server sent one (429/503).
      const cap = Math.min(maxMs, baseMs * 2 ** attempt);
      const retryAfterMs = Number(err.retryAfter) * 1000 || 0;
      const delay = Math.max(retryAfterMs, Math.random() * cap);
      await abortableDelay(delay, signal);        // from Q5 — never an unabortable sleep
    }
  }
  throw lastErr;
}
```

The three things that make this senior-grade rather than blog-grade:
1. **Retry classification.** Retrying a 400 or a unique-constraint violation is a bug; retrying non-idempotent POSTs can double-charge — retry only what's safe *and* transient. 429/503 with `Retry-After` should be obeyed, not exponentially guessed.
2. **Full jitter, not plain exponential.** Without jitter, 1000 clients that failed together retry together — synchronized retry waves ("thundering herd") re-kill the recovering server at t=100ms, 200ms, 400ms... AWS's analysis showed full jitter (`random(0, cap)`) gives the best spread; be ready to cite it.
3. **Abort integration.** Retries must stop when the request/process is cancelled — otherwise shutdown waits for someone's 5-attempt backoff ladder.

Also say the word **circuit breaker**: retries are per-call; when the *downstream is down*, N callers × 5 attempts multiplies load by 5× exactly when it can least afford it. A breaker (track failure rate, open the circuit, fail fast, half-open probe) is the systemic complement — retry handles blips, the breaker handles outages.

---

### Q9. What are async_hooks, and what is AsyncLocalStorage? How does APM/request-context tracing actually work under the hood?

**Answer:**
`async_hooks` is Node's low-level lifecycle tracker for **async resources**: every promise, timer, TCP request, fs call gets an `asyncId`, and hooks fire at `init` (resource created — crucially, this records `triggerAsyncId`, *who* created it), `before`/`after` (its callback runs), and `destroy`. Following `triggerAsyncId` chains reconstructs causality across `await`s — this is how a context can "follow" an async flow with zero code changes.

`AsyncLocalStorage` (ALS) is the supported, optimized abstraction on top: continuation-local storage — like a thread-local, but for async continuations.

```js
const { AsyncLocalStorage } = require('async_hooks');
const { randomUUID } = require('crypto');

const requestContext = new AsyncLocalStorage();

// Middleware: everything called (transitively!) during this request —
// across awaits, timers, DB callbacks — sees the same store.
app.use((req, res, next) => {
  const ctx = {
    requestId: req.headers['x-request-id'] || randomUUID(),
    userId: null,
    startTime: Date.now(),
  };
  requestContext.run(ctx, next);     // ctx is bound to next()'s entire async subtree
});

// Deep in a service layer, five awaits away, zero parameters threaded through:
function log(level, msg, extra = {}) {
  const ctx = requestContext.getStore();          // undefined outside a run()
  console.log(JSON.stringify({
    level, msg, ...extra,
    requestId: ctx?.requestId,                    // every log line correlated for free
    userId: ctx?.userId,
  }));
}

// Auth middleware can mutate the store object (same reference):
app.use((req, res, next) => {
  const ctx = requestContext.getStore();
  if (ctx) ctx.userId = verify(req.headers.authorization)?.sub ?? null;
  next();
});
```

How APM tools (Datadog, New Relic, OpenTelemetry) work — the three layers:
1. **Context propagation:** ALS (formerly raw async_hooks) carries the active *span* across async boundaries, so a DB query started inside a request attaches to that request's trace without you passing anything.
2. **Instrumentation:** they monkey-patch module loading (`require`/ESM loader hooks) to wrap `http.request`, `pg.query`, `redis.sendCommand`... each wrapper reads the current span from ALS, creates a child span, injects trace headers (`traceparent`) into outgoing requests.
3. **Timing/attribution:** `before`/`after` hooks (or wrapped callbacks) measure each segment; `destroy` hooks catch leaks.

Costs and gotchas worth stating:
- ALS overhead is small but nonzero (a few % on promise-heavy loads; raw `async_hooks` with `destroy` hooks is much worse — promise `init` allocation tracking historically cost 10–30%). Modern ALS avoids most of this by propagating a frame instead of tracking every resource.
- **Context loss** happens where callbacks are queued outside the async flow: user-space queues/pools that store callbacks in arrays and call them later from a different context (old connection-pool libraries were notorious). Fix: `AsyncResource.bind(cb)` — capture the current context into the callback:

```js
const { AsyncResource } = require('async_hooks');
queue.push(AsyncResource.bind(() => processJob(job)));  // runs later WITH today's context
```

- `enterWith()` (sets context without a callback wrapper) is footgun-tier — it leaks context into unrelated subsequent work on the same tick; prefer `run()`.

**Production war story:** After adding a connection-pool library, a team's logs started showing *other users'* requestIds on log lines — context bleed. The pool reused pending-callback slots across requests without `AsyncResource`, so a callback queued by request A ran under whatever context the pool's timer had. Looked like a security incident (cross-user data in logs); root cause was continuation-context loss. They validated the fix by asserting `getStore().requestId` at entry and exit of handlers in staging.

---

### Q10. `unhandledRejection` and `uncaughtException` — what are the correct process-level handlers, and why is "log and continue" wrong for uncaughtException?

**Answer:**

```js
// unhandledRejection: a promise rejected and (by the time GC/check ran) nothing
// handled it. Default since Node 15: it CRASHES the process (mode: 'throw').
process.on('unhandledRejection', (reason, promise) => {
  // A rejection you failed to handle is a BUG, but state is usually intact —
  // the rejection didn't corrupt anything, you just forgot a .catch.
  logger.error({ err: reason }, 'unhandledRejection');
  // Policy choice: crash in dev/staging (find bugs), alert+crash or alert-only in prod.
  // Many teams: treat as fatal, because "which rejections are safe" is unknowable.
  throw reason;   // escalate to uncaughtException path => controlled crash
});

// uncaughtException: an exception unwound the stack to the event loop.
// The application is now in UNDEFINED STATE: a handler died halfway through —
// locks held? partial writes? a response never sent? You cannot know.
process.on('uncaughtException', (err, origin) => {
  logger.fatal({ err, origin }, 'uncaughtException — terminating');
  // Do the minimum: flush logs/telemetry, then EXIT. Do not keep serving.
  flushLogsSync();
  process.exit(1);              // supervisor (k8s/PM2/systemd) restarts us clean
});
```

Why "log and continue" on `uncaughtException` is wrong — the argument to make explicitly:
- The exception aborted some function mid-flight. Whatever invariants it maintained (mutex released, transaction committed/rolled back, response sent, counter decremented) may now be violated **forever** in this process.
- The very request that crashed never got a response — its client hangs until timeout. Multiply by whatever shared state broke.
- Node's own docs say exactly this: resuming after `uncaughtException` is "unsafe"; use it for synchronous cleanup + exit. A monitor process (or `--abort-on-uncaught-exception` for core dumps) is the sanctioned tooling.
- The correct availability answer is **redundancy** (N replicas + supervisor restarts + load balancer), not process necromancy. One replica crashing and restarting in 2 s is invisible; one replica limping with corrupted state serves garbage for hours.

Nuances that earn senior credit:
- `unhandledRejection` is different in kind: it fires when you *forgot a catch*, often on a fire-and-forget promise; process state is typically fine. That's why "crash vs log" is a defensible policy debate for rejections but not for exceptions. Know the flag: `--unhandled-rejections=strict|throw|warn|none` (default `throw` since v15).
- `'rejectionHandled'` event: a rejection reported as unhandled that *later* got a handler (late `.catch`) — relevant if you build rejection tracking.
- Throwing **inside** the `uncaughtException` handler = immediate process death, no more events. Keep the handler tiny and sync.
- `process.on('warning')` — surface `MaxListenersExceededWarning`, deprecations, etc. into your logging; they're early leak alarms.

**Interview trap:** "Wrap everything in try/catch and you won't need these." Callbacks throw outside your try/catch's dynamic extent (`try { setTimeout(() => { throw e }, 0) } catch {}` catches nothing); `'error'` events aren't exceptions; and third-party code fails in ways you can't wrap. Process-level handlers are the last-resort net, not an alternative to local handling.

---

### Q11. Write the complete graceful-shutdown pattern: SIGTERM, readiness gate, `server.close`, connection draining, resource teardown, and the hard deadline.

**Answer:**
The full sequence — every step exists because of a specific failure mode:

```js
'use strict';
const http = require('http');

const state = { ready: false, shuttingDown: false };
const shutdownAC = new AbortController();          // propagate "we're dying" to in-flight work

const server = http.createServer((req, res) => {
  if (req.url === '/healthz') return res.end('ok');                       // liveness
  if (req.url === '/readyz')                                              // readiness
    return res.writeHead(state.ready ? 200 : 503).end();
  handle(req, res, shutdownAC.signal);
});

// Track in-flight REQUESTS (not just sockets) for informed draining.
let inflight = 0;
server.on('request', (req, res) => {
  inflight++;
  res.on('close', () => inflight--);
});

server.listen(3000, () => { state.ready = true; });

async function shutdown(signal) {
  if (state.shuttingDown) return;                  // SIGTERM can arrive multiple times
  state.shuttingDown = true;
  logger.info({ signal }, 'shutdown initiated');

  // HARD DEADLINE first — a shutdown that can hang is worse than none.
  // Must be < the supervisor's kill timeout (k8s terminationGracePeriodSeconds=30 default).
  const deadline = setTimeout(() => {
    logger.error({ inflight }, 'grace period exceeded — forcing exit');
    process.exit(1);
  }, 25_000);
  deadline.unref();

  // 1. Fail readiness. LB/k8s stops routing to us. (Liveness stays 200 —
  //    failing liveness during shutdown gets you killed EARLIER, not later.)
  state.ready = false;

  // 2. Wait for endpoint propagation. k8s removes the pod from Endpoints
  //    asynchronously; kube-proxy/ingress can lag seconds. Without this pause
  //    you close the listener while traffic is still being routed => ECONNREFUSED.
  await new Promise(r => setTimeout(r, 5_000));

  // 3. Stop accepting new connections; finish in-flight requests.
  //    Node >= 18.2: close() also ends idle keep-alive connections.
  const closed = new Promise((resolve) => server.close(resolve));
  server.closeIdleConnections?.();                 // explicit for clarity/back-compat

  // 4. Tell long-running in-process work (jobs, SSE, big exports) to wrap up.
  shutdownAC.abort(new Error('server shutting down'));

  // 5. Stop intake from non-HTTP sources BEFORE closing their dependencies.
  await queueConsumer.stop({ finishInflight: true });   // stop pulling, ack what's running

  await closed;                                    // all HTTP requests done
  logger.info('http drained');

  // 6. Teardown in reverse dependency order: things that USE the DB first.
  await scheduler.stop();
  await db.end();                                  // pg pool: waits for checked-out clients
  await redis.quit();                              // QUIT flushes pending replies (vs disconnect())

  await logger.flush?.();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));  // k8s/docker stop
process.on('SIGINT',  () => shutdown('SIGINT'));   // Ctrl+C
```

The failure mode each step prevents (be able to rattle these off):
- **No readiness flip / no propagation wait** → connection-refused spikes during every deploy (the "we see 502s for 10 seconds on each rollout" ticket).
- **No `closeIdleConnections`** (pre-18.2) → shutdown hangs the full `keepAliveTimeout` because idle keep-alive sockets count as open connections.
- **No hard deadline** → one stuck request (dead DB, slow client) holds shutdown until the supervisor SIGKILLs you — which drops *all* other in-flight work uncleanly anyway, so you gained nothing and lost the clean teardown.
- **Teardown order wrong** (DB closed before HTTP drained) → in-flight requests start failing with "pool is draining" — you manufactured errors during your own deploy.
- **SIGKILL cannot be handled.** Anything critical must survive it (transactions, idempotency, journaling) — graceful shutdown is an optimization, crash-safety is the requirement.
- **Docker PID 1 problem:** `CMD node app.js` (exec form) — not `CMD npm start` or shell form — or signals never reach your process and every stop is a 10 s wait + SIGKILL.

---

### Q12. `queueMicrotask` vs `process.nextTick` vs `setImmediate` in async patterns — where does each bite in real code?

**Answer:**
Ordering: **nextTick queue → microtasks (promises, queueMicrotask) → [next loop phase] ... → setImmediate (check phase)**. nextTick and microtasks drain *completely* between every phase transition and between each other (nextTick first) — they can therefore **starve the loop**:

```js
// Starvation: this never lets I/O run again — each tick schedules another.
function pump() { process.nextTick(pump); }   // 100% CPU, no requests served, timers dead
// setImmediate(pump) is safe: immediates run once per loop iteration, I/O interleaves.
```

Practical rules:
- **Emitting events from a constructor / before caller can subscribe:** `process.nextTick(() => this.emit('ready'))` — the canonical legitimate use (lets the caller attach listeners in the same tick).
- **Zalgo prevention** (an API that's sometimes sync, sometimes async — callers can't reason about state): normalize with nextTick/queueMicrotask so callbacks are *always* async.
- **Breaking up CPU work cooperatively:** use `setImmediate` (or `await scheduler.yield()` / `await setImmediatePromise()`), never nextTick/microtasks — only immediates yield to I/O.
- In modern promise-based code, `queueMicrotask` ≈ `Promise.resolve().then` without the allocation; `process.nextTick` still runs *before* microtasks and is Node-specific. Prefer `queueMicrotask` for portability unless you specifically need pre-promise ordering.

```js
// Cooperative chunking: process 10M items without freezing the loop.
const { setImmediate: yieldToLoop } = require('timers/promises');
async function processAll(items) {
  const CHUNK = 5_000;
  for (let i = 0; i < items.length; i += CHUNK) {
    for (let j = i; j < Math.min(i + CHUNK, items.length); j++) transform(items[j]);
    await yieldToLoop();       // timers, sockets, everything gets a turn
  }
}
```

**Interview trap:** `await null` / `await Promise.resolve()` does **not** yield to I/O — it only defers to the microtask queue, which drains before the loop advances. A CPU loop "made async" with `await Promise.resolve()` every iteration still blocks all I/O. Yielding to the loop requires a macrotask: `setImmediate` or a timer.

---

### Q13. Fire-and-forget promises: when is it acceptable, and what's the safe pattern?

**Answer:**
`void doSomething()` (or just not awaiting) is sometimes right — audit logging, cache warming, analytics — work whose failure shouldn't fail the request. But a bare un-awaited promise has two bugs waiting: an unhandled rejection (crashes the process under default policy, Q10) and invisibility during shutdown (process exits mid-write).

```js
// The safe fire-and-forget wrapper: swallow-with-telemetry + shutdown tracking.
const pending = new Set();

function fireAndForget(promise, label) {
  const p = promise
    .catch((err) => logger.warn({ err, label }, 'background task failed'))  // never unhandled
    .finally(() => pending.delete(p));
  pending.add(p);
  return undefined;                       // make it un-awaitable on purpose: intent is explicit
}

// In shutdown (Q11 step 5.5): give background work a bounded chance to finish.
async function drainBackground(ms = 5_000) {
  await Promise.race([
    Promise.allSettled([...pending]),
    new Promise(r => setTimeout(r, ms)),
  ]);
  if (pending.size) logger.warn({ count: pending.size }, 'background tasks abandoned at shutdown');
}
```

Decision rule to state: fire-and-forget is acceptable only when the work is (a) non-critical — losing it silently is OK, (b) observed — failures are logged/counted, and (c) bounded — you can't accumulate unbounded pending tasks (add a cap or a queue, or it's an overload amplifier). Anything transactional/billable goes to a durable queue (BullMQ/SQS) instead — "background" in-process work dies with the process; queues don't.

---

### Q14. Async anti-pattern review: find the bugs in these five snippets.

**Answer:**

```js
// 1. Sequential await in a loop — N round trips instead of max-K parallel.
for (const id of ids) results.push(await fetchUser(id));        // BUG: serial
// Fix: const results = await Promise.all(ids.map(id => limit(() => fetchUser(id))));

// 2. forEach with async callback — forEach ignores the returned promises.
items.forEach(async (item) => { await save(item); });
console.log('done');            // BUG: prints before ANY save completes; errors unhandled
// Fix: for...of with await, or Promise.all(items.map(...)) with a limiter.

// 3. async executor — exceptions inside vanish (executor's throw after
//    resolve/reject is swallowed; async executor rejections go nowhere).
new Promise(async (resolve) => {                                 // BUG
  const data = await load();          // if this throws: unhandledRejection, promise never settles
  resolve(data);
});
// Fix: async functions ARE promises — just `return load()` / call the async fn directly.

// 4. Racing without cleanup — the timeout keeps the process alive / fires later.
const result = await Promise.race([op(), new Promise((_, rej) =>
  setTimeout(() => rej(new Error('timeout')), 5000))]);          // BUG: timer never cleared,
// and if op() loses, its later rejection is unhandled.
// Fix: AbortSignal.timeout(5000) passed INTO op, or clear the timer in finally
// and attach op().catch(() => {}) when it loses.

// 5. try/catch around a returned (not awaited) promise — catches nothing.
async function getUser(id) {
  try {
    return db.findUser(id);        // BUG: rejection happens after we've returned;
  } catch (err) {                  // this catch can never fire for it
    return null;
  }
}
// Fix: `return await db.findUser(id);` — inside try/catch, `return await` is NOT redundant.
```

Number 5 is the highest-yield: `return await` inside a `try` block is semantically different from `return` — the await is what brings the rejection into the catch's dynamic extent (it also keeps the frame in the async stack trace). Linters flag `no-return-await` only *outside* try/catch for this reason.

---

### Q15. How do you test and observe async correctness in production — the metrics and invariants a senior sets up?

**Answer:**
1. **Unhandled rejection/exception counters** — process handlers (Q10) increment metrics before crashing; alert on any nonzero rate. A slow drip of unhandledRejections is a bug inventory.
2. **Event-loop delay p99 + ELU** (file 03 Q14) — the "is the loop healthy" pair; regressions here precede latency complaints.
3. **In-flight request gauge + graceful-shutdown drain time** — log `inflight` at shutdown start/end; a drain time trending toward your grace period means you'll soon drop requests on deploys.
4. **Listener-count audits** — periodic `emitter.listenerCount()` on known long-lived emitters/signals; monotonic growth = leak (Q3/Q6). Cheap to sample, catches the top leak class before the heap does.
5. **Context-integrity assertion** (staging): middleware asserts `als.getStore().requestId === req.id` at response time — catches context bleed (Q9) the day a library breaks it, not the day logs leak user data.
6. **Timeout budget discipline**: every outbound call has a timeout, and inner timeouts < outer timeouts (DB 2 s < handler 5 s < LB 30 s < client 60 s). Inverted budgets are why "the client saw a 504 but the server logged success."
7. **Chaos-style test for shutdown**: an integration test that starts the server, opens a slow request + an idle keep-alive connection + a queued job, sends SIGTERM, and asserts: slow request completes, idle socket closes, job acks or requeues, exit code 0, under the deadline. Teams that have this test do not have deploy-time 502 tickets; teams that don't, do.
