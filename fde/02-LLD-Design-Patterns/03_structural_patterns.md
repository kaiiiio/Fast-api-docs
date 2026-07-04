# Lesson 2.3 — Structural Patterns — Composing Objects Into Larger Systems

> Module: LLD & Design Patterns | Level: Senior | FDE Prep Phase 2

Structural patterns answer one question: *how do you compose objects and classes into larger structures without welding them together?* At the senior level nobody asks you to recite UML — they ask why NestJS can swap Express for Fastify without touching your controllers, why Express middleware is really a decorator chain, and why Mongoose documents behave like plain objects but aren't. Every pattern here already lives inside the Node.js ecosystem you ship daily; the interview tests whether you can *name* what you've been using and articulate when it becomes overhead.

---

### Q1. Your app is coupled to Stripe's SDK in 40 files. The company signs a deal with Adyen. Walk me through the Adapter pattern fix — and why the pattern exists at all.

**Answer:**

The problem is *interface mismatch plus vendor coupling*. Stripe's SDK exposes `stripe.paymentIntents.create({...})`; Adyen exposes `checkout.payments({...})` with completely different field names, amounts in different units (Stripe uses cents, Adyen uses minor units per currency), and different error shapes. If your business logic calls the vendor SDK directly, a vendor swap is a 40-file rewrite and an untestable one.

The Adapter pattern says: **define the interface your domain wishes existed (the target), then write one class per vendor that translates between your target and the vendor's real API (the adaptee).**

```typescript
// The target interface — owned by YOU, shaped by YOUR domain language
interface PaymentGateway {
  charge(amountCents: number, currency: string, token: string): Promise<PaymentResult>;
  refund(chargeId: string, amountCents: number): Promise<RefundResult>;
}

interface PaymentResult {
  chargeId: string;
  status: "succeeded" | "requires_action" | "failed";
}

interface RefundResult {
  refundId: string;
  status: "succeeded" | "pending" | "failed";
}

// Adaptee #1: Stripe's real-world shape (simplified but faithful)
class StripeSDK {
  async createPaymentIntent(params: {
    amount: number; // cents
    currency: string;
    payment_method: string;
    confirm: boolean;
  }): Promise<{ id: string; status: string }> {
    return { id: `pi_${Date.now()}`, status: "succeeded" };
  }
  async createRefund(params: { payment_intent: string; amount: number }): Promise<{ id: string; status: string }> {
    return { id: `re_${Date.now()}`, status: "succeeded" };
  }
}

// Adaptee #2: Adyen's shape — different naming, different semantics
class AdyenClient {
  async payments(req: {
    amount: { value: number; currency: string };
    paymentMethod: { type: string; storedPaymentMethodId: string };
  }): Promise<{ pspReference: string; resultCode: string }> {
    return { pspReference: `psp_${Date.now()}`, resultCode: "Authorised" };
  }
  async refunds(pspReference: string, amount: { value: number; currency: string }): Promise<{ pspReference: string; status: string }> {
    return { pspReference: `psp_r_${Date.now()}`, status: "received" };
  }
}

// Object adapter for Stripe
class StripeAdapter implements PaymentGateway {
  constructor(private readonly stripe: StripeSDK) {}

  async charge(amountCents: number, currency: string, token: string): Promise<PaymentResult> {
    const intent = await this.stripe.createPaymentIntent({
      amount: amountCents,
      currency,
      payment_method: token,
      confirm: true,
    });
    return {
      chargeId: intent.id,
      status: intent.status === "succeeded" ? "succeeded" : intent.status === "requires_action" ? "requires_action" : "failed",
    };
  }

  async refund(chargeId: string, amountCents: number): Promise<RefundResult> {
    const r = await this.stripe.createRefund({ payment_intent: chargeId, amount: amountCents });
    return { refundId: r.id, status: r.status === "succeeded" ? "succeeded" : "pending" };
  }
}

// Object adapter for Adyen — note the semantic translation, not just renaming
class AdyenAdapter implements PaymentGateway {
  constructor(private readonly adyen: AdyenClient) {}

  async charge(amountCents: number, currency: string, token: string): Promise<PaymentResult> {
    const res = await this.adyen.payments({
      amount: { value: amountCents, currency },
      paymentMethod: { type: "scheme", storedPaymentMethodId: token },
    });
    return {
      chargeId: res.pspReference,
      status: res.resultCode === "Authorised" ? "succeeded" : res.resultCode === "ChallengeShopper" ? "requires_action" : "failed",
    };
  }

  async refund(chargeId: string, amountCents: number): Promise<RefundResult> {
    const r = await this.adyen.refunds(chargeId, { value: amountCents, currency: "USD" });
    return { refundId: r.pspReference, status: r.status === "received" ? "pending" : "succeeded" };
  }
}

// Business logic depends only on the target
class CheckoutService {
  constructor(private readonly gateway: PaymentGateway) {}
  async pay(orderTotalCents: number, token: string): Promise<PaymentResult> {
    return this.gateway.charge(orderTotalCents, "USD", token);
  }
}
```

Now the vendor swap is one line at the composition root: `new CheckoutService(new AdyenAdapter(new AdyenClient()))`. Tests inject a fake `PaymentGateway` and never touch a vendor SDK.

The key senior insight: **the target interface should speak your domain's language, not a lowest-common-denominator of vendor APIs.** If you design `PaymentGateway` by intersecting Stripe and Adyen features, you've let vendors design your domain layer anyway.

**Interview trap:** "Isn't this just a wrapper?" A wrapper that *changes the interface* is an adapter. A wrapper that keeps the same interface but adds behavior is a decorator; one that controls access is a proxy. The interviewer is checking whether you distinguish intent, because the class diagrams look nearly identical.

---

### Q2. Class adapter vs object adapter — what's the difference, and why does TypeScript/JavaScript push you toward one of them?

**Answer:**

- **Object adapter** (what Q1 shows): the adapter *holds a reference* to the adaptee and delegates. Composition.
- **Class adapter**: the adapter *inherits* from the adaptee while implementing the target interface. In C++ this uses multiple inheritance. In TypeScript you can approximate it with single inheritance:

```typescript
interface Logger {
  log(level: "info" | "error", message: string): void;
}

// Adaptee: a legacy logger with a different interface
class LegacyLogger {
  writeInfo(msg: string): void {
    process.stdout.write(`INFO ${msg}\n`);
  }
  writeError(msg: string): void {
    process.stderr.write(`ERR  ${msg}\n`);
  }
}

// Class adapter: IS-A LegacyLogger, presents Logger
class LegacyLoggerClassAdapter extends LegacyLogger implements Logger {
  log(level: "info" | "error", message: string): void {
    if (level === "info") this.writeInfo(message);
    else this.writeError(message);
  }
}
```

Why object adapters win in practice, especially in Node:

1. **You can't extend what you don't construct.** Most SDK clients are built via factory functions (`new Stripe(key)` returns a configured instance, sometimes not even a class you can subclass cleanly). Composition works with any instance handed to you — including one from DI.
2. **A class adapter leaks the adaptee's entire surface.** `LegacyLoggerClassAdapter` still exposes `writeInfo` publicly, so callers can bypass your abstraction. The object adapter exposes exactly the target and nothing else.
3. **One object adapter can wrap multiple adaptees or swap them at runtime**; a class adapter is welded to one parent at compile time.
4. TypeScript has no multiple class inheritance, so a class adapter that must extend an adaptee *and* an abstract target class is simply impossible — mixins exist but are ceremony.

The one legitimate argument for class adapters — overriding protected adaptee behavior — almost never applies to third-party SDKs, whose internals you shouldn't depend on anyway.

**Interview trap:** "Where do you put the adapter's error translation?" In the adapter. If `StripeCardError` escapes the adapter and your domain code catches vendor exception types, you've only adapted the happy path and the coupling survived. A complete adapter maps *both* return values and failure modes into domain types.

---

### Q3. Give me three real adapter implementations in the Node ecosystem and what each one adapts.

**Answer:**

