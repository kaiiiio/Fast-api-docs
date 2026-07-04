# Lesson 4.3 — Design a URL Shortener

> Module: System Design (HLD) | Level: Senior | FDE Prep Phase 4

The URL shortener is the "easy" question, which is exactly why it's dangerous. Interviewers use it to calibrate: a mid-level candidate draws a box labeled "DB" and a box labeled "hash function" and is done in 15 minutes. A senior candidate uses the simplicity as a stage to demonstrate estimation discipline, ID-generation trade-offs, HTTP semantics that actually matter for the business (301 vs 302 is a revenue question, not trivia), and the judgment to *not* over-engineer. Your goal here is not to design something complicated — it's to show you know exactly where the complexity lives and where it doesn't.

---

## Step 1: Requirements (functional + non-functional)

### Clarifying questions to ask the interviewer

Ask these out loud. Each one signals a specific senior instinct:

1. **"What's the expected scale — new URLs per month and read/write ratio?"**
   Why it matters: everything downstream (DB choice, caching, ID generation) hangs on this. A shortener is famously read-heavy (~100:1). If the interviewer says 1000:1 or 10:1, your cache and storage story changes.
2. **"Do we need custom aliases (vanity URLs like `sho.rt/promo2026`)?"**
   Why it matters: custom aliases force a uniqueness check on a user-chosen namespace, which changes your write path from "generate unique ID, never collides" to "check-and-set, can fail." It also creates squatting/abuse concerns.
3. **"Do URLs expire? Default TTL or user-configurable?"**
   Why it matters: expiration determines whether storage grows unboundedly, whether you need a cleanup job, and whether short codes can ever be recycled (recycling is a security minefield — say so).
4. **"Do we need click analytics? Real-time or batch?"**
   Why it matters: analytics dictates redirect semantics (302 over 301) and adds an async pipeline. Real-time dashboards vs daily counts are wildly different systems.
5. **"Is this multi-tenant / do we have authenticated users, or anonymous shortening?"**
   Why it matters: anonymous shortening = abuse magnet (phishing, malware). It forces rate limiting and URL scanning into scope.
6. **"What availability/latency target for the redirect path?"**
   Why it matters: the redirect is the product. Creation can be slow; redirect must be fast (< 50 ms server-side) and essentially always up. This asymmetry drives the architecture.
7. **"Can the same long URL map to multiple short codes?"**
   Why it matters: deduplication sounds nice but breaks per-link analytics and custom aliases. Senior answer: allow duplicates; dedupe is an optimization with real product costs.

### Agreed functional requirements

- Shorten a long URL → short code (system-generated, base62, 7 chars).
- Optional custom alias (4–30 chars, unique namespace).
- Redirect short URL → original URL.
- Optional expiration (default: never; configurable TTL).
- Click analytics: count, timestamp, referrer, country (eventually consistent, not real-time-critical).
- Delete/disable a link (owner or abuse team).

### Agreed non-functional requirements

- Read:write ratio ~100:1. Redirects are the hot path.
- Redirect latency: p99 < 100 ms end-to-end server-side (target p50 ~10 ms with cache hit).
- Availability: 99.99% for redirects (creation can tolerate 99.9%).
- Short codes must be non-guessable *enough* — no trivially enumerable sequence exposing business volume.
- Durability: a created link must never silently disappear before expiry.
- Eventual consistency acceptable for analytics; redirect mapping must be read-your-writes for the creator (they immediately test their link).

**Interview trap:** Don't say "strong consistency everywhere." The mapping is immutable after creation — a short code never changes its target (edits, if allowed, are rare). Immutable data is the easiest thing in the world to cache and replicate. Saying you need linearizable reads for redirects tells the interviewer you reach for the expensive tool by default.

---

## Step 2: Estimation

Do this on the whiteboard, out loud, rounding aggressively.

**Writes (new URLs):**
- 100M new URLs/month.
- 100M / (30 days × 86,400 s) ≈ 100M / 2.6M s ≈ **~40 writes/s average**.
- Peak = 2–3× average → **~100–120 writes/s peak**. Trivial for any database.

**Reads (redirects):**
- 100:1 read ratio → 10B redirects/month.
- 10B / 2.6M s ≈ **~4,000 reads/s average**, peak **~10–12k reads/s**.
- This is the number that matters. 10k QPS of point lookups on an immutable key → cache territory.

**Storage (5 years):**
- 100M/month × 12 × 5 = **6B rows**.
- Per row: short code (7 B), long URL (avg ~200 B, allow 2 KB max), user_id (8 B), created_at + expires_at (16 B), flags (1 B), plus index overhead ≈ **~500 B/row** conservatively.
- 6B × 500 B = **3 TB over 5 years**.
- 3 TB fits on a single modern Postgres instance with room to spare. Say this explicitly — it's the anti-over-engineering signal.

