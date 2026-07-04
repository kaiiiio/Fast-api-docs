# Lesson 6.2 — Indexing Deep Dive: B-trees, GIN, and Why the Planner Ignores You

> Module: Databases Deep Dive | Level: Senior | FDE Prep Phase 6

Indexing is the single highest-leverage database skill an FDE has: most "the database is slow" incidents at a client site end with either a missing index, a wrong index, or an index the planner refuses to use — and you have to diagnose which one under pressure. This lesson goes below the "add an index and it gets faster" level: page-level B-tree mechanics, composite ordering rules, GIN/BRIN internals, planner statistics, and the write-side costs nobody mentions until p99 latency doubles. Postgres is the primary lens; the final section maps everything onto MongoDB so you can switch stacks mid-conversation.

---

## Section 1 — B-tree Internals

### Q1. Walk me through the physical structure of a Postgres B-tree index. What are pages, internal pages, leaf pages, and high keys?

**Answer:**

A Postgres B-tree is stored as a collection of fixed-size **8 kB pages** (blocks), organized in a tree:

- **Meta page** (block 0): points to the current root; the root can move as the tree grows.
- **Internal pages**: contain `(separator key, child page pointer)` entries. They only route searches downward — they don't point at table rows.
- **Leaf pages**: contain `(key, TID)` entries, where the TID (tuple identifier, `(block, offset)`) points at the heap row. Leaf pages are doubly linked left-to-right, which is what makes `ORDER BY` via index a pure linked-list walk without re-traversing the tree.
- **High key**: every page except the rightmost at its level stores a *high key* — an upper bound on keys allowed in that page. It exists because Postgres uses the Lehman & Yao B-link tree variant: concurrent readers descending the tree while a page is splitting can detect "the key I want moved right" by comparing against the high key and following the right-sibling link, instead of taking heavy locks. This is why Postgres B-trees allow readers during splits.

Depth is logarithmic and shallow: a B-tree on a `bigint` column fits roughly 300–400 entries per internal page, so a 4-level tree addresses billions of rows. A point lookup is ~3–4 page reads, and hot upper levels are effectively always in `shared_buffers`.

```sql
-- Inspect a real index with pageinspect
CREATE EXTENSION IF NOT EXISTS pageinspect;

CREATE TABLE events (id bigserial PRIMARY KEY, payload text);
INSERT INTO events (payload) SELECT md5(g::text) FROM generate_series(1, 200000) g;

SELECT * FROM bt_metap('events_pkey');           -- root block, tree level
SELECT type, live_items, avg_item_size, free_size
FROM bt_page_stats('events_pkey', 1);            -- 'l' = leaf, 'i' = internal, 'r' = root
```

**Interview trap:** Candidates say "the index points to the row." Be precise: in Postgres the leaf entry points to a **heap TID**, and because of MVCC there can be multiple index entries for logically the same row (one per row version, unless HOT applies — see Q20). In MongoDB (WiredTiger) the index entry points to a RecordId; in MySQL/InnoDB secondary indexes store the *primary key* instead, which is a fundamentally different design with different trade-offs. Naming which engine you're describing is a senior signal.

---

### Q2. What happens during a page split? Why does Postgres split the rightmost leaf page differently?

**Answer:**

When an insert lands on a leaf page with no free space, the page **splits**: a new page is allocated, roughly half the entries move to it, sibling links are rewired, and a new separator key is inserted into the parent (which can recursively split up to the root — that's how the tree gains a level).

Two split strategies:

| Split type | When | Ratio | Why |
|---|---|---|---|
| Standard split | Insert lands in the *middle* of the key space | ~50/50 | Keys will keep arriving on both sides; balance the space |
| Rightmost split | Insert lands on the **rightmost leaf** (monotonically increasing keys) | ~90/10 (governed by leaf fillfactor, default 90) | The left page will *never* receive another insert, so leave it nearly full; only the new right page needs room |

The rightmost optimization is why sequential keys (`bigserial`, timestamps, UUIDv7) produce densely packed indexes: pages end up ~90% full instead of the ~50–67% average you get from random-key splits.

**Fill factor** (`WITH (fillfactor = N)`) controls how full leaf pages are packed at build/split time. Lowering it (e.g., 70) reserves headroom so future inserts into existing key ranges fit without splitting — useful for indexes that receive scattered inserts/updates, wasteful for append-only keys.

```sql
CREATE INDEX idx_orders_customer ON orders (customer_id) WITH (fillfactor = 70);

-- Watch splits happen: page count jumps as you insert into the middle of the key range
SELECT relpages FROM pg_class WHERE relname = 'idx_orders_customer';
```

A split is expensive: it dirties at least three pages (old leaf, new leaf, parent), writes full-page images to WAL if it's the first touch after a checkpoint, and takes exclusive locks briefly. One split is cheap; millions per hour are not.

---

### Q3. Why are random UUIDv4 primary keys a performance problem for B-trees, and what's the fix?

**Answer:**

With `bigserial` or UUIDv7, every insert targets the rightmost leaf: one hot page, 90/10 splits, dense packing, and the working set of "pages being written" is a handful of blocks that stay cached.

With **UUIDv4**, every insert lands on a *uniformly random* leaf page. Consequences compound:

1. **Page splits everywhere.** Every leaf is eventually the target of a mid-page insert, so you get 50/50 splits across the whole tree → pages average ~50–70% full → the index is 30–50% larger for the same data.
2. **Cache misses.** The insert working set is the *entire* leaf level, not one hot page. Once the index exceeds `shared_buffers` + page cache, every insert is a random read (to fetch the leaf) plus a random write. Insert throughput falls off a cliff exactly when the table gets big — i.e., in production, months after the design review.
3. **WAL amplification.** After each checkpoint, the first modification of any page writes a **full-page image** (~8 kB) to WAL. Sequential inserts re-dirty the same few pages, so few FPIs. Random inserts touch thousands of distinct pages per checkpoint interval → WAL volume can be 5–20x higher, which inflates replication lag, checkpoint I/O, and backup size.
4. **No locality for range scans.** "Recent rows" are scattered across the whole index and heap, so `ORDER BY created_at DESC LIMIT 50`-style access patterns lose all clustering benefit.

Fixes, in order of preference:

```sql
-- 1. UUIDv7: time-ordered, still globally unique, no coordination needed.
--    Native in Postgres 18; before that, use a library or:
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- app-side uuidv7 generation is fine; the DB doesn't care where it came from

-- 2. bigint identity + a separate random public_id for the API surface:
CREATE TABLE users (
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,  -- internal, join key
  public_id uuid   NOT NULL DEFAULT gen_random_uuid() UNIQUE, -- external, non-enumerable
  email     text   NOT NULL
);
```

**Production war story:** A client's ingest service (~4k inserts/sec into a table keyed by UUIDv4) was fine for six months, then insert p99 went from 4 ms to 180 ms over two weeks with no deploy. The index had finally outgrown RAM; every insert became a random disk read. WAL volume had also tripled, pushing the streaming replica 40+ seconds behind. Migration to UUIDv7 for new rows (the old rows didn't need to move — only *new* inserts matter for split locality) brought p99 back under 10 ms and halved WAL. The lesson: random-key pain is invisible until the index exceeds memory, so it never shows up in load tests against small datasets.

