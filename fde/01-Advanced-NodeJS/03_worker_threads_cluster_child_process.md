# Worker Threads, Cluster and Child Processes - Senior Interview Deep Dive

"Node is single-threaded" is the half-truth every junior repeats; the senior answer is that Node gives you three distinct multiprocessing primitives with completely different memory models, communication costs, and failure domains. Interviewers use this topic to test whether you know *which* primitive fits which problem — CPU-bound work vs multi-core HTTP scaling vs running foreign programs — and whether you understand what actually crosses the boundary (copies? handles? shared memory?) and what it costs.

---

### Q1. worker_threads vs cluster vs child_process — what is each actually, and when do you use which?

**Answer:**

| | `worker_threads` | `cluster` | `child_process` |
|---|---|---|---|
| Unit | Thread in the **same process** (own V8 isolate + event loop) | Full **forked Node processes** | Any **process** (Node or not) |
| Memory | Isolated heaps, but **can share memory** (`SharedArrayBuffer`) | Fully isolated | Fully isolated |
| Communication | `postMessage` (structured clone), transferables, SAB | IPC channel (JSON-ish serialization) + **handle passing** | stdio pipes, IPC channel (if `fork`) |
| Startup cost | ~10–20 ms, ~5–10 MB per worker | ~30–80 ms, ~30–50 MB per process (full Node bootstrap) | Same as cluster for Node; whatever the binary costs otherwise |
| Crash blast radius | Can take down the whole process on native crashes; JS errors are contained (`'error'` event) | One worker dies, master respawns — good isolation | Isolated |
| Built-in special power | Zero-copy transfer + shared memory | **Shares listening sockets** across processes | Runs non-Node programs, shell |
| Use for | CPU-bound JS/WASM: parsing, compression, crypto, image/ML inference | Multi-core scaling of one HTTP server (largely superseded by k8s/PM2) | ffmpeg, git, pandoc, sandboxing untrusted code, memory isolation |

Decision rules worth saying out loud:
- **CPU-bound work inside a server** → worker threads (cheap communication, shared memory possible).
- **Use all cores for an HTTP server** → cluster or, in containers, 1 process per pod and let the orchestrator replicate (Q13).
- **Invoke external binaries or need hard memory/crash isolation** → child_process.
- **I/O-bound work** → none of the above. The event loop already handles 10k concurrent sockets on one thread; adding threads to I/O-bound code adds cost and zero benefit. This is the trap answer interviewers listen for.

Also know what's *already* multithreaded without you doing anything: libuv's threadpool (default **4** threads, `UV_THREADPOOL_SIZE`, max 1024) runs `fs.*`, `dns.lookup`, `zlib`, and `crypto.pbkdf2/scrypt/randomBytes`. Four concurrent `pbkdf2` calls saturate it and queue the fifth — a classic hidden bottleneck: "fs got slow because someone added password hashing."

---

### Q2. What does a worker thread actually contain? What is shared and what is isolated?

**Answer:**
Each worker gets its **own V8 isolate** (own heap, own GC), **own libuv event loop**, and own microtask queue — it is nearly a full Node instance in a thread. Isolated: all JS objects, globals, `require` cache, `process.env` copy (actually shared view by default — mutations are visible cross-thread unless you pass `env`), async hooks. Shared: the process itself (PID, fds at the OS level, `process.exit()` from *any* thread kills everything), C++ heap of some internals, and anything you explicitly share via `SharedArrayBuffer`.

```js
// worker-demo.js — the canonical structure, including the "same file" pattern
const { Worker, isMainThread, parentPort, workerData, threadId } = require('worker_threads');

if (isMainThread) {
  const worker = new Worker(__filename, {
    workerData: { n: 45 },                        // structured-cloned once at startup
    resourceLimits: {                             // per-isolate memory caps!
      maxOldGenerationSizeMb: 256,                // worker OOMs alone, not the process
      maxYoungGenerationSizeMb: 32,
    },
  });
  worker.on('message', (msg) => console.log('result:', msg));
  worker.on('error', (err) => console.error('worker threw:', err));   // uncaught error in worker
  worker.on('exit', (code) => {
    if (code !== 0) console.error(`worker died with code ${code}`);   // 1 = error, also OOM
  });
} else {
  function fib(n) { return n < 2 ? n : fib(n - 1) + fib(n - 2); }     // deliberately CPU-bound
  parentPort.postMessage({ threadId, result: fib(workerData.n) });
}
```

Details that signal depth:
- `resourceLimits` gives per-worker heap caps — a worker hitting its limit dies with `ERR_WORKER_OUT_OF_MEMORY` and an `'exit'` code, while the main thread survives. This is the only in-process memory isolation Node offers.
- A worker keeps the process alive (it's a ref'd handle) unless you `worker.unref()`.
- `process.exit()`, `process.chdir()`, signal handlers: process-wide. Calling `process.exit()` in a worker is a footgun that kills the server.
- `execArgv` lets you give workers different V8 flags than the main thread.

