# LRU & LFU Cache - Machine Coding Round

> **Interview prompt (as given):**
> "Design and implement an in-memory cache with a fixed capacity. Implement `get(key)` and `put(key, value)` in O(1) time. When the cache is full, evict the least recently used entry (LRU). Then extend it: (a) evict by least frequently used (LFU) with LRU tie-break, (b) support per-entry TTL. Working code judged by passing test cases. 45-60 minutes."

## Requirements

- `get(key)` returns the value or `undefined` (or `-1` in LeetCode-style variants); marks the entry as recently used.
- `put(key, value)` inserts or updates; updating an existing key must also mark it as recently used.
- `delete(key)` removes an entry.
- All operations O(1) — no scans, no sorting, no array `shift()`/`indexOf()`.
- Fixed `capacity`; when full, evict exactly one entry per insert of a new key.
- Generic over key and value types: `LRUCache<K, V>`.
- Extensions: LFU eviction (O(1), LRU tie-break within the same frequency), per-entry TTL with lazy expiry, and a discussion of concurrency (cache stampede).
- Edge cases: `capacity <= 0`, capacity 1, get on missing key, put on existing key when full.

The core insight the interviewer is testing: **O(1) recency ordering needs a doubly-linked list (O(1) unlink/relink) combined with a hashmap (O(1) lookup of the node to unlink).** Neither structure alone is enough — a hashmap has no order; a list has no O(1) lookup.

---

## Approach & time budget

Plan for a 50-minute round (compress or stretch the middle blocks for 45/60).

**0-5 min — Clarify and state the design.**
Ask: exact API (`undefined` vs `-1` on miss)? Is `capacity <= 0` possible? Should `put` on an existing key count as a "use"? (Yes — say it out loud, it is a classic trap.) Is this round about data structures or about shipping working code? That answer decides whether the JS `Map` trick is acceptable (see below).

**5-12 min — Draw the doubly-linked list FIRST, before writing any code.**
Draw: `HEAD <-> A <-> B <-> C <-> TAIL` with sentinel head/tail. Narrate the three primitives every operation reduces to:
1. `unlink(node)` — splice a node out: `node.prev.next = node.next; node.next.prev = node.prev`.
2. `insertAfterHead(node)` — make it most-recent.
3. `tail.prev` — the LRU victim.

Say explicitly: *"Sentinel head and tail nodes mean `node.prev` and `node.next` are never null for any real node, so unlink has zero branching."* Interviewers score you for knowing WHY sentinels exist, not just using them.

**12-27 min — Write the DLL-based `LRUCache<K, V>`.**
Node class, sentinels wired to each other in the constructor, `get`/`put`/`delete` in terms of the three primitives. Do NOT lean on `Map` iteration order for this implementation — the map is purely key -> node lookup. If time is very tight or the interviewer says "use built-ins", write the `Map` insertion-order trick in ~3 minutes instead and say you can do the DLL version on request — but ask first. If the round is explicitly about data structures, leading with the `Map` trick reads as dodging the question.

**27-35 min — Tests for LRU.**
Eviction order, get refreshes recency, put-on-existing refreshes recency AND updates value, capacity 1, capacity 0, delete. Run them. A passing test suite at minute 35 beats an untested LFU at minute 55.

**35-48 min — LFU.**
Draw the frequency-bucket picture: `freq 1 -> DLL of nodes, freq 2 -> DLL of nodes, ...` plus `minFreq`. Each bucket is itself an LRU list, which gives you the tie-break for free. Then code it. If the interviewer only asked for LRU, use this block for TTL and the coalescing wrapper instead.

