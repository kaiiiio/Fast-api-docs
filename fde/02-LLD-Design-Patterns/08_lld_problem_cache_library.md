# Lesson 2.8 — Solved LLD: An In-Memory Cache Library — Pluggable Eviction, TTL, and Write Policies

> Module: LLD & Design Patterns | Level: Senior | FDE Prep Phase 2

"Design a cache" is the LLD problem most likely to expose whether you actually understand data structures *and* extensibility at the same time. A cache is deceptively small — `get`/`set`/`delete` — but a senior is expected to deliver an **O(1) LRU from scratch** (doubly-linked list + Map), make eviction **pluggable** (LRU today, LFU/FIFO tomorrow, without touching the store), handle **TTL** with both lazy and active expiry, expose **write-through/write-back hooks** for a backing store, keep it **generic**, and report **hit/miss stats** — all while never letting a follow-up ("now make it LFU," "now add a backing DB") force a rewrite. This walkthrough plays it the way a staff engineer would: data-structure rigor where it's tested, clean seams where requirements churn, and an honest account of what's out of scope.

The distinction that frames the whole problem: we are building a **cache library** — a reusable component someone imports and configures — not a single hard-coded LRU cache. That word "library" is a mandate for *configurability behind interfaces*.

---

## Step 1: Requirements clarification

Ask these before touching the keyboard. Each answer eliminates a whole family of wrong designs.

**Q1. "Is this a single fixed-policy cache, or a library where the eviction policy is configurable?"**
*Typical answer:* "A library — the caller should be able to pick LRU, LFU, or FIFO, and add their own later."
*Why it matters:* This is the single most load-bearing answer. If it's one fixed LRU, you write one class. If it's a library, **eviction must be a `Strategy` interface** from minute one, and the cache core must delegate every recency/frequency decision to it. Candidates who hard-code LRU and then get asked "now make it LFU" and start editing the core have already failed the extensibility probe that this problem exists to run.

**Q2. "What's the eviction trigger — a max entry count, a max memory size, or both?"**
*Typical answer:* "Max entry count is fine; mention memory-based as an extension."
*Why it matters:* Count-based eviction is O(1) bookkeeping (increment/decrement a size). Memory/byte-based eviction needs a `sizeOf(value)` cost function and changes the eviction loop from "evict one" to "evict until under budget." Confirm which, because it changes the `set` control flow. We'll build count-based and leave a `costFn` seam.

**Q3. "TTL — is expiry per-entry or a global default? And must an expired entry be gone *at* its deadline, or just never returned after it?"**
*Typical answer:* "Per-entry TTL with an optional global default. It must never be *returned* after expiry; proactively reclaiming memory is a bonus."
*Why it matters:* "Never returned after expiry" ⇒ **lazy expiry** (check `expiresAt` on `get`) is sufficient for correctness. "Reclaim memory promptly" ⇒ you *also* need **active expiry** (a background sweeper), because lazy-only lets expired-but-never-accessed entries occupy the cache forever. Most systems want lazy for correctness + active for memory hygiene. Nail this or you'll either serve stale data or leak memory.

**Q4. "Is there a backing store behind the cache (a DB, a remote cache), and if so, what's the write policy — write-through, write-back, or none?"**
*Typical answer:* "Assume there can be one. Support write-through and write-back as hooks; the core cache shouldn't depend on any specific store."
*Why it matters:* This decides whether `set` is purely in-memory or has an **I/O side effect**, and whether that side effect is synchronous (write-through) or deferred (write-back). It must be a **hook/loader interface**, not a hard dependency on a DB — otherwise the "library" isn't reusable. Write-back also introduces a dirty-entry-flush-on-eviction concern.

**Q5. "Single Node process, or shared across a cluster/instances?"**
*Typical answer:* "Single process for the core; discuss what breaks in a cluster."
*Why it matters:* In one Node process the event loop serializes synchronous `get`/`set`, so the data structures are safe **by construction** — say this out loud. A distributed cache is a *different problem* (Redis, consistent hashing, invalidation) and you should scope it out of the core but be ready to sketch it in Step 4.

**Q6. "Generic over key and value types? Any constraint on keys?"**
*Typical answer:* "Generic `Cache<K, V>`. Keys must be usable as `Map` keys."
*Why it matters:* Confirms `Map<K, Node>` (not `object` with string keys — objects stringify keys and break for non-string keys, and pollute with prototype keys). Generics are a senior default in TS; using `any` or `Record<string, V>` is a small but noticed downgrade.

