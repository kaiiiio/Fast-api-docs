# Rate Limiters - Machine Coding Round

> **Interview prompt (as given):**
> "Design and implement a rate limiter library. It should expose a simple API like `allow(key)` that returns whether a request identified by `key` (user ID, API key, or IP) is permitted. Start with one algorithm, make it correct and testable, then extend to others if time permits. We will run your code against test cases that check limit enforcement, burst behavior, and window boundaries. Assume single process first; be prepared to discuss how you would make it work across multiple app servers."

**Requirements checklist (confirm these out loud before coding):**

1. `allow(key: string)` — per-key limiting, not global.
2. Deterministic and testable — time must be injectable (no hidden `Date.now()` calls you cannot control in tests).
3. Correct behavior at window boundaries (the interviewer will probe this).
4. Memory bounded per key — no unbounded growth.
5. O(1) or amortized O(1) per call where possible.
6. Result metadata (remaining quota, retry-after) is a strong bonus — real APIs return `X-RateLimit-*` headers.
7. Discussion-ready: distributed version (Redis + Lua), fail-open vs fail-closed.

---

## Approach & time budget

**Which algorithm first? Token bucket.** Reasons you should narrate:

- It is the one production systems actually use most (AWS API Gateway, Stripe, Envoy). Saying this signals real-world awareness.
- It handles bursts gracefully (a bucket of capacity N absorbs a burst of N, then throttles to the refill rate) — the behavior most APIs want.
- It is O(1) memory per key (two numbers: tokens + last refill timestamp) and O(1) time per call.
- The lazy-refill trick (compute tokens from elapsed time on each call, never use a timer) is the exact idea that generalizes to the Redis/Lua distributed version — so your single-node code becomes your distributed design answer.

If the interviewer explicitly asks for "N requests per window," fixed window is the fastest to write (~5 minutes) — write it as a warm-up, then immediately point out its 2x boundary-burst flaw and upgrade.

**10-minute block plan (60-minute round):**

| Minutes | Block | What to do / narrate |
|---|---|---|
| 0-10 | Clarify + interface | Restate requirements. Define `RateLimiter` interface with `allow(key)` returning metadata. Announce injectable clock: "I'm injecting `now()` so my tests don't sleep." Write the interface + a `Clock` type. |
| 10-20 | Token bucket | Implement with lazy refill. Narrate: "Tokens are a function of elapsed time — no timers, no background jobs." Handle first-seen keys, clamp at capacity. |
| 20-30 | Tests for token bucket | Fake clock, assert burst of `capacity` allowed, next denied, refill after advancing clock. Run them. Working code beats more features. |
| 30-40 | Fixed window + sliding window log | Fixed window in 5 min (INCR-style counter). Demonstrate the boundary burst in a test — interviewers love that you attack your own code. Sliding log with timestamp array + pruning. |
| 40-50 | Sliding window counter + leaky bucket | Weighted-average formula for the counter; leaky bucket as queue-level drain or as "token bucket viewed upside down." |
| 50-60 | Follow-ups | Distributed (Redis + Lua, atomicity), Express middleware, fail-open/closed, memory eviction of idle keys. |

**What to narrate throughout:** trade-offs ("fixed window is cheap but bursty at edges"), why lazy computation ("timers drift and don't scale to millions of keys"), and test-first thinking ("I'll fake the clock so tests are instant and deterministic").

**Interview trap:** Fixed window allows up to **2x the limit** across a window boundary. With limit 10/min, a client can send 10 requests at 00:59 and 10 more at 01:00 — 20 requests in 2 seconds, all allowed. The interviewer WILL ask about this. Know it cold, demonstrate it in a test, and name the fixes: sliding window log (exact), sliding window counter (approximate, cheap).

---

## Implementation

Single file, runnable with `npx tsx rate-limiters.ts` (or compile with `tsc`). No placeholders.

