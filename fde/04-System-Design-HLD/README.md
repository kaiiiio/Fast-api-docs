# Module 4 — System Design (HLD)

> Module: System Design (HLD) | Level: Senior | FDE Prep Phase 4

High-level design for senior/staff and Forward Deployed Engineer interviews. FDE loops differ from generic HLD rounds in one crucial way: the interviewer picks **one** component and drills until you run out of depth. Files 01–02 build the vocabulary and the interview operating system; files 03–10 are full mock-interview walkthroughs (requirements → estimation → API → architecture → data model → deep dives → scale) for the eight most-asked design problems.

## Files

| # | File | What it covers |
|---|------|----------------|
| 01 | [01_hld_building_blocks.md](01_hld_building_blocks.md) | The Lego bricks: L4/L7 load balancing, API gateway vs reverse proxy vs BFF, CDN push/pull and invalidation, caching patterns + stampede protection (locks, XFetch, request coalescing), queues vs streams (SQS/RabbitMQ vs Kafka), service discovery, autoscaling policies, rate limiting placement. Q&A format. |
| 02 | [02_estimation_and_interview_framework.md](02_estimation_and_interview_framework.md) | Latency numbers table (2025-era), QPS-per-box rules of thumb, storage math shortcuts, the 45-minute HLD framework minute by minute, how FDE interviews push depth on ONE component and how to handle it, requirement-elicitation dialogue. Q&A format. |
| 03 | [03_design_url_shortener.md](03_design_url_shortener.md) | The classic warm-up, played at senior level: base62 vs KGS vs hash-and-truncate, 301 vs 302 and why it decides your analytics, hot-code caching, async click pipeline. |
| 04 | [04_design_whatsapp_chat.md](04_design_whatsapp_chat.md) | Chat at scale: WebSocket connection gateways and the connection registry, group fan-out, per-conversation ordering, sent/delivered/read receipts, offline sync, presence, Signal-protocol E2E encryption overview. |
| 05 | [05_design_calendly_multitenant.md](05_design_calendly_multitenant.md) | **The exact Heizen HLD question.** Multi-tenant scheduling: availability rules engine, timezone/DST hell, double-booking prevention (optimistic vs pessimistic locking vs Postgres exclusion constraints), calendar sync via webhooks + polling, exponential backoff with jitter explained properly, reminder pipeline, tenant isolation trade-off table. |
| 06 | [06_design_netflix_youtube.md](06_design_netflix_youtube.md) | Video platform: resumable uploads, transcoding as a DAG of segment×rendition jobs, HLS/DASH adaptive bitrate, Open Connect-style CDN strategy, view counting via stream aggregation. |
| 07 | [07_design_uber.md](07_design_uber.md) | Ride hailing: geohash vs S2 vs H3 geo-indexing, 200k+ location writes/s ingestion (and why they never hit a durable DB), matching with driver locks, trip state machine, surge pricing via stream windows. |
| 08 | [08_design_google_drive.md](08_design_google_drive.md) | File sync: fixed vs content-defined chunking, cross-user dedup risks, metadata/blob split, cursor-based sync protocol, conflicted copies vs merging, chunk garbage collection. |
| 09 | [09_design_payment_system.md](09_design_payment_system.md) | Payments: idempotency keys done right (the #1 topic), immutable double-entry ledger, saga vs 2PC, reconciliation as the safety net, webhooks in and out, PCI scope minimization via tokenization. |
| 10 | [10_design_notification_platform_and_feed.md](10_design_notification_platform_and_feed.md) | Two designs: multi-channel notification platform (priority queues, per-user rate limits, provider failover) and news feed (push/pull/hybrid fan-out, the celebrity problem, ranking pipeline). |

## Study order

1. **01 → 02 first.** Building blocks and estimation are the vocabulary every walkthrough assumes. Don't attempt a mock design without the latency table and the 45-minute framework internalized.
2. **03 (URL shortener)** — easiest full walkthrough; use it to practice the 7-step structure until it's muscle memory.
3. **05 (Calendly)** — the highest-priority file for the Heizen loop. Do this before the others; repeat it until you can whiteboard the booking-conflict section and explain full-jitter exponential backoff without notes.
4. **09 (Payments)** — second-highest signal for FDE roles; idempotency and reconciliation questions appear inside *other* designs too.
5. **04, 07, 10** — the fan-out/real-time cluster (chat, Uber, notifications/feed). They share patterns: connection management, per-entity ordering, write amplification.
6. **06, 08** — the media/storage cluster (video, Drive). They share patterns: blob/metadata split, pipelines as DAGs, CDN.

## How to practice

- For each design file: read Step 1 only, close the file, and run Steps 2–6 yourself on paper with a 45-minute timer. Then compare against the file — especially the **Deep dives** and **What gets you rejected** sections.
- Every `**Interview trap:**` callout is a question an interviewer has actually used to separate mid-level from senior. Collect them into flashcards.
- In FDE rounds, expect the interviewer to grab ONE deep-dive section and push past the file's content. The file gets you to the door; the mechanism-level understanding gets you through it.
