# Lesson 5.5 — Messaging: Kafka, RabbitMQ & SQS

> Module: Distributed Systems | Level: Senior/Staff | FDE Prep

Messaging systems are where most distributed-systems theory becomes production reality: delivery semantics, ordering, backpressure, and retries all show up as concrete broker configuration. Interviewers use Kafka/RabbitMQ/SQS questions to test whether you understand the *model* underneath each system — a replicated log, a smart routing broker, and a managed at-least-once queue — because the model dictates what guarantees you can and cannot get. This lesson covers internals, failure modes, and the cross-cutting patterns (retries with jitter, DLQs, backpressure) that every senior candidate is expected to reason about from first principles.

---

## Kafka

### Q1. Kafka is often described as "a distributed log, not a queue." What does that mean, and why is it so fast?

**Answer:**
Kafka's core abstraction is an **append-only, partitioned, replicated log**. A topic is split into partitions; each partition is an ordered sequence of records stored on disk as a series of **segment files**. Every record gets a monotonically increasing **offset** — a per-partition position, not a global ID.

The critical difference from a queue: **consumers do not delete messages**. A consumer is just a cursor (an offset) moving forward through the log. Data is removed by **retention policy** (time- or size-based, e.g. 7 days) or by log compaction — never by consumption. This is what enables:

- **Multiple independent consumer groups** reading the same data at their own pace (fanout for free).
- **Replay**: reset your offset to reprocess history (bug fix, new downstream system, backfill).
- **Decoupling of producer and consumer speed** — a slow consumer never blocks the broker; it just lags.

Why it's fast:

1. **Sequential disk I/O.** Appends and range reads on segment files are sequential; spinning disks and SSDs both do sequential I/O at near-memory speeds compared to random I/O. Kafka leans on the OS page cache instead of managing its own cache.
2. **Zero-copy transfer.** Serving a consumer is `sendfile()` from page cache to socket — bytes never enter user space (for plaintext, non-transforming paths).
3. **Batching + compression end-to-end.** Producers batch records (`linger.ms`, `batch.size`), the batch is compressed once, stored compressed, and shipped to consumers compressed. Amortizes syscall, network, and compression cost.
4. **Dumb broker, smart consumer.** The broker doesn't track per-message delivery state; consumers track their own offsets. Per-message bookkeeping is what kills throughput in traditional brokers.

```
Topic "orders" (3 partitions)                Consumer group "billing"
                                             (max parallelism = #partitions)
partition 0: [0][1][2][3][4][5] --> append   +-------------+
partition 1: [0][1][2][3]       --> append   | consumer A  | <- P0, P1
partition 2: [0][1][2][3][4]    --> append   | consumer B  | <- P2
                                             +-------------+
                                             Consumer group "analytics"
                                             +-------------+
                                             | consumer C  | <- P0, P1, P2
                                             +-------------+
Each group has its own committed offsets; reading never deletes data.
```

**Interview trap:** "Kafka guarantees ordering." No — Kafka guarantees ordering **only within a single partition**. Across partitions of the same topic there is no ordering at all. If a candidate says "Kafka is ordered" without the per-partition qualifier, a good interviewer will immediately probe it.

---

### Q2. How does Kafka decide which partition a message goes to, and why does the partition key matter so much?

**Answer:**
The producer-side **partitioner** decides:

- **With a key**: `partition = hash(key) % numPartitions` (murmur2 in the Java client). All messages with the same key land on the same partition, and are therefore totally ordered relative to each other.
- **Without a key**: sticky partitioning — the producer fills a batch to one partition, then switches, spreading load roughly evenly.

Key choice is simultaneously an **ordering decision and a skew decision**:

- Key by `userId` → all events for a user are ordered; but one hyperactive user (or a bot) creates a **hot partition** that caps your throughput and makes one consumer in the group the straggler.
- Key by `orderId` → finer-grained, better spread, but you lose cross-order per-user ordering.
- No key → best spread, no ordering guarantee beyond arbitrary.

**Why adding partitions is dangerous:** because the mapping is `hash(key) % numPartitions`, changing the partition count changes where existing keys route. `hash("user-42") % 12 != hash("user-42") % 16`. After the change, new messages for `user-42` go to a *different* partition while old ones remain in the previous partition — a consumer can observe them out of order during the transition, and any "same key = same partition forever" assumption (e.g., local per-partition state in Kafka Streams) breaks. That is why teams over-provision partitions up front, or repartition by writing to a brand-new topic and cutting over.

**Interview trap:** "We hit throughput limits, so we'll just increase the partition count on the topic." Correct answer: that silently breaks key→partition affinity for all existing keys and can reorder in-flight keyed streams. The safe play is to create a new topic with the target partition count and migrate producers/consumers deliberately.

---

### Q3. Explain consumer groups, offset commits, and how commit ordering determines at-least-once vs at-most-once.

**Answer:**
A **consumer group** is a set of consumers sharing a `group.id`. Kafka assigns each partition of the subscribed topics to **exactly one consumer within the group** (one consumer may own several partitions). Consequences:

- Max parallelism of a group = number of partitions. A 4-partition topic with 10 consumers leaves 6 idle.
- Two different groups each get *all* the data (independent cursors).

Progress is tracked as **committed offsets**, stored in the internal `__consumer_offsets` compacted topic, keyed by `(group, topic, partition)`. The committed offset means "everything before this has been handled" — it is the resume point after a crash or rebalance.

The delivery guarantee is entirely determined by **when you commit relative to processing**:

```ts
// AT-LEAST-ONCE: process first, commit after.
// Crash window: processed but not committed => reprocessed on restart (duplicates).
for await (const batch of consumer.batches()) {
  for (const message of batch.messages) {
    await handleMessage(message);          // 1. side effects happen
  }
  await consumer.commitOffsets(batch.lastOffsets()); // 2. then commit
}

// AT-MOST-ONCE: commit first, process after.
// Crash window: committed but not processed => message lost forever.
for await (const batch of consumer.batches()) {
  await consumer.commitOffsets(batch.lastOffsets()); // 1. commit up front
  for (const message of batch.messages) {
    await handleMessage(message);          // 2. crash here => data loss
  }
}
```

- **Auto-commit** (`enable.auto.commit=true`, default every 5s) commits whatever was *returned by poll*, on a timer — which can commit ahead of what you have actually processed (losing messages on crash) or behind (duplicating). For anything that matters, use **manual commit after processing** and design handlers to be **idempotent**, because at-least-once means duplicates *will* happen.
- True end-to-end exactly-once requires either Kafka transactions (consume-transform-produce within Kafka) or idempotent sinks (e.g., upsert by event ID) — committing offsets and writing to an external DB are two systems and cannot be atomically combined without an outbox/idempotency scheme.

