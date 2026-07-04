# Polling, Snake Game & Misc Classics - Machine Coding Round

Four shorter machine-coding classics that each fit in 20-30 minutes. Interviewers use these when the round is 45-60 minutes and they want two problems, or as a warm-up before a design discussion. All four are judged the same way: working code, passing test cases, clean separation of logic from I/O.

## The four problems

### 1. Snake game

> Implement the classic Snake game as a console application. The game runs on a W x H grid. The snake moves one cell per tick in its current direction. Eating food grows the snake by one and increases the score; food respawns on a random free cell. The game ends when the snake hits a wall or itself. Reversing direction 180 degrees must be ignored. Provide a `tick()` method that advances the game one step and a `render()` method that returns the grid as an ASCII string. The core logic must be unit-testable without any terminal I/O.

Requirements:
- Grid of configurable width/height; snake stored so head/tail updates are cheap and self-collision checks are O(1).
- Injectable RNG so food placement is deterministic in tests; food never spawns on the snake.
- Explicit game state (`RUNNING` / `GAME_OVER`), score, growth on eating.
- No `setInterval`, no `readline` inside the game class — a thin driver may sit outside.

### 2. Promise pool / `mapWithConcurrency`

> Implement `mapWithConcurrency<T, R>(items, limit, fn)` that maps `fn` over `items` running at most `limit` calls concurrently. Results must be returned in the same order as the input regardless of completion order. Support a fail-fast mode (reject on the first error) and a settle-all mode (run everything, collect errors). No external libraries.

Requirements:
- Real concurrency limiting — at no point may more than `limit` calls be in flight.
- Works when `limit >= items.length` and when `limit === 1` (sequential).
- Result order == input order.
- Two idiomatic implementations expected at senior level: worker loop with a shared index, and a `Set` of in-flight promises with `Promise.race`.

### 3. `debounce` and `throttle`

> Implement `debounce(fn, wait, options)` and `throttle(fn, wait, options)` with `leading` and `trailing` options (lodash semantics), plus `cancel()` and `flush()` methods on the returned function. `this` and arguments must be forwarded correctly. Make the timer functions injectable so the implementation is testable with fake timers.

Requirements:
- Debounce defaults: `leading: false, trailing: true`. Throttle defaults: `leading: true, trailing: true`.
- Leading+trailing interaction must match lodash: the trailing edge only fires if the function was called again after the leading invocation.
- Trailing invocation must use the most recent `this` and args seen.
- No leaked timers after `cancel()`.

### 4. Retry with circuit breaker

> Implement `retry(fn, {attempts, backoff, jitter})` with exponential backoff and jitter. Then implement a `CircuitBreaker` class with CLOSED / OPEN / HALF_OPEN states: it opens after a failure threshold (count or failure rate within a rolling window), stays open for a configurable duration, then allows a limited number of probe calls in HALF_OPEN; enough probe successes close it, any probe failure re-opens it. Support a fallback, event hooks for metrics, and an injectable clock for testing.

Requirements:
- Both count-based and rate-based tripping (rate mode needs a minimum request volume).
- HALF_OPEN admits at most K concurrent probes; extra calls are rejected like OPEN.
- `successThreshold` probe successes to close; one probe failure re-opens.
- A predicate to decide what counts as a failure (4xx should not trip the breaker).
- Injectable `now()` so tests never sleep.

## Approach & time budget

You will typically get **two** of these in one round. Snake is the most common standalone; pool + debounce often come as a pair; retry/breaker shows up in backend-flavored FDE loops. Plan for 20-30 minutes each including tests.

**Snake (25-30 min).** Narrate the data-structure decision first: body as a deque (array with head-at-front is fine) plus a `Set` of serialized coordinates for O(1) collision checks. State the tick order out loud — apply buffered direction, compute new head, wall check, *remove tail if not eating*, then self-collision check, then push head. Getting that order right is the whole problem. Write `tick()` and `setDirection()` before `render()`; render is trivia, logic is the grade. 5 min: types and class skeleton. 12 min: `tick`, direction buffering, food spawn. 5 min: `render`. Remaining: tests with a seeded RNG.

**Pool (20 min).** Say immediately: "`Promise.all` on all items is not a pool, and batching in chunks of `limit` wastes capacity — I'll do a worker loop." Write the worker-loop version first (8 min), assert order preservation by writing into `results[i]`, then the fail-fast/settle-all option (5 min). Mention the `Set` + `Promise.race` alternative; write it if time permits.

**Debounce/throttle (20-25 min).** Start with trailing-only debounce (5 min), then add `leading`, `cancel`, `flush` (8 min). State lodash semantics before coding them — interviewers probe exactly the leading+trailing edge case. Throttle second; use the "time since last invoke" formulation. Inject `setTimeout`/`clearTimeout`/`now` from the start so your tests don't sleep.

**Retry + breaker (25-30 min).** `retry` is 10 minutes — loop, backoff formula, full jitter, injectable sleep. The breaker is a state machine: draw the three states and four transitions in a comment first, then implement `exec()` as a top-down walk: OPEN (maybe time-based transition to HALF_OPEN, else reject), HALF_OPEN (probe budget), CLOSED (record + maybe trip). The rolling window is just an array of `{at, ok}` pruned on write.

## Implementation

### 1. Snake game