1. **ORM/query-builder dialects — Knex and Sequelize.** Knex exposes one query-builder API (`knex('users').where(...)`), but Postgres, MySQL, and SQLite differ in placeholder syntax (`$1` vs `?`), `RETURNING` support, and upsert semantics. Each dialect class adapts the shared "compile this query AST" target interface to a specific driver (`pg`, `mysql2`, `better-sqlite3`). Sequelize does the same with its dialect layer. Target = the query interface; adaptee = the raw driver.

2. **NestJS platform adapters.** Your controllers depend on Nest's abstractions (`@Req()`, `@Res()`, `HttpServer` interface). `@nestjs/platform-express` and `@nestjs/platform-fastify` each implement `AbstractHttpAdapter` — mapping Nest's `reply(response, body, statusCode)` to `res.status(...).send(...)` (Express) or `reply.code(...).send(...)` (Fastify). That's why swapping frameworks is a two-line change in `main.ts` — the adapter absorbs the interface mismatch. It's also why grabbing the raw response object in a Nest app quietly breaks framework portability: you've reached through the adapter.

3. **`util.promisify` in Node core.** It adapts the error-first callback calling convention to the promise convention:

```typescript
import { promisify } from "node:util";
import { readFile } from "node:fs";

// Adaptee convention: readFile(path, cb(err, data))
// Target convention:  readFileAsync(path) => Promise<Buffer>
const readFileAsync: (path: string) => Promise<Buffer> = promisify(readFile);

async function loadConfig(): Promise<string> {
  const buf = await readFileAsync("./config.json");
  return buf.toString("utf8");
}
```

It's an adapter over a *calling convention* rather than a class — a reminder that in JS the pattern applies to functions as first-class citizens too. `callbackify` is the same adapter pointed the other way.

