# Lesson 5.2 — Replication & Partitioning

> Module: Distributed Systems | Level: Senior/Staff | FDE Prep

Replication (keeping copies of the same data on multiple nodes) and partitioning (splitting a dataset across nodes) are the two orthogonal tools every distributed datastore combines, and nearly every senior system-design interview probes both. Replication questions are really about *what happens during the lag window and during failover*; partitioning questions are really about *what happens when data moves and when load is skewed*. This lesson goes anomaly-by-anomaly and mechanism-by-mechanism, with the standard fixes an interviewer expects you to name unprompted. Quorum math itself is covered in Lesson 5.1; here we build on it.

---

## Leader-Follower Replication

### Q1. Compare synchronous, asynchronous, and semi-synchronous replication. What exact guarantee does each give, and what is the data-loss window?

**Answer:**

The question underneath all three modes: *when do we acknowledge the client's write?*

- **Synchronous:** the leader waits until at least one (or all, depending on config) followers have durably received the write before acking the client. Guarantee: an acked write survives leader loss, because a synchronous follower provably has it. Cost: write latency = leader fsync + network round trip + follower fsync, and — the killer — **availability coupling**: if the synchronous follower dies or the link degrades, writes on the leader stall entirely. This is why "fully synchronous to all followers" is almost never used; one slow node freezes the system.
- **Asynchronous:** the leader acks as soon as the write is durable *locally*, then streams it to followers whenever. Guarantee: none beyond the leader's own disk. Data-loss window = current replication lag — usually milliseconds, but during load spikes, long transactions, or a network partition it can grow to seconds or minutes, and every acked write in that window dies with the leader.
- **Semi-synchronous:** one designated follower is synchronous, the rest async. Guarantee: every acked write exists on at least two nodes. If the sync follower falls over, the system either promotes another follower to the sync role or (dangerously) degrades to async.

Concrete knobs to name in an interview:

- **PostgreSQL:** `synchronous_standby_names = 'FIRST 1 (standby_a, standby_b)'` picks which standbys count, and `synchronous_commit` tunes the *level* of synchrony per transaction: `off` (not even local flush is waited on), `local` (leader fsync only — async replication), `remote_write` (standby received it in OS cache), `on` (standby flushed to disk), `remote_apply` (standby has *applied* it, so reads there see it). `remote_apply` is the only level that gives read-your-writes on the standby. Crucially, this is settable per transaction — a common senior pattern is `synchronous_commit = on` for payments and `local` for analytics events in the same database.
- **MySQL semi-sync plugin:** the leader waits for one follower to acknowledge *receipt into its relay log* (not application). `rpl_semi_sync_master_timeout` is the trap: when the timeout fires, MySQL **silently degrades to async** and keeps accepting writes.

| Mode | Ack condition | Data-loss window on leader crash | Latency cost | Availability coupling |
|---|---|---|---|---|
| Synchronous (all) | All followers durable | None | Highest (slowest follower) | Any follower down = writes stall |
| Synchronous (quorum/1) | K followers durable | None (if failover picks a sync follower) | +1 RTT + remote fsync | K followers must be up |
| Semi-sync | 1 follower has received | None *while healthy*; full lag window after silent degrade | +1 RTT | Degrades instead of stalling |
| Asynchronous | Leader durable only | Entire replication lag (ms → minutes) | Minimal | None |

**Interview trap:** "Semi-sync means no data loss." Two holes: (1) MySQL semi-sync acks on relay-log *receipt*, and with the older `AFTER_COMMIT` mode the leader commits locally and exposes the write to other transactions *before* the follower acks — a crash in that gap means other clients read data that then vanishes (`AFTER_SYNC`, "lossless semi-sync", fixes this ordering); (2) the degrade-to-async timeout means "semi-sync" clusters are often silently async exactly when the network is bad — which is exactly when the leader is most likely to die. Monitoring `Rpl_semi_sync_master_status` is not optional.

---

### Q2. Sketch the main replication topologies and where each is used.

**Answer:**

```
LEADER-FOLLOWER (fan-out)          CHAIN REPLICATION
                                   (writes at head, reads at tail)
        writes
   Client ──► [Leader]             Client ─► [Head]─►[Mid]─►[Tail] ─► ack
               /    \                                            reads: Tail
              ▼      ▼             (ack at tail = on ALL nodes;
        [Follower] [Follower]       strong consistency, higher latency)
          reads      reads

MULTI-LEADER (per-region)          LEADERLESS (Dynamo-style)
   DC-West            DC-East           Client
  [Leader A] ◄──────► [Leader B]       /   |   \     writes/reads go to
    /    \   conflict   /    \        ▼    ▼    ▼    N replicas directly,
   ▼      ▼  resolution▼      ▼    [R1]  [R2]  [R3]  quorum R/W decides
 [F]      [F]        [F]     [F]    (no leader; versions reconcile)
```

Leader-follower is the default (Postgres, MySQL, MongoDB, Kafka partitions). Chain replication shows up in storage systems wanting strong consistency with high read throughput (e.g., object-store internals). Multi-leader appears in multi-region actives and offline-first apps. Leaderless is the Dynamo family: Cassandra, Riak, Scylla, Voldemort.

---

### Q3. A user saves their profile, refreshes the page, and sees the old profile. What happened, and what are the standard fixes?

**Answer:**

This is a **read-your-own-writes (read-after-write) violation**: the write went to the leader, the subsequent read hit an async follower that hadn't applied it yet.

```
time ──────────────────────────────────────────────────────►

Client:    WRITE profile="v2"        READ profile
              │                          │
              ▼                          ▼
Leader:    [v1 → v2] ──ack──►        (not consulted)
              │
              │  replication stream (lagging 800ms)
              ▼
Follower:  [v1 ......... still v1] ──returns v1──►  Client sees OLD data
                                   ▲
                              read lands here,
                              inside the lag window
```

Standard fixes, in the order you should list them:

1. **Read your own data from the leader.** Route reads of anything the user *might have modified* (their own profile, their own comments) to the leader; everything else can hit followers. Simple, but if most content is user-editable this defeats read scaling.
2. **Track a logical position and wait.** The write returns the leader's LSN (Postgres) / GTID (MySQL) / a timestamp. The client (or session middleware) sends it with subsequent reads; a follower serves the read only once it has replayed past that position, otherwise the request waits or is re-routed to the leader. This is what "session consistency" tokens in Cosmos DB and `WAIT` semantics in various proxies implement. Precise, but requires plumbing the token through your stack (cookie, header, or session store).
3. **Sticky routing:** pin a session to one replica (or to the leader) for some window after a write (e.g., "route to leader for 60s after last write"). Crude but effective; the window must exceed p99 replication lag, and lag spikes break it.
4. Cross-device wrinkle: the token/stickiness must live server-side (keyed by user, not by device), or the user writes on their phone and reads stale data on their laptop.

**Interview trap:** answering "it's eventually consistent, the user can just refresh." Eventual consistency is a *liveness* property with no bound; the interviewer wants you to treat read-your-writes as a product requirement and name the LSN-tracking fix explicitly. Senior candidates also mention that Postgres `remote_apply` or proxy-level GTID waiting can give this guarantee at the infrastructure layer instead of the app layer.

---

### Q4. What is a monotonic reads violation and how do you prevent it?

**Answer:**

**Monotonic reads** means: once a client has seen some state, it never subsequently sees an *earlier* state. It breaks when successive reads land on replicas with different lag — time appears to run backwards.

```
time ──────────────────────────────────────────────────────►
Leader:      comment X written at t0
Follower-1:  applied X at t0+50ms   (lag 50ms)
Follower-2:  applies X at t0+2s     (lag 2s)

Client read #1 (t0+1s) ──► Follower-1 ──► sees comment X
Client read #2 (t0+1.5s) ─► Follower-2 ──► comment X is GONE
                                            (moved to a *less* updated replica)
```

Fix: make replica choice deterministic per client — **hash the user ID (not the request) to a replica**, e.g. `replicaIndex = hash(userId) % numReplicas`. Each user's reads always hit the same replica, so their view only moves forward (that replica may be stale, but monotonically stale). Failover of that replica can still cause one visible regression; systems that care carry the LSN token from Q3 as well. Note monotonic reads is strictly weaker than read-your-writes: it says nothing about seeing your own write quickly, only that you never un-see data.

---

### Q5. Explain a consistent prefix reads violation. Why is it specifically a *partitioned* database problem?

**Answer:**

**Consistent prefix reads:** if writes happen in a causal order, anyone reading them sees them in that order. Violation looks like an answer appearing before its question:

```
Partition P1 (fast, lag 10ms)     Partition P2 (slow, lag 5s)
 stores Bob's messages             stores Alice's messages

t0: Alice: "How deep is the ocean?"   → P2
t1: Bob:   "About 11km at the trench" → P1   (causally AFTER Alice's)

Observer reads both partitions at t2:
  from P1 replica: Bob's answer  ✓ (arrived, lag small)
  from P2 replica: (nothing yet) ✗ (Alice's question still in flight)

Observer sees: Bob answering a question nobody asked.
```

In a single-partition leader-follower setup this cannot happen: the replication log is totally ordered, so any follower's state is always a *prefix* of the leader's history. The anomaly appears once causally related writes live on **different partitions** with **independent replication streams** — there is no global order across logs. Fixes: (a) write causally related data to the same partition (e.g., partition chat messages by conversation ID, not by author); (b) causality tracking (version vectors / causal consistency layers like COPS-style systems), which is expensive and rare in practice. The pragmatic answer interviewers want is (a): choose the partition key so that things that must be ordered together live together.

---

### Q6. Walk through what can go wrong during leader failover.

**Answer:**

Failover = detect leader death, promote a follower, repoint clients. Each step has a classic disaster:

1. **Promoting a lagging async follower loses committed writes.** The pattern (seen publicly in a well-known MySQL incident at a major code-hosting company, and reproduced at countless others): leader crashes with the follower N seconds behind; the follower is promoted; the old leader later comes back holding writes the new leader never had. Now you must either discard those writes (data loss that was already acked to users) or attempt a manual merge. It gets worse when *external systems* consumed the lost IDs — see the auto-increment point below.
2. **Auto-increment collisions.** Old leader assigned primary keys 1000–1042 in its final unreplicated moments; the new leader, unaware, reassigns 1000+ to *different rows*. If a cache (Redis) or a downstream system keyed data by those IDs, you now serve user A's private data under user B's ID. This is the specific mechanism that turns "lost a few seconds of writes" into "leaked data between users." Mitigations: GTID-based failover tooling that refuses to promote without checking positions, interleaved/offset auto-increment ranges per node, or application-generated IDs (UUIDv7/snowflake).
3. **Split brain.** Failover was triggered by a network partition, not death: the old leader is alive and still taking writes from clients on its side while the new leader takes writes on the other. Two divergent histories, no conflict resolution (this is single-leader software — it has none). Defenses: **fencing** (STONITH — power off or block the old leader at the storage/network layer before promoting), epoch/fencing tokens that storage and clients verify, and quorum-based leader election (etcd/ZooKeeper/Raft) so a leader that can't reach a majority stops accepting writes.
4. **Flappy failover from a bad timeout.** Detection timeout too short → a load spike (slow heartbeats) triggers failover *during* peak traffic, adding promotion churn and cache stampedes to an already overloaded system. Timeout too long → real outage lasts longer. There is no correct constant; good systems use adaptive detection and require a human or a rate-limiter in the loop for repeated failovers.

**Production war story:** a payments platform ran MySQL with async replicas and an aggressive auto-failover agent. A 40-second network blip between AZs triggered promotion of a replica that was 3 seconds behind; the old leader kept accepting writes for another 20 seconds before its VIP was pulled. Result: ~900 orders existed only on the demoted leader, and 51 order IDs had been *reissued* by the new leader to different customers. The recovery took two engineers a full day of row-by-row reconciliation because the binlogs had to be replayed and conflict-checked manually. The permanent fixes were exactly the textbook list: lossless semi-sync, GTID-checked promotion, and fencing the old leader before promotion rather than after.

---

## Multi-Leader Replication & Conflict Resolution

### Q7. When is multi-leader replication the right call, and what's the price?

**Answer:**

Use cases where a single leader is untenable:

1. **Multi-region active-active:** one leader per datacenter; users write to the local leader (low latency), leaders replicate to each other asynchronously. A whole-DC outage doesn't stop writes elsewhere, and inter-DC replication happening in the background tolerates flaky WAN links better than synchronous cross-region commits.
2. **Clients that go offline:** every device is effectively a "leader" for its local replica (calendar apps, mobile CRMs). The device accepts writes offline and syncs later — multi-leader with extremely long replication lag.
3. **Collaborative editing:** each user's in-browser copy is a leader; keystrokes replicate to others. (This is why collaborative editors ended up driving CRDT/OT research.)

The price is singular and unavoidable: **write conflicts**. Two leaders can accept concurrent, contradictory writes to the same record, and *both have already acked their client*. You cannot reject the conflict after the fact; you can only resolve or surface it. Everything in Q8–Q10 is about paying that bill. Secondary costs: auto-increment keys, triggers, and integrity constraints all behave surprisingly across leaders, which is why retrofitted multi-leader modes in traditional RDBMSs are considered hazardous and why purpose-built systems dominate here.

---

### Q8. Explain Last-Write-Wins conflict resolution and why clock skew makes it dangerous. Give a concrete two-datacenter example.

**Answer:**

**LWW:** attach a timestamp to every write; on conflict, keep the highest timestamp, silently discard the rest. Cassandra does this **per cell** (per column value) using client- or coordinator-supplied microsecond timestamps.

Why it's dangerous — the timestamps come from physical clocks, and physical clocks skew:

```
DC-West clock: runs 80ms FAST        DC-East clock: correct

real time ─────────────────────────────────────────────►

t=0ms    DC-East: user sets email="a@x.com"
         stamped ts=1000000000000  (correct)

t=50ms   DC-West: user corrects it: email="b@x.com"
         stamped ts=1000000000130  ... wait, no:
         DC-West's clock is FAST, so this LATER write could win — fine.

Now invert the skew: DC-West runs 80ms SLOW:
t=0ms    DC-East write email="a@x.com"   stamped ts=...000
t=50ms   DC-West write email="b@x.com"   stamped ts=...(-30)  ← STAMPED EARLIER
LWW keeps "a@x.com". The user's correction — a write that happened
LATER in real time and was ACKED — is silently thrown away forever.
```

Properties to articulate at senior level:

- LWW achieves **convergence** (all replicas end identical) at the cost of **durability**: some acked writes are deleted and nothing reports it. It is "eventual consistency" in the most literal sense — eventually consistent, arbitrarily wrong.
- NTP typically keeps skew in the tens of milliseconds, but VM pauses, leap-second smearing bugs, and unsynced containers push it to seconds. Any real concurrent-write workload will lose data under LWW; the only safe uses are (a) genuinely immutable keys (write-once, e.g. content-addressed blobs or event IDs), or (b) domains where losing one of two concurrent updates is acceptable (last-seen timestamps, presence).
- In Cassandra specifically, per-cell LWW plus client-supplied timestamps means two "UPDATE ... SET a=1, b=2" statements can interleave *per column*, producing a row that neither client ever wrote (a from one write, b from the other).

**Interview trap:** proposing "just use NTP / more accurate clocks" as the fix. Better clocks shrink the window; they cannot close it — ordering by physical time is fundamentally unable to distinguish "concurrent" from "later." The correct escalation path is logical clocks/version vectors to *detect* concurrency (Q13), then an actual merge strategy (Q9–Q10). Google's TrueTime is the exception that proves the rule: it works by exposing the *uncertainty interval* and waiting it out, not by pretending the clock is exact.

---

### Q9. LWW aside, what conflict resolution strategies exist for multi-leader systems?

**Answer:**