```typescript
// rate-limiters.ts
// Five rate limiting algorithms behind one interface, with an injectable clock.

// ---------------------------------------------------------------------------
// Common interface
// ---------------------------------------------------------------------------

/** Injectable clock: returns current time in milliseconds. */
export type Clock = () => number;

export interface RateLimitResult {
  allowed: boolean;
  /** Requests (or tokens) still available in the current window/bucket. */
  remaining: number;
  /** Milliseconds until the caller should retry (0 when allowed). */
  retryAfterMs: number;
  /** The configured limit, echoed for X-RateLimit-Limit headers. */
  limit: number;
}

export interface RateLimiter {
  allow(key: string): RateLimitResult;
}

const defaultClock: Clock = () => Date.now();

// ---------------------------------------------------------------------------
// 1. Fixed Window Counter
// ---------------------------------------------------------------------------
// Bucket time into fixed windows [0, W), [W, 2W)... and count per window.
// Memory: O(1) per key. Flaw: up to 2x limit across a window boundary.

export class FixedWindowLimiter implements RateLimiter {
  private counters = new Map<string, { windowStart: number; count: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: Clock = defaultClock,
  ) {}

  allow(key: string): RateLimitResult {
    const t = this.now();
    const windowStart = Math.floor(t / this.windowMs) * this.windowMs;

    let entry = this.counters.get(key);
    if (!entry || entry.windowStart !== windowStart) {
      // New window: lazily reset. NO setInterval — resets are derived from time.
      entry = { windowStart, count: 0 };
      this.counters.set(key, entry);
    }

    if (entry.count < this.limit) {
      entry.count++;
      return {
        allowed: true,
        remaining: this.limit - entry.count,
        retryAfterMs: 0,
        limit: this.limit,
      };
    }

    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: windowStart + this.windowMs - t,
      limit: this.limit,
    };
  }
}

// ---------------------------------------------------------------------------
// 2. Sliding Window Log
// ---------------------------------------------------------------------------
// Store a timestamp per accepted request; a request is allowed if fewer than
// `limit` accepted requests exist in the last `windowMs`.
// Exact, but memory is O(limit) per key. Prune aggressively.

export class SlidingWindowLogLimiter implements RateLimiter {
  private logs = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: Clock = defaultClock,
  ) {}

  allow(key: string): RateLimitResult {
    const t = this.now();
    const cutoff = t - this.windowMs;

    let log = this.logs.get(key);
    if (!log) {
      log = [];
      this.logs.set(key, log);
    }

    // Prune timestamps outside the window. Timestamps are appended in order,
    // so everything before the first in-window index can be dropped at once.
    let firstValid = 0;
    while (firstValid < log.length && log[firstValid] <= cutoff) firstValid++;
    if (firstValid > 0) log.splice(0, firstValid);

    if (log.length < this.limit) {
      log.push(t);
      return {
        allowed: true,
        remaining: this.limit - log.length,
        retryAfterMs: 0,
        limit: this.limit,
      };
    }

    // Denied. The oldest in-window timestamp expiring frees a slot.
    // Note: we do NOT record denied requests, so memory stays <= limit per key.
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: log[0] + this.windowMs - t,
      limit: this.limit,
    };
  }
}

// ---------------------------------------------------------------------------
// 3. Sliding Window Counter (approximation)
// ---------------------------------------------------------------------------
// Keep counts for the current and previous fixed windows. Estimate the rolling
// count with a weighted sum:
//   estimated = prevCount * overlapFraction + currCount
// where overlapFraction = portion of the previous window still inside the
// rolling window. O(1) memory, smooths the fixed-window boundary problem, but
// it assumes requests in the previous window were evenly distributed.

export class SlidingWindowCounterLimiter implements RateLimiter {
  private windows = new Map<
    string,
    { currStart: number; currCount: number; prevCount: number }
  >();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: Clock = defaultClock,
  ) {}

  allow(key: string): RateLimitResult {
    const t = this.now();
    const currStart = Math.floor(t / this.windowMs) * this.windowMs;

    let entry = this.windows.get(key);
    if (!entry) {
      entry = { currStart, currCount: 0, prevCount: 0 };
      this.windows.set(key, entry);
    } else if (entry.currStart !== currStart) {
      // Roll windows forward. If more than one full window elapsed, the
      // previous count is stale and must be zeroed.
      entry.prevCount =
        currStart - entry.currStart === this.windowMs ? entry.currCount : 0;
      entry.currCount = 0;
      entry.currStart = currStart;
    }

    // Fraction of the previous window that overlaps the rolling window.
    const elapsedInCurr = t - currStart;
    const overlap = (this.windowMs - elapsedInCurr) / this.windowMs;
    const estimated = entry.prevCount * overlap + entry.currCount;

    if (estimated < this.limit) {
      entry.currCount++;
      return {
        allowed: true,
        remaining: Math.max(0, Math.floor(this.limit - estimated - 1)),
        retryAfterMs: 0,
        limit: this.limit,
      };
    }

    return {
      allowed: false,
      remaining: 0,
      // Approximation: as time advances, overlap shrinks; a rough retry hint
      // is when enough of the previous window has aged out.
      retryAfterMs: Math.max(
        1,
        Math.ceil(
          ((estimated - this.limit + 1) / Math.max(entry.prevCount, 1)) *
            this.windowMs,
        ),
      ),
      limit: this.limit,
    };
  }
}

// ---------------------------------------------------------------------------
// 4. Token Bucket
// ---------------------------------------------------------------------------
// Bucket holds up to `capacity` tokens; refilled at `refillRatePerSec`.
// Each request consumes one token. Allows bursts up to `capacity`, then
// sustained throughput equals the refill rate.
//
// CRITICAL: refill is computed LAZILY from elapsed time on each call.
// Never use setInterval — it drifts, wakes the process for idle keys, and
// cannot scale to millions of keys.

export class TokenBucketLimiter implements RateLimiter {
  private buckets = new Map<string, { tokens: number; lastRefillMs: number }>();

  constructor(
    private readonly capacity: number,
    private readonly refillRatePerSec: number,
    private readonly now: Clock = defaultClock,
  ) {}

  allow(key: string): RateLimitResult {
    const t = this.now();

    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { tokens: this.capacity, lastRefillMs: t };
      this.buckets.set(key, bucket);
    } else {
      const elapsedSec = (t - bucket.lastRefillMs) / 1000;
      if (elapsedSec > 0) {
        bucket.tokens = Math.min(
          this.capacity,
          bucket.tokens + elapsedSec * this.refillRatePerSec,
        );
        bucket.lastRefillMs = t;
      }
    }

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        retryAfterMs: 0,
        limit: this.capacity,
      };
    }

    const deficit = 1 - bucket.tokens;
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.ceil((deficit / this.refillRatePerSec) * 1000),
      limit: this.capacity,
    };
  }
}

// ---------------------------------------------------------------------------
// 5. Leaky Bucket (as meter)
// ---------------------------------------------------------------------------
// Requests fill a bucket; the bucket drains at a constant `leakRatePerSec`.
// A request is allowed if adding it does not overflow `capacity`.
// Output rate is perfectly smooth (never exceeds leak rate over time) —
// unlike token bucket, there is no burst credit accumulated while idle
// beyond the bucket's headroom.
//
// Implementation mirrors token bucket with the inequality flipped:
// we track the current water level and drain it lazily from elapsed time.

export class LeakyBucketLimiter implements RateLimiter {
  private buckets = new Map<string, { level: number; lastLeakMs: number }>();

  constructor(
    private readonly capacity: number,
    private readonly leakRatePerSec: number,
    private readonly now: Clock = defaultClock,
  ) {}

  allow(key: string): RateLimitResult {
    const t = this.now();

    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { level: 0, lastLeakMs: t };
      this.buckets.set(key, bucket);
    } else {
      const elapsedSec = (t - bucket.lastLeakMs) / 1000;
      if (elapsedSec > 0) {
        bucket.level = Math.max(0, bucket.level - elapsedSec * this.leakRatePerSec);
        bucket.lastLeakMs = t;
      }
    }

    if (bucket.level + 1 <= this.capacity) {
      bucket.level += 1;
      return {
        allowed: true,
        remaining: Math.floor(this.capacity - bucket.level),
        retryAfterMs: 0,
        limit: this.capacity,
      };
    }

    const overflow = bucket.level + 1 - this.capacity;
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.ceil((overflow / this.leakRatePerSec) * 1000),
      limit: this.capacity,
    };
  }
}
```

