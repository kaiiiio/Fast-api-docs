# Lesson 2.9 — Solved LLDs: Splitwise & Logger Framework

> Module: LLD & Design Patterns | Level: Senior | FDE Prep Phase 2

Two problems that look nothing alike and are graded on the same axis: **do you find the domain's one hard invariant and defend it in code?** For Splitwise it's *money integrity* — every split sums exactly to the total, in integer cents, forever. For a logger it's *isolation* — logging must never block, crash, or backpressure the application it observes. Everything else (strategies, decorators, registries) is standard pattern vocabulary you should be able to produce on autopilot. Both walkthroughs below follow the 5-step interview protocol from the flagship rate-limiter lesson: clarify → entities → implement → extend under pushback → know the rejection triggers.

---

## Problem A: Splitwise (Expense Sharing)

### Step 1: Requirements clarification

You have 45 minutes. Spend the first five asking questions — not to look thorough, but because each answer changes the design materially.

**Q1. "Are expenses within groups, or arbitrary pairwise between any two users?"**
Typical answer: *groups, but a user can be in many groups; balances are queried per group and globally.*
Why it matters: group-scoped balances mean the `BalanceSheet` keys on `(groupId, userId)` and simplification runs per group. If it were global-only, sharding later gets much harder. For a 45-minute round, model one group's manager cleanly and state that a top-level service maps `groupId → ExpenseManager`.

**Q2. "Which split types? Equal, exact amounts, percentages, shares?"**
Typical answer: *all four, and the design should make adding a fifth trivial.*
Why it matters: this is the interviewer telling you they want the Strategy pattern. Four split types with a `switch` inside `Expense` is the single most common rejection in this problem.

**Q3. "Single currency or multi-currency?"**
Typical answer: *single for now, but ask me again later.*
Why it matters: you tag every expense with a currency code anyway (one field, zero cost now) and never mix currencies in arithmetic. Deferring the conversion question is fine; not having a `currency` field means a migration later.

**Q4. "Who can edit or delete an expense?"**
Typical answer: *any group member can correct an expense.*
Why it matters: this decides mutability. The senior answer is that you never mutate or delete a recorded expense — you append a reversal/correction entry. Balances are a fold over an immutable log. Say this out loud in step 1; it shapes `ExpenseManager`.

**Q5. "Do you want debt simplification (A owes B, B owes C ⇒ A pays C)?"**
Typical answer: *yes, minimize the number of settlement transactions.*
Why it matters: this is the algorithmic core of the problem — a greedy settlement over net balances. It also tells you that **net balance per user** is the right storage model, not a pairwise debt matrix.

**Q6. "What precision for money?"**
Typical answer: *cents; the sum of splits must equal the total to the cent.*
Why it matters: **never floats for money.** `0.1 + 0.2 !== 0.3` in IEEE-754. Everything below is integer cents (`number` holding integers, safe up to `Number.MAX_SAFE_INTEGER` ≈ $90 trillion in cents). Percentages are stored as integer basis points (10000 = 100%) for the same reason.

**Interview trap:** "Split $100 three ways." If your equal split returns `33.333...` or three `33.33`s that sum to `99.99`, you have failed the problem's central test before writing any classes. The answer is `[3334, 3333, 3333]` cents with the remainder cent assigned deterministically — and you should volunteer this in step 1, unprompted.

### Step 2: Core entities & interfaces

- **`User`** — id, name, email. Anemic on purpose; identity only.
- **`Split`** — one participant's *input* to a split: `{ userId, value }`, where `value`'s meaning depends on the split type (cents for EXACT, basis points for PERCENT, share count for SHARES, ignored for EQUAL).
- **`SplitStrategy`** — the extensibility seam: `validate(totalCents, splits)` throws on bad input; `compute(totalCents, splits)` returns per-user amounts that **provably sum to the total**.
- **`Expense`** — immutable record: total in cents, currency, payer, the computed shares, and a `kind` (`EXPENSE` or `REVERSAL`) so corrections are append-only entries, not mutations.
- **`BalanceSheet`** — `Map<userId, netCents>` where positive means the user is owed money. Net balances, not a pairwise matrix — the invariant is that all net balances sum to zero.
- **`DebtSimplifier`** — interface over the balance map producing a minimal-ish list of settlements; greedy implementation provided, swappable for something smarter.
- **`ExpenseManager`** — the facade: validates via strategy, appends to the log, folds into the balance sheet.

### Step 3: Implementation