---

### Q4. What is index bloat, how does it happen, and how do you detect and fix it?

**Answer:**

**Bloat** = dead or empty space inside index pages that the index still occupies on disk and in cache. Sources:

- **MVCC churn**: every non-HOT UPDATE inserts a new index entry; the old one becomes dead and is only reclaimed by VACUUM (and the space stays on the *page*, reusable but not returned).
- **Deletes of a key range**: B-tree pages are only deleted when *completely* empty. Delete 99% of the rows in a range and the pages remain, 99% empty. Classic case: an index on `created_at` in a table where old rows are periodically deleted — the left edge of the tree becomes a wasteland ("sparse left edge" pattern).
- **50/50 splits** from random inserts (Q3) — structural half-emptiness.

Why it matters: scans read pages, not entries. A 3x-bloated index makes every range scan read 3x the pages and evicts 3x the cache.

```sql
-- Quick-and-decent bloat check (exact tool: pgstattuple)
CREATE EXTENSION IF NOT EXISTS pgstattuple;
SELECT * FROM pgstatindex('idx_orders_created_at');
-- avg_leaf_density < ~60% and leaf_fragmentation high => rebuild candidate

-- Fix without blocking writes (PG12+):
REINDEX INDEX CONCURRENTLY idx_orders_created_at;
```

Postgres 13+ B-tree **deduplication** materially reduces bloat for low-cardinality indexes (duplicate keys are stored once with a TID list), and PG14 **bottom-up index deletion** removes known-dead entries during page-split avoidance. Bloat is much less catastrophic than it was in PG11 — worth saying in an interview to show you track version behavior.

---

## Section 2 — Composite Indexes and Column Order

### Q5. You have an index on `(a, b)`. Which queries can use it, which can't, and what's the general rule for composite column order?

**Answer:**

A composite B-tree is sorted by `a` first, then `b` within equal `a` — like a phone book sorted by (last name, first name). That single fact derives everything:

```sql
CREATE TABLE orders (
  id bigserial PRIMARY KEY,
  customer_id bigint NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  total numeric NOT NULL
);
CREATE INDEX idx_orders_cust_created ON orders (customer_id, created_at);
```

| Query | Uses index efficiently? | Why |
|---|---|---|
| `WHERE customer_id = 42 AND created_at > '2026-01-01'` | Yes — single contiguous range | Descend to (42, date), scan right |
| `WHERE customer_id = 42` | Yes — prefix | All 42-entries are contiguous |
| `WHERE customer_id = 42 ORDER BY created_at DESC LIMIT 10` | Yes, **no sort node** | Entries for 42 are already sorted by created_at; walk backwards |
| `WHERE created_at > '2026-01-01'` | **No** (as a search) | Matching entries are scattered across every customer_id group — "find everyone named John" in a phone book |
| `WHERE customer_id > 100 ORDER BY created_at` | Index range on customer_id only; **still needs a Sort** | Rows are sorted by created_at only *within* each customer_id |

This is the **leading-column prefix rule**: an index on `(a, b, c)` serves predicates on `(a)`, `(a,b)`, `(a,b,c)` — any *leftmost prefix* — plus a trailing range/sort on the next column after the equality prefix.

**Column-order rule of thumb: Equality → Sort → Range.**
1. Columns compared with `=` first (they pin a contiguous block).
2. Then the `ORDER BY` column (so the block is pre-sorted — kills the Sort node, which is what makes `LIMIT 10` cheap).
3. Then range predicates (`>`, `<`, `BETWEEN`) last — because once you range over a column, everything to its right in the index is unordered *across* that range and can only be used as a filter, not a navigation.

**Interview trap:** "Put the most selective column first." This is folklore and often wrong. For `WHERE tenant_id = ? AND created_at > ?`, `(tenant_id, created_at)` is correct even though `created_at` is far more selective — because equality-first yields one contiguous scan range, while `(created_at, tenant_id)` forces scanning *every* tenant's recent rows and filtering. Selectivity-first only applies when you're choosing among *equality* columns, and even then the difference is minor (it slightly improves prefix reuse for other queries).

---

### Q6. Can Postgres use a `(a, b)` index for a query that filters only on `b`? What's an index skip scan?

**Answer:**

Mostly **no**, historically. Postgres *can* choose a `(a,b)` index for a b-only predicate, but only as a **full index scan**: read every leaf entry, apply `b = ?` as a filter. That's occasionally cheaper than a seq scan (the index may be much narrower than the table), and it appears in EXPLAIN as an Index Scan with a `Filter:` line and enormous `Rows Removed by Filter` — a smell, not a strategy.

A true **skip scan** (Oracle, MySQL 8.0.13+ in limited form, DB2 "jump scan") works when `a` has few distinct values: for each distinct `a`, probe `(a, b=?)` — turning one useless scan into `n_distinct(a)` cheap probes. **Postgres 18 finally added B-tree skip scan** for this case, but the planner only picks it when `n_distinct` of the leading column is genuinely small; on anything older than 18, assume it doesn't exist.

Practical guidance to state in an interview:

- Don't design assuming skip scan. If `WHERE b = ?` is a real query, give it its own index (or reorder).
- A common resolution: `(a, b)` + `(b)` — the second index is narrow and cheap.
- Redundancy check: if you have `(a)` and `(a, b)`, the `(a)` index is almost always redundant — drop it (verify with `pg_stat_user_indexes` first, Q21).

**Production war story:** During an incident review, a client's `payments` table had `idx_payments_merchant_status (merchant_id, status)` and a webhook processor querying `WHERE status = 'requires_retry'`. It "worked in staging" (10k rows — a full index scan is instant) and melted in production at 300M rows: 45-second full index scans holding connections, pool exhaustion, cascading API timeouts. The fix was a **partial index** `CREATE INDEX ... ON payments (created_at) WHERE status = 'requires_retry'` (see Q9) — 40 MB instead of another 9 GB composite. The root cause written in the postmortem: column order was chosen for the dashboard query and nobody re-checked it when the retry worker shipped. Index design reviews must include *every* consumer of the table.

---

## Section 3 — Covering Indexes and Index-Only Scans

### Q7. What is a covering index and an index-only scan? Why does `EXPLAIN` sometimes show "Heap Fetches" ruining it?

**Answer:**

If every column a query needs is *in the index*, Postgres can answer from the index alone — an **index-only scan** — skipping the heap entirely. The `INCLUDE` clause (PG11+) adds payload columns to leaf pages without making them part of the key (so they don't affect sort order, can't be searched on, and can even be types with no B-tree opclass):

```sql
CREATE INDEX idx_orders_cust_created_inc
  ON orders (customer_id, created_at) INCLUDE (status, total);

EXPLAIN (ANALYZE, BUFFERS)
SELECT created_at, status, total
FROM orders
WHERE customer_id = 42 AND created_at >= now() - interval '30 days';
```

