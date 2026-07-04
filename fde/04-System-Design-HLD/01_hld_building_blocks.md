# Lesson 4.1 — HLD Building Blocks

> Module: System Design (HLD) | Level: Senior | FDE Prep Phase 4

Senior engineers are not tested on "put a load balancer in front and add a cache." They're tested on: which layer of the stack can actually see the thing you want to route on, what happens to your cache when 10,000 requests miss simultaneously, and why your queue delivered the same message twice at 3am. Every building block below has a failure mode, and the interview is about the failure mode, not the box on the diagram.

---

## Load Balancers

### Q1. L4 vs L7 load balancing — what can each layer actually see, and when do you pick NLB over ALB?

**Answer:**

An L4 load balancer operates on TCP/UDP. It sees the 5-tuple: source IP, source port, destination IP, destination port, protocol. That's it. It cannot see HTTP paths, headers, cookies, hostnames, or gRPC methods — to L4, your request is an opaque byte stream. It forwards packets (or proxies connections) and gets out of the way.

An L7 load balancer terminates the connection, parses the protocol (HTTP/1.1, HTTP/2, gRPC, WebSocket upgrade), and can route on anything in the request: `Host` header, path prefix, cookie, JWT claim (with a plugin), gRPC service/method. Because it terminates TLS and re-establishes a backend connection, it can also do retries, request mirroring, header injection, and per-route timeouts.

| | L4 (AWS NLB, HAProxy TCP mode, IPVS) | L7 (AWS ALB, nginx, Envoy, HAProxy HTTP mode) |
|---|---|---|
| Sees | IP/port 5-tuple only | Full request: path, headers, method, body (if configured) |
| Routing granularity | Per connection | Per request (critical for HTTP/2 multiplexing) |
| Latency added | ~microseconds (NLB: ~100µs) | ~milliseconds (parse + terminate + re-encrypt) |
| Throughput | Millions of connections; NLB scales to millions of RPS instantly | High but bounded; ALB needs warm-up for spikes (pre-warming / LCU scaling lag) |
| TLS | Passthrough (or terminate without inspection) | Terminates; can do SNI routing, mTLS, cert per domain |
| Preserves client IP | Yes (NLB natively; or PROXY protocol) | Via `X-Forwarded-For` only |
| Use when | Raw TCP (databases, MQTT, game servers), extreme RPS, static IPs needed, TLS passthrough required | Path routing, canaries, WAF, sticky sessions, gRPC method routing |

Pick **NLB** when: you need static IPs / Elastic IPs (partner allowlists), you're fronting non-HTTP traffic (Redis, Kafka brokers, SIP), you need TLS passthrough for end-to-end encryption compliance, or you have spike patterns ALB scaling can't follow (NLB is essentially a routing table in the hypervisor; ALB is a fleet of proxies that must scale). Pick **ALB** when you need any request-level intelligence.

A common real-world topology: NLB → Envoy/nginx fleet → services. The NLB gives you static IPs and instant scale; your own L7 tier gives you routing logic you control.

**Interview trap:** "L4 is faster, so use it everywhere." → With HTTP/2 and gRPC, an L4 balancer balances *connections*, not requests. gRPC clients hold one long-lived HTTP/2 connection and multiplex thousands of RPCs over it. Behind an L4 LB, one backend gets the whole connection's load while others idle. This is the classic "gRPC hot backend" incident — the fix is an L7 proxy (Envoy) that balances per-request/per-stream, or client-side load balancing with a resolver.

**Interview trap:** "ALB preserves the source IP." → It doesn't at the TCP level. Your app sees the ALB's IP; the client IP is in `X-Forwarded-For`, which is spoofable unless the first hop is trusted and you strip inbound XFF at the edge. Rate limiting on the wrong XFF entry is a real security bug.

### Q2. Compare load balancing algorithms — round robin, least connections, weighted, IP hash, consistent hashing. When does each break?

**Answer:**

