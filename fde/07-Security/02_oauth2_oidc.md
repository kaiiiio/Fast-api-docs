# OAuth2 & OIDC — Senior/Staff FDE Interview Prep

OAuth2 is a **delegated authorization** framework; OIDC is an **authentication** layer bolted on top of it. As a Forward Deployed Engineer you will integrate against customer IdPs (Okta, Entra ID, Auth0, Keycloak, PingFederate) more often than you will build one, so interviewers probe whether you understand the protocol deeply enough to debug a broken integration at a customer site — not just paste an SDK snippet. Everything below is framed defensively: how the flows work, how they break, and how to validate tokens so your service is not the weak link.

---

### Q1. What problem does OAuth2 actually solve, and what are the four roles? Why is "OAuth is authentication" wrong?

**Answer:**

Before OAuth, if app A wanted to read your data in service B, you gave app A your B password (the "password anti-pattern"). That granted unlimited, unrevocable, unauditable access. OAuth2 (RFC 6749) solves **delegated authorization**: a user grants a third-party client *scoped, revocable, time-limited* access to a resource without sharing credentials.

The four roles:

| Role | Definition | Example |
|---|---|---|
| **Resource Owner** | The entity that owns the data (usually the end user) | You |
| **Client** | The app requesting access on the owner's behalf | A CI tool reading your GitHub repos |
| **Authorization Server (AS)** | Issues tokens after authenticating/authorizing | Okta, Auth0, Keycloak |
| **Resource Server (RS)** | The API holding the data; accepts access tokens | Your backend API |

"OAuth is authentication" is wrong because an access token proves **the client was authorized to do something**, not **who the user is right now**. A bare OAuth2 access token has no standardized claims about user identity, no guarantee the user is present, and no audience contract for the client to consume it. Apps that treated "I got a valid access token" as "the user logged in" were exploitable: an attacker could take an access token issued to *their* malicious app for victim data and replay it into *your* app's "login with X" endpoint. OIDC exists precisely to fix this by adding an ID token with `aud`, `nonce`, and `iss` semantics (see Q10).

**Interview trap:** If asked "what grant type do you use for login?", the trap is answering with a bare OAuth2 grant. The correct answer is "Authorization Code + PKCE **with OIDC** (`scope=openid`), because login is authentication and OAuth2 alone does not do authentication."

---

### Q2. Walk through Authorization Code + PKCE end-to-end with the actual HTTP requests.

**Answer:**

This is *the* flow for anything with a user in a browser: SPAs, mobile apps, and server-side web apps alike. The code travels through the front channel (browser redirects, observable), the tokens travel through the back channel (direct TLS POST, not observable), and PKCE cryptographically binds the two legs together.

```
+---------+                                   +----------------+                +----------------+
| Browser |                                   |  Client (app)  |                |  Auth Server   |
+----+----+                                   +-------+--------+                +--------+-------+
     |                                                |                                  |
     |  1. User clicks "Log in"                       |                                  |
     |----------------------------------------------->|                                  |
     |                                                | 2. Generate code_verifier (random)
     |                                                |    code_challenge = B64URL(SHA256(verifier))
     |                                                |    Store verifier + state + nonce in session
     |  3. 302 -> /authorize?code_challenge=...       |                                  |
     |<-----------------------------------------------|                                  |
     |  4. GET /authorize (front channel)                                                |
     |---------------------------------------------------------------------------------->|
     |                                                |     5. AS authenticates user,    |
     |                                                |        stores code_challenge     |
     |  6. 302 -> https://app/callback?code=...&state=...                                |
     |<----------------------------------------------------------------------------------|
     |  7. GET /callback?code=...&state=...           |                                  |
     |----------------------------------------------->|                                  |
     |                                                | 8. POST /token (back channel)    |
     |                                                |    code + code_verifier          |
     |                                                |--------------------------------->|
     |                                                |     9. AS: SHA256(verifier)      |
     |                                                |        == stored challenge?      |
     |                                                | 10. access_token, id_token,      |
     |                                                |     refresh_token                |
     |                                                |<---------------------------------|
     | 11. Set session cookie / proceed               |                                  |
     |<-----------------------------------------------|                                  |
```

**Step 3–4 — the authorization request** (front channel, browser redirect):

```http
GET /authorize?response_type=code
    &client_id=spa-client-7f3a
    &redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback
    &scope=openid%20profile%20email%20orders%3Aread
    &state=af0ifjsldkj-9x1
    &nonce=n-0S6_WzA2Mj
    &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
    &code_challenge_method=S256 HTTP/1.1
Host: idp.example.com
```

**Step 6 — the callback** (front channel):

```http
HTTP/1.1 302 Found
Location: https://app.example.com/callback?code=SplxlOBeZQQYbYS6WxSbIA&state=af0ifjsldkj-9x1
```

**Step 8 — the token exchange** (back channel, direct server-to-server or fetch from SPA):

```http
POST /token HTTP/1.1
Host: idp.example.com
Content-Type: application/x-www-form-urlencoded
Authorization: Basic c3BhLWNsaWVudC03ZjNhOnMzY3IzdA==

grant_type=authorization_code
&code=SplxlOBeZQQYbYS6WxSbIA
&redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback
&code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
```

(The `Authorization: Basic` header carries the client secret for confidential clients; public clients — SPAs, mobile — omit it and rely on PKCE alone.)

**Step 10 — the token response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: no-store