```text
Index Only Scan using idx_orders_cust_created_inc on orders
    (cost=0.43..12.10 rows=31 width=25) (actual time=0.031..0.052 rows=28 loops=1)
  Index Cond: ((customer_id = 42) AND (created_at >= ...))
  Heap Fetches: 0                          <-- the number that matters
  Buffers: shared hit=4                    <-- 4 pages total; heap never touched
```

**Why Heap Fetches exist at all:** the index has no MVCC visibility information — it can't know whether a TID is visible to your snapshot. Postgres consults the **visibility map (VM)**: one bit per *heap page* saying "every tuple on this page is visible to all transactions." VM bit set → trust the index entry. VM bit clear → fetch the heap tuple anyway to check visibility; that's a **Heap Fetch**.

Only **VACUUM** sets VM bits. Any write to a heap page clears its bit. Consequences:

- After a bulk load or heavy update churn, your "index-only" scan does thousands of heap fetches — often *slower* than a plain index scan because it also read the VM.
- On append-heavy tables, recent pages (the ones hot queries touch) are precisely the ones with unset bits, until autovacuum catches up.

```text
-- Same plan on a freshly-loaded, un-vacuumed table:
Index Only Scan using idx_orders_cust_created_inc on orders
    (actual time=0.9..48.2 rows=28100 loops=1)
  Heap Fetches: 28100        <-- every row hit the heap anyway; "index-only" in name only
  Buffers: shared hit=1032 read=811
```

Fixes: run/tune autovacuum more aggressively on that table (`autovacuum_vacuum_scale_factor`, and PG13+ `autovacuum_vacuum_insert_scale_factor` for append-only tables), or explicitly `VACUUM (ANALYZE) orders;` after bulk loads.

**Interview trap:** "Add INCLUDE columns to everything so all scans are index-only." Every included column widens leaf entries → fewer entries per page → deeper/larger index → more write amplification, and each included column is another column whose UPDATE defeats HOT (Q20). Covering indexes are for a *specific hot query* with a measured heap-access cost, not a default posture.

---

## Section 4 — Partial and Expression Indexes

### Q8. When do partial indexes beat full indexes? Give concrete patterns.

**Answer:**

A partial index only contains rows matching its `WHERE` predicate. If your queries only ever touch a small, predicate-definable slice of the table, indexing the rest is pure cost: bigger index, slower writes on rows you'll never look up, worse cache density.

**Pattern 1 — soft delete.** 95% of queries want live rows; deleted rows are dead weight in every index:

```sql
CREATE INDEX idx_users_email_live ON users (email) WHERE deleted_at IS NULL;

-- Served:      SELECT * FROM users WHERE email = ? AND deleted_at IS NULL;
-- NOT served:  SELECT * FROM users WHERE email = ?;   -- predicate not implied!
```

**Pattern 2 — status queue.** A jobs table with 500M done rows and 2k pending ones:

```sql
CREATE INDEX idx_jobs_pending ON jobs (priority DESC, created_at)
  WHERE status = 'pending';
-- 2k-entry index instead of 500M. The worker's poll query:
SELECT id FROM jobs WHERE status = 'pending'
ORDER BY priority DESC, created_at LIMIT 10 FOR UPDATE SKIP LOCKED;
```

This index also *shrinks itself*: when a job leaves 'pending', its entry becomes dead and is vacuumed away. (Caveat: high churn on a tiny partial index needs healthy autovacuum or it bloats fast relative to its size.)

**Pattern 3 — partial uniqueness** (impossible with a plain constraint):

```sql
-- Each user may have at most ONE active subscription, but many canceled ones:
CREATE UNIQUE INDEX uq_subs_one_active ON subscriptions (user_id)
  WHERE status = 'active';
```

**The matching rule:** the planner uses a partial index only when it can *prove* the query's WHERE clause implies the index predicate. The proof engine is deliberately simple — near-literal matching plus basic operator reasoning. `WHERE status = 'pending'` matches; `WHERE status = ANY($1)` or `WHERE status != 'done'` does **not**, even if logically equivalent in your data. Parameterized predicates (`WHERE deleted_at IS NULL` in the index vs. the ORM emitting `deleted_at IS NOT DISTINCT FROM NULL`) are a classic silent mismatch — always `EXPLAIN` the *exact* SQL your ORM emits.

---

### Q9. How do expression indexes work, and what are the exact-match and statistics implications?

**Answer:**

An expression index stores the *result of an expression*, not the column:

```sql
CREATE INDEX idx_users_email_lower ON users (lower(email));

-- Used:      WHERE lower(email) = lower($1)     -- expression matches node-for-node
-- NOT used:  WHERE email = $1                   -- different expression
-- NOT used:  WHERE email ILIKE $1               -- ILIKE is not lower(=)
```

The query must contain the **same expression tree** the index was defined on (after normalization). `lower(email)` matches `LOWER(email)`; it does not match `lower(trim(email))`. For case-insensitive email, also consider `citext` or a non-deterministic ICU collation — but expression indexes are the zero-dependency answer.

**JSONB field extraction** — index a hot scalar field instead of GIN-indexing the whole document:

```sql
CREATE INDEX idx_events_user ON events ((payload->>'user_id'));

SELECT * FROM events WHERE payload->>'user_id' = '42';    -- B-tree, fast equality
-- Beware: ->> returns text. WHERE (payload->>'user_id')::int = 42 is a DIFFERENT
-- expression and will NOT use this index. Pick one representation and be consistent.
```

**Statistics — the underrated superpower:** normally Postgres has no statistics on `lower(email)` — it only ANALYZEs columns. But an expression index causes ANALYZE to collect stats (n_distinct, MCVs, histogram) **on the expression itself**, stored under the index's name in `pg_stats`. This can fix bad row estimates even for queries that don't use the index. On PG14+ you can also get expression stats *without* the index cost: `CREATE STATISTICS s_email_lower ON lower(email) FROM users;`.

**Interview trap:** "The index on `email` will handle `WHERE lower(email) = ...`." No — wrapping a column in *any* function makes the plain index unusable for that predicate (the index is sorted by `email`, not by `lower(email)`). This is the same failure class as `WHERE date_trunc('day', created_at) = ...` (rewrite as a range: `created_at >= d AND created_at < d + interval '1 day'`) and implicit casts (Q17). "Function on the column side of the predicate = index off" is a rule that catches an entire family of bugs.

---

## Section 5 — GIN, BRIN, and Hash

### Q10. Explain GIN. Why is it the right index for JSONB and arrays where B-tree fails?

**Answer:**

A B-tree indexes *one ordered key per row*. GIN (Generalized Inverted Index) indexes **many extracted elements per row** — an inverted index, same concept as a search engine: a B-tree of *elements* (JSON keys/values, array members, lexemes) whose leaves hold **posting lists** of TIDs, i.e., "which rows contain this element." Large posting lists become their own B-trees ("posting trees"). Duplicate elements across millions of rows are stored once — GIN compresses beautifully on repetitive data.

