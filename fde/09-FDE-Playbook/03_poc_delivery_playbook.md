# The PoC Delivery Playbook — 4–6 Weeks From Kickoff to Conversion

The PoC is the FDE's core deliverable. This is the week-by-week operating manual: what to build when, what breaks, how to demo, how to prove value, and how to convert. Interviewers probe this with "walk me through how you'd run a 4-week PoC" — this file is that answer.

---

## Part 1: The Arc

### Q1. What does a 4–6 week PoC look like week by week?

**Answer:**

```
Week 0 (pre-kickoff)   Paperwork, access requests, security review STARTED
Week 1                 Environment + data reality check + eval set seed
Week 2                 Thin end-to-end slice, demoed internally
Week 3 (& 4 if 6wk)    Iterate on real data, eval-driven, pilot users in
Week 4/5               Measured study + polish + final demo
Week 5/6               Handoff, conversion conversation, post-mortem
```

Golden rule: **something end-to-end runs by end of week 2, no matter how ugly.** PoCs die from "we'll integrate the pieces in week 4," because integration is where customer environments bite.

---

### Q2. Week 1 — access & environment. What are the pitfalls?

**Answer:**

Week 1 is not a building week; it's a **de-risking week**. Everything that kills PoCs is discovered (or not) here.

Objectives:

1. **Access actually works.** VPN, SSO, cloud subscription, data store read access, model API reachable from inside their network. Every one of these fails the first time. Budget 2–3 days of pure plumbing.
2. **Data reality check.** Pull real samples on day 1–2. You are looking for the gap between what discovery promised and what exists: scanned PDFs, empty fields, duplicate records, mislabeled categories, a "database" that's actually 40 Excel exports.
3. **Eval set construction begins.** Sit with the SME, collect 50–100 real examples with expected outputs. This is the most valuable artifact of the whole PoC (see Q5).
4. **Baseline measurement.** Time the human doing the task NOW. Without a baseline, week-4 value claims are vibes.

Classic week-1 pitfalls:

| Pitfall | Symptom | Prevention |
| --- | --- | --- |
| Access provisioning stuck in a queue | "Your account is being created" for 8 days | Made it a SOW obligation with a date; escalate to sponsor on day 3, not day 10 |
| Corporate proxy / egress rules block model API | Timeouts, TLS interception errors | Ask IT for the egress allowlist process in week 0; have the endpoint list ready |
| Data is worse than promised | 60% scanned PDFs, or PII where none was declared | Say it EARLY and in writing: "found X, impact is Y, options are A/B" — week-1 bad news is a plan change; week-3 bad news is a failure |
| You get prod access "because it's easier" | — | Refuse. Non-prod only. See Part 2. |
| No local dev loop | Every test requires deploying into their env | Build a replayable local harness from exported (approved) samples on day 2 |
| SME unavailable | "She's in claims-quarter-close" | SME hours were in the SOW; invoke the sponsor |

**War story:** A team lost 9 days of a 20-day PoC because the customer's TLS-intercepting proxy silently mangled streaming responses from the model API — everything worked in `curl`, failed in the app. The fix was one config line (disable streaming, poll instead), but finding it burned a sprint. Since then the rule: **day-1 checklist includes an end-to-end "hello world" call to every external dependency from inside the customer network.** Not from your laptop. From where the code will actually run.

---

### Q3. Week 2 — the thin end-to-end slice. What does "thin" mean?

**Answer:**

By end of week 2 you demo (internally, to your champion): **one real input → through every layer of the system → one real output.** Narrow and complete beats broad and partial.

For the insurance example from `02_customer_discovery`: one real claim PDF → OCR → chunk → embed → retrieve → grounded summary with citations → rendered in a two-panel UI. One claim type. Maybe even one document layout. But REAL data, THEIR environment, EVERY layer.

Why the thin slice is non-negotiable:

* It flushes out integration failures while there's still time to fix them.
* It gives the champion something to show around internally — your best marketing.
* It converts abstract risk ("will this work?") into a concrete iteration problem ("citations work; retrieval misses tables — fixing that next").
* Psychologically, it flips the customer from skeptic to co-owner.

What NOT to do in week 2:

* Don't build the auth system, the admin panel, the config UI. Hardcode. `// PoC: single-tenant, config in env` is an honest comment.
* Don't optimize cost or latency yet. Correctness first; you'll tune in week 3 with eval data telling you where.
* Don't demo the thin slice to executives. It's for the champion and the SME. Execs get the week-4 version.

