# In-Memory Redis Clone - Machine Coding Round

This is the single most common FDE machine-coding question (Heizen asks it, and so do dozens of other startups). It looks trivial ("it's just a Map, right?") and that is exactly the trap: the round is scored on the details — TTL semantics, type errors, transaction rollback, glob matching — not on whether you can call `map.set()`.

The interviewer will typically give you a prompt like this:

> Build an in-memory key-value store in the style of Redis. It should run as a library (a class, no networking needed) and support:
>
> 1. `SET key value`, `GET key`, `DEL key...`, `EXISTS key...`
> 2. Expiry: `EXPIRE key seconds`, `PERSIST key`, `TTL key`. Expired keys must never be visible to a reader, and they should also be cleaned up in the background, not only when read.
> 3. Counters: `INCR key`, `DECR key`. Must error on non-integer values.
> 4. Hashes: `HSET key field value`, `HGET key field`. Lists: `LPUSH key value...`, `RPOP key`.
> 5. Transactions: `MULTI` queues commands, `EXEC` applies them atomically. If any command in the transaction fails, none of the changes should be visible.
> 6. `KEYS pattern` with Redis glob syntax: `*`, `?`, `[abc]`. Implement the matching yourself — do not pass the pattern to a regex engine as-is.
>
> Commands against a key of the wrong type must fail with a `WRONGTYPE` error, like real Redis. We will run your code against a test suite, so exact return values matter: `GET` on a missing key returns `null`, `TTL` returns `-2` for a missing key and `-1` for a key with no expiry, `EXPIRE` on a missing key returns `0`.

Requirements checklist (what the hidden test suite will actually check):

- `SET` / `GET` / `DEL` / `EXISTS` with Redis return values (`"OK"`, `null`, deleted count, existing count).
- `SET` on an existing key **removes its TTL** (real Redis behavior).
- TTL: **lazy expiry** (checked on every read/write touch) **and active expiry** (periodic sampling sweep).
- `TTL` return codes: `-2` missing, `-1` no expiry, otherwise remaining seconds (rounded up).
- `INCR` / `DECR`: create-at-0 semantics, integer validation, `WRONGTYPE` on hashes/lists.
- `HSET` / `HGET`, `LPUSH` / `RPOP` with correct ordering and empty-list key deletion.
- `MULTI` / `EXEC` / `DISCARD`: commands queue (return `"QUEUED"`), `EXEC` runs them atomically, any failure rolls back everything (snapshot + restore).
- `KEYS` with a hand-written glob-to-regex converter handling `*`, `?`, `[abc]`, `[a-z]`, escaping, and treating other regex metacharacters (`.`, `+`, `(`) as literals.
- An injectable clock so TTL is deterministic under test.

## Approach & time budget

You have 45-60 minutes. The people who fail this round usually fail on time allocation, not knowledge: they gold-plate `SET`/`GET` for 20 minutes and never reach transactions. Work in strict 10-minute blocks and say the plan out loud at the start — interviewers score planning.

**0-10 min — skeleton + core commands.** Define the `Entry` type (a tagged union: `string | hash | list`), the `WrongTypeError`, the class with `store: Map<string, Entry>` and `expirations: Map<string, number>`, and an injected `now()` clock. Implement `SET`, `GET`, `DEL`, `EXISTS`. Say out loud: "I'm keeping expirations in a separate map so a key can exist without a TTL, and I'm injecting the clock so expiry is testable without sleeping."

**10-20 min — TTL.** Write one private helper, `expireIfNeeded(key)`, and call it at the top of *every* command that touches a key. Then `EXPIRE`, `PERSIST`, `TTL`, and the active sweep (`sweepExpired()` + a `setInterval` wrapper). Say out loud: "Lazy expiry guarantees correctness; the active sweep only exists to reclaim memory for keys nobody reads — same as real Redis."

**20-30 min — counters, hashes, lists.** `INCR`/`DECR` via a shared `incrBy`, integer validation with a regex, `WRONGTYPE` checks via a shared `getEntry(key, expectedType)` helper. Then `HSET`/`HGET`, `LPUSH`/`RPOP`. These are quick if your type-checking helper already exists — which is why you build it in block 1.

**30-40 min — MULTI/EXEC.** A command-name dispatcher (`dispatch(cmd, args)` with an explicit allowlist — never `(this as any)[userInput]` without a whitelist), a queue, and snapshot/restore for rollback. Deep-copy the snapshot: clone each hash `Map` and each list array, or your "rollback" will share references with live data and silently corrupt on restore.

**40-50 min — KEYS glob.** Hand-roll `globToRegExp`: walk the pattern char by char, translate `*` to `.*`, `?` to `.`, copy `[...]` classes through (handling `[^...]` and unterminated `[`), and regex-escape everything else. Anchor with `^...$`.

**50-60 min — tests + talk.** Run your test file, fix what breaks, then narrate follow-ups you'd do with more time (LRU eviction, AOF persistence, pub/sub). If you finish early, add edge-case tests — interviewers grade test quality.

Key design decisions to state explicitly:

