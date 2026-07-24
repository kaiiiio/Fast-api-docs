# Hydration & Rendering Internals

What actually happens between "HTML arrives" and "page is interactive" — hydration mechanics, mismatch errors, selective hydration, RSC vs SSR, and the rendering pipeline end to end. This is where senior Next.js interviews separate candidates.

## Table of Contents
1. [The Full Rendering Pipeline](#pipeline)
2. [What Hydration Actually Is](#what-is-hydration)
3. [Hydration Mismatches — Causes & Fixes](#mismatches)
4. [Selective & Progressive Hydration](#selective)
5. [RSC vs SSR — They Are Not the Same Thing](#rsc-vs-ssr)
6. [Server/Client Component Boundaries & Serialization](#boundaries)
7. [Performance: Reducing Hydration Cost](#performance)
8. [Interview Q&A](#qna)

---

<a name="pipeline"></a>
## 1. The Full Rendering Pipeline

For one document request to an App Router page:

```
SERVER
1. React renders Server Components → produces the RSC payload
   (client components are NOT executed here as components — they appear
    as references: "load chunk X, render with these serialized props")
2. React SSR pass renders Client Components' initial HTML too
   (client components DO run once on the server to produce HTML — this
    is classic SSR, and why they must not touch `window` at module/render scope)
3. HTML streams to the browser, with the RSC payload embedded in
   <script>self.__next_f.push(...)</script> chunks

BROWSER
4. Browser parses HTML → user SEES the page (First Contentful Paint)
   — but clicks do nothing yet
5. JS bundles for client components download & execute
6. HYDRATION: React reconstructs the tree from the RSC payload, walks the
   existing DOM, attaches event listeners and builds fiber state — it does
   NOT recreate the DOM, it ADOPTS it
7. Page is interactive (Time To Interactive)
```

Two renders of client components happen by design: once on the server (HTML) and once in the browser (hydration). **Their output must match.**

On **client-side navigation** (`<Link>`): no HTML at all — the router fetches the RSC payload for the new route, React reconciles it into the existing tree, and only *new* client-component chunks are downloaded. This is why navigations don't lose client state in shared layouts.

---

<a name="what-is-hydration"></a>
## 2. What Hydration Actually Is

**Definition to give in an interview:** Hydration is the process where React, on the client, renders the component tree in memory and *attaches* to the server-rendered DOM instead of replacing it — wiring up event handlers, refs, and internal fiber state so the static HTML becomes an interactive React app.

Key mechanics:

- React calls `hydrateRoot(container, <App/>)` (Next does this for you). It renders each client component and **compares** the result to the existing DOM nodes.
- Event handling in React is **delegated**: listeners attach at the root container, not per-node — so "attaching handlers" is cheap; the expensive part is *executing all the component functions* to rebuild the tree.
- `useEffect`/`useLayoutEffect` run **only after hydration** — never on the server. That's the foundation of every mismatch fix.
- Until a subtree hydrates, its buttons/inputs are inert (React 18 replays some discrete events that occur during hydration on the boundary that received them — part of selective hydration).

**The uncanny valley:** the window between paint and interactivity where the page *looks* ready but ignores input. Large JS bundles widen it. This is why "just SSR it" doesn't automatically make an app fast — you pay for the HTML *and then again* for hydration.

---

<a name="mismatches"></a>
## 3. Hydration Mismatches — Causes & Fixes

The error: *"Hydration failed because the server rendered HTML didn't match the client."* React 18+ **discards the server HTML for that subtree and re-renders it from scratch on the client** — you lose the SSR benefit and get a console error (and in concurrent features, worse behavior).

### Cause 1 — Non-deterministic values

```tsx
// ❌ Server renders one value, client another
<span>{new Date().toLocaleTimeString()}</span>
<span>{Math.random()}</span>
```

**Fix:** compute after mount:

```tsx
'use client';
function Clock() {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => { setTime(new Date().toLocaleTimeString()); }, []);
  return <span>{time ?? '—'}</span>; // server & first client render agree: '—'
}
```

(Also: locale/timezone formatting differs between server and user machines even for the *same* Date — pass a fixed locale + timezone, or format after mount.)

### Cause 2 — Browser-only state during render

```tsx
// ❌ typeof window checks that change RENDER OUTPUT
return typeof window !== 'undefined' ? <Widget w={window.innerWidth}/> : null;

// ❌ localStorage-driven initial state
const [theme] = useState(() => localStorage.getItem('theme')); // throws on server / mismatches
```

**Fixes:** the `mounted` flag pattern, or `useSyncExternalStore` with a server snapshot:

```tsx
const isOnline = useSyncExternalStore(
  subscribe,
  () => navigator.onLine,  // client snapshot
  () => true               // server snapshot — what SSR renders
);
```

For theme specifically (the classic dark-mode flash + mismatch problem): a **blocking inline script in `<head>`** sets the class on `<html>` before paint, and React reads `data-theme`/class via `suppressHydrationWarning` on the html element — this is exactly what `next-themes` does.

### Cause 3 — Invalid HTML nesting

```tsx
// ❌ <p> cannot contain <div>; browser "fixes" the parse → DOM ≠ React's tree
<p><div>hello</div></p>
// ❌ <a> inside <a>, <button> inside <button>, <tr> not in <tbody>…
```

The server sends technically-invalid HTML, the **browser's parser restructures it**, then hydration compares against the mutated DOM. Fix the nesting.

### Cause 4 — Browser extensions

Extensions (Grammarly, password managers, translators) inject attributes/nodes before hydration. You can't fix users' extensions; for known-noisy attribute targets use `suppressHydrationWarning` sparingly (it's one level deep, doesn't fix logic, only silences text/attribute mismatch warnings).

### Cause 5 — Server/client environment drift

Different data between the SSR pass and client (e.g., reading cookies to render "logged in" HTML but client-side code deciding from localStorage). Keep the source of truth identical for the first render.

### Escape hatch — skip SSR for a component

```tsx
import dynamic from 'next/dynamic';
const Chart = dynamic(() => import('./Chart'), { ssr: false, loading: () => <Skeleton/> });
// In App Router, `ssr: false` is only allowed inside Client Components.
```

Use for components that fundamentally can't render on the server (canvas/WebGL, map libraries, things reading window at import time). Cost: no SEO/first-paint for that widget.

---

<a name="selective"></a>
## 4. Selective & Progressive Hydration

React 18 + Suspense changed hydration from monolithic to incremental:

- **Streaming SSR:** Suspense boundaries let HTML flush in pieces (shell first, slow parts later).
- **Selective hydration:** React hydrates Suspense boundaries **independently and out of order**. If the user clicks inside a not-yet-hydrated boundary, React **prioritizes hydrating that boundary first** and replays the event. Hydration is also time-sliced — it yields to input instead of blocking the main thread in one long task.

Practical consequence: wrapping heavy, below-the-fold client components in `<Suspense>` doesn't just improve streaming — it lets the header become interactive before the giant data grid hydrates.

```tsx
<Header />                                {/* hydrates early */}
<Suspense fallback={<GridSkeleton />}>
  <HeavyInteractiveGrid />                {/* hydrates when ready / when clicked */}
</Suspense>
```

**RSC is the other lever:** Server Components ship **zero hydration cost** — no JS, nothing to hydrate. The less of the tree that's client, the less there is to hydrate at all.

---

<a name="rsc-vs-ssr"></a>
## 5. RSC vs SSR — They Are Not the Same Thing

The highest-signal distinction in modern Next.js interviews:

| | SSR (of client components) | React Server Components |
|---|---|---|
| What it produces | HTML string for first paint | RSC payload (serialized tree) |
| Does its JS ship to the browser? | **Yes** — needed for hydration | **No** — code stays on the server |
| Hydrates? | Yes | No (nothing to hydrate) |
| Re-runs on client? | Every client render | Never; re-runs on the **server** on navigation/refresh |
| Can use | hooks, effects, browser APIs (post-hydration) | async/await, DB, fs, secrets |
| When it runs | Per document request (+ every client render) | Per request, or at build time (static) |

They compose: a page is RSC-rendered on the server; the client components *inside* it are additionally SSR'd to HTML for first paint, then hydrated. **SSR solves first paint & SEO; RSC solves bundle size and server data access.** `'use client'` does not mean "renders only in the browser" — client components still SSR.

---

<a name="boundaries"></a>
## 6. Server/Client Component Boundaries & Serialization

- `'use client'` marks a **module-graph boundary**, not a single component: everything that module imports becomes client code. You don't mark every client component — only entry points into client land.
- **Props crossing the boundary must be RSC-serializable**: primitives, plain objects/arrays, Date, Map/Set, JSX (!), promises (unwrap with `use()`), server action references. **Not** functions (except actions), class instances, symbols.
- A server component **cannot be imported by** a client component — but it can be **passed into one as `children`/props** (the "donut" / slot pattern):

```tsx
'use client';
export function Collapsible({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <>
    <button onClick={() => setOpen(!open)}>toggle</button>
    {open && children}   {/* children can be a SERVER component — already rendered */}
  </>;
}

// server component:
<Collapsible><ServerRenderedComments /></Collapsible>
```

This works because the server component was already rendered to payload *before* being handed to the client component as a slot — interactivity wraps server content without converting it.

- **Context providers** (theme, query client) are client components; put them in a `providers.tsx` and wrap `{children}` in the root layout — the pages inside remain server components via the slot pattern.
- Secrets: server-only env vars are safe in server components; anything needing browser exposure must be `NEXT_PUBLIC_`. Enforce with `import 'server-only'`.

---

<a name="performance"></a>
## 7. Performance: Reducing Hydration Cost

Hydration cost ≈ amount of client-component JS × tree size. Levers:

1. **Push `'use client'` to the leaves.** Don't mark a page client because one button needs `onClick` — extract the button.
   ```tsx
   // ❌ whole ProductPage is client for one handler
   // ✅ <ProductInfo/> (server) + <AddToCartButton productId={id}/> (client leaf)
   ```
2. **Server components for static-ish content** — markdown, product descriptions, headers/footers: zero bundle contribution.
3. **`next/dynamic` code-splitting** for modals, editors, charts — load on interaction, not with the page.
4. **Suspense boundaries** around heavy client islands → selective hydration prioritizes what the user touches.
5. **Measure:** INP/TBT in Lighthouse; long tasks during load in the Performance panel are usually hydration; `@next/bundle-analyzer` for what's actually in the client bundle.
6. **Third-party scripts** via `next/script` with `strategy="lazyOnload"`/`afterInteractive` so they don't compete with hydration.

---

<a name="qna"></a>
## 8. Interview Q&A

**Q: Walk me through what happens from typing a URL to the page being interactive in Next.js App Router.**
DNS/TLS → CDN (full route cache hit? serve) → middleware → server renders RSC tree, SSRs client components to HTML → HTML streams (shell first, Suspense chunks later) with embedded RSC payload → browser paints → client bundles load → React hydrates (adopts DOM, attaches delegated listeners, per Suspense boundary, prioritized by interaction) → interactive.

**Q: Why does React need the client render to match the server HTML?**
Hydration adopts existing DOM nodes instead of creating them; matching is what makes that adoption valid. On mismatch React falls back to client re-render of the subtree — you paid for SSR and threw it away.

**Q: Is `'use client'` rendered only in the browser?**
No — client components are SSR'd to HTML on the server for first paint, then hydrated. Only effects and event handlers are browser-only. `ssr: false` via `next/dynamic` is the actual opt-out.

**Q: If server components don't hydrate, how do their `<Link>`s and interactivity work?**
Interactivity in a server tree comes from client components embedded in it (`<Link>` is a client component). The server component's own output is inert HTML — that's the point.

**Q: How would you fix a hydration error showing a wrong timestamp?**
Identify the non-deterministic render input (Date/locale). Render a stable placeholder on server + first client render, set the real value in `useEffect`; or format with an explicit fixed timezone/locale so both environments agree.

**Q: SSR vs SSG vs ISR vs CSR — where does hydration fit?**
All of SSR/SSG/ISR produce HTML that must hydrate; they differ only in *when* the HTML is generated (request time / build time / build+revalidate). CSR has no server HTML — the "hydration" is just a normal client render. Hydration cost is identical across SSR/SSG/ISR for the same tree.
