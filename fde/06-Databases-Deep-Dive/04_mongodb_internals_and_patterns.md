# Lesson 6.4 — MongoDB Internals & Patterns: WiredTiger, Replica Sets, Sharding, Schema Design

> Module: Databases Deep Dive | Level: Senior | FDE Prep Phase 6

You already know how to write CRUD and aggregation queries. This lesson is about what happens underneath them — how WiredTiger actually stores and mutates data, what a replica set guarantees (and does not), when sharding saves you versus buries you, and how schema design decisions compound at scale. Senior MongoDB interviews are almost entirely about failure modes and trade-offs: expect every question here to be a "why" question wearing a "what" costume.

---

## Section 1 — WiredTiger Internals

### Q1. MongoDB claims "document-level locking." What actually happens when two operations update the same document concurrently?

**Answer:**

WiredTiger does not use document-level *locks* in the pessimistic sense. It uses **optimistic concurrency control**: both writers proceed against their own MVCC snapshot, and the one that commits second detects that the document version it read has changed and throws an internal `WriteConflict`. MongoDB catches that exception **inside the server** and transparently retries the entire operation (re-read, re-apply, re-commit). Your application never sees the conflict for ordinary single-document writes — it just sees latency.

Consequences that interviewers probe:

- **Hot documents serialize.** If 500 concurrent requests all `$inc` the same counter document, only one commits per round; the other 499 conflict, retry, conflict again. Effective throughput on one document collapses to roughly single-threaded speed, with CPU burned on retries. Document-level concurrency helps you only when writes are spread across *different* documents.
- **Intent locks still exist above WT.** MongoDB takes intent-shared/intent-exclusive locks at the global/database/collection level so DDL (index builds, `collMod`, drops) can coordinate with CRUD — but those almost never block normal CRUD against each other.
- **Inside multi-document transactions the retry is NOT automatic.** A `WriteConflict` inside an explicit transaction aborts the transaction and surfaces a `TransientTransactionError` label; *your driver/application* must retry (the `withTransaction` helper does this for you).

Observe conflicts:

```javascript
// mongosh — cumulative write conflicts since startup
db.serverStatus().metrics.operation.writeConflicts

// Per-operation: enable profiling and look at the writeConflicts field
db.setProfilingLevel(1, { slowms: 50 })
db.system.profile.find({ writeConflicts: { $gt: 0 } })
  .sort({ ts: -1 }).limit(5)
```

**Interview trap:** "MongoDB has document-level locking, so concurrent updates to one document run in parallel." No — concurrent updates to *one* document are effectively serialized through conflict-and-retry. The correct claim is that updates to *different* documents don't block each other. If a candidate designs a global counter document for a high-write system, this is the follow-up that sinks them (fix: shard the counter across N documents, or use `$inc` batching in the app).

### Q2. How does WiredTiger apply an update on disk? Why are growing documents a problem if there's no more "padding factor"?

**Answer:**

WiredTiger **never updates data in place**. Internals:

1. Each collection is a B+tree of pages. An update creates a new MVCC version of the document, appended to an in-memory update chain (skiplist) hanging off the page.
2. Readers traverse the chain and pick the version visible to their **snapshot** (their transaction's read timestamp). This is MVCC: readers never block writers and vice versa.
3. At **reconciliation** (checkpoint or eviction), WT merges the update chain into a brand-new page image and writes it to a *new* block on disk; the old block is marked free for reuse. Copy-on-write all the way down — this is also why WT needs no undo log for crash recovery.

Why growing documents are still bad even without MMAPv1's padding/moves:

- Every update rewrites the **entire document** into cache as a new version — a 5 KB `$push` onto a 10 MB document dirties ~10 MB of cache. Dirty cache pressure triggers aggressive eviction (Q5).
- Large update chains on hot pages make reconciliation expensive and can cause page splits and cache churn.
- Each replicated write ships through the oplog; oplog entries for array-append patterns grow with per-op cost.
- Hard ceiling: **16 MB per BSON document**. Hitting it turns writes into hard failures in production, usually at the worst possible time (see the war story under Q18).

Design rule: documents should reach a **stable size and shape** quickly. Unbounded growth (arrays that accrete forever) is the single most common Mongo schema mistake — the fix is bucketing or referencing (Section 4).

### Q3. Explain WiredTiger journaling and checkpoints. If the server loses power, exactly what survives?

**Answer:**

Two independent durability mechanisms:

- **Checkpoints:** every **60 seconds** (`storage.syncPeriodSecs`), WT writes a consistent snapshot of all data files to disk. A checkpoint is a durable, self-consistent restore point — after a crash, WT can always recover to the last completed checkpoint with zero journal.
- **Journal (write-ahead log):** between checkpoints, every write is also appended to the journal. The journal buffer is flushed to disk **every 100 ms** (`storage.journal.commitIntervalMs`, default 100) *or* immediately when a write arrives with `j: true` — a journaled write concern forces an fsync of the log batch containing that write before acknowledging.

Recovery after power loss = load last checkpoint + replay journal from the checkpoint's position. So:

| Scenario | What survives a power cut on that node |
|---|---|
| Write acknowledged with `j: true` (or `w: "majority"` with default `writeConcernMajorityJournalDefault: true`) | Survives. It was in the on-disk journal before ack. |
| Write acknowledged with `w: 1, j: false` | Survives only if it made a journal flush (≤100 ms window). Up to ~100 ms of acknowledged writes can vanish. |
| Unacknowledged / in-flight | May vanish entirely. |

```javascript
// mongosh — journaled write: ack only after the journal fsync
db.orders.insertOne(
  { sku: "A-100", qty: 2 },
  { writeConcern: { w: 1, j: true } }
)

// Checkpoint pressure / journal stats
db.serverStatus().wiredTiger.log            // journal (WT "log") activity
db.serverStatus().wiredTiger.transaction    // checkpoint timings: watch
// "transaction checkpoint most recent time (msecs)" — a checkpoint taking
// tens of seconds means dirty-cache or disk-throughput trouble.
```

**Interview trap:** "`j: true` means my write is durable, period." It means durable *on that node*. If that node was a primary that gets deposed before replication, the write is journaled, survives the crash — and is then **rolled back** when the node rejoins (Q8). Node-level durability (`j`) and cluster-level durability (`w: "majority"`) are orthogonal axes; you often need both.

### Q4. What compression does WiredTiger apply, and where? When would you switch from snappy?

**Answer:**

Two distinct mechanisms:

- **Block compression (collections):** each on-disk page/block is compressed as a unit. Default **snappy** (fast, ~2-3x). Alternatives: **zstd** (better ratio, moderate CPU — usually the right modern choice for large datasets) and **zlib** (best-known ratio historically, highest CPU; largely superseded by zstd). Data is *uncompressed in cache* — compression saves disk and I/O bandwidth, not RAM.
- **Prefix compression (indexes):** index keys are stored as deltas against the previous key on the page. Very effective for compound indexes and low-entropy prefixes (e.g., `{tenantId: 1, createdAt: 1}` — the tenantId repeats thousands of times and is stored once per run). Costs some CPU on index scans to reconstruct keys.

```javascript
// Per-collection block compressor at creation time
db.createCollection("events", {
  storageEngine: {
    wiredTiger: { configString: "block_compressor=zstd" }
  }
})

// Check compression effectiveness: storageSize (on disk) vs size (uncompressed BSON)
const s = db.events.stats()
print(`ratio: ${(s.size / s.storageSize).toFixed(2)}x`)
```

Decision table:

| Compressor | Ratio | CPU | Use when |
|---|---|---|---|
| snappy (default) | ~2-3x | Very low | Default; CPU-bound workloads |
| zstd | ~3-5x | Low-moderate | Large datasets, I/O-bound, storage cost matters |
| zlib | ~3-5x | High | Legacy only — prefer zstd |
| none | 1x | 0 | Already-compressed payloads (images, encrypted blobs) |

### Q5. How big is the WiredTiger cache, and what does cache/eviction pressure look like in production?

**Answer:**

Default cache = **max(50% of (RAM − 1 GB), 256 MB)**. On a 16 GB box: 7.5 GB. The rest of RAM is deliberately left for the OS filesystem cache (which holds *compressed* blocks — so a block miss in WT cache can still be served from OS cache without a disk read) and for connection/aggregation memory.

Eviction is governed by watermarks (defaults):

- **Eviction target 80% / trigger 95%** of cache used: background eviction threads work from 80%; at 95%, **application threads are drafted into doing eviction** before they can complete their own operation.
- **Dirty target 5% / trigger 20%**: same idea for dirty (not-yet-checkpointed) pages.

Symptoms of eviction pressure — the classic on-call signature:

- Sudden latency spikes on reads *and* writes with no query plan change.
- `db.serverStatus().wiredTiger.cache`: `"bytes currently in the cache"` pinned near max; rising `"pages evicted by application threads"` (that metric > 0 sustained is the smoking gun); high `"tracked dirty bytes in the cache"`.
- Tickets exhausted: `wiredTiger.concurrentTransactions` read/write `available` near 0 — operations queue *before* they even start.
- Often triggered by: a collection scan flooding the cache, an unbounded `$group`, a bulk migration, or simply working set outgrowing RAM.

Fixes in priority order: fix the offending query/index, shrink the working set (schema/TTL/archiving), then add RAM. Raising `cacheSizeGB` above 50% is rarely right — you starve the OS cache and connection memory.

**Interview trap:** "Reads are slow, so add read replicas." If the root cause is working set > cache, every secondary has the *same* cache size and the *same* working set (replication duplicates all data), so secondaries thrash identically. Cache pressure is fixed by schema, indexes, or vertical scaling — not by read fan-out (see Q9).

---

## Section 2 — Replica Sets

### Q6. Walk through a replica set election. What roles do terms, priorities, and majorities play?

**Answer:**

MongoDB's election protocol (pv1) is **Raft-like**:

- **Terms:** a monotonically increasing epoch counter. Every election attempt increments the term; a node votes at most once per term. Terms let nodes recognize stale primaries — a primary that sees a higher term steps down immediately.
- **Trigger:** a secondary that hasn't heard a primary heartbeat within `electionTimeoutMillis` (default **10 s**) calls an election. Before campaigning it runs a dry-run to avoid pointlessly bumping the term.
- **Vote condition:** nodes vote for a candidate only if the candidate's oplog is **at least as up-to-date** as their own (last opTime comparison). This ensures the winner has the most complete majority-committed history.
- **Majority:** the candidate needs votes from a **majority of voting members** (e.g., 2 of 3, 3 of 5). This is why even-node sets and 2-node sets are broken designs: 2 nodes → majority is 2 → one node down means no primary, only degraded read-only survival. Hence arbiters (voting, no data) — usable but discouraged because they weaken `w:"majority"` durability math.
- **Priorities:** `priority` biases *who* wins, not *whether* an election happens. `priority: 0` = never primary (analytics/DR nodes). A higher-priority healthy node that is caught up will call a **priority takeover** to reclaim primacy.

During the window (typically a few seconds with default settings): no primary, writes fail or buffer in the driver (`retryWrites: true` masks single failovers for idempotent-safe operations), reads continue per read preference.

```javascript
// mongosh — inspect election state
rs.status().members.map(m => ({ name: m.name, state: m.stateStr, term: m.optime?.t }))
cfg = rs.conf()
cfg.members[2].priority = 0        // analytics node: never primary
cfg.members[2].hidden = true
rs.reconfig(cfg)
```

### Q7. What is the oplog, why are its entries idempotent, and what happens when a secondary "falls off" it?

**Answer:**

The oplog (`local.oplog.rs`) is a capped collection of logical operations that secondaries pull and apply asynchronously. Key properties:

- **Idempotent by construction.** The server rewrites operations into a replayable form: `$inc: {n: 1}` is logged as the *resulting* `$set: {n: 42}` (or the v2 delta format that is equally idempotent); `updateMany` is logged as one entry **per matched document** by `_id`. This means applying an entry twice is harmless — essential because recovery and initial-sync catch-up may replay overlapping ranges.
- **Window = time span between oldest and newest entry.** It shrinks when write volume spikes (the capped collection holds fewer *seconds* of history). Size it so the window comfortably exceeds your longest plausible secondary outage + maintenance window + initial-sync duration — think many hours to days, not minutes.
- **Falling off:** if a secondary is down/lagged longer than the window, its sync position no longer exists in any member's oplog. It becomes STALE and cannot incrementally catch up — it must **initial sync**: drop all local data, recopy every collection, rebuild every index, then apply the oplog accrued *during* the copy. For a multi-TB node this takes many hours and hammers the sync source. If the write rate during initial sync outruns the oplog window, initial sync itself fails and loops.

```javascript
// mongosh — window monitoring (alert if this drops below your repair SLA)
const h = db.getSiblingDB("local").oplog.rs.stats()   // size info
rs.printReplicationInfo()      // "log length start to end" = window in seconds
rs.printSecondaryReplicationInfo()  // per-member lag

// Resize online (4.4+ can also auto-extend to keep the majority-commit point)
db.adminCommand({ replSetResizeOplog: 1, size: 51200 })  // 50 GB
```

**Interview trap:** "Replication lag is fine, it'll catch up eventually." Only while the lagging member's position is still *inside* the window. Lag approaching the oplog window is a pre-outage condition: cross it and "catch up" becomes "full re-clone," which can cascade (initial sync load slows the source, which grows lag elsewhere).

### Q8. A primary is network-partitioned, a new primary is elected, then the old primary rejoins. What happens to writes it accepted alone?

**Answer:**

They get **rolled back**. Sequence:

1. Old primary accepted writes with, say, `w: 1` — acknowledged to clients after applying locally, before replication.
2. Partition: majority side elects a new primary in a higher term. Both sides accept writes briefly (the old primary steps down after `electionTimeoutMillis` without majority contact — the window is seconds, not zero).
3. Old primary rejoins, sees the higher term, steps down to secondary, and compares oplogs to find the **common point** with the current primary.
4. Everything after the common point that the new primary's branch doesn't have is **undone** and the raw documents are dumped as BSON to `<dbPath>/rollback/<db>.<collection>/removed.<timestamp>.bson`. The node then resyncs forward from the common point.

Those rollback files are the only remaining copy of the acknowledged-but-lost writes. Nothing replays them automatically — a human must inspect them with `bsondump` and decide, business-case by business-case, what can be reconciled.

Prevention: `w: "majority"` writes **cannot be rolled back** — by definition they exist on a majority, and elections only pick a candidate that has all majority-committed writes. Also note that a rollback of more than 250 MB of data (or beyond configured limits) can make the node refuse to auto-recover, requiring manual resync.

**Production war story:** A payments team ran a 3-node replica set with default `w: 1` "because majority doubled our write latency." A top-of-rack switch flap isolated the primary for ~12 seconds. It kept accepting payment-capture writes for the first ~10 of those seconds; the other two nodes elected a new primary. On rejoin, **~1,400 acknowledged capture records were rolled back** into `removed.*.bson` files. Customers were charged (the payment gateway call had succeeded) but the system had no record. Recovery took two engineers three days: bsondump the rollback files, cross-reference gateway settlement reports, and hand-replay each record. Fix: `w: "majority"` for anything money-touching, `w: 1` retained only for telemetry. The latency "cost" of majority turned out to be 4 ms p50 — they had never measured it, only assumed it.

### Q9. Read preferences: when are secondary reads appropriate, and why aren't they a scaling silver bullet?

**Answer:**

| Preference | Routes to | Legit use |
|---|---|---|
| `primary` (default) | Primary only | Correctness-sensitive reads |
| `primaryPreferred` | Primary, else secondary | Availability > freshness during failover |
| `secondary` | Secondaries only | Analytics/reporting isolation, geo-local reads |
| `secondaryPreferred` | Secondary, else primary | Offload with fallback |
| `nearest` | Lowest ping member | Latency-sensitive, staleness-tolerant (geo) |

Why "just read from secondaries" fails as a scaling strategy:

1. **Stale reads.** Replication is async; a secondary read can miss your own committed write. Classic bug: POST creates a document via primary, the redirect's GET reads a secondary, user sees a 404 for their own data. (Mitigation: causal sessions, Q11.)
2. **No cache multiplication.** Every secondary stores 100% of the data and replays 100% of the writes. If the primary's working set doesn't fit in cache, neither does any secondary's — you've bought N copies of the same thrashing. Contrast with sharding, which actually *partitions* the working set.
3. **Write replay steals capacity.** Secondaries spend I/O and CPU applying the oplog; under heavy write load their spare read capacity is much less than a primary-sized node suggests, and reading from them adds cache competition that can *increase* their lag.
4. **Failure math changes.** If your read traffic only survives because two secondaries carry it, losing one is now a capacity incident, and elections promote a node you were using as a read workhorse.

```javascript
// Node.js driver — explicit, staleness-bounded secondary reads for analytics only
const coll = client.db("app").collection("orders", {
  readPreference: new ReadPreference("secondary", [{ dc: "east" }], { maxStalenessSeconds: 90 })
})
```

**Interview trap:** "We scaled reads by adding secondaries" is only correct when reads are staleness-tolerant AND the working set fits in cache AND the bottleneck was CPU/connection count on the primary — not when the bottleneck is the working set or write volume. A senior answer names which bottleneck secondary reads actually address.

### Q10. Build the write-concern durability matrix. What survives which failure?

**Answer:**

Write concern = when the server *acknowledges*; it never changes *whether* replication happens.

| Write concern | Ack means | Primary process crash (restarts) | Primary power loss | Primary deposed + rollback (Q8) | Latency |
|---|---|---|---|---|---|
| `{w: 0}` | Nothing (fire-and-forget) | May lose | May lose | May lose | Lowest |
| `{w: 1, j: false}` | Applied in primary's memory | Survives (journal replay usually covers it) | **May lose ≤ ~100 ms of acks** | **May lose** | Low |
| `{w: 1, j: true}` | In primary's on-disk journal | Survives | Survives *on that node* | **May lose (rolled back)** | +journal fsync |
| `{w: "majority"}` (journal on majority, the default coupling) | Journaled on a majority of voting members | Survives | Survives | **Cannot be rolled back** | +1 replication RTT |
| `{w: "majority", wtimeout: 5000}` | Same, bounded wait | Same | Same | Same — note `wtimeout` error **does not undo** the write; it may still commit | Bounded |

Read concerns (the read-side dual):

| Read concern | Guarantee | Cost / notes |
|---|---|---|
| `local` | Latest data on that node — may be rolled back later | Default on primary |
| `majority` | Only majority-committed data — will never be rolled back | Slightly stale; needs enough oplog/history retention |
| `snapshot` | All reads in a transaction see one majority-committed point in time | Transactions (and some single reads 5.0+) |
| `linearizable` | Real-time order for a single document; confirms the node is *still* primary before returning | Primary-only, single-document, issues a no-op majority round trip — expensive; reserve for locks/leases/config reads |

**Interview trap:** `wtimeout` firing is not a failure of the write — it's a failure to *confirm* the write in time. The document may still replicate and commit seconds later. Treating a `wtimeout` as "didn't happen" and retrying non-idempotent logic double-applies it. Correct handling: treat as *indeterminate*, then read back with `readConcern: "majority"` or design idempotent writes (unique keys / `upsert` on a request ID).

### Q11. How do you get read-your-own-writes when reads may hit a secondary? Show causal consistency in code.

**Answer:**

**Causally consistent sessions.** Every operation in the session carries the cluster time of the previous operation (`afterClusterTime`); a secondary serving a later read must wait until it has replicated *at least* to that point. You get: read-your-writes, monotonic reads, monotonic writes, writes-follow-reads — across primary and secondaries — without forcing everything to the primary.

Requirements: reads with `readConcern: "majority"` and writes with `w: "majority"` for the guarantees to hold across failover.

```javascript
// Node.js driver (v5/v6), MongoDB 6/7
const session = client.startSession({ causalConsistency: true });
try {
  const orders = client.db("app").collection("orders");

  await orders.insertOne(
    { _id: orderId, userId, status: "placed" },
    { session, writeConcern: { w: "majority" } }
  );

  // This read may be routed to a secondary — the session's afterClusterTime
  // forces the secondary to wait until it has replicated the insert above.
  const doc = await orders.findOne(
    { _id: orderId },
    {
      session,
      readPreference: "secondaryPreferred",
      readConcern: { level: "majority" }
    }
  );
  // doc is guaranteed non-null here.
} finally {
  await session.endSession();
}
```

Trade-off: a lagging secondary makes the causal read *wait* (added latency) instead of returning stale data. That is usually the right trade — but monitor lag, because causal reads convert staleness into latency spikes.

---

## Section 3 — Sharding

### Q12. Draw the sharded cluster architecture. What does each component actually do?

**Answer:**

- **Shards** — each a replica set holding a subset of the data (a set of chunk ranges).
- **Config servers (CSRS)** — a dedicated replica set storing cluster metadata: the chunk-to-shard routing table, shard registry, balancer state, auth data. Loss of CSRS majority = metadata frozen: routing continues from caches, but no chunk migrations, no DDL.
- **mongos** — stateless query routers. They cache the routing table (with a version; stale routers get a `StaleConfig` bounce and refresh), merge results from multiple shards, and run the merge parts of aggregations. Scale them horizontally next to app tiers.
- **Chunks** — contiguous shard-key ranges, the unit of data placement. Default chunk size 128 MB (6.0+; was 64 MB). Since 6.0 the balancer balances on **actual data size per shard**, not chunk counts, and splits happen as part of migration rather than eagerly.
- **Balancer** — background process (runs on the config server primary) that migrates chunks from over- to under-loaded shards. Migrations copy documents live, then sync deltas, then commit a metadata change; they consume I/O on both donor and recipient — schedule balancing windows off-peak for I/O-tight clusters.

```javascript
// mongosh via mongos
sh.status()                                    // shards, chunk distribution, balancer state
sh.enableSharding("app")
sh.shardCollection("app.events", { tenantId: 1, ts: 1 })
db.getSiblingDB("config").chunks.aggregate([   // chunk counts per shard for one collection
  { $match: { uuid: db.getCollectionInfos({ name: "events" })[0].info.uuid } },
  { $group: { _id: "$shard", chunks: { $sum: 1 } } }
])
```

### Q13. Hashed vs ranged shard keys — build the decision table, and explain the three properties of a good shard key.

**Answer:**

| Dimension | Ranged key | Hashed key |
|---|---|---|
| Equality query on key | Targeted (1 shard) | Targeted (1 shard) |
| **Range query on key** | Targeted (few shards) | **Scatter-gather (all shards)** — hash destroys order |
| Monotonic inserts (timestamps, ObjectId) | **Hot-spots the max-range shard** | Evenly distributed |
| Sort by key pushdown | Can use chunk order | No |
| Zone/geo sharding | Natural | Awkward |
| Typical fit | Multi-tenant compound keys, geo | Write-heavy ingest keyed by monotonic ID |

Three properties of a good shard key:

1. **Cardinality** — enough distinct values to split into many chunks. A `country` key with 50 values caps you at ~50 chunks forever; chunks that hold one giant key value can never split (→ jumbo, Q14).
2. **Frequency** — values should be evenly used. High cardinality doesn't help if 40% of documents share one value (the Justin Bieber problem applies to shard keys too).
3. **Non-monotonicity (for ranged keys)** — a monotonically increasing key (`_id` ObjectId, `createdAt`) means every insert lands in the current maximum chunk on one shard. You built a distributed system where **one shard takes 100% of insert load** and the balancer perpetually drags fresh chunks off it.

The usual senior answer is a **compound key**: a coarse-grained, well-distributed prefix for distribution + a fine-grained suffix for cardinality and in-shard ordering:

```javascript
// Multi-tenant SaaS: tenant routing + time ordering + splittability
sh.shardCollection("app.events", { tenantId: 1, ts: 1 })
// Queries with tenantId are targeted; within a tenant, ts gives locality.
// Caveat: a single monster tenant still concentrates on one shard →
// that's an outlier problem (Q19) or a candidate for a 3-field key.

// Pure ingest firehose, always fetched by deviceId equality:
sh.shardCollection("iot.readings", { deviceId: "hashed" })
```

**Interview trap:** "We used a hashed shard key so range scans spread the load evenly across shards — great for performance." Spreading a range scan across all shards is *scatter-gather*, the thing you're trying to avoid: every shard does work, the mongos merges, and cluster-wide throughput is bounded by every query touching every shard. Even distribution of **writes** is the hashed key's win; **range reads** are its loss. State both sides.

### Q14. What is a jumbo chunk, why can't the balancer move it, and how do you get into (and out of) that state?

**Answer:**

A chunk is flagged **jumbo** when it exceeds the max chunk size but **cannot be split because all its documents share one shard key value** — there is no key boundary to split on. The balancer refuses to migrate jumbo chunks (a migration must move a chunk atomically; moving multi-GB chunks would monopolize the cluster), so they pin themselves to whatever shard they're on. Enough jumbos and the balancer is rearranging deck chairs: shard sizes diverge and nothing can fix it.

Causes: low-cardinality shard keys, or high-frequency values under a high-cardinality key (one huge customer).

Escape paths, best to worst:

1. **`refineCollectionShardKey` (4.4+)** — add suffix fields to the key (`{customerId: 1}` → `{customerId: 1, orderId: 1}`). Existing chunks now *can* split on the new field. Metadata-only and fast, but data doesn't move until splits/migrations happen.
2. **`reshardCollection` (5.0+)** — full key change, rewrites the collection (Q16).
3. Manually clear the jumbo flag / adjust chunk size — cosmetic unless the underlying key is fixed.

**Production war story:** A logistics platform sharded its `shipments` collection on `{warehouseId: 1}` — "warehouse is how we query, and we have 30 of them." Cardinality 30. Two mega-warehouses generated ~60% of shipments; their chunks blew past the chunk size, couldn't split (single key value), got flagged jumbo, and welded themselves to two shards. Eighteen months later those two shards held 4 TB each while the other four held 400 GB, and adding shard number seven changed *nothing* — the balancer had no movable chunks that mattered. Symptoms had been visible for a year (`sh.status()` printing `jumbo: true`, one shard's disk alerts firing weekly) but were "known noise." Fix was a 5.0 `reshardCollection` to `{warehouseId: 1, shipmentId: 1}` — a weekend of double-writes-level I/O and a very careful capacity plan, versus the one-line key definition it would have been at design time.