{
  "access_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjIwMjYtMDYta2V5In0...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "8xLOxBtZp8",
  "id_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjIwMjYtMDYta2V5In0...",
  "scope": "openid profile email orders:read"
}
```

Key point to say out loud in an interview: **the authorization code is single-use, short-lived (typically 30–60 s), and worthless without the code_verifier**. Even if an attacker steals the code from the redirect (browser history, malicious app claiming the redirect URI on mobile, network logs), they cannot redeem it because they never saw the verifier — it never left the client's memory/session.

---

### Q3. Why is PKCE now required even for confidential clients that have a client secret?

**Answer:**

PKCE (RFC 7636, "Proof Key for Code Exchange") was originally designed for **public clients** (mobile/SPA) that cannot keep a secret. But OAuth 2.1 and the current Security BCP (RFC 9700) mandate it for **all** clients, including confidential ones. Three reasons:

1. **Authorization code injection.** A client secret proves *which client* is calling `/token` — it does **not** prove that the code being redeemed belongs to *this browser session*. Attack: attacker starts a login on their own machine, captures the code destined for their session, then injects it into the victim's session (e.g., via a forged callback request). The confidential client happily exchanges it — with its own valid secret — and now the victim's session is bound to the attacker's account (session fixation / login CSRF), or vice versa. PKCE kills this: the verifier stored in the *victim's* session will not hash to the challenge stored against the *attacker's* code, and the AS rejects the exchange.

2. **Defense in depth against code leakage.** Codes leak through front-channel surfaces (proxy logs, `Referer`, browser history, open redirects chained onto the callback). The secret does not help there; PKCE makes the leaked code unredeemable.

3. **One flow to rule them all.** Removing conditional logic ("PKCE only if public client") removes an entire class of downgrade misconfiguration. Also insist the AS enforces `code_challenge_method=S256` and rejects `plain` — a MITM who can read the authorization request can replay a `plain` challenge as the verifier.

**Interview trap:** "Does PKCE replace the client secret?" No. They authenticate different things: the secret authenticates the *client software/deployment*, PKCE binds the *individual authorization transaction*. Confidential clients should use both. And PKCE does not replace `state` entirely either — `state` still protects the client's callback endpoint from CSRF before any token call happens (though OAuth 2.1 acknowledges PKCE covers the main CSRF case at the token layer; belt and suspenders in regulated environments).

---

### Q4. How exactly are `code_verifier` and `code_challenge` generated? Show real code.

**Answer:**

Per RFC 7636:

- `code_verifier`: a cryptographically random string, 43–128 characters, from the unreserved set `[A-Z a-z 0-9 - . _ ~]`. In practice: 32 random bytes, base64url-encoded without padding → exactly 43 chars.
- `code_challenge` (S256): `BASE64URL-ENCODE(SHA256(ASCII(code_verifier)))` — again no padding.
- `code_challenge_method=S256`. Never `plain` (which sends the verifier itself as the challenge, so anyone who saw the authorization request can redeem the code).

```typescript
// pkce.ts — Node.js 18+, no dependencies
import { randomBytes, createHash } from "node:crypto";

export function generateCodeVerifier(): string {
  // 32 bytes -> 43-char base64url string (RFC 7636 minimum length, max entropy per char)
  return randomBytes(32).toString("base64url");
}

export function codeChallengeS256(verifier: string): string {
  return createHash("sha256").update(verifier, "ascii").digest("base64url");
}

// Usage at login initiation — persist `verifier` in the user's session, send only
// `challenge` + `code_challenge_method=S256` in the /authorize redirect:
const verifier = generateCodeVerifier();       // "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
const challenge = codeChallengeS256(verifier); // "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
```

Two implementation details that separate senior candidates:

- **Storage:** the verifier must be bound to the user agent that started the flow — server session keyed by an HttpOnly cookie, or `sessionStorage` in a SPA (not `localStorage`; you don't want it surviving into other tabs/windows and you want it gone when the tab closes).
- **One verifier per authorization request.** Reusing a verifier across attempts turns it into a static secret and re-opens replay windows.

---

### Q5. Explain the Client Credentials grant. When is it correct, and what are its limits?

**Answer:**

Client Credentials is the machine-to-machine (M2M) grant: **no user, no browser, no redirect**. A backend service authenticates *as itself* and receives an access token for calling another API. Nightly batch jobs, service-to-service calls across trust boundaries, a partner's server calling your API.

```http
POST /token HTTP/1.1
Host: idp.example.com
Content-Type: application/x-www-form-urlencoded
Authorization: Basic YmlsbGluZy1zdmM6djRlcnlsMG5nc2VjcjN0

grant_type=client_credentials
&scope=invoices:write%20invoices:read
&audience=https%3A%2F%2Fapi.example.com
```

The response is a standard token response (`access_token`, `token_type`, `expires_in`, `scope`) — with one deliberate omission covered below. Rules of engagement:

- **No refresh token.** The client can always re-authenticate; a refresh token would just be a second long-lived secret. Cache the access token until near expiry and re-request.
- The resulting token has **no user context** (`sub` is the client ID). If your API mixes user-facing and M2M callers, authorization logic must handle "no user" explicitly — a classic bug is code that assumes `sub` maps to a user row and grants weird defaults for service principals.
- Only for **confidential** clients. Never embed client credentials in a mobile app or SPA.
- Prefer `private_key_jwt` or mTLS over shared secrets where the IdP supports it (see Q20).

**Interview trap:** "Our cron job acts on behalf of users, can we use client credentials and just pass a `userId` parameter?" That reintroduces the confused-deputy problem OAuth exists to prevent — the API can no longer distinguish "user consented" from "service asserted". The right answers are offline access via refresh tokens obtained with user consent, or token exchange (RFC 8693) with explicit `act`/`may_act` semantics.

---

### Q6. Walk through the Device Authorization grant step by step.

**Answer:**

RFC 8628, for input-constrained devices: smart TVs, CLIs, IoT, kiosks — anything where typing a password or hosting a redirect URI is impractical. The trick: **the device polls the back channel while the user completes the front channel on a different device.**

Full sequence:

**1. Device requests a device code:**

```http
POST /device_authorization HTTP/1.1
Host: idp.example.com
Content-Type: application/x-www-form-urlencoded

client_id=tv-app-91b2&scope=openid%20profile%20playback
```

**2. AS responds with codes and a verification URI:**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "device_code": "GmRhmhcxhwAzkoEqiMEg_DnyEysNkuNhszIySk9eS",
  "user_code": "WDJB-MJHT",
  "verification_uri": "https://idp.example.com/device",
  "verification_uri_complete": "https://idp.example.com/device?user_code=WDJB-MJHT",
  "expires_in": 900,
  "interval": 5
}
```

**3. Device displays** `Go to idp.example.com/device and enter code WDJB-MJHT` (and typically a QR code of `verification_uri_complete`).

**4. Meanwhile, the device polls the token endpoint** every `interval` seconds:

```http
POST /token HTTP/1.1
Host: idp.example.com
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:device_code
&device_code=GmRhmhcxhwAzkoEqiMEg_DnyEysNkuNhszIySk9eS
&client_id=tv-app-91b2
```

While the user has not finished:

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{ "error": "authorization_pending" }
```

If the device polls too fast: `{ "error": "slow_down" }` → **add 5 seconds to the interval** (a detail interviewers love). Other terminal errors: `access_denied` (user rejected), `expired_token` (user took longer than `expires_in`).

**5. User, on their phone/laptop**, opens the URL, authenticates with the IdP (full auth code + PKCE flow happens *there*, with MFA etc.), and confirms the user code matches.

**6. Next poll succeeds:**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{ "access_token": "eyJ...", "token_type": "Bearer", "expires_in": 900, "refresh_token": "b6h...", "id_token": "eyJ..." }
```

