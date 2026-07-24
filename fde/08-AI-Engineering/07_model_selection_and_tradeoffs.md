# Model Selection & Tradeoffs — Senior/Staff FDE Prep

> Level: Senior/Staff | Module: AI Engineering | Context: How to pick the right model for a customer's problem, and what breaks when you pick wrong.

When an FDE walks into a customer architecture review, the first whiteboard box everyone stares at is "which model?" The answer determines latency (10ms or 3s?), cost ($0.0005 or $0.05 per call?), capability (can it handle multi-turn reasoning, code, or images?), and compliance (does it need to stay on-prem?). This file is the decision tree an FDE uses when they have 90 seconds to defend a model choice.

---

## The Frontier Model Landscape (as of 2026)

| Model | Capability | Latency | Cost | Best for | Not for |
|---|---|---|---|---|---|
| **Haiku 4.5** | Fast reasoning, classification, extraction | 200–500ms | $0.0008 input / $0.004 output | Routing, pre-processing, simple QA, per-request tasks | Long-horizon reasoning, coding, complex planning |
| **Sonnet 5** | Balanced: reasoning + speed | 1–2s | $0.003 input / $0.015 output | General purpose, support copilots, multi-turn chat | Ultra-low-latency APIs, high-volume classification |
| **Opus 4.8** | Deep reasoning, multi-step planning | 3–5s | $0.015 input / $0.075 output | Agent loops, complex workflows, code generation, R&D | Any high-volume, latency-critical path |
| **Fable 5** | Optimized for coding + reasoning | 2–3s | ~Sonnet pricing | Software engineering tasks, code review, migration | Non-technical tasks |

**The hierarchy is real:** Haiku < Sonnet < Opus. Each step up trades latency for capability. Fable is orthogonal (specialized for code).

---

## Q1. Walk me through the decision framework for model selection in a specific customer scenario.

**Answer:**

**Scenario:** A customer wants to deflect support tickets. Volume is 50K/month. Tickets average 200 tokens. Latency SLA is 3s (customers waiting in chat). Budget is $5K/month compute.

**Step 1: Latency viability.**
- Haiku: 200–500ms → 3s SLA easily met ✓
- Sonnet: 1–2s → ✓ (likely within SLA)
- Opus: 3–5s → at the edge, might violate SLA under load

Opus is *likely* out based on latency alone.

**Step 2: Capability assessment.**
- Task: classify intent, retrieve from KB, draft response. Single-turn (no multi-step reasoning).
- Haiku: can do routing/classification in 200ms, but would struggle with multi-turn reasoning or complex KB retrieval. For this task, sufficient.
- Sonnet: definitely sufficient; more headroom for edge cases.

Both Haiku and Sonnet are capable. Opus is overkill.

**Step 3: Cost envelope.**
- Haiku: 50K calls/mo × 200 tokens/call × $0.0008/1K ≈ $8/month (input) + $0.004 (output) ≈ **$9/month**.
- Sonnet: 50K × 200 × $0.003 ≈ $30/mo + $0.015 (output) ≈ **$75/month**.
- Opus: 50K × 200 × $0.015 ≈ **$150/month**.

Budget is $5K/month, so all three are viable on cost. Haiku is 15× cheaper than Sonnet on this load.

