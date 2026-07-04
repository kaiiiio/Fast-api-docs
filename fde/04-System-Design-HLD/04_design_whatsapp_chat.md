# Lesson 4.4 — Design WhatsApp (Chat System)

> Module: System Design (HLD) | Level: Senior | FDE Prep Phase 4

Chat is the canonical *stateful* system design question. The URL shortener tested whether you can resist complexity; WhatsApp tests whether you can handle it: millions of persistent connections, ordering without global clocks, delivery guarantees over flaky mobile networks, and fan-out that can melt a datacenter. Senior candidates are separated from mid-level ones on three battlegrounds — connection management, message flow/ordering, and offline delivery — and this lesson drills all three to the depth interviewers actually push.

---

## Step 1: Requirements (functional + non-functional)

### Clarifying questions to ask the interviewer

1. **"1:1 only, or group chat too? What's the max group size?"**
   Why: group fan-out is the single biggest architectural fork. A 2-person conversation and a 100k-member channel (Telegram/Slack) are different systems. WhatsApp caps groups (256 → 1024 over the years) *precisely* to keep fan-out-on-write viable — knowing that cap is a design input, not trivia.
2. **"Is message history stored server-side forever (Slack model) or only until delivered (WhatsApp model)?"**
   Why: this flips the storage system from "transient queue" to "permanent searchable archive" — different datastore, different cost model, and it interacts with E2E encryption (you can't full-text-search ciphertext).
3. **"Multi-device? Can a user be online on phone + laptop simultaneously?"**
   Why: multi-device multiplies delivery state (per-device queues, per-device E2E sessions) and complicates read receipts. WhatsApp shipped true multi-device only in 2021 because it's genuinely hard.
4. **"Is end-to-end encryption required, or transport encryption enough?"**
   Why: E2E constrains the entire feature set — no server-side search, no server-side spam ML on content, media handling changes. It should be stated up front, not bolted on.
5. **"What delivery guarantees and indicators? Sent/delivered/read ticks?"**
   Why: receipts define an ack protocol and a per-message state machine that the client and server must both implement; "best effort" vs "guaranteed at-least-once" changes the offline-queue design.
6. **"Presence and typing indicators in scope?"**
   Why: presence is deceptively expensive — it's a fan-out problem bigger than messaging itself if done naively. Scoping it explicitly shows you know where the hidden cost is.
7. **"Scale? DAU, messages/day, connection concurrency?"**
   Why: connection count drives the gateway fleet size; messages/day drives storage. Assume WhatsApp-like: 2B users, ~1B DAU, ~100B messages/day.

### Agreed functional requirements

- 1:1 chat and group chat (max 1,024 members).
- Message types: text (≤ 64 KB) and media (images/video/docs via blob storage).
- Delivery indicators: sent (server received), delivered (device received), read.
- Offline delivery: messages queue while recipient is offline, delivered on reconnect.
- Presence: online/last-seen; typing indicators.
- Multi-device: up to 4 companion devices + primary phone.
- E2E encryption (Signal protocol) — server never sees plaintext.
- WhatsApp storage model: server deletes messages after delivery (with a ~30-day undelivered cap); history lives on devices.

### Agreed non-functional requirements

- ~1B DAU; ~100B messages/day; peak concurrent connections ~500M–1B.
- Message delivery latency (both online, same region): p50 < 100 ms, p99 < 500 ms.
- No message loss once the server acks "sent" — at-least-once delivery, client-side dedup for exactly-once *effect*.
- Per-conversation ordering (all participants see the same order). Global cross-conversation ordering explicitly NOT required.
- Availability 99.99%; a gateway crash must not lose messages, only reconnect sessions.
- Write-heavy storage: unlike the shortener, reads ≈ writes (each message written once, read ~once per recipient device).

**Interview trap:** Accepting "messages must be strongly consistent and totally ordered" without pushback. Total global order across 100B messages/day would require a global sequencer — a bottleneck nothing needs. Users only ever observe *one conversation at a time*; per-conversation order is the real requirement. Narrowing consistency scope to what the user can actually perceive is a core senior skill — do it out loud in Step 1.

---

## Step 2: Estimation

**Connections:**
- 1B DAU, average session pattern → assume ~500M concurrent TCP/WebSocket connections at global peak.
- A tuned gateway box holds ~500k–1M connections (deep dive later). 500M / 500k = **~1,000 gateway servers** (plus headroom/failure margin → ~1,500). This number shapes everything: you cannot treat connections as free.

**Message throughput:**
- 100B messages/day / 86,400 s ≈ **~1.2M messages/s average**, peak 2–3× → **~3M msg/s**.
- Each message touches: 1 write (store), ~1–2 deliveries (1:1) or up to 1,024 (group). Assume average effective fan-out ~2.5 → **~7–8M delivery operations/s peak**. This is a queueing/fan-out problem first, storage second.

**Storage:**
- Average message ~100 bytes ciphertext + ~100 bytes metadata (IDs, seq, timestamps, receipts) ≈ 200 B.
- 100B/day × 200 B = **20 TB/day** of message data.
- WhatsApp model (delete after delivery, 30-day cap on undelivered): steady-state store ≈ only undelivered backlog. If ~5% of messages wait offline for an average of 1 day → ~1 TB steady state + receipts. Tiny.
- Slack model (permanent): 20 TB/day → **~7 PB/year**. Say both numbers — the retention question from Step 1 just became a 3-orders-of-magnitude storage difference. This is why you asked it.

**Media:**
- ~10% of messages carry media, average 300 KB → 10B × 300 KB = **3 PB/day** through the blob store. Media dwarfs text by ~150×; it must bypass the messaging path entirely (deep dive later). CDN + dedup (same viral video forwarded a million times → content-addressed storage, store once).

**Presence:**
- 1B users flapping online/offline + last-seen updates. If every transition fanned out to every contact (avg 200), a single mass-reconnect event (regional network blip) = 200 × millions of transitions/s. This math is why presence is pull-based + scoped push (deep dive later).

**Interview trap:** Estimating storage but not *connection memory*. 500k connections × ~20 KB (kernel buffers + userspace state) = ~10 GB just for connection state on one box — before any application logic. Candidates who size disks but not sockets reveal they've never run a connection-heavy service.

---

## Step 3: API design

Two surfaces: a WebSocket protocol for the realtime path, HTTPS/REST for everything that doesn't need a live socket (auth, media, history sync).

### WebSocket connection

```
GET wss://gw.chat.example.com/v1/connect
Headers: Authorization: Bearer <token>, X-Device-Id: <device_uuid>

Server → client on connect:
{ "type": "hello", "session_id": "...", "heartbeat_interval_s": 30 }
```

All frames are small binary (protobuf) in production; shown as JSON for readability.

### Client → server frames

```
// Send message (client generates the ID — this is load-bearing for idempotency)
{ "type": "msg", "client_msg_id": "dev123-8842",       // unique per device
  "conv_id": "c:alice:bob",  "payload": "<ciphertext>",
  "media": null }

// Ack of received messages (cumulative)
{ "type": "ack", "conv_id": "c:alice:bob", "delivered_up_to_seq": 1042 }

// Read receipt
{ "type": "read", "conv_id": "c:alice:bob", "read_up_to_seq": 1040 }

// Sync request on reconnect (cursor = last seq seen per conversation, or global device cursor)
{ "type": "sync", "device_cursor": "8812331" }

// Heartbeat
{ "type": "ping" }
```

### Server → client frames

```
// Inbound message
{ "type": "msg", "conv_id": "c:alice:bob", "seq": 1043,
  "sender": "u:alice", "sender_device": "d:alice-phone",
  "server_ts": 1751630400123, "payload": "<ciphertext>" }

// Receipt updates for messages you sent
{ "type": "receipt", "conv_id": "c:alice:bob", "seq": 1041,
  "status": "delivered" | "read", "by": "u:bob" }

// Send confirmation (the single grey tick)
{ "type": "sent_ack", "client_msg_id": "dev123-8842",
  "conv_id": "c:alice:bob", "seq": 1043 }

{ "type": "pong" }
```

### REST (non-realtime)

```
POST /v1/media/uploads            -> { "upload_url": "<presigned>", "media_id": "m:..." }
GET  /v1/media/{media_id}         -> 302 to CDN (authorized, short-lived URL)
POST /v1/groups                    { "name": "...", "member_ids": [...] } -> group_id
PUT  /v1/groups/{id}/members      (add/remove; server enforces 1024 cap)
GET  /v1/keys/{user_id}           -> prekey bundles for X3DH session setup
POST /v1/devices                  -> register companion device (QR-code linking flow)
```

Design notes to voice:

- **Client-generated message IDs** enable idempotent resend: network drops after send, client resends with the same `client_msg_id`, server dedups. Without this, at-least-once delivery duplicates messages. This one field is where exactly-once *effect* comes from.
- **Cumulative acks** (`delivered_up_to_seq`) instead of per-message acks: one frame acks a burst of 50 messages. TCP taught us this trick; reuse it.
- Why WebSocket and not raw TCP/XMPP/long-polling — that's the first deep dive.

**Interview trap:** Designing `POST /v1/messages` REST endpoint as the primary send path. HTTP request per message means no server push for delivery, per-message TLS/HTTP overhead, and you'll immediately need a second channel for inbound anyway. The realtime socket IS the API; REST is the sidecar.

---

## Step 4: High-level architecture

```
 [Mobile clients: phone + companions]
        |  wss (persistent)                      HTTPS
        v                                          v
 +---------------+                        +----------------+
 |  L4 LB (DNS/  |                        |  API tier      |
 |  connection-  |                        |  (auth, groups,|
 |  aware)       |                        |   keys, media  |
 +-------+-------+                        |   presign)     |
         v                                +--------+-------+
 +------------------+   register/lookup            |
 |  Gateway fleet   |<------------------+          v
 |  (~1500 boxes,   |                   |   +-------------+     +---------+
 |  hold sockets,   |   +------------+  |   | Blob store  |<--->|  CDN    |
 |  dumb pipes)     |-->| Connection |--+   | (S3-style,  |     +---------+
 +---+----------+---+   | Registry   |      | content-    |
     |          ^       | (Redis:    |      | addressed)  |
     | send     | push  | user+dev ->|      +-------------+
     v          |       | gateway)   |
 +--------------+---+   +------------+
 |  Chat service    |
 |  (stateless):    |      +------------------+
 |  - validate      |----->|  Sequencer       |  per-conversation seq
 |  - assign seq    |      |  (sharded by     |
 |  - persist       |      |   conv_id)       |
 |  - route/fan-out |      +------------------+
 +---+-----------+--+
     |           |
     v           v
 +----------+  +--------------------+     +----------------+
 | Message  |  | Offline queues     |     | Async: Kafka   |
 | store    |  | (per user-device   |     | -> receipts,   |
 | (wide-   |  |  inbox, TTL 30d)   |     |    push notifs |
 | column)  |  +--------------------+     |    (APNs/FCM), |
 +----------+                             |    analytics   |
                                          +----------------+
```

Component walkthrough:

- **Gateway fleet**: terminates WebSockets, does auth-on-connect, heartbeats, and frame forwarding. Deliberately *dumb* — no business logic — so it rarely needs deploys (deploys are what kill persistent connections; deep dive A).
- **Connection registry**: the routing table of the whole system. `(user_id, device_id) → gateway_host`. Redis-backed, heavily cached. Every message delivery consults it.
- **Chat service**: stateless workers. Validate, get sequence number, persist, then deliver: look up recipient's gateway and push, or write to offline queue + trigger APNs/FCM push notification.
- **Sequencer**: issues per-conversation monotonically increasing sequence numbers. Sharded by `conv_id` — no global coordination (deep dive B).
- **Message store**: wide-column (Cassandra/ScyllaDB), keyed by conversation, ordered by seq (Step 5).
- **Offline queues**: per-(user, device) inbox of undelivered message references, drained on reconnect (deep dive C).
- **Kafka**: receipts, presence events, push-notification triggers, analytics — everything that shouldn't block the send path.

**Interview trap:** Putting business logic in the gateway "since the connection is already there." Now every chat-logic deploy restarts gateways and drops millions of connections, causing reconnect storms. The gateway/service split exists so the thing that changes daily (logic) is decoupled from the thing that must stay up for weeks (sockets). If you merge them, expect the interviewer to ask "how do you deploy?" and watch you squirm.

---

## Step 5: Data model

Write-heavy, append-only, always read by conversation in seq order → wide-column store (Cassandra/ScyllaDB/HBase). Rationale: LSM-tree writes are cheap appends; partition key gives single-node conversation reads; clustering column gives free ordering; per-row TTL matches the WhatsApp retention model natively.

### `messages` (Cassandra)

```sql
CREATE TABLE messages (
  conv_id      text,          -- "c:{smaller_uid}:{larger_uid}" or "g:{group_id}"
  seq          bigint,        -- per-conversation sequence number
  msg_id       uuid,          -- server-assigned global id (TimeUUID)
  sender_id    text,
  sender_device text,
  server_ts    timestamp,
  body         blob,          -- ciphertext; server cannot read it
  media_ref    text,          -- blob-store pointer + encrypted key envelope
  PRIMARY KEY ((conv_id), seq)
) WITH CLUSTERING ORDER BY (seq DESC)
  AND default_time_to_live = 2592000;   -- 30 days (WhatsApp model)
```

- Partition key `conv_id`: one conversation = one partition → reads are single-partition slices ("last 50 messages" = one contiguous read).
- Hot/huge partition risk: a 1,024-member group at high volume grows one partition unboundedly in the Slack model. Mitigation: composite partition `(conv_id, bucket)` where bucket = month or seq/10k. In the WhatsApp model TTL keeps partitions small; mention the bucketing anyway.

### `inbox` — per-device offline queue (Cassandra or Redis Streams)

```sql
CREATE TABLE inbox (
  user_id    text,
  device_id  text,
  queue_seq  bigint,          -- per-device monotonic (delivery cursor space)
  conv_id    text,
  msg_seq    bigint,          -- pointer into messages table
  PRIMARY KEY ((user_id, device_id), queue_seq)
) WITH default_time_to_live = 2592000;
```

### `conversations` / `group_members` (Postgres — low volume, relational shape)

```sql
CREATE TABLE conversations (
  conv_id     TEXT PRIMARY KEY,
  type        SMALLINT NOT NULL,           -- 1:1 = 0, group = 1
  created_at  TIMESTAMPTZ NOT NULL
);
CREATE TABLE group_members (
  conv_id    TEXT,
  user_id    TEXT,
  role       SMALLINT NOT NULL DEFAULT 0,  -- member/admin
  joined_at  TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (conv_id, user_id)
);
CREATE INDEX idx_members_user ON group_members (user_id);  -- "my groups"
```

Group membership is read on *every* group send (to fan out) → cache the member list in Redis, invalidate on membership change. Membership changes are ~6 orders of magnitude rarer than sends.

### Connection registry (Redis)

```
HSET conn:{user_id} {device_id} "{gateway_host}|{connected_at}"
EXPIRE conn:{user_id} 90            -- refreshed by gateway heartbeat lease
```

### Retention model — contrast table (interviewers love this)

| Dimension | WhatsApp model (ephemeral server) | Slack model (permanent archive) |
|---|---|---|
| Server storage | Undelivered backlog only (~TBs) | Everything forever (~PB/year) |
| Datastore pressure | Queue-like; TTL does the cleanup | True big-data archive; compaction, tiering to cold storage |
| History on new device | Device-to-device transfer / encrypted backup | Server replays anything |
| Search | Client-side only (and E2E makes server search impossible anyway) | Server-side full-text (Elasticsearch tier) |
| E2E compatibility | Natural fit | In tension — can't index ciphertext; Slack is not E2E for this reason |
| Compliance/export | Hard (data lives on phones) | Easy (and legally demanded by enterprises) |
| Cost | Cheap | The dominant infra cost |

**Interview trap:** Choosing Cassandra "because scale" without articulating the access pattern (append by conversation, read recent slice, TTL expiry). The same reflex answer with `PRIMARY KEY (msg_id)` scatters a conversation across the cluster and turns "load last 50 messages" into 50 random reads. The datastore is right only if the key design is right.

---

## Step 6: Deep dives

### Deep dive A: Connection management at scale

**Why persistent connections at all.** Chat needs server → client push. Options:

| Transport | Mechanism | Verdict |
|---|---|---|
| Short polling | Client asks every N sec | Latency = N/2 avg; 1B clients polling every 5 s = 200M req/s of mostly-empty responses. Dead on arrival. |
| Long polling | Server holds request until data or timeout | Workable (early GChat/Facebook chat), but reconnect-per-message overhead, proxy timeouts, and half-duplex. Legacy answer. |
| **WebSocket** | Single TCP conn, full-duplex frames | Standard answer: one handshake, then ~4-byte frame overhead, bidirectional. |
| XMPP | XML streaming protocol over TCP | Historically what WhatsApp used — a stripped, binary-ish FunXMPP variant on modified ejabberd/Erlang. Cite it for credibility, then note the protocol matters less than the connection architecture. |
| Raw TCP + custom protocol | Full control | What you converge on at extreme scale; WebSocket is effectively this plus browser compatibility. |

**Connections per box.** The old C10k problem is now C1M:

- Each connection ≈ 10–50 KB: kernel socket buffers (tunable via `net.ipv4.tcp_rmem/wmem` — shrink defaults for mostly-idle chat sockets), TLS session state (~2–10 KB), userspace per-conn struct. At 30 KB avg, 1M conns = 30 GB — fits a 64 GB box.
- File descriptors: default `ulimit -n` 1024 → raise to 2M+ (`fs.file-max`, per-process limits).
- Ephemeral ports are NOT the limit for inbound (the 64k limit is per (src IP, src port, dst IP, dst port) tuple — clients bring their own src tuples). Saying this correctly kills a common misconception; many candidates wrongly claim 65k conns/box max.
- Event loop, not thread-per-connection: epoll/kqueue (Netty, Go netpoller, Erlang BEAM). 1M threads is impossible; 1M epoll-registered sockets is routine. WhatsApp famously demonstrated 2M+ connections per box on FreeBSD/Erlang with kernel tuning.
- Realistic production planning number: **~500k–1M conns/box**, giving our ~1,000–1,500 box fleet.

**Gateway layer vs stateless services.** The load-bearing decision:

- Gateways hold sockets and do nothing else. Chat services hold logic and no sockets. The connection registry glues them.
- Consequence: chat services deploy 10×/day with zero connection impact; gateways deploy monthly.

**Connection registry.**

- On connect: gateway authenticates, then `HSET conn:{uid} {device} gateway-42` in Redis (sharded by user_id) and refreshes a lease with its heartbeats.
- On send: chat service reads `conn:{recipient}` → knows exactly which gateway hosts each recipient device → RPC to that gateway ("push frame to session X").
- Registry entries carry a TTL lease so a *dead gateway's* entries self-expire — routing never trusts a stale entry for long.

**Heartbeats and dead-connection detection.**

- TCP half-open connections are silent: a phone that drops off a cell tower sends no FIN. Without application heartbeats, the gateway holds a dead socket forever and the registry routes messages into a black hole.
- Client pings every ~30 s (mobile-radio-friendly; too frequent drains battery — this is a real tuning war with mobile OS wake limits). Gateway declares death after 2 missed intervals → close socket, delete registry entry → subsequent messages take the offline path (queue + push notification).
- TCP keepalive alone is insufficient: default kernel timers are 2 hours, and middleboxes/NATs kill idle mappings in 30–300 s. Application-level ping also proves the *application* is alive, not just the kernel.

**Graceful gateway drain (deploys/scale-in).**

1. Remove gateway from LB for new connections.
2. Send a `goaway` frame to connected clients in randomized batches over 5–10 minutes (jitter is the point — see trap).
3. Clients reconnect through the LB to healthy gateways, re-register, send `sync` cursor; zero message loss because messages were never stored on the gateway.
4. After timeout, force-close stragglers; registry leases expire.

**Interview trap:** Draining a gateway by just killing it, or reconnecting all clients simultaneously. 500k clients reconnecting at once = a **thundering herd**: TLS handshakes are CPU-expensive (~1–2 ms of CPU each → 500k handshakes = minutes of fleet CPU), auth service gets hammered, and the herd cascades to the next gateway you drain. Every reconnect design needs jitter + exponential backoff baked into the *client*, because you cannot patch clients during the incident.

**Interview trap:** Storing "which gateway" in the message itself or using sticky LB hashing instead of a registry. Sticky hashing breaks the moment a gateway dies (its hash slot's users are now elsewhere); an explicit registry updated on connect is the only source of truth that survives topology change.

### Deep dive B: Message flow, fan-out, and ordering

**1:1 flow, end to end:**

```
Alice(phone)        GW-7          Chat svc       Sequencer     Store/Queues        GW-42        Bob(phone)
    |  msg(client_id) |               |               |               |               |              |
    |---------------->|  fwd          |               |               |               |              |
    |                 |-------------->| seq(conv)?    |               |               |              |
    |                 |               |-------------->|               |               |              |
    |                 |               |  seq=1043     |               |               |              |
    |                 |               |<--------------|               |               |              |
    |                 |               | persist(1043) |               |               |              |
    |                 |               |------------------------------>|               |              |
    |  sent_ack(1043) |  <---ack------|  (single grey tick)           |               |              |
    |<----------------|               | registry: bob -> GW-42        |               |              |
    |                 |               |------------------------------------ push ---->|              |
    |                 |               |               |               |               |---- msg ---->|
    |                 |               |               |               |               |<--- ack -----|
    |                 |               |<-------------------- delivered(1043) ---------|              |
    |  receipt: delivered (double grey tick)          |               |               |              |
    |<----------------|<--------------|               |               |               |              |
```

Key property: Alice's "sent" tick fires after **persist**, not after delivery. The server owning durability before acking is what makes "no loss after sent" true. If Bob is offline, the flow after persist becomes: append to Bob's inbox queues + fire APNs/FCM wake-up push.

**Group fan-out — the fork in the road:**

| Approach | Mechanics | Pros | Cons |
|---|---|---|---|
| **Fan-out-on-write** (materialized per-user inboxes) | On send, write a pointer into each member-device's inbox queue | Recipient read path is trivial (drain own queue); offline delivery uniform with 1:1 | Send cost = O(members × devices); a 1,024-group message = up to ~5k inbox writes |
| **Fan-out-on-read** (shared log) | Write once to the conversation log; each member reads with own cursor | O(1) send; natural for huge channels | Every recipient read fans *in*; offline detection & push notifs still need per-member work; cursor management per member |

WhatsApp-style answer: **fan-out-on-write**, because groups are capped. 1,024 members × ~3M msg/s aggregate is affordable *because the cap makes it affordable* — and that's exactly *why* WhatsApp caps groups. The cap is not a product whim; it's the fan-out budget. (Also: E2E sender-keys still require per-member ciphertext delivery, so a shared-log optimization saves less than it appears — the encryption model couples to the fan-out model.) Telegram-style 200k channels flip to fan-out-on-read with a shared log + cursors, and drop per-message E2E. If the interviewer raises group size, *switch models* rather than stretching one.

Mechanics detail worth saying: send path reads the (cached) member list, writes N inbox pointers via a batched async job — the sender's ack does NOT wait for all N inbox writes; it waits only for the conversation-log persist. Inbox materialization is retryable/idempotent (keyed by msg_id) so a fan-out worker crash re-runs safely.

**Message IDs and ordering:**

- **Why client timestamps lie:** phone clocks skew by seconds-to-minutes (dead batteries reset clocks; users fake clocks to cheat games; NTP drift on flaky radios). Order by client time and messages interleave nonsensically or arrive "from the future." Client timestamps are display metadata only.
- **Why global ordering is unnecessary:** no user ever observes cross-conversation order. Requiring it means one global sequencer (bottleneck) or TrueTime-class machinery (Spanner) — cost with zero user-visible benefit. Scope ordering to the conversation.
- **Per-conversation sequence numbers (chosen):** a sequencer shard owns each `conv_id` (consistent-hash the conv space over a sequencer fleet; each shard hands out ranges backed by durable checkpoints, exactly the block-lease trick from the URL-shortener lesson). Sequence gives: total order within the conversation, gap detection on the client (received 1041 then 1043 → 1042 missing → request retransmit), and idempotent storage keys.
- **Hybrid logical clocks (HLC) / Snowflake IDs (alternative):** 64-bit IDs = timestamp + node + counter. No per-conversation coordination — attractive multi-region — but only *causally consistent-ish* ordering: two simultaneous sends from different regions order arbitrarily (fine — they were concurrent; any consistent tiebreak works), and you lose cheap gap detection (IDs aren't dense), so you need a separate "how many messages" mechanism for loss detection. Trade-off table:

| | Per-conv sequencer | HLC/Snowflake |
|---|---|---|
| Ordering | Total per conversation | Causal + tiebreak |
| Gap detection | Free (dense seq) | Needs extra mechanism |
| Coordination | Per-conv shard (small, cacheable) | None |
| Multi-region writes | Conv is homed to a region (or seq ranges split) | Trivially write-anywhere |
| Failure mode | Sequencer shard failover pauses that conv's sends ~ms–s | None specific |

For WhatsApp-model (conversation naturally homed where its members are), the sequencer wins on gap detection alone: over flaky mobile networks, *knowing you missed a message* is a feature you use every reconnect.

**Interview trap:** "Kafka is my message queue between users." Kafka partitions are coarse (you cannot have 10B per-conversation partitions), consumers are heavyweight group-managed processes not 1B phones, and per-user selective delivery isn't its model. Kafka belongs in this design for *server-side* async work (receipts, notifs, analytics) — using it as the user-facing delivery fabric signals tool-matching by buzzword.

**Interview trap:** Ack-before-persist. If the chat service acks "sent" and then crashes before the store write, the sender's UI shows a tick for a message that no longer exists — the one lie the product must never tell. Persist, then ack; the p99 cost of one quorum write (~5–10 ms on ScyllaDB) is the price of the tick's honesty.

### Deep dive C: Delivery receipts, offline delivery, and multi-device

**The per-message state machine (per recipient):**

```
            server persist          device ACK              client displays
  PENDING ----------------> SENT ----------------> DELIVERED ----------------> READ
  (client                  (1 grey                (2 grey                    (2 blue
   retrying)                tick)                  ticks)                     ticks)

  Group semantics: SENT when server persists; DELIVERED/READ ticks flip
  when ALL members have (per-member receipt state kept server-side or on sender device).
```

Transitions are monotonic — a receipt can only move forward. Receipts are themselves messages (tiny system frames) flowing back through the same pipeline, but batched (a `read up_to_seq` covers a whole screenful) and deprioritized under load: shedding receipts degrades ticks; shedding messages degrades the product. Knowing which traffic class to shed is a senior answer.

**Ack protocol:**

- Device acks with a *cumulative* cursor: `delivered_up_to_seq=1042` — one frame confirms everything ≤ 1042 in that conversation, resilient to ack loss (next ack supersedes).
- Server marks inbox entries ≤ cursor as delivered → eligible for deletion (WhatsApp model) → relays receipt to sender's devices.
- Anything unacked stays queued; redelivery on next connect. Combined with client-side dedup on `(conv_id, seq)`, this yields at-least-once transport with exactly-once display.

**Offline delivery:**

1. Send path finds no live registry entry for a device → append pointer to that device's `inbox` partition + trigger APNs/FCM push ("wake up, you have messages" — payload-less or minimal, since content is E2E anyway).
2. Undelivered messages persist up to 30 days (TTL), then expire — the sender's tick simply never flips to delivered. Bounding the queue is essential: unbounded offline queues for abandoned accounts is a storage leak.
3. Push notification is a *wake-up*, never the delivery channel — APNs/FCM are lossy, unordered, size-limited. Data flows only over your socket after the app wakes and syncs. Candidates who deliver content via FCM payloads have never handled FCM's silent drops.

**Sync on reconnect (the cursor protocol):**

- Client connects, sends its device cursor (`queue_seq` high-water mark).
- Server streams inbox entries above the cursor, in order, in batches; client applies, dedups, advances cursor, cumulative-acks.
- This is a resumable replication protocol between server queue and device DB — the same shape as a Kafka consumer resuming from an offset. Framing it that way earns points.
- Gap check: client also verifies per-conversation seq continuity; a gap triggers a targeted fetch (covers rare inbox-write loss).

**Multi-device:**

- Every device has its own inbox queue and its own delivery cursor — a message is "delivered" per device; the sender-visible receipt fires on the *first* device delivery (WhatsApp semantics).
- Fan-out cost multiplies: 1:1 message → up to 5 recipient-device queues + sender's *other* devices (your own sends must appear on your laptop too — candidates forget sender-side fan-out constantly).
- E2E multiplies too: per-device Signal sessions; sender encrypts N device-copies (or uses sender-key distribution per device). This is why WhatsApp multi-device took years and why companion devices are capped at 4 — each device linearly multiplies encryption, queueing, and receipt state. The cap, again, is a budget.
- History for a newly linked device: server has no plaintext history to give. WhatsApp does a primary-device → new-device encrypted transfer (primary encrypts recent history to the new device's keys, ships via server as opaque blobs). No primary online = no history. State this limitation — it's E2E's honest cost.

**Interview trap:** One shared queue per *user* instead of per *device*. Phone drains the queue; laptop connects and sees nothing. Delivery state is inherently per-device; the moment multi-device is in scope, every queue and cursor sprouts a device dimension. Retrofitting that is a schema migration across the hottest tables — design it in from the start.

### Supporting deep-dive: presence, E2E, media (compressed but interview-ready)

**Presence (last-seen, online, typing):**

- Naive push: every online/offline transition fans out to all ~200 contacts → mass-reconnect events produce fan-out storms that dwarf message traffic. The estimation in Step 2 already showed this.
- Real design: **pull on chat-open** (fetch peer's presence when a conversation opens — covers 95% of the need with zero fan-out) + **scoped push** only to contacts with the chat currently open / recent-interaction set (top ~5–10, tracked in Redis) + **debounce flapping**: mark offline only after N seconds of disconnection, mark online lazily; a phone bouncing between cell towers must not generate a transition per bounce.
- Typing indicators: fire-and-forget frames, TTL ~5 s client-side, never persisted, first traffic class shed under load.

**E2E encryption — Signal protocol at senior altitude:**

- **X3DH key agreement:** each device publishes an identity key + signed prekey + batch of one-time prekeys to the server. Alice fetches Bob's *prekey bundle* and derives a shared secret **without Bob being online** — this asynchrony is what makes E2E work for messaging (vs TLS-style live handshakes).
- **Double ratchet:** every message advances key material (symmetric ratchet per message + DH ratchet on each round-trip) → **forward secrecy** (steal today's keys, still can't read yesterday) and post-compromise healing (a compromise stops being useful once the ratchet turns).
- **Per-device sessions:** encryption is device-to-device; N recipient devices = N sessions.
- **Sender keys for groups:** pairwise-encrypting each group message to 1,023 members × devices is untenable → each sender generates a symmetric *sender key* per group, distributes it once pairwise to all members, then encrypts each message once. Membership change ⇒ rotate sender keys (so removed members can't read on).
- **Server sees only ciphertext + metadata.** Consequences to state: no server-side search (client indexes locally), no content-based spam ML (WhatsApp does spam detection on *metadata and behavior* — send rates, graph patterns, report signals), no server ad targeting on content, lawful-intercept debates center on metadata. Feature cost is the honest half of the E2E answer; giving only the crypto half is a yellow flag.

**Media:**

- Never through the message pipeline (3 PB/day vs 20 TB/day — Step 2 math). Flow: client encrypts media with a random symmetric key → uploads ciphertext to blob store via presigned URL → sends a normal (tiny) message containing `{blob_url, key, hash}` E2E-encrypted → recipient downloads from CDN, decrypts locally.
- Forward dedup: same ciphertext blob referenced by hash → a viral video is stored once and re-sent as a pointer. (WhatsApp's convergent trick: key derived from content hash makes forwards byte-identical — mention the privacy trade-off of convergent encryption if pushed.)
- Thumbnails inline in the message (a few KB) so the UI renders instantly while full media fetches.

---

## Step 7: Scale & evolve

### What breaks first at 10×

10× ≈ WhatsApp-actual-scale-plus: 5B+ connections, 30M msg/s.

1. **Connection registry** — first casualty. Every send reads it; every connect/disconnect/heartbeat-lease writes it. At 30M msg/s + connection churn it's tens of millions of Redis ops/s. Fix: shard harder by user_id, cache registry lookups in chat services with short TTL + invalidation-on-miss (stale entry → gateway NACKs → refresh), and localize (per-region registries; cross-region lookups only for cross-region sends).
2. **Sequencer hot shards** — celebrity groups / megagroups concentrate seq requests. Fix: bigger leased ranges, shard splitting, or migrate the hottest conversations to a shared-log model.
3. **Fan-out workers** for group traffic — linear in members × devices; queue lag here shows up as "group messages arrive late," a user-visible symptom. Autoscale on fan-out queue depth, not CPU.
4. **Cassandra compaction** under 10× write volume — mostly a capacity/ops problem (that's *why* wide-column was chosen: it scales linearly by adding nodes).
5. Gateways scale embarrassingly (add boxes) — the layer you sized for pain turns out to be the easy one at 10×, *because* it's dumb. Point out the irony; it validates the Step 4 split.

### Multi-region

- **Connect users to the nearest region** (GeoDNS/anycast): RTT to the gateway dominates perceived latency.
- **Home each conversation** to one region (where the sequencer shard and log partition live) — most conversations are geographically local (chat graphs follow social graphs). Cross-region conversation: sender's frame relays to the home region's sequencer, then delivery pushes back out to each recipient's local gateway. One cross-region hop (~50–150 ms) only for genuinely cross-region pairs.
- Registry and presence stay regional; a small global directory maps `user → current region`.
- Region failure: clients reconnect (with jitter and backoff — the drain design reused) to the next region; conversation homes fail over via the log's cross-region replicas; undelivered inbox queues are replicated async, so RPO is seconds of receipts, not messages (messages re-fetch from the conversation log).
- Avoid active-active writes to the *same conversation* in two regions — that's where per-conv sequencing would break down; the HLC alternative from Deep dive B is the escape hatch if the interviewer demands write-anywhere.

### Evolution roadmap

- v1 (1M users): single region; gateways + one chat service + Postgres for everything; Redis registry. Ship it.
- v2 (100M): Cassandra message store, per-device inboxes, sequencer service, Kafka async tier, sender-key groups.
- v3 (1B+): multi-region conversation homing, regional registries, fan-out worker fleets, dedicated media/CDN pipeline, shared-log mode for megagroups.

---

## Common follow-up questions

**Q: How do you guarantee exactly-once delivery?**
A: You don't — no distributed system does over lossy links. You build at-least-once transport (persist before ack, redeliver until cumulative-acked) plus idempotent receive (dedup on `(conv_id, seq)` / `client_msg_id`), which yields exactly-once *effect* at the UI. Saying "exactly-once via two-phase commit" is an automatic credibility hit.

**Q: A user reports messages arriving out of order. Debug it.**
A: Per-conversation seq makes server order unambiguous, so it's a client rendering issue: probably sorting by client timestamp (lies) instead of seq, or applying sync batches non-atomically. Check whether gaps triggered retransmits that were appended instead of inserted. The design makes this a client bug *by construction* — that's the point of the sequencer.

**Q: Why not deliver messages via APNs/FCM entirely and skip the socket while backgrounded?**
A: Push services are best-effort (silent drops under throttling), unordered, size-capped (~4 KB), and you can't run your ack protocol over them. They're a doorbell, not a mail slot. Backgrounded phones do rely on them to wake — but delivery always completes over your socket.

**Q: The sender sees one tick but the recipient swears they got nothing. Walk the failure.**
A: One tick = server persisted, delivery incomplete. Suspects in order: recipient device offline with push notification dropped (FCM throttling); stale registry entry routed the push to a dead gateway and the NACK/retry path lagged; inbox fan-out job backlogged. Verify from the server: is the message in the recipient's inbox with no delivery cursor past it? Then it's wake-up or connectivity, not loss — the design distinguishes "not lost" from "not yet delivered," and being able to *prove which* from server state is why we persist receipts.

**Q: How would you add "delete for everyone"?**
A: It's a new system message ("revoke msg_id X") flowing through the same pipeline; recipients' clients delete locally. Server can drop the ciphertext if still queued. It's best-effort by nature — an already-read message was seen; a device offline past the revoke window may render then delete. E2E means the server can't verify clients complied. Honest limits, stated plainly.

**Q: Slack-style search over E2E messages?**
A: Contradiction — pick one. E2E ⇒ client-side index (SQLite FTS on-device, WhatsApp's approach) with per-device coverage limits. Server-side search ⇒ server-readable content (Slack's actual position: TLS + at-rest encryption, not E2E). If someone claims both, the "E2E" usually turns out to have server-held keys — i.e., not E2E.

**Q: Why Cassandra over Postgres for messages when you chose Postgres for the URL shortener?**
A: The shortener wrote 40 rows/s of immutable KV; chat writes ~3M/s append-heavy with TTL churn. LSM storage (cheap appends, natural TTL compaction, linear horizontal scale) matches; a B-tree primary with 3M inserts/s + TTL delete storms does not. Same decision procedure — access pattern first — opposite conclusion. Interviewers explicitly probe for whether your DB choices are reflexes or reasoning.

---

## What gets you rejected

1. **HTTP polling as the delivery mechanism** at 1B users, or hand-waving "we'll use WebSockets" with zero discussion of connections-per-box, heartbeats, or what happens on deploy. The connection layer IS this question.
2. **Business logic inside the gateway.** The follow-up "how do you deploy without dropping 500k connections per box?" has no good answer once you've fused them.
3. **Global ordering via one sequencer / global timestamps.** Building a planet-wide bottleneck for a property no user can observe. Equal-and-opposite failure: no ordering story at all ("timestamps are probably fine" — client clocks lie).
4. **Kafka as the per-user delivery fabric.** Partition-per-conversation at 10B conversations, phones as consumer-group members — it doesn't type-check. Kafka is for the server-side async tier only.
5. **Ack-before-persist**, or no dedup story — the design either lies about "sent" or double-renders messages. Either one fails the core guarantee.
6. **Per-user (not per-device) queues** when multi-device is in scope; no cursor-based reconnect sync ("the client just fetches recent messages" — from where, for which device, since when?).
7. **Unbounded fan-out**: 100k-member groups with fan-out-on-write and no discussion of why WhatsApp caps groups or when to switch to a shared log. The cap is an architectural decision — miss it and you missed the deep dive.
8. **E2E hand-waving** — "we encrypt with the user's key" (which device? key agreement offline how? groups how?) or claiming server-side content search/spam-filtering on ciphertext. You don't need to derive the double ratchet; you must not contradict it.
9. **Media through the message pipeline.** The 150× data-volume mismatch from Step 2 makes this indefensible; it signals the estimation was decorative.
10. **Presence fan-out to all contacts on every transition.** The interviewer will ask "what happens when a mobile carrier blips and 5M users reconnect" — naive presence turns a blip into your outage.
