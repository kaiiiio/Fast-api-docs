# Lesson 5.4 — Distributed Transactions, Sagas & Idempotency

> Module: Distributed Systems | Level: Senior/Staff | FDE Prep

Every distributed system eventually needs one logical operation to touch two or more independent stores — a database and a message broker, an orders service and a payments service. The moment that happens, single-node ACID stops protecting you, and you must choose between coordination protocols (2PC), compensation-based workflows (sagas), and log-based consistency plumbing (outbox + CDC), all backed by idempotency. Interviewers at senior/staff level do not want definitions — they want failure analysis: what breaks, when, who holds the locks, and who cleans up the mess.

---

## Section A — Two-Phase Commit (2PC) and Its Failure Modes

### Q1. Walk me through the two-phase commit protocol precisely. Who does what, and what exactly does a "yes" vote mean?

**Answer:**
2PC is an atomic commitment protocol: it guarantees that a transaction spanning multiple participants either commits everywhere or aborts everywhere. Two roles exist: one **coordinator** (transaction manager) and N **participants** (resource managers — databases, message brokers, etc.).

**Phase 1 — Prepare (voting phase):**
1. The coordinator sends `PREPARE` to every participant.
2. Each participant does everything required to commit **except** commit: it executes the transaction, writes **undo and redo records to a durable log** (so it can complete or roll back the work even after a crash), acquires and holds all necessary locks, and then flushes the log.
3. Each participant replies `YES` (prepared) or `NO` (abort).

The critical semantic: **a YES vote is a durable, irrevocable promise**. Once a participant votes yes, it has surrendered the right to abort unilaterally. It must hold its locks and wait for the coordinator's decision — even across its own crashes (it re-reads its prepared state from the log on restart and keeps waiting).

**Phase 2 — Commit/Abort (decision phase):**
1. If **all** votes are YES, the coordinator writes `COMMIT` to **its own durable log** (this log write is the true commit point of the entire distributed transaction), then sends `COMMIT` to all participants.
2. If **any** vote is NO (or a participant times out during prepare), the coordinator logs and broadcasts `ABORT`.
3. Participants apply the decision, release locks, and ack. The coordinator retries the decision message until all acks arrive — the decision itself is never in doubt once logged, only its delivery.

```
        COORDINATOR              PARTICIPANT A            PARTICIPANT B
             |                        |                        |
   Phase 1   |----- PREPARE --------->|                        |
             |----- PREPARE ----------|----------------------->|
             |                        |                        |
             |            (write undo/redo to durable          |
             |             log, acquire+hold locks,            |
             |             flush log)                          |
             |                        |                        |
             |<------ VOTE YES -------|                        |
             |<------ VOTE YES -------|------------------------|
             |                        |                        |
   (coordinator writes COMMIT record  |                        |
    to ITS durable log = the real     |                        |
    commit point of the whole txn)    |                        |
             |                        |                        |
   Phase 2   |------ COMMIT --------->|                        |
             |------ COMMIT ----------|----------------------->|
             |                        |                        |
             |            (apply redo, release locks)          |
             |                        |                        |
             |<-------- ACK ----------|                        |
             |<-------- ACK ----------|------------------------|
             |                        |                        |
```

**Interview trap:** Candidates often say "the transaction commits when all participants vote yes." Wrong — it commits when the **coordinator durably logs the commit decision**. Votes alone decide nothing; if the coordinator crashes before logging, the transaction can legitimately still abort on recovery.

### Q2. Analyze the failure modes: participant crashes before and after voting, and the coordinator crash after prepare. Which one is catastrophic and why?

**Answer:**
Enumerate by phase:

- **Participant crashes before voting:** The coordinator's prepare times out, it treats the missing vote as NO, and aborts everywhere. Cheap and safe — no promise was made.
- **Participant crashes after voting YES:** On restart it finds a prepared-but-undecided transaction in its log. It cannot decide alone; it asks the coordinator (or peers, in variants) for the outcome and applies it. Locks were held across the crash — annoying but recoverable.
- **Coordinator crashes after sending PREPARE but before broadcasting the decision:** This is the famous **blocking scenario**. Every participant that voted YES is now **"in doubt"**: it holds locks and cannot move.

```
        COORDINATOR              PARTICIPANT A            PARTICIPANT B
             |                        |                        |
             |----- PREPARE --------->|                        |
             |----- PREPARE ----------|----------------------->|
             |<------ VOTE YES -------|                        |
             |<------ VOTE YES -------|------------------------|
             |                        |                        |
             X  <-- coordinator       |                        |
                crashes BEFORE        |                        |
                sending decision      |                        |
                                      |                        |
                          A and B are now "IN DOUBT":
                          - voted YES => promised to commit
                          - hold row/page locks indefinitely
                          - CANNOT commit (maybe someone voted NO)
                          - CANNOT abort  (maybe decision was COMMIT
                            and another participant already applied it)
                          - can only WAIT for coordinator recovery
                                      |                        |
             (coordinator restarts, reads its log,             |
              re-broadcasts decision or aborts if no           |
              decision record was written)                     |
```

Why can't a prepared participant just abort after a timeout? Because the coordinator may have logged COMMIT and delivered it to *another* participant, which has already committed and released its effects to the world. If the in-doubt participant unilaterally aborts, atomicity is broken. Symmetrically it cannot unilaterally commit, because some other participant may have voted NO. The information needed to decide lives only in the coordinator's log. Recovery therefore requires the coordinator (or a replica of its log) to come back, read the decision record, and re-broadcast — until then, everyone blocks, holding locks that stall unrelated transactions touching the same rows.

**Production war story:** A payments platform ran XA transactions across an Oracle database and a JMS broker. A transaction-manager VM was hard-killed during a hypervisor migration, mid-decision. Hundreds of prepared transactions sat in-doubt in Oracle for forty minutes, holding row locks on the hottest accounts table. Lock queues backed up, connection pools exhausted, and the outage blast radius was the entire order path — not just the flows using XA. The postmortem's headline: "2PC turned one machine's crash into everyone's outage."

### Q3. Why does 2PC hurt latency and availability, and what does "availability is the product of availabilities" mean?

