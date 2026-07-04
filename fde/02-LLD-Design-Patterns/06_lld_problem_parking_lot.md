# Lesson 2.6 — Solved LLD: Parking Lot — the Classic, Done at Senior Level

> Module: LLD & Design Patterns | Level: Senior | FDE Prep Phase 2

Parking Lot is the "fizzbuzz of LLD" — everyone has seen it, which is exactly why it's dangerous. The interviewer isn't checking whether you can produce a `Car extends Vehicle` diagram from memory; they're checking whether you make *senior* choices: data over subclass explosions, O(1) allocation over spot-scanning, strategy seams where requirements will churn (pricing, allocation), and an honest answer about concurrency at the gates. This walkthrough plays it the way a staff engineer would.

---

## Step 1: Requirements clarification

Ask these before touching the keyboard. Each answer eliminates a whole family of wrong designs.

**Q1. "Multiple floors, or one flat lot?"**
*Typical answer:* "Multiple floors."
*Why it matters:* Floors introduce a composition level (`ParkingLot` → `Floor` → `ParkingSpot`) and make allocation strategy interesting — "nearest to entrance" and "balance load across floors" only exist as concepts once floors do. It also decides where availability counters live (per floor, aggregated at the lot).

**Q2. "Which vehicle types, and which spot sizes? Motorcycle/car/truck against compact/regular/large?"**
*Typical answer:* "Motorcycles, cars, trucks; compact, regular, large spots."
*Why it matters:* This defines the *fit matrix* — the single most load-bearing business rule in the system. It must live in exactly one place, as data. Candidates who scatter `if (vehicle instanceof Truck)` checks across five classes have already lost.

**Q3. "Can a smaller vehicle take a bigger spot? A car in a large spot, a motorcycle anywhere?"**
*Typical answer:* "Yes — motorcycle fits any spot, car fits regular or large, truck only large."
*Why it matters:* Upward-fit means allocation is a *policy choice*, not a lookup: when a car arrives and both a regular and a large spot are free, which do you burn? Taking the large spot may strand the next truck. That's precisely why `SpotAllocationStrategy` must be an interface — "cheapest/tightest fit first" vs "nearest first" are legitimately different answers for different lots.

**Q4. "Pricing model? Hourly? Daily cap? Different rates per vehicle type? What about a lost ticket?"**
*Typical answer:* "Hourly with ceil-to-hour, a daily cap, per-vehicle-type multipliers. Lost ticket pays the daily max."
*Why it matters:* Pricing is the highest-churn requirement in any parking system (weekend rates, surge, validation stamps). It must be a `PricingStrategy` interface from minute one, and it must **not** live inside `Ticket` — a ticket is a fact about the past (entry time, spot, vehicle); pricing is a policy applied to that fact at exit time. Lost ticket confirms you price from policy + partial facts, not from ticket-owned logic.

**Q5. "Multiple entry and exit gates operating concurrently?"**
*Typical answer:* "Yes, several of each."
*Why it matters:* Two gates must never allocate the same spot. In a single Node process the event loop serializes the synchronous allocation path, so it's safe *by construction* — but you should say that out loud, and also say where it breaks (multi-process, shared DB) because the interviewer will push there in Step 4.

**Q6. "EV charging spots — in scope now, or should the design just not fight them later?"**
*Typical answer:* "Not now, but we'll add them next quarter."
*Why it matters:* This is an Open/Closed Principle probe. The right response is a design where a new spot kind + fit rule is *data added to the matrix* and possibly a new allocation preference — not edits to existing classes. You'll be asked to prove it in Step 4.

**Q7. "Reservations and monthly passes?"**
*Typical answer:* "Out of scope for the core; sketch how they'd attach."
*Why it matters:* Confirms the boundary. A spot needs a state richer than boolean (`FREE / OCCUPIED / RESERVED / OUT_OF_SERVICE`) so reservations attach as a state + a claim-check, not a redesign. Monthly passes attach at pricing/entry, not at allocation.

**Interview trap:** Candidates hear "parking lot" and unload a memorized design without asking anything — and the interviewer's version always differs in one deliberate way (EV spots, valet, no floors) precisely to catch the recital. The clarification step is where you prove you're solving *their* problem.

Agreed scope: multi-floor lot; motorcycle/car/truck vs compact/regular/large with upward fit; hourly + day-cap pricing with type multipliers; multiple concurrent gates; tickets and receipts; O(1) availability display; allocation and pricing behind strategy interfaces; EV/reservations as extension points.

---

## Step 2: Core entities & interfaces

### Vehicle: enum + data, not a class hierarchy