---

### Q3. What crosses `postMessage`? Explain structured clone, its cost, and what can't be sent.

**Answer:**
`postMessage(value)` **structured-clones** the value: a deep copy using V8's serializer (same algorithm as browsers). Supports: plain objects, arrays, Map/Set, Date, RegExp, ArrayBuffer/TypedArrays, Error objects, BigInt, circular references (unlike JSON). Does **not** support: functions, class instances (they arrive as plain objects — prototype is lost), symbols, WeakMap, sockets/streams (but see MessagePort transfer, Q5).

Cost model (the thing to internalize): serialization is **O(size of object graph), on both sides, on the respective event loops.** Cloning a 100 MB object blocks the sender's loop to serialize and the receiver's loop to deserialize. Real numbers on a typical modern core: V8 structured clone moves roughly 200–500 MB/s for buffer-heavy data and far less for object-heavy graphs (millions of small objects can take seconds).

```js
// Measuring the real cost — run this before designing a worker protocol.
const { Worker, isMainThread, parentPort } = require('worker_threads');

if (isMainThread) {
  const worker = new Worker(__filename);
  const big = { rows: Array.from({ length: 1_000_000 }, (_, i) => ({ id: i, v: Math.random() })) };
  const t0 = process.hrtime.bigint();
  worker.postMessage(big);                       // clone happens HERE, on the main loop
  console.log(`serialize+post: ${Number(process.hrtime.bigint() - t0) / 1e6} ms`); // often 300-800ms!
  worker.on('message', () => worker.terminate());
} else {
  parentPort.on('message', () => parentPort.postMessage('got it'));
}
```

**Interview trap:** "Offload JSON.parse of a giant payload to a worker." Cloning the parsed result back costs about as much as the parse did — you've moved the work, then paid it again on the main thread as deserialization. Correct designs: return a compact answer (aggregates, indices), transfer binary (Q4), share memory (Q6), or keep the data resident in the worker and query it there.

---

### Q4. What are transferable objects, and how do they change the cost model?

**Answer:**
Transferring **moves ownership** instead of copying: the underlying memory is handed to the receiver and the sender's object is **detached** (byteLength becomes 0; access throws). It's O(1) regardless of size — a pointer handoff.

Transferables in Node: `ArrayBuffer`, `MessagePort`, `FileHandle`, `X509Certificate`, WHATWG `ReadableStream`/`WritableStream`/`TransformStream`, `Blob`.

```js
const { Worker, isMainThread, parentPort } = require('worker_threads');

if (isMainThread) {
  const worker = new Worker(__filename);
  const buf = Buffer.alloc(512 * 1024 * 1024);         // 512 MB
  const ab = buf.buffer;                               // the underlying ArrayBuffer

  const t0 = process.hrtime.bigint();
  worker.postMessage({ ab }, [ab]);                    // 2nd arg = transfer list
  console.log(`transfer: ${Number(process.hrtime.bigint() - t0) / 1e6} ms`); // ~0.05 ms

  console.log(ab.byteLength);                          // 0 — detached, gone
  // buf.length is also 0 now; any read throws or yields nothing
} else {
  parentPort.on('message', ({ ab }) => {
    console.log('received', ab.byteLength);            // 536870912 — zero copies
    process.exit(0);
  });
}
```

Two traps with Buffers specifically:
1. **`Buffer.from('...')` and small `Buffer.allocUnsafe` slices sit in a shared 8 KB pool.** Transferring `buf.buffer` transfers the *whole pool*, detaching every other small Buffer that shares it — spooky action at a distance. Use `Buffer.alloc` (unpooled for ≥ half pool size) or copy the slice first when you intend to transfer.
2. `buf.byteOffset`/`buf.length` matter: send `{ ab, byteOffset: buf.byteOffset, length: buf.length }` and reconstruct with `Buffer.from(ab, byteOffset, length)` on the other side.

Pattern: **ping-pong buffer recycling** — the worker transfers the result buffer back, main thread refills and transfers it again. Zero allocation, zero copies, in steady state. This is how you build image/video pipelines in Node that keep up with native code.

---

### Q5. What is MessageChannel, and why would you use it instead of `parentPort`?

**Answer:**
`new MessageChannel()` creates two entangled `MessagePort`s. Whoever holds a port can `postMessage` to the holder of the other. Ports are themselves transferable — that's the superpower: you can build **direct topologies** that bypass the main thread.

```js
const { Worker, MessageChannel } = require('worker_threads');

// Direct worker<->worker pipe: main thread creates the channel, gives one
// port to each worker, then is OUT of the data path entirely.
const producer = new Worker('./producer.js');
const consumer = new Worker('./consumer.js');
const { port1, port2 } = new MessageChannel();
producer.postMessage({ port: port1 }, [port1]);
consumer.postMessage({ port: port2 }, [port2]);
// producer.js: parentPort.once('message', ({port}) => { port.postMessage(chunk, [chunk.buffer]) ... })
// consumer.js: parentPort.once('message', ({port}) => { port.on('message', handle) })
```

