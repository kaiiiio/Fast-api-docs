# Lesson 4.8 — Design Google Drive

> Module: System Design (HLD) | Level: Senior | FDE Prep Phase 4

File sync (Drive/Dropbox) looks like a storage problem and is actually a *metadata and reconciliation* problem. Anyone can put bytes in S3; the interview is won on chunking and dedup, the metadata/blob split, the sync protocol (cursors, journals, notification channels), and what happens when two offline laptops edit the same file. Storage is the easy 20%; this walkthrough spends the time where interviewers do.

## Step 1: Requirements (functional + non-functional)

### Clarifying questions you should ask (and why)

| Question | Why it matters |
|---|---|
| "Sync client (desktop) or just web upload/download?" | The desktop sync client is what makes this hard: local watchers, offline edits, conflict resolution, delta sync. Web-only is a much smaller problem. Agree: full sync client. |
| "Collaborative real-time editing (Google Docs) in scope?" | No — that's OT/CRDT territory, a different system. We sync *arbitrary binary files*. One paragraph of contrast later, no more. |
| "Max file size? Typical file size?" | Drives chunk size, resumable-upload design, and whether metadata rows per file explode. Agree: up to 50GB per file, typical 1-5MB. |
| "How fast must a change on device A appear on device B?" | Near-real-time (seconds) means a push notification channel, not polling. Agree: < 10s when both online. |
| "Sharing and permissions in scope?" | Yes at HLD level (ACLs, share links); enterprise features (DLP, audit) out. |
| "Version history and trash?" | Yes — and it materially changes the data model (versions are chunk-list snapshots; deletes are tombstones, not row deletes). |
| "Client-side (end-to-end) encryption?" | Discuss as a trade-off — it kills dedup. Default: server-side encryption at rest. |

**Interview trap:** Not asking about the sync client vs web-only. If you design a web upload service and the interviewer wanted Dropbox, you've solved the wrong problem for 45 minutes. This single question sets the difficulty level — ask it first.

### Agreed functional requirements

1. Upload/download files from any device; folder hierarchy with rename/move.
2. Desktop client auto-syncs a designated folder; changes propagate to all devices in seconds.
3. Offline edits sync on reconnect; conflicts never silently lose data.
4. File version history (restore prior versions); trash with restore window (30 days).
5. Sharing: user-to-user permissions and tokenized share links.
6. Quota per user (e.g., 15GB free tier).

### Non-functional requirements

- **Durability is the headline number: 99.999999999% (11 nines) on file content.** Users forgive slow sync; they never forgive a lost file.
- Availability 99.9%+ for the metadata plane; upload path can degrade gracefully.
- **Strong consistency for metadata** (a committed file version is immediately visible to a subsequent read); eventual consistency *between devices* is inherent — the design manages it rather than pretending it away.
- Scale: 500M users; bandwidth-efficient sync (users on hotel Wi-Fi editing 1GB PSDs must not re-upload 1GB per save).

**Interview trap:** Claiming "eventual consistency is fine for everything." Metadata commits must be strongly consistent — if device B reads the namespace after device A's commit and doesn't see it, your cursor/journal protocol breaks and clients loop. The eventual part is *device convergence*, and it's handled explicitly by the sync protocol, not waved at.

## Step 2: Estimation

**Users and storage:**
- 500M registered users, avg 5GB stored → 2.5 EB logical. Assume ~20% active daily (100M DAU).
- **Dedup + compression savings ~30-40%** (OS files, shared media, forwarded attachments, re-uploaded content) → ~1.6 EB physical before replication. With erasure coding (~1.5x overhead, vs 3x for plain replication) → **~2.4 EB raw**. Say "erasure coding, not 3x replication" — at exabyte scale that difference is a datacenter.

**Chunk metadata scale (the number candidates miss):**
- 4MB chunks → 2.5 EB ÷ 4MB ≈ **625 billion chunk references**. Each ref ≈ 32B hash + ~30B bookkeeping ≈ 60-70B → **~40 TB of chunk metadata alone**. Conclusion: the chunk index is itself a distributed system (sharded KV), not a table in your Postgres. This one calculation justifies half the architecture.

