# Async vs Sync Backends: Minimal Guide

## Core Differences
*   **Sync (Synchronous):** Blocks thread during I/O. 1 request = 1 thread. Idle CPU during wait. Limited concurrency.
*   **Async (Asynchronous):** Yields control during I/O. 1 event loop handles thousands of requests. High throughput for I/O-bound tasks.
*   **FastAPI:** Supports both. Sync endpoints run in an auto-managed thread pool; Async is preferred for high performance.

## Use Cases
*   **✅ Use Async for:** I/O-bound operations (DB queries, external API calls via `httpx`, WebSockets, `aiofiles`).
*   **❌ Avoid Async for:** CPU-bound operations (heavy calculations, image processing). These block the event loop.
*   **CPU Workaround:** Move heavy tasks to `BackgroundTasks` (single-node) or workers like **Celery/RQ** (distributed).

## Parallelism with `asyncio.gather`
*   **Concept:** Runs multiple independent I/O tasks concurrently.
*   **Impact:** Instead of waiting for task A (100ms) then task B (100ms) = 200ms, `await asyncio.gather(A, B)` finishes in ~100ms.

## Async Best Practices
*   **Drivers:** Use async drivers like `asyncpg` (PostgreSQL), `motor` (MongoDB), and `aioredis`.
*   **Clients:** Use `httpx.AsyncClient` instead of `requests`.
*   **Anti-pattern:** Never use `time.sleep()` in an `async def`; use `await asyncio.sleep()`.
*   **Database:** Use `AsyncSession` (SQLAlchemy) for non-blocking DB ops.

## Performance Impact
*   **Sync:** High memory (8MB/thread), limited to ~800 concurrent requests on 4 cores.
*   **Async:** Low memory (50-100MB total), easily handles 10,000+ concurrent requests.