Other reasons to prefer dedicated channels over multiplexing everything on `parentPort`:
- **Per-request channels**: create a channel per job, transfer one port with the job; the reply comes back on that port — no request-ID bookkeeping, and closing the port signals cancellation.
- **Priority separation**: a control channel that isn't stuck behind a queue of bulk data messages.
- `port.unref()` per channel for lifecycle control; `receiveMessageOnPort(port)` for **synchronous** polling (used with Atomics.wait to build synchronous RPC from a worker — how `worker_threads`-based sync APIs like some SQLite bindings work).

**Interview trap:** ports start "ref'd" and keep the event loop alive; forgetting `port.close()` (or `unref()`) after a one-shot request leaks handles and can keep the process from exiting. Also: messages posted before the receiving side attaches a listener are queued, not lost — attaching the listener (or `port.start()`) begins delivery.

---

### Q6. Explain SharedArrayBuffer + Atomics. Build a lock-free counter and a blocking wait correctly.

**Answer:**
`SharedArrayBuffer` (SAB) is the one true shared memory: post it to a worker and both sides' TypedArrays view **the same physical memory**. No copies, instant visibility — and therefore data races, which is why plain reads/writes to shared memory need `Atomics`:

- `Atomics.add/sub/and/or/xor/exchange/compareExchange(ta, idx, val)` — atomic RMW operations.
- `Atomics.load/store` — sequentially-consistent reads/writes (also defeat torn reads on 64-bit `BigInt64Array`).
- `Atomics.wait(ta, idx, expectedValue, timeout)` — **blocks the thread** until notified (only allowed on worker threads and only on `Int32Array`/`BigInt64Array` over SAB; the main thread throws — it must use `Atomics.waitAsync`).
- `Atomics.notify(ta, idx, count)` — wakes waiters.

```js
const { Worker, isMainThread, workerData } = require('worker_threads');

if (isMainThread) {
  const sab = new SharedArrayBuffer(8);
  const shared = new Int32Array(sab);          // [0]=counter, [1]=done-flag
  const N = 4, PER = 1_000_000;

  let exited = 0;
  for (let i = 0; i < N; i++) {
    new Worker(__filename, { workerData: sab }).on('exit', () => {
      if (++exited === N) {
        console.log(Atomics.load(shared, 0));  // exactly 4000000 — with shared[0]++ it would be less (lost updates)
      }
    });
  }
} else {
  const shared = new Int32Array(workerData);
  for (let i = 0; i < 1_000_000; i++) Atomics.add(shared, 0, 1);  // atomic increment
}
```

Blocking rendezvous — the pattern behind sync-over-async bridges:

```js
// Worker side: request work, then BLOCK (zero CPU) until the other side answers.
// signal[0]: 0 = empty, 1 = response ready
function syncRequest(port, signal, payload) {
  Atomics.store(signal, 0, 0);
  port.postMessage(payload);
  const r = Atomics.wait(signal, 0, 0, 5000);   // sleep while signal[0] === 0
  if (r === 'timed-out') throw new Error('sync request timeout');
  const { message } = require('worker_threads').receiveMessageOnPort(port); // sync drain
  return message;
}
// Responder side (must be a DIFFERENT thread — you can't wait and notify yourself):
//   port.on('message', async (req) => {
//     const res = await handle(req);
//     port.postMessage(res);
//     Atomics.store(signal, 0, 1);
//     Atomics.notify(signal, 0, 1);
//   });
```

Rules of engagement: use SAB for **numeric state** (counters, ring buffers, bitmap flags, progress) and encode structured data manually (e.g., a length-prefixed byte ring buffer with head/tail indices maintained via Atomics). There is no shared JS object graph — no shared strings, objects, Maps. If you find yourself building an object database in a SAB, you want a real approach (keep data in one worker, or use a native store).

**Production war story:** A team built a rate limiter with a plain `Int32Array` over SAB using `arr[0]++` from 8 workers, "because increments are tiny." `arr[0]++` is read-modify-write as three operations; under load ~3–5% of increments were lost, so the limiter allowed more traffic than configured — discovered only when a downstream partner complained about being over-called. One-line fix: `Atomics.add`. Plain ops on shared memory are never atomic, even "single" JS operators.

---

### Q7. Build a worker pool from scratch (the piscina pattern): queueing, round-trip correlation, error handling, worker replacement.

**Answer:**
Never spawn a worker per task — startup is ~10 ms + megabytes, and unbounded spawning under load is self-DDoS. Pool pattern: N long-lived workers (N ≈ cores − 1), a task queue, and promise plumbing.