The classic answer subclasses `Vehicle` into `Motorcycle`, `Car`, `Truck` — and it's the wrong default. Those subclasses have **no behavioral differences**: no overridden methods, just a type tag. A class hierarchy whose leaves differ only in data is a lookup table wearing inheritance. Worse, it breeds a parallel explosion (`MotorcycleSpot`, `CarSpot`…) and every new vehicle type touches N files. So:

```ts
export enum VehicleType {
  MOTORCYCLE = 'MOTORCYCLE',
  CAR = 'CAR',
  TRUCK = 'TRUCK',
}

export enum SpotSize {
  COMPACT = 'COMPACT',
  REGULAR = 'REGULAR',
  LARGE = 'LARGE',
}

export interface Vehicle {
  licensePlate: string;
  type: VehicleType;
}
```

Subclass only when behavior diverges (an `ElectricVehicle` that negotiates charging, a `Trailer` occupying two spots). Until then: enum + data tables. Say this reasoning explicitly — it's a senior signal the interviewer is listening for.

### Core entities

```ts
export enum SpotState {
  FREE = 'FREE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE',
}

export interface ParkingSpot {
  id: string;
  floorNumber: number;
  size: SpotSize;
  /** Lower = closer to the entrance on its floor. Drives nearest-first. */
  distanceFromEntrance: number;
  state: SpotState;
  occupiedBy: string | null; // license plate
}

export interface Ticket {
  id: string;
  licensePlate: string;
  vehicleType: VehicleType;
  spotId: string;
  floorNumber: number;
  entryTimeMs: number;
  entryGateId: string;
}

export interface Receipt {
  ticketId: string;
  licensePlate: string;
  entryTimeMs: number;
  exitTimeMs: number;
  durationMs: number;
  amount: number;
  currency: string;
  paymentRef: string;
}
```

`Ticket` is deliberately dumb — pure facts recorded at entry. `Receipt` is the priced outcome at exit. Neither computes anything; policies do.

### Strategy interfaces — the seams

```ts
/** Chooses which free spot a vehicle gets. Returns null if nothing fits. */
export interface SpotAllocationStrategy {
  selectSpot(vehicleType: VehicleType, floors: FloorInventoryView[]): ParkingSpot | null;
}

/** Read-only view of a floor's free inventory, so strategies can't mutate state. */
export interface FloorInventoryView {
  floorNumber: number;
  /** Free spots of a size, cheapest-to-fetch ordered by distanceFromEntrance. */
  freeSpotsBySize(size: SpotSize): ReadonlyParkingSpotQueue;
  freeCount(size: SpotSize): number;
}

export interface ReadonlyParkingSpotQueue {
  peek(): ParkingSpot | null;
  size(): number;
}

/** Prices a completed stay. Ticket facts in, money out. */
export interface PricingStrategy {
  calculate(ticket: Ticket, exitTimeMs: number): number;
}

/** Payment is an external effect — always behind an interface, always async. */
export interface PaymentProcessor {
  charge(amount: number, currency: string, ref: string): Promise<PaymentResult>;
}

export interface PaymentResult {
  success: boolean;
  paymentRef: string;
  failureReason?: string;
}

export interface ClockProvider {
  now(): number;
}
```

Rationale per interface:

- **`SpotAllocationStrategy`** receives *views*, not floors — strategies decide, they don't mutate. The lot performs the actual claim, keeping state transitions in one place. This is also what makes strategies trivially unit-testable: hand them a fake view.
- **`PricingStrategy`** takes `(ticket, exitTime)` and returns a number. Hourly, day-capped, surge, "first 30 minutes free" — all the same shape. Pricing churn never touches entities again.
- **`PaymentProcessor`** is async and fallible because real payments are. Keeping it an interface means the core is testable with a fake and swappable (card, UPI, app wallet) without touching exit flow.
- **`ClockProvider`** — same lesson as every time-based system: hardcode `Date.now()` and your "exactly 61 minutes bills 2 hours" test becomes a prayer.

### The fit matrix — one source of truth

```ts
export const FIT_MATRIX: Readonly<Record<VehicleType, readonly SpotSize[]>> = {
  // Ordered TIGHTEST FIRST — this ordering IS the cheapest-first policy's data.
  [VehicleType.MOTORCYCLE]: [SpotSize.COMPACT, SpotSize.REGULAR, SpotSize.LARGE],
  [VehicleType.CAR]: [SpotSize.REGULAR, SpotSize.LARGE],
  [VehicleType.TRUCK]: [SpotSize.LARGE],
};
```

**Interview trap:** "Where do fit rules live?" If your answer is "in the spot" (`spot.canFit(vehicle)`) *and* "in the strategy" *and* "checked again at the gate," you have three sources of truth that will disagree after the first requirements change. One exported matrix; everything else consults it.

### UML-as-text

```
+----------------+ 1     * +---------+ 1     * +--------------+
|  ParkingLot    |<>------->|  Floor  |<>------->| ParkingSpot  |
+----------------+          +---------+          +--------------+
| entryGates     |          | number  |          | size         |
| exitGates      |          | heaps   |          | state        |
| activeTickets  |          | counters|          | distance     |
+----------------+          +---------+          +--------------+
   |        |    \
   | uses   |uses \ uses                 <>--->  composition (owns lifecycle)
   v        v      v                     ---->   dependency (uses)
+------------------+  +-----------------+  +------------------+
| SpotAllocation   |  | PricingStrategy |  | PaymentProcessor |
| Strategy         |  |  (interface)    |  |   (interface)    |
|  (interface)     |  +-----------------+  +------------------+
+------------------+     ^          ^            ^
   ^          ^          |          |            |
   |          |     +---------+ +----------+ +---------------+
+--------+ +-------+| Hourly  | | DayCapped| | FakeProcessor |
|Nearest | |Cheapest| Pricing | | Pricing  | +---------------+
|First   | |First  |+---------+ +----------+
+--------+ +-------+
                            +--------+        +---------+
   ParkingLot ---creates--> | Ticket | -----> | Receipt |
                            +--------+ priced +---------+
```

---

## Step 3: Implementation

### 3.1 A min-heap for nearest-first allocation

"Nearest spot to the entrance" must not mean "scan every spot." Each floor keeps, per spot size, a min-heap ordered by `distanceFromEntrance`: allocation pops the nearest free spot in O(log n); freeing pushes it back in O(log n). A sorted array with `shift()` is O(n) per op; a heap is the right structure and takes 40 lines.

```ts
export class MinHeap<T> {
  private readonly items: T[] = [];

  constructor(private readonly lessThan: (a: T, b: T) => boolean) {}

  size(): number {
    return this.items.length;
  }

  peek(): T | null {
    return this.items.length > 0 ? this.items[0] : null;
  }

  push(item: T): void {
    this.items.push(item);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!this.lessThan(this.items[i], this.items[parent])) break;
      [this.items[i], this.items[parent]] = [this.items[parent], this.items[i]];
      i = parent;
    }
  }

  pop(): T | null {
    if (this.items.length === 0) return null;
    const top = this.items[0];
    const last = this.items.pop()!;
    if (this.items.length > 0) {
      this.items[0] = last;
      let i = 0;
      for (;;) {
        const left = 2 * i + 1;
        const right = 2 * i + 2;
        let smallest = i;
        if (left < this.items.length && this.lessThan(this.items[left], this.items[smallest])) smallest = left;
        if (right < this.items.length && this.lessThan(this.items[right], this.items[smallest])) smallest = right;
        if (smallest === i) break;
        [this.items[i], this.items[smallest]] = [this.items[smallest], this.items[i]];
        i = smallest;
      }
    }
    return top;
  }
}
```

### 3.2 Floor: free-lists per size + O(1) counters

```ts
export class Floor implements FloorInventoryView {
  readonly floorNumber: number;
  private readonly spotsById = new Map<string, ParkingSpot>();
  private readonly freeHeaps: Map<SpotSize, MinHeap<ParkingSpot>> = new Map();
  private readonly freeCounters: Map<SpotSize, number> = new Map();

  constructor(floorNumber: number, spots: ParkingSpot[]) {
    this.floorNumber = floorNumber;
    for (const size of Object.values(SpotSize)) {
      this.freeHeaps.set(size, new MinHeap<ParkingSpot>((a, b) => a.distanceFromEntrance < b.distanceFromEntrance));
      this.freeCounters.set(size, 0);
    }
    for (const spot of spots) {
      if (spot.floorNumber !== floorNumber) {
        throw new Error(`Spot ${spot.id} declares floor ${spot.floorNumber}, added to floor ${floorNumber}`);
      }
      this.spotsById.set(spot.id, spot);
      if (spot.state === SpotState.FREE) {
        this.freeHeaps.get(spot.size)!.push(spot);
        this.freeCounters.set(spot.size, this.freeCounters.get(spot.size)! + 1);
      }
    }
  }

  freeSpotsBySize(size: SpotSize): ReadonlyParkingSpotQueue {
    const heap = this.freeHeaps.get(size)!;
    return { peek: () => heap.peek(), size: () => heap.size() };
  }

  freeCount(size: SpotSize): number {
    return this.freeCounters.get(size)!;
  }

  /** Claim a specific spot chosen by a strategy. Idempotence guard included. */
  claim(spotId: string, licensePlate: string): ParkingSpot {
    const spot = this.spotsById.get(spotId);
    if (!spot) throw new Error(`Unknown spot ${spotId} on floor ${this.floorNumber}`);
    if (spot.state !== SpotState.FREE) throw new Error(`Spot ${spotId} is ${spot.state}, cannot claim`);

    // Pop from the heap until we surface the chosen spot. In practice the
    // strategy chose the heap top, so this is one pop; the loop handles a
    // strategy that peeked a non-top spot without corrupting the heap.
    const heap = this.freeHeaps.get(spot.size)!;
    const setAside: ParkingSpot[] = [];
    let popped = heap.pop();
    while (popped && popped.id !== spotId) {
      setAside.push(popped);
      popped = heap.pop();
    }
    if (!popped) {
      for (const s of setAside) heap.push(s);
      throw new Error(`Spot ${spotId} not present in free heap (state drift)`);
    }
    for (const s of setAside) heap.push(s);

    spot.state = SpotState.OCCUPIED;
    spot.occupiedBy = licensePlate;
    this.freeCounters.set(spot.size, this.freeCounters.get(spot.size)! - 1);
    return spot;
  }

  release(spotId: string): ParkingSpot {
    const spot = this.spotsById.get(spotId);
    if (!spot) throw new Error(`Unknown spot ${spotId} on floor ${this.floorNumber}`);
    if (spot.state !== SpotState.OCCUPIED) throw new Error(`Spot ${spotId} is ${spot.state}, cannot release`);

    spot.state = SpotState.FREE;
    spot.occupiedBy = null;
    this.freeHeaps.get(spot.size)!.push(spot);
    this.freeCounters.set(spot.size, this.freeCounters.get(spot.size)! + 1);
    return spot;
  }
}
```