**Traffic:**
- 100M DAU × ~10 file operations/day ≈ 1B metadata ops/day ≈ 12k/s average, ~50k/s peak. Metadata QPS is modest; *storage bandwidth* is the big pipe.
- Uploads: say 100M DAU × 50MB/day changed ≈ 5 PB/day ingest ≈ 60 GB/s average — but delta sync means only *changed chunks* upload, cutting real ingest by 5-10x for edited files.
- Notification channel: 100M online devices holding long-poll/WebSocket connections — a connection-fanout tier of its own (~100k connections per node → ~1,000 nodes).

**Journal growth:** 1B changes/day × ~200B/entry ≈ 200 GB/day of change-journal — fine, and it's per-namespace and prunable after all devices pass a cursor.

## Step 3: API design

```
# --- Upload (two-phase: chunks first, commit last) ---
POST /v1/files/prepare-upload
  req:  { namespace_id, path: "/Work/deck.pptx", size, chunk_hashes: ["sha256:ab..", ...] }
  resp: { upload_id, missing_chunks: ["sha256:ab.."],          # dedup: server already has the rest
          upload_urls: { "sha256:ab..": "https://presigned..." } }

PUT  {presigned_url}                                            # raw chunk bytes to blob store
  headers: Content-MD5 / checksum trailer

POST /v1/files/commit
  req:  { upload_id, namespace_id, path, chunk_hashes: [...],   # full ordered manifest
          base_version: 41 }                                    # what the client edited on top of
  resp: 200 { file_id, version: 42 }
      | 409 { error: "VERSION_CONFLICT", head_version: 43 }     # triggers conflicted-copy flow

# --- Sync ---
GET  /v1/namespaces/{ns}/changes?cursor=8842190
  resp: { entries: [ { path, type: ADD|MODIFY|DELETE|MOVE, file_id, version,
                       chunk_hashes?, from_path?, tombstone? } ],
          cursor: 8842305, has_more: false }

GET  /v1/notifications/subscribe        # long-poll (30s) or WebSocket
  resp: { changed_namespaces: ["ns_123"] }        # signal only — "come sync", no payload

# --- Download ---
GET  /v1/files/{file_id}?version=42
  resp: { chunk_hashes: [...], download_urls: {hash: presigned_url} }

# --- Sharing ---
POST /v1/files/{file_id}/permissions     { grantee: "bob@x.com", role: "editor" }
POST /v1/files/{file_id}/links           { role: "viewer", expires_at? } -> { token_url }
POST /v1/files/{file_id}/restore         { version: 41 }        # version restore = new head pointing at old manifest
```

Design notes worth saying out loud:
- **Chunks upload via presigned URLs directly to blob storage** — file bytes never transit your metadata service. Meta plane and data plane scale independently.
- **`prepare-upload` returns `missing_chunks`** — dedup happens *before* bytes move. Re-uploading a file the server has costs one metadata round trip and zero bandwidth.
- **`commit` carries `base_version`** — this is the conflict-detection mechanism (Deep dive 6.4). The server is a compare-and-swap on the file head.
- **`changes` + `cursor` is the entire sync read path.** No "list my whole tree and diff" — that's O(files); cursors are O(changes).

**Interview trap:** An API where `POST /files` takes the file body as multipart upload into the application server. At 60 GB/s ingest, your app tier is now a very expensive proxy. Presigned direct-to-blob upload is table stakes for this design.

## Step 4: High-level architecture

```
 Desktop client                        ┌─────────────────────────────────────┐
 ┌───────────────┐                     │           API Gateway               │
 │ FS watcher    │──── metadata ──────►│  (authn, quota check, rate limit)   │
 │ (inotify/     │      ops            └──────┬──────────────────┬───────────┘
 │  FSEvents)    │                            │                  │
 │ Local index   │                    ┌───────▼───────┐  ┌───────▼────────────┐
 │ (hash tree +  │                    │ Metadata Svc  │  │ Notification Svc   │
 │  cursor)      │                    │ file tree,    │  │ long-poll/WS fanout│
 │ Chunker       │                    │ versions, ACL │  │ "ns changed, sync" │
 └──────┬────────┘                    └──┬─────────┬──┘  └───────▲────────────┘
        │ chunk PUT/GET                  │         │             │ publish
        │ (presigned)                    │         └── append ───┼───────────┐
        ▼                        ┌───────▼────────┐      ┌───────┴────────┐  │
 ┌───────────────┐               │ Metadata DB    │      │ Change Journal │◄─┘
 │  Blob Store   │               │ (sharded       │      │ (append-only,  │
 │  S3/GCS       │               │  Postgres/     │      │  per namespace,│
 │  content-     │               │  Spanner-class)│      │  cursor = seq) │
 │  addressed:   │               └────────────────┘      └────────────────┘
 │  key=sha256   │               ┌────────────────┐      ┌────────────────┐
 │  hot/IA/      │               │ Chunk Index    │      │ GC / Refcount  │
 │  Glacier tiers│◄── lifecycle──│ (sharded KV:   │      │ workers (async,│
 └───────────────┘               │ hash→refcount, │      │ grace period)  │
                                 │ location, size)│      └────────────────┘
                                 └────────────────┘
```

Component walkthrough:

- **Client** (a real distributed-systems node, not a dumb terminal): FS watcher detects changes; local index stores per-file chunk hashes + the namespace cursor; chunker splits/hashes; uploader talks presigned URLs; sync engine runs the reconciliation loop.
- **Metadata Service:** owns the namespace — tree operations, version commits (the CAS), ACL checks on *every* operation, quota accounting. The hard, stateful heart.
- **Metadata DB:** sharded by `namespace_id` (a user's private space, or a shared folder = its own namespace — Dropbox's trick, see Step 7). Strong consistency within a namespace shard.
- **Change Journal:** append-only per-namespace log; monotonically increasing sequence = the cursor. The sync protocol *is* this journal.
- **Notification Service:** holds millions of idle connections; delivers one bit ("something changed") — payloads always flow through the journal, so a lost notification is only a latency bug, never a correctness bug.
- **Chunk Index:** hash → {refcount, storage location, size}. Sharded KV (Bigtable/DynamoDB-class) — remember: ~40 TB, 625B entries.
- **Blob Store:** S3/GCS, content-addressed (key = SHA-256), erasure-coded, lifecycle-tiered.
- **GC workers:** reap unreferenced chunks asynchronously with a grace period (Deep dive 6.2).

## Step 5: Data model

### Metadata DB (sharded relational — Postgres per shard, or Spanner-class if cross-shard moves must be transactional)

```sql
CREATE TABLE nodes (                       -- files AND folders, one tree table
  node_id      UUID PRIMARY KEY,
  namespace_id UUID NOT NULL,              -- shard key
  parent_id    UUID,                       -- adjacency list (see 6.2 discussion)
  name         TEXT NOT NULL,
  kind         TEXT NOT NULL,              -- FILE | FOLDER
  head_version BIGINT,                     -- FILEs only: pointer to current version
  is_deleted   BOOLEAN NOT NULL DEFAULT false,   -- tombstone, not row delete
  deleted_at   TIMESTAMPTZ,
  UNIQUE (namespace_id, parent_id, name)   -- no duplicate names in a folder; also the rename CAS
);
CREATE INDEX idx_nodes_parent ON nodes (namespace_id, parent_id);   -- folder listing

CREATE TABLE file_versions (               -- immutable; a version IS an ordered chunk list
  node_id      UUID NOT NULL,
  version      BIGINT NOT NULL,
  size         BIGINT NOT NULL,
  chunk_hashes BYTEA[] NOT NULL,           -- ordered SHA-256 list = the manifest
  created_by   UUID, created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (node_id, version)
);

CREATE TABLE journal (                     -- the sync backbone
  namespace_id UUID NOT NULL,
  seq          BIGINT NOT NULL,            -- per-namespace monotonic; THE cursor
  node_id      UUID NOT NULL,
  op           TEXT NOT NULL,              -- ADD|MODIFY|DELETE|MOVE
  payload      JSONB NOT NULL,             -- path, version, from_path...
  created_at   TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (namespace_id, seq)
);

CREATE TABLE acl (
  node_id  UUID NOT NULL, grantee_id UUID NOT NULL,
  role     TEXT NOT NULL,                  -- owner|editor|viewer
  PRIMARY KEY (node_id, grantee_id)
);

CREATE TABLE share_links (
  token      TEXT PRIMARY KEY,             -- 128-bit random, unguessable
  node_id    UUID NOT NULL, role TEXT NOT NULL,
  expires_at TIMESTAMPTZ, password_hash TEXT
);
```

### Chunk Index (sharded KV, keyed by hash)