Security consideration to volunteer: **device-flow phishing** — attackers initiate the flow themselves, then trick a victim into entering the attacker's `user_code` at the legitimate IdP ("Microsoft support: please confirm this code"). The victim authorizes the *attacker's* device. Mitigations: show client name/location on the confirmation page, require the user to type the code (don't auto-approve `verification_uri_complete` without a click), short code expiry, and IdP-side anomaly detection. This is not theoretical — device-code phishing was a documented technique against Entra ID tenants used by real threat actors.

---

### Q7. What was the Implicit flow and precisely why is it deprecated?

**Answer:**

Implicit (`response_type=token`) was designed circa 2012 for SPAs when browsers had no CORS: since the SPA couldn't call `/token` cross-origin, the AS returned the access token **directly in the redirect URL fragment**, skipping the code exchange:

```http
HTTP/1.1 302 Found
Location: https://app.example.com/callback#access_token=2YotnFZFEjr1zCsicMWpAA&token_type=Bearer&expires_in=3600&state=xyz
```

Why it is deprecated (removed entirely in OAuth 2.1):

1. **Token in the URL.** Fragments don't hit the server in the request line, but they land in browser history, can be leaked by JavaScript on the page (any XSS or malicious third-party script reads `location.hash`), get copied when users share URLs, and can leak via redirects/`Referer` in some flows. A bearer token in a URL is a bearer token sprayed across surfaces you don't control.
2. **No client authentication and no PKCE possible.** There is no `/token` call at all, so there is nothing to bind the token to the requesting client or transaction. Anyone who obtains the redirect obtains the token.
3. **No refresh tokens.** Implicit could not safely issue refresh tokens, so apps used hidden-iframe "silent renew" hacks that broke when browsers shipped third-party-cookie blocking (ITP) — an operational reason it died in practice.
4. **Token injection/replay.** Because the token arrives via the front channel with no transaction binding, an attacker can take a token obtained anywhere and inject it into another app's callback; the receiving app can't tell it wasn't issued for this flow.

The fix that made Implicit obsolete: **CORS** (SPAs can now POST to `/token` directly) plus **PKCE** (safe code exchange without a secret). Modern answer: SPAs use Authorization Code + PKCE, ideally behind a **BFF** (backend-for-frontend) so tokens never live in JavaScript at all.

---

### Q8. What was ROPC (Resource Owner Password Credentials) and why is it deprecated?

**Answer:**

ROPC (`grant_type=password`) let the client collect the user's username and password directly and swap them for tokens:

```http
POST /token HTTP/1.1
Host: idp.example.com
Content-Type: application/x-www-form-urlencoded

grant_type=password&username=alice%40example.com&password=hunter2&client_id=legacy-app&scope=openid
```

It existed purely as a migration crutch — "you were already storing passwords; at least trade them for tokens." Why it is dead (prohibited by RFC 9700 / OAuth 2.1):

1. **It trains users to type IdP credentials into third-party apps** — the exact phishing behavior the entire redirect-based architecture exists to eliminate. Users can never distinguish a legitimate ROPC client from a credential-harvesting one, because the UX is identical.
2. **The client sees the password.** Full stop. It can log it, leak it, replay it. Delegation without credential sharing was OAuth's founding purpose; ROPC violates it by design.
3. **It breaks the IdP's authentication capabilities:** no MFA, no WebAuthn/passkeys, no adaptive/risk-based auth, no federation (the IdP can't redirect to a customer's upstream SAML provider mid-password-grant), no consent screen, no SSO session establishment.
4. **Credential-stuffing accelerant:** `/token` with ROPC enabled is a perfect password-spraying oracle — one POST per guess, no browser, no JS challenges.

FDE-relevant nuance: you will still find ROPC in the wild in **legacy service integration tests and old first-party mobile apps**. The migration story you should be able to tell: mobile → Authorization Code + PKCE via system browser (`ASWebAuthenticationSession` / Custom Tabs, per RFC 8252); tests → client credentials for M2M paths, or pre-seeded sessions/test IdPs for user paths; CLIs → device flow or localhost-redirect auth code flow.

---

### Q9. What exactly does OIDC add on top of OAuth2? Name the concrete pieces.

**Answer:**

OIDC (OpenID Connect 1.0) is a thin, rigorously specified **identity layer** over OAuth2's Authorization Code machinery. Concretely it adds:

1. **The ID token** — a JWT with standardized claims (`iss`, `sub`, `aud`, `exp`, `iat`, `nonce`, `auth_time`, `amr`, `acr`, plus profile claims) that the **client** validates to establish *who authenticated, when, how, and for whom*. This is the missing "authentication" artifact from Q1.
2. **The `openid` scope** — requesting it is what turns an OAuth2 flow into an OIDC flow and makes the AS return an ID token.
3. **The UserInfo endpoint** — a standardized RS at the IdP returning user claims for a given access token (Q11).
4. **Discovery** — `GET https://idp.example.com/.well-known/openid-configuration` returns a JSON document with every endpoint (`authorization_endpoint`, `token_endpoint`, `jwks_uri`, `userinfo_endpoint`), supported algorithms, scopes, and claims. This is why modern integrations need one URL instead of six config values.
5. **`nonce`** — binds the ID token to the client session that initiated the flow (replay defense, Q16).
6. **Standardized logout** (RP-initiated logout, back-channel logout) and session management — messy in practice but at least specified.
7. **Dynamic client registration** and **request objects (JAR/PAR)** for higher-assurance profiles (FAPI in open banking).

The one-liner worth memorizing: **OAuth2 issues keys to rooms (access tokens); OIDC issues a verified statement about who picked up the keys (ID token).**

---

### Q10. ID token vs access token — audience, purpose, and the two mistakes every interviewer probes for.

**Answer:**

| | **ID token** | **Access token** |
|---|---|---|
| Consumer / audience | The **client** (`aud` = client_id) | The **resource server / API** (`aud` = API identifier) |
| Purpose | Proof of authentication event; user claims | Proof of authorization to call an API |
| Format | Always a JWT (spec-mandated) | Opaque string **or** JWT — client must not care |
| Contains | `sub`, `nonce`, `auth_time`, profile claims | Scopes/permissions; whatever the AS puts in |
| Sent to APIs? | **Never** | Yes, `Authorization: Bearer ...` |
| Validated by | The client (signature, `iss`, `aud`, `exp`, `nonce`) | The RS (JWT validation or introspection) |
| Lifetime semantics | Moment-in-time login proof | Sliding window of API access |

**Mistake #1 — using the ID token to call an API.** The ID token's `aud` is the *client ID*, so a correctly written API must reject it (audience mismatch). Worse, if the API sloppily accepts it: ID tokens carry no scopes, so authorization becomes all-or-nothing; ID tokens are routinely handled by front-end code and logged by analytics; and any other client of the same IdP could mint an ID token for the same user and call your API with it — cross-client impersonation. If you see `Authorization: Bearer <id_token>` in a customer integration, that's a finding.

**Mistake #2 — introspecting/decoding an access token you don't own.** If your client receives an access token destined for *someone else's* API (Google's, the customer's ERP), it is an **opaque capability** from your perspective — even if it happens to look like a JWT. Its format is a private contract between the AS and that RS; Google, Auth0, and Entra all reserve the right to change encoding, encrypt, or shorten tokens. Client code that does `jwt.decode(access_token).email` to get user info is a time bomb (and it skips signature validation, so it's also spoofable). Need user claims in the client? Read the **ID token** or call **UserInfo**. Only the RS that is the token's *audience* validates the access token.

**Interview trap:** "The access token from our IdP is a JWT and contains `email`, so we just read it in the SPA — is that fine?" No: it works until the IdP turns on token encryption, shrinks the token to opaque, or rotates claim names — all of which are within their contract. It also normalizes skipping validation. The claims contract for clients is ID token + UserInfo, nothing else.

---

### Q11. What is the UserInfo endpoint and when do you use it instead of ID token claims?

**Answer:**

`userinfo_endpoint` (from discovery) is an OAuth2-protected resource at the IdP that returns claims about the user associated with the presented access token (which must include the `openid` scope):

```http
GET /userinfo HTTP/1.1
Host: idp.example.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjIwMjYtMDYta2V5In0...
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "sub": "auth0|5f7c8ec7c33c6c004bbafe82",
  "name": "Alice Rivera",
  "email": "alice@example.com",
  "email_verified": true
}
```

When to prefer it over ID token claims:

- **Keeping ID tokens small.** Some IdPs (and the OIDC spec's response-type nuances) omit profile claims from the ID token when an access token is also issued, expecting you to call UserInfo.
- **Freshness.** ID token claims are frozen at authentication time; UserInfo reflects the current directory state (name change, revoked email verification).
- **Large/optional claim sets** — groups, entitlements — that would bloat every token.

Two rules: **always compare `sub` from UserInfo with `sub` from the ID token** (the spec requires the client to reject mismatches — defends against token substitution), and treat UserInfo as *the IdP's* API: it authenticates the access token, so this is the one legitimate case where an access token conveys identity — because the IdP is simultaneously the AS and the RS for it.

---

### Q12. Show correct JWT access-token validation on a resource server in TypeScript. What exactly must be checked?

**Answer:**

The non-negotiable checklist for an RS validating a JWT access token:

1. **Signature** against the IdP's published keys (JWKS), selecting the key by `kid` — never trust an embedded key or `jku`/`x5u` header from the token itself.
2. **Algorithm allowlist** — pin to what your IdP uses (e.g. `RS256`/`ES256`). Rejecting `alg: none` and HS256-with-public-key confusion attacks falls out of this.
3. **`iss`** — exact string match against the expected issuer URL.
4. **`aud`** — your API's identifier must be present. This is the check most home-grown code skips, and it's what stops tokens minted for *other* APIs at the same IdP from working against yours.
5. **`exp` / `nbf`** with small clock tolerance (≤ 60 s).
6. Then **authorization**: scopes/roles/tenant claims — a valid token is authentication of the caller, not permission for the action.

**Vulnerable version** (all four classic bugs in six lines):

```typescript
// VULNERABLE — do not ship
import jwt from "jsonwebtoken";

app.use((req, _res, next) => {
  const token = req.headers.authorization?.slice(7) ?? "";
  // Bug 1: decode() does NOT verify the signature — anyone can forge this.
  // Bugs 2-4: no issuer check, no audience check, no algorithm pinning.
  (req as any).user = jwt.decode(token);
  next();
});
```

**Fixed version** with `jose` (see Q13 for what `createRemoteJWKSet` buys you):

```typescript
// auth.ts — Node.js 18+, `npm i jose express`
import { createRemoteJWKSet, jwtVerify, errors as joseErrors } from "jose";
import type { Request, Response, NextFunction } from "express";

const ISSUER = "https://idp.example.com/";                 // must match `iss` EXACTLY, incl. trailing slash
const AUDIENCE = "https://api.example.com";                // your API identifier as registered at the IdP
const JWKS = createRemoteJWKSet(
  new URL("https://idp.example.com/.well-known/jwks.json"),
  { cooldownDuration: 30_000, cacheMaxAge: 600_000 }       // see Q13
);

export type AuthContext = { sub: string; scopes: string[]; claims: Record<string, unknown> };

export async function verifyAccessToken(token: string): Promise<AuthContext> {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: ISSUER,
    audience: AUDIENCE,
    algorithms: ["RS256"],       // pin — never accept whatever the header claims
    clockTolerance: 30,          // seconds of allowed skew for exp/nbf/iat
  });
  return {
    sub: payload.sub as string,
    scopes: typeof payload.scope === "string" ? payload.scope.split(" ") : [],
    claims: payload,
  };
}

export function requireScope(required: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).set("WWW-Authenticate", 'Bearer realm="api"').json({ error: "missing_token" });
    }
    try {
      const auth = await verifyAccessToken(header.slice("Bearer ".length));
      if (!auth.scopes.includes(required)) {
        return res.status(403).json({ error: "insufficient_scope", required });
      }
      res.locals.auth = auth;
      next();
    } catch (err) {
      // Log the *reason* server-side; return only a category to the caller.
      const code = err instanceof joseErrors.JWTExpired ? "token_expired" : "invalid_token";
      return res.status(401).set("WWW-Authenticate", 'Bearer error="invalid_token"').json({ error: code });
    }
  };
}

// Usage: app.get("/orders", requireScope("orders:read"), handler);
```

**Interview trap:** "The token verified — are we done?" No. `jwtVerify` succeeding means the IdP issued this token, to this audience, and it hasn't expired. It does **not** mean the caller may perform this action on this resource — tenant isolation (`org_id` claim vs. resource's tenant) and object-level authorization (is this *alice's* order?) are still your job. Skipping the second half is how BOLA/IDOR vulnerabilities ship behind "we use OAuth."

---

### Q13. How do JWKS caching and signing-key rotation work? What does "refetch on unknown kid" mean and why does it matter?

**Answer:**

The IdP publishes its public signing keys at `jwks_uri` (`GET /.well-known/jwks.json`):

```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: max-age=600

{
  "keys": [
    { "kty": "RSA", "kid": "2026-06-key", "use": "sig", "alg": "RS256", "n": "0vx7agoebGcQ...", "e": "AQAB" },
    { "kty": "RSA", "kid": "2026-07-key", "use": "sig", "alg": "RS256", "n": "zLW9pQh81xTa...", "e": "AQAB" }
  ]
}
```

Each JWT header carries a `kid` (`{"alg":"RS256","kid":"2026-06-key"}`); the RS selects the matching JWK to verify. Rotation works by **overlap**: the IdP publishes the *next* key alongside the current one, later starts signing with the new key, and only removes the old key after every token signed with it has expired.

The RS-side algorithm you must be able to describe:

1. **Cache** the JWKS in memory with a TTL (5–15 min typical). Fetching JWKS per request adds latency and makes the IdP a hard availability dependency for every API call.
2. **On token arrival**, look up `kid` in the cache. Hit → verify.
3. **Unknown `kid` → refetch the JWKS once, then retry the lookup.** This is the rotation-critical step: when the IdP starts signing with a fresh key mid-TTL, the first token with the new `kid` triggers a refresh instead of a spurious 401 storm.
4. **Rate-limit/cool down refetches** (e.g., at most one forced refetch per 30–60 s). Otherwise an attacker sending garbage tokens with random `kid` values turns your fleet into a DoS cannon aimed at the IdP's JWKS endpoint — and at your own latency.
5. **Serve stale on fetch failure**: if the JWKS refresh fails but you have cached keys, keep verifying with the cache rather than failing closed on all traffic. (Failing closed on *unknown* kids is still correct.)

`jose`'s `createRemoteJWKSet` implements exactly this: caching (`cacheMaxAge`), refetch-on-unknown-`kid`, and refetch cooldown (`cooldownDuration`). That's why the Q12 code has no manual key plumbing. If an interviewer asks you to sketch it by hand:

```typescript
// Conceptual hand-rolled version — in production, use jose's createRemoteJWKSet.
import { importJWK, type JWK, type KeyLike } from "jose";

class JwksCache {
  private keys = new Map<string, KeyLike | Uint8Array>();
  private fetchedAt = 0;
  private lastForcedRefetch = 0;
  constructor(private jwksUri: string, private ttlMs = 600_000, private cooldownMs = 30_000) {}

  async getKey(kid: string): Promise<KeyLike | Uint8Array> {
    const now = Date.now();
    if (now - this.fetchedAt > this.ttlMs) await this.refresh();
    if (!this.keys.has(kid) && now - this.lastForcedRefetch > this.cooldownMs) {
      this.lastForcedRefetch = now;       // unknown kid: likely rotation — refetch once
      await this.refresh();
    }
    const key = this.keys.get(kid);
    if (!key) throw new Error(`No signing key for kid=${kid}`); // fail closed
    return key;
  }

  private async refresh(): Promise<void> {
    const res = await fetch(this.jwksUri);
    if (!res.ok) {
      if (this.keys.size > 0) return;     // serve stale rather than hard-fail
      throw new Error(`JWKS fetch failed: ${res.status}`);
    }
    const { keys } = (await res.json()) as { keys: (JWK & { kid: string })[] };
    const next = new Map<string, KeyLike | Uint8Array>();
    for (const jwk of keys) {
      if (jwk.use !== "enc") next.set(jwk.kid, await importJWK(jwk, jwk.alg ?? "RS256"));
    }
    this.keys = next;
    this.fetchedAt = Date.now();
  }
}
```

**Production war story:** A customer's payments API went hard-down for 40 minutes after their IdP performed a routine signing-key rotation. Root cause: a hand-rolled validator fetched JWKS **once at process boot** and cached it forever. New tokens arrived with the new `kid`, lookup failed, every request 401'd, and the on-call rolled the API pods — which "fixed" it (boot-time fetch got the new key) and cemented the wrong lesson ("restart when auth breaks"). The durable fix was the algorithm above; the deeper fix was replacing the hand-rolled code with `createRemoteJWKSet` and adding a canary alert on 401-rate-by-kid so rotation problems page *before* customers call.

---

### Q14. Why must redirect URI validation be exact-match? Demonstrate the vulnerable pattern and the attack.

**Answer:**

The `redirect_uri` is where the AS sends the authorization code. If an attacker can get the AS to send the code to a URL they control, they win the flow (subject to PKCE — but don't rely on a single control). The AS must compare the requested `redirect_uri` against registered values with **exact string comparison** (RFC 9700 requirement). No prefix matching, no wildcards, no "same domain is fine."

**Vulnerable registration/validation:**

```typescript
// VULNERABLE — AS-side pseudo-validation seen in real homegrown IdPs
function isAllowedRedirect(requested: string, registered: string): boolean {
  return requested.startsWith(registered); // prefix match — exploitable
}
// registered: https://app.example.com/callback
// attacker passes: https://app.example.com/callback/../logout?next=https://evil.com
// or: https://app.example.com.evil.io/callback   (if matching on substring/host prefix)
```

And the wildcard variant: registering `https://*.example.com/*` means one XSS or subdomain takeover **anywhere** in the domain (a forgotten `staging.example.com` CNAME to a deleted S3 bucket) becomes full account takeover via OAuth.

**The classic chained attack** — exact match at the AS but an open redirect *inside* the registered callback path:

```
1. Attacker crafts: /authorize?...&redirect_uri=https://app.example.com/callback
   (legit, passes AS validation)
2. app.example.com/callback contains: if (params.returnTo) res.redirect(params.returnTo)
3. Attacker sends victim a login link with returnTo=https://evil.com
4. Code arrives at /callback?code=XYZ&returnTo=..., app 302s to evil.com,
   and the code leaks via the Referer header or because the app forwarded query params.
```

**Fixed:**

```typescript
// Client-side callback: never redirect based on unvalidated input.
const ALLOWED_POST_LOGIN_PATHS = new Set(["/dashboard", "/settings", "/orders"]);

app.get("/callback", async (req, res) => {
  // ... state check + token exchange (Q16) ...
  const returnTo = typeof req.query.returnTo === "string" ? req.query.returnTo : "/";
  // Allow only same-origin, allowlisted relative paths. Reject absolute URLs,
  // protocol-relative URLs (//evil.com), and backslash tricks (/\evil.com).
  const safe =
    returnTo.startsWith("/") &&
    !returnTo.startsWith("//") &&
    !returnTo.includes("\\") &&
    ALLOWED_POST_LOGIN_PATHS.has(returnTo.split("?")[0]);
  res.redirect(safe ? returnTo : "/dashboard");
});
```

AS-side rules to recite: exact string match against a finite registered list; `https` only (except `http://localhost`/loopback for native apps per RFC 8252); no wildcards; no open query parameters echoed into `Location`.

**Interview trap:** "PKCE makes stolen codes useless, so is loose redirect URI matching acceptable now?" No — defense in depth is the expected answer, and there are concrete gaps: the leaked redirect also carries `state` (enabling CSRF-style session attacks), leaks that the user has an account with that IdP, and in flows where PKCE is misconfigured or downgraded (`plain`, or an AS that doesn't enforce challenge-at-exchange), the code is live again.

---

### Q15. Explain `state` and `nonce`. What attack does each stop, and how are they different?

**Answer:**

They look similar (random values sent in the authorize request, checked later) but defend different layers:

| | `state` | `nonce` |
|---|---|---|
| Layer | OAuth2 (the redirect/callback) | OIDC (the ID token) |
| Returned via | Query param on the callback | Claim **inside the signed ID token** |
| Checked by | Client, before touching the code | Client, after verifying the ID token signature |
| Stops | **Login CSRF / session swapping**: attacker forges a callback to your app carrying *their* code, logging the victim into the attacker's account (victim then saves a card / uploads docs into an account the attacker can read) | **ID token replay / injection**: a validly signed ID token captured elsewhere being replayed into this session to forge an authentication event |
| Binding | Callback request ↔ browser session that started the flow | ID token ↔ authentication request that asked for it |

**Vulnerable callback:**

```typescript
// VULNERABLE — accepts any code from anyone; no session binding at all
app.get("/callback", async (req, res) => {
  const tokens = await exchangeCode(String(req.query.code)); // whose code is this?
  req.session.user = decodeIdToken(tokens.id_token);         // also: no verification
  res.redirect("/dashboard");
});
```

**Fixed (state + nonce + PKCE together):**

```typescript
import { randomBytes, timingSafeEqual } from "node:crypto";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { generateCodeVerifier, codeChallengeS256 } from "./pkce";

const IDP = "https://idp.example.com";
const JWKS = createRemoteJWKSet(new URL(`${IDP}/.well-known/jwks.json`));
const CLIENT_ID = "web-app-4421";
const REDIRECT_URI = "https://app.example.com/callback";

app.get("/login", (req, res) => {
  const state = randomBytes(16).toString("base64url");
  const nonce = randomBytes(16).toString("base64url");
  const verifier = generateCodeVerifier();
  req.session.oauth = { state, nonce, verifier, createdAt: Date.now() };

  const u = new URL(`${IDP}/authorize`);
  for (const [k, v] of Object.entries({
    response_type: "code", client_id: CLIENT_ID, redirect_uri: REDIRECT_URI,
    scope: "openid profile email", state, nonce,
    code_challenge: codeChallengeS256(verifier), code_challenge_method: "S256",
  })) u.searchParams.set(k, v);
  res.redirect(u.toString());
});

app.get("/callback", async (req, res) => {
  const pending = req.session.oauth;
  delete req.session.oauth; // single-use: consume before any validation branch

  // 1. state: constant-time compare against the value bound to THIS session
  if (!pending || typeof req.query.state !== "string" ||
      !timingSafeEqualStr(req.query.state, pending.state)) {
    return res.status(400).send("Invalid state");
  }
  if (Date.now() - pending.createdAt > 10 * 60_000) {
    return res.status(400).send("Login attempt expired");
  }

  // 2. Back-channel code exchange with the PKCE verifier
  const tokenRes = await fetch(`${IDP}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: String(req.query.code),
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      client_secret: process.env.OIDC_CLIENT_SECRET!,
      code_verifier: pending.verifier,
    }),
  });
  if (!tokenRes.ok) return res.status(401).send("Token exchange failed");
  const tokens = await tokenRes.json();

  // 3. Verify the ID token, then 4. check nonce INSIDE the verified payload
  const { payload } = await jwtVerify(tokens.id_token, JWKS, {
    issuer: IDP, audience: CLIENT_ID, algorithms: ["RS256"],
  });
  if (payload.nonce !== pending.nonce) {
    return res.status(401).send("Nonce mismatch — possible token replay");
  }

  req.session.regenerate(() => {           // rotate session id on privilege change
    req.session.user = { sub: payload.sub, email: payload.email };
    res.redirect("/dashboard");
  });
});

