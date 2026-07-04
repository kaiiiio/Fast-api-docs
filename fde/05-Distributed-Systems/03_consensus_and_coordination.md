# Lesson 5.3 — Consensus & Coordination

> Module: Distributed Systems | Level: Senior/Staff | FDE Prep

Consensus is the problem of getting a group of machines that can crash, pause, and lose messages to agree on a single value — and it underpins everything that matters in a distributed system: who is the leader, what order writes happened in, who holds the lock. Senior interviews rarely ask you to recite Raft; they ask you to walk a partition scenario step by step and explain why the minority side cannot commit, or why a Redis lock is not safe for correctness. This lesson builds that muscle: the theory just deep enough (FLP, quorums), Raft mechanics properly, Paxos for contrast, and then the practical layer — etcd, ZooKeeper, distributed locks, fencing tokens, and split-brain — where FDE work actually happens.

---

## Why Consensus Is Hard

### Q1. Define the consensus problem precisely. What properties must a solution satisfy?

**Answer:**
Consensus: N processes each propose a value; all non-faulty processes must **decide** on a single value such that:

1. **Agreement** — no two non-faulty processes decide different values. This is the safety core; violating it is split-brain.
2. **Validity (integrity)** — the decided value must be one that was actually proposed. This rules out trivial "solutions" like "always decide 0". If the only proposal was `x=5`, the system cannot decide `x=7`.
3. **Termination (liveness)** — every non-faulty process eventually decides. A protocol that stalls forever technically never violates agreement, but it is useless.

The tension is always **safety vs liveness**. It is easy to be safe by never deciding (do nothing), and easy to be live by deciding recklessly (first message wins — but two nodes may see different "first" messages). The entire design space of Paxos, Raft, ZAB, and Viewstamped Replication is about being safe *always* and live *whenever the network cooperates*.

In practice you rarely decide one value; you decide a **sequence** of values — a replicated log. Agreeing on a log means agreeing, for each index, on which command sits there. Feed that log into identical deterministic state machines and you get **state machine replication**: N machines that behave like one fault-tolerant machine. That is what etcd, ZooKeeper, and Kafka's KRaft controller quorum actually are.

**Interview trap:** Candidates say "consensus means all nodes have the same data." No — replication gives you copies; consensus gives you *agreement on order under failures*. You can replicate asynchronously with no consensus at all (and diverge under partition). Consensus is specifically the machinery that prevents two nodes from ever committing conflicting decisions at the same log index, even while leaders crash mid-write.

---

### Q2. What does the FLP impossibility result say, and how do real systems get around it?

**Answer:**
FLP (Fischer–Lynch–Paterson, 1985): **in a fully asynchronous system, no deterministic consensus protocol can guarantee termination if even one process may crash.** Asynchronous means there is no bound on message delay or processing speed.

The intuition, which is what interviewers want:

- In an asynchronous network you **cannot distinguish "crashed" from "slow."** A node that hasn't answered in 10 seconds might be dead, or GC-paused, or behind a congested switch.
- Suppose you wait for the slow node: if it is actually dead, you wait forever — termination violated.
- Suppose you give up and decide without it: if it was merely slow, it may wake up holding state from an earlier round and, in some interleaving, decide differently — agreement violated.
- FLP formalizes this: there is always some "bivalent" state (both outcomes still possible) from which an adversarial scheduler can delay exactly the right message to keep the system undecided forever. Any deterministic protocol has such an execution.

Crucially, FLP kills *guaranteed* termination, not *practical* termination. Real systems dodge it three ways:

1. **Partial synchrony.** Assume the network is asynchronous for a while but eventually behaves (bounded delays hold "after some unknown time"). Raft and Paxos are safe *always* and terminate *once the network stabilizes*. Safety never depends on timing; only liveness does. This is the single most important sentence in this answer.
2. **Randomization.** Raft's randomized election timeouts (and academically, Ben-Or's randomized consensus) break the adversarial scheduler: it cannot keep engineering exact ties if timeouts are random. Termination becomes probability-1 rather than guaranteed.
3. **Failure detectors.** Encode timing assumptions in an oracle ("I suspect node B is dead"). An eventually-accurate detector (◇S) suffices for consensus. Raft's heartbeat timeout *is* a crude failure detector — sometimes wrong (a slow leader gets deposed), but wrong detections only cost availability (an extra election), never correctness.

**Interview trap:** "FLP says consensus is impossible, so Raft must be cheating." Wrong on two counts. First, FLP is about the *fully asynchronous* model; Raft assumes partial synchrony. Second, Raft never sacrifices safety — during a bad network it simply may not make progress (no leader stays elected), which FLP permits. Impossibility of guaranteed termination, not impossibility of consensus in practice.

A useful mental model to close with: every practical consensus system draws the same line — **timing assumptions may gate progress, never correctness.** When you evaluate any coordination design in an interview (Redlock, lease reads, heartbeat failover), ask "what breaks if a clock drifts or a process pauses for 60 seconds?" If the answer is "we stall," the design is FLP-respecting; if the answer is "two nodes both think they won," the design has smuggled a synchrony assumption into its safety argument — the root defect in most broken locking schemes (Q18–Q19).

---

### Q3. Why can't two nodes solve consensus or failover safely on their own? Why do clusters have odd sizes?

**Answer:**
**Two nodes:** imagine primary A and standby B with a heartbeat between them. The link partitions. B stops hearing A. Two indistinguishable worlds:

- A is dead → B *must* promote itself, or you have no availability.
- A is alive but unreachable → B *must not* promote itself, or you have two primaries (split-brain).

B cannot tell these apart (that's Q2's crashed-vs-slow problem), and neither can A about B. Any deterministic rule either loses availability in world 1 or loses safety in world 2. There is no majority possible: 1 out of 2 is not a majority, and requiring both nodes means any single failure halts the system. You need a **tiebreaker** — a third node, a witness/quorum disk, or an external arbiter (this is exactly why "2-node HA" products always hide a third vote somewhere: a witness VM, a cloud arbiter, a shared SCSI reservation).

**Quorum = majority.** Any decision requires ⌈(N+1)/2⌉ votes. Two majorities of the same cluster must overlap in at least one node, so two partitioned sides can never both assemble a quorum — at most one side of any partition can make decisions. That overlap is the entire trick.

**Odd sizes:** an even node count buys you nothing. Majority of 4 is 3, so a 4-node cluster tolerates 1 failure — same as 3 nodes, but with an extra machine, more replication traffic, and one more thing that can fail. Worse, 4 nodes can split 2–2 and *neither* side has quorum: total unavailability. Odd sizes maximize fault tolerance per node:

| Cluster size | Quorum (majority) | Tolerated failures (f) | Notes |
|---|---|---|---|
| 1 | 1 | 0 | No fault tolerance; fine for dev |
| 2 | 2 | 0 | Worse than 1 node: two SPOFs, split-brain risk if misconfigured |
| 3 | 2 | 1 | Minimum useful HA cluster |
| 4 | 3 | 1 | Same tolerance as 3, more cost, 2–2 deadlock possible |
| 5 | 3 | 2 | Standard for critical control planes (etcd, ZooKeeper) |
| 7 | 4 | 3 | Diminishing returns; every write waits on a larger quorum |

Beyond 5–7 voters, write latency and leader fan-out degrade; systems add non-voting **learners/observers** (etcd learners, ZooKeeper observers) to scale reads without growing the quorum.

---

### Q4. Why does tolerating f crash failures require 2f+1 nodes?

**Answer:**
Work it from both directions:

- **Liveness direction:** if f nodes may be down, the remaining N − f must still form a quorum, i.e. N − f ≥ ⌈(N+1)/2⌉ → N ≥ 2f + 1. With N = 2f you'd need f+1 alive out of the remaining f... impossible.
- **Safety direction:** suppose N = 2f and you let a group of f nodes decide (to stay live under f failures). Partition the cluster f | f. Each side believes the other f nodes are "failed" and decides independently — two disjoint decision groups, agreement gone. With N = 2f+1, any decision group of f+1 overlaps every other decision group in ≥1 node; that shared node carries the history (its vote, its accepted log entries) that forces consistency between rounds.

Concretely in Raft terms: a committed entry lives on a majority. Any future leader must win a majority of votes. The two majorities intersect, and the voting rule (Q11) ensures the intersecting node's log vetoes any candidate missing the committed entry. Quorum intersection + a rule that exploits the intersection = safety.

Two footnotes worth volunteering:

- This is for **crash faults**. Byzantine faults (nodes lying, e.g. blockchain settings, corrupted replicas) require **3f+1** nodes (PBFT), because a liar can tell different stories to different quorums and you need honest majorities inside every intersection.
- 2f+1 is about the **voting set**, not total fleet size. A 100-node Kafka cluster might have a 5-node KRaft controller quorum; only the 5 count for f.

