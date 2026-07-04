# Lesson 2.4 — Behavioral Patterns — Encapsulating Algorithms, Communication & State

> Module: LLD & Design Patterns | Level: Senior | FDE Prep Phase 2

Behavioral patterns govern *how objects talk and how algorithms vary*: who decides, who notifies, who remembers. This is the most Node-native module of the three GoF families — `EventEmitter` is Observer, Express middleware is Chain of Responsibility, Passport strategies are literally named Strategy, and BullMQ jobs are serialized Commands. The senior bar: implement each from scratch in typed TypeScript, point at where the ecosystem already ships it, and — critically for JavaScript — know when a first-class function makes the whole class diagram evaporate.

---

### Q1. Implement Strategy for a retry policy: the problem, a context class, and swappable policies. Why not just an `if/else`?

**Answer:**

The problem: an HTTP client needs to retry failed calls, but the *policy* varies — fixed delay for internal services, exponential backoff with jitter for third parties, no retries in tests. Hardcoding an `if (mode === 'exponential')` ladder inside the client couples it to every policy, means every new policy edits (and risks) the client, and makes policies untestable in isolation.

Strategy: **extract the varying algorithm behind an interface; the context holds a strategy reference and delegates the decision.**

```typescript
interface RetryPolicy {
  // Returns delay in ms before the given attempt (1-based), or null to give up
  nextDelayMs(attempt: number, error: Error): number | null;
}

class NoRetryPolicy implements RetryPolicy {
  nextDelayMs(): number | null {
    return null;
  }
}

class FixedDelayPolicy implements RetryPolicy {
  constructor(private readonly delayMs: number, private readonly maxAttempts: number) {}
  nextDelayMs(attempt: number): number | null {
    return attempt < this.maxAttempts ? this.delayMs : null;
  }
}

class ExponentialBackoffPolicy implements RetryPolicy {
  constructor(
    private readonly baseMs: number,
    private readonly maxAttempts: number,
    private readonly retryableCheck: (e: Error) => boolean
  ) {}

  nextDelayMs(attempt: number, error: Error): number | null {
    if (attempt >= this.maxAttempts) return null;
    if (!this.retryableCheck(error)) return null; // don't retry 400s
    const exp = this.baseMs * 2 ** (attempt - 1);
    return exp / 2 + Math.random() * (exp / 2); // full jitter half-band
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// The CONTEXT: owns the invariant workflow, delegates the varying decision
class HttpClient {
  constructor(private readonly policy: RetryPolicy) {}

  async get(url: string): Promise<string> {
    let attempt = 0;
    for (;;) {
      attempt++;
      try {
        return await this.doFetch(url);
      } catch (err) {
        const delay = this.policy.nextDelayMs(attempt, err as Error);
        if (delay === null) throw err;
        await sleep(delay);
      }
    }
  }

  private async doFetch(url: string): Promise<string> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  }
}

const isTransient = (e: Error) => /HTTP 5\d\d|ECONNRESET|ETIMEDOUT/.test(e.message);
const client = new HttpClient(new ExponentialBackoffPolicy(200, 5, isTransient));
void client;
```

What the pattern buys over `if/else`, concretely:

- **Open/closed at the right seam:** a new policy (circuit-breaker-aware, rate-limit-header-respecting) is a new class; `HttpClient` never changes and never re-tests.
- **Policies are unit-testable without HTTP:** feed `nextDelayMs` attempts and errors, assert numbers. The jitter/backoff math — the part that actually causes incidents when wrong — gets tested in microseconds.
- **Composition-root configuration:** prod and test wire different policies into the *same* client; no `NODE_ENV` checks bleeding into transport code.

The design detail interviewers probe: the strategy interface should expose the *decision*, not the *mechanism*. `nextDelayMs(attempt, error): number | null` keeps looping, sleeping, and error propagation in the context — one place. A fatter interface like `execute(fn)` per policy duplicates the loop in every strategy and lets them drift.

**Interview trap:** "Strategy means one interface method, so it's the same as a callback?" Almost — and that's Q2. But note this policy is *stateless*. The moment a strategy needs state across calls (a circuit breaker counting consecutive failures), the class earns its keep: state + behavior cohere, and you must then decide whether policy instances are shared (shared breaker state across clients — usually what you want) or per-client. That sharing decision doesn't even exist with inline lambdas, which is how accidental one-breaker-per-request bugs happen.

---

### Q2. When is a Strategy class just ceremony in TypeScript? Show the function form, and name three real Node libraries built on Strategy.

**Answer:**

In a language with first-class functions, **a single-method, stateless strategy is a function type.** The class adds nothing but noise:

```typescript
type PricingStrategy = (baseCents: number, qty: number) => number;

const standard: PricingStrategy = (base, qty) => base * qty;
const bulk: PricingStrategy = (base, qty) => (qty >= 100 ? Math.round(base * qty * 0.85) : base * qty);
const memberPricing = (discountPct: number): PricingStrategy =>
  (base, qty) => Math.round(base * qty * (1 - discountPct / 100)); // closure = constructor args

class Cart {
  constructor(private readonly pricing: PricingStrategy) {}
  total(baseCents: number, qty: number): number {
    return this.pricing(baseCents, qty);
  }
}

const registry: Record<string, PricingStrategy> = { standard, bulk, member: memberPricing(10) };
const cart = new Cart(registry["bulk"]);
void cart;
```

`memberPricing` shows that closures replace constructor parameters — a factory function returning a configured strategy *is* the class, minus 15 lines. `Array.prototype.sort(comparator)` is the oldest strategy-as-function in the language.

Upgrade back to a class/object when any of these appear: **state** across invocations (circuit breakers, adaptive policies), **multiple related methods** that must vary together (serialize + deserialize; hash + verify), or a **lifecycle** (a storage strategy holding a connection to close).

Three real Strategy implementations in the ecosystem:

1. **Passport.js — literally named strategies.** `passport.use(new LocalStrategy(verify))`, `new JwtStrategy(opts, verify)`, `new GoogleStrategy(...)`. The context (Passport's `authenticate()` middleware flow) is invariant: extract credentials → verify → attach `req.user` or fail. Each of the 500+ published strategies implements one interface (`authenticate(req)` calling `success`/`fail`/`error`). Swapping auth providers changes wiring, not route code — the whole point of the pattern, shipped at npm scale.
2. **Multer storage engines.** `multer({ storage: diskStorage({...}) })` vs `memoryStorage()` vs community S3/GridFS engines. The engine interface is two methods — `_handleFile(req, file, cb)` and `_removeFile(req, file, cb)` — a multi-method strategy that legitimately needs the object form (paired behaviors + configuration state).
3. **Password hashing behind a hasher interface.** bcrypt vs argon2 have different APIs, cost parameters, and output formats. Teams wrap them:

```typescript
interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(plain: string, stored: string): Promise<boolean>;
}

class Argon2Hasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return `argon2:${Buffer.from(plain).toString("base64")}`; // stand-in for argon2.hash
  }
  async verify(plain: string, stored: string): Promise<boolean> {
    return stored === (await this.hash(plain));
  }
}
```

This one is strategy *with a migration story*: stored hashes are self-describing (`$argon2id$...` vs `$2b$...`), so a composite hasher can verify with the old strategy and re-hash with the new on successful login — an upgrade path that only exists because the algorithm was behind an interface.

**When NOT to use Strategy:** two variants that will never grow, chosen by one stable boolean — an `if` is honest and greppable. And don't build a strategy registry when the "strategies" share 90% of their code; that's Template Method territory (Q13) or just a parameter.

**Interview trap:** "Is dependency injection the same as Strategy?" DI is a *wiring mechanism*; Strategy is a *design intent* (interchangeable algorithms). DI is how strategies (and everything else) arrive. Saying "we use DI so we have Strategy everywhere" conflates plumbing with design — an interviewer will notice.

---

### Q3. Build a fully typed EventEmitter from scratch: generic event map, `on`/`off`/`once`/`emit`, safe under mutation-during-emit.

**Answer:**

Observer's contract: subjects maintain a list of observers and notify them of events; observers subscribe/unsubscribe without the subject knowing their concrete types. The typed version — where each event name maps to its tuple of argument types — is a genuinely useful artifact, not just an exercise:

```typescript
type EventMap = Record<string, unknown[]>;

type Listener<Args extends unknown[]> = (...args: Args) => void;

class Emitter<Events extends EventMap> {
  private listeners = new Map<keyof Events, Set<Listener<never>>>();

  on<K extends keyof Events>(event: K, fn: Listener<Events[K]>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(fn as Listener<never>);
    return () => this.off(event, fn); // return unsubscribe — the modern ergonomic
  }

  off<K extends keyof Events>(event: K, fn: Listener<Events[K]>): void {
    this.listeners.get(event)?.delete(fn as Listener<never>);
  }

  once<K extends keyof Events>(event: K, fn: Listener<Events[K]>): () => void {
    const wrapper: Listener<Events[K]> = (...args) => {
      this.off(event, wrapper);
      fn(...args);
    };
    return this.on(event, wrapper);
  }

  emit<K extends keyof Events>(event: K, ...args: Events[K]): boolean {
    const set = this.listeners.get(event);
    if (!set || set.size === 0) return false;
    // Snapshot BEFORE iterating: listeners added/removed during emit
    // must not affect THIS emit — matches Node's semantics.
    for (const fn of [...set]) {
      (fn as Listener<Events[K]>)(...args);
    }
    return true;
  }

  listenerCount<K extends keyof Events>(event: K): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}

// Usage — fully inferred, typo-proof, arity-checked:
interface OrderEvents extends EventMap {
  created: [orderId: string, amountCents: number];
  shipped: [orderId: string, trackingId: string];
}

const orders = new Emitter<OrderEvents>();
const unsub = orders.on("created", (id, amount) => {
  console.log(`order ${id}: ${amount} cents`); // id: string, amount: number — inferred
});
orders.emit("created", "ord_1", 4999);
// orders.emit("created", "ord_1");            // compile error: missing amount
// orders.on("craeted", () => {});             // compile error: no such event
unsub();
```

Design decisions worth narrating in the interview:

- **Snapshot iteration** (`[...set]`): without it, a listener that unsubscribes itself (or subscribes a new listener) during `emit` mutates the collection mid-iteration — either skipping listeners or looping infinitely. Node's `EventEmitter` copies the handler array for the same reason: removal during emit affects the *next* emit, not the current one.
- **`once` via self-removing wrapper, removal *before* invoking**: if the listener itself throws, it must still have been removed — otherwise "once" becomes "once per throw."
- **`on` returns an unsubscribe function**: prevents the classic leak where the caller can't `off` because they registered an inline arrow they kept no reference to. (Node's own answer to this ergonomic gap is `AbortSignal` support in `once`/`on` since v15.)
- The `Listener<never>` internal cast is the honest cost of heterogeneous storage — the *public* API stays fully sound; the unsafety is confined to two lines.

**Interview trap:** "Why `Set` instead of an array?" O(1) `off`, and duplicate registration is silently deduped — which *differs* from Node, where registering the same function twice calls it twice. If asked to match Node exactly, use an array and say why: Node's semantics predate `Set` and duplicates are load-bearing for some libraries. Knowing your implementation diverges — and where — is the senior signal.

---

### Q4. Node's `EventEmitter` — the four semantics interviewers actually probe: synchronous emit, the `error` event, the 11-listener warning, and mutation during emit.

**Answer:**

**1. `emit` is synchronous.** All listeners run *in registration order, on the current stack, before `emit` returns*:

```typescript
import { EventEmitter } from "node:events";

const em = new EventEmitter();
em.on("tick", () => console.log("listener"));
console.log("before");
em.emit("tick");
console.log("after");
// Output: before, listener, after — no event-loop deferral whatsoever
```

Production consequences: a slow listener blocks the emitter (and the event loop) — `EventEmitter` is an *observer dispatch mechanism*, not a task queue. A listener that throws synchronously propagates up through `emit()` into the emitter's own stack — your `server.emit` site can throw because of *someone else's* subscriber. If you need decoupled timing, the listener defers itself (`setImmediate`/`queueMicrotask`) or you use a real queue. The synchronous choice is deliberate: it lets listeners run before the emitter proceeds (e.g., mutating a context object other listeners then see) and avoids re-ordering surprises — but you must know it.

**2. `error` is magic.** `emit('error', err)` with *no* `error` listener **throws** the error; unhandled, it crashes the process. This is why an unconsumed stream or socket can bring down an app that "never touches" it:

```typescript
import { EventEmitter } from "node:events";

const risky = new EventEmitter();
// risky.emit("error", new Error("boom")); // ← would THROW here, likely fatal
risky.on("error", (err: Error) => console.error("handled:", err.message)); // the fix
risky.emit("error", new Error("boom"));
```

Every long-lived emitter (sockets, streams, DB connection objects, child processes) needs an `error` listener attached at creation — attaching "when I get around to it" loses the race against the first error. `events.errorMonitor` lets telemetry observe errors without consuming the crash semantics.

**3. The MaxListenersExceededWarning at 11.** Adding an 11th listener for one event name prints a possible-memory-leak warning. It's a *heuristic*, not a limit — all listeners still fire. It exists because the classic Node leak is subscribing inside a per-request code path (`req` handler does `db.on('reconnect', ...)`) and never unsubscribing: listener count grows monotonically, each closure retains its captured scope, heap climbs. Correct responses: (a) fix the leak — unsubscribe, or subscribe once at startup; (b) if 20 listeners are *legitimate* (a plugin bus), raise it deliberately with `emitter.setMaxListeners(30)` and a comment. Blanket `setMaxListeners(0)` (infinite) is disabling the smoke alarm because it beeped.

**4. Mutation during emit.** Node snapshots the listener array at emit start: listeners *added* during an emit don't run until the next emit; `removeListener` during emit doesn't stop an already-started dispatch from calling the removed listener in the current cycle. Also worth having ready: `once()` internally wraps the listener, so `removeListener(fn)` still works because Node tracks the original via a `listener` property on the wrapper; `prependListener` exists because order is registration order and sometimes you must run first; and `removeAllListeners()` on a shared emitter is a footgun — you'll remove *other modules'* listeners, including internal ones on core objects.

**Interview trap:** "Does `emit` in an async function make listeners async?" No — listeners still execute synchronously inside `emit`. An `async` listener returns a promise `emit` ignores entirely: rejections become unhandled rejections, and completion order is unobservable to the emitter. If listener completion matters, `EventEmitter` is the wrong tool (see backpressure, Q5) — or capture the promises explicitly and await them yourself.

---

### Q5. Observer vs pub/sub — where exactly is the line? And what's the backpressure problem with observers?

**Answer:**

**The line is the broker.** In Observer, subscribers register *directly on the subject* — they hold a reference to it, subscription is coupling to a concrete emitter instance, and delivery is (in Node) synchronous and in-process. In pub/sub, a **broker/channel sits in the middle**: publishers emit to a *topic name*, subscribers subscribe to the topic, and neither side knows the other exists.

```typescript
// Minimal in-process pub/sub broker — note NEITHER party references the other
type Handler<T> = (msg: T) => void;

class Broker {
  private topics = new Map<string, Set<Handler<unknown>>>();

  subscribe<T>(topic: string, fn: Handler<T>): () => void {
    let set = this.topics.get(topic);
    if (!set) {
      set = new Set();
      this.topics.set(topic, set);
    }
    set.add(fn as Handler<unknown>);
    return () => set.delete(fn as Handler<unknown>);
  }

  publish<T>(topic: string, msg: T): void {
    // Deliver asynchronously: publisher never blocks on subscribers
    for (const fn of [...(this.topics.get(topic) ?? [])]) {
      queueMicrotask(() => (fn as Handler<T>)(msg));
    }
  }
}
```

Consequences of inserting the broker: lifetime decoupling (subscriber can attach before the publisher exists), location decoupling (Redis pub/sub, RabbitMQ, Kafka make the broker a network service — publishers and subscribers in different processes), delivery-semantics ownership moves to the broker (at-most-once for Redis pub/sub, at-least-once with acks for RabbitMQ, replayable log for Kafka), and *observability of failure* changes — with Observer, a throwing listener blows up in the emitter's stack; with pub/sub, failures are the broker's problem (retries, DLQs). Node's `EventEmitter` is Observer. `postMessage`, Redis `PUBLISH/SUBSCRIBE`, and message queues are pub/sub. In-process event buses (Nest's `EventEmitter2` usage) sit in between: broker-shaped API, observer-grade delivery guarantees — i.e., none.

**The backpressure problem.** Observer is *push with no flow control*: the subject pushes at production rate regardless of whether observers can absorb it.

```typescript
import { EventEmitter } from "node:events";

// The pathology: producer emits 1M events; each listener does async work.
const feed = new EventEmitter();
let inFlight = 0;
feed.on("record", (row: string) => {
  inFlight++;
  void processSlowly(row).finally(() => inFlight--); // fire-and-forget!
});
async function processSlowly(row: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 50));
  void row;
}
// After the emit loop: inFlight ≈ 1,000,000 pending promises, heap ballooned,
// DB connection pool exhausted. Nothing told the producer to slow down.
```

The emitter has no channel for "stop"; listeners have no way to signal saturation. This is exactly why **Node streams stopped being plain emitters**: `data` events (flowing mode) are raw observer-push, and the fixes are protocol additions — `pause()`/`resume()`, `write()` returning `false` + `'drain'`, and ultimately **async iteration** (`for await (const chunk of readable)`), which inverts to *pull*: the consumer requests the next chunk when ready, and backpressure is implicit in the await. Same story in Rx (observables grew explicit backpressure strategies) and in queue consumers (prefetch/concurrency limits are backpressure knobs).

Rule of thumb: Observer for *notifications* (cheap, lossy-tolerant, fan-out: "cache invalidated", "config reloaded"). The moment observers do per-event async work whose completion matters, you want pull (async iterators) or a queue with acks and bounded concurrency — not `EventEmitter`.

**Interview trap:** "Redis pub/sub can replace our job queue, right?" No — Redis pub/sub is fire-and-forget: no persistence, no acks, subscribers offline during publish miss the message forever. Jobs need at-least-once delivery (BullMQ on Redis *lists/streams*, RabbitMQ). Distinguishing pub/sub-the-pattern from queue-with-guarantees is a production-maturity check.

---

### Q6. Command: implement execute/undo, a command queue with history, and macro commands. What makes something worth reifying into a command object?

**Answer:**

Command reifies *an action and its parameters* into an object. Once a request is a value, you can queue it, log it, retry it, undo it, serialize it, or compose it — none of which a direct method call permits.

```typescript
interface Command {
  readonly name: string;
  execute(): Promise<void>;
  undo(): Promise<void>;
}

// The receiver: commands act ON something; they shouldn't BE the business logic
class InventoryLedger {
  private stock = new Map<string, number>();

  adjust(sku: string, delta: number): void {
    const next = (this.stock.get(sku) ?? 0) + delta;
    if (next < 0) throw new Error(`Stock for ${sku} would go negative`);
    this.stock.set(sku, next);
  }
  level(sku: string): number {
    return this.stock.get(sku) ?? 0;
  }
}

class AddStockCommand implements Command {
  readonly name: string;
  constructor(private readonly ledger: InventoryLedger, private readonly sku: string, private readonly qty: number) {
    this.name = `add-stock:${sku}:${qty}`;
  }
  async execute(): Promise<void> {
    this.ledger.adjust(this.sku, this.qty);
  }
  async undo(): Promise<void> {
    this.ledger.adjust(this.sku, -this.qty); // inverse operation
  }
}

class ReserveStockCommand implements Command {
  readonly name: string;
  constructor(private readonly ledger: InventoryLedger, private readonly sku: string, private readonly qty: number) {
    this.name = `reserve:${sku}:${qty}`;
  }
  async execute(): Promise<void> {
    this.ledger.adjust(this.sku, -this.qty);
  }
  async undo(): Promise<void> {
    this.ledger.adjust(this.sku, this.qty);
  }
}

// Macro command: composite of commands, undone in REVERSE order
class MacroCommand implements Command {
  readonly name: string;
  private executed: Command[] = [];

  constructor(name: string, private readonly commands: ReadonlyArray<Command>) {
    this.name = name;
  }

  async execute(): Promise<void> {
    this.executed = [];
    for (const cmd of this.commands) {
      try {
        await cmd.execute();
        this.executed.push(cmd);
      } catch (err) {
        // Partial failure: roll back what succeeded, in reverse
        for (const done of [...this.executed].reverse()) await done.undo();
        this.executed = [];
        throw err;
      }
    }
  }

  async undo(): Promise<void> {
    for (const done of [...this.executed].reverse()) await done.undo();
    this.executed = [];
  }
}

// The invoker: queue + history. Knows Command, knows nothing about inventory.
class CommandBus {
  private readonly history: Command[] = [];

  async dispatch(cmd: Command): Promise<void> {
    await cmd.execute();
    this.history.push(cmd);
  }

  async undoLast(): Promise<void> {
    const cmd = this.history.pop();
    if (cmd) await cmd.undo();
  }
}

const ledger = new InventoryLedger();
const bus = new CommandBus();
await bus.dispatch(new AddStockCommand(ledger, "sku-1", 100));
await bus.dispatch(
  new MacroCommand("restock-and-reserve", [
    new AddStockCommand(ledger, "sku-1", 50),
    new ReserveStockCommand(ledger, "sku-1", 20),
  ])
);
await bus.undoLast(); // reverses BOTH macro steps, in reverse order
console.log(ledger.level("sku-1")); // 100
```

The three load-bearing details: **macro undo runs in reverse order** (later commands may depend on earlier ones); **macro execute compensates on partial failure** (this is a mini-saga — the same shape as distributed rollback); and **the invoker (bus) is receiver-agnostic** — that separation is what lets you bolt on history, queuing, or audit logging once, for every action.

When is reification *worth it*? When you need at least one of: **deferral** (queue it), **durability** (serialize it), **reversal** (undo), **audit** (log the action itself, not its effects), or **uniform treatment** of heterogeneous actions (one bus, many commands). If you need none of those, a method call is the correct "pattern."

**Interview trap:** "Undo = just run the opposite, easy." Only when operations commute and inverses exist. `AddStock` inverts cleanly; "send email" doesn't (compensation ≠ inversion — you send a correction, not an unsend). And undo-by-inverse breaks if *other* commands touched the same state in between (undoing an old price change after later changes = lost update). Real systems choose: inverse operations (cheap, fragile), snapshots/mementos (Q19), or append-only events where "undo" is a new compensating event. Saying which and why is the senior answer.

---

### Q7. Map Command onto three real systems: BullMQ jobs, database migrations, and Redux actions. What does each add to the base pattern?

**Answer:**

**1. BullMQ jobs = serialized commands with a durable invoker.** `queue.add('resize-image', { key: 's3://...', width: 800 })` creates a command as *data* — name + JSON payload — persisted in Redis. The worker process holds the receiver logic (`new Worker('resize-image', handler)`). What BullMQ adds to GoF Command: **durability** (command survives process crash), **distribution** (invoker and receiver in different processes), and **retry policy attached to the command itself** (attempts, backoff, DLQ on exhaustion). The serialization constraint is the pattern's price: payloads must be JSON — no closures, no live objects, receiver must re-hydrate context from IDs. That constraint is *why* the GoF class version keeps behavior with data, and why the queue version must split them.

```typescript
// The essential BullMQ shape: command = { name, data }, handlers keyed by name
type JobCommand = { name: "resize-image"; data: { key: string; width: number } }
                | { name: "send-receipt"; data: { orderId: string } };

const handlers: { [K in JobCommand["name"]]: (data: Extract<JobCommand, { name: K }>["data"]) => Promise<void> } = {
  "resize-image": async (data) => { void data.key; void data.width; },
  "send-receipt": async (data) => { void data.orderId; },
};

async function processJob(job: JobCommand): Promise<void> {
  await handlers[job.name](job.data as never);
}
void processJob;
```

**2. Database migrations = execute/undo made institutional.** Every Knex/TypeORM/Prisma-adjacent migration file exports `up()` (execute) and `down()` (undo); the migration runner is the invoker with **persistent history** (the `knex_migrations` table = the command history array from Q6, stored in the database it mutates). Macro behavior appears as batches: `migrate:rollback` undoes the last *batch* in reverse order. Migrations also showcase the undo caveats from Q6 in production form: `down()` for `DROP COLUMN` cannot restore data — it's compensation, not inversion — which is why mature teams treat `down` as a dev-environment tool and roll *forward* in production.

**3. Redux actions = commands without undo, plus time travel.** An action `{ type: 'todo/added', payload }` is a serializable command; `dispatch` is the invoker; reducers are receivers. Redux drops `undo()` and gets something better from purity: because reducers are pure `(state, action) => state`, the DevTools can *replay* the action log from initial state to reach any point — undo is "replay all but the last N" rather than inverse operations. That's the bridge from Command to **event sourcing**: an append-only log of reified actions as the source of truth, with state as a fold over it. (Pedantically, Redux actions are past-tense, so they're closer to *events* than commands — commands request, events record. Interviewers enjoy that distinction.)

The common thread — and the answer to "why do all three look alike": once an action is data, *infrastructure* can operate on it generically. Retry (BullMQ), ordered history (migrations), replay (Redux) are all invoker-side features that individual actions get for free.

**When NOT to use Command:** synchronous, in-process, non-audited, non-reversible calls. Wrapping `userService.getById(id)` in a `GetUserCommand` dispatched on a bus — common in cargo-cult CQRS — adds a hop, kills stack traces, and defeats IDE navigation for zero of the pattern's payoffs. Reify writes that need the machinery; call reads.

---

### Q8. Build a minimal Express-style middleware engine from scratch: `use(fn)`, `handle(req, res)`, `next()` dispatch, and 4-arity error middleware. This IS Chain of Responsibility — show why.

**Answer:**

Chain of Responsibility: a request travels an ordered chain of handlers; each handler either handles it (terminating), passes it on, or does both. Express is the ecosystem's flagship CoR, and implementing its dispatch loop exposes every semantic interviewers ask about:

```typescript
interface Req {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
}

interface Res {
  statusCode: number;
  ended: boolean;
  end(payload: string): void;
}

type Next = (err?: unknown) => void;
type Middleware = (req: Req, res: Res, next: Next) => void;
type ErrorMiddleware = (err: unknown, req: Req, res: Res, next: Next) => void;

class App {
  private readonly stack: Array<Middleware | ErrorMiddleware> = [];

  use(fn: Middleware | ErrorMiddleware): this {
    this.stack.push(fn);
    return this;
  }

  handle(req: Req, res: Res): void {
    let index = 0;

    const next: Next = (err?: unknown) => {
      if (res.ended) return; // response already sent — chain is done

      while (index < this.stack.length) {
        const layer = this.stack[index++];
        const isErrorHandler = layer.length === 4; // Express's actual arity check

        if (err !== undefined) {
          if (!isErrorHandler) continue; // error mode: SKIP normal middleware
          try {
            (layer as ErrorMiddleware)(err, req, res, next);
          } catch (thrown) {
            err = thrown; // error handler threw: keep searching with new error
            continue;
          }
          return;
        }

        if (isErrorHandler) continue; // normal mode: SKIP error middleware
        try {
          (layer as Middleware)(req, res, next);
        } catch (thrown) {
          err = thrown; // sync throw => switch chain into error mode
          continue;
        }
        return;
      }

      // Fell off the end of the chain
      if (err !== undefined) {
        res.statusCode = 500;
        res.end(`Internal error: ${String(err)}`);
      } else {
        res.statusCode = 404;
        res.end("Not found");
      }
    };

    next();
  }
}

// Wiring it exactly like Express:
const app = new App();

app.use((req, _res, next) => {
  req.headers["x-request-id"] = `req_${Date.now()}`;
  next();
});

app.use((req, res, next) => {
  if (!req.headers.authorization) {
    res.statusCode = 401;
    res.end("unauthorized"); // handled here — chain TERMINATES (no next())
    return;
  }
  next();
});

app.use((req, res, next) => {
  if (req.url === "/boom") return next(new Error("kaboom")); // route error to 4-arity handlers
  res.statusCode = 200;
  res.end(`hello ${req.headers["x-request-id"]}`);
});

app.use(((err, _req, res, _next) => {
  res.statusCode = 500;
  res.end(`caught: ${String((err as Error).message)}`);
}) as ErrorMiddleware);
```

The CoR mapping: each middleware is a Handler; `next()` is "pass to successor"; ending the response without calling `next()` is "handle and terminate"; the 404 fallthrough is the chain's "nobody handled it" default. The parts that make this *Express specifically*:

- **4-arity detection via `fn.length`** — Express literally inspects declared parameter count to classify error handlers. Consequence: `(err, req, res) => {}` (3 params) silently becomes a *normal* middleware that never runs on errors, and a rest-args handler `(...args) => {}` has `length === 0`. Real bugs ship this way.
- **Two chains in one:** `next(err)` flips a mode bit; the dispatcher then *skips* normal middleware and hunts for the next 4-arity layer. Error handlers registered *before* the failure point never see it — order is semantics.
- **`next()` must be called exactly once per layer.** Zero calls without ending the response = request hangs until socket timeout (the classic "my API sometimes never responds" bug). Two calls = the dreaded "Cannot set headers after they are sent" as two layers both write.

**Interview trap:** "So a `try/catch` around `await` inside middleware isn't needed since the engine catches throws?" The engine above (and Express 4) catches *synchronous* throws only. An `async` middleware that rejects gives you an unhandled rejection — Express 4 never sees it; you must `catch` and call `next(err)` (or use a wrapper like `express-async-errors`). **Express 5 changed this**: rejected promises returned from middleware are forwarded to error handlers automatically. Knowing which major you're on is a production-relevant detail, not trivia.

---

### Q9. Implement the classic (non-HTTP) Chain of Responsibility: a multi-stage approval chain. When is CoR the wrong shape?

**Answer:**

The classic form uses linked handler objects, each deciding: handle, or delegate to successor.

