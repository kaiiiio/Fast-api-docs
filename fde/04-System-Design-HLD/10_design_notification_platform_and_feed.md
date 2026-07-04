# Lesson 4.10 — Design a Notification Platform & a News Feed

> Module: System Design (HLD) | Level: Senior | FDE Prep Phase 4

Two staples of the senior loop in one lesson, because they test opposite muscles. Notifications test *delivery discipline*: priority isolation, provider failover, idempotency, and not spamming humans. Feeds test *read-path architecture*: the push/pull/hybrid fan-out decision and the celebrity problem. In both, the mid-level candidate draws a queue and workers; the senior candidate explains why the OTP must never sit behind the marketing blast, and why Cristiano Ronaldo breaks fan-out-on-write.

---

## Design A: Notification Platform

### Step 1: Requirements (functional + non-functional)

Clarifying questions to ask, and why:

| Question | Why it matters |
|---|---|
| "Which channels? Push, email, SMS, in-app?" | Each channel has different providers, latency, cost, and failure semantics. SMS costs ~$0.0075+/message — cost shapes rate limiting. Assume all four. |
| "Transactional and marketing, or one class?" | This is THE question. Mixed traffic classes on one pipe means a 10M-recipient campaign delays a login OTP. It forces priority isolation into the core design. |
| "Who calls us — internal services, or also a self-serve campaign tool?" | Internal API = one trust level. Campaign tooling adds batch submission, templating UI, scheduling, audience queries. Assume internal services + a campaign service that submits batches. |
| "Delivery guarantees? Is a dropped notification acceptable?" | OTP dropped = user locked out = support ticket. Marketing dropped = nothing. So guarantees are per-class: at-least-once for transactional, best-effort for marketing. Duplicates must be rare either way (an OTP delivered twice is fine; a "payment failed" push delivered twice causes panic). |
| "Do we need read/engagement tracking?" | Delivered/opened/clicked events feed both product analytics and send-time optimization. Yes, as an async pipeline. |
| "Compliance surface — marketing SMS in the US? EU users?" | TCPA fines are per-message ($500–$1,500 each); GDPR requires consent and erasure. Opt-out enforcement is a functional requirement, not a nice-to-have. |
| "Scale? Users and peak sends?" | Sets queue and worker sizing. Assume 50M users, 100M notifications/day, campaign bursts of 10M in minutes. |

Agreed functional requirements:

1. Unified send API: callers specify template + recipient + data, not raw channel payloads.
2. Channels: mobile push (APNs, FCM), email (SES primary, SendGrid backup), SMS (Twilio primary, Vonage backup), in-app inbox.
3. Priority classes with isolation: P0 OTP/security, P1 transactional, P2 marketing/digest.
4. Template + locale rendering, user preferences, quiet hours, per-user rate caps, collapse/dedupe.
5. Delivery-status tracking (sent → delivered → opened) and provider receipt ingestion.
6. Idempotent sends; retries; DLQ with replay.

Non-functional requirements:

- **Latency SLOs per class** (the senior move — one number for "fast" is amateur):

| Class | Examples | End-to-end SLO | Loss tolerance |
|---|---|---|---|
| P0 | OTP, security alert, fraud lock | p99 < 5s | None — at-least-once, aggressive retry |
| P1 | Order shipped, payment failed, mention | p99 < 30s | None — at-least-once |
| P2 | Marketing, digests, re-engagement | Best-effort, minutes–hours OK | Droppable under pressure |

