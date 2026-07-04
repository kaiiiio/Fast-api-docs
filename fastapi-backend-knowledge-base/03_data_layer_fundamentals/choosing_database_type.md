# Choosing Database Type: Minimal Guide

## SQL (Relational) - PostgreSQL
*   **Best for:** Complex relationships, ACID compliance, and structured data.
*   **Key Feature:** Strong consistency and multi-table Joins.
*   **Driver:** `asyncpg` (PostgreSQL) is the industry standard for async Python.

## NoSQL (Document) - MongoDB
*   **Best for:** Flexible schemas, unstructured data, and rapid prototyping.
*   **Key Feature:** Horizontal scaling and JSON-like document storage.
*   **Driver:** `motor` (Async MongoDB driver).

## NoSQL (Key-Value) - Redis
*   **Best for:** Caching, session management, and ephemeral data.
*   **Key Feature:** Extremely low latency (in-memory).
*   **Driver:** `aioredis` or `redis-py` (async mode).

## Comparison Summary
| DB Type | Best Match | Concurrency |
|---------|------------|-------------|
| **SQL** | Structured Data + Joins | ✅ High |
| **NoSQL (Doc)** | Evolving Schema | ⚡ Very High |
| **NoSQL (KV)** | Cache / Sessions | 🚀 Ultra High |

## Choice Verdict
- 🏁 Complex relations (e.g., Users, Orders, Payments)? → **PostgreSQL**
- 🏁 Rapidly changing schema / logs / analytics? → **MongoDB**
- 🏁 Speeding up slow queries via cache? → **Redis**