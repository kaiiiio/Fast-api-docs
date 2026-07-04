# Customer Discovery & Requirements — Turning "We Want AI" Into a Scoped Workload

The single highest-leverage FDE skill. Bad discovery = doomed PoC, no matter how good your engineering is. This file is both interview prep (customer-scenario rounds test exactly this) and a field manual.

---

## Part 1: Elicitation Frameworks

### Q1. What is the open→closed questioning funnel, and why does it work?

**Answer:**

You interview a customer the way a good doctor takes a history: **broad and open first, then progressively narrower, ending in confirmable specifics.**

```
OPEN      "Walk me through how a claim gets processed today, end to end."
   ↓      (Let them talk. You learn the landscape and their vocabulary.)
PROBING   "You mentioned the review team 'triages' documents — what does
   ↓       triage actually involve? Who does it? How long per document?"
CLOSED    "So a senior adjuster spends ~20 minutes per claim just locating
   ↓       the relevant policy clauses. Is that right?"
CONFIRM   "Then if we cut clause-lookup to under 2 minutes with cited
           sources, that's worth roughly 3 FTE-hours per adjuster per day.
           Would your VP agree that's the number that matters?"
```

Why the order matters:

* **Open questions first** prevent you from anchoring the customer on YOUR solution shape. If you open with "do you want RAG or fine-tuning?", you've let a customer who read one blog post design your architecture.
* **Closed questions too early** feel like an interrogation and get you confident-sounding wrong answers.
* **The confirm step converts a conversation into a requirement.** Requirements are statements the customer has *agreed to in numbers*, not things you inferred.

**Interview trap:** In a scenario round, when the interviewer (playing customer) says "we want a chatbot for our support team," candidates who immediately start designing the chatbot fail. Candidates who say "before I design anything — can you walk me through what a support ticket's life looks like today?" pass. The round is testing whether you *discover* before you *solve*.

---

### Q2. How do the "5 Whys" apply to a GenAI ask?

**Answer:**

The stated ask is almost never the business problem. Chain "why" until you hit money, risk, or time — then design against THAT.

Worked example:

```
Ask:    "We want an internal ChatGPT."
Why?    "Our engineers keep asking the same questions on Slack."
Why is that a problem?
        "Senior engineers spend hours a week answering them."
Why does that matter?
        "Our two staff engineers are the bottleneck for every release."
Why are they the bottleneck?
        "Only they know the legacy payment system; docs are outdated."
Why are the docs outdated?
        "No one is incentivized to update them after incidents."

Real problem: tribal knowledge about ONE legacy system concentrated
in TWO people, docs decay after incidents.

Scoped workload: RAG assistant over the payment system's code, runbooks,
and incident post-mortems, with a feedback loop that flags stale answers
→ doc update tickets. NOT a general "internal ChatGPT."

Success metric: % of payment-system questions resolved without
staff-engineer involvement (baseline it from Slack history first).
```

Notice what happened: the general ask ("internal ChatGPT" — huge, unscopable, success undefinable) became a narrow workload with a measurable metric and a 4-week-buildable shape. **That transformation is the FDE's core trick.**

---

### Q3. How do you turn vague asks into scoped workloads? (The general recipe)

**Answer:**

The **Workload Extraction recipe** — run this on any "we want AI":

1. **Find the workflow.** AI value lives in workflows, not in "AI." Ask: "Show me a task someone did yesterday that you wish took 10x less time."
2. **Find the artifact.** What document/data does that workflow consume and produce? (Claims → policies + decision memo. Support → tickets + KB articles.) No artifact = no workload.
3. **Find the human baseline.** How long does it take today? What's the error rate? Who checks the output? *If they can't tell you, measuring it becomes PoC week 1.*
4. **Find the tolerance.** What happens when the AI is wrong? (Annoyance → good PoC candidate. Lawsuit → needs human-in-the-loop design from day 1.)
5. **Find the boundary.** What is explicitly OUT? Write it down. Unscoped PoCs die of scope creep (see `04_communication_and_whiteboarding.md`).

