# Module 5 — Distributed Systems

> FDE Prep | Level: Senior/Staff | The module where candidates get grilled hardest.

Every lesson is a set of numbered interview questions (`### Q1.` + `**Answer:**`) with ASCII protocol diagrams, worked numeric examples, TypeScript/JavaScript implementations, trade-off tables, and `Interview trap` / `Production war story` callouts.

## Files & Study Order

Study in numeric order — later lessons assume the vocabulary of earlier ones (quorums from 5.1, replication from 5.2, consensus from 5.3).

| # | File | One-liner |
|---|------|-----------|
| 1 | [01_cap_consistency_models.md](./01_cap_consistency_models.md) | CAP done properly (why "CA" is a category error), PACELC, the consistency spectrum from linearizability to eventual with concrete anomalies per model, session guarantees, and tunable-consistency quorum math (R+W>N) with worked examples. |
| 2 | [02_replication_and_partitioning.md](./02_replication_and_partitioning.md) | Leader-follower (sync/async/semi-sync, lag anomalies and fixes), multi-leader conflict resolution (LWW pitfalls, CRDTs), leaderless Dynamo-style replication (sloppy quorums, hinted handoff, read repair, Merkle trees), and partitioning: range vs hash, consistent hashing with virtual nodes in JavaScript, hot keys, local vs global secondary indexes. |
| 3 | [03_consensus_and_coordination.md](./03_consensus_and_coordination.md) | Why consensus is hard (FLP intuition), Raft step-by-step (elections, log replication, terms, commit index, split-brain prevention), Paxos at altitude, where consensus lives in real systems (etcd/ZooKeeper/K8s), distributed locks (Redlock debate, fencing tokens), and leader-election patterns. |
| 4 | [04_distributed_transactions_and_sagas.md](./04_distributed_transactions_and_sagas.md) | 2PC and why it blocks, 3PC briefly, sagas (choreography vs orchestration with a full TypeScript order-processing example plus compensations), outbox pattern + CDC/Debezium, idempotency keys end-to-end in TypeScript, and why "exactly-once" is really at-least-once + idempotency. |
| 5 | [05_messaging_kafka_rabbitmq_sqs.md](./05_messaging_kafka_rabbitmq_sqs.md) | Kafka internals (partitions, consumer groups, ISR, acks=all, compaction, rebalancing pain), RabbitMQ (exchanges/bindings/queues, ack/nack, prefetch), SQS (visibility timeout, FIFO vs standard, DLQ), delivery and ordering semantics per system, retry with backoff + jitter in TypeScript, poison messages, backpressure, and a decision table for choosing between them. |
| 6 | [06_time_ordering_and_failure.md](./06_time_ordering_and_failure.md) | Why wall clocks lie (NTP drift, monotonic clocks), Lamport timestamps and vector clocks with worked examples, happens-before, failure detection (heartbeats, phi accrual), timeouts/retries/circuit breakers as one coherent resilience strategy, gray failures, metastable failures and retry storms, bulkheads and load shedding. |

## How the lessons interlock

- 5.1 gives you the vocabulary (linearizability, quorums) that 5.2 and 5.3 use constantly.
- 5.2's replication trade-offs are what 5.3's consensus algorithms exist to solve safely.
- 5.4 and 5.5 are the applied layer — what you actually build day to day (sagas, outbox, queues) on top of 5.1–5.3's theory.
- 5.6 is the failure lens that cuts across everything: read it last, then re-skim the others asking "what breaks under partition, clock skew, and overload?"