```typescript
// snake.ts — pure game logic, zero I/O.
export type Point = { x: number; y: number };
export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export type GameStatus = 'RUNNING' | 'GAME_OVER';

const DELTA: Record<Direction, Point> = {
  UP: { x: 0, y: -1 }, DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 }, RIGHT: { x: 1, y: 0 },
};
const OPPOSITE: Record<Direction, Direction> = {
  UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT',
};
const key = (p: Point): string => `${p.x},${p.y}`;

export class SnakeGame {
  // body[0] is the head. Array shift/unshift is O(n) but n is tiny; a ring
  // buffer is the drop-in upgrade. The Set is what matters: O(1) membership
  // for collision. Invariant: occupied always mirrors body exactly.
  private body: Point[] = [];
  private occupied = new Set<string>();
  private direction: Direction = 'RIGHT';
  private nextDirection: Direction = 'RIGHT'; // buffered input, applied on tick
  private food: Point | null = null;
  public status: GameStatus = 'RUNNING';
  public score = 0;

  constructor(
    public readonly width: number,
    public readonly height: number,
    private readonly rng: () => number = Math.random,
    start?: Point,
  ) {
    if (width < 2 || height < 2) throw new Error('grid too small');
    const head = start ?? { x: Math.floor(width / 2), y: Math.floor(height / 2) };
    this.body.push(head);
    this.occupied.add(key(head));
    this.food = this.spawnFood();
  }

  get head(): Point { return this.body[0]; }
  get length(): number { return this.body.length; }
  getFood(): Point | null { return this.food; }
  getBody(): readonly Point[] { return this.body; }

  /** Buffered: takes effect next tick. 180-degree turns are ignored (only
   *  meaningful when length > 1 — a 1-cell snake can turn anywhere). */
  setDirection(d: Direction): void {
    if (this.body.length > 1 && d === OPPOSITE[this.direction]) return;
    this.nextDirection = d;
  }

  tick(): void {
    if (this.status !== 'RUNNING') return;
    this.direction = this.nextDirection;
    const d = DELTA[this.direction];
    const newHead: Point = { x: this.head.x + d.x, y: this.head.y + d.y };

    // 1. Wall collision.
    if (newHead.x < 0 || newHead.x >= this.width ||
        newHead.y < 0 || newHead.y >= this.height) {
      this.status = 'GAME_OVER';
      return;
    }
    const eating =
      this.food !== null && newHead.x === this.food.x && newHead.y === this.food.y;

    // 2. If not growing, the tail vacates its cell BEFORE the self-collision
    //    check: moving into the current tail cell is legal when not eating.
    if (!eating) {
      const tail = this.body.pop()!;
      this.occupied.delete(key(tail));
    }
    // 3. Self collision against the remaining body.
    if (this.occupied.has(key(newHead))) {
      this.status = 'GAME_OVER';
      return;
    }
    // 4. Advance.
    this.body.unshift(newHead);
    this.occupied.add(key(newHead));
    if (eating) {
      this.score += 1;
      this.food = this.spawnFood();
    }
  }

  /** Uniformly random free cell; null when the board is full (you won). */
  private spawnFood(): Point | null {
    const free: Point[] = [];
    for (let y = 0; y < this.height; y++)
      for (let x = 0; x < this.width; x++)
        if (!this.occupied.has(`${x},${y}`)) free.push({ x, y });
    if (free.length === 0) return null;
    return free[Math.floor(this.rng() * free.length)];
  }

  render(): string {
    const border = '#'.repeat(this.width + 2);
    const rows: string[] = [border];
    for (let y = 0; y < this.height; y++) {
      let row = '#';
      for (let x = 0; x < this.width; x++) {
        if (this.head.x === x && this.head.y === y) row += 'O';
        else if (this.occupied.has(`${x},${y}`)) row += 'o';
        else if (this.food && this.food.x === x && this.food.y === y) row += '*';
        else row += '.';
      }
      rows.push(row + '#');
    }
    rows.push(border, `score: ${this.score}  status: ${this.status}`);
    return rows.join('\n');
  }
}

// Optional tiny driver — the ONLY place with I/O and timing.
// import * as readline from 'node:readline';
// export function play(): void {
//   const game = new SnakeGame(20, 10);
//   readline.emitKeypressEvents(process.stdin);
//   process.stdin.setRawMode?.(true);
//   const keys: Record<string, Direction> = { up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT' };
//   process.stdin.on('keypress', (_s, k) => {
//     if (k.ctrl && k.name === 'c') process.exit(0);
//     if (k.name in keys) game.setDirection(keys[k.name]);
//   });
//   const timer = setInterval(() => {
//     game.tick();
//     console.clear();
//     console.log(game.render());
//     if (game.status === 'GAME_OVER') { clearInterval(timer); process.exit(0); }
//   }, 150);
// }
```

**Interview trap:** the tail moves out of the way. If the new head lands on the *current tail cell* and the snake is not eating, that is a legal move — the tail vacates in the same tick. Checking self-collision before removing the tail rejects a valid move; checking against the full body including the old tail is the single most common snake bug. (Conversely: when the snake *is* eating, the tail stays, so the same move is fatal.)

### 2. `mapWithConcurrency` (promise pool)

```typescript
// pool.ts
export interface PoolOptions {
  /** true (default): reject on first error. false: run everything, then
   *  throw an AggregateError if anything failed. */
  failFast?: boolean;
}

/** Implementation A: worker loop with a shared index. N workers each pull
 *  the next unclaimed index. `next++` is safe: JS is single-threaded and
 *  the read-increment happens synchronously between awaits. */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
  opts: PoolOptions = {},
): Promise<R[]> {
  if (!Number.isInteger(limit) || limit < 1) throw new Error('limit must be >= 1');
  const failFast = opts.failFast !== false;
  const results = new Array<R>(items.length);
  const errors: Array<{ index: number; error: unknown }> = [];
  let next = 0;
  let aborted = false;

  async function worker(): Promise<void> {
    while (true) {
      const i = next++;                       // claim an index — order preservation
      if (i >= items.length || aborted) return;
      try {
        results[i] = await fn(items[i], i);   // write by index, not by push
      } catch (err) {
        if (failFast) {
          aborted = true;                     // stop other workers pulling new items
          throw err;
        }
        errors.push({ index: i, error: err });
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  if (errors.length > 0) {
    throw new AggregateError(
      errors.map((e) => e.error as Error),
      `${errors.length}/${items.length} items failed`,
    );
  }
  return results;
}

/** Implementation B: Set of in-flight promises + Promise.race backpressure.
 *  Fail-fast by construction (the race rejects). Different mental model:
 *  "admit until full, then wait for any slot to free". */
export async function mapWithConcurrencyRace<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(limit) || limit < 1) throw new Error('limit must be >= 1');
  const results = new Array<R>(items.length);
  const inFlight = new Set<Promise<void>>();
  for (let i = 0; i < items.length; i++) {
    const p: Promise<void> = fn(items[i], i)
      .then((r) => { results[i] = r; })
      .finally(() => { inFlight.delete(p); });
    inFlight.add(p);
    if (inFlight.size >= limit) {
      await Promise.race(inFlight);           // rejects here on first failure
    }
  }
  await Promise.all(inFlight);
  return results;
}
```