Vague-to-scoped examples:

| Vague ask | Scoped workload |
| --- | --- |
| "We want AI" | "Draft first-response emails for tier-1 support tickets in category X, agent approves before send, measured on approval-without-edit rate" |
| "Automate our documents" | "Extract 12 named fields from vendor invoices (PDF, 3 known layouts + long tail), human review queue for confidence < 0.9" |
| "AI copilot for our analysts" | "Natural-language → SQL over the 5 revenue tables, read-only, with query preview before execution" |
| "Chatbot on our website" | "Deflect the top 20 FAQ intents with grounded answers from the public help center; escalate everything else; measure deflection rate" |

---

## Part 2: Stakeholder Mapping

### Q4. Who are the stakeholders in an enterprise deal, and how do you handle each?

**Answer:**

| Role | Who they are | What they care about | Your move |
| --- | --- | --- | --- |
| **Economic buyer** | Owns the budget (VP/C-level). Often absent from technical calls. | ROI, risk, "will I look good or get burned" | Get 15 minutes early. Speak in outcomes and money. Success criteria must be legible to THEM. |
| **Champion** | The person who brought you in. Career-invested in your success. | Making the project succeed, internal credibility | Arm them: give them slides, numbers, and answers to attacks they'll face in meetings you're not in. Your champion sells for you when you're absent. |
| **End users** | The people whose workflow you're changing. | "Will this make my day better or threaten my job?" | Involve early (they're your eval labelers and demo audience). Never let the first time they see the tool be the rollout. |
| **Security / compliance team** | Gatekeepers of data access and deployment approval. | Data leaving the perimeter, audit trails, vendor risk | Engage in WEEK 0, not week 3. Bring your security one-pager before they ask. They can kill the project unilaterally and slowly. |
| **IT / platform team** | Own the infra you'll deploy on. | Operational burden, "who maintains this after you leave" | Respect their standards (their VPC patterns, their CI). Make them co-owners, not bystanders. |
| **The skeptic** | Often a senior internal engineer who thinks they could build this themselves. | Not being replaced/embarrassed | Do NOT out-demo them into a corner. Recruit them: ask their advice, credit them publicly. (Full playbook: `04_communication_and_whiteboarding.md`, hostile-team scenario.) |

**Red-flag configuration:** champion exists but has no line to the economic buyer, and security hasn't been told the project exists. That PoC will succeed technically and die politically.

**Interview trap:** "Your PoC demo went great, but the deal stalled. What do you do?" — the expected answer is stakeholder analysis: great demos convince champions, but deals stall when the economic buyer never saw value in their terms, or security/procurement was engaged too late. Enumerate the map, find who's missing, fix that.

---

## Part 3: The Discovery Call

### Q5. How do you structure a discovery call for a GenAI PoC?

**Answer:**

60-minute structure:

```
DISCOVERY CALL AGENDA (send 24h ahead)

 0–5    Intros + agenda confirm. "By the end I want us to agree on
        whether there's a PoC worth doing, and if so, on what."
 5–20   Their world (OPEN questions): current workflow, volumes,
        pain, prior attempts. You talk <20%.
20–35   Deep-dive the ONE most promising workload (probing → closed).
        Get numbers: volume/day, minutes/task, error cost, who checks.
35–45   Data & environment reality check: where does the data live,
        who grants access, what's the security review process,
        cloud/on-prem, SSO?
45–55   Shape of a PoC (you talk): candidate scope, 4–6 week arc,
        what you need from them (data access, SME hours, sponsor).
55–60   Next steps with names and dates. Always leave with a
        scheduled next meeting.
```

Non-negotiables:

* **Never demo in the first discovery call** unless asked twice. Demoing before discovery anchors them on features instead of their problem.
* **Get numbers or get homework.** Every "we do a lot of those" becomes "can you pull last month's count before Thursday?"
* **The meeting after the meeting:** send notes within 24h — decisions, numbers, owners, open questions. This document becomes the seed of the SOW and your protection when memories drift.

---

### Q6. Show me an example discovery dialogue for a GenAI PoC scoping call.

**Answer:**

Context: mid-size insurance company; VP of Claims (economic buyer-ish), Claims Ops Manager (future champion), one IT rep.

```
FDE:  Thanks for the time. My goal today isn't to pitch — it's to
      understand how claims flow through your team, and by the end,
      to know if there's a 4-6 week pilot that's actually worth your
      money. Sound fair?

VP:   Sure. Bottom line, we saw a competitor announce an AI claims
      thing and we can't be behind. We want AI in claims processing.

FDE:  Understood — let's find where it pays. Could you walk me
      through the life of one claim, from arrival to decision?
                                                    [OPEN — let them map the territory]
OPS:  Claim comes in via portal or email. Intake team categorizes it,
      pulls the policy, checks coverage, then an adjuster reviews
      documents — medical reports, photos, invoices — and drafts a
      decision memo. Complex ones go to a senior adjuster.

FDE:  Where in that chain do things pile up?
                                                    [PROBING — find the bottleneck]
OPS:  Document review, easily. An adjuster gets a 60-page medical
      file and has to find the three paragraphs that matter.

FDE:  How long does that take, and how many claims a day?
                                                    [CLOSED — numbers]
OPS:  Maybe 45 minutes per complex claim. We do about 120 complex
      claims a day across 30 adjusters.

FDE:  So roughly 90 adjuster-hours a day on document review alone.
      If a claim is decided wrongly because something was missed in
      review — what does that cost?
                                                    [tolerance probe]
VP:   Wrong denials are the nightmare — regulatory complaints,
      sometimes lawsuits. Wrong approvals just cost the payout.

FDE:  That asymmetry matters a lot for how we design this. It means
      whatever we build should ACCELERATE the adjuster, not replace
      their judgment — surface the relevant passages with citations,
      never auto-decide. Does that match your risk appetite?
                                                    [CONFIRM + design boundary in their language]
VP:   Yes. Legal would never allow auto-decisions anyway.

FDE:  Good — then let me test feasibility. Where do the claim
      documents live, and what format?

IT:   Document store on-prem, moving to Azure. PDFs, mostly scanned.

FDE:  Scanned meaning image-only PDFs? What share, roughly?
                                                    [the question that saves the PoC —
                                                     OCR need changes everything]
IT:   Honestly? Maybe 60% scanned.

FDE:  Really glad I asked — that shapes week one. Last area:
      if we run a pilot, it needs to touch real claim documents.
      What's your process for granting a vendor access to a
      non-production copy?

IT:   Security review. Takes... four to six weeks usually.

FDE:  Then we should start that paperwork THIS week, in parallel
      with contracting, or the pilot stalls before it starts.
      Here's the pilot shape I'd propose: 4 weeks, one claim type —
      you pick the highest-volume one — an assistant that takes a
      claim file and produces a cited summary of coverage-relevant
      passages. Success metric: adjuster review time on that claim
      type, measured before and after, target 40% reduction, with
      zero uncited assertions in outputs. You'd need to give us:
      500 historical claims with outcomes, 3 hours a week of a
      senior adjuster's time, and a named sponsor. Fair deal?

VP:   What does the 4 weeks cost us?

FDE:  I'll send a one-page SOW tomorrow with cost and the success
      criteria we just discussed, so you can react to something
      concrete. Can we book 30 minutes Thursday to review it —
      and can that senior adjuster join?
```

What to notice (this is what interviewers score):

* FDE never said "RAG," "LLM," or "embeddings" once. Architecture vocabulary is for the AI round; discovery is in THEIR vocabulary.
* Numbers extracted: 120/day, 45 min, 30 adjusters, 60% scanned, 4–6 week security review.
* The scanned-PDF question and the security-review question are the two most valuable moments — each one de-risks a week-2 disaster.
* Ends with a concrete artifact (SOW), a date, and asks (data, SME time, sponsor).

