# Communication & Whiteboarding — The FDE Force Multiplier

Two FDEs with identical technical skill: the one who communicates at the right altitude, whiteboards legibly, and handles conflict gracefully delivers 3x the account impact. Interviews test this explicitly (system design presentation, customer-scenario rounds) and implicitly (every round).

---

## Part 1: The 3-Altitude Rule

### Q1. How do you present the same architecture to executives, managers, and engineers?

**Answer:**

Same system, three altitudes. Prepare all three for every design you carry — you'll often hit all three audiences in one meeting.

**Altitude 1 — Executive (30–60 seconds, zero boxes):**

> "Adjusters spend half their day hunting through documents. We've built an assistant that reads the claim file and points them to exactly the passages that matter, with citations they can verify. Pilot results: reviews are 47% faster and nothing gets asserted without a source. It runs entirely inside your Azure environment — no data leaves. To take it to all claim types we need decision X from you."

Rules: business outcome → trust/risk posture → the one decision you need. No component names. No acronyms. **If an exec asks a technical question, answer at THEIR altitude first, then offer depth:** "It stays accurate because every answer must quote its source document — happy to go one level deeper if useful."

**Altitude 2 — Manager / technical lead (3–5 minutes, 4–6 boxes):**

> Flow-level: "Documents come in here, get OCR'd and indexed. When an adjuster asks a question, we retrieve the relevant passages and the model composes an answer that must cite them. Everything logs to your Datadog. The pieces your team will operate are these two; the pieces we manage are these."

Rules: major components, data flow, ownership boundaries, operational burden, integration points with THEIR systems. This audience decides whether the thing is adoptable.

**Altitude 3 — Engineer (as deep as they want):**

> Chunking strategy and why 512 tokens with heading-aware splitting; hybrid retrieval (BM25 + vector, RRF fusion) and reranking; eval harness design; why Postgres+pgvector over a dedicated vector DB at their scale; token budgets; failure modes and retries.

Rules: bring receipts (eval numbers, benchmarks), admit unknowns crisply, and **never bluff — one caught bluff at altitude 3 destroys your credibility at all altitudes.**

**Interview trap:** In system design rounds for FDE roles, interviewers sometimes interrupt mid-design with "OK, the CFO just walked in — summarize where we are." They're testing altitude-switching on demand. Practice compressing any design you make to one exec sentence: *outcome, risk posture, decision needed.*

---

## Part 2: Whiteboarding Technique

### Q2. What's the technique for a legible whiteboard (interview or customer session)?

**Answer:**

Bad whiteboards are spaghetti drawn in the order thoughts occurred. Good whiteboards are **planned surfaces**:

```
┌─────────────────────────────────────────────────────────────────┐
│  TITLE: Claims Review Assistant          [corner: key numbers]  │
│                                          120 claims/day         │
│   SOURCES        PIPELINE        SERVING         users: 30      │
│  ┌───────┐   ┌────────────┐   ┌─────────┐       p95 < 5s        │
│  │ Doc   │──▶│ OCR→chunk→ │──▶│ API +   │──▶ Adjuster UI        │
│  │ store │   │ embed→index│   │ retrieve│                       │
│  └───────┘   └────────────┘   │ +generate│                      │
│   "PDFs,      "batch, nightly │└─────────┘                      │
│    60% scanned"  + on-arrival"  "grounded, cited"               │
│                                                                 │
│   [bottom strip: OPEN QUESTIONS / RISKS as they arise]          │
└─────────────────────────────────────────────────────────────────┘
```

The rules:

1. **Left-to-right data flow.** Sources on the left, consumers on the right. Time/causality flows one direction. The audience reads it like a sentence.
2. **Label the arrows, not just the boxes.** An unlabeled arrow is a lie waiting to happen. Write WHAT moves ("PDFs, ~60/day", "top-8 chunks", "JSON verdict") and HOW ("REST", "queue", "nightly batch"). Half of all design misunderstandings live on the arrows.
3. **Capacity numbers in a corner.** Volume/day, users, latency target, data size — written down BEFORE drawing boxes. Every subsequent choice ("do we need a queue here?") gets settled by pointing at the corner. In interviews, doing this unprompted is a strong senior signal.
4. **Layout before ink.** Take 10 seconds to plan zones (sources | processing | serving | consumers). Redrawing mid-session because you ran out of space reads as unstructured thinking.
5. **A visible parking lot.** Bottom strip for risks/open questions raised during discussion. It shows you heard the concern without derailing the flow — and it becomes the action-item list.
6. **Narrate while drawing, pause after.** Draw a component, say its one-line job, move on. After the full pass, stop talking and let the room read. The question they ask next tells you where to zoom.
7. **In customer sessions: hand over the marker.** "Can you draw how the document store is organized today?" A customer drawing on your whiteboard is co-owning the design — persuasion gold.

