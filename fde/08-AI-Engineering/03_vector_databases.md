# Vector Databases & ANN Search

> Module: AI Engineering | Level: Senior/Staff | FDE Interview Prep

Every RAG system, semantic search feature, and recommendation engine you deploy at a customer ultimately hinges on one operation: "given this query vector, find the k nearest stored vectors, fast." This file covers how that actually works under the hood (HNSW, IVF, PQ), when brute force is secretly the right answer, and how a Forward Deployed Engineer picks and operates a vector store inside a customer's environment. The FDE default answer — defensible in almost every interview and most real deployments — is: **pgvector in the Postgres the customer already runs, until proven otherwise.**

---

## 1. Fundamentals: Exact Search and Why ANN Exists

### Q1. Why do we need approximate nearest neighbor (ANN) search at all? Why not just compute exact kNN?

**Answer:**

Exact kNN is a linear scan: for a query vector `q` and N stored vectors of dimension `d`, you compute N distance calculations, each costing O(d) multiply-adds, then take the top-k. Total cost per query: **O(N · d)**.

Do the math before assuming that's slow:

```
Corpus:      1,000,000 vectors
Dimensions:  1,536 (OpenAI text-embedding-3-small)
Precision:   float32 (4 bytes)

Raw data:    1,000,000 × 1,536 × 4 B = 6,144,000,000 B ≈ 6.1 GB
FLOPs/query: 1,000,000 × 1,536 × 2  ≈ 3.1 GFLOPs (multiply + add)
```

A single modern CPU core with AVX-512 SIMD does tens of GFLOP/s on dot products; a brute-force scan over 1M × 1536-dim vectors completes in **tens of milliseconds on one core, a few ms parallelized**. At 100K vectors it's sub-millisecond territory. And it gives **100% recall, zero index build time, zero index maintenance, trivially correct filtering** (just skip non-matching rows).

ANN exists because the linear scan stops being fine somewhere between 1M and 10M vectors, or when you need thousands of QPS, or when the 6 GB has to live somewhere cheaper than RAM. ANN indexes trade recall (you get *most* of the true top-k, not all) for sub-linear query time — typically O(log N)-ish for graph methods.

**Interview trap:** "We have 50,000 document chunks, which vector database should we deploy?" The senior answer is: *none, yet*. 50K × 1536 × 4 B = 300 MB. A brute-force scan (or even pgvector with **no index at all** — a sequential scan on the `vector` column) returns exact results in single-digit milliseconds. Reaching for a dedicated vector DB at 50K vectors adds an entire distributed system to the customer's ops surface to solve a problem they don't have. Interviewers deliberately under-size the corpus to see if you reflexively reach for infrastructure.

---

### Q2. What are the actual trade-offs between exact and approximate search, and when is 100% recall non-negotiable?

**Answer:**

The trade is captured by the **recall@k vs QPS curve**. For a fixed index, turning the query-time knob (efSearch for HNSW, nprobe for IVF) moves you along a curve:

```
recall@10
 1.00 |                                    ● exact scan (low QPS, flat)
 0.99 |                          ●───●
 0.98 |                   ●────/
 0.95 |            ●────/           HNSW frontier
 0.90 |      ●───/
 0.80 | ●──/
      +---------------------------------------------→ QPS (log scale)
        10,000        1,000         100          10
```

ANN indexes typically hit 95–99% recall@10 at 10–100× the throughput of exact scan. The missing 1–5% are usually near-duplicates of returned results, so for RAG the downstream quality impact is often unmeasurable.

When approximate is **not** acceptable:

- **Legal/compliance discovery**: "find every document similar to this contract clause" — a missed hit is a liability, not a UX blemish.
- **Deduplication / entity resolution** where a miss creates a duplicate record.
- **Small corpora** (see Q1) — you'd be paying recall for speed you don't need.
- **Audit-facing systems** where you must state "we searched everything."

The senior pattern for large corpora that still need high precision is **tiered retrieval**: ANN produces 100–1,000 candidates cheaply, then an exact re-score (full-precision distance, cross-encoder, or business logic) reranks the candidates. You get ANN throughput with near-exact top-k quality, because ANN's recall@1000 is far higher than its recall@10.

---

### Q3. Walk me through the distance metrics. Does the choice matter?

**Answer:**

Three metrics dominate:

| Metric | Formula (conceptually) | pgvector operator | Notes |
|---|---|---|---|
| Euclidean (L2) | `‖a − b‖` | `<->` | Sensitive to vector magnitude |
| Cosine distance | `1 − (a·b)/(‖a‖‖b‖)` | `<=>` | Angle only; magnitude-invariant |
| Inner product | `−(a·b)` (negated for ordering) | `<#>` | Fastest; correct only for normalized or IP-trained embeddings |

Key facts a senior candidate should volunteer:

1. **For unit-normalized vectors, all three produce the same ranking.** `‖a−b‖² = 2 − 2(a·b)` when `‖a‖=‖b‖=1`, so L2 order = cosine order = inner-product order. Most modern embedding APIs (OpenAI, Cohere) return normalized vectors.
2. Therefore the practical rule: **normalize at ingest, use inner product** (cheapest — no square roots, no norm division), or just use cosine and stop thinking about it.
3. **The index and query must use the same metric.** In pgvector, an index built with `vector_cosine_ops` is only used when the query uses `<=>`. Building with one opclass and querying with another silently falls back to a sequential scan — correct results, mysterious latency.
4. Match the metric to the embedding model's training objective. Models trained with cosine similarity (nearly all sentence embedding models) should be searched with cosine/normalized-IP.