---

## Part 4: SOW & Success Criteria

### Q7. What goes in a PoC statement of work?

**Answer:**

Keep it to 2–3 pages. The SOW's job is to make success **binary and demo-able** and to make the customer's obligations explicit.

```markdown
# Statement of Work — [Customer] Claims Review Assistant PoC

## 1. Objective (one sentence, business language)
Reduce adjuster document-review time on auto-injury claims by 40%
via an AI assistant that surfaces cited, coverage-relevant passages.

## 2. Scope
IN:  - Claim type: auto-injury (highest volume)
     - Inputs: claim PDFs (incl. scanned/OCR), policy documents
     - Output: cited summary + passage locator UI
     - Deployment: customer Azure non-prod subscription
OUT: - Any auto-decisioning
     - Other claim types
     - Production hardening (HA, DR) — see conversion plan
     - Integrations beyond read-only document store access

## 3. Success Criteria (measurable, demo-able, agreed)
| # | Criterion | Target | How measured |
|---|-----------|--------|--------------|
| 1 | Review-time reduction | ≥40% | Timed study: 20 claims, 5 adjusters, before/after |
| 2 | Citation grounding | 100% of assertions cite a source passage | Eval set of 100 claims, SME-graded |
| 3 | Retrieval quality | ≥85% of SME-marked key passages surfaced | Same eval set |
| 4 | Adjuster preference | ≥4/5 would keep using it | Exit survey |

## 4. Timeline (4 weeks + 1 buffer)
Week 0: access, environment, security paperwork (STARTS NOW)
Week 1: data pipeline + OCR baseline; eval set construction with SME
Week 2: end-to-end thin slice demo (internal)
Week 3: iterate on eval results; adjuster pilot group starts
Week 4: measured study + final demo to sponsor
[Full arc: 03_poc_delivery_playbook.md]

## 5. Customer Obligations (the PoC fails without these)
- Named executive sponsor: __________ (attends kickoff + final demo)
- Data: 500 historical claims w/ outcomes, delivered by day 3
- SME: senior adjuster, 3 hrs/week, named: __________
- Environment: non-prod Azure access provisioned by day 5
- Security review initiated by: [date]

## 6. Our Obligations
- Weekly written status update (Fridays)
- All work in customer environment; no data egress
- Final demo + handoff doc + eval harness left behind

## 7. Cost & Commercial
- PoC fee: $____ (credited against production contract if converted
  within 90 days)

## 8. Assumptions & Risks
- OCR quality on scanned docs unknown until week 1 — if character
  accuracy <90%, timeline extends 1 week (flagged by day 5).
- Success criterion #1 requires adjusters made available for the
  timed study in week 4.

Signatures: ____________  ____________
```

Rules for success criteria:

* **Measurable** — a number, a method, a dataset. "Improves productivity" is not a criterion; "40% reduction measured on a 20-claim timed study" is.
* **Demo-able** — the final meeting should be: run the demo, show the numbers, read the criteria table, check the boxes. No interpretation debate.
* **Agreed BEFORE building** — criteria invented in week 4 will be criteria you happen to have met, and the customer knows it.
* **Few** — 3–5. Ten criteria means none of them matter.

---

## Part 5: Red Flags & NFR Checklist

### Q8. What are the deal red flags that predict a doomed PoC?

**Answer:**