**Q7. "What stats do you need — hit/miss ratio, evictions, size? Exposed how?"**
*Typical answer:* "Hits, misses, hit ratio, evictions, expirations, current size. A `stats()` getter."
*Why it matters:* Stats are cheap counters but they're the observability that makes a cache *operable* (a 20% hit ratio means your cache is worthless and you need to know). It also forces you to decide what counts as a "hit" (an unexpired present key) vs a "miss" (absent OR expired) — a definitional edge that shows rigor.

**Interview trap:** Candidates hear "cache" and immediately write a bare LRU with a `Map` and call it done. The prompt says *library* — the entire evaluation is whether eviction, TTL, and write policy are **configurable behind interfaces**. Writing a monolithic class that bakes in LRU is answering a different, easier question, and every Step-4 follow-up ("now LFU / now a backing DB / now byte-based") will require editing your core, which is the exact anti-pattern being tested.

Agreed scope: single-process, generic `Cache<K, V>`; count-based capacity with a `costFn` seam; pluggable eviction (LRU/LFU/FIFO) via a Strategy interface; per-entry + default TTL with lazy *and* active expiry; write-through/write-back via a loader/writer hook interface; hit/miss/eviction/expiration stats; O(1) LRU built from scratch. Distributed caching is an extension, not core.

---

## Step 2: Core entities & interfaces

The design has four seams, each an interface where change arrives:

1. **`EvictionPolicy<K>`** — decides *who gets evicted*. It observes access/insert/delete events and, on demand, names a victim. The cache core never mentions "LRU."
2. **`Clock`** — an injectable time source, so TTL is testable without sleeping.
3. **`CacheStore<K, V>`** — the write-through/write-back backing store hook (load on miss, persist on write).
4. **`Cache<K, V>`** — the orchestrator that ties entries, eviction, TTL, and stats together.

### The entry and the value envelope

```ts
/** Internal record the cache stores for each key. */
interface CacheEntry<V> {
  value: V;
  /** Absolute expiry timestamp in ms since epoch; undefined = never expires. */
  expiresAt?: number;
  /** Write-back bookkeeping: has this been persisted to the backing store? */
  dirty: boolean;
}
```

### The eviction seam — the heart of the "library"

The core insight: the eviction policy needs to be *notified* of every event that affects recency/frequency (`onAccess`, `onInsert`, `onRemove`) and must be able to **name and pop a victim** in O(1). It owns whatever data structure that requires (a linked list for LRU, frequency buckets for LFU, a plain queue for FIFO). The cache core stays policy-agnostic.

```ts
export interface EvictionPolicy<K> {
  /** Called when an existing key is read (get) or updated (set on existing key). */
  onAccess(key: K): void;
  /** Called when a brand-new key is inserted. */
  onInsert(key: K): void;
  /** Called when a key is removed (manual delete, expiry, or eviction). */
  onRemove(key: K): void;
  /** Return AND forget the next key to evict, or undefined if the policy is empty. O(1). */
  evictNext(): K | undefined;
  /** Reset all bookkeeping (used by clear()). */
  clear(): void;
}
```

Note what's *not* here: the policy does **not** hold the values. It tracks only keys and their metadata (order/frequency). The `Cache` owns the `Map<K, CacheEntry<V>>`. This separation is deliberate — it means a policy can be swapped without moving the actual data, and the policy stays a pure ordering concern.

### The clock seam

```ts
export interface Clock { now(): number; }
export const systemClock: Clock = { now: () => Date.now() };
```

### The backing-store seam (write-through / write-back)

```ts
export interface CacheStore<K, V> {
  /** Load a value on a cache miss (read-through). Return undefined if absent. */
  load(key: K): Promise<V | undefined>;
  /** Persist a value to the backing store (write-through / write-back flush). */
  save(key: K, value: V): Promise<void>;
  /** Remove from the backing store. */
  remove(key: K): Promise<void>;
}

export type WritePolicy = 'none' | 'write-through' | 'write-back';
```

**Interview trap:** "Why does the eviction policy hold keys and not values?" Because if the policy held values, swapping policies would mean copying all data between structures, and two structures would own the same objects (a lifecycle nightmare). The `Map` is the single owner of entries; the policy is a pure *ordering index* over keys. Stating this ownership boundary is a senior signal — it's the same discipline as keeping a database and its indexes separate.