### Q15. Targeted vs scatter-gather queries — how do you detect scatter-gather in explain output?

**Answer:**

- **Targeted:** the query filter contains the shard key (equality, or a range on a ranged key) → mongos consults the routing table and sends to only the owning shard(s).
- **Scatter-gather:** no shard key in the filter → mongos broadcasts to *every* shard and merges. Latency = slowest shard; cluster capacity is consumed N-fold. A workload that is mostly scatter-gather scales *worse* as you add shards (more fan-out, more merge).

```javascript
// mongosh — sharded on { tenantId: 1, ts: 1 }
db.events.find({ tenantId: "t42", ts: { $gte: ISODate("2026-07-01") } })
  .explain("executionStats")
```

Annotated shape of the output (trimmed):

```javascript
{
  queryPlanner: {
    winningPlan: {
      stage: "SINGLE_SHARD",          // <-- TARGETED: exactly one shard consulted.
      shards: [ { shardName: "sh-eu-2", winningPlan: { stage: "FETCH",
                  inputStage: { stage: "IXSCAN", keyPattern: { tenantId: 1, ts: 1 } } } } ]
    }
  }
}
```

Versus a query missing the shard key:

```javascript
db.events.find({ userId: "u9" }).sort({ ts: -1 }).explain("executionStats")
{
  queryPlanner: {
    winningPlan: {
      stage: "SHARD_MERGE_SORT",      // <-- SCATTER-GATHER: mongos merge-sorts
      shards: [ /* one entry PER SHARD — all of them */ ]   //     streams from every shard.
    }
  },
  executionStats: {
    executionStages: { stage: "SHARD_MERGE_SORT" },
    totalDocsExamined: 184000         // summed across ALL shards — the real cluster cost.
  }
}
// Stage vocabulary: SINGLE_SHARD (one shard), SHARD_MERGE (unordered merge of
// several shards), SHARD_MERGE_SORT (ordered merge). In aggregation explain,
// look at "mergeType": "mongos" vs a targeted single-shard plan, and at
// splitPipeline: which stages ran on shards vs on the merger.
```

