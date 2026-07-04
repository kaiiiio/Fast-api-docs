# Module 6 — Databases Deep Dive

> FDE Prep Phase 6 | Level: Senior/Staff

Postgres and MongoDB internals, indexing, transactions, scaling patterns, and the database-selection judgment an FDE is actually hired for. Redis is covered in its own deep-dive module (`Devops/01-Redis-and-Queues`) — this module only cross-references it.

## Files & Study Order

| # | File | What it covers |
|---|------|----------------|
| 1 | [01_postgres_internals.md](./01_postgres_internals.md) | Process model, shared buffers, MVCC with worked xmin/xmax examples, WAL & checkpoints, VACUUM/bloat/wraparound, TOAST, PgBouncer pooling modes, reading EXPLAIN ANALYZE (scan types, join strategies). |
| 2 | [02_indexing_deep_dive.md](./02_indexing_deep_dive.md) | B-tree internals & page splits, composite column-order rules, covering/partial/expression indexes, GIN/BRIN/hash, why the planner ignores your index, write-side cost, MongoDB compound/multikey/ESR side-by-side. |
| 3 | [03_transactions_and_isolation.md](./03_transactions_and_isolation.md) | ACID precisely, every anomaly reproduced in two-session SQL, what Postgres actually does at each isolation level (SSI), row/advisory locks, deadlock anatomy, optimistic vs pessimistic concurrency in TypeScript, Mongo transactions as a design smell. |
| 4 | [04_mongodb_internals_and_patterns.md](./04_mongodb_internals_and_patterns.md) | WiredTiger concurrency & journaling, replica-set elections/oplog/read-write concerns, causal consistency, shard-key selection & jumbo chunks, schema design patterns (embed vs reference, bucket, outlier, computed), aggregation optimization, change streams. |
| 5 | [05_scaling_patterns.md](./05_scaling_patterns.md) | Read replicas & lag-safe reads, app-level sharding, CQRS (justified vs cargo cult), event sourcing, cache-aside with stampede protection in TypeScript, search & analytics offloading, zero-downtime expand-contract migrations. |
| 6 | [06_choosing_databases.md](./06_choosing_databases.md) | The FDE decision framework: SQL vs document vs KV vs wide-column vs graph vs vector vs time-series mapped to real customer scenarios, DynamoDB single-table vs Postgres JSONB, when Mongo is right vs a mistake, polyglot pitfalls, cost, migration war stories. |

## Recommended path

Read in order 1 → 6. Files 1-3 build the relational foundation (internals → indexes → concurrency), file 4 goes deep on the Mongo side you already use, file 5 turns both into scaling architecture, and file 6 is the judgment capstone you'll be probed on in system-design and customer-scenario interviews.

Quick-revision pass before an interview: the decision tables and **Interview trap** callouts in each file, then all of file 6.