```sql
CREATE TABLE docs (id bigserial PRIMARY KEY, body jsonb);
CREATE INDEX idx_docs_body ON docs USING gin (body);

-- Containment: does body contain this sub-document?
SELECT * FROM docs WHERE body @> '{"status": "active", "tier": "pro"}';
-- Existence: does top-level key exist?
SELECT * FROM docs WHERE body ? 'refund_reason';
-- Arrays too:
CREATE INDEX idx_posts_tags ON posts USING gin (tags);       -- tags text[]
SELECT * FROM posts WHERE tags @> ARRAY['postgres','indexing'];
```

A B-tree on `body` would index the whole document as one opaque sorted value — useful only for `body = <exact document>`, which nobody queries. GIN decomposes the document so you can search *inside* it.

**Operator class choice matters:**

| | `jsonb_ops` (default) | `jsonb_path_ops` |
|---|---|---|
| What's indexed | Every key and every value as separate entries | Hash of each root-to-leaf *path* (key chain + value) |
| Supports | `@>`, `?`, `?|`, `?&`, `@?`, `@@` | `@>`, `@?`, `@@` only — **no key-existence `?`** |
| Size / speed | Larger; `@>` may AND several entry lists | Typically 2–3x smaller; `@>` is one exact probe — faster and more selective |

If your workload is containment-only (very common), `jsonb_path_ops` is the better default: `CREATE INDEX ... USING gin (body jsonb_path_ops);`.

Note GIN results can be **lossy** (especially path_ops hashing): the index returns candidate TIDs and the executor **rechecks** the condition against the heap row (`Rows Removed by Index Recheck` in EXPLAIN). Correctness is preserved; just don't be surprised by the recheck line.

---

### Q11. Why are GIN indexes expensive to update, and what is the pending list / fastupdate mechanism?

**Answer:**

One row insert into a GIN index isn't one index insert — it's **one insert per extracted element**. A 40-key JSONB document = 40 GIN entry updates, each potentially touching a different part of the entry tree. That's brutal write amplification, so GIN cheats:

**fastupdate (on by default):** new entries are appended to an unordered **pending list** — a simple sequence of pages — which is O(1)-ish per insert. The pending list is merged into the main structure when:

1. it exceeds `gin_pending_list_limit` (default **4 MB**) — the *inserting backend* pays the merge cost inline (latency spike for one unlucky writer);
2. autovacuum/VACUUM runs on the table;
3. you call `SELECT gin_clean_pending_list('idx_docs_body');`.

The catch: **every search must also scan the entire pending list linearly** (it's unindexed). A bloated pending list makes reads mysteriously slow with no plan change — the plan says Bitmap Index Scan either way.

```sql
-- Tuning options:
CREATE INDEX idx_docs_body ON docs USING gin (body)
  WITH (fastupdate = off);            -- pay full cost per write, predictable reads
ALTER INDEX idx_docs_body SET (gin_pending_list_limit = 512);  -- kB; merge more often
```

**Full-text search** is the other canonical GIN use:

```sql
ALTER TABLE articles ADD COLUMN tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(body,''))) STORED;
CREATE INDEX idx_articles_fts ON articles USING gin (tsv);

SELECT id, ts_rank(tsv, q) AS rank
FROM articles, to_tsquery('english', 'index & (btree | gin)') q
WHERE tsv @@ q
ORDER BY rank DESC LIMIT 20;
```

**Production war story:** A client added a GIN index on a JSONB `attributes` column of their order-items table "for the search team." Bulk order imports (batches of 50k rows) went from 30 s to over 4 minutes — and worse, every ~90 seconds one random web request writing a single order item stalled for 2–3 s. That was the pending-list merge landing on an unlucky backend. Overall write throughput on the table dropped ~40%. Fix: the search predicates only ever touched `attributes->>'sku'` and `attributes->>'vendor'`, so the GIN index was replaced with two B-tree expression indexes; imports recovered and the stalls vanished. Moral: GIN is for genuinely *unpredictable* query shapes — if you can enumerate the fields queried, expression B-trees are cheaper in every dimension.

---

### Q12. When is BRIN the right choice, and when is it useless?

**Answer:**

BRIN (Block Range INdex) doesn't index rows at all. It stores, per **block range** (default 128 heap pages ≈ 1 MB), a summary: min and max of the column within that range. A query like `WHERE created_at BETWEEN x AND y` checks each range's [min,max]; ranges that can't contain matches are skipped, ranges that might are scanned *entirely* (it's inherently **lossy** — always a Bitmap Heap Scan with recheck).

The whole trick is **physical correlation**: BRIN only works if the column's values correlate with row *placement on disk*.

| Scenario | BRIN? | Why |
|---|---|---|
| Append-only `created_at` on a 2 TB events table | Ideal | Time correlates ~1.0 with block position; ranges have tight min/max |
| Same table after years of UPDATEs/deletes reusing space | Degrades | Free-space reuse scatters new rows; min/max ranges widen until every range matches |
| `customer_id` on the same table | Useless | Every 1 MB range contains the full spread of customer ids → zero ranges skipped, plus BRIN overhead |
| Sensor/IoT ingest, log tables, immutable ledgers | Ideal | Natural insert order = natural query dimension |

```sql
CREATE INDEX idx_events_created_brin ON events USING brin (created_at)
  WITH (pages_per_range = 64);

-- Check whether BRIN can work: correlation near +/-1.0 is the green light
SELECT attname, correlation FROM pg_stats
WHERE tablename = 'events' AND attname = 'created_at';   -- e.g. 0.998
```

The economics are absurd when it fits: a B-tree on `created_at` for 2 billion rows ≈ 40–60 GB; the BRIN ≈ **a few MB**, always cached, nearly free to maintain on inserts. For big range scans over append-only data, BRIN often matches B-tree performance at 1/10000th the size. For point lookups (`WHERE id = ?`) it's the wrong tool entirely — it can never do better than "scan this 1 MB".

**Interview trap:** "BRIN is for big tables." No — BRIN is for big tables **with physically correlated columns**. A huge table with random layout gets *nothing* from BRIN; the planner will read every range. The `correlation` column in `pg_stats` is the yes/no test, and heavy update workloads erode it over time (monitor it; `CLUSTER` or table rewrite restores it).

---

### Q13. Hash indexes: when would you ever pick one over a B-tree?

**Answer:**

Hash indexes support exactly one operator: `=`. No ranges, no `ORDER BY`, no prefix matching, single-column only, no uniqueness enforcement.

Historically the advice was "never" — before Postgres 10 they weren't WAL-logged (not crash-safe, not replicated). **Since PG10 they're fully WAL-logged and legitimate**, just narrow:

- **Long keys**: a B-tree stores the full key in every internal and leaf entry; a hash index stores a 4-byte hash + TID regardless of key length. For equality lookups on long text (URLs, tokens, long composite natural keys), hash indexes are smaller and O(1)-ish vs O(log n) — measurably faster at scale.
- Note B-trees also cap key size (~2704 bytes / one-third of a page); hash has no such limit on the underlying value.