```js
// pool.js — a real minimal pool: ~80 lines, interview-whiteboardable.
const { Worker } = require('worker_threads');
const os = require('os');

class WorkerPool {
  constructor(workerFile, size = Math.max(1, os.availableParallelism() - 1)) {
    this.workerFile = workerFile;
    this.size = size;
    this.idle = [];                    // workers ready for a task
    this.queue = [];                   // { payload, transferList, resolve, reject }
    this.busy = new Map();             // worker -> current task (for crash attribution)
    for (let i = 0; i < size; i++) this._spawn();
  }

  _spawn() {
    const worker = new Worker(this.workerFile);
    worker.on('message', (msg) => {
      const task = this.busy.get(worker);
      this.busy.delete(worker);
      msg.ok ? task.resolve(msg.value) : task.reject(deserializeError(msg.error));
      this._checkQueue(worker);
    });
    worker.on('error', (err) => {      // worker crashed (uncaught throw / OOM / native crash)
      const task = this.busy.get(worker);
      this.busy.delete(worker);
      if (task) task.reject(err);      // fail the in-flight task, don't retry blindly
      this._removeAndReplace(worker);  // a crashed worker's state is suspect: replace it
    });
    worker.on('exit', (code) => {
      if (code !== 0 && !this.destroyed) this._removeAndReplace(worker);
    });
    this.idle.push(worker);
    return worker;
  }

  _removeAndReplace(worker) {
    const i = this.idle.indexOf(worker);
    if (i !== -1) this.idle.splice(i, 1);
    worker.removeAllListeners();
    worker.terminate().catch(() => {});
    if (!this.destroyed) this._spawn();          // self-healing: pool size is invariant
    this._checkQueue();
  }

  _checkQueue(freedWorker) {
    if (freedWorker) this.idle.push(freedWorker);
    while (this.idle.length && this.queue.length) {
      const worker = this.idle.pop();
      const task = this.queue.shift();
      this.busy.set(worker, task);
      worker.postMessage(task.payload, task.transferList);
    }
  }

  run(payload, transferList = []) {
    if (this.destroyed) return Promise.reject(new Error('pool destroyed'));
    return new Promise((resolve, reject) => {
      this.queue.push({ payload, transferList, resolve, reject });
      this._checkQueue();
    });
  }

  async destroy() {
    this.destroyed = true;
    this.queue.forEach(t => t.reject(new Error('pool destroyed')));
    this.queue.length = 0;
    await Promise.all([...this.idle, ...this.busy.keys()].map(w => w.terminate()));
  }
}

function deserializeError(e) {
  const err = new Error(e.message);
  err.stack = e.stack;
  err.name = e.name;
  return err;
}

module.exports = { WorkerPool };
```

```js
// task-worker.js — the worker side: never let a throw escape unserialized.
const { parentPort } = require('worker_threads');
const handlers = {
  hashPassword: async ({ password }) => require('crypto').scryptSync(password, 'salt', 64).toString('hex'),
  parseHuge: async ({ text }) => summarize(JSON.parse(text)),
};
parentPort.on('message', async (task) => {
  try {
    const value = await handlers[task.type](task);
    parentPort.postMessage({ ok: true, value });
  } catch (err) {                       // Errors don't structured-clone cleanly pre-v18 — flatten:
    parentPort.postMessage({ ok: false, error: { message: err.message, stack: err.stack, name: err.name } });
  }
});
```

What piscina adds over this that you should name-drop: task queue size limits (`maxQueue` — reject instead of buffering unboundedly, i.e., backpressure), per-task `AbortSignal` and timeouts, worker idle timeout (shrink the pool), `concurrentTasksPerWorker` (>1 for tasks that await I/O inside the worker), utilization metrics, and atomics-based fast wakeups. Sizing: **pool size × 100% CPU is the max** — for latency-sensitive servers leave 1 core for the main event loop; and queue depth is your load-shedding lever (queue latency = tasks_ahead × avg_task_time — expose it as a metric).

**Interview trap:** "Should the pool retry a task when a worker crashes?" Only if tasks are idempotent — the crash might have been *caused by that task* (poison message), and blind retry crashes the replacement worker in a loop, destroying the whole pool. Piscina rejects; you retry at a layer that knows about idempotency, with a retry cap and a dead-letter path.

---

### Q8. How does the cluster module distribute connections? Explain both scheduling modes and why round-robin is the default on Linux.

**Answer:**
`cluster.fork()` is `child_process.fork()` plus **listening-socket magic**. When a worker calls `server.listen(port)`, cluster intercepts it and asks the primary for the socket. Two modes:

1. **`SCHED_RR` (round-robin, default everywhere except Windows):** the **primary** owns the listening socket and accepts every connection, then sends each accepted connection handle to a worker over IPC, round-robin (skipping workers that appear busy). Even distribution, at the cost of the primary being on the accept path.
2. **`SCHED_NONE` (shared-socket):** the primary creates the listen socket and passes the *listening* handle to every worker; each worker calls `accept()` on the same socket, and **the kernel decides** who gets a connection. Problem: the kernel wakes whichever process is convenient — in practice a few workers get most connections (accept-mutex/thundering-herd effects; historically 70%+ of connections landing on 2 of 8 workers). That measured imbalance is *why* Node switched the default to round-robin in v0.12.

```js
const cluster = require('cluster');
const http = require('http');
const os = require('os');

if (cluster.isPrimary) {
  cluster.schedulingPolicy = cluster.SCHED_RR;   // or set env NODE_CLUSTER_SCHED_POLICY=rr|none
  const n = os.availableParallelism();
  for (let i = 0; i < n; i++) cluster.fork();

  cluster.on('exit', (worker, code, signal) => {
    console.error(`worker ${worker.process.pid} died (${signal || code})`);
    if (!worker.exitedAfterDisconnect) cluster.fork();   // crash => respawn; graceful => don't
  });
} else {
  http.createServer((req, res) => {
    res.end(`handled by ${process.pid}\n`);
  }).listen(3000);   // intercepted: no real bind happens here in RR mode
}
```

How the handle passing works under the hood: the IPC channel is a Unix domain socket, and fds are passed via `sendmsg()` with `SCM_RIGHTS` ancillary data (on Windows, `WSADuplicateSocket`). This is the same mechanism as `child.send(msg, socketHandle)` — you can hand any TCP socket or server handle to any child, which is how you'd build sticky sessions (primary sniffs something, routes the connection handle to a specific worker).

**SO_REUSEPORT** is the third option Node's cluster does *not* use (Node core added `reusePort` as a listen option only recently, Node 23+, and cluster doesn't use it): each process binds its own socket to the same port with `SO_REUSEPORT`, and the **kernel hashes the connection 4-tuple** to pick a socket — no primary in the data path, good distribution, and it's what nginx workers and many Go/Rust services use. Trade-offs vs RR: kernel hashing can't account for worker busyness, and rebinding during rolling restarts can drop SYNs queued for a dying socket.

**Interview trap:** "Does cluster share memory between workers?" No — full processes, full copies of your app (~30–50 MB+ each, plus per-process connection pools: 8 workers × 10 DB connections = 80 connections; pool sizing must account for this). Anything shared (sessions, caches, rate limits) must live outside (Redis) — in-memory caches in clustered apps are per-worker, which also means N× cold caches and inconsistent hit rates.

---

### Q9. child_process: spawn vs exec vs execFile vs fork. What are the buffer limits and injection risks?

**Answer:**

| | `spawn` | `exec` | `execFile` | `fork` |
|---|---|---|---|---|
| Runs via shell | No (unless `shell:true`) | **Yes** (`/bin/sh -c`) | No | No |
| Output | **Streams** | Buffered callback (string) | Buffered callback | Streams + **IPC channel** |
| Buffer limit | None (streaming) | `maxBuffer` default **1 MiB** — exceed = process killed, error | Same 1 MiB default | n/a |
| Injection risk | Safe (argv array) | **Command injection** if interpolating input | Safe | Safe |
| Use for | Long output, big data, long-lived processes | Quick shell one-liners with trusted input only | Run a binary, small output | Node child with message channel |

```js
const { spawn, exec, execFile, fork } = require('child_process');
const { pipeline } = require('stream/promises');

// SPAWN: the production default. Stream a 5 GB video through ffmpeg — constant memory.
async function transcode(inPath, outPath) {
  const ff = spawn('ffmpeg', ['-i', inPath, '-c:v', 'libx264', '-f', 'mp4', outPath], {
    stdio: ['ignore', 'ignore', 'pipe'],           // ignore stdin/stdout, capture stderr
  });
  let stderr = '';
  ff.stderr.on('data', (d) => { stderr = (stderr + d).slice(-8192); });  // keep tail only
  const [code, signal] = await new Promise((res) => ff.on('close', (c, s) => res([c, s])));
  if (code !== 0) throw new Error(`ffmpeg failed (${signal || code}): ${stderr}`);
}

// EXEC: fine for `git rev-parse HEAD`. CATASTROPHIC with user input:
exec(`convert ${userFilename} out.png`);            // userFilename = "x; rm -rf / #" => owned
execFile('convert', [userFilename, 'out.png']);     // safe: argv, no shell parsing

// FORK: Node child + IPC. Basis of cluster; useful for hard-isolated plugins.
const child = fork('./analytics-job.js', ['--mode=daily'], {
  execArgv: ['--max-old-space-size=2048'],          // child gets its own V8 flags
});
child.send({ cmd: 'start', date: '2026-07-04' });   // JSON-serialized over IPC (or advanced/V8 mode)
child.on('message', (m) => console.log('progress', m));
```

Numbers and failure modes to know:
- `exec`/`execFile` **`maxBuffer` default is 1024 × 1024 bytes**; a chatty command dies mid-run with `RangeError [ERR_CHILD_PROCESS_STDIO_MAXBUFFER]`. Classic prod bug: "the backup script works for small DBs and mysteriously fails at 1 MB of output." Either raise `maxBuffer` or (better) `spawn` and stream.
- If you don't consume a spawned child's stdout/stderr and used `'pipe'`, the **pipe buffer fills (~64 KB on Linux) and the child blocks on write** — it looks "hung." Consume, or use `'ignore'`/`'inherit'`.
- `detached: true` + `child.unref()` + `stdio: 'ignore'` = daemonize (survives parent exit, own process group; kill the whole tree with `process.kill(-pid)`).
- `'exit'` vs `'close'`: `'exit'` = process ended; `'close'` = stdio streams also finished. Read output until `'close'`.
- Zombie processes: Node reaps children automatically, but if PID 1 in a container is your Node app and *grandchildren* are orphaned, nobody reaps them — use `tini`/`--init` in Docker.

---

### Q10. Compare IPC costs quantitatively: worker postMessage vs child fork IPC vs SAB. How do you design the protocol so the boundary doesn't eat the win?

**Answer:**
Rough per-message cost hierarchy (order-of-magnitude, single modern core):

| Mechanism | Latency (small msg) | Throughput (large payload) | Notes |
|---|---|---|---|
| `Atomics` on SAB | ~50–200 **ns** | memory bandwidth (GB/s) | No serialization at all |
| Worker `postMessage` (transfer) | ~10–30 µs | O(1) per message — pointer move | Best for big binary |
| Worker `postMessage` (clone) | ~10–30 µs + clone | ~200–500 MB/s serialize + same to deserialize | Both loops pay |
| `child.send` (`serialization:'advanced'`, V8) | ~30–100 µs | similar clone cost + **pipe copy** through kernel | fork default is JSON |
| `child.send` (JSON default) | ~30–100 µs | JSON stringify+parse: slow for big graphs | Loses types (Date→string) |
| stdio pipe (raw bytes) | ~30–100 µs | ~1–3 GB/s | You design the framing |

The design rule: **the offloaded computation must cost meaningfully more than 2× the boundary crossing.** `fib(10)` in a worker is slower than inline — you pay microseconds of messaging for nanoseconds of work. Amortize:

1. **Batch**: send 10k rows per message, not 10k messages.
2. **Transfer, don't clone**: encode results into an `ArrayBuffer` (e.g., a Float64Array of numbers, or msgpack into a buffer) and transfer it.
3. **Ship references, not data**: send a file path / S3 key / SAB region descriptor; the worker reads the data itself.
4. **Keep state resident**: load the 2 GB dataset in the worker once; send queries (small) and answers (small) across.

```js
// Batched, transfer-based result: 1M floats cross the boundary in ~0 copies.
// worker: 
//   const out = new Float64Array(results.length);
//   results.forEach((v, i) => out[i] = v);
//   parentPort.postMessage(out.buffer, [out.buffer]);
// main:
//   worker.on('message', (ab) => { const scores = new Float64Array(ab); ... });
```

**Production war story:** A service moved bcrypt verification into a worker pool and *latency got worse*. Cause: they sent each request as its own message with a cloned user object (~4 KB) and got back a boolean — but they also set pool size = 16 on a 4-core box, so workers context-switched, and the main loop spent ~20% of its time serializing. Fixes: pool size 3 (cores − 1), message = `{ hash, password }` strings only, and — the real fix — bcrypt's own libuv-threadpool async mode with `UV_THREADPOOL_SIZE=8`, deleting the pool entirely. Measure the boundary before building around it.

---

### Q11. PM2 vs cluster module vs Kubernetes replicas — how do you scale Node across cores in 2026, and what does each layer actually give you?

**Answer:**

| | Raw `cluster` | PM2 (cluster mode) | k8s replicas (1 proc/pod) |
|---|---|---|---|
| Process supervision | You write it (respawn, backoff) | Built-in (restarts, `max_memory_restart`) | kubelet + probes |
| Load balancing | Primary RR over IPC | Same (PM2 God process uses cluster) | kube-proxy/Service (L4) or ingress (L7) |
| Zero-downtime deploy | You write it (rolling fork/disconnect) | `pm2 reload` (one-by-one worker cycling) | RollingUpdate strategy |
| Blast radius | One process crash contained | Same + God-process risk | Pod-level; node-level spread |
| Resource isolation between instances | None (same host) | None | cgroups: CPU/memory limits per pod |
| Sticky sessions | DIY handle routing | Not really | Ingress/ALB cookie stickiness |
| Observability | DIY | `pm2 monit`, logs merging | Prometheus/otel, per-pod metrics |
| Where it fits | Library/appliance authors | Bare VMs, small deployments | Anything already on k8s |

The senior take: **in containers, don't cluster.** Run one Node process per container with `--max-old-space-size` sized to the pod limit, and scale with replicas. Reasons:
- The orchestrator already does supervision, health-checking, rolling deploys, and *placement across machines* — cluster only scales within one machine.
- One process per pod = clean per-instance metrics/limits; a clustered pod hides which worker is sick, and the pod's memory limit is shared by N heaps unpredictably.
- CPU limits interact badly with in-pod clustering: 8 cluster workers in a pod limited to 2 CPUs just multiplies context switching and per-process overhead. (Also check `availableParallelism()` vs cgroup quota — Node sees the host's cores, not your limit, so "fork per CPU" over-forks in containers.)

PM2 remains legitimately useful on raw VMs/bare metal where you have no orchestrator: `pm2 start app.js -i max` + `pm2 reload` gives you multi-core + zero-downtime deploys in two commands. Know its mechanics: PM2's daemon ("God process") is the cluster primary; `pm2 reload` cycles workers one at a time (sends shutdown message, waits `kill_timeout` default 1600 ms, forks replacement). If your graceful shutdown takes longer than `kill_timeout`, PM2 SIGKILLs you mid-request — a very common misconfiguration.

**Interview trap:** "cluster gives zero-downtime deploys for free." No — you must implement it: fork new workers running new code, wait for them to listen, then `worker.disconnect()` old ones (stops accepting, keeps serving in-flight), with a timeout + kill. `exitedAfterDisconnect` distinguishes your graceful kills from crashes so your respawn logic doesn't resurrect old-code workers.

---

### Q12. Graceful shutdown in a clustered/orchestrated Node server: write the primary and worker logic.

**Answer:**
The contract: stop taking new work, finish in-flight work within a deadline, then exit. In k8s the sequence is: pod marked terminating → removed from endpoints (async! traffic still arrives briefly) → SIGTERM → grace period (default 30 s) → SIGKILL.

```js
// worker.js — the part that runs in each worker/pod process.
const http = require('http');

const server = http.createServer(app);
server.keepAliveTimeout = 65_000;      // see file 06 — must exceed LB idle timeout
server.listen(3000);

const sockets = new Set();             // track sockets so we can end idle keep-alives
server.on('connection', (s) => { sockets.add(s); s.on('close', () => sockets.delete(s)); });

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal}: draining`);

  // 1. Fail the readiness probe so the LB stops sending traffic.
  healthState.ready = false;

  // 2. Small delay: endpoint removal propagates asynchronously in k8s.
  await new Promise(r => setTimeout(r, 5000));

  // 3. Stop accepting; existing connections keep being served.
  server.close(() => console.log('all connections closed'));

  // 4. Tell idle keep-alive sockets to finish: Node >=18.2 does this in
  //    server.close(); for belt and braces, close idle connections explicitly.
  if (server.closeIdleConnections) server.closeIdleConnections();

  // 5. Deadline: whatever is still open after 20s gets destroyed.
  const deadline = setTimeout(() => {
    console.warn(`force-closing ${sockets.size} sockets`);
    for (const s of sockets) s.destroy();
  }, 20_000);
  deadline.unref();

  // 6. Wait for close, then release shared resources in dependency order.
  await new Promise(res => server.on('close', res));
  await db.end();            // after HTTP: requests may still need the DB while draining
  await queueConsumer.stop();
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

Cluster-primary version of the same idea: on SIGTERM, `for (const id in cluster.workers) cluster.workers[id].disconnect()` with a per-worker kill timer; `disconnect()` closes the IPC channel and the shared server handle in that worker, so `server.close` semantics apply per worker.

**Interview trap:** `server.close()` alone historically did **not** end idle keep-alive connections — it only stops *new* connections and waits for existing ones, and an idle keep-alive socket counts as existing, so shutdown hung until `keepAliveTimeout`. Node 18.2+ closes idle connections in `close()`, and added `closeIdleConnections()`/`closeAllConnections()` for explicit control. If your Node predates that, you need the socket-tracking shown above. Also: in Docker, make sure your app is PID 1 (or under `--init`) and not wrapped by a shell — `sh -c "node app.js"` swallows SIGTERM and your graceful shutdown never runs; you get SIGKILLed at the grace deadline.

---

### Q13. When do worker threads NOT help? Give concrete anti-patterns.