---

### Q4. Weeks 3–4 — iterating with real data. What does "eval-driven" mean in practice?

**Answer:**

The amateur loop: change prompt → try 3 queries → "looks better" → ship. The FDE loop:

```
1. Eval set: 50–100 real inputs + SME-approved expected outputs
   (built in week 1, grown weekly)
2. Score the current system:  retrieval hit-rate, answer correctness
   (LLM-judge + SME spot-check), citation validity, latency, cost/task
3. Read the FAILURES. Bucket them:
      - retrieval miss (right doc never fetched)
      - grounding failure (doc fetched, answer ignores it)
      - format/instruction failure
      - genuinely ambiguous input (→ needs a product decision, not a fix)
4. Fix the biggest bucket ONLY. Re-run. Log the score movement.
5. Repeat. Every change is justified by a number.
```

Weekly cadence in this phase:

* **Mon:** run evals, pick the week's target buckets, tell the customer in the status update: "this week we're attacking table extraction — currently 40% of misses."
* **Mid-week:** SME session — review 10 outputs together, harvest new eval cases from their corrections.
* **Fri:** eval re-run, status update with the numbers moving (see the template in `04_communication_and_whiteboarding.md`).

Pilot users enter in week 3 — a friendly group of 3–5 end users, framed explicitly: "this is a pilot, it will be wrong sometimes, your corrections make it better." Their feedback fills the eval set and their quotes fill your final deck.

**Interview trap:** "Your RAG accuracy is stuck at 70% and the demo is in a week. What do you do?" — Weak answer: "try a better model / better prompts" (random-walk engineering). Strong answer: "First I'd look at the failure distribution in the eval set — 70% overall might be 95% on three categories and 20% on one. If so, I narrow the demo scope to the strong categories, tell the customer honestly, and present the weak category with a remediation plan. Cutting scope to preserve trust beats gambling on a miracle." That answer demonstrates eval-thinking AND expectation management — both senior signals.

For eval mechanics, see `AI-ML/genAI/03_rag_architecture_deep_dive.md` and module `08-AI-Engineering`.

---

## Part 2: Working in Customer Environments

### Q5. What are the rules for operating in a customer's non-prod environment?

**Answer:**

You are a guest with root-shaped access in someone else's house. The rules:

**Least privilege, always:**

* Request the narrowest role that works: read-only on the specific data store, write only to your own resource group / namespace.
* Named individual accounts, never shared credentials. If they hand you a shared "vendor" login, ask for individual accounts — it protects YOU when the audit comes.
* Time-boxed access: ask that your access auto-expires at PoC end + 2 weeks. Customers notice and appreciate this; it also forces clean handoff.

**Data handling:**

* Data does not leave their environment. Not to your laptop "just to debug," not to a personal S3 bucket, not into a ChatGPT tab to "quickly check something." **This is the career-ending category of mistake.**
* Dev/test uses approved samples or synthetic derivatives; document which.
* Prompts and completions ARE data. If the model API is external, that's data egress — it must be explicitly approved (usually is, via their enterprise agreement, but confirm in writing).
* Screenshots for decks: scrub PII. Every time. Build the habit.

**The never-do list:**

```
NEVER in a customer environment:
✗ Touch production (even read-only) without written approval per-instance
✗ Copy customer data outside their perimeter (incl. pasting into
  external tools, logging PII to third-party observability SaaS)
✗ Commit customer data, secrets, or endpoints to your company's repos
✗ Disable/bypass a security control (cert pinning, proxy, DLP) —
  ask IT for the sanctioned path instead
✗ Install "just this one tool" outside their approved software process
✗ Share credentials across team members
✗ Run load tests without telling their platform team
✗ Leave debug endpoints / admin backdoors in, even in non-prod
```

**Leave-it-better habits:** infra as code (their Terraform patterns if they have them), a `RUNBOOK.md` in the repo from week 2, tagged resources with owner + expiry so their FinOps team doesn't hunt you down.

---

## Part 3: Demo Craft

### Q6. How do you structure and failure-proof a customer demo?

**Answer:**

The demo is a **performance with an argument**, not a feature tour. Structure (20–30 min slot):

