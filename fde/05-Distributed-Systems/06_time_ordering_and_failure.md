# Lesson 5.6 — Time, Ordering & Failure

> Module: Distributed Systems | Level: Senior/Staff | FDE Prep

Distributed systems have no shared "now": every machine's clock lies a little, messages arrive out of order, and a dead node is indistinguishable from a slow one. This lesson covers the three pillars that follow from that reality — logical time (Lamport and vector clocks) to reason about ordering without trusting clocks, failure detection under uncertainty, and resilience patterns (timeouts, retries, breakers, bulkheads, shedding) treated as one coherent strategy rather than a bag of tricks. It ends with the two failure shapes that distinguish staff-level engineers in interviews: gray failures and metastable failures.

---

## Physical Clocks: Why Wall Clocks Lie

### Q1. Why can't you trust the wall clock on a server, even one running NTP?

**Answer:**
Because the clock is a physical device with error, and the software that corrects it introduces its own discontinuities.

**Quartz drift.** Every server keeps time with a quartz oscillator whose frequency error is measured in parts per million (ppm). A typical cheap oscillator drifts 20–100 ppm depending on temperature. Worked example at 50 ppm:

```
drift = 50 / 1,000,000 × 86,400 s/day = 4.32 seconds per day
```

Left uncorrected for a week, that server is ~30 seconds off. Two servers drifting in opposite directions diverge at twice that rate. This is why "the timestamp says event A came first" is meaningless across machines without a synchronization story.

**NTP corrects it, but imperfectly.** Over the public internet, NTP typically gets you within tens of milliseconds of true time — sometimes much worse under asymmetric network paths (NTP assumes symmetric latency; it cannot detect asymmetry). Within a well-run datacenter with local time sources, single-digit milliseconds. That is still an eternity compared to how fast two writes can occur on different machines.

**Concrete consequences** you should be able to rattle off:
- **Last-write-wins drops newer writes.** If replica A's clock is 200 ms ahead, a write on A "wins" over a genuinely later write on B. Data silently lost, no error anywhere.
- **Negative durations.** `endTime - startTime < 0` when the clock stepped backwards mid-operation. Monitoring graphs with negative latency are the classic tell.
- **Expired-cert / token false positives.** A skewed validator rejects a JWT whose `nbf` is "in the future" or a cert that "expired" seconds ago. This shows up as authentication failures that affect only some hosts.
- **Cron double-fires or skips.** A backwards step makes a scheduler re-enter a minute it already executed; a forward step skips one.

**Interview trap:** Saying "we run NTP so clocks are synchronized." NTP bounds skew, it does not eliminate it, and the bound is milliseconds to tens of milliseconds — far larger than the intervals between conflicting writes in any busy system. The correct framing: physical timestamps are a heuristic for ordering, never a proof.

### Q2. What is the difference between NTP slewing and stepping, and why does stepping break applications?

**Answer:**
When NTP finds the local clock wrong, it has two correction modes:

- **Slew:** if the offset is small (conventionally under ~128 ms), NTP adjusts the clock *rate* — the clock runs slightly fast or slow until it converges. Time remains monotonic; applications never observe a jump. Slew rate is capped (~500 ppm), so correcting even one second by slewing takes tens of minutes.
- **Step:** if the offset is large, NTP jumps the clock instantly to the correct value. If the local clock was ahead, **time goes backwards**.

A backwards step is the dangerous one. Everything that computed `Date.now()` twice and subtracted can now produce a negative number: request latencies, cache TTL math, lock lease expiry ("this lease has -3 s remaining"), rate-limiter windows. Anything that compared timestamps to order events can now order them wrongly. Systems that write timestamped records (LSM trees with time-based tombstone GC, event logs, LWW registers) can produce records that appear to precede records they actually followed.

When a step is likely: a machine booting after being off (clock way off until first sync), a VM resuming from pause, or NTP daemon restart after long drift. Well-run fleets configure the daemon to step only at boot (`ntpd -g` semantics / chrony `makestep` limited to startup) and slew afterwards — but you must verify this, not assume it.

**Production war story:** A payments service computed idempotency-key expiry as `createdAt + 24h` using wall clock. One host's clock was 40 minutes ahead; after an NTP restart it stepped backwards. Keys written just before the step now appeared to expire 40 minutes later than intended — harmless — but duration metrics went negative, which tripped an alert configured as `latency < 0 OR latency > 5s`, and the on-call spent two hours suspecting the database before someone graphed `system_clock_offset` and saw the sawtooth. Lesson encoded in the postmortem: all duration math moved to the monotonic clock, and clock offset became a first-class dashboard metric.

### Q3. What clock weirdness do VMs and leap seconds add on top?

**Answer:**
**VMs.** A virtual machine's guest clock is a fiction maintained by the hypervisor:
- **Pause/resume and live migration:** the guest is frozen — sometimes for hundreds of milliseconds, occasionally seconds — and on resume either the clock jumps forward all at once or the hypervisor "catches up" by delivering a burst of timer interrupts (time runs fast for a while). Both break interval math.
- **CPU steal:** on oversubscribed hosts your process may simply not run for long stretches, so even a perfect clock reads "gaps" that look like latency in your application.
- Timeouts firing spuriously after a migration ("the lock lease expired but the holder was just frozen") is the canonical bug — it is exactly the fencing-token scenario from distributed locking.

**Leap seconds.** UTC occasionally inserts a 61st second (23:59:60). Naive kernels historically handled this by stepping back one second at midnight — which caused real, large-scale outages in the early 2010s (livelocks in timer code, spinning threads). The industry answer is **smearing**: cloud providers' time services (Google, AWS) spread the extra second over many hours as a tiny slew, so no process ever sees a discontinuity. Consequence worth stating in an interview: during a smear, your clocks intentionally disagree with strict UTC by up to ~0.5 s — fine within one fleet, but a subtle skew source if you mix smeared and non-smeared time sources across organizations.

**Interview trap:** Treating clock reads as free and reliable inside distributed algorithms — e.g., "the leader holds the lock for 10 s of wall time." Between GC pauses, VM freezes, and steps, a process cannot even trust its own perception that 10 s have not yet elapsed. Leases need margins, fencing tokens, and monotonic-clock measurement on the holder side.

### Q4. Monotonic clock vs time-of-day clock — what is the rule, and how does it look in Node.js/TypeScript?

**Answer:**
Operating systems expose (at least) two clocks:

| Property | Time-of-day (wall) clock | Monotonic clock |
|---|---|---|
| Node.js API | `Date.now()`, `new Date()` | `process.hrtime.bigint()`, `performance.now()` |
| Can jump backwards | Yes (NTP step, manual set) | No — strictly non-decreasing |
| Can jump forwards | Yes | No (only advances as time passes; rate may be slewed) |
| Meaning across machines | Approximately comparable (within skew) | **Meaningless** — arbitrary epoch per boot |
| Survives reboot | Yes | No — resets |
| Use for | Timestamps of real-world events, calendars, cert validity, "display to humans" | Durations, timeouts, rate limiting, latency measurement, lease countdowns |

**The rule:** *durations and timeouts use the monotonic clock; events-in-the-world use the wall clock.* Never subtract two wall-clock reads to compute elapsed time; never send a monotonic reading to another machine (its epoch is "since some arbitrary point on this box").

```ts
// Correct: measure a duration with the monotonic clock.
const start = process.hrtime.bigint();          // nanoseconds, monotonic
await doWork();
const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;

// Correct: record when an event happened in the world.
const occurredAt = new Date().toISOString();    // wall clock, shareable

// BUG: wall-clock duration — negative or wildly wrong across an NTP step.
const t0 = Date.now();
await doWork();
const elapsed = Date.now() - t0;                // do not do this for timeouts
```