```typescript
interface ExpenseRequest {
  amountCents: number;
  category: "travel" | "equipment" | "software";
  requester: string;
}

interface Approval {
  approvedBy: string;
  level: string;
}

abstract class Approver {
  private nextApprover: Approver | null = null;

  setNext(next: Approver): Approver {
    this.nextApprover = next;
    return next; // return next to allow fluent chain building
  }

  approve(req: ExpenseRequest): Approval {
    if (this.canApprove(req)) {
      return { approvedBy: this.name(), level: this.constructor.name };
    }
    if (this.nextApprover) return this.nextApprover.approve(req);
    throw new Error(`No approver in chain can authorize ${req.amountCents} cents`);
  }

  protected abstract canApprove(req: ExpenseRequest): boolean;
  protected abstract name(): string;
}

class TeamLead extends Approver {
  protected canApprove(req: ExpenseRequest): boolean {
    return req.amountCents <= 50_000;
  }
  protected name(): string {
    return "team-lead";
  }
}

class EngineeringManager extends Approver {
  protected canApprove(req: ExpenseRequest): boolean {
    return req.amountCents <= 500_000;
  }
  protected name(): string {
    return "eng-manager";
  }
}

class VPEngineering extends Approver {
  protected canApprove(req: ExpenseRequest): boolean {
    return req.amountCents <= 5_000_000 || req.category === "software";
  }
  protected name(): string {
    return "vp-eng";
  }
}

const chain = new TeamLead();
chain.setNext(new EngineeringManager()).setNext(new VPEngineering());

const result = chain.approve({ amountCents: 320_000, category: "travel", requester: "asha" });
// { approvedBy: "eng-manager", level: "EngineeringManager" }
void result;
```

Key property: **the sender is decoupled from the receiver's identity** — the requester submits to "the chain," and *which* handler responds is decided at runtime by chain composition + handler logic. That's the pattern's actual point; the linked-list mechanics are incidental (an array + loop, as in Q8, is the same pattern and usually better in JS — no `setNext` bookkeeping, order visible in one place).

Where CoR fits: request processing pipelines (HTTP middleware, gRPC/Nest interceptor chains conceptually), escalation/fallback ladders (cache L1 → L2 → origin; payment provider failover), event bubbling in the DOM (`stopPropagation` = "handled, terminate chain"), and validation pipelines where any stage may reject.

**When CoR is the wrong shape:**

1. **Every handler must run** — that's not CoR, that's a plain pipeline/loop over observers. CoR's essence is *conditional handling with possible termination*; if nothing ever short-circuits, the "chain" abstraction is dead weight.
2. **Exactly one known handler should respond, selectable by key** — use a `Map<key, handler>` (dispatch table). Walking a chain doing O(n) `canHandle` checks to find what a lookup finds in O(1) is both slower and less explicit. Chains earn their place when handling depends on *runtime predicates over the request*, not a discriminant field.
3. **You need a guaranteed outcome.** CoR's built-in failure mode is "fell off the end" — fine for HTTP (404), dangerous for money. If unhandled is unacceptable, terminate the chain with a catch-all handler that fails loudly, and make the compiler help (the `throw` above is the runtime version; a required terminal handler is better).
4. **Handlers are accumulating cross-talk.** When handler 3 depends on side effects handler 1 stashed on the request object, you have hidden coupling wearing a decoupled costume — Express's `req.user`, `req.body` mutations are the pragmatic sin everyone tolerates, but in domain logic prefer explicit context passed through the chain, typed.

**Interview trap:** "Middleware order is just style since each middleware is independent." Q8 already disproved it mechanically (error handlers see only downstream failures), but the classic chain has the same property: putting `VPEngineering` first would approve *everything* under 5M at VP level, silently changing business behavior with zero code changes to any handler. Chain composition IS logic; it belongs in one reviewed place, not scattered `setNext` calls.

---

### Q10. State pattern: model an order lifecycle (Pending → Paid → Shipped → Delivered, Cancelled) with state classes and legal-transition enforcement. Contrast with a switch-based machine.

**Answer:**

The problem: an `Order` whose behavior depends on where it is in its lifecycle. The naive version scatters `if (this.status === 'paid')` across every method, and nothing stops `ship()` on a cancelled order except vigilance. State pattern: **each state is a class implementing the same interface; the context delegates to its current state object; transitions are the states returning/setting the next state.** Illegal operations fail *by construction*, in one obvious place per state.

```typescript
interface OrderState {
  readonly name: "pending" | "paid" | "shipped" | "delivered" | "cancelled";
  pay(order: Order): void;
  ship(order: Order): void;
  deliver(order: Order): void;
  cancel(order: Order): void;
}

class IllegalTransition extends Error {
  constructor(from: string, action: string) {
    super(`Cannot ${action} an order in state '${from}'`);
  }
}

// Base state: everything illegal by default; states override what's legal
abstract class BaseState implements OrderState {
  abstract readonly name: OrderState["name"];
  pay(_o: Order): void {
    throw new IllegalTransition(this.name, "pay");
  }
  ship(_o: Order): void {
    throw new IllegalTransition(this.name, "ship");
  }
  deliver(_o: Order): void {
    throw new IllegalTransition(this.name, "deliver");
  }
  cancel(_o: Order): void {
    throw new IllegalTransition(this.name, "cancel");
  }
}

class PendingState extends BaseState {
  readonly name = "pending" as const;
  override pay(order: Order): void {
    order.capturePayment();
    order.transitionTo(new PaidState());
  }
  override cancel(order: Order): void {
    order.transitionTo(new CancelledState());
  }
}

class PaidState extends BaseState {
  readonly name = "paid" as const;
  override ship(order: Order): void {
    order.bookCourier();
    order.transitionTo(new ShippedState());
  }
  override cancel(order: Order): void {
    order.refundPayment(); // state-specific side effect: cancelling PAID means refund
    order.transitionTo(new CancelledState());
  }
}

class ShippedState extends BaseState {
  readonly name = "shipped" as const;
  override deliver(order: Order): void {
    order.transitionTo(new DeliveredState());
  }
  // note: NO cancel — in-transit orders can't be cancelled, only returned later
}

class DeliveredState extends BaseState {
  readonly name = "delivered" as const; // terminal
}

class CancelledState extends BaseState {
  readonly name = "cancelled" as const; // terminal
}

class Order {
  private state: OrderState = new PendingState();

  constructor(public readonly id: string) {}

  get status(): string {
    return this.state.name;
  }

  transitionTo(next: OrderState): void {
    console.log(`order ${this.id}: ${this.state.name} -> ${next.name}`);
    this.state = next;
  }

  pay(): void {
    this.state.pay(this);
  }
  ship(): void {
    this.state.ship(this);
  }
  deliver(): void {
    this.state.deliver(this);
  }
  cancel(): void {
    this.state.cancel(this);
  }

  capturePayment(): void {}
  refundPayment(): void {}
  bookCourier(): void {}
}

const order = new Order("ord_1");
order.pay(); // pending -> paid
order.ship(); // paid -> shipped
// order.cancel(); // throws IllegalTransition: cannot cancel 'shipped'
order.deliver(); // shipped -> delivered
```

**The switch-based alternative** — a transition table:

```typescript
type Status = "pending" | "paid" | "shipped" | "delivered" | "cancelled";
type Action = "pay" | "ship" | "deliver" | "cancel";

const transitions: Record<Status, Partial<Record<Action, Status>>> = {
  pending: { pay: "paid", cancel: "cancelled" },
  paid: { ship: "shipped", cancel: "cancelled" },
  shipped: { deliver: "delivered" },
  delivered: {},
  cancelled: {},
};

function applyAction(current: Status, action: Action): Status {
  const next = transitions[current][action];
  if (!next) throw new Error(`Cannot ${action} in state '${current}'`);
  return next;
}
```

Honest comparison: the **table** wins when transitions are the whole story — it's declarative, diffable in review, renderable as a diagram, and serializable (store `Status` in a DB column; the class version needs status→class rehydration anyway). The **state classes** win when states carry *state-specific behavior and side effects* — `PaidState.cancel` refunds while `PendingState.cancel` doesn't; cramming those side effects into the table turns it back into a switch statement with cases full of logic. Real systems often combine: table for legality, per-transition handlers for effects.

**Interview trap:** "Where do you enforce this in a real app — the class is enough, right?" No. With multiple Node processes and a database, two concurrent `ship()` calls both load `paid`, both transition, both book couriers. In-memory state machines enforce *logic*; **persistence must enforce transitions atomically**: `UPDATE orders SET status='shipped' WHERE id=$1 AND status='paid'` and check `rowCount`, or use optimistic versioning. The state pattern without a guarded write is a diagram, not an invariant.

---

### Q11. Why do explicit state machines beat boolean flags? And where does XState fit?

**Answer:**

The boolean-flag version of Q10's order is how most codebases actually rot:

```typescript
class FlagOrder {
  isPaid = false;
  isShipped = false;
  isDelivered = false;
  isCancelled = false;
}
```

Four booleans encode **2⁴ = 16 representable states**, of which exactly **5 are valid**. The other 11 — `isDelivered && !isShipped`, `isCancelled && isShipped`, `isPaid && isCancelled && isDelivered` — are garbage states the type system happily permits. Every consumer must now defensively re-derive validity (`if (order.isPaid && !order.isCancelled && ...)`), each doing it slightly differently, and the bug report is always the same shape: "order is somehow both cancelled and shipped." The flags multiply too: add `isRefunded`, `isReturned` and you're at 64 states, 7 valid.

The principle: **make illegal states unrepresentable.** One enum/union field (`status: 'pending' | 'paid' | ...`) collapses the state space to exactly the valid set, and TypeScript's discriminated unions extend it to state-specific *data*:

```typescript
type OrderStatus =
  | { kind: "pending" }
  | { kind: "paid"; chargeId: string }               // chargeId EXISTS only when paid
  | { kind: "shipped"; chargeId: string; trackingId: string }
  | { kind: "delivered"; chargeId: string; trackingId: string; deliveredAt: Date }
  | { kind: "cancelled"; refundId: string | null };

function trackingUrl(s: OrderStatus): string | null {
  switch (s.kind) {
    case "shipped":
    case "delivered":
      return `https://track.example.com/${s.trackingId}`; // trackingId guaranteed by narrowing
    default:
      return null;
  }
}
void trackingUrl;
```

With flags, `trackingId` is a nullable field on every order and its non-nullness is tribal knowledge. With the union, the compiler enforces "tracking IDs exist only after shipping" — an invariant checked at build time forever.

**Where XState fits.** XState is the industrial version of Q10's transition table: statecharts (Harel), meaning hierarchy (nested states — `shipped.inTransit` vs `shipped.outForDelivery`), parallel regions, guarded transitions, delayed transitions, and **actors** for invoked side effects. Its concrete production wins over hand-rolled machines: the definition is *data* so it's visualizable (stately.ai renders your actual machine — the diagram can't drift from the code), model-based testing can walk every path, and effects are tied to transitions declaratively so "we booked a courier but never marked shipped" becomes structurally harder. Where it's overkill: a 4-state order like Q10's — a typed transition table is 15 lines and zero dependencies. XState earns its complexity budget on genuinely gnarly flows: multi-step checkout wizards, call/связь session lifecycles, anything with timeouts + retries + parallel concerns interacting.

Rule of thumb to state in the interview: **two or more booleans that are secretly correlated = a state machine in denial.** The refactor is mechanical (enumerate valid combinations, name them, make a union) and it deletes an entire class of production bug.

**Interview trap:** "Enums in the DB are enough, so runtime machines are redundant." The DB column constrains *representation*, not *transitions* — nothing stops an `UPDATE ... SET status='delivered'` from `pending`. You need all three layers: type-level (union), logic-level (transition table/classes), and storage-level (guarded conditional UPDATE, per Q10's trap). Each layer catches what the others can't.

---

### Q12. Template Method: implement an ETL pipeline skeleton with mandatory steps and optional hooks. What's the pattern's contract?

**Answer:**

Template Method: **an abstract class defines an algorithm's skeleton in a final-ish method; subclasses override specific steps without being able to reorder or skip the skeleton.** The parent owns *sequence and policy*; children own *step content*. It's the inheritance-based way to reuse a workflow.

```typescript
interface EtlStats {
  extracted: number;
  loaded: number;
  skipped: number;
  durationMs: number;
}

abstract class EtlJob<Raw, Clean> {
  // THE template method: defines the invariant skeleton. Subclasses never override this.
  async run(): Promise<EtlStats> {
    const start = performance.now();
    await this.beforeRun(); // hook (optional)

    const raw = await this.extract(); // abstract (mandatory)
    const cleaned: Clean[] = [];
    let skipped = 0;

    for (const row of raw) {
      if (!this.validate(row)) {           // hook with default
        skipped++;
        await this.onInvalidRow(row);      // hook (optional)
        continue;
      }
      cleaned.push(this.transform(row));   // abstract (mandatory)
    }

    const loaded = await this.load(cleaned); // abstract (mandatory)
    await this.afterRun();                   // hook (optional)

    return { extracted: raw.length, loaded, skipped, durationMs: performance.now() - start };
  }

  // Mandatory steps: abstract — compiler forces subclasses to provide them
  protected abstract extract(): Promise<Raw[]>;
  protected abstract transform(row: Raw): Clean;
  protected abstract load(rows: Clean[]): Promise<number>;

  // Hooks: default implementations — subclasses opt in
  protected validate(_row: Raw): boolean {
    return true;
  }
  protected async onInvalidRow(_row: Raw): Promise<void> {}
  protected async beforeRun(): Promise<void> {}
  protected async afterRun(): Promise<void> {}
}

// A concrete job overrides only what varies
interface CsvUserRow {
  email: string;
  signup_ts: string;
}
interface UserRecord {
  email: string;
  signedUpAt: Date;
}

class UserImportJob extends EtlJob<CsvUserRow, UserRecord> {
  private readonly db: UserRecord[] = [];

  protected async extract(): Promise<CsvUserRow[]> {
    return [
      { email: "a@example.com", signup_ts: "2026-01-15T10:00:00Z" },
      { email: "not-an-email", signup_ts: "2026-01-16T10:00:00Z" },
    ];
  }

  protected override validate(row: CsvUserRow): boolean {
    return row.email.includes("@") && !Number.isNaN(Date.parse(row.signup_ts));
  }

  protected transform(row: CsvUserRow): UserRecord {
    return { email: row.email.toLowerCase(), signedUpAt: new Date(row.signup_ts) };
  }

  protected async load(rows: UserRecord[]): Promise<number> {
    this.db.push(...rows);
    return rows.length;
  }

  protected override async onInvalidRow(row: CsvUserRow): Promise<void> {
    console.warn(`skipping invalid row: ${row.email}`);
  }
}

const stats = await new UserImportJob().run();
// { extracted: 2, loaded: 1, skipped: 1, durationMs: ... }
void stats;
```

The contract, precisely:

- **The skeleton is closed.** Subclasses cannot reorder extract→transform→load or drop the timing/skip accounting. That's the value: fifty ETL jobs, one place where "what is an ETL run" is defined, one place to add dead-letter handling for all of them.
- **Two kinds of extension points, deliberately distinct:** *abstract methods* (must implement — the compiler enforces completeness) and *hooks* (may implement — safe defaults). Mixing these up is a design bug: making `validate` abstract forces boilerplate on every job; making `load` a no-op hook lets someone ship a job that silently loads nothing.
- **Hollywood Principle:** "don't call us, we'll call you." Subclass code never drives the flow; the parent invokes it. This inverts the usual library relationship — it's what makes Template Method a *framework* pattern.

**Interview trap:** "Just make `run()` overridable too, for flexibility." That surrenders the only guarantee the pattern makes. If a subclass can rewrite the skeleton, invariants (timing, accounting, ordering) become suggestions, and you're back to copy-paste-with-extra-steps. In TS you can't mark methods `final`, so the enforcement is convention + review — worth saying out loud, because interviewers know Java's `final` and will ask how TS copes (answer: convention, or composition instead — Q13).

---

### Q13. Where do real frameworks use Template Method, and when should you use Strategy instead? Give the decision rule.

**Answer:**

Template Method is *the* framework pattern — any time a framework says "we run the lifecycle, you fill in the steps":

- **Jest lifecycle hooks.** `beforeAll → beforeEach → test → afterEach → afterAll` is a fixed skeleton owned by the runner; you supply step bodies. You cannot reorder the skeleton — exactly the closed-skeleton contract. (Jest does it with registered callbacks rather than subclassing — Template Method's *shape* without inheritance, which foreshadows the decision rule below.)
- **React class lifecycle (historical but interview-current).** `componentDidMount`, `shouldComponentUpdate`, `componentDidUpdate`, `componentWillUnmount` are hooks into React's fixed render-commit skeleton; `shouldComponentUpdate`'s default (`true`) is a textbook hook-with-default. React Hooks (`useEffect`) replaced inheritance-based hooks with function-registration — the ecosystem-wide migration from Template Method to composition is itself an interview talking point.
- **NestJS lifecycle interfaces.** `OnModuleInit`, `OnApplicationBootstrap`, `OnModuleDestroy`, `OnApplicationShutdown`: Nest owns the boot/shutdown skeleton and calls your hooks in a documented order. Also `NestInterceptor`/`ExceptionFilter` base flows, and TypeORM/Mongoose middleware hooks (`pre('save')`) are the same "we own the sequence, you fill the slots" contract.
- **Node core:** streams are Template Method — `Readable` owns the buffering/backpressure/event skeleton; you implement `_read`; `Writable` owns queuing/draining; you implement `_write`/`_final`. The underscore convention literally marks "step methods the skeleton calls."

**Template Method vs Strategy — same problem (varying part inside an invariant part), opposite mechanisms:**

| | Template Method | Strategy |
|---|---|---|
| Variation via | Inheritance (override steps) | Composition (inject algorithm) |
| Varies | Multiple steps *within* one algorithm | The *whole* algorithm, as a unit |
| Binding time | Class-definition time | Runtime, swappable per instance |
| Variant count | One variant set per subclass | Mix and match freely |
| Access to invariants | Yes — protected state/methods | No — sees only its parameters |
| Failure mode | Fragile base class, deep hierarchies | Interface bloat, parameter plumbing |

The decision rule: **prefer Strategy (composition) when the varying pieces are independent of each other and of the skeleton's internals; accept Template Method when the steps need intimate access to shared workflow state, or when a framework relationship (many implementations, one owner of sequence) already exists.** The Q12 ETL job as strategies:

```typescript
interface EtlSteps<Raw, Clean> {
  extract(): Promise<Raw[]>;
  transform(row: Raw): Clean;
  load(rows: Clean[]): Promise<number>;
  validate?(row: Raw): boolean;
}

async function runEtl<Raw, Clean>(steps: EtlSteps<Raw, Clean>): Promise<number> {
  const raw = await steps.extract();
  const valid = raw.filter((r) => steps.validate?.(r) ?? true);
  return steps.load(valid.map((r) => steps.transform(r)));
}
```

This is often *better* in TypeScript: no inheritance, steps testable as plain functions, two jobs can share a `transform` without a common ancestor. Template Method's remaining edge: when steps must share mutable workflow state (`this.db` in Q12, accumulated diagnostics), the class keeps that cohesion; the strategy version would thread context through every signature.

Sequence smell in both directions: if every subclass overrides *every* step, the skeleton contributes nothing — you wanted Strategy. If every strategy implementation receives the same six context parameters, they wanted to be methods — you wanted Template Method (or a class-shaped strategy).

**Interview trap:** "Template Method is deprecated thinking because composition-over-inheritance." Too strong. The guidance says *prefer* composition; Node streams, Nest lifecycles, and every test runner you use are Template Method working at massive scale. The honest position: Template Method for framework/lifecycle relationships where one party owns sequence; Strategy for application-level algorithm swapping. Dogma either way loses points.

---

### Q14. Implement `Symbol.iterator` and `Symbol.asyncIterator` on a custom collection. What contract are you actually implementing?

**Answer:**

The Iterator pattern: sequential access to a collection's elements without exposing its representation. JavaScript baked the pattern into the language as *protocols* — objects with a `next(): { value, done }` method — and two well-known symbols that let *any* object plug into `for...of`, spread, destructuring, and `for await...of`.

```typescript
class RingBuffer<T> implements Iterable<T> {
  private readonly slots: (T | undefined)[];
  private head = 0; // next write position
  private count = 0;

  constructor(private readonly capacity: number) {
    this.slots = new Array<T | undefined>(capacity);
  }

