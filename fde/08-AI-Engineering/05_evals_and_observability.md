# Evals & Observability for LLM Systems

> Module: AI Engineering | Level: Senior/Staff | FDE Interview Prep

Evals are the Forward Deployed Engineer's #1 deliverable artifact. A demo convinces a customer to start; an eval suite is what converts "the demo felt good" into "we can prove it works and we can safely change it." This module covers the full lifecycle: building golden datasets from customer SMEs, writing calibrated LLM-as-judge scorers, wiring evals into CI, instrumenting traces in production, detecting drift, and running incident response when quality regresses. Examples are provider-agnostic in principle; concrete code uses the Claude API via the TypeScript SDK (`@anthropic-ai/sdk`).

---

## Why Evals Come First

### Q1. Why are evals the FDE's #1 deliverable artifact — above the prompt, the pipeline, or the integration code?

**Answer:**

Because everything else the FDE ships is *changeable only if evals exist*. Four arguments you should be able to make to a customer executive:

1. **Without evals, every prompt change is a gamble.** LLM systems are non-local: a one-line prompt edit that fixes the case in front of you can silently break ten cases you are not looking at. Code has unit tests for this; LLM behavior has evals. If you cannot measure, you cannot change — and a system you cannot change is a system that dies at the first model deprecation or requirement shift.

2. **Customer trust is built on measured baselines, not vibes.** The first stakeholder meeting where you say "extraction accuracy went from 71% to 88% on your own 200 historical tickets" is the meeting where the project stops being an experiment and becomes infrastructure. Numbers on *their* data beat any benchmark.

3. **Evals encode the customer's definition of "good".** "Good summary," "correct routing," "acceptable tone" are not universal — they live in the heads of the customer's subject-matter experts. The eval-building process (SME workshops, labeling sessions, rubric writing) is how the FDE extracts that tacit knowledge and turns it into an executable spec. The eval suite *is* the requirements document, in runnable form.

4. **Evals outlive the engagement.** The FDE leaves. The prompt will be edited by someone else, the model will be upgraded, the corpus will change. The eval suite is the safety rail that lets the customer's own team evolve the system without you. It is the single highest-leverage artifact you can leave behind.

```
The FDE value chain:

  demo          →  pilot            →  production        →  self-sufficiency
  "it can work"    "it works on        "we know when it     "customer can
                    our data,           breaks, and how      change it safely
                    measurably"         badly"               without the FDE"
        │               │                    │                     │
        └─ no eval      └─ golden set +      └─ online metrics +   └─ eval suite in
           needed          offline eval         tracing + canary      customer's CI
```

**Interview trap:** "We reviewed 10 outputs by hand and they looked great, so we shipped." This collapses at the first regression argument. When a stakeholder says "it got worse," you have no baseline to compare against, no way to determine if it's a real regression or selection bias in the complaints, and no way to prove your fix didn't break something else. Eyeballing is a *debugging* activity, not an *acceptance* activity. The strong answer: hand review is how you *bootstrap* a golden set (those 10 examples become eval cases), never how you gate a release.

### Q2. Describe eval-driven development. How does the loop actually run day-to-day on a customer engagement?

**Answer:**

Eval-driven development (EDD) is TDD's shape applied to LLM behavior:

```
        ┌──────────────────────────────────────────────────────┐
        │                                                      │
        ▼                                                      │
  1. DEFINE METRIC        2. BASELINE            3. CHANGE     │
  what does "good"   →    run current system →   edit prompt,  │
  mean? (with SMEs)       on golden set,         swap model,   │
  pick scorer type        record score           tune retrieval│
        ▲                                              │       │
        │                                              ▼       │
        │                 5. SHIP                4. MEASURE    │
        └──── new failure  gate: no regression ← re-run suite, ┘
              cases feed   vs baseline, then     diff vs baseline
              back in      deploy + monitor
```

Day-to-day mechanics:

- **Define metric first, before writing the prompt.** If the customer cannot articulate what a passing output looks like, that is a discovery problem to solve *now*, not after launch. Write the scorer (even a rough one) before optimizing anything.
- **Baseline everything.** Before any change, run the full suite and persist the run as a JSON artifact (run ID, git SHA of the prompt, model ID, per-case scores). Changes are always evaluated as *diffs against a named baseline*, never as absolute vibes.
- **One change per measurement.** Prompt edit + model swap + retrieval change in one run tells you nothing about attribution. Senior discipline: change one variable, measure, commit, repeat.
- **Every production failure becomes an eval case.** The suite grows monotonically. This is the flywheel: 6 months in, the suite is a fossil record of every way the system has ever failed, and none of those failures can silently return.
- **Ship gate is mechanical.** "Overall score >= baseline AND zero newly-failing cases in the critical category" is a CI check, not a judgment call in a meeting.

**Production war story:** A support-ticket triage deployment ran at 91% routing accuracy. An engineer "improved" the prompt to handle a new ticket category, hand-checked 5 examples, and shipped Friday afternoon. Monday: escalation rate had doubled. The new instructions caused the model to over-route ambiguous tickets to the human queue — a behavior visible in 15 seconds if the 300-case eval had been run, because 22 previously-passing cases flipped to fail. The fix took an hour; rebuilding stakeholder confidence took a month. The customer's CTO subsequently mandated eval runs as a merge gate — which is exactly the artifact the FDE should have delivered on day one.

---

## Eval Taxonomy & Golden Datasets

### Q3. Walk through the taxonomy of eval scorers. When do you use each?

**Answer:**

Four families, ordered from cheapest/most-deterministic to most expensive/most-flexible. The senior rule: **use the cheapest scorer that captures the requirement, and only escalate when you must.**

| Scorer family | Examples | Cost | Deterministic? | Use when |
|---|---|---|---|---|
| **Assertion / code-graded** | exact match, contains, regex, JSON-schema-valid, executable checks (SQL actually runs, code compiles, link resolves) | ~free | Yes | Output has an objectively checkable property. Always prefer this. |
| **Similarity-based** | embedding cosine vs reference, ROUGE/BLEU, edit distance | cheap | Yes (given model) | A reference answer exists but exact wording may vary. Weak signal — use as a tripwire, not a gate. |
| **LLM-as-judge** | rubric scoring of a single output; pairwise comparison of two outputs | $ per case | No (mitigable) | Quality is subjective or multi-dimensional: tone, faithfulness, helpfulness, completeness. |
| **Human labels** | SME review, crowdsourced ranking | $$$, slow | Gold standard | Calibrating judges, high-stakes acceptance, building the initial golden set. Never scalable as the routine scorer. |

Key points interviewers probe:

- **Assertions are underrated.** A surprising fraction of "quality" decomposes into checkable facts: did the JSON parse and validate, does the SQL execute against the schema, is the cited doc ID actually in the retrieved set, is the answer under 100 words, does it never mention a competitor name. Stack many cheap assertions before reaching for a judge.
- **Similarity scores are trip-wires.** Embedding similarity of 0.94 vs 0.91 means nothing by itself, but a case that drops from 0.93 to 0.60 between runs is worth a human look.
- **Judges are calibrated instruments, not oracles.** An uncalibrated judge is just a second opinion from the same species of model that produced the output (see Q7–Q9).
- **Humans are for calibration, not throughput.** Spend the human budget labeling 50–100 examples that anchor the judge, then let the judge scale.

