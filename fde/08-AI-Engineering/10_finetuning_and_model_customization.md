# Fine-Tuning and Model Customization - Senior Interview Deep Dive

The most senior answer to "should we fine-tune?" is usually **no** — and knowing exactly *why*, and the narrow cases where the answer flips to *yes*, is what separates an FDE from someone who read a fine-tuning tutorial. This file covers the honest decision framework (fine-tune vs RAG vs prompt), the mechanics you're expected to reason about (SFT, LoRA/QLoRA, DPO/RLHF, distillation), the part nobody glamorizes but that actually determines success (data curation), how to evaluate a fine-tune, catastrophic forgetting, the frequently-higher-ROI move of fine-tuning the *embedding* model instead, and hosting economics.

Assume you know what gradient descent and transformers are. This is about *decisions and money*, not backprop.

---

### Q1. Give the honest decision table: fine-tune vs RAG vs prompt engineering. When does each actually win?

**Answer:**

The three are not competitors on one axis — they solve **different problems**. Confusing them is the most common mistake.

```
Technique          Changes...              Best for
-----------------  ----------------------  ------------------------------------
Prompt engineering  the instruction        behavior you can describe in words
RAG                 the knowledge           facts the model doesn't/can't know
Fine-tuning         the weights (skill)     behavior/format hard to describe,
                                            or consistency at scale
```

The decisive question for each:

```
Do you need the model to KNOW something new (facts, docs, current data)?
   → RAG.  Fine-tuning does NOT reliably teach facts, and can't stay fresh.

Can you get the behavior by TELLING the model what to do (instructions, examples)?
   → Prompt engineering / few-shot.  Try this first, always.

Do you need a SKILL or STYLE that's hard to specify, needed consistently,
at high volume, where prompt tokens are too expensive or too unreliable?
   → Fine-tuning (maybe).  This is the narrow slice.
```

Honest decision table with the real tradeoffs:

```
Factor              Prompt        RAG           Fine-tune
------------------  ------------  ------------  ------------------------
Time to ship        hours         days          weeks
Upfront cost        ~$0           low-med       high (data + training)
Teaches new facts   no (context)  yes           no (unreliable)
Stays fresh         yes (context) yes (reindex) no (retrain)
Consistent format   medium        medium        high
Reduces tokens/cost no (adds)     no (adds)     yes (shorter prompts)
Latency             baseline      +retrieval    baseline or better
Reversible          instantly     easily        retrain to change
Needs labeled data  no            no            yes (100s-1000s)
```

**When fine-tuning genuinely wins:**
1. **Consistent structured output** at scale where prompting is flaky (e.g., always emit this exact JSON dialect / classification schema).
2. **Style/tone** that's hard to describe but easy to demonstrate with examples.
3. **Latency/cost at high volume** — bake the behavior into weights so you drop a 2,000-token few-shot prompt down to 50 tokens, saving on every one of millions of calls.
4. **A narrow, well-defined task** where a small fine-tuned model matches a big general model at 10x lower cost (distillation, Q10).

**Interview trap:** "We'll fine-tune the model on our documentation so it knows our product." This is the single most common wrong instinct. Fine-tuning on docs does **not** reliably make the model *retrieve* those facts — it adjusts style and can even induce confident hallucination of half-learned facts. Knowledge belongs in **RAG**, where it's retrievable, citable, and updatable. Fine-tuning changes *how* the model behaves, not *what it knows*.

---

### Q2. Walk through the FDE answer to "should we fine-tune?" Why is it usually no?

**Answer:**

Usually no, for a stack of compounding reasons:

1. **The premise is usually a knowledge problem in disguise** (Q1) — and knowledge problems are RAG problems.
2. **Prompting + few-shot gets you 80-95% of the way** for far less effort, and frontier models keep getting better at following instructions, eroding fine-tuning's edge every release.
3. **The data doesn't exist yet.** Fine-tuning needs hundreds to thousands of *high-quality, correctly-formatted, deduplicated* labeled examples. Teams wildly underestimate that this is the real project (Q8) — weeks of data work before a single training run.
4. **It's a maintenance liability.** A fine-tuned model is frozen. The base model improves; yours doesn't unless you retrain. Requirements change; you retrain. It's a permanent tax.
5. **It's often a false economy.** People fine-tune to "save money" then discover training + hosting + the data pipeline + eval + retraining cadence costs more than they'd ever save, unless volume is genuinely huge.
6. **Reversibility and iteration speed.** A prompt change ships in seconds; a fine-tune is a multi-day loop. Early in a product you want to iterate fast, and fine-tuning freezes you.

The disciplined progression an FDE actually recommends:

```
1. Prompt engineering + few-shot        ← start here, always
2. + RAG if it needs external knowledge
3. + a better/bigger model if quality-bound
4. + tool use / agentic structure if it needs actions
5. + prompt caching / routing if cost/latency-bound
   ────────────────────────────────────────────────
6. Fine-tune ONLY IF: 1-5 are exhausted, you have a
   narrow well-defined task, you have (or can build)
   the data, and the volume justifies the fixed cost.
```

**When the answer flips to yes:** high-volume narrow task + prompting proven insufficient + data available + the cost math closes (Q11). That's a real and valuable case — it's just the minority of times someone asks.

**Production war story:** a client insisted on fine-tuning for a support-reply assistant "to sound like us and know our policies." We first shipped RAG over their help center + a strong system prompt with 6 style examples. It hit their quality bar in a week. The fine-tune they'd budgeted two months for was never needed — and would have been *worse*, because policies changed monthly and a fine-tune would have baked in stale ones. The FDE value was talking them **out** of the expensive path.

---

### Q3. Explain SFT (supervised fine-tuning) mechanically. What are you actually optimizing, and what data shape does it need?

**Answer:**

