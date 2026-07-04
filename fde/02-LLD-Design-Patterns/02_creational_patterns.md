# Lesson 2.2 — Creational Patterns — Controlling Object Construction

> Module: LLD & Design Patterns | Level: Senior | FDE Prep Phase 2

Creational patterns are where LLD interviews separate people who memorized the Gang of Four from people who ship Node services. The senior test is never "implement Singleton" — it's "why is a module-scoped `const` a better singleton than a class in Node, and what breaks it," "where does Express actually use a factory," "when does a Builder earn its keep over an options object." This lesson pairs each pattern with a complete TypeScript implementation, the real place it lives in the Node ecosystem (Express, Mongoose, NestJS, `node:` core), and — most importantly — when *not* to reach for it.

---

### Q1. Implement a classic Singleton in TypeScript. Then explain why a module-scoped constant is the better singleton in Node.

**Answer:**

The textbook lazy singleton — private constructor, static instance, static accessor:

```typescript
class ConfigStore {
  private static instance: ConfigStore | null = null;
  private readonly values: Map<string, string>;

  private constructor() {
    this.values = new Map([["region", process.env.REGION ?? "us-east-1"]]);
  }

  static getInstance(): ConfigStore {
    if (ConfigStore.instance === null) {
      ConfigStore.instance = new ConfigStore();
    }
    return ConfigStore.instance;
  }

  get(key: string): string | undefined {
    return this.values.get(key);
  }
}

const region = ConfigStore.getInstance().get("region");
```

In Node this is mostly ceremony, because **the module system already caches**. CommonJS `require` and ESM both evaluate a module *once* per resolved path and cache the exports object; every later import gets the same object. So the idiomatic Node singleton is just a module-level value:

```typescript
// db.ts
import { Pool } from "pg";

export const db = new Pool({ connectionString: process.env.DATABASE_URL });
```

```typescript
// anywhere.ts — same Pool instance, no getInstance() dance
import { db } from "./db";
await db.query("SELECT 1");
```

`new Pool(...)` runs exactly once — the first time any module imports `db.ts`. This is simpler (no null check, no static field), lazily initialized (only if imported), and impossible to instantiate twice by mistake. The `getInstance()` pattern is worth it only when you need *lazy* construction gated on runtime arguments, or you're porting Java-shaped code.

**Interview trap:** Claiming module caching guarantees "exactly one instance process-wide, always." It guarantees one instance *per resolved module identity in one module registry* — a much narrower promise. Q2 covers the four ways that breaks.

---

### Q2. What are the require-cache and packaging caveats that break the "module = singleton" assumption?

**Answer:**

The module cache keys on the *resolved absolute path* within *one module registry*. Four real-world ways you end up with multiple "singletons":

1. **npm dependency duplication.** If `pkg-a` depends on `logger@1` and `pkg-b` on `logger@2`, npm installs both under different `node_modules` paths. Two paths → two cached copies → two singletons. Even same-version copies can be duplicated when npm can't dedupe (peer conflicts, hoisting misses). A "global" registry defined in a library becomes per-copy. This is the classic "why are there two React instances" / "two copies of my instanceof-checking library" bug — the fix is `peerDependencies`, not code.

2. **Case-sensitive path resolution differs by platform.** `require("./Db")` and `require("./db")` resolve to the *same* file on Windows/macOS (case-insensitive FS) but *different* cache keys' underlying file on Linux — or vice versa, you get two cache entries on the case-insensitive box because the strings differ. Two entries → two instances. Inconsistent import casing is a real cross-platform singleton duplicator.

3. **ESM and CommonJS graphs are separate.** Importing the same package once via `require` and once via `import` can yield two instances, because the two module systems maintain distinct registries and a package can be instantiated in each.

4. **Jest (and other test runners) isolate the module registry per test file** by default. Each test file gets a fresh registry, so your module singleton is re-created per file — usually what you want for isolation, but it surprises people who cached state expecting it to persist across files. `jest.resetModules()` does the same thing mid-file.

