# Module 1 — Advanced Node.js (FDE Prep)

Senior Node interviews don't test whether you know that "Node is single-threaded and non-blocking." They test whether you can explain *why p99 latency spiked, why the event loop lagged with no hot JS, why an unrelated fs read slowed down when someone added bcrypt, why the service OOMs once a day, and why there's an intermittent 502 behind the load balancer.* This module builds the runtime-level mental model that answers all of those, one deep-dive lesson at a time. Every file is written interview-style — deep Q&A, complete runnable code, interview traps, and production war stories — because that's how these rounds actually run.

## Contents

| File | What it covers |
| --- | --- |
| [01-node-runtime-internals.md](01-node-runtime-internals.md) | What `node app.js` actually does: the boot sequence, V8's JIT pipeline (Ignition→TurboFan, hidden classes, inline caches, deopt), the libuv event loop and its phases, the threadpool, and microtask ordering (nextTick vs promises). The foundation everything else builds on. |
| [02_streams_and_backpressure.md](02_streams_and_backpressure.md) | The four stream classes and their internal state machines, `highWaterMark`, the backpressure protocol, `pipe` vs `pipeline` vs async iterators, and the memory-blowup / leaked-fd failure modes of getting it wrong. |
| [03_worker_threads_cluster_child_process.md](03_worker_threads_cluster_child_process.md) | The three multi-processing models: Worker Threads (shared-memory CPU parallelism), Cluster (multi-core HTTP scaling), and child_process (spawning external work). When to reach for each, message passing, and shared memory via `SharedArrayBuffer`. |
| [04_async_patterns_and_event_emitter.md](04_async_patterns_and_event_emitter.md) | Promises, async/await internals, concurrency control (`Promise.all`/`allSettled`/`race`, limiting parallelism), `EventEmitter` semantics, async iterators, `AbortController`, and the error-handling pitfalls (unhandled rejections, swallowed errors, emitter `'error'`). |
| [05_memory_and_performance.md](05_memory_and_performance.md) | V8 heap layout and generational GC (Scavenger + Mark-Sweep-Compact/Orinoco), GC tuning flags and container-awareness, leak hunting (heap snapshots, the three-snapshot technique, retainers), Buffer/external memory (why RSS diverges from heapUsed), CPU profiling and flame graphs, event-loop-delay monitoring, benchmarking pitfalls, and three real leak post-mortems. |
| [06_http_internals_and_networking.md](06_http_internals_and_networking.md) | `http` module internals, keep-alive & Agent pooling (the `maxSockets` pitfall), the timeout trio and the classic ALB/ELB 502 race, HTTP/2, TLS (session resumption, SNI), DNS (`lookup` vs `resolve`, threadpool, the `family: 0`/happy-eyeballs stall), undici vs axios, streaming/SSE, and a raw-Node reverse proxy. |

## Recommended study order

1. **01 — Runtime internals (do this first, always).** Every other lesson assumes the event-loop/threadpool/GC mental model this file builds. If you can't explain why recursive `setImmediate` is safe but recursive `process.nextTick` is fatal, or why an object literal's property order affects performance, start here and don't move on until you can.
2. **02 — Streams & backpressure.** The most misunderstood core API, and a prerequisite for the HTTP lesson (responses are streams) and the memory lesson (broken backpressure is a leak). Build the "cooperative backpressure" instinct here.
3. **04 — Async patterns & EventEmitter.** Solidify promise/microtask internals and emitter semantics before the memory lesson, whose leak case studies (closure capture, listener leak) lean on both.
4. **05 — Memory & performance.** The diagnostic capstone: heap vs external memory, GC, leak hunting, profiling, event-loop delay. This is where "why does it OOM / lag" questions live, and it references streams (02) and emitters (04) directly.
5. **06 — HTTP internals & networking.** The production-facing capstone: keep-alive, pooling, the 502 race, DNS/IPv6, TLS, undici. Uses streams (02) for SSE/proxy/streaming responses and the threadpool model (01) for the DNS story.
6. **03 — Worker Threads / Cluster / child_process.** Slot this in wherever CPU-parallelism questions matter for your target role; it's more self-contained, so it can be studied any time after 01.

## How to use this module

For each lesson: **answer the "Self-check" at the bottom out loud before re-reading.** These are written the way an interviewer probes — if you can narrate the mechanism (not just the fix), you're at senior level. When a lesson gives runnable code (stream implementations, a reverse proxy, event-loop-delay monitoring), *actually run it* and break it deliberately (drop the backpressure check, forget the listener cleanup) so you've *seen* the failure mode you'll be asked to diagnose. The war stories are the highest-yield content: interviewers reward candidates who reason from symptom → layer → root cause, which is exactly what those stories drill.