Most timer facilities (`setTimeout`, libuv's loop) are already monotonic-based internally, so the usual bug is hand-rolled deadline math with `Date.now()` — lock leases, token expiry checks, sliding-window rate limiters.

### Q5. What does Google Spanner's TrueTime buy, and what are the cheaper cousins (AWS Time Sync, HLCs)?

**Answer:**
**TrueTime in one paragraph.** Spanner's insight is to stop pretending the clock is a point and expose it as an **uncertainty interval**: `TT.now()` returns `[earliest, latest]`, guaranteed to bracket true time, kept tight (single-digit milliseconds) by GPS receivers and atomic clocks in every datacenter. To make timestamps *externally consistent* (if transaction T2 starts after T1 commits in real time, T2 gets a larger timestamp), Spanner does **commit-wait**: after choosing a commit timestamp `s`, the coordinator waits until `TT.now().earliest > s` before acknowledging — i.e., it waits out its own clock uncertainty so no other node could possibly believe it is still before `s`. The cost of consistency is thus a small, bounded latency per commit — the "what if you spend money on clocks" answer: hardware shrinks the interval, the algorithm waits it out.

**Cheaper cousins:**
- **AWS Time Sync Service / precision clocks:** cloud providers now offer high-quality time (microsecond-class on modern instances, with a queryable clock error bound). This does not give you TrueTime semantics automatically — you still need commit-wait-style reasoning — but it makes clock-based designs (bounded-staleness reads, LWW with tight skew) far less reckless.
- **Hybrid Logical Clocks (HLC):** a timestamp that is "wall clock when possible, logical clock when necessary" — it stays close to physical time (so timestamps are human-meaningful and indexable) but also respects happens-before like a Lamport clock (a receive always exceeds the send). Used by CockroachDB, MongoDB's cluster time, and others. HLC is the pragmatic default answer when the interviewer asks "so how do real databases timestamp things without atomic clocks?"

---

## Logical Ordering: Lamport & Vector Clocks

### Q6. Define the happens-before relation precisely. What does "concurrent" mean?

**Answer:**
Happens-before (`→`), due to Lamport, is the smallest relation on events satisfying:

1. **Same-process order:** if `a` and `b` occur in the same process and `a` comes earlier in that process's execution, then `a → b`.
2. **Message rule:** if `a` is the sending of a message and `b` is the receipt of that same message, then `a → b`.
3. **Transitivity:** if `a → b` and `b → c`, then `a → c`.

Two events are **concurrent** (`a ∥ b`) iff neither `a → b` nor `b → a`. Note this is not about wall-clock simultaneity: two events microseconds apart on different machines are concurrent if no chain of messages connects them — they *could not have influenced each other*. Happens-before is a partial order; it captures potential causality, and it is the only ordering a distributed system can actually observe without trusted clocks.

**Interview trap:** "Concurrent means at the same time." No — concurrent means *causally unrelated*. Two events a full hour apart are concurrent if no information flowed between them. This distinction is the entire foundation of vector clocks and conflict detection; get it wrong and everything downstream is wrong.

### Q7. Explain Lamport timestamps with a worked example across three processes.

**Answer:**
Rules per process, keeping one integer counter `L`:

1. Before every local event (including sends): `L = L + 1`; the event's timestamp is `L`.
2. Every message carries the sender's timestamp `Lmsg`.
3. On receive: `L = max(L, Lmsg) + 1`; the receive event's timestamp is `L`.

This guarantees the **clock condition**: if `a → b` then `L(a) < L(b)`.

Worked example — three processes, time flowing left to right. `m1`: P1→P2, `m2`: P3→P1, `m3`: P2→P3.

```
        time ────────────────────────────────────────────────►

P1:   a1(1) ──── a2(2) ──────── a3(3) ──────── a4(4)
                   │                              ▲
                   │ m1 (ts=2)                    │ m2 (ts=2)
                   ▼                              │
P2:  ─────────── b1(3) ──── b2(4)                 │
                              │                   │
                              │ m3 (ts=4)         │
                              ▼                   │
P3:   c1(1) ──── c2(2) ───── c3(5) ───────────────
                   └──────────────────────────────┘
                     c2 is the send of m2 to P1

  a1: local event            L=1
  a2: send m1                L=2            (carries ts=2)
  b1: recv m1                L=max(0,2)+1=3
  b2: send m3                L=4            (carries ts=4)
  c1: local event            L=1
  c2: send m2                L=2            (carries ts=2)
  c3: recv m3                L=max(2,4)+1=5
  a3: local event            L=3
  a4: recv m2                L=max(3,2)+1=4
```

Check the clock condition: `a2 → b1` and `2 < 3`; `b2 → c3` and `4 < 5`; `c2 → a4` and `2 < 4`. All good.

```ts
class LamportClock {
  private counter = 0;

  /** Call for a local event; returns its timestamp. */
  tick(): number {
    this.counter += 1;
    return this.counter;
  }

  /** Call when sending; returns the timestamp to attach to the message. */
  send(): number {
    return this.tick();
  }

  /** Call when receiving a message stamped `received`. */
  receive(received: number): number {
    this.counter = Math.max(this.counter, received) + 1;
    return this.counter;
  }

  get value(): number {
    return this.counter;
  }
}
```

### Q8. What is the key limitation of Lamport timestamps, and how do you get a total order from them?

**Answer:**
The clock condition is one-directional: `a → b ⟹ L(a) < L(b)`, but **`L(a) < L(b)` does NOT imply `a → b`**. From the example above: `L(c2)=2 < L(a3)=3`, yet `c2` and `a3` are concurrent — no message chain connects them. Likewise `a3` and `b1` both have timestamp 3 and are concurrent. Lamport timestamps *cannot detect concurrency*: given two timestamps, you learn only that the larger one did not happen-before the smaller — you cannot distinguish "smaller caused larger" from "unrelated."

Formally: Lamport clocks embed the causal partial order into a total order, destroying the information about which pairs were actually ordered.

**Total order via tiebreak.** For many protocols (total-order broadcast, mutual exclusion, deterministic conflict resolution) you want *some* consistent total order compatible with causality, and you do not care about detecting concurrency. Order events by `(L, processId)` lexicographically: compare timestamps, break ties by process ID. Every node sorts events identically, and the order respects happens-before. This is exactly how Lamport's classic mutual-exclusion algorithm and many replicated-log designs order requests.

When you *do* need to know whether two versions of a datum are concurrent (i.e., a real conflict) versus one superseding the other — that is what vector clocks are for.

### Q9. Explain vector clocks with a worked example showing one causally-ordered pair and one concurrent pair.

**Answer:**
Each of `n` processes keeps a vector `V` of `n` counters (its "knowledge" of every process's progress):

1. On a local event (including sends), process `i` increments its own slot: `V[i] += 1`.
2. Messages carry the sender's whole vector.
3. On receive at process `i`: `V = elementwiseMax(V, Vmsg)`, then `V[i] += 1`.

Comparison: `Va ≤ Vb` iff every component of `Va` is ≤ the corresponding component of `Vb`. Then:
- `a → b` iff `Va ≤ Vb` and `Va ≠ Vb`
- `a ∥ b` (concurrent) iff neither `Va ≤ Vb` nor `Vb ≤ Va` (incomparable)

Unlike Lamport clocks, this is bidirectional — vector clocks **characterize** causality exactly.

Worked example, three processes. `mA`: P1→P2, `mB`: P3→P1.

```
        time ─────────────────────────────────────────────►

P1:   e1[1,0,0] ── e2[2,0,0] ─────────────── e3[3,0,2]
                      │                          ▲
                      │ mA (V=[2,0,0])           │ mB (V=[0,0,2])
                      ▼                          │
P2:  ─────────────  f1[2,1,0]                    │
                                                 │
P3:   g1[0,0,1] ── g2[0,0,2] ─────────────────────

  e1: local            [1,0,0]
  e2: send mA          [2,0,0]
  f1: recv mA          max([0,0,0],[2,0,0]) then +own → [2,1,0]
  g1: local            [0,0,1]
  g2: send mB          [0,0,2]
  e3: recv mB          max([2,0,0],[0,0,2]) then +own → [3,0,2]
```

**(a) Causally ordered pair — `e1` vs `f1`:**
```
  e1 = [1,0,0]   f1 = [2,1,0]
  slot 1: 1 ≤ 2  ✓
  slot 2: 0 ≤ 1  ✓
  slot 3: 0 ≤ 0  ✓        every component ≤, and vectors differ
  ⇒ e1 → f1  (e1 happened-before f1)
```

**(b) Concurrent pair — `f1` vs `g2`:**
```
  f1 = [2,1,0]   g2 = [0,0,2]
  slot 1: 2 > 0   → f1 ≤ g2 fails
  slot 3: 0 < 2   → g2 ≤ f1 fails
  ⇒ incomparable ⇒ f1 ∥ g2  (concurrent — a genuine conflict if these
    were two versions of the same key)
```

```ts
type Order = 'before' | 'after' | 'concurrent' | 'equal';

/** Compare two vector clocks. Missing slots are treated as 0. */
function compareVectorClocks(
  a: Record<string, number>,
  b: Record<string, number>,
): Order {
  let aLessSomewhere = false; // some slot where a < b
  let bLessSomewhere = false; // some slot where b < a

  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const av = a[k] ?? 0;
    const bv = b[k] ?? 0;
    if (av < bv) aLessSomewhere = true;
    if (bv < av) bLessSomewhere = true;
  }

  if (aLessSomewhere && bLessSomewhere) return 'concurrent';
  if (aLessSomewhere) return 'before';   // a → b
  if (bLessSomewhere) return 'after';    // b → a
  return 'equal';
}
```

### Q10. Where are vector clocks used in practice, and what do they cost?

**Answer:**
**Dynamo-style conflict detection.** In leaderless/multi-master stores (the Dynamo paper's design, Riak), each stored value carries a version vector. On read, if two replicas return values whose vectors are concurrent, the store has detected a real conflict — it returns **siblings** and lets the application (or a CRDT-style merge) reconcile. If one vector dominates, the store silently discards the ancestor. This is the honest alternative to LWW: LWW resolves every conflict by clock, silently losing one side; vectors *detect* the conflict and surface it.

**Version vectors vs vector clocks — the one-line nuance:** vector clocks track causality of *every event* with one slot per process; version vectors track versions of *a single object* with one slot per replica (or per writing client) and are updated only on writes/syncs — same comparison math, smaller and more practical domain.

**Costs:**
- **O(n) per message/record** where n = number of participants. With one slot per client (as early Dynamo did) the vectors grow with the client population.
- **Pruning is unsafe in general.** Truncating the oldest entries (Dynamo capped vector size and evicted least-recently-updated slots) can turn "causally ordered" into "apparently concurrent," producing spurious siblings. That is usually the acceptable failure direction — false conflicts, not lost causality — but it must be a conscious choice.
- **Operational reality:** several systems that started with vector clocks moved to server-side LWW-with-good-clocks or CRDTs because application developers hated resolving siblings. Knowing *why* (developer ergonomics, not correctness) is a senior-level detail.

**Interview trap:** "Vector clocks order events." They do not order concurrent events — that is their entire point. They *partially* order events and, uniquely, tell you when no order exists. If the interviewer asks "how do you totally order with vector clocks," the answer is: you don't; you either accept siblings/merge, or you fall back to a tiebreak (which reintroduces LWW-style arbitrariness for the concurrent pairs).

---

## Failure Detection

### Q11. Can a node ever be certain another node has crashed?

**Answer:**
No. In an asynchronous network, **crashed, slow, and partitioned are observationally identical**: in all three cases you sent a message and no reply came within your patience. There is no message you can receive that proves absence — and waiting longer only shifts the ambiguity. This is the same core impossibility that drives the FLP result (deterministic consensus is impossible in a fully asynchronous system with even one crash failure, precisely because you can never distinguish "crashed" from "slow"), and it is why practical systems buy their way out with **timeouts** (assuming partial synchrony), **leases**, and **quorums** — mechanisms that make progress safe *even when the failure verdict is wrong*.

The practical consequence: any failure detector will make mistakes, so the system must tolerate false positives (declaring a live node dead → two nodes think they hold the same role → need fencing/epochs) and false negatives (slow detection → unavailability). Design question in interviews is never "how do we detect perfectly" but "which mistake is cheaper here, and what mechanism makes the wrong verdict safe?"

### Q12. How do heartbeat/timeout failure detectors work, and what is the timeout dilemma?

**Answer:**
Every node periodically sends "I'm alive" heartbeats (or is probed); a monitor declares it dead if no heartbeat arrives within timeout `T`.

The **timeout dilemma**:
- **`T` too short:** every GC pause, packet loss burst, or CPU-steal episode triggers a false positive. Consequences: needless failovers, leadership flapping (node declared dead, comes back, gets re-elected, dies again by timeout...), and mass data re-replication storms when a "dead" node held many partitions.
- **`T` too long:** genuinely dead nodes keep receiving traffic for the full window; failover MTTR is bounded below by `T`. Requests routed to a corpse burn caller timeouts and retries.

A single fixed `T` also assumes network conditions are stationary — they are not. The p99 heartbeat inter-arrival time during a normal Tuesday and during a top-of-hour batch job differ enormously.

**Production war story:** A cluster used a 3-second heartbeat timeout for leader election. A JVM-based coordinator had occasional 4–6 s stop-the-world GC pauses under memory pressure. Each pause triggered a leader election; the old leader returned mid-election and triggered another. During one busy hour the cluster spent more time electing than serving — a self-inflicted outage with zero actual hardware failures. Fixes: raise timeout for the *election* path specifically, tune GC, and (the durable fix) make leadership changes cheap and fenced with epoch numbers so a spurious election is an annoyance rather than a correctness event.

### Q13. Explain the phi accrual failure detector. Why is it better than a fixed timeout?

**Answer:**
Used by Cassandra and Akka. Instead of a binary alive/dead verdict at a fixed timeout, the detector outputs a continuous **suspicion level φ** that grows the longer a heartbeat is overdue, calibrated against the *historical distribution* of that peer's heartbeat inter-arrival times.

Mechanics: keep a sliding window of recent inter-arrival times; model their distribution (implementations use a normal approximation over the sampled mean/variance). When a heartbeat is `t` late, compute the probability that a heartbeat would legitimately be this late given history, and report:

```
φ(t) ≈ -log10( P(heartbeat arrives later than t | history) )
```

Intuition for the scale:
- **φ = 1** → P ≈ 10% that a healthy peer would be this late → declaring it dead now is wrong ~1 time in 10.
- **φ = 2** → ~1% chance you're wrong.
- **φ = 3** → ~0.1% chance you're wrong.

Consumers pick a threshold matching their cost of a false positive: gossip/dissemination might act at φ = 5, expensive actions (re-replicating a node's data) at φ = 8+ (Cassandra's default `phi_convict_threshold` is 8).

Why it wins over fixed timeouts:
1. **Adaptive:** on a janky network the inter-arrival variance is high, so φ rises slowly — fewer false positives. On a crisp LAN, variance is tiny and φ shoots up fast — quick detection. No hand-tuned constant per environment.
2. **Decoupled policy:** one detector, many thresholds — different subsystems can act at different confidence levels instead of sharing one global timeout.
3. **Graded response:** you can begin de-prioritizing a suspect (stop routing new work) at low φ and only take irreversible action at high φ.

**Interview trap:** Presenting phi accrual as *solving* failure detection. It is still a timeout at heart — it cannot beat FLP; it just replaces a magic constant with a probabilistic, self-calibrating one. A partitioned-but-alive node still reaches φ = ∞. Safety must still come from fencing/quorums, not from the detector being "smart."

---

## Resilience as One Coherent Strategy

Timeouts, retries, circuit breakers, bulkheads, and load shedding are not five independent tricks — they are one layered defense: **the timeout bounds each attempt → the retry policy bounds total attempts → the breaker bounds systemic retry load → the bulkhead bounds concurrency per dependency → load shedding bounds admission at the edge.** Interviewers probe whether you see the composition, not whether you can name the patterns.

### Q14. What are the rules for timeouts and deadline propagation? Give a timeout-hierarchy bug example.

**Answer:**
**Rule 1: every remote call has an explicit timeout.** A missing timeout is an unbounded resource hold: a socket, a pooled connection, a goroutine/promise chain, memory. Defaults are usually infinite or absurd (many HTTP clients default to no timeout). "What's the timeout?" is the first question for any outage involving a slow dependency.

**Rule 2: propagate deadlines, not timeouts.** A timeout is local ("this call gets 500 ms"); a **deadline** is global ("this whole request must complete by T"). Pass the *remaining budget* downstream — gRPC does this natively (`grpc-timeout` header, deadline decremented at each hop); for HTTP you carry an `x-deadline` / remaining-budget header yourself. Without propagation, a downstream service happily does 10 s of work for a caller that gave up 9 s ago — pure waste, and it is exactly this orphaned work that sustains overload during incidents.

A minimal deadline-propagation helper makes the pattern concrete:

```ts
class Deadline {
  private constructor(private readonly expiresAtMs: number) {}

  /** Create from a total budget, measured on the monotonic clock. */
  static fromBudget(budgetMs: number): Deadline {
    return new Deadline(monotonicNowMs() + budgetMs);
  }

  /** Reconstruct from a header received from upstream. */
  static fromRemaining(remainingMs: number): Deadline {
    return new Deadline(monotonicNowMs() + remainingMs);
  }

  remainingMs(): number {
    return Math.max(0, this.expiresAtMs - monotonicNowMs());
  }

  expired(): boolean {
    return this.remainingMs() === 0;
  }

  /** Budget for one downstream attempt: remaining time minus a safety
   *  margin so we can still handle the response / fail gracefully. */
  attemptBudget(marginMs = 50): number {
    return Math.max(0, this.remainingMs() - marginMs);
  }
}

function monotonicNowMs(): number {
  return Number(process.hrtime.bigint() / 1_000_000n);
}

// Usage at each hop:
//   const dl = Deadline.fromRemaining(Number(req.headers['x-deadline-ms']));
//   if (dl.expired()) return res.status(504).end();   // don't do orphan work
//   await callDownstream({ timeoutMs: dl.attemptBudget(),
//                          headers: { 'x-deadline-ms': String(dl.attemptBudget()) } });
```

The `expired()` check before doing work is the anti-orphan-work guard: during overload it is the difference between draining a backlog and grinding through requests whose callers hung up minutes ago.

**Rule 3: the hierarchy must be coherent — caller timeout > sum of callee attempts.** Worked example of the classic bug:

```
Client → A: timeout 2s
A → B: per-attempt timeout 1s, retries 3 attempts total

Worst case inside A: 3 × 1s = 3s  (plus backoff!)  >  2s client budget
```

The client abandons at 2 s and (typically) retries A, while the first A is *still* on attempt 3 against B. Now B sees attempts from two concurrent copies of the same logical request. Under load, this pattern manufactures traffic. Coherent version: client 2 s → A budgets ~1.8 s total → 2 attempts × 800 ms with ~200 ms jittered backoff, and A checks remaining deadline before starting any attempt.

**Interview trap:** "We set timeouts everywhere" while every layer independently retries. Independent per-layer retries with incoherent budgets are the raw material of retry storms (Q15, Q21). Timeout values are a *system-wide budget allocation problem*, not per-service configuration trivia.

### Q15. When are retries safe, and how bad is retry amplification in a call chain?

**Answer:**
**Safety precondition: idempotency.** Retry only operations that can be applied twice without harm — natural reads, or writes made idempotent via idempotency keys / conditional writes. A timeout is ambiguous (the request may have succeeded); retrying a non-idempotent write on timeout is how you double-charge a customer.

**Retry amplification.** Each layer that retries multiplies traffic to the layer below. With 3 layers each doing 3 attempts:

```
Client (3 attempts) → A (3 attempts each) → B (3 attempts each)
worst-case requests hitting B's dependency: 3 × 3 × 3 = 27×
```

And this multiplier engages *exactly when the bottom layer is unhealthy* — you hit a struggling service with 27× load, guaranteeing it stays down. Mitigations:

- **Retry at one layer only** (usually closest to the failure, or only at the edge) — the single most effective rule.
- **Retry budgets:** cap retries as a fraction of primary traffic (e.g., retries ≤ 10–20% of requests, token-bucket enforced, as in Finagle/linkerd). When the budget is exhausted, failures propagate instead of amplifying.
- **Backoff with jitter** on every retry — see lesson 5.5 for the full exponential-backoff-plus-jitter implementation and the thundering-herd analysis; the one-line reminder is that backoff without jitter synchronizes clients into waves.
- **Honor `Retry-After` / server pushback** when the server signals overload.

### Q16. Draw the circuit breaker state machine and implement a minimal one.

**Answer:**
A circuit breaker sits in front of a dependency and tracks outcomes. Three states:

```
                    failures under threshold
                   ┌──────────────────────────┐
                   │                          │
                   ▼                          │
             ┌──────────┐   failure rate /   ┌┴─────────┐
   requests  │  CLOSED  │   consecutive      │          │
  ──────────►│ (normal  │   failures exceed  │   OPEN   │
             │  flow)   ├───threshold───────►│ (fail    │
             └──────────┘                    │  fast)   │
                   ▲                         └────┬─────┘
                   │                              │ cool-down timer
        probe      │                              │ expires
        succeeds   │                              ▼
        (× k)      │                        ┌───────────┐
                   └────────────────────────┤ HALF-OPEN │
                                            │ (limited  │
                        probe fails ───────►│  probes)  │──┐
                        back to OPEN        └───────────┘  │
                              ▲                            │
                              └────────────────────────────┘
```

- **CLOSED:** requests flow; record successes/failures over a sliding window. Trip to OPEN when the failure rate (or consecutive-failure count) over a *minimum volume* of requests exceeds threshold.
- **OPEN:** reject immediately with a distinct error (`CircuitOpenError`) — no network call, no timeout wait. After a cool-down, transition to HALF-OPEN.
- **HALF-OPEN:** allow a small number of probe requests. Successes close the circuit; any failure re-opens it (usually with the cool-down reset or increased).

What breakers actually buy you: (1) **fail fast** — callers get an instant error instead of burning a full timeout and holding a pooled connection, so *your* latency and resource usage stop being hostage to a dead dependency; (2) **let the dependency recover** — you remove your traffic (including retry traffic) from a struggling service, breaking the overload feedback loop.

```ts
type BreakerState = 'closed' | 'open' | 'half-open';

class CircuitOpenError extends Error {
  constructor() { super('circuit breaker is open'); }
}

interface BreakerOptions {
  failureThreshold: number;   // consecutive failures to trip (simple variant)
  cooldownMs: number;         // how long to stay open before probing
  halfOpenProbes: number;     // successes required in half-open to close
  now?: () => number;         // injectable monotonic clock (for tests)
}

class CircuitBreaker {
  private state: BreakerState = 'closed';
  private consecutiveFailures = 0;
  private probeSuccesses = 0;
  private openedAt = 0;
  private readonly now: () => number;

  constructor(private readonly opts: BreakerOptions) {
    // monotonic clock: breaker timing must survive NTP steps (see Q4)
    this.now = opts.now ?? (() => Number(process.hrtime.bigint() / 1_000_000n));
  }

  async exec<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (this.now() - this.openedAt < this.opts.cooldownMs) {
        throw new CircuitOpenError();          // fail fast, no I/O
      }
      this.state = 'half-open';                // cool-down elapsed: probe
      this.probeSuccesses = 0;
    }

    try {
      const result = await fn();               // fn must have its own timeout
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess(): void {
    if (this.state === 'half-open') {
      this.probeSuccesses += 1;
      if (this.probeSuccesses >= this.opts.halfOpenProbes) {
        this.state = 'closed';
        this.consecutiveFailures = 0;
      }
    } else {
      this.consecutiveFailures = 0;
    }
  }

  private onFailure(): void {
    if (this.state === 'half-open') {
      this.trip();                             // probe failed: back to open
      return;
    }
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.opts.failureThreshold) {
      this.trip();
    }
  }

  private trip(): void {
    this.state = 'open';
    this.openedAt = this.now();
    this.consecutiveFailures = 0;
  }

  get currentState(): BreakerState {
    return this.state;
  }
}
```

Production-grade versions replace consecutive-failure counting with a **sliding window failure rate + minimum request volume** (so one blip on low traffic does not trip it), treat timeouts and 5xx as failures but 4xx as successes, and expose state-change metrics.

### Q17. What are the configuration pitfalls of circuit breakers?

**Answer:**

| Decision | Option A | Option B | The trade-off |
|---|---|---|---|
| Granularity | Per-endpoint/operation | Per-host/whole dependency | Per-dependency: one broken endpoint (e.g., a slow `/search`) trips the breaker for *all* calls incl. healthy `/getById` — collateral outage. Per-endpoint: no cross-contamination, but a fully dead host must trip N breakers independently (slower systemic reaction), and config multiplies. |
| Trip signal | Consecutive failures | Failure rate over window + min volume | Consecutive is simple but flappy at low traffic and blind at high traffic (99 successes + 1 failure repeating never trips). Rate+volume is the production answer. |
| What counts as failure | All errors | Timeouts + 5xx only | Counting 4xx (client errors) as failures lets one buggy caller trip the breaker for everyone. |
| Recovery | Fixed cool-down | Exponential cool-down + limited half-open concurrency | Fixed cool-down across a fleet synchronizes probes — every instance's breaker probes the recovering dependency at once (mini thundering herd). Jitter the cool-down. |

Additional pitfalls worth naming:
- **Breakers are per-process.** 500 instances each "allowing a few probes" is 500× probes. Fleet-wide coordination (or very conservative probe rates) matters at scale.
- **Threshold too sensitive** → flapping open/closed, which is worse than either steady state for callers trying to reason about the dependency.
- **No fallback wired up:** a breaker converts slow failures into fast failures — the *product* still needs an answer for the fast failure (default value, stale cache, degraded UI). A breaker without a fallback strategy just makes your error rate spike faster.

### Q18. Tie it together: how do timeout, retry, breaker, bulkhead, and shedding compose into one strategy?

**Answer:**
Each layer bounds a different blast radius, and each depends on the one below being bounded:

```
Edge:      LOAD SHEDDING   — bounds admitted work (reject cheap & early)
             │
Service:   BULKHEADS       — bounds concurrency per dependency/tenant
             │
Dependency: CIRCUIT BREAKER — bounds systemic load on a failing dependency
             │
Policy:    RETRY BUDGET    — bounds total attempts per logical request
             │
Attempt:   TIMEOUT         — bounds each individual attempt
```

Reading bottom-up: a **timeout** guarantees no single attempt holds resources forever. A **retry policy** (idempotent-only, budgeted, jittered backoff) guarantees a logical request makes a bounded number of attempts within the propagated deadline. A **circuit breaker** guarantees that when the dependency is systematically failing, even those bounded retries stop flowing — the fleet's aggregate load on the dependency collapses to probe traffic. A **bulkhead** guarantees that while all of the above plays out, the affected dependency can only consume its own partition of threads/connections — the rest of the service keeps serving unrelated traffic. **Load shedding** guarantees that when demand exceeds what all the layers below can absorb, the excess is rejected at admission for near-zero cost instead of queueing until timeouts do the rejecting expensively.

Miss any one layer and the others leak: retries without timeouts retry things that never finish; breakers without retry budgets trip on amplified storms; bulkheads without shedding just move the queue to the front door. The staff-level answer to "how do you make service X resilient" is this stack, with the budgets made numerically coherent (Q14).

---

## Gray Failures & Metastable Failures

### Q19. What is a gray failure, and why do health checks lie?

**Answer:**
A **gray failure** is a failure with **differential observability**: the component looks healthy to the system's own failure detector (health checker, heartbeat) while real workloads experience it as failing. The health check and the workload observe *different things*, and they disagree.

Canonical examples:
- **A NIC dropping 0.1% of packets.** Heartbeats (tiny, occasional, retried by TCP) sail through; a workload doing thousands of RPCs per request sees constant tail-latency blowups and connection resets.
- **One bad disk slowing fsync.** The node answers health pings from memory instantly; every write that must sync to that disk takes 500 ms. Node "up," database effectively down for writers.
- **A zombie process passing TCP health checks.** The port accepts connections (kernel does that) but the application thread pool is deadlocked — a TCP-connect health check passes forever while every real request hangs.
- Partial partitions: node A can reach the health checker but not node B; both look healthy to the control plane while A→B traffic dies.

**Why health checks lie — shallow vs deep:**

| | Shallow check (TCP connect, `/healthz` returns 200) | Deep check (exercise dependencies: DB query, disk write, downstream ping) |
|---|---|---|
| Detects | Process existence, port bound | Real serving capability |
| False negatives (misses gray failures) | Many — the zombie/NIC/disk cases above | Fewer |
| False positives | Rare | Common — a hiccup in *one* dependency marks the whole node bad |
| Failure correlation | Independent per node | Correlated: shared dependency blip → **every** node fails checks simultaneously → orchestrator kills/deregisters the entire fleet |
| Cost | Negligible | Real load on dependencies (N nodes × check frequency) |

The correlated-failure row is the killer: deep checks wired to automated remediation have caused fleet-wide self-inflicted outages ("the database blipped for 10 s, so the load balancer deregistered all 200 healthy app servers"). Mature practice: shallow checks for *liveness* (restart me), carefully scoped checks for *readiness* (route to me), and never let a shared dependency's health fail readiness on every node at once (fail open / require quorum of check failures).

**Detection that actually works: client-side outlier detection.** Since the workload is the only observer that sees the gray failure, use the workload's own signals — per-upstream success rates and latencies measured at the *callers*. Envoy-style **outlier ejection** does exactly this: if one backend's error rate deviates from the pool's, eject it from the balancing set for a while, regardless of what its health check claims. Panic thresholds cap how much of the pool can be ejected so outlier detection cannot itself cause an outage.

**Production war story:** A six-node cache cluster had one machine with a flaky NIC dropping a fraction of a percent of packets. Health checks (1 small ping/second) essentially never hit a drop; the dashboard showed six green nodes for three weeks. Meanwhile the application's p99 doubled, because a typical page issued ~40 cache gets and had a ~4% chance of hitting a drop-and-retransmit stall on the bad node. Nobody looked at *per-backend* client-side latency until an engineer added that breakdown and the bad node lit up instantly. Fixes: per-upstream client metrics as standard, outlier ejection in the proxy layer, and a rule of thumb in the runbook — "green health checks plus red user metrics means gray failure; trust the users."

### Q20. What is a metastable failure? Draw the feedback loop.

**Answer:**
A **metastable failure** (the term is from Bronson et al., "Metastable Failures in Distributed Systems") is an outage where a temporary **trigger** pushes the system into an overloaded state, a **sustaining feedback loop** keeps it overloaded, and — the defining property — **removing the trigger does not restore the system**. It is stuck in a stable-but-bad equilibrium; only breaking the loop recovers it.

```
                       TRIGGER (transient)
              deploy / traffic spike / GC pause /
              cache restart / brief dependency blip
                             │
                             ▼
                   ┌──────────────────┐
          ┌───────►│  OVERLOAD:       │
          │        │  queues grow,    │
          │        │  latency > client│
          │        │  timeouts        │
          │        └────────┬─────────┘
          │                 │
          │                 ▼
   ┌──────┴─────────┐   ┌──────────────────────┐
   │ EFFECTIVE LOAD │   │ clients time out and │
   │ RISES:         │◄──┤ RETRY (2–3× traffic);│
   │ goodput ↓ while│   │ work already done for│
   │ work/request ↑ │   │ abandoned callers is │
   └──────┬─────────┘   │ wasted (orphans)     │
          │             └──────────────────────┘
          │                 ▲
          └─────────────────┘
        loop sustains itself: server burns capacity on
        requests whose callers already gave up, which
        keeps latency high, which keeps retries coming —
        EVEN AFTER THE TRIGGER IS LONG GONE
```

Classic instances:
- **Retry storms on a recovered dependency:** a service recovers, the accumulated retry queue from every client hits it at once, it goes down again — repeat.
- **Cache stampede as a special case:** cache restarts empty (trigger) → hit rate 0 → all traffic goes to the database at, say, 10× its provisioned load → DB latency spikes → timeouts and retries pile on → cache can't fill because the DB is too slow to answer fill queries → hit rate *stays* near 0. The cache being back "up" (trigger gone) changes nothing; the loop sustains itself.
- **Queue-buildup variants:** once a queue's wait time exceeds the client timeout, the server is doing 100% wasted work at the front of the queue — goodput hits zero at nonzero throughput.

The vulnerability precondition is running close enough to capacity that the amplification (retries, cold caches, connection re-establishment) exceeds headroom. Systems in the "vulnerable" region work fine for months until the right trigger arrives — which is why these dominate major real-world outages.

### Q21. How do you recover from a metastable failure, and how do you prevent one?

**Answer:**
**Recovery = break the loop, not fix the trigger.** The trigger is already gone; these systems do not heal by waiting. The playbook:

1. **Shed load hard.** Drop to well *below* normal capacity — reject at the edge (LB rules, admission control), not deep in the stack. You need goodput > incoming rate for queues to drain; at 100% wasted work you must overshoot the cut.
2. **Disable or slash retries** fleet-wide (this is why retry behavior should be dynamically configurable — a deploy to change a retry constant during an outage is agony).
3. **Drain or drop queues.** Work older than the client timeout is guaranteed-wasted; dump it. Restart workers with empty queues if dropping in place is impossible.
4. **Warm the caches / state** before re-admitting load, where the loop is cache-shaped.
5. **Ramp traffic gradually** (10% → 25% → 50% ...), watching goodput, not just "is it up." Re-admitting 100% instantly re-enters the loop — many incidents have a W-shaped graph for exactly this reason.

**Prevention:** capacity headroom above worst-case amplification; retry budgets and deadline propagation (kills the orphaned-work engine); circuit breakers (collapse fleet retry load automatically); bounded queues with age-based shedding (a request older than its deadline never reaches a worker); LIFO-with-timeout or adaptive queue disciplines; and load tests that specifically simulate the trigger *plus* the feedback (e.g., "restart cache tier at peak traffic" game days).

**Production war story:** A product API ran at ~60% utilization. A 90-second network blip to its database caused every in-flight request to time out; three client tiers each retried 3×. When the network healed 90 seconds later, the service faced roughly an order of magnitude of its normal load between queued retries and reconnect storms, with a stone-cold connection pool. It stayed pegged for four hours after a 90-second trigger. Every "restart the service" attempt produced 5 minutes of green followed by collapse — the retry queues refilled instantly. Recovery finally came from blocking 80% of traffic at the load balancer, flushing queues, then ramping 20%/15 min. The postmortem's one-line summary became team lore: "the outage was 90 seconds; we sustained the next four hours ourselves."

**Interview trap:** Proposing "add capacity / autoscale" as the fix for a metastable incident in progress. Autoscaling is usually too slow, new instances arrive with cold caches and empty pools (adding to the amplification), and scaling doesn't stop the wasted-work loop. During the incident the lever is *subtraction* (shed, disable retries), not addition. Capacity is a prevention lever, not a recovery lever.

---

## Bulkheads & Load Shedding

### Q22. What are bulkheads, and what incident shape do they prevent?

**Answer:**
Named after ship compartments: **partition resources so one failure floods one compartment, not the hull.** Concretely:

- **Connection pools per dependency:** service calls dependencies A, B, C — give each its own HTTP/DB connection pool with its own max, instead of one shared pool.
- **Thread/worker pools per operation class:** separate pools (or semaphore-bounded concurrency limits) for "checkout" vs "recommendations" so a slow ancillary feature can't starve the revenue path.
- **Instance pools per customer/tier:** dedicated capacity for the top tier or the notoriously spiky tenant, so one tenant's surge degrades only their partition (the multi-tenant noisy-neighbor bulkhead).

**The classic incident shape bulkheads prevent — "one slow downstream ate the whole pool":** a service has one shared pool of 200 connections/threads serving calls to A (critical) and B (a nice-to-have). B's latency degrades from 50 ms to 30 s (not down — *slow*, so no breaker trips on errors). Little's law does the rest: at even a modest request rate for B, concurrency to B is `rate × 30 s`, which saturates all 200 slots within a minute. Now calls to perfectly healthy A queue behind B's zombies, and the whole service is down because a feature nobody would miss got slow. With bulkheads — B capped at 20 connections — B's feature degrades, an isolated failure, while 180 slots keep serving A.

Cost: capacity fragmentation (reserved-but-idle capacity in each partition) and more configuration surface. That is the trade — bulkheads deliberately sacrifice peak utilization for blast-radius containment, and stating that trade explicitly is what interviewers listen for.

### Q23. What is load shedding, and what signals should trigger it?

**Answer:**
**Reject early and cheap rather than fail late and expensive.** When demand exceeds capacity, *something* will not be served; the only choice is whether the excess is rejected at admission (a fast 429/503 costing microseconds) or admitted to queue until it times out (costing a full timeout of held resources plus the work itself — which then also triggers a client retry). An overloaded system that sheds keeps **goodput** near capacity; one that queues collapses to near-zero goodput (Q20's wasted-work loop).

**Priority shedding:** not all requests are equal. Drop in order: synthetic/probe traffic, low-tier/free customers, read-only and prefetch traffic, then interactive reads — protecting writes and checkout-class operations to the end. This requires requests to carry a priority/criticality label at admission, which is cheap to add early and impossible to retrofit mid-outage.

**Which signal to shed on:**
- **CPU utilization** is a poor primary signal: it lags, it can be high while goodput is fine (efficient batch work), and I/O-bound overload never shows in CPU.
- **Queue length** is better, but a fixed length threshold mis-tunes as request cost varies.
- **Queueing delay/age (CoDel-style) is the best default:** measure how long work waits before service; if sojourn time exceeds a target (e.g., 5–20 ms) persistently, shed until it recovers. Queue *delay* directly measures the harm (added latency) and is robust to varying request cost. Also: drop the *oldest* beyond-deadline work first — it's most likely already abandoned — and consider adaptive LIFO under overload so fresh requests (whose callers are still waiting) get served.

A CoDel-flavored admission gate is small enough to sketch:

```ts
interface Queued<T> {
  enqueuedAtMs: number;                 // monotonic
  deadline: Deadline;
  work: T;
}

class ShedControl {
  private shedding = false;
  private worstSojournMs = 0;
  private windowStartMs = monotonicNowMs();

  constructor(
    private readonly targetSojournMs = 10,   // acceptable queueing delay
    private readonly windowMs = 100,          // evaluation interval
  ) {}

  /** Called when a worker dequeues an item; returns false if it should be dropped. */
  onDequeue<T>(item: Queued<T>): boolean {
    const sojourn = monotonicNowMs() - item.enqueuedAtMs;
    this.worstSojournMs = Math.max(this.worstSojournMs, sojourn);

    if (monotonicNowMs() - this.windowStartMs >= this.windowMs) {
      // Shed while queueing delay persistently exceeds target.
      this.shedding = this.worstSojournMs > this.targetSojournMs;
      this.worstSojournMs = 0;
      this.windowStartMs = monotonicNowMs();
    }
    // Always drop work that can no longer meet its deadline — it is
    // guaranteed-wasted regardless of shedding state.
    if (item.deadline.expired()) return false;
    return !this.shedding || sojourn <= this.targetSojournMs;
  }

  /** Called at admission; overloaded queues reject before enqueueing. */
  shouldAdmit(queueDepth: number, maxDepth: number): boolean {
    return !this.shedding && queueDepth < maxDepth;
  }
}
```

(Production versions use CoDel's decreasing-interval drop schedule and per-priority queues; the sketch shows the two load-bearing ideas — shed on *sojourn time*, and never service expired work.)

**Adaptive concurrency limits** in one paragraph: instead of a hand-tuned max-concurrent-requests, learn it — TCP-style. Netflix's concurrency-limits library treats the service like a congestion-controlled pipe: probe upward while latency stays near baseline, back off multiplicatively when latency gradients indicate queueing (AIMD/gradient algorithms). The limit continuously tracks actual downstream capacity across deploys, hardware changes, and traffic mix — turning "what should max concurrency be?" from a config archaeology question into a control loop.

**Graceful degradation** is shedding's product-facing sibling — reduce work-per-request instead of rejecting requests: serve stale cache (return the expired entry rather than stampeding the DB), disable recommendations/personalization and show a static ranking, drop image quality, shorten search depth, return partial results with a flag. The staff-level move is having these degradation levers *pre-built and dynamically toggleable*, because inventing them during the incident is not an option.

**Interview trap:** "We autoscale, so we don't need load shedding." Autoscaling reacts in minutes; overload arrives in seconds, and metastable loops (Q20) can outrun any scaler — cold new instances can even feed the loop. Shedding is the fast, always-armed backstop; autoscaling is the slow capacity-tracking mechanism. Production systems need both, and shedding is what keeps you alive while the scaler catches up.

### Q24. Rapid-fire synthesis: what are the one-line answers a staff engineer should have ready?

**Answer:**
- **Why not order events by timestamp?** Clock skew (ms via NTP) exceeds event spacing; LWW by wall clock silently loses writes. Use logical clocks or consensus-assigned sequence numbers.
- **Lamport vs vector clocks in one line each:** Lamport gives a total order consistent with causality but can't detect concurrency; vector clocks exactly characterize causality (including detecting conflicts) at O(n) per record.
- **Durations vs timestamps:** monotonic clock for durations/timeouts, wall clock for events-in-the-world, never mix.
- **Can you detect a crashed node?** No — crashed, slow, partitioned are indistinguishable; timeouts are a bet, phi accrual prices the bet, fencing makes losing the bet safe.
- **Retries?** Idempotent only, one layer only, budgeted, jittered backoff, inside a propagated deadline, behind a breaker.
- **Health checks green but users suffering?** Gray failure — trust client-side per-backend metrics, use outlier ejection.
- **Trigger gone but system still down?** Metastable failure — shed hard, kill retries, drain queues, ramp gradually.
- **One slow dependency took down everything?** Missing bulkheads — partition pools per dependency; slowness is more dangerous than failure because nothing errors.
- **The five-layer stack:** timeout bounds the attempt, retry policy bounds attempts, breaker bounds fleet load on a failing dependency, bulkhead bounds concurrency per dependency, shedding bounds admission — and the budgets must be numerically coherent top to bottom.
