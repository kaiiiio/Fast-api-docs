# Next.js Backend Deep Dive (App Router)

How the Next.js server layer actually works — runtimes, route handlers, server actions, caching internals, middleware, and database patterns. Written for a fullstack Next.js role where you own the backend, not just consume it.

## Table of Contents
1. [How a Request Flows Through Next.js](#request-flow)
2. [Runtimes: Node.js vs Edge](#runtimes)
3. [Route Handlers In Depth](#route-handlers)
4. [Server Actions Internals](#server-actions)
5. [The Four Caching Layers](#caching-layers)
6. [Middleware In Depth](#middleware)
7. [Database Integration Patterns](#database)
8. [Streaming, Suspense & the RSC Payload](#streaming)
9. [Background Jobs, Queues & Long-Running Work](#background-jobs)
10. [Error Handling & Validation on the Server](#error-handling)

---

<a name="request-flow"></a>
## 1. How a Request Flows Through Next.js

Understanding the pipeline is the foundation for every "why is this cached / slow / not updating" question.

```
Incoming request
      │
      ▼
1. Edge network / CDN  ──► full-route cache hit? serve static HTML/RSC payload
      │ miss
      ▼
2. Middleware (runs on EVERY matched request, before routing completes)
      │  can rewrite, redirect, set headers/cookies, or pass through
      ▼
3. Router resolves the segment tree (layouts → page / route handler)
      │
      ▼
4. Rendering / execution
      ├─ Page: React renders Server Components → RSC payload + HTML
      ├─ Route Handler: your GET/POST function runs
      └─ Server Action: POST with Next-Action header dispatches to your function
      │
      ▼
5. Response streamed back (HTML shell first, then suspended chunks)
```

Key facts interviewers probe:

- **Middleware runs before the cache is consulted for dynamic routes but the CDN can serve fully static routes without ever hitting your middleware on some platforms** — on Vercel, middleware runs before the cache, which is why it's usable for A/B testing static pages.
- **Each request to a serverless deployment may hit a cold function instance.** Module scope survives *warm* invocations only — this matters for connection pooling and in-memory caches.
- **A "page request" in the App Router can be two kinds of request:** a document request (browser navigation → full HTML) or a client-side navigation (`<Link>`) which fetches only the **RSC payload** (`?_rsc=` requests) — no HTML, just the serialized server component tree.

---

<a name="runtimes"></a>
## 2. Runtimes: Node.js vs Edge

Next.js server code runs in one of two runtimes, chosen per route:

```ts
export const runtime = 'nodejs'; // default
// or
export const runtime = 'edge';
```

| | Node.js runtime | Edge runtime |
|---|---|---|
| APIs | Full Node.js (fs, net, crypto, streams, native addons) | Web-standard subset (fetch, Request/Response, WebCrypto, TextEncoder) |
| Cold start | Slower (bigger runtime) | Very fast (V8 isolates, no container boot) |
| Location | One region (usually) | Replicated globally, runs near the user |
| Limits | Larger memory/CPU, long execution | Small bundle limits, short CPU time |
| Can use | Prisma (with adapter caveats), mongoose, bcrypt, sharp | Only WebCrypto, fetch-based DB drivers (Neon serverless, PlanetScale HTTP, Upstash) |
| Typical use | DB-heavy APIs, file processing, anything with npm-native deps | Auth checks, geolocation, rewrites, lightweight personalization |

**Rules of thumb:**
- Middleware always runs on the Edge runtime (or a locked-down Node subset in newer versions) — no direct TCP database connections from middleware. Verify sessions there with **stateless checks** (JWT signature via `jose`, which is WebCrypto-based) — not `jsonwebtoken`, which needs Node crypto.
- Putting an edge function in front of a single-region database is a **latency trap**: the function runs in Tokyo, the DB is in Virginia, and every query pays the full round trip. Edge only wins when the work is DB-free or the data layer is also globally distributed.

---

<a name="route-handlers"></a>
## 3. Route Handlers In Depth

`app/**/route.ts` files export functions named after HTTP methods. They use **Web-standard `Request`/`Response`** (via `NextRequest`/`NextResponse` extensions), unlike the old Pages Router `(req, res)` Node-style API.

```ts
// app/api/posts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // params is a Promise in Next 15+
) {
  const { id } = await params;

  // Query params
  const includeAuthor = req.nextUrl.searchParams.get('include') === 'author';

  const post = await db.post.findUnique({
    where: { id },
    include: { author: includeAuthor },
  });

  if (!post) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(post, {
    headers: { 'Cache-Control': 'private, max-age=0' },
  });
}
```

### Reading the body — once

The body is a **stream**: you can read it exactly once. `await req.json()`, `req.formData()`, `req.text()`, `req.arrayBuffer()` all consume it. If you need it twice, `req.clone()` first.

```ts
export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const body = await req.json();
  } else if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    const file = form.get('file') as File; // Web File API, not a Node stream
  }
}
```

### Static vs dynamic route handlers

A `GET` handler **with no dynamic API usage** can be prerendered at build time and cached like a static page (Next 14: cached by default; **Next 15: uncached by default** — a major version-behavior change interviewers love).

A handler becomes dynamic when it uses: `req.headers` / `cookies()` / `headers()`, `searchParams`, non-GET methods, or `export const dynamic = 'force-dynamic'`.

```ts
export const dynamic = 'force-static';   // opt in to caching
export const revalidate = 60;            // ISR for an API response
```

### Cookies and headers

```ts
import { cookies, headers } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();       // async in Next 15
  const session = cookieStore.get('session')?.value;

  const headerList = await headers();
  const ua = headerList.get('user-agent');
  // Setting cookies: do it on the response, or via cookies().set() in
  // Server Actions / Route Handlers (NOT in Server Components — they render
  // after headers may already be streaming).
}
```

**Why can't Server Components set cookies?** By the time a Server Component renders, the response may already be streaming — headers are sent. Cookies can only be set where the response hasn't started: route handlers, server actions, middleware.

### Streaming responses

```ts
export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of generateChunks()) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' }, // SSE for LLM-style streaming
  });
}
```

This is the standard pattern for **LLM token streaming** and server-sent events. Note: SSE keeps a function invocation alive — on serverless this counts against execution-time limits.

### Route handlers vs Server Actions — when to use which

| Use a Route Handler when... | Use a Server Action when... |
|---|---|
| External clients call it (mobile app, webhook, third party) | Only your own React UI mutates data |
| You need GET / custom methods / custom status codes & headers | It's a form submit or button-triggered mutation |
| You need SSE/streaming byte responses | You want progressive enhancement (works without JS) |
| Webhooks (Stripe, GitHub) — they POST raw bodies with signatures | You want automatic integration with `revalidatePath`/`useFormStatus` |

---

<a name="server-actions"></a>
## 4. Server Actions Internals

Server Actions are **not magic RPC** — knowing the mechanics is a differentiator.

### What actually happens

1. `'use server'` marks a function. At build time the bundler replaces the client's copy with a **reference ID** (a hash of module path + export name).
2. When invoked, the browser sends a **POST to the current page URL** with a `Next-Action: <id>` header and serialized arguments (multipart form data or a JSON-ish RSC serialization).
3. The server looks up the function by ID, deserializes args, runs it, then **renders the updated RSC payload for the current route in the same response** — that's why `revalidatePath` in an action updates the UI without a separate refetch.

```ts
// app/actions.ts
'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const CreatePost = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
});

export async function createPost(prevState: unknown, formData: FormData) {
  // 1. AUTH — every action is a public HTTP endpoint. Always check.
  const session = await verifySession();
  if (!session) return { error: 'Unauthorized' };

  // 2. VALIDATE — never trust FormData
  const parsed = CreatePost.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  // 3. MUTATE
  const post = await db.post.create({
    data: { ...parsed.data, authorId: session.userId },
  });

  // 4. INVALIDATE + NAVIGATE
  revalidatePath('/posts');
  redirect(`/posts/${post.id}`); // throws — must be after everything else
}
```

```tsx
// Client side
'use client';
import { useActionState } from 'react';
import { createPost } from './actions';

export function PostForm() {
  const [state, formAction, isPending] = useActionState(createPost, null);
  return (
    <form action={formAction}>
      <input name="title" />
      <textarea name="content" />
      {state?.error && <p role="alert">{JSON.stringify(state.error)}</p>}
      <button disabled={isPending}>{isPending ? 'Saving…' : 'Save'}</button>
    </form>
  );
}
```

### Security model — the part people get wrong

- **Every exported server action is a reachable HTTP endpoint.** Anyone can POST to it with a crafted `Next-Action` header. `'use server'` does **not** mean "only my UI can call this." Authorize inside every action.
- Action IDs are hashed and (in recent versions) rotated per build ("dead code elimination" removes unused ones), but that's obscurity, not security.
- Next.js checks `Origin` vs `Host` headers for actions (CSRF mitigation), but you still need auth.
- Closures over server data in inline actions are encrypted and sent to the client — avoid closing over secrets anyway.

### Serialization limits

Arguments and return values must be serializable by React's RSC serializer: primitives, plain objects/arrays, `Date`, `Map`, `Set`, `FormData`, `File`, promises. **Not**: class instances, functions, Prisma model instances with methods. Return plain DTOs.

### Execution semantics

- Actions run **sequentially per client** — Next.js queues them; a slow action blocks subsequent ones from the same page. Don't put long work in actions.
- `redirect()` and `notFound()` work by **throwing** special errors — never wrap them in `try/catch` (or rethrow if you must catch).

---

<a name="caching-layers"></a>
## 5. The Four Caching Layers

The single most asked App Router backend topic. There are **four distinct caches**:

| Cache | Where | What it stores | Duration | Invalidation |
|---|---|---|---|---|
| **Request Memoization** | Server, per-request | Return values of identical `fetch(url, opts)` calls (and `React.cache()` fns) | One render pass | Automatic — dies with the request |
| **Data Cache** | Server, persistent | Individual `fetch` responses / `unstable_cache` results | Until revalidated | `revalidate: n`, `revalidateTag`, `revalidatePath` |
| **Full Route Cache** | Server, persistent | Rendered HTML + RSC payload of static routes | Until data cache invalidated / redeploy | `revalidatePath`, rebuild |
| **Router Cache** | **Browser memory** | RSC payloads of visited/prefetched routes | Session; ~30s dynamic / 5min static (v14); mostly off in v15 | `router.refresh()`, `revalidatePath` from an action, hard reload |

### Request memoization — solves prop drilling for data

```ts
import { cache } from 'react';

// Called from layout AND page AND a nested component → runs ONCE per request
export const getCurrentUser = cache(async () => {
  const session = await verifySession();
  return session ? db.user.findUnique({ where: { id: session.userId } }) : null;
});
```

`fetch` is memoized automatically; wrap **database calls** in `React.cache()` to get the same behavior. This is why "fetch where you need the data, not at the top" is viable in RSC.

### Data cache with tags — the production pattern

```ts
// Read: tag the data
const posts = await fetch('https://api.example.com/posts', {
  next: { tags: ['posts'], revalidate: 3600 }, // time-based fallback + tag
}).then(r => r.json());

// For direct DB calls, use unstable_cache (or 'use cache' in Next 15+):
import { unstable_cache } from 'next/cache';
const getPosts = unstable_cache(
  () => db.post.findMany(),
  ['posts-list'],            // cache key parts
  { tags: ['posts'], revalidate: 3600 }
);

// Write: invalidate the tag
'use server';
export async function createPost(data: FormData) {
  await db.post.create({ /* ... */ });
  revalidateTag('posts'); // purges data cache → route cache re-renders on next hit
}
```

`revalidateTag`/`revalidatePath` are **on-demand invalidation** — they mark entries stale; the next request re-renders (and in `revalidatePath`'s case also purges the full route cache and, when called in a server action, the client router cache).

### Next 15 default change

Next 14: `fetch` cached by default (`force-cache`) — surprised everyone with stale data.
Next 15: `fetch` **uncached by default** (`no-store` semantics); GET route handlers and the client router cache also uncached by default. You now opt **in** to caching. Know both — companies run both.

### What makes a route dynamic (opts out of Full Route Cache)

`cookies()`, `headers()`, `searchParams` accessed in a page, `noStore()`, `fetch(..., { cache: 'no-store' })`, `export const dynamic = 'force-dynamic'`. One dynamic API in one component makes the **whole route** dynamic — unless you isolate it behind Suspense with **Partial Prerendering (PPR)**, which serves a static shell and streams the dynamic holes.

---

<a name="middleware"></a>
## 6. Middleware In Depth

One `middleware.ts` at the project root; runs before every matched request.

```ts
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose'; // WebCrypto-based — works on Edge

const PUBLIC = ['/login', '/register', '/api/auth'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next();

  const token = req.cookies.get('session')?.value;
  if (!token) {
    const url = new URL('/login', req.url);
    url.searchParams.set('from', pathname); // return-to after login
    return NextResponse.redirect(url);
  }

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.SESSION_SECRET)
    );
    // Pass user info downstream via request headers
    const headers = new Headers(req.headers);
    headers.set('x-user-id', String(payload.sub));
    return NextResponse.next({ request: { headers } });
  } catch {
    const res = NextResponse.redirect(new URL('/login', req.url));
    res.cookies.delete('session');
    return res;
  }
}

export const config = {
  // Skip static assets — middleware on every image request is wasted latency
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|css|js)$).*)'],
};
```

### What middleware is and isn't for

✅ Good: optimistic auth redirect (cheap JWT signature check), locale/geo routing, A/B test bucketing via cookie, security headers, rewrites (multi-tenant `tenant.app.com` → `/tenants/[slug]`), basic rate limiting with Upstash Redis.

❌ Bad: database queries (edge runtime + latency), heavy computation, **being your only auth check**. Middleware auth is *optimistic* — a UX optimization. The authoritative check lives in the data layer (the function that actually reads/writes data), because middleware can be bypassed (and CVE-2025-29927 demonstrated exactly this: a crafted `x-middleware-subrequest` header let attackers skip middleware entirely on unpatched versions). **Defense in depth: middleware redirects, the DAL authorizes.**

### Rewrite vs Redirect

- `redirect` → 307/308, browser sees the new URL.
- `rewrite` → URL stays the same, server serves different content. Basis for multi-tenancy, A/B tests, and proxying.

---

<a name="database"></a>
## 7. Database Integration Patterns

### The serverless connection problem

Traditional pools assume a long-lived server. Serverless = **many short-lived instances**, each opening its own connections → Postgres `max_connections` exhaustion under load.

Solutions, in order of preference:
1. **External pooler**: PgBouncer / Supabase pooler / Neon pooler / Prisma Accelerate — functions connect to the pooler, pooler holds few real connections.
2. **HTTP/WebSocket drivers**: Neon serverless driver, PlanetScale HTTP — no TCP connection state at all; also edge-compatible.
3. **Singleton per instance** (mandatory regardless):

```ts
// lib/db.ts — the canonical Prisma singleton
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

// In dev, Next.js hot-reload re-executes modules → without this you leak
// a new PrismaClient (and pool) on every save.
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
```

### The Data Access Layer (DAL) pattern

Centralize data access + authorization so no page/action can forget a check:

```ts
// lib/dal.ts
import 'server-only'; // build error if a client component imports this
import { cache } from 'react';
import { cookies } from 'next/headers';

export const verifySession = cache(async () => {
  const token = (await cookies()).get('session')?.value;
  const payload = await decrypt(token);      // verify JWT
  if (!payload?.userId) return null;
  return { userId: payload.userId as string };
});

export const getOwnedProject = cache(async (projectId: string) => {
  const session = await verifySession();
  if (!session) throw new UnauthorizedError();
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (project?.ownerId !== session.userId) throw new ForbiddenError();
  return project; // return a DTO — don't leak fields like passwordHash
});
```

Two load-bearing details:
- **`import 'server-only'`** makes it a *build-time error* to import this module from client code — the guarantee that secrets/queries never reach the bundle.
- **`cache()`** dedupes the session check across layout + page + components in one request.

### Transactions in server actions

```ts
'use server';
export async function transferFunds(formData: FormData) {
  const session = await verifySession();
  // ... validate amounts ...
  await db.$transaction(async (tx) => {
    const from = await tx.account.update({
      where: { id: fromId, ownerId: session.userId },
      data: { balance: { decrement: amount } },
    });
    if (from.balance < 0) throw new Error('Insufficient funds'); // rolls back
    await tx.account.update({ where: { id: toId }, data: { balance: { increment: amount } } });
  });
  revalidatePath('/accounts');
}
```

### N+1 in RSC

Server components fetching per-item data (`<PostCard>` each querying its author) recreate the N+1 problem server-side. Fixes: fetch with joins/`include` at the list level, or use a per-request DataLoader wrapped in `React.cache()`.

---

<a name="streaming"></a>
## 8. Streaming, Suspense & the RSC Payload

### What the RSC payload is

A compact serialized format (you can see it in `?_rsc=` responses or `self.__next_f.push(...)` script chunks in the HTML): the rendered server tree as JSON-ish rows — elements, text, **references to client component chunks** (`"$L1"` → chunk import), and placeholders for pending promises. The client React runtime reconstructs the tree from it. On navigation, only this payload is fetched — not HTML.

### Streaming SSR flow

```tsx
export default function Page() {
  return (
    <>
      <Header />                              {/* in the first flush */}
      <Suspense fallback={<StatsSkeleton />}> {/* fallback in first flush */}
        <SlowStats />                         {/* streams later */}
      </Suspense>
    </>
  );
}

async function SlowStats() {
  const stats = await getExpensiveStats();   // 2s
  return <StatsGrid data={stats} />;
}
```

1. Server flushes the shell immediately: header + skeleton. **TTFB is not blocked by the slow query.**
2. When `getExpensiveStats` resolves, the server streams an extra HTML chunk plus a tiny inline script that swaps it into the fallback's slot — before hydration even runs.
3. `loading.tsx` is literally an automatic `<Suspense>` wrapping the page segment.

### Parallel vs sequential data fetching

```tsx
// ❌ Waterfall — 3 round trips in series
const user = await getUser(id);
const posts = await getPosts(id);
const followers = await getFollowers(id);

// ✅ Parallel
const [user, posts, followers] = await Promise.all([
  getUser(id), getPosts(id), getFollowers(id),
]);

// ✅ Or: don't await — pass the promise down, unwrap with `use()` under Suspense
const postsPromise = getPosts(id);           // starts now, no await
return <Suspense fallback={<Sk/>}><Posts promise={postsPromise} /></Suspense>;
```

Sibling `async` server components under separate Suspense boundaries fetch **in parallel** automatically — nesting them creates waterfalls.

---

<a name="background-jobs"></a>
## 9. Background Jobs, Queues & Long-Running Work

Serverless functions die after the response (or hit execution limits). Patterns:

- **`after()`** (`next/server`): run work after the response is sent — logging, analytics, cache warming. Still bounded by function lifetime.
  ```ts
  import { after } from 'next/server';
  export async function POST(req: NextRequest) {
    const order = await createOrder(await req.json());
    after(() => sendConfirmationEmail(order));  // doesn't delay the response
    return NextResponse.json(order, { status: 201 });
  }
  ```
- **Queues**: enqueue from the action/handler, process elsewhere — Inngest, Trigger.dev, QStash (HTTP-callback queue that POSTs back to a route handler), BullMQ + a separate worker process (needs a long-lived Node host, not serverless).
- **Cron**: Vercel Cron / platform scheduler hitting a route handler; protect it by checking a secret header (`Authorization: Bearer ${CRON_SECRET}`).
- **Webhooks** (Stripe et al.): route handler, **verify the signature against the raw body** — `await req.text()` and verify *before* parsing; re-serialized JSON breaks signatures. Return 200 fast, enqueue heavy processing.

---

<a name="error-handling"></a>
## 10. Error Handling & Validation on the Server

### Expected vs unexpected errors

- **Expected** (validation failure, not found, forbidden): model as **return values** from actions (`{ error }` via `useActionState`) — not thrown exceptions.
- **Unexpected**: let them throw → nearest `error.tsx` boundary renders. In production, Next.js **strips server error messages** (sends a generic message + digest) so secrets don't leak; log the digest server-side to correlate.

```tsx
// app/dashboard/error.tsx — must be a client component
'use client';
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div>
      <p>Something went wrong. (ref: {error.digest})</p>
      <button onClick={() => reset()}>Retry</button>
    </div>
  );
}
```

### A consistent API error shape for route handlers

```ts
export function apiHandler(fn: (req: NextRequest, ctx: any) => Promise<Response>) {
  return async (req: NextRequest, ctx: any) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof z.ZodError)
        return NextResponse.json({ error: 'Validation failed', details: e.flatten() }, { status: 400 });
      if (e instanceof UnauthorizedError)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      console.error(e); // → observability pipeline
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}
```

### Validation rule

Validate **at every trust boundary**: route handler bodies, server action FormData, webhook payloads, even `searchParams`. Zod (or Valibot) schemas shared between client (form UX) and server (authority) — the server check is the real one.
