# FDE AI-Round Scenarios and Case Studies

This is the interview file. Each scenario is written the way an interviewer actually delivers it, followed by the clarifying questions a strong candidate asks *before* answering, a full answer walkthrough, the follow-up grilling you should expect, and the specific things that get candidates rejected.

Model IDs and prices referenced: `claude-opus-4-8` (`$5/$25` per 1M), `claude-sonnet-5` (`$3/$15`, intro `$2/$10` through 2026-08-31), `claude-haiku-4-5` (`$1/$5`).

The meta-rule across every scenario: **an FDE is hired to de-risk the customer's problem, not to show off model knowledge.** The winning answer almost always (a) asks clarifying questions first, (b) proposes the simplest thing that could work, (c) names the failure modes, and (d) puts a measurement/eval loop around it. Candidates who jump straight to "I'd use RAG with a reranker and…" before understanding the problem lose.

---

## Scenario 1 — RAG over 10M internal docs with per-user ACLs

**Scenario.** "We have about 10 million internal documents — Confluence, Google Drive, Slack exports, PDFs. We want an assistant employees can ask questions of. The catch: every employee can only see what they're already permissioned to see. An HR doc must never surface to an engineer. Design it."

**Clarifying questions to ask.**
- What's the source of truth for permissions today — an existing ACL system, group membership, per-document sharing? Can I query it at request time?
- How fresh must permissions be? If someone loses access at 9:00, must the assistant reflect that at 9:01, or is a few-minutes lag acceptable?
- Query volume and latency target? 100 QPS with a 2s budget is a different system than 5 QPS.
- Do documents change often (re-index cadence)?

**Strong answer walkthrough.**

The core insight: **ACLs are a retrieval-time filter, never a generation-time afterthought.** You must guarantee that a document the user can't see never enters the context window in the first place. Filtering after retrieval, or asking the model to "only use documents you're allowed to," is a security hole.

Architecture:
1. **Ingest with permission metadata.** Every chunk carries the ACL of its source document — the allow-list of principals (users/groups) at index time. Store it in the vector DB alongside the embedding as filterable metadata.
2. **Filter at query time before/inside the vector search.** Resolve the requesting user's groups, then run the ANN search with a metadata pre-filter (`principals ∩ user_groups ≠ ∅`). Use a vector DB that supports efficient filtered search (metadata pre-filtering, not post-filtering — post-filtering returns k results then drops the ones you can't see, so you get fewer than k).
3. **Re-check at read time for high-sensitivity content.** For the most sensitive classes, do a live authorization check against the source-of-truth ACL system on the final retrieved set, because the index can be stale.
4. **Generate only over the filtered set**, with citations back to source docs (which the user can click and which will independently enforce ACLs).

```
query + user_id
     │
     ▼
resolve user's groups ──▶ ACL filter
     │
     ▼
vector search WITH metadata pre-filter (principals ⊇ user_groups)
     │
     ▼
[optional] live ACL re-check on top-k for sensitive classes
     │
     ▼
Claude answers over filtered chunks, with citations
```

**Scale/permission-freshness tradeoff:** indexing ACLs into the vector store is fast at query time but goes stale when permissions change. Two patterns: (a) index ACLs and accept a re-index lag, plus a live re-check on sensitive docs; or (b) index only a document ID and do the authorization check live against the ACL service for every retrieved doc. (a) is faster and scales; (b) is always-correct but adds latency and load on the ACL service. Most systems do (a) with (b) layered on the sensitive tier.

**Follow-up grilling with answers.**
- *"What if permissions change and your index is stale?"* — That's why sensitive classes get a live re-check on the final set; for the long tail, define an acceptable re-index lag with the customer and re-sync ACLs on a schedule plus on permission-change webhooks.
- *"How do you stop the model from leaking a doc it saw via a citation snippet?"* — It never sees a doc it can't access; filtering happens before retrieval, so unauthorized docs are never in context. Citations point to sources that independently enforce ACLs.
- *"10M docs — how do you keep retrieval fast with a filter?"* — Use a vector DB with native filtered-ANN (metadata pre-filtering during graph traversal), partition/shard by tenant or org unit so the filter space is smaller, and cache group resolution.

**What gets you rejected.** Saying "we'll tell the model not to reveal restricted docs" — that's prompt-based security, which is not security. Post-filtering after retrieval (silently returning fewer results and, worse, implying the filter is a nice-to-have). Not asking about the permission source of truth. Treating ACLs as metadata to be nice about rather than a hard pre-filter invariant.

---

## Scenario 2 — The live demo hallucinates in front of the customer

**Scenario.** "You're demoing the assistant to the customer's VP. They ask it a question about their own return policy and it confidently states the wrong number — says 30 days, the real policy is 14. The room goes quiet. What do you do, right now, and then how do you debug it?"

**Clarifying questions to ask** (to yourself, out loud, framed as diagnosis).
- Is the correct answer in the knowledge base at all?
- Did retrieval fetch the right chunk and the model ignored it, or did retrieval miss it entirely?
- Is this a stale-document problem (KB has an old policy)?

**Strong answer walkthrough.**

*In the room, immediately:* acknowledge it honestly — "Good catch, that's wrong, let me show you what happened" — and turn it into a trust-building moment by inspecting the trace live. Do **not** argue with the model or hand-wave. A senior FDE treats a live hallucination as a debugging demo, not a disaster.

*The debug, in order (cheapest check first):*
1. **Is the fact in the KB?** Search the source directly. If the correct policy isn't indexed, no retrieval strategy saves you — it's a data gap. Common and mundane.
2. **Did retrieval surface it?** Log and inspect the retrieved chunks for that query. If the right chunk wasn't retrieved → retrieval problem (embedding mismatch, chunking split the number from its context, query phrasing). If it *was* retrieved and the model still answered wrong → grounding/prompt problem.
3. **Grounding failure:** the model had the right chunk but used its prior instead. Fix with a stricter system prompt ("answer only from provided context; if the context doesn't contain the answer, say so"), citations forcing it to point at the source, and lowering the model's freedom to freelance.
4. **Stale data:** KB has the old 30-day policy. Fix the pipeline freshness, not the model.