Rule of judgment: a *rare* scatter-gather (admin dashboard) is fine. Your **hot path** must be targeted, which is why the shard key is chosen from the dominant query pattern, not from data-modeling aesthetics.

### Q16. When should you NOT shard? And what do reshardCollection and key refinement change about the calculus?

**Answer:**

Sharding costs: every query pattern now has a routing dimension; `unique` constraints only work as prefixes of the shard key; transactions and `$lookup` across shards are slower; backups, DDL and ops complexity multiply; scatter-gather creep silently eats the win. So:

**Don't shard when:**

| Situation | Better move |
|---|---|
| Data < ~1-2 TB and working set could fit in RAM of a bigger box | **Vertical scaling** — RAM is cheaper than distributed-systems engineering |
| Slow queries | Indexes, schema redesign, aggregation optimization first |
| "Big" collection that's mostly cold history | TTL / archival tier / time-partitioned collections |
| Read throughput only, staleness-tolerant | Secondary reads (with Q9 caveats) |
| Unbounded-array or fat-document pain | Schema patterns (Section 4) — sharding replicates the mistake N times |

The "we sharded at 50 GB" mistake: a team hits query latency at 50 GB, assumes "big data," shards on `_id: "hashed"` across 4 shards. Latency barely improves — because the problem was two missing indexes and a 100-document average `$lookup` — and now every deploy, migration, and unique-constraint discussion involves a sharded cluster. 50 GB fits in the cache of one mid-size instance. Sharding is for when a *correctly indexed, correctly modeled* workload exceeds what the biggest sensible node can serve — usually multi-TB or extreme write ingest.

