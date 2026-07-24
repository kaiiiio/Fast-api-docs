# Threat Modeling & Secure Design - Senior Interview Deep Dive

Threat modeling is where an FDE earns trust with a customer's security team. You are dropped into an unfamiliar environment, asked to deploy an AI system, and the customer's CISO wants to know *what could go wrong before it ships*. This file walks STRIDE and attack trees on a concrete system — a multi-tenant AI document platform (customers upload contracts/PDFs, we embed them, and an LLM answers questions over them) — and gives you the reusable artifacts (data-flow diagrams, threat-model doc template, DREAD scoring, abuse cases) you present in a customer session. Framing is defensive throughout: we enumerate attacker capability so we can *design it out*.

---

### Q1. What is threat modeling, and why does an FDE do it before writing code rather than after?

**Answer:**

Threat modeling is a structured process to answer four questions (the Shostack "four-question frame"):

1. **What are we building?** (a model of the system — usually a data-flow diagram)
2. **What can go wrong?** (enumerate threats against that model)
3. **What are we going to do about it?** (mitigations mapped to threats)
4. **Did we do a good job?** (validate coverage, review)

It is *not* a pen test (that finds bugs in a running system) and it is *not* a code review (that finds bugs in written code). Threat modeling operates on the **design**, so it catches whole classes of flaw — "the tenant ID is trusted from the client", "the embedding worker can read every tenant's bucket" — while they are still a diagram change and not a rewrite.

For an FDE the value is doubled:

- **Shift-left economics.** A trust-boundary mistake caught in a design session costs a whiteboard eraser. The same mistake caught in a customer's production breach costs the account. The IBM Systems Sciences Institute number everyone quotes is ~6x cheaper to fix in design than in implementation and ~100x cheaper than in production; the exact multiplier is folklore but the direction is real.
- **It is a trust-building ritual with the customer.** When you run a threat-modeling session with the customer's security team in week one, you signal that you think like them. You leave with a signed-off threat model that becomes the security section of the deployment sign-off. That artifact unblocks procurement.

**Interview trap:** "We do threat modeling" often means "we ran a scanner." If asked, be precise: threat modeling is a design-time activity that produces a *model* and a *ranked threat list with mitigations*, independent of any tool. Scanners are Q4-ish validation, not the model.

---

### Q2. Walk me through building the data-flow diagram for the multi-tenant AI document platform. What are the elements?

**Answer:**

A data-flow diagram (DFD) has exactly four element types, plus the most important thing: **trust boundaries**.

- **External entities** (squares) — actors outside our control: the browser user, the customer's IdP, the LLM provider API.
- **Processes** (circles) — code that transforms data: the API service, the embedding worker, the retrieval service.
- **Data stores** (parallel lines / open rectangles): Postgres, the S3 document bucket, the vector DB, Redis.
- **Data flows** (arrows) — who talks to whom, over what protocol.
- **Trust boundaries** (dashed lines) — where the privilege/trust level changes. *Every threat of consequence crosses a trust boundary.*

Here is the DFD for the platform:

```
                        ┌──────────────── TRUST BOUNDARY: public internet ─────────────────┐
                        │                                                                    │
   [Browser User] ──────┼── HTTPS ──▶ (API Gateway / WAF) ── mTLS ──▶ (API Service) ─────────┼──┐
        ▲               │                                                  │                  │  │
        │               │                                                  │ SQL (TLS)        │  │
    [Customer IdP] ─OIDC─┼─────────────────────────────────────────────────┤                 │  │
                        └────────────────────────────────────────────────── │ ────────────────┘  │
                                                                             ▼                     │
        ┌──────────────── TRUST BOUNDARY: private VPC / service mesh ─────── │ ──────────────────┐ │
        │                                                                    ▼                    │ │
        │   (Embedding Worker) ◀── job (Redis) ──── (API Service) ──── query ──▶ [Postgres RLS]  │ │
        │          │                                                  │                          │ │
        │          │ read/write                                        │ retrieve                 │ │
        │          ▼                                                    ▼                          │ │
        │   [S3: tenant docs] ◀──────────────── (Retrieval Svc) ──▶ [Vector DB w/ tenant filter]  │ │
        │          │                                    │                                         │ │
        └────────── │ ─────────────────────────────────  │ ────────────────────────────────────── ┘ │
                    │                                    │                                            │
        ┌───────────│──── TRUST BOUNDARY: third-party (leaves our VPC) ─┼──────────────────────────┘
        │           ▼                                                    ▼
        │   [KMS: envelope keys]                          (LLM Provider API — external)
        └─────────────────────────────────────────────────────────────────────────────
```

The three dashed boundaries are the whole game:

1. **Public internet → our edge.** Everything crossing here is attacker-controlled. Authentication, input validation, rate limiting live here.
2. **Edge → private VPC.** Once inside, is the service still enforcing tenant isolation, or does it trust the caller? This is where IDOR/BOLA and tenant-bleed live.
3. **Our VPC → third parties** (LLM provider, KMS). Data *leaving* our boundary — the exfiltration and confidentiality concern (does customer contract text go to an external model? under what contract?).