```sql
CREATE INDEX idx_pages_url_hash ON pages USING hash (url);
SELECT * FROM pages WHERE url = 'https://example.com/some/very/long/path?with=params';
```

The pragmatic alternative most teams pick instead: a B-tree **expression index on a hash of the value** — `CREATE UNIQUE INDEX ON pages (md5(url));` — because it also gives you uniqueness. Mentioning that trade-off (native hash = simpler queries, no collision handling in your SQL; md5-B-tree = uniqueness support) is the senior move. Default remains B-tree unless you've measured.

---

## Section 6 — Why the Planner Ignores Your Index

### Q14. The index exists, the query matches it, and the planner still does a sequential scan. Walk me through your diagnosis.

**Answer:**

The planner is a cost model, not a rule engine. It ignores an index when it *estimates* the index path is more expensive. Diagnosis order:

**1. Is the estimate wrong (stale/bad statistics)?** Compare estimated vs actual rows:

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM orders WHERE customer_id = 42 AND status = 'pending';
```

```text
Seq Scan on orders  (cost=0.00..184532.10 rows=412000 width=88)
                    (actual time=0.4..2210.7 rows=37 loops=1)   <-- 412000 estimated, 37 actual
  Filter: ((customer_id = 42) AND (status = 'pending'))
  Rows Removed by Filter: 8999963
```

A 4-orders-of-magnitude misestimate means statistics, not indexes. Causes: table changed a lot since last ANALYZE; `default_statistics_target` (100) too coarse for a skewed column; `n_distinct` badly wrong on high-cardinality columns (it's sampled — for very large tables it can underestimate wildly, making the planner think each value matches many rows); or correlated columns (planner multiplies independent selectivities: if `city='SF'` implies `state='CA'`, it underestimates the combo — fix with `CREATE STATISTICS ... (dependencies)`).

```sql
-- Inspect what the planner believes:
SELECT attname, n_distinct, null_frac, correlation,
       most_common_vals, most_common_freqs
FROM pg_stats WHERE tablename = 'orders' AND attname IN ('customer_id','status');

ANALYZE orders;                                        -- refresh
ALTER TABLE orders ALTER COLUMN customer_id SET STATISTICS 1000;  -- finer histogram
ANALYZE orders;

-- If n_distinct sampling is hopeless on a huge table, override it:
ALTER TABLE orders ALTER COLUMN customer_id SET (n_distinct = 2500000);
```

After ANALYZE, same query:

```text
Index Scan using idx_orders_cust_status on orders
    (cost=0.43..152.6 rows=41 width=88) (actual time=0.05..0.31 rows=37 loops=1)
  Index Cond: ((customer_id = 42) AND (status = 'pending'))
```

**2. Is the estimate right and the seq scan genuinely cheaper (selectivity)?** See Q15.

**3. Is the predicate not actually index-compatible (casts, collation, wrapped columns, OR)?** See Q16–Q17.

To *prove* which case you're in, temporarily force the issue in a session: `SET enable_seqscan = off;` then re-EXPLAIN. If the index plan appears and is faster → costing/statistics problem. If Postgres still won't use the index → the predicate can't use it at all (case 3). Never ship `enable_seqscan=off`; it's a diagnostic probe.

---

### Q15. Why does the planner prefer a seq scan when your query matches 10% of the table? Isn't 10% selective?

**Answer:**

No — 10% is *terrible* selectivity for an index scan on a big table. The reason is **random vs sequential I/O and page-level economics**:

- An index scan fetches heap rows in *index order*, i.e., random heap pages. Costed at `random_page_cost` (default 4.0 vs `seq_page_cost` 1.0).
- Rows per page: at ~100 rows/8 kB page, fetching a random 10% of rows means you touch nearly **every heap page anyway** (each page has ~10 matching rows) — but one page at a time, in random order, possibly re-fetching. A seq scan reads each page exactly once, sequentially, with read-ahead.

Rule of thumb: index scans win below roughly **1–5%** selectivity (lower on spinning disks, higher on fast NVMe / cached data); seq scans win above ~10%. In between, Postgres often picks a **Bitmap Heap Scan** — the compromise: scan the index to build a bitmap of matching pages, sort it, then read those heap pages in *physical order* (sequential-ish I/O, each page once).

Two levers seniors should name:

1. **`random_page_cost`**: the 4.0 default models spinning disks. On NVMe/cloud SSDs with a warm cache, 1.1–1.5 is realistic and makes the planner correctly favor indexes it was wrongly skipping. This one setting resolves a huge fraction of "planner ignores my index" complaints on modern hardware.
2. **`correlation` (pg_stats)**: if the column's values correlate with physical order (e.g., `created_at` on append-only data, correlation ≈ 1.0), an index *range* scan reads nearly-sequential heap pages, and the planner knows it — it will happily index-scan 20% of a well-correlated table. Same query on a correlation ≈ 0 column → bitmap or seq scan. This is also why `CLUSTER orders USING idx_orders_created;` (one-time physical reorder) can flip plans.

**Interview trap:** "The planner is wrong, I'll force the index" (with `enable_seqscan=off` or the pg_hint_plan extension). If the estimate is *accurate* and it still picks seq scan, forcing the index usually makes it slower — you've turned one sequential pass into millions of random reads. Verify with `EXPLAIN (ANALYZE, BUFFERS)` timings, not vibes: the planner is right more often than the developer who is angry at it.

---

### Q16. Why doesn't `WHERE varchar_col = 123` or a `LIKE 'abc%'` use the index?

**Answer:**

**Implicit casts:** `WHERE varchar_col = 123` can't compare text to int directly, so Postgres rewrites it as `varchar_col::text = 123::text`... actually no — it resolves to casting the *column*: effectively `(varchar_col)::integer = 123` fails or, in mixed cases like `numeric_string_col = 123`, the column gets wrapped in a cast. A wrapped column = no index (Q9's rule). The everyday versions of this bug:

```sql
-- Column is varchar, app passes a number (or ORM binds the wrong type):
EXPLAIN SELECT * FROM shipments WHERE tracking_code = 78231;
-- ERROR or Seq Scan with Filter: ((tracking_code)::bigint = 78231)

-- Fix: bind the right type
SELECT * FROM shipments WHERE tracking_code = '78231';   -- Index Scan
```

The JDBC/ORM flavor: sending a `bigint` parameter against a `varchar` column, or `timestamp` vs `timestamptz` mismatches. Always check the `Filter:`/`Index Cond:` line for unexpected `::casts` on the **column side** (casts on the constant side are fine).

**LIKE and collation:** a B-tree can serve `LIKE 'abc%'` by rewriting it to `>= 'abc' AND < 'abd'` — but **only if the index's collation sorts byte-wise**. Under ICU/libc locales like `en_US.UTF-8`, string order is linguistic ("résumé" sorting rules), and character-range rewriting is invalid, so the planner refuses. Options:

```sql
-- Option A: operator class designed for pattern matching
CREATE INDEX idx_users_email_pat ON users (email text_pattern_ops);
-- Serves: LIKE 'abc%', ~ '^abc'.  Does NOT serve plain <, >, ORDER BY email
-- (you may need BOTH this and the default-opclass index).