```typescript
// counter.ts
export const counter = { value: 0 };
```

```typescript
// Under Jest with default isolation, these two test files each see counter.value === 0
// at start — the module is re-evaluated per file, NOT shared.
```

**Interview trap:** "Singletons make global state safe because there's only one." The singleton *guarantees* shared mutable global state — that's the liability, not the feature. Combined with the duplication caveats above, you get the worst case: code that *assumes* one instance but sometimes has several, so state silently diverges. The fix for shared-state problems is dependency injection (pass the instance in), not a stronger singleton.

---

### Q3. Give the real-world Node example of a singleton done via module scope — Mongoose's default connection — and explain the testability cost of singletons.

**Answer:**

Mongoose ships a **default connection** as a package-level singleton. When you call `mongoose.connect(uri)` and then define models with `mongoose.model(...)`, both operate on `mongoose.connection` — one shared connection object held inside the `mongoose` module, itself cached by `require`:

```typescript
import mongoose from "mongoose";

await mongoose.connect(process.env.MONGO_URL!); // mutates the singleton default connection

const UserSchema = new mongoose.Schema({ email: String });
// This model binds to the DEFAULT connection implicitly:
const User = mongoose.model("User", UserSchema);
```

The convenience (models "just work" without threading a connection everywhere) is exactly the testability cost: models are coupled to global connection state. Two test suites importing the same `mongoose` sharethat connection; pointing tests at a different DB means mutating global state; parallel tests contend. Mongoose's own escape hatch is to *stop using the singleton* and create explicit connections:

```typescript
import mongoose from "mongoose";

const conn = mongoose.createConnection(process.env.MONGO_URL!); // explicit, injectable
const User = conn.model("User", new mongoose.Schema({ email: String }));
```

Now the connection is a value you can pass into repositories and swap in tests — DIP applied to the exact thing the singleton hid.

The general testability indictment of singletons: (1) tests can't substitute a fake — the dependency is fetched, not injected, so you're stuck monkey-patching `getInstance` or the module cache; (2) tests leak state into each other because the instance persists (unless the runner isolates it, Q2); (3) the dependency is invisible in signatures — a function using a singleton internally looks pure but isn't, so callers can't tell what it touches. Every one of these is solved by passing the collaborator in as a constructor argument.

**Interview trap:** "Singletons are fine, I'll just reset them between tests." Reset-between-tests is a code smell admitting the design fights the test — it's flaky (forget one reset and tests couple), and it doesn't help parallel execution where two tests want *different* instances simultaneously. Prefer a singleton *composition* (one instance created at the composition root and injected) over a singleton *pattern* (global access point).

---

### Q4. Implement the Factory Method pattern and name three places in the Node ecosystem that actually use it.

**Answer:**

Factory Method: define an interface for creating an object, and let each concrete creator decide which class to instantiate. It decouples callers from concrete constructors.

```typescript
interface Notification {
  deliver(to: string, body: string): Promise<void>;
}

interface NotificationFactory {
  create(): Notification;
}

class EmailNotification implements Notification {
  async deliver(to: string, body: string): Promise<void> {
    console.log(`email -> ${to}: ${body}`);
  }
}
class SmsNotification implements Notification {
  async deliver(to: string, body: string): Promise<void> {
    console.log(`sms -> ${to}: ${body}`);
  }
}

class EmailNotificationFactory implements NotificationFactory {
  create(): Notification {
    return new EmailNotification();
  }
}
class SmsNotificationFactory implements NotificationFactory {
  create(): Notification {
    return new SmsNotification();
  }
}

// Caller depends on the factory abstraction, never on `new EmailNotification()`.
async function sendAlert(factory: NotificationFactory, to: string): Promise<void> {
  await factory.create().deliver(to, "Alert!");
}
```

Real Node ecosystem examples:

1. **`express()` is itself a factory function.** `import express from "express"; const app = express();` — calling the module's export constructs and returns a configured application object (with the router, settings, middleware stack wired up). You never `new Application()`.

