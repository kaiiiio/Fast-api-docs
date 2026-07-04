# Lesson 4.9 — Design a Payment System

> Module: System Design (HLD) | Level: Senior | FDE Prep Phase 4

Payment systems are the one design question where throughput is a distraction. 1M payments/day is ~12 TPS — a laptop handles that. What kills payment systems is *correctness under partial failure*: a network timeout where you don't know if the charge went through, a retry that double-bills a customer, a ledger that drifts from the bank's records by $0.03 and nobody notices for a quarter. Senior candidates are graded on idempotency, ledgers, sagas, and reconciliation — not on sharding.

## Step 1: Requirements (functional + non-functional)

### Clarifying questions you should ask

| Question | Why it matters |
|---|---|
| "Are we the merchant-of-record processing via a PSP (Stripe/Adyen), or are we building the PSP itself?" | Completely different problems. Via-PSP means you never touch card networks and can stay out of deep PCI scope. Building a PSP means ISO 8583, acquirer connections, network tokens. Interviewers almost always mean the first — confirm it. |
| "One PSP or multiple?" | Multi-PSP forces provider abstraction, routing, and failover — and failover is where double-charge bugs live. Say you'll design for multi-PSP because it also drives the deep dives. |
| "Auth-then-capture, or immediate capture?" | E-commerce typically authorizes at checkout and captures at shipment. Two-phase money movement means a state machine with more states and more failure windows. |
| "Do we hold user balances (wallet), or only pass-through card payments?" | Wallets mean we ARE a ledger of record and may hit money-transmitter licensing. Even pass-through needs an internal ledger for fees, payables, refunds. |
| "Refunds, partial refunds, chargebacks in scope?" | Refunds double the state machine. Chargebacks arrive weeks later via files/webhooks — they force reconciliation and immutable history. Say yes to refunds, acknowledge chargebacks. |
| "Multi-currency?" | Decides whether amount is `(BIGINT minor_units, currency_code)` from day one. Retrofitting currency is brutal. Assume yes. |
| "What's the tolerance for losing a payment record?" | Zero. This is the NFR that justifies synchronous durable writes, the outbox pattern, and daily reconciliation. Say it out loud: "durability and correctness beat latency here." |

**Interview trap:** Opening with "let's estimate QPS and shard the database" on a payments question. The interviewer hears "this person optimizes the wrong axis." Open with: "the hard part here is exactly-once money movement over at-least-once infrastructure."

### Agreed functional requirements

1. Accept a payment for an order: card (tokenized) via PSP; auth → capture flow.
2. Full and partial refunds.
3. Internal double-entry ledger tracking merchant payables, platform fees, PSP clearing.
4. Merchant-facing payment status API + outbound webhooks.
5. Inbound PSP webhooks (capture confirmed, dispute opened, payout settled).
6. Daily reconciliation against PSP settlement reports.
7. Synchronous fraud/risk check before authorization.

### Non-functional requirements

- **Correctness:** no double charges, no lost payments, ledger always balances. This dominates everything.
- **Durability:** a payment intent, once accepted (200 returned), is never lost. RPO = 0 for payment records.
- **Availability:** 99.99% on the payment-accept path. Degrade gracefully: if the PSP is down, queue as `pending`, don't error the checkout if product allows.
- **Latency:** p99 < 2s for the synchronous auth path (PSP round trip dominates; ~500ms–1.5s of it is Stripe/Adyen).
- **Auditability:** every state transition recorded, immutable, with actor and timestamp. Regulators and finance teams will read this.
- **Security/compliance:** PCI-DSS scope minimized (SAQ-A), secrets in KMS/HSM, PII encrypted at rest.

## Step 2: Estimation

Do the math to prove the point that scale is NOT the problem:

- **Volume:** 1M payments/day.
- **Average TPS:** 1,000,000 / 86,400 ≈ **11.6 TPS**.
- **Peak:** assume 8–10x average for flash sales/holiday spikes → **~100–120 TPS**. A single Postgres primary does thousands of TPS of small transactions. No sharding needed for years.
- **Writes per payment:** ~1 payment row + ~5–8 state-transition rows + ~4–10 ledger entries + 1 outbox row + 1 idempotency row ≈ **~20 rows/payment** → ~2,400 writes/sec at peak. Still trivial for one primary with NVMe.
- **Storage:** payment row ~1 KB, ledger entries ~200 B each. Per payment ≈ 3 KB total. 1M/day × 3 KB ≈ **3 GB/day ≈ ~1.1 TB/year**. Keep 2 years hot (~2.2 TB), archive older partitions to S3/Parquet. Partition `payments` and `ledger_entries` by month.
- **Webhook fan-out:** 1M payments × ~4 events each = 4M outbound events/day ≈ 46/sec average, ~500/sec peak. One modest worker pool.
- **Reconciliation batch:** 1M settlement lines/day, processed offline in minutes with a batch job. Not a scaling concern; a correctness concern.

State the conclusion explicitly, because it IS the senior signal: **"At 1M/day this is a ~12 TPS average, ~100 TPS peak system. Throughput is a non-problem. Every design decision from here optimizes for correctness, auditability, and recoverability — not scale."**

**Interview trap:** Estimating storage in petabytes or proposing Cassandra "for write scale." You just told the interviewer you didn't do the arithmetic. Payments at even Stripe's scale (hundreds of millions of API calls/day) still run the money path through consistent relational stores.

## Step 3: API design