**48-60 min — TTL variant, stampede discussion, remaining tests.**
TTL is a small delta on LRU (store `expiresAt`, check lazily in `get`, injectable clock so tests don't sleep). Close by narrating the async-stampede problem and the in-flight-promise dedup pattern — it is the "senior" flourish that distinguishes staff-level candidates.

**What to narrate throughout:** every mutation is "unlink, then relink at head" — one sentence per operation. When you evict, say "victim is `tail.prev`, remove from both list and map" — forgetting one of the two structures is the most common bug in this round.

---

## Implementation

All code below is complete, runnable TypeScript (no placeholders). Order: DLL-based LRU, Map-trick LRU, LFU, TTL-LRU, coalescing wrapper.

### 1. LRU with doubly-linked list + hashmap (the real answer)

```typescript
// ---------------------------------------------------------------------------
// LRUCache<K, V>
// - Map<K, Node> for O(1) lookup
// - Doubly-linked list for O(1) recency reordering
// - Sentinel head/tail: real nodes ALWAYS have non-null prev/next,
//   so unlink() needs zero null checks.
// - Most-recently-used lives right after head; LRU victim is tail.prev.
// - Does NOT rely on Map iteration order.
// ---------------------------------------------------------------------------

class DLLNode<K, V> {
  key: K;
  value: V;
  prev: DLLNode<K, V> | null = null;
  next: DLLNode<K, V> | null = null;

  constructor(key: K, value: V) {
    this.key = key;
    this.value = value;
  }
}

export class LRUCache<K, V> {
  private readonly capacity: number;
  private readonly map = new Map<K, DLLNode<K, V>>();
  private readonly head: DLLNode<K, V>; // sentinel: head.next = MRU
  private readonly tail: DLLNode<K, V>; // sentinel: tail.prev = LRU

  constructor(capacity: number) {
    if (!Number.isInteger(capacity)) {
      throw new TypeError(`capacity must be an integer, got ${capacity}`);
    }
    this.capacity = capacity;
    // Sentinel nodes never hold real data; the casts are confined here.
    this.head = new DLLNode<K, V>(undefined as K, undefined as V);
    this.tail = new DLLNode<K, V>(undefined as K, undefined as V);
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  get size(): number {
    return this.map.size;
  }

  get(key: K): V | undefined {
    const node = this.map.get(key);
    if (node === undefined) return undefined;
    // Reading IS a use: move to front.
    this.unlink(node);
    this.insertAfterHead(node);
    return node.value;
  }

  /** Peek without touching recency — handy for tests and debugging. */
  peek(key: K): V | undefined {
    return this.map.get(key)?.value;
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  put(key: K, value: V): void {
    if (this.capacity <= 0) return; // cache disabled: store nothing, throw nothing

    const existing = this.map.get(key);
    if (existing !== undefined) {
      // Update value AND refresh recency. Doing only one is a classic bug.
      existing.value = value;
      this.unlink(existing);
      this.insertAfterHead(existing);
      return;
    }

    if (this.map.size >= this.capacity) {
      // Evict LRU: the node just before the tail sentinel.
      const victim = this.tail.prev!; // sentinel guarantees non-null
      this.unlink(victim);
      this.map.delete(victim.key); // remove from BOTH structures
    }

    const node = new DLLNode(key, value);
    this.map.set(key, node);
    this.insertAfterHead(node);
  }

  delete(key: K): boolean {
    const node = this.map.get(key);
    if (node === undefined) return false;
    this.unlink(node);
    this.map.delete(key);
    return true;
  }

  clear(): void {
    this.map.clear();
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  /** MRU -> LRU order. Useful for asserting eviction order in tests. */
  keys(): K[] {
    const out: K[] = [];
    let cur = this.head.next!;
    while (cur !== this.tail) {
      out.push(cur.key);
      cur = cur.next!;
    }
    return out;
  }

  // --- DLL primitives -----------------------------------------------------

  private unlink(node: DLLNode<K, V>): void {
    // Thanks to sentinels, prev/next are never null for a linked real node.
    node.prev!.next = node.next;
    node.next!.prev = node.prev;
    node.prev = null;
    node.next = null;
  }

  private insertAfterHead(node: DLLNode<K, V>): void {
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next!.prev = node;
    this.head.next = node;
  }
}
```

**Interview trap:** `put` on an EXISTING key must both update the value and move the node to the front. Candidates routinely handle only the insert path, so `put('a', 2)` on a full cache leaves `'a'` at the back and it gets evicted next — tests catch this instantly. Same rule for LFU: an update increments frequency too.

**Interview trap:** sentinel head/tail nodes eliminate every null check in `unlink`/`insertAfterHead`. Say this out loud when you draw the list ("I'm adding dummy head and tail so I never branch on empty-list or end-of-list"). Without sentinels you need four special cases (empty list, single node, head removal, tail removal) and the off-by-one bugs that come with them.

### 2. The JS `Map` insertion-order trick (know it, and know when it's allowed)

JavaScript's `Map` iterates in insertion order, and `delete` + `set` moves a key to the back. That makes the *back* of the Map the MRU and the *front* (`map.keys().next().value`) the LRU.

```typescript
// LRU in ~30 lines using Map's guaranteed insertion order.
// Back of the Map = most recently used; front = eviction victim.
export class LRUCacheMap<K, V> {
  private readonly map = new Map<K, V>();

  constructor(private readonly capacity: number) {}

  get size(): number {
    return this.map.size;
  }

  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key)!;
    // Re-insert to move the key to the back (most recent).
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  put(key: K, value: V): void {
    if (this.capacity <= 0) return;
    if (this.map.has(key)) {
      this.map.delete(key); // refresh recency on update too
    } else if (this.map.size >= this.capacity) {
      // Oldest insertion = first key in iteration order = LRU victim.
      const lruKey = this.map.keys().next().value as K;
      this.map.delete(lruKey);
    }
    this.map.set(key, value);
  }

  delete(key: K): boolean {
    return this.map.delete(key);
  }
}
```

**When is this acceptable?**

- **Fine:** as a stated first pass ("I'll get a correct version in five minutes, then build the DLL version"), or when the interviewer explicitly says "use built-ins" / the round is about product code, not data structures. In production TypeScript this IS what you'd ship — it's simpler and V8 makes delete+set effectively O(1).
- **Risky:** if the round is explicitly a data-structures exercise. Leaning on the language runtime's ordered hashmap sidesteps exactly the thing being tested, and a follow-up like "now do LFU with LRU tie-break" or "port this to Go" exposes it.
- **What to do:** ask. One sentence — *"JS Maps preserve insertion order, so there's a 30-line version using that; do you want the explicit linked-list implementation or is the built-in fine?"* — shows you know both and lets the interviewer pick. That question is itself a signal.

### 3. LFU with frequency buckets — O(1) everything

Design: `keyMap: key -> node` (node carries `freq`), `freqMap: freq -> doubly-linked list of nodes at that frequency`, and a `minFreq` counter. Each frequency bucket is an LRU list, so evicting from the `minFreq` bucket's tail gives the required "least frequent, tie-broken by least recent" in O(1).

`minFreq` bookkeeping — the whole trick:
- Inserting a NEW key: its freq is 1, so `minFreq = 1` unconditionally.
- Touching a key (get, or put on existing): it moves from bucket `f` to bucket `f+1`. If bucket `f` becomes empty AND `f === minFreq`, then `minFreq = f + 1`. No other case changes `minFreq` — you never scan for it.

```typescript
// ---------------------------------------------------------------------------
// LFUCache<K, V> — O(1) get/put/delete.
// keyMap:  key  -> node (value + freq + list links)
// freqMap: freq -> DLL of nodes with that freq, MRU at head, LRU at tail
// minFreq: smallest freq present; the eviction bucket.
// ---------------------------------------------------------------------------

class LFUNode<K, V> {
  freq = 1;
  prev: LFUNode<K, V> | null = null;
  next: LFUNode<K, V> | null = null;
  constructor(public key: K, public value: V) {}
}

/** A tiny DLL with sentinels; each frequency bucket is one of these. */
class FreqList<K, V> {
  private readonly head = new LFUNode<K, V>(undefined as K, undefined as V);
  private readonly tail = new LFUNode<K, V>(undefined as K, undefined as V);
  size = 0;

  constructor() {
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  addToFront(node: LFUNode<K, V>): void {
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next!.prev = node;
    this.head.next = node;
    this.size++;
  }

  remove(node: LFUNode<K, V>): void {
    node.prev!.next = node.next;
    node.next!.prev = node.prev;
    node.prev = null;
    node.next = null;
    this.size--;
  }

  /** LRU node within this frequency bucket (the tie-break victim). */
  removeLast(): LFUNode<K, V> | null {
    if (this.size === 0) return null;
    const node = this.tail.prev!;
    this.remove(node);
    return node;
  }
}

export class LFUCache<K, V> {
  private readonly keyMap = new Map<K, LFUNode<K, V>>();
  private readonly freqMap = new Map<number, FreqList<K, V>>();
  private minFreq = 0;

  constructor(private readonly capacity: number) {}

  get size(): number {
    return this.keyMap.size;
  }

  get(key: K): V | undefined {
    const node = this.keyMap.get(key);
    if (node === undefined) return undefined;
    this.touch(node);
    return node.value;
  }

  put(key: K, value: V): void {
    if (this.capacity <= 0) return;

    const existing = this.keyMap.get(key);
    if (existing !== undefined) {
      existing.value = value; // update value...
      this.touch(existing);   // ...AND count it as a use
      return;
    }

    if (this.keyMap.size >= this.capacity) {
      // Evict: LRU node within the minimum-frequency bucket.
      const bucket = this.freqMap.get(this.minFreq)!;
      const victim = bucket.removeLast()!;
      this.keyMap.delete(victim.key);
      if (bucket.size === 0) this.freqMap.delete(this.minFreq);
    }

    const node = new LFUNode(key, value);
    this.keyMap.set(key, node);
    this.bucketFor(1).addToFront(node);
    this.minFreq = 1; // a brand-new key ALWAYS resets minFreq to 1
  }

  delete(key: K): boolean {
    const node = this.keyMap.get(key);
    if (node === undefined) return false;
    const bucket = this.freqMap.get(node.freq)!;
    bucket.remove(node);
    if (bucket.size === 0) {
      this.freqMap.delete(node.freq);
      if (this.minFreq === node.freq) {
        // Rare non-O(1) path only on explicit delete; get/put stay O(1).
        this.minFreq = this.keyMap.size === 0
          ? 0
          : Math.min(...this.freqMap.keys());
      }
    }
    this.keyMap.delete(key);
    return true;
  }

  /** Exposed for tests: current frequency of a key (undefined if absent). */
  freqOf(key: K): number | undefined {
    return this.keyMap.get(key)?.freq;
  }

  // --- internals ------------------------------------------------------------

  /** Move node from bucket f to bucket f+1; maintain minFreq. */
  private touch(node: LFUNode<K, V>): void {
    const oldFreq = node.freq;
    const oldBucket = this.freqMap.get(oldFreq)!;
    oldBucket.remove(node);
    if (oldBucket.size === 0) {
      this.freqMap.delete(oldFreq);
      if (this.minFreq === oldFreq) this.minFreq = oldFreq + 1;
    }
    node.freq = oldFreq + 1;
    this.bucketFor(node.freq).addToFront(node);
  }

  private bucketFor(freq: number): FreqList<K, V> {
    let bucket = this.freqMap.get(freq);
    if (bucket === undefined) {
      bucket = new FreqList<K, V>();
      this.freqMap.set(freq, bucket);
    }
    return bucket;
  }
}
```

**Interview trap:** when a NEW key is inserted into an LFU cache, `minFreq` must be reset to `1` unconditionally — the new key is the least-frequent item by definition. Candidates who only update `minFreq` inside `touch` end up with `minFreq` pointing at an empty or wrong bucket, and eviction either crashes or evicts the wrong key. Corollary trap: `minFreq` only ever moves UP by exactly one (to `f+1`) when the current min bucket empties on a touch — if you find yourself scanning `freqMap` for the minimum inside `get`/`put`, your design is O(n) and you have lost the "O(1) all ops" requirement.

*Alternative bucket structure:* instead of a hand-rolled DLL per frequency, `Map<number, Set<K>>` works in JS because `Set` also preserves insertion order (`set.values().next().value` = oldest = tie-break victim, `delete` + `add` = refresh). Same acceptability caveat as the Map-trick LRU — it leans on runtime iteration order, so ask before using it in a data-structures round.

### 4. TTL variant: LRU + per-entry `expiresAt`, lazy expiry, injectable clock

Composition over modification: wrap values as `{ value, expiresAt }` on top of the DLL LRU. Expiry is *lazy* — checked on read — so no timers are needed and all ops stay O(1). The clock is injected so tests use a fake clock instead of `sleep`.

```typescript
interface TTLEntry<V> {
  value: V;
  /** Absolute epoch ms after which the entry is dead. Infinity = no TTL. */
  expiresAt: number;
}

export class TTLLRUCache<K, V> {
  private readonly inner: LRUCache<K, TTLEntry<V>>;

  constructor(
    capacity: number,
    private readonly defaultTtlMs: number = Infinity,
    private readonly now: () => number = Date.now, // injectable clock
  ) {
    this.inner = new LRUCache<K, TTLEntry<V>>(capacity);
  }

  get(key: K): V | undefined {
    const entry = this.inner.get(key);
    if (entry === undefined) return undefined;
    if (this.now() >= entry.expiresAt) {
      // Lazy expiry: dead entry discovered on read — purge and report a miss.
      this.inner.delete(key);
      return undefined;
    }
    return entry.value;
  }

  put(key: K, value: V, ttlMs: number = this.defaultTtlMs): void {
    const expiresAt = ttlMs === Infinity ? Infinity : this.now() + ttlMs;
    this.inner.put(key, { value, expiresAt });
  }

  has(key: K): boolean {
    // Must apply expiry semantics; a dead entry is NOT present.
    const entry = this.inner.peek(key);
    if (entry === undefined) return false;
    if (this.now() >= entry.expiresAt) {
      this.inner.delete(key);
      return false;
    }
    return true;
  }

  delete(key: K): boolean {
    return this.inner.delete(key);
  }

  get size(): number {
    // Note: may count expired-but-not-yet-purged entries (lazy expiry).
    return this.inner.size;
  }
}
```

Trade-off to narrate: lazy expiry means dead entries occupy capacity until read or evicted. If that matters (large values, hot capacity), add *active* expiry — see follow-ups.

### 5. Request coalescing / stampede protection (the async wrapper)

JavaScript is single-threaded, so the synchronous cache above has no data races — no locks needed, ever, for `get`/`put`. The real concurrency bug in JS is the **async cache stampede**: ten concurrent requests `await` a miss for the same key, and all ten call the expensive loader. The fix is to cache the *in-flight promise*, not just the resolved value:

```typescript
export class CoalescingCache<K, V> {
  private readonly inflight = new Map<K, Promise<V>>();

  constructor(
    private readonly cache: TTLLRUCache<K, V>,
    private readonly loader: (key: K) => Promise<V>,
  ) {}

  async get(key: K): Promise<V> {
    const hit = this.cache.get(key);
    if (hit !== undefined) return hit;

    // Coalesce: if a load for this key is already in flight, share it.
    const pending = this.inflight.get(key);
    if (pending !== undefined) return pending;

    const promise = this.loader(key)
      .then((value) => {
        this.cache.put(key, value);
        return value;
      })
      .finally(() => {
        // Always clear, even on failure — otherwise one failed load
        // poisons the key forever (all future gets await a rejected promise).
        this.inflight.delete(key);
      });

    this.inflight.set(key, promise);
    return promise;
  }
}
```

Points to make unprompted:
- The `finally` cleanup is load-bearing. Without it, a rejected promise stays in `inflight` and every future `get` for that key rejects — a "negative cache forever" bug.
- The synchronous section from `cache.get` through `inflight.set` runs without interleaving (single-threaded event loop), so no check-then-act race exists *within* it. The race only appears across `await` boundaries — which is exactly what the in-flight map handles.
- Optional refinement: put failed loads in a short-TTL negative cache to avoid hammering a down dependency.

**How you'd do this in Java/Go (interviewers ask):**
- **Java:** simplest — wrap methods with a single `ReentrantLock` or `synchronized`; better — `ConcurrentHashMap` for the index plus a lock guarding list surgery; best under contention — **striped locks** (`N` locks, pick by `hash(key) % N`, like the old `ConcurrentHashMap` segments) so unrelated keys don't serialize. For coalescing, `ConcurrentHashMap.computeIfAbsent(key, k -> loadAsync(k))` gives per-key single-flight; Guava's `LoadingCache` and Caffeine do this out of the box (Caffeine also uses lossy read buffers so gets don't take the lock).
- **Go:** `sync.Mutex` (or `sync.RWMutex`) around map + list — note `RWMutex` is awkward for LRU because even `Get` *writes* the recency list; shard the cache into `N` independent locked shards for parallelism (this is what `groupcache`/`ristretto`-style caches do); `golang.org/x/sync/singleflight` is the canonical stampede/coalescing primitive.

---

## Test cases

Runnable with plain `node:assert` — `npx tsx cache.test.ts` (or swap `assert` calls for `expect` under vitest; structure is identical).

```typescript
import assert from "node:assert/strict";
import { LRUCache } from "./lru";
import { LRUCacheMap } from "./lru-map";
import { LFUCache } from "./lfu";
import { TTLLRUCache } from "./ttl-lru";
import { CoalescingCache } from "./coalescing";

// ---------------------------------------------------------------------------
// LRU (run the same suite against both implementations)
// ---------------------------------------------------------------------------
for (const [name, make] of [
  ["DLL LRU", (n: number) => new LRUCache<string, number>(n)],
  ["Map LRU", (n: number) => new LRUCacheMap<string, number>(n)],
] as const) {

  // get on missing key
  {
    const c = make(2);
    assert.equal(c.get("nope"), undefined, `${name}: miss returns undefined`);
  }

  // basic put/get
  {
    const c = make(2);
    c.put("a", 1);
    assert.equal(c.get("a"), 1, `${name}: basic get`);
  }

  // eviction order: oldest untouched key goes first
  {
    const c = make(2);
    c.put("a", 1);
    c.put("b", 2);
    c.put("c", 3); // evicts "a"
    assert.equal(c.get("a"), undefined, `${name}: a evicted`);
    assert.equal(c.get("b"), 2, `${name}: b survives`);
    assert.equal(c.get("c"), 3, `${name}: c survives`);
  }

  // get refreshes recency
  {
    const c = make(2);
    c.put("a", 1);
    c.put("b", 2);
    c.get("a");        // "a" is now MRU; "b" is LRU
    c.put("c", 3);     // evicts "b", NOT "a"
    assert.equal(c.get("a"), 1, `${name}: refreshed a survives`);
    assert.equal(c.get("b"), undefined, `${name}: b evicted`);
  }

  // THE classic: put on existing key updates value AND refreshes recency
  {
    const c = make(2);
    c.put("a", 1);
    c.put("b", 2);
    c.put("a", 99);    // update: "a" becomes MRU, "b" becomes LRU
    c.put("c", 3);     // must evict "b"
    assert.equal(c.get("a"), 99, `${name}: updated value`);
    assert.equal(c.get("b"), undefined, `${name}: b evicted after a-update`);
    assert.equal(c.size, 2, `${name}: update did not grow size`);
  }

  // capacity 1: every new key evicts the previous one
  {
    const c = make(1);
    c.put("a", 1);
    c.put("b", 2);
    assert.equal(c.get("a"), undefined, `${name}: cap1 evicts a`);
    assert.equal(c.get("b"), 2, `${name}: cap1 keeps b`);
    c.put("b", 20); // update at full capacity must NOT evict b itself
    assert.equal(c.get("b"), 20, `${name}: cap1 update in place`);
  }

  // capacity 0: stores nothing, never throws
  {
    const c = make(0);
    c.put("a", 1);
    assert.equal(c.get("a"), undefined, `${name}: cap0 stores nothing`);
    assert.equal(c.size, 0, `${name}: cap0 size stays 0`);
  }

  // delete
  {
    const c = make(2);
    c.put("a", 1);
    assert.equal(c.delete("a"), true, `${name}: delete existing`);
    assert.equal(c.delete("a"), false, `${name}: delete missing`);
    assert.equal(c.get("a"), undefined, `${name}: deleted is gone`);
    c.put("b", 2); c.put("c", 3); // fits: "a" freed a slot
    assert.equal(c.size, 2, `${name}: size after delete+refill`);
  }
}

// DLL-specific: internal order sanity via keys() (MRU -> LRU)
{
  const c = new LRUCache<string, number>(3);
  c.put("a", 1); c.put("b", 2); c.put("c", 3);
  c.get("a");
  assert.deepEqual(c.keys(), ["a", "c", "b"], "MRU->LRU order after get(a)");
}

// ---------------------------------------------------------------------------
// LFU
// ---------------------------------------------------------------------------

// frequency increments and drives eviction
{
  const c = new LFUCache<string, number>(2);
  c.put("a", 1);
  c.put("b", 2);
  c.get("a"); // freq: a=2, b=1
  assert.equal(c.freqOf("a"), 2);
  assert.equal(c.freqOf("b"), 1);
  c.put("c", 3); // evicts "b" (lowest freq)
  assert.equal(c.get("b"), undefined, "LFU evicts lowest-freq key");
  assert.equal(c.get("a"), 1, "high-freq key survives");
}

// LRU tie-break within the same frequency
{
  const c = new LFUCache<string, number>(2);
  c.put("a", 1); // freq 1
  c.put("b", 2); // freq 1 — same freq as a, but a is older (least recent)
  c.put("c", 3); // tie at freq 1 -> evict least recently used = "a"
  assert.equal(c.get("a"), undefined, "tie-break evicts LRU within bucket");
  assert.equal(c.get("b"), 2);
}

// new key resets minFreq to 1: hot keys don't protect stale ones forever
{
  const c = new LFUCache<string, number>(2);
  c.put("a", 1);
  c.get("a"); c.get("a"); // a: freq 3
  c.put("b", 2);          // b: freq 1; minFreq must be 1 now
  c.put("c", 3);          // must evict "b" (freq 1), NOT "a"
  assert.equal(c.get("b"), undefined, "minFreq reset caught the new key");
  assert.equal(c.get("a"), 1);
  assert.equal(c.get("c"), 3);
}

// put on existing key counts as a use (freq++) and updates value
{
  const c = new LFUCache<string, number>(2);
  c.put("a", 1);
  c.put("b", 2);
  c.put("a", 10); // a: freq 2, value 10
  assert.equal(c.freqOf("a"), 2, "update increments freq");
  c.put("c", 3);  // evicts "b" (freq 1)
  assert.equal(c.get("a"), 10, "update changed value");
  assert.equal(c.get("b"), undefined);
}

// LFU edge cases: capacity 0 and 1, delete
{
  const zero = new LFUCache<string, number>(0);
  zero.put("a", 1);
  assert.equal(zero.get("a"), undefined, "LFU cap0 stores nothing");

  const one = new LFUCache<string, number>(1);
  one.put("a", 1);
  one.get("a"); one.get("a");
  one.put("b", 2); // even a hot key is evicted when it's the only candidate
  assert.equal(one.get("a"), undefined, "LFU cap1 evicts sole entry");
  assert.equal(one.get("b"), 2);

  const d = new LFUCache<string, number>(2);
  d.put("a", 1);
  assert.equal(d.delete("a"), true);
  assert.equal(d.delete("a"), false);
  assert.equal(d.get("a"), undefined);
}

// ---------------------------------------------------------------------------
// TTL-LRU with a fake clock (no sleeps in tests)
// ---------------------------------------------------------------------------
{
  let now = 1_000_000;
  const clock = () => now;
  const c = new TTLLRUCache<string, string>(2, /*defaultTtlMs*/ 500, clock);

  c.put("a", "alpha");            // expires at now + 500
  assert.equal(c.get("a"), "alpha", "fresh entry hits");

  now += 499;
  assert.equal(c.get("a"), "alpha", "1ms before expiry still hits");

  now += 1;                        // exactly at expiresAt -> expired
  assert.equal(c.get("a"), undefined, "expired entry misses");
  assert.equal(c.has("a"), false, "expired entry not present");
  assert.equal(c.size, 0, "lazy expiry purged on read");

  c.put("b", "beta", 100);         // per-entry TTL overrides default
  c.put("forever", "x", Infinity); // no TTL
  now += 101;
  assert.equal(c.get("b"), undefined, "per-entry TTL respected");
  assert.equal(c.get("forever"), "x", "Infinity TTL never expires");

  // TTL layer must not break LRU eviction underneath
  c.put("p", "1", Infinity);
  c.put("q", "2", Infinity); // capacity 2 -> evicts "forever" (LRU)
  assert.equal(c.get("forever"), undefined, "LRU still works under TTL");
}

// ---------------------------------------------------------------------------
// Coalescing: N concurrent misses -> exactly 1 loader call
// ---------------------------------------------------------------------------
{
  (async () => {
    let now = 0;
    let calls = 0;
    const inner = new TTLLRUCache<string, number>(10, Infinity, () => now);
    const loader = async (key: string) => {
      calls++;
      await new Promise((r) => setTimeout(r, 10)); // simulate slow fetch
      return key.length;
    };
    const c = new CoalescingCache(inner, loader);

    const results = await Promise.all([
      c.get("hello"), c.get("hello"), c.get("hello"),
    ]);
    assert.deepEqual(results, [5, 5, 5], "all awaiters get the value");
    assert.equal(calls, 1, "stampede coalesced into one load");

    await c.get("hello");
    assert.equal(calls, 1, "subsequent get is a cache hit");

    // failed load must not poison the key
    let failFirst = true;
    const flaky = new CoalescingCache(
      new TTLLRUCache<string, number>(10),
      async () => {
        if (failFirst) { failFirst = false; throw new Error("boom"); }
        return 42;
      },
    );
    await assert.rejects(() => flaky.get("k"), /boom/);
    assert.equal(await flaky.get("k"), 42, "retry after failure succeeds");

    console.log("All tests passed.");
  })();
}
```

Testing notes to mention aloud: the fake clock (`() => now`) is why the TTL suite runs in microseconds with zero `setTimeout` flakiness — injecting the clock is a design decision made *for* testability. The LRU suite runs unchanged against both implementations, which is exactly the argument for writing tests against the interface, not the internals (the one `keys()` assertion is deliberately separate).

---

## Follow-up questions

**Q1. "Make it TTL-aware."**
Already shown (`TTLLRUCache`): per-entry `expiresAt`, lazy check on `get`/`has`, injectable clock. The follow-up inside the follow-up is *active expiry*: lazy expiry lets dead entries hold capacity until read. Options, cheapest first: (1) on each `put`, also peek `tail.prev` and drop it if expired — O(1), opportunistic; (2) a periodic sweep timer (`setInterval`) that walks a bounded sample — amortized cleanup, unbounded staleness in between; (3) a min-heap or hierarchical timing wheel keyed by `expiresAt` for exact earliest-expiry pops — heap makes expiry O(log n) and you must handle stale heap entries when a key is overwritten (tombstone or lazy-validate on pop). Redis combines lazy expiry with an active random-sampling loop (repeats while >25% of sampled keys are expired) — a good "in the real world" citation.

**Q2. "Make it thread-safe."**
In Node: sync ops are already race-free (single thread); the real hazard is the async stampede, solved by the in-flight promise map above. If actual parallelism is in play (worker_threads with SharedArrayBuffer, or another language): coarse lock first (`synchronized` / `sync.Mutex` around every op — correct, contended), then **striped locks / sharding** (N sub-caches, route by `hash(key) % N`; per-shard LRU order, which is fine — global LRU order is rarely a real requirement). Mention the subtlety that a read-write lock does NOT help a naive LRU because `get` mutates the recency list, so every op is a writer; production caches (Caffeine) sidestep this by buffering recency updates in lossy ring buffers and applying them in batches under a single lock. For coalescing: Java `computeIfAbsent` with async values, Go `singleflight`.

**Q3. "LRU vs LFU vs ARC/2Q — when would you pick which?"**
- **LRU:** cheapest, great for temporal locality. Weakness: a one-time sequential scan of cold data flushes the entire hot set ("scan pollution").
- **LFU:** protects long-term-popular items from scans. Weaknesses: new items start at freq 1 and are evicted before they can prove themselves (poor for shifting workloads), and stale-but-formerly-hot items linger — real LFUs add **aging/decay** (periodically halve counts) or use a probabilistic counter (Redis's LFU uses an 8-bit Morris-style counter plus a decay timer).
- **2Q / SLRU:** two queues — a small probationary FIFO/LRU and a protected LRU; entries are promoted only on a second hit. One extra hit of history buys scan resistance at LRU-like cost.
- **ARC (IBM, used in ZFS):** self-tunes the split between a recency list and a frequency list using ghost lists (evicted keys kept as metadata) to learn the workload. Excellent hit rates, more bookkeeping, and historically patent-encumbered.
- **W-TinyLFU (Caffeine):** small admission window + a frequency sketch (count-min) deciding whether a new entry may displace a victim. State of the art hit rates with tiny metadata. Interview answer in one line: *"LRU by default; 2Q/SLRU if scans hurt; TinyLFU if I can take a dependency; plain LFU almost never without aging."*

**Q4. "Size by bytes instead of entry count."**
Replace `size >= capacity` with `usedBytes + entryBytes > capacityBytes`, tracked incrementally: add on insert, subtract on evict/delete, and on *update* apply the delta (`new - old`) — recomputing totals is O(n) and forgetting the update-delta is the classic bug. Evict in a `while` loop, not `if`: one large insert may need to evict many small victims. Reject or bypass entries larger than total capacity (otherwise you evict everything and still fail). Sizing itself is the hard part: `Buffer.byteLength` for strings/buffers is exact; arbitrary object graphs need an injected `sizeOf(value)` (what Redis's `maxmemory` accounting and Caffeine's `Weigher` do — the cache trusts a per-entry weight function rather than measuring memory).

**Q5. "How does Redis actually do eviction?"**
Not a true LRU — a true one would need a global list plus per-access relinking across all keys. Redis stores a 24-bit access clock in each object header; on eviction pressure it **samples** `maxmemory-samples` random keys (default 5), keeps a small pool of the best candidates seen, and evicts the one with the oldest clock — *approximate* LRU, tunable accuracy vs CPU. At 10 samples it is close to exact LRU in practice. Policies: `allkeys-lru`, `volatile-lru` (only TTL'd keys), `allkeys-lfu`/`volatile-lfu` (8-bit log-scale counter with configurable decay), `volatile-ttl` (soonest-expiring first), `allkeys-random`, `noeviction`. The design lesson to state: at scale, *probabilistic-approximate* beats *exact-but-expensive* — the hit-rate difference is tiny and it avoids global data-structure maintenance on every read.

---

## What gets you rejected

- **Off-by-one / mis-ordered pointer surgery in `unlink`.** Writing `node.prev.next = node.next` after already overwriting `node.next`, or wiring `insertAfterHead` in the wrong order so `head.next` is updated before the new node captured the old `head.next`. Draw the four pointer assignments before typing them. Sentinels remove the null checks, not the ordering discipline.
- **`put` on an existing key that updates the value but not the recency** (or in LFU, not the frequency). The single most common failed test in this round.
- **O(n) eviction scans.** Iterating the map to find the oldest/least-frequent entry. The entire point of the exercise is that the victim is reachable in O(1): `tail.prev` for LRU, `freqMap.get(minFreq)` tail for LFU. Related smells: `Array.prototype.shift/indexOf/splice` anywhere in the hot path, or timestamping entries and sorting.
- **LFU without `minFreq`.** `Math.min(...freqMap.keys())` inside `put` is an O(n) evict wearing an O(1) costume. `minFreq` is maintained by exactly two rules (new key -> 1; min bucket emptied on touch -> +1) — know them cold.
- **Not handling `capacity <= 0`.** A zero-capacity cache that inserts then immediately evicts the wrong thing, or crashes on `tail.prev` being the head sentinel. Decide the behavior (no-op is standard), state it, test it.
- **Removing from one structure but not the other.** Evicting the DLL node but leaving the map entry (memory leak + resurrection bugs: `get` returns a node whose links are dead) or vice versa. Every eviction touches BOTH structures — say it every time.
- **Mutating during iteration.** Sweeping expired entries with `for (const k of map.keys()) map.delete(k)` interleaved with insertions, or walking the DLL while relinking nodes mid-walk without saving `next` first. Collect victims first, then delete; or snapshot `cur.next` before unlinking `cur`.
- **No tests, or tests written but never run.** The round is judged by passing test cases. A smaller feature set with green tests beats full LFU+TTL that was never executed.

**Interview trap:** capacity-1 update. `c.put("a", 1); c.put("a", 2)` on a capacity-1 cache must NOT evict — the eviction check belongs on the *new-key* path only. Implementations that evict before checking `map.has(key)` evict `"a"` and then re-insert it (looks fine) — until the LFU version does the same and silently resets the key's frequency to 1. Order of operations in `put`: existing? update-and-touch, return; full? evict; insert.