**Answer:**
**Latency:** A 2PC transaction needs at minimum two round trips (prepare, commit) plus **multiple synchronous durable log flushes** — each participant fsyncs at prepare, the coordinator fsyncs the decision, participants fsync the outcome. Your commit latency is roughly `2 × RTT to the slowest participant + several fsyncs`, and locks are held for that entire window, which collapses throughput on hot rows (lock hold time directly bounds concurrency).

**Availability:** The transaction commits only if the coordinator **and every participant** are simultaneously up and reachable. If each of N+1 nodes has availability `a`, the transaction path has availability ≈ `a^(N+1)`. Three services at 99.9% each yields ~99.7% — you multiplied your failure probability rather than isolating it. Worse, the failure mode is not graceful: a coordinator outage doesn't merely fail new transactions, it **blocks in-flight ones while they hold locks**, degrading participants that were perfectly healthy. 2PC converts partial failure into correlated failure — the exact opposite of the microservices isolation story.

### Q4. Where does 2PC still legitimately live today, and why do microservice architectures avoid it?

**Answer:**
2PC is not dead; it moved to environments that fix its weaknesses:

- **Inside distributed databases.** Google Spanner runs 2PC **across Paxos groups**: each "participant" is not a single fallible node but a replicated state machine, and the coordinator's log is itself Paxos-replicated. The blocking problem assumes a coordinator whose log can vanish; replicate the coordinator with consensus and in-doubt windows shrink to leader-failover time. CockroachDB and TiDB follow the same recipe (2PC layered over Raft groups). The lesson to state in interviews: **2PC solves atomic commitment, consensus solves the coordinator's fragility — modern systems compose the two.**
- **XA transactions** (the X/Open standard: a transaction manager coordinating XA-compliant resource managers) still appear in enterprise Java estates — e.g., consuming a JMS message and writing a DB row atomically. It works when both resources speak XA, the transaction manager's log is on durable shared storage, and everything sits in one low-latency trust domain.

Microservices avoid 2PC because none of those preconditions hold: services expose HTTP/gRPC APIs, not XA resource-manager interfaces; teams will not let a foreign coordinator hold locks inside their database; participants live across networks with real partitions; and the availability multiplication in Q3 defeats the purpose of decomposing the system. The industry answer is to give up atomicity across services and buy back correctness with **sagas, outbox, and idempotency** — the rest of this lesson.

### Q5. What is three-phase commit, and why does nobody actually use it?

**Answer:**
3PC inserts a **pre-commit** phase between voting and commit: after unanimous YES votes, the coordinator first tells everyone "we are going to commit" (pre-commit), collects acks, and only then sends commit. The idea: if the coordinator dies, survivors can inspect each other — if anyone reached pre-commit, all voted yes, so survivors can elect a recovery coordinator and safely commit; if no one did, they can safely abort. This removes blocking — **but only under a synchronous model**: bounded message delays, bounded processing time, and crucially **no network partitions**. Under a real partition, two sides can reach opposite conclusions (one side sees pre-commit and commits; the other times out and aborts), violating atomicity. Since real networks are asynchronous and partition-prone, 3PC trades 2PC's blocking for potential *incorrectness*, adds a full extra round trip, and is strictly dominated by consensus-based commit (Paxos/Raft-replicated coordinators). That's why it lives in textbooks and virtually nowhere in production.

---

## Section B — Sagas

### Q6. Define the saga pattern precisely. Which ACID letter does it sacrifice, and what anomalies does that cause?

**Answer:**
A saga is a long-lived business transaction decomposed into a sequence of **local transactions** `T1, T2, …, Tn`, each committing immediately in its own service, paired with **compensating transactions** `C1, …, Cn-1` that semantically undo the corresponding step. If `Tk` fails, the saga executes `Ck-1, …, C1` in reverse order. The guarantee: eventually either all steps complete, or all completed steps are compensated.

Sagas give you **A, C, D but not I — there is no isolation**. Each `Ti` commits and becomes visible to the whole world before the saga finishes. Concrete anomalies:

- **Dirty reads:** another transaction observes `T1`'s output (payment charged) while the saga later aborts and compensates — it read state that was "rolled back."
- **Lost updates:** a concurrent writer modifies a row between `T1` and its compensation `C1`; the compensation then stomps that update.
- **Non-repeatable reads:** a saga re-reads data mid-flight and sees another saga's partial effects.

Standard **countermeasures** (know these by name):
- **Semantic locks / pending states:** `T1` marks the record `PENDING` (e.g., `payment_status = AUTHORIZING`) rather than final; other transactions treat pending rows as off-limits or interpret them cautiously. This is an application-level lock without a lock manager.
- **Commutative updates:** design steps so order doesn't matter — `debit(x)` / `credit(x)` rather than `set balance = 500`, so interleaved sagas compose.
- **Reread value / version checks:** before a critical step, re-read and verify the data hasn't changed since an earlier step (optimistic-concurrency inside the saga).
- **Pessimistic ordering:** reorder steps so the riskiest/most-likely-to-fail step runs first, minimizing the window in which compensations are needed.

**Interview trap:** "Compensation = rollback" is a trap. A compensating transaction is a **new forward transaction with opposite business meaning**, not an undo of bytes. A refund is not an un-charge: the customer's statement shows both lines, an email may already have been sent, and some steps (a fired notification, a shipped package) are only *approximately* compensable. Saga design is business design.

### Q7. Choreography vs orchestration — explain both, draw the flows, and compare.

**Answer:**
**Choreography:** no central brain. Each service subscribes to events and reacts, emitting its own events. The saga's logic is smeared across all participants.

**Orchestration:** a dedicated orchestrator (a saga instance in an order service, or a workflow engine like Temporal/Camunda) sends explicit **commands** to each service, receives replies, persists saga state, and decides the next step or compensation.

```
CHOREOGRAPHY (event flow — no central coordinator)

  Order Svc          Inventory Svc         Payment Svc         Shipping Svc
     |                     |                    |                    |
     |--OrderCreated------>|  (via broker)      |                    |
     |                     |--InventoryReserved-|------------------->|
     |                     |                    |--PaymentCharged--->|
     |                     |                    |                    |--ShipmentCreated
     |<--------------------------------------------------------------- (order svc
     |   marks order COMPLETE on ShipmentCreated                        listens too)

  Each service knows only: "which events do I consume, which do I emit."
  Nobody holds the whole picture.


ORCHESTRATION (command flow — central saga orchestrator)

                    +--------------------+
                    |  Saga Orchestrator |----(persists sagaId,
                    |   (order service)  |     currentStep, status)
                    +--------------------+
                      |        |        |
        1. cmd: reserve        |        3. cmd: createShipment
           Inventory   2. cmd: charge   |
                      v        v        v
              +-----------+ +---------+ +----------+
              | Inventory | | Payment | | Shipping |
              +-----------+ +---------+ +----------+
                      ^        ^        ^
                      |        |        |
               replies/acks flow back to the orchestrator,
               which decides: next step, or compensate in reverse
```

