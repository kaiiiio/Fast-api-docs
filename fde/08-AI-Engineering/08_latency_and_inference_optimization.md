# Latency & Inference Optimization — Senior/Staff FDE Prep

> Level: Senior/Staff | Module: AI Engineering | Context: Every second of latency costs you deflection rate, customer satisfaction, and SLA compliance. This is where you measure and cut.

An FDE's job is not just "make it work" — it's "make it work *fast enough for the customer's use case*." A support bot that takes 5 seconds per turn will never deflect tickets (users abandon). An invoice processor that takes 30 seconds per doc can batch overnight but will look "slow" in a demo. This file maps the latency landscape and the levers you actually have.

---

## The Latency Hierarchy

```
                                        LATENCY BUDGET
┌────────────────────────────────────────────────────────────────────┐
│                                                                     │
│ User sees result after:                                            │
│                                                                     │
│  BROWSER        NETWORK         LLM API          PARSING       DB  │
│  ┌────┐         ┌────┐          ┌──────┐         ┌────┐       ┌─┐ │
│  │50ms│────────▶│200ms│────────▶│1800ms│────────▶│50ms│───────▶└─┘ │
│  └────┘ (DNS,   └────┘ (TLS,    └──────┘ (queue,  └────┘          │
│          TCP)           routing)  inference)                       │
│                                                                     │
│         TOTAL = ~2.1s (and this is optimistic)                     │
│                                                                     │
│  Where to cut? Find the tail (LLM inference), not the head.       │
└────────────────────────────────────────────────────────────────────┘
```

The LLM inference is usually the constraint. Network and parsing are secondary.

---

## Q1. "We need to be sub-1s latency for our real-time chatbot." Is that realistic with an LLM, and what's the architecture?

**Answer:**

Sub-1s is **not achievable for generation** (the model will output tokens one at a time). It *is* achievable for classification/routing.

**Three scenarios:**

### Scenario 1: Sub-1s classification/routing (possible)

```
User types "I want a refund"
    │
    ▼ (0ms: already here)
┌────────────────────────────┐
│ Haiku intent classifier    │  ← 150–300ms (model latency)
│ (system prompt only,       │     + 50ms network
│ no retrieval)              │
└────────────────────────────┘
    │
    ▼ (350ms total so far)
Decision tree or deterministic response
(500ms budget left)
    │
    ▼ (650ms total)
Render to user
```

**Achievable:** Haiku-only classification, no retrieval, deterministic response. SLA: <1s.

### Scenario 2: Sub-1s generation (NOT achievable)

Waiting for the model to generate tokens takes time. At 50–80 tokens/sec (typical LLM throughput), generating a 50-token response takes 600–1000ms *before* network latency. You're at the limit before the first token arrives at the user.

**What people do instead:** streaming. Render the first token in 300–500ms (while the model is still generating), then stream the rest. The user sees *incremental* results, and the UX feels faster.

### Scenario 3: Hybrid (practical)

```
User input
    │
    ▼ (Parallel)
┌──────────────────────┐    ┌─────────────────┐
│ Intent routing       │    │ Start retrieval │
│ (Haiku, 300ms)       │    │ (vector search, │
└──────────────┬───────┘    │  200ms)         │
               │            └────────┬────────┘
               ▼                     ▼
        Deterministic         Chunk candidates
        response ready at 300ms, retrieved at 200ms
               │
               └──────────┬──────────┘
                          ▼
                    Render simple answer (500ms)
                    OR launch LLM for complex (1.5s, async)
```

**Achievable:** 500ms for simple cases, async generation for complex. User sees immediate feedback.

**Interview trap:** "We want sub-1s, so use Haiku everywhere." Haiku can *respond* in 300ms but still returns text, not just a category. If you need coherent prose, you're doing generation, and you're not sub-1s. The refusal is honest: "Sub-1s generation isn't available; we can do sub-1s classification and stream async generation, or accept 2–3s for coherent responses."

---

## Q2. What's the difference between time-to-first-token (TTFT) and time-to-full-response, and why does each matter?

**Answer:**

**TTFT (time-to-first-token):** the time from when the user submits input to when the first token of the model's response appears. This is the *perceived* latency.

**TTFR (time-to-full-response):** when the entire response is complete. This is what the SLA probably measures.

The gap between them matters psychologically:
- TTFT < 500ms: feels instant, user doesn't perceive the wait.
- TTFT > 1s: user thinks something is broken, reflexively retries.
- TTFR can be 10s but if TTFT is 300ms, the user watches it stream and is satisfied.

**Why they're different:**

An LLM generates tokens sequentially. A 500-token response at 50 tokens/sec takes 10 seconds to generate fully. But the user sees the first token in 300ms (network + some initial compute). Streaming makes the experience feel snappy even though the full response takes 10s.

**Latency breakdown (500-token response):**

```
User submits input
    │
    ├─ 100ms: network (request to API)
    │
    ├─ 200ms: queue time at LLM service
    │
    ├─ 150ms: first token compute (model reads input, starts generating)
    │
    ▼ TTFT: 450ms (first token visible to user)
    │
    ├─ 10s: model generates remaining 499 tokens (streaming)
    │
    ▼ TTFR: 10.45s (full response received)
```

The gap (10s) is pure generation, unavoidable. But the user's experience is dominated by the first 450ms.

**Optimization by layer:**

| Component | Impact on TTFT | Impact on TTFR | How to optimize |
|---|---|---|---|
| Network latency (100ms) | ✓ | ✓ | Use API in same region, reduce hops |
| Queue time (200ms) | ✓ | ✓ | Batch requests, off-peak processing |
| First-token latency (150ms) | ✓ | ✗ | Prompt caching, shorter system prompt |
| Generation (streaming) | ✗ | ✓ | Fewer output tokens, faster model (Haiku) |

For user experience, TTFT dominates. For SLA compliance, TTFR matters.

**Streaming UX:**

A chatbot that streams tokens makes the user *feel* like they're having a conversation. Without streaming, a 10-second response feels dead. With streaming:

```
User: "What's our refund policy?"
Assistant: ▮  (0.5s, first token visible)
Assistant: Our▮  (1s)
Assistant: Our refund policy▮  (2s)
Assistant: Our refund policy allows▮  (3s)
Assistant: Our refund policy allows returns within 30 days...▮  (10s complete)
```

vs. without streaming:

```
User: "What's our refund policy?"
[loading for 10s]
Assistant: Our refund policy allows returns within 30 days...
```

The first feels like a human writing; the second feels like a machine waiting.

---

## Q3. Walk me through how to measure and optimize latency in a production system.

**Answer:**

**Step 1: Measure (you can't optimize what you don't measure).**

Instrument every layer:

```typescript
// latency-tracking.ts — measure each layer
import { performance } from 'perf_hooks';

async function traceLatency(label: string, fn: () => Promise<any>) {
  const start = performance.now();
  try {
    const result = await fn();
    const elapsed = performance.now() - start;
    console.log(`${label}: ${elapsed.toFixed(0)}ms`);
    return result;
  } catch (e) {
    console.error(`${label}: ERROR`, e);
    throw e;
  }
}

// In the handler:
await traceLatency("auth", () => verifyAuth());
await traceLatency("retrieval", () => vectorSearch(query));
await traceLatency("llm_inference", () => model.generate(prompt));
await traceLatency("parsing", () => parseResponse(response));
```

Emit these to your observability stack (Datadog, New Relic, etc.) and compute percentiles:

```
LLM inference latency:
  p50: 800ms
  p75: 1200ms
  p95: 2100ms
  p99: 3500ms
```

The p99 is what kills your SLA. If your SLA is "respond in 2s," you're violating it 1% of the time.

**Step 2: Identify the tail.**

The tail is usually one of:
1. **LLM inference latency** — the model is slow. Typical: 800ms–2s per request.
2. **Queue time** — traffic spike, waiting for available endpoints.
3. **Retrieval latency** — vector search takes longer than expected.
4. **Network hops** — calling a service in a different region.