**Interview trap:** "How does your display board know 12 compact spots are free on floor 3?" If the answer involves iterating spots, you've built an O(n) scan that runs on every board refresh and every allocation decision. Counters incremented/decremented at the *only two* state-transition points (`claim`/`release`) give O(1) reads and cannot drift — because there is no third place a spot changes state.

### 3.3 Allocation strategies

```ts
/** Nearest-first: tightest fitting size whose nearest spot is closest, floor by floor. */
export class NearestFirstAllocation implements SpotAllocationStrategy {
  selectSpot(vehicleType: VehicleType, floors: FloorInventoryView[]): ParkingSpot | null {
    for (const floor of floors) {
      // Lowest floors first (assumed sorted by caller); within a floor, pick the
      // closest spot among all fitting sizes.
      let best: ParkingSpot | null = null;
      for (const size of FIT_MATRIX[vehicleType]) {
        const candidate = floor.freeSpotsBySize(size).peek();
        if (candidate && (best === null || candidate.distanceFromEntrance < best.distanceFromEntrance)) {
          best = candidate;
        }
      }
      if (best) return best;
    }
    return null;
  }
}

/**
 * Cheapest-first (a.k.a. tightest-fit): never burn a LARGE spot on a motorcycle
 * while a COMPACT is free anywhere — preserves big spots for big vehicles.
 */
export class CheapestFirstAllocation implements SpotAllocationStrategy {
  selectSpot(vehicleType: VehicleType, floors: FloorInventoryView[]): ParkingSpot | null {
    // Sizes in FIT_MATRIX are ordered tightest-first, so the outer loop
    // exhausts ALL floors for a size before considering the next size up.
    for (const size of FIT_MATRIX[vehicleType]) {
      for (const floor of floors) {
        const candidate = floor.freeSpotsBySize(size).peek();
        if (candidate) return candidate;
      }
    }
    return null;
  }
}

/** Spread load across floors so one entrance doesn't jam. */
export class LoadBalancedAllocation implements SpotAllocationStrategy {
  selectSpot(vehicleType: VehicleType, floors: FloorInventoryView[]): ParkingSpot | null {
    let bestFloor: FloorInventoryView | null = null;
    let bestFreeTotal = -1;
    for (const floor of floors) {
      let fittingFree = 0;
      for (const size of FIT_MATRIX[vehicleType]) fittingFree += floor.freeCount(size);
      if (fittingFree > bestFreeTotal) {
        bestFreeTotal = fittingFree;
        bestFloor = floor;
      }
    }
    if (!bestFloor || bestFreeTotal === 0) return null;
    for (const size of FIT_MATRIX[vehicleType]) {
      const candidate = bestFloor.freeSpotsBySize(size).peek();
      if (candidate) return candidate;
    }
    return null;
  }
}
```

Note the two loops in nearest vs cheapest are *transposed* — floors-outer vs sizes-outer — and that inversion is the entire policy difference. Being able to articulate that is worth more than a third strategy.

### 3.4 Pricing strategies