| Dimension | Choreography | Orchestration |
|---|---|---|
| Coupling | Low *syntactic* coupling (services only know events), but high *hidden semantic* coupling — the workflow exists only implicitly | Services coupled to orchestrator's commands; orchestrator knows everyone — explicit, centralized coupling |
| Visibility / observability | Poor: "where is order 123 stuck?" requires correlating events across N services | Excellent: saga state table answers it with one query |
| Cyclic dependencies | Easy to create accidentally (A listens to B's events, B listens to A's) — hard to detect | Structurally impossible between participants; dependencies form a star |
| Adding a step | Touch multiple services' subscriptions; risk of breaking implicit ordering | Change one orchestrator definition |
| Compensation logic | Distributed across services; each must know what to undo on which failure event | Centralized in the orchestrator's reverse-order loop |
| Testing | Requires multi-service integration tests to validate the flow | Orchestrator unit-testable with stubbed steps |
| Single point of failure / bottleneck | None (broker aside) | Orchestrator — must persist state and be recoverable |
| Sweet spot | 2–3 step flows, naturally event-shaped domains | Anything with ≥3 steps, branches, or compensation |

Staff-level guidance: choreography degrades non-linearly with step count. Beyond a handful of steps, or the moment compensation branching appears, orchestrate.

### Q8. Implement an orchestration-style order-processing saga in TypeScript: reserveInventory → chargePayment → createShipment, with compensations, persisted state, and reverse-order compensation on failure.

**Answer:**
The skeleton every interviewer wants: a `SagaStep` interface with `execute`/`compensate`, an orchestrator that records completed steps, persists state transitions, and on failure compensates in reverse with each compensation individually guarded by try/catch (a failed compensation cannot silently vanish — it goes to a manual-intervention queue).

```ts
// ---------- Saga context and step contract ----------

interface OrderSagaContext {
  sagaId: string;
  orderId: string;
  customerId: string;
  items: Array<{ sku: string; quantity: number }>;
  amountCents: number;
  // Filled in as steps execute; used by later steps and by compensations.
  reservationId?: string;
  paymentId?: string;
  shipmentId?: string;
}

interface SagaStep<Ctx> {
  name: string;
  execute(ctx: Ctx): Promise<void>;   // must be idempotent (see Q9)
  compensate(ctx: Ctx): Promise<void>; // must be idempotent too
}

// ---------- Minimal in-file stubs for infra clients ----------

interface SagaStateStore {
  // Persisted table: saga_state(saga_id PK, current_step, status, context_json, updated_at)
  save(sagaId: string, currentStep: string, status: SagaStatus, ctx: unknown): Promise<void>;
  load(sagaId: string): Promise<{ currentStep: string; status: SagaStatus; ctx: unknown } | null>;
}

interface ManualInterventionQueue {
  publish(msg: { sagaId: string; step: string; reason: string }): Promise<void>;
}

type SagaStatus =
  | "RUNNING"
  | "COMPLETED"
  | "COMPENSATING"
  | "COMPENSATED"
  | "NEEDS_MANUAL_INTERVENTION";

// Downstream service clients (idempotent by sagaId-derived keys — see Q9).
interface InventoryClient {
  reserve(key: string, items: OrderSagaContext["items"]): Promise<{ reservationId: string }>;
  release(key: string, reservationId: string): Promise<void>;
}
interface PaymentClient {
  charge(key: string, customerId: string, amountCents: number): Promise<{ paymentId: string }>;
  refund(key: string, paymentId: string): Promise<void>;
}
interface ShippingClient {
  create(key: string, orderId: string): Promise<{ shipmentId: string }>;
  cancel(key: string, shipmentId: string): Promise<void>;
}

// ---------- Concrete steps ----------

function buildOrderSagaSteps(
  inventory: InventoryClient,
  payments: PaymentClient,
  shipping: ShippingClient,
): Array<SagaStep<OrderSagaContext>> {
  return [
    {
      name: "reserveInventory",
      async execute(ctx) {
        const res = await inventory.reserve(`${ctx.sagaId}:reserve`, ctx.items);
        ctx.reservationId = res.reservationId;
      },
      async compensate(ctx) {
        if (ctx.reservationId) {
          await inventory.release(`${ctx.sagaId}:release`, ctx.reservationId);
        }
      },
    },
    {
      name: "chargePayment",
      async execute(ctx) {
        const res = await payments.charge(
          `${ctx.sagaId}:charge`, ctx.customerId, ctx.amountCents,
        );
        ctx.paymentId = res.paymentId;
      },
      async compensate(ctx) {
        if (ctx.paymentId) {
          await payments.refund(`${ctx.sagaId}:refund`, ctx.paymentId);
        }
      },
    },
    {
      name: "createShipment",
      async execute(ctx) {
        const res = await shipping.create(`${ctx.sagaId}:ship`, ctx.orderId);
        ctx.shipmentId = res.shipmentId;
      },
      async compensate(ctx) {
        if (ctx.shipmentId) {
          await shipping.cancel(`${ctx.sagaId}:cancel`, ctx.shipmentId);
        }
      },
    },
  ];
}

// ---------- Orchestrator ----------

class SagaOrchestrator<Ctx extends { sagaId: string }> {
  constructor(
    private readonly steps: Array<SagaStep<Ctx>>,
    private readonly stateStore: SagaStateStore,
    private readonly manualQueue: ManualInterventionQueue,
  ) {}

  async run(ctx: Ctx): Promise<SagaStatus> {
    const completed: Array<SagaStep<Ctx>> = [];

    for (const step of this.steps) {
      // Persist BEFORE executing: if we crash mid-step, recovery knows
      // which step may have partially run and can re-drive it (idempotently).
      await this.stateStore.save(ctx.sagaId, step.name, "RUNNING", ctx);
      try {
        await step.execute(ctx);
        completed.push(step);
      } catch (err) {
        return this.compensateAll(ctx, completed, step.name, err);
      }
    }

    await this.stateStore.save(ctx.sagaId, "done", "COMPLETED", ctx);
    return "COMPLETED";
  }

  private async compensateAll(
    ctx: Ctx,
    completed: Array<SagaStep<Ctx>>,
    failedStep: string,
    cause: unknown,
  ): Promise<SagaStatus> {
    await this.stateStore.save(ctx.sagaId, failedStep, "COMPENSATING", ctx);
    let allCompensated = true;

    // Reverse order: undo the most recent effects first.
    for (const step of [...completed].reverse()) {
      try {
        await step.compensate(ctx);
      } catch (compErr) {
        // A failed compensation must NEVER be swallowed or crash the loop:
        // park it for humans/retry-workers and keep unwinding the rest.
        allCompensated = false;
        await this.manualQueue.publish({
          sagaId: ctx.sagaId,
          step: step.name,
          reason: `compensation failed after ${failedStep} failed: ${String(compErr)} (cause: ${String(cause)})`,
        });
      }
    }

    const finalStatus: SagaStatus = allCompensated
      ? "COMPENSATED"
      : "NEEDS_MANUAL_INTERVENTION";
    await this.stateStore.save(ctx.sagaId, failedStep, finalStatus, ctx);
    return finalStatus;
  }
}
```