**Interview trap:** `Promise.all(items.map(fn))` is not a pool — `.map` runs `fn` eagerly, so every call starts immediately. Equally wrong is chunking (`Promise.all` per batch of `limit`): the whole batch waits for its slowest member, so real concurrency sags below the limit. A correct pool starts a new task the moment any slot frees. Prove yours works with a test that tracks a live `active` counter, not by eyeballing timing.

Note on implementation B: after the first rejection propagates out of `Promise.race`, other still-running promises that later reject become unhandled rejections. In production attach a no-op `.catch` after abort (or prefer implementation A, where each worker owns its error). Saying this unprompted is a senior signal.

### 3. `debounce` and `throttle`

```typescript
// debounce-throttle.ts
type AnyFn = (...args: any[]) => any;

export interface TimerHooks {
  setTimeoutFn?: (fn: () => void, ms: number) => unknown;
  clearTimeoutFn?: (id: unknown) => void;
  nowFn?: () => number;
}
export interface DebounceOptions extends TimerHooks {
  leading?: boolean;   // default false
  trailing?: boolean;  // default true
}
export interface Debounced<F extends AnyFn> {
  (this: ThisParameterType<F>, ...args: Parameters<F>): ReturnType<F> | undefined;
  cancel(): void;
  flush(): ReturnType<F> | undefined;
}

/**
 * Lodash semantics:
 * - trailing only (default): invoke `wait` ms after the LAST call, with the
 *   last call's `this`/args.
 * - leading only: invoke immediately on the first call of a burst; further
 *   calls within `wait` reset the quiet-period timer but invoke nothing.
 * - leading + trailing: invoke on the leading edge, and on the trailing edge
 *   ONLY IF called again after the leading invocation. The leading call
 *   "consumes" its args; a lone call fires once, never twice.
 */
export function debounce<F extends AnyFn>(
  fn: F, wait: number, opts: DebounceOptions = {},
): Debounced<F> {
  const {
    leading = false, trailing = true,
    setTimeoutFn = setTimeout, clearTimeoutFn = clearTimeout,
  } = opts;
  let timer: unknown = null;
  let pendingArgs: Parameters<F> | null = null;
  let pendingThis: unknown = null;
  let result: ReturnType<F> | undefined;

  const invoke = (): void => {
    const args = pendingArgs as Parameters<F>;
    const self = pendingThis;
    pendingArgs = null;                 // consume — prevents double-fire
    pendingThis = null;
    result = fn.apply(self, args);
  };

  const debounced = function (this: unknown, ...args: Parameters<F>) {
    pendingArgs = args;                 // always remember the LATEST call
    pendingThis = this;
    const isLeadingEdge = leading && timer === null;
    if (timer !== null) clearTimeoutFn(timer);
    timer = setTimeoutFn(() => {
      timer = null;
      if (trailing && pendingArgs !== null) invoke();
    }, wait);
    if (isLeadingEdge) invoke();        // consumes pendingArgs; trailing fires
    return result;                      // only if another call re-populates them
  } as Debounced<F>;

  debounced.cancel = () => {
    if (timer !== null) clearTimeoutFn(timer);
    timer = null; pendingArgs = null; pendingThis = null;
  };
  debounced.flush = () => {
    if (timer !== null) {
      clearTimeoutFn(timer);
      timer = null;
      if (pendingArgs !== null) invoke();
    }
    return result;
  };
  return debounced;
}

export interface ThrottleOptions extends TimerHooks {
  leading?: boolean;   // default true
  trailing?: boolean;  // default true
}

/** At most one invocation per `wait` ms. Leading edge fires immediately; if
 *  calls arrive during the cooldown and `trailing` is on, one trailing
 *  invocation fires at window end with the LAST args seen.
 *  `previous === null` means "no invocation yet". */
export function throttle<F extends AnyFn>(
  fn: F, wait: number, opts: ThrottleOptions = {},
): Debounced<F> {
  const {
    leading = true, trailing = true,
    setTimeoutFn = setTimeout, clearTimeoutFn = clearTimeout, nowFn = Date.now,
  } = opts;
  let timer: unknown = null;
  let previous: number | null = null;   // time of last invocation
  let pendingArgs: Parameters<F> | null = null;
  let pendingThis: unknown = null;
  let result: ReturnType<F> | undefined;

  const invoke = (): void => {
    const args = pendingArgs as Parameters<F>;
    const self = pendingThis;
    pendingArgs = null; pendingThis = null;
    result = fn.apply(self, args);
  };
  const later = (): void => {
    previous = leading ? nowFn() : null;
    timer = null;
    if (pendingArgs !== null) invoke();
  };

  const throttled = function (this: unknown, ...args: Parameters<F>) {
    const now = nowFn();
    if (previous === null && !leading) previous = now; // suppress leading edge
    const remaining = previous === null ? 0 : wait - (now - previous);
    pendingArgs = args;                 // trailing must use the LAST args
    pendingThis = this;
    if (remaining <= 0 || remaining > wait) {  // due now (or clock went back)
      if (timer !== null) { clearTimeoutFn(timer); timer = null; }
      previous = now;
      invoke();
    } else if (timer === null && trailing) {
      timer = setTimeoutFn(later, remaining);
    }
    return result;
  } as Debounced<F>;

  throttled.cancel = () => {
    if (timer !== null) clearTimeoutFn(timer);
    timer = null; previous = null; pendingArgs = null; pendingThis = null;
  };
  throttled.flush = () => {
    if (timer !== null) { clearTimeoutFn(timer); later(); }
    return result;
  };
  return throttled;
}
```

