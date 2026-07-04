# Lesson 6.3 — Transactions & Isolation: Anomalies, Locks, and What Postgres Actually Does

> Module: Databases Deep Dive | Level: Senior | FDE Prep Phase 6

Every senior database interview eventually lands here, because this is where hand-wavy knowledge dies: candidates can recite "ACID" but cannot reproduce a lost update, cannot say which anomaly Repeatable Read fails to stop, and have never read a deadlock log. This lesson gives you two-session scripts you can actually run in two `psql` windows, the real Postgres semantics (statement snapshots, EvalPlanQual, SSI) rather than the SQL-standard fiction, and the concurrency-control patterns (atomic updates, version columns, `FOR UPDATE`, `SKIP LOCKED`) you will ship as an FDE. MongoDB transactions get the same treatment at the end — including when needing them is a schema smell.

**Setup — run this once before the anomaly demos:**

```sql
DROP TABLE IF EXISTS accounts, doctors_on_call, jobs;

CREATE TABLE accounts (
  id      int PRIMARY KEY,
  owner   text NOT NULL,
  balance numeric NOT NULL CHECK (balance >= 0)
);
INSERT INTO accounts VALUES (1, 'alice', 1000), (2, 'bob', 500);

CREATE TABLE doctors_on_call (
  id         int PRIMARY KEY,
  name       text NOT NULL,
  shift_date date NOT NULL,
  on_call    boolean NOT NULL
);
INSERT INTO doctors_on_call VALUES
  (1, 'dr_house',  '2026-07-04', true),
  (2, 'dr_wilson', '2026-07-04', true);
```

---

## Section 1 — ACID Without the Hand-Waving

### Q1. Define ACID precisely. What do interviewers usually hear instead, and why is it wrong?

**Answer:**

The usual answer — "atomicity means all-or-nothing, consistency means the data is consistent, isolation means transactions don't see each other, durability means it survives crashes" — is three tautologies and one falsehood. The senior version:

| Property | Precise meaning | Common misconception |
|---|---|---|
| Atomicity | A transaction's writes become visible together or not at all. On abort, Postgres does **not** undo anything — it marks the transaction aborted and its tuples are simply never visible (Q2). | "The DB rolls back / reverses writes" — true in undo-log engines (Oracle, InnoDB), false in Postgres. |
| Consistency | Every committed transaction moves the DB from one state satisfying **all declared invariants** to another. The DB enforces only the invariants you *declared* (constraints); everything else is the application's job. "C" is a contract between app and DB, not a DB feature (Q3). | "The database keeps data consistent" — it can't enforce invariants you never told it about. |
| Isolation | A **spectrum**, not a boolean. Each level admits a defined set of anomalies. Almost no production system runs at Serializable; you are choosing which anomalies you tolerate. | "Transactions are isolated from each other" — at Read Committed (the default) they very much are not. |
| Durability | Once `COMMIT` returns, the commit WAL record has been `fsync`'d to stable storage (subject to `synchronous_commit`, Q4). Data pages can lag arbitrarily; WAL replay recovers them. | "Data is written to disk on commit" — only the *log* is; heap pages are written later by checkpoints. |

**Interview trap:** "Which of the four does isolation level configure?" Candidates say "isolation, obviously" and stop. The follow-up they miss: isolation trades off against *performance and aborts*, and weakening it silently transfers responsibility for anomalies to application code. Saying "we run Read Committed" is an engineering decision with named failure modes (lost update, write skew) — be ready to name them.

### Q2. How does Postgres implement atomicity? What actually happens on ROLLBACK?

**Answer:**

Postgres is a **no-undo, redo-only** engine built on MVCC:

1. Every transaction gets an XID. Every row version (tuple) it writes is stamped with that XID in `xmin` (and deletes/updates stamp the old version's `xmax`).
2. All changes are first recorded in the **WAL** (write-ahead log). The rule: WAL for a change must reach disk before the modified data page can. Commit = writing (and fsyncing) a single *commit record* to WAL and flipping the transaction's status bit to `COMMITTED` in `pg_xact` (the commit log).
3. **ROLLBACK is nearly free.** No pages are rewritten, no undo is applied. The transaction's status is set to `ABORTED` in `pg_xact`. Every visibility check thereafter sees "xmin belongs to an aborted transaction" and treats the tuple as if it never existed. The dead tuples physically remain until `VACUUM` reclaims them.

```sql
BEGIN;
INSERT INTO accounts VALUES (99, 'ghost', 0);
SELECT xmin, * FROM accounts WHERE id = 99;  -- tuple exists, stamped with our XID
ROLLBACK;
SELECT * FROM accounts WHERE id = 99;        -- 0 rows: invisible, not erased
-- The dead tuple is still on the heap page until VACUUM removes it.
```

Consequences worth saying out loud in an interview:

- Abort is O(1) regardless of transaction size — unlike InnoDB/Oracle, where rolling back a 10M-row update replays undo and can take longer than the update did.
- The cost is deferred: aborted work becomes **bloat** that VACUUM must clean. A workload with a high abort rate (e.g., a hot Serializable retry loop) generates dead tuples like a high-churn update workload.
- Crash recovery = replay WAL from the last checkpoint (redo), then any transaction without a commit record is implicitly aborted. Atomicity across a crash falls out of the same visibility rule.

### Q3. "Consistency" in ACID — what does the database actually guarantee, and where does the application's responsibility start?

**Answer:**

The DB guarantees exactly the invariants you declared, checked at the times you declared them:

```sql
-- Declared invariants Postgres WILL enforce:
ALTER TABLE accounts ADD CONSTRAINT balance_nonneg CHECK (balance >= 0);
-- PK/unique, FK, NOT NULL, EXCLUDE constraints (e.g. no overlapping bookings):
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TABLE bookings (
  room_id int,
  during  tstzrange,
  EXCLUDE USING gist (room_id WITH =, during WITH &&)  -- no overlapping room bookings
);
```

Everything else — "sum of ledger entries equals account balance", "at least one doctor on call", "an order has at least one line item" — is an invariant only your *application* knows about. The DB's promise is narrower: **if each transaction individually preserves the invariants, and transactions are (sufficiently) isolated, then concurrency will not break them.** Write skew (Q9) is precisely the case where each transaction preserves the invariant in isolation but Snapshot Isolation lets two of them jointly violate it. So "C" has two authors: the app writes correct transactions; the DB provides constraints plus an isolation level strong enough that correctness composes.

Practical checklist for an FDE: push every invariant that *can* be a constraint into the schema (CHECK, UNIQUE, FK, EXCLUDE) — constraints are enforced under all isolation levels and are immune to write skew; then choose isolation/locking for the invariants that span rows.

**Interview trap:** "Do FK constraints protect you at Read Committed?" Yes — constraint checks in Postgres are not fooled by snapshots; a FK check takes a `FOR KEY SHARE` lock on the referenced row and sees the latest committed state, so you cannot insert a child while another session concurrently deletes the parent. This is a deliberate hole in MVCC visibility rules, and knowing it exists distinguishes people who've read the docs from people who've read blog posts.

### Q4. What exactly does durability cost, and what knobs trade it away?

**Answer:**

Durability = the commit record is on stable storage before `COMMIT` returns. The mechanism and the knobs:

- **fsync (`fsync = on`)**: whether Postgres asks the OS to flush at all. Turning it off means a crash can corrupt the cluster (not just lose transactions). Never off in production; the only defensible use is disposable rebuild-from-scratch loads.
- **`synchronous_commit`** — the real dial, settable **per transaction** (`SET LOCAL synchronous_commit = off`):

| Level | COMMIT returns after... | Crash risk |
|---|---|---|
| `off` | commit record written to WAL buffers (flushed within ~3× `wal_writer_delay`) | Lose up to ~600 ms of *acknowledged* commits on crash; no corruption |
| `local` | WAL fsync'd on the primary | None locally; replica may lag |
| `on` (default w/ sync replica) | WAL flushed on primary **and** written+flushed on sync standby | Survives primary loss |
| `remote_write` | standby has written (not fsync'd) WAL | Tiny window if both crash |
| `remote_apply` | standby has *replayed* it (read-your-writes on replica) | None; highest latency |

- **Group commit**: under concurrency, many transactions' commit records are flushed with one fsync — whoever gets to the flush lock flushes everything queued behind it. This is why per-transaction commit cost *drops* as concurrency rises. `commit_delay`/`commit_siblings` can force extra batching but are rarely worth tuning; natural group commit usually suffices.
- Below Postgres: the fsync must actually reach non-volatile media. Consumer SSDs with volatile write caches, or a RAID controller with a dead BBU, can silently lie — durability is a full-stack property.

Pattern worth citing: set `synchronous_commit = off` for low-value, high-volume writes (audit events, metrics) *per transaction* while payments stay at `on`. That's a scalpel, not the `fsync=off` sledgehammer.

---

## Section 2 — The Anomaly Zoo (Reproducible Two-Session Scripts)

Run each script in two `psql` sessions side by side, executing steps in the numbered order.

### Q5. What is a dirty read, and why can you not demonstrate one in Postgres?

**Answer:**

A dirty read is reading another transaction's **uncommitted** write. If that transaction aborts, you acted on data that never existed. The SQL standard permits it at Read Uncommitted — but Postgres's MVCC visibility rules *never* show uncommitted tuples to other transactions, so the level cannot exist:

```sql
-- Session A                                  -- Session B
-- (1)
BEGIN;
UPDATE accounts SET balance = 9999
 WHERE id = 1;                                -- (2)
                                              BEGIN TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
                                              SELECT balance FROM accounts WHERE id = 1;
                                              -- balance = 1000   <- NOT 9999. No dirty read.
                                              COMMIT;
-- (3)
ROLLBACK;  -- the 9999 never becomes visible to anyone
```

Postgres accepts the syntax `READ UNCOMMITTED` but **aliases it to Read Committed** (the standard permits providing a stronger level than requested). MVCC gives non-blocking consistent reads for free, so there is nothing to gain by allowing dirty reads. Contrast: SQL Server genuinely implements Read Uncommitted (`NOLOCK`), and it is a classic source of phantom incidents in reporting queries.

**Interview trap:** "How would you configure Postgres for dirty reads to speed up analytics?" It's a trick — you can't, and you don't need to: MVCC readers never block writers, so the lock-avoidance motivation for `NOLOCK` doesn't apply. Saying "I'd use Read Uncommitted" reveals SQL Server reflexes applied blindly.

### Q6. Demonstrate a non-repeatable read at Read Committed.

**Answer:**

A non-repeatable read: the same row read twice within one transaction returns different values because someone committed in between. Read Committed permits this because each **statement** gets a fresh snapshot (Q10).

```sql
-- Session A                                  -- Session B
-- (1)
BEGIN;  -- default READ COMMITTED
SELECT balance FROM accounts WHERE id = 1;
-- balance = 1000
                                              -- (2)
                                              BEGIN;
                                              UPDATE accounts SET balance = 800 WHERE id = 1;
                                              COMMIT;
-- (3)
SELECT balance FROM accounts WHERE id = 1;
-- balance = 800   <- same txn, same row, different answer
COMMIT;
```

Rerun with `BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;` in Session A: step (3) still returns 1000 — the transaction-level snapshot pins the world at the first query.

Why it matters practically: any multi-statement read at Read Committed (compute a report total, then fetch detail rows; check a balance, then act) can observe two different database states. If two reads must be mutually consistent, either do them in one statement, or run the transaction at Repeatable Read (cheap in Postgres — it's just a pinned snapshot, no extra locking for read-only work). Read-only reporting transactions at Repeatable Read are close to free and a very defensible default.

### Q7. Demonstrate a phantom read at Read Committed.

**Answer:**

A phantom: re-executing a *predicate* query returns new rows (vs non-repeatable read, which is about one row changing). The distinction matters because row locks on rows you read cannot protect you from rows that don't exist yet.

```sql
-- Session A                                  -- Session B
-- (1)
BEGIN;
SELECT count(*) FROM doctors_on_call
 WHERE shift_date = '2026-07-04' AND on_call;
-- count = 2
                                              -- (2)
                                              INSERT INTO doctors_on_call
                                              VALUES (3, 'dr_cameron', '2026-07-04', true);
                                              -- autocommit
-- (3)
SELECT count(*) FROM doctors_on_call
 WHERE shift_date = '2026-07-04' AND on_call;
-- count = 3   <- a phantom row appeared inside our transaction
COMMIT;
```

Postgres deviates from the SQL standard here in your favor: the standard permits phantoms at Repeatable Read, but Postgres's Repeatable Read is Snapshot Isolation, which **prevents phantoms** (the snapshot covers predicates too — step (3) would still say 2). This is the canonical "standard vs actual" table row (Q13) interviewers probe.

Cleanup for the next demos: `DELETE FROM doctors_on_call WHERE id = 3;`

### Q8. Demonstrate a lost update. Which isolation level stops it, and what are the application-level fixes?

**Answer:**

Lost update = two read-modify-write cycles interleave; the second write is computed from a stale read and silently overwrites the first. The classic money-losing bug:

```sql
-- Goal: A deposits 100, B deposits 200 into account 1 (balance 1000).
-- Correct final balance: 1300.

-- Session A                                  -- Session B
-- (1)
BEGIN;
SELECT balance FROM accounts WHERE id = 1;
-- reads 1000; app computes 1000+100 = 1100
                                              -- (2)
                                              BEGIN;
                                              SELECT balance FROM accounts WHERE id = 1;
                                              -- reads 1000; app computes 1000+200 = 1200
-- (3)
UPDATE accounts SET balance = 1100
 WHERE id = 1;
COMMIT;
                                              -- (4)
                                              UPDATE accounts SET balance = 1200
                                              WHERE id = 1;   -- blocks until A commits...
                                              -- ...then proceeds and overwrites
                                              COMMIT;
-- (5) Either session:
SELECT balance FROM accounts WHERE id = 1;
-- balance = 1200   <- Alice's 100 deposit is GONE. Expected 1300.
```

Note step (4): B's UPDATE *did* wait for A's row lock — locking alone didn't help, because B's new value was computed from a pre-lock read. Fixes, strongest-ergonomics first:

1. **Make it one atomic statement** (Q19): `UPDATE accounts SET balance = balance + 200 WHERE id = 1;` — reads the current version under the row lock. No isolation-level games needed. Always the first option.
2. **Pessimistic**: `SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;` at step (1)/(2) — B's *read* now blocks until A commits, then sees 1100.
3. **Optimistic**: version column + conditional UPDATE (Q20).
4. **Repeatable Read**: rerun the script with `BEGIN ISOLATION LEVEL REPEATABLE READ;` — step (4) fails with `ERROR 40001: could not serialize access due to concurrent update` (first-updater-wins), and B must retry. Postgres RR prevents lost updates; note the plain SQL standard does not require this of RR — it's an SI property.

**Production war story:** A field deployment had a "reserve inventory" endpoint: `SELECT quantity`, check `quantity > 0` in Node, then `UPDATE ... SET quantity = quantity_read - 1`. Load tests passed (sequential). On launch day, a flash-sale burst put ~40 concurrent requests on one SKU; nearly all read `quantity = 3`, all passed the check, all decremented from 3. The item oversold 30+ units and the balance-style write-back meant the final quantity was even *positive*. The fix was one line: `UPDATE inventory SET quantity = quantity - 1 WHERE sku = $1 AND quantity > 0 RETURNING quantity;` and treat `rowCount = 0` as "sold out". Read-modify-write under Read Committed is the single most common concurrency bug in Express/NestJS codebases.

**Interview trap:** "Would wrapping the read-modify-write in a transaction fix it?" No — the demo above *is* two transactions. `BEGIN`/`COMMIT` provides atomicity, not magic isolation. This question filters out a huge fraction of candidates; the answer is that you must change the *statement shape*, the *lock*, or the *isolation level*, not merely add transaction markers.

### Q9. What is write skew? Show why Repeatable Read does not stop it and Serializable does.

**Answer:**

Write skew: two transactions read an **overlapping predicate**, each writes a **disjoint** row based on what it read, and the combined result violates an invariant that each transaction individually preserved. No write-write conflict exists, so Snapshot Isolation's first-updater-wins never fires.

Invariant: at least one doctor on call per shift. Both doctors try to go off call simultaneously:

```sql
-- Session A (dr_house)                       -- Session B (dr_wilson)
-- (1)
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT count(*) FROM doctors_on_call
 WHERE shift_date = '2026-07-04' AND on_call;
-- count = 2  -> "safe for me to leave"
                                              -- (2)
                                              BEGIN ISOLATION LEVEL REPEATABLE READ;
                                              SELECT count(*) FROM doctors_on_call
                                               WHERE shift_date = '2026-07-04' AND on_call;
                                              -- count = 2  -> "safe for me to leave"
-- (3)
UPDATE doctors_on_call SET on_call = false
 WHERE id = 1;                                -- row 1 only
COMMIT;  -- succeeds
                                              -- (4)
                                              UPDATE doctors_on_call SET on_call = false
                                               WHERE id = 2;   -- row 2 only: DIFFERENT row,
                                              COMMIT;          -- so no 40001. Succeeds.
-- (5)
SELECT count(*) FROM doctors_on_call
 WHERE shift_date = '2026-07-04' AND on_call;
-- count = 0   <- invariant violated. Nobody is on call.
```

Each transaction was correct against its snapshot. The failure is a cycle of *rw-antidependencies*: A read rows B wrote-into-the-predicate's-territory and vice versa. Now reset (`UPDATE doctors_on_call SET on_call = true;`) and rerun with `BEGIN ISOLATION LEVEL SERIALIZABLE;` in both sessions:

```sql
-- Steps (1)-(3) identical. At step (4), Session B's COMMIT (or the UPDATE) fails:
-- ERROR:  could not serialize access due to read/write dependencies among transactions
-- DETAIL: Reason code: Canceled on identification as a pivot, during commit attempt.
-- HINT:  The transaction might succeed if retried.   (SQLSTATE 40001)
```

SSI tracked the predicate reads (SIReadLocks, Q12), detected the dangerous structure, and aborted one transaction. B retries, sees count = 1, and refuses to go off call. Correctness restored — at the cost of a mandatory retry loop.

Alternatives to Serializable for this specific shape: (a) materialize the conflict — `SELECT ... FOR UPDATE` on all rows in the predicate before deciding, forcing serialization on the row locks; (b) a per-shift summary row (`on_call_count`) that both transactions must update, converting write skew into an ordinary write-write conflict; (c) a constraint if expressible (a trigger, or redesign so the invariant is a CHECK/EXCLUDE). Other classic write-skew shapes: double-spending across two sub-accounts, meeting-room double booking via "check overlap then insert", username uniqueness enforced in app code (the last one: just use a UNIQUE index).

**Interview trap:** "Repeatable Read prevents lost updates, so it prevents write skew too, right?" No — and this exact distinction is *the* senior discriminator. Lost update = two writes to the **same row** (SI detects: first-updater-wins). Write skew = writes to **different rows** based on overlapping reads (SI is blind: no write-write conflict exists). If you can produce the doctors example from memory, you pass this question anywhere.

---

## Section 3 — Isolation Levels: What Postgres Actually Does

### Q10. How does Read Committed actually work in Postgres, and what is EvalPlanQual?

**Answer:**

Read Committed = a **new snapshot per statement**. Each statement sees everything committed before *it* began, plus its own transaction's earlier changes. That immediately explains the non-repeatable read and phantom demos (Q6, Q7): the second statement legitimately has a newer snapshot.

The subtle part is what an UPDATE/DELETE does when it reaches a row that a concurrent transaction has modified:

1. The row matched our snapshot, but its latest version is locked by an in-flight transaction. Our UPDATE **waits**.
2. If the other transaction aborts: we proceed against the original version.
3. If it commits: we do **not** fail (that's RR behavior). Instead Postgres performs the **EvalPlanQual (EPQ) re-check**: fetch the *newest committed version* of that row — a version from *outside our snapshot* — re-evaluate our WHERE clause against it, and update it if it still qualifies (skip it if not).

This makes single-statement arithmetic like `SET balance = balance + 200` correct at Read Committed — the addition is applied to the latest version, which is why Q8's fix #1 works. But EPQ has a sharp edge: your statement can act on a mix of snapshot-consistent rows and newer-than-snapshot rows, and a row that *newly* matches your predicate after your statement started is still invisible. Example inconsistency:

```sql
-- Session A: UPDATE accounts SET balance = balance * 1.1 WHERE balance >= 1000;
-- While A waits on a locked row, Session B moves money so a previously
-- non-qualifying row now has balance 1500 and commits.
-- A will NOT touch that row (not in snapshot), but WILL apply *1.1 to the
-- re-checked row using its post-B value. The statement executed against no
-- single consistent state of the database.
```

If a multi-row statement's correctness depends on evaluating one consistent state, Read Committed is not enough — use Repeatable Read/Serializable or explicit locking. This "statement snapshot + EPQ re-check" answer is the difference between knowing the default and understanding it.

### Q11. What is Repeatable Read in Postgres really, and when do you get error 40001 at this level?

**Answer:**

Postgres Repeatable Read is **Snapshot Isolation (SI)** — a stronger guarantee than the standard's RR:

- **One snapshot for the whole transaction**, taken at the first query (not at `BEGIN` — a gotcha when you `BEGIN` and then wait). Every statement sees the identical database state: no non-repeatable reads, **no phantoms**.
- **First-updater-wins on write-write conflicts.** If you try to UPDATE/DELETE (or `SELECT FOR UPDATE`) a row that a concurrent transaction modified *after your snapshot* and committed, you get:

```
ERROR:  could not serialize access due to concurrent update
SQLSTATE 40001 (serialization_failure)
```

  You wait while the other transaction is in flight; the error fires only if it commits. There is no EPQ re-check at this level — that's the crisp RC-vs-RR mechanical difference. This is what killed step (4) of the lost-update demo under RR.
- **What it does NOT stop:** write skew (Q9) and other read-write anomalies where the writes touch disjoint rows. SI compares *write sets*, not *read sets*.

Consequences: any writer at RR needs a **retry loop** for 40001 (same requirement as Serializable, just triggered less often), and long-running RR transactions pin their snapshot, blocking VACUUM from reclaiming any tuple version they might still see — a top-3 cause of table bloat (watch `pg_stat_activity.backend_xmin`).

When to choose RR: multi-statement reports needing internal consistency; `pg_dump` runs at RR for exactly this reason; logical "compare two queries" jobs. When it's a false comfort: any invariant spanning rows you *read* but don't write — that's Serializable territory.

**Interview trap:** "Repeatable Read in Postgres and in MySQL/InnoDB are the same, right?" No. InnoDB RR uses consistent reads *plus* gap/next-key locking for locking reads, doesn't abort on concurrent update (current-read semantics — an UPDATE sees the latest committed row even if your snapshot is older, silently reintroducing lost-update-like surprises), and permits write skew differently. Porting concurrency assumptions between the two engines without re-testing is a real migration hazard, and interviewers at polyglot shops love this question.

### Q12. How does Serializable (SSI) work in Postgres? What are SIReadLocks, false positives, and what does a correct retry loop look like?

**Answer:**

Since 9.1, Postgres Serializable = **Serializable Snapshot Isolation (SSI)**: run at Snapshot Isolation, but additionally track what each transaction *reads*, and abort when a pattern arises that could produce a non-serializable outcome.

- **SIReadLocks** are the tracking mechanism: predicate locks on tuples, pages, or whole relations recording "transaction T read this". Crucially they **block nothing** — they exist only for conflict detection. Inspect them live:

```sql
SELECT locktype, relation::regclass, page, tuple, pid
FROM pg_locks WHERE mode = 'SIReadLock';
-- Run the doctors demo at SERIALIZABLE and you'll see SIRead entries on
-- doctors_on_call for both sessions before either commits.
```

- **The rw-antidependency dance:** a rw-antidependency (T1 read something T2 concurrently wrote) is fine alone. The dangerous structure is a transaction that is a **pivot** — it has an rw-antidependency *in* and another *out* (T1 −rw→ T2 −rw→ T3, possibly T1 = T3). Every non-serializable execution under SI contains this pattern, so Postgres aborts one member (preferentially not a committed one) with SQLSTATE `40001` and the "read/write dependencies" message from Q9.
- **False positives are by design.** The pivot test is conservative: some aborted executions were actually serializable. Aggravators: lock promotion to page/relation granularity when `max_pred_locks_per_transaction` (etc.) is exhausted, and sequential scans taking relation-level SIReadLocks — under SERIALIZABLE, missing indexes directly raise your abort rate. Long-running transactions also can't have their SSI state cleaned up, inflating everyone's conflict surface.
- **Retries are mandatory.** 40001 is not an error to log-and-500; it means "replay me". Also note `SERIALIZABLE READ ONLY DEFERRABLE`: waits until it can take a snapshot guaranteed conflict-free, then runs with zero abort risk — ideal for big reports on a Serializable system.

A correct typed retry wrapper:

```typescript
import { Pool, PoolClient } from "pg";

const RETRYABLE = new Set(["40001", "40P01"]); // serialization_failure, deadlock_detected

export async function withSerializable<T>(
  pool: Pool,
  fn: (client: PoolClient) => Promise<T>,
  maxAttempts = 5,
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
      const result = await fn(client);        // fn must be PURE DB work: no emails,
      await client.query("COMMIT");           // no HTTP calls, no queue publishes.
      return result;
    } catch (err: any) {
      await client.query("ROLLBACK").catch(() => {});
      if (!RETRYABLE.has(err?.code) || attempt >= maxAttempts) throw err;
      const backoff = Math.min(1000, 25 * 2 ** attempt) * (0.5 + Math.random()); // full jitter
      await new Promise((r) => setTimeout(r, backoff));
    } finally {
      client.release();
    }
  }
}
```

**Production war story:** A team flipped `default_transaction_isolation = serializable` cluster-wide after a write-skew incident — reasonable — and added a retry decorator "for safety". The decorator retried *immediately*, unbounded, and the transaction body also published an SQS message (re-sent on every attempt). A nightly reconciliation job doing sequential scans then landed relation-level SIReadLocks across the hot tables; abort rates on the checkout path jumped to ~30%, every abort retried instantly into the same conflict window, connections saturated the pooler, p99 went from 80 ms to 12 s, and downstream consumers received quadruplicate messages. The service melted for 40 minutes with *zero* errors surfaced to users — just timeouts. Fixes: bounded retries with jittered backoff, side effects moved after commit (transactional outbox), the reconciliation job switched to `SERIALIZABLE READ ONLY DEFERRABLE`, and an index added so its scans stopped taking relation-level predicate locks. Lesson: Serializable is a *contract* — retry discipline, pure transaction bodies, index hygiene — not a config value.

### Q13. Draw the anomaly-by-isolation-level table: SQL standard vs what Postgres actually delivers.

**Answer:**

The SQL standard (defined in 1992 around locking, critiqued famously by Berenson et al. 1995):

| Level (standard) | Dirty read | Non-repeatable read | Phantom | Lost update | Write skew |
|---|---|---|---|---|---|
| Read Uncommitted | possible | possible | possible | possible | possible |
| Read Committed | prevented | possible | possible | possible | possible |
| Repeatable Read | prevented | prevented | **possible** | possible* | possible |
| Serializable | prevented | prevented | prevented | prevented | prevented |

\* the standard doesn't even name lost update/write skew; they fall out of its anomaly gaps.

What Postgres actually delivers (only three distinct behaviors):

| Level (Postgres) | Dirty read | Non-repeatable read | Phantom | Lost update | Write skew | Mechanism |
|---|---|---|---|---|---|---|
| Read Uncommitted | prevented (aliased to RC) | possible | possible | possible | possible | statement snapshot + EPQ |
| Read Committed | prevented | possible | possible | possible | possible | statement snapshot + EPQ |
| Repeatable Read | prevented | prevented | **prevented** | **prevented** (40001) | possible | txn snapshot (SI), first-updater-wins |
| Serializable | prevented | prevented | prevented | prevented | **prevented** (40001) | SSI: SI + rw-antidependency detection |

The three deltas to narrate in an interview: (1) Read Uncommitted doesn't exist; (2) Postgres RR is stronger than standard RR — no phantoms, no lost updates — because it's Snapshot Isolation; (3) the standard's RR-vs-Serializable gap is "phantoms", but Postgres's real gap is "write skew and other SI anomalies". Bonus point: Oracle's "Serializable" is actually just SI — it permits write skew — which is exactly the confusion SSI was invented to end.

---

## Section 4 — Locking

### Q14. Enumerate Postgres row-level lock modes. Which one does a plain UPDATE take, and why does it matter?

**Answer:**

Four row-level modes, weakest to strongest, with their conflict matrix:

| Mode | Taken by | Conflicts with |
|---|---|---|
| `FOR KEY SHARE` | FK checks on referenced rows | `FOR UPDATE` only |
| `FOR SHARE` | explicit `SELECT ... FOR SHARE` | `FOR NO KEY UPDATE`, `FOR UPDATE` |
| `FOR NO KEY UPDATE` | **plain UPDATE that doesn't modify key columns**; explicit | `FOR SHARE`, `FOR NO KEY UPDATE`, `FOR UPDATE` |
| `FOR UPDATE` | `DELETE`; UPDATE that modifies a key (unique-indexed) column; explicit `SELECT ... FOR UPDATE` | everything above |

The interview-worthy nuance: a plain `UPDATE accounts SET balance = ...` takes `FOR NO KEY UPDATE`, *not* `FOR UPDATE`. Since `FOR NO KEY UPDATE` doesn't conflict with `FOR KEY SHARE`, a concurrent transaction can insert a child row referencing account 1 (its FK check takes `FOR KEY SHARE` on the parent) **while** you're updating account 1's balance. Before 9.3 introduced these split modes, that FK check blocked behind the balance update — hot parent rows (an `organizations` row referenced by everything) caused system-wide convoys.

Practical rules: use explicit `FOR NO KEY UPDATE` when locking a row you'll update non-key columns of — gratuitous `FOR UPDATE` needlessly blocks FK inserts on children. `FOR SHARE` = "nobody may change this while I depend on it, but other readers may also depend on it". Also know the fine print: row locks live in the tuple header (`xmax` + hint bits), not in `pg_locks` per-row (no lock-table exhaustion, but locked-row visibility requires `pgrowlocks`), and `SELECT FOR UPDATE` at Read Committed uses EPQ semantics — it locks the *latest* committed version, which is exactly why it fixes lost updates.

### Q15. Design a job queue on Postgres with SELECT FOR UPDATE SKIP LOCKED. Full SQL.

**Answer:**

`SKIP LOCKED` makes competing workers skip rows other workers hold locks on instead of queueing behind them — turning a table into a work queue with zero double-delivery and near-zero contention.

```sql
CREATE TABLE jobs (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  status       text NOT NULL DEFAULT 'pending',   -- pending|running|done|failed
  payload      jsonb NOT NULL,
  run_after    timestamptz NOT NULL DEFAULT now(),
  attempts     int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 5,
  locked_by    text,
  locked_at    timestamptz
);
-- Partial index: the queue scan only ever looks at claimable rows.
CREATE INDEX jobs_claim_idx ON jobs (run_after) WHERE status = 'pending';

-- Claim one job (single atomic statement; safe to run from N workers):
WITH next_job AS (
  SELECT id FROM jobs
  WHERE status = 'pending' AND run_after <= now()
  ORDER BY run_after
  LIMIT 1
  FOR UPDATE SKIP LOCKED          -- the magic: contended rows are invisible, not blocking
)
UPDATE jobs j
SET status = 'running', attempts = attempts + 1,
    locked_by = $1 /* worker id */, locked_at = now()
FROM next_job WHERE j.id = next_job.id
RETURNING j.id, j.payload;

-- Complete / fail with retry + exponential backoff:
UPDATE jobs SET status = 'done' WHERE id = $1;
UPDATE jobs SET status = CASE WHEN attempts >= max_attempts THEN 'failed' ELSE 'pending' END,
               run_after = now() + (interval '30 seconds' * 2 ^ attempts),
               locked_by = NULL, locked_at = NULL
WHERE id = $1;

-- Reaper for crashed workers (row lock died with the connection, but status says 'running'):
UPDATE jobs SET status = 'pending', locked_by = NULL
WHERE status = 'running' AND locked_at < now() - interval '10 minutes';
```

Design notes worth volunteering: hold the row lock only for the *claim*, not for the whole job execution (a worker crash mid-job releases the lock, so `status`+reaper carries liveness, not the lock); the claim is one statement, so there's no read-modify-write window; `LIMIT 1` can become `LIMIT 10` for batch claiming; completed rows should be deleted or partitioned out — dead 'done' rows bloat the partial index's table. Honest trade-off vs a real broker: this gives you transactional enqueue (job inserted iff business txn commits — no dual-write problem) and exactly-once *claiming*, but polling latency and queue-table churn; past roughly thousands of jobs/sec, move to a broker and accept the outbox pattern. This pattern is what pg-boss and Graphile Worker implement.

### Q16. What does the lock queue behind an exclusive lock do to a busy table? The ALTER TABLE trap and its mitigation.

**Answer:**

Postgres lock waits form a **FIFO queue, and waiters block everything queued behind them** — even requests that wouldn't conflict with the current holder. The infamous incident shape:

1. A long transaction (a report, an idle-in-transaction app connection) holds `ACCESS SHARE` on `accounts`.
2. A deploy runs `ALTER TABLE accounts ADD COLUMN note text;` — needs `ACCESS EXCLUSIVE`, conflicts with everything, so it **waits** behind (1).
3. Every subsequent `SELECT` on `accounts` — which conflicts with nothing currently *granted* — queues **behind the waiting ALTER**, because jumping the queue would starve it.
4. Result: a metadata-only, sub-millisecond ALTER converts one slow reader into a full table outage. Nothing is "slow"; everything is *queued*.

```sql
-- Diagnose in a fourth session:
SELECT pid, wait_event_type, state, query
FROM pg_stat_activity WHERE wait_event_type = 'Lock';
SELECT pid, pg_blocking_pids(pid) AS blocked_by, query
FROM pg_stat_activity WHERE cardinality(pg_blocking_pids(pid)) > 0;
```

Mitigations — this is checklist material for anyone running migrations:

```sql
SET lock_timeout = '2s';            -- in the MIGRATION session
ALTER TABLE accounts ADD COLUMN note text;
-- If it can't get the lock in 2s it fails -> nothing queues behind it -> retry later.
```

- `lock_timeout` on the migration, retry loop around it (this is exactly what pg_repack/strong-migrations-style tooling automates).
- `SET statement_timeout` + `idle_in_transaction_session_timeout` globally so zombie holders die.
- Prefer non-blocking variants: `CREATE INDEX CONCURRENTLY`, `ADD COLUMN` with a constant default (metadata-only since PG 11), `NOT VALID` constraints + separate `VALIDATE CONSTRAINT` (takes only `SHARE UPDATE EXCLUSIVE`), split `SET NOT NULL` behind a validated CHECK.
- Related client knob: `SELECT ... FOR UPDATE NOWAIT` errors immediately (`55P03 lock_not_available`) instead of queueing — right for interactive flows where waiting is worse than failing (vs `SKIP LOCKED`, which is for interchangeable rows).

**Interview trap:** "Adding a nullable column is instant, so it's always safe during traffic." The *operation* is instant; the *lock acquisition* is not, and a queued `ACCESS EXCLUSIVE` request blocks all reads behind it. "Instant once granted" and "safe to attempt" are different claims — `lock_timeout` is what turns the first into the second.

### Q17. What are advisory locks and when do you reach for them instead of row locks or Redis?

**Answer:**

Advisory locks are application-defined locks on a 64-bit key — Postgres manages the queueing, deadlock detection, and (for the `_xact_` variants) automatic release, but attaches no meaning to the key:

```sql
-- Transaction-scoped (released automatically on commit/abort — prefer these):
SELECT pg_advisory_xact_lock(42);                   -- blocks until acquired
SELECT pg_try_advisory_xact_lock(42);               -- boolean, never blocks
SELECT pg_advisory_xact_lock(hashtext('reconcile:acct'), 12345);  -- two-key form

-- Session-scoped (survive commits; must pg_advisory_unlock, leak on crash-less bugs):
SELECT pg_advisory_lock(42);  SELECT pg_advisory_unlock(42);
```

Canonical uses:

- **Cron singleton**: N app replicas all fire the same scheduled job; only one should run it.

```typescript
const { rows } = await client.query(
  "SELECT pg_try_advisory_xact_lock(hashtext('cron:daily-invoicing')) AS acquired");
if (!rows[0].acquired) return; // another replica is doing it; exit quietly
await runDailyInvoicing(client); // lock auto-releases when this txn ends
```

- **Migration mutex**: serialize deploy-time migrations across replicas (Rails, Prisma, and golang-migrate all use advisory locks for exactly this).
- **Guarding an entity with no row yet** ("create org if absent" without a race): lock `hashtext('org:' || $slug)` before check-then-insert — though a UNIQUE constraint + `ON CONFLICT` is usually the better tool.
- **Throttling per-key concurrency** (one export per customer at a time) without a `FOR UPDATE` on some hot parent row that would also block FK traffic (Q14).

Versus Redis locks: if all contenders already talk to this Postgres, an advisory lock is strictly simpler and safer — transactional scoping, participation in deadlock detection, no TTL-expiry-while-still-working problem, one less system in the failure domain. Reach for Redis/Redlock only when lock contenders span services or datastores — see the Redis doc in this knowledge base for distributed-lock semantics and their caveats. Gotchas to mention: the keyspace is global per database (namespace by hashing a prefixed string); session locks + transaction pooling (PgBouncer) is a footgun because "your" session isn't yours — use `_xact_` variants under pooled connections.

### Q18. Anatomy of a deadlock: reproduce one, explain detection, and give the prevention playbook.

**Answer:**

A deadlock is a cycle in the waits-for graph. Minimal reproduction — two sessions acquiring the same two row locks in opposite order:

```sql
-- Session A                                  -- Session B
-- (1)
BEGIN;
UPDATE accounts SET balance = balance - 10
 WHERE id = 1;    -- A locks row 1
                                              -- (2)
                                              BEGIN;
                                              UPDATE accounts SET balance = balance - 10
                                               WHERE id = 2;    -- B locks row 2
-- (3)
UPDATE accounts SET balance = balance + 10
 WHERE id = 2;    -- A waits on B's row 2...
                                              -- (4)
                                              UPDATE accounts SET balance = balance + 10
                                               WHERE id = 1;    -- B waits on A's row 1: CYCLE
-- Within ~1s, ONE session (the one whose deadlock check fires first) gets:
-- ERROR:  deadlock detected                              (SQLSTATE 40P01)
-- DETAIL: Process 1234 waits for ShareLock on transaction 5678; blocked by 4321.
--         Process 4321 waits for ShareLock on transaction 8765; blocked by 1234.
-- HINT:  See server log for query details.
-- The OTHER session's step then completes normally; it should COMMIT.
```

**Detection**: Postgres doesn't watch for cycles continuously. When a backend has waited `deadlock_timeout` (default `1s`) for a lock, it runs the waits-for-graph cycle check; if a cycle exists, that backend aborts *its own* transaction with `40P01`. So deadlocks cost at least 1s of stall before resolution, and which victim dies is timing-dependent. Lowering `deadlock_timeout` detects faster but runs the (expensive, lock-table-freezing) check more often on ordinary contention; most shops leave it and log via `log_lock_waits = on`.

**Prevention playbook** — ordering beats retrying:

1. **Consistent lock ordering.** All code paths acquire multi-row locks in one global order (ascending PK is conventional). For a transfer: lock `LEAST(from, to)` then `GREATEST(from, to)`, or lock both up front sorted:

```sql
SELECT id FROM accounts WHERE id IN ($1, $2) ORDER BY id FOR UPDATE;  -- then do both UPDATEs
```

2. **One multi-row UPDATE isn't automatically ordered.** `UPDATE ... WHERE id IN (...)` locks rows in *plan order*, which two sessions may disagree on. Force it with the locking-CTE pattern:

```sql
WITH locked AS (
  SELECT id FROM accounts WHERE id = ANY($1::int[]) ORDER BY id FOR UPDATE
)
UPDATE accounts a SET balance = balance - 10 FROM locked WHERE a.id = locked.id;
```

3. Shorten lock hold time: no network calls / user waits inside transactions; lock as late as possible.
4. Watch hidden lock acquirers: FK checks (`FOR KEY SHARE` on parents), unique-index insertion waits, and `ON CONFLICT` arbiter checks all participate in cycles that "my code takes one lock" reasoning misses.
5. Retry `40P01` with the same wrapper as `40001` (Q12) — deadlocks in a well-ordered system should be rare enough that retries are a safety net, not load-bearing.

**Production war story:** A payouts batch processed ~5k transfers/min with a worker pool of 32, each transfer doing `UPDATE sender; UPDATE receiver;` in payload order. Under normal load, collisions were rare. Then a marketing campaign made one merchant account the *receiver* of thousands of concurrent transfers while it also ran outbound payouts — suddenly A→M and M→B pairs interleaved constantly, and every collision cost a 1-second `deadlock_timeout` stall before one victim died. Stalled workers held their first lock the whole second, widening the collision window; deadlock rate went superlinear, the log filled with `40P01`, and the naive retry (re-run in the *same* order) often re-deadlocked. Throughput dropped ~90% — a classic **deadlock storm**. The fix was embarrassingly small: lock both accounts with `ORDER BY id FOR UPDATE` before either UPDATE. Deadlocks went to zero; the retry loop became dead code. Corollary the team wrote on the wall: *deadlocks are an ordering bug, and retries are how you tolerate the ones you haven't found yet — not a fix.*

---

## Section 5 — Optimistic vs Pessimistic Concurrency (Application Patterns)

### Q19. Before choosing optimistic or pessimistic locking — what's the zeroth option?

**Answer:**

**Make the operation a single atomic statement.** One statement is atomic, takes its own row locks, applies arithmetic to the current row version (EPQ, Q10), and needs no isolation-level upgrades, no version columns, no retries:

```sql
-- Debit with an invariant, race-free at ANY isolation level:
UPDATE accounts
SET balance = balance - $2
WHERE id = $1 AND balance >= $2
RETURNING balance;
-- rowCount = 0  =>  insufficient funds (or no such account): reject, don't retry.

-- Idempotent upsert instead of check-then-insert:
INSERT INTO api_keys (user_id, key_hash) VALUES ($1, $2)
ON CONFLICT (user_id) DO UPDATE SET key_hash = EXCLUDED.key_hash
RETURNING key_hash;

-- Claim-one-of-N (the job queue, Q15) — also a single statement.
```

The senior habit: express the *decision* in the WHERE clause and the *effect* in SET, then read `RETURNING`/`rowCount` for the verdict. Most "we need transactions here" conversations end at this pattern. Only when the read and write genuinely cannot be fused — a human edits a form for two minutes; a computation needs multiple queries; external I/O sits between read and write — do the next two patterns earn their complexity.

### Q20. Implement optimistic concurrency with a version column in TypeScript. Where does it shine and where does it hurt?

**Answer:**

Optimistic concurrency = don't lock; detect staleness at write time. Read the row *with* its version, compute, then write conditionally:

```sql
ALTER TABLE accounts ADD COLUMN version int NOT NULL DEFAULT 0;
```

```typescript
import { Pool } from "pg";

interface Account { id: number; owner: string; balance: string; version: number; }

export class StaleUpdateError extends Error {
  constructor(public readonly id: number) { super(`account ${id}: version conflict`); }
}

async function applyDeposit(pool: Pool, id: number, amount: number): Promise<Account> {
  // 1. Plain read — no locks held, no transaction needed.
  const read = await pool.query<Account>(
    "SELECT id, owner, balance, version FROM accounts WHERE id = $1", [id]);
  if (read.rowCount === 0) throw new Error(`account ${id} not found`);
  const current = read.rows[0];

  const newBalance = Number(current.balance) + amount; // arbitrary app logic goes here

  // 2. Conditional write: succeeds ONLY if nobody wrote since our read.
  const write = await pool.query<Account>(
    `UPDATE accounts
     SET balance = $3, version = version + 1
     WHERE id = $1 AND version = $2
     RETURNING id, owner, balance, version`,
    [id, current.version, newBalance]);

  if (write.rowCount === 0) throw new StaleUpdateError(id); // someone else won
  return write.rows[0];
}

export async function depositOptimistic(
  pool: Pool, id: number, amount: number, maxAttempts = 5,
): Promise<Account> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await applyDeposit(pool, id, amount);
    } catch (err) {
      if (!(err instanceof StaleUpdateError) || attempt >= maxAttempts) throw err;
      const backoff = Math.min(500, 20 * 2 ** attempt) * (0.5 + Math.random());
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
}
```

The load-bearing details: the guard is `WHERE id = $1 AND version = $2` and the *only* signal is `rowCount` — `rowCount = 0` means either the row vanished or the version moved, and both mean "re-read and retry" (re-fetch inside the retry, which `applyDeposit` does by construction). `version = version + 1` must be in the same UPDATE, unconditionally. Backoff must be jittered or synchronized retriers re-collide (Q12's war story).

Where it shines: **low contention** and **long think time** — REST APIs where the "read" happened a request ago, user-facing edit forms (send `version` to the client, get it back, and a conflict becomes a 409 with "someone else edited this" UX — impossible to express with locks, since you can't hold a row lock across HTTP requests). Where it hurts: hot rows — with N concurrent writers, each round admits one winner and N−1 retries, so throughput degrades quadratically; and every retry re-runs your (possibly expensive) compute step. That's the regime for pessimistic locks or single-statement design. Timestamp-as-version (`updated_at`) is a worse variant — clock resolution and backwards clock steps can miss conflicts; use a counter.

### Q21. Implement pessimistic locking in TypeScript, then give the optimistic-vs-pessimistic decision table.

**Answer:**

Pessimistic = take the row lock *before* reading, so the read-compute-write critical section is exclusive. Requires a transaction (locks release on commit) and one connection pinned throughout:

```typescript
import { Pool } from "pg";

export async function transfer(
  pool: Pool, fromId: number, toId: number, amount: number,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Bound the blast radius if we queue behind something slow:
    await client.query("SET LOCAL lock_timeout = '3s'");

    // Lock BOTH rows in deterministic order — deadlock prevention (Q18).
    const { rows } = await client.query<{ id: number; balance: string }>(
      `SELECT id, balance FROM accounts
       WHERE id = ANY($1::int[])
       ORDER BY id
       FOR NO KEY UPDATE`,               // not touching key columns; don't block FK inserts (Q14)
      [[fromId, toId]]);
    if (rows.length !== 2) throw new Error("account not found");

    const from = rows.find((r) => r.id === fromId)!;
    if (Number(from.balance) < amount) throw new Error("insufficient funds");

    // We hold the locks: no one can invalidate the check before these commit.
    await client.query("UPDATE accounts SET balance = balance - $2 WHERE id = $1", [fromId, amount]);
    await client.query("UPDATE accounts SET balance = balance + $2 WHERE id = $1", [toId, amount]);
    await client.query(
      "INSERT INTO ledger (from_id, to_id, amount) VALUES ($1, $2, $3)",
      [fromId, toId, amount]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
```

Discipline that makes this safe: nothing slow inside the critical section (no HTTP, no queue publish — every millisecond you hold the lock is a millisecond every contender waits), deterministic lock order, `lock_timeout` so a pileup fails fast instead of cascading, and remember that with PgBouncer you need session/transaction-appropriate pooling since the lock lives on the connection.

| Dimension | Zeroth option: atomic statement | Optimistic (version column) | Pessimistic (FOR UPDATE) |
|---|---|---|---|
| Contention level | any | low (retries explode when hot) | medium/high (waiting beats retrying) |
| Hold time between read and write | none (fused) | long OK — even across HTTP requests | must be short; never across user think time |
| Failure mode | rowCount = 0, no retry needed | conflict -> retry (wasted compute) | waiting, lock queues, deadlock risk |
| Works across requests / stateless API | n/a | yes — version travels with the payload | no — lock dies with the transaction |
| User-facing edit flows (CMS, settings) | rarely expressible | ideal (409 + merge UX) | wrong tool |
| Throughput on a hot row | best | worst | good (serialized, but no wasted work) |
| Complexity | lowest | version column + retry loop | txn/connection discipline, ordering, timeouts |

Rule of thumb to state: fuse into one statement if you can; version-column if the gap spans requests or contention is low; `FOR UPDATE` when contention is real, the critical section is short, and everything happens inside one server-side transaction.

---

## Section 6 — MongoDB Transactions

### Q22. How do multi-document transactions work in MongoDB? Show the mongosh and Node driver APIs.

**Answer:**

Single-document operations in MongoDB were always atomic (document-level atomicity is the design's foundation — see Q24). Multi-document ACID transactions arrived in 4.0 for **replica sets** and 4.2 for sharded clusters; they require a replica set even in development (`mongod --replSet rs0` + `rs.initiate()` — a plain standalone refuses them). Transactions ride on logical **sessions**; the read happens against a WiredTiger snapshot and all writes commit atomically via the oplog.

mongosh, explicit API:

```javascript
const session = db.getMongo().startSession();
const accounts = session.getDatabase("bank").accounts;
const ledger   = session.getDatabase("bank").ledger;

session.startTransaction({
  readConcern:  { level: "snapshot" },
  writeConcern: { w: "majority" },
});
try {
  const from = accounts.findOne({ _id: 1 }, { session });
  if (from.balance < 100) throw new Error("insufficient funds");
  accounts.updateOne({ _id: 1 }, { $inc: { balance: -100 } });
  accounts.updateOne({ _id: 2 }, { $inc: { balance:  100 } });
  ledger.insertOne({ from: 1, to: 2, amount: 100, at: new Date() });
  session.commitTransaction();
} catch (e) {
  session.abortTransaction();
  throw e;
} finally {
  session.endSession();
}
```

Node driver — prefer `withTransaction`, which owns the retry logic for you:

```typescript
import { MongoClient } from "mongodb";

async function transfer(client: MongoClient, fromId: number, toId: number, amount: number) {
  const session = client.startSession();
  try {
    await session.withTransaction(
      async () => {
        const accounts = client.db("bank").collection("accounts");
        const ledger = client.db("bank").collection("ledger");

        // The guard is in the filter — same zeroth-option instinct as SQL (Q19):
        const res = await accounts.updateOne(
          { _id: fromId, balance: { $gte: amount } },
          { $inc: { balance: -amount } },
          { session });
        if (res.modifiedCount === 0) throw new Error("insufficient funds");

        await accounts.updateOne({ _id: toId }, { $inc: { balance: amount } }, { session });
        await ledger.insertOne({ from: fromId, to: toId, amount, at: new Date() }, { session });
      },
      { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } },
    );
  } finally {
    await session.endSession();
  }
}
```

`withTransaction` retries the whole callback on `TransientTransactionError` (write conflicts, primary stepdown) and retries just the commit on `UnknownTransactionCommitResult` — which is why the callback must be **idempotent pure-DB work**: no emails, no HTTP, nothing you can't run twice. And every operation must pass `{ session }`; forgetting it on one call silently executes that operation *outside* the transaction — the single most common Mongo-transaction bug in review.

### Q23. What isolation do MongoDB transactions provide, and what are the operational constraints?

**Answer:**

**Isolation**: WiredTiger gives each transaction a **snapshot** — with `readConcern: "snapshot"`, essentially Snapshot Isolation (Postgres-RR-like: consistent point-in-time reads, no dirty/non-repeatable reads). Conflict handling differs from Postgres in temperament: when a transaction writes a document that another in-flight transaction has written, Mongo does not queue politely — one side is **aborted immediately with a `WriteConflict`** (a `TransientTransactionError`), on the bet that retrying beats blocking. Hot documents under transactions therefore mean high retry rates, not lock queues. Non-transactional writes hitting a document a transaction has modified *do* block until it finishes. And being SI-like, **write skew remains possible** — there is no Serializable tier in MongoDB at all; invariants across documents need unique indexes, a designated "conflict document" both parties must write, or schema redesign.

**Constraints** — the operational fine print interviewers fish for:

| Constraint | Value / consequence |
|---|---|
| Runtime limit | `transactionLifetimeLimitSeconds` = **60s default**; exceed it and the txn aborts. Raisable, but see next row. |
| Cache/oplog pressure | All of a txn's writes must commit as oplog entries constrained by the 16MB-per-entry era rules (4.2+ splits across entries, but WiredTiger must pin the snapshot and dirty cache for the duration). Long/large txns evict cache and stall the node. |
| DDL | No creating/dropping collections or indexes inside a txn pre-4.4; 4.4+ allows implicit collection creation only. No touching config/admin/local. |
| Sharded clusters | Cross-shard txns use two-phase commit via the config servers — meaningfully slower; avoid making them the hot path. |
| Read/write concern | Durability story requires `writeConcern: majority`; `readConcern: snapshot` only meaningful with it. A txn with `w: 1` can be rolled back on failover — "committed" then gone. |
| Performance | A transaction pins a snapshot and holds WiredTiger tickets; heavy transactional load competes with everything else for the (bounded) concurrency tickets. |

Rules of thumb: keep transactions to a handful of documents and well under a second; batch large migrations into many small transactions; treat `TransientTransactionError` as normal traffic (idempotent callbacks); monitor `transactions` metrics in `serverStatus`.

**Interview trap:** "MongoDB has ACID transactions now, so it's equivalent to Postgres for relational workloads." The gaps: no Serializable (write skew is unfixable at the isolation layer), no cross-document constraints (no FKs, no CHECK across documents — unique indexes are the only declarative multi-document invariant), 60-second budget, immediate-abort conflict behavior on hot documents, and 2PC costs across shards. Mongo transactions are a safety net for *occasional* multi-document invariants, not an invitation to run a normalized relational schema on a document store.

### Q24. "If you routinely need multi-document transactions in MongoDB, your schema is wrong." Defend and attack that claim.

**Answer:**

**Defend.** MongoDB's atomicity unit is the document, and the document model's core promise is that **things accessed together live together**. If your order and its line items are one document, "create order with items" is a single atomic insert — no transaction, no 60s budget, no write conflicts, and it shards cleanly. Routinely needing transactions means your entities' *consistency boundaries* don't match your *document boundaries* — you've normalized relationally inside a document store and are now paying relational coordination costs without relational tools (no FKs, no joins worth the name, no Serializable). The first fix is **embedding**: redraw document boundaries around the invariant. The aggregate you must keep consistent should be one document; then document-level atomicity — plus `$inc`/`$push`/array-filter update operators and filter-guarded single-document updates (Q22's `balance: { $gte: amount }`) — covers it. Mongo's own docs have said this plainly for years: data modeling, not transactions, is the primary consistency tool.

**Attack.** Some invariants genuinely span aggregates, and embedding them creates worse problems — unbounded document growth (the 16MB cap and the "giant array" antipattern), or fusing entities with different lifecycles and access patterns:

- **Payments touching wallet + ledger**: the wallet balance and the append-only ledger entry are different aggregates with different growth rates; embedding the ledger in the wallet is unbounded growth. A transaction around `wallet.$inc` + `ledger.insertOne` is exactly right (Q22's code).
- **Migrations / backfills**: moving a field between collections, splitting a collection — transactions per batch keep every intermediate state consistent without downtime.
- **Genuine peer-to-peer invariants**: transfer between two user-owned documents where neither can own the other.

| Reach for a Mongo transaction | Redesign the schema instead |
|---|---|
| Two aggregates with independent lifecycles must change together *occasionally* (payment: wallet + ledger) | Parent and child are always read/written together (order + line items) -> **embed** |
| Append-only audit/ledger written alongside a state change | "Transaction" exists only to keep denormalized copies in sync -> single source of truth + derive, or accept async convergence |
| Batched migration between collections | Counter/summary docs updated with every child write -> `$inc` on one document, or recompute |
| Rare cross-user operations (transfer, swap) | Every request opens a multi-document txn (relational schema in disguise) -> re-model aggregates, or use Postgres |
| Saga is overkill and scope is one replica set | Invariant needs Serializable-grade guarantees (write-skew-sensitive) -> Mongo cannot give it at any setting; Postgres SSI can |

The senior synthesis: in Postgres, transactions are the default fabric and you design *isolation* per use case; in MongoDB, document boundaries are the default fabric and transactions are the escape hatch. A codebase where every handler calls `withTransaction` is a Postgres schema wearing a Mongo costume — it will pay Mongo's coordination costs and receive none of Postgres's guarantees. Frequency is the diagnostic: *occasional* transactions around genuinely separate aggregates are healthy; *routine* transactions are the schema telling you its boundaries are wrong — or that the workload wanted a relational database all along.

---

## Quick-Reference Card

| Situation | Reach for |
|---|---|
| Increment/decrement, claim, conditional state change | Single atomic UPDATE with guard in WHERE + RETURNING |
| Multi-statement report needing internal consistency | Repeatable Read (read-only: near-free) |
| Invariant across rows you read but don't write | Serializable + 40001/40P01 retry loop with jittered backoff |
| Edit form across HTTP requests | Optimistic version column, 409 on conflict |
| Short hot critical section, server-side | `SELECT ... FOR UPDATE` (or `FOR NO KEY UPDATE`), sorted keys, `lock_timeout` |
| Work queue | `FOR UPDATE SKIP LOCKED` + status column + reaper |
| Cron singleton / migration mutex | `pg_try_advisory_xact_lock` |
| DDL on a busy table | `lock_timeout` + retry; concurrent/NOT VALID variants |
| Mongo cross-document invariant (occasional) | `withTransaction`, majority write concern, idempotent body |
| Mongo cross-document invariant (routine) | Redesign document boundaries (embed) — or question the database choice |