function timingSafeEqualStr(a: string, b: string): boolean {
  const ba = Buffer.from(a), bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}
```

Details that signal seniority: `state`/verifier are **single-use and consumed before validation**; the session ID is **regenerated** after login (session-fixation defense); `nonce` is checked **after** signature verification (an unverified nonce proves nothing); and `state` must be **unguessable**, not `"login"` — a static state is the same as no state.

---

### Q16. Where do tokens actually leak in production systems? Referrer, logs, URLs — enumerate the vectors and fixes.

**Answer:**

The bearer-token model means **possession equals power**, so every leak vector is an account-takeover vector:

1. **URLs.** Tokens or codes in query strings land in: browser history, proxy/CDN/ELB access logs, server access logs, `Referer` headers to any third-party resource on the next page, and shared links. Fixes: tokens only in `Authorization` headers or POST bodies; auth codes are unavoidable in the callback query — so make them single-use/short-lived (AS side) and have the callback immediately redirect to a clean URL after the exchange so the code never sits in history: `res.redirect(303, "/dashboard")`.
2. **`Referer` header.** A page whose URL contains `?code=...` that loads an external script/img/analytics beacon leaks the full URL. Fix at the app layer regardless of AS behavior: set `Referrer-Policy: no-referrer` globally — in Express, `app.use((_req, res, next) => { res.setHeader("Referrer-Policy", "no-referrer"); next(); })` or helmet's default.
3. **Application logs.** The classic: `logger.info({ headers: req.headers })` or an error handler that dumps the failed axios request — including `Authorization: Bearer eyJ...`. Fix: centralized redaction in the logger, not developer discipline:

```typescript
// pino redaction — structurally strips secrets before they hit any sink
import pino from "pino";
export const logger = pino({
  redact: {
    paths: [
      "req.headers.authorization", "req.headers.cookie", "req.query.code",
      "*.access_token", "*.refresh_token", "*.id_token", "*.client_secret",
    ],
    censor: "[REDACTED]",
  },
});
```

4. **Error reporting / APM.** Sentry breadcrumbs capturing fetch URLs and headers; APM agents recording full request bodies of `/token` calls. Fix: `beforeSend` scrubbers and agent-level header denylists.
5. **Browser storage.** `localStorage` tokens are readable by any XSS and by any compromised npm dependency running on the page. Fix: BFF pattern — tokens live server-side, browser holds only an HttpOnly, `Secure`, `SameSite=Lax` session cookie. If a pure SPA is non-negotiable: in-memory tokens + refresh via rotating refresh token, accepting the residual XSS risk explicitly.
6. **Copy-paste and support tooling.** HAR files attached to support tickets contain every header. Fix: HAR sanitizers in the support intake path; short access-token TTLs bound the blast radius.

**Production war story:** During an FDE engagement, a customer's SIEM team asked why the same user "logged in" from three countries in an hour. The trail led to their CDN's access logs — full request URLs — being exported nightly to a shared analytics bucket with org-wide read access. Their SPA (an old implicit-flow integration) was still delivering `#access_token=` fragments, and one internal tool re-emitted the fragment into a query param when deep-linking. Anyone with bucket access could harvest live tokens. Remediation order mattered: (1) shorten token TTL to 15 min at the IdP — immediate blast-radius cut with zero code changes, (2) migrate the SPA to code+PKCE behind a BFF, (3) purge and re-ACL the bucket, (4) add log-pipeline redaction. The lesson I cite in interviews: token leakage is usually an *observability pipeline* problem, not an auth-code problem — fix where the data flows, not just where it's minted.

