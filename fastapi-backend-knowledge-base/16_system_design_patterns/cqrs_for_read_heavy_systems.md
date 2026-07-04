# CQRS: Minimal Guide

## Core Concepts
*   **Command (Write):** Only handles data modification (`POST`, `PUT`, `DELETE`). Uses a standard Relational DB (PostgreSQL).
*   **Query (Read):** Only handles data retrieval (`GET`). Uses an optimized search-only DB (e.g., **Elasticsearch** or **Redis**).
*   **Update Loop:** Sync the two sides using an event-driven system (e.g., **Kafka**, **RabbitMQ**).

## Best Practices
- ✅ Scale **Read** and **Write** services independently.
- ✅ Optimized Search: Write to Postgres → Sync to **Elasticsearch** for lightening-fast search.
- ✅ Handle **Eventual Consistency**: Data might take 100ms to appearing in the Read DB after a Write.
- ✅ Use **Command Handlers** and **Query Handlers** to separate business logic.

## Summary Checklist
- ✅ Splitted Read/Write models
- ✅ Event-based synchronization
- ✅ High Read performance
- ✅ Independent scaling