1. **Merge the values.** If the data type permits, combine rather than choose: union of set members, max of counters, concatenation with markers. Requires the value to have merge semantics — which is precisely the observation CRDTs formalize (Q10).
2. **Keep siblings, let the application merge.** Riak's classic approach: when the store detects concurrent writes (via version vectors), it keeps *both* values as "siblings" and returns both on read; the application must merge and write back. Honest — no data is silently lost — but pushes real complexity to app developers, and the famous failure mode is the shopping cart: naive union-merge of cart siblings resurrects deleted items (removed item still present in the other sibling re-appears after merge). Tombstones or OR-Set semantics are needed to make deletion merge correctly.
3. **Conflict avoidance: give every record a home leader.** Route all writes for a given record (e.g., a user's data) to one designated leader — usually the region closest to them. Since one leader serializes all writes to that record, conflicts never form. This is the most underrated answer in interviews: most "multi-leader" production systems are really *partitioned single-leader per record*, with multi-leader machinery only as a failover path. The residual problem: when the home changes (user moves regions, DC fails over), there's a window where two homes exist — you still need a conflict story for that edge.
4. **Custom resolution hooks:** on-write handlers (e.g., replication conflict triggers) or on-read resolution. Deterministic, side-effect-free resolvers only — a resolver that fires a payment email runs once per replica.

---

### Q10. Give a senior-level overview of CRDTs: state-based vs op-based, the main types, and a worked merge example.

**Answer:**

**CRDTs (Conflict-free Replicated Data Types)** are data types whose merge is mathematically guaranteed to converge without coordination. The requirement: merge must be **commutative, associative, and idempotent** — then replicas can exchange state in any order, any number of times, and end identical.

Two formulations:

- **State-based (CvRDT):** replicas ship their *entire state* (or deltas); merge = a join in a lattice (e.g., element-wise max). Tolerates lossy/duplicated delivery (idempotence absorbs it); costs bandwidth, mitigated by delta-CRDTs.
- **Operation-based (CmRDT):** replicas ship *operations* ("increment by 3"); requires the transport to deliver each op exactly once (or ops to be idempotent) and usually in causal order. Cheaper on the wire, pickier about the messaging layer.

Core types:

- **G-Counter (grow-only counter):** each replica owns a slot and only increments its own; the value is the sum of slots; merge is per-slot max. Worked example:

```
Replica A's state: { A: 5, B: 2, C: 0 }   (A has done 5 increments,
Replica B's state: { A: 3, B: 4, C: 1 }    has SEEN 2 of B's, 0 of C's)

merge = per-slot max: { A: max(5,3)=5, B: max(2,4)=4, C: max(0,1)=1 }
value = 5 + 4 + 1 = 10   ← every real increment counted exactly once,
                            no matter how many times states are exchanged
```

- **PN-Counter:** two G-Counters, P (increments) and N (decrements); value = sum(P) − sum(N). This is the shopping-cart-quantity / like-counter workhorse.
- **G-Set:** grow-only set; merge = union. Can't remove.
- **OR-Set (observed-remove set):** fixes removal. Each `add(x)` creates a unique tag `(x, uuid)`; `remove(x)` tombstones only the tags *observed at the time of removal*. A concurrent re-add creates a fresh tag the remove never saw, so **add wins over concurrent remove** — deterministic and usually what users expect. Contrast with the naive 2P-Set, where a removed element can never be re-added, and with the sibling-union cart bug from Q9, which OR-Set semantics prevent.
- **LWW-Register:** a single value with LWW merge — a CRDT formally (it converges), but inheriting every data-loss caveat from Q8. Fine for "last known GPS position," wrong for "account email."

Where used: Redis Enterprise CRDBs (active-active geo-replication), Riak data types, Automerge and Yjs (collaborative editing — sequence CRDTs like RGA/YATA for text), Phoenix Presence, SoundCloud-style like counters, and the canonical Dynamo shopping cart. The honest limitation to volunteer: CRDTs guarantee convergence, **not invariants** — a PN-Counter happily converges to a negative inventory count; "at most one seat sold" fundamentally needs consensus, not merge.

```js
// State-based G-Counter merge — runnable under Node.js
function gCounterMerge(a, b) {
  const merged = { ...a };
  for (const [replicaId, count] of Object.entries(b)) {
    merged[replicaId] = Math.max(merged[replicaId] ?? 0, count);
  }
  return merged;
}
const value = (state) => Object.values(state).reduce((s, n) => s + n, 0);

const repA = { A: 5, B: 2, C: 0 };
const repB = { A: 3, B: 4, C: 1 };
const m1 = gCounterMerge(repA, repB);
const m2 = gCounterMerge(repB, repA);            // commutative
const m3 = gCounterMerge(m1, m1);                // idempotent
console.log(m1, value(m1));                      // { A:5, B:4, C:1 } 10
console.log(value(m2) === 10, value(m3) === 10); // true true
```

---

## Leaderless Replication (Dynamo-style)

### Q11. Explain sloppy quorums and hinted handoff. What guarantee do you give up?

**Answer:**

Quick recap (full math in Lesson 5.1): with N replicas per key, a write acked by W nodes and a read consulting R nodes satisfies **R + W > N**, so read and write sets must overlap in at least one node holding the latest value. That overlap argument is the entire consistency story of a strict quorum — remember that phrase.

A **strict quorum** requires those W acks to come from the key's N *designated* "home" nodes (the N nodes that own the key's ring range). During a partition or node outage, fewer than W homes may be reachable → writes fail. A **sloppy quorum** relaxes this: accept the write on any W reachable nodes, using non-home **substitute nodes** to stand in for unreachable homes. The substitute stores the data with a **hint**: "this really belongs to node C; deliver it when C is back." When the home node recovers, substitutes push hinted data to it — **hinted handoff**.

```
Key K's home nodes: [A] [B] [C]      N=3, W=2, R=2

  Normal write:                     C is down — sloppy quorum:
  Client ─► A ✓                     Client ─► A ✓
         ─► B ✓  (W=2 met)                 ─► B ✗ (also unreachable!)
         ─► C ✓                            ─► D ✓  ← substitute, stores
                                                     value + hint "for C"
                                    W=2 met via {A, D} — write ACCEPTED

  Later, C recovers:
  [D] ──hinted handoff: (K, value)──► [C]     D deletes its copy after ack

  Meanwhile a READ of K (R=2) consults home nodes: {B, C}
  B: never got the write.  C: hint not delivered yet.
  R+W>N was satisfied... and the read STILL returns stale data.
```

What you lose: **the overlap guarantee itself.** R + W > N proves overlap only when reads and writes draw from the *same* fixed set of N nodes. With sloppy quorums, the write set can be `{A, D}` while the read set is `{B, C}` — disjoint. So a sloppy quorum turns R/W tuning from a consistency knob into purely a **durability** knob: the write is on W disks somewhere, but "read sees latest acked write" is no longer guaranteed even with R = W = N. Riak defaults sloppy quorums on; Cassandra's rough equivalent is hinted handoff on timeout (with `max_hint_window`: after too long an outage, hints are dropped and you must rely on Q12's anti-entropy). The interview one-liner: *sloppy quorum trades consistency for write availability — it's a durability mechanism wearing a quorum costume.*

**Interview trap:** claiming "R + W > N gives strong consistency in Dynamo-style systems." Even ignoring sloppy quorums it doesn't quite (concurrent writes, partial write failures that are not rolled back, and read-repair races all create edge cases where a "quorum" read regresses); with sloppy quorums it clearly doesn't. Precise phrasing wins the round: strict quorums give you *read-sees-latest-completed-write with high probability under well-behaved failures*, not linearizability.

---

### Q12. How do leaderless systems repair stale replicas? Explain read repair and Merkle-tree anti-entropy.

**Answer:**

There's no leader replaying a log to catch stragglers, so staleness is fixed by two complementary mechanisms:

1. **Read repair (foreground, read path):** the coordinator reads from R replicas, compares versions, returns the newest to the client, and *writes the newest value back* to any replica that returned a stale one. Cheap and targeted — but it only heals keys that get read. A key written once and never read again can stay inconsistent forever; cold data rots.

2. **Anti-entropy (background):** replicas periodically compare their datasets and sync differences. Comparing key-by-key would mean shipping the whole keyspace over the network, so each replica maintains a **Merkle tree** over its key ranges: leaves are hashes of key ranges, parents hash their children, the root summarizes everything.

```
        Replica 1                          Replica 2
        root: h(AB)                        root: h(AB')     ← roots differ:
        /        \                         /        \          SOMETHING diverges
   A: h(a1,a2)  B: h(b1,b2)          A: h(a1,a2)  B': h(b1,b2')
    /     \       /     \              /     \       /     \
  a1      a2    b1      b2           a1      a2    b1      b2'
 keys    keys  keys    keys                                 ▲
 0-24   25-49  50-74  75-99                          only leaf b2 differs

Exchange: root ≠ root → compare children → A = A (prune entire left
half, zero data shipped) → B ≠ B' → compare B's children → b1 = b1,
b2 ≠ b2' → stream ONLY keys 75-99 for reconciliation.
```

