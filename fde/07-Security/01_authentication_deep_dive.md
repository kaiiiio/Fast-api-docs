# Lesson 7.1 — Authentication Deep Dive

> Module: Security | Level: Senior/Staff | FDE Prep Phase 7

Forward Deployed Engineers ship auth code into environments where a single mistake becomes the customer's breach. Interviewers do not want "we use JWTs and bcrypt." They want: *when is a JWT the wrong tool, how do you revoke one, what breaks if you pick HS256, how do you detect a stolen refresh token, and why did password hashing tank your upload latency.* This lesson builds that depth.

---

### Q1. Sessions vs JWT — what is the actual trade-off, and when is a JWT the wrong choice?

**Answer:** The core difference is *where authority lives*.

- **Server-side session:** the server stores session state (in Redis/DB). The cookie holds only an opaque random ID. Every request the server looks up the session. Source of truth is the server, so **revocation is instant** — delete the row.
- **JWT (stateless):** the token itself carries the claims, signed by the server. The server verifies the signature and trusts the payload without a lookup. Source of truth is the token, so **you cannot un-issue it** before it expires.

```
Session:  cookie=abc123  ──►  Redis[abc123] = {userId, roles}   (lookup every request)
JWT:      cookie/header=eyJ...  ──►  verify(sig) → trust payload  (no lookup)
```

The revocation problem is the whole game. With a stateless JWT, "log this user out everywhere now" or "this token was stolen" cannot be honored until expiry. Workarounds all reintroduce state:

- Short access-token TTL (5–15 min) + refresh tokens — bounds the damage window.
- A **denylist** of revoked `jti` in Redis — but now you do a lookup every request, which is exactly the state you were avoiding.
- A per-user `tokenVersion` bumped on password change/logout, checked against a claim — again, a lookup.

**JWTs are the wrong choice when:** you need long-lived sessions with instant logout, you need to revoke on demand (admin ban, password reset, device management), or your payload holds mutable authorization data (roles that can change mid-session). JWTs are right for **short-lived, stateless service-to-service** and access tokens with tight TTLs.

**Interview trap:** "JWTs are more secure than sessions." False — they solve a *scaling/statelessness* problem, not a security one. A stateless JWT is strictly *harder* to revoke than a session. If an interviewer hears "more secure," they downgrade you.

---

### Q2. Walk through the three parts of a JWT. What is actually signed?

**Answer:** A JWS-compact JWT is `base64url(header) . base64url(payload) . base64url(signature)`.

```
header:    {"alg":"RS256","typ":"JWT","kid":"2024-key-1"}
payload:   {"sub":"user_42","iss":"https://auth.acme.com","aud":"api","exp":1735689600,"iat":1735686000,"jti":"a1b2"}
signature: SIGN( base64url(header) + "." + base64url(payload), key )
```

The signature covers **header + "." + payload** — not the signature itself. Base64url is *encoding, not encryption*: the payload is fully readable by anyone. Never put secrets (passwords, PII you would not log) in a JWT payload.

**Interview trap:** "Can the client see the JWT contents?" Yes — decode base64url, no key needed. The signature only proves *integrity and authenticity*, not confidentiality.

---

### Q3. Explain the `alg` confusion attack (RS256 → HS256).

**Answer:** The classic vulnerability lives in libraries that pick the verification algorithm from the *token's own header* instead of from server config.

RS256 is asymmetric: sign with the **private** key, verify with the **public** key (which is, by design, public). HS256 is symmetric: the *same* secret signs and verifies.

The attack:

```
1. Server issues RS256 tokens. Its RSA public key is published (JWKS, or just known).
2. Attacker crafts a token with header {"alg":"HS256"}.
3. Attacker signs it using HMAC-SHA256 with the RSA PUBLIC KEY BYTES as the HMAC secret.
4. Vulnerable server reads alg=HS256 from the header, grabs "the key" (the public key),
   and runs HMAC verify with it — which passes, because the attacker used the same bytes.
5. Forged token accepted. Full auth bypass.
```

```js
// VULNERABLE — algorithm taken from the untrusted token header
jwt.verify(token, publicKey);  // library honors header alg; HS256 forgery verifies against publicKey

// FIXED — pin the expected algorithm(s); never let the token choose
jwt.verify(token, publicKey, { algorithms: ['RS256'] });
```

Always pass an explicit `algorithms` allowlist and never share key material between an HMAC and an RSA context.