**Step 4: Confidence vs cost tradeoff.**
- Will Haiku confidently get the intent right 90% of the time? Probably yes for support tickets (they're usually pretty clear).
- If it gets uncertain, does the architecture escalate cleanly? Yes — low-confidence calls go to Sonnet or a human.

**Decision:** Haiku for the hot path (classify, route, draft), Sonnet for escalations. Two-model architecture.

**Cost after routing:** assume 80% Haiku (40K calls) + 20% Sonnet (10K calls):
- Haiku: 40K × 200 × $0.0008 ≈ $6.40/mo
- Sonnet: 10K × 200 × $0.003 ≈ $6/mo
- **Total ≈ $12/month** → way under budget.

---

## Q2. What's the relationship between model capability and observability requirements?

**Answer:**

Higher-capability models have *less transparent failure modes*. A Haiku that refuses an input (token limits, guardrails) fails loud and clear. An Opus that attempts a 50-step agent workflow and gets lost in step 23 is a silent failure — the output *looks* plausible but is wrong.

**Observability pyramid by model:**

```
                    OPUS: complex reasoning
                    • Output semantics hard to verify
                    • Multi-step failures are hidden
                    • Need: detailed step logs, comparison vs expected
                    
              SONNET: balanced
              • Most outputs are human-auditable
              • Need: spot-check QA, confidence scoring
              
        HAIKU: fast classification
        • Output is boolean or categorical
        • Need: correctness rate on test set
        
    SIMPLE HEURISTICS / NO MODEL
    • Need: only business metrics
```

**Practical mapping:**

- **Haiku in production:** Monitor correctness rate on a held-out test set; alert if it drops >5%. Cost of a false negative is low (escalates), so FN rate matters more than FP rate.
- **Sonnet in production:** Per-category correctness (support tickets have different error rates by topic), latency percentiles, cost per successful deflection. Spot-check outputs.
- **Opus in production:** Full step-by-step logging of the agent loop, comparison against a gold-standard workflow (did it call the tools in the right order?), approval-acceptance rate (what % of human reviewers accept the plan?).

The interview insight: **capability → complexity → observability burden.** Choosing Opus means committing to logging and monitoring infrastructure that Haiku doesn't need.

---

## Q3. Describe model cascading and when it's worth the complexity.

**Answer:**

**Model cascading:** route requests through a sequence of models, starting with the cheapest/fastest, escalating only when confidence is low.

```
User request
    │
    ▼
┌─────────────────┐
│ Haiku (fast)    │  confidence >0.9? ✓ send response
└────────┬────────┘                    ✗ escalate
         │
         ▼
┌─────────────────┐
│ Sonnet (medium) │  confidence >0.85? ✓ send response
└────────┬────────┘                     ✗ escalate
         │
         ▼
┌─────────────────┐
│ Opus (thorough) │  confidence >0.7?  ✓ send response
└────────┬────────┘                     ✗ escalate to human
         │
         ▼
    Escalation queue
```

**When it's worth it:**

The ROI is **cost reduction × escalation rate**. If 95% of requests can be answered by Haiku at $0.001/request, and Sonnet costs $0.02, you save $0.019 per request. If escalation rate is 5%, the average cost per request is still dominated by the 95% that Haiku handled cheaply.

Math: suppose 100K requests/month.
- All Sonnet: 100K × $0.02 = $2K/mo.
- Cascaded (95% Haiku, 5% Sonnet): (95K × $0.001) + (5K × $0.02) = $95 + $100 = **$195/mo** → 10× cheaper.

**When it's not worth it:**

If escalation rate is 50% or higher, cascading adds latency (user waits for Haiku → Sonnet round-trip) with minimal cost savings (half the requests hit Sonnet anyway). Better to just use Sonnet directly.

Also: cascading adds operational complexity. You need:
- A confidence-scoring mechanism per model (not always built-in).
- Handling divergent outputs (Haiku says "X", Sonnet says "Y" — which do you trust?).
- Testing that the cascade is actually monotonically improving (Sonnet should get more right than Haiku, not just take longer).

**Production example:** a customer's documentation search deflects 85% of queries with Haiku (high confidence on simple lookups). 15% escalate to Sonnet (complex multi-doc synthesis). Cost is $0.0008/request average. If they used Sonnet for everything, it's $0.01/request — 12× higher. Cascade paid for itself in week one.

**Interview trap:** "We'll cascade for better quality." Cascading *saves money*, it doesn't reliably improve quality across the board (both models hallucinate; different models hallucinate differently). If quality is the goal, use the best single model and add human review as the safety net.

---

## Q4. Model vs capability: can a smaller model do this task with better prompting?

**Answer:**

The honest answer: **sometimes, yes; often, no.**

**Cases where prompting can't substitute for model size:**

1. **Long-horizon reasoning.** Haiku struggles with 5+ step reasoning chains even with perfect prompts. Opus handles it naturally. Prompt engineering can't fix this — it's a fundamental capability gap.
2. **Unreliable tool use.** Haiku's tool-calling accuracy on complex schemas is lower than Sonnet/Opus. Better prompts help, but the ceiling is lower.
3. **Code generation.** On novel algorithms, Opus > Sonnet > Haiku, and this gap doesn't close with prompts.
4. **Nuanced language understanding.** Sarcasm, implied intent, cultural context — Opus gets more of these right, and prompting helps only at the margins.

**Cases where prompting can substitute:**

1. **Deterministic classification.** "Is this email spam or legitimate?" With a few examples, Haiku matches Sonnet.
2. **Template-based generation.** "Write an email following this template" — Haiku does this fine with the template in context.
3. **Retrieval from context.** "Answer based only on this document" — Haiku and Sonnet are similar; Opus is overkill.
4. **Single-turn Q&A where the answer is in the context.** RAG scenarios where the LLM is just a summarizer.

**The empirical test:** build a test set for your task (30–50 examples). Run Haiku with your best prompt, then Sonnet with the same prompt. If Haiku's accuracy is 85%+ of Sonnet's, prompting can probably substitute (and you save 15×). If it's 60%, model size is the constraint, not prompting.

**Production war story:** A customer's invoice classification task had Haiku at 78% accuracy, Sonnet at 95%. They hired a prompt engineer who got Haiku to 82% with chain-of-thought. Still too low for production; they switched to Sonnet. The lesson: prompt engineering has diminishing returns. Don't spend two weeks on prompts when the model ceiling is the issue.

---

## Q5. What should an FDE recommend for a customer who says "we want to fine-tune a model"?

**Answer:**

Fine-tuning is seductive because it feels like a solution: "Our data is special, so we fine-tune." But for 90% of real customer problems, fine-tuning is *misdirected work*.

**When fine-tuning makes sense:**

1. **Domain-specific format that the base model doesn't understand.** Example: a customer has a proprietary financial notation that GPT doesn't know. Fine-tuning teaches it. (Real example: a fintech customer fine-tuned on their internal transaction format.)
2. **Consistent style/voice needed.** A support bot that must sound exactly like the company's voice, not generic. Fine-tuning on past transcripts can enforce this. (Marginal gains; prompt engineering often works too.)
3. **Cost reduction at massive scale.** If you're running 10M requests/month and a 10% error-rate reduction is worth $50K/mo, fine-tuning for that reduction might break even on training costs. (Rare at customer scale; usually not worth it.)

**When to recommend *against* fine-tuning:**

1. **You haven't tried few-shot prompting yet.** Example: "Our classification accuracy is 70%." Response: "Show me your prompt. Do you have examples in-context?" 80% of the time, adding examples gets you to 85%+. No fine-tuning needed.
2. **Your data is noisy or small.** <100 examples: fine-tuning will overfit. >10K examples: fine-tuning might help, but by then you've invested heavily. The curve is ugly.
3. **You need to iterate the task.** Fine-tuning takes hours or days. A prompt change takes seconds. For an ongoing engagement, you can't iterate on a fine-tuned model; you're stuck with what you trained.
4. **Compliance requires audit trails.** Fine-tuning bakes examples into weights; you can't audit what the model learned. For regulated domains, RAG with citations is safer.

**The FDE reframe:** "Fine-tuning is a *last resort*, not a *first move*. We'll (1) optimize the prompt with few-shot examples, (2) try cascading to a better base model, (3) add retrieval (RAG), and only then discuss fine-tuning if all three don't solve it. Most customers don't get to step 3."

**Cost/benefit comparison:**

```
Few-shot prompting:
  Cost: 2 hours engineering
  Accuracy improvement: +5–15%
  Latency: no change
  Iteration: instant

Fine-tuning (small):
  Cost: $2K–5K (training) + ongoing inference cost
  Accuracy improvement: +3–8% (often overstated)
  Latency: usually no change (still calls the same endpoint)
  Iteration: 4 hours between experiments

Cascading to Sonnet:
  Cost: +5× per call, but routes accurately
  Accuracy improvement: +10–20%
  Latency: +1s
  Iteration: instant (just change the prompt)
```

**The honest pitch for cascading over fine-tuning:** "Sonnet costs more per call, but we route 80% of traffic through Haiku. Your average cost is still lower than fine-tuning, and you get better accuracy without the maintenance burden."

---

## Q6. Explain the hidden costs of model upgrades and why customers get blindsided.

**Answer:**

A customer ships a system with Sonnet 4.0. Six months later, Sonnet 5 ships. They see "better reasoning," get excited, and upgrade. Two weeks later, their whole system starts failing silently.

**Why:**

1. **Token cost drops → budget assumptions break.** Sonnet 5 is cheaper per token. A customer using prompt caching at Sonnet 4 pricing now over-caches, blowing up the cache overhead. Or they start making larger requests "because it's cheaper." Cache-hit rates drop.

2. **Latency changes → SLAs are violated.** Sonnet 4 was 2s average; Sonnet 5 is sometimes 2.5s (more complex models have higher variance). An SLA that was "p95 < 3s" is now regularly violated at p99.

3. **Output quality is different, not always better.** Sonnet 5 is more careful, which can mean refusals on edge cases that Sonnet 4 answered (even if sometimes wrong). Customers see deflection rate increase. Or Sonnet 5's reasoning leads it down a different path than expected, and downstream code that assumed Sonnet 4's outputs breaks.

4. **Prompt assumptions drift.** A prompt that worked with Sonnet 4 might not work as well with Sonnet 5 (or vice versa). The model read the prompt *differently* — possibly better, possibly worse. Customer's test suite was built on Sonnet 4 expectations and now fails.

5. **Token accounting breaks.** Sonnet 5 might encode the same text as fewer tokens (or more) due to tokenizer changes. A customer's cost model is off, and their predictions become unreliable.

**How to avoid the blindside:**

1. **A/B test before upgrade.** Route 5% of traffic to Sonnet 5, measure: latency, cost, accuracy, refusal rate. If any metric regresses >5%, don't upgrade.
2. **Budget for re-tuning.** Assume 1–2 weeks of prompt tweaking after any model upgrade. Document what changed and why.
3. **Monitor the upgrade window.** For 48 hours after upgrade, alert on latency p99, cost-per-request, and error rate. Early signal = early rollback.
4. **Version your prompts.** `CLAUDE_MODEL_VERSION=sonnet-5`, and keep the old prompt in version control. If Sonnet 5 breaks something, rollback is one env var.

**Production war story:** A customer upgraded from Haiku to Sonnet in their support copilot, expecting better deflection. They hit cache limits ($50K/mo) and had to throttle back request volume to manage costs. Then they realized Sonnet was *more* cautious and actually had *lower* deflection rates on edge cases. Outcome: they should have cascaded (Haiku → Sonnet only on escalation), not replaced. The lesson: model upgrades need planning, not just a version bump.

**Interview insight:** An FDE's job includes managing *model risk*. You're not just optimizing for capability today — you're designing systems that survive model changes gracefully.

---

## Q7. When should you use multiple models in parallel (ensemble) vs. cascade vs. a single best model?

**Answer:**

```
ENSEMBLE (run all, vote):
  Input → [Haiku, Sonnet, Opus] → vote → output

CASCADE (run in sequence):
  Input → Haiku (confident? done) → Sonnet (confident? done) → Opus (done)

SINGLE:
  Input → Sonnet → output
```

**Ensemble:**
- *Pros:* if the models disagree on 10% of cases, an ensemble catches some (voting gives you a confidence signal).
- *Cons:* runs all models → 3× latency, 3× cost. Only makes sense if disagreement is expensive (fraud detection: false negative costs $10K).
- *Real use:* rare. Most ensembles are overkill.

**Cascade:**
- *Pros:* low average cost, reasonable latency, handles confidence well.
- *Cons:* adds complexity (need confidence scoring, divergence handling).
- *Real use:* common in support/triage. Workloads where volume is high and 10–20% escalation is acceptable.

**Single best model:**
- *Pros:* simple, predictable cost/latency, easy to debug.
- *Cons:* no fallback if the model is wrong.
- *Real use:* when capability is enough and latency is tight. Sonnet for most general tasks.

**Decision tree:**

- Is latency <500ms required? → Single model (Haiku or Sonnet depending on capability).
- Is cost critical (>1M requests/mo)? → Cascade (Haiku → Sonnet).
- Is correctness critical and disagreement is expensive? → Ensemble (rare; usually just use the best single model + human review).
- Is the task so hard that no single model is confident? → Ensemble, or accept escalation (hand to human).

**Cost comparison (1M requests/mo):**

- Single Sonnet: 1M × $0.003 (input) + $0.015 (output) ≈ $18K/mo.
- Cascade (90% Haiku, 10% Sonnet): (900K × $0.001) + (100K × $0.015) ≈ $1.9K/mo → **9.5× cheaper**.
- Ensemble (Haiku + Sonnet): (1M × $0.001) + (1M × $0.015) ≈ $16K/mo (almost as expensive as single Sonnet, with more latency).

Ensemble rarely makes financial sense.

---

## Q8. Token economics: how do prompt caching, batch APIs, and request size interact with model costs?

**Answer:**

Three levers control your token bill:

1. **Prompt caching:** repeated requests with the same system prompt and shared context are charged only once. Claude caches at 5-minute windows and 1K-token granularity.

   Example: support bot with a 10K-token KB (policies, FAQs). Each request:
   - Without cache: 10K (KB) + 500 (query) + 200 (output) = 10.7K tokens = $0.16 (at Sonnet rates).
   - With cache: 10K cached (charged once per 5 min) + 500 (query) + 200 (output) = $0.0075 per request after cache hits.
   
   At 10 requests in a 5-min window: (1 × $0.16) + (9 × $0.0075) ≈ **$0.23 for 10 requests** vs $1.60 without cache → **7× cheaper**.

2. **Batch API:** requests queued and processed during off-peak (cheaper rate, ~50% off), 24-hour latency. No caching, slower billing.

   Example: overnight analysis of 10K support tickets. Batch API: 10K × $0.001 (haiku inference, batched) ≈ $10. On-demand: 10K × $0.003 ≈ $30. Savings: $20, but must wait 24 hours.

3. **Request size:** every token is a token. Larger context = higher cost.

   Example: RAG with different retrieval sizes:
   - Top-3 chunks (1.5K): 1.5K + query + output ≈ 2.5K tokens ≈ $0.04 at Sonnet.
   - Top-30 chunks (15K): 15K + query + output ≈ 15.5K tokens ≈ $0.20 at Sonnet → 5× more expensive.

**The FDE playbook:**

- **High-volume, repetitive workloads:** prompt caching is a must. Cache your system prompt and static context (policies, KB) and only pass the variable query.
- **Batch work:** use batch API for any off-peak processing (overnight analysis, scheduled summaries, historical audits).
- **Retrieval optimization:** every chunk you retrieve is a cost. Use a reranker (cheap) to cut top-50 down to top-5 before sending to the LLM. Saves 45K tokens per request.
- **Context windows:** know your model's context window and the effective cost-per-token if you're near the limit. Opus's 200K window enables complex workflows but is pricier.

**Cost per 1K tokens (approximate, subject to change):**

| Model | Input | Output | With cache |
|---|---|---|---|
| Haiku | $0.0008 | $0.004 | $0.0001 (cached portion) |
| Sonnet | $0.003 | $0.015 | $0.0003 (cached portion) |
| Opus | $0.015 | $0.075 | $0.0015 (cached portion) |

A cached Sonnet request is 10× cheaper than an uncached one.

---

## Quick-Reference: Model Decision Checklist

| Question | Haiku | Sonnet | Opus |
|---|---|---|---|
| Can it do the task? | Classification, routing, QA | General purpose, multi-turn | Long-horizon reasoning, code |
| What's the latency? | <500ms | 1–2s | 3–5s |
| Per-request cost? | $0.001–0.005 | $0.015–0.03 | $0.075–0.15 |
| Confidence scoring? | Simple (entropy) | Moderate (self-check) | Complex (step-by-step) |
| Cascade target? | ✓ (start here) | ✓ (escalation) | ✗ (end of chain) |
| Good for 1M+/mo? | Yes (low cost) | Yes (cascaded) | No (too expensive) |
| Fine-tuning needed? | Only with very poor accuracy | Try few-shot first | Only for novel domains |

