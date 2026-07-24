# LLMOps and Production Reliability - Senior Interview Deep Dive

The demo works on your laptop. Then it's 2am, your primary provider is rate-limiting, a prompt change silently regressed extraction quality, one tenant is burning the whole month's token budget, and p99 streaming latency just tripled. LLMOps is the discipline that keeps LLM features *reliable, observable, and affordable* under production load. This file covers prompt versioning and safe rollout (canary/shadow), regression eval gates in CI, semantic caching with real hit-rate math, fallback chains you can actually paste into a service, cross-provider quota management, cost monitoring, latency SLOs for streaming, load testing, multi-region failover, and per-tenant budget enforcement.

Assume you can call an LLM API. This is about running one for thousands of users without it falling over or bankrupting you.

---

### Q1. Why do prompts need versioning and a registry? What breaks without it?

**Answer:**

A prompt is **production code** — it determines model behavior as surely as a function body — but teams treat it like a config string edited in place. Without versioning:

```
Failure without prompt versioning
------------------------------------------------------------
- Someone edits the prod prompt to fix one case → silently breaks five others.
  No one notices for days because there's no regression gate.
- A regression appears; you can't answer "what changed?" — no diff, no history.
- You can't roll back — the previous prompt text is gone.
- You can't A/B or canary — there's only one live prompt, no versions to compare.
- Prompts are scattered across code, notebooks, and copy-paste — no source of truth.
- No link between a prompt version and its eval scores, so you don't know which
  version was actually good.
```

A **prompt registry** treats prompts as versioned, immutable artifacts with metadata, exactly like container images:

```
Prompt registry entry
----------------------------------------
id:            extract_order
version:       7                (immutable; new edit = new version)
content:       "<the prompt text / template>"
model:         claude-sonnet-5
params:        { temperature: 0, max_tokens: 1024 }
eval_score:    0.94   (on golden set v3)
status:        production | canary | archived
created_by / created_at / parent_version
```

```typescript
interface PromptVersion {
  id: string;
  version: number;
  content: string;
  model: string;
  params: { temperature: number; maxTokens: number };
  evalScore?: number;
  status: "draft" | "canary" | "production" | "archived";
  createdAt: string;
  parentVersion?: number;
}

class PromptRegistry {
  private store = new Map<string, PromptVersion[]>();

  // Registering never mutates — it appends an immutable version.
  register(v: Omit<PromptVersion, "version" | "createdAt" | "status">): PromptVersion {
    const versions = this.store.get(v.id) ?? [];
    const next: PromptVersion = {
      ...v,
      version: (versions.at(-1)?.version ?? 0) + 1,
      createdAt: new Date().toISOString(),
      status: "draft",
    };
    this.store.set(v.id, [...versions, next]);
    return next;
  }

  getProduction(id: string): PromptVersion | undefined {
    return this.store.get(id)?.find((v) => v.status === "production");
  }
  getCanary(id: string): PromptVersion | undefined {
    return this.store.get(id)?.find((v) => v.status === "canary");
  }
  // Promotion is an explicit, auditable transition — not an in-place edit.
  promote(id: string, version: number, to: PromptVersion["status"]): void {
    const versions = this.store.get(id);
    if (!versions) throw new Error(`unknown prompt ${id}`);
    if (to === "production") versions.forEach((v) => { if (v.status === "production") v.status = "archived"; });
    const target = versions.find((v) => v.version === version);
    if (!target) throw new Error(`no version ${version}`);
    target.status = to;
  }
}
```

**Interview trap:** "we store prompts in the code repo, that's versioning." Git helps, but a prompt registry adds what git doesn't: runtime status (which version is *live* vs canary), the eval score bound to each version, promotion/rollback as a *runtime* operation (no redeploy), and per-version traffic control. You want to shift traffic between prompt versions without shipping code. **Production war story:** a team edited the prod extraction prompt to handle a new document type; it fixed that type and silently broke date parsing on the existing 90% of traffic. No version history, no eval gate — they discovered it three days later from customer complaints and couldn't cleanly roll back because the old prompt text was lost. A registry + regression gate would have caught it in CI.

---

### Q2. Explain canary and shadow deployment for prompt/model changes. How are they different and when do you use each?

**Answer:**

Both de-risk a change by not flipping 100% of traffic at once, but they differ in whether users see the new version.

```
SHADOW (mirror)                      CANARY (gradual rollout)
-------------------------------      -------------------------------
New version runs in PARALLEL,        New version serves a SMALL % of
users see OLD version's output.      REAL users; rest see old.
New output is logged/compared,       Ramp 1% → 5% → 25% → 100% while
never shown.                         watching metrics.
Zero user risk.                      Real user impact, gated by metrics.
Use to: validate before ANY user     Use to: safely ramp AFTER shadow,
exposure; catch crashes, cost,       measure real quality/business
latency, format changes.             signals live.
```

```
        ┌──────── SHADOW ────────┐         ┌──────── CANARY ────────┐
        │                        │         │                        │
request─┤─► OLD prompt ─► user   │  request┤─►(95%) OLD ─► user      │
        │─► NEW prompt ─► /dev/log│         │─►(5%)  NEW ─► user      │
        │   (compared, unseen)   │         │        (metrics gated)  │
        └────────────────────────┘         └─────────────────────────┘
```

Typical pipeline: **shadow first** (no user risk, catch obvious breakage, compare outputs/cost/latency offline), then **canary** (ramp real traffic while watching quality + business metrics), then full rollout — with instant rollback via the registry (Q1).

```typescript
interface RolloutConfig { canaryPercent: number; }

function pickVersion(
  registry: PromptRegistry,
  promptId: string,
  cfg: RolloutConfig,
  requestKey: string,   // stable per user/session → consistent experience
): PromptVersion {
  const prod = registry.getProduction(promptId)!;
  const canary = registry.getCanary(promptId);
  if (!canary) return prod;
  // Deterministic bucketing: same user always gets same version during the ramp.
  const bucket = hashToUnit(requestKey);
  return bucket < cfg.canaryPercent / 100 ? canary : prod;
}

function hashToUnit(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 10000) / 10000;
}

// Shadow: run new alongside old, return OLD to the user, log the comparison.
async function shadowCall(
  runOld: () => Promise<string>,
  runNew: () => Promise<string>,
  logComparison: (old: string, next: string, oldMs: number, newMs: number) => void,
): Promise<string> {
  const t0 = Date.now();
  const oldOut = await runOld();
  const oldMs = Date.now() - t0;
  // Fire-and-forget the shadow so it never adds latency to the user path.
  void (async () => {
    const t1 = Date.now();
    try { const newOut = await runNew(); logComparison(oldOut, newOut, oldMs, Date.now() - t1); } catch { /* shadow errors never affect users */ }
  })();
  return oldOut;
}
```