---

### Q4. What is the `alg: none` attack?

**Answer:** The JWS spec defines an "unsecured" JWT with `alg: none` and an *empty signature*. A library that honors it will accept a token with **no signature at all**.

```
header:  {"alg":"none","typ":"JWT"}
payload: {"sub":"admin","role":"superuser"}
signature: <empty>
```

The attacker strips the signature, sets `alg:none`, edits the payload to `role: admin`, and sends it. A permissive verifier returns "valid."

```js
// FIXED — explicit allowlist makes 'none' unrepresentable
jwt.verify(token, key, { algorithms: ['RS256'] });  // 'none' is rejected
```

**Production war story:** A fintech consulting engagement inherited a middleware that fell back to `jwt.decode()` (which never verifies) inside a try/catch around `jwt.verify()`. Under load, verify occasionally threw on a JWKS timeout, the catch ran `decode`, and for ~90 seconds any forged token was trusted. The fix was one line — remove the fallback — but the lesson is: **`decode` is not `verify`; never let a verify failure degrade into a decode.**

---

### Q5. HS256 vs RS256/ES256 — how do you choose?

**Answer:**

| | HS256 (HMAC) | RS256 (RSA) | ES256 (ECDSA P-256) |
|---|---|---|---|
| Keys | one shared secret | private signs, public verifies | private signs, public verifies |
| Verifier needs | the secret (can also forge!) | only the public key | only the public key |
| Token size | small | large signature (~256B) | small signature (~64B) |
| Best for | single app that signs & verifies | one issuer, many independent verifiers | same as RS256, smaller/faster |

Rule of thumb: if the **same service** signs and verifies, HS256 is fine and simplest. If **other parties verify** (microservices, third parties, an API gateway), use asymmetric (RS256/ES256) so you distribute only the public key. Never hand out an HMAC secret to a verifier — anyone who can verify can also forge.

**Interview trap:** "We use HS256 and gave the secret to five microservices to verify tokens." Now any of those five (or a leak from any of them) can *mint* tokens. That is an asymmetric-key use case.

---

### Q6. How can the `kid` header be abused?

**Answer:** `kid` (key ID) tells the verifier which key to use. If the server uses the attacker-controlled `kid` value to *fetch* a key unsafely, it becomes an injection sink.

- **SQL injection:** `SELECT key FROM keys WHERE kid = '<kid>'` → attacker sets `kid` to `' UNION SELECT 'attacker-known-secret' -- ` and then signs with that known secret.
- **Path traversal:** if `kid` is used as a filename (`keys/<kid>.pem`), `kid = "../../../../dev/null"` yields an empty key; the attacker signs HS256 with an empty secret.
- **Remote key fetch:** if `kid` (or `jku`) is a URL, SSRF and attacker-hosted keys.

```js
// VULNERABLE — kid interpolated into a query / path
const key = db.query(`SELECT pem FROM keys WHERE kid = '${header.kid}'`);
const key2 = fs.readFileSync(`./keys/${header.kid}.pem`);

// FIXED — treat kid as an opaque lookup against a fixed, validated set
const KNOWN_KIDS = new Set(['2024-key-1', '2024-key-2']);
if (!KNOWN_KIDS.has(header.kid)) throw new Error('unknown kid');
const key = await jwksClient.getSigningKey(header.kid); // library validates format
```

Validate `kid` against a known set; never use it as a filesystem path, SQL literal, or URL.

---

### Q7. Implement refresh token rotation with reuse detection in TypeScript.

**Answer:** Rotation means each refresh call returns a **new** refresh token and invalidates the old one. Reuse detection means: if an *already-rotated* (used) refresh token is presented again, that token was stolen (either the attacker or the legitimate user replayed an old one), so we **revoke the entire token family**.

```
family f1:  RT1 ──rotate──► RT2 ──rotate──► RT3 (current, valid)
                              ▲
                              └── attacker replays RT2 (already rotated)
                                  → REUSE DETECTED → revoke f1 → RT3 dies too
                                    both attacker and victim are logged out; victim re-auths
```

Schema:

```sql
CREATE TABLE refresh_tokens (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id    uuid NOT NULL,               -- one lineage per login
  user_id      uuid NOT NULL,
  token_hash   text NOT NULL,               -- SHA-256 of the token, never plaintext
  rotated_at   timestamptz,                 -- NULL = current/unused; set = already used
  revoked      boolean NOT NULL DEFAULT false,
  expires_at   timestamptz NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON refresh_tokens (token_hash);
CREATE INDEX ON refresh_tokens (family_id);
```

