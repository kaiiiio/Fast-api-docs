# Lesson 4.7 — Design Uber

> Module: System Design (HLD) | Level: Senior | FDE Prep Phase 4

Ride hailing is the canonical "geo + real-time + state machine" interview. Junior candidates draw a box labeled "matching service" and hope nobody asks what's inside. Senior candidates get pushed on exactly three things: how you index moving drivers, how you survive 200k+ location writes per second, and how you guarantee one driver never gets two riders. This walkthrough is structured the way the interview actually goes.

## Step 1: Requirements (functional + non-functional)

### Clarifying questions you should ask (and why)

| Question | Why it matters |
|---|---|
| "Riders and drivers only, or also Eats/freight?" | Scopes the design. Multi-vertical changes the dispatch model. Agree: rides only. |
| "Do we build maps/routing, or consume them?" | Routing (ETA, turn-by-turn) is its own multi-year system. You want it as a black-box dependency, and you should say so out loud. |
| "How fresh must driver positions be on the rider's map?" | Determines update frequency (4-5s) and whether you can batch. Drives the entire ingestion design. |
| "Is matching automatic or does the driver accept?" | Driver acceptance introduces the offer/timeout/re-offer loop and the driver state machine — the deep dive interviewers love. |
| "Single city, single country, global?" | Rides never cross cities. That makes city/region sharding natural and kills most "global consistency" problems before they start. |
| "Do we handle payments in-scope?" | No — hand off to a payment system (see Lesson on payments). But fare *calculation* is in scope because it depends on the trip event log. |
| "Surge pricing in scope?" | Yes — it's a streaming-aggregation problem and a favorite deep dive. |

**Interview trap:** Candidates who don't explicitly say "maps and turn-by-turn routing are out of scope; I'll treat the routing/ETA service as a dependency with a known latency budget" end up spending 15 minutes on Dijkstra and never reach dispatch. Scope it, name it, move on.

### Agreed functional requirements

1. Rider requests a ride (pickup, destination, vehicle type); gets a price quote up front.
2. System matches the rider to a nearby available driver; driver can accept or decline.
3. Rider sees the driver approaching in near-real-time; both sides see trip state.
4. Trip lifecycle: request → match → pickup → ride → completion → fare.
5. Surge pricing per area based on supply/demand.
6. Trip history for both parties.

### Non-functional requirements

- **Scale:** 20M rides/day globally; ~1M concurrently online drivers at peak.
- **Latency:** match a rider in < 30s end-to-end (p99); location updates visible on the rider map within ~2s.
- **Availability > consistency for location data** (a slightly stale driver dot is fine).
- **Strong consistency for dispatch state** (a driver must never be assigned two trips).
- **Durability for trip/financial events** (billing depends on them; losing a trip event is a money bug).

**Interview trap:** Saying "we need strong consistency" as a blanket statement. This system has *two consistency regimes*: location data is ephemeral and last-write-wins; trip/dispatch state is transactional. Name both. Applying one regime to everything is the #1 signal of a mid-level answer.

## Step 2: Estimation

Work it out loud; the numbers drive the architecture.

**Rides:**
- 20M rides/day ÷ 86,400s ≈ 230 rides/s average; peak ~3x → **~700 ride requests/s**.
- Each ride ≈ 10-20 state-transition events → ~10k trip events/s peak. Trivial for Kafka; small for a DB.

**Driver locations — this is the real load:**
- 1M concurrent drivers, each pings every 4s → 1,000,000 ÷ 4 = **250k location writes/s**.
- Payload ≈ driver_id (8B) + lat/lng (16B) + heading/speed/status/ts (~26B) ≈ 50B raw; ~150-200B with envelope. 250k × 200B ≈ **50 MB/s ingress**. Bandwidth is fine; *write rate* is the problem.
- 250k writes/s into Postgres = dead on arrival. Into a durable LSM store (Cassandra) = possible but pointless — the data is worthless after 10 seconds. Conclusion (used in Step 6): keep it in memory.

**Storage:**
- Trip records: 20M/day × ~4KB (trip + event log summary) ≈ 80 GB/day ≈ 30 TB/year. Fine for a sharded relational store; archive cold trips to object storage.
- Live driver state: 1M drivers × ~100B ≈ 100 MB. *The entire live geo index fits in the RAM of one laptop.* Shard it for throughput and isolation, not for size — say this, it lands well.