**Interview trap:** Token bucket refill MUST be computed lazily from elapsed time (`tokens += elapsed * rate`, clamped at capacity), never with a `setInterval` timer per bucket. Timers drift, a timer per key does not scale (imagine 10M user keys = 10M timers), the process may sleep or restart, and timers make tests slow and flaky. Lazy refill is also exactly what makes the Redis/Lua version possible: the script recomputes tokens from a stored timestamp on each call. If you reach for `setInterval`, expect the interviewer to stop you.

**Interview trap:** Sliding window counter is an **approximation**, not exact. Know the weighted formula: `estimated = prevWindowCount * overlapFraction + currWindowCount`, where `overlapFraction = (windowMs - elapsedInCurrentWindow) / windowMs`. It assumes the previous window's requests were uniformly distributed; if they were all packed at the previous window's start, the estimate over-counts (too strict); if packed at the end, it under-counts (too lenient). Cloudflare published that in production the error is small (they measured ~0.003% of requests wrongly actioned). Say this trade-off unprompted.

### Comparison table

| Algorithm | Memory per key | Burst behavior | Accuracy | Implementation complexity | Typical use |
|---|---|---|---|---|---|
| Fixed window | O(1) — counter + window start | Up to 2x limit at window boundary | Low at edges | Trivial (5 min) | Cheap internal quotas; Redis INCR-based limits where rough is fine |
| Sliding window log | O(limit) — one timestamp per accepted request | No burst beyond limit in any rolling window | Exact | Medium (pruning logic) | Low-volume, strict limits: login attempts, OTP sends, password resets |
| Sliding window counter | O(1) — two counters + window start | Slight over/under-allow (bounded approximation error) | High (approximate) | Medium (weighted formula, window rollover) | High-traffic API gateways at scale (Cloudflare-style) |
| Token bucket | O(1) — tokens + last-refill timestamp | Allows bursts up to capacity, then refill rate | Exact w.r.t. its own model | Low-medium (lazy refill) | Public APIs (Stripe, AWS), network shaping; the default choice |
| Leaky bucket (meter) | O(1) — level + last-leak timestamp | Smooths output to constant leak rate; small headroom only | Exact w.r.t. its own model | Low-medium (mirror of token bucket) | Protecting fragile downstreams that need a steady rate (DB writes, third-party APIs with strict pacing) |

Rule of thumb to say out loud: **token bucket when the client may burst, leaky bucket when the downstream must not see bursts, sliding log when the limit must be exact and volume is low, sliding counter when you need near-exact at massive scale, fixed window when you need it in five minutes.**

---

## Test cases

Plain `node:assert` + `node:test` style — runs with `npx tsx --test rate-limiters.test.ts` or trivially portable to vitest (`import { describe, it, expect } from "vitest"`).