**Cache sizing:**
- Pareto: ~20% of codes serve ~80% of traffic. But hot-set is even tighter: links are heavily accessed in their first days.
- Cache the hot 20% of *recently active* links, not 20% of all 6B. Assume 100M active links in any given week; 20% = 20M entries × ~250 B ≈ **5 GB**. One Redis node. Two for HA.

**Bandwidth:**
- Redirect response is ~500 B (headers + Location). 4k QPS × 500 B = 2 MB/s. Irrelevant. Say "bandwidth is a non-issue" and move on.

**Analytics volume:**
- 10B clicks/month × ~200 B/event = 2 TB/month of raw click events. This is your biggest data volume — bigger than the URL store. Flag it now; it justifies the Kafka pipeline later.

**Interview trap:** Candidates compute write QPS = 40 and then propose sharded Cassandra with a Zookeeper-coordinated ID service. The estimation exists to *prevent* that. The senior move is: "40 writes/s and 3 TB — a single Postgres primary with replicas handles this for years. Let me design for that, and I'll tell you what changes at 10×."

---

## Step 3: API design

REST, because this is a simple resource-oriented service. No WebSockets, no gRPC needed externally (gRPC internally between services if you split them, but don't split prematurely).

### Create a short URL

```
POST /api/v1/urls
Authorization: Bearer <token>          (optional for anonymous tier)
Content-Type: application/json

{
  "long_url": "https://example.com/some/very/long/path?utm_source=x",
  "custom_alias": "promo2026",         // optional
  "expires_at": "2027-01-01T00:00:00Z" // optional
}

201 Created
{
  "short_code": "promo2026",
  "short_url": "https://sho.rt/promo2026",
  "long_url": "https://example.com/...",
  "created_at": "2026-07-04T10:00:00Z",
  "expires_at": "2027-01-01T00:00:00Z"
}

409 Conflict   { "error": "alias_taken" }
422 Unprocessable { "error": "invalid_url" }        // failed validation/scan
429 Too Many Requests                                // rate limited
```

### Redirect (the product)

```
GET /{short_code}

302 Found
Location: https://example.com/some/very/long/path
Cache-Control: private, max-age=0

404 Not Found     (unknown code)
410 Gone          (expired or disabled — deliberately distinct from 404)
```

### Analytics

```
GET /api/v1/urls/{short_code}/stats?from=2026-06-01&to=2026-07-01&granularity=day

200 OK
{
  "short_code": "abc123X",
  "total_clicks": 48210,
  "series": [ { "date": "2026-06-01", "clicks": 1720 }, ... ],
  "top_referrers": [ { "referrer": "twitter.com", "clicks": 20411 } ],
  "top_countries": [ { "country": "IN", "clicks": 15002 } ]
}
```

### Delete/disable

```
DELETE /api/v1/urls/{short_code}
204 No Content
```

API design notes worth saying aloud:

- Redirect endpoint is on the apex domain (`sho.rt/{code}`), API on `api.sho.rt` or `/api/v1/`. Keeps the hot path's routing trivial.
- Idempotency: `POST /urls` accepts an `Idempotency-Key` header so client retries don't mint duplicate codes.
- Return `410 Gone` for expired links: it tells crawlers to deindex, and tells your support team "this existed" vs "this never existed."

**Interview trap:** Proposing `GET /api/v1/redirect?code=abc` for the redirect. The short URL *is* the product surface — it must be the shortest possible path on the shortest possible domain. Anyone who buries the redirect under an API prefix hasn't thought about what the system is for.

---

## Step 4: High-level architecture

```
                                    WRITE PATH (~100 QPS peak)
  +--------+     +-----+     +----------------+     +-------------------+
  | Client | --> | LB  | --> | Write Service  | --> | ID Generator      |
  +--------+     +-----+     | - validate URL |     | (counter ranges + |
                             | - scan/abuse   |     |  base62 encode)   |
                             | - rate limit   |     +-------------------+
                             +-------+--------+
                                     |
                                     v
                             +---------------+
                             |  Primary DB   |  (Postgres / DynamoDB)
                             |  urls table   |
                             +-------+-------+
                                     | async replication
        READ PATH (~10k QPS peak)   v
  +--------+   +-----+   +----------------+   miss   +--------------+
  | Client |-->| LB  |-->| Redirect Svc   | -------> | Read Replica |
  +--------+   +-----+   | 1. check cache |          +--------------+
                    ^    | 2. 302 + Loc.  |
                    |    +---+--------+---+
                 302|        |        |
                    +--------+        | fire-and-forget click event
                             hit ^    v
                        +-------+--+  +--------+     +-----------------+
                        |  Redis   |  | Kafka  | --> | Analytics       |
                        | (cache-  |  | clicks |     | consumer ->     |
                        |  aside)  |  | topic  |     | ClickHouse/S3   |
                        +----------+  +--------+     +-----------------+
```

Component walkthrough:

- **Load balancer / edge**: TLS termination, geo-routing later. Optionally a CDN in front, but be careful — CDN caching of redirects interacts badly with analytics (covered in Step 6).
- **Redirect service**: stateless, tiny, the thing you scale horizontally. Its entire job: cache lookup → 302 → emit click event. Keep it free of any synchronous dependency except Redis and the DB fallback.
- **Write service**: validates URL syntax, checks against malware/phishing blocklists (Google Safe Browsing API, async re-scan later), enforces rate limits, obtains a code from the ID generator, inserts.
- **ID generator**: counter-based with pre-allocated ranges (deep dive in Step 6). Not a hash function, not a KGS cluster — justified below.
- **Redis**: cache-aside for `code → long_url`. Immutable values, so no invalidation problem except delete/expire (handled by explicit `DEL` on those rare events).
- **Kafka + analytics store**: clicks are fire-and-forget from the redirect path. Consumers aggregate into ClickHouse (or DynamoDB counters + S3 for raw events if you want to stay simple).

**Interview trap:** Drawing the analytics write as a synchronous DB update on the redirect path ("increment click_count"). At 10k QPS that's 10k row updates/s on hot rows — lock contention on popular links, and your p99 redirect latency now includes a DB write. Analytics must be async or you fail the latency NFR.

---

## Step 5: Data model

### `urls` — the core table (Postgres flavor)

```sql
CREATE TABLE urls (
  short_code   VARCHAR(30) PRIMARY KEY,      -- 7-char generated OR custom alias
  long_url     TEXT        NOT NULL,          -- validated, <= 2048 chars
  user_id      BIGINT      NULL,              -- NULL for anonymous
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NULL,              -- NULL = never
  is_disabled  BOOLEAN     NOT NULL DEFAULT false,
  is_custom    BOOLEAN     NOT NULL DEFAULT false
);

CREATE INDEX idx_urls_user      ON urls (user_id, created_at DESC);  -- "my links" page
CREATE INDEX idx_urls_expires   ON urls (expires_at)
  WHERE expires_at IS NOT NULL;                                       -- partial: cleanup scans only expiring rows
```

- Primary key = short_code. Every redirect is a PK point lookup. There is no smarter access pattern to design for.
- Partial index on `expires_at` keeps the cleanup job cheap without bloating the index with 6B NULLs.
- No `click_count` column here. Counters live in the analytics store; keeping them here invites the synchronous-update trap.

### `click_events` — analytics (ClickHouse flavor)

```sql
CREATE TABLE click_events (
  short_code   String,
  clicked_at   DateTime,
  referrer     String,
  country      FixedString(2),
  user_agent_hash UInt64,
  ip_hash      UInt64            -- hashed for privacy; raw IP never stored
) ENGINE = MergeTree()
  PARTITION BY toYYYYMM(clicked_at)
  ORDER BY (short_code, clicked_at)
  TTL clicked_at + INTERVAL 13 MONTH;   -- raw events age out; aggregates kept
```

Plus a materialized view rolling up to `(short_code, day) → count` for the stats API.

### Which datastore, and why — the sizing argument

| Option | Fit | Reasoning |
|---|---|---|
| **Postgres (primary + 2 replicas)** | Excellent at this scale | 3 TB / 6B rows / 100 writes/s / 10k reads/s (mostly absorbed by Redis anyway). PK lookups on a b-tree are ~sub-ms. Transactions make custom-alias check-and-set trivial. You already run it. |
| **DynamoDB / KV store** | Also excellent | Perfect access pattern match: get-by-key, immutable values. Pay-per-request, no ops. Conditional writes (`attribute_not_exists`) handle alias uniqueness. Choose this if you're serverless-native. |
| **Cassandra** | Overkill | Justified at 100× write volume or multi-region active-active writes. At 100 writes/s you're buying operational cost for nothing. |
| **MongoDB** | Fine but unmotivated | No document structure to exploit; the row is flat. Doesn't beat either option above. |

Senior framing to say out loud: *"Both Postgres and DynamoDB are correct here, and I'd pick based on the org's existing operational muscle. The wrong answer is anything that needs a dedicated team. The data is immutable KV — the database is the least interesting part of this design."*

**Interview trap:** Storing the auto-increment integer ID as the primary key and the short code as a secondary unique index "for flexibility." The code *is* the key. Every redirect would pay a secondary-index hop for zero benefit. Model around the access pattern.

---

## Step 6: Deep dives

This is where the interview is actually decided. Two mandatory deep dives, one supporting.

### Deep dive A: Short-code generation

First, the math that frames everything. Base62 = `[a-zA-Z0-9]`, 62 characters.

- 6 chars: 62^6 ≈ 56.8 billion
- **7 chars: 62^7 ≈ 3.52 trillion**
- 8 chars: 62^8 ≈ 218 trillion

At 100M new URLs/month = 1.2B/year, 7 characters gives 3.5T / 1.2B ≈ **~2,900 years of headroom**. 6 chars gives ~47 years — arguably enough, but 7 is the standard answer and leaves room for random-generation sparsity. Do this arithmetic on the board; it takes 20 seconds and proves you don't hand-wave capacity.

Four generation strategies:

| Strategy | How | Pros | Cons | Verdict |
|---|---|---|---|---|
| **Counter + base62** | Global counter; encode integer to base62 | Zero collisions by construction; short codes; trivially simple; codes are dense (can start at 6 chars) | Counter is a SPOF/bottleneck if naive; **sequential codes leak business info** (see below); enumerable by crawlers | **Winner, with range-allocation + obfuscation** |
| **Random + collision check** | Generate random 7 chars; INSERT, retry on conflict | No coordination; codes non-guessable | Needs uniqueness check per write; retry loop; collision probability grows as space fills (birthday effect — negligible at 6B/3.5T ≈ 0.17% occupancy, but the *check* still costs a round trip) | Solid runner-up; fine answer if argued well |
| **Pre-generated Key Generation Service (KGS)** | Offline job pre-mints unique random codes into a pool; write path pops one | Write path never checks uniqueness; codes random | A whole extra service + key pool DB + "used vs free" state + concurrency on the pool + what if pool empties?; classic over-engineering at 40 writes/s | Know it (it's in every textbook), then decline it |
| **Hash-and-truncate** | MD5/SHA of long URL, take first 7 base62 chars | Deterministic: same URL → same code (free dedup) | Truncation collides on *different* URLs (must detect + re-salt); dedup breaks per-user analytics and custom expiry; two users shortening the same URL share click stats — a product bug | Reject, and explain why dedup is a false economy |

**The counter approach done properly — range allocation:**

Naive version: `SELECT nextval()` per write → every write hits one sequence. Fix: each write-service instance leases a **block of IDs** (e.g., 10,000) from a coordination point (a single `UPDATE ranges SET next = next + 10000 RETURNING ...` row in Postgres, or Zookeeper if you insist). The instance then hands out IDs from memory, lock-free, and leases a new block when exhausted.

- Coordination cost: 1 DB round-trip per 10k writes ≈ once every 4 minutes per instance at our load. Nothing.
- Crash cost: an instance dies mid-block and you burn up to 10k IDs. 10k out of 3.5T — who cares. Say that explicitly; knowing which waste is acceptable is the senior signal.

**Why raw auto-increment leaks business info, and the fix:**

Sequential codes mean `sho.rt/00001a` today and `sho.rt/00003k` tomorrow tells a competitor your creation rate — this is how people estimated early Twitter and bit.ly volumes. Codes are also enumerable: a crawler walks the sequence and harvests every private link. Fixes:

1. **Bijective obfuscation**: run the counter value through a reversible permutation before base62 encoding. Cheapest: multiply by a large odd constant modulo 62^7 (modular multiplicative inverse guarantees bijectivity — no collisions ever), or a 42-bit block cipher / Feistel network over the ID space. Sequence 1,2,3 becomes `k9Bx2Qz`, `Tq83mNe`, ... Deterministic, stateless, zero storage.
2. **Skip ranges / random increments**: advance the counter by a random step (1–1000). Cheaper to explain, but wastes space and only blurs the rate rather than hiding order.
3. Hashids-style libraries: same idea as (1), packaged.

Recommendation to state: counter + block leasing + a fixed bijective permutation → collision-free, coordination-light, non-enumerable. Random-with-retry is the acceptable alternative if the interviewer prefers statelessness.

**Interview trap:** Reciting the KGS from the Grokking course as *the* answer. Interviewers have heard it a thousand times. Proposing a pre-generation service, a key pool database, and used/free bookkeeping for a system doing 40 writes/s is the definition of complexity without cause. Mention it, price it, reject it.

**Interview trap:** Saying "collisions are impossible with random 7-char codes." They're improbable per-insert but *certain* over billions of inserts (birthday math). The correct design treats the DB unique constraint as the source of truth and retries on conflict — never "check then insert" as two steps, which is a TOCTOU race.

### Deep dive B: Redirect semantics — 301 vs 302 vs 307/308

This looks like HTTP trivia. It is actually a product decision, and interviewers who know the domain will push on it.

| Code | Meaning | Browser caching | Method preserved? | Consequence for a shortener |
|---|---|---|---|---|
| **301** Moved Permanently | Permanent | **Cached aggressively, often indefinitely** | No (may rewrite POST→GET) | Browser never contacts you again for that code → **you lose all click analytics after the first hit**, and you can never edit/disable the link for that user |
| **302** Found | Temporary | Not cached (by default) | No (historically sloppy) | Every click hits your server → analytics work, links stay editable/killable. ~Extra 10 ms per click — the cost of your business model |
| **307** Temporary Redirect | Temporary | Not cached | **Yes** | Strictly correct 302; use it if you ever redirect non-GET (you won't, but knowing it exists scores points) |
| **308** Permanent Redirect | Permanent | Cached | Yes | 301 with method preservation; same analytics death |

The senior answer: **302** (or 307), and articulate *why the "wrong" answer is tempting*: 301 reduces your server load and slightly improves user latency on repeat clicks — and if you're a pure infrastructure shortener with no analytics product, 301 is defensible. bit.ly uses 301 with short cache lifetimes plus its own counting; TinyURL historically 301'd. But the moment analytics, expiry, editing, or abuse-takedown is a requirement — and it always is — a permanently-cached redirect is a bug you shipped into every visitor's browser and cannot recall.

Related edge: **CDN/proxy caching**. If you put CloudFront/Cloudflare in front of the redirect path and let it cache 302s, you've rebuilt the 301 problem one layer up: the CDN serves the redirect and your origin never sees the click. Either disable caching on the redirect route, or run the click-counting *at the edge* (Cloudflare Worker emitting events) — the latter is the modern high-scale answer.

Also state: expired/disabled links return **410 Gone**, not 302-to-an-error-page and not 404. Crawlers deindex on 410, and abuse takedowns should be visibly final.

**Interview trap:** "301 because the mapping is permanent." The *mapping* is permanent; your need to observe traffic is also permanent. Anyone answering 301 without mentioning analytics has memorized the RFC and not thought about the product. Conversely, answering "302 because analytics" without acknowledging the load/latency trade-off is cargo-culting in the other direction. State both sides, pick 302.

### Deep dive C: Caching and the analytics pipeline

**Cache-aside on the redirect path:**

```
GET /{code}
  1. redis.GET(code)          -> hit (~80%+): 302 immediately (~1-2 ms)
  2. miss: db.SELECT by PK    -> found: redis.SET(code, url, TTL=24h); 302
  3. not found: cache NEGATIVE entry (redis.SET(code, "<nil>", TTL=5m)); 404
```

Design points to hit:

- **Hot-set economics**: ~20% of codes drive ~80% of clicks, and popularity decays fast (a link's traffic is front-loaded into days). A 24h sliding TTL with LRU/LFU eviction (`allkeys-lfu` — LFU beats LRU here because virality is bursty) keeps the ~5 GB hot set resident.
- **Negative caching** is non-optional: attackers and typos generate misses for nonexistent codes, and every miss otherwise falls through to the DB. Short TTL (5 min) so newly created codes aren't shadowed — or better, the write path deletes any negative entry on create.
- **Invalidation is nearly free** because values are immutable. Only delete/disable/expire needs an explicit `DEL` — one line in those code paths. This is worth saying: you chose a design where cache coherence is trivial.
- **Cache stampede** on a suddenly-viral new code: thousands of concurrent misses hit the DB for the same key. Mitigate with request coalescing (singleflight in the redirect service) or a short lock-and-fill. At our scale a stampede is ~10k QPS of identical PK reads — Postgres survives it, but say the word "singleflight" anyway.

**Cache strategy — why cache-aside and not the alternatives:**

| Strategy | Mechanics | Fit here | Why / why not |
|---|---|---|---|
| **Cache-aside (lazy)** | App reads cache; on miss reads DB and fills cache | **Chosen** | Only hot codes occupy memory; cold 6B-row long tail never pollutes the cache; DB remains source of truth; cache loss = latency blip, not data loss |
| Write-through | Every create writes DB + cache synchronously | Poor | You'd cache 100M new entries/month, the vast majority never read again after week one — memory spent on cold data |
| Write-behind | Write cache first, flush to DB async | Dangerous | A cache node loss loses *created links* — violates the durability NFR for zero benefit (writes aren't the bottleneck) |
| Read-through (cache library owns DB access) | Cache layer fetches on miss itself | Neutral | Same semantics as cache-aside, less control over negative caching and coalescing; fine, but say why you want the control |

Latency budget for the redirect path — walk it explicitly:

```
DNS + TCP + TLS (client-side, amortized on keep-alive)   ~0 ms warm
LB hop                                                    ~0.5 ms
Redirect service handler                                  ~0.2 ms
Redis GET (same AZ)                                       ~0.5-1 ms
-- cache hit total server-side                            ~2 ms
-- cache miss adds: Postgres PK read on replica           +1-3 ms
302 response serialization                                ~0.1 ms
```

p50 ~2 ms, p99 dominated by the ~20% miss path and GC/network jitter → comfortably inside the 100 ms NFR with a ~10x margin. Presenting a budget like this — instead of asserting "it'll be fast" — is precisely what "no hand-waving" means at senior level.

**Analytics pipeline (async, always):**

```
Redirect svc --(fire-and-forget, in-process buffer)--> Kafka topic "clicks"
                                                          |
                       +----------------------------------+
                       v                                  v
              Aggregation consumer                 Raw-event sink
              (count per code per min,             (S3/ClickHouse, 13-mo TTL)
               upsert into stats store)
```

- The redirect service **must not block** on Kafka. Buffer in memory, flush in batches (e.g., 100 events / 50 ms), and if Kafka is down, drop events and increment a metric. Losing click counts during an outage is acceptable; adding 200 ms to every redirect is not. Stating this priority order explicitly is a senior move — you are choosing what to sacrifice, on purpose.
- Exactly-once click counting is not worth it. At-least-once with idempotent daily rollups, or just tolerate ±0.1% — click analytics is directional data, not billing.
- If the interviewer wants "total clicks" in real time: Redis `INCR` per code alongside the Kafka emit, periodically flushed. Fine — but it's a second write on the hot path, so keep it pipelined with the GET.

**Supporting topics — cover in 60 seconds each:**

- **Expiration/TTL cleanup**: don't scan 6B rows. Two mechanisms layered:
  1. *Lazy expiry on read* — the redirect handler checks `expires_at`, returns 410, enqueues a delete. Correctness lives here; a link is never served past expiry even if the sweeper is behind.
  2. *Background sweeper* — walks the partial index in small batches (`DELETE FROM urls WHERE expires_at < now() LIMIT 1000`, commit, sleep 100 ms, repeat). Batching bounds lock time and WAL churn; an unbounded `DELETE WHERE expires_at < now()` on millions of rows is a self-inflicted outage (long transaction, replication lag, bloat).
  Each delete also issues `DEL` to Redis. And never recycle expired codes — a recycled code means someone's old email link now points at attacker content. You have 3.5T codes; scarcity is imaginary.
- **Rate limiting & abuse**: token bucket per API key / per IP (Redis, `INCR` + `EXPIRE`, or an atomic Lua sliding window — say "atomic" so the interviewer knows you've seen the read-modify-write race). Tiers: anonymous 10/day per IP, free accounts 1k/day, paid higher. Creation-time check against Google Safe Browsing / PhishTank; **asynchronous re-scan** of existing links on a rolling schedule because malware URLs turn bad *after* shortening — attackers deliberately shorten a clean URL, wait for it to propagate, then swap the destination server's content. That attack shape is why point-in-time scanning is insufficient. Provide a preview endpoint (`sho.rt/{code}+` shows the destination before redirecting, bit.ly-style) and an interstitial warning page for links flagged post-creation (safer than a hard 410 — preserves evidence and lets false positives appeal).
- **Custom aliases**: same table, `is_custom=true`, uniqueness enforced by the PK. Reserve a namespace (deny `admin`, `api`, `login`, 1–3 char codes, and anything matching the generated-code alphabet length to avoid collisions with future generated codes — or simpler: generated codes are exactly 7 chars, custom aliases must be 4–30 but never exactly 7. State the rule; it eliminates an entire class of conflict). Vanity aliases are also the abuse team's biggest headache (typosquatting brand names) — mention a denylist + trademark takedown path.

**Interview trap:** Implementing rate limiting as `GET` count, compare, then `INCR` — two Redis calls with a race between them; concurrent requests all pass the check. The limiter must be a single atomic operation (`INCR` then compare the returned value, or a Lua script). Small detail, but it's exactly the kind of thing a senior interviewer pokes at because it distinguishes "has drawn the box" from "has built the box."

---

## Step 7: Scale & evolve

### What breaks first at 10×

10× = 1B new URLs/month, 100k redirect QPS peak, 30 TB / 60B rows over 5 years.

Order of failure:

1. **Nothing in the write path.** 400 writes/s is still nothing. The ID generator with block leasing doesn't blink.
2. **Redis is still fine** (50 GB hot set → cluster mode with a few shards, client-side consistent hashing via Redis Cluster).
3. **The single Postgres primary's disk and vacuum** start to hurt at tens of TB — not QPS, but operational bulk: backups, index rebuilds, replica rebuild time. This is what actually forces sharding, and it's worth saying that it's *operational* pressure, not query latency.
4. **The analytics pipeline** is genuinely 10× bigger (20 TB/month raw). Scale Kafka partitions and ClickHouse first; it's the real big-data component.

### Sharding — by code, when you must

- **Shard key: short_code** (hash of it). Every redirect carries the code → perfect single-shard routing, no scatter-gather, ever.
- Because codes are (post-obfuscation) uniformly distributed, hash-sharding gives even balance with no hot shards.
- The one query that suffers: "list my links" (`user_id` lookup) becomes scatter-gather. Fix: a separate `user_links(user_id, short_code, created_at)` index table, sharded by user_id, written async. Dual-write inconsistency here is harmless (a link missing from your dashboard for a second).
- With DynamoDB, this entire section collapses to "partition key = short_code, add a GSI on user_id" — a fair reason to have picked it in Step 5.

**How you actually migrate from one Postgres to shards (interviewers ask):**

1. Stand up N shards; define the mapping `shard = hash(code) mod N` (or, better, consistent hashing / a slot table so future resharding moves slots, not `mod N`'s "everything moves").
2. Dual-write phase: writes go to old primary + new shard; a backfill job copies historical rows in key ranges, checksumming as it goes.
3. Cut reads over shard-by-shard behind a flag; the cache absorbs any latency wobble during cutover (immutability saves you again — no row can change mid-copy, so backfill has no race window).
4. Stop dual-writes, keep the old DB read-only for a rollback window, then retire it.

Say the immutability point explicitly: migrating an append-only, never-updated table is the easiest migration in databases. You designed that property in Step 5; cash it in here.

| Shard-key candidate | Redirect lookup | "My links" listing | Balance | Verdict |
|---|---|---|---|---|
| hash(short_code) | 1 shard, direct | scatter-gather (fix with index table) | Uniform | **Yes** |
| user_id | unknown at redirect time → broadcast | 1 shard | Power users create hot shards | No |
| created_at range | needs a lookup to find the shard | scatter | Newest shard takes ~all traffic | No |

### Multi-region

- Redirects are latency-sensitive and read-only → **replicate the mapping everywhere, serve reads locally**. Immutable data makes this painless: async replication, no conflict resolution needed.
- Writes: single home region (simplest; creation tolerates 150 ms cross-region) or regional ID-block partitioning (region A leases blocks 0–99M, region B 100M–199M — no coordination, still collision-free). The block-leasing design from Step 6 pays off here; point that out.
- Edge redirect: the endgame is redirect logic in edge workers (Cloudflare Workers + KV / CloudFront Functions + DynamoDB global tables) — sub-20 ms redirects worldwide, origin only handles writes and analytics. Mention it as the destination, not the starting point.

### Evolution roadmap (say this as a closing summary)

- v1: monolith + Postgres + Redis + Kafka. Handles stated scale with a 10× margin.
- v2: split redirect service, Redis Cluster, ClickHouse for analytics.
- v3: shard by code (or migrate mapping to DynamoDB/global KV), edge redirects, multi-region.

**Interview trap:** Jumping to v3 in Step 4. Presenting the evolution *as* an evolution — with the triggers that force each step ("we shard when backup/restore time exceeds our RTO, not at a QPS number") — is the difference between a senior and someone who memorized the final diagram.

---

## Common follow-up questions

**Q: How do you handle two concurrent requests claiming the same custom alias?**
A: The database unique constraint is the arbiter. `INSERT ... ON CONFLICT DO NOTHING` (or DynamoDB conditional write) — one wins, the other gets 409. Never SELECT-then-INSERT; that's a race. No distributed lock needed — the DB already is one.

**Q: Same long URL shortened twice — dedupe?**
A: Don't, by default. Deduping merges two users' analytics, breaks per-link expiry/ownership, and requires an index on a 2 KB URL (index the SHA-256 of the URL if you ever do it). Offer dedupe *within* one user's account as a UX nicety. The storage savings are trivial; the product coupling isn't.

**Q: How would you support link editing (change destination)?**
A: Now the value is mutable: cache invalidation via explicit `DEL` on edit, and 302 becomes mandatory (a 301'd link can never be edited for users who already clicked). Add `updated_at` and audit history. This question is really testing whether you remember your earlier immutability claims — acknowledge the ones that break.

**Q: What if Redis goes down entirely?**
A: 10k QPS of PK point lookups falls through to Postgres replicas — they handle it (a PK read is ~0.5 ms; a few replicas cover 10k QPS with headroom). Degraded p99, not an outage. This is *why* cache-aside beats a cache-as-source-of-truth design: the cache is an optimization, not a dependency. At 100k QPS the answer changes — replicas may not absorb it, so you'd need a warm standby cache or request shedding; say the answer is scale-dependent.

**Q: How do you prevent someone crawling all short links?**
A: Bijective obfuscation of the counter (Step 6) makes the space non-sequential; 6B used out of 3.5T means random probing hits a valid code 0.17% of the time; rate-limit unknown-code 404s per IP (negative-cache + counter); optionally require a minimum interval between 404s before tarpitting. Also: never put sensitive content behind an unauthenticated short link — say that the real fix is product policy, not obscurity.

**Q: A customer complains their link redirects to the wrong site. Walk your debug.**
A: Ordered suspects: (1) stale cache after an edit/takedown — check Redis vs DB for divergence (should be impossible if `DEL`-on-mutate is in every path; find the path that forgot); (2) CDN cached a redirect (check `Age`/`X-Cache` headers on the response); (3) the browser cached a 301 from before you switched to 302 — unfixable server-side, this is the 301 scar tissue argument made real; (4) case-sensitivity bug — `abc123X` and `ABC123x` are different codes in base62, and a proxy or client that lowercases URLs corrupts them. (4) is a great one to volunteer: it's why some systems choose case-insensitive base36 and accept longer codes.

**Q: 62^7 — why not use base64?**
A: Base64 includes `+` and `/` (or `-` and `_` URL-safe) — the former breaks URLs, both hurt readability and double-click-to-copy. Base62 is the URL-safe, human-safe alphabet. Some systems also strip lookalikes (`0/O`, `1/l/I`) → base58 (Bitcoin's choice) if links are ever read aloud or hand-typed.

**Q: How would this design change if reads were 10:1 instead of 100:1?**
A: Barely — and that's the honest answer. Writes go from 40/s to 400/s (still trivial); the cache hit rate matters less but the redirect path is unchanged. The lesson of the question: this system's shape is set by immutability and point lookups, not by the exact ratio. What *would* reshape it is a different access pattern entirely — e.g., "list all links to a given domain" (new index, possibly new store) or mutable destinations (cache invalidation becomes real). Show that you know which parameters your design is sensitive to and which it isn't.

**Q: Analytics shows a link got 1M clicks but the customer says 100k visitors — why?**
A: Bots, prefetchers, and link-preview crawlers (Slack, WhatsApp, Twitter unfurlers) all follow redirects. Filter by user-agent, count unique ip_hash+UA per window, and separate "requests" from "human clicks" in the product. Real bit.ly-scale systems attribute 30–50% of raw hits to bots. Knowing this exists is a strong practitioner signal.

---

## What gets you rejected

Concrete anti-patterns, specific to this problem:

1. **Over-engineering the easy parts.** Cassandra + Zookeeper + a KGS microservice fleet for 40 writes/s. The estimation step existed to stop you; ignoring your own numbers is worse than not estimating.
2. **Hash-and-truncate as the primary answer** without addressing truncation collisions and the dedup-breaks-analytics problem. It signals you've seen the trick but never operated it.
3. **301 without discussing analytics** — or not knowing the difference at all. This is *the* discriminator question for this problem.
4. **Synchronous click counting** in the redirect path. Couples your product's core latency to your analytics database.
5. **SELECT-then-INSERT for uniqueness** (aliases or random codes). TOCTOU race; the unique constraint is the answer.
6. **"We'll just cache everything"** with no sizing (how many GB? what eviction policy? what about misses on nonexistent codes?). Cache hand-waving is the most common senior-level failure on this question.
7. **Recycling expired short codes** to "save space." You have 3.5 trillion codes; you're saving nothing and creating a phishing vector.
8. **No abuse story.** An anonymous URL shortener is a phishing utility by default. If you finish the design without rate limits, URL scanning, or takedown paths, you designed malware infrastructure.
9. **Sharding by user_id or created_at.** The redirect doesn't know the user; time-sharding makes recent shards hot. The access pattern screams "shard by code" — missing it means you didn't design from the queries.
10. **Rushing.** Treating the question as beneath you and skipping estimation/requirements to get to "the hard part." The interviewer chose this question to watch your process; the process *is* the hard part.