```
key:   sha256 (32B)
value: { refcount: int, size: int, storage_class: HOT|IA|GLACIER,
         created_at, last_deref_at }       # last_deref_at drives GC grace period
```

Why this split: file *content* is immutable and content-addressed → object store (cheap, 11-nines durable, erasure-coded). File *structure* is mutable and transactional → relational DB with per-namespace strong consistency. A version being an **ordered list of chunk hashes** is the load-bearing idea: editing 1MB of a 1GB file creates a new version that shares ~99.6% of its chunk list with the old one — versions are nearly free, delta sync falls out naturally, and dedup is just "the hash already exists."

**Interview trap:** Making `file_versions` store bytes, or making versions diffs-of-diffs that require replay to reconstruct. Versions as immutable chunk-hash manifests means any version is directly fetchable and restore is a metadata-only operation (new head pointing at an old manifest).

## Step 6: Deep dives

### 6.1 Chunking and deduplication

**Why chunk at all:** resumable uploads (retry one 4MB chunk, not one 50GB file), parallel transfer, dedup granularity, and delta sync (only changed chunks move).

**Fixed-size chunking (Dropbox-style, 4MB):** split every 4MB, SHA-256 each chunk, the hash is the chunk's identity and its storage key (content addressing). Simple, fast, predictable.

**The insert-one-byte problem.** Insert a single byte at offset 100 of a file: every fixed 4MB boundary after offset 100 shifts by one. Every subsequent chunk's content — and therefore its hash — changes. A 1-byte edit re-uploads the entire remainder of the file. Fixed chunking only dedups edits that *don't shift data* (in-place overwrites, appends).

**Content-defined chunking (CDC, Rabin fingerprinting).** Slide a window (e.g., 48 bytes) over the file computing a rolling hash (Rabin polynomial — O(1) to slide by one byte). Declare a chunk boundary wherever `hash % 2^13 == 0` (avg chunk ~8KB... tune divisor for avg 1-4MB; enforce min/max chunk sizes to bound pathological inputs). Boundaries are now determined by *content*, not offset: insert one byte and boundaries re-synchronize within a chunk or two — only 1-2 chunks change hash. This is how rsync/borg/restic and modern sync engines get shift-resistant dedup.

| | Fixed 4MB | Content-defined (Rabin) |
|---|---|---|
| CPU cost | one SHA-256 pass | rolling hash + SHA-256 (~2-3x CPU) |
| Insert-shifted edits | re-upload rest of file | 1-2 chunks re-upload |
| Chunk size variance | exact | variable (bound with min/max) |
| Implementation | trivial | subtle (boundary tuning, pathological data) |
| Who uses it | Dropbox (4MB fixed) | rsync, restic, borg, some sync engines |

Defensible answer: **fixed 4MB as the default** (Dropbox shipped a decade on it; most real edits are full-rewrites by apps anyway — Office apps rewrite the whole file on save), with CDC as the noted upgrade for append/insert-heavy workloads. Knowing *why* each choice is defensible matters more than the pick.

**Dedup levels — and why cross-user dedup is a trap with teeth:**
- *Within-user:* same chunk in two of your files → stored once. Safe, always do it.
- *Cross-user:* the same viral video uploaded by 10M users → stored once globally. Massive savings (this is where the 30-40% comes from) but:
  1. **Hash-reveal side channel:** if the client asks "do you already have sha256:X?" and skips upload when yes, an attacker can *test whether any specific file exists on the service* by offering its hash and watching bandwidth (the "confirmation of file attack" — real papers on Dropbox circa 2011). Mitigation: always upload (costly), or require proof-of-possession of the full content before granting a dedup reference, or only dedup server-side after receipt.
  2. **Legal takedown fan-out:** one physical chunk backs N users' files. A DMCA/CSAM takedown of the chunk affects every referencing file across unrelated accounts; conversely you must be able to sever one user's *reference* without touching others'. Your GC/refcount layer just became a legal-compliance system.
  These are why several providers dedup **per-account only** — say this and you sound like you've read incident reports, not blog posts.

**Delta sync:** client's local index knows the previous version's chunk hashes; after an edit it re-chunks, diffs hash lists, and `prepare-upload` returns which of the changed chunks the server lacks. A 5MB edit to a 1GB file moves ~5MB.

