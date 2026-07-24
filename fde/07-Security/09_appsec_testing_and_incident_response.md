# AppSec Testing & Incident Response - Senior Interview Deep Dive

Two halves of the same job: *find the bugs before attackers do* (SAST/DAST/IAST/SCA, fuzzing, secret and container scanning, SBOM, SDLC gates) and *survive it competently when something slips through* (NIST incident lifecycle, a worked breach, forensic logging, blameless postmortems, on-call runbooks). An FDE sits in the customer's pipeline and often *is* the first responder when their deployment has an incident, so you need both the tooling map and the operational playbook. Framing is defensive/educational throughout. Every tool call and config below is complete and runnable.

---

### Q1. Map the AppSec testing tool categories: SAST, DAST, IAST, SCA. What does each see and miss?

**Answer:**

| Type | What it is | Sees | Misses | Stage |
|------|-----------|------|--------|-------|
| **SAST** | Static analysis of *source/bytecode* (white-box) | Injection sinks, hardcoded secrets, insecure APIs, taint flows — with file:line | Runtime/config issues, business-logic flaws, anything needing a running app; **false positives high** | Code / CI (early) |
| **DAST** | Attacks the *running app* from outside (black-box) | Reflected/stored XSS, injection that actually fires, authn issues, missing headers, real HTTP behavior | Code it can't reach (auth walls, unlinked endpoints); no file:line; **slow**; **false negatives** | Test / staging |
| **IAST** | Instruments the app (agent) *while it runs* under tests/DAST (grey-box) | Confirmed vulns with data flow + file:line, low false positives | Needs good test coverage to exercise paths; language-agent support | Test / CI with traffic |
| **SCA** | Analyzes *dependencies* against vuln databases | Known-CVE libraries, license issues, transitive deps | Zero-days, your own code, malicious-but-not-yet-CVE packages | Code / CI / registry |

The mental model:
- **SAST** reads your code and reasons about *possible* paths — high recall, low precision (noisy).
- **DAST** proves a path is *actually* exploitable from outside — high precision on what it reaches, low recall (misses unreached code).
- **IAST** combines them: watches the code execute under real traffic, so it confirms with low false positives *and* gives file:line — but only for paths your tests exercise.
- **SCA** is orthogonal — it's about *other people's* code you shipped, which is where most CVEs live.

You use all four because their blind spots don't overlap: SAST + SCA catch code and deps early/cheap; DAST/IAST catch what only appears at runtime. None alone is sufficient.

**Interview trap:** "SAST vs DAST — which is better?" They answer different questions (is the code risky vs. is the running app exploitable) and have opposite error profiles. The senior answer is *layered*: SAST/SCA as fast CI gates, DAST/IAST against a running build, plus manual pentest for logic flaws none of them find.

---

### Q2. How do you wire these into CI without drowning developers in false positives?

**Answer:**

The failure mode is a pipeline that dumps 800 SAST findings and gets ignored. Principles:

- **Gate on *new* findings, not the whole backlog.** Use differential/PR-scoped scanning — fail the build only on issues the PR *introduces* (baseline the existing debt separately). This keeps the signal about the change in front of you.
- **Fail only on high-confidence, high-severity.** Break the build on Critical/High with a known fix; report Medium/Low as annotations, don't block. Tune out noisy rules per-repo.
- **Right tool, right stage** — fast tools (SAST, secret scan, SCA) run on every PR (seconds–minutes); slow tools (DAST, fuzzing) run nightly or on a deploy to staging, not on every commit.
- **Findings as code review comments**, in the PR, with file:line and a fix — not a separate dashboard. Meet devs where they work.
- **Suppressions require a reason and expire.** Allow `// nosec: reviewed, input is constant` style suppressions but track and audit them; no silent global disables.
- **A security champion / triage rotation** owns tuning so devs trust the gate.

```yaml
# .github/workflows/security.yml — layered gates
name: security
on: [pull_request]
jobs:
  fast-gates:                          # runs on every PR, must be quick
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Secret scan (diff only)
        run: gitleaks detect --redact --log-opts="origin/main..HEAD"   # only new commits
      - name: SCA
        run: |
          npm ci
          npm audit --audit-level=high        # fail on High+ vulnerable deps
      - name: SAST (Semgrep, PR-scoped)
        run: semgrep ci --config auto          # 'ci' mode diffs against baseline
      - name: IaC scan
        run: checkov -d infra/ --compact --quiet
  dast:
    if: github.event.pull_request.base.ref == 'main'
    runs-on: ubuntu-latest                     # heavier, gated to main PRs / nightly
    steps:
      - run: docker compose up -d app
      - name: DAST baseline
        run: docker run --network host owasp/zap2docker-stable zap-baseline.py -t http://localhost:8080
```

**Production war story:** a customer's SAST gate blocked *every* build on 1,200 pre-existing findings, so they'd set it to `continue-on-error: true` — i.e., disabled it while looking compliant. We baselined the existing debt, switched to PR-differential mode, and tuned the top 10 noisiest rules off. New-finding count per PR dropped to 0–2, the gate went back to blocking, and developers stopped hating it. A gate everyone bypasses is worse than no gate — it's false assurance.

---

### Q3. What is fuzzing and when is it worth it for a web/API service?

**Answer:**

