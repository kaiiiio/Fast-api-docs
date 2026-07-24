# Compliance & Data Governance - Senior Interview Deep Dive

Compliance is where an FDE closes the deal. Enterprise and regulated customers will not deploy your AI system until their legal, privacy, and security teams are satisfied — and those teams speak SOC 2, GDPR, HIPAA, PCI, and data-residency, not TypeScript. This file translates each framework into what it *actually requires of your architecture*, the evidence auditors want, the checklists you run, and the decision tables for "does this apply to us and what must we do." The through-line: **compliance is not paperwork bolted on at the end; it shapes the GenAI architecture from day one** (no-training clauses, deletion SLAs, data residency, PII minimization all become design constraints). Educational/advisory framing — none of this is legal advice; you work *with* the customer's counsel.

---

### Q1. SOC 2 — what is it, and what's the difference between Type I and Type II?

**Answer:**

SOC 2 is an **attestation report** produced by a licensed CPA firm, evaluating a service organization's controls against the AICPA **Trust Services Criteria (TSC)**. It's not a certification you "pass" — it's an auditor's *opinion* on whether your controls are suitably designed (and, for Type II, operating effectively). For a B2B SaaS/AI vendor it's the single most-requested trust artifact in enterprise procurement.

| | **Type I** | **Type II** |
|---|-----------|-------------|
| Question answered | Are controls *suitably designed* at a **point in time**? | Do controls *operate effectively* over a **period** (typically 3–12 months)? |
| Evidence | Control descriptions, config snapshots | Samples of the control *operating* across the whole window |
| Effort | Lower — a snapshot | Higher — you must show the control ran, consistently, for months |
| What customers want | Accepted as a starting point / for new orgs | The one enterprises actually require |
| Analogy | "The safe is designed to lock" | "The safe was locked every night for 6 months, here's the log" |

The practical path: a startup often gets a **Type I** first (faster, unblocks some deals), then a **Type II** covering the following period. Enterprises with real security teams will insist on Type II — a point-in-time snapshot doesn't prove you *operate* securely.

**Interview trap:** calling SOC 2 a "certification" you "pass/fail." It's an *attestation report* with an auditor opinion (unqualified/qualified/adverse) and often *exceptions* noted. Also: SOC 2 is not prescriptive like PCI — you define the controls against the criteria; the auditor tests what you claimed. Two SOC 2 reports can look very different.

---

### Q2. What are the five Trust Services Criteria, and which are mandatory?

**Answer:**

| Criterion | Covers | Mandatory? |
|-----------|--------|-----------|
| **Security** (a.k.a. Common Criteria) | Protection against unauthorized access — access controls, network security, change management, risk, monitoring, incident response | **Yes — always required** |
| **Availability** | System uptime/SLA, DR, capacity, monitoring | Optional (include if you make uptime commitments) |
| **Confidentiality** | Protecting info designated confidential (encryption, access limits, retention/disposal) | Optional (include for sensitive B2B data) |
| **Processing Integrity** | Processing is complete, valid, accurate, timely | Optional (rare; relevant to transactional/financial processing) |
| **Privacy** | PII collection/use/retention/disposal per commitments & notice | Optional (overlaps GDPR; include if you handle lots of PII) |

Only **Security** (the Common Criteria) is mandatory; you scope the others in based on what you promise customers. Most SaaS choose **Security + Availability + Confidentiality**; add **Privacy** if PII is central. Don't over-scope — every criterion you include is more controls to operate and evidence for a year.

The Common Criteria (CC-series) is where most engineering work lands — it maps closely to things covered elsewhere in this module: logical access (auth/authz, `01`–`03`), change management (SDLC gates, `09`), risk assessment (threat modeling, `07`), monitoring and incident response (`09`), vendor management, and encryption (`05`, `08`).