2. **`http.createServer([handler])`** returns a `http.Server` instance — a factory function hiding the construction and event wiring. Same shape: `net.createServer`, `dgram.createSocket`, `crypto.createHash("sha256")` (the last decides *which* hash class to build based on the string argument — factory method in its purest "the argument selects the product" form).

3. **NestJS `useFactory` providers.** A provider can be registered with a factory that the DI container calls to produce the instance, with its own dependencies injected:

```typescript
// NestJS provider using a factory
const dbProvider = {
  provide: "DATABASE_POOL",
  useFactory: (config: { url: string }) => new (class { url = config.url })(),
  inject: ["CONFIG"],
};
```

**Interview trap:** Calling every function that returns an object a "factory method." The pattern specifically decouples the caller from the *concrete class chosen*, usually with polymorphic creators or an argument that selects the product type. `crypto.createHash("sha256")` qualifies (the string picks the class); a plain `makeUser(name)` that always returns the one `User` class is just a constructor wrapper — useful, but calling it Factory Method in an interview signals pattern-name inflation.

---

### Q5. Implement Abstract Factory. Give the database-driver-family example and explain how it differs from Factory Method.

**Answer:**

Abstract Factory produces **families of related objects** that must be used together and kept consistent — you pick the family once, and every product you get from that factory matches. Where Factory Method makes *one* product, Abstract Factory makes a *coordinated set*.

The storage-backend example: Postgres and DynamoDB each need a matching `Repository`, `Migrator`, and `HealthCheck` — you must never mix a Postgres repository with a Dynamo migrator.

```typescript
interface UserRepository {
  findById(id: string): Promise<{ id: string } | null>;
}
interface Migrator {
  migrate(): Promise<void>;
}
interface HealthCheck {
  ping(): Promise<boolean>;
}

// The abstract factory: one method per product in the family.
interface StorageFactory {
  createUserRepository(): UserRepository;
  createMigrator(): Migrator;
  createHealthCheck(): HealthCheck;
}

// ----- Postgres family -----
class PostgresUserRepository implements UserRepository {
  async findById(id: string): Promise<{ id: string } | null> {
    return { id }; // SELECT ... WHERE id = $1
  }
}
class PostgresMigrator implements Migrator {
  async migrate(): Promise<void> { console.log("running SQL migrations"); }
}
class PostgresHealthCheck implements HealthCheck {
  async ping(): Promise<boolean> { return true; }
}
class PostgresStorageFactory implements StorageFactory {
  createUserRepository(): UserRepository { return new PostgresUserRepository(); }
  createMigrator(): Migrator { return new PostgresMigrator(); }
  createHealthCheck(): HealthCheck { return new PostgresHealthCheck(); }
}

// ----- DynamoDB family -----
class DynamoUserRepository implements UserRepository {
  async findById(id: string): Promise<{ id: string } | null> {
    return { id }; // GetItem
  }
}
class DynamoMigrator implements Migrator {
  async migrate(): Promise<void> { console.log("ensuring Dynamo tables"); }
}
class DynamoHealthCheck implements HealthCheck {
  async ping(): Promise<boolean> { return true; }
}
class DynamoStorageFactory implements StorageFactory {
  createUserRepository(): UserRepository { return new DynamoUserRepository(); }
  createMigrator(): Migrator { return new DynamoMigrator(); }
  createHealthCheck(): HealthCheck { return new DynamoHealthCheck(); }
}

// Pick the family once at the composition root; everything downstream is consistent.
function buildStorage(driver: "postgres" | "dynamo"): StorageFactory {
  return driver === "postgres" ? new PostgresStorageFactory() : new DynamoStorageFactory();
}
```

The difference in one line: **Factory Method = one product via inheritance/override; Abstract Factory = a family of products via an object with multiple create methods, guaranteeing the products are compatible.** Cloud SDKs show the same shape — an AWS vs GCP "factory" that vends matching blob-store, queue, and secrets clients so you never pair an S3 client with a GCP Pub/Sub client.