| Red flag | Why it kills | Your counter |
| --- | --- | --- |
| **No data access path** ("we'll get you data soon") | You'll build on synthetic data and demo a lie; real data breaks it in front of the exec | Make data delivery a day-3 SOW obligation. No data by day 5 → clock pauses, in writing. |
| **No executive sponsor** | Technical success, political death. Nobody funds the conversion. | Refuse to start without a named sponsor who commits to kickoff + final demo. |
| **Undefined success** ("we'll know it when we see it") | Moving goalposts; the demo can always be "not quite it" | Don't sign until the criteria table has numbers. Walking away here is cheaper than 6 wasted weeks. |
| **"Evaluation" with no budget** | You're free consulting / leverage against their preferred vendor | Ask the buyer: "if this hits the criteria, what happens next, and is that budgeted?" |
| **Champion is leaving / reorg rumored** | Your sponsor structure evaporates mid-PoC | Multi-thread: minimum two engaged stakeholders above the champion. |
| **They want your IP in a bake-off** ("just leave the code") | — | Clarify IP terms in the SOW before writing a line. |
| **Security review not started at kickoff** | 4–6 week review inside a 4-week PoC = math doesn't work | Week-0 rule: paperwork starts before or with the contract. |
| **"Can it also do X, Y, Z?" in the scoping call** | Scope creep before day 1 | "Yes, likely — in production. The PoC proves ONE workload. Which one is worth the most?" |

**War story:** A PoC hit every technical target — retrieval accuracy, latency, glowing end-user feedback. It converted to nothing, because the "sponsor" was a director whose VP had never heard of the project, and that VP's budget was already committed to a data-warehouse migration. The lesson institutionalized afterward: *no named economic buyer at kickoff, no PoC.* Discovery isn't just technical requirements — it's confirming the money and the power exist.

---

### Q9. What's the non-functional requirements checklist to run on every engagement?

**Answer:**

Run this in discovery, every time, even when the customer doesn't bring it up — ESPECIALLY when they don't bring it up:

```
NFR CHECKLIST — GenAI engagement discovery

SECURITY
- [ ] Where can data live? (their VPC only / our cloud / SaaS OK?)
- [ ] Can prompts/completions leave their perimeter? (model API egress!)
- [ ] SSO/IdP requirements (Okta, Entra)? Role model for the app?
- [ ] Secrets management standard? (their Vault/KMS, never .env)
- [ ] Pen test / vendor security review required before ANY access?

COMPLIANCE & DATA GOVERNANCE
- [ ] Regulated data classes involved? (PII, PHI/HIPAA, PCI, ITAR)
- [ ] Data residency constraints? (EU-only, in-country processing)
- [ ] Model-provider terms acceptable to their legal? (training-on-data
      clauses, retention windows — know your provider's answers cold)
- [ ] Audit trail requirements? (who asked what, what was retrieved,
      what was answered — often mandatory in finance/health)
- [ ] Retention/deletion obligations for logs containing user data?

RELIABILITY & SLA
- [ ] Availability expectation for the PoC vs production? (say the
      PoC number out loud: "best effort, business hours")
- [ ] Latency budget per interaction? (chat: <5s perceived; batch: N/A)
- [ ] Rate limits / quota from the model provider vs their peak volume?
- [ ] Fallback behavior when the model API is down?

COST
- [ ] Cost ceiling for the PoC's model spend? (set a hard budget alert)
- [ ] Cost-per-task target for production viability? (do the math
      early: tokens/task × price × volume/day — see 03_poc_delivery)
- [ ] Whose cloud bill does inference land on?

OPERATIONAL
- [ ] Who operates it after handoff? Their skills honest assessment.
- [ ] Observability standard? (their Datadog/Grafana — integrate,
      don't bring your own)
- [ ] Change management: how do prompt/model updates get approved?
```

**Interview trap:** In the AI/architecture round, after you design a beautiful RAG system, the interviewer asks "anything else you'd want to know?" — this is the NFR invitation. Candidates who run through security, residency, SLA, audit, and cost ceiling get senior marks. Candidates who say "nope, that covers it" cap out at mid-level. Memorize the six headers: **Security, Compliance, Residency, SLA, Cost, Operations.**

---

*Next: `03_poc_delivery_playbook.md` — you scoped it, now ship it.*