  push(item: T): void {
    this.slots[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    this.count = Math.min(this.count + 1, this.capacity);
  }

  // The iterable contract: a METHOD that returns a FRESH iterator each call.
  // Written as a generator — the idiomatic iterator factory.
  *[Symbol.iterator](): Iterator<T> {
    const start = (this.head - this.count + this.capacity) % this.capacity;
    for (let i = 0; i < this.count; i++) {
      yield this.slots[(start + i) % this.capacity] as T;
    }
  }
}

const rb = new RingBuffer<number>(3);
[1, 2, 3, 4, 5].forEach((n) => rb.push(n));
console.log([...rb]);                    // [3, 4, 5] — spread works
for (const n of rb) console.log(n);      // for...of works
const [newest] = rb;                     // destructuring works
void newest;
```

The iteration order logic (oldest→newest despite a wrapping buffer) lives *inside* the collection; consumers get clean traversal with zero knowledge of `head`/wrap-around — that's the pattern's encapsulation payoff, and it's why every consumer construct (`for...of`, spread, `Array.from`, `new Set(...)`, `yield*`) works on your class for free the moment you implement one method.

The async version — for collections whose elements arrive over time:

```typescript
class AsyncEventLog implements AsyncIterable<string> {
  private buffer: string[] = [];
  private waiters: Array<(v: IteratorResult<string>) => void> = [];
  private closed = false;

  append(entry: string): void {
    const waiter = this.waiters.shift();
    if (waiter) waiter({ value: entry, done: false }); // hand directly to a waiting consumer
    else this.buffer.push(entry);
  }

  close(): void {
    this.closed = true;
    for (const w of this.waiters.splice(0)) w({ value: undefined, done: true });
  }

  [Symbol.asyncIterator](): AsyncIterator<string> {
    return {
      next: (): Promise<IteratorResult<string>> => {
        if (this.buffer.length > 0) return Promise.resolve({ value: this.buffer.shift() as string, done: false });
        if (this.closed) return Promise.resolve({ value: undefined, done: true });
        return new Promise((resolve) => this.waiters.push(resolve)); // PULL: consumer waits
      },
    };
  }
}

const log = new AsyncEventLog();
setTimeout(() => log.append("first"), 10);
setTimeout(() => log.append("second"), 20);
setTimeout(() => log.close(), 30);

for await (const entry of log) console.log(entry); // first, second — then loop exits
```

Contract details that separate senior answers:

- **`[Symbol.iterator]()` must return a fresh iterator per call**, or the object is single-use: the second `for...of` finds an exhausted iterator and sees nothing. (Generators get this right automatically; hand-rolled iterators that store cursor state on the collection itself get it wrong.) Note the asymmetry: *iterators* are one-shot by nature; *iterables* should be re-iterable.
- **`return()` is the cleanup channel.** Breaking out of `for...of`/`for await...of` early calls the iterator's `return()` method if present — that's how generators run their `finally` blocks and how resources (file handles, DB cursors) get released on early exit. Forgetting this in a hand-rolled iterator leaks resources exactly when consumers `break`.
- The async iterator shown is a tiny unbounded channel — the buffer grows without limit if producers outpace consumers. A production version caps the buffer and makes `append` return a promise (backpressure), which is precisely what Node streams do (Q16).

**Interview trap:** "Iterables and iterators are the same thing." No: an *iterable* has `[Symbol.iterator]()` returning an iterator; an *iterator* has `next()`. Generators happen to be both (their `[Symbol.iterator]` returns `this`) — which is exactly why a generator object works in `for...of` but silently misbehaves if you try to iterate it twice.

---

### Q15. Generators as iterator factories: what do they replace, and what do `yield*`, lazy evaluation, and early-exit cleanup give you?

**Answer:**

A generator function is a **declarative iterator factory**: the function body describes the sequence; the runtime manufactures the `next()`/state-machine plumbing you'd otherwise hand-write. Compare what the RingBuffer iterator would look like manually — explicit cursor object, resumption state, done-flag bookkeeping — versus the 5-line generator in Q14. Every `yield` is a suspension point; local variables *are* the iterator's state.

What that unlocks:

```typescript
// 1) Lazy, infinite, composable sequences — impossible with arrays
function* naturals(): Generator<number> {
  for (let n = 1; ; n++) yield n;
}

function* take<T>(source: Iterable<T>, count: number): Generator<T> {
  let taken = 0;
  for (const item of source) {
    if (taken++ >= count) return;
    yield item;
  }
}

function* map<T, U>(source: Iterable<T>, fn: (t: T) => U): Generator<U> {
  for (const item of source) yield fn(item);
}

const firstFiveSquares = [...take(map(naturals(), (n) => n * n), 5)];
// [1, 4, 9, 16, 25] — nothing computed until pulled, only 5 items ever materialized
void firstFiveSquares;

// 2) yield* — delegation, the composite/flattening operator for iterators
interface TreeNode<T> {
  value: T;
  children: TreeNode<T>[];
}

function* depthFirst<T>(node: TreeNode<T>): Generator<T> {
  yield node.value;
  for (const child of node.children) yield* depthFirst(child); // delegate to sub-iterator
}

// 3) Guaranteed cleanup on early exit — finally runs when the consumer breaks
function* readLines(lines: string[]): Generator<string> {
  console.log("resource acquired");
  try {
    for (const line of lines) yield line;
  } finally {
    console.log("resource released"); // runs on completion, break, throw, OR .return()
  }
}

for (const line of readLines(["a", "b", "c"])) {
  if (line === "b") break; // "resource released" still prints — break calls .return()
}
```

Why each matters in production Node:

- **Laziness is a memory strategy.** `db.getAllRows()` → array = whole result set in heap. A generator (or async generator) yields row-by-row: constant memory, and downstream `take`/`filter` stop the *source* early — the pipeline is pull-driven end to end. This is the conceptual core of streams.
- **`yield*` makes recursion iterable.** The `depthFirst` tree walk is Composite (Lesson 2.3, Q13) traversal exposed as a flat sequence — consumers `for...of` a tree without knowing it's a tree. Caveat worth volunteering: recursive `yield*` re-yields each value through every stack level (O(depth) per item); for very deep trees, an explicit stack loop is faster.
- **`try/finally` + `.return()` is deterministic disposal.** The `for...of` protocol calling `.return()` on early exit means generators are the pre-`using` resource-management story in JS — DB cursors, file descriptors, and locks release even when consumers bail. (And the ecosystem history: generators + a runner like `co` were how async/await worked before async/await existed — `yield promise` driven by a trampoline. Interviewers of a certain vintage still ask.)

**When NOT to use generators:** hot paths iterating small fixed arrays — generator frames and `IteratorResult` object allocations lose to a plain indexed loop, measurably; when consumers need random access or `length` (a generator only answers "next?"); and when the sequence is eagerly needed in full anyway (just build the array). Also, generator state machines make stack traces and debugging noticeably worse — a plain function returning an array is easier to step through, so don't pay the laziness tax where laziness buys nothing.

**Interview trap:** "Generators are async because they pause." Pausing is not asynchrony — plain generators are fully synchronous; `next()` runs on the current stack until the next `yield`. Only *async* generators (`async function*`) suspend across the event loop, and their `next()` returns a `Promise<IteratorResult>`. Conflating the two is a common mid-level tell.

---

### Q16. Write a complete `paginate` async generator over a cursor-based API, and explain how `for await...of` + streams fit the same protocol.

**Answer:**

Cursor pagination is *the* async-iterator use case: the total set is unbounded, pages arrive over the network, and consumers should be able to stop early without fetching the world.

```typescript
// The API shape — typical cursor-based REST endpoint
interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

interface Customer {
  id: string;
  email: string;
  mrrCents: number;
}

// Stand-in for a real HTTP call; shape matches Stripe/GitHub-style cursor APIs
async function fetchCustomerPage(cursor: string | null, limit: number): Promise<Page<Customer>> {
  const all: Customer[] = Array.from({ length: 250 }, (_, i) => ({
    id: `cus_${i}`,
    email: `user${i}@example.com`,
    mrrCents: (i % 50) * 100,
  }));
  const start = cursor === null ? 0 : Number(cursor);
  const items = all.slice(start, start + limit);
  const next = start + limit < all.length ? String(start + limit) : null;
  return { items, nextCursor: next };
}

// The async generator: pagination plumbing written ONCE, invisible to consumers
async function* paginate<T>(
  fetchPage: (cursor: string | null, limit: number) => Promise<Page<T>>,
  options: { pageSize?: number; maxItems?: number } = {}
): AsyncGenerator<T, void, undefined> {
  const pageSize = options.pageSize ?? 100;
  let cursor: string | null = null;
  let yielded = 0;

  do {
    const page: Page<T> = await fetchPage(cursor, pageSize);
    for (const item of page.items) {
      if (options.maxItems !== undefined && yielded >= options.maxItems) return;
      yielded++;
      yield item; // suspend HERE — next page only fetched if consumer keeps pulling
    }
    cursor = page.nextCursor;
  } while (cursor !== null);
}

// Consumer: flat iteration, zero pagination knowledge, early exit = no wasted fetches
let highValueCount = 0;
for await (const customer of paginate(fetchCustomerPage, { pageSize: 50 })) {
  if (customer.mrrCents >= 4000) highValueCount++;
  if (highValueCount >= 10) break; // remaining pages are NEVER requested
}
console.log(highValueCount);
```

The properties to narrate: **pull-based** — `await fetchPage` only runs when the consumer's `for await` asks for more, so a `break` after item 60 means pages 3–5 are never fetched (rate-limit budget saved); **flat abstraction** — the consumer sees a stream of customers, not pages, so changing page size or even switching to offset pagination touches one function; **composability** — the `take`/`map`/`filter` combinators from Q15 written as async generators stack straight onto it. This is exactly how real SDKs work: Stripe's Node SDK's `for await (const customer of stripe.customers.list())` auto-pagination and Octokit's `paginate.iterator` are this generator, shipped.

**Streams are the same protocol.** `stream.Readable` implements `Symbol.asyncIterator`, so:

```typescript
import { createReadStream } from "node:fs";

async function countBytes(path: string): Promise<number> {
  let total = 0;
  for await (const chunk of createReadStream(path)) {
    total += (chunk as Buffer).length;
  }
  return total;
}
void countBytes;
```

This replaces the error-prone event triad (`data`/`end`/`error`) with one construct: chunks arrive via pull (backpressure is implicit — the stream refills its buffer only as you consume, per Q5), stream errors *reject the loop's promise* so a single `try/catch` handles them, and early `break` destroys the stream via the iterator's `return()` (the Q14/Q15 cleanup channel doing real resource work). The full circle: `Readable.from(paginate(...))` turns your async generator into a stream you can `pipeline()` through transforms into a file — generator, iterator protocol, and streams are one composable system, not three features.

**Interview trap:** "Async iteration processes items in parallel." Strictly sequential — each iteration awaits before the next begins. For 10,000 customers each needing a 100ms API call, `for await` takes ~17 minutes. Concurrency requires deliberate batching (buffer N items, `Promise.all` the batch) or a worker-pool consumer pulling from the shared iterator — the iterator stays sequential; parallelism lives in the consumer. Knowing that `for await` is a *concurrency of one* is the difference between a pattern answer and a production answer.

---

### Q17. Mediator: implement a chat room where participants never reference each other. What coupling does it remove, and what does it cost?

**Answer:**

The problem: N colleagues that all interact pairwise = N² potential references; every object knows every other; adding one participant touches many. Mediator centralizes the interaction protocol: **colleagues talk only to the mediator; the mediator decides who hears what.** Coupling goes from many-to-many to many-to-one.

```typescript
interface ChatMediator {
  register(user: ChatUser): void;
  send(from: ChatUser, text: string): void;
  sendPrivate(from: ChatUser, toName: string, text: string): boolean;
}

class ChatUser {
  constructor(public readonly name: string, private readonly room: ChatMediator) {
    room.register(this); // knows the MEDIATOR only — never another ChatUser
  }