- **Isolation:** P2 volume must be provably unable to affect P0 latency (separate queues AND separate workers).
- **Throughput:** 100M/day ≈ 1.2K/s average; campaign bursts to ~50K/s enqueue. Provider ceilings dominate egress (Twilio long-code SMS is ~1 msg/s/number without a short code; SES starts at ~14/s until quota raised — you queue and smooth, you don't burst at providers).
- **Compliance:** opt-out honored within the same request path (not "eventually"); audit log of consent state at send time.

**Interview trap:** Quoting one latency SLO for the whole system. The entire design premise is that OTP and marketing are different systems sharing components. If your requirements don't split them, your architecture won't either, and the interviewer's first "what happens during a 10M-user campaign?" sinks you.

### Step 2: Estimation

- **Sends:** 100M/day ÷ 86,400 ≈ **1,160/s average**. Campaign burst: 10M submitted over 5 minutes ≈ **33K/s enqueue peak**. Egress to providers is smoothed by queues to provider-quota rates.
- **Channel mix (assume):** 60% push (60M), 25% email (25M), 5% SMS (5M), 10% in-app.
- **SMS cost reality check:** 5M/day × ~$0.0075 = **~$37K/day ≈ $13M/year**. Say this: per-user caps and channel-downgrade (push first, SMS only if unregistered) are *cost* controls, not just UX.
- **Queue sizing:** 10M-message campaign, workers drain at 20K/s aggregate → ~8 minutes of backlog. Kafka handles this trivially; the point of estimation is worker pool sizing: push worker at ~5K req/s per instance against FCM batch APIs → a handful of instances; SMS drain rate is provider-capped, so the SMS queue is *designed* to hold hours of P2 backlog.
- **Storage:** notification status row ~500 B × 100M/day = **50 GB/day** — this is the real storage problem, not the send path. Keep 30 days hot (~1.5 TB) in a wide-column store, archive to S3. Device tokens: 50M users × 2 devices × 200 B = 20 GB — fits anywhere.
- **Receipts/events:** delivered + opened ≈ 1.5 events/send = 150M events/day ≈ 1.7K/s — a small Kafka topic + stream job.

### Step 3: API design

```
POST /v1/notifications
Headers: Idempotency-Key: <uuid>        # dedupe key, required
{
  "recipient": { "user_id": "u_123" },  # platform resolves devices/email/phone
  "template": "order_shipped",
  "locale_data": { "order_id": "ord_9", "eta": "2026-07-06" },
  "priority": "P1",
  "channels": ["push", "email"],        # optional override; default from template
  "collapse_key": "order_ord_9",        # later sends with same key replace pending ones
  "ttl_seconds": 86400                  # discard if undeliverable past this
}
202 → { "notification_id": "ntf_01J...", "status": "accepted" }

POST /v1/notifications/batch            # campaign service: up to 10k recipients/call
{ "template": "summer_sale", "priority": "P2", "audience_ref": "aud_456", ... }

GET  /v1/notifications/{id}             → per-channel status timeline
PUT  /v1/users/{id}/preferences         → channel opt-in/out, quiet hours, categories
POST /internal/receipts/{provider}      → DSN/delivery callbacks (Twilio, SES, FCM)
```

Notes to say out loud:

- **202, not 200:** the API accepts and persists intent; delivery is async. The synchronous path does only: authn, validation, idempotency claim, template existence check, enqueue.
- **Callers send template + data, never rendered content.** Centralizes localization, unsubscribe-footer injection, and compliance checks; prevents 40 teams hand-rolling HTML.
- **`Idempotency-Key`:** unique constraint on `(caller, key)`, insert-first (same pattern as Lesson 4.9). A crashed order-service that retries its "order shipped" call must not text the customer twice.
- **`collapse_key`:** the API-level hook for "50 likes = 1 notification" (deep dive 3).

### Step 4: High-level architecture

```
 Internal services      Campaign service
      │  POST /notifications   │ batch
      ▼                        ▼
 ┌──────────────────────────────────┐
 │  Notification API                │  idempotency claim, validate,
 │  (stateless, k8s HPA)            │  persist intent, enqueue
 └───────────────┬──────────────────┘
                 ▼
 ┌──────────────────────────────────┐
 │ Preference & Policy Engine       │  opt-outs, quiet hours, per-user
 │ (checked at SEND time too)       │  caps, collapse, channel routing
 └───────────────┬──────────────────┘
                 ▼   Kafka topics: {channel} x {priority}
   ┌─────────────────────────────────────────────────┐
   │ push.p0  push.p1  push.p2 │ email.p0 email.p1.. │
   │ sms.p0   sms.p1   sms.p2  │ inapp.*             │
   └───┬─────────┬────────┬────┴──────┬──────────────┘
       ▼         ▼        ▼           ▼
 ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   dedicated worker pools
 │ Push    │ │ Email   │ │ SMS     │ │ In-app  │   PER priority per channel
 │ workers │ │ workers │ │ workers │ │ writers │   (P0 pool never shared)
 └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘
      │ render template + locale, final pref check, provider pick
      ▼           ▼           ▼           ▼
 ┌─────────────────────────────────────┐ ┌──────────┐
 │ Provider Adapters + Health Scorer   │ │ In-app   │
 │ APNs/FCM │ SES/SendGrid │ Twilio/   │ │ inbox DB │
 │          │              │ Vonage    │ └──────────┘
 └───────┬─────────────────────────────┘
         │ receipts / DSN / token feedback
         ▼
 ┌───────────────────┐    ┌────────────────────┐   ┌───────────┐
 │ Receipt ingester  │───▶│ Status store       │──▶│ Analytics │
 │ (webhooks from    │    │ (Cassandra/Dynamo) │   │ pipeline  │
 │  providers)       │    └────────────────────┘   └───────────┘
 └───────────────────┘         DLQ per queue + replay tool
```

Walkthrough:

- **API tier:** thin, stateless. Persists the notification intent (so a `GET` works even if Kafka hiccups) and enqueues.
- **Preference & policy engine:** the brain — opt-out, quiet hours, caps, collapse, channel selection. Runs at enqueue for cheap early drops AND again in the worker at send time (deep dive on why, below).
- **Queues:** Kafka, one topic per `(channel, priority)` pair — 12 topics, not one topic with a priority field. Kafka has no priority consumption within a topic; separate topics + separate consumer groups is the only real isolation.
- **Workers per (channel, priority):** P0 pools are dedicated and over-provisioned; P2 pools are large but throttled to provider quotas and preemptible.
- **Provider adapters + health scoring:** normalize each provider behind `send() → provider_message_id`; track success rate and latency per provider; circuit-break and fail over (deep dive 2).
- **Receipt ingester:** providers call back with delivery status (Twilio DSN, SES bounces via SNS, APNs/FCM token feedback). Updates status store; feeds token pruning.
- **Status store:** Cassandra/DynamoDB — pure key-value by `notification_id` and by `(user_id, time)`, 100M+ writes/day, TTL-based expiry. Relational buys nothing here.

**Interview trap:** One queue with a `priority` field. Kafka consumers read in log order — a priority field is decorative. RabbitMQ priority queues exist but invert under backlog and don't isolate worker capacity. Separate topics, separate worker pools: isolation you can prove in an incident review.

### Step 5: Data model

```sql
-- Postgres: config-shaped, low-write data
CREATE TABLE templates (
  id           TEXT,           -- 'order_shipped'
  version      INT,
  channel      TEXT,           -- per-channel variants
  locale       TEXT,
  subject      TEXT,
  body         TEXT,           -- handlebars/liquid
  default_priority TEXT NOT NULL,
  PRIMARY KEY (id, version, channel, locale)
);

CREATE TABLE user_preferences (
  user_id        TEXT PRIMARY KEY,
  channel_optin  JSONB NOT NULL,   -- {"push": true, "sms": false, ...}
  category_optin JSONB NOT NULL,   -- {"marketing": false, "transactional": true}
  quiet_hours    JSONB,            -- {"start":"22:00","end":"08:00","tz":"Asia/Kolkata"}
  updated_at     TIMESTAMPTZ NOT NULL
);   -- read-through cache in Redis, ~1ms lookups on the send path

CREATE TABLE device_tokens (
  user_id     TEXT NOT NULL,
  token       TEXT NOT NULL,
  platform    TEXT NOT NULL,        -- 'apns' | 'fcm'
  app_version TEXT,
  last_seen   TIMESTAMPTZ NOT NULL, -- refreshed on app open
  valid       BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (user_id, token)
);

CREATE TABLE idempotency_keys (
  caller_service TEXT NOT NULL,
  dedupe_key     TEXT NOT NULL,
  notification_id TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (caller_service, dedupe_key)   -- insert-first claim
);
```

```
-- Cassandra/DynamoDB: high-volume status + inbox
notification_status:
  PK: notification_id
  attrs: user_id, template, priority, per-channel map:
         {channel: {state: queued|sent|delivered|bounced|failed,
                    provider, provider_msg_id, ts, attempts}}
  GSI/second table: (user_id, created_at DESC)  -- "what did we send this user"
  TTL: 90 days

inapp_inbox:
  PK: user_id, SK: created_at DESC
  attrs: rendered payload, read_at
  TTL: 180 days
```

| Data | Store | Why |
|---|---|---|
| Templates, preferences, tokens | Postgres + Redis cache | Low write rate, relational queries ("all users opted into category X"), strong consistency for consent state |
| Status, receipts, inbox | Cassandra/DynamoDB | 100M+ writes/day, key-value access, natural TTL expiry, no joins needed |
| Queues | Kafka | Replayable log, consumer-group isolation per priority, handles 50K/s bursts without breaking a sweat |
| Rate-limit counters, collapse buffers | Redis | Atomic INCR + TTL; sub-ms on the hot path |

### Step 6: Deep dives

#### Deep dive 1: Priority isolation — the OTP vs the marketing blast

The canonical failure: marketing launches a 10M-recipient campaign at 6pm; login OTPs start taking 4 minutes; users can't log in; the on-call for *auth* gets paged for a *marketing* problem. Root cause is always the same: shared queue or shared workers.

The fix is isolation at **every** layer, and you should enumerate the layers:

1. **Separate topics per (channel, priority)** — a P2 backlog of 10M messages lives in `push.p2` and is invisible to `push.p0` consumers.
2. **Separate worker pools** — if the pools were shared, a drained P0 topic wouldn't help: all workers would be busy chewing P2. P0 pools are dedicated, over-provisioned (they're small — OTP volume is tiny), and never autoscaled *down* aggressively.
3. **Separate provider quota budgets** — subtle and senior: Twilio rate-limits per account/number pool. If P2 SMS saturates the Twilio quota, P0 OTPs queue *at Twilio*. Fix: reserved short code / messaging service for P0, separate from the marketing number pool; same idea for SES sending pools (dedicated IP pool for transactional email also protects sender reputation from marketing spam complaints).
4. **Load shedding order** — under systemic pressure (provider brownout, worker shortage), shed P2 first: pause its consumers, let TTLs expire the backlog. P2 messages carry `ttl_seconds`; a flash-sale promo delivered 6 hours late is worse than not delivered.