**Read side:**
- Each waiting rider polls/streams nearby drivers ~every 2-4s. ~1M concurrently-open rider apps at peak → ~300-500k geo reads/s. Also served from the in-memory index.

## Step 3: API design

External APIs (mobile clients, via API gateway; drivers hold a persistent connection — gRPC stream or WebSocket — for offers and location):

```
POST /v1/quotes
  req:  { pickup: {lat, lng}, dropoff: {lat, lng}, vehicle_type }
  resp: { quote_id, price: 1450, currency: "INR", surge_multiplier: 1.4,
          eta_pickup_s: 240, expires_at }          # quote TTL ~2-5 min

POST /v1/rides                                      # Idempotency-Key header required
  req:  { quote_id, payment_method_id }
  resp: { ride_id, status: "MATCHING" }

GET  /v1/rides/{ride_id}
  resp: { ride_id, status, driver: {id, name, plate, rating},
          driver_location: {lat, lng, heading}, eta_s }

POST /v1/rides/{ride_id}/cancel
  req:  { reason }                                  # cancellation fee logic server-side

# Driver-side (over the persistent stream, shown as logical messages)
DRIVER -> server: { type: "LOCATION", lat, lng, heading, speed, ts }   # every 4-5s
server -> DRIVER: { type: "OFFER", offer_id, ride_id, pickup, fare, expires_in_s: 15 }
DRIVER -> server: { type: "OFFER_RESPONSE", offer_id, accept: true }
DRIVER -> server: { type: "TRIP_EVENT", ride_id, event: "ARRIVED" | "STARTED" | "COMPLETED" }
```

Design notes worth saying:
- **Quote is a separate resource with a TTL.** Price is locked at request time by referencing `quote_id` — this is the surge-pricing contract (Step 6.5). Never compute price at match time.
- **`POST /v1/rides` is idempotent** via client-generated `Idempotency-Key`. Mobile networks retry; without this, one tap = two rides = two charges.
- Location updates go over the *existing* persistent connection — no HTTP request per ping. 250k HTTP requests/s of TLS handshake overhead vs. frames on an open stream is the difference between 500 gateway boxes and 50.

**Interview trap:** Designing location updates as `POST /v1/drivers/{id}/location` REST calls. The moment you say "persistent connection, frames, batched," you've signaled you've operated real-time systems.

## Step 4: High-level architecture

```
                         ┌────────────────────────────────────────────────┐
  Rider app ──HTTPS──►   │  API Gateway / LB (per region)                 │
  Driver app ─gRPC/WS─►  │  authn, rate limit, connection registry        │
                         └───────┬───────────────────────┬────────────────┘
                                 │ ride requests          │ location frames (250k/s)
                                 ▼                        ▼
                       ┌─────────────────┐      ┌───────────────────────┐
                       │  Ride Service   │      │  Location Ingest      │
                       │ (trip state     │      │  (stateless, batches) │
                       │  machine)       │      └──────────┬────────────┘
                       └───┬─────────┬───┘                 │ produce
                           │         │                     ▼
                 ┌─────────▼──┐   ┌──▼──────────┐   ┌──────────────────────┐
                 │ Trips DB   │   │  Dispatch/  │   │ Kafka: driver_locs    │
                 │ (Postgres, │   │  Matching   │   │ (partitioned by       │
                 │ city-shard)│   │  Service    │   │  region/driver_id)    │
                 └────────────┘   └──┬───────┬──┘   └──────────┬───────────┘
                                     │       │                 │ consume
                                     │       │ k-nearest       ▼
                        offer via    │       │ query   ┌───────────────────┐
                        driver conn ◄┘       └────────►│ Geo Index Service │
                                                       │ in-memory, H3     │
                 ┌──────────────┐                      │ cells, sharded by │
                 │ Routing/ETA  │◄── ETA lookups ──────│ city/region       │
                 │ svc (black   │                      └───────┬───────────┘
                 │ box: OSRM/CH)│                              │ cell counts
                 └──────────────┘                              ▼
                 ┌──────────────┐   ┌──────────────┐   ┌───────────────────┐
                 │ Payment svc  │◄──│ Pricing svc  │◄──│ Surge pipeline    │
                 │ (Lesson ref) │   │ (quotes)     │   │ (Flink windows)   │
                 └──────────────┘   └──────────────┘   └───────────────────┘
```

Component walkthrough:

- **API Gateway / connection layer:** terminates TLS, holds ~2M persistent connections (drivers + active riders), maintains a *connection registry* (driver_id → gateway node) so the dispatch service can push an offer to the right box. This registry itself lives in Redis.
- **Location Ingest:** stateless; validates, stamps region, produces to Kafka partitioned by `h3_cell(region)` / driver_id. Deliberately dumb.
- **Kafka (driver_locs):** the shock absorber. Downstream geo index can restart and rebuild from the last few minutes of the topic. Short retention (10-15 min) — the data expires anyway.
- **Geo Index Service:** the heart. In-memory hash of H3 cell → set of drivers, sharded by city. Serves "k nearest available drivers" and "drivers near me" reads.
- **Dispatch/Matching:** consumes ride requests, queries geo index, ranks candidates by ETA (via routing service), runs the offer loop, owns the driver-availability state machine.
- **Ride Service + Trips DB:** durable trip state machine, event-sourced transitions, city-sharded Postgres.
- **Surge pipeline:** Kafka → Flink windowed aggregation → per-cell multipliers → Pricing service.
- **Routing/ETA service:** black box. One line for the interviewer: real implementations precompute contraction hierarchies over the road graph (OSRM/Google-style) so point-to-point ETA is ~1ms; we consume it, we don't build it.

## Step 5: Data model

Two very different stores, on purpose.

### Durable side — Postgres, sharded by city_id

```sql
CREATE TABLE trips (
  trip_id        UUID PRIMARY KEY,
  city_id        INT NOT NULL,               -- shard key
  rider_id       UUID NOT NULL,
  driver_id      UUID,                        -- null until matched
  status         TEXT NOT NULL,               -- REQUESTED|MATCHED|ARRIVING|IN_PROGRESS|COMPLETED|CANCELLED
  quote_id       UUID NOT NULL,
  fare_locked    NUMERIC(10,2) NOT NULL,      -- from the quote, incl. surge
  pickup_lat     DOUBLE PRECISION, pickup_lng DOUBLE PRECISION,
  dropoff_lat    DOUBLE PRECISION, dropoff_lng DOUBLE PRECISION,
  requested_at   TIMESTAMPTZ NOT NULL,
  completed_at   TIMESTAMPTZ,
  version        INT NOT NULL DEFAULT 0       -- optimistic concurrency on transitions
);
CREATE INDEX idx_trips_rider  ON trips (rider_id, requested_at DESC);
CREATE INDEX idx_trips_driver ON trips (driver_id, requested_at DESC);

CREATE TABLE trip_events (                    -- append-only; audit + billing source of truth
  event_id     BIGSERIAL PRIMARY KEY,
  trip_id      UUID NOT NULL,
  event_type   TEXT NOT NULL,                 -- MATCHED, DRIVER_ARRIVED, STARTED, GPS_TICK_SUMMARY, COMPLETED...
  actor        TEXT NOT NULL,                 -- rider|driver|system
  payload      JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trip_id, event_type)                -- for one-shot events: idempotent completion
);

CREATE TABLE quotes (
  quote_id   UUID PRIMARY KEY,
  rider_id   UUID, city_id INT,
  fare       NUMERIC(10,2), surge_multiplier NUMERIC(4,2),
  expires_at TIMESTAMPTZ NOT NULL
);
```

Why Postgres: trip transitions need transactions and conditional updates (`WHERE status = 'X' AND version = n`); volume (30 TB/yr before archival) is comfortably within sharded-Postgres territory; billing wants a relational audit trail. Why city-sharded: a ride never spans cities, so every transaction is single-shard. No cross-shard 2PC anywhere in the hot path — say this explicitly.

### Ephemeral side — Redis / in-memory geo index

```
# Per city shard, in the geo index service's memory (Redis as an alternative):
cell:{h3_res8}        -> SET of driver_ids                    # cell membership
driver:{id}           -> HASH {lat, lng, heading, cell, status, updated_at}
driver_lock:{id}      -> STRING offer_id, PX 20000            # dispatch lease, TTL 20s
conn:{driver_id}      -> gateway_node_id                      # connection registry
surge:{city}:{cell}   -> FLOAT multiplier, PX 120000
```

No index tuning, no schema migrations, no durability — because the data is worthless in 10 seconds. Losing a geo-index shard means degraded matching in one city for the seconds it takes to rebuild from Kafka. That trade is the correct one.

**Interview trap:** Putting driver locations in the trips database "so everything is in one place." 250k writes/s of ephemeral data into your financial system of record will destroy its cache, bloat its WAL, and take billing down with it. Physically separating regimes is the design.