```ts
export interface PricingRates {
  currency: string;
  baseHourlyRate: number;
  /** e.g. motorcycle 0.5, car 1.0, truck 2.0 */
  vehicleMultiplier: Record<VehicleType, number>;
}

const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/** Ceil-to-hour: any started hour bills fully. 61 minutes = 2 hours. */
export class HourlyPricing implements PricingStrategy {
  constructor(private readonly rates: PricingRates) {}

  calculate(ticket: Ticket, exitTimeMs: number): number {
    const durationMs = Math.max(0, exitTimeMs - ticket.entryTimeMs);
    const hours = Math.max(1, Math.ceil(durationMs / MS_PER_HOUR)); // minimum 1 hour
    return hours * this.rates.baseHourlyRate * this.rates.vehicleMultiplier[ticket.vehicleType];
  }
}

/** Flat entry fee + hourly after a free period. Common mall model. */
export class FlatPlusHourlyPricing implements PricingStrategy {
  constructor(
    private readonly rates: PricingRates,
    private readonly flatFee: number,
    private readonly freeMs: number
  ) {}

  calculate(ticket: Ticket, exitTimeMs: number): number {
    const durationMs = Math.max(0, exitTimeMs - ticket.entryTimeMs);
    if (durationMs <= this.freeMs) return this.flatFee;
    const billableHours = Math.ceil((durationMs - this.freeMs) / MS_PER_HOUR);
    return this.flatFee + billableHours * this.rates.baseHourlyRate * this.rates.vehicleMultiplier[ticket.vehicleType];
  }
}

/**
 * Hourly with a per-24h cap. Bill full days at the cap, then the remainder
 * hourly — itself capped at the daily max (a 23-hour remainder must never
 * cost more than a full day).
 */
export class DayCappedPricing implements PricingStrategy {
  constructor(private readonly rates: PricingRates, private readonly dailyCap: number) {}

  calculate(ticket: Ticket, exitTimeMs: number): number {
    const durationMs = Math.max(0, exitTimeMs - ticket.entryTimeMs);
    const multiplier = this.rates.vehicleMultiplier[ticket.vehicleType];

    const fullDays = Math.floor(durationMs / MS_PER_DAY);
    const remainderMs = durationMs % MS_PER_DAY;
    const remainderHours = Math.ceil(remainderMs / MS_PER_HOUR);
    const remainderCharge = Math.min(
      remainderHours * this.rates.baseHourlyRate * multiplier,
      this.dailyCap * multiplier
    );
    const total = fullDays * this.dailyCap * multiplier + remainderCharge;
    return Math.max(total, 1 * this.rates.baseHourlyRate * multiplier); // minimum 1 hour
  }
}

/** Lost ticket: entry time unknown → charge as one full day at the cap. */
export class LostTicketPricing implements PricingStrategy {
  constructor(private readonly rates: PricingRates, private readonly dailyCap: number) {}

  calculate(ticket: Ticket, _exitTimeMs: number): number {
    return this.dailyCap * this.rates.vehicleMultiplier[ticket.vehicleType];
  }
}
```

**Interview trap:** "Where's the bug in `remainderHours * rate` without the cap?" A stay of 1 day + 23 hours would bill `dailyCap + 23 × rate`, where 23 hourly hours can exceed the cap — the customer pays *more* for the remainder than a whole extra day. The inner `Math.min(..., dailyCap)` is the kind of edge the interviewer is specifically waiting for you to find, because it's a real-world billing dispute in embryo.

### 3.5 The lot: entry, exit, display board