**Interview trap:** "We have 6 etcd nodes for extra safety." Quorum of 6 is 4, tolerating 2 failures — identical to 5 nodes, with a worse failure mode (3–3 partition = nobody has quorum) and slower writes. If someone proposes an even-sized voter set, the correct move is to make one node a non-voting learner or drop it.

---

## Raft, Properly

### Q5. Describe Raft's node states, terms, and why election timeouts are randomized.

**Answer:**
Every Raft node is in one of three states:

- **Follower** — passive. Answers RequestVote and AppendEntries RPCs. Resets its election timer whenever it hears from a valid leader (or grants a vote).
- **Candidate** — a follower whose election timer expired. It increments its term, votes for itself, and solicits votes.
- **Leader** — won a majority. The only node that accepts client writes; sends periodic heartbeats (empty AppendEntries) to suppress new elections.

```
                 times out,                receives majority
                 starts election           of votes
   +----------+ ----------------> +-----------+ ------------> +--------+
   | Follower |                   | Candidate |               | Leader |
   +----------+ <---------------- +-----------+               +--------+
        ^        discovers current     |  times out (split vote):  |
        |        leader or newer term  |  new election, term++     |
        |                              v                           |
        +------ discovers node/RPC with higher term ---------------+
                (leader steps down to follower)
```

**Terms** are Raft's logical clock: a monotonically increasing integer. Each term has *at most one* leader (possibly zero, if an election fails). Every RPC carries the sender's term; a node that sees a higher term immediately adopts it and reverts to follower, and a node that sees a *lower* term rejects the RPC. This single rule retires stale leaders everywhere: an old leader returning from a partition sends AppendEntries with its old term, gets rejected with the newer term, and steps down. Terms replace wall clocks entirely — Raft's safety never depends on synchronized time.

**Randomized election timeouts** (e.g. uniform in 150–300 ms): if all followers used the same timeout, a leader crash would make them all become candidates in the same instant, all vote for themselves, and split the vote — every round, forever. This is precisely FLP's adversarial schedule happening naturally. Randomization staggers the wake-ups so that usually one candidate gets a head start, collects a majority before rivals wake, and wins. Split votes still happen (Q7) but each retry re-randomizes, so persistent ties have probability approaching zero. Rule of thumb: broadcast RTT ≪ election timeout ≪ MTBF, and heartbeat interval ≈ timeout/10.

Two details that signal depth:

- **Persistent vs volatile state.** Before answering any RPC, a node must have fsynced `currentTerm`, `votedFor`, and its log entries. Why: if S2 votes for a candidate in term 5, crashes, restarts with `votedFor` lost, and votes for a *different* candidate in term 5, two leaders can win the same term — agreement gone. `commitIndex` and `lastApplied` may be volatile; they are rediscovered safely after restart. "What must Raft persist and why" is a common senior follow-up, and the answer is exactly the set of facts other nodes may have already acted on.
- **Pre-vote and check-quorum** (standard extensions, both in etcd). Pre-vote: before incrementing its term, a would-be candidate asks "would you vote for me?" without changing state; only on a majority of yeses does it start a real election. This stops a flaky, partitioned node from endlessly bumping its term and — on rejoining — forcing a needless election with its inflated term (the "disruptive rejoiner" problem). Check-quorum makes a leader step down if it hasn't heard from a majority within an election timeout, bounding how long a partitioned leader can even *believe* it leads — which tightens the stale-read window from Q11/Q12.

---

### Q6. Walk through a Raft leader election step by step with 5 nodes.

**Answer:**
Cluster: S1–S5, all followers in term 3, S1 is leader. S1's process is killed.