**Interview trap:** "Auto-commit gives at-least-once." Not reliably. Auto-commit fires on the poll loop timer and can commit offsets for messages your handler hasn't finished (or even started) — that's an at-most-once window. The guarantee comes from *your* commit ordering, not from the client default.

---

### Q4. Walk through Kafka replication: leaders, ISR, high watermark, and the classic acks=1 data-loss scenario.

**Answer:**
Each partition has one **leader** replica and N-1 **followers**. All produce and consume traffic goes through the leader; followers fetch from the leader to stay in sync. The **ISR (in-sync replica set)** is the leader plus every follower that is caught up within `replica.lag.time.max.ms`. The **high watermark (HW)** is the highest offset replicated to *all* ISR members — consumers can only read up to the HW, so they never see records that could be lost in a leader failover.

```
Partition (replication.factor = 3)

Leader   (B1): [0][1][2][3][4][5][6]   <- log end offset (LEO) = 7
Follower (B2): [0][1][2][3][4][5]      in ISR
Follower (B3): [0][1][2][3]            lagging -> dropped from ISR

High watermark = 6? No — HW = min(LEO of ISR members) = 6 only if B3 is
out of ISR: ISR = {B1, B2} => HW = 6. Consumers read offsets 0..5.
Records 6 (leader-only) are NOT visible to consumers yet.

        visible to consumers          not yet
        |<------------------------>|<-------->|
        [0][1][2][3][4][5]          [6]
                                    ^ acked at acks=1, unreplicated
```

Producer `acks` setting:

- `acks=0`: fire-and-forget. Fast, loses data on any hiccup.
- `acks=1`: leader appended it → success. **Classic loss scenario, step by step:**
  1. Producer sends record; leader B1 appends at offset 6 and acks the producer.
  2. B1 crashes *before* followers fetch offset 6.
  3. Controller elects B2 (in ISR) as new leader. B2's log ends at offset 5.
  4. Offset 6 never existed on B2. The acked record is gone; the producer believes it was written.
- `acks=all` (`-1`): leader waits for all *current ISR* members to replicate before acking. But if the ISR has shrunk to just the leader, `acks=all` degenerates to `acks=1`. That's why you pair it with **`min.insync.replicas=2`** (with RF=3): if fewer than 2 replicas are in sync, produces fail with `NotEnoughReplicas` — you choose availability loss over data loss.

**`unclean.leader.election.enable`**: if true, a replica that was *not* in ISR can become leader when all ISR members are dead — restoring availability but discarding every record the dead ISR had beyond the stale replica's log. Keep it false for anything you can't lose.

**Idempotent producer and transactions (one paragraph):** `enable.idempotence=true` gives each producer a PID and per-partition **sequence numbers**; the broker deduplicates retries, turning "retry on timeout" from duplicate-writes into exactly-once *per partition, per producer session*. Kafka **transactions** extend this: a producer with a `transactional.id` can atomically write to multiple partitions *and* commit consumer offsets in the same transaction, enabling exactly-once consume-transform-produce pipelines (consumers set `isolation.level=read_committed`). Neither helps once data leaves Kafka — external side effects still need idempotency keys.

**Interview trap:** "`acks=all` means all replicas have the data." It means all *ISR members* have it — and the ISR can legally shrink to one (the leader). Without `min.insync.replicas >= 2`, `acks=all` provides no durability beyond `acks=1` in the exact failure scenario you configured it for.

---

### Q5. What is log compaction and when do you choose it over time retention?

**Answer:**
With `cleanup.policy=compact`, Kafka retains **at least the latest record for each key** instead of deleting by age. A background cleaner rewrites old segments, dropping records whose key has a newer value. A record with a **null value is a tombstone**: it marks the key as deleted, and after `delete.retention.ms` the tombstone itself is removed (the delay exists so slow consumers can observe the delete before it vanishes).

Use compaction when the topic is a **changelog / table**, not an event stream:

- CDC streams (latest row state per primary key), Kafka Streams state-store changelogs, `__consumer_offsets` itself.
- A new consumer can bootstrap the *entire current state* by reading the compacted topic from offset 0 — this is the "stream-table duality" pattern.

```
Before compaction (offsets preserved, gaps allowed after):
  offset:  0        1        2        3        4        5
  key:     user1    user2    user1    user3    user2    user1
  value:   v1       v1       v2       v1       null     v3
                                               ^ tombstone: delete user2

After compaction (latest value per key survives; offsets keep gaps):
  offset:  3        5
  key:     user3    user1
  value:   v1       v3        (user2 gone after delete.retention.ms)
```

Use **time retention** when every event matters individually (orders placed, page views): compaction would destroy history because only the last event per key survives. Compaction requires keys, is not instantaneous (recent segments — the "dirty" head — are uncompacted), and consumers must still tolerate seeing multiple versions of a key. Note that offsets are never renumbered by compaction — the log keeps gaps — so offset arithmetic ("offset N+1 exists") is invalid on compacted topics.

---

### Q6. Why are consumer-group rebalances painful, and how do cooperative rebalancing and static membership help?

**Answer:**
A rebalance is triggered when group membership changes (consumer joins/leaves/crashes) or subscription/partition metadata changes. The classic **eager protocol is stop-the-world**: every consumer revokes *all* its partitions, rejoins, and receives a fresh assignment. During that window the whole group processes nothing, in-flight work is abandoned, and uncommitted messages will be redelivered.

The nastiest failure mode is the **rebalance storm / livelock** driven by `max.poll.interval.ms` (default 5 min):

1. A consumer polls a batch and processes it slowly (big batch, slow DB, GC pause).
2. It fails to call `poll()` within `max.poll.interval.ms`. The broker considers it dead and evicts it → rebalance #1.
3. Its partitions move to peers, who now have *more* load, process even slower, miss *their* poll deadline → rebalance #2.
4. The evicted consumer finishes, rejoins → rebalance #3. The group spends more time rebalancing than processing — a livelock where lag climbs while CPU burns.

Fixes:

- **Bound processing time per poll**: lower `max.poll.records`, move slow work to an internal worker pool and keep polling (pause/resume partitions), raise `max.poll.interval.ms` deliberately.
- **Cooperative sticky rebalancing** (`CooperativeStickyAssignor` / incremental rebalance): only the partitions that actually need to move are revoked; everyone else keeps working through the rebalance. Turns stop-the-world into an incremental shuffle.
- **Static group membership** (`group.instance.id`): a bounce/restart of a known member within `session.timeout.ms` does *not* trigger a rebalance — essential for Kubernetes rolling deploys, which otherwise cause one rebalance per pod restart.

**Production war story:** A payments-events consumer group of 12 pods went into a 40-minute outage after a routine deploy. The new build called a slow enrichment API per record; batches of 500 records exceeded `max.poll.interval.ms`, brokers evicted consumers one by one, and each eviction re-shuffled load onto survivors that then also missed their deadlines. Lag grew to 30M records while the group rebalanced in a loop. The fix was threefold: `max.poll.records=50`, cooperative sticky assignor, and static membership for deploys — after which the same deploy caused zero rebalances. The lesson: consumer lag alerting existed, but nobody alerted on *rebalance rate*, which was the leading indicator.

---

## RabbitMQ

### Q7. Explain the AMQP model: exchanges, bindings, queues. How is this philosophically opposite to Kafka?

**Answer:**
In RabbitMQ, producers never publish to queues. They publish to an **exchange** with a **routing key**; the exchange routes copies of the message to zero or more **queues** according to **bindings**; consumers subscribe to queues.

Exchange types:

- **direct**: route where `binding key == routing key` exactly. (Task routing: `email`, `sms`.)
- **fanout**: route to *every* bound queue, routing key ignored. (Broadcast.)
- **topic**: dot-separated routing key matched against binding patterns; `*` = exactly one word, `#` = zero or more words. (`order.*.eu`, `logs.#`.)
- **headers**: match on message headers with `x-match: all|any`; rarely used, flexible but slow.

```
                        (topic exchange "events")
 producer --routing key-->  +----------------+
  "order.created.eu"        |    exchange    |
                            +----------------+
                             |       |      |
              binding:       |       |      |
              "order.#"      |  "*.created.*"  "audit.#"
                             v       v      (no match -> not routed)
                        +--------+ +----------+
                        | orders | | created  |     unroutable + mandatory
                        | queue  | | queue    |     flag -> returned,
                        +--------+ +----------+     else silently dropped
                             |          |
                             v          v
                         consumer   consumer
```

Philosophy versus Kafka:

- **RabbitMQ = smart broker, dumb consumer.** The broker does routing, tracks per-message delivery state and acks, handles TTLs, dead-lettering, priorities, and deletes messages once acked. Consumers just take work.
- **Kafka = dumb broker, smart consumer.** The broker stores an immutable log; consumers manage position, routing is "which topic/partition do I read," and there is no per-message state.

This is why RabbitMQ shines at **task distribution with rich routing** (each message consumed once, competing consumers, per-message ack) and Kafka shines at **high-throughput event streams with replay** (many readers, retained history). A RabbitMQ message consumed and acked is gone; you cannot replay yesterday.

---

### Q8. How do acks, nacks, requeue, prefetch, and publisher confirms work — and where are the traps?

**Answer:**
**Consumer side.** With manual acks (`autoAck=false`), the broker holds a message "unacked" until the consumer responds:

- `basic.ack` — done, delete it.
- `basic.nack` / `basic.reject` with `requeue=true` — put it back at (roughly) the head of the queue.
- `requeue=false` — discard, or dead-letter if the queue has a DLX configured.

If a consumer channel/connection dies, all its unacked messages are automatically requeued and redelivered (with the `redelivered` flag set) — this is RabbitMQ's at-least-once mechanism.

**The requeue loop trap:** `nack(requeue=true)` on a message that fails *deterministically* (malformed payload, permanent business error) creates an infinite hot loop: the message returns to the head of the queue, is redelivered immediately, fails again, forever — pinning a consumer at 100% CPU and starving real work. Correct pattern: requeue only for transient errors (and ideally with delay via DLX), dead-letter for permanent ones.

**Prefetch (`basic.qos`)** is consumer-side flow control: the broker will not push more than N unacked messages to a consumer.

| Prefetch | Behavior | Use when |
|---|---|---|
| `prefetch=1` | One unacked message at a time; perfect work fairness across consumers; a slow message never strands a backlog behind a busy consumer | Long, variable-duration tasks (video encode, report generation) |
| High prefetch (100–1000) | Broker streams ahead; far higher throughput (no per-message round trip); but a crashing consumer redelivers its whole in-flight window, and fast consumers can hoard messages while others idle | Short, uniform, cheap messages |

**Publisher side.** By default, `basic.publish` is fire-and-forget — a broker crash or an unroutable message loses data silently. Two remedies:

- **Publisher confirms** (`confirm.select`): the broker asynchronously acks publishes once the message is persisted/queued; you can pipeline thousands of publishes and handle acks/nacks via callbacks. This is the production standard.
- **AMQP transactions** (`tx.select` / `tx.commit`): synchronous, one round trip per commit, ~250x slower than confirms. Almost never the right choice.

Durability requires all three: durable exchange, durable queue, and persistent messages (`deliveryMode=2`) — miss one and a broker restart drops data.

**Interview trap:** "We set the queue durable, so messages survive restarts." Only *persistent* messages in a durable queue survive; durable queue + transient messages = empty durable queue after restart. And even persistent messages can be lost between publish and fsync unless you use publisher confirms.

---

### Q9. Quorum queues vs classic mirrored queues — why was mirroring deprecated?

**Answer:**
**Classic mirrored queues** replicated a queue to mirror nodes with a master/mirror scheme. The design had chronic problems: on a mirror rejoining after a network partition or restart, it had to **resynchronize the entire queue contents** from the master — and while syncing, the queue was often blocked; skipping sync (`ha-sync-mode: manual`) meant an unsynced mirror could be promoted and silently lose messages. Partition handling (`pause_minority`, `autoheal`) was ad hoc and repeatedly implicated in data loss. The algorithm was bespoke, not a proven consensus protocol.