```ts
import { createHash, randomBytes } from 'node:crypto';
import type { Pool } from 'pg';

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const sha256 = (s: string): string => createHash('sha256').update(s).digest('hex');
const newToken = (): string => randomBytes(32).toString('base64url'); // 256 bits entropy

interface IssuedRefresh { token: string; familyId: string; }

export class RefreshService {
  constructor(private db: Pool) {}

  // Called on successful login: start a brand-new family.
  async issueNewFamily(userId: string): Promise<IssuedRefresh> {
    const token = newToken();
    const { rows } = await this.db.query(
      `INSERT INTO refresh_tokens (family_id, user_id, token_hash, expires_at)
       VALUES (gen_random_uuid(), $1, $2, now() + interval '30 days')
       RETURNING family_id`,
      [userId, sha256(token)],
    );
    return { token, familyId: rows[0].family_id };
  }

  // Called on /token refresh. Rotates or, on reuse, nukes the family.
  async rotate(presentedToken: string): Promise<IssuedRefresh> {
    const hash = sha256(presentedToken);

    // Run the critical section in one serializable transaction.
    const client = await this.db.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');

      const { rows } = await client.query(
        `SELECT id, family_id, user_id, rotated_at, revoked, expires_at
           FROM refresh_tokens WHERE token_hash = $1 FOR UPDATE`,
        [hash],
      );
      const row = rows[0];

      // Unknown token → treat as invalid (do not reveal which case).
      if (!row) { await client.query('ROLLBACK'); throw new AuthError('invalid_grant'); }

      // REUSE DETECTION: a token that was already rotated OR belongs to a revoked
      // family is being replayed → compromise. Kill the entire family.
      if (row.rotated_at !== null || row.revoked) {
        await client.query(
          `UPDATE refresh_tokens SET revoked = true WHERE family_id = $1`,
          [row.family_id],
        );
        await client.query('COMMIT');
        throw new AuthError('reuse_detected'); // force full re-authentication
      }

      if (new Date(row.expires_at) < new Date()) {
        await client.query('ROLLBACK');
        throw new AuthError('expired');
      }

      // Happy path: mark old token used, issue successor in the SAME family.
      const next = newToken();
      await client.query(
        `UPDATE refresh_tokens SET rotated_at = now() WHERE id = $1`, [row.id],
      );
      await client.query(
        `INSERT INTO refresh_tokens (family_id, user_id, token_hash, expires_at)
         VALUES ($1, $2, $3, now() + interval '30 days')`,
        [row.family_id, row.user_id, sha256(next)],
      );
      await client.query('COMMIT');
      return { token: next, familyId: row.family_id };
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  }
}

class AuthError extends Error {}
```

Key properties: tokens are **hashed at rest** (a DB dump does not yield usable tokens), rotation is **atomic** (serializable + `FOR UPDATE` prevents a double-spend race), and reuse of any historical token in a family revokes the whole lineage.

**Interview trap:** "Why revoke the whole family instead of just the replayed token?" Because you cannot tell *who* holds the current token — attacker or victim. Revoking the family forces the real user to re-authenticate (a minor annoyance) while permanently locking out the thief.

---

### Q8. bcrypt vs scrypt vs argon2id — how do you choose and parameterize?

**Answer:** All three are deliberately slow, salted password hashes. They differ in what they make expensive for an attacker.

- **bcrypt:** CPU-hard, battle-tested, cost factor (`rounds`). Practical default: **cost 12** (≈250ms on modern hardware). Two gotchas: it silently **truncates input at 72 bytes**, and it chokes on NUL bytes. Pre-hash long/binary passwords with SHA-256 → base64 before bcrypt.
- **scrypt:** memory-hard (resists GPU/ASIC better than bcrypt). Params `N` (cost), `r`, `p`. Built into Node `crypto.scrypt`. A common set: `N=2^15, r=8, p=1` with a 32-byte salt.
- **argon2id:** the current recommendation (PHC winner). Hybrid resistance to GPU and side-channel. Params: `memoryCost` (e.g. 19–64 MiB), `timeCost` (iterations, e.g. 2–3), `parallelism`. OWASP baseline: **19 MiB, timeCost 2, parallelism 1**.

