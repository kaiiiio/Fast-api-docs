# The FDE Role & Interview Loops — What You're Actually Signing Up For

---

## Part 1: What an FDE Actually Does

### Q1. What does a Forward Deployed Engineer actually do day-to-day?

**Answer:**

An FDE is a **software engineer embedded with a customer**, shipping working software inside the customer's environment, on the customer's data, against the customer's real problem — usually on an aggressive timeline (weeks, not quarters).

A realistic week:

| Day | What actually happens |
| --- | --- |
| Mon | Customer sync call. Discover their "clean" data export is 40% duplicates. Re-scope week. |
| Tue | Write ingestion + dedup pipeline in their VPC. Fight their proxy/firewall for 2 hours. |
| Wed | Build eval set with their SME. Prompt iteration. Accuracy 61% → 78%. |
| Thu | Demo to their VP. Handle "why not just use ChatGPT?" question. Log 6 new asks, accept 2. |
| Fri | Internal sync with your product team: file 3 platform gaps you hit. Write customer status update. Update SOW risk log. |

Key properties of the job:

* **You own outcomes, not tickets.** Nobody hands you a spec. You write the spec, get it signed, then build it.
* **You are the interface** between the customer's messy reality and your company's product. You feed field pain back into the product roadmap.
* **You code — a lot.** 50–70% hands-on-keyboard is typical. If a role is <30% coding, it's a solutions architect job wearing an FDE title.
* **You demo constantly.** The demo is the unit of progress. "It works in my notebook" counts for nothing.
* **You travel / sit in customer Slack channels.** Some roles are on-site heavy (Palantir tradition), most GenAI FDE roles are remote-embedded with occasional on-sites.

---

### Q2. FDE vs Solutions Architect vs Sales Engineer vs Consultant — what's actually different?

**Answer:**

| Dimension | FDE | Solutions Architect (SA) | Sales Engineer (SE) | Consultant (Big 4 / boutique) |
| --- | --- | --- | --- | --- |
| **Primary output** | Working software in customer env | Reference architecture, guidance docs | Demos, PoCs that close deals | Slide decks, recommendations, sometimes code |
| **Writes production-grade code?** | Yes, daily | Rarely — snippets, IaC samples | Demo-quality only | Depends; often junior offshore team does |
| **Owns delivery outcome?** | Yes — PoC success/failure is on you | No — customer's team builds | No — post-sale handoff | Contractually, via SOW |
| **Attached to sales cycle?** | Pre- and post-sale (land + expand) | Mostly post-sale | Pre-sale only | Sold as engagement |
| **Breadth vs depth** | Deep on one customer at a time (1–3) | Broad, 10–30 accounts | Broad, many deals in parallel | Varies by engagement |
| **Feeds product roadmap?** | Yes — core part of the job | Sometimes | Rarely | No |
| **Career ladder** | IC eng ladder (senior/staff) or GTM eng ladder | SA ladder → principal SA | SE ladder → SE manager | Analyst → partner |
| **Comp mix** | Mostly base + equity; sometimes variable | Base + bonus | Base + commission/variable (30%+) | Base + bonus |
| **Failure mode** | Burnout, "shadow product team" drift | Becomes PowerPoint architect | Demo monkey | Deck factory |

**Interview trap:** "Why FDE and not solutions architect?" — the interviewer is checking whether you understand you'll be **writing and shipping code under deadline pressure**, not advising. Bad answer: "I like talking to customers." Good answer: "I want to keep building, but I want what I build to be judged by a customer's business metric, not a sprint velocity chart. SA roles drift away from the keyboard; FDE keeps me on it with higher stakes."

---

### Q3. Why did the FDE role explode with GenAI?

**Answer:**

Three structural reasons:

1. **GenAI doesn't sell from slides.** Every buyer has seen a slick vendor demo on curated data. The only question that matters is: *does it work on OUR documents, OUR jargon, OUR edge cases, inside OUR security perimeter?* Answering that requires an engineer deployed into their environment. A sales deck cannot prove grounding accuracy on the customer's contract corpus; a 4-week PoC can.

