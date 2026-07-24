# Production Backend Patterns for Next.js

Auth architecture, security, rate limiting, observability, testing, and scaling — the operational half of a Next.js fullstack role.

## Table of Contents
1. [Authentication Architecture](#auth)
2. [Authorization Patterns](#authz)
3. [Security Checklist](#security)
4. [Rate Limiting](#rate-limiting)
5. [File Uploads Done Right](#uploads)
6. [Observability: Logging, Tracing, Errors](#observability)
7. [Testing the Backend](#testing)
8. [Deployment & Scaling](#deployment)
9. [Environment Variables & Config](#env)
10. [System-Design Interview Scenarios](#scenarios)

---

<a name="auth"></a>
## 1. Authentication Architecture

### The two session strategies

| | Stateless (JWT in cookie) | Database sessions |
|---|---|---|
| Verify | Signature check — no DB hit | DB/Redis lookup per request |
| Revocation | Hard (must wait for expiry or keep a denylist) | Instant — delete the row |
| Works in middleware/edge | ✅ (jose) | ❌ (needs DB) — unless Redis-at-edge |
| Payload | Visible (base64) — never put secrets in it | Server-side only |
| Best for | Most apps; short-lived access + refresh rotation | Banking-grade revocation needs |

Production hybrid: **short-lived JWT (5–15 min) verified statelessly in middleware + refresh token stored in DB** — fast checks, real revocation.

### Cookie settings that interviewers check

```ts
cookieStore.set('session', token, {
  httpOnly: true,   // JS can't read it → XSS can't exfiltrate the session
  secure: true,     // HTTPS only
  sameSite: 'lax',  // CSRF mitigation; 'strict' breaks external links landing logged-in
  path: '/',
  maxAge: 60 * 15,
});
```

**Never store tokens in localStorage** — any XSS reads it. httpOnly cookies are the answer; pair with CSRF protection (SameSite + Next's built-in Origin check for server actions).

### Where auth checks live (defense in depth)

1. **Middleware** — optimistic redirect (UX). Cheap JWT signature check only.
2. **Layout/Page** — ⚠️ layouts do **not** re-render on every navigation; a check in `layout.tsx` alone is a known hole. Check in pages or, better:
3. **Data Access Layer** — the authoritative check, `cache()`-wrapped `verifySession()` called by every data function. This is the one that must never be missing.
4. **Server actions & route handlers** — each one authorizes independently (they're public endpoints).

### NextAuth / Auth.js sketch

```ts
// auth.ts (v5)
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google,
    Credentials({
      async authorize(creds) {
        const user = await db.user.findUnique({ where: { email: creds.email as string } });
        if (!user || !(await bcrypt.compare(creds.password as string, user.passwordHash))) return null;
        return { id: user.id, email: user.email, role: user.role };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    jwt({ token, user }) { if (user) token.role = (user as any).role; return token; },
    session({ session, token }) { (session.user as any).role = token.role; return session; },
  },
});
// app/api/auth/[...nextauth]/route.ts → export const { GET, POST } = handlers;
// Usage in RSC/actions: const session = await auth();
```

Password hashing: bcrypt (cost ≥ 12) or argon2id. Hashing is CPU-bound — Node runtime only, and a reason login endpoints deserve rate limiting.

---

<a name="authz"></a>
## 2. Authorization Patterns

- **RBAC**: `role` on the session; check per capability, not per role string scattered everywhere — centralize in a `can(user, action, resource)` helper.
- **Resource ownership**: always filter by owner in the *query*, not after fetching:
  ```ts
  // ✅ where: { id, ownerId: session.userId }  → not-found and forbidden collapse safely
  // ❌ fetch by id, then compare owner in JS   → easy to forget, leaks existence
  ```
- **DTOs**: never return raw DB rows to client components/route handlers — `passwordHash`, `stripeCustomerId` etc. serialize straight into the RSC payload/JSON if you do. Map to explicit shapes.
- Multi-tenant: derive `tenantId` from subdomain (middleware rewrite) or session — **never from a client-supplied body field**.

---

<a name="security"></a>
## 3. Security Checklist

- **Injection**: ORM/parameterized queries; `$queryRaw` with tagged templates only. Validate all input with Zod at every boundary.
- **XSS**: React escapes by default; danger zones are `dangerouslySetInnerHTML` (sanitize with DOMPurify/sanitize-html server-side), `href={userInput}` (`javascript:` URLs), and injecting user content into `<Script>`.
- **CSRF**: SameSite cookies; server actions get an automatic Origin/Host check; custom route handlers doing cookie-authenticated mutations should verify `Origin` too.
- **SSRF**: any feature that fetches user-supplied URLs (link previews, image proxy) must allowlist protocols/hosts and block private IP ranges (169.254.169.254 = cloud metadata).
- **Secrets in the bundle**: only `NEXT_PUBLIC_` vars reach the client — audit that nothing sensitive has that prefix; use `server-only` imports for modules touching secrets. **Env vars are inlined at build time** in client code — changing them requires a rebuild.
- **Security headers** (next.config or middleware): `Content-Security-Policy` (nonce-based for inline scripts), `X-Frame-Options: DENY`/`frame-ancestors`, `Strict-Transport-Security`, `Referrer-Policy`, `X-Content-Type-Options: nosniff`.
- **Open redirects**: validate `?from=` / `?next=` params are relative paths before redirecting after login.
- **Keep Next.js patched** — middleware-bypass (CVE-2025-29927) and image-optimizer CVEs are recent, concrete examples of framework-level risk; another reason authorization must live in the data layer, not only middleware.
- **Error hygiene**: Next already redacts server error messages in prod (digest only); make sure your route handlers do the same — no stack traces or SQL in JSON responses.

---

<a name="rate-limiting"></a>
## 4. Rate Limiting

In-memory counters don't work on serverless (each instance has its own memory). Use a shared store:

```ts
// lib/rate-limit.ts — sliding window on Upstash Redis (edge-compatible)
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const authLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 attempts/min
  prefix: 'rl:auth',
});

// In a route handler or server action:
const ip = (await headers()).get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
const { success, reset } = await authLimiter.limit(`login:${ip}`);
if (!success) {
  return NextResponse.json({ error: 'Too many attempts' }, {
    status: 429,
    headers: { 'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)) },
  });
}
```

Key by IP for anonymous, by user ID once authenticated; key login attempts by IP **and** by target account. Know the algorithms conceptually: fixed window (bursty at edges), sliding window (smooth), token bucket (allows bursts, steady refill).

---

<a name="uploads"></a>
## 5. File Uploads Done Right

Serverless bodies have size limits (~4.5MB on Vercel) and buffering large files in a function wastes memory. Production pattern = **presigned URLs**: the server authorizes, the browser uploads directly to storage.

```ts
// 1. Server action: authorize + mint a presigned PUT URL
'use server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export async function getUploadUrl(fileName: string, contentType: string, size: number) {
  const session = await verifySession();
  if (!session) throw new Error('Unauthorized');
  if (size > 10 * 1024 * 1024) throw new Error('Too large');
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(contentType)) throw new Error('Bad type');

  const key = `uploads/${session.userId}/${crypto.randomUUID()}`; // never trust fileName for the key
  const url = await getSignedUrl(s3, new PutObjectCommand({
    Bucket: process.env.S3_BUCKET, Key: key, ContentType: contentType,
  }), { expiresIn: 300 });
  return { url, key };
}

// 2. Client PUTs the file to `url` directly
// 3. Client confirms → server action records `key` in DB (and ideally verifies
//    the object exists + its real content type; extension/claimed MIME are attacker-controlled)
```

Small uploads through a route handler are fine: `const file = (await req.formData()).get('file') as File; Buffer.from(await file.arrayBuffer())` — still validate size/type server-side and re-encode images (sharp) to strip malicious payloads/EXIF.

---

<a name="observability"></a>
## 6. Observability: Logging, Tracing, Errors

- **Structured logs** (pino or plain JSON): one line per request with `requestId`, `userId`, route, status, duration. On serverless, log to stdout — the platform ships it.
- **Request IDs**: generate in middleware, set as a request header, include in every log line and in error responses (`error.digest` correlates client-visible errors to server logs).
- **Tracing**: Next.js has built-in OpenTelemetry support (`instrumentation.ts` + `registerOTel`) — spans for rendering, fetches, route handlers; export to Datadog/Honeycomb/Jaeger. `instrumentation.ts` also runs once per server start — the right place for global init.
- **Error tracking**: Sentry's Next SDK captures server-component errors, route handlers, and client errors with source maps; `global-error.tsx` catches root-layout crashes.
- **Metrics that matter**: p95/p99 route latency, cold-start rate, DB pool saturation, cache hit ratio (`x-vercel-cache: HIT/MISS/STALE`), 4xx/5xx rates, queue depth.

---

<a name="testing"></a>
## 7. Testing the Backend

- **Unit-test route handlers directly** — they're just functions taking a `Request`:
  ```ts
  import { GET } from '@/app/api/posts/route';
  const res = await GET(new NextRequest('http://test/api/posts?page=1'));
  expect(res.status).toBe(200);
  ```
- **Server actions**: test as plain async functions with a constructed `FormData`; mock `cookies()`/`revalidatePath` (`vi.mock('next/headers')`, `vi.mock('next/cache')`).
- **DAL/integration**: run against a real disposable DB (Testcontainers Postgres or SQLite) rather than mocking the ORM — ORM mocks rot.
- **E2E (Playwright)**: the only layer that truly exercises RSC rendering, streaming, cookies, and middleware together. Async server components don't render meaningfully in jsdom/unit tests — official guidance is E2E for them.
- Contract-test webhooks with recorded fixtures (e.g. Stripe CLI events), asserting signature verification rejects tampered bodies.

---

<a name="deployment"></a>
## 8. Deployment & Scaling

### Output targets

- **Vercel**: pages/handlers → serverless functions, middleware → edge, static → CDN, ISR handled natively. Zero config; costs and execution limits are per-invocation.
- **Self-hosted `next start` (or `output: 'standalone'` in Docker)**: one long-lived Node server — connection pooling is easy, SSE/WebSockets are easy, but *you* handle horizontal scaling, and the default ISR cache is per-instance on disk → **multiple replicas serve inconsistent stale pages unless you configure a shared cache handler** (`cacheHandler` in next.config, typically Redis-backed). This "ISR across replicas" question is a classic senior interview probe.
- Multi-stage Dockerfile: deps → build → copy `.next/standalone` + `.next/static` + `public`, run `node server.js` as non-root.

### Scaling model

- Serverless scales horizontally per-request automatically; the DB becomes the bottleneck → poolers, read replicas, caching.
- Long-lived containers: scale via replicas behind a load balancer; sticky sessions are unnecessary if sessions are cookie/DB based (keep app state out of process memory).
- **WebSockets don't fit serverless** — use a managed realtime layer (Pusher/Ably/Supabase Realtime) or a separate persistent WS service; Next.js API routes on Vercel can't hold WS connections.

### Graceful behavior

- Health-check route (`/api/health`) that verifies DB connectivity.
- `SIGTERM` handling in standalone mode: stop accepting, drain, close pools.
- Zero-downtime deploys need backward-compatible DB migrations (expand → migrate → contract).

---

<a name="env"></a>
## 9. Environment Variables & Config

- Server-only vars: available in server components, actions, handlers via `process.env.X`.
- `NEXT_PUBLIC_*`: **inlined into the client bundle at build time** — they are string-replaced, not read at runtime. Changing one requires a rebuild; you can't have one Docker image with per-env public vars unless you use a runtime-config workaround.
- Validate at startup with a Zod schema (`lib/env.ts` parsing `process.env`) so a missing `DATABASE_URL` fails the build, not a 3am request.
- `.env.local` (gitignored) > `.env.development`/`.env.production` > `.env`; never commit secrets; distinct secrets per environment.

---

<a name="scenarios"></a>
## 10. System-Design Interview Scenarios

**"Design a blog platform with Next.js"** — Posts: SSG + ISR (`revalidate` or tag-based on publish via `revalidateTag('posts')` from the CMS webhook route handler). Comments: dynamic island under Suspense or client-fetched. Admin: dynamic routes behind middleware + DAL auth. Images: next/image + remote storage.

**"Design checkout"** — Cart mutations via server actions (auth + Zod + transaction). Payment: create PaymentIntent server-side, never trust client amounts; Stripe webhook route handler with raw-body signature verification is the source of truth for order status (the redirect page is not); idempotency keys on order creation; queue for emails/fulfillment via `after()` or QStash.

**"Feed that must be fresh for logged-in users but fast"** — Static shell via PPR/Suspense; personalized feed streamed as a dynamic hole; `cookies()` isolated to that subtree; cache per-user fragments in Redis with short TTL if needed; prefetch on viewport with `<Link>`.

**"You see stale data after a mutation — debug it"** — Walk the four caches: did the mutation `revalidateTag/Path` (data + full route cache)? Is the client seeing the router cache (was the action a server action, which busts it, or a raw `fetch` from the client, which doesn't → need `router.refresh()`)? Is a `fetch` still `force-cache` from Next 14 defaults? Is self-hosted ISR cache per-replica?

**"API is slow — debug it"** — Cold starts (bundle size, provisioned concurrency)? Edge function + far database? N+1 in RSC tree? Sequential awaits instead of `Promise.all`? Missing DB indexes (EXPLAIN)? Connection pool exhaustion (poolers)? Measure with OTel spans before guessing.