Supervised fine-tuning continues training a pretrained model on **labeled input→output pairs**, minimizing next-token cross-entropy loss on the *target output* tokens. You're nudging the weights so that, given inputs like yours, the model's most-probable continuation matches your desired outputs. It's the same training objective as pretraining, just on your curated, task-specific dataset.

Data shape is prompt/completion (or messages) pairs:

```jsonc
// Each line is one training example (JSONL).
{"messages": [
  {"role": "system", "content": "You extract structured order data."},
  {"role": "user", "content": "2x widget, ship to 5 Main St, rush"},
  {"role": "assistant", "content": "{\"items\":[{\"sku\":\"widget\",\"qty\":2}],\"address\":\"5 Main St\",\"shipping\":\"rush\"}"}
]}
```

What matters mechanically:

1. **Loss is computed on the completion, not the prompt** (typically). The model learns to *produce* the assistant turn, not to reproduce the user turn.
2. **The examples teach a distribution, not lookup.** 500 examples of "extract orders" teach the *skill* of extraction in your format — not the specific orders. This is why SFT is great for format/skill and bad for facts.
3. **Format consistency is everything.** If your examples are inconsistent (some JSON, some prose), the model learns inconsistency. The training data *is* the specification.
4. **You need enough coverage** of the input variety the model will see in production — including edge cases, or it won't handle them.

Rough data-volume intuition (task-dependent):

```
Task difficulty          Examples (order of magnitude)
-----------------------  ------------------------------
Simple format/classify   50-500
Moderate skill/style     500-5,000
Complex / broad domain    5,000-50,000+
```

**Interview trap:** thinking more data always helps. 200 clean, correct, diverse, consistently-formatted examples beat 5,000 noisy ones every time. Noisy labels don't average out — the model faithfully learns your mistakes (Q8).

---

### Q4. Explain LoRA and QLoRA intuitively. Why are they the default instead of full fine-tuning, and what's the cost difference?

**Answer:**

**Full fine-tuning** updates *all* the model's weights — billions of parameters. That needs enormous GPU memory (you hold the model, gradients, and optimizer states for every parameter) and produces a full-size model copy per fine-tune. Impractical and expensive for most teams.

**LoRA (Low-Rank Adaptation)** freezes the original weights and injects small trainable "adapter" matrices alongside them. The insight: the *change* needed to adapt a model to a task is low-rank — it lives in a tiny subspace — so instead of learning a full ΔW (huge), you learn ΔW ≈ B·A where A and B are skinny matrices (tiny). You train only A and B.

```
Full fine-tune:   W_new = W_updated             (train all of W — billions of params)
LoRA:             W_eff = W_frozen + B·A          (train only B, A — ~0.1-1% of params)

   W is d×d.  B is d×r, A is r×d, with rank r small (e.g. 8, 16, 64).
   Params trained: 2·d·r  <<  d·d
```

**QLoRA** goes further: it **quantizes the frozen base model to 4-bit** (shrinking its memory footprint ~4x) and trains LoRA adapters on top of the quantized base, using clever tricks to keep quality. This is what lets you fine-tune a large model on a *single* consumer/prosumer GPU.

Why they're the default:

```
Dimension          Full FT        LoRA          QLoRA
-----------------  -------------  ------------  ------------------
Trainable params   100%           ~0.1-1%       ~0.1-1%
GPU memory         very high      high          low (fits 1 GPU)
Training cost      $$$$           $$            $
Output artifact    full model     small adapter small adapter
Quality            ceiling        ~matches FT   slightly below LoRA
Swappable          no             yes (adapters)yes
Multiple tasks     N full copies  N tiny adapters, one base
```

The **adapter-swapping** benefit is underrated: one base model + many small task adapters, hot-swapped, instead of N full model copies. Adapters are megabytes, not gigabytes.

**Cost intuition:** full fine-tuning a large model can mean many GPUs for many hours ($1,000s per run). QLoRA on the same model can be a single GPU for a few hours (tens of dollars). For most FDE fine-tuning tasks, **QLoRA is the pragmatic default** — near-full-FT quality at a fraction of the cost and hardware. Note: with managed fine-tuning (Bedrock, OpenAI, etc.) the provider picks the method; you mostly reason about LoRA/QLoRA when self-hosting open-weight models.

---

### Q5. What is preference tuning? Give the RLHF vs DPO overview and when a team would actually use either.

**Answer:**

SFT teaches the model to imitate good outputs. **Preference tuning** teaches it which of two outputs is *better* — capturing subtle quality judgments (helpfulness, tone, safety, "don't be sycophantic") that are hard to express as single target outputs. It's how base models become the polished assistants you actually use.

**RLHF (Reinforcement Learning from Human Feedback):**

```
1. Collect preference data: for prompt p, humans rank output A vs B.
2. Train a REWARD MODEL to predict which output humans prefer.
3. Use RL (PPO) to update the LLM to maximize the reward model's score,
   with a KL penalty keeping it close to the SFT model (so it doesn't
   collapse into reward-hacking gibberish).
```

RLHF is powerful but **operationally brutal**: you're training and balancing multiple models (policy, reward, reference), RL is unstable, and it's easy to reward-hack. It's mostly the domain of labs building foundation models.

**DPO (Direct Preference Optimization):**

```
Skip the separate reward model and RL loop entirely.
DPO reframes preference learning as a single classification-style loss
directly on (prompt, preferred, rejected) triples — one training run,
stable, looks a lot like SFT.
```

DPO gets most of RLHF's benefit with a fraction of the complexity, which is why it's the practical choice when a *product team* (not a foundation lab) needs preference tuning.

```
Method  Complexity   Stability   Who uses it
------  -----------  ----------  ---------------------------------
RLHF    very high    finicky     foundation model labs
DPO     moderate     stable      teams w/ preference data + a reason
```

