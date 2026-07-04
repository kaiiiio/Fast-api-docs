# Read Replicas: Minimal Guide

## Core Concepts
*   **Primary (Write):** All `POST`, `PUT`, `DELETE`, and critical consistency `GET` queries go here.
*   **Replicas (Read):** All high-volume `GET` queries (listing, searching) go here to reduce Primary load.
*   **DatabaseRouter:** Logic that picks a healthy replica key/URL randomly or via Round-Robin.

## Implementation Details
1.  **Multiple Engines:** Use `create_async_engine` for both Primary and Replicas.
2.  **Separate Sessions:** `get_db(read_only=True)` returns a replica session; `get_db(read_only=False)` returns Primary.
3.  **Failover:** If all replicas are down, fall back to Primary for READ as a backup.

## Scaling Replicas
- ✅ Scale horizontally by adding more Replicas as traffic increases.
- ✅ Monitor **Replication Lag**; avoid reading from a replica if it's too far behind (e.g., > 1s).
- ✅ Use **Load Balancer** (like AWS RDS Endpoint) to rotate among multiple replicas automatically.

## Summary Checklist
- ✅ Primary/Replica engines
- ✅ Auto-routing logic (read-only flag)
- ✅ Failover to primary
- ✅ Replication lag monitored