Pick **argon2id** for new systems; bcrypt cost 12 is an acceptable, widely-supported fallback.

```ts
import argon2 from 'argon2';

// FIXED — argon2id with explicit, tuned parameters
const hash = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
});
const ok = await argon2.verify(hash, password); // salt+params encoded in the hash string
```

```ts
// bcrypt with the 72-byte truncation defused
import bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';

function prehash(pw: string): string {
  // SHA-256 → base64 keeps entropy inside bcrypt's 72-byte window
  return createHash('sha256').update(pw, 'utf8').digest('base64');
}
const hash = await bcrypt.hash(prehash(password), 12);
```

**Interview trap:** "Two long passwords sharing the first 72 bytes hash identically under bcrypt." True, and it has caused real account-takeover chains with password managers that generate long strings. Pre-hashing fixes it.

---

### Q9. What is the Node event-loop implication of password hashing?

**Answer:** Argon2/scrypt/bcrypt do heavy CPU work. In Node, the **synchronous** variants (`bcrypt.hashSync`, `crypto.scryptSync`) block the single JS thread — during a 250ms hash, your server serves *nobody*. Always use the **async** variants.

But async is not free: bcrypt/argon2/scrypt run on libuv's **thread pool**, which defaults to **4 threads** (`UV_THREADPOOL_SIZE`). The pool is *shared* with `fs`, DNS, and zlib. So a burst of logins can saturate all 4 threads, and now your file reads and DNS lookups queue behind password hashes.

```
Login burst (50 concurrent) → 50 argon2 jobs → 4-thread pool
   → 46 queued → fs.readFile for an upload also queued behind them → upload latency spikes
```

**Production war story:** A customer reported that file uploads got slow *only during morning login spikes*. Root cause: argon2 hashing and Multer's disk writes both used the default 4-thread libuv pool. During the 9am login stampede, hashing starved the fs writes. Fixes applied: raised `UV_THREADPOOL_SIZE=16` to match the box's cores, moved bulk hashing to a dedicated worker/queue, and added per-IP login rate limiting so an attacker could not weaponize the pool. Tune `UV_THREADPOOL_SIZE` *before* the process starts (it is read at startup):

```bash
UV_THREADPOOL_SIZE=16 node server.js
```

**Interview trap:** "Just make hashing faster / lower the cost." No — lowering cost weakens the hash. The answer is concurrency management (thread pool sizing, offloading, rate limiting), not weaker crypto.

---

### Q10. Implement TOTP from scratch. Explain each step.

**Answer:** TOTP (RFC 6238) = HOTP (RFC 4226) with the counter derived from time. Steps: derive a time counter `T = floor(now / step)`, HMAC-SHA1 the counter with the shared secret, apply **dynamic truncation** to get a 31-bit number, mod 10^digits.

```ts
import { createHmac } from 'node:crypto';

// base32 decode (RFC 4648) — authenticator apps share the secret as base32
function base32Decode(input: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = input.replace(/=+$/, '').toUpperCase().replace(/\s/g, '');
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = alphabet.indexOf(ch);
    if (idx === -1) throw new Error('invalid base32');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 0xff); bits -= 8; }
  }
  return Buffer.from(out);
}

function hotp(secret: Buffer, counter: bigint, digits = 6): string {
  // 8-byte big-endian counter
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(counter);
  const hmac = createHmac('sha1', secret).update(buf).digest(); // 20 bytes

  // Dynamic truncation (RFC 4226 §5.3)
  const offset = hmac[hmac.length - 1] & 0x0f;          // low 4 bits of last byte
  const binCode =
    ((hmac[offset]     & 0x7f) << 24) |                  // mask MSB to stay positive
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8)  |
     (hmac[offset + 3] & 0xff);

  return (binCode % 10 ** digits).toString().padStart(digits, '0');
}

export function totp(base32Secret: string, opts: { step?: number; digits?: number; t?: number } = {}): string {
  const step = opts.step ?? 30;
  const digits = opts.digits ?? 6;
  const now = opts.t ?? Math.floor(Date.now() / 1000);
  const counter = BigInt(Math.floor(now / step));
  return hotp(base32Decode(base32Secret), counter, digits);
}

// Verification with a drift window (±1 step tolerates clock skew), constant-time compare.
import { timingSafeEqual } from 'node:crypto';
export function verifyTotp(base32Secret: string, code: string, window = 1): boolean {
  const step = 30, now = Math.floor(Date.now() / 1000);
  const secret = base32Decode(base32Secret);
  for (let w = -window; w <= window; w++) {
    const counter = BigInt(Math.floor(now / step) + w);
    const expected = hotp(secret, counter, code.length);
    const a = Buffer.from(expected), b = Buffer.from(code);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}
```