**Follow-up grilling with answers.**
- *"How do you prevent this before the next demo?"* — An eval set of the customer's real high-stakes questions with known answers, run before every demo; a "no answer without a citation" guardrail; and a confidence/abstention path so the model says "I don't have that" instead of inventing.
- *"The retrieved chunk was correct but the model still said 30. Why?"* — Likely the KB *also* contained a 30-day figure somewhere (an old doc, a different product line) and retrieval surfaced both; the model picked wrong. The real fix is de-duplicating/versioning the KB so there's one authoritative policy, plus recency metadata.
- *"Can you guarantee it won't happen again?"* — No, and I won't claim to (see Scenario 8). I can drive the rate down with grounding + eval + abstention and *measure* it on their real questions.

**What gets you rejected.** Blaming the model ("LLMs just hallucinate sometimes") without a debug plan. Panicking or getting defensive in the room. Proposing to "fine-tune it not to hallucinate" (wrong tool, months of work, doesn't fix a retrieval/data gap). Not distinguishing retrieval failure from grounding failure — that distinction is the whole answer.

---

## Scenario 3 — Cut our LLM bill by 70%

**Scenario.** "Our LLM spend is $180K/month and finance wants it down 70% without wrecking quality. Go."

**Clarifying questions to ask.**
- Where is the spend concentrated — which endpoints/features, input vs output tokens, which models?
- What's the current model on each path, and what's the quality bar (is there an eval)?
- What's the traffic shape — bursty, cacheable prefixes, latency-sensitive vs batchable?

**Strong answer walkthrough.**

You cannot cut what you haven't measured. **Step one is a cost breakdown by feature, by model, and by input/output split.** 70% almost never comes from one lever; it comes from stacking several against the right traffic.

Levers, ordered by typical impact:
1. **Prompt caching.** If you have a large stable prefix (system prompt, schema, retrieved context reused across a session) re-processed on every call, caching cuts those tokens to ~0.1×. On RAG/agent workloads this alone is often 30–50%.
2. **Model tiering.** Most traffic doesn't need Opus 4.8. Route classification/routing/simple extraction to Haiku 4.5 (`$1/$5` — 5× cheaper input than Opus), the bulk of real work to Sonnet 5 (`$3/$15`), and reserve Opus 4.8 for the genuinely hard tail. Gate the tier with a cheap classifier or a confidence check.
3. **Batch API.** Anything not user-facing-realtime (nightly enrichment, bulk extraction, eval runs) → 50% off.
4. **Prompt/output diet.** Trim bloated system prompts, cap `max_tokens` sanely, stop retrieving 20 chunks when 5 answer the question. Output tokens are the expensive side (`$25` vs `$5` on Opus) — verbose outputs cost more than verbose inputs.
5. **Cache/dedupe at the app layer.** Identical or near-identical queries served from a response cache never hit the model.

```
$180K/mo baseline
  ├─ prompt caching on stable prefixes ........ −35%
  ├─ tier bulk traffic Opus→Sonnet/Haiku ...... −25%
  ├─ batch the non-realtime jobs .............. −8%
  ├─ trim prompts / retrieval / max_tokens .... −5%
  └─ app-layer response cache ................. −3%      → ~−76%, verified by eval
```

**Every cut is gated by the eval set.** You reduce cost, then confirm quality didn't regress on the customer's real tasks. A cut that drops accuracy 8% isn't a cut, it's a bug.

**Follow-up grilling with answers.**
- *"Won't downgrading to Haiku tank quality?"* — Only if you route the wrong traffic to it. Classification and routing don't need Opus; measure per-path quality on the eval set and only downshift paths that hold their accuracy. Keep the hard paths on the strong model.
- *"How do you prove you didn't hurt quality?"* — Before/after on a held-out eval per feature. If a path regresses beyond threshold, it doesn't ship.
- *"What if caching doesn't help because prompts vary?"* — Then I restructure the prompt so the stable part comes first (schema, instructions) and the volatile part (the user's question) comes last, so a cacheable prefix exists. If nothing is stable, caching isn't the lever and I lean harder on tiering + batch.

**What gets you rejected.** Jumping to "use a cheaper model" as the whole answer without measuring where spend is or gating on quality. Not mentioning prompt caching (the single biggest free lever on repetitive workloads). Cutting cost without an eval to prove quality held — that's how you save $126K and lose the account.

---

## Scenario 4 — Build an agent that files tickets safely

**Scenario.** "We want an agent that reads incoming support emails and files Jira tickets automatically. It has write access to Jira. Design it so it can't go rogue — no duplicate tickets, no garbage, no destructive actions."

**Clarifying questions to ask.**
- What actions does it need — create only, or also update/close/reassign? (Reversibility matters.)
- What's the tolerance for a wrong ticket vs a missed ticket?
- Is there a human in the loop available, and for which actions?
- Volume? (Determines whether human approval on every action is feasible.)

**Strong answer walkthrough.**

Two principles govern safe write-capable agents: **approval gates on irreversible actions** and **idempotency so retries don't duplicate.**

1. **Scope the tools narrowly.** Don't give it a generic `bash` or a raw Jira API. Give it dedicated, typed tools: `create_ticket(summary, description, priority)`, maybe `link_duplicate(existing_id)`. A dedicated tool is one your harness can validate, gate, and log; a raw API call is opaque. (This is the "promote to a dedicated tool when you need to gate/audit" principle.)
2. **Idempotency.** Every action carries an idempotency key derived from the source (e.g. hash of the email message-ID). Before creating, check whether a ticket already exists for that key. Retries and re-processing then never duplicate. This is *the* defense against the classic "the agent looped and filed 40 copies" failure.
3. **Approval gates on the irreversible/high-blast-radius actions.** Creating a low-priority ticket might auto-execute; closing or reassigning an existing ticket, or creating a high-priority incident, routes to a human `always_ask` gate. Reversibility is the criterion: hard-to-undo → gate it.
4. **Dedup before create.** Before filing, search existing open tickets for the same issue; if a match, link/comment instead of creating.
5. **Idempotent, observable, bounded.** Cap the agent's actions per run, log every tool call with inputs/outputs for audit, and make the whole loop replayable.

```
email ──▶ agent reasons ──▶ proposes create_ticket(...)
                                 │
                                 ▼
                        idempotency check (msg-id key)  ── exists? ──▶ skip/comment
                                 │ new
                                 ▼
                        dedup search (open tickets)  ── match? ──▶ link, don't create
                                 │ none
                                 ▼
                        priority high?  ── yes ──▶ human approval gate
                                 │ no
                                 ▼
                        create ticket (logged, idempotent)
```

**Follow-up grilling with answers.**
- *"The agent processes the same email twice — what happens?"* — Nothing bad: the idempotency key (email message-ID) already maps to a created ticket, so the second attempt is a no-op. That's the whole point of the key.
- *"It filed a ticket with a garbage summary. How do you prevent that?"* — Structured output schema with validation on the ticket fields, plus a cheap quality check before create; and the human gate for anything that looks low-confidence. Garbage is a validation problem, not a model problem.
- *"How do you stop an infinite loop of actions?"* — A hard per-run action cap and a max-iteration limit on the agent loop; if it exceeds, it halts and escalates to a human rather than continuing.

**What gets you rejected.** Giving the agent broad/raw API access "for flexibility." No idempotency story — this is the single most common way write-agents cause incidents. Auto-executing irreversible actions with no gate. Not distinguishing reversible (auto-ok) from irreversible (gate) actions.

---

## Scenario 5 — Text-to-SQL for non-technical users

**Scenario.** "Business users want to ask questions in plain English and get answers from our data warehouse. 'How many enterprise customers churned last quarter?' → SQL → result. Build it, and make sure a user can't drop a table or read data they shouldn't."

**Clarifying questions to ask.**
- How big/complex is the schema — tens of tables or thousands?
- Is there row/column-level security to respect per user?
- Read-only requirement confirmed? (It should be.)
- What warehouse (dialect matters), and is there a query cost/timeout concern?

**Strong answer walkthrough.**

Three pillars: **schema RAG** (so the model knows the tables), **read-only enforcement** (so it can't do damage), and **validation** (so it doesn't run garbage).

1. **Schema RAG.** You cannot stuff a 2,000-table schema into the prompt. Retrieve the relevant tables/columns for the question — embed table+column descriptions and sample values, retrieve top-k relevant tables, and put only those in context. This is retrieval over the schema, not the data.
2. **Generate SQL with structured output**, constrained to the retrieved schema, in the correct dialect.
3. **Read-only enforcement — defense in depth, not prompt-based:**
   - The model connects through a **read-only database role/user** that physically cannot write, drop, or delete. This is the real guarantee.
   - Plus a **SQL parser/allowlist**: parse the generated query, reject anything that isn't a `SELECT`, reject DDL/DML keywords, enforce a `LIMIT`, set a statement timeout.
   - Prompt instructions to only generate SELECT are the weakest layer — necessary but never sufficient.
4. **Row/column security:** the read-only role is scoped to what the user may see (views, row-level security in the warehouse), so ACLs are enforced by the database, not the model.
5. **Validation before execution:** dry-run/EXPLAIN the query to catch errors and estimate cost; reject queries that would scan the whole warehouse; show the user the SQL and the result so they can sanity-check.

```
question ──▶ schema RAG (relevant tables/cols) ──▶ Claude generates SELECT
                                                        │
                                                        ▼
                                          SQL guard: parse, SELECT-only,
                                          LIMIT, timeout, EXPLAIN dry-run
                                                        │
                                                        ▼
                                    execute via READ-ONLY, row-scoped DB role
                                                        │
                                                        ▼
                                    result + generated SQL shown to user
```

**Follow-up grilling with answers.**
- *"The model generates `DROP TABLE`. What happens?"* — Three things fail it: the read-only role rejects it at the DB, the SQL guard rejects a non-SELECT before execution, and the prompt told it not to. It never runs. Layered.
- *"A user asks about salaries they shouldn't see."* — The read-only role is scoped with row/column security to that user's permissions, so the query physically can't return unauthorized columns. Enforced in the warehouse, not the prompt.
- *"The SQL is valid but wrong (joins the wrong table)."* — That's an accuracy problem: improve schema descriptions, add few-shot examples of correct queries, show the SQL to the user for verification, and build an eval set of question→correct-SQL pairs to measure and improve.

**What gets you rejected.** Relying on the prompt ("I'll tell it to only write SELECTs") as the security model. Not using a read-only, scoped database role — that's the actual guarantee and its absence is an instant fail. Stuffing the whole schema in the prompt at scale. No validation/EXPLAIN step before running arbitrary generated SQL against production.

---

## Scenario 6 — Does GenAI even fit this use case, or should you use classical ML?

**Scenario.** "A team wants to use an LLM to predict which customers will churn next month from 50 numerical/categorical features — usage, tenure, plan, support tickets. They're excited about GenAI. Is that the right call?"

**Clarifying questions to ask.**
- What's the input — structured tabular features, or unstructured text/docs?
- Is there labeled historical data (who actually churned)?
- What's the volume and latency need for scoring?
- Is interpretability required (regulatory, or for the retention team to act)?

**Strong answer walkthrough.**

The honest, senior answer: **for tabular churn prediction from 50 numeric features with labeled history, classical ML (gradient-boosted trees — XGBoost/LightGBM) is the right tool, not an LLM.** Saying so is the whole point of the question — the interviewer is testing whether you'll reach for the shiny tool inappropriately.

Why classical ML wins here:
- **Structured tabular data with labels** is exactly what GBMs are built for. They'll be more accurate, orders of magnitude cheaper, faster to score (millions of rows in seconds), and interpretable (feature importance the retention team can act on).
- An LLM would be slower, far more expensive per prediction, non-deterministic, and worse at reasoning over 50 correlated numeric features.

**Where GenAI *does* fit churn work:** if part of the signal is *unstructured* — the text of support tickets, sales-call notes, product reviews — an LLM can extract features (sentiment, complaint category, intent-to-cancel signals) from that text, which then feed the tabular model. The pattern is **LLM as feature extractor for the classical model**, not LLM as the predictor. That's the nuanced answer that shows range.

Decision heuristic to state:
```
Structured tabular + labels + need speed/interpretability  → classical ML
Unstructured text/images/audio, or reasoning/generation    → LLM
Both                                                        → LLM extracts features → classical ML predicts
```

**Follow-up grilling with answers.**
- *"The team really wants to use the LLM. How do you push back?"* — Frame it as outcomes, not preference: show the cost/latency/accuracy comparison on their data. Offer the hybrid (LLM mines the ticket text for features) so they get the GenAI value where it actually helps, on top of a GBM that does the prediction.
- *"When would you flip to an LLM even for tabular?"* — Cold start with no labeled data and rich descriptions, or when the customer needs natural-language explanations of each prediction — but even then I'd probably use the LLM to *explain* a GBM's output, not replace it.

**What gets you rejected.** Enthusiastically designing an LLM churn predictor because that's what was asked. Not knowing that GBMs dominate tabular prediction. Failing to identify the legitimate hybrid (LLM as feature extractor). An FDE who can't say "GenAI is the wrong tool here" isn't trusted to spend the customer's money wisely.

---

## Scenario 7 — PoC hit 95%, production dropped to 70%. Diagnose.

**Scenario.** "Our extraction PoC scored 95% accuracy on the test set. We shipped it. In production it's around 70% and the customer is unhappy. What happened?"

**Clarifying questions to ask.**
- How was the PoC test set constructed — where did those documents come from?
- Is production traffic the same distribution as the PoC data?
- What does the 70% measure — same metric, same way?
- Has anything changed (model version, prompt, upstream data)?

**Strong answer walkthrough.**

The overwhelmingly likely cause: **train/eval-serving skew — the PoC test set didn't represent production traffic.** The 95% was real on clean, curated documents; production has the messy tail the test set never sampled.

Diagnostic order:
1. **Compare distributions.** PoC set was probably a handful of clean documents from one or two sources. Production has 40 vendors, faxed scans, foreign locales, handwritten annotations, edge-case layouts. The model didn't get worse — the data got harder, and the eval never told you.
2. **Rebuild the eval set from a stratified sample of real production traffic.** Re-measure honestly. The number might genuinely be 70% on real traffic; now you have a truthful baseline.
3. **Error-analyze the failures.** Bucket them: which document types, which fields, which failure modes? The distribution of failures tells you where to invest (per-vendor handling, better validation, resolution fixes).
4. **Check for silent changes:** model/prompt version drift, upstream capture-quality changes, a preprocessing step that behaves differently at scale.

Other contributors to rule in/out: metric mismatch (PoC measured field accuracy on easy fields, production counts whole-document correctness); overfitting to the PoC set through prompt-tweaking against the same examples; and data leakage (the PoC "test" examples were also used to tune the prompt).

**Follow-up grilling with answers.**
- *"How do you prevent this next time?"* — Build the eval set from a representative, stratified sample of *real* traffic from day one, oversampling the hard tail deliberately, and hold it out from prompt tuning. Never demo an accuracy number from a set that doesn't look like production.
- *"The customer wants the 95% back."* — The 95% was never real for their traffic. I'll give them an honest per-document-type breakdown, fix the biggest failure buckets, and get the *real* number up — which is more valuable than a fictional one.

**What gets you rejected.** Assuming the model degraded (it didn't). Not immediately suspecting eval-serving skew — this is the single most common cause of "PoC great, prod bad" and a senior candidate names it in the first sentence. Proposing to "just fine-tune" without diagnosing whether the eval even reflects reality.

---

## Scenario 8 — Customer demands a zero-hallucination guarantee

**Scenario.** "The customer's legal team says they'll only sign if you guarantee the assistant will never give a wrong or made-up answer. Zero hallucinations. Can you commit to that?"

**Clarifying questions to ask.**
- What's the actual risk they're worried about — a specific class of harmful wrong answer, or a blanket fear?
- Is a "confidently abstain instead of guessing" behavior acceptable to them?
- Which questions are high-stakes vs low-stakes?

**Strong answer walkthrough.**

The correct answer is **you cannot guarantee zero hallucinations, and you say so — then you show what you *can* guarantee, which is a system that drives the rate toward zero on the questions that matter and fails safe on the rest.** Promising zero is either a lie or a misunderstanding of the technology; either way it's disqualifying to promise it.

Reframe the conversation from "guarantee" to "risk management with measurable controls":
1. **Grounding + citations.** Answers come only from retrieved source content, and every claim cites its source, so a human can verify and the model can't freelance unsupported facts.
2. **Abstention over guessing.** The system is tuned to say "I don't have a confident answer for that" rather than invent one. For legal, a truthful "I don't know" is vastly safer than a confident wrong answer — sell that.
3. **Confidence gating + human-in-the-loop on high-stakes queries.** Route the risky question classes to human review rather than auto-answering.
4. **Guardrails and validation** on structured/factual outputs (a claimed policy number is checked against the source).
5. **Measured hallucination rate on an eval set of their real questions**, reported honestly and tracked over time. You commit to a *measured, improving rate and a safe failure mode*, not a magic zero.

Framing line to use: "I won't promise zero, because anyone who does is either lying or doesn't understand the technology. What I'll commit to is: it answers only from your sources, it cites everything, it says 'I don't know' instead of guessing, high-stakes questions get human review, and I'll show you the measured accuracy on your own questions and drive it up. That's a system your legal team can actually audit."

**Follow-up grilling with answers.**
- *"So it might still be wrong sometimes?"* — Yes, and so is every human expert and every existing tool. The difference is this system is measurable, cites its sources, and abstains when unsure — which is a stronger guarantee than 'a person read it.'
- *"What if a wrong answer causes real harm?"* — That's why high-stakes classes go to human review and everything is cited/auditable. We design so that being wrong is caught, not catastrophic.

**What gets you rejected.** Saying "yes, we can guarantee zero hallucinations" — instant fail, it's technically false and legally reckless. Also failing: dismissing the concern flippantly ("hallucinations aren't a big deal"). The senior move is honest reframing to auditable controls + a safe failure mode.

---

## Scenario 9 — Invoice-processing RAG with OCR and KNN retrieval

**Scenario.** "We process invoices from thousands of vendors. We want to extract structured data, and we also want to handle new vendors by finding the most similar past invoices to guide extraction. Design it."

**Clarifying questions to ask.**
- Volume and latency — realtime per-invoice or batch backlog?
- How much layout variety across vendors, and how many are truly novel per month?
- Is there a validation source (do totals need to reconcile against a PO or ERP)?
- Human review capacity for the fail bucket?

**Strong answer walkthrough.**

Two subsystems: **structured extraction** (OCR + vision + schema) and **KNN retrieval of similar past invoices** to few-shot the extraction of unfamiliar layouts.

1. **Ingest & OCR.** For PDFs with a text layer, pass the native PDF to the model (it gets rendered pages + text, which grounds numeric transcription). For scans, OCR (Textract) provides a text layer and word boxes; feed image + OCR text together. Pure vision alone works but OCR grounding cuts numeric errors on dense tables.
2. **Structured extraction** (`claude-sonnet-5` + structured output schema) with a `low_confidence_fields` escape hatch and arithmetic validation (line items must sum to total).
3. **KNN retrieval for novel vendors.** Embed each processed invoice (by layout features / a rendered-page embedding or a text embedding of its structure). For a new invoice, retrieve the K most similar past invoices *whose extraction was verified correct*, and include them as few-shot examples in the extraction prompt. This bootstraps unfamiliar layouts from known-good neighbors.
4. **Validation & review loop.** Arithmetic + required-field + format checks in code; failures and low-confidence go to human review; corrections feed back into the verified-neighbor pool so the KNN store improves over time.

```
invoice ──▶ OCR (text+boxes) ──┐
                               ▼
              embed layout ──▶ KNN: k most-similar verified invoices
                               │
                               ▼
              Claude extract (schema) with neighbors as few-shot
                               │
                               ▼
              validate (arithmetic, format, required) ── fail ──▶ human review ──▶ back into verified pool
                               │ pass
                               ▼
                          downstream (ERP)
```

**Follow-up grilling with answers.**
- *"Why KNN few-shot instead of just a good prompt?"* — A generic prompt handles common layouts; the tail of novel vendors is where accuracy collapses. Showing the model 2–3 verified extractions of *similar* layouts anchors the field mapping far better than more instructions. It's retrieval-augmented extraction.
- *"What do you embed for the KNN?"* — Structural/visual features of the invoice (rendered-page embedding, or a text embedding of the OCR'd structure), not just the vendor name — because you want *layout* similarity, and a brand-new vendor may reuse a common template.
- *"Cost at thousands of vendors, high volume?"* — Batch the backlog (50% off), cache the schema/instructions, tier the model (Haiku for clean templated invoices, Sonnet for messy). Dominant cost is human review on the fail bucket, so invest in shrinking that bucket.

**What gets you rejected.** No validation loop (trusting extracted totals blindly). Not exploiting verified corrections to improve the KNN pool. Treating it as a single model call rather than a pipeline with retrieval + validation + review. Forgetting that the neighbors must be *verified-correct* extractions, not just similar documents.

---

## Scenario 10 — Audio-based anomaly detection for agriculture (scope it as an FDE)

**Scenario.** "A customer wants an AI system that listens to audio from their farm — livestock, machinery — and detects anomalies: a sick animal, a failing pump, a pest infestation. They want a model. How do you scope this engagement?"

**Clarifying questions to ask.**
- What audio do they have *today* — any labeled examples of the anomalies, or zero?
- What sensors/mics exist, where, connectivity (rural bandwidth)?
- What's the actual business outcome — early warning to a human, or automated action?
- What's their tolerance for false alarms vs missed events?

**Strong answer walkthrough.**

The senior FDE move here is to **resist building a model first.** The customer asked for a model; the right engagement starts with **data collection and observability**, because they almost certainly have no labeled anomaly data, and you cannot train or evaluate an anomaly detector with nothing to detect against.

Phased scoping:

**Phase 0 — Data collection & instrumentation (weeks, before any model).** Deploy the mics/sensors, build the pipeline to capture and store audio reliably from a rural environment (handle intermittent connectivity, edge buffering). You cannot model what you aren't yet recording.

**Phase 1 — Observability & labeling.** Build dashboards so domain experts (the farmers, a vet) can review captured audio and *label* events — "this is a healthy pump," "this cough means respiratory illness." This creates the labeled dataset that doesn't exist yet. Simultaneously establish a baseline of "normal" sound.

**Phase 2 — Baseline / simple detection.** Anomaly detection often starts *unsupervised*: model "normal" and flag deviations (statistical/spectral baselines, simple outlier detection on audio features). This delivers value (a crude early-warning) before any sophisticated model and validates that the signal is even present in the audio.

**Phase 3 — Model.** Only once you have labeled data and a proven signal do you train a real classifier/detector, evaluate it against the labeled set, and tune the false-alarm/miss tradeoff to the customer's tolerance.

```
Phase 0: capture + store audio (solve the rural pipeline first)
   │
Phase 1: observability + expert labeling → dataset + "normal" baseline
   │
Phase 2: unsupervised anomaly baseline → early value, validate signal exists
   │
Phase 3: supervised model, evaluated on the labeled set, tuned to FP/FN tolerance
```

**Follow-up grilling with answers.**
- *"The customer wants the model in 4 weeks."* — Then we'd be building a detector with no data to train or evaluate it — it would be theater. I'd show them that Phases 0–1 *are* the fast path to a real model, and that a crude Phase-2 baseline can give early warnings within weeks while the labeled dataset accumulates.
- *"Why observability before the model?"* — Because without captured, labeled audio there's nothing to learn from or measure against, and a model you can't evaluate is a liability. Observability is what turns their raw environment into a dataset.

**What gets you rejected.** Jumping straight to "I'd train a CNN on spectrograms" without asking whether any labeled data exists (it doesn't). Ignoring the rural data-pipeline reality (the hardest part is often just reliably capturing the audio). Not phasing the engagement — an FDE who promises a model before there's data to build one is setting up the account to fail.

---

## Scenario 11 — Back-of-envelope monthly LLM inference cost for 10,000 employees

**Scenario.** "We're rolling out an internal assistant to 10,000 employees. Give me a rough monthly inference cost. Show your reasoning."

**Clarifying questions to ask.**
- Usage assumption — how many queries per employee per day?
- Query shape — short Q&A, or long RAG with lots of context?
- Which model, and is there caching/batching?

**Strong answer walkthrough.**

The interviewer wants to see you *reason with numbers*, not recite a figure. State assumptions, compute, then name the levers.

Assumptions (state them explicitly):
- 10,000 employees × ~10 queries/day × ~22 working days ≈ **2.2M queries/month**.
- RAG-style query: ~3,000 input tokens (system + retrieved context + question) + ~500 output tokens.
- Model: `claude-sonnet-5` at `$3/1M input`, `$15/1M output`.

Compute:
- Input: 2.2M × 3,000 = 6.6B input tokens → 6,600 × $3 = **$19,800**.
- Output: 2.2M × 500 = 1.1B output tokens → 1,100 × $15 = **$16,500**.
- **Raw ≈ $36,300/month** before optimization.

Then the levers (this is where you earn the answer):
- **Prompt caching** the system prompt + any shared context: the ~2,000-token stable prefix drops to ~0.1× on cache hits. If most of the 3,000 input tokens are cacheable, input cost could fall 50–70% → input maybe ~$7–10K.
- **Model tiering:** route simple queries to Haiku 4.5 (5× cheaper input).
- Realistic optimized range: **~$15–25K/month.**

Present it as a range with assumptions, not a false-precision single number: "Roughly $35K/month unoptimized, ~$15–25K with caching and tiering, and the biggest swing factor is queries-per-employee — if it's 5/day not 10, halve it."

**Follow-up grilling with answers.**
- *"What's the biggest uncertainty?"* — Usage rate (queries/employee/day) and context size per query. Those two swing the estimate more than model choice. I'd instrument actual usage in a pilot before committing a budget.
- *"How would you cut it in half?"* — Prompt caching on the shared prefix is the biggest single lever, then tiering the easy traffic to Haiku, then trimming retrieved context.

**What gets you rejected.** Blurting a number with no assumptions. Getting the input/output price asymmetry wrong (output is 5× input on Sonnet — verbose responses dominate). Not mentioning caching/tiering as the levers. False precision ("$34,217/month") on a back-of-envelope — ranges with stated assumptions signal seniority.

---

## Scenario 12 — RBAC inside a RAG system

**Scenario.** "Design role-based access control inside a RAG assistant. Admins see everything, managers see their department, individual contributors see only their team's docs. Same assistant, different visibility."

**Clarifying questions to ask.**
- Where do roles live (identity provider, groups)? Can I resolve a user's role at query time?
- Is it role-based (a few roles) or truly per-document ACL? (Changes the data model.)
- Any documents visible to a role but redacted in part (column/field-level)?

**Strong answer walkthrough.**

Same core principle as Scenario 1 — **enforce at retrieval time, before context assembly** — but organized around roles.

1. **Tag every chunk at ingest with the roles/scopes that may see it** (e.g. `role:admin`, `dept:finance`, `team:payments`).
2. **Resolve the requester's role/scope** from the identity provider at query time.
3. **Metadata pre-filter the vector search** so only chunks matching the user's role/scope are candidates. An IC's search space is their team's docs; a manager's is their department; an admin's is everything.
4. **Never rely on the prompt** to enforce roles. The model must be physically unable to retrieve out-of-scope content.
5. **For partial/field-level redaction**, redact at retrieval (strip restricted fields before the chunk enters context) rather than hoping the model omits them.
6. **Audit log** every query with the resolving role and the docs retrieved, for compliance.

```
user ──▶ resolve role/scope (IdP groups)
              │
              ▼
       role → allowed scopes (admin=all, mgr=dept, IC=team)
              │
              ▼
       vector search pre-filtered to allowed scopes
              │
              ▼
       [field-level redaction on retrieved chunks]
              │
              ▼
       Claude answers only over in-scope content (+ audit log)
```

**Follow-up grilling with answers.**
- *"A manager moves departments — how fast does visibility update?"* — Role resolution happens live from the IdP at query time, so the role change is immediate; only the *document* tags are indexed, and those change when docs move, not when people do. So people-side changes are instant.
- *"Roles vs per-doc ACLs — when do you switch?"* — If there are a handful of coarse roles, role-tagging is simple and fast. If sharing is per-document and arbitrary, you need per-document ACLs (Scenario 1's model). I'd ask whether the real requirement is 3 roles or 10,000 sharing rules.

**What gets you rejected.** Prompt-based RBAC ("tell the model the user is an IC"). Post-filtering after retrieval. Not resolving roles from a source of truth at query time. Ignoring the audit-log requirement that any RBAC system needs for compliance.

---

## Scenario 13 — A chatbot that must intentionally give wrong/irrelevant answers (adversarial design)

**Scenario.** "Odd one: we need a chatbot for a game/training simulation that deliberately gives plausible-but-wrong or off-topic answers — to test whether *users* can spot bad information. Design it so it's convincingly wrong on purpose, controllably."

**Clarifying questions to ask.**
- Wrong how — subtly plausible-wrong, or obviously absurd? (Very different design.)
- Controllable difficulty (how detectable the errors are)?
- Must it stay safe — wrong but never harmful/offensive?
- Do you need to know *which* answers were sabotaged (ground truth for scoring the user)?

**Strong answer walkthrough.**

The interviewer is testing adversarial/inverse thinking — can you design a system whose *objective is failure*, controllably and safely? The trap is treating this like normal QA.

Design:
1. **Separate the sabotage from the model's honesty.** Don't rely on "prompt the model to lie" alone — models resist confident falsehood and it's uncontrollable. Instead, **generate a correct answer first, then transform it** into a controlled error: swap a number, substitute a related-but-wrong entity, or inject a plausible non-sequitur. This gives you a *known* wrong answer and a *known* ground truth (for scoring the user).
2. **Controllable difficulty.** Parameterize the perturbation: "subtle" = change one specific detail in an otherwise correct answer (hard to spot); "obvious" = topically off or self-contradictory (easy). The difficulty knob is the perturbation magnitude, not the model's mood.
3. **Safety rails still apply — wrong ≠ harmful.** The wrongness must be bounded to the benign domain of the exercise. Guardrails prevent it from producing wrong *and* offensive/dangerous content. "Deliberately incorrect" is not license to bypass safety.
4. **Ground-truth tracking.** Because you generated the correct answer and know the exact perturbation, you can score whether the user caught it — the whole point of the exercise.
5. **Mix in some correct answers** so users can't just assume everything is wrong.

```
question ──▶ Claude generates CORRECT answer (+ store as ground truth)
                 │
                 ▼
        perturbation engine (difficulty knob)
          ├─ subtle: swap one fact/number
          ├─ obvious: topical non-sequitur
          └─ none: pass through (some answers ARE right)
                 │
                 ▼
        safety guard (wrong-but-benign) ──▶ deliver to user
                 │
                 ▼
        log {shown_answer, ground_truth, perturbation} for scoring
```

**Follow-up grilling with answers.**
- *"Why not just prompt it to lie?"* — Uncontrollable and unreliable: you can't set difficulty, you don't have clean ground truth, and models fight confident falsehood. Generate-then-perturb gives you a labeled, tunable error.
- *"How do you keep 'wrong' from becoming 'harmful'?"* — Safety guardrails run *after* perturbation; the sabotage is constrained to swapping benign facts within the exercise's domain, never producing unsafe content.

**What gets you rejected.** Just prompting "give wrong answers" with no control or ground truth. Ignoring safety (assuming "wrong on purpose" means guardrails are off). Not realizing you need the *correct* answer stored to score the user. Missing that controllable difficulty requires a perturbation parameter, not a vibe.

---

## Scenario 14 — Detect cheating on a coding platform (outlier detection + graph DB)

**Scenario.** "Our coding-interview platform wants to catch cheating — candidates pasting solutions, collusion between candidates, using an AI to solve problems. Design a detection system."

**Clarifying questions to ask.**
- What signals do we capture — keystroke timing, paste events, submission diffs, timing, IP/device?
- Is the goal automated flagging for human review, or automated rejection? (Big difference.)
- What's the tolerance for false accusations? (Very low — accusing an honest candidate is catastrophic.)
- Do we have labeled known-cheating cases?

**Strong answer walkthrough.**

This is a multi-signal problem, and the strong design combines **outlier/anomaly detection** (individual behavior that's statistically abnormal) with a **graph database** (relationships between candidates — collusion).

1. **Behavioral outlier detection (per-candidate).** Features: keystroke dynamics (a solution typed with no pauses/edits vs organic development), paste events (large paste of a working solution), time-to-solve vs difficulty, edit patterns (does the code evolve, or appear fully-formed?). Flag statistical outliers — behavior far from the honest-candidate baseline.
2. **AI-generated-code signals.** LLM-solved submissions have tells: unusually idiomatic/complete code appearing at once, comment style, solving instantly without the incremental struggle humans show. Combine with the behavioral signals.
3. **Graph DB for collusion.** Model candidates, submissions, code fingerprints, IPs/devices as a graph. Collusion appears as *structure*: near-identical solutions (shared code fingerprint) across candidates, shared devices/IPs, submission-timing correlations, a ring of accounts linked by shared artifacts. Graph queries surface these clusters that per-candidate outlier detection misses — because collusion is a *relationship*, not an individual anomaly.
4. **Human review, never auto-reject.** Because false accusations are catastrophic, the system *flags with evidence* for a human adjudicator. It surfaces the signals (the paste event, the graph cluster, the timing) so a human decides.

```
signals: keystrokes, pastes, diffs, timing, IP/device, code fingerprint
     │
     ├──▶ per-candidate outlier detection ──▶ individual anomaly score
     │
     └──▶ graph DB (candidates↔submissions↔fingerprints↔devices)
                    │
                    ▼
             cluster/relationship queries ──▶ collusion signal
                                                   │
                    ┌──────────────────────────────┘
                    ▼
        combined evidence ──▶ HUMAN REVIEW (never auto-reject)
```

**Follow-up grilling with answers.**
- *"Why a graph DB instead of just per-candidate scoring?"* — Collusion is inherently relational: two candidates each look individually fine, but their submissions share a fingerprint and a device. That's an edge/cluster property a graph query finds and a per-row anomaly model can't.
- *"How do you avoid false accusations?"* — Never auto-reject; flag with evidence for human adjudication, require multiple corroborating signals before flagging, and tune thresholds for high precision (few false positives) over recall.
- *"Where does an LLM fit?"* — As one signal among many: assessing whether a submission looks AI-generated, or explaining/summarizing the evidence for the human reviewer — not as the sole judge.

**What gets you rejected.** A single-signal solution (just "detect paste events"). Auto-rejecting candidates (false-accusation risk is unacceptable). Missing the graph-DB insight for collusion — the interviewer named it because relational detection is the non-obvious core. Treating it as pure LLM classification rather than multi-signal outlier + graph.

---

## Scenario 15 — When to use small/local models (SLMs) for privacy

**Scenario.** "A healthcare customer wants an assistant over patient records but has a hard rule: no patient data can leave their infrastructure. Do you use a frontier API model or a small local model? Walk me through it."

**Clarifying questions to ask.**
- Is the constraint truly "no data leaves the VPC," or "no data to third parties" (a VPC-deployed managed model might satisfy the latter)?
- What's the task complexity — simple extraction/classification, or hard multi-step reasoning?
- What compute do they have on-prem/in-VPC (GPUs)?
- Is there a compliant enterprise deployment option (in-VPC/BAA)?

**Strong answer walkthrough.**

The naive answer is "privacy → local model, done." The senior answer weighs the **capability vs privacy vs cost/ops tradeoff** and checks whether the constraint really forces local inference.

1. **First, challenge the constraint.** "No data leaves our infra" sometimes means "no data to an uncontrolled third party." Many frontier models are available under enterprise agreements with zero-data-retention and in-VPC / private deployment (e.g. via a cloud provider's Claude offering inside the customer's own account). If a compliant private deployment satisfies their legal requirement, you get frontier capability *and* privacy — often the best outcome. Establish this before defaulting to a weaker local model.

2. **If truly air-gapped (data physically cannot reach any external endpoint):** then a **small/local model (SLM)** running on the customer's hardware is the answer, and you accept the tradeoff:
   - **Pro:** data never leaves; full control; no per-token cost.
   - **Con:** SLMs are meaningfully less capable than frontier models on hard reasoning; you own the ops (GPU provisioning, serving, updates); quality ceiling is lower.

3. **Match model to task.** Much healthcare work is *extraction/classification/summarization* over records — tasks a well-chosen SLM handles acceptably. Reserve the "we need a frontier model" argument for genuinely hard reasoning. Often the right design is **SLM for the bulk on-prem work, with the hard tail escalated to a compliant private frontier deployment** if one is permitted.

4. **Hybrid / redaction pattern.** Sometimes you can de-identify data locally (strip PHI with a local model or rules) and only send de-identified content to a stronger model — getting capability where it's safe. Whether this satisfies the customer's legal team is *their* call, not yours to assume.

```
"no data leaves infra"
        │
        ▼
Is a compliant in-VPC / ZDR frontier deployment allowed?
   ├─ yes ──▶ private frontier model (best capability + privacy)
   └─ no (true air-gap)
                │
                ▼
        SLM on customer hardware
                │
        task hard AND escalation allowed?
           ├─ yes ──▶ local de-identify → private frontier for the tail
           └─ no  ──▶ SLM handles it, accept the capability ceiling
```

**Follow-up grilling with answers.**
- *"Why not always use the local model then?"* — Because SLMs have a real capability gap on hard reasoning, and you inherit all the serving/ops burden. If a compliant private frontier deployment is legally acceptable, it's usually the better outcome — don't accept a weaker model when the constraint doesn't actually require it.
- *"How do you decide SLM is good enough?"* — Eval on the customer's real tasks. If the SLM hits the quality bar on their extraction/classification workload, ship it; if it fails the hard tail, design an escalation path or push for a compliant private deployment.
- *"What's the risk of the redaction/hybrid approach?"* — Imperfect de-identification could leak PHI, and whether it satisfies the law is the customer's compliance call. I'd never assume redaction is sufficient — I'd make it their explicit, documented decision.

**What gets you rejected.** Reflexively answering "privacy = local model" without checking whether a compliant private frontier deployment satisfies the requirement. Ignoring the capability gap (promising frontier-quality from a small local model). Ignoring the ops burden of self-hosting. Assuming a redaction/hybrid approach is legally sufficient without making it the customer's documented decision — in healthcare, that assumption is how you cause a breach.

---

## Cross-scenario patterns (the rubric interviewers actually score)

Across all 15, the same senior behaviors separate a pass from a reject:

1. **Ask before you architect.** Every strong answer opens with clarifying questions. Candidates who design before understanding lose regardless of technical depth.
2. **Simplest thing that works, then justify complexity.** Reach for classical ML when it fits (Scenario 6); don't over-engineer.
3. **Security and permissions are enforced in code/infra, never in the prompt** (Scenarios 1, 5, 12). Prompt-based security is an automatic fail.
4. **Idempotency and approval gates for write-capable agents** (Scenario 4).
5. **Everything is measured on an eval set built from real traffic** (Scenarios 3, 7, 9, 17-style). "PoC 95% / prod 70%" is always eval-serving skew until proven otherwise.
6. **Fail safe: abstain over guess, human review on high-stakes, never auto-reject people** (Scenarios 8, 13, 14).
7. **Honesty about limits builds trust; false guarantees lose accounts** (Scenario 8).
8. **Phase the engagement — data and observability before models** when the data doesn't exist yet (Scenario 10).
9. **Reason with numbers, state assumptions, give ranges** (Scenario 11).
10. **Know the cost levers cold: prompt caching, model tiering, batch API** (Scenarios 3, 11) — and that output tokens cost ~5× input.

The FDE is hired to make the customer's risky AI problem *boringly reliable*. Every answer above is a variation on that theme: de-risk it, measure it, fail it safely, and be honest about what it can't do.
