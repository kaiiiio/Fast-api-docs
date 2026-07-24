# LLM Systems in Express — Hard Interview Questions

Production LLM backend engineering: streaming through Express with backpressure, queue-based LLM pipelines, rate-limit engineering, RAG failure modes, semantic caching, and the tough Q&A that actually comes up in AI-backend interviews.

## Table of Contents
1. [Token Streaming Through Express — Done Properly](#streaming)
2. [LLM Calls Behind a Queue: The Async Inference Pattern](#queue-pattern)
3. [Rate Limits: Yours and Theirs](#rate-limits)
4. [Timeouts, Retries & Fallback Chains](#retries)
5. [RAG Pipeline Internals & Failure Modes](#rag)
6. [Embeddings at Scale: Ingestion Pipelines](#embeddings)
7. [Semantic Caching](#semantic-cache)
8. [Structured Output That Survives Production](#structured)
9. [Cost, Token Accounting & Multi-Tenancy](#cost)
10. [Observability & Evals for LLM Features](#observability)
11. [Hard Interview Q&A](#qna)

---

<a name="streaming"></a>
## 1. Token Streaming Through Express — Done Properly

The naive version works in dev and falls apart in prod. The interview wants the failure modes.

```ts
app.post('/api/chat', async (req, res) => {
  // SSE headers — and why each one exists
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform', // no-transform: stop proxies re-encoding
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',                 // nginx: disable response buffering
  });
  res.flushHeaders();

  const abort = new AbortController();
  req.on('close', () => abort.abort());        // client disconnected → stop paying for tokens

  let full = '';
  try {
    const stream = await openai.chat.completions.create(
      { model, messages, stream: true, stream_options: { include_usage: true } },
      { signal: abort.signal }
    );
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? '';
      if (delta) {
        full += delta;
        const ok = res.write(`data: ${JSON.stringify({ delta })}\n\n`);
        if (!ok) await new Promise(r => res.once('drain', r)); // BACKPRESSURE
      }
      if (chunk.usage) recordUsage(req.userId, chunk.usage);
    }
    res.write('data: [DONE]\n\n');
  } catch (e) {
    if (!abort.signal.aborted) {
      // Headers already sent — can't send 500. Signal errors IN-BAND.
      res.write(`data: ${JSON.stringify({ error: 'generation_failed' })}\n\n`);
    }
  } finally {
    res.end();
    if (full) await saveMessage(conversationId, full); // persist even partials
  }
});
```

The five things that separate senior from junior here:

1. **Backpressure**: `res.write()` returns `false` when the socket buffer is full (slow client, mobile network). Ignoring it buffers the entire response in Node memory per connection — thousands of concurrent streams → OOM. Await `'drain'`.
2. **Client disconnects**: without `req.on('close') → abort`, you keep paying the provider for tokens nobody receives. At scale this is real money.
3. **Errors after headers are sent**: status is committed at first write. Mid-stream provider errors must be sent as in-band events the client protocol understands — your global Express error middleware cannot help you here.
4. **Proxy chain**: nginx buffers responses by default (`X-Accel-Buffering: no` / `proxy_buffering off`), some LBs kill idle connections (~60s) — send SSE comments (`: ping\n\n`) as heartbeats during long tool-calls when no tokens flow. Compression middleware must either skip SSE or flush per event, or the client sees nothing until the end.
5. **Persistence of partials**: users navigate away mid-answer; save what was generated (and count its tokens) in `finally`, not only on success.

**SSE vs WebSockets** (guaranteed follow-up): SSE is one-directional server→client over plain HTTP — enough for token streaming, works through proxies/HTTP2, auto-reconnects (`Last-Event-ID`), no upgrade handshake. WebSockets earn their complexity only for bidirectional needs (live collab, client-interruptible voice). Note `EventSource` can't set POST bodies/headers — real chat UIs use `fetch()` + `ReadableStream` parsing of the SSE wire format instead.

---

<a name="queue-pattern"></a>
## 2. LLM Calls Behind a Queue: The Async Inference Pattern

Interactive chat streams synchronously. **Everything else** (document analysis, bulk generation, agent pipelines) belongs behind a queue — an LLM call is a 2–120s, failure-prone, rate-limited external dependency; holding an HTTP request open for it wastes sockets and couples user latency to provider hiccups.

```
POST /api/analyze  →  validate + create record (status: queued)
                   →  llmQueue.add('analyze', { docId }, { jobId: `analyze-${docId}` })
                   →  202 Accepted { id, statusUrl }

Worker: fetch doc → chunk → LLM calls → store result → status: done
Client: polls GET /api/analyze/:id, or gets pushed via SSE/webhook
```

Design decisions to defend:

- **`jobId` = deterministic** → double-submits dedupe at the queue (see BullMQ notes §10).
- **Job data carries IDs, not payloads** — a 200KB prompt in Redis job data × thousands of jobs bloats Redis and slows every Lua script. Store the prompt/doc in Postgres/S3; the job carries `docId`.
- **Worker concurrency is high** (LLM calls are pure I/O — a single worker can hold dozens of in-flight requests) but bounded by the provider rate limit, enforced by the queue limiter, not by hope.
- **Chunk fan-out**: use a flow — children = per-chunk summarize jobs, parent = reduce/merge. Chunk failures retry individually instead of redoing the whole document.
- **Status modeling**: `queued → processing → done | failed` in *your* DB (job queues are not databases; the UI reads Postgres, not Redis).
- **Timeout the LLM call itself** (`AbortSignal.timeout(120_000)`) — otherwise a hung connection holds a worker slot until the job stalls.

**Priority split you should volunteer:** interactive traffic and batch traffic must never share a rate-limit budget blindly — batch jobs will starve chat. Separate queues (or separate API keys/deployments) with the batch queue's limiter set to (quota − interactive headroom). Providers' Batch APIs (50% cost, 24h SLA) are the right answer for truly offline bulk work.

---

<a name="rate-limits"></a>
## 3. Rate Limits: Yours and Theirs

Two directions, both asked:

### Theirs (provider → you)
- Limits come as **RPM and TPM** (tokens/min), per model per org/key; TPM counts *estimated* input+max output. You can hit TPM with low RPM via long prompts.
- On 429: honor `Retry-After` if present; otherwise exponential backoff **with full jitter** (`sleep(random(0, min(cap, base·2^n)))`) — without jitter, all your workers retry in synchronized waves (thundering herd) and keep re-triggering the limit.
- In a BullMQ worker: `worker.rateLimit(msFromRetryAfter)` + throw `Worker.RateLimitError()` → queue pauses globally, attempt not consumed. This is the clean integration point.
- Proactive: token-bucket in Redis sized to your quota, estimate tokens *before* sending (tiktoken), acquire capacity or requeue with delay. Reactive-only (wait for 429s) wastes your quota on rejected requests.

### Yours (users → you)
- LLM endpoints are expensive to *you* — rate limit by **cost, not request count**: budget tokens/user/day in Redis (`INCRBY` on usage), reject with 429 + upgrade prompt when exceeded.
- Do it per-tenant *and* globally (one abusive tenant must not exhaust the org quota for everyone) — a two-level token bucket.
- Concurrency limits matter separately from rate: 50 users each opening 10 parallel streams = 500 held sockets + provider concurrency cap. Cap in-flight streams per user (Redis counter INCR/DECR on start/end, with TTL as leak protection).

---

<a name="retries"></a>
## 4. Timeouts, Retries & Fallback Chains

```
Retryable:      429 (with backoff), 500/502/503, ECONNRESET, timeout
NOT retryable:  400 (bad request — your bug), 401/403 (config), 413 (context length — must
                truncate, retry identical = identical failure), content-filter refusals
Special:        streaming failure AFTER partial output — retrying re-generates from scratch
                and may produce different text; decide: retry whole, or surface partial
```

- **Timeout budget per attempt**, not per job: e.g. job timeout 5min = 3 attempts × 90s + backoff. An unbounded `await openai...` inside a 3-attempt job can consume the entire window on attempt 1.
- **Fallback chain**: on persistent failure of the primary model → same-provider smaller model → second provider (different infra!) → degraded static response. Keep prompts provider-portable or maintain per-provider prompt variants; log which tier served each request (quality debugging later).
- **Circuit breaker** in front of each provider: after N failures in a window, open the circuit (fail fast / skip to fallback) instead of making every request wait out a 90s timeout during a provider outage — otherwise the outage consumes all your worker capacity at exactly peak-error time. Half-open probe to recover.
- **Idempotency**: LLM calls are non-deterministic — a "retry" is a *new generation*. If the result was partially persisted (e.g., 3 of 5 chunk summaries), retry only the missing chunks (content-addressed by chunk hash), not the whole document.

---

<a name="rag"></a>
## 5. RAG Pipeline Internals & Failure Modes

You will be asked to go past "embed, store, retrieve, prompt." The depth lives in the failure modes:

### Chunking — where most RAG quality is won/lost
- Fixed-size (512–1024 tokens, 10–20% overlap) is the baseline; **structure-aware** (split on headings/paragraphs, keep tables intact) beats it; sentence-boundary snapping prevents mid-thought cuts.
- Too small → chunks lack context to be understood standalone ("It increased by 40%" — what did?); too large → embedding averages away specifics + fewer chunks fit the context budget.
- **Contextual enrichment**: prepend document title/section path to each chunk before embedding ("Q3 Report > Revenue > EMEA: …") — cheap and one of the highest-leverage fixes; the fancier version is LLM-generated per-chunk context (Anthropic's "contextual retrieval").

### Retrieval — beyond naive top-k
- **Hybrid search**: dense vectors miss exact identifiers (SKUs, error codes, names — the "keyword gap"); BM25/full-text misses paraphrase. Run both, merge with **Reciprocal Rank Fusion**: `score(d) = Σ 1/(60 + rank_i(d))` — rank-based, so no score normalization needed across incomparable scorers.
- **Reranking**: bi-encoders (your embeddings) encode query and doc *independently* — fast, coarse. A **cross-encoder** reranker attends over (query, doc) *jointly* — far more accurate, too slow for the full corpus. So: retrieve 50 cheap, rerank to top 5–8. This bi-encoder/cross-encoder distinction is a classic interview probe.
- **Query transformation**: raw user queries are terrible embeddings ("it doesn't work after the update" — what's "it"?). Rewrite with conversation context, decompose multi-part questions, HyDE (embed a hypothetical answer) for short queries.

### pgvector-specific hard questions
- **HNSW vs IVFFlat**: HNSW — graph-based, better recall/latency, slower builds, more RAM, no training step; IVFFlat — clusters (needs training on existing data; `lists ≈ √n`), smaller/faster to build, recall degrades as data drifts from training distribution and you must periodically reindex. Default to HNSW.
- **ANN is approximate**: recall < 100% by design; tune `hnsw.ef_search` (recall vs latency).
- **The filtered-search trap**: `WHERE tenant_id = X ORDER BY embedding <=> $1 LIMIT 10` — the index scans nearest neighbors *then* filters; with a selective filter it may scan far to find 10 matches or return fewer (pre-11.x behavior; iterative scans improve this). Fixes: partial indexes per hot tenant, partitioning by tenant, or pgvector's iterative index scans. Any "multi-tenant vector search" question is fishing for this.
- Distance ops: `<=>` cosine, `<->` L2, `<#>` negative inner product — the index only helps if the query operator matches the index opclass.

### The failure-mode checklist (say these unprompted)
Retrieval misses (vocabulary mismatch → hybrid/rewriting) · **lost-in-the-middle** (models attend to the start/end of long contexts — put the best chunks first, don't stuff 50) · stale index (source updated, embeddings not → reindex pipeline, versioning) · **cross-tenant leakage** (filter must be enforced in the query, tested adversarially — it's a security bug, not a quality bug) · unanswerable questions (instruct "say you don't know if the context lacks the answer"; evaluate groundedness) · conflicting sources (recency/authority metadata, let the LLM cite).

---

<a name="embeddings"></a>
## 6. Embeddings at Scale: Ingestion Pipelines

Design question: "Ingest 100K documents into your vector store — walk me through it."

```
upload → outbox/enqueue(ingest-doc) →
  worker: parse (sandboxed if PDF!) → chunk → hash each chunk →
  skip chunks whose hash already has an embedding (content-addressed cache) →
  batch-embed (e.g. 100+ inputs per API call — batching is 10-50x cheaper in RPM terms) →
  transactionally upsert chunks + vectors → mark doc version live → delete old version's chunks
```

Points that score:
- **Content-hash dedup**: re-ingesting an edited document re-embeds only changed chunks. Embeddings are deterministic per (model, text) — a perfect cache key.
- **Versioned swap, not in-place mutation**: embed the new version fully, then flip a `live_version` pointer atomically — readers never see a half-updated document.
- **Model version is part of the schema**: embeddings from different models/versions are *not comparable* — never mix them in one search space. A model upgrade = full re-embed = a migration you must be able to run online (dual-write new column/table, backfill via queue, flip reads, drop old).
- Parsing PDFs/Office docs is CPU-bound and crash-prone → sandboxed processors.
- Ordering hazard: user edits a doc twice quickly → two ingest jobs race → last-write-wins must be by version number, not job completion order.

---

<a name="semantic-cache"></a>
## 7. Semantic Caching

Exact-match caching (hash of prompt) has ~0% hit rate on free-text chat. **Semantic cache**: embed the query, search cached (query-embedding → response) pairs, serve the cached response above a similarity threshold.

The hard parts (this is where the interview goes):
- **Threshold tuning is a precision/recall problem**: 0.95+ = few hits; 0.85 = "how do I delete my account" might serve the cached answer for "how do I delete a message." False hits are *wrong answers served confidently* — far worse than a cache miss. Start conservative (≥0.95 cosine), log near-misses, tune per domain.
- **Context sensitivity**: identical question, different user/tenant/document-set → different correct answer. Cache key must include the context scope (tenant, doc-set version, model, prompt-template version) — the embedding only covers the query text.
- **Invalidation**: cached answers derived from RAG data go stale when the corpus changes → tie cache entries to index version, drop on reindex.
- Where it *does* shine: high-repetition surfaces (FAQ bots, search suggestions), and caching **expensive intermediate steps** (query rewrites, retrieval results) rather than final generations.

---

<a name="structured"></a>
## 8. Structured Output That Survives Production

- Prefer **native structured output / tool-calling with a JSON schema** (constrained decoding — the model *cannot* emit invalid JSON) over "please respond in JSON" prompting. Know the caveat: schema-valid ≠ *correct* — the model can still hallucinate values that pass the schema.
- Still validate with Zod at the boundary (defense in depth + your types), and handle refusals/empty tool calls as a distinct case from invalid output.
- Repair ladder for providers without strict modes: parse → on failure, attempt mechanical repair (strip markdown fences, trailing commas) → on failure, one re-ask with the error message included → then fail the job properly. Cap repair loops; each is a paid call.
- Enums beat free text ("category": one of [...]); numbers as numbers, not "approximately five"; make every optional field explicitly nullable so the model has a legal way to say "not found" instead of inventing.

---

<a name="cost"></a>
## 9. Cost, Token Accounting & Multi-Tenancy

- Meter **at the response**, from the provider's `usage` object (not your tiktoken estimate — estimates drift, and cached/thinking tokens have different prices). For streams, `stream_options: { include_usage: true }`.
- Write usage events to your DB (append-only `usage_events`: tenant, user, model, input/output/cached tokens, feature tag, request ID) — Redis counters for real-time budget enforcement, Postgres for billing truth. Two systems, reconciled.
- **Budget enforcement is pre-flight + settle**: reserve estimated cost before the call (reject if over budget), settle with actual usage after. Pure post-hoc metering lets a tenant blow through the cap with parallel requests.
- Cost levers ranked: (1) right-size the model per task — most classification/extraction doesn't need the frontier model; (2) **prompt caching** — providers discount cached prefix tokens heavily (50–90%); structure prompts so the long static part (system prompt, docs) is a stable prefix and the variable part comes last; (3) cap `max_tokens` per feature; (4) batch APIs for offline work; (5) shorten prompts (RAG top-k discipline, conversation summarization instead of full history).

---

<a name="observability"></a>
## 10. Observability & Evals for LLM Features

- **Trace every call**: request ID → (prompt template + version, retrieved chunk IDs, model, params, latency, tokens, finish_reason, response). When a user reports a bad answer, you must be able to replay exactly what the model saw. Tools: Langfuse/LangSmith/OTel GenAI conventions — but the *schema* is the point, not the tool.
- **Latency**: for streams track **TTFT** (time-to-first-token — UX) separately from total duration; p95 of both per model per feature. Watch `finish_reason`: a spike in `length` = truncated outputs = a max_tokens or prompt-bloat bug.
- **Quality regression is silent**: prompts change, models get quietly updated, RAG corpora drift. Defenses: version prompts like code (repo, not DB strings), an **eval set** (golden Q→expected-property pairs) run in CI on prompt/model changes, LLM-as-judge for scale with periodic human calibration, canary rollout of prompt/model changes with online metrics (thumbs-down rate, retry rate, groundedness sampling).
- RAG-specific evals: retrieval recall@k on labeled (query → relevant chunk) pairs — evaluate **retrieval separately from generation**; if retrieval misses, no prompt fix helps.

---

<a name="qna"></a>
## 11. Hard Interview Q&A

**Q: Your streaming endpoint works locally but users in prod see the whole answer appear at once. Why?**
Buffering in the middle: nginx `proxy_buffering` (fix: `X-Accel-Buffering: no`), compression middleware buffering until response end (skip/flush for SSE), an LB or CDN that doesn't pass streaming through, or HTTP/1.0 client path. Debug by curl-ing each hop.

**Q: 2,000 users, each can upload docs and chat over them. Walk me through the full architecture.**
Ingestion: presigned upload → outbox → BullMQ ingest queue → sandboxed parse → chunk (structure-aware + contextual headers) → content-hash dedup → batch embed → versioned upsert into pgvector with `tenant_id` on every row + hybrid (tsvector) columns. Chat: Express SSE endpoint → verify session → rewrite query with history → hybrid search (vector + BM25, RRF) *filtered by tenant in SQL* → rerank top-50→8 → prompt with static prefix first (prompt caching) → stream with backpressure/abort → persist message + usage in finally. Cross-cutting: per-tenant token budgets (Redis pre-flight reserve/settle), provider limiter on the queue, circuit breaker + model fallback, tracing with chunk IDs, eval set in CI. (Then let them drill into any box — each section above is one of the boxes.)

**Q: Retrieval returns garbage for queries containing product codes like 'ERR-4092'. Why, and fix?**
Embedding models tokenize rare identifiers into meaningless subwords — dense vectors have a keyword gap. Fix: hybrid retrieval (BM25/pg full-text finds exact tokens) merged via RRF; optionally boost exact matches pre-rerank.

**Q: Why is retrying a failed LLM call different from retrying a failed DB write?**
Non-determinism (retry = new, possibly different output — matters if partial output already reached the user or storage), cost (each retry is billed), rate-limit coupling (blind retries amplify 429 storms — jittered backoff + Retry-After + queue-level pause), and error semantics (413/content-filter are permanent for that input; retrying is pure waste — classify before retrying).

**Q: Your OpenAI bill doubled month-over-month with flat traffic. Hunt the cause.**
Group `usage_events` by feature/model/tenant, compare avg input tokens per request over time. Usual suspects: conversation history growing unboundedly (no summarization window), RAG top-k or chunk-size increase, prompt-template change that broke the prompt-cache prefix (cached→full-price tokens — check cached-token ratio), a retry/repair loop making 3 calls per request (check calls-per-request), model silently switched in config, one tenant scripting bulk usage (per-tenant caps).

**Q: How do you keep one tenant's documents out of another tenant's answers — and prove it?**
Enforce in the retrieval query (`WHERE tenant_id = $1`, ideally Postgres RLS so it can't be forgotten), never post-filter model output; derive tenant from session, never request body; know the ANN filtered-search pitfall (filter+index interplay). Prove: adversarial tests seeding tenant-A-only strings and asserting tenant-B queries never surface them, in CI.

**Q: When would you NOT use RAG?**
Small stable corpus that fits the context window (just include it — with prompt caching it's cheap); knowledge that's behavioral rather than factual (fine-tuning territory); strict-latency paths where retrieval round trips break budget; structured lookups that a SQL query answers exactly (text-to-SQL or plain API beats semantic search over rows).
