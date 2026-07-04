# Lesson 6.6 — Choosing Databases: The FDE Decision Framework

> Module: Databases Deep Dive | Level: Senior | FDE Prep Phase 6

A Forward Deployed Engineer is not judged on how many databases they can name — they are judged on whether they can make a *defensible* choice under a specific customer's constraints and explain the trade-offs to a skeptical staff engineer on the customer side. That means starting from access patterns, consistency needs, and the customer's real (not aspirational) scale, and defaulting to boring technology until there is evidence to leave it. This capstone lesson is the judgment layer on top of everything in Lessons 6.1–6.5: the framework, the taxonomy mapped to real scenarios, the classic DynamoDB-vs-JSONB debate, polyglot pitfalls, cost, and migration war stories.

---

## Section 1 — The Decision Framework

### Q1. A customer asks "which database should we use?" Walk me through your actual process.

**Answer:**

Never answer with a product name first. The process is a funnel, and each stage can eliminate whole families:

1. **Access patterns first.** List every query the system must answer: "get user by id", "list orders by customer sorted by date", "ad-hoc revenue reports by region", "find similar documents". Databases are chosen *for the reads and writes you will actually issue*, not for the shape of the data in the abstract. If the customer cannot enumerate access patterns, that itself is a finding — it means they need a database that tolerates unknown future queries (which points strongly at relational).
2. **Consistency and integrity requirements.** Does money move? Do two entities need to change atomically? Is "read your own write" required? Financial integrity, inventory decrements, and multi-entity invariants push you to ACID transactions as a hard requirement, not a preference.
3. **Scale reality, in numbers.** Actual QPS, actual data size, actual growth rate — written down. "We'll be huge" is not a number. The vast majority of B2B systems are under 1,000 QPS and under 1 TB, which a single well-tuned Postgres instance handles with headroom.
4. **Team skills.** A database the team can't operate, debug at 3 a.m., or model correctly is the wrong database even if it's technically superior. A MERN team knows MongoDB idioms; a Rails-heritage team knows Postgres. Skill fit changes the answer.
5. **Ops budget.** Who patches it, backs it up, handles failover? A two-person platform team should not be running a Cassandra ring. Managed services shift this but add cost and vendor coupling.
6. **Only then: pick the family, then the product.** Family (relational, document, KV, wide-column, graph, vector, time-series) is the real decision; the product within a family is usually a smaller call driven by cloud, licensing, and team familiarity.

The one-line version for interviews: **access patterns × consistency × real scale × team × ops budget → family → product.** Ordering matters — teams that start from "which product is cool" run this funnel backwards and rationalize.

**Interview trap:** Answering "it depends" without saying *on what*. "It depends" is correct but only earns credit when followed immediately by the enumerated dimensions above and how each one moves the decision. Interviewers use this question to separate people who have made the decision under consequences from people who have read comparison blog posts.

### Q2. What does "boring technology" mean as a database default, and what evidence justifies leaving it?

**Answer:**