**Answer:**
1. **I/O-bound work.** `await fetch()` in a worker gains nothing — the main loop wasn't blocked by waiting. You added thread startup + message costs to hide zero milliseconds of blockage.
2. **Tiny CPU tasks.** Boundary ≈ 20–60 µs round trip + clone. Work under ~1 ms is usually net-negative; batch or keep inline.
3. **Data-heavy in, data-heavy out with cloning.** If input+output clone time ≥ compute time, you've doubled the main-loop cost (Q3). Transfer/share or don't bother.
4. **"Parallelize" code that holds the GIL-equivalent — a shared native resource.** E.g., 8 workers all hitting the same SQLite file with a single write lock: you parallelize the queueing, not the work.
5. **More workers than cores for pure-CPU tasks.** 16 workers on 4 cores = same throughput, worse latency (context switches), more memory. Pool = `availableParallelism() - 1`.
6. **Using workers to "fix" a sync API you could avoid.** `JSON.parse` of a 200 MB string in a worker still needed the 200 MB string cloned in; the actual fix is streaming parse or a different format.
7. **Memory-bound workloads.** N workers each loading the dataset = N× memory; you'll OOM before you saturate CPU. Share via SAB or partition the data.

Quick litmus test to state in the interview: *profile first* — if event-loop utilization/lag shows the loop blocked by compute (`perf_hooks.monitorEventLoopDelay`, ELU), workers help; if the loop is idle and requests are slow, the bottleneck is I/O and workers are cargo cult.

---

### Q14. How do you detect that the event loop is blocked, and route around it with a worker, end to end?

**Answer:**

```js
const { monitorEventLoopDelay, performance } = require('perf_hooks');

// 1. DETECT: event-loop delay histogram (timer-based, cheap, prod-safe)
const h = monitorEventLoopDelay({ resolution: 20 });
h.enable();
setInterval(() => {
  const p99ms = h.percentile(99) / 1e6;
  metrics.gauge('eventloop.p99_ms', p99ms);
  if (p99ms > 100) console.warn(`event loop p99 delay ${p99ms.toFixed(1)}ms`);
  h.reset();
}, 10_000).unref();

// 2. ATTRIBUTE: Event Loop Utilization tells you busy-vs-idle ratio;
//    ELU near 1.0 with low req throughput = CPU-bound handler somewhere.
let last = performance.eventLoopUtilization();
setInterval(() => {
  const elu = performance.eventLoopUtilization(last);
  metrics.gauge('eventloop.utilization', elu.utilization);   // 0..1
  last = performance.eventLoopUtilization();
}, 10_000).unref();
```

Then find the culprit with `--cpu-prof` / clinic flame (file 05), and offload it via the pool from Q7:

```js
// Before: 300ms of zlib+templating per report request => p99 explodes for ALL routes.
// app.get('/report', (req, res) => res.send(renderHugeReport(data)));

// After:
const { WorkerPool } = require('./pool');
const pool = new WorkerPool('./report-worker.js');
app.get('/report', async (req, res, next) => {
  try {
    const buf = await pool.run({ type: 'render', params: req.query });
    res.type('application/pdf').send(Buffer.from(buf));
  } catch (err) { next(err); }
});
```

The narrative for the interviewer: a blocked loop is a **shared-fate** failure — one heavy request adds its full compute time to the latency of *every* concurrent request, because they're all waiting for the same loop. That's why 50 ms of sync work at 100 rps is a disaster (loop is busy 5 s/s — beyond saturation) while the same work in a pool is invisible. Event-loop delay and ELU are the two metrics that make this visible; every serious Node service graphs at least one of them.

---

### Q15. Rapid-fire: `process.send` availability, `serialization: 'advanced'`, worker `stdout`, `execArgv` inheritance, `windowsHide` — one-liners a senior should know.

**Answer:**
- **`process.send` exists only when spawned with an IPC channel** (`fork`, or `spawn` with `'ipc'` in stdio). In cluster workers it's how `server.listen` negotiates handles. Check `if (process.send)` before using; it's `undefined` in a normally-started process.
- **`serialization: 'advanced'`** on `fork`/`spawn` switches IPC from JSON to the V8 structured-clone serializer: Buffers, Dates, Maps, circular refs survive; slightly slower for tiny flat objects, far better for rich ones. Both sides must be Node ≥ 11ish (same-app, so fine).
- **Worker stdout/stderr are, by default, piped to the parent's** — `console.log` in a worker just works. With `stdout: true` in options you get `worker.stdout` as a stream to consume yourself (e.g., prefix with threadId).
- **Workers inherit `execArgv`** (the `--flags`) from the parent unless overridden — including `--inspect`, which historically caused port-collision crashes when workers tried to bind the same debug port; pass `execArgv: []` or per-worker `--inspect-port` when debugging pools.
- **`windowsHide: true`** (child_process): suppresses the console window flash on Windows for GUI-less children — irrelevant on Linux, an instant "has shipped cross-platform tooling" signal.
- **`worker.terminate()` returns a promise** and is abrupt (no 'exit' handlers inside the worker in the sense of cleanup guarantees); design workers to be killable — idempotent tasks, no critical state held only in a worker.
- **`cluster.fork()` copies `process.env`** at fork time; changing primary env later doesn't propagate. Per-worker config goes in `cluster.fork({ WORKER_ROLE: 'consumer' })`.