**Compression before encryption — order is law.** Encrypted bytes are indistinguishable from random and compress to nothing. Pipeline per chunk: `chunk → compress (zstd) → encrypt (server-side at rest) → store`. Also: hash the *plaintext* chunk for identity (dedup works), encrypt with per-chunk keys derived server-side. (Client-side E2E encryption flips all this — see Step 7.)

**Interview trap:** Proposing per-file dedup ("hash the whole file"). Whole-file dedup catches exact duplicates only; the value is in *chunk-level* dedup and delta sync. If your unit of identity is the file, every save of a 1GB file is a 1GB upload.

### 6.2 Metadata vs blob split — and why metadata is the hard part

Blobs are a solved problem: immutable, content-addressed, S3 + erasure coding, done. Everything difficult lives in metadata: transactional tree mutations, rename/move semantics, version commits (CAS), ACL checks, journal appends — all needing strong consistency per namespace, at 50k ops/s, across 500M namespaces.

**Folder hierarchy modeling** — know all three, pick one:

| | Adjacency list (`parent_id`) | Materialized path (`/a/b/c` column) | Closure table (ancestor↔descendant rows) |
|---|---|---|---|
| List folder | one indexed query | prefix `LIKE` query | join |
| Move a folder of 100k descendants | **update 1 row** | rewrite 100k path strings | rewrite up to O(n×depth) rows |
| Full path of a node | walk up (or cache) | free | join |
| "Is X inside Y?" (ACL inheritance) | walk up | prefix check, free | one row lookup |
| Write amplification | minimal | brutal on move | brutal on move |

Pick **adjacency list**: move/rename is the operation users do constantly and it must be O(1) — a folder move is `UPDATE nodes SET parent_id = $new WHERE node_id = $x`, one row, one journal entry (`MOVE`), regardless of subtree size. Pay for it on path resolution (cache node→path in the client and in a server-side cache, invalidated via the journal). Materialized paths make the common write catastrophic to speed up a read you can cache. Say the trade that directly.

Rename/move semantics that bite: the `UNIQUE (namespace_id, parent_id, name)` constraint is your atomic rename arbiter — two devices renaming different files to the same name in the same folder race at the DB, one gets 409, and the client auto-renames ("file (2)"). Moving a folder *into its own descendant* creates a cycle — validate ancestry server-side inside the transaction.

**Garbage collection of unreferenced chunks.** A chunk is garbage when no `file_versions` row references it (versions pruned, files purged from trash, upload abandoned). Two schemes:

| | Refcounting | Mark-and-sweep |
|---|---|---|
| Detect garbage | immediate (count hits 0) | periodic full scan of 625B refs |
| Cost profile | +1/-1 KV update per ref change | massive batch job, days per pass |
| Failure mode | count drift (bugs, partial failures) → leaked or **prematurely deleted** chunks | scan is self-healing, always correct |
| Races | delete while a commit is in flight | mark phase must snapshot consistently |

Choose **refcount + async GC with a grace period**, backstopped by an occasional sweep. Mechanics: commits/deletes adjust refcounts transactionally with the metadata change (outbox pattern — refcount deltas are events, applied idempotently to the KV). When a count hits 0, do **not** delete: stamp `last_deref_at` and let a GC worker delete only after a grace period (e.g., 7 days) *and* a recheck. The grace period absorbs: in-flight uploads that were about to reference the chunk, refcount bugs, trash restores, and legal holds. Premature chunk deletion is the one bug class that violates your 11-nines promise, so GC is deliberately slow and paranoid; a periodic mark-and-sweep audit repairs drift. Storage leaked for a week is pennies; a lost chunk is a lost file.

**Interview trap:** Deleting chunks synchronously when refcount hits zero. One refcount bug (and you will have one — partial failure between metadata commit and KV update) silently corrupts user files months later when someone opens an old version. Grace period + recheck + sweep audit is the answer interviewers are fishing for.

### 6.3 The sync protocol

The client is a replica; the protocol is replication. Three legs: detect locally, learn remotely, reconcile.

**Detect locally.** OS file watcher (inotify on Linux, FSEvents on macOS, ReadDirectoryChangesW on Windows) feeds a debounced queue (editors write temp files and rename — wait for quiescence, ~2s). Watchers drop events under load and miss everything while the app is closed, so on startup and periodically: **full scan reconciliation** against the local index (per-file: size + mtime fast-path, re-hash only on mismatch). The local index is a SQLite DB: `path → {node_id, version, chunk_hashes, content_hash}` — effectively a per-file hash tree the client compares against both disk and server state. Never trust the watcher alone.