Notes that matter in interviews: the **MSB mask (`& 0x7f`)** avoids sign issues across languages; the **drift window** handles clock skew but each extra step doubles the attacker's guessing surface, so keep it at ±1; and you must **reject reuse of a code within its window** (store last-accepted counter) to stop replay.

---

### Q11. What are WebAuthn / passkeys, and why are they phishing-resistant?

**Answer:** WebAuthn (FIDO2) replaces shared secrets with **public-key credentials** bound to an origin. During *registration* (attestation), the authenticator (Touch ID, YubiKey, phone) generates a keypair, keeps the private key in secure hardware, and gives the server the public key. During *login* (assertion), the server sends a random challenge; the authenticator signs it with the private key.

Phishing resistance comes from two properties:
1. **Origin binding:** the browser includes the *real* origin (`rpId`) in the signed data. A phishing site on `acme-login.com` cannot get a signature valid for `acme.com` — the authenticator ties the credential to the true origin.
2. **No shared secret to steal:** there is nothing to phish, reuse, or breach-dump. The private key never leaves the device.

Passkeys are WebAuthn credentials that sync across a user's devices (via iCloud Keychain / Google Password Manager), making them practical for consumers. For FDE work: passkeys eliminate the credential-stuffing and phishing classes entirely, which is why they are the strongest MFA/primary-factor recommendation you can make to a customer.

**Interview trap:** "TOTP is phishing-resistant." No — a user will type a TOTP code into a phishing page and the attacker relays it in real time. WebAuthn's origin binding is what actually stops that.

---

### Q12. Explain session fixation and how to prevent it.

**Answer:** Session fixation: the attacker *fixes* a session identifier the victim will use, then rides that session after the victim authenticates.

```
1. Attacker obtains a valid session id S (visits the site).
2. Attacker tricks victim into using S (link with ?sessionid=S, or setting the cookie).
3. Victim logs in — server keeps the SAME id S and attaches the authenticated user to it.
4. Attacker, who knows S, is now authenticated as the victim.
```

The fix: **regenerate the session identifier on any privilege change** (login, step-up MFA, role elevation), so whatever id the attacker planted is discarded.

```ts
// FIXED — regenerate session on login (express-session)
app.post('/login', async (req, res) => {
  const user = await authenticate(req.body.email, req.body.password);
  if (!user) return res.status(401).end();

  req.session.regenerate((err) => {       // new session id; old one invalidated
    if (err) return res.status(500).end();
    req.session.userId = user.id;
    req.session.save(() => res.json({ ok: true }));
  });
});
```

Also: never accept session IDs from the URL/query, and set the cookie yourself (see Q13). For stateless JWTs the analog is issuing a fresh token on login and never trusting a client-supplied one.

---

### Q13. Deep dive: secure cookie attributes and SameSite (Strict vs Lax vs None).

**Answer:** A session cookie should be set with a specific attribute stack:

```ts
res.cookie('sid', sessionId, {
  httpOnly: true,   // JS cannot read it → XSS can't exfiltrate the session
  secure: true,     // only sent over HTTPS
  sameSite: 'lax',  // CSRF mitigation (see below)
  path: '/',
  maxAge: 1000 * 60 * 60 * 8,
  // name it __Host-sid in production for the strongest binding (see below)
});
```

**SameSite** controls whether the cookie rides along on *cross-site* requests:

- **Strict:** cookie is **never** sent on any cross-site request, including a top-level navigation from another site. Maximum CSRF protection, but a user clicking your link from email/Slack lands *logged out* (the first request carries no cookie). Good for high-value actions; annoying for general sessions.
- **Lax (default in modern browsers):** cookie **is** sent on *top-level* navigations that use **safe methods (GET)** — so following a link keeps you logged in — but **not** on cross-site `POST`, `fetch`, `XHR`, or subresource requests. This blocks the classic CSRF (auto-submitting POST form) while preserving UX. This is the sensible default for sessions.
- **None:** cookie sent on all cross-site requests; **requires `Secure`**. Needed for legitimate cross-site contexts (third-party embeds, some SSO/iframe flows). Using `None` reopens CSRF exposure, so pair it with anti-CSRF tokens.