## Step 6: Deep dives

### 6.1 Geo-indexing: how do you find drivers near a point?

**Why a B-tree on (lat, lng) fails.** A composite B-tree index sorts by lat first, then lng. "Drivers within 2km of (12.97, 77.59)" becomes `lat BETWEEN a AND b AND lng BETWEEN c AND d` — the index narrows the *lat band* efficiently, but within that band it must scan every longitude on Earth between c and d... actually worse: it scans the entire lat range and filters lng row-by-row. A 2km-tall lat band across a city with 50k drivers means examining thousands of rows to return 20. Range queries on two independent dimensions don't compose in one sorted structure. You need a *space-filling* scheme that maps 2D proximity to 1D key proximity — or a purpose-built spatial index.

**Option 1 — Geohash.** Interleave the bits of lat and lng, encode base32. Nearby points *usually* share a prefix, so "drivers near me" ≈ "keys with my prefix" — a prefix scan, which B-trees and Redis sorted sets do natively.

| Geohash length | Cell size (approx) |
|---|---|
| 4 | 39 km × 19.5 km |
| 5 | 4.9 km × 4.9 km |
| 6 | 1.2 km × 0.61 km |
| 7 | 153 m × 153 m |

The **boundary problem**: two points 10 meters apart can sit in different cells with *no shared prefix* (imagine standing just west of a cell edge). Prefix search alone silently drops the nearest driver. Fix: always search the target cell **plus its 8 neighbors** (9 prefix scans). Every geohash system in production does this; forgetting it is a correctness bug, not a perf bug.

**Option 2 — Google S2.** Projects the sphere onto 6 cube faces, then walks each face with a **Hilbert curve** — a space-filling curve with better locality than geohash's Z-order (Z-order has long "jumps"; Hilbert neighbors are almost always near in key space). 31 cell levels (level 12 ≈ 3-6 km², level 16 ≈ 20k m²). Killer feature: **region covering** — approximate any arbitrary polygon (an airport, a city) as a small set of cells at mixed levels, then do exact set-membership checks. Cells are near-uniform in area globally because it works on the sphere, not a Mercator-ish rectangle grid.

**Option 3 — Uber H3.** Hexagonal hierarchical grid, 16 resolutions. Res 8 ≈ **0.74 km²** per cell (typical dispatch resolution), res 9 ≈ 0.1 km², res 7 ≈ 5.2 km². Why hexagons beat squares: a square cell has two kinds of neighbors — edge neighbors (distance d) and corner neighbors (distance d×√2). A hexagon has exactly **6 neighbors, all equidistant**. So a k-ring (all cells within k steps) is a genuinely circular-ish search area with uniform distance semantics — exactly what "expand the search radius until I find enough drivers" needs. Squares over-search diagonals or under-search edges. Hexes also make per-cell aggregates (surge!) less distorted. Cost: hexagons don't subdivide perfectly into child hexagons (H3 uses an aperture-7 approximation with slight distortion) — fine for analytics/dispatch, not for exact containment proofs.