All money-mutating endpoints require an `Idempotency-Key` header (client-generated UUIDv4 per *logical* operation — same key on retry, new key for a genuinely new attempt).

```
POST /v1/payments
Headers:
  Authorization: Bearer <merchant_api_key>
  Idempotency-Key: 9f2c1e4a-...            # REQUIRED
Body:
{
  "amount": 4999,                          // minor units, BIGINT. NEVER floats.
  "currency": "USD",
  "payment_method_token": "pm_tok_abc123", // PSP token — raw PAN never reaches us
  "capture": false,                        // auth now, capture later
  "order_id": "ord_78421",
  "metadata": { "cart_id": "..." }
}
201 →
{
  "id": "pay_01HVX...",
  "status": "authorized",                  // created|authorized|captured|settled|failed|refunded
  "amount": 4999,
  "currency": "USD",
  "psp": "stripe",
  "psp_reference": "pi_3Ok...",
  "created_at": "2026-07-04T10:00:00Z"
}
409 → { "error": "idempotency_conflict", "detail": "key in flight, retry after 2s" }
422 → { "error": "idempotency_key_reused", "detail": "same key, different request body" }
```

```
POST /v1/payments/{id}/capture        Idempotency-Key required
Body: { "amount": 4999 }              // supports partial capture
→ 200 { "status": "captured", ... }

POST /v1/payments/{id}/refunds        Idempotency-Key required
Body: { "amount": 1500, "reason": "requested_by_customer" }
→ 201 { "id": "ref_01HVY...", "status": "pending", ... }

GET  /v1/payments/{id}                → current state + state history
GET  /v1/payments?order_id=...        → lookup by merchant order

POST /v1/webhook-endpoints            → merchant registers URL + gets signing secret
POST /internal/psp-webhooks/stripe    → inbound PSP events (HMAC verified)
```

Design decisions worth saying out loud:

- **Reads are safe to retry; writes are not — hence the header only on POSTs.**
- **Status is returned, never assumed.** A 201 on `POST /payments` with `capture:false` returns `authorized`, not `succeeded`. Clients must handle `pending` (PSP timeout path).
- **Amounts are integers in minor units + ISO currency code.** `4999 USD` = $49.99. `4999 JPY` = ¥4999 (zero-decimal currency) — this is why the currency travels with the amount.

**Interview trap:** Designing `POST /payments` to be "safe to retry because HTTP is stateless." HTTP retries are exactly the problem. If you don't bring up idempotency before the interviewer does, on a payments question, that alone can sink you.

## Step 4: High-level architecture

```
                                  ┌──────────────────────────────────────────┐
                                  │                YOUR PLATFORM             │
 Browser/App                      │                                          │
 ┌──────────┐  card # → PSP JS    │  ┌───────────┐   ┌──────────────────┐    │
 │ Checkout │────────────────────────▶ (never us) │   │                  │    │
 │  page    │◀── pm_token ────────┐  └───────────┘   │                  │    │
 └────┬─────┘                     │                  │                  │    │
      │ POST /payments            │                  │                  │    │
      │ (token, Idempotency-Key)  │                  ▼                  │    │
      ▼                           │  ┌───────────────────────────┐      │    │
 ┌──────────┐    ┌────────────┐   │  │   Payment Orchestrator    │      │    │
 │ API GW   │───▶│ Payments   │──────│   (saga state machine)    │      │    │
 │ authn,   │    │ API svc    │   │  │ created→authorized→       │      │    │
 │ rate lim │    │ idempotency│   │  │ captured→settled/failed   │      │    │
 └──────────┘    └─────┬──────┘   │  └───────┬─────────┬─────────┘      │    │
                       │          │          │         │                │    │
                 ┌─────▼──────┐   │   ┌──────▼───┐ ┌───▼─────────┐      │    │
                 │ Risk/Fraud │   │   │ PSP      │ │ Ledger svc  │      │    │
                 │ svc (sync) │   │   │ Adapters │ │ double-entry│      │    │
                 └────────────┘   │   │ stripe/  │ │ append-only │      │    │
                                  │   │ adyen    │ └───┬─────────┘      │    │
                                  │   └───┬──────┘     │                │    │
                                  │       │            │   ┌─────────┐  │    │
   ┌──────────────┐   settlement  │       │        ┌───▼───▼──┐ CDC/ │  │    │
   │ Stripe/Adyen │◀──────────────────────┘        │ Postgres │ outbox│  │    │
   │ (PSP)        │  files (T+1)  │                │ (primary │──────▶│Kafka│
   └──────┬───────┘               │                │ + outbox)│       └──┬──┘
          │ webhooks              │                └────┬─────┘          │
          ▼                       │                     │                ▼
   ┌──────────────┐               │            ┌────────▼──────┐  ┌──────────┐
   │ Webhook      │               │            │ Reconciliation│  │ Outbound │
   │ Ingest svc   │───────────────┘            │ engine (batch)│  │ webhook  │
   │ (verify HMAC,│                            └───────────────┘  │ dispatch │
   │  dedupe, enq)│                                               └──────────┘
   └──────────────┘
```

Component walkthrough:

- **API gateway:** merchant API-key auth, coarse rate limiting, TLS termination. No payment logic.
- **Payments API service:** validates request, runs the **idempotency claim** (deep dive 1), creates the payment record, hands off to the orchestrator. This is the boundary where a request becomes a durable fact.
- **Risk/fraud service:** synchronous call in the auth path (rules + model score). Returns approve / decline / review. Budget ~100–150ms; on timeout, fail open or closed per merchant risk policy — say that this is a *product* decision you'd surface, not silently choose.
- **Payment orchestrator:** explicit saga state machine (deep dive 3). Owns transitions, timeouts, and the recovery job. It is the only writer of payment state.
- **PSP adapters:** one per provider behind a common interface (`authorize`, `capture`, `refund`, `void`, `getStatus`). Translates our idempotency key into the provider's (Stripe's `Idempotency-Key` header). Enables multi-PSP routing.
- **Ledger service:** append-only double-entry ledger (deep dive 2). Posted transactionally with payment state changes via the same Postgres, exported via outbox.
- **Postgres (primary + sync replica):** the money store. Payments, state history, ledger, idempotency keys, outbox — one database so a single ACID transaction can cover "flip state + post ledger + emit event."
- **Transactional outbox → Kafka:** every domain event (`payment.captured`, `refund.succeeded`) is inserted in the *same DB transaction* as the state change; a relay tails the outbox table (or Debezium CDC) and publishes to Kafka at-least-once. Consumers dedupe by event id. This is how "exactly-once ledger/event effects" is actually achieved: atomic local commit + at-least-once delivery + idempotent consumers.
- **Webhook ingest:** verifies PSP HMAC signatures, dedupes by event id, ACKs 200 fast, processes async (deep dive 5).
- **Reconciliation engine:** nightly batch matching PSP settlement files against our ledger (deep dive 4).

**Interview trap:** Putting a message queue between "accept payment" and "write payment to DB" for "scalability." If the enqueue succeeds and the broker loses the message (or a consumer crashes pre-commit), you told the customer 200 and lost their payment. The durable DB write comes first; async fan-out comes off the outbox, after commit.

## Step 5: Data model

Datastore: **PostgreSQL**, primary + synchronous replica (RPO 0), monthly partitions on the big tables. Why relational: multi-row ACID transactions (state + ledger + outbox atomically), constraints as safety nets (unique keys, checks), and finance/audit teams live in SQL. NoSQL buys us nothing at 100 TPS and costs us the transactions we depend on.

```sql
CREATE TABLE payments (
  id              TEXT PRIMARY KEY,            -- pay_ULID (time-ordered)
  merchant_id     TEXT NOT NULL,
  order_id        TEXT NOT NULL,
  amount_minor    BIGINT NOT NULL CHECK (amount_minor > 0),
  currency        CHAR(3) NOT NULL,            -- ISO 4217
  status          TEXT NOT NULL,               -- created|authorized|captured|settled|failed|refunded|voided
  psp             TEXT,                        -- 'stripe' | 'adyen'
  psp_reference   TEXT,                        -- pi_... ; the reconciliation join key
  risk_score      INT,
  version         INT NOT NULL DEFAULT 0,      -- optimistic locking on transitions
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX payments_psp_ref_uq ON payments (psp, psp_reference);
CREATE INDEX payments_merchant_order_ix ON payments (merchant_id, order_id);
CREATE INDEX payments_status_updated_ix ON payments (status, updated_at); -- recovery job scan

CREATE TABLE payment_transitions (              -- immutable audit trail
  id            BIGSERIAL PRIMARY KEY,
  payment_id    TEXT NOT NULL REFERENCES payments(id),
  from_status   TEXT NOT NULL,
  to_status     TEXT NOT NULL,
  actor         TEXT NOT NULL,                  -- 'orchestrator'|'psp_webhook'|'recovery_job'|'ops:jane'
  detail        JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE idempotency_keys (
  merchant_id     TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash    TEXT NOT NULL,               -- sha256 of canonicalized body + path
  status          TEXT NOT NULL,               -- 'in_flight' | 'completed'
  response_code   INT,
  response_body   JSONB,
  locked_until    TIMESTAMPTZ,                 -- in-flight lease
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL,        -- created_at + 24h (Stripe's TTL)
  PRIMARY KEY (merchant_id, idempotency_key)   -- THE constraint that prevents double charges
);

CREATE TABLE ledger_transactions (
  id           TEXT PRIMARY KEY,               -- txn_ULID
  payment_id   TEXT,
  kind         TEXT NOT NULL,                  -- 'capture'|'refund'|'fee'|'payout'|'reversal'
  posted_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ledger_entries (                  -- APPEND-ONLY. No UPDATE, no DELETE. Ever.
  id             BIGSERIAL PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES ledger_transactions(id),
  account_id     TEXT NOT NULL,                -- e.g. 'psp_clearing:stripe:USD'
  direction      TEXT NOT NULL CHECK (direction IN ('debit','credit')),
  amount_minor   BIGINT NOT NULL CHECK (amount_minor > 0),
  currency       CHAR(3) NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ledger_entries_account_ix ON ledger_entries (account_id, id);

CREATE TABLE account_balances (                -- materialized cache, NOT source of truth
  account_id     TEXT PRIMARY KEY,
  balance_minor  BIGINT NOT NULL,
  currency       CHAR(3) NOT NULL,
  as_of_entry_id BIGINT NOT NULL               -- snapshot high-water mark
);

CREATE TABLE outbox (
  id           BIGSERIAL PRIMARY KEY,
  event_id     TEXT NOT NULL UNIQUE,           -- consumers dedupe on this
  aggregate_id TEXT NOT NULL,
  event_type   TEXT NOT NULL,                  -- 'payment.captured' ...
  payload      JSONB NOT NULL,
  published_at TIMESTAMPTZ                     -- NULL = pending relay
);

CREATE TABLE psp_events (                      -- inbound webhook dedupe
  psp        TEXT NOT NULL,
  event_id   TEXT NOT NULL,                    -- evt_... from Stripe
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  payload    JSONB NOT NULL,
  PRIMARY KEY (psp, event_id)
);
```

