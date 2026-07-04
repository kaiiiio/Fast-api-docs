# Lesson 6.1 — PostgreSQL Internals: How Postgres Actually Works

> Module: Databases Deep Dive | Level: Senior | FDE Prep Phase 6

Senior interviews don't test whether you can write a JOIN — they test whether you understand *why* Postgres behaves the way it does under load: why connections are expensive, why a table keeps growing after deletes, why the same query is fast at 10am and slow at 2pm, and what actually happens between `COMMIT` and durable-on-disk. As an FDE you'll be dropped into a customer's degraded database and expected to reason from internals (MVCC, WAL, vacuum, the planner) rather than cargo-cult config changes. Coming from MongoDB, the biggest mental shifts are: Postgres is process-based (not event-loop, not thread pool), versioned rows live *in the table itself*, and durability is a WAL story, not a replica-ack story.

---

## Section 1 — Process Model & Memory Architecture

### Q1. Walk me through what happens, process-wise, when a client connects to Postgres. How is this different from a threaded server or Node's event loop?

**Answer:**

Postgres uses a **process-per-connection** model:

1. The **postmaster** (the parent `postgres` process) listens on port 5432. It does almost no work itself — it's a supervisor.
2. On a new TCP connection, the postmaster `fork()`s a dedicated **backend process**. That process handles *everything* for that one connection: parsing, planning, executing, returning rows. It lives until the client disconnects.
3. All backends coordinate through **shared memory**: the shared buffer pool, lock tables, the procarray (list of running transactions), and WAL buffers. IPC happens via shared memory + lightweight locks (LWLocks), not message passing.
4. Alongside client backends run **background workers**:
   - **checkpointer** — flushes all dirty buffers at checkpoints
   - **background writer (bgwriter)** — trickles dirty buffers to disk between checkpoints so backends rarely have to evict-and-write themselves
   - **walwriter** — flushes WAL buffers to disk on a timer
   - **autovacuum launcher** — spawns autovacuum workers per table
   - plus stats collector, logical replication workers, parallel query workers

Contrast with models you know:

| Model | Concurrency unit | Isolation | Cost per connection | Failure blast radius |
|---|---|---|---|---|
| Postgres | OS process per connection | Full memory isolation | High (~MBs + fork + scheduling) | One backend crash → postmaster resets *all* backends (shared memory may be corrupt) |
| MySQL / SQL Server | Thread per connection | Shared address space | Moderate | Thread crash can take the whole server |
| Node.js | Single event loop + async I/O | N/A (one heap) | Tiny (a socket + closure state) | One sync loop blocks everyone |

The Node comparison matters for intuition: in Node, 5,000 idle sockets are nearly free. In Postgres, 5,000 connections are 5,000 OS processes the kernel must schedule, each holding per-backend caches. This single design fact is *why connection pooling exists* (Q16–Q18).

**Interview trap:** "Postgres forks a process per query." No — per **connection**. The backend is reused for every query on that connection. Also, parallel query workers are extra processes spawned per *query* (for eligible plans), which is a different mechanism — conflating the two is a common tell.

### Q2. What's the difference between the checkpointer and the background writer? Why have both?

**Answer:**

Both write dirty pages from shared buffers to disk, but with different jobs:

- **Checkpointer**: at each checkpoint, writes *every* dirty buffer that existed at checkpoint start, then fsyncs data files and records the checkpoint in WAL. This bounds crash-recovery time — recovery only replays WAL from the last checkpoint. It's a correctness/recovery mechanism.
- **Bgwriter**: opportunistically writes *some* dirty, soon-to-be-evicted buffers between checkpoints. It's a latency smoother: without it, a backend needing a free buffer would have to write out a dirty page itself (adding disk write latency to a client query).

If you see backends doing their own writes, bgwriter is falling behind:

```sql
-- PG 15 and earlier: pg_stat_bgwriter; PG 17+: split into pg_stat_checkpointer / pg_stat_io
SELECT checkpoints_timed,      -- good: checkpoints triggered by checkpoint_timeout
       checkpoints_req,        -- bad if high: forced early by max_wal_size pressure
       buffers_checkpoint,     -- written by checkpointer
       buffers_clean,          -- written by bgwriter
       buffers_backend         -- written by ordinary backends (want this LOW)
FROM pg_stat_bgwriter;
```

Rule of thumb: `checkpoints_req` should be near zero in steady state, and `buffers_backend` should be small relative to the other two.

### Q3. Explain shared_buffers vs the OS page cache. Why is the common advice "25% of RAM" and not 90%?

**Answer:**

Postgres does buffered I/O through the filesystem, so every page can be cached **twice**:

- **shared_buffers**: Postgres's own buffer pool in shared memory. Pages here are in Postgres format, with usage counts driving a clock-sweep eviction algorithm. All reads/writes of table and index pages go through it.
- **OS page cache**: the kernel caches the same file blocks. A "read" that misses shared_buffers may still be served from RAM by the kernel (`Buffers: shared read` in EXPLAIN does **not** necessarily mean physical disk I/O).