**Interview trap:** the trailing invocation must use the **last** args (and `this`) seen during the window, not the first. If you capture args when you schedule the timer instead of on every call, `throttle(save, 1000)` called with `"a"`, `"ab"`, `"abc"` saves `"a"` twice and `"abc"` never. Every call overwrites `pendingArgs`; the timer callback reads whatever is current when it fires.

### 4. Retry + circuit breaker

```typescript
// resilience.ts
export interface RetryOptions {
  attempts: number;                       // total attempts, including the first
  backoff?: number | ((attempt: number) => number); // base ms, or custom schedule
  factor?: number;                        // default 2 (exponential)
  maxDelayMs?: number;                    // cap, default 30_000
  jitter?: 'none' | 'full';               // default 'full' (AWS-style)
  shouldRetry?: (err: unknown) => boolean;
  onRetry?: (err: unknown, attempt: number, delayMs: number) => void;
  sleep?: (ms: number) => Promise<void>;  // injectable for tests
  rng?: () => number;                     // injectable for deterministic jitter
}

const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function retry<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const {
    attempts, backoff = 100, factor = 2, maxDelayMs = 30_000, jitter = 'full',
    shouldRetry = () => true, onRetry, sleep = realSleep, rng = Math.random,
  } = options;
  if (attempts < 1) throw new Error('attempts must be >= 1');
  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      if (attempt === attempts || !shouldRetry(err)) throw err;
      const base = typeof backoff === 'function'
        ? backoff(attempt)
        : Math.min(backoff * factor ** (attempt - 1), maxDelayMs);
      const delayMs = jitter === 'full' ? rng() * base : base;
      onRetry?.(err, attempt, delayMs);
      await sleep(delayMs);
    }
  }
  throw lastErr; // unreachable, satisfies the type checker
}

export type BreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitOpenError extends Error {
  constructor(public readonly breakerState: BreakerState) {
    super(`circuit breaker is ${breakerState}: call rejected`);
    this.name = 'CircuitOpenError';
  }
}

export type BreakerEvent =
  | { type: 'success'; state: BreakerState }
  | { type: 'failure'; state: BreakerState; error: unknown }
  | { type: 'rejected'; state: BreakerState }
  | { type: 'state_change'; from: BreakerState; to: BreakerState };

export interface CircuitBreakerOptions<R> {
  failureThreshold?: number;              // trip on N failures in the window...
  failureRateThreshold?: number;          // ...or on failure rate (0..1)
  minimumRequests?: number;               // rate mode volume floor, default 10
  rollingWindowMs?: number;               // default 10_000
  openDurationMs: number;                 // how long OPEN lasts
  halfOpenMaxProbes?: number;             // K concurrent probes, default 1
  successThreshold?: number;              // probe successes to close, default 1
  isFailure?: (err: unknown) => boolean;  // exclude 4xx etc. Default: all errors
  fallback?: (err: unknown) => R | Promise<R>;
  onEvent?: (e: BreakerEvent) => void;    // metrics hook
  now?: () => number;                     // injectable clock
}

export class CircuitBreaker<Args extends unknown[], R> {
  private state_: BreakerState = 'CLOSED';
  private window: Array<{ at: number; ok: boolean }> = [];
  private openedAt = 0;
  private probesInFlight = 0;
  private probeSuccesses = 0;

  constructor(
    private readonly action: (...args: Args) => Promise<R>,
    private readonly opts: CircuitBreakerOptions<R>,
  ) {
    if (opts.failureThreshold === undefined && opts.failureRateThreshold === undefined) {
      throw new Error('need failureThreshold or failureRateThreshold');
    }
  }

  get state(): BreakerState { return this.state_; }
  private now(): number { return (this.opts.now ?? Date.now)(); }
  private isFailure(err: unknown): boolean {
    return (this.opts.isFailure ?? (() => true))(err);
  }

  async exec(...args: Args): Promise<R> {
    if (this.state_ === 'OPEN') {
      if (this.now() - this.openedAt >= this.opts.openDurationMs) {
        this.transition('HALF_OPEN');
        this.probesInFlight = 0;
        this.probeSuccesses = 0;
      } else {
        return this.reject();
      }
    }

    if (this.state_ === 'HALF_OPEN') {
      if (this.probesInFlight >= (this.opts.halfOpenMaxProbes ?? 1)) {
        return this.reject();           // probe budget exhausted — act like OPEN
      }
      this.probesInFlight++;
      try {
        const result = await this.action(...args);
        this.onProbeSuccess();
        return result;
      } catch (err) {
        if (!this.isFailure(err)) {     // e.g. a 4xx: service is UP
          this.onProbeSuccess();
          throw err;
        }
        this.opts.onEvent?.({ type: 'failure', state: this.state_, error: err });
        this.trip();                    // one bad probe -> straight back to OPEN
        if (this.opts.fallback) return this.opts.fallback(err);
        throw err;
      } finally {
        this.probesInFlight--;
      }
    }

    // CLOSED
    try {
      const result = await this.action(...args);
      this.record(true);
      this.opts.onEvent?.({ type: 'success', state: this.state_ });
      return result;
    } catch (err) {
      if (this.isFailure(err)) {
        this.record(false);
        this.opts.onEvent?.({ type: 'failure', state: this.state_, error: err });
        this.maybeTrip();
        if (this.opts.fallback) return this.opts.fallback(err);
      } else {
        this.record(true);              // client error counts as service health
      }
      throw err;
    }
  }

  private record(ok: boolean): void {
    const now = this.now();
    this.window.push({ at: now, ok });
    const cutoff = now - (this.opts.rollingWindowMs ?? 10_000);
    while (this.window.length > 0 && this.window[0].at < cutoff) this.window.shift();
  }

  private maybeTrip(): void {
    const failures = this.window.filter((e) => !e.ok).length;
    const total = this.window.length;
    const byCount = this.opts.failureThreshold !== undefined &&
      failures >= this.opts.failureThreshold;
    const byRate = this.opts.failureRateThreshold !== undefined &&
      total >= (this.opts.minimumRequests ?? 10) &&
      failures / total >= this.opts.failureRateThreshold;
    if (byCount || byRate) this.trip();
  }

  private trip(): void {
    this.openedAt = this.now();
    this.window = [];
    this.transition('OPEN');
  }

  private onProbeSuccess(): void {
    this.probeSuccesses++;
    this.opts.onEvent?.({ type: 'success', state: this.state_ });
    if (this.probeSuccesses >= (this.opts.successThreshold ?? 1)) {
      this.window = [];
      this.transition('CLOSED');
    }
  }

  private async reject(): Promise<R> {
    this.opts.onEvent?.({ type: 'rejected', state: this.state_ });
    const err = new CircuitOpenError(this.state_);
    if (this.opts.fallback) return this.opts.fallback(err);
    throw err;
  }

  private transition(to: BreakerState): void {
    const from = this.state_;
    if (from === to) return;
    this.state_ = to;
    this.opts.onEvent?.({ type: 'state_change', from, to });
  }
}
```