When *not* to use it: if there's only ever one family (you will never run anything but Postgres), the abstract factory is pure speculative generality — you've added three interfaces and two classes to abstract a variation that doesn't exist. Add it when the *second* backend actually appears, or when tests genuinely need an in-memory family.

**Interview trap:** Reaching for Abstract Factory when the products aren't actually a coupled family. If your "family" is one repository, that's Factory Method with extra ceremony. The justification for Abstract Factory is specifically *cross-product consistency* — that the migrator and repository must come from the same backend. No consistency constraint, no Abstract Factory.

---

### Q6. Implement a fluent Builder with validation in `.build()`. When does a Builder beat a constructor?

**Answer:**

Builder separates the *construction* of a complex object from its representation, most often via a fluent chain, deferring validation to a single `build()`.

```typescript
interface HttpRequest {
  readonly method: "GET" | "POST" | "PUT" | "DELETE";
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body?: string;
  readonly timeoutMs: number;
}

class HttpRequestBuilder {
  private method: HttpRequest["method"] = "GET";
  private url?: string;
  private headers: Record<string, string> = {};
  private body?: string;
  private timeoutMs = 30_000;

  setMethod(method: HttpRequest["method"]): this {
    this.method = method;
    return this;
  }
  setUrl(url: string): this {
    this.url = url;
    return this;
  }
  addHeader(key: string, value: string): this {
    this.headers[key.toLowerCase()] = value;
    return this;
  }
  setBody(body: string): this {
    this.body = body;
    return this;
  }
  setTimeout(ms: number): this {
    this.timeoutMs = ms;
    return this;
  }

  build(): HttpRequest {
    if (!this.url) throw new Error("url is required");
    if ((this.method === "POST" || this.method === "PUT") && this.body === undefined) {
      throw new Error(`${this.method} requires a body`);
    }
    if (this.timeoutMs <= 0) throw new Error("timeout must be positive");
    return {
      method: this.method,
      url: this.url,
      headers: { ...this.headers },
      body: this.body,
      timeoutMs: this.timeoutMs,
    };
  }
}

const req = new HttpRequestBuilder()
  .setMethod("POST")
  .setUrl("https://api.example.com/orders")
  .addHeader("Content-Type", "application/json")
  .setBody(JSON.stringify({ item: "widget" }))
  .setTimeout(5_000)
  .build();
```

Returning `this` from each mutator is what makes the chain work; the `build()` method is the single validation gate producing an immutable, fully-checked result.

A Builder earns its keep when: (1) construction has **many optional parameters** and several *combinations* are valid — a constructor becomes a positional-argument minefield (`new HttpRequest("POST", url, {}, body, 5000, undefined, true)`); (2) there are **cross-field validation rules** (POST requires a body) best enforced once at `build()`; (3) you want to build **incrementally** across code (add headers in one function, body in another) before finalizing; (4) you want an **immutable** product but a mutable construction process.

**Interview trap:** Reaching for a Builder when an **options object** does the job — in TS this is the usual case (Q11). `new HttpRequest({ method: "POST", url, body, timeoutMs: 5000 })` gives named, order-independent, optional params with full type-checking and zero builder boilerplate. Builders win specifically for incremental/staged construction, forced call-order (Q7), or when the fluent chain is the product's public API (query builders). Defaulting to a Builder for a plain config object is over-engineering, and interviewers probe "why not just an options object?"

---

### Q7. Show a step/staged builder that enforces call order at compile time using TypeScript types. Where is this idea used in real tooling?

**Answer:**

A staged builder returns a *narrowed interface* at each step, so the type system only exposes the next legal method — you physically cannot call `.build()` before required steps, and it's a compile error, not a runtime throw.