  say(text: string): void {
    this.room.send(this, text);
  }

  whisper(toName: string, text: string): boolean {
    return this.room.sendPrivate(this, toName, text);
  }

  receive(fromName: string, text: string): void {
    console.log(`[${this.name}] ${fromName}: ${text}`);
  }
}

class ChatRoom implements ChatMediator {
  private readonly users = new Map<string, ChatUser>();
  private readonly muted = new Set<string>();

  register(user: ChatUser): void {
    this.users.set(user.name, user);
  }

  mute(name: string): void {
    this.muted.add(name);
  }

  send(from: ChatUser, text: string): void {
    if (this.muted.has(from.name)) return; // interaction POLICY lives in the mediator
    for (const user of this.users.values()) {
      if (user !== from) user.receive(from.name, text);
    }
  }

  sendPrivate(from: ChatUser, toName: string, text: string): boolean {
    if (this.muted.has(from.name)) return false;
    const target = this.users.get(toName);
    if (!target) return false;
    target.receive(`${from.name} (private)`, text);
    return true;
  }
}

const room = new ChatRoom();
const alice = new ChatUser("alice", room);
const bob = new ChatUser("bob", room);
new ChatUser("carol", room);

alice.say("shipping the release");
bob.whisper("alice", "did the migration run?");
room.mute("carol");
```

The air-traffic-control analogy is the standard framing because it's literal: aircraft never negotiate with each other; the tower (mediator) owns the interaction protocol, and adding a plane doesn't change any other plane. Here, mute policy, routing, and membership all live in `ChatRoom` — adding read receipts or rate limiting touches one class, not N.

**What it costs:** the mediator is where complexity *goes*, not where it disappears. Every interaction rule you remove from colleagues lands in the mediator, and an undisciplined one becomes the god object — a 2,000-line `ChatRoom` doing routing, permissions, persistence, and formatting. The mitigations: keep the mediator's job strictly *coordination* (delegate the work itself — persistence to a repo, permission math to a policy object), and split mediators per interaction domain rather than growing "the one true coordinator."

Real mediators in the ecosystem:

- **NestJS CQRS `CommandBus`/`EventBus`/`QueryBus`.** Controllers dispatch `new CreateOrderCommand(...)` to the bus; the bus routes to whichever `@CommandHandler(CreateOrderCommand)` registered. Controller and handler never reference each other — the bus owns routing. Note the composition: the *messages* are Command pattern (Q6); the *bus* is Mediator; sagas listening on the EventBus add Observer. Frameworks are pattern chords, not single notes.
- **Message brokers as distributed mediators.** RabbitMQ exchanges are mediators with a declarative routing policy (direct/topic/fanout bindings = `ChatRoom.send`'s logic as configuration). Services know queue/topic names, never each other's addresses — the same N²→N collapse across process boundaries, plus the broker-grade extras (durability, acks) from Q5.
- Front-end store dispatchers (Redux's single store mediating component interactions) and orchestrator services in microservice sagas (the orchestrator mediates; choreography is the observer-style alternative).

**Interview trap:** "Mediator centralizes, so it hurts scalability/testability." Backwards for testability: colleagues become trivially testable (mock one mediator interface instead of N peers), and the mediator itself is testable with stub colleagues. The genuine risk is *conceptual* centralization (god object) and, for distributed mediators, a single point of failure — which is an infra problem (cluster the broker) not a pattern problem. Precision about which "centralization" is bad scores the point.

---

### Q18. Mediator vs Observer — they both decouple. Draw the line precisely, and say which one an in-process event bus actually is.

**Answer:**

Both patterns decouple senders from receivers, and both often *contain* an emitter, so the confusion is structural. The line is about **who owns the interaction logic and its direction**:

- **Observer:** the *subject* broadcasts facts about itself ("order created"); it neither knows nor cares who listens or what they do. Communication is one-way, fan-out, and *dumb* — no routing decisions, every subscriber gets every event. Intelligence lives at the edges (in observers).
- **Mediator:** components send *to the mediator expecting coordination*; the mediator applies **routing and policy** — who receives, in what order, whether at all (mute, permissions, one-handler-per-command). Communication is multi-directional through the hub, and intelligence lives in the *middle*.

Litmus tests you can apply to real code:

1. **Does the middleman make decisions?** `EventEmitter.emit` delivers to all listeners unconditionally → Observer. `ChatRoom.sendPrivate` looks up a target and checks mute state → Mediator. The moment your "event bus" grows `if` statements about who should receive what, it has become a mediator whether you renamed it or not.
2. **Cardinality expectations.** Observer: 0..N handlers, all equal, sender indifferent to count (zero listeners is fine). Mediator, command-flavored: often *exactly one* handler, and no handler is an **error** — Nest's `CommandBus` throws `CommandHandlerNotFoundException`, an assertion no observer system would ever make.
3. **Does the sender expect a result?** Observers never answer the subject. Mediated requests frequently return values (`QueryBus.execute` returns the query result; the chat `whisper` returns delivery success). Request/response through a hub is mediator territory.
4. **Where does a new interaction rule go?** "Digest emails should also go to the account owner" — if you implement it by adding a listener, you're in Observer land; if you implement it by editing routing logic in one central place, you're in Mediator land.

So which is an in-process event bus (Nest `EventEmitter2`, a shared `EventEmitter` instance)? **Mechanically Observer, architecturally a degenerate Mediator.** It's a shared subject that many modules emit into and subscribe from — the "hub" exists (one shared object, so emitters and listeners don't reference each other: mediator-ish topology) but it applies zero policy (pure fan-out on event name: observer semantics). This is also its danger: because it *feels* like infrastructure, teams route core domain workflows through it and inherit Observer's weakest guarantees — synchronous coupling to unknown listeners (Q4), no delivery assurance, no backpressure (Q5), and "who handles `order.created`?" answerable only by grep. The senior guidance: buses with policy expectations (exactly-one handling, ordering, retries) should be *explicit* mediators (CQRS buses, job queues); plain event emitters should carry only notifications where zero-or-many indifferent listeners is genuinely acceptable.

One more contrast worth having ready: **choreography vs orchestration in sagas** is the distributed restatement of this exact question. Choreography = services observing each other's events (Observer: resilient to hub failure, but the workflow exists only emergently, spread across services). Orchestration = a saga orchestrator directing each step (Mediator: workflow legible in one place, hub is a dependency). Same tradeoff, three orders of magnitude larger.

**Interview trap:** "Mediator = pub/sub with extra steps." Pub/sub (Q5) is *topic-based fan-out through a broker* — the broker routes on topic names but is policy-dumb about content and coordination. A mediator encodes *domain interaction rules*. RabbitMQ delivering to all bound queues is pub/sub; your `OrderSagaOrchestrator` deciding that payment failure triggers inventory release is Mediator. The broker moves messages; the mediator runs the conversation.

---

### Q19. Memento: implement editor undo with snapshots and a caretaker. Connect it to event sourcing, and explain where `structuredClone` fits.

**Answer:**

Memento: **capture an object's internal state in an opaque token, without violating encapsulation, so it can be restored later.** Three roles: the *originator* (owns the state, creates/restores mementos), the *memento* (the snapshot — opaque to everyone but the originator), and the *caretaker* (stores mementos, never looks inside).

```typescript
// The memento: deliberately opaque. Only Editor can create or read one —
// TypeScript's class-private fields enforce "opaque to the caretaker".
class EditorMemento {
  constructor(
    private readonly content: string,
    private readonly cursorPos: number,
    public readonly takenAt: Date
  ) {}

  // Accessible only from Editor via a same-file friend function pattern:
  /** @internal */
  static read(m: EditorMemento): { content: string; cursorPos: number } {
    return { content: m.content, cursorPos: m.cursorPos };
  }
}

// The originator
class Editor {
  private content = "";
  private cursorPos = 0;

  type(text: string): void {
    this.content = this.content.slice(0, this.cursorPos) + text + this.content.slice(this.cursorPos);
    this.cursorPos += text.length;
  }

  deleteBack(count: number): void {
    const start = Math.max(0, this.cursorPos - count);
    this.content = this.content.slice(0, start) + this.content.slice(this.cursorPos);
    this.cursorPos = start;
  }

  snapshot(): EditorMemento {
    return new EditorMemento(this.content, this.cursorPos, new Date());
  }

  restore(m: EditorMemento): void {
    const state = EditorMemento.read(m);
    this.content = state.content;
    this.cursorPos = state.cursorPos;
  }

