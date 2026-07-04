# Lesson 4.2 — Estimation & the HLD Interview Framework

> Module: System Design (HLD) | Level: Senior | FDE Prep Phase 4

Senior engineers are not tested on whether they can multiply — they're tested on whether their numbers *drive decisions*: does the working set fit in RAM, does one Postgres node survive this write rate, does the latency budget even permit a synchronous cross-region call. The second half of this lesson is the interview itself as a system: what each phase must produce, how FDE loops differ from generic HLD loops, and how to take control without steamrolling the interviewer.

---

## Latency Numbers

### Q1. Recite the latency numbers every senior must know (2025-era), and — more importantly — show how you use them.

**Answer:**

The table (order-of-magnitude; exact values vary by hardware, but the *ratios* are what you reason with):

| Operation | Latency | Mnemonic anchor |
|---|---|---|
| L1 cache reference | ~1 ns | — |
| L2 cache reference | ~4 ns | 4× L1 |
| Mutex lock/unlock (uncontended) | ~20 ns | |
| Main memory (RAM) reference | ~100 ns | 100× L1 |
| Compress 1 KB (Snappy/LZ4) | ~1-2 µs | |
| Read 1 MB sequentially from RAM | ~10-50 µs | memory bandwidth ~20-100 GB/s |
| NVMe SSD random read (4 KB) | ~20-100 µs | 1000× RAM |
| Read 1 MB sequentially from NVMe SSD | ~200 µs - 1 ms | ~1-7 GB/s |
| Same-DC / same-AZ network RTT | ~0.5 ms | includes serialization, kernel |
| Redis GET (incl. same-DC network) | ~0.2-0.5 ms | network dominates, not Redis |
| Postgres indexed read (warm) | ~1-5 ms | parse+plan+B-tree+row |
| HDD seek | ~10 ms | why HDDs are for sequential/archival only |
| Cross-region RTT, US East ↔ US West | ~60-70 ms | speed of light in fiber ≈ 200 km/ms, ×2 for round trip, × path inefficiency |
| US ↔ EU RTT | ~80 ms | |
| US ↔ Asia RTT | ~150-250 ms | |
| TLS 1.3 handshake | +1 RTT (TLS 1.2: +2) | multiply by the RTT above |

How to *use* them — this is what separates reciting from engineering:

1. **Latency budgets are additive along the critical path.** SLO says p99 < 200ms. A request that makes 20 sequential cross-service calls at ~1ms each (same-DC RTT + service time) has a ~20ms *floor* before any real work — and that's the median; p99 of a chain is dominated by the worst hop. Conclusion you should say out loud: fan out in parallel where possible, collapse chatty call chains, or the architecture has to change.
2. **Cross-region synchronous = design veto.** One synchronous US↔EU call is 80ms — nearly half a 200ms budget on one hop. So: no synchronous cross-region calls on user paths → data must be replicated/cached in-region → now you've *derived* your replication strategy from a latency number. That derivation chain is exactly what interviewers reward.
3. **Cache math.** DB read 2ms vs Redis 0.3ms: a 90% hit ratio turns 2ms average into `0.9×0.3 + 0.1×2 = 0.47ms` — ~4× better average, but note p99 is still gated by the misses. Cache hit ratio improves averages long before it improves tails.
4. **RAM vs SSD vs network tiering.** RAM 100ns, NVMe 50µs, network hop 500µs: a *local* NVMe read beats a *remote* RAM read (Redis over network). This justifies in-process caches (Q12 of Lesson 4.1) and explains why RocksDB-on-NVMe locally can outperform a remote cache tier.
5. **Tail math for fan-outs.** If one backend is p99=100ms, a request that fans out to 100 backends and waits for all of them hits that 100ms p99 on ~63% of requests (1 − 0.99¹⁰⁰). This is "the tail at scale" — hedged requests and partial responses exist because of this arithmetic.

**Interview trap:** "Redis is sub-millisecond, so it's basically free." → Free-ish *once*. A page render that makes 30 sequential Redis calls spends 6-15ms in network round trips alone. The fix is pipelining/MGET (1 RTT for 30 keys), and knowing that is the difference between "knows Redis is fast" and "knows where the time goes."

### Q2. How fast is the speed of light, and why does an FDE care?

**Answer:**

