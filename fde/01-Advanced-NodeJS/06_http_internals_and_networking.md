# HTTP Internals and Networking - Senior Interview Deep Dive

The HTTP module is where Node earns its living, and it's where the most expensive production incidents hide: the intermittent 502 that only appears behind a load balancer, the connection pool that silently caps your throughput at 5 concurrent upstream calls, the DNS resolution that adds 5 seconds because someone left `family: 0`. This file covers the `http` module internals, keep-alive and Agent pooling, the timeout trio and the classic ALB/ELB 502 race, HTTP/2 in Node, TLS (session resumption, SNI), DNS resolution pitfalls, the undici-vs-axios-vs-node-fetch question, streaming responses and SSE, and building a minimal reverse proxy in raw Node.

---

### Q1. What actually happens inside `http.createServer` when a request arrives? Walk the object lifecycle.

**Answer:**
`http.createServer(handler)` returns an `http.Server`, which is a subclass of `net.Server` — a TCP server. HTTP is layered on top of raw TCP sockets:

1. **TCP accept** — libuv's event loop accepts a connection on the listening socket (via `epoll`/`kqueue`/IOCP); a `net.Socket` (a Duplex stream) is created for the connection.
2. **Parser attached** — Node attaches an **HTTP parser** (`llhttp`, a C parser compiled to native code; it replaced the older `http_parser` for speed and correctness) to the socket. As TCP bytes arrive, they're fed to the parser incrementally.
3. **Message assembly** — when the parser finishes the request line + headers, Node constructs an `http.IncomingMessage` (the `req`, a **Readable** stream — its body is the socket's remaining bytes) and an `http.ServerResponse` (the `res`, a **Writable** stream).
4. **`'request'` event** — your handler `(req, res) => {}` fires with those two objects. The body has *not* been read yet; you must consume `req` (`for await`, `.pipe`, `'data'`) to get it.
5. **Response written** — `res.writeHead()`/`res.write()`/`res.end()` serialize status + headers + body back onto the socket. `res.end()` signals the message is complete.
6. **Keep-alive or close** — if the connection is keep-alive (HTTP/1.1 default), the socket stays open and the parser resets for the next request on the same socket. Otherwise the socket closes.

Key mechanics seniors are expected to know:
- `req` and `res` are **streams**, so all the backpressure rules apply. `res.write()` returning `false` means the kernel send buffer is full — respect it or you buffer unbounded in memory.
- The parser is a **state machine over a byte stream**; a request can arrive across many TCP segments, and a single TCP segment can contain multiple pipelined requests. You never see raw framing — llhttp handles it.
- Headers have limits: `--max-http-header-size` (default 16 KB) caps total header size; exceeding it yields a 431. This exists to prevent header-based memory DoS.

**Interview trap:** "Is `res` finished when my handler returns?" No. The handler returning does nothing; the response is finished when you call `res.end()`. Forgetting `res.end()` (e.g., on an error branch) leaves the client hanging until a timeout fires — a classic source of "requests randomly stall."

---

### Q2. What is HTTP keep-alive and why does it matter so much for performance?

**Answer:**
Keep-alive (persistent connections) reuses a single TCP connection for multiple HTTP requests instead of opening a new connection per request. In HTTP/1.1 it's the **default** (connections persist unless `Connection: close` is sent).

Why it matters enormously, especially for *outbound* calls:
- **TCP handshake cost** — every new connection is a 3-way handshake (1 RTT) before you can send anything. Over a 50 ms-RTT link that's 50 ms of pure latency per request.
- **TLS handshake cost** — HTTPS adds a TLS handshake (1–2 more RTTs) on top. A fresh HTTPS connection can cost 3 RTTs (150 ms at 50 ms RTT) before your first byte.
- **Slow start** — a fresh TCP connection begins with a small congestion window and ramps up; reusing a warmed connection skips that.
- **Ephemeral port / socket exhaustion** — churning connections burns local ports and leaves sockets in `TIME_WAIT`, eventually exhausting the ~28k ephemeral port range and causing `EADDRNOTAVAIL`/`connect ECONNREFUSED` under load.

For a service making many calls to the same upstream (a database proxy, an internal API, a third-party gateway), keep-alive is often the single biggest latency and throughput win available — it amortizes handshakes across thousands of requests.

**Interview trap:** "Node's default `http` client uses keep-alive, right?" Historically **no** — the default global `http.Agent` had `keepAlive: false`, so every `http.request` opened a fresh connection and closed it after the response. This surprises people whose "fast" service is secretly doing a TCP+TLS handshake on every upstream call. `fetch`/undici and explicitly-configured Agents use keep-alive; the legacy default did not. Always configure an Agent with `keepAlive: true` for outbound traffic.

---

### Q3. Explain the `http.Agent`, connection pooling, and the `maxSockets` pitfall.

**Answer:**
An `http.Agent` manages a **pool of sockets** for outbound requests. It decides whether to reuse an idle keep-alive socket or open a new one, and it caps concurrency. Key options:

```js
const http = require('http');
const agent = new http.Agent({
  keepAlive: true,          // reuse sockets across requests
  keepAliveMsecs: 30_000,   // TCP keep-alive probe interval for idle sockets
  maxSockets: 50,           // max concurrent sockets PER HOST
  maxFreeSockets: 10,       // max idle sockets to keep pooled PER HOST
  maxTotalSockets: 500,     // max total sockets across all hosts (Node 14+)
  timeout: 60_000,          // socket inactivity timeout
});
http.request({ host: 'api.internal', agent }, cb);
```

The pool works per **origin** (host+port+protocol). When you make a request:
- If a free keep-alive socket for that origin exists → reuse it.
- Else if `< maxSockets` sockets are open for that origin → open a new one.
- Else → **queue the request** until a socket frees up.

**The `maxSockets` pitfall:** the default `maxSockets` on the global agent is `Infinity` (no per-host cap) — which can flood an upstream with unbounded concurrency during a spike. But the *opposite* is the more insidious bug: people set a low `maxSockets` (say 5) thinking it's a global limit, then wonder why their high-throughput service caps at 5 concurrent upstream calls and every request queues behind them. With `maxSockets: 5` and a 200 ms upstream, you top out at ~25 req/s to that host no matter how many CPUs you have — the requests aren't slow, they're *queued in the agent*. The symptom is high client-observed latency with a healthy, idle upstream.

**Production war story:** A service migrated to a shared `http.Agent` with `maxSockets: 10` (copied from a tutorial). Under load, p99 latency to a downstream jumped to 4 seconds while the downstream reported sub-50 ms response times and low CPU. The 4 seconds was *queue time inside the agent* — 10 sockets serving hundreds of concurrent requests. Raising `maxSockets` to a value matching the concurrency×latency product (Little's Law: sockets needed ≈ arrival_rate × upstream_latency) fixed it. The lesson: `maxSockets` is a *concurrency budget to that host*; size it from Little's Law, and monitor `agent.requests` (queued) vs `agent.sockets` (active).

---

### Q4. Explain the timeout trio: `headersTimeout`, `requestTimeout`, and `keepAliveTimeout`. What does each protect?

**Answer:**
Node's HTTP **server** has several timeouts, each guarding a different phase. Getting them right is critical for both resilience and the 502 race (Q5).

- **`server.keepAliveTimeout`** (default 5000 ms) — how long an **idle** keep-alive connection stays open waiting for the *next* request after a response completes. When it elapses, the server closes the socket. This is about reclaiming idle connections.
- **`server.headersTimeout`** (default 60000 ms, historically 40000) — the maximum time allowed to receive the **complete request headers** from the moment the connection is established / first byte. Defends against **Slowloris** attacks (a client that dribbles headers one byte at a time to tie up connections). If headers aren't fully received in time → the connection is destroyed.
- **`server.requestTimeout`** (default 300000 ms, was 0/disabled in older versions) — the maximum time to receive the **entire request** (headers *and* body). A slow or stalled body upload past this → 408/socket destroyed. This is the backstop against slow-body attacks and stuck uploads.
- **`server.timeout`** (`socket.setTimeout`) — inactivity timeout on the socket generally; historically the main knob, now largely superseded by the more specific ones above.

```js
const server = http.createServer(handler);
server.keepAliveTimeout = 65_000;   // must exceed the LB idle timeout (see Q5)
server.headersTimeout = 66_000;     // must be > keepAliveTimeout
server.requestTimeout = 30_000;     // cap total request receipt time
```

The ordering constraint that trips people up: **`headersTimeout` must be greater than `keepAliveTimeout`.** Historically `headersTimeout` was measured from connection establishment and could fire on an *idle keep-alive* connection before `keepAliveTimeout` did, causing spurious resets. Node reworked `headersTimeout` to start when the first byte of a new request arrives, but the safe rule remains: keep `headersTimeout` ≥ `keepAliveTimeout` + margin.

**Interview trap:** "These are the same as the *client* request timeout." No — these are **server-side** receive/idle timeouts. The client's `request.setTimeout` / `AbortSignal.timeout` is a separate concern (how long the *caller* waits for a response). Conflating server receive-timeouts with client response-timeouts leads to setting the wrong knob for the symptom.

---

### Q5. Explain the classic ALB/ELB 502 race. Why does `keepAliveTimeout` cause intermittent 502s, and how do you fix it?

**Answer:**
This is one of the most-asked production networking questions because it bites nearly everyone who runs Node behind AWS ALB/ELB (or nginx, or any keep-alive-reusing proxy).

**The setup:** A load balancer keeps persistent (keep-alive) connections to your Node server to avoid re-handshaking. The LB has an **idle timeout** (ALB default: **60 seconds**) — how long it keeps an idle upstream connection open. Node has its own **`keepAliveTimeout`** (default **5 seconds**) for the same connection.

**The race:** Suppose Node's `keepAliveTimeout` (5s) is *shorter* than the LB's idle timeout (60s). After a response, the connection goes idle. At 5 seconds, **Node closes the socket** (sends a FIN). But the LB still believes the connection is alive (its 60s timer hasn't fired). A new client request arrives, the LB **reuses that connection** and forwards the request onto the socket — at the exact moment (or just after) Node closed it. The LB gets a TCP RST / a half-closed socket, cannot deliver the request, and returns **HTTP 502 Bad Gateway** to the client. It's intermittent because it only happens when a request lands in the tiny window between Node's close and the LB noticing.

**The fix:** Make Node's `keepAliveTimeout` **strictly greater** than the LB's idle timeout, so the **LB always closes idle connections first** (it's in control, it won't reuse a connection it just closed). For an ALB with 60s idle:

```js
server.keepAliveTimeout = 65_000;  // > 60s LB idle timeout
server.headersTimeout   = 66_000;  // must exceed keepAliveTimeout
```

Now Node never proactively closes a connection the LB thinks is alive; the LB tears down idle connections on its schedule, cleanly, and no request is ever forwarded onto a Node-closed socket.

**Interview trap:** "Just retry the 502." Retrying masks it but (a) doubles latency on the unlucky requests, (b) is unsafe for non-idempotent requests (a POST that actually succeeded server-side gets retried), and (c) leaves the root cause — a timeout misconfiguration — in place. The correct fix is the ordering invariant: **downstream (Node) keep-alive timeout > upstream (LB) idle timeout > any intermediate.** Also ensure `headersTimeout > keepAliveTimeout` or you reintroduce spurious resets.

**Production war story:** A team saw ~0.05% of requests 502 with no error in Node logs (Node never saw the request — the LB rejected it). Weeks were lost blaming the app. The fix was two lines raising `keepAliveTimeout` from the 5s default to 65s. The tell that it's this race and not an app bug: **the 502s appear only under keep-alive reuse (they vanish if you force `Connection: close`), and Node's own access logs have no corresponding entry.**

---

### Q6. How does Node support HTTP/2, and what changes about the mental model?

**Answer:**
Node has a dedicated `http2` module (separate from `http`). HTTP/2 fundamentally changes the wire protocol while keeping HTTP semantics:

```js
const http2 = require('http2');
const fs = require('fs');
const server = http2.createSecureServer({
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),
});
server.on('stream', (stream, headers) => {
  stream.respond({ ':status': 200, 'content-type': 'text/plain' });
  stream.end('hello over h2');
});
server.listen(8443);
```

What changes:
- **Binary framing + multiplexing.** One TCP connection carries many concurrent **streams** (independent request/response pairs) interleaved as frames. This eliminates HTTP/1.1 **head-of-line blocking at the application layer** — one slow response no longer blocks others on the same connection. The unit is now a `stream`, not a socket.
- **Header compression (HPACK).** Repeated headers (cookies, user-agent) are compressed against a dynamic table, cutting overhead dramatically for chatty APIs.
- **Server push** (now deprecated/removed in browsers, but the API existed).
- **Flow control** is per-stream and per-connection, built into the protocol.

Practical notes for Node:
- Browsers require **HTTP/2 over TLS** with **ALPN** negotiation (the client advertises `h2` during the TLS handshake). `http2.createSecureServer` handles ALPN.
- HTTP/2 does **not** eliminate transport-layer head-of-line blocking: because it's one TCP connection, a lost packet stalls *all* streams until retransmit (TCP delivers in order). That's the problem **HTTP/3 (QUIC over UDP)** solves — Node has experimental QUIC/HTTP-3 support.
- For **internal service-to-service** calls (gRPC runs on HTTP/2), multiplexing over a single connection is a big win vs opening dozens of HTTP/1.1 sockets.

**Interview trap:** "HTTP/2 removes head-of-line blocking." Only at the *application* layer. TCP-level HOL blocking remains because it's still one ordered TCP stream — a single dropped packet stalls every multiplexed stream. That residual is exactly why QUIC/HTTP-3 moved to UDP with independent streams. Stating this distinction is the senior signal.

---

### Q7. Explain TLS session resumption and why it matters for latency at scale.

**Answer:**
A full TLS 1.2 handshake is ~2 RTTs (TLS 1.3 cut it to 1 RTT); on top of the TCP handshake, a fresh HTTPS connection can cost 2–3 RTTs before the first application byte. **Session resumption** lets a client reconnect and skip the expensive asymmetric-crypto/full handshake by reusing previously negotiated secrets. Two mechanisms:

1. **Session IDs (server-side cache).** The server assigns a session ID and caches the session state; on reconnect the client presents the ID and both sides resume. Requires the server (or a shared cache across a cluster) to store state — problematic across many load-balanced instances unless the cache is shared.
2. **Session tickets (RFC 5077, stateless).** The server encrypts the session state into a **ticket** and hands it to the client; the client presents the ticket on reconnect, the server decrypts it (with a key only it knows) and resumes — no server-side per-session storage. This scales across a fleet **only if all instances share the same ticket-encryption key** (`ticketKeys`), otherwise instance B can't decrypt a ticket issued by instance A and you silently fall back to full handshakes.
3. **TLS 1.3 0-RTT** — resumption that lets the client send application data in the *first* flight (zero round trips), at the cost of replay-attack exposure for that early data (so only safe for idempotent requests).

In Node:

```js
const tls = require('tls');
const server = tls.createServer({ key, cert });
// For a cluster: share ticket keys so any instance can resume any session.
server.setTicketKeys(sharedTicketKeys); // 48-byte buffer, rotated periodically
```

Why it matters at scale: for a high-fanout service or a mobile client on a high-RTT link, saving 1–2 RTTs per connection is the difference between 50 ms and 150 ms time-to-first-byte. Combined with **keep-alive** (avoid reconnecting at all) and resumption (cheap reconnect when you must), you minimize handshake tax.

**Interview trap:** "Session tickets scale automatically across instances." No — only if instances **share ticket-encryption keys**. In a naive multi-instance deployment each process generates its own keys, so a client hitting instance A then instance B (round-robin LB) can't resume and pays full handshakes. The fix is centrally-distributed, periodically-rotated `ticketKeys`. This is a favorite gotcha.

---

### Q8. Explain SNI (Server Name Indication) and when it matters in Node.

**Answer:**
**SNI** is a TLS extension where the client includes the **hostname it's trying to reach in the ClientHello** (the very first, unencrypted handshake message), *before* the TLS session is established. It exists because one IP/port can host many TLS sites, and the server must pick the right certificate — but the certificate selection happens during the handshake, before any HTTP `Host` header is visible. SNI solves the chicken-and-egg by putting the hostname in the handshake.

In Node this matters in two directions:
- **As a server** hosting multiple domains on one listener: use `SNICallback` to return the correct cert per hostname.

```js
const server = tls.createServer({
  SNICallback: (servername, cb) => {
    const ctx = certContexts[servername]; // tls.createSecureContext per domain
    cb(null, ctx);
  },
});
```

- **As a client**: Node sets the SNI `servername` automatically from the request host, but if you connect to an IP while expecting a cert for a hostname (common with custom `lookup`, proxies, or connecting by IP for pinning), you must set `servername` explicitly or the server returns the wrong/default cert and verification fails:

```js
tls.connect({ host: '10.0.0.5', servername: 'api.internal', ... });
```

**Interview trap:** "TLS is fully encrypted, so the hostname is private." The SNI field is sent in **cleartext** in the ClientHello, so a network observer can see which host you're connecting to even over HTTPS. (Encrypted Client Hello / ECH is the emerging fix.) Also: mismatched or missing `servername` when connecting by IP is a frequent cause of `ERR_TLS_CERT_ALTNAME_INVALID` — the cert is valid, but for the hostname, not the IP you dialed.

---

### Q9. Explain DNS resolution in Node: `dns.lookup` vs `dns.resolve`, the threadpool issue, and caching.

**Answer:**
Node has **two fundamentally different** ways to resolve names, and confusing them causes real production incidents:

- **`dns.lookup(hostname)`** — calls the OS resolver via the blocking libc function `getaddrinfo`. Because `getaddrinfo` is **synchronous/blocking**, Node runs it on the **libuv threadpool** (default 4 threads). It respects `/etc/hosts`, `/etc/nsswitch.conf`, and OS-level config. **This is what `http.request`, `net.connect`, and most higher-level APIs use by default.**
- **`dns.resolve()` / `dns.resolve4()` etc.** — uses the bundled **c-ares** library to talk to DNS servers directly over the network, **asynchronously, without the threadpool**. It does *not* consult `/etc/hosts`.

**The threadpool issue (a classic senior war story):** because `dns.lookup` uses the 4-thread threadpool — the *same* pool as `fs.*`, `crypto.pbkdf2`, and `zlib` — a burst of outbound HTTP calls (each doing a `dns.lookup`) can **saturate the threadpool**, and now your file reads and password hashing stall behind DNS resolutions (and vice versa). If someone adds `crypto.pbkdf2` (each ~100 ms) and it eats all 4 threads, your outbound HTTP calls' DNS lookups queue behind them and *look like a network problem* when it's actually threadpool starvation. Mitigations: raise `UV_THREADPOOL_SIZE`, use **keep-alive** (resolve once, reuse the connection), cache DNS, or use `dns.resolve` (c-ares, off the pool).

**Caching:** Node does **not** cache DNS by default at the application level — every fresh `dns.lookup` hits the threadpool + OS resolver again (the OS may cache, but Node doesn't guarantee it). For high-fanout services, add a caching layer (`cacheable-lookup`, or undici's built-in caching) and honor TTLs. Keep-alive is the biggest lever: a reused connection does **zero** DNS lookups.

**Interview trap:** "`dns.lookup` is async, so it's non-blocking and cheap." It's async to *your code*, but it consumes a **threadpool thread** for the duration — it is exactly as capable of starving the threadpool as a big `fs.readFile`. "Async" here means "offloaded to a thread," not "free."

---

### Q10. What is the happy-eyeballs / `family: 0` issue in Node DNS?

**Answer:**
"Happy Eyeballs" (RFC 8305) is the algorithm for choosing between IPv6 and IPv4 when a host has both: try IPv6 and IPv4 roughly in parallel and use whichever connects first, so a broken/slow IPv6 path doesn't add seconds of delay.

The Node history: `dns.lookup` takes a `family` option — `4`, `6`, or `0` (both). For a long time, with `family: 0` (the effective default in many paths), Node would resolve **all** addresses and then try them **sequentially**, IPv6 first. On a network where IPv6 is advertised but **not actually routable** (extremely common in cloud/corporate networks and misconfigured containers), Node would attempt the IPv6 address, **wait for the connection to time out** (often several seconds), and only then fall back to IPv4. The symptom: outbound calls that mysteriously take ~5 seconds (a connect timeout) intermittently or on cold connections, with the upstream perfectly healthy over IPv4.

Fixes / evolution:
- **`autoSelectFamily`** (Node 18.13+, later default-on) implements Happy Eyeballs: Node races IPv4 and IPv6 connection attempts with a short head-start delay (`autoSelectFamilyAttemptTimeout`, ~250 ms) and uses the first to succeed — no more multi-second IPv6 stalls.
- **Explicitly set `family: 4`** if your environment has no working IPv6, to skip the problem entirely.
- **Ensure containers/hosts don't advertise unroutable IPv6.**

**Interview trap:** "DNS is slow" is the usual misdiagnosis. The 5-second stall is almost never *resolution* time — it's the **connect timeout on an unroutable IPv6 address** that `family: 0` sequential trials caused. The fix is Happy Eyeballs (`autoSelectFamily`) or forcing `family: 4`, not a faster DNS server. Recognizing that "consistent ~5s added latency on cold connections" smells like IPv6 fallback (not DNS, not the upstream) is the senior tell.

---

### Q11. undici vs axios vs node-fetch — why does undici win, and what makes it faster?

**Answer:**
`undici` is Node's modern from-scratch HTTP/1.1 client (it powers the global `fetch` in Node 18+). It consistently outperforms `axios`, `node-fetch`, and the legacy `http` client. Why:

| Aspect | Legacy `http`/`node-fetch`/`axios` | `undici` |
|---|---|---|
| Built on | `http` module + old `http.Agent` | Its own optimized HTTP/1.1 core over `net`/`tls` |
| Connection pooling | Agent pool, per-request overhead | Purpose-built `Pool`/`BalancedPool` with pipelining |
| Keep-alive default | Historically off (legacy) | On, aggressive reuse |
| Parser | `llhttp` via `http` | `llhttp` directly, fewer allocations |
| API | Callback/stream (`http`), Promise wrapper (axios) | Native Promises + streams, WHATWG `fetch` |
| Overhead | Extra abstraction layers, more allocations | Minimal object allocation per request |

The core reasons undici wins:
1. **Better connection pooling with pipelining.** undici's `Pool` keeps a set of persistent connections per origin and can **pipeline** requests (send the next request before the previous response returns) when safe, plus efficient round-robin across connections. The legacy Agent has more per-request bookkeeping and no pipelining.
2. **Fewer allocations / tighter code path.** undici was written to minimize per-request object churn and buffer copies — which, given GC costs (see the memory lesson), directly translates to throughput and lower p99.
3. **Keep-alive done right by default**, avoiding the handshake tax that a mis-defaulted Agent incurs.
4. **axios adds overhead**: it's a feature-rich wrapper (interceptors, transforms, `XMLHttpRequest`-compatible API) on top of the `http` module — convenient, but it's not a performance play, and it inherits the legacy client's characteristics.
5. **node-fetch** is a spec-compatible shim over `http`; fine for compatibility, not built for throughput.

```js
const { request, Pool } = require('undici');
const pool = new Pool('https://api.internal', { connections: 64, pipelining: 1 });
const { statusCode, body } = await pool.request({ path: '/v1/users', method: 'GET' });
const data = await body.json();
```

**Interview trap:** "Just use axios, it's the standard." For a service making heavy internal fanout calls, axios's convenience costs measurable throughput and connection efficiency versus undici. The senior answer: use the global `fetch`/undici (with a tuned `Pool`) for high-volume programmatic calls; reach for axios only when its ergonomics (interceptors, broad browser/Node symmetry) actually earn their keep, and never assume any client has keep-alive on without checking.

---

### Q12. How do you stream a response instead of buffering it, and why does it matter?

**Answer:**
Buffering a large response means holding the *entire* payload in memory before sending — O(payload) memory per in-flight request. Streaming sends it in chunks — O(chunk) memory — and starts sending before the whole thing is ready (lower time-to-first-byte). Since `res` is a Writable stream, you pipe a source into it:

```js
const { pipeline } = require('stream/promises');
const fs = require('fs');

http.createServer(async (req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
  // pipeline handles backpressure AND cleans up on error/client-disconnect
  await pipeline(fs.createReadStream('/data/huge.bin'), res);
}).listen(3000);
```

Why it matters:
- **Memory** — streaming a 2 GB file to 100 clients costs O(100 × chunk) not O(100 × 2 GB). Buffering would OOM (and blow up `external`/RSS with Buffers — see the memory lesson).
- **Backpressure** — `pipeline`/`pipe` automatically pauses the source when the socket's send buffer fills (`res.write()` returns `false`), so a slow client can't force you to buffer the whole payload in RAM. **This is the critical correctness property**: without it, a slow client that reads at 1 KB/s while you produce at 100 MB/s makes your process buffer the difference until it OOMs.
- **Time-to-first-byte** — the client sees bytes as they're produced (transcoding, DB cursor → NDJSON), not after the whole job finishes.

Use `stream.pipeline` (or `stream/promises` `pipeline`), **not** bare `.pipe()`, because `pipeline` propagates errors and destroys all streams on failure or client disconnect — bare `.pipe()` leaks the source stream/file descriptor when the client hangs up mid-response.

**Interview trap:** "I'll just `JSON.stringify` the array and send it." For a large result set that materializes the entire array *and* its JSON string in memory simultaneously (2× peak). Stream it as NDJSON or a JSON array written incrementally from a DB cursor so peak memory is one row, not the whole result. And `JSON.stringify` of a huge object is a **synchronous** call that blocks the event loop — a double hit.

---

### Q13. Implement Server-Sent Events (SSE) in raw Node. What are the gotchas?

**Answer:**
SSE is a one-way server→client streaming protocol over a single long-lived HTTP response, using `text/event-stream`. It's simpler than WebSockets for server-push-only use cases (notifications, live logs, progress) and works over plain HTTP with auto-reconnect built into the browser `EventSource`.

```js
const http = require('http');

http.createServer((req, res) => {
  if (req.url !== '/events') { res.writeHead(404).end(); return; }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    // If behind nginx, also disable proxy buffering:
    'X-Accel-Buffering': 'no',
  });
  res.write('\n'); // flush headers

  // Each event: optional `id:`, `event:`, and one or more `data:` lines, then a blank line.
  const send = (data, event) => {
    if (event) res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);   // blank line terminates the event
  };

  send({ hello: 'world' }, 'greeting');
  const timer = setInterval(() => send({ ts: Date.now() }), 1000);

  // Heartbeat comment to keep intermediaries from closing an idle connection.
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 15_000);

  // CRITICAL: clean up when the client disconnects, or you leak timers + the socket.
  req.on('close', () => {
    clearInterval(timer);
    clearInterval(heartbeat);
    res.end();
  });
}).listen(3000);
```

Gotchas:
- **Message framing** — an event is terminated by a **blank line** (`\n\n`). Forgetting the double newline means the client never fires the event (it's still "buffering" your event).
- **Cleanup on disconnect** — you *must* listen for `req.on('close')` and clear timers/intervals. Otherwise every disconnected client leaks a `setInterval` (and the closure/socket it captures) forever — the EventEmitter/timer leak from the memory lesson, at scale.
- **Proxy buffering** — nginx and some LBs buffer responses by default, which breaks the "push immediately" property; disable with `X-Accel-Buffering: no` (nginx) and ensure the proxy supports streaming.
- **Compression** — response compression middleware can buffer SSE; exempt the stream or it won't flush.
- **Heartbeats** — send periodic comment lines (`: ping\n\n`) so idle-connection timeouts (LB, `keepAliveTimeout`) don't kill a quiet stream.

**Interview trap:** "SSE and WebSockets are interchangeable." SSE is **server→client only**, text-only, over ordinary HTTP (works with HTTP/2 multiplexing, auto-reconnects via `Last-Event-ID`). WebSockets are **bidirectional**, binary-capable, but require an upgrade handshake and don't multiplex over HTTP/2. For push-only feeds, SSE is simpler and more infrastructure-friendly; picking WebSockets there is over-engineering.

---

### Q14. Build a minimal reverse proxy in raw Node. Explain the moving parts.

**Answer:**
A reverse proxy accepts client requests, forwards them to an upstream, and streams the response back. The core is **request/response streaming with header propagation and error handling**:

```js
const http = require('http');

const UPSTREAM = { host: '127.0.0.1', port: 4000 };

const proxy = http.createServer((clientReq, clientRes) => {
  // Copy method, path, and headers to the upstream request.
  const options = {
    host: UPSTREAM.host,
    port: UPSTREAM.port,
    method: clientReq.method,
    path: clientReq.url,
    headers: { ...clientReq.headers, host: `${UPSTREAM.host}:${UPSTREAM.port}` },
  };

  const upstreamReq = http.request(options, (upstreamRes) => {
    // Propagate status + headers back to the client.
    clientRes.writeHead(upstreamRes.statusCode, upstreamRes.headers);
    // Stream the upstream body to the client with backpressure.
    upstreamRes.pipe(clientRes);
  });

  // Stream the client's request body (if any) to the upstream with backpressure.
  clientReq.pipe(upstreamReq);

  // Error handling: an upstream failure must become a clean 502, not a crash.
  upstreamReq.on('error', (err) => {
    if (!clientRes.headersSent) clientRes.writeHead(502, { 'Content-Type': 'text/plain' });
    clientRes.end('Bad Gateway');
  });
  // If the client hangs up, abort the upstream request to free the socket.
  clientReq.on('close', () => upstreamReq.destroy());
});

proxy.listen(8080);
```

The moving parts a senior must call out:
1. **Bidirectional streaming.** `clientReq.pipe(upstreamReq)` forwards the request body; `upstreamRes.pipe(clientRes)` forwards the response body. Both use stream backpressure so a slow client or slow upstream can't force unbounded buffering.
2. **Header handling.** You forward headers but should rewrite `Host`, and in a real proxy add/append **`X-Forwarded-For`**, `X-Forwarded-Proto`, `X-Forwarded-Host` so the upstream knows the true client. **Hop-by-hop headers** (`Connection`, `Keep-Alive`, `Transfer-Encoding`, `Upgrade`) must **not** be blindly forwarded per RFC 7230 — a correct proxy strips them.
3. **Error → 502.** An upstream `ECONNREFUSED`/reset must produce a clean 502, and you must check `headersSent` before writing a status (you can't send headers twice if the response already started streaming).
4. **Client disconnect.** `clientReq.on('close')` → `upstreamReq.destroy()` prevents leaking the upstream socket when the client gives up mid-flight.
5. **Keep-alive to the upstream.** A production proxy uses a keep-alive **Agent** for `http.request` (Q3) so it isn't handshaking to the upstream on every request.
6. **WebSocket/Upgrade** — real proxies also handle the `'upgrade'` event to tunnel WebSocket connections (raw socket piping), and `CONNECT` for HTTPS tunneling.

**Interview trap:** "Just forward all headers as-is." Blindly forwarding hop-by-hop headers (`Connection`, `Transfer-Encoding`) corrupts the proxied connection and can enable **request smuggling** (ambiguous framing between `Content-Length` and `Transfer-Encoding` that front and back ends parse differently). A correct proxy normalizes framing headers and strips hop-by-hop ones. This is a security-relevant detail, not a nicety.

---

### Q15. What is HTTP request smuggling and how does it relate to Node proxies/servers?

**Answer:**
Request smuggling exploits a **disagreement between two HTTP processors** (typically a front-end proxy/LB and a back-end server) about **where one request ends and the next begins**, when a request contains *both* `Content-Length` and `Transfer-Encoding: chunked` (or malformed versions). If the front-end uses one to frame and the back-end uses the other, an attacker can "smuggle" a partial request that the back-end prepends to the *next* victim's request — poisoning it, bypassing auth, or hijacking responses.

Relevance to Node:
- Node's parser is **`llhttp`**, which is strict about framing (it rejects conflicting `Content-Length`/`Transfer-Encoding`, bad chunk sizes, etc.) — this strictness is a *deliberate* smuggling defense. Loosening it (older `--insecure-http-parser` flag to accept malformed requests for compatibility) reopens the risk; never enable it in production without understanding the exposure.
- If you **write a proxy in Node** (Q14), you must not create a mismatch: normalize framing (don't forward both `Content-Length` and `Transfer-Encoding`), strip hop-by-hop headers, and prefer forwarding through a well-tested proxy library or reusing the upstream's framing decisions consistently.
- Keep Node updated: several CVEs over the years were llhttp/parser framing issues.

**Interview trap:** "Smuggling is only a proxy-vendor problem." Any time you place a Node service *behind* a proxy or *act as* one, the front/back parser pair is a smuggling surface. The defenses are strict parsing (don't disable llhttp strictness), consistent framing in any proxy you write, and patching — it's squarely a Node-app concern.

---

### Q16. How do client-side timeouts and cancellation work in modern Node, and why is a socket timeout not enough?

**Answer:**
There are several distinct "timeouts" on the client side, and you generally need more than one:

- **Connection (connect) timeout** — how long to wait for the TCP/TLS connection to establish. Not directly exposed on legacy `http.request`; undici and socket-level options handle it.
- **Socket/inactivity timeout** (`req.setTimeout(ms)` / socket `timeout`) — fires when **no data flows** on the socket for `ms`. It does *not* cap total request duration: a malicious/slow server that dribbles one byte every `ms-1` keeps the socket "active" forever. It also doesn't automatically abort — you must handle the `'timeout'` event and call `req.destroy()`.
- **Overall/deadline timeout** — a hard cap on total time regardless of activity. The modern tool is `AbortSignal.timeout(ms)` (or an `AbortController`) passed to `fetch`/undici:

```js
const res = await fetch('https://api.internal/slow', {
  signal: AbortSignal.timeout(2000),  // hard 2s deadline, aborts connection + request
});
```

Why a socket timeout isn't enough: it resets on any byte, so it protects against *stalled* connections but not against a server that responds *slowly but steadily* past your latency budget. For SLOs you need an **absolute deadline** (`AbortSignal.timeout`), ideally combined with a connect timeout and a socket idle timeout as defense-in-depth.

**Interview trap:** "I set `req.setTimeout(5000)`, so requests can't exceed 5s." A trickle-feeding server keeps the socket active indefinitely under an inactivity timeout — the request can run far past 5s. Use an **AbortSignal deadline** for a true wall-clock cap, and remember to *propagate* cancellation: aborting the client request should also abort any downstream work you kicked off, or you leak in-flight upstream calls.

---

### Q17. What are `Transfer-Encoding: chunked` and `Content-Length`, and how does Node decide framing?

**Answer:**
HTTP needs to know where a message body ends. Two mechanisms:

- **`Content-Length: N`** — the body is exactly N bytes. Used when the full size is known up front. The receiver reads exactly N bytes.
- **`Transfer-Encoding: chunked`** — the body is sent as a series of size-prefixed chunks (`<hex-size>\r\n<data>\r\n ... 0\r\n\r\n`), so the sender can start transmitting **before knowing the total size** (streaming). Ends with a zero-length chunk.

How Node decides (server response):
- If you call `res.writeHead(200, { 'Content-Length': n })` or set it, Node sends `Content-Length` and expects exactly `n` bytes.
- If you **stream** (`res.write(...)` multiple times, or pipe a stream) **without** setting `Content-Length`, Node automatically uses **`Transfer-Encoding: chunked`** — it can't know the length in advance.
- HTTP/2 has no chunked encoding (framing is built into the protocol); this is HTTP/1.1 specific.

Practical consequences:
- You can't set both meaningfully; llhttp treats a request with both as a smuggling risk (Q15).
- Setting a **wrong** `Content-Length` (fewer bytes than you write, or ending early) causes truncated responses or hung clients (the client waits for bytes that never come). If you don't know the size, **don't set `Content-Length`** — let Node use chunked.

**Interview trap:** "Always set `Content-Length` for performance." Only when you actually know it and it's cheap to compute. For streamed/dynamic responses, forcing a `Content-Length` means buffering the entire body to measure it — defeating streaming (Q12) and spiking memory. Chunked exists precisely so you can stream without knowing the length.

---

### Q18. What are Nagle's algorithm and `TCP_NODELAY`, and when do they bite a Node service?

**Answer:**
**Nagle's algorithm** is a TCP-level optimization that reduces the number of small packets on the wire: it holds outgoing small writes and coalesces them until either a full segment (MSS) accumulates *or* a previously-sent segment is acknowledged. It exists to avoid flooding the network with tiny "tinygram" packets (the classic example: one keystroke per packet in a telnet session).

The problem: Nagle interacts badly with **delayed ACKs** (the receiver holds acknowledgments briefly to piggyback them on return data). When a sender has a small write pending under Nagle *and* the receiver is delaying its ACK, you get a standoff: the sender waits for an ACK to send the next small chunk, the receiver waits for data to piggyback its ACK — and nothing moves until the delayed-ACK timer fires (up to ~40–200 ms). This shows up as **mysterious ~40 ms latency spikes** on small request/response exchanges.

`TCP_NODELAY` **disables** Nagle, sending each write immediately. **Node disables Nagle by default** on sockets (it calls `socket.setNoDelay(true)` internally for HTTP), precisely because request/response protocols suffer from the Nagle+delayed-ACK interaction. You can toggle it:

```js
const server = net.createServer((socket) => {
  socket.setNoDelay(true);   // disable Nagle: send small writes immediately (default for HTTP)
});
// On a client socket:
req.on('socket', (socket) => socket.setNoDelay(true));
```

When it bites in Node:
- Writing a response in **many tiny `res.write()` calls** with Nagle *enabled* (e.g., a custom socket protocol where you re-enabled Nagle, or a non-HTTP TCP service) can incur the 40 ms stall per exchange. Coalesce your writes (build the buffer, one `write`) or ensure `setNoDelay(true)`.
- The reverse: disabling Nagle on a chatty stream of genuinely tiny packets increases packet overhead. For HTTP request/response the latency win dominates, which is why Node defaults to no-delay.

**Interview trap:** "My tiny requests have a consistent ~40 ms latency floor and the CPU and upstream are idle." That fixed ~40 ms is the fingerprint of **Nagle + delayed-ACK**, not a slow server. Since Node disables Nagle for HTTP by default, this usually means a raw `net` socket, a re-enabled Nagle, or an intermediary. The fix is `setNoDelay(true)` and/or writing in fewer, larger chunks — not a faster network.

---

### Q19. How does a WebSocket upgrade work at the HTTP level, and how do you handle it in raw Node?

**Answer:**
A WebSocket connection *starts* as an ordinary HTTP/1.1 GET request carrying an **`Upgrade: websocket`** header (plus `Connection: Upgrade`, `Sec-WebSocket-Key`, `Sec-WebSocket-Version`). The server, if it accepts, responds with **`101 Switching Protocols`** and a computed `Sec-WebSocket-Accept` header. After that 101, the **same TCP socket** stops speaking HTTP and starts speaking the WebSocket framing protocol — a persistent, bidirectional, message-oriented channel.

In Node, this is *not* the `'request'` event — the HTTP server emits a distinct **`'upgrade'`** event, handing you the raw socket and the unconsumed head bytes:

```js
const crypto = require('crypto');
const server = http.createServer();

server.on('upgrade', (req, socket, head) => {
  if (req.headers['upgrade']?.toLowerCase() !== 'websocket') {
    socket.destroy();  // not a websocket upgrade — reject
    return;
  }
  // Compute the handshake accept value (RFC 6455 magic GUID).
  const key = req.headers['sec-websocket-key'];
  const accept = crypto
    .createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');

  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
  );
  // From here, `socket` carries WebSocket frames. You now parse/emit frames
  // (opcode, mask, payload-length) yourself — or hand `socket` to a library (ws).
  socket.on('data', (buf) => { /* decode WebSocket frames */ });
  socket.on('close', () => { /* clean up */ });
});
server.listen(3000);
```

Why it matters for a proxy (Q14): a reverse proxy must also handle `'upgrade'` explicitly — you can't proxy a WebSocket through the normal request/response path because after the 101 the connection is a raw bidirectional byte tunnel. The proxy opens an upgrade request to the upstream and then **pipes the two raw sockets together in both directions** (`clientSocket.pipe(upstreamSocket); upstreamSocket.pipe(clientSocket)`), forwarding the `head` bytes first.

**Interview trap:** "WebSockets run over HTTP/2 multiplexing." Standard WebSockets use the HTTP/1.1 `Upgrade` mechanism on a dedicated connection — they do **not** multiplex over HTTP/2 the way h2 streams do (there's a separate RFC 8441 "bootstrapping WebSockets over HTTP/2" that's not universally supported). Practically, a WebSocket ties up one connection for its lifetime, which is why connection limits and sticky-session routing (the socket must stay pinned to one backend) are real concerns a senior raises. Also: forgetting to handle `'upgrade'` (only handling `'request'`) means upgrade requests silently hang — a common "my WebSocket won't connect through the proxy" bug.

---

### Q20. How would you diagnose "outbound calls to one upstream are intermittently slow, everything else is fine"?

**Answer:**
A structured senior walkthrough, ruling out layers:

1. **Is it queue time or wire time?** Instrument the client to record time spent *waiting for a socket from the Agent* vs time *on the wire*. If it's Agent queue time → `maxSockets` too low (Q3): you're concurrency-capped, requests queue in the pool. Fix by sizing `maxSockets` via Little's Law and enabling keep-alive.
2. **Cold-connection stalls of ~5s?** Suspect the **IPv6/`family: 0`** connect-timeout fallback (Q10). Test with `family: 4` or ensure `autoSelectFamily` is on. The tell: added latency is roughly a fixed connect-timeout value and only on new connections.
3. **DNS/threadpool starvation?** If slow outbound correlates with heavy `fs`/`crypto`/`zlib` usage, `dns.lookup` is queuing behind them on the 4-thread pool (Q9). Check `UV_THREADPOOL_SIZE`; switch to keep-alive (fewer lookups) or `dns.resolve`.
4. **Handshake tax?** If every call is slow (not just cold ones), you may have keep-alive **off** — each call re-does TCP+TLS. Verify the Agent has `keepAlive: true`; check connection reuse metrics.
5. **502s under keep-alive reuse?** If failures (not just slowness) correlate with idle-then-reuse, it's the **keepAliveTimeout vs LB idle-timeout race** (Q5) — but that's on the *server* side of the upstream.
6. **TLS resumption misses?** Across a fleet, if TTFB is high on reconnects, check shared **session ticket keys** (Q7).

The organizing principle: separate **queue time (Agent) → connect time (DNS/IPv6/handshake) → wire time (upstream) → framing/timeout config**, and attribute the latency to exactly one layer before changing anything. "The network is slow" is never an acceptable stopping point.

**Production war story:** An "intermittently slow upstream" turned out to be `maxSockets: 6` on a shared agent plus keep-alive accidentally disabled by a header-normalization middleware that stripped `Connection: keep-alive`. Every 7th+ concurrent request queued, and the ones that did run paid a fresh TLS handshake. Fixing both (raise `maxSockets`, stop stripping the header) cut p99 from 3.1s to 40ms — the upstream was never the problem.

---

### Q19. Rapid-fire: match the networking symptom to its mechanism and fix.

**Answer:**

| Symptom | Mechanism | Fix |
|---|---|---|
| Intermittent 502s, no entry in Node logs | LB reuses a socket Node just closed (keepAliveTimeout < LB idle) | `keepAliveTimeout` > LB idle; `headersTimeout` > keepAliveTimeout |
| Outbound throughput capped, upstream idle | `maxSockets` too low → agent queue | Size `maxSockets` via Little's Law; keep-alive on |
| ~5s added latency on cold connections | IPv6 connect-timeout fallback (`family: 0`) | `autoSelectFamily` / `family: 4` |
| Outbound slow when fs/crypto busy | `dns.lookup` starving the 4-thread threadpool | Raise `UV_THREADPOOL_SIZE`; keep-alive; `dns.resolve` |
| Every HTTPS call slow (not just cold) | Keep-alive off → handshake per request | `keepAlive: true` Agent / undici |
| High TTFB on reconnect across instances | TLS ticket keys not shared across fleet | Distribute + rotate `ticketKeys` |
| `ERR_TLS_CERT_ALTNAME_INVALID` on IP connect | Missing/wrong SNI `servername` | Set `servername` to the expected hostname |
| SSE clients leak memory over time | No `req.on('close')` cleanup of timers | Clear timers on disconnect |
| Truncated/hung responses | Wrong `Content-Length` vs bytes sent | Don't set `Content-Length` when streaming |
| Slowloris ties up connections | No header/request receive timeout | Set `headersTimeout`/`requestTimeout` |

**Interview trap:** Nearly every one of these is misfiled as "the network is slow" or "the upstream is flaky." The senior skill is attributing latency/failure to a **specific Node/HTTP layer** — Agent queue, DNS/IPv6, handshake, timeout config — and fixing *that*, rather than adding retries or blaming the far end.

---

### Q20. Final synthesis — what's your default outbound-HTTP configuration for a high-throughput Node service, and why?

**Answer:**
A senior states an opinionated default and justifies each choice:

1. **Use undici / global `fetch` with a tuned `Pool`** (not axios by default) — best connection reuse and lowest per-request overhead (Q11).
2. **Keep-alive on, `maxSockets` sized from Little's Law** (`arrival_rate × p99_upstream_latency`, plus headroom) — avoid both handshake tax and agent-queue starvation (Q2, Q3).
3. **`autoSelectFamily` on (or `family: 4`)** — eliminate the multi-second IPv6 fallback stall (Q10).
4. **DNS caching** (`cacheable-lookup` / undici caching) and rely on keep-alive to minimize lookups so the threadpool never becomes the bottleneck (Q9).
5. **Absolute deadlines via `AbortSignal.timeout`** on every call, plus connect + socket idle timeouts as defense-in-depth (Q16) — a request must never be able to hang forever.
6. **On the server side (behind an LB): `keepAliveTimeout` > LB idle timeout, `headersTimeout` > keepAliveTimeout, and a `requestTimeout`** — to kill the 502 race and Slowloris (Q4, Q5).
7. **Stream large payloads with `pipeline`**, never buffer, to bound memory and get backpressure for free (Q12).
8. **Observe:** connection reuse rate, agent queue depth (`agent.requests` vs `agent.sockets`), DNS timing, TTFB, and 502 rate — so any regression in the above is visible before it's an incident.

The through-line: **outbound HTTP performance is dominated by connection management (reuse, pooling, DNS, handshakes), not by the request itself.** Get keep-alive, pooling, DNS/IPv6, and the timeout invariants right, and the "slow network" and "flaky 502" incidents that plague most Node services simply don't happen.

---

## Self-check (answer without looking)

1. Why do intermittent 502s appear behind an ALB, and what's the one-line fix and its ordering constraint with `headersTimeout`?
2. Why does a `maxSockets` of 8 make a fast upstream look slow, and how do you size it correctly?
3. What's the difference between `dns.lookup` and `dns.resolve`, and why can outbound HTTP stall when someone adds `crypto.pbkdf2`?
4. Where is the ~5-second cold-connection stall coming from when `family: 0`, and what are two fixes?
5. Why does undici outperform axios for high-volume calls? Name two concrete reasons.
6. Why must a Node reverse proxy strip hop-by-hop headers, and what security bug does forwarding them risk?
7. What must you do in an SSE handler to avoid leaking memory, and what terminates a single event on the wire?
8. Why is `req.setTimeout(5000)` insufficient as a request deadline, and what replaces it?

This completes Module 1 — Advanced Node.js. See the module `README.md` for the recommended study order across all six lessons.
