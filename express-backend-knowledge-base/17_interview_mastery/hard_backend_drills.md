# Hard Backend Drills — Node/Express/Distributed Systems

The questions that filter senior candidates: event-loop internals under load, Redis atomicity, transaction isolation, distributed locks, delivery guarantees, and debugging scenarios. Each answer is written the way you should *say* it — mechanism first, then implications.

## Table of Contents
1. [Node.js Internals Under Fire](#node)
2. [Redis Hard Questions](#redis)
3. [Postgres: Isolation, Locking & Indexes](#postgres)
4. [Distributed Systems Drills](#distributed)
5. [API & Express Edge Cases](#express)
6. [Debugging Scenarios (Walkthrough Format)](#debugging)

---

<a name="node"></a>
## 1. Node.js Internals Under Fire

**Q: Order the event loop phases and say what actually runs in each.**
timers (`setTimeout`/`setInterval` callbacks) → pending callbacks (deferred system-level, e.g. some TCP errors) → poll (I/O callbacks; blocks here waiting for I/O when idle) → check (`setImmediate`) → close callbacks. Between *every* callback, Node drains **microtasks**: first the `process.nextTick` queue, then the promise queue — entirely, before touching the next macrotask. That's why a recursive `nextTick` starves I/O but a recursive `setImmediate` doesn't (it yields per loop iteration).

**Q: `setTimeout(fn, 0)` vs `setImmediate(fn)` — which fires first?**
From the main script: **non-deterministic** — the timer needs ≥1ms to be eligible; depends on process startup time. From inside an I/O callback: **`setImmediate` always wins** — you're in the poll phase and check comes right after, while timers must wait for the next loop pass. Explaining *why* is the whole answer.

**Q: The event loop is single-threaded — so how does Node do 10K concurrent connections? And what IS on other threads?**
Sockets are multiplexed by the OS (epoll/kqueue/IOCP) — network I/O costs no threads. The **libuv threadpool** (default 4, `UV_THREADPOOL_SIZE`, max 1024) handles what can't be done async at the OS level: `fs.*`, `dns.lookup`, `crypto.pbkdf2`/`scrypt`, zlib. Consequence: 4 concurrent `bcrypt.hash` calls saturate the pool and *file reads start queueing behind password hashing* — a classic hidden coupling. `dns.lookup` (used by default in http requests for name resolution) going through the pool means threadpool exhaustion can look like "network is slow."

**Q: How do you *detect* event-loop blocking in production, not just avoid it?**
Event-loop delay histogram: `perf_hooks.monitorEventLoopDelay()` — p99 lag is the metric; alert above ~100ms. Or event-loop utilization (`performance.eventLoopUtilization()`) which distinguishes busy from idle. Find the culprit: `--cpu-prof` / clinic flame / 0x flamegraphs. Common causes: `JSON.parse/stringify` of multi-MB payloads (it's sync!), catastrophic regex backtracking (ReDoS — `(a+)+$` against 'aaaa…b'), sync crypto, big array sorts, `console.log` of huge objects.

**Q: Explain backpressure in streams — what breaks without it?**
`writable.write()` returns `false` when the internal buffer exceeds `highWaterMark`; you must stop writing until `'drain'`. Ignore it and the buffer grows unboundedly in memory (reading a 2GB file and writing to a slow client → 2GB RSS). `pipe()`/`pipeline()` handle it automatically — hand-rolled `.on('data', chunk => res.write(chunk))` does not (`data` doesn't pause). `pipeline()` also propagates errors and destroys all streams — `pipe()` leaks the source stream on destination error, the classic file-descriptor leak.

**Q: A request handler throws inside a `setTimeout` — does your Express error middleware catch it?**
No. Express's try/catch wraps the synchronous call chain; a callback scheduled for a later tick throws outside it → `uncaughtException` → process policy applies. Same historical problem with async handlers in Express 4 (rejections must go to `next(err)`; Express 5 forwards awaited rejections). Process-level: `unhandledRejection`/`uncaughtException` handlers should log + flush + **exit** (state may be corrupt); the supervisor (k8s, PM2) restarts. Keeping the process alive after an uncaught exception is the wrong answer.

**Q: `cluster` vs `worker_threads` vs containers — when each?**
`cluster`/multiple processes: scale *I/O-bound HTTP* across cores — separate heaps, OS/parent distributes connections; in k8s you usually skip cluster and run 1 process/pod, scaling with replicas (finer-grained scheduling, cleaner failure isolation). `worker_threads`: *CPU-bound work inside one service* — shared memory possible (SharedArrayBuffer/transferable ArrayBuffers avoid copying), cheaper than processes, but each thread still has its own V8 isolate + event loop (no shared JS objects). Know that `require('worker_threads')` parallelism doesn't help I/O at all — the main loop already does that.

**Q: How does `async/await` actually schedule?**
`await x` suspends the function and enqueues resumption as a promise microtask when x settles. Everything after `await` runs on the microtask queue — meaning an async function that awaits already-resolved promises in a tight loop still yields to *microtasks* but never to *I/O* (macrotasks). CPU-heavy loops need explicit yields (`await setImmediate()` via timers/promises) to let the poll phase run.

---

<a name="redis"></a>
## 2. Redis Hard Questions

**Q: Redis is single-threaded — why is it fast, and when does the single thread bite you?**
In-memory data + no lock contention + epoll multiplexing + O(1)/O(log n) structures; network and (in Redis 6+) I/O parsing can use threads, but *command execution* is one thread. It bites on O(n) commands: `KEYS *` (use `SCAN`), `SMEMBERS`/`LRANGE 0 -1` on huge collections, `DEL` of a multi-GB hash (use `UNLINK` — async free), big pipeline of `MGET`s, slow Lua. One 500ms command = 500ms of *global* pause — every client. `SLOWLOG` + `latency doctor` are the tools.

**Q: Implement "check then set" safely — e.g., decrement stock but never below zero.**
Anything read-then-write across two round trips races. Options ranked: (1) **Lua script** — `GET`, branch, `DECRBY` atomically on the server; (2) `WATCH stock / MULTI / EXEC` — optimistic, retry loop on conflict, degrades under contention; (3) restructure to a single atomic command: `DECRBY` then compensate if negative (visible window — usually unacceptable). Say Lua first; mention that BullMQ, rate limiters, and locks all reduce to "Lua because branching atomicity."

**Q: Design a correct distributed lock on Redis. Then tell me why it's still not fully safe.**
Acquire: `SET lock:resource <randomToken> NX PX 30000` — NX for mutual exclusion, PX so a crashed holder can't deadlock, random token to identify the owner. Release: **Lua** — `if GET == token then DEL` (an unconditional DEL lets a slow client delete the *next* holder's lock after its own expired). Why still unsafe: the lease can expire while the holder is paused (GC/CPU stall) → two holders. TTL renewal (watchdog) shrinks but can't close the window — a pause can outlast any renewal. Full fix = **fencing tokens**: monotonically increasing lock number checked by the *resource* (storage rejects writes with stale tokens). Redlock (quorum over N independent Redis nodes) addresses Redis-failover lock loss but not the pause problem — citing Kleppmann vs antirez here is strong. Practical close: "for efficiency locks (avoid duplicate work) Redis SET NX is fine; for *correctness* locks, put the invariant in the database (unique constraint, conditional update), not in a lock."

**Q: Cache stampede — 10K req/s and the hot key just expired. What happens and what do you do?**
All misses simultaneously recompute → database hammered → latency spike or outage (dogpile). Defenses, combinable: **per-key mutex** (`SET lock NX` — one recomputes, rest serve stale or wait briefly); **stale-while-revalidate** (serve expired value, refresh in background); **probabilistic early expiration** (XFetch: each request refreshes early with probability increasing near TTL — desynchronizes recomputes); jittered TTLs (prevents *many keys* expiring together after a mass warm); for the truly-hot single key, refresh by a cron, never by request path.

**Q: Cache-aside vs write-through vs write-behind — and the subtle inconsistency in cache-aside.**
Cache-aside (lazy load on miss, invalidate on write) is the default. The subtle race: reader misses → reads DB (old value) → *writer updates DB + deletes cache* → reader sets cache with its stale read → stale forever until TTL. Low probability (needs the read to straddle the write) but real at scale — mitigations: short TTLs as backstop, delete-then-delay-delete ("double delete"), or versioned keys. Also: **delete** on write, don't *update* the cache (two writers updating cache out of DB-commit order = persistent inconsistency; delete is always safe).

**Q: Redis as a cache vs as a datastore — what config changes?**
Cache: `maxmemory` + `allkeys-lru`/`lfu` eviction, persistence optional. Datastore/queue (BullMQ!): `noeviction` (eviction silently deletes your data/jobs), AOF `everysec` (RDB-only loses the last snapshot interval), replication + Sentinel/Cluster — and accept that failover with async replication can lose acknowledged writes (last ~replication-lag of them). One Redis serving both roles with one eviction policy is a misconfiguration interviewers love to probe.

---

<a name="postgres"></a>
## 3. Postgres: Isolation, Locking & Indexes

**Q: Two concurrent transactions both read balance=100 and both write balance-50. Under READ COMMITTED, what's the final balance and why?**
Can be 50 — the lost update. READ COMMITTED takes a fresh snapshot per statement but plain `SELECT` takes no lock; both compute 100−50 and the second `UPDATE` overwrites. Fixes ranked: (1) atomic single statement `UPDATE ... SET balance = balance - 50 WHERE id=$1 AND balance >= 50` (row-locked during update, expression evaluated on current value); (2) `SELECT ... FOR UPDATE` (pessimistic); (3) `REPEATABLE READ`/`SERIALIZABLE` — the second txn aborts with a serialization error you must **retry in application code** (the part most candidates omit); (4) optimistic version column (`WHERE version = $expected`, check rowCount).

**Q: What does SERIALIZABLE actually protect that REPEATABLE READ doesn't?**
Write skew and other serialization anomalies. Canonical example: on-call constraint "≥1 doctor on call"; two doctors each check `count ≥ 2` then remove themselves — both commit under RR (they wrote *different* rows; no lost update) leaving zero. SSI (serializable snapshot isolation) tracks read/write dependencies and aborts one. Postgres RR = snapshot isolation: no dirty/non-repeatable reads, no lost updates, but write skew survives.

**Q: Query is slow. `EXPLAIN ANALYZE` shows a Seq Scan despite an index. Give four distinct reasons.**
(1) Selectivity — reading >5–10% of the table, seq scan is genuinely cheaper; (2) function/type mismatch defeats the index (`WHERE lower(email)=...` needs an expression index; `text_col = 123` casts the column); (3) stale statistics after bulk load → `ANALYZE`; (4) leading-column rule: index on `(a,b)` is useless for `WHERE b=...` alone. Bonus: `LIKE '%foo'` (no prefix), or the planner's cost settings (default `random_page_cost=4` is wrong for SSDs).

**Q: Why did adding an index make writes slower AND that same query not faster?**
Every index is a separate structure maintained on each INSERT/UPDATE (and it can disable HOT updates — an UPDATE touching an indexed column rewrites index entries too). If the query still filters mostly by a non-leading or low-selectivity column, the index buys nothing. Index design is workload design: composite in filter-then-sort order, partial indexes (`WHERE deleted_at IS NULL`) for hot subsets, covering (`INCLUDE`) for index-only scans.

**Q: What is MVCC, and what maintenance debt does it create?**
Writers make new row versions instead of overwriting; readers use snapshots (xmin/xmax visibility) — readers never block writers and vice versa. Debt: dead tuples accumulate → **VACUUM** reclaims them; autovacuum falling behind ⇒ table/index bloat and, at the extreme, transaction-ID wraparound (forced shutdown). Long-running transactions pin old snapshots and block cleanup — "why is our DB bloating" is often "someone holds a 6-hour idle-in-transaction connection."

**Q: You need to add a NOT NULL column with a default to a 500M-row table, online. Plan it.**
Modern PG: `ADD COLUMN ... DEFAULT ...` is metadata-only (non-volatile defaults, PG11+) — fast. The dangerous parts: (a) adding the NOT NULL *constraint* historically required a full scan — do `ADD CONSTRAINT ... NOT VALID` then `VALIDATE CONSTRAINT` (scan without exclusive lock); (b) any `ALTER TABLE` takes an ACCESS EXCLUSIVE lock momentarily — if it queues behind a long query, *everything* queues behind it → set `lock_timeout` and retry; (c) index creation → `CREATE INDEX CONCURRENTLY`. General migration shape: expand → backfill in batches → validate/flip → contract, each step deploy-compatible with the previous.

---

<a name="distributed"></a>
## 4. Distributed Systems Drills

**Q: Service A must update its DB and notify service B. Design it so neither is lost, without 2PC.**
Transactional **outbox**: business write + outbox row in one local transaction; a relay (poller or CDC/WAL-tailing e.g. Debezium) publishes outbox rows to the broker, marking them sent. Relay crash → re-publish → **at-least-once** → consumer idempotency (processed-message table keyed by message ID, checked in the consumer's own transaction). This trio — outbox + at-least-once + idempotent consumer — is the answer template for every "atomically do X and publish Y" question.

**Q: Why is exactly-once delivery impossible, and what do systems that claim it actually do?**
Ack loss is indistinguishable from processing failure (Two Generals): sender must choose re-send (duplicate risk) or not (loss risk). "Exactly-once" products deliver at-least-once + dedup at the boundary: Kafka's idempotent producer (sequence numbers per partition) + transactions (atomic produce+offset-commit, *within Kafka only* — the moment you write to an external DB, you're back to outbox/idempotency); SQS FIFO's 5-minute dedup window. Effects-exactly-once is an *end-to-end* property you build, not a broker feature you buy.

**Q: Design an idempotency-key system for a payment POST endpoint.**
Client sends `Idempotency-Key` (UUID per logical operation, retried verbatim). Server: atomically claim the key (`INSERT ... ON CONFLICT DO NOTHING` with state=in_progress, or Redis SET NX with TTL) — the claim must be atomic or two concurrent retries both execute. If claimed & completed → replay stored response (status+body). If in_progress → 409/425 (retry later), don't run twice concurrently. Store: key, request hash (reject same key + different body — client bug), response, TTL ~24h. Subtlety: the operation and the "completed" marker must commit together (same DB txn), or a crash between them re-runs the payment — same crash-window reasoning as queues.

**Q: CAP in 30 seconds, then say why PACELC matters more day-to-day.**
During a network **partition**, a distributed store chooses: serve possibly-stale/divergent data (AP) or refuse/wait (CP). Not a 3-pick-2 triangle — P isn't optional; partitions happen. PACELC adds the *else*: even without partitions you trade **latency vs consistency** (sync replication = slow writes; async = fast but failover loses tail writes). Day-to-day engineering is the ELC part: choosing read-replica staleness, quorum settings, region topology.

**Q: A user updates their profile, then immediately GETs it from a read replica and sees old data. Fix options?**
Read-your-writes consistency: (1) read-after-write pinning — route that user's reads to primary for N seconds after a write (session sticky or a "last write LSN" cookie compared against replica replay position); (2) client-side: update local state from the write response, don't refetch; (3) synchronous replication for that table (latency cost); (4) monotonic reads at minimum (same replica per session) so data doesn't flicker old↔new. Naming "read-your-writes" and "monotonic reads" as distinct guarantees is the signal.

**Q: Rate limiter for a 20-instance API — compare algorithms and give the Redis implementation shape.**
Local counters undercount 20×; needs shared state. Fixed window (INCR + EXPIRE — 2× burst at boundary), **sliding window log** (ZADD timestamp, ZREMRANGEBYSCORE old, ZCARD — exact, O(limit) memory/key), sliding window counter (two-window interpolation — cheap, near-exact, the practical default), **token bucket** (bursts up to capacity + steady refill — refill computed lazily from last-refill timestamp; needs Lua for read-modify-write atomicity). Mention: fail-open vs fail-closed when Redis is down (rate limiter outage shouldn't take the API down — usually fail-open + alert), and returning `Retry-After`/`X-RateLimit-*`.

**Q: Saga vs 2PC for an order → payment → inventory → shipping flow.**
2PC holds locks across services awaiting a coordinator — a blocking protocol; coordinator crash freezes participants; nobody runs it across microservices. Saga: sequence of local transactions, each publishing the next step; failures trigger **compensating transactions** backwards (refund, restock). Orchestration (central state machine — explicit, debuggable, my default) vs choreography (event-chain — decoupled, but the flow lives nowhere and cycles hide). Key admission that scores points: sagas are *eventually* consistent — intermediate states are externally visible (order "pending-payment"), so the domain must model them, and compensations can themselves fail → retries + DLQ + human escalation path.

---

<a name="express"></a>
## 5. API & Express Edge Cases

**Q: Middleware calls `next()` and *also* writes to `res` later — what happens? And what does "Cannot set headers after they are sent" actually mean?**
Headers commit on first byte flushed. The error = a second `res.writeHead`/implicit header write after commit — typical causes: calling `next()` after `res.json()` (double handling), two code paths both responding (missing `return` before `res.send` in a guard), async callback responding after a timeout path already did. Fix pattern: single-response discipline — `return res.status(...)` everywhere, or check `res.headersSent` in late error handlers (Express's default error handler does exactly this and delegates to connection teardown).

**Q: How does Express know a middleware is an error handler?**
Arity. Four parameters `(err, req, res, next)` — Express literally checks `fn.length === 4`. A "why is my error middleware never called" bug is often a three-arg function or one declared before the routes. Error handlers must come after routes; `next(err)` skips all remaining non-error middleware.

**Q: What DoS vectors does a default Express app have?**
Unbounded JSON bodies (`express.json({ limit })` — default 100kb, but people raise it blindly; a 50MB JSON.parse is a sync event-loop stall = ReDoS-equivalent), ReDoS in validation regexes, **slowloris** (clients trickling bytes hold sockets — `server.headersTimeout`/`requestTimeout` in Node 18+ default sanely; know they exist), zip bombs on upload endpoints, `qs` extended parsing of deeply-nested query strings (parameter-limit), and missing pagination caps (`?limit=1000000` → OOM via one query). "Body limit + timeouts + pagination caps + regex discipline" is the checklist answer.

**Q: Graceful shutdown of an Express pod — exact sequence.**
On SIGTERM: (1) fail readiness probe / deregister from LB so no new traffic routes (there's propagation lag — keep serving briefly); (2) `server.close()` — stops accepting, lets in-flight requests finish (note: it does NOT terminate idle keep-alive sockets holding the close — Node 18's `server.closeIdleConnections()`, or track sockets); (3) close BullMQ workers (`worker.close()`), drain DB pools, flush logs/telemetry; (4) exit before the grace period (k8s default 30s) or SIGKILL corrupts step 3. Also: `keepAliveTimeout` must exceed the LB's idle timeout or the LB reuses a socket the app just closed → intermittent 502s — a *very* high-signal detail.

---

<a name="debugging"></a>
## 6. Debugging Scenarios (Walkthrough Format)

**"p99 latency is 30s but p50 is 40ms. Go."**
Bimodal = a queue somewhere, not slow code. Suspects in order: (1) **DB pool exhaustion** — requests wait for a connection (pool wait-time metric; caused by leaked connections from missed `client.release()` in error paths, or a few slow queries hogging the pool); (2) event-loop stalls from occasional huge payloads (loop-lag histogram correlated with the slow requests); (3) GC pauses (old-space pressure — heap stats); (4) cold anything (DNS, TLS to a dependency, lambda-style cold starts); (5) retry storms hiding downstream 5xx (one request = 3×10s timeouts). Method: distributed trace one slow request — the gap between spans tells you *which wait* it is.

**"Memory grows 50MB/hour until OOM. Go."**
Take two heap snapshots an hour apart, diff retained objects. Usual suspects ranked: listeners added per-request and never removed (`EventEmitter` leak warning at 11+), module-level caches/Maps without eviction (per-user entries!), closures capturing large buffers in long-lived callbacks (a socket handler holding the whole request body), unbounded in-flight promise accumulation (no concurrency cap on a hot async loop), streams not destroyed on error (fd + buffer leak — `pipeline` vs `pipe` again). Confirm the leak class with `--heapsnapshot-signal` in prod or clinic heap locally; watch external/ArrayBuffer memory too — Buffer leaks don't show in JS heap.

**"Every ~30s, a burst of requests fails with ECONNRESET to Postgres. Go."**
Something between app and DB kills idle connections: LB/proxy idle timeout, pgbouncer `server_idle_timeout`, NAT gateway timeout, k8s conntrack — and the pool re-uses a corpse. Fixes: pool `idleTimeoutMillis` **shorter** than the smallest infra timeout, TCP keepalive on the client, and pool-level connection validation/retry-once-on-reset. Generalizes to Redis/HTTP clients: "my keepalive must be shorter than everyone else's" is the rule.

**"Deploys are zero-downtime, but users get 502s for ~10s each deploy. Go."**
The graceful-shutdown checklist in reverse: pod keeps receiving traffic after SIGTERM (readiness not failed / propagation lag — add a preStop sleep), `server.close()` racing keep-alive sockets, `keepAliveTimeout` < LB idle timeout (LB sends a request onto a socket the old pod closed), or new pods marked ready before they can actually serve (readiness probe hits `/` which 200s before the DB pool warms). Trace which side (old pod dying vs new pod not ready) by whether 502s cluster at pod-kill or pod-start timestamps.