For the underlying design content itself, drill `04-System-Design-HLD` and `05-Distributed-Systems`.

---

## Part 3: Pushback, Being Wrong, and Trade-offs

### Q3. How do you handle pushback — and being wrong — gracefully?

**Answer:**

The sequence: **acknowledge → clarify → respond at the level of their concern → converge on a test.**

```
Customer architect: "Vector search is a fad. We have Elasticsearch;
                     why aren't you just using that?"

Weak (defensive):   "Vector search is much better for semantic..."
                    [contradiction before understanding = fight]

Strong:             "Fair challenge — you already run ES well, and
                     adding infra has a real cost.           [acknowledge]
                     Can I ask what's driving it — operational
                     footprint, or skepticism on retrieval quality?
                                                             [clarify: which concern?]
                     Because on footprint I likely agree: ES with
                     dense-vector fields might be plenty at your scale,
                     and hybrid BM25+vector often beats pure vector
                     anyway. Let's settle it with data: we run the
                     week-1 eval set against both configurations and
                     let the retrieval scores decide.        [converge on a test]"
```

Being wrong in public — the senior move is speed and specificity:

* **Concede fast, precisely, without groveling.** "You're right — I said the index rebuild was incremental; it's actually full-rebuild nightly. That changes the freshness story: worst case 24h staleness. Let me walk through what that affects." One clean sentence of correction, then forward.
* **Never defend a position because you stated it loudly.** The customer's engineers will test you once; how you handle it determines whether they trust you for the rest of the engagement.
* **Distinguish "wrong" from "different trade-off."** If it's genuinely a judgment call, name it as one (see the pattern below) instead of accepting a framing that you made an error.

### Q4. What's the trade-off communication pattern?

**Answer:**

**"We chose X, accepting Y, because Z."** Every architectural statement should be expressible in this form — it pre-empts the "why not W?" ambush by showing you already saw the cost.

Examples:

* "We chose **Postgres + pgvector** over a dedicated vector DB, **accepting** a ceiling of a few million vectors and slower ANN at scale, **because** your team already operates Postgres, your corpus is 400k chunks, and one fewer system to run beats benchmark performance you don't need."
* "We chose **a managed model API** over self-hosting, **accepting** per-token costs and a data-egress review, **because** self-hosting adds GPU ops your team doesn't have, and the enterprise agreement already covers data handling."
* "We chose **human-approval-before-send**, **accepting** lower throughput, **because** your regulatory exposure on wrong answers is asymmetric — we can loosen this later with eval evidence, but we can't un-send a wrong denial."

When the customer pushes to flip a trade-off, don't argue — **price it**: "We can absolutely self-host. Here's what that buys and what it costs: +GPU infra ~$X/month, +an ops skillset hire, −per-token fees, −egress concern. If data sovereignty outweighs that, it's the right call — your call to make, my job is the price tag."

---

## Part 4: Writing

### Q5. What's the ADR (Architecture Decision Record) template and when do you write one?

**Answer:**

Write an ADR for any decision that (a) is expensive to reverse, (b) will be questioned later, or (c) a customer stakeholder disagreed with. In customer engagements ADRs are also political armor: when the new VP asks "why on earth is this on ECS?", the answer is a dated document with their own team's names in the "consulted" line.

```markdown
# ADR-007: Retrieval store — Postgres/pgvector over dedicated vector DB

Date: 2026-07-04        Status: Accepted
Deciders: [FDE], [customer platform lead]
Consulted: [customer DBA team, security]

## Context
Corpus: ~400k chunks, growth ~5k/week. Team operates Postgres 15
(RDS) today; no prior vector DB experience. p95 retrieval budget
300ms within a 5s end-to-end budget. Security prefers no new
data stores holding document content.

## Decision
Use pgvector (HNSW) in the existing RDS instance, hybrid with
Postgres FTS, RRF fusion in the app layer.

## Alternatives considered
1. Dedicated vector DB (managed) — better ANN at 10M+ scale;
   rejected: new system to secure/operate, scale headroom unneeded.
2. Elasticsearch dense vectors — viable; rejected: ES cluster here
   is owned by another team with a 3-week change queue.

## Consequences
+ Zero new infra; existing backup/DR applies; security review trivial
− Re-embedding migrations lock tables (mitigate: shadow column swap)
− If corpus passes ~5M chunks, revisit (trigger written into
  the production plan)

## Revisit when
Corpus > 5M chunks OR p95 retrieval > 300ms sustained.
```

