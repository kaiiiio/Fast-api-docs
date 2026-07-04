# Outbox Pattern: Minimal Guide

## Problem (Concurrency Issue)
*   **Failed Event:** You update the database but the message to Kafka fails. Now the data is out of sync (DB has it, Kafka doesn't).

## Solution (The Outbox)
1.  **Atomic Save:** Save the user data **AND** a new event in an `OUTBOX` table *inside* the same database transaction (`async with session.begin()`).
2.  **Relay (Outbox Worker):** A separate worker (Polling or CDC) reads the `OUTBOX` table and sends the event to the real message broker (Kafka/RabbitMQ).
3.  **Delete/Update:** The worker marks the record as `processed` in the `OUTBOX` table after a successful send.

## Best Practices
- ✅ Always use **Atomic Transactions** (same DB connection).
- ✅ Use **Polling** or **CDC (Change Data Capture)** (e.g., Debezium) to relay events.
- ✅ Implement **Idempotency** on the receiver side (prevent double processing).
- ✅ Handles **At-Least-Once Delivery** (Guaranteed delivery).

## Summary Checklist
- ✅ Outbox table created
- ✅ Atomic transactions (Save data + Save event)
- ✅ Reliable Relay (Worker/CDC)
- ✅ Processed markers/Cleanup