-- Option B: C collation on the index
CREATE INDEX idx_users_email_c ON users (email COLLATE "C");

-- Neither helps: LIKE '%abc' or '%abc%' — no prefix to anchor on.
-- For infix search: GIN + pg_trgm.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_users_email_trgm ON users USING gin (email gin_trgm_ops);
SELECT * FROM users WHERE email LIKE '%@pedalsup.com';   -- now indexable
```

**Production war story:** A support-tooling search (`WHERE email LIKE $1 || '%'`) was fine on the team's local Docker Postgres and did seq scans in production — 8-second lookups during an incident when support was slammed. Local image was initialized with `C` locale; the managed cloud instance with `en_US.UTF-8`. Same schema, same index, same query, different collation → planner silently refused the prefix rewrite. Fix was a `text_pattern_ops` index; the durable lesson was to pin `LC_COLLATE`/provider in infrastructure code so dev matches prod, and to treat "works locally, seq-scans in prod" as a collation/statistics question before anything else.

---

### Q17. What other predicate shapes silently disable index use? (ORs, functions, NOT, inequality on the leading column)

**Answer:**

A checklist worth reciting:

1. **Function/expression wrapping the column** — `lower(email) = ?`, `created_at::date = ?`, `coalesce(x, 0) = ?` — unless you have a matching expression index (Q9). Rewrite date-equality as ranges.
2. **OR across different columns** — `WHERE a = 1 OR b = 2` can't be one index descent. Postgres *can* handle it as a **BitmapOr** of two indexes (one on `a`, one on `b`) — but only if both exist. If one side is unindexed, the whole thing degrades to seq scan. Rewriting as `UNION ALL` of two indexed queries is the classic manual fix and often beats BitmapOr for LIMIT queries.
3. **Negations** — `!=`, `NOT IN`, `IS DISTINCT FROM` are assumed low-selectivity ("everything except X") and rarely use indexes; if "everything except X" is actually rare rows, a **partial index** `WHERE status <> 'done'` flips it.
4. **Leading wildcard / non-anchored patterns** — Q16; needs trigram GIN.
5. **Inequality on a non-leading composite column** — `(a, b)` with `WHERE a > 5 AND b = 3`: the range on `a` means `b` is only a filter inside the range (this is the "range last" rule from Q5 seen from the failure side).
6. **NULL logic surprises** — B-trees *do* index NULLs (`IS NULL` is indexable, and you can `ORDER BY x NULLS FIRST` against a matching index) — candidates often get this backwards; the true limitation is that `NOT IN (subquery-with-NULLs)` has broken *semantics*, not broken indexing.
7. **Volatile parameter shapes** — `WHERE customer_id = ANY($1)` with a 10,000-element array: indexable but the planner may misestimate; and generic prepared-statement plans (before plan_cache_mode custom/auto behavior) can pick a plan that's wrong for skewed values.

**Interview trap:** "Postgres can only use one index per query." False — Bitmap **And**/**Or** combine multiple single-column indexes routinely. The senior nuance: a purpose-built composite index still beats a BitmapAnd of two singles (no bitmap build, preserved ordering for LIMIT), so bitmap combination is a fallback you *notice in EXPLAIN* and then decide whether to replace with a composite.

---

## Section 7 — The Write Side: What Indexes Cost You

### Q18. "Indexes slow down writes" — quantify that. What are HOT updates and how do indexes defeat them?

**Answer:**

Every index is a **write amplifier**. One logical row write costs, physically:

- **INSERT**: 1 heap write + N index entry insertions (each a B-tree descent, possible page split, WAL for every touched page).
- **DELETE**: cheap at delete time (just marks the heap tuple; index entries are cleaned later by vacuum) — the cost is deferred to VACUUM and to index bloat.
- **UPDATE**: MVCC means an update is *insert of a new row version*. Naively that means new entries in **every index, even indexes on columns that didn't change** — because the new version has a new TID and every index must point at it.

**HOT (Heap-Only Tuple) updates** are the escape hatch. If (a) **no indexed column changed**, and (b) the new version fits **on the same heap page**, Postgres links old→new version inside the page and *touches zero indexes*. Index entries keep pointing at the original slot and follow the chain.

Both conditions are things you control:

- Condition (a) is why "just index it, indexes are cheap" is wrong: **indexing a frequently-updated column disables HOT for every update that touches it**, converting cheap in-page updates into all-indexes updates. An index on `last_seen_at` or `updated_at` is the canonical self-own.
- Condition (b) is what heap **fillfactor** buys: `ALTER TABLE sessions SET (fillfactor = 80);` leaves 20% of each page free so new versions fit locally.

```sql
-- Measure your HOT ratio:
SELECT relname, n_tup_upd, n_tup_hot_upd,
       round(100.0 * n_tup_hot_upd / nullif(n_tup_upd,0), 1) AS hot_pct
FROM pg_stat_user_tables ORDER BY n_tup_upd DESC LIMIT 10;
```

**Production war story:** A sessions table (`user_id, token, last_seen_at, data`) updated `last_seen_at` on every request. Someone shipped an index on `last_seen_at` to speed an admin dashboard ("show recently active users"). HOT percentage on the table went from 96% to 0% overnight — every request-path update now wrote to all five indexes on the table. Write p95 rose ~40%, autovacuum fell behind on the suddenly-fast-bloating indexes, and replica lag alarms fired at peak. Fix: drop the index; the dashboard query moved to `WHERE last_seen_at > now() - interval '15 minutes'` against a 1-minute-granularity rollup. The general principle: on hot-update tables, every additional index must justify itself against the HOT ratio it destroys, not just its own maintenance cost.

---

### Q19. How do you find and safely remove unused or duplicate indexes, and when do you REINDEX?

**Answer:**

```sql
-- Unused indexes: zero (or negligible) scans since stats reset, with their cost shown
SELECT s.schemaname, s.relname AS table, s.indexrelname AS index,
       pg_size_pretty(pg_relation_size(s.indexrelid)) AS size,
       s.idx_scan,
       i.indisunique, i.indisprimary
FROM pg_stat_user_indexes s
JOIN pg_index i ON i.indexrelid = s.indexrelid
WHERE s.idx_scan = 0
  AND NOT i.indisunique          -- unique/PK indexes enforce constraints even if never scanned