**Quorum queues** (RabbitMQ 3.8+) reimplement replicated queues on **Raft**: an elected leader, a replicated log, commits acknowledged once a **majority** of replicas persist them. Benefits: predictable, provable failover semantics; no full-requeue resync (followers catch up incrementally from the log); publisher confirms only after majority write, so a confirmed message survives minority failure. Costs: everything is written to disk (no transient mode), higher latency than an unreplicated classic queue, no queue priorities/some classic features, and memory footprint tied to log design (mitigated over releases). Classic mirroring was formally deprecated and removed in RabbitMQ 4.x; the default answer for HA queues is quorum queues, with **streams** (RabbitMQ's Kafka-like append-only log) for high-throughput fan-in/replay cases.

---

### Q10. Design a retry-with-backoff topology in RabbitMQ using TTL + DLX.

**Answer:**
RabbitMQ has no native "redeliver in 30 seconds." The idiom composes two primitives:

- **Message/queue TTL**: a message that sits in a queue past its TTL is dead-lettered.
- **DLX (dead-letter exchange)**: a queue can declare `x-dead-letter-exchange` (+ optional `x-dead-letter-routing-key`); expired/rejected messages are republished there.

Trick: make a **retry queue with no consumers** whose TTL is the backoff delay and whose DLX points back at the work exchange. Rejection sends the message into the retry queue; expiry sends it back to work. One retry queue per delay tier gives exponential backoff.

```
                    +------------------+
   producer ----->  |  work exchange   | -----> [ work queue ] ---> consumer
                    +------------------+              ^                |
                          ^        ^                  |          fail: reject
                          |        |                  |          (requeue=false)
              DLX after   |        | DLX after        |                |
              5s TTL      |        | 60s TTL          |                v
                          |        |            +-----------------------------+
                 +-----------------+            | retry router (DLX exchange) |
                 | retry.5s queue  |<--attempt1-|  routes by x-death count /  |
                 |  TTL=5000, no   |            |  retry-tier routing key     |
                 |  consumers      |            +-----------------------------+
                 +-----------------+                   |            |
                 +-----------------+                   |            |
                 | retry.60s queue |<---attempt2-------+            |
                 |  TTL=60000      |                                v
                 +-----------------+                     +------------------+
                                                         | DLQ (parking lot)|
                                                         |  after N tries   |
                                                         +------------------+
```

Implementation notes: track attempt count via the `x-death` header (RabbitMQ increments it on each dead-lettering) or an explicit application header; after `maxAttempts`, route to a terminal DLQ for human/automated triage. One caveat: **per-message TTL in a shared queue expires only at the head** — a 60s message in front blocks a 5s message behind it — which is exactly why you use one queue per delay tier (uniform TTL per queue) rather than per-message TTLs.

**Production war story:** A team implemented retries as a single retry queue with per-message TTLs (5s, 30s, 5m mixed). Under an incident, a burst of 5-minute-TTL messages landed at the head of the retry queue; tens of thousands of 5-second retries queued behind them could not expire (head-of-line TTL expiry) and sat for five minutes. Downstream saw a retry "flood" in perfect synchronized waves every 5 minutes instead of a smooth trickle, repeatedly re-triggering the overload. Splitting into per-tier queues with uniform TTLs and adding jitter at the producer fixed both the head-of-line blocking and the synchronized waves.

---

## SQS

### Q11. Walk through the SQS visibility timeout lifecycle. Why does slow processing cause duplicates, and how do you prevent it?

**Answer:**
SQS has no consumer connections or acks in the AMQP sense. The lifecycle is:

1. `ReceiveMessage` returns up to 10 messages and starts each one's **visibility timeout** (default 30s). The message is **not deleted** — it becomes invisible to other consumers.
2. The consumer processes, then calls `DeleteMessage` with the receive handle. Done.
3. If the consumer does **not** delete before the visibility timeout expires (crash, or just slow), the message becomes visible again and is redelivered — `ApproximateReceiveCount` increments.

```
              ReceiveMessage
 [ VISIBLE ] ----------------> [ INVISIBLE (in flight) ]
     ^                              |                |
     |                              |                |
     |   visibility timeout         |                | DeleteMessage
     |   expires (no delete)        |                | before timeout
     +------------------------------+                v
     (redelivered; ReceiveCount++)              [ DELETED ]
     |
     | ReceiveCount > maxReceiveCount (redrive policy)
     v
 [ DLQ ]
```

**Slow processing = duplicate processing:** if handling takes 45s but visibility timeout is 30s, at t=30s the message reappears and a second worker picks it up while the first is still working. Both complete; both side effects happen. This is not a bug — it is at-least-once semantics doing exactly what it promises.

Mitigations:

- Set visibility timeout to a safe multiple of P99 processing time (AWS guidance: ~6x is a common rule of thumb when using it as the Lambda/queue processing budget).
- **Heartbeat with `ChangeMessageVisibility`**: while still working, periodically extend the timeout. This keeps the timeout short (fast redelivery when workers genuinely die) while protecting long tasks.
- Idempotent handlers keyed on a business ID — mandatory regardless, because network failures on `DeleteMessage` also produce duplicates.

```ts
import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  ChangeMessageVisibilityCommand,
  type Message,
} from "@aws-sdk/client-sqs";

const sqs = new SQSClient({});
const QUEUE_URL = process.env.QUEUE_URL!;
const VISIBILITY_TIMEOUT_S = 60;
const HEARTBEAT_EVERY_MS = 20_000; // extend well before expiry

async function processWithHeartbeat(
  message: Message,
  handler: (m: Message) => Promise<void>,
): Promise<void> {
  const heartbeat = setInterval(() => {
    sqs
      .send(
        new ChangeMessageVisibilityCommand({
          QueueUrl: QUEUE_URL,
          ReceiptHandle: message.ReceiptHandle!,
          VisibilityTimeout: VISIBILITY_TIMEOUT_S,
        }),
      )
      .catch(() => {
        /* handle already expired/deleted; stop extending */
        clearInterval(heartbeat);
      });
  }, HEARTBEAT_EVERY_MS);

  try {
    await handler(message); // must be idempotent: at-least-once delivery
    await sqs.send(
      new DeleteMessageCommand({
        QueueUrl: QUEUE_URL,
        ReceiptHandle: message.ReceiptHandle!,
      }),
    );
  } finally {
    clearInterval(heartbeat);
  }
}

async function pollLoop(handler: (m: Message) => Promise<void>): Promise<void> {
  for (;;) {
    const { Messages = [] } = await sqs.send(
      new ReceiveMessageCommand({
        QueueUrl: QUEUE_URL,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20, // long polling: fewer empty responses, lower cost
        VisibilityTimeout: VISIBILITY_TIMEOUT_S,
      }),
    );
    await Promise.all(Messages.map((m) => processWithHeartbeat(m, handler)));
  }
}
```

**Production war story:** A refund-processing worker occasionally took 90 seconds against a 30-second visibility timeout during payment-provider slowness. Each slow refund was picked up by two, sometimes three workers, and customers received duplicate refunds. Nobody noticed for weeks because the duplicate rate was ~0.5% and only spiked when the provider was slow — precisely when everyone was looking at the provider dashboards instead. The fix was visibility heartbeating plus an idempotency key (`refundId`) enforced with a conditional write in DynamoDB before initiating the transfer. The audit and clawback of duplicated refunds cost far more than the two-line conditional write would have.

---

### Q12. SQS Standard vs FIFO — what does FIFO's "exactly-once processing" actually mean?

**Answer:**
**Standard queues**: at-least-once delivery (occasional duplicates by design), **best-effort ordering** (messages can and do arrive out of order), and near-unlimited throughput (SQS transparently shards internally). This is the default and right choice for most task workloads.

**FIFO queues** add two mechanisms:

- **Deduplication**: a message with the same deduplication ID (explicit, or a SHA-256 of the body with content-based dedup enabled) is accepted but dropped if seen within the **5-minute deduplication window**. That is the entire basis of the "exactly-once processing" claim — it is *producer-side dedup over 5 minutes*, not end-to-end exactly-once. A producer retry after 6 minutes duplicates; a consumer that crashes after side effects but before delete still reprocesses. Your handler must still be idempotent.
- **Message group ID**: strict FIFO ordering *within a group*; different groups process in parallel. While one message of a group is in flight, the rest of that group is blocked — so one poison message stalls its entire group. Group ID is FIFO's partition key, with the same hot-key skew consequences as Kafka.

Throughput: FIFO is limited to **300 TPS** per API action (3,000 with batching of 10), raised further with high-throughput mode (per-message-group limits still apply) — versus effectively unlimited for standard. FIFO also cannot fan out via standard SNS (needs SNS FIFO) and costs more per request.

**Long polling** (`WaitTimeSeconds` up to 20): the receive call parks on the server until a message arrives or the wait expires. Versus short polling it eliminates empty-receive costs, cuts latency (no client-side sleep loops), and samples all backing shards instead of a subset (short polling can return empty even when messages exist). There is almost no reason to use short polling.

**Redrive policy / DLQ**: configure `maxReceiveCount` (e.g. 5); when `ApproximateReceiveCount` exceeds it, SQS moves the message to the configured dead-letter queue automatically. The DLQ retention should be *longer* than the source queue's, because the clock does not reset on move. SQS also supports redriving messages *back* from the DLQ to the source after a fix.

**Interview trap:** "We need exactly-once, so we'll use SQS FIFO." FIFO's exactly-once is a 5-minute *ingestion* dedup window plus ordered delivery attempts — it does nothing about consumer-side duplicates from visibility-timeout expiry or delete failures. If the interviewer pushes on "what if processing takes 6 minutes and the producer retries," FIFO alone gives you duplicates on both ends. Exactly-once *effects* always end at an idempotent consumer.

---

## Cross-Cutting Patterns

### Q13. Summarize delivery semantics across Kafka, RabbitMQ, and SQS. What do the "exactly-once" claims really mean?

**Answer:**

| System | Default semantics | "Exactly-once" story | What it really means |
|---|---|---|---|
| Kafka | At-least-once (commit after processing); at-most-once if you commit first | Idempotent producer + transactions + `read_committed` | Exactly-once *within Kafka* (consume-transform-produce). External side effects (DB writes, emails) still need idempotency/outbox |
| RabbitMQ | At-least-once (manual acks + publisher confirms); at-most-once with autoAck | None claimed | Redelivery on any consumer failure; `redelivered` flag is a hint, not a dedup mechanism |
| SQS Standard | At-least-once, duplicates by design | None claimed | Design every consumer as idempotent, full stop |
| SQS FIFO | At-least-once delivery with ingestion dedup | "Exactly-once processing" | 5-minute producer dedup window + per-group ordering; consumer-side duplicates still possible |

The unifying principle: **exactly-once delivery over an unreliable network is impossible** (Two Generals); every real system offers at-least-once transport plus some scoped deduplication. The engineering answer is always the same — **idempotent consumers** (natural idempotency like upserts, or explicit idempotency keys checked transactionally) — and any candidate answer that ends at "we enabled exactly-once mode" is incomplete.

---

### Q14. Compare ordering guarantees across the three systems.

**Answer:**

| System | Ordering guarantee | What breaks it |
|---|---|---|
| Kafka | Total order **per partition** only | Multiple partitions (by design); producer retries without idempotence (`max.in.flight > 1` can reorder on retry — idempotent producer fixes this); changing partition count re-maps keys mid-stream |
| RabbitMQ | FIFO per queue for a **single consumer** on that queue, absent redelivery | Multiple competing consumers (interleaved acks); `nack(requeue=true)` reinserts at/near head out of original sequence; retry/DLX topologies reorder by construction; priorities |
| SQS Standard | Best-effort only — none you can rely on | Everything; internal sharding reorders routinely |
| SQS FIFO | Strict FIFO **per message group ID** | Nothing within a group (that's the point) — but a stuck message blocks its whole group |

Senior-level framing: ordering is always **scoped to a serialization unit** — partition, queue+single-consumer, or message group. Global ordering means a single unit, which means no parallelism; you *choose* your unit (usually an entity ID) so that ordering matters only where the business requires it, and you make everything else commutative or idempotent.

---

### Q15. Implement retry with exponential backoff and full jitter in TypeScript, and explain why full jitter beats no jitter or equal jitter.

**Answer:**
Backoff without jitter is a correlation machine: if 1,000 clients fail at the same instant (because the same dependency blipped), they all retry at exactly t+1s, t+2s, t+4s — synchronized waves that re-crush the recovering service (**thundering herd**). **Full jitter** replaces the deterministic delay with a uniform random draw over the whole window: `sleep = random(0, min(cap, base * 2^attempt))`. Retries spread evenly over time, so a recovering server sees a smooth trickle instead of spikes. Equal jitter (`half fixed + half random`) still leaves half the delay synchronized; the classic AWS Architecture Blog analysis found full jitter achieves the best combination of low total calls and low completion time, at the cost of occasionally retrying very quickly — which is fine, because *some* fast retries are useful and they're uncorrelated.

```ts
export interface RetryOptions {
  maxAttempts: number;        // total attempts including the first call
  baseDelayMs: number;        // e.g. 100
  capDelayMs: number;         // e.g. 10_000
  isRetryable?: (error: unknown) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

export class RetryExhaustedError extends Error {
  constructor(
    public readonly attempts: number,
    public readonly lastError: unknown,
  ) {
    super(`Retry exhausted after ${attempts} attempts: ${String(lastError)}`);
    this.name = "RetryExhaustedError";
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Exponential backoff with FULL JITTER: sleep = random(0, min(cap, base * 2^attempt)) */
export function fullJitterDelay(
  attempt: number, // 0-based retry index (0 = delay before 2nd attempt)
  baseDelayMs: number,
  capDelayMs: number,
): number {
  const exp = Math.min(capDelayMs, baseDelayMs * 2 ** attempt);
  return Math.floor(Math.random() * exp);
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const {
    maxAttempts,
    baseDelayMs,
    capDelayMs,
    isRetryable = () => true,
    onRetry,
  } = options;

  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === maxAttempts - 1;
      if (isLastAttempt || !isRetryable(error)) {
        throw isRetryable(error)
          ? new RetryExhaustedError(attempt + 1, error)
          : error; // non-retryable: fail fast, don't waste attempts
      }
      const delayMs = fullJitterDelay(attempt, baseDelayMs, capDelayMs);
      onRetry?.(error, attempt + 1, delayMs);
      await sleep(delayMs);
    }
  }
  throw new RetryExhaustedError(maxAttempts, lastError); // unreachable, for typing
}

// Usage: retry only transient failures, never business errors.
const isTransient = (e: unknown): boolean => {
  if (e instanceof Error && "statusCode" in e) {
    const code = (e as Error & { statusCode: number }).statusCode;
    return code === 429 || code === 503 || code >= 500;
  }
  return e instanceof Error && /ECONNRESET|ETIMEDOUT|EAI_AGAIN/.test(e.message);
};

await withRetry(() => chargePayment(order), {
  maxAttempts: 4,
  baseDelayMs: 100,
  capDelayMs: 10_000,
  isRetryable: isTransient,
  onRetry: (err, attempt, delay) =>
    logger.warn({ err, attempt, delay }, "retrying chargePayment"),
});
```

Two non-negotiables in the wrapper: a **retryable-error predicate** (retrying a 400 or a validation error is pure waste and can duplicate side effects) and a **cap** (uncapped exponential growth turns attempt 15 into a 54-minute sleep).

Where this wrapper lives per system:

- **Kafka consumer**: in-process retries with backoff for transient sink errors *before* committing the offset (blocking that partition is the price of order); after N failures, produce to a retry or dead-letter topic and commit, so one bad record doesn't stall the partition forever.
- **RabbitMQ**: prefer the TTL + DLX tiered-queue topology from Q10 over in-process sleeps — sleeping in the handler holds an unacked message and a consumer slot; dead-lettering to a delay queue frees both.
- **SQS**: don't sleep in the worker at all — call `ChangeMessageVisibility` with the computed full-jitter delay and *return without deleting*; SQS itself becomes the delay timer, and `ApproximateReceiveCount` is your attempt counter.

---

### Q16. What is retry amplification, and how do retry budgets and circuit breakers fix it?

**Answer:**
Retries multiply **across layers of a call chain**. If service A calls B calls C, and each layer independently retries 3 times on failure, then one C outage produces:

```
C receives:  A_attempts x B_attempts x C_attempts = 3 x 3 x 3 = 27
requests for every 1 original user request.
Add a 4th layer at 3 retries: 81x. Retries-per-layer^depth — exponential in depth.
```

So a modest overload that would have been a 2x traffic spike becomes a 27x self-inflicted DDoS precisely when C is least able to handle it — a **retry storm**. This is one of the most common real-world outage amplifiers.

Fixes, in order of leverage:

1. **Retry at one layer only.** Usually the edge (closest to the user, where a retry has end-to-end value) or the leaf (closest to the flaky dependency, where the failure is best understood). Interior layers propagate failure fast instead of retrying.
2. **Retry budgets.** Cap retries as a *ratio* of ongoing traffic (e.g., retries may add at most 10-20% extra load, the approach used by Google SRE and Finagle/linkerd). Under a real outage the budget exhausts and retries stop, instead of scaling with the failure.
3. **Circuit breakers.** After a threshold of failures, open the circuit and fail fast for a cooldown window, letting through occasional probe requests (half-open). This converts "hammer a dying dependency" into "give it room to recover," and pairs with load shedding upstream.
4. **Deadline propagation.** Pass the remaining end-to-end deadline down the chain; a retry that cannot possibly finish within the caller's deadline is wasted work — don't send it.

**Interview trap:** "We handle failures with retries at every layer for defense in depth." That's the anti-pattern, not the defense. The compounding math (3 layers x 3 retries = 27x) is the expected follow-up — be ready to state it and name the fix: one retrying layer, retry budgets, circuit breakers, propagated deadlines.

---

### Q17. Dead letter queues: what actually belongs in a mature DLQ practice, and what is a poison message?

**Answer:**
A DLQ is where messages go after exhausting retries (SQS redrive `maxReceiveCount`, RabbitMQ DLX after N dead-letterings, Kafka via an explicit dead-letter *topic* your consumer produces to — Kafka has no broker-native DLQ). Having a DLQ is table stakes; the senior-level answer is what surrounds it:

- **Alerting**: DLQ depth > 0 (or rate above baseline) pages or tickets. An unmonitored DLQ is a silent data-loss bin with extra steps.
- **Inspection tooling**: an operator must be able to view a dead message's payload, headers, error history (`x-death`, receive count, original timestamp) *without* consuming/destroying it. Attach the failure reason and stack summary as metadata when dead-lettering.
- **Redrive**: a deliberate, rate-limited path to replay DLQ messages back to the source after a fix (SQS has native DLQ redrive; elsewhere you build a small tool). Redrive must not itself stampede the consumer.
- **Retention and idempotency**: DLQ retention longer than source retention; redriven messages are by definition duplicates in time, so downstream idempotency matters again.

A **poison message** fails *deterministically, forever* — malformed JSON, a payload violating a DB constraint, an event referencing deleted data. Without protection it burns all its redeliveries (and in RabbitMQ with `requeue=true`, loops infinitely at the queue head), wasting a consumer slot each cycle and — in SQS FIFO or Kafka with in-order processing — **blocking every message behind it in its ordering unit**. Detection is receive/redelivery count: at a low threshold (2-3 for deterministic-looking errors), short-circuit retries and **quarantine** to the DLQ immediately with diagnostic context. Distinguish error classes: transient (retry with backoff) vs deterministic (quarantine now) — treating them identically wastes the retry budget on messages that can never succeed.

**Production war story:** An events pipeline consumed a Kafka topic in strict per-partition order, writing to a warehouse. A producer deploy introduced one malformed record on partition 7. The consumer's policy was "retry forever to preserve ordering," so partition 7 halted while the other 15 partitions flowed — aggregate lag looked mildly elevated, per-partition lag was catastrophic, and an entire customer segment (hash-mapped to partition 7) saw 14 hours of stale data before anyone looked at *per-partition* lag. The fix: parse-failure records skip to a dead-letter topic with offset/partition metadata after 3 attempts, and lag alerting moved from aggregate to max-per-partition.

---

### Q18. Explain backpressure in messaging systems. What actually happens when you ignore it?

**Answer:**
Backpressure is the mechanism by which a slow consumer's inability to keep up propagates back to producers, instead of accumulating unboundedly in the middle. Every unbounded queue is a promise that memory and disk are infinite; they are not.

Per system:

- **Kafka**: the broker itself rarely suffers (disk-backed log, retention-bounded) — the pressure signal is **consumer lag**, *the* health metric for any Kafka pipeline. Lag = log end offset minus committed offset, per partition. Rising lag means consumers are losing the race; if lag age exceeds retention, you **lose data without any error being thrown anywhere** — records age out unread. Alert on lag growth rate and on lag-time vs retention headroom, not just absolute lag.
- **RabbitMQ**: queues live (partly) in memory, so RabbitMQ has explicit defenses: **memory alarms** (`vm_memory_high_watermark`) and disk alarms **block all publishing connections** cluster-wide until pressure clears; per-connection **flow control** throttles publishers that outrun the broker; `x-max-length`/`overflow` policies bound individual queues (drop-head, reject-publish). A blocked publisher is RabbitMQ telling you the system is over capacity — treat the alarm as an outage precursor, not noise.
- **SQS**: effectively infinite buffering (managed, replicated storage), so the broker never pushes back — the failure just moves: messages exceed retention (max 14 days) and vanish, or latency grows until the work is stale. Watch `ApproximateAgeOfOldestMessage`.

Your three levers when arrival rate > service rate, in the order to consider them:

1. **Scale consumers** — works until you hit the parallelism ceiling (Kafka partition count, per-queue throughput, DB contention downstream).
2. **Buffer** — legitimate for *bursts* (that is what queues are for), a lie for *sustained* imbalance: the queue only grows and every message's latency grows with it.
3. **Shed load** — reject or degrade at the edge (429s, dropping low-priority events, sampling). Painful, but a system that sheds 10% is up; a system that buffers everything is eventually down for everyone.

What happens if you ignore it: queue depth grows → RabbitMQ pages messages to disk and slows down → memory watermark trips → all publishers blocked → producers (which never handled publish failure) block or crash → the "reliable buffer" has now taken down both ends of the pipeline. Or on Kafka: lag exceeds retention and a week of events silently disappears. Unbounded growth always ends in broker death or silent data loss; the only choice you get is making the failure explicit and early.

**Interview trap:** "We use a queue so we don't need backpressure — the queue absorbs it." A queue converts a throughput problem into a latency-and-storage problem; it does not remove it. If sustained input exceeds sustained output, no buffer size saves you — the follow-up question is always "and what happens when the queue is full?", and you need a real answer: bound it, shed, or scale.

---

### Q19. Your service must update its database AND publish an event. What is the dual-write problem, and how does the transactional outbox pattern solve it?

**Answer:**
The naive implementation writes to the DB, then publishes to the broker (or vice versa) — two systems, no shared transaction. Every ordering fails somewhere:

- DB commit succeeds, publish fails (broker down, pod killed between the two calls) → downstream never hears about a real state change. Silent divergence.
- Publish first, DB commit fails/rolls back → downstream reacts to a state change that never happened.
- "Publish inside the DB transaction" doesn't help: the publish is not rolled back if the commit later fails, and holding a DB transaction open across a network call to a broker is its own incident generator.

Distributed transactions (2PC) across a DB and Kafka/RabbitMQ/SQS are effectively unavailable and undesirable. The standard fix is the **transactional outbox**:

```
+---------------------------- one local ACID transaction ---------------+
|  UPDATE orders SET status='PAID' WHERE id=$1;                         |
|  INSERT INTO outbox(id, aggregate_id, type, payload, created_at)      |
|       VALUES ($eventId, $orderId, 'OrderPaid', $json, now());         |
+-----------------------------------------------------------------------+
                                 |
                                 v
        relay process (poller or CDC/Debezium tailing the WAL)
                                 |
                                 v
                    broker (Kafka topic / exchange / SQS)
                                 |
              mark outbox row published / delete it
```

Because the business write and the outbox insert commit **atomically in one local transaction**, the event exists if and only if the state change does. A separate **relay** then delivers outbox rows to the broker — either by polling the table or, better at scale, via CDC (Debezium reading the WAL/binlog, which adds no query load and preserves commit order).

Semantics to state explicitly in an interview:

- The relay gives **at-least-once** publication (it may crash after publishing but before marking the row) — so the event carries the outbox `id` as an idempotency key and consumers deduplicate. Exactly-once effects, as always, live at the consumer.
- Ordering: a single-threaded relay (or CDC per table/partition-key) preserves per-aggregate commit order; publish with the aggregate ID as the Kafka key to keep it.
- The mirror-image pattern on the consumer side is the **inbox** table: record processed event IDs transactionally with the side effect, so redeliveries no-op.

**Interview trap:** "We'll publish the event and write the DB in a try/catch, and compensate on failure." The failure window is the process dying *between* the two operations — no catch block runs. Any correct answer needs a single atomic commit (outbox) or an idempotent reconciliation loop; hand-rolled compensation inside one process is neither.

---

### Q20. What do you actually monitor and alert on for each of the three systems?

**Answer:**
The senior answer is a short list of *leading* indicators per system, not a dashboard dump:

**Kafka**
- **Consumer lag per partition** (max, not aggregate — aggregate hides one stuck partition) and lag **growth rate**; alert when estimated lag-time approaches retention (data-loss countdown).
- **Rebalance rate** for each group — the leading indicator of the livelock in Q6.
- Under-replicated partitions / ISR shrink events (durability at risk right now), plus broker disk usage vs retention math.
- Producer-side: record-error rate and `buffer-exhausted`/queue-full — the producer's own backpressure signal.

**RabbitMQ**
- Queue depth and **queue-depth growth rate** per queue; ready vs unacked split (deep unacked = stuck consumers, deep ready = missing consumers).
- **Memory/disk alarm state and connection `blocked` notifications** — publishers must subscribe to blocked/unblocked callbacks; a blocked cluster is a pre-outage.
- Redelivery rate and DLQ depth (poison-message detector); channel/connection churn (leaks); quorum-queue leader distribution after node restarts.

**SQS**
- `ApproximateAgeOfOldestMessage` — the single best SQS health metric (depth alone lies when throughput is high).
- `ApproximateNumberOfMessagesVisible` trend, and **DLQ depth > 0** as a paging alert.
- Empty-receive count (misconfigured short polling burning money) and, for FIFO, throttling on the 300/3,000 TPS limits.

Cross-cutting: alert on *rates and derivatives*, not just absolutes — a queue at 100k and draining is fine; a queue at 5k and doubling every 10 minutes is an incident in 2 hours. And every one of these systems needs an end-to-end canary (publish a heartbeat message, measure time-to-consume) because broker metrics can all be green while an ACL change silently stops delivery.

---

## Choosing the Right System

### Q21. Kafka vs RabbitMQ vs SQS — give the decision framework.

**Answer:**

| Dimension | Kafka | RabbitMQ | SQS |
|---|---|---|---|
| Core model | Replicated, partitioned append-only log | Smart routing broker with per-message state | Fully managed at-least-once queue |
| Throughput | Very high (millions msg/s with partitioning) | High (tens–hundreds of k/s), per-queue limits | Standard: effectively unlimited; FIFO: 300/3,000 TPS (higher with HT mode) |
| Ordering | Per partition | Per queue, single consumer, no redelivery | FIFO: per message group; Standard: none |
| Replay / retention | Yes — retention/compaction, offset rewind; core strength | No (acked = gone); streams feature partially closes gap | No — deleted is gone, max 14-day retention |
| Fanout | Cheap and native (consumer groups over one log) | Fanout/topic exchanges (broker copies per queue) | Via SNS→SQS subscription topology |
| Routing sophistication | Minimal (topic/partition choice) | Rich: direct/topic/headers, TTL, priorities, DLX | Minimal (queue per purpose; SNS filter policies) |
| Delivery guarantees | At-least-once; EOS within Kafka via txns | At-least-once with confirms + manual acks | At-least-once; FIFO adds 5-min dedup |
| Ops burden | Highest (brokers, partitions, rebalances) — unless managed (MSK, Confluent) | Moderate (clustering, quorum queues, alarms) — CloudAMQP etc. | Near zero — serverless, pay-per-request |
| Consumer scaling | Bounded by partition count | Add consumers per queue freely | Add pollers freely (Lambda event source native) |
| Best fit | Event streaming, event sourcing, analytics pipelines, CDC, multiple readers, replay | Task/work queues, complex routing, RPC patterns, per-message control, self-hosted | AWS-native async decoupling, background jobs, Lambda triggers, minimal ops |

Prescriptive guidance:

- **Event stream, replay, multiple independent consumers, analytics/CDC, high sustained throughput → Kafka.** You are buying the log: retained history, offset rewind, consumer-group fanout. Pay for it in operational complexity (or a managed service) and in designing around partitions.
- **Task queues with sophisticated routing, per-message TTL/priority/dead-lettering, protocol flexibility, self-hosted with modest ops → RabbitMQ.** You are buying the smart broker. Accept no replay and per-queue throughput ceilings.
- **On AWS, async task decoupling with near-zero operations → SQS** (plus SNS or EventBridge for fanout/routing). You are buying "not my problem" for the broker tier. Accept at-least-once + best-effort ordering (or FIFO's throughput limits), no replay, and AWS lock-in.

Strong senior signal in interviews: state that the *team and operational context* often outweighs feature deltas — a two-person team on AWS should not run a Kafka cluster to move 50 messages/second, and "SQS until proven otherwise, Kafka when you genuinely need the log" is a defensible default. Also note these compose: SQS for tasks and Kafka for events in the same architecture is normal, not indecision.

Anti-patterns to name when asked "when is each the wrong choice":

- **Kafka as a task queue**: per-message acks, per-message retries, and work stealing don't exist — one slow message blocks its partition, and "N workers > N partitions" buys nothing. If you find yourself building per-message state on top of Kafka, you wanted RabbitMQ or SQS.
- **RabbitMQ as an event store**: acked messages are gone; teams that need "replay last month for the new consumer" discover this at the worst possible time. If replay is a requirement, it's the log (Kafka or RabbitMQ streams), not a queue.
- **SQS as a low-latency bus**: polling-based delivery with per-request pricing and no fanout on its own; sub-10ms pub/sub or broadcast-heavy workloads want a broker, not a polled queue.
- **FIFO everywhere "to be safe"**: you pay 10x in throughput ceiling and group-blocking behavior for ordering that most workloads don't actually need — scope ordering to the entities that require it.

---

### Q22. Rapid-fire: five one-liners you should be able to produce instantly.

**Answer:**

1. **"Why can't I have more active Kafka consumers than partitions in one group?"** Because a partition is the unit of ordered assignment — exactly one consumer per partition per group preserves per-partition order; extras sit idle as hot standbys.
2. **"What single metric tells you a Kafka pipeline is healthy?"** Consumer lag (and its growth rate) per partition — it is the derivative of every downstream problem, and lag age approaching retention means imminent silent data loss.
3. **"When is RabbitMQ prefetch=1 wrong?"** When messages are cheap and uniform — the per-message ack round trip dominates and throughput craters; raise prefetch and accept a larger redelivery window on crash.
4. **"Is SQS FIFO exactly-once?"** It deduplicates *ingestion* within 5 minutes and orders per message group; consumers still see redelivery after visibility-timeout expiry, so handlers must be idempotent.
5. **"What one property must every consumer in all three systems have?"** Idempotency — all three are at-least-once at the effects level, and every 'exactly-once' feature is scoped dedup, not a substitute.
6. **"Why is `acks=all` alone not enough for durability?"** Because ISR can shrink to just the leader; without `min.insync.replicas>=2` you've configured `acks=1` with extra steps.
7. **"How do you delay a retry in SQS without sleeping in the worker?"** `ChangeMessageVisibility` to the backoff delay and return without deleting — the queue is the timer.
8. **"Why did RabbitMQ deprecate mirrored queues?"** Bespoke replication with full-queue resync on rejoin and lossy partition handling; quorum queues replace it with Raft majority commits.

---

*End of Lesson 5.5 — Messaging: Kafka, RabbitMQ & SQS.*
