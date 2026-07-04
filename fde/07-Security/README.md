# Module 7 — Security (Forward Deployed Engineer Prep)

> Level: Senior/Staff | FDE interview prep

FDEs deploy and operate systems *inside customer environments*, so security is a hiring filter, not a nice-to-have. This module is a set of interview-driven deep dives: numbered questions in the format interviewers actually use, with honest trade-offs, vulnerable → fixed code pairs, attack-flow diagrams, and production war stories. Every code sample is complete TypeScript/Node — no placeholders.

## Files

| # | File | What it covers |
|---|------|----------------|
| 01 | [`01_authentication_deep_dive.md`](./01_authentication_deep_dive.md) | Sessions vs JWT, JWT internals & attacks (alg confusion, none, kid injection), refresh-token rotation with reuse detection, password hashing (argon2id/bcrypt/scrypt) and the Node threadpool implication, TOTP from scratch, WebAuthn/passkeys, session fixation, secure cookies & SameSite. |
| 02 | [`02_oauth2_oidc.md`](./02_oauth2_oidc.md) | Every OAuth2 flow with real HTTP (auth code + PKCE, client credentials, device code), why implicit/ROPC are dead, OIDC ID token vs access token, token validation (iss/aud/JWKS/rotation), redirect-URI/state/nonce bugs, SAML vs OIDC for enterprises, M2M and BFF patterns. |
| 03 | [`03_authorization_and_multitenancy.md`](./03_authorization_and_multitenancy.md) | RBAC vs ABAC vs ReBAC (Zanzibar/OpenFGA), a TypeScript policy engine, Postgres row-level security with real policies, tenant propagation via AsyncLocalStorage, IDOR/BOLA (the #1 API bug), API keys done right, mTLS/SPIFFE service-to-service authz. |
| 04 | [`04_owasp_and_api_security.md`](./04_owasp_and_api_security.md) | OWASP Top 10 (2021) + OWASP API Top 10 with Express vulnerable→fixed pairs: SQL/NoSQL/command injection, SSRF to cloud metadata, prototype pollution, mass assignment, XSS in APIs, ReDoS, path traversal, rate limiting, helmet/CSP, supply-chain/typosquatting. |
| 05 | [`05_secrets_encryption_infra.md`](./05_secrets_encryption_infra.md) | Encryption at rest vs in transit, TLS 1.3 & mTLS, envelope encryption (KMS/S3/RDS), secrets management (Vault/Secrets Manager, why env vars leak, rotation), AES-256-GCM in Node with the nonce-reuse disaster, hashing vs encryption vs encoding, cert-chain validation, VPC/SG/NACL basics. |
| 06 | [`06_ai_security_and_guardrails.md`](./06_ai_security_and_guardrails.md) | The FDE differentiator: prompt injection (direct/indirect, why it's unsolved), jailbreak categories, the lethal trifecta & agent data exfiltration, a TypeScript guardrail pipeline, PII detection/redaction before embedding, RAG document-level ACLs at retrieval time, model access patterns in customer VPCs, AI audit logging. |

## Suggested study order

1. **01 — Authentication** — establishes the vocabulary (tokens, sessions, hashing, MFA) everything else builds on.
2. **02 — OAuth2 & OIDC** — how identity federates in real enterprise integrations; extends the JWT/token material from 01.
3. **03 — Authorization & Multi-tenancy** — once a request is authenticated, what may it *do*, and how do you keep tenants isolated. BOLA/IDOR here is the single highest-yield API topic.
4. **04 — OWASP & API Security** — the broad vulnerability catalog with concrete Express fixes; the day-to-day defensive checklist.
5. **05 — Secrets, Encryption & Infra** — the cryptographic and network-boundary layer underneath the app.
6. **06 — AI Security & Guardrails** — the differentiator for AI-focused FDE roles; assumes the auth/authz/RAG-adjacent concepts from 01–05.

**Fast-track before an interview:** skim every `**Interview trap:**` and `**Production war story:**` callout across all six files first — they are the highest-signal, most-probed items. Then do a full read of the module you expect to be grilled on.