**When an FDE team would use preference tuning at all:** rarely. You reach for it when SFT can't capture a *qualitative* preference — e.g., you have pairs showing "this phrasing good, that phrasing bad" and the distinction is about judgment/taste, not format or facts. Even then, try a better system prompt and few-shot first. Preference tuning on open-weight models via DPO is the realistic path; for hosted frontier models you typically don't do this yourself.

**Interview trap:** conflating RLHF with "fine-tuning." RLHF/DPO are a *different objective* (learn from comparisons) than SFT (imitate targets). And neither teaches facts — same limitation as SFT.

---

### Q6. Explain catastrophic forgetting. How does it show up in practice and how do you mitigate it?

**Answer:**

**Catastrophic forgetting:** when you fine-tune a model narrowly, it can lose general capabilities it had before. You train it hard on your JSON-extraction task, and now it's worse at reasoning, or refuses reasonably, or its writing quality drops — because gradient updates optimized for your narrow data pulled weights away from the broad competence encoded during pretraining.

How it shows up:

```
Symptom                                  Cause
---------------------------------------  --------------------------------
Model nails your task, dumber elsewhere  over-fit to narrow distribution
Refuses things the base model handled    safety/instruction tuning eroded
Output quality/coherence dropped         over-training, high LR, too many epochs
Repetitive / degenerate outputs          overfit small dataset, memorization
```

Mitigations:

1. **Prefer LoRA/QLoRA over full fine-tuning.** Freezing the base weights and training small adapters *structurally* limits how far you can drift — a major, under-appreciated reason adapters are safer than full FT for narrow tasks.
2. **Fewer epochs, lower learning rate.** Most catastrophic forgetting is over-training. Often 1-3 epochs is right; watch a held-out general-capability eval, not just task loss.
3. **Mix in general data.** Blend some general-purpose examples with your task data so the model doesn't see *only* your narrow distribution.
4. **Keep a general-capability eval set** (Q7) and run it every checkpoint. If MMLU-style / reasoning / your general benchmark drops, you've over-cooked it — roll back.
5. **Don't fine-tune when you don't need to.** The best mitigation is scope: a smaller, more targeted intervention forgets less.

**Production war story:** a team fine-tuned a model to always output a strict ticket-triage JSON. It became excellent at triage JSON and simultaneously started producing broken JSON *and* worse free-text on an *adjacent* summarization feature that shared the model — classic forgetting from too many epochs on a narrow set. The fix was embarrassingly simple: cut epochs from 10 to 3, switch to LoRA, and add a general-capability regression check to the training loop. Lesson: **always measure what the fine-tune *breaks*, not just what it improves.**

---

### Q7. How do you evaluate a fine-tuned model against the base model? What's the trap in "our fine-tune scores higher"?

**Answer:**

You need **three** eval axes, and skipping any of them produces a fine-tune that looks good and fails in production:

```
1. TASK performance   : does it do the target task better than base+prompt?
2. GENERAL capability : did it get worse at everything else? (forgetting, Q6)
3. PRODUCTION reality : held-out real data, not your training distribution
```

The rigorous comparison protocol:

```
Baseline to beat is NOT "base model, zero-shot."
Baseline is "base model with your BEST prompt + few-shot."
Fine-tuning only earns its cost if it beats a well-prompted base model.
```

This is the #1 trap: teams compare `fine-tuned` vs `base zero-shot`, see a huge lift, and declare victory — when a good few-shot prompt on the base model would have matched it for free. **You must fine-tune against your strongest prompt-engineering baseline, or you're measuring the wrong delta.**

```typescript
interface EvalResult { taskScore: number; generalScore: number; costPerCall: number; p95LatencyMs: number; }

interface Candidate { name: string; run: (input: string) => Promise<string>; }

// Compare candidates on the SAME held-out set the model never trained on.
async function compareModels(
  candidates: Candidate[],            // e.g. [basePrompted, fineTuned]
  taskSet: { input: string; reference: string }[],
  generalSet: { input: string; reference: string }[],
  scoreTask: (out: string, ref: string) => number,
  scoreGeneral: (out: string, ref: string) => number,
): Promise<Record<string, EvalResult>> {
  const results: Record<string, EvalResult> = {};
  for (const c of candidates) {
    let taskTotal = 0, genTotal = 0;
    for (const ex of taskSet) taskTotal += scoreTask(await c.run(ex.input), ex.reference);
    for (const ex of generalSet) genTotal += scoreGeneral(await c.run(ex.input), ex.reference);
    results[c.name] = {
      taskScore: taskTotal / taskSet.length,
      generalScore: genTotal / generalSet.length,   // guards against catastrophic forgetting
      costPerCall: 0,   // fill from your cost accounting
      p95LatencyMs: 0,  // fill from timing
    };
  }
  return results;
}
```

Other essentials:

- **Held-out set the model never saw.** If your eval examples leaked into training, the score is meaningless memorization.
- **Real production distribution**, not clean curated examples. Fine-tunes often ace curated evals and stumble on messy real inputs.
- **Cost & latency in the comparison.** A fine-tune that's 2% better but requires self-hosting a GPU 24/7 may lose on total value vs a prompted API call.

**Interview trap:** reporting only task-metric improvement. If you didn't check general capability, you don't know what you broke (Q6). If you didn't beat a prompted baseline, you don't know if the fine-tune was necessary. Both checks are mandatory before shipping.

---

### Q8. "Data curation is the real work." What does that actually mean? Detail the pipeline.

**Answer:**

Model training is a button. **Assembling the dataset is the project** — typically 80%+ of the effort and the single biggest determinant of success. "Garbage in, garbage out" is literal here: the model learns your data's flaws faithfully. The pipeline:

```
Raw examples
   │
   ▼
[1] Collection & sourcing   — where do labels come from? (logs, humans, synthetic)
   │
   ▼
[2] Quality filtering       — drop wrong, low-quality, ambiguous examples
   │
   ▼
[3] Deduplication           — exact + near-dup removal (huge, see below)
   │
   ▼
[4] Formatting normalization— identical schema/style across ALL examples
   │
   ▼
[5] Coverage/balance check  — cover the real input distribution + edge cases
   │
   ▼
[6] Train/eval split        — split BEFORE anything, no leakage
   │
   ▼
[7] Contamination check     — ensure eval examples aren't in train
```

Why each step bites:

1. **Sourcing:** production logs give real distribution but need labeling; humans are slow/expensive/inconsistent; synthetic data (LLM-generated) scales but risks the model learning another model's quirks and errors. Most real datasets blend all three.
2. **Quality filtering:** one wrong label per 50 examples materially degrades a small dataset. You cannot "average out" errors with a few hundred examples.
3. **Deduplication is bigger than people expect.** Near-duplicates (same example lightly reworded) cause the model to over-weight that pattern and memorize, inflating eval scores while hurting generalization. Dedup exact matches, then near-dups via embedding similarity or MinHash.
4. **Formatting normalization:** inconsistent formatting *is* the thing the model learns. If half your JSON uses `snake_case` and half `camelCase`, the model learns to randomly pick. The dataset is the spec.
5. **Coverage/balance:** if 90% of examples are the easy case, the model ignores the 10% hard cases you actually care about. Deliberately include edge cases and rare classes.
6. **Split before processing** so no leakage.
7. **Contamination check:** eval examples appearing in training make your metrics a lie (Q7).

```typescript
import { createHash } from "node:crypto";

interface Example { input: string; output: string; }

function normalize(s: string): string { return s.replace(/\s+/g, " ").trim().toLowerCase(); }

// Exact + near-dup removal, plus a basic quality gate.
function curate(
  examples: Example[],
  embed: (t: string) => number[],
  cosine: (a: number[], b: number[]) => number,
): { kept: Example[]; dropped: { reason: string; ex: Example }[] } {
  const kept: Example[] = [];
  const dropped: { reason: string; ex: Example }[] = [];
  const seenHashes = new Set<string>();
  const keptEmbeddings: number[][] = [];

  for (const ex of examples) {
    // Quality gate: empty or degenerate outputs.
    if (!ex.output.trim() || ex.output.trim().length < 2) { dropped.push({ reason: "empty_output", ex }); continue; }
    // Exact dedup.
    const h = createHash("sha256").update(normalize(ex.input) + " " + normalize(ex.output)).digest("hex");
    if (seenHashes.has(h)) { dropped.push({ reason: "exact_dup", ex }); continue; }
    // Near-dup dedup via embedding similarity.
    const emb = embed(ex.input);
    if (keptEmbeddings.some((e) => cosine(e, emb) > 0.97)) { dropped.push({ reason: "near_dup", ex }); continue; }
    seenHashes.add(h);
    keptEmbeddings.push(emb);
    kept.push(ex);
  }
  return { kept, dropped };
}
```

**Production war story:** a team's fine-tune kept scoring ~95% on their eval and ~60% in production. Root cause: their eval set shared near-duplicate examples with training (contamination) *and* their training data was 85% one easy category. Fixing dedup + contamination + rebalancing the categories dropped the eval score to a *lower but honest* 82% — which finally matched production, letting them actually improve it. **A high eval score you can't reproduce in prod usually means a data-curation bug, not a model win.**

---

### Q9. Why is fine-tuning the embedding model often higher ROI than fine-tuning the LLM for domain retrieval?

**Answer:**