Choices to defend:

| Choice | Alternative | Why this one |
|---|---|---|
| BIGINT minor units + currency | DECIMAL / FLOAT | FLOAT is forbidden: 0.1 + 0.2 ≠ 0.3; rounding drift compounds into real money. DECIMAL is acceptable but minor-unit integers make sums exact, cheap, and unambiguous across currencies. |
| ULID ids | Auto-increment / UUIDv4 | Time-sortable (index locality), non-guessable enough, safe to expose in APIs. |
| Append-only transitions + ledger | Mutable status column only | Auditors and incident responders need "what happened and when," not "current value." Corrections are new reversing rows. |
| One Postgres for money tables | Service-per-DB microservices purity | Cross-DB atomicity would force distributed transactions on every payment. Keep the money invariant inside one ACID boundary; split read/analytics paths instead. |
| Optimistic `version` column | Row locks everywhere | Transitions are short; compare-and-swap (`WHERE id=? AND version=?`) rejects stale writers cheaply and shows up in metrics. |

## Step 6: Deep dives

### Deep dive 1: Idempotency (the #1 topic — go deepest here)

**The problem, stated precisely.** The client POSTs a charge. The TCP connection times out after 10s. Three worlds are possible: (a) the request never reached you; (b) it reached you and failed; (c) it reached you, the charge SUCCEEDED, and only the response was lost. The client cannot distinguish them. **A network timeout is not a failure — it's an unknown.** If the client retries blindly and you treat the retry as a new operation, world (c) becomes a double charge. If the client *doesn't* retry, world (a) becomes an abandoned sale. Idempotency is what makes retrying always safe, which is the only sane client policy.

