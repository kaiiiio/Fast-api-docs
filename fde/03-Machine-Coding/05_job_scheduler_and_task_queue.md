# Job Scheduler & Task Queue - Machine Coding Round

One of the most common senior-level machine coding prompts. It looks like two problems (a cron-like scheduler and a worker queue), but they share one core data structure: a binary min-heap. Interviewers use it to check whether you know how timers actually work in Node.js, whether you can avoid the naive polling loop, and whether you understand retries, idempotency, and graceful shutdown -- the things that break in production.

> **Interview prompt (verbatim):**
>
> "Build an in-process job scheduler and task queue in TypeScript.
>
> The **scheduler** must support: one-shot jobs (`runAt`), recurring jobs (`every(intervalMs)`), and a simple cron subset (`m h dom mon dow` with `*`, plain numbers, `*/n`, and comma lists). Do NOT poll -- you may have at most one pending timer at any moment. Jobs can be cancelled and paused. The clock and timer functions must be injectable so we can test it with fake timers.
>
> The **task queue** must support: a concurrency limit of N workers, priorities (higher first, FIFO within the same priority), retries with exponential backoff and full jitter, a max-attempts limit with a dead-letter list, idempotency keys (a duplicate key while a job is pending/active returns the existing job's promise), job state events, and `await queue.shutdown()` that stops accepting work and drains active tasks with a timeout.
>
> We will run your code against test cases. Working code wins over beautiful code."

Requirements checklist:

- **MinHeap** -- implement it yourself: `push` / `pop` / `peek` / `siftUp` / `siftDown`. Generic with an injected comparator so the scheduler (keyed by timestamp) and the queue (keyed by `(priority, seq)`) can both use it.
- **Scheduler** -- single armed `setTimeout` for the heap top; re-arm when a sooner job arrives or after a run fires. One-shot, fixed-rate recurring, cron subset. Cancel/pause. Injectable `clock`, `setTimeoutFn`, `clearTimeoutFn`.
- **Cron parser** -- 5 fields, `*`, numbers, `*/n`, comma lists; compute the next run time strictly after a given instant. Evaluated in UTC (state this assumption out loud).
- **TaskQueue** -- concurrency N, priority + FIFO tie-break, retries with `delay = random(0, min(cap, base * 2^attempt))`, max attempts then failed + dead-letter, idempotency keys, states + events (`queued` / `active` / `retrying` / `completed` / `failed`), graceful shutdown.
- **Tests** -- deterministic, using injected fake timers and a stubbed `randomFn`.

---

## Approach & time budget

For a 45-60 minute round, work in 10-minute blocks and narrate the invariants as you type. The single most important thing to say early: **"I will not poll. I keep one timer armed for the earliest job; anything that could change the earliest job re-arms it."** That sentence alone separates senior candidates from mid-level ones.

**0-10 min -- interfaces + MinHeap.** Write the public API signatures first (`runAt`, `every`, `cron`, `add`, `shutdown`) so the interviewer sees the shape of the solution. Then implement the heap -- it is mechanical, get it out of the way while you are fresh. Narrate: "comparator-injected so I can reuse it for both timestamp ordering and (priority, seq) ordering; heaps are not stable, so FIFO needs an explicit sequence number."

**10-20 min -- scheduler timer logic.** The `arm()` / `onTimer()` pair is the heart of the problem. Handle the two re-arm triggers: (1) a new job whose `nextRun` is earlier than the currently armed target -> cancel and re-arm; (2) after popping and running due jobs -> re-arm for the new top. Implement `runAt` and `every` now; leave a `computeNext` hook so cron plugs in later. Narrate the fixed-rate decision: next run is computed from the *scheduled* time, not from completion time, so recurring jobs do not drift.

**20-30 min -- cron subset.** A field parser (split on commas, handle `*`, `*/n`, numbers -> `Set<number>`) plus a next-run search that advances a `Date` field by field (month -> day -> hour -> minute). Do not try to be clever; the field-advance loop is short and obviously correct. If you are running late, ship `*` and `*/n` only and say what you cut.

**30-40 min -- queue + concurrency.** `add()` pushes into the ready heap and calls `pump()`; `pump()` starts jobs while `active < N`. Every completion calls `pump()` again. This pull model is what makes the concurrency invariant trivially true -- say that.

**40-50 min -- retries, idempotency, shutdown.** Backoff with full jitter (stub-able `randomFn`), retry timers tracked so shutdown can cancel them, idempotency map keyed by caller-supplied key, drain logic. Wrap the worker body in try/catch -- an unhandled rejection here kills the process.

**50-60 min -- tests.** If the round is 45 minutes, write the three highest-signal tests: heap ordering, timer re-arm with fake timers, concurrency cap. They exercise the parts most likely to be subtly wrong.

---

## Implementation

Complete, runnable, dependency-free. One file: `scheduler.ts`.

```typescript
// ============================================================
// scheduler.ts -- MinHeap + Scheduler + TaskQueue
// No dependencies. Node 18+. `npx tsx scheduler.ts` compatible.
// ============================================================

export type TimeoutHandle = unknown;

export interface Clock {
  now(): number; // epoch ms
}

export type SetTimeoutFn = (fn: () => void, ms: number) => TimeoutHandle;
export type ClearTimeoutFn = (handle: TimeoutHandle) => void;

const realClock: Clock = { now: () => Date.now() };
const realSetTimeout: SetTimeoutFn = (fn, ms) => setTimeout(fn, ms);
const realClearTimeout: ClearTimeoutFn = (h) => clearTimeout(h as NodeJS.Timeout);

// setTimeout takes a 32-bit signed int. Anything above 2^31-1 ms
// (~24.8 days) overflows and fires IMMEDIATELY. Chunk long waits.
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

// ============================================================
// 1. MinHeap -- array-backed binary heap, comparator-injected
// ============================================================

export class MinHeap<T> {
  private items: T[] = [];

  constructor(private readonly compare: (a: T, b: T) => number) {}

  get size(): number {
    return this.items.length;
  }

  peek(): T | undefined {
    return this.items[0];
  }

  push(item: T): void {
    this.items.push(item);
    this.siftUp(this.items.length - 1);
  }

  pop(): T | undefined {
    const n = this.items.length;
    if (n === 0) return undefined;
    const top = this.items[0];
    const last = this.items.pop()!;
    if (n > 1) {
      this.items[0] = last;
      this.siftDown(0);
    }
    return top;
  }

  private siftUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.compare(this.items[i], this.items[parent]) >= 0) break;
      [this.items[i], this.items[parent]] = [this.items[parent], this.items[i]];
      i = parent;
    }
  }

  private siftDown(i: number): void {
    const n = this.items.length;
    for (;;) {
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      let smallest = i;
      if (left < n && this.compare(this.items[left], this.items[smallest]) < 0) smallest = left;
      if (right < n && this.compare(this.items[right], this.items[smallest]) < 0) smallest = right;
      if (smallest === i) return;
      [this.items[i], this.items[smallest]] = [this.items[smallest], this.items[i]];
      i = smallest;
    }
  }
}

// ============================================================
// 2. Cron subset -- `m h dom mon dow` with *, numbers, */n, lists
//    Evaluated in UTC. dow: 0=Sunday (7 accepted as alias for 0).
// ============================================================

export interface CronSpec {
  minute: Set<number>;
  hour: Set<number>;
  dom: Set<number>;
  month: Set<number>;
  dow: Set<number>;
  domIsWildcard: boolean;
  dowIsWildcard: boolean;
}

function parseCronField(field: string, min: number, max: number, name: string): Set<number> {
  const out = new Set<number>();
  for (const part of field.split(",")) {
    if (part === "*") {
      for (let i = min; i <= max; i++) out.add(i);
    } else if (part.startsWith("*/")) {
      const step = Number(part.slice(2));
      if (!Number.isInteger(step) || step <= 0) throw new Error(`bad step in ${name}: "${part}"`);
      for (let i = min; i <= max; i += step) out.add(i);
    } else {
      let n = Number(part);
      if (name === "dow" && n === 7) n = 0; // 7 == Sunday alias
      if (!Number.isInteger(n) || n < min || n > max) throw new Error(`bad value in ${name}: "${part}"`);
      out.add(n);
    }
  }
  return out;
}

export function parseCron(expr: string): CronSpec {
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) throw new Error(`cron needs 5 fields, got ${fields.length}: "${expr}"`);
  return {
    minute: parseCronField(fields[0], 0, 59, "minute"),
    hour: parseCronField(fields[1], 0, 23, "hour"),
    dom: parseCronField(fields[2], 1, 31, "dom"),
    month: parseCronField(fields[3], 1, 12, "month"),
    dow: parseCronField(fields[4], 0, 6, "dow"),
    domIsWildcard: fields[2] === "*",
    dowIsWildcard: fields[4] === "*",
  };
}

// Next matching instant STRICTLY AFTER `afterMs`. Field-advance search:
// fix month, then day, then hour, then minute. Each mismatch resets the
// smaller fields and advances the mismatched one, so the walk is bounded.
export function cronNext(spec: CronSpec | string, afterMs: number): number {
  const s = typeof spec === "string" ? parseCron(spec) : spec;
  const d = new Date(afterMs);
  d.setUTCSeconds(0, 0);
  d.setUTCMinutes(d.getUTCMinutes() + 1); // strictly after

  for (let guard = 0; guard < 100_000; guard++) {
    if (!s.month.has(d.getUTCMonth() + 1)) {
      d.setUTCDate(1); // reset BEFORE bumping month, or Jan 31 -> Mar 3
      d.setUTCMonth(d.getUTCMonth() + 1);
      d.setUTCHours(0, 0, 0, 0);
      continue;
    }
    // Standard cron rule: if BOTH dom and dow are restricted, match either.
    // If exactly one is restricted, only it constrains the day.
    const domMatch = s.dom.has(d.getUTCDate());
    const dowMatch = s.dow.has(d.getUTCDay());
    const dayOk =
      s.domIsWildcard && s.dowIsWildcard ? true
      : s.domIsWildcard ? dowMatch
      : s.dowIsWildcard ? domMatch
      : domMatch || dowMatch;
    if (!dayOk) {
      d.setUTCHours(0, 0, 0, 0);
      d.setUTCDate(d.getUTCDate() + 1);
      continue;
    }
    if (!s.hour.has(d.getUTCHours())) {
      d.setUTCMinutes(0, 0, 0);
      d.setUTCHours(d.getUTCHours() + 1);
      continue;
    }
    if (!s.minute.has(d.getUTCMinutes())) {
      d.setUTCMinutes(d.getUTCMinutes() + 1);
      continue;
    }
    return d.getTime();
  }
  throw new Error("cron: no matching time found (impossible spec, e.g. \"0 0 31 2 *\")");
}

// ============================================================
// 3. Scheduler -- min-heap of jobs + ONE armed timer, no polling
// ============================================================

interface ScheduledJob {
  id: string;
  nextRun: number;
  fn: () => void | Promise<void>;
  // Returns the next occurrence given the time this run was SCHEDULED for
  // (fixed-rate, drift-free), or null for one-shot jobs.
  computeNext: ((scheduledFor: number) => number) | null;
  cancelled: boolean;
  paused: boolean;
}

export interface SchedulerOptions {
  clock?: Clock;
  setTimeoutFn?: SetTimeoutFn;
  clearTimeoutFn?: ClearTimeoutFn;
  onError?: (jobId: string, err: unknown) => void;
}

export class Scheduler {
  private readonly heap = new MinHeap<ScheduledJob>((a, b) => a.nextRun - b.nextRun);
  private readonly jobs = new Map<string, ScheduledJob>();
  private readonly clock: Clock;
  private readonly setTimeoutFn: SetTimeoutFn;
  private readonly clearTimeoutFn: ClearTimeoutFn;
  private readonly onError: (jobId: string, err: unknown) => void;
  private timer: TimeoutHandle | null = null;
  private timerTarget = Infinity; // instant the armed timer aims at
  private idSeq = 0;

  constructor(opts: SchedulerOptions = {}) {
    this.clock = opts.clock ?? realClock;
    this.setTimeoutFn = opts.setTimeoutFn ?? realSetTimeout;
    this.clearTimeoutFn = opts.clearTimeoutFn ?? realClearTimeout;
    this.onError = opts.onError ?? ((id, err) => console.error(`scheduler job ${id} failed:`, err));
  }

  get jobCount(): number {
    return this.jobs.size;
  }

  /** One-shot job at an absolute time. */
  runAt(at: number | Date, fn: () => void | Promise<void>): string {
    return this.schedule(typeof at === "number" ? at : at.getTime(), fn, null);
  }

  /** Fixed-rate recurring job: occurrences at start+i*interval, no drift. */
  every(intervalMs: number, fn: () => void | Promise<void>): string {
    if (intervalMs <= 0) throw new Error("intervalMs must be > 0");
    const computeNext = (scheduledFor: number): number => {
      let next = scheduledFor + intervalMs;
      const now = this.clock.now();
      while (next <= now) next += intervalMs; // skip missed occurrences, keep phase
      return next;
    };
    return this.schedule(this.clock.now() + intervalMs, fn, computeNext);
  }

  /** Cron job (UTC). */
  cron(expr: string, fn: () => void | Promise<void>): string {
    const spec = parseCron(expr); // fail fast on a bad expression
    const computeNext = (scheduledFor: number): number =>
      cronNext(spec, Math.max(scheduledFor, this.clock.now()));
    return this.schedule(cronNext(spec, this.clock.now()), fn, computeNext);
  }

  /** Lazy deletion: mark and skip when popped; no O(n) heap surgery. */
  cancel(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;
    job.cancelled = true;
    this.jobs.delete(id);
    return true;
  }

  /** Paused jobs SKIP occurrences (recurring stays scheduled; a one-shot
   *  that comes due while paused is dropped -- document your choice). */
  pause(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;
    job.paused = true;
    return true;
  }

  resume(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;
    job.paused = false;
    return true;
  }

  /** Disarm the timer (teardown in tests / process exit). */
  stop(): void {
    if (this.timer !== null) {
      this.clearTimeoutFn(this.timer);
      this.timer = null;
      this.timerTarget = Infinity;
    }
  }

  private schedule(
    nextRun: number,
    fn: () => void | Promise<void>,
    computeNext: ((scheduledFor: number) => number) | null,
  ): string {
    const id = `sched-${++this.idSeq}`;
    const job: ScheduledJob = { id, nextRun, fn, computeNext, cancelled: false, paused: false };
    this.jobs.set(id, job);
    this.heap.push(job);
    // THE critical case: the new job is sooner than the armed timer.
    // timerTarget is Infinity when no timer is armed, so this also
    // covers the empty-scheduler case.
    if (job.nextRun < this.timerTarget) this.arm();
    return id;
  }

  private arm(): void {
    if (this.timer !== null) {
      this.clearTimeoutFn(this.timer);
      this.timer = null;
    }
    this.timerTarget = Infinity;
    const top = this.heap.peek();
    if (!top) return;
    // Clamp: (a) never negative, (b) never above the 32-bit setTimeout cap.
    // If clamped by (b), onTimer finds nothing due and simply re-arms.
    const delay = Math.min(Math.max(0, top.nextRun - this.clock.now()), MAX_TIMEOUT_MS);
    this.timerTarget = this.clock.now() + delay;
    this.timer = this.setTimeoutFn(this.onTimer, delay);
  }

  private readonly onTimer = (): void => {
    this.timer = null;
    this.timerTarget = Infinity;
    const now = this.clock.now();
    while (this.heap.size > 0 && this.heap.peek()!.nextRun <= now) {
      const job = this.heap.pop()!;
      if (job.cancelled) continue; // lazy deletion
      const scheduledFor = job.nextRun;
      if (!job.paused) {
        // Fire and forget, but NEVER let a rejection escape: an
        // unhandled rejection would crash the process and kill
        // every other scheduled job with it.
        Promise.resolve()
          .then(job.fn)
          .catch((err) => this.onError(job.id, err));
      }
      if (job.computeNext) {
        job.nextRun = job.computeNext(scheduledFor);
        this.heap.push(job);
      } else {
        this.jobs.delete(job.id);
      }
    }
    this.arm(); // re-arm for the new heap top
  };
}

// ============================================================
// 4. TaskQueue -- worker pool, priorities, retries, idempotency
// ============================================================

export type JobState = "queued" | "active" | "retrying" | "completed" | "failed";

export interface JobEvent {
  id: string;
  name: string;
  state: JobState;
  attempts: number;
  priority: number;
  delayMs?: number;
  error?: unknown;
}

type TaskFn<T> = () => Promise<T> | T;

interface QueueJob {
  id: string;
  name: string;
  priority: number;
  seq: number; // FIFO tie-breaker: heaps are NOT stable
  state: JobState;
  attempts: number; // number of executions so far
  idempotencyKey?: string;
  task: TaskFn<unknown>;
  promise: Promise<unknown>;
  resolve: (v: unknown) => void;
  reject: (e: unknown) => void;
}

export interface TaskQueueOptions {
  concurrency?: number; // default 1
  maxAttempts?: number; // default 3 (total executions, not retries)
  baseDelayMs?: number; // default 500
  maxDelayMs?: number; // default 30_000 (backoff cap)
  idempotencyTtlMs?: number; // key retention AFTER settle; default 0 = release on settle
  clock?: Clock;
  setTimeoutFn?: SetTimeoutFn;
  clearTimeoutFn?: ClearTimeoutFn;
  randomFn?: () => number; // uniform [0,1); injectable for tests
}

export class TaskQueue {
  // Higher priority first; same priority -> lower seq (FIFO).
  private readonly ready = new MinHeap<QueueJob>(
    (a, b) => b.priority - a.priority || a.seq - b.seq,
  );
  private readonly active = new Set<QueueJob>();
  private readonly byKey = new Map<string, QueueJob>();
  private readonly retryTimers = new Map<TimeoutHandle, QueueJob>();
  private readonly listeners = new Map<JobState, Set<(e: JobEvent) => void>>();
  readonly deadLetter: JobEvent[] = [];

  private readonly concurrency: number;
  private readonly maxAttempts: number;
  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly idempotencyTtlMs: number;
  private readonly setTimeoutFn: SetTimeoutFn;
  private readonly clearTimeoutFn: ClearTimeoutFn;
  private readonly randomFn: () => number;

  private seq = 0;
  private idSeq = 0;
  private shuttingDown = false;
  private shutdownPromise: Promise<void> | null = null;
  private drainWaiters: Array<() => void> = [];

  constructor(opts: TaskQueueOptions = {}) {
    this.concurrency = opts.concurrency ?? 1;
    this.maxAttempts = opts.maxAttempts ?? 3;
    this.baseDelayMs = opts.baseDelayMs ?? 500;
    this.maxDelayMs = opts.maxDelayMs ?? 30_000;
    this.idempotencyTtlMs = opts.idempotencyTtlMs ?? 0;
    this.setTimeoutFn = opts.setTimeoutFn ?? realSetTimeout;
    this.clearTimeoutFn = opts.clearTimeoutFn ?? realClearTimeout;
    this.randomFn = opts.randomFn ?? Math.random;
    if (this.concurrency < 1) throw new Error("concurrency must be >= 1");
  }

  get activeCount(): number {
    return this.active.size;
  }

  get pendingCount(): number {
    return this.ready.size;
  }

  on(event: JobState, fn: (e: JobEvent) => void): () => void {
    let set = this.listeners.get(event);
    if (!set) this.listeners.set(event, (set = new Set()));
    set.add(fn);
    return () => set!.delete(fn);
  }

  add<T>(
    task: TaskFn<T>,
    opts: { name?: string; priority?: number; idempotencyKey?: string } = {},
  ): Promise<T> {
    if (this.shuttingDown) {
      return Promise.reject(new Error("TaskQueue is shutting down; not accepting jobs"));
    }
    const key = opts.idempotencyKey;
    if (key !== undefined) {
      const existing = this.byKey.get(key);
      if (existing) return existing.promise as Promise<T>; // dedup: same promise back
    }
    let resolve!: (v: unknown) => void;
    let reject!: (e: unknown) => void;
    const promise = new Promise<unknown>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    // Attach a no-op handler so a fire-and-forget caller does not turn a
    // job failure into an unhandledRejection process crash. The caller
    // still receives the rejection through the returned promise.
    promise.catch(() => {});
    const id = `job-${++this.idSeq}`;
    const job: QueueJob = {
      id,
      name: opts.name ?? id,
      priority: opts.priority ?? 0,
      seq: this.seq++,
      state: "queued",
      attempts: 0,
      idempotencyKey: key,
      task,
      promise,
      resolve,
      reject,
    };
    if (key !== undefined) this.byKey.set(key, job);
    this.ready.push(job);
    this.emit("queued", this.info(job));
    this.pump();
    return promise as Promise<T>;
  }

  /**
   * Stop accepting work, fail everything still queued or waiting on a
   * retry timer, then wait for ACTIVE jobs to finish (bounded by
   * timeoutMs if given). Idempotent: repeat calls get the same promise.
   */
  shutdown(opts: { timeoutMs?: number } = {}): Promise<void> {
    if (this.shutdownPromise) return this.shutdownPromise;
    this.shuttingDown = true;
    for (;;) {
      const job = this.ready.pop();
      if (!job) break;
      this.failJob(job, new Error("shutdown: job cancelled before start"));
    }
    for (const [handle, job] of this.retryTimers) {
      this.clearTimeoutFn(handle);
      this.failJob(job, new Error("shutdown: retry cancelled"));
    }
    this.retryTimers.clear();
    this.shutdownPromise =
      this.active.size === 0
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            let timer: TimeoutHandle | null = null;
            let done = false;
            const finish = () => {
              if (done) return;
              done = true;
              if (timer !== null) this.clearTimeoutFn(timer);
              resolve();
            };
            this.drainWaiters.push(finish);
            if (opts.timeoutMs !== undefined) {
              timer = this.setTimeoutFn(finish, opts.timeoutMs);
            }
          });
    return this.shutdownPromise;
  }

  private pump(): void {
    if (this.shuttingDown) return;
    while (this.active.size < this.concurrency && this.ready.size > 0) {
      void this.runJob(this.ready.pop()!);
    }
  }

  private async runJob(job: QueueJob): Promise<void> {
    job.state = "active";
    this.active.add(job);
    this.emit("active", this.info(job));
    try {
      const result = await job.task();
      this.active.delete(job);
      job.state = "completed";
      this.releaseKey(job);
      this.emit("completed", this.info(job));
      job.resolve(result);
    } catch (err) {
      this.active.delete(job);
      job.attempts += 1;
      if (job.attempts >= this.maxAttempts || this.shuttingDown) {
        this.failJob(job, err);
      } else {
        job.state = "retrying";
        // Full jitter (AWS style): uniform in [0, min(cap, base * 2^n)],
        // where n is the 0-based retry index. Jitter decorrelates
        // retries so a burst of failures does not come back as a
        // synchronized thundering herd.
        const cap = Math.min(this.maxDelayMs, this.baseDelayMs * 2 ** (job.attempts - 1));
        const delayMs = Math.floor(this.randomFn() * cap);
        this.emit("retrying", this.info(job, { delayMs, error: err }));
        const handle = this.setTimeoutFn(() => {
          this.retryTimers.delete(handle);
          job.state = "queued";
          this.ready.push(job);
          this.pump();
        }, delayMs);
        this.retryTimers.set(handle, job);
      }
    }
    this.pump(); // a slot just freed up
    this.maybeDrain();
  }

  private failJob(job: QueueJob, err: unknown): void {
    job.state = "failed";
    this.releaseKey(job);
    const event = this.info(job, { error: err });
    this.deadLetter.push(event); // in-memory DLQ; see follow-ups for persistence
    this.emit("failed", event);
    job.reject(err);
  }

  // Key retention window: with ttl=0 the key is released the moment the
  // job settles -- a duplicate arriving 1ms later re-executes. A positive
  // TTL keeps returning the settled job's promise for that window, which
  // is what you want when clients retry over the network.
  private releaseKey(job: QueueJob): void {
    const key = job.idempotencyKey;
    if (key === undefined || this.byKey.get(key) !== job) return;
    if (this.idempotencyTtlMs > 0) {
      this.setTimeoutFn(() => {
        if (this.byKey.get(key) === job) this.byKey.delete(key);
      }, this.idempotencyTtlMs);
    } else {
      this.byKey.delete(key);
    }
  }

  private maybeDrain(): void {
    if (!this.shuttingDown || this.active.size > 0) return;
    const waiters = this.drainWaiters;
    this.drainWaiters = [];
    for (const w of waiters) w();
  }

  private info(job: QueueJob, extra: Partial<JobEvent> = {}): JobEvent {
    return {
      id: job.id,
      name: job.name,
      state: job.state,
      attempts: job.attempts,
      priority: job.priority,
      ...extra,
    };
  }

  private emit(event: JobState, payload: JobEvent): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const fn of set) fn(payload);
  }
}
```

**Interview trap:** `setTimeout` stores its delay in a 32-bit signed integer. Ask for more than `2^31 - 1` ms (~24.8 days) and Node overflows it to `1` and fires immediately -- so `scheduler.runAt(Date.now() + 30 days, fn)` runs *now*. The fix is in `arm()`: clamp the delay to `MAX_TIMEOUT_MS`; when the chunked timer fires early, `onTimer` finds nothing due and simply re-arms for the remainder. Mentioning this unprompted is a strong senior signal.

**Interview trap:** adding a sooner job must cancel and re-arm the pending timer. If job A is armed for T+60s and job B arrives due at T+1s, a scheduler that only arms on `push`-into-empty or after a run will sit on B for a minute. That is why `schedule()` compares `nextRun < timerTarget` and why `timerTarget` is `Infinity` whenever no timer is armed -- one comparison covers both "sooner than armed" and "nothing armed". The symmetric bug: forgetting `clearTimeout` in `arm()` leaves two live timers and double-fires.

**Interview trap:** heaps are not stable. Two jobs with equal priority can come off a binary heap in either insertion order depending on sift history. If the interviewer's tests assert FIFO within a priority (they will), you need the monotonic `seq` tie-breaker in the comparator: `b.priority - a.priority || a.seq - b.seq`. The same trick orders the scheduler deterministically when two jobs share a timestamp.

---

## Test cases

Deterministic tests with an injected fake-timer harness -- no real waiting, no flaky sleeps. Runs with `npx tsx scheduler.test.ts` (or paste below the implementation in one file and drop the import).

```typescript
// scheduler.test.ts
import assert from "node:assert/strict";
import {
  MinHeap,
  Scheduler,
  TaskQueue,
  cronNext,
  type TimeoutHandle,
} from "./scheduler";

// ---- Fake timer harness (the injectable clock/timer pattern) ----

class FakeTimers {
  now = 0;
  private nextId = 1;
  private timers = new Map<number, { at: number; fn: () => void }>();

  readonly setTimeoutFn = (fn: () => void, ms: number): TimeoutHandle => {
    const id = this.nextId++;
    this.timers.set(id, { at: this.now + ms, fn });
    return id;
  };

  readonly clearTimeoutFn = (h: TimeoutHandle): void => {
    this.timers.delete(h as number);
  };

  readonly clock = { now: () => this.now };

  get pending(): number {
    return this.timers.size;
  }

  /** Advance virtual time, firing due timers in order + flushing microtasks. */
  async tick(ms: number): Promise<void> {
    const target = this.now + ms;
    for (;;) {
      let bestId: number | null = null;
      let bestAt = Infinity;
      for (const [id, t] of this.timers) {
        if (t.at <= target && (t.at < bestAt || (t.at === bestAt && id < (bestId ?? Infinity)))) {
          bestAt = t.at;
          bestId = id;
        }
      }
      if (bestId === null) {
        this.now = target;
        return;
      }
      this.now = Math.max(this.now, bestAt);
      const { fn } = this.timers.get(bestId)!;
      this.timers.delete(bestId);
      fn();
      await flush();
    }
  }
}

async function flush(): Promise<void> {
  for (let i = 0; i < 50; i++) await Promise.resolve();
}

// ---- Tiny runner ----

const tests: Array<[string, () => void | Promise<void>]> = [];
const test = (name: string, fn: () => void | Promise<void>) => tests.push([name, fn]);

test("MinHeap pops in comparator order", () => {
  const h = new MinHeap<number>((a, b) => a - b);
  for (const n of [5, 3, 8, 1, 9, 2, 7, 1]) h.push(n);
  assert.equal(h.peek(), 1);
  const out: number[] = [];
  while (h.size > 0) out.push(h.pop()!);
  assert.deepEqual(out, [1, 1, 2, 3, 5, 7, 8, 9]);
  assert.equal(h.pop(), undefined);
});

test("MinHeap with (priority desc, seq asc) comparator", () => {
  type Item = { p: number; s: number };
  const h = new MinHeap<Item>((a, b) => b.p - a.p || a.s - b.s);
  h.push({ p: 1, s: 0 });
  h.push({ p: 5, s: 1 });
  h.push({ p: 1, s: 2 });
  h.push({ p: 5, s: 3 });
  const out = [h.pop()!, h.pop()!, h.pop()!, h.pop()!].map((i) => `${i.p}:${i.s}`);
  assert.deepEqual(out, ["5:1", "5:3", "1:0", "1:2"]);
});

test("scheduler re-arms when a sooner job arrives", async () => {
  const fake = new FakeTimers();
  const sched = new Scheduler({
    clock: fake.clock,
    setTimeoutFn: fake.setTimeoutFn,
    clearTimeoutFn: fake.clearTimeoutFn,
  });
  const runs: string[] = [];
  sched.runAt(1000, () => void runs.push("late"));
  assert.equal(fake.pending, 1);
  sched.runAt(200, () => void runs.push("early"));
  assert.equal(fake.pending, 1); // old timer was CLEARED, not stacked
  await fake.tick(200);
  assert.deepEqual(runs, ["early"]); // sooner job fired first, no 1000ms wait
  await fake.tick(800);
  assert.deepEqual(runs, ["early", "late"]);
  sched.stop();
});

test("cronNext computes correct next occurrences (UTC)", () => {
  // */n step
  assert.equal(
    cronNext("*/15 * * * *", Date.UTC(2026, 0, 1, 0, 7)),
    Date.UTC(2026, 0, 1, 0, 15),
  );
  // strictly after: exactly on a match -> NEXT occurrence, no double-fire
  assert.equal(
    cronNext("0 * * * *", Date.UTC(2026, 0, 1, 10, 0)),
    Date.UTC(2026, 0, 1, 11, 0),
  );
  // day-of-week: Mondays 09:00. 2026-01-01 is a Thursday -> Mon 2026-01-05.
  assert.equal(
    cronNext("0 9 * * 1", Date.UTC(2026, 0, 1, 12, 0)),
    Date.UTC(2026, 0, 5, 9, 0),
  );
  // day-of-month rollover into next month
  assert.equal(
    cronNext("30 8 1 * *", Date.UTC(2026, 0, 2, 0, 0)),
    Date.UTC(2026, 1, 1, 8, 30),
  );
  // comma list
  assert.equal(
    cronNext("0,30 12 * * *", Date.UTC(2026, 0, 1, 12, 5)),
    Date.UTC(2026, 0, 1, 12, 30),
  );
});

test("scheduler runs cron and recurring jobs; pause/cancel work", async () => {
  const fake = new FakeTimers(); // t=0 is 1970-01-01T00:00Z
  const sched = new Scheduler({
    clock: fake.clock,
    setTimeoutFn: fake.setTimeoutFn,
    clearTimeoutFn: fake.clearTimeoutFn,
  });
  let cronRuns = 0;
  sched.cron("*/15 * * * *", () => void cronRuns++);
  await fake.tick(15 * 60_000);
  assert.equal(cronRuns, 1);
  await fake.tick(15 * 60_000);
  assert.equal(cronRuns, 2);

  let everyRuns = 0;
  const id = sched.every(100, () => void everyRuns++);
  await fake.tick(250); // fires at +100, +200 (fixed-rate from scheduled time)
  assert.equal(everyRuns, 2);
  sched.pause(id);
  await fake.tick(200); // +300, +400 occurrences skipped while paused
  assert.equal(everyRuns, 2);
  sched.resume(id);
  await fake.tick(100); // +500 fires
  assert.equal(everyRuns, 3);
  sched.cancel(id);
  await fake.tick(300);
  assert.equal(everyRuns, 3);
  sched.stop();
});

test("queue concurrency is capped at N", async () => {
  const fake = new FakeTimers();
  const q = new TaskQueue({
    concurrency: 2,
    setTimeoutFn: fake.setTimeoutFn,
    clearTimeoutFn: fake.clearTimeoutFn,
  });
  const sleep = (ms: number) => new Promise<void>((r) => fake.setTimeoutFn(r, ms));
  let running = 0;
  let maxRunning = 0;
  const task = () => async () => {
    running++;
    maxRunning = Math.max(maxRunning, running);
    await sleep(50);
    running--;
  };
  const promises = [1, 2, 3, 4, 5].map(() => q.add(task()));
  await flush();
  assert.equal(q.activeCount, 2);
  assert.equal(q.pendingCount, 3);
  await fake.tick(200);
  await Promise.all(promises);
  assert.equal(maxRunning, 2); // never exceeded N at any point
});

test("higher priority first, FIFO tie-break within priority", async () => {
  const fake = new FakeTimers();
  const q = new TaskQueue({
    concurrency: 1,
    setTimeoutFn: fake.setTimeoutFn,
    clearTimeoutFn: fake.clearTimeoutFn,
  });
  const order: string[] = [];
  let release!: () => void;
  const blocker = q.add(() => new Promise<void>((r) => (release = r)));
  await flush(); // blocker occupies the single worker slot
  void q.add(() => void order.push("low-a"), { priority: 1 });
  void q.add(() => void order.push("high"), { priority: 5 });
  void q.add(() => void order.push("low-b"), { priority: 1 });
  release();
  await flush();
  await blocker;
  assert.deepEqual(order, ["high", "low-a", "low-b"]);
});

test("retry delays follow capped exponential backoff (random stubbed to 1)", async () => {
  const fake = new FakeTimers();
  const q = new TaskQueue({
    concurrency: 1,
    maxAttempts: 4,
    baseDelayMs: 100,
    maxDelayMs: 250, // exercise the cap on the third retry
    randomFn: () => 1, // full jitter upper bound -> deterministic
    setTimeoutFn: fake.setTimeoutFn,
    clearTimeoutFn: fake.clearTimeoutFn,
  });
  const delays: number[] = [];
  q.on("retrying", (e) => delays.push(e.delayMs!));
  let executions = 0;
  const p = q.add(() => {
    executions++;
    throw new Error("boom");
  });
  await flush();
  await fake.tick(100); // retry 1: min(250, 100*2^0) = 100
  await fake.tick(200); // retry 2: min(250, 100*2^1) = 200
  await fake.tick(250); // retry 3: min(250, 100*2^2) = 250 (capped)
  assert.deepEqual(delays, [100, 200, 250]);
  assert.equal(executions, 4); // maxAttempts total executions
  await assert.rejects(p, /boom/);
  assert.equal(q.deadLetter.length, 1);
  assert.equal(q.deadLetter[0].state, "failed");
  assert.equal(fake.pending, 0); // no leaked retry timers
});

test("same idempotency key while pending/active returns the same promise", async () => {
  const q = new TaskQueue({ concurrency: 1 });
  let calls = 0;
  const work = async () => {
    calls++;
    return `result-${calls}`;
  };
  const p1 = q.add(work, { idempotencyKey: "charge:order-42" });
  const p2 = q.add(work, { idempotencyKey: "charge:order-42" });
  assert.equal(p1, p2); // the exact same promise object -- no second enqueue
  assert.equal(await p1, "result-1");
  assert.equal(calls, 1);
  // ttl=0: key released on settle, so a later add re-executes
  const p3 = q.add(work, { idempotencyKey: "charge:order-42" });
  assert.equal(await p3, "result-2");
  assert.equal(calls, 2);
});

test("shutdown stops intake, fails queued jobs, drains active ones", async () => {
  const fake = new FakeTimers();
  const q = new TaskQueue({
    concurrency: 2,
    setTimeoutFn: fake.setTimeoutFn,
    clearTimeoutFn: fake.clearTimeoutFn,
  });
  const sleep = (ms: number) => new Promise<void>((r) => fake.setTimeoutFn(r, ms));
  const done: string[] = [];
  const p1 = q.add(async () => {
    await sleep(100);
    done.push("a");
  });
  const p2 = q.add(async () => {
    await sleep(100);
    done.push("b");
  });
  const p3 = q.add(async () => {
    done.push("never");
  });
  await flush(); // a+b active, third still queued
  let drained = false;
  const sd = q.shutdown({ timeoutMs: 5000 }).then(() => void (drained = true));
  await assert.rejects(p3, /shutdown/); // queued job rejected immediately
  await flush();
  assert.equal(drained, false); // still waiting on the two active jobs
  await fake.tick(100);
  await sd;
  assert.deepEqual(done.sort(), ["a", "b"]); // active work finished, not dropped
  await Promise.all([p1, p2]);
  await assert.rejects(q.add(async () => 1), /shutting down/); // intake closed
  assert.equal(fake.pending, 0); // drain timeout timer was cleared
});

// ---- run ----

(async () => {
  let failed = 0;
  for (const [name, fn] of tests) {
    try {
      await fn();
      console.log(`ok   - ${name}`);
    } catch (err) {
      failed++;
      console.error(`FAIL - ${name}`);
      console.error(err);
    }
  }
  if (failed > 0) {
    console.error(`${failed}/${tests.length} tests failed`);
    process.exit(1);
  }
  console.log(`${tests.length} tests passed`);
})();
```

If the interviewer prefers vitest, the harness maps directly: `test(...)` becomes vitest's `test`, and you can either keep the injected `FakeTimers` (cleaner -- the code under test never touches globals) or use `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync(ms)` and drop the injection. Say why you prefer injection: it makes the seam explicit and works in any runner.

---

## Follow-up questions

**Q: How would you make the scheduler distributed -- multiple instances, each job fires exactly once per occurrence?**

Two standard shapes. (1) **Leader election**: only the elected leader arms timers; followers are hot standbys. Elect via a Postgres advisory lock, an etcd/ZooKeeper lease, or a Redis lock with TTL + fencing token. Simple, but the leader is a throughput bottleneck and failover pauses scheduling for one lease TTL. (2) **Shared claim table**: every instance polls a `jobs` table and claims due rows with `SELECT ... WHERE next_run <= now() AND state = 'scheduled' FOR UPDATE SKIP LOCKED LIMIT k` -- `SKIP LOCKED` makes concurrent workers grab disjoint rows without lock contention, giving you horizontal scale and no election at all. In practice, you often skip building this: Redis-backed queues like BullMQ implement delayed/repeatable jobs on sorted sets (`ZRANGEBYSCORE` on the timestamp) with Lua scripts for atomic claim, which is exactly this pattern productized. The in-memory heap version you wrote becomes the per-process execution layer under any of these.

**Q: The process was down for 3 hours. What happens to the runs it missed?**

That is a policy decision, and you should surface it as one: **catch-up** (run every missed occurrence -- correct for "generate hourly invoice", dangerous for "send reminder email" where the user gets 3 duplicates), **skip** (drop missed occurrences and schedule the next future one -- what this implementation's `every()` does via its `while (next <= now)` skip loop, and what most notification-type jobs want), or **coalesce** (run once for the whole missed window -- right for "sync data" style jobs where one run covers everything). To support catch-up at all you need persistence of `lastScheduledFor` per job; on boot you replay from there. Quartz calls these "misfire instructions" -- naming that shows you have seen this before.

**Q: Can you guarantee exactly-once execution?**

No, and saying so confidently is the point. The crash window is unavoidable: the worker completes the side effect, then dies before recording completion -- on recovery you cannot distinguish "did it, didn't record" from "never did it". So you choose at-least-once (retry on ambiguity) and make the *effect* idempotent, or at-most-once (record intent before executing, never retry ambiguity) and accept lost work. The industry answer is at-least-once delivery + idempotent handlers: idempotency keys checked at the effect boundary (e.g. unique constraint on `payment_intent_id`), or transactionally staging the effect and its completion marker in the same database transaction (the outbox pattern). The in-memory `byKey` map in this implementation is the single-process version; distributed, the key check must live in the datastore that owns the side effect.

**Q: Your cron runs in UTC. What about timezones and DST?**

Naive local-time cron breaks twice a year: `30 2 * * *` never fires on spring-forward day (02:30 does not exist) and is ambiguous on fall-back day (02:30 happens twice). Production options: store the schedule with an explicit IANA zone (`Europe/Berlin`), compute the next *wall-clock* match, then convert to an instant using a real tz library (`Intl.DateTimeFormat`-based math, or Temporal's `ZonedDateTime` which lets you pick `disambiguation: 'earlier' | 'later' | 'compatible'` for the ambiguous hour). Policy for nonexistent times is usually "shift forward to the first valid instant" (cron daemons differ -- Vixie cron runs skipped jobs once after the jump). In an interview: evaluate in UTC, say exactly this trade-off, and mention you would reach for a library rather than hand-roll tz rules.

**Q: How do you persist this so jobs survive restarts?**

Split state into (a) *definitions* (cron expr / interval, handler name, options) and (b) *runtime state* (next_run, attempts, status). Persist both in a table or Redis; on boot, load definitions and rebuild the heap from `next_run` -- the heap is a cache, the DB is the truth. Two rules keep it correct: transition state transactionally with the claim (queued -> active must be atomic, e.g. the `FOR UPDATE SKIP LOCKED` claim above writes `state='active', locked_by=worker_id, lease_until=...` in one statement), and give active jobs a lease/heartbeat so a crashed worker's jobs are reclaimed when the lease expires rather than being stuck in `active` forever. Handlers persist by *name* with a registry mapping name -> function, since you cannot serialize closures. The dead-letter list becomes a real table you can inspect and re-drive.

---

## What gets you rejected

- **A polling loop.** `setInterval(() => checkForDueJobs(), 1000)` is the #1 instant-downgrade answer: it burns CPU at idle, adds up to a full second of latency, and shows you do not know how to invert control with a single armed timer. The heap-top + re-arm pattern is the whole point of the exercise.
- **`setInterval` (or completion-relative scheduling) for recurring jobs.** If each next run is computed from when the previous run *finished*, every execution's duration accumulates as drift: a "every 60s" job whose handler takes 2s fires at 0:00, 1:02, 2:04... Compute the next occurrence from the *scheduled* time (`scheduledFor + interval`, fixed-rate), or explicitly name the alternative and its trade-off: fixed-delay (interval measured from completion) is legitimate when you must not overlap runs, but it is a choice, not an accident.
- **An unhandled rejection killing the pool.** If `runJob` does not wrap the task in try/catch, the first rejected task promise takes down the process (Node's default `unhandledRejection` behavior is crash) -- or, in a softer variant, the worker slot leaks because `active` is never decremented, and the pool silently shrinks to zero. Both catch paths in this implementation (`runJob`'s try/catch and the scheduler's `.catch` on the fired job) exist for this reason.
- **Retry without jitter.** `base * 2^attempt` alone means every job that failed together retries together -- the thundering herd re-kills the recovering dependency on a synchronized schedule. Full jitter (`random(0, cap)`) spreads the retries across the window; it is one multiplication and shows you have read the AWS backoff analysis rather than pattern-matched "exponential backoff".
- **Shutdown that drops active jobs.** `process.exit()` in a SIGTERM handler, or a `shutdown()` that resolves without awaiting in-flight tasks, means half-finished side effects on every deploy. Drain properly: close intake, cancel not-yet-started work explicitly (reject, do not strand), await active tasks with a bounded timeout, and only then return. Also watch the subtle one: resolving the drain promise but leaking the drain-timeout timer keeps the event loop alive -- clear it (the last assertion in test 8 exists to catch exactly that).
- Smaller but noticed: `siftDown` comparing only against the left child; missing the `seq` tie-break (flaky FIFO); cron `next` not strictly after `now` (double-fires when a run lands exactly on the minute); `cancel()` that rebuilds the heap in O(n log n) when lazy deletion is one boolean.