```typescript
import { randomUUID } from "node:crypto";

// ---------- Money & identity ----------

/** Integer cents. All arithmetic in this file is integer-only. */
export type Cents = number;
export type UserId = string;

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

function assertIntegerCents(value: number, label: string): void {
  if (!Number.isSafeInteger(value))
    throw new ValidationError(`${label} must be an integer number of cents, got ${value}`);
}

export interface User {
  readonly id: UserId;
  readonly name: string;
  readonly email: string;
}

// ---------- Splits ----------

export enum SplitType {
  Equal = "EQUAL",
  Exact = "EXACT",
  Percent = "PERCENT",
  Shares = "SHARES",
}

/**
 * One participant's input line. The meaning of `value` depends on the type:
 *   EXACT   -> cents
 *   PERCENT -> basis points (10000 = 100%), integers only
 *   SHARES  -> positive integer share count
 *   EQUAL   -> ignored (pass 0)
 */
export interface Split {
  readonly userId: UserId;
  readonly value: number;
}

export interface ComputedShare {
  readonly userId: UserId;
  readonly amountCents: Cents;
}

export interface SplitStrategy {
  readonly type: SplitType;
  validate(totalCents: Cents, splits: readonly Split[]): void;
  /** MUST return shares that sum exactly to totalCents. */
  compute(totalCents: Cents, splits: readonly Split[]): ComputedShare[];
}

/**
 * Floor each user's weighted share, then hand the leftover cents (always
 * < splits.length of them) to the first k users in input order. Deterministic:
 * the same expense always splits the same way — critical for idempotent
 * replays and for reversals to cancel exactly.
 */
function distributeByWeight(
  totalCents: Cents,
  splits: readonly Split[],
  weightOf: (s: Split) => number
): ComputedShare[] {
  const weights = splits.map(weightOf);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const amounts = weights.map((w) => Math.floor((totalCents * w) / weightSum));
  let remainder = totalCents - amounts.reduce((a, b) => a + b, 0);
  for (let i = 0; remainder > 0; i++) {
    amounts[i] += 1;
    remainder -= 1;
  }
  return splits.map((s, i) => ({ userId: s.userId, amountCents: amounts[i] }));
}

function assertCommon(totalCents: Cents, splits: readonly Split[]): void {
  assertIntegerCents(totalCents, "totalCents");
  if (totalCents <= 0) throw new ValidationError("totalCents must be positive");
  if (splits.length === 0) throw new ValidationError("at least one split required");
  const ids = new Set(splits.map((s) => s.userId));
  if (ids.size !== splits.length) throw new ValidationError("duplicate user in splits");
}

export class EqualSplitStrategy implements SplitStrategy {
  readonly type = SplitType.Equal;

  validate(totalCents: Cents, splits: readonly Split[]): void {
    assertCommon(totalCents, splits);
  }

  compute(totalCents: Cents, splits: readonly Split[]): ComputedShare[] {
    // $100.00 / 3 => [3334, 3333, 3333]. First user absorbs the odd cent.
    return distributeByWeight(totalCents, splits, () => 1);
  }
}

export class ExactSplitStrategy implements SplitStrategy {
  readonly type = SplitType.Exact;

  validate(totalCents: Cents, splits: readonly Split[]): void {
    assertCommon(totalCents, splits);
    let sum = 0;
    for (const s of splits) {
      assertIntegerCents(s.value, `exact amount for ${s.userId}`);
      if (s.value < 0) throw new ValidationError(`negative amount for ${s.userId}`);
      sum += s.value;
    }
    if (sum !== totalCents) {
      throw new ValidationError(`exact splits sum to ${sum}, expected ${totalCents}`);
    }
  }

  compute(_totalCents: Cents, splits: readonly Split[]): ComputedShare[] {
    return splits.map((s) => ({ userId: s.userId, amountCents: s.value }));
  }
}

export class PercentSplitStrategy implements SplitStrategy {
  readonly type = SplitType.Percent;
  private static readonly TOTAL_BPS = 10_000;

  validate(totalCents: Cents, splits: readonly Split[]): void {
    assertCommon(totalCents, splits);
    let bps = 0;
    for (const s of splits) {
      if (!Number.isInteger(s.value) || s.value <= 0) {
        throw new ValidationError(`basis points for ${s.userId} must be a positive integer`);
      }
      bps += s.value;
    }
    if (bps !== PercentSplitStrategy.TOTAL_BPS) {
      throw new ValidationError(`percentages sum to ${bps} bps, expected 10000`);
    }
  }

  compute(totalCents: Cents, splits: readonly Split[]): ComputedShare[] {
    // 33.33% is 3333 bps — integers end to end, remainder cents distributed.
    return distributeByWeight(totalCents, splits, (s) => s.value);
  }
}

export class ShareSplitStrategy implements SplitStrategy {
  readonly type = SplitType.Shares;

  validate(totalCents: Cents, splits: readonly Split[]): void {
    assertCommon(totalCents, splits);
    for (const s of splits) {
      if (!Number.isInteger(s.value) || s.value <= 0) {
        throw new ValidationError(`share count for ${s.userId} must be a positive integer`);
      }
    }
  }

  compute(totalCents: Cents, splits: readonly Split[]): ComputedShare[] {
    return distributeByWeight(totalCents, splits, (s) => s.value);
  }
}

// ---------- Expense (immutable) ----------

export type ExpenseKind = "EXPENSE" | "REVERSAL";

export interface Expense {
  readonly id: string;
  readonly kind: ExpenseKind;
  readonly reverses?: string; // id of the expense this entry cancels
  readonly description: string;
  readonly currency: string; // ISO 4217, e.g. "USD" — never mixed in arithmetic
  readonly totalCents: Cents;
  readonly paidBy: UserId;
  readonly splitType: SplitType;
  readonly shares: readonly ComputedShare[];
  readonly createdBy: UserId;
  readonly createdAt: number; // epoch ms
}

export interface ExpenseInput {
  readonly description: string;
  readonly currency: string;
  readonly totalCents: Cents;
  readonly paidBy: UserId;
  readonly splitType: SplitType;
  readonly splits: readonly Split[];
  readonly createdBy: UserId;
}

// ---------- Balance sheet ----------

/** Positive net = the user is owed money; negative = the user owes. */
export class BalanceSheet {
  private readonly net = new Map<UserId, Cents>();

  apply(expense: Expense, sign: 1 | -1): void {
    this.add(expense.paidBy, sign * expense.totalCents);
    for (const share of expense.shares) {
      this.add(share.userId, -sign * share.amountCents);
    }
  }

  private add(userId: UserId, delta: Cents): void {
    const next = (this.net.get(userId) ?? 0) + delta;
    if (next === 0) this.net.delete(userId);
    else this.net.set(userId, next);
  }

  balanceOf(userId: UserId): Cents {
    return this.net.get(userId) ?? 0;
  }

  snapshot(): ReadonlyMap<UserId, Cents> {
    return new Map(this.net);
  }

  /** Invariant check: money is conserved. Sum of all nets is always zero. */
  assertConserved(): void {
    let sum = 0;
    for (const v of this.net.values()) sum += v;
    if (sum !== 0) throw new Error(`balance sheet corrupted: nets sum to ${sum}`);
  }
}

// ---------- Debt simplification ----------

export interface Settlement {
  readonly from: UserId;
  readonly to: UserId;
  readonly amountCents: Cents;
}

export interface DebtSimplifier {
  simplify(balances: ReadonlyMap<UserId, Cents>): Settlement[];
}

/**
 * Greedy settlement: sort creditors and debtors by magnitude descending,
 * then walk two pointers, matching the largest remaining debtor against the
 * largest remaining creditor for min(debt, credit).
 *
 * Each transaction fully retires at least one party, so with n non-zero
 * balances we emit at most n - 1 transactions. Truly minimizing the COUNT is
 * NP-hard (finding zero-sum subsets that settle internally reduces to
 * subset-sum/partition), so greedy ≤ n-1 is the accepted interview answer —
 * say both halves of that sentence.
 *
 * Chain collapse falls out for free: if A paid nothing and owes 1000 to B,
 * and B owes 1000 to C, the NET balances are A:-1000, B:0, C:+1000 — B never
 * even appears, and the output is the single transfer A -> C for 1000.
 */
export class GreedyDebtSimplifier implements DebtSimplifier {
  simplify(balances: ReadonlyMap<UserId, Cents>): Settlement[] {
    type Party = { userId: UserId; amount: Cents };
    const creditors: Party[] = [];
    const debtors: Party[] = [];

    for (const [userId, net] of balances) {
      if (net > 0) creditors.push({ userId, amount: net });
      else if (net < 0) debtors.push({ userId, amount: -net });
    }

    // Deterministic order: magnitude desc, then userId for stable tie-breaks.
    const byAmountDesc = (a: Party, b: Party) =>
      b.amount - a.amount || a.userId.localeCompare(b.userId);
    creditors.sort(byAmountDesc);
    debtors.sort(byAmountDesc);

    const settlements: Settlement[] = [];
    let i = 0; // creditor pointer
    let j = 0; // debtor pointer
    while (i < creditors.length && j < debtors.length) {
      const pay = Math.min(creditors[i].amount, debtors[j].amount);
      settlements.push({
        from: debtors[j].userId,
        to: creditors[i].userId,
        amountCents: pay,
      });
      creditors[i].amount -= pay;
      debtors[j].amount -= pay;
      if (creditors[i].amount === 0) i++;
      if (debtors[j].amount === 0) j++;
    }
    return settlements;
  }
}

// ---------- The manager (facade over log + strategies + balances) ----------

export class ExpenseManager {
  private readonly log: Expense[] = []; // append-only
  private readonly balances = new BalanceSheet();
  private readonly strategies = new Map<SplitType, SplitStrategy>();
  private readonly users = new Map<UserId, User>();
  private readonly currency: string;

  constructor(currency: string, simplifierDefault?: DebtSimplifier) {
    this.currency = currency;
    this.simplifier = simplifierDefault ?? new GreedyDebtSimplifier();
    for (const s of [
      new EqualSplitStrategy(),
      new ExactSplitStrategy(),
      new PercentSplitStrategy(),
      new ShareSplitStrategy(),
    ]) {
      this.strategies.set(s.type, s);
    }
  }

  private readonly simplifier: DebtSimplifier;

  registerStrategy(strategy: SplitStrategy): void {
    this.strategies.set(strategy.type, strategy); // open for extension
  }

  addUser(user: User): void {
    this.users.set(user.id, user);
  }

  addExpense(input: ExpenseInput): Expense {
    if (input.currency !== this.currency) {
      throw new ValidationError(
        `group currency is ${this.currency}, got ${input.currency}`
      );
    }
    this.assertMember(input.paidBy);
    this.assertMember(input.createdBy);
    for (const s of input.splits) this.assertMember(s.userId);

    const strategy = this.strategies.get(input.splitType);
    if (!strategy) throw new ValidationError(`no strategy for ${input.splitType}`);

    strategy.validate(input.totalCents, input.splits);
    const shares = strategy.compute(input.totalCents, input.splits);

    // Defense in depth: recheck the strategy's contract before touching money.
    const shareSum = shares.reduce((a, s) => a + s.amountCents, 0);
    if (shareSum !== input.totalCents) {
      throw new Error(
        `strategy ${input.splitType} broke its contract: ${shareSum} !== ${input.totalCents}`
      );
    }

    const expense: Expense = {
      id: randomUUID(),
      kind: "EXPENSE",
      description: input.description,
      currency: input.currency,
      totalCents: input.totalCents,
      paidBy: input.paidBy,
      splitType: input.splitType,
      shares,
      createdBy: input.createdBy,
      createdAt: Date.now(),
    };

    this.log.push(expense);
    this.balances.apply(expense, 1);
    this.balances.assertConserved();
    return expense;
  }

  /**
   * Corrections are append-only. To "edit", reverse then re-add. The original
   * entry is never touched — the log is the audit trail.
   */
  reverseExpense(expenseId: string, requestedBy: UserId): Expense {
    this.assertMember(requestedBy);
    const original = this.log.find(
      (e) => e.id === expenseId && e.kind === "EXPENSE"
    );
    if (!original) throw new ValidationError(`no expense ${expenseId}`);
    const alreadyReversed = this.log.some((e) => e.reverses === expenseId);
    if (alreadyReversed) throw new ValidationError(`${expenseId} already reversed`);

    const reversal: Expense = {
      ...original,
      id: randomUUID(),
      kind: "REVERSAL",
      reverses: original.id,
      description: `Reversal of: ${original.description}`,
      createdBy: requestedBy,
      createdAt: Date.now(),
    };
    this.log.push(reversal);
    this.balances.apply(reversal, -1); // exact inverse of the original fold
    this.balances.assertConserved();
    return reversal;
  }

  balanceOf(userId: UserId): Cents {
    return this.balances.balanceOf(userId);
  }

  settleUp(): Settlement[] {
    return this.simplifier.simplify(this.balances.snapshot());
  }

  history(): readonly Expense[] {
    return this.log;
  }

  private assertMember(userId: UserId): void {
    if (!this.users.has(userId)) {
      throw new ValidationError(`user ${userId} is not in this group`);
    }
  }
}
```