**When NOT to use Adapter:** when you control both sides. If both interfaces are yours, fix one instead of adding a translation layer — adapters between your own modules are a smell that two teams refused to agree on a contract. Also skip it for a vendor you will *never* swap and whose API is already clean (e.g., wrapping `node:crypto` behind `ICryptoProvider` "just in case" adds indirection with no exit you'll ever take). Adapt at genuine boundaries: payments, storage, email, search — things procurement can change under you.

---

### Q4. Implement the GoF Decorator pattern: a `UserRepository` that gains caching, logging, and metrics without any subclass explosion. Then tell me why inheritance fails here.

**Answer:**

The inheritance approach dies combinatorially: `CachedUserRepository`, `LoggedUserRepository`, `CachedLoggedUserRepository`, `CachedLoggedMeteredUserRepository`... n features = 2^n subclasses, and the stacking *order* isn't even expressible. The decorator solution: every decorator **implements the same interface as the component and wraps another instance of that interface.** Stacking becomes runtime composition.

```typescript
interface User {
  id: string;
  email: string;
}

interface UserRepository {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

// Concrete component — the real thing
class PostgresUserRepository implements UserRepository {
  private readonly rows = new Map<string, User>();

  async findById(id: string): Promise<User | null> {
    return this.rows.get(id) ?? null;
  }
  async save(user: User): Promise<void> {
    this.rows.set(user.id, user);
  }
}

// Decorator 1: caching (with invalidation on write — the part juniors forget)
class CachingUserRepository implements UserRepository {
  private readonly cache = new Map<string, { user: User; expiresAt: number }>();

  constructor(private readonly inner: UserRepository, private readonly ttlMs: number) {}

  async findById(id: string): Promise<User | null> {
    const hit = this.cache.get(id);
    if (hit && hit.expiresAt > Date.now()) return hit.user;
    const user = await this.inner.findById(id);
    if (user) this.cache.set(id, { user, expiresAt: Date.now() + this.ttlMs });
    return user;
  }

  async save(user: User): Promise<void> {
    await this.inner.save(user);
    this.cache.delete(user.id); // invalidate, don't populate — write-around
  }
}

// Decorator 2: logging
class LoggingUserRepository implements UserRepository {
  constructor(private readonly inner: UserRepository, private readonly log: (msg: string) => void) {}

  async findById(id: string): Promise<User | null> {
    this.log(`findById(${id})`);
    try {
      return await this.inner.findById(id);
    } catch (err) {
      this.log(`findById(${id}) FAILED: ${(err as Error).message}`);
      throw err;
    }
  }

  async save(user: User): Promise<void> {
    this.log(`save(${user.id})`);
    await this.inner.save(user);
  }
}

// Decorator 3: metrics
class MeteredUserRepository implements UserRepository {
  constructor(
    private readonly inner: UserRepository,
    private readonly recordMs: (op: string, ms: number) => void
  ) {}

  async findById(id: string): Promise<User | null> {
    const start = performance.now();
    try {
      return await this.inner.findById(id);
    } finally {
      this.recordMs("user_repo.find_by_id", performance.now() - start);
    }
  }

  async save(user: User): Promise<void> {
    const start = performance.now();
    try {
      await this.inner.save(user);
    } finally {
      this.recordMs("user_repo.save", performance.now() - start);
    }
  }
}

// Composition root — order is explicit and meaningful
const repo: UserRepository = new MeteredUserRepository(
  new LoggingUserRepository(
    new CachingUserRepository(new PostgresUserRepository(), 30_000),
    (m) => console.log(m)
  ),
  (op, ms) => console.log(`${op}=${ms.toFixed(1)}ms`)
);
```

Order matters and is a real interview probe: with metrics *outside* caching, you measure end-to-end latency including cache hits (~0ms); with metrics *inside* caching, you measure only actual DB round-trips. Neither is wrong — but the decorator pattern makes the choice explicit and reversible, which inheritance never could.

The consumer holds a `UserRepository` and cannot tell (and must not care) how many layers deep the onion goes. That transparency is the pattern's contract.

**Interview trap:** "Decorators are transparent, so stacking is free, right?" No — decorators can violate the component's *behavioral* contract even while satisfying its type. The caching decorator makes `findById` return stale data for up to 30s; a retry decorator makes `save` non-idempotent operations fire twice. Types compose; semantics need thought.

---

### Q5. "Express middleware is the Decorator pattern." Defend or attack that claim, precisely.

**Answer:**

Defend, with one refinement. The essence of Decorator is: *a chain of components sharing one uniform interface, each adding behavior before/after delegating to the next, composed at runtime.* Express middleware is exactly that, expressed with functions instead of classes:

```typescript
import type { IncomingMessage, ServerResponse } from "node:http";

type Handler = (req: IncomingMessage, res: ServerResponse) => Promise<void>;
type Middleware = (next: Handler) => Handler;

// Each middleware DECORATES a handler and returns a handler — same interface in, same out
const withTiming: Middleware = (next) => async (req, res) => {
  const start = performance.now();
  await next(req, res);
  console.log(`${req.method} ${req.url} ${(performance.now() - start).toFixed(1)}ms`);
};

const withAuth: Middleware = (next) => async (req, res) => {
  if (!req.headers.authorization) {
    res.statusCode = 401;
    res.end("unauthorized");
    return; // short-circuit: don't call next — decorators may withhold delegation
  }
  await next(req, res);
};

const compose = (...mws: Middleware[]): Middleware =>
  (final) => mws.reduceRight((acc, mw) => mw(acc), final);

const handler: Handler = async (_req, res) => {
  res.end("hello");
};

const app: Handler = compose(withTiming, withAuth)(handler);
```

Mapping to GoF vocabulary: the `Handler` signature is the Component interface; the terminal route handler is the ConcreteComponent; each middleware is a ConcreteDecorator; `compose`/`app.use` is the composition root. Express's `next()` is the delegation call, and calling it (or not) is the decorator deciding whether to delegate.

The refinement: Express middleware is also legitimately described as **Chain of Responsibility**, because middleware may *terminate* the chain (send a response and never call `next`), and routing means different requests traverse different chains. The honest senior answer: it sits between both — decorator when every layer delegates and adds behavior (logging, compression, timing), CoR when layers decide *whether* to handle (auth guards, routers). Say that out loud; interviewers reward the distinction.

NestJS **interceptors** are the same idea with the delegation made explicit and value-returning: `intercept(context, next)` receives `next.handle()` as an Observable, so an interceptor can transform the response, time it, or replace it — behavior-adding wrappers around a uniform handler, i.e., decorators. Guards, by contrast, are pure CoR (proceed/deny).

Function composition is the FP equivalent of the whole pattern: `compose(withTiming, withAuth)` is decorator stacking with zero classes. In JavaScript, where functions are first-class, the FP form is usually the idiomatic one — reserve class decorators for when decorators need their own state and lifecycle (like the cache map in Q4).

**Interview trap:** "Middleware order doesn't matter as long as they're all registered." It matters critically. Put `withTiming` inside `withAuth` and you never time rejected requests; register a body parser after the route and the route sees an empty body. Express executes in registration order — an outage-grade detail (e.g., rate limiting registered after an expensive parser means attackers still pay you the parsing cost).

---

### Q6. TypeScript `@decorators` vs the GoF Decorator pattern — same thing? Explain what NestJS actually does with `@Injectable()` and `@Get()`.

**Answer:**

Different things sharing a name — a deliberately laid interview minefield.

**GoF Decorator** is a *runtime object-composition* pattern: wrap an instance in another instance of the same interface to add behavior (Q4).

**TypeScript decorators** are *declarative annotations* — functions that run **once at class-definition time**, receiving the class/method/parameter as input. Their overwhelmingly dominant use is attaching **metadata**, not wrapping behavior:

```typescript
import "reflect-metadata";

const ROUTE_KEY = Symbol("route");

interface RouteDef {
  method: "GET" | "POST";
  path: string;
  handlerName: string;
}

// A method decorator: records metadata, changes NO runtime behavior
function Get(path: string): MethodDecorator {
  return (target, propertyKey) => {
    const routes: RouteDef[] = Reflect.getMetadata(ROUTE_KEY, target.constructor) ?? [];
    routes.push({ method: "GET", path, handlerName: String(propertyKey) });
    Reflect.defineMetadata(ROUTE_KEY, routes, target.constructor);
  };
}

class UsersController {
  @Get("/users/:id")
  getUser(id: string): { id: string } {
    return { id };
  }
}

// A framework (this is what Nest's router does conceptually) reads it back later:
function buildRoutes(ctrl: new () => object): RouteDef[] {
  return Reflect.getMetadata(ROUTE_KEY, ctrl) ?? [];
}

const routes = buildRoutes(UsersController);
// [{ method: "GET", path: "/users/:id", handlerName: "getUser" }]
```

This is what NestJS does everywhere: `@Injectable()` marks a class so the DI container will instantiate it and (with `emitDecoratorMetadata`) records constructor parameter *types* so dependencies can be resolved; `@Get('/users')` records routing metadata that the router reads at bootstrap; `@UseInterceptors()` records *which* wrappers to apply. The annotations themselves add no behavior — Nest's runtime reads the metadata and then, ironically, applies the **GoF pattern** on your behalf: interceptors are true runtime decorators wired up from metadata written by TS decorators.

A TS method decorator *can* implement GoF-style wrapping by replacing the descriptor:

```typescript
function Memoize(): MethodDecorator {
  return (_target, _key, descriptor: PropertyDescriptor) => {
    const original = descriptor.value as (...args: unknown[]) => unknown;
    const cache = new Map<string, unknown>();
    descriptor.value = function (...args: unknown[]): unknown {
      const key = JSON.stringify(args);
      if (!cache.has(key)) cache.set(key, original.apply(this, args));
      return cache.get(key);
    };
  };
}
```

But note the tradeoff: this decorates the *class definition* — every instance, decided at author time. GoF decoration wraps *instances* — per-object, decided at composition time, stackable in any order. That loss of composition-time flexibility is why frameworks prefer metadata + runtime wrapping over descriptor-mutation.

**When NOT to use decorators (either kind):** don't reach for GoF decorators when there's exactly one cross-cutting concern and one component — a subclass or a plain function wrapper is less machinery. And don't use TS decorators outside a framework that owns the metadata contract; ad-hoc `reflect-metadata` in application code creates invisible coupling that grep can't find.

**Interview trap:** "Since TC39 decorators are now standard, `emitDecoratorMetadata` works with them too, right?" No — the stage-3 standard decorators have a different signature (context object, no `reflect-metadata` type emission). NestJS still relies on `experimentalDecorators` + `emitDecoratorMetadata` for constructor-type inference; flipping to standard decorators silently breaks type-based DI resolution.

---

### Q7. Design a `CheckoutFacade`. What is Facade actually buying you, and where's the line between a facade and a god object?

**Answer:**

Facade gives a **single, intention-revealing entry point over a subsystem of collaborating parts**, so that callers depend on one simple interface instead of orchestrating four services in the right order themselves. The subsystem stays fully accessible for power users — the facade is a convenience layer, not a prison.

```typescript
// ---- Subsystems: each is independently useful and independently testable ----
class InventoryService {
  private stock = new Map<string, number>([["sku-1", 10]]);

  async reserve(sku: string, qty: number): Promise<{ reservationId: string }> {
    const available = this.stock.get(sku) ?? 0;
    if (available < qty) throw new Error(`Insufficient stock for ${sku}`);
    this.stock.set(sku, available - qty);
    return { reservationId: `rsv_${Date.now()}` };
  }

  async release(reservationId: string): Promise<void> {
    // compensating action; idempotent by design
    void reservationId;
  }
}

class PaymentService {
  async charge(amountCents: number, token: string): Promise<{ chargeId: string }> {
    if (!token) throw new Error("Missing payment token");
    return { chargeId: `ch_${amountCents}_${Date.now()}` };
  }
}

class ShippingService {
  async createShipment(sku: string, qty: number, address: string): Promise<{ trackingId: string }> {
    void sku; void qty; void address;
    return { trackingId: `trk_${Date.now()}` };
  }
}

class EmailService {
  async sendOrderConfirmation(email: string, trackingId: string): Promise<void> {
    void email; void trackingId;
  }
}

// ---- The facade: encodes the CORRECT orchestration once ----
interface CheckoutRequest {
  sku: string;
  qty: number;
  unitPriceCents: number;
  paymentToken: string;
  address: string;
  email: string;
}

interface CheckoutResult {
  chargeId: string;
  trackingId: string;
}

class CheckoutFacade {
  constructor(
    private readonly inventory: InventoryService,
    private readonly payments: PaymentService,
    private readonly shipping: ShippingService,
    private readonly email: EmailService
  ) {}

  async checkout(req: CheckoutRequest): Promise<CheckoutResult> {
    // Reserve BEFORE charging — never take money for stock you don't have
    const reservation = await this.inventory.reserve(req.sku, req.qty);

    let chargeId: string;
    try {
      const charge = await this.payments.charge(req.unitPriceCents * req.qty, req.paymentToken);
      chargeId = charge.chargeId;
    } catch (err) {
      await this.inventory.release(reservation.reservationId); // compensate
      throw err;
    }

    const shipment = await this.shipping.createShipment(req.sku, req.qty, req.address);

    // Email is best-effort: a failed confirmation email must not fail a paid order
    this.email.sendOrderConfirmation(req.email, shipment.trackingId).catch(() => {
      /* enqueue for retry in production */
    });

    return { chargeId, trackingId: shipment.trackingId };
  }
}
```

Notice what the facade encodes that no individual subsystem can: **ordering** (reserve → charge → ship), **compensation** (release stock if charging fails), and **failure-severity policy** (email is fire-and-forget, payment is not). Without the facade, every caller — REST controller, GraphQL resolver, admin CLI, queue consumer — re-implements that orchestration, and one of them will get the compensation wrong.

**Facade vs god object** — the distinction interviewers want:

- A facade **delegates**; a god object **implements**. If `CheckoutFacade` starts containing pricing math, stock ledger logic, and SMTP code, it's become a god object.
- A facade is **stateless orchestration** (or nearly); a god object accumulates mutable state that everything reads.
- Subsystems behind a facade remain **independently usable and testable**; behind a god object, nothing works standalone.
- A facade has **one reason to change** (the workflow); a god object has all of them.
- Heuristic: count *imports into* vs *logic inside*. Many collaborators + thin methods = facade. Few collaborators + fat methods = god object.

**When NOT to use Facade:** when the "subsystem" is one class (that's just indirection), or when callers genuinely need fine-grained control — forcing everything through a coarse facade method leads to boolean-flag parameters (`checkout(req, skipEmail, skipShipping)`) which is the facade decomposing in real time. At that point expose the subsystems or split the facade per use case.

**Interview trap:** "Is this a distributed transaction?" No — and saying "wrap it in a transaction" for cross-service operations is a red flag. The facade shown implements manual compensation (a micro-saga). If payment succeeds and shipping creation fails, you need a compensating refund or a retry queue; acknowledging that gap is the senior move.

---

### Q8. Name real facades in the Node ecosystem and explain what each hides.

**Answer:**

1. **Mongoose over the MongoDB driver.** The raw driver gives you `collection.updateOne(filter, update, options)`, manual connection pools, BSON handling, and no schema. Mongoose fronts that with `User.findById()`, schema validation, middleware hooks, casting, and population. One `user.save()` orchestrates validation → casting → hooks → `updateOne` with a computed diff. Crucially it stays a *facade*, not a wall: `User.collection` and `mongoose.connection.db` hand you the raw driver when you need `bulkWrite` or an aggregation the ODM doesn't model. Good facades always leave that escape hatch.

2. **`fetch` over HTTP internals.** One call — `await fetch(url)` — hides: DNS resolution, socket/TLS establishment, connection pooling and keep-alive reuse, redirect following, chunked transfer decoding, and (in Node, via undici) HTTP pipelining internals. Compare with hand-rolling the same over `http.request`: agent configuration, status-code redirect loops, stream accumulation, error propagation across `error`/`aborted`/`timeout` events. Node's `fetch` is literally implemented as a facade over undici's lower-level `request`/`Dispatcher` API, which remains exported for people who need per-origin pool tuning.

3. **`http.createServer((req, res) => ...)` itself** facades socket lifecycle management, HTTP parsing (llhttp), header normalization, and keep-alive semantics. Almost nobody touches `net.Socket` HTTP parsing directly — that's the facade succeeding so well it's invisible.

4. Honorable mention: **`child_process.exec`** is a convenience facade over `spawn` (shell invocation + output buffering + single callback). It also demonstrates facade *cost*: `exec` buffers entire stdout in memory (default `maxBuffer` 1MB) — the simplification embeds a policy that breaks for large outputs, and you must drop down to `spawn` streams. Facades encode opinions; senior engineers know which opinions their facade froze in.

The pattern-level takeaway: a facade is judged by whether the 90% case becomes one obvious call **and** the 10% case is still reachable. Mongoose, fetch/undici, and exec/spawn all pass because the lower layer is exported, documented, and interoperable.

**Interview trap:** "Facade and Adapter both wrap things — difference?" Adapter *converts one interface to another expected interface* (motivated by incompatibility, usually 1:1). Facade *simplifies a subsystem of many parts* (motivated by complexity, usually 1:N) and invents whatever interface is most convenient — there's no pre-existing target interface it must satisfy.

---

### Q9. Implement three classic GoF proxies — virtual (lazy-init), protection, and caching — over the same subject. What is the pattern's invariant?

**Answer:**

The invariant: **the proxy implements the same interface as the subject and controls access to it** — deferring creation, gating callers, or short-circuiting calls — while the client cannot tell it isn't holding the real subject. Unlike a decorator (added behavior, subject supplied from outside), a proxy typically **manages the subject's lifecycle itself** and its purpose is access control, not enrichment.

```typescript
interface ReportService {
  generate(reportId: string): Promise<string>;
}

// The real subject — expensive to construct (imagine warming a connection pool)
class HeavyReportService implements ReportService {
  constructor() {
    console.log("HeavyReportService: expensive construction (pool warmup, template compile)");
  }
  async generate(reportId: string): Promise<string> {
    return `report:${reportId}:${Date.now()}`;
  }
}

// 1) Virtual proxy — defers construction until first real use
class LazyReportServiceProxy implements ReportService {
  private real: HeavyReportService | null = null;

  private subject(): HeavyReportService {
    if (this.real === null) this.real = new HeavyReportService(); // proxy OWNS lifecycle
    return this.real;
  }

  async generate(reportId: string): Promise<string> {
    return this.subject().generate(reportId);
  }
}

// 2) Protection proxy — gates access by caller identity
interface Caller {
  userId: string;
  roles: ReadonlyArray<string>;
}

class ProtectedReportServiceProxy implements ReportService {
  constructor(private readonly inner: ReportService, private readonly caller: Caller) {}

  async generate(reportId: string): Promise<string> {
    if (!this.caller.roles.includes("analyst")) {
      throw new Error(`Access denied: ${this.caller.userId} lacks role 'analyst'`);
    }
    return this.inner.generate(reportId);
  }
}

// 3) Caching proxy — short-circuits repeat calls, with in-flight de-duplication
class CachingReportServiceProxy implements ReportService {
  private readonly inFlight = new Map<string, Promise<string>>();
  private readonly done = new Map<string, { value: string; expiresAt: number }>();

  constructor(private readonly inner: ReportService, private readonly ttlMs: number) {}

  async generate(reportId: string): Promise<string> {
    const hit = this.done.get(reportId);
    if (hit && hit.expiresAt > Date.now()) return hit.value;

    // De-dupe concurrent identical calls — prevents cache stampede
    const pending = this.inFlight.get(reportId);
    if (pending) return pending;

    const p = this.inner
      .generate(reportId)
      .then((value) => {
        this.done.set(reportId, { value, expiresAt: Date.now() + this.ttlMs });
        return value;
      })
      .finally(() => this.inFlight.delete(reportId));

    this.inFlight.set(reportId, p);
    return p;
  }
}

// Stackable exactly because everything is a ReportService
const service: ReportService = new ProtectedReportServiceProxy(
  new CachingReportServiceProxy(new LazyReportServiceProxy(), 60_000),
  { userId: "u1", roles: ["analyst"] }
);
```

Two production-grade details worth calling out in an interview:

- The caching proxy de-duplicates **in-flight** requests, not just completed ones. Without the `inFlight` map, 100 concurrent cache-miss requests trigger 100 backend calls — a thundering herd. This is the same reason DataLoader exists for GraphQL.
- Stacking order encodes policy: protection *outside* caching means unauthorized users can't even warm or read the cache. Reversed, a denied user's earlier call could have populated results an attacker later times against.

**Interview trap:** "Proxy vs decorator — the code looks identical." It nearly is; the differences are intent and lifecycle. A decorator *adds behavior* and receives its component from the outside so clients can stack any combination. A proxy *controls access* (deny, defer, short-circuit) and frequently *creates or owns* its subject (see the lazy proxy — the client never touches `HeavyReportService`). If the wrapper can refuse to call the subject at all, or the subject doesn't exist yet, you're looking at a proxy.

---

### Q10. Show ES `Proxy` doing real work: a validation proxy and a property-access logger. Where does the ES `Proxy` object differ from the GoF pattern?

**Answer:**

ES `Proxy` is a *language-level metaprogramming tool*: it intercepts fundamental object operations (get, set, has, deleteProperty, apply, construct) via traps. It can *implement* the GoF pattern, but it's more general — it virtualizes property access itself, which no hand-written class proxy can do for unknown property names.

```typescript
// 1) Validation proxy — rejects bad writes at the object boundary
interface OrderDraft {
  qty: number;
  couponCode: string;
  [key: string]: unknown;
}

function validated(target: OrderDraft): OrderDraft {
  const validators: Record<string, (v: unknown) => string | null> = {
    qty: (v) => (typeof v === "number" && Number.isInteger(v) && v > 0 ? null : "qty must be a positive integer"),
    couponCode: (v) => (typeof v === "string" && /^[A-Z0-9_]{0,16}$/.test(v) ? null : "couponCode must be A-Z/0-9, <=16 chars"),
  };

  return new Proxy(target, {
    set(obj, prop, value, receiver): boolean {
      const validate = validators[String(prop)];
      if (validate) {
        const error = validate(value);
        if (error) throw new TypeError(`Invalid write to ${String(prop)}: ${error}`);
      }
      return Reflect.set(obj, prop, value, receiver);
    },
    deleteProperty(obj, prop): boolean {
      if (String(prop) in validators) throw new TypeError(`Cannot delete required field ${String(prop)}`);
      return Reflect.deleteProperty(obj, prop);
    },
  });
}

const draft = validated({ qty: 1, couponCode: "" });
draft.qty = 3;          // ok
// draft.qty = -1;      // throws TypeError — invalid state is unrepresentable

// 2) Property-access logger — invaluable for tracing "who reads this config?"
function traced<T extends object>(target: T, label: string, log: (msg: string) => void): T {
  return new Proxy(target, {
    get(obj, prop, receiver): unknown {
      log(`${label}.${String(prop)} read`);
      return Reflect.get(obj, prop, receiver);
    },
  });
}

const config = traced({ dbUrl: "postgres://localhost", poolSize: 10 }, "config", console.log);
const url = config.dbUrl; // logs: config.dbUrl read
void url;
```

Real systems built on ES `Proxy`:

- **Mongoose documents** use `Proxy` (since v5.1 for arrays, more broadly in later versions) so that `doc.items.push(x)` and `doc.nested.field = y` are *intercepted* and mark paths dirty — that's how `doc.save()` knows to send a minimal `$set`/`$push` update instead of rewriting the document. Without traps, Mongoose needed getter/setter compilation from the schema and `markModified()` for anything it couldn't see.
- **Vue 3 reactivity** — `reactive()` wraps state in a Proxy; the `get` trap records which effect read which key (dependency tracking), the `set` trap triggers re-runs. Vue 2 used `Object.defineProperty`, which couldn't detect *added* properties or index writes — the Proxy rewrite removed a whole class of caveats.
- Others worth naming: **Immer** (drafts are proxies recording mutations to produce immutable copies), and test spies in mocking libraries.

Differences from GoF proxy: an ES `Proxy` needs no predeclared interface (it traps *any* property), it operates at property granularity rather than method granularity, and identity diverges (`proxy !== target`, which breaks `Map` keys, `===` checks, and private-field access — `#priv` in a class throws through a proxy because private fields check the *actual* receiver). Also each trapped access pays a real cost and defeats V8's inline caches on hot paths — don't proxy objects in tight loops.

**When NOT to use ES Proxy:** for a known, finite interface, a plain wrapper class is faster, debuggable, and typeable. Reach for `Proxy` only when the property set is *open* (dirty tracking, reactivity, dynamic RPC clients like `client.anyMethod(...)`).

**Interview trap:** "Can a Proxy make `===` transparent?" No. Proxies are not transparent for identity, and there's no trap for equality. Any system mixing raw and proxied references (Vue's `toRaw`, Mongoose's `$locals` internals) must canonicalize before comparing — a classic source of "reactive object not equal to itself" bugs.

---

### Q11. "nginx in front of your Node app is the Proxy pattern at infrastructure scale." Make that argument concretely.

**Answer:**

The GoF proxy's contract: *same interface as the subject, controls access, client can't tell the difference.* A reverse proxy satisfies every clause at the network level:

- **Same interface:** nginx speaks HTTP to the client, exactly as the Node upstream would. The client cannot distinguish nginx-fronted from direct (that's the point).
- **Protection proxy:** TLS termination, rate limiting (`limit_req`), IP allow/deny lists, request-size caps (`client_max_body_size`), header sanitation. Your Node process never sees traffic that fails these gates — precisely `ProtectedReportServiceProxy` from Q9, applied before the subject.
- **Caching proxy:** `proxy_cache` serves repeat GETs without touching the upstream — the `CachingReportServiceProxy` short-circuit, including stampede control (`proxy_cache_lock on` = the in-flight de-dupe map).
- **Virtual proxy:** serverless/scale-to-zero setups where the proxy holds the request while the upstream cold-starts is lazy initialization of the subject.

Why this matters *specifically for Node*: the event loop is your scarcest resource. Every byte of TLS handshake, every slowloris connection trickling one byte a second, every 50MB upload buffered in JS heap is event-loop and memory pressure. nginx handles slow clients in epoll-driven C with request buffering (`proxy_buffering`), releasing your Node worker the instant the response is handed off rather than for the lifetime of a slow mobile download. Node's docs themselves have long recommended not exposing Node directly for TLS/static/buffering duties in high-traffic deployments.

The generalized senior claim: **service meshes (Envoy sidecars), API gateways, database poolers (PgBouncer), and CDN edges are all proxies** — same subject interface, access control + caching + observability layered in front, subject lifecycle sometimes managed (health-check-based upstream ejection is the proxy deciding the subject is unusable). Recognizing one pattern from a 20-line class to a global CDN is exactly the "structural thinking" this module is testing.

One consequence worth volunteering: once a proxy fronts your app, *your app's view of the client is mediated* — `req.socket.remoteAddress` is now nginx's IP, protocol is HTTP even if the client used HTTPS. Hence `X-Forwarded-For`/`X-Forwarded-Proto` and Express's `app.set('trust proxy', 1)`. Misconfiguring that either breaks rate-limiting-by-IP (everyone shares nginx's IP) or lets clients spoof their IP by sending the header directly — a real security bug class.

**Interview trap:** "Is a load balancer a proxy or something else?" It's still a proxy — one that maps a single subject interface onto *many* interchangeable subjects. The client-facing contract is unchanged; the proxy just adds a selection policy. If the interviewer pushes, contrast with DNS round-robin, which is *not* a proxy: the client connects to the subject directly, so no per-request access control or caching is possible.

---

### Q12. Nail the proxy vs decorator distinction once and for all — give the decision test you'd use in a code review.

**Answer:**

Both wrap a component behind the same interface, so structure won't tell them apart. Use three questions:

1. **Who constructs the subject?** Decorators receive their component from outside (composition root stacks them freely). Proxies often construct, lazily create, or select their subject themselves — the client may never hold a reference to the real object. `LazyReportServiceProxy` (Q9) instantiates its own subject; `LoggingUserRepository` (Q4) never would.

2. **Can the wrapper legitimately not call through?** A proxy's *job* includes refusal: deny (protection), short-circuit (cache hit), defer (virtual). A decorator that skipped delegation would be broken — its contract is "same behavior, plus extra." Auth middleware that returns 401 without calling `next()` is proxy-flavored; timing middleware that always calls through is decorator-flavored.

3. **What's the intent noun?** Decorator: *enrichment* (logging, metrics, compression, retries). Proxy: *access control* (visibility, lifecycle, locality — including remote proxies, where the subject lives in another process and the proxy marshals calls; every gRPC client stub is a remote proxy).

```typescript
interface Mailer {
  send(to: string, body: string): Promise<void>;
}

// DECORATOR: enriches, always delegates, component injected
class RetryingMailer implements Mailer {
  constructor(private readonly inner: Mailer, private readonly attempts: number) {}
  async send(to: string, body: string): Promise<void> {
    let lastErr: unknown;
    for (let i = 0; i < this.attempts; i++) {
      try {
        await this.inner.send(to, body);
        return;
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr;
  }
}

// PROXY: controls access, may refuse, owns subject lifecycle
class SandboxMailerProxy implements Mailer {
  private real: Mailer | null = null;
  constructor(private readonly makeReal: () => Mailer, private readonly allowlist: ReadonlySet<string>) {}
  async send(to: string, body: string): Promise<void> {
    if (!this.allowlist.has(to)) return; // staging: silently drop non-allowlisted mail
    this.real = this.real ?? this.makeReal();
    return this.real.send(to, body);
  }
}
```

Why the naming even matters in review: it sets reader expectations. Seeing `XxxProxy`, a maintainer expects calls may not reach the subject and won't be surprised by a dropped email in staging. Seeing `XxxDecorator`/`RetryingXxx`, they assume behavior-preserving passthrough — a decorator that silently drops calls is a bug waiting for a 3 a.m. page. Patterns are compression for communication; misnaming decompresses to wrong assumptions.

---

### Q13. Implement Composite for a file-system model with a uniform `getSize()`. Then show where the "uniform interface" starts lying.

**Answer:**

Composite solves: *clients need to treat individual objects (leaves) and groups of objects (composites) identically.* One interface; composites hold children of that same interface; operations recurse structurally.

```typescript
interface FsNode {
  readonly name: string;
  getSize(): number;
  find(predicate: (n: FsNode) => boolean): FsNode[];
}

class FileLeaf implements FsNode {
  constructor(public readonly name: string, private readonly bytes: number) {}

  getSize(): number {
    return this.bytes;
  }

  find(predicate: (n: FsNode) => boolean): FsNode[] {
    return predicate(this) ? [this] : [];
  }
}

class DirectoryComposite implements FsNode {
  private readonly children: FsNode[] = [];

  constructor(public readonly name: string) {}

  add(child: FsNode): this {
    this.children.push(child);
    return this;
  }

  remove(name: string): boolean {
    const i = this.children.findIndex((c) => c.name === name);
    if (i === -1) return false;
    this.children.splice(i, 1);
    return true;
  }

  getSize(): number {
    return this.children.reduce((sum, c) => sum + c.getSize(), 0); // structural recursion
  }

  find(predicate: (n: FsNode) => boolean): FsNode[] {
    const own = predicate(this) ? [this as FsNode] : [];
    return own.concat(this.children.flatMap((c) => c.find(predicate)));
  }
}

const root = new DirectoryComposite("root")
  .add(new FileLeaf("readme.md", 1_200))
  .add(
    new DirectoryComposite("src")
      .add(new FileLeaf("index.ts", 4_400))
      .add(new FileLeaf("app.ts", 9_100))
  );

const total = root.getSize();              // 14700 — caller never asks "file or dir?"
const bigFiles = root.find((n) => n.getSize() > 4_000);
void total; void bigFiles;
```

The payoff is in the client code: `getSize()` on *anything*, no `instanceof`, no visitor sprawl for the simple cases. An org chart (`Employee` leaf, `Manager` composite summing `getHeadcount()`/`getTotalComp()`) is the same shape.

**Where the uniformity lies.** GoF offers two designs and both cost something:

- **Transparent composite:** put `add`/`remove` on the shared `FsNode` interface so leaves and composites are *fully* interchangeable. But then `file.add(child)` must do *something* — GoF suggests throwing. That is a textbook **LSP violation**: code written against `FsNode` that calls `add()` works for some subtypes and explodes for others. The type system promised a capability the runtime revokes.
- **Safe composite** (what I wrote above): `add`/`remove` live only on `DirectoryComposite`. LSP is preserved — but now mutation code needs to *know* it holds a composite (a type guard or an `instanceof`), which chips at the "treat uniformly" promise.

The senior resolution: uniformity should cover the operations that are *genuinely uniform* (traversal, aggregation, rendering) and nothing more. Structure mutation is not uniform — leaves really can't have children — so it belongs on the composite type only, and callers doing mutation legitimately know they're holding a container. Choosing "safe" and saying why (fail at compile time, not at runtime in production) is the expected answer; choosing "transparent" is defensible only when the client code overwhelmingly mutates through the base type, which is rare.

**Interview trap:** "getSize() recursing on every call is fine, right?" On a deep tree called in a hot path, that's O(subtree) per call. Real systems cache aggregates on the composite and invalidate on `add`/`remove` — at which point you've signed up for cache-invalidation correctness. Mentioning the tradeoff (recompute vs cached-with-invalidation, and parent back-references that cached invalidation requires) shows you've operated one of these, not just drawn it.

---

### Q14. Where does Composite already exist in systems you use daily, and when is a tree interface the wrong call?

**Answer:**

- **The DOM.** `Node` is the component; elements are composites (`appendChild`, `childNodes`), text nodes are leaves. `element.textContent` is exactly composite aggregation — recursive descent concatenating leaf text. Every rendering engine and every virtual-DOM diff walks a composite. React element trees are the same structure as data: a component's children array holds elements and text leaves behind one shape.
- **NestJS module graph.** `@Module({ imports: [...] })` composes modules of modules; bootstrap walks the tree resolving providers, and operations like "initialize" and "close" (`onModuleInit`, `onModuleDestroy`) propagate through it structurally. (Pedantically it's a DAG — shared imports mean a module can have multiple parents — which is itself a good interview point: composite *pattern*, graph *shape*, and cycle handling via `forwardRef` is where the abstraction shows its seams.)
- **ASTs.** Everything in the TS/Babel/ESLint toolchain is composite traversal: a `BinaryExpression` node contains child expression nodes, a leaf `Identifier` contains none, and codegen/printing is `getSize()`-style recursion producing strings instead of numbers. ESLint rules and Babel plugins are visitors over a composite.
- Also: directory trees in `fs` tooling (recursive delete/copy/size in tools like `rimraf`), and GraphQL selection sets resolving field trees.

**When NOT to use Composite:**

1. **The hierarchy is flat and will stay flat.** A list of plugins each getting `run()` called needs an array and a loop, not a tree protocol. Composite earns its keep only when nesting is real and unbounded.
2. **Operations differ radically by node type.** If every "uniform" method is a switch on the node's kind internally, you don't have uniform operations — you have a discriminated union wearing a costume. In TypeScript, `type FsNode = File | Directory` with exhaustive `switch` on a `kind` field plus pattern-per-function is often *better*: the compiler checks exhaustiveness, and adding a new operation doesn't touch every class (the classic expression problem — composite optimizes for adding node types; unions/visitors optimize for adding operations).
3. **You need relational queries across the structure** ("all files > 1MB modified this week, grouped by owner"). Trees answer path-shaped questions; put the data in a real store and index it instead of writing tree-walk query methods forever.

```typescript
// The discriminated-union alternative — often superior in TS for fixed node kinds
type FsEntry =
  | { kind: "file"; name: string; bytes: number }
  | { kind: "dir"; name: string; children: FsEntry[] };

function sizeOf(e: FsEntry): number {
  switch (e.kind) {
    case "file":
      return e.bytes;
    case "dir":
      return e.children.reduce((s, c) => s + sizeOf(c), 0);
  }
}
```

**Interview trap:** "Composite means I should model my whole domain as trees." Parent-child back-references, ordering guarantees, and shared-subtree aliasing (is it a tree or a DAG?) are each real complexity. If two parents can share a child, `getSize()` double-counts — the NestJS module graph avoids this by resolving providers per-module-token, not by naive summation. Ask "tree or DAG?" before writing the recursion.

---

### Q15. Bridge: you have `Notification` types (alert, digest, weekly report) and delivery `Channel`s (email, SMS, Slack). Show the class explosion and the Bridge fix.

**Answer:**

Naive inheritance multiplies the hierarchies: `EmailAlert`, `SmsAlert`, `SlackAlert`, `EmailDigest`, `SmsDigest`, `SlackDigest`, `EmailReport`... 3 notification kinds × 3 channels = 9 classes, and adding WhatsApp means +3 more. Two *independent dimensions of variation* are trapped in one inheritance tree.

Bridge splits them: an **abstraction hierarchy** (what a notification *is*: how it's composed, prioritized, batched) holds a reference to an **implementation hierarchy** (how bytes reach a human). Each side varies independently; n + m classes instead of n × m.

```typescript
// ---- Implementor hierarchy: the "how it's delivered" dimension ----
interface Channel {
  deliver(recipient: string, subject: string, body: string): Promise<void>;
  readonly maxBodyLength: number;
}

class EmailChannel implements Channel {
  readonly maxBodyLength = 100_000;
  async deliver(recipient: string, subject: string, body: string): Promise<void> {
    console.log(`SMTP -> ${recipient}: [${subject}] ${body.length} chars`);
  }
}

class SmsChannel implements Channel {
  readonly maxBodyLength = 160;
  async deliver(recipient: string, subject: string, body: string): Promise<void> {
    console.log(`SMS -> ${recipient}: ${subject}: ${body}`.slice(0, 160));
  }
}

class SlackChannel implements Channel {
  readonly maxBodyLength = 40_000;
  async deliver(recipient: string, subject: string, body: string): Promise<void> {
    console.log(`Slack -> ${recipient}: *${subject}*\n${body}`);
  }
}

// ---- Abstraction hierarchy: the "what kind of notification" dimension ----
abstract class Notification {
  constructor(protected readonly channel: Channel) {} // THE bridge: composition across hierarchies

  protected fit(body: string): string {
    return body.length <= this.channel.maxBodyLength
      ? body
      : body.slice(0, this.channel.maxBodyLength - 3) + "...";
  }

  abstract send(recipient: string): Promise<void>;
}

class AlertNotification extends Notification {
  constructor(channel: Channel, private readonly incident: string) {
    super(channel);
  }
  async send(recipient: string): Promise<void> {
    await this.channel.deliver(recipient, "INCIDENT", this.fit(`Firing: ${this.incident}`));
  }
}

class DigestNotification extends Notification {
  private readonly items: string[] = [];
  constructor(channel: Channel) {
    super(channel);
  }
  addItem(item: string): void {
    this.items.push(item);
  }
  async send(recipient: string): Promise<void> {
    if (this.items.length === 0) return; // digests skip empty sends — abstraction-side policy
    await this.channel.deliver(recipient, `Digest (${this.items.length})`, this.fit(this.items.join("\n")));
  }
}

class ReportNotification extends Notification {
  constructor(channel: Channel, private readonly metrics: Record<string, number>) {
    super(channel);
  }
  async send(recipient: string): Promise<void> {
    const body = Object.entries(this.metrics)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    await this.channel.deliver(recipient, "Weekly Report", this.fit(body));
  }
}

// Any pairing, chosen at runtime — 6 classes cover all 9 combinations
const critical = new AlertNotification(new SmsChannel(), "db primary down");
const weekly = new ReportNotification(new EmailChannel(), { signups: 412, churn: 3 });
await critical.send("+15551234567");
await weekly.send("cto@example.com");
```

Note where policy lives: message-fitting and empty-digest suppression are abstraction-side; transport limits and formatting quirks are implementor-side. When a requirement arrives, you should be able to say *which side* it lands on in one sentence — that's the test that your two hierarchies are actually independent dimensions.

**Interview trap:** "Isn't Bridge just Strategy?" Structurally close (both compose an interface), but Strategy swaps *one algorithm inside one class*; Bridge separates *two whole class hierarchies* that each grow independently. If the abstraction side is a single class that never subclasses, congratulations — it collapsed into Strategy/DI, and you should say so rather than defend the extra layer. Bridge is Strategy that earned a second hierarchy.

---

### Q16. Where does Bridge show up in real database tooling, and when is it over-engineering?

**Answer:**

**Database drivers × query API layers** is the canonical production Bridge:

- *Implementation hierarchy:* wire-protocol drivers — `pg`, `mysql2`, `better-sqlite3`, `tedious`. Each knows sockets, auth handshakes, parameter binding, type marshaling for one engine.
- *Abstraction hierarchy:* the query layers above — Knex's query builder, Objection's ORM on top of Knex, Kysely's typed builder. Each abstraction (raw SQL tagged templates → builder → full ORM) can pair with each driver.

Knex is explicitly this shape: the `QueryBuilder`/`SchemaBuilder` classes (abstraction, refined by ORMs built on Knex) hold a `Client` (implementor, refined per dialect wrapping per driver). New database = new client class, zero changes above; new abstraction (Objection appearing on top of Knex) = zero changes below. The two hierarchies demonstrably evolved independently for a decade — that's Bridge validated by history rather than by a diagram.

Other sightings: **ODBC/JDBC** (the original industrial bridge — application-facing API refined by tools, driver SPI refined per vendor); Node's **streams** (`Readable`, the abstraction with variants, over pluggable `_read` implementations); logging facades where `Logger` variants (child loggers, redacting loggers) ride over transport implementors (console, file, HTTP shipper) — pino's transports are exactly the implementor side.

**When Bridge is over-engineering:**

1. **One dimension isn't actually a hierarchy.** If you'll only ever have `EmailChannel`, the "channel hierarchy" is one class; plain constructor injection (Strategy) suffices. Bridge pays for itself only when *both* sides have ≥2 members or a credible roadmap to them.
2. **The dimensions aren't independent.** If every new notification type needs channel-specific code (`AlertNotification` needs Slack blocks, SMS shortcodes, email HTML), variation points crosscut and the bridge interface bloats into a god interface with per-pair methods. Symptom: `Channel` grows `deliverSlackBlocks()`. At that point, per-pair renderers (a table of `(kind, channel) → template`) is more honest than pretending the dimensions are orthogonal.
3. **You bridged speculatively.** An interface with a single implementor, created "in case we add MySQL someday," is dead weight: every reader pays indirection cost daily for optionality that may never be exercised. Adding a bridge *when the second implementor arrives* is a mechanical refactor in TypeScript — you don't need to pre-pay.

Rule of thumb to state: **count your axes of change.** One axis → Strategy. Two independent axes, both plural → Bridge. Two entangled axes → neither; you need a design conversation, not a pattern.

**Interview trap:** "Bridge vs Adapter — both split interface from implementation?" Direction of intent: Adapter is *retrofitted* to make an existing, incompatible thing fit (after the fact, you don't control the adaptee). Bridge is *designed up front* so two hierarchies you own can vary independently. Adapter heals; Bridge prevents.

---

### Q17. Implement Flyweight properly: intrinsic vs extrinsic state, a flyweight factory, and the memory math that justifies it.

**Answer:**

Flyweight applies when you have *huge numbers of similar objects* whose state divides cleanly:

- **Intrinsic state:** shared, immutable, context-independent — safe to store once and reference everywhere.
- **Extrinsic state:** unique per occurrence — kept outside the flyweight and passed in at call time.

Canonical example: map markers. 100,000 markers, but only ~10 distinct marker *styles* (icon bitmap reference, size, color, anchor). Style is intrinsic; position and label are extrinsic.

```typescript
// Intrinsic state: immutable, shared. Note Readonly + no setters — sharing REQUIRES immutability.
interface MarkerStyleProps {
  readonly iconUrl: string;
  readonly width: number;
  readonly height: number;
  readonly tintColor: string;
}

class MarkerStyle {
  constructor(private readonly props: MarkerStyleProps) {}

  // Operations receive extrinsic state as parameters
  render(lat: number, lng: number, label: string): string {
    return `draw ${this.props.iconUrl} (${this.props.width}x${this.props.height}, ${this.props.tintColor}) at ${lat},${lng} "${label}"`;
  }
}

// Flyweight factory: canonicalizes — same intrinsic state => same instance
class MarkerStyleFactory {
  private readonly pool = new Map<string, MarkerStyle>();

  get(props: MarkerStyleProps): MarkerStyle {
    const key = `${props.iconUrl}|${props.width}|${props.height}|${props.tintColor}`;
    let style = this.pool.get(key);
    if (!style) {
      style = new MarkerStyle(props);
      this.pool.set(key, style);
    }
    return style;
  }

  get size(): number {
    return this.pool.size;
  }
}

// Context objects: tiny — extrinsic state + a shared reference
interface Marker {
  lat: number;
  lng: number;
  label: string;
  style: MarkerStyle; // reference, not copy
}

const factory = new MarkerStyleFactory();
const restaurantStyle = factory.get({ iconUrl: "/icons/food.png", width: 32, height: 32, tintColor: "#c0392b" });
const atmStyle = factory.get({ iconUrl: "/icons/atm.png", width: 24, height: 24, tintColor: "#2c3e50" });

const markers: Marker[] = [];
for (let i = 0; i < 100_000; i++) {
  markers.push({
    lat: 37 + Math.random(),
    lng: -122 + Math.random(),
    label: `poi-${i}`,
    style: i % 3 === 0 ? atmStyle : restaurantStyle, // shared instances
  });
}

console.log(factory.size); // 2 style objects for 100,000 markers
console.log(markers[0].style.render(markers[0].lat, markers[0].lng, markers[0].label));
```

The memory math (do it out loud — this is what separates "knows the diagram" from "would use it"): if each marker embedded its own style object — say ~200 bytes for the style fields plus object header and shape metadata — 100k markers carry ~20MB of duplicated style. With flyweights: 2 style objects + one 8-byte pointer per marker ≈ 0.8MB of references. Beyond raw bytes: fewer allocations → less young-gen GC pressure (V8's scavenger cost scales with *live* objects it copies), and identical shapes keep property access monomorphic.

Two non-negotiable rules:

1. **Flyweights must be immutable.** One mutation through a shared reference changes 100k markers at once — the bug is spectacular and non-local. `Readonly` props and no setters are the pattern's load-bearing walls.
2. **The factory must canonicalize on a value key**, not object identity — otherwise callers accidentally mint duplicates and you've kept the complexity while losing the sharing.

**Interview trap:** "Why not just `Object.freeze` one shared config object and skip the 'pattern'?" For a *single* shared object, correct — that's just a constant. Flyweight is specifically the *factory + canonicalization + intrinsic/extrinsic split* machinery for when the set of shared values is dynamic and discovered at runtime (styles arriving from an API, glyphs from a document). If the shared set is static and small, a module-level frozen constant is the whole pattern with zero ceremony.

---

### Q18. Where do V8 and Node already do Flyweight for you — and when is applying it yourself premature?

**Answer:**

**V8 interned strings.** String literals and identifier-like strings are *internalized*: one canonical copy in the heap, referenced everywhere. Two occurrences of `"pending"` across your codebase share storage, and comparing internalized strings is a pointer comparison before any character scan. Related machinery in the same spirit: V8 hidden classes (Maps) are shared flyweights of object *shape* — a million `{x, y}` points share one shape descriptor holding property names/offsets, so the objects themselves store only values. That's textbook intrinsic (shape) vs extrinsic (values) separation, applied by the VM to every object you create.

**Node Buffer pooling.** `Buffer.allocUnsafe(n)` for `n < Buffer.poolSize >>> 1` (poolSize defaults to 8KB, so allocations under 4KB) doesn't malloc per call — it *slices views out of a shared pre-allocated slab*, bumping an offset until the slab fills, then allocating a fresh slab. Thousands of small buffers share a handful of backing allocations. It's flyweight-adjacent (shared backing store, per-buffer extrinsic offset/length), and it has the classic flyweight sharp edge: **a 10-byte slice can retain a full slab** (or for `slice()` of a big buffer, the entire parent allocation) from being freed, because the view holds the backing store alive. The known production leak: reading many large payloads, slicing tiny headers out, keeping the slices in a long-lived Map — heap usage is N × parent-size, not N × 10 bytes. Fix: `Buffer.from(slice)` to copy out of the shared store when retention outlives the parent. Same sharp edge existed in pre-2013 JS `substring` (retained parent string) — sharing memory means sharing lifetime.

Also in the family: `Symbol.for()` (global symbol registry = flyweight factory), and string constants in `JSON.parse` reusing internalized keys across parsed objects.

**When applying Flyweight yourself is premature:**

1. **You haven't measured.** Flyweight is a *memory* optimization; without a heap snapshot showing duplicated-object dominance, you're adding a factory, a canonical-key function, immutability discipline, and non-obvious aliasing semantics to solve a problem you assumed. Take the snapshot first — Chrome DevTools' "Objects retained by duplicates" view answers it in minutes.
2. **Object count is small.** 500 config objects sharing 3 shapes saves kilobytes. The pattern's constant costs (indirection, key hashing, factory lookup on every acquisition) need six-figure object counts to amortize.
3. **The state doesn't split cleanly.** If "intrinsic" state occasionally needs per-instance mutation, you'll either copy-on-write (complexity) or mutate shared state (catastrophe). Flyweight requires a *real* immutable core, not a mostly-immutable one.
4. **You're in a short-lived process.** A Lambda handling one request and exiting gets nothing from sharing; V8's GC never even runs meaningfully.

The senior framing: in JS, your first flyweight moves are usually *free* — use string literals (interned), keep object shapes uniform (shared hidden classes), reuse frozen constants. Hand-rolled flyweight factories are the last resort after profiling, not a default architecture.

**Interview trap:** "Flyweight objects are shared, so they're a concurrency hazard in Node, right?" In single-threaded JS, shared *immutable* flyweights are perfectly safe — no data races without parallelism. The hazard arrives with `worker_threads` + `SharedArrayBuffer` (true shared memory needs `Atomics`), or with *mutable* flyweights even single-threaded (logical corruption, not races). Distinguishing "shared" from "shared mutable" precisely is the point being probed.

---

### Q19. Adapter vs Facade vs Proxy vs Decorator — one table, then one-sentence rules of thumb. This is the question you WILL get.

**Answer:**

All four are wrappers; they differ in **intent**, **interface relationship**, and **cardinality**:

| | Adapter | Facade | Proxy | Decorator |
|---|---|---|---|---|
| **Intent** | Make an incompatible interface fit an expected one | Simplify a complex subsystem behind one entry point | Control access to a subject | Add behavior without changing the interface |
| **Interface vs wrapped thing** | *Different* — that's the whole point | *New, simpler* — invented for convenience | *Same* as subject | *Same* as component |
| **Wraps how many?** | Usually one adaptee | Many collaborating subsystems | One subject | One component (but stacks) |
| **Who creates the wrapped object?** | Either | Facade often composes/injects them | Proxy often owns/creates lazily | Injected — composed at runtime |
| **May refuse to delegate?** | No (translates faithfully) | Orchestrates as needed | Yes — deny/defer/short-circuit is its job | No — enrich then delegate |
| **Client knows it's wrapped?** | Yes (client chose the target interface) | Yes (client wants the simple API) | No — transparency is the contract | No — transparency is the contract |
| **Node ecosystem anchor** | `util.promisify`, Knex dialects, Nest platform adapters | Mongoose over MongoDB driver, `fetch` over undici | nginx/reverse proxies, Mongoose docs (ES Proxy), gRPC stubs | Express middleware, Nest interceptors |

Rules of thumb — one sentence each, in the interviewer's language:

- **Adapter:** "I have the wrong interface" — convert what exists into what's expected.
- **Facade:** "I have too many interfaces" — collapse a subsystem into one intention-revealing call.
- **Proxy:** "I need a gatekeeper" — same interface, but access is controlled (denied, deferred, cached, remoted).
- **Decorator:** "I need more behavior" — same interface, enriched, and stackable in any order.

Fast disambiguation questions when reviewing real code:

1. Does the wrapper's interface *differ* from the wrapped thing's? → Adapter (if converting to a required target) or Facade (if simplifying many things).
2. Same interface — can it *legitimately not call through*, or does it own the subject's lifecycle? → Proxy.
3. Same interface, always delegates, injected component, order-sensitive stacking? → Decorator.

And the meta-answer that lands well at senior level: these four are *one mechanical idea* — object wrapping — differentiated purely by intent. That's exactly why naming matters: the class diagram cannot tell your teammates whether the wrapper may drop calls (proxy) or must be transparent (decorator), so the pattern name in the class name is documentation the compiler can't provide. Choose the name by intent, and if you can't state the intent in one sentence, you don't need the wrapper yet.

**Interview trap:** "Which pattern is Express middleware / is Mongoose / is promisify?" — the interviewer names one artifact and wants one pattern. Resist the single-label bait when it's genuinely hybrid: middleware is decorator with chain-of-responsibility termination semantics (Q5); Mongoose is a facade whose documents are proxies; `promisify` is a pure adapter. Precision about *which aspect* exhibits *which pattern* beats forcing one label onto a system that composes several.