Persisted saga-state table:

```sql
CREATE TABLE saga_state (
  saga_id       UUID PRIMARY KEY,
  saga_type     TEXT        NOT NULL,          -- 'order_processing'
  current_step  TEXT        NOT NULL,          -- 'chargePayment'
  status        TEXT        NOT NULL,          -- RUNNING | COMPENSATING | ...
  context_json  JSONB       NOT NULL,          -- reservationId, paymentId, ...
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_saga_stuck ON saga_state (status, updated_at)
  WHERE status IN ('RUNNING', 'COMPENSATING');
```

### Q9. Your orchestrator process crashes between chargePayment succeeding and the state save for createShipment. What happens on restart, and what property makes recovery safe?

**Answer:**
A recovery worker scans `saga_state` for rows in `RUNNING`/`COMPENSATING` whose `updated_at` is older than a threshold (the partial index above makes that scan cheap), reloads the context, and **resumes from `current_step`**. But here's the subtlety: state was persisted *before* the step executed, so on recovery the orchestrator cannot know whether `chargePayment` ran zero times, ran and crashed before recording `paymentId`, or fully succeeded. Its only safe move is to **re-execute the current step** — which is exactly why **every step (and every compensation) must be idempotent**.

That's why each client call in Q8 carries a deterministic idempotency key derived from the saga (`${sagaId}:charge`): re-driving `chargePayment` after a crash hits the payment service with the same key, the service recognizes the duplicate, and returns the original `paymentId` instead of double-charging. The pairing to memorize: **persist-then-execute forces at-least-once step execution; idempotency keys convert at-least-once into effectively-once.** Without the keys, the recovery design above is a double-charge machine. (The alternative — execute-then-persist — is worse: a crash after execute but before persist makes the step invisible to recovery, so it re-runs anyway. You cannot dodge idempotency; you can only pretend to.)

**Production war story:** A marketplace's saga orchestrator was deployed with rolling restarts that SIGKILLed pods after a 10s grace period. Their charge step took p99 ~12s during a payment-provider brownout. Recovery re-drove "stuck" sagas — but the team had derived idempotency keys from a *timestamp* inside the context, which recovery regenerated. Same saga, new key, second charge. Roughly 800 customers were double-charged over a weekend. Fix was one line — key by `sagaId:stepName` — plus a week of refunds and a very uncomfortable incident review.

### Q10. Sketch the same order flow as choreography, and explain concretely where choreography breaks down.

**Answer:**
Each service reacts to the previous event and emits its own:

```
OrderCreated ──> Inventory Svc reserves stock ──> InventoryReserved
InventoryReserved ──> Payment Svc charges card ──> PaymentCharged
PaymentCharged ──> Shipping Svc books carrier ──> ShipmentCreated
ShipmentCreated ──> Order Svc marks order COMPLETE
```

A choreographed handler, sketched:

```ts
interface DomainEvent { type: string; sagaId: string; payload: Record<string, unknown> }
interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe(type: string, handler: (e: DomainEvent) => Promise<void>): void;
}

function wirePaymentService(bus: EventBus, payments: PaymentClient): void {
  bus.subscribe("InventoryReserved", async (e) => {
    try {
      const res = await payments.charge(
        `${e.sagaId}:charge`,
        String(e.payload.customerId),
        Number(e.payload.amountCents),
      );
      await bus.publish({
        type: "PaymentCharged",
        sagaId: e.sagaId,
        payload: { ...e.payload, paymentId: res.paymentId },
      });
    } catch {
      await bus.publish({ type: "PaymentFailed", sagaId: e.sagaId, payload: e.payload });
    }
  });
}
```

Where it breaks down:

- **Who compensates on `PaymentFailed`?** Inventory must subscribe to a *payment* failure event to release its own reservation — the inventory team now maintains code whose trigger lives in another team's domain. Every failure event needs a matching subscription in every upstream service; forget one and reservations leak forever.
- **Implicit coupling:** the workflow "inventory before payment before shipping" is encoded nowhere — it *emerges* from subscription wiring. Reordering steps means coordinating changes across three repos and three deploy schedules.
- **No answer to "where is order 123?"** State is the union of which events fired; debugging means grepping event logs across services.
- **Cycles creep in:** shipping starts emitting events that order service consumes to emit events inventory consumes… and one day a retry storm loops.
- **Partial-failure branches multiply:** what if inventory succeeds, payment succeeds, shipping fails? Now *two* services must hear `ShipmentFailed` and compensate, in an order nobody controls.

Rule of thumb to state: choreography for short, linear, naturally-eventful flows; the moment you draw compensation arrows across more than one hop, move to orchestration.

**Interview trap:** "Choreography is more decoupled, so it's better for microservices." Push back: it swaps visible coupling for *invisible* coupling. The dependency graph still exists — you've just deleted the one place you could read it. Staff engineers name this: choreography optimizes for adding participants, orchestration optimizes for understanding and changing the workflow.

### Q11. Give me the 2PC-vs-saga decision table you'd actually use.

**Answer:**