---

## Step 3: Implementation

All code below is complete, runnable TypeScript with no placeholders. Order: the O(1) LRU policy (built from scratch), then LFU and FIFO policies, then the `Cache` core with TTL + stats + write policies, then a runnable demo and tests.

### 3.1 — The O(1) LRU policy (doubly-linked list + Map)

The classic senior requirement. O(1) recency ordering needs a **doubly-linked list** (O(1) unlink/relink) combined with a **hashmap** from key → its list node (O(1) lookup of the node to move). Neither alone works: a hashmap has no order; a list has no O(1) lookup. **Sentinel** head/tail nodes mean `node.prev`/`node.next` are never null for a real node, so unlink has zero branching.

```ts
class DLLNode<K> {
  prev: DLLNode<K> | null = null;
  next: DLLNode<K> | null = null;
  constructor(public key: K) {}
}

/**
 * LRU: most-recently-used at the head, least-recently-used at the tail.
 * Victim is always tail.prev. All operations O(1).
 */
export class LruPolicy<K> implements EvictionPolicy<K> {
  private readonly head = new DLLNode<K>(null as unknown as K); // sentinel
  private readonly tail = new DLLNode<K>(null as unknown as K); // sentinel
  private readonly nodes = new Map<K, DLLNode<K>>();

  constructor() {
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  private unlink(node: DLLNode<K>): void {
    node.prev!.next = node.next;
    node.next!.prev = node.prev;
    node.prev = node.next = null;
  }

  private insertAfterHead(node: DLLNode<K>): void {
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next!.prev = node;
    this.head.next = node;
  }

  onAccess(key: K): void {
    const node = this.nodes.get(key);
    if (!node) return;               // policy stays consistent even if called oddly
    this.unlink(node);
    this.insertAfterHead(node);      // touched → most recent
  }

  onInsert(key: K): void {
    const node = new DLLNode(key);
    this.nodes.set(key, node);
    this.insertAfterHead(node);
  }

  onRemove(key: K): void {
    const node = this.nodes.get(key);
    if (!node) return;
    this.unlink(node);
    this.nodes.delete(key);
  }

  evictNext(): K | undefined {
    const victim = this.tail.prev!;
    if (victim === this.head) return undefined; // empty
    const key = victim.key;
    this.unlink(victim);
    this.nodes.delete(key);
    return key;
  }

  clear(): void {
    this.nodes.clear();
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }
}
```

### 3.2 — The LFU policy (frequency buckets + minFreq, O(1))

LFU evicts the least-frequently-used key; the classic O(1) design keeps, for each frequency, a **doubly-linked list of keys at that frequency** (each bucket itself ordered by recency, giving a free LRU tie-break), plus a `minFreq` pointer. On access, a key moves from its bucket to the (freq+1) bucket. Eviction pops the LRU end of the `minFreq` bucket.

```ts
export class LfuPolicy<K> implements EvictionPolicy<K> {
  private minFreq = 0;
  private readonly keyFreq = new Map<K, number>();
  /** freq -> insertion-ordered set of keys at that frequency (JS Set preserves order). */
  private readonly buckets = new Map<number, Set<K>>();

  private bucket(freq: number): Set<K> {
    let b = this.buckets.get(freq);
    if (!b) { b = new Set<K>(); this.buckets.set(freq, b); }
    return b;
  }

  onInsert(key: K): void {
    this.keyFreq.set(key, 1);
    this.bucket(1).add(key);
    this.minFreq = 1;                         // a new key always resets minFreq to 1
  }

  onAccess(key: K): void {
    const freq = this.keyFreq.get(key);
    if (freq === undefined) return;
    const cur = this.bucket(freq);
    cur.delete(key);
    if (cur.size === 0) {
      this.buckets.delete(freq);
      if (this.minFreq === freq) this.minFreq = freq + 1; // advanced past the emptied min bucket
    }
    const next = freq + 1;
    this.keyFreq.set(key, next);
    this.bucket(next).add(key);
  }

  onRemove(key: K): void {
    const freq = this.keyFreq.get(key);
    if (freq === undefined) return;
    const b = this.bucket(freq);
    b.delete(key);
    if (b.size === 0) this.buckets.delete(freq);
    this.keyFreq.delete(key);
  }

  evictNext(): K | undefined {
    const b = this.buckets.get(this.minFreq);
    if (!b || b.size === 0) return undefined;
    // Set iteration order = insertion order → the oldest key at minFreq (LRU tie-break).
    const victim = b.values().next().value as K;
    b.delete(victim);
    if (b.size === 0) this.buckets.delete(this.minFreq);
    this.keyFreq.delete(victim);
    return victim;
  }

  clear(): void {
    this.minFreq = 0;
    this.keyFreq.clear();
    this.buckets.clear();
  }
}
```