What changed the risk profile:

- **`refineCollectionShardKey` (4.4+):** append suffix fields to an existing key. Cheap, metadata-level, fixes splittability/jumbo issues. Cannot change or remove existing fields.
- **`reshardCollection` (5.0+, much improved in 7.x/8.0):** full online key change — cluster clones the collection under the new key while tailing changes, then cuts over (sub-second block at commit). Needs ~2x storage headroom and sustained I/O for the duration. A wrong shard key is no longer a dump-and-restore catastrophe, but it's still a planned, resource-heavy operation — days of elevated load on large collections, not a click.

```javascript
// mongosh (7.x): online reshard
db.adminCommand({
  reshardCollection: "app.shipments",
  key: { warehouseId: 1, shipmentId: 1 }
})
// Monitor: db.getSiblingDB("admin").aggregate([{ $currentOp: {} },
//   { $match: { type: "op", "originatingCommand.reshardCollection": { $exists: true } } }])
```

---

## Section 4 — Schema Design Patterns

### Q17. Embed or reference? Give the full decision framework, not the folklore.

**Answer:**

The driving question is never "what's the relationship cardinality" — it's **"what does the application read and write together, and does the embedded thing grow without bound?"**

| Question | Points to embed | Points to reference |
|---|---|---|
| Read together in the hot path? | Almost always yes → embed | Read independently → reference |
| Growth **bounded**? (order lines: yes; comments: no) | Bounded, small (≲ 100s of subdocs) → embed | Unbounded → reference (or bucket) |
| Update frequency of the child vs parent | Child rarely updated → embed | Child hot / concurrently updated by many actors → reference (avoid Q1 hot-doc contention + full-doc rewrite, Q2) |
| Child queried/indexed on its own? | No → embed | Yes ("all comments by user X") → reference |
| Child shared across parents? | No (address on an order — snapshot semantics are a *feature*) | Yes, and edits must propagate → reference |
| Document size trajectory | Stays well under ~1 MB typical | Approaching MBs → reference/bucket |
| Atomicity needs | Embed = free single-document atomicity | Reference = needs transactions for cross-doc invariants |

Rules of judgment:

- Default to embedding for data owned by and read with the parent; MongoDB's whole performance model (one seek returns the working unit) rewards it.
- "Unbounded" is the veto word. Any array that grows with *time* or with *user activity* (events, logs, followers, messages) must not be embedded — see Q18.
- Denormalized snapshots are often *correct* semantics, not a compromise: the shipping address on a 2024 order should NOT change when the user moves in 2026.

**Production war story:** A chat product embedded `messages: []` in each conversation document. Demo-perfect: one read renders a conversation. In production, group chats grew; at ~8 MB per hot conversation, every new message meant WiredTiger rewriting an 8 MB document (Q2), replication shipping fat oplog entries, and p99 send-latency hitting 900 ms. Then a customer-support broadcast thread crossed **16 MB and every send returned `BSONObjectTooLarge`** — messaging hard-down for the biggest customer, and no quick fix because the schema was load-bearing everywhere. Emergency remediation: a `messages` collection keyed `{conversationId: 1, seq: 1}` plus a lastMessages cache of 20 embedded messages for list-view rendering — i.e., the bucket/extended-reference design they'd have chosen up front if anyone had asked "what does this array look like after two years of a successful product?"

### Q18. Explain the bucket pattern with a worked IoT example. What exactly does it buy you?

**Answer:**

Bucket pattern: instead of one document per event (billions of tiny docs, giant indexes) or one document per device (unbounded array, Q17 war story), group events into **fixed-size, bounded documents** — e.g., one doc per device per hour, capped at N readings.

```javascript
// One bucket per device-hour, hard-capped at 200 readings
{
  _id: "sensor-4711:2026-07-04T13",
  deviceId: "sensor-4711",
  bucketStart: ISODate("2026-07-04T13:00:00Z"),
  count: 3,
  // pre-aggregates maintained on the way in (computed pattern, Q19):
  sum: 71.1, min: 23.1, max: 24.4,
  readings: [
    { ts: ISODate("2026-07-04T13:00:12Z"), temp: 23.1 },
    { ts: ISODate("2026-07-04T13:01:12Z"), temp: 23.6 },
    { ts: ISODate("2026-07-04T13:02:12Z"), temp: 24.4 }
  ]
}
```