| Dimension | 2PC / XA | Saga |
|---|---|---|
| Atomicity | True all-or-nothing at commit time | Eventual: forward-complete or compensated; intermediate states visible |
| Isolation | Full (locks held to decision) | None — needs semantic locks, commutativity, pending states |
| Latency | 2+ RTTs + multiple fsyncs, locks held throughout | Each step commits locally; total flow can be long but nothing blocks |
| Availability | Product of all participants' availability; coordinator crash blocks in-doubt participants holding locks | Each step needs only its own service up; failures pause and resume |
| Coupling | Participants must expose XA/prepare interfaces; shared transaction manager | Services expose ordinary APIs/events; coupling is at business level |
| Failure recovery | Coordinator log replay; in-doubt = locked and waiting | Re-drive idempotent steps; compensations; manual-intervention queue |
| Where legitimate | Inside distributed DBs (Spanner: 2PC over Paxos groups); JMS+DB XA in one trust domain | Cross-service business workflows (orders, bookings, transfers) |
| Hidden cost | Ops fragility, lock storms, heuristic outcomes | Business-level compensation design; no-isolation anomalies; more moving parts (state store, recovery workers) |

The one-liner: **2PC buys atomicity with availability; sagas buy availability with isolation.** Choose per boundary, not per company.

---

## Section C — The Outbox Pattern and CDC

### Q12. What is the dual-write problem? Show both failure orderings.

**Answer:**
Dual write: one handler mutates two systems that cannot share a transaction — canonically "commit to Postgres, then publish to Kafka." Whichever order you pick, a crash between the two operations breaks consistency:

**Ordering 1 — DB first, then publish:**
```
1. BEGIN; UPDATE orders SET status='PAID'; COMMIT;   -- durable
2. <process crashes / broker unreachable>
3. kafka.publish(OrderPaid)                          -- never happens
```
Result: the order is paid, but no downstream system ever hears about it. Silent data loss of the event — the worst kind, because nothing errors.

**Ordering 2 — publish first, then DB:**
```
1. kafka.publish(OrderPaid)                          -- consumers react!
2. <process crashes / DB rejects the write>
3. COMMIT                                            -- never happens
```
Result: downstream systems act on an event describing a state change that never committed — shipping labels for an unpaid order. A phantom event.

Wrapping both in try/catch doesn't help: the crash window between the two operations is irreducible, and you cannot roll back a published Kafka message. Nor is "publish inside the DB transaction" real — the publish isn't governed by the DB's commit. The only fixes are a shared atomic commit (2PC across DB+broker — see Section A for why not) or making **one** system the source of truth and deriving the other from it. That's the outbox pattern.

### Q13. Explain the outbox pattern end-to-end, including the relay options and Debezium specifics. Draw the pipeline.

**Answer:**
Core move: turn two writes into **one local ACID transaction** by writing the event into an `outbox` table in the *same database, same transaction* as the business change. A separate **relay** then moves outbox rows to the broker. The DB transaction is now the single atomic commit point: either both the business row and the event exist, or neither does.

```
                     ONE LOCAL ACID TRANSACTION
   +--------------------------------------------------------------+
   |  BEGIN;                                                      |
   |    UPDATE orders SET status = 'PAID' WHERE id = :id;         |
   |    INSERT INTO outbox (id, aggregate_type, aggregate_id,     |
   |                        event_type, payload) VALUES (...);    |
   |  COMMIT;                                                     |
   +--------------------------------------------------------------+
                               |
                               v  (WAL / binlog records both writes)
   +-----------+     +--------------------+     +---------+     +------------+
   | Postgres  | --> |  Debezium (CDC)    | --> |  Kafka  | --> | Consumers  |
   |  WAL      |     |  tails the WAL via |     | topic(s)|     | (must be   |
   |           |     |  logical replicat- |     | keyed by|     | idempotent:|
   |           |     |  ion slot; outbox  |     | aggrega-|     | relay is   |
   |           |     |  event router maps |     | te_id   |     | at-least-  |
   |           |     |  rows -> topics    |     |         |     | once)      |
   +-----------+     +--------------------+     +---------+     +------------+

   Alternative relay: a polling publisher
     loop: SELECT * FROM outbox WHERE published_at IS NULL
             ORDER BY id LIMIT 100 FOR UPDATE SKIP LOCKED;
           publish each; UPDATE ... SET published_at = now();
```

Outbox table DDL:

```sql
CREATE TABLE outbox (
  id             BIGSERIAL   PRIMARY KEY,      -- monotonic per-table order
  aggregate_type TEXT        NOT NULL,         -- 'order'  -> routes to topic
  aggregate_id   TEXT        NOT NULL,         -- '123'    -> Kafka message key
  event_type     TEXT        NOT NULL,         -- 'OrderPaid'
  payload        JSONB       NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at   TIMESTAMPTZ                   -- used by polling relay only
);
CREATE INDEX idx_outbox_unpublished ON outbox (id) WHERE published_at IS NULL;
```

