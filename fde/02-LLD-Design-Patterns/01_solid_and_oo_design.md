# Lesson 2.1 — SOLID & Object-Oriented Design — The Foundation of Every LLD Round

> Module: LLD & Design Patterns | Level: Senior | FDE Prep Phase 2

Seniors are not tested on reciting "S stands for Single Responsibility." They're tested on *recognizing a violation in code they've never seen, articulating what breaks in production six months later, and refactoring live without over-engineering.* Every LLD round — parking lot, rate limiter, notification service — is secretly a SOLID round: the interviewer is watching whether you define contracts before implementations, whether your abstractions leak, and whether you can defend a tradeoff instead of cargo-culting a principle. This lesson covers each principle with violation-first examples, the composition/inheritance decision, DI from first principles (including a working container), coupling metrics, and the meta-skill: how to actually run a 45–60 minute LLD interview.

---

### Q1. What is the Single Responsibility Principle, really? "One class, one job" gets you dinged — give the precise definition and a realistic violation.

**Answer:**

The precise definition (Robert Martin's): **a module should have exactly one reason to change**, where "reason to change" means **one actor/stakeholder** whose requirements drive changes to it. It is about *change axes*, not "does one thing." A class doing five steps of one cohesive workflow can be fine; a class doing two things that change for two different departments is not.

Violation — a report generator that mixes three actors' concerns (finance defines calculations, design defines formatting, ops defines delivery):

```typescript
class MonthlyRevenueReport {
  constructor(private readonly orders: Array<{ amountCents: number; refunded: boolean }>) {}

  generateAndSend(recipientEmail: string): void {
    // Reason to change #1: finance changes how revenue is computed
    const total = this.orders
      .filter((o) => !o.refunded)
      .reduce((sum, o) => sum + o.amountCents, 0);

    // Reason to change #2: design changes the format (HTML? PDF? CSV?)
    const html = `<h1>Monthly Revenue</h1><p>Total: $${(total / 100).toFixed(2)}</p>`;

    // Reason to change #3: ops changes delivery (SMTP -> SES -> Slack)
    const smtp = new SmtpClient("smtp.internal:587");
    smtp.send(recipientEmail, "Monthly Revenue", html);
  }
}

class SmtpClient {
  constructor(private readonly host: string) {}
  send(to: string, subject: string, body: string): void {
    console.log(`SMTP ${this.host} -> ${to}: ${subject} (${body.length} bytes)`);
  }
}
```

Refactor — one class per change axis, composed at the edge:

```typescript
interface RevenueSource {
  totalRevenueCents(): number;
}

class OrderRevenueCalculator implements RevenueSource {
  constructor(private readonly orders: Array<{ amountCents: number; refunded: boolean }>) {}
  totalRevenueCents(): number {
    return this.orders.filter((o) => !o.refunded).reduce((s, o) => s + o.amountCents, 0);
  }
}

interface ReportRenderer {
  render(totalCents: number): string;
}

class HtmlReportRenderer implements ReportRenderer {
  render(totalCents: number): string {
    return `<h1>Monthly Revenue</h1><p>Total: $${(totalCents / 100).toFixed(2)}</p>`;
  }
}

interface ReportSender {
  send(recipient: string, subject: string, body: string): Promise<void>;
}

class EmailReportSender implements ReportSender {
  constructor(private readonly smtpHost: string) {}
  async send(recipient: string, subject: string, body: string): Promise<void> {
    console.log(`SMTP ${this.smtpHost} -> ${recipient}: ${subject} (${body.length} bytes)`);
  }
}

class ReportService {
  constructor(
    private readonly source: RevenueSource,
    private readonly renderer: ReportRenderer,
    private readonly sender: ReportSender
  ) {}

  async publish(recipient: string): Promise<void> {
    const total = this.source.totalRevenueCents();
    await this.sender.send(recipient, "Monthly Revenue", this.renderer.render(total));
  }
}
```

Production consequence of the violation: finance asks for a calculation tweak, and your diff touches the class that also holds SMTP credentials handling — now the email path needs re-testing and the deploy risk surface triples. SRP is a *blast-radius* argument, not aesthetics.

**Interview trap:** Splitting *every* class into micro-classes "because SRP." If two behaviors always change together, for the same actor, they belong together. Over-decomposition is a distinct smell (shotgun surgery, see Q13) and interviewers probe for it: "Why did you split this?" — the answer must name two different *actors*, not two different *verbs*.

---

### Q2. Open/Closed Principle — show a violation with a payment processor and the refactor. Where's the line between OCP and speculative generality?

**Answer:**

OCP: software entities should be **open for extension, closed for modification** — adding a new behavior variant should mean *adding code*, not editing tested code. The classic tell is a `switch`/`if-else` over a type tag that grows with every feature.

Violation:

```typescript
type PaymentMethod = "card" | "upi" | "paypal";

class PaymentProcessor {
  async charge(method: PaymentMethod, amountCents: number): Promise<string> {
    if (method === "card") {
      return `stripe_charge_${amountCents}`;
    } else if (method === "upi") {
      return `razorpay_upi_${amountCents}`;
    } else if (method === "paypal") {
      return `paypal_order_${amountCents}`;
    }
    throw new Error(`Unsupported method: ${method}`);
  }
}
```

Every new method (Apple Pay, crypto, wallet credit) edits `PaymentProcessor` — the one class every payment flows through, i.e., the highest-risk file in the codebase. Refactor to a strategy registry:

```typescript
interface PaymentGateway {
  readonly method: string;
  charge(amountCents: number): Promise<string>;
}

class StripeCardGateway implements PaymentGateway {
  readonly method = "card";
  async charge(amountCents: number): Promise<string> {
    return `stripe_charge_${amountCents}`;
  }
}

class RazorpayUpiGateway implements PaymentGateway {
  readonly method = "upi";
  async charge(amountCents: number): Promise<string> {
    return `razorpay_upi_${amountCents}`;
  }
}

class PaymentProcessor {
  private readonly gateways = new Map<string, PaymentGateway>();

  register(gateway: PaymentGateway): void {
    this.gateways.set(gateway.method, gateway);
  }

  async charge(method: string, amountCents: number): Promise<string> {
    const gateway = this.gateways.get(method);
    if (!gateway) throw new Error(`Unsupported method: ${method}`);
    return gateway.charge(amountCents);
  }
}
```

Adding Apple Pay is now a new file plus one `register()` call — the core processor never changes, its tests never re-run for reasons unrelated to it.

The line vs. speculative generality: you apply OCP **along axes that have already varied or are known to vary** (payment methods vary — that's the business model). You do *not* pre-abstract axes with a single implementation and no roadmap ("what if we swap Postgres for a graph DB?"). The senior formulation: *first change eats the cost, second change proves the axis, then you abstract.*

**Interview trap:** Claiming OCP means "never modify code." It means the *stable core* shouldn't change for each variant. You still modify code for bug fixes and for genuinely new requirements that don't fit the existing abstraction — pretending otherwise leads to adapter-on-adapter towers.

---

### Q3. Liskov Substitution Principle: start with Rectangle/Square, then give a violation that actually appears in production code.

**Answer:**

LSP: if `S` is a subtype of `T`, then objects of type `T` may be replaced with objects of type `S` **without altering the correctness of the program**. It's about *behavioral* subtyping, not just matching signatures.

The classic — mathematically a square *is* a rectangle, but behaviorally it isn't, because `Rectangle`'s implied contract is "setting width doesn't change height":

```typescript
class Rectangle {
  constructor(protected width: number, protected height: number) {}
  setWidth(w: number): void { this.width = w; }
  setHeight(h: number): void { this.height = h; }
  area(): number { return this.width * this.height; }
}

class Square extends Rectangle {
  setWidth(w: number): void { this.width = w; this.height = w; }
  setHeight(h: number): void { this.width = h; this.height = h; }
}

function stretch(r: Rectangle): number {
  r.setWidth(5);
  r.setHeight(4);
  return r.area(); // caller expects 20; Square returns 16 — LSP broken
}
```

The production version you'll actually see — a read-only repository subclass that throws on write:

```typescript
interface User { id: string; email: string; }

class UserRepository {
  protected store = new Map<string, User>();
  async findById(id: string): Promise<User | undefined> { return this.store.get(id); }
  async save(user: User): Promise<void> { this.store.set(user.id, user); }
}

class ReadOnlyUserRepository extends UserRepository {
  async save(_user: User): Promise<void> {
    throw new Error("Read-only replica: writes not permitted");
  }
}

async function deactivateUser(repo: UserRepository, id: string): Promise<void> {
  const user = await repo.findById(id);
  if (user) await repo.save({ ...user, email: `deactivated+${user.email}` });
}
```

`deactivateUser` type-checks with either repo but explodes at runtime with the read-only one — typically discovered in production when someone wires the replica repo into a write path. TypeScript cannot catch this: the signatures match perfectly. The fix is to model capabilities as separate interfaces (this is also ISP, Q5):

```typescript
interface UserReader {
  findById(id: string): Promise<User | undefined>;
}
interface UserWriter {
  save(user: User): Promise<void>;
}

class ReplicaUserRepository implements UserReader {
  private store = new Map<string, User>();
  async findById(id: string): Promise<User | undefined> { return this.store.get(id); }
}
```

Now a write path *cannot compile* against the replica.

**Interview trap:** Saying "LSP is about method signatures matching." Signatures are the compiler's job. LSP violations are *semantic*: throwing where the base doesn't, returning empty where the base guarantees data, weakening invariants. `throw new NotImplementedError()` in an override is the canonical smell — it means the type hierarchy is lying.

---

### Q4. State the behavioral subtyping contract rules — preconditions, postconditions, invariants — with a concrete example of each direction being violated.

**Answer:**

For a subclass override to be substitutable:

1. **Preconditions cannot be strengthened.** The subclass may not demand *more* from callers than the base did.
2. **Postconditions cannot be weakened.** The subclass may not promise *less* to callers than the base did.
3. **Invariants must be preserved.** Whatever the base guarantees is always true of its state must remain true.
4. **The history constraint:** the subclass may not introduce state mutations the base forbids (an immutable base can't have a mutable subclass).

```typescript
class NotificationSender {
  // Contract: accepts any message up to 10_000 chars.
  // Postcondition: returns a non-empty delivery id.
  send(recipient: string, message: string): string {
    if (message.length > 10_000) throw new RangeError("message too long");
    return `delivery_${recipient}_${message.length}`;
  }
}

// VIOLATION 1 — strengthened precondition: callers who were fine before now break.
class SmsSender extends NotificationSender {
  send(recipient: string, message: string): string {
    if (message.length > 160) throw new RangeError("SMS limit is 160"); // stricter than base
    return `sms_${recipient}_${message.length}`;
  }
}

// VIOLATION 2 — weakened postcondition: base promised a delivery id, this may return "".
class BestEffortSender extends NotificationSender {
  send(recipient: string, message: string): string {
    if (Math.random() < 0.5) return ""; // "fire and forget" — callers relying on the id break
    return `delivery_${recipient}_${message.length}`;
  }
}
```

Both compile. Both pass any test written against their own class. Both break code written against `NotificationSender`. The correct design acknowledges that SMS has a genuinely different contract — so it's a different abstraction (a `Channel` with a `maxLength` capability the caller can query), not a subtype pretending to honor the base contract.

Note the symmetry: subclasses may **weaken preconditions** (accept more) and **strengthen postconditions** (promise more) freely — that's what "substitutable" means. TypeScript's method parameter *bivariance* (for method shorthand syntax) means the compiler won't even flag some parameter-type violations; contracts live in your head and your tests.

**Interview trap:** "We'll document that `SmsSender` only takes 160 chars." Documentation does not restore substitutability — the whole point of the base type is that callers *don't know* which subtype they hold. If callers must know, the hierarchy has failed and you're doing `instanceof` checks, which is the LSP death rattle.

---

### Q5. Interface Segregation Principle — show a fat interface in a persistence layer and split it into role interfaces. Why does this matter more in TypeScript than in nominally-typed languages?

**Answer:**

ISP: **no client should be forced to depend on methods it doesn't use.** The smell is a "fat" interface where every implementer stubs out half the methods, and every consumer's mock has to fake methods it never calls.

Violation:

```typescript
interface OrderStore {
  findById(id: string): Promise<Order | null>;
  findByCustomer(customerId: string): Promise<Order[]>;
  save(order: Order): Promise<void>;
  delete(id: string): Promise<void>;
  streamAll(): AsyncIterable<Order>;
  runMigrations(): Promise<void>;
  healthCheck(): Promise<boolean>;
}

interface Order { id: string; customerId: string; totalCents: number; }
```

The checkout service needs `findById` + `save`. The analytics exporter needs `streamAll`. The ops probe needs `healthCheck`. Yet all three depend on — and must mock — all seven methods, and an in-memory test double must implement `runMigrations()`. Split by *client role*:

```typescript
interface OrderReader {
  findById(id: string): Promise<Order | null>;
  findByCustomer(customerId: string): Promise<Order[]>;
}
interface OrderWriter {
  save(order: Order): Promise<void>;
  delete(id: string): Promise<void>;
}
interface OrderExporter {
  streamAll(): AsyncIterable<Order>;
}
interface HealthCheckable {
  healthCheck(): Promise<boolean>;
}

// One concrete class can still implement everything:
class PostgresOrderStore implements OrderReader, OrderWriter, OrderExporter, HealthCheckable {
  private rows = new Map<string, Order>();
  async findById(id: string): Promise<Order | null> { return this.rows.get(id) ?? null; }
  async findByCustomer(customerId: string): Promise<Order[]> {
    return [...this.rows.values()].filter((o) => o.customerId === customerId);
  }
  async save(order: Order): Promise<void> { this.rows.set(order.id, order); }
  async delete(id: string): Promise<void> { this.rows.delete(id); }
  async *streamAll(): AsyncIterable<Order> { yield* this.rows.values(); }
  async healthCheck(): Promise<boolean> { return true; }
}

// Consumers declare only the role they need:
class CheckoutService {
  constructor(private readonly orders: OrderReader & OrderWriter) {}
  async recordOrder(order: Order): Promise<void> {
    const existing = await this.orders.findById(order.id);
    if (!existing) await this.orders.save(order);
  }
}
```

Key move: the *implementation* stays whole; the *dependency declarations* narrow. `OrderReader & OrderWriter` intersection types make role composition free in TS.

Why it matters more in TypeScript: structural typing means a test double only needs the methods the consumer actually uses — but only if the consumer's declared dependency is narrow. Declare the fat interface and you've thrown away structural typing's main testing benefit. Narrow role interfaces also make privilege obvious in code review: a class taking `OrderReader` provably cannot delete orders.

**Interview trap:** Splitting interfaces by *implementation layer* ("PostgresOrderMethods") instead of by *client need*. ISP is consumer-driven: you discover the roles by looking at call sites, not by grouping methods that feel related. If nobody consumes `OrderExporter` separately, don't split it out yet.

---

### Q6. Dependency Inversion Principle — what exactly gets "inverted," and how does it map onto ports & adapters (hexagonal architecture)?

**Answer:**

DIP has two clauses: (1) high-level modules should not depend on low-level modules — both should depend on abstractions; (2) abstractions should not depend on details — details depend on abstractions.

What's inverted is the **direction of the source-code dependency arrow relative to the flow of control**. Flow of control at runtime goes `OrderService → PostgresOrderStore`. Without DIP, the source dependency goes the same way (`order-service.ts` imports `postgres-order-store.ts`). With DIP, the high-level module *owns the interface*, and the low-level module imports it — the arrow now points *up*:

```typescript
// domain/order-service.ts — HIGH LEVEL. Owns the port. Imports nothing from infra.
export interface Order { id: string; totalCents: number; }

export interface OrderPort {                       // the "port"
  save(order: Order): Promise<void>;
  findById(id: string): Promise<Order | null>;
}

export class OrderService {
  constructor(private readonly orders: OrderPort) {}
  async placeOrder(order: Order): Promise<void> {
    if (order.totalCents <= 0) throw new Error("invalid total");
    await this.orders.save(order);
  }
}
```

```typescript
// infra/postgres-order-adapter.ts — LOW LEVEL. Imports the domain's interface.
import { Order, OrderPort } from "../domain/order-service";

export class PostgresOrderAdapter implements OrderPort {   // the "adapter"
  private rows = new Map<string, Order>();
  async save(order: Order): Promise<void> { this.rows.set(order.id, order); }
  async findById(id: string): Promise<Order | null> { return this.rows.get(id) ?? null; }
}
```

```typescript
// main.ts — the composition root wires details to abstractions.
import { OrderService } from "./domain/order-service";
import { PostgresOrderAdapter } from "./infra/postgres-order-adapter";

const service = new OrderService(new PostgresOrderAdapter());
```

Ports & adapters is DIP applied architecturally: the domain core defines ports (interfaces) for everything it needs (persistence, clocks, message buses) and everything that drives it (HTTP handlers, queue consumers). Adapters on the outside implement/consume those ports. The payoff is concrete: domain tests run with in-memory adapters in milliseconds, infra can be swapped per environment, and `git log domain/` shows only business changes.

Critical detail interviewers probe: **who owns the interface?** If `OrderPort` lives in the infra package, you haven't inverted anything — the domain still imports infra. The abstraction belongs to the *consumer* (this is also why "one interface per class, defined next to the class" is cargo-cult DIP).

**Interview trap:** Equating DIP with dependency *injection*. DI is a technique for passing dependencies in; DIP is about which module owns the abstraction and which way the import arrows point. You can inject a concrete `PostgresOrderStore` via constructor and still violate DIP completely.

---

### Q7. Composition vs inheritance: why does composition win by default, and when is inheritance genuinely the right call?

**Answer:**

Composition wins by default because inheritance is the **strongest coupling relationship in OO**: the subclass depends on the parent's *implementation*, not just its interface — protected fields, method call order, self-call patterns. That coupling is invisible at the call site and breaks silently (see Q8, fragile base class).

Concrete comparison — adding retry behavior to a notifier:

```typescript
interface Notifier {
  notify(userId: string, message: string): Promise<void>;
}

class EmailNotifier implements Notifier {
  async notify(userId: string, message: string): Promise<void> {
    console.log(`email -> ${userId}: ${message}`);
  }
}

// Composition: a decorator. Works with ANY Notifier, stacks with other decorators.
class RetryingNotifier implements Notifier {
  constructor(private readonly inner: Notifier, private readonly attempts: number) {}
  async notify(userId: string, message: string): Promise<void> {
    let lastError: unknown;
    for (let i = 0; i < this.attempts; i++) {
      try {
        await this.inner.notify(userId, message);
        return;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  }
}

const notifier: Notifier = new RetryingNotifier(new EmailNotifier(), 3);
```

The inheritance version (`class RetryingEmailNotifier extends EmailNotifier`) hard-binds retry to email; you'd need `RetryingSmsNotifier`, `RetryingSlackNotifier`... — combinatorial explosion. Composition gives you N + M classes instead of N × M.

When inheritance is genuinely right — all three conditions should hold:

1. **True is-a with full LSP substitutability** — every instance of the subclass is usable anywhere the base is, forever, honoring the base's full contract.
2. **A stable, designed-for-extension base** — the base class explicitly documents its extension points (template methods, hooks) and rarely changes. You control it or it's a stable framework contract.
3. **Framework contracts that demand it** — `extends Error` for custom error classes (needed for `instanceof` checks and stack traces), `extends EventEmitter` / `extends Readable` in Node (streams are an inheritance-based protocol), NestJS `extends` for exception filters. Fighting the framework's inheritance protocol costs more than the coupling.

```typescript
// Legitimate inheritance: Node's own protocol requires it.
class PaymentDeclinedError extends Error {
  constructor(public readonly declineCode: string) {
    super(`Payment declined: ${declineCode}`);
    this.name = "PaymentDeclinedError";
  }
}
```

**Interview trap:** "Inheritance for code reuse." Reuse alone is never a justification — that's what composition, functions, and modules are for. If your `extends` exists so the child can call a helper method, extract the helper into a collaborator object. Interviewers deliberately seed problems (e.g., "AdminUser extends User") to see if you reach for `extends` when a `role` field or a policy object is correct.

---

### Q8. Explain the fragile base class problem with code where a parent refactor silently breaks a subclass.

**Answer:**

The fragile base class problem: a subclass depends on **unobservable implementation details** of the parent — specifically, which methods call which other methods (*self-call patterns*). A parent refactor that changes no signature and no observable behavior of the parent itself can break subclasses.

```typescript
// v1 of a base class
class InstrumentedList<T> {
  protected items: T[] = [];
  protected addCount = 0;

  add(item: T): void {
    this.addCount++;
    this.items.push(item);
  }

  addAll(items: T[]): void {
    for (const item of items) this.add(item); // v1: addAll delegates to add()
  }

  get count(): number {
    return this.addCount;
  }
}

// Subclass overrides add() to enforce a cap, assuming addAll() routes through it.
class CappedList<T> extends InstrumentedList<T> {
  constructor(private readonly cap: number) {
    super();
  }
  add(item: T): void {
    if (this.items.length >= this.cap) throw new Error("cap exceeded");
    super.add(item);
  }
}
```

Now the base class author "optimizes" — a change that is invisible from `InstrumentedList`'s own tests:

```typescript
// v2 — same public behavior for InstrumentedList, but addAll no longer self-calls add()
class InstrumentedListV2<T> {
  protected items: T[] = [];
  protected addCount = 0;

  add(item: T): void {
    this.addCount++;
    this.items.push(item);
  }

  addAll(items: T[]): void {
    this.addCount += items.length;
    this.items.push(...items); // bulk push — bypasses add()
  }

  get count(): number {
    return this.addCount;
  }
}
```

Every `CappedList` in the codebase now silently accepts unlimited items via `addAll` — no compile error, no test failure in the base library, a straight correctness bug in production. This is the exact bug pattern Joshua Bloch documents with `HashSet.addAll` in *Effective Java*, and why his rule is **"design and document for inheritance, or prohibit it."**

Mitigations, in order of preference: (1) composition — `CappedList` wraps a list and owns its own entry points; (2) if you must allow inheritance, document the self-use pattern as part of the contract ("addAll calls add once per element") and treat changing it as a breaking change; (3) seal classes not designed for extension — TS has no `final`, but you can throw in the constructor if `new.target !== ExpectedClass`, or simply not export the class.

**Interview trap:** "The subclass author was wrong to rely on internals." The subclass author had *no alternative* — overriding `add` is the advertised extension mechanism, and self-call structure is invisible in the type signature. The design is at fault, not the user. This is why "open for extension" via inheritance requires the base to freeze its self-call contract.

---

### Q9. How do mixins work in TypeScript, and where do they sit on the composition–inheritance spectrum?

**Answer:**

TS mixins are class factories: functions taking a base class and returning an extended class. They simulate multiple inheritance by stacking single-inheritance links at runtime.

```typescript
type Constructor<T = object> = new (...args: any[]) => T;

function WithTimestamps<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    createdAt = new Date();
    updatedAt = new Date();
    touch(): void {
      this.updatedAt = new Date();
    }
  };
}

function WithSoftDelete<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    deletedAt: Date | null = null;
    softDelete(): void {
      this.deletedAt = new Date();
    }
    get isDeleted(): boolean {
      return this.deletedAt !== null;
    }
  };
}

class BaseEntity {
  constructor(public readonly id: string) {}
}

class Document extends WithSoftDelete(WithTimestamps(BaseEntity)) {
  constructor(id: string, public title: string) {
    super(id);
  }
}

const doc = new Document("d1", "Q3 Plan");
doc.touch();
doc.softDelete();
console.log(doc.isDeleted, doc.updatedAt instanceof Date); // true true
```

On the spectrum, mixins are **inheritance wearing composition's clothes**: you get flat method access and shared `this` (inheritance traits — including its problems: name collisions resolve silently by stacking order, `WithSoftDelete(WithTimestamps(X))` vs the reverse can differ, and mixins can trample each other's fields), but you compose capabilities à la carte (composition trait). Diagnosing behavior means walking a synthetic prototype chain that no file in the repo declares — this is real: TypeORM and Sequelize plugins, and NestJS's `IntersectionType`/`PartialType` mapped-type helpers, all use this pattern, and debugging them means understanding it.

Rule of thumb: mixins are justified for **cross-cutting, state-carrying capabilities** applied to many otherwise-unrelated classes (timestamps, soft delete, event emission) where a decorator object would force every call site to change from `doc.touch()` to `doc.timestamps.touch()`. For behavior variation within one hierarchy, plain composition/strategy stays easier to trace.

**Interview trap:** Calling mixins "composition." Under the hood it's `extends` all the way down — fragile base class, `this`-coupling, and collision hazards included. If the interviewer asks "what breaks if two mixins both define `touch()`?" the answer is: the outermost silently wins, with no compiler error unless the signatures conflict.

---

### Q10. Compare constructor, property (setter), and method injection. Which do you default to and why?

**Answer:**

```typescript
interface Logger {
  info(msg: string): void;
}
interface Mailer {
  send(to: string, body: string): Promise<void>;
}

class ConsoleLogger implements Logger {
  info(msg: string): void { console.log(msg); }
}

// 1. Constructor injection — the default.
class SignupService {
  constructor(
    private readonly mailer: Mailer,
    private readonly logger: Logger
  ) {}
  async signUp(email: string): Promise<void> {
    this.logger.info(`signup: ${email}`);
    await this.mailer.send(email, "Welcome!");
  }
}

// 2. Property (setter) injection — mutable, optional deps.
class ReportJob {
  logger: Logger = new ConsoleLogger(); // must self-provide a default
  run(): void {
    this.logger.info("report done");
  }
}

// 3. Method injection — per-call dependencies.
class InvoiceCalculator {
  totalWithTax(amountCents: number, taxPolicy: (cents: number) => number): number {
    return amountCents + taxPolicy(amountCents);
  }
}
```

**Constructor injection** is the default because it gives you: (a) **invariant enforcement** — an instance cannot exist in a half-wired state; (b) **explicit, compiler-checked dependency lists** — the constructor signature *is* the documentation, and when it hits 7 parameters, that pain is a design signal (the class does too much), not a DI framework deficiency; (c) **immutability** — `private readonly` means no mid-lifecycle swaps; (d) trivial testing — `new SignupService(fakeMailer, fakeLogger)`.

**Property injection** is for genuinely optional dependencies with safe defaults, or frameworks that must construct before wiring (some ORM entity hydration). Costs: temporal coupling (usable-but-misconfigured window between `new` and the setter), mutability, and dependencies invisible at construction. NestJS supports it via `@Inject()` on properties but its own docs steer you to constructors.

**Method injection** is for dependencies that vary **per call**, not per object lifetime — a per-request transaction handle, a tax policy that depends on the invoice's country. Injecting these via constructor would either freeze one value or force one service instance per request.

Decision rule: *required and lifetime-stable → constructor; optional with a default → property (sparingly); varies per call → method parameter.*

**Interview trap:** "Setter injection is more flexible." That flexibility is exactly the bug surface — any code path can swap a dependency mid-flight, and forgetting the setter yields an NPE-equivalent at first use rather than a construction-time failure. Flexibility you don't need is a liability, and interviewers read "more flexible" as "hasn't been burned yet."

---

### Q11. Build a minimal DI container in TypeScript — token registry, singleton vs transient lifetimes, factory registration. Then explain how NestJS's container relates.

**Answer:**

```typescript
type Token<T> = symbol & { __type?: T }; // phantom type carries T for inference

function createToken<T>(description: string): Token<T> {
  return Symbol(description) as Token<T>;
}

type Lifetime = "singleton" | "transient";

interface Registration<T> {
  factory: (c: Container) => T;
  lifetime: Lifetime;
}

class Container {
  private registrations = new Map<symbol, Registration<unknown>>();
  private singletons = new Map<symbol, unknown>();
  private resolving = new Set<symbol>(); // circular-dependency guard

  register<T>(
    token: Token<T>,
    factory: (c: Container) => T,
    lifetime: Lifetime = "singleton"
  ): void {
    this.registrations.set(token, { factory, lifetime });
  }

  registerValue<T>(token: Token<T>, value: T): void {
    this.register(token, () => value, "singleton");
  }

  resolve<T>(token: Token<T>): T {
    const reg = this.registrations.get(token) as Registration<T> | undefined;
    if (!reg) throw new Error(`No registration for ${String(token)}`);

    if (reg.lifetime === "singleton" && this.singletons.has(token)) {
      return this.singletons.get(token) as T;
    }
    if (this.resolving.has(token)) {
      throw new Error(`Circular dependency detected at ${String(token)}`);
    }

    this.resolving.add(token);
    try {
      const instance = reg.factory(this);
      if (reg.lifetime === "singleton") this.singletons.set(token, instance);
      return instance;
    } finally {
      this.resolving.delete(token);
    }
  }
}

// ---- Usage ----
interface Logger { info(msg: string): void; }
interface Mailer { send(to: string, body: string): Promise<void>; }

class ConsoleLogger implements Logger {
  info(msg: string): void { console.log(msg); }
}
class SesMailer implements Mailer {
  constructor(private readonly logger: Logger) {}
  async send(to: string, body: string): Promise<void> {
    this.logger.info(`SES -> ${to} (${body.length} bytes)`);
  }
}

const LOGGER = createToken<Logger>("Logger");
const MAILER = createToken<Mailer>("Mailer");

const container = new Container();
container.register(LOGGER, () => new ConsoleLogger(), "singleton");
container.register(MAILER, (c) => new SesMailer(c.resolve(LOGGER)), "transient");

const mailer = container.resolve(MAILER); // typed as Mailer — no cast
```

The essential moves: **tokens** (symbols with a phantom type) decouple "what I want" from "which class provides it" — necessary because TS interfaces are erased at runtime and can't be lookup keys; **factories** capture how to build, and receive the container so registrations can resolve their own dependencies; **lifetimes** decide caching (`singleton` memoizes, `transient` re-runs the factory); the `resolving` set turns circular dependencies into a clear error instead of a stack overflow.

How NestJS relates: it is exactly this, plus (1) **decorator-driven registration** — `@Injectable()` + `emitDecoratorMetadata` lets Nest read constructor parameter types at runtime, so classes act as their own tokens and you rarely write factories by hand; (2) **module-scoped registries** — providers resolve within their module's graph unless exported, rather than one flat map; (3) **richer lifetimes** — `DEFAULT` (singleton), `REQUEST` (per-incoming-request subtree, with real throughput cost since the whole dependent subtree re-instantiates per request), `TRANSIENT`; (4) `useValue` / `useFactory` / `useClass` providers, which map one-to-one onto `registerValue` / `register` above. When Nest can't infer a token (interfaces, primitives, non-class values) you're back to explicit `@Inject(TOKEN)` — the symbol-token mechanism was underneath all along.

**Interview trap:** "The container finds dependencies by interface type." It can't — TypeScript types don't exist at runtime. Every DI container in the TS ecosystem keys on runtime values: classes (constructor references), symbols, or strings. Candidates who don't know this reveal they've never wondered how `@Inject` actually works.

---

### Q12. Define coupling and cohesion precisely — including afferent and efferent coupling — and explain why the goal is high cohesion + low coupling rather than either alone.

**Answer:**

**Cohesion**: how strongly the elements *inside* a module belong together — do its methods use the same fields, serve the same actor, change for the same reasons? **Coupling**: how much modules *know about each other* — how many other modules break, recompile, or need re-testing when this one changes.

The directional metrics (from Robert Martin's package metrics):

- **Afferent coupling (Ca)** — how many modules depend **on you** (incoming arrows). High Ca = you are load-bearing: hard to change, must be stable. Your `domain/money.ts` should have high Ca.
- **Efferent coupling (Ce)** — how many modules **you depend on** (outgoing arrows). High Ce = you are fragile: you break whenever any dependency changes. An HTTP controller naturally has high Ce.
- **Instability I = Ce / (Ca + Ce)** — 0 is maximally stable, 1 maximally unstable. The design rule: **depend in the direction of stability** — unstable things (controllers, adapters) may depend on stable things (domain interfaces), never the reverse. This is DIP restated as a metric: interfaces and value objects should sit at low I, gathering incoming arrows.

Why you need both goals together:

- High cohesion + high coupling: well-focused classes that all reach into each other — any change ripples everywhere.
- Low cohesion + low coupling: isolated god modules — each one is internally a mess, changes are risky *within* the module.
- The pathological "zero coupling" system is one giant file: no inter-module coupling because there are no modules. Coupling metrics only mean something at fixed decomposition granularity.

Practical senior heuristics: measure Ca before refactoring anything (touching a Ca=40 module needs a plan; a Ca=2 module you just fix); watch import graphs in review — a PR adding `import { PostgresClient }` to a domain file is raising domain Ce toward infra, the forbidden direction; cohesion smell test — if you can split a class in two and no method of one half calls or shares fields with the other half, it was two classes.

**Interview trap:** "Minimize coupling" taken absolutely. Coupling to *stable abstractions* is cheap and fine — everything couples to `Array` and `Promise` and nobody cares, because they never change incompatibly. Expensive coupling is coupling to *volatile concretions*. The skill is not reducing the arrow count; it's pointing arrows at things that don't move.

---

### Q13. Show three coupling/cohesion smells in code — feature envy, shotgun surgery, god object — and the refactor direction for each.

**Answer:**

**1. Feature envy** — a method more interested in another object's data than its own:

```typescript
class Order {
  constructor(
    public readonly items: Array<{ priceCents: number; qty: number }>,
    public readonly couponPercent: number
  ) {}
}

class InvoiceService {
  // Envious: every line reads Order's data. This logic *is* Order behavior.
  totalCents(order: Order): number {
    const subtotal = order.items.reduce((s, i) => s + i.priceCents * i.qty, 0);
    const discount = Math.floor((subtotal * order.couponPercent) / 100);
    return subtotal - discount;
  }
}
```

Refactor: move the computation to where the data lives — this is also the anemic-model fix (Q15):

```typescript
class RichOrder {
  constructor(
    private readonly items: Array<{ priceCents: number; qty: number }>,
    private readonly couponPercent: number
  ) {}
  totalCents(): number {
    const subtotal = this.items.reduce((s, i) => s + i.priceCents * i.qty, 0);
    return subtotal - Math.floor((subtotal * this.couponPercent) / 100);
  }
}
```

**2. Shotgun surgery** — one conceptual change forces edits in many files. Cause: a concept (here, "how we identify a customer") never got a home, so it's smeared everywhere:

```typescript
// checkout.ts
function checkoutKey(email: string): string { return email.trim().toLowerCase(); }
// analytics.ts
function trackingId(email: string): string { return email.trim().toLowerCase(); }
// support.ts
function ticketOwner(email: string): string { return email.trim().toLowerCase(); }
// Change "identity = normalized email" to "identity = account id" -> edit N files.
```

Refactor: reify the concept once; every consumer depends on the one home:

```typescript
class CustomerIdentity {
  private constructor(public readonly value: string) {}
  static fromEmail(email: string): CustomerIdentity {
    return new CustomerIdentity(email.trim().toLowerCase());
  }
}
```

Shotgun surgery is the inverse failure of SRP-overreach: SRP violations make one file change for many reasons; shotgun surgery makes many files change for one reason. Both mean responsibilities landed in the wrong place.

**3. God object** — one class with high Ca *and* high Ce, touching every subsystem:

```typescript
class AppManager {
  private users = new Map<string, { email: string }>();
  private sessions = new Map<string, string>();
  private auditLog: string[] = [];

  createUser(id: string, email: string): void { this.users.set(id, { email }); }
  login(userId: string): string {
    const token = `tok_${userId}_${Date.now()}`;
    this.sessions.set(token, userId);
    this.auditLog.push(`login:${userId}`);
    return token;
  }
  sendMarketingBlast(body: string): void {
    for (const [, u] of this.users) this.auditLog.push(`mail:${u.email}:${body.length}`);
  }
  exportAudit(): string[] { return [...this.auditLog]; }
}
```

Refactor direction: partition by *data clumps and actors* — the fields that are only used together (`sessions` + login logic) name a class (`SessionService`); each extracted class gets its own interface; the god object shrinks into either nothing or a thin facade during migration. Do it incrementally — strangler-style, one responsibility extracted per PR — because god objects have the highest Ca in the codebase and a big-bang rewrite of one is how quarters die.

**Interview trap:** Identifying the smell but proposing a rename or a comment as the fix. Interviewers want the *structural* move: feature envy → move method; shotgun surgery → consolidate the concept into one home; god object → extract classes along data-usage seams. Naming the refactoring pattern (Fowler's catalog names) signals you've done this for real.

---

### Q14. The meta-question: walk me through how you'd run a 45–60 minute LLD interview from the candidate's chair — protocol, time budget, and what's actually being scored.

**Answer:**

The protocol, phase by phase:

**Phase 1 — Requirements clarification (5–8 min).** Never touch code first. Ask: Who are the actors? What are the 3–4 core use cases? What's explicitly out of scope? What scale/concurrency assumptions matter for the *object* design (e.g., "is the parking lot one process or distributed?" changes everything about locking)? State assumptions out loud and write them down — interviewers score assumption-surfacing heavily because in real FDE work, unstated assumptions are how projects die.

**Phase 2 — Identify entities (5 min).** Extract nouns from the use cases: for "design a rate limiter" — `RateLimiter`, `Policy`, `Clock`, `Store`, `Decision`. Distinguish entities (identity + lifecycle: `ParkingTicket`) from value objects (immutable, compared by value: `Money`, `LicensePlate`) from services (stateless behavior: `PricingService`). Say which is which — that vocabulary is a senior signal.

**Phase 3 — Contracts before implementations (10–12 min).** Define the interfaces first:

```typescript
interface RateLimitDecision {
  allowed: boolean;
  retryAfterMs?: number;
}

interface RateLimiter {
  check(key: string, now: number): Promise<RateLimitDecision>;
}

interface CounterStore {
  incrementAndGet(key: string, windowMs: number, now: number): Promise<number>;
}
```

This phase is where the round is won: interface-first thinking demonstrates you design *seams* — where tests attach, where implementations swap, where teams divide work. Note `now` is a parameter, not `Date.now()` inside — you just made the design testable and showed DIP on time itself, and a good interviewer will notice unprompted.

**Phase 4 — Model interactions (10–15 min).** Implement the 1–2 core flows *end to end* through your interfaces (sliding window `check()`), narrating tradeoffs as you type: "fixed window is O(1) but bursts at boundaries; sliding log is exact but O(requests) memory — I'll do fixed window and flag the burst issue." Talking-while-typing is the skill; silent typing reads as junior.

**Phase 5 — Extensibility & wrap (8–10 min).** Answer "what changes if...": new limit algorithm → new `RateLimiter` implementation (OCP); Redis instead of memory → new `CounterStore` adapter (DIP); per-tenant policies → policy lookup composed in front. Then volunteer the weaknesses yourself: "the race between read and increment needs an atomic op in the distributed case — Redis `INCR` with `EXPIRE`, or a Lua script."

**What's scored:** (1) *naming* — `RateLimitDecision` vs `Result2`; names are the visible surface of your mental model; (2) *interface-first thinking* — contracts before bodies; (3) *tradeoff articulation* — every choice framed as "X over Y because Z"; (4) *responsiveness* — when the interviewer nudges ("what about bursts?"), do you integrate it or defend your v1; (5) *calibration* — knowing what to skip (getters, import lines) and what to make rigorous (the core state transition).

**When to write code vs talk:** talk through anything with one obvious implementation; write code for the parts where correctness is subtle (window arithmetic, state machine transitions) and for all interface definitions. If you're writing boilerplate, you're wasting your scored minutes — say "I'll stub this" and move on.

**Interview trap:** Jumping straight to class diagrams or, worse, code. The most common senior-level rejection reason in LLD rounds is *solving the wrong problem elegantly*. Five minutes of requirements questioning is not stalling — it's the first scored competency, and skipping it caps your score no matter how clean the code is.

---

### Q15. Anemic vs rich domain model — show both for the same domain and give the honest tradeoff, not just "anemic is an anti-pattern."

**Answer:**

**Anemic**: entities are property bags; all behavior lives in services that manipulate them. **Rich**: entities own their invariants and expose intention-revealing operations; services orchestrate across aggregates only.

Anemic:

```typescript
interface BankAccount {
  id: string;
  balanceCents: number;
  status: "active" | "frozen";
}

class AccountService {
  withdraw(account: BankAccount, amountCents: number): void {
    if (account.status === "frozen") throw new Error("account frozen");
    if (amountCents <= 0) throw new Error("invalid amount");
    if (account.balanceCents < amountCents) throw new Error("insufficient funds");
    account.balanceCents -= amountCents;
  }
}
```

The invariant "balance never goes negative on an active account" is enforced *only if every caller goes through the service*. Nothing stops `account.balanceCents = -5000` from any file that holds the object — the type system actively advertises the mutable field. Invariant enforcement is a convention, and conventions decay under deadline pressure.

Rich:

```typescript
class Account {
  private constructor(
    public readonly id: string,
    private balance: number,
    private status: "active" | "frozen"
  ) {}

  static open(id: string, initialDepositCents: number): Account {
    if (initialDepositCents < 0) throw new Error("invalid opening deposit");
    return new Account(id, initialDepositCents, "active");
  }

  withdraw(amountCents: number): void {
    if (this.status === "frozen") throw new Error("account frozen");
    if (amountCents <= 0) throw new Error("invalid amount");
    if (this.balance < amountCents) throw new Error("insufficient funds");
    this.balance -= amountCents;
  }

  freeze(): void {
    this.status = "frozen";
  }

  get balanceCents(): number {
    return this.balance;
  }
}
```

Invalid states are now *unrepresentable from outside*: private fields, a private constructor forcing entry through `open()`, mutations only through operations that check invariants. Feature envy (Q13) disappears because behavior lives with data.

The honest tradeoffs — anemic is not always wrong:

- **CRUD-heavy domains with few invariants** (an admin panel over reference data) get no payoff from rich models — you'd write ceremony around fields that have no rules.
- **Serialization friction**: rich models don't survive `JSON.parse` or naive ORM hydration — the prototype and privates are lost. You need mappers (persistence model ↔ domain model), which is real ongoing cost. This is exactly why so many Mongoose/Prisma codebases *drift* anemic: the ORM hands you property bags and the path of least resistance is to keep them.
- **Cross-aggregate logic** (transfer between two accounts, touching an outbox) genuinely belongs in a domain service — forcing it into one entity creates awkward coupling. Rich model ≠ zero services.

Decision rule: the more invariants and state transitions the domain has, the more a rich model pays. Payments, inventory, workflow engines → rich. Settings pages → anemic is fine, say so confidently.

**Interview trap:** Reciting "anemic domain model is an anti-pattern" (Fowler's phrase) without the qualifier. Interviewers follow up with "so is every DTO wrong?" — no: DTOs at boundaries are *supposed* to be anemic. The anti-pattern is specifically *core domain logic* scattered in services while entities are bags; data-transfer shapes at the edges are correct design.

---

### Q16. State the Law of Demeter, show a train wreck and its fix, and explain what the law is actually protecting you from.

**Answer:**

Law of Demeter ("principle of least knowledge"): a method may talk to — call methods on — only: (1) `this`, (2) its own fields, (3) its parameters, (4) objects it creates itself. Not "objects returned by objects returned by objects."

The train wreck:

```typescript
class Wallet {
  constructor(private balanceCents: number) {}
  getBalanceCents(): number { return this.balanceCents; }
  setBalanceCents(v: number): void { this.balanceCents = v; }
}

class Customer {
  constructor(private readonly wallet: Wallet) {}
  getWallet(): Wallet { return this.wallet; }
}

class CheckoutService {
  charge(customer: Customer, amountCents: number): void {
    // Train wreck: checkout knows Customer HAS a wallet, wallet HAS a balance,
    // and reimplements the "sufficient funds" rule locally.
    const wallet = customer.getWallet();
    if (wallet.getBalanceCents() < amountCents) throw new Error("insufficient funds");
    wallet.setBalanceCents(wallet.getBalanceCents() - amountCents);
  }
}
```

What's actually wrong: `CheckoutService` is coupled to the *internal structure* of `Customer` (that payment is wallet-based, that a wallet is a mutable balance). When the business adds credit lines or gift cards, every `customer.getWallet().` chain in the codebase is a change site — Demeter violations are how shotgun surgery (Q13) gets manufactured. It also scatters the funds-invariant across all callers.

Fix — "tell, don't ask": push the behavior to the owner of the structure:

```typescript
class SafeWallet {
  constructor(private balanceCents: number) {}
  deduct(amountCents: number): void {
    if (this.balanceCents < amountCents) throw new Error("insufficient funds");
    this.balanceCents -= amountCents;
  }
}

class PayingCustomer {
  constructor(private readonly wallet: SafeWallet) {}
  pay(amountCents: number): void {
    this.wallet.deduct(amountCents);
  }
}

class LeanCheckoutService {
  charge(customer: PayingCustomer, amountCents: number): void {
    customer.pay(amountCents); // one dot; structure hidden; invariant owned by Wallet
  }
}
```

Now switching customers to multi-source payment changes `PayingCustomer.pay` — one place.

Scope limits worth stating: Demeter is about reaching through **object structure**, not about counting dots. `order.items.filter(...).map(...)` is fine — fluent APIs and collection pipelines return *new values in the same abstraction*, not neighbors' internals. Same for builders returning `this` (Lesson 2.2). And DTOs/config objects are open data by design — `config.database.pool.max` violates nothing, because there's no behavior or invariant being bypassed.

**Interview trap:** "Fix it by adding `customer.getWalletBalance()`." Delegating the *getter* just relocates the ask — checkout still pulls data out and applies the rule itself, and the invariant still lives in every caller. The real fix changes the conversation from *asking for state* to *telling the owner to perform the operation*. If your refactor still ends with an `if` on someone else's data, you haven't fixed it.