A 60-second sanity walkthrough to narrate in the interview: Alice pays $90.00 (9000 cents) for dinner, split equally among Alice, Bob, Carol → shares `[3000, 3000, 3000]`; nets become Alice `+6000`, Bob `-3000`, Carol `-3000`. Bob then pays $30.00 for Carol only (EXACT) → Bob `-3000+3000 = 0`, Carol `-6000`, Alice `+6000`. `settleUp()` emits exactly one transaction: Carol → Alice, 6000. Bob vanished from the settlement because net balances already collapsed the chain.

**Interview trap:** "Why not store who-owes-whom-what directly?" A pairwise debt matrix is O(n²) state that you must then *re-derive* net positions from to simplify. Net balances are the minimal sufficient statistic for settlement — the pairwise history lives in the expense log if anyone needs it. Storing both means two sources of truth that will disagree.

**Interview trap:** determinism of the remainder cent. If `compute()` uses `Math.random()` or map iteration over an unordered structure to pick who eats the extra cent, replaying the same expense (retry, event-sourced rebuild) yields different balances. First-k-in-input-order is boring, and boring is the point.

### Step 4: Extensibility follow-ups

**Interviewer:** Now make it multi-currency. Alice pays in EUR, the group is USD.

**You:** The expense already carries its currency, so I keep storing amounts in the *expense's* currency — never converting at write time, because exchange rates change and a stored converted amount becomes wrong the moment the rate moves, and you can never audit it back. Conversion happens at read time: `BalanceSheet` becomes per-currency (`Map<currency, Map<userId, Cents>>`), and a `CurrencyConverter` port (interface with a `convert(cents, from, to, atDate)` method) normalizes for display and for settlement suggestions. Settlement itself is trickier — you either settle per currency, or the settlement records the rate used at settlement time as part of the immutable entry.