**Relay option 1 — polling publisher:** a worker selects unpublished rows (with `FOR UPDATE SKIP LOCKED` so multiple workers don't collide), publishes, marks them. Simple, no new infrastructure; costs polling latency and DB read load, and a crash after publish but before the `UPDATE` re-publishes the row — at-least-once.

**Relay option 2 — CDC with Debezium:** Debezium runs as a Kafka Connect source connector that **tails the database's transaction log** (Postgres WAL via a logical replication slot; MySQL binlog) rather than querying tables. Every committed outbox INSERT appears in the log in commit order; Debezium converts it to a Kafka record. Key specifics to cite:

- **At-least-once delivery:** Debezium tracks its position (LSN/offset) and, after a crash, resumes from the last *recorded* position — events since then are re-emitted. Duplicates are a feature of the design, not a bug.
- **Outbox Event Router:** a built-in Debezium transform (SMT) purpose-built for this pattern — it routes each outbox row to a topic derived from `aggregate_type`, sets the Kafka **message key to `aggregate_id`**, and lifts `payload` into the message body. It can also be configured to ignore DELETEs so you can prune the outbox.
- **Ordering per key:** Kafka guarantees order within a partition; keying by `aggregate_id` puts all events for one order on one partition, so consumers see that order's events in commit order. There is **no global ordering across aggregates** — say this before the interviewer asks.
- Low latency (log tailing, not polling) and near-zero query load on the source DB.

And the punchline that ties the lesson together: because the relay — polling or Debezium — is at-least-once, **consumers must be idempotent** (dedupe on `outbox.id`/event id, or make handlers naturally idempotent). Outbox fixes the *producer's* atomicity; it deliberately pushes the duplicate problem to consumers, where it's solvable.

**Production war story:** A fintech ran Debezium against Postgres and, during a broker outage, paused the connector for six hours — forgetting that a paused logical replication slot **pins the WAL**. The primary's disk filled with retained WAL segments and Postgres shut itself down; the "event pipeline incident" became a "database down" incident. The runbook now monitors `pg_replication_slots` lag and caps slot retention with `max_slot_wal_keep_size`. CDC couples your broker's health to your database's disk — plan for it.

**Interview trap:** "We use the outbox pattern, so we have exactly-once eventing." No — outbox gives *atomicity* between state and event and *at-least-once* delivery. Deduplication is still the consumer's job. If a candidate designs an outbox and then writes a non-idempotent consumer, they've moved the bug, not fixed it.

---

## Section D — Idempotency Keys, End to End

### Q14. Walk through the full lifecycle of an idempotency key from client to stored response. Draw it.

**Answer:**
The contract: the **client generates a UUID per logical operation** — "pay for cart 42" gets one key at intent time — and **every retry of that operation reuses the same key**. (A new key per HTTP attempt defeats the entire mechanism.) Stripe's public API is the canonical example of these exact semantics: `Idempotency-Key` header, replayed stored responses, keys expiring after ~24h, and reuse-with-different-payload rejected.

```
CLIENT                          API LAYER                        POSTGRES
  |                                 |                                |
  |  generate key K = uuid()        |                                |
  |  (per logical op, kept          |                                |
  |   across retries)               |                                |
  |                                 |                                |
  |--POST /payments  Idem-Key: K--->|                                |
  |                                 |--INSERT idempotency_keys       |
  |                                 |  (key=K, status='in_flight',   |
  |                                 |   request_hash=H)              |
  |                                 |  ON CONFLICT DO NOTHING ------>|
  |                                 |                                |
  |                    +------------+-------------+                  |
  |                    | insert won?              |                  |
  |                    |                          |                  |
  |            YES: we own K              NO: row exists             |
  |            process the request        SELECT the row:            |
  |            store response on K         - completed -> replay     |
  |            status='completed'            stored response         |
  |                    |                    - in_flight -> 409 /     |
  |                    |                      Retry-After (or wait)  |
  |                    |                    - hash != H -> 422:      |
  |                    |                      key reused w/ new body |
  |<---- 201 {payment} + stored ----+                                |
  |                                 |                                |
  |  (network error! client         |                                |
  |   retries with SAME key K)      |                                |
  |--POST /payments  Idem-Key: K--->|                                |
  |                                 |-- insert loses; row completed  |
  |<---- 201 {payment} REPLAYED ----|   replay response_body         |
```

Steps, precisely:
1. **Lookup/claim:** the API attempts to claim the key. The claim must be an **atomic insert guarded by a unique constraint** — the DB is the gate.
2. **If completed:** return the stored `response_code` + `response_body` verbatim. The client cannot distinguish replay from first execution — that's the point.
3. **If in-flight:** another request with this key is mid-processing. Return `409 Conflict` (with `Retry-After`), or block briefly and re-check. Never process concurrently.
4. **If new:** process the business logic, persist the response against the key (ideally in the same transaction as the business write), mark `completed`, respond.

Three design details that separate senior answers:
- **Scoping:** keys are unique per **endpoint + authenticated user/tenant**, not globally — otherwise two customers who both send key `1` collide, and a key for `POST /payments` must not replay against `POST /refunds`. Bake scope into the primary key.
- **TTL:** keys expire (24h is the common public example). Expiry bounds table growth and defines the retry window; a cron/partition-drop deletes old rows.
- **Request hash:** store a hash of the canonical request body. If the same key arrives with a **different** payload, reject with 422 — the client has a bug (reusing keys across different operations), and silently replaying the *old* response would be a lie.

### Q15. Two retries of the same request arrive concurrently on two API instances. Race through it — why is a cache check not enough, and what makes exactly one winner?

**Answer:**
The naive design — "check Redis/DB for the key; if absent, process" — is a textbook **check-then-act race**. Both requests read "absent" within microseconds of each other, both proceed, the payment happens twice. No amount of "check again right before charging" closes the window; it only shrinks it.

The correct gate is a **uniqueness guarantee enforced by the datastore at write time**: `INSERT ... ON CONFLICT DO NOTHING` on a primary key (or a unique index). Both instances race to insert the same key; the database's constraint machinery serializes them — **exactly one insert succeeds**. The winner proceeds to process. The loser's insert affects zero rows; it then SELECTs the row and finds either `in_flight` (winner still working → return 409/Retry-After or poll) or `completed` (winner finished → replay the stored response). At no point do two processors run the business logic for one key.

State this crisply in interviews: **the unique constraint is the lock**. Redis `SET NX` can play the same role, but then Redis durability becomes part of your money-safety story (a failover that loses the key = a duplicate charge); with money, put the gate in the transactional database, next to the business write.

**Interview trap:** "I'd check the cache for the idempotency key first, and only hit the DB on a miss." As the *whole* mechanism this is broken twice over: it's check-then-act (racy), and cache eviction/failover silently forgets keys. A cache is fine as a *read-through accelerator* for replaying completed responses — never as the claim gate.

### Q16. Implement it: Express-style handler, Postgres table, ON CONFLICT claim, stuck-in-flight recovery, response replay.

**Answer:**
DDL first:

```sql
CREATE TABLE idempotency_keys (
  key            TEXT        NOT NULL,
  scope          TEXT        NOT NULL,   -- '<user_id>:<method>:<path>'
  request_hash   TEXT        NOT NULL,   -- sha256 of canonical body
  status         TEXT        NOT NULL DEFAULT 'in_flight',
                              -- 'in_flight' | 'completed'
  response_code  INT,
  response_body  JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (key, scope)               -- scoping baked into the constraint
);
-- TTL cleanup: DELETE FROM idempotency_keys WHERE created_at < now() - interval '24 hours';
```

```ts
import { createHash } from "node:crypto";

// ---------- Minimal typed stubs for the infrastructure ----------

interface QueryResult<Row> { rows: Row[]; rowCount: number }
interface Db {
  query<Row = Record<string, unknown>>(sql: string, params: unknown[]): Promise<QueryResult<Row>>;
}

// Express-shaped types, kept minimal and local.
interface Request {
  method: string;
  path: string;
  headers: Record<string, string | undefined>;
  body: unknown;
  userId: string; // set by auth middleware
}
interface Response {
  status(code: number): Response;
  set(name: string, value: string): Response;
  json(body: unknown): void;
}

interface IdempotencyRow {
  status: "in_flight" | "completed";
  request_hash: string;
  response_code: number | null;
  response_body: unknown;
  created_at: string;
}

const IN_FLIGHT_TIMEOUT_MS = 60_000;

function hashBody(body: unknown): string {
  return createHash("sha256").update(JSON.stringify(body ?? null)).digest("hex");
}

// ---------- The idempotent handler wrapper ----------

function withIdempotency(
  db: Db,
  handler: (req: Request) => Promise<{ code: number; body: unknown }>,
) {
  return async (req: Request, res: Response): Promise<void> => {
    const key = req.headers["idempotency-key"];
    if (!key) {
      res.status(400).json({ error: "Idempotency-Key header required" });
      return;
    }
    const scope = `${req.userId}:${req.method}:${req.path}`;
    const requestHash = hashBody(req.body);

    // 1) CLAIM: the unique constraint is the real gate. Exactly one
    //    concurrent request wins this insert; everyone else gets rowCount 0.
    const claim = await db.query(
      `INSERT INTO idempotency_keys (key, scope, request_hash, status)
       VALUES ($1, $2, $3, 'in_flight')
       ON CONFLICT (key, scope) DO NOTHING`,
      [key, scope, requestHash],
    );

    if (claim.rowCount === 0) {
      // 2) We lost the race (or this is a retry). Inspect the existing row.
      const existing = await db.query<IdempotencyRow>(
        `SELECT status, request_hash, response_code, response_body, created_at
         FROM idempotency_keys WHERE key = $1 AND scope = $2`,
        [key, scope],
      );
      const row = existing.rows[0];
      if (!row) {
        // Row deleted by TTL between insert and select; tell client to retry.
        res.status(409).set("Retry-After", "1").json({ error: "retry" });
        return;
      }

      // Stripe-style payload check: same key + different body = client bug.
      if (row.request_hash !== requestHash) {
        res.status(422).json({
          error: "Idempotency-Key reused with a different request payload",
        });
        return;
      }

      if (row.status === "completed") {
        // 3) REPLAY the stored response verbatim.
        res.status(row.response_code ?? 200).json(row.response_body);
        return;
      }

      // 4) in_flight: is the original owner alive, or did it crash?
      const ageMs = Date.now() - new Date(row.created_at).getTime();
      if (ageMs < IN_FLIGHT_TIMEOUT_MS) {
        res.status(409).set("Retry-After", "5")
          .json({ error: "request with this key is in flight" });
        return;
      }

      // RECOVERY: stale in-flight row — owner likely crashed mid-processing.
      // Atomically re-claim by bumping created_at; only one recoverer wins.
      const reclaim = await db.query(
        `UPDATE idempotency_keys SET created_at = now()
         WHERE key = $1 AND scope = $2 AND status = 'in_flight'
           AND created_at < now() - ($3 || ' milliseconds')::interval`,
        [key, scope, String(IN_FLIGHT_TIMEOUT_MS)],
      );
      if (reclaim.rowCount === 0) {
        res.status(409).set("Retry-After", "5").json({ error: "in flight" });
        return;
      }
      // We own it now; fall through to process. NOTE: this is safe only
      // because the underlying handler's effects are themselves idempotent
      // (e.g., it passes this same key downstream to the payment provider).
    }

    // 5) PROCESS, then persist the response against the key, then respond.
    try {
      const result = await handler(req);
      await db.query(
        `UPDATE idempotency_keys
         SET status = 'completed', response_code = $3, response_body = $4
         WHERE key = $1 AND scope = $2`,
        [key, scope, result.code, JSON.stringify(result.body)],
      );
      res.status(result.code).json(result.body);
    } catch (err) {
      // Free the key so the client's retry can attempt again.
      await db.query(
        `DELETE FROM idempotency_keys
         WHERE key = $1 AND scope = $2 AND status = 'in_flight'`,
        [key, scope],
      );
      res.status(500).json({ error: "processing failed", detail: String(err) });
    }
  };
}
```

Points to narrate while whiteboarding this:
- The `ON CONFLICT DO NOTHING` insert is the concurrency control; everything after it is bookkeeping.
- The **stuck-in-flight recovery** (step 4) exists because a process can die after claiming but before completing; without it, a crash permanently bricks that key. Re-claiming must itself be atomic (the conditional `UPDATE` — only one recoverer's update matches).
- Recovery re-runs the handler, so the handler's downstream effects must be idempotent too — idempotency composes down the stack (the API passes the same key to the payment provider).
- For the strongest guarantee, mark `completed` **in the same DB transaction as the business write**, so "effect happened" and "response recorded" cannot diverge.

**Production war story:** An e-commerce API stored idempotency keys in Redis with `SET NX EX 86400`. During a cache-cluster failover, roughly ninety seconds of recently-set keys were lost. Mobile clients, retrying aggressively on the flaky network that coincided with the incident, re-sent orders whose keys had evaporated — about 1,200 duplicate orders shipped before anyone noticed, because nothing *errored*. The fix moved the key table into Postgres alongside the orders table, with Redis demoted to an optional replay cache. Moral: the idempotency gate must be at least as durable as the effect it guards.

### Q17. What are the subtle design decisions in an idempotency-key system that interviewers use to probe depth?

**Answer:**
- **Who generates the key?** The client, at *intent* time — only the client knows that two HTTP requests represent one logical action. Server-generated keys can only dedupe what the server can already see.
- **What do you store — the response, or a pointer?** Store the full serialized response (code + body). Recomputing the response on replay from current state can produce a *different* answer than the original (prices changed, resource mutated), breaking the "retries are invisible" contract.
- **Replay fidelity:** replay should include status code and relevant headers, and many APIs add a header like `Idempotent-Replayed: true` for observability without changing semantics.
- **Failure semantics:** if processing failed with a *deterministic* 4xx, you may store and replay the error too (retrying a validation error is pointless). If it failed with a transient 5xx, free the key (as the code above does) so a retry can actually retry.
- **Key + payload mismatch:** always reject (422), never replay — a replayed response to a different request is data corruption delivered politely.
- **TTL vs business retry window:** the TTL must exceed the longest plausible client retry horizon (mobile clients replaying queued requests after a day offline are the classic surprise).

---

## Section E — Exactly-Once, Properly Understood

### Q18. "Our queue gives us exactly-once delivery." Attack that statement.

**Answer:**
Exactly-once **delivery** over a lossy network is impossible, and the Two Generals problem is the one-paragraph proof: two generals on hills must agree to attack together, communicating by messengers who may be captured. General A sends "attack at dawn"; A cannot act without knowing B received it, so B must ack; but B cannot know A received the ack, so A must ack the ack — and by induction, no finite number of messages lets either side *know* the other will act. Applied to messaging: after a sender times out, it cannot distinguish "message lost" from "message processed but the ack was lost." Its only choices are **don't resend** (risking zero deliveries — at-most-once) or **resend** (risking two — at-least-once). "Exactly once, every time, guaranteed at the delivery layer" is not on the menu.

What vendors selling "exactly-once" actually provide is **exactly-once processing/effect**: messages may arrive multiple times, but the *observable effect* happens once, because the receiving side deduplicates or the effect is idempotent. The distinction — delivery vs processing — is exactly the line interviewers are checking you can draw.

### Q19. So how do you actually achieve exactly-once effects? Give the two mechanisms and the interview-safe formulation.

**Answer:**
**Mechanism 1 — at-least-once + idempotent/deduplicating consumer.** The broker redelivers freely; the consumer makes duplicates harmless, by either
- **natural idempotency:** the operation is a no-op when repeated (`SET status='SHIPPED'`, upserts, "create with this exact ID"), or
- **explicit dedup:** the consumer records processed message IDs **in the same local transaction as its state change** — `BEGIN; INSERT INTO processed_messages(id) VALUES ($1); UPDATE ...; COMMIT;` — so the unique constraint on `processed_messages.id` rejects replays atomically with the effect. (This is the outbox pattern's mirror image; some call it the *inbox pattern*.)

**Mechanism 2 — atomic offset + output commit.** Make "I consumed input X" and "I produced output Y" one atomic operation. Kafka transactions implement this for consume-transform-produce pipelines: the producer sends its output messages *and* commits the consumer offsets inside one broker-side transaction, with idempotent producers (sequence numbers per partition) suppressing resend duplicates and read-committed consumers hiding aborted results. Powerful — but scoped: it holds within the Kafka-to-Kafka pipeline, not once effects escape to an external DB or API (there you're back to mechanism 1). The DB-flavored equivalent: store your consumer offset in the same database transaction as your output rows, and seek to that offset on restart.

The interview-safe formulation, verbatim: **"Exactly-once delivery is impossible; exactly-once processing is an end-to-end property you engineer: at-least-once delivery + idempotency = effectively once."** Then note that it's end-to-end (Kafka transactions upstream don't save you if your consumer's HTTP call downstream isn't idempotent) — the guarantee is only as strong as the last non-idempotent hop.

**Interview trap:** Candidates who say "we enabled `enable.idempotence=true` on the Kafka producer, so the pipeline is exactly-once." That setting only dedupes *producer retries to the broker* (per partition, per producer session). It says nothing about consumer redelivery, rebalances replaying uncommitted messages, or side effects your consumer performs. Idempotent producer ≠ exactly-once pipeline.

### Q20. Tie it all together: design the write path for "customer places an order" using everything in this lesson.

**Answer:**
The composed architecture, end to end:

1. **Edge — idempotency key (Section D):** client sends `POST /orders` with `Idempotency-Key`. The API claims the key via `INSERT ... ON CONFLICT DO NOTHING` in Postgres; retries and double-clicks replay the stored response.
2. **Atomic local commit + outbox (Section C):** in **one** Postgres transaction: insert the `orders` row, insert the `outbox` row (`OrderCreated`), mark the idempotency key `completed` with the response. One fsync, three facts, no dual write.
3. **CDC relay:** Debezium tails the WAL, the outbox event router publishes `OrderCreated` to Kafka keyed by `orderId` — at-least-once, ordered per order.
4. **Saga orchestration (Section B):** an orchestrator consumes `OrderCreated` and drives reserveInventory → chargePayment → createShipment, persisting `saga_state` before each step, passing `sagaId:step`-derived idempotency keys downstream. On step failure: compensations in reverse, each try/caught, failures parked on a manual-intervention queue. On orchestrator crash: recovery worker resumes stale `RUNNING` sagas from `current_step`.
5. **Consumers — effectively-once (Section E):** every downstream consumer dedupes (inbox table or natural idempotency) because both the CDC relay and the saga recovery deliver at-least-once.
6. **No 2PC anywhere (Section A):** each arrow in the design is a single-system local transaction or an idempotent retryable call. Atomicity where it's cheap (one DB), compensation where it isn't (across services).

If asked "where can this still go wrong?", the honest answers: compensations are business-approximate (refund ≠ un-charge); saga steps expose intermediate states (no isolation — pending states mitigate); the manual-intervention queue needs actual humans and dashboards; and every guarantee rests on the discipline that **every consumer and every step handler is idempotent** — one non-idempotent handler quietly re-breaks the whole chain.

### Q21. Rapid-fire: five one-liners you should be able to produce cold.

**Answer:**
- **Why does a YES vote block?** Because it's a durable promise that surrenders the right to decide; only the coordinator's log knows the outcome, so an in-doubt participant holding locks can neither commit nor abort alone.
- **Why is 3PC not used?** Its non-blocking property assumes bounded delays and no partitions; real networks violate both, and under partition 3PC can commit on one side and abort on the other.
- **Saga in one sentence?** A sequence of local transactions with compensating transactions — atomic-ish and durable, but with zero isolation, so pending states and commutative updates do the isolation work by hand.
- **Outbox in one sentence?** Make the event a row in the same local transaction as the business change, and let a relay (poller or Debezium tailing the WAL) publish it at-least-once.
- **Exactly-once in one sentence?** Impossible as delivery (Two Generals), achievable as effect: at-least-once + idempotency = effectively once.