The comparison descends only into unequal subtrees, so locating divergent ranges costs **O(log n) hash exchanges** plus data transfer proportional to the *actual difference*, not the dataset size. Two replicas holding a billion keys that differ in one range exchange a few dozen hashes. Cassandra builds Merkle trees during `nodetool repair`; Riak ships active anti-entropy; Dynamo described the same design. Operational realities worth volunteering: tree construction requires scanning/hashing the data (repair is IO-expensive — you schedule it off-peak), the tree resolution bounds how precisely you can localize a diff (too coarse = overshipping, too fine = huge trees), and forgetting to run repair within `gc_grace_seconds` in Cassandra resurrects deleted data when tombstones expire (deleted rows reappear from an unrepaired replica).

**Production war story:** a team running a Cassandra cluster disabled scheduled repairs because "they spiked disk IO." Months later a node was replaced after a hardware failure; deletion tombstones older than `gc_grace_seconds` had been purged cluster-wide, but the never-repaired replica still held the pre-delete rows — which then anti-entropied *back into* the cluster during the replacement's bootstrap. Users saw items they had deleted half a year earlier reappear, including revoked API keys. The fix was as much process as tech: repairs became a monitored SLO (every replica repaired within gc_grace), and revocation-type deletes were moved to an explicit "revoked" flag rather than row deletion, so a resurrected row failed safe.

---

### Q13. How do version vectors detect concurrent writes?

**Answer:**