```typescript
interface EmailReady {
  build(): Email;
}
interface NeedsBody {
  body(text: string): EmailReady;
}
interface NeedsSubject {
  subject(line: string): NeedsBody;
}
interface NeedsTo {
  to(address: string): NeedsSubject;
}

interface Email {
  readonly to: string;
  readonly subject: string;
  readonly body: string;
}

class EmailBuilder implements NeedsTo, NeedsSubject, NeedsBody, EmailReady {
  private _to = "";
  private _subject = "";
  private _body = "";

  static start(): NeedsTo {
    return new EmailBuilder();
  }
  to(address: string): NeedsSubject {
    this._to = address;
    return this;
  }
  subject(line: string): NeedsBody {
    this._subject = line;
    return this;
  }
  body(text: string): EmailReady {
    this._body = text;
    return this;
  }
  build(): Email {
    return { to: this._to, subject: this._subject, body: this._body };
  }
}

// Legal — each step returns the interface exposing only the next method:
const email = EmailBuilder.start()
  .to("a@example.com")
  .subject("Hi")
  .body("Hello there")
  .build();

// Compile errors, not runtime errors:
// EmailBuilder.start().build();                 // Error: 'build' does not exist on NeedsTo
// EmailBuilder.start().to("a@x.com").build();   // Error: 'build' does not exist on NeedsSubject
```

The single class implements every stage interface, but each method's *return type* is the next stage, so the compiler hides everything else. This trades flexibility (fixed order) for a guarantee that required fields are set — the illegal state is unrepresentable.

Where the idea shows up: type-safe query builders like **Kysely** use exactly this — `.selectFrom(...)` returns a type that then exposes `.select(...)`, `.where(...)`, and only a validated chain reaches `.execute()`, with column names typed from your schema. It also appears in typed state-machine and form libraries. Most everyday builders (Q6) skip staging because the compile-time payoff isn't worth the interface proliferation.

**Interview trap:** Presenting the staged builder as the default builder style. It's a specialist tool: it multiplies interface count (one per step) and forbids reordering even when reordering is harmless. Use it when call order genuinely matters or required-field omission is a costly bug; for a bag of optionals, it's over-engineered — the plain builder or an options object is correct.

---

### Q8. Compare Knex/Kysely query builders and NestJS DocumentBuilder as real Builder examples. What makes the pattern the right fit there?

**Answer:**

**Query builders (Knex, Kysely)** are the canonical production Builder: each method returns a builder (`this` or a narrowed type) and the terminal method produces the result — SQL text or an executed query.

```typescript
// Knex-style fluent chain (illustrative, self-contained):
class SelectBuilder {
  private table = "";
  private columns: string[] = ["*"];
  private conditions: string[] = [];

  from(table: string): this {
    this.table = table;
    return this;
  }
  select(...cols: string[]): this {
    this.columns = cols;
    return this;
  }
  where(clause: string): this {
    this.conditions.push(clause);
    return this;
  }
  toSQL(): string {
    const where = this.conditions.length ? ` WHERE ${this.conditions.join(" AND ")}` : "";
    return `SELECT ${this.columns.join(", ")} FROM ${this.table}${where}`;
  }
}

const sql = new SelectBuilder().from("users").select("id", "email").where("active = true").toSQL();
```

Why Builder fits: a query has an unbounded, order-flexible set of optional clauses (`where`, `join`, `orderBy`, `limit`, chained any number of times) — a constructor or options object can't express "three wheres and two joins" ergonomically, and the fluent chain *is* the public API users want. Kysely adds the type-narrowing dimension (Q7): the builder threads your schema types through the chain so `.select("emial")` won't compile.

**NestJS `DocumentBuilder`** builds an OpenAPI/Swagger document incrementally, then finalizes with `.build()`:

```typescript
// NestJS Swagger setup (illustrative shape):
class DocumentBuilder {
  private doc = { title: "", version: "1.0", tags: [] as string[] };
  setTitle(t: string): this { this.doc.title = t; return this; }
  setVersion(v: string): this { this.doc.version = v; return this; }
  addTag(tag: string): this { this.doc.tags.push(tag); return this; }
  build(): { title: string; version: string; tags: string[] } { return { ...this.doc }; }
}

const config = new DocumentBuilder()
  .setTitle("Orders API")
  .setVersion("2.1")
  .addTag("orders")
  .build();
```

