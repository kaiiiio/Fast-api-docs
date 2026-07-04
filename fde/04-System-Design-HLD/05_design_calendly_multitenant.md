# Lesson 4.5 — Design a Multi-Tenant Scheduling System (Calendly)

> Module: System Design (HLD) | Level: Senior | FDE Prep Phase 4

This is the flagship question of this module, and it is the exact HLD question asked at Heizen. It looks deceptively simple — "let people book meetings" — and that is the trap. The scale is modest; the difficulty is **correctness**: timezones, double-booking races, external calendar sync, and multi-tenancy. Interviewers use this question to separate people who can draw boxes from people who understand invariants. A previous candidate for this exact role was rejected for hand-waving exponential backoff — that section below is non-negotiable reading.

---

## Step 1: Requirements (functional + non-functional)

### Clarifying questions you should ask (and why each matters)

Never start drawing. Ask these first — each one changes the design:

1. **"Is this single-user Calendly or multi-tenant B2B (teams/orgs)?"**
   Why it matters: multi-tenancy drives the data model, isolation strategy, and pricing tiers. If the interviewer says "multi-tenant," you now owe them a tenant isolation discussion (Deep Dive 6). Heizen asks the multi-tenant variant.

2. **"Do hosts define availability as recurring rules or explicit slots?"**
   Why it matters: this is the single biggest design fork. Rules ("Mon–Fri 9–5") mean you compute availability on read. Materialized slots mean you pre-generate rows. The wrong answer here (materializing) creates an invalidation nightmare — see Deep Dive 1.

3. **"Do we sync with external calendars (Google/Outlook)?"**
   Why it matters: yes means webhooks, sync tokens, backoff, and eventual consistency enter the design. It also means availability is a *merge* of internal bookings and external busy blocks.

4. **"What consistency do we need on booking? Is a rare double-booking acceptable?"**
   Why it matters: the answer is always "no double-booking, ever" — which means you need strict serializability on the booking write path, and you should say the phrase "the booking write is the only part of this system that needs strong consistency; everything else can be eventually consistent." That sentence is a senior signal.

5. **"Scale? How many hosts, bookings/month?"**
   Why it matters: to establish that this is NOT a scale problem. Say it explicitly: *"100k hosts and 10M bookings/month is ~4 writes/sec. The challenge here is correctness, not throughput — I'll spend my time on invariants, not sharding."* Interviewers remember candidates who correctly identify what is hard about a problem.

6. **"One-on-one only, or group events / round-robin / collective availability?"**
   Why it matters: round-robin and collective ("find a slot where all 3 hosts are free") change the availability computation from a single-host merge to an N-way intersection. Scope it out for v1, mention it in Step 7.

7. **"Do invitees need accounts?"**
   Why it matters: no accounts means the booking flow is unauthenticated public traffic — rate limiting, bot protection, and idempotency matter more.

### Agreed functional requirements

- Hosts define **recurring weekly availability rules** in their own timezone, plus date-specific overrides ("off on July 4th", "extra hours on the 15th").
- Hosts define **event types** (30-min intro call, 60-min consult) with buffer times, minimum notice, max bookings/day.
- Invitees see available slots **in their own timezone** and book without an account.
- Two-way sync with Google Calendar and Outlook: external busy time blocks slots; our bookings appear on the host's calendar.
- Reschedule/cancel with notifications; reminders at 24h and 1h before.
- Multi-tenant: organizations own hosts; enterprise tenants may demand data isolation.

### Non-functional requirements