Keep ADRs under a page. The "revisit when" line is what makes them senior artifacts — decisions with expiry conditions instead of dogma.

### Q6. What does a weekly customer status update look like?

**Answer:**

Sent every Friday, same format, whether the week was great or terrible. Consistency is the trust mechanism — the update customers stop reading is the one that changes format when news is bad.

```markdown
Subject: [Claims Assistant PoC] Week 3 status — on track, one risk

## TL;DR
On track for the Aug 1 demo. Retrieval quality up 61%→84% this week.
One risk needs your help: SME availability (details below).

## Progress this week
- Table-extraction fix shipped: key-passage recall 61% → 84% on the
  100-claim eval set (target: 85%)
- Pilot group (4 adjusters) processed 37 live claims through the tool
- Citation-validity check automated; running clean (0 uncited assertions)

## Metrics
| Success criterion        | Target | Current | Trend |
|--------------------------|--------|---------|-------|
| Key-passage recall       | ≥85%   | 84%     | ↑     |
| Uncited assertions       | 0      | 0       | →     |
| Review-time reduction    | ≥40%   | measures wk 4 | — |

## Next week
- Attack remaining recall gap (mostly handwritten-note scans)
- Timed study prep: need 5 adjusters for 2h on Thu (owner: Priya)

## Risks & asks  ⚠
- SME sessions missed twice this week (quarter-close). Without 3h
  next week, eval grading slips and the demo date is at risk.
  ASK: [Sponsor] to confirm SME time by Tue.

## Decisions needed
- None this week.
```

Rules: TL;DR first line carries the whole message; metrics table every week (same table — trends visible); risks include a named ask and owner; **never bury bad news below the fold.** Bad news in week 3 with a plan is professionalism; bad news discovered by the customer in week 5 is a fired vendor.

---

## Part 5: Running Meetings

### Q7. How do you run a customer meeting like a senior engineer?

**Answer:**

* **Agenda 24h ahead**, with the decision(s) the meeting must produce stated at the top. A meeting with no decision to make should be an email.
* **Timebox out loud.** "We have 45 minutes: 10 on status, 25 on the retrieval trade-off decision, 10 on next steps." When a rabbit hole opens: "Great thread — parking-lotting it; I'll follow up in writing. Back to the decision."
* **Name a note-taker (usually you) and end with action items read aloud:** owner + date for each, in the room, so ownership is accepted publicly. Send them within 24h.
* **Silence technique:** after asking a hard question ("what would make you NOT buy this?"), count to five in your head. The customer fills silences with truth.
* **End 5 minutes early with next steps.** Meetings that run to the wall lose the action-item recap, which is the only part that matters.

---

## Part 6: Difficult Scenarios (with dialogues)

### Q8. The customer wants something insecure. What do you do?

**Answer:**

```
Customer PM: "Just give the pilot group access with a shared login,
              we can't wait 2 weeks for the SSO integration."

FDE:  "I get it — the pilot is blocked and that's my problem too.
       I can't do a shared login though, and here's why it bites YOU,
       not just me: the audit trail becomes meaningless — when
       someone asks 'who queried claim 4411', the answer is
       'everyone'. In your regulatory environment that finding alone
       could kill the production approval later.       [their-interest framing]

       Here's what I can do instead, today: magic-link auth scoped
       to the five pilot emails — an afternoon of work, individually
       attributable, and we swap it for your Entra SSO in production.
       Gets the pilot unblocked this week. Work for you?"
                                                        [never a bare 'no' —
                                                         a cheaper safe path]
```

The pattern: **never a bare refusal** — (1) restate the goal behind the risky ask, (2) explain the risk in terms of THEIR downside, (3) offer a safe path that achieves the goal, (4) if they insist anyway, escalate internally and get the exception decision made in writing above your pay grade. You are not the risk owner; don't silently become it.