**Interviewer:** Two group members add expenses at the same instant. What breaks?

**You:** In this in-memory version, nothing — Node is single-threaded and each `addExpense` is synchronous. The real question is the persistent version: two app servers both read balance state, both write. I'd make the expense log the unit of truth with an append operation guarded by a per-group version (optimistic concurrency: `INSERT ... WHERE group_version = ?`, retry on conflict) or a per-group serial queue. Balances are then a projection that can be rebuilt from the log, so a conflict never corrupts money — worst case one writer retries. This is why I built it log-first rather than balances-first.

**Interviewer:** Recurring expenses — rent splits monthly.

**You:** A `RecurringExpenseTemplate` (input + RRULE-style schedule) plus a scheduler that materializes a concrete `Expense` per occurrence through the exact same `addExpense` path. The materialized expense stores `templateId` and occurrence date, and materialization is idempotent on `(templateId, occurrenceDate)` so a scheduler retry can't double-bill. No changes to strategies or balances — that's the payoff of the strategy seam.

**Interviewer:** Legal asks for a full audit trail. Cost?

**You:** Nearly zero, because we already have it — expenses are immutable and edits are compensating `REVERSAL` entries; that's event sourcing in spirit. What I'd add: who/when/why metadata on reversals, and periodic balance snapshots so rebuilds don't fold the whole log. The design decision that made this cheap was refusing in-place mutation in step 1.

**Interviewer:** Millions of users, tens of millions of groups.

**You:** Groups are natural shards — no expense ever spans groups, so `ExpenseManager` state partitions perfectly by `groupId` (consistent hashing to a partition, one writer per group for serialization). The hard part is the cross-group query "what's my total balance across all groups": that's a fan-out read, so I'd maintain a per-user materialized aggregate updated asynchronously from the group event streams, accepting eventual consistency for the dashboard number while per-group balances stay strongly consistent.

**Interviewer:** Your greedy simplifier — can you beat n-1 transactions?

**You:** Sometimes. If some subset of people nets to exactly zero (Alice +50, Bob -30, Carol -20, plus an unrelated pair), settling that subset internally saves a transaction versus greedy's global matching. Finding such zero-sum subsets is subset-sum, so exact minimization is NP-hard; for a group of ≤ 20 you could brute-force partitions with bitmask DP (O(3^n) subset iteration). In production nobody does — greedy's ≤ n-1 with deterministic output is simpler to explain to users, and the transaction count difference is marginal.

### Step 5: What gets you rejected

- **Floating-point money.** `total / 3` with floats, or `amount: 33.33`. Instant fail. Integer cents, basis points for percentages, remainder-cent distribution stated explicitly.
- **A pairwise debt matrix as primary storage.** O(n²) state, and you still need net balances to simplify. Net map + immutable log is strictly better.
- **`switch (splitType)` inside `Expense` or the manager.** Adding a fifth split type must be a new class plus one `registerStrategy` call, not an edit to existing code.
- **No validation that splits sum to the total.** Exact splits that don't add up, percentages that sum to 99%, a strategy whose floors silently lose a cent. Validate at the strategy, then recheck the contract at the manager — money code earns defense in depth.
- **Mutating or deleting past expenses.** Editing an expense in place destroys the audit trail and desyncs any derived state. Corrections are new entries.
- **Non-deterministic remainder assignment** — different balances on replay.
- Skipping step 1 and building group chat, notifications, or a REST layer instead of the money core. Breadth over the actual invariant reads as mid-level.