```
Priority class table (repeat it in the interview — it drives everything):
P0  OTP/security        p99 < 5s     dedicated workers, reserved provider quota
P1  transactional       p99 < 30s    dedicated workers, shared quota with headroom
P2  marketing/digest    best-effort  throttled workers, TTL-droppable, shed first
```

**Interview trap:** "We'll autoscale workers when the queue grows." Autoscaling takes minutes and shares the provider quota anyway. Isolation is structural (separate topics/pools/quotas), not reactive.

#### Deep dive 2: Provider failover and delivery receipts

Providers brown out routinely — elevated 5xx from SES, Twilio queue delays, APNs connection resets. Per channel, run primary + secondary with **health-scored routing**:

- Each adapter emits (success, latency, error-class) per attempt; a scorer keeps a rolling window (e.g., success rate over last 2 min, p95 latency).
- **Circuit breaker** per provider: closed → open when error rate > threshold (say 30% over 60s) → half-open probes with 1% of traffic → close on recovery. On open, route to secondary.
- Failover must respect **idempotency semantics per channel**: SMS/push have no cross-provider dedupe, so only failover *unsent* messages — a timeout from Twilio is ambiguous (may deliver later). Policy: timeouts → wait for DSN up to a channel-specific window (SMS: 30–60s) before re-sending anywhere; hard errors → immediate failover. Duplicate-OTP risk is acceptable; duplicate "your account is locked" is not — the retry policy is per-template-class.
- **Receipts close the loop:** `sent` (provider accepted) is not `delivered`. Twilio posts DSN callbacks; SES publishes bounces/complaints via SNS; APNs/FCM return invalid-token feedback synchronously and via feedback channels. The receipt ingester updates the status store and drives two feedback loops:
  1. **Token lifecycle:** APNs `410 Unregistered` / FCM `UNREGISTERED` → mark token invalid immediately and prune. Keep sending to dead tokens and FCM/APNs will throttle your whole app. Also prune on `last_seen > 90 days`.
  2. **Suppression lists:** email hard bounces and spam complaints → suppress the address globally. Sending post-complaint destroys IP/domain reputation, which silently degrades delivery for ALL your email. Sender reputation is a shared resource across the company — a strong senior line.