### 3.3 — The FIFO policy (insertion-ordered, ignores access)

FIFO evicts in insertion order regardless of access — the simplest policy, and a good demonstration that the seam accommodates a trivial implementation as easily as a complex one. A JS `Set` preserves insertion order, so it *is* the queue.

```ts
export class FifoPolicy<K> implements EvictionPolicy<K> {
  private readonly order = new Set<K>();

  onInsert(key: K): void { this.order.add(key); }
  onAccess(_key: K): void { /* FIFO ignores access — that's the whole point */ }
  onRemove(key: K): void { this.order.delete(key); }

  evictNext(): K | undefined {
    const first = this.order.values().next().value as K | undefined;
    if (first === undefined) return undefined;
    this.order.delete(first);
    return first;
  }

  clear(): void { this.order.clear(); }
}
```

### 3.4 — Stats

```ts
export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  expirations: number;
  size: number;
  hitRatio: number; // hits / (hits + misses), 0 when no lookups yet
}
```

### 3.5 — The Cache core

This ties everything together: the `Map` owns entries; the policy is consulted for ordering/eviction; TTL is checked lazily on read and (optionally) swept actively; write policies hook the backing store; counters track stats. Every public method narrates the invariant it protects.

```ts
export interface CacheOptions<K, V> {
  capacity: number;                         // max entries (> 0)
  policy: EvictionPolicy<K>;                // pluggable eviction (LRU/LFU/FIFO/custom)
  clock?: Clock;                            // injectable for tests
  defaultTtlMs?: number;                    // applied when set() gets no per-entry ttl
  store?: CacheStore<K, V>;                 // backing store for read/write-through/back
  writePolicy?: WritePolicy;               // 'none' | 'write-through' | 'write-back'
  /** Active-expiry sweep interval; 0/undefined disables active expiry (lazy only). */
  activeExpirySweepMs?: number;
  /** Called when an entry is evicted/expired — e.g. to flush a dirty write-back entry. */
  onEvict?: (key: K, value: V, reason: 'capacity' | 'expired' | 'manual') => void;
}

export class Cache<K, V> {
  private readonly map = new Map<K, CacheEntry<V>>();
  private readonly policy: EvictionPolicy<K>;
  private readonly clock: Clock;
  private readonly capacity: number;
  private readonly defaultTtlMs?: number;
  private readonly store?: CacheStore<K, V>;
  private readonly writePolicy: WritePolicy;
  private readonly onEvict?: CacheOptions<K, V>['onEvict'];
  private sweepTimer?: NodeJS.Timeout;

  private hits = 0;
  private misses = 0;
  private evictions = 0;
  private expirations = 0;

  constructor(opts: CacheOptions<K, V>) {
    if (opts.capacity <= 0) throw new RangeError('capacity must be > 0');
    this.capacity = opts.capacity;
    this.policy = opts.policy;
    this.clock = opts.clock ?? systemClock;
    this.defaultTtlMs = opts.defaultTtlMs;
    this.store = opts.store;
    this.writePolicy = opts.writePolicy ?? 'none';
    this.onEvict = opts.onEvict;

    if (opts.activeExpirySweepMs && opts.activeExpirySweepMs > 0) {
      this.sweepTimer = setInterval(() => this.sweepExpired(), opts.activeExpirySweepMs);
      // Don't keep the process alive just for the sweeper.
      this.sweepTimer.unref?.();
    }
  }

  private isExpired(entry: CacheEntry<V>): boolean {
    return entry.expiresAt !== undefined && this.clock.now() >= entry.expiresAt;
  }

  /** Synchronous get: hits/misses against in-memory state only (no read-through I/O). */
  get(key: K): V | undefined {
    const entry = this.map.get(key);
    if (!entry) { this.misses++; return undefined; }
    if (this.isExpired(entry)) {
      this.dropExpired(key, entry);        // lazy expiry
      this.misses++;
      return undefined;
    }
    this.policy.onAccess(key);             // recency/frequency update
    this.hits++;
    return entry.value;
  }

  /**
   * Read-through get: on a miss, load from the backing store and populate the cache.
   * Async because loading is I/O. A hit resolves without touching the store.
   */
  async getOrLoad(key: K): Promise<V | undefined> {
    const cached = this.get(key);
    if (cached !== undefined) return cached;
    if (!this.store) return undefined;
    const loaded = await this.store.load(key);
    if (loaded === undefined) return undefined;
    this.set(key, loaded);                 // populate; counts as insert
    return loaded;
  }

  set(key: K, value: V, ttlMs?: number): void {
    const existing = this.map.get(key);
    const ttl = ttlMs ?? this.defaultTtlMs;
    const expiresAt = ttl !== undefined ? this.clock.now() + ttl : undefined;

    if (existing && !this.isExpired(existing)) {
      // Update in place — recency touch, no capacity change.
      existing.value = value;
      existing.expiresAt = expiresAt;
      existing.dirty = this.writePolicy === 'write-back';
      this.policy.onAccess(key);
    } else {
      if (existing) this.dropExpired(key, existing); // stale entry occupying the slot
      // Evict to make room BEFORE inserting, so capacity is never exceeded.
      while (this.map.size >= this.capacity) {
        if (!this.evictOne('capacity')) break;       // policy empty — nothing to evict
      }
      this.map.set(key, { value, expiresAt, dirty: this.writePolicy === 'write-back' });
      this.policy.onInsert(key);
    }

    // Write-through: persist synchronously-ish (fire the promise; caller can await via setAndFlush).
    if (this.writePolicy === 'write-through' && this.store) {
      void this.store.save(key, value); // in a real system, surface/await this error
      const e = this.map.get(key);
      if (e) e.dirty = false;
    }
  }

  /** Write-through variant that lets the caller await the backing-store write. */
  async setAndFlush(key: K, value: V, ttlMs?: number): Promise<void> {
    this.set(key, value, ttlMs);
    if (this.store && this.writePolicy !== 'none') {
      await this.store.save(key, value);
      const e = this.map.get(key);
      if (e) e.dirty = false;
    }
  }

  delete(key: K): boolean {
    const entry = this.map.get(key);
    if (!entry) return false;
    this.map.delete(key);
    this.policy.onRemove(key);
    this.onEvict?.(key, entry.value, 'manual');
    if (this.store && this.writePolicy !== 'none') void this.store.remove(key);
    return true;
  }

  has(key: K): boolean {
    const entry = this.map.get(key);
    if (!entry) return false;
    if (this.isExpired(entry)) { this.dropExpired(key, entry); return false; }
    return true;
  }

  private evictOne(reason: 'capacity'): boolean {
    const victimKey = this.policy.evictNext();
    if (victimKey === undefined) return false;
    const entry = this.map.get(victimKey);
    this.map.delete(victimKey);
    this.evictions++;
    if (entry) {
      // Write-back: flush a dirty entry before dropping it so no write is lost.
      if (entry.dirty && this.store) void this.store.save(victimKey, entry.value);
      this.onEvict?.(victimKey, entry.value, reason);
    }
    return true;
  }

  private dropExpired(key: K, entry: CacheEntry<V>): void {
    this.map.delete(key);
    this.policy.onRemove(key);
    this.expirations++;
    if (entry.dirty && this.store) void this.store.save(key, entry.value);
    this.onEvict?.(key, entry.value, 'expired');
  }

  /** Active expiry: proactively reclaim expired entries so idle keys don't linger. */
  private sweepExpired(): void {
    const now = this.clock.now();
    for (const [key, entry] of this.map) {
      if (entry.expiresAt !== undefined && now >= entry.expiresAt) {
        this.dropExpired(key, entry);
      }
    }
  }

  stats(): CacheStats {
    const lookups = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      expirations: this.expirations,
      size: this.map.size,
      hitRatio: lookups === 0 ? 0 : this.hits / lookups,
    };
  }

  clear(): void {
    this.map.clear();
    this.policy.clear();
  }

  /** Stop the active-expiry timer; call on shutdown to allow the process to exit cleanly. */
  dispose(): void {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
  }
}
```

### 3.6 — Wiring and a runnable demo

```ts
// Build an LRU cache of capacity 3 with a 50ms default TTL and active expiry.
const testClock = { t: 1_000, now() { return this.t; } };

const cache = new Cache<string, number>({
  capacity: 3,
  policy: new LruPolicy<string>(),
  clock: testClock,
  defaultTtlMs: 50,
});

cache.set('a', 1);
cache.set('b', 2);
cache.set('c', 3);
cache.get('a');            // 'a' is now most-recently-used
cache.set('d', 4);         // capacity 3 → evicts LRU, which is 'b' (a was just touched)

console.log(cache.get('a')); // 1
console.log(cache.get('b')); // undefined — evicted
console.log(cache.get('d')); // 4

testClock.t += 100;          // advance past the 50ms TTL
console.log(cache.get('a')); // undefined — lazily expired
console.log(cache.stats());  // { hits, misses, evictions: 1, expirations: >=1, ... }
```

### 3.7 — A test harness you actually run

Interviewers ask "how would you test this?" — have the tests written. Note the **injectable clock**: TTL is tested by advancing a fake clock, never by sleeping.

```ts
function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error('FAILED: ' + msg);
  console.log('ok - ' + msg);
}

function makeClock(start = 0) { return { t: start, now() { return this.t; } }; }

// --- LRU eviction order ---
{
  const c = new Cache<string, number>({ capacity: 2, policy: new LruPolicy() });
  c.set('a', 1); c.set('b', 2);
  c.get('a');                       // touch a
  c.set('c', 3);                    // evicts b (LRU)
  assert(c.get('a') === 1, 'LRU keeps recently-used a');
  assert(c.get('b') === undefined, 'LRU evicts least-recently-used b');
  assert(c.get('c') === 3, 'LRU keeps newest c');
  assert(c.stats().evictions === 1, 'exactly one eviction');
}

// --- put on existing key refreshes recency AND updates value ---
{
  const c = new Cache<string, number>({ capacity: 2, policy: new LruPolicy() });
  c.set('a', 1); c.set('b', 2);
  c.set('a', 10);                   // update a: new value + becomes most-recent
  c.set('c', 3);                    // evicts b, not a
  assert(c.get('a') === 10, 'update refreshes value and recency');
  assert(c.get('b') === undefined, 'b evicted after a was updated');
}

// --- LFU eviction with LRU tie-break ---
{
  const c = new Cache<string, number>({ capacity: 3, policy: new LfuPolicy() });
  c.set('a', 1); c.set('b', 2); c.set('c', 3);
  c.get('a'); c.get('a');          // a freq=3
  c.get('b');                       // b freq=2
  // c freq=1 (lowest) → evicted first
  c.set('d', 4);
  assert(c.get('c') === undefined, 'LFU evicts least-frequently-used c');
  assert(c.get('a') === 1 && c.get('b') === 2, 'LFU keeps more-frequent a,b');
}

// --- TTL lazy expiry via fake clock ---
{
  const clk = makeClock(1000);
  const c = new Cache<string, number>({ capacity: 5, policy: new LruPolicy(), clock: clk });
  c.set('x', 42, 100);             // expires at t=1100
  assert(c.get('x') === 42, 'not yet expired');
  clk.t = 1101;
  assert(c.get('x') === undefined, 'expired lazily on read');
  assert(c.stats().expirations === 1, 'expiration counted');
}

// --- capacity guard ---
{
  let threw = false;
  try { new Cache({ capacity: 0, policy: new LruPolicy() }); } catch { threw = true; }
  assert(threw, 'capacity <= 0 rejected');
}

// --- FIFO ignores access ---
{
  const c = new Cache<string, number>({ capacity: 2, policy: new FifoPolicy() });
  c.set('a', 1); c.set('b', 2);
  c.get('a');                       // FIFO ignores this
  c.set('c', 3);                    // still evicts a (first in)
  assert(c.get('a') === undefined, 'FIFO evicts insertion-order, ignores access');
  assert(c.get('b') === 2, 'b survives');
}

console.log('all tests passed');
```