```ts
export class SystemClock implements ClockProvider {
  now(): number {
    return Date.now();
  }
}

export class FakePaymentProcessor implements PaymentProcessor {
  async charge(amount: number, _currency: string, ref: string): Promise<PaymentResult> {
    if (amount < 0) return { success: false, paymentRef: ref, failureReason: 'negative amount' };
    return { success: true, paymentRef: ref };
  }
}

export interface DisplayRow {
  floorNumber: number;
  free: Record<SpotSize, number>;
}

export class ParkingLot {
  private readonly floors: Floor[];
  private readonly floorsByNumber = new Map<number, Floor>();
  private readonly activeTickets = new Map<string, Ticket>(); // ticketId → ticket
  private ticketSeq = 0;

  constructor(
    floors: Floor[],
    private allocation: SpotAllocationStrategy,
    private pricing: PricingStrategy,
    private readonly payments: PaymentProcessor,
    private readonly clock: ClockProvider
  ) {
    this.floors = [...floors].sort((a, b) => a.floorNumber - b.floorNumber);
    for (const f of this.floors) this.floorsByNumber.set(f.floorNumber, f);
  }

  /** Strategies are swappable at runtime — surge pricing, event-day allocation. */
  setPricingStrategy(strategy: PricingStrategy): void {
    this.pricing = strategy;
  }
  setAllocationStrategy(strategy: SpotAllocationStrategy): void {
    this.allocation = strategy;
  }

  /**
   * Entry gate flow. Fully synchronous: select + claim complete without an
   * await point, so two gate handlers in one Node process cannot interleave
   * here — the double-allocation question is answered by construction (and
   * revisited honestly for multi-process in Step 4).
   */
  parkVehicle(vehicle: Vehicle, entryGateId: string): Ticket {
    const chosen = this.allocation.selectSpot(vehicle.type, this.floors);
    if (!chosen) throw new Error(`Lot full for vehicle type ${vehicle.type}`);

    const floor = this.floorsByNumber.get(chosen.floorNumber)!;
    const claimed = floor.claim(chosen.id, vehicle.licensePlate);

    const ticket: Ticket = {
      id: `T-${++this.ticketSeq}`,
      licensePlate: vehicle.licensePlate,
      vehicleType: vehicle.type,
      spotId: claimed.id,
      floorNumber: claimed.floorNumber,
      entryTimeMs: this.clock.now(),
      entryGateId,
    };
    this.activeTickets.set(ticket.id, ticket);
    return ticket;
  }

  /**
   * Exit gate flow. Order matters: price → charge → ONLY THEN release the
   * spot and retire the ticket. If payment fails, the car is still at the
   * gate and state must reflect that; releasing first would let a payment
   * failure produce a free spot with a car in it.
   */
  async exitVehicle(ticketId: string): Promise<Receipt> {
    const ticket = this.activeTickets.get(ticketId);
    if (!ticket) throw new Error(`Unknown or already-closed ticket ${ticketId}`);

    const exitTimeMs = this.clock.now();
    const amount = this.pricing.calculate(ticket, exitTimeMs);

    const result = await this.payments.charge(amount, 'USD', `pay-${ticket.id}`);
    if (!result.success) {
      throw new Error(`Payment failed for ${ticketId}: ${result.failureReason ?? 'unknown'}`);
    }

    // Re-check the ticket is still active: the await above is an interleaving
    // point, and a duplicate exit request for the same ticket could have
    // completed while we were waiting on the payment processor.
    if (!this.activeTickets.has(ticketId)) {
      throw new Error(`Ticket ${ticketId} was closed concurrently`);
    }
    this.activeTickets.delete(ticketId);
    this.floorsByNumber.get(ticket.floorNumber)!.release(ticket.spotId);

    return {
      ticketId: ticket.id,
      licensePlate: ticket.licensePlate,
      entryTimeMs: ticket.entryTimeMs,
      exitTimeMs,
      durationMs: exitTimeMs - ticket.entryTimeMs,
      amount,
      currency: 'USD',
      paymentRef: result.paymentRef,
    };
  }

  /** O(floors × sizes) — reads counters, never scans spots. */
  displayBoard(): DisplayRow[] {
    return this.floors.map((floor) => ({
      floorNumber: floor.floorNumber,
      free: {
        [SpotSize.COMPACT]: floor.freeCount(SpotSize.COMPACT),
        [SpotSize.REGULAR]: floor.freeCount(SpotSize.REGULAR),
        [SpotSize.LARGE]: floor.freeCount(SpotSize.LARGE),
      },
    }));
  }
}
```

**Interview trap:** Spot the deliberate detail in `exitVehicle`: the *re-check after the `await`*. Everything synchronous in Node is race-free, but the payment call is an await point — a duplicate exit request (double-tap at the gate kiosk, a retried HTTP call) interleaves exactly there. Candidates who add the guard unprompted, or who can explain why it's needed *there and nowhere else in the file*, demonstrate they actually understand Node's concurrency model instead of chanting "single-threaded."

### 3.6 Wiring it up

```ts
export function buildDemoLot(): ParkingLot {
  const makeSpots = (floor: number, prefix: string, size: SpotSize, count: number, distanceOffset: number): ParkingSpot[] =>
    Array.from({ length: count }, (_, i) => ({
      id: `${prefix}-${floor}-${i + 1}`,
      floorNumber: floor,
      size,
      distanceFromEntrance: distanceOffset + i,
      state: SpotState.FREE,
      occupiedBy: null,
    }));

  const floors = [1, 2, 3].map(
    (n) =>
      new Floor(n, [
        ...makeSpots(n, 'C', SpotSize.COMPACT, 20, 0),
        ...makeSpots(n, 'R', SpotSize.REGULAR, 50, 20),
        ...makeSpots(n, 'L', SpotSize.LARGE, 10, 70),
      ])
  );

  const rates: PricingRates = {
    currency: 'USD',
    baseHourlyRate: 4,
    vehicleMultiplier: {
      [VehicleType.MOTORCYCLE]: 0.5,
      [VehicleType.CAR]: 1.0,
      [VehicleType.TRUCK]: 2.0,
    },
  };

  return new ParkingLot(
    floors,
    new CheapestFirstAllocation(),
    new DayCappedPricing(rates, 30),
    new FakePaymentProcessor(),
    new SystemClock()
  );
}
```

