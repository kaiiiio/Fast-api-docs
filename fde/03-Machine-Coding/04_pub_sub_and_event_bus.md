# Pub/Sub & Event Bus - Machine Coding Round

One of the most common machine coding prompts for senior/staff Forward Deployed Engineer rounds. It looks like a toy ("just an event emitter") but the follow-up requirements — ack/redelivery, consumer groups, backpressure — are exactly where candidates run out of time or produce code that deadlocks. The interviewer is checking whether you have internalized real broker semantics (SQS visibility timeouts, Kafka consumer groups, MQTT topic filters) well enough to reproduce them in 45-60 minutes of plain TypeScript.

> **Interview prompt (verbatim):**
> "Build an in-memory pub/sub message broker in TypeScript. It must support: topics with subscribe/unsubscribe; wildcard subscriptions; at-least-once delivery where consumers must `ack(msgId)` and unacked messages are redelivered after a visibility timeout with a max retry count; a dead letter queue after max retries that can be inspected and drained; consumer groups where members of a group receive messages round-robin (each message goes to exactly one member) while different groups each receive a copy; and backpressure via a bounded per-subscriber queue with configurable overflow policy. Time must be injectable so we can unit test redelivery. Afterwards, build a small strongly-typed `EventBus<Events>` with `on/off/once/emit` and a middleware pipeline where middleware can transform or veto events. We will run your code against test cases."