1. **Heartbeat loss.** S1's heartbeats (every ~50 ms) stop. Each follower's randomized election timer keeps counting; nothing resets it.
2. **Timeout.** S3's timer (say 210 ms) fires first — the others drew longer timeouts. S3 transitions to candidate.
3. **Candidate setup.** S3 increments its term 3 → 4, votes for itself (persisting `votedFor=S3, currentTerm=4` to disk *before* sending anything — this ordering matters for crash safety), and resets its own timer.
4. **RequestVote broadcast.** S3 sends `RequestVote(term=4, candidateId=S3, lastLogIndex=17, lastLogTerm=3)` to S2, S4, S5 (and S1, which is dead).
5. **Voting rules at each receiver.** A node grants the vote iff:
   - `args.term ≥ currentTerm` (it first adopts term 4 if it was behind), and
   - it has not already voted for someone else in term 4 (**one vote per term**, persisted to disk so a crash-restart can't double-vote), and
   - the candidate's log is **at least as up-to-date** as its own: compare last log terms; if equal, compare last log indexes. This check is the safety linchpin (Q11).
6. **Majority.** S2 and S4 grant votes. With S3's own vote that's 3/5 — majority. S3 becomes leader for term 4 *immediately* (no waiting for S5).
7. **Assert leadership.** S3 instantly broadcasts heartbeats `AppendEntries(term=4, entries=[])`. S5, which was ~20 ms from timing out, hears term 4, resets its timer, follows. Any concurrent candidate seeing term 4 steps down.

```
        Raft leader election, 5 nodes (RequestVote message flow)

   S1(dead)     S2           S3            S4           S5
      x          |            |             |            |
      x          |     [election timeout fires]          |
      x          |            | term 3 -> 4, vote(S3)    |
      x          |<-----------+  RequestVote(t=4,        |
      x          |            |    lastLogIdx=17,        |
      x          |            +------------>|  lastLogTerm=3)
      x          |            +------------------------->|
      x          |            |             |            |
      x          +----------->|  VoteGranted(t=4)        |
      x          |            |<------------+  VoteGranted(t=4)
      x          |            |== majority: S3,S2,S4 = 3/5 ==> LEADER
      x          |            |             |            |
      x          |<-----------+  AppendEntries(t=4, heartbeat)
      x          |            +------------>|            |
      x          |            +------------------------->|  (S5's vote
      x          |            |             |            |   now moot)
```

Total unavailability window: one election timeout plus one round trip — typically well under a second with default tunings. Note what did *not* happen: nobody consulted a wall clock, and S3 didn't need all 5 votes.

**Interview trap:** "The node with the most up-to-date log becomes leader." Not quite — Raft elects *any* candidate whose log is at least as up-to-date as **each voter in its majority**, which guarantees it holds all *committed* entries, but it may lack some *uncommitted* ones (which are then legitimately discarded). Raft optimizes for understandability, not for electing the maximal log; that's more of a ZAB/VR flavor.

---

### Q7. Show a split-vote scenario and how Raft recovers.

**Answer:**
Same 5-node cluster, leader S1 dies in term 3. This time S2 and S4 draw nearly identical timeouts and become candidates almost simultaneously.

```
            Split vote in term 4, resolved in term 5

   S1(dead)    S2(cand)       S3          S4(cand)       S5
      x          | t=4,vote(S2) |            | t=4,vote(S4) |
      x          +------------->|            |              |
      x          |  ReqVote(t=4)|<-----------+ ReqVote(t=4) |
      x          |              |            +------------->|
      x          |<-------------+ granted    |              |
      x          |   (S3 voted S2 first)     |<-------------+ granted
      x          |              |            |  (S5 voted S4)
      x          |              |            |              |
      x          |-- S2: {S2,S3} = 2/5  no majority         |
      x          |              |  S4: {S4,S5} = 2/5  no majority
      x          |              |            |              |
      x          |      ...both wait, election times out... |
      x          |              |            |              |
      x          |   [S4 draws shorter random timeout]      |
      x          |              |<-----------+ ReqVote(t=5) |
      x          |<--------------------------+ ReqVote(t=5) |
      x          +-------------------------->| granted(t=5) |
      x          |  granted     |----------->| granted      |
      x          |              |            +------------->| granted
      x          |              |   S4: 4/5 votes ==> LEADER term 5
```

Step by step:

1. S2 and S4 both increment to term 4 and vote for themselves. Their votes for each other are refused (`votedFor` already set).
2. S3's RequestVote from S2 arrives first → S3 votes S2. S5 hears S4 first → votes S4. Tally: S2 has 2, S4 has 2, one vote wasted on the dead S1's absence. Nobody reaches 3.
3. Neither candidate can win term 4, and neither steps down (equal terms). They simply wait out a fresh **randomized** election timeout.
4. The re-randomization is the fix: the odds both draw near-identical timeouts *again* shrink geometrically. Here S4 fires first, increments to term 5, and now S2 and S3 have not yet voted in term 5 — they grant. S4 wins 4/5 and heartbeats.
5. S2, seeing term 5, reverts to follower.

Two details interviewers probe: (a) term 4 simply *has no leader* — that's allowed; "at most one leader per term" includes zero; (b) if timeout ranges are too narrow relative to network RTT (e.g. 150–155 ms with 40 ms RTTs), split votes recur repeatedly and the cluster livelocks — this is the practical residue of FLP, fixed by widening the randomization window, not by any correctness change.

**Production war story:** A team ran a 5-node coordination cluster stretched across two DCs with a 40 ms link, but kept the stock LAN election timeouts. Every minor link-latency spike caused remote followers to time out, start elections, and split votes with each other; elections took 5–10 rounds, and during each storm writes stalled cluster-wide. The metadata store was "down" several minutes a day with all ten... five nodes healthy. Fix: raise election timeout to ~10x cross-DC RTT and widen the randomization band. Lesson: Raft's liveness is a *tuning* property; its safety is not.

---

### Q8. Walk through Raft log replication end to end: from client write to applied state.

**Answer:**
Setup: S3 leads term 5; followers S1, S2, S4, S5. Client sends `SET x=7`.

1. **Client → leader.** Followers redirect clients to the leader (they know it from heartbeats).
2. **Leader appends locally.** S3 appends `{index:18, term:5, cmd:"SET x=7"}` to its own log. **Not committed** — a log entry is a proposal, not a decision.
3. **AppendEntries fan-out.** S3 sends each follower `AppendEntries(term=5, prevLogIndex=17, prevLogTerm=4, entries=[{18,5,SET x=7}], leaderCommit=17)`.
4. **Consistency check at followers.** A follower accepts only if *its own* log has an entry at index 17 with term 4. If yes: append entry 18 (truncating any conflicting suffix first), fsync, ack. If no: reject — its log has diverged and must be repaired first (Q9).
5. **Majority ack → commit.** Acks come back from S1 and S4. Entry 18 is now on {S3, S1, S4} = 3/5. S3 advances `commitIndex` to 18. Committed = "on a majority, in the current leader's term" — durable against any f=2 failures, because every future leader's majority must intersect this one.
6. **Apply + reply.** S3 applies `SET x=7` to its state machine and replies success to the client. Only now has the write "happened" from the client's viewpoint.
7. **Followers learn the commit lazily.** The next AppendEntries (or heartbeat) carries `leaderCommit=18`; followers advance their own commitIndex and apply entry 18. No extra round trip — commit propagation piggybacks. So the client sees success after **one round trip to a majority**, while stragglers (S2, S5) catch up asynchronously.

```
     Raft log replication (AppendEntries + commitIndex advancing)

 Client      S1          S2(slow)      S3=LEADER        S4          S5
   |          |             |              |             |           |
   |--------- SET x=7 --------------------->|             |           |
   |          |             |   append idx18(t5) locally  |           |
   |          |<------------------ AppendEntries ---------+---------->|
   |          |             |   (prev=17/t4, entry 18, leaderCommit=17)
   |          |--ack------->|              |<---ack-------+           |
   |          |         (no ack yet)      |             |     (ack late)
   |          |             |     acks: S3+S1+S4 = 3/5 majority       |
   |          |             |     commitIndex: 17 -> 18               |
   |          |             |     apply SET x=7 to state machine      |
   |<-------- OK ---------------------------|             |           |
   |          |             |              |             |           |
   |          |<------ next heartbeat: leaderCommit=18 --+---------->|
   |          | apply 18    |  (repair/catch-up)         | apply 18  |
```

**Interview trap:** "The leader waits for all followers." No — majority only. Waiting for all would make availability *worse* than a single node (any one slow follower stalls every write). Conversely, "replied to client" ≠ "applied on every replica": a read hitting follower S2 right after the client's OK can see stale state — which is exactly why linearizable reads need ReadIndex or leases (Q12), and why "read from any etcd member" defaults to going through the leader.

---

### Q9. How does Raft repair a divergent follower log? Explain the Log Matching property and nextIndex backoff.

**Answer:**
**Log Matching property:** if two logs have an entry with the same index and same term, then (a) the entries are identical and (b) *all preceding entries are identical too*. It holds inductively: a leader creates at most one entry per (index, term), and every AppendEntries carries `prevLogIndex/prevLogTerm` — a follower only accepts if its previous entry matches, so a matching entry certifies the whole prefix. One integer comparison verifies an arbitrarily long prefix.

Divergence happens when leaders crash with unreplicated entries. Example: old leader S2 (term 4) appended indexes 18–20 locally, replicated nothing, crashed. S3 wins term 5 and starts writing its own 18.

Repair protocol — the leader **never rewrites its own log**; followers are forced to conform:

1. Leader keeps a `nextIndex[]` per follower, optimistically initialized to leader's `lastLogIndex + 1` (here 19... say leader is at 21, so 22).
2. AppendEntries to S2 with `prevLogIndex=21, prevLogTerm=5` → S2 has no matching entry 21 → **reject**.
3. Leader decrements `nextIndex[S2]` and retries: prev=20 → S2's entry 20 has term 4, not 5 → reject. Prev=19 → mismatch → reject. Prev=17 (term 4 on both) → **match**.
4. S2 **truncates** its conflicting suffix (its old 18–20, term-4 entries) and appends the leader's 18–21. Those truncated entries were never committed — they never reached a majority under a legitimate leader — so deleting them is safe; the client that wrote them never got an ack, and correct clients treat "no ack" as "unknown, retry idempotently."
5. Practical optimization: decrementing one index at a time is O(divergence) round trips; real implementations return the conflicting term and its first index so the leader can skip the whole term in one hop. etcd does this; so does the Raft dissertation's suggested scheme. A very stale follower is instead sent a **snapshot** (InstallSnapshot) when the leader has already compacted the needed log prefix.

The end state is the leader's log prefix mirrored everywhere — "the leader's log is the truth, followers converge to it" is the slogan, but the precise claim is stronger: it's safe *because* election rules guarantee the leader's log already contains every committed entry.

---

### Q10. Why can a Raft leader only commit entries from its own term? Explain the Figure-8 scenario.

**Answer:**
The rule: a leader may advance `commitIndex` over an old-term entry **only indirectly**, by committing an entry of its *current* term on a majority; the old entry then commits transitively (Log Matching covers the prefix). Counting replicas of an old-term entry and declaring it committed is unsafe. The Raft paper's Figure 8 shows why — this is the most-probed subtlety in Raft interviews. Five nodes S1–S5; cell = term of entry at that index:

```
                 idx:   1    2                      1    2    3
  (a) term 2: S1 leads          (b) S1 crashes; S5 wins term 3
      S1 [1] [2]  <-- leader        with votes from S3,S4,(S5)
      S2 [1] [2]                    S5 appends its own idx2, term 3
      S3 [1]                    S1 [1][2]     (down)
      S4 [1]                    S2 [1][2]
      S5 [1]                    S3 [1]
                                S4 [1]
                                S5 [1][3]  <-- leader term 3
  ---------------------------------------------------------------
  (c) S5 crashes; S1 returns, wins term 4, keeps replicating
      the OLD term-2 entry at idx 2:
      S1 [1][2][4?]  <-- leader term 4
      S2 [1][2]
      S3 [1][2]   <-- idx2(term2) now on S1,S2,S3 = MAJORITY.
      S4 [1]          Committed? NO. Here is why:
      S5 [1][3]      (down)
  ---------------------------------------------------------------
  (d) If S1 had counted idx2(term2) as committed, then crashed:
      S5 can STILL win term 5 with votes from S2? no -- from S3,S4:
      wait: S5 lastLog = (idx2, term3) beats S3 (idx2, term2)
      and S4 (idx1, term1)  => S5 elected, OVERWRITES idx 2
      S5 [1][3][...]  everyone truncates idx2 to term-3 entry
      => a "committed" entry vanished. Agreement violated.
  ---------------------------------------------------------------
  (e) The fix: S1 (term 4) first replicates a NEW term-4 entry
      at idx 3 to a majority:
      S1 [1][2][4]
      S2 [1][2][4]
      S3 [1][2][4]   <-- idx3(term4) on a majority
      Now S5 (lastLogTerm=3) can never outvote this majority
      (3 < 4), so idx 2 AND idx 3 are safely committed together.
```

Step-by-step logic of the danger in (c)–(d): the term-2 entry reached a majority, but its *term is old*. S5's log ends in term 3 > term 2, so the up-to-date voting check still lets S5 beat S1's supporters that only have the term-2 entry — the vote comparison looks at the **last** entry's term, and S5's is newer. So "on a majority" is not sufficient for commit; "on a majority *with the leader's current term as the latest entry*" is, because any rival's last-log term is then strictly lower and it can never assemble a quorum.

Consequence you should volunteer: a fresh leader cannot serve its guarantees until it commits *something* in its new term, so real implementations (etcd, and as recommended in the Raft dissertation) have a new leader immediately append a **no-op entry** in its term. That flushes the commit pipeline, indirectly committing all inherited entries, and is also what makes ReadIndex reads (Q12) safe right after an election.

---

### Q11. How exactly does Raft prevent split-brain? Walk through a network partition.

**Answer:**
Two independent guards, one on each path:

- **Election path:** winning requires a majority of votes, and votes are refused to candidates whose log is not at least as up-to-date (last-term, then last-index comparison). Majority ⇒ at most one leader per term. Up-to-date check ⇒ that leader has every committed entry, since it beat a majority and committed entries live on a majority — the quorums intersect.
- **Write path:** committing requires majority acks, and every AppendEntries carries the leader's term; any node with a higher `currentTerm` rejects it. So a deposed leader can still *accept* client requests into its log, but can never *commit* them.

Partition scenario, 5 nodes, S1 leading term 2. The network splits {S1, S2} | {S3, S4, S5}:

```
        Partition/split-brain scenario: why the minority cannot commit

   MINORITY SIDE (2/5)          ||          MAJORITY SIDE (3/5)
                                ||
   S1 leader(term 2)   S2       ||    S3           S4           S5
    |                   |       ||     | election timeout fires |
    |  still accepts client     ||     | term 2->3, RequestVote |
    |  writes! appends idx 8,9  ||     |<---------->|<--------->|
    |                   |       ||     |  S3 wins 3/3 = majority|
    |--AppendEntries--->| ack   ||     |  LEADER term 3         |
    |  idx8: 2/5 acks           ||     |                        |
    |  NO MAJORITY              ||     |--client writes idx 8'--|
    |  commitIndex STUCK at 7   ||     |  3/5 acks = majority   |
    |  clients time out         ||     |  COMMITTED, cluster    |
    |  (or get "not committed") ||     |  makes progress        |
                                ||
   ----------------------- partition heals -----------------------
    |                                  |
    |--AppendEntries(term=2)---------->|  REJECTED: "term 3 > 2"
    |<--- reply(term=3) ---------------|
    |  S1 steps down to follower, truncates uncommitted 8,9,
    |  adopts S3's log (idx 8' onward). No client was ever
    |  acked for 8,9 => nothing visible was lost.
```

Walk the two sides:

1. **Minority side:** S1 doesn't know it's partitioned; it happily appends client writes and sends AppendEntries. Only S2 acks: 2/5 < 3. `commitIndex` never advances; clients never get success. S1 is a leader that can propose but not decide — annoying, never unsafe.
2. **Majority side:** S3–S5 stop hearing heartbeats, elect S3 in term 3 (they have 3 votes available — a majority of the *full* cluster of 5, not of their partition). S3 commits new writes normally. There *are* two leaders at this moment — but in **different terms**, and only the term-3 one can commit. "At most one leader per term" plus "commit needs a majority" is the actual invariant; "one leader at a time" is the sloppy version.
3. **Healing:** S1's stale-term RPCs are rejected; the rejection carries term 3; S1 steps down and repairs its log via Q9's mechanism. Its uncommitted entries 8, 9 are truncated — safe, because no client was ever acknowledged for them.

**Interview trap:** "During a partition Raft has two leaders, so it's briefly split-brained." Split-brain means two nodes *committing conflicting decisions*, not two nodes *believing* they lead. Raft routinely has a stale leader alive for seconds; it just can't commit anything or (with ReadIndex/lease discipline, Q12) serve linearizable reads. If your interviewer pushes "but the stale leader can serve dirty reads" — yes, a naive implementation that reads its local state machine without a quorum check can serve stale/uncommitted reads, which is precisely why ReadIndex exists.

---

### Q12. What happens to client requests during an election, and how do Raft systems serve linearizable reads efficiently?

**Answer:**
**Writes during an election:** there is no leader, so there is nobody entitled to commit. In-flight writes at the crashed leader are in one of three states: committed-and-acked (durable, the new leader has them), appended-but-uncommitted (may survive or be truncated — client got no ack, outcome unknown), or never-arrived. Clients see timeouts or "leader changed" errors and must **retry idempotently** — etcd clients redirect to the new leader automatically; smart clients attach request IDs so a retry of a write that actually committed isn't applied twice (session/dedup tables in the state machine, exactly what the Raft dissertation's client section prescribes). The unavailability window is one election: sub-second when tuned, and the reason "Raft is CP, not CA" — it chooses consistency and pays with availability during elections.