Key rules: **stable bucketing** (a user shouldn't flip between versions mid-session), **shadow must never add user-facing latency** (fire-and-forget), and **shadow failures must never affect the real response**. **Interview trap:** canarying without a metric to gate on — ramping by gut feel. A canary is only useful if you're watching a concrete signal (error rate, format-valid rate, an online quality proxy, cost/call) and have an automatic rollback trigger.

---

### Q3. How do you build regression eval gates in CI for LLM changes? What do you gate on?

**Answer:**

Every prompt/model/RAG change runs against a **golden eval set** in CI, and the change is **blocked from promotion** if scores regress past a threshold. This is the LLM equivalent of a test suite — without it, quality is a random walk.

```
CI PIPELINE for an LLM change
------------------------------------------------------------
PR opens (prompt v7 → v8)
   │
   ▼
Run golden set (100-300 labeled cases) against v8
   │
   ▼
Score: correctness, format-validity, faithfulness, refusal-rate, cost, latency
   │
   ▼
Compare to v7 (current production) baseline
   │
   ├─ any gated metric regressed > threshold → FAIL, block merge
   ├─ cost or p95 latency up > threshold      → FAIL (or warn)
   └─ all pass                                 → allow promote to canary
```

```typescript
interface EvalCase { id: string; input: string; reference: string; }
interface GateResult { metric: string; baseline: number; candidate: number; delta: number; passed: boolean; }

interface GateConfig {
  minCorrectness: number;      // absolute floor
  maxCorrectnessDrop: number;  // vs baseline, e.g. 0.02
  minFormatValid: number;
  maxCostIncrease: number;     // fraction, e.g. 0.15
  maxP95Increase: number;
}

async function runEvalGate(
  cases: EvalCase[],
  candidate: (input: string) => Promise<{ output: string; costUsd: number; latencyMs: number }>,
  scoreCorrect: (out: string, ref: string) => number,
  isFormatValid: (out: string) => boolean,
  baseline: { correctness: number; costUsd: number; p95Ms: number },
  cfg: GateConfig,
): Promise<{ passed: boolean; results: GateResult[] }> {
  let correct = 0, formatValid = 0, totalCost = 0;
  const latencies: number[] = [];
  for (const c of cases) {
    const r = await candidate(c.input);
    correct += scoreCorrect(r.output, c.reference);
    if (isFormatValid(r.output)) formatValid += 1;
    totalCost += r.costUsd;
    latencies.push(r.latencyMs);
  }
  const n = cases.length;
  const correctness = correct / n;
  const formatRate = formatValid / n;
  const avgCost = totalCost / n;
  const p95 = percentile(latencies, 0.95);

  const results: GateResult[] = [
    gate("correctness_floor", cfg.minCorrectness, correctness, correctness >= cfg.minCorrectness),
    gate("correctness_regression", baseline.correctness - cfg.maxCorrectnessDrop, correctness, correctness >= baseline.correctness - cfg.maxCorrectnessDrop),
    gate("format_valid", cfg.minFormatValid, formatRate, formatRate >= cfg.minFormatValid),
    gate("cost", baseline.costUsd * (1 + cfg.maxCostIncrease), avgCost, avgCost <= baseline.costUsd * (1 + cfg.maxCostIncrease)),
    gate("p95_latency", baseline.p95Ms * (1 + cfg.maxP95Increase), p95, p95 <= baseline.p95Ms * (1 + cfg.maxP95Increase)),
  ];
  return { passed: results.every((r) => r.passed), results };
}

function gate(metric: string, baseline: number, candidate: number, passed: boolean): GateResult {
  return { metric, baseline, candidate, delta: candidate - baseline, passed };
}
function percentile(xs: number[], p: number): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
}
```

What to gate on (not just correctness):

```
Metric              Why gate on it
------------------  ------------------------------------------------
Task correctness    the point of the change
Format validity     broken JSON/schema breaks downstream code hard
Faithfulness        RAG changes can introduce ungrounded answers
Refusal rate        a prompt tweak can make the model over-refuse
Cost per call       a "better" prompt that doubles tokens may not be worth it
p95 latency         quality gains that blow the SLO are regressions
Safety/PII checks   never regress on leakage
```

**Interview trap:** gating only on average correctness. A change can hold average correctness while tanking format validity on 5% of inputs (breaking the parser) or doubling cost. Gate on the *portfolio* of metrics, and use a fixed golden set with contamination hygiene (the fine-tuning file, Q7/Q8). **Production war story:** a "harmless" prompt reformat kept correctness at 94% but dropped strict-JSON validity from 99.5% to 96% — and the 3.5% of malformed outputs crashed the downstream ingestion service in prod. A format-validity gate in CI would have failed the PR instantly.

---

### Q4. Explain semantic caching. How does it differ from exact caching, and what's the hit-rate math?

**Answer:**

**Exact caching** keys on the literal request (hash of prompt + params). It only hits when the input is byte-identical — useless for natural language, where users phrase the same question a hundred ways.

**Semantic caching** keys on *meaning*: embed the query, and if a past query's embedding is within a similarity threshold, return the cached answer. "What's your refund policy?" hits the cache entry for "How do I get a refund?"

```
EXACT CACHE                          SEMANTIC CACHE
---------------------------          ----------------------------------
key = hash(exact input)              key = embedding(input)
hit iff input identical              hit iff cos(query, cached) > threshold
~0% hit on free-text                 20-60%+ hit on repetitive NL traffic
zero false hits                      RISK of false hits (wrong answer!)
```

```
       query "how do I get a refund"
              │
              ▼ embed
        ┌─────────────┐
        │ vector search│  over cached (query_embedding → answer)
        └──────┬───────┘
        top-1 similarity
              │
   sim > 0.95 ├─ HIT  → return cached answer (near-zero cost/latency)
   sim ≤ 0.95 └─ MISS → call LLM, store (embedding, answer) in cache
```

The hit-rate math (why it's worth it):

```
Suppose:  hit_rate = h,  LLM_cost = $C/call,  cache_cost ≈ $c (embed + lookup, c << C)

Cost per query with cache = h·c + (1−h)·(C + c)     [misses also pay embed cost]
                          ≈ (1−h)·C   for c << C

At C = $0.01, c = $0.00002:
  h = 0    → $0.0100  (no cache)
  h = 0.30 → $0.0070  (30% cheaper + 30% of queries near-instant)
  h = 0.50 → $0.0050  (half the cost)
  h = 0.70 → $0.0030  (70% cheaper)

Latency: a hit is ~embedding+lookup (~20-50ms) vs full generation (~1000ms+).
So a 40% hit rate ALSO cuts ~40% of your slow paths to near-instant.
```

```typescript
interface CacheEntry { embedding: number[]; answer: string; createdAt: number; }

class SemanticCache {
  private entries: CacheEntry[] = [];
  constructor(private threshold = 0.95, private ttlMs = 60 * 60 * 1000) {}

  lookup(queryEmbedding: number[]): string | null {
    const now = Date.now();
    let best: { answer: string; sim: number } | null = null;
    for (const e of this.entries) {
      if (now - e.createdAt > this.ttlMs) continue;          // respect TTL
      const sim = cosine(queryEmbedding, e.embedding);
      if (sim >= this.threshold && (!best || sim > best.sim)) best = { answer: e.answer, sim };
    }
    return best?.answer ?? null;
  }
  store(queryEmbedding: number[], answer: string): void {
    this.entries.push({ embedding: queryEmbedding, answer, createdAt: Date.now() });
  }
}
function cosine(a: number[], b: number[]): number {
  let d = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return d / (Math.sqrt(na) * Math.sqrt(nb));
}
```

**The danger: false hits.** Set the threshold too low and "how do I *cancel* a refund" hits the "how do I *get* a refund" entry — returning a *confidently wrong* answer. This is worse than a cache miss. So semantic caching demands a **high threshold (0.93-0.97+)**, and it's unsafe for queries whose answers depend on parameters the embedding ignores (user ID, dates, "my order #12345"). **Interview trap:** caching personalized or context-dependent answers semantically — "what's the status of my order" must never be cached across users. Only cache queries whose answer is a pure function of the query meaning (FAQs, policy, general knowledge).

---

### Q5. How do you handle cache invalidation and freshness for a semantic cache?

**Answer:**

The classic hard problem, amplified because semantic cache keys are fuzzy — you can't look up "the entry for document X" by key. Strategies:

```
Invalidation strategy      Use when
-------------------------  ------------------------------------------
TTL (time-based)           answers drift slowly; simplest; always use as a floor
Source-version tagging     answer derived from a doc/version → invalidate on change
Explicit purge by tag      admin edits a policy → purge all cache entries tagged with it
Namespace/version bump     underlying model or prompt changes → bump cache namespace,
                           old entries become unreachable (cheap mass-invalidation)
```

The key technique: **tag each cache entry with the sources/version it depends on**, so a change to a source invalidates exactly the affected entries.

```typescript
interface TaggedEntry {
  embedding: number[];
  answer: string;
  sourceTags: string[];   // e.g. ["doc:refund_policy@v4", "model:claude-sonnet-5", "prompt:faq@v7"]
  createdAt: number;
}

class InvalidatingCache {
  private entries: TaggedEntry[] = [];
  constructor(private threshold = 0.95, private ttlMs = 3600_000) {}

  store(embedding: number[], answer: string, sourceTags: string[]): void {
    this.entries.push({ embedding, answer, sourceTags, createdAt: Date.now() });
  }
  lookup(queryEmbedding: number[]): string | null {
    const now = Date.now();
    let best: { answer: string; sim: number } | null = null;
    for (const e of this.entries) {
      if (now - e.createdAt > this.ttlMs) continue;
      const sim = cosine(queryEmbedding, e.embedding);
      if (sim >= this.threshold && (!best || sim > best.sim)) best = { answer: e.answer, sim };
    }
    return best?.answer ?? null;
  }
  // A source changed → drop every entry that depended on it. Exact, not fuzzy.
  invalidateByTag(tag: string): number {
    const before = this.entries.length;
    this.entries = this.entries.filter((e) => !e.sourceTags.includes(tag));
    return before - this.entries.length;
  }
  // Model or prompt version bump → invalidate everything built with the old one.
  invalidateByPrefix(tagPrefix: string): void {
    this.entries = this.entries.filter((e) => !e.sourceTags.some((t) => t.startsWith(tagPrefix)));
  }
}
```

Rules that keep a semantic cache correct:

1. **Always set a TTL floor** even with tagging — it bounds staleness from sources you forgot to tag.
2. **Tag with model + prompt version** so a model upgrade or prompt change auto-invalidates (you don't want cached answers from the old prompt after you promote a new one — the Q1/Q3 connection).
3. **Tie into the RAG delete/freshness path** (RAG file, Q13): when a source doc is deleted or updated, invalidate cache entries tagged with it — the cache is a derived artifact that must be purged alongside the index.
4. **Prefer under-caching to over-caching** for anything that can go stale. A wrong-but-cached answer erodes trust faster than a slightly slower fresh one.

**Production war story:** a support bot semantically cached policy answers with a 24h TTL and no source tagging. Legal updated the refund policy; for the next 24 hours the bot cheerfully served the *old* policy to customers from cache — a compliance incident. The fix: tag every cached answer with the policy doc version and purge on edit, keeping the TTL only as a backstop. **A semantic cache is a copy of your knowledge; it must be invalidated on the same events that update the knowledge.**

---

### Q6. Design a fallback chain: primary model down → cheaper model → cached → graceful degradation. Show the full TypeScript.

**Answer:**

Production LLM calls fail: provider outages, rate limits, timeouts, 5xx. A **fallback chain** degrades gracefully through progressively cheaper/available options instead of throwing an error at the user. The ordering principle: **try for the best answer, fall back toward *any* answer, and only fail if every tier fails.**

```
FALLBACK CHAIN
------------------------------------------------------------
1. Primary (best: claude-opus-4-8)
      │ fail (5xx / timeout / rate-limit after retries)
      ▼
2. Secondary (cheaper/faster: claude-sonnet-5, maybe other provider)
      │ fail
      ▼
3. Cached / semantic-cache answer (stale but real)
      │ miss
      ▼
4. Graceful degradation (a safe canned response / "try again shortly",
   route to human, or a reduced-capability path) — NEVER a raw 500
```

```typescript
interface LlmProvider {
  name: string;
  call(prompt: string, signal: AbortSignal): Promise<string>;
}

interface FallbackDeps {
  tiers: LlmProvider[];                 // ordered best → cheapest
  cacheLookup: (prompt: string) => Promise<string | null>;
  gracefulResponse: (prompt: string) => string;   // safe last resort
  perTierTimeoutMs: number;
  onEvent: (e: { tier: string; outcome: "ok" | "fail" | "timeout"; ms: number; err?: string }) => void;
}

async function withTimeout<T>(p: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try { return await p(ctrl.signal); }
  finally { clearTimeout(timer); }
}

async function callWithFallback(prompt: string, deps: FallbackDeps): Promise<{ answer: string; servedBy: string }> {
  // Tier 1..N: try each model in order.
  for (const provider of deps.tiers) {
    const t0 = Date.now();
    try {
      const answer = await withTimeout((signal) => provider.call(prompt, signal), deps.perTierTimeoutMs);
      deps.onEvent({ tier: provider.name, outcome: "ok", ms: Date.now() - t0 });
      return { answer, servedBy: provider.name };
    } catch (err) {
      const outcome = (err as Error).name === "AbortError" ? "timeout" : "fail";
      deps.onEvent({ tier: provider.name, outcome, ms: Date.now() - t0, err: (err as Error).message });
      // continue to next tier
    }
  }
  // Tier N+1: cache (stale but real beats nothing).
  try {
    const cached = await deps.cacheLookup(prompt);
    if (cached) { deps.onEvent({ tier: "cache", outcome: "ok", ms: 0 }); return { answer: cached, servedBy: "cache" }; }
  } catch { /* cache errors are non-fatal */ }
  // Final tier: graceful degradation — never throw a raw error at the user.
  deps.onEvent({ tier: "graceful", outcome: "ok", ms: 0 });
  return { answer: deps.gracefulResponse(prompt), servedBy: "graceful" };
}
```

Design rules embedded above:

1. **Per-tier timeout** so a hung primary doesn't consume the whole latency budget before you fall back. A 30s hang on the primary is worse than a fast fall-through.
2. **Distinguish retryable from terminal errors** — retry the *same* tier on 429/5xx with backoff (Q7) *before* falling to the next tier; fall through immediately on 4xx that won't succeed on retry.
3. **Different provider in the chain** guards against a whole-provider outage — if tier 1 and 2 are the same provider, a provider-wide outage takes out both. Cross-provider fallback is real resilience.
4. **Cache tier before graceful** — a slightly stale real answer beats a canned one.
5. **Never surface a raw 500.** The graceful tier always returns *something* usable, and you emit telemetry (`onEvent`) so you know how often you're degrading.

**Interview trap:** treating fallback as just retry. Retrying the same model on the same outage just wastes time. True resilience is *tiered*: retry within a tier for transient blips, then cross to a *different* model/provider, then cache, then degrade. **Production war story:** a team's only fallback was "retry primary 3x." When the provider had a 20-minute regional outage, every request retried 3x and then 500'd — users saw errors for 20 minutes and the retries *amplified* load. Adding a cross-provider secondary + cache tier turned that outage into a barely-noticed quality dip.

---

### Q7. How do you manage rate limits and quotas across multiple providers? Show retry/backoff and quota tracking.

**Answer:**

Every provider imposes **rate limits** (requests/min, tokens/min) and returns 429s when you exceed them. Naive retrying makes it worse (retry storms). You need: exponential backoff with jitter, respect for `Retry-After`, client-side quota tracking to *avoid* hitting limits, and load distribution across providers/keys.

```
Layered approach
------------------------------------------------------------
1. Client-side token-bucket limiter → shape requests BELOW the limit
2. Respect Retry-After header on 429 → don't hammer
3. Exponential backoff + JITTER on retryable errors → avoid retry storms
4. Spread load across providers/keys → more aggregate headroom
5. Track usage per provider → route away from a near-limit provider
```

```typescript
// Token-bucket limiter: shape outgoing requests to stay under the provider's RPM.
class TokenBucket {
  private tokens: number;
  private lastRefill = Date.now();
  constructor(private capacity: number, private refillPerSec: number) { this.tokens = capacity; }
  private refill() {
    const now = Date.now();
    this.tokens = Math.min(this.capacity, this.tokens + ((now - this.lastRefill) / 1000) * this.refillPerSec);
    this.lastRefill = now;
  }
  tryTake(n = 1): boolean { this.refill(); if (this.tokens >= n) { this.tokens -= n; return true; } return false; }
}

interface RetryableError extends Error { status?: number; retryAfterMs?: number; }
const isRetryable = (e: RetryableError) => e.status === 429 || (e.status ?? 0) >= 500;

async function withBackoff<T>(
  fn: () => Promise<T>,
  opts = { maxRetries: 5, baseMs: 500, maxMs: 20_000 },
): Promise<T> {
  let attempt = 0;
  for (;;) {
    try { return await fn(); }
    catch (err) {
      const e = err as RetryableError;
      if (!isRetryable(e) || attempt >= opts.maxRetries) throw e;
      // Respect server's Retry-After; otherwise exponential backoff with full jitter.
      const backoff = Math.min(opts.maxMs, opts.baseMs * 2 ** attempt);
      const jittered = e.retryAfterMs ?? Math.random() * backoff;   // full jitter prevents synchronized retries
      await new Promise((r) => setTimeout(r, jittered));
      attempt++;
    }
  }
}

// Route to the provider with the most headroom; skip ones that are throttling.
interface ProviderState { name: string; bucket: TokenBucket; healthy: boolean; }
function pickProvider(providers: ProviderState[]): ProviderState | null {
  return providers.find((p) => p.healthy && p.bucket.tryTake()) ?? null;
}
```

Cross-provider specifics:

1. **Full jitter** (`Math.random() * backoff`), not fixed backoff — synchronized clients retrying at the same interval create thundering-herd re-collisions. Jitter spreads them.
2. **Respect `Retry-After`.** If the provider tells you when to come back, obey it — retrying earlier just extends the throttle.
3. **Client-side limiter as prevention.** Getting 429s and backing off is reactive and wastes latency; a token bucket keeps you *under* the limit so you rarely hit it.
4. **Provider health tracking + routing.** If provider A is throttling, route new requests to B while A recovers (this is also the cross-provider fallback of Q6).
5. **Separate token vs request limits.** Providers cap both requests/min *and* tokens/min. A few huge requests can blow the token limit while you're nowhere near the request limit — track both.

**Interview trap:** unbounded or un-jittered retries. Fixed-interval retries across many clients during an outage create a synchronized retry storm that keeps the provider saturated — you become the reason it can't recover. Backoff + jitter + a retry cap is mandatory.

---

### Q8. How do you monitor LLM cost in production and alert before a bill surprise?

**Answer:**

LLM cost is *usage-metered and unbounded* — a bug, a prompt bloat, an abusive user, or a traffic spike can 10x the bill overnight. You need per-call cost accounting, real-time aggregation, and **threshold + anomaly alerts** *before* month-end.

```
What to track per call
------------------------------------------------------------
input_tokens, output_tokens, cached_tokens
model, prompt_id + version, tenant_id, feature, user_id
cost_usd (computed from tokens × model rate)
timestamp, latency, cache_hit
```

```typescript
// Per-model pricing table (illustrative $/1M tokens — always confirm current rates).
const PRICING: Record<string, { inPerM: number; outPerM: number; cachedInPerM: number }> = {
  "claude-opus-4-8":   { inPerM: 15,   outPerM: 75,  cachedInPerM: 1.5 },
  "claude-sonnet-5":   { inPerM: 3,    outPerM: 15,  cachedInPerM: 0.3 },
  "claude-haiku-4-5":  { inPerM: 0.8,  outPerM: 4,   cachedInPerM: 0.08 },
};

interface Usage { model: string; inputTokens: number; outputTokens: number; cachedTokens: number; }

function costOf(u: Usage): number {
  const p = PRICING[u.model];
  if (!p) throw new Error(`no pricing for ${u.model}`);
  const freshInput = Math.max(0, u.inputTokens - u.cachedTokens);
  return (freshInput * p.inPerM + u.cachedTokens * p.cachedInPerM + u.outputTokens * p.outPerM) / 1_000_000;
}

// Rolling cost aggregator with rate + anomaly alerting.
class CostMonitor {
  private windowCost = 0;
  private windowStart = Date.now();
  private baselineHourly = 0;   // learned normal spend/hour
  constructor(private hourlyBudget: number, private alert: (msg: string) => void, private windowMs = 3_600_000) {}

  record(u: Usage, tenant: string): void {
    const cost = costOf(u);
    this.windowCost += cost;
    const elapsed = Date.now() - this.windowStart;
    if (elapsed >= this.windowMs) {
      const hourly = this.windowCost * (3_600_000 / elapsed);
      // Threshold alert: over budget.
      if (hourly > this.hourlyBudget) this.alert(`Hourly spend $${hourly.toFixed(2)} exceeds budget $${this.hourlyBudget}`);
      // Anomaly alert: sudden spike vs learned baseline.
      if (this.baselineHourly > 0 && hourly > this.baselineHourly * 3) this.alert(`Spend spike: $${hourly.toFixed(2)}/hr is 3x baseline $${this.baselineHourly.toFixed(2)}`);
      // EWMA baseline update.
      this.baselineHourly = this.baselineHourly === 0 ? hourly : 0.8 * this.baselineHourly + 0.2 * hourly;
      this.windowCost = 0; this.windowStart = Date.now();
    }
  }
}
```

Alerting layers:

```
Alert type          Fires on                          Why
------------------  --------------------------------  ---------------------------
Hard threshold      spend/hr or /day over budget      catch runaway before month-end
Anomaly (vs base)   spend 3x normal for the window    catch bugs/abuse fast
Per-tenant spike    one tenant dominating cost        catch a single bad actor (Q12)
Cost-per-call drift avg tokens/call climbing          prompt bloat, context creep
Cache-hit drop      hit-rate falling                  cache broke → cost silently rises
```

**Interview trap:** monitoring only the total monthly bill. By the time the monthly number looks wrong, you've already spent it. You need *rate-based* alerts (spend/hour) and *anomaly* detection so a runaway is caught in minutes, plus **attribution** (per tenant/feature/prompt) so you can find and stop the cause. **Production war story:** a code change accidentally disabled prompt caching on a high-volume endpoint. Correctness was unaffected, so no alert fired — but cost quietly quadrupled. It was caught only at month-end billing, a five-figure surprise. A cost-per-call / cache-hit-rate alert would have flagged it within the hour.

---

### Q9. Define latency SLOs for LLM features, including streaming. Why is p99 special and what do you measure?

**Answer:**

LLM latency has a shape unlike normal APIs, and streaming changes *which* number matters. You must define SLOs on the metrics users actually feel.

```
Latency metrics that matter for LLMs
------------------------------------------------------------
TTFT   Time To First Token   — how long until the user sees SOMETHING
                                (the perceived responsiveness for streaming)
TPOT   Time Per Output Token — inter-token latency (streaming smoothness)
E2E    End-to-End            — total time to full response
                                (matters for non-streamed / downstream-parsed calls)
```

For a **streaming** UX, **TTFT is the dominant SLO** — users tolerate a long total generation if tokens start flowing quickly. For a **non-streaming** call whose output is parsed by code (e.g., extraction feeding a pipeline), **E2E is what matters** — there's no "first token" benefit.

```
Example SLOs
------------------------------------------------------------
Streaming chat:    p50 TTFT < 500ms,  p95 TTFT < 1.2s,  p99 TTFT < 2.5s
                   TPOT p95 < 80ms/token (smooth stream)
Extraction (sync): p95 E2E < 3s,      p99 E2E < 6s
```

**Why p99 is special:** LLM latency is **heavy-tailed** — the mean and even p95 look fine while p99 is catastrophic (a long generation, a retry after a 429, a cold cache, a slow region). If 1% of requests take 15s, that's *every hundredth user*, and for a high-traffic feature that's thousands of angry users/day. Averages hide this completely.

```typescript
// Streaming instrumentation: capture TTFT and TPOT, not just total time.
interface StreamMetrics { ttftMs: number; tpotMsAvg: number; e2eMs: number; tokens: number; }

async function measuredStream(
  start: () => AsyncIterable<{ token: string }>,
): Promise<StreamMetrics> {
  const t0 = Date.now();
  let firstTokenAt = 0, tokens = 0;
  for await (const _ of start()) {
    if (firstTokenAt === 0) firstTokenAt = Date.now();   // TTFT captured on first token
    tokens++;
  }
  const e2e = Date.now() - t0;
  const ttft = firstTokenAt - t0;
  const tpot = tokens > 1 ? (e2e - ttft) / (tokens - 1) : 0;
  return { ttftMs: ttft, tpotMsAvg: tpot, e2eMs: e2e, tokens };
}

// Track percentiles with a reservoir/histogram — never alert on averages.
class LatencyTracker {
  private samples: number[] = [];
  record(ms: number) { this.samples.push(ms); if (this.samples.length > 10000) this.samples.shift(); }
  pct(p: number): number {
    const s = [...this.samples].sort((a, b) => a - b);
    return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0;
  }
  breachesSlo(p: number, thresholdMs: number): boolean { return this.pct(p) > thresholdMs; }
}
```

What drives the tail, and the levers:

```
Tail cause                Lever
------------------------  ------------------------------------
Long outputs              cap max_tokens; stream; stop sequences
Retries after 429         better rate-limit management (Q7)
Large input context       prompt caching; trim retrieved context
Cold routes / regions     warm pools; multi-region (Q11)
Slow model for the task   route simple → haiku (faster TTFT)
```

**Interview trap:** reporting average latency, or measuring only E2E for a streaming feature. If your product streams, an SLO on E2E is measuring the wrong thing — a 6s total feels fast if TTFT is 400ms. And an average of 1.2s can hide a p99 of 12s that's driving churn. **Always SLO on percentiles (p95/p99) of the user-perceived metric (TTFT for streaming).**

---

### Q10. How do you load-test an LLM endpoint? What's different from load-testing a normal API?

**Answer:**

LLM load testing differs because **cost is real per request** (you pay for every load-test token), latency is **token-length-dependent** (not constant per request), the bottleneck is often a **provider rate limit** rather than your CPU, and **streaming** means you measure TTFT under load, not just throughput.

```
What's different from normal API load testing
------------------------------------------------------------
- Every request costs money → budget the load test; use cheap models/short outputs
  where you can, but test realistic sizes for latency truth.
- Latency depends on input+output token counts → use REALISTIC prompt/response
  sizes, not tiny synthetic ones (they under-report latency).
- The wall is usually the provider rate limit (RPM/TPM), not your servers →
  you're testing YOUR queueing/backoff/fallback under throttle, as much as raw speed.
- Streaming → measure TTFT and TPOT under concurrency, not just completions/sec.
- Test the DEGRADED paths → force 429s/timeouts and verify fallback (Q6) + backoff (Q7).
```

```typescript
interface LoadTestConfig { concurrency: number; durationMs: number; prompts: string[]; }
interface LoadResult { total: number; ok: number; failed: number; ttftP95: number; e2eP95: number; estCostUsd: number; throughputRps: number; }

async function loadTest(
  cfg: LoadTestConfig,
  call: (prompt: string) => Promise<{ ttftMs: number; e2eMs: number; usage: Usage }>,
): Promise<LoadResult> {
  const ttfts: number[] = [], e2es: number[] = [];
  let ok = 0, failed = 0, cost = 0, total = 0;
  const deadline = Date.now() + cfg.durationMs;

  // N concurrent workers hammering realistic prompts until the deadline.
  const worker = async () => {
    while (Date.now() < deadline) {
      const prompt = cfg.prompts[Math.floor(Math.random() * cfg.prompts.length)];
      total++;
      try {
        const r = await call(prompt);
        ttfts.push(r.ttftMs); e2es.push(r.e2eMs); cost += costOf(r.usage); ok++;
      } catch { failed++; }
    }
  };
  const t0 = Date.now();
  await Promise.all(Array.from({ length: cfg.concurrency }, worker));
  const elapsedSec = (Date.now() - t0) / 1000;

  const p95 = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(0.95 * s.length)] : 0; };
  return { total, ok, failed, ttftP95: p95(ttfts), e2eP95: p95(e2es), estCostUsd: cost, throughputRps: ok / elapsedSec };
}
```

A sound load-test plan:

```
1. Ramp concurrency (5 → 50 → 200 …) and watch where p95 TTFT breaks the SLO.
2. Find the rate-limit ceiling — the concurrency at which 429s appear.
   That, not CPU, is usually your real capacity limit.
3. Verify graceful degradation: at over-limit load, do you fall back (Q6) and
   backoff (Q7) cleanly, or do requests pile up and time out?
4. Use realistic token sizes — short synthetic prompts lie about latency and cost.
5. Budget the test cost up front (concurrency × duration × cost/call).
```

**Interview trap:** load-testing with trivial 5-token prompts and reporting "we sustain 500 rps." Real prompts are 100x larger; latency and the token-per-minute limit will bind long before that number, and your test proved nothing about production. **Test at production-realistic token sizes, and treat the provider rate limit — not your server CPU — as the capacity you're actually measuring.**

---

### Q11. How do you design multi-region and provider-outage failover for an LLM service?

**Answer:**

LLM providers have regional endpoints and occasional full outages. Resilience means your service survives (a) a region going slow/down and (b) an entire provider going down — without a manual 2am scramble.

```
LEVELS OF RESILIENCE (cheapest → strongest)
------------------------------------------------------------
1. Retry + backoff (Q7)          → transient blips
2. Multi-region same provider    → one region degraded
3. Cross-provider fallback (Q6)  → whole provider outage
4. Cached / degraded responses   → everything unavailable
```

```
        request
           │
           ▼
   ┌───────────────┐   health-aware routing
   │  ROUTER       │──► region A (primary)   ─┐
   │ (health +     │──► region B (secondary) ─┤ same provider, failover
   │  latency      │──► provider 2            ─┘ different provider
   │  aware)       │──► cache / degraded
   └───────────────┘
```

```typescript
interface Endpoint { id: string; provider: string; region: string; call: (p: string, s: AbortSignal) => Promise<string>; }
interface Health { healthy: boolean; recentErrors: number; ewmaLatencyMs: number; }

class FailoverRouter {
  private health = new Map<string, Health>();
  constructor(private endpoints: Endpoint[]) {
    endpoints.forEach((e) => this.health.set(e.id, { healthy: true, recentErrors: 0, ewmaLatencyMs: 0 }));
  }

  // Prefer healthy endpoints, ordered by observed latency; keep the ordering diverse across providers.
  private ordered(): Endpoint[] {
    return [...this.endpoints]
      .filter((e) => this.health.get(e.id)!.healthy)
      .sort((a, b) => this.health.get(a.id)!.ewmaLatencyMs - this.health.get(b.id)!.ewmaLatencyMs);
  }

  private markResult(id: string, ok: boolean, ms: number) {
    const h = this.health.get(id)!;
    h.ewmaLatencyMs = h.ewmaLatencyMs === 0 ? ms : 0.7 * h.ewmaLatencyMs + 0.3 * ms;
    if (ok) { h.recentErrors = Math.max(0, h.recentErrors - 1); }
    else {
      h.recentErrors++;
      if (h.recentErrors >= 5) { h.healthy = false; setTimeout(() => { h.healthy = true; h.recentErrors = 0; }, 30_000); } // circuit-break, auto-reopen
    }
  }

  async route(prompt: string, cacheLookup: (p: string) => Promise<string | null>, degraded: (p: string) => string): Promise<{ answer: string; via: string }> {
    for (const ep of this.ordered()) {
      const t0 = Date.now();
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      try {
        const answer = await ep.call(prompt, ctrl.signal);
        this.markResult(ep.id, true, Date.now() - t0);
        return { answer, via: ep.id };
      } catch {
        this.markResult(ep.id, false, Date.now() - t0);
      } finally { clearTimeout(timer); }
    }
    const cached = await cacheLookup(prompt);
    if (cached) return { answer: cached, via: "cache" };
    return { answer: degraded(prompt), via: "degraded" };
  }
}
```

Design principles:

1. **Circuit breaker per endpoint** — after N consecutive failures, mark it unhealthy and *stop* routing to it (auto-reopen after a cooldown). Prevents wasting every request's latency budget on a known-dead region.
2. **Health- and latency-aware routing** — prefer the fastest healthy endpoint; automatically shed a degraded region.
3. **Cross-provider diversity** — a same-provider multi-region setup does not survive a provider-wide outage or a shared quota exhaustion. For true resilience, at least one fallback tier is a *different* provider (this requires provider-agnostic prompts — a reason the whole knowledge base keeps patterns provider-agnostic).
4. **Prompt/behavior parity across providers** — if you fail over to a different model, validate that your prompts produce acceptable output there *before* the outage, or failover trades an outage for a quality incident.

**Interview trap:** "we're multi-region so we're resilient" — multi-region within one provider does nothing for a provider-wide outage or a global rate-limit/quota event, which are common failure modes. Cross-provider fallback is what covers those. **Production war story:** a service ran two regions of a single provider and considered itself HA. The provider had a global control-plane incident; both regions failed simultaneously and the service was down for the full incident. Adding a second provider as tier-2 (Q6) plus a cache tier turned the *next* such outage into a degraded-but-up experience.

---

### Q12. How do you enforce per-tenant token budgets so one customer can't consume everything (cost or capacity)?

**Answer:**

In a multi-tenant LLM product, one tenant — via legitimate heavy use, a bug, or abuse — can exhaust your provider quota (starving everyone) or run up an unbounded bill. You need **per-tenant budget enforcement**: track each tenant's token/cost usage against a limit and throttle or reject when exceeded, *before* the call.

```
Enforcement dimensions
------------------------------------------------------------
Rate limit   : tokens or requests per minute per tenant (capacity fairness)
Spend budget : $ per day/month per tenant (cost control)
Quota reset  : rolling window vs calendar period
Overage      : hard block, soft-warn, or degrade to a cheaper model
```

```typescript
interface TenantBudget {
  tenantId: string;
  dailyTokenLimit: number;
  monthlySpendLimitUsd: number;
  rpmLimit: number;
}
interface TenantUsage { tokensToday: number; spendMonth: number; dayStart: number; monthStart: number; }

class TenantBudgetEnforcer {
  private usage = new Map<string, TenantUsage>();
  private buckets = new Map<string, TokenBucket>();
  constructor(private budgets: Map<string, TenantBudget>) {}

  private getUsage(id: string): TenantUsage {
    const now = Date.now();
    let u = this.usage.get(id);
    if (!u) { u = { tokensToday: 0, spendMonth: 0, dayStart: now, monthStart: now }; this.usage.set(id, u); }
    if (now - u.dayStart > 86_400_000) { u.tokensToday = 0; u.dayStart = now; }        // daily reset
    if (now - u.monthStart > 30 * 86_400_000) { u.spendMonth = 0; u.monthStart = now; } // monthly reset
    return u;
  }

  // Called BEFORE the LLM request. Decides allow / throttle / block / degrade.
  checkAdmission(tenantId: string, estTokens: number): { allow: boolean; degradeToCheaper: boolean; reason?: string } {
    const budget = this.budgets.get(tenantId);
    if (!budget) return { allow: true, degradeToCheaper: false };
    const u = this.getUsage(tenantId);

    // Rate limit (capacity fairness).
    let bucket = this.buckets.get(tenantId);
    if (!bucket) { bucket = new TokenBucket(budget.rpmLimit, budget.rpmLimit / 60); this.buckets.set(tenantId, bucket); }
    if (!bucket.tryTake()) return { allow: false, degradeToCheaper: false, reason: "tenant rate limit exceeded" };

    // Hard spend cap.
    if (u.spendMonth >= budget.monthlySpendLimitUsd) return { allow: false, degradeToCheaper: false, reason: "monthly spend budget exhausted" };

    // Daily token soft cap → degrade to a cheaper model instead of blocking.
    if (u.tokensToday + estTokens > budget.dailyTokenLimit) return { allow: true, degradeToCheaper: true, reason: "daily token soft cap — routing to cheaper model" };

    return { allow: true, degradeToCheaper: false };
  }

  // Called AFTER the request with actuals.
  recordUsage(tenantId: string, u: Usage): void {
    const usage = this.getUsage(tenantId);
    usage.tokensToday += u.inputTokens + u.outputTokens;
    usage.spendMonth += costOf(u);
  }
}
```

Design decisions:

1. **Admission control before the call** — check the budget *first* so an over-budget tenant never triggers the provider spend. Recording after gives you actuals.
2. **Tiered overage handling**, not just hard-block: a soft cap can **degrade to a cheaper model** (`claude-haiku-4-5`) so the tenant keeps working at lower cost/quality rather than getting errors — often better UX and still protects you.
3. **Separate capacity fairness (rate) from cost (spend).** A tenant can be under their spend budget but still hog the shared provider RPM/TPM and starve others — the token bucket handles that independently.
4. **Distributed state** — in a multi-instance service, per-tenant counters must be shared (Redis) so limits are enforced globally, not per-process. The in-memory version above is illustrative; production keeps counters in a shared store with atomic increments.
5. **Estimate tokens pre-call** for admission, reconcile with actuals post-call — you can't know exact output length in advance, so estimate conservatively and correct.

**Interview trap:** enforcing only a monthly spend cap. That doesn't stop a tenant from exhausting your *provider rate limit* in a burst and taking down every other tenant *right now* — a capacity/availability problem, not a cost one. You need both a rate limiter (fairness) and a spend budget (cost). **Production war story:** a single tenant's misconfigured batch job fired thousands of requests/minute, consuming the shared provider TPM quota; every other customer got 429s and the product looked "down" globally. There was a monthly spend cap but no per-tenant rate limit. Adding per-tenant token buckets isolated the blast radius — the noisy tenant throttled itself while everyone else stayed healthy.

---

### Q13. Put it together: sketch the full request path for a production LLM feature with all the reliability layers.

**Answer:**

Combining Q1-Q12 into one request lifecycle — this is the reference architecture an FDE should be able to draw on a whiteboard:

```
INBOUND REQUEST
   │
   ▼
[1] AuthN/Z + tenant resolution
   │
   ▼
[2] Per-tenant admission control (Q12)  ── over budget? → block / degrade-to-cheaper
   │
   ▼
[3] Semantic cache lookup (Q4/Q5)       ── hit? → return cached (near-instant, ~free)
   │  miss
   ▼
[4] Prompt registry: pick version (Q1)  ── canary/shadow bucketing (Q2)
   │
   ▼
[5] Rate-limit shaping (Q7) + provider selection (Q11)
   │
   ▼
[6] LLM call with per-tier timeout
   │  fail → backoff+retry (Q7) → fallback chain: cheaper model → other provider → cache → degrade (Q6)
   ▼
[7] Response: stream to user (measure TTFT/TPOT, Q9)
   │
   ▼
[8] Post-call: record usage → cost monitor (Q8) + tenant budget (Q12) + cache store (Q4)
   │
   ▼
[9] Telemetry: latency percentiles, cost, cache-hit, fallback-tier, prompt version
       → dashboards + alerts (Q8/Q9), and CI eval gates (Q3) on every prompt change
```

```typescript
async function handleLlmRequest(
  req: { tenantId: string; userKey: string; prompt: string; estTokens: number },
  deps: {
    enforcer: TenantBudgetEnforcer;
    cache: SemanticCache;
    embed: (t: string) => Promise<number[]>;
    registry: PromptRegistry;
    router: FailoverRouter;
    monitor: CostMonitor;
    cacheLookup: (p: string) => Promise<string | null>;
    degraded: (p: string) => string;
  },
): Promise<{ answer: string; servedBy: string; cached: boolean }> {
  // [2] Admission.
  const admit = deps.enforcer.checkAdmission(req.tenantId, req.estTokens);
  if (!admit.allow) return { answer: deps.degraded(req.prompt), servedBy: "blocked", cached: false };

  // [3] Semantic cache.
  const qEmb = await deps.embed(req.prompt);
  const hit = deps.cache.lookup(qEmb);
  if (hit) return { answer: hit, servedBy: "cache", cached: true };

  // [4]-[6] Pick prompt version, route with failover + fallback.
  const version = deps.registry.getProduction("main")!;   // + canary bucketing (Q2) elided
  const composed = `${version.content}\n\n${req.prompt}`;
  const { answer, via } = await deps.router.route(composed, deps.cacheLookup, deps.degraded);

  // [8] Record usage (illustrative token accounting) and store to cache if cacheable.
  const usage: Usage = { model: version.model, inputTokens: req.estTokens, outputTokens: 200, cachedTokens: 0 };
  deps.monitor.record(usage, req.tenantId);
  deps.enforcer.recordUsage(req.tenantId, usage);
  if (via !== "degraded" && via !== "cache") deps.cache.store(qEmb, answer);

  return { answer, servedBy: via, cached: false };
}
```

The layered principle: **every layer either makes the common case cheaper/faster (cache, routing) or makes the failure case survivable (fallback, budgets, circuit breakers)** — and every layer emits telemetry so you can see what's happening. A feature missing any one of these has a predictable production incident waiting: no cache → cost surprise; no fallback → outage; no tenant budget → noisy-neighbor starvation; no eval gate → silent quality regression; no percentile SLO → invisible tail latency.

---

### Q14. What are the LLMOps anti-patterns you watch for in a code/architecture review?

**Answer:**

The failure modes that show up repeatedly, and the fix for each:

```
Anti-pattern                              Fix
----------------------------------------  ------------------------------------------
Prompt edited in place in prod            prompt registry + versioning (Q1)
No eval gate on prompt/model changes      golden-set regression gate in CI (Q3)
Single provider, single region            cross-provider fallback + circuit breaker (Q6/Q11)
Retry = "try primary again 3x"            tiered fallback + backoff w/ jitter (Q6/Q7)
Averages for latency SLOs                 p95/p99 on TTFT for streaming (Q9)
Total-bill-only cost view                 rate + anomaly + per-tenant alerts (Q8)
No per-tenant limits                      admission control: rate + spend (Q12)
Caching personalized answers              only cache pure-function-of-query answers (Q4)
Cache never invalidated                   TTL + source-version tagging (Q5)
No shadow before canary                   shadow → canary → full, metric-gated (Q2)
max_tokens unbounded                      cap output; it drives tail latency + cost
Prompt caching left off high-volume path  verify cache usage; alert on hit-rate drop (Q8)
Load test with tiny prompts               realistic token sizes; test degraded paths (Q10)
No cost/latency in the eval gate          gate cost + p95, not just correctness (Q3)
```

The unifying diagnosis: **treating an LLM call like a deterministic, free, always-available function.** It is none of those — it's a *metered, probabilistic, sometimes-unavailable* dependency. Every anti-pattern above is a place where someone assumed determinism (no eval gate), assumed it's free (no cost control), or assumed it's always up (no fallback). The senior FDE review reflex is to ask, for any LLM feature: *what happens when this call is slow, when it's wrong, when it's rate-limited, when the provider is down, when one tenant abuses it, and when someone changes the prompt?* — and to confirm there's a designed answer for each.

**Interview trap:** presenting a clean happy-path LLM architecture with no degradation story. The interviewer is listening for whether you've internalized that production LLM systems spend real effort on the *unhappy* paths — cost, latency tails, outages, regressions, and multi-tenancy — because that's where the 2am pages come from, and where the difference between a demo and a product actually lives.