Plot the latency distribution:

```
Distribution of latency (1M requests):
  0–500ms:   5% (probably cached)
  500–1000ms: 35% (normal inference)
  1000–1500ms: 40% (slightly slow)
  1500–2000ms: 15% (tail)
  >2000ms:    5% (very tail)
```

The 40% in the "1000–1500ms" bucket are your opportunity.

**Step 3: Optimize the biggest lever first.**

Ranking of impact (for a typical LLM-based system):

1. **Prompt caching** (if you're not doing it): 50% reduction in inference latency for cached requests.
2. **Model selection** (Haiku vs Sonnet): 2–3× latency difference.
3. **Retrieval optimization** (top-5 vs top-50 chunks): 200–400ms saved by not sending huge context.
4. **Batch size** (if batching): better throughput, but doesn't help individual latency.
5. **Prompt length** (fewer examples, shorter context): 100ms per 1K tokens reduction.
6. **Streaming** (UX improvement, not real latency reduction): user perceives as faster.
7. **Request queuing** (off-peak batching): only for non-real-time workloads.

**Step 4: A/B test before and after.**

Change one variable at a time. Measure p50, p95, p99:

```
BASELINE (current):
  p50: 800ms, p95: 2000ms, p99: 3000ms

WITH PROMPT CACHING:
  p50: 600ms, p95: 1400ms, p99: 2100ms  ← 33% reduction in p95
  
PLUS HAIKU INSTEAD OF SONNET (for simple cases):
  p50: 250ms, p95: 800ms, p99: 1200ms   ← another 40% reduction in p95
```

Roll out incrementally. Don't change three things at once.

**Step 5: Monitor the tail in production.**

Set an alert:

```
IF (p99_latency > 2.5s for 5 min) OR (p95_latency > 2s for 5 min)
  THEN page on-call
```

The tail is where you find surprises (model degradation, infrastructure hiccups, traffic spikes).

---

## Q4. Prompt caching: how does it work, and what are the gotchas?

**Answer:**

Prompt caching allows you to cache parts of a request (system prompt + static context) across multiple calls, paying a lower rate for the cached portion.

**How it works:**

```
First request:
┌────────────────────────────────────┐
│ System prompt + KB (10K tokens)     │ ← charged at normal rate
│ [CACHE_CONTROL_EPHEMERAL]          │
│ + Query (200 tokens)               │ ← charged at normal rate
└────────────────────────────────────┘
  Cache key = hash(system + KB)
  Cost: ~$0.03 (Sonnet)

Second request (within 5 min, same system+KB):
┌────────────────────────────────────┐
│ System prompt + KB (10K tokens)     │ ← charged at 90% discount
│ + Query (200 tokens)               │ ← charged at normal rate
└────────────────────────────────────┘
  Cache hit! 
  Cost: ~$0.003 (10.2K × $0.0003 cached + 200 × $0.003 fresh)
```

**The math at scale:**

10 requests in 5 minutes, same KB, Sonnet:

Without cache:
- 10 requests × (10.2K tokens × $0.003) = $0.306/batch

With cache:
- 1st request: 10.2K × $0.003 = $0.0306
- Requests 2–10: (10K × $0.0003 cached + 200 × $0.003 fresh) × 9 = $0.036
- Total: $0.0306 + $0.036 = **$0.0666/batch** → 4.6× cheaper

**Gotchas:**

1. **Cache invalidation is 5 minutes.** Your static content must not change within that window. If the KB updates every minute, caching doesn't help.

2. **Cache key is the hash of the content.** If system prompt varies (e.g., you adjust an instruction), the cache misses. Bake anything that's stable into the "cached" section, keep variable stuff out.

3. **Minimum cache entry size.** The cache control marker must cover at least 1K tokens. Smaller static content doesn't benefit.

4. **Architecture implications.** Your system prompt and KB must be *the same* across requests. If every user gets a different KB (per-tenant retrieval), cache doesn't help. If the KB is per-*query* (common RAG), cache misses.

**Real caching architecture:**

```
User1 query: "return policy?"
    └─ Retrieve KB for user1's tenant (1K tokens, user1-specific)
    └─ + System prompt (500 tokens, shared)
    └─ + Query (200 tokens)
    └─ Inference (CACHE MISS — KB is user1-specific)

User2 query: "return policy?"
    └─ Retrieve KB for user2's tenant (1K tokens, different from user1!)
    └─ + System prompt (500 tokens, shared)
    └─ + Query (200 tokens)
    └─ Inference (CACHE MISS — different KB)

PROBLEM: Cache never hits because the KB changes per tenant.
```

**Better architecture (for multi-tenant RAG):**

```
System prompt (CACHED):
    └─ "You are a support bot. Answer based on the following policy."
    └─ Generic policy (applies to all users)

Query-specific prompt (NOT cached):
    └─ User context (tenant-specific KB retrieved here)
    └─ User's actual query

RESULT: System prompt stays cached, only the variable part re-fetched.
```

Code:

```typescript
const systemPrompt = `You are a support bot. Answer based on the following policy.

<policy>
{generic_policy_content}
</policy>`;

// This goes into every request, cached:
const messages = [
  {
    role: "user",
    content: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" }
      }
    ]
  }
];

// This is variable, not cached:
const retrievedChunks = await vectorSearch(query, tenantId);
messages.push({
  role: "user",
  content: `Based on the policy above and this additional context for your tenant:\n${retrievedChunks}\n\nAnswer: ${query}`
});

await model.generate(messages);
```

**Interview tip:** "We added caching and cut latency by 50%." Sounds great, but probe: "What's your cache hit rate? Is the static content truly stable?" If hit rate is <50%, caching isn't the lever.

---

## Q5. Latency SLA vs. cost SLA: how do you negotiate the tradeoff?

**Answer:**

A customer asks for "<2s latency at 1M requests/month" and "$2K/month cost." These are in *direct conflict*.

**The math:**

At 1M/month requests:
- Haiku cascaded (smart routing): ~$1.5K/month, but p95 latency varies wildly (classified requests are 300ms, escalated are 2s+).
- Sonnet everywhere: ~$15K/month, but consistent <2s latency.
- Haiku everywhere: ~$1.5K/month, but <1s on easy queries, 3–5s failures on hard queries.

**There is no "$2K, <2s, 1M/month" option.** You pick two:

1. **Latency + Cost:** "We'll do Haiku-only, guaranteed <1s. Cost: $1.5K. But hard queries time out."
2. **Cost + Volume:** "We'll do Haiku cascaded, 1M/month, $3K. Latency: p95 is 1.5s, p99 is 3s."
3. **Latency + Volume:** "We'll do Sonnet, 1M/month, <2s. Cost: $15K."

**The FDE conversation:**

Customer: "Can we do $2K, <2s, 1M/month?"

FDE: "No. Here's the tradeoff space:"

```
$2K/mo, <2s latency, 1M requests/mo:
  Choose two of three.

Option 1: FAST + CHEAP
  • Haiku-only classification (yes/no/escalate)
  • Cost: $1.5K
  • Latency: 300ms (classified), escalate for complex
  • Trade-off: limited to simple queries

Option 2: CHEAP + VOLUME
  • Haiku → Sonnet cascade
  • Cost: $3K (10% escalation to Sonnet)
  • Volume: 1M/mo
  • Latency: p95 1.2s, p99 2.5s (hits your SLA 99% of the time)

Option 3: FAST + VOLUME
  • Sonnet for everything
  • Cost: $15K
  • Volume: 1M/mo
  • Latency: consistently <2s (p95 1.5s)
```

Most customers choose **Option 2**: accept p99 breaches for 1% of requests, or redesign the UX to show "complex query, escalating" at the 1.5s mark.

**How to make the tradeoff explicit in code:**

```typescript
// latency-budget.ts — allocate budget and fail gracefully

const LATENCY_BUDGET_MS = 2000;
const LATENCY_ALERT_MS = 1500;

async function queryWithBudget(query: string): Promise<string> {
  const start = Date.now();

  // Fast path: simple classification
  const classification = await traceLatency("classify", () =>
    haiku.classify(query)
  );
  const elapsed = Date.now() - start;

  if (classification.confidence > 0.85) {
    return classification.response; // done, ~400ms
  }

  // Slower path: full answer
  if (elapsed > LATENCY_ALERT_MS) {
    // We're at risk of hitting the budget; bail early
    return "Let me get you to the right team..."; // escalate
  }

  const answer = await traceLatency("generate", () =>
    sonnet.generate(query)
  );

  const totalElapsed = Date.now() - start;
  if (totalElapsed > LATENCY_BUDGET_MS) {
    logger.warn("latency_sla_breach", { elapsed: totalElapsed });
    // Still return the answer, but log the breach
  }

  return answer;
}
```

The key: be explicit about the boundary. Don't pretend you can do $2K + <2s + 1M. Tell the customer which one you're dropping.

---

## Q6. When should you stream responses, and what does it change?

**Answer:**

Streaming is a UX pattern, not a performance optimization. It doesn't change the *total* latency (the response still takes 10s), but it *feels* faster because users see progress.

**When to stream:**

1. **Chat/conversational AI:** user expects to see the bot "thinking" in real-time.
2. **Long responses:** >500 tokens, where the full response takes >10s. Streaming keeps the UI alive.
3. **Time-sensitive applications:** financial updates, stock tickers, live analytics.

**When NOT to stream:**

1. **Very fast responses:** <1s total. The lag is unnoticeable; streaming adds overhead.
2. **Structured data (JSON):** can't stream JSON incrementally without malformed output. Stream the whole thing.
3. **Server-side processing:** if you're batching or doing follow-up queries, streaming doesn't help.

**Latency impact:**

Streaming doesn't improve *absolute* latency but changes how users *perceive* it:

```
Without streaming:
  User submits → 10s of silence → response appears → done
  Perceived latency: 10s (feels long)

With streaming:
  User submits → 0.5s delay → first token appears → incremental text → 10s total
  Perceived latency: 0.5s (first response) + incremental rendering
  Feels much faster because feedback is immediate
```

**Code pattern:**

```typescript
// streaming.ts — stream tokens to the client

app.post("/chat", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const stream = await model.stream(prompt);

  for await (const token of stream) {
    res.write(`data: ${JSON.stringify({ token })}\n\n`);
  }

  res.write("data: [DONE]\n\n");
  res.end();
});

// Client-side:
const eventSource = new EventSource("/chat");
let accumulated = "";

eventSource.onmessage = (event) => {
  const { token } = JSON.parse(event.data);
  if (token === "[DONE]") {
    eventSource.close();
  } else {
    accumulated += token;
    document.getElementById("response").textContent = accumulated;
  }
};
```

**Interview insight:** "Streaming is not about speed, it's about UX. If your response takes 10s, streaming makes the user see progress. Without streaming, they think the system is hanging."

---

## Quick-Reference: Latency Optimization Checklist

| Optimization | Latency Gain | Difficulty | Cost Impact |
|---|---|---|---|
| Prompt caching | 30–50% (cached path) | Medium | -40% (cached tokens) |
| Switch to Haiku | 2–3× faster | Low | -75% (vs Sonnet) |
| Cascade routing | 50% average (Haiku dominates) | High | -80% (most Haiku) |
| Reduce retrieval size (top-5 vs top-50) | 200–400ms | Low | negligible |
| Streaming (UX only) | 0ms real, feels 5s faster | Low | none |
| Request batching | 0ms individual, improves throughput | Medium | -10% (batch rate discount) |
| Shorten system prompt | 50–100ms per 1K tokens | Low | negligible |
| Regional endpoints | 50–200ms | High | varies by region |

---