**Interview trap:** "Our pgvector queries got 50× slower after we switched to `<->`." The index was built with `vector_cosine_ops`; the planner can't use it for L2, so every query is a full-table scan. `EXPLAIN ANALYZE` shows `Seq Scan` instead of `Index Scan using ... hnsw`. Always verify the opclass/operator pairing with EXPLAIN.

---

## 2. HNSW: The Workhorse Index

### Q4. Explain how HNSW works, properly — not just "it's a graph."

**Answer:**

HNSW (Hierarchical Navigable Small World) is best understood as **a skip list generalized to proximity graphs**.

A skip list gives O(log N) search over a sorted list by maintaining sparse upper levels for long hops and the full list at the bottom for precision. HNSW does the same for nearest-neighbor search: each layer is a proximity graph (nodes connected to their near neighbors), upper layers contain exponentially fewer nodes (long-range hops across the space), and layer 0 contains **every** vector (fine-grained precision).

```
Layer 2 (sparse — long hops)        A ─────────────────── K
                                     \
                                      \  (descend at local minimum)
Layer 1 (medium)                A ──── D ───── H ───── K
                                       |        \
                                       |         \ (descend)
Layer 0 (all nodes — dense)  A─B─C─D─E─F─G─H─I─J─K─L─M
                                        ▲
                              greedy walk converges here,
                              then efSearch-wide beam search
                              explores the local neighborhood
```

**Search algorithm:**
1. Start at the entry point on the top layer.
2. Greedy walk: repeatedly move to the neighbor closest to the query; stop when no neighbor improves.
3. Drop down one layer using that node as the new start; repeat.
4. On layer 0, expand from greedy (beam width 1) to a best-first search with a candidate beam of size **efSearch**, maintaining the k best results found.

**Insert algorithm (sketch):**
1. Draw the new node's max layer `ℓ` from an exponential distribution (`floor(−ln(uniform()) · mL)`) — this is what makes upper layers sparse, exactly like coin-flips in a skip list.
2. Search from the top down to layer `ℓ+1` greedily (as in query).
3. On each layer from `ℓ` down to 0: run a beam search with width **efConstruction** to find candidate neighbors, select the best **M** of them (using a heuristic that prefers spread-out neighbors over a tight clump), and create bidirectional edges. If a neighbor now exceeds its edge budget (`M`, or `2·M` on layer 0), prune its worst edge.

**The three parameters:**

| Parameter | Role | Effect of raising it |
|---|---|---|
| `M` | Max edges per node per layer (layer 0 allows 2·M) | Better recall on hard/high-dim data; **memory and build time scale with M** |
| `efConstruction` | Beam width during insert | Higher-quality graph, better recall ceiling; slower builds. Build-time only |
| `efSearch` | Beam width during query | More recall, more latency. **The runtime knob** — tune per query class without rebuilding |

Typical numbers: `M=16, efConstruction=64–200` builds an index that reaches **~95–99% recall@10 at efSearch = 40–200**, with p99 query latencies in single-digit milliseconds for a few million vectors in RAM. efSearch must be ≥ k, and returns diminishing recall gains roughly logarithmically.

---

### Q5. Why is HNSW memory-hungry, and why are deletes hard?

**Answer:**

**Memory:** HNSW's whole performance story assumes random-access traversal — every hop in the greedy walk touches a "random" node. That means **both the full-precision vectors and the adjacency lists must be RAM-resident**; page faults to disk during traversal destroy latency (each query does hundreds of hops). Per-node cost:

```
Vector:        1,536 dims × 4 B                    = 6,144 B
Layer-0 edges: 2·M links × 4 B (M=16 → 32 links)   =   128 B
Upper layers:  ~1/e of nodes have layer ≥1, etc.   ≈    +10–40 B amortized
Engine/tuple overhead (pgvector item header, etc.) ≈    +50–150 B

1M vectors ≈ 6.1 GB vectors + ~0.5–1 GB graph/overhead ≈ 7 GB working set
```

The graph is a modest fraction of the total at 1536 dims — but note it **inverts at low dimensions**: with 128-dim vectors (512 B), the graph overhead is proportionally huge. And raising `M` from 16 to 64 quadruples the edge storage.

**Deletes:** HNSW's graph invariants (navigability, bounded degree) are built incrementally and are **not cheaply reversible**:

- Removing a node removes its edges, potentially disconnecting regions of the graph or breaking the "small world" property — searches then dead-end early and recall silently degrades.
- So every real implementation uses **tombstones**: the node is marked deleted, still traversed during search (it keeps the graph connected), just filtered from results. Deleted vectors keep consuming RAM and hops.
- Recovery requires **graph repair or rebuild**: pgvector reclaims tombstoned entries via `VACUUM` (which repairs neighbor lists — an expensive operation); many engines just periodically rebuild/compact segments.

**Production war story:** A customer ran a nightly re-embedding job that deleted and re-inserted all 2M chunks in pgvector (instead of updating in place). After three weeks, p99 latency had tripled and recall on their eval set dropped ~4 points. The HNSW index was ~60% tombstones: searches were wading through dead nodes, and autovacuum never got enough of a window to repair the graph. Fix: switch the pipeline to `UPDATE ... SET embedding = ...` where possible, schedule an explicit `VACUUM` after bulk churn, and `REINDEX CONCURRENTLY` monthly. Lesson: **high-churn workloads are HNSW's worst case — ask about update patterns before choosing the index.**

---

### Q6. When would you *not* use HNSW?

**Answer:**

HNSW is the default for good reasons (best recall/latency frontier, incremental inserts, no training step), but a senior engineer should know its losing scenarios:

1. **RAM-bound at scale.** 100M × 1536-dim float32 = 614 GB of vectors before graph overhead. If the budget doesn't allow a RAM-heavy cluster, you need PQ compression (Q9) or disk-based indexes (DiskANN-style, Q18).
2. **High churn / delete-heavy workloads** — tombstone decay, per Q5.
3. **Bulk-load-then-freeze workloads.** If you load 50M vectors once and never insert again, IVF-PQ builds faster, uses a fraction of the memory, and its recall gap can be closed with re-ranking.
4. **Very high write throughput.** Each HNSW insert is itself a graph search (efConstruction beam per layer) — expensive. IVF insert is one centroid assignment + list append.
5. **Tiny corpora** — no index at all (Q1).
6. **Streaming/serverless cost models** where you pay for provisioned RAM — the graph tax is real money.

**Interview trap:** "HNSW build is slow, so we set efConstruction=8 to speed up ingest." Build quality is baked in: a graph built with a tiny beam has poor navigability, and **no efSearch value at query time can fully recover the lost recall ceiling**. You've permanently capped recall to save one-time build cost. If build time hurts, parallelize the build (pgvector supports parallel HNSW builds via `max_parallel_maintenance_workers`) or build offline and attach.

---

## 3. IVF and Quantization

### Q7. Explain IVF. How does it compare to HNSW?

**Answer:**

IVF (Inverted File index) is clustering-based: run **k-means over a training sample** to produce `nlist` centroids, partition all vectors into cells by nearest centroid, and at query time compare the query only against the `nprobe` nearest cells' contents.

```
        nlist = 9 cells (Voronoi partition by k-means centroids ×)

   +---------+-----------+---------+
   |  ×      |     ×     |    ×    |     query q = ●
   |    . .  |  .    .   | .   .   |
   +---------+-----------+---------+     nprobe = 2:
   |  ×      |   ×       |    ×    |     scan cell A (q's cell)
   |   .  .  |  .A ●   ← | → B .   |     + cell B (next-nearest
   |     .   |    . .    |  . .    |       centroid), linear scan
   +---------+-----------+---------+       within those cells only
   |  ×      |     ×     |    ×    |
   |  . .    |    .      |  .  .   |     cost ≈ nlist centroid dists
   +---------+-----------+---------+          + (nprobe/nlist)·N dists
```

Vectors scanned ≈ `nprobe/nlist × N`. Rules of thumb: `nlist ≈ sqrt(N)` (pgvector docs suggest `rows/1000` up to 1M, then `sqrt(rows)`), `nprobe ≈ sqrt(nlist)` as a starting point, then tune on a recall eval.

The **edge problem**: a query near a cell boundary has true neighbors in adjacent cells; nprobe=1 misses them. That's why recall climbs with nprobe — and why IVF's recall/latency curve sits below HNSW's at equal latency.

**IVFFlat vs IVF-PQ:** IVFFlat stores full-precision vectors in each cell (exact distances within probed cells). IVF-PQ stores PQ codes (Q9) — far smaller, slightly lossier, usually paired with a re-rank step.

**The drift problem — the part most candidates miss:** IVF centroids are **trained once**, at index build, on the data present at that moment. If the data distribution shifts (new document domains, new embedding model version, seasonal content), new vectors crowd into a few cells, cells become unbalanced, and recall degrades *silently* — the index still returns results, just worse ones. **IVF indexes need periodic retraining (rebuild) on drifted data**, and the pgvector-specific gotcha: an IVFFlat index built on an empty or tiny table has garbage centroids — always build **after** loading data.

| Dimension | HNSW | IVFFlat |
|---|---|---|
| Build time | Slow (each insert = graph search) | Fast (k-means + assignment) |
| Memory | Vectors + graph, all RAM | Vectors + centroids (smaller) |
| Recall @ equal latency | Higher | Lower |
| Incremental inserts | Excellent, no training | OK, but drifts from trained centroids |
| Deletes | Painful (tombstones) | Easy (remove from list) |
| Needs training data first | No | **Yes** — build after load, rebuild on drift |
| Query-time knob | `efSearch` | `nprobe` |

---

### Q8. Your customer loaded 100K rows, built an IVFFlat index, then grew to 10M rows. Search quality is now bad. Why?

**Answer:**

Two compounding failures:

1. **Stale centroids (distribution drift).** The k-means partition reflects the 100K-row snapshot. The 9.9M rows inserted afterwards were assigned to those fixed centroids. If the new data covers new regions of embedding space, it piles unevenly into the nearest old cells — some cells hold millions of vectors (slow to probe), others are empty, and the "nearest cells" heuristic mispredicts where neighbors live. Recall drops.
2. **Wrong nlist for the new N.** nlist appropriate for 100K (≈100–300) is far too coarse for 10M (should be ≈3,000+). Each probe now scans ~10M/300 ≈ 33K vectors instead of ~3K — latency balloons too.

Fix: `REINDEX` (or drop/recreate with new `lists`) so k-means retrains on the current distribution and cell count matches current N. Operationally: **schedule IVF rebuilds as part of any bulk-ingest runbook**, and monitor recall against a golden query set, not just latency — drift degrades quality before it degrades speed. Or, if the workload is insert-heavy and continuous, this is precisely the argument to use HNSW instead, which has no training step to go stale.

---

### Q9. Explain Product Quantization with real numbers. When does it matter?

**Answer:**

PQ compresses vectors by splitting them into subvectors and replacing each subvector with the ID of its nearest centroid from a small per-subspace codebook.

**Setup:** split a `d`-dim vector into `m` subvectors of `d/m` dims each. For each subspace, run k-means with `k=256` centroids (a "codebook"). Encode each subvector as its nearest centroid's index — **1 byte** (256 fits in 8 bits).