The **Lax top-level-GET nuance** is a favorite probe: a cross-site *GET* navigation *does* carry a Lax cookie. So any *state-changing GET endpoint* (e.g., `GET /account/delete`) is still CSRF-able even under Lax. Never mutate state on GET.

The **`__Host-` prefix** is the strongest binding: a cookie named `__Host-sid` is only accepted by the browser if it is `Secure`, has `Path=/`, and has **no `Domain` attribute** (so it cannot be scoped up to a parent domain or set by a subdomain). This defeats subdomain cookie-injection attacks.

```ts
// FIXED — hardened production session cookie
res.cookie('__Host-sid', sessionId, {
  httpOnly: true, secure: true, sameSite: 'lax', path: '/',
  // do NOT set domain — required for __Host- prefix
});
```

**Interview trap:** "SameSite=Lax fully prevents CSRF." No — it stops cross-site POST/fetch, but (a) state-changing GET endpoints remain vulnerable, and (b) it does nothing for same-site attacks. Defense in depth still needs anti-CSRF tokens for sensitive operations and no state mutation on GET.

---

### Q14. Where should you store tokens on the client — cookie vs localStorage?

**Answer:** Trade-off between XSS and CSRF exposure:

- **localStorage / JS-accessible:** any XSS reads the token and exfiltrates it. No CSRF (not auto-sent). But XSS = total compromise, and XSS is far more common than CSRF.
- **HttpOnly cookie:** XSS *cannot* read it (mitigates token theft), but it is auto-sent → CSRF risk, mitigated by SameSite + anti-CSRF tokens.

Best practice for web apps: keep the session/refresh token in an **HttpOnly, Secure, SameSite cookie**, and if you use a JWT access token for API calls, keep it **in memory** (a JS variable, lost on reload, re-fetched via the refresh cookie). Avoid localStorage for anything that grants access.

**Interview trap:** "We store the JWT in localStorage so it survives refresh." That trades a rare attack (CSRF) for the most common one (XSS token theft). The refresh-cookie + in-memory access token pattern gives you persistence *and* XSS resistance.

---

### Q15. How do you protect against brute force and credential stuffing at the auth layer?

**Answer:** Layer several controls; none suffices alone:

1. **Per-account throttling / lockout with backoff** — after N failures, add exponential delay; avoid permanent lockout (a DoS lever) — use time-decaying counters.
2. **Per-IP and global rate limits** — but IPs rotate (botnets), so combine with account-level.
3. **Constant-time responses** — same latency and message whether the *email* exists or the *password* is wrong, to prevent user enumeration.
4. **Breached-password checks** — reject known-compromised passwords (k-anonymity range query against HIBP).
5. **CAPTCHA / proof-of-work** only after suspicion (not on every login — UX cost).
6. **MFA** — the real backstop; stuffing a correct password still fails without the second factor.

```ts
// FIXED — uniform response + timing to prevent enumeration
async function login(email: string, password: string) {
  const user = await users.findByEmail(email);
  // Always run a verify (against a dummy hash if user missing) so timing is uniform.
  const hash = user?.passwordHash ?? DUMMY_ARGON2_HASH;
  const ok = await argon2.verify(hash, password).catch(() => false);
  if (!user || !ok) throw new AuthError('invalid_credentials'); // identical message
  return user;
}
```

**Production war story:** A customer's login returned "user not found" vs "wrong password" and had no rate limit. An attacker enumerated 40k valid emails in an afternoon, then credential-stuffed them. The two-line fixes — a single generic error and a per-account leaky-bucket limiter — cut the attack dead. Uniform errors and rate limits are cheap; skipping them is the expensive part.

---

### Q16. What claims should a JWT always validate, and in what order?

**Answer:** Validate structurally before trusting anything:

1. **Signature** with a pinned `algorithms` allowlist (never token-chosen alg).
2. **`exp`** (not expired) and **`nbf`** (not before) with small clock skew (≤60s).
3. **`iss`** matches your expected issuer exactly.
4. **`aud`** matches *this* service — a token minted for service A must not be accepted by service B.
5. **`iat`** sanity (optional freshness).
6. Business checks: `sub` exists/active, `tokenVersion`/revocation if you keep server state.