**Interview trap:** "Why evict *before* inserting, in a loop, rather than insert-then-trim?" Because inserting first means the map momentarily holds `capacity + 1` entries — fine for count, but for a **byte-budget** cache (the Step-4 follow-up) that transient overshoot can OOM. Evicting to make room first keeps the invariant "size never exceeds capacity" true at every instant. The `while` loop (not a single `if`) matters once eviction can free variable amounts (byte-based) — with count-based it removes exactly one, but writing the loop shows you've thought about the general case.

---

## Step 4: Extensibility follow-ups

This is where the interview is won: every "now change X" should be a new class behind an existing interface, not an edit to the core. If it requires touching Step 3, the seams were wrong.

**Follow-up 1: "Now make it LFU instead of LRU."**
Zero core changes: `new Cache({ policy: new LfuPolicy(), ... })`. The whole point of the `EvictionPolicy` seam. Demonstrate by pointing at the identical `Cache` code serving both in the tests. If you'd hard-coded a linked list into `Cache`, you'd be rewriting `get`/`set`/eviction here — that contrast *is* the senior signal.

**Follow-up 2: "Add a random-eviction or MRU or segmented-LRU (2Q/ARC) policy."**
A new class implementing `EvictionPolicy<K>`. Random eviction can even skip the ordering structures entirely (keep a plain array of keys, pop a random index). ARC/2Q keep two LRU lists (recent vs frequent) and a ghost list — more code, but still entirely inside the policy. The `Cache` never learns the policy's name.