A **version vector** is a map `{replicaOrClient → counter}` attached to each value. On write, the coordinator bumps its own slot; the vector travels with the value; the client receives it on read and must send it back on the next write (this is the "context" in Riak, the vector-clock header in Dynamo's design).

Comparison defines a *partial order*:

- `V1 ≤ V2` (V2 dominates) if every slot in V1 is ≤ the corresponding slot in V2 → V2 causally *supersedes* V1; V1 can be discarded safely.
- Neither dominates (V1 has a bigger slot somewhere, V2 bigger elsewhere) → the writes are **concurrent**: neither writer had seen the other's write. Example: `{A:2, B:1}` vs `{A:1, B:2}` — concurrent; keep both as siblings and resolve via Q9/Q10 strategies.

This is what LWW refuses to acknowledge: physical timestamps *totalize* an inherently partial order, forcing a winner where the true answer is "concurrent." Version vectors detect the concurrency and hand you the honest problem. Costs to mention: vectors grow with the number of writers (client-ID-based vectors need pruning, and pruning can cause false concurrency), and version vectors detect conflicts but don't resolve them — they're the detection layer under sibling storage and OR-Sets. Distinguish from **vector clocks** if pressed: vector clocks order *events* in a process history; version vectors order *replica states of one object* — related mechanics, different domains.

---

## Partitioning (Sharding)

### Q14. Range vs hash partitioning: trade-offs and real systems.

**Answer:**

- **Range partitioning:** keys are sorted; each partition owns a contiguous key range (like encyclopedia volumes: A–C, D–F...). HBase and Bigtable do this (regions/tablets), as do CockroachDB and Spanner (ranges/splits). The superpower is **efficient range scans**: `timestamps between t1 and t2` touches one or a few partitions. The curse is **write hotspots on sequential keys**: timestamped or auto-increment keys make every insert land on the *last* range — one node takes 100% of writes while the rest idle. Classic mitigation: prefix the key with something distributive (`sensorId + timestamp` instead of `timestamp + sensorId`), accepting scatter-gather for time-range queries across sensors.
- **Hash partitioning:** partition by `hash(key)`; keys spray uniformly. Cassandra (Murmur3 token ranges), DynamoDB, Voldemort. Hotspots from *sequential* keys vanish; **range scans die** — adjacent keys live on different nodes, so a range query hits every partition. Cassandra's compromise is worth naming: hash the **partition key** for placement, but sort rows *within* a partition by **clustering columns** — so `(user_id) → hash`, `(message_time) → sorted within` gives you "all of one user's messages in time order" cheaply while spreading users uniformly.

| Dimension | Range partitioning | Hash partitioning |
|---|---|---|
| Range scans | Efficient (contiguous) | Scatter-gather across all partitions |
| Sequential-key writes | Hotspot on last partition | Uniform |
| Rebalancing style | Split/merge ranges dynamically | Move hash ranges / vnodes |
| Data locality for related keys | Yes (sort order) | Only within one partition key |
| Skew risk | Popular ranges, monotonic keys | Celebrity single keys (Q19) |
| Examples | HBase, Bigtable, CockroachDB, Spanner | Cassandra, DynamoDB, Riak, Voldemort |

Neither fixes a **single celebrity key** — a hash function maps one hot key to one partition no matter what. That needs Q19's techniques.

---

### Q15. Why is `hash(key) % N` a disaster for scaling, and how does consistent hashing fix it?

**Answer:**

With mod-N placement, node count is baked into *every key's address*. Add one node and almost everything moves:

Numeric example — keys hashed to 0–99, going from **4 nodes to 5**:

```
key hash h:      0   1   2   3   4   5   6   7   8   9  ...
h % 4 (before):  0   1   2   3   0   1   2   3   0   1  ...
h % 5 (after):   0   1   2   3   4   0   1   2   3   4  ...
match?           ✓   ✓   ✓   ✓   ✗   ✗   ✗   ✗   ✗   ✗
```

A key stays put only when `h % 4 == h % 5`, i.e. `h % 20 ∈ {0,1,2,3}` — 4 residues out of 20 = **only 20% of keys stay; 80% move**. (The demo in Q17 measures 79.8% empirically.) The ideal when adding a 5th node is moving exactly 1/5 = 20% — mod-N moves *four times* the minimum. In a cache tier that's an instant ~80% miss rate (thundering herd onto the database); in a storage tier it's a cluster-wide rebalance storm.

**Consistent hashing** decouples placement from node count. Hash both keys *and* nodes onto a circular space (e.g., 0 to 2^32−1); a key belongs to the first node clockwise from its hash:

```
                    0/2^32
                 ┌────●────┐
        node-D ──●         │
               │      key k1 ─► clockwise ─► node-A
               │           ●── node-A
   key k3 ─►   ●           │
   (─► D)      │           ●── key k2 ─► clockwise ─► node-B
        node-C ──●         │
                 │    ●── node-B
                 └────●────┘

Add node-E between C and A:  ONLY keys in the arc (C → E] move (to E).
Every other key's clockwise-first node is unchanged: ~1/N of keys move.
```

Adding a node steals only the arc between it and its predecessor; removing a node spills only its own arc onto its successor. Key movement drops from ~(N−1)/N to ~1/N — the theoretical minimum. This is the placement scheme under Dynamo, Cassandra (token ranges), Riak, memcached client sharding (ketama), and Discord/Twitter-style cache tiers.

**Interview trap:** stopping at the plain ring. With one point per node, arc sizes are wildly uneven (random points on a circle → some arcs are several times the mean — expected max arc ≈ (ln N)/N vs mean 1/N), a node's *successor* absorbs 100% of its load on failure, and there's no way to give a beefier machine more share. The fix is virtual nodes — if you don't say "vnodes" unprompted, expect the follow-up. Details in Q16, implementation in Q17.

---

### Q16. Why are virtual nodes necessary on a consistent-hash ring?

**Answer:**

Give each physical node V points ("vnodes") on the ring instead of one, at `hash(nodeId + "#" + i)`. Three independent problems this solves:

1. **Load variance.** One random point per node → arc sizes follow an exponential-ish spread; with a handful of nodes it's routine for one node to own 2–3x the mean share. With V vnodes, a node's total share is the *sum of V independent arcs* — variance shrinks like 1/V (law of large numbers). V = 100–256 gets per-node load within a few percent of even. (My own run of the Q17 demo with V=160 across 4 nodes: shares of 23.4%–27.0% — versus commonly 15%–40% with V=1.)
2. **Heterogeneous hardware.** Weight capacity by vnode count: the box with 2x RAM gets 2x vnodes and therefore ~2x the keyspace. There is no equivalent lever with one point per node.
3. **Smoother rebalancing and failure spreading.** When a node dies or is removed, its V arcs are scattered around the ring, so its load spills onto *many* successors — a sliver each — instead of doubling one unlucky neighbor's load (which can then kill *it*, cascading). Symmetrically, a new node steals slivers from everyone rather than halving one victim's range, so bootstrap traffic is spread across many source nodes.

Cost: ring size is `numNodes x V` entries (lookup stays O(log(N·V)) via binary search — negligible), and operational metadata per vnode. Cassandra shipped with `num_tokens: 256` for years and later dropped the default to 16 — large vnode counts inflate repair (Merkle-tree) overhead and make the probability that *some* quorum is unavailable under multi-node failure worse. The senior takeaway: V is a tunable trading balance smoothness against repair/metadata overhead, not "more is free."

---

### Q17. Implement a consistent hash ring with virtual nodes.

**Answer:**

Complete, runnable under Node.js (no dependencies). Design notes: sorted array of `{point, node}` + binary search for the first vnode clockwise; md5-derived 32-bit placement hash (uniform and deterministic; this is placement, not security); vnode count configurable per ring.

```js
'use strict';

const crypto = require('crypto');

// Deterministic 32-bit hash: first 4 bytes of md5. Not for security --
// we only need uniform, stable placement on a 2^32 ring.
function hash32(str) {
  return crypto.createHash('md5').update(str).digest().readUInt32BE(0);
}

class ConsistentHashRing {
  /**
   * @param {number} vnodesPerNode how many virtual nodes each physical node gets
   */
  constructor(vnodesPerNode = 160) {
    this.vnodesPerNode = vnodesPerNode;
    this.ring = [];          // sorted array of { point, node }
    this.nodes = new Set();  // physical node names
  }

  addNode(node) {
    if (this.nodes.has(node)) return;
    this.nodes.add(node);
    for (let i = 0; i < this.vnodesPerNode; i++) {
      this.ring.push({ point: hash32(`${node}#vnode-${i}`), node });
    }
    this.ring.sort((a, b) => a.point - b.point);
  }

  removeNode(node) {
    if (!this.nodes.delete(node)) return;
    this.ring = this.ring.filter((entry) => entry.node !== node);
  }

  /** Find the first vnode clockwise from the key's hash (binary search). */
  getNode(key) {
    if (this.ring.length === 0) return null;
    const point = hash32(key);
    // If the key hashes past the last vnode, wrap around to the first one.
    if (point > this.ring[this.ring.length - 1].point) {
      return this.ring[0].node;
    }
    let lo = 0;
    let hi = this.ring.length - 1;
    let answer = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (this.ring[mid].point >= point) {
        answer = mid;
        hi = mid - 1;
      } else {
        lo = mid + 1;
      }
    }
    return this.ring[answer].node;
  }
}

// ---------------- Demo: how many keys move when a node is added? ----------------

const KEYS = 10000;
const ring = new ConsistentHashRing(160);
['node-A', 'node-B', 'node-C', 'node-D'].forEach((n) => ring.addNode(n));

const before = new Map();
for (let i = 0; i < KEYS; i++) {
  const key = `user:${i}`;
  before.set(key, ring.getNode(key));
}

// Show load distribution across 4 nodes.
const dist = {};
for (const node of before.values()) dist[node] = (dist[node] || 0) + 1;
console.log('Distribution with 4 nodes:', dist);

ring.addNode('node-E');

let moved = 0;
const after = {};
for (let i = 0; i < KEYS; i++) {
  const key = `user:${i}`;
  const node = ring.getNode(key);
  after[node] = (after[node] || 0) + 1;
  if (node !== before.get(key)) moved++;
}

console.log('Distribution with 5 nodes:', after);
console.log(`Moved ${moved}/${KEYS} keys = ${(100 * moved / KEYS).toFixed(1)}%`);
console.log('Theoretical minimum (1/5):', (100 / 5).toFixed(1) + '%');