**Interview trap:** candidates draw boxes and arrows and forget the dashed lines. A DFD with no trust boundaries is an architecture diagram, not a threat model. The threats are *on the boundaries*.

---

### Q3. Apply STRIDE to this system. What does each letter mean and give a concrete threat for each?

**Answer:**

STRIDE is a mnemonic for six threat categories; each is the negation of a security property.

| Letter | Threat | Property violated | Concrete threat on the AI doc platform |
|--------|--------|-------------------|----------------------------------------|
| **S** | Spoofing | Authentication | Attacker forges a JWT with `alg:none` or a stolen signing key and impersonates another tenant's admin. |
| **T** | Tampering | Integrity | Attacker modifies the `tenant_id` in a request body / path to read another tenant's documents (BOLA). Or poisons an uploaded PDF with an indirect prompt-injection payload. |
| **R** | Repudiation | Non-repudiation | A tenant admin deletes 10k documents, then denies it; we have no tamper-evident audit log to prove who did it. |
| **I** | Information disclosure | Confidentiality | The embedding worker's IAM role can read *every* tenant's S3 prefix; a bug leaks tenant A's contract into tenant B's answer. Or contract text is sent to an external LLM that trains on it. |
| **D** | Denial of service | Availability | A tenant uploads a 2 GB "zip bomb" PDF or a query that triggers a ReDoS / unbounded vector search, starving other tenants (noisy-neighbor). |
| **E** | Elevation of privilege | Authorization | A normal user hits an admin-only endpoint that only checks *authentication*, not *role*; or SSRF from the PDF-fetch feature reaches IMDS and steals the node's IAM credentials. |

The technique: **walk each element of the DFD and ask "which STRIDE categories apply here?"** Not every element is subject to every letter. Microsoft's classic element-to-STRIDE mapping:

| Element | S | T | R | I | D | E |
|---------|---|---|---|---|---|---|
| External entity | ✔ | | ✔ | | | |
| Process | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Data store | | ✔ | ✔ (if it *is* the log) | ✔ | ✔ | |
| Data flow | | ✔ | | ✔ | ✔ | |

So processes (our API service, workers) are exposed to all six — spend your time there.

**Production war story:** on one deployment the DFD walk surfaced that the *retrieval service* did tenant filtering in application code by appending `WHERE tenant_id = $1` — but the *vector DB* (a separate system) filtered by a metadata field the application *also set from the request*. Information disclosure (I) on the vector store element: an attacker who could influence the metadata filter could retrieve cross-tenant chunks. The fix (server-derived tenant context + a hard partition per tenant in the vector store) was a one-week change in design; it would have been a reportable breach in production.

---

### Q4. STRIDE-per-element is thorough but slow. When do you use STRIDE-per-interaction or just per-boundary instead?

**Answer:**

Three granularities, chosen by time budget and system maturity:

- **STRIDE-per-element** — walk every element × applicable letters. Most thorough, most tedious. Use it for the *core* of a new system (auth, the multi-tenant data path) and for anything a regulator will ask about.
- **STRIDE-per-interaction** — walk each data flow (source, destination, the flow itself) and enumerate threats to that interaction. Fewer items than per-element, better signal, and it naturally centers the trust boundaries the flows cross. This is my default in a customer session with a fixed 90-minute slot.
- **STRIDE-per-boundary** — only look at flows that cross a trust boundary. Fastest; good for a design review of a change ("we're adding a webhook") rather than a whole system.

The FDE reality: you rarely get to do the exhaustive per-element pass in a customer's calendar. I scope it — full per-element on the tenant-isolation and authn/authz path (the stuff that ends a company if it breaks), per-interaction elsewhere.

**Interview trap:** claiming you always do exhaustive STRIDE-per-element. In practice that produces a 300-row spreadsheet nobody reads. Seniority is shown by *ruthless scoping to the trust boundaries that matter*.

---

### Q5. Build an attack tree for "attacker reads another tenant's documents." How does an attack tree differ from STRIDE?

**Answer:**

STRIDE is **breadth-first**: enumerate categories across the system. An **attack tree** is **depth-first on one goal**: put the attacker's objective at the root and decompose the ways to achieve it, AND/OR-style, down to leaf actions. They are complementary — STRIDE finds the goals worth building trees for.

```
GOAL: Read Tenant B's documents  (as an outside attacker or Tenant A)
│
├─ OR ── 1. Bypass tenant isolation at the API
│         ├─ AND ── 1a. Find endpoint that trusts client-supplied tenant_id   [likely]
│         │          └─ 1b. Change tenant_id in path/body/JWT claim           [easy]
│         └─ OR ─── 1c. IDOR on a document GUID that isn't scoped to tenant    [medium]
│
├─ OR ── 2. Bypass isolation at the data layer
│         ├─ 2a. Postgres query missing WHERE tenant_id (RLS disabled)        [design flaw]
│         ├─ 2b. Vector DB metadata filter set from request, not context      [design flaw]
│         └─ 2c. Shared S3 bucket, IAM prefix condition missing                [config]
│
├─ OR ── 3. Steal Tenant B credentials
│         ├─ 3a. Phish a Tenant B admin                                        [out of scope-ish]
│         ├─ 3b. Forge JWT (alg:none / leaked signing key)                     [hard if fixed]
│         └─ 3c. Session fixation / token replay                              [medium]
│
├─ OR ── 4. Exfiltrate via the AI itself
│         ├─ 4a. Indirect prompt injection in a shared/ingested doc that makes
│         │      the model emit another tenant's retrieved context            [novel]
│         └─ 4b. Confused-deputy: get the retrieval service to fetch B's data  [medium]
│
└─ OR ── 5. Compromise the host / infra
          ├─ 5a. SSRF (PDF fetch) → IMDS → node IAM role → read all buckets    [high impact]
          └─ 5b. Supply-chain: malicious dependency exfiltrates env/keys        [high impact]
```

You annotate leaves with **cost / skill / detectability**, then the tree tells you the *cheapest* path — that is where the attacker actually goes, and therefore where your first mitigation dollar goes. Here paths 1a/2a/2b (design flaws, "easy/likely") dominate; you fix those before worrying about 3a phishing.

**Production war story:** an attack tree on a RAG product surfaced leaf 4a as "novel/unlikely" — the security team almost dropped it. We kept it and built a retrieval-time ACL check *plus* provenance tagging on chunks. Six months later a customer's own red team used exactly that path. The mitigation held because we'd designed for it, not bolted it on.

---

### Q6. What are abuse cases and how do they differ from use cases and security requirements?

**Answer:**

- A **use case** describes what a *legitimate* user does: "A tenant user uploads a PDF and asks a question."
- An **abuse case** (a.k.a. misuse case) describes what a *malicious* actor tries: "An attacker uploads a PDF containing hidden instructions that cause the model to reveal another user's data." It is a use case written from the attacker's perspective, with a hostile goal.
- A **security requirement** is the testable, positive statement that defeats the abuse case: "All retrieved chunks MUST be filtered by the server-derived tenant context before entering the prompt; the tenant ID MUST NOT be read from any client-supplied field."

The flow is: **use case → derive abuse cases (STRIDE/attack tree help) → each abuse case yields one or more security requirements → requirements become tests + design constraints.** This is how you convert fuzzy "make it secure" into acceptance criteria an engineer can implement and QA can verify.

Example set for the upload feature:

| Use case | Abuse case | Security requirement (testable) |
|----------|-----------|-------------------------------|
| User uploads a PDF | Attacker uploads a 2 GB / deeply-nested "bomb" | Reject files > 50 MB and > N pages; parse with resource limits & timeout; enforce per-tenant quota. |
| User uploads a PDF | Attacker uploads a malicious payload / macro / SVG-with-script | Validate magic bytes, not extension; strip active content; scan; never render uploaded HTML/SVG inline. |
| User asks a question | Attacker embeds injection text in the doc to exfiltrate | Retrieval scoped to tenant; system prompt isolates untrusted content; output filtered; tool-use restricted (least authority). |
| User shares a doc with a colleague | Attacker manipulates share to grant themselves access | Share operation authorizes on server-side resource ownership; membership checked at retrieval, not just at share time. |

**Interview trap:** conflating abuse cases with requirements. "The system shall prevent prompt injection" is a *goal*, not a requirement — it isn't fully achievable and isn't testable. "Untrusted document content is placed in a delimited, clearly-labeled section and never in the system role; tool calls require re-authorization of the tenant context" is a requirement.

---

### Q7. Walk me through DREAD scoring. Why is it controversial, and what do you use instead?

**Answer:**

DREAD scores each threat 1–10 (or 1–3) on five axes and sums/averages them to rank:

- **D**amage — how bad if exploited?
- **R**eproducibility — how reliably can it be exploited?
- **E**xploitability — how much skill/effort?
- **A**ffected users — how many, how broadly?
- **D**iscoverability — how easy to find?

Example — "endpoint trusts client-supplied tenant_id" (scale 1–10):

| Axis | Score | Rationale |
|------|-------|-----------|
| Damage | 9 | Full cross-tenant data read. |
| Reproducibility | 10 | Deterministic; change one field. |
| Exploitability | 8 | Trivial with Burp / curl. |
| Affected users | 9 | Every tenant. |
| Discoverability | 6 | Needs some probing but common bug. |
| **Total / avg** | **42 / 8.4** | **Critical — fix first.** |

**Why it's controversial:** the scores are subjective, two engineers disagree by 3 points, and *Discoverability* actively encourages security-through-obscurity ("it's hard to find, so lower the score") — which is a fallacy; assume the attacker finds it. Microsoft themselves deprecated DREAD.

**What I use instead:** a simple **Risk = Likelihood × Impact** matrix (each Low/Med/High or 1–5), which is defensible, fast, and maps onto how the customer's risk register already works. For anything going to a regulator or an insurer I map to **CVSS** for a vuln-level score and to the customer's enterprise risk framework (often a 5×5 heat map) for business risk. I'll still *use DREAD's axes as prompts* to reason about likelihood and impact — just not the naive sum.

```
Impact →
  High │  Med  │ High  │ Crit  │ Crit
  Med  │  Low  │ Med   │ High  │ Crit
  Low  │  Low  │ Low   │ Med   │ High
       └───────┴───────┴───────┴──────
          Low     Med     High   VHigh   ← Likelihood
```

**Interview trap:** presenting DREAD as best practice. Senior signal: know it, be able to run it, and articulate *why* the industry moved to Likelihood×Impact / CVSS and dropped Discoverability.

---

### Q8. How do you actually run a threat-modeling session with a customer's security team? Give me the agenda.

**Answer:**

The mechanics matter as much as the method — this is a facilitation exercise, not a lecture.

**Before (prep):**
- Get read access to the architecture, or build the DFD yourself from docs/code and bring it as a *strawman* to react to (people critique faster than they create).
- Identify the participants you need: an architect, a security/AppSec person, whoever owns data classification/compliance, and someone with ops/infra context. Keep it ≤ 8 people.
- Send the DFD and the scope 24h ahead. State explicitly what's *in* and *out* of scope for this session.

**During (90 min, my default agenda):**
1. **(10m) Frame & scope.** "Today we model the document-ingestion and query path. Auth is assumed from module X. Goal: a ranked threat list we all sign." Set the tone: no blame, no idea is stupid, we're attacking the *design* not each other.
2. **(15m) Walk the DFD together.** Correct it live — the corrections *are* findings ("oh, the worker actually reads all buckets"). Draw the trust boundaries as a group.
3. **(40m) Threat enumeration.** Go flow-by-flow (STRIDE-per-interaction). I keep the pen and drive; I ask "what stops an attacker here?" for each boundary crossing. Capture everything, don't debate fixes yet.
4. **(15m) Rank.** Quick Likelihood×Impact on each. Park mitigations design for later; agree only on *severity* and *owner*.
5. **(10m) Close.** Assign owners + dates for the top items, agree on the follow-up review, restate the deliverable.

**After:**
- Within 48h send the written threat model (template in Q9). Momentum dies if you wait a week.
- Track the mitigations as tickets in *their* tracker, not a doc that rots.

**Facilitation tips that separate seniors:** bring a strawman DFD; timebox hard; separate *finding* threats from *fixing* them (mixing them stalls the room); write down the "we don't know" items as explicit questions with an owner; and end with a concrete deliverable, not "we'll circle back."

**Production war story:** my first customer session, I tried to enumerate *and* solve every threat live. We got through two data flows in 90 minutes and the room lost faith. Next time I banned solutioning during enumeration — "great, that's a mitigation, parking it" — and we covered the whole path with time to spare. Facilitation discipline, not security knowledge, was the bottleneck.

---

### Q9. Give me a reusable threat-model document template.

**Answer:**

This is the artifact you leave behind; it should be skimmable by an exec and actionable by an engineer.

```markdown
# Threat Model: <System / Feature Name>
Version: <x.y>  |  Date: <ISO>  |  Author: <FDE>  |  Reviewers: <names>
Status: Draft | Reviewed | Signed-off
Last review: <date>   Next review due: <date or trigger, e.g. "on major arch change">

## 1. Overview
- Purpose of the system, and what data it handles.
- **Data classification:** what's the most sensitive data here? (e.g. customer
  contracts = Confidential; embeddings derived from them = Confidential.)
- **Assumptions & dependencies:** what we trust (e.g. "the IdP is correctly
  configured", "KMS is trustworthy") — these are explicit so they can be challenged.
- **In scope / Out of scope** for this model.

## 2. Architecture / Data-Flow Diagram
- The DFD (ASCII or linked image), with trust boundaries marked.
- Element inventory: external entities, processes, stores, flows.
- For each flow: protocol, authN, authZ, data sensitivity.

## 3. Trust Boundaries
| # | Boundary | Crosses from → to | What changes | Controls at the boundary |
|---|----------|-------------------|--------------|--------------------------|

## 4. Threats (the core)
| ID | Element/Flow | STRIDE | Threat description | Likelihood | Impact | Risk | Mitigation | Owner | Status |
|----|--------------|--------|--------------------|------------|--------|------|------------|-------|--------|
| T1 | Flow API→DB  | T/I    | Client-supplied tenant_id trusted | High | High | Critical | Server-derived tenant ctx + RLS | @alice | Open |

## 5. Abuse cases & Security requirements
| Abuse case | Derived security requirement (testable) | Test / control |
|------------|-----------------------------------------|----------------|

## 6. Residual risk & accepted risks
- Risks we are NOT mitigating and why (signed off by <risk owner>).

## 7. Open questions
| Question | Owner | Due |

## 8. Validation
- How we'll confirm mitigations landed (pen test, unit tests, config check).
- Review triggers (e.g., new trust boundary, new data class, new integration).
```

Key properties: every threat has an **owner and a status** (a threat model without owners is a wish list); **accepted/residual risk is explicit and signed** (so nobody later says "why didn't you tell us"); and there's a **review trigger** so the model is a living document, not a one-time PDF.

---

### Q10. What's the difference between "shift-left" and just "doing security earlier"? How does it show up in an FDE's workflow?

**Answer:**

"Shift-left" means moving security *activities* earlier in the delivery timeline (the left of the pipeline diagram), so defects are caught when they're cheap. But the phrase is often reduced to "run SAST in CI," which is only the tooling slice. Real shift-left is a set of *practices* at each stage:

| Stage | Shift-left practice | FDE artifact |
|-------|--------------------|--------------|
| Requirements | Abuse cases + security requirements alongside user stories | Security acceptance criteria in the ticket |
| Design | **Threat modeling** (this file) | Threat model doc, trust-boundary review |
| Code | Secure defaults, security-focused code review, secret-scanning pre-commit | Reviewed PRs, `gitleaks` pre-commit hook |
| Build/CI | SAST, SCA, container/IaC scan as gates | Green pipeline required to merge |
| Test | DAST, fuzzing, abuse-case tests | Automated security test suite |
| Deploy/Runtime | Least-privilege IAM, runtime detection, WAF | Hardened IaC, Falco/GuardDuty |

The mirror image is **"shift-right"** — observability, runtime protection, chaos/security-chaos in production — and mature programs do *both*: catch what you can in design, detect what slips through at runtime.

For an FDE specifically, shift-left is a selling point: you show up in the *design* phase of the customer's deployment, run the threat model, and bake security requirements into the rollout plan. You are not the person who bolts on a WAF the week before go-live.

**Interview trap:** treating shift-left and shift-right as opposed. They're complementary. Also: "shift-left" ≠ "make developers do security with no support." Done wrong it just dumps 400 SAST findings on a dev. Done right, you tune the tools, provide secure defaults/paved roads, and make the secure path the easy path.

---

### Q11. How do you decide what's in scope for a threat model? Doesn't "the whole system" always apply?

**Answer:**

If everything is in scope, nothing gets modeled well. Scoping decisions:

- **Model per-trust-boundary / per-feature, not "the whole company."** A threat model has a subject: "document ingestion + query," "the new billing webhook," "the admin console." Bounded subjects get thorough models; "the platform" gets a shallow one.
- **Prioritize by blast radius.** Model the paths that touch the crown jewels (customer documents, tenant isolation, credentials/keys) exhaustively; model low-value paths (a status page) lightly or not at all.
- **Use assumptions to bound it.** "We assume the underlying Kubernetes cluster and its RBAC are correctly configured and modeled separately" is a legitimate way to keep the app-level model focused — *as long as you write the assumption down* so the infra model actually exists somewhere.
- **Re-model on triggers, not on a calendar.** New trust boundary, new data classification, new third-party integration, a change to the authN/authZ model → re-open the threat model. Minor CRUD changes don't.

**Production war story:** a customer wanted "a threat model of our entire platform" as a compliance checkbox. That would have been a 200-page doc nobody read. We instead delivered five bounded models (auth, tenant data path, ingestion, admin, third-party egress) plus a one-page "system context" model tying them together with explicit assumptions between them. The auditors preferred it and the engineers actually used them.

---

### Q12. Model the LLM/RAG-specific threats. What does threat modeling an AI system add beyond a normal web app?

**Answer:**

The AI path adds threat categories that classic STRIDE under-serves. I overlay the OWASP LLM Top 10 as an extra lens on the AI processes/flows:

| AI threat | Where in DFD | STRIDE-ish | Mitigation baked into design |
|-----------|-------------|-----------|------------------------------|
| **Prompt injection (direct)** | user → model | Tampering / EoP | Treat all user text as untrusted; least-authority tools; output-side checks. |
| **Indirect prompt injection** | ingested doc → retrieval → model | Tampering | Delimit & label untrusted content; never let retrieved text issue tool calls / change instructions; provenance on chunks. |
| **Sensitive info disclosure** | model → user | Info disclosure | Retrieval scoped to tenant/user ACLs *at retrieval time*; PII redaction before embedding; output DLP. |
| **Excessive agency** | model → tools | EoP | Tools scoped to caller's tenant; human-in-loop for destructive/high-blast actions; deny-by-default tool authz. |
| **Data leaves boundary** | retrieval → external LLM | Info disclosure | Contractual no-train + deletion SLA, or in-VPC model; classify what may egress. |
| **Training-data / model poisoning** | ingestion → index | Tampering | Validate/scan ingested content; per-tenant indexes so poison can't cross tenants. |
| **Model DoS / cost** | user → model | DoS | Token/rate quotas per tenant; max context; cost circuit-breakers. |

The *design* consequence: the trust boundary between "our retrieval context" and "the model" is a real boundary — the model is a **confused deputy** that will faithfully do whatever the highest-privilege-sounding text in its context says. So you design as if any retrieved/ingested content could be hostile, and you *never* give the model authority (tools, un-scoped data) that the *user* doesn't have.

**Interview trap:** treating prompt injection as "solvable with a better system prompt." It isn't fully solvable at the model layer; the *architecture* has to assume injection succeeds and constrain the blast radius (least authority, scoped retrieval, output filtering, human approval). That's a threat-modeling/design answer, not a prompt-tuning answer. (Deep dive lives in `06_ai_security_and_guardrails.md`.)

---

### Q13. What is the confused-deputy problem, and where does it appear in this system?

**Answer:**

A **confused deputy** is a program with more privilege than its caller that is tricked into misusing that privilege *on behalf of* the caller. The deputy has the authority; the attacker supplies the intent.

Instances in the platform:

- **The retrieval service** runs with broad DB/vector access so it can serve any tenant. If it derives the tenant filter from *caller-supplied input* rather than an authenticated context, an attacker makes it fetch another tenant's data. It's the deputy; its DB role is the excess authority.
- **The LLM agent with tools** is a confused deputy by nature — it holds a tool credential (e.g., "read documents") and executes on instructions that may come from untrusted retrieved text. Indirect prompt injection is confused-deputy exploitation.
- **Cloud IMDS / IAM** (covered in `08`): SSRF makes a service fetch instance credentials it "has," on the attacker's behalf.
- **CSRF** is the browser-era classic confused deputy: the browser holds the auth cookie; the attacker's page makes it act.

The design fix is always the same shape: **the deputy must act with the *caller's* authority, not its own ambient authority.** Concretely — pass an authenticated, server-derived tenant/user context down every layer; scope tool credentials to that context; and prefer capability-style tokens over "the service can do everything." This is why "the service has a broad IAM role and filters in app code" is a design smell.

---

### Q14. How do you elicit security requirements from a customer who says "just make it secure"?

**Answer:**

"Secure" is not a requirement; it's a wish. You convert it by driving from three sources:

1. **Data classification first.** "What's the most sensitive data this handles, and what happens if it leaks / is altered / is unavailable?" The CIA answers (Confidentiality/Integrity/Availability priorities) fall out of this. A system holding signed contracts weights integrity and confidentiality high; a public status board weights availability.
2. **Compliance & contractual obligations.** "Are we in scope for SOC 2 / GDPR / HIPAA / PCI? Any customer contracts with no-train or deletion-SLA clauses?" Each obligation is a source of concrete requirements (see `10_compliance_and_data_governance.md`).
3. **Abuse cases from the threat model.** Every abuse case yields a testable requirement (Q6).

Then write requirements as **testable, positive statements** with the property/asset/condition:

- Bad: "The system shall be secure against unauthorized access."
- Good: "Every request to a tenant resource MUST be authorized against the authenticated tenant context derived server-side; the tenant identifier MUST NOT be read from client-controlled input. Verified by test suite T-AUTHZ-*."

I also anchor to a **baseline standard** so I'm not inventing from scratch — OWASP ASVS is my go-to: it's a checklist of verifiable requirements at three levels; I pick the level matching the data sensitivity (L2 for most SaaS, L3 for the crown-jewel paths) and treat it as the floor.

**Interview trap:** accepting "make it secure" and running. Senior move: reframe into classification + obligations + abuse cases, and hand back *testable* requirements tied to a recognized baseline (ASVS), so "done" is objective.

---

### Q15. Give me the vulnerable→fixed design for the tenant-context problem, in code.

**Answer:**

The single most common multi-tenant design flaw is trusting a client-supplied tenant identifier. Threat-modeling flags it (Tampering/EoP on the API process); here's the fix as a design pattern.

**Vulnerable — tenant from the request:**

```typescript
// Anti-pattern: the client tells us which tenant they are.
app.get('/documents/:docId', async (req, res) => {
  const tenantId = req.header('x-tenant-id');        // ATTACKER-CONTROLLED
  const doc = await db.query(
    'SELECT * FROM documents WHERE id = $1 AND tenant_id = $2',
    [req.params.docId, tenantId],                     // filter uses spoofable input
  );
  res.json(doc.rows[0]);
});
```

An attacker sets `x-tenant-id` to any value → reads any tenant's docs (BOLA). The `WHERE tenant_id` looks safe but is filtering on attacker input.

**Fixed — tenant derived from the authenticated principal, enforced in depth:**

```typescript
// 1. Middleware derives tenant from the verified token ONLY.
function tenantContext(req: Request, res: Response, next: NextFunction) {
  const claims = req.auth;                 // set by verified-JWT middleware upstream
  if (!claims?.tenant_id) return res.status(401).end();
  // Store in request-scoped context; never read tenant from headers/body/query again.
  req.ctx = { tenantId: claims.tenant_id, userId: claims.sub, role: claims.role };
  next();
}

// 2. Every data access takes the server-derived tenant, and the DB enforces it too.
app.get('/documents/:docId', tenantContext, async (req, res) => {
  // App-layer scoping...
  const doc = await withTenant(req.ctx.tenantId, (client) =>
    client.query('SELECT * FROM documents WHERE id = $1', [req.params.docId]),
  );
  if (!doc.rows.length) return res.status(404).end();   // 404, not 403 — don't leak existence
  res.json(doc.rows[0]);
});

// 3. Defense in depth: Postgres Row-Level Security enforces it even if app code slips.
async function withTenant<T>(tenantId: string, fn: (c: PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    // set_config makes tenant a session GUC; the RLS policy reads it.
    await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [tenantId]);
    return await fn(client);
  } finally {
    client.release();
  }
}
```