  get text(): string {
    return this.content;
  }
}

// The caretaker: manages history, treats mementos as sealed envelopes
class History {
  private undoStack: EditorMemento[] = [];
  private redoStack: EditorMemento[] = [];

  constructor(private readonly maxDepth: number) {}

  record(m: EditorMemento): void {
    this.undoStack.push(m);
    if (this.undoStack.length > this.maxDepth) this.undoStack.shift(); // bound memory
    this.redoStack = []; // new action invalidates the redo branch
  }

  undo(current: EditorMemento): EditorMemento | null {
    const prev = this.undoStack.pop();
    if (!prev) return null;
    this.redoStack.push(current);
    return prev;
  }

  redo(current: EditorMemento): EditorMemento | null {
    const next = this.redoStack.pop();
    if (!next) return null;
    this.undoStack.push(current);
    return next;
  }
}

const editor = new Editor();
const history = new History(100);

history.record(editor.snapshot());
editor.type("hello");
history.record(editor.snapshot());
editor.type(" world");

const prev = history.undo(editor.snapshot());
if (prev) editor.restore(prev);
console.log(editor.text); // "hello"
```

Design points interviewers dig at: the **caretaker never inspects mementos** (if `History` reads `content`, encapsulation is broken and every editor refactor breaks history); the **redo stack clears on new actions** (branching histories are a product decision, not a default); and history is **bounded** — snapshots retain full state, so an unbounded stack on a 10MB document is a memory incident.

**Where `structuredClone` fits.** When state is a plain-data object graph rather than two scalars, snapshotting means deep copy — and `JSON.parse(JSON.stringify(x))` silently corrupts `Date` (→ string), `Map`/`Set` (→ `{}`), `undefined` fields (dropped), and throws on cycles. `structuredClone` (Node ≥ 17) handles all of those:

```typescript
interface CanvasState {
  shapes: Map<string, { x: number; y: number; points: number[] }>;
  selected: Set<string>;
  lastEdit: Date;
}

function snapshotCanvas(state: CanvasState): CanvasState {
  return structuredClone(state); // deep, cycle-safe, preserves Map/Set/Date
}
void snapshotCanvas;
```

Its limits matter too: it can't clone functions, class methods (prototypes are lost — you get plain objects back), or DOM nodes. So memento-by-structuredClone fits plain-data state; class-heavy state needs originator-authored snapshots like `EditorMemento`. For large state with frequent snapshots, full clones are O(size) each — which is where immutable/persistent data structures (Immer's structural sharing) beat cloning: each "snapshot" shares unchanged branches and costs O(changes).

**The event-sourcing connection.** Undo has two dual implementations: store *states* (Memento) or store *actions* (Command, Q6). Event sourcing uses both, deliberately: the **event log** (commands/events) is the source of truth — replaying from zero reconstructs any state — and **snapshots** (mementos) are a replay optimization checkpoint: rebuild = load latest snapshot + replay events after it, turning O(all history) into O(since snapshot). Redux DevTools does exactly this in miniature (action log + periodic state snapshots), and Kafka Streams/EventStoreDB expose snapshotting as a first-class feature. Tradeoff to state: mementos are cheap to restore but big and opaque (no "why"); events are small and auditable but expensive to replay — production systems that care use events for truth, mementos for speed.

**When NOT to use Memento:** state that's trivially reconstructible from inputs (recompute instead of snapshot), state owned by an external system (you can't memento a database row meaningfully without locking semantics — that's what transactions are for), or when diffs suffice (text editors at scale store operational deltas, not full buffers — Memento loses to Command the moment state size dwarfs change size).

---

### Q20. Strategy vs State vs Template Method — three patterns that all "vary behavior." Give the discriminating test for each.

**Answer:**

All three answer "part of this behavior varies" — the differences are *who selects the variant, when it changes, and by what mechanism*:

| | Strategy | State | Template Method |
|---|---|---|---|
| **Varies** | The whole algorithm, as one unit | Behavior of *every* operation, by lifecycle phase | Chosen *steps* inside a fixed skeleton |
| **Who selects the variant** | The **client/composition root**, from outside | The **object itself** — states trigger transitions | The **author**, by choosing which subclass to instantiate |
| **Changes during object lifetime?** | Rarely (configured once) | Constantly — that's the point | Never (fixed at construction) |
| **Mechanism** | Composition (inject interface) | Composition (swap internal state object) | Inheritance (override hooks) |
| **Variants know about each other?** | No — strategies are mutually ignorant | **Yes** — states name their successors | No — siblings are independent |
| **Ecosystem anchor** | Passport strategies, multer engines | Order/connection lifecycles, XState | Node streams `_read`/`_write`, Jest lifecycle |

The discriminating tests, phrased as questions you ask about the requirement:

1. **"Who decides which variant runs, and how often does that change?"** If an outside party picks once at wiring time ("this deployment uses argon2") → **Strategy**. If the object switches its own behavior as things happen to it ("after `pay()`, cancel means refund") → **State**. If the variant is fixed per subclass and chosen by whoever instantiates ("the CSV import job") → **Template Method**.
2. **"Do the variants reference each other?"** `ExponentialBackoffPolicy` has no idea `FixedDelayPolicy` exists. `PaidState.ship()` constructs `ShippedState` — transition topology is *part of the variant's logic*. Interconnected variants are the loudest State signal; it's structurally Strategy-plus-transitions, and the transitions are the point.
3. **"Is the variation one pluggable unit, or steps woven through an invariant sequence?"** One swappable unit → Strategy. Multiple override points inside a workflow the parent must control (with shared workflow state between steps) → Template Method. If you find yourself passing six context arguments into a strategy so it can participate in your workflow, the workflow wants to be a template method; if a template's subclasses override every step, the skeleton is fiction and it wants to be a strategy.

Misclassification has real costs, which is why this gets asked: model a *state* problem as Strategy and every caller must know the transition rules to swap the strategy at the right moments — the invariant the pattern should own leaks to N call sites. Model a *strategy* problem as State and you get phantom transition machinery for variants that never change at runtime. Model either as Template Method and variant selection gets frozen into the class graph — runtime reconfiguration (feature flags, per-tenant behavior) now requires factories and re-instantiation instead of setting a field.

**Interview trap:** "State is just Strategy where the strategy changes." Structurally defensible, behaviorally wrong-headed: in Strategy the context is *ignorant of variant selection* (its whole virtue), while in State the context+states *own* selection (their whole virtue). The identical UML diagram encodes opposite ownership of the deciding logic — the pattern names communicate which party is responsible, and that responsibility assignment is the actual design decision.

---

### Q21. Which GoF behavioral patterns collapse into first-class functions in JavaScript — and which genuinely don't? Show the collapses.

**Answer:**

GoF was written for C++/Smalltalk, where "a behavior you can pass around" required wrapping it in an object. JavaScript has closures, so several behavioral patterns *are* the language:

```typescript
// STRATEGY -> a function parameter (Q2 covered this)
const sorted = [3, 1, 2].sort((a, b) => a - b); // comparator IS the strategy
void sorted;

// COMMAND -> a closure captures receiver + args; an array of closures is the queue
type Undoable = { execute: () => void; undo: () => void };
const makeAddStock = (ledger: Map<string, number>, sku: string, qty: number): Undoable => ({
  execute: () => ledger.set(sku, (ledger.get(sku) ?? 0) + qty),
  undo: () => ledger.set(sku, (ledger.get(sku) ?? 0) - qty),
});
// Two closures over shared captured state replace a class + constructor + fields.

// OBSERVER -> arrays of callbacks (every emitter is this inside)
const subscribers: Array<(price: number) => void> = [];
const notifyPrice = (p: number) => subscribers.forEach((fn) => fn(p));
void notifyPrice;

// TEMPLATE METHOD -> a function taking step functions (Q13's runEtl)
// CHAIN OF RESPONSIBILITY -> reduceRight over handler functions (Lesson 2.3 Q5's compose)
// ITERATOR -> generator functions (Q15): the factory, cursor, and state machine, free
```

So the honest taxonomy:

**Fully collapse to functions** — *Strategy* (stateless, single-method: a function type), *Command* (closure or `{execute, undo}` object literal — undo needs the pair, but no class), *Template Method* (higher-order function receiving step functions), *simple Observer* (callback registration), *Chain of Responsibility* (function composition with early return), *Iterator* (generators — the language ships the pattern as a keyword).

**Keep meaningful structure even in JS:**

- **State** — the pattern's content is the *transition topology and per-state behavior sets*, not callability. You can encode it in a table of functions (Q10's `transitions` object), but something must still own current-state, legality, and transition side effects — that coordination doesn't dissolve into a closure; it just chooses between class and table syntax.
- **Mediator** — its essence is *centralized interaction policy with identity* (registration, routing tables, mute lists). A mediator is stateful coordination among many parties; a function can't hold the room.
- **Memento** — snapshots are *data with encapsulation boundaries*, orthogonal to functions entirely.
- **Observer at production grade** — the moment you need `once`, unsubscribe, error isolation, listener introspection, and max-listener heuristics (Q3/Q4), the callback array grows back into an emitter class. The pattern collapsed only while requirements were toy-sized.

The senior synthesis, useful as an interview closer: **patterns are language-shaped.** GoF patterns are best read as *named roles and responsibilities*, not class diagrams; in JS the roles stay (something decides, something varies, something remembers) while the encoding shifts down the ceremony ladder — class → object literal → closure → language keyword (`function*`, `for await`). Two practical corollaries: (1) reaching for the class encoding when a closure suffices is Java-in-JS noise, and reviewers should say so; (2) the *names* remain valuable even when the code is three lines — "this comparator is our sort strategy; don't add I/O to it" communicates a contract that `(a, b) => a - b` alone doesn't. Use the vocabulary, skip the boilerplate.

**Interview trap:** "So in JavaScript, design patterns are obsolete." The follow-up they're fishing for. No — the *ceremony* is obsolete; the *decisions* (where variation lives, who owns transitions, what's observable, what's reversible) are language-independent, and the failure modes this lesson catalogued — unbounded observer backpressure, boolean-flag state machines, god-object mediators, fell-off-the-end chains — happen *more* in JS precisely because the language makes wiring behavior so frictionless that nobody stops to name the design.