2. **The gap between "model API" and "working system" is enormous and non-obvious.** Buying GPT/Claude access gets you 10% of the way. Chunking strategy, retrieval quality, evals, guardrails, cost control, latency, data pipelines — customers can't staff this overnight. FDEs are rented expertise that de-risks the buy.

3. **Land-and-expand economics.** A $50k PoC that becomes a $2M/year platform contract is the GenAI vendor playbook. The FDE is the person who converts the PoC. That's why FDE headcount at OpenAI/Anthropic/Scale grew faster than almost any other function 2023–2026.

**War story (pattern you'll hear in every FDE org):** A bank ran bake-offs between three GenAI vendors. Two sent sales engineers with canned demos. One sent an FDE who spent a week getting read access to the bank's actual policy documents and demoed retrieval over *those*, including gracefully handling a question the docs couldn't answer ("I don't have a source for that" instead of hallucinating). The FDE's vendor won despite having the weakest raw model at the time. **Proof in their environment beats benchmarks every time.**

---

### Q4. Who hires FDEs, and how do their profiles differ?

**Answer:**

| Company | Flavor of FDE | What they optimize for in hiring |
| --- | --- | --- |
| **Palantir** (invented the role, ~2010s "Delta"/FDE split) | On-site embedded, ontology + pipeline building on Foundry/AIP. Deployment Strategist (less code) vs FDE (more code) split. | Raw problem-solving, decomposition under ambiguity, willingness to travel/grind. Famous for unconventional interviews and hiring generalists. |
| **OpenAI** | FDE / Solutions Engineering on strategic accounts. Heavy pre-sale + PoC. | Strong SWE bar + LLM app experience (RAG, evals, agents) + executive communication. |
| **Anthropic** | Applied AI / FDE — embed with enterprises building on Claude. | LLM engineering depth (prompting, evals, agentic patterns, MCP), safety-aware design, customer empathy. |
| **Scale AI** | GenAI platform deployments, gov + enterprise. Data-pipeline heavy. | Speed of execution, data engineering, comfort with messy labeling/eval loops. |
| **Sierra** (agents for customer service) | Agent Engineer / FDE building customer-facing agents per client. | Conversation design + engineering hybrid, quality obsession (agents face end users). |
| **Glean** | Enterprise search/RAG deployments, connector + permission-aware retrieval. | Search relevance intuition, enterprise integration (SSO, ACLs), federated data. |
| **Harvey** (legal AI) | Domain-embedded FDE with law firms. | Precision culture — legal tolerance for hallucination is ~zero. Eval rigor. |
| **AWS / GCP GenAI teams** (ProServe, AppliedAI, GenAI Innovation Center) | Closer to consulting; multi-account; Bedrock/Vertex stacks. | Cloud certification-level depth, architecture breadth, delivery process. |
| **High-growth startups (e.g. Heizen and similar AI-delivery shops)** | "AI product engineering as a service" — you ARE the product team for the client. Multiple concurrent builds. | Full-stack speed (Next.js/Node/Python), shipping velocity, comfort with chaos and direct client exposure. Expect hustle culture. |

Rule of thumb: **the bigger the company, the more the role tilts toward architecture and process; the smaller, the more it tilts toward raw shipping speed.**

---

## Part 2: Interview Loop Anatomy

### Q5. What does a typical FDE interview loop look like, and what does each round filter for?

**Answer:**

```
Recruiter screen (30 min)
   → Coding / machine coding (60–90 min, sometimes take-home)
      → LLD / code design (60 min)
         → HLD / system design (60 min)
            → AI / architecture round (60 min)   ← the FDE differentiator
               → Behavioral + customer scenario (45–60 min)
                  → (sometimes) Hiring manager / exec chat
```

| Round | What it actually filters for | How FDE flavor differs from product SWE |
| --- | --- | --- |
| **Recruiter screen** | Communication baseline, motivation coherence, comp alignment, visa/travel constraints | They probe *why customer-facing*. Have a crisp 60-second answer. |
| **Coding / machine coding** | Can you write working code fast without hand-holding | Often "build a small working thing in 90 min" (rate limiter, CSV → API pipeline, mini RAG CLI) rather than pure LeetCode. Working > elegant. See `03-Machine-Coding`. |
| **LLD** | Can you structure code that another team (the customer's!) can extend | Emphasis on clean interfaces, config-driven behavior, testability. See `02-LLD-Design-Patterns`. |
| **HLD / system design** | Can you design for scale AND explain it | You'll be asked to design in front of a "customer" persona. Whiteboard clarity is scored, not just correctness. See `04-System-Design-HLD` and `04_communication_and_whiteboarding.md` in this module. |
| **AI / architecture round** | Do you actually understand LLM systems: RAG vs fine-tuning, evals, agents, cost/latency, failure modes | This is the round that kills strong generalist SWEs. Study `AI-ML/` folder + 08-AI-Engineering. Expect "customer wants X — design it and defend your choices." |
| **Behavioral / customer scenario** | Judgment under conflict: pushback, ambiguity, ownership | Scenario-based: "customer's CTO says your demo is wrong — go." See `05_behavioral_and_stories.md`. |

**Interview trap:** In the machine-coding round, candidates over-engineer (abstract factories, perfect error hierarchies) and run out of time. FDE hiring bars reward a **working end-to-end slice with one test and honest TODO comments** over a beautiful half-finished skeleton. Say out loud: "I'll get it working end-to-end first, then harden" — that sentence IS the FDE mindset they're screening for.

---

### Q6. How do specific companies' loops differ?

**Answer:**

* **Palantir:** famously puzzle/decomposition heavy. Expect an unconventional "decomp" interview — a huge vague problem ("how would you reduce food waste in a hospital chain?") where they score how you carve ambiguity into an executable plan. Coding rounds are practical. Culture fit ("do you run toward hard unglamorous problems") matters a lot.
* **OpenAI / Anthropic:** strong conventional SWE bar (coding + system design) PLUS an applied-AI round (design a RAG system with evals; debug a failing agent; reason about hallucination mitigation) PLUS customer-facing behavioral. Anthropic loops probe how you think about reliability and safety of deployed systems, not just capability.
* **Scale / Sierra / Glean / Harvey:** practical take-homes are common — "build a working prototype over our API / sample data, then present it" with a live presentation round where they play skeptical customer. Your presentation is scored as heavily as your code.
* **AWS/GCP:** Leadership Principles behavioral (AWS) is half the loop. STAR stories must be tight and metric-laden. Architecture rounds follow well-known Well-Architected patterns.
* **Startups (Heizen-type):** compressed loops — 1 call + paid trial project or 2-day sprint is common. They're testing shipping speed and whether clients can be put in front of you on day 3. The trial IS the interview; treat it like a PoC (scope it, demo it, write the summary email).

---

### Q7. What's the compensation landscape and leveling for FDEs?

**Answer:**

Directional (2025–2026, varies wildly by geography and company stage):

| Tier | Example employers | Senior-level total comp (US) | India (senior, INR/yr) |
| --- | --- | --- | --- |
| Frontier labs | OpenAI, Anthropic | $350k–$600k+ (heavy equity) | Rare; remote-US-anchored when it exists |
| Hot AI startups | Sierra, Glean, Harvey, Scale | $250k–$450k (equity lottery ticket) | ₹60L–₹1.2Cr for the few India roles |
| Palantir | — | $200k–$400k by level | — |
| Cloud providers | AWS ProServe, GCP | $220k–$380k | ₹50L–₹90L |
| Growth-stage services/AI-delivery startups | Heizen-type | $120k–$220k / ₹25L–₹60L | ₹25L–₹60L, sometimes + project bonuses |

Leveling notes:

* Most orgs map FDE to the standard eng ladder (L4/L5/L6 ≈ mid/senior/staff). Your **customer-facing evidence** (led a deployment, owned an account, converted a PoC) is what argues for senior+ — not years of MERN experience.
* Some orgs have variable comp tied to deployment success or expansion revenue. **Ask explicitly** — it changes the job's incentives.
* Equity at labs/startups dominates; negotiate equity, not base. See `05_behavioral_and_stories.md` for negotiation scripts.

---

### Q8. What's the hustle-culture reality, and how do I gauge it before signing?

**Answer:**

The honest version: FDE at a startup can mean **customer deadlines are law**. When the PoC demo is Thursday and ingestion broke Tuesday night, you're working Tuesday night. Palantir built its reputation on FDEs living on-site for months. AI startups in land-grab mode inherit that DNA.

It is not uniformly brutal — but you must measure it **before** you sign. Questions that get real answers:

```
Calibration questions for the hiring manager / future peers:

1. "Walk me through the last two weeks of the FDE who's been here longest.
    How many evenings/weekends did they work?"
2. "How many concurrent customers does one FDE carry?"        (1–2 = sane, 4+ = grind)
3. "When a PoC slips, what gives — scope, timeline, or the engineer's weekend?"
4. "What % of FDEs hit their 18-month mark?"                  (attrition proxy)
5. "Who says no to a customer? Have you ever fired a customer?"
6. "Is there on-call for deployed systems? Compensated?"
7. "What did the last failed PoC look like, and what happened to the FDE on it?"
   (Healthy org: blameless post-mortem. Unhealthy: silence or a scapegoat story.)
```

**Red flags:** "we're like a family", every answer involves heroics being celebrated, no answer to the attrition question, PoCs are "always 2 weeks" regardless of scope.

**Green flags:** they name a time they pushed a deadline back on a customer; scope is the variable that gives; FDEs rotate off accounts.

**Interview trap:** asking "what's the work-life balance like?" gets you a canned answer and can read junior. The behavioral-specific questions above get you data AND signal seniority — you're interviewing them with the same discovery technique you'd use on a customer (see `02_customer_discovery_and_requirements.md`).

---

### Q9. What background beats what in FDE hiring? (Where does a MERN dev stand?)

**Answer:**

Rough desirability stack for GenAI FDE roles:

1. **Shipped LLM systems in production** (RAG/agents with evals, real users) — instant credibility.
2. **Strong product SWE + evidence of customer exposure** (led client calls, owned integrations).
3. **Strong product SWE, no customer exposure** — passes technical bar, must manufacture customer-facing evidence (portfolio + stories).
4. **SA/SE wanting to code again** — communication is there, coding bar is the risk.
5. **Pure consultant** — usually fails the coding bar.

A MERN developer sits at (3), moving to (2)/(1) via the portfolio in `06_transition_plan_mern_to_fde.md`. Your advantages: you can build demo UIs fast (React), you speak API/product fluently, and full-stack generalism maps to FDE breadth. Your gaps: distributed systems vocabulary, cloud depth, AI engineering, and consulting presence — all closable in months, and precisely what modules `01`–`08` of this knowledge base plus `Devops/` and `AI-ML/` exist for.

---

## Part 3: Quick Self-Check Before You Apply

Checklist — you're loop-ready when you can honestly tick all of these:

- [ ] I can build a working RAG pipeline with retrieval evals from scratch in a 90-minute screen share.
- [ ] I can design a multi-tenant GenAI system on a whiteboard and give capacity numbers without notes. (`04-System-Design-HLD`)
- [ ] I have 8–10 STAR stories indexed by theme. (`05_behavioral_and_stories.md`)
- [ ] I can explain RAG vs fine-tuning trade-offs to (a) an exec in 60 seconds and (b) an ML engineer in 10 minutes. (`AI-ML/genAI/04_fine_tuning_vs_rag.md`)
- [ ] I can run a mock discovery call and produce a one-page SOW from it. (`02_customer_discovery_and_requirements.md`)
- [ ] I have 3 portfolio projects with READMEs that answer "why is this production-grade?" (`06_transition_plan_mern_to_fde.md`)
- [ ] I've done at least 5 mock interviews across coding / HLD / AI / behavioral.

---

*Next: `02_customer_discovery_and_requirements.md` — the skill that separates FDEs from feature factories.*
