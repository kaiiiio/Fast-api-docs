# Lesson 2.5 — Solved LLD: API Rate Limit Manager (the Heizen interview question)

> Module: LLD & Design Patterns | Level: Senior | FDE Prep Phase 2

This is the exact question asked in the Heizen FDE interview: *"Design an API Rate Limit Manager."* It looks like a data-structures question and is actually an architecture question wearing a trench coat. The interviewer is watching for four things: do you clarify scope before writing code, do you design against interfaces so algorithms are swappable, do you know more than one algorithm and *why* you'd pick each, and do you understand where the single-process design breaks when they inevitably say "now make it distributed." This lesson is the full walkthrough — every class implemented, every follow-up answered.

---

## Step 1: Requirements clarification

Never open your editor first. A senior candidate spends the first 3–5 minutes asking questions, because every one of these answers changes the design. Ask these, in roughly this order:

**Q1. "Is this in-process for a single Node service, or distributed across many instances?"**
*Typical answer:* "Start in-process; we'll extend it later."
*Why it matters:* This is the single biggest fork in the design. In-process means an in-memory store and no atomicity concerns on synchronous code. Distributed means shared state (Redis), atomic check-and-decrement, and clock coordination. If you jump straight to Redis, you fail the "can you design a clean core first" test. If you never mention distribution exists, you fail the seniority test. Say explicitly: "I'll design in-process behind a storage abstraction so the distributed version is a swap, not a rewrite."

**Q2. "What's the limiting dimension — per user, per API key, per endpoint, per tenant, or combinations?"**
*Typical answer:* "Combinations. Tenants have plan-level limits, and some endpoints have their own stricter limits."
*Why it matters:* This tells you the key is *composite* (`tenant:endpoint:userId`) and that you need **rule resolution with precedence** — a specific rule (tenant + endpoint) must beat a general one (global default). Miss this and you build a flat `Map<userId, count>` that can't express "free-tier tenants get 100/min but `/export` is 5/min for everyone."

**Q3. "When a request exceeds the limit, do we hard-reject with 429, or queue/throttle it?"**
*Typical answer:* "Hard reject with 429 and a `Retry-After` header."
*Why it matters:* Rejecting is a pure function: `allow(key, now) → decision`. Queuing/throttling (a *shaper*, not a *limiter*) means holding requests, which means memory pressure, timeout policies, and backpressure — a much bigger system. Confirming "reject" keeps the design honest and bounded. Mention that a leaky-bucket-as-queue exists if they ever want smoothing (it comes up in Step 4).

**Q4. "Do clients need burst tolerance — e.g., 100/min sustained but allow 20 in one second?"**
*Typical answer:* "Yes, short bursts are fine as long as the sustained rate holds."
*Why it matters:* This is the algorithm selector. Fixed/sliding windows enforce a count per window; token bucket separates *sustained rate* (refill) from *burst size* (capacity). If bursts are required, token bucket is the headline algorithm and the others are supporting cast.

**Q5. "What accuracy vs memory tradeoff is acceptable? Is a ~1% overcount tolerable, or is this billing-grade?"**
*Typical answer:* "Approximate is fine for API protection; don't burn memory."
*Why it matters:* Sliding window **log** is exact but O(requests) memory per key. Sliding window **counter** is O(1) memory with a small, bounded error. If they said "billing-grade / hard compliance limit," you'd pay for the log. This question shows you know the algorithms sit on an accuracy–memory spectrum, not a "best one" list.

**Q6. "Do limit configs change at runtime — plan upgrades, incident response — or only at deploy?"**
*Typical answer:* "They change at runtime; ops must be able to tighten a limit during an incident without a restart."
*Why it matters:* Config hot-reload means the rule registry must be swappable atomically, and you must decide what happens to in-flight window state when a rule changes (keep it, since keys embed the rule identity — or reset it). Designing this in from the start is cheap; bolting it on later isn't.

**Q7. "Multi-tenant with different plans — do tiers (free/pro/enterprise) map to different limits and even different algorithms?"**
*Typical answer:* "Yes — free tier gets strict fixed windows, enterprise gets generous token buckets."
*Why it matters:* Confirms the strategy must be chosen *per rule*, not globally — which forces the factory pattern (algorithm name in config → strategy instance) instead of hardcoding one algorithm into the manager.

**Interview trap:** Candidates ask clarifying questions, get the answers, then design something that ignores the answers. If they said "bursts allowed," your default algorithm better be token bucket. If they said "combinations of dimensions," your keys better be composite. Interviewers deliberately check whether the answers show up in the code.

Scope agreed with the interviewer:

- In-process first, storage abstracted for later distribution.
- Composite keys: tenant + endpoint + user.
- Hard 429 with `Retry-After` and `X-RateLimit-*` headers.
- All four standard algorithms available, selected per rule via config.
- Rule precedence: tenant+endpoint > tenant > endpoint > global default.
- Hot-reloadable config; injectable clock for testability; bounded memory.

---

## Step 2: Core entities & interfaces

Interface-first. The implementations in Step 3 are almost mechanical once these are right.