// Naive mod-N for contrast: hash(key) % 4 -> hash(key) % 5
let naiveMoved = 0;
for (let i = 0; i < KEYS; i++) {
  const h = hash32(`user:${i}`);
  if (h % 4 !== h % 5) naiveMoved++;
}
console.log(`mod-N rehash would move ${naiveMoved}/${KEYS} keys = ${(100 * naiveMoved / KEYS).toFixed(1)}%`);
```

Actual output from running this (`node ring.js`):

```
Distribution with 4 nodes: { 'node-B': 2699, 'node-A': 2340, 'node-D': 2566, 'node-C': 2395 }
Distribution with 5 nodes: {
  'node-B': 2197,
  'node-A': 1728,
  'node-D': 2191,
  'node-C': 1989,
  'node-E': 1895
}
Moved 1895/10000 keys = 18.9%
Theoretical minimum (1/5): 20.0%
mod-N rehash would move 7975/10000 keys = 79.8%
```

Points to narrate while coding this in an interview: (1) 18.9% moved vs the ~20% expected share — consistent hashing hits the theoretical minimum (it fluctuates around 1/N run to run since node-E's share is itself random), while mod-N moved 79.8%, matching the 4-in-20-residues analysis from Q15; (2) with V=160 the 4-node distribution is within ~13% of perfectly even — drop V to 1 and rerun to watch it get ugly; (3) `addNode` is O(R log R) from the re-sort — fine for rings that change rarely; a production version replicating each key to N nodes would walk clockwise from the found index, **skipping vnodes of already-chosen physical nodes**, to build the preference list; (4) an alternative with different trade-offs is jump consistent hash (no ring state at all, but nodes are numbered, so no arbitrary removal).

---

### Q18. What are the main rebalancing strategies, and why is fully automatic rebalancing dangerous?

**Answer:**

1. **Fixed number of partitions (Riak, Elasticsearch, Couchbase, Kafka-style):** create far more partitions than nodes up front (e.g., 1024 partitions on 10 nodes → ~102 each); rebalancing = reassigning *whole partitions* to new nodes. Keys never change partition, only partitions change nodes, so no per-key rehashing and clients can cache routing per partition. The catch: the count is fixed at creation — too few and it caps future scale (Elasticsearch primary shard count is fixed per index; resharding means reindex), too many and per-partition overhead (files, heap, recovery time) taxes you forever. Choosing it is a bet on future size.
2. **Dynamic splitting (HBase, Bigtable, CockroachDB, MongoDB range sharding):** start with one range; when a partition exceeds a threshold (e.g., ~10 GB), split it in two and migrate one half; merge shrunken neighbors. Partition count tracks data volume — no up-front bet. The catch: a brand-new table is *one* partition on *one* node until enough data accrues to split — a launch-day write storm hammers a single server (hence **pre-splitting** hot new tables is a standard operational move).
3. **Proportional-to-nodes (Cassandra vnodes):** each node holds a fixed number of token ranges; adding a node steals slivers from everyone (Q16).

Why "fully automatic" is dangerous: rebalancing is one of the most expensive things a cluster can do — it saturates disks and NICs re-copying data. The failure pattern: node N gets **overloaded** (not dead) and stops answering health checks in time → the rebalancer declares it failed and starts re-replicating its data → the copy traffic lands on the *remaining* nodes, which were already near saturation → more nodes miss health checks → more "failures," more rebalancing → **cascading collapse triggered by the recovery mechanism itself**. Failure detectors cannot distinguish "dead" from "slow" (a FLP-flavored reality), so kicking off multi-terabyte data movement on a timeout is betting the cluster on that distinction. Sane designs rate-limit rebalance throughput, require a *sustained* failure signal, cap concurrent movements (Elasticsearch's recovery throttles, Cassandra's stream throughput limits), and put a human in the loop for large topology changes: automatic *rebalancing plan*, manual *apply*.

**Production war story:** a search cluster ran hot at ~78% disk on all nodes. One node's disk hit the high-watermark, so the allocator started evacuating its shards; the copy traffic pushed *two more* nodes over the watermark; within 40 minutes the cluster was playing musical chairs with terabytes of shard data, query latency went from 30ms to 9s, and ingestion backed up. Nobody had failed — the rebalancer manufactured the outage from a capacity warning. Recovery was: disable allocation cluster-wide, let in-flight recoveries finish, add three nodes, re-enable with recovery concurrency of 1. The postmortem's rule: any automated data movement must have a global throughput budget and must halt, not accelerate, when cluster-wide pressure rises.

---

### Q19. How do you detect and mitigate hot partitions and celebrity keys?

**Answer:**

**Skew examples:** a celebrity's profile row getting millions of reads (every fan render touches `user:beyonce`); a viral post's counter absorbing a write flood; a multi-tenant system where one enterprise tenant is 100x the median (`tenantId` partition key = one giant partition); timestamp-prefixed range keys sending all of today's writes to one range (Q14); a `country=US` partition dwarfing others. Uniform *hashing* does nothing here — one key hashes to one partition, period.

**Detection:** per-partition metrics are table stakes (p99 latency, queue depth, throttle counts per shard — e.g., DynamoDB CloudWatch contributor insights style "most-accessed keys," Cassandra's per-table `toppartitions`); heat maps of request rate by partition; sampled key-frequency logging at the client/proxy (a streaming top-K like count-min sketch is the scalable version); and the blunt but reliable signal — one node's CPU pinned while its peers idle.

**Mitigations, in the order to present them:**

1. **Key salting / splitting the celebrity key.** Split hot key K into N subkeys `K#0 … K#(N-1)`. *Writes* pick a random/round-robin salt — the write flood spreads across N partitions. *Reads* must **scatter-gather all N subkeys** and merge (sum the counter shards, union the lists). This is exactly the sharded-counter pattern. Costs: N× read amplification, merge logic, and choosing N; so salt *only known-hot keys* (keep a small dynamic list of celebrities), not the whole keyspace. For read-hot (not write-hot) keys, invert it: write to one key, *replicate* to N copies, and have readers pick a random copy.
2. **Dedicated cache for the head of the distribution.** Celebrity reads are the most cacheable traffic in existence — a tiny in-process cache (even a 1–5s TTL) of the top-K keys absorbs the vast majority of a hot key's reads before they reach the store. Note the cache tier can itself get a hot key (one memcached node holding `user:beyonce` melts), hence client-local caching or replicated cache entries for the top-K.
3. **Request coalescing (single-flight):** when 10,000 concurrent requests miss on the same key, let *one* fetch through and park the rest on its result — turns a stampede into one backend read. This is Go's `singleflight`, or a promise-map in Node: `inFlight.get(key) ?? inFlight.set(key, fetch(key))`.
4. **Isolate the whale:** in multi-tenant skew, move the giant tenant to dedicated partitions/hardware and rate-limit per key/tenant at the edge so one key cannot consume a partition's entire throughput budget.