ORDER BY pg_relation_size(s.indexrelid) DESC;
```

Caveats before dropping:

- **Check the replicas.** `pg_stat_user_indexes` is per-instance; an index unused on the primary may serve read-replica traffic. Query it everywhere.
- **Check the time window.** Stats since last reset (`pg_stat_reset()` / major upgrade) might not include the monthly billing job. Note `stats_reset` in `pg_stat_database`.
- **Redundant prefixes**: `(a)` alongside `(a, b)` — the former is usually droppable (Q6). Exact duplicates from ORM migrations are common and free wins.
- Use a safety net: PG lets you make dropping reversible-ish via `DROP INDEX CONCURRENTLY` (non-blocking) after first watching for a while; on PG14+ some teams simulate "disable" by dropping during low traffic with the CREATE statement saved and rehearsed.

**REINDEX** — when the index is bloated (Q4, `pgstatindex` density < ~60%), corrupted, or after collation library changes (glibc upgrades can silently corrupt text index order — a real operational hazard: `REINDEX` any text-keyed index after major OS upgrades):

```sql
REINDEX INDEX CONCURRENTLY idx_orders_created_at;   -- PG12+; builds a sibling, swaps, drops
-- Needs ~2x disk for that index during the build; can leave an *_ccnew invalid index
-- if it fails — check:
SELECT indexrelid::regclass FROM pg_index WHERE NOT indisvalid;
```

Plain `REINDEX` takes an exclusive-ish lock that blocks writes — production use is `CONCURRENTLY` or nothing. Same rule for creation: **always `CREATE INDEX CONCURRENTLY` on live tables** (two table scans, no write lock, but can't run in a transaction — migration tools need the `atomic = False` / `disable_ddl_transaction!` escape hatch).

**Interview trap:** "Indexes are free to keep around, disk is cheap." Disk isn't the cost. Every extra index is per-write latency (Q18), vacuum work, cache pollution (its pages evict useful ones), longer `pg_dump`/restore, and planner overhead considering it. Fleet-wide index hygiene reviews are a standard senior/staff ritual — come to the interview with the `pg_stat_user_indexes` query memorized.

---

## Section 8 — MongoDB Indexes Side by Side

### Q20. Explain MongoDB's ESR rule for compound indexes with a worked explain() example.

**Answer:**

MongoDB compound indexes are B-trees too (WiredTiger), so the same phone-book logic applies — Mongo just names the rule explicitly: **Equality, Sort, Range**.

```javascript
// Orders collection; hot query: a customer's recent big orders
db.orders.createIndex({ customerId: 1, createdAt: -1, total: 1 })
//                       Equality        Sort            Range

db.orders.find({
  customerId: 42,
  total: { $gt: 100 }
}).sort({ createdAt: -1 }).limit(10)
  .explain("executionStats")
```

Annotated (trimmed) output — the numbers to read, in order:

```javascript
{
  executionStats: {
    nReturned: 10,
    totalKeysExamined: 27,     // index entries touched
    totalDocsExamined: 10,     // heap... er, document fetches
    executionTimeMillis: 0,
    executionStages: {
      stage: "LIMIT",
      inputStage: {
        stage: "FETCH",        // fetch full docs for the 10 survivors
        inputStage: {
          stage: "IXSCAN",     // <-- index scan; COLLSCAN here = no index used
          indexName: "customerId_1_createdAt_-1_total_1",
          indexBounds: {
            customerId: ["[42, 42]"],                    // equality: pinned
            createdAt:  ["[MaxKey, MinKey]"],            // sort: walked in order, no bounds
            total:      ["(100, inf]"]                   // range: filtered within the walk
          }
        }
      }
    }
  }
}
```

How to read it like a reviewer:

- `IXSCAN` vs `COLLSCAN`: table stakes. `COLLSCAN` on a hot path = missing index.
- **`totalKeysExamined / nReturned`** ≈ 2.7 here — healthy. A ratio of 1 is perfect; hundreds means the index navigates poorly (wrong column order) and the `total` range is discarding almost everything.
- **`totalDocsExamined / nReturned`** = 1.0 — ideal; every fetched document was returned. `docsExamined >> nReturned` means a post-fetch filter is doing the real work (predicate not covered by index bounds).
- **No `SORT` stage**: the sort came free from the index. A blocking `SORT` stage means the index order didn't match — and above the 100 MB memory limit the query *fails* outright (`allowDiskUse` for aggregations) — Mongo punishes missing sort-support harder than Postgres does.

Put `createdAt` after `total` (E-R-S instead of E-S-R) and the same query shows `totalKeysExamined` in the thousands plus an in-memory `SORT` stage: the range fragments the ordering, exactly like Postgres in Q5.

**Interview trap:** In Mongo the index direction pattern matters for compound sorts: `{ a: 1, b: -1 }` serves `sort({a:1, b:-1})` and its exact reverse `sort({a:-1, b:1})`, but **not** `sort({a:1, b:1})`. Single-field index direction never matters (traverse either way); mixed-direction compound sorts require a matching (or exactly inverted) index. Postgres has the identical rule via `ORDER BY a ASC, b DESC` needing `(a ASC, b DESC)` — candidates who know it in one system and not the other reveal they memorized rather than understood.

---

### Q21. What are multikey indexes and what restrictions do they impose on compound indexes?

**Answer:**

Index a field that holds an **array** and Mongo automatically makes the index **multikey**: one index entry *per array element* (the same trick as Postgres GIN, but transparent and per-field).

```javascript
db.posts.insertOne({ title: "B-trees", tags: ["postgres", "indexing", "internals"] })
db.posts.createIndex({ tags: 1 })          // multikey: 3 entries for this doc

db.posts.find({ tags: "indexing" })        // IXSCAN, direct hit
db.posts.find({ tags: { $all: ["postgres", "indexing"] } })  // index-assisted
```

Restrictions that bite in production:

1. **At most one array field per compound index, per document.** `createIndex({ tags: 1, categories: 1 })` where both are arrays fails on insert of any doc where both are arrays — because the entry count would be the *Cartesian product*. Schema designs with parallel arrays are un-indexable together; this is a data-modeling smell.
2. **Multikey indexes can't cover queries** (Q22) — the index entry is one element, not the array; Mongo must fetch the doc.
3. **Index bounds get pessimistic**: for `$elemMatch`-less compound predicates on array elements, bounds on different elements of the *same* array can't be intersected per-element — `find({ scores: { $gt: 80, $lt: 90 } })` matches a doc with `scores: [70, 95]` (different elements satisfy each clause!). `$elemMatch` restores both semantic intent and tight index bounds:

```javascript
db.students.find({ scores: { $elemMatch: { $gt: 80, $lt: 90 } } })  // one element in range
```

4. **Write amplification** scales with array length — a 200-element array = 200 index entries per document write. Unbounded growing arrays under an index are the Mongo equivalent of the Q11 GIN story.

Postgres mapping: multikey ≈ `GIN (tags)` on a `text[]`; the "one array per compound index" limit is a restriction Postgres GIN doesn't share (multicolumn GIN exists) but pays for differently (Q11 write costs).

---

### Q22. What is a covered query in MongoDB, and why does `_id` keep breaking yours?

**Answer:**

A covered query = answered entirely from the index — Mongo's index-only scan, shown as an `IXSCAN` with **no `FETCH` stage** and `totalDocsExamined: 0`. Requirements are stricter than Postgres:

1. Every filtered field is in the index.
2. Every *projected* field is in the index.
3. **The projection explicitly excludes `_id`** (or `_id` is itself in the index) — because Mongo returns `_id` by default, and if it's not in the index, a fetch is forced.
4. No field in the index is an array (multikey — Q21) and, in older behaviors, no nulls quirks on the queried fields.

```javascript
db.users.createIndex({ email: 1, plan: 1 })