---

### Q17. Refresh tokens: how do you handle them safely, and what is rotation with reuse detection?

**Answer:**

Refresh tokens (RTs) trade UX (no re-login) for a long-lived credential you must protect. Modern best practice, and what public clients are *required* to do under OAuth 2.1:

1. **Rotation:** every refresh grant (`grant_type=refresh_token&refresh_token=8xLOxBtZp8` POSTed to `/token`) returns a **new** RT and invalidates the old one:

```http
HTTP/1.1 200 OK
Content-Type: application/json

{ "access_token": "eyJ...", "expires_in": 900, "refresh_token": "kQ93mNpA1c" }
```

2. **Reuse detection:** if a *rotated-out* RT is ever presented again, the AS revokes the **entire token family** (all descendants). Rationale: two parties holding the same RT means one is an attacker; you can't tell which, so kill both and force re-authentication. This converts "silent long-term compromise" into "one visible logout."
3. **Storage:** server-side (BFF/session store) for web; OS keychain/Keystore for native apps; never `localStorage`.
4. **Expiry strategy:** sliding expiration (e.g., 30 days idle) + absolute cap (e.g., 90 days) so a stolen-but-actively-used RT still dies.
5. **Sender constraint** where available: DPoP (RFC 9449) or mTLS-bound tokens make the RT useless without the client's private key — the direction the industry is moving to escape pure-bearer semantics.
6. **Concurrency care:** rotation + parallel tabs/requests = a legitimate client can race itself, present a just-rotated RT, and trip reuse detection. Real IdPs offer a small grace window (Auth0: configurable reuse interval) — know this exists; it's a very FDE-flavored debugging story ("customers randomly logged out" is often this).