**Production war story:** a social app stored per-post like counts in a hash-partitioned KV store. A post went globally viral; its counter key hit ~150k writes/sec against a per-partition ceiling of ~10k. The partition throttled — and because *other* keys co-resided on that partition, thousands of unrelated posts started failing writes too (the collateral-damage detail interviewers love). Emergency fix: application-level sharded counter (`like:{postId}:{rand % 64}`) with reads summing 64 shards through a 2-second cache. Permanent fix: an automatic hot-key detector (count-min sketch at the API layer) that promotes any key over a threshold into sharded mode and demotes it when it cools. Total incident time 3 hours; the sharded-counter code itself was 40 lines.

**Interview trap:** "consistent hashing / more partitions fixes hotspots." Both spread *keys*, not *load on one key*. If pressed on why not just cache: caching fixes read-hot keys but does nothing for **write-hot** keys — for writes you must shard the key (salting) or batch/coalesce writes in front of the store. Distinguishing read-hot from write-hot before proposing a fix is the senior move.

---

### Q20. Compare local and global secondary indexes in a partitioned database.

**Answer:**

Primary-key lookups route perfectly: partition by key, done. Secondary indexes ("find all red cars") break this — matching rows live on every partition. Two placements of the index:

**Local index (document-partitioned):** each partition indexes *only its own rows*. Writes are self-contained (row + its index entries update on one partition, atomically if the engine supports it). Reads by the indexed attribute must **scatter-gather**: query every partition, merge results.

```
LOCAL (document-partitioned):  "color=red" lives on EVERY partition

  Partition 0            Partition 1            Partition 2
  rows: car#1, car#4     rows: car#2, car#7     rows: car#3, car#9
  idx: red→{1}           idx: red→{7}           idx: red→{3,9}
        ▲                      ▲                      ▲
        └──────────┬───────────┴──────────┬───────────┘
                   │   query color=red    │
                   └───── Client asks ALL partitions, merges ─────►
  Write path: 1 partition.   Read path: ALL partitions (tail-latency bound).
```

**Global index (term-partitioned):** the index itself is partitioned — by the *indexed value* (the "term"). All `color=red` entries live on whichever partition owns the term `red`. Reads by term hit **one** partition. But a write to one row now touches *multiple* partitions: the row's home plus a partition per indexed term — and terms can change (repaint the car: delete from `red`'s partition, insert into `blue`'s). Doing that synchronously needs a distributed transaction, so real systems update global indexes **asynchronously** — the index lags the base table.

```
GLOBAL (term-partitioned):  index sharded by TERM

  Base:  Partition 0 [car#1 red]   Partition 1 [car#7 red]   Partition 2 [car#9 red]
                 \                        |                        /
                  \  async index updates  |                       /
                   ▼                      ▼                      ▼
  Index: Partition A [terms a–m: blue→{...}]   Partition B [terms n–z: red→{1,7,9}]
                                                       ▲
  query color=red ──► ONE partition (B) ──► {1, 7, 9}  (may lag base table)
  Write path: base partition + one per indexed term (async). Read path: 1 partition.
```

| Dimension | Local index (document-partitioned) | Global index (term-partitioned) |
|---|---|---|
| Write cost | One partition, can be atomic with row | Multi-partition, typically async |
| Read by indexed attr | Scatter-gather all partitions | Single partition |
| Read freshness | Consistent with local rows | Eventually consistent (index lag) |
| Tail latency risk | Reads (slowest partition gates all) | Writes (hot index term throttles) |
| Hot-term risk | Diluted across partitions | One term = one partition (hotspot) |
| Examples | Cassandra secondary indexes, Elasticsearch (query fans out to shards), MongoDB | DynamoDB GSI, term-partitioned search indexes |

The classic gotcha: **DynamoDB GSI throttling.** A GSI has its *own* partition scheme keyed by the index key, with its own throughput. Two failure modes: (1) low-cardinality or skewed GSI keys (`status=ACTIVE`, `date=today`) concentrate all index writes on one GSI partition — the GSI throttles even though the base table is fine; (2) **GSI back-pressure**: because index updates are async via an internal buffer, a throttled GSI fills the buffer and then *throttles writes to the base table itself* — under-provisioned index capacity takes down your main write path. Rules of thumb: provision every GSI's write capacity ≥ the base table's for indexed attributes, pick high-cardinality GSI keys, and salt hot index terms exactly like Q19 celebrity keys (`status#ACTIVE#<rand%16>`).

**Interview trap:** treating Elasticsearch as a "global index." An ES index is *document-partitioned*: each shard indexes its own documents, and every query fans out to all shards then merges — which is precisely why oversharded ES clusters have brutal tail latency (a query is as slow as its slowest shard, and the more shards, the fatter the p99 of the max). Being able to classify a real system into local vs global — and derive its latency profile from that — is what this question is actually testing.

---

## Quick Self-Check (before your interview)

- Can you draw the read-your-writes timeline and name three fixes (leader reads, LSN wait, sticky routing) without notes?
- Can you explain, in one sentence each, what semi-sync's silent async degrade and MySQL `AFTER_COMMIT` vs `AFTER_SYNC` mean for durability?
- Given `{A:2,B:1}` vs `{A:1,B:2}`, can you say "concurrent, keep siblings" instantly — and say why LWW would silently drop one?
- Can you state precisely which guarantee sloppy quorums break (write set and read set may not overlap) and what hinted handoff buys instead (durability, write availability)?
- Can you reproduce the mod-N numbers (80% moved going 4→5 nodes vs ~20% with a ring) and give all three reasons for vnodes?
- Can you diagram local vs global secondary indexes and explain GSI back-pressure onto the base table?

**Cross-references:** Lesson 5.1 (quorum math, linearizability, consensus) is assumed; conflict-free convergence here pairs with the consensus-based invariant enforcement there — know which problems need which.