**Interview trap:** thinking all five are required (that's a lot of unnecessary scope) or that Privacy = GDPR compliance (SOC 2 Privacy is about controls matching *your stated* privacy commitments; GDPR is law with specific rights — related but not the same). Scope deliberately.

---

### Q3. What evidence do SOC 2 auditors actually want, and how do you prepare for it as an FDE?

**Answer:**

Auditors test each control by sampling **evidence** that it operated. What they ask for, by control area:

| Control area | Evidence auditors sample |
|--------------|--------------------------|
| Access control | User access lists, **access reviews** (quarterly, with sign-off), onboarding/offboarding tickets (was access revoked when someone left?), MFA enforcement config |
| Change management | PR/merge records showing **review + approval**, CI passing (tests, security gates), no direct-to-prod, ticket→deploy traceability |
| Vulnerability mgmt | Scan reports (SAST/SCA/container), remediation tickets with SLAs, pentest report + fixes |
| Monitoring/logging | Log samples, alert configs, evidence alerts were triaged |
| Incident response | IR policy, **postmortems** for any incidents, tabletop records |
| Risk assessment | Annual risk assessment doc, **threat models** |
| Vendor management | Subprocessor list, their SOC 2 reports, DPAs |
| BC/DR (Availability) | Backup configs, **restore test** evidence, DR runbook |
| Encryption | KMS configs, TLS configs, key rotation evidence |
| HR/security | Background checks, security-awareness training completion, signed policies |

The critical realization: SOC 2 tests that controls **operated consistently over the whole period**, so evidence must be **continuously generated and retained**, not manufactured the week before the audit. If access reviews are supposed to be quarterly, the auditor wants *four* of them with dates and sign-offs across the year.

As an FDE preparing a customer (or your own deployment): **wire evidence generation into the tooling** — access reviews as a scheduled task, change management enforced by branch protection + required CI (so every merge *is* evidence), automatic retention of scan reports and audit logs, ticketed remediation with SLAs. Compliance-automation platforms (Vanta, Drata, Secureframe) connect to your cloud/GitHub/IdP and *collect* this continuously — they turn "scramble for evidence" into "it's already there."

**Interview trap:** treating SOC 2 as a documentation exercise you cram for. Type II specifically tests *operation over time* — you cannot back-fill four quarters of access reviews the week before. The senior move is building controls that *emit evidence as a byproduct of normal operation* (branch protection, scheduled reviews, immutable logs).

---

### Q4. GDPR — what are the lawful bases for processing, and why does it matter for an AI product?

**Answer:**

GDPR requires that *every* processing of personal data has one of **six lawful bases** (Art. 6). You must identify and document which one *before* processing, and it constrains what you can do:

| Lawful basis | When it applies | AI-product notes |
|--------------|-----------------|------------------|
| **Consent** | Data subject freely, specifically, informedly agreed | Must be opt-in, granular, withdrawable; **shaky basis for training** on user data — hard to make it "freely given" and specific |
| **Contract** | Processing needed to perform a contract with the subject | The core product function (answering questions over *their* docs) usually rides here |
| **Legal obligation** | Law requires it | E.g., retaining records for tax |
| **Vital interests** | Life-or-death | Rare |
| **Public task** | Official authority/public interest | Public sector |
| **Legitimate interests** | Your (or a third party's) interests, *balanced against* the subject's rights | Common for security/fraud; **requires a balancing test (LIA)**; often cited for AI training but contested by regulators |

Why it matters for AI specifically:
- **Training on personal data** is the hard case. Neither consent nor legitimate interests is a slam-dunk basis; regulators (and the EU AI Act) scrutinize it. This is *why* enterprise customers demand **no-training clauses** (Q17) — they don't want their (or their users') personal data becoming a lawful-basis problem baked into your model weights, which you can't easily un-bake.
- **Purpose limitation** (Art. 5) — data collected for purpose A can't be silently repurposed for B (e.g., "support" data used for "model training"). Each purpose needs its basis.
- **The basis constrains the rights** — e.g., the right to erasure and to object behave differently under consent vs. legitimate interests vs. contract.

**Interview trap:** "we'll just get consent for everything." Consent under GDPR is a high bar (freely given, specific, informed, unambiguous, as-easy-to-withdraw) and is often the *weakest* basis operationally — if you rely on it, withdrawal must stop processing. For core product function, **contract** is usually cleaner; for training, there may be *no* clean basis, which is a product/architecture decision, not a checkbox.

---

### Q5. Walk me through handling a DSAR (Data Subject Access Request) and the right to erasure.

**Answer:**

GDPR gives data subjects rights (Art. 15–22); the two that hit architecture hardest are **access (DSAR, Art. 15)** and **erasure ("right to be forgotten", Art. 17)**.

**DSAR (access):** a subject asks "what personal data do you hold about me, and how is it processed?" You must, generally **within one month**, provide: the data, the purposes, the recipients/subprocessors, retention periods, and the source. Operationally this requires you to be able to **find all personal data about one person across every system** — Postgres, S3 documents, embeddings/vector DB, logs, backups, caches, and any subprocessor. If you can't map where a person's data lives, you can't answer a DSAR.

**Erasure:** the subject asks you to delete their data (applies when e.g. the basis was consent and it's withdrawn, or data's no longer needed). You must delete across all those same systems — including **derived data** like embeddings, and propagate to subprocessors — with defined exceptions (legal-retention obligations).

The architecture implications (this is why governance is *designed in*):
- **Data mapping / inventory** — you must know, per data category, *where it lives and how to find it by subject*. Tag data with subject/tenant identifiers so you can locate and delete it.
- **Deletion must reach derived data** — embeddings and vector-DB entries derived from a person's document are *also* their personal data; a DSAR erasure that leaves embeddings behind is non-compliant. Per-tenant/per-document indexing makes this tractable; a giant shared index makes it a nightmare.
- **Backups** — you can't always instantly purge backups; the accepted approach is a documented policy (data deleted from production, and expires from backups on the normal cycle, and won't be restored into an active system).
- **Logs** — audit logs may contain personal data; balance erasure against the need to keep security evidence (log *references*, not raw PII — see `09` Q10).

```typescript
// Deletion must cascade to ALL stores including derived data.
async function eraseSubject(subjectId: string, tenantId: string) {
  await db.query('DELETE FROM documents WHERE subject_id = $1 AND tenant_id = $2', [subjectId, tenantId]);
  await vectorDb.deleteByFilter({ subjectId, tenantId });        // derived embeddings — MUST include
  await objectStore.deletePrefix(`${tenantId}/${subjectId}/`);   // uploaded files
  await cache.deletePattern(`${tenantId}:${subjectId}:*`);
  auditErasure(subjectId, tenantId);                             // record the erasure (a reference, not the data)
  // backups: documented policy — expire on cycle, never restore into active system
}
```

**Interview trap:** forgetting **derived data**. Deleting the source document but leaving its embeddings/vectors (and any fine-tuned model influence) means you still hold the person's personal data. This is a big reason **training on customer data is architecturally toxic** — you can't erase a person from model weights, so a DSAR erasure becomes impossible-to-satisfy. Design so personal data is *locatable and deletable*, and keep it *out* of anything you can't selectively delete.

---

### Q6. What are data minimization and purpose limitation, and how do they shape a RAG pipeline?

**Answer:**

Two GDPR Art. 5 principles that are also just good security:
- **Data minimization** — collect/process only what's *necessary* for the purpose. Don't hoard.
- **Purpose limitation** — use data only for the specified, explicit purpose you collected it for; no silent repurposing.
- (Related: **storage limitation** — keep it only as long as needed.)

How they reshape a RAG/GenAI pipeline concretely:
- **Redact/minimize PII *before* embedding.** If the retrieval task doesn't need names/SSNs/emails, strip or tokenize them before they enter the vector store and the prompt — so the sensitive data never proliferates into embeddings, logs, and the LLM context. (Pipeline detail in `06`.) This is minimization applied to derived data.
- **Don't send more context to the LLM than the task needs** — retrieve top-k relevant chunks, not the whole corpus; every token sent to an external model is data leaving your boundary.
- **Separate purposes with separate data flows** — "answer the user's question" (contract basis) and "improve our product/train" (a different, harder basis) must not share a silent pipeline. If you log prompts for debugging, that's a *new purpose* needing its own basis, retention, and access controls.
- **Retention on the derived artifacts** — embeddings and cached answers get retention/deletion policies too (Q11), not just source docs.
- **Collect fewer fields** at ingestion; don't slurp an entire user profile because it's convenient.

**Production war story:** a customer's RAG pipeline logged every prompt *and the full retrieved context* to a debugging index "temporarily" — which meant customer PII from documents was duplicated into a second, less-protected store with no retention policy, used for a *different purpose* (debugging) than collection (answering). That's a purpose-limitation *and* minimization *and* storage-limitation violation in one pipeline, and it doubled the breach surface. Fix: redact before embed, log *references* not content, and put a 7-day TTL on debug data with tighter access. Minimization isn't just legal hygiene — every copy of PII you don't make is a copy that can't leak.

**Interview trap:** treating minimization as "collect less at signup" only. In an AI system the sharp edge is **derived data** — embeddings, logs, caches, and training sets *are* processing of personal data and are subject to the same principles. The RAG pipeline is where minimization/purpose-limitation get violated by accident.

---

### Q7. What is a DPA, and what should it contain? What's a subprocessor?

**Answer:**