1. **Tagged-union entries, not three separate maps.** One `Map<string, Entry>` where `Entry` carries its type. This makes `WRONGTYPE` checks trivial and makes `DEL`/`EXISTS`/`EXPIRE` type-agnostic for free.
2. **Injected clock.** `constructor(now: () => number = () => Date.now())`. Without this you cannot test TTL deterministically, and the interviewer knows it.
3. **Lazy expiry is the source of truth.** The background sweep is an optimization. If you only implement the timer, an expired-but-not-yet-swept key is visible to `GET` — instant test failure.
4. **Rollback via snapshot.** The prompt asks for rollback. Mention out loud that *real* Redis deliberately does **not** roll back (a failed command inside `EXEC` leaves earlier commands applied; only queue-time errors abort). Knowing the divergence is a senior signal; implementing what was asked is the job.

## Implementation

Single file, as you would write it in the round. Runs with `npx tsx mini-redis.ts` or compiles with `tsc`.

``` typescript
// mini-redis.ts

type Clock = () => number; // milliseconds, injectable for tests

export class WrongTypeError extends Error {
  constructor() {
    super("WRONGTYPE Operation against a key holding the wrong kind of value");
    this.name = "WrongTypeError";
  }
}

type Entry =
  | { type: "string"; value: string }
  | { type: "hash"; value: Map<string, string> }
  | { type: "list"; value: string[] };

interface Snapshot {
  store: Map<string, Entry>;
  expirations: Map<string, number>;
}

export class MiniRedis {
  private store = new Map<string, Entry>();
  // key -> absolute expiry timestamp in ms. Separate map: a key may have no TTL.
  private expirations = new Map<string, number>();
  private txnQueue: Array<{ cmd: string; args: unknown[] }> | null = null;
  private sweepTimer: ReturnType<typeof setInterval> | null = null;

  // Explicit allowlist for the transaction dispatcher. Never dispatch on
  // arbitrary strings into `this` — that is an injection bug ("multi", "exec",
  // private helpers, even "constructor" would be reachable).
  private static readonly COMMANDS = new Set([
    "set", "get", "del", "exists",
    "expire", "persist", "ttl",
    "incr", "decr", "incrBy",
    "hset", "hget", "lpush", "rpop",
    "keys",
  ]);

  constructor(private now: Clock = () => Date.now()) {}

  // ------------------------------------------------------------------
  // Expiry core: LAZY expiry. Every command that touches a key calls
  // getEntry() (or expireIfNeeded directly), so an expired key is deleted
  // the moment anyone looks at it. The background sweep below is only a
  // memory-reclamation optimization, exactly like real Redis.
  // ------------------------------------------------------------------

  private isExpired(key: string): boolean {
    const at = this.expirations.get(key);
    return at !== undefined && this.now() >= at;
  }

  private expireIfNeeded(key: string): void {
    if (this.isExpired(key)) {
      this.store.delete(key);
      this.expirations.delete(key);
    }
  }

  /** Lazy-expire, fetch, and type-check in one place. */
  private getEntry(key: string, expected?: Entry["type"]): Entry | undefined {
    this.expireIfNeeded(key);
    const entry = this.store.get(key);
    if (entry && expected && entry.type !== expected) {
      throw new WrongTypeError();
    }
    return entry;
  }

  // ------------------------------------------------------------------
  // ACTIVE expiry: Redis-style random sampling. Real Redis samples 20
  // volatile keys ~10x/sec and repeats immediately if >25% were expired.
  // ------------------------------------------------------------------

  /** One sampling pass. Public so tests can drive it without timers. */
  sweepExpired(sampleSize = 20): number {
    const volatileKeys = [...this.expirations.keys()]; // copy: we mutate below
    if (volatileKeys.length === 0) return 0;
    let removed = 0;
    const samples = Math.min(sampleSize, volatileKeys.length);
    for (let i = 0; i < samples; i++) {
      const key = volatileKeys[Math.floor(Math.random() * volatileKeys.length)];
      if (this.isExpired(key)) {
        this.store.delete(key);
        this.expirations.delete(key);
        removed++;
      }
    }
    return removed;
  }

  startActiveExpiry(intervalMs = 100): void {
    if (this.sweepTimer) return;
    this.sweepTimer = setInterval(() => this.sweepExpired(), intervalMs);
    // Don't keep the process alive just for the sweeper.
    if (typeof this.sweepTimer.unref === "function") this.sweepTimer.unref();
  }

  stopActiveExpiry(): void {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
  }

  // ------------------------------------------------------------------
  // Strings
  // ------------------------------------------------------------------

  set(key: string, value: string): "OK" {
    this.store.set(key, { type: "string", value });
    // Real Redis: SET on an existing key discards its TTL.
    this.expirations.delete(key);
    return "OK";
  }

  get(key: string): string | null {
    const entry = this.getEntry(key, "string"); // throws WRONGTYPE on hash/list
    return entry ? entry.value : null;
  }

  del(...keys: string[]): number {
    let deleted = 0;
    for (const key of keys) {
      this.expireIfNeeded(key); // an already-expired key must not count
      if (this.store.delete(key)) {
        this.expirations.delete(key);
        deleted++;
      }
    }
    return deleted;
  }

  exists(...keys: string[]): number {
    let count = 0;
    for (const key of keys) {
      this.expireIfNeeded(key);
      if (this.store.has(key)) count++; // same key twice counts twice, like Redis
    }
    return count;
  }

  // ------------------------------------------------------------------
  // TTL commands
  // ------------------------------------------------------------------

  expire(key: string, seconds: number): 0 | 1 {
    this.expireIfNeeded(key);
    if (!this.store.has(key)) return 0; // EXPIRE on a missing key is 0, not an error
    this.expirations.set(key, this.now() + seconds * 1000);
    return 1;
  }

  persist(key: string): 0 | 1 {
    this.expireIfNeeded(key);
    if (!this.store.has(key) || !this.expirations.has(key)) return 0;
    this.expirations.delete(key);
    return 1;
  }

  ttl(key: string): number {
    this.expireIfNeeded(key);
    if (!this.store.has(key)) return -2;      // missing key
    const at = this.expirations.get(key);
    if (at === undefined) return -1;          // exists, no expiry
    return Math.ceil((at - this.now()) / 1000); // round UP, like Redis
  }

  // ------------------------------------------------------------------
  // Counters
  // ------------------------------------------------------------------

  incr(key: string): number {
    return this.incrBy(key, 1);
  }

  decr(key: string): number {
    return this.incrBy(key, -1);
  }

  incrBy(key: string, delta: number): number {
    const entry = this.getEntry(key, "string"); // WRONGTYPE if key holds a hash/list
    const current = entry ? entry.value : "0";  // missing key counts from 0
    if (!/^-?\d+$/.test(current)) {
      throw new Error("ERR value is not an integer or out of range");
    }
    const next = parseInt(current, 10) + delta;
    if (!Number.isSafeInteger(next)) {
      throw new Error("ERR increment or decrement would overflow");
    }
    // Write the entry directly instead of calling set(): INCR must PRESERVE
    // an existing TTL (only SET-family commands discard it).
    this.store.set(key, { type: "string", value: String(next) });
    return next;
  }

  // ------------------------------------------------------------------
  // Hashes
  // ------------------------------------------------------------------

  hset(key: string, field: string, value: string): 0 | 1 {
    let entry = this.getEntry(key, "hash");
    if (!entry) {
      entry = { type: "hash", value: new Map() };
      this.store.set(key, entry);
    }
    const isNewField = !entry.value.has(field);
    entry.value.set(field, value);
    return isNewField ? 1 : 0; // 1 = new field created, 0 = overwrote existing
  }

  hget(key: string, field: string): string | null {
    const entry = this.getEntry(key, "hash");
    if (!entry) return null;
    return entry.value.get(field) ?? null;
  }

  // ------------------------------------------------------------------
  // Lists
  // ------------------------------------------------------------------

  lpush(key: string, ...values: string[]): number {
    if (values.length === 0) {
      throw new Error("ERR wrong number of arguments for 'lpush' command");
    }
    let entry = this.getEntry(key, "list");
    if (!entry) {
      entry = { type: "list", value: [] };
      this.store.set(key, entry);
    }
    // LPUSH a b c leaves the list as [c, b, a]: each value is pushed to the head.
    for (const v of values) entry.value.unshift(v);
    return entry.value.length;
  }

  rpop(key: string): string | null {
    const entry = this.getEntry(key, "list");
    if (!entry) return null;
    const popped = entry.value.pop() ?? null;
    if (entry.value.length === 0) {
      // Redis deletes empty aggregates; EXISTS must then return 0.
      this.store.delete(key);
      this.expirations.delete(key);
    }
    return popped;
  }

  // ------------------------------------------------------------------
  // KEYS + hand-rolled glob matching
  // ------------------------------------------------------------------

  keys(pattern: string): string[] {
    const re = globToRegExp(pattern);
    const result: string[] = [];
    // Snapshot the key list FIRST: expireIfNeeded deletes from the map we
    // would otherwise be iterating.
    for (const key of [...this.store.keys()]) {
      this.expireIfNeeded(key);
      if (this.store.has(key) && re.test(key)) result.push(key);
    }
    return result;
  }

  // ------------------------------------------------------------------
  // Transactions: MULTI queues, EXEC applies atomically with rollback.
  // (Note for the interviewer: real Redis does NOT roll back on runtime
  // errors inside EXEC — this rollback is per the problem statement.)
  // ------------------------------------------------------------------

  multi(): "OK" {
    if (this.txnQueue) throw new Error("ERR MULTI calls can not be nested");
    this.txnQueue = [];
    return "OK";
  }

  /** Queue a command inside MULTI. Returns "QUEUED" like the Redis protocol. */
  queue(cmd: string, ...args: unknown[]): "QUEUED" {
    if (!this.txnQueue) {
      throw new Error("ERR QUEUE without MULTI");
    }
    if (!MiniRedis.COMMANDS.has(cmd)) {
      // Real Redis rejects unknown commands at queue time and poisons the
      // transaction; rejecting immediately is the same spirit.
      this.txnQueue = null;
      throw new Error(`ERR unknown command '${cmd}'`);
    }
    this.txnQueue.push({ cmd, args });
    return "QUEUED";
  }

  discard(): "OK" {
    if (!this.txnQueue) throw new Error("ERR DISCARD without MULTI");
    this.txnQueue = null;
    return "OK";
  }

  exec(): unknown[] {
    if (!this.txnQueue) throw new Error("ERR EXEC without MULTI");
    const queued = this.txnQueue;
    this.txnQueue = null; // leave transaction mode whether we succeed or fail

    const snapshot = this.takeSnapshot();
    const results: unknown[] = [];
    try {
      for (const { cmd, args } of queued) {
        results.push(this.dispatch(cmd, args));
      }
      return results;
    } catch (err) {
      this.restoreSnapshot(snapshot); // rollback: none of the writes are visible
      throw err;
    }
  }

  private dispatch(cmd: string, args: unknown[]): unknown {
    if (!MiniRedis.COMMANDS.has(cmd)) {
      throw new Error(`ERR unknown command '${cmd}'`);
    }
    // Safe: cmd was validated against the allowlist above.
    return (this as unknown as Record<string, (...a: unknown[]) => unknown>)[cmd](...args);
  }

  /** DEEP copy. A shallow copy would share hash Maps / list arrays with the
   *  live store, and "rollback" would restore already-mutated objects. */
  private takeSnapshot(): Snapshot {
    const store = new Map<string, Entry>();
    for (const [key, entry] of this.store) {
      if (entry.type === "string") {
        store.set(key, { type: "string", value: entry.value });
      } else if (entry.type === "hash") {
        store.set(key, { type: "hash", value: new Map(entry.value) });
      } else {
        store.set(key, { type: "list", value: [...entry.value] });
      }
    }
    return { store, expirations: new Map(this.expirations) };
  }

  private restoreSnapshot(snap: Snapshot): void {
    this.store = snap.store;
    this.expirations = snap.expirations;
  }
}

// ------------------------------------------------------------------
// Glob -> RegExp, written by hand. Supports * ? [abc] [a-z] [^abc] and
// backslash-escaping. Everything else is a LITERAL — "user.*" must not
// treat "." as a regex dot.
// ------------------------------------------------------------------

function escapeRegExpChar(ch: string): string {
  return /[.*+?^${}()|[\]\\]/.test(ch) ? "\\" + ch : ch;
}

export function globToRegExp(glob: string): RegExp {
  let re = "^";
  let i = 0;
  while (i < glob.length) {
    const ch = glob[i];
    if (ch === "*") {
      re += ".*";
      i++;
    } else if (ch === "?") {
      re += ".";
      i++;
    } else if (ch === "\\" && i + 1 < glob.length) {
      // Escaped char matches itself literally (e.g. "\*" matches a real "*").
      re += escapeRegExpChar(glob[i + 1]);
      i += 2;
    } else if (ch === "[") {
      const close = glob.indexOf("]", i + 1);
      if (close === -1) {
        re += "\\["; // unterminated class: treat "[" as a literal, like Redis
        i++;
      } else {
        const body = glob.slice(i + 1, close);
        const negated = body.startsWith("^");
        const inner = (negated ? body.slice(1) : body)
          .replace(/\\/g, "\\\\")
          .replace(/\]/g, "\\]"); // keep "-" so ranges like a-z still work
        re += "[" + (negated ? "^" : "") + inner + "]";
        i = close + 1;
      }
    } else {
      re += escapeRegExpChar(ch);
      i++;
    }
  }
  return new RegExp(re + "$");
}
```