| Failure | Detection | Action |
|---|---|---|
| Provider 5xx spike | Error-rate window | Circuit open → secondary provider |
| Provider timeout | Latency + no DSN | Hold, wait for DSN window, then re-send (channel-dependent) |
| Invalid device token | APNs/FCM feedback | Prune token, try user's other devices |
| Email hard bounce | SES SNS notification | Global suppression list |
| Message expired undelivered | TTL check in worker | Drop (P2) or escalate channel (P0: push failed → SMS) |

#### Deep dive 3: Rate limiting, collapse, and preference enforcement

**Per-user caps** protect users from you: max N notifications/day per user (e.g., 10), per-channel caps (SMS: 2/day non-OTP — also a cost control at $13M/year run-rate), per-category caps (marketing: 1/day). Implementation: Redis counters `rate:{user}:{channel}:{day}` with atomic `INCR` + TTL, checked in the worker. Exceeded → drop P2, downgrade P1 to in-app inbox (still visible, not pushed). P0 bypasses caps entirely — never rate-limit an OTP.

**Quiet hours:** user-local window (store tz per user). P2 in quiet hours → *schedule* for the window end (delay queue / scheduled-delivery table), don't drop. P0 ignores quiet hours.

**Collapse — 50 likes = 1 notification.** Every send carries an optional `collapse_key` (e.g., `likes:{post_id}:{owner}`). Worker-side algorithm:

```
on send(msg) with collapse_key K:
  count = INCR collapse:{K}          # Redis
  if count == 1:
      EXPIRE collapse:{K} 120s       # debounce window
      schedule deliver(K) at now + 120s
  else:
      pass                           # absorbed into the pending window
on deliver(K):
  n = GETDEL collapse:{K}
  render "Ana and {n-1} others liked your post"; send once
```

First event opens a debounce window; subsequent events within it are absorbed; one aggregated message goes out. Mobile push adds a second layer for free: APNs `apns-collapse-id` / FCM `collapse_key` makes a new push *replace* the previous one in the device tray — use both.

**Preference check at send time, not (only) enqueue time.** A campaign enqueues 10M messages at 18:00; the queue backs up; a user unsubscribes at 18:05; their message sends at 18:20. If consent was evaluated at enqueue, you just violated their opt-out — under TCPA (marketing SMS without consent: $500–$1,500 statutory damages *per message*, and class actions are routine) that's not a UX bug, it's a legal event. GDPR similarly: consent withdrawal must be effective, not "effective once the queue drains." So the worker re-checks preferences/suppression **immediately before the provider call**. The enqueue-time check remains as a cheap early filter — it's an optimization, never the enforcement point.

**Interview trap:** Checking preferences only at enqueue time. Interviewers set this trap with "user unsubscribes while a campaign is queued — what happens?" If your answer requires scanning the queue to remove messages, you've designed it wrong: enforcement belongs at the last responsible moment, in the worker.

**Interview trap:** Forgetting idempotent sends. The order service times out calling you and retries; without an insert-first dedupe claim on `(caller, dedupe_key)`, the customer gets two "payment failed" pushes and calls support. Same pattern as payment idempotency — say so, it shows you see the pattern, not just the instance.

### Step 7: Scale & evolve

- **10x (1B/day):** Kafka partitions scale linearly; the real ceilings are provider quotas (negotiate dedicated throughput, add providers per region) and the status store (already horizontally scalable; consider dropping per-P2-message status granularity to sampled).
- **Send-time optimization:** ML picks per-user delivery hour for P2 → the delay-queue infrastructure from quiet hours generalizes into a scheduler service.
- **Regionalization:** SMS routes via in-country providers (deliverability + cost — international SMS can be 10x); data-residency pins user preference data per region.
- **Self-serve platform:** template authoring UI with versioning + staged rollout of template changes (a bad template is an incident: broken deep links to 10M users), per-team quotas so one internal caller can't exhaust P1 capacity.
- **Digest engine:** P2 evolution — instead of N marketing messages, accumulate into a daily digest per user; batch renders replace per-message renders.

---

## Design B: News Feed

### Step 1: Requirements (functional + non-functional)

Clarifying questions to ask, and why:

| Question | Why it matters |
|---|---|
| "Follow-graph feed (Twitter/Instagram) or friend-graph (Facebook)?" | Follow graphs are asymmetric and produce celebrities with 100M followers — the defining hot-spot problem. Assume follow graph. |
| "Chronological or ranked feed?" | Ranked adds an ML scoring layer and breaks naive cursor pagination. Assume ranked with recency as a strong feature; design so chrono is the degraded mode. |
| "What's the follower distribution?" | The power law IS the design: median user ~200 followers, celebrities 10M+. This single fact forces the hybrid fan-out. Ask it explicitly — it signals you know where the bodies are buried. |
| "New-post visibility latency target?" | Sets fan-out SLO. "Followers see my post within ~5–10s" is the industry norm; nobody needs 100ms. |
| "Read/write ratio and scale?" | Feeds are read-dominated ~100:1. Assume 200M DAU, 100M posts/day, each user opens feed ~10x/day. |
| "Media in scope?" | Blob storage + CDN is its own lesson; scope to "media served via CDN URLs, feed handles IDs and metadata." Interviewers accept this scoping if you say it. |