**Learn remotely — journal + cursor.** The server keeps an **append-only change journal per namespace** with a monotonic sequence. The client persists its cursor and asks `GET /changes?cursor=N` → entries N+1..M, new cursor M. Properties that make this the right shape: resumable from any point (crash-safe), O(changes) not O(tree), order-preserving (a MOVE arrives after the ADD it depends on), and it doubles as the cache-invalidation and notification-recovery mechanism. Journal entries are prunable once every registered device's cursor has passed them (with a horizon — a device offline 6 months past the horizon does a full resync).

**Don't poll — get poked.** 100M devices polling `/changes` every 5s = 20M QPS of "nothing changed." Instead each device holds a **long-poll (or WebSocket) connection to the notification service**; when a commit appends to a namespace's journal, the notifier pushes one content-free bit: "namespace X changed." The device then syncs through the normal journal path. Because the notification carries no data, it can be lossy, duplicated, or coalesced with zero correctness impact — reconnect-and-sync covers every gap. This is exactly Dropbox's design (their notify endpoint held ~millions of long-polls per node cluster). Connection tier: ~100k idle conns/node, ~1,000 nodes, routing table `device → notifier node` in Redis.

**Upload flow — two-phase, metadata commits last:**

```
1. chunk + hash locally
2. POST prepare-upload (all hashes)      ──► server: which chunks are missing?
3. PUT missing chunks to blob store          (parallel, resumable per chunk,
                                              checksum-verified on receipt)
4. POST commit (manifest + base_version) ──► server, atomically:
        - CAS: head_version == base_version, else 409
        - insert file_versions row
        - bump chunk refcounts (outbox)
        - append journal entry  ──► triggers notification fanout
```