Why Builder fits here too: the config has many optional facets (title, version, servers, auth schemes, tags), accumulated across setup code, finalized once into an immutable document object consumed by the Swagger module.

The common thread — Builder is right when construction is **incremental, has many/repeatable optional parts, and the fluent API is itself the ergonomic goal.** Both cases also show the pattern's tell: a distinct terminal method (`toSQL`/`execute`/`build`) that transitions from "configuring" to "produced."

**Interview trap:** Assuming query builders exist for the *pattern's* sake. They exist because SQL composition is genuinely combinatorial and order-flexible — the Builder is a consequence of the problem shape, not a design flourish. The lesson to state: recognize the *problem shape* (incremental, repeatable-optional, fluent-as-API) that summons a Builder, rather than pattern-matching on "complex object."

---

### Q9. Explain the Prototype pattern in JavaScript terms — `Object.create` vs `structuredClone` — and when cloning beats construction. Include the security angle.

**Answer:**

Prototype: create new objects by **cloning an existing instance** rather than constructing from scratch. JavaScript is unusually native to this — the whole object model is prototype-based, and there are two distinct "clone" operations that are often confused:

```typescript
// 1. Object.create — makes a new object whose PROTOTYPE is the argument.
//    It does NOT copy properties; it delegates to them via the prototype chain.
const baseConfig = { region: "us-east-1", retries: 3, timeoutMs: 30_000 };
const requestConfig = Object.create(baseConfig) as typeof baseConfig;
requestConfig.timeoutMs = 5_000; // own property shadows the prototype's
console.log(requestConfig.region); // "us-east-1" — read through the prototype
console.log(Object.hasOwn(requestConfig, "region")); // false — not copied

// 2. structuredClone — a true DEEP copy (nested objects, Maps, Dates, typed arrays).
const template = { limits: { rpm: 100 }, tags: ["a", "b"] };
const copy = structuredClone(template);
copy.limits.rpm = 200;
console.log(template.limits.rpm); // 100 — fully independent (deep)
```