Because in a RAG system, **retrieval quality usually caps answer quality** (see the RAG file: low recall can't be fixed by a better generator), and a domain-tuned *embedding* model directly attacks that ceiling — for a fraction of the cost and risk of fine-tuning the generator.

The problem: general embedding models are trained on general text. In a specialized domain (legal, medical, semiconductor, your internal jargon), they map domain terms poorly — two clinically-distinct terms embed close together, or a domain synonym embeds far from its match. Retrieval suffers, and no amount of LLM fine-tuning fixes *missing* context.

Fine-tuning the embedding model (contrastive learning on domain query→relevant-doc pairs) teaches it your domain's notion of similarity:

```
Why it's higher ROI than LLM fine-tuning:
------------------------------------------------------------
Embedding models are SMALL      → training is cheap & fast (hours, one GPU)
Data is cheaper to get          → (query, relevant_doc) pairs from click/label logs,
                                   often harvestable from usage, no output-writing
Attacks the real bottleneck     → retrieval recall, which gates everything downstream
Low blast radius                → improving embeddings can't break generation quality
                                   (no catastrophic forgetting of a chat model)
Compounds with everything       → better retrieval helps every query, every model on top
Keeps knowledge in RAG          → facts stay updatable/citable (Q1), not frozen in weights
```

The training data shape is *pairs*, not input→output completions — and you can often mine them:

```
positive pair: (user query, doc they clicked / doc labeled relevant)
negative:       (user query, a random or hard-negative non-relevant doc)
→ contrastive loss pulls positives together, pushes negatives apart
```

Hard negatives (plausible-but-wrong docs, e.g. the top vector hit that a human marked irrelevant) are what make it work — they teach the fine distinctions general embeddings miss.

**The decision heuristic:** if your RAG quality problem is diagnosed as *retrieval recall* in a specialized domain, fine-tuning the embedding model is very often the highest-ROI single move — higher than fine-tuning the generator, adding GraphRAG, or upgrading the LLM. **Interview trap:** reflexively reaching to fine-tune the *chat* model for "domain adaptation" when the bottleneck is retrieval — you'd spend 10x the effort on the wrong component. Also note: adding a reranker (RAG file) often beats fine-tuning embeddings for effort, so sequence them: reranker first (a day), embedding fine-tune if still retrieval-bound (a week).

---

### Q10. Explain distillation (big→small for cost). When is it the right move, and what's the workflow?

**Answer:**

**Distillation** trains a small, cheap model (the "student") to mimic a large, expensive model (the "teacher") on a specific task. You get most of the big model's task quality at a fraction of the inference cost and latency — but only on the narrow slice you distilled.

The core workflow (the practical, "hard-label"/response-based version FDEs use):

```
1. Pick a narrow, high-volume task where you're paying for a big model.
2. Run the BIG model (claude-opus-4-8) on many real inputs → high-quality outputs.
3. That (input → big-model-output) corpus becomes your SFT dataset.
4. Fine-tune a SMALL model (or a smaller open-weight model) on it.
5. Eval the small model against the big model on held-out data.
6. If quality is acceptable, serve the cheap small model in production.
```

You're using the expensive model as a *labeler* to generate training data for the cheap one. This sidesteps the hardest part of Q8 (getting labeled outputs) — the teacher writes them.

When it's right:

```
Good fit for distillation                Bad fit
---------------------------------------  --------------------------------
Narrow, well-scoped task                 broad, open-ended assistant
Very high call volume                    low volume (fixed cost never amortizes)
Big-model cost/latency is the pain       already cheap enough
Task quality plateaus (no need frontier) needs frontier reasoning
You can eval quality objectively         quality is subjective / drifts
```

The economic logic:

```
Big model:   $X per call,  N calls/month  → cost scales with N at high rate
Distilled:   fixed training cost + $x per call (x << X)
Break-even when: (X − x)·N  >  training + hosting fixed cost
→ high N is what makes distillation pay. Low volume → don't bother.
```

**A pragmatic middle path before full distillation:** model *routing* (send easy inputs to a cheap model like claude-haiku-4-5, hard ones to claude-opus-4-8) often captures much of the savings with zero training. Try routing first; distill when even the cheap frontier model is too expensive at your volume, or when a specialized small model can beat it on your narrow task.

**Production war story:** a classification pipeline ran claude-opus-4-8 on ~5M docs/month — accurate but expensive. They distilled: ran Opus on 20k representative docs to create labels, fine-tuned a small model, and validated it matched Opus within 1.5% accuracy on a held-out set. Inference cost dropped ~15x and latency halved. The key was that the task was *narrow and high-volume* — exactly where the fixed distillation cost amortizes. On a low-volume version of the same task, the training + hosting cost would never have paid back, and routing would have been the right answer.

---

### Q11. Do the cost math for a fine-tuning decision. Walk through a real "should we fine-tune?" calculation.

**Answer:**

Fine-tuning trades a **fixed upfront + ongoing cost** for a **lower per-call cost**. You only win above a break-even volume, and you must count *all* the fixed costs people forget.

Scenario: a classification task, currently done with claude-sonnet-5 + a 1,500-token few-shot prompt, at 2M calls/month. Should we fine-tune a smaller model?

```
OPTION A — keep prompted Sonnet
  Per call: ~1,500 in + ~50 out tokens
  Cost/call (illustrative): ~$0.005
  Monthly: 2M × $0.005          = $10,000 / month
  Upfront: $0
  Time to ship: already live

OPTION B — distill/fine-tune a small model, self-host or managed
  Fixed costs (the parts people forget):
    Data curation (eng time)          ~$8,000  (2 wks of the real work, Q8)
    Training runs (incl. iterations)  ~$1,500
    Eval harness build                ~$2,000
    ── one-time                       ~$11,500
  Ongoing:
    Hosting (managed endpoint or GPU) ~$1,500 / month  (even at idle)
    Per call: shorter prompt, cheaper model ~$0.0004
    Inference: 2M × $0.0004           = $800 / month
    ── monthly                        ~$2,300 / month
  Plus: retraining every quarter (~$3k/yr), maintenance tax
```

Break-even:

```
Monthly saving of B vs A:  $10,000 − $2,300 = $7,700 / month
Payback of $11,500 upfront: ~1.5 months
→ At 2M calls/month, fine-tuning pays back fast. GO (probably).

Now re-run at 100k calls/month:
  A: 100k × $0.005 = $500/month
  B: hosting $1,500 + inference $40 = $1,540/month  ← MORE than A!
→ At low volume, fine-tuning LOSES even before counting upfront cost.
  The fixed hosting cost dominates. DON'T fine-tune.
```

```typescript
interface FineTuneEconomics {
  monthlyCalls: number;
  promptedCostPerCall: number;   // Option A
  fineTunedCostPerCall: number;  // Option B per-call
  fixedUpfront: number;          // data + training + eval harness
  monthlyHosting: number;        // B's floor cost regardless of volume
}

function fineTuneVerdict(e: FineTuneEconomics): { recommend: boolean; paybackMonths: number; note: string } {
  const monthlyA = e.monthlyCalls * e.promptedCostPerCall;
  const monthlyB = e.monthlyHosting + e.monthlyCalls * e.fineTunedCostPerCall;
  const monthlySaving = monthlyA - monthlyB;
  if (monthlySaving <= 0) {
    return { recommend: false, paybackMonths: Infinity, note: "fine-tune costs MORE monthly — volume too low to amortize hosting" };
  }
  const paybackMonths = e.fixedUpfront / monthlySaving;
  return {
    recommend: paybackMonths < 6,   // typical bar: pay back within ~2 quarters
    paybackMonths,
    note: paybackMonths < 6 ? "positive ROI within 2 quarters" : "payback too slow; revisit or stay prompted",
  };
}
```

**The FDE discipline:** always compute the break-even volume and the *total* cost of ownership (data + training + hosting floor + retraining + maintenance), and compare against a **well-prompted baseline** (Q7), not against zero. Most "let's fine-tune to save money" proposals die on this spreadsheet — the hosting floor and the data-curation labor are the killers. **Interview trap:** quoting only per-call token savings and ignoring the fixed hosting floor and the eng-time data cost — that's how teams "save money" into a net loss.

---

### Q12. How do you host a fine-tuned model? Compare managed (Bedrock custom / provider-hosted) vs self-hosting.

**Answer:**

Once you have a fine-tuned model, *serving* it is its own cost and reliability problem — and it's where a lot of fine-tuning ROI quietly evaporates.

```
Option              What it is                        Best when
------------------  --------------------------------  --------------------------
Provider-managed    Fine-tune via the provider's API   You want zero infra,
fine-tuning         (managed), they host + scale it    accept their model menu,
(e.g. Bedrock       You call it like any API.          value ops simplicity.
custom models,
hosted FT APIs)

Self-host           You train an open-weight model      You need full control,
open-weight         (LoRA/QLoRA) and run it on your     specific open models,
(vLLM/TGI on GPUs)  own GPUs / a GPU cloud.             data residency, or huge
                                                        volume to amortize GPUs.
```

The decision axes:

```
Dimension            Managed FT              Self-host open-weight
-------------------  ----------------------  ----------------------------
Ops burden          low (provider runs it)   high (you run inference infra)
Model choice        provider's menu only     any open-weight model
Idle cost           often lower / per-use    GPU burns money 24/7 at idle
Scaling             provider autoscales      you build autoscaling
Cold start          managed                  you manage (GPU warm pools)
Data residency      provider's terms         full control (on-prem possible)
Best at             typical enterprise FT    high volume / strict control
Break-even          lower volume             needs high, steady volume
```

Practical guidance for an FDE:

1. **Default to managed** (provider-hosted fine-tuning like Bedrock custom models) unless you have a specific reason not to. You get the fine-tune benefit without becoming a GPU-ops team, and idle economics are usually better.
2. **Self-host only when** you need a specific open-weight model, strict data residency/on-prem, or your volume is so high and steady that dedicated GPUs beat per-call managed pricing (and you have the SRE muscle to run inference reliably — batching, autoscaling, GPU failover, cold starts).
3. **Adapter serving** (LoRA): if self-hosting, one base model + many hot-swappable LoRA adapters (Q4) lets you serve many fine-tuned "models" on shared GPUs — a major cost lever versus one full model per task.
4. **Count the idle floor.** A self-hosted GPU endpoint costs money even at 3am with zero traffic. This floor is exactly what sinks the low-volume cost math in Q11 — always include it.

**Production war story:** a team self-hosted a fine-tuned open-weight model on dedicated GPUs for a feature with spiky, low-average traffic. The GPUs sat mostly idle but billed 24/7, and the effective cost per call was higher than the frontier API they'd replaced — plus they now owned inference reliability (a 2am GPU-node failure paged an engineer). They moved to a managed fine-tune and deleted the whole GPU fleet. **Self-hosting fine-tuned models is an infrastructure commitment, not just a model choice — only take it on with the volume and the ops maturity to justify it.**

---

### Q13. A stakeholder says "the model doesn't know our internal product, let's fine-tune it on our wiki." Respond as the FDE.

**Answer:**

This is the canonical trap (foreshadowed in Q1). The correct response is to **reframe the problem**, not execute the request.

The reframe: "The model not knowing your product is a **knowledge** problem, and fine-tuning is the wrong tool for knowledge. Here's why, and here's what actually works."

Why fine-tuning on the wiki fails at this goal:

1. **Fine-tuning teaches behavior/style, not retrievable facts.** Training on wiki text adjusts *how* the model writes; it does not reliably let the model *recall specific facts* on demand. It'll pick up your tone and confidently *hallucinate* half-learned details — worse than not knowing.
2. **Your wiki changes.** A fine-tune freezes a snapshot. Every wiki edit means the model is now wrong until you retrain. RAG re-indexes in minutes.
3. **No citations.** Fine-tuned "knowledge" can't point to a source. RAG returns the exact wiki passage, which is what users and compliance need.
4. **Cost & time.** RAG ships this week; a fine-tune is weeks and a permanent retraining tax — for a worse result on this specific goal.

What to do instead:

```
Goal: "model knows our internal product"
  → RAG over the wiki (contextual hybrid retrieval, see RAG file)
     + a strong system prompt describing the product/persona
     + citations back to wiki pages
  → facts are current, retrievable, citable, and updatable

Fine-tuning is appropriate ONLY if, AFTER RAG, you still need:
  - a consistent output FORMAT/STYLE prompting can't hold, at high volume
  - lower latency/cost by baking a behavior into weights
  ...and those are behavior goals, not the "know our product" goal.
```

The FDE move is to **separate the two concerns**: knowledge → RAG; behavior/format → prompt first, fine-tune only if proven necessary. Deliver RAG now, measure, and revisit fine-tuning only against a specific behavioral gap that RAG + prompting leaves open.

**Interview trap:** agreeing to fine-tune on documents because the stakeholder asked. Your value as an FDE is diagnosing that "make it know our stuff" is a retrieval requirement and steering to the solution that's cheaper, faster, fresher, and citable. Saying "no, here's the better path, and here's the demo by Friday" is the senior answer.

---

### Q14. Compare SFT, LoRA, QLoRA, DPO, and distillation on a single decision grid. When do you pick each?

**Answer:**

```
Technique     What it changes        Data needed              Pick it when
------------  ---------------------  -----------------------  ---------------------------------
Full SFT      all weights            input→output pairs       rare; you need max quality AND
                                                              have GPUs + a broad dataset
LoRA          small adapters         input→output pairs       default for open-weight SFT;
                                                              near-full quality, cheap, swappable
QLoRA         adapters on 4-bit base input→output pairs       LoRA but memory-constrained
                                                              (fits one GPU); the pragmatic default
DPO           weights (preference)   (prompt, better, worse)  you must capture a QUALITATIVE
                                     preference triples       preference SFT can't express
Distillation  small model's weights  big-model outputs        cut cost/latency on a NARROW,
              (via SFT on teacher)   as labels                HIGH-VOLUME task; teacher labels it
```

The selection flow:

```
Need new FACTS?                         → not fine-tuning at all → RAG
Need a qualitative PREFERENCE/taste?    → DPO (after trying prompt+few-shot)
Cut cost on a narrow high-volume task?  → Distillation (teacher→student SFT)
Teach a SKILL/FORMAT from examples?     → SFT, implemented as LoRA/QLoRA
Improve RAG retrieval in a domain?      → fine-tune the EMBEDDING model (Q9), not the LLM
Memory/hardware constrained for SFT?    → QLoRA
```

Note these compose: **distillation is implemented as SFT (usually LoRA/QLoRA) on teacher-generated data.** DPO often *follows* an SFT stage (SFT to get the format, DPO to refine the preference). They're stages in a pipeline, not mutually exclusive choices. For an FDE working with hosted frontier models, the realistic menu is: prompt → RAG → (managed) SFT/distillation for narrow high-volume tasks → embedding fine-tune for domain retrieval. RLHF and hand-rolled full FT are mostly foundation-lab territory.

---

### Q15. How do you decide dataset size and detect when you have "enough" data to fine-tune?

**Answer:**

You don't guess the number — you **measure the learning curve** and stop when adding data stops helping. But you need a floor to even start.

Starting floors (rules of thumb, task-dependent):

```
Task                          Minimum to try     Comfortable
----------------------------  -----------------  ------------
Simple classification/format  ~50-100            500-1,000
Moderate skill/style          ~500               2,000-5,000
Complex/broad domain          ~2,000             10,000+
DPO preference tuning         ~1,000 triples     5,000+
```

The empirical method — **plot a data-scaling curve:**

```
1. Fine-tune on 25%, 50%, 75%, 100% of your data.
2. Eval each on the SAME held-out set.
3. Plot eval score vs training-set size.

  score │        ____________  ← plateau: more data won't help,
        │      /                  fix quality/task instead
        │    /
        │  /  ← still rising steeply: GET MORE DATA
        └──────────────────────► training examples

If still rising at 100%: collect more, you're data-bound.
If flat from 50%→100%:   you have enough; the ceiling is
                         data QUALITY or task framing, not quantity.
```

```typescript
interface ScalingPoint { fraction: number; evalScore: number; }

// Diagnose whether more data will help, from a scaling sweep.
function dataVerdict(curve: ScalingPoint[]): string {
  const sorted = [...curve].sort((a, b) => a.fraction - b.fraction);
  const last = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  const marginalGain = (last.evalScore - prev.evalScore) / (last.fraction - prev.fraction);
  if (marginalGain > 0.1) return "still rising steeply → collect MORE data (data-bound)";
  if (marginalGain > 0.02) return "modest gains → some more data may help";
  return "plateaued → enough data; improve QUALITY/task framing or accept ceiling";
}
```

Signals you have a **quality** problem, not a **quantity** problem (more data won't fix these):

- Curve plateaus below your target — the ceiling is data quality, task framing, or model capability.
- Model does well on common cases, fails edge cases — you need *coverage* (targeted examples), not raw volume.
- Eval is noisy/unreliable — fix the eval before chasing more training data.

**Interview trap:** "we need more data" as a reflex when the fine-tune underperforms. Often the problem is dirty labels, near-duplicates inflating apparent size, poor coverage of hard cases, or a task that fine-tuning can't solve (facts → should be RAG). Run the scaling curve first: it tells you whether you're quantity-bound or quality-bound, which are opposite fixes.

---

### Q16. What are the failure modes of a fine-tuning project, and how do you de-risk before committing weeks to it?

**Answer:**

Fine-tuning projects fail in predictable ways. De-risk with a cheap prototype before the full investment.

```
Failure mode                        Root cause                     De-risk step
----------------------------------  -----------------------------  --------------------------
"Fine-tune barely beats prompting"  didn't need FT (Q1/Q7)         beat a strong prompt baseline FIRST
Prod quality << eval quality        data contamination / dirty     clean split + dedup + contamination
                                    data (Q8)                       check BEFORE training
Broke adjacent capabilities         catastrophic forgetting (Q6)   general-capability eval each run
Never pays back                     low volume vs fixed cost       break-even math BEFORE (Q11)
"Model still hallucinates facts"    tried to teach facts w/ FT     move knowledge to RAG (Q13)
Frozen / stale over time            requirements/data drift        confirm task is STABLE first
Can't reproduce results             no versioned data/config       version dataset + hyperparams
```

The de-risking sequence — spend days before weeks:

```
1. PROVE prompting is insufficient. Build the best prompt + few-shot baseline
   and measure the gap. No gap → stop, ship the prompt. (Kills ~half of projects.)
2. TINY pilot fine-tune. 100-300 examples, cheapest method (QLoRA / a small
   managed run). Does it move the metric AT ALL? If a tiny run does nothing,
   a big one rarely saves it — your data or framing is wrong.
3. COST math. Break-even volume (Q11). Doesn't pay back → stop.
4. DATA audit. Can you actually source/clean enough quality data (Q8)?
   If the data doesn't exist, the project doesn't either.
5. Only now: full data curation + training + rigorous eval (Q7).
```

```typescript
interface FineTuneGate { promptBaselineGap: number; pilotLift: number; paybackMonths: number; dataAvailable: boolean; taskStable: boolean; }

// Go/no-go before committing weeks. Any hard fail → don't fine-tune.
function goNoGo(g: FineTuneGate): { go: boolean; reason: string } {
  if (g.promptBaselineGap < 0.05) return { go: false, reason: "prompting already close — fine-tune unjustified" };
  if (g.pilotLift < 0.02) return { go: false, reason: "pilot didn't move metric — data/framing wrong, not size" };
  if (g.paybackMonths > 6) return { go: false, reason: "cost never amortizes at this volume" };
  if (!g.dataAvailable) return { go: false, reason: "cannot source enough quality data" };
  if (!g.taskStable) return { go: false, reason: "task drifts — a frozen fine-tune will go stale" };
  return { go: true, reason: "all gates pass — proceed to full fine-tune" };
}
```

**Production war story:** a team scoped a 6-week fine-tuning project. The de-risk pilot (step 2, half a day) showed a 100-example QLoRA run *already* matched their target — because the task was simpler than assumed. They shipped a tiny fine-tune in three days instead of six weeks. The same gate, run on a *different* team, killed a project at step 1 when a better prompt closed the gap entirely. **The cheap pilot either saves you weeks of over-scoping or saves you a doomed project — run it every time before committing.**

---

### Q17. How does fine-tuning interact with RAG and prompt caching? Can/should you combine them?

**Answer:**

Yes — they're **complementary layers**, not alternatives, and the strongest systems stack them. The mental model:

```
Prompt caching  → cheaper/faster delivery of static context (infra optimization)
RAG             → supplies the KNOWLEDGE (what the model needs to know now)
Fine-tuning     → shapes the BEHAVIOR/skill (how the model acts on it)
```

Concrete combined architecture (all three at once):

```
User query
   │
   ▼
RAG retrieves fresh, citable knowledge  ──┐
   │                                       │
   ▼                                       │
Fine-tuned model (learned your output      │  ← behavior baked in weights
format / domain style / reasoning pattern) │
   │                                       │
   ▼                                       │
System prompt + retrieved context ─────────┘  ← knowledge in context, cached
   │                                          (prompt caching on static parts)
   ▼
grounded, correctly-formatted, cheap answer
```

Why combine:

1. **Fine-tune for the format/skill you always want; RAG for the facts that change.** E.g. fine-tune a model to always produce your clinical-note structure and reasoning style, and RAG to pull the current patient's records. Neither alone does both jobs.
2. **Fine-tuning can *shrink* the prompt** — behavior baked into weights means you drop the long few-shot examples, which lowers per-call tokens *on top of* RAG and caching. This is a real cost compounding.
3. **Prompt caching** applies regardless: cache the (now shorter) system prompt and any static retrieved boilerplate. Works with base or fine-tuned models.

Caveats when combining:

- A fine-tuned model still needs RAG for freshness — don't let the fine-tune tempt you to bake facts in (Q13).
- Fine-tuning to a *specific* prompt/context format means changing your RAG prompt template can degrade the fine-tune — version them together.
- Managed fine-tuned endpoints may or may not support prompt caching the same way as base models — verify with your provider before assuming the cache savings.

**The FDE sequencing:** ship prompt + RAG + caching first (fast, cheap, flexible). Add fine-tuning **only** for a proven behavioral gap, as a layer *on top of* the RAG system — never as a replacement for it. **Interview trap:** treating them as an either/or ("fine-tune *or* RAG"). The senior answer is "RAG for knowledge, fine-tune for behavior, caching for cost — and here's how they stack."

---

### Q18. Distillation vs routing vs a smaller base model — how do you choose the cheapest path to acceptable quality?

**Answer:**

All three cut cost, in increasing order of effort. Try them in that order and stop when quality is acceptable.

```
Approach            Effort   How it saves                 Risk
------------------  -------  ---------------------------  -----------------------------
Smaller base model  minutes  claude-haiku-4-5 instead     may not hit quality bar
(just swap)                  of opus/sonnet
Model routing       hours    cheap model for easy inputs, some hard cases misrouted
                             expensive for hard ones      to the cheap model
Distillation        weeks    small model fine-tuned to    fixed cost; only pays at
                             match teacher on your task    high volume; frozen
```

The decision flow:

```
Does a smaller base model (haiku) already meet quality?
   YES → done. Cheapest possible, zero effort. (Try this FIRST.)
   NO  ↓
Can you split traffic — cheap model handles easy, dear model hard?
   (route by a cheap classifier; see RAG-file router pattern)
   YES → routing. Big savings, no training, stays flexible/fresh.
   NO / still too expensive at volume ↓
Is the task narrow AND volume very high AND quality plateaued?
   YES → distillation. Highest savings per call, but weeks of work,
         fixed cost, and a frozen model to maintain.
   NO  → stay with routing / smaller model; distillation won't pay back.
```

```typescript
interface CostPathInput { haikuMeetsBar: boolean; routableFraction: number; monthlyCalls: number; taskNarrow: boolean; qualityPlateaued: boolean; }

function cheapestPath(i: CostPathInput): string {
  if (i.haikuMeetsBar) return "swap to smaller base model (haiku) — zero effort, cheapest";
  if (i.routableFraction > 0.4) return "model routing — cheap model for easy inputs, no training, stays fresh";
  if (i.taskNarrow && i.qualityPlateaued && i.monthlyCalls > 1_000_000) return "distillation — narrow + high-volume + plateaued quality justifies fixed cost";
  return "stay with routing/smaller model — distillation won't amortize here";
}
```

Why this order: **effort and irreversibility increase down the list.** A base-model swap is instant and reversible. Routing is a day and stays flexible (no frozen model, works with fresh data). Distillation is weeks, produces a frozen model, and only pays back at high volume — so it's the *last* resort, chosen only when cheaper options can't hit the cost target. **Interview trap:** jumping straight to distillation "to save money" when a `claude-haiku-4-5` swap or a simple router would have captured most of the savings with none of the training cost, frozen-model maintenance, or data-curation burden. **Always exhaust the zero-training options before you fine-tune anything for cost.**