```ts
/** The verdict for one request. Everything the HTTP layer needs to respond. */
export interface RateLimitDecision {
  allowed: boolean;
  /** How many requests remain in the current window/bucket. Floored at 0. */
  remaining: number;
  /** How long the caller should wait before retrying. 0 when allowed. */
  retryAfterMs: number;
  /** The configured limit, echoed for X-RateLimit-Limit. */
  limit: number;
  /** Epoch ms when the window resets / bucket refills enough. For X-RateLimit-Reset. */
  resetAtMs: number;
}

/**
 * One rate-limiting algorithm, configured with a limit + window but NOT bound
 * to any key. State lives in the store, keyed by the request key — so one
 * strategy instance serves millions of keys.
 */
export interface RateLimitStrategy {
  allow(key: string, now: number): RateLimitDecision;
}

export type AlgorithmName =
  | 'fixed-window'
  | 'sliding-window-log'
  | 'sliding-window-counter'
  | 'token-bucket';

/**
 * A rule = scope (tenant/endpoint, either optional) + policy (limit, window,
 * algorithm). Absent tenant/endpoint means "matches any".
 */
export interface RateLimitRule {
  id: string;
  tenant?: string;
  endpoint?: string;
  limit: number;
  windowMs: number;
  algorithm: AlgorithmName;
  /** Token bucket only: max burst size. Defaults to `limit`. */
  burstCapacity?: number;
}

/** The identity of one request, from the manager's point of view. */
export interface RequestContext {
  tenant: string;
  endpoint: string;
  userId: string;
}

/** Injectable time source. THE most important interface for testability. */
export interface ClockProvider {
  now(): number;
}

/**
 * Storage abstraction. In-process: a Map. Distributed: Redis. Note it is
 * deliberately generic over the state shape — each algorithm stores a
 * different record type under its keys.
 */
export interface StateStore<T> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
  delete(key: string): void;
  /** For cleanup sweeps. */
  entries(): IterableIterator<[string, { value: T; touchedAt: number }]>;
  size(): number;
}
```

Rationale, interface by interface:

- **`RateLimitDecision`** returns `retryAfterMs` and `resetAtMs`, not just a boolean. A limiter that can't tell the client *when to come back* generates retry storms — clients hammer immediately and you've built a DoS amplifier. The decision object is the contract with the HTTP adapter.
- **`RateLimitStrategy`** is the Strategy pattern's textbook use. The critical design decision: `allow(key, now)` takes the key and the time as *parameters*. The strategy holds configuration (limit, window) and a store reference — never per-key state in instance fields. This makes one instance shareable across all keys, and makes the strategy a pure function of `(state, now)`, which is what makes it unit-testable and later portable to a Lua script.
- **`RateLimitRule`** separates *scope* from *policy*. Optional `tenant`/`endpoint` gives us four specificity levels for free.
- **`ClockProvider`** exists because `Date.now()` hardcoded inside algorithms makes boundary conditions untestable (you cannot deterministically test "59.999s vs 60.001s"). The manager reads the clock once per request and passes `now` down — one consistent timestamp per decision.
- **`StateStore`** is the seam for distribution. The in-memory version is a Map with TTL sweeping; the Redis version replaces `get/set` with an atomic script (Step 4 explains why it can't literally be get-then-set over the network).

**Interview trap:** "Why does `allow` take `now` as a parameter instead of the strategy holding a clock?" Because the manager should read the clock **once** per request and hand the same timestamp to whatever needs it. If each layer calls `clock.now()` independently, a request can straddle a window boundary *within its own processing*, producing decisions and headers that disagree with each other.

And the manager that ties it together:

```ts
export interface RateLimiterManagerApi {
  check(ctx: RequestContext): RateLimitDecision;
  /** Atomic config swap — hot reload. */
  replaceRules(rules: RateLimitRule[]): void;
}
```

---

## Step 3: Implementation

### 3.1 Clocks and the memory store

```ts
export class SystemClock implements ClockProvider {
  now(): number {
    return Date.now();
  }
}

/** Deterministic clock for tests. See Step 4 for how it's used. */
export class FakeClock implements ClockProvider {
  private currentMs: number;
  constructor(startMs = 0) {
    this.currentMs = startMs;
  }
  now(): number {
    return this.currentMs;
  }
  advance(ms: number): void {
    this.currentMs += ms;
  }
  set(ms: number): void {
    this.currentMs = ms;
  }
}
```

The memory store must not grow forever. Every unique key (user × endpoint × tenant) creates an entry; without eviction, a scanner cycling through random API keys inflates your heap until the process dies. We track `touchedAt` per entry and sweep entries idle longer than a TTL. The sweep interval is `unref()`ed so it never keeps the process alive.

```ts
interface StoredEntry<T> {
  value: T;
  touchedAt: number;
}

export class MemoryStore<T> implements StateStore<T> {
  private readonly map = new Map<string, StoredEntry<T>>();
  private sweepTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly clock: ClockProvider,
    private readonly idleTtlMs: number,
    sweepIntervalMs = 60_000
  ) {
    this.sweepTimer = setInterval(() => this.sweep(), sweepIntervalMs);
    // Never keep the process alive just for cleanup (Node-only API, guard for other runtimes).
    if (typeof this.sweepTimer === 'object' && 'unref' in this.sweepTimer) {
      this.sweepTimer.unref();
    }
  }

  get(key: string): T | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    entry.touchedAt = this.clock.now();
    return entry.value;
  }

  set(key: string, value: T): void {
    this.map.set(key, { value, touchedAt: this.clock.now() });
  }

  delete(key: string): void {
    this.map.delete(key);
  }

  entries(): IterableIterator<[string, StoredEntry<T>]> {
    return this.map.entries();
  }

  size(): number {
    return this.map.size;
  }

  /** Public so tests can trigger it deterministically with a FakeClock. */
  sweep(): void {
    const cutoff = this.clock.now() - this.idleTtlMs;
    for (const [key, entry] of this.map) {
      if (entry.touchedAt < cutoff) this.map.delete(key);
    }
  }

  dispose(): void {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
    this.sweepTimer = null;
    this.map.clear();
  }
}
```

**Interview trap:** "Is it safe to sweep while requests are in flight?" In a single Node process, yes for *synchronous* sweeps — the event loop guarantees the sweep callback and a request handler never interleave mid-statement. The subtle correctness point: sweeping an *idle* key is always safe because a swept key simply reconstructs as fresh state on next access — the TTL just has to be ≥ the longest window so you never delete state that still constrains a decision.

### 3.2 Fixed Window Counter

Time is chopped into aligned windows (`floor(now / windowMs) * windowMs`). One counter per key per window. Simple, O(1) memory, O(1) time — and it has a famous flaw.

```ts
interface FixedWindowState {
  windowStartMs: number;
  count: number;
}

export class FixedWindowStrategy implements RateLimitStrategy {
  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly store: StateStore<FixedWindowState>
  ) {}

  allow(key: string, now: number): RateLimitDecision {
    const windowStartMs = Math.floor(now / this.windowMs) * this.windowMs;
    const resetAtMs = windowStartMs + this.windowMs;

    let state = this.store.get(key);
    if (!state || state.windowStartMs !== windowStartMs) {
      state = { windowStartMs, count: 0 }; // new window: counter resets
    }

    if (state.count >= this.limit) {
      // Do NOT increment on rejection — rejected requests must not consume quota,
      // or a client at the limit can lock itself out indefinitely.
      this.store.set(key, state);
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: resetAtMs - now,
        limit: this.limit,
        resetAtMs,
      };
    }

    state.count += 1;
    this.store.set(key, state);
    return {
      allowed: true,
      remaining: this.limit - state.count,
      retryAfterMs: 0,
      limit: this.limit,
      resetAtMs,
    };
  }
}
```

**The boundary-burst flaw — say this unprompted.** With a limit of 100/min: a client sends 100 requests at `00:59.9` (window A) and 100 more at `01:00.1` (window B). Both windows individually respect the limit, but the service absorbed **200 requests in 0.2 seconds** — 2× the intended rate concentrated at the window edge. Any client that learns your window alignment can double its effective rate forever. This flaw is *the reason* the two sliding-window variants exist.

**Interview trap:** "Why not increment the counter on rejected requests too?" Because then a client stuck in a retry loop *keeps its own quota consumed* — rejections extend the lockout and the client may never recover even at a polite retry rate. Rejections should be free; only admitted requests spend quota. (The exception: if you're defending against abuse and *want* punitive behavior, make it an explicit config flag, not an accident.)

### 3.3 Sliding Window Log

Exact limiting: keep every admitted request's timestamp; count how many fall inside `(now - windowMs, now]`. Perfectly accurate — the boundary-burst flaw is impossible — at the cost of O(limit) memory per key and O(n) pruning.

```ts
export class SlidingWindowLogStrategy implements RateLimitStrategy {
  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly store: StateStore<number[]>
  ) {}

  allow(key: string, now: number): RateLimitDecision {
    const cutoff = now - this.windowMs;
    const log = this.store.get(key) ?? [];

    // Prune expired timestamps. The array is append-only in time order, so
    // expired entries form a prefix — find its end and slice once.
    let firstLive = 0;
    while (firstLive < log.length && log[firstLive] <= cutoff) firstLive++;
    const live = firstLive > 0 ? log.slice(firstLive) : log;

    if (live.length >= this.limit) {
      // The oldest live timestamp is the one whose expiry frees a slot.
      const oldest = live[0];
      const retryAfterMs = oldest + this.windowMs - now;
      this.store.set(key, live);
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs,
        limit: this.limit,
        resetAtMs: oldest + this.windowMs,
      };
    }

    live.push(now);
    this.store.set(key, live);
    return {
      allowed: true,
      remaining: this.limit - live.length,
      retryAfterMs: 0,
      limit: this.limit,
      resetAtMs: live[0] + this.windowMs,
    };
  }
}
```

Two senior details worth narrating:

1. **`retryAfterMs` is exact here** — it's literally "when the oldest in-window request ages out." Fixed window can only say "when the window resets"; the log can say "in 340ms a slot frees up."
2. **Memory is bounded by the limit, not the traffic**, *because rejected requests are not logged*. A key can hold at most `limit` timestamps. If you logged rejections too, an attacker at 10k rps would grow the array without bound — a memory DoS via the very component meant to stop DoS.

Use this when limits are small and correctness is contractual (per-tenant paid quotas, login attempt limits). At `limit = 10_000` per key it's the wrong tool.

### 3.4 Sliding Window Counter

The pragmatic sweet spot: fixed-window memory (two counters), near-sliding-log accuracy. Keep the previous window's final count and the current window's count; estimate the rolling-window total by *weighting the previous window by how much of it still overlaps the sliding window*:

```
estimated = previousCount × (overlap fraction) + currentCount
overlap  = (windowMs − elapsedInCurrentWindow) / windowMs
```

The assumption: the previous window's requests were evenly distributed. Real traffic isn't perfectly even, so the estimate has bounded error (Cloudflare measured ~0.003% of requests wrongly allowed/blocked across 400M requests when they deployed this). For API protection that's free accuracy.

```ts
interface SlidingCounterState {
  currentWindowStartMs: number;
  currentCount: number;
  previousCount: number;
}

export class SlidingWindowCounterStrategy implements RateLimitStrategy {
  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly store: StateStore<SlidingCounterState>
  ) {}

  allow(key: string, now: number): RateLimitDecision {
    const windowStartMs = Math.floor(now / this.windowMs) * this.windowMs;
    let state = this.store.get(key);

    if (!state) {
      state = { currentWindowStartMs: windowStartMs, currentCount: 0, previousCount: 0 };
    } else if (state.currentWindowStartMs !== windowStartMs) {
      // We've moved to a new window. If it's the immediately-next window, the
      // old current becomes "previous". If we skipped whole windows (idle key),
      // previous is 0 — there was no traffic in the adjacent window.
      const isAdjacent = windowStartMs - state.currentWindowStartMs === this.windowMs;
      state = {
        currentWindowStartMs: windowStartMs,
        currentCount: 0,
        previousCount: isAdjacent ? state.currentCount : 0,
      };
    }

    const elapsed = now - windowStartMs;
    const previousWeight = (this.windowMs - elapsed) / this.windowMs;
    const estimated = state.previousCount * previousWeight + state.currentCount;

    if (estimated >= this.limit) {
      this.store.set(key, state);
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: this.computeRetryAfter(state, elapsed),
        limit: this.limit,
        resetAtMs: windowStartMs + this.windowMs,
      };
    }

    state.currentCount += 1;
    this.store.set(key, state);
    return {
      allowed: true,
      remaining: Math.max(0, Math.floor(this.limit - estimated) - 1),
      retryAfterMs: 0,
      limit: this.limit,
      resetAtMs: windowStartMs + this.windowMs,
    };
  }

  /**
   * Solve for the smallest t where the weighted estimate drops below the limit:
   *   previousCount × (windowMs − (elapsed + t)) / windowMs + currentCount < limit
   * If currentCount alone already meets the limit, only a window rollover helps.
   */
  private computeRetryAfter(state: SlidingCounterState, elapsed: number): number {
    const untilRollover = this.windowMs - elapsed;
    const headroom = this.limit - state.currentCount;
    if (headroom <= 0 || state.previousCount === 0) return untilRollover;

    const targetWeight = headroom / state.previousCount; // want weight < this
    if (targetWeight >= 1) return 1; // already below; admit on next attempt
    const targetElapsed = this.windowMs * (1 - targetWeight);
    return Math.max(1, Math.min(untilRollover, Math.ceil(targetElapsed - elapsed)));
  }
}
```

Narrate the tradeoff explicitly: **exactness traded for O(1) memory**, error bounded by the evenness assumption, and it degrades gracefully — worst case it behaves like a slightly conservative fixed window, never like an open gate.

### 3.5 Token Bucket

The only algorithm here that models *rate* and *burst* as separate knobs. A bucket holds up to `capacity` tokens; tokens drip in at `refillRatePerMs`; each request spends one token. A full bucket lets a client burst `capacity` requests instantly, then sustain exactly the refill rate.

The crucial implementation decision: **lazy refill**. No `setInterval` topping up buckets — with a million keys that's a million timers (or one timer doing a million-key scan every tick). Instead, store `(tokens, lastRefillMs)` and compute elapsed-time refill *on access*. Idle buckets cost nothing; math replaces machinery.

```ts
interface TokenBucketState {
  tokens: number;
  lastRefillMs: number;
}

export class TokenBucketStrategy implements RateLimitStrategy {
  private readonly refillRatePerMs: number;

  constructor(
    limitPerWindow: number,
    windowMs: number,
    private readonly capacity: number,
    private readonly store: StateStore<TokenBucketState>
  ) {
    // "limit per window" expressed as a continuous refill rate.
    this.refillRatePerMs = limitPerWindow / windowMs;
  }

  allow(key: string, now: number): RateLimitDecision {
    let state = this.store.get(key);
    if (!state) {
      state = { tokens: this.capacity, lastRefillMs: now }; // new keys start full
    }

    // Lazy refill: elapsed time × rate, capped at capacity.
    // Guard elapsed at 0 in case a caller ever passes a stale `now`.
    const elapsed = Math.max(0, now - state.lastRefillMs);
    const tokens = Math.min(this.capacity, state.tokens + elapsed * this.refillRatePerMs);

    if (tokens < 1) {
      const deficit = 1 - tokens;
      const retryAfterMs = Math.ceil(deficit / this.refillRatePerMs);
      this.store.set(key, { tokens, lastRefillMs: now });
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs,
        limit: this.capacity,
        resetAtMs: now + Math.ceil((this.capacity - tokens) / this.refillRatePerMs),
      };
    }

    const remainingTokens = tokens - 1;
    this.store.set(key, { tokens: remainingTokens, lastRefillMs: now });
    return {
      allowed: true,
      remaining: Math.floor(remainingTokens),
      retryAfterMs: 0,
      limit: this.capacity,
      resetAtMs: now + Math.ceil((this.capacity - remainingTokens) / this.refillRatePerMs),
    };
  }
}
```

Note `tokens` is a **float** and stays one. Rounding on every operation accumulates error; round only at the display boundary (`remaining`). Also note we persist the refill even on rejection — the elapsed time has been "banked" into `tokens` and `lastRefillMs` moved forward, so we never double-count the same elapsed interval.

**Interview trap:** "Why not a `setInterval` that adds a token every 100ms?" Three reasons: (1) it doesn't scale past a handful of keys, (2) timers drift and fire late under event-loop load, so your refill rate silently degrades exactly when the system is busiest, and (3) it makes the algorithm untestable without real sleeping. Lazy computation is deterministic, per-key free, and testable with a fake clock. This one question separates candidates who've built limiters from candidates who've read about them.

### 3.6 The manager: factory, rule resolution, key composition

```ts
type AnyStrategy = RateLimitStrategy;

/** Algorithm name → configured strategy instance. Classic Factory. */
export class StrategyFactory {
  constructor(private readonly clock: ClockProvider, private readonly storeIdleTtlMs: number) {}

  create(rule: RateLimitRule): AnyStrategy {
    // Each strategy gets its own store: state shapes differ per algorithm,
    // and per-rule stores mean a rule change can drop exactly its own state.
    switch (rule.algorithm) {
      case 'fixed-window':
        return new FixedWindowStrategy(
          rule.limit, rule.windowMs,
          new MemoryStore<FixedWindowState>(this.clock, this.storeIdleTtlMs)
        );
      case 'sliding-window-log':
        return new SlidingWindowLogStrategy(
          rule.limit, rule.windowMs,
          new MemoryStore<number[]>(this.clock, this.storeIdleTtlMs)
        );
      case 'sliding-window-counter':
        return new SlidingWindowCounterStrategy(
          rule.limit, rule.windowMs,
          new MemoryStore<SlidingCounterState>(this.clock, this.storeIdleTtlMs)
        );
      case 'token-bucket':
        return new TokenBucketStrategy(
          rule.limit, rule.windowMs, rule.burstCapacity ?? rule.limit,
          new MemoryStore<TokenBucketState>(this.clock, this.storeIdleTtlMs)
        );
      default: {
        // Exhaustiveness check: adding an AlgorithmName without a case
        // becomes a compile error, not a runtime surprise.
        const never: never = rule.algorithm;
        throw new Error(`Unknown algorithm: ${String(never)}`);
      }
    }
  }
}
```

Rule resolution — most specific wins. With optional `tenant` and `endpoint` there are exactly four specificity levels, checked in order:

```ts
interface CompiledRule {
  rule: RateLimitRule;
  strategy: AnyStrategy;
}

export class RateLimiterManager implements RateLimiterManagerApi {
  /** Keyed by `${tenant ?? '*'}|${endpoint ?? '*'}`. */
  private rulesByScope = new Map<string, CompiledRule>();

  constructor(
    private readonly factory: StrategyFactory,
    private readonly clock: ClockProvider,
    rules: RateLimitRule[]
  ) {
    this.rulesByScope = RateLimiterManager.compile(rules, factory);
  }

  private static compile(rules: RateLimitRule[], factory: StrategyFactory): Map<string, CompiledRule> {
    const map = new Map<string, CompiledRule>();
    for (const rule of rules) {
      const scopeKey = `${rule.tenant ?? '*'}|${rule.endpoint ?? '*'}`;
      if (map.has(scopeKey)) {
        throw new Error(`Duplicate rule scope: ${scopeKey} (rule ${rule.id})`);
      }
      map.set(scopeKey, { rule, strategy: factory.create(rule) });
    }
    if (!map.has('*|*')) {
      throw new Error('A global default rule (no tenant, no endpoint) is required.');
    }
    return map;
  }

  /** Precedence: tenant+endpoint > tenant > endpoint > global default. */
  private resolveRule(ctx: RequestContext): CompiledRule {
    return (
      this.rulesByScope.get(`${ctx.tenant}|${ctx.endpoint}`) ??
      this.rulesByScope.get(`${ctx.tenant}|*`) ??
      this.rulesByScope.get(`*|${ctx.endpoint}`) ??
      this.rulesByScope.get('*|*')! // compile() guarantees the default exists
    );
  }

  /**
   * Key composition. The key's granularity must match the rule's scope:
   * - a tenant-wide rule shares one budget across ALL endpoints for a user,
   *   so the endpoint must NOT appear in its key;
   * - an endpoint-scoped rule budgets per endpoint, so it must.
   * Getting this wrong silently turns "1000/min per tenant" into
   * "1000/min per tenant PER ENDPOINT" — a limit nobody configured.
   */
  private composeKey(compiled: CompiledRule, ctx: RequestContext): string {
    const endpointPart = compiled.rule.endpoint !== undefined ? ctx.endpoint : '*';
    return `${compiled.rule.id}:${ctx.tenant}:${endpointPart}:${ctx.userId}`;
  }

  check(ctx: RequestContext): RateLimitDecision {
    const compiled = this.resolveRule(ctx);
    const key = this.composeKey(compiled, ctx);
    return compiled.strategy.allow(key, this.clock.now());
  }

  /**
   * Hot reload: compile the new rules fully, THEN swap the reference.
   * Compilation can throw (duplicate scope, missing default) — a bad config
   * must never leave the manager half-updated. The swap is a single
   * assignment: atomic with respect to the event loop, so every request
   * sees either the old ruleset or the new one, never a mix.
   */
  replaceRules(rules: RateLimitRule[]): void {
    const compiled = RateLimiterManager.compile(rules, this.factory);
    this.rulesByScope = compiled;
  }
}
```

**Interview trap:** Rule IDs are part of the key. When a rule's policy changes (new `id` or changed limit), old keys stop matching and state starts fresh — which is usually what you want after an incident-response tightening ("everyone gets a clean, stricter window"). If instead you want to *preserve* in-flight counts across reloads, keep the `id` stable and only the limit changes take effect. Say this tradeoff out loud; most candidates never notice reload interacts with live state at all.

### 3.7 Express middleware adapter

The manager knows nothing about HTTP; the adapter translates `RateLimitDecision` into status codes and headers. Structural types keep this file dependency-free while matching Express's shape.

```ts
interface HttpRequestLike {
  path: string;
  header(name: string): string | undefined;
}

interface HttpResponseLike {
  setHeader(name: string, value: string | number): void;
  status(code: number): HttpResponseLike;
  json(body: unknown): void;
}

type NextFn = (err?: unknown) => void;

export interface ContextExtractor {
  (req: HttpRequestLike): RequestContext;
}

export function rateLimitMiddleware(
  manager: RateLimiterManagerApi,
  extract: ContextExtractor
): (req: HttpRequestLike, res: HttpResponseLike, next: NextFn) => void {
  return (req, res, next) => {
    let decision: RateLimitDecision;
    try {
      decision = manager.check(extract(req));
    } catch (err) {
      // Fail-open vs fail-closed is a POLICY decision. For availability-first
      // APIs, a broken limiter should not take the product down: fail open,
      // but loudly (metrics/alerts). For abuse-sensitive endpoints (login,
      // OTP), fail closed. Make it configurable; default open.
      next();
      return;
    }

    res.setHeader('X-RateLimit-Limit', decision.limit);
    res.setHeader('X-RateLimit-Remaining', decision.remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(decision.resetAtMs / 1000)); // epoch seconds

    if (decision.allowed) {
      next();
      return;
    }

    res.setHeader('Retry-After', Math.max(1, Math.ceil(decision.retryAfterMs / 1000)));
    res.status(429).json({
      error: 'rate_limited',
      message: 'Too many requests.',
      retryAfterMs: decision.retryAfterMs,
    });
  };
}

/** Typical wiring: */
export function buildDefaultLimiter(): RateLimiterManagerApi {
  const clock = new SystemClock();
  const factory = new StrategyFactory(clock, /* idle TTL */ 10 * 60_000);
  return new RateLimiterManager(factory, clock, [
    { id: 'global-default', limit: 100, windowMs: 60_000, algorithm: 'sliding-window-counter' },
    { id: 'export-strict', endpoint: '/export', limit: 5, windowMs: 60_000, algorithm: 'sliding-window-log' },
    { id: 'acme-enterprise', tenant: 'acme', limit: 5_000, windowMs: 60_000, algorithm: 'token-bucket', burstCapacity: 500 },
    { id: 'acme-export', tenant: 'acme', endpoint: '/export', limit: 50, windowMs: 60_000, algorithm: 'sliding-window-log' },
  ]);
}
```

### 3.8 Thread-safety in Node — the honest version

Say this precisely, because hand-waving here is a red flag in both directions:

- **A single Node process runs your JS on one thread.** Every `allow()` above is fully synchronous: read state → compute → write state with no `await` in between. The event loop cannot preempt mid-function, so there are **no data races in this code**. Adding mutexes here would be cargo-culting Java.
- **BUT: check-then-act across an `await` is racy even in Node.** The moment the read and the write are separated by an await point — `const state = await store.get(key); ...; await store.set(key, next)` — another request's callback interleaves between them and both requests read the same count. This is exactly what happens the instant the store becomes async (Redis), which is why Step 4's answer is *atomic server-side scripts*, not "get, modify, set over the network."
- **Multi-process is where atomicity genuinely matters.** Two Node instances have no shared event loop; only the shared store can arbitrate, and it must do the read-modify-write as one atomic operation.

So: single process, sync store → correct by construction. Async store or multiple processes → atomicity must move into the store. Knowing *which regime you're in* is the senior skill.

---

## Step 4: Extensibility follow-ups

**Interviewer:** Nice. Now make it work across 10 Node instances behind a load balancer.

**You:** The strategies stay conceptually identical; the state and the atomicity move into Redis. The trap to name explicitly: you cannot port `allow()` as `GET` → compute in Node → `SET`. Between the GET and the SET, requests on other instances read the same stale count — with 10 instances at the window edge, a limit of 100 admits up to 10 extra requests per race window, and under bursty load it's worse. The fix is making the whole read-modify-write atomic *inside Redis*. Three tools, matched to the algorithms:

*Fixed window* — no script needed; `INCR` is already atomic:

```
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])  -- set TTL only on window creation
end
return count
```

Even this tiny one is worth scripting: doing `INCR` then `EXPIRE` as two client commands leaves a crash window where the key becomes immortal — a counter with no TTL rejects forever.

*Sliding window log* — a sorted set per key, score = timestamp:

```
-- KEYS[1] = log key
-- ARGV[1] = windowMs, ARGV[2] = now (ms), ARGV[3] = limit, ARGV[4] = unique member id
redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, ARGV[2] - ARGV[1])   -- prune expired
local count = redis.call('ZCARD', KEYS[1])
if count < tonumber(ARGV[3]) then
  redis.call('ZADD', KEYS[1], ARGV[2], ARGV[4])                 -- member must be unique per request
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  return {1, tonumber(ARGV[3]) - count - 1}
end
local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
return {0, 0, tonumber(oldest[2]) + tonumber(ARGV[1]) - tonumber(ARGV[2])}  -- retryAfterMs
```

*Token bucket* — the complete script, a line-for-line port of the lazy-refill logic:

```
-- KEYS[1] = bucket key
-- ARGV[1] = capacity, ARGV[2] = refill rate (tokens/ms), ARGV[3] = now (ms), ARGV[4] = cost
local capacity = tonumber(ARGV[1])
local rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local cost = tonumber(ARGV[4])

local state = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local tokens = tonumber(state[1])
local ts = tonumber(state[2])
if tokens == nil then
  tokens = capacity
  ts = now
end

local elapsed = math.max(0, now - ts)
tokens = math.min(capacity, tokens + elapsed * rate)

local allowed = 0
if tokens >= cost then
  tokens = tokens - cost
  allowed = 1
end

redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', now)
-- TTL = time to refill an empty bucket, doubled for safety: idle keys evict themselves.
redis.call('PEXPIRE', KEYS[1], math.ceil(capacity / rate) * 2)

local retry_after = 0
if allowed == 0 then
  retry_after = math.ceil((cost - tokens) / rate)
end
return {allowed, math.floor(tokens), retry_after}
```

Scripts run atomically — Redis is single-threaded per shard, so the script is a critical section for free. Load it once with `SCRIPT LOAD`, call by SHA with `EVALSHA`, fall back to `EVAL` on `NOSCRIPT` (e.g., after a failover to a replica that never saw the script). In our design this is just a new `StateStore`/strategy pair behind the same `RateLimitStrategy` interface — the manager, rules, and middleware don't change. I'd also mention **Redis Cell** (`CL.THROTTLE`), a Redis module implementing GCRA server-side — great when you can install modules, but Lua keeps you on stock Redis, including most managed offerings.

**Interviewer:** Ten app nodes means ten clocks. What about clock skew?

**You:** Skew directly corrupts time-based math: a node 2 seconds fast computes 2 extra seconds of token refill; two nodes disagreeing about which fixed window "now" is in will maintain *two* live windows for the same key. NTP keeps skew small but not zero, and containers drift. The clean fix: **stop passing `now` from the app and use Redis as the single clock source** — call `redis.call('TIME')` *inside* the Lua script instead of taking `ARGV[now]`. All decisions across all nodes now share one clock. Caveat: a script that calls `TIME` is non-deterministic from replication's perspective, which is fine on modern Redis (effects-based replication) but worth knowing historically. This is also a beautiful payoff of the `ClockProvider` abstraction: "which clock?" was a first-class design question from line one, so the answer is a one-line change in the script, not a refactor.

**Interviewer:** Suppose one tenant is huge — a single hot key doing 50k rps. Redis is now your bottleneck.

**You:** Layer it: **L1 local + L2 Redis**. Each node keeps a local token bucket for the hot key holding a *lease* — a slice of the global budget (global limit / node count, or demand-weighted). Requests are decided locally at memory speed; nodes sync their consumption to Redis asynchronously every N ms, **with jitter** on the sync interval so 10 nodes don't stampede Redis on the same tick. The price is honesty about accuracy: enforcement becomes approximate — worst-case overshoot is bounded by `(nodes × sync interval × per-node rate)`, and you tune the sync interval to keep that bound acceptable. For rate limiting this is almost always the right trade; it's protection, not accounting. Two supporting moves: detect hot keys dynamically (promote a key to leased mode when its local hit rate crosses a threshold) and, if it's genuinely about Redis capacity rather than one key, shard keys across a Redis Cluster — hash-tagging keeps each key's state on one shard so scripts stay single-shard atomic.

**Interviewer:** You're behind a load balancer without sticky sessions. How do you rate limit *fairly*?

**You:** First, name the failure mode: with purely local limiters and random LB spreading, a user's requests scatter across 10 nodes, each of which sees ~1/10th of their traffic — so a per-node limit of 100 effectively becomes ~1000 globally, and worse, it's *unfair*: a user whose requests happen to concentrate on one node gets throttled while an identical user spread evenly doesn't. Options, in order of preference: (1) **shared store** (the Redis design) — the LB's routing becomes irrelevant because state is centralized; this is the real answer. (2) Local limits set to `global / N` — simple but wrong under uneven spread and breaks on autoscaling since N changes. (3) Sticky sessions by user hash — makes local limiting correct per user but creates hot nodes and fights the LB's purpose. (4) Rate limit at the edge (API gateway, or the LB itself) where there's exactly one enforcement point. In practice: shared store for correctness, plus a generous local circuit-breaker limit per node purely as self-protection if Redis degrades.

**Interviewer:** Ops wants to tighten a tenant's limit during an incident, no restart. How does config hot reload work?

**You:** The mechanics are already in `replaceRules`: validate and compile the entire new ruleset first (bad config throws and changes nothing), then swap the registry reference in one assignment — atomic with respect to the event loop, so no request ever sees a half-applied ruleset. What feeds it: a config service watch (etcd/Consul), a Redis pub/sub channel the nodes subscribe to, or a polled S3/DB config with a version field — anything that eventually calls `replaceRules` on every node. The two subtleties worth volunteering: (1) **state across reloads** — because rule `id` is part of the storage key, changing the id resets everyone's window (clean-slate semantics, usually right for incident response), while keeping the id preserves counts and only tightens the ceiling; pick deliberately per change. (2) **version skew during rollout** — for a few seconds different nodes run different rules; with a shared store, keep old and new rule state disjoint (the id in the key does this) so mixed-version nodes never fight over the same counter with different limits.

**Interviewer:** How would you test the boundary conditions? Windows, refill timing, that kind of thing.

**You:** This is exactly why `ClockProvider` exists and `Date.now()` appears in exactly one class. Every boundary becomes a deterministic test with `FakeClock` — no sleeps, no flakes, sub-millisecond precision:

```ts
// Fixed window boundary-burst: documents the known flaw as executable spec.
const clock = new FakeClock(0);
const store = new MemoryStore<FixedWindowState>(clock, 600_000);
const fw = new FixedWindowStrategy(100, 60_000, store);

clock.set(59_900);
for (let i = 0; i < 100; i++) assertTrue(fw.allow('k', clock.now()).allowed);
assertFalse(fw.allow('k', clock.now()).allowed);   // 101st in window A: rejected

clock.set(60_100);                                  // 200ms later, window B
assertTrue(fw.allow('k', clock.now()).allowed);     // fresh 100 available: the 2x flaw, proven

// Token bucket refill precision:
const tb = new TokenBucketStrategy(60, 60_000, 10, new MemoryStore(clock, 600_000)); // 1 token/sec, burst 10
for (let i = 0; i < 10; i++) assertTrue(tb.allow('k', clock.now()).allowed); // drain the burst
assertFalse(tb.allow('k', clock.now()).allowed);
clock.advance(999);
assertFalse(tb.allow('k', clock.now()).allowed);    // 0.999 tokens: still short
clock.advance(1);
assertTrue(tb.allow('k', clock.now()).allowed);     // exactly 1 token at 1000ms
```

Beyond unit tests: property-based tests (random request sequences; invariant: admitted count in any sliding interval never exceeds limit + algorithm's documented error bound), a `Retry-After` honesty test (wait exactly `retryAfterMs`, the next request must succeed), sweep tests (advance the fake clock past the TTL, call `sweep()`, assert `size() === 0`), and for the Redis version, concurrency tests firing N parallel `EVALSHA`s and asserting admitted ≤ limit exactly.

**Interviewer:** Last one — leaky bucket vs token bucket. When each?

**You:** They're duals with opposite attitudes toward bursts. **Token bucket** *admits* bursts: capacity accumulates while idle, so a client can spend 500 tokens instantly and then sustain the refill rate — output is bursty, matching how real API clients behave (batch jobs, page loads firing 20 calls). **Leaky bucket** *erases* bursts: requests enter a queue that drains at a fixed rate, so downstream sees perfectly smooth traffic no matter how lumpy the input — at the cost of queueing delay, queue memory, and a drop policy when the queue fills. Use token bucket for API quota enforcement (clients deserve their bursts). Use leaky bucket when the *downstream* is the fragile thing — a legacy service that genuinely cannot exceed 50 rps, an outbound third-party API with its own hard limit — and you're shaping traffic to protect it. Also worth naming: leaky bucket "as a meter" (no queue, just reject) is mathematically equivalent to GCRA, which is what Redis Cell implements — so the vocabulary overlaps more than the blog posts admit.

---

## Step 5: What gets you rejected

- **Jumping to Redis before nailing the in-process design.** The interviewer asked for a rate limit *manager*, and the first 30 minutes are about interfaces, algorithms, and rule resolution. Opening with "so I'd use Redis" signals you reach for infrastructure to avoid design. Distribution is a Step-4 answer delivered through a Step-2 abstraction (`StateStore`), and the strongest candidates say exactly that sentence early.
- **`setInterval` for token refill.** The classic junior implementation: a timer per bucket (or a global tick scanning all buckets) topping up tokens. It's O(keys) background work, drifts under load, keeps the event loop busy for idle keys, and is untestable without real time passing. Lazy refill — compute elapsed × rate on access — is strictly better and is the answer the interviewer is fishing for.
- **`Date.now()` hardcoded inside algorithms.** The moment time is unmockable, every boundary condition (window edges, refill precision, TTL expiry) becomes untestable or a `sleep()`-ridden flake. One `ClockProvider` interface costs five lines and is the difference between "I write testable systems" and "I hope."
- **Unbounded memory per key.** Two flavors of the same failure: a `Map` that never evicts idle keys (every scanner-probed API key lives in your heap forever), and a sliding-window log that records *rejected* requests (an attacker grows your arrays at their sending rate). State needs a TTL, logs must only record admissions, and you should be able to state the per-key memory bound of every algorithm you propose.
- **Ignoring rule-resolution precedence.** A flat "limit per user" answer ignores the multi-tenant requirement you were explicitly given in clarification. The tenant+endpoint > tenant > endpoint > default cascade — and the matching key-granularity logic — is where the "manager" in "Rate Limit Manager" actually lives. Skipping it means you solved a different, easier problem.
- **Only knowing one algorithm.** "I'd use a fixed window counter" with no mention of the boundary-burst flaw, or "token bucket" with no ability to explain what sliding-window-counter trades against sliding-window-log, reads as memorized-not-understood. The senior signal is the *comparison table in your head*: memory bound, accuracy, burst behavior, retry-after quality — per algorithm.
- **Storing per-key state inside the strategy instance.** Fields like `this.count` and `this.windowStart` mean one strategy instance serves exactly one key, so you're constructing objects per user per endpoint — and the design can never move to a shared store because the state is trapped in process-local object fields. State belongs in the store, keyed; the strategy is configuration plus pure logic. This one mistake quietly breaks sharing, distribution, and testability all at once.
- **Claiming you need locks in single-process Node — or claiming you never need atomicity at all.** Both directions fail. Synchronous code on one event loop has no data races; async check-then-act and multi-process absolutely do. Precision about *which regime you're in* is the thread-safety answer; a mutex library in a sync Node code path and a naive GET/SET against Redis are the two mirrored ways to get this wrong.