---

## Problem B: Logger Framework

### Step 1: Requirements clarification

**Q1. "Am I building a library like winston/pino, or wiring logging into one app?"**
Typical answer: *a library — other teams will build on it.*
Why it matters: a library means stable public interfaces (`Logger`, `Appender`, `Formatter`), no hard dependency on any one sink, and configuration owned by the host app. Your API surface *is* the deliverable.

**Q2. "Standard levels? Can levels change at runtime?"**
Typical answer: *trace/debug/info/warn/error/fatal, and yes — ops must be able to flip a service to DEBUG without a restart.*
Why it matters: runtime changes mean loggers must not cache their level at construction; they resolve it against a registry on each call. It also forces numeric levels so filtering is one integer comparison.

**Q3. "Multiple destinations at once — console, file, HTTP shipper?"**
Typical answer: *yes, simultaneously, independently configured.*
Why it matters: `Appender` becomes the pluggable seam, and a slow appender must not be able to slow a fast one — which sets up the buffering discussion.

**Q4. "JSON for machines, pretty for local dev?"**
Typical answer: *both.*
Why it matters: formatting is a separate axis from destination — `Formatter` composes into any `Appender` rather than each appender hardcoding its output shape.

**Q5. "Async buffering? What happens to buffered logs if the process crashes?"**
Typical answer: *buffer for throughput, and yes — acknowledge the tradeoff.*
Why it matters: this is the honesty test. Buffered logging trades durability for latency: on `SIGKILL` or a hard crash, the last buffer interval is gone. The senior answer names the mitigations (small flush intervals, flush hooks on `beforeExit`/signals, FATAL bypassing the buffer) and admits none of them cover `kill -9`.

**Q6. "Child loggers with bound context — per-request `requestId`?"**
Typical answer: *yes, `logger.child({ requestId })` cheap enough to create per request.*
Why it matters: child creation is on the request hot path, so it must be an O(1) object allocation sharing the parent's appenders — not a deep clone of configuration.

**Q7. "Performance constraints?"**
Typical answer: *logging must never block the event loop; a disabled DEBUG call should cost ~nothing.*
Why it matters: two concrete design rules — level check happens *before* any formatting or message construction (with a lazy `() => string` form for expensive messages), and all I/O is async/buffered with backpressure handled.

**Interview trap:** "Where do you check the level?" If your design formats the record, serializes the error, merges context, and *then* checks whether DEBUG is enabled, you've built a logger that makes disabled logging expensive — the exact failure that makes teams rip loggers out of hot paths. Level check is an integer comparison at the very top of `log()`, before the lazy message thunk is even invoked.

### Step 2: Core entities & interfaces

- **`LogLevel`** — numeric enum (`TRACE=10 … FATAL=60, OFF=100`) so severity filtering is `level < effectiveLevel`.
- **`LogRecord`** — the immutable unit flowing through the pipeline: timestamp, level, logger name, message, merged context, optional `Error`.
- **`Formatter`** — `format(record): string`. Owns serialization, including `Error.stack`.
- **`Appender`** — `append(record): void` plus optional `flush()`/`close()`. Appenders own their formatter and their I/O.
- **`AsyncBufferedAppender`** — a *decorator* implementing `Appender` and wrapping any `Appender`: bounded buffer, size + interval flush, drop-oldest overflow policy, exit hooks. Buffering composes onto any sink instead of being reimplemented in each.
- **`Logger`** — level filtering, per-level methods, `child(context)` merging bound context.
- **`LoggerRegistry`** — factory + hierarchy: named loggers (`app.db.query`) inherit the nearest configured ancestor level (`app.db`, then `app`, then root); shared appender list; the fallback error reporter for appender failures.

### Step 3: Implementation