Requirements checklist (what the grader's tests will exercise):

- `subscribe(pattern, handler, options)` returns a handle with `ack(msgId)` and `unsubscribe()`.
- Wildcard matching on dot-separated topics: `*` = exactly one segment, `#` = zero or more trailing segments. You implement the matcher; no regex-from-user-input tricks.
- At-least-once delivery: a delivered message stays "in flight" until acked; if the visibility timeout elapses first, it is redelivered and its attempt counter increments.
- After `maxAttempts` failed deliveries the message moves to a dead letter queue, inspectable via `getDeadLetters(topicFilter?)` and drainable via `drainDeadLetters(topicFilter?)`.
- Consumer groups: same `group` name on the same pattern shares one delivery stream round-robin; distinct groups (or solo subscribers) each get an independent copy of every matching message.
- Backpressure: bounded queue per delivery stream; overflow policies `drop-oldest`, `drop-newest`, `block` (async `publish` returns a promise that resolves only once every matching stream accepted the message).
- Injectable `Clock` so tests can fast-forward visibility timeouts deterministically.
- Typed `EventBus<Events extends Record<string, unknown>>` with type-safe payloads and an ordered middleware pipeline that can transform or veto (`return false`).

## Approach & time budget

Plan the hour in 10-minute blocks and say the plan out loud in the first two minutes — interviewers reward candidates who sequence risk correctly (semantics first, sugar last).

**0-10 min — Semantics, types, and the topic matcher.**
Lock down the delivery contract verbally: "at-least-once, per-group FIFO-ish, prefetch of 1 per consumer" and get the interviewer to nod. Write the `Message`, `Clock`, `SubscribeOptions` types and the wildcard matcher with its convention documented in a comment. The matcher is 10 lines and several test cases depend on it, so it goes first. Narrate the `*` vs `#` distinction explicitly.

**10-20 min — Publish, fan-out, subscribe/unsubscribe.**
Implement group registry keyed by `(pattern, group)`, `publish` that clones one message per matching group, and asynchronous delivery via `queueMicrotask`. Get simple fan-out working end to end so you always have something demoable. Narrate why delivery is never synchronous (re-entrancy, error isolation).

**20-30 min — Ack, visibility timeout, retry counter, DLQ.**
This is the technical heart. In-flight state lives on the member; a timer per delivery; ack clears it; timeout requeues at the front of the group queue; `attempts >= maxAttempts` diverts to the DLQ array. Narrate the stale-ack guard (ack after the timer fired is a no-op).

**30-40 min — Consumer groups and round-robin.**
Because you keyed streams by `(pattern, group)` in block 2, this is mostly the `nextIdleMember` rotation and the "solo subscriber = its own anonymous group" trick. Narrate: prefetch 1 makes round-robin trivial and naturally load-balances (a slow member simply takes fewer messages).

**40-50 min — Backpressure.**
Bounded queue check inside `enqueue`, three policies, waiter list for `block`. Narrate the trade-offs: drop-oldest keeps freshest data (metrics/telemetry), drop-newest preserves earliest-wins semantics (first webhook wins), block gives lossless flow control but couples producer latency to the slowest consumer group and risks producer starvation.

**50-60 min — Typed EventBus + test walkthrough.**
The typed bus is deliberately small; bank the time earlier so this is a victory lap. Run the tests, and if anything is red, debug out loud — recovering visibly from a red test is worth more than silent green.

If you are given only 45 minutes: cut the `block` policy and the typed bus middleware to a described-not-coded state, and say you are doing so. Never cut ack/redelivery — it is the differentiator.

## Implementation

Single file, zero external dependencies, runs under `ts-node`/`tsx` or compiles with `tsc`.

```typescript
// pubsub.ts
// ============================================================================
// Part 1: Injectable clock
// ============================================================================

export type TimerId = number;

export interface Clock {
  now(): number;
  setTimeout(fn: () => void, ms: number): TimerId;
  clearTimeout(id: TimerId): void;
}

export class RealClock implements Clock {
  now(): number {
    return Date.now();
  }
  setTimeout(fn: () => void, ms: number): TimerId {
    return setTimeout(fn, ms) as unknown as TimerId;
  }
  clearTimeout(id: TimerId): void {
    clearTimeout(id as unknown as ReturnType<typeof setTimeout>);
  }
}

/**
 * Deterministic clock for tests. `advance(ms)` fires due timers in
 * timestamp order, synchronously. Handlers scheduled via queueMicrotask by
 * the broker still need a microtask flush afterwards (see tests' flush()).
 */
export class FakeClock implements Clock {
  private t = 0;
  private seq = 1;
  private timers = new Map<TimerId, { at: number; fn: () => void }>();

  now(): number {
    return this.t;
  }

  setTimeout(fn: () => void, ms: number): TimerId {
    const id = this.seq++;
    this.timers.set(id, { at: this.t + ms, fn });
    return id;
  }

  clearTimeout(id: TimerId): void {
    this.timers.delete(id);
  }

  advance(ms: number): void {
    const target = this.t + ms;
    for (;;) {
      let nextId: TimerId | null = null;
      let nextAt = Infinity;
      for (const [id, timer] of this.timers) {
        if (timer.at <= target && timer.at < nextAt) {
          nextAt = timer.at;
          nextId = id;
        }
      }
      if (nextId === null) break;
      const timer = this.timers.get(nextId)!;
      this.timers.delete(nextId);
      this.t = timer.at; // time observed inside the callback is the fire time
      timer.fn();
    }
    this.t = target;
  }
}

// ============================================================================
// Part 2: Topic matcher
// ============================================================================
//
// Convention (MQTT-style, dot-separated):
//   - Topics are dot-separated segments: "orders.eu.created".
//   - "*"  matches EXACTLY ONE segment:  "orders.*"  matches "orders.created"
//     but NOT "orders.eu.created" and NOT "orders".
//   - "#"  matches ZERO OR MORE trailing segments and is only meaningful as
//     the LAST pattern segment: "orders.#" matches "orders", "orders.created"
//     and "orders.eu.created". A "#" that is not last never matches anything.

export function topicMatches(pattern: string, topic: string): boolean {
  const p = pattern.split(".");
  const t = topic.split(".");
  for (let i = 0; i < p.length; i++) {
    const seg = p[i];
    if (seg === "#") return i === p.length - 1; // multi-level, must be last
    if (i >= t.length) return false;            // pattern longer than topic
    if (seg !== "*" && seg !== t[i]) return false;
  }
  return p.length === t.length;                 // topic longer than pattern
}

// ============================================================================
// Part 3: Broker types
// ============================================================================

export interface Message<T = unknown> {
  id: string;
  topic: string;
  payload: T;
  attempts: number; // delivery attempts so far (1 on first delivery)
  publishedAt: number;
}

export type OverflowPolicy = "drop-oldest" | "drop-newest" | "block";

export interface SubscribeOptions {
  /** Members sharing a group name (on the same pattern) share one stream. */
  group?: string;
  /** Bound of the pending queue for this delivery stream. Default 1024. */
  maxQueueSize?: number;
  /** What to do when the queue is full. Default "block". */
  overflow?: OverflowPolicy;
  /** How long a delivered message may stay unacked. Default 30_000 ms. */
  visibilityTimeoutMs?: number;
  /** Total delivery attempts before dead-lettering. Default 3. */
  maxAttempts?: number;
}

export type Handler<T = unknown> = (msg: Message<T>) => void | Promise<void>;

export interface Subscription {
  ack(msgId: string): void;
  unsubscribe(): void;
}

export interface DeadLetter {
  message: Message;
  reason: "max-attempts" | "handler-error";
  deadAt: number;
}

interface MemberState {
  id: number;
  handler: Handler;
  inFlight: { msg: Message; timer: TimerId } | null; // prefetch = 1
}

interface GroupState {
  key: string;
  pattern: string;
  name: string;
  options: Required<Omit<SubscribeOptions, "group">>;
  queue: Message[];                                   // pending, bounded
  waiters: Array<{ msg: Message; resolve: () => void }>; // blocked publishers
  members: MemberState[];
  rr: number;                                         // round-robin cursor
}

const DEFAULT_OPTIONS: Required<Omit<SubscribeOptions, "group">> = {
  maxQueueSize: 1024,
  overflow: "block",
  visibilityTimeoutMs: 30_000,
  maxAttempts: 3,
};

// ============================================================================
// Part 4: Broker
// ============================================================================

export class Broker {
  private groups = new Map<string, GroupState>();
  private deadLetters: DeadLetter[] = [];
  private msgSeq = 0;
  private memberSeq = 0;

  constructor(private clock: Clock = new RealClock()) {}

  /**
   * Publish resolves once every matching delivery stream has ACCEPTED the
   * message into its queue (relevant for the "block" policy). It does NOT
   * wait for consumers to process or ack — that would be request/response,
   * not pub/sub.
   */
  publish<T>(topic: string, payload: T): Promise<void> {
    const pending: Promise<void>[] = [];
    for (const g of this.groups.values()) {
      if (!topicMatches(g.pattern, topic)) continue;
      // Each group gets its OWN message instance: attempt counters and ack
      // state are per delivery stream, exactly like Kafka consumer groups
      // each tracking their own offset.
      const msg: Message = {
        id: `m${++this.msgSeq}`,
        topic,
        payload,
        attempts: 0,
        publishedAt: this.clock.now(),
      };
      pending.push(this.enqueue(g, msg));
    }
    return Promise.all(pending).then(() => undefined);
  }

  subscribe<T = unknown>(
    pattern: string,
    handler: Handler<T>,
    options: SubscribeOptions = {},
  ): Subscription {
    // A solo subscriber is modeled as its own anonymous group, so "copy per
    // group" and "round-robin within a group" are one code path.
    const groupName = options.group ?? `__solo_${++this.memberSeq}`;
    const key = `${pattern}\u0000${groupName}`; // NUL separator: cannot collide with topic chars
    let g = this.groups.get(key);
    if (!g) {
      g = {
        key,
        pattern,
        name: groupName,
        options: { ...DEFAULT_OPTIONS, ...stripGroup(options) },
        queue: [],
        waiters: [],
        members: [],
        rr: 0,
      };
      this.groups.set(key, g);
    }
    const member: MemberState = {
      id: ++this.memberSeq,
      handler: handler as Handler,
      inFlight: null,
    };
    g.members.push(member);
    this.dispatch(g);

    const group = g;
    return {
      ack: (msgId: string): void => {
        // Stale acks (visibility timer already fired, message requeued) are
        // deliberately a no-op — see "Interview trap" below.
        if (member.inFlight && member.inFlight.msg.id === msgId) {
          this.clock.clearTimeout(member.inFlight.timer);
          member.inFlight = null;
          this.dispatch(group);
        }
      },
      unsubscribe: (): void => {
        const idx = group.members.indexOf(member);
        if (idx === -1) return; // double-unsubscribe is a no-op
        group.members.splice(idx, 1);
        if (member.inFlight) {
          // Hand the in-flight message back so it is not lost.
          this.clock.clearTimeout(member.inFlight.timer);
          group.queue.unshift(member.inFlight.msg);
          member.inFlight = null;
        }
        if (group.members.length === 0) {
          this.groups.delete(group.key);
          // Never leave publishers awaiting a queue nobody will drain.
          for (const w of group.waiters) w.resolve();
          group.waiters.length = 0;
        } else {
          if (group.rr >= group.members.length) group.rr = 0;
          this.dispatch(group);
        }
      },
    };
  }

  /** Inspect dead letters; the filter accepts wildcards ("orders.#"). */
  getDeadLetters(topicFilter?: string): DeadLetter[] {
    if (!topicFilter) return [...this.deadLetters];
    return this.deadLetters.filter((d) => topicMatches(topicFilter, d.message.topic));
  }

  /** Remove and return dead letters (e.g. to replay them). */
  drainDeadLetters(topicFilter?: string): DeadLetter[] {
    const drained = this.getDeadLetters(topicFilter);
    const keep = new Set(drained);
    this.deadLetters = this.deadLetters.filter((d) => !keep.has(d));
    return drained;
  }

  // -------------------------------------------------------------- internals

  private enqueue(g: GroupState, msg: Message): Promise<void> {
    if (g.queue.length < g.options.maxQueueSize) {
      g.queue.push(msg);
      this.dispatch(g);
      return Promise.resolve();
    }
    switch (g.options.overflow) {
      case "drop-oldest": {
        g.queue.shift(); // sacrifice the oldest PENDING message
        g.queue.push(msg);
        this.dispatch(g);
        return Promise.resolve();
      }
      case "drop-newest": {
        return Promise.resolve(); // silently shed the incoming message
      }
      case "block": {
        // Publisher awaits until a slot frees (on ack / timeout dispatch).
        return new Promise<void>((resolve) => {
          g.waiters.push({ msg, resolve });
        });
      }
    }
  }

  private dispatch(g: GroupState): void {
    while (g.queue.length > 0) {
      const member = this.nextIdleMember(g);
      if (!member) break; // everyone busy; ack/timeout will re-dispatch
      const msg = g.queue.shift()!;
      this.admitWaiters(g); // a slot just freed — let blocked publishers in
      this.deliver(g, member, msg);
    }
    this.admitWaiters(g);
  }

  private admitWaiters(g: GroupState): void {
    while (g.waiters.length > 0 && g.queue.length < g.options.maxQueueSize) {
      const w = g.waiters.shift()!;
      g.queue.push(w.msg);
      w.resolve();
    }
  }

  private nextIdleMember(g: GroupState): MemberState | null {
    const n = g.members.length;
    for (let i = 0; i < n; i++) {
      const idx = (g.rr + i) % n;
      const m = g.members[idx];
      if (!m.inFlight) {
        g.rr = (idx + 1) % n; // rotate PAST the chosen member
        return m;
      }
    }
    return null;
  }

  private deliver(g: GroupState, member: MemberState, msg: Message): void {
    msg.attempts += 1;
    const timer = this.clock.setTimeout(
      () => this.onVisibilityTimeout(g, member, msg),
      g.options.visibilityTimeoutMs,
    );
    member.inFlight = { msg, timer };

    // NEVER call the handler synchronously from publish/dispatch:
    //  1) a throwing handler must not blow up the publisher's stack,
    //  2) a handler that publishes must not re-enter dispatch mid-iteration.
    queueMicrotask(() => {
      if (member.inFlight?.msg !== msg) return; // unsubscribed meanwhile
      let result: void | Promise<void>;
      try {
        result = member.handler(msg);
      } catch {
        this.failDelivery(g, member, msg);
        return;
      }
      if (result && typeof (result as Promise<void>).then === "function") {
        (result as Promise<void>).catch(() => this.failDelivery(g, member, msg));
      }
    });
  }

  private onVisibilityTimeout(g: GroupState, member: MemberState, msg: Message): void {
    if (member.inFlight?.msg !== msg) return; // stale timer (already acked)
    member.inFlight = null;
    this.retryOrDeadLetter(g, msg, "max-attempts");
    this.dispatch(g);
  }

  /** Handler threw / rejected: treat as an immediate nack. */
  private failDelivery(g: GroupState, member: MemberState, msg: Message): void {
    if (member.inFlight?.msg !== msg) return; // already acked or timed out
    this.clock.clearTimeout(member.inFlight.timer);
    member.inFlight = null;
    this.retryOrDeadLetter(g, msg, "handler-error");
    this.dispatch(g);
  }

  private retryOrDeadLetter(g: GroupState, msg: Message, reason: DeadLetter["reason"]): void {
    if (msg.attempts >= g.options.maxAttempts) {
      this.deadLetters.push({ message: msg, reason, deadAt: this.clock.now() });
      return;
    }
    // Redeliveries jump the queue (unshift) and intentionally BYPASS the
    // bound: a retry must never be shed by the overflow policy, otherwise
    // "at-least-once" silently degrades to "at-most-once" under load.
    g.queue.unshift(msg);
  }
}

function stripGroup(o: SubscribeOptions): Omit<SubscribeOptions, "group"> {
  const { group: _group, ...rest } = o;
  return rest;
}

// ============================================================================
// Part 5: Typed EventBus with middleware
// ============================================================================
//
// Deliberately smaller and synchronous: this is the in-process "signal"
// abstraction (UI events, domain events inside one service), while Broker is
// the queue abstraction. Interviewers often ask you to articulate exactly
// that distinction.

export type BusHandler<P> = (payload: P) => void;

/**
 * Middleware receives (event, payload) and must return either the (possibly
 * transformed) payload, or `false` to veto the event entirely. Middleware
 * runs in registration order; a veto short-circuits the rest of the chain
 * and all handlers.
 */
export type BusMiddleware<Events extends Record<string, unknown>> = <
  K extends keyof Events & string,
>(
  event: K,
  payload: Events[K],
) => Events[K] | false;

export class EventBus<Events extends Record<string, unknown>> {
  private handlers = new Map<keyof Events, Set<BusHandler<never>>>();
  private middlewares: BusMiddleware<Events>[] = [];

  on<K extends keyof Events & string>(event: K, fn: BusHandler<Events[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(fn as BusHandler<never>);
    return () => this.off(event, fn); // disposer: makes leak-free usage easy
  }

  off<K extends keyof Events & string>(event: K, fn: BusHandler<Events[K]>): void {
    const set = this.handlers.get(event);
    if (!set) return;
    set.delete(fn as BusHandler<never>);
    if (set.size === 0) this.handlers.delete(event); // don't leak empty sets
  }

  once<K extends keyof Events & string>(event: K, fn: BusHandler<Events[K]>): () => void {
    const wrapper: BusHandler<Events[K]> = (payload) => {
      this.off(event, wrapper);
      fn(payload);
    };
    return this.on(event, wrapper);
  }

  use(mw: BusMiddleware<Events>): void {
    this.middlewares.push(mw);
  }

  /** Returns false if a middleware vetoed the event, true otherwise. */
  emit<K extends keyof Events & string>(event: K, payload: Events[K]): boolean {
    let current = payload;
    for (const mw of this.middlewares) {
      const out = mw(event, current);
      if (out === false) return false;
      current = out;
    }
    const set = this.handlers.get(event);
    if (!set) return true;
    // Snapshot: handlers may add/remove listeners (e.g. once) during emit.
    for (const fn of [...set] as BusHandler<Events[K]>[]) {
      try {
        fn(current);
      } catch {
        // One faulty listener must never prevent the others from running.
        // Production version: route to an onError hook instead of swallowing.
      }
    }
    return true;
  }
}

// Concrete event map showing the type-safety in action:
export interface AppEvents extends Record<string, unknown> {
  "user.created": { id: string; email: string };
  "order.paid": { orderId: string; amount: number };
  metric: { name: string; value: number };
}
// const bus = new EventBus<AppEvents>();
// bus.on("order.paid", (p) => p.amount.toFixed(2));   // p fully typed
// bus.emit("order.paid", { orderId: "o1", amount: 5 }); // payload checked
// bus.emit("order.paid", { orderId: "o1" });            // compile error
```

**Interview trap:** delivering synchronously during `publish` is the classic re-entrancy bug. If a handler calls `publish` (or `subscribe`) from inside a synchronous delivery, you mutate `groups`/`queue` while iterating them, and a handler that throws unwinds the *publisher's* stack, so subscriber N+1 never gets the message. The `queueMicrotask` in `deliver` fixes both at once — call that out explicitly while coding it.

**Interview trap:** the wildcard matcher edge cases. `orders.*` must NOT match `orders.a.b` (that needs `orders.#`), must NOT match bare `orders`, and `#` anywhere except the last segment should match nothing. Candidates who translate patterns to regexes usually get `*` greedy across dots and fail the multi-level test. Write segment-by-segment matching and state the convention in a comment.

**Interview trap:** `ack(msgId)` arriving after the visibility timer already fired. The message was requeued (or dead-lettered) — the ack must be a strict no-op, otherwise you double-complete: the redelivered copy is processed by another member while the stale ack also marks it done, corrupting the round-robin cursor's idle bookkeeping. The guard here is identity-checking `member.inFlight?.msg` before honoring an ack (and the symmetric check in `onVisibilityTimeout` for a stale timer after an ack).

**Interview trap:** `drop-oldest` must only ever shed *pending* messages, never a redelivery. Notice `retryOrDeadLetter` unshifts past the bound: a retry that gets shed by the overflow policy silently violates at-least-once, and graders test exactly this by filling the queue while a redelivery is due.

## Test cases

`node:assert` style with a minimal runner — no framework needed, which is ideal when the interview machine has nothing installed. (Every `assert` maps 1:1 to a vitest `expect` if they prefer that.)

```typescript
// pubsub.test.ts
import assert from "node:assert/strict";
import {
  Broker, EventBus, FakeClock, topicMatches, Message, AppEvents,
} from "./pubsub";

const flush = () => new Promise<void>((r) => setTimeout(r, 0));

type Test = { name: string; fn: () => Promise<void> | void };
const tests: Test[] = [];
const test = (name: string, fn: Test["fn"]) => tests.push({ name, fn });

// --- 1. Wildcard matcher -----------------------------------------------

test("topicMatches: exact, single-level *, multi-level #", () => {
  assert.equal(topicMatches("orders.created", "orders.created"), true);
  assert.equal(topicMatches("orders.created", "orders.cancelled"), false);
  assert.equal(topicMatches("orders.*", "orders.created"), true);
  assert.equal(topicMatches("orders.*", "orders.eu.created"), false); // trap
  assert.equal(topicMatches("orders.*", "orders"), false);
  assert.equal(topicMatches("orders.#", "orders"), true);            // zero segs
  assert.equal(topicMatches("orders.#", "orders.eu.created"), true);
  assert.equal(topicMatches("#", "anything.at.all"), true);
  assert.equal(topicMatches("*.created", "orders.created"), true);
  assert.equal(topicMatches("orders.#.x", "orders.a.x"), false);     // # not last
});

// --- 2. Fan-out + wildcard subscriptions --------------------------------

test("fan-out: every matching subscriber gets a copy; non-matching gets none", async () => {
  const broker = new Broker(new FakeClock());
  const exact: string[] = [];
  const single: string[] = [];
  const multi: string[] = [];
  const other: string[] = [];

  const s1 = broker.subscribe<string>("orders.created", (m) => { exact.push(m.payload); s1.ack(m.id); });
  const s2 = broker.subscribe<string>("orders.*",       (m) => { single.push(m.payload); s2.ack(m.id); });
  const s3 = broker.subscribe<string>("orders.#",       (m) => { multi.push(m.payload); s3.ack(m.id); });
  const s4 = broker.subscribe<string>("invoices.*",     (m) => { other.push(m.payload); s4.ack(m.id); });

  await broker.publish("orders.created", "a");
  await broker.publish("orders.eu.created", "b");
  await flush();

  assert.deepEqual(exact, ["a"]);
  assert.deepEqual(single, ["a"]);        // orders.* must skip orders.eu.created
  assert.deepEqual(multi, ["a", "b"]);
  assert.deepEqual(other, []);

  s2.unsubscribe();
  await broker.publish("orders.created", "c");
  await flush();
  assert.deepEqual(single, ["a"]);        // unsubscribed: no more deliveries
  assert.deepEqual(exact, ["a", "c"]);
});

// --- 3. Ack + redelivery after visibility timeout (fake timers) ---------

test("unacked message is redelivered after visibility timeout; ack stops it", async () => {
  const clock = new FakeClock();
  const broker = new Broker(clock);
  const seen: Array<{ id: string; attempts: number }> = [];

  const sub = broker.subscribe<string>(
    "tasks.run",
    (m) => { seen.push({ id: m.id, attempts: m.attempts }); }, // no ack yet
    { visibilityTimeoutMs: 5_000, maxAttempts: 5 },
  );

  await broker.publish("tasks.run", "job");
  await flush();
  assert.equal(seen.length, 1);
  assert.equal(seen[0].attempts, 1);

  clock.advance(4_999);
  await flush();
  assert.equal(seen.length, 1);           // not yet — timeout is 5000

  clock.advance(1);
  await flush();
  assert.equal(seen.length, 2);           // redelivered
  assert.equal(seen[1].attempts, 2);
  assert.equal(seen[1].id, seen[0].id);   // same message identity

  sub.ack(seen[1].id);                    // ack the second delivery
  clock.advance(60_000);
  await flush();
  assert.equal(seen.length, 2);           // no further redelivery
  assert.equal(broker.getDeadLetters().length, 0);

  sub.ack(seen[0].id);                    // stale ack: must be a silent no-op
});

// --- 4. DLQ after max retries -------------------------------------------

test("message dead-letters after maxAttempts and can be drained", async () => {
  const clock = new FakeClock();
  const broker = new Broker(clock);
  let deliveries = 0;

  broker.subscribe("pay.charge", () => { deliveries += 1; }, {
    visibilityTimeoutMs: 1_000,
    maxAttempts: 2,
  });

  await broker.publish("pay.charge", { amount: 42 });
  await flush();
  clock.advance(1_000); await flush();    // attempt 2 delivered
  clock.advance(1_000); await flush();    // attempt 2 timed out -> DLQ

  assert.equal(deliveries, 2);
  const dead = broker.getDeadLetters("pay.#");
  assert.equal(dead.length, 1);
  assert.equal(dead[0].reason, "max-attempts");
  assert.equal(dead[0].message.attempts, 2);

  const drained = broker.drainDeadLetters();
  assert.equal(drained.length, 1);
  assert.equal(broker.getDeadLetters().length, 0);

  clock.advance(60_000); await flush();
  assert.equal(deliveries, 2);            // dead means dead: no zombie timers
});

test("throwing handler nacks immediately and dead-letters after retries", async () => {
  const clock = new FakeClock();
  const broker = new Broker(clock);
  let calls = 0;
  broker.subscribe("boom", () => { calls += 1; throw new Error("nope"); }, {
    maxAttempts: 3, visibilityTimeoutMs: 1_000,
  });
  await broker.publish("boom", 1);
  await flush(); await flush(); await flush(); // immediate nack-retry chain
  assert.equal(calls, 3);
  assert.equal(broker.getDeadLetters()[0].reason, "handler-error");
});

// --- 5. Consumer groups: round-robin within, copy per group -------------

test("round-robin within a group; each group gets its own copy", async () => {
  const broker = new Broker(new FakeClock());
  const a: string[] = [];
  const b: string[] = [];
  const audit: string[] = [];

  const subA = broker.subscribe<string>("jobs", (m) => { a.push(m.payload); subA.ack(m.id); }, { group: "workers" });
  const subB = broker.subscribe<string>("jobs", (m) => { b.push(m.payload); subB.ack(m.id); }, { group: "workers" });
  const subC = broker.subscribe<string>("jobs", (m) => { audit.push(m.payload); subC.ack(m.id); }, { group: "auditors" });

  for (const j of ["j1", "j2", "j3", "j4"]) await broker.publish("jobs", j);
  await flush();

  assert.deepEqual(a, ["j1", "j3"]);                  // exactly one member each
  assert.deepEqual(b, ["j2", "j4"]);
  assert.deepEqual([...a, ...b].sort(), ["j1", "j2", "j3", "j4"]);
  assert.deepEqual(audit, ["j1", "j2", "j3", "j4"]);  // other group: full copy
});

// --- 6. Backpressure ------------------------------------------------------

test("drop-oldest: full queue sheds the oldest pending message", async () => {
  const broker = new Broker(new FakeClock());
  const received: Message<string>[] = [];
  const sub = broker.subscribe<string>(
    "metrics",
    (m) => { received.push(m); },       // manual acks from the test body
    { maxQueueSize: 2, overflow: "drop-oldest", visibilityTimeoutMs: 60_000 },
  );

  for (const v of ["v1", "v2", "v3", "v4"]) await broker.publish("metrics", v);
  await flush();
  // v1 in flight; queue was [v2, v3]; v4 arrived -> v2 dropped -> [v3, v4].
  assert.equal(received.length, 1);

  sub.ack(received[0].id); await flush();
  sub.ack(received[1].id); await flush();
  sub.ack(received[2].id); await flush();

  assert.deepEqual(received.map((m) => m.payload), ["v1", "v3", "v4"]);
});

test("block: publish promise resolves only when a slot frees", async () => {
  const broker = new Broker(new FakeClock());
  const inFlight: Message[] = [];
  const sub = broker.subscribe(
    "orders",
    (m) => { inFlight.push(m); },
    { maxQueueSize: 1, overflow: "block", visibilityTimeoutMs: 60_000 },
  );

  await broker.publish("orders", 1);      // delivered (in flight)
  await broker.publish("orders", 2);      // fills the queue slot
  let resolved = false;
  const p3 = broker.publish("orders", 3).then(() => { resolved = true; });
  await flush();
  assert.equal(resolved, false);          // publisher is paused

  sub.ack(inFlight[0].id);                // frees a slot: 2 delivered, 3 queued
  await flush();
  await p3;
  assert.equal(resolved, true);
});

// --- 7. Typed EventBus: middleware order, transform, veto, once ----------

test("EventBus: middleware runs in order, can transform and veto", () => {
  const bus = new EventBus<AppEvents>();
  const trace: string[] = [];
  const delivered: AppEvents["user.created"][] = [];

  bus.use((event, payload) => { trace.push(`mw1:${event}`); return payload; });
  bus.use((event, payload) => {
    trace.push(`mw2:${event}`);
    if (event === "metric" && (payload as AppEvents["metric"]).value < 0) {
      return false;                        // veto negative metrics
    }
    if (event === "user.created") {
      const p = payload as AppEvents["user.created"];
      return { ...p, email: p.email.toLowerCase() } as typeof payload;
    }
    return payload;
  });
  bus.use((event, payload) => { trace.push(`mw3:${event}`); return payload; });

  bus.on("user.created", (p) => delivered.push(p));

  const ok = bus.emit("user.created", { id: "u1", email: "KAY@PEDALSUP.COM" });
  assert.equal(ok, true);
  assert.deepEqual(delivered, [{ id: "u1", email: "kay@pedalsup.com" }]); // transformed
  assert.deepEqual(trace, ["mw1:user.created", "mw2:user.created", "mw3:user.created"]);

  trace.length = 0;
  let metricSeen = 0;
  bus.on("metric", () => { metricSeen += 1; });
  const vetoed = bus.emit("metric", { name: "lag", value: -1 });
  assert.equal(vetoed, false);
  assert.equal(metricSeen, 0);                       // veto blocks handlers
  assert.deepEqual(trace, ["mw1:metric", "mw2:metric"]); // mw3 short-circuited
});

test("EventBus: once fires once; off + disposer remove; throwing handler isolated", () => {
  const bus = new EventBus<AppEvents>();
  let onceCount = 0;
  let steady = 0;
  bus.once("order.paid", () => { onceCount += 1; });
  bus.on("order.paid", () => { throw new Error("bad listener"); });
  const dispose = bus.on("order.paid", () => { steady += 1; });

  bus.emit("order.paid", { orderId: "o1", amount: 10 });
  bus.emit("order.paid", { orderId: "o2", amount: 20 });
  assert.equal(onceCount, 1);
  assert.equal(steady, 2);               // survived the throwing sibling

  dispose();
  bus.emit("order.paid", { orderId: "o3", amount: 30 });
  assert.equal(steady, 2);
});

// --- Runner ---------------------------------------------------------------

(async () => {
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`ok   ${t.name}`);
    } catch (err) {
      failed += 1;
      console.error(`FAIL ${t.name}`);
      console.error(err);
    }
  }
  console.log(failed === 0 ? `\nAll ${tests.length} tests passed.` : `\n${failed} test(s) failed.`);
  if (failed > 0) process.exit(1);
})();
```

Run with `npx tsx pubsub.test.ts` (or compile with `tsc` and run the JS). Note the test-side pattern worth narrating: `FakeClock.advance()` fires broker timers synchronously, then `await flush()` drains the `queueMicrotask` deliveries — separating "time passing" from "handlers running" is what makes redelivery tests deterministic.

## Follow-up questions

**Q: Can you give me exactly-once delivery?**
No system can, and saying so confidently is the point of the question. Between "consumer processed the message" and "broker recorded the ack" there is always a window where either side can crash, so the broker must choose: redeliver (at-least-once, duplicates possible) or not (at-most-once, loss possible). Real "exactly-once" is *at-least-once delivery + idempotent processing*: the consumer dedupes on `msg.id` (or a business idempotency key) against a store whose write is atomic with the side effect — e.g. `INSERT INTO processed(msg_id)` in the same DB transaction as the business write. Kafka's "exactly-once semantics" is this pattern productized: idempotent producers (sequence numbers dedupe broker-side) plus transactions that commit output records and consumer offsets atomically — and it only holds within Kafka-to-Kafka pipelines; the moment you call an external API you are back to idempotency keys.

**Q: What ordering guarantees does your broker give, and what does Kafka do?**
Mine: per-group FIFO for pending messages, but three things break strict order — redeliveries jump the queue (`unshift`), round-robin means two members process concurrently so *completion* order is unordered, and `drop-oldest` deletes from the middle of the sequence. Global cross-topic order does not exist at all. Kafka's answer: order is guaranteed only *within a partition*; the producer keys messages (e.g. by `orderId`) so all events for one entity hash to one partition and are consumed in order by exactly one group member. Global order requires a single partition, which serializes consumption — that trade-off (ordering domain vs parallelism) is the sentence the interviewer wants to hear. To mimic it here, you would shard each group's queue by a message key and pin each shard to one member instead of round-robin.

**Q: How would you add persistence?**
Write-ahead log: `publish` appends `{id, topic, payload, ts}` to an append-only file *before* acknowledging the publisher; fsync policy is the durability/latency dial (per-message fsync like Redis `appendfsync always` vs batched like Kafka's page-cache flush). Consumer progress is persisted as acked offsets/ids per group (not by rewriting the log). On restart, replay the log, skip acked entries, and resume — everything unacked is redelivered, which is exactly why the delivery contract was at-least-once to begin with. Add periodic checkpoints/snapshots so replay is bounded, and segment + delete/compact old log files (Kafka's segment retention, Redis AOF rewrite).

**Q: How does this map to a distributed version on Redis Streams?**
Almost one-to-one, which is why this exercise is good FDE prep: `publish` → `XADD stream * field value`; consumer group → `XGROUP CREATE`; group member receive → `XREADGROUP GROUP g consumer1 COUNT n BLOCK ms` (Redis load-balances entries across consumers like our round-robin); `ack(msgId)` → `XACK`; the in-flight set → the PEL (Pending Entries List), inspectable with `XPENDING` (which even exposes delivery count and idle time — our `attempts` and visibility age); redelivery after timeout → `XAUTOCLAIM min-idle-time` run by a reaper; DLQ → when `XPENDING` shows delivery-count ≥ N, `XACK` it out of the PEL and `XADD` it to `stream:dlq`. What Redis does *not* give you: wildcard subscriptions across streams (you fan out at publish time or maintain a pattern registry) and blocking backpressure (streams are unbounded unless you cap with `XADD MAXLEN ~`, which is drop-oldest).

**Q: How do you detect and handle slow consumers?**
Instrument the three numbers this implementation already has: queue depth per group (backlog), in-flight age (time since `deliver` without ack — approaching the visibility timeout is a red flag), and redelivery/DLQ rate. Distributed equivalents: Kafka consumer lag (log end offset minus committed offset), Redis `XPENDING` idle times. Policy options once detected: alert and autoscale the group (the whole reason consumer groups exist), switch that subscriber to a lossy overflow policy, quarantine it (unsubscribe so it stops holding round-robin slots — one slow member with prefetch>1 can starve a group), or apply per-subscriber rate limits. The staff-level observation: `block` backpressure *propagates* slowness upstream to publishers, which is sometimes exactly right (batch ETL) and sometimes an outage multiplier (request-path publishing) — the policy must be per-subscription, never global, which is why it lives in `SubscribeOptions`.

## What gets you rejected

- **Synchronous emit where one throwing subscriber kills the rest.** The naive `for (const h of handlers) h(msg)` inside `publish` means subscriber #2 throwing prevents #3-#N from ever seeing the message, and the exception surfaces in the *publisher's* stack. Isolate every delivery with try/catch and decouple with `queueMicrotask` (or `setTimeout 0`). This is the first thing graders' tests check and the most common instant-reject.
- **Memory leaks from never-removed subscribers.** `subscribe` that returns nothing forces consumers to hold broker internals to clean up, so they don't, and every closure (plus everything it captures) lives forever. Always return an unsubscribe handle/disposer, implement `once` as self-removing, and delete empty handler sets and empty groups. Bonus points for mentioning Node's `MaxListenersExceededWarning` exists precisely to catch this class of leak.
- **Redelivery without a visibility timeout.** "Not acked yet? Redeliver!" checked in a tight loop or on every publish causes a duplicate storm: the consumer is redelivered the same message dozens of times *while still processing attempt one*. The in-flight state plus a timer is the whole mechanism; also remember to `clearTimeout` on ack or you leak a timer per message.
- **Unbounded queues.** A subscriber that stops acking (or is just slow) grows its queue until the process OOMs — in an in-memory broker, one bad consumer takes down every producer and every other consumer sharing the heap. Bound every queue and make the overflow decision explicit; "I didn't think about the full case" is the difference between mid and senior here.
- **No stale-ack / stale-timer guards.** Ack after timeout, timeout after ack, handler rejection after ack — any two of these racing without identity checks corrupts in-flight bookkeeping and the bug only appears under redelivery load, i.e. in the grader's fake-timer tests.
- **Untestable time.** Hardcoded `Date.now()`/`setTimeout` means the redelivery tests need real 30-second sleeps. Injecting a `Clock` takes ten lines and signals you have written tested production code before; interviewers weight it far above its size.