Agreed functional requirements:

1. Post creation (text + media refs), follow/unfollow.
2. Home feed: ranked posts from followees, infinite scroll with pagination.
3. New posts visible to followers within ~10s.
4. Block/mute and unfollow reflected in the feed (promptly, not necessarily instantly).

Non-functional:

- **Read latency:** feed open p99 < 200ms server-side (it's the app's front door).
- **Availability over consistency:** a slightly stale feed is invisible to users; an error page is not. Eventual consistency everywhere except the user's *own* posts (read-your-writes: users must see their own post immediately or they'll repost).
- **Scale:** 2B feed reads/day (~23K/s avg, ~70K/s peak); 100M posts/day (~1.2K/s avg, ~5K/s peak burst events).

### Step 2: Estimation

- **Reads:** 200M DAU × 10 opens = 2B/day ≈ **23K/s average, ~70K/s peak**. This is why the read path must be a cache lookup, not a query.
- **Writes:** 100M posts/day ≈ 1.2K/s. Average 200 followers → naive full fan-out = 1.2K × 200 = **240K feed-cache writes/s average** — write amplification of 200x, and that's *before* celebrities.
- **The celebrity kill shot (do this math out loud):** one user with 100M followers posts once → 100M cache writes. At 1M writes/s that's **100 seconds of cluster-wide work for one tweet**, and a burst of celebrity posts during a live event stacks these. This number is the entire justification for the hybrid design.
- **Feed cache sizing:** store post **IDs, not bodies**: ~800 entries/user × (8 B id + 8 B score) ≈ 13 KB, call it **~20 KB with Redis overhead** per user. Cache the ~most-recently-active 150M users: 150M × 20 KB = **~3 TB** → ~40–50 Redis nodes with replicas. Storing rendered post bodies instead would be 50–100x that — say why IDs win: one post liked 1M times is stored once, hydrated on read, and edits/deletes don't require touching a million feed copies.
- **Post storage:** ~1 KB metadata × 100M/day = 100 GB/day ≈ 36 TB/year — Cassandra-class, partitioned by author.

### Step 3: API design

```
POST /v1/posts
{ "text": "...", "media_ids": ["m_1"], "reply_to": null }
201 → { "post_id": "p_01J8...", "created_at": "..." }        # ULID: time-ordered

GET /v1/feed?cursor=<opaque>&limit=20
200 → {
  "items": [ { "post_id": "p_...", "author": {...}, "text": "...",
               "media": [...], "stats": {"likes": 132, ...},
               "reason": "followed_author" } ],
  "next_cursor": "eyJzZXNzaW9uIjoiZjkx..."    # opaque, encodes ranking snapshot + position
}

POST   /v1/users/{id}/follow      DELETE /v1/users/{id}/follow
POST   /v1/users/{id}/block
GET    /v1/users/{id}/posts?cursor=...        # profile timeline (NOT the home feed path)
```

- **Cursor is opaque and server-defined** — encodes the ranking session id + position, not a page number. Offset pagination breaks the moment a new post shifts everything down (deep dive 3).
- **Feed returns hydrated items** but the *internal* pipeline passes IDs until the final hydration step.
- `reason` field future-proofs for injected content (ads, suggested posts) and is what real feeds ship.

### Step 4: High-level architecture

```
                        WRITE PATH
 ┌────────┐  POST /posts   ┌───────────┐    ┌────────────────┐
 │ Client │───────────────▶│ Post svc  │───▶│ Posts store    │
 └────────┘                │           │    │ (Cassandra)    │
                           └─────┬─────┘    └────────────────┘
                                 │ post.created ▼ (also: celeb-post cache
                                 ▼               update if author is celeb)
                           ┌───────────┐
                           │  Kafka    │
                           └─────┬─────┘
                                 ▼
                     ┌──────────────────────┐   follower pages   ┌──────────────┐
                     │  Fan-out workers     │◀──────────────────│ Social graph │
                     │  IF followers < 10k: │                    │ svc (follows,│
                     │   push post_id into  │                    │ blocks)      │
                     │   each follower's    │                    └──────────────┘
                     │   feed cache         │
                     │  ELSE: skip (pull)   │
                     └──────────┬───────────┘
                                ▼
                      ┌──────────────────┐
                      │ Feed cache       │  Redis: ZSET per user
                      │ user → [post_ids]│  ~800 ids, TTL for inactive
                      └──────────────────┘
                        READ PATH
 ┌────────┐ GET /feed ┌──────────┐  ids   ┌─────────────────────────────┐
 │ Client │──────────▶│ Feed svc │───────▶│ merge: feed cache ZSET      │
 └────────┘           │          │        │  + celebrity posts (pull    │
                      └────┬─────┘        │    from celeb-post cache    │
                           │              │    for followed celebs)     │
                           │              └──────────────┬──────────────┘
                           │                             ▼
                           │              ┌─────────────────────────────┐
                           │              │ Ranking svc: candidates →   │
                           │              │ feature store → score →     │
                           │              │ re-rank (diversity rules)   │
                           │              └──────────────┬──────────────┘
                           │                             ▼
                           │              ┌─────────────────────────────┐
                           └─────────────▶│ Hydration: posts store +    │
                                          │ user svc + counters cache   │──▶ response
                                          └─────────────────────────────┘
```