Light in fiber travels ~200,000 km/s (2/3 of c due to the refractive index) → ~200 km per ms one way, ~100 km per ms round trip. NYC↔London great-circle is ~5,600 km → theoretical minimum RTT ≈ 56ms; observed ~70-80ms (cable routes aren't great circles, plus router hops). NYC↔Sydney ~16,000 km → ~160ms minimum; observed 200ms+.

Why it matters: these are *physics floors*, not engineering problems. No amount of optimization gets a synchronous Sydney→Virginia call under ~160ms. Consequences you should be able to derive on the spot:

- Strongly consistent multi-region writes (quorum across US-EU-Asia) cost at minimum one cross-region RTT per commit → 80-150ms writes → most products choose region-local writes + async replication, and *accept* the consistency consequences deliberately.
- "Just add a region" is a data-architecture decision, not a deployment decision — the moment users in two regions write shared data, you've bought conflict resolution or cross-region coordination.
- CDN/edge exists because moving the *endpoint* 5,000 km closer to the user is the only way to beat physics.

**Interview trap:** "We'll make it strongly consistent AND multi-region AND low-latency." → Pick two, and be able to say why with the km/ms number. An interviewer pushing "can't we have all three?" is testing whether you'll hold the line on physics.

---

## Throughput Rules of Thumb

### Q3. QPS-per-box rules of thumb: nginx, Node.js, Postgres, Redis, Kafka. Caveat every number.

**Answer:**

| System | Ballpark per node | The caveat that keeps the number honest |
|---|---|---|
| nginx, static/proxy | ~50-100k RPS (small responses, keep-alive) | Drops hard with TLS handshakes on new connections (thousands/s, not tens of thousands), large bodies (you become NIC-bound: 10 Gbps ≈ 1.25 GB/s ≈ 12.5k × 100KB responses/s), and per-request Lua/regex logic. |
| Node.js API | ~1-10k RPS | Wholly dependent on work-per-request. A pass-through proxy endpoint: 10k+. An endpoint doing bcrypt (~100ms by design): ~10/s/core. One accidental synchronous JSON.parse of a 10MB body blocks *every* request on the loop. Say "per core" and "depends on work" or the number is meaningless. |
| Postgres | ~5-20k simple indexed reads/s; ~1-5k writes/s | "Simple" is load-bearing: PK lookups on cached pages. One un-indexed predicate or a 5-way join changes the answer by 100×. Writes gated by fsync/WAL (group commit helps), row width, index count (each secondary index ≈ an extra write), and lock contention on hot rows. Connection count matters: Postgres degrades past a few hundred active connections → PgBouncer is assumed. |
| Redis | ~100-200k ops/s per instance | Single-threaded command execution (I/O threads in 6+ help networking, not command CPU). O(N) commands (`LRANGE 0 -1`, `KEYS`, big `SMEMBERS`) destroy the budget — one 10MB value read = milliseconds of blocked everything. Pipelining can push far higher; big values and Lua change everything. |
| Kafka | ~100s of MB/s per broker (write path), millions of small msgs/s per cluster | Gated by disk sequential write + page cache + replication factor (RF=3 triples inter-broker traffic) and consumer fan-out (each group re-reads the data — network out is often the real ceiling). Message size dominates: 1KB messages at 300 MB/s = 300k msg/s/broker. |

How to deploy these in an interview: compute demand first, then divide. "We need 40k reads/s; Postgres does ~10k/node → 4 read replicas, or one Redis (100k ops/s) absorbing 90% of them and a single Postgres for the misses — Redis is the cheaper path, and here's the invalidation story." The rule-of-thumb's job is to tell you which *class* of design you're in (one box / small fleet / fundamentally distributed), not to size a purchase order.

**Interview trap:** Quoting benchmarks as capacity. Benchmark numbers are best-case (uniform small requests, warm caches, no p99 constraint). Production planning uses ~50% of benchmark ceilings so the box lives at utilization where tail latency is sane (see the queueing hockey stick, Lesson 4.1 Q18) and survives an AZ loss with the remaining fleet. If you say "Redis does 100k so we'll run it at 100k," you've failed the question.

---

## Storage & Estimation Math

### Q4. The estimation toolkit: powers of 2/10, sizes of common fields, and the shortcuts that make you fast at the whiteboard.

**Answer:**

**Powers shortcuts:** 2¹⁰ ≈ 10³ (KB), 2²⁰ ≈ 10⁶ (MB), 2³⁰ ≈ 10⁹ (GB), 2⁴⁰ ≈ 10¹² (TB). In interviews, always use powers of 10 and round brutally — you're establishing orders of magnitude, and false precision reads as junior.

**Field sizes:**

| Thing | Size |
|---|---|
| ASCII char | 1 B (UTF-8: 1-4 B; budget ~1 B for English, ~3 B for CJK) |
| int/float | 4 B; long/double/epoch-millis timestamp | 8 B |
| UUID | 16 B binary, 36 B as text (store binary; this 2.25× is a real table-size mistake) |
| Tweet-ish text (280 chars) | ~300 B; average URL ~100 B |
| Typical metadata row (id, user_id, timestamps, status, few fields) | 100 B - 1 KB — "1 KB per record" is the safe default |
| Thumbnail | ~10-50 KB; phone photo ~2-5 MB; 1 min 1080p video ~50-100 MB |

**The three core tricks:**

1. **1 million × 1 KB = 1 GB** (and its family: 1M × 1 MB = 1 TB; 1B × 1 KB = 1 TB). Instant table sizing.
2. **A day ≈ 10⁵ seconds** (86,400, round to 100k). So: *per-day volume ÷ 10⁵ = average per-second rate*. 10M requests/day ≈ 100 RPS. This single trick converts every "X per day" statement into QPS in your head.
3. **DAU → QPS:** `QPS_avg = DAU × actions/user/day ÷ 10⁵`, then `QPS_peak = 2-5× average` (diurnal cycles; consumer apps peak in evening local time; global products flatten somewhat, single-timezone products peak harder — say which you're assuming). Example: 10M DAU × 20 reads/day ÷ 10⁵ = 2,000 RPS avg → ~5-10k peak.

**Working style at the whiteboard:** write the assumption before the arithmetic ("assume 10M DAU, 10:1 read:write, 1 KB per post"), keep everything to one significant figure, and sanity-check against a known system ("that's ~1/100th of Twitter's write volume — plausible for this product").

### Q5. Worked example: Twitter-scale read path. Derive QPS and the feed-fanout storage cost.

**Answer:**

Assumptions (state them; interviewer will happily correct — that's the point):
- 300M DAU; each opens the timeline 5×/day, each open = ~2 feed-page reads → 10 reads/user/day.
- Writes: ~1 in 5 DAU tweets daily → 60M tweets/day.

**Read QPS:** 300M × 10 ÷ 10⁵ = 30,000 avg → **~100k peak** feed reads/s.
**Write QPS:** 60M ÷ 10⁵ = 600 avg → ~2-3k peak tweet writes/s.

Read:write ≈ 50:1 → this is a read-optimized system; you spend write-time effort (fan-out on write) to make reads O(1).

**Tweet storage:** 60M/day × ~1 KB (text + metadata + indexes) = 60 GB/day ≈ 22 TB/year raw → ×3 replication ≈ 66 TB/year. Tractable — text is never the storage problem; media is.

**Fan-out math (the interesting part):** average followers ≈ 200 → 60M tweets × 200 = **12B timeline-cache insertions/day ≈ 120k inserts/s average, ~400k peak**. Each entry ~ tweet_id + metadata ≈ 20-30 B; caching the latest ~800 entries for ~150M active users' timelines ≈ 150M × 800 × 25 B ≈ **3 TB of Redis** — a real but buyable cluster (e.g., 30 nodes × 100 GB). Then the celebrity problem: one 100M-follower account tweeting = 100M insertions for one write; at 400k/s that's 4 minutes of full-cluster work for one tweet. Conclusion you must reach: **hybrid fan-out** — push for normal users, pull-and-merge at read time for the ~10k celebrity accounts. The estimation *forced* the architecture; that's what the exercise is for.

**Interview trap:** Doing this arithmetic and then designing as if it said nothing. If your numbers show 50:1 read:write and a celebrity fan-out cliff, and you then draw a uniform fan-out-on-write design, the interviewer learns your estimation is decorative. Every number should either change the design or be explicitly dismissed ("60 GB/day of text — storage is a non-issue, moving on").

### Q6. Worked example: 100M photos/day — storage and bandwidth.

**Answer:**

**Storage:**
- 100M photos/day × 2 MB average (post-client-compression) = **200 TB/day**.
- Plus thumbnails: 3 sizes × ~30 KB ≈ 100 KB/photo ≈ 10 TB/day (5% overhead — note it, don't sweat it).
- Yearly: 200 TB × 365 ≈ **73 PB/year raw** → ×3 durability (S3 handles internally via erasure coding — say "replication factor or erasure-coded equivalent, roughly 1.3-3× raw") → ~100-220 PB/year. At S3 list price (~$21/TB/month standard) that's ~$1.5-2M/month growing monthly → tiering is mandatory: photos older than 90 days to infrequent access / Glacier tiers (access frequency decays fast — most photo reads are of recent photos; assume 80-90% of reads hit the last month).
- Metadata: 100M/day × ~500 B = 50 GB/day — trivially one Postgres... until you note that's 18 TB/year and 100M inserts/day ≈ 1-3k writes/s peak: fine for one beefy node now, shard-by-user later. Distinguishing "big number, still fits" from "big number, changes design" is the senior skill.

**Ingest bandwidth:** 200 TB/day ÷ 10⁵ s = 2 GB/s average → ~5-6 GB/s peak = **~50 Gbps peak ingest**. Conclusion: uploads must go directly to object storage via presigned URLs — never proxy 50 Gbps of photo bytes through your API tier; the API handles only the metadata write (~KB per upload).

**Egress:** reads dominate. If each photo is viewed 20× at ~200 KB average delivered size (mostly thumbnails/feed-size): 100M × 20 × 200 KB = 400 TB/day out ≈ **4 GB/s ≈ 32 Gbps average, ~100+ Gbps peak** → CDN is not an optimization, it's the design; at 90%+ CDN hit ratio, origin egress drops to a few Gbps, and the CDN bill (order of $10-20/TB at commit pricing, region-dependent) becomes one of your top line items — worth saying, because cost-awareness is an FDE tell.

**Interview trap:** Bits vs bytes on bandwidth. Storage is bytes (GB); network links are bits (Gbps). 2 GB/s = 16 Gbps. Confusing them is an 8× error in the direction that makes you look like you've never provisioned a link. Always convert explicitly, out loud: "2 gigaBYTES/s, times 8, ~16 gigaBITS/s."

### Q7. The common estimation traps — the ×3s and ×8s people forget.

**Answer:**

| Trap | Correction | Magnitude of error |
|---|---|---|
| Forgetting replication | Raw × RF (typically 3 for DBs/Kafka; ~1.3-1.8× for erasure-coded object storage) | 3× |
| Forgetting indexes + row overhead | Postgres row header ~23 B + alignment; each secondary index re-stores key+pointer; plus WAL, bloat, TOAST | 2-3× on "raw data" for a well-indexed OLTP table |
| Bits vs bytes | ×8 when crossing storage↔network | 8× |
| Average QPS as capacity target | Provision for peak: ×2-5 diurnal; ×10+ for events/virality; state which | 2-10× |
| Ignoring growth | Size for 12-24 months out, not day one | 2-4× |
| Forgetting the read amplification of fan-out | 1 write can be N cache writes (Q5) or K index updates | 10-1000× |
| Counting only happy-path traffic | Retries, health checks, replication traffic, backfills share the same pipes | 1.2-2× |
| Compression ignored (other direction) | Text/JSON compresses 5-10× (Kafka, logs, cold storage) | ÷5-10 |

Compound effect: "10 TB of raw data" honestly provisioned = 10 × 2.5 (indexes/overhead) × 3 (replication) = **75 TB** before growth. Being the person in the room who says "your 10 TB is actually 75" is precisely the staff-level reputation this module is for.

**Interview trap:** Precision theater. Answering "13.42 TB" signals you don't understand that every input was ±50%. Senior answers sound like: "order of 10 TB raw, call it 50-100 TB provisioned with indexes and replication — either way it's a sharding conversation, so let's have that one."

---

## Non-Functional Vocabulary

### Q8. SLI vs SLO vs SLA — and why p50/p99 instead of averages.

**Answer:**

- **SLI** (indicator): the measured quantity. "p99 latency of GET /feed over 5-min windows," "fraction of 2xx responses."
- **SLO** (objective): the internal target on an SLI. "p99 < 300ms for 99.9% of 5-min windows, monthly." SLOs come with an **error budget**: 99.9% availability = 0.1% budget = ~43 min/month of allowed badness. Budget remaining gates risk-taking (deploys, migrations); budget exhausted → freeze features, fix reliability. This operationalizes the reliability/velocity trade instead of arguing about it.
- **SLA** (agreement): the *contractual, external* promise with penalties (service credits). Always looser than the SLO (SLO 99.95% internally, SLA 99.9% with credits) so ops noise doesn't trigger payouts.

**Why averages lie:** latency distributions are heavily right-skewed. A service with 99 requests at 10ms and 1 at 2,000ms averages ~30ms — "great" — while 1% of users had a 2-second experience. Percentiles read the distribution: p50 = typical, p99 = the bad tail. And p99 matters more than 1% suggests: if a single page fans out to 20 backend calls, the chance a page-load hits at least one p99-tail call is 1 − 0.99²⁰ ≈ 18% — **nearly one in five page loads experiences your p99**. Also, your heaviest users make the most requests, so they sample the tail most often: p99 pain concentrates on your best customers. Never say "average latency" in a design review; say p50/p95/p99, and know that percentiles can't be averaged across hosts (aggregate with histograms — HDRHistogram, t-digest, Prometheus histogram buckets).

**Interview trap:** "We'll target 100% availability for the payment path." → 100% doesn't exist (your dependencies' SLAs already cap you: hard-depend on three 99.9% services and your ceiling is ~99.7%). The senior move is picking the *cheapest sufficient* target and designing the failure mode (queue-and-retry payments, idempotent capture) rather than promising an impossible number.

### Q9. The availability nines table, and what each nine actually costs.

**Answer:**

| Availability | Downtime/year | Downtime/month | What it takes |
|---|---|---|---|
| 99% ("two nines") | 3.65 days | ~7.3 h | Single node + monitoring + a human who restarts things |
| 99.9% | 8.76 h | ~43.8 min | Redundant instances, LB + health checks, automated failover, on-call |
| 99.95% | 4.38 h | ~21.9 min | Multi-AZ everything, tested DB failover, deploy safety (canary/rollback) |
| 99.99% | 52.6 min | ~4.4 min | **Humans are now too slow** — a page + investigate + fix cycle is 15-60 min, i.e., your month's budget. Everything must auto-heal; change management dominates (most outages are self-inflicted by deploys/config); chaos testing |
| 99.999% | 5.26 min | ~26 s | Multi-region active-active, cell-based isolation, no global single points including config/DNS/auth. Cost grows ~10× per nine; very few businesses need this |

Two compositions to do live in interviews:
- **Serial (hard dependency chain):** availabilities multiply. Five 99.9% services in a synchronous chain: 0.999⁵ ≈ 99.5% — you *lose* half a nine by drawing four arrows. Long synchronous chains are an availability decision, not just a latency one.
- **Parallel (redundancy):** independent failures multiply *unavailability*. Two independent 99% replicas: 1 − 0.01² = 99.99%. The load-bearing word is *independent* — same AZ, same deploy pipeline, same bad config push = correlated failure, and the math collapses. (Real outages are usually correlated: a config change, a cert expiry, a poisoned deploy.)

**Interview trap:** "We're multi-AZ, so we're 99.99%." → Redundancy math only covers *infrastructure* failure. The dominant outage cause is change (bad deploy, config, schema migration) which hits all AZs simultaneously. The path to four nines is mostly deployment engineering — canaries, staged rollout, fast automated rollback — not more hardware.

### Q10. The consistency spectrum, and CAP/PACELC in one practical line each.

**Answer:**

The spectrum, strongest to weakest, with the price of each:

| Level | Guarantee | You pay |
|---|---|---|
| Strict/linearizable | Every read sees the latest committed write, globally ordered | Coordination on every operation — quorum RTTs; cross-region: 60-150ms writes (Spanner pays this and uses TrueTime to bound it) |
| Sequential / snapshot | Consistent point-in-time views (what most single-node RDBMS isolation gives you) | Moderate; the default single-region Postgres experience |
| Bounded staleness | Reads at most X seconds / K versions behind | Predictable staleness — great contract for replicas ("lag < 5s or remove from rotation") |
| Read-your-writes / session | *You* see your own writes; others may lag | Session pinning or write-timestamp tokens; the minimum bar for decent UX (user posts a comment → must see it) |
| Monotonic reads | Time never goes backwards for one client | Sticky routing to a replica |
| Eventual | Replicas converge, eventually, order unspecified | Cheapest, fastest, always-available; the app must tolerate anomalies |

The senior framing: consistency is chosen **per operation, not per system**. Checkout inventory decrement: strong. Product view counter: eventual. User's own profile edit: read-your-writes. Feed of other people's posts: eventual with monotonic reads. Saying "this system is eventually consistent" about a whole product is a category error.

- **CAP, practically:** when a network partition happens (not if), each partitioned node must either refuse to answer (consistency) or answer possibly-stale (availability). That's the entire theorem — it says nothing about normal operation.
- **PACELC, practically:** during **P**artition choose **A** or **C**; **E**lse (healthy operation) choose **L**atency or **C**onsistency. The ELC half is the daily-relevant part: synchronous replication costs write latency *every day*, async replication costs consistency *every day*. DynamoDB default reads are PA/EL; Spanner is PC/EC; a Postgres primary with async replicas read by the app is effectively PC-on-the-primary/EL-on-the-replicas — you can and should place real systems on this map.

**Interview trap:** "MongoDB/Cassandra is AP, Postgres is CP" recited as taxonomy. → These are per-configuration properties: Cassandra at `QUORUM`/`LOCAL_QUORUM` reads+writes gives strong-ish guarantees; Postgres with async replica reads serves stale data cheerfully. The follow-up question is always "at what write/read concern?" — answer at that level or the label is meaningless.

---

## The 45-Minute HLD Interview

### Q11. Give the minute-by-minute structure of a 45-minute HLD interview and what each phase must *produce*.

**Answer:**

```
 0-8   Requirements & scope        → agreed feature list (3-4 core), explicit
                                     non-goals, NFRs with numbers (scale, SLO,
                                     consistency, availability, retention)
 8-12  API & data model sketch     → 3-6 endpoints w/ request/response shapes,
                                     core entities; the contract everything
                                     else serves
12-16  Estimation                  → QPS (avg/peak), storage/yr, bandwidth,
                                     working-set size — each number tied to a
                                     design consequence
16-26  High-level design           → boxes-and-arrows covering every functional
                                     requirement end-to-end; data flow narrated
                                     for the 2 main paths (read + write)
26-40  Deep dives (1-2 topics)     → the actual senior signal: contention
                                     points, failure modes, data-layer detail,
                                     the hard sub-problem solved properly
40-45  Wrap                        → bottlenecks named, evolution path,
                                     monitoring, what you'd do with more time
```

Phase notes that change outcomes:

- **Requirements (0-8):** the goal is *scope reduction with consent*. "For 45 minutes I'll focus on posting and the home feed; search and DMs are out of scope — fair?" An interviewer who agrees has just signed your rubric. Skipping this phase is the single most common failure: candidates design a different product than the interviewer had in mind and lose 20 minutes.
- **API (8-12):** forces precision. "POST /tweets → 201 {id}", "GET /feed?cursor=..." — cursor vs offset pagination is itself a senior tell (offset pagination degrades O(n) and breaks under concurrent inserts).
- **Estimation (12-16):** three or four numbers max, each with a consequence (see Q5). If a number has no consequence, say so and move on — spending 10 minutes on arithmetic is a pacing failure.
- **High-level (16-26):** breadth-first, resist depth. Narrate the write path and read path explicitly ("a tweet lands on the API tier, is persisted to the tweets store, an event goes to Kafka, the fanout service pushes IDs into follower timeline caches..."). Cover *every* functional requirement shallowly before going deep anywhere — an uncovered requirement caps your score regardless of deep-dive brilliance.
- **Deep dive (26-40):** where senior vs mid is decided. Pick (or accept) 1-2 components and go to mechanism level: exact schema and shard key, cache invalidation strategy, idempotency, what happens when the fanout worker dies mid-batch, hot-partition handling. Depth = failure modes + trade-offs + numbers, not more boxes.
- **Wrap (40-45):** name your own design's weaknesses before being asked ("single-region; the fanout Redis cluster is the first thing to fall over at 10× growth; here's the migration path"). Self-critique is a strong senior signal — it shows you review designs the way you'd review a colleague's.

**Driving vs being driven:** you should be proposing the agenda ("I'll sketch the high level, then I suggest we deep-dive the fanout path — unless you'd rather look at storage?") while *offering the steering wheel* at each transition. Announce transitions with timestamps in your own head; if you're not drawing boxes by minute 18, compress. Being driven — passively answering whatever comes — reads as mid-level even when every answer is right, because staff engineers run design reviews, not attend them.

**Interview trap:** Designing for Twitter-scale when the interviewer said 50k users. Over-engineering is scored as a *negative* — it shows you don't cost your choices. State the simple design first ("at 50k users this is one Postgres and a cache; here's the line at which I'd shard, and here's what I'd change"). Scaling *awareness* without premature scaling *machinery* is the target.

### Q12. How does an FDE system design interview differ from a generic HLD loop, and how do you play it?

**Answer:**

Generic HLD loops reward breadth: cover the whole system competently. FDE loops (and most staff loops at product-infra companies) add three twists:

**1. They push depth on ONE component — usually the one nearest the company's product.** Interviewing at a payments company, the "design a marketplace" question is secretly "design the ledger and idempotent payment capture." At an LLM-platform company, "design a chatbot product" is secretly "design the inference gateway: token streaming, rate limiting per tenant, provider failover, context caching." The rest of the design is scaffolding they'll let you hand-wave.

*Recognizing the push:* the interviewer asks a second, then a third question about the same box ("how exactly does the webhook retry work?" ... "and if the customer's endpoint is down for 6 hours?" ... "and if they process it twice?"). That's not skepticism — that's the interview *starting*. The failing response is retreating to breadth ("well, elsewhere in the system..."). The passing response is planting your feet and going one mechanism deeper each time.

**2. Structure your own deep dives.** Saying "I'd like to go deeper on X" is not just allowed, it's rewarded — with structure:
> "I'd like to spend ten minutes on the webhook delivery subsystem, because it's the least forgiving part. I'll cover the delivery state machine, retry policy with backoff and jitter, the idempotency contract we give customers, and how we page ourselves when a big customer's endpoint dies. Sound good?"

That's a staff engineer opening a design-review section. Inside the dive, use a fixed skeleton: **interface → data model → happy path → failure modes → operational story** (metrics, alerts, runbook, backfill/replay tooling).

**3. "Why not just use X?" challenges.** FDE interviewers roleplay the customer's skeptical architect: "Why not just use DynamoDB?" "Why isn't this a Lambda?" "Postgres LISTEN/NOTIFY instead of Kafka?" The trap is defensiveness. The winning shape is: *steelman X → name the specific requirement it breaks on → concede the conditions under which X would win*:
> "LISTEN/NOTIFY would genuinely be simpler and I'd take it at low volume — but it has no persistence or replay, so a consumer that's down for ten minutes silently loses events, and our requirement was at-least-once with backfill. If we drop the replay requirement, I'd switch."

Conceding conditions is not weakness; it's the strongest possible evidence you chose deliberately. Sometimes the interviewer's X is *actually right for the stated scale* — agreeing ("at this volume, you're right, Postgres-as-queue with SKIP LOCKED is the correct call") can be the best answer in the loop.

**4. Operational thinking — "what breaks at 3am" — is scored explicitly.** For every component you draw, be able to answer unprompted: what's the alert (SLI + threshold), what's the blast radius, what's the runbook's first command, how do you replay/repair afterwards. Sprinkling these unasked ("I'd alarm on DLQ depth > 0 and consumer lag > 60s; the 3am failure mode here is the fanout consumer crash-looping on a poison message, so max-receive-count 5 into a DLQ with a redrive tool") is the single most distinctive FDE signal, because FDEs live in *customer* production, where the person paged might be the customer.

**Interview trap:** Treating the depth-push as an attack and getting flustered or defensive. The push is the highest-value part of the interview — it's where the offer is decided. Train for it: for any system you claim to know, be able to survive five consecutive "and then what?" questions.

### Q13. Show a requirements-elicitation dialogue: what good clarifying questions sound like.

**Answer:**

The questions must be *decision-driving* — each answer should visibly change your design. Ask in two passes: functional (what does it do), then non-functional (numbers). Example, "design a notification system":

```
C: Before I design, let me scope. Functionally: are we delivering push,
   email, SMS, and in-app — or a subset?
I: All four eventually. Start with push and email.
C: Who triggers notifications — internal services publishing events, or
   also user-facing scheduling (like campaign sends)?
I: Internal services. Marketing campaigns later.
C: Do we need per-user preferences and quiet hours, or fire everything?
I: Preferences yes — that's a core requirement.
C: OK: service-triggered push+email with a preference layer. Non-goals for
   today: SMS, campaigns, in-app inbox. Fair?
I: Fair.

C: Now numbers. What's the volume — notifications per day?
I: What do you think is reasonable?
C: For a 50M-DAU product, maybe 5-10 notifications/user/day — call it
   500M/day, ~5k/s average, and bursty: a breaking-news push could try to
   send 50M in a minute. Should I design for that burst?
I: Yes — that burst matters to us.
C: Then delivery latency SLO: is 30-60 seconds acceptable for the burst,
   or must it be near-real-time?
I: Under a minute for the bulk is fine. Transactional ones — password
   reset — need seconds.
C: Good, that splits the design: a priority lane for transactional,
   throughput-optimized lanes for bulk. Ordering: if a user gets two
   notifications, do we care about order? Duplicates — is at-least-once
   with rare dupes acceptable, or is a duplicate push a serious bug?
I: Rare duplicate push: annoying but fine. Duplicate password-reset
   email: fine. So at-least-once is OK.
C: Retention and audit — do we keep a record of every send, and for
   how long?
I: 90 days, for support and compliance.
C: Availability: if the notification system is down for 10 minutes, do we
   queue-and-recover, or is loss acceptable?
I: Queue and recover. Never silently drop transactional.
C: Last one: single region OK, or are users global with data-residency
   constraints on the preference data?
I: Single region for now.
C: Summary: 500M/day, 50M/min burst capability, two priority tiers
   (seconds vs sub-minute), at-least-once, per-user preferences, 90-day
   send log, durable queue-and-recover, single region. Designing to that.
```

Note the moves: the candidate *proposed* numbers when the interviewer deflected ("what do you think is reasonable?" is a standard test — have defensible defaults ready); every question mapped to a design fork (burst → buffering architecture; transactional vs bulk → priority lanes; dupes → idempotency budget; retention → a send-log store the candidate now must include); and it ended with a read-back summary — the requirements contract for the rest of the interview.

The core NFR checklist to elicit for *any* system: **scale** (DAU, QPS, data volume), **read:write ratio**, **latency SLO** (p99, per operation class), **consistency needs** (per operation!), **availability target** (and failure-mode preference: degrade vs reject vs queue), **durability/retention**, **geography** (regions, residency), **burstiness** (peak:average, known events).

**Interview trap:** Interrogating for 15 minutes. Requirements is 5-8 minutes, 6-10 questions, then a summary and *movement*. Interviewers flag "couldn't converge" as often as "didn't clarify." When an answer doesn't change your design, don't ask the question.

### Q14. What are strong opening and closing moves — the first two minutes and the last five?

**Answer:**

**First two minutes:** state your plan before touching the problem. "Here's how I'll use our 45 minutes: five on requirements, quick API and estimation, ten on the high-level design, then I'll pick the hardest component and go deep — and I'll flag trade-offs as I make them. Let me start with scope." This does three things: shows you've run design discussions before, sets shared expectations so the interviewer can redirect *early* (cheap) instead of late (expensive), and buys you the right to manage time visibly ("we're at minute 20, I'm cutting estimation short to protect deep-dive time").

**Last five minutes — the wrap has a fixed skeleton:**
1. **Requirements check:** walk the original list, confirm each is served by something on the board. (Catches the "we never handled preferences" gap while you can still spend 60 seconds on it.)
2. **Bottleneck ranking:** "First thing to break at 10× is the fanout tier — here's the mitigation. Second is Postgres write volume — here's the shard key I'd use."
3. **Failure story:** the top one or two 3am scenarios and their blast radius.
4. **Evolution path:** what you'd build first (the walking skeleton), what you'd deliberately defer, and the trigger metrics for each deferred piece ("shard when write QPS crosses ~3k sustained").
5. **Honest debt:** "Two things I hand-waved: the search path and multi-region. Given ten more minutes I'd take search first."

Self-identified weaknesses in the wrap consistently score better than interviewer-discovered weaknesses in the deep dive. Ending at minute 44 with a coherent wrap beats ending mid-sentence inside one more box.

**Interview trap:** Spending the last five minutes adding features ("we could also add ML ranking..."). Expansion at the end signals you don't know the review is in its risk-assessment phase. Contract, critique, and prioritize instead.

---

## Rapid-Fire Calibration

### Q15. Rapid-fire: five estimation micro-drills with answers, to calibrate your reflexes.

**Answer:**

**1. A URL shortener gets 100M new URLs/month. Storage for 5 years?**
100M × 12 × 5 = 6B records × ~500 B (short code, long URL ~100-200 B, metadata, index overhead) = **~3 TB**. ×3 replication ≈ 9 TB. Conclusion: storage is a non-problem; the design questions are the redirect read path (cache hit ratio — redirects are zipfian, a few GB of Redis serves 95%+) and code-generation collisions. Recognizing which resource is *not* the problem is the drill.

**2. Chat app, 20M DAU, 40 messages/user/day. Write QPS and yearly text storage?**
Writes: 20M × 40 ÷ 10⁵ = 8k/s avg → ~25k/s peak → above a single Postgres's comfortable write ceiling → partitioned log (Kafka) in front and/or sharded store (by conversation_id — also gives per-conversation ordering for free).
Storage: 800M msgs/day × ~200 B ≈ 160 GB/day ≈ **60 TB/year** raw, ~180 TB replicated → Cassandra/Scylla-class or sharded Postgres territory; media on object storage changes the number by 10-100×, so ask about media.

**3. How much RAM to cache the hot working set of a 2 TB product catalog, 10M SKUs?**
Zipfian access: top 1% of SKUs ≈ 50-80% of reads (state the assumption). 1% × 10M × ~20 KB rendered entry ≈ **2-4 GB** — fits in one Redis node trivially; even 10% coverage is 40 GB, one big node or a small cluster. Consequence: cache the rendered read model, don't read-scale the DB.

**4. Log pipeline: 5k servers × 200 KB/s of logs each. Kafka sizing?**
Ingest: 5,000 × 200 KB/s = 1 GB/s raw → ~150-250 MB/s compressed (logs compress ~5×) → ×3 RF = ~500-750 MB/s of broker write throughput → **6-10 brokers** on the write path (at a conservative ~100 MB/s/broker with consumer fan-out headroom). Retention: 7 days × ~200 MB/s ≈ 120 TB compressed on-cluster.

**5. Can one region's Postgres handle "like" writes for 100M DAU, 10 likes/user/day?**
100M × 10 ÷ 10⁵ = 10k likes/s avg → 30k+/s peak. Naive row-per-like INSERT at 30k/s: past a single node's write comfort (~1-5k/s honest ceiling with indexes) → options in ascending complexity: batch/coalesce writes (buffer in Redis, flush aggregate counts — accepts loss window), partition by post_id, or a write-optimized store. Also the hot-row problem: one viral post's counter row serializes on row locks — the answer is sharded counters (N rows per post, sum on read) or Redis INCR with write-behind. The drill: the *average* said "maybe fine," the *peak and the hot key* said "no" — always run all three checks.

**Interview trap:** Memorizing these answers instead of the method. Interviewers perturb one variable (20M DAU becomes 200M, text becomes voice notes) precisely to detect memorization. The method is always: rate = volume ÷ 10⁵ → peak = ×3 → compare against per-node rule of thumb → check the hot-key/tail case → state the design consequence.