```ts
jwt.verify(token, publicKey, {
  algorithms: ['RS256'],
  issuer: 'https://auth.acme.com',
  audience: 'https://api.acme.com',
  clockTolerance: 30,
});
```

**Interview trap:** "We check the signature and expiry." Missing `aud` is the silent killer — a valid token for the *marketing* API gets replayed against the *admin* API because both trust the same issuer. Always pin audience.

---

### Q17. Why not just make access tokens long-lived to avoid refresh complexity?

**Answer:** Because a long-lived stateless access token is a long-lived *bearer* credential you cannot revoke. If it leaks (logs, referrer header, browser history, a proxy), the attacker has hours or days of access. The whole point of short access TTL (5–15 min) + rotating refresh is to make a stolen access token nearly worthless and to give the refresh layer a *stateful* choke point where revocation and reuse detection live. Long access TTL throws away your only revocation lever.

---

### Q18. How do you securely handle "log out everywhere" and password-reset invalidation with JWTs?

**Answer:** Introduce a minimal piece of state — a per-user `tokenVersion` (or `securityStamp`):

```ts
// On issue, embed the current version as a claim.
const token = jwt.sign({ sub: user.id, tv: user.tokenVersion }, key, { algorithm: 'RS256', expiresIn: '10m' });

// On password change / "logout everywhere": bump it.
await users.update(user.id, { tokenVersion: user.tokenVersion + 1 });

// On refresh (the stateful checkpoint), compare.
if (claims.tv !== user.tokenVersion) throw new AuthError('revoked');
```

You check `tokenVersion` at the *refresh* boundary (cheap, infrequent) rather than on every access-token verify, so short-lived access tokens die within their TTL and refresh is blocked immediately. This gives near-instant global logout with one integer column.

**Interview trap:** "That reintroduces a DB lookup, so why bother with JWTs?" You only look up on *refresh* (every ~10 min), not on every API call. The high-frequency path stays stateless; the low-frequency path carries the revocation semantics. That is the pragmatic hybrid every mature JWT deployment converges on.

---

### Q19. What is token binding / sender-constrained tokens, and when would you recommend it?

**Answer:** A plain JWT/opaque token is a **bearer** token: whoever holds it can use it. **Sender-constrained** tokens bind the token to a client key so a stolen token is useless without the key. Two mechanisms:

- **mTLS-bound (RFC 8705):** the token embeds a hash of the client's TLS certificate (`cnf.x5t#S256`); the resource server checks the presented client cert matches.
- **DPoP (RFC 9449):** the client signs each request with a proof-of-possession JWT tied to a key; the access token carries the key thumbprint.

Recommend these for high-value APIs (financial, admin) and confidential clients where token exfiltration is a real risk. For most web apps, short TTL + rotation + HttpOnly cookies is proportionate; DPoP is the step-up when leakage tolerance is near zero.

---

### Q20. Design a secure password-reset flow. What are the failure modes?

**Answer:** Password reset is a *parallel authentication path* and is attacked precisely because it bypasses the password. It must be as hardened as login itself.

Requirements:

1. **High-entropy, single-use, short-lived token** (≥256 bits, TTL 15–30 min), stored **hashed** at rest like a refresh token.
2. **The token is the sole authority** — it must resolve the user itself; never trust a user id passed alongside it in the URL.
3. **No enumeration** — the "request reset" endpoint returns an identical response whether or not the email exists.
4. **On successful reset:** invalidate the token, bump `tokenVersion`, and revoke all refresh families ("a reset means I may have lost control — kick everyone out").

```ts
import { createHash, randomBytes } from 'node:crypto';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

// Step 1 — request. Uniform response; token only in the emailed link.
async function requestReset(email: string) {
  const user = await users.findByEmail(email);
  if (user) {
    const raw = randomBytes(32).toString('base64url'); // 256-bit token
    await resets.insert({ userId: user.id, tokenHash: sha256(raw),
      expiresAt: new Date(Date.now() + 30 * 60_000) });
    await mailer.send(user.email, `https://acme.com/reset?token=${raw}`);
  }
  return { message: 'If an account exists, a reset link was sent.' }; // no enumeration
}