```sql
-- RLS policy: even a forgotten WHERE clause can't cross tenants.
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON documents
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

The threat-model principle in code: **the tenant identity comes from the authenticated principal, is derived server-side once, and is enforced at multiple layers** (app + DB RLS) so a single bug isn't a breach. (Full multi-tenancy treatment in `03_authorization_and_multitenancy.md`.)

---

### Q16. How does threat modeling connect to the rest of the SDLC and to metrics? How do you know it's working?

**Answer:**

Threat modeling is worthless if it's a doc that dies after the meeting. It has to hook into the delivery process:

- **Trigger:** threat models are required (a gate) for new services, new trust boundaries, and new data classifications — enforced in the design-review / ADR process, not left to memory.
- **Output → backlog:** each threat's mitigation becomes a ticket in the team's tracker, prioritized by risk, with an owner. The threat model doc *links* to those tickets so status is live.
- **Requirements → tests:** each derived security requirement becomes an automated test or a checked control, so regression is caught (an abuse case that isn't a test will regress).
- **Validation loop:** pen tests and red-team exercises target the top-ranked threats; findings feed back to "did we do a good job?" (Q4 of the frame) and update the model.

Metrics that show it's working (lead vs. lag):
- *Coverage:* % of services/features with a current threat model; % of high-risk threats with a landed mitigation.
- *Timeliness:* threat models done in design phase vs. after code.
- *Effectiveness (lag):* # of vulns found in pen test / prod that a threat model *should* have caught (aim: trending to zero for known categories); mean time from threat identified → mitigated.

**Interview trap:** describing threat modeling as a one-off document exercise. Senior signal: it's a *process* wired into design reviews, the backlog, and the test suite, with coverage/timeliness metrics — and it's a living artifact re-opened on defined triggers.

---

### Q17. What are the common failure modes of threat modeling in practice, and how do you avoid them?

**Answer:**

| Failure mode | Symptom | Fix |
|--------------|---------|-----|
| **Analysis paralysis** | 300-row STRIDE-per-element spreadsheet, never finished | Scope to trust boundaries; timebox; per-interaction not per-element for the bulk. |
| **Solutioning too early** | Room debates fixes, covers 2 flows in 90 min | Separate enumeration from mitigation; "park it." |
| **Security theater** | Doc produced, filed, never actioned | Threats → tickets with owners; link doc to live status. |
| **The oracle problem** | One security person does it in a cave | Do it *with* the builders; they know the design, you facilitate. |
| **Snapshot rot** | Model reflects last year's architecture | Review triggers on arch/data/integration changes. |
| **Discoverability fallacy** | Threats downranked because "hard to find" | Assume the attacker finds everything; drop discoverability from scoring. |
| **Boundary blindness** | Threats listed on elements, not boundaries | Center trust boundaries; every serious threat crosses one. |
| **Missing the assets** | Modeling components, not what attacker wants | Start from "what does the attacker want / what's the crown jewel." |

The meta-lesson: threat modeling fails on *process and facilitation* far more often than on *technique*. Anyone can learn STRIDE in an hour; running a room, scoping ruthlessly, and wiring findings into delivery is the senior skill.

**Production war story:** inherited a customer's threat model that was a beautiful 40-page STRIDE-per-element doc — completely stale, describing a monolith they'd since split into services, with zero tickets ever filed against it. It had passed an audit and protected nothing. We replaced it with three living, boundary-scoped models whose threats were tickets in Jira with owners. Less impressive as a PDF, vastly more effective as security.

---

### Q18. How do you present threat-model results to a non-technical stakeholder (the CISO / exec sponsor)?

**Answer:**

Executives buy *risk decisions*, not STRIDE tables. Translate:

- **Lead with the top 3–5 risks in business terms.** "There is a High risk that one customer could read another customer's contracts due to how tenant identity is trusted. Impact: breach notification, contractual penalties, account loss. Mitigation: X, landing by <date>. Cost: Y."
- **Use the Likelihood×Impact heat map** as the one visual — execs read a red/amber/green grid instantly; they don't read STRIDE.
- **Be explicit about residual/accepted risk and who signs it.** "We are accepting risk R (low likelihood, medium impact) rather than mitigate now; that needs your sign-off." Executives own risk acceptance — give them a clean decision.
- **Tie to their obligations.** Map risks to SOC 2 / GDPR / customer contract clauses so the "why now" is concrete.
- **Give a one-page summary**; the full model is an appendix.

For an FDE this conversation *is* the trust-building deliverable: a CISO who sees you present a clear-eyed, prioritized, honestly-caveated risk picture — including the risks you're *not* fixing and why — trusts you to run their deployment. Overclaiming ("we've made it fully secure") destroys that trust faster than any single finding.

**Interview trap:** dumping the STRIDE spreadsheet on the exec. The deliverable to a CISO is a ranked, business-framed risk list with owners, dates, and explicit accepted-risk decisions — the technical model is the supporting appendix.

---

### Q19. Give a full worked example: the abuse-case → requirement → test chain for the "PDF upload triggers SSRF" threat.

**Answer:**

This ties the whole file together on one concrete threat.

**1. Feature / use case.** "A user provides a URL to a PDF; the ingestion worker fetches it, parses it, and embeds it."

**2. Abuse case (attack tree leaf 5a from Q5).** "An attacker submits a URL pointing at `http://169.254.169.254/latest/meta-data/iam/security-credentials/` (or an internal service). The worker, which has network access and an IAM role, fetches it — SSRF → cloud-credential theft / internal recon."