```typescript
import * as fs from "node:fs";

// ---------- Levels & records ----------

export enum LogLevel {
  TRACE = 10,
  DEBUG = 20,
  INFO = 30,
  WARN = 40,
  ERROR = 50,
  FATAL = 60,
  OFF = 100,
}

export interface LogRecord {
  readonly timestamp: number; // epoch ms
  readonly level: LogLevel;
  readonly loggerName: string;
  readonly message: string;
  readonly context: Readonly<Record<string, unknown>>;
  readonly error?: Error;
}

/** Expensive messages are thunks — never evaluated if the level is disabled. */
export type Message = string | (() => string);

// ---------- Formatters ----------

export interface Formatter {
  format(record: LogRecord): string;
}

function serializeError(error: Error): Record<string, unknown> {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...(error.cause !== undefined ? { cause: String(error.cause) } : {}),
  };
}

export class JsonFormatter implements Formatter {
  format(record: LogRecord): string {
    const payload: Record<string, unknown> = {
      time: record.timestamp,
      level: LogLevel[record.level], // numeric enum reverse-maps to its name
      logger: record.loggerName,
      msg: record.message,
      ...record.context,
    };
    if (record.error) payload.err = serializeError(record.error);
    try {
      return JSON.stringify(payload);
    } catch {
      // Circular context must not kill the log line, let alone the app.
      return JSON.stringify({
        time: record.timestamp,
        level: LogLevel[record.level],
        logger: record.loggerName,
        msg: record.message,
        err: "context was not serializable",
      });
    }
  }
}

export class PrettyFormatter implements Formatter {
  format(record: LogRecord): string {
    const time = new Date(record.timestamp).toISOString();
    const level = LogLevel[record.level].padEnd(5);
    const ctx =
      Object.keys(record.context).length > 0
        ? ` ${JSON.stringify(record.context)}`
        : "";
    const err = record.error?.stack ? `\n${record.error.stack}` : "";
    return `${time} ${level} [${record.loggerName}] ${record.message}${ctx}${err}`;
  }
}

// ---------- Appenders ----------

export interface Appender {
  append(record: LogRecord): void;
  flush?(): Promise<void>;
  close?(): Promise<void>;
}

export class ConsoleAppender implements Appender {
  constructor(private readonly formatter: Formatter = new PrettyFormatter()) {}

  append(record: LogRecord): void {
    const line = this.formatter.format(record) + "\n";
    // Direct stream write, not console.log: no format-string parsing, and we
    // choose the fd by severity like real CLIs do.
    if (record.level >= LogLevel.ERROR) process.stderr.write(line);
    else process.stdout.write(line);
  }
}

/**
 * Append-only file sink. Respects stream backpressure: when write() returns
 * false we queue lines until 'drain' instead of piling everything into the
 * stream's internal buffer unboundedly. The queue itself is bounded with a
 * drop-oldest policy — a logger must degrade, never OOM the host app.
 */
export class FileAppender implements Appender {
  private readonly stream: fs.WriteStream;
  private readonly pending: string[] = [];
  private draining = false;
  private droppedLines = 0;
  private readonly flushWaiters: Array<() => void> = [];

  constructor(
    filePath: string,
    private readonly formatter: Formatter = new JsonFormatter(),
    private readonly maxPending: number = 10_000
  ) {
    this.stream = fs.createWriteStream(filePath, { flags: "a" }); // append-only
    this.stream.on("error", () => {
      // Disk full, permissions, rotation race: swallow. The registry-level
      // fallback reports appender health; the app never sees a throw.
    });
  }

  append(record: LogRecord): void {
    this.writeLine(this.formatter.format(record) + "\n");
  }

  private writeLine(line: string): void {
    if (this.draining) {
      if (this.pending.length >= this.maxPending) {
        this.pending.shift();
        this.droppedLines++;
      }
      this.pending.push(line);
      return;
    }
    const ok = this.stream.write(line);
    if (!ok) {
      this.draining = true;
      this.stream.once("drain", () => this.onDrain());
    }
  }

  private onDrain(): void {
    this.draining = false;
    if (this.droppedLines > 0) {
      const n = this.droppedLines;
      this.droppedLines = 0;
      this.stream.write(
        JSON.stringify({ level: "WARN", msg: `FileAppender dropped ${n} lines under backpressure` }) + "\n"
      );
    }
    while (this.pending.length > 0 && !this.draining) {
      const line = this.pending.shift()!;
      const ok = this.stream.write(line);
      if (!ok) {
        this.draining = true;
        this.stream.once("drain", () => this.onDrain());
      }
    }
    if (!this.draining && this.pending.length === 0) {
      for (const resolve of this.flushWaiters.splice(0)) resolve();
    }
  }

  flush(): Promise<void> {
    if (!this.draining && this.pending.length === 0) return Promise.resolve();
    return new Promise((resolve) => this.flushWaiters.push(resolve));
  }

  async close(): Promise<void> {
    await this.flush();
    await new Promise<void>((resolve) => this.stream.end(() => resolve()));
  }
}

/**
 * Ships batches to a log collector. One HTTP request per log line is how you
 * DDoS your own ingest — batch on size and interval.
 */
export class HttpAppender implements Appender {
  private batch: LogRecord[] = [];
  private readonly timer: NodeJS.Timeout;

  constructor(
    private readonly url: string,
    private readonly formatter: Formatter = new JsonFormatter(),
    private readonly batchSize: number = 100,
    flushIntervalMs: number = 2_000,
    private readonly onError: (err: Error, lost: number) => void = () => {}
  ) {
    this.timer = setInterval(() => void this.flush(), flushIntervalMs);
    this.timer.unref(); // never keep the process alive just to ship logs
  }

  append(record: LogRecord): void {
    this.batch.push(record);
    if (this.batch.length >= this.batchSize) void this.flush();
  }

  async flush(): Promise<void> {
    if (this.batch.length === 0) return;
    const outgoing = this.batch;
    this.batch = []; // swap first: appends during the await go to a fresh batch
    const body = `[${outgoing.map((r) => this.formatter.format(r)).join(",")}]`;
    try {
      const res = await fetch(this.url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      });
      if (!res.ok) this.onError(new Error(`ingest returned ${res.status}`), outgoing.length);
    } catch (err) {
      this.onError(err as Error, outgoing.length); // report, never throw
    }
  }

  async close(): Promise<void> {
    clearInterval(this.timer);
    await this.flush();
  }
}

// ---------- The buffering decorator ----------

/**
 * Decorator: wraps ANY appender with a bounded in-memory buffer.
 * - Flush on size threshold, on an unref'd interval, and on demand.
 * - Overflow policy: drop-oldest, with a counter surfaced as a synthetic
 *   WARN record on the next flush. Bounded memory beats perfect logs.
 * - beforeExit hook flushes on graceful shutdown. We do NOT rely on 'exit':
 *   by then the event loop is gone, so only synchronous work runs — async
 *   appenders (file streams, HTTP) physically cannot flush there. And nothing
 *   saves you from SIGKILL; that lost-tail window is the price of buffering.
 */
export class AsyncBufferedAppender implements Appender {
  private buffer: LogRecord[] = [];
  private droppedCount = 0;
  private readonly timer: NodeJS.Timeout;
  private readonly beforeExitHook = () => void this.flush();

  constructor(
    private readonly inner: Appender,
    private readonly maxSize: number = 5_000,
    private readonly flushThreshold: number = 500,
    flushIntervalMs: number = 1_000
  ) {
    this.timer = setInterval(() => void this.flush(), flushIntervalMs);
    this.timer.unref();
    process.on("beforeExit", this.beforeExitHook);
  }

  append(record: LogRecord): void {
    if (this.buffer.length >= this.maxSize) {
      this.buffer.shift(); // drop-oldest: recent logs matter most in a crash
      this.droppedCount++;
    }
    this.buffer.push(record);
    // FATAL must not sit in a buffer while the process dies.
    if (record.level >= LogLevel.FATAL || this.buffer.length >= this.flushThreshold) {
      void this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    const outgoing = this.buffer;
    this.buffer = [];
    if (this.droppedCount > 0) {
      const dropped = this.droppedCount;
      this.droppedCount = 0;
      outgoing.push({
        timestamp: Date.now(),
        level: LogLevel.WARN,
        loggerName: "logger.internal",
        message: `AsyncBufferedAppender dropped ${dropped} records (buffer overflow)`,
        context: { dropped },
      });
    }
    for (const record of outgoing) {
      try {
        this.inner.append(record);
      } catch {
        // A sink failure is the sink's problem, never the app's.
      }
    }
    if (this.inner.flush) await this.inner.flush();
  }

  async close(): Promise<void> {
    clearInterval(this.timer);
    process.removeListener("beforeExit", this.beforeExitHook);
    await this.flush();
    if (this.inner.close) await this.inner.close();
  }
}

// ---------- Logger & registry ----------

export class Logger {
  constructor(
    readonly name: string,
    private readonly registry: LoggerRegistry,
    private readonly boundContext: Readonly<Record<string, unknown>> = {}
  ) {}

  /** O(1): shares registry and appenders, only merges the context object. */
  child(context: Record<string, unknown>): Logger {
    return new Logger(this.name, this.registry, {
      ...this.boundContext,
      ...context,
    });
  }

  isLevelEnabled(level: LogLevel): boolean {
    return level >= this.registry.effectiveLevel(this.name);
  }

  trace(message: Message, context?: Record<string, unknown>): void {
    this.log(LogLevel.TRACE, message, context);
  }
  debug(message: Message, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }
  info(message: Message, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }
  warn(message: Message, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }
  error(message: Message, error?: Error, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context, error);
  }
  fatal(message: Message, error?: Error, context?: Record<string, unknown>): void {
    this.log(LogLevel.FATAL, message, context, error);
  }

  private log(
    level: LogLevel,
    message: Message,
    context?: Record<string, unknown>,
    error?: Error
  ): void {
    // THE hot-path rule: one integer comparison, then bail. No Date.now(),
    // no context merge, no thunk evaluation, no formatting for disabled levels.
    if (level < this.registry.effectiveLevel(this.name)) return;

    const record: LogRecord = {
      timestamp: Date.now(),
      level,
      loggerName: this.name,
      message: typeof message === "function" ? message() : message,
      context: context ? { ...this.boundContext, ...context } : this.boundContext,
      error,
    };

    for (const appender of this.registry.appenders()) {
      try {
        appender.append(record);
      } catch (err) {
        this.registry.reportAppenderFailure(err);
      }
    }
  }
}

/**
 * Hierarchical registry: "app.db.query" inherits from "app.db", then "app",
 * then the root. Levels are resolved per call, so setLevel() at runtime takes
 * effect immediately for every descendant that hasn't overridden it.
 */
export class LoggerRegistry {
  private readonly levels = new Map<string, LogLevel>();
  private readonly loggers = new Map<string, Logger>();
  private readonly appenderList: Appender[] = [];
  private appenderFailures = 0;

  constructor(rootLevel: LogLevel = LogLevel.INFO) {
    this.levels.set("", rootLevel);
  }

  getLogger(name: string): Logger {
    let logger = this.loggers.get(name);
    if (!logger) {
      logger = new Logger(name, this);
      this.loggers.set(name, logger);
    }
    return logger;
  }

  setLevel(name: string, level: LogLevel): void {
    this.levels.set(name, level);
  }

  effectiveLevel(name: string): LogLevel {
    let current = name;
    while (current.length > 0) {
      const configured = this.levels.get(current);
      if (configured !== undefined) return configured;
      const dot = current.lastIndexOf(".");
      current = dot === -1 ? "" : current.slice(0, dot);
    }
    return this.levels.get("")!; // root always exists
  }

  addAppender(appender: Appender): void {
    this.appenderList.push(appender);
  }

  appenders(): readonly Appender[] {
    return this.appenderList;
  }

  /** Appender errors are counted and rate-limit-reported to stderr — never rethrown. */
  reportAppenderFailure(err: unknown): void {
    this.appenderFailures++;
    if (this.appenderFailures === 1 || this.appenderFailures % 1000 === 0) {
      process.stderr.write(
        `[logger] appender failure #${this.appenderFailures}: ${String(err)}\n`
      );
    }
  }

  async shutdown(): Promise<void> {
    for (const a of this.appenderList) {
      if (a.close) await a.close();
      else if (a.flush) await a.flush();
    }
  }
}

