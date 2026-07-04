# How FastAPI Handles Concurrency: Minimal Guide

## The Event Loop (The Brain)
*   **Single-Threaded:** Processes requests on a single thread.
*   **Context Switching:** During `await` (I/O wait), it switches to the next request.
*   **Performance:** Handles thousands of I/O-bound requests with very low memory.

## `async def` vs `def`
- **`async def`:** Runs on the **Main Event Loop**. Use this for code with `await`.
- **`def`:** Runs in a **Separate Threadpool**. Use this for code that might block the loop (e.g., synchronous DB calls or `time.sleep`).

## When to use which?
| Scenario | Function Type | Running On |
|----------|---------------|------------|
| **Async (DB/API)** | `async def` | Event Loop |
| **Sync (Blocking)** | `def` | Threadpool |
| **Heavy (CPU)** | Worker Process | Separate Worker |

## Scaling to Multiple Cores
*   **Gunicorn/Uvicorn:** Use `workers` argument (usually `2 * CPU_CORES + 1`) to spin up multiple instances. Each instance has its own event loop and handles concurrency independently.

## Summary Checklist
- ✅ `async def` for I/O tasks.
- ✅ `def` for sync/blocking tasks (Safe by default).
- ✅ Move CPU-bound work (Image Processing/ML) to background workers (Celery).
- ✅ Handles high concurrency with minimal system resources.
