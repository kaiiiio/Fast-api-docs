# Lesson 6.5 — Scaling Patterns: Replicas, Caching, CQRS, and Zero-Downtime Migrations

> Module: Databases Deep Dive | Level: Senior | FDE Prep Phase 6

Almost every scaling conversation in a senior interview is really a conversation about *trade-offs under consistency pressure*: replicas give you read throughput but introduce lag; caches give you latency wins but introduce invalidation bugs; CQRS and search offloading give you purpose-built read models but introduce eventual consistency; and every one of these needs schema changes that must ship without downtime. This lesson covers the patterns an FDE actually deploys at customer sites — with runnable SQL and TypeScript — and the failure modes interviewers probe for.

---

## Read Replicas and Replication Lag

### Q1. How does Postgres streaming replication actually work, and why is replication lag unavoidable?

**Answer:**

Postgres physical streaming replication ships the **WAL (write-ahead log)** — the byte-level redo stream — from primary to replicas. The primary writes WAL, a `walsender` process streams it to each replica's `walreceiver`, and the replica **replays** the WAL against its own data files. By default this is **asynchronous**: the primary commits and acknowledges the client *before* any replica has received or replayed the change.

That gap is **replication lag**, and it has two components:

1. **Transport lag** — WAL bytes generated but not yet received by the replica (network).
2. **Replay lag** — WAL received but not yet applied (replica is busy, single-threaded replay, long-running query on the replica blocking replay, or heavy write bursts on the primary).

Lag is unavoidable in async mode because acknowledging the client before the replica applies the change is *the whole point* — it keeps commit latency low. Synchronous replication (`synchronous_commit = remote_apply` with `synchronous_standby_names`) removes read-after-write anomalies for that standby but makes every commit wait on the network and turns a slow/dead replica into a primary outage risk.

How to measure it — on the **primary**:

```sql
SELECT
  application_name,
  client_addr,
  state,
  pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn)   AS send_lag_bytes,
  pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS replay_lag_bytes,
  write_lag,   -- interval: time to write WAL on standby
  flush_lag,   -- interval: time to fsync WAL on standby
  replay_lag   -- interval: time to APPLY on standby (the one users feel)
FROM pg_stat_replication;
```

On the **replica**:

```sql
SELECT
  pg_last_wal_receive_lsn(),  -- last WAL received
  pg_last_wal_replay_lsn(),   -- last WAL applied (this is what queries see)
  now() - pg_last_xact_replay_timestamp() AS approx_lag;  -- misleading when primary is idle!
```

**Interview trap:** `now() - pg_last_xact_replay_timestamp()` shows "lag" growing on an *idle* primary — no transactions means the last replayed timestamp gets older even though the replica is fully caught up. Quoting that as your lag metric without the caveat is a classic mid-level tell. LSN-diff-based metrics don't have this problem.

---

### Q2. A user signs up, gets redirected to their dashboard, and sees "account not found." What happened and how do you fix it?

**Answer:**

This is the **read-your-own-writes** problem. The signup `INSERT` hit the primary; the dashboard page load a few hundred milliseconds later was routed to a replica that hadn't replayed the insert yet. The user's own write is invisible to them.

**Production war story:** A team moved dashboard reads to replicas on a Friday deploy. Replication lag was normally ~50 ms, so QA never saw it. Monday morning a marketing campaign drove a signup spike, WAL volume surged, replay lag on the reporting-shared replica hit 8–20 seconds, and every new user landed on "account not found" or an empty dashboard. Support tickets spiked within the hour, and a chunk of users hit signup *again*, creating duplicate-account cleanup work. The fix wasn't "make replication faster" — it was making the read path lag-aware.

Three lag-safe patterns, in ascending sophistication:

**1. Pin-to-primary after write (sticky sessions).** After any write for a user, route that user's reads to the primary for a window comfortably longer than your p99 lag. Simplest implementation: set a cookie with a short TTL.

```typescript
// After a successful write:
res.cookie("rpin", "1", { maxAge: 5_000, httpOnly: true }); // 5s > p99 lag

// Routing middleware:
function pickPool(req: Request): Pool {
  return req.cookies.rpin ? primaryPool : replicaPool;
}
```

Cheap, effective, slightly pessimistic (pins *all* of the user's reads, not just affected rows), and it shifts load back to the primary during write-heavy periods — exactly when the primary is busiest.

**2. LSN-based waiting (precise).** Record the primary's WAL position at commit time; before reading from a replica, wait until the replica has replayed past it. See Q3 for the implementation.

**3. Route by query type.** Classify queries at the app level: anything transactional or freshness-sensitive (auth, checkout, "my account") goes to the primary; anything tolerant (product listings, search pages, analytics widgets) goes to replicas. This is a static, coarse version of pattern 1 and usually the first thing you ship.

**Interview trap:** "We'll just use synchronous replication" is not a free fix. `remote_apply` on all replicas means every commit waits for the slowest replica's replay, and a stalled replica halts writes cluster-wide unless you configure quorum (`ANY 1 (...)`) — which then reintroduces the anomaly on the non-quorum replicas. Know which knob does what.

---

### Q3. Sketch LSN-based read-your-own-writes in TypeScript.

**Answer:**

The idea: at write time, capture `pg_current_wal_lsn()` on the primary and hand it to the client (cookie, session, or response header). At read time, ask the replica whether `pg_last_wal_replay_lsn()` has passed that LSN; if not, either wait briefly or fall back to the primary.

```typescript
import { Pool } from "pg";

const primary = new Pool({ connectionString: process.env.PRIMARY_URL });
const replica = new Pool({ connectionString: process.env.REPLICA_URL });

/** Run a write and capture the WAL position it is durable at. */
async function writeWithLsn<T>(
  fn: (client: import("pg").PoolClient) => Promise<T>
): Promise<{ result: T; lsn: string }> {
  const client = await primary.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    // Capture inside the txn: any LSN >= our changes' LSN works as a barrier.
    const { rows } = await client.query("SELECT pg_current_wal_lsn() AS lsn");
    await client.query("COMMIT");
    return { result, lsn: rows[0].lsn };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/** Read from replica only if it has replayed past `minLsn`; else primary. */
async function readAfter<T>(
  minLsn: string | undefined,
  query: string,
  params: unknown[] = [],
  opts = { maxWaitMs: 300, pollMs: 50 }
): Promise<T[]> {
  if (minLsn) {
    const deadline = Date.now() + opts.maxWaitMs;
    while (Date.now() < deadline) {
      const { rows } = await replica.query(
        // diff >= 0 means replica has replayed at or past our write
        "SELECT pg_wal_lsn_diff(pg_last_wal_replay_lsn(), $1) >= 0 AS ok",
        [minLsn]
      );
      if (rows[0].ok) {
        const r = await replica.query(query, params);
        return r.rows;
      }
      await new Promise((res) => setTimeout(res, opts.pollMs));
    }
    // Replica too far behind: serve fresh data from primary rather than block.
    const r = await primary.query(query, params);
    return r.rows;
  }
  const r = await replica.query(query, params);
  return r.rows;
}
```

Usage: after signup, put `lsn` in the session; the dashboard read calls `readAfter(session.lsn, ...)`. The user gets consistency; everyone else gets replica throughput. Postgres 14.x+ users on managed platforms sometimes get this built in (e.g., some proxies/poolers and AWS RDS Proxy do *not* — verify, don't assume).

**MongoDB parallel (brief):** replica-set secondary reads (`readPreference: "secondaryPreferred"`) have the same anomaly; the fix is **causal consistency sessions** (`client.startSession({ causalConsistency: true })`), where the driver tracks the cluster time of your writes and secondaries wait until they've replicated past it — conceptually identical to the LSN wait above. Covered in depth in lesson 6.4.

---

### Q4. What do read replicas NOT solve?

**Answer:**

- **Write scaling.** Every replica replays *every* write. Adding replicas adds zero write capacity; the primary is still the single write funnel, and WAL fan-out actually adds load (walsenders, network).
- **Working-set scaling.** Each replica holds a full copy of the data and needs cache (shared_buffers/OS page cache) for the same hot set. Replicas *duplicate* the working set; they don't partition it. If your problem is "the data doesn't fit in RAM," replicas multiply the RAM bill without fixing per-query latency.
- **Bad queries.** A 30-second sequential scan is a 30-second scan on a replica too — and on a replica it can additionally conflict with WAL replay (query cancellations via `max_standby_streaming_delay`, or replay lag if you set it high, or bloat everywhere if you enable `hot_standby_feedback`).
- **Consistency.** As above — replicas *introduce* anomalies; they don't remove them.

What replicas DO solve: read throughput for lag-tolerant traffic, HA/failover targets, isolation of expensive read workloads (reports, exports) away from OLTP.

| Problem | Replicas help? | Right tool |
|---|---|---|
| Read QPS saturating primary CPU | Yes | Replicas + routing |
| Write QPS saturating primary | No | Sharding / partitioning / queueing writes |
| Dataset ≫ RAM, slow point reads | No | Sharding, better indexes, caching |
| Analysts killing OLTP with scans | Yes (as isolation) | Dedicated replica → warehouse (Q19) |
| p99 latency on hot keys | Weakly | Cache (Q13) |

---

## App-Level Sharding

### Q5. You've maxed out vertical scaling and replicas. Walk me through sharding strategies and how you'd pick one as an FDE.

**Answer:**

Sharding = partitioning *writes* (and the working set) across independent databases. The app (or a proxy layer) must route every query to the right shard. The strategies:

**1. Shard by tenant** — the FDE-relevant one, because B2B products are naturally tenant-partitioned and cross-tenant queries are rare (usually only internal analytics). Three isolation levels:

| Model | Isolation | Cost/tenant | Migrations | Noisy neighbor | "Enterprise wants own DB" |
|---|---|---|---|---|---|
| Row-level (`tenant_id` column, shared tables) | Lowest (RLS policies help) | Cheapest | Run once | Worst | No |
| Schema-per-tenant (one Postgres schema each) | Medium | Medium | Run × N schemas | Shared instance | Partially |
| Database-per-tenant | Highest | Highest | Run × N DBs, drift risk | Best | Yes — sellable feature |

Most SaaS starts row-level with `tenant_id` on every table + composite indexes leading with `tenant_id`, then *promotes* whale tenants to their own database. That hybrid — shared pool plus dedicated instances for the top 1% — is the pragmatic FDE answer, and it requires a **directory** (below) from day one.

**2. Shard by hash of key** — `shard = hash(user_id) % N` (or better, consistent hashing / hash-range buckets). Uniform distribution, but resharding from N to M shards moves data, and you lose any locality (a tenant's rows scatter).

**3. Lookup/directory service** — a small, heavily cached table mapping key → shard:

```sql
CREATE TABLE shard_directory (
  tenant_id  uuid PRIMARY KEY,
  shard_name text NOT NULL,       -- 'shard_03' or 'dedicated_acme'
  status     text NOT NULL DEFAULT 'active'  -- 'active' | 'migrating'
);
```

This is the most flexible: you can move one tenant at a time, place whales on dedicated hardware, and reshard incrementally. Costs: the directory is a dependency on every request (cache it hard), and it's mutable state you must keep correct during moves.

**Off-the-shelf one-liners:** **Citus** turns Postgres into a distributed, `tenant_id`-sharded cluster (distributed tables + reference tables, co-located joins); **Vitess** does the same for MySQL (built at YouTube, runs Slack/GitHub-scale MySQL). If a customer's engineering team is small, "Citus before hand-rolled sharding" is often the right FDE recommendation.

---

### Q6. What is the resharding pain, concretely?

**Answer:**

Resharding = changing the key→shard mapping while serving traffic. The pain points:

1. **Data movement is online surgery.** You must copy rows, keep them in sync while copying (dual-write or CDC), cut over reads, then writes, then delete the source — per key range or per tenant. Any bug means split-brain data.
2. **`hash % N` is the worst starting point** — going N→N+1 remaps almost every key. Mitigations: consistent hashing (only ~1/N keys move) or, better, **many virtual buckets from day one** (e.g., 4096 logical buckets mapped to physical shards via the directory) so resharding is "move buckets," never "rehash keys."
3. **In-flight writes during cutover.** The standard sequence per tenant/bucket: mark `migrating` in directory → dual-write (or pause writes for that key for a few seconds — often acceptable per-tenant!) → verify checksums → flip directory → stop dual-write. Per-tenant brief write pause is a dramatically simpler correctness story than fully-online dual-write, and for B2B it's usually a non-event.
4. **Sequences/IDs.** Auto-increment IDs collide across shards. Use UUIDv7, Snowflake-style IDs, or per-shard ranges *before* you shard.

**Interview trap:** proposing `hash(id) % N` and hand-waving "we'll reshard later." The follow-up is always "N goes to N+1 — how many keys move?" (answer: ~all of them). Say "logical buckets + directory" up front.

---

### Q7. How do you handle cross-shard queries and transactions?

**Answer:**

**First answer: design so you don't have them.** Choose the shard key so that ~all transactional queries are single-shard (tenant_id for B2B does exactly this). Put small shared tables (plans, feature flags, countries) on every shard as replicated **reference tables**.

When you genuinely need cross-shard reads:

- **Fan-out + merge at the app layer:** query all shards in parallel, merge/sort/limit in the service. Fine for admin dashboards and rare operations. Watch out: `ORDER BY x LIMIT 10` requires fetching 10 *from each shard* then merging; pagination gets ugly (cursor per shard).

```typescript
async function fanOut<T>(shards: Pool[], sql: string, params: unknown[]): Promise<T[]> {
  const results = await Promise.all(shards.map((s) => s.query(sql, params)));
  return results.flatMap((r) => r.rows as T[]);
}
```

- **Offload to a read model:** stream all shards into ClickHouse/Elasticsearch/warehouse (Q17/Q19) and run cross-shard analytics *there*. This is usually the right answer for "global search" and "company-wide reports."

Cross-shard **transactions**: avoid. Two-phase commit across shards is slow, and a coordinator failure leaves in-doubt transactions. The pragmatic patterns are **sagas** (sequence of local transactions + compensating actions) or restructuring so the invariant lives on one shard. If an interviewer pushes, mention that Citus/Vitess do support distributed transactions but you still design for single-shard hot paths because latency and failure modes are strictly worse.

---

## CQRS

### Q8. What is CQRS actually — and what is it not?

**Answer:**

**CQRS (Command Query Responsibility Segregation)** = maintaining **separate models** for writes (commands) and reads (queries). The write model is normalized, invariant-enforcing, optimized for transactional correctness. The read model is denormalized, shaped exactly like the screens/API responses that consume it, possibly in a *different store entirely* (Postgres → Elasticsearch, Postgres → Redis materialized views, Postgres → ClickHouse). A sync mechanism propagates writes to the read model(s), accepting eventual consistency.

What it is **not**:

- Not "read replicas." Replicas are the *same* model, byte-identical, just on other machines. CQRS is a *differently shaped* model.
- Not "two Express routers." Splitting `GET` handlers and `POST` handlers into separate files that call the same table through the same ORM is code organization, not CQRS.
- Not a synonym for event sourcing. CQRS pairs *nicely* with event sourcing but works fine with a plain relational write model + outbox (Q9).

When it's **justified**:

- The read shape is violently different from the write shape (e.g., normalized order/line-item/inventory tables on write; a per-customer "order timeline" document with precomputed totals, statuses, and search facets on read).
- Read:write ratio is extreme and reads need denormalized precomputation that would make write transactions slow or contentious.
- Multiple read models from one write stream (search index + cache + analytics), which you're building anyway — CQRS names the architecture you already have.

When it's **cargo cult**: a CRUD app where the "read model" would be a mirror of the write tables. You pay the full eventual-consistency and pipeline-operations tax and get nothing — the read model has the same shape you started with.

| Signal | Verdict |
|---|---|
| Read model ≅ write tables, same store | Skip CQRS; add indexes/replicas |
| One gnarly screen needs denormalized data | Materialized view or app-side cache first |
| Read model in a different engine (ES, ClickHouse) | You already need CQRS-style sync — do it properly (outbox/CDC) |
| Team can't articulate the consistency window UX | Not ready for CQRS |
| Event-driven org, consumers already exist | CQRS is nearly free |

**Interview trap:** answering "CQRS means using read replicas for queries." That conflation is the #1 filter question on this topic.

---

### Q9. How do you keep the read model in sync? Explain the transactional outbox with code.

**Answer:**

The naive approach — write to the DB, then publish to Kafka/SNS/queue from app code — is **dual-write** and it's broken: if the process dies between the commit and the publish (or the publish succeeds and the commit rolls back), the write model and read model silently diverge, forever.

The **transactional outbox** fixes this by making "record the event" part of the *same ACID transaction* as the business write. A relay then delivers events asynchronously with at-least-once semantics.

```sql
CREATE TABLE outbox (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  aggregate_type text        NOT NULL,   -- 'order'
  aggregate_id   uuid        NOT NULL,   -- which entity
  event_type     text        NOT NULL,   -- 'order.shipped'
  payload        jsonb       NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  processed_at   timestamptz             -- NULL = pending
);

-- Partial index: the relay only ever scans pending rows.
CREATE INDEX idx_outbox_pending ON outbox (id) WHERE processed_at IS NULL;
```

Business write and event, atomically:

```typescript
async function shipOrder(orderId: string) {
  const client = await primary.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `UPDATE orders SET status = 'shipped', shipped_at = now()
       WHERE id = $1 AND status = 'paid' RETURNING *`,
      [orderId]
    );
    if (rows.length === 0) throw new Error("invalid state transition");
    await client.query(
      `INSERT INTO outbox (aggregate_type, aggregate_id, event_type, payload)
       VALUES ('order', $1, 'order.shipped', $2)`,
      [orderId, JSON.stringify({ orderId, shippedAt: rows[0].shipped_at })]
    );
    await client.query("COMMIT"); // event and state change: one atomic unit
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
```

Relay worker — multiple instances can run safely because of `FOR UPDATE SKIP LOCKED` (the same pattern used for Postgres-as-a-job-queue; cross-reference the SKIP LOCKED discussion in the queues material):

```typescript
async function relayBatch(): Promise<number> {
  const client = await primary.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(`
      SELECT id, event_type, payload FROM outbox
      WHERE processed_at IS NULL
      ORDER BY id
      LIMIT 100
      FOR UPDATE SKIP LOCKED   -- competing workers skip each other's rows
    `);
    for (const row of rows) {
      await publishToBus(row.event_type, row.payload); // Kafka/SNS/etc.
    }
    if (rows.length > 0) {
      await client.query(
        `UPDATE outbox SET processed_at = now() WHERE id = ANY($1)`,
        [rows.map((r) => r.id)]
      );
    }
    await client.query("COMMIT");
    return rows.length;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// Poll loop with idle backoff.
(async function loop() {
  for (;;) {
    const n = await relayBatch().catch(() => 0);
    if (n === 0) await new Promise((r) => setTimeout(r, 500));
  }
})();
```

Key properties to state in an interview:

- **At-least-once delivery**: if the worker crashes after publishing but before `COMMIT`, the batch is re-published. Consumers must be **idempotent** (dedupe on outbox `id` or event UUID).
- **Ordering**: `ORDER BY id` gives approximate ordering; with multiple workers, strict per-aggregate ordering needs partitioning by `aggregate_id` (or a single relay).
- **Cleanup**: delete or archive processed rows (a nightly `DELETE ... WHERE processed_at < now() - interval '7 days'` in batches) or the table bloats.
- The heavyweight alternative is **CDC (Debezium)** tailing the WAL — no polling, no outbox table needed for simple cases, but more infrastructure (Kafka Connect). Debezium also has a dedicated *outbox event router* that combines both.

**Interview trap:** "we publish to Kafka inside the request handler after commit" — say the words *dual-write anomaly* and explain the crash window. This exact probe appears constantly in system design rounds.

---

### Q10. What are the UX costs of eventual consistency in CQRS, and how do you mitigate them?

**Answer:**

The user writes, the read model updates 200 ms–20 s later, and every screen backed by the read model can show stale data. Concrete costs:

- User creates an item → list view (from read model) doesn't show it → user clicks create again → duplicates.
- Admin changes a permission → the change "doesn't work" for seconds → support ticket.
- Two screens disagree (detail view from write DB, list from ES) → users lose trust in the data.

Mitigations (same family as Q2, because it's the same problem):

1. **Optimistic UI / write-through of the client's own change** — patch the local UI state from the command response; don't wait for the read model.
2. **Version/watermark waiting** — the command returns a version (or outbox id); the read API can wait until its projection has consumed past that version. This is the CQRS analog of LSN-waiting.
3. **Read-your-writes routing** — for the writing user only, serve the affected entity from the write model for a short window.
4. **Honest UX** — "Processing… your report will appear shortly." Cheap and often the right call for genuinely async things.

The senior point: pick the consistency window per feature *deliberately* and make product own the copy for the stale window. If nobody can articulate what the user sees during the lag, the team isn't ready for CQRS.

---

## Event Sourcing

### Q11. Explain event sourcing — what it buys, what it costs, and when a plain audit table is the better call.

**Answer:**

**Event sourcing**: the append-only log of domain events (`OrderPlaced`, `ItemAdded`, `OrderShipped`) *is* the source of truth. Current state is a **projection** — a left-fold over the event stream — and you can rebuild any read model by **replaying** events from the start. Writes append events after checking invariants against the aggregate's current (folded) state, typically with optimistic concurrency on the stream version.

**What it buys:**

- Perfect audit trail by construction — you can't forget to log because the log is the data.
- **Temporal queries**: "what did this account look like on March 3?" — replay to that point.
- Retroactive features: new projections computed over *all history* (e.g., ship a new analytics view populated from day-one data).
- Natural fit for event-driven integration — the events already exist.

**What it costs:**

- **Event versioning**: events live forever; every consumer and replayer must handle v1..vN schemas (upcasters, weak schema). This is the tax teams underestimate most.
- **Snapshotting**: long-lived aggregates (thousands of events) need periodic snapshots or reads get slow — more machinery.
- **GDPR/right-to-erasure pain**: you can't delete from an immutable log without breaking replay. Workarounds — crypto-shredding (encrypt PII per user, delete the key) or rewriting streams — are all awkward.
- **Tooling and hiring**: compared to "Postgres + ORM," the ecosystem (EventStoreDB, Axon, hand-rolled on Postgres/Kafka) is niche; every new hire needs onboarding into the paradigm.
- Ad-hoc queries require projections — you can't just `psql` your way into current state.

**Interview trap:** "event sourcing = event-driven architecture." No: EDA means services *communicate* via events; the service's own database can still be boring CRUD. Event sourcing means events are the service's *persistence model*. You can have either without the other, and conflating them is a well-known trap question.

**The 90/10 alternative:** if what the business wants is "who changed what, when," a plain **history/audit table** — populated by triggers or app code writing `(entity_id, actor, diff jsonb, at)` — delivers ~90% of the value at ~10% of the cost:

```sql
CREATE TABLE order_audit (
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id  uuid        NOT NULL,
  actor_id  uuid,
  action    text        NOT NULL,
  old_value jsonb,
  new_value jsonb,
  at        timestamptz NOT NULL DEFAULT now()
);
```

State stays queryable and mutable; you lose replay/temporal rebuild, which most teams never actually use. Recommending the audit table when the requirement is "audit" is the senior move; reaching for event sourcing there is résumé-driven design.

---

### Q12. When *would* you actually recommend event sourcing?

**Answer:**

- The domain is genuinely about the events: ledgers/accounting (double-entry is already event sourcing), trading, inventory movements, insurance claims — where regulators or reconciliation demand the full history *as the primary artifact*.
- You need temporal reconstruction as a product feature ("as-of" reporting, dispute resolution).
- Multiple downstream projections/consumers already exist and the team already runs Kafka-class infrastructure competently.
- Aggregate invariants are complex and command-shaped, and the team has DDD experience.

And even then: apply it **per aggregate**, not system-wide. The `orders` ledger can be event-sourced while `user_profiles` stays CRUD. "Event source the bounded contexts that need it" beats "we are an event-sourced company" in both interviews and production.

---

## Caching Patterns (Redis)

> Scope note: this section covers *patterns and app-level implementation*. For Redis internals — data structures, eviction policies, persistence, cluster mode — see the Redis deep-dive doc.

### Q13. Implement production-grade cache-aside in TypeScript, including stampede protection.

**Answer:**

Cache-aside (lazy loading): read cache → on miss, read DB → populate cache with TTL. The naive version melts down under concurrency: when a hot key expires, *every* concurrent request misses simultaneously and hits the database at once — a **cache stampede**. A production implementation layers three defenses:

1. **Per-key in-process promise coalescing** — N concurrent misses in one Node process become 1 DB call.
2. **Distributed lock with timeout** — across processes, only one instance recomputes; others briefly wait or serve stale.
3. **Serve-stale fallback + jittered TTLs** — keep a longer-lived stale copy to serve while recomputing; jitter TTLs so keys written together don't expire together.

```typescript
import Redis from "ioredis";
import { randomUUID } from "crypto";

const redis = new Redis(process.env.REDIS_URL!);

// Layer 1: in-process coalescing. Key -> in-flight promise.
const inflight = new Map<string, Promise<unknown>>();

interface CacheOpts {
  ttlSec: number;        // freshness window
  staleTtlSec: number;   // total lifetime incl. stale grace (> ttlSec)
  lockTtlMs: number;     // recompute lock auto-expiry (crash safety)
}

interface Envelope<T> { v: T; freshUntil: number; }

export async function cached<T>(
  key: string,
  loader: () => Promise<T>,
  opts: CacheOpts = { ttlSec: 300, staleTtlSec: 900, lockTtlMs: 10_000 }
): Promise<T> {
  const hit = await redis.get(key);
  if (hit) {
    const env = JSON.parse(hit) as Envelope<T>;
    if (Date.now() < env.freshUntil) return env.v;      // fresh hit
    // Stale hit: trigger background refresh, serve stale now.
    void refresh(key, loader, opts).catch(() => {});
    return env.v;
  }
  // True miss (cold key): coalesce + compute, callers must wait.
  return refresh(key, loader, opts);
}

async function refresh<T>(
  key: string,
  loader: () => Promise<T>,
  opts: CacheOpts
): Promise<T> {
  // Layer 1: one loader per key per process.
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const p = (async () => {
    // Layer 2: one recomputer per key across ALL processes.
    const lockKey = `lock:${key}`;
    const token = randomUUID();
    const gotLock = await redis.set(lockKey, token, "PX", opts.lockTtlMs, "NX");

    if (!gotLock) {
      // Someone else is recomputing. Serve stale if we have it...
      const stale = await redis.get(key);
      if (stale) return (JSON.parse(stale) as Envelope<T>).v;
      // ...else wait briefly for the winner, then last-resort load ourselves.
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 100));
        const filled = await redis.get(key);
        if (filled) return (JSON.parse(filled) as Envelope<T>).v;
      }
      return loader(); // lock holder died mid-compute; don't hang forever
    }

    try {
      const v = await loader();
      // Layer 3: jittered freshness (±10%) so co-written keys desynchronize.
      const jitter = 0.9 + Math.random() * 0.2;
      const env: Envelope<T> = {
        v,
        freshUntil: Date.now() + opts.ttlSec * 1000 * jitter,
      };
      await redis.set(key, JSON.stringify(env), "EX", opts.staleTtlSec);
      return v;
    } finally {
      // Release only our own lock (compare token) — Lua for atomicity.
      await redis.eval(
        `if redis.call("get", KEYS[1]) == ARGV[1]
           then return redis.call("del", KEYS[1]) else return 0 end`,
        1, lockKey, token
      );
    }
  })().finally(() => inflight.delete(key));

  inflight.set(key, p);
  return p as Promise<T>;
}
```

Design points to narrate: the envelope separates *logical* freshness (`freshUntil`) from *physical* expiry (`staleTtlSec`), which is what enables serve-stale; the lock has a TTL so a crashed recomputer can't wedge the key; the Lua compare-and-delete prevents releasing someone else's lock after a slow compute outlives the lock TTL.

**Production war story:** A team shipped a deploy that changed the cache key prefix (`v2:` → `v3:`) for *all* product pages at once — equivalent to a mass expiry. Every key missed simultaneously; thousands of concurrent requests fell through to Postgres; connection pool saturated; p99 went from 40 ms to 30 s; the health checks behind the DB-backed endpoint failed; the orchestrator restarted "unhealthy" pods, which came up with cold in-process caches and made it worse. Total outage: 25 minutes. Fixes applied afterward: coalescing + lock as above, serve-stale across version bumps (read `v2` as stale fallback while `v3` warms), and pre-warming the top-N keys as a deploy step.

---

### Q14. Cache-aside vs write-through vs write-behind — trade-offs?

**Answer:**

| | Cache-aside | Write-through | Write-behind (write-back) |
|---|---|---|---|
| Write path | App writes DB only; cache filled on read miss | App writes cache + DB synchronously (cache layer owns DB write) | App writes cache; cache flushes to DB async |
| Read after write | Miss or stale until next load | Always fresh | Always fresh (from cache) |
| Write latency | DB latency | DB + cache latency | Cache latency only (fast) |
| Data-loss risk | None (cache is derived) | None | **Yes** — cache node dies before flush |
| Cache churn | Only hot data cached | Everything written is cached (even never-read data) | Same |
| Complexity | Low | Medium | High (ordering, retries, dedupe) |
| Typical use | Default for read-heavy web apps | Read-heavy where staleness is unacceptable | Extreme write rates where loss is tolerable (metrics, counters) |

Cache-aside is the default answer for a MERN stack. Write-behind is the only one where Redis holds data the DB doesn't have yet — say that risk out loud before proposing it.

---

### Q15. "There are only two hard things in computer science…" — earn the joke. What are the real invalidation failure modes?

**Answer:**

The joke ("cache invalidation and naming things") is earned by knowing *why* invalidation is hard: it's a distributed race between two systems with no shared transaction.

**Failure mode 1 — delete-then-write race (stale resurrection):**

1. Writer updates DB row, then deletes cache key. Correct order, but:
2. Reader A misses (key deleted), reads DB… gets delayed (GC pause, slow query).
3. Meanwhile writer B updates the row again and deletes the key again.
4. Reader A finally writes its *now-stale* value into the cache — where it lives for the full TTL.

Mitigations: short TTLs as a backstop (bound the damage), compare-and-set with versions, or **delayed double delete** (delete, then delete again after ~500 ms). None is bulletproof; TTL-as-backstop is non-negotiable.

**Failure mode 2 — cache/DB write ordering:**

- *Update cache then DB*: DB write fails → cache holds data that never existed. Never do this.
- *Update DB then update cache (with the new value)*: two concurrent writers can apply DB updates in one order and cache SETs in the opposite order → cache permanently holds the older value. This is why the standard recipe is **update DB, then DELETE (not SET) the key** — deletes are idempotent and order-insensitive; the next read repopulates.
- Cache delete fails after DB commit → stale until TTL. If that's unacceptable, put the invalidation in the **outbox** (Q9) so it retries — cache invalidation as an at-least-once event is a genuinely senior pattern.

**Invalidation strategy menu:**

| Strategy | Staleness bound | Complexity | When |
|---|---|---|---|
| TTL-only | Up to TTL | Trivial | Data where N-minutes-stale is fine (catalogs, configs) |
| Explicit delete-on-write | ~0 (modulo races above) | Medium | User-visible entities; pair with TTL backstop |
| Versioned keys / namespacing (`user:{id}:v{n}` or bump a namespace counter) | ~0, no delete race | Medium | Bulk invalidation (one tenant's everything); old versions just expire |

**Terminology check** (interviewers do probe this): **cache stampede** = many concurrent requests recompute the *same* expired key; **thundering herd** = many waiters unleashed on a shared resource at once (the classic use is processes woken on one socket event; in caching contexts people use it for mass-expiry hitting the DB across *many* keys). Stampede is per-key; herd is systemic. Jittered TTLs fix the herd; locks/coalescing fix the stampede.

**Interview trap:** proposing "update DB then SET the new value into cache" as the fix for the delete race. You've traded a bounded race for the *unbounded* write-reordering bug in failure mode 2. Delete, don't set — or version the keys.

---

### Q16. When should you NOT cache?

**Answer:**

- **Write-heavy, read-rarely data** — you pay invalidation complexity for hit rates near zero.
- **Correctness-critical reads** (auth checks, balances, inventory decrements) — either skip the cache or design explicit versioned invalidation with the write path; "eventually consistent permissions" is a security bug.
- **When the DB isn't actually the bottleneck** — a missing index masquerades as "we need Redis." Run `EXPLAIN ANALYZE` first; a 2 ms indexed query doesn't need a cache and the cache adds a failure mode.
- **When the working set fits in Postgres shared_buffers anyway** — you're duplicating RAM and adding a network hop.
- **Unbounded key cardinality** (per-request keys, unhashed query strings) — eviction thrash, ~0% hit rate.

The senior framing: a cache is a *second data system with its own consistency contract*. Add it when the read-amplification math justifies operating that contract, not as step one.

---

## Search Offloading

### Q17. Why does Postgres search hit a wall, and how do you sync to Elasticsearch without losing data?

**Answer:**

`LIKE '%term%'` can't use a B-tree (no left anchor) — it's a sequential scan; `pg_trgm` GIN indexes fix *that* but not relevance. Postgres FTS (`tsvector`/`tsquery` + GIN) gets you real full-text matching and basic ranking (`ts_rank`), and it is genuinely enough for many apps — say that first. The walls you eventually hit:

- **Relevance ranking**: no BM25 (until recent extensions), no per-field boosting tuned by analysis chains, poor control over scoring.
- **Typo tolerance / fuzziness**: trigram similarity is a blunt instrument vs. ES fuzzy queries and suggesters.
- **Faceting/aggregations at search time**: counts per category/brand/price-bucket alongside results — ES does this natively; in Postgres it's N extra GROUP BYs per search.
- Language analysis (stemming variants, synonyms, shingles), highlighting, "did you mean."

Once you adopt Elasticsearch/OpenSearch, the hard problem is **sync** — and it's the same dual-write problem as Q9:

| Sync pattern | Atomicity | Ops burden | Verdict |
|---|---|---|---|
| Dual-write (app writes DB, then ES) | **None** — crash window desyncs silently | Low | Bad; acceptable only with a nightly full reconcile job |
| Transactional outbox → indexer worker | At-least-once, ordered enough | Medium | The pragmatic default; reuses Q9 machinery |
| CDC: Debezium tails WAL → Kafka → ES sink | At-least-once, no app changes | High (Kafka Connect stack) | Best at scale / many consumers |
| Mongo change streams → indexer | At-least-once (resume tokens) | Medium | The Mongo-native equivalent of CDC |

Indexer notes regardless of pattern: make indexing **idempotent** (index by `_id` = primary key — upserts, not appends); handle deletes explicitly (tombstone events); and keep a **full-reindex path** because you *will* need it (mapping changes, sync bugs).

**Zero-downtime reindex — alias swap:** never point the app at a physical index. Point it at an alias; reindex into a new index; swap atomically:

```jsonc
// 1. App reads/writes via alias "products".
// 2. Create products_v2 with the new mapping; bulk-index from source of truth.
// 3. Atomic swap:
POST /_aliases
{
  "actions": [
    { "remove": { "index": "products_v1", "alias": "products" } },
    { "add":    { "index": "products_v2", "alias": "products" } }
  ]
}
// 4. Keep products_v1 for rollback; delete after soak.
```

During the bulk reindex, keep live changes flowing (outbox/CDC writes to *both* indexes, or replay events newer than the reindex start watermark after the bulk load) — otherwise the swap loses the writes that happened mid-reindex.

**UX of eventually consistent search:** a just-created item may not be findable for seconds. Standard mitigations: after a create, show "your item is being indexed"; or merge the user's own recent writes (from the primary DB) into their search results; and keep the indexing lag SLO visible on a dashboard, because "search is missing my document" tickets are how you find out it broke.

---

### Q18. An interviewer asks: "Why not just dual-write to Elasticsearch from the service? It's two lines of code."

**Answer:**

Enumerate the failure windows: (1) DB commit succeeds, process crashes before ES write → document missing from search *forever* — no retry will ever happen because nothing recorded the intent. (2) ES write succeeds, DB transaction rolls back → search returns a ghost document that 404s on click. (3) Two concurrent updates land in DB order A,B but ES order B,A → search shows the older version indefinitely (no ordering guarantee without versioning). (4) ES is down for 10 minutes → do you fail user writes (coupling your write availability to a search cluster) or drop the index updates (silent divergence)?

Every one of these is solved by putting intent in the same transaction as the write (outbox) or reading the WAL (CDC), plus idempotent, versioned upserts (`external_gte` versioning in ES using an `updated_at` or version column). The "two lines of code" costs you a reconciliation job, an on-call runbook, and user trust. If the interviewer pushes on simplicity: dual-write + a nightly diff-and-repair job against the source of truth is the *minimum* honest version of that architecture — and once you've built the repair job, the outbox was less work.

---

## Analytics Offloading

### Q19. Why does running analytics on the OLTP primary go wrong, and what's the escalation ladder?

**Answer:**

**Row vs column storage:** Postgres stores rows contiguously in 8 KB heap pages — perfect for "fetch this order and all its columns." An analytical query (`SELECT region, SUM(amount) FROM orders GROUP BY region` over 100M rows) needs 2 columns but must drag *every column of every row* through the buffer cache. Consequences on a shared primary:

- The scan **evicts your hot OLTP working set** from shared_buffers/OS cache — every point read behind it becomes a disk read; p99 spikes for the whole app.
- Long-running queries hold back the **xmin horizon**, so vacuum can't clean dead tuples → table/index bloat accumulates during the report and lingers after.
- On a replica, the same long query either gets cancelled by replay conflicts or forces replay to wait (`max_standby_streaming_delay`) → replication lag for everyone (and if you "fix" it with `hot_standby_feedback = on`, you export the bloat problem back to the primary).

Column stores (ClickHouse, BigQuery, Snowflake, Redshift) invert the layout: each column is stored (and compressed — similar values compress brutally well) contiguously, so that GROUP BY reads only the two columns it needs, vectorized. Orders-of-magnitude difference is normal, not marketing.

**The escalation ladder** — spend in this order:

1. **Dedicated read replica for reports.** One replica that analysts can hurt, with `max_standby_streaming_delay` set high, excluded from app traffic. Cheap, ships in a day. Limits: still row-store slow, still full-copy hardware, lag when reports run.
2. **Nightly ETL to a warehouse.** Batch export (or `COPY`/dump of changed partitions) into Snowflake/BigQuery/ClickHouse. Analysts get columnar speed; freshness is "as of last night," which most BI genuinely tolerates.
3. **CDC streaming to the warehouse.** Debezium/Fivetran/Airbyte tail the WAL into the warehouse with minutes of lag. Freshness + columnar speed; cost is the pipeline's ops burden. One-liners for the interview: **Snowflake** = elastic separated storage/compute SaaS warehouse; **BigQuery** = serverless, pay-per-scan; **ClickHouse** = self-hostable, absurdly fast, you operate it, great for product analytics/event data.

**Production war story:** A B2B customer's ops lead ran a "quick" year-end revenue report — a five-way join with no date filter — directly on the production primary at 9 a.m. The scan flushed the buffer cache and pegged I/O; checkout p99 went from 60 ms to 4 s; autovacuum fell behind on the orders table because the query pinned xmin for 40 minutes; bloat from that morning degraded performance for *days* until a manual `VACUUM` window. The durable fix wasn't yelling at the ops lead — it was (a) a `statement_timeout` + separate read-only role for humans, (b) a reports replica that week, and (c) nightly ETL to a warehouse the next quarter, at which point BI tools were pointed away from Postgres entirely. As an FDE, "give analysts a place to be" is a recurring deliverable.

---

### Q20. When do you choose replica-for-reports vs warehouse vs ClickHouse?

**Answer:**

| Situation | Choice | Why |
|---|---|---|
| A few internal reports, data < ~100 GB, daily freshness fine | Reports replica | Zero new tech; SQL they already know |
| BI team, dashboards, cross-source joins (DB + Stripe + ads) | Warehouse (Snowflake/BigQuery) + ETL/ELT | Connectors exist; separation of concerns; dbt ecosystem |
| Customer-facing analytics in-product (fast aggregates per tenant, high QPS) | ClickHouse (or warehouse w/ serving layer) | Warehouses are slow/expensive per-query for embedded, high-QPS analytics; ClickHouse serves sub-second aggregates |
| "Real-time" ops dashboards (minutes matter) | CDC → ClickHouse/warehouse streaming ingest | Batch ETL can't meet freshness |
| One gnarly aggregate on the hot path | Neither — precompute (materialized view / rollup table via outbox events) | Don't stand up a warehouse for one number |

Decision heuristic: **who consumes it and at what QPS**. Humans-at-low-QPS → warehouse; product-at-high-QPS → ClickHouse-class serving store; nobody-yet → replica and wait for real requirements.

---

## Zero-Downtime Migrations

### Q21. Walk through expand-contract for renaming/retyping a column on a big, hot table.

**Answer:**

You cannot `ALTER TABLE users RENAME COLUMN` (fine, metadata-only — but breaks every deployed app version instantly) or `ALTER COLUMN ... TYPE ...` (often a full-table rewrite under `ACCESS EXCLUSIVE` lock — minutes of total write blockage) on a hot table. **Expand-contract (parallel change)** makes every step backward-compatible so old and new app code coexist during the deploy:

Scenario: `users.fullname text` must become `users.display_name varchar(200)` (rename + type change) on a 200M-row table.

**Step 1 — Expand: add the new column (instant).**

```sql
-- Postgres 11+: adding a column with a NON-VOLATILE default is metadata-only
-- (the default is stored in the catalog, no table rewrite). Adding a plain
-- nullable column is likewise instant.
SET lock_timeout = '2s';  -- never queue behind long transactions (see Q22)
ALTER TABLE users ADD COLUMN display_name varchar(200);
```

(Contrast to state in the interview: pre-PG11, `ADD COLUMN ... DEFAULT ...` rewrote the whole table. PG11+ fast-paths constant defaults; a *volatile* default like `now()` or `gen_random_uuid()` still rewrites.)

**Step 2 — Dual writes at the app level.** Deploy app code that writes **both** columns on every INSERT/UPDATE. Order matters: start dual-*writing* before you backfill, otherwise rows written during the backfill are missed. Reads still use the old column.

```typescript
// Every write path sets both until contraction:
await db.query(
  `UPDATE users SET fullname = $1, display_name = $1 WHERE id = $2`,
  [name, id]
);
```

(If the transform is non-trivial — type coercion, normalization — do it in one place: a shared function, or a temporary trigger `BEFORE INSERT OR UPDATE` in SQL so no code path can forget.)

**Step 3 — Backfill in batches.** Never one giant `UPDATE users SET display_name = fullname` — that's one transaction touching 200M rows: hours of row locks, a WAL avalanche that saturates replicas, vacuum debt for days. Batch, sleep, and keep transactions tiny:

```sql
-- Run from a script/loop (psql \watch, or app-side loop), not one transaction:
WITH batch AS (
  SELECT id FROM users
  WHERE display_name IS NULL AND fullname IS NOT NULL
  ORDER BY id
  LIMIT 5000
  FOR UPDATE SKIP LOCKED          -- don't block concurrent app writes
)
UPDATE users u
SET display_name = left(u.fullname, 200)
FROM batch b
WHERE u.id = b.id;
-- sleep 100-500ms between batches; watch pg_stat_replication replay lag
-- and pause the loop if lag exceeds your threshold.
```

App-side driver of the same loop:

```typescript
for (;;) {
  const { rowCount } = await primary.query(BATCH_UPDATE_SQL);
  if (rowCount === 0) break;
  const { rows } = await primary.query(
    `SELECT max(pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn)) AS lag
     FROM pg_stat_replication`);
  const lagBytes = Number(rows[0].lag ?? 0);
  await new Promise((r) => setTimeout(r, lagBytes > 64 * 1024 * 1024 ? 5000 : 200));
}
```

**Step 4 — Switch reads.** Deploy app code reading `display_name` (still dual-writing). Verify with a checksum query (`SELECT count(*) FROM users WHERE display_name IS DISTINCT FROM left(fullname, 200)` — batched/sampled on big tables).

**Step 5 — Contract.** Stop dual-writing (deploy), then drop the old column with a lock timeout:

```sql
SET lock_timeout = '2s';
ALTER TABLE users DROP COLUMN fullname;  -- metadata-only, but needs ACCESS EXCLUSIVE briefly
```

`DROP COLUMN` is instant but must *acquire* `ACCESS EXCLUSIVE`; without `lock_timeout` it queues behind any long-running query — and everything else then queues behind *it* (see Q22).

**Production war story:** A team backfilled a new column on a 400M-row table with a single `UPDATE ... SET ... WHERE new_col IS NULL` at 2 p.m. The statement ran 3 hours: it took row locks that stalled a batch job into deadlocks, generated ~300 GB of WAL that pushed replica replay lag past 40 minutes (read-your-writes pins sent all that traffic back to the primary, compounding load), filled the WAL disk on a small replica which then crashed, and when someone killed the UPDATE at hour 3, the rollback took another 40 minutes and left 200M dead tuples for autovacuum. The batched version with lag-aware sleeps ran over two quiet nights with zero pages. "Backfills are load tests you run against yourself" is the sentence to say.

**Interview trap:** proposing dual writes *after* or *during* the backfill "to save a deploy." Rows written between backfill-start and dual-write-start end up NULL in the new column, and you discover it after switching reads. The order is invariant: **expand → dual-write → backfill → verify → switch reads → contract.**

---

### Q22. Why is `lock_timeout` mandatory for DDL, and how do you add NOT NULL and indexes without downtime?

**Answer:**

**The lock-queue ambush:** Postgres lock waits form a queue. `ALTER TABLE` needs `ACCESS EXCLUSIVE`. If one analyst's 20-minute `SELECT` holds `ACCESS SHARE`, your ALTER *waits* — and because it's queued, **every subsequent query on the table queues behind the ALTER**, including trivial point reads. A "1 ms metadata change" becomes a full-table outage for 20 minutes. Hence, for every DDL statement:

```sql
SET lock_timeout = '2s';       -- give up fast instead of ambushing traffic
SET statement_timeout = '30s'; -- belt and braces
-- run DDL; on failure, retry in a loop with backoff (deploy tooling should do this)
```

**Adding NOT NULL without a full scan:** a plain `ALTER TABLE ... SET NOT NULL` scans the whole table under `ACCESS EXCLUSIVE`. The zero-downtime recipe:

```sql
-- 1. Add the constraint without validating existing rows (instant; new writes checked):
ALTER TABLE users ADD CONSTRAINT users_email_nn
  CHECK (email IS NOT NULL) NOT VALID;

-- 2. Backfill/fix violating rows (batched, as in Q21).

-- 3. Validate: takes only SHARE UPDATE EXCLUSIVE — reads AND writes continue:
ALTER TABLE users VALIDATE CONSTRAINT users_email_nn;

-- 4. (PG12+) Now SET NOT NULL is instant because Postgres proves it from the
--    validated CHECK constraint — no scan:
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
ALTER TABLE users DROP CONSTRAINT users_email_nn;  -- optional cleanup
```

**Indexes:** plain `CREATE INDEX` takes `SHARE` — blocks all writes for the whole build. Always:

```sql
CREATE INDEX CONCURRENTLY idx_orders_customer ON orders (customer_id);
```

Caveats to volunteer (this is where senior candidates separate):

- Cannot run inside a transaction block — so it breaks naive migration frameworks that wrap every migration in `BEGIN/COMMIT`; you need your tool's "non-transactional migration" escape hatch.
- Roughly 2–3× slower than a normal build (two table scans + waits for concurrent transactions to finish).
- **On failure it leaves an INVALID index behind** — it still consumes disk and slows writes but serves no queries. Check and clean up:

```sql
SELECT indexrelid::regclass FROM pg_index WHERE NOT indisvalid;
DROP INDEX CONCURRENTLY IF EXISTS idx_orders_customer;  -- then retry the create
```

- Same story for `DROP INDEX CONCURRENTLY` and (PG12+) `REINDEX CONCURRENTLY`.
- Unique constraint on a big table: `CREATE UNIQUE INDEX CONCURRENTLY`, then `ALTER TABLE ... ADD CONSTRAINT ... UNIQUE USING INDEX ...` (brief lock, no scan).

**Interview trap:** "adding an index doesn't block anything, it's just an index." Plain `CREATE INDEX` blocks *every write* to the table for the build duration — on a 100M-row table that's a write outage. `CONCURRENTLY` or nothing, and know its failure mode (invalid index) or you'll be paged by mysteriously slow writes weeks later.

---

### Q23. Give me a migration checklist you'd apply at a customer site.

**Answer:**

| # | Check | Why |
|---|---|---|
| 1 | Every migration backward-compatible with the *currently deployed* app version | Rolling deploys mean old code runs against new schema (and vice versa on rollback) |
| 2 | `lock_timeout` (~2s) + retry loop on all DDL | Avoid the lock-queue ambush (Q22) |
| 3 | No table rewrites hiding in the ALTER (volatile defaults, most type changes, `SET NOT NULL` without the CHECK trick) | Rewrite = `ACCESS EXCLUSIVE` for the duration |
| 4 | All index builds `CONCURRENTLY`, outside transactions; post-check `pg_index.indisvalid` | Plain builds block writes; failed concurrent builds leave invalid indexes |
| 5 | Backfills batched (≤ ~5–10k rows/txn), sleep between batches, replica-lag circuit breaker | Long transactions block vacuum; WAL bursts saturate replicas (Q21 war story) |
| 6 | Dual-write deployed and verified BEFORE backfill starts | Ordering invariant (Q21 trap) |
| 7 | Verification query (count of mismatches) green before switching reads | Trust but verify |
| 8 | Rollback plan per step, and steps individually shippable | Expand-contract's whole value is stopping safely mid-way |
| 9 | Destructive step (drop column/table) delayed one release + confirmed no readers (logs, `pg_stat_statements`) | Rollback of the previous release must still work |
| 10 | Run against a prod-sized copy first; note timings | "Instant on dev, 3 hours on prod" is the oldest surprise there is |
| 11 | Scheduled in a low-traffic window with a human watching `pg_stat_activity`, `pg_locks`, replication lag | Cheap insurance |
| 12 | ORM/framework wrinkles handled (e.g., migration tool wraps in txn → breaks `CONCURRENTLY`; Prisma/TypeORM generated DDL reviewed by hand) | Generated migrations are drafts, not gospel |

---

### Q24. Tie it together: a customer asks you to take their single-Postgres MERN app "to the next level of scale." What's your order of operations?

**Answer:**

The senior answer is a *sequence*, cheapest-and-most-reversible first, each step gated on measurements rather than vibes:

1. **Measure.** `pg_stat_statements`, slow-query log, cache hit ratios, table bloat. Most "we need to scale" engagements end at missing indexes and N+1 queries. No architecture until the top-10 query list is boring.
2. **Indexes + query fixes + connection pooling** (PgBouncer). Boring, massive ROI.
3. **Cache the proven-hot reads** — cache-aside with stampede protection (Q13), TTL backstops, versioned keys for bulk invalidation. Patterns here; Redis internals in the Redis deep-dive doc.
4. **Read replicas + lag-aware routing** (Q1–Q3) for read throughput and to isolate reports; give analysts a replica before they find the primary.
5. **Offload specialized reads**: search to ES via outbox/CDC (Q17), analytics to a warehouse or ClickHouse (Q19). This is CQRS-in-practice, arriving because the read shapes demand it — not because the diagram looked good.
6. **Only then, write scaling**: partition big tables (time-series → `pg_partman`), and if write QPS or working set truly exceeds one primary, shard by tenant with a directory (Q5), evaluating Citus before hand-rolling.
7. **Throughout**: every schema change ships expand-contract with the checklist (Q23), because none of the above matters if migrations take the site down.

Each rung buys roughly 5–10× on its dimension. Skipping rungs — "let's shard" while the top query is an unindexed `LIKE '%…%'` — is the anti-pattern this whole lesson exists to catch, and calling that out (politely, with the measurements) is most of the FDE job.
