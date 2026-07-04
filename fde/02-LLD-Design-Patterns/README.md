# Module 2 — LLD & Design Patterns (FDE Prep)

Senior LLD rounds don't test whether you can name 23 GoF patterns — they test whether you can take an ambiguous one-liner ("design a rate limiter"), extract the real requirements in five minutes, model the domain with clean seams, write code that actually compiles and handles the ugly cases (remainder cents, backpressure, concurrent flushes), and then absorb 25 minutes of "now change X" without rewriting anything. This module builds that skill in TypeScript with a Node.js runtime lens: patterns are always shown against real ecosystem examples (Express middleware as Chain of Responsibility, EventEmitter as Observer, module scope vs Singleton), and every solved problem is structured the way the interview actually runs.

## Contents

| File | What it covers |
| --- | --- |
| [01_solid_and_oo_design.md](01_solid_and_oo_design.md) | SOLID with violation→refactor TS examples, composition vs inheritance, a DI container from scratch, and how to run an LLD interview. |
| [02_creational_patterns.md](02_creational_patterns.md) | Singleton (vs Node module scope), Factory Method, Abstract Factory, Builder, Prototype, Object Pool — with real Node ecosystem examples. |
| [03_structural_patterns.md](03_structural_patterns.md) | Adapter, Decorator (middleware), Facade, Proxy (ES `Proxy` + reverse proxy), Composite, Bridge, Flyweight. |
| [04_behavioral_patterns.md](04_behavioral_patterns.md) | Strategy, Observer (EventEmitter), Command, Chain of Responsibility (Express middleware), State, Template Method, Iterator, Mediator, Memento. |
| [05_lld_problem_rate_limiter.md](05_lld_problem_rate_limiter.md) | Flagship solved LLD: API Rate Limit Manager — four algorithms, manager/registry design, Redis+Lua distributed story. |
| [06_lld_problem_parking_lot.md](06_lld_problem_parking_lot.md) | Solved LLD: parking lot with allocation + pricing strategies, UML-as-text. |
| [07_lld_problem_notification_system.md](07_lld_problem_notification_system.md) | Solved LLD: multi-channel notification service with retries, failover, and user preferences. |
| [08_lld_problem_cache_library.md](08_lld_problem_cache_library.md) | Solved LLD: generic cache library — O(1) LRU/LFU from scratch, TTL, write policies. |
| [09_lld_problem_splitwise_and_logger.md](09_lld_problem_splitwise_and_logger.md) | Two solved LLDs: Splitwise (split strategies + greedy debt simplification) and a Logger framework (appenders, buffering decorator, hierarchy). |

## Recommended study order

1. **01 → 04 (patterns foundation).** Do these in sequence before any solved problem. Every solved LLD leans on Strategy, Decorator, Factory, and Observer without re-explaining them — if you can't produce these patterns on autopilot, the problems will feel like memorization instead of derivation.
2. **05 — Rate Limiter (flagship).** The most complete walkthrough of the 5-step protocol, and the problem most likely to actually appear. It also carries the distributed-systems bridge (Redis + Lua atomicity) that interviewers use to probe senior scope.
3. **08 — Cache Library.** The heaviest on data-structure rigor (O(1) LRU/LFU with hand-rolled doubly linked lists). Doing it early exposes any DS gaps while you still have time to fix them.
4. **07 — Notification System.** Best practice for reliability vocabulary: retries, backoff, failover, idempotency — the follow-up axis interviewers push hardest at senior level.
5. **06 — Parking Lot.** Classic entity-modeling drill; lighter algorithmically, so use it to practice speed — aim to finish the core model in 20 minutes.
6. **09 — Splitwise & Logger.** Two problems, two different hard invariants (money integrity, failure isolation). Save it for last: it's the best simulation of walking into an interview where the domain is unfamiliar but the toolkit isn't.

## How to practice

For each solved problem (05–09): **attempt it cold for 45 minutes before reading the lesson.** Set a timer, open an empty `.ts` file, and go through the full protocol — including saying your clarifying questions out loud, even alone. Then read the lesson and diff your attempt against it: which questions didn't you ask, which seam did you miss, which step-5 rejection did you commit? That diff is your study list; re-attempt the same problem two days later.

The 5-step protocol, which every solved lesson follows and you should run in every real interview:

1. **Requirements clarification** — 5 minutes of questions that change the design (scale, mutability, precision, failure behavior). Never start coding into silence.
2. **Core entities & interfaces** — name the domain objects and, more importantly, the *seams* (the interfaces where change will arrive). Narrate the invariant you intend to protect.
3. **Implementation** — working code for the core path. Depth over breadth: a correct split algorithm beats a scaffolded REST API.
4. **Extensibility follow-ups** — when pushed ("now make it multi-currency / distributed / 50x traffic"), the answer should be a new class behind an existing interface. If it requires editing step 3, your seams were wrong.
5. **Know the rejection triggers** — each lesson ends with the mistakes that end interviews (floats for money, sync I/O in hot paths, `switch` on type codes). Review these lists the night before; they're the cheapest points you'll ever score.