```typescript
// rate-limiters.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FixedWindowLimiter,
  SlidingWindowLogLimiter,
  SlidingWindowCounterLimiter,
  TokenBucketLimiter,
  LeakyBucketLimiter,
} from "./rate-limiters";

/** Controllable fake clock — the whole point of injecting `now()`. */
function fakeClock(startMs = 0) {
  let t = startMs;
  return {
    now: () => t,
    advance: (ms: number) => (t += ms),
    set: (ms: number) => (t = ms),
  };
}

// ---------------------------------------------------------------------------
// Fixed window: demonstrates the boundary burst (2x limit at the edge)
// ---------------------------------------------------------------------------

test("fixed window enforces limit within one window", () => {
  const clock = fakeClock(0);
  const limiter = new FixedWindowLimiter(3, 60_000, clock.now);

  assert.equal(limiter.allow("u1").allowed, true);
  assert.equal(limiter.allow("u1").allowed, true);
  assert.equal(limiter.allow("u1").allowed, true);
  const denied = limiter.allow("u1");
  assert.equal(denied.allowed, false);
  assert.equal(denied.remaining, 0);
  assert.equal(denied.retryAfterMs, 60_000); // full window remains at t=0
});

test("fixed window BOUNDARY BURST: 2x limit allowed across the edge", () => {
  const clock = fakeClock(0);
  const limiter = new FixedWindowLimiter(10, 60_000, clock.now);

  // 10 requests at t=59s — end of window [0, 60s)
  clock.set(59_000);
  for (let i = 0; i < 10; i++) assert.equal(limiter.allow("u1").allowed, true);
  assert.equal(limiter.allow("u1").allowed, false);

  // 10 more at t=60s — brand new window, counter reset
  clock.set(60_000);
  for (let i = 0; i < 10; i++) assert.equal(limiter.allow("u1").allowed, true);
  // => 20 requests accepted within ~1 second. This is the known flaw.
});

test("fixed window isolates keys", () => {
  const clock = fakeClock(0);
  const limiter = new FixedWindowLimiter(1, 60_000, clock.now);
  assert.equal(limiter.allow("a").allowed, true);
  assert.equal(limiter.allow("a").allowed, false);
  assert.equal(limiter.allow("b").allowed, true); // separate key unaffected
});

// ---------------------------------------------------------------------------
// Sliding window log: exact over ANY rolling window (no boundary burst)
// ---------------------------------------------------------------------------

test("sliding log blocks the boundary burst that fixed window allows", () => {
  const clock = fakeClock(0);
  const limiter = new SlidingWindowLogLimiter(10, 60_000, clock.now);

  clock.set(59_000);
  for (let i = 0; i < 10; i++) assert.equal(limiter.allow("u1").allowed, true);

  clock.set(60_000); // only 1s later — all 10 timestamps still in window
  assert.equal(limiter.allow("u1").allowed, false);

  clock.set(119_000); // 60s after the burst: timestamps at 59_000 just expired... not yet
  // cutoff = 119000 - 60000 = 59000; entries at exactly 59000 are pruned (<=)
  assert.equal(limiter.allow("u1").allowed, true);
});

test("sliding log frees slots exactly as old requests age out", () => {
  const clock = fakeClock(0);
  const limiter = new SlidingWindowLogLimiter(2, 10_000, clock.now);

  clock.set(1_000);
  assert.equal(limiter.allow("u1").allowed, true); // ts=1000
  clock.set(5_000);
  assert.equal(limiter.allow("u1").allowed, true); // ts=5000
  clock.set(6_000);
  const denied = limiter.allow("u1");
  assert.equal(denied.allowed, false);
  // Oldest (1000) expires at 11000; retryAfter = 11000 - 6000 = 5000
  assert.equal(denied.retryAfterMs, 5_000);

  clock.set(11_001); // ts=1000 now outside window
  assert.equal(limiter.allow("u1").allowed, true);
});

test("sliding log does not grow memory on denied requests", () => {
  const clock = fakeClock(0);
  const limiter = new SlidingWindowLogLimiter(3, 60_000, clock.now);
  for (let i = 0; i < 3; i++) limiter.allow("u1");
  for (let i = 0; i < 1000; i++) {
    clock.advance(1);
    assert.equal(limiter.allow("u1").allowed, false);
  }
  // Internal log still holds only 3 timestamps (denied requests not recorded).
  // (Behavioral proxy: after the window passes, exactly 3 more are allowed.)
  clock.advance(60_000);
  for (let i = 0; i < 3; i++) assert.equal(limiter.allow("u1").allowed, true);
  assert.equal(limiter.allow("u1").allowed, false);
});

// ---------------------------------------------------------------------------
// Sliding window counter: approximation via weighted previous window
// ---------------------------------------------------------------------------

test("sliding counter weights the previous window into the estimate", () => {
  const clock = fakeClock(0);
  const limiter = new SlidingWindowCounterLimiter(10, 60_000, clock.now);

  // Fill the first window [0, 60s) with exactly 10 requests.
  clock.set(30_000);
  for (let i = 0; i < 10; i++) assert.equal(limiter.allow("u1").allowed, true);
  assert.equal(limiter.allow("u1").allowed, false);

  // t=75s: 15s into window [60s, 120s). overlap = (60-15)/60 = 0.75
  // estimated = 10 * 0.75 + 0 = 7.5 < 10 -> allowed (approximation!)
  clock.set(75_000);
  assert.equal(limiter.allow("u1").allowed, true);

  // t=61s equivalent check: early in the new window the previous window
  // dominates, so a full second burst is NOT allowed (unlike fixed window).
  const clock2 = fakeClock(0);
  const limiter2 = new SlidingWindowCounterLimiter(10, 60_000, clock2.now);
  clock2.set(59_000);
  for (let i = 0; i < 10; i++) assert.equal(limiter2.allow("u1").allowed, true);
  clock2.set(60_500); // overlap = (60000-500)/60000 ~ 0.99 -> estimate ~9.9
  assert.equal(limiter2.allow("u1").allowed, true);  // 9.9 < 10, one sneaks in
  assert.equal(limiter2.allow("u1").allowed, false); // 10.9 >= 10, blocked
  // Compare: fixed window would have allowed all 10 again. The counter
  // permits at most a small overshoot — that's the accepted trade-off.
});

test("sliding counter zeroes stale previous window after a long gap", () => {
  const clock = fakeClock(0);
  const limiter = new SlidingWindowCounterLimiter(5, 60_000, clock.now);
  for (let i = 0; i < 5; i++) limiter.allow("u1");
  clock.set(200_000); // >2 windows later: prev must be treated as 0
  for (let i = 0; i < 5; i++) assert.equal(limiter.allow("u1").allowed, true);
});

// ---------------------------------------------------------------------------
// Token bucket: burst allowance + refill over time
// ---------------------------------------------------------------------------

test("token bucket allows a full-capacity burst, then denies", () => {
  const clock = fakeClock(0);
  const limiter = new TokenBucketLimiter(5, 1 /* token/sec */, clock.now);

  for (let i = 0; i < 5; i++) assert.equal(limiter.allow("u1").allowed, true);
  const denied = limiter.allow("u1");
  assert.equal(denied.allowed, false);
  assert.equal(denied.retryAfterMs, 1_000); // need 1 token at 1 token/sec
});

test("token bucket refills lazily from elapsed time", () => {
  const clock = fakeClock(0);
  const limiter = new TokenBucketLimiter(5, 2 /* tokens/sec */, clock.now);

  for (let i = 0; i < 5; i++) limiter.allow("u1"); // drain
  assert.equal(limiter.allow("u1").allowed, false);

  clock.advance(1_500); // 1.5s * 2 tokens/sec = 3 tokens
  assert.equal(limiter.allow("u1").allowed, true);
  assert.equal(limiter.allow("u1").allowed, true);
  assert.equal(limiter.allow("u1").allowed, true);
  assert.equal(limiter.allow("u1").allowed, false);
});

test("token bucket clamps at capacity (no infinite banking while idle)", () => {
  const clock = fakeClock(0);
  const limiter = new TokenBucketLimiter(3, 10, clock.now);
  clock.advance(3_600_000); // idle 1 hour: would be 36k tokens uncapped
  let allowed = 0;
  for (let i = 0; i < 10; i++) if (limiter.allow("u1").allowed) allowed++;
  assert.equal(allowed, 3); // capped at capacity
});

// ---------------------------------------------------------------------------
// Leaky bucket: smoothing — sustained rate never exceeds the leak rate
// ---------------------------------------------------------------------------

test("leaky bucket absorbs up to capacity, then smooths to leak rate", () => {
  const clock = fakeClock(0);
  const limiter = new LeakyBucketLimiter(4, 1 /* leak/sec */, clock.now);

  for (let i = 0; i < 4; i++) assert.equal(limiter.allow("u1").allowed, true);
  const denied = limiter.allow("u1");
  assert.equal(denied.allowed, false);
  assert.equal(denied.retryAfterMs, 1_000); // 1 unit must drain first

  clock.advance(1_000); // exactly one unit drained
  assert.equal(limiter.allow("u1").allowed, true);
  assert.equal(limiter.allow("u1").allowed, false); // full again immediately
});

test("leaky bucket enforces steady long-run throughput", () => {
  const clock = fakeClock(0);
  const limiter = new LeakyBucketLimiter(2, 1, clock.now);

  // Hammer with 5 attempts every 500ms for 10 seconds.
  let allowed = 0;
  for (let step = 0; step < 20; step++) {
    for (let i = 0; i < 5; i++) if (limiter.allow("u1").allowed) allowed++;
    clock.advance(500);
  }
  // 10 seconds at 1/sec leak + initial capacity 2 => about 12 accepted.
  assert.ok(allowed >= 11 && allowed <= 12, `got ${allowed}`);
  // KEY CONTRAST with token bucket: no matter how bursty the input, the
  // accepted rate converges to the leak rate — the downstream sees a
  // near-constant stream.
});
```