**Reads are the interesting part.** Naively, a linearizable read must also go through the log (append a read entry, wait for commit) — one disk write and one round trip per read, absurd for read-heavy workloads. Also naively-bad in the other direction: the leader just reading local state is unsafe because it might be a deposed leader in a minority partition (Q11's trap). Two standard fixes:

1. **ReadIndex.** Leader records its current `commitIndex` as the read's watermark, then confirms leadership by exchanging one heartbeat round with a majority (no log append, no fsync), waits until `appliedIndex ≥` the watermark, and serves the read from local state. The quorum round proves no higher term existed when the watermark was taken ⇒ linearizable. Cost: one network round trip per read (batchable across many concurrent reads — etcd batches them), zero disk I/O. One subtlety: right after election the new leader must first commit its no-op (Q10) before its commitIndex is known to be current.
2. **Leader leases.** Leader assumes that after a successful heartbeat round it remains leader for `election_timeout − clock_drift_bound` and serves reads locally with *zero* communication during the lease. Faster, but correctness now depends on **bounded clock drift** — a node with a fast-running clock or a long GC pause can serve stale reads after it was actually deposed. This is the same class of assumption Kleppmann attacks in the Redlock debate (Q19). etcd's default linearizable read path is ReadIndex; lease reads are the opt-in `serializable=false`-but-faster variant in various systems, and several production postmortems trace to lease reads plus clock skew.

Cheap third option to name: **serializable (stale-ok) reads** from any follower — no protocol cost, bounded staleness, fine for dashboards and caches. A senior answer maps read types to needs instead of defaulting everything to linearizable.

---

## Paxos, and Raft vs Paxos

### Q13. Explain Paxos at a high level. Why is Multi-Paxos where the real complexity lives?

**Answer:**
**Single-decree Paxos** decides *one* value among proposers, acceptors, learners. Two phases, driven by unique, totally-ordered **proposal numbers** n (e.g. counter ⊕ node-id):

- **Phase 1 — Prepare/Promise.** Proposer sends `Prepare(n)` to acceptors. An acceptor that has not promised any higher number replies `Promise(n, [highest-numbered proposal it already accepted, if any])` and pledges to ignore anything numbered < n.
- **Phase 2 — Accept/Accepted.** On promises from a **majority**, the proposer must adopt the value of the highest-numbered accepted proposal reported in those promises (only if none exists may it use its own value) and sends `Accept(n, v)`. Acceptors that haven't promised higher accept it. Majority accepted ⇒ **chosen**, forever — any later proposer's Phase 1 majority overlaps the accepting majority, sees v, and is forced to re-propose v.

```
      Single-decree Paxos, happy path (3 acceptors)

 Proposer            A1            A2            A3
    |--Prepare(n=7)-->|------------->|------------->|
    |<--Promise(7, none)--Promise(7, none)          |   (A3 slow --
    |   majority of promises, none carried a value      not needed)
    |   => proposer may use its own value v
    |--Accept(7, v)-->|------------->|------------->|
    |<--Accepted(7,v)---Accepted(7,v)|              |
    |   majority accepted => v is CHOSEN, forever.
    |   Any later Prepare(n>7) majority overlaps {A1,A2},
    |   learns v, and is forced to re-propose v.
```

That "must adopt the highest-numbered accepted value" rule is the entire safety argument, and it's the same quorum-intersection trick as Raft's election restriction — just applied per-decision instead of per-election. Note the built-in liveness hazard: two proposers can duel, each Prepare invalidating the other's Accept, forever — FLP again; the fix is electing a distinguished proposer, i.e., a leader, via timeouts.

**Multi-Paxos** is what you need for a replicated log: run Paxos per log slot. Naively that's 2 phases (4 message delays) per entry. The optimization: elect a stable leader once, run Phase 1 once for *all* slots (a single Prepare covering infinitely many instances), then each log entry is just Phase 2 — one round trip, exactly like Raft's AppendEntries. But the Paxos papers left crucial parts unspecified — leader election details, log gap handling (slots can be chosen out of order!), catch-up of lagging replicas, reconfiguration, snapshotting — so every real Multi-Paxos (Chubby, Spanner) is a mostly-undocumented engineering artifact. Chubby's implementers famously reported the final system resembled the theory only loosely. Raft is best understood as *Multi-Paxos with all those decisions made for you, arranged for understandability*: leader baked into the protocol, no log gaps allowed, commit via commitIndex.

---

### Q14. Compare Raft and Paxos for an interviewer.

**Answer:**
Both solve the same problem with the same quorum-intersection core, equivalent fault tolerance (2f+1), and — once Multi-Paxos has a stable leader — the same steady-state cost (one round trip to a majority per commit). The differences are structural and human:

| Dimension | Raft | (Multi-)Paxos |
|---|---|---|
| Understandability | Explicit design goal; decomposed into election / replication / safety; one paper is buildable | Notoriously hard; single-decree is simple but the log/leader machinery is folklore spread across papers |
| Leader | Baked into the protocol; there is no leaderless Raft | An optimization layered on single-decree; core protocol is leaderless (any proposer may propose) |
| Log structure | Contiguous, no holes; commitIndex is a single high-water mark | Slots chosen independently; gaps possible, must be filled (with no-ops) before applying |
| Log divergence | Follower logs truncated to match leader (Q9) | Acceptors never un-accept; convergence via re-proposal per slot |
| Election safety | Voting rule: candidate log must be up-to-date | New leader learns state in Phase 1 and must re-propose highest accepted values |
| Membership change | Specified: joint consensus, or single-server changes (etcd's approach) | Classically vague; each system invents its own (vertical Paxos etc.) |
| Flexibility | Rigid by design | More room for exotic variants (Flexible Paxos: Phase-1/Phase-2 quorums need only intersect each other, enabling e.g. larger election quorums for smaller write quorums; EPaxos: leaderless, commutativity-aware) |
| Who runs it | etcd, Consul, TiKV, CockroachDB, Kafka KRaft, RabbitMQ quorum queues | Chubby, Spanner, Megastore, Cassandra LWTs (single-decree per key) |

Senior framing: "Raft ≈ Multi-Paxos with the engineering decisions standardized and named." Choose Raft for anything you must build, operate, or debug — the ecosystem, tooling, and hireability are decisive. Know Paxos because (a) interviewers use it to test depth, (b) Flexible/EPaxos ideas show the design space Raft deliberately closed, and (c) Cassandra/Spanner conversations require it.

---

## Where Consensus Lives in Real Systems

### Q15. How does Kubernetes use consensus? What is etcd's role, and how do controllers elect leaders?

**Answer:**
Kubernetes concentrates *all* consensus into **etcd** (Raft):

- **etcd is the only stateful control-plane component.** Every object — Pods, Deployments, Secrets, Leases — is a key in etcd; every write is a Raft log entry committed by the etcd leader through a majority. etcd's `revision` is a cluster-wide monotonic counter incremented per transaction — this doubles as a fencing token source (Q20).
- **kube-apiserver is stateless.** Run five of them behind a load balancer; they're just validating/authorizing proxies over etcd, plus the watch fan-out. All consistency guarantees (optimistic concurrency via `resourceVersion`, which is the etcd revision; watches, which are etcd watch streams) are etcd guarantees surfaced through an API.
- **Controllers use leases, not Raft.** kube-controller-manager and kube-scheduler run in multiple replicas, but only one instance of each may act — otherwise two schedulers double-place pods. They don't run their own consensus; they compete over a **Lease object** (`coordination.k8s.io/Lease` in `kube-system`): each candidate tries to write its identity plus `renewTime` using a compare-and-swap on resourceVersion; the holder renews every ~10 s (`renewDeadline`); others watch, and take over only when `leaseDurationSeconds` (~15 s) elapses without renewal. Losing the ability to renew ⇒ the component *stops working and typically exits* rather than continuing without the lease. The CAS is safe because it bottoms out in an etcd Raft commit — this is the "outsource consensus" pattern (Q17) inside Kubernetes itself.
- Failure geometry follows directly: lose etcd quorum and the cluster becomes **read-only-ish** — running pods keep running (kubelets are autonomous), but nothing can be scheduled, scaled, or updated, and controllers stall. This is why etcd is 3 or 5 nodes, on fast disks (fsync latency is Raft commit latency), and why multi-AZ clusters put one etcd member per zone.

**Interview trap:** "The kube-scheduler leader is elected by Raft." No — only etcd runs Raft. Everything above it uses *lease-based leader election implemented as CAS writes to the consensus store*. The distinction matters because lease-based election is advisory: a paused ex-leader can act briefly after losing its lease, which is why controller actions must be safe to overlap/idempotent (Q22–Q23).

---

### Q16. What roles do ZooKeeper, Consul, and Kafka's KRaft play? What are zxid, ephemeral nodes, and watches?

**Answer:**
**ZooKeeper** runs **ZAB** (ZooKeeper Atomic Broadcast) — Raft-shaped: elected leader, majority commit, epochs instead of terms. Its data model is a small in-memory tree of *znodes*, and three primitives make it a coordination toolkit:

- **zxid** — a 64-bit id on every state change: high 32 bits = leader epoch, low 32 = counter within the epoch. Total order over all writes; monotonically increasing; survives leader changes (new epoch ⇒ higher zxid). Perfect fencing token (Q20).
- **Ephemeral znodes** — deleted automatically when the creating client's *session* dies (missed heartbeats). Whoever holds `create("/leader", ephemeral)` is leader; crash ⇒ znode vanishes ⇒ contenders react. Locks: ephemeral *sequential* children of `/lock`, lowest sequence number holds it, each waiter watches only its predecessor (avoids herd effects).
- **Watches** — one-shot notifications on znode change, so election and lock handoff are push-based rather than polled.

Who sits on it: **Kafka** (historically) kept broker registration, controller election, topic configs, and ACLs in ZooKeeper; **HBase** uses it for master election and region assignment; Hadoop YARN/HDFS for ResourceManager/NameNode HA failover.

**Kafka → KRaft:** ZooKeeper was Kafka's scaling and operational bottleneck — a second distributed system to run, metadata pushed via RPC to brokers, controller failover requiring a full metadata reload, practical ceilings around low hundreds of thousands of partitions. KRaft replaces it with an internal **Raft quorum of controller nodes** whose replicated log *is* the metadata log (`__cluster_metadata`); brokers replicate/consume that log directly, so failover is instant (the new controller already has the state in memory) and metadata scales like a Kafka log — because it is one. ZooKeeper mode was removed entirely in Kafka 4.0. Note the fun inversion: Kafka's *data path* replication (ISR + high-watermark) is still not Raft — consensus is only for metadata.

**Consul** uses Raft among servers for the service catalog, KV store, and **sessions** — its lock primitive: a session with a TTL and health-check binding; `acquire` on a KV key binds it to a session; session invalidation releases the lock. Same shape as ZooKeeper ephemerals and Kubernetes Leases.

The pattern across all four: a small, strongly consistent, consensus-backed core holding *metadata and coordination state*, with the heavy data path built around it using cheaper replication.

---

### Q17. Why don't you run consensus on your data path? Explain the "outsource consensus" pattern.

**Answer:**
Costs of consensus per operation: one round trip to a majority *plus an fsync on a quorum of nodes* for every write; a leader bottleneck (all writes serialize through one node); small practical cluster sizes (3–5 voters); and throughput/latency dominated by the slowest-of-the-fastest-majority disk. That is fine for hundreds-to-thousands of small metadata writes per second. It is catastrophic for a data path doing hundreds of thousands of ops/sec of bulky payloads.

So mature systems split the problem:

- **Consensus tier (small, strong):** cluster membership, config, schema, shard maps, leader-per-shard assignments, locks, fencing tokens. etcd/ZooKeeper/Consul or an embedded Raft group.
- **Data tier (big, cheaper replication):** primary/replica with the *primary chosen and fenced by the consensus tier*, chain replication, ISR-style quorums, or async replication — whatever the workload's consistency needs actually justify.

Examples to reach for: Kafka commits records via ISR high-watermark, not Raft — the controller quorum (KRaft) only decides *who is in the ISR and who leads each partition*. HDFS pushes blocks via pipelines; ZooKeeper only arbitrates which NameNode is active. Kubernetes runs your million pods; etcd only stores the desired/actual state records about them. GFS/Chubby is the ur-example: Chubby (Paxos) does locks and master election; GFS moves the bytes.

The interview-ready formulation: **use consensus to decide who is allowed to act, then let them act cheaply, and make the grant enforceable with fencing tokens** (Q20) so a stale actor can't cause harm. Also state the sharded-DB counterpoint: CockroachDB/TiDB/Spanner *do* run consensus on the data path — but as thousands of *independent* Raft/Paxos groups (one per shard/range), so no single log serializes all writes; the cost is paid per range, and it's a deliberate trade for per-key linearizability.

**Production war story:** A platform team liked etcd so much they used it as a job queue — thousands of enqueue/dequeue writes per second, each a Raft commit with fsync. etcd's backend hit its default storage quota, entered maintenance-required alarm state and rejected writes... and it was the *same* etcd backing their Kubernetes control plane. Deployments froze cluster-wide because a queue filled a metadata store. Fixes: move the queue to Redis/Kafka, keep etcd for coordination only, set quotas + compaction, and never co-tenant "someone's workload" with "the control plane's brain."

---

## Distributed Locks

### Q18. Design a distributed lock on a single Redis. What are its failure modes?

**Answer:**
First, the framing interviewers reward — a distributed lock serves one of two purposes, and the design bar differs enormously (Kleppmann's distinction):

- **Efficiency lock:** avoid duplicate work (two crons both sending the same email batch). If it rarely fails, you do the work twice — wasteful, harmless.
- **Correctness lock:** prevent invariant violations (two writers corrupting a file, double-charging). If it *ever* admits two holders, you corrupt data.

Safety property: at most one holder at a time. Liveness: locks must eventually be acquirable even if a holder crashes — which forces **TTLs**, and TTLs are exactly where safety leaks.

Single-Redis lock, done properly:

```
Acquire (atomic, one command):
  SET lock:orders:1234 <random_token> NX PX 30000
  -- NX: only if not exists (mutual exclusion)
  -- PX 30000: auto-expire in 30s (liveness if holder dies)
  -- random_token: unique per acquisition (e.g. UUID), stored by the client
```

Release must be **compare-and-delete** — check the token and delete atomically, via Lua (Redis runs scripts atomically):

```lua
-- release.lua: delete only if we still own it
if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
else
    return 0
end
```

Why the token+Lua dance: without it, client A's lock expires during a stall, B acquires, A finishes late and calls plain `DEL` — deleting **B's** lock; then C acquires while B still runs. Two failure modes for the price of one. The token makes release "delete *my* lock, not *the* lock."

Remaining failure modes even when implemented perfectly:

1. **TTL vs pause/slowness (the fundamental one).** A stops (GC pause, VM freeze, swap, long I/O, network hiccup) past its TTL; Redis expires the key; B acquires; A resumes *believing it holds the lock*. Two holders. No token-check-on-release fixes this — the damage happens while A is doing protected work, not at release. Only **fencing tokens at the resource** (Q20) fix it.
2. **Redis crash/failover.** Single node: crash loses all locks (or restores stale ones from disk depending on persistence). With a replica + failover: replication is async, so a lock acquired on the master may not have reached the replica when the master dies — promotion ⇒ lock silently gone ⇒ second acquirer. This failure mode is what motivates Redlock (Q19).
3. **Clock/TTL guesswork.** You must size the TTL above your worst-case critical section, which you don't know. Too short ⇒ false expiry; too long ⇒ crashed holders block everyone. Watchdog extension (heartbeat that bumps the TTL, à la Redisson) helps liveness but does nothing for failure mode 1 — a paused client's watchdog is paused too.

Verdict to state crisply: single-Redis `SET NX PX` + token + Lua release is an excellent **efficiency lock** — one round trip, dead simple. It is not a **correctness lock**, and no amount of Redis-side cleverness makes it one.

---

### Q19. Explain Redlock and the Kleppmann–antirez debate. What's the bottom line?

**Answer:**
**Redlock** (antirez) attacks failure mode 2 of Q18 by removing the single point of failure. Setup: N (typically 5) *independent* Redis masters — no replication between them, ideally separate hosts/failure domains. To acquire:

1. Note the current time t1.
2. Try `SET resource token NX PX ttl` on all N masters **sequentially with short per-node timeouts** (so one dead node costs milliseconds, not the TTL).
3. Acquired iff locks obtained on a **majority** (≥ N/2 + 1) *and* the elapsed time (t2 − t1) is well under the TTL. Effective validity = `ttl − (t2 − t1) − clock_drift_allowance`.
4. On failure, release on **all** nodes (including ones that didn't reply — the request may have landed) and retry after random delay.

The quorum means one crashed/partitioned Redis doesn't lose or duplicate the lock. Looks consensus-shaped. Then the 2016 debate:

**Kleppmann's critique ("How to do distributed locking"):**

- **Unbounded process pauses break it regardless of quorum.** Client acquires on 3/5, then GC-pauses (or the VM migrates, or a page fault stalls it) past the TTL; all five keys expire; client B acquires 5/5; A wakes and writes. Two holders. The majority did nothing — the flaw is *client-side*, between "check validity" and "use resource," and no lock service can close that window.
- **It assumes bounded clock drift.** Validity arithmetic uses local clocks; a Redis node whose clock jumps forward (NTP step, admin action, VM restore) expires a key early, letting a second majority form while the first holder is within its computed validity. Redlock thus has *timing-dependent safety* — it silently assumes a synchronous-enough system, which is exactly the assumption distributed-systems theory says you must not make for safety (only for liveness). Compare Raft: bad timing costs Raft availability, never agreement.
- **No fencing tokens.** Redlock produces a random token good for release-matching, not a *monotonically increasing* number the storage layer can compare. Without fencing there is no server-side defense against the paused stale holder. Neither more Redis nodes nor shorter TTLs substitute.

**antirez's response:**

- The clock objection needs only *bounded drift*, not synchronized clocks, and steps can be operationally avoided (slew-only NTP, don't touch clocks); **delayed restarts** (a crashed Redis waits out the max TTL before rejoining) remove the persistence/restart variants of lost locks.
- The pause objection proves too much: a GC pause between acquire-check and first write defeats *any* lock service, ZooKeeper included — the client can't atomically "check then act." So it's not a Redlock-specific flaw.
- If you *can* deploy fencing checks at the resource, you barely need the lock's strong guarantees anyway.

**Fair scoring for interviews:** antirez is right that the pause problem is universal *for lock services alone* — but that's Kleppmann's point, not a rebuttal: the fix is fencing tokens *checked by the resource*, which require a monotonic counter Redlock doesn't provide but ZooKeeper (zxid) and etcd (revision) do for free. And "safety only under bounded drift/pauses" is a genuinely weaker guarantee class than Raft-style asynchronous safety. **Bottom line to say verbatim: Redlock for efficiency locks at most (and honestly, single Redis + NX/PX is usually enough there); for correctness, use a consensus store — etcd lease/lock or ZooKeeper ephemeral-sequential — and enforce fencing tokens at the protected resource.**

| | Single Redis (NX PX + token) | Redlock (5 masters) | etcd / ZooKeeper lock + fencing |
|---|---|---|---|
| Survives lock-server crash | No (or async-failover races) | Yes, up to minority | Yes, up to minority (Raft/ZAB) |
| Safe under client GC pause | No | No | Only with fencing checked at resource |
| Safety depends on clocks | TTL only | TTL + bounded drift assumption | No (tokens are logical); TTL affects liveness only |
| Fencing token available | No (random token ≠ monotonic) | No | Yes (revision / zxid / lease counter) |
| Cost / complexity | Trivial | 5 independent masters, subtle | Run a consensus cluster; modify resource to check tokens |
| Appropriate for | Efficiency locks | Rarely the right point on the curve | Correctness locks |

---

### Q20. Explain fencing tokens end to end. Walk through a stale holder being fenced.

**Answer:**
A **fencing token** is a number issued with each lock grant that is **strictly monotonically increasing across grants** — grant #33 then grant #34, forever upward, across lock-service failovers too. The protected resource (storage, DB, API) remembers the highest token it has seen and **rejects any request bearing a lower one**. This converts "I believe I hold the lock" (a client-side belief that pauses make false) into "the resource enforces grant order" (a server-side check that no pause can fool).

Where tokens come from — must survive failover monotonic:

- **ZooKeeper:** the zxid of the lock-znode creation, or the ephemeral-sequential node's sequence number.
- **etcd:** the key's `mod_revision` / the lease's grant revision — etcd's revision counter is global and Raft-replicated.
- **Kubernetes Lease:** resourceVersion transitions (same etcd revision underneath).
- A database sequence works too, if the DB is the single source of grants.

The canonical stale-holder scenario (Kleppmann's diagram, reproduced as a sequence):

```
        Fencing tokens defeating a stale lock holder

 Client A          Lock Service            Client B           Storage
    |                   |                      |               (highest
    |--acquire--------->|                      |                seen: 32)
    |<--granted,        |                      |                  |
    |   token=33        |                      |                  |
    |                   |                      |                  |
    |  ~~~ long GC pause / VM freeze begins ~~~                   |
    |                   |                      |                  |
    |            [A's lease TTL expires;       |                  |
    |             lock service frees the lock] |                  |
    |                   |<-----acquire---------|                  |
    |                   |------granted,------->|                  |
    |                   |      token=34        |                  |
    |                   |                      |--write(tok=34)-->|
    |                   |                      |<------OK---------| 34>32:
    |                   |                      |                  | accept,
    |  ~~~ A wakes up, still believes          |                  | highest=34
    |      it holds the lock ~~~               |                  |
    |                   |                      |                  |
    |--write(tok=33)------------------------------------------->  |
    |<----------------------REJECTED (33 < 34)-----------------|  |
    |                   |                      |                  |
    |  A's write fenced. A re-acquires (gets token 35) or aborts. |
```

Step by step: A acquires with token 33 and pauses. Its lease expires; B legitimately acquires with token 34 and writes — storage records 34. A wakes inside what it thinks is its critical section and writes with 33; storage compares 33 < 34 and rejects. The write that would have corrupted data becomes a visible error A can handle (abort, retry with a fresh acquisition). Note the ordering subtlety the diagram also covers: even if A's stale write arrived *before* B's first write, B's token 34 still wins the sequence — checks are against "highest seen," and A can never produce a number ≥ B's.

**The part everyone forgets — and the #1 follow-up:** fencing only works if the **resource itself checks tokens**. The lock service cannot enforce anything; it only mints numbers. That means every protected operation must carry the token and the resource must do an atomic compare — as a WHERE clause / conditional write:

- SQL: `UPDATE doc SET body=?, fence=? WHERE id=? AND fence < ?`
- DynamoDB/S3-with-conditions: conditional write on a fence attribute (or ETag-style compare).
- etcd itself: `Txn(If mod_revision(key) < token).Then(Put ...)`.

If the resource is dumb (a plain filesystem, a third-party API with no conditional writes), you *cannot* fence, and then no distributed lock over it is a correctness lock — restructure so writes land somewhere fenceable (staging + atomic conditional promote), or make operations idempotent/commutative so duplicate holders are harmless.

**Production war story:** A document-processing service used a Redis lock per document; workers held the lock while writing merged output to object storage. A worker hit a multi-second stop-the-world GC during a large merge, its lock expired, a second worker processed the same document, and the first woke up and overwrote the newer object — silent data loss found days later by a customer. The postmortem fix wasn't "a better lock": they added a version-fence column in the metadata DB checked in the same transaction as the completion record, sourced from an etcd revision at acquisition. The Redis lock stayed — demoted to an efficiency optimization — and the correctness guarantee moved to the conditional write, where it belonged.

---

## Leader Election in Applications & Split-Brain

### Q21. How do you build lease-based leader election in application code (etcd or Kubernetes)?

**Answer:**
The pattern behind etcd elections, Kubernetes Lease objects, and Consul sessions is identical:

1. **Acquire:** atomically create/CAS a well-known key with your identity, attached to a **lease/TTL** (etcd: `Grant(TTL=15s)` then a transaction "create key if absent, bound to my lease"; K8s: create/update the Lease object with `holderIdentity` + `renewTime`, guarded by resourceVersion CAS; etcd's `concurrency.Election.Campaign` wraps this plus fair queueing via revisions).
2. **Renew:** heartbeat the lease (etcd `KeepAlive` every TTL/3; K8s `renewDeadline` < `leaseDurationSeconds`). Renewal is *the* liveness signal — not process health, not readiness probes.
3. **Standbys watch** the key (etcd watch / K8s informer) rather than poll; on expiry/deletion they race to acquire. One winner, guaranteed, because the acquisition bottoms out in a single Raft-committed CAS.
4. **Act while leading**, with the discipline from Q22.

**"Leader does cron":** run the scheduler/reconciler/cleanup-job loop on every replica, but only the lease holder executes; others idle as hot standbys. This is how kube-controller-manager and kube-scheduler ship (leader election is on by default), and it's the standard answer to "how do I run a singleton job in a 3-replica deployment without a SPOF." For Kubernetes apps, don't hand-roll: use `client-go`'s `leaderelection` package or a sidecar; for etcd, `clientv3/concurrency`.

Tuning intuition: TTL / leaseDuration trades failover time against false failovers — 15 s means up to ~15 s of "no leader" after a crash, but tolerates 15 s of API-server hiccup without flapping. Renew period must be several times smaller than the TTL, and your work loop's checkpoints (Q22) must be finer than the TTL or the lease is theater.

**Interview trap:** "The lease guarantees only one leader is *running* at a time." It guarantees at most one *valid lease holder* at a time. A paused or partitioned ex-leader can still be mid-action after its lease expired — lease election is Q18's TTL problem wearing a suit. Safety therefore comes from the combination: lease for *liveness and mostly-one-leader*, plus idempotent/fenced actions for *correctness* (Q22). Anyone who claims lease election alone gives mutual exclusion has just failed the Kleppmann question in different clothes.

---

### Q22. You were the leader and lost leadership mid-work. How must application code handle this?

**Answer:**
This is the question that separates people who've run this in production from people who've read about it. Losing leadership mid-work is *normal* — rolling restarts, API-server blips, GC pauses, node pressure — and it's the exact moment two leaders can overlap. The discipline:

1. **Watch your own lease and wire it to cancellation.** Don't just renew in a background thread and ignore failures. etcd's `Session.Done()` channel closes when the lease can't be kept alive; client-go's `OnStoppedLeading` callback fires on loss. Plumb that into a `context` that cancels all in-flight leader work. The default `OnStoppedLeading` in many templates calls `os.Exit` — crude but honest: restart clean as a follower rather than risk half-leader state.
2. **Assume you find out late.** Between the actual lease expiry (decided at the consensus store) and your observation of it (a failed renew, a watch event), you may keep acting for seconds. So checking "am I still leader?" at the top of each loop iteration is necessary but not sufficient — that check is stale the instant it returns.
3. **Make each unit of work idempotent or guarded, not just the loop.** Break long work into small steps; make each step either (a) idempotent — safe if the new leader repeats it (reconciliation-style "converge to desired state" beats "perform action #47"), or (b) guarded by a conditional write carrying a fencing token / expected version, so the store rejects the stale leader's step (Q20). Kubernetes controllers get this via resourceVersion conflicts: a stale controller's update fails with 409 and its informer cache is refreshed.
4. **Never ack-then-do across the boundary.** Commit the *result* of a step and the *claim of the step* atomically (transactional outbox, conditional write), so a takeover mid-step re-does rather than half-does.
5. **On regaining leadership, assume nothing.** You may be re-elected after another leader ran for a while. Rebuild state from the store (resync/list-then-watch), don't resume from in-memory position.

The shape of the code, as pseudocode (etcd flavor; client-go's callbacks give the same structure):

```
session   = etcd.NewSession(ttl=15s)          // lease + keepalive goroutine
election  = concurrency.NewElection(session, "/svc/leader")
election.Campaign(ctx, myID)                   // blocks until elected
token     = election.Rev()                     // fencing token: etcd revision

ctx, cancel = context.WithCancel(...)
go func() { <-session.Done(); cancel() }()     // lease lost => cancel work

for each unit in workQueue:
    if ctx.Err() != nil: break                 // observed loss: stop early
    // guard: conditional write carrying the fencing token, so even an
    // UNobserved loss (we're stale but don't know yet) is rejected server-side
    ok = store.Txn(
            If( fence(unit) < token ),
            Then( claim(unit, token); process(unit); markDone(unit, token) ))
    if !ok: continue                            // newer leader claimed it; skip

election.Resign(ctx)  // on graceful shutdown: hand off fast, don't wait for TTL
```

Note the two independent defenses: `ctx` cancellation handles the losses you *observe* (fast, cheap), the fencing-token transaction handles the losses you *haven't observed yet* (the dangerous window). And `Resign` on shutdown matters operationally — without it every deploy costs a full TTL of leaderless time.

The one-line summary interviewers want: **lease election makes overlap rare; idempotency and fencing make overlap harmless. You need both, and most outages come from teams who built only the first half.**

**Production war story:** A billing reconciler used leader election correctly but streamed a 20-minute run as one unit: load all pending invoices, process sequentially, mark done at the end. During a node drain the leader was SIGKILLed at minute 12; the new leader started the full batch over and re-issued ~400 charge attempts the old leader had already sent to the payment gateway but not yet marked done. The gateway's own idempotency keys caught most — except retries where the key was regenerated per attempt. Fixes: per-invoice conditional "claim" writes (state machine pending→processing→done with expected-version checks), gateway idempotency keys derived from invoice ID not attempt ID, and lease-loss cancellation between every invoice. The lock was never the problem; the batch shape was.

---

### Q23. Define split-brain precisely. What causes it, what does it look like, and what prevents it?

**Answer:**
**Definition:** two (or more) nodes simultaneously act as the authoritative writer for the same data — both accepting and acknowledging writes — because each believes the other is dead. The defining damage is **divergence**: two histories that both told clients "committed," which no automatic process can always reconcile.

**Causes** — almost always the same recipe:

1. **A partition or pause misread as death.** Network split, switch failure, or a long GC/VM freeze makes the primary unreachable. Crashed-vs-slow (Q2) strikes: the failover system cannot tell.
2. **Naive failover with no quorum.** A 2-node primary/standby pair with automatic promotion (Q3's setup), or a human/script promoting the standby while the old primary still runs. Classic instances: DB primary/replica pairs with keepalived/VIP failover; two HA firewall/NAS heads with a heartbeat cable that gets unplugged; early Elasticsearch with `minimum_master_nodes` left at 1, where a partition produced two masters and index divergence (fixed structurally in ES 7's quorum-based cluster coordination).
3. **Fencing skipped or broken.** The failover assumed the old primary would "notice" and step down. A partitioned node notices nothing.

**What it looks like in practice:** monitoring shows two nodes claiming primary; some clients (per their network path / DNS / VIP flap) write to A, others to B; replication between them errors or silently stops; unique constraints collide (same ID issued twice); caches and downstream consumers see contradictory versions. When the partition heals, replication refuses to resync ("diverged timelines" in Postgres terms) — and now comes the truly painful part: a **manual merge**. Someone must diff two write histories, decide winners row by row (last-write-wins destroys one side's acknowledged data; business rules may allow merging some tables and not others), replay what's salvageable, and communicate to customers whose committed writes lost. Hours to days of engineering time, and often the honest answer is "we lost N minutes of writes on one side."

**Preventions**, in the order you'd deploy them:

- **Quorum for the decision to act as primary.** Never let a node self-promote or serve writes without majority agreement — either native consensus (Raft/ZAB clusters can't split-brain by construction, Q11) or an external arbiter (Patroni consulting etcd before Postgres promotion; a witness node giving a 2-node pair a third vote). This removes the "both sides think they own it" state.
- **Fencing / STONITH ("Shoot The Other Node In The Head").** Before the new primary serves writes, make the old one *incapable* of writing: power it off via IPMI/PDU, revoke its SAN/SCSI reservation, detach its cloud volume or security-group access, or — the soft version — fencing tokens at the storage layer (Q20). The Pacemaker-world rule applies everywhere: an HA cluster without fencing is a data-corruption machine on a delay timer.
- **Witness/quorum devices** for stretched two-site setups: a lightweight third vote in an independent failure domain (cloud witness, quorum disk) so exactly one site can claim majority.
- **Degrade the minority deliberately:** on losing quorum, a primary must demote itself to read-only or stop serving *before* the standby's takeover timeout — self-fencing beats being shot, but only works if pauses can't outlast the timeout, so pair it with real fencing.
- **Last resort honesty:** if you can't fence and can't get a quorum, prefer manual failover with a human confirming the old primary is truly dead. Availability lost to a page is cheaper than divergence.

**Interview trap:** "Raft clusters can split-brain during partitions since both sides have nodes running." No — at most one side has a majority, and only a majority can elect or commit (Q11). What *can* split-brain is the layer you built *next to* Raft: e.g., your app's primary was chosen via a lease in etcd, but you never fenced the old app primary at the database — etcd was consistent the whole time while your app diverged. Consensus stores don't protect resources they don't sit in front of; that's fencing's job, and it's the through-line of this entire lesson.

---

### Q24. How do consensus clusters handle membership changes and log growth, and what do you monitor in production?

**Answer:**
Three operational topics that distinguish "read the paper" from "ran the cluster":

**Membership changes.** You cannot atomically switch every node from config C_old to C_new — during the transition some nodes count majorities against the old config and some against the new, and a naive switch lets two disjoint majorities form (e.g. going 3 → 5: {S1,S2} is a majority of C_old while {S3,S4,S5} is a majority of C_new — two leaders, legally). Two safe schemes:

1. **Joint consensus** (original Raft paper): first commit a transitional config C_old,new in which every decision — elections *and* commits — requires majorities in **both** configs; then commit C_new. No moment exists where old-only and new-only majorities can act independently. Correct, rarely implemented, fiddly.
2. **Single-server changes** (Raft dissertation; what etcd does): only add or remove **one voter at a time**. Any majority of C_old and any majority of C_new then necessarily overlap, so the unsafe window never opens. Multi-node changes become a sequence of single steps.

The practical refinement is the **learner** (non-voting member): a freshly added voter with an empty log would count toward quorum size while contributing nothing — add a node to a 3-cluster and quorum jumps to 3-of-4 while the newcomer spends minutes catching up, so one more failure stalls writes. etcd's flow: `member add --learner` → node replicates the log with zero quorum impact → promote to voter only once caught up. Removal ordering matters for the same reason: when replacing a dead member of a 3-node cluster, **remove the dead member first, then add** (quorum math on 2 healthy of 3 is safer than 2 healthy of 4 where quorum is 3 — meaning one more hiccup kills the cluster).

**Log growth and snapshots.** The Raft log grows forever; replaying it from genesis on restart becomes unbounded. So nodes periodically **snapshot** the state machine at some applied index and discard the log prefix up to it. Consequences: a follower so far behind that the leader has compacted the entries it needs cannot be repaired by nextIndex backoff (Q9) — the leader sends **InstallSnapshot** instead, shipping the full state, then resumes normal AppendEntries from the snapshot index. In etcd this appears as two distinct knobs people confuse: Raft log compaction (in-memory/WAL) and MVCC key-space compaction + defrag of the bbolt backend — forgetting the latter is how clusters hit the storage quota alarm from Q17's war story.

**What to monitor** — the signals that predict consensus outages:

- **Leader changes per hour.** A healthy cluster elects a leader and keeps it for days. Frequent elections mean overloaded leader, fsync stalls, network flap, or timeouts tuned too tight (Q7's war story). This is the single best early-warning metric.
- **fsync / WAL commit latency (p99).** Raft commit latency has a hard floor of quorum fsync; a degraded disk on one voter slows every write once it's part of the fastest majority. etcd's `wal_fsync_duration_seconds` and `backend_commit_duration_seconds` are the canonical alerts.
- **Apply lag / commit-to-apply gap** and follower **replication lag** — a follower that can't keep up is one leader failure away from a slow election with an out-of-date candidate pool.
- **Quorum margin**: healthy voters minus quorum size. At zero margin (2 of 3 alive), any restart — including your own rolling upgrade — causes write unavailability. Rolling operations must therefore wait for the restarted member to fully rejoin (and ideally for leadership to move gracefully, `etcdctl move-leader`) before touching the next one.
- **Clock sanity if you use lease-based reads** (Q12): drift beyond the assumed bound silently converts fast reads into stale reads.

**Interview trap:** "We upgraded etcd by restarting all three nodes with a 30-second sleep between them." If a node takes 40 seconds to rejoin (snapshot load, WAL replay, defrag), the second restart hits at zero quorum margin and the control plane goes write-unavailable — the classic self-inflicted outage. Correct rolling procedure gates on *rejoined and caught up* (member list + endpoint health + no leader-change storm), not on wall-clock sleeps.

---

### Q25. Rapid-fire synthesis: which coordination tool for which job?

**Answer:**
A closing map an interviewer can push on:

- **Cluster metadata / config / service discovery source of truth:** etcd, Consul, or ZooKeeper — a consensus store. Keep it small, fast disks, 3 or 5 voters, monitored fsync latency and quorum health.
- **Leader election for app singletons ("leader does cron"):** Kubernetes Lease via client-go leaderelection (if on K8s), else etcd `concurrency.Election` / Consul sessions. Always paired with idempotent, cancellable, fenced work (Q22).
- **Efficiency lock (dedupe work, cheap and fast):** single Redis `SET NX PX` + random token + Lua compare-and-delete. Accept rare double-execution by design; document that acceptance.
- **Correctness lock (invariants at stake):** etcd/ZooKeeper lock **plus fencing tokens enforced by the resource** via conditional writes. If the resource can't check tokens, redesign the write path until it can, or make the operations idempotent — the lock alone is insufficient.
- **Ordered commits for your actual data at scale:** don't push it through one consensus log. Either use a system that shards consensus per range (CockroachDB, Spanner-style) or use the outsource pattern — consensus assigns leadership per shard/partition, data flows through cheaper replication (Kafka ISR), fencing guards the edges.
- **Failover for a classic primary/standby database:** an arbiter with quorum (Patroni + etcd) plus real fencing/STONITH of the old primary. Never heartbeat-only automatic promotion between two nodes.
- **Anything with two voting nodes:** add a third vote (witness) or accept manual failover. There is no safe automatic 2-node failover; that's Q3, and it's a law, not a preference.

If you can justify each row with the *why* from this lesson — quorum intersection, crashed-vs-slow, commit-in-own-term, TTLs vs pauses, tokens checked at the resource — you're operating at the level this interview expects.