**Interview trap:** "Access token TTL is 15 minutes, so revoking a user takes effect within 15 minutes — acceptable?" Make the trade-off explicit: JWT access tokens are not revocable mid-TTL without extra machinery. Options in order of increasing cost: short TTLs (bounded exposure), a revocation-event cache checked for sensitive endpoints only, or token introspection (Q20) for the critical paths. "We revoke the refresh token" only stops *new* access tokens — say that unprompted.

---

### Q18. SAML vs OIDC: a customer's enterprise asks which to use for SSO. How do you advise?

**Answer:**

Both solve federated browser SSO: an Identity Provider asserts identity to a Service Provider/Relying Party. The engineering differences:

| Dimension | SAML 2.0 (2005) | OIDC (2014) |
|---|---|---|
| Artifact | XML `<Assertion>`, XML-DSig signed | JWT ID token, JWS signed |
| Transport | Browser **HTTP-POST binding** — auto-submitting HTML form posts a base64 XML blob to the SP's ACS URL; or HTTP-Redirect for requests | Redirects with query params + back-channel JSON to `/token` |
| API/mobile story | None natively — browser-only; WS-Trust/ECP bolt-ons are painful | Native: same framework issues access tokens for APIs; PKCE for mobile/SPA |
| Crypto surface | XML canonicalization + XML-DSig — historically riddled with signature-wrapping (XSW), comment-truncation, and entity-expansion CVEs across major libraries | JWS over a compact string — far smaller parsing surface (still has its footguns: `alg` confusion) |
| Metadata/config | XML metadata documents, manual cert exchange, clock-skew fights | `/.well-known/openid-configuration` + JWKS with automatic rotation |
| Logout | Single Logout exists, rarely works across vendors | Front/back-channel logout — also imperfect, simpler |
| Enterprise install base | Enormous: government, healthcare, finance, education; Shibboleth, ADFS, SiteMinder, legacy Ping | Default for anything built in the last decade |

