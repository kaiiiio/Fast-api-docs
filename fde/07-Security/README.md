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
| 07 | [`07_threat_modeling_and_secure_design.md`](./07_threat_modeling_and_secure_design.md) | STRIDE and attack trees walked on a multi-tenant AI document platform, trust boundaries & ASCII data-flow diagrams, abuse cases → testable security requirements, DREAD vs Likelihood×Impact scoring, how an FDE facilitates a threat-modeling session with a customer's security team, a reusable threat-model doc template, confused-deputy, shift-left, and an end-to-end abuse-case → requirement → code → test chain. |
| 08 | [`08_cloud_and_kubernetes_security.md`](./08_cloud_and_kubernetes_security.md) | AWS IAM policy evaluation logic, assume-role, permission boundaries/SCPs, confused-deputy & ExternalId, cross-account, IMDSv1 vs IMDSv2 SSRF, KMS envelope encryption + Secrets Manager rotation, VPC/SG/NACL isolation, PrivateLink, S3 bucket-policy pitfalls; Kubernetes RBAC, Pod Security Standards, NetworkPolicies, "secrets are base64 not encrypted", admission controllers, image signing/SBOM, Falco runtime, IRSA least-privilege — with vulnerable→fixed Terraform/YAML pairs. |
| 09 | [`09_appsec_testing_and_incident_response.md`](./09_appsec_testing_and_incident_response.md) | SAST/DAST/IAST/SCA in CI, fuzzing, secret scanning (gitleaks/trufflehog), container/dependency scanning (trivy/grype), SBOM, SDLC security gates; then NIST incident lifecycle, a worked leaked-API-key breach (hour-by-hour FDE response), forensic-grade audit logging, blameless postmortem template, on-call runbook template, tabletops, severity matrices. |
| 10 | [`10_compliance_and_data_governance.md`](./10_compliance_and_data_governance.md) | SOC 2 (Type I vs II, trust criteria, auditor evidence), GDPR (lawful basis, DSAR, erasure, minimization, DPA/subprocessors), HIPAA (PHI, BAA), PCI-DSS scope minimization, data residency/sovereignty, PII classification/retention/deletion, DPIAs for AI, contractual no-training clauses & deletion SLAs, breach-notification clocks, and how compliance shapes GenAI architecture — with checklists and decision tables. |

## Suggested study order

1. **01 — Authentication** — establishes the vocabulary (tokens, sessions, hashing, MFA) everything else builds on.
2. **02 — OAuth2 & OIDC** — how identity federates in real enterprise integrations; extends the JWT/token material from 01.
3. **03 — Authorization & Multi-tenancy** — once a request is authenticated, what may it *do*, and how do you keep tenants isolated. BOLA/IDOR here is the single highest-yield API topic.
4. **04 — OWASP & API Security** — the broad vulnerability catalog with concrete Express fixes; the day-to-day defensive checklist.
5. **05 — Secrets, Encryption & Infra** — the cryptographic and network-boundary layer underneath the app.
6. **06 — AI Security & Guardrails** — the differentiator for AI-focused FDE roles; assumes the auth/authz/RAG-adjacent concepts from 01–05.
7. **07 — Threat Modeling & Secure Design** — the design-time discipline that ties 01–06 together; how you run a security session with a customer and turn risks into testable requirements.
8. **08 — Cloud & Kubernetes Security** — the infrastructure layer you deploy *into* in a customer's account/cluster; extends the secrets/network material from 05.
9. **09 — AppSec Testing & Incident Response** — finding bugs before attackers (SAST/DAST/SCA/SBOM in CI) and surviving it when one slips (NIST lifecycle, a worked breach, postmortems, runbooks).
10. **10 — Compliance & Data Governance** — the *why* that shapes the whole architecture: SOC 2 / GDPR / HIPAA / PCI, residency, no-training clauses, DPIAs, breach notification. Read last; it frames everything 01–09.

**Fast-track before an interview:** skim every `**Interview trap:**` and `**Production war story:**` callout across all ten files first — they are the highest-signal, most-probed items. Then do a full read of the module you expect to be grilled on. Files 07–10 (threat modeling, cloud/k8s, appsec+IR, compliance) are the cross-cutting, senior/staff-level material most likely to separate candidates.