This is **double buffering** — the same hot page occupying RAM twice. That's why you don't give Postgres 90% of RAM like you might with a direct-I/O database (Oracle with `O_DIRECT`, or InnoDB's buffer pool): you'd starve the OS cache that Postgres implicitly relies on for sequential scans, WAL writes, temp files, and everything vacuum touches. The 25% starting point balances the two caches; on very large machines people land anywhere from 8GB to ~40% depending on workload, measured via cache hit ratios:

```sql
SELECT sum(heap_blks_hit) * 100.0 / nullif(sum(heap_blks_hit) + sum(heap_blks_read), 0)
       AS shared_buffers_hit_pct
FROM pg_statio_user_tables;   -- note: "read" may still be an OS-cache hit
```

**Interview trap:** claiming `effective_cache_size` allocates memory. It allocates **nothing** — see Q4. Similarly, "increase shared_buffers to fix slow queries" without evidence is junior reasoning; if the working set already fits, more shared_buffers just increases checkpoint work and double buffering.

### Q4. work_mem, maintenance_work_mem, effective_cache_size — what does each actually control, and what's the classic work_mem mistake?

**Answer:**

| Setting | What it bounds | Scope | Typical failure mode |
|---|---|---|---|
| `work_mem` | Memory per **sort/hash operation** before spilling to temp files on disk | Per plan node, per backend — **not per query, not global** | OOM when raised globally on high-concurrency systems |
| `maintenance_work_mem` | Memory for VACUUM, CREATE INDEX, ALTER TABLE ADD FK | Per maintenance operation (autovacuum workers use `autovacuum_work_mem` if set) | Vacuum making multiple index passes because dead-TID array didn't fit |
| `effective_cache_size` | Nothing. **Planner hint only** — estimate of shared_buffers + OS cache | Planner costing | Set too low → planner unfairly penalizes index scans, prefers seq scans |

The classic mistake: "our sorts spill to disk, set `work_mem = 256MB`". The real budget is roughly:

```
worst case memory ≈ work_mem × concurrent_backends × sort/hash nodes per plan
                    (× hash_mem_multiplier for hash nodes, default 2.0 since PG 13)
```

A single query with 4 hash joins and 2 sorts can use ~6× work_mem. 200 connections × 256MB × a few nodes = machine dead. Senior answer: keep the global default modest (4–64MB), and raise it **per session or per role** for known heavy queries:

```sql
SET work_mem = '512MB';           -- this session only
ALTER ROLE analytics_ro SET work_mem = '256MB';   -- reporting role only
```

Detect spills with `EXPLAIN (ANALYZE, BUFFERS)` — look for `Sort Method: external merge  Disk: 91056kB` or `Batches: 4` on a hash (Q19), or `log_temp_files = 0` to log every temp file.

---

## Section 2 — MVCC: Tuple Versions and Visibility

### Q5. What is MVCC in Postgres, mechanically? Where do the row versions live?

**Answer:**

MVCC = readers never block writers and vice versa, achieved by keeping **multiple versions of each row (tuple) in the heap itself** — not in a separate undo log (that's Oracle/MySQL-InnoDB's design; it's the deepest architectural difference between them and Postgres).

Every heap tuple carries system columns in its header:

- **xmin** — the transaction ID (xid) that *created* this tuple version
- **xmax** — the xid that *deleted or superseded* it (0 if live). A row locked by `SELECT ... FOR UPDATE` also gets its locker's xid in xmax, with hint bits distinguishing lock from delete.
- **cmin/cmax** — command IDs *within* a transaction, so a statement doesn't see rows inserted by itself mid-scan (the Halloween problem)
- **ctid** — the tuple's physical address: `(page_number, item_number)`

Every transaction sees the database through a **snapshot** taken at statement start (READ COMMITTED) or first statement (REPEATABLE READ). A snapshot is essentially:

- `xmin` — lowest xid still running (anything below is definitely finished)
- `xmax` — next xid to be assigned (anything at/above hasn't started as far as this snapshot cares)
- `xip[]` — the list of xids in-progress at snapshot time

**Visibility rule (simplified):** a tuple is visible iff its creating xid (tuple xmin) committed and is *not* in the snapshot's in-progress set, AND its deleting xid (tuple xmax) is 0, aborted, still in-progress, or after the snapshot. So "deleted" rows remain fully present on disk until VACUUM removes them — which is the root cause of bloat (Section 4).

**Interview trap:** "Postgres locks the row so readers wait during an update." Plain readers *never* wait in Postgres — they read the old version. Only writer-vs-writer on the same row blocks. If a candidate's deadlock/blocking story involves plain SELECTs waiting on an UPDATE, they're describing a different database.

### Q6. Worked example: show me tuple versions actually changing across concurrent sessions.

**Answer:**

```sql
-- Session A (psql #1)
CREATE TABLE accounts (id int PRIMARY KEY, balance numeric NOT NULL);
INSERT INTO accounts VALUES (1, 100), (2, 200);

SELECT txid_current();          -- say it returns 771 (the INSERT ran as 770)
SELECT xmin, xmax, ctid, * FROM accounts;
```

```
 xmin | xmax | ctid  | id | balance
------+------+-------+----+---------
  770 |    0 | (0,1) |  1 |     100
  770 |    0 | (0,2) |  2 |     200
```

Both tuples created by xid 770, never deleted (xmax=0), living at page 0, items 1 and 2.

Now a concurrent update:

```sql
-- Session A
BEGIN;
UPDATE accounts SET balance = 150 WHERE id = 1;   -- runs as xid 772, not yet committed
SELECT xmin, xmax, ctid, * FROM accounts WHERE id = 1;
```

```
 xmin | xmax | ctid  | id | balance
------+------+-------+----+---------
  772 |    0 | (0,3) |  1 |     150     -- A sees ITS OWN new tuple version at a NEW ctid
```

```sql
-- Session B (psql #2), while A is still open
SELECT xmin, xmax, ctid, * FROM accounts WHERE id = 1;
```

```
 xmin | xmax | ctid  | id | balance
------+------+-------+----+---------
  770 |  772 | (0,1) |  1 |     100     -- B sees the OLD version; xmax=772 marks "superseded by 772"
```

Same logical row, two physical tuples, each session seeing the version its snapshot allows. `xmax=772` on the old tuple is the breadcrumb: "transaction 772 intends to replace me." Since 772 is in-progress in B's snapshot, B ignores the deletion and the new tuple alike.

```sql
-- Session A
COMMIT;

-- Session B, new statement (READ COMMITTED takes a fresh snapshot per statement)
SELECT xmin, xmax, ctid, * FROM accounts WHERE id = 1;
```

```
 xmin | xmax | ctid  | id | balance
------+------+-------+----+---------
  772 |    0 | (0,3) |  1 |     150
```

The old tuple `(0,1)` is now a **dead tuple** — invisible to everyone, still occupying 8KB-page space until vacuum reclaims it. A `DELETE` works the same way minus the new insert: it just stamps xmax and leaves the tuple in place.

### Q7. Why is UPDATE physically a DELETE + INSERT? What are HOT updates and why do they matter for write-heavy tables?

**Answer:**

Because old snapshots may still need the old version, Postgres can't overwrite in place. Every UPDATE:

1. Stamps `xmax` on the old tuple.
2. Writes a **complete new tuple** (all columns, even unchanged ones) elsewhere — same page if there's room, else a new page.
3. By default, inserts a new entry into **every index on the table**, because the ctid changed — *even for indexes on columns you didn't touch*.

Step 3 is the killer for write amplification. **HOT (Heap-Only Tuple) updates** avoid it when two conditions hold:

- No indexed column was modified, and
- The new version fits **on the same page** as the old one.

Then Postgres chains old→new inside the page and no index is touched; index entries keep pointing at the chain root. This is why `fillfactor` matters on hot tables — reserved free space per page makes HOT possible:

```sql
ALTER TABLE accounts SET (fillfactor = 80);   -- keep 20% page slack for HOT
-- measure HOT ratio:
SELECT relname, n_tup_upd, n_tup_hot_upd,
       round(100.0 * n_tup_hot_upd / nullif(n_tup_upd, 0), 1) AS hot_pct
FROM pg_stat_user_tables ORDER BY n_tup_upd DESC LIMIT 10;
```

**Interview trap:** "we added `updated_at` to an index to speed up a query" — congratulations, every row touch now updates an indexed column, HOT is dead for that table, and every UPDATE writes to *all* indexes. A senior candidate connects indexing decisions to update amplification, not just read speed. (This exact issue — index maintenance cost per update — is the centerpiece of the famous Uber "why we moved off Postgres" post; know both it and the counterarguments.)

### Q8. What's the difference between READ COMMITTED and REPEATABLE READ in snapshot terms, and where does that bite in application code?

**Answer:**

- **READ COMMITTED** (default): new snapshot **per statement**. Two SELECTs in one transaction can see different data. An UPDATE that finds a row locked waits, then *re-evaluates its WHERE clause against the newest version* (the "EvalPlanQual" recheck) — so it can proceed against data it never "saw" in its snapshot.
- **REPEATABLE READ**: one snapshot for the whole transaction. Concurrent-write conflicts surface as `ERROR: could not serialize access due to concurrent update` — your app must **retry**.
- **SERIALIZABLE**: REPEATABLE READ plus predicate-level conflict detection (SSI); more retry errors, true serial equivalence.

Where it bites: the classic read-modify-write balance bug.

```sql
-- Both sessions, READ COMMITTED:
BEGIN;
SELECT balance FROM accounts WHERE id = 1;        -- both read 150
UPDATE accounts SET balance = 150 - 100 WHERE id = 1;  -- both compute in app code
COMMIT;                                            -- lost update: balance 50, not -50 rejected
```

Fixes, in order of preference: make it a single atomic statement (`SET balance = balance - 100 ... RETURNING`), use `SELECT ... FOR UPDATE`, or use REPEATABLE READ/SERIALIZABLE with a retry loop. Coming from MongoDB: this is the same class of problem as `findOne` + `updateOne` races, solved there with `findOneAndUpdate` — the atomic-statement instinct transfers directly.

---

## Section 3 — WAL, Checkpoints, and Durability

### Q9. Why does write-ahead logging exist? What is an LSN, and what are full-page writes?

**Answer:**

The contract: **before any change to a data page hits disk, the WAL record describing that change must be durably on disk.** On COMMIT, only the WAL is fsynced — dirty data pages can loiter in shared buffers for minutes. This buys:

1. **Crash recovery** — on restart, replay WAL from the last checkpoint; committed-but-unflushed changes are reconstructed.
2. **Performance** — sequential appends to WAL are vastly cheaper than random writes across data files at commit time.
3. **Replication & PITR** — streaming replication is literally shipping WAL; point-in-time recovery is base backup + WAL replay to a target LSN.

**LSN (Log Sequence Number)** = a byte position in the WAL stream, e.g. `0/1A2B3C4D`. Every data page header stores the LSN of the last WAL record that modified it — that's how recovery knows whether a page already contains a given change. Replication lag is measured in LSN deltas:

```sql
SELECT client_addr,
       pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS replay_lag_bytes
FROM pg_stat_replication;
```

**Full-page writes (FPW)**: Postgres pages are 8KB but disks/filesystems often guarantee atomicity only at 4KB (or 512B) — a crash mid-write leaves a **torn page** that WAL's small per-change records can't repair (they assume a sane base page). Solution: the *first* modification of any page after each checkpoint writes the **entire 8KB page image** into WAL. Consequence: WAL volume spikes sharply right after every checkpoint — which couples checkpoint frequency to WAL volume (Q10).

### Q10. What happens during a checkpoint, and why do badly tuned checkpoints cause periodic latency spikes?

**Answer:**

A checkpoint: (1) note current WAL position, (2) write **all** dirty shared buffers to disk (spread over `checkpoint_completion_target`, default 0.9, of the checkpoint interval), (3) fsync everything, (4) write a checkpoint record; WAL before it becomes recyclable.

Triggers: `checkpoint_timeout` elapsed (default 5min — the healthy case) or WAL grew past `max_wal_size` (default 1GB — the "requested" case, logged and counted in `checkpoints_req`).

The spike mechanism, in order:

1. `max_wal_size` too small → checkpoints fire every 30–60s under write load.
2. Each checkpoint dumps dirty buffers → I/O saturation → all query latencies rise.
3. Immediately post-checkpoint, **every touched page needs a full-page write** → WAL volume explodes → the *next* checkpoint arrives even sooner. A self-reinforcing sawtooth.

Tuning for write-heavy systems: `max_wal_size` in the tens of GB, `checkpoint_timeout` 15–30min, keep `checkpoint_completion_target = 0.9`, and confirm via `log_checkpoints = on` that checkpoints are timed, not requested. Trade-off: longer between checkpoints = more WAL kept = longer crash-recovery replay. That's the actual dial: **steady-state latency vs recovery time objective.**

**Production war story:** an events-ingestion service (batched INSERTs, ~40k rows/s) showed p99 latency jumping from 8ms to 900ms in a clean 45-second cycle. `pg_stat_bgwriter` showed `checkpoints_req` climbing every minute — `max_wal_size` was still the 1GB default while the workload generated ~1.5GB WAL/min, so Postgres was checkpointing back-to-back, each one triggering an FPW storm that brought the next one sooner. Raising `max_wal_size` to 32GB and `checkpoint_timeout` to 20min flattened p99 to 15ms. The counterintuitive lesson we had to sell to the customer: *letting more WAL accumulate made the database faster*, at the cost of ~3min crash recovery instead of ~20s.

### Q11. Explain synchronous_commit. When would you turn it off, and how is that different from turning off fsync?

**Answer:**

| Setting | What a COMMIT waits for | Crash risk | Sane use |
|---|---|---|---|
| `synchronous_commit = on` (default) | WAL flushed (fsync) to local disk; plus flush on sync standby if `synchronous_standby_names` set | None (for acked commits) | Default |
| `= remote_apply` | Standby has *applied* (queryable) | None; adds standby latency | Read-your-writes on replicas |
| `= remote_write` | Standby OS received it (not fsynced there) | Lose acked txns only if primary *and* standby crash together | Cheaper sync replication |
| `= local` | Local flush only, ignore standbys | Acked txn may be missing on failover | Temporarily degraded HA |
| `= off` | Nothing — WAL flushed by walwriter within ~`3 × wal_writer_delay` (~600ms) | May lose last ~½s of **acked** commits on crash. **Never corrupts** — recovery is still consistent | Metrics, sessions, event ingest; settable **per transaction** |
| `fsync = off` | — (lies to the WAL contract itself) | **Corruption** on OS/power crash. Restore from backup | Throwaway environments only |

The distinction interviewers fish for: `synchronous_commit = off` trades a bounded window of *durability* for latency while preserving *consistency*; `fsync = off` sacrifices the WAL-before-data invariant and therefore consistency itself. The former is a legitimate per-transaction tool:

```sql
SET LOCAL synchronous_commit = off;  -- this transaction only: fine to lose an analytics event
INSERT INTO page_views (...) VALUES (...);
COMMIT;
```

`wal_level` sits alongside: `minimal` (crash recovery only, no replication — rare), `replica` (default; physical replication + PITR), `logical` (adds enough info for logical decoding — required for CDC tools like Debezium, and for logical replication; slightly more WAL volume).

---

## Section 4 — VACUUM, Bloat, and Transaction ID Wraparound

### Q12. What are dead tuples and bloat? How do you measure them on a live system?

**Answer:**

Every UPDATE/DELETE leaves a dead tuple (Q6). VACUUM's job is to (1) remove dead tuples so the space can be **reused by future inserts/updates in the same table**, (2) update the free space map and **visibility map**, (3) freeze old tuples (Q14). Bloat = the gap between the table's disk footprint and its live data, from dead tuples not yet vacuumed plus reusable-but-empty space.

First-line check — the stats view:

```sql
SELECT relname,
       n_live_tup,
       n_dead_tup,
       round(100.0 * n_dead_tup / nullif(n_live_tup + n_dead_tup, 0), 1) AS dead_pct,
       last_autovacuum,
       autovacuum_count
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 15;
```

A hot table with `dead_pct` > 20% and a stale `last_autovacuum` means autovacuum is losing the race. For exact numbers (stats are estimates), `pgstattuple` scans the table:

```sql
CREATE EXTENSION IF NOT EXISTS pgstattuple;
SELECT * FROM pgstattuple('accounts');
-- tuple_percent (live density), dead_tuple_percent, free_percent
-- healthy OLTP table: tuple_percent 70-90; bloated: tuple_percent < 50
```

Index bloat is separate and often worse (B-tree pages don't merge on delete): `pgstattuple`'s `pgstatindex()` reports `avg_leaf_density`; below ~50% means REINDEX territory (`REINDEX INDEX CONCURRENTLY` since PG 12).

### Q13. Why doesn't plain VACUUM shrink the file on disk? When do you actually need VACUUM FULL, and what's the catch?

**Answer:**

Plain VACUUM marks dead tuple space as reusable *within the file* but only truncates the physical file if there happens to be a run of completely-empty pages **at the very end** (and it can take a brief exclusive lock to do so). Space freed in the middle stays with the table — by design: returning it to the OS would require rewriting/moving tuples, invalidating every ctid and index pointer.

`VACUUM FULL` rewrites the entire table into a new file (and rebuilds all indexes), reclaiming everything — but holds an **ACCESS EXCLUSIVE lock** for the whole rewrite: no reads, no writes. On a 500GB table that's an outage. It also needs ~2× the table's disk space during the rewrite.

Decision table:

| Situation | Action |
|---|---|
| Steady churn, table size stable | Nothing — reusable space is *fine*; the table has reached equilibrium |
| One-off mass DELETE (e.g. purged 80% of rows), table must shrink | `pg_repack` (online, builds a copy + swaps via triggers) or `VACUUM FULL` in a maintenance window |
| Deleting nearly everything regularly | Redesign: `TRUNCATE`, or partition and `DROP PARTITION` (instant, no bloat, no vacuum debt) |
| Index bloat only | `REINDEX ... CONCURRENTLY` |

The **visibility map (VM)** ties in here: one bit per page saying "all tuples on this page are visible to everyone." VACUUM sets it; any write clears it. It's what makes (a) subsequent vacuums fast (skip all-visible pages) and (b) **index-only scans** possible — an index-only scan must visit the heap for any page not all-visible (shown as `Heap Fetches: N` in EXPLAIN). A never-vacuumed table gives you index-only scans in name only.

**Interview trap:** "we run VACUUM FULL nightly via cron to keep the database fast." That's a red flag answer, not a best practice — it means their steady-state vacuum/HOT/fillfactor situation is broken and they're paying nightly exclusive locks to paper over it.

### Q14. Explain transaction ID wraparound. What actually happens if autovacuum can't keep up — walk me through the failure sequence.

**Answer:**

Xids are 32-bit and compared **circularly**: from any xid's perspective, ~2.1 billion xids are "in the past" and ~2.1 billion "in the future." A tuple whose xmin becomes older than ~2.1B transactions would suddenly compare as *in the future* — committed data would turn invisible. Silent mass data loss.

The defense is **freezing**: VACUUM marks sufficiently old tuples as frozen (via a hint bit; conceptually "created infinitely long ago, visible to everyone"), removing them from the comparison problem. Track each table's oldest unfrozen xid:

```sql
SELECT datname, age(datfrozenxid) FROM pg_database ORDER BY 2 DESC;
SELECT relname, age(relfrozenxid) FROM pg_class
WHERE relkind = 'r' ORDER BY 2 DESC LIMIT 10;
```

The escalation ladder as `age(relfrozenxid)` grows:

1. **200M** (`autovacuum_freeze_max_age`): autovacuum forces an **anti-wraparound vacuum** on the table — this one runs *even if autovacuum is disabled* and (pre-PG14 semantics) won't cancel itself when it blocks DDL.
2. **~40M before the 2.1B limit**: every connection starts logging `WARNING: database "prod" must be vacuumed within N transactions`.
3. **~3M before the limit** (PG ≤ 13; PG 14+ switches to failsafe behavior earlier): Postgres **stops accepting new transaction IDs** — effectively read-only, errors on any write: `ERROR: database is not accepting commands to avoid wraparound data loss`. Remedy at that point is vacuuming in single-user mode. Total outage.

Why autovacuum falls behind in real life: (a) `autovacuum_vacuum_cost_delay` throttling makes each pass crawl on big tables, (b) too few `autovacuum_max_workers` (default 3) all stuck on huge tables, (c) a **long-running transaction or abandoned replication slot pins the xmin horizon** — vacuum *cannot* remove or freeze anything newer than the oldest snapshot, so it runs and runs and reclaims nothing:

```sql
-- The three horizon-pinners to check FIRST in any vacuum incident:
SELECT pid, state, age(backend_xmin), xact_start, query
FROM pg_stat_activity WHERE backend_xmin IS NOT NULL
ORDER BY age(backend_xmin) DESC LIMIT 5;                      -- long transactions

SELECT slot_name, active, age(xmin) FROM pg_replication_slots; -- dead slots

SELECT gid, prepared FROM pg_prepared_xacts;                   -- forgotten 2PC txns
```

**Production war story:** a customer's primary hit `age(datfrozenxid)` ≈ 1.9B — warnings had been in the logs for six days, unread. Root cause: an orphaned logical replication slot from a decommissioned Debezium connector (`active = false`, three weeks stale) pinned xmin, so the nightly anti-wraparound vacuums on their 2TB events table completed without freezing anything, restarted, repeated. Fix: `SELECT pg_drop_replication_slot('debezium_old');` then an aggressive manual `VACUUM (FREEZE, VERBOSE)` with `vacuum_cost_delay = 0` and `maintenance_work_mem = '2GB'`, watched for 14 hours. We came within ~180M xids (~10 hours at their txn rate) of a forced shutdown. Two standing rules came out of it: alert on `age(datfrozenxid) > 500M`, and alert on *any* inactive replication slot older than 24h.

### Q15. Autovacuum keeps skipping our 500M-row table until it has 100M dead tuples. Why, and what do you tune?

**Answer:**

Default trigger: vacuum when `dead_tuples > autovacuum_vacuum_threshold (50) + autovacuum_vacuum_scale_factor (0.2) × reltuples`. On 500M rows that's **100M dead tuples** before autovacuum even wakes up — then it has an enormous job, throttled by cost-based delays. Scale factors are the classic big-table trap: percentages don't scale, absolute numbers do.

Tune per table, not globally:

```sql
ALTER TABLE events SET (
  autovacuum_vacuum_scale_factor = 0,        -- disable the percentage...
  autovacuum_vacuum_threshold    = 200000,   -- ...vacuum every 200k dead tuples
  autovacuum_vacuum_cost_delay   = 1,        -- ms; near-unthrottled (PG12+ default is 2ms)
  autovacuum_analyze_scale_factor = 0,
  autovacuum_analyze_threshold   = 100000    -- keep planner stats fresh too
);
```

Supporting knobs: `autovacuum_max_workers` (3 → 6–10 on many-table systems; note the cost budget is *shared* across workers, so more workers without lowering cost_delay = each one slower), `autovacuum_naptime`, `maintenance_work_mem`/`autovacuum_work_mem` (bigger dead-TID buffer → fewer index passes per vacuum; largely obsolete in PG 17's new TID store, worth mentioning). Philosophy line for interviews: **frequent small vacuums beat rare huge ones** — the goal is that autovacuum is always boringly busy, never heroically behind.

**Production war story:** a 200M-row `sessions` table updated on every request. Default scale factor meant ~40M dead tuples between vacuums; p95 crept up 30% over each cycle because every query waded through dead tuples and the visibility map decayed (index-only scans showing `Heap Fetches` in the millions). The giveaway signature in `pg_stat_user_tables`: sawtooth `n_dead_tup` and `autovacuum_count` of only ~2/day on the hottest table in the system. Per-table thresholds (vacuum every ~500k dead tuples) plus `fillfactor = 80` to restore HOT updates cut both the latency creep and the vacuum duration by an order of magnitude.

---

## Section 5 — TOAST

### Q16. What is TOAST and when does it kick in? What do the storage strategies mean?

**Answer:**

Heap pages are 8KB and a tuple cannot span pages. **TOAST** (The Oversized-Attribute Storage Technique) is how Postgres stores values that don't fit: when a row exceeds ~2KB (`TOAST_TUPLE_THRESHOLD`), Postgres compresses and/or moves large attributes out to the table's associated **TOAST table** (`pg_toast.pg_toast_<oid>`), where they're split into ~2KB chunks, leaving an 18-byte pointer in the main tuple. Values are TOASTed *per column*, largest first, until the row fits.

Per-column strategies:

| Strategy | Compression | Out-of-line storage | Use |
|---|---|---|---|
| `PLAIN` | No | No | Fixed-length types (int, timestamp); value must fit in-page |
| `EXTENDED` | Yes | Yes | **Default** for text, jsonb, bytea — compress first, move out if still too big |
| `EXTERNAL` | No | Yes | Skip compression: substring/partial access on text/bytea gets faster (can fetch only needed chunks); trades disk for CPU |
| `MAIN` | Yes | Only as last resort | Prefer keeping compressed value in the main tuple |

```sql
ALTER TABLE docs ALTER COLUMN body SET STORAGE EXTERNAL;
ALTER TABLE docs ALTER COLUMN body SET COMPRESSION lz4;  -- PG14+; lz4 ≫ default pglz for speed
-- inspect TOAST usage:
SELECT pg_size_pretty(pg_table_size('docs'))          AS total_incl_toast,
       pg_size_pretty(pg_relation_size('docs'))       AS heap_only;
```

### Q17. We store 100KB JSONB documents and queries got slow. What's TOAST got to do with it?

**Answer:**

Every read that touches a TOASTed value pays **detoasting**: fetch N chunks from the TOAST table (index lookups into a second table → extra buffer reads) + decompress. For a 100KB JSONB that's ~50 chunk rows per access. The costs that surprise people:

1. **`SELECT *` tax**: fetching the JSONB when you needed two scalar columns detoasts megabytes per thousand rows for nothing. Project explicitly. (For MongoDB folks: this is why the "one big document" habit hurts more in Postgres — Mongo's BSON is stored contiguously; JSONB over 2KB is not.)
2. **Any operator touching the column detoasts the whole value.** `WHERE body->>'status' = 'open'` without an index detoasts+parses *every row scanned*. Fixes: expression index (`CREATE INDEX ON docs ((body->>'status'))`), GIN index for containment (`body @> '{"status":"open"}'` with `jsonb_path_ops`), or — usually best — **promote hot fields to real columns** and keep JSONB for the long tail.
3. **Update amplification**: JSONB has no partial update at the storage level. Changing one key rewrites the whole document → full re-TOAST of all chunks → WAL for all of it → replication traffic. A counter field inside a 100KB document is a design bug.
4. Table size lies: `pg_relation_size()` excludes TOAST; use `pg_table_size()` — many "why is this 2GB table slow" tickets are actually a 40GB TOAST table hiding behind it.

**Interview trap:** "JSONB is indexed automatically" / "JSONB is basically as fast as columns." GIN indexes help *containment lookups*; they don't help retrieval cost, updates, or range predicates on values, and statistics on JSONB internals are poor, so the planner guesses (misestimates cascade — Q19). The senior position: JSONB for genuinely variable/sparse attributes; columns for anything you filter, join, aggregate, or update frequently.

---

## Section 6 — Connections and Pooling

### Q18. Why are Postgres connections expensive, and why is max_connections = 1000 a design smell rather than a fix?

**Answer:**

Because of Q1: each connection is an OS process holding ~5–10MB typically (fork cost, per-backend relation/plan/catalog caches that *grow* with use — ORMs touching thousands of tables can push a backend to 50MB+), plus non-memory costs that scale superlinearly:

- **Scheduling**: thousands of runnable processes → context-switch thrash; on a 16-core box only ~16 queries execute at once regardless — the rest queue, but now inside the kernel scheduler and lock manager instead of an orderly pool queue.
- **Shared-state contention**: snapshot computation walks the procarray (all active backends); lock manager and buffer-pool LWLocks all degrade with backend count. Classic benchmark shape: throughput peaks around a few hundred connections and *falls* beyond it.
- Idle connections aren't free either — they still hold caches and widen the procarray walk (huge improvements in PG 14, but not free).

Rule-of-thumb sizing: active connections ≈ `cores × (2..4)` for OLTP; `max_connections` a few hundred at most, with a **pooler** absorbing client fan-out. `max_connections = 1000` usually means "we kept hitting `FATAL: sorry, too many clients already` and raised the ceiling instead of asking why 1000 things need simultaneous sessions" — the fix is pooling, not headroom.

**Interview trap:** "just increase max_connections and shared_buffers together." More allowed connections at the same work_mem budget = more OOM exposure (Q4), slower snapshots, worse lock contention. The number of *useful* concurrent queries is bounded by cores and I/O, full stop.

### Q19. PgBouncer session vs transaction vs statement pooling — what breaks in transaction mode and how do you run safely there?

**Answer:**

PgBouncer multiplexes N client connections onto M real server backends (M ≪ N):

| Mode | Server conn assigned per… | Multiplexing | What it's for |
|---|---|---|---|
| `session` | client connection lifetime | Weak (only reclaims on disconnect) | Full compatibility; tames *reconnect churn* only |
| `transaction` | single transaction | Strong — **the standard choice** | OLTP with short transactions |
| `statement` | single statement | Maximum | Autocommit-only workloads; forbids multi-statement txns |

Transaction mode works because most connections are idle between transactions. The cost: **your next transaction may run on a different backend**, so anything that assumes session continuity breaks:

| Feature | Why it breaks in transaction mode | Workaround |
|---|---|---|
| Server-side prepared statements (`PREPARE` / protocol-level) | Prepared on backend A; next txn lands on backend B → `prepared statement "s1" does not exist` | Disable in driver (`node-postgres` doesn't use them by default; in pg drivers set statement cache off) or PgBouncer ≥ 1.21 `max_prepared_statements` which tracks/replays them |
| `SET` session GUCs (`SET search_path`, `SET timezone`) | Sticks to whichever backend ran it; leaks to other clients | `SET LOCAL` inside the transaction, or per-role/per-database `ALTER ROLE ... SET` |
| Session advisory locks (`pg_advisory_lock`) | Lock owned by a backend you no longer have | `pg_advisory_xact_lock` (transaction-scoped) |
| `LISTEN`/`NOTIFY` | LISTEN registered on one backend; you get detached from it | Dedicated direct (non-pooled) connection for the listener |
| Temp tables, cursors `WITH HOLD` | Session-scoped objects | Keep within one transaction, or session pool for those jobs |
| `pg_backend_pid()` for debugging | Different pid per transaction | Expect it; log txn ids instead |

Ops guardrails: set both `default_pool_size` (server side) and `max_client_conn`; watch `SHOW POOLS;` for `cl_waiting` (clients queued for a server conn — your true saturation signal); use `server_reset_query = DISCARD ALL` in session mode (transaction mode intentionally skips reset for speed — another reason session state is unsafe there).

### Q20. Explain the serverless connection problem and the current solutions (RDS Proxy, Neon, Supabase).

**Answer:**

The mismatch: Lambda-style compute scales to N concurrent executions, and each execution *freezes* between invocations holding its "cached" DB connection open — from Postgres's side, an idle backend. A traffic spike to 3,000 concurrent Lambdas = 3,000 connection attempts against a database whose healthy ceiling is a few hundred. Result: `FATAL: remaining connection slots are reserved`, plus a **thundering-herd reconnect storm** after any DB restart. In-process pools (like `pg.Pool` in Node) don't help — there are thousands of *processes*, each with its own pool; the pooling has to move to a shared tier.

| Solution | Mechanism | Notes |
|---|---|---|
| **RDS Proxy** | Managed transaction-mode multiplexer in front of RDS/Aurora | Watch "pinning": session-state use (SET, prepared statements, temp tables) pins a client to a backend, silently degrading to session mode — check `DatabaseConnectionsCurrentlySessionPinned` |
| **Supabase** | Runs a pooler (PgBouncer, now Supavisor) on port **6543** (transaction mode) vs **5432** (direct) | Choosing the port *is* choosing the pooling mode; migrations should use 5432 |
| **Neon** | Built-in pooled endpoint (`-pooler` hostname) + serverless HTTP/WebSocket driver | HTTP driver sidesteps TCP conn setup entirely for single-shot queries |
| **Prisma Accelerate / Data Proxy pattern** | Pooling moved behind an HTTP API | Same idea: terminate fan-out before Postgres |
| Self-managed | PgBouncer on a small VM/sidecar in front of the DB | Cheapest; you own its HA |

All transaction-mode caveats from Q19 apply to every one of these.

**Production war story:** a customer moved an API to Lambda in front of RDS Postgres (`max_connections = 200`). Fine for weeks — until a marketing email drove ~1,200 concurrent executions. Every cold Lambda opened a fresh connection (their "optimization": connection created outside the handler, cached in the frozen container — which made it *worse*, because frozen containers never release). RDS hit the slot limit; health checks couldn't connect; the autoscaler saw failures and launched more Lambdas. The 15-minute fix was `reserved_concurrency` on the function; the real fix was RDS Proxy in transaction mode plus removing `SET timezone` from request setup because it caused ~30% session pinning, quietly recreating the original problem at higher load.

---

## Section 7 — Reading EXPLAIN ANALYZE

### Q21. Walk me through real EXPLAIN (ANALYZE, BUFFERS) output for a seq scan, an index scan, and a bitmap heap scan — every line.

**Answer:**

Setup (runnable):

```sql
CREATE TABLE orders (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id  int         NOT NULL,
  status       text        NOT NULL,
  total_cents  int         NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

INSERT INTO orders (customer_id, status, total_cents, created_at)
SELECT (random() * 20000)::int,
       (ARRAY['pending','shipped','delivered'])[1 + (random()*2.999)::int],
       (random() * 50000)::int,
       now() - (random() * interval '365 days')
FROM generate_series(1, 1_000_000);

CREATE INDEX orders_customer_id_idx ON orders (customer_id);
ANALYZE orders;   -- ALWAYS analyze after bulk load; the planner is blind without stats
```

**(a) Sequential scan** — low-selectivity predicate, no useful index:

```sql
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM orders WHERE status = 'shipped';
```

```
Seq Scan on orders  (cost=0.00..21846.00 rows=333210 width=45)
                    (actual time=0.014..152.882 rows=333489 loops=1)
  Filter: (status = 'shipped'::text)
  Rows Removed by Filter: 666511
  Buffers: shared hit=2112 read=7234
Planning Time: 0.108 ms
Execution Time: 171.334 ms
```

Line by line:

- `cost=0.00..21846.00` — **startup cost..total cost**, in abstract units (1.0 = one sequential page read). Startup 0: a seq scan emits its first row immediately. Total ≈ pages×`seq_page_cost` + rows×`cpu_tuple_cost` + rows×`cpu_operator_cost` for the filter.
- `rows=333210` — planner's **estimate** of output rows, from `pg_stats` (1/3 of rows have this status). vs `actual ... rows=333489` — reality. Estimate within 0.1%: stats are healthy. **Comparing these two numbers is 80% of plan debugging.**
- `actual time=0.014..152.882` — ms to first row..last row, *per loop*.
- `Rows Removed by Filter: 666511` — scanned but discarded; scanned 1M to keep 333k. High removed-to-kept ratio on a *selective* predicate = missing index; here 33% selectivity means seq scan is genuinely correct (an index scan would touch most pages anyway, in random order).
- `Buffers: shared hit=2112 read=7234` — 8KB pages from shared_buffers vs from outside it (OS cache **or** disk — EXPLAIN can't distinguish; add `track_io_timing = on` to get `I/O Timings` and know for sure).

**(b) Index scan** — high selectivity:

```sql
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM orders WHERE id = 424242;
```

```
Index Scan using orders_pkey on orders  (cost=0.42..8.44 rows=1 width=45)
                                        (actual time=0.029..0.031 rows=1 loops=1)
  Index Cond: (id = 424242)
  Buffers: shared hit=4
Planning Time: 0.092 ms
Execution Time: 0.048 ms
```

- `cost=0.42..` — nonzero startup: descending the B-tree before the first row.
- `Index Cond` vs `Filter`: an **Index Cond** is satisfied *by the index traversal itself*; a `Filter` line under an index scan means extra predicates checked per fetched row — an index that "matches" only in Filter isn't really being used for that predicate.
- `Buffers: shared hit=4` — 3 B-tree levels + 1 heap page. Index scan = for each index match, jump to the heap page for the full tuple (and, always, for MVCC visibility — the index has no xmin/xmax). Random heap I/O is why the planner abandons index scans as match count grows.

**(c) Bitmap heap scan** — the middle ground (say ~5k matching rows scattered across the table):

```sql
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM orders WHERE customer_id = 1337;
```

```
Bitmap Heap Scan on orders  (cost=59.17..7741.35 rows=4967 width=45)
                            (actual time=1.310..9.911 rows=5012 loops=1)
  Recheck Cond: (customer_id = 1337)
  Heap Blocks: exact=4788
  Buffers: shared hit=4807
  ->  Bitmap Index Scan on orders_customer_id_idx  (cost=0.00..57.93 rows=4967 width=0)
                            (actual time=0.702..0.702 rows=5012 loops=1)
        Index Cond: (customer_id = 1337)
        Buffers: shared hit=19
Planning Time: 0.121 ms
Execution Time: 10.408 ms
```

The bitmap scan is a two-phase read:

- **Bitmap Index Scan** (inner, runs first): scans the index and builds an in-memory bitmap of matching heap page numbers — `width=0`, it outputs no tuples, just the bitmap. Note `actual time=0.702..0.702`: start=end because it must finish entirely before the parent emits anything.
- **Bitmap Heap Scan** (outer): sorts the bitmap and visits heap pages **in physical order, each page once** — converting the index scan's random I/O into near-sequential I/O and deduplicating multi-match pages. This is exactly why it beats a plain index scan at medium selectivity, and why it's the node used to **combine multiple indexes** (`BitmapAnd`/`BitmapOr`).
- `Recheck Cond` — if the bitmap exceeds `work_mem` it degrades to **lossy** mode (tracks pages, not exact tuples: you'd see `Heap Blocks: exact=1200 lossy=3600`), and every tuple on a lossy page must be **rechecked** against the condition. `exact=4788` with no lossy pages = the recheck was free here. Lossy pages appearing is a work_mem signal.

Selectivity decision the planner is making across (a)/(b)/(c): ~1 row → index scan; ~0.5% of rows scattered → bitmap; ~33% of rows → seq scan. The crossover points move with `random_page_cost` (default 4.0 — tuned for spinning disks; on SSD/NVMe set 1.1–1.5, otherwise the planner over-fears index scans — one of the highest-value single-line config fixes on cloud databases).

### Q22. Nested loop vs hash join vs merge join — when does the planner pick each, and how do row misestimates cascade into disasters?

**Answer:**

Setup: add a customers table and join.

```sql
CREATE TABLE customers (
  id      int PRIMARY KEY,
  segment text NOT NULL
);
INSERT INTO customers
SELECT g, (ARRAY['smb','mid','enterprise'])[1 + (g % 3)] FROM generate_series(1, 20000) g;
ANALYZE customers;
```

**Nested loop** — for each outer row, probe the inner side (great when outer is small and inner probe is an index lookup):

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT c.segment, o.total_cents
FROM customers c JOIN orders o ON o.customer_id = c.id
WHERE c.id BETWEEN 100 AND 110;
```

```
Nested Loop  (cost=0.72..2225.86 rows=547 width=12)
             (actual time=0.041..3.712 rows=531 loops=1)
  Buffers: shared hit=571
  ->  Index Scan using customers_pkey on customers c
        (cost=0.29..8.48 rows=11 width=8)
        (actual time=0.012..0.019 rows=11 loops=1)
  ->  Index Scan using orders_customer_id_idx on orders o
        (cost=0.42..197.12 rows=50 width=8)
        (actual time=0.014..0.311 rows=48 loops=11)
        Index Cond: (customer_id = c.id)
        Buffers: shared hit=538
Execution Time: 3.981 ms
```

The critical reading skill: **`loops=11`** on the inner scan — it executed 11 times (once per outer row), and `rows=48` is the **per-loop average**; total inner rows ≈ 48 × 11. People misread inner `actual time` the same way: it's per-loop, multiply by loops for total.

**Hash join** — build a hash table from the smaller input, probe with the larger. Needs an equality condition; wants the build side within `work_mem × hash_mem_multiplier`:

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT c.segment, count(*) FROM customers c
JOIN orders o ON o.customer_id = c.id GROUP BY 1;
```

```
HashAggregate  (cost=39849.61..39849.64 rows=3 width=12)
               (actual time=489.221..489.230 rows=3 loops=1)
  ->  Hash Join  (cost=577.00..34849.61 rows=1000000 width=4)
                 (actual time=6.882..421.117 rows=1000000 loops=1)
        Hash Cond: (o.customer_id = c.id)
        Buffers: shared hit=9457, temp read=0 written=0
        ->  Seq Scan on orders o  (cost=0.00..19346.00 rows=1000000 width=4)
              (actual time=0.008..96.734 rows=1000000 loops=1)
        ->  Hash  (cost=327.00..327.00 rows=20000 width=8)
                  (actual time=6.647..6.648 rows=20000 loops=1)
              Buckets: 32768  Batches: 1  Memory Usage: 1038kB
              ->  Seq Scan on customers c  (cost=0.00..327.00 rows=20000 width=8)
```

- The **Hash** node = build phase over the *smaller* side (customers); startup cost of the join includes finishing it (`actual time=6.882..` to first output row).
- `Batches: 1  Memory Usage: 1038kB` — fit in memory. If the build side exceeds the budget you see `Batches: 8` plus `temp read/written` buffers: both inputs get partitioned to disk by hash value and joined batch-by-batch — still often the right plan, but now it's doing disk I/O you can eliminate with session-level work_mem.

**Merge join** — walk two sorted inputs in lockstep. Chosen when both sides are already sorted (index-ordered scans) or when sorting is cheap relative to hashing, and for huge inputs where it degrades most gracefully; also the only strategy besides nested loop that handles inequality-ish cases like range merges.

```sql
-- Force the shape for illustration (never do this in prod config):
SET enable_hashjoin = off; SET enable_nestloop = off;
EXPLAIN (ANALYZE)
SELECT c.id, o.id FROM customers c JOIN orders o ON o.customer_id = c.id;
```

```
Merge Join  (cost=127467.79..145721.62 rows=1000000 width=12)
            (actual time=311.402..694.877 rows=1000000 loops=1)
  Merge Cond: (c.id = o.customer_id)
  ->  Index Only Scan using customers_pkey on customers c
        (cost=0.29..571.29 rows=20000 width=4)
        (actual time=0.021..3.842 rows=20000 loops=1)
        Heap Fetches: 0                     -- visibility map fully set: true index-only scan
  ->  Materialize  (cost=127467.44..132467.44 rows=1000000 width=8)
        (actual time=311.371..522.048 rows=1000000 loops=1)
        ->  Sort  (cost=127467.44..129967.44 rows=1000000 width=8)
              (actual time=311.365..438.919 rows=1000000 loops=1)
              Sort Key: o.customer_id
              Sort Method: external merge  Disk: 17696kB   -- spilled: work_mem too small
              ->  Seq Scan on orders o  (cost=0.00..19346.00 rows=1000000 width=8)
RESET enable_hashjoin; RESET enable_nestloop;
```

Two teaching points in that plan: `customers` needed **no sort** — its primary-key index already delivers sorted order (and `Heap Fetches: 0` shows the visibility map from Q13 paying off), while `orders` had no index on the sort key and paid a 17MB **disk spill** (`external merge`). Merge join wins in real plans exactly when both sides come pre-sorted from indexes; when the planner has to bolt a giant Sort under one side, hash join usually costs out cheaper — which is why we had to disable it to see this shape.

Decision table:

| | Nested Loop | Hash Join | Merge Join |
|---|---|---|---|
| Sweet spot | Small outer × indexed inner (OLTP point lookups) | Big × big with equality, build side fits memory-ish | Both inputs sorted / index-ordered; very large joins |
| Startup cost | ~zero (streams immediately) | Must build hash first | Must have/produce sorted inputs |
| Join condition | Anything (only option for arbitrary conditions) | Equality only | Equality + supports sorted-range logic |
| Memory | ~none | work_mem × hash_mem_multiplier (batches if over) | Sort memory unless pre-sorted |
| Degrades when | Outer is 100× bigger than estimated → inner runs 100× more | Build side misestimated → batches, temp I/O | Inputs not actually sorted → giant Sort nodes |

**How misestimates cascade** — the disaster pattern to narrate in interviews:

1. Planner estimates a filter returns `rows=12` (reality: 80,000) — commonly caused by **correlated predicates** (`city = 'SF' AND state = 'CA'`: independence assumption multiplies selectivities), stale stats after bulk load, or expressions/JSONB the stats can't see.
2. Estimated-tiny output makes the planner pick **nested loop** with that side as the outer: 12 index probes, perfect plan.
3. Reality: the inner side executes **80,000 times** (`loops=80000`). A 5ms inner scan is now 400 seconds.
4. The wrong estimate then flows *upward* — every parent join's estimate is built on it, so a 6-table join goes wrong at level 2 and stays wrong.

Diagnosis: in `EXPLAIN ANALYZE` output, scan top-down for the **first node where estimated `rows` and `actual rows` diverge by 10×+**; fix *that* (that node's stats), not the symptom node at the top. Fixes in escalating order:

```sql
ANALYZE orders;                                         -- stale stats
ALTER TABLE orders ALTER COLUMN customer_id SET STATISTICS 1000; ANALYZE orders;  -- bigger sample/MCV list
CREATE STATISTICS orders_geo (dependencies) ON city, state FROM addresses; ANALYZE addresses;  -- correlated columns
CREATE INDEX ON docs ((body->>'status'));               -- expression index → expression stats exist
```

**Interview trap:** "the query is slow, so I'll add an index." A misestimate-driven nested loop can be slow *with* perfect indexes — the problem is the join *strategy choice*, and the index is what lured the planner into the loop in the first place. Show that you look at `rows est vs actual` and `loops` before reaching for `CREATE INDEX`. Bonus points for `auto_explain` (log plans of slow queries in production with `auto_explain.log_analyze = on, log_min_duration = 500ms`) — because the plan you get in psql at 10am is not the plan the app got at 2am under different data and cache conditions.

---

## Quick self-test checklist

Before the interview, you should be able to answer cold:

- Why does one `SELECT` never block one `UPDATE` in Postgres, and what does block?
- What two conditions make an update HOT, and what config makes HOT more likely?
- What exactly is fsynced at COMMIT time, and what is *not*?
- Why does WAL volume spike immediately after each checkpoint?
- Name three things that pin the xmin horizon and starve vacuum.
- Why is `autovacuum_vacuum_scale_factor = 0.2` wrong for a 500M-row table?
- Where do 100KB JSONB values physically live, and what does reading one cost?
- Which of: prepared statements, `SET`, advisory locks, LISTEN/NOTIFY survive PgBouncer transaction mode? (Trick: `pg_advisory_xact_lock` and `SET LOCAL` do.)
- In a plan, what do `loops=5000` on an inner index scan and `rows=12 (actual 80000)` on a filter each tell you?

And the incident-response reflexes an FDE is hired for:

- Database "slow since this morning": check `pg_stat_activity` for long transactions and lock waits (`wait_event_type`), then `pg_stat_user_tables` dead tuples, then checkpoint frequency — in that order, before touching config.
- Disk filling up: is it heap bloat (`pgstattuple`), a TOAST table (`pg_table_size` vs `pg_relation_size`), or WAL retained by a dead replication slot (`pg_replication_slots`)?
- "Too many connections" page at 3am: identify the fan-out source (`SELECT usename, application_name, count(*) FROM pg_stat_activity GROUP BY 1,2 ORDER BY 3 DESC`), cap it, then propose pooling — never just raise `max_connections` under pressure.

Related docs in this knowledge base: caching layers and queue-backed write buffering are covered in the Redis deep-dive (Devops/01-Redis-and-Queues) — relevant here only as the standard answer to "how do we take read pressure off Postgres."