The boring-technology argument (Dan McKinley's framing): every organization has a limited number of "innovation tokens," and databases are the worst place to spend them because data outlives every application rewrite. The default should be **Postgres until proven otherwise** — it has ACID transactions, rich indexing (B-tree, GIN, GiST, BRIN), JSONB for document workloads, full-text search, logical replication, pgvector for embeddings, mature tooling, and it answers *questions you didn't know you'd have* because SQL is ad-hoc by nature. Its failure modes are documented over 30 years; when it breaks, the answer is on the first page of results.

Leaving the default requires *evidence*, not vibes. Concrete thresholds that constitute evidence:

| Evidence | What it justifies |
|---|---|
| Sustained write throughput a single primary can't absorb (tens of thousands of writes/sec after tuning, batching, and partitioning) | Wide-column (Cassandra/Scylla) or Dynamo |
| Working set or table sizes where B-tree maintenance and vacuum visibly hurt (multi-TB single tables, despite partitioning) | Purpose-built stores or sharding |
| Hard multi-region active-active writes as a business requirement (not "would be nice") | Cassandra/Dynamo global tables |
| Queries that are structurally hostile to SQL: 4+ hop graph traversals, nearest-neighbor over 100M+ vectors, high-cardinality time-series rollups | Graph / dedicated vector / TSDB |
| p99 latency SLO in single-digit ms at a scale where Postgres connection and buffer behavior can't guarantee it | DynamoDB / Redis tier |
| Genuinely schema-per-tenant or aggregate-shaped data where relational modeling is fighting the domain | Document store |

What is **not** evidence: "MongoDB is web scale," "we might need to shard someday," "the tutorial used it," "Postgres is old." An FDE's credibility with a customer's senior engineers comes precisely from resisting resume-driven choices.

**Interview trap:** Confusing "Postgres can't do X" with "I don't know how Postgres does X." Interviewers probe this deliberately: candidates claim Postgres can't handle document data (JSONB + GIN says otherwise), can't scale reads (read replicas), can't do search (tsvector, or pg_trgm), can't do vectors (pgvector). Know what Postgres *actually* can't do — multi-region active-active writes, elastic serverless-style scaling without engagement, and linear write scaling without a sharding layer like Citus — so your reasons for leaving are the true ones.

### Q3. What's your customer discovery checklist before recommending a datastore?

**Answer:**

The FDE runs this verbatim in a whiteboard session. The order is intentional — early answers prune later questions:

| # | Question to the customer | Why it matters / what it prunes |
|---|---|---|
| 1 | List the top 10 queries/operations by frequency. Which are known now vs. speculative? | Known+stable → KV/Dynamo viable. Unknown → relational strongly favored. |
| 2 | What must be atomic together? Does money or inventory move? | Multi-entity invariants → ACID non-negotiable; prunes most NoSQL-as-primary. |
| 3 | Current and 18-month QPS and data size, in numbers you'd put in a contract. | Under ~1k QPS / 1 TB, scale is a non-factor; stop optimizing for it. |
| 4 | Read:write ratio? Are writes bursty or steady? Append-only or update-heavy? | Write-heavy append → wide-column/TSDB candidates; update-heavy → MVCC stores. |
| 5 | Latency SLO: p50 or p99? Enforced by contract or aspirational? | Contractual single-digit-ms p99 → Dynamo/Redis tier enters. |
| 6 | Consistency tolerance: can a read be seconds stale? Per feature, not globally. | Opens read replicas, caches, eventual-consistency designs feature-by-feature. |
| 7 | Multi-region: DR only (pilot light) or active-active writes? | Active-active writes is the single most expensive word in the conversation. |
| 8 | Who operates this? On-call maturity? Prior 3 a.m. database incident? | Prunes self-hosted anything for small teams. |
| 9 | Cloud commitments, compliance (data residency, SOC2, HIPAA), procurement constraints? | Prunes vendors before technical merit is even discussed. |
| 10 | What does the team already know deeply? | Skill fit is a first-class input, not a tiebreaker. |
| 11 | Reporting/analytics: who queries this data ad-hoc? Finance? Data science? | Ad-hoc consumers → SQL surface required somewhere (primary or CDC replica). |
| 12 | What's the migration story if we're wrong? | Reversibility is a feature; Dynamo single-table is hard to leave, Postgres is easy. |

The output of the session is a one-page decision memo: chosen store, the two runner-ups, and *the specific answers above that eliminated them*. That memo is what makes the choice defensible six months later when someone new asks "why didn't we use X?"

---

## Section 2 — The Taxonomy, With Real Scenarios

Orientation table before the per-family questions — the seven families, compressed to their essence:

| Family | Exemplars | Core primitive | Buys you | Charges you | Reach for it when |
|---|---|---|---|---|---|
| Relational | Postgres, MySQL | Tables + joins + ACID transactions | Ad-hoc queries, integrity constraints, pivot tolerance | Vertical-ish write scaling, schema ceremony | Default; always start here |
| Document | MongoDB | Self-contained document, single-doc atomicity | Aggregate reads/writes in one op, flexible shapes, MERN velocity | Join capability, cross-doc invariants, ad-hoc analytics | Data is read/written as whole aggregates |
| Key-value | Redis, DynamoDB-as-KV | Get/put by exact key | Predictable microsecond–millisecond ops, TTLs, counters | Any query that isn't "by key" | Sessions, flags, rate limits, idempotency keys |
| Wide-column | Cassandra, ScyllaDB | Partition key + clustering order, LSM writes | Linear write scale, multi-region active-active | Table-per-query modeling, heavy ops tax | 100k+ writes/sec sustained, geo-distributed writes |
| Graph | Neo4j, Neptune | Nodes/edges, index-free adjacency | Variable-depth traversals in real time | New query language, ops, small ecosystem | 3+ hop / unbounded-depth queries dominate |
| Vector | pgvector, Pinecone, Qdrant | ANN index over embeddings | Semantic similarity search | Recall/latency/cost triangle, sync pipelines if separate | RAG, semantic search, recommendations by embedding |
| Time-series | Timescale, InfluxDB, ClickHouse | Time-partitioned, compressed, columnar-ish storage | Cheap high-rate ingest, rollups, retention-by-drop | Not general-purpose; update-hostile | Metrics, IoT, events with time-windowed queries |

### Q4. When is a relational database (Postgres/MySQL) non-negotiable rather than merely the default?

**Answer:**

Relational is the default because it's the only family that gracefully answers *questions you didn't plan for*. It becomes non-negotiable when any of these hold:

- **Financial or inventory integrity.** Debits and credits, stock decrements, billing state machines. You need multi-row, multi-table ACID transactions with serializable or at least snapshot isolation, plus foreign keys and CHECK constraints enforced *in the database* — application-enforced invariants drift.
- **Ad-hoc query consumers exist.** Finance exports, support dashboards, "quick question" analytics. SQL + indexes means new questions cost a query, not a schema redesign.
- **Unknown future access patterns.** Early-stage products pivot; the normalized relational model is the most pivot-tolerant data representation we have because it stores facts once, unentangled from any one read path.
- **Many-to-many relationships are central to the domain.** Users↔teams↔projects↔permissions. Join-shaped domains belong in a join-native store.

Postgres vs MySQL, briefly: Postgres wins on feature surface (JSONB, richer index types, transactional DDL, extensions like pgvector/PostGIS/Timescale) and is the safer default for new builds; MySQL/InnoDB remains excellent for read-heavy OLTP with simpler queries and is often the right call when the team already runs it well or the ecosystem (e.g., Vitess for sharding) matters. Changing between them mid-flight is rarely worth it — this is a "whichever you know" decision.

```sql
-- The kind of invariant that makes relational non-negotiable:
BEGIN;
UPDATE accounts SET balance = balance - 500 WHERE id = 1
  AND balance >= 500;             -- constraint enforced under the same lock
UPDATE accounts SET balance = balance + 500 WHERE id = 2;
INSERT INTO ledger(debit_acct, credit_acct, amount) VALUES (1, 2, 500);
COMMIT;  -- all three or none, with FK from ledger to accounts
```

### Q5. When is MongoDB the *right* choice — the honest positive case?

**Answer:**

MongoDB earns its place when the domain is genuinely **aggregate-oriented**: the unit you read and write is a self-contained document, and you rarely need to recombine pieces of different documents in one operation.

Strong fits:

- **Product catalogs / CMS.** A "product" has wildly heterogeneous attributes per category (a laptop has CPU/RAM; a shirt has size/fabric). One document per product, read whole, rendered whole. Attribute-per-column relational modeling of this (EAV) is famously miserable.
- **User profiles / preference blobs.** Read together, written together, shape evolves per feature team.
- **Event/activity documents** where each record is independent and queried by a few indexed fields.
- **Dev velocity with Node/TS teams** — the document maps to the application object; Mongoose/driver idioms are muscle memory for MERN teams. Team-skill fit is a legitimate input (Q1), and for a MERN shop it genuinely lowers delivery risk.
- **Horizontal scale with a good shard key.** If you truly outgrow one node, Mongo's sharding is mature — *provided* the shard key matches the dominant access pattern (e.g., `tenant_id` for a multi-tenant app) and is chosen up front; resharding is possible since 5.0 but expensive.

Discipline that makes it work: schema validation (`$jsonSchema` validators), an explicit `schemaVersion` field on documents with lazy migration on read, and a rule that cross-document invariants get a design review.

Also criticize the *right* things: the old "MongoDB loses data" attacks are stale. Since 5.0, `w: majority` is the default write concern; journaling is on; multi-document transactions have existed since 4.0 (4.2 across shards). Modern criticism is about *modeling fit and query capability*, not durability.

```javascript
// mongosh — the good case: aggregate-shaped, read/written as a unit
db.products.insertOne({
  _id: "sku-88231",
  schemaVersion: 3,
  title: "Trail Runner 5",
  category: "footwear",
  attrs: { sizeRange: [7, 13], drop_mm: 6, waterproof: true },  // shape varies by category
  variants: [
    { sku: "sku-88231-9", size: 9, stock: 41, priceCents: 12900 },
    { sku: "sku-88231-10", size: 10, stock: 12, priceCents: 12900 }
  ]
})
db.products.createIndex({ category: 1, "attrs.waterproof": 1 })
```

### Q6. When is MongoDB a mistake, and what are the tell-tale smells in an existing system?

**Answer:**

MongoDB is a mistake when the domain is **relational and you're paying the join tax in application code**. The failure mode is choosing it "because MEAN/MERN stack tutorial" and then discovering the domain is orders↔customers↔products↔invoices — many-to-many, cross-entity invariants, reporting.

Tell-tale smells during an FDE assessment of a customer's Mongo deployment:

- **`$lookup` everywhere.** Aggregation pipelines with 3+ `$lookup` stages recreating joins, unindexable in combination, each one a nested loop. If the "document database" spends its life joining, the model is wrong.
- **Multi-document transactions as the norm, not the exception.** Mongo transactions exist but carry real costs (latency, retry logic, restrictions); when every write path opens one across collections, you've bolted ACID onto a store designed around single-document atomicity.
- **Fan-out updates.** Denormalized copies (e.g., `customerName` embedded in every order) with background jobs sweeping collections to fix drift after a rename.
- **The analytics ETL nobody asked for.** A nightly job dumping Mongo into Postgres/BigQuery "so finance can query it" — the SQL surface requirement from checklist item 11 asserting itself late and expensively.
- **Unbounded arrays.** Documents that grow forever (comments embedded in a post, events embedded in a device doc) hitting the 16 MB limit and causing massive rewrites on update.
- **Shard key regret.** Sharded on `_id` (ObjectId → monotonic → hot shard) or on a field no query filters by, so every query is scatter-gather.

What the smell looks like in code — a "document database" doing relational work:

```javascript
// mongosh — the anti-pattern: a report that is screaming for SQL
db.orders.aggregate([
  { $match: { status: "pending_approval" } },
  { $lookup: { from: "users",    localField: "approverId", foreignField: "_id", as: "approver" } },
  { $lookup: { from: "budgets",  localField: "budgetId",   foreignField: "_id", as: "budget" } },
  { $lookup: { from: "vendors",  localField: "vendorId",   foreignField: "_id", as: "vendor" } },
  { $unwind: "$budget" },
  { $addFields: { remaining: { $subtract: ["$budget.limitCents", "$budget.spentCents"] } } },
  { $match: { $expr: { $lte: ["$totalCents", "$remaining"] } } },   // unindexable
  { $sort: { createdAt: -1 } }
])
// In Postgres: three indexed joins and a WHERE clause, planned and statistics-driven.
```

**Production war story:** A Series-A B2B startup (procurement SaaS) built on the MEAN tutorial stack. Domain: purchase orders, approvals, budgets, vendors — textbook relational. Eighteen months in, their core "orders pending my approval with budget remaining" screen was a 7-stage aggregation with four `$lookup`s, p95 of 4.2 s, and every schema tweak broke a pipeline stage. Their fix attempt — denormalizing budget totals into each order — created drift bugs that finance caught in month-end close (order totals disagreed with budget ledger by ~$40k). They eventually ran an eight-week expand-contract migration to Postgres (details in Q19-style pattern, Section 7); the same screen became a 3-join query at 40 ms, and month-end reconciliation became a `GROUP BY`. The lesson the FDE draws: the database wasn't broken — the *fit* was, and the earliest smell (`$lookup` count climbing PR after PR) was visible a year before the pain peaked.

**Interview trap:** Bashing MongoDB with 2011-era arguments (unacknowledged writes, "loses data"). Interviewers at senior level check whether your criticisms are current. Concede durability is fixed (majority write concern default, journaled, replica-set elections are solid), then land the real critique: modeling fit, join capability, transaction ergonomics, and the ad-hoc analytics gap.

### Q7. Where do key-value stores fit — Redis, and DynamoDB used as pure KV?

**Answer:**

KV is the family for **identity-keyed lookups with no query surface**: you always know the exact key, you never ask "which keys match X".

Canonical fits:

- **Sessions** — `session:{id}` → blob, TTL-expired. (Redis; covered in the Redis deep-dive doc — this lesson won't re-teach it.)
- **Feature flags / config** — tiny, hot, read-mostly; Redis hash or Dynamo item, cached in-process with short TTL.
- **Rate limiting** — atomic counters with expiry (`INCR` + `EXPIRE`, or a token bucket in a Lua script).
- **Caching** query results / rendered fragments in front of the system of record.
- **DynamoDB as durable KV** — when you want KV semantics but *durable, replicated, serverless*: user preference blobs, idempotency keys for payment APIs, device shadow state. The conditional-write idempotency primitive is worth knowing cold:

```json
// DynamoDB PutItem — exactly-once payment intent registration
{
  "TableName": "idempotency",
  "Item": {
    "pk": { "S": "IDEMP#pay_req_7f3a91" },
    "status": { "S": "in_progress" },
    "expiresAt": { "N": "1751630000" }
  },
  "ConditionExpression": "attribute_not_exists(pk)"
}
// First caller wins; the retry gets ConditionalCheckFailedException and
// reads the stored result instead of double-charging. TTL attribute cleans up.
```

The dividing line between Redis and Dynamo-as-KV: Redis is memory-speed, rich data structures, and (typically) cache semantics — you can tolerate loss or you configure persistence deliberately. Dynamo is disk-durable, scales to any size, single-digit-ms, pay-per-request — the right KV when the data is the system of record. Many stacks correctly run both: Dynamo for durable KV, Redis in front for microsecond reads and data-structure operations (sorted sets, pub/sub).

The KV family's defining constraint: **no ad-hoc queries**. The moment someone asks "list all sessions for tenant X" you either designed the key/index for it up front or you're doing a full scan.

### Q8. When is wide-column (Cassandra/ScyllaDB) justified, and what is the ops tax?

**Answer:**

Wide-column stores earn their place under a narrow, specific conjunction: **write-heavy, time-ordered or partition-keyed data, at genuine scale (100k+ writes/sec sustained, multi-TB), often with multi-region active-active as a hard requirement**. The LSM-tree storage engine makes writes append-only and cheap; the partition-key model makes reads within a partition fast; leaderless replication gives per-query tunable consistency and no regional primary.

Legitimate fits: telemetry/event ingestion at massive scale, messaging inbox fan-out (the classic Discord/Instagram-scale use case), IoT at millions of devices, any workload where you'd otherwise shard Postgres into dozens of nodes.

The model constraint mirrors Dynamo's: **you design tables per query**. No joins, no ad-hoc queries, limited secondary indexes (and the ones that exist are footguns at scale). A new access pattern means a new table and a backfill:

```sql
-- CQL: the table IS the query. Partition = device, rows clustered newest-first.
CREATE TABLE readings_by_device (
  device_id uuid,
  ts        timestamp,
  temp_c    double,
  PRIMARY KEY ((device_id), ts)
) WITH CLUSTERING ORDER BY (ts DESC);

-- Answers exactly one question cheaply:
SELECT * FROM readings_by_device WHERE device_id = ? LIMIT 100;

-- "Readings by region per hour"? That's a NEW table (readings_by_region_hour)
-- written to at ingest time — there is no JOIN or GROUP BY escape hatch.
```

The ops tax, itemized — this is what interviewers want you to know concretely:

- **Compaction management.** LSM trees defer work to compaction; mis-tuned compaction strategies (STCS vs LCS vs TWCS) cause disk-space blowups or read amplification. Someone must understand this.
- **Repairs.** Anti-entropy repair must run regularly or deleted data resurrects (tombstones + `gc_grace_seconds`). Missed repairs cause the infamous zombie-data incidents.
- **Tombstones.** Delete-heavy or TTL-heavy workloads accumulate tombstones that slow reads catastrophically until compaction clears them.
- **JVM tuning** (Cassandra) — GC pauses vs. Scylla's C++ shard-per-core model, which trades that for its own operational newness.
- **Capacity is cluster-shaped.** Scaling means streaming rebalances, not a slider.

Rule of judgment: below ~50k sustained writes/sec, partitioned Postgres (or Timescale) almost always wins on total cost. Managed options (Astra, Keyspaces, Scylla Cloud) reduce — not eliminate — the modeling constraints.

**Production war story (premature Cassandra):** A logistics startup, ~200 QPS total, adopted a 6-node Cassandra ring for "shipment event tracking" because the architect had used it at a previous employer with 1000x the traffic. Two years of consequences: a three-person platform team spent an estimated 30% of one engineer permanently on repairs, compaction tuning, and version upgrades; a missed `gc_grace_seconds` window resurrected deleted shipment events, which surfaced to customers as duplicate delivery notifications; and product asked for "search events by customer email," which the partition model couldn't answer, spawning a shadow Elasticsearch cluster (now two exotic stores). The eventual fix was embarrassing in its simplicity: one Postgres instance with a partitioned `shipment_events` table, `(shipment_id, ts)` B-tree, BRIN on `ts` — it ran at 3% CPU. The FDE lesson: they paid two years of Cassandra's ops tax to store data a laptop could have handled; scale requirements must be *evidence-based* (Q2), and "the architect used it at BigCo" is the most common way this failure enters a company.

### Q9. When do you recommend a graph database, and what's the one-hop trap?

**Answer:**

Graph databases (Neo4j, Neptune, Memgraph) win when the query is a **variable-depth or multi-hop traversal** where relational JOINs degenerate: each hop in SQL is a self-join, and a 4-hop query over a large edge table becomes a combinatorial explosion the planner handles poorly, while a native graph store walks adjacency in roughly O(edges touched).

Real fits:

- **Fraud rings:** "accounts sharing a device, card, or address with a flagged account, within 3–4 hops" — the canonical win; relational versions of this query are unwritable and unrunnable.
- **Recommendations via graph structure:** "users who bought what my friends' friends bought."
- **Dependency/impact analysis:** "everything downstream of this microservice/permission/part," where depth is unbounded (recursive).
- **Knowledge graphs** feeding LLM systems (increasingly FDE-relevant).

The **one-hop trap**: most systems that "have a graph" only ever ask one-hop questions — "who are this user's friends?", "what products are in this order?" Those are *just JOINs*: a `friendships(user_id, friend_id)` table with two indexes answers them in milliseconds. Even fixed two-hop (friend-of-friend) is a double self-join Postgres handles fine at moderate scale, and `WITH RECURSIVE` covers modest variable-depth needs. Adopting Neo4j because the domain diagram has arrows in it means paying for a new query language (Cypher/Gremlin), a new operational animal, and a consistency seam — for queries SQL already answered.

```sql
-- One-hop and two-hop "graph" queries are just SQL:
SELECT f.friend_id FROM friendships f WHERE f.user_id = 42;           -- 1 hop

SELECT DISTINCT f2.friend_id                                          -- friend-of-friend
FROM friendships f1 JOIN friendships f2 ON f2.user_id = f1.friend_id
WHERE f1.user_id = 42 AND f2.friend_id <> 42;
```

Decision heuristic: count the hops in the *hardest real query*. 1–2 fixed hops → relational. Unbounded depth, or 3+ hops over tens of millions of edges with latency requirements → graph store earns its rent.

**Interview trap:** "Our data is highly connected, so we need a graph database." All relational data is connected — that's the R. The question is whether the *queries* are traversal-shaped. Interviewers plant this to see if you distinguish data shape from query shape.

### Q10. pgvector vs a dedicated vector database — how do you call it for a RAG customer?

**Answer:**

The pgvector-first argument, which is the correct default in 2026 for most FDE engagements:

- **Below ~10–50M vectors**, pgvector with an HNSW index delivers recall and latency (single-digit to low-tens of ms) indistinguishable from dedicated stores for typical RAG traffic, on hardware the customer already runs.
- **Filtered search is where Postgres shines:** RAG queries are almost never pure ANN — they're "nearest neighbors *where* tenant_id = X and doc_type = 'policy' and updated_at > …". In Postgres that's one planner combining B-tree predicates with the HNSW scan (and iterative scans handle the over-filtering problem); in a dedicated store, metadata filtering is a bolted-on feature with its own semantics and limits.
- **One store = no sync pipeline.** Embeddings live in the same row/transaction as the source text: update the document and its embedding atomically, delete a tenant with one `DELETE` (GDPR), backup once. A separate vector DB reintroduces the polyglot seams of Section 3 — drift between the document store and the index is *the* classic RAG production bug (stale chunks answering from deleted docs).

```sql
CREATE EXTENSION vector;
CREATE TABLE chunks (
  id bigserial PRIMARY KEY,
  tenant_id int NOT NULL,
  doc_id bigint NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  body text NOT NULL,
  embedding vector(1536) NOT NULL
);
CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON chunks (tenant_id, doc_id);

SELECT id, body, embedding <=> $1 AS dist     -- $1 = query embedding
FROM chunks
WHERE tenant_id = 7
ORDER BY embedding <=> $1
LIMIT 8;
```

When a dedicated store (Pinecone, Qdrant, Weaviate, Milvus, or Turbopuffer-style object-storage-backed) is justified: **hundreds of millions to billions of vectors** (index no longer fits sanely in Postgres memory/maintenance budget), **vector search QPS high enough to starve the OLTP workload** on shared hardware, need for **specialized quantization/tiering** to control memory cost at that scale, or a serverless-first stack with no Postgres to piggyback on. Also honest cons of pgvector: HNSW index builds on large tables are slow and memory-hungry, and vacuum/index-rebuild operations need planning.

FDE framing to the customer: "Your 2M-document RAG corpus is maybe 6M chunks — pgvector territory by an order of magnitude. Start there; the migration to a dedicated store later is mechanical (re-embed or bulk export), whereas starting with two databases costs you sync complexity on day one."

### Q11. Why do time-series workloads break vanilla B-trees, and when do you reach for Timescale vs InfluxDB vs ClickHouse?

**Answer:**

Why vanilla Postgres/MySQL struggle at serious time-series scale:

- **B-tree write amplification:** high-rate inserts of `(series, timestamp, value)` keep splitting index pages; once indexes exceed RAM, every insert becomes random I/O. LSM/columnar engines turn this into sequential appends.
- **Retention is DELETE-shaped:** dropping "everything older than 90 days" via `DELETE` bloats tables and drowns vacuum. Time-partitioned engines make it `DROP PARTITION`/chunk — a metadata operation.
- **Rollup queries scan rows:** "avg CPU per host per 5min over 30 days" reads billions of narrow rows; columnar layouts read only the needed columns with vectorized aggregation and 10–20x compression.

The trio, and how an FDE picks:

| Store | Model | Sweet spot | Watch out |
|---|---|---|---|
| **TimescaleDB** | Postgres extension: hypertables (auto time-partitioned chunks), columnar compression, continuous aggregates, retention policies | Team already on Postgres; metrics/IoT mixed with relational metadata; full SQL + joins to business tables | It's still one Postgres node's write ceiling (high, with batching, but not Cassandra-class); licensing tiers |
| **InfluxDB** | Purpose-built TSDB, tag/field model | Ops metrics with Telegraf-style pipelines, teams wanting turnkey TSDB | Ecosystem churn (Flux deprecated, v3 rewrite); high tag cardinality blowups |
| **ClickHouse** | Columnar OLAP (MergeTree) | Analytics over events at huge scale: billions of rows, sub-second aggregations, wide events not just metrics | Not for point updates/deletes or OLTP; eventual merges; joins are workable but not its native gait |

Default recommendation shape: **Timescale for the Postgres-centric customer with metrics/IoT up to a few hundred thousand rows/sec (batched)**; **ClickHouse when the workload is really event analytics** (product analytics, logs, observability at scale) and consumers want blazing aggregations; InfluxDB mainly when the customer is already invested in its ecosystem.

```sql
-- Timescale: the three features that solve the three B-tree problems
SELECT create_hypertable('readings', by_range('ts'));
SELECT add_retention_policy('readings', INTERVAL '90 days');   -- drop chunks, not DELETE
CREATE MATERIALIZED VIEW readings_5m WITH (timescaledb.continuous) AS
SELECT device_id, time_bucket('5 minutes', ts) AS bucket,
       avg(temp_c) AS avg_temp, max(temp_c) AS max_temp
FROM readings GROUP BY device_id, bucket;                       -- pre-aggregated rollups
```

### Q12. Map these customer scenarios to a recommended stack.

**Answer:**

This table is the interview-ready artifact — each row is a defensible one-liner, and "runner-up" shows you considered alternatives:

| Scenario | Recommendation | Why | Runner-up |
|---|---|---|---|
| Multi-tenant B2B SaaS (CRM-ish, unknown future features) | Postgres (RDS/Aurora), `tenant_id` + RLS, JSONB for custom fields | Unknown access patterns + ad-hoc reporting + relational domain = boring default at its strongest | MySQL/Vitess if team heritage; Citus if tenant count → thousands of GB |
| IoT fleet, 50k devices @ 1 Hz (50k rows/sec) | TimescaleDB (batched ingest) + Postgres for device registry | Time-partitioned chunks, compression, retention policies; registry joins in same DB | ClickHouse if analytics-dominated; Cassandra only if fleet → millions |
| Social graph, friend-of-friend + suggestions, 50M users | Postgres edges table first; Neo4j/Neptune when queries go 3+ hops variable-depth | FoF is a self-join; graph DB earns rent only at traversal depth | Neptune (AWS-native ops) |
| E-commerce: catalog + orders | Postgres for orders/inventory/payments (non-negotiable ACID); catalog either JSONB or Mongo | Money = relational; catalog is aggregate-shaped — JSONB keeps it one store | Mongo catalog if catalog team is large and independent |
| Chat app (messages, channels, presence) | Postgres partitioned by time until proven otherwise; Cassandra/Scylla at Discord-scale inbox fan-out; Redis for presence | Messages are append-heavy time-ordered — wide-column *eventually*, but the threshold is high | DynamoDB (channel PK, ts SK) — serverless-friendly |
| Immutable audit log, 7-year retention, occasional investigation queries | Postgres partitioned + `pg_partman`, old partitions to S3/Parquet (queried by Athena) | Cheap, compliant, DROP-partition retention; investigations are ad-hoc → SQL | ClickHouse if log volume is huge and queried often |
| RAG chatbot over 2M docs | Postgres + pgvector (HNSW), same DB as doc metadata | ~6–10M chunks is well inside pgvector territory; filters + atomic delete + one backup story | Qdrant/Pinecone if vectors → 100M+ or QPS starves OLTP |
| Real-time leaderboard, 5M players | Redis sorted sets (`ZADD`/`ZRANK`), Postgres as durable source | O(log n) rank ops in memory is exactly the sorted-set primitive (see Redis deep-dive) | DynamoDB + GSI on score (durable, slower to rank precisely) |
| Payments/ledger service | Postgres, serializable isolation, double-entry schema | Correctness > everything; this is the "non-negotiable" case of Q4 | CockroachDB/Spanner if multi-region writes with SQL required |
| Feature flags + rate limits across 40 microservices | Redis (flags cached in-process, counters in Redis); Dynamo if durability of flags matters | Identity-keyed KV, TTLs, atomic counters — KV family textbook | Dynamo + DAX |

**Interview trap:** Recommending a different database for every row without noticing that **seven of ten rows are Postgres-first**. The senior signal is the *distribution* of your answers: boring default dominating, exotic stores appearing only where a specific measured pressure justifies them. Interviewers notice candidates whose scenario answers imply running six databases for one product.

---

## Section 3 — Polyglot Persistence: The Real Costs

### Q13. The customer's architecture diagram has five databases. What do you tell them?

**Answer:**

Polyglot persistence is legitimate — *when each store is load-bearing*. The costs teams systematically underestimate:

- **Ops burden multiplies, not adds.** Each store brings its own backup/restore procedure, upgrade cadence, security patching, monitoring dashboards, failover drill, and 3 a.m. failure modes. Five stores ≈ five specialist skill sets across an on-call rotation that might be four people.
- **Consistency seams.** There are **no cross-database transactions.** Any invariant spanning two stores (Postgres order + Redis inventory count + Elasticsearch listing) can only be maintained by patterns with their own machinery: **transactional outbox** (write intent to an outbox table in the same local transaction, relay publishes it), **CDC** (Debezium tailing the WAL into Kafka), or **sagas** (choreographed steps with compensations). Each of these is real engineering: relays, retries, idempotent consumers, dead-letter handling.

```sql
-- Transactional outbox: the minimum machinery for a consistency seam.
BEGIN;
INSERT INTO orders (id, customer_id, total_cents) VALUES ($1, $2, $3);
INSERT INTO outbox (aggregate_id, topic, payload)         -- same transaction,
VALUES ($1, 'order.created', $4::jsonb);                  -- same commit or neither
COMMIT;
-- A relay process (or Debezium on the outbox table) publishes rows to the queue,
-- marks them sent, and the search-index/cache consumers apply them idempotently.
-- Every polyglot seam in the architecture needs one of these. Count the seams.
```
- **Sync drift.** Duplicated data (search index, cache, denormalized read models) *will* drift — deploy bugs, dropped events, backfill gaps. Mature polyglot shops run reconciliation jobs that diff stores and alert; if the customer has duplication without reconciliation, drift is happening silently right now.
- **Backup/DR combinatorics.** Point-in-time recovery of *one* store is a solved problem; restoring five stores to a *mutually consistent* moment is essentially impossible — post-disaster, the seams show up as orphaned references and phantom cache entries. DR runbooks must handle per-store restore + reconciliation.
- **Cognitive load and hiring.** Every new engineer must learn N query languages, N modeling idioms, N sets of gotchas. Debugging a user-facing bug means tracing a fact through three representations.

The rule of thumb an FDE gives: **every additional datastore must pay rent** — a named, measured workload the incumbent store demonstrably cannot serve (with numbers, per Q2), reviewed annually. The healthy shape for most products: **Postgres (system of record) + Redis (cache/ephemeral) + object storage**, adding a third query store only under evidence. And exploit consolidation features before adding stores:

| Before adding… | First exhaust in Postgres… | Add the dedicated store when… |
|---|---|---|
| MongoDB | JSONB + GIN, `jsonb_path_query` | Aggregate model fits AND doc-team velocity measurably beats JSONB ergonomics |
| Elasticsearch | `tsvector` full-text, `pg_trgm` fuzzy | Relevance tuning, faceting, or index size outgrows FTS |
| Pinecone/Qdrant | pgvector + HNSW | Vectors approach 100M+ or ANN QPS starves OLTP (Q10) |
| InfluxDB/dedicated TSDB | Partitioned tables, BRIN, Timescale extension | Ingest outruns a tuned single writer even with batching |
| Kafka (as a database) | `LISTEN/NOTIFY`, Redis Streams, outbox table | True multi-consumer replayable log semantics needed at volume |
| Neo4j | Recursive CTEs, edge table + indexes | Variable-depth traversals dominate and CTEs measurably fail (Q9) |

The audit an FDE runs on an existing polyglot estate: for each store, name its rent (the workload + the number proving the incumbent couldn't serve it). Stores with no answer are consolidation candidates — most estates have at least one paying no rent.

**Interview trap:** "Right tool for the job" as a thought-terminating cliché. The senior counter: the job description must include *operating* the tool for five years, keeping it consistent with its neighbors, and restoring it at 3 a.m. — the "right tool" evaluated only on query fit is frequently the wrong tool evaluated on total ownership.

---

## Section 4 — DynamoDB Single-Table vs Postgres JSONB

### Q14. What is DynamoDB single-table design, actually? Show the item shapes.

**Answer:**

Single-table design stores **all entity types in one table**, overloading the partition key (PK) and sort key (SK) so that every access pattern is answered by a single `Query` against the table or a GSI. Entities that are read together are stored *adjacent* (same PK, different SKs) — an **item collection** — so "get org and its users and its subscriptions" is one request, no joins.

Item shapes for a SaaS app (orgs, users, subscriptions, invoices):

```json
[
  { "PK": "ORG#acme",  "SK": "META",
    "type": "Org", "name": "Acme Inc", "plan": "enterprise",
    "GSI1PK": "PLAN#enterprise", "GSI1SK": "ORG#acme" },

  { "PK": "ORG#acme",  "SK": "USER#u_19",
    "type": "User", "email": "kara@acme.com", "role": "admin",
    "GSI1PK": "USER#u_19", "GSI1SK": "ORG#acme" },

  { "PK": "ORG#acme",  "SK": "SUB#2026",
    "type": "Subscription", "status": "active", "seats": 250 },

  { "PK": "ORG#acme",  "SK": "INV#2026-06-30#inv_0042",
    "type": "Invoice", "amountCents": 1250000, "status": "paid",
    "GSI1PK": "INVSTATUS#unpaid", "GSI1SK": "2026-06-30" }
]
```

How the overloading answers access patterns:

| Access pattern | Operation |
|---|---|
| Get org + users + subs + recent invoices | `Query PK = ORG#acme` (one item collection, one RTT) |
| Get org's invoices for June | `Query PK = ORG#acme AND SK BETWEEN INV#2026-06-01 AND INV#2026-06-31~` |
| Which org does user u_19 belong to? | `Query GSI1: GSI1PK = USER#u_19` (inverted index) |
| All orgs on enterprise plan | `Query GSI1: GSI1PK = PLAN#enterprise` |
| All unpaid invoices, oldest first | `Query GSI1: GSI1PK = INVSTATUS#unpaid` |

Note what happened: **relationships became key prefixes, and every query is a design-time decision**. The generic `GSI1PK/GSI1SK` attributes are deliberately meaningless names because they're overloaded across entity types (GSIs cost per-table; you overload a few rather than create many).

What it buys: **predictable single-digit-ms at any scale** (a query touching one item collection performs identically at 1 GB and 10 TB), no connection pools, no vacuum, no failover to manage, serverless pay-per-request pricing, `TransactWriteItems` for limited multi-item atomicity (up to 100 items), streams for CDC.

What it costs: **access patterns frozen at design time** — a new question ("invoices by amount range across orgs") that no key or GSI anticipated requires a new GSI (backfilled, eventually) or an offline scan/export; **no ad-hoc queries** — analytics requires exporting to S3/Athena or streaming to a warehouse; **a genuine learning curve** — the design method (enumerate access patterns → design keys backwards from them) inverts everything a MERN/SQL developer knows; **hard migrations** — reshaping keys means rewriting every item; **hot partition risk** — a celebrity PK throttles even in on-demand mode (per-partition throughput caps).

### Q15. When do you pick DynamoDB single-table vs Postgres (with JSONB) — the actual decision?

**Answer:**

First, the pragmatic middle that wins most engagements — the **Postgres JSONB hybrid**: relational core for entities and relationships (FKs, transactions, ad-hoc SQL), JSONB columns for the genuinely flexible parts (per-tenant custom fields, integration payloads, settings), GIN-indexed for containment queries.

```sql
CREATE TABLE tickets (
  id bigserial PRIMARY KEY,
  tenant_id int NOT NULL REFERENCES tenants(id),
  status text NOT NULL CHECK (status IN ('open','pending','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  custom jsonb NOT NULL DEFAULT '{}'         -- per-tenant custom fields live here
);
CREATE INDEX ON tickets (tenant_id, status, created_at DESC);   -- relational core: B-tree
CREATE INDEX ON tickets USING gin (custom jsonb_path_ops);       -- flexible part: GIN

-- Ad-hoc query mixing both worlds — impossible in Dynamo without a new GSI:
SELECT id, custom->>'severity' AS severity
FROM tickets
WHERE tenant_id = 7 AND status = 'open'
  AND custom @> '{"region": "EMEA", "sla_breach": true}';
```

JSONB discipline: keep *queried/relational* fields as real columns (typed, constrained, statistically visible to the planner); JSONB is for attributes, not for smuggling your schema out of the type system. Know its limits: no statistics on inner keys (planner misestimates), whole-value rewrite on update (fat JSONB + hot updates = bloat).

The decision table:

| Signal | → DynamoDB single-table | → Postgres (+JSONB) |
|---|---|---|
| Access patterns | Known, enumerated, stable (mature product, well-understood domain) | Evolving product, pivots likely, "we'll know when we see it" |
| Scale | Genuinely needs horizontal write scale or guaranteed p99 at any size | Fits a big box + replicas (i.e., almost everyone) |
| Ad-hoc queries / analytics | None on the hot path (export to Athena is acceptable) | Finance/support/data team queries the DB directly |
| Ops model | Serverless-first, zero-DBA, spiky traffic (scale-to-zero economics) | Team runs (or rents) Postgres comfortably |
| Transactions | Item-collection-local, limited (TransactWriteItems suffices) | Multi-entity invariants everywhere |
| Team | Has or will build Dynamo modeling expertise | MERN/SQL developers productive on day one |
| Reversibility | Accepted lock-in (keys are the schema; exit = full rewrite) | Easy exit; logical replication, standard SQL |

Honest summary an FDE gives a customer: Dynamo single-table is a *specialist tool that trades flexibility for guarantees* — spectacular for a payments-adjacent, serverless, known-pattern workload; corrosive for an exploratory product. Postgres JSONB is the 80% answer because most customers' real constraint is "we don't yet know what we'll need."

**Production war story (single-table frozen patterns):** A fintech customer built their merchant dashboard on a textbook single-table design — beautiful, five access patterns, all sub-10 ms at any load. Fourteen months later, product committed to a roadmap feature: "search transactions by *amount range and free-text memo* across all merchants" plus a finance requirement for cohort revenue analysis. Neither was expressible: amount wasn't in any key, memo isn't indexable in Dynamo at all, and cross-partition analytics meant scanning 4 TB. The remediation was a permanent second system — DynamoDB Streams → Kinesis Firehose → S3/Parquet → Athena for finance, plus an OpenSearch cluster for memo search — adding roughly $3.5k/month and two new ops surfaces to a stack chosen partly for being "zero-ops." Dynamo itself performed flawlessly the entire time; the *choice* failed, because "our access patterns are stable" was an assertion about the product roadmap that engineering had no authority to make. The FDE lesson: when a customer says access patterns are fixed, ask *whose* signature is on that.

---

## Section 5 — Cost: The Dimension Customers Feel Last and Hardest

### Q16. Managed vs self-hosted, and the pricing-model surprises of RDS/Aurora, Atlas, and DynamoDB.

**Answer:**

TCO framing first: **engineer time is the biggest line item.** A self-hosted Postgres on EC2 might "save" $800/month over RDS, but the delta buys automated backups/PITR, patching, failover, and — decisively — not consuming a fraction of a senior engineer whose loaded cost is $18–25k/month. Self-hosting is rational when you have dedicated DB expertise at scale (fleet of instances amortizing the skill), hard compliance/locality needs, or genuinely exotic tuning requirements. For a typical customer, managed is the default and the interview-safe position — argued via opportunity cost, not sticker price.

The pricing models and their signature surprises:

| Service | Model | The surprise that bites customers |
|---|---|---|
| **RDS Postgres** | Instance-hours + storage + IOPS (gp3/io2) | Multi-AZ doubles instance cost; storage autoscaling only grows; snapshot egress for cross-region DR |
| **Aurora** | Instance-hours + storage + **per-I/O charges** (classic config) | I/O-heavy workloads see the I/O line dwarf compute — the reason AWS shipped **I/O-Optimized** (~2023): higher instance price, zero I/O charges, wins when I/O >~25% of the bill. Pre/post comparison is a standard FDE cost review |
| **Aurora Serverless v2** | ACU-seconds | Doesn't scale to zero (v2 min ACU floor historically); idle dev environments quietly cost hundreds/month |
| **MongoDB Atlas** | Cluster tiers (M10→M20→M30…) | **Tier jumps are step functions**: outgrow M30 by 5% and the next tier is ~2x; plus per-GB data transfer, backup pricing, and per-query cost on Atlas Data Federation surprising teams doing analytics |
| **DynamoDB provisioned** | RCU/WCU per hour (+autoscaling) | Under-provisioning throttles; autoscaling reacts in minutes, not seconds — spiky traffic throttles before scaling catches up |
| **DynamoDB on-demand** | Per-request | ~5–7x provisioned's unit price at steady load; and **on-demand does not repeal per-partition limits** — a hot key still throttles regardless of billing mode. Steady workloads should be provisioned/reserved |
| **All of the above** | — | **Egress and cross-AZ**: cross-AZ traffic ($0.01/GB each direction) between app and DB replicas, NAT gateway processing, and cross-region replication quietly become top-five line items in chatty microservice architectures |

Cost-narrative example for a concrete workload — the one to deploy in interviews. Workload: multi-tenant SaaS, 500 sustained QPS (85% read), 400 GB data, steady diurnal curve:

| Option | Compute/requests | Storage & I/O | Hidden lines | Rough monthly | Growth shape |
|---|---|---|---|---|---|
| Aurora Postgres I/O-Optimized (`r6g.xlarge` writer + 1 reader) | ~$1.1k instances | ~$180 storage, I/O included | Cross-AZ app↔reader traffic, snapshots cross-region | ~$1.4–1.7k | Linear (resize instance, add readers) |
| MongoDB Atlas M50-class replica set | Tier-priced | Included per tier | Backup tier, data transfer, tier-jump step function | ~$2–2.5k | Step function (M50→M60 ≈ 2x) |
| DynamoDB provisioned, single-table | ~$450–700 RCU/WCU (reserved helps) | ~$100 storage | Athena/OpenSearch sidecars once analytics/search arrive; up-front modeling time | ~$600–900 (before sidecars) | Linear per request, cliff at hot keys |

- Verdict for this customer: **Aurora I/O-Optimized.** Dynamo's sticker win evaporates against the flexibility their roadmap needs (the sidecars would erase the gap within two quarters), and Atlas prices Mongo-modeling risk on top of a higher bill with step-function growth.
- Numbers are order-of-magnitude, region-dependent — in the interview, the *structure* of the comparison is the answer, and quoting them as "roughly, us-east-1, verify per engagement" is itself the senior move.
- The line that reframes the whole discussion for a customer: all three options differ by ~$1.5k/month — **less than 10% of one engineer**. If any option saves four engineer-hours a week, it wins regardless of the infrastructure delta.

**Interview trap:** Comparing databases on instance sticker price alone. The senior answer always includes: I/O and egress lines, the step-function vs linear scaling shape of each pricing model, the sidecar systems a limited store forces you to add later, and engineer time. A cheaper database that requires one extra engineer is the most expensive database.

---

## Section 6 — Migration War Stories and Execution Patterns

### Q17. Tell me about a Mongo→Postgres migration: decision, execution, numbers, lesson.

**Answer (war story, the pattern to internalize):**

**Production war story:** B2B invoicing platform, 600 GB in MongoDB, ~40M invoices across 9 collections, the Q6 smells at full intensity (nightly Mongo→warehouse ETL, `$lookup`-heavy dashboards at p95 3–8 s, month-end drift bugs). Decision memo: domain is relational, scale is small (peak 300 QPS — one Postgres box), team writes SQL anyway in the warehouse. Runner-up considered and rejected: "fix the Mongo schema" — rejected because the fix *was* normalization, i.e., building a relational model inside a document store.

Execution — **expand-contract with dual writes**, eight weeks:

1. **Weeks 1–2 (expand):** Design the Postgres schema; build an idempotent transformer (Mongo doc → rows) handling all historical `schemaVersion`s — this step surfaced 11 undocumented document shapes, which was half the project's real work.
2. **Weeks 3–4 (backfill + dual write):** App writes to Mongo (still source of truth) and to Postgres via the transformer; a backfill walks Mongo by `_id` ranges filling Postgres behind the dual-write watermark. Reconciliation job diffs row counts and checksums per collection nightly.
3. **Weeks 5–6 (shadow reads):** Read paths execute against both stores; responses compared, mismatches logged. Mismatch rate driven from 0.4% → 0 (all traced to transformer bugs and two genuine Mongo data-corruption finds).
4. **Week 7 (contract):** Reads cut over endpoint-by-endpoint behind flags; Mongo demoted to write-mirror only.
5. **Week 8:** Dual write off; Mongo snapshotted and retired 30 days later.

Numbers: dashboard p95 3.8 s → 45 ms; the nightly ETL deleted (warehouse now fed by Postgres logical replication); month-end close reconciliation from ~2 engineer-days to a SQL check. **Lesson:** the migration mechanics are routine; the *risk* concentrates in step 1 — a document store without enforced schema means the true schema is the union of every code version that ever wrote, and you don't know it until the transformer meets production data. Budget accordingly.

### Q18. And the reverse — when moving *to* DynamoDB was the right call?

**Answer (war story — successful Postgres→Dynamo):**

**Production war story:** Consumer loyalty platform: point-balance lookups and redemptions, 15k QPS peak (Black-Friday-style spikes to 60k), access patterns genuinely fixed for years (get balance by user, append transaction, list last 50 transactions by user, idempotent redemption). Postgres pain was real and measured: the spike events required pre-provisioning a 96-vCPU writer that sat 85% idle the rest of the year; connection storms from Lambda-based services needed PgBouncer babysitting; p99 during spikes hit 400 ms against a 50 ms SLO.

Decision: this is Dynamo's exact profile — KV-shaped, enumerated patterns, extreme spike ratio, serverless callers. Design: `PK=USER#id`, `SK=BAL` / `SK=TXN#<ts>#<id>`, idempotency via conditional writes; analytics via Streams → Firehose → S3 from day one (learning from the Section 4 story — the analytics sidecar was *planned*, not remedial).

Execution — **CDC-based, not dual-write**, because write paths were too numerous to instrument safely: Debezium on Postgres WAL → Kafka → transformer → Dynamo; backfill from a snapshot, CDC catching up the delta; shadow reads for three weeks; cutover per service. Twelve weeks end-to-end, zero downtime.

Numbers: p99 during the next peak event 380 ms → 9 ms; database cost for spike months down ~70% (on-demand absorbing the spike, provisioned+autoscaling for steady state); the idle 96-vCPU box gone. One incident: a hot-partition throttle on a promotional "house account" all redemptions credited — fixed by sharding that one key (`PK=HOUSE#<n>`, n = random 0–9, scatter-gather on read). **Lesson:** Dynamo migrations succeed when the access-pattern audit is honest *and* the analytics escape hatch is built before cutover, not after the first "quick question" from finance.

### Q19. Compare the migration execution patterns — when do you use dual write vs CDC vs expand-contract?

**Answer:**

These compose (expand-contract is the macro shape; dual-write or CDC is the sync mechanism inside it), but the choice of sync mechanism is the real judgment call:

| Pattern | Mechanism | Use when | Failure modes to design for |
|---|---|---|---|
| **Dual write** | App writes both stores synchronously (or new-store write async via queue) | Few, well-known write paths; you control all writers; transformation needs app context | Partial failure between the two writes (no atomicity!) → needs reconciliation job; ordering skew; forgotten write path silently diverging |
| **CDC** | Tail the source's log (Debezium/WAL, Mongo change streams, Dynamo Streams) → pipeline → target | Many write paths / other teams' services write; zero-touch on app code; need replayability | Pipeline lag at cutover; schema evolution mid-migration; transformer idempotency (at-least-once delivery) |
| **Expand-contract** (parallel change) | Add new alongside old → backfill → shadow-read/verify → cut reads → cut writes → remove old | Always — it's the safe macro-structure for any stateful migration | Teams skipping the shadow-read phase to save time; "contract" never happening, leaving permanent dual systems |
| **Big-bang cutover** | Stop writes, copy, switch | Tiny datasets, tolerable downtime windows, internal tools | Everything; no rollback story once writes resume on the target |

Universal rules an FDE enforces: the old store remains source of truth until verification says otherwise; every step is reversible until the final contract; reconciliation is continuous (checksums/counts), not a one-time check; and cutover happens behind flags per-endpoint, never globally. The most common real-world failure isn't data loss — it's the **never-finished migration**: dual systems left running "temporarily" for years, which is polyglot persistence's costs (Section 3) with none of its benefits.

**Interview trap:** Presenting dual write as trivially safe. The two writes are not atomic — the app can crash between them, and one store can accept what the other rejects. Interviewers who've run migrations will push on exactly this; the answer is idempotent writes keyed for replay, an async second write via a durable queue where possible, and a reconciliation diff running from day one.

### Q20. Final synthesis: what makes a database choice "defensible" in front of a customer's staff engineers?

**Answer:**

A defensible choice has five properties, and this is the checklist to close an interview answer with:

1. **It's traceable to inputs, not preferences.** The decision memo cites the access-pattern list, the consistency requirements, the measured (not aspirational) scale numbers, the team's skills, and the ops budget — the Q1 funnel with the customer's actual answers filled in.
2. **The runner-ups are named and killed for specific reasons.** "We chose Postgres over Dynamo because your roadmap has unenumerable access patterns; over Mongo because your invariants span entities" beats any amount of advocacy for the winner. A choice with no considered alternatives is an opinion.
3. **It defaults boring and pays for exotic with evidence.** Postgres-until-proven-otherwise, each additional store paying named rent, exotic stores tied to a measured pressure (Q2's table) rather than a conference talk.
4. **It prices total ownership.** Ops burden, consistency seams, backup/DR, pricing-model cliffs, sidecar systems the store will force later, and engineer time — not sticker compute.
5. **It has an exit.** The memo says how you'd know the choice was wrong (leading indicators: `$lookup` density, GSI-request backlog, tier-jump frequency, repair toil) and which migration pattern (Section 6) gets you out. Reversibility is a feature you select for.

The meta-point for FDE interviews: customers don't hire an FDE to know more databases — they hire one to be *right about their situation* and to leave behind a decision the customer's own engineers can re-derive and defend after the FDE is gone.

---

*Previous: Lesson 6.5 | Module: Databases Deep Dive — capstone. Redis internals and patterns: see the dedicated Redis deep-dive in Devops/01-Redis-and-Queues.*