---

## Follow-up questions

### 1. "How do you make this work across multiple app servers?" (distributed)

In-memory Maps are per-process. Two app instances each grant the full limit — a client behind a round-robin load balancer gets N x limit. The fix is shared state in Redis, but naive Redis usage introduces a **read-modify-write race**:

```
Instance A: GET bucket  -> tokens = 1
Instance B: GET bucket  -> tokens = 1        (interleaved!)
Instance A: SET bucket  -> tokens = 0, allow
Instance B: SET bucket  -> tokens = 0, allow  // two requests spent one token
```

Both instances read the same state, both decide "1 token available," both allow. The check and the update are not atomic across the network. Under load this over-admits systematically, not occasionally.

**Why Lua solves it:** Redis executes commands on a single thread, and an `EVAL`'d Lua script runs as one uninterruptible unit — no other command interleaves between the script's reads and writes. The GET-compute-SET happens atomically inside Redis, so there is exactly one authoritative state transition per request. (Alternatives: `MULTI/EXEC` + `WATCH` needs retry loops; `INCR` alone cannot express token-bucket math; Lua is the standard answer.)

Full token bucket Lua script (lazy refill, same math as the in-memory class):

```lua
-- token_bucket.lua
-- KEYS[1] = bucket key, e.g. "rl:tb:{user123}"
-- ARGV[1] = capacity
-- ARGV[2] = refill rate (tokens per second)
-- ARGV[3] = now (milliseconds) -- passed in so app clocks, not Redis, are debatable;
--           alternatively use redis.call('TIME') for a single source of truth
-- ARGV[4] = tokens requested (usually 1)
-- Returns: { allowed (0/1), remaining_tokens, retry_after_ms }

local key       = KEYS[1]
local capacity  = tonumber(ARGV[1])
local rate      = tonumber(ARGV[2])
local now_ms    = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

local state = redis.call('HMGET', key, 'tokens', 'last_refill_ms')
local tokens = tonumber(state[1])
local last_refill_ms = tonumber(state[2])

if tokens == nil then
  -- First sighting of this key: full bucket.
  tokens = capacity
  last_refill_ms = now_ms
end

-- Lazy refill from elapsed time (identical logic to the in-process version).
local elapsed_ms = math.max(0, now_ms - last_refill_ms)
tokens = math.min(capacity, tokens + (elapsed_ms / 1000.0) * rate)

local allowed = 0
local retry_after_ms = 0

if tokens >= requested then
  tokens = tokens - requested
  allowed = 1
else
  retry_after_ms = math.ceil(((requested - tokens) / rate) * 1000)
end

redis.call('HSET', key, 'tokens', tokens, 'last_refill_ms', now_ms)

-- Expire idle buckets: after (time to fully refill) the state is
-- indistinguishable from a fresh full bucket, so it can be dropped.
-- This bounds memory to *active* keys only.
local ttl_sec = math.ceil(capacity / rate) * 2
redis.call('EXPIRE', key, ttl_sec)

return { allowed, math.floor(tokens), retry_after_ms }
```

