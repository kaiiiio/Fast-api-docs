# Lesson 5.1 — CAP, PACELC & Consistency Models

> Module: Distributed Systems | Level: Senior/Staff | FDE Prep

Interviewers grill hardest on this topic because it is the fastest way to separate engineers who have operated distributed systems from engineers who have only read blog posts about them. Almost everyone can recite "pick two of three"; almost nobody can explain what the C in CAP actually means, why a "CA distributed system" is a category error, or why R+W>N still is not linearizability. As a Forward Deployed Engineer you will also be asked to map these abstractions onto a customer's real stack — "they run Cassandra with LOCAL_QUORUM and complain about stale reads, what do you tell them?" — so the goal here is mechanisms, not slogans.

---

## Section A — CAP: What the Theorem Actually Says

### Q1. State the CAP theorem precisely. What do C, A, and P actually mean?

**Answer:**

CAP says: a distributed shared-data system cannot simultaneously provide all three of **Consistency**, **Availability**, and **Partition tolerance**. But each letter has a precise, narrow technical meaning that is much stricter than everyday usage:

- **C = Linearizability** (also called atomic consistency in the original proof). This is *not* the C in ACID. Linearizability means the system behaves as if there is a single copy of the data, and every operation appears to take effect atomically at some instant between its invocation and its response. If write W completes (client got the ack) before read R begins — in real, wall-clock time — then R must observe W or something newer. It is a single-object, real-time recency guarantee, not a multi-object transaction guarantee.

- **A = Total availability.** Every request received by a **non-failed** node must eventually produce a **non-error** response. Note the strength of this: it is not "99.99% uptime," and it is not "most nodes respond." It means no node that is still alive is ever allowed to say "sorry, I can't answer right now because I might be stale or partitioned away from the leader." A CP system that returns errors from minority-side nodes during a partition is *unavailable* in the CAP sense, even if it feels plenty available operationally.

- **P = Partition tolerance.** The system continues to operate (per whatever C/A guarantee it claims) even when the network drops or arbitrarily delays messages between nodes. Crucially, P is **not a design choice you can decline**. It is a statement about the environment: real networks partition. Switch failures, GC pauses that exceed timeouts, misconfigured firewalls, saturated NICs, AZ isolation — from the algorithm's point of view, all of these look identical to a partition. "Partition tolerance" really means "the guarantee you claim must hold under an asynchronous, unreliable network," which is the only kind of network that exists.

So the honest statement of CAP: **when a partition happens, you must choose between consistency and availability for the requests affected by that partition.** That's it.

```
        Network partition splits a 3-replica system

   Client X                              Client Y
      |                                     |
      v                                     v
 +---------+   +---------+    ||      +---------+
 | Node A  |---| Node B  |    ||      | Node C  |
 | (leader)|   |         |    ||      |         |
 +---------+   +---------+    ||      +---------+
      majority side         PARTITION    minority side

 Client Y writes to C:   accept it?  -> stays Available, sacrifices C
                          reject it?  -> stays Consistent, sacrifices A
 There is no third option while the partition lasts.
```

**Interview trap:** Saying "C means the data is correct/valid" or conflating it with ACID consistency (integrity constraints). CAP's C is linearizability — a recency/ordering guarantee about reads and writes on a single register. If you say "ACID consistency" in a senior interview, expect a follow-up designed to expose that.

---

### Q2. Why is calling something a "CA system" a category error for a distributed system?

**Answer:**

Because P is not one of three symmetric knobs — it is the *precondition*. The theorem is really an implication: **given that partitions can occur (they can, always), choose C or A during them.**

To be "CA," a system would need a network that never partitions. No such network exists across more than one machine. Any system that claims CA is actually making one of these moves:

1. **It's not distributed.** A single-node Postgres is "CA" in a degenerate sense — there is no network between replicas to partition. The moment you add a replica, you're back in CAP territory.
2. **It's secretly CP.** "We're CA because we use a reliable network" really means "when the network does partition, we lose availability" — e.g., a synchronous-replication pair that blocks writes when the standby is unreachable.
3. **It's secretly AP.** "We're CA" while quietly serving stale reads from a disconnected replica means consistency was sacrificed; the vendor just didn't say so.

The mature framing: **CP vs AP is not a property of a whole system forever; it's a description of the system's behavior during a partition, often per-operation.** A single system can be CP for writes (majority quorum required) and AP-ish for reads (any replica answers). ZooKeeper is exactly this: linearizable writes, but default reads are served locally by any node and can be stale.

**Interview trap:** Classifying MySQL or Oracle RAC as "CA." The strong answer is: "CA is only coherent for a single node; for any replicated deployment you must tell me what happens to reads and writes when replicas can't talk, and that answer will be CP or AP (or an incoherent mess, which is also common)."

---

### Q3. Summarize the Gilbert & Lynch formalization. What do people commonly get wrong about CAP?

**Answer:**

Gilbert & Lynch (2002) turned Brewer's conjecture into a proof. Formally: in an **asynchronous network model** (no clock bounds, messages may be arbitrarily delayed or lost), it is impossible for a read/write register to guarantee both **atomic (linearizable) consistency** and **availability** (every request to a non-failing node receives a response) in all executions, including those with message loss. The proof is almost embarrassingly simple: partition the nodes into two groups G1 and G2 with all messages between them dropped. A client writes v2 to G1 (availability forces G1 to ack it without hearing from G2), then a client reads from G2 (availability forces G2 to answer). G2 has no way to know about v2, so it returns the old v1 — violating linearizability. Contradiction. They also proved a partially-synchronous variant with similar force.

Common misreadings, roughly in order of how often they appear:

1. **"Pick 2 of 3, at all times."** Wrong. In the absence of partitions you can have both C and A; the trade-off only binds *during* a partition. Systems don't sit in a fixed corner of a triangle.
2. **"P is optional, so we picked C and A."** Covered in Q2 — you don't get to opt out of the network being a network.
3. **"AP means the system is always available."** CAP's A says nothing about node crashes, overload, or operator error; it's only about non-failed nodes during partitions. Plenty of "AP" systems have terrible real-world availability.
4. **"CP means strongly consistent all the time."** CAP's C is only linearizability of single-object reads/writes; it says nothing about transactions, and a system can be "CP" while offering weaker consistency than you assumed (e.g., stale local reads).
5. **Treating CAP as a capacity-planning or latency tool.** The theorem is silent about latency entirely — that gap is exactly what PACELC fills.

---

### Q4. "CAP is a blunt instrument." Argue that position like a staff engineer.

**Answer:**

CAP makes a single, narrow statement and people stretch it into a design philosophy. Its bluntness comes from three restrictions:

1. **It only speaks about partitions.** Most of a system's life is partition-free, and CAP says nothing about that 99.9% of the time. The dominant everyday trade-off — consistency vs *latency* — is invisible to CAP. A system doing synchronous cross-region replication pays that cost on every write, partition or not.
2. **It only speaks about linearizability.** The interesting design space is the whole spectrum between linearizable and eventual (causal, session guarantees, bounded staleness). CAP collapses all of that into "not C." A system offering causal consistency with high availability is a genuinely great engineering artifact, and CAP can only describe it as "AP," which undersells it.
3. **It only speaks about total availability.** "Every request to every non-failed node gets a non-error response" is an extreme bar. A system where the majority side keeps serving during a partition and only the minority side errors is "not A" per CAP, yet operationally it may be exactly what you want.

So the staff-level posture: use CAP as a one-sentence sanity check ("during a partition, what does this system sacrifice?"), then immediately move to sharper tools — PACELC for the latency dimension, the consistency-model spectrum for the guarantee dimension, and quorum arithmetic plus failure-mode analysis for the mechanics.

---

## Section B — PACELC and Classifying Real Systems

### Q5. Explain PACELC. Why does it exist?

**Answer:**

PACELC (Abadi, 2010/2012) extends CAP with the observation that replication imposes trade-offs *all the time*, not only during partitions:

> **If Partition (P):** trade **Availability** vs **Consistency** — this is CAP.
> **Else (E):** trade **Latency** vs **Consistency**.

The "else" clause captures the everyday mechanism: to make a write consistent, you must coordinate — wait for replicas to ack, wait for a quorum, wait for a consensus round, or (in Spanner's case) literally wait out clock uncertainty. Every one of those waits is latency. If you refuse to pay the latency (ack after writing one replica, replicate asynchronously), you have created a window where reads can be stale — you traded consistency for latency with no partition anywhere in sight.

A system is classified as PA or PC (behavior during partition) and EL or EC (preference otherwise), giving four common profiles: PA/EL (Dynamo-style: fast and available, eventually consistent), PC/EC (consensus-based: consistent always, pays latency and loses availability in minority partitions), PC/EL and PA/EC (rarer hybrids). PACELC is strictly more useful in system-design interviews because it explains why, e.g., DynamoDB default reads are cheap and possibly stale even on a perfectly healthy day.

---

### Q6. Classify real systems under PACELC and justify each classification.

**Answer:**

| System | PACELC | Why |
|---|---|---|
| DynamoDB (default) | **PA/EL** | Writes ack after a subset of replicas; default reads hit any replica and can be stale. Strongly-consistent reads are an opt-in that pays extra latency (and lower availability: they can 500 where eventual reads succeed). |
| Cassandra | **PA/EL (tunable)** | Per-query consistency levels. At ONE/ONE it's fully PA/EL; at QUORUM/QUORUM it shifts toward PC/EC behavior — but hinted handoff and its Dynamo lineage keep it availability-biased by design. |
| MongoDB | **PC/EC (roughly)** | Single-primary replica sets: writes go to the primary; during a partition the minority side steps down and refuses writes (PC). With majority write/read concerns it pays coordination latency (EC). Historically its defaults (w:1, read from primary without readConcern majority) leaked staleness and rollback anomalies — worth mentioning to show you know the defaults matter, and that defaults have tightened over the years (w:majority default since 5.0). |
| Google Spanner | **PC/EC** | Paxos groups for writes (minority partitions lose availability), and it pays latency deliberately: TrueTime commit-wait means every transaction waits out the clock-uncertainty interval to guarantee external consistency. Consistency bought with latency, on every commit. |
| etcd / ZooKeeper | **PC/EC** | Raft/ZAB consensus. Writes require a majority: minority side is unavailable for writes during partitions. Every write pays a round of consensus latency. Caveat: ZK default reads are local and stale-able (use `sync()` for fresh reads); etcd serves linearizable reads by default via ReadIndex but offers cheaper "serializable" (stale-able) reads. |
| Postgres, single node | **Outside CAP/PACELC** | No replication, no partition between replicas possible. Linearizable by construction (one copy). The moment you add replicas the classification depends on how. |
| Postgres + async streaming replicas | **PA/EL for reads, PC-ish for writes** | Replica reads are fast but can lag (EL). If the primary dies before WAL ships, acked writes can be lost on failover — an anomaly stronger than mere staleness. `synchronous_commit = remote_apply` with sync replicas moves it toward PC/EC at obvious latency cost. |

**Interview trap:** Classifying a system as one fixed letter-pair without stating the configuration. Senior answer pattern: "Cassandra *at these consistency levels* behaves like X; Mongo *with these write/read concerns* behaves like Y." Consistency is a property of a configuration and a workload, not of a logo.

---

### Q7. How does Spanner get strong consistency across the globe? What is it actually paying?

**Answer:**

Spanner provides **external consistency** (strict serializability: serializable transactions whose order respects real time) across datacenters. Mechanics:

1. **Paxos per shard:** every write is committed by a Paxos group spanning replicas; minority partitions cannot commit (hence PC).
2. **TrueTime:** GPS + atomic clocks expose time as an *interval* `TT.now() = [earliest, latest]` with bounded uncertainty ε (historically single-digit milliseconds).
3. **Commit wait:** a transaction picks commit timestamp `s = TT.now().latest`, then **waits until `TT.now().earliest > s`** before releasing locks and acking. After that wait, every node on Earth agrees "s is in the past," so timestamp order equals real-time order — linearizability without a global lock manager.

What it pays — and this is the PACELC punchline — is **latency on every commit**: consensus round-trips plus up to 2ε of deliberate waiting. Google spent hardware (atomic clocks) to shrink ε, i.e., they spent money to buy back latency. Systems without TrueTime-class clocks (CockroachDB with NTP-bounded uncertainty) must use larger uncertainty windows or different tricks (read refreshes/restarts), paying the cost in a different currency.

This question is a favorite because it lets you demonstrate that "strong consistency" is never free — someone always pays in coordination latency, availability, hardware, or all three.

---

## Section C — The Consistency Spectrum

### Q8. Define linearizability precisely and give a concrete anomaly it forbids. Which real systems provide it?

**Answer:**

**Definition:** An execution is linearizable if every operation appears to take effect atomically at a single instant (its *linearization point*) between its invocation and its response, and the resulting total order is consistent with real time: if op1 completes before op2 begins (wall clock), op1's effect is ordered before op2's. Informally: the system is indistinguishable from a single copy of the data processing operations one at a time, and it never travels back in time.

Scope caveat: linearizability is a **single-object** guarantee. It says nothing about multi-object transactions — that's serializability's job (see Q13).

**Anomaly it forbids — losing your own acknowledged write after a failover:**

```
 real time ------------------------------------------------------->

 Client:   |--- write x=5 ---| ACK        |--- read x ---| -> 3 ??
                                     ^
 Cluster:        old leader acks,    |
                 crashes before      +-- new leader elected from a
                 replicating x=5         replica that never saw x=5

 Linearizable system: FORBIDDEN. The write completed (client saw ACK),
 so every subsequent read must see x=5 or newer. A system that acks
 before the write is durable on a quorum can violate this.
```

Under linearizability, once *any* client observes a value, no client may subsequently observe an older one. This is the guarantee you need for things like "acquire the lock, then check who holds it": leader election, distributed locks, uniqueness constraints, fencing tokens.

**Systems that provide it:** Spanner (reads/writes, plus strict serializability for transactions); etcd (writes, and linearizable reads via ReadIndex by default); ZooKeeper (linearizable *writes*; reads need `sync()` first); single-node Postgres; single-node Redis (one thread, one copy — but Redis with async replicas or Sentinel failover emphatically is not, and Redlock is famously contested for exactly this reason).

**Production war story:** Our payments service used a Redis primary/replica pair with automatic failover as a "distributed lock" for deduplicating charge submissions. During a 40-second network blip the primary was cut off *after* acking a lock acquisition but *before* the replica saw it; failover promoted the replica, a second worker "acquired" the same lock, and we double-charged 217 customers. The postmortem line that stuck: "we assumed linearizability from a system that never promised it." The fix was moving the mutual exclusion into a database with real consensus semantics and adding fencing tokens checked at the point of side effect.

---

### Q9. Sequential consistency vs linearizability — what's the difference? Show it with a two-client diagram.

**Answer:**

**Sequential consistency:** there exists a single total order of all operations that (a) every client's operations appear in, in that client's program order, and (b) all clients observe consistently. What it drops relative to linearizability: **the real-time constraint across clients**. An operation that finished (in wall-clock time) before another began may still be ordered *after* it, as long as everyone agrees on the final order and no individual client's order is scrambled.

```
 real time ------------------------------------------------------->

 Client A:  |-- write x=1 --| (completes at t=1)

 Client B:                        |-- read x --| -> 0   (t=3..4)

 Linearizable?  NO.  B's read began after A's write completed,
                     so it must return 1.
 Sequentially consistent?  YES.  Legal total order:
                     [ B: read x -> 0 ,  A: write x=1 ]
                     Each client's program order is respected and
                     everyone agrees on that order. The order just
                     doesn't match wall-clock time.
```

Intuition: linearizability = "one copy, and the clock is real." Sequential consistency = "one copy, but the system may lag behind reality uniformly." A classic realization: a single leader orders all writes, and every client reads from *one* consistent-prefix replica — everyone sees the same history, possibly delayed.

Why interviewers ask: it tests whether you know linearizability's defining feature is the **real-time recency** requirement, not the "total order" requirement. Sequential consistency also famously appears in CPU memory-model discussions (Lamport defined it there), which is a nice cross-domain point to drop.

---

### Q10. Define causal consistency. What anomaly does it prevent, and where do you get it in practice?

**Answer:**

**Definition:** operations related by **happens-before** (potential causality) must be observed by everyone in that order; operations that are *concurrent* (neither could have influenced the other) may be observed in different orders by different clients. Happens-before is generated by: (1) program order within one client/session, (2) reads-from — if you read a value, your subsequent writes are causally after the write that produced it — and (3) transitivity.

**The canonical anomaly it forbids — the answer before the question:**

```
 Replica R1                          Replica R2
 -----------                        -----------
 t1: Alice writes  Q: "Is the       (async replication, message for
     deploy safe?"                   the answer overtakes the question)

 t2: Bob reads Q, writes            t3: Carol reads thread:
     A: "No, rollback!"                   sees ONLY "No, rollback!"
     (A causally depends on Q)            with no question above it.

 Eventual consistency: allows this.   Causal consistency: forbids it —
 A reads-from Q, so any replica showing A must already show Q.
```

Causal consistency matters because it is (provably) the **strongest model you can provide while remaining available during partitions** — the sweet spot for AP systems. Concurrent writes still need conflict resolution (LWW, CRDTs, app-level merge); causality only orders what *could* have been ordered.

**Implementations:** vector clocks or version vectors to track happens-before; dependency metadata piggybacked on replication (COPS-style); or session-scoped causal tokens. **In practice:** MongoDB causal sessions (client passes `operationTime`/cluster time tokens so each op waits for its causal dependencies), CRDT-based stores and frameworks (Riak with dotted version vectors, Antidote, Automerge/Yjs ecosystems in the client-side world), and "causal+" research systems. It's also effectively what a well-implemented session-token scheme gives a single user across replicas.

---

### Q11. Define eventual consistency honestly. What anomalies does it allow? Include the S3 gotcha.

**Answer:**

**Definition (the honest one):** if no new writes are made to an item, then *eventually* all replicas converge to the same value. That's the entire guarantee. It is a **liveness** property with no deadline and, critically, **no safety guarantee about what reads return in the meantime**. "Eventually consistent" answers the question "will replicas agree someday?" and is silent on "what will this read return now?"

**Anomalies allowed:**

- **Stale reads:** write x=5, get an ack, read x, see the old 3 — indefinitely long after, in theory.
- **Non-monotonic (out-of-order) reads:** read x and see 5, read again and see 3, because the second read hit a more-stale replica. Time flows backwards.
- **Answer-before-question / causality violations** (Q10's example).
- **Divergence needing conflict resolution:** two replicas accept concurrent writes; convergence requires a merge rule — last-writer-wins (silently drops one write — say this out loud in interviews), version vectors + app merge, or CRDTs.

**Systems:** DynamoDB eventually-consistent reads (the default, half the cost of strong reads); Cassandra at ONE/ONE; DNS (the canonical example — TTL-bounded propagation); async-replica reads in Postgres/MySQL.

**The S3 gotcha:** for its first ~14 years, S3 was eventually consistent for overwrite PUTs and DELETEs (read-after-write consistency only for *new* keys, and even that had caveats). Whole architectural patterns (EMR consistency layers like EMRFS/S3Guard) existed to paper over it. **Since December 2020, S3 is strongly consistent** — read-after-write for all PUTs and DELETEs, plus consistent LIST. Interviewers use this as a freshness check: citing S3 as your example of eventual consistency dates your knowledge to 2019; the strong answer names S3 as a system that *migrated* models, and DNS or DynamoDB-default-reads as the current canonical examples.

**Production war story:** Our analytics pipeline listed an S3 "directory" right after a batch job wrote 4,000 objects, and — pre-2020 — the LIST intermittently missed a few dozen recent keys, so downstream aggregates were silently short. It passed every test (single-object read-after-write on new keys usually worked) and only bit us at scale, a few files per thousand. We shipped a manifest-file pattern: the writer emits a manifest of exact keys written, and readers consume the manifest, never LIST. That pattern outlived the bug — it's still the right design, because it converts an inferred state into an explicit one.

---

### Q12. Enumerate the four session guarantees with an anomaly example each. How are they implemented?

**Answer:**

Session guarantees (from the Bayou work) are per-session promises that make eventual consistency *livable for a single user* without requiring global strong consistency. The four:

| Guarantee | Promise (within one session) | Anomaly without it |
|---|---|---|
| **Read-your-writes** | A read observes all writes previously made in this session | You edit your profile bio, hit save, the page reloads from a lagging replica and shows the old bio — you assume the save failed and save again |
| **Monotonic reads** | Successive reads never observe an older state than earlier reads | You refresh a comment thread and a comment you already saw disappears, because the refresh hit a more-stale replica |
| **Monotonic writes** | The session's writes are applied everywhere in the order issued | You set the doc title, then set its tags; a replica applies tags-then-title and a merge picks the stale title |
| **Writes-follow-reads** | A write is ordered (everywhere) after the writes whose values the session had read | You read Alice's question and post a reply; on some replica your reply lands before her question — the cross-user cousin of this is exactly Q10's causal anomaly |

**Implementation techniques:**

1. **Sticky sessions:** pin the session to one replica (or the primary). Trivially provides all four within the pin — until the replica dies or the load balancer resharded you, so this is a topology hack, not a real guarantee. Failover must be handled explicitly or the guarantees silently vanish.
2. **Session tokens / LSN tracking:** the client carries a token recording the latest position it has written or read — a log sequence number, Hybrid Logical Clock timestamp, or per-shard vector. On each read, the serving replica must be caught up to the token (wait, redirect, or proxy to a fresher replica); on each write, the token is advanced. This is how MongoDB causal sessions (cluster time) and Cosmos DB session consistency (session token) work, and how you'd hand-roll read-your-writes over Postgres replicas: capture `pg_current_wal_lsn()` after the write, and route reads to a replica only if `pg_last_wal_replay_lsn() >= token`.
3. **Write-through then read-primary for a freshness window:** after a user writes, route that user's reads to the primary for N seconds. Crude, effective, common.

**Interview trap:** "We put a load balancer in front of the replicas, so reads are fine." Round-robin over async replicas *destroys* monotonic reads and read-your-writes — each request may hit a differently-stale replica, which is precisely how the "my comment disappeared on refresh" bug is born. If an interviewer sketches LB-over-replicas, they are usually fishing for you to spot this.

---

### Q13. Consistency models vs isolation levels — linearizability vs serializability. What is strict serializability?

**Answer:**

This is a deliberately confusing terminology minefield and a classic senior-interview trap, so nail the axes:

- **Linearizability** is a *consistency/recency* model: **single-object**, multi-client, **real-time** ordering. It comes from the distributed systems / shared-memory literature. It knows nothing about transactions.
- **Serializability** is an *isolation* level: **multi-object transactions** must produce a result equal to *some* serial (one-at-a-time) execution of those transactions. It comes from the database literature. Crucially, "some serial order" carries **no real-time constraint**: a serializable database may legally order your committed transaction *before* one that finished an hour earlier, as long as the result matches some serial schedule. In particular, plain serializability permits arbitrarily stale reads — a read-only transaction executed against a snapshot from five minutes ago is perfectly serializable.

They answer orthogonal questions: *"is time real?"* (linearizability) vs *"do concurrent transactions interleave safely?"* (serializability). One does not imply the other:

- Serializable but not linearizable: Postgres SERIALIZABLE reading from an old-but-consistent snapshot; you can fail to read your own just-committed write's effects from a lagging replica while every transaction is individually serializable.
- Linearizable but not serializable: etcd gives you linearizable single-key ops, but a read-modify-write across two keys without a transaction can interleave and violate an invariant.

**Strict serializability = both:** transactions are serializable, *and* the serial order respects real time (if T1 commits before T2 begins, T1 precedes T2 in the order). This is Spanner's "external consistency." It is the strongest commonly cited model — and the most expensive, per Q7.

Bonus points in interviews: note that "strong consistency" is a marketing term that could mean any of the above; force the vendor (or interviewer) to say which. Also note snapshot isolation is *not* serializability (write skew: two doctors both go off-call because each read a snapshot showing the other on-call) — different axis, same lesson that names hide anomalies.

**Interview trap:** Using "serializable" and "linearizable" interchangeably, or claiming SERIALIZABLE in Postgres gives you fresh reads across replicas. The crisp disambiguation — single-object/real-time vs multi-object/any-order, strict serializability as the conjunction — is one of the highest-signal 60-second answers in this entire module.

---

## Section D — Quorums and Tunable Consistency

### Q14. Explain N/R/W quorum math. Why does R+W>N matter? Work the numbers.

**Answer:**

In a Dynamo-style replicated store, each key lives on **N** replicas. A write is acked after **W** replicas confirm; a read queries **R** replicas and takes the newest version (by timestamp/version vector). The load-bearing inequality:

**R + W > N ⟹ every read quorum intersects every write quorum in at least one replica.** Pigeonhole: two subsets of an N-set with sizes R and W where R+W>N must share ≥ R+W−N members. So at least one replica answering the read holds the latest acked write, and the read (taking the max version) returns it.

```
 N = 5 replicas:        [ n1 ] [ n2 ] [ n3 ] [ n4 ] [ n5 ]

 Write, W = 3:            ####   ####   ####    .      .
 Read,  R = 3:              .      .    ####   ####   ####
                                          ^
                                    overlap: n3 (>= R+W-N = 1 node)
                                    n3 has the new value; the read
                                    returns max(version) -> fresh.

 Contrast R + W <= N  (W=2, R=2, N=5):
 Write:                   ####   ####    .      .      .
 Read:                      .      .     .     ####   ####
                                    NO overlap -> stale read possible.
```

Worked examples (all with the read taking the newest of R responses):

| N | W | R | R+W>N? | Behavior |
|---|---|---|---|---|
| 3 | 2 | 2 | Yes (4>3) | The balanced default (Cassandra QUORUM/QUORUM). Tolerates 1 replica down for both reads and writes. |
| 3 | 3 | 1 | Yes (4>3) | Fast, always-fresh reads; but *any* single replica down blocks all writes. Read-heavy, write-availability-fragile. |
| 3 | 1 | 3 | Yes (4>3) | Fast writes; reads must reach all 3 — one dead replica blocks reads. Rarely sensible. |
| 3 | 1 | 1 | No (2≤3) | Maximum speed and availability; overlap not guaranteed; stale reads expected. Pure EL. |
| 5 | 4 | 2 | Yes (6>5) | Overlap ≥ 1. Writes tolerate 1 failure, reads tolerate 3 — skews cheap-fresh-reads onto a write-heavy cost. |
| 5 | 3 | 3 | Yes (6>5) | Symmetric majority; tolerates 2 failures either way. |

Second inequality worth stating unprompted: **W > N/2** ensures two *concurrent* write quorums must overlap, so the system can't accept two conflicting writes that each achieve a "successful" quorum on disjoint replica sets (e.g., on opposite sides of a partition). W=1, R=3 satisfies R+W>N but two simultaneous W=1 writes land on different single replicas and conflict — majority writes prevent that split-brain-by-arithmetic.

---

### Q15. If R+W>N, is the system linearizable? Why not?

**Answer:**

**No — and this is a top-tier discriminator question.** Quorum overlap gives "a read quorum contains the newest *acked* value," which sounds like linearizability but leaks anomalies through at least four mechanisms (the Kleppmann / Jepsen critique of Dynamo-style quorums):

1. **Sloppy quorums + hinted handoff.** Under failure, Dynamo-style systems write to *substitute* nodes outside the key's home set to preserve availability, "hinting" the data back later. W acks were achieved — on the wrong nodes. A subsequent read quorum over the home replicas shares zero nodes with that write. R+W>N arithmetic silently assumed both quorums draw from the same N; sloppy quorums break that assumption by design.
2. **Partial (failed) writes are not rolled back.** A write reaches 1 of 3 replicas and times out; the client gets an error. There is no undo — the value squats on that replica. Reader A (whose quorum includes it) sees the "failed" write; reader B doesn't; a later read-repair may resurrect it everywhere. A linearizable register cannot expose a write that "didn't happen" to some readers and not others — writes must be atomic, and quorum writes aren't.
3. **No atomic read-repair — racing reads can disagree with real time.** The newest value reaches replica n1 first. Reader A's quorum includes n1: returns new. Reader B starts *after A finished*, but B's quorum happens to be {n2, n3}, both stale: returns old. New-then-old across real-time-ordered reads is exactly the non-monotonicity linearizability forbids. Concurrent read-repairs racing with writes create the classic ABA-flavored mess: repair pushes version v2 to a replica while a newer v3 is mid-flight, and depending on timestamp ties and LWW rules, an older value can even win.
4. **Clock-based LWW.** If "newest" is decided by wall-clock timestamps, clock skew lets an older write overwrite a newer acked one — dropping an acknowledged write entirely, which is worse than staleness.

Fixes exist but cost the latency/availability that made quorums attractive: synchronous read-repair before returning (Cassandra's blocking read repair helps monotonicity but not full linearizability), CAS/paxos per key (Cassandra LWTs), or just using a consensus log. The one-line senior summary: **R+W>N buys read-sees-latest-acked-write under a static membership with no failures in flight; linearizability requires atomic visibility and real-time ordering under failure, which quorum arithmetic alone cannot deliver.**

**Interview trap:** Answering "yes, quorums give strong consistency" — or hedging with "mostly." Jepsen analyses have repeatedly demonstrated stale and non-monotonic reads in quorum systems that pass the R+W>N check. If you cite the sloppy-quorum and partial-write mechanisms by name, you have cleared the bar most candidates miss.

---

### Q16. Walk through Cassandra's consistency levels. When do you use which?

**Answer:**

Cassandra makes R and W per-query knobs called consistency levels, evaluated against replication factor N (per keyspace, often per datacenter):

- **ONE (/TWO/THREE):** ack from 1 (2, 3) replica(s), any DC. Fastest, most available, weakest. LOCAL_ONE restricts to the local DC.
- **QUORUM:** majority of *all* replicas across *all* DCs (⌊N_total/2⌋+1). Strong-ish overlap, but in a multi-DC cluster it forces cross-DC round trips on the write path — a common accidental latency bomb.
- **LOCAL_QUORUM:** majority of replicas *in the coordinator's DC only*. The multi-DC workhorse: quorum overlap within a DC without paying WAN latency. Cross-DC consistency is then only eventual — reads in DC-B may not see DC-A's LOCAL_QUORUM writes for a while.
- **EACH_QUORUM (writes):** a quorum in *every* DC. Strong cross-DC durability; any partitioned DC blocks all writes — availability inverts.
- **ALL:** every replica. One dead node blocks the operation; essentially an anti-availability setting used rarely (e.g., a final read where correctness beats uptime).
- **SERIAL / LOCAL_SERIAL:** the read side of lightweight transactions (Paxos CAS); linearizable for the keys involved, at multi-round-trip cost.

The R+W>N recipe in Cassandra terms: `LOCAL_QUORUM` writes + `LOCAL_QUORUM` reads with RF=3 per DC gives per-DC read-sees-write overlap and tolerates one node down per DC — the standard production posture. ONE/ONE is for high-volume telemetry where staleness is fine. And per Q15, even QUORUM/QUORUM is not linearizability — that's what LWTs are for, sparingly.

**Production war story:** Our device-metadata service ran a two-DC Cassandra cluster with plain QUORUM writes "for safety." RF was 3+3, so quorum was 4 of 6 — every single write crossed the WAN, p99 write latency sat at 180ms, and when the inter-DC link flapped, writes in *both* DCs started timing out simultaneously, taking down a service that had no cross-DC consistency requirement at all. Switching to LOCAL_QUORUM writes + LOCAL_QUORUM reads dropped p99 to 9ms and made each DC survive the other's absence. The lesson we wrote down: QUORUM vs LOCAL_QUORUM is not a durability nuance, it's an availability architecture decision.

---

### Q17. How does DynamoDB expose the consistency trade-off, and what does each choice cost?

**Answer:**

DynamoDB replicates each partition across three AZs and gives a per-*read* knob:

- **Eventually consistent reads (default):** served by any replica; may miss writes acked milliseconds ago (staleness typically sub-second but unbounded in principle). **Half the RCU cost** of strong reads — AWS literally prices the consistency spectrum, which is a great interview line.
- **Strongly consistent reads (`ConsistentRead=true`):** routed to the partition's leader; guaranteed to reflect all successful prior writes. Costs: 2× RCUs, slightly higher latency, **lower availability** (may return 500s during network/leader disruption where eventual reads still succeed — CAP playing out per-request), and **not supported on GSIs at all** (global secondary indexes are async-replicated; only eventual reads — a very common gotcha).
- Writes are not tunable: always leader-routed and durably replicated before ack.
- **Global tables** (multi-region) are last-writer-wins eventually consistent across regions — concurrent cross-region writes to the same item silently resolve by timestamp, i.e., one write loses. Within-region strong reads don't save you across regions.
- Transactions (`TransactWriteItems`) add multi-item ACID within a region at ~2× cost — isolation bolted onto the recency knob, per the Q13 distinction.

Cost/behavior table for quorum-style choices generally (Dynamo-style N=3 mental model):

| Choice | Read latency | Write latency | Read availability | Write availability | Staleness risk |
|---|---|---|---|---|---|
| R=1, W=1 | Lowest | Lowest | Highest (any replica) | Highest | High — no overlap |
| R=1, W=3 (ALL) | Lowest | Highest (slowest replica gates) | Highest | Lowest — 1 node down blocks writes | None if write succeeded; failed writes murky |
| R=2, W=2 (quorum, N=3) | Moderate (2nd-fastest of 3) | Moderate | Tolerates 1 down | Tolerates 1 down | Low (overlap; Q15 caveats) |
| R=3, W=1 | Highest | Lowest | Lowest | Highest | None in theory; concurrent W=1 writes conflict (W<N/2+1) |
| Strong read (leader) | +1 hop to leader | — | Drops during leader churn | — | None within region |

The pattern to internalize: **you can shift cost between reads and writes (fresh reads via expensive writes, or vice versa), but the sum — coordination — is conserved.** Choose based on your read:write ratio and which side can tolerate being blocked.

---

## Section E — Choosing: Which Model Do You Actually Need?

### Q18. Shopping cart vs bank balance vs social feed — pick consistency models and defend them.

**Answer:**

This is the synthesis question; the strong move is to derive the requirement from the *cost of each anomaly*, not from vibes about the domain.

**Shopping cart — AP, eventual + merge (the original Dynamo motivation).** Anomaly analysis: a stale or forked cart is annoying, not costly; a cart that refuses writes is a lost sale, which is the actual business catastrophe. So: accept writes on any replica, always. Concurrent forks are *merged* — classically by set-union of items, which has a known, accepted failure mode (deleted items resurrect; Dynamo's paper admits exactly this) or, better, by a CRDT (OR-Set) that handles remove correctly. The one strongly consistent step is **checkout**: inventory reservation and charging move to a linearizable/transactional path. Pattern name to say out loud: weak consistency at the edge, a strong-consistency choke point at the money.

**Bank balance — linearizable writes + serializable transactions where invariants live, but nuanced.** The invariant "no double-spend of the same funds" needs read-modify-write atomicity: conditional writes/CAS or serializable transactions on the ledger — this is where you cite strict serializability if transfers span accounts. But senior candidates add the real-world nuance: banking as practiced is *not* globally linearizable — ATMs authorize offline within limits, cross-bank transfers settle asynchronously — because the industry has a mature compensation layer (overdrafts, reversals, reconciliation). So the precise engineering answer: **the ledger's append and the invariant checks are strictly consistent; the wider workflow is eventual-with-compensation.** Anomaly cost is asymmetric: showing a minutes-stale *balance read* is tolerable; *accepting* two withdrawals against the same funds is not. Writes strong, reads tunable.

**Social feed — eventual + session guarantees + per-user causal.** Global linearizability of a fanout to millions of followers is absurd on latency and cost, and nobody can even *observe* whether follower #4M saw the post 3s "late." What users do observe: their **own** post vanishing after submit (needs read-your-writes), items disappearing on refresh (needs monotonic reads), replies before parents (needs causal order within a thread). So: eventually consistent fanout, session tokens for the author, causal ordering scoped to conversation threads. Counters (likes) are CRDT-ish merged counts where being off by a few is invisible.

Compact decision heuristic, closing the module:

1. **Name the invariant** the system must never violate (unique username, non-negative stock, at-most-once charge). Invariant ⟹ some linearizable/CAS point *at that invariant*, and nowhere else.
2. **Price each anomaly** (stale read? lost write? duplicate action?) in dollars/trust. Only pay coordination for anomalies that cost more than the latency/availability they'd consume.
3. **Check compensability.** If an anomaly can be detected and repaired after the fact (refund, apology email, merge), eventual + compensation usually beats prevention. If it can't (leaked secret, double-shipped physical goods without recall), pay for prevention.
4. **Scope the strong part narrowly.** The best systems are AP almost everywhere with a small, explicit CP core — not uniformly "strong" (slow, fragile) or uniformly "eventual" (subtly wrong).

**Production war story:** A customer's ordering platform put its *entire* order pipeline — cart, pricing, inventory, checkout — behind a strongly consistent, single-region SQL cluster "because orders are money." During a 25-minute AZ network event the whole storefront went down: carts, browsing, everything, for an invariant that only mattered at the final "place order" click. We re-partitioned it: carts and catalog went eventually consistent and multi-region (kept selling through the next partition), while checkout kept its serializable transaction. Revenue impact of the next comparable incident: a queue of delayed checkouts instead of a dead site. CAP was never the whole system's property — it was a property we had accidentally applied to the whole system.

---

### Q19. Rapid-fire round: five short questions interviewers use to probe depth. Answer each in 2-4 sentences.

**Answer:**

**(a) Is a system using Raft automatically linearizable for reads?** No. Raft makes the *log* linearizable; a leader serving reads from local state without confirming leadership (heartbeat/ReadIndex/lease) can serve stale reads while deposed — a partitioned old leader that doesn't know it's been replaced. etcd's ReadIndex exists precisely to close this hole.

**(b) Client reads from a follower in a "CP" system — what did you just get?** You silently downgraded to (at best) sequential/consistent-prefix reads, possibly worse. ZooKeeper's local reads are the canonical example. "CP" described the write path; your read path opted out.

**(c) Does TCP being 'reliable' mean partitions don't lose messages?** No — TCP retransmits within a connection, but timeouts, connection resets, and routing failures still manifest as arbitrary message loss/delay *at the distributed-algorithm level*. Also, a long GC pause is indistinguishable from a partition to everyone else; partitions include time, not just wires.

**(d) Can you have causal consistency with total availability during partitions?** Yes — causal is (provably, per Mahajan et al.'s real-time causal result) at the strong end of what's achievable while staying available and partition-tolerant, which is why it's the design target for AP systems that want to feel sane. Linearizability is not achievable under those constraints — that's just CAP restated.

**(e) Your monitoring shows zero partitions last year — can you ignore the P branch?** No: partial partitions (A sees B, B sees C, A doesn't see C), asymmetric links, and pause-induced pseudo-partitions rarely show up in naive monitoring, and the E branch of PACELC is charging you latency every single day regardless. Design for the branch, don't gamble on its frequency.

---

### Q20. A quorum write with W=2 (N=3) times out. What state is the system in, and what may the client safely do?

**Answer:**

The state is **unknown and unrolled-back** — this is the sharpest edge of leaderless quorums and a favorite follow-up after the R+W>N math:

- Maybe 0, 1, or 2 replicas applied the write before the timeout. The client cannot know which.
- The write is **not aborted**. Dynamo-style writes have no prepare/abort phase; any replica that received it keeps it, and read repair or anti-entropy may *propagate* it to the remaining replicas later. A "failed" write can therefore become the system-wide visible value minutes after the client saw an error.
- Conversely, a concurrent successful write with a higher timestamp can bury it forever.

```
Client ──write(x=v, W=2)──▶ n1 ✔ applied
                            n2 ✖ (slow — never acked in time)
                            n3 ✖ (down)
Client ◀── TIMEOUT (only 1 ack, W=2 not met)

Later:  read repair copies v from n1 to n2, n3
        └─▶ the "failed" write is now the value everyone sees
```

Safe client behavior: treat the timeout as **indeterminate**, and retry **only if the write is idempotent** — same client-supplied timestamp/ID so the retry deduplicates, or a naturally idempotent operation (set-add, CRDT merge, absolute-value write rather than increment). "Insert exactly one row on quorum timeout" is unachievable in this model without a compare-and-set primitive (Cassandra LWT / Paxos round).

**Interview trap:** answering "the write failed, so nothing happened." In quorum systems there is no atomic abort; *an error response bounds your knowledge, not the system's state.* Delivering that sentence verbatim usually ends the line of questioning.

---

### Q21. How do you *verify* a consistency claim rather than trust the vendor's documentation?

**Answer:**

Senior engineers treat consistency claims as testable hypotheses, at three levels:

1. **Jepsen-style black-box testing.** Generate concurrent operations against the system while injecting faults — partitions via iptables, process pauses via SIGSTOP (simulating GC), clock skew — record the complete operation history, and feed it to a checker: Knossos/Porcupine for linearizability, elle for transactional anomalies. A long list of databases' marketing claims have died exactly this way; reading a system's Jepsen report before adopting it is table stakes for an FDE recommending stacks to customers.
2. **Production invariants and staleness SLOs.** (a) Background invariant checkers that scan for violations (negative balances, duplicate "unique" values, orphaned children) and alert — they convert silent consistency bugs into pages. (b) Replication-lag histograms (`pg_stat_replication`, consumer lag) tied to SLOs, because "eventual" is only acceptable with a measured "usually converges within X ms". (c) Active write-then-read probes from multiple regions measuring *actual* read-your-writes behavior end-to-end.
3. **Chaos drills against the application, not just the database.** Partition a replica set in staging and watch what *your* code does. The database honoring its model does not mean your caches, retries, and failover logic preserve that model end-to-end — and most real consistency incidents live in that gap: a cache in front of a linearizable store demotes it to eventual; a retry resubmits a non-idempotent write; a load balancer spreads a session across replica pools and breaks monotonic reads.

**Production war story:** we backed a kill-switch feature-flag service with etcd — linearizable, quorum reads, textbook CP. Every client library also had a 30-second in-process cache. During an incident, flipping the kill switch "didn't work" for 30 agonizing seconds, because the *effective* consistency model of a system is the weakest model of any component on the read path, caches included. We added a pub/sub invalidation channel and re-documented the flag SLA honestly: "eventual, converges ≤ 2s."

**Interview trap:** describing consistency verification purely as "we'd run Jepsen." Jepsen validates the database; the interviewer is usually probing whether you know that *your application layer* is where the model actually breaks. Mention the cache-demotion failure mode and you've answered the real question.

---

## Cheat Sheet — 30 Seconds Before the Interview

```
CAP:      During a partition: linearizability XOR total availability.
          "CA distributed system" = category error. P = the network is
          allowed to be a network; you don't opt out.
PACELC:   Partition -> A vs C;  Else -> Latency vs C.
          Dynamo/Cassandra: PA/EL.  Spanner/etcd/ZK/Mongo: PC/EC.
Spectrum: Strict serializability > linearizability | serializability
          > sequential > causal > session guarantees > eventual.
          Linearizable = single object + real time.
          Serializable = multi object + any order.  Strict = both.
Quorums:  R+W>N -> read/write quorums overlap (fresh-ish reads).
          W>N/2 -> concurrent write quorums overlap (no dual accept).
          Still NOT linearizable: sloppy quorums, partial writes,
          racing read-repair, LWW clock skew.
Choosing: Find the invariant -> put a small CP core exactly there;
          make everything else AP + session guarantees + compensation.
Gotchas:  S3 strongly consistent since Dec 2020. GSIs: eventual only.
          ZK reads stale by default. Redis failover != linearizable.
```