**Interview trap:** a breaker without HALF_OPEN is broken. If OPEN simply expires back to CLOSED, the first burst of traffic after expiry slams a still-sick service, trips again, expires again — the breaker "flaps" and amplifies load in pulses. HALF_OPEN exists to send K probes, not the full flood, and to require `successThreshold` wins before reopening the gates.

## Test cases

All tests use `node:test` + `node:assert/strict`. Run with `npx tsx --test <file>`. Debounce/throttle and breaker tests never sleep — they use the fakes below.

```typescript
// fakes.ts — shared test doubles
export class FakeTimers {
  private time = 0;
  private nextId = 1;
  private tasks = new Map<number, { at: number; fn: () => void }>();

  nowFn = (): number => this.time;
  setTimeoutFn = (fn: () => void, ms: number): number => {
    const id = this.nextId++;
    this.tasks.set(id, { at: this.time + ms, fn });
    return id;
  };
  clearTimeoutFn = (id: unknown): void => { this.tasks.delete(id as number); };
  tick(ms: number): void {
    const target = this.time + ms;
    for (;;) {
      const due = [...this.tasks.entries()]
        .filter(([, t]) => t.at <= target)
        .sort((a, b) => a[1].at - b[1].at);
      if (due.length === 0) break;
      const [id, task] = due[0];
      this.tasks.delete(id);
      this.time = task.at;
      task.fn();
    }
    this.time = target;
  }
  pendingCount(): number { return this.tasks.size; }
}

export class ManualClock {
  t = 0;
  now = (): number => this.t;
  advance(ms: number): void { this.t += ms; }
}

/** Seeded LCG so snake food placement is reproducible. */
export function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}
```

```typescript
// snake.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SnakeGame } from './snake';
import { seededRng } from './fakes';

test('moves one cell per tick in current direction', () => {
  const g = new SnakeGame(10, 10, seededRng(42), { x: 5, y: 5 });
  g.tick(); // default RIGHT
  assert.deepEqual(g.head, { x: 6, y: 5 });
  g.setDirection('UP');
  g.tick();
  assert.deepEqual(g.head, { x: 6, y: 4 });
});

test('grows and scores on eating; food respawns off the snake', () => {
  // rng() => 0 always picks the first free cell -> initial food at (0,0)
  const g = new SnakeGame(3, 3, () => 0, { x: 1, y: 1 });
  assert.deepEqual(g.getFood(), { x: 0, y: 0 });
  g.setDirection('UP'); g.tick();       // (1,0)
  g.setDirection('LEFT'); g.tick();     // eats (0,0)
  assert.equal(g.score, 1);
  assert.equal(g.length, 2);
  const food = g.getFood()!;
  for (const seg of g.getBody()) {
    assert.notDeepEqual(seg, food, 'food must not spawn on the snake');
  }
});

test('food never on snake across many seeds', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const g = new SnakeGame(4, 4, seededRng(seed));
    const f = g.getFood()!;
    assert.equal(g.getBody().some((s) => s.x === f.x && s.y === f.y), false);
  }
});

test('wall collision ends the game; further ticks are no-ops', () => {
  const g = new SnakeGame(4, 4, seededRng(1), { x: 3, y: 1 });
  g.tick(); // RIGHT off the edge
  assert.equal(g.status, 'GAME_OVER');
  const head = { ...g.head };
  g.tick();
  assert.deepEqual(g.head, head);
});

test('180-degree turn is ignored once length > 1', () => {
  const g = new SnakeGame(3, 3, () => 0, { x: 1, y: 1 }); // food (0,0)
  g.setDirection('UP'); g.tick();       // (1,0)
  g.setDirection('LEFT'); g.tick();     // eats -> length 2, moving LEFT
  assert.equal(g.length, 2);
  g.setDirection('RIGHT');              // 180 turn -> ignored
  g.setDirection('DOWN');               // this one sticks
  g.tick();
  assert.deepEqual(g.head, { x: 0, y: 1 });
  assert.equal(g.status, 'RUNNING');
});

test('moving into the vacating tail cell is legal when not eating', () => {
  const g = new SnakeGame(4, 4, () => 0, { x: 1, y: 1 }); // food (0,0)
  g.setDirection('UP'); g.tick();       // (1,0)
  g.setDirection('LEFT'); g.tick();     // eat -> len 2, food respawns
  g.setDirection('DOWN'); g.tick();     // (0,1)
  g.setDirection('RIGHT'); g.tick();    // (1,1)
  g.setDirection('UP'); g.tick();       // (1,0) — cell its own tail just left
  assert.equal(g.status, 'RUNNING');
});
```