// NOT covered — implicit _id in the output forces FETCH:
db.users.find({ email: "karan.shah@pedalsup.com" }, { plan: 1 })

// Covered — _id excluded:
db.users.find({ email: "karan.shah@pedalsup.com" }, { plan: 1, _id: 0 })
  .explain("executionStats")
// -> stage: "PROJECTION_COVERED" over IXSCAN, totalDocsExamined: 0
```

The senior contrast with Postgres: Mongo has **no visibility map problem** — WiredTiger MVCC works differently (no in-heap dead versions needing per-tuple visibility checks against the index), so a covered query is *reliably* document-free, whereas a Postgres index-only scan silently degrades after write churn until vacuum (Q7). In exchange, Postgres `INCLUDE` lets you add non-searchable payload columns without affecting the key; Mongo has no INCLUDE — covering fields are always full key parts, widening entries and affecting write cost identically.

---

### Q23. Cover Mongo's partial, sparse, TTL, and wildcard indexes and their Postgres analogues.

**Answer:**

**Partial** (Mongo 3.2+; use instead of sparse in all new code):

```javascript
db.orders.createIndex(
  { customerId: 1, createdAt: -1 },
  { partialFilterExpression: { status: "pending" } }
)
// Used ONLY when the query's filter *implies* the expression — same proof
// requirement as Postgres (Q8). This query qualifies:
db.orders.find({ status: "pending", customerId: 42 })
// This does NOT (planner can't prove implication):
db.orders.find({ status: { $in: ["pending", "processing"] }, customerId: 42 })

// Partial uniqueness — same trick as Postgres Q8 pattern 3:
db.subscriptions.createIndex({ userId: 1 },
  { unique: true, partialFilterExpression: { status: "active" } })
```

**Sparse** — legacy: skips documents *missing the field* entirely. Partial with `{ field: { $exists: true } }` supersedes it; sparse has surprising interactions (a sparse unique index allows multiple docs missing the field — sometimes exactly what you want for optional-but-unique fields, which is the one place you still see it).

**TTL**:

```javascript
db.sessions.createIndex({ lastSeenAt: 1 }, { expireAfterSeconds: 3600 })
```

A background monitor runs every **60 seconds** and deletes expired docs in batches — so expiry is approximate (docs can outlive TTL by minutes under load, and mass expiry causes delete storms competing with your workload). Postgres has no TTL indexes; the equivalents are `pg_cron`-driven deletes or, properly, **partitioning by time and dropping partitions** (which is O(1) and generates no dead tuples — strictly better than both at scale).

**Wildcard** (`$**`, Mongo 4.2+) — index *all* fields (or a subtree) of unpredictable/dynamic schemas:

```javascript
db.events.createIndex({ "payload.$**": 1 })
db.events.find({ "payload.device.os": "ios" })        // usable
db.events.find({ "payload.a": 1, "payload.b": 2 })    // only ONE wildcard term per plan;
                                                      // second predicate becomes a filter
```

Wildcard is Mongo's closest cousin to a Postgres **GIN on jsonb** — same use case (unknown query shapes over documents), same warning (heavy write cost, prefer targeted indexes on enumerable fields — the exact conclusion of the Q11 war story).

---

### Q24. Give me the Postgres-to-MongoDB indexing concept map you'd draw on a whiteboard.

**Answer:**

| Concept | Postgres | MongoDB | Notes / gotcha deltas |
|---|---|---|---|
| Default structure | B-tree (8 kB pages, high keys, B-link) | B-tree (WiredTiger) | Same big-O, same phone-book intuition |
| Composite ordering rule | Equality → Sort → Range (Q5) | ESR rule — identical | Both fail the same way on range-before-sort |
| Prefix rule | Leftmost prefix of `(a,b,c)` | Same ("index prefixes") | Same |
| Skip scan on non-leading column | PG18+ only, narrow cases | No (plan may still pick full index scan) | Design as if neither has it |
| Covering / index-only | `INCLUDE` + index-only scan; **visibility map / Heap Fetches** caveat | Covered query; must handle `_id`; no VM caveat | Mongo's is more reliable; Postgres's is more flexible (INCLUDE payload) |
| Partial index | `WHERE deleted_at IS NULL` | `partialFilterExpression` | Both require the query to provably imply the predicate |
| Partial uniqueness | Partial unique index | `unique + partialFilterExpression` | Same pattern, same interview question |
| Expression index | `lower(email)`, `(payload->>'k')` | No direct equivalent — use computed/materialized fields ($set on write, or 4.4+ hidden fields pattern); case-insensitivity via collation-aware index `{ collation: { locale, strength: 2 } }` | Mongo pushes the computation to write time |
| Semi-structured / unknown fields | GIN on `jsonb` (`@>`, `?`; jsonb_ops vs path_ops) | Wildcard index `$**`; or native compound indexes on known dotted paths | Both: prefer targeted indexes when fields are enumerable |
| Arrays | GIN on array columns | Multikey (automatic) | Mongo: max one array per compound index; neither covers queries from array entries |
| Full-text | tsvector + GIN, `ts_rank` | Atlas Search (Lucene) / legacy `text` index | Mongo's legacy text index is weak; Atlas Search is the real answer |
| Physically-correlated big data | BRIN | Nothing equivalent | A genuine Postgres advantage for append-only telemetry |
| Equality-only structure | Hash index (WAL-safe PG10+) | Hashed index (mainly for hashed sharding keys) | Mongo's hashed index is primarily a sharding tool |
| TTL / expiry | None (partition drops, pg_cron) | TTL index (60 s sweep, approximate) | Partition-drop beats both at large scale |
| Build without blocking | `CREATE INDEX CONCURRENTLY` (2 scans, non-transactional) | Index builds are online-by-default (4.2+) | Older Mongo lore about background:true is obsolete |
| Unused index detection | `pg_stat_user_indexes.idx_scan` | `db.coll.aggregate([{ $indexStats: {} }])` | Same caveats: per-node stats, check all members of the replica set |
| Plan inspection | `EXPLAIN (ANALYZE, BUFFERS)` | `.explain("executionStats")` | Learn to read both cold; ratios (keys/docs examined vs returned) are the shared language |
| Force/pin a plan | `enable_*` GUCs (diagnostic only), pg_hint_plan | `hint()`, index filters / plan cache | Same rule: hints are for diagnosis and last-resort pinning, not defaults |

Closing framing for the interview: indexes are the same data structure everywhere; what differs is **what surrounds them** — Postgres's MVCC heap gives you HOT, visibility maps, vacuum, and bloat as first-class operational concerns, while Mongo trades those for stricter covering rules, multikey restrictions, and a plan cache with its own personality. The transferable senior skill is the diagnostic loop: read the plan, compare estimated vs actual (or keysExamined vs nReturned), check what the optimizer *believes* (pg_stats / $indexStats), and only then change the schema — in that order.