| | Geohash | S2 | H3 | PostGIS | Redis GEO |
|---|---|---|---|---|---|
| Cell shape | rectangles (distorted at poles) | quadrilaterals on sphere | hexagons | R-tree, exact geometry | geohash under the hood |
| Neighbor uniformity | poor (edge vs corner, aspect ratio varies) | good | **excellent (6 equidistant)** | n/a (exact) | poor |
| Radius/kNN query | prefix + 8 neighbors, manual | region covering, excellent | k-ring, excellent | exact, `ST_DWithin`, best correctness | `GEOSEARCH`, built-in |
| Polygon covering | crude | **best in class** | good | exact | no |
| Ops burden | none (it's just strings) | C++ lib | C lib, many bindings | run Postgres at 250k writes/s: no | Redis ops, easy |
| Best fit | simple proximity, cache keys | geofencing, arbitrary regions | **dispatch, k-ring, per-cell analytics** | low-write geospatial (geofences, zones) | small/medium scale, fast to ship |

**The in-practice answer** (say this verbatim-ish): driver locations live in an **in-memory index keyed by H3 cell, sharded by city** — a hash map `cell → set<driver>` plus `driver → cell` for moves, rebuilt from Kafka on restart. Redis GEO is the "ship it this quarter" version of the same idea. PostGIS is for the *static* geo data — city polygons, airport geofences, surge zone definitions — where writes are rare and correctness matters. Nobody serves live-driver kNN out of Postgres at this scale.

**Interview trap:** Reciting "use geohash" and stopping. The follow-up is always "what about a driver just across the cell boundary?" If you don't volunteer the 8-neighbor search (or k-ring for H3), the interviewer concludes you've read the blog post but never handled the bug.

### 6.2 Location update ingestion at 250k writes/s

The math from Step 2: 1M drivers ÷ 4s interval = 250k updates/s sustained. Design principles, in order:

**1. This data must not touch a durable database.** Three properties make it special: (a) *ephemeral* — a position is stale in seconds; (b) *last-write-wins per driver* — update N makes update N-1 worthless, so there is nothing to merge and no history worth keeping (beyond a coarse on-trip trace for the receipt, which is a separate, sampled, async path); (c) *loss-tolerant* — dropping one ping means the dot jumps 8s instead of 4s. Ephemeral + LWW + loss-tolerant = memory, not disk. Writing this to Postgres or even Cassandra buys you durability for data you'd delete anyway, at the cost of your I/O budget.

**2. At-most-once delivery is the *correct* semantic here** — not a compromise. Retrying a lost location update is actively harmful: by the time the retry lands, a fresher update exists. Fire-and-forget frames, no acks to the driver app, no client-side retry queue for location. (Trip *events* — arrived, started, completed — are the opposite: at-least-once + idempotent handling. Two regimes again.)

**3. Pipeline:** driver stream → gateway → thin ingest tier → **Kafka, partitioned by region (H3 res-4/5 cell) with driver_id as the key within the partition space** → geo-index shards consume their region's partitions and apply updates to memory. Why Kafka in the middle instead of ingest writing straight to the index: (a) restart/rebuild — an index shard replays 10 minutes of the topic and is current; (b) fan-out — the surge pipeline, ETA-improvement ML, and fraud detection consume the *same* stream without touching the hot path; (c) backpressure isolation — a slow consumer doesn't slow the gateways. Retention 10-15 min; this topic is a buffer, not a log of record.

**4. Client-side batching + delta compression.** The app buffers 2-3 GPS fixes and sends one frame; encodes position as a delta from the previous fix (a moving car shifts ~50m per tick — that's a couple of bytes as a varint delta vs 16 bytes of raw doubles). Halves frame count, cuts payload ~70%. At 250k/s these client-side tricks are worth more than any server optimization.

**5. Adaptive update frequency.** On-trip driver with a waiting rider watching the map: every 2-4s. Idle driver parked at a mall: every 30s, or event-triggered (moved > 100m). Uber does exactly this. A large fraction of your 1M drivers are idle at any moment — adaptive frequency can cut total write load 40-60% with zero product impact.

Failure handling: geo-index shard dies → its region's matching degrades for ~seconds while a replacement replays Kafka; meanwhile dispatch can fall back to a warm standby replica of the shard (consume the same partitions in parallel, serve reads from either). No data-loss story needed, because there is no data to lose.

**Interview trap:** "We'll write locations to Cassandra since it handles high write throughput." Cassandra *can* absorb 250k writes/s — with a 30-node cluster, compaction pressure, and tombstone churn from TTLs — to store data nobody will ever read back. Capability isn't justification. The senior move is recognizing the data doesn't merit durability at all.

### 6.3 Matching & dispatch: one driver, one rider, exactly

**Candidate generation.** Compute the pickup's H3 res-8 cell. Query k-ring 1 (cell + 6 neighbors ≈ 2-3 km²). Fewer than N candidates (N ≈ 10)? Expand to k-ring 2, then 3, capped (~5 rings ≈ beyond that, tell the rider "no drivers nearby"). This expanding-ring search is why hex k-rings matter: each expansion grows the radius uniformly.

**Filtering.** Drop drivers who are: not `idle`, wrong vehicle type, below rating threshold, or excluded (rider blocked them, driver recently declined this rider). Cheap in-memory predicates.

**Ranking — never straight-line distance.** A driver 400m away across a river or a divided highway is minutes worse than one 900m away on your side. Rank by **ETA from the routing service** (batch call: 1 pickup × 15 candidates). One line of depth: the routing service answers in ~1ms per pair because road graphs are preprocessed with contraction hierarchies (OSRM, Google's stack) — you consume it as a black box. Score = w1·ETA + w2·driver_acceptance_rate + w3·fairness/idle-time. Mention that at Uber-scale this becomes batched global matching (assign M riders to N drivers jointly, ~Hungarian-style, within a time window) rather than greedy per-request — one sentence, don't derail.

**The offer loop and the driver state machine.** Driver availability states: `idle → offered → assigned → on_trip → idle`. The whole correctness story is making these transitions atomic.

```
Dispatch                     Redis (driver state)              Driver app
   │  try lock best driver      │                                  │
   ├──SET driver_lock:D42 ─────►│  SET ... NX PX 20000             │
   │  = offer lease, TTL 20s    │  (fails if already locked)       │
   │◄─── OK ────────────────────┤                                  │
   ├──────────── push OFFER (15s to respond) ─────────────────────►│
   │                            │                                  │
   │◄─────────────────── ACCEPT ──────────────────────────────────┤
   ├── Lua: verify lock owner ─►│  atomic: check offer_id matches, │
   │   + idle→assigned          │  transition, else reject         │
   │◄─── committed ─────────────┤                                  │
   ├── write MATCHED to Trips DB (conditional: status=REQUESTED)   │
```

Key decisions:

- **Sequential vs broadcast offers.**

| | Sequential (offer to best, wait, next) | Broadcast (offer to top-k, first accept wins) |
|---|---|---|
| Rider wait time | slower (15s per decline) | fast |
| Driver experience | clean — an offer means it's yours | race — most accepters "lose", drivers learn to hate it |
| System complexity | simple state | must atomically pick one winner, apologize to k-1 |
| Marketplace effect | predictable acceptance data | trains drivers to spam-accept |

Uber-style answer: sequential with a short timeout (10-15s), falling back to *parallel-sequential* (offer to 2-3 simultaneously with first-accept-wins) only when supply is scarce. Pick sequential as your default and defend it.

- **Locking a driver during an offer = a lease, not a lock.** `SET driver_lock:{id} {offer_id} NX PX 20000`. If the dispatch worker crashes mid-offer, the TTL expires and the driver returns to the pool automatically — no stranded drivers, no manual cleanup. Lease TTL (20s) > offer timeout (15s) so the lease always outlives the decision window.

- **Avoiding double-dispatch: one atomic compare-and-set, two layers.** Layer 1 (fast path): the accept handler runs a Redis Lua script — *check `driver_lock` still holds this `offer_id`, check state is `offered`, transition to `assigned`* — one atomic unit; a competing dispatcher's accept fails cleanly. Layer 2 (durable truth): `UPDATE trips SET driver_id=$d, status='MATCHED' WHERE trip_id=$t AND status='REQUESTED'` — a conditional update; zero rows affected means the trip was cancelled/matched elsewhere, so roll back the Redis state. Redis is the coordination layer; Postgres is the arbiter of record. If they ever disagree, Postgres wins and a reconciler releases the driver.

- **Rider cancels mid-offer:** cancel sets trip to `CANCELLED` (conditional update); the in-flight accept then fails at Layer 2, dispatch releases the driver's lease. Every race resolves at the conditional DB update — that's the invariant to state.

**Interview trap:** "We lock the driver row in the database during matching." Holding a Postgres row lock across a 15-second human decision is how you exhaust your connection pool by lunchtime. Locks spanning human latency must be *leases with TTLs* in a coordination store, confirmed by a fast conditional write at decision time.

### 6.4 Trip state machine & exactly-once fare calculation

```
 REQUESTED ──match──► MATCHED ──driver──► DRIVER_ARRIVING ──driver──► IN_PROGRESS ──driver──► COMPLETED
     │                  │                     │                          │
     └─rider cancel     └─rider/driver cancel └─rider cancel (fee)       └─(no cancel; support-only)
                 all cancels ──► CANCELLED (terminal)
```

**Who can trigger what — enforce it server-side:** rider can cancel up to `IN_PROGRESS`; driver reports `ARRIVED`/`STARTED`/`COMPLETED`; only the system performs `match`. Every transition handler validates `(current_state, actor, event)` against this table and executes as a conditional update (`WHERE status = expected AND version = n`). Invalid or replayed transitions return the current state instead of erroring — that makes client retries free.

**Persist transitions as events, not just a status column.** `trip_events` (Step 5) is append-only: audit ("driver claims arrival at 14:02, rider disputes"), billing (fare = f(distance, time between STARTED and COMPLETED events, surge from the quote)), and analytics all read the event log. The `status` column on `trips` is a materialized convenience, derivable from events.

**Exactly-once fare calculation.** Networks give you at-least-once; you build exactly-once *effects* from idempotency:
1. Driver taps "complete" → `TRIP_COMPLETED` event insert hits `UNIQUE (trip_id, event_type)` — duplicate taps/retries insert zero rows.
2. In the same transaction: flip status (conditional) and enqueue a `CalculateFare(trip_id)` job via transactional outbox — so "event recorded" and "billing triggered" can't diverge.
3. Fare worker is deterministic (inputs: event log + locked quote) and writes `fare_calculations` keyed by `trip_id` (unique). Run it twice, get one row, same number.
4. Payment service is invoked with idempotency key `trip_id` — its problem from there (see the payments lesson).

**Interview trap:** Computing the fare from live meter state ("we accumulate distance in Redis during the trip"). If that Redis node dies, you've lost money data. Fare must be a *pure function of the durable event log* — recomputable, auditable, dispute-proof. Live meter state is display-only.

### 6.5 Surge pricing

**Signal:** per H3 cell (res 7/8) per time window: demand = ride requests + app-opens-with-intent; supply = idle drivers present. Multiplier = f(demand/supply), stepped (1.0, 1.2, 1.5, 2.0...), capped.

**Computation — streaming aggregation.** Ride-request events and driver-status events already flow through Kafka. A **Flink** job keys by cell, aggregates over **sliding windows (5 min, sliding every 1 min)**, emits `(cell, ratio)`; a pricing function maps ratio → multiplier and writes `surge:{city}:{cell}` to Redis with a TTL. End-to-end freshness ~1-2 min, which is the *product-correct* latency — you want surge to react in minutes, not milliseconds.

**Smoothing and hysteresis — or the price flaps.** Raw ratios are noisy (one bus unloading = demand spike). Three mechanisms: (a) EWMA over the windowed ratio; (b) **hysteresis** — raise the multiplier when the smoothed ratio crosses the up-threshold, but only lower it after it stays below a *lower* down-threshold for k windows (e.g., up at ratio > 2.0, down only after < 1.6 for 3 minutes). Rider psychology: a price that goes 1.0 → 1.8 → 1.0 → 1.8 within two minutes reads as manipulation; (c) rate-limit multiplier steps to one notch per window.

**Price locked at request time.** The quote (Step 3) freezes `fare × surge` with a 2-5 min TTL. The rider decides against a fixed number; if surge rises before they tap "request," they keep the quoted price until the quote expires. Requoting after acceptance is both a trust killer and, in several jurisdictions, illegal. This is why `quote_id` is a required input to `POST /rides`.

**The hex-boundary gaming problem.** Per-cell surge creates cliffs: cell A at 2.1x, adjacent cell B at 1.0x, so riders walk 200m across an invisible line to dodge surge (screenshots of this from geohash-square days are why H3 exists) — and drivers cluster just inside the hot cell, draining supply from B and *creating* surge there. Fix: after computing raw per-cell multipliers, apply **spatial smoothing across the k-ring** — effective multiplier = weighted average of the cell and its neighbors (kernel smoothing over the hex grid). Hexes make this clean: 6 equidistant neighbors, uniform weights. Result: a gradient instead of a cliff; nothing to game by walking one block.

**Interview trap:** Computing surge on-demand at quote time by counting drivers "right now." That's an expensive scatter-gather per quote, it's noisy (no windowing), and it flaps. Surge is a *precomputed, smoothed, streaming* product — quotes just read a Redis key.

## Step 7: Scale & evolve

**City sharding is the master stroke — exploit it everywhere.** A ride's rider, driver, pickup, dropoff, surge cell, and trip record all belong to one city. So: geo-index shards per city, Trips DB shards keyed by `city_id`, Kafka partitions by region, dispatch workers per city. No cross-shard transaction exists in the hot path. Cross-city reads (rider opens the app in a new city) are just routing to a different shard.

**Multi-region.** Deploy full stacks per geographic region (US-East, EU, India...), each owning a set of cities. A ride never spans regions, so there is no cross-region consistency problem for the core flow — only user-profile/payment data needs global replication (async, read-mostly). Region failover: cities are re-homed to a standby region; trips in flight during failover are the hard part — mitigate with cross-region async replication of the trips DB (RPO of seconds) and a reconciliation job that closes out orphaned trips generously (eat the fare, keep the customer).

**Hot-city scaling:** one city (São Paulo, ~peak) can dominate a shard. Sub-shard the geo index by H3 res-5 macro-cell within the city; dispatch remains city-scoped but queries multiple index sub-shards.

**Evolution path to mention:** greedy per-request matching → windowed batch matching (collect 2-5s of requests, solve assignment jointly — better global ETAs, enables pool/shared rides); straight ETA ranking → ML-scored dispatch (predicted acceptance, cancellation risk); add scheduled rides (a time-indexed queue that injects requests into normal dispatch at T-minus-ETA).

**Degradation modes (say these unprompted):** routing service down → fall back to haversine-distance ranking (worse matches, still matching); surge pipeline down → multipliers freeze at last value with TTL grace, then 1.0x (eat margin, keep rides flowing); geo index shard rebuild → widen k-ring search on the standby. Every dependency has a "worse but alive" mode.

## Common follow-up questions

**Q: Why not store driver locations in PostGIS since it has great spatial indexes?**
A: PostGIS R-tree (GiST) indexes are excellent for *query* correctness but every location update is an index mutation + WAL write; 250k/s of that saturates the box on writes for data that's stale in seconds. PostGIS is the right home for static geometry (city polygons, geofences, surge zones) that changes weekly, not for 1M moving points.

**Q: How does the rider's map show smooth driver movement with 4s updates?**
A: Client-side dead reckoning: interpolate along the road (last position + heading + speed, snapped to the road via the map SDK). The server sends sparse truth; the client animates. Cheaper than shrinking the interval globally.

**Q: What if two dispatch workers pick the same driver for different riders simultaneously?**
A: They both attempt `SET driver_lock:{id} NX` — Redis serializes; exactly one succeeds. The loser moves to its next candidate. Even if Redis coordination failed, the durable conditional update on the trips table is the final arbiter, and the reconciler releases inconsistently-held drivers.

**Q: Driver's phone dies mid-trip — what happens?**
A: Trip stays `IN_PROGRESS`. Connection registry notices the dropped stream; after a grace period (drivers go through tunnels — don't panic before ~60-90s) we notify the rider, offer support contact, and a sweeper flags long-silent trips. Fare disputes resolve from the last GPS events in the log. You cannot auto-complete — you don't know where the trip ended.

**Q: How do you test/verify matching correctness at this scale?**
A: Invariant checkers in production: a continuous job asserting "no driver appears on two non-terminal trips" and "no trip in MATCHED without a lease history." Plus deterministic simulation for the dispatch logic — replay recorded demand against the matcher in CI.

**Q: Why Kafka for locations instead of the ingest tier writing directly to the geo index?**
A: Rebuildability (index shards recover by replaying minutes of the topic), fan-out (surge/ML/fraud consume the same stream for free), and backpressure isolation. Direct writes couple gateway health to index health and give you nothing when a shard needs to restart.

**Q: How is the ETA on the rider's screen kept honest before pickup?**
A: Recompute driver→pickup ETA on each location tick (routing service, batched), push over the rider's stream. It's a read-side concern — no new state.

**Q: Where does ride pooling (UberPool) change the design?**
A: Matching becomes an insertion problem — can this new rider be inserted into an active trip's route within detour budgets for existing passengers? Requires windowed batch matching and route-insertion cost checks against the routing service. Trip state machine gains per-passenger sub-states. Everything else (geo index, ingestion, surge) is unchanged — which is the point of the modular decomposition.

## What gets you rejected

- **One consistency regime for everything.** Treating driver pings like financial data (or worse, trip events like pings). The entire design hinges on separating ephemeral-LWW data from transactional state.
- **B-tree/`WHERE lat BETWEEN` for proximity, or "geohash" with no boundary-problem awareness.** The 8-neighbor/k-ring search is the shibboleth.
- **Row locks across human decisions.** Any design that holds a DB lock while a driver decides for 15 seconds.
- **No offer timeout / no lease TTL.** A crashed dispatcher permanently stranding a driver in `offered` means you didn't think about failure.
- **Fare computed from volatile state** instead of the durable event log. Money must be recomputable.
- **Building the routing engine.** Spending your 45 minutes on shortest-path algorithms instead of dispatch. Scope it as a dependency in the first five minutes.
- **Surge as an on-demand computation** with no windowing, smoothing, or price lock — you've designed a price that flaps and a quote that lies.
- **No numbers.** If you never say "250k location writes/s" out loud, every architectural choice looks arbitrary. The estimation isn't a ritual; it's the justification for keeping the geo index in memory.