Node.js caller with ioredis, using `defineCommand` (which handles `EVALSHA` with automatic `EVAL` fallback on `NOSCRIPT`, so the script body is not re-sent on every call):

```typescript
// redis-token-bucket.ts
import Redis from "ioredis";
import { readFileSync } from "node:fs";

const TOKEN_BUCKET_LUA = readFileSync("./token_bucket.lua", "utf8");
// (Inline the string in an interview if file reading is a distraction.)

export interface DistributedRateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export class RedisTokenBucketLimiter {
  private redis: Redis;

  constructor(
    redisUrl: string,
    private readonly capacity: number,
    private readonly refillRatePerSec: number,
    private readonly now: () => number = () => Date.now(),
  ) {
    this.redis = new Redis(redisUrl);
    // defineCommand registers the script; ioredis sends EVALSHA and
    // transparently falls back to EVAL if Redis restarts and loses the
    // script cache (NOSCRIPT error). Never hand-roll SCRIPT LOAD + EVALSHA
    // without that fallback.
    this.redis.defineCommand("tokenBucket", {
      numberOfKeys: 1,
      lua: TOKEN_BUCKET_LUA,
    });
  }

  async allow(key: string, tokens = 1): Promise<DistributedRateLimitResult> {
    // Hash tag {key} keeps related keys on one slot in Redis Cluster.
    const [allowed, remaining, retryAfterMs] = (await (this.redis as any).tokenBucket(
      `rl:tb:{${key}}`,
      this.capacity,
      this.refillRatePerSec,
      this.now(),
      tokens,
    )) as [number, number, number];

    return { allowed: allowed === 1, remaining, retryAfterMs };
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
```

**Sliding window log in Redis — mention the ZSET pattern:** store each request as a sorted-set member scored by timestamp, all inside one Lua script (or a MULTI):
`ZREMRANGEBYSCORE key 0 (now - window)` to prune, `ZCARD key` to count, `ZADD key now now:uuid` if under the limit, `PEXPIRE key window`. Exact like the in-memory log, same O(limit)-per-key memory cost — fine for login-attempt style limits, too heavy for per-request API limiting at scale.

