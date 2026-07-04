# Lesson 4.6 — Design Netflix / YouTube (Video Platform)

> Module: System Design (HLD) | Level: Senior | FDE Prep Phase 4

Video is the opposite of the Calendly question: here the difficulty IS scale — petabytes of storage, terabits of egress, and a processing pipeline where one upload fans out into hundreds of compute jobs. Interviewers use this question to check whether you know where the bytes actually flow (hint: 95%+ of them never touch your application servers) and whether you can design an asynchronous pipeline that survives partial failure. Juniors design a web app that serves MP4s; seniors design a CDN with a control plane attached.

---

## Step 1: Requirements (functional + non-functional)

### Clarifying questions you should ask (and why each matters)

1. **"Netflix-style (curated catalog, ~10k titles, licensed/produced content) or YouTube-style (UGC, millions of uploads/day)?"**
   Why it matters: this changes almost everything. Netflix can *pre-position* its entire popular catalog on edge appliances because the catalog is small and demand is predictable. YouTube cannot — the long tail is infinite, so it must pull-through cache. Netflix has no upload-at-scale problem; YouTube's ingest pipeline is half the system. Ask this first; design for YouTube-style ingest + discuss both CDN models.

2. **"Live streaming in scope, or VOD only?"**
   Why it matters: live changes the pipeline from batch DAG to real-time (encode-as-you-ingest, LL-HLS, seconds of end-to-end latency budget). Scope to VOD; mention live in Step 7.

3. **"What's the viewing scale? DAU, concurrent peak?"**
   Why it matters: drives egress bandwidth math — the number that dominates cost and architecture. Assume 100M DAU for estimation.

4. **"Do we need exact view counts, or is approximate acceptable?"**
   Why it matters: exact real-time counting at YouTube scale is a distributed-counting problem; approximate-live + exact-reconciled is the standard answer, and asking shows you know counting is nontrivial (Deep Dive on view counting below).

5. **"DRM/content protection requirements?"**
   Why it matters: Netflix-style licensed content mandates DRM (Widevine/FairPlay); UGC mostly needs signed URLs. Affects packaging step and player.

6. **"Upload constraints — max file size, from what networks?"**
   Why it matters: creators upload 50GB+ 4K files from flaky home connections. That single fact mandates resumable chunked uploads — a full deep dive.

### Agreed functional requirements

- Creators upload videos (up to ~100 GB), with metadata (title, description, tags, thumbnail).
- System transcodes into multiple resolutions/codecs for adaptive playback on any device.
- Viewers browse/search, stream with adaptive bitrate, resume where they left off, across devices.
- View counts, likes; watch history; recommendation surface (interface only, not the ML).
- Content moderation gate before public visibility.

### Non-functional requirements

- Video start time (click → first frame) p95 < 2s. This is *the* UX metric for video.
- Rebuffer ratio < 0.5% of watch time.
- Durability: uploaded masters are never lost — 11 nines (S3-class) on originals.
- Availability: playback 99.99% (playback is revenue); upload/processing can degrade gracefully — a 20-minute processing delay is annoying, a playback outage is a headline.
- Time-to-publish for a typical 10-min upload: minutes, not hours.
- View counts: approximately correct live, exactly correct within ~24h.

**Interview trap:** Treating upload and playback as symmetric. Playback is latency-critical and must be boring and bulletproof; the ingest pipeline is throughput-oriented, asynchronous, and allowed to queue. Stating this asymmetry early — "I'll design playback for availability and ingest for durability + throughput" — frames the whole session correctly.

---

## Step 2: Estimation