### Q4. Map task types to eval strategies: extraction, summarization, RAG, agents.

**Answer:**

| Task type | Primary scorers | Why |
|---|---|---|
| **Structured extraction** (fields from documents) | Assertions: JSON-schema-valid + per-field exact/normalized match against labeled gold values | The output is a data structure; correctness is objective. Judge adds nothing but noise and cost. |
| **Classification / routing** | Exact match against gold label; confusion matrix per class | Objective. Report per-class recall — aggregate accuracy hides the rare class that matters most (e.g., "legal escalation"). |
| **Summarization** | LLM judge with rubric: per-criterion binary checks (covers key points? no fabricated facts? correct length/tone?) + assertion on length | No single reference summary is "the" answer; quality is multi-dimensional. |
| **RAG Q&A** | Split the pipeline: **retrieval metrics** (recall@k, MRR against labeled relevant-chunk IDs) + **faithfulness judge** (is every claim in the answer supported by the retrieved context?) + **answer-relevance judge** | If you only score end-to-end, you can't tell whether retrieval or generation failed. Faithfulness ≠ correctness: an answer can be faithful to bad context. |
| **Agents / tool use** | **Trajectory checks** (did it call the right tools, in a valid order, within N steps, without forbidden actions?) + **end-state assertions** (is the ticket actually updated in the sandbox CRM? does the file exist with correct content?) | The final message can look right while the side effects are wrong, and vice versa. End-state in a sandboxed environment is the strongest signal. |

```
RAG eval decomposition:

  query ──▶ [ retrieval ] ──▶ chunks ──▶ [ generation ] ──▶ answer
                 │                             │
                 ▼                             ▼
        recall@k / MRR vs            faithfulness judge (answer ⊆ chunks?)
        labeled relevant IDs         answer-relevance judge (answers the query?)
                                     citation assertions (cited IDs ∈ retrieved set)
```

**Interview trap:** Scoring a RAG system only with an end-to-end "is the answer correct" judge. When the score drops, you cannot tell whether retrieval degraded (index drift, corpus change) or generation degraded (prompt/model change) — so you cannot fix it. Always instrument component-level metrics alongside end-to-end ones.

### Q5. Where do golden datasets come from on a customer engagement, and how big do they need to be?

**Answer:**

**Sources, in the order they typically become available:**

1. **SME workshops (week 1).** Sit with the customer's experts, have them write/select representative inputs and articulate what a correct output is. Slow (maybe 10–20 cases/hour) but each case doubles as requirements discovery. Capture *why* an answer is correct — that prose becomes your judge rubric.
2. **Historical data.** Past tickets with their actual resolutions, past documents with their manually-extracted fields, past emails with the replies a human sent. Highest-fidelity distribution; needs cleaning and consent review.
3. **Synthetic generation with human review.** Use an LLM to generate variations (paraphrases, edge cases, adversarial inputs) from seed cases — then have humans review before admitting to the set. Unreviewed synthetic data encodes the generator's blind spots as your test distribution.
4. **Production logs (post-launch).** The best source, permanently. Sample real traffic (especially failures, escalations, thumbs-down) and label it. This is how the suite tracks distribution shift.

**Size guidance and the statistics you must be able to do on a whiteboard:**

- **Start with 50–200 cases.** Enough to catch gross regressions and stratify by category; achievable in the first two weeks.
- **Know what 100 cases can and cannot detect.** Pass-rate standard error is `sqrt(p(1-p)/n)`. At p = 0.8, n = 100: `sqrt(0.8·0.2/100) = 0.04` → the 95% interval is roughly ±8 percentage points. A "3pp improvement" measured on 100 cases is noise.
- **Detecting a 5pp difference needs hundreds per arm.** Two-proportion power calculation (α = 0.05, power = 0.8, comparing 80% vs 85%):

```
n ≈ 2 · (z_α/2 + z_β)² · p̄(1−p̄) / δ²
  = 2 · (1.96 + 0.84)² · 0.825·0.175 / 0.05²
  = 2 · 7.84 · 0.1444 / 0.0025
  ≈ 906 cases per arm
```

So: use the 200-case set to catch *large* regressions and case-level flips (a case that went pass→fail is a real signal regardless of aggregate noise), and be honest that small aggregate deltas on small sets are not statistically meaningful. This honesty is a senior signal in interviews.

**Interview trap:** "Our eval set has 1,000 cases" — where 900 are synthetic near-duplicates of 20 seeds. Effective sample size is what matters; 200 diverse, stratified, human-reviewed cases beat 1,000 correlated ones. Interviewers probe this by asking how the set was constructed, not how big it is.

### Q6. What does dataset hygiene look like? Show the TypeScript schema you'd use.

**Answer:**

Hygiene rules:

- **Version the dataset like code.** It lives in git (or a versioned store); every eval run records the dataset version it ran against. A score is meaningless without the dataset SHA.
- **Stratify by category and difficulty.** Tag every case (`category: "billing"`, `difficulty: "hard"`, `source: "prod-incident-2026-03"`). Report per-stratum scores — aggregates hide the segment your executive sponsor cares about.
- **Hold out a set never used for prompt tuning.** If you iterate the prompt against the whole suite, you overfit to it — the suite becomes a training set and stops predicting production. Keep 20–30% locked away, run it only at release gates.
- **No leakage between few-shot examples and eval cases.** If a case (or near-duplicate) appears in the prompt's examples, it is not a test.
- **Record provenance and label author.** When a case is disputed ("actually that gold answer is wrong"), you need to know who labeled it and from what source.

```typescript
// dataset.ts — golden dataset schema

export interface EvalCase {
  id: string;                       // stable, never reused ("case-billing-0042")
  input: {
    query: string;
    context?: Record<string, unknown>; // e.g. retrieved docs pinned for reproducibility
  };
  expected: {
    // union by task type; extraction shown here
    output?: unknown;               // gold structured output (assertion scorers)
    mustContain?: string[];         // substring assertions
    mustNotContain?: string[];      // e.g. competitor names, PII echoes
    rubricNotes?: string;           // SME prose: WHY the gold answer is right (feeds judge rubric)
  };
  tags: {
    category: string;               // "billing" | "auth" | "escalation" ...
    difficulty: "easy" | "medium" | "hard";
    source: "sme-workshop" | "historical" | "synthetic-reviewed" | "prod-incident";
    holdout: boolean;               // true = never used during prompt tuning
  };
  provenance: {
    labeledBy: string;
    labeledAt: string;              // ISO 8601
    sourceRef?: string;             // ticket ID, incident ID, doc ID
  };
}

export interface EvalDataset {
  name: string;                     // "acme-triage-golden"
  version: string;                  // semver or content hash
  cases: EvalCase[];
}
```

---

## LLM-as-Judge

### Q7. What are the known biases of LLM judges, and how do you mitigate each?

**Answer:**

