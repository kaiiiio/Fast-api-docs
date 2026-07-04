# Lesson 2.7 — Solved LLD: Notification Service — Channels, Retries, Failover

> Module: LLD & Design Patterns | Level: Senior | FDE Prep Phase 2

"Design a notification system" is the single most common LLD prompt for backend/FDE roles because it forces every senior skill at once: polymorphism over channels, strategy over providers, resilience (retries, failover, circuit breaking), idempotency, and user-respecting policy (preferences, rate limits, quiet hours). Juniors write a `switch` on channel type and a `for` loop of retries. Seniors design *seams*: every axis that can change — channel, provider, template, retry curve, selection strategy — is an interface with at least two implementations behind it. This walkthrough is the full 45-minute interview, played correctly.

---

## Step 1: Requirements clarification

Never start coding a notification system without these questions. Each one changes the design, and interviewers grade the questions as heavily as the code.

**Q1. "Which channels do we need — email, SMS, push? And should I assume more are coming (WhatsApp, Slack, in-app)?"**
Typical answer: *"Email, SMS, push today. Yes, assume more."*
Why it matters: "more are coming" is the interviewer handing you the Open/Closed Principle on a plate. The channel must be an interface plus a registry, so adding WhatsApp is one new class and one registration line — zero edits to the orchestrator. If you hardcode three channels, the follow-up round is designed to break you.

**Q2. "What delivery guarantee? At-least-once? Is duplicate delivery acceptable?"**
Typical answer: *"At-least-once. A rare duplicate SMS is annoying but acceptable; a missed password-reset email is not."*
Why it matters: at-least-once + retries means duplicates *will* happen (a send succeeds but the ACK times out, so you retry). That forces an **idempotency key** into the core `Notification` type on day one, not as an afterthought.

**Q3. "Synchronous send in the request path, or queued?"**
Typical answer: *"Design the sending component; assume the caller may be an API handler or a queue worker."*
Why it matters: this scopes the LLD. You design a `NotificationService` that is queue-agnostic — it can be called inline today and become the worker's body when a queue arrives (Step 4 covers that pivot). Baking BullMQ into the class couples you to infrastructure the interviewer didn't ask for.

**Q4. "Do users have preferences — channel opt-outs, quiet hours? Do quiet hours respect the user's timezone?"**
Typical answer: *"Yes: per-channel opt-out for marketing, quiet hours in the user's local time."*
Why it matters: this introduces a *suppression* outcome that is neither success nor failure. Your status model needs `SUPPRESSED` as a first-class state, and quiet hours means timezone math — which you should flag as a known hard problem, not hand-wave.

**Q5. "Is templating in scope? Do templates vary per channel (HTML email vs. 160-char SMS)?"**
Typical answer: *"Yes — same logical template, per-channel variants."*
Why it matters: it decides *where rendering lives*. Rendering belongs in the orchestrator pipeline via a `TemplateEngine`, keyed by `(templateId, channel)`. Rendering inside each channel class duplicates logic and makes templates untestable without providers.

**Q6. "Provider failover — if SendGrid is down, do we fall back to SES? Do we need weighted traffic splitting?"**
Typical answer: *"Yes, failover is required; traffic splitting is a nice-to-have."*
Why it matters: this is the difference between one provider per channel and a **provider selection strategy** with health tracking. It also implies a lightweight circuit breaker so you stop hammering a dead provider.

**Q7. "Rate limits — per user (don't spam one person) and per provider (API quotas)?"**
Typical answer: *"Per-user for sure. Assume provider quotas exist."*
Why it matters: per-user limiting produces `SUPPRESSED`, not an error — a throttled marketing ping is working-as-intended, and treating it as a failure poisons your alerting. Per-provider limiting feeds the same health/selection machinery as failover.

**Q8. "Do we track delivery status / read receipts?"**
Typical answer: *"Track our own send lifecycle; provider delivery callbacks can be a follow-up."*
Why it matters: it justifies a status store keyed by idempotency key with a lifecycle enum, and sets up the async-webhook follow-up in Step 4.

**Interview trap:** Asking zero questions and diving into code is an automatic downlevel, but so is asking ten questions and never committing. Ask 5–8, *state your assumptions out loud* ("I'll assume at-least-once with idempotency keys"), and move. Seniors converge; juniors either assume or stall.

---

## Step 2: Core entities & interfaces

The design has one orchestrator and seven seams. Every seam is an interface because every seam has a plausible second implementation.

| Abstraction | Responsibility | Pattern |
|---|---|---|
| `Notification` | Immutable request: who, what template, which channel, idempotency key | Value object |
| `NotificationStatus` | Lifecycle: `PENDING → RENDERED → SENT / FAILED / SUPPRESSED` | State enum |
| `TemplateEngine` | `render(templateId, channel, data)` — per-channel variants | Strategy |
| `NotificationChannel` | `send(rendered, recipient)` — one per medium | Strategy / polymorphism |
| `ChannelProvider` | A vendor within a channel (SendGrid, SES, Twilio…) | Strategy |
| `ProviderSelector` | Ordering of providers per attempt (priority failover, weighted RR) | Strategy |
| `RetryPolicy` | Max attempts, backoff curve, retryable classification | Strategy |
| `RateLimiter` | Per-user token bucket | — |
| `UserPreferenceStore` | Opt-outs, quiet hours | Repository |
| `ChannelRegistry` | `register(channel)` — the extension point | Registry / factory |
| `NotificationService` | The pipeline: prefs → rate limit → render → select → send → record | Facade / orchestrator |

Key type decisions worth narrating to the interviewer:

- **`channel` is a `string`, not a closed union.** A closed union (`"email" | "sms" | "push"`) means adding WhatsApp edits a shared type that every module imports. A registry keyed by string keeps the core closed for modification.
- **`ProviderResult` carries `retryable`.** The provider is the only component that knows whether its error is a 5xx (retry) or an invalid-recipient 4xx (never retry). Encoding that at the source keeps the retry loop generic.
- **`Sleeper` and `Clock` are injected.** Anything that touches wall-clock time or `setTimeout` must be replaceable, or your retry/backoff tests take real seconds and your quiet-hours tests only pass at night.

**Interview trap:** If your `NotificationService` signature mentions `SendGrid` anywhere, you've already lost the extensibility round. The orchestrator should be expressible without naming a single vendor.

---

## Step 3: Implementation

### 3.1 Core types, clock, and sleeper

```typescript
export enum NotificationStatus {
  PENDING = "PENDING",
  RENDERED = "RENDERED",
  SENT = "SENT",
  FAILED = "FAILED",
  SUPPRESSED = "SUPPRESSED",
}

export type NotificationCategory = "transactional" | "marketing";

export interface Notification {
  id: string;
  /** Caller-supplied. Same key = same logical notification; the service will not send it twice. */
  idempotencyKey: string;
  userId: string;
  channel: string; // "email" | "sms" | "push" | anything registered later
  templateId: string;
  category: NotificationCategory;
  data: Record<string, string>;
  createdAt: number;
}

export interface Recipient {
  userId: string;
  email?: string;
  phone?: string;
  deviceToken?: string;
  /** IANA timezone, e.g. "Asia/Kolkata" — required for quiet hours. */
  timezone: string;
}

export interface RenderedMessage {
  subject?: string; // email only; SMS/push ignore it
  body: string;
}

export interface ProviderResult {
  ok: boolean;
  providerMessageId?: string;
  errorCode?: string; // "500", "429", "INVALID_RECIPIENT", ...
  /** false = do not retry (bad recipient, rejected content). undefined/true = transient. */
  retryable?: boolean;
}

export interface Clock {
  now(): number;
}

export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }
}

export interface Sleeper {
  sleep(ms: number): Promise<void>;
}

export class RealSleeper implements Sleeper {
  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/** Test double: records requested delays, resolves immediately. */
export class FakeSleeper implements Sleeper {
  public readonly slept: number[] = [];
  sleep(ms: number): Promise<void> {
    this.slept.push(ms);
    return Promise.resolve();
  }
}
```

**Interview trap:** `await new Promise(r => setTimeout(r, delay))` inline in the retry loop is the classic un-testable-sleep mistake. The interviewer *will* ask "how do you unit-test the backoff?" — and with an injected `Sleeper` the answer is one sentence: assert on `fakeSleeper.slept`.

### 3.2 Template engine — per-channel variants, `{{var}}` interpolation

```typescript
export interface TemplateEngine {
  render(templateId: string, channel: string, data: Record<string, string>): RenderedMessage;
}

interface TemplateVariant {
  subject?: string;
  body: string;
}

export class RegexTemplateEngine implements TemplateEngine {
  // Keyed by "templateId:channel" — one logical template, N channel variants.
  private readonly templates = new Map<string, TemplateVariant>();

  register(templateId: string, channel: string, variant: TemplateVariant): this {
    this.templates.set(`${templateId}:${channel}`, variant);
    return this;
  }

  render(templateId: string, channel: string, data: Record<string, string>): RenderedMessage {
    const variant = this.templates.get(`${templateId}:${channel}`);
    if (!variant) {
      throw new Error(`No template variant "${templateId}" for channel "${channel}"`);
    }
    // Escaping is channel-specific: HTML entities matter for email bodies,
    // are garbage in an SMS. A real system escapes per content-type (text/html
    // vs text/plain); here we escape for email only.
    const escape = channel === "email" ? escapeHtml : (s: string) => s;

    const interpolate = (template: string): string =>
      template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
        const value = data[key];
        if (value === undefined) {
          throw new Error(`Missing variable "${key}" for template "${templateId}"`);
        }
        return escape(value);
      });

    return {
      subject: variant.subject !== undefined ? interpolate(variant.subject) : undefined,
      body: interpolate(variant.body),
    };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
```

Two things to say out loud: (1) missing variables **throw** rather than rendering `Hi {{name}}` to a customer — fail loudly at render time; (2) user-supplied data interpolated into HTML email without escaping is a stored-XSS vector in any client that renders HTML.

### 3.3 Providers — two fakes per channel, with failure hooks

```typescript
export interface ChannelProvider {
  readonly name: string;
  send(message: RenderedMessage, recipient: Recipient): Promise<ProviderResult>;
}

/**
 * Simulated vendor SDK. `failNext(n, code, retryable)` queues n failures —
 * this is the hook that makes failover and circuit-breaker behavior testable
 * deterministically, without mocking HTTP.
 */
abstract class SimulatedProvider implements ChannelProvider {
  private failuresQueued = 0;
  private failMode = { errorCode: "500", retryable: true };
  private sequence = 0;

  constructor(public readonly name: string) {}

  failNext(count: number, errorCode = "500", retryable = true): void {
    this.failuresQueued = count;
    this.failMode = { errorCode, retryable };
  }

  /** Return an error code if the recipient is unusable for this medium, else null. */
  protected abstract validate(recipient: Recipient): string | null;

  async send(_message: RenderedMessage, recipient: Recipient): Promise<ProviderResult> {
    const invalid = this.validate(recipient);
    if (invalid) {
      // A 4xx-class error: no amount of retrying or failover fixes a missing phone number.
      return { ok: false, errorCode: invalid, retryable: false };
    }
    if (this.failuresQueued > 0) {
      this.failuresQueued--;
      return { ok: false, errorCode: this.failMode.errorCode, retryable: this.failMode.retryable };
    }
    this.sequence++;
    return { ok: true, providerMessageId: `${this.name}-${this.sequence}` };
  }
}

export class SendGridProvider extends SimulatedProvider {
  constructor() { super("sendgrid"); }
  protected validate(r: Recipient): string | null {
    return r.email ? null : "INVALID_RECIPIENT";
  }
}

export class SesProvider extends SimulatedProvider {
  constructor() { super("ses"); }
  protected validate(r: Recipient): string | null {
    return r.email ? null : "INVALID_RECIPIENT";
  }
}

export class TwilioProvider extends SimulatedProvider {
  constructor() { super("twilio"); }
  protected validate(r: Recipient): string | null {
    return r.phone ? null : "INVALID_RECIPIENT";
  }
}

export class SnsSmsProvider extends SimulatedProvider {
  constructor() { super("sns-sms"); }
  protected validate(r: Recipient): string | null {
    return r.phone ? null : "INVALID_RECIPIENT";
  }
}

export class FcmProvider extends SimulatedProvider {
  constructor() { super("fcm"); }
  protected validate(r: Recipient): string | null {
    return r.deviceToken ? null : "INVALID_RECIPIENT";
  }
}

export class ApnsProvider extends SimulatedProvider {
  constructor() { super("apns"); }
  protected validate(r: Recipient): string | null {
    return r.deviceToken ? null : "INVALID_RECIPIENT";
  }
}
```

### 3.4 Provider health — circuit-breaker-lite

Full circuit breakers have three states and per-state metrics. In a 45-minute interview you implement the 20% that gives 80% of the value: after N consecutive failures a provider is *open* (skipped); after a cooldown it becomes *half-open* (one probe is allowed through; success closes it, failure re-opens it).

```typescript
export class ProviderHealth {
  private consecutiveFailures = 0;
  private openedAt: number | null = null;

  constructor(
    private readonly clock: Clock,
    private readonly failureThreshold = 3,
    private readonly cooldownMs = 30_000,
  ) {}

  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.openedAt = null; // closes the breaker (also from half-open)
  }

  recordFailure(): void {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= this.failureThreshold) {
      this.openedAt = this.clock.now(); // a half-open probe failing re-arms the cooldown
    }
  }

  /** true = closed, or half-open (cooldown elapsed → allow a probe). */
  isAvailable(): boolean {
    if (this.openedAt === null) return true;
    return this.clock.now() - this.openedAt >= this.cooldownMs;
  }
}
```

**Interview trap:** Failover *without* health tracking means every single send pays a full timeout against the dead primary before reaching the fallback. If SendGrid is down for an hour and your HTTP timeout is 10s, you just added 10s of latency to every email for an hour. The breaker is not gold-plating; it is the point.

### 3.5 Provider selection — strategy

```typescript
export interface ProviderSelector {
  /**
   * Returns providers in the order they should be attempted for this send.
   * Unavailable (open-circuit) providers are moved to the back, not removed:
   * if every provider is unhealthy we still try, because "probably down"
   * beats "definitely undelivered".
   */
  order(providers: ChannelProvider[], health: Map<string, ProviderHealth>): ChannelProvider[];
}

export class PriorityFailoverSelector implements ProviderSelector {
  order(providers: ChannelProvider[], health: Map<string, ProviderHealth>): ChannelProvider[] {
    const available = providers.filter((p) => health.get(p.name)?.isAvailable() !== false);
    const parked = providers.filter((p) => health.get(p.name)?.isAvailable() === false);
    return [...available, ...parked];
  }
}

export class WeightedRoundRobinSelector implements ProviderSelector {
  private counter = 0;

  constructor(private readonly weights: Map<string, number>) {}

  order(providers: ChannelProvider[], health: Map<string, ProviderHealth>): ChannelProvider[] {
    const ring: ChannelProvider[] = [];
    for (const p of providers) {
      const weight = Math.max(1, this.weights.get(p.name) ?? 1);
      for (let i = 0; i < weight; i++) ring.push(p);
    }
    const primary = ring[this.counter++ % ring.length];
    const ordered = [primary, ...providers.filter((p) => p !== primary)];
    const available = ordered.filter((p) => health.get(p.name)?.isAvailable() !== false);
    const parked = ordered.filter((p) => health.get(p.name)?.isAvailable() === false);
    return [...available, ...parked];
  }
}
```

### 3.6 Channels — one class per medium, composed from providers

```typescript
export interface NotificationChannel {
  readonly type: string;
  send(message: RenderedMessage, recipient: Recipient): Promise<ProviderResult>;
}

export class ProviderBackedChannel implements NotificationChannel {
  private readonly health = new Map<string, ProviderHealth>();

  constructor(
    public readonly type: string,
    private readonly providers: ChannelProvider[],
    private readonly selector: ProviderSelector,
    clock: Clock,
  ) {
    if (providers.length === 0) throw new Error(`Channel "${type}" needs at least one provider`);
    for (const p of providers) this.health.set(p.name, new ProviderHealth(clock));
  }

  async send(message: RenderedMessage, recipient: Recipient): Promise<ProviderResult> {
    let last: ProviderResult = { ok: false, errorCode: "NO_PROVIDER", retryable: false };
    for (const provider of this.selector.order(this.providers, this.health)) {
      const result = await provider.send(message, recipient);
      const health = this.health.get(provider.name)!;
      if (result.ok) {
        health.recordSuccess();
        return result;
      }
      health.recordFailure();
      last = result;
      if (result.retryable === false) {
        // Invalid recipient / rejected content: failing over to another
        // vendor cannot fix it. Stop the chain immediately.
        return result;
      }
    }
    return last; // every provider failed transiently — the RetryPolicy decides what happens next
  }
}

export class EmailChannel extends ProviderBackedChannel {
  constructor(clock: Clock, selector: ProviderSelector = new PriorityFailoverSelector()) {
    super("email", [new SendGridProvider(), new SesProvider()], selector, clock);
  }
}

export class SmsChannel extends ProviderBackedChannel {
  constructor(clock: Clock, selector: ProviderSelector = new PriorityFailoverSelector()) {
    super("sms", [new TwilioProvider(), new SnsSmsProvider()], selector, clock);
  }
}

export class PushChannel extends ProviderBackedChannel {
  constructor(clock: Clock, selector: ProviderSelector = new PriorityFailoverSelector()) {
    super("push", [new FcmProvider(), new ApnsProvider()], selector, clock);
  }
}
```

Notice the layering: **failover across providers happens inside one send attempt** (inside the channel); **retries with backoff happen across attempts** (in the orchestrator). Conflating the two layers produces either no failover or exponential retry storms.

### 3.7 Retry policy — exponential backoff with full jitter

```typescript
export interface RetryPolicy {
  readonly maxAttempts: number;
  /** attempt is 0-based: delay before retry #1 uses attempt=0. */
  delayMs(attempt: number): number;
  isRetryable(result: ProviderResult): boolean;
}

export class ExponentialBackoffFullJitter implements RetryPolicy {
  constructor(
    public readonly maxAttempts = 4,
    private readonly baseMs = 200,
    private readonly capMs = 10_000,
    private readonly random: () => number = Math.random, // injectable for determinism
  ) {}

  // AWS-recommended "full jitter": delay = random(0, min(cap, base * 2^attempt)).
  // Plain exponential backoff synchronizes clients into thundering-herd waves;
  // full jitter spreads retries uniformly across the window.
  delayMs(attempt: number): number {
    const ceiling = Math.min(this.capMs, this.baseMs * 2 ** attempt);
    return Math.floor(this.random() * ceiling);
  }

  isRetryable(result: ProviderResult): boolean {
    return result.retryable !== false;
  }
}
```

**Interview trap:** Retrying a 4xx (invalid phone number, unsubscribed address, malformed payload) with the same enthusiasm as a 5xx is a top-three rejection reason for this problem. The request will fail identically forever; you burn quota, delay the failure signal, and possibly get your provider account flagged. Classification of retryable vs. terminal errors must appear somewhere in your design — here it originates in `ProviderResult.retryable`.

### 3.8 Per-user rate limiting — token bucket, suppression not error

```typescript
export interface RateLimiter {
  tryConsume(userId: string): boolean;
}

export class TokenBucketRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, { tokens: number; lastRefillAt: number }>();

  constructor(
    private readonly clock: Clock,
    private readonly capacity = 10,       // burst size
    private readonly refillPerSecond = 0.5, // sustained rate: 1 notification / 2s
  ) {}

  tryConsume(userId: string): boolean {
    const now = this.clock.now();
    let bucket = this.buckets.get(userId);
    if (!bucket) {
      bucket = { tokens: this.capacity, lastRefillAt: now };
      this.buckets.set(userId, bucket);
    }
    const elapsedSeconds = (now - bucket.lastRefillAt) / 1000;
    bucket.tokens = Math.min(this.capacity, bucket.tokens + elapsedSeconds * this.refillPerSecond);
    bucket.lastRefillAt = now;
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }
    return false;
  }
}
```

A rate-limited notification becomes `SUPPRESSED`, not `FAILED`. Say why: suppression is the system *working as designed*; if it lands in the failure bucket it triggers retries (spamming the user harder — the exact opposite of the intent) and pollutes error dashboards.

### 3.9 Preferences — opt-outs, quiet hours, transactional override

```typescript
export interface UserPreferences {
  /** Channels the user opted out of. Applies to MARKETING only. */
  optedOutChannels: Set<string>;
  /** Local-time window in which marketing messages are held/suppressed. */
  quietHours?: { startHour: number; endHour: number };
}

export interface UserPreferenceStore {
  get(userId: string): Promise<UserPreferences>;
}

export class InMemoryPreferenceStore implements UserPreferenceStore {
  private readonly prefs = new Map<string, UserPreferences>();

  set(userId: string, preferences: UserPreferences): void {
    this.prefs.set(userId, preferences);
  }

  async get(userId: string): Promise<UserPreferences> {
    return this.prefs.get(userId) ?? { optedOutChannels: new Set<string>() };
  }
}

/**
 * Timezone note for the interviewer: never do quiet-hours math with raw UTC
 * offsets — DST transitions and half-hour zones (IST is UTC+5:30) break it.
 * Delegate to the platform's IANA tz database via Intl.
 */
export function localHour(epochMs: number, timezone: string): number {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    hour12: false,
  }).format(new Date(epochMs));
  return parseInt(hour, 10) % 24; // Intl yields "24" at midnight in some ICU versions
}

export function isInQuietHours(prefs: UserPreferences, recipient: Recipient, clock: Clock): boolean {
  if (!prefs.quietHours) return false;
  const hour = localHour(clock.now(), recipient.timezone);
  const { startHour, endHour } = prefs.quietHours;
  // Window may wrap midnight: 22 → 7.
  return startHour <= endHour
    ? hour >= startHour && hour < endHour
    : hour >= startHour || hour < endHour;
}
```

The category override is a business rule worth stating explicitly: **transactional notifications (password reset, OTP, receipt) ignore marketing opt-outs and quiet hours.** A user who unsubscribed from your newsletter still must receive their 2FA code at 3 a.m. Miss this and you have designed a system that locks users out of their accounts politely.

### 3.10 Status store with idempotency

```typescript
export interface StatusRecord {
  notificationId: string;
  idempotencyKey: string;
  status: NotificationStatus;
  detail?: string;
  attempts: number;
  updatedAt: number;
}

export class StatusStore {
  private readonly byIdempotencyKey = new Map<string, StatusRecord>();

  get(idempotencyKey: string): StatusRecord | undefined {
    return this.byIdempotencyKey.get(idempotencyKey);
  }

  upsert(record: StatusRecord): StatusRecord {
    this.byIdempotencyKey.set(record.idempotencyKey, record);
    return record;
  }
}
```

In production this is a database table with a unique index on `idempotency_key` — the uniqueness constraint, not application code, is what makes concurrent duplicate submissions safe. Say that sentence; it separates people who have operated systems from people who have read about them.

### 3.11 Channel registry and recipient directory

```typescript
export class ChannelRegistry {
  private readonly channels = new Map<string, NotificationChannel>();

  register(channel: NotificationChannel): this {
    this.channels.set(channel.type, channel);
    return this;
  }

  get(type: string): NotificationChannel | undefined {
    return this.channels.get(type);
  }
}

export interface RecipientDirectory {
  get(userId: string): Promise<Recipient | undefined>;
}

export class InMemoryRecipientDirectory implements RecipientDirectory {
  private readonly recipients = new Map<string, Recipient>();

  set(recipient: Recipient): void {
    this.recipients.set(recipient.userId, recipient);
  }

  async get(userId: string): Promise<Recipient | undefined> {
    return this.recipients.get(userId);
  }
}
```

### 3.12 The orchestrator

```typescript
export class NotificationService {
  constructor(
    private readonly channels: ChannelRegistry,
    private readonly templates: TemplateEngine,
    private readonly preferences: UserPreferenceStore,
    private readonly recipients: RecipientDirectory,
    private readonly rateLimiter: RateLimiter,
    private readonly retryPolicy: RetryPolicy,
    private readonly sleeper: Sleeper,
    private readonly clock: Clock,
    private readonly statuses: StatusStore,
  ) {}

  async notify(notification: Notification): Promise<StatusRecord> {
    // 0. Idempotency: a key we've already resolved (other than FAILED) is returned as-is.
    //    FAILED is re-attemptable by design: the caller retrying a failure is legitimate.
    const existing = this.statuses.get(notification.idempotencyKey);
    if (existing && existing.status !== NotificationStatus.FAILED) {
      return existing;
    }

    const record = (status: NotificationStatus, detail: string | undefined, attempts: number) =>
      this.statuses.upsert({
        notificationId: notification.id,
        idempotencyKey: notification.idempotencyKey,
        status,
        detail,
        attempts,
        updatedAt: this.clock.now(),
      });

    record(NotificationStatus.PENDING, undefined, 0);

    // 1. Resolve recipient and preferences.
    const recipient = await this.recipients.get(notification.userId);
    if (!recipient) {
      return record(NotificationStatus.FAILED, "unknown recipient", 0);
    }
    const prefs = await this.preferences.get(notification.userId);

    // 2. Policy: marketing respects opt-outs and quiet hours; transactional does not.
    if (notification.category === "marketing") {
      if (prefs.optedOutChannels.has(notification.channel)) {
        return record(NotificationStatus.SUPPRESSED, "channel opt-out", 0);
      }
      if (isInQuietHours(prefs, recipient, this.clock)) {
        return record(NotificationStatus.SUPPRESSED, "quiet hours", 0);
      }
    }

    // 3. Per-user rate limit — suppression, not error.
    if (!this.rateLimiter.tryConsume(notification.userId)) {
      return record(NotificationStatus.SUPPRESSED, "user rate limit", 0);
    }

    // 4. Render. Template errors are terminal — retrying won't grow a missing variable.
    let rendered: RenderedMessage;
    try {
      rendered = this.templates.render(notification.templateId, notification.channel, notification.data);
    } catch (err) {
      return record(NotificationStatus.FAILED, (err as Error).message, 0);
    }
    record(NotificationStatus.RENDERED, undefined, 0);

    // 5. Resolve channel polymorphically. No switch statement anywhere.
    const channel = this.channels.get(notification.channel);
    if (!channel) {
      return record(NotificationStatus.FAILED, `no channel registered: ${notification.channel}`, 0);
    }

    // 6. Send with retries. Failover across providers happens inside channel.send();
    //    this loop handles the case where the whole provider chain failed transiently.
    let last: ProviderResult = { ok: false, errorCode: "NOT_ATTEMPTED", retryable: true };
    for (let attempt = 0; attempt < this.retryPolicy.maxAttempts; attempt++) {
      if (attempt > 0) {
        await this.sleeper.sleep(this.retryPolicy.delayMs(attempt - 1));
      }
      last = await channel.send(rendered, recipient);
      if (last.ok) {
        return record(NotificationStatus.SENT, last.providerMessageId, attempt + 1);
      }
      if (!this.retryPolicy.isRetryable(last)) {
        return record(NotificationStatus.FAILED, `terminal: ${last.errorCode}`, attempt + 1);
      }
    }
    return record(NotificationStatus.FAILED, `exhausted retries: ${last.errorCode}`, this.retryPolicy.maxAttempts);
  }
}
```

### 3.13 Wiring — and the "add WhatsApp" proof

```typescript
export function buildNotificationService(): {
  service: NotificationService;
  registry: ChannelRegistry;
  templates: RegexTemplateEngine;
  recipients: InMemoryRecipientDirectory;
  preferences: InMemoryPreferenceStore;
} {
  const clock = new SystemClock();
  const templates = new RegexTemplateEngine();
  const preferences = new InMemoryPreferenceStore();
  const recipients = new InMemoryRecipientDirectory();

  const registry = new ChannelRegistry()
    .register(new EmailChannel(clock))
    .register(new SmsChannel(clock))
    .register(new PushChannel(clock));

  const service = new NotificationService(
    registry,
    templates,
    preferences,
    recipients,
    new TokenBucketRateLimiter(clock),
    new ExponentialBackoffFullJitter(),
    new RealSleeper(),
    clock,
    new StatusStore(),
  );
  return { service, registry, templates, recipients, preferences };
}

// --- Adding WhatsApp later: one class + one registration line. Nothing else changes. ---

export class WhatsAppCloudProvider extends SimulatedProvider {
  constructor() { super("whatsapp-cloud"); }
  protected validate(r: Recipient): string | null {
    return r.phone ? null : "INVALID_RECIPIENT";
  }
}

export class WhatsAppChannel extends ProviderBackedChannel {
  constructor(clock: Clock) {
    super("whatsapp", [new WhatsAppCloudProvider()], new PriorityFailoverSelector(), clock);
  }
}

// registry.register(new WhatsAppChannel(clock));  ← the single registration line
```

**Interview trap:** When you finish, walk the interviewer through one send end-to-end ("marketing email, user in quiet hours → SUPPRESSED before we ever render") and one failure path ("SendGrid returns 500 three times → breaker opens → SES takes traffic → half-open probe after 30s"). Candidates who narrate data flow through their own design score dramatically better than those who stop at "done".

---

## Step 4: Extensibility follow-ups

**Interviewer:** This is synchronous. We're at 10 million notifications an hour now — what changes?

**You:** The `NotificationService` stops being called in the request path and becomes the body of a queue worker. The API layer validates, writes the `PENDING` status row, and enqueues the notification — BullMQ on Redis or SQS, partitioned so one user's burst can't starve others. Workers pull, call `service.notify()`, and ack on completion. Crucially, almost nothing in this design changes: retries can even move *into* the queue (failed job → delayed re-enqueue with the same backoff curve), which is better than in-process sleeping because a worker crash mid-backoff doesn't lose the retry — the job is still in Redis. The idempotency key becomes load-bearing here, since queue redelivery (worker dies after send, before ack) is exactly the duplicate-delivery scenario we designed for.

**Interviewer:** Can you give me exactly-once delivery?

**You:** No, and I'll push back on the requirement rather than pretend. Exactly-once is impossible across a network boundary we don't control — SMTP and provider HTTP APIs have no transactional handshake, so there is always a window where the send succeeded but our acknowledgment was lost. What I can offer is *effectively-once*: at-least-once delivery plus an idempotency key checked before send, plus a dedupe window at the status store (unique index on the key). The residual risk is the crash-after-send-before-record window, which we shrink by recording an `IN_FLIGHT` marker before calling the provider, and we accept a rare duplicate over a rare loss — which matches the requirement from Step 1.

**Interviewer:** Product wants daily digests — batch ten marketing events into one email instead of ten emails.

**You:** That's an aggregation stage *in front of* this service, not a change to it. Events land in a per-user buffer (Redis sorted set or a `digest_items` table) instead of being sent immediately; a scheduler flushes each user's buffer at their preferred local hour, renders a `digest` template with the collected items as template data, and submits *one* notification through the existing pipeline. The idempotency key becomes `userId + digestDate`, which gives us free protection against the scheduler double-firing. The rate limiter and quiet-hours logic apply unchanged because the digest is just another notification.

**Interviewer:** How do you actually test provider failover?

**You:** Deterministically, with the seams we built. Unit level: `sendGrid.failNext(3, "500")`, inject a `ManualClock` and `FakeSleeper`, call `notify()`, and assert (a) the result is `SENT` via `ses`, (b) SendGrid's health is open after 3 failures, (c) after advancing the clock past the cooldown, the next send probes SendGrid again. The `FakeSleeper.slept` array proves the backoff curve without real waiting. Integration level: contract tests against provider sandboxes. Production level: game days — actually null-route the primary provider's DNS in staging and watch the dashboards, because config errors in failover paths only reveal themselves under real failure.

**Interviewer:** An OTP must go out in under two seconds, but the queue has a million marketing emails in it.

**You:** Priority isolation, and I'd do it with separate queues rather than a priority field. A `transactional` queue and a `marketing` queue, with dedicated worker pools — that guarantees marketing backlog can never occupy the workers OTPs need, whereas a single priority queue still lets in-flight low-priority jobs block. The `category` field we already carry chooses the queue at enqueue time. I'd also give transactional a hotter retry curve (shorter base, fewer attempts — an OTP retried after 10 minutes is useless) which is just a second `RetryPolicy` instance injected into the transactional workers. Per-provider rate limits should also be partitioned so marketing can't exhaust the SMS quota OTPs need.

**Interviewer:** SendGrid tells you about bounces and deliveries via webhooks, minutes later. How does that fit your status model?

**You:** `SENT` gets reinterpreted as "accepted by provider," and the lifecycle grows async terminal states: `DELIVERED`, `BOUNCED`, `COMPLAINED`. A webhook endpoint receives provider callbacks, verifies the signature, and correlates via `providerMessageId` — which is exactly why the channel returns it and why we persist it on the status record. Two operational details matter: webhooks arrive out of order and duplicated, so the status transition must be monotonic (never overwrite `BOUNCED` with a late `DELIVERED`) — a small allowed-transitions map enforces that; and hard bounces must feed back into the system as an automatic suppression list entry, because repeatedly emailing bouncing addresses destroys your sender reputation with *every* provider.

**Interviewer:** Your rate limiter is an in-memory `Map`. What happens when you scale to ten workers?

**You:** It silently becomes a 10x-looser limit, since each worker has its own buckets — that's a real bug class, not a nitpick. The `RateLimiter` interface stays, and the implementation moves to Redis: token bucket as a Lua script (or Redis 7's built-in functions) so read-modify-write is atomic, keyed `ratelimit:{userId}`. The interface returning `boolean` also needs to become `Promise<boolean>` — which is why, in hindsight, I'd define even the in-memory version async from day one; sync-to-async interface migrations touch every caller.

---

## Step 5: What gets you rejected

- **A `switch (notification.channel)` in the orchestrator.** This is the number-one filter for this question. The moment the orchestrator knows channel names, adding WhatsApp means editing tested core code, and the interviewer concludes you don't internalize Open/Closed — you just know its definition. Channels are polymorphic objects in a registry; the orchestrator dispatches through the interface.
- **Retrying non-retryable errors.** Treating `INVALID_RECIPIENT` (4xx-class) like a 500 means four backoff cycles burning ~20 seconds and provider quota on a phone number that will never be valid. Errors must be classified at the provider boundary and the classification must short-circuit both the failover chain and the retry loop.
- **Un-injectable time.** Hardcoded `setTimeout` sleeps and `Date.now()` calls mean your backoff test takes 30 real seconds and your quiet-hours test passes only during business hours. `Clock` and `Sleeper` as constructor dependencies is a two-minute investment that signals you've actually written tests for time-dependent code.
- **No idempotency story.** If the interviewer asks "the worker crashes right after the provider accepts the message — what does the user see?" and your answer involves neither an idempotency key nor a dedupe window, you've designed a duplicate-sender. At-least-once semantics were established in Step 1; the design must visibly carry that decision.
- **Template rendering inside channel classes.** Each channel re-implementing interpolation duplicates escaping bugs three times and makes "preview this template" impossible without instantiating providers. Rendering is a pipeline stage owned by `TemplateEngine`; channels receive a finished `RenderedMessage`.
- **Unbounded retry accumulation.** Infinite retries (or retries without caps and jitter) mean a provider outage converts your queue into a self-sustaining retry storm that continues hammering the provider after it recovers — the classic self-inflicted DDoS. Max attempts, capped backoff, full jitter, and a dead-letter destination for exhausted jobs are all part of the expected answer.
- **Suppression modeled as failure.** Rate-limited and opted-out notifications landing in the `FAILED` bucket sets off pagers for correct behavior and, worse, triggers retries that defeat the suppression. `SUPPRESSED` is a distinct terminal state; its existence in your enum is itself a signal you've thought the domain through.

---

*Next: 08 — Solved LLD: In-Memory Cache Library — pluggable eviction, O(1) LRU from scratch.*