**Interview trap:** `SET` must clear an existing TTL. If you `SET session:1 x`, `EXPIRE session:1 100`, then `SET session:1 y`, the TTL must be gone (`TTL` returns `-1`). Candidates who store TTL inside the entry and copy it forward on `SET` fail this; candidates who keep a separate `expirations` map but forget `this.expirations.delete(key)` inside `set()` also fail it. Conversely, `INCR`/`HSET`/`LPUSH` must *preserve* the TTL — that is why `incrBy` writes the entry directly instead of calling `set()`.

**Interview trap:** `INCR` on a key holding a hash or list must throw `WRONGTYPE`, and `INCR` on a string like `"hello"` must throw the *different* error `ERR value is not an integer or out of range`. Test suites check both messages separately. Route every string command through one `getEntry(key, "string")` helper so you cannot forget the type check on some command.

## Test cases

Plain `node:assert`, no framework needed (`npx tsx mini-redis.test.ts`). The fake clock is just a mutable number — this is the payoff of the injectable `now()`.

``` typescript
// mini-redis.test.ts
import assert from "node:assert/strict";
import { MiniRedis, WrongTypeError, globToRegExp } from "./mini-redis";

function makeRedis() {
  let t = 0;
  const r = new MiniRedis(() => t);
  return { r, tick: (ms: number) => { t += ms; } };
}

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log("ok - " + name);
}

// ---------- core ----------

test("SET/GET/DEL/EXISTS basics", () => {
  const { r } = makeRedis();
  assert.equal(r.set("a", "1"), "OK");
  assert.equal(r.get("a"), "1");
  assert.equal(r.get("missing"), null);
  assert.equal(r.exists("a", "missing", "a"), 2); // duplicates count twice
  assert.equal(r.del("a", "missing"), 1);
  assert.equal(r.get("a"), null);
});

test("SET overwrites value and type", () => {
  const { r } = makeRedis();
  r.lpush("k", "x");
  assert.equal(r.set("k", "now-a-string"), "OK"); // SET replaces any type
  assert.equal(r.get("k"), "now-a-string");
});

// ---------- TTL: lazy expiry ----------

test("expired key is invisible to GET/EXISTS/TTL and is deleted lazily", () => {
  const { r, tick } = makeRedis();
  r.set("s", "v");
  assert.equal(r.expire("s", 10), 1);
  assert.equal(r.ttl("s"), 10);
  tick(9_999);
  assert.equal(r.get("s"), "v");
  assert.equal(r.ttl("s"), 1); // 1ms left rounds UP to 1s
  tick(1);                     // exactly at the deadline => expired
  assert.equal(r.get("s"), null);
  assert.equal(r.exists("s"), 0);
  assert.equal(r.ttl("s"), -2); // missing
});

test("TTL return codes: -2 missing, -1 no expiry", () => {
  const { r } = makeRedis();
  assert.equal(r.ttl("nope"), -2);
  r.set("k", "v");
  assert.equal(r.ttl("k"), -1);
});

test("EXPIRE on missing key returns 0; PERSIST removes TTL", () => {
  const { r, tick } = makeRedis();
  assert.equal(r.expire("ghost", 5), 0);
  r.set("k", "v");
  assert.equal(r.persist("k"), 0); // no TTL to remove yet
  r.expire("k", 5);
  assert.equal(r.persist("k"), 1);
  tick(60_000);
  assert.equal(r.get("k"), "v"); // survived: TTL was removed
});

test("SET clears an existing TTL (real Redis semantics)", () => {
  const { r, tick } = makeRedis();
  r.set("k", "v1");
  r.expire("k", 5);
  r.set("k", "v2");             // must discard the TTL
  assert.equal(r.ttl("k"), -1);
  tick(60_000);
  assert.equal(r.get("k"), "v2");
});

test("INCR preserves TTL", () => {
  const { r, tick } = makeRedis();
  r.set("n", "1");
  r.expire("n", 10);
  r.incr("n");
  assert.equal(r.ttl("n"), 10); // still volatile
  tick(10_000);
  assert.equal(r.get("n"), null);
});

test("EXPIRE on an already-expired key returns 0", () => {
  const { r, tick } = makeRedis();
  r.set("k", "v");
  r.expire("k", 1);
  tick(2_000);
  assert.equal(r.expire("k", 100), 0); // lazily deleted first, then "missing"
});

// ---------- TTL: active expiry ----------

test("active sweep removes expired keys nobody reads", () => {
  const { r, tick } = makeRedis();
  for (let i = 0; i < 50; i++) {
    r.set(`k${i}`, "v");
    r.expire(`k${i}`, 1);
  }
  tick(2_000);
  // Drive the sampler directly (deterministic alternative to timers).
  for (let pass = 0; pass < 100; pass++) r.sweepExpired(20);
  assert.equal(r.keys("*").length, 0);
});

// ---------- counters ----------

test("INCR/DECR with create-at-0 semantics", () => {
  const { r } = makeRedis();
  assert.equal(r.incr("hits"), 1);   // missing key starts from 0
  assert.equal(r.incr("hits"), 2);
  assert.equal(r.decr("hits"), 1);
  assert.equal(r.incrBy("hits", 10), 11);
  assert.equal(r.get("hits"), "11"); // stored back as a string
});

test("INCR on non-integer string errors", () => {
  const { r } = makeRedis();
  r.set("s", "hello");
  assert.throws(() => r.incr("s"), /not an integer/);
  r.set("f", "3.5");
  assert.throws(() => r.incr("f"), /not an integer/); // floats are not integers
  assert.equal(r.get("s"), "hello"); // value untouched after failed INCR
});

test("INCR on a hash key throws WRONGTYPE", () => {
  const { r } = makeRedis();
  r.hset("h", "f", "1");
  assert.throws(() => r.incr("h"), WrongTypeError);
  assert.throws(() => r.get("h"), WrongTypeError); // GET on hash also WRONGTYPE
});

// ---------- hashes ----------

test("HSET/HGET, new-field return value, WRONGTYPE", () => {
  const { r } = makeRedis();
  assert.equal(r.hset("user:1", "name", "Ada"), 1); // new field
  assert.equal(r.hset("user:1", "name", "Alan"), 0); // overwrite
  assert.equal(r.hget("user:1", "name"), "Alan");
  assert.equal(r.hget("user:1", "missing"), null);
  assert.equal(r.hget("missing", "f"), null);
  r.set("str", "x");
  assert.throws(() => r.hset("str", "f", "v"), WrongTypeError);
  assert.throws(() => r.hget("str", "f"), WrongTypeError);
});

// ---------- lists ----------

test("LPUSH/RPOP ordering and empty-list deletion", () => {
  const { r } = makeRedis();
  assert.equal(r.lpush("q", "a", "b", "c"), 3); // list is now [c, b, a]
  assert.equal(r.rpop("q"), "a"); // RPOP takes from the tail = first pushed
  assert.equal(r.rpop("q"), "b");
  assert.equal(r.rpop("q"), "c");
  assert.equal(r.exists("q"), 0); // empty list key must be deleted
  assert.equal(r.rpop("q"), null);
  r.set("str", "x");
  assert.throws(() => r.lpush("str", "v"), WrongTypeError);
});

// ---------- KEYS + glob ----------

test("KEYS glob: *, ?, [abc], ranges, literals", () => {
  const { r } = makeRedis();
  for (const k of ["hello", "hallo", "hillo", "help", "user.1", "userX1", "x"]) {
    r.set(k, "v");
  }
  assert.deepEqual(r.keys("h[ae]llo").sort(), ["hallo", "hello"]);
  assert.deepEqual(r.keys("h?llo").sort(), ["hallo", "hello", "hillo"]);
  assert.deepEqual(r.keys("he*").sort(), ["hello", "help"]);
  assert.deepEqual(r.keys("h[a-e]llo").sort(), ["hallo", "hello"]);
  // "." must be a LITERAL: "user.*" matches "user.1" but NOT "userX1".
  assert.deepEqual(r.keys("user.*"), ["user.1"]);
  assert.equal(r.keys("*").length, 7);
  assert.deepEqual(r.keys("nomatch*"), []);
});

test("glob edge cases: negated class, unterminated bracket, escapes, anchoring", () => {
  assert.equal(globToRegExp("h[^i]llo").test("hello"), true);
  assert.equal(globToRegExp("h[^i]llo").test("hillo"), false);
  assert.equal(globToRegExp("h[allo").test("h[allo"), true);  // literal "["
  assert.equal(globToRegExp("h[allo").test("hallo"), false);
  assert.equal(globToRegExp("\\*").test("*"), true);          // escaped star
  assert.equal(globToRegExp("\\*").test("anything"), false);
  assert.equal(globToRegExp("abc").test("xabc"), false);      // anchored start
  assert.equal(globToRegExp("abc").test("abcx"), false);      // anchored end
  assert.equal(globToRegExp("a+b(c)").test("a+b(c)"), true);  // regex metachars literal
});

test("KEYS does not return expired keys (and lazily deletes them)", () => {
  const { r, tick } = makeRedis();
  r.set("live", "v");
  r.set("dead", "v");
  r.expire("dead", 1);
  tick(5_000);
  assert.deepEqual(r.keys("*"), ["live"]);
});

// ---------- transactions ----------

test("MULTI/EXEC applies queued commands and returns all results", () => {
  const { r } = makeRedis();
  r.multi();
  assert.equal(r.queue("set", "a", "1"), "QUEUED");
  assert.equal(r.queue("incr", "a"), "QUEUED");
  assert.equal(r.queue("lpush", "l", "x", "y"), "QUEUED");
  assert.deepEqual(r.exec(), ["OK", 2, 2]);
  assert.equal(r.get("a"), "2");
});

test("EXEC rolls back ALL changes when any queued command fails", () => {
  const { r } = makeRedis();
  r.set("a", "hello");           // non-integer: INCR will fail
  r.set("keep", "before");
  r.multi();
  r.queue("set", "keep", "after");
  r.queue("set", "b", "new-key");
  r.queue("incr", "a");           // boom, third command
  assert.throws(() => r.exec(), /not an integer/);
  assert.equal(r.get("keep"), "before"); // earlier writes rolled back
  assert.equal(r.exists("b"), 0);        // new key rolled back
  assert.equal(r.get("a"), "hello");
});

test("rollback restores hashes and lists deeply (no shared references)", () => {
  const { r } = makeRedis();
  r.hset("h", "f", "original");
  r.lpush("l", "a");
  r.multi();
  r.queue("hset", "h", "f", "mutated");
  r.queue("lpush", "l", "b");
  r.queue("incr", "h"); // WRONGTYPE -> whole txn rolls back
  assert.throws(() => r.exec(), WrongTypeError);
  assert.equal(r.hget("h", "f"), "original"); // deep snapshot proved here
  assert.equal(r.rpop("l"), "a");
  assert.equal(r.exists("l"), 0); // only "a" was ever committed
});

test("DISCARD drops the queue; MULTI cannot nest; EXEC without MULTI errors", () => {
  const { r } = makeRedis();
  r.multi();
  r.queue("set", "x", "1");
  assert.equal(r.discard(), "OK");
  assert.equal(r.exists("x"), 0);
  assert.throws(() => r.exec(), /EXEC without MULTI/);
  r.multi();
  assert.throws(() => r.multi(), /nested/);
  r.discard();
  assert.throws(() => r.queue("set", "x", "1"), /without MULTI/);
});

test("queueing an unknown command aborts the transaction", () => {
  const { r } = makeRedis();
  r.multi();
  assert.throws(() => r.queue("flushall", "now"), /unknown command/);
  assert.throws(() => r.exec(), /EXEC without MULTI/); // txn was poisoned/aborted
});

console.log(`\n${passed} tests passed`);
```