```javascript
// mongosh — append with a size guard: the filter only matches a non-full
// bucket; upsert creates the next one when full. count < 200 keeps growth BOUNDED.
db.readings.updateOne(
  { _id: "sensor-4711:2026-07-04T13", count: { $lt: 200 } },
  {
    $push: { readings: { ts: new Date(), temp: 24.0 } },
    $inc:  { count: 1, sum: 24.0 },
    $min:  { min: 24.0 },
    $max:  { max: 24.0 },
    $setOnInsert: { deviceId: "sensor-4711", bucketStart: ISODate("2026-07-04T13:00:00Z") }
  },
  { upsert: true }
)
// Note: if the bucket is full the filter matches nothing and upsert tries to
// insert _id "sensor-4711:2026-07-04T13" again → duplicate key. Real
// implementations add a bucket sequence number to _id and retry on E11000.
```

What it buys: ~200x fewer documents → index entries per reading collapse (the index stores one entry per *bucket*); range reads become a handful of sequential doc fetches; documents are bounded so update cost is stable; pre-aggregates make dashboard queries index-only-cheap. Costs: insert logic complexity, in-bucket queries need `$filter`/`$unwind`, and deletes/updates of individual readings are awkward.

Modern note: MongoDB 5.0+ **time-series collections** implement bucketing natively (columnar-compressed buckets, transparent query rewriting). For greenfield metrics workloads, reach for those first; hand-rolled buckets remain relevant for mixed read/write patterns time-series collections don't support (e.g., updating past readings) and as the interview-canonical explanation of *why* bucketing works.

### Q19. Outlier, computed, and extended reference patterns — what problem does each solve?

**Answer:**

**Outlier pattern — "the Justin Bieber problem."** You embed `followers: []` on user documents. p99 of users have < 500 followers; embedding is perfect for them. Then one account has 90 million. Designing the *whole schema* around the outlier (reference everything) punishes the 99%. Instead: keep the embed, add a flag, and overflow the exceptional cases:

```javascript
// Normal user — embedded, one read
{ _id: "u1", name: "…", followers: ["u2", "u9"], followerCount: 2 }

// Outlier — flag set, array truncated, overflow in a side collection
{ _id: "celeb1", name: "…", followers: [/* first 1000 */],
  followerCount: 90_000_000, hasOverflow: true }

// followers_overflow: bucketed continuation docs
{ _id: "celeb1:2", userId: "celeb1", followers: [/* next 20k */] }
```

Application logic checks `hasOverflow` and takes the slow path only for outliers. The judgment point: **model for the typical case, handle the tail explicitly** — don't let the tail dictate the schema.

**Computed pattern.** Pre-compute at write time what you'd otherwise aggregate at read time: maintain `followerCount`, `avgRating`, `sum/min/max` on the parent with `$inc`/`$min`/`$max` alongside the source write. Reads become O(1). Two contention caveats: (a) a single hot counter document serializes under WT conflict-retry (Q1) — for very hot counters, split into N random sub-counter docs and sum on read; (b) if exactness matters, keep counters in the same document as the data (atomic) or use a transaction; otherwise accept eventual reconciliation via a periodic recount job.

```javascript
// Hot-counter sharding: 16 sub-docs instead of one
db.counters.updateOne(
  { _id: `pageviews:home:${Math.floor(Math.random() * 16)}` },
  { $inc: { n: 1 } }, { upsert: true })
// Read: db.counters.aggregate([{ $match: { _id: /^pageviews:home:/ } },
//                              { $group: { _id: null, n: { $sum: "$n" } } }])
```

**Extended reference pattern.** A reference, but you copy the 2-3 child fields the hot path displays, killing the `$lookup`:

```javascript
// Order embeds just what the order page renders — not the whole customer
{ _id: "o1", customer: { _id: "c42", name: "Acme GmbH", tier: "gold" },
  lines: [ /* … */ ] }
```

Cost: duplicated fields go stale when the customer renames. Mitigations, in order of preference: (1) copy only fields that are immutable or where snapshot semantics are acceptable; (2) fan-out update on change (cheap if renames are rare); (3) reconcile via change streams (Section 6). The pattern is a *bet that reads vastly outnumber updates of those specific fields* — say that sentence in the interview.

### Q20. Schema versioning, and the top MongoDB anti-patterns you'd flag in a design review.

**Answer:**

**Schema versioning pattern.** Schemaless storage ≠ schemaless application. When shape changes, don't run a big-bang migration over 2 TB; stamp documents and migrate lazily:

```javascript
// Writers always produce the latest shape
{ _id: "u1", schemaVersion: 3, name: { first: "Ada", last: "L" }, …}

// Readers tolerate all live versions
function normalizeUser(doc) {
  if (!doc.schemaVersion || doc.schemaVersion < 3) {
    const [first, ...rest] = (doc.name || "").split(" ")   // v1/v2: name was a string
    doc.name = { first, last: rest.join(" ") }
    doc.schemaVersion = 3
  }
  return doc
}
// Plus: write-back on read (opportunistic upgrade), and a low-priority
// background job that walks {schemaVersion: {$lt: 3}} to finish the tail,
// so version-tolerant code can eventually be deleted. An index on
// schemaVersion (or a partial index on old versions) keeps the job cheap.
```

Anti-patterns checklist for design review:

| Anti-pattern | Why it hurts | Fix |
|---|---|---|
| **Unbounded arrays** | Doc growth → full rewrites, cache dirtying, 16 MB ceiling (Q2, Q17) | Bucket / reference; hard cap with `$slice` |
| **Collection-per-tenant/user at scale** (10k+ collections) | Per-collection WT files + in-memory handles; checkpoint and open-file pressure; dropped-collection churn | Single collection + `tenantId` (indexed or shard key prefix) |
| **Relational modeling with `$lookup` everywhere** | Every read is a distributed join; loses Mongo's one-seek advantage; unshardable hot paths | Model around access patterns: embed / extended reference |
| Massive low-selectivity indexes ("index every field") | Write amplification: every index is another B+tree updated per write; cache eaten by index pages | Index for actual queries; compound indexes with ESR (equality, sort, range) ordering |
| `$where` / JS execution, negation-only filters | No index use, per-doc interpreter cost | Expressible operators + indexes |
| Storing large blobs in documents | Cache pollution, doc-size ceiling | Object storage + URL; GridFS only if you must |
| One-document "config/state" written by everyone | Hot-doc serialization (Q1) | Split state; sub-counters |