**Fuzzing** feeds a program large volumes of malformed/random/mutated input to trigger crashes, hangs, memory errors, or assertion failures — bugs you'd never write a test for. Variants:
- **Coverage-guided/mutation** (AFL, libFuzzer, Go's native `go test -fuzz`, Jazzer for JVM) — instruments the target, mutates inputs to maximize new code coverage, extremely effective on **parsers** and anything consuming untrusted bytes.
- **Generation-based** — builds inputs from a grammar/spec (great for structured formats).
- **API/protocol fuzzing** (RESTler, schemathesis from an OpenAPI spec) — throws malformed requests at endpoints, finds crashes, 500s, and spec violations.

Where it pays off for a web/API service:
- **Any custom parser** — file uploads (your PDF/CSV ingestion!), a query DSL, a protocol decoder. This is the highest-yield target; parsers are where memory-safety and DoS bugs hide.
- **Deserialization** and input validation boundaries.
- **API surface via the OpenAPI schema** — `schemathesis` auto-derives cases and finds 500s / contract violations cheaply.

```bash
# API fuzzing from an OpenAPI spec — finds crashes & schema violations
schemathesis run --checks all http://localhost:8080/openapi.json \
  --hypothesis-max-examples=500 --report

# Go native coverage-guided fuzz of a document parser
go test -fuzz=FuzzParsePDF -fuzztime=5m ./ingest
```

When it's *not* worth it: pure CRUD glue with no custom parsing and framework-handled input — the ROI is low vs. SAST/DAST. Fuzzing rewards code that turns bytes into structure.

Two operational notes: fuzzing wants a **corpus** (seed inputs) and **time** (run continuously, e.g., OSS-Fuzz-style, not once); and it produces **crashers** that become regression tests — every crash gets a permanent test with the offending input.

**Interview trap:** "we have unit tests, so we don't need fuzzing." Unit tests check inputs *you thought of*; fuzzing finds the inputs you didn't — the malformed length prefix, the nested-40-deep JSON, the Unicode edge case in the parser. Different failure class.

---

### Q4. Secret scanning — gitleaks vs trufflehog, and how do you handle a secret that's already committed?

**Answer:**

Both scan repos/history for credentials:
- **gitleaks** — fast, regex + entropy rules, great for **CI gates and pre-commit hooks** on the diff; easy to run on every push.
- **trufflehog** — regex + entropy *plus* **live verification** (it can actually test whether a found key still authenticates against the provider), which slashes false positives and tells you *this AWS key is still valid right now* — critical for triage.

Deploy both layers:

```bash
# 1. Pre-commit hook — stop secrets before they're committed
gitleaks protect --staged --redact          # scans staged changes, blocks commit

# 2. CI — scan the PR's new commits
gitleaks detect --log-opts="origin/main..HEAD" --redact --exit-code 1

# 3. Periodic deep scan with verification — is anything historical still LIVE?
trufflehog git file://. --only-verified --json
```

**If a secret is already committed, the order of operations matters — and it's counterintuitive:**

1. **Rotate/revoke first.** The credential is compromised the moment it hit a remote (assume bots scraped it within seconds — public GitHub keys get used in minutes). Rotation is the *only* thing that actually helps.
2. **Assess exposure** — was the repo public? For how long? Check the provider's logs (CloudTrail for AWS keys) for use during the window.
3. **Then** purge from history if you must (`git filter-repo`, BFG) — but **history rewriting does not un-leak it**; anyone who cloned/forked still has it, and it's in others' reflogs. Purging is hygiene, not remediation.
4. **Add a scanning gate** so it can't happen again, and move the secret to a secrets manager.

**Interview trap:** "just remove it from git history and force-push." That's the *least* important step and often skipped by people who think it's the fix. The credential is burned; **rotate it**. Removing from history without rotating is theatre — the secret is already in a hundred caches and possibly already used.

---

### Q5. Container and dependency scanning — trivy vs grype, and what do you do with the findings?

**Answer:**

**Trivy** and **Grype** both scan container images (and filesystems, IaC, and dependencies) against vulnerability databases and emit CVEs by package with fixed-version info:
- **Trivy** — broad (images, IaC, secrets, SBOM, K8s), one tool for many jobs, widely adopted.
- **Grype** — pairs with **Syft** (same maintainer) for SBOM-driven scanning, precise package matching.

The output is useless without a *policy for acting on it*:

- **Fail the build** on Critical/High **with a fix available** (`--ignore-unfixed` so you don't block on CVEs with no patch). Report unfixable ones for tracking/mitigation.
- **Scan at three points:** in CI (block bad builds), in the **registry continuously** (a CVE published *tomorrow* affects the image you shipped *today* — you only catch it by re-scanning), and optionally at admission (Q from `08`).
- **Prioritize with reachability/exploitability** — not every High CVE is reachable in your usage. Tools increasingly add EPSS (exploit-prediction) and reachability (is the vulnerable function actually called?) so you fix the 5 that matter, not all 200.
- **Patch path:** prefer bumping the dependency to the fixed version; if none exists, assess reachability, add compensating controls, and track it with an owner + expiry.

```bash
# CI gate: block on fixable High/Critical
trivy image --exit-code 1 --severity CRITICAL,HIGH --ignore-unfixed $IMG

# Generate SBOM once, scan the SBOM later (fast re-scans as new CVEs land)
syft $IMG -o cyclonedx-json > sbom.json
grype sbom:sbom.json --fail-on high
```

**Production war story:** Log4Shell (CVE-2021-44228) week. The customers who could answer "are we affected, and where?" in an hour were the ones with **SBOMs** — they grepped their SBOM inventory for `log4j-core` versions across every service and knew exactly which 6 of 40 services to patch first. The ones without SBOMs spent three days doing archaeology on running containers. Continuous registry re-scanning against an SBOM is the difference between an afternoon and a week.

---

### Q6. What is an SBOM, what formats exist, and why is it now a security control not just paperwork?

**Answer:**

An **SBOM (Software Bill of Materials)** is a machine-readable inventory of every component (direct + transitive) in your software: name, version, license, supplier, hashes, relationships. Two dominant formats:
- **SPDX** — ISO standard, license-focused heritage, broad.
- **CycloneDX** — OWASP, security-focused (supports VEX, vulnerabilities, services).

It became a security control (not just compliance paperwork) for concrete reasons:
- **Incident response speed** — "am I affected by CVE-X?" becomes a query against inventory, not a codebase excavation (Q5's Log4Shell story).
- **Supply-chain transparency** — you know what's actually in the artifact you ship, including transitive deps you never chose directly.
- **Continuous vuln matching** — re-scan the SBOM as new CVEs land, without rebuilding.
- **Regulatory/contractual pull** — US EO 14028 and downstream requirements push SBOMs for anything sold to government; enterprise customers increasingly require one in procurement.
- **VEX (Vulnerability Exploitability eXchange)** pairs with it — you assert "CVE-Y is present but *not exploitable* in our usage because the vulnerable function isn't called," cutting noise for you and downstream consumers.

Generate at build time, sign it (attach as a signed attestation with cosign — see `08`), and store it with the artifact:

```bash
syft $IMG -o spdx-json > sbom.spdx.json
cosign attest --predicate sbom.spdx.json --type spdxjson --key env://COSIGN_KEY $IMG
```

**Interview trap:** treating SBOM as a compliance checkbox generated once and filed. Its value is *operational* — it must be current (generated every build, tied to the exact digest) and *queried* during incidents. A stale SBOM for last quarter's build answers the wrong question when the CVE drops.

---

### Q7. Describe the SDLC security gates end to end. Where does each control live?

**Answer:**

Map controls to the pipeline so nothing is "someone should have caught that":

```
 Plan/Design   Code           Build/CI            Test/Stage        Deploy          Runtime
 ──────────    ────           ────────            ──────────        ──────          ───────
 Threat model  Secure defaults  SAST (Semgrep)     DAST (ZAP)        Signed images   Falco/GuardDuty
 Abuse cases   Pre-commit       SCA (npm audit)    IAST              only (cosign)   WAF
 Sec reqs      secret scan      Secret scan (diff)  Fuzzing (nightly) IaC applied via  Audit logging
 (ASVS)        Code review      Container scan      Integration sec   least-priv role  Anomaly alerts
               (gitleaks hook)  IaC scan (checkov)  tests (abuse      Admission        Continuous
                                SBOM + sign         cases as tests)   policy gate      SBOM re-scan
```

The gate discipline:
- **Left of build:** cheap, fast, developer-facing (threat model, secure defaults, pre-commit secret scan, code review).
- **Build/CI:** the automated *blocking* gates — SAST, SCA, secret-diff, container + IaC scan, SBOM + sign. Fast, differential, high-confidence-only (Q2).
- **Test/Stage:** the slower dynamic gates — DAST, IAST, fuzzing, and **abuse-case regression tests** (each security requirement from the threat model is an automated test, see `07`).
- **Deploy:** provenance gates — only signed, scanned, digest-pinned images admitted; IaC applied by a least-privilege role.
- **Runtime:** detection + response (Falco, GuardDuty, WAF, audit logging) and continuous re-scan.

The connective tissue back to `07`: threat-model outputs (security requirements) become the **test cases** that live in the Test gate, so design-time findings are enforced at build-time forever. That closes the shift-left loop.

**Interview trap:** listing tools without stages. The insight is *which control at which stage and why* — you don't run DAST on every commit (too slow) and you don't rely on runtime WAF to catch SQLi you could have killed with a parameterized-query SAST rule at code time. Right control, right stage, defense in depth.

---

### Q8. Walk me through the NIST incident response lifecycle.

**Answer:**

NIST SP 800-61 defines four phases (it's a *loop*, not a line):

```
   ┌─────────────────────────────────────────────────────────────┐
   │                                                             ▼
1. Preparation ──▶ 2. Detection & Analysis ──▶ 3. Containment,   │
   (before)          (is this real? scope?)      Eradication &   │
                                                 Recovery ───────┘
                                                     │
                                                     ▼
                                          4. Post-Incident Activity
                                             (lessons learned)  ──▶ feeds Preparation
```

1. **Preparation** — the work you do *before* anything happens: an IR plan, runbooks, on-call rotation, comms templates, legal/PR contacts, logging/tooling in place, tabletop exercises, defined roles (incident commander, comms lead, scribe). *If you're writing the runbook during the incident, you've already lost.*
2. **Detection & Analysis** — recognize an event is a real incident (from alerts, logs, a report), determine scope and severity, declare it, and start the clock/timeline. Triage: is it real, how bad, what's affected?
3. **Containment, Eradication & Recovery** —
   - *Containment:* stop the bleeding (short-term: isolate the host; long-term: patch, rotate). Balance speed vs. evidence preservation.
   - *Eradication:* remove the root cause (revoke creds, delete backdoors, close the vuln).
   - *Recovery:* restore to known-good, monitor closely for recurrence, confirm clean before declaring over.
4. **Post-Incident Activity** — the **blameless postmortem** (Q11): timeline, root cause, what went well/badly, action items with owners. Feeds back into Preparation so the next incident is handled better (or prevented).

The FDE relevance: you're often the person who *declares* the incident on the customer's deployment and drives phases 2–3, then facilitates the postmortem in phase 4. Knowing the phases keeps a chaotic event structured.

**Interview trap:** jumping straight to "wipe and restore." Containment before eradication (or you tip off/chase the attacker), and **preserve evidence before you destroy the box** — you may need forensics for legal/regulatory notification. Also: recovery isn't "it's back up," it's "it's back up, verified clean, and monitored for recurrence."

---

### Q9. Worked scenario: a customer's LLM app API key is leaked publicly. Walk the hour-by-hour FDE response.

**Answer:**

Scenario: GuardDuty + trufflehog alert — an OpenAI/provider API key **and** an AWS access key for the app role were found in a public GitHub gist committed by a contractor. Assume worst case: both are live and being used.

**T+0:00 — Detect & declare.** Confirm it's real (trufflehog `--only-verified` says the keys authenticate). **Declare an incident**, assign roles: I take Incident Commander, a customer engineer is comms lead, someone scribes a timeline in a dedicated channel. Start a written timeline immediately (every action, timestamped).

**T+0:05 — Contain (stop the bleeding first).** Priority is revocation, in blast-radius order:
- **Revoke the AWS key** (`aws iam delete-access-key` / disable) — highest blast radius (could read S3/secrets).
- **Revoke the provider API key** in the provider dashboard (stops cost/abuse and any data sent to it).
- If the AWS key belongs to a role/user with broad access, also **quarantine**: attach a deny-all policy or detach the role, don't just delete the key, in case there are sessions.

**T+0:20 — Assess exposure (scope).** In parallel with a second responder:
- **CloudTrail**: filter on the leaked access key ID — what API calls, from what IPs, since the commit timestamp? Any `GetObject` on customer docs? Any `AssumeRole`, `CreateUser`, `PutUserPolicy` (persistence/escalation)?
- **Provider usage logs**: was the API key used from unknown IPs? Any spike (crypto-mining LLM abuse) or, worse, was it used to query *customer data* the app had cached?
- **When was the gist created, and was it public the whole time?** That's the exposure window.

**T+0:45 — Eradicate & hunt for persistence.** Revoking the key isn't enough if the attacker used it to create *new* access:
- Audit IAM for keys/users/roles/policies created in the window.
- Check for new EC2 instances, modified security groups, new Lambda, changed S3 policies.
- Rotate *adjacent* secrets that key could have read (Secrets Manager entries the role could `GetSecretValue`).
- Invalidate sessions if user data may have been touched.

**T+1:30 — Recover & verify.** Deploy new keys via the proper secrets path (not a gist!), confirm the app is healthy on new creds, and *keep monitoring* for reuse/anomalies. Only stand down when CloudTrail is clean and no persistence remains.

**T+2:00 onward — Notify & document.** Determine notification obligations: if CloudTrail shows customer *data* was accessed, breach-notification clocks start (GDPR 72h, contractual SLAs, HIPAA if PHI — see `10`). Loop in legal/DPO. Preserve logs as evidence. Then schedule the blameless postmortem.

Throughout, the FDE discipline: **contain before you investigate deeply** (revoke first — every minute the key lives is more damage), **assume the key was used** until logs prove otherwise, **hunt for persistence** (the key is a foothold, not the whole attack), and **preserve evidence** before cleaning up.

**Production war story:** in a real version of this, the leaked AWS key had `secretsmanager:GetSecretValue`, and CloudTrail showed it *had* pulled the DB credentials 40 minutes before we caught it. Revoking the leaked key alone would have left the attacker with the DB password. Because we hunted persistence, we rotated the DB creds too — and found (and killed) an active connection from an unknown IP. The lesson: the leaked credential is rarely the whole blast radius; enumerate what it *could reach* and rotate all of it.

---

### Q10. What is forensic-grade audit logging, and how does it differ from normal app logging?

**Answer:**

Normal app logs are for *debugging*; audit logs are *evidence* — they must answer "who did what, to what, when, from where" in a way that holds up for compliance and (potentially) legal proceedings. Requirements that make logging "forensic-grade":

- **Immutable / tamper-evident** — an attacker (or insider) who gains access must not be able to erase their tracks. Ship logs off-box in near-real-time to a store the app role *can't delete* (append-only S3 with Object Lock, a separate logging account, a SIEM). Hash-chain or sign entries so tampering is detectable.
- **Complete & consistent structure** — every security-relevant event with: `timestamp` (UTC, synced clock), `actor` (user/service identity, not just IP), `action`, `resource` (+ tenant), `source IP / user-agent`, `outcome` (success/deny), and a `request/correlation id` to stitch a session together.
- **Segregation of duties** — the people/roles that can *administer* the system can't *alter* its audit log. Logging pipeline runs under a different identity/account.
- **Retention** aligned to policy/regulation (often 1 year hot, longer cold), with defined deletion.
- **No sensitive data in the log itself** — don't log secrets, full PII, tokens, or document contents; log *references*. (An audit log full of PII is a breach waiting to happen.)
- **Coverage of the right events** — authn (success/failure), authz denials, admin actions, data access to sensitive resources, config/permission changes, and — for AI systems — prompts/tool-calls/retrieval decisions (see `06`).

```typescript
// Structured, tamper-evident-ready audit event (shipped to append-only sink)
interface AuditEvent {
  ts: string;              // ISO-8601 UTC
  correlationId: string;   // ties a request chain together
  actor: { type: 'user' | 'service'; id: string; tenantId: string };
  action: string;          // 'document.read', 'auth.login.fail', 'iam.policy.change'
  resource: { type: string; id: string; tenantId: string };
  sourceIp: string;
  userAgent?: string;
  outcome: 'allow' | 'deny' | 'error';
  // NEVER: secrets, tokens, full PII, document body
}

function audit(e: AuditEvent) {
  // write-once path: separate stream/role; app cannot delete or edit
  auditSink.append(JSON.stringify(e));   // e.g., Kinesis → S3 Object Lock / SIEM
}
```

**Interview trap:** conflating observability logs (mutable, in the app account, for debugging) with audit logs (immutable, segregated, for evidence). During the Q9 incident, if the attacker could delete the app's logs, you'd have no timeline and possibly no way to scope the breach for notification. The immutability and segregation are the whole point.

---

### Q11. Give me a blameless postmortem template and explain why "blameless" matters.

**Answer:**

**Why blameless:** if people fear punishment, they hide information, and you lose the honest timeline that prevents recurrence. Blameless doesn't mean *no accountability* — it means we treat the incident as a **systems failure** (the process/tooling let a human error become an incident) rather than a person to blame. The question is "what about our system made this mistake easy/undetectable?" not "who screwed up?" This is directly the same discipline as the threat-modeling session in `07` — attack the design, not the people.

```markdown
# Postmortem: <Incident Title>
Date of incident: <date>   Authors: <names>   Status: Draft | Final
Severity: SEV1/2/3         Duration: <detection → resolution>

## Summary
2–3 sentences: what happened, impact, resolution. (Exec-readable.)

## Impact
- Users/tenants affected, data affected, downtime, $ / SLA / reputational.
- Was customer data accessed/exfiltrated? Notification obligations triggered? (link to legal)

## Timeline (UTC, from the incident channel)
| Time | Event | Actor |
|------|-------|-------|
| T+0  | GuardDuty alert: leaked key | detection |
| T+5  | AWS key revoked | IC |
| ...  | ... | ... |

## Root Cause Analysis
- What actually caused it (technical + process). Use "5 whys" / contributing factors.
- Trigger vs. root cause: the commit was the trigger; the ROOT cause was
  "no pre-commit secret scanning and a broad app role" — a systems gap.

## What went well
- Fast detection (verified-secret alert fired in 4 min), clean revocation.

## What went poorly / got lucky
- No CloudTrail alerting → we found data access manually.
- On-call didn't have IAM revoke permissions → 10-min delay.

## Action Items (each: owner + due + tracking ticket)
| # | Action | Type (prevent/detect/respond) | Owner | Due | Ticket |
|---|--------|-------------------------------|-------|-----|--------|
| 1 | Add gitleaks pre-commit + CI gate | prevent | @a | date | SEC-101 |
| 2 | Scope app role, remove secretsmanager:* | prevent | @b | date | SEC-102 |
| 3 | CloudTrail alert on leaked-key patterns | detect | @c | date | SEC-103 |
| 4 | On-call IAM break-glass runbook | respond | @d | date | SEC-104 |

## Lessons / systemic themes
- Broader pattern this reveals (e.g., "credentials over-scoped across services").
```

The parts that make it *effective* rather than ritual: a **factual timeline** from the incident channel (not reconstructed from memory), separating **trigger from root cause**, action items typed as prevent/detect/respond with **owners, dates, and tickets** (an action item without an owner is a wish), and honest "what we got lucky on." And critically — **track the action items to done**; a postmortem whose actions never ship is theatre.

**Interview trap:** a postmortem that names a person as the cause ("Bob committed the key"). That's blameful and counterproductive — Bob committing a key is a *symptom*; the root cause is a system with no guardrail against it. Reframe every "person did X" into "the system allowed X to become an incident."

---

### Q12. Give me an on-call security runbook template. What makes a runbook actually usable at 3 a.m.?

**Answer:**

A runbook is a *specific, executable procedure* for a *specific scenario* — not general guidance. At 3 a.m. a stressed responder needs commands to run, not principles to interpret.

```markdown
# Runbook: Leaked Credential Response
Trigger: Alert "verified secret found" (trufflehog/GuardDuty) OR report of exposed key.
Severity: SEV1 if prod/data-access creds; SEV2 otherwise.
Owner team: Platform Security   |   Escalation: #sec-incident, @sec-oncall

## 0. Declare (first 2 min)
- [ ] Post in #sec-incident: "Declaring SEV_ incident: leaked credential"
- [ ] Assign IC / comms / scribe. Start timeline doc: <link>
- [ ] Page secondary if creds have data access.

## 1. Contain — REVOKE FIRST (target < 10 min)
For an AWS key:
```
aws iam list-access-keys --user-name <u>            # confirm the key ID
aws iam update-access-key --user-name <u> \
    --access-key-id <ID> --status Inactive           # disable (reversible) THEN delete
aws iam delete-access-key  --user-name <u> --access-key-id <ID>
```
For a provider API key: revoke in <provider console link>.
- [ ] Confirm revocation (key no longer authenticates).

## 2. Scope (target < 30 min)
- [ ] CloudTrail: `aws cloudtrail lookup-events --lookup-attributes \
      AttributeKey=AccessKeyId,AttributeValue=<ID>` since <commit time>.
- [ ] Flag any: GetObject on customer data, AssumeRole, IAM writes, new resources.
- [ ] Provider usage logs for anomalous use.

## 3. Eradicate / hunt persistence
- [ ] Audit IAM changes in window (new users/keys/policies).
- [ ] Rotate secrets the credential could read (Secrets Manager entries).
- [ ] Kill unknown active sessions/connections.

## 4. Recover
- [ ] Issue new creds via secrets manager (NOT inline). Redeploy.
- [ ] Verify healthy + monitor 24h for reuse.

## 5. Notify & close
- [ ] If data accessed → page legal/DPO; start notification clock (GDPR 72h etc.).
- [ ] Preserve logs as evidence (copy to case bucket).
- [ ] Schedule blameless postmortem within 3 business days.

## Break-glass
- On-call role has IAM revoke via: <role/policy link>. If lacking: <escalation>.
```

What makes it usable at 3 a.m.:
- **Copy-pasteable exact commands**, not "revoke the key."
- **Ordered, with time targets** — the responder knows what to do *first* (revoke) and by when.
- **Checkboxes** so nothing is skipped under stress and handoff is clean.
- **Decision points explicit** (SEV1 vs 2, notify-if-data-accessed).
- **Break-glass access pre-solved** — the runbook fails if the on-call lacks the permission to run step 1 (a real Q9 lesson).
- **Tested** — dry-run it in a tabletop; a runbook nobody's executed has bugs exactly when you can't afford them.
- **Discoverable** — linked from the alert itself, not buried in a wiki.

**Interview trap:** a "runbook" that's actually prose ("assess the situation and take appropriate action"). That's useless at 3 a.m. A runbook is a checklist of concrete steps and commands for a *named* scenario, pre-tested, with break-glass access solved ahead of time.

---

### Q13. How do SAST false positives and negatives actually behave, and how do you reason about tuning?

**Answer:**

SAST works by building a model of the code (AST, call graph, data-flow/taint) and matching sink patterns with source→sink taint tracking. Its errors:

- **False positives** (flags safe code) — dominant problem. Causes: it can't prove a sanitizer neutralizes the taint, can't follow flow through frameworks/reflection/dynamic dispatch, over-broad rules. Cost: developer trust erodes, gate gets bypassed (Q2).
- **False negatives** (misses real bugs) — it can't see runtime/config, business logic, or flows it can't model (across services, through a queue, via a DB round-trip). Cost: false confidence.

Tuning strategy:
- **Precision over recall for *blocking* gates.** Only fail the build on rules with low false-positive rates and high severity; run the noisy rules in report-only mode.
- **Per-repo rule tuning** — disable rules that don't apply to your stack; add custom rules for *your* patterns (Semgrep makes writing a rule for "our internal `query()` helper is a SQL sink unless the arg is a template literal" trivial).
- **Suppress with justification + expiry**, tracked in code review, never a blanket disable.
- **Measure** — track false-positive rate per rule; a rule over some threshold gets tuned or dropped. Trust is a metric.

```yaml
# Custom Semgrep rule: flag our internal db helper called with string concatenation
rules:
  - id: internal-sql-concat
    languages: [typescript]
    severity: ERROR
    message: "db.raw() called with concatenated string — use parameterized query"
    patterns:
      - pattern: db.raw("..." + $X)
      - pattern-not: db.raw("...", ...)        # parameterized form is fine
```

**Interview trap:** believing SAST is a completeness guarantee ("it passed SAST, so it's secure"). It has systematic blind spots (logic flaws, runtime, cross-service flows) and systematic noise. It's one layer; DAST/IAST/pentest/threat-modeling cover its gaps. A clean SAST run means "no *known static patterns* fired," nothing more.

---

### Q14. What's the difference between detection, alerting, and triage — and how do you avoid alert fatigue?

**Answer:**

- **Detection** — a system *notices* a potentially-bad event (Falco rule fires, GuardDuty finding, failed-login spike, WAF block).
- **Alerting** — a detection is *routed to a human/pipeline* with enough context to act.
- **Triage** — a human/automation decides: real or noise? severity? escalate or close?

**Alert fatigue** is the failure where volume/noise desensitizes responders so real alerts get missed — the security equivalent of "the pager cried wolf." Mitigations:

- **Tier by severity and route accordingly** — only true SEV1/2 pages a human at night; everything else goes to a queue reviewed in business hours. Don't page on informational findings.
- **Tune out noise ruthlessly** — every false-positive alert type either gets tuned, suppressed with justification, or auto-closed. Measure alert precision.
- **Enrich, don't just fire** — an alert should carry context (which resource, tenant, recent related events, a link to the runbook) so triage is seconds not minutes. Correlate related detections into one incident.
- **Automate the obvious** — auto-remediate/auto-close known-benign patterns; reserve humans for judgment.
- **Track MTTA/MTTR and false-positive rate** as health metrics; rising FP rate predicts fatigue.

The connection to Q10/Q12: detection is only valuable if it reaches a human who trusts it and has a runbook to act. A dashboard of 500 daily "alerts" nobody reads is *worse* than fewer, higher-fidelity ones — it's false assurance and it buries the one that matters.

**Interview trap:** "we have detection" = "we're covered." Detection with no tuning becomes noise, noise becomes ignored, ignored detection is equivalent to no detection — but with a false sense of security. The metric is *fidelity and response*, not alert count.

---

### Q15. How do you preserve evidence during an incident without breaking recovery?

**Answer:**

There's a real tension: **containment/recovery wants to wipe and restore fast; forensics wants the box frozen.** You resolve it by *capturing before you clean*, in a defined order (order of volatility — most-ephemeral first):

1. **Snapshot volatile state first** — before you kill or reboot anything: memory (if feasible), running processes, network connections, open files, current environment. A reboot destroys memory-resident malware evidence.
2. **Snapshot disk / take an EBS snapshot** of the compromised instance *before* terminating it — cloud makes this cheap and it's your forensic image.
3. **Copy relevant logs to an evidence store** (CloudTrail export, app audit logs, VPC flow logs) — into a separate, write-protected case bucket with restricted access and Object Lock, so nobody (including responders) alters them.
4. **Preserve the timeline** — the incident channel and your written log *are* evidence; keep them.
5. **Record chain of custody** — who collected what, when, hashes of the artifacts — if there's any chance of legal/regulatory use.

*Then* you can eradicate and recover on *new* infrastructure (rebuild from known-good images rather than cleaning the compromised host in place — you can rarely be sure a host is fully clean). The compromised instance is **isolated** (quarantine security group that denies all, but keep it *running* if you need live forensics) rather than immediately terminated.

The cloud advantage: you can isolate + snapshot + rebuild in parallel — quarantine the instance (SG deny-all), snapshot it for forensics, and spin up a clean replacement from a golden image, all at once. You get evidence *and* fast recovery.

**Interview trap:** "we restored from backup, so we're done." If you wiped the box without snapshotting, you may have destroyed the evidence needed to (a) determine the breach scope for legally-required notification and (b) find how they got in — so they walk right back in. Also: restoring the *same* vulnerable image just re-opens the door; eradicate the root cause first.

---

### Q16. What is a tabletop exercise and why does an FDE run them with customers?

**Answer:**

A **tabletop** is a discussion-based simulation: gather the responders, present a scenario ("trufflehog just alerted on a leaked prod AWS key committed 40 minutes ago"), and walk through the response *verbally* — who does what, what do they run, who do they call — without touching production. It's a rehearsal for the IR plan.

Why it's high-value (and why an FDE runs one early in a deployment):
- **It finds the gaps in the plan cheaply** — "who has permission to revoke IAM keys at 3 a.m.?", "do we actually have CloudTrail alerting?", "who calls legal?" — the answers are usually "we don't know," and that's the point. Better to learn it in a conference room than during a real breach.
- **It builds the muscle memory and relationships** — the customer's team practices the roles (IC/comms/scribe) and knows each other before the pressure's on.
- **It validates runbooks** — a runbook that's never been executed has bugs; a tabletop surfaces them.
- **It's a trust-builder** — running a professional tabletop with the customer's security team, and producing a gap list with owners, is a concrete demonstration that you take *their* operational risk seriously.

Structure: pick a realistic scenario tied to *their* threat model (see `07`), inject complications midway ("now you discover the key was used to read an S3 bucket"), timebox to ~90 min, and produce a **findings list** (gaps → action items with owners) exactly like a postmortem. Run them periodically, escalating realism (tabletop → functional drill → full red-team).

**Production war story:** a tabletop on the exact Q9 scenario surfaced that the on-call engineer *couldn't revoke IAM keys* — the break-glass role existed on paper but the on-call rotation wasn't in it. We'd have discovered that during a real incident, 10 minutes into the clock, with an attacker actively using the key. We fixed it that afternoon. The whole ROI of tabletops is finding those gaps when it's free.

---

### Q17. How do you decide incident severity, and why does it matter?

**Answer:**

Severity drives *everyone's* behavior — who's paged, how fast, who's notified, whether execs/legal engage. You need a **pre-agreed severity matrix** so nobody's negotiating definitions mid-incident:

| SEV | Definition | Examples | Response |
|-----|-----------|----------|----------|
| **SEV1** | Confirmed breach of sensitive data, or full outage, or active attacker with data access | Customer data exfiltrated; ransomware; prod-data credential live in public | Page immediately 24/7, IC assigned, exec+legal engaged, notification clock considered |
| **SEV2** | Serious security issue, contained or no confirmed data loss yet | Leaked non-prod cred; exploitable vuln found in prod; partial outage | Page during extended hours, IC assigned, fix expedited |
| **SEV3** | Security issue, low/no immediate impact | Vuln in a non-exposed component; policy violation; noisy detection needing investigation | Business-hours triage, ticket |

Why it matters:
- **It sets the response tempo without debate** — "this is a SEV1" instantly means the right people are on and the right clocks (GDPR 72h, contractual SLAs) are considered.
- **It prevents both over- and under-reaction** — not everything is a fire drill (fatigue), and a real breach doesn't get triaged as a ticket.
- **It aligns with obligations** — severity often maps to notification thresholds; classifying correctly is part of legal/regulatory compliance.
- **You can escalate/de-escalate** as facts change ("we thought SEV2, but CloudTrail shows data access — escalate to SEV1").

The key is to **classify by impact and confirmed scope, not by how scary it feels**, and to reassess as you learn more. Assign an initial severity fast (so response starts), then refine.

**Interview trap:** treating severity as a gut call made fresh each time. Without a pre-agreed matrix, you get inconsistent response, arguments during the incident, and missed notification deadlines. The matrix is part of *Preparation* (Q8) — decided when calm, applied when not.

---

### Q18. What security signals should an FDE monitor in production for an AI/multi-tenant app specifically?

**Answer:**

Beyond generic infra monitoring, the AI + multi-tenant nature adds specific signals (this bridges to `06` and `03`):

**Multi-tenant isolation signals:**
- Any request where the *derived* tenant context doesn't match the *requested* resource's tenant — a direct BOLA/cross-tenant attempt. Alert, don't just log.
- Authz denials spiking for one user/tenant (probing for IDOR).
- A service account or role accessing data across tenant boundaries.

**AI-specific signals:**
- **Prompt-injection indicators** — retrieved/ingested content containing instruction-like patterns; outputs that echo system-prompt content or attempt tool calls not warranted by the user request.
- **Data-egress anomalies** — volume of tokens/documents sent to the external LLM spiking (possible exfiltration via the model, or a runaway agent).
- **Tool-use anomalies** — an agent invoking tools outside the caller's tenant scope, or a burst of destructive tool calls (excessive agency).
- **Cost/rate anomalies** — token usage spike (model-DoS / abuse / crypto-mining-via-LLM).
- **PII in places it shouldn't be** — DLP on outputs and on embeddings pipelines.

**Cloud/infra signals (from `08`):**
- IMDS access from pods, unexpected `AssumeRole`, IAM policy changes, new access keys.
- Falco: shells in containers, IMDS reach attempts, unexpected egress.
- CloudTrail: leaked-key patterns, disabling of logging/GuardDuty.

The design principle: **the audit log (Q10) must capture the security-relevant AI events** — the prompt (or a reference), the retrieval decision (which tenant's docs, filtered how), the tool calls, and the output-filter verdicts — so that when something goes wrong you can reconstruct *what the model saw and did on whose behalf*. Without that, an AI incident is unauditable.

**Interview trap:** monitoring only infra (CPU, 5xx) and generic security (failed logins) for an AI app. The novel risks — cross-tenant retrieval, prompt-injection-driven exfiltration, excessive agency — are invisible to standard monitoring and need purpose-built signals and AI-aware audit logging.

---

### Q19. Vulnerable→fixed: an insecure logging setup that leaks secrets and can be tampered with.

**Answer:**

**Vulnerable:**

```typescript
// Logs to local disk, includes the full request, mutable, in the app's own account.
app.use((req, res, next) => {
  logger.info(`Request: ${JSON.stringify(req.body)} headers: ${JSON.stringify(req.headers)}`);
  next();                                   // logs Authorization header, passwords, PII, tokens
});
// winston to a local file the app can also delete/edit
const logger = winston.createLogger({ transports: [new winston.transports.File({ filename: 'app.log' })] });
```

Problems: (1) logs **secrets** — `Authorization` header, request bodies with passwords/tokens/PII/document content; (2) **local file** the app (and any attacker with app access) can read *and delete* — no tamper-evidence, attacker erases their tracks; (3) **no structure** — can't query "who accessed tenant X's docs"; (4) same account/identity as the app — no segregation of duties.

**Fixed:**

```typescript
const REDACT = ['authorization', 'cookie', 'x-api-key', 'password', 'token', 'secret'];

function redact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = REDACT.includes(k.toLowerCase()) ? '[REDACTED]' : v;
  }
  return out;
}

app.use((req, res, next) => {
  const correlationId = req.header('x-correlation-id') ?? crypto.randomUUID();
  // Audit event: structured, no secrets/bodies, shipped to an append-only external sink.
  audit({
    ts: new Date().toISOString(),
    correlationId,
    actor: { type: 'user', id: req.ctx?.userId ?? 'anonymous', tenantId: req.ctx?.tenantId ?? '-' },
    action: `${req.method} ${req.route?.path ?? req.path}`,
    resource: { type: 'http', id: req.path, tenantId: req.ctx?.tenantId ?? '-' },
    sourceIp: req.ip,
    userAgent: req.header('user-agent'),
    outcome: 'allow',
    // headers/body intentionally NOT logged; redact() used only for debug logs below
  });
  next();
});

// Debug logs (separate stream) are redacted and NEVER contain the audit trail.
function debugLog(req: Request) {
  logger.debug('req', { headers: redact(req.headers as any), body: redact(req.body) });
}
```

Plus the infrastructure (from Q10): `audit()` ships to **Kinesis/CloudWatch → append-only S3 with Object Lock** in a **separate logging account** the app role can only write to, never read/delete. Retention and access are policy-controlled.

The fixes map to Q10's requirements: **redact secrets/PII**, **structure for query**, **immutable + off-box + segregated** so an attacker with app access can't rewrite history, and **correlation IDs** to reconstruct sessions during an incident.

**Interview trap:** logging the full request "for debugging" — that's how tokens and PII end up in logs (and your logs become a breach target and a compliance liability). And local mutable logs mean an attacker's first move (delete the logs) leaves you blind. Redact, structure, segregate, make immutable.

---

### Q20. Tie it together: how does the AppSec + IR program connect back to threat modeling and compliance?

**Answer:**

These aren't separate programs — they're one loop, and an FDE's job is to make the seams invisible to the customer:

```
  THREAT MODEL (07)  ──── security requirements ────▶  TESTS in CI (09)
        │                                                    │
        │ ranked threats                          find bugs pre-prod
        ▼                                                    ▼
  what to detect/monitor ◀──── the threats you can't ────  SDLC gates
        │                       prevent, you detect          (SAST/DAST/SCA/
        ▼                                                     container/SBOM)
  RUNTIME DETECTION (Falco/GuardDuty/audit logs, 08/09)
        │
        │ an alert fires
        ▼
  INCIDENT RESPONSE (NIST lifecycle, 09) ──── postmortem ────▶ new threats,
        │                                                       new tests,
        └──── evidence + scope ────▶ COMPLIANCE (10):           new detections
                notification obligations (GDPR 72h, contracts),   (feeds 07)
                audit evidence for SOC 2, retention/deletion
```

The connective logic:
- **Threat modeling (`07`)** decides *what could go wrong* → yields security requirements → those become **CI tests and SDLC gates (this file)** so design-time findings are enforced forever, and decides **what to detect** at runtime for the threats you can't fully prevent (prompt injection, insider, zero-day).
- **AppSec testing** shifts left to kill bugs pre-prod; **runtime detection** (`08`/`09`) catches what slips; **IR** handles the ones that become incidents.
- **Every incident** feeds a postmortem whose action items become *new* threats to model, *new* tests, and *new* detections — the loop closes.
- **Compliance (`10`)** consumes the outputs: audit logs are SOC 2 evidence, the IR plan/postmortems are required controls, and an incident's scope determines *legal notification obligations* (GDPR/HIPAA/contract) — which is why forensic-grade logging (Q10) and accurate severity (Q17) aren't optional niceties, they're what makes lawful notification possible.

The FDE framing: you're the person who stitches these into the customer's existing SDLC and IR process rather than bolting on a parallel one. The deliverable isn't "we ran some scanners" — it's a *closed loop* from design → build gates → runtime detection → incident response → back to design, with the compliance evidence falling out as a byproduct.

**Interview trap:** treating AppSec testing, IR, threat modeling, and compliance as four separate checklists owned by four teams. Seniority is seeing them as one feedback loop where each stage feeds the next — and being able to point at any control and say which threat it addresses and what compliance obligation it satisfies.