| Bias | Symptom | Mitigation |
|---|---|---|
| **Position bias** | In pairwise comparison the judge systematically prefers the first (or last) presented answer | Run every comparison twice with order swapped; only accept a verdict when both orderings agree, else record a tie. Track your judge's swap-consistency rate — below ~80% the judge is too noisy to use. |
| **Verbosity bias** | Longer answers score higher regardless of quality | Rubric criteria that explicitly reward concision; per-criterion binary checks instead of holistic scores; include length-matched pairs in calibration data to measure the bias. |
| **Self-preference bias** | A judge rates outputs from its own model family higher | Use a different model family for judging than for generation when possible; at minimum, use a different model tier and verify against human labels. |
| **Score anchoring / central tendency** | On 1–10 scales, everything gets a 7; scores cluster and lose discrimination | Avoid numeric scales entirely. Use few discrete levels (fail / pass / excellent) or — better — decompose into binary claims per criterion. Binary questions are the most reliable primitive an LLM judge has. |
| **Sycophancy toward the question** | Judge assumes an answer that *sounds* authoritative is grounded | Require rationale-first output (judge must quote the evidence before rendering the verdict) and give the judge the reference material (context, gold notes), not just the answer. |

Rubric design principles that fall out of this:

1. **Concrete criteria, one behavior each.** "Does the answer state the refund window in days?" not "Is the answer high quality?"
2. **Per-criterion binary checks beat a single holistic score.** Five binaries give you 5 bits of diagnosis; one 1–10 number gives you an argument in a meeting.
3. **Rationale before verdict.** Order matters in generation: forcing the judge to write its reasoning *before* emitting the boolean measurably improves agreement with humans (verdict-first lets the model rationalize a snap judgment).
4. **Give the judge the gold notes.** The SME's `rubricNotes` from the dataset schema go into the judge prompt.

**Interview trap:** "We use GPT/Claude to score outputs on a 1–10 scale and average the scores." Every part of that is a known failure mode: holistic numeric scale (central tendency), no rubric (unanchored), averaged (hides bimodality), no calibration (unknown agreement with humans), likely same-family judge (self-preference). The strong answer names the biases and the mitigations unprompted.

### Q8. How do you calibrate a judge against human labels? Show the math.

**Answer:**

A judge is a measurement instrument; you must establish that it agrees with the gold standard (humans) before trusting it. Procedure:

1. Have humans (ideally the customer's SMEs) label 50–100 outputs pass/fail against the rubric.
2. Run the judge on the same outputs.
3. Compute agreement — but **raw agreement is misleading** when classes are imbalanced (if 90% of outputs pass, a judge that always says "pass" gets 90% agreement). Use **Cohen's kappa**, which corrects for chance agreement:

```
κ = (p_o − p_e) / (1 − p_e)

p_o = observed agreement rate
p_e = expected agreement by chance
    = P(judge says pass)·P(human says pass) + P(judge says fail)·P(human says fail)
```

**Worked example** — 100 labeled outputs:

```
                     human: pass    human: fail
   judge: pass            60             10        → judge pass rate = 0.70
   judge: fail             5             25        → judge fail rate = 0.30
                    human pass rate = 0.65

p_o = (60 + 25) / 100 = 0.85
p_e = (0.70 × 0.65) + (0.30 × 0.35) = 0.455 + 0.105 = 0.56
κ   = (0.85 − 0.56) / (1 − 0.56) = 0.29 / 0.44 ≈ 0.66
```

Interpretation bands (rough convention): κ < 0.4 unusable, 0.4–0.6 weak, **0.6–0.8 acceptable for gating**, > 0.8 strong. This judge (κ ≈ 0.66) is usable, and its error pattern matters too: it fails-passes (10 false passes) more than it passes-fails (5) — so as a regression gate it is slightly *permissive*, which you should disclose.

Operational rules:

- **Only trust a judge above your κ threshold** (0.6 is a common bar for CI gates; higher for anything customer-facing).
- **Re-check calibration periodically** — after judge-model upgrades, after rubric edits, and quarterly regardless, because drift applies to judges too.
- **Calibrate per criterion**, not just overall. A judge can be excellent at "is the JSON complete" and terrible at "is the tone appropriate."

### Q9. Implement a rubric judge in TypeScript with structured output.

**Answer:**

Key implementation choices: per-criterion booleans, rationale field *ordered before* the verdict fields in the schema (generation order follows schema order), structured output via `output_config.format` so the score always parses, and a cheap-but-capable judge model (`claude-sonnet-5`).

```typescript
// judge.ts — rubric judge with structured output
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic(); // ANTHROPIC_API_KEY from env

export interface Criterion {
  id: string;          // "states_refund_window"
  question: string;    // binary, concrete: "Does the answer state the refund window in days?"
}

export interface JudgeVerdict {
  criteria: { id: string; rationale: string; pass: boolean }[];
  overallPass: boolean;   // derived: all criteria pass
  raw: string;
}

// JSON schema for the judge's output. NOTE: rationale is declared BEFORE pass —
// the model generates fields in schema order, and reasoning-before-verdict
// measurably improves agreement with human labels.
function verdictSchema(criteria: Criterion[]) {
  return {
    type: "object",
    properties: {
      criteria: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string", enum: criteria.map((c) => c.id) },
            rationale: { type: "string" }, // quote evidence from the answer first
            pass: { type: "boolean" },
          },
          required: ["id", "rationale", "pass"],
          additionalProperties: false,
        },
      },
    },
    required: ["criteria"],
    additionalProperties: false,
  } as const;
}

export async function judgeWithRubric(params: {
  question: string;
  answer: string;
  context?: string;       // retrieved docs / gold notes — ground the judge
  rubricNotes?: string;   // SME prose about what "correct" means for this case
  criteria: Criterion[];
}): Promise<JudgeVerdict> {
  const { question, answer, context, rubricNotes, criteria } = params;

  const response = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 2048,
    system:
      "You are a strict evaluator. For each criterion: first quote the specific " +
      "evidence from the answer (or note its absence) in `rationale`, THEN decide " +
      "`pass`. Judge only what is written — do not give credit for implied content. " +
      "Do not reward length, style, or confidence.",
    messages: [
      {
        role: "user",
        content: [
          `<question>\n${question}\n</question>`,
          context ? `<reference_context>\n${context}\n</reference_context>` : "",
          rubricNotes ? `<expert_notes>\n${rubricNotes}\n</expert_notes>` : "",
          `<answer_under_evaluation>\n${answer}\n</answer_under_evaluation>`,
          `<criteria>\n${criteria.map((c) => `- [${c.id}] ${c.question}`).join("\n")}\n</criteria>`,
        ].filter(Boolean).join("\n\n"),
      },
    ],
    // Structured output: the response text is guaranteed valid JSON per the schema,
    // so scores parse reliably in the harness — no regex, no retry-on-parse-error.
    output_config: {
      format: { type: "json_schema", schema: verdictSchema(criteria) },
    },
  });

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("judge returned no text block");

  const parsed = JSON.parse(text.text) as {
    criteria: { id: string; rationale: string; pass: boolean }[];
  };

  return {
    criteria: parsed.criteria,
    overallPass: parsed.criteria.every((c) => c.pass),
    raw: text.text,
  };
}
```

### Q10. Implement a pairwise judge with an order-swap consistency check.

**Answer:**

```typescript
// pairwise.ts — pairwise comparison judge with position-bias mitigation
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

type Pick = "A" | "B" | "TIE";
export interface PairwiseResult {
  winner: "candidate1" | "candidate2" | "tie";
  consistent: boolean; // did both orderings agree?
  passes: { order: "12" | "21"; pick: Pick; rationale: string }[];
}

const pairSchema = {
  type: "object",
  properties: {
    rationale: { type: "string" },                   // reason first
    pick: { type: "string", enum: ["A", "B", "TIE"] }, // verdict second
  },
  required: ["rationale", "pick"],
  additionalProperties: false,
} as const;

async function compareOnce(
  question: string, first: string, second: string, rubric: string,
): Promise<{ pick: Pick; rationale: string }> {
  const response = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    system:
      "Compare two answers against the rubric. Explain the decisive differences " +
      "in `rationale` first, then output `pick`. Prefer TIE when the difference " +
      "is stylistic. Never prefer an answer merely because it is longer.",
    messages: [{
      role: "user",
      content:
        `<question>\n${question}\n</question>\n\n<rubric>\n${rubric}\n</rubric>\n\n` +
        `<answer_A>\n${first}\n</answer_A>\n\n<answer_B>\n${second}\n</answer_B>`,
    }],
    output_config: { format: { type: "json_schema", schema: pairSchema } },
  });
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("no judge output");
  return JSON.parse(text.text);
}

export async function pairwiseJudge(
  question: string, candidate1: string, candidate2: string, rubric: string,
): Promise<PairwiseResult> {
  // Pass 1: candidate1 as A. Pass 2: swapped. Run both to cancel position bias.
  const [p1, p2] = await Promise.all([
    compareOnce(question, candidate1, candidate2, rubric),
    compareOnce(question, candidate2, candidate1, rubric),
  ]);

  // Map pass-2 pick back into candidate space (A in pass 2 is candidate2).
  const pick1: Pick = p1.pick;
  const pick2: Pick = p2.pick === "A" ? "B" : p2.pick === "B" ? "A" : "TIE";

  const consistent = pick1 === pick2;
  const winner = !consistent || pick1 === "TIE"
    ? "tie" // disagreement between orderings is recorded as a tie, not a coin flip
    : pick1 === "A" ? "candidate1" : "candidate2";

  return {
    winner, consistent,
    passes: [
      { order: "12", pick: p1.pick, rationale: p1.rationale },
      { order: "21", pick: p2.pick, rationale: p2.rationale },
    ],
  };
}
```

### Q11. Pairwise vs rubric (absolute) scoring — when do you use which?

**Answer:**

| Dimension | Pairwise comparison | Rubric / absolute scoring |
|---|---|---|
| Reliability on subjective quality | **Higher** — relative judgments ("which is better?") are easier and more consistent than absolute ones ("is this a 7?") | Lower on subjective axes, fine on concrete criteria |
| Needs a baseline output? | Yes — always comparing against something | No |
| Cost scaling | O(n) vs one baseline; O(n²)-ish for full tournaments among k variants | O(n) |
| Produces a CI-gateable number? | Awkward — "win rate vs baseline" moves whenever the baseline changes | **Yes** — pass rate against a fixed rubric is stable over time |
| Diagnosis value | Low (tells you *which*, not *why*) | High (per-criterion failures localize the problem) |

Decision rule:

- **Pairwise for A/B decisions**: "is prompt v12 better than v11?", "Sonnet vs Haiku for this task?" Run pairwise with order-swap on the eval set, report win/tie/loss. It is the most sensitive instrument for *relative* choices.
- **Rubric for regression gates and tracking**: CI thresholds, dashboards, SLA-style commitments to the customer need an absolute, baseline-independent number. "Faithfulness pass rate ≥ 95%" is a contract; "wins 60% of comparisons against whatever we had last month" is not.
- In practice you run both: rubric continuously, pairwise at decision points.

**Production war story:** A team tracked quality as "win rate vs baseline" where the baseline was silently updated to last-week's prompt at every release. Win rate hovered near 50% forever — because the system was being compared to a moving version of itself — while absolute faithfulness quietly degraded ~1% a week through accumulated prompt edits. Nobody noticed until a customer audit sampled outputs from three months earlier and current outputs side by side. Lesson: pairwise against a *moving* baseline measures churn, not quality. Keep a *pinned* baseline and an absolute rubric score.

---

## Building the Eval Pipeline

### Q12. Design the core eval harness. Show interfaces and the runner.

**Answer:**

The harness has three contracts — `EvalCase` (Q6), `Scorer`, `EvalRun` — plus a runner that handles concurrency and retries. Keep it boring; the value is in the dataset and scorers, not framework cleverness.

```typescript
// harness.ts — core interfaces and runner
import type { EvalCase, EvalDataset } from "./dataset";

export interface ScoreResult {
  scorerName: string;
  pass: boolean;
  score: number;            // 0..1; for binary scorers 0 or 1
  details?: unknown;        // e.g. judge rationales, diff of expected vs actual
}

export interface Scorer {
  name: string;
  score(c: EvalCase, output: string): Promise<ScoreResult>;
}

export interface CaseResult {
  caseId: string;
  output: string;
  scores: ScoreResult[];
  pass: boolean;            // all scorers passed
  latencyMs: number;
  error?: string;
}

export interface EvalRun {
  runId: string;            // e.g. `${datasetVersion}-${gitSha}-${timestamp}`
  datasetName: string;
  datasetVersion: string;
  promptVersion: string;    // git SHA or registry version of the prompt under test
  model: string;
  startedAt: string;
  results: CaseResult[];
}

// --- runner with bounded concurrency + retries ---------------------------

type TargetFn = (c: EvalCase) => Promise<string>; // the system under test

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** i + Math.random() * 250));
    }
  }
  throw lastErr;
}

export async function runEval(opts: {
  dataset: EvalDataset;
  target: TargetFn;
  scorers: Scorer[];
  promptVersion: string;
  model: string;
  concurrency?: number;     // stay under provider rate limits
}): Promise<EvalRun> {
  const { dataset, target, scorers, concurrency = 8 } = opts;
  const results: CaseResult[] = [];
  const queue = [...dataset.cases];

  async function worker() {
    for (let c = queue.shift(); c; c = queue.shift()) {
      const t0 = Date.now();
      try {
        const output = await withRetry(() => target(c));
        const scores = await Promise.all(scorers.map((s) => s.score(c, output)));
        results.push({
          caseId: c.id, output, scores,
          pass: scores.every((s) => s.pass),
          latencyMs: Date.now() - t0,
        });
      } catch (e) {
        results.push({
          caseId: c.id, output: "", scores: [], pass: false,
          latencyMs: Date.now() - t0, error: String(e),
        });
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));

  return {
    runId: `${dataset.version}-${opts.promptVersion}-${Date.now()}`,
    datasetName: dataset.name,
    datasetVersion: dataset.version,
    promptVersion: opts.promptVersion,
    model: opts.model,
    startedAt: new Date().toISOString(),
    results,
  };
}
```

Example scorers — exact-match, schema-valid, and the Q9 judge wrapped into the `Scorer` interface:

```typescript
// scorers.ts
import { judgeWithRubric, type Criterion } from "./judge";
import type { Scorer } from "./harness";

export const exactMatch: Scorer = {
  name: "exact-match",
  async score(c, output) {
    const pass = JSON.stringify(JSON.parse(output)) === JSON.stringify(c.expected.output);
    return { scorerName: this.name, pass, score: pass ? 1 : 0 };
  },
};

export function jsonSchemaScorer(validate: (o: unknown) => boolean): Scorer {
  return {
    name: "json-schema-valid",
    async score(_c, output) {
      let pass = false;
      try { pass = validate(JSON.parse(output)); } catch { /* parse fail -> fail */ }
      return { scorerName: "json-schema-valid", pass, score: pass ? 1 : 0 };
    },
  };
}

export function llmJudgeScorer(criteria: Criterion[]): Scorer {
  return {
    name: "llm-judge",
    async score(c, output) {
      const v = await judgeWithRubric({
        question: c.input.query,
        answer: output,
        rubricNotes: c.expected.rubricNotes,
        criteria,
      });
      const passed = v.criteria.filter((x) => x.pass).length;
      return {
        scorerName: "llm-judge",
        pass: v.overallPass,
        score: passed / v.criteria.length,
        details: v.criteria, // per-criterion rationales for debugging
      };
    },
  };
}
```

### Q13. How do you report results and detect regressions between runs?

**Answer:**

Persist every run as a JSON artifact, then diff runs *case by case* — the aggregate number is the headline, but the case-level flips are the actionable signal.

```typescript
// report.ts — aggregation, per-category breakdown, regression diff
import * as fs from "node:fs";
import type { EvalRun } from "./harness";
import type { EvalDataset } from "./dataset";

export interface RunReport {
  runId: string;
  passRate: number;
  meanScore: number;
  byCategory: Record<string, { n: number; passRate: number }>;
}

export function summarize(run: EvalRun, dataset: EvalDataset): RunReport {
  const catOf = new Map(dataset.cases.map((c) => [c.id, c.tags.category]));
  const byCategory: Record<string, { n: number; pass: number }> = {};
  let scoreSum = 0;

  for (const r of run.results) {
    const cat = catOf.get(r.caseId) ?? "unknown";
    byCategory[cat] ??= { n: 0, pass: 0 };
    byCategory[cat].n++;
    if (r.pass) byCategory[cat].pass++;
    scoreSum += r.scores.reduce((a, s) => a + s.score, 0) / Math.max(1, r.scores.length);
  }

  return {
    runId: run.runId,
    passRate: run.results.filter((r) => r.pass).length / run.results.length,
    meanScore: scoreSum / run.results.length,
    byCategory: Object.fromEntries(
      Object.entries(byCategory).map(([k, v]) => [k, { n: v.n, passRate: v.pass / v.n }]),
    ),
  };
}

export interface RegressionDiff {
  newlyFailing: string[];   // pass in baseline -> fail now (the alarm bell)
  newlyPassing: string[];   // fail -> pass (improvements)
  passRateDelta: number;
  verdict: "ok" | "regression";
}

export function diffRuns(baseline: EvalRun, current: EvalRun): RegressionDiff {
  const base = new Map(baseline.results.map((r) => [r.caseId, r.pass]));
  const newlyFailing: string[] = [];
  const newlyPassing: string[] = [];

  for (const r of current.results) {
    const was = base.get(r.caseId);
    if (was === true && !r.pass) newlyFailing.push(r.caseId);
    if (was === false && r.pass) newlyPassing.push(r.caseId);
  }

  const rate = (run: EvalRun) =>
    run.results.filter((r) => r.pass).length / run.results.length;

  return {
    newlyFailing, newlyPassing,
    passRateDelta: rate(current) - rate(baseline),
    // Gate on case flips, not only the aggregate: on a 200-case set the aggregate
    // moves ±3-5pp from noise (judge nondeterminism, transient errors), but a
    // specific case flipping pass->fail is inspectable evidence.
    verdict: newlyFailing.length > 0 ? "regression" : "ok",
  };
}

export function persistRun(run: EvalRun, dir = "eval-runs") {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(`${dir}/${run.runId}.json`, JSON.stringify(run, null, 2));
}
```

Statistical caution to state explicitly in an interview: on small sets, require the diff to be *interpreted*, not blindly gated. A single newly-failing case might be judge noise — the workflow is: flag → human reads the judge rationale for that case → confirm or override. Never let the gate auto-block on one flaky judge verdict without a rerun; a common pattern is "rerun newly-failing cases once; gate only on cases that fail twice."

### Q14. How do evals integrate with CI, and what does a run cost?

**Answer:**

**CI wiring:**

```
  PR touching prompts/, retrieval/, model config
        │
        ▼
  ┌───────────────────────────────┐     nightly cron
  │ SMOKE SUITE (30-50 cases)     │     ┌────────────────────────────────┐
  │ - stratified sample, all cats │     │ FULL SUITE (all cases incl.    │
  │ - assertions + judge          │     │ holdout) + pairwise vs pinned  │
  │ - gate: zero newly-failing    │     │ baseline + cost/latency report │
  │ - runtime target: < 5 min     │     │ - posts report to Slack        │
  └───────────────────────────────┘     └────────────────────────────────┘
        │ pass                                 │ regression
        ▼                                      ▼
     merge allowed                    page the owning engineer,
                                      block next release train
```

- **Per-PR: smoke subset.** Full suites are too slow/expensive per commit. Run a stratified ~30–50 case sample with the fastest scorers; gate merge on "no newly-failing cases."
- **Nightly: full suite** including the holdout set, with the judge scorers, diffed against the pinned baseline run. This also catches *provider-side* drift because it runs even when no code changed.
- **Prompts are code**: the prompt version (git SHA or registry version, see Q21) is stamped into every `EvalRun`, so any score is traceable to the exact prompt+model+dataset triple.

**Worked cost math** (judge on `claude-sonnet-5` at $3/1M input, $15/1M output; each judge call ~2,000 input tokens — question + answer + context + rubric — and ~200 output tokens of rationale + verdict):

```
per case:   2,000 × ($3 / 1M)  = $0.006  input
              200 × ($15 / 1M) = $0.003  output
                                 -------
                                 $0.009  per judged case

200-case full run:   200 × $0.009  =  $1.80 per run
per 1,000 evals:   1,000 × $0.009  =  $9.00
nightly for a month:  30 × $1.80   ≈  $54/month
```

Add the system-under-test's own generation cost (often larger than the judge cost). The punchline for customers: a rigorous nightly eval program costs tens of dollars a month — orders of magnitude less than one production quality incident. If cost pressure is real, drop the judge model to `claude-haiku-4-5` ($1/$5 → $0.003/case) for the smoke suite and keep `claude-sonnet-5` for nightly, or reserve `claude-opus-4-8` ($5/$25) for a small high-stakes subset where judge quality is paramount — but re-calibrate κ whenever you change the judge model.

**Interview trap:** Running the full eval suite with LLM judges on every commit "for safety." It's slow (developers start skipping it), expensive at scale, and mostly redundant. The senior answer is the two-tier design: cheap fast smoke per-PR, full suite nightly plus on-demand before releases — the same reasoning as unit vs integration test tiers.

---

## Online Evaluation

### Q15. Offline evals passed but the customer says it's worse. What's the offline/online gap, and what signals do you collect in production?

**Answer:**

The gap exists because offline evals test *your* distribution (the golden set, frozen months ago) while production serves *today's* distribution — new user segments, new phrasing, new documents, adversarial inputs, and context your eval pinned but production computes live (retrieval results change as the corpus changes). Offline evals are necessary, not sufficient; production needs its own measurement.

**Feedback signals, ranked by honesty:**

| Signal | Type | Caveats |
|---|---|---|
| Task completion (did the user's ticket get resolved? did they accept the draft?) | Implicit, outcome | The gold signal when you can define it; requires joining to downstream systems |
| Escalation-to-human rate | Implicit, outcome | Directly business-legible; lagging indicator |
| Regeneration / retry ("try again" clicks) | Implicit, behavioral | Strong dissatisfaction proxy, high volume |
| Copy events / answer adoption | Implicit, behavioral | Positive proxy; beware copying-to-mock |
| Follow-up rephrasings of the same question | Implicit, behavioral | Signals the first answer missed; needs session stitching |
| Explicit thumbs up/down | Explicit | **Sparse (often <1% of turns) and biased** — angry users vote more; never a denominator for quality claims |

Every signal must be **joined to the trace** (Q17) — a thumbs-down is only actionable if you can pull the exact prompt version, retrieved chunks, and model output that produced it. Logging schema sketch:

```typescript
interface FeedbackEvent {
  traceId: string;          // joins to the full trace
  sessionId: string;
  ts: string;
  kind: "thumbs_up" | "thumbs_down" | "regenerate" | "copy"
      | "rephrase" | "escalated" | "task_completed";
  promptVersion: string;    // denormalized for fast slicing
  model: string;
  variant?: string;         // A/B arm, if any
}
```

The loop closer: weekly, sample thumbs-down + escalated + regenerated traces, label them, and promote the real failures into the golden dataset (`source: "prod-incident"`). This is how the offline suite converges toward the online distribution.

### Q16. How do you A/B test prompt changes, and what do you do when the customer's traffic is too low for significance?

**Answer:**

**Mechanics of a prompt A/B:**

- **Assignment by stable hash** of user or session ID (`hash(userId + experimentName) % 100`), never per-request random — a user flip-flopping between variants mid-conversation contaminates both arms and confuses the user.
- **Primary metric decided in advance** (e.g., escalation rate), plus **guardrail metrics** that must not degrade (latency p95, cost per conversation, refusal rate, safety flags). A variant that wins the primary while doubling cost is not a win.
- **Stamp the variant into every trace** so offline analysis can slice by arm.

**The sample-size reality check** (same math as Q5): detecting a 5pp move in a ~80% metric needs ~900 conversations *per arm*. A customer doing 50 relevant conversations a day needs ~36 days per experiment — and most enterprise deployments the FDE touches are *smaller* than that. Options, in order of preference:

1. **Interleaving** (for ranking/retrieval changes): serve a blended result list from both variants to the *same* user and count which variant's items get engaged. Removes between-user variance; needs 10–100× less traffic than A/B.
2. **Sequential testing** (e.g., SPRT / always-valid p-values) instead of fixed-horizon tests: peek continuously and stop as soon as the evidence crosses a boundary, without the peeking penalty of naive repeated t-tests.
3. **Shadow deployment**: run the new prompt on a copy of real traffic, *don't* serve its output, score both outputs offline (pairwise judge from Q10 + assertions). You get the production input distribution with zero user risk and no significance wait — at the cost of measuring judged quality rather than true user outcomes.
4. **Accept the eval suite as the decision instrument** for small changes, and reserve online experiments for the few changes with large expected effects.

**Interview trap:** Proposing a classic A/B test to a customer with 30 conversations/day and promising "we'll know in a week." You won't — you'd detect only a catastrophic ~20pp effect in that window. Interviewers want you to do the power math out loud and then reach for interleaving, sequential tests, or shadow mode.

**Production war story:** A team shipped a "clearly better" prompt variant to 50% of traffic at a low-volume enterprise customer. After two weeks, the variant showed +4pp task completion — celebrated and rolled to 100%. The next month, aggregate metrics regressed to exactly the old level. The two-week "win" was noise (n ≈ 250/arm; the 95% CI on the delta was ±7pp and included zero). The costly part wasn't the rollout — the variant was genuinely neutral — it was that the team had burned its experiment credibility with the customer on a statistical mirage. They moved to shadow-scoring variants offline and only running online tests for changes with predicted effects > 10pp.

---

## Observability & Tracing

### Q17. Design tracing for an LLM application. What is a trace, what are the spans, and what do you record on an LLM span?

**Answer:**

**Trace = one user request, end to end. Span = one timed operation inside it**, in a parent-child tree. For a RAG request:

```
TRACE  trace_id=tr_9f2e  "answer user question"                     1,842 ms
│
├── span: guardrail.input_check                                        38 ms
├── span: retrieval.vector_search   (top_k=20, index=acme-kb-v7)      210 ms
│     └── attrs: query_hash, index_version, k, num_hits
├── span: retrieval.rerank          (20 → 5)                          145 ms
│     └── attrs: reranker_model, kept_ids=[d17,d03,d44,d91,d12]
├── span: llm.generate              (claude-sonnet-5)               1,310 ms
│     └── attrs: prompt_version=triage-v14 (sha 8a31f2c),
│                input_tokens=6,412  output_tokens=388
│                cache_read_tokens=5,100   cost_usd=0.0088
│                ttft_ms=420  stop_reason=end_turn
├── span: tool.exec crm.lookup_account                                 88 ms
│     └── attrs: tool_name, args_hash, success=true
└── span: guardrail.output_check                                       51 ms
```

**Per-LLM-span, record at minimum:**

| Field | Why |
|---|---|
| `model` (exact ID) | provider alias upgrades are a change you must be able to see |
| `prompt_version` / template hash | joins output quality to the exact prompt artifact |
| rendered prompt **or** template ref + variable hashes | debugging vs PII policy tradeoff (Q18) |
| `input_tokens`, `output_tokens`, `cache_read_tokens` | cost attribution; cache-hit-rate regressions are invisible without this |
| `cost_usd` (computed) | per-request, per-customer, per-feature cost slicing |
| latency: **TTFT + total** | TTFT is the UX number for streaming; total is the pipeline number |
| `stop_reason` | a rise in `max_tokens` stops = silent truncation; `refusal` spikes = safety incident |
| error class + retry count | separates provider flakiness from logic bugs |

**Why span-level rather than request-level logging:** when quality drops, the first question is *which stage* — retrieval returned bad chunks, rerank dropped the good one, or generation ignored good context. Span attributes answer that in one query ("show traces where the gold doc was retrieved but the answer scored unfaithful"). Request-level logs turn that into an archaeology project.

### Q18. The customer has strict PII rules and wants self-hosting. How do you do observability under those constraints, and what's the tools landscape?

**Answer:**

**PII-constrained tracing patterns** (typical in FDE deployments — the trace store is often *less* trusted than the app):

- **Log template refs + hashes instead of raw text** where policy requires: `prompt_version: triage-v14`, `variables_hash: sha256(...)`, `input_tokens: 6412` reconstruct *what shape* of request happened without storing the content. Debugging uses the template from git + the variable *names*.
- **Redaction pipeline** before the trace exporter: deterministic PII scrubbing (emails, phones, account numbers via patterns + NER) applied to any payload field that is stored. Redact at the SDK/collector edge, not in the backend — data that never leaves redacted is data you never have to purge.
- **Consent-gated raw sampling:** store full prompts/completions for a small sample (e.g., 1%) or for explicitly flagged debug sessions, only where the DPA permits; everything else gets hashes.
- **Retention windows:** raw payloads 7–30 days, metadata/metrics 13 months. Encode this in the tracing backend's config, not in a policy doc nobody enforces.

**Tools landscape:**

| Option | Model | FDE-relevant strengths | Watch out |
|---|---|---|---|
| **LangSmith** | SaaS (managed) | Polished UX, dataset+eval features integrated with tracing | Data leaves the customer's environment; often a non-starter for data-residency customers |
| **Langfuse** | OSS, self-hostable | **Often the FDE answer for data-residency customers** — runs in their VPC on Postgres/ClickHouse; traces, prompt registry, eval scores in one place | You (or the customer) operate it; feature lag vs SaaS |
| **OpenTelemetry GenAI semantic conventions** | Standard, not a product | Vendor-neutral `gen_ai.*` attributes (`gen_ai.request.model`, `gen_ai.usage.input_tokens`, ...); feeds the customer's **existing** Datadog/Grafana/Jaeger stack — no new vendor to procure | Conventions still stabilizing; no LLM-specific UI (no side-by-side prompt diffing) out of the box |

The staff-level framing: prefer OTel semantics as the *wire format* even when using an LLM-specific backend — it keeps the instrumentation portable, and enterprise customers already have OTel collectors, dashboards, and an approved vendor. The observability decision in an FDE engagement is usually a *procurement and data-governance* decision wearing a technical costume.

### Q19. Write a minimal OTel-style span wrapper around a Claude call.

**Answer:**

```typescript
// tracing.ts — minimal OTel-flavored span wrapper (no hard OTel dependency,
// but attribute names follow the gen_ai.* semantic conventions so the data
// drops into any OTel backend unchanged)
import Anthropic from "@anthropic-ai/sdk";
import { randomUUID, createHash } from "node:crypto";

const client = new Anthropic();

interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  attributes: Record<string, string | number | boolean>;
  status: "ok" | "error";
}

export function exportSpan(span: Span) {
  // stand-in for an OTel exporter / Langfuse client / log shipper
  console.log(JSON.stringify(span));
}

const sha = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 16);

// Pricing table for cost attribution (USD per 1M tokens)
const PRICE: Record<string, { in: number; out: number }> = {
  "claude-opus-4-8":  { in: 5, out: 25 },
  "claude-sonnet-5":  { in: 3, out: 15 },
  "claude-haiku-4-5": { in: 1, out: 5 },
};

export async function tracedGenerate(opts: {
  traceId: string;
  parentSpanId?: string;
  model: string;
  promptVersion: string;      // registry/git ref of the template
  system: string;
  userContent: string;
  maxTokens?: number;
  logRawPayloads?: boolean;   // consent/policy gate — default OFF
}): Promise<string> {
  const span: Span = {
    traceId: opts.traceId,
    spanId: randomUUID(),
    parentSpanId: opts.parentSpanId,
    name: "llm.generate",
    startTime: Date.now(),
    attributes: {
      "gen_ai.system": "anthropic",
      "gen_ai.request.model": opts.model,
      "app.prompt.version": opts.promptVersion,
      // PII-safe by default: hashes, not content
      "app.prompt.system_hash": sha(opts.system),
      "app.prompt.user_hash": sha(opts.userContent),
    },
    status: "ok",
  };
  if (opts.logRawPayloads) {
    span.attributes["gen_ai.prompt"] = opts.userContent; // only with consent
  }

  try {
    const response = await client.messages.create({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 2048,
      system: opts.system,
      messages: [{ role: "user", content: opts.userContent }],
    });

    const inTok = response.usage.input_tokens;
    const outTok = response.usage.output_tokens;
    const price = PRICE[opts.model] ?? { in: 0, out: 0 };

    span.attributes["gen_ai.usage.input_tokens"] = inTok;
    span.attributes["gen_ai.usage.output_tokens"] = outTok;
    span.attributes["gen_ai.usage.cache_read_tokens"] =
      response.usage.cache_read_input_tokens ?? 0;
    span.attributes["gen_ai.response.finish_reason"] = response.stop_reason ?? "";
    span.attributes["app.cost_usd"] =
      (inTok * price.in + outTok * price.out) / 1_000_000;

    const text = response.content.find((b) => b.type === "text");
    return text && text.type === "text" ? text.text : "";
  } catch (e) {
    span.status = "error";
    span.attributes["error.type"] = e instanceof Error ? e.name : "unknown";
    throw e;
  } finally {
    span.endTime = Date.now();
    exportSpan(span);
  }
}
```

For streaming, additionally record TTFT by timestamping the first `content_block_delta` event relative to span start — TTFT is the number users feel.

---

## Drift Detection & Incident Response

### Q20. What kinds of drift affect a deployed LLM system, and how do you detect each before the customer does?

**Answer:**

Four distinct kinds — conflating them leads to wrong diagnoses:

| Drift kind | What changes | Example | Detection |
|---|---|---|---|
| **Input drift** | User query distribution | New product launch → new vocabulary; new user segment onboarded | Embedding-distribution monitoring on incoming queries: embed a rolling window, compare against a reference window via centroid distance / population stability index over clusters; alert on sustained shift. Also: rising "no relevant docs retrieved" rate. |
| **Data drift** | The corpus / knowledge base | Customer replatforms their docs; policy pages rewritten | Index freshness metrics; retrieval-score distribution shifts; canary questions whose gold answers live in known docs. |
| **Model drift** | Provider updates an aliased model's behavior | Alias points to a new snapshot; subtle format/verbosity changes break downstream parsers | **Scheduled canary set**: a fixed 30–50 case subset scored daily against the production model, with alert thresholds. Since nothing on your side changed, a canary score drop isolates the provider variable. Pin dated snapshots where offered. |
| **Prompt drift** | Accumulated small edits | Six months of "just add one instruction" → a 4,000-token contradiction pile | Every prompt change goes through the eval suite (CI, Q14); periodic prompt review comparing current vs launch version; watch per-category scores, which degrade before the aggregate does. |

Alert design: **canary score** (daily, alert on drop > noise band established from 2 weeks of baseline runs, e.g. > 2σ or any 2 consecutive days below threshold), **online proxy metrics** (escalation rate, regeneration rate — hourly, alert on control-chart breach), **query-drift PSI** (weekly review, not paged). Route pages only on the first two; drift indices are for humans to review, not for waking anyone up.

**Production war story:** A document-extraction pipeline's schema-validity rate fell from 99.5% to ~91% overnight with zero deploys on the customer side. The provider had upgraded the model behind an alias; the new snapshot occasionally wrapped JSON in markdown fences, which the parser rejected. It was caught not by any human but by the *daily canary run*, whose schema-validity assertion dropped at 6am — hours before business-hours traffic. Fixes, in order: same-day mitigation by hardening the parser (strip fences), then migration to structured outputs (`output_config.format`) so validity became a guarantee instead of a hope, then a policy change: **pin dated model snapshots where offered, and treat any provider model upgrade as a change that must pass the full eval suite before adoption.**

### Q21. Prompts as deployable artifacts: show a prompt-registry pattern with versioning and rollback.

**Answer:**

An AI incident's fastest mitigation is usually *rollback*, and you can only roll back what is versioned and deployed *by reference*. Prompts must therefore be artifacts — versioned in git or a registry, resolved at runtime through an environment pin, never inlined as string literals scattered through app code. Rollback then = repoint the pin; no rebuild, no redeploy of application code.

```typescript
// promptRegistry.ts — versioned prompts + environment pinning
import { createHash } from "node:crypto";

export interface PromptVersion {
  name: string;             // "ticket-triage"
  version: string;          // "v14"
  contentHash: string;      // integrity check; also stamped into traces & eval runs
  template: string;         // with {{variables}}
  model: string;            // the model this version was evaluated against —
                            // prompt and model version travel TOGETHER
  createdAt: string;
  evalRunId?: string;       // the eval run that qualified this version (audit trail)
}

type Env = "dev" | "staging" | "prod";

export class PromptRegistry {
  private versions = new Map<string, PromptVersion>();          // "name@version"
  private pins = new Map<string, string>();                     // "env:name" -> version

  register(v: Omit<PromptVersion, "contentHash" | "createdAt">): PromptVersion {
    const full: PromptVersion = {
      ...v,
      contentHash: createHash("sha256").update(v.template).digest("hex").slice(0, 12),
      createdAt: new Date().toISOString(),
    };
    const key = `${v.name}@${v.version}`;
    if (this.versions.has(key)) throw new Error(`immutable: ${key} already registered`);
    this.versions.set(key, full);
    return full;
  }

  // Deploy = repoint. Rollback = repoint back. Same operation, seconds either way.
  pin(env: Env, name: string, version: string, opts?: { requireEval?: boolean }) {
    const v = this.versions.get(`${name}@${version}`);
    if (!v) throw new Error(`unknown version ${name}@${version}`);
    if (opts?.requireEval !== false && env === "prod" && !v.evalRunId) {
      throw new Error(`refusing to pin ${name}@${version} to prod without a passing eval run`);
    }
    this.pins.set(`${env}:${name}`, version);
  }

  resolve(env: Env, name: string): PromptVersion {
    const version = this.pins.get(`${env}:${name}`);
    if (!version) throw new Error(`no ${env} pin for prompt "${name}"`);
    return this.versions.get(`${name}@${version}`)!;
  }

  render(env: Env, name: string, vars: Record<string, string>) {
    const v = this.resolve(env, name);
    const text = v.template.replace(/\{\{(\w+)\}\}/g, (_, k) => {
      if (!(k in vars)) throw new Error(`missing template var ${k} for ${name}@${v.version}`);
      return vars[k];
    });
    // Return version metadata alongside — callers stamp it into the LLM span
    return { text, promptVersion: `${name}@${v.version}`, model: v.model, hash: v.contentHash };
  }
}

// --- usage ---------------------------------------------------------------
// const reg = new PromptRegistry();
// reg.register({ name: "ticket-triage", version: "v14", template: TRIAGE_V14,
//                model: "claude-sonnet-5", evalRunId: "run-8a31f2c-…" });
// reg.pin("prod", "ticket-triage", "v14");
// ...incident at 2am:
// reg.pin("prod", "ticket-triage", "v13");   // rollback = one repoint
```

Same discipline for models: `model` is part of the versioned artifact (a prompt is only qualified *against a model*), dated snapshots are pinned where the provider offers them, and repointing model or prompt goes through the same eval-gated pin operation.

**Interview trap:** "We keep the prompt in the codebase, so rollback is just reverting the commit." That couples prompt rollback to a full application deploy (build + release train + change-approval), turning a 30-second mitigation into an hour-plus one — and it lets prompts reach prod that never passed an eval, because nothing structurally enforces the gate. The registry makes the eval a *precondition of the pin*.

### Q22. Walk through incident response for an AI system. What does an incident look like, and what's the runbook?

**Answer:**

**AI incident classes** (different from classic outages — the system is usually *up* and confidently wrong):

1. **Quality regression** — canary score drop, escalation spike, judged faithfulness falling. Causes: model drift, prompt change, retrieval/corpus change.
2. **Cost spike** — token usage anomaly: cache hit rate collapsed (a silent prompt-prefix invalidator), a retry loop, a runaway agent, longer model outputs after a snapshot change.
3. **Safety incident** — jailbreak achieving off-policy output, PII leaking into responses or into logs, prompt-injected tool misuse. Highest severity; may carry disclosure obligations.
4. **Provider outage/degradation** — elevated 5xx/429s, latency blowup.

**Runbook:**

```
DETECT      canary score drop / online-metric alert / customer report
   │        → confirm on the trace: is it real, which segment, since when?
   ▼
MITIGATE    stop the bleeding FIRST, diagnose second:
   │        - rollback prompt pin to last-good version   (Q21 — seconds)
   │        - rollback / re-pin model snapshot
   │        - failover to secondary model or region
   │        - feature-flag the AI path off → fallback to human queue / static flow
   │          (every AI feature needs a non-AI fallback path designed in)
   ▼
DIAGNOSE    traces, not vibes:
   │        - diff failing traces vs last-good: prompt_version? model id?
   │          retrieval results? stop_reason distribution? cache hit rate?
   │        - reproduce a failing trace as a standalone eval case
   ▼
FIX + PROVE fix behind the eval suite: new case must fail before the fix,
   │        pass after, zero newly-failing elsewhere → re-pin forward
   ▼
POSTMORTEM  every incident becomes an eval case (or several) tagged
            source: "prod-incident" — the suite is the organizational memory
            that guarantees this exact failure cannot silently recur.
            Also ask: which ALERT was missing that would have caught it earlier?
```

Two staff-level points to land in interviews:

- **Mitigation must not wait on diagnosis.** The rollback targets (prompt pin, model pin, feature flag) exist precisely so you can restore service before you understand the root cause. If your architecture has no last-good version to point at, the incident review's first action item is building Q21.
- **The postmortem's canonical output is an eval case.** Classic ops postmortems produce action items that decay; the eval case is an action item that *executes on every future change*. Over time this is what makes the system anti-fragile: each incident permanently narrows the space of possible regressions — and it is, fittingly, one more piece of the FDE's #1 deliverable.

---

## Quick Reference: What "Good" Looks Like

- Golden set: 50–200 stratified cases to start, versioned, with a locked holdout; grows from production failures.
- Scorers: assertions first; judges only where needed, per-criterion binary, rationale-first, structured output, κ ≥ 0.6 vs humans and re-checked quarterly.
- Pipeline: per-PR smoke suite + nightly full suite; gate on newly-failing cases, not aggregate deltas; runs persisted as JSON with dataset/prompt/model versions.
- Cost: ~$0.009/judged case on claude-sonnet-5 (~$1.80 per 200-case run) — never a valid excuse to skip evals.
- Online: implicit signals (regenerate, escalate, complete) over sparse thumbs; interleaving/sequential/shadow when traffic is low.
- Observability: trace-per-request, span-per-stage, `gen_ai.*` attributes, prompt-version stamps, PII-safe hashing by default; Langfuse self-hosted or OTel-to-existing-stack for data-residency customers.
- Drift: daily canary set, pinned model snapshots, provider upgrades go through the eval suite.
- Incidents: rollback-by-repoint (prompt registry + env pins), AI-off feature flag, every incident becomes an eval case.