- **Zero double-bookings.** This is the invariant. Everything else is negotiable.
- Slot lookup p99 < 500ms (it's the conversion-critical page).
- Booking confirmation p99 < 2s.
- Calendar sync freshness: seconds via webhook, minutes worst-case via polling fallback.
- 99.95% availability on the booking path.
- Tenant isolation appropriate to tier (shared for SMB, dedicated for enterprise).

**Interview trap:** Jumping into architecture without stating the core invariant. Say "no double-booking is the invariant; I will design the write path around it" in the first five minutes. Candidates who discover the double-booking race in minute 35 look like they've never operated a booking system.

---

## Step 2: Estimation

Do this out loud, step by step. The point is to prove the numbers are small.

**Hosts and tenants:**
- 100k hosts across 20k tenants (avg 5 hosts/tenant, power-law: a few tenants have 1000+).

**Bookings:**
- 10M bookings/month.
- 10M / (30 days × 86,400 s) ≈ 10M / 2.6M s ≈ **~4 bookings/sec average**, maybe 20/sec peak (business hours, Mon–Tue heavy). Trivial write load for a single Postgres.

**Availability reads (the real traffic):**
- Each booking is preceded by ~20 availability-page views (funnel: shared link → browse weeks → pick slot). 10M × 20 = 200M slot-computation reads/month ≈ **~80 reads/sec average, ~400/sec peak**. Still small, but each read is *computationally* non-trivial (rule expansion + interval merge) — this is why we cache computed availability, not because of QPS.

**Calendar sync:**
- 100k hosts × avg 10 external calendar events changed/day = 1M webhook deliveries/day ≈ **~12/sec**. Plus polling fallback: 100k hosts polled every 15 min = ~110 polls/sec against external APIs — this is our biggest *outbound* traffic and the reason rate-limit handling and backoff matter (Deep Dive 4).

**Reminders:**
- 10M bookings × 2 reminders = 20M scheduled sends/month ≈ **~8/sec average**, but lumpy — reminders cluster at :00 and :30 because meetings do. Peak minute can be 100× average. Design the scheduler for the lumps, not the average.

**Storage:**
- Booking row ~1 KB (times, parties, metadata, idempotency key). 10M/month × 12 × 3 years ≈ 360M rows ≈ 360 GB. One Postgres with partitioning by month handles this comfortably.
- Availability rules: 100k hosts × ~10 rules = 1M tiny rows. Nothing.

**Say the conclusion explicitly:** *"Every number here fits in one well-tuned Postgres. I will not shard, I will not introduce Cassandra. The engineering budget goes to correctness: conflict prevention, timezone math, and sync reliability."* Identifying that a problem is correctness-bound rather than scale-bound is precisely what senior interviews test.

**Interview trap:** Reflexively proposing microservices + Kafka + sharded NoSQL for 4 writes/sec. Interviewers call this "resume-driven design." Over-architecting a small-scale/high-correctness problem is a *rejection* signal at senior level, not a bonus.

---

## Step 3: API design

Public (invitee-facing, unauthenticated):

```
GET /v1/hosts/{host_slug}/event-types/{event_slug}/availability
    ?start=2026-07-06&end=2026-07-12&tz=Asia/Kolkata

200 {
  "timezone": "Asia/Kolkata",          // echo of requested display tz
  "slots": [
    { "start": "2026-07-06T18:30:00+05:30", "end": "2026-07-06T19:00:00+05:30" },
    ...
  ],
  "generated_at": "2026-07-04T10:15:00Z"   // staleness hint for the client
}
```

```
POST /v1/bookings
Idempotency-Key: 7f3a9c...            // REQUIRED header — see Deep Dive 3
{
  "event_type_id": "et_123",
  "start": "2026-07-06T13:00:00Z",     // always UTC on the wire
  "invitee": { "name": "Asha", "email": "asha@x.com", "tz": "Asia/Kolkata" },
  "answers": [ ... ]
}

201 { "booking_id": "bk_456", "status": "confirmed", ... }
409 { "error": "slot_taken", "refresh_availability": true }   // race lost
409 { "error": "idempotency_conflict" }                       // same key, different body
```

```
POST /v1/bookings/{id}/cancel        { "reason": "..." }
POST /v1/bookings/{id}/reschedule    { "new_start": "...", "idempotency_key": "..." }
```

Host/admin (authenticated, tenant-scoped):

```
PUT  /v1/hosts/{id}/availability-rules
{
  "timezone": "America/New_York",     // IANA name, per rule-set — see Deep Dive 2
  "rules": [
    { "day": "MON", "start": "09:00", "end": "17:00" },
    { "day": "TUE", "start": "09:00", "end": "12:00" }
  ],
  "overrides": [
    { "date": "2026-07-04", "slots": [] },                          // day off
    { "date": "2026-07-15", "slots": [{"start":"10:00","end":"14:00"}] }
  ]
}

POST /v1/integrations/google/connect          // OAuth dance
POST /v1/webhooks/google                      // inbound push notifications
POST /v1/webhooks/microsoft                   // Graph change notifications
```

Design notes worth saying out loud:
- **Booking POST takes UTC instants**, not local wall time. The client already resolved the slot; re-resolving local time server-side invites DST bugs.
- **`Idempotency-Key` is mandatory** on booking creation. Retries (user double-click, network retry, our own backoff) must not create duplicates.
- The availability response includes `generated_at` so the client can show "refreshing..." and re-fetch before submit — cheap optimistic freshness that reduces 409s.
- A 409 on booking returns `refresh_availability: true`: the client re-fetches slots instead of showing a dead-end error. Design the API for the race, because the race will happen.

**Interview trap:** Designing `GET /slots` to return times in the *host's* timezone or in floating local time. The invitee books in *their* timezone; return ISO-8601 with offsets (or UTC + a display tz) so the client cannot misinterpret. Every ambiguity in time representation becomes a support ticket.

---

## Step 4: High-level architecture

```
                                  ┌──────────────────────────────────────────────┐
                                  │                 CDN / WAF                    │
                                  └──────────────┬───────────────────────────────┘
                                                 │
                                        ┌────────▼─────────┐
                                        │   API Gateway     │  authn, per-tenant
                                        │  (rate limiting)  │  rate limits
                                        └───┬──────────┬────┘
                                            │          │
                              ┌─────────────▼──┐   ┌───▼──────────────┐
                              │ Availability   │   │  Booking Service │
                              │ Service        │   │  (the invariant  │
                              │ (rule expand + │   │   lives here)    │
                              │  interval math)│   └───┬──────┬───────┘
                              └───┬────────┬───┘       │      │
                                  │        │           │      │ outbox events
                       cache ┌────▼───┐ ┌──▼───────────▼──┐ ┌─▼──────────────┐
                       (busy │ Redis  │ │    Postgres     │ │ Kafka / stream │
                       sets, │        │ │  (bookings,     │ └─┬────────┬─────┘
                       slots)└────────┘ │   rules, tenants│   │        │
                                        │   EXCLUDE gist  │   │        │
                                        │   constraint)   │   │        │
                                        └────────▲────────┘   │        │
                                                 │            │        │
        Google push ──► ┌──────────────────┐     │      ┌─────▼───┐ ┌──▼─────────┐
        MS Graph    ──► │  Sync Service    │─────┘      │Notifier │ │ Reminder   │
        webhooks        │ (webhooks + poll │ writes     │(email/  │ │ Scheduler  │
                        │  fallback, sync  │ busy blocks│  SMS)   │ │(due-time   │
                        │  tokens, backoff)│            └─────────┘ │ poller)    │
                        └──────────────────┘                        └────────────┘
```

**Component walkthrough:**

- **API Gateway** — terminates auth, applies per-tenant rate limits (fairness — see Step 7). Public booking endpoints get bot protection.
- **Availability Service** — stateless. On request: load rules + overrides (cached), load busy intervals (bookings from Postgres + external busy blocks written by Sync Service), run the interval-merge algorithm (Deep Dive 1), discretize into slots, return. Results cached in Redis with short TTL and event-based invalidation.
- **Booking Service** — the only component that needs strong consistency. Owns the transactional write: validate slot still open → insert booking under lock/constraint (Deep Dive 3) → write outbox event in same transaction. No booking exists that didn't pass the exclusion constraint.
- **Postgres** — single primary + read replicas. Bookings, rules, tenants, sync state. The `EXCLUDE USING gist` constraint is the last line of defense against double-booking.
- **Sync Service** — consumes Google/Microsoft webhooks, runs incremental delta syncs with sync tokens, falls back to scheduled polling, pushes our bookings out to external calendars. All external calls wrapped in full-jitter exponential backoff + circuit breaker (Deep Dive 4).
- **Kafka (or even Postgres outbox + worker)** — decouples booking commits from side effects. At 4 writes/sec, a transactional outbox table polled by workers is honestly sufficient; say so, then add "Kafka if the org already runs it."
- **Reminder Scheduler + Notifier** — durable scheduled sends with tombstone checks (Deep Dive 5).

**Interview trap:** Making the Availability Service read external calendar APIs *synchronously* on every slot lookup. That puts Google's p99 (and their 429s) in your conversion-critical page. Sync Service maintains a local copy of busy blocks; the availability read path never leaves your infrastructure. State this — it shows you think about whose latency budget you're spending.

---

## Step 5: Data model

Datastore: **PostgreSQL**. Why: we need multi-row transactions, range types with exclusion constraints (a Postgres superpower for exactly this problem), row-level security for tenancy, and our scale fits one primary. No NoSQL earns its keep here.

```sql
-- Tenancy
CREATE TABLE tenants (
  tenant_id     UUID PRIMARY KEY,
  name          TEXT NOT NULL,
  tier          TEXT NOT NULL CHECK (tier IN ('smb','enterprise')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE hosts (
  host_id       UUID PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES tenants,
  email         TEXT NOT NULL,
  slug          TEXT NOT NULL,
  UNIQUE (tenant_id, slug)
);
CREATE INDEX ON hosts (tenant_id);          -- tenant_id prefixes every index

-- Availability RULES, not slots. Times are local wall-clock in the rule's tz.
CREATE TABLE availability_rules (
  rule_id       UUID PRIMARY KEY,
  tenant_id     UUID NOT NULL,
  host_id       UUID NOT NULL REFERENCES hosts,
  timezone      TEXT NOT NULL,              -- IANA: 'America/New_York'. NEVER an offset.
  day_of_week   SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_local   TIME NOT NULL,              -- '09:00' — local wall time
  end_local     TIME NOT NULL,
  version       INT NOT NULL DEFAULT 1
);
CREATE INDEX ON availability_rules (tenant_id, host_id);

CREATE TABLE availability_overrides (       -- date-specific exceptions
  override_id   UUID PRIMARY KEY,
  tenant_id     UUID NOT NULL,
  host_id       UUID NOT NULL REFERENCES hosts,
  date_local    DATE NOT NULL,              -- in the host's rule timezone
  slots         JSONB NOT NULL,             -- [] = day off; else replaces rules for that date
  UNIQUE (tenant_id, host_id, date_local)
);

CREATE TABLE event_types (
  event_type_id     UUID PRIMARY KEY,
  tenant_id         UUID NOT NULL,
  host_id           UUID NOT NULL REFERENCES hosts,
  duration_min      INT NOT NULL,
  buffer_before_min INT NOT NULL DEFAULT 0,
  buffer_after_min  INT NOT NULL DEFAULT 0,
  min_notice_min    INT NOT NULL DEFAULT 240,
  max_per_day       INT,                    -- NULL = unlimited
  slot_increment_min INT NOT NULL DEFAULT 30
);

-- Bookings: instants in UTC (timestamptz), range type for the constraint.
CREATE TABLE bookings (
  booking_id      UUID PRIMARY KEY,
  tenant_id       UUID NOT NULL,
  host_id         UUID NOT NULL REFERENCES hosts,
  event_type_id   UUID NOT NULL,
  time_range      TSTZRANGE NOT NULL,       -- [start, end) in UTC
  invitee_email   TEXT NOT NULL,
  invitee_tz      TEXT NOT NULL,            -- IANA, for display + reminders
  status          TEXT NOT NULL DEFAULT 'confirmed'
                    CHECK (status IN ('hold','confirmed','cancelled')),
  idempotency_key TEXT,
  hold_expires_at TIMESTAMPTZ,              -- for status='hold'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, idempotency_key)
);
CREATE INDEX ON bookings (tenant_id, host_id, time_range);   -- gist below covers range queries too

-- THE constraint. Double-booking is impossible at the DB level, whatever the app does.
ALTER TABLE bookings ADD CONSTRAINT no_double_booking
  EXCLUDE USING gist (
    host_id WITH =,
    time_range WITH &&
  ) WHERE (status IN ('hold','confirmed'));

-- External calendar busy blocks (written by Sync Service)
CREATE TABLE external_busy (
  id            UUID PRIMARY KEY,
  tenant_id     UUID NOT NULL,
  host_id       UUID NOT NULL,
  provider      TEXT NOT NULL,              -- 'google' | 'microsoft'
  external_id   TEXT NOT NULL,              -- provider event id, for delta updates
  time_range    TSTZRANGE NOT NULL,
  UNIQUE (host_id, provider, external_id)
);
CREATE INDEX ON external_busy USING gist (host_id, time_range);

CREATE TABLE calendar_connections (
  host_id        UUID NOT NULL,
  provider       TEXT NOT NULL,
  sync_token     TEXT,                      -- Google nextSyncToken / Graph deltaLink
  channel_id     TEXT,                      -- webhook channel
  channel_expiry TIMESTAMPTZ,               -- channels expire; renew before this
  last_full_sync TIMESTAMPTZ,
  PRIMARY KEY (host_id, provider)
);

CREATE TABLE reminders (
  reminder_id   UUID PRIMARY KEY,
  tenant_id     UUID NOT NULL,
  booking_id    UUID NOT NULL REFERENCES bookings,
  kind          TEXT NOT NULL,              -- '24h' | '1h'
  due_at        TIMESTAMPTZ NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  UNIQUE (booking_id, kind)                 -- dedupe key for idempotent sends
);
CREATE INDEX ON reminders (status, due_at); -- the poller's index
```

Key decisions to narrate:

| Decision | Choice | Why |
|---|---|---|
| Rules vs materialized slots | Rules | Rule edit = 1 row update, not millions of slot rows invalidated (Deep Dive 1) |
| Rule time storage | Local `TIME` + IANA tz name | DST-correct expansion per date (Deep Dive 2) |
| Booking time storage | `TSTZRANGE` in UTC | Instants are unambiguous; range type enables the EXCLUDE constraint |
| Double-booking defense | EXCLUDE USING gist | Enforced by the DB regardless of app bugs (Deep Dive 3) |
| tenant_id everywhere | First column of every index | Multi-tenant queries always filter by tenant; index locality + RLS (Deep Dive 6) |
| Datastore | Single Postgres | Scale fits; transactions and range constraints are load-bearing |

---

## Step 6: Deep dives

These are the sections interviewers push on. Know them cold.

### Deep dive 1: Availability rules engine

**The core decision: store rules, compute slots on read. Never materialize slots.**

Why not materialize? Suppose you pre-generate slot rows 60 days out, 16 slots/day, 100k hosts: ~100M rows. Now a host changes "Mondays 9–5" to "Mondays 10–4": you must find and rewrite every affected future slot row — and do it atomically with respect to in-flight bookings. A single rule edit fans out to millions of row invalidations across all hosts who edit that day. Then external calendar changes *also* invalidate slots continuously. Materialization turns one logical fact ("Mondays 9–5") into millions of denormalized copies that all have to be kept coherent. Compute-on-read keeps one source of truth and makes a rule change O(1).

**Slot computation pipeline** (for a requested window, e.g. one week):

```
1. EXPAND      rules → concrete local intervals for each date in window
               (per-date tz conversion — see Deep Dive 2)
               apply overrides: an override row for a date REPLACES rules for that date
2. SUBTRACT    busy intervals:
                 - confirmed + held bookings (bookings table)
                 - external busy blocks (external_busy table)
                 - buffers: inflate each busy interval by buffer_before/after
3. CONSTRAIN   - drop anything earlier than now + min_notice
                 - enforce max_per_day (count existing bookings per local date)
4. DISCRETIZE  walk remaining free intervals in slot_increment steps;
               emit slots where slot_start + duration <= interval_end
5. CONVERT     to invitee's display timezone
```

**Interval-merge algorithm sketch** (the part they may ask you to whiteboard):

```
# All intervals as (start_utc, end_utc), half-open [start, end)

def subtract_busy(free: list[Interval], busy: list[Interval]) -> list[Interval]:
    busy = merge_overlapping(sorted(busy))        # classic merge-intervals, O(n log n)
    out = []
    for f in free:
        cursor = f.start
        for b in busy:
            if b.end <= cursor or b.start >= f.end:
                continue                          # no overlap with remaining free part
            if b.start > cursor:
                out.append((cursor, b.start))     # free chunk before this busy block
            cursor = max(cursor, b.end)
        if cursor < f.end:
            out.append((cursor, f.end))
    return out

def merge_overlapping(sorted_ivals):
    out = []
    for iv in sorted_ivals:
        if out and iv.start <= out[-1].end:
            out[-1].end = max(out[-1].end, iv.end)
        else:
            out.append(iv)
    return out
```

Complexity: O((F+B) log(F+B)) for a week, F and B both < 100 for a normal host. Microseconds. This is why compute-on-read is affordable.

**Caching:** cache the computed slot list per (host, event_type, week, display_tz-agnostic UTC form) in Redis, TTL 60s, and invalidate on: booking created/cancelled for that host, rule/override change, external_busy change for that window. Even a 30-second TTL absorbs the browse-heavy funnel (20 reads per booking). Cache the UTC slot list and convert to display tz at the edge — otherwise your cache key space multiplies by every invitee timezone.

**Interview trap:** Proposing "pre-compute slots nightly for the next 60 days." The interviewer will ask "host edits their rules at 2pm — now what?" and "Google webhook says a new meeting appeared — now what?" and you're stuck describing a cache-invalidation system harder than the original problem. Rules-on-read makes both questions trivial: nothing to invalidate but a 60-second cache.

### Deep dive 2: Timezone hell

Rules for storage, stated as commandments:

1. **Instants (bookings, reminders, sync data) in UTC** (`timestamptz`). An instant is a physical moment; UTC represents it unambiguously.
2. **Recurring rules as local wall time + IANA zone name** (`'09:00'` + `'America/New_York'`). Never a fixed offset, never pre-converted UTC.

Why "9:00 America/New_York" beats "14:00 UTC": the host means *9am on their wall clock, every Monday, forever*. In January, 9am ET = 14:00 UTC (UTC-5, EST). In July, 9am ET = 13:00 UTC (UTC-4, EDT). If you store 14:00 UTC, the host's availability silently shifts to 10am local every spring — a bug class that ships fine in winter, breaks in March, and generates furious "Calendly showed my invitee a slot during my school run" tickets. The rule's meaning is anchored to the *civil* clock, so store the civil time and resolve to UTC **per date** via the tz database (IANA tzdata — which encodes every DST transition, historical and future, and gets updated when countries change their rules; another reason not to hardcode offsets).

**Expansion must be per-date:**

```
for each date D in requested window:
    local_start = combine(D, rule.start_local)           # e.g. 2026-07-06 09:00
    utc_start   = zoneinfo(rule.timezone).to_utc(local_start, on_gap=..., on_ambiguity=...)
```

**The two DST edge cases you must name:**

- **Nonexistent hour (spring forward).** In America/New_York on 2026-03-08, clocks jump 02:00 → 03:00. Local time 02:30 *does not exist*. A rule "02:00–04:00" (or a slot landing there) must be handled: standard policy is shift forward to the next valid instant, or simply drop slots in the gap. Your tz library will either throw or pick a side — you must choose deliberately, not by default.
- **Ambiguous hour (fall back).** On 2026-11-01, clocks go 02:00 → 01:00. Local 01:30 happens *twice* (EDT then EST). Policy: pick the first occurrence, consistently. Again: deliberate choice, tested.

**Display:** always render in the *invitee's* timezone (browser-detected via `Intl.DateTimeFormat().resolvedOptions().timeZone`, user-overridable). Include the zone name in confirmation emails — "10:00 AM IST (Asia/Kolkata)" — because the invitee forwarding the invite to a colleague in another zone is a real failure mode.

**The test case to mention:** *host in New York, invitee in Kolkata (UTC+5:30 — half-hour offset, no DST), booking a slot in the week containing the US DST transition.* A correct system shows the invitee's local times shifting by an hour across the boundary while the host's 9am stays 9am. If your test suite doesn't cross a DST boundary, your timezone code is untested. Bonus points: mention Australia (southern hemisphere — DST in December) and Nepal (UTC+5:45).

| Storage option | Recurring rule survives DST? | Survives tzdata law changes? | Verdict |
|---|---|---|---|
| Local time + IANA name | Yes | Yes (tzdata update) | Correct |
| UTC instant | No — shifts by 1h twice a year | No | Wrong for rules (right for bookings) |
| Fixed offset ("-05:00") | No | No | Always wrong |

**Interview trap:** Saying "I'll store everything in UTC" as a blanket answer. It's the right answer for *instants* and the wrong answer for *recurring civil-time rules* — and this question is designed to check whether you know the difference. The candidate who stores rules in UTC has built a system that breaks twice a year by design.

### Deep dive 3: Booking conflict prevention (the double-booking race)

The race, in full: two invitees load the same availability page (both see 10:00 free), both POST a booking for 10:00 within milliseconds. Two app servers each run "check slot free → insert booking." Both checks pass (both read the pre-insert state), both insert. Host is double-booked. Check-then-act over two statements is never atomic without help.

Three tools, and you should present them as **layers**, not alternatives:

**(a) Optimistic concurrency** — version column / compare-and-swap:

```sql
-- e.g. a per-host schedule version, or CAS on a slot-hold row
UPDATE host_schedule SET version = version + 1
 WHERE host_id = $1 AND version = $expected;
-- 0 rows updated → someone got there first → re-check availability, retry or 409
```

Cheap, no locks held across user think-time, great when contention is rare (a normal host gets a conflicting pair of requests almost never). Cost: retry logic in the app; livelock under real contention.

**(b) Pessimistic locking** — serialize the critical section:

```sql
BEGIN;
SELECT * FROM hosts WHERE host_id = $1 FOR UPDATE;   -- per-host mutex
-- re-check overlap inside the lock:
SELECT 1 FROM bookings
 WHERE host_id = $1 AND status IN ('hold','confirmed')
   AND time_range && tstzrange($start, $end);
-- if free: INSERT booking; COMMIT
```

(Or `pg_advisory_xact_lock(hashtext(host_id::text))` to avoid touching the host row.) Deterministic — the second transaction *waits* and then sees the first booking, no retries. Right choice for **hot hosts** (a webinar link blasted to 10k people) where optimistic would thrash. Cost: lock serializes all bookings for that host; hold transactions short.

**(c) DB constraint — the last line of defense:**

```sql
ALTER TABLE bookings ADD CONSTRAINT no_double_booking
  EXCLUDE USING gist (host_id WITH =, time_range WITH &&)
  WHERE (status IN ('hold','confirmed'));
```

Postgres's exclusion constraint: no two rows may exist where `host_id` is equal AND `time_range` overlaps (`&&`). It is checked at insert/update time inside the DB's own concurrency machinery — so a double-booking is *impossible to commit*, regardless of application bugs, forgotten locks, a new code path added by an intern, or a manual `INSERT` in a psql session. The losing transaction gets a constraint violation error; the app maps it to 409.

| Strategy | Contention fit | Failure mode | Cost | Guarantees invariant alone? |
|---|---|---|---|---|
| Optimistic (CAS + retry) | Low contention | Retry storms/livelock when hot | App retry logic | No — only if every path uses it |
| Pessimistic (FOR UPDATE / advisory) | High contention (hot hosts) | Lock waits, serialization point | Held locks, deadlock care | No — only if every path locks |
| EXCLUDE constraint | Any | 409 for the loser | GiST index maintenance (trivial here) | **Yes** |

**Why constraint + one locking strategy, not either alone:** the constraint guarantees correctness but gives poor UX under contention — losers burn a full insert attempt and get an error after the fact. The locking strategy (pick optimistic by default, switch to advisory lock for hosts flagged as hot) makes the *common* path graceful — the second requester waits or gets a clean early 409 instead of a constraint explosion. Locks are for UX and efficiency; the constraint is for the invariant. Belt and suspenders, and you can articulate which is which.

**Holds/reservations:** when an invitee picks a slot and starts typing their details, create a `status='hold'` row with `hold_expires_at = now() + 5 min`. Holds participate in the EXCLUDE constraint (see the WHERE clause), so the slot is genuinely reserved during checkout — no "sorry, taken" after filling a form. Expiry: a sweeper flips expired holds to `cancelled` (and the availability query can also treat `hold_expires_at < now()` as free, so expiry is instant-effective without waiting for the sweeper). Confirming = `UPDATE ... SET status='confirmed'` on the hold — same row, constraint already satisfied.

**Idempotency key:** client generates a UUID per booking attempt; `UNIQUE (tenant_id, idempotency_key)` means a retried POST (timeout, double-click, our gateway retry) hits the unique constraint and we return the *original* booking with 200 instead of creating a twin. Store the response payload keyed by the idempotency key if you want byte-identical replays. Same key + different request body = 409 `idempotency_conflict`.

**Interview trap:** Offering "we'll use a distributed lock in Redis" as the primary answer. Redlock-style locks have well-documented fencing problems (a paused client can wake up believing it still holds an expired lock and write anyway), and you already *have* a strongly consistent lock manager: Postgres, sitting exactly where the data is. Reaching for a second system to solve a problem the first system solves natively is a junior tell.

### Deep dive 4: Calendar sync — and exponential backoff done properly

Architecture: **webhooks primary, polling fallback, sync tokens for increments.**

- **Google:** `events.watch` creates a push channel; Google POSTs a notification (no payload — just "something changed") to our `/webhooks/google` endpoint. Channels **expire** (max ~7 days for Calendar) and must be renewed before `channel_expiry`. Notifications are **best-effort** — Google explicitly tells you not to rely on them exclusively.
- **Microsoft:** Graph change notification subscriptions — same shape, ~3-day (4230-minute) max lifetime for calendar resources, same renewal chore, same best-effort caveat.
- **Because webhooks are best-effort and channels expire, polling is not optional.** Every connection also gets a scheduled incremental poll (e.g. every 15 min) as a safety net; the webhook's job is to make the common case fast (seconds), the poll's job is to bound staleness when webhooks are lost.
- **Incremental sync:** never re-list the whole calendar. Google returns a `nextSyncToken` after a full list; subsequent calls with `syncToken=` return only changes (including deletions). Microsoft Graph: delta queries with `deltaLink`. Store the token per connection.
- **Full resync on 410 GONE:** providers invalidate sync tokens (too old, server-side compaction). A `410` means "your token is dead — do a full re-list, rebuild busy blocks, capture a fresh token." Handle it as a normal, expected event with an idempotent rebuild (upsert on `(host_id, provider, external_id)`, delete rows not seen in the full list), not an alert.

**Exponential backoff — the section that decides this interview.**

**Interview trap (the real one):** A previous candidate for this exact Heizen interview was rejected for hand-waving exponential backoff — saying, in effect, "if it fails we retry with exponential backoff" and being unable to go one level deeper. "We retry with backoff" is a password, not an understanding. You must be able to produce the formula, explain jitter and *why* it exists, name what you do and don't retry, and know when to stop. Here is the full answer.

**The base mechanism.** Retry attempt *n* waits:

```
delay = min(cap, base × 2^attempt)
```

With base = 1s and cap = 60s: **1s, 2s, 4s, 8s, 16s, 32s, 60s, 60s, ...** Exponential growth backs off aggressively so a struggling dependency gets breathing room; the cap prevents absurd waits.

**Why that alone is broken: synchronized retry storms.** Picture Google Calendar's API returning 5xx for 30 seconds. All 2,000 of our sync workers fail in the same instant. With deterministic backoff they all retry at t+1s — **simultaneously** — fail again, all retry at t+2s, again at t+4s... The retries arrive as coordinated waves that re-kill the recovering service exactly when it tries to come back (thundering herd). Deterministic exponential backoff spaces out the waves but never breaks their synchronization.

**Full jitter fixes it by decorrelating clients:**

```
sleep = random_between(0, min(cap, base × 2^attempt))
```

Each client picks a *uniformly random* delay up to the exponential ceiling. The retry wave smears into a flat, gentle trickle. The AWS Architecture Blog's classic analysis ("Exponential Backoff and Jitter," Marc Brooker) simulated exactly this and found **full jitter dramatically reduces both total work (number of calls to the contended resource) and time-to-completion** versus no-jitter and partial-jitter variants — full jitter and decorrelated jitter were the clear winners. Cite it; it's the canonical reference.

**Decorrelated jitter** (the variant from the same post): base the next delay on the *previous* delay rather than the attempt count:

```
sleep = min(cap, random_between(base, prev_sleep × 3))
```

Slightly more calls than full jitter in AWS's simulation but lower completion time; either is acceptable — the non-negotiable part is *some* jitter.

**Full-jitter pseudocode (be ready to write this):**

```python
import random, time

BASE = 1.0        # seconds
CAP  = 60.0
MAX_ATTEMPTS = 6  # retry budget — then give up and DLQ

def call_with_backoff(fn):
    for attempt in range(MAX_ATTEMPTS):
        try:
            return fn()
        except RetryableError as e:          # 429, 5xx, timeouts, connection reset
            if attempt == MAX_ATTEMPTS - 1:
                raise                        # budget exhausted → caller sends to DLQ
            ceiling = min(CAP, BASE * (2 ** attempt))
            sleep_s = random.uniform(0, ceiling)          # FULL JITTER
            if e.retry_after is not None:                 # honor Retry-After
                sleep_s = max(sleep_s, e.retry_after)
            time.sleep(sleep_s)
        # NonRetryableError (400, 401, 403, 404) propagates immediately — no retry
```

The rest of the checklist, each item one sentence you can expand on demand:

- **Retry budget, then DLQ.** Bounded attempts (5–6). After that, the sync job goes to a dead-letter queue with full context for inspection/replay — unbounded retries turn one outage into infinite queued work.
- **Only retry retryable errors.** 429, 5xx, network timeouts: yes. 400 (your request is malformed), 401/403 (your token is bad — go refresh it, retrying won't help), 404: **never** — retrying a deterministic failure is pure waste and can mask real bugs.
- **Honor `Retry-After`.** If the provider tells you when to come back (on 429/503), that overrides your schedule — it's their explicit signal, and ignoring it gets your API key throttled harder.
- **Idempotency is a prerequisite.** Retries mean the same operation may execute twice (the timeout case: the call *succeeded* but the response was lost). Every retried operation must be idempotent — upserts keyed on external event id for sync writes, idempotency keys for booking writes.
- **Circuit breaker is the complement, not the alternative.** Backoff is *per-request politeness*: this request will wait before trying again. A circuit breaker is *global*: after N consecutive failures, stop calling the dependency entirely, fail fast for a cooldown window, then probe with a half-open trial request. Backoff protects the dependency from one client's retries; the breaker protects both the dependency (no traffic at all while it recovers) and *you* (no threads/latency burned on calls that will fail). Mature clients use both: breaker gates whether a call happens; backoff schedules retries when it does.

| Concept | Scope | Question it answers |
|---|---|---|
| Exponential backoff | One request's retries | "How long until *this* request tries again?" |
| Jitter | Fleet of clients | "How do we stop everyone retrying at once?" |
| Retry budget + DLQ | One operation's lifetime | "When do we give up, and where does the work go?" |
| Retry-After | Provider signal | "When does the *server* want us back?" |
| Circuit breaker | Whole dependency | "Should we be calling this service at all right now?" |

**Outbound direction** (our booking → host's Google Calendar): booking commit writes an outbox event; a worker pushes the event to Google with the same backoff machinery; the external event id is stored on the booking for later update/cancel. If Google is down for an hour, bookings still succeed — calendar push is eventually consistent by design, and you should say that trade-off out loud.

### Deep dive 5: Notification / reminder pipeline

Requirement: send reminders at T-24h and T-1h; reschedules move them; cancellations kill them; provider outages don't drop them; nothing sends twice.

**Scheduling options, compared honestly:**

| Approach | Mechanics | Pros | Cons |
|---|---|---|---|
| DB-polling scheduler | `SELECT ... WHERE status='pending' AND due_at <= now() ORDER BY due_at LIMIT n FOR UPDATE SKIP LOCKED` every 10s | Durable, transactional with bookings, trivially inspectable, reschedule = UPDATE | Polling latency (seconds — fine for reminders); needs the `(status, due_at)` index |
| SQS delay queues | Enqueue with DelaySeconds | Managed, scales | **Max delay 15 minutes** — a 24h reminder needs a tiered scheme (park in DB until T-15m, then enqueue), so you've built the DB poller anyway |
| Redis sorted set (timer wheel) | ZADD due_ts → worker ZRANGEBYSCORE + ZREM | Low latency, simple | Redis persistence is weaker than the DB's; you now have two sources of truth about pending sends; cancellation races |
| Dedicated scheduler (Temporal timers, cloud scheduler) | Durable timers per reminder | Exactly-once-ish semantics, handles rescheduling natively | New infrastructure to run/pay for; overkill at 8 sends/sec |

**Choose the DB poller and defend it:** our reminders already live next to bookings in Postgres; a poller with `FOR UPDATE SKIP LOCKED` (so N workers can drain the due set without stepping on each other) is ~50 lines, durable, and transactionally consistent with booking state. At our scale (8/sec average, lumpy peaks in the low hundreds/sec) this is comfortably inside one Postgres. Redis sorted sets or Temporal are the right answer at 100× scale — say the threshold, not just the choice.

**Cancellation/reschedule — the tombstone pattern:** do NOT try to hunt down and delete in-flight queue entries or timers ("cancel the message I enqueued 23 hours ago" is somewhere between racy and impossible in most queues). Instead, **check state at send time**: the worker, holding a due reminder, re-reads the booking; if `status='cancelled'` or `time_range` no longer matches the reminder's expectation, mark the reminder `skipped` and send nothing. Rescheduling simply updates `due_at` on the pending reminder rows (or cancels + recreates them). The send-time check makes stale scheduling artifacts harmless — the authoritative "should this send?" decision happens at the last responsible moment.

**Idempotent sends:** dedupe key = `(booking_id, reminder_type)` — the `UNIQUE (booking_id, kind)` constraint plus a `status` transition (`pending → sending → sent`) claimed via conditional UPDATE means a crashed-and-restarted worker can't double-send; pass the same key to the email provider's idempotency/message-id field for end-to-end dedupe.

**Provider failover:** primary email provider (SES) with a secondary (SendGrid/Postmark) behind an interface; circuit breaker per provider; on primary breaker-open, route to secondary. SMS likewise (Twilio primary). Sends that fail both go back to `pending` with backoff (full jitter — same machinery as Deep Dive 4) and eventually to a DLQ + alert.

**Interview trap:** Proposing "enqueue an SQS message with a 24-hour delay" — the interviewer knows the delay cap is 15 minutes and is waiting for you to. Also: designing cancellation as "find and delete the queued message" — the tombstone/check-at-send pattern is the senior answer because it turns a distributed-deletion problem into a local read.

### Deep dive 6: Tenant isolation models

The trade-off table you must produce (interviewers ask for exactly this):

| Dimension | Shared schema + tenant_id | Schema-per-tenant | DB-per-tenant |
|---|---|---|---|
| Cost | Lowest — one DB, shared everything | Moderate — one DB, N schemas | Highest — N instances (or clusters) |
| Isolation | Weakest: one missing `WHERE tenant_id=` leaks data; noisy neighbor on shared buffers/CPU/IO | Moderate: namespace separation, still shared resources | Strongest: blast radius, perf, and data fully separated |
| Migration complexity | One migration, all tenants at once | Fan-out: 10k schemas × every DDL — hours of migration, partial-failure states | Fan-out across N databases + version skew management |
| Per-tenant backup/restore | Hard — restore one tenant means surgical row extraction from a shared backup | Possible per schema, awkward | Trivial — restore that tenant's DB |
| Connection pooling | One pool, fine | One pool, `search_path` juggling | **Pool-per-DB explosion**: 10k tenants × pool of 10 = 100k connections; needs PgBouncer per DB or serverless drivers |
| Compliance / enterprise sales | "Logical isolation" — some enterprise security reviews reject it | Sometimes acceptable | What enterprise/regulated customers actually demand ("our data on dedicated infrastructure") |
| Noisy neighbor | One tenant's bad query degrades everyone | Same (shared instance) | Contained |
| Onboard a tenant | INSERT a row | CREATE SCHEMA + run migrations | Provision a database |

**The pragmatic answer — hybrid by tier:**
- **SMB tenants: shared schema + `tenant_id`**, hardened with Postgres **Row-Level Security** so the "forgotten WHERE clause" bug class is structurally eliminated:

```sql
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings FORCE ROW LEVEL SECURITY;   -- applies even to table owner

CREATE POLICY tenant_isolation ON bookings
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

  With pooled connections (PgBouncer transaction mode), the app sets the tenant per transaction: `SET LOCAL app.tenant_id = '<uuid>'` immediately after BEGIN — `SET LOCAL` scopes it to the transaction so a recycled pooled connection can't leak the previous tenant's context. Now a query *without* a tenant filter returns nothing rather than everything. RLS is defense-in-depth, not a substitute for correct queries — the policy check costs a few percent, which we happily pay.

- **Enterprise tier: dedicated database** (same schema, own instance), unlocked as a paid tier. This is simultaneously a compliance answer, a noisy-neighbor answer, a per-tenant backup/restore answer, and a revenue answer. A tenant-routing layer (tenant_id → connection string, cached) sits in front; the application code is identical for both tiers.

- **Skip schema-per-tenant** as the default: at 10k tenants it combines the worst of both worlds — migration fan-out pain approaching DB-per-tenant, isolation guarantees closer to shared-schema. It has a niche (hundreds of tenants, moderate isolation needs) — name the niche to show you rejected it deliberately.

**Index discipline:** `tenant_id` is the first column of essentially every index (see Step 5). All access is tenant-scoped, so this gives index locality (a tenant's hot data clusters together) and makes cross-tenant scans structurally impossible for normal query shapes.

**Interview trap:** Answering "we'll use tenant_id in every table" and stopping. The follow-ups are scripted: "What stops a bug from leaking tenant A's bookings to tenant B?" (RLS + FORCE) — "What do you tell the enterprise customer whose security team requires dedicated infrastructure?" (dedicated tier + routing layer) — "How do you run a migration across your isolation model?" (shared: once; dedicated: orchestrated rollout with version-skew tolerance). Have all three loaded.

---

## Step 7: Scale & evolve

- **Reads first.** Availability computation scales horizontally (stateless service) + Redis cache + Postgres read replicas for the busy-interval reads. The write path stays on the primary — 20/sec peak needs nothing.
- **If bookings 100×:** partition `bookings` by month (already sensible for pruning), then shard by `tenant_id` if truly needed — tenant is the natural shard key because no query crosses tenants; the EXCLUDE constraint still works per shard because a host lives on exactly one shard.
- **Multi-tenant rate limiting / fairness:** token bucket **per tenant** at the gateway (Redis-backed, e.g. 100 req/s standard, negotiated for enterprise), plus a coarser per-IP bucket on unauthenticated booking pages. Why per-tenant: one tenant embedding their booking page in a viral campaign must not consume the shared API capacity of the other 19,999 — fairness is an isolation property, same family as Deep Dive 6. Also apply fairness *internally*: the sync worker pool round-robins across tenants (per-tenant queues or a fair scheduler) so one enterprise tenant's 50k-event calendar resync can't starve everyone else's webhook processing.
- **Hot-host handling:** detect hosts with high booking contention (conflict-rate metric) and switch their write path from optimistic to advisory-lock automatically.
- **Feature evolution:** round-robin/collective scheduling = N-way interval intersection on the same primitives from Deep Dive 1 (this is why clean interval algebra pays off); paid bookings = add a payment-pending state to the hold lifecycle; API/embed products = the same public endpoints with API keys and stricter rate tiers.
- **Multi-region:** keep booking writes single-region per tenant (the invariant needs single-writer semantics); serve availability reads from regional replicas. Active-active booking across regions is where you'd finally earn real distributed-systems pain — and at this scale you never need to.

---

## Common follow-up questions

**Q: Why not just materialize slots? Wouldn't reads be faster?**
A: Reads are already microseconds — the interval math on <200 intervals is trivial and cacheable. Materialization trades that non-problem for a real one: a rule edit or a single Google webhook invalidates unbounded future rows, and keeping millions of denormalized slot rows coherent with three sources of truth (rules, bookings, external calendars) is a harder system than the one we're designing. Compute-on-read, cache for 60s.

**Q: Google sends a webhook but your Sync Service is down for 10 minutes. What happens?**
A: Nothing is lost, freshness degrades. Webhooks are notifications, not data — state lives in Google, fetched via sync token. When the service recovers, the next poll (or next webhook) runs an incremental sync from the stored token and catches up on everything missed. Worst case a stale slot shows as available; the booking write then pushes to Google, gets a conflict signal or the next sync reveals the clash — and this is why some products offer "double-check calendar at booking time" as a synchronous confirmation option for high-stakes hosts: one blocking freebusy call inside the booking transaction, trading latency for freshness.

**Q: Invitee books at 09:58 for a 10:00 slot while the host's Google Calendar just got a 10:00 meeting we haven't synced. Who wins?**
A: Our booking wins locally (our DB is our truth), and the conflict surfaces on the next sync — flag it, notify the host, offer one-click reschedule to the invitee. Eliminating this window entirely requires the synchronous freebusy check above. State the window honestly; pretending sync is instantaneous is a red flag.

**Q: How does the EXCLUDE constraint behave under concurrent inserts — is it actually race-proof?**
A: Yes. Postgres checks exclusion constraints with the same mechanism as unique constraints: the second, conflicting insert blocks until the first transaction commits or aborts, then errors (or proceeds, if the first aborted). There is no window where both commit. That's precisely why it's the last line of defense — correctness is enforced inside the storage engine's concurrency control, not in application code.

**Q: Reminder worker sends the T-1h email, then crashes before marking it sent. Restart resends?**
A: Claim-before-send: worker transitions `pending → sending` via conditional UPDATE (with a claim timestamp) before calling the provider, and passes `booking_id+kind` as the provider-side idempotency key. Crash after send but before `sent`: a janitor re-queues stale `sending` rows, and the provider-side dedupe absorbs the duplicate call. True exactly-once doesn't exist across a network; at-least-once + idempotent receiver is the honest construction.

**Q: A tenant demands their data reside in the EU. Design impact?**
A: The dedicated-DB tier already gives us the mechanism: tenant-routing layer maps tenant → connection string, so an EU tenant maps to an EU-region instance. Add region to tenant provisioning, run region-local sync workers (data stays in-region), and keep global assets (tz data, templates) replicated. This is the compliance argument for the hybrid isolation model paying off.

**Q: Why Postgres over DynamoDB here?**
A: The invariant needs multi-row transactional checks and overlap exclusion; Dynamo gives conditional writes on single items, so you'd hand-roll overlap prevention with slot-item locks and transactions across item collections — rebuilding what `EXCLUDE USING gist` gives natively, with more failure modes. Dynamo's superpower (effortless horizontal scale) solves a problem we established we don't have.

---

## What gets you rejected

Concrete anti-patterns, all observed in real loops:

1. **Hand-waving exponential backoff.** The documented failure for this exact question. "We'll retry with exponential backoff" followed by silence when asked "show me." You need: the `min(cap, base×2^n)` formula, concrete delays (1-2-4-8-16), full jitter and the *thundering herd* reasoning behind it, retry budgets + DLQ, retryable-vs-not (429/5xx yes, 400/401 never), Retry-After, idempotency-because-retries-duplicate, and circuit breaker as the complement. If you can't write the ten-line jitter pseudocode on the board, you have not learned this.
2. **Materializing slots.** Immediately followed by drowning in your own invalidation design when the interviewer changes one rule.
3. **"Store everything in UTC" as a universal answer.** Correct for bookings, breaks recurring rules twice a year. Not knowing the nonexistent/ambiguous hour cases signals you've never shipped timezone code.
4. **No answer for the double-booking race** — or worse, "the availability check will catch it." Check-then-act is the race. You need a lock story *and* the DB constraint, and to know which one is UX and which one is the invariant.
5. **Redis distributed locks as the primary conflict mechanism** when Postgres — already holding the data — provides real locks and real constraints. Second-system reflex.
6. **Over-architecting 4 writes/sec** — sharded Cassandra, event sourcing, 12 microservices. Failing to say "this is a correctness problem, not a scale problem" means you didn't size the problem before solving it.
7. **Webhooks with no fallback.** Believing push notifications are reliable delivery. Channels expire, notifications drop; without polling + sync tokens + 410-triggered resync, your availability data silently rots.
8. **tenant_id column with nothing behind it.** No RLS, no answer for enterprise isolation demands, no migration story. The table in Deep Dive 6 is the expected artifact.
9. **Ignoring idempotency on the booking POST.** Every retry path you added in item 1 is a duplicate-booking generator without it.
10. **Never stating invariants or trade-offs.** Seniors say "X is the invariant, Y is eventually consistent, and here's the window and its mitigation." Describing components without naming guarantees reads as pattern-matching, not engineering.