The consulting decision tree I'd give:

- **Greenfield, or you also need API/mobile access:** OIDC, no debate. One framework covers login + API authorization; SAML would need a parallel OAuth deployment anyway.
- **Customer's IdP only speaks SAML** (ADFS-only shops, some .edu Shibboleth federations, old PingFederate installs): support SAML **at the edge** — terminate it in an identity broker (Keycloak, Auth0, Entra External ID) that re-issues OIDC tokens internally. Your services stay OIDC-only; SAML becomes a per-customer connector config, not a code path. This brokering pattern is the single most useful architecture for a B2B FDE to know cold.
- **You're the vendor selling into enterprises:** you don't get to choose — supporting *inbound* SAML is table stakes for enterprise deals ("SSO tax" tier), even if your own stack is pure OIDC. Budget for the weird parts: IdP-initiated SSO (an unsolicited assertion POSTed at you — inherently CSRF-ish, treat with care or convert to SP-initiated), attribute-name mapping per customer, multi-cert rotation windows, and clock skew.
- **High-assurance API ecosystems** (open banking): OIDC's FAPI profile — SAML has no equivalent.

**Interview trap:** "SAML is insecure, so we should force everyone to OIDC." Too strong. SAML's *specification* is sound; its *implementation ecosystem* (XML-DSig) has the bad track record, and a well-maintained library with signature-wrapping mitigations is fine. The honest framing: OIDC has a structurally smaller attack and integration surface, so prefer it where you have the choice — but "rip out the customer's ADFS" is rarely a choice you're given; broker instead.