A **DPA (Data Processing Agreement)** is the contract required by GDPR Art. 28 between a **controller** (decides *why/how* data is processed — usually your customer) and a **processor** (processes on the controller's instructions — usually you, the SaaS/AI vendor). It's mandatory whenever a processor handles personal data on a controller's behalf.

A DPA must specify (Art. 28(3)):
- **Subject matter, duration, nature, purpose** of processing, and the **types of data + categories of subjects**.
- Processor only acts on **documented instructions** from the controller.
- **Confidentiality** obligations on personnel.
- **Security measures** (Art. 32 — appropriate technical/organizational measures).
- **Subprocessor** terms (below).
- Assistance with **data-subject rights** (DSARs, erasure — you must help the controller fulfill them).
- Assistance with **breach notification** and DPIAs.
- **Deletion/return** of data at end of contract.
- **Audit rights** — the controller can audit/inspect.

A **subprocessor** is a third party *you* engage to process the data — your cloud provider (AWS), your LLM provider (OpenAI/Anthropic), your vector DB host, your email provider. GDPR requires you to: (1) have the controller's authorization to use subprocessors, (2) flow the *same* data-protection obligations down to them via contract, (3) maintain a **subprocessor list** and notify customers of changes, and (4) remain liable to the controller for your subprocessors.

Why this is architecture, not just legal: your **LLM provider is a subprocessor**, and that's exactly where the **no-training clause and deletion SLA (Q17)** live — the customer's DPA with you flows down to your DPA with the model provider. If you can't get a no-train commitment from your subprocessor, you can't offer it to your customer, and the deal may die. So subprocessor selection is a *compliance-driven architecture decision*.

**Interview trap:** conflating controller and processor, or thinking the DPA is boilerplate. Who's the controller vs. processor determines who owns lawful basis, who fields DSARs, and who's liable — and the subprocessor chain (you → cloud + LLM provider) is precisely where AI-specific data-handling commitments must be secured and flowed down.

---

### Q8. HIPAA basics — what's PHI, what's a BAA, and what does it require of an AI system?

**Answer:**

HIPAA (US) governs **Protected Health Information (PHI)** — individually identifiable health information held/transmitted by covered entities and their business associates. Key concepts:

- **PHI** = health info + one of 18 identifiers (name, dates, MRN, SSN, email, device IDs, biometric, even IP in context, etc.) that can identify the individual. Health data *plus* identity.
- **Covered entity** = providers, health plans, clearinghouses. **Business associate (BA)** = a vendor that handles PHI on their behalf — *this is you* if your AI product processes PHI.
- **BAA (Business Associate Agreement)** = the mandatory contract (analogous to a GDPR DPA) between covered entity/BA and a BA/subcontractor. **You cannot lawfully touch PHI without a signed BAA**, and you must flow BAAs down to *your* subprocessors that touch PHI (your cloud provider — AWS/GCP/Azure offer BAAs; your LLM provider — *do they sign a BAA?* often the gating question).

What HIPAA requires architecturally (Security Rule — administrative, physical, technical safeguards):
- **Access controls** (unique user IDs, least privilege, RBAC), **audit controls** (log access to PHI — forensic logging, `09`), **integrity** controls, **transmission security** (encryption in transit), and **encryption at rest** (addressable but effectively required).
- **Minimum necessary** — only access the PHI needed for the task (echoes minimization).
- **Breach notification rule** — notify affected individuals + HHS (and media if large) within **60 days**.
- **De-identification** — the Safe Harbor method (strip all 18 identifiers) or Expert Determination lets data escape PHI status, which is often the smart architecture: **de-identify before it hits the AI pipeline** so you're not processing PHI in the model context at all.

The AI gating question: **will your LLM/vector-DB/subprocessor sign a BAA?** If your model provider won't, you must either use a provider/deployment that will (in-VPC model, a provider offering a BAA), or **de-identify PHI before it leaves your boundary**. This is a hard architecture fork determined entirely by a compliance fact.

**Interview trap:** thinking "we encrypt data, so we're HIPAA compliant." HIPAA is a whole program (BAAs, access controls, audit, minimum-necessary, breach process, training, risk analysis), and the *first* blocker is usually the **BAA chain** — no BAA with a subprocessor that sees PHI = you're non-compliant regardless of encryption. And there's no "HIPAA certification"; it's an obligation you attest to and can be audited/fined on.

---

### Q9. PCI-DSS — what is it and how does scope minimization change your architecture?

**Answer:**

PCI-DSS is the **Payment Card Industry Data Security Standard** — a prescriptive, contractual standard (from the card brands, not a law) for anyone who **stores, processes, or transmits cardholder data (CHD)**. Unlike SOC 2 it's *prescriptive* (12 requirements, specific controls) and unlike GDPR it's contractual (enforced via your acquirer/brands).

The single most important architectural idea is **scope minimization**: PCI applies to your **Cardholder Data Environment (CDE)** — every system that touches CHD *plus everything connected to it*. Scope is expensive (segmentation, quarterly scans, pentests, strict controls). So the winning move is to **shrink the CDE to almost nothing**:

- **Never store the PAN (card number)** if you can avoid it. Use a **tokenization** provider or a payment processor (Stripe, Adyen, Braintree) so the raw card data goes *directly from the user's browser to the processor* (hosted fields / redirect / iframe) and **never touches your servers**. Your systems only ever see a **token**.
- This can drop you from the onerous **SAQ D** (full requirements) to **SAQ A** (a handful of requirements) because your servers are out of CDE scope entirely.
- **Network segmentation** — if any system does touch CHD, isolate it hard (its own segment/VPC, strict firewalling) so the *rest* of your infrastructure is out of scope. Un-segmented flat networks put *everything* in scope.

```
BAD  (large CDE, SAQ D):
  Browser → Your App (handles PAN) → Your DB (stores PAN) → Processor
            └────── entire app + DB + connected systems IN SCOPE ──────┘

GOOD (minimized CDE, ~SAQ A):
  Browser ──(PAN via processor's hosted iframe)──▶ Processor ──▶ token
       └─ Your App only ever sees a TOKEN; PAN never touches your servers ─┘
```

For an FDE building an AI product that *happens* to have billing: keep payments entirely in a processor's hosted flow, so PCI scope is minimal and doesn't entangle the AI/data platform. Don't let card data anywhere near the systems handling documents/embeddings.

**Interview trap:** thinking "we use Stripe so PCI doesn't apply to us." It still applies — but you qualify for the *minimal* SAQ *if* you implement it correctly (hosted fields/redirect, no PAN on your servers, correct integration). Misimplementing (e.g., proxying card data through your API, or a self-hosted form that posts to you) drags you back into full scope. Scope minimization is a design decision you can get wrong.

---

### Q10. Explain data residency and sovereignty. How do they constrain a GenAI deployment?

**Answer:**

- **Data residency** — a requirement that data is *stored* (and often processed) in a specific geography (e.g., "EU customer data stays in the EU," "German data in Germany"). Often contractual or driven by regulation.
- **Data sovereignty** — the stronger notion that data is subject to the *laws* of the country it resides in, and sometimes that it must be protected from *foreign* government access (e.g., concerns about the US CLOUD Act reaching data held by US companies even in EU regions). This can require in-country infrastructure and even *operational* control by local entities.
- **Data localization** — hard legal mandates that certain data never leaves the country (some sectors/countries).

How they constrain a GenAI deployment (this is often the *hardest* architecture constraint):
- **Region-pinned everything** — Postgres, S3, vector DB, *and the LLM inference* must run in the required region. Multi-region-by-default cloud designs can silently violate residency (e.g., a global table, a backup replicated cross-region, a CDN edge).
- **The LLM is the sharp edge.** If the customer requires EU residency and your model provider only serves from US regions, you *cannot* send the prompt (containing their data) to that provider. Options: a provider with in-region endpoints, an **in-VPC / self-hosted model** in the required region, or de-identification before egress. This can force your entire model-serving architecture.
- **Sovereignty may forbid US-owned cloud/model providers entirely** for some government/defense customers → sovereign cloud (e.g., EU-operated) or on-prem/air-gapped deployment. As an FDE, an air-gapped in-VPC model deployment is sometimes the *only* answer.
- **Backups, logs, DR** must also respect residency — a DR region in another jurisdiction breaks it.
- **Support access** — even *engineers accessing* the data from another country can implicate sovereignty; you may need in-region support and access controls.

```
Decision: where can the model run?
  Customer requires EU residency?
    ├─ No  → use managed provider, any region that meets other reqs
    └─ Yes → provider has EU-region endpoint with data-stays-in-EU commitment?
              ├─ Yes → use it, pin region, verify no cross-region backup/logging
              └─ No  → sovereignty concern (foreign-gov access) too?
                        ├─ No  → self-host/in-VPC model in EU region
                        └─ Yes → sovereign cloud or on-prem/air-gapped in-country
```

**Interview trap:** treating residency as "just pick the region." Cloud defaults (cross-region replication, global services, CDN, backups, DR, telemetry) leak data across borders silently, and the **LLM inference endpoint** is the component people forget — sending EU personal data to a US model API is a residency/transfer violation regardless of where your app runs. Residency/sovereignty frequently *dictates* whether you can use a managed model at all.

---

### Q11. How do you handle PII classification, retention, and deletion? Give a decision table.

**Answer:**

You can't protect data you haven't classified. A **data classification scheme** assigns sensitivity so controls, retention, and handling follow automatically:

| Class | Examples | Handling / controls | Retention default |
|-------|----------|---------------------|-------------------|
| **Public** | Marketing copy, public docs | No special controls | As needed |
| **Internal** | Internal docs, non-sensitive logs | Access-controlled, no external sharing | Per business need |
| **Confidential** | Customer documents, business data, most embeddings | Encryption at rest+transit, RBAC, audit access, tenant isolation | Per contract; delete on offboard |
| **Restricted / Sensitive PII** | SSNs, health (PHI), financial (CHD), biometrics, special-category GDPR data | Above + minimize/redact, strict least-privilege, DLP, often de-identify before processing | Minimum necessary; strict deletion |

**PII specifically** — distinguish **direct identifiers** (name, SSN, email), **quasi-identifiers** (DOB+zip+gender can re-identify), and **special categories** (health, biometric, race, religion, sexual orientation — GDPR Art. 9, extra protection). Handling: minimize collection, redact/tokenize before it spreads into embeddings/logs (Q6), encrypt, tightly access-control, and audit access.

**Retention & deletion** — every data category needs a defined **retention period** (storage limitation) and a **deletion mechanism**:
- Retention driven by: legal obligation (tax records), contract (customer says delete-on-offboard), and minimization (delete when purpose served).
- Deletion must be **actual and cascading** — including derived data (embeddings), caches, and a documented backup-expiry policy (Q5).
- **Automate it** — TTLs, lifecycle policies (S3 lifecycle → expire/transition), scheduled purge jobs — because manual "we'll delete it eventually" never happens and becomes a liability.

```typescript
// Retention as policy-as-code, keyed on classification.
const RETENTION: Record<string, { days: number; cascadeDerived: boolean }> = {
  audit_log:        { days: 365, cascadeDerived: false },  // keep for compliance evidence
  customer_docs:    { days: 0,   cascadeDerived: true  },  // delete on offboard; cascade to embeddings
  debug_prompt_log: { days: 7,   cascadeDerived: true  },  // minimize: short TTL
  cached_answers:   { days: 1,   cascadeDerived: false },
};
```

**Interview trap:** keeping data "just in case." Under GDPR/minimization, holding data with no defined purpose or retention is itself a violation *and* pure downside risk (bigger breach surface, more DSAR scope, more to leak). The senior posture is **delete aggressively by default**, retain only with a documented reason and period, and *automate* deletion including derived data.

---

### Q12. What is a DPIA and when do you need one for an AI system?

**Answer:**

A **DPIA (Data Protection Impact Assessment)** is a GDPR Art. 35 process to identify and mitigate privacy risks of a processing activity *before* you build it. It's **mandatory** when processing is "likely to result in a high risk" to individuals — and AI systems frequently trip the triggers:

DPIA required (per Art. 35 + regulator guidance) especially for:
- **Systematic, extensive evaluation/profiling** with automated decisions producing legal/significant effects (a lot of AI decisioning).
- **Large-scale processing of special-category data** (health, biometrics).
- **Large-scale systematic monitoring**.
- Use of **new technologies** (LLMs/AI often flagged), innovative processing, matching/combining datasets.

A DPIA documents:
1. **Description** of the processing — what data, purposes, flows (a data-flow diagram — reuse the threat-model DFD from `07`), subprocessors (incl. the LLM provider), retention.
2. **Necessity & proportionality** — is this processing necessary for the purpose, and is the lawful basis solid (Q4)? Could you achieve it with *less* data (minimization)?
3. **Risks to individuals** — re-identification, data leakage (prompt injection exfiltration!), automated-decision harms, bias/discrimination, function creep, cross-border transfer.
4. **Mitigations** — the controls (redaction/minimization, tenant isolation, no-train clauses, human-in-the-loop for significant decisions, transfer safeguards, retention limits, DLP).
5. **Sign-off** — often the DPO; consult the supervisory authority if high residual risk remains.

For AI you *add* AI-specific risk analysis: training-data provenance and basis, model bias/fairness, prompt-injection-driven disclosure, hallucination harms if outputs drive decisions, and the transparency/explainability obligations (and the EU AI Act's overlapping requirements for higher-risk systems).

The FDE angle: the DPIA is a deliverable the customer's privacy team needs *before* go-live, and it reuses your threat model (`07`) — the DFD, the data classification, and the mitigations are largely shared. Running the DPIA alongside the threat-modeling session is efficient and signals maturity.

**Interview trap:** doing a DPIA as an after-the-fact form. It's meant to be *before* building (privacy-by-design, Art. 25) so its mitigations shape the architecture — e.g., the DPIA is often *what surfaces* that you must redact PII before embedding, can't train on the data, or must keep inference in-region. Done late, it just documents risks you've already baked in.

---

### Q13. Privacy by design and by default — what does it actually mean in code and architecture?

**Answer:**

GDPR Art. 25 mandates **data protection by design and by default** — privacy baked into the system, not bolted on, with the *most privacy-protective settings as the default*. Concretely for a GenAI platform:

**By design (architecture):**
- **Minimize at ingestion** — collect/retain only what's needed; redact PII before it enters embeddings/logs (Q6).
- **Tenant/data isolation as a structural property** — RLS, per-tenant indexes (`03`, `07`), so cross-tenant leakage is architecturally hard, not just policy.
- **Deletion designed in** — data is locatable by subject and deletable including derived data (Q5); no data in anything you can't selectively erase (i.e., don't train on customer data).
- **Encryption everywhere**, least-privilege access (`05`, `08`), forensic audit logging without storing raw PII (`09` Q10).
- **Keep data in-boundary** — prefer in-VPC/in-region processing; no-train subprocessor commitments (Q17).

**By default (settings):**
- Sharing/visibility defaults to **private**, not public.
- Retention defaults to the **shortest** viable, not "forever."
- Data collection defaults to **off/minimal** — features that collect more require opt-in.
- Model-improvement/telemetry defaults to **off** for customer data.

```typescript
// "By default": the safe choice requires no action; the risky one is explicit + logged.
const defaults = {
  documentVisibility: 'private',     // not 'org-wide' or 'public'
  retentionDays: 30,                 // shortest viable, extendable by explicit config
  useDataForImprovement: false,      // opt-IN, never opt-out
  piiRedactionBeforeEmbedding: true, // on by default
  crossTenantSharing: false,
};
```

The test: if a user or admin does *nothing*, is their data maximally protected? If the *insecure* thing requires deliberate action (and is logged), you've done privacy-by-default. If protection requires the user to find and toggle a setting, you haven't.

**Interview trap:** interpreting "by design" as "we thought about privacy." It's a *legal requirement* with teeth (fineable), and "by default" is specific — the shipping defaults must be the private ones. A product that defaults documents to org-wide-visible or defaults to using customer data for training fails Art. 25 regardless of what toggles exist.

---

### Q14. How does compliance concretely shape a GenAI architecture? Give the decision points.

**Answer:**

This is the file's thesis. Each compliance fact forces an architecture decision *before* you write code:

| Compliance driver | Architecture decision it forces |
|-------------------|--------------------------------|
| **No-training contractual clause** (enterprise standard) | Cannot fine-tune on customer data; RAG (retrieval, not training) becomes the default architecture; subprocessor (LLM provider) must contractually commit no-train (Q17) |
| **Data residency (EU/country)** | Region-pin all stores *and inference*; may force in-VPC/self-hosted model; no cross-region backup/DR/telemetry (Q10) |
| **Data sovereignty (no foreign access)** | Sovereign cloud or on-prem/air-gapped; possibly self-hosted open model; local-only support access (Q10) |
| **HIPAA / PHI** | BAA chain incl. LLM provider, or de-identify PHI before egress; audit all PHI access; minimum-necessary retrieval (Q8) |
| **GDPR erasure** | Data locatable + deletable by subject incl. embeddings; *don't* train on personal data (can't erase from weights) (Q5) |
| **Minimization / purpose limitation** | Redact PII before embedding; retrieve minimal context; separate purposes' data flows; retention/TTL on derived data (Q6, Q11) |
| **SOC 2 / audit** | RBAC + access reviews, change management gates, forensic audit logging, monitoring — evidence-emitting by design (Q3) |
| **PCI (if billing)** | Keep card data in processor's hosted flow, out of the AI platform entirely (Q9) |
| **AI-specific (DPIA / EU AI Act)** | Human-in-the-loop for significant automated decisions, bias/transparency controls, DPIA-driven mitigations (Q12) |