### Q9. Scope creep mid-PoC. What do you do?

**Answer:**

```
Champion: "This is going great — can we also make it handle the
           property-damage claims? And Marketing saw the demo and
           wants a version for their contracts..."

FDE:  "That enthusiasm is the best signal we've gotten — and both of
       those are exactly where this should go.          [never punish enthusiasm]
       Here's my concern as the person accountable for Aug 1: we
       committed to 40% time-reduction on auto-injury claims, and
       we're at 84% recall against an 85% bar. Every hour on
       property-damage is an hour off that number.

       So here's what I suggest: both requests go on the production
       roadmap — I'll write them up this week as scoped line items
       with estimates, which honestly strengthens the business case
       your VP will see. The PoC stays locked on the committed
       criteria. If property-damage is genuinely more urgent than
       auto-injury, that's a real option too — but it's a scope
       SWAP with a new timeline, and [sponsor] signs off on it,
       not you and me on a call."                       [swap, not add;
                                                         decision to the sponsor]
```

The mechanics: scope changes are **swaps, not additions**; the SOW's success-criteria table is the constitution you point at; new asks become *written* production-roadmap items (which converts creep into expansion revenue); the sponsor — not the champion — authorizes swaps.

**War story:** A PoC accepted "one small addition" verbally in week 2, then another in week 3. Week 5 demo: original criteria missed by 8%, and the customer remembered the additions as "part of the deal." The engagement died in the interpretation debate. The fix that stuck: any scope discussion gets a same-day email — "confirming what we agreed: X is added/swapped/deferred" — and the criteria table is re-pasted in every weekly update so nobody can forget what "done" means.

### Q10. The customer's internal team is hostile to your solution. What do you do?

**Answer:**

First, diagnose why — the plays differ:

| Root cause | Signal | Play |
| --- | --- | --- |
| **Threat** ("we could've built this") | Nitpicking, benchmark ambushes | Recruit: make them co-architects, credit them publicly, route decisions through them |
| **Burned before** (vendor #3 this year) | "The last vendor said that too" | Ask about the corpses: "what did they promise that didn't happen?" — then behave observably differently |
| **Real technical disagreement** | Specific, consistent objections | Take it seriously — they might be right; converge on evals/tests |
| **Political** (their boss opposed the buy) | Objections shift when refuted | You can't engineer your way out; inform your sponsor + champion, multi-thread |

The recruit play in dialogue:

```
Staff engineer (hostile): "We evaluated RAG last year. It hallucinated
                           constantly. This is a toy."

FDE:  "You ran an actual evaluation? That's honestly more than most
       teams do — what did you test on, and where did it break?
                                            [respect + extract real data]

Eng:  "Policy documents. It invented clause numbers."

FDE:  "Classic failure, and it's disqualifying in your domain — if
       our system invents clause numbers, you SHOULD throw it out.
       Can I ask for something? Give me your ten nastiest questions
       from that eval — the ones that broke it. We'll add them to
       the eval set with your name on them, and they run on every
       build. If we can't pass your questions, you'll have killed it
       with evidence, and that's a fair death."
                                            [convert the hostile into
                                             the examiner — their spear
                                             becomes your test suite]
```

If their questions break your system — say so, fix it, and tell them what changed. A converted skeptic is the most credible internal advocate an FDE can have; a steamrolled one sabotages the rollout after you leave.

**Interview trap:** Scenario rounds often present the hostile-engineer situation and watch whether you (a) try to win the argument — fail; (b) go around them to management — worse; or (c) convert their skepticism into a testable bar you then meet. Say (c), with the eval-set mechanism, and you're speaking senior.

---

## Drill List

- [ ] Take one system you've built and write its 60-second exec version, 5-minute manager version, and deep-dive outline. Say all three out loud.
- [ ] Whiteboard a RAG platform left-to-right in 8 minutes with labeled arrows and corner numbers. Photograph, critique, repeat weekly. (`04-System-Design-HLD` designs work too.)
- [ ] Write one ADR for a real past decision using the template.
- [ ] Roleplay the three dialogues in Part 6 with a friend playing hostile. The words must be in your mouth, not just your notes.
- [ ] Rewrite last week's work as a customer status update in the template.

---

*Next: `05_behavioral_and_stories.md` — turning your history into interview ammunition.*