```
DEMO SCRIPT TEMPLATE

1. RE-ANCHOR (2 min, no screen share yet)
   "Four weeks ago we agreed: adjusters spend 45 min/claim finding
   relevant passages, and success = 40% reduction with 100% cited
   answers. Today I'll show you the system, then the measurements."
   [Restate THEIR problem in THEIR words. Success criteria on one slide.]

2. THE MONEY PATH (8 min)
   One realistic scenario, end to end, narrated as the USER's story:
   "Priya gets claim #4411 — 62 pages. She opens the assistant..."
   - Use THEIR data, THEIR terminology, realistic names/volumes
   - Slow down at the payoff moment. Silence after the result lands.

3. THE TRUST MOMENT (4 min)  ← what separates senior FDE demos
   Deliberately show a failure-handling path:
   "Now watch what happens when the answer ISN'T in the documents —
   it says so and cites nothing, instead of guessing."
   GenAI buyers fear hallucination more than they crave features.
   Showing controlled failure builds more trust than ten happy paths.

4. THE NUMBERS (5 min)
   Baseline → after table. Eval scores. Cost per claim. Quotes from
   pilot adjusters. Check the success-criteria boxes one by one.

5. WHAT IT ISN'T (2 min)
   "This is a PoC: single claim type, non-prod, no HA. Production
   needs X, Y, Z — that's the conversation I'd like to start."
   [Pre-empting limitations beats being caught on them in Q&A.]

6. Q&A + NEXT STEP (rest)
   End with a specific ask: "Can we book the production-scoping
   workshop for next week?"
```

**Seeding realistic data:** curate 10–15 demo records covering: the impressive case, the common boring case, the edge case that shows robustness, and the "not in the docs" case. Know each record's story. Never demo on `test test 123` data — executives disengage instantly when data looks fake.

**Failure-proofing checklist:**

```
T-24h
- [ ] Full run-through on the exact machine + network you'll present from
- [ ] Warm every cache; pre-pull models; pre-provision quota
- [ ] Backup video recorded of the full money path (screen + narration)
- [ ] Static screenshots deck as second fallback
- [ ] Demo data frozen — nobody touches the environment after the rehearsal
T-1h
- [ ] Re-run the money path once
- [ ] Close every other app; notifications OFF (Slack messages about
      this customer appearing on screen = real incident)
- [ ] Hotspot ready if their guest Wi-Fi dies
During
- [ ] If something breaks: narrate calmly, switch to backup video
      within 60 seconds. "Live systems — this is why we record a
      backup. Here's the same flow from this morning's run."
      Composure IS the demo when things break.
```

**War story:** A live demo to a C-suite audience died because the model provider had a regional outage — that exact hour. The FDE said "perfect timing, let me show you what your users would see," showed the graceful-degradation banner the app displayed, then played the backup video of the happy path. The CTO later said the outage handling is what convinced him — "everyone's demo works; I wanted to see what happens when it doesn't." **Failure-proofing isn't just insurance; handled well, it's a selling point.**

---

## Part 4: Measuring & Presenting Value

### Q7. How do you measure and present PoC value credibly?

**Answer:**

**Baseline → After, same method, same units.**

| Metric | Baseline (measured wk 1) | After (measured wk 4) | Method |
| --- | --- | --- | --- |
| Review time / complex claim | 45 min | 24 min (−47%) | Timed study, 20 claims × 5 adjusters |
| Key-passage recall | (human = reference) | 88% | 100-claim eval set, SME-graded |
| Uncited assertions | n/a | 0 | Automated citation check + SME audit |
| Adjuster preference | — | 4.4/5 keep-it score | Exit survey, n=5 |

**Cost-per-task math — always show it, unprompted:**

```
Per-claim inference cost:
  OCR:            62 pages × $0.0015          = $0.093
  Embeddings:     ~90k tokens × $0.10/1M      = $0.009
  Generation:     35k in + 2k out
                  ≈ 35k×$3/1M + 2k×$15/1M     = $0.135
  Total per claim                              ≈ $0.24

Value per claim:
  21 min saved × $55/hr loaded adjuster cost   ≈ $19.25

Ratio: ~80:1.  At 120 claims/day: ~$29/day model spend
vs ~$2,300/day labor value → ~$500k/year at current volume.
```

Rules of credibility:

* **Show your assumptions** (loaded hourly cost, volumes) and let them correct the inputs — a customer arguing your assumptions is a customer accepting your model.
* **Undersell honestly.** "Time saved" ≠ "headcount saved"; frame as capacity: "each adjuster handles ~1.6x claims" or "same team absorbs next year's volume growth."
* **Include what didn't work.** One slide: known limitations + failure categories + remediation cost. It buys you 10x credibility on everything else.

