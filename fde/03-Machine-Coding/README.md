# Module 3 — Machine Coding (FDE Prep)

Machine-coding rounds are a different beast from LLD or system design: you get an empty file, a 45–60 minute timer, and a prompt like "build an in-memory rate limiter with working tests." No slides, no hand-waving — the interviewer runs your code (or reads it expecting it to run) and judges you on *working, tested, correctly-abstracted* implementation under time pressure. The failure mode isn't usually "couldn't solve it"; it's "ran out of time because they didn't budget," "over-engineered the abstraction and never got to a passing test," or "the happy path worked but every edge case broke." This module drills the six problems that show up most, each done to a shippable, senior standard.

## Contents

| File | What it covers |
| --- | --- |
| [01_in_memory_redis_clone.md](01_in_memory_redis_clone.md) | A Redis-like key-value store from scratch: `GET`/`SET`/`DEL`, TTL/expiry (lazy + active), data-type commands (lists, hashes, sets), and the command-dispatch architecture — the "build a mini datastore" prompt. |
| [02_rate_limiters.md](02_rate_limiters.md) | The four canonical algorithms (fixed window, sliding-window log, sliding-window counter, token bucket) as working code with a fake clock, plus the manager/registry shape and the memory-bound reasoning interviewers probe. |
| [03_lru_lfu_cache.md](03_lru_lfu_cache.md) | O(1) LRU (doubly-linked list + Map) and O(1) LFU (frequency buckets + `minFreq`) built from scratch, generic over `<K, V>`, with a TTL variant, the `Map`-insertion-order trick, and cache-stampede coalescing. |
| [04_pub_sub_and_event_bus.md](04_pub_sub_and_event_bus.md) | An in-process pub/sub / event bus: topic subscription, wildcard/pattern matching, once/unsubscribe, ordering and re-entrancy guarantees, backpressure, and error isolation between subscribers. |
| [05_job_scheduler_and_task_queue.md](05_job_scheduler_and_task_queue.md) | A job scheduler / task queue: delayed and recurring jobs (min-heap of deadlines), a worker pool with bounded concurrency, retries with backoff, priorities, and graceful shutdown/draining. |
| [06_polling_snake_game_misc.md](06_polling_snake_game_misc.md) | Grab-bag of the remaining common prompts: long-polling vs short-polling, the Snake game (grid/state machine), and other misc machine-coding drills — practice for prompts that don't fit a neat category. |

## What machine-coding rounds actually score

- **Working code first.** A running, tested LRU at minute 35 beats a beautiful, untested LFU at minute 55. Interviewers weight "it runs and passes tests" far above "it has an elegant class hierarchy."
- **Edge cases.** Capacity 0/1, empty input, duplicate keys, expiry-at-read, concurrent-ish access. Naming and handling these is where seniors separate from mid-levels.
- **The right abstraction, not the most.** One `Strategy` seam where the requirement will churn (eviction policy, rate-limit algorithm) — not a five-layer framework. Over-abstraction that eats your clock is a rejection trigger.
- **Testability.** Injectable clock (never `sleep` in tests), deterministic behavior, a small test harness you actually run. "How would you test this?" is always asked; have the tests already written.
- **Narration.** Say the invariant you're protecting and the complexity you're hitting ("O(1) because unlink+relink on a DLL"). Silent coding reads as luck.

## Practice schedule (drilling under 45–60 min time pressure)

The point of practice is *time calibration*, not seeing the solution. Reading the lesson first teaches you nothing about whether you can produce it cold in 50 minutes.

**Every problem, always:** attempt it **cold with a hard timer** before reading the lesson. Empty `.ts` file, no notes, say your clarifying questions out loud (even alone). Only after the timer expires do you open the lesson and diff.

A four-week rotation (assuming ~1 problem per session, 3–4 sessions/week):

1. **Week 1 — build the core reflexes.** `03_lru_lfu_cache` then `02_rate_limiters`. These are the highest-frequency prompts and both hinge on the same senior instincts: O(1) data-structure discipline and an injectable clock. Do each twice — the second attempt two days later, aiming to beat your first time by 10 minutes.
2. **Week 2 — stateful systems.** `01_in_memory_redis_clone` then `04_pub_sub_and_event_bus`. These test command-dispatch architecture and subscriber/error-isolation semantics. Practice the "expiry: lazy vs active" and "one bad subscriber can't break the others" conversations out loud.
3. **Week 3 — concurrency & scheduling.** `05_job_scheduler_and_task_queue`. The hardest to finish in time — a min-heap, bounded worker pool, retries/backoff, and graceful shutdown are a lot of moving parts. Practice *scoping down* live: get delayed jobs + bounded concurrency passing tests first, add retries/priorities only if time remains.
4. **Week 4 — breadth & speed.** `06_polling_snake_game_misc`, then re-attempt whichever of weeks 1–3 you were slowest on. By now you're calibrating for speed, not correctness.

**The 50-minute template to internalize (compress/stretch for 45/60):**

| Time | Phase |
|---|---|
| 0–5 min | Clarify the API and edge cases out loud; state the core data structure and complexity target. |
| 5–12 min | Draw the data structure *before coding* (DLL, freq buckets, min-heap). Narrate the primitives. |
| 12–30 min | Implement the core happy path. Depth over breadth — one correct thing beats three scaffolded things. |
| 30–40 min | Write and **run** tests: eviction/expiry order, capacity edges, duplicate keys, empty input. |
| 40–55 min | Add the one asked-for extension (LFU, TTL, retries) *behind a clean seam*. |
| 55–60 min | Narrate the senior flourish you didn't have time to code (stampede coalescing, distributed variant, concurrency). |

**The single most common way people lose this round:** they spend 25 minutes on an abstraction and have nothing that runs. If you're at minute 20 with no passing test, **stop abstracting and make the happy path work** — you can always refactor toward a seam once something runs, but you can't get credit for code that never executed.