// Step 2 — consume. Single-use, expiry-checked, then nuke sessions.
async function performReset(rawToken: string, newPassword: string) {
  const row = await resets.findByHash(sha256(rawToken)); // token resolves the user
  if (!row || row.used || row.expiresAt < new Date()) throw new AuthError('invalid_reset');
  await resets.markUsed(row.id);
  await users.update(row.userId, {
    passwordHash: await argon2.hash(newPassword, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 }),
    tokenVersion: /* bump */ undefined, // increment atomically in real code
  });
  await refreshTokens.revokeAllForUser(row.userId); // logout everywhere
}
```

**Production war story:** A customer's reset link was `/reset?uid=1042&token=...`. The server validated the *token* but then updated the password for whatever `uid` the URL carried. An attacker requested a reset for their *own* account (getting a genuinely valid token), then swapped `uid` to a victim's id — the token verified and the victim's password was overwritten. The fix was deleting `uid` from the flow entirely: the reset row already knows whose reset it is. **A reset token must resolve the account itself; never accept an identity hint from the request.**

**Interview trap:** "We email a 6-digit reset code." Six digits is ~20 bits — brute-forceable unless you strictly cap attempts (e.g., 5) and expire fast. If you use short codes, rate-limit and lock hard; otherwise use a long random token in the link.

---

### Q21. How do you prevent timing attacks and username enumeration across all auth endpoints?

**Answer:** Two related leaks:

1. **Timing leak on comparison.** `===` on secrets (API keys, tokens, MFA codes) short-circuits on the first differing byte, leaking length/prefix via response time. Use `crypto.timingSafeEqual`. (argon2/bcrypt `verify` are already constant-time internally; the risk is in *your* comparisons.)
2. **Enumeration via divergent work or messages.** If "unknown email" returns instantly while "wrong password" runs a 250ms hash, the timing delta enumerates valid accounts — and distinct messages ("no such user" vs "wrong password") do it outright.

```ts
import { timingSafeEqual } from 'node:crypto';

// A decoy hash generated at boot so the "user missing" path costs the same
// as the "user found, wrong password" path.
const DECOY_HASH = await argon2.hash('decoy-never-matches', { type: argon2.argon2id });

// FIXED — always verify (real or decoy), uniform error, uniform timing.
async function login(email: string, password: string) {
  const user = await users.findByEmail(email);
  const hash = user?.passwordHash ?? DECOY_HASH;
  const ok = await argon2.verify(hash, password).catch(() => false); // constant work
  if (!user || !ok) throw new AuthError('invalid_email_or_password'); // one message
  return user;
}

// Constant-time compare for your own secret checks (API keys, tokens):
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a), bb = Buffer.from(b);
  if (ab.length !== bb.length) return false; // length mismatch is acceptable to reveal
  return timingSafeEqual(ab, bb);
}
```

**The residual leak:** even a decoy hash won't help if *registration* or *reset* re-introduce enumeration ("this email is already registered"). Standardize generic responses ("if this account exists, we sent a link") across **every** auth-adjacent endpoint — login, registration, reset, MFA — not just login.

**Interview trap:** "We hash the password so the compare is already constant-time." That covers the password check, but MFA codes, reset tokens, and API keys compared with `===` elsewhere in the codebase are the real timing surface. Audit *every* secret comparison, not just the password path.

---

### Q22. Summary — the auth decision checklist an FDE brings to a customer.

**Answer:**

- **Session vs JWT:** need instant revocation / long sessions → server sessions (or JWT + stateful refresh checkpoint). Stateless service-to-service, short TTL → JWT.
- **Algorithm:** same service signs+verifies → HS256; others verify → RS256/ES256. Always pin `algorithms`.
- **Never** let the token choose its algorithm, allow `alg:none`, or use `kid`/`jku` as an unvalidated lookup.
- **Refresh:** rotate + reuse detection + hash tokens at rest + revoke families.
- **Passwords:** argon2id (or bcrypt 12 with pre-hash); async only; tune `UV_THREADPOOL_SIZE`; rate-limit logins.
- **MFA:** push toward WebAuthn/passkeys (phishing-resistant); TOTP as a fallback with replay protection.
- **Cookies:** HttpOnly + Secure + SameSite=Lax + `__Host-` prefix; regenerate session on login; never mutate state on GET.
- **Validate** every claim: signature, exp/nbf, iss, aud.

The consistent theme: **push authority to a place you can revoke, and never trust attacker-controllable inputs (alg, kid, session id) to decide how you verify.**