---

## Part 5: Conversion & Post-Mortem

### Q8. How do you convert a PoC into a production contract?

**Answer:**

Conversion starts in week 1, not week 4 — every status update should quietly build the production case ("this week's finding also tells us production will need X"). At the end:

**The handoff/conversion doc (leave-behind after final demo):**

```markdown
# PoC → Production Plan — [Customer] Claims Assistant

## 1. What the PoC proved  (criteria table, checked, with data)
## 2. What the PoC deliberately skipped  (the honesty section)
   - Single claim type of 14
   - Non-prod, single instance, no HA/DR
   - Manual eval cadence; no drift monitoring
   - No SSO/RBAC beyond pilot group; no audit-grade logging
## 3. Production architecture delta
   [Diagram: PoC boxes vs production boxes — new/changed highlighted]
## 4. What the customer must fund
   | Workstream | Why | Rough size |
   |---|---|---|
   | HA deployment + DR | SLA 99.9 requires multi-AZ | M |
   | SSO + RBAC + audit logging | Compliance mandate | M |
   | Eval automation + drift monitoring | Quality doesn't self-maintain | M |
   | Remaining 13 claim types (phased) | Volume coverage | L |
   | MLOps runway: prompt/model change mgmt | Provider models update | S |
## 5. Team & operating model  (who runs it: us, them, hybrid)
## 6. Phased rollout plan with go/no-go gates
## 7. Commercial proposal reference
```

Key conversion behaviors:

* **Name the production-hardening cost explicitly.** Customers who think the PoC "is basically done" become customers who churn when prod is 5x the PoC effort. Underselling the delta is a short-term win and a long-term account loss.
* **The eval harness is your Trojan horse.** Leave it behind, wired into their data. It's genuinely useful AND it makes ripping you out expensive.
* **Land the next meeting before leaving the final demo.** "Production scoping workshop, next Thursday, who should be in the room?"

---

### Q9. What does a PoC post-mortem look like?

**Answer:**

Run one after EVERY PoC — won, lost, or ghosted. 45 minutes, blameless, written.

```markdown
# PoC Post-Mortem — [Customer], [dates]

## Outcome
Converted / Lost / Stalled — one-paragraph summary + final metrics.

## Timeline reality vs plan
| Week | Planned | Actual | Delta cause |

## What went well (keep doing)
-

## What went wrong (with root cause, not blame)
- e.g. "Lost 6 days to access provisioning. Root cause: security
  review started at kickoff instead of week 0. Fix: SOW template
  now requires review initiation before signature."

## Discovery misses
What did we learn in week 2+ that we should have learned in discovery?
(These become new discovery-call questions — the compounding asset.)

## Product gaps found (filed as tickets: links)
The FDE's roadmap-feedback duty — this section goes to the product team.

## Eval set disposition
Where it lives, who owns it, can it seed the next similar customer?

## One thing we'll do differently next PoC
(Exactly one. Post-mortems that produce 15 action items produce zero.)
```

**Interview trap:** "Tell me about a PoC/project that failed." They are not testing whether you fail — everyone does. They're testing whether you extract *systemic* fixes (process changes, checklist items) versus *personal* resolutions ("I'll try harder"). Bring a story where the failure changed a template, a checklist, or a playbook. See `05_behavioral_and_stories.md` for the full STAR treatment.

---

## Quick-Reference: PoC Operating Checklist

```
WEEK 0   □ SOW signed w/ success criteria table   □ Security review initiated
         □ Sponsor named    □ Data delivery date set   □ Access requests filed
WEEK 1   □ E2E hello-world from inside their network to every dependency
         □ Real data sampled + reality gap reported in writing
         □ Eval set v1 (50+ cases) with SME    □ Human baseline measured
WEEK 2   □ Thin slice runs end-to-end on real data   □ Champion demo done
         □ RUNBOOK.md exists    □ First status update sent
WEEK 3+  □ Eval-driven iteration (numbers in every status update)
         □ Pilot users active   □ Production-delta notes accumulating
FINAL WK □ Timed study done   □ Demo rehearsed + backup video recorded
         □ Final demo w/ criteria checked   □ Handoff doc delivered
         □ Next-step meeting booked   □ Post-mortem written
```

---

*Next: `04_communication_and_whiteboarding.md` — the delivery skill multiplier.*