```typescript
// pool.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapWithConcurrency, mapWithConcurrencyRace } from './pool';

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

for (const [name, pool] of [
  ['worker-loop', mapWithConcurrency],
  ['race-set', mapWithConcurrencyRace],
] as const) {
  test(`${name}: preserves input order despite varied completion`, async () => {
    const out = await pool([50, 10, 30, 0, 20], 2, async (ms) => {
      await delay(ms);
      return `done-${ms}`;
    });
    assert.deepEqual(out, ['done-50', 'done-10', 'done-30', 'done-0', 'done-20']);
  });

  test(`${name}: never exceeds the concurrency limit`, async () => {
    let active = 0, maxActive = 0;
    await pool(Array.from({ length: 20 }, (_, i) => i), 3, async (n) => {
      active++;
      maxActive = Math.max(maxActive, active);
      await delay(5 + (n % 3));
      active--;
      return n;
    });
    assert.ok(maxActive <= 3, `max active was ${maxActive}`);
    assert.ok(maxActive >= 2, 'should actually run concurrently');
  });

  test(`${name}: limit >= items.length and limit 1 both work`, async () => {
    assert.deepEqual(await pool([1, 2], 100, async (n) => n * 2), [2, 4]);
    const order: number[] = [];
    await pool([1, 2, 3], 1, async (n) => { order.push(n); return n; });
    assert.deepEqual(order, [1, 2, 3], 'limit 1 must be strictly sequential');
  });
}

test('fail-fast: rejects on first error, stops claiming new items', async () => {
  const started: number[] = [];
  await assert.rejects(
    mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, async (n) => {
      started.push(n);
      await delay(5);
      if (n === 2) throw new Error('boom');
      return n;
    }),
    /boom/,
  );
  await delay(30); // let in-flight work drain
  assert.ok(started.length < 6, 'later items must not all start after failure');
});

test('settle-all: collects every error into AggregateError', async () => {
  await assert.rejects(
    mapWithConcurrency([1, 2, 3, 4], 2, async (n) => {
      if (n % 2 === 0) throw new Error(`bad-${n}`);
      return n;
    }, { failFast: false }),
    (err: unknown) => {
      assert.ok(err instanceof AggregateError);
      assert.equal(err.errors.length, 2);
      return true;
    },
  );
});
```

```typescript
// debounce-throttle.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { debounce, throttle } from './debounce-throttle';
import { FakeTimers } from './fakes';

function spy() {
  const calls: Array<{ args: unknown[]; self: unknown }> = [];
  function f(this: unknown, ...args: unknown[]) {
    calls.push({ args, self: this });
    return args[0];
  }
  return Object.assign(f, { calls });
}

test('debounce trailing (default): fires once after quiet period, last args', () => {
  const t = new FakeTimers();
  const fn = spy();
  const d = debounce(fn, 100, { ...t });
  d('a'); t.tick(50); d('b'); t.tick(50); d('c');
  assert.equal(fn.calls.length, 0);
  t.tick(100);
  assert.equal(fn.calls.length, 1);
  assert.deepEqual(fn.calls[0].args, ['c']);
});

test('debounce leading only: immediate, nothing on trailing edge', () => {
  const t = new FakeTimers();
  const fn = spy();
  const d = debounce(fn, 100, { leading: true, trailing: false, ...t });
  d('a'); d('b');
  assert.equal(fn.calls.length, 1);
  assert.deepEqual(fn.calls[0].args, ['a']);
  t.tick(200);
  assert.equal(fn.calls.length, 1);
  d('c'); // new burst after quiet period
  assert.equal(fn.calls.length, 2);
});

test('debounce leading+trailing: lone call fires once; burst fires twice', () => {
  const t = new FakeTimers();
  const fn = spy();
  const d = debounce(fn, 100, { leading: true, trailing: true, ...t });
  d('only');
  t.tick(200);
  assert.equal(fn.calls.length, 1, 'single call must NOT double-fire');
  d('x'); d('y');
  t.tick(100);
  assert.equal(fn.calls.length, 3);
  assert.deepEqual(fn.calls[2].args, ['y']);
});

test('debounce cancel/flush; preserves this; no leaked timers', () => {
  const t = new FakeTimers();
  const fn = spy();
  const d = debounce(fn, 100, { ...t });
  const obj = { d };
  obj.d('a');
  d.cancel();
  t.tick(200);
  assert.equal(fn.calls.length, 0);
  assert.equal(t.pendingCount(), 0, 'cancel must clear the timer');
  obj.d('b');
  d.flush();
  assert.equal(fn.calls.length, 1);
  assert.equal(fn.calls[0].self, obj, '`this` must be forwarded');
  assert.equal(t.pendingCount(), 0, 'flush must clear the timer');
});

test('throttle: leading fires now, trailing fires with LAST args', () => {
  const t = new FakeTimers();
  const fn = spy();
  const th = throttle(fn, 100, { ...t });
  th('a');
  assert.equal(fn.calls.length, 1);
  th('b'); th('c');
  t.tick(100);
  assert.equal(fn.calls.length, 2);
  assert.deepEqual(fn.calls[1].args, ['c']);
});

test('throttle rate: at most one invoke per window over a long burst', () => {
  const t = new FakeTimers();
  const fn = spy();
  const th = throttle(fn, 100, { trailing: false, ...t });
  for (let i = 0; i < 10; i++) { th(i); t.tick(30); } // 300ms of calls
  assert.equal(fn.calls.length, 3); // t=0, t=120, t=240
});
```