**Interview trap:** "MongoDB is schemaless, so migrations aren't a thing." Every long-lived Mongo system has *implicit* schema spread across reader code. The senior answer is explicit versioning + lazy migration + JSON Schema validation (`validator: { $jsonSchema: … }`, `validationLevel: "moderate"` so legacy docs don't break writes) to stop new drift while old shapes are drained.

---

## Section 5 — Aggregation Pipeline Optimization

### Q21. What does the aggregation optimizer reorder for you, what must you order yourself, and where do the memory limits bite?

**Answer:**

Automatic optimizations (verify with `explain`, don't assume):

- **`$match` promotion:** a `$match` is swapped ahead of `$project`/`$addFields`/`$unset` when it doesn't depend on computed fields, and ahead of `$sort` (match-then-sort). A `$match` after `$unwind` on non-array-dependent predicates moves before the `$unwind`.
- **Coalescence:** consecutive `$match` merge into one; `$sort` + `$limit` fuse into a top-k sort that keeps only `limit` docs in memory; `$lookup` + immediately-following `$unwind` of the joined field fuse (join streams instead of materializing the array); consecutive `$skip`/`$limit` combine.
- **Dependency analysis:** the pipeline computes which fields later stages need and applies an implicit projection at the cursor, so a trailing `$project` still reduces documents fetched.

What the optimizer will NOT do for you:

- **Indexes are only usable at the head of the pipeline.** A leading `$match` and/or `$sort` (in index-compatible order, before any reshaping stage) can run as an `IXSCAN`; once any stage transforms documents (`$group`, `$unwind`, `$project` with computation), everything downstream is index-blind. Structure pipelines as: `$match` → `$sort` → `$limit` → *then* reshape.
- It won't fix a `$lookup` per document. `$lookup` is a nested-loop join — for each input doc, a query against the foreign collection (index the foreign field or die). `$lookup` fanning out on your hottest path is usually a sign the schema wants an extended reference or embed (Q19), not a faster join.
- It won't pick your `$group` key's index — `$group` never uses indexes for grouping (a covered `DISTINCT_SCAN` special case aside).

Memory rules:

- Each blocking stage (`$group`, `$sort` without index, `$setWindowFields`, …) has a **100 MB** RAM limit. Historically you opted into spilling with `allowDiskUse: true` (older server/docs called the internal knob `allowSpillToDisk`); on modern servers (6.0+) `allowDiskUseByDefault` is **true**, so stages spill to `_tmp` on disk automatically — meaning the failure mode changed from *error* (`QueryExceededMemoryLimitNoDiskUseAllowed`) to *silent 10-100x slowdown*. Treat spills as a red flag in `explain` (`usedDisk: true`), not a solved problem.
- `$facet` runs sub-pipelines over the same input docs; each sub-pipeline has its own memory budget, but the stage's output is a **single document** — so a `$facet` aggregating big result sets can hit the 16 MB BSON limit on output. Use it for dashboard-style "counts + top-10 + histogram in one round trip," not for bulk data.

```javascript
// Aggregation explain with real runtime numbers:
db.orders.explain("executionStats").aggregate([...pipeline])
// Key fields: stages[0].$cursor.queryPlanner.winningPlan (IXSCAN vs COLLSCAN),
// per-stage executionTimeMillisEstimate, and any "usedDisk": true.
```

### Q22. Worked example: take a slow pipeline and optimize it. Show before/after with explain evidence.

**Answer:**

Requirement: "revenue by day for tenant t42, June 2026, delivered orders."

```javascript
// BEFORE — naive pipeline (as often produced by ORMs / copy-paste)
db.orders.aggregate([
  { $lookup: { from: "customers", localField: "customerId",
               foreignField: "_id", as: "customer" } },          // joins EVERY order
  { $unwind: "$customer" },
  { $addFields: { day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } } } },
  { $match: { "customer.tenantId": "t42",                        // filter AFTER join
              status: "delivered",
              createdAt: { $gte: ISODate("2026-06-01"), $lt: ISODate("2026-07-01") } } },
  { $group: { _id: "$day", revenue: { $sum: "$total" } } },
  { $sort: { _id: 1 } }
])
```

Explain, annotated (trimmed):

```javascript
// stages[0].$cursor.queryPlanner.winningPlan.stage: "COLLSCAN"
//   → nothing filterable reached the cursor: the first stage is $lookup, so the
//     optimizer CANNOT hoist the later $match past it (it depends on the join
//     for customer.tenantId, and the reshaping blocks the rest).
// executionStats.totalDocsExamined: 12,400,000      // every order ever
// $lookup executionTimeMillisEstimate: 748,000       // 12.4M index lookups on customers
// $group "usedDisk": true                            // spilled: grouping keys for all history
// total: ~790s
```

Fixes: (1) the tenant lives on the order itself in this system (`tenantId` field — the `$lookup` was fetching data we already had; and if it truly didn't exist, that's an extended-reference candidate); (2) filter first; (3) let an index serve the match; (4) group with `$dateTrunc` instead of string formatting.

```javascript
// Supporting index — ESR: equality fields, then range
db.orders.createIndex({ tenantId: 1, status: 1, createdAt: 1 })

// AFTER
db.orders.aggregate([
  { $match: { tenantId: "t42", status: "delivered",
              createdAt: { $gte: ISODate("2026-06-01"), $lt: ISODate("2026-07-01") } } },
  { $group: { _id: { $dateTrunc: { date: "$createdAt", unit: "day" } },
              revenue: { $sum: "$total" } } },
  { $sort: { _id: 1 } }
])
```

```javascript
// stages[0].$cursor.queryPlanner.winningPlan:
//   stage: "PROJECTION_COVERED" ← the implicit dependency projection
//     inputStage: { stage: "IXSCAN",  // (tenantId, status, createdAt, total not
//       keyPattern: { tenantId: 1, status: 1, createdAt: 1 } }
//   (add total to the index to make it fully covered; else FETCH appears)
// totalKeysExamined: 41,203   totalDocsExamined: 41,203 (or 0 if covered)
// $group: usedDisk: false     // ≤31 groups (days), trivially in memory
// total: ~140ms  → ~5,600x. The win was NOT a faster join — it was deleting the
// join and letting the index bound the working set before any reshaping.
```

**Interview trap:** "We added `allowDiskUse: true` and the error went away." That converts an out-of-memory *error* into a disk-spilling *slow query* — and on 6.0+ it happens by default, so nobody even sees the moment the pipeline started spilling. The fix for a spilling `$group`/`$sort` is reducing input cardinality (earlier `$match`, pre-aggregation via the computed/bucket pattern, `$sort`+`$limit` fusion), not blessing the spill.

---

## Section 6 — Change Streams

### Q23. How do change streams work under the hood, and what are resume tokens and fullDocument options?

**Answer:**

A change stream is a **server-side tailable cursor over the oplog**, wrapped in a real API: it filters to your target (collection/db/cluster), decodes entries into typed events (`insert`, `update`, `replace`, `delete`, `invalidate`, DDL events in 6.0+), and — crucially — only emits **majority-committed** changes, so you can never observe an event that later gets rolled back (Q8). This is why change streams require the majority read concern machinery to be available on the replica set. On sharded clusters, mongos opens a stream on every shard and merges events by cluster time.

**Resume tokens.** Every event carries `_id: { _data: <opaque token> }` encoding the oplog position. Persist the token durably after processing each event; on restart, pass it back:

- `resumeAfter: token` — resume strictly after that event. Does not work past an `invalidate` (collection drop/rename).
- `startAfter: token` — like resumeAfter but can cross an invalidate (for resuming after a collection was recreated).
- `startAtOperationTime: <ts>` — resume from a cluster timestamp when you have no token.

A resume only works while the token's position **still exists in the oplog** (see Q24). MongoDB 6.0+ can extend retention independent of oplog size via `changeStreamOptions.preAndPostImages.expireAfterSeconds` for images, but the stream position itself is still oplog-bound.

**fullDocument options** (for `update` events, which otherwise carry only the delta in `updateDescription`):

| Option | Behavior | Caveat |
|---|---|---|
| default (`"default"`) | Delta only (`updateDescription`) | You reconstruct state yourself |
| `"updateLookup"` | Server re-fetches the doc at *read time* | **Not point-in-time**: a later update's state can appear on an earlier event; doc may be null if deleted since |
| `"whenAvailable"` / `"required"` (6.0+) | True **post-image** stored at write time | Requires `collMod: { changeStreamPreAndPostImages: { enabled: true } }`; costs write amplification + retention storage |
| `fullDocumentBeforeChange: "whenAvailable"/"required"` | **Pre-image** (state before the update/delete) | Same enablement; the only way to know what a delete removed |

Use cases: cache invalidation, Elasticsearch/warehouse sync, event fan-out to Kafka, cross-service materialized views, audit trails (pre-images) — anywhere you'd otherwise poll or double-write.

**Interview trap:** "`updateLookup` gives me the document as it was for that event." It gives you the document *as it is now-ish*. For a burst of 5 updates to one doc, all 5 events can carry the final state — an ES-sync consumer is fine (idempotent last-write-wins), but an event-sourcing or diff-computing consumer is silently wrong. If you need per-event state, you need 6.0 post-images or delta application.

### Q24. Change stream pitfalls in production, and a Node.js consumer done right.

**Answer:**

Pitfalls:

1. **Falling off the oplog.** A consumer down longer than the oplog window resumes with a `ChangeStreamHistoryLost` error — events are *gone*. A change-stream consumer is exactly like a secondary in Q7. Mitigation: alert on consumer lag vs oplog window; on token loss, run a full re-sync (you designed for that, right?) rather than silently `startAtOperationTime: now`.
2. **Ordering across shards.** Within one stream, mongos merges shard events by cluster time, so you get a consistent merged order — but: events sharing a cluster time have no defined relative order, mongos must **wait for every shard** to report up to time T before emitting T (one idle or lagging shard stalls the entire stream — historically mitigated by periodic no-op writes; newer versions handle idle shards better), and two *independently opened* streams may interleave differently. Never build cross-document invariants on observed event order across shards.
3. **Stream fan-out load.** Each change stream is an oplog-tailing cursor doing server-side filtering. Hundreds of streams (e.g., one per tenant, one per app pod) each scan the *full* oplog stream to filter it. Pattern: **one consumer, fan out downstream** (Kafka/Redis pub-sub), not N streams.
4. **Processing guarantees are on you.** Resume tokens give at-least-once *only if* you persist the token *after* durably processing the event. Token-before-processing = at-most-once (data loss on crash). Consumers must be idempotent.
5. `updateLookup` staleness (Q23) and `invalidate` on DDL (use `startAfter`).

```javascript
// Node.js (driver v6, MongoDB 7) — resumable, idempotent change stream consumer
import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGO_URI, { appName: "es-sync" });
const db = client.db("app");
const checkpoints = db.collection("stream_checkpoints"); // durable token store

async function processEvent(event) {
  // Idempotent downstream write: keyed on documentKey, last-write-wins.
  await indexToElasticsearch(event.documentKey._id, event.fullDocument);
}

async function run() {
  await client.connect();
  const saved = await checkpoints.findOne({ _id: "orders-sync" });

  const stream = db.collection("orders").watch(
    [ { $match: { operationType: { $in: ["insert", "update", "replace", "delete"] } } } ],
    {
      fullDocument: "whenAvailable",          // 6.0+ post-images (collMod-enabled)
      fullDocumentBeforeChange: "whenAvailable",
      ...(saved ? { startAfter: saved.token } : {})  // survives invalidate too
    }
  );

  try {
    for await (const event of stream) {
      await processEvent(event);                       // 1. process durably…
      await checkpoints.updateOne(                     // 2. …THEN checkpoint.
        { _id: "orders-sync" },
        { $set: { token: event._id, at: new Date() } },
        { upsert: true }
      );  // order = at-least-once; processEvent's idempotency absorbs replays
    }
  } catch (err) {
    if (err.codeName === "ChangeStreamHistoryLost") {
      // Token aged off the oplog: resuming is impossible. Trigger full re-sync,
      // THEN restart streaming from a token captured before the re-sync scan.
      await fullResyncAndReset(checkpoints);
    } else if (err.hasErrorLabel?.("ResumableChangeStreamError")) {
      // Transient (failover, network): driver auto-resumes most of these
      // inside the for-await; if it surfaces, just restart the loop.
    }
    setTimeout(run, 1000);                             // restart with backoff
    return;
  }
}

run().catch(console.error);
```

Design notes worth saying out loud in an interview: the checkpoint collection lives in MongoDB so token persistence shares the cluster's durability (`w:"majority"` it if the consumer is critical); checkpoint-after-process plus idempotent processing is the standard exactly-once-effect construction; and the `ChangeStreamHistoryLost` branch is the difference between a demo and a production consumer.

---

## Quick-Reference: Decision Tables

**Durability ladder (write path):**

| Need | Setting |
|---|---|
| Telemetry, loss-tolerant | `w:1` |
| Anything user-visible | `w:"majority"` |
| Money / irreversible side effects | `w:"majority"` + idempotency keys + read-back on `wtimeout` |
| Leases/locks reads | `readConcern: "linearizable"` on primary |

**Scaling ladder (in order — skipping steps is the classic failure):**

1. Fix queries and indexes (explain-driven).
2. Fix schema (bounded docs, access-pattern modeling, computed/bucket patterns).
3. Vertical scaling until the working set no longer fits a sensible box.
4. Secondary reads only for staleness-tolerant, cache-resident workloads.
5. Shard — with a compound key derived from the dominant query pattern, knowing resharding exists but is expensive.

**Pattern selector:**

| Symptom | Pattern |
|---|---|
| Array grows with time/activity | Bucket (or native time-series) |
| 1% of parents have 1000x children | Outlier |
| Read-time aggregation on hot path | Computed (mind hot-counter contention) |
| `$lookup` for 2 display fields | Extended reference |
| Shape drift across years | Schema versioning + lazy migration |