// ---------- Wiring it together ----------

const registry = new LoggerRegistry(LogLevel.INFO);
registry.addAppender(new ConsoleAppender(new PrettyFormatter()));
registry.addAppender(
  new AsyncBufferedAppender(new FileAppender("/var/log/app.jsonl", new JsonFormatter()))
);
registry.addAppender(
  new AsyncBufferedAppender(new HttpAppender("https://ingest.example.com/logs"))
);

registry.setLevel("app.db", LogLevel.DEBUG); // app.db.query inherits DEBUG

const log = registry.getLogger("app.db.query");
const requestLog = log.child({ requestId: "r-7f3a", userId: "u-42" });

requestLog.info("query executed", { table: "expenses", ms: 12 });
requestLog.debug(() => `rows: ${JSON.stringify({ heavy: "only built if DEBUG on" })}`);
requestLog.error("query failed", new Error("deadlock detected"), { table: "expenses" });

void registry.shutdown();
```

**Interview trap:** `process.on('exit', ...)` as your flush strategy. On `'exit'` the event loop has already stopped — promises never settle, stream writes never drain, HTTP requests never send. Only synchronous code runs. That's why the hook is on `'beforeExit'` (which fires while the loop can still do async work, though not after `process.exit()` or a fatal signal), plus explicit `shutdown()` in the app's SIGTERM handler. And be honest: `SIGKILL` loses the buffer, full stop.

**Interview trap:** the buffer swap in `flush()`. If you iterate `this.buffer` while awaiting the inner sink, concurrent `append()` calls mutate the array under you — records get double-shipped or skipped. Detach the array first (`const outgoing = this.buffer; this.buffer = []`), then do async work on the detached snapshot. Same pattern in `HttpAppender.flush()`.

### Step 4: Extensibility follow-ups

**Interviewer:** Why is pino so much faster than winston? What would you steal?

**You:** Four things. It keeps numeric levels and does the integer comparison before any work, like we did. It avoids generic formatting pipelines — it builds the JSON line with hand-rolled, mostly-precomputed serialization instead of `JSON.stringify` over a merged object graph. It doesn't interpolate or clone anything until it's certain the line will be written. And its biggest structural trick: transports run in a worker thread — the main thread does minimal serialization to a shared buffer and the worker does file/HTTP I/O, so sink slowness physically can't add latency to the event loop. In this design that's a new `WorkerAppender` implementing the same `Appender` interface, marshalling records over `MessagePort` — the seam already exists.

**Interviewer:** Traffic spikes 50x and INFO volume is drowning you. Options beyond raising the level?

**You:** Sampling, as another decorator: a `SamplingAppender` that passes WARN+ untouched but keeps only 1-in-N of INFO/DEBUG, ideally with a periodic "sampled: kept 1/100" marker so dashboards can re-scale counts. Smarter variants sample per key (first occurrence of each message shape always kept, repeats sampled) so rare-but-important lines survive. The crucial property: sampling is a composition decision at wiring time, not logic inside `Logger`.

**Interviewer:** Compliance says no emails or tokens in logs. Formatter stage or appender stage?

**You:** Before both, ideally — a redaction step that operates on the structured `LogRecord` (a record-transform hook the registry applies before fan-out), because at that point fields are addressable: `context.user.email` is a path you can match, like pino's `redact` paths. Redacting at the formatter means every formatter reimplements it and pretty-vs-JSON can disagree; redacting at the appender means it runs once per sink and post-serialization regex scrubbing is both slow and unreliable. One transform, structured stage, all sinks inherit it.

**Interviewer:** The log disk fills up. Walk me through what your framework does.

**You:** `fs.WriteStream` starts failing writes and emits `'error'`; our handler swallows it, so the app keeps running — rule one. Backpressure marks the appender draining, the bounded pending queue fills, drop-oldest kicks in, and the dropped-count warning will surface once writes recover. What's missing for production is health surfacing: the registry should expose appender health metrics (failures, drops) so ops gets paged from a metric, not from silence in the logs — the one place you can't log an alert about logging being broken. Plus rotation with `max-size` retention so it doesn't happen at all.

**Interviewer:** You've given teams structured logging. They log `"error: " + JSON.stringify(err)` as the message string anyway. Does the framework care?

**You:** The framework should make the right way the easy way: `error()` takes the `Error` object as a first-class parameter so stacks serialize properly, context is a real parameter so fields land as queryable JSON keys instead of concatenated prose, and child loggers make request-scoped fields free. Beyond API shape it's discipline: message strings should be constant templates ("query executed", not `` `query ${sql} executed` ``) with variability in context fields — that's what makes log aggregation groupable. I'd enforce it with a lint rule against string concatenation in log calls, not with runtime checks.

### Step 5: What gets you rejected

- **`fs.appendFileSync` per log line.** Synchronous disk I/O in the request path, on the main thread. This alone ends the interview at senior level — every write is an event-loop stall.
- **Formatting before the level check.** Building the record, merging context, serializing errors, and *then* discovering DEBUG is off. Disabled logging must cost one integer comparison.
- **Appender exceptions escaping into the application.** A logging framework that can throw from `logger.info()` — because the disk is full or the ingest endpoint is down — turns an observability tool into an outage source. Swallow, count, report to a fallback channel.
- **Unbounded buffers.** An async buffer with no max size is a memory leak with a delay fuse: the sink slows down, the buffer grows, the process OOMs, and the logs explaining why were in the buffer. Bound it and define the drop policy explicitly.
- **`console.log` as the "implementation".** Presenting a thin wrapper over `console.log` with levels bolted on ignores everything the problem is actually about: sinks, formatting, buffering, backpressure, failure isolation.
- No story for shutdown — process exits, buffered tail vanishes, and you never mentioned it. The tradeoff is acceptable; not knowing about it isn't.

---

## Cross-problem takeaways

- Both problems hinge on **one invariant defended in depth**: splits sum to the total (validate + recheck), and logging never harms the app (early exit + swallow + bound).
- Both use **Strategy/Decorator as seams**, not as trivia: split types and simplifiers in A; formatters, sinks, buffering, sampling, redaction in B. The pattern's value is that every step-4 pushback landed as a *new class*, not an edit.
- Both have an **append-only core**: the expense log and the log stream. When the interviewer asks about audit, concurrency, or replay, immutability is what makes your answer short.
- Say the numbers: integer cents up to `MAX_SAFE_INTEGER`, ≤ n-1 settlements, one integer compare on the disabled path, bounded buffers with explicit drop policy. Senior answers quantify their guarantees.