---

### Q19. Design service-to-service (M2M) authentication for a platform with 40 internal microservices and external partner integrations. What patterns exist and when do you pick each?

**Answer:**

Menu of patterns, roughly in ascending assurance:

1. **Static API keys.** A shared random string per caller. Acceptable only for low-risk, external, developer-facing APIs — and even then with per-key scoping, hashing at rest (they're passwords), rotation, and prefix-based leak scanning (`sk_live_...` detectable by GitHub secret scanning). No caller identity federation, no expiry by default. Not an internal-mesh answer.
2. **OAuth2 Client Credentials with `client_secret_basic/post`** (Q5). Central issuance, scoping, expiry, audit — the baseline for partner-facing M2M. Weakness: the secret is still a bearer credential that gets copy-pasted into config.
3. **Client Credentials with `private_key_jwt`** (RFC 7523): the client authenticates to `/token` by *signing a JWT assertion* with its private key instead of sending a shared secret:

```http
POST /token HTTP/1.1
Host: idp.example.com
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_assertion_type=urn%3Aietf%3Aparams%3Aoauth%3Aclient-assertion-type%3Ajwt-bearer
&client_assertion=eyJhbGciOiJSUzI1NiIsImtpZCI6InN2Yy1iaWxsaW5nLTAxIn0...
&scope=ledger:write
```

   The assertion's `iss`/`sub` = client_id, `aud` = token endpoint, short `exp`, unique `jti` (AS should reject replays). No shared secret ever crosses the wire; the IdP holds only the public key. This is what Entra ID certificate credentials and FAPI mandate. **Default recommendation for anything serious.**
4. **mTLS** (RFC 8705): client certs at the TLS layer, optionally with **certificate-bound access tokens** (the token's `cnf.x5t#S256` claim pins it to the client cert — a stolen token is useless without the key). Highest assurance; operationally heavy unless something manages certs for you — which is exactly what a service mesh (Istio/Linkerd + SPIFFE/SPIRE identities) does for intra-mesh traffic.
5. **Cloud workload identity** — the pattern that eliminates static secrets entirely: the platform attests the workload and issues short-lived credentials (AWS IRSA/pod identity, GCP workload identity, GitHub Actions OIDC federation into cloud roles). For CI/CD, "GitHub OIDC token federated into an AWS role, zero stored AWS keys" is a strong concrete example to cite.

Concrete architecture for the question as posed:

- **Inside the mesh (40 services):** mesh-issued mTLS/SPIFFE identity for transport authn + a lightweight authorization layer (mesh policy or OPA) — don't make every internal hop do an OAuth round-trip.
- **Crossing trust boundaries** (internal → SaaS, partner → you): OAuth2 client credentials with `private_key_jwt`, per-client scopes and `aud`-restricted tokens, 5–15 min TTLs, no refresh tokens.
- **User context traversing services:** never mint God-tokens; propagate the user's token where the chain is shallow, or use **token exchange (RFC 8693)** to trade an inbound user token for a narrower downstream token (`act` claim records the acting service — auditors love this).
- **Secrets hygiene:** whatever secrets remain live in a secret manager with rotation, never in env-var dumps or images.

**Interview trap:** "We put an API gateway in front, it validates the JWT, so internal services don't need auth." That's the candy-bar architecture (hard shell, soft center) — one SSRF or one compromised pod and the entire east-west plane is open. Expected counter: zero-trust posture — every service authenticates its callers; the gateway's validation is an optimization, not the perimeter.

---

### Q20. What is token introspection, and JWT vs opaque access tokens — how do you choose?

**Answer:**

Two ways an RS can validate an access token:

- **Self-contained (JWT):** validate locally via JWKS (Q12/Q13). Zero per-request IdP calls, IdP outage doesn't take down API traffic, scales flatly. Cost: **revocation latency** — the token is valid until `exp` no matter what the IdP thinks now, and claims are frozen at issuance.
- **Introspection (RFC 7662, opaque tokens):** the RS asks the AS about each token:

```http
POST /introspect HTTP/1.1
Host: idp.example.com
Content-Type: application/x-www-form-urlencoded
Authorization: Basic YXBpLXJzOnJzLXNlY3JldA==

token=2YotnFZFEjr1zCsicMWpAA&token_type_hint=access_token
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "active": true,
  "scope": "orders:read",
  "client_id": "web-app-4421",
  "sub": "auth0|5f7c8ec7c33c6c004bbafe82",
  "aud": "https://api.example.com",
  "exp": 1751629000,
  "iss": "https://idp.example.com/"
}
```

  Instant revocation, always-fresh claims, and nothing sensitive readable from the token string itself. Cost: an IdP round-trip per request (mitigated by short-TTL caching of introspection results — which quietly reintroduces revocation latency equal to your cache TTL) and the IdP becoming a hard runtime dependency.

Decision heuristics:

- High-throughput APIs, IdP availability decoupling → JWT with short TTL (5–15 min); accept bounded revocation latency.
- Instant-revocation requirements (banking session kill, admin "log out this user everywhere") → introspection on sensitive endpoints, or hybrid: JWT for everything + a revocation-ID denylist (`jti` cache in Redis, entries live only until each token's `exp` — the list stays small) consulted on state-changing routes.
- **Phantom token / split-token pattern** (worth naming in interviews): opaque token on the public internet (unleakable claims, revocable), gateway introspects once and forwards a JWT to internal services (local validation inside). Best of both at the cost of a smarter gateway.
- Whatever you choose, the **client's** answer never changes: the access token is opaque *to the client* (Q10). JWT-vs-opaque is purely an AS↔RS contract.

Final checklist that ties the whole file together — the "audit an OAuth integration in an hour" list an FDE actually uses on site: code+PKCE(S256) everywhere a user is present, no implicit/ROPC anywhere, exact-match redirect URIs, `state`+`nonce` generated/validated/single-use, ID tokens never sent to APIs, access tokens validated with pinned `alg` + `iss` + `aud` + `exp` against a cached-and-rotating JWKS, refresh tokens rotated with reuse detection, `Referrer-Policy: no-referrer`, log redaction proven by grepping production logs for `eyJ`, and M2M on `private_key_jwt` or workload identity rather than long-lived shared secrets.