**Interview trap:** `EXPIRE` on a missing key returns `0`, and so does `EXPIRE` on a key that has *already lazily expired* — which means `expire()` itself must run the lazy-expiry check before deciding the key "exists". The same applies to `PERSIST`, `TTL`, `DEL`, and `EXISTS`. The clean way to never miss one is a single `expireIfNeeded()`/`getEntry()` helper called first in every command; the failure mode is copy-pasting the check into some commands and forgetting others.

## Follow-up questions

### 1. "Add maxmemory with LRU eviction. How?"

**Answer.** Two decisions: how to *track* recency cheaply, and *when* to evict.

Tracking: a JavaScript `Map` iterates in insertion order, so delete-and-reinsert on every access turns insertion order into recency order — the first key in iteration order is the least recently used. That gives O(1) touch and O(1) "find LRU victim" with zero extra data structures, which is the right interview answer (a doubly linked list + hash map is the classic textbook answer and is what you'd say if asked to avoid relying on Map semantics).

Eviction: check on every write. For "memory", a key count is an acceptable proxy in an interview; say out loud that real memory accounting would track approximate byte sizes.

``` typescript
// Additions inside MiniRedis:
private maxKeys = Infinity;                 // config: CONFIG SET maxmemory-ish
setMaxKeys(n: number) { this.maxKeys = n; }

private touch(key: string): void {
  const entry = this.store.get(key);
  if (entry) {                              // re-insert => most recently used
    this.store.delete(key);
    this.store.set(key, entry);
  }
}

private evictIfNeeded(): void {
  while (this.store.size > this.maxKeys) {
    const victim = this.store.keys().next().value as string; // LRU = oldest
    this.store.delete(victim);
    this.expirations.delete(victim);
    // Production: emit an "evicted" keyspace notification / metric here.
  }
}
```

Hook points: call `this.touch(key)` inside `getEntry()` after a successful lookup (reads refresh recency), and call `this.evictIfNeeded()` at the end of `set`, `incrBy`, `hset`, and `lpush` (any command that can grow the keyspace).

Senior-level color to add: real Redis does **approximated** LRU — it samples `maxmemory-samples` (default 5) random keys and evicts the one with the oldest 24-bit LRU clock stored in each object header, because a true global LRU list costs memory and cache misses. Also name the policy matrix: `noeviction` (default — writes error when full), `allkeys-lru`, `volatile-lru` (only keys with a TTL are candidates), `allkeys-random`, `volatile-ttl`, and `allkeys-lfu`/`volatile-lfu` (frequency, better for scan-resistant workloads). `volatile-lru` with no volatile keys behaves like `noeviction` — a classic production incident.

### 2. "Make it durable: persistence via AOF."

**Answer.** Append every *write* command to an append-only file as it executes; on startup, replay the file through the normal command path to rebuild state. Reads are never logged.

``` typescript
import * as fs from "node:fs";

const WRITE_COMMANDS = new Set([
  "set", "del", "expire", "persist", "incrBy", "hset", "lpush", "rpop",
]);

export class AofMiniRedis extends MiniRedis {
  private fd: number;

  constructor(private aofPath: string, now?: () => number) {
    super(now);
    if (fs.existsSync(aofPath)) this.replay(aofPath);
    this.fd = fs.openSync(aofPath, "a");
  }

  private replay(path: string): void {
    for (const line of fs.readFileSync(path, "utf8").split("\n")) {
      if (!line.trim()) continue;
      const [cmd, ...args] = JSON.parse(line) as [string, ...unknown[]];
      // Replay through the real command implementations (parent methods),
      // NOT through the logging wrappers, or replay would re-append.
      (MiniRedis.prototype as any)[cmd].apply(this, args);
    }
  }

  private append(cmd: string, args: unknown[]): void {
    fs.writeSync(this.fd, JSON.stringify([cmd, ...args]) + "\n");
    // fsync policy decides durability here — see trade-offs below.
    // "always":  fs.fsyncSync(this.fd);
  }

  // Wrap each write command: apply first, log only on success.
  override set(key: string, value: string): "OK" {
    const res = super.set(key, value);
    this.append("set", [key, value]);
    return res;
  }

  override incrBy(key: string, delta: number): number {
    const res = super.incrBy(key, delta); // throws => nothing appended
    this.append("incrBy", [key, delta]);
    return res;
  }

  override expire(key: string, seconds: number): 0 | 1 {
    const res = super.expire(key, seconds);
    // CRITICAL: relative EXPIRE replayed tomorrow means the wrong deadline.
    // Real Redis rewrites it as PEXPIREAT (absolute ms). Log the absolute
    // timestamp; replay recomputes remaining seconds against the clock.
    if (res === 1) this.append("expire", [key, seconds]); // simplified; see note
    return res;
  }
  // ...same one-line wrappers for del/persist/hset/lpush/rpop
}
```

The three points the interviewer is fishing for:

- **fsync trade-off.** `appendfsync always`: fsync on every write — survives power loss to the last command, but every write pays a disk flush (hundreds of microseconds on NVMe, milliseconds on cloud EBS; throughput collapses). `appendfsync everysec` (Redis default): a background flush each second — lose at most ~1s of writes on power failure. `appendfsync no`: leave it to the OS page cache — fastest, can lose ~30s. Sync in the write path vs. sync in the background is the whole trade.
- **Relative TTLs are a replay bug.** Logging `EXPIRE k 60` and replaying it three days later gives the key 60 more seconds of life. Redis rewrites every expiry command into `PEXPIREAT key <absolute-ms>` in the AOF. In this design: log `["pexpireat", key, this.now() + seconds*1000]` and give the class a `pexpireat` that writes the absolute timestamp directly into `expirations`.
- **The AOF grows forever — compaction.** `INCR hits` a million times is a million lines whose net effect is one `SET hits 1000000`. AOF *rewrite* (BGREWRITEAOF) walks current state and emits the minimal command set into a new file, buffering writes that arrive during the rewrite and appending them before the atomic rename. Also mention the hybrid: RDB snapshot as a base + AOF tail (Redis 7's default layout), and that replay must apply commands *without* re-logging them (the `MiniRedis.prototype` call above).

### 3. "Sketch pub/sub: SUBSCRIBE and PUBLISH."

**Answer.** In-process, a channel registry is a `Map<string, Set<handler>>`. `PUBLISH` returns the number of receivers, like Redis.

``` typescript
type Handler = (channel: string, message: string) => void;

// Additions inside MiniRedis:
private subscribers = new Map<string, Set<Handler>>();
private patternSubs = new Map<string, { re: RegExp; handlers: Set<Handler> }>();

subscribe(channel: string, handler: Handler): void {
  let set = this.subscribers.get(channel);
  if (!set) { set = new Set(); this.subscribers.set(channel, set); }
  set.add(handler);
}

unsubscribe(channel: string, handler: Handler): void {
  const set = this.subscribers.get(channel);
  if (!set) return;
  set.delete(handler);
  if (set.size === 0) this.subscribers.delete(channel);
}

psubscribe(pattern: string, handler: Handler): void {   // reuses our glob code
  let entry = this.patternSubs.get(pattern);
  if (!entry) {
    entry = { re: globToRegExp(pattern), handlers: new Set() };
    this.patternSubs.set(pattern, entry);
  }
  entry.handlers.add(handler);
}

publish(channel: string, message: string): number {
  let delivered = 0;
  for (const h of this.subscribers.get(channel) ?? []) {
    h(channel, message);
    delivered++;
  }
  for (const { re, handlers } of this.patternSubs.values()) {
    if (re.test(channel)) {
      for (const h of handlers) { h(channel, message); delivered++; }
    }
  }
  return delivered;
}
```

Points to make while sketching: pub/sub is **fire-and-forget** — no buffering, no acknowledgment, a subscriber that connects one second late misses the message forever, and messages interact with *zero* of the keyspace (no TTL, no persistence, not in the AOF). If the interviewer pushes on "what if consumers must not miss messages", the answer is Redis **Streams** (`XADD`/`XREADGROUP` with consumer groups, pending-entries list, and acknowledgments) or an actual broker — not pub/sub. In a networked implementation, a "subscriber" is a connection placed into subscriber mode (only SUBSCRIBE-family commands allowed on it), and `PSUBSCRIBE` reuses exactly the `globToRegExp` you already wrote — say that out loud; interviewers love components getting reused.

## What gets you rejected

Concrete failure modes seen in real debriefs for this exact question:

1. **TTL only enforced by a timer.** A `setInterval` (or worse, one `setTimeout` per key) with no lazy check means `GET` returns an expired value in the window before the timer fires. The test suite sets a 1-second TTL, advances the clock, calls `GET`, and you fail. Lazy expiry on every touch is the correctness mechanism; the sweep is only garbage collection. One `setTimeout` per key is a double rejection: thousands of timers, and it fires on wall time so it is untestable with a fake clock.
2. **`KEYS` passing the pattern to `new RegExp(pattern)` (or eval).** `user.*` then matches `userX1` because `.` became a regex dot; `KEYS a+` throws or matches wrongly; and an unescaped pattern is regex injection with pathological backtracking. The prompt says implement globbing yourself — this is checked with patterns like `user.*` and `a+b(c)`.
3. **Transactions that execute immediately.** If `queue("set", ...)` writes to the store right away and `exec()` just returns collected results, `DISCARD` is impossible and rollback is fake. Commands must be *stored*, not run, until `EXEC`.
4. **Rollback with a shallow snapshot.** `new Map(this.store)` copies key-to-entry references; the queued `HSET` then mutates the same inner `Map` the snapshot points at, and "rollback" restores corrupted state. The `rollback restores hashes and lists deeply` test above exists precisely to catch this.
5. **Mutating the store while iterating it.** `keys()` that calls `expireIfNeeded()` (which deletes) inside `for (const k of this.store.keys())` — deleting during iteration of the live iterator is a correctness landmine; snapshot the keys first. Same bug appears in the active-expiry sweep.
6. **No `WRONGTYPE` discipline.** `GET` on a hash returning `"[object Map]"`, `INCR` on a list creating `NaN`, `HSET` silently clobbering a string key. One shared `getEntry(key, expectedType)` helper is the difference between passing and failing this whole category.
7. **`Date.now()` hardcoded.** The interviewer asks "how would you test TTL?" and the only answer is "sleep for two seconds in the test". Injecting `now()` takes one constructor parameter and signals you have written testable code before.
8. **Wrong return values.** `GET` missing returning `undefined` instead of `null`, `TTL` returning `0` for a missing key instead of `-2`, `DEL` returning a boolean instead of a count, `INCR` accepting `"3.5"`. Machine-coding rounds are graded by an automated suite; near-enough is a failed assertion.
9. **Unbounded dynamic dispatch.** `(this as any)[cmd](...args)` with no allowlist lets a queued command name like `"exec"`, `"takeSnapshot"`, or `"constructor"` reach internals. The allowlist is one `Set` — its absence reads as a security-blind spot.
10. **Running out of time with 3 of 6 features done.** Gold-plating `SET/GET` (custom error hierarchies, RESP protocol parsing nobody asked for) and never reaching transactions or globbing scores worse than plain code covering everything. Follow the time budget; say what you are skipping and why.