**Worked math for 1536-dim OpenAI embeddings:**

```
Original:   1,536 dims × 4 B (float32)        = 6,144 B per vector
PQ, m=96:   96 subvectors of 16 dims each
            each encoded as 1 byte             =    96 B per vector
Compression:                                     64×

Codebooks (shared, one-time):
            96 subspaces × 256 centroids × 16 dims × 4 B ≈ 1.57 MB total

At 100M vectors:
            float32:  100M × 6,144 B ≈ 614 GB   (a RAM cluster)
            PQ m=96:  100M × 96 B    ≈   9.6 GB (one node, fits in RAM)
```

**Asymmetric Distance Computation (ADC)** — why PQ queries are fast: the query stays full-precision. Precompute, per subspace, the distance from the query's subvector to all 256 centroids: a `96 × 256` float table (~98 KB, one-time per query). Then the distance to any stored vector ≈ sum of **96 table lookups** — no floating-point vector math per candidate. Scanning millions of PQ codes becomes memory-bandwidth-bound table addition.

**The catch — recall loss and the refine step:** quantization error makes PQ distances approximate; recall@10 might drop from 98% to 80–90% on hard datasets. The standard fix is **re-ranking**: use PQ to select the top ~100 candidates, fetch their full-precision vectors (from disk or a cold tier — only 100 random reads), compute exact distances, return the true top-10. This recovers most of the lost recall while keeping the hot path compressed.

**When PQ matters:** roughly **>10M vectors, or whenever you're RAM-bound or paying per-GB-provisioned**. Below that, full-precision HNSW is simpler and better. Middle-ground options worth naming: **scalar quantization** (float32→int8, 4×, tiny recall loss) and pgvector's **halfvec** (float16, 2×, Q13) — often enough, with far less machinery than PQ.

---

## 4. pgvector Deep Dive: The FDE Default

### Q10. Why is "pgvector in the Postgres you already have" the FDE default? When is it enough?

**Answer:**

FDE deployments live in *customer* environments: their ops team, their compliance regime, their on-call rotation. Every new stateful system you introduce is a system **they** must run after you leave. Postgres is almost always already there, already backed up, already monitored, already in their disaster-recovery plan.

pgvector is enough when:

- **Scale is < ~5–10M vectors** per logical index (at 1536 dims that's a 30–60 GB working set — a beefy but ordinary Postgres instance).
- **Vectors relate to relational data** — chunks belong to documents, documents to tenants/permissions. In pgvector, that's a JOIN and a WHERE clause; in a separate vector DB it's a two-system consistency problem (embedding written but row insert rolled back? row deleted but vector orphaned?).
- **You need transactional consistency**: insert the row and its embedding in one transaction; delete cascades remove vectors atomically. No dual-write, no outbox, no reconciliation job.
- **Access control matters**: Postgres RLS applies to vector queries like any other (Q20).
- **Moderate QPS** (hundreds, not tens of thousands, of vector queries/sec).

When it's *not* enough: >10M–100M vectors, very high QPS needing dedicated replicas/sharding, heavy PQ/disk-index requirements, or the customer's data platform is genuinely elsewhere (Q14).

**Interview trap:** "pgvector doesn't scale, so we should start with Pinecone." Two flaws: (a) most customer corpora never reach the scale where pgvector struggles — validate N before architecting for 100× of it; (b) the migration cost from pgvector to a dedicated store later is mostly a re-index job (embeddings are portable), while the cost of running an extra distributed system from day one is paid every day. Start simple, instrument recall and latency, migrate on evidence.

---

### Q11. Show the actual SQL: setup, indexing, and a filtered similarity query in pgvector.

**Answer:**

```sql
-- One-time setup
CREATE EXTENSION IF NOT EXISTS vector;

-- Schema: vectors live NEXT TO business data — that's the whole point
CREATE TABLE chunks (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    document_id bigint NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    tenant_id   uuid   NOT NULL,
    source_type text   NOT NULL,          -- 'contract' | 'email' | 'wiki'
    created_at  timestamptz NOT NULL DEFAULT now(),
    content     text   NOT NULL,
    embedding   vector(1536) NOT NULL     -- dimension is part of the type
);

-- HNSW index for cosine distance
CREATE INDEX chunks_embedding_hnsw
    ON chunks USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- B-tree indexes still matter for the filter columns
CREATE INDEX chunks_tenant_source ON chunks (tenant_id, source_type);
```

Query-time knob and a realistic filtered query:

```sql
-- Per-session (or per-transaction with SET LOCAL) recall/latency knob
SET hnsw.ef_search = 100;   -- default 40; must be >= LIMIT

-- Top-10 for one tenant, restricted to contracts from the last year
SELECT id, document_id, content,
       embedding <=> $1 AS cosine_distance
FROM   chunks
WHERE  tenant_id   = $2
  AND  source_type = 'contract'
  AND  created_at  > now() - interval '1 year'
ORDER  BY embedding <=> $1
LIMIT  10;
```

The three distance operators (index opclass must match the operator used):

| Operator | Distance | Opclass |
|---|---|---|
| `<->` | Euclidean (L2) | `vector_l2_ops` |
| `<=>` | Cosine distance | `vector_cosine_ops` |
| `<#>` | Negative inner product | `vector_ip_ops` |

Things to say unprompted in an interview: the `ORDER BY embedding <=> $1 LIMIT k` shape is what the planner pattern-matches to use the HNSW index; run `EXPLAIN ANALYZE` to confirm an index scan; **build the index after bulk-loading** (much faster, and use `SET max_parallel_maintenance_workers = 7` for parallel HNSW build); note the filtered query has the post-filter problem addressed in Q12.

---

### Q12. HNSW vs IVFFlat in pgvector — and how does pgvector handle filtered vector queries?

**Answer:**

**Index choice inside pgvector:**

| | HNSW | IVFFlat |
|---|---|---|
| Build time | Slower (minutes–hours at millions of rows; parallelizable) | Fast (k-means pass) |
| Memory / index size | Larger (graph) | Smaller |
| Recall @ equal latency | Higher | Lower |
| Insert behavior | Incremental, no training; degrades only via tombstones | New rows assigned to **stale centroids** → drift (Q8) |
| Empty-table build | Fine | Meaningless centroids — must build after load |
| When | Default for anything long-lived with ongoing writes | Bulk-load-once corpora, memory-tight, rebuild-friendly |

Default to HNSW; pick IVFFlat only for load-once/rebuild-often workloads or tight memory.

**Filtering — the part that bites everyone:** an HNSW index scan returns candidates in distance order, and Postgres applies your WHERE clause *after* the index produces them. Historically pgvector's scan fetched ~`ef_search` candidates and stopped; with a selective filter (say 2% of rows match), the top-40 candidates might contain zero matches → **fewer results than LIMIT, or none** — the classic post-filter trap (Q16).

pgvector 0.8+ fixes this with **iterative index scans**:

```sql
SET hnsw.iterative_scan = strict_order;  -- or relaxed_order (faster,
                                         -- may return slightly out of order)
SET hnsw.max_scan_tuples = 20000;        -- safety bound on how deep it digs
```

The scan keeps pulling further candidates from the graph until the LIMIT is satisfied post-filter (bounded by `max_scan_tuples`). Complementary tactics:

- **Highly selective filter** (e.g., `document_id = 123`, a few hundred rows): you *want* a sequential/B-tree plan with exact distances, not HNSW. The planner often chooses this itself if the B-tree stats say the subset is tiny.
- **Filter is a dominant axis** (e.g., always tenant-scoped): consider **partial indexes** (`CREATE INDEX ... USING hnsw (...) WHERE source_type = 'contract'`) or table partitioning by tenant — each partition gets its own smaller HNSW graph.

**Maintenance you must mention:** deleted/updated rows leave tombstones in the heap and the HNSW graph. Autovacuum reclaims them, but vector tables have fat rows (6 KB+ TOASTed) and repair is costly — after bulk churn run explicit `VACUUM`, watch index bloat (`pgstattuple` / index size vs row count), and `REINDEX CONCURRENTLY` when bloat or recall drift shows up. Also verify `maintenance_work_mem` is large enough that HNSW builds don't spill (pgvector warns; builds slow dramatically).

---

### Q13. Memory sizing for pgvector — and what does `halfvec` buy you?

**Answer:**

Worked sizing for 1M chunks at 1536 dims:

```
Heap (table):
  vector:            1,536 × 4 B                = 6,144 B
  row overhead + other columns                  ≈   200 B
  1M rows                                       ≈  6.4 GB heap

HNSW index (m=16):
  full vector copy stored in index              = 6,144 B
  edges: layer0 2·M=32 + upper ≈ 40 links × 4 B ≈   160 B
  1M rows                                       ≈  6.4 GB index

Total on disk ≈ 13 GB; hot working set for fast queries = the INDEX
(~6.5 GB) resident in shared_buffers/page cache.
```

Yes — pgvector's HNSW index duplicates the vectors, so the naive "6 GB of embeddings" becomes ~13 GB of storage. Plan `shared_buffers`/instance RAM so the index fits.

**`halfvec`** stores float16: half the bytes, and empirically ~negligible recall loss for high-dim text embeddings (they're noisy at float32 precision anyway). Best trick: keep the column full precision, make only the **index** half precision via an expression index:

```sql
CREATE INDEX chunks_embedding_hnsw_half
    ON chunks USING hnsw ((embedding::halfvec(1536)) halfvec_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Query must match the expression to use the index:
SELECT id, content
FROM   chunks
ORDER  BY embedding::halfvec(1536) <=> $1::halfvec(1536)
LIMIT  10;
```

Index drops from ~6.4 GB to ~3.4 GB for the same 1M rows; original float32 vectors remain available for exact re-ranking. Also mention: `vector` supports up to 2,000 dims in indexes / `halfvec` up to 4,000 — for 3,072-dim models (text-embedding-3-large) halfvec or dimension truncation (Matryoshka) isn't optional, it's required.

---

## 5. Choosing a Vector Store as an FDE

### Q14. Compare the major vector stores. How does an FDE actually choose in a customer environment?

**Answer:**

The FDE lens is different from a startup's: **hosting model and ops burden dominate**, because the store must live in the *customer's* environment and survive the customer's ops team.

| | pgvector | Pinecone | Qdrant | Weaviate | OpenSearch/ES | Chroma |
|---|---|---|---|---|---|---|
| Hosting | OSS, runs in existing PG (incl. RDS/Cloud SQL) | **SaaS-only** (managed) | OSS + self-host + cloud | OSS + self-host + cloud | OSS/managed; often **already deployed** | OSS, embedded/lightweight server |
| Air-gapped / on-prem | Yes | **No** | Yes | Yes | Yes | Yes |
| Filtering | Full SQL; iterative scans (0.8+) | Strong single-stage metadata filtering | Excellent — payload-aware filtered HNSW | Good | Good (full query DSL) | Basic |
| Hybrid / BM25 | Via `tsvector` + fusion in SQL (DIY) | Sparse-dense support | Built-in sparse vectors/fusion | Built-in hybrid | **Best-in-class BM25** + kNN | Limited |
| Multi-tenant primitive | RLS, schemas, partitions | **Namespaces** (first-class) | Payload partitioning, shard keys, per-tenant collections | Multi-tenancy per collection | Indices per tenant | Collections |
| Ops burden on customer | ~zero incremental (it's their PG) | ~zero (but data leaves their VPC unless enterprise tier) | One more stateful service to run | One more, heavier | Heavy — but sunk cost if present | Low, but not built for prod scale |
| Consistency w/ relational data | **Transactional** | Dual-write | Dual-write | Dual-write | Dual-write | Dual-write |

**Cost worked example — 5M × 1536-dim vectors, moderate QPS:**

- Raw data: 5M × 6,144 B ≈ **30.7 GB**; with HNSW ≈ 60–70 GB storage, ~35 GB hot RAM (or ~18 GB with halfvec).
- **Managed serverless vector SaaS**: storage ~$0.33/GB-mo → ~$10–15/mo storage, but read/write units dominate — a moderate RAG workload (a few QPS sustained) commonly lands **$500–2,000+/mo**; pod/dedicated tiers for this size run similar or higher.
- **Self-hosted (pgvector or Qdrant) on one 64 GB instance** (e.g., r6i.2xlarge ≈ $370/mo on-demand, less reserved) plus a replica: **~$400–750/mo** — and if the customer's Postgres already has headroom, the incremental cost is ~zero.

The dollar gap is real but rarely decisive; **the decisive factors are data residency, ops ownership, and consistency**.

**FDE decision heuristics:**

- Customer already runs **OpenSearch/Elasticsearch** for logs/search → use its kNN; you inherit their ops, backups, and get BM25 hybrid free.
- **Air-gapped / regulated / on-prem** → pgvector or Qdrant. SaaS-only options are disqualified before the feature comparison starts.
- **Vectors must stay consistent with relational data** (permissions, tenancy, joins) → pgvector.
- Team wants zero infra and data egress is approved → Pinecone; namespaces make tenancy easy.
- **>50–100M vectors, heavy filtered search** as the core workload → Qdrant (or Milvus) self-hosted.
- **Prototype/demo** → Chroma is fine in an afternoon — but write the migration plan the same day; embeddings and IDs are portable, so keep them exportable.

**Interview trap:** treating this as a feature-matrix beauty contest. The senior answer starts with constraints: "Where is the data allowed to live? Who operates this in year two? What's already deployed?" — those usually eliminate all but one or two options before recall benchmarks are even relevant.

---

### Q15. The customer insists on a dedicated vector DB "for scale" but has 800K vectors. What do you do?

**Answer:**

This is a stakeholder-management question wearing a database costume. The FDE move:

1. **Quantify their actual scale.** 800K × 1536 × 4 B ≈ 4.9 GB. Show that pgvector HNSW on their existing instance serves this at p99 < 20 ms with 97%+ recall. Numbers, not opinions.
2. **Cost the alternative honestly** — including the second system's ops: monitoring, backup, upgrades, on-call, the dual-write consistency job, and security review of a new SaaS vendor (often 6+ weeks of procurement alone in enterprise).
3. **Define the migration trigger in writing**: "If we exceed 10M vectors or 500 vector QPS or p99 > 150 ms at target recall, we migrate; here's the runbook." This converts a religious argument into a measurable one and shows you're not dogmatic.
4. **Keep the seam clean**: put retrieval behind an interface in code (one module owns "query → top-k chunks") so the store is swappable. That's cheap insurance and defuses the "we'll be locked in" fear.

If they still insist (politics, resume-driven architecture, a real roadmap to 50M vectors) — pick the option with the lowest ops burden for *their* team and move on. FDEs win the war, not every battle.

---

## 6. Filtering × ANN: Where Systems Actually Break

### Q16. Explain pre-filtering vs post-filtering with ANN, and the empty-result trap.

**Answer:**

Combining `WHERE metadata = X` with "top-k nearest" is the single most common production failure mode in vector search.

- **Post-filter**: run ANN top-k over the *whole* corpus, then discard non-matching results. Cheap, and catastrophically wrong for selective filters.
- **Pre-filter**: restrict the search to matching vectors *first*, then find nearest among them. Correct; if the subset is small, just brute-force it exactly.

**The empty-result trap, with numbers:** filter selectivity 1% (e.g., one tenant out of 100, uniformly distributed). ANN top-10 over the full corpus → expected matching results = 10 × 0.01 = **0.1**. Nine times out of ten the user gets *zero results* even though thousands of matching documents exist. It looks like a data bug; it's an architecture bug.

The broken naive version (real code people ship):

```typescript
// BROKEN: post-filter after a fixed top-k
async function searchNaive(queryEmbedding: number[], tenantId: string) {
  const hits = await vectorStore.query({ vector: queryEmbedding, topK: 10 });
  // 1% selectivity => ~0.1 of these survive. Usually returns [].
  return hits.filter((h) => h.metadata.tenantId === tenantId);
}
```

The band-aid people try next — `topK: 1000` and filter — burns latency on every query and *still* fails for a 0.01% filter. The real fixes:

```typescript
// FIX: push the filter INTO the engine (single-stage filtered search),
// and choose strategy by selectivity.
async function search(queryEmbedding: number[], tenantId: string) {
  const matching = await estimateCount({ tenantId }); // cheap count/stat

  if (matching <= 20_000) {
    // High-selectivity: exact scan over the subset. 20K dists is ~1 ms.
    return db.query(
      `SELECT id, content, embedding <=> $1 AS distance
         FROM chunks
        WHERE tenant_id = $2
        ORDER BY embedding <=> $1
        LIMIT 10`,
      [toSql(queryEmbedding), tenantId],
    );
  }
  // Low-selectivity: filtered ANN — the engine filters DURING traversal.
  return vectorStore.query({
    vector: queryEmbedding,
    topK: 10,
    filter: { tenantId: { $eq: tenantId } }, // evaluated inside the index
  });
}
```

**Rule of thumb: high-selectivity filter → pre-filter / exact scan of the subset; low-selectivity filter → filtered-ANN inside the engine. Never post-filter a fixed top-k.**

---

### Q17. How do the different engines actually solve filtered ANN internally?

**Answer:**

Filtered HNSW traversal is the core mechanism: during graph search, non-matching nodes are **traversed but not returned** (they must stay traversable, or the filter disconnects the graph), and the beam keeps expanding until k *matching* results are found. Engine specifics worth citing:

- **pgvector**: iterative index scans (`hnsw.iterative_scan = strict_order|relaxed_order`) keep pulling candidates until the LIMIT survives the WHERE clause, bounded by `hnsw.max_scan_tuples`; plus the planner can choose an exact B-tree plan for very selective filters (Q12).
- **Qdrant**: the standout — **payload-aware filtering** evaluated during HNSW traversal, plus it builds **additional graph links within common filter subsets** (filterable HNSW), and its planner switches to exact search on the filtered subset when the cardinality estimate is small. This is why Qdrant wins filtered-search benchmarks.
- **Pinecone**: **single-stage filtering** — metadata filter applied inside the index search itself (their marketing term for pre-filter-during-traversal), so filtered top-k returns k results without the trap.
- **OpenSearch/Elasticsearch**: kNN query with a `filter` clause executes filtered HNSW; falls back to exact scoring when the filter matches few docs.
- **Weaviate**: pre-filter to an allow-list (bitmap of matching IDs) then HNSW traversal constrained to the list — with a `flatSearchCutoff` that switches to brute force when the list is small.

The failure mode all of them share at the extreme: a filter matching a handful of scattered vectors makes filtered graph traversal explore enormous fractions of the graph. Every good engine has an "if subset is tiny, just scan it exactly" escape hatch — and if you're building on raw pgvector, *you* are that escape hatch (the selectivity branch in Q16).

**Production war story:** A B2B search feature "randomly returned nothing" for small customers but worked for large ones. Root cause: post-filter over a Pinecone top-50 — big tenants (30% of the corpus) always had survivors in the top-50; a tenant with 0.05% of the corpus statistically never did. The team had been "fixing" it by raising topK (it was 50 because someone had already raised it from 10). Real fix was a one-line change to Pinecone's native `filter` parameter — plus namespaces per tenant so the blast radius could never recur. The lesson interviewers want: **result-count anomalies correlated with filter selectivity = post-filtering smell.**

---

## 7. Scaling and Multi-Tenancy

### Q18. Walk through the memory and scaling math from 1M to 100M vectors. What changes?

**Answer:**

**1M vectors (the easy regime):**

```
1M × 1536 × 4 B                       =  6.1 GB vectors
HNSW graph (M=16: ~40 links × 4 B) + overhead ≈ 0.5–1 GB
metadata/heap                          ≈ 0.5–2 GB
------------------------------------------------------
Working set ≈ 7–9 GB  → one ordinary instance, pgvector, done.
```

**10M:** ~61 GB vectors + ~7 GB graph → a 96–128 GB RAM box, or ~35 GB with halfvec. Still single-node; pgvector remains viable but you're near its comfortable ceiling. Add read replicas for QPS.

**100M:** ~614 GB float32 — no longer one node's RAM. Now you pick from:

1. **Shard.** Two strategies with very different query costs:
   - **By tenant** (natural for FDE work): each tenant's vectors live wholly on one shard/collection. Queries hit exactly one shard — no fan-out, clean isolation, easy per-tenant migration and deletion. Downside: hot-tenant skew; mitigate by placing big tenants on dedicated shards.
   - **By hash of ID**: uniform load, but every query is **scatter-gather** — fan out to all S shards, each returns top-k, merge S·k candidates. Latency = slowest shard (p99 amplification); cost = S× compute per query.
2. **Compress.** PQ (Q9): 100M × 96 B ≈ 9.6 GB — back to one node — with a full-precision re-rank tier. Or SQ/halfvec for 2–4× as a gentler step.
3. **Go to disk — DiskANN concept.** Graph (Vamana) and full vectors on NVMe; compressed (PQ) vectors in RAM guide the traversal, so each hop costs one RAM lookup and only the beam's candidates trigger disk reads for exact distances. ~95%+ recall at a few ms with RAM ≈ 10% of dataset size. This is what several managed engines run under the hood, and pgvector-adjacent extensions implement variants.
4. **Replicate for QPS** — independent of sharding: replicas multiply read throughput; QPS problems and capacity problems are different problems, don't conflate them in the interview.

**Ingest vs build throughput** — the operational trap at this scale: streaming 100M vectors through incremental HNSW inserts takes days (each insert is an efConstruction-wide graph search). Bulk strategy: load vectors first, **build the index after** (parallel build), or build offline on a builder node and attach/swap. For continuous heavy ingest, buffer new vectors in a small brute-force segment that's searched exactly and merged into the main index periodically — the standard "fresh segment + merge/compaction" design (this is what Lucene-based engines and most dedicated stores do).

---

### Q19. Design multi-tenant isolation for vector search. What's the spectrum?

**Answer:**

Three tiers, cheapest to safest:

**Tier 1 — Shared collection + `tenant_id` filter.** One index, tenancy is a metadata filter on every query. Cheapest, best resource utilization, instant tenant onboarding. Risks: **one missing WHERE clause = cross-tenant data leak** (the worst incident class in B2B); noisy-neighbor recall/latency effects; tenant deletion = churn in a shared HNSW graph (tombstones, Q5). Requires the filtered-ANN discipline from Q16.

**Tier 2 — Namespace/partition per tenant.** The engine gives tenancy a first-class boundary: **Pinecone namespaces** (each query names exactly one namespace — no filter to forget), **Qdrant** payload-partitioning with tenant-optimized storage or shard keys per tenant, **pgvector** with table partitions (or partial indexes) per tenant. Each tenant effectively gets a smaller index: better recall, no cross-tenant candidates *by construction*, cheap tenant deletion (drop partition/namespace). Scales to thousands–hundreds of thousands of tenants.

**Tier 3 — Physical isolation.** Dedicated collection, database, or instance per tenant. Compliance-driven (regulated industries, government, contractual data-residency), or a handful of whale tenants. Strongest story, highest ops multiplication — viable for tens of tenants, not tens of thousands.

**Decision table:**

| Situation | Choice |
|---|---|
| Thousands of small tenants, standard SaaS | Tier 1 + RLS defense-in-depth (Q20), or Tier 2 if engine makes it free |
| Hundreds of tenants, meaningful data sensitivity | Tier 2 (namespaces/partitions) |
| A few whales, or per-tenant compliance/residency clauses | Tier 3 for those tenants (hybrid: whales isolated, long tail shared) |
| Tenant deletion SLAs ("purge in 24h") | Tier 2+ — dropping a partition beats tombstoning a shared graph |
| FDE on-prem single-customer deployment | Tenancy = the customer's internal departments; usually Tier 1 + RLS |

**Interview trap:** claiming application-level `WHERE tenant_id = ?` is "fine because we always add it." The failure isn't the happy path — it's the new endpoint written in month nine, the analytics script, the ORM default scope that someone bypasses with a raw query. Isolation you have to *remember* is not isolation; the senior answer always includes a mechanism that fails closed (RLS, namespaces, physical separation).

---

### Q20. Show how Postgres RLS gives defense-in-depth for multi-tenant pgvector.

**Answer:**

Row-Level Security makes the *database* enforce tenancy on every query — including vector similarity queries — regardless of what SQL the application sends. The filter cannot be forgotten because it is not the application's job.

```sql
-- 1) Enable and FORCE RLS (force applies it even to the table owner)
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks FORCE  ROW LEVEL SECURITY;

-- 2) Policy: rows are visible only when tenant matches a session setting
CREATE POLICY tenant_isolation ON chunks
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- 3) The app role has no BYPASSRLS, and every request pins its tenant:
--    (SET LOCAL scopes it to the transaction — safe with poolers
--     in transaction mode)
BEGIN;
SET LOCAL app.tenant_id = 'e7b8a1c2-3f4d-5e6f-8a9b-0c1d2e3f4a5b';

SELECT id, content, embedding <=> $1 AS distance
FROM   chunks                       -- note: NO tenant_id in the query text
ORDER  BY embedding <=> $1
LIMIT  10;
COMMIT;
```

The HNSW scan runs normally; RLS is applied as a filter on candidates — so this composes with **iterative scans** (Q12): set `hnsw.iterative_scan = relaxed_order` so the index keeps producing candidates until 10 survive the policy. For small tenants, partition by tenant (or rely on the planner choosing an exact plan) so you're not asking one giant graph for a needle-in-a-haystack tenant.

TypeScript integration, making the safe path the only path:

```typescript
import { Pool, type PoolClient } from "pg";
import pgvector from "pgvector/pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function withTenant<T>(
  tenantId: string,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Parameterized set_config — never string-interpolate the tenant id.
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function searchChunks(tenantId: string, embedding: number[]) {
  return withTenant(tenantId, async (client) => {
    const { rows } = await client.query(
      `SELECT id, content, embedding <=> $1 AS distance
         FROM chunks
        ORDER BY embedding <=> $1
        LIMIT 10`,
      [pgvector.toSql(embedding)],
    );
    return rows; // RLS guarantees these are tenantId's rows. Full stop.
  });
}
```

Belt-and-suspenders in practice: keep the explicit `WHERE tenant_id = $2` in queries **and** RLS underneath — the WHERE clause gives the planner better estimates; RLS catches the query that forgot it.

**Production war story:** During a security review before go-live at a financial-services customer, a grep for vector queries found an internal "similar documents" admin endpoint — added late for support tooling — that queried `chunks` with no tenant filter. It had been live in staging for weeks. Because the deployment had FORCE RLS from day one, the endpoint had only ever returned the *calling* tenant's rows: the bug existed, the leak did not. That review is why the FDE playbook is "RLS before first tenant, not after first incident" — retrofitting RLS onto a live system means auditing every query path under load, with lawyers asking about the window before the fix.

---

## Quick Reference: The FDE Vector-Store Playbook

1. **N < ~500K** → no index or pgvector without index; exact scan; move on to the actual product problem.
2. **N < ~5–10M, Postgres exists** → pgvector + HNSW (`m=16, ef_construction=64`), halfvec index if RAM-tight, iterative scans on, RLS from day one.
3. **Customer runs OpenSearch/ES** → use its kNN + BM25 hybrid; inherit their ops.
4. **Air-gapped / on-prem, big scale** → Qdrant self-hosted (or Milvus); tenant-sharded.
5. **SaaS acceptable, zero-ops mandate** → Pinecone with per-tenant namespaces.
6. **Always**: eval recall on a golden query set, define migration triggers numerically, put retrieval behind one code seam, and never post-filter a fixed top-k.