`Object.create` shares state through the chain (cheap, but mutations to the base leak to all "clones" that didn't shadow that key). `structuredClone` (built into Node 17+) makes an independent deep copy — no shared mutation, but it drops functions, class prototypes (result is a plain object), and non-cloneable types.

Cloning beats construction when: (1) **config templates** — start from a validated base config and derive variants by cloning + tweaking, avoiding re-running expensive validation/normalization; (2) **per-request context derived from a base** — clone an immutable base context per incoming request and stamp request-specific fields, cheaper and safer than rebuilding; (3) construction is genuinely **expensive or side-effecting** (hits a DB, does crypto) and you want N similar instances — clone the first.

The security angle — **prototype pollution.** Because reads walk the prototype chain, an attacker who can write to `Object.prototype` (via a key like `__proto__` in a naive deep-merge of untrusted JSON) poisons *every* object process-wide:

```typescript
// VULNERABLE naive merge — never do this with untrusted input.
function unsafeMerge(target: Record<string, any>, source: Record<string, any>): void {
  for (const key in source) {
    if (typeof source[key] === "object" && source[key] !== null) {
      unsafeMerge((target[key] ??= {}), source[key]);
    } else {
      target[key] = source[key]; // key can be "__proto__" -> pollutes Object.prototype
    }
  }
}
// Payload like JSON.parse('{"__proto__":{"isAdmin":true}}') then merged -> every object
// suddenly reports isAdmin === true via the chain.
```

Defenses: reject/skip keys `__proto__`, `constructor`, `prototype`; use `Object.create(null)` for maps holding untrusted keys (no prototype to pollute); prefer `Map` over plain objects for untrusted key/value data; use `Object.hasOwn` instead of `in`/direct access when checking untrusted objects. This is a recurring CVE class in lodash/deep-merge-style libraries — a favorite senior interview follow-up precisely because it connects the prototype *pattern* to a real prototype *vulnerability*.

**Interview trap:** Treating `Object.create(base)` as a copy. It's *delegation*, not copying — no properties are duplicated, and later mutations to `base` are visible through every derived object (unless shadowed). If you need independence, that's `structuredClone` (deep) or `{ ...base }` (shallow). Confusing the two produces spooky action-at-a-distance bugs where editing a template silently changes derived objects.

---

### Q10. Implement a generic Object Pool in TypeScript with acquire/release, max size, and a promise-based waiting queue. Then justify why DB connection pools exist and when NOT to pool.

**Answer:**

```typescript
interface Poolable {
  destroy(): Promise<void>;
}

class Pool<T extends Poolable> {
  private idle: T[] = [];
  private inUse = new Set<T>();
  private waiters: Array<(resource: T) => void> = [];
  private total = 0;

  constructor(
    private readonly factory: () => Promise<T>,
    private readonly maxSize: number
  ) {}

  async acquire(): Promise<T> {
    // 1. Reuse an idle resource if available.
    const idle = this.idle.pop();
    if (idle) {
      this.inUse.add(idle);
      return idle;
    }
    // 2. Under the cap: create a new one.
    if (this.total < this.maxSize) {
      this.total++;
      try {
        const resource = await this.factory();
        this.inUse.add(resource);
        return resource;
      } catch (err) {
        this.total--; // creation failed — don't leak a slot
        throw err;
      }
    }
    // 3. At capacity: wait for a release (promise-based queue).
    return new Promise<T>((resolve) => {
      this.waiters.push(resolve);
    });
  }

  release(resource: T): void {
    this.inUse.delete(resource);
    // Hand directly to the oldest waiter if any — never dip to idle in between.
    const waiter = this.waiters.shift();
    if (waiter) {
      this.inUse.add(resource);
      waiter(resource);
      return;
    }
    this.idle.push(resource);
  }

  async drain(): Promise<void> {
    const all = [...this.idle, ...this.inUse];
    this.idle = [];
    this.inUse.clear();
    this.total = 0;
    await Promise.all(all.map((r) => r.destroy()));
  }

  get stats(): { total: number; idle: number; inUse: number; waiting: number } {
    return {
      total: this.total,
      idle: this.idle.length,
      inUse: this.inUse.size,
      waiting: this.waiters.length,
    };
  }
}
```

Usage:

```typescript
class FakeConnection implements Poolable {
  constructor(public readonly id: number) {}
  async destroy(): Promise<void> { /* close socket */ }
}

let seq = 0;
const pool = new Pool<FakeConnection>(async () => new FakeConnection(++seq), 2);

const a = await pool.acquire();
const b = await pool.acquire();
const cPromise = pool.acquire(); // waits — pool is at max
pool.release(a);                 // fulfills cPromise with a's connection
const c = await cPromise;
```

The **idle eviction** concept (omitted above for length but essential in production pools): a background timer periodically destroys resources idle longer than `idleTimeoutMs` so the pool shrinks under low load rather than pinning `maxSize` connections open forever; production pools also validate a resource on acquire (a "test on borrow" ping) to discard ones the server has since closed.

**Why DB connection pools exist:** opening a Postgres/MySQL connection is *expensive and stateful* — a TCP handshake, then TLS negotiation, then authentication (password/SCRAM/cert), then session setup. That's multiple round trips (often 30–100ms). Worse, **Postgres forks an OS process per connection** with its own memory (~few MB) and has a hard `max_connections` (default ~100); MySQL threads similarly. So connections are scarce, costly to make, and costly to hold. A pool amortizes handshake cost across thousands of queries and *caps* concurrent connections so a traffic spike doesn't exhaust the database's connection limit and knock over every service sharing it. `pg.Pool` and Mongoose's built-in connection pool (`maxPoolSize`) are exactly this pattern in the wild; at very high scale you add an external pooler like PgBouncer in front.

**When NOT to pool:** when the resource is **cheap to create and stateless** — plain JS objects, DTOs, short-lived value objects. Pooling those adds acquire/release bookkeeping, a whole class of bugs (using-after-release, forgetting to release → leak, double-release → corruption), and *fights the garbage collector*, which is already excellent at churning short-lived objects. The old Java-era advice to pool everything is actively harmful in V8: allocation is a bump-pointer in new space and dead young objects are collected almost for free. Pool only genuinely scarce/expensive/limited resources: DB connections, sockets, worker threads, large reusable buffers, headless-browser instances.

**Interview trap:** "Pooling is always faster because it avoids allocation." For cheap objects it's *slower and buggier* — you pay synchronization/bookkeeping and risk state-leak bugs to save an allocation the GC handles for free, and pooled objects that survive get promoted to old space where collection is more expensive. Pooling pays only when *construction* (not allocation) is the cost — I/O handshakes, process forks, hard external caps. Name the cost you're amortizing; if you can't, don't pool.

---

### Q11. When do you choose a Factory vs a Builder vs a plain constructor with defaults? How do TypeScript options objects change the calculus?

**Answer:**

Decision framework by what the construction problem actually is:

- **Constructor (with defaults / options object)** — the default choice. Use when you know all inputs up front and construction is a straightforward assignment. In TS, an **options object** handles the thing Builders classically existed for (many optional, order-independent params) with named params, compile-time checking, and zero boilerplate:

```typescript
interface ServerOptions {
  port?: number;
  host?: string;
  keepAliveMs?: number;
  maxConnections?: number;
}

class Server {
  private readonly port: number;
  private readonly host: string;
  private readonly keepAliveMs: number;
  private readonly maxConnections: number;

  constructor(opts: ServerOptions = {}) {
    this.port = opts.port ?? 8080;
    this.host = opts.host ?? "0.0.0.0";
    this.keepAliveMs = opts.keepAliveMs ?? 5_000;
    this.maxConnections = opts.maxConnections ?? 1_000;
  }
}

const s = new Server({ port: 3000, maxConnections: 500 }); // named, optional, order-free
```

- **Builder** — use when construction is **incremental** (parts added across different code paths before finalizing), involves **repeatable** parts (`.where().where()`), requires **enforced call order** (staged builder, Q7), or the **fluent chain is the intended public API** (query builders). If a single options object at one call site expresses everything, you don't need a Builder.

- **Factory (Method / Abstract)** — orthogonal axis: use when the caller **shouldn't know the concrete class**, when the class is **chosen at runtime** (by config, input type, or feature flag), or when you need **families of compatible objects** (Abstract Factory, Q5). A factory answers "*which* class do I build"; constructors and builders answer "*how* do I build a known class." They compose: a factory can *return* a builder, or use one internally.

Quick selector: fixed known inputs → constructor + options object; incremental/repeatable/fluent/ordered → Builder; concrete type hidden or runtime-selected → Factory; consistent family of products → Abstract Factory.

How options objects change the calculus: they've **largely killed the "too many constructor params" motivation for Builders in TS/JS.** In Java, a 6-optional-param constructor is a telescoping-constructor nightmare that all-but-forces a Builder; in TS, `new Thing({ ... })` solves it cleanly with better type safety (each field named and checked) and less code. So in a TS interview, reaching for a Builder should be justified by *incremental construction, forced ordering, repeatable parts, or fluent-API-as-product* — not merely "there are several optional fields," because that's the options object's job.

**Interview trap:** Defaulting to a Builder for any object with several optional fields. In TS that's the options-object case, and proposing a Builder for it reads as Java-muscle-memory / over-engineering. The senior move is to *start* with an options-object constructor and escalate to a Builder only when incremental/ordered/repeatable/fluent construction is genuinely present — and to say that reasoning out loud, since the framing is what's scored.

---