**3. STRIDE.** Elevation of privilege + Information disclosure on the ingestion process; confused-deputy (Q13).

**4. Risk.** Likelihood High (SSRF via user-supplied URL is common and easy), Impact Critical (node IAM creds → potentially all buckets) → **Critical, fix before ship.**

**5. Security requirements (testable):**
- R1: The fetcher MUST resolve the hostname and reject any URL resolving to private/link-local/loopback/metadata ranges (RFC1918, `169.254.0.0/16`, `::1`, etc.), checked *after* DNS resolution and re-checked on each redirect (defeat DNS-rebinding & redirect bypass).
- R2: Only `https` (and maybe `http`) schemes allowed; no `file:`, `gopher:`, `ftp:`.
- R3: The worker MUST run with **IMDSv2 enforced** and, better, no need for instance credentials (use IRSA / scoped role) so even a successful SSRF yields nothing from IMDS.
- R4: Egress from the worker restricted by security group / egress proxy allow-list.

**6. Code (R1/R2 — the app-layer control):**

```typescript
import { lookup } from 'node:dns/promises';
import ipaddr from 'ipaddr.js';

const BLOCKED = ['private', 'loopback', 'linkLocal', 'uniqueLocal', 'reserved'];

async function assertPublicUrl(rawUrl: string): Promise<URL> {
  const url = new URL(rawUrl);
  if (!['https:', 'http:'].includes(url.protocol)) {
    throw new Error(`scheme not allowed: ${url.protocol}`);   // R2
  }
  // R1: resolve and validate EVERY resolved address (defeat multi-record DNS tricks).
  const results = await lookup(url.hostname, { all: true });
  for (const { address } of results) {
    const range = ipaddr.parse(address).range();
    if (BLOCKED.includes(range)) {
      throw new Error(`blocked address range: ${address} (${range})`);
    }
  }
  return url;
}

// Use a fetch that pins to the validated IP and forbids following redirects blindly.
async function safeFetchPdf(rawUrl: string): Promise<Buffer> {
  const url = await assertPublicUrl(rawUrl);
  const resp = await fetch(url, {
    redirect: 'manual',                      // re-validate any redirect target (R1)
    signal: AbortSignal.timeout(10_000),     // DoS guard
    headers: { accept: 'application/pdf' },
  });
  if (resp.status >= 300 && resp.status < 400) {
    const loc = resp.headers.get('location');
    if (!loc) throw new Error('redirect without location');
    return safeFetchPdf(new URL(loc, url).toString());   // re-run full validation
  }
  if (!resp.ok) throw new Error(`fetch failed: ${resp.status}`);
  const buf = Buffer.from(await resp.arrayBuffer());
  if (buf.length > 50 * 1024 * 1024) throw new Error('file too large');  // DoS guard
  return buf;
}
```

**7. Test (the abuse case becomes a regression test):**

```typescript
describe('SSRF protections on PDF ingestion', () => {
  for (const bad of [
    'http://169.254.169.254/latest/meta-data/',   // AWS IMDS
    'http://[::1]:8080/internal',                 // loopback v6
    'http://10.0.0.5/admin',                      // RFC1918
    'file:///etc/passwd',                         // scheme
  ]) {
    it(`rejects ${bad}`, async () => {
      await expect(safeFetchPdf(bad)).rejects.toThrow();
    });
  }
});
```

The chain — abuse case → risk rank → testable requirements → code → regression test — is the entire point of threat modeling: it turns "what could go wrong" into shipped, verified controls. Layered with IMDSv2 + IRSA + egress control (see `08`), a single app bug still isn't a breach.

---

### Q20. When is threat modeling *not* worth it, and what are the lightweight alternatives?

**Answer:**

Threat modeling has a cost; spend it where risk lives.

**Skip or go ultra-light when:**
- The change has no trust-boundary impact (a copy tweak, a new read-only metric on data you already expose).
- It's a throwaway prototype that will never touch real customer data (but *flag the graduation point* — the moment it might, model it).
- The component is fully within an already-modeled boundary and doesn't change data flows.

**Lightweight alternatives for the middle ground:**
- **Security cards / a checklist** at PR/design-review time: a short list of trigger questions ("does this add a trust boundary? new data class? new external call? new authz decision?"). If all "no," skip; any "yes," do a mini-model.
- **"Evil user story"** in sprint planning: for each story, one line of "how would an attacker abuse this?" Cheap, keeps the muscle warm.
- **Threat-modeling-as-code / templates** (e.g., pytm-style, or a repo of reusable threat libraries per component type) to auto-generate a first-draft model for common shapes.
- **Incremental modeling:** model only the *delta* a change introduces against the existing system model.

The judgment call is the senior part: over-modeling burns goodwill and calendar (Q17's analysis paralysis); under-modeling ships the tenant-bleed bug. Anchor the decision on **does this change touch a trust boundary, the crown-jewel data, or an authorization decision?** If yes, model it properly; if no, a checklist suffices.

**Interview trap:** insisting *everything* needs a full threat model. That's how you become the security person nobody invites early. The mark of seniority is calibrating depth to risk — full model on the tenant-isolation path, one-line evil-user-story on the settings page.