**Follow-up 3: "Make capacity byte-based, not count-based."**
Add a `costFn(value): number` and a `maxBytes` budget to `CacheOptions`; track a running `currentBytes`. The `set` eviction loop becomes `while (currentBytes + cost > maxBytes) evictOne()`. This is why the eviction control flow was written as a `while` loop from the start — the seam already accommodates variable-cost eviction; only the *stopping condition* changes. The policy interface is untouched (it still just orders keys).

**Follow-up 4: "Now there's a backing database — support read-through, write-through, and write-back."**
Already seamed via `CacheStore` + `WritePolicy`:
- **Read-through**: `getOrLoad` populates on miss.
- **Write-through**: `set` persists immediately (via `setAndFlush` when the caller needs to await); the entry is never dirty because it's always in sync — safest, higher write latency.
- **Write-back**: `set` marks the entry `dirty` and defers persistence; a dirty entry is flushed on eviction/expiry (see `evictOne`/`dropExpired`). Add a periodic background flush of all dirty entries for durability, and flush-on-`dispose()` so a graceful shutdown doesn't lose writes. Discuss the trade-off out loud: write-back has lower write latency and coalesces repeated writes to the same key, but **risks data loss on crash** for un-flushed dirty entries — an explicit durability-vs-latency choice.

**Follow-up 5: "Two callers ask for the same missing key at once — you hit the DB twice (cache stampede). Fix it."**
The senior flourish: coalesce concurrent loads by caching the *in-flight promise*, not just the value. A single-flight wrapper:

```ts
class SingleFlightCache<K, V> {
  private readonly inflight = new Map<K, Promise<V | undefined>>();
  constructor(private readonly cache: Cache<K, V>) {}

  async get(key: K, loader: (k: K) => Promise<V | undefined>): Promise<V | undefined> {
    const hit = this.cache.get(key);
    if (hit !== undefined) return hit;

    const pending = this.inflight.get(key);
    if (pending) return pending;                 // join the in-flight load — no duplicate DB hit

    const p = (async () => {
      try {
        const value = await loader(key);
        if (value !== undefined) this.cache.set(key, value);
        return value;
      } finally {
        this.inflight.delete(key);               // always clear, even on error
      }
    })();
    this.inflight.set(key, p);
    return p;
  }
}
```

Explain the failure it prevents: on a hot-key miss under load (e.g., a popular product page just expired), N concurrent requests would each independently hit the DB, amplifying a cache miss into a DB stampede that can take the DB down. Single-flight collapses them into one load; the rest await the same promise. The `finally` cleanup is essential — leaking the in-flight map on error would permanently poison that key.

**Follow-up 6: "Now run it across a 10-instance cluster."**
Scope-honest answer: this is a *different problem*. Options: (a) each instance keeps its own local cache (simple, but 10× the memory and inconsistent — invalidation is hard); (b) a shared external cache (Redis) — now it's a network hop, and you're into serialization, connection pooling, and Redis eviction policies (`maxmemory-policy allkeys-lru`); (c) a two-tier cache (local L1 + Redis L2) with a pub/sub invalidation channel so a write on one instance evicts the stale L1 copies on the others. The key senior point: **cross-instance invalidation is the hard part**, not the storage — and it changes the consistency model, so it belongs in a system-design conversation, not bolted onto this library's core.