The unifying pattern: **RAG-over-your-own-data with strict tenant isolation, PII minimization, in-boundary/in-region processing, no training on customer data, and forensic audit logging** is not just a good technical design — it's the design that *satisfies the union of these obligations*. The compliance requirements and the security architecture (from `03`, `05`, `06`, `07`, `08`, `09`) converge on the same answer.

```
Compliance-driven GenAI reference shape:
  [Tenant-isolated docs] → [redact PII] → [per-tenant embeddings, in-region]
        → [retrieval scoped to tenant/user ACLs] → [in-VPC or no-train model, in-region]
        → [output DLP] → [answer]     (all steps: forensic audit log, no raw PII in logs)
  NEVER: customer data into training/fine-tuning; data crossing the required region/boundary.
```

**Interview trap:** treating compliance as a legal checkbox *after* the architecture is built. The senior insight — and the FDE's value in a customer engagement — is that these obligations are *architectural inputs*: they decide RAG-vs-fine-tune, managed-vs-self-hosted model, which region, which subprocessors, and how data is minimized/deleted. Discover them in week one (via the DPIA/threat model), not at the security review before go-live.

---

### Q15. Contrast the frameworks. When does each apply and how do they overlap?

**Answer:**

| Framework | Type | Trigger (does it apply?) | Enforced by | Key artifact |
|-----------|------|--------------------------|-------------|--------------|
| **SOC 2** | Voluntary attestation | You're a B2B service org; customers demand trust proof | Market/procurement (auditor opinion) | SOC 2 Type II report |
| **GDPR** | Law | You process personal data of people in the EU/EEA (extraterritorial) | EU regulators (fines up to 4% global revenue) | DPAs, DPIAs, records of processing |
| **HIPAA** | Law (US) | You handle PHI as a covered entity or business associate | HHS/OCR (fines) | BAAs, risk analysis |
| **PCI-DSS** | Contractual standard | You store/process/transmit cardholder data | Card brands/acquirers | SAQ / AoC, ROC |
| **CCPA/CPRA** | Law (US-CA) | Business meeting thresholds handling CA residents' data | CA AG/CPPA | Privacy notices, opt-out |
| **ISO 27001** | Voluntary certification | Want a certifiable ISMS (global, common in EU/APAC) | Accredited certifier | Certificate + Statement of Applicability |
| **EU AI Act** | Law | Provide/deploy AI systems in the EU (risk-tiered) | EU regulators | Conformity assessment (high-risk) |