| Algorithm | Mechanism | Breaks when |
|---|---|---|
| Round robin | Cycle through backends in order | Requests have non-uniform cost. One slow endpoint (report generation) stacks up on a backend while RR keeps feeding it. Also breaks with heterogeneous instance sizes. |
| Weighted RR | RR proportional to weights | Weights are static; a degraded (but healthy-check-passing) node keeps getting its full share. |
| Least connections | Send to backend with fewest active connections | Great for variable request cost. Breaks on **restart herding**: a freshly restarted backend has 0 connections, gets slammed with 100% of new traffic while cold (empty JIT, cold caches, unestablished DB pools). Mitigate with slow-start (nginx `slow_start`, Envoy `slow_start_config` — ramp weight over 30-60s). |
| Least request (P2C) | Pick 2 random backends, choose the one with fewer in-flight requests | Best default at scale (Envoy's default). Avoids the "everyone picks the same least-loaded node" herd that global least-connections causes across many LB instances. Rarely "breaks"; degrades gracefully. |
| IP hash | hash(client IP) → backend | Session affinity without cookies. Breaks behind carrier-grade NAT / corporate proxies: one IP = 50,000 users on one backend. Also breaks on backend count change — everyone rehashes. |
| Consistent hashing | Hash key onto a ring; backend owns arc | Cache locality (route user X always to node Y). Naive version breaks with hot keys: one celebrity user's arc overloads one node. Fix: **bounded-load consistent hashing** (Google, 2016): cap any node at `c × average load` (c ≈ 1.25); overflow spills to next node on the ring. Also use virtual nodes (100-200 per physical node) to smooth arc distribution. |

Key senior point: least-connections is *per LB instance*. If you run 20 Envoy pods, each has a local view; the global distribution is what matters, which is why power-of-two-choices with local state performs nearly as well as perfect global least-loaded and without the coordination.

**Interview trap:** "Sticky sessions solve state." → Sticky sessions (cookie or IP hash) turn your stateless tier into a stateful one: deploys and scale-in events log users out, autoscaling can't rebalance existing sessions, and one backend death loses all its sessions. The senior answer: externalize session state (Redis with TTL) and keep the LB algorithm free to balance. Stickiness is acceptable only as a cache-locality optimization, never as a correctness requirement.

### Q3. Health checks — active vs passive, thresholds, and the thundering-herd-on-recovery problem.

**Answer:**

**Active health checks:** the LB probes each backend on an interval — e.g., `GET /healthz` every 5s, mark unhealthy after 3 consecutive failures (15s to detect), healthy after 2 consecutive successes. Tunables: interval, timeout (must be < interval), unhealthy threshold, healthy threshold.

**Passive health checks (outlier detection):** the LB watches real traffic — consecutive 5xx, connect failures, elevated latency — and ejects the backend for a cool-off period (Envoy outlier detection: eject on 5 consecutive 5xx, eject for 30s × ejection count, cap max ejection % of the pool at ~50% so you never eject everything). Passive detects real-traffic failures that a shallow `/healthz` never sees (e.g., the service answers health checks but its DB pool is exhausted).

Use both: active for "is the process up and can it serve," passive for "is it actually serving well."

Two levels of health check, and they must differ:
- **Liveness** — "restart me if this fails." Should check the process only. Never include downstream dependencies — if the DB blips and every pod's liveness check fails, Kubernetes restarts your entire fleet during a DB incident. Self-inflicted total outage.
- **Readiness** — "route traffic to me." May check critical local state (config loaded, migrations applied, warm enough), and should go unready under overload so the LB sheds load to peers.

**Thundering herd on recovery:** a backend was down; the pool shrank from 10 to 6 nodes, each now at 160% of normal load, queues built up. The dead node recovers, passes 2 health checks, and the LB — especially with least-connections — dumps a flood of queued/new traffic onto a cold node. It immediately times out, fails checks, gets ejected, load spills back, another node tips over. This is a **flapping cascade / metastable failure**.

Mitigations, in order of importance:
1. **Slow start:** ramp the recovered node's weight from ~10% to 100% over 30-60s (nginx `slow_start=30s`, Envoy slow start).
2. **Connection/request warmup in the app:** pre-establish DB pools, warm local caches, JIT-prime before flipping readiness.
3. **Panic threshold** (Envoy): if >50% of the pool is unhealthy, ignore health status and spray traffic across all nodes — partial success beats guaranteed collapse of the survivors.
4. **Load shedding on the backends:** reject early (503 + `Retry-After`) when internal queue depth exceeds a bound, so recovery load can't queue forever.

**Interview trap:** "Deep health checks are better because they test the whole path." → Deep checks that include dependencies convert a partial dependency failure into a full self-removal of your fleet. The rule: liveness = shallow, readiness = local-only depth, dependency health = handled by circuit breakers per-call, not by removing yourself from rotation.

### Q4. What is connection draining and why do deploys break without it?

**Answer:**

Connection draining (AWS calls it deregistration delay) is the grace period between "stop sending new requests to this backend" and "kill it." Without it, a deploy or scale-in event hard-closes in-flight requests: users see connection resets, and long-running requests (uploads, report exports) die mid-flight.

Correct shutdown sequence for a service behind an LB (Kubernetes flavor, but the pattern is universal):

```
1. SIGTERM received (or deregistration starts)
2. Fail readiness check immediately  ──> LB stops NEW traffic (takes
   interval × threshold to propagate — keep serving during this window!)
3. Optionally sleep 5-15s (preStop hook) to cover propagation lag
4. Stop accepting new connections; finish in-flight requests
5. Close idle keep-alive connections (send `Connection: close` /
   GOAWAY for HTTP/2)
6. Exit when drained, or at the hard deadline (e.g., 30-60s), whichever first
```

Numbers that matter: deregistration delay must exceed your p99.9 request duration. ALB default is 300s — usually too long for APIs (slows deploys) and too short for websockets. Long-lived connections (websockets, gRPC streams, SSE) don't "drain" on their own — you must actively send GOAWAY / close frames and have clients reconnect, ideally with jitter so 50k websocket clients don't reconnect in the same second.

**Interview trap:** "We fail the health check, so the LB stops traffic instantly." → It doesn't. There's a propagation window (check interval × unhealthy threshold, plus LB-internal update lag — often 10-30s). If you stop serving the moment you flip the check, everything in that window gets 5xx. You must keep serving *while* failing the readiness check. This exact bug is behind most "we see a 502 spike on every deploy" stories.

---

## API Gateway vs Reverse Proxy vs BFF

### Q5. Reverse proxy vs API gateway vs BFF — draw precise lines. What belongs in a gateway and what must never go there?

**Answer:**

These get used interchangeably; seniors distinguish them by *responsibility*, not by product name (nginx can play all three roles badly or well).

| | Reverse proxy | API gateway | BFF (Backend-for-Frontend) |
|---|---|---|---|
| Core job | Traffic plumbing: TLS termination, routing, buffering, compression, load balancing | API-aware policy enforcement: authn, rate limiting, quotas, request validation, API versioning, protocol translation | Client-specific API shaping: aggregation, response tailoring per client type |
| Knows about | Connections and HTTP mechanics | Your API surface (routes, consumers, keys) | Your *product screens* |
| Owned by | Platform/infra team | Platform/API team | The frontend team it serves |
| Examples | nginx, HAProxy, Envoy | Kong, AWS API Gateway, Apigee, Envoy Gateway, Zuul | Custom Node/Next.js service per client, GraphQL layer |
| Business logic | Never | Never | Presentation logic yes, domain logic no |

**Belongs in the gateway:** authentication (validate JWT signature, reject before it touches services), coarse authorization (this API key may call this route class), rate limiting and quotas, request/response size limits, schema validation at the edge, TLS/mTLS, canary routing, protocol translation (REST↔gRPC), observability (request IDs, access logs), CORS.

**Does not belong in the gateway:** business logic ("if order total > $500 require review"), data transformations that encode domain rules, per-endpoint orchestration, anything that requires a DB call to your domain tables. The failure mode is well-known: the gateway becomes a chokepoint that every team must PR into, deploys become globally coordinated, and you've rebuilt the ESB anti-pattern. Fine-grained authorization (can user X see document Y) belongs in the service or a policy engine (OPA) called by the service — the gateway lacks the domain context.

**BFF pattern:** one aggregation layer per client type. The mobile BFF returns a pre-composed "home screen" payload (profile + feed + notifications in one round trip, fields trimmed for a 5-inch screen and flaky radio); the web BFF returns richer, differently-shaped data. Each BFF is owned by the team that owns the client, so screen changes don't require negotiating a shared API. Without a BFF split you get the "general-purpose API" that serves everyone equally poorly: mobile over-fetches 40KB to render 2KB, and the web team can't add a field without mobile review.

Rule of thumb for when BFF earns its keep: ≥2 client types with genuinely different data shapes, or mobile latency budgets that can't afford 5+ sequential API calls over a 100-300ms mobile RTT.

**Interview trap:** "GraphQL replaces the BFF." → GraphQL *is* a BFF implementation strategy (client-driven shaping instead of team-driven), and it imports its own problems: N+1 resolution (need DataLoader batching), unbounded query cost (need depth/complexity limits and persisted queries), and cache-unfriendliness (POST everything → CDN caching gone unless you use persisted queries with GET). Saying "just use GraphQL" without naming those costs is a junior answer.

**Interview trap:** "Put rate limiting in each service so it's decentralized." → Then an unauthenticated flood still traverses your LB, gateway, and service before being rejected, and every team reimplements limits inconsistently. Reject as early as the layer has enough information: IP-level abuse at the edge/CDN, key/user-level at the gateway, resource-level (per-tenant DB quota) in the service.

---

## CDN

### Q6. CDN push vs pull, and the cache invalidation hierarchy: TTL vs purge vs versioned URLs. Why do versioned URLs win?

**Answer:**

**Pull (origin pull):** CDN edge gets a request, misses, fetches from your origin, caches per response headers. Zero deploy coupling; first user per edge PoP eats the miss latency. This is the default for CloudFront, Fastly, Cloudflare.

**Push:** you upload assets to CDN storage ahead of traffic. No first-miss penalty, but you own the lifecycle (what's stale? what got orphaned?). Practically, "push" today usually means "origin is an object store (S3) you deploy to" — pure push APIs are niche (large binaries, game patches, video packaging).

Invalidation options, worst to best:

| Strategy | Mechanism | Propagation | Cost/limits | Failure mode |
|---|---|---|---|---|
| TTL expiry | `Cache-Control: max-age=300` | Up to full TTL | Free | Stale for up to TTL after deploy; short TTLs shift load to origin |
| Purge | API call to invalidate paths | CloudFront: seconds-minutes, 1000 free paths/month then paid; Fastly: <150ms globally (its real differentiator, plus surrogate-key tag purging) | Rate-limited, operational step that can fail | Deploy "done" but users see old JS calling new API → runtime errors |
| Versioned URLs | Content hash in filename: `app.3f9c2a.js`, `max-age=31536000, immutable` | Instant and atomic — new HTML references new URLs | Free | None for assets; only the HTML itself needs a short TTL or no-store |

Versioned URLs win because they convert invalidation (a *distributed cache coherence problem across thousands of PoPs*) into publication (an *append-only namespace*). Old and new versions coexist, so a user who loaded old HTML mid-deploy still fetches the old JS successfully — no version skew. You get infinite TTL (`immutable` means the browser won't even revalidate), so cache hit ratio approaches 100%, and rollback is instant (re-point HTML). The residual design question is only "how long is the HTML cached" — typically `max-age=60` with `stale-while-revalidate`, or edge-cached with purge-on-deploy.

Purge remains necessary for content that must change *in place*: legal takedowns, a product page under a stable URL, cache poisoning response. Fastly's surrogate keys are the senior tool here: tag responses (`Surrogate-Key: product-123 category-shoes`), purge by tag in one call instead of enumerating URLs.

**Interview trap:** "Set TTL to 0 for dynamic-ish content, problem solved." → `max-age=0` still allows conditional revalidation (`If-None-Match` → 304), which is actually a good pattern — the CDN holds the body, origin only validates. But if you meant `no-store`, you've turned the CDN into a pure proxy and every request hits origin. Know the difference between `no-cache` (store, revalidate every time), `no-store` (never store), and `max-age=0, stale-while-revalidate=60`.

### Q7. What is an origin shield, and when does a CDN help dynamic (uncacheable) content?

**Answer:**

**Origin shield:** an extra CDN caching layer between the edge PoPs and your origin — a designated "mid-tier" PoP (usually chosen in the same region as origin). Without it, N hundred edge PoPs each independently miss and hit your origin: a cold object or a TTL expiry produces hundreds of near-simultaneous origin fetches (the CDN version of a stampede). With a shield, edges fetch from the shield; only the shield fetches from origin — collapsing origin load by 1-2 orders of magnitude and enabling request coalescing (CloudFront Origin Shield, Fastly shielding coalesce concurrent misses for the same object into one origin fetch).

When to enable: origin is fetch-cost-sensitive (S3 GET costs, small origin fleet, expensive renders), global traffic (many PoPs), or live video (thousands of edges asking for the same 2-second segment).

**CDN for dynamic content** — even with 0% cache hit ratio, a CDN buys:
1. **TCP/TLS termination near the user.** Handshakes happen over a ~20ms user↔edge RTT instead of ~150ms user↔origin RTT. A cold HTTPS connection is 2-3 RTTs; that's 300-450ms saved for a user in Singapore hitting us-east-1.
2. **Persistent, pooled, pre-warmed edge→origin connections** over the CDN's private backbone (often better routed and less congested than the public internet). Google/AWS backbone routing can cut cross-continent variance dramatically.
3. **Edge logic:** Cloudflare Workers / CloudFront Functions / Fastly Compute do auth token validation, A/B assignment, redirects, and bot filtering at the edge — rejecting junk before it crosses an ocean.
4. **DDoS absorption and WAF** at a layer with terabits of capacity.
5. **Partial caching of "dynamic" responses:** most "dynamic" pages are 90% cacheable — cache anonymously-rendered pages, use ESI or edge composition for the personalized fragment, or `stale-while-revalidate` for near-real-time data.

**Interview trap:** "Our content is personalized, so a CDN is useless." → Interrogate that. Personalized ≠ uncacheable: cache by `Vary` on a coarse cohort header, cache the shell and fetch the personal fragment async, or cache per-user with signed keys for hot users. And even at literal 0% hit ratio, points 1-4 above still hold. The senior move is separating *transport acceleration* from *caching* — a CDN provides both.

### Q8. How do signed URLs / signed cookies work on a CDN, and when do you use each?

**Answer:**

Problem: content on the CDN must be public-cacheable but access-controlled (paid video, private downloads). You can't put your auth service in the CDN path for every segment request, so you move authorization into the URL itself.

**Signed URL:** origin app authenticates the user, then generates a URL containing a policy (expiry timestamp, optional IP/path constraints) and a signature over that policy using a private key (CloudFront key pair) or HMAC secret (Fastly/Cloudflare token). The edge validates the signature and expiry *cryptographically, locally, with no origin call*. Cache key excludes the token, so one cached object serves all authorized users.

```
Client ──login──> App ──"here's your URL"──> https://cdn.x.com/video/seg1.ts
                                              ?Expires=1720100000
                                              &Signature=base64(RSA/HMAC(policy))
                                              &Key-Pair-Id=K2...
Client ──GET──> CDN edge: verify sig + expiry locally → serve from cache
```

**Signed cookies:** same cryptographic idea, but the policy/signature ride in cookies scoped to the domain. Use when the client will fetch *many* URLs under a path (HLS video = thousands of `.ts` segments, an image gallery) and rewriting every URL is impractical.

Design points seniors mention: short expiries (minutes to hours) with client-side refresh; clock skew tolerance (±30-60s); wildcard path policies for video (`/videos/abc/*`); key rotation (two active key pairs, roll without downtime); and the revocation gap — a signed URL is a bearer token; you cannot revoke it before expiry except by rotating the key (which invalidates *everything*). Keep expiries as short as UX allows.

**Interview trap:** "Just check the session cookie at the origin for every media request." → For HLS at 6-second segments, one viewer makes ~600 requests/hour; 100k concurrent viewers = ~17k auth requests/s hitting origin for content the CDN already has. Signed URLs move that to O(1) origin work per session.

---

## Caching Layers

### Q9. Cache-aside vs write-through vs write-back vs write-around — exact read/write flows and the failure mode of each.

**Answer:**

**Cache-aside (lazy loading)** — the application talks to both cache and DB:
```
READ:  app → cache GET → hit? return
                       → miss? app → DB read → app → cache SET (with TTL) → return
WRITE: app → DB write → app → cache DEL (delete, not update — see Q13)
```
Failure modes: first-read misses (cold start = DB load spike); stale window if the delete fails (mitigate: TTL as backstop, retry-with-outbox for the delete); the TOCTOU race in Q13. This is the default pattern — cache failure degrades to "slower," not "broken."

**Write-through** — writes go through the cache layer, which synchronously writes the DB:
```
WRITE: app → cache SET → cache → DB write → ack after BOTH succeed
READ:  app → cache GET (rarely misses for recently-written data)
```
Failure modes: write latency = cache + DB (you pay both, serially); every write is cached even if never read again (wasted memory — bad for write-heavy, read-rare data); requires the cache tier to own DB write logic (or a library like a caching ORM). You get strong read-after-write for cached items. Rarely deployed standalone; usually paired with cache-aside reads.

**Write-back (write-behind)** — writes hit the cache, ack immediately, flush to DB asynchronously (batched/coalesced):
```
WRITE: app → cache SET → ack     [cache queues dirty entries]
ASYNC: cache → batch/coalesce → DB write (e.g., every 500ms or 1000 rows)
```
Failure mode is the big one: **acknowledged data loss**. Cache node dies before flush → writes vanish. Only acceptable when loss is tolerable (view counters, like counts, metrics, last-seen timestamps) or when the "cache" is replicated/persistent (Redis with AOF + replicas — and even then, Redis replication is async). Huge win for write-heavy counters: coalescing 10,000 increments/s on one key into 2 DB writes/s.

**Write-around** — write to DB directly, bypass cache; cache fills only on read (via cache-aside):
```
WRITE: app → DB write (optionally DEL cache key)
READ:  cache-aside as usual
```
Use when written data is unlikely to be read soon (bulk imports, logs, archival writes) — avoids flushing hot read entries with cold write entries.

| Pattern | Write latency | Read-after-write | Data loss risk | Best for |
|---|---|---|---|---|
| Cache-aside | DB only | Stale window possible | None | Default; read-heavy |
| Write-through | Cache + DB | Consistent (for that key) | None | Read-heavy, must-see-own-writes |
| Write-back | Cache only (fast) | Consistent from cache | **Yes, on cache failure** | Counters, high-frequency writes, loss-tolerant |
| Write-around | DB only | First read is a miss | None | Write-once/read-rarely data |

**Interview trap:** "Update the cache on write instead of deleting — it's fresher." → Two concurrent writes can apply to the DB in order A,B but hit the cache in order B,A (network interleaving), leaving the cache permanently holding A's value with no TTL rescue until expiry. Delete-on-write makes the next read repopulate from the DB's authoritative state. Update-on-write also requires the writer to compute the full cached view (which may join other data). Delete is idempotent and order-insensitive; update is neither.

### Q10. Cache stampede (dog-piling): name four protections and their exact mechanics.

**Answer:**

The scenario: a hot key (rendered homepage, popular product) expires. 5,000 concurrent requests all miss simultaneously, all execute the expensive recompute (200ms DB query), the DB gets 5,000x the normal load for that query, latency spikes, queries queue, and the recompute takes even longer — a self-amplifying spike. At worst this is what took down big sites' databases during traffic events.

**1. Mutex / lock (single recompute):** first missing request acquires a lock (`SET stampede:key <id> NX PX 10000` in Redis); it recomputes and fills the cache; everyone else either waits (poll/subscribe) or serves stale.
Pitfalls seniors must name:
- **Lock timeout vs recompute time:** if the recompute takes longer than the lock TTL, the lock expires, a second worker starts recomputing, and worse — the *first* worker's eventual `DEL` can release the *second* worker's lock. Fix: store a unique token as the lock value and release with a compare-and-delete Lua script; or extend the lock with a watchdog (Redisson-style).
- **Lock holder dies:** TTL is mandatory (never `SET NX` without `PX`), otherwise the key stays locked forever.
- Everyone-waits behavior converts a stampede into a latency cliff for all waiters; prefer "one recomputes, others serve stale" when staleness is acceptable.

**2. Probabilistic early recomputation (XFetch — Vattani, Chierichetti, Lowenstein 2015):** each cache entry stores its `delta` (how long the last recompute took) and expiry. On every read, a worker *volunteers* to recompute early if:
```
now - delta * beta * ln(rand())  >  expiry        (rand() uniform in (0,1])
```
Since `ln(rand())` is negative, `-delta·beta·ln(rand())` is a positive headstart, exponentially distributed — the closer to expiry (and the more readers), the more likely *someone* recomputes early, but the randomness makes it overwhelmingly likely to be exactly one-ish worker rather than all of them. `beta = 1` is the paper's recommendation; raise it to recompute more eagerly. The elegance: no locks, no coordination, and hot keys never actually reach expiry — the stampede window never opens. Cold keys still expire normally (nobody reads them, nobody volunteers).

**3. Request coalescing (singleflight):** within one process, dedupe concurrent identical loads — Go's `golang.org/x/sync/singleflight`, a keyed promise map in Node (the second caller awaits the first caller's in-flight promise). Collapses N concurrent misses per process into 1. Combine with a distributed lock to get "1 per process → 1 per fleet." CDNs do this natively (request collapsing / origin coalescing).

**4. Stale-while-revalidate:** serve the expired value immediately; refresh asynchronously in the background. Store a soft TTL inside the value (`{data, softExpiry}`) with a longer hard Redis TTL; on soft-expiry, return stale data and trigger one async refresh (guarded by singleflight). Users see slightly stale data, never see the recompute latency, and the DB sees at most one refresh. HTTP has this built in: `Cache-Control: max-age=60, stale-while-revalidate=300` (also `stale-if-error` — serve stale when origin is down, an underrated resilience tool).

Layering in practice: singleflight in-process + XFetch or SWR for hot keys + a distributed lock only for truly expensive recomputes (>1s). Also jitter your TTLs (`ttl = base + rand(0, 0.1*base)`) so keys written together (bulk warm-up, deploy) don't expire together — synchronized expiry is a stampede you scheduled yourself.

**Interview trap:** "We use Redis, so stampedes aren't a problem." → Redis is where the *miss* happens; the stampede lands on whatever is *behind* Redis. Redis being fast is irrelevant — the question is what 5,000 concurrent misses do to your Postgres.

### Q11. Eviction policies: LRU vs LFU vs TinyLFU — when does each lose?

**Answer:**

| Policy | Mechanic | Loses when |
|---|---|---|
| LRU | Evict least-recently-used | **Scan pollution:** one batch job or crawler reads 1M cold rows once, evicting your entire hot working set for keys that will never be read again. |
| LFU | Evict least-frequently-used | **Stale frequency:** yesterday's hot item has a huge count and squats in the cache long after it went cold; new items can't build count fast enough to survive (need aging/decay). Also more metadata per entry. |
| TinyLFU / W-TinyLFU (Caffeine) | Frequency sketch (count-min sketch, ~few bits/entry, periodically halved for aging) as an **admission filter**: a new key only gets admitted if its estimated frequency beats the eviction candidate's; a small LRU "window" (~1%) in front catches bursts of new-hot items | Very little — it's the state of the art for skewed workloads; the window handles recency bursts, the sketch blocks scan pollution. Cost: complexity; not what Redis gives you natively. |

What Redis actually does: `allkeys-lru` and `allkeys-lfu` are **approximated** — Redis samples `maxmemory-samples` (default 5) random keys and evicts the best candidate among them, because a true global LRU list is too expensive. Its LFU is a Morris counter (logarithmic, 8 bits) with configurable decay (`lfu-decay-time`). For a caching tier fronting a database with zipfian access, `allkeys-lfu` usually beats `allkeys-lru`; for in-process caches on the JVM, Caffeine (W-TinyLFU) is the default correct answer.

Also know `volatile-ttl` vs `allkeys-*`: `volatile-*` only evicts keys that have TTLs — if your writers forget TTLs, Redis hits `maxmemory` and starts rejecting writes (`OOM command not allowed`) instead of evicting. That's a real 3am page.

**Interview trap:** "LRU is fine for everything." → Ask one question: does anything scan? One analytics query, one sitemap crawler, one cache-warming script with the wrong key pattern, and LRU flushes your working set. If hit ratio graphs show cliffs correlated with cron jobs, that's the signature.

### Q12. The hot key problem: one key gets 500k reads/s. Redis caps out. What do you do?

**Answer:**

A single Redis instance handles ~100-200k simple GETs/s and a key lives on exactly one shard — Redis Cluster does *not* help with a single hot key; it helps with many keys. Options, in escalation order:

1. **In-process (L1) cache with short TTL:** cache the value in each app instance's memory for 1-5s. 200 app pods × 1 refresh per 2s = 100 Redis reads/s instead of 500k. This is almost always the answer and almost always sufficient. Staleness bound = L1 TTL. Invalidation, if needed, via Redis pub/sub broadcasting key-invalidation messages (this is exactly what Redis 6 server-assisted client-side caching / RESP3 invalidation push formalizes).
2. **Key replication (read fan-out):** write `key#1..key#N` copies across shards; readers pick `key#{rand(N)}`. Multiplies read capacity by N at the cost of N writes and N-way invalidation. Used when values are too large or too dynamic for L1.
3. **Replica reads:** Redis replicas serve reads (`READONLY` in cluster mode). Adds capacity ~linearly with replicas, but replication is async — you've accepted eventual consistency, and replica lag under load is exactly when the hot key is hottest.
4. **Push, don't pull:** for truly extreme cases (live sports score, flash-sale inventory flag), stop making 500k clients ask — broadcast changes over pub/sub / websockets / SSE and let clients hold the value.

Detection matters as much as mitigation: `redis-cli --hotkeys` (needs LFU policy), monitoring per-shard CPU skew (one cluster shard at 95% CPU while others idle = hot key or big key), and client-side key-frequency sampling.

**Interview trap:** "Shard more / scale the cluster." → Sharding distributes *keys*, not *a key*. One hot key saturates its single owning shard no matter how many shards exist. The interviewer is checking whether you know hash slots pin a key to one node.

### Q13. Cache consistency: describe the cache-aside TOCTOU race and how to mitigate it.

**Answer:**

Delete-on-write cache-aside is *mostly* consistent, but has a classic interleaving that writes stale data with no expiry-independent correction:

```
Reader R (cache miss path)              Writer W
─────────────────────────               ─────────────────────────
1. GET key → miss
2. Read DB → gets value v1
                                        3. Write DB → value v2
                                        4. DEL key (deletes nothing useful)
5. SET key = v1   ← STALE, and it
   sits there until TTL expiry
```

The reader's DB read (step 2) happened *before* the write, but its cache SET (step 5) happened *after* the writer's DEL — the stale value wins the race. It's rare (requires a miss concurrent with a write, with the read side slow), but at high QPS "rare" happens hourly.

Mitigations, in order of practicality:
1. **TTL as backstop** — always. Bounds staleness to TTL. For most business data, a 60-300s TTL makes this race a non-event. State this first in the interview; it's the 90% answer.
2. **Delayed double delete:** writer DELs, then DELs again after ~500ms-1s (async), catching the stale SET from any in-flight reader. Crude, effective, widely used.
3. **SET with short TTL on the miss path** (or `SET NX` so a racing repopulation can't overwrite a newer explicitly-set value) — pattern-dependent.
4. **CDC-driven invalidation:** consume the DB's change stream (Debezium on MySQL binlog/Postgres logical replication) and issue cache deletes from the log. Ordering comes from the DB's own commit order; app code stops owning invalidation. This is the Meta/“Scaling Memcache at Facebook” direction (their mcsqueal pipeline), plus **leases**: the cache hands the missing reader a lease token; a delete invalidates outstanding leases so the stale SET (with a dead lease) is rejected. Leases solve exactly this race — worth naming by name.
5. **Versioned values:** store `{version, data}` where version = DB row version; SET only if version ≥ cached version (Lua CAS). Turns last-write-wins into ordered writes.

Also name the *other* ordering question: DB-then-DEL (standard) vs DEL-then-DB. DEL-then-DB is worse — between your DEL and your DB commit, a reader repopulates the old value, guaranteed staleness under mild concurrency.

**Interview trap:** "Use transactions to keep cache and DB consistent." → Redis doesn't participate in your DB transaction; there is no atomic commit across them (2PC across Redis+Postgres is not a real option). Any cache+DB pair is a distributed system with independent failure; the honest design bounds staleness (TTL, leases, CDC) rather than pretending to eliminate it.

---

## Queues vs Streams

### Q14. SQS/RabbitMQ vs Kafka/Kinesis — the fundamental model difference, and a decision table.

**Answer:**

The model difference is destructive vs non-destructive consumption:

- **Queue (SQS, RabbitMQ):** a message is a *task*. Competing consumers pull from a shared pool; each message is delivered to one consumer, acknowledged, and **deleted**. There is no "replay" — consumed means gone. Scaling consumers = add more workers, no rebalancing ceremony, no partition math.
- **Log/stream (Kafka, Kinesis):** a message is a *fact* in an append-only, partitioned log. Consumers don't delete anything; each **consumer group** tracks its own offset per partition. The same event feeds 5 independent groups (billing, analytics, search indexer, fraud, cache invalidator) without republishing. Retention is time/size-based (7 days, 30 days, or `compact`), so you can rewind and replay — the killer feature for reprocessing after a bug.

```
Queue:   producers → [ msg pool ] → N competing workers (msg → ack → GONE)

Log:     producers → [p0: e1 e2 e3 e4 ...]      group A offset: p0@4
                     [p1: e1 e2 e3 ...    ]      group B offset: p0@2
                     (events remain; groups read independently)
```

| Dimension | SQS / RabbitMQ | Kafka / Kinesis |
|---|---|---|
| Unit of work | Task (do this once) | Event (this happened) |
| Consumption | Destructive (ack → delete) | Non-destructive (offset per group) |
| Replay | No | Yes, within retention |
| Fan-out | Republish per consumer (SNS→SQS, RabbitMQ exchanges) | Native (consumer groups) |
| Ordering | None (SQS standard) / per-queue-ish (Rabbit, with caveats) / FIFO SQS: per message-group, ~300 msg/s/group (3k batched) | **Per partition**, strong; global ordering only with 1 partition |
| Per-message ack/retry | Yes — retry one message, delay it, DLQ it individually | No — offset is a high-water mark; one poison message blocks its partition unless you handle it in-app |
| Consumer scaling | Add workers freely | Max parallelism = partition count; adding consumers triggers rebalance |
| Throughput | SQS ~ effectively unlimited (standard); Rabbit ~10-50k msg/s/node typical | Kafka: hundreds of MB/s per broker, millions of msg/s per cluster |
| Ops burden | SQS ~zero; Rabbit moderate | High (or pay for MSK/Confluent); partition capacity planning |
| Backpressure model | Queue depth; consumers pull at their pace | Consumer lag (offset delta) per group |

Choose the **queue** for: background jobs (emails, thumbnails, webhook delivery), work distribution where per-message retry/delay/DLQ semantics matter, and when you want zero ops (SQS). Choose the **log** for: event sourcing, multiple independent consumers of the same events, ordered per-entity streams (partition by `user_id`), replay/reprocessing needs, and high-throughput pipelines (CDC, clickstreams, metrics).

**Interview trap:** "Kafka is just a faster queue." → Kafka is a *worse* queue for task processing: no per-message ack (a slow message stalls its partition), no per-message delay, no native DLQ, consumer parallelism capped by partitions, and rebalances pause consumption. If the job is "send 10k emails with retries," SQS + workers beats Kafka on every axis except résumé value. (Kafka 4.x "Queues for Kafka"/share groups is closing this gap, but the default answer stands.)

### Q15. Visibility timeout, at-least-once delivery, and DLQs — walk through the failure mechanics.

**Answer:**

**Visibility timeout (SQS):** when a consumer receives a message, it isn't deleted — it becomes invisible for the visibility timeout (default 30s). The consumer processes and then explicitly deletes. If it crashes or is slow, the timeout lapses and the message reappears for redelivery. This is the mechanism behind at-least-once: the failure window is "processed successfully but crashed before delete" → redelivery of already-done work.

Tuning mechanics seniors should articulate:
- Timeout must exceed p99+ processing time, or healthy-but-slow consumers cause duplicate concurrent processing (two workers on the same message *simultaneously*). For long jobs, heartbeat with `ChangeMessageVisibility` to extend while working.
- Too long a timeout = crashed consumer delays retry by the whole timeout (a 15-min timeout means a lost message is retried in 15 min — is that within your SLO?).
- RabbitMQ equivalent: unacked messages are redelivered when the channel/connection dies (immediately, no timer), plus `delivery_limit`/quorum-queue poison handling.

**DLQ (dead-letter queue):** after `maxReceiveCount` failed attempts (typically 3-5), SQS moves the message to a DLQ instead of retrying forever. Without a DLQ, a **poison message** (malformed payload, bug triggered by specific data) cycles forever: consume → crash → reappear → consume — burning consumer capacity and, in nasty cases, crash-looping your fleet. DLQ hygiene: alarm on DLQ depth > 0 (CloudWatch), keep a redrive path (SQS redrive-to-source) for after the bug fix, and log *why* each message died. A silently-filling DLQ is just data loss with extra steps.

Retry policy details that signal seniority: exponential backoff with jitter between attempts (SQS: per-message delay via visibility; Rabbit: TTL + dead-letter-exchange retry ladders, e.g., retry queues with 1m/10m/1h TTLs), and distinguishing retryable errors (downstream 503) from permanent ones (validation failure → straight to DLQ, don't waste 5 retries).

**Interview trap:** "Set maxReceiveCount to 1 so nothing runs twice." → Then any transient failure (deploy restart, 1s network blip, downstream hiccup) permanently dead-letters legitimate work. You haven't achieved exactly-once; you've achieved at-most-once, i.e., accepted data loss to avoid writing an idempotent consumer. The interviewer wants you to reject that trade.

### Q16. "Exactly-once delivery" — why it's a myth, and what "effectively once" actually looks like in code.

**Answer:**

Exactly-once *delivery* is impossible in the presence of failures: the consumer processes the message, and the ack is lost in transit (or the consumer dies between processing and ack). The broker cannot distinguish "processed, ack lost" from "never processed" — it must redeliver (at-least-once) or not (at-most-once, losing data). This is the Two Generals problem wearing a message-queue costume.

What *is* achievable: **exactly-once effect (effectively-once)** = at-least-once delivery + idempotent processing. The duplicate arrives; it just doesn't do anything.

Concrete idempotency mechanisms:
1. **Natural idempotency:** `SET status = 'shipped'` is safe to repeat; `UPDATE balance = balance - 100` is not. Design mutations as absolute state assignments or as inserts keyed by event ID.
2. **Idempotency key + dedup table:** every message carries a unique ID (producer-generated, e.g., `order-1234-payment-attempt-1`). Consumer does, in one DB transaction:
```sql
BEGIN;
INSERT INTO processed_messages (msg_id) VALUES ($1);  -- PK violation = duplicate
-- ... business effect (insert order row, update inventory) ...
COMMIT;                       -- duplicate? whole txn rolls back; ack anyway
```
The dedup check and the business effect commit **atomically** — this is the crux. Checking a Redis set *then* writing the DB reintroduces the race (crash between the two). Prune the dedup table with a retention window ≥ max redelivery horizon.
3. **Kafka's "exactly-once semantics" (EOS):** idempotent producer (broker dedupes by producer ID + sequence number, killing retry-duplicates) + transactions spanning "consume-offset-commit + produce" — exactly-once *within a Kafka→Kafka pipeline* (Streams). The moment your consumer's side effect leaves Kafka (call Stripe, send an email, write Postgres), you're back to needing idempotency at that boundary. SQS FIFO "exactly-once processing" is similarly a 5-minute producer-side dedup window, not a delivery guarantee.
4. **External side effects:** pass the idempotency key downstream — Stripe's `Idempotency-Key` header exists precisely so your retry doesn't double-charge. Email? Often you accept a rare duplicate (cheap) rather than build heavyweight coordination.

**Interview trap:** "Kafka has exactly-once now, so we don't need idempotency." → Kafka EOS covers Kafka-internal read-process-write. Your service that consumes an event and calls a payment API is outside it. The senior answer is a boring sentence: "at-least-once transport, idempotent consumers, dedup keyed by event ID committed atomically with the effect."

---

## Service Discovery

### Q17. Client-side vs server-side discovery; DNS vs a registry (Consul/etcd/Kubernetes). Where do health checks fit?

**Answer:**

**Server-side discovery:** clients hit a stable virtual endpoint (LB VIP, Kubernetes Service ClusterIP); the infrastructure resolves it to a healthy instance. Client stays dumb (one hostname). Cost: an extra hop, and the LB is a shared fate component.

**Client-side discovery:** the client fetches the instance list from a registry (Eureka, Consul) or via a sidecar/control plane (Envoy + Istio's xDS), and load-balances itself (P2C, locality-aware). Removes the hop and enables smart per-request decisions (zone-local routing saves cross-AZ latency and AWS's ~$0.01-0.02/GB cross-AZ transfer fee — a real line item at scale). Cost: discovery logic in every client (mitigated by pushing it into a sidecar — which is precisely the service mesh pitch: client-side discovery without client code).

**DNS as discovery:**

| | DNS | Registry (Consul/etcd/ZooKeeper) + push |
|---|---|---|
| Propagation | TTL-bound; and many runtimes ignore TTL — the JVM historically cached lookups forever without `networkaddress.cache.ttl`, Node's default resolver caches per lookup | Push/watch: subsecond updates (Consul blocking queries, etcd watch, xDS stream) |
| Health awareness | None natively (Route 53 health-checked records are coarse, ~30s) | First-class: instance registers with a health check; failing = removed from the set in seconds |
| Data richness | A/SRV records; no metadata | Tags, versions, zones, weights → canary and locality routing |
| Load info | None | Can carry it (weights, outlier status) |
| Ops | Free, universal | A quorum system you must operate (etcd/Consul are Raft clusters — they need care) |

**Kubernetes** blends these: kube-dns/CoreDNS gives names, but the real mechanism is Endpoints/EndpointSlice objects maintained from pod **readiness** — kube-proxy (or a mesh) programs routes from those slices, so "discovery health integration" = readiness probes. A pod failing readiness leaves the endpoint set in seconds, without DNS TTL involvement (headless Services, which return pod IPs directly via DNS, *do* re-expose the TTL/caching problem — relevant for stateful clients like Kafka consumers connecting to specific brokers).

Health-check integration is the whole game: a discovery system returning dead instances is worse than a static list, because it fails unpredictably. The registration lifecycle must handle: instance self-registration vs orchestrator registration, TTL/heartbeat expiry for crashed instances (Consul TTL checks, etcd leases), and deregistration-before-shutdown ordering (deregister → drain → exit, mirroring Q4).

**Interview trap:** "Just use DNS with a 5-second TTL." → Three problems: resolver caches lying about TTL across your language runtimes; DNS answers carry no health or load information (you'll round-robin onto a dying node until something else removes it); and 5s TTL × thousands of clients = a QPS storm on your DNS tier. DNS is a fine *bootstrap* mechanism ("where is the registry / the LB"); it's a poor *liveness* mechanism.

---

## Autoscaling

### Q18. Choosing the scaling metric: CPU vs RPS vs queue depth vs custom — and why averaged CPU betrays latency-sensitive services.

**Answer:**

The metric must be (a) proportional to the actual bottleneck resource and (b) something adding instances actually reduces. Get either wrong and the loop misbehaves.

| Metric | Good for | Fails when |
|---|---|---|
| CPU utilization | CPU-bound request work (JSON, templating, compression) | Service is I/O-bound: pods wait on the DB at 15% CPU while latency burns. CPU says "all good"; users disagree. Scaling on it does nothing (and more pods can *worsen* it by adding DB connections). |
| RPS per instance (ALB `RequestCountPerTarget`) | Uniform-cost requests; capacity you've load-tested ("1 pod handles 800 RPS at p99 < 100ms") | Request mix shifts (cheap reads vs expensive searches) — RPS constant, cost doubled. Requires periodic re-benchmarking. |
| Queue depth / consumer lag | Async workers — the canonical correct choice. Target: `depth / (workers × per-worker rate)` ≈ acceptable drain time. For SQS+K8s: KEDA on queue length; for Kafka: lag per group | Depth alone ignores drain rate; scale on *estimated time-to-drain*, and beware lag spikes from rebalances (false signal). |
| Concurrency (in-flight requests per instance) | Closest proxy to Little's Law (L = λW); what Knative/Envoy use | Needs per-pod instrumentation; long-poll/websocket connections pollute the count. |
| Custom SLI (p95 latency) | Tempting — it's what you actually care about | **Latency is a trailing, nonlinear signal**: flat until saturation, then vertical (hockey stick). By the time p95 moves, you're already in the queueing regime, and new capacity takes 1-5 min to arrive. Alert on latency; scale on a leading utilization/concurrency signal. |

**Why averaged CPU lies for latency-sensitive services:** two compounding averages.
1. *Across the fleet:* 20 pods averaging 55% can be ten at 90% (queueing, killing p99) and ten at 20% (bad balancing, hot shards). Target-tracking on the average sees 55% < 60% target → no action, while your p99 SLO burns. Watch max/p90 utilization per pod, not just mean.
2. *Across time:* a 60-second CloudWatch average flattens a spiky workload — 10s bursts at 100% (each one a latency incident) average to 40%.
And structurally: queueing delay is nonlinear in utilization (M/M/1 wait ~ ρ/(1−ρ)) — the latency difference between 60% and 85% CPU is not 25 points, it's often 3-5× on p99. That's why latency-sensitive fleets target 40-60% CPU, not 80%: the headroom *is* the p99 SLO. Interviewers love "why do you run your fleet at 50% CPU, isn't that wasteful?" — the answer is the hockey stick.

**Interview trap:** "Scale workers on queue depth = problem solved." → If the bottleneck is downstream (each worker hammers the same Postgres), scaling workers amplifies the outage: more workers → more DB contention → slower processing → deeper queue → more scaling. Runaway loop. The metric must point at a resource that *your new instances relieve*. Check what the workers are actually bound by before wiring the autoscaler.

### Q19. Target tracking vs step scaling, cooldowns, scale-out fast / scale-in slow, and predictive scaling.

**Answer:**

**Target tracking** (AWS ASG target tracking, Kubernetes HPA): declare "keep metric M at target T"; the controller solves for capacity — HPA literally computes `desired = ceil(current × metricValue / target)`. It's a proportional controller: simple, handles most cases, self-correcting. Limits: one target per metric (HPA takes the max across metrics — the most demanding metric wins), and it reacts only after the metric moves.

**Step scaling:** explicit rules — "CPU 60-75% → +2 instances; >75% → +50%". Use when you need aggressive, nonlinear responses to breach severity, or scaling on metrics whose target-tracking math doesn't fit. Costs you hand-tuned thresholds that rot as the service evolves.

**Scale-out fast, scale-in slow** — the asymmetry principle, and the "why" matters:
- Cost of underprovisioning = user-facing latency/errors, *right now*.
- Cost of overprovisioning = money, gradually.
So: short evaluation window for out (1-2 breaching minutes, add 20-100% capacity), long window for in (10-15 min of low utilization, remove ~10% at a time). Kubernetes HPA encodes this as `behavior.scaleUp` (e.g., +100% per 15s allowed) vs `behavior.scaleDown` with `stabilizationWindowSeconds: 300` (scale-down uses the *max* desired replicas over the window — it only shrinks when the whole window agrees).

**Cooldowns** exist because capacity changes have dead time: instance boot + app start + warm-up = 1-5 min before new capacity absorbs load. If the controller re-evaluates during dead time, it sees an unchanged metric and adds *more* — overshoot, then an oscillating sawtooth (flapping) as it corrects. Cooldown ≈ time-to-effective for a new instance. (Reduce the dead time itself with warm pools / pre-baked AMIs / faster app startup — shrinking dead time is more valuable than tuning the controller around it.)

**Scale-in dangers** beyond speed: instance termination must respect connection draining (Q4) and — for workers — in-flight job completion (scale-in protection while processing). And beware scale-in on the *same* metric collapsing: fewer instances → per-instance utilization rises → controller stops scaling in → equilibrium is fine; but with per-instance *RPS* targets and a fixed total load, aggressive scale-in can oscillate against scale-out. Stabilization windows fix most of this.

**Predictive scaling:** learn the daily/weekly cycle (AWS Predictive Scaling: ~2 weeks of history) and provision *ahead* of the 9am ramp instead of chasing it — reactive scaling is always late by (detection + boot + warm-up). Pair it with scheduled scaling for known events (product launch, Super Bowl ad — pre-scale explicitly; no forecaster predicts a one-off). Reactive stays enabled as the safety net for the unforecasted.

**Interview trap:** "Autoscaling handles traffic spikes." → Reactive autoscaling handles *ramps*, not *spikes*. A 10× spike in 30 seconds (push notification, TV moment) outruns any boot time; the fleet must survive on what's already running: load shedding, queue buffering, cached/degraded responses, and headroom. Autoscaling is capacity management on minutes-scale; overload protection is a different mechanism on seconds-scale, and you need both.

---

## Rate Limiting

### Q20. Rate limiting algorithms: token bucket vs sliding window log vs sliding window counter — memory and accuracy trade-offs.

**Answer:**

**Token bucket:** bucket of capacity B, refilled at r tokens/s; each request takes a token; empty = reject (or queue). Allows bursts up to B while enforcing average rate r — usually what you actually want (clients are bursty; punishing a 10-request page load under a "10 rps" limit is hostile). State: 2 numbers per key (token count, last-refill timestamp) — refill is computed lazily: `tokens = min(B, tokens + (now - last) * r)`. Leaky bucket is the same family shaped for smoothing (constant outflow — for traffic *shaping*, e.g., pacing calls to a fragile downstream, rather than policing).

**Fixed window counter:** `INCR ratelimit:{key}:{floor(now/window)}`, expire the key. Trivially cheap; broken at boundaries: 100 requests at 11:59:59 + 100 at 12:00:01 = 200 requests in 2 seconds under a "100/min" limit. Up to 2× overshoot.

**Sliding window log:** store every request timestamp (Redis ZSET), on each request `ZREMRANGEBYSCORE` older than window, `ZCARD` to count. Perfectly accurate; memory O(requests-in-window) per key — a 10k rps key holds 600k timestamps per minute-window ≈ tens of MB for one hot key. Fine for low-rate expensive operations (5 password attempts / 15 min), unaffordable at the edge.

**Sliding window counter (interpolation):** keep current and previous fixed-window counts; estimate:
```
count ≈ curr + prev × (overlap fraction of previous window)
```
e.g., 15s into a 60s window: `curr + prev × 0.75`. Assumes the previous window's traffic was uniform — bounded error (Cloudflare measured ~0.003% of requests wrongly allowed/blocked at scale), O(1) memory. This is the workhorse for high-cardinality edge limiting.

| Algorithm | Memory/key | Accuracy | Bursts | Use |
|---|---|---|---|---|
| Token bucket | O(1), 2 values | Exact avg rate; bursts by design | Allowed (up to B) | Default for API limits; AWS API Gateway, Stripe use this model |
| Fixed window | O(1) | Up to 2× boundary overshoot | Boundary bursts leak | Rough limits where overshoot is fine |
| Sliding log | O(N in window) | Exact | Fully controlled | Low-rate, high-stakes (auth attempts) |
| Sliding counter | O(1), 2 values | ~exact (uniformity assumption) | Smoothed | High-cardinality, edge scale |

**Interview trap:** "Which algorithm is most accurate?" is a warm-up; the real question is *what should the limit protect*. A user-facing "100 req/min" product quota (token bucket, generous burst) and an infrastructure "this service survives 5k rps" ceiling (concurrency limit + load shedding) are different mechanisms with different failure semantics; conflating them is the actual mistake.

### Q21. Distributed rate limiting: Redis + Lua, race conditions, and what the client should receive.

**Answer:**

With N gateway instances, local limits multiply (each allows 100/min → fleet allows N×100). Options:

1. **Centralized counter in Redis.** The naive `GET → compute → SET` is a read-modify-write race: two gateways read `tokens=1` concurrently, both allow, both write — over-admission exactly under contention (i.e., exactly when limits matter). Fix: make the check-and-decrement **atomic with a Lua script** (Redis executes scripts atomically):

```lua
-- KEYS[1]=bucket key; ARGV: rate, burst, now, cost
local t = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local tokens = tonumber(t[1]) or burst
local ts     = tonumber(t[2]) or now
tokens = math.min(burst, tokens + (now - ts) * rate)
local allowed = tokens >= cost
if allowed then tokens = tokens - cost end
redis.call('HMSET', KEYS[1], 'tokens', tokens, 'ts', now)
redis.call('PEXPIRE', KEYS[1], ttl)
return { allowed and 1 or 0, tokens }
```
(`INCR`+`EXPIRE` pipelines have their own classic race — the crash between INCR and EXPIRE leaves an immortal counter; Lua or `SET ... NX PX` closes it.)

Costs: +0.2-0.5ms per request (fine), Redis as SPOF for the decision path (decide fail-open vs fail-closed **explicitly** — fail-open for revenue traffic with abuse monitoring, fail-closed for auth/expensive endpoints), and hot-key ceiling: one global key maxes around one shard's ~100k ops/s. Shard the limit (`key:{0..7}`, each with 1/8 of the quota) if a single principal can exceed that.

2. **Local cache + async sync:** each node keeps local buckets and periodically reconciles with the global count (or gossips). Bounded over-admission (up to N × sync-interval × rate) in exchange for zero added latency and no Redis on the hot path. This is what most CDN/edge limiters do — at 300 PoPs, perfect global consistency is off the table; you tune the error bound.
3. **Sticky routing:** consistent-hash principals to gateway instances so each principal's counter lives on one node. Precise and cheap until a hot principal overloads its node (see Q2's bounded-load hashing).

**What to return:** `429 Too Many Requests` with `Retry-After: <seconds>` — well-behaved clients (and AWS SDKs) honor it. Include quota headers on *every* response so clients can self-throttle before hitting the wall — the emerging IETF standard `RateLimit-Limit / RateLimit-Remaining / RateLimit-Reset` (or the `X-RateLimit-*` de facto set). Distinguish 429 (you exceeded your quota — client's problem, keys off principal) from 503 + `Retry-After` (we are overloaded — our problem, applies to everyone). Server-side, ensure your own retry storms don't amplify: rejected clients retrying with exponential backoff *with jitter*, or your 429s synchronize clients into waves.

**Interview trap:** "Rate limit by IP." → Mobile carriers and corporate NATs put thousands of users behind one IP (false positives), and attackers rotate through thousands of IPs (false negatives). IP limits are only the outermost anti-DDoS layer; the real limits key on authenticated principal — API key, user ID, tenant — at the gateway, after authn. This ordering (authenticate, then rate limit by identity, with a stricter pre-auth IP limit protecting the authenticator itself) is the senior detail: the login endpoint needs its own limiter, or credential-stuffing bypasses everything keyed on identity.

**Interview trap:** "We rate limit, so we're safe from overload." → Rate limits enforce *policy* (fairness, quotas, abuse); they don't guarantee *capacity*. The sum of everyone's allowed quota can still exceed what the fleet can serve (quota oversubscription is normal and correct). Overload protection needs its own mechanisms: concurrency limits, load shedding by priority, circuit breakers. Rate limiting is one wall, not the building.

---

## Cross-Cutting Mechanics

### Q22. Map the full cache hierarchy of a real request — browser to DB buffer pool. What lives at each layer, and who owns invalidation?

**Answer:**

A single product-page request can be served (fully or partially) from seven different caches. Seniors are expected to place data deliberately at each layer rather than "add Redis":

```
Browser cache ──> CDN edge ──> CDN shield ──> API gateway cache
   │                                              │
   └── (miss) ────────────────────────────────────┘
                        │
              App-local L1 (in-process map/Caffeine)
                        │
              Redis / Memcached L2 (shared)
                        │
              DB (Postgres shared_buffers + OS page cache)
```

| Layer | What belongs there | TTL scale | Invalidation reality |
|---|---|---|---|
| Browser (`Cache-Control`, ETag) | Immutable assets (`max-age=31536000, immutable`), API GETs with ETag revalidation | Assets: 1yr; API: 0-60s | You cannot purge a browser. Versioned URLs only. Anything you might need to retract must be short-TTL or `no-store`. |
| CDN edge/shield | Public, shared responses; media; anonymous pages | Minutes-hours | Purge API or surrogate keys (Lesson Q6); soft purge (mark stale, SWR) beats hard purge |
| Gateway cache | Hot, semi-public API responses (`GET /trending`) | 1-60s | TTL only; keep it dumb |
| App-local L1 | Config, feature flags, hot keys (Q12), per-request memoization | 1-10s | Short TTL + pub/sub broadcast invalidation; accept the staleness bound |
| Redis L2 | Session state, rendered read models, per-user data | Minutes | Delete-on-write + TTL backstop (Q13) |
| DB buffer pool | Hot pages — you don't manage it, but you *size* for it | — | Automatic; your job is making the working set fit (RAM > hot index + hot rows) |

Two design rules worth stating in interviews:
1. **Cache as high as the data's shareability allows.** A response cacheable at the CDN for 30s eliminates the entire path behind it; a Redis hit still costs an app-tier request. Every layer you move a cache down multiplies the infrastructure that request traverses.
2. **Per-layer staleness budgets add up.** CDN 30s + L1 5s + Redis TTL 60s: the *worst-case* end-to-end staleness is the sum along the miss/refresh path, not the max. If product says "price changes must show within 60s," you must budget the layers explicitly.

**Interview trap:** "We cache at every layer for defense in depth." → Stacked caches multiply *debugging* cost too: "user sees stale data" now has five suspects, and each layer's metrics are needed to find which one lied. Cache layers you can't observe (hit ratio, age-at-serve) are layers you can't operate. Add a layer only with a named staleness budget and a metric.

### Q23. Negative caching and TTL selection — the two "small" cache decisions that cause real incidents.

**Answer:**

**Negative caching** = caching the *absence* of a thing ("user 123 not found", empty search result). Without it, requests for nonexistent keys are guaranteed cache misses that all hit the DB — which is exactly the shape of a **cache-penetration attack**: an attacker (or a buggy client, or a crawler) requests random nonexistent IDs, achieving a 0% hit ratio and a 100% DB passthrough at whatever rate they like.

Mechanics and pitfalls:
- Cache the miss with a *short* TTL (5-60s) and a distinct sentinel value (`"__NULL__"` or a typed wrapper) — never `nil`, which is indistinguishable from "not cached."
- Short TTL matters because negative entries have a nasty inversion: caching "user not found" for 1 hour right before that user signs up means the new user is invisible for an hour. Negative TTLs should be 10-100× shorter than positive TTLs, and creation paths should explicitly DEL the negative entry.
- For high-cardinality nonexistent-key floods (random IDs), negative caching doesn't help (every key is new). That's the job of a **Bloom filter** in front of the store: a bloom filter over all existing IDs (1% false positive rate ≈ ~10 bits/key — 100M keys ≈ 120 MB) answers "definitely absent" for ~99% of junk lookups without touching the DB. DNS is the canonical negative-caching system (RFC 2308, SOA-governed negative TTLs) — worth citing.

**TTL selection** is a three-way trade you should articulate rather than picking 300 because the tutorial did:

| Pressure | Pushes TTL... | Reasoning |
|---|---|---|
| Staleness tolerance (product) | Down | "Prices within 60s" is a *requirement*, TTL ≤ it (minus other layers, Q22) |
| Origin protection (DB load) | Up | Miss rate ≈ traffic × (1/TTL) per key population; halving TTL ~doubles refresh load |
| Memory footprint | Down | Longer TTLs keep cold keys resident; with LRU eviction this matters less (eviction, not expiry, reclaims) |

Practical defaults: hot read models 60-300s with jitter (±10%, Lesson Q10) and SWR semantics; config/flags 5-30s in L1; sessions = idle-timeout semantics (TTL refreshed on access); immutable derived data (rendered markdown of an edit-versioned doc) = no TTL, keyed by content hash — immutable keys are the best keys, because invalidation becomes garbage collection.

**Interview trap:** "Longer TTL = better hit ratio = always good." → TTL is a *consistency contract*, not a performance dial. The moment someone debugs "why does the API return the old value" and finds a 24h TTL with no invalidation path, your cache becomes the thing the org distrusts, and people start adding `?nocache=1` parameters — which then get crawled, and now your cache is bypassed in production. Set TTLs from the staleness requirement first, then check the resulting origin load, then add invalidation if both can't be satisfied.

### Q24. Kafka partitioning: how do you choose a partition key, what goes wrong with hot partitions, and why is repartitioning painful?

**Answer:**

The partition key decides three things at once — ordering, parallelism, and load distribution — and they fight:

- **Ordering:** Kafka guarantees order *within* a partition only. If consumers must see a user's events in order, the key must be `user_id` (all of a user's events → one partition). No key (round-robin/sticky batching) = max distribution, zero ordering.
- **Parallelism:** consumer-group parallelism caps at the partition count. 12 partitions = at most 12 concurrently consuming instances per group. Overprovision partitions upfront (e.g., 3-10× current consumer count; 30-100 partitions for a topic you expect to grow) because *changing* the count later breaks key→partition mapping.
- **Load distribution:** keyed partitioning is `hash(key) % N`. A skewed key population (one tenant is 40% of traffic) makes one partition 40% of the topic — its consumer lags while siblings idle, and its broker's disk fills first.

Hot-partition mitigations, in order:
1. **Better key:** partition by `(tenant_id, entity_id)` instead of `tenant_id` if ordering is only needed per entity — finer keys spread load while preserving the ordering you actually need. Always ask "what is the smallest unit that needs ordering?"
2. **Salting the whale:** for the one pathological key, append a salt (`bigtenant-0..7`) and accept per-salt (not per-tenant) ordering, re-sequencing downstream if needed.
3. **Two-tier topics:** route the top-N tenants to a dedicated topic with its own scaling. Crude, effective, common.

Why repartitioning hurts: adding partitions changes `hash(key) % N` for existing keys — a user's events now split across the old and new partition, breaking ordering *at the boundary* (consumers may read new-partition events before older old-partition events). Compacted topics are worse: the old partition retains a stale "latest" value for the key forever. So the honest options are: over-provision at creation; or migrate via a new topic (dual-write or mirror, drain, cut over) — a real project, not a config change. Contrast with queues (SQS): no partitions, no key math, no rebalancing — which is Lesson Q14's point about Kafka being a worse *task queue*.

Also name **rebalance pain**: consumer join/leave triggers partition reassignment; with eager rebalancing the whole group stops consuming (stop-the-world) — mitigated by cooperative/incremental rebalancing (`CooperativeStickyAssignor`, KIP-429) and static membership (`group.instance.id`) so a rolling deploy doesn't trigger N rebalances.

**Interview trap:** "We'll partition by user_id so it scales." → Follow-ups you must survive: what's your p99 tenant's share of traffic (skew)? What happens when you go from 12 to 24 partitions (ordering break)? What's consumer parallelism if one partition is 40% of volume (capped by the hot one)? "Partition by X" without a skew story is the Kafka equivalent of "use a queue for scalability."

### Q25. Backpressure: trace what happens when a downstream slows to 50% capacity. Buffer, shed, or block — and where?

**Answer:**

The scenario every senior should be able to narrate: your pipeline is `API → service A → service B → DB`, and the DB slows to half speed (vacuum, failover, noisy neighbor). What happens with no backpressure design:

```
DB slows → B's requests queue in B's connection pool → B's latency doubles
→ A's in-flight to B grows → A's memory/threads fill → A slows
→ API timeouts fire (but the work is still in flight!) → clients RETRY
→ offered load now 2-3x normal, at exactly half capacity
→ queues grow without bound → everything OOMs or times out → total outage
   from a partial slowdown              (a metastable failure)
```

The three legitimate responses, and where each belongs:

| Response | Mechanism | Use when |
|---|---|---|
| **Block (propagate)** | Bounded pools/queues; when full, the *caller* waits or errors — pressure flows upstream to the source | Synchronous paths. Bounded everything is the prerequisite: unbounded queues convert overload into latency into OOM. |
| **Buffer** | Durable queue absorbs the burst; consumers drain at their pace | Async work where latency can stretch (emails, webhooks, indexing). Only valid if average inflow < average capacity — a buffer handles *bursts*, not sustained overload; otherwise the queue grows forever and you've just moved the OOM to the broker while adding hours of lag. |
| **Shed** | Reject early (503/429 + `Retry-After`) at admission, by priority — drop prefetch/analytics traffic first, keep checkout | Sustained overload on sync paths. Rejecting 30% of requests in 1ms each beats accepting 100% and timing out all of them (goodput over throughput). |

Concrete mechanics to name: bounded connection pools with fast-fail (`pool_timeout=100ms` rather than infinite wait), per-endpoint concurrency limits (Little's Law sizing: limit ≈ target_RPS × p99_latency), **adaptive** concurrency (Netflix's gradient/AIMD limiters probe for the latency knee instead of using a static number), TCP's own flow control as the L4 layer of the same idea, and — critically — **retry budgets**: cap client retries at ~10-20% of request volume (Envoy retry budgets, gRPC), because uncoordinated retries are the amplifier that turns slowdowns into outages. Deadline propagation belongs here too: pass the remaining timeout downstream (gRPC deadlines) so B doesn't spend 5s computing a result A already gave up on at 2s.

The 3am detail: recovery from a queue-buffered slowdown means draining hours of backlog — during which fresh work sits behind stale work. Decide *in advance* whether old items are still worth processing (a 4-hour-old "your driver is arriving" push is worse than nothing → drop-by-age / TTL on messages) and whether drain order should be LIFO for freshness.

**Interview trap:** "We use a queue, so we have backpressure." → A queue with no consumer-lag alarm, no max-age policy, and no admission control is not backpressure; it's a delay line that hides the outage until it's hours deep. Backpressure = a *bounded* system with an explicit, chosen behavior at the bound. If you can't say what happens when the bound is hit, you haven't designed it.

### Q26. Global load balancing: how do you route users to the right region — DNS-based GSLB vs anycast — and how does regional failover actually work?

**Answer:**

Within a region, the LB story is Q1-Q4. *Across* regions, you can't put one LB in front (it would be in *some* region, defeating the purpose), so global routing happens at two layers:

**DNS-based GSLB (Route 53, NS1, Akamai GTM):** the authoritative DNS answers differently per client — latency-based routing (answer with the region historically fastest for the resolver's network), geo routing (compliance pinning: EU users → eu-west-1), weighted (canary a region at 5%), and failover records tied to health checks. Weaknesses seniors must name:
- DNS sees the *resolver*, not the user (mitigated partially by EDNS Client Subnet); a user on Google DNS 8.8.8.8 may be geolocated to the wrong place.
- Failover speed is bounded by TTL *and* by resolvers/apps that ignore TTL (Lesson Q17's JVM problem). A 60s TTL means minutes of traffic to a dead region during failover — plan for it, don't pretend it's instant.
- Long-lived connections never re-resolve: mobile apps holding connections keep hitting the dead region until the connection breaks. Client SDKs need re-resolve-on-error logic.

**Anycast (CloudFront/Cloudflare edges, Google GLB, AWS Global Accelerator):** advertise the *same IP* from many PoPs via BGP; internet routing delivers each packet to the topologically nearest PoP, which then proxies to a healthy origin region over the provider backbone. Failover is routing-table-fast (seconds, no client cooperation needed), no TTL problem, and you get static IPs. Costs: BGP "nearest" is hop-topology-nearest, not always latency-nearest; and mid-connection route flaps can break long TCP flows (why anycast pairs best with short-lived or connection-migrating protocols — QUIC's connection IDs help here).

Real designs stack them: `DNS (coarse geo/compliance) → anycast edge (fast, static entry) → edge proxies to regional ALBs (health-checked) → in-region L7`.

**Regional failover** is 90% a *data* problem, 10% traffic:
- **Active-active** (both regions serve writes): traffic failover is trivial — stop routing to the sick region. You paid for it earlier: multi-region data (conflict resolution, or region-pinned/cell-based data ownership where each user's writes home to one region).
- **Active-passive:** failover = promote the standby DB (async replication → the RPO question: how many seconds of writes are lost?), warm the caches (a cold Redis in the standby region + full traffic = a self-inflicted stampede, Lesson Q10), scale up the passive fleet (running it at 10% capacity means failover waits on autoscaling — run it at ≥50% of peak or pre-scale before flipping), then move traffic. The order matters: data first, capacity second, traffic last.
- Test it or you don't have it: untested failover paths fail at 3am with certainty. Game days, and ideally failover as a routine operation (some shops fail over monthly on schedule precisely so it stays boring).

**Interview trap:** "If us-east-1 dies, DNS fails us over to us-west-2, done." → Three follow-ups you must survive: What's the RPO (async replication lag = lost writes — who reconciles them when east returns)? Is west *provisioned* for 2× its normal load at that instant? And what do the users mid-session experience (session state pinned in east's Redis)? Traffic failover without a data and capacity story is a diagram, not a design.