- **Post service:** durable write to Cassandra first, then emit `post.created` to Kafka. If the author is a celebrity, also refresh the **celebrity-post cache** (per-celeb recent post list in Redis — tiny: ~20K celebs × 100 posts).
- **Social graph service:** follows/blocks in a graph-friendly store; serves paginated follower lists to fan-out workers and the (small) followed-celebrities list to the read path.
- **Fan-out workers:** consume `post.created`, apply the hybrid decision, batch-write IDs into follower ZSETs (deep dive 1/2).
- **Feed service (read path):** ZSET fetch + celebrity merge → ranking → hydration. Every step is cache-first.
- **Ranking service:** separate service, reads a feature store (deep dive on why it's separate).

### Step 5: Data model

```
-- Cassandra: posts (source of truth)
CREATE TABLE posts (
  author_id  TEXT,
  post_id    TIMEUUID,          -- time-ordered; doubles as created_at
  text       TEXT,
  media_ids  LIST<TEXT>,
  PRIMARY KEY ((author_id), post_id)
) WITH CLUSTERING ORDER BY (post_id DESC);
-- partition by author → "recent posts by X" is one-partition read (pull path + profiles)

CREATE TABLE follows (
  follower_id TEXT, followee_id TEXT, since TIMESTAMP,
  PRIMARY KEY ((follower_id), followee_id));
CREATE TABLE followers (               -- reverse index, maintained together
  followee_id TEXT, follower_id TEXT,
  PRIMARY KEY ((followee_id), follower_id));  -- fan-out reads pages of this
```

```
Redis:
  feed:{user_id}         ZSET  member=post_id, score=created_ts   (cap ~800, TTL 14d idle)
  celebposts:{celeb_id}  LIST/ZSET of recent post_ids             (last ~100)
  counters:{post_id}     HASH  likes, reposts, replies            (write-behind to store)
  following_celebs:{uid} SET   cached subset of follows where followee is celeb
```

| Choice | Why |
|---|---|
| Cassandra for posts/graph | Write-heavy, partition-key access patterns, linear scale to 36 TB/yr; no cross-entity transactions needed |
| Redis ZSET for feeds | O(log n) insert, O(limit) range read by score, atomic ZADD+ZREMRANGEBYRANK trim; the score field later carries ranking scores |
| IDs in feed cache, bodies hydrated | Dedup across millions of feeds; deletes/edits don't touch feeds; 20 KB vs 1–2 MB per user |
| TIMEUUID/ULID post ids | Sort order for free; no coordination; cursor math is trivial |
| Both `follows` and `followers` tables | Cassandra can't index both directions on one table efficiently; fan-out needs followers-of-X, read path needs followees-of-X. Dual-write, repair job for drift |

### Step 6: Deep dives

#### Deep dive 1: Push vs pull vs hybrid — the celebrity problem

**Push (fan-out-on-write):** when a user posts, write the post ID into every follower's feed cache. Read = one ZSET range read: fast, cheap, O(1) partitions touched. Cost: **write amplification = follower count**, storage for every user's precomputed feed, and wasted work for the 60%+ of users who won't open the app before those entries scroll off.

**Pull (fan-out-on-read):** store nothing per-follower; at read time fetch each followee's recent posts and merge. Zero write amplification. Cost: a user following 1,000 accounts triggers up to 1,000 partition reads *per feed open*, k-way merged, at 70K reads/s peak. Latency and load explode with followee count; caching helps but the tail (users following thousands) stays ugly.

| | Push | Pull | Hybrid |
|---|---|---|---|
| Write amplification | Followers× (celeb: 100M writes/post) | None | Bounded at threshold (≤10K) |
| Read latency | ~5ms (one ZSET read) | 50–500ms (N partitions + merge) | ~10–30ms (ZSET + small celeb merge) |
| Storage | Feed copy per user (~3 TB IDs) | None extra | ~3 TB + tiny celeb cache |
| Staleness | Seconds (fan-out lag) | None | Seconds for normals, none for celeb posts |
| Wasted work | High (inactive users) | None | Mitigated: skip fan-out to long-inactive users |
| Breaks when | Celebrity posts | Users follow thousands | — (that's the point) |

**The hybrid (what Twitter/Instagram actually converged on):**

- Authors **below a follower threshold (~10K; tune between 10K and 1M by measured cost)** → normal push fan-out.
- Authors **above it are excluded from fan-out entirely.** Their posts go only to the posts store + a per-celebrity recent-posts cache.
- **At read time, merge:** take the user's precomputed feed ZSET, plus a pull of recent posts from each *followed celebrity's* cache, and do a sorted merge before ranking:

```
read_feed(user):
  base   = ZREVRANGEBYSCORE feed:{user} +inf -inf LIMIT 0 200     # push part
  celebs = SMEMBERS following_celebs:{user}                        # typically 5-50
  extra  = [ celebposts:{c} since last_cursor_ts  for c in celebs ]# pull part
  candidates = sorted_merge_by_time(base, extra)                   # k-way, k small
  return rank(candidates)[:20]
```

The merge is cheap because the pull side is bounded: users follow few celebrities (dozens, not thousands), and each celeb list is a single hot Redis key — replicate those keys across replicas since they're read at enormous rates (hot-key mitigation: client-side cache with 1–2s TTL is fine, celeb posts tolerate a second of staleness).

Second hybrid refinement worth naming: **skip push for dormant followers** (no app open in 30 days). On their return, rebuild the feed via pull once, then resume push. This kills most of the wasted-write problem.

**Interview trap:** Picking pure push or pure pull and defending it to the death. The follower distribution is power-law; any single strategy is wrong at one end. The senior answer is threshold-based hybrid, with the threshold as a measured cost dial, plus the read-time merge sketched concretely — not just the phrase "we'd use a hybrid."

**Interview trap:** Fanning out rendered post content instead of IDs. Now an edit or delete must chase down 100K feed copies, and your cache is 50x the size. IDs in the cache, hydrate on read, always.

#### Deep dive 2: Fan-out worker mechanics

The fan-out tier is a write amplifier — treat it like one:

- **Kafka `post.created`, partitioned by author_id** — preserves per-author ordering (a user's two posts fan out in order) while parallelizing across authors.
- **Follower list pagination:** never load 10K followers into memory as one list; page through the `followers` partition in chunks of ~1,000, each chunk becoming a fan-out sub-task. This bounds worker memory and makes retries fine-grained: a crash re-processes one chunk, not one celebrity.
- **Batched Redis writes:** pipeline ZADDs grouped by Redis shard (cluster slot) — 1,000 followers → a handful of pipelined round trips, not 1,000. Follow each ZADD with `ZREMRANGEBYRANK feed:{u} 0 -801` to cap at ~800 entries.
- **Idempotent by construction:** ZADD of the same `(post_id, score)` is a no-op, so at-least-once Kafka delivery is safe — say this; it's the reason ZSETs beat lists here.
- **Backpressure and priority:** during a viral event, fan-out lag grows. That's fine — the SLO is ~10s, not instant, and lag is a first-class dashboard metric. If it grows unboundedly, shed dormant-user fan-outs first.
- **New-post latency budget:** post write 10ms → Kafka 100ms → worker pickup + graph read + 10 pipelined chunks ~2–5s for a 10K-follower author. Within the 10s SLO with room; celebrities bypass this entirely (their "latency" is one cache write).

#### Deep dive 3: Ranking pipeline and pagination

**Why ranking is a separate service.** Feed assembly is I/O-bound cache plumbing; ranking is CPU/model-bound inference with its own scaling curve, deploy cadence (models ship weekly, plumbing doesn't), and experiment surface (A/B by ranking-service version). Coupling them means every model deploy risks the serving path. The ranking service reads precomputed features from a **feature store** (user affinities, author engagement rates, post velocity — computed by offline/streaming jobs) so scoring is a lookup + forward pass, never an online aggregation.

**The four stages (name them — it's the industry-standard shape):**

1. **Candidate generation:** the merged ~200–500 post IDs from feed cache + celebrity pull (plus, later, out-of-network candidates from a retrieval model).
2. **Feature hydration:** batch-fetch features for (user, author, post) triples from the feature store (Redis/Feast-style), ~1 network round trip.
3. **Scoring:** ML model predicts engagement probability — a two-tower model (user tower × post tower dot product) is the standard retrieval/ranking mention; one sentence is enough in an HLD round. **Always name the heuristic fallback:** `score = w1·recency_decay + w2·author_affinity + w3·log(engagement)` — it's the degraded mode when the model service is down and the honest v1 before you have training data.
4. **Re-ranking / diversity rules:** business logic the model can't learn reliably — no 3 consecutive posts from one author, demote seen posts, inject follows-recommendations, enforce content policy demotions.

Budget: ~50ms of the 200ms read SLO for stages 2–4; timeout → fall back to heuristic order. Ranking must never take the feed down.

**Pagination — cursor-based, with the ranked-feed wrinkle.** Offset pagination (`?page=3`) breaks twice: new posts shift offsets (duplicates/skips between pages), and ranked order isn't stable across requests (page 2 re-ranked differently overlaps page 1). Chronological feeds fix it with a cursor = last item's `(created_at, post_id)`. Ranked feeds need more: **snapshot the ranking session** — on first page, rank a window of ~200 candidates, stash the ordered ID list server-side (Redis, TTL ~10 min), and the cursor is `(session_id, position)`. Subsequent pages slice the frozen list: stable order, no duplicates. New posts don't appear mid-session — correct behavior, surfaced as the "new posts" pill that starts a fresh session on tap.

**Interview trap:** Proposing `LIMIT 20 OFFSET 40` on a feed. It's wrong on shifting data, and it's a table scan smell. Cursors are table stakes; knowing *why ranked feeds need a session snapshot* is the senior differentiator.

#### Deep dive 4: Unfollow, block, and delete — lazy beats eager

When A unfollows B, B's posts sit in A's precomputed feed cache. Eager cleanup — scan A's ZSET, remove B's post IDs — means a synchronous cache surgery on every unfollow, and blocks require it in *both* directions; at millions of unfollows/day it's constant expensive churn for entries that would scroll off in a day anyway.

**Lazy filtering wins:** at read time, after fetching candidates, drop posts whose author is in the user's unfollowed-since-fanout/blocked set (a small Redis set per user; blocks also enforced at hydration as defense in depth). Post *deletes* work the same way: the ID stays in feeds, hydration finds no post, item is silently dropped — over-fetch candidates (200 for a page of 20) so filtering never leaves a short page. Run an async janitor for the block case if product requires hard purging, but the *read-time filter is the correctness mechanism*; the janitor is hygiene.

This is a general senior principle worth stating: **when invalidation is expensive and reads already flow through one choke point, filter at read time instead of chasing state through caches.**

### Step 7: Scale & evolve

- **Read growth:** feed cache is the pressure point — Redis Cluster scales horizontally; add replicas for hot celebrity keys; regional read replicas of feed caches for geo-latency (feeds tolerate seconds of cross-region lag).
- **Viral events (10x post bursts):** fan-out lag absorbs the spike by design; dashboards on consumer lag; shed dormant fan-outs; celebrity path is unaffected (no fan-out).
- **Out-of-network content:** candidate generation grows a retrieval stage (ANN search over post embeddings — two-tower again) feeding the same ranking pipeline; the architecture doesn't change, the candidate mix does. This is the Instagram-Explore/TikTok-ification path.
- **Real-time signals:** stream engagement events (Kafka → Flink) into the feature store so "post velocity" features are minutes-fresh; ranking quality improves with zero serving-path changes — the payoff of the separate ranking service + feature store.
- **Cost lever:** fan-out only to users active in the last N days (N tunable), rebuild-on-return for the rest — trades a slow first paint for a large write/storage cut.

---

## Common follow-up questions

**Q: (Notifications) A user gets the same push twice. Enumerate the causes.**
A: In order of likelihood: (1) caller retried without a dedupe key, or our idempotency claim is check-then-insert (race); (2) worker crashed after the provider call but before committing status — provider send is the side effect, so redelivery from Kafka re-sent it; mitigate with a per-notification send-claim (insert-first) checked before the provider call, accepting a small window (send succeeded, claim-commit failed) that we bias toward "risk duplicate" for P0 and "risk drop" for P2; (3) provider-level retry after our timeout — their DSN dedupe window is the guard. Duplicates can be made rare, not impossible — saying "exactly-once delivery to a phone" doesn't exist is part of the answer.

**Q: (Notifications) Kafka is down. What does the user experience?**
A: API keeps accepting: intent is persisted to the DB first, enqueue is best-effort with an outbox-style sweeper that replays unenqueued intents when Kafka recovers. P0 additionally gets a synchronous direct-send fallback path (API → provider adapter inline) because a 5s OTP SLO can't wait for broker recovery. P1/P2 just arrive late.

**Q: (Feed) Why not fan out on write for everyone and eat the cost — storage is cheap?**
A: It's not storage, it's write *throughput* and tail behavior: one 100M-follower post = 100M cache writes; a burst of celebrity posts during a World Cup final stacks into minutes of cluster-wide fan-out backlog that delays everyone's posts. The hybrid removes the unbounded term: fan-out work is capped at threshold × posts, celebrities cost O(1) writes and O(followed-celebs) reads.

**Q: (Feed) How does a user see their own post instantly if fan-out takes seconds?**
A: Read-your-writes is handled client- and edge-side, not by racing fan-out: the client optimistically prepends the post; server-side, the feed service always merges the user's own most-recent posts (one partition read from `posts` by author) into their feed. Their followers' 5–10s lag is invisible to them.

**Q: (Both) These systems share a shape — where?**
A: Both are write-amplifying fan-out systems fed by Kafka with per-class isolation, both cache IDs/intents and hydrate late, both enforce policy at the last responsible moment (preference check at send time; block filter at read time), and both rely on idempotent, insert-first claims to make at-least-once infrastructure safe. Recognizing the shared shape — at-least-once transport + idempotent effects + late policy enforcement — is the transferable design, and interviewers reward candidates who say it.

**Q: (Feed) Where does consistency actually matter here?**
A: Almost nowhere strongly — feeds are eventually consistent by design. The exceptions: read-your-own-writes (handled above), block enforcement (defense in depth at read + hydration — showing a blocked user's content is a trust-and-safety incident, not a staleness quirk), and the follows/followers dual-write (repair job reconciles drift). Everything else trades consistency for availability deliberately, and you should say the trade is deliberate.

**Q: (Notifications) How would you test that priority isolation actually works?**
A: Load-test it as a standing chaos exercise: inject a synthetic 10M-message P2 campaign in staging (and periodically in prod at reduced scale), assert P0 p99 stays < 5s via synthetic OTP canaries sent continuously. Isolation that isn't continuously verified regresses the first time someone "temporarily" shares a worker pool.

## What gets you rejected

- **(Notifications) One queue, one worker pool, a `priority` field.** The OTP-behind-marketing-blast failure is the question being asked, even when it isn't asked out loud.
- **(Notifications) Preference/opt-out checked only at enqueue.** The queued-campaign-unsubscribe probe exposes it, and the TCPA/GDPR angle makes it worse than a bug.
- **(Notifications) No provider failover or treating `sent` as `delivered`.** Receipts, suppression lists, and token pruning are what separate a notification *platform* from a `sendEmail()` wrapper.
- **(Notifications) Ignoring cost.** 5M SMS/day is ~$13M/year; caps and channel downgrade are financial controls. Never mentioning money on an SMS design reads junior.
- **(Feed) Pure push or pure pull with no celebrity discussion.** The power-law follower distribution is the crux; missing it misses the question.
- **(Feed) Rendered post bodies in every follower's cache.** Storage blows up 50x and deletes become a distributed chase.
- **(Feed) `OFFSET` pagination, or hand-waving "the ML ranks it"** with no candidate/feature/score/re-rank structure and no heuristic fallback.
- **(Feed) Eager cache surgery on unfollow/block** as the primary mechanism — synchronous fan-in on the write path for data that a read-time filter handles in microseconds.
- **(Both) No idempotency story on an at-least-once pipeline.** Kafka redelivers; if your workers aren't idempotent, duplicates aren't an edge case, they're a schedule.
- **(Both) Estimating nothing.** Both designs pivot on two numbers — provider quota vs burst rate, and follower count × post rate. Skip the arithmetic and every subsequent choice is unjustified.