```typescript
// resilience.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { retry, CircuitBreaker, CircuitOpenError } from './resilience';
import { ManualClock } from './fakes';

test('retry: succeeds after transient failures, exponential delays', async () => {
  const delays: number[] = [];
  let n = 0;
  const out = await retry(
    async () => {
      n++;
      if (n < 3) throw new Error('transient');
      return 'ok';
    },
    { attempts: 5, backoff: 100, jitter: 'none',
      sleep: async (ms) => { delays.push(ms); } },
  );
  assert.equal(out, 'ok');
  assert.deepEqual(delays, [100, 200]);
});

test('retry: gives up after attempts; shouldRetry short-circuits', async () => {
  let n = 0;
  await assert.rejects(
    retry(async () => { n++; throw new Error('always'); },
      { attempts: 3, jitter: 'none', sleep: async () => {} }),
    /always/,
  );
  assert.equal(n, 3);
  n = 0;
  await assert.rejects(
    retry(async () => { n++; throw new Error('fatal-400'); },
      { attempts: 5, sleep: async () => {},
        shouldRetry: (e) => !(e as Error).message.includes('400') }),
  );
  assert.equal(n, 1, 'non-retryable error must not be retried');
});

function makeBreaker(clock: ManualClock, action: () => Promise<string>) {
  const events: string[] = [];
  const breaker = new CircuitBreaker(action, {
    failureThreshold: 3, rollingWindowMs: 60_000, openDurationMs: 5_000,
    halfOpenMaxProbes: 1, successThreshold: 2, now: clock.now,
    onEvent: (e) => {
      if (e.type === 'state_change') events.push(`${e.from}->${e.to}`);
    },
  });
  return { breaker, events };
}

test('breaker: CLOSED -> OPEN -> HALF_OPEN -> CLOSED', async () => {
  const clock = new ManualClock();
  let fail = true;
  const { breaker, events } = makeBreaker(clock, async () => {
    if (fail) throw new Error('down');
    return 'ok';
  });
  for (let i = 0; i < 3; i++) await assert.rejects(breaker.exec(), /down/);
  assert.equal(breaker.state, 'OPEN');

  // While OPEN: rejected fast without calling the action.
  await assert.rejects(breaker.exec(), CircuitOpenError);

  clock.advance(5_000);
  fail = false;
  assert.equal(await breaker.exec(), 'ok');   // probe 1
  assert.equal(breaker.state, 'HALF_OPEN');   // needs 2 successes
  assert.equal(await breaker.exec(), 'ok');   // probe 2 -> close
  assert.equal(breaker.state, 'CLOSED');
  assert.deepEqual(events, ['CLOSED->OPEN', 'OPEN->HALF_OPEN', 'HALF_OPEN->CLOSED']);
});

test('breaker: HALF_OPEN probe failure re-opens immediately', async () => {
  const clock = new ManualClock();
  const { breaker } = makeBreaker(clock, async () => { throw new Error('down'); });
  for (let i = 0; i < 3; i++) await assert.rejects(breaker.exec(), /down/);
  clock.advance(5_000);
  await assert.rejects(breaker.exec(), /down/);            // probe fails
  assert.equal(breaker.state, 'OPEN');
  await assert.rejects(breaker.exec(), CircuitOpenError);  // fresh open window
  clock.advance(4_999);
  await assert.rejects(breaker.exec(), CircuitOpenError);  // openedAt was reset
});

test('breaker: HALF_OPEN limits concurrent probes to K', async () => {
  const clock = new ManualClock();
  let mode: 'fail' | 'hang' = 'fail';
  let resolveProbe!: (v: string) => void;
  const breaker = new CircuitBreaker(
    () => mode === 'fail'
      ? Promise.reject(new Error('down'))
      : new Promise<string>((res) => { resolveProbe = res; }),
    { failureThreshold: 1, openDurationMs: 1_000,
      halfOpenMaxProbes: 1, successThreshold: 1, now: clock.now },
  );
  await assert.rejects(breaker.exec(), /down/);
  assert.equal(breaker.state, 'OPEN');
  clock.advance(1_000);
  mode = 'hang';
  const probe = breaker.exec();                            // takes the only slot
  await assert.rejects(breaker.exec(), CircuitOpenError);  // over probe budget
  resolveProbe('ok');
  assert.equal(await probe, 'ok');
  assert.equal(breaker.state, 'CLOSED');
});

test('breaker: isFailure excludes client errors from tripping', async () => {
  const clock = new ManualClock();
  const breaker = new CircuitBreaker(
    async () => { throw Object.assign(new Error('nope'), { status: 404 }); },
    { failureThreshold: 2, openDurationMs: 1_000, now: clock.now,
      isFailure: (e) => ((e as { status?: number }).status ?? 500) >= 500 },
  );
  for (let i = 0; i < 10; i++) await assert.rejects(breaker.exec(), /nope/);
  assert.equal(breaker.state, 'CLOSED', '404s must not open the circuit');
});
```

## Follow-up questions

**Snake: how would you support two players?** Two snakes sharing one grid and one occupancy structure. Refactor: extract a `Board` owning the `Set` of occupied cells and food, and a `Snake` owning body/direction/score. `tick()` becomes two-phase — collect each snake's intended next head, then resolve conflicts (head-on collision, both heads targeting the same cell, one head entering the other's body) before mutating anything. The two-phase commit matters: mutating snake A before computing snake B's move makes the outcome depend on iteration order.

**Snake: variable speed?** Speed is a driver concern, not a game concern — that is exactly why `tick()` takes no time parameter. The driver shrinks the interval between `tick()` calls as score rises (e.g. `interval = max(60, 150 - score * 5)`). The game class stays untouched and fully testable. If ticks must vary per snake (two players, different speeds), give the driver an accumulator per snake: add elapsed ms, tick that snake whenever its accumulator crosses its period.

**Snake: replay from a move log?** The game is deterministic given (grid size, start position, RNG seed, sequence of `setDirection` calls with their tick indexes), so a replay is `new SnakeGame(w, h, seededRng(seed))` plus re-applying logged inputs at the same tick numbers. This is also the answer to "how do you debug a reported crash" and "how would you validate a submitted high score server-side" — replay the log, compare the final score. It only works because the RNG is injected; `Math.random` kills replayability.

**Snake: why deque + set?** Every tick touches only the two ends: add head, remove tail — O(1) on a deque. Collision needs "is this cell part of the body" — O(1) on a hash set versus O(n) scanning the deque. Neither structure alone suffices: a set has no order (you cannot find the tail), a list has no fast membership. Keeping them in sync is the invariant to state out loud. At interview-scale grids a plain array with `unshift`/`pop` is fine; mention the ring-buffer upgrade rather than building it.

**Pool: abort via AbortSignal?** Accept `signal?: AbortSignal` and (a) check `signal.aborted` in the worker loop before claiming the next index — stops new work immediately; (b) pass the signal through to `fn(item, i, signal)` so in-flight calls (fetch, DB) can cancel themselves; (c) reject the pool's promise with `signal.reason` once workers drain. Point out honestly that JavaScript cannot forcibly kill a running promise — abort is cooperative, which is why forwarding the signal into `fn` matters more than the loop check.

**Pool: streaming results as they finish?** Change the return type from `Promise<R[]>` to `AsyncIterable<{ index: number; result: R }>`. Same worker loop, but workers push completions into a small async queue (or implement it as an async generator that races the in-flight set and yields whichever settles first). Callers `for await` results in completion order and start downstream work before the slowest item finishes — the difference between "pool" and "pipeline".

**Debounce: throttle via requestAnimationFrame?** For visual work (scroll-linked animation, resize layout), replace time-based throttling with rAF: on call, store the latest args; if no frame is scheduled, `requestAnimationFrame(run)`. You get at most one invocation per frame (~16.7ms at 60Hz), automatically aligned with paint and automatically paused in background tabs — both things a 16ms `setTimeout` throttle gets wrong. `cancel()` maps to `cancelAnimationFrame`. Not for network work: rAF stops firing when the tab is hidden.

**Debounce vs throttle: search-as-you-type vs scroll?** Search-as-you-type wants **debounce** (trailing): you only care about the query once the user pauses; firing mid-word wastes requests and flickers stale results. Typical wait 200-300ms, plus cancel the in-flight request when a new one fires. Scroll/resize/mousemove wants **throttle**: you need periodic updates *during* the activity — a debounced scroll handler does nothing until scrolling stops, so sticky headers and infinite-scroll sentinels lag. Leading gives instant response; trailing guarantees the final position is processed.

**Breaker: per-endpoint or global?** Per *dependency and failure domain*, not per process. One breaker per downstream service is the default; split further per endpoint when endpoints have independent failure modes (search can be down while item-lookup is fine) or wildly different latency profiles. A single global breaker lets one bad endpoint blackout healthy ones; a breaker per concrete URL fragments statistics so nothing ever trips — key on the route template (`GET /users/:id`). Pair with bulkheads — a bounded concurrency pool per dependency (problem 2 is literally the building block) — so a slow dependency exhausts its own slots, not the whole service's.

**Breaker: how to pick thresholds?** From SLOs and baseline traffic, not vibes. Rate-based (e.g. open at 50% failures over 10s with `minimumRequests: 20`) is robust across traffic levels; pure counts trip spuriously at low volume — that is what `minimumRequests` exists for. `openDurationMs` should exceed the dependency's typical recovery time (LB eviction, pod restart: 10-30s) — too short and you probe a corpse, too long and you serve fallbacks after recovery. `successThreshold` of 2-5 filters out one-lucky-probe flapping. Validate in staging with induced failures and watch the state-change events from `onEvent` — flapping frequency is the metric that says thresholds are wrong.

**Breaker + retry: which wraps which?** Get the ordering right. **Retry inside, breaker outside** — `breaker.exec(() => retry(fn))` — is the storm-prone shape if the retry is aggressive: every breaker-admitted call multiplies into N downstream attempts, amplifying load exactly when the dependency can least afford it, and the breaker sees one "failure" per N real requests, so it trips late. **Breaker inside retry** — `retry(() => breaker.exec(fn))` — means each attempt individually consults the breaker: the moment it opens, remaining retries fail fast in microseconds without touching the network; make `shouldRetry` return false on `CircuitOpenError` or you burn attempts pointlessly. The production-grade answer: breaker inside retry, `shouldRetry` excludes `CircuitOpenError` and 4xx, retries use full jitter and a low cap (2-3 attempts), and a bulkhead caps total concurrency outside everything. If you must put the breaker outside, the inner retry needs to be tame (jitter, small N) and the breaker should count attempts, not wrapped calls.

## What gets you rejected

- **Snake logic tangled with rendering and `setInterval`.** If `tick()` calls `console.log`, or movement lives inside a `setInterval` callback with game state in closures, the interviewer cannot run a single test. This is the #1 fail. Pure state machine in, ASCII string out, driver at the edge.
- **Snake with O(n) collision or missing the tail rule.** Scanning the body array for collisions is a shrug; killing the snake for moving into its own vacating tail is a wrong answer to the core question the problem exists to ask.
- **A "pool" that runs everything then slices.** `Promise.all(items.map(fn))`, or chunked batches, or `for` + `await` with no concurrency at all when `limit > 1`. If a test that counts live invocations can show more than `limit` in flight (or exactly 1 forever), it is not a pool. Losing result order — pushing in completion order instead of writing `results[i]` — fails just as hard.
- **Debounce losing `this` or args, or leaking timers.** Arrow-function wrapper that swallows `this`, trailing edge firing with the first args instead of the last, `cancel()` that nulls state but never calls `clearTimeout`, or leading+trailing double-firing on a single call. The fake-timer suite above catches all four; write it.
- **Breaker without HALF_OPEN.** OPEN that silently expires to CLOSED flaps under sustained failure and hammers a recovering service with full traffic. No probe budget, no success threshold — no hire.
- **Counting client errors as breaker failures.** A user sending 404s/422s all day opens your circuit and takes the endpoint away from everyone else — a self-inflicted denial of service. `isFailure` must exclude 4xx (arguably except 429) and count only 5xx, timeouts, and connection errors.
- **No tests, or tests that sleep.** `await delay(5000)` to test a breaker means you did not design for injection. Clock and timers are constructor parameters; tests advance them synchronously.

Final checklist before you say "done": every class takes its randomness/clock/timers by injection; each of the four has at least one test the interviewer can run; and you said the tail-vacating rule, the `Promise.all` distinction, the lodash leading+trailing rule, and the HALF_OPEN rationale out loud.