Overlaps and how to not duplicate work:
- **They share a control core.** Encryption, access control, audit logging, incident response, risk assessment, vendor management appear in *all* of them. Build the control *once* and map it to each framework's requirement (a **crosswalk / common controls framework**), rather than running separate programs.
- **SOC 2 Privacy ≈ parts of GDPR**, but GDPR is law with specific rights; SOC 2 tests *your stated* commitments. ISO 27001 and SOC 2 Security overlap heavily (many orgs do both, one evidence set).
- **GDPR + HIPAA + PCI can *all* apply** to one system (an EU health app taking payments) — you take the *union* and, where they differ, the *strictest* requirement.
- **The differences that matter:** GDPR/HIPAA are *law* (fines, you can't opt out if triggered); SOC 2/ISO are *voluntary but market-required*; PCI is *contractual*. So GDPR/HIPAA are non-negotiable gates; SOC 2/ISO are deal-enablers you time to demand.

**Interview trap:** running each framework as a separate silo of duplicated work, or thinking one implies another ("we're SOC 2, so we're GDPR compliant" — false; SOC 2 is an attestation of *your* controls, GDPR is legal obligations with specific data-subject rights SOC 2 doesn't grant). Build a **common controls framework**, map once, satisfy many.

---

### Q16. A customer asks "are you compliant?" — how do you answer as an FDE without overpromising?

**Answer:**

"Compliant" is ambiguous and overclaiming is a legal/trust landmine. The disciplined answer:

1. **Disambiguate what they're actually asking.** Usually it's one of: "do you have a SOC 2 report?", "will you sign a DPA/BAA?", "where does our data live and does it train your model?", "can you meet our security requirements?" Pin down the real question — often the security/privacy questionnaire tells you.
2. **State facts, not adjectives.** Instead of "yes, we're compliant," say: "We have a SOC 2 Type II report covering Security and Confidentiality — here it is under NDA. We sign DPAs with SCCs for EU transfers. Data is processed in <region> and we contractually do not train on customer data. We are not currently HIPAA-BAA-ready; if you need that, here's the gap and timeline." Precise, verifiable claims.
3. **Map to *their* obligations.** Their security team has a control checklist; walk it and show which controls you meet, which are in progress, and which need a compensating control or an accepted risk (tie to the threat model, `07`).
4. **Never claim a certification you don't have or overstate scope.** Saying "HIPAA compliant" when your LLM subprocessor won't sign a BAA is how you get sued. If you don't do it, say so and offer the path (de-identification, in-VPC model).
5. **Provide the artifacts:** SOC 2 report (under NDA), DPA/BAA templates, subprocessor list, pentest summary, data-flow/residency docs, and completed security questionnaire (CAIQ/SIG). Having these ready *is* the trust signal.

The FDE framing: your credibility comes from **honest precision** — a security team trusts the vendor who says "we don't do X yet, here's the mitigation and timeline" far more than the one who claims blanket "compliance." Overclaiming, once caught, kills the deal and the relationship; honest gap-disclosure with a plan often *closes* it.

**Interview trap:** answering "are you compliant?" with "yes." Compliant *with what*, *at what scope*, *proven how*? The senior answer disambiguates, states verifiable facts (report + scope + region + no-train + subprocessors), maps to the customer's specific requirements, and is honest about gaps with a remediation path — never a bare adjective.

---

### Q17. Explain no-training clauses and deletion SLAs. Why are they contractual load-bearing for AI deals?

**Answer:**

These are the two AI-specific contractual commitments enterprise customers demand, and they translate directly into architecture and subprocessor selection:

**No-training (no-retention) clause:** the customer's data (prompts, uploaded documents, outputs) **will not be used to train or fine-tune any model**, and often will not be retained by the model provider beyond the request. Why it's load-bearing:
- Training on their data risks their **confidential/personal data being memorized and regurgitated** to other customers (a real LLM failure mode), and creates the **un-erasable** problem (Q5 — you can't DSAR-delete from weights).
- It's frequently a hard requirement from *their* legal/security — no clause, no deal.
- **It flows down the subprocessor chain (Q7):** you can only promise your customer no-training if *your model provider* contractually commits it (enterprise API tiers typically offer "no training on your data" and zero/short retention; consumer tiers often don't). So the clause **dictates which model provider/tier/deployment you can use** — sometimes forcing an in-VPC/self-hosted model if no provider will commit.

**Deletion SLA:** a contractual commitment to delete customer data within a defined time (e.g., "within 30 days of request/termination, including backups per our documented cycle, including derived data"). Why load-bearing:
- It operationalizes GDPR erasure/storage-limitation and the customer's own retention obligations.
- It requires the **deletion architecture** from Q5/Q11 — locatable, cascading-to-derived-data, with a backup-expiry policy — *and* flow-down so your subprocessors delete too, within a window that lets you meet *your* SLA.
- Missing it is a breach of contract with financial/reputational consequences.

Both clauses are why the **compliance-driven GenAI shape** (Q14) — RAG not training, no-train subprocessor, in-boundary processing, cascading deletion — is the default: it's the only architecture that can *honor these contracts*.

```typescript
// Enforcing no-train + retention at the provider boundary (config, not hope):
const llmRequest = {
  model, messages,
  // Enterprise-tier flags / headers that contractually disable training & set retention.
  // Belt: also select a provider/endpoint whose DPA guarantees no-train + zero retention.
  metadata: { store: false },       // provider-specific "do not retain/train"
};
// Deletion SLA machinery: on termination, cascade delete (Q5) AND request subprocessor purge,
// track completion within the contractual window, produce a deletion certificate.
```

**Interview trap:** treating no-train as a checkbox you promise and forget. It's only real if it **flows down to your subprocessor** and is enforced in how you call the model (enterprise tier / correct flags / in-VPC), and it *constrains your architecture* (no fine-tuning on customer data, provider selection). A no-train promise you can't back at the subprocessor layer is a contract you're breaching by default.

---

### Q18. Give me a pre-deployment compliance checklist an FDE runs with a customer.

**Answer:**

The checklist I walk before a regulated-customer go-live, organized to surface the *architecture-forcing* facts early (weeks, not the day before launch):

**Scoping — what applies?**
- [ ] What data classes will this handle? (PII? special-category? PHI? cardholder data?) → determines GDPR/HIPAA/PCI applicability.
- [ ] Whose data, in what jurisdictions? → residency/sovereignty (Q10), extraterritorial GDPR.
- [ ] Are we controller or processor for each data flow? (Q7)
- [ ] What frameworks are contractually/legally in scope? (SOC 2 asked for? GDPR? HIPAA BAA? PCI? their own framework?)

**Contracts & subprocessors**
- [ ] DPA signed; SCCs/transfer mechanism in place for cross-border. (Q7)
- [ ] BAA signed if PHI — *including with LLM/cloud subprocessors*. (Q8)
- [ ] **No-training clause** secured and flowed down to model provider. (Q17)
- [ ] **Deletion SLA** agreed and technically achievable incl. derived data. (Q17, Q5)
- [ ] Subprocessor list disclosed; each has adequate protections.

**Architecture controls (the technical gates)**
- [ ] Data residency: all stores *and inference* in required region; no cross-region backup/telemetry leak. (Q10)
- [ ] Tenant isolation verified (RLS, per-tenant indexes, retrieval ACLs — `03`, `07`).
- [ ] PII minimization/redaction before embedding; minimal retrieval context. (Q6)
- [ ] Encryption at rest + transit; KMS; least-privilege IAM (`05`, `08`).
- [ ] Forensic audit logging (no raw PII), immutable/segregated (`09`).
- [ ] Deletion mechanism cascades to embeddings/caches/backups-policy. (Q5, Q11)
- [ ] Retention policies defined + automated per data class. (Q11)
- [ ] Not training on customer data; RAG architecture. (Q14, Q17)

**Process & evidence (esp. SOC 2)**
- [ ] Access controls + periodic access reviews with sign-off. (Q3)
- [ ] Change management gates (PR review + CI security gates — `09`).
- [ ] Vulnerability management + pentest done, findings remediated (`09`).
- [ ] Incident response plan + runbooks + breach-notification path (`09`, Q's below).
- [ ] Threat model completed (`07`); **DPIA** completed for high-risk/AI processing. (Q12)
- [ ] SOC 2 report / security questionnaire (CAIQ/SIG) ready to share.

**AI-specific**
- [ ] Prompt-injection/exfiltration mitigations (`06`); output DLP.
- [ ] Human-in-the-loop for significant automated decisions (EU AI Act / DPIA). (Q12)
- [ ] Model access pattern respects boundary/residency (in-VPC vs managed). (Q10, Q14)

The FDE discipline: run the **scoping + architecture-forcing** items *first and early*, because a residency requirement or a "no-BAA-from-the-model-provider" fact can invalidate the whole deployment design — and you want to discover that in week one, not at the pre-launch security review.

**Interview trap:** running compliance as a launch-week checklist. The items that *force architecture* (residency, BAA/no-train subprocessor availability, controller/processor split, PHI/de-identification) must be discovered up front — they decide the design. A late-stage checklist just documents violations you've already built in and blows the go-live date.

---

### Q19. Cross-border data transfers under GDPR — SCCs, adequacy, Schrems II. Why does this bite AI deployments?

**Answer:**

GDPR restricts transferring personal data *out of the EEA* (Chapter V) unless there's a valid transfer mechanism. This is separate from residency — even if you're allowed to process EEA data, *moving* it to a third country needs a legal basis:

| Mechanism | What it is | When used |
|-----------|-----------|-----------|
| **Adequacy decision** | The EU deems a country's protection "adequate" (e.g., UK, Switzerland, Japan, and — via the **EU-US Data Privacy Framework** — certified US companies) | Transfer to an adequate country/framework needs no extra safeguard |
| **Standard Contractual Clauses (SCCs)** | EU-approved contract clauses binding the importer to GDPR-level protection | The workhorse for US/other transfers absent adequacy |
| **Binding Corporate Rules (BCRs)** | Approved intra-group rules for multinationals | Large orgs moving data within the group |
| **Derogations** | Explicit consent, contract necessity (narrow, occasional) | Exceptional, not for systematic transfers |

**Schrems II** (2020) invalidated the old Privacy Shield and, crucially, held that SCCs alone aren't automatically enough — you must do a **Transfer Impact Assessment (TIA)**: assess whether the destination country's laws (notably US surveillance law — FISA 702, EO 12333) undermine the SCCs, and if so add **supplementary measures** (strong encryption where *you* hold the keys, pseudonymization, so the importer/its government can't read the data in the clear). The **EU-US Data Privacy Framework (2023)** restored an adequacy route for *certified* US companies, but it's under legal challenge, so mature programs keep SCCs + a TIA as the belt-and-suspenders fallback.

Why it bites AI deployments specifically:
- Sending EEA personal data to a **US-hosted LLM API** is a cross-border transfer. It needs a mechanism (the provider being DPF-certified, or SCCs in your DPA) *plus* a TIA — and the supplementary measure that actually works is **not sending readable personal data at all**: pseudonymize/redact before egress (Q6), or keep inference **in-region/in-VPC** (Q10). The compliant technical answer to Schrems II is often the same minimization architecture you already built.
- The transfer analysis flows down your **subprocessor chain** (Q7) — every subprocessor outside the EEA (cloud region, model provider, monitoring vendor) is a transfer to paper over.
- It interacts with residency/sovereignty (Q10): the strongest customers resolve *both* transfer and residency by simply pinning everything — storage *and* inference — in-region, so no transfer occurs.

**Interview trap:** "we signed SCCs, so cross-border is handled." Post-Schrems II, SCCs require a **Transfer Impact Assessment** and often **supplementary technical measures** (self-held-key encryption, pseudonymization) to be valid where destination-country surveillance law is a concern. And relying solely on the EU-US DPF is fragile given the pending challenges — keep SCCs + TIA as backup. The robust answer for AI is to engineer the transfer *away* (in-region inference or redact-before-egress), not just paper it.

---

### Q20. What does a data governance operating model look like — roles, catalog, lineage — and why does an FDE care?

**Answer:**

Everything in this file (DSARs, erasure, minimization, retention, residency, breach scoping) is impossible without an operational **data governance** function underneath. It's the substrate, not a document:

**Roles / accountability:**
- **Data owner** — accountable for a data domain (e.g., "customer documents"): its classification, who may access it, retention.
- **Data steward** — operationally maintains quality, metadata, and policy enforcement for that domain.
- **DPO (Data Protection Officer)** — GDPR-mandated in some cases; independent oversight of privacy compliance, contact for regulators/subjects, signs off DPIAs.
- **Data custodian** — the technical team running the stores (implements the controls).

**Data catalog & inventory (a.k.a. Records of Processing, GDPR Art. 30):** a maintained inventory of *what data you hold, where, its classification, lawful basis, retention, and who can access it*. This is the thing that makes a DSAR answerable and a breach scopeable — if you can't enumerate "all systems holding data about subject X," you can't fulfill Q5 or Q19. GDPR literally *requires* a record of processing activities (Art. 30) for most orgs.

**Data lineage:** tracking how data flows and transforms — source document → redaction → embedding → vector store → retrieval → prompt → output. Lineage is what lets you answer "if we delete this document, what derived artifacts must also die?" (the cascading-deletion problem, Q5) and "did this PII end up somewhere it shouldn't?" (minimization/purpose-limitation, Q6).

**Policy as code:** classification tags, retention TTLs (Q11), access policies, and residency constraints enforced *in the platform* (RLS, lifecycle rules, IAM conditions), not just written in a policy PDF. Governance that lives only in documents rots; governance encoded in the system is self-enforcing and self-evidencing (and doubles as SOC 2 evidence, Q3).

Why an FDE cares: you're deploying into a customer's data estate, and the governance model determines whether your system can *meet its own compliance promises*. If the customer has no data catalog and no lineage, your "we can fulfill erasure within 30 days" SLA (Q17) is undeliverable — you literally can't find all the copies. Part of the FDE engagement is establishing (or plugging into) the governance model: tag data on ingestion, maintain lineage through the RAG pipeline, and encode retention/residency/access as policy-as-code so the compliance obligations from Q1–Q19 are *operational*, not aspirational.

**Interview trap:** treating governance as org-chart bureaucracy. It's the operational foundation that makes every compliance capability *possible*: no catalog → can't answer DSARs or scope breaches; no lineage → can't cascade deletion to derived data; no policy-as-code → controls rot and can't be evidenced. The senior view is that governance is the substrate security and compliance both stand on — and for an AI system, lineage through the embedding pipeline is the specific piece people forget.

---

### Q21. What's the breach-notification landscape, and how does it connect to your incident response?

**Answer:**

When an incident becomes a *data breach*, multiple **legal notification clocks** start — this is why the incident response in `09` (accurate severity, forensic logging, scoping) is a *compliance* function, not just an ops one:

| Regime | Who to notify | Deadline | Trigger |
|--------|---------------|----------|---------|
| **GDPR** | Supervisory authority | **72 hours** from awareness | Personal-data breach likely to risk individuals |
| **GDPR** | Affected individuals | "Without undue delay" | If **high** risk to their rights/freedoms |
| **HIPAA** | Individuals + HHS | **60 days** | Breach of unsecured PHI |
| **HIPAA** | Media | 60 days | If > 500 individuals in a state/jurisdiction |
| **US state laws** (all 50 + CCPA) | Individuals / AG | Varies (often "expedient"/specific days) | PII of state residents |
| **Contractual** | The customer | Often **24–72h** per DPA/MSA | Any breach of their data (often stricter than law) |
| **SEC (US public co.)** | Public disclosure | ~4 business days | Material cyber incidents |

Why this couples tightly to IR (`09`):
- **The clock starts at "awareness,"** so your detection/triage speed and your *severity call* (`09` Q17) directly affect whether you can meet 72 hours. You can't notify accurately without knowing *what data, whose, how much* — which requires **forensic-grade logging** (`09` Q10) and disciplined **scoping** (`09` Q9). Weak logging → you can't determine scope → you either can't notify lawfully or must over-notify.
- **"Secured" data may be exempt** — encryption safe-harbors exist (HIPAA, many state laws): if the breached data was properly encrypted and keys weren't compromised, notification may not be required. This is a *direct* incentive for the encryption/KMS design in `05`/`08`.
- **The DPA's contractual clock is often stricter** than the law (24h to the customer) — and it's the one that damages the relationship if missed.
- **Legal/DPO leads the notification decision**, not engineering — but engineering *enables* it with evidence. Your job in the incident is to produce a defensible scope determination *fast*.

**Interview trap:** thinking breach notification is purely a legal team problem. The *ability* to notify lawfully and accurately is built in engineering — forensic logging, data mapping (you must know whose data was in the breached system), encryption safe-harbors, and fast scoping. And the 72h GDPR clock means IR readiness (tested runbooks, `09` Q12) is a *compliance* requirement. Poor logging isn't just an ops gap; it can turn a contained incident into a mandatory over-disclosure.

---

### Q20. Tie it all together: how do compliance, governance, and the rest of the security module form one system?

**Answer:**

Compliance is the *why*, the rest of the module is the *how*, and data governance is the connective tissue. The whole Module 7 converges:

```
        COMPLIANCE OBLIGATIONS (10)                    Architectural inputs, week one
   GDPR · HIPAA · PCI · SOC2 · residency · contracts ───────────────┐
        │  no-train, deletion SLA, minimization, region             │
        ▼                                                            ▼
   THREAT MODEL + DPIA (07) ──── risks & security requirements ──▶ SECURE DESIGN
        │                                                            │
        ▼                                                            ▼
   AUTHN/AUTHZ + TENANT ISOLATION (01,02,03) ── crown-jewel data-access controls
   SECRETS/ENCRYPTION/INFRA (05,08) ── boundaries, KMS, IAM, residency enforcement
   OWASP/API (04) + AI GUARDRAILS (06) ── input/output defense, injection, DLP
        │                                                            │
        ▼                                                            ▼
   APPSEC GATES + RUNTIME DETECTION (09) ── prevent + detect what slips
        │                                                            │
        │  an incident happens                                       │
        ▼                                                            ▼
   INCIDENT RESPONSE (09) ── scope via forensic logs ──▶ BREACH NOTIFICATION (10)
        │                                                   (GDPR 72h, contracts)
        └──── postmortem ──▶ new threats (07), controls, and SOC2 evidence (10)
```

The load-bearing insights:
- **Compliance sets the architectural constraints** (Q14): no-train → RAG not fine-tuning; residency → in-region/in-VPC model; erasure → locatable/deletable data incl. embeddings; minimization → redact before embed. The *compliant* GenAI architecture and the *secure* one are the same architecture.
- **Governance (classification, retention, deletion, data mapping) is the substrate** that makes both compliance (DSARs, breach scoping, retention) and security (knowing what to protect and where it is) possible. You can't protect, delete, or report on data you haven't inventoried and classified (Q11).
- **The security controls double as compliance evidence** — RBAC + access reviews, change gates, encryption, audit logs, IR plan, threat models, DPIAs are simultaneously good security *and* the exact evidence SOC 2/GDPR/HIPAA auditors sample (Q3). Build once, satisfy both.
- **The loop closes:** incidents → forensic scope → lawful notification → postmortem → new threats/controls → updated evidence. Design → build → detect → respond → govern → back to design.

The FDE's job across this whole system: **discover the compliance constraints in week one** (they decide the architecture), **run the threat model/DPIA** that turns them into requirements, **build the controls** that are simultaneously security and evidence, and **be the competent first responder** whose forensic discipline makes lawful notification possible. Compliance isn't the paperwork at the end — it's the frame that shapes everything from `01` to here.

**Interview trap:** treating this module as ten separate topics. The senior signal is seeing it as **one system**: compliance obligations constrain the architecture, the architecture is secured by the auth/crypto/appsec layers, those controls generate the audit evidence compliance needs, incidents feed notification obligations and postmortems, and postmortems feed back into the threat model. An FDE who can trace a single requirement — say, "no training on customer data" — from a *contract clause* (`10`) to a *DPIA mitigation* (`10`) to a *threat-model requirement* (`07`) to a *RAG-not-fine-tune architecture* (`06`) to *tenant-isolated retrieval* (`03`) to *forensic audit logging* (`09`) is demonstrating exactly the cross-cutting judgment the role exists for.