---

## Step 4: Extensibility follow-ups

**Interviewer:** Two entry gates process vehicles at the same instant. How do you guarantee they don't allocate the same spot?

**You:** Within one Node process: it can't happen, and I want to be precise about why. `parkVehicle` is synchronous end-to-end — strategy selection and `floor.claim` execute as one uninterrupted stack frame; the event loop won't start the second gate's handler until the first returns. No locks needed, and adding them would be noise. The honest continuation: this guarantee evaporates across *processes*. Two API instances sharing a database each read "spot R-2-14 is FREE" and both claim it. The fixes are the classic pair: **pessimistic** — `SELECT ... FOR UPDATE` on the spot row (or `FOR UPDATE SKIP LOCKED` to have the second gate skip past contended spots instead of queueing, which is beautiful for allocation); or **optimistic** — a version column and `UPDATE spots SET state='OCCUPIED', version=version+1 WHERE id=? AND state='FREE' AND version=?`, treating zero rows updated as "lost the race, pick another spot." For a parking lot's contention profile (two gates rarely want the *same* spot unless the lot is nearly full), optimistic-with-retry is my default; an atomic single-statement claim (`UPDATE ... WHERE state='FREE' RETURNING *`) is even simpler where the DB supports it.

**Interviewer:** Product wants EV charging spots next quarter. Show me what changes — and what doesn't.

**You:** This is the OCP payoff. What changes: add `EV = 'EV'` to `SpotSize` (or better, an orthogonal `capabilities: Set<'CHARGER'>` on the spot, since EV-ness is a capability, not a size), add `EV_CAR` to `VehicleType`, and extend `FIT_MATRIX`: `EV_CAR: [EV, REGULAR, LARGE]` — prefers a charger, degrades gracefully. Floors already build a heap per size generically from `Object.values(SpotSize)`, counters likewise; allocation strategies iterate `FIT_MATRIX[vehicleType]` and never enumerate sizes by hand; pricing gets a new decorator or multiplier entry if charging bills differently. What does *not* change: `Floor`, `ParkingLot`, every existing strategy, `Ticket`, the display board. The subclass-explosion design would have needed `EVSpot`, `EVCar`, edits to every `instanceof` chain — this is precisely why Step 2 argued for enum + data. One deliberate extra: charging duration might bill separately from parking duration, which suggests `PricingStrategy` composition — a `CompositePricing` summing parking + energy — rather than one strategy that knows everything.

**Interviewer:** Now they want surge pricing — double rates when the lot is over 80% full.

**You:** Surge is not an edit to `HourlyPricing`; it's a new strategy, and mostly a *decorator*: `SurgePricing` wraps any inner `PricingStrategy`, consults an occupancy source, and multiplies. The one genuinely interesting design question is *when* occupancy is sampled: at exit time (trivially available, but a customer who entered during quiet hours gets surged for leaving at a busy moment — a fairness bug and a support-ticket generator) or at entry time (fair, but the rate must be *captured on the ticket*). Right answer: stamp `rateMultiplierAtEntry` onto the `Ticket` at entry — the ticket is the record of facts, and the applicable tariff *is* a fact of entry, exactly like the entry timestamp. Then `SurgePricing` reads it from the ticket. This is also the answer template for weekend rates and promotional rates: capture tariff facts at entry, apply policy at exit.

**Interviewer:** Everything is in memory. The building loses power and every parked car is now free of charge. Persist it.

**You:** Introduce repositories at the aggregate boundaries — `TicketRepository` (`save`, `findActiveById`, `close`) and `SpotRepository` (`claim`, `release`, `loadFloorInventory`) — and have `ParkingLot` depend on the interfaces; the current Map-based behavior becomes `InMemoryTicketRepository`, used in tests forever after. Two things I'd call out beyond the textbook answer: (1) the *claim* must move into the repository as an atomic operation (the `UPDATE ... WHERE state='FREE'` from the concurrency answer), because once persistence exists, multi-process is real and the in-memory heap becomes a per-process *cache* of availability that gets rebuilt on boot (`loadFloorInventory`) and reconciled on claim conflicts; (2) writes go through an outbox or at least a strict ordering — ticket persisted before the gate opens — because a gate that lifts on an unpersisted ticket recreates the exact power-loss bug we're fixing, one car at a time.

**Interviewer:** Monthly pass holders: they don't take a ticket and they don't pay at exit. Where does that fit?

**You:** At the *identity and pricing* layer, not the allocation layer — a pass holder still occupies a physical spot, so allocation, claim, counters all behave identically. Entry: the gate resolves the plate or pass card to an account; instead of a normal ticket we still issue a ticket (facts of the stay must be recorded — the lot needs occupancy truth and the pass program wants usage data) but tagged `billingType: 'PASS'`. Exit: a `PassPricing` strategy returns 0, or cleaner, a `PricingStrategyResolver` maps `billingType → strategy` so the exit flow stays one code path. Overstay rules ("pass covers 12h/day, hourly after") then land naturally as pass-specific pricing rather than special-cased gate logic. The anti-pattern to name: `if (isPassHolder) skip everything` at the gate — it forks the flow, loses the occupancy record, and every future feature has to remember the fork exists.

**Interviewer:** Your `CheapestFirstAllocation` sends every motorcycle to floor 1 until it's packed. The ramp queues. Fix it without breaking the strategy contract.

**You:** That's a policy bug, not an interface bug — which is exactly what the strategy seam is for. Swap in a composed policy: `LoadBalancedAllocation` already spreads by floor; better is a weighted hybrid — score candidate spots by `α × sizeWaste + β × floorCongestion + γ × distance` and pick the min. Because `SpotAllocationStrategy` receives read-only inventory views, the hybrid needs no new plumbing: it reads `freeCount` per floor for congestion and `peek()` for distance. The demonstration that matters to the interviewer: the fix is a *new class + one `setAllocationStrategy` call* — `Floor`, `ParkingLot`, and every other strategy remain untouched. If you find yourself editing `ParkingLot` to fix an allocation behavior, the abstraction failed.

**Interviewer:** How do you test the pricing edge cases?

**You:** Same discipline as any time-based logic: the clock is injected, so tests own time. A `FakeClock` (constructor takes start ms, `advance(ms)`) drives entry and exit deterministically: park at `t=0`, advance exactly `3_600_001` ms, assert 2 hours billed — the ceil boundary at one millisecond past the hour is the test that catches the `Math.floor` typo. The table of cases I'd write: exactly 60 minutes (1 hour, not 2), zero-duration exit (minimum 1 hour), 24h exactly (one daily cap, not cap + 1 hour), 47h59m (cap + capped remainder — the `Math.min` case from 3.4), lost ticket (flat daily max regardless of times), and multiplier sanity (truck pays 4× motorcycle for identical stays). Payment failure paths use the fake processor forced to fail: assert the ticket is still active and the spot still occupied — the state-consistency test most candidates forget because it's about what *didn't* change.

---

## Step 5: What gets you rejected

- **Subclassing everything: `CarSpot`, `BikeSpot`, `TruckSpot`, `Car`, `Bike`...** Type tags masquerading as class hierarchies. No behavior differs, so inheritance buys nothing and costs a combinatorial explosion — every new vehicle or spot kind touches N files and every fit check becomes an `instanceof` ladder. Enum + fit matrix is one table, one truth. Interviewers see the subclass forest and read "memorized OOP tutorial, never maintained real code."
- **Pricing logic inside `Ticket` (or worse, inside `ParkingSpot`).** `ticket.calculateFee()` welds the highest-churn policy in the system to an immutable record of facts. The first surge/weekend/pass requirement either bloats the entity with flags or forks it into subclasses. Facts and policies have different change velocities; the design must separate them — that's the entire reason `PricingStrategy` exists.
- **Scanning all spots on every park.** `for (spot of allSpots) if (spot.isFree() && fits(...))` is O(n) per vehicle at the busiest moment of the system's life, and the display board doing the same scan makes it O(n) per glance. Free-lists (heaps) per size per floor plus counters maintained at the two transition points give O(log n) allocation and O(1) availability. The data-structure choice *is* the senior content of this question.
- **A god `ParkingLot` class doing allocation + pricing + payment + display.** When one class owns every decision, nothing is swappable and nothing is testable in isolation — you cannot test day-cap pricing without constructing floors, or allocation without a payment processor. `ParkingLot` should *orchestrate*: it sequences entry/exit and owns state transitions; strategies decide, processors execute effects, repositories persist.
- **No strategy seams at all.** Hardcoded nearest-first and hardcoded hourly pricing answer today's question and fail every Step-4 follow-up, which is where senior interviews are actually decided. The seams (`SpotAllocationStrategy`, `PricingStrategy`, `PaymentProcessor`) cost three interfaces upfront and convert every "now add X" into "new class, one setter."
- **Chanting "Node is single-threaded" as a complete concurrency answer.** It's the right start and a wrong finish. Synchronous allocation is race-free per process — but exit flow crosses an `await` (payment) and needs its re-check, and any persistence/multi-process story needs an atomic claim. Precision about *where* the guarantees hold is the difference between the phrase and the understanding.
- **Ignoring payment failure in the exit flow.** Release-spot-then-charge means a declined card leaves a "free" spot with a physical car in it, and the counters now lie. Effect ordering (price → charge → mutate state) plus asserting state is untouched on failure is exactly the kind of correctness reasoning FDE interviews probe, because production incidents live there.