### 2. "What about clock skew?"

- **In-memory limiters:** only the local monotonic progression matters; prefer a monotonic source (`process.hrtime.bigint()`-derived) over `Date.now()` if NTP step-backs are a concern — a backwards `Date.now()` jump makes `elapsed` negative, which is why the code clamps (`elapsedSec > 0`, `math.max(0, ...)`). Say that clamp exists deliberately.
- **Distributed:** if app servers pass `now` into the Lua script (as above), skew between app servers skews refill amounts — a fast clock refills early. Two mitigations: (a) use `redis.call('TIME')` inside the script so Redis is the single clock authority (best answer; the trade-off is the script becomes non-deterministic for replication, which modern Redis handles via effects-based replication); (b) accept small skew because NTP keeps servers within tens of milliseconds and rate limits are not billing-grade.
- Never mix clocks: whichever source you pick, both the stored timestamp and `now` must come from it.

### 3. "Per-user vs global limits?"

- **Per-user/per-API-key** (what we built): fairness, abuse isolation, tiered plans (free = 10 rps, pro = 100 rps — store the tier's config per key or pass capacity/rate as ARGV per call, as the Lua script already does).
- **Global/service-level:** protects total downstream capacity ("the payments provider allows us 500 rps total"). Same algorithms with a single constant key (`key = "global"`). Under Redis this makes one hot key — mitigate by splitting into N shards (`global:0..N-1`, each with limit/N, pick shard by hash or random) at some fairness cost, or run a local token bucket per instance with `rate/instances` if instance counts are stable.
- **Layered in practice:** per-IP (edge, anti-abuse) -> per-API-key (business quota) -> global per-downstream (capacity protection). A request must pass all applicable limiters; evaluate cheapest/broadest first.

### 4. "What happens when Redis is down?" (fail-open vs fail-closed)

- **Fail-open:** on Redis error/timeout, allow the request. Availability wins; the risk is an unthrottled window during the outage. Right default for revenue-carrying product traffic where the limiter is protection, not a security boundary.
- **Fail-closed:** on error, deny (429/503). Correctness/protection wins. Right for security-sensitive limits: login attempts, OTP verification, password reset — failing open there turns a Redis outage into a brute-force window.
- **Middle grounds to mention:** short Redis timeouts (e.g. 50ms) so the limiter cannot add user-visible latency; a local in-memory limiter as degraded fallback (approximate but better than nothing); circuit breaker so you stop hammering a dead Redis; metrics + alert on fallback activation so an outage is visible.
- The middleware below makes this an explicit option — say "I'd make the failure policy a configuration decision per route, not a hardcoded one."

### 5. "How do you test time-based code?"

Exactly what the implementation was built for:

- **Inject the clock.** Every class takes `now: () => number`. Tests use `fakeClock()` and call `advance(ms)` — no `setTimeout`, no sleeping, no flakes, tests run in milliseconds. This is the single highest-leverage design decision in the file.
- **Vitest/Jest fake timers** (`vi.useFakeTimers()` + `vi.setSystemTime()`) work too but only if the code reads `Date.now()`; injection is cleaner because it also documents the dependency and works for the Lua path (pass any `now` you want as ARGV).
- **Test the boundaries deliberately:** exactly-at-limit, one-past-limit, exact expiry instant (the `<= cutoff` prune above is an off-by-one honeypot), clock going backwards (assert no crash, no token minting), long idle gaps (capacity clamp, stale previous-window reset).
- **For the Redis version:** integration tests against a real Redis in Docker (testcontainers), passing controlled `now` values as ARGV so even the distributed tests are deterministic; plus a concurrency test firing N parallel `allow` calls and asserting exactly `capacity` succeed — that is the test that proves atomicity.

### 6. Express middleware wrapper

```typescript
// middleware.ts
import type { Request, Response, NextFunction } from "express";
import type { DistributedRateLimitResult } from "./redis-token-bucket";

export interface RateLimitOptions {
  /** Async limiter check — wraps in-memory (Promise.resolve) or Redis. */
  check(key: string): Promise<DistributedRateLimitResult & { limit?: number }>;
  /** Extract the limit key from the request. Default: API key, else IP. */
  keyExtractor?(req: Request): string;
  /** On limiter backend failure: allow ("open") or reject ("closed"). */
  failurePolicy?: "open" | "closed";
  limit?: number; // for X-RateLimit-Limit when the result omits it
}

const defaultKeyExtractor = (req: Request): string => {
  const apiKey = req.header("x-api-key");
  if (apiKey) return `api:${apiKey}`;
  // Trust proxy config matters: req.ip honors X-Forwarded-For only when
  // app.set('trust proxy', ...) is configured correctly — otherwise clients
  // can spoof their key. Say this out loud.
  return `ip:${req.ip ?? req.socket.remoteAddress ?? "unknown"}`;
};

export function rateLimit(options: RateLimitOptions) {
  const extract = options.keyExtractor ?? defaultKeyExtractor;
  const policy = options.failurePolicy ?? "open";

  return async (req: Request, res: Response, next: NextFunction) => {
    const key = extract(req);

    let result: DistributedRateLimitResult & { limit?: number };
    try {
      result = await options.check(key);
    } catch (err) {
      // Redis down / timeout. Fail-open keeps the product available;
      // fail-closed protects security-sensitive routes (login, OTP).
      req.app.get("logger")?.warn?.("rate limiter backend error", err);
      if (policy === "open") return next();
      res.setHeader("Retry-After", "1");
      return res.status(503).json({ error: "rate limiter unavailable" });
    }

    const limit = result.limit ?? options.limit ?? 0;
    res.setHeader("X-RateLimit-Limit", String(limit));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, result.remaining)));
    res.setHeader(
      "X-RateLimit-Reset",
      String(Math.ceil((Date.now() + result.retryAfterMs) / 1000)), // unix seconds
    );

    if (!result.allowed) {
      res.setHeader("Retry-After", String(Math.ceil(result.retryAfterMs / 1000)));
      return res.status(429).json({
        error: "rate limit exceeded",
        retryAfterMs: result.retryAfterMs,
      });
    }

    return next();
  };
}

// Usage:
//
// const limiter = new RedisTokenBucketLimiter(process.env.REDIS_URL!, 100, 10);
// app.use("/api", rateLimit({
//   check: (key) => limiter.allow(key),
//   limit: 100,
//   failurePolicy: "open",          // product routes: availability first
// }));
// app.post("/login", rateLimit({
//   check: (key) => loginLimiter.allow(key),
//   limit: 5,
//   failurePolicy: "closed",        // security route: never fail open
// }));
```

**Interview trap:** `INCR` + `EXPIRE` as two separate Redis commands is a classic broken fixed-window implementation. If the process dies (or the connection drops) between `INCR` and `EXPIRE`, the key has **no TTL** — the counter never resets and the client is rate-limited forever. Even without crashes, a second instance can `INCR` before the first `EXPIRE` lands, and every instance calling `EXPIRE` keeps sliding the window. Correct forms: `SET key 0 NX PX window` then `INCR`, or `INCR` + `PEXPIRE ... NX` (Redis 7), or — the answer that always works — one Lua script. Interviewers use this to separate people who have run Redis in production from people who have read a blog post.

---

## What gets you rejected

1. **`setInterval` to reset windows or refill buckets.** Timers drift, a timer per key cannot scale (millions of keys), state is wrong after process restarts or event-loop stalls, and tests now need real sleeping. All five implementations above derive state lazily from `now()` — zero timers. This is the number one rejection reason because it reveals the candidate thinks in "background jobs" instead of "state as a function of time."
2. **Unbounded memory in the sliding window log.** Recording denied requests, or never pruning, means one abusive client grows an array forever — the rate limiter becomes the DoS vector. Prune on every call and never store denials (memory then bounded at O(limit) per key). Also mention idle-key eviction (TTL in Redis, LRU/last-access sweep in memory) or the Map itself grows one entry per key ever seen.
3. **Non-atomic Redis `INCR` + `EXPIRE`** (see the trap above) or GET-then-SET token bucket logic across instances — the read-modify-write race over-admits under exactly the load the limiter exists for. One Lua script, atomic in Redis's single-threaded execution.
4. **Forgetting lazy refill in the token bucket** — either not clamping at capacity (idle clients bank unlimited burst), not updating `lastRefillMs` (double-minting tokens), or using integer tokens with per-second granularity (a 10 rps bucket that refills 10 once a second is a fixed window in disguise). Refill continuously: `min(capacity, tokens + elapsed * rate)`.
5. **No injectable clock.** Hardcoded `Date.now()` forces sleep-based tests; the interviewer watches your test suite take 60 real seconds or get skipped. Inject `now()` from the first line.
6. **Ignoring the fixed-window boundary burst** — or worse, denying it exists when asked. Volunteer it, show the failing scenario in a test, name the fixes.
7. **Global mutable state / no per-key isolation:** one shared counter for all keys, or key handling that lets `user "a:b"` collide with `user "a"` + something (`use a delimiter-safe or hashed key`).
8. **Returning bare booleans with no metadata** when the prompt mentions HTTP: no `Retry-After`, no `X-RateLimit-*`, 500 instead of 429. The HTTP contract is part of the problem.
9. **Concurrency hand-waving in Node:** claiming you need a mutex around the Map (single-threaded event loop makes each synchronous `allow()` atomic — but only until you `await` mid-check; keep the check-and-update synchronous) or, conversely, not realizing the same logic **does** race across processes.

Final note to narrate as you finish: "In production I would reach for a proven library first — `rate-limiter-flexible` in Node, Envoy/nginx `limit_req` at the edge — and reserve custom code for when the semantics (tiered quotas, weighted costs per endpoint, token-cost-per-request) don't fit. But the interview is about proving I can build the primitive correctly."