The invariant: **a version becomes visible only when every chunk it references is durably stored.** A crash after step 3 leaves orphan chunks (GC's grace period reaps them); a crash never leaves a visible version with missing bytes. Resumability is free — re-run prepare, it lists what's still missing. Commit is idempotent via `upload_id`.

**Politeness features to name (one line each):** bandwidth throttling with auto-tune (sync must lose to the user's video call); **LAN sync** — peers on the same LAN fetch chunks from each other (chunk hash = integrity check, so peers are untrusted pipes; office of 50 people syncing one 2GB file pulls it over the WAN once); battery/metered-connection awareness on mobile.

**Interview trap:** "Devices poll every 30 seconds for changes." You've just designed 100M devices × 2 QPM of empty polls and 30s median sync latency. Journal-cursor + push-to-poke is the canonical pattern; not knowing it here is like not knowing consistent hashing in a cache question.

### 6.4 Conflict resolution

**Why no locks:** devices are offline for hours; a lock held by a sleeping laptop blocks everyone. Lock-free means conflicts are inevitable, so the system's job is to *detect them reliably and never lose either side*.

**Why last-writer-wins is disqualifying:** Alice and Bob both edit `budget.xlsx` offline. Both reconnect. LWW keeps whoever synced second and *silently destroys* the other's afternoon of work. In a file system, LWW is a data-loss policy with a euphemism for a name.

**Detection: version CAS at commit.** Every commit carries `base_version` — "I edited on top of version 41." Server rule: if `head_version == base_version`, accept as version 42; else **409 conflict**. This is a compare-and-swap on the file head, and it detects *every* concurrent edit with no clocks, no vector-clock machinery per se — the per-file version number is a degenerate (single-writer-server) version vector, which is all you need when one server serializes commits per file.

**Resolution: conflicted copies, not merges.** On 409, the client does not retry-overwrite. It: (1) syncs down the new head (version 43) to the original path, (2) commits its own local content as a **new sibling file**: `budget (Alice's conflicted copy 2026-07-04).xlsx`, (3) surfaces both to the user. Nothing is lost; a human resolves. **Why Dropbox chose this over merging:** the service syncs *arbitrary opaque binaries* — a PSD, a SQLite DB, a zip. There is no general merge function for arbitrary bytes; a "smart" merge of a binary is corruption. Conflicted copies are the only universally safe policy.

**Contrast (one paragraph, then move on):** Google Docs avoids this because it isn't syncing opaque files — it operates on a *structured document model* where every edit is a typed operation ("insert char at pos 12"), so Operational Transformation (or CRDTs) can transform/commute concurrent operations into one converged state. That works precisely because the data type is known and operations are semantic. Drive-the-file-store and Docs-the-editor are different systems with different consistency machinery; conflating them in the interview is a red flag.

**Offline queue and replay.** Offline edits accumulate in the client's local journal (ordered ops: edit, rename, move, delete). On reconnect: first pull server changes (advance cursor), rebase local ops onto the new state, then replay — each edit-commit doing its CAS, each conflict spawning a conflicted copy. Ordering matters: pulls before pushes, creates before moves that depend on them.

**Rename/move + edit races.** Alice renames `a.txt → b.txt`; Bob (offline) edits `a.txt`. Key design choice: identity is the **node_id, not the path**. Bob's commit targets node_id N with base_version — it lands cleanly on the renamed file; the rename and the edit *compose* instead of conflicting. Path-keyed designs turn every rename into a spurious delete+create and manufacture conflicts. Two same-folder renames to the same name race at the DB unique constraint; loser auto-renames. Move-into-deleted-folder: the move arrives via journal ordering after the tombstone → client resurrects the file into the parent's nearest live ancestor (or trash) — pick a policy, state it.

**Tombstones — why you can't hard-delete.** If deleting a file removed its row, a device syncing later would see... nothing. No journal entry to fetch a payload for, no way to distinguish "deleted" from "I never had it" — and worse, an offline device could *re-upload* the file, resurrecting it (the classic zombie-file bug). So delete = set `is_deleted`, append a DELETE journal entry, keep the row. Every device learns of the deletion through its cursor. Tombstones also power **trash/restore**: content (chunk manifest) is retained for the 30-day window — restore is flipping the tombstone and appending an ADD journal entry. Physical purge (version rows removed, refcounts decremented, GC eventually reaps chunks) happens only after the trash window *and* after the journal horizon guarantees all devices have seen the tombstone.

**Interview trap:** "On conflict, we merge the changes." Merge *what*? The moment you say merge for arbitrary files, the interviewer asks how you merge two edits to a JPEG, and the design collapses. Conflicted copies for opaque files, OT/CRDT only for structured docs — hold that line.

## Step 7: Scale & evolve

**Shard by namespace, and make shared folders their own namespace.** A user's private tree = one namespace = one shard = single-shard transactions for every operation. A shared folder becomes a *separate namespace* that is "mounted" into each member's tree — so 1,000 collaborators on one folder all hit that folder's shard/journal, not each other's, and membership changes are mount/unmount metadata ops. This is Dropbox's actual model and it answers the "what about a folder shared with the whole company?" follow-up before it's asked. Hot namespace (10k-person shared folder) → its journal is append-only and cache-friendly; reads scale with replicas.

**Storage tiering.** Access skews brutally: most bytes are written once and never read. Lifecycle policies on the content store: hot (S3 Standard) → infrequent access (S3 IA after ~30 days without reads) → cold (Glacier for old versions / trash beyond the window). Old *versions* are the ideal Glacier tenant — retrieval latency of minutes is acceptable for "restore the March version." At 2.4 EB raw, moving 60% of bytes from ~$0.023 to ~$0.004/GB-month is a nine-figure annual difference; say the arithmetic.

**Client-side (end-to-end) encryption — the honest trade-off table:**

| | Server-side encryption (default) | Client-side E2E |
|---|---|---|
| Provider can read content | yes (subpoena, insider risk) | no |
| Cross-user dedup | works | **dead** (same plaintext → different ciphertext per user key) |
| Delta sync | works | degraded (needs convergent/deterministic encryption tricks, which reopen the hash side channel) |
| Server-side features (preview, search, virus scan) | work | dead or client-side only |
| Key loss | provider recovers | **user loses everything** |

Convergent encryption (key = hash of plaintext) restores dedup under E2E but reintroduces the confirm-a-file side channel — a genuinely unsolved tension; naming it is senior signal. Product answer: E2E as an opt-in vault for the sensitive 1%, server-side for the rest.

**Quota enforcement:** counted against *logical* size (dedup savings are the provider's margin, not the user's). Check at `prepare-upload` (reject early, before bytes move), reconcile exactly at commit. Over-quota → reads/sync-down still work, uploads 402 — never hold existing files hostage.

**Evolution:** metadata DB per-shard Postgres → Spanner-class when cross-namespace transactions (moves between shared folders) hurt; add server-side preview/thumbnail pipeline (async workers off the journal); search index (also a journal consumer — the journal quietly becomes your CDC bus for every downstream feature, which is the architectural payoff to point at).

## Common follow-up questions

**Q: How does a brand-new device do its first sync efficiently?**
A: Not by replaying years of journal. Bootstrap = snapshot: fetch the current tree (paginated) + current cursor, then journal from there. Snapshot + log tail — the same pattern as any replica bootstrap.

**Q: Two devices upload the identical new file simultaneously — what happens?**
A: Chunk uploads dedup at the blob layer (same content address; second PUT is a no-op or skipped at prepare). Metadata: both commit; same path → unique constraint serializes them — first wins, second gets 409 and, seeing identical content hash, treats it as already-synced rather than a conflict. Idempotence via content addressing.

**Q: How do you prevent a corrupted chunk from silently propagating?**
A: End-to-end checksums: client sends chunk hash; blob store verifies on receipt (checksum trailer); downloads verify against the manifest hash before writing to disk; background scrubbers re-verify stored chunks against their content address (the key *is* the checksum — content addressing gives you integrity for free). A failed scrub triggers repair from erasure-code parity.

**Q: What exactly does the notification service guarantee?**
A: Almost nothing, deliberately — at-most-once, unordered, content-free hints. All correctness lives in the journal+cursor pull path; notifications only reduce latency. This is why the notifier can be a simple, massively-connected, lossy tier instead of a delivery-guaranteed message bus.

**Q: How are share-link permissions enforced on the download path if presigned URLs go straight to S3?**
A: The metadata service performs the ACL check and only *then* mints short-TTL (minutes) presigned URLs scoped to specific chunk keys. Revoking a share stops new URL minting immediately; outstanding URLs age out in minutes. If that window is unacceptable, front chunks with a CDN/edge that validates a signed token per request.

**Q: How would you sync a 50GB file over a flaky connection?**
A: It's already solved by the chunk design: per-chunk resumability (prepare returns what's still missing), parallel streams with congestion control, and on interruption you resume at chunk granularity — worst case you lose one 4MB chunk of progress. Add per-chunk checksums so a corrupted retry is detected immediately.

**Q: Why not store small files inline in the metadata DB and skip chunking?**
A: Legit optimization — files under ~64-256KB (a huge fraction *by count*, tiny by bytes) can inline in the version row or a small-blob store, saving a blob round trip per tiny file. Keep the manifest abstraction identical (a one-chunk manifest) so nothing upstream changes. Mentioning the count-vs-bytes skew is the senior detail.

**Q: What breaks first at 10x scale?**
A: Chunk-index KV throughput (refcount deltas are the hottest write path — batch and coalesce them), notification connection tier (linear in devices — scale nodes horizontally), and journal storage for hyperactive shared namespaces (prune aggressively past device horizons). Metadata QPS scales with shard count and stays fine; blob storage scales with money.

## What gets you rejected

- **Uploading file bytes through your application servers.** Data plane through the meta plane. Presigned direct-to-storage or you've built an exabyte proxy.
- **Whole-file identity** — no chunking, or hashing only entire files. Every save re-uploads everything; versions cost full copies; the design misses the point of the problem.
- **Last-writer-wins conflict handling.** In a file-sync interview this is the single fastest rejection: you volunteered a silent data-loss policy.
- **"Merge the files" for arbitrary binaries**, or conflating Drive-style sync with Docs-style OT/CRDT. Know the boundary; state it in one paragraph.
- **Hard deletes.** No tombstones → zombie files resurrected by offline devices, no trash, no way for other clients to learn of deletion. The tombstone question *will* be asked.
- **Polling for changes** instead of journal-cursor + notification poke. It's the difference between 20M QPS of nothing and an idle connection tier.
- **Synchronous chunk deletion at refcount zero.** One drifted counter = a user's file corrupted months later. GC must be lazy, grace-perioded, and audited.
- **No numbers on metadata.** If you never compute "625 billion chunk references ≈ 40 TB of index," you'll draw the chunk index as a table in Postgres and the interviewer will know the design was never sized.