**Follow-up 7: "How do you evict expired entries promptly without an O(n) sweep?"**
The `sweepExpired` I wrote is O(n) per sweep — fine for modest sizes, wasteful at scale. Better: maintain a **min-heap (priority queue) keyed by `expiresAt`**, or **bucketed timing wheels**, so the sweeper only touches entries that are actually due. Trade-off: O(log n) insert on every `set` with a TTL vs O(1) today, in exchange for O(k) sweeps (k = number actually expired) instead of O(n). State the trade-off; only add the heap if TTL entries are numerous and sweeps show up in profiling — otherwise it's premature.

**Interview trap:** "For write-back, just flush on a timer and you're safe." A timer alone loses every dirty entry written since the last tick if the process crashes — and loses dirty entries evicted *between* ticks unless you also flush on eviction. Durability for write-back requires flush-on-eviction **and** flush-on-shutdown (`dispose`) **and** ideally a bounded dirty-queue with backpressure so a slow backing store can't let dirty entries pile up unboundedly. Saying "write-back trades durability for latency, here's exactly what I do to bound the loss window" is the answer; "flush on a timer" alone is the trap.

---

## Step 5: What gets you rejected

The mistakes that end this interview — review them the night before, they're the cheapest points you'll ever score:

- **Hard-coding LRU into the cache core.** The prompt says *library*; if `get`/`set`/eviction mention a linked list directly and the first "now make it LFU" forces you to edit them, you've failed the one thing this problem tests. Eviction must be a `Strategy` from minute one.

- **An O(n) LRU.** Using an array and `indexOf`/`splice`/`shift` for recency ordering is O(n) per operation and is an instant senior-level rejection. LRU *is* the "doubly-linked list + hashmap for O(1)" question; not knowing that means not knowing the canonical answer. (Leaning on `Map` insertion order is acceptable *only* if you say so and can produce the DLL version on request — see lesson 3.3 for that trick.)

- **Forgetting that `put` on an existing key is a "use."** Updating a key must refresh its recency (LRU) and update its value; treating an update as a no-op for ordering is the single most common LRU bug. Say it out loud when you clarify.

- **Only lazy expiry, then claiming memory is bounded.** Lazy expiry alone means an expired-but-never-accessed entry occupies the cache forever — so a cache full of expired keys never shrinks and can starve live keys. If you promise bounded memory, you need active expiry (or expiry-aware eviction). Conversely, only active expiry (no lazy check on read) can *serve stale data* in the window before the next sweep. You need both, and you must know which guarantee each provides.

- **Using a plain object (`Record<string, V>`) instead of `Map`.** Objects coerce keys to strings (breaks non-string keys), inherit prototype keys (`__proto__`, `constructor` collisions — a security and correctness bug), and have unpredictable performance for delete-heavy workloads. `Map` is the correct choice for a cache; using an object is a small tell that you haven't built one for real.

- **Sleeping in tests instead of an injectable clock.** `await sleep(100)` to test a 100ms TTL makes tests slow, flaky, and non-deterministic. A `Clock` seam that tests advance manually is the senior default; not having one when asked "how do you test TTL?" is a miss.

- **Ignoring the cache-stampede / thundering-herd problem.** At senior level, "what happens when a hot key expires under load?" is expected. If your answer lets N concurrent misses each hit the backing store, you've designed a cache that *amplifies* load exactly when the system is stressed. The single-flight in-flight-promise pattern is the expected answer.

- **Write-back without a durability story.** Deferring writes is fine; deferring them with no flush-on-eviction, no flush-on-shutdown, and no bound on the dirty set is a data-loss bug wearing a performance-optimization costume. State the loss window and how you bound it.

- **Not stating the memory bound.** A senior can say "this cache holds at most `capacity` entries, each ≤ `sizeof(value)`, so worst-case N·S bytes, and TTL + active expiry keeps it from filling with dead entries." An unbounded or unstated memory footprint is the failure a cache exists to prevent — be able to name the bound of every configuration you propose.

The through-line the interviewer is grading: did you build a *configurable library with clean seams* (eviction, TTL, write policy, clock all swappable) with a *correct O(1) core*, and can you absorb every "now change X" as a new class rather than a rewrite? Get the LRU O(1), make eviction pluggable, handle both expiry modes, and have a stampede answer ready — that's the senior pass.