**Uploads (YouTube-style):**
- Assume 500 hours of video uploaded per minute (YouTube's public order of magnitude).
- 500 h/min = 30,000 h/hour = 720,000 hours/day.
- Raw upload size: say avg 1080p source at ~5 GB/hour → 720k × 5 GB ≈ **3.6 PB/day of raw ingest** (~330 Gbps sustained inbound).
- Transcoded renditions add roughly 1–1.5× the source size across the ladder (lower resolutions are small; multiple codecs multiply) → ~4–5 PB/day new storage. **Storage grows by exabytes per year** — tiering (hot/warm/Glacier for cold masters) is mandatory, and per-rendition storage decisions (maybe don't keep 4K AV1 for a video with 3 views) are real levers.

**Playback (the number that dominates):**
- 100M DAU × 1 hour average watch/day = 100M viewing hours/day.
- Average delivered bitrate ~3 Mbps (mix of renditions) → 3 Mbps × 3600s ≈ 1.35 GB/hour delivered.
- 100M hours × 1.35 GB ≈ **135 PB/day egress** ≈ 12.5 Tbps average, ~2–3× at evening peak → **25–40 Tbps peak egress**.
- Sanity check the conclusion out loud: *"No origin infrastructure serves 25 Tbps. This number is why the CDN isn't an optimization — it IS the delivery system. Design goal: >95% of bytes served from edge caches; origin sees only cache misses."*

**Transcode compute:**
- 720k hours/day of source, each transcoded to ~8 renditions. Rule of thumb: ~1× realtime per core-ish unit for H.264 at 1080p, far worse for AV1 (10–50× the encode cost). Blended, budget ~5–10× realtime-hours of compute per source hour → 4–7M compute-hours/day → **~200–300k cores running continuously**. This is why the encode fleet runs on spot instances (Deep Dive) — at this size, the ~60–70% spot discount is tens of millions of dollars a year.

**View events:**
- 100M DAU × ~30 view/heartbeat events each ≈ 3B events/day ≈ **~35k events/sec average, 100k+/sec peak**. This is a stream-processing workload, not a database workload — the reason `UPDATE videos SET views = views + 1` is disqualifying (Deep Dive).

**Metadata:**
- Billions of videos × ~2 KB metadata = terabytes — trivial next to the video bytes. Watch-history writes: 100M DAU × dozens of position updates per session ≈ tens of thousands of writes/sec — the write-heavy KV workload that justifies Cassandra later.

---

## Step 3: API design

Upload (creator-facing):

```
POST /v1/videos                          # create upload session
{ "title": "...", "size_bytes": 8589934592, "checksum": "sha256:..." }

201 {
  "video_id": "v_abc",
  "upload": {
    "protocol": "multipart",             # tus or S3-multipart semantics
    "part_size": 16777216,               # 16 MB chunks
    "upload_id": "up_123",
    "part_urls": [ "https://ingest.../part/1?sig=...", ... ]   # presigned, direct-to-blob
  }
}

PUT  {part_url}                          # client uploads each chunk DIRECTLY to blob store
POST /v1/videos/{id}/complete            # { "parts": [{ "n":1, "etag":"..." }, ...] }
GET  /v1/videos/{id}/status              # uploading | processing | ready | failed | rejected
```

Playback (viewer-facing):

```
GET /v1/videos/{id}/play

200 {
  "manifest_url": "https://cdn.example.com/v_abc/master.m3u8?sig=...&exp=...",
  "resume_position_s": 1284,
  "drm": { "license_url": "https://drm.../license", "system": "widevine" }
}
```

The player then talks HLS/DASH to the CDN directly — manifest, then segments. **The API server never touches video bytes**, in either direction: uploads go client → blob store via presigned URLs; playback goes CDN → client. Say this explicitly.

Engagement:

```
POST /v1/videos/{id}/events              # batched client beacons
{ "events": [
    { "type": "view_start", "ts": ..., "session": "s_1", "position_s": 0 },
    { "type": "heartbeat",  "ts": ..., "position_s": 30, "rendition": "720p",
      "buffer_s": 12.5, "throughput_kbps": 8400 },
    { "type": "view_end",   "ts": ..., "position_s": 412 }
] }
202                                       # fire-and-forget into Kafka; never block playback

GET  /v1/users/me/history?cursor=...
GET  /v1/search?q=...&cursor=...
GET  /v1/users/me/home                    # recommendations surface
```

**Interview trap:** Designing `POST /upload` as a single request with the video in the body through your API tier. A 50 GB body through your load balancer and app servers means 2-hour requests, memory pressure, no resumability, and your API fleet sized for video throughput. Presigned direct-to-blob upload is table stakes; not knowing it is a strong negative signal.

---

## Step 4: High-level architecture

```
 CREATORS                                                          VIEWERS
    │                                                                 │
    │ chunked upload (presigned,                          manifest +  │
    │ direct to blob)                                     segments    │
    ▼                                                                 ▼
┌─────────────┐   upload-complete   ┌──────────────┐        ┌───────────────┐
│ Raw blob    │────────event───────►│ Kafka        │        │  CDN edge     │
│ store (S3)  │                     │ (pipeline    │        │ (Open Connect │
└─────────────┘                     │  events)     │        │  appliances / │
       │ read source                └──────┬───────┘        │  pull-through │
       ▼                                   │                │  POPs)        │
┌───────────────────────────────────────┐  │                └──────┬────────┘
│ TRANSCODING PIPELINE (workflow engine │◄─┘                       │ miss
│ e.g. Temporal / Step Functions)       │                   ┌──────▼────────┐
│  probe → split into GOP segments      │                   │ Origin shield │
│  → per-segment × per-rendition encode │                   └──────┬────────┘
│    (spot instance fleet, work queue)  │                          │
│  → audio / thumbs / subtitles /       │   packaged output  ┌─────▼─────────┐
│    moderation (parallel branches)     │──────────────────► │ Processed blob│
│  → stitch → package → manifests       │                    │ store (origin)│
└──────────────────┬────────────────────┘                    └───────────────┘
                   │ status/metadata
                   ▼
┌──────────────┐  ┌──────────────┐  ┌────────────────┐  ┌──────────────────┐
│ Metadata DB  │  │ Search index │  │ Watch history  │  │ View counting    │
│ (videos,     │  │ (Elastic-    │  │ + resume KV    │  │ beacons → Kafka  │
│  channels)   │  │  search)     │  │ (Cassandra)    │  │ → Flink windows  │
└──────────────┘  └──────────────┘  └────────────────┘  │ → counts store   │
        ▲                ▲                  ▲            └──────────────────┘
        └────────────────┴───── API tier ───┴───────────── (control plane only,
                                                            never video bytes)
```

**Component walkthrough:**

- **Raw blob store** — durable landing zone for masters (S3, 11 nines). Originals kept (cold-tiered) so future codecs can re-transcode from source.
- **Kafka** — event backbone: upload-completed triggers the pipeline; pipeline emits status; beacons flow to analytics.
- **Transcoding pipeline** — a DAG of jobs run by a workflow engine, executing on a spot-instance encode fleet fed by priority work queues. The heart of ingest (Deep Dive 1).
- **Processed blob store / origin** — packaged HLS/DASH segments + manifests, laid out for CDN consumption.
- **CDN** — serves ~everything. Two philosophies compared in Deep Dive 3 (Netflix push vs YouTube pull).
- **Metadata DB** — video/channel/status records; source of truth for "what exists and is it playable."
- **Search index** — metadata → Elasticsearch/OpenSearch via CDC; eventually consistent, fine.
- **Watch history KV** — Cassandra for the write-heavy resume-position firehose.
- **View counting path** — beacons → Kafka → Flink → serving store (Deep Dive 4).
- **API tier** — issues presigned URLs, signed manifests, serves metadata/search/history. Control plane only.

---

## Step 5: Data model

Polyglot, and each choice needs a one-line defense:

| Data | Store | Why |
|---|---|---|
| Video masters + packaged segments | S3-class blob store | Durability, throughput, lifecycle tiering; not a database problem |
| Video/channel metadata | Postgres (or Vitess/Spanner at extreme scale) | Relational, transactional status transitions, modest size |
| Watch history / resume position | Cassandra | Write-heavy (10k+ w/s), partition-per-user, LSM write path, multi-DC |
| View counts (serving) | Redis (live) + wide-column/DB (reconciled) | Hot counters vs durable truth |
| Search | Elasticsearch | Inverted index; async via CDC |
| Pipeline state | Workflow engine's store (Temporal) | Durable execution history per upload |

```sql
-- Metadata (Postgres)
CREATE TABLE videos (
  video_id      UUID PRIMARY KEY,
  channel_id    UUID NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  duration_s    INT,
  status        TEXT NOT NULL CHECK (status IN
                 ('uploading','processing','moderation_hold','ready','failed','rejected','removed')),
  visibility    TEXT NOT NULL DEFAULT 'private',   -- private|unlisted|public
  master_key    TEXT,                              -- blob path of original
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at  TIMESTAMPTZ
);
CREATE INDEX ON videos (channel_id, published_at DESC);
CREATE INDEX ON videos (status) WHERE status IN ('processing','moderation_hold');

CREATE TABLE renditions (
  video_id      UUID REFERENCES videos,
  rendition     TEXT,          -- '1080p_h264', '720p_vp9', 'audio_128k', ...
  codec         TEXT NOT NULL,
  bitrate_kbps  INT NOT NULL,
  width         INT, height INT,
  manifest_path TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  PRIMARY KEY (video_id, rendition)
);
```

```
-- Watch history / resume (Cassandra)
CREATE TABLE watch_progress (
  user_id      uuid,
  video_id     uuid,
  position_s   int,
  updated_at   timestamp,
  device       text,
  PRIMARY KEY ((user_id), video_id)      -- partition by user: one-partition read
);                                        -- for "resume across all my videos"

CREATE TABLE watch_history (
  user_id      uuid,
  bucket       text,                      -- month bucket to bound partition size
  watched_at   timeuuid,
  video_id     uuid,
  PRIMARY KEY ((user_id, bucket), watched_at)
) WITH CLUSTERING ORDER BY (watched_at DESC);
```

Why Cassandra here and not Postgres: resume-position updates are a constant firehose (every player heartbeats position every ~10s for 100M users), the access pattern is strictly key-based (user_id), no transactions or joins needed, last-write-wins per cell is acceptable semantics for "where was I," and multi-datacenter active-active replication comes native. This is the canonical LSM/write-optimized workload. Bucketing history partitions by month prevents unbounded partition growth — mentioning partition-size hygiene is a senior Cassandra tell.

Blob layout for the origin (matters for CDN cache keys):

```
/videos/{video_id}/master.m3u8
/videos/{video_id}/{rendition}/playlist.m3u8
/videos/{video_id}/{rendition}/seg_00001.m4s   # immutable → Cache-Control: max-age=31536000
```

Segments are immutable once written — cache them forever; only manifests ever change (and for VOD, barely).

**Interview trap:** One database for everything. "Everything in DynamoDB" or "everything in Postgres" both fail follow-ups — the former on search and transactional status transitions, the latter on the watch-history write rate and multi-DC. The polyglot table with one-line justifications is the expected artifact — but each store must earn its operational cost, so keep the list to what the requirements force.

---

## Step 6: Deep dives

### Deep dive 1: Upload + transcoding pipeline (the DAG)

**Resumable upload.** A 50 GB file over residential internet WILL have its connection drop. Non-negotiable design:

- Client splits the file into chunks (8–64 MB). Protocol: **tus** (open resumable-upload protocol — offset-based PATCH with `Upload-Offset` tracking) or **S3 multipart upload** semantics (initiate → presigned `UploadPart` per chunk → complete with the part/ETag list). Same idea either way: **the unit of retry is the chunk, not the file.**

| | tus | S3 multipart (presigned) |
|---|---|---|
| Model | Sequential offset (PATCH from `Upload-Offset`) | Independent numbered parts, any order |
| Parallel chunks | Needs the concatenation extension | Native — parts upload concurrently |
| Server | You run a tus server (or a supporting proxy) | Blob store IS the server; zero upload infra |
| Resume mechanics | HEAD → current offset → continue | ListParts → missing part numbers → continue |
| Fit | Self-hosted, protocol-standardized clients | Cloud blob stores; the pragmatic default |
- Each chunk carries a checksum; failed/corrupt chunks are retried independently with exponential backoff + jitter; chunks can upload in parallel (3–5 concurrent fills a home uplink).
- Resume after a dropped connection = ask the server which parts it has (`ListParts` / tus HEAD for the offset), continue from there. 49 GB uploaded is 49 GB kept.
- Upload sessions expire (e.g. 7 days) with garbage collection of orphaned parts — at 3.6 PB/day of ingest, abandoned multipart uploads are real money (S3 lifecycle rule: abort incomplete multipart uploads).
- On complete: raw object lands in the blob store, metadata row transitions `uploading → processing`, and an **upload-complete event** goes to Kafka. The trigger is the event, not a poller.

**Transcoding as a DAG.** The naive design — one worker runs ffmpeg on the whole file — means a 4-hour 4K video takes many hours on one machine, and a crash at 95% restarts from zero. The scalable design parallelizes *within* one video:

```
                              ┌────────────────────────────────────────────┐
 probe (codec, duration,      │            per-rendition fan-out           │
 resolution, audio tracks)    │  seg_001 ─► [240p][360p]...[2160p]         │
        │                     │  seg_002 ─► [240p][360p]...[2160p]         │
        ▼                     │    ...       (each cell = one job on the   │
 split into ~2-10s            │  seg_NNN ─►   work queue)                  │
 GOP-aligned segments ───────►└───────────────────┬────────────────────────┘
        │                                         │
        ├──► audio extraction/encode (parallel)   ▼
        ├──► thumbnail generation      stitch / validate per rendition
        ├──► subtitle extraction/ASR              │
        ├──► content moderation                   ▼
        │    (frame sampling + audio)   package (CMAF/fMP4) + encrypt (DRM)
        │                                         │
        └───────────── all gates ────────────────►▼
                                        manifest generation (.m3u8 / .mpd)
                                                  │
                                                  ▼
                                        status → ready, publish event
```

- **Split on GOP (Group of Pictures) boundaries** — a GOP starts with a keyframe (IDR), so each segment is independently decodable and independently *encodable*. Split a 2-hour video into 2,000 segments → 2,000 × 8 renditions = 16,000 small jobs that run on 16,000 cores in parallel. Wall-clock transcode time collapses from hours to roughly the duration of the slowest segment × a few — minutes.
- **Retry per task, not per video.** Each cell in the fan-out is an idempotent job (input: source segment + rendition params; output: deterministic blob path — re-run overwrites harmlessly). One segment fails → retry that one 5-second encode with backoff, not the 4-hour video. This is the whole argument for the DAG shape.
- **Orchestration via a workflow engine** — Temporal / AWS Step Functions / an Airflow-style scheduler. What the engine buys you: durable execution state (a coordinator crash doesn't lose track of 16,000 in-flight jobs), per-task retry policies with backoff, timeouts and heartbeats per activity, visibility ("why is video X stuck?" → look at the workflow history), and clean expression of the fan-out/fan-in and the parallel branches (audio, thumbs, subtitles, moderation) that join before publish. Hand-rolling this with queues + a state table in a DB is a re-derivation of a workflow engine, minus the correctness — say that sentence.
- **Spot instances for the encode fleet.** Encoding is the perfect spot workload: stateless, chunked into minutes-long idempotent tasks, throughput-oriented. A spot reclamation (2-minute warning) kills a few segment jobs, which the workflow engine retries elsewhere. At 200–300k cores, spot pricing is the difference of tens of millions/year. Keep a small on-demand baseline for the latency-sensitive lane.
- **Priority lanes.** A MrBeast upload and a 3-viewer vlog should not share one FIFO queue. Priority queues (or weighted fairness) by predicted popularity: big creators' videos get the on-demand fast lane and full ladder immediately; long-tail uploads can wait out a queue and even get a reduced initial ladder (encode 360p/720p first so it's *playable* fast, backfill 4K/AV1 later — "progressive publishing").
- **Moderation as a gate:** a parallel DAG branch (sampled-frame classification + audio) whose result gates the `ready → public` transition. It's in the DAG so it overlaps encode time instead of adding to it.

**Codec ladder + trade-off table** (the "why multiple codecs" question):

| Codec | Compression (vs H.264) | Encode cost | Device support | Licensing | Use |
|---|---|---|---|---|---|
| H.264/AVC | baseline | 1× | ~universal (hardware decode everywhere) | Modest royalties | Compatibility floor — always encode |
| VP9 | ~30–40% better | ~5–10× | Broad (Chrome, Android, most TVs) | Royalty-free | Bandwidth saver for supporting devices |
| AV1 | ~45–50% better | ~10–50× (improving) | Growing (new SoCs, modern browsers) | Royalty-free | Top-viewed content only — encode cost amortizes over millions of views |

That last cell is the senior insight: **codec choice is an ROI calculation per video.** AV1's brutal encode cost is worth it for a video with 50M views (bandwidth savings dwarf compute) and absurd for a video with 12 views. YouTube does exactly this — re-encode into better codecs as view counts justify it.

Ladder (per codec, roughly): 240p/300k, 360p/700k, 480p/1.2M, 720p/2.5M, 1080p/5M, 1440p/10M, 2160p/18M + audio tracks (64/128/192k).

**Interview trap:** "A worker picks up the video and transcodes it." Singular worker, singular retry unit. The follow-ups — "4-hour 4K video?", "worker dies at 95%?", "how does the popular creator not wait behind 10,000 vlogs?" — all have the same answer, and it's the DAG. If your pipeline's retry unit is the whole video, you designed it wrong.

### Deep dive 2: Adaptive bitrate streaming (ABR)

**The delivery format.** Video is served as a **manifest + small immutable segments over plain HTTP**. No special protocol, no stateful streaming servers — that's the trick that makes CDNs work for video.

| | HLS | MPEG-DASH |
|---|---|---|
| Manifest | `.m3u8` (text playlist) | `.mpd` (XML) |
| Origin | Apple | MPEG standard |
| Device support | Everything Apple (mandatory on iOS Safari), plus ~everything else | Everything except native iOS Safari |
| Container | TS legacy → fMP4/CMAF | fMP4/CMAF |
| Low-latency variant | LL-HLS | LL-DASH/CMAF-CTE |
| Practical answer | Serve both from **one CMAF segment set** with two manifest flavors — segments (the expensive part) are shared |

**Playback flow:** player fetches the master manifest (lists renditions with bandwidth/resolution) → picks a starting rendition → fetches that rendition's segment playlist → fetches segments sequentially into a buffer → continuously reconsiders which rendition to fetch next. **The client, not the server, drives adaptation** — the server is a dumb file host. Scale falls out of that sentence.

What the manifests actually look like (be able to sketch this):

```
# master.m3u8 — the rendition menu
#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1280x720,CODECS="avc1.64001f,mp4a.40.2"
720p/playlist.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080,CODECS="avc1.640028,mp4a.40.2"
1080p/playlist.m3u8

# 720p/playlist.m3u8 — the segment list for one rendition
#EXT-X-TARGETDURATION:4
#EXTINF:4.0,
seg_00001.m4s
#EXTINF:4.0,
seg_00002.m4s
...
```

Two tiny text files plus immutable media segments — that's the entire "streaming protocol." A rendition switch is just the player fetching `seg_00042.m4s` from a different directory.

**How the client ABR algorithm decides**, mechanism not magic — two signals:

1. **Measured throughput:** EWMA of recent segment download rates → estimate of sustainable bandwidth → pick the highest rendition whose bitrate fits under it with headroom (~0.8×).
2. **Buffer occupancy:** seconds of video buffered ahead. Deep buffer (30s) → you can gamble on a higher rendition; a bad guess costs buffer, not a stall. Shallow buffer (<10s) → get conservative; near-empty → emergency-drop to lowest rendition, because **a rebuffer is worse for user experience than a resolution drop** (state this priority explicitly).

Throughput-only oscillates (estimate noise → flapping between renditions); buffer-aware algorithms (BOLA; hybrids like the throughput+buffer logic in dash.js/ExoPlayer) damp it. Add switch hysteresis (don't upgrade until estimate sustains for N segments) and cap by viewport (never fetch 4K for a 720p screen — pure waste).

**Why 2–6 second segments** — the trade-off both directions:

- **Shorter segments →** faster startup (first frame needs one segment; 2s segment at the wire beats 10s), finer-grained adaptation (rendition switch possible at every boundary, so you react to bandwidth changes in seconds), better live latency.
- **Longer segments →** fewer HTTP requests (per-request overhead, CDN request pricing), better encode efficiency (longer GOPs compress slightly better), fewer manifest refreshes for live.
- Industry equilibrium: **~2–6s** (Apple's historical guidance evolved from 10s toward 6s; DASH commonly 2–4s; low-latency modes chunk further via CMAF chunks). Also: **segment duration must be a multiple of GOP duration** — a switch is only decodable at a keyframe, which ties this directly back to the GOP-aligned splitting in Deep Dive 1. Connecting those two facts scores points.

**Startup latency budget** (the p95 < 2s NFR, decomposed): DNS+TLS to CDN (~100–300ms, amortized by connection reuse) → manifest fetch (~50ms edge hit) → first segment fetch (2s @ 3 Mbps ≈ 750 KB, ~300–800ms) → decoder spin-up. Tricks: start on a low rendition (fast first segment, upgrade after), inline the first segment hint, prefetch manifests on hover.

**Interview trap:** Saying "the server adjusts the quality based on the user's connection." The server adjusts nothing — it serves static files. Client-side adaptation is *the* architectural fact of ABR: it's what lets a dumb, infinitely-cacheable HTTP edge serve 25 Tbps. Getting the locus of control wrong reveals you haven't looked under the hood of a video player.

### Deep dive 3: CDN strategy — push (Netflix) vs pull (YouTube)

The 25 Tbps from Step 2 makes this the load-bearing component. Two proven philosophies:

**Netflix Open Connect (proactive push):**
- Netflix builds its own CDN: **Open Connect Appliances (OCAs)** — storage-dense cache servers deployed *inside ISP networks* (free to the ISP) and at IXPs. Member traffic to a Comcast subscriber is served from a box inside Comcast's network — it may never cross the public internet transit at all. ISPs accept the boxes because it slashes their transit costs too; win-win is the deal's engine.
- **Nightly proactive push ("fill windows"):** Netflix's catalog is small (~tens of thousands of titles) and demand is *predictable* (they know tomorrow's top titles per region — they commissioned them). During off-peak hours, OCAs are pre-loaded with the content predicted popular for their region. Result: cache hit ratios approaching ~100% during peak, no origin thundering herd on a big premiere — the premiere was pushed everywhere last night.
- Works because: small catalog × predictable demand × owned content. The control plane (steering clients to the right OCA via DNS/steering service) is Netflix's; the data plane lives in ISPs.

**YouTube-style pull-through caching:**
- Catalog is effectively infinite and demand is unpredictable (any video can go viral in an hour). You cannot pre-push what you cannot predict, and you cannot store an exabyte catalog at every edge.
- **Pull-through:** edge cache miss → fetch from upstream → cache with LRU/LFU-ish eviction. Popular content stays hot at the edge organically; the long tail is served from deeper tiers.
- **Tiered caching + origin shield:** edge POPs (hundreds) miss to regional mid-tier caches (tens) which miss to an **origin shield** — a designated cache layer in front of the origin that collapses concurrent identical misses into **one** origin fetch (request coalescing). Without it, a video going viral means every one of 300 edge POPs independently hammers the origin with the same segment requests at once — the classic cache-stampede. With coalescing, N concurrent requests for the same cold segment = 1 origin read.
- Segments being immutable makes all of this clean: cache-forever, no invalidation problem, cache key = URL.

| | Push (Open Connect) | Pull-through (YouTube-style) |
|---|---|---|
| Catalog fit | Small, curated | Infinite UGC |
| Demand | Predictable → pre-position | Unpredictable → cache on demand |
| Peak hit ratio | ~100% by construction | High for head, misses on long tail |
| Origin load | Near zero at peak | Shielded but real; coalescing required |
| Capex/effort | Own hardware + ISP relationships | Commodity CDN(s) or own POPs |
| First-viewer latency | Great (already there) | Cold-miss penalty for tail content |
| Hybrid reality | — | Pre-warm *predicted*-hot (trailers, subscriber-feed pushes) on top of pull |

**Access control:** **signed URLs** (expiring HMAC-signed manifest/segment URLs, validated at the edge — no auth callback to origin per request) for standard content. **DRM** for premium: content encrypted at packaging (CENC — common encryption, one encrypted asset, multiple DRM systems); player obtains decryption keys from a license server — **Widevine** (Google devices/browsers) and **FairPlay** (Apple) are the two you name, one line each, plus PlayReady for legacy TVs if pressed. Don't go deeper unless asked; signal you know it exists and where it plugs in (packaging step + license service).

**Interview trap:** "We'll put CloudFront in front of it" as the entire CDN answer. At 25 Tbps the CDN is the majority of your cost and your architecture: you owe the push-vs-pull analysis, tiering, origin shielding/request coalescing, and cache-key/immutability discipline. One sentence about CloudFront is a junior answer to the most senior part of this question.

### Deep dive 4: View counting at scale

**Why the naive answer dies.** `UPDATE videos SET view_count = view_count + 1` at 35–100k events/sec: every increment is a row lock + WAL write; for a viral video the increments all target **one row** — a single-row hotspot no sharding can fix (sharding distributes *different* keys; this is one key). Lock convoys, replication lag, and your metadata DB — which also serves playback — melts because of a *counter*. Counting must leave the transactional database.

**The pipeline:**

```
players ──batched beacons──► API edge ──► Kafka (topic: view-events,
                                                 keyed by video_id)
                                            │
                              ┌─────────────▼──────────────┐
                              │ Flink / Spark Streaming    │
                              │  - validity rules          │
                              │  - dedupe (session state)  │
                              │  - tumbling window (10s)   │
                              │    COUNT per video_id      │
                              └───────┬──────────┬─────────┘
                        live deltas   │          │  events → data lake
                                      ▼          ▼
                              Redis counters   batch reconciliation (hourly/daily
                              (approximate,    exact recount, fraud pass)
                               what users see)      │
                                      ▲             ▼
                                      └──corrects── durable counts (DB)
```

- **Client beacons, batched** (view_start / heartbeats / view_end), fire-and-forget `202` into Kafka. Playback never waits on analytics.
- **Stream aggregation (Flink):** consume keyed by video_id, apply validity + dedupe, aggregate **tumbling windows** (e.g. 10s) → emit `(video_id, +delta)` — turning 100k events/sec into a few hundred aggregated increments/sec. The DB-killing per-event write amplification is absorbed by windowing.
- **Approximate live vs exact reconciled — say this framing:** the counter users see is *approximately correct within seconds* (Redis, incremented by window deltas; Flink's exactly-once is still bounded by dedupe-rule fuzziness and late events); the *durable truth* is recomputed by batch jobs over the raw event log (data lake) with the full fraud pass, and corrections flow back. Approximate-fast + exact-slow, converging — the lambda-ish pattern, and precisely why YouTube counts famously freeze/adjust on viral videos (the reconciliation pass reclassifying views). Naming that observable behavior proves you understand the design.
- **View validity rules:** a view isn't a request. Typical: N seconds actually watched (~30s), dedupe repeated views per user/session within a window, discard impossible patterns (1000 views/min from one device, no heartbeat progression, headless UA fingerprints). Cheap rules inline in Flink (keyed session state); heavyweight fraud/botnet classification offline in reconciliation.
- **Unique viewers — HyperLogLog:** distinct-count of viewers per video/day exactly requires a per-video set (a viral video = hundreds of millions of user IDs = GBs *per video*). HLL gives cardinality with ~0.8% error in **~1.5 KB** fixed size, and HLLs **merge** (union = bucket-wise max) — so per-hour sketches roll up to per-day/per-week for free, and Redis ships it natively (`PFADD`/`PFCOUNT`/`PFMERGE`). Uniques are exactly the metric where approximate is obviously acceptable; knowing the right sketch is a senior signal.
- **Late/duplicate events:** clients retry beacons (idempotency: event_id dedupe in Flink state); offline devices flush hours-old events (event-time windows + allowed lateness; too-late events go to the reconciliation path rather than being dropped silently).

**Interview trap:** Reaching for "shard the counter into N rows and sum on read" as the final answer. It's a legitimate mid-scale trick (and fine to *mention*), but it still burns a DB write per view and does nothing for dedupe, validity, or uniques. The stream-aggregation pipeline solves all four at once — the counter-sharding answer signals you've read one blog post; the windowed-aggregation answer signals you've operated an event pipeline.

### Brief: metadata, search, resume, recommendations

- **Search:** metadata changes CDC'd from Postgres into Elasticsearch; index title/description/tags/transcript (ASR output from the pipeline — a nice cross-component detail); eventual consistency is fine (a video appearing in search 10s after publish is a non-event). Ranking = relevance × engagement signals.
- **Resume position:** the Cassandra `watch_progress` table from Step 5 — player heartbeats position every ~10s, last-write-wins, read one partition on "continue watching." Cross-device resume falls out for free since the key is user, not device.
- **Recommendations touchpoint — interface only:** the home feed calls a recommendation service: `GET /users/{id}/home` → ranked video_ids; inputs are watch history + engagement events (already flowing through Kafka — the same beacon stream feeds the feature pipeline); serving is candidate-generation → ranking behind that one API. In an HLD interview you own the *contract and the data feeds*, not the model. Explicitly bounding this scores better than a shallow ML digression.

---

## Step 7: Scale & evolve

- **Egress cost engineering:** at this scale the roadmap is bandwidth ROI — AV1 rollout for head content (encode cost amortized over view counts), per-title encoding (per-video ladders tuned to content complexity — animation needs far less bitrate than sports; Netflix pioneered this), viewport caps, deeper ISP embedding.
- **Storage lifecycle:** masters → Glacier-class after processing; long-tail renditions demoted or dropped (keep 360p/720p, re-transcode from master on demand if a dead video resurrects); dedupe re-uploads by content hash.
- **Live streaming (the big evolution):** ingest via RTMP/SRT → real-time encode (no DAG luxury — encode keeps up with the wall clock) → LL-HLS/CMAF chunked transfer → 3–10s glass-to-glass. Reuses delivery + counting; replaces the batch pipeline with an always-on one. DVR window = the same segment machinery with a sliding manifest.
- **Shorts/clips:** <60s videos invert assumptions — pre-fetch the *next* several videos entirely (feed is swipe-driven), startup budget ~0ms perceived, encode ladder smaller. Same platform, different tuning profile.
- **Multi-region:** metadata and counting pipelines active-active per region; blob storage replicated by policy (masters everywhere durable, renditions where watched); the CDN already made playback multi-region by nature.
- **Resilience culture:** dependency isolation on the playback path (playback must survive search, recs, and counting all being down — serve a cached home feed, play the video), load-shedding tiers, and chaos testing on the critical path — the Netflix operational lesson worth citing.

---

## Common follow-up questions

**Q: A video goes from 10 views/day to 10M views/hour in 20 minutes. Walk me through what happens.**
A: Edge POPs miss → tiered caches → origin shield coalesces the concurrent misses to single origin fetches per segment → within a minute or two the head segments are hot in every POP serving the traffic, hit ratio climbs toward ~100%, origin load returns to a trickle. Meanwhile the counting pipeline's Flink job sees one hot Kafka key — keyed aggregation with pre-aggregation (or key-splitting for the single hottest videos, merged downstream) keeps one hot key from stalling a partition. Nothing pages; that's the design working.

**Q: Where exactly can you lose a video, and how do you not?**
A: The only unrecoverable loss is the master. Chunked upload persists parts as they arrive; on `complete`, the object is in S3 (11 nines, cross-AZ) *before* we acknowledge and before the pipeline starts. Everything downstream — every rendition, manifest, thumbnail — is a derived artifact, reproducible from master + workflow definition. Durability problem = ingest acknowledgment discipline; everything after is availability, not durability.

**Q: Why not WebRTC / why HTTP for delivery?**
A: WebRTC is for sub-second interactive latency (calls, auctions) at the cost of stateful per-viewer sessions and no CDN cacheability. VOD wants the opposite trade: 10–30s of client buffer makes latency irrelevant, and HTTP file semantics make every segment cacheable by commodity infrastructure. Latency-tolerance is an *asset* — spend it on cacheability. (Live tightens this but LL-HLS still keeps HTTP semantics precisely to keep the CDN.)

**Q: Player at 4 Mbps measured throughput, 8s of buffer, current rendition 5 Mbps. What does a good ABR do?**
A: Downswitch now. Consumption (5 Mbps) exceeds supply (4 Mbps), so buffer is draining — 8s is below the safety threshold and trending to a stall. Pick the highest rendition under ~0.8 × 4 Mbps ≈ 3.2 Mbps → the 2.5 Mbps tier; the switch takes effect at the next segment boundary (why short segments help). Re-upgrade only after the estimate holds with hysteresis. Rebuffer avoidance outranks resolution — always.

**Q: How would you cut the transcoding bill in half?**
A: In order of leverage: (1) spot instances for the fleet if not already (~60–70%); (2) demand-tiered ladders — long-tail videos get 2–3 renditions initially, full ladder only on traction; (3) codec ROI discipline — AV1/VP9 only where view-amortized; (4) per-title encoding to cut bitrates (also an egress saver); (5) hardware encoders (or ASICs, as YouTube built with Argos) for the head. The senior part of the answer is that (2) and (3) are *policy* changes, not infrastructure work.

**Q: A creator uploads, sees "processing" for 45 minutes, and files a support ticket. How do you debug and how do you prevent?**
A: Debug: the workflow engine's execution history for that video_id shows exactly which DAG node is stuck — typically a segment-encode task in retry loop (poisonous input segment → after retry budget, route to DLQ and fail the rendition, not the video) or queue starvation (long-tail lane backed up behind a spike). Prevent: per-stage SLO metrics (p95 time-in-stage), queue-depth alarms per priority lane, progressive publishing so the video is *playable* at 360p while the rest of the ladder finishes — the ticket usually isn't "it's slow," it's "I can't see my video at all," and progressive publishing deletes that ticket class.

**Q: How do signed URLs work at the edge without calling your auth service per segment request?**
A: The origin/API signs the URL once at play-start: `path + expiry + optional claims`, HMAC'd with a key the CDN edge also holds. The edge validates the signature and expiry locally — pure computation, no callback, no state. Scope the signature to a path prefix (`/videos/v_abc/*`) so one signature covers the manifest and all segments of a session. Revocation is the trade-off: a signed URL is valid until expiry, so keep TTLs short (minutes to hours) and rotate keys; per-request revocation would reintroduce the origin callback you were avoiding.

**Q: Exactly-once view counting — possible?**
A: Not end-to-end, and pretending otherwise is a red flag. Clients retry beacons (duplicates at the source), and "a view" is itself a policy, not a fact. Achievable and sufficient: at-least-once transport + explicit dedupe (event IDs, session windows) + exactly-once *processing semantics inside* Flink (checkpointed state, transactional sinks) + batch reconciliation as the arbiter of durable truth. Approximate-fast, exact-slow, converging.

---

## What gets you rejected

1. **Video bytes through your API servers** — upload bodies or playback streams touching the app tier. The defining property of the architecture is that the data plane (blob store, CDN) and control plane (API) never mix. Miss this and nothing else you say recovers the interview.
2. **Whole-video transcode as one job.** No GOP splitting, no fan-out, retry unit = the entire video. Falls to the first follow-up about a 4-hour upload or a mid-encode crash.
3. **`view_count = view_count + 1`.** Or any design where per-view writes hit the transactional DB. The single-row hotspot question is scripted; the windowed-aggregation pipeline is the expected answer.
4. **"The server picks the bitrate."** Inverts the actual control model of ABR and implies stateful streaming servers — which contradicts the CDN story you need for 25 Tbps.
5. **One-sentence CDN.** "Add CloudFront" without push-vs-pull, tiering, origin shield/request coalescing, or the egress math that makes CDN the majority of system cost. The estimation *told* you where the problem is; ignoring your own numbers is worse than not computing them.
6. **No failure story in the pipeline.** Every ingest stage needs: retry unit, idempotency, backoff+jitter, DLQ, and a durable orchestrator. "The queue handles retries" is hand-waving — the same rejection class as backoff hand-waving in Lesson 4.5.
7. **Ignoring cost at stated scale.** Petabytes/day and 200k cores mean spot fleets, storage tiering, and codec ROI are architecture, not procurement trivia. A design that's correct but 5× the necessary cost is a failed *senior* design.
8. **Uniform treatment of head and tail.** Same encode ladder, same codec, same cache policy for a 50M-view video and a 5-view video. Popularity-skew awareness (priority lanes, progressive publishing, demand-tiered ladders, push-vs-pull) is the recurring theme of this problem; missing it everywhere is missing the problem.
9. **ML rabbit hole on recommendations.** Spending ten minutes on embedding models in an HLD interview signals you can't scope. Own the interface and the data feeds; name candidate-generation → ranking; move on.
10. **No consistency labels.** Which parts are strongly consistent (metadata status transitions, upload completion) vs eventual (search index, view counts, watch history sync)? Seniors label every arrow; describing boxes without guarantees is architecture theater.