**Key design (Stripe's model).** The *client* generates a UUID per **logical operation** — "charge this cart once" — and sends it as an `Idempotency-Key` header. Retries of the same operation reuse the key; a genuinely new attempt (user edited cart, new checkout) gets a new key. The server treats the key as the identity of the operation, not the HTTP request.

**Server implementation — insert-first, or you have a race.**

The critical rule: **claim the key atomically BEFORE any side effect.** The claim is an INSERT protected by the unique constraint on `(merchant_id, idempotency_key)`:

```sql
INSERT INTO idempotency_keys
  (merchant_id, idempotency_key, request_hash, status, locked_until, expires_at)
VALUES ($1, $2, $3, 'in_flight', now() + interval '30 seconds', now() + interval '24 hours')
ON CONFLICT (merchant_id, idempotency_key) DO NOTHING
RETURNING *;
```

- **Row returned** → you won the claim. You are the one and only executor. Proceed.
- **No row returned** → someone holds the key. `SELECT` it and branch:
  - `status = 'completed'` and `request_hash` matches → **replay the stored response** (same status code, same body). The client cannot tell this from the original — that is the whole point.
  - `status = 'completed'` but `request_hash` differs → **422/409 `idempotency_key_reused`**. The client reused a key with a different payload — a client bug. Never execute; never replay a response for a different request.
  - `status = 'in_flight'` → a **concurrent duplicate**: the first request is still executing. Two valid policies: (1) return **409 with `Retry-After`** — simple, Stripe's behavior; or (2) block briefly waiting for completion, then replay. Prefer 409: waiting ties up a connection and the retry lands milliseconds later anyway. The `locked_until` lease exists so that if the first executor *crashes mid-flight*, a later retry can steal the claim after the lease expires and drive recovery (query the PSP for the true state, then finish or fail).

Full claim–execute–store flow:

```
handle_payment(req):
  key  = req.header["Idempotency-Key"]  or reject 400
  hash = sha256(canonical(req.path + req.body))

  claimed = INSERT idempotency_keys(..., 'in_flight') ON CONFLICT DO NOTHING

  if not claimed:
      existing = SELECT ... FOR UPDATE
      if existing.status == 'completed':
          if existing.request_hash != hash: return 422 key_reused_different_payload
          return replay(existing.response_code, existing.response_body)
      if existing.status == 'in_flight':
          if existing.locked_until > now(): return 409 retry_later
          # stale lease: original worker died mid-operation
          steal lease; recovered = psp.getStatus(by our key/reference)
          finish or fail based on PSP truth; fall through to store

  # we own the key: NOW do side effects
  result = orchestrator.execute(req, idem_key=key)     # passes key downstream!

  UPDATE idempotency_keys
     SET status='completed', response_code=result.code, response_body=result.body
   WHERE merchant_id=$1 AND idempotency_key=$2;
  return result
```

**What breaks with check-then-insert.** The naive version — `SELECT` to see if the key exists, and `INSERT` if it doesn't — has a classic TOCTOU race: two concurrent retries both SELECT, both find nothing, both proceed, both charge the PSP. Under load, retries arrive within milliseconds of each other (client libraries retry on timeout immediately), so this race fires in production, not in theory. The unique constraint + `INSERT ... ON CONFLICT` makes the *database* the arbiter: exactly one INSERT wins, atomically. If your datastore can't do this (no unique constraints), you need a distributed lock — which is strictly worse. This is a top-3 payments interview question: **always insert-first.**

**TTL.** Keys expire — Stripe uses **24 hours**. Why not forever: the table grows unboundedly, and a key reused three weeks later is almost certainly a new logical operation (or a replay attack), not a retry. 24h comfortably covers any sane retry window including queued offline retries. Enforce with `expires_at` + a partitioned table or a nightly delete.

**Idempotency must extend downstream.** Your API being idempotent is worthless if your call to the PSP isn't: your worker can crash *after* Stripe accepted the charge but *before* you recorded the response — your retry re-executes and Stripe charges twice. So the PSP adapter forwards a deterministic idempotency key to the provider — Stripe accepts an `Idempotency-Key` header natively; Adyen uses an idempotency key / merchant reference. Derive it from your payment id (`pay_01HVX...:auth:1`) so any re-execution of the same saga step sends the same key and the PSP dedupes. The adapter layer normalizes this per provider. **Idempotency is a property of the whole chain, end to end — every hop that has side effects needs it.**

**Interview trap:** Saying "we'll use idempotency keys" and stopping there. The follow-ups are the actual test: Where's the uniqueness enforced? (DB constraint.) What happens on concurrent duplicates? (409/wait via in-flight status.) Same key, different body? (422.) Worker dies mid-flight? (Lease + PSP status query.) Does the key reach Stripe? (Yes, via adapter.) Have all five answers ready.

**Interview trap:** Storing only "key seen: yes/no" without the response. Then a retry of a *completed* operation has nothing to replay — you either re-execute (double charge) or error (broken client contract). Store `(request_hash, response_code, response_body)` and replay verbatim.

### Deep dive 2: Double-entry ledger

**The principle.** Money is never created or destroyed inside your system — it *moves between accounts*. Every movement is a transaction of **two or more entries** where debits equal credits, i.e. the signed sum is **zero**. Record a $49.99 capture with a $1.75 platform fee:

```
Transaction txn_01A (kind: capture, payment: pay_01HVX)
  DEBIT   psp_clearing:stripe:USD        4999   (Stripe owes us the money)
  CREDIT  merchant_payable:m_42:USD      4824   (we owe the merchant)
  CREDIT  platform_revenue:fees:USD       175   (our fee)
                                    sum =   0   ✓
```

**Chart of accounts** (the minimum viable set): `user_wallet:{user}` (if wallets exist), `merchant_payable:{merchant}` (what we owe merchants), `platform_revenue:fees`, `psp_clearing:{psp}` (money in flight at the PSP — the account reconciliation checks), `psp_fees:{psp}`, `reserves:{merchant}` (holdbacks for chargeback risk), `chargeback_suspense`. Every account is per-currency.

**Immutability is non-negotiable.** Entries are append-only: no `UPDATE`, no `DELETE` — enforce it with DB grants (revoke UPDATE/DELETE from the app role) so it can't be violated even by a bug. A mistake is corrected by a **reversing transaction** (equal and opposite entries) plus the corrected one. Why: (1) audit — the ledger is the legal record of what you believed at every moment; (2) any balance at any past time is reconstructible; (3) concurrent writers never contend on shared rows — appends don't conflict.

**Balances.** The truth is `SELECT SUM(...) FROM ledger_entries WHERE account_id = ?` — but a merchant with 10M entries can't afford that per read. So: **snapshot + delta**. `account_balances` stores the sum as of `as_of_entry_id`; reads do `snapshot + SUM(entries WHERE id > as_of_entry_id)`; a periodic job rolls the snapshot forward. The snapshot is a *cache derived from the entries*, never a second source of truth — if they disagree, the entries win, and a checker job alerts.

**Why floating point is forbidden — say it with an example.** IEEE-754 cannot represent 0.1 exactly; `0.1 + 0.2 = 0.30000000000000004`. Sum a million small entries and pennies materialize or vanish — and reconciliation (deep dive 4) will flag every one. Store **BIGINT minor units** with the ISO-4217 currency code alongside (JPY has 0 decimals, BHD has 3 — "cents" is not universal). BIGINT max ≈ 9.2 × 10^18 minor units ≈ $92 quadrillion. Sufficient.

**Invariant checks — the ledger's immune system:**

1. **Per-transaction:** debits = credits enforced at write time — post all entries of a transaction in one DB transaction and validate the sum before commit (deferred constraint trigger or application check).
2. **Trial balance job:** periodically (hourly/daily) sum ALL entries across all accounts per currency → must be exactly 0. Non-zero means a bug wrote an unbalanced transaction; page immediately.
3. **Snapshot verification:** recompute a sample of cached balances from raw entries; drift = bug.

**Interview trap:** Proposing a `balance` column that you `UPDATE balance = balance + x`. That's single-entry bookkeeping: no audit trail, lost-update races under concurrency, and no way to answer "why is this balance wrong?" The moment you say "update the balance," a payments interviewer marks you down. Balances are *derived*; entries are *facts*.

**Interview trap:** Correcting a mis-posted ledger row with an UPDATE "because it was our own bug." Now the books say the mistake never happened — which is itself a compliance violation. Reverse and repost, always.

### Deep dive 3: Saga vs 2PC — the payment state machine

**Why not 2PC.** Two-phase commit gives atomicity across participants, but: (1) it **blocks** — if the coordinator dies after prepare, participants hold locks in doubt until it returns; in a payment path that's a stalled checkout and lock pileup; (2) **every participant must implement the protocol** — and your most important participant is Stripe. **You cannot 2PC with Stripe.** External PSPs, banks, and card networks expose request/response APIs plus webhooks, full stop. So distributed atomicity is off the table by reality, not by preference. What remains is the saga: a **sequence of local transactions, each with a compensating action**.

**The saga for a card payment:**

```
Step                Local transaction                    Compensation
1. Risk check       record score, approve/decline        none (read-mostly)
2. PSP authorize    create auth at PSP, save psp_ref     void authorization
3. Ledger post      post auth-hold entries               reversing entries
4. Capture (later)  PSP capture + capture entries        refund
5. Notify           outbox event → merchant webhook      corrective event
```

If step 4 fails after step 2 succeeded, you don't roll back — you run compensations in reverse order: reverse ledger entries, void the auth. Compensation for money is a *new forward operation* (refund/void), never an undo — which is exactly what the append-only ledger models.

**Orchestration vs choreography:**

| | Orchestration (explicit state machine service) | Choreography (services react to events) |
|---|---|---|
| Flow visibility | One place answers "where is payment X and why" | Reconstructed from event logs across services |
| Failure handling | Orchestrator owns timeouts, retries, compensation order | Each service handles its own; gaps are invisible |
| Coupling | Central brain (single point to harden) | Loose, but emergent behavior |
| Auditability | State + transitions in one table — auditors love it | Scattered |
| Verdict for payments | **Preferred** | Fine for low-stakes side effects (analytics, emails) |

For payments, choose **orchestration** and say why: when finance asks "why is this payment stuck?", "check the `payment_transitions` table" must be the complete answer.

**The state machine:**

```
              ┌─────────┐
              │ created │
              └────┬────┘
          risk ok  │            risk declined / PSP declined
                   ▼                      │
            ┌────────────┐                ▼
            │ authorized │──void──▶ ┌────────┐
            └────┬───────┘          │ failed │
     capture     │   auth expiry    └────────┘
                 ▼   (7 days) → failed
            ┌──────────┐   PSP timeout on any call
            │ captured │        │
            └────┬─────┘        ▼
   settlement    │        ┌───────────┐   recovery job:
   file (T+1/2)  ▼        │ pending_  │   query PSP truth,
            ┌─────────┐   │ psp       │──▶ resolve → real state
            │ settled │   └───────────┘
            └────┬────┘
        refund   ▼
        ┌──────────────────────────┐
        │ partially_refunded /     │
        │ refunded / charged_back  │
        └──────────────────────────┘
```

Transitions are guarded (`captured` only from `authorized`), executed as compare-and-swap on the `version` column, and every one appends to `payment_transitions`.

**Timeouts and the recovery job — the part most candidates miss.** When a PSP call times out, the payment parks in `pending_psp`. It is *not failed* — the PSP may have succeeded (the same ambiguity as deep dive 1, now on the server side). A **recovery job** scans `status IN ('pending_psp', 'authorized') AND updated_at < now() - threshold` (that's what the `(status, updated_at)` index is for) and **queries the PSP for the truth** — `GET /payment_intents/{psp_ref}` or lookup by our idempotency key — then drives the state machine forward or compensates. This "reconcile with the source of truth" move is the general answer to every in-doubt state in a saga: don't guess, *ask the party that knows*.

**Interview trap:** Answering "how do you handle a timeout to Stripe?" with "retry" or "mark failed." Retry alone can double-charge without downstream idempotency; mark-failed loses a real charge (customer charged, order canceled — the worst outcome). The right answer is: pending state → recovery job → query PSP → converge.

### Deep dive 4: Reconciliation — the safety net

Every layer above can have bugs — a webhook dropped, a saga compensated wrongly, an adapter mis-mapped a currency. **Reconciliation is the layer that catches whatever everything else missed**, because it compares your books against the *external* truth: the PSP's settlement reports and bank statements.

**Mechanics.** Card money settles **T+1/T+2**: a capture today lands in your bank in 1–2 business days, and the PSP delivers a **settlement file** (CSV/SFTP or reporting API) listing every transaction, fee, refund, and chargeback in that payout batch. Nightly, the reconciliation engine:

1. Ingests the file into `psp_settlement_lines` (raw, immutable).
2. **Matches** each line to internal records by `psp_reference` (that's why `payments.psp_reference` is uniquely indexed) — with amount + currency as secondary verification.
3. Buckets and routes the mismatches:

| Mismatch class | Meaning | Handling |
|---|---|---|
| In file, not in our ledger ("missing ours") | We lost or never recorded a charge — dropped webhook, crashed worker post-PSP-success | Auto-create from PSP data + alert; if frequent, hunt the pipeline bug |
| In our ledger, not in file ("missing theirs") | We think we captured; PSP never settled — or it lands in tomorrow's batch | Carry forward 1–2 cycles (settlement timing is lumpy); persistent → investigate with PSP, possible failed capture we recorded as success |
| Amount mismatch | FX applied, unexpected fee, partial capture mis-recorded, or currency-decimals bug | Never auto-adjust; suspense-account entry + ops case |
| Unknown transaction types (chargebacks, adjustments) | PSP-initiated events | Feed the dispute workflow; post to `chargeback_suspense` |

4. Posts matched settlements to the ledger: `DEBIT bank / CREDIT psp_clearing` — draining the clearing account. **A `psp_clearing` balance that grows without bound is itself an alarm**: money is entering the clearing state and never settling.
5. Emits a daily report: match rate (healthy systems run > 99.9%), open breaks by age, total unreconciled amount. Breaks older than N days escalate to humans.

Sell the philosophy: **transaction-level, every day, automated**. Monthly lump-sum reconciliation means a bug bleeds money for 30 days before anyone notices. Daily per-transaction matching means yesterday's bug is this morning's alert with the exact affected payment ids attached.

**Interview trap:** Treating reconciliation as an afterthought ("finance runs a report"). In real payment companies the reconciliation engine is a first-class system with its own team. Bringing it up unprompted — "and the backstop for everything above is daily transaction-level recon against settlement files" — is one of the strongest senior signals available in this question.

### Deep dive 5: Webhooks, both directions

**Inbound (PSP → us).** Stripe/Adyen push `payment_intent.succeeded`, `charge.dispute.created`, etc. Rules:

1. **Verify the HMAC signature** (Stripe: `Stripe-Signature` header, HMAC-SHA256 over `timestamp.payload` with your endpoint secret; check the timestamp is within ~5 min to kill replays). An unverified webhook endpoint is an open "mark this payment paid" API.
2. **Respond 200 fast, process async.** Persist the raw event + enqueue, then ACK. PSPs time out at ~10–30s and count a timeout as failure → they retry → you process twice and your latency spikes cascade into their retry storms.
3. **Dedupe by event id.** PSPs deliver at-least-once. `INSERT INTO psp_events (psp, event_id, ...) ON CONFLICT DO NOTHING` — same insert-first pattern as idempotency keys. No row claimed → already seen → ACK and drop.
4. **Handle out-of-order delivery.** `charge.captured` can arrive before `charge.authorized` (independent retry timelines). **Trust the state machine, not arrival order:** each event maps to a *target* transition; if the transition isn't legal from the current state, park the event and retry it shortly, or — better — treat any event as a trigger to fetch the PSP object's *current* state and converge to it. Never apply events blindly in arrival order.

**Outbound (us → merchants).** Mirror of the above, from the sender's side:

- **At-least-once with exponential backoff + jitter**, spread over a long horizon — Stripe retries for **up to ~72 hours** (roughly: 1m, 5m, 30m, 2h, 5h, 10h, ... with jitter). Jitter matters: without it, a merchant recovering from a 30-minute outage gets your entire retry backlog in one synchronized thundering herd.
- **Success = 2xx only**, with a short timeout (5–10s). Redirects and 4xx are failures (don't follow redirects — SSRF vector).
- **Sign every payload** (HMAC with per-endpoint secret, timestamp included) so merchants can verify it's you — you are now their "PSP."
- **Ordering is NOT guaranteed and you must say so in your docs.** Include `event_id`, `created_at`, and the object's current state in every payload so merchants can apply the same "trust the state machine" discipline. Never promise sequence.
- **Dead-letter after the retry horizon** + an ops/merchant-dashboard **manual replay UI** ("resend events from the last 24h"). Stripe has exactly this; merchants use it constantly after their own outages.
- Per-endpoint circuit breaker: a merchant whose endpoint is hard-down shouldn't consume your dispatcher's capacity.

**Interview trap:** Processing inbound webhooks synchronously in the HTTP handler ("verify, update DB, call three services, then 200"). One slow dependency → PSP timeouts → PSP retries → duplicate processing storm at your worst moment. ACK fast, work async — always.

### Deep dive 6: PCI scope minimization

The rule that shapes the whole front-end integration: **raw PAN (card number) must never touch your servers** — not your logs, not your memory, not your load balancer. If it does, you're in for full PCI-DSS (SAQ-D / Level 1 if volume is high): quarterly ASV scans, annual on-site QSA audit, network segmentation, key ceremonies — millions in compliance cost.

**The escape hatch: client-side tokenization.** The checkout page embeds the PSP's hosted fields (Stripe Elements, Adyen Components) — an iframe served *by the PSP*; card data flows browser → PSP directly; your JS and servers only ever see an opaque token (`pm_tok_...`). Your backend charges the token. Result: you qualify for **SAQ-A**, a ~20-question self-assessment instead of a full audit. This is the single highest-leverage architectural decision in the design.

**Multi-PSP wrinkle:** Stripe's token only works at Stripe. If you want to route one saved card across PSPs, you need PSP-agnostic tokenization — a **network vault** (VGS, Basis Theory) or card-network tokens — where the vault holds PAN (it carries the PCI burden) and exchanges provider-specific tokens on demand. Costs money; buy it, don't build it, until you're processing billions.

Hygiene even in SAQ-A land: log scrubbing filters for PAN patterns (a stack trace containing a card number puts you back in scope), no card data in URLs, TLS everywhere, secrets in KMS.

**Interview trap:** Drawing `POST /payments {card_number, cvv}` to your own API. That single line puts every system that request transits into full PCI scope. Tokenize client-side; your API accepts tokens only.

## Step 7: Scale & evolve

- **10x volume (10M/day ≈ 1.2K TPS peak):** still one beefy Postgres primary for the money path. First moves: monthly partitioning (already in place), archive cold partitions to S3, read replicas for dashboards/GETs. Only shard when write volume demands it — shard by `merchant_id` so a merchant's payments + ledger + idempotency keys stay co-located and transactions stay local.
- **Multi-PSP routing:** router picks PSP per transaction by cost, auth-rate by BIN/geo, and health score. **Failover discipline:** if PSP A returns a *definitive* decline or is provably down (connection refused, 503), retry on PSP B with a *new* provider-side idempotency key (it's a new charge attempt at a different party) — but if PSP A *timed out*, DO NOT fail over: the charge may have succeeded, and a second PSP means a possible double charge. Timeout → `pending_psp` → recovery/reconciliation resolves it. Only failover on clear failure; ambiguity goes to pending.
- **Multi-region:** payments pin to a home region per merchant (data residency often requires it anyway); async cross-region replication for DR with documented RPO/RTO; active-active for the *stateless* tiers only. Do not attempt multi-master writes on the ledger.
- **Payouts:** the natural next subsystem — accumulate `merchant_payable`, generate payout batches, send via ACH/SEPA, reconcile payout files. Same patterns: idempotent submission, state machine, recon.
- **Ledger extraction:** as more products (wallets, credits, billing) need money movement, the ledger service becomes its own platform with a posting API and its own SLOs — this is the Uber/Airbnb/Stripe evolution path.
- **Fraud evolution:** rules → features + model scoring → async manual-review queue for the gray band; keep the sync-path budget fixed (~150ms) by precomputing features.

## Common follow-up questions

**Q: A customer says they were charged twice. Walk me through the investigation.**
A: (1) Pull both charges from the PSP dashboard — two distinct `psp_reference`s means two charges genuinely reached the PSP. (2) Check our `payments` rows and the `idempotency_keys` table: two payments with two different idempotency keys → the *client* generated a new key on retry (client bug — the key wasn't per logical operation). Same key twice → our claim logic failed (check for check-then-insert regressions). (3) One PSP charge but two customer-visible charges → an auth hold plus capture being mis-read on their statement. (4) Remediate: refund via the standard path (reversing ledger entries, never manual edits), and reconciliation confirms the refund settles.

**Q: Why not put the whole payment flow in one big database transaction?**
A: Because the PSP call is in the middle and Stripe can't join your transaction. Holding a DB transaction open across a 1.5s external HTTP call also pins connections and locks. Hence the saga: durable state *before* the PSP call, durable outcome *after*, recovery job for the gap.

**Q: How do you get exactly-once ledger posting if Kafka is at-least-once?**
A: You don't get exactly-once delivery; you get exactly-once *effect*. The state change and the outbox event commit in one local ACID transaction (so the event exists iff the state changed). The relay publishes at-least-once. Consumers dedupe on `event_id` (unique constraint, insert-first). Atomic write + at-least-once delivery + idempotent consumption = effectively-once.

**Q: Where do you put the fraud check and what if it's slow?**
A: Synchronously, after validation and before PSP authorization — declining after capture means refunds and fees. Budget ~100–150ms with a hard timeout. On timeout: policy per merchant risk profile — fail-open for low-ticket (conversion wins), fail-closed or step-up (3DS) for high-ticket. That's a product decision to surface, not bury.

**Q: Client didn't send an Idempotency-Key. Accept or reject?**
A: Reject with 400 on money-mutating endpoints. Optional idempotency means the one integration that forgets it is the one that double-charges. Stripe made it optional for historical reasons; a greenfield internal platform should mandate it.

**Q: How do refunds interact with the ledger and reconciliation?**
A: A refund is a forward transaction: new saga (refund at PSP → reversing-direction entries: `DEBIT merchant_payable / CREDIT psp_clearing`), its own idempotency key, its own `psp_reference`, and it appears as a negative line in a future settlement file where recon matches it like any other transaction. Nothing about the original capture is mutated.

**Q: What breaks first under a 50x flash-sale spike?**
A: Not the DB (600 TPS is fine) — the PSP rate limits and the fraud service's model inference. Mitigations: request shaping/queueing at the gateway with backpressure (fast 429 beats a timeout — timeouts create ambiguity, and ambiguity creates recovery work), pre-scaled fraud inference, and PSP rate-limit headroom negotiated in advance.

**Q: Postgres primary dies mid-payment. What happens?**
A: Synchronous replica → failover with zero committed-data loss (RPO 0, that's why sync replication on the money DB). In-flight requests error; clients retry with the same idempotency key; completed keys replay, in-flight ones resolve via lease-steal + PSP query. The design assumes crashes at every arrow in the diagram — that's the point of insert-first claims, the outbox, and the recovery job.

## What gets you rejected

- **Leading with sharding and QPS on a ~12 TPS problem.** Do the arithmetic in Step 2 and explicitly reframe: correctness is the bottleneck.
- **No idempotency, or idempotency retrofitted only after the interviewer prompts.** On a payments question this is the bar. Insert-first claim, stored response replay, request-hash check, in-flight handling, downstream propagation to the PSP — unprompted.
- **Check-then-insert for the idempotency key.** The race is the question behind the question.
- **A mutable `balance` column instead of a ledger.** "UPDATE accounts SET balance = balance + x" is the fastest way to fail a fintech loop.
- **Floats for money.** Anywhere. Including "just in the API JSON."
- **Proposing 2PC across your services and Stripe.** You cannot 2PC with an external PSP; saying otherwise reveals you've never integrated one.
- **Treating a PSP timeout as a failure and auto-retrying on a second PSP.** That's the double-charge machine. Timeout → pending → query the source of truth.
- **No reconciliation story.** "The webhooks keep us in sync" — until one is dropped. No backstop = money silently leaks.
- **Raw card numbers hitting your API** — instant full-PCI scope, instant credibility loss.
- **Synchronous inbound webhook processing** and unverified webhook signatures.
- **Hand-waving the ledger as "an events table."** Double-entry, balanced transactions, append-only, derived balances, trial-balance checks — the vocabulary matters because the invariants matter.
