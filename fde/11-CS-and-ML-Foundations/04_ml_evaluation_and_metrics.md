# ML Evaluation and Metrics - Senior Interview Deep Dive

> Module: CS & ML Foundations | Level: Senior/Staff | FDE Interview Prep

Metrics are where FDE and AI-engineer interviews get *specific*. "The model is 95% accurate" is the answer that ends interviews badly — because the follow-up is always "95% accurate on what class balance, and what does a mistake cost?" This file drills the evaluation machinery interviewers grill: the confusion matrix, precision vs recall (and choosing by the cost of false positives vs false negatives), F1/F-beta, ROC-AUC vs PR-AUC (and why PR-AUC for imbalanced data), accuracy's trap under imbalance, threshold selection and calibration, regression metrics (MAE/RMSE/R²), class-imbalance handling (resampling, SMOTE, class weights), and ranking/retrieval metrics (precision@k, recall@k, MRR, nDCG — which tie directly into RAG evaluation). Every concept comes with a **worked numeric example** so you can reproduce the arithmetic under pressure.

---

## The Confusion Matrix — The Foundation

### Q1. Define the confusion matrix and the four cells. Get the terminology exact.

**Answer:**

For binary classification, the confusion matrix cross-tabulates predictions against truth:

```
                    Predicted Positive    Predicted Negative
Actual Positive     True Positive (TP)     False Negative (FN)   <- a "miss"
Actual Negative     False Positive (FP)    True Negative (TN)
                    (a "false alarm")
```

- **TP** — predicted positive, actually positive (correct hit).
- **TN** — predicted negative, actually negative (correct rejection).
- **FP** — predicted positive, actually negative. **Type I error** — a "false alarm." (Flagged a legit transaction as fraud.)
- **FN** — predicted negative, actually positive. **Type II error** — a "miss." (Let real fraud through.)

Everything else is derived from these four numbers. The naming convention: the **second word is what you predicted** (Positive/Negative), the **first word is whether you were right** (True/False). So a "False Negative" = you predicted Negative and you were wrong (it was actually positive).

**Interview trap:** Swapping FP and FN under pressure. The reliable anchor: **False Negative = you said "no" but the answer was "yes" = you *missed* it.** In medical screening, a false negative is telling a sick patient they're healthy — the dangerous one. Pin every metric discussion to a concrete domain (fraud, disease, spam) so you never confuse the two; the whole cost analysis hinges on getting FP-vs-FN straight.

---

### Q2. Derive precision, recall, specificity, and accuracy from the four cells, with a worked example.

**Answer:**

The formulas:

- **Accuracy** = (TP + TN) / (TP + TN + FP + FN) — fraction correct overall.
- **Precision** = TP / (TP + FP) — of everything you *flagged positive*, how much was right. "When I say positive, how often am I correct?"
- **Recall** (sensitivity, true positive rate) = TP / (TP + FN) — of all *actual positives*, how many did you catch. "Of the real cases, how many did I find?"
- **Specificity** (true negative rate) = TN / (TN + FP) — of all actual negatives, how many correctly cleared.

**Worked example.** A fraud model runs on 10,000 transactions; 100 are actually fraud. It flags 80 real frauds (TP), misses 20 (FN), and false-alarms on 300 legit transactions (FP); the remaining 9,600 legit are correctly cleared (TN).

- Accuracy = (80 + 9600) / 10000 = **96.8%** — sounds great...
- Precision = 80 / (80 + 300) = 80/380 = **21.1%** — of flagged transactions, only 1 in 5 is real fraud.
- Recall = 80 / (80 + 20) = 80/100 = **80%** — caught 80% of the fraud.
- Specificity = 9600 / (9600 + 300) = **97.0%**.

The 96.8% accuracy hides that precision is a dismal 21% — 4 out of every 5 alerts are false alarms, which would swamp a fraud-investigation team.

**Interview trap:** Reporting accuracy (96.8%) as the headline and stopping. The story is in precision and recall: high recall (catching fraud) but low precision (too many false alarms). Which matters more depends on cost — investigating false alarms is expensive, but missing fraud is worse. Always compute precision *and* recall from the matrix and interpret them against the business cost, never accuracy alone.

---

### Q3. Precision vs recall — how do you choose which to prioritize? Give the cost-driven rule.

**Answer:**

You prioritize based on **which error is more expensive: a false positive or a false negative.**

- **Optimize recall (minimize false negatives) when a MISS is catastrophic:**
  - **Medical screening / disease detection** — missing a cancer (FN) can kill; a false alarm (FP) just triggers a follow-up test. Catch every real case; tolerate extra false alarms.
  - **Fraud detection** — missing fraud loses money and trust; a false alarm costs one review. (Though at extreme scale, precision matters too — see the war story.)
  - **Security threat detection** — missing an intrusion is far worse than investigating a false one.

- **Optimize precision (minimize false positives) when a FALSE ALARM is costly:**
  - **Spam filtering** — a false positive sends a legit important email (a job offer, an invoice) to the spam folder — worse than letting one spam through. Be sure before you flag.
  - **Content moderation / auto-blocking** — wrongly removing legitimate content angers users and looks like censorship.
  - **Recommendation / ad targeting** — showing an irrelevant recommendation (FP) wastes the one slot you have.

The mental model: **recall = "catch them all" (fear of missing); precision = "be sure before you act" (fear of false alarms).** State the domain, identify which error hurts more, and pick accordingly. Often you tune the threshold (Q8) to trade one for the other.

**Interview trap:** Giving a generic "F1 balances them" answer without engaging the *cost*. The interviewer wants to see you reason: "In this fraud case, a missed fraud costs $500 average, a false alarm costs $5 of analyst time, so I'd lean toward recall — but if false alarms are 100x more frequent, the total review cost could dominate, so I'd set the threshold to keep the alert volume within the team's capacity." That cost arithmetic is the senior signal.

**Production war story:** A fraud team optimized purely for recall and caught 98% of fraud — but precision was 3%, so investigators drowned in false alarms, real fraud slipped through *because analysts were overwhelmed*, and legitimate customers got their cards frozen. They re-tuned to balance precision against the analyst team's actual review capacity (a **precision@budget** constraint: maximize recall subject to no more than N alerts/day). Fraud losses dropped even though raw recall fell — because the alerts were now actionable. Metric choice is an operational decision, not just a math one.

---

### Q4. F1 score and F-beta — what are they and when do you use each?

**Answer:**

**F1 = 2 · (precision · recall) / (precision + recall)** — the *harmonic* mean of precision and recall. It's a single number that's high only when *both* precision and recall are high; it punishes imbalance between them. Use F1 when you need one metric to optimize/compare and false positives and false negatives are roughly equally bad.

Why harmonic, not arithmetic mean: the harmonic mean is dominated by the smaller value. If precision = 1.0 and recall = 0.0, the arithmetic mean is a misleadingly rosy 0.5, but F1 = 2·(1·0)/(1+0) = **0**. F1 refuses to reward a model that's great on one axis and useless on the other.

**F-beta** generalizes it with a weight β on recall: **Fβ = (1+β²) · (precision · recall) / (β²·precision + recall)**.
- **β = 1** → F1 (balanced).
- **β = 2** (F2) → weights **recall higher** (use when misses are worse — medical, fraud).
- **β = 0.5** (F0.5) → weights **precision higher** (use when false alarms are worse — spam).

**Worked example** with precision = 0.211, recall = 0.80 (from Q2's fraud model):
- F1 = 2·(0.211·0.80)/(0.211+0.80) = 2·0.169/1.011 = 0.338/1.011 = **0.334**.
- F2 (recall-weighted) = 5·(0.211·0.80)/(4·0.211 + 0.80) = 5·0.169/(0.844+0.80) = 0.845/1.644 = **0.514** — higher, because we value the strong recall more.

**Interview trap:** Treating F1 as a universal "best" metric. F1 assumes precision and recall matter *equally*, which is rarely true — the cost asymmetry usually favors one. If misses are worse, F2 is the honest objective; if false alarms are worse, F0.5. Also, F1 ignores true negatives entirely, which is exactly why it's useful for imbalanced data (where TN dominates and would inflate accuracy) but means it's not the right metric when true-negative correctness matters.

---

## The Imbalance Trap

### Q5. Why is accuracy dangerous under class imbalance? Show the trap numerically.

**Answer:**

**Worked example.** A dataset of 100,000 transactions has 500 frauds (0.5%) and 99,500 legit (99.5%). A lazy model that predicts "legitimate" for *everything*:

- Accuracy = 99,500 / 100,000 = **99.5%** — looks near-perfect.
- Recall (fraud) = 0 / 500 = **0%** — catches literally zero fraud.
- Precision (fraud) = 0/0 = **undefined** (it never predicts positive).

The model is worthless — it provides zero fraud detection — yet its accuracy (99.5%) beats what many real, useful models achieve. **Accuracy rewards predicting the majority class**, so on imbalanced data it's not just uninformative, it's actively misleading: a do-nothing baseline "wins."

The fix is to use metrics that focus on the minority (positive) class: **precision, recall, F1/F-beta, and PR-AUC** — none of which are fooled by a wall of true negatives. (Recall = 0 immediately exposes the lazy model.)

**Interview trap:** Quoting accuracy on any imbalanced problem. The reflex must be: **check the class balance first.** If it's skewed (fraud, disease, defect detection, rare-event prediction — anything where positives are <10%), announce it and switch to precision/recall/F1/PR-AUC. Saying "before I trust accuracy, what's the class balance?" is the sentence that signals you've done this for real. A model can be 99.5% accurate and 0% useful.

---

### Q6. How do you handle class imbalance? Give the toolkit and when to use each.

**Answer:**

Imbalance handling operates at three levels — data, algorithm, and metric — and you usually combine them:

**Data-level (resampling):**
- **Oversampling the minority** — duplicate or synthesize minority examples. Simple duplication risks overfitting to those exact points.
- **SMOTE (Synthetic Minority Over-sampling Technique)** — create *synthetic* minority examples by interpolating between a minority point and its nearest minority neighbors. Adds variety instead of duplicates, reducing overfitting. Caveat: can create unrealistic points in messy feature spaces, and must be applied **only to training folds** (SMOTE-ing before the split leaks).
- **Undersampling the majority** — drop majority examples to balance. Fast, but throws away data (information loss); good when the majority class is huge.

**Algorithm-level:**
- **Class weights / cost-sensitive learning** — tell the model to penalize minority-class errors more (e.g. `class_weight='balanced'` in sklearn, `scale_pos_weight` in XGBoost). Often the *cleanest* fix — no data manipulation, and it directly encodes the cost asymmetry. Preferred first move.

**Metric-level:**
- **Use the right metric** — precision/recall/F-beta and **PR-AUC**, never accuracy. Set the operating threshold by cost (Q8).

**Interview trap 1:** Applying SMOTE or any resampling to the *whole dataset before splitting*. Synthetic minority points then leak between train and test (a test point may be interpolated from a train point), inflating scores. **Resample inside the training fold only**, after the split — ideally in a pipeline so cross-validation does it per-fold.

**Interview trap 2:** Reaching for SMOTE first when **class weights** are simpler and often as effective. The senior order: try class weights → adjust the threshold → then resampling if still needed. And always pair any of these with the **right metric** — resampling that improves accuracy but not recall/PR-AUC solved nothing.

---

## ROC vs PR Curves

### Q7. Explain ROC-AUC and PR-AUC. Why prefer PR-AUC for imbalanced data?

**Answer:**

Both summarize a classifier's performance *across all thresholds*, but they plot different things:

- **ROC curve** plots **True Positive Rate (recall)** vs **False Positive Rate** (FP / (FP+TN)) as the threshold sweeps from strict to lenient. **ROC-AUC** = area under it; 0.5 = random, 1.0 = perfect. It answers "how well does the model rank a random positive above a random negative?"
- **PR curve** plots **Precision** vs **Recall** across thresholds. **PR-AUC** (a.k.a. average precision) = area under it.

The key difference under **imbalance**: the ROC's x-axis, **False Positive Rate = FP/(FP+TN)**, has the huge negative count (TN) in its denominator. When negatives vastly outnumber positives, even *thousands* of false positives barely move the FPR (because TN is enormous), so the ROC curve looks **optimistically good** even for a model drowning in false alarms. **Precision = TP/(TP+FP)** has no TN term — it directly reflects how many of your positive predictions are wrong, so PR-AUC stays honest and punishes false alarms.

**Worked intuition.** With 500 positives and 99,500 negatives, a model producing 500 TP and 5,000 FP: FPR = 5000/99500 ≈ 5% (ROC looks fine), but precision = 500/5500 = 9% (PR-AUC exposes the disaster). ROC-AUC might read 0.95 while PR-AUC reads 0.20 on the *same* model.

**Rule:** balanced classes or you care about ranking overall → **ROC-AUC** is fine. Heavy imbalance and you care about the positive (minority) class → **PR-AUC**, because it reflects the false-alarm cost that ROC hides.

**Interview trap:** Reporting a rosy ROC-AUC (0.95) on a 1%-positive problem and calling the model great. Under strong imbalance ROC-AUC is inflated and can mask a useless model — **PR-AUC** is the honest summary. Knowing *why* (FPR's denominator is dominated by TN, so false positives are diluted) is the depth that separates a memorized "use PR-AUC" from real understanding.

---

## Thresholds and Calibration

### Q8. Classifiers output probabilities — how do you choose the decision threshold?

**Answer:**

A classifier outputs a probability (e.g. 0.73 fraud); you convert it to a decision by comparing to a **threshold** (default 0.5, but 0.5 is rarely optimal). Choosing the threshold *is* how you trade precision against recall for your specific cost structure:

- **Lower the threshold** (e.g. 0.3) → predict positive more readily → **higher recall, lower precision** (catch more, more false alarms). Use when misses are costly.
- **Raise the threshold** (e.g. 0.7) → predict positive only when confident → **higher precision, lower recall** (fewer false alarms, more misses). Use when false alarms are costly.

Methods to pick it:
1. **Cost-based** — assign a dollar cost to FP and FN, then choose the threshold minimizing total expected cost. The most principled when you have the costs.
2. **Precision/recall target** — pick the threshold that hits a required recall (e.g. "must catch ≥95% of fraud") or precision (e.g. "≤5% false-alarm rate"), read off the PR curve.
3. **Maximize F1/F-beta** — sweep thresholds, pick the one maximizing your chosen Fβ.
4. **Capacity-constrained** — "we can only review 100 alerts/day," so set the threshold that yields ~100 positives (precision@budget).

Critically, tune the threshold on the **validation set**, not the test set, and re-check it on the true class distribution you'll see in production.

**Interview trap:** Assuming 0.5 is "the" threshold. 0.5 is just the default and is optimal only for balanced classes with symmetric costs — both rare. The senior move: "I'd sweep the threshold on validation and pick it by the business cost of FP vs FN, or to hit a required recall — 0.5 is almost never the right operating point for an imbalanced or cost-asymmetric problem."

---

### Q9. What is calibration, and why might a model with great AUC still be untrustworthy?

**Answer:**

A model is **calibrated** if its predicted probabilities match observed frequencies: among all cases where it says "70% likely," about 70% should actually be positive. **Ranking quality (AUC) and calibration are different things** — a model can rank perfectly (AUC 1.0) yet output miscalibrated probabilities (e.g. always says 0.9 for positives and 0.1 for negatives when the true rates are 0.6 and 0.3).

Calibration matters when you *use the probability itself*, not just the ranking:
- **Expected-value decisions** — "if P(fraud) × transaction_amount > review_cost, investigate" requires the probability to be *accurate*, not just correctly ordered.
- **Thresholding by probability**, combining model outputs, or showing confidence to users.

Diagnose with a **reliability diagram** (plot predicted probability vs actual frequency in bins; a calibrated model lies on the diagonal) or the **Brier score** (mean squared error of probabilities). Fix miscalibration with **Platt scaling** (fit a logistic on the model's outputs) or **isotonic regression** (non-parametric, needs more data). Note: some models are inherently miscalibrated — boosted trees tend to be overconfident, SVMs output non-probabilistic scores — while well-regularized logistic regression is usually well-calibrated by construction.

**Interview trap:** Assuming a high-AUC model gives usable probabilities. AUC measures *ordering*, not probability accuracy. If a downstream decision multiplies the probability by a dollar amount, an uncalibrated 0.9 (that really means 0.6) causes systematically wrong decisions. When the *value* of the probability matters, check calibration and apply Platt/isotonic scaling — mentioning this unprompted signals production maturity.

---

## Regression Metrics

### Q10. MAE vs MSE/RMSE vs R² — define them and say when each is right.

**Answer:**

For predicting a continuous value:

- **MAE (Mean Absolute Error)** = mean of |ŷ − y|. Average absolute miss, in the target's units. **Robust to outliers** (each error contributes linearly). "On average we're off by MAE units."
- **MSE (Mean Squared Error)** = mean of (ŷ − y)². Squares the errors, so **large errors dominate** — penalizes big misses heavily. Units are squared (hard to interpret directly).
- **RMSE (Root MSE)** = √MSE. Back in the target's units (interpretable like MAE) but still **outlier-sensitive** because of the squaring inside. RMSE ≥ MAE always; the gap grows with error variance/outliers.
- **R² (coefficient of determination)** = 1 − (SS_residual / SS_total). Fraction of variance explained; 1.0 = perfect, 0 = no better than predicting the mean, **negative = worse than the mean**. Unitless, good for comparing across datasets.

**Worked example.** True = [10, 20, 30], Predicted = [12, 18, 40]. Errors = [+2, −2, +10].
- MAE = (2 + 2 + 10)/3 = 14/3 = **4.67**.
- MSE = (4 + 4 + 100)/3 = 108/3 = **36**.
- RMSE = √36 = **6.0** — notably larger than MAE (4.67) because the one big error (+10) is squared and dominates.
- R²: SS_res = 4+4+100 = 108; mean of truth = 20, SS_tot = (10−20)²+(20−20)²+(30−20)² = 100+0+100 = 200; R² = 1 − 108/200 = 1 − 0.54 = **0.46**.

The RMSE-vs-MAE gap (6.0 vs 4.67) is itself diagnostic: a large gap signals a few big errors (outliers) dragging RMSE up.

**Interview trap:** Using RMSE by default when the domain has outliers you *don't* want to over-weight. If occasional huge errors are acceptable or the data has heavy-tailed noise, **MAE** is more robust and honest. Use **RMSE/MSE when large errors are disproportionately bad** (you genuinely want to punish big misses — e.g. a demand forecast where a huge miss causes stockouts). Choose the metric by whether big errors deserve extra penalty, and know that MSE is what most models actually optimize (differentiable, penalizes large errors).

**Interview trap 2:** Trusting **R²** blindly — it always increases (or stays flat) as you add features, even useless ones, so use **adjusted R²** when comparing models with different feature counts. And a high R² can still hide large absolute errors if the target has high variance; always pair R² with MAE/RMSE in the target's units so the number is grounded.

---

## Ranking & Retrieval Metrics (RAG Connection)

### Q11. Precision@k and Recall@k — define them for a ranked list, with a worked example.

**Answer:**

For ranking/retrieval (search, recommendations, and **RAG retrieval**), you evaluate the *top-k* results, because users only look at the first few:

- **Precision@k** = (relevant items in top k) / k — of the k you showed, what fraction were relevant.
- **Recall@k** = (relevant items in top k) / (total relevant items that exist) — of all the relevant items, what fraction made it into the top k.

**Worked example.** A query has 5 truly relevant documents in the corpus. Your retriever returns 10, ranked; the relevant ones land at positions 1, 2, 4, 7 (4 of the 5 retrieved in the top 10; one relevant doc missed entirely).
- Precision@5 = (relevant in top 5) / 5 = positions 1,2,4 are relevant → 3/5 = **0.60**.
- Recall@5 = (relevant in top 5) / (total relevant = 5) = 3/5 = **0.60**.
- Precision@10 = 4/10 = **0.40** (the 4 relevant among 10).
- Recall@10 = 4/5 = **0.80** (caught 4 of the 5 relevant).

Note the tension: as k grows, recall rises (you include more, catching more relevant) but precision typically falls (you dilute with irrelevant). This is the **retrieval quality knob in RAG** — retrieve more chunks (higher recall, the LLM sees the needed context) vs fewer (higher precision, less noise/cost).

**Interview trap:** Confusing precision@k and recall@k — the denominator distinguishes them. **Precision@k's denominator is k** (what you showed); **recall@k's denominator is the total number of relevant items** (what exists). In RAG, low **recall@k** means the answer chunk never got retrieved (the generator can't cite what it never saw — a retrieval failure); low **precision@k** means lots of irrelevant chunks crowd the context (noise, cost, and distraction). Diagnosing which one is broken tells you whether to fix retrieval breadth or ranking.

---

### Q12. MRR (Mean Reciprocal Rank) — what it measures and when to use it.

**Answer:**

**MRR** = mean over queries of (1 / rank of the *first* relevant result). It rewards putting a relevant item **high** and cares only about the **first** correct hit — ideal when the user needs *one* good answer fast (a single fact, a known-item search, "the" answer in a QA/RAG system).

**Worked example.** Three queries; the first relevant result appears at rank 1, rank 3, and rank 2 respectively.
- Reciprocal ranks = 1/1, 1/3, 1/2 = 1.0, 0.333, 0.5.
- MRR = (1.0 + 0.333 + 0.5) / 3 = 1.833/3 = **0.611**.

If the first relevant result is at rank 1, that query contributes 1.0; at rank 2, 0.5; at rank 10, 0.1 — the reciprocal falls off fast, so MRR strongly rewards getting *a* right answer into the top spots. If no relevant result appears at all, that query contributes 0.

**Interview trap:** Using MRR when the task actually needs *multiple* relevant results (e.g. "show me all the related documents"). MRR only looks at the *first* hit and ignores everything after it — a system that returns one relevant doc at rank 1 and nothing else relevant scores a perfect 1.0, even if 9 other relevant docs were missed. For "find all relevant" use recall@k or nDCG; reserve MRR for "find one good answer" tasks like known-item search or single-answer QA/RAG.

---

### Q13. nDCG — what does it add over precision@k, and how does it work?

**Answer:**

**nDCG (normalized Discounted Cumulative Gain)** improves on precision@k in two ways: it handles **graded relevance** (results can be "perfect / good / okay / irrelevant," not just binary relevant/not) and it **discounts by position** (a relevant result at rank 1 is worth more than the same result at rank 10, matching how users actually scan).

Mechanics:
- **DCG@k** = Σ (relevance_i / log₂(i + 1)) over positions i = 1..k. The `log₂(i+1)` denominator discounts lower ranks — position 1 divides by log₂(2)=1, position 2 by log₂(3)≈1.585, and so on.
- **IDCG@k** = the DCG of the *ideal* ordering (most relevant first) — the best possible score.
- **nDCG@k = DCG@k / IDCG@k**, normalizing to [0, 1] so scores are comparable across queries with different numbers of relevant items.

**Worked example.** Top-3 results have graded relevances [3, 1, 2] (on a 0–3 scale).
- DCG = 3/log₂2 + 1/log₂3 + 2/log₂4 = 3/1 + 1/1.585 + 2/2 = 3 + 0.631 + 1.0 = **4.631**.
- Ideal order would be [3, 2, 1]: IDCG = 3/1 + 2/1.585 + 1/2 = 3 + 1.262 + 0.5 = **4.762**.
- nDCG = 4.631 / 4.762 = **0.973** — near-ideal ranking.

**Interview trap:** Reaching for nDCG when relevance is genuinely binary and position weighting isn't needed — then precision@k is simpler and communicates more clearly. Use **nDCG when relevance is graded and rank position matters** (web search, recommendation feeds, RAG reranking where "highly relevant vs marginally relevant" is a real distinction). The normalization (dividing by IDCG) is what makes nDCG comparable across queries — without it, a query with more relevant docs would score higher just for having more, not for ranking better.

---

### Q14. Tie these ranking metrics back to evaluating a RAG system concretely.

**Answer:**

RAG evaluation splits into **retrieval** quality and **generation** quality; the ranking metrics evaluate the retrieval half, which is where most RAG failures actually originate:

- **Recall@k** — did the chunk containing the answer make it into the top-k passed to the LLM? **This is the most important retrieval metric for RAG** — if recall@k is low, the correct context never reaches the generator, and no amount of prompt engineering can fix a missing fact. Low recall@k → improve chunking, embeddings, or retrieve more (higher k) / add hybrid search.
- **Precision@k / nDCG@k** — are the retrieved chunks actually relevant and well-ordered? Low precision → the context window fills with noise, raising cost and distracting the model (and pushing the real answer out of the model's attention). Fix with reranking.
- **MRR** — for single-answer QA, is the answer-bearing chunk ranked first? Rerankers optimize this.

The generation half needs different metrics — **faithfulness/groundedness** (does the answer stick to the retrieved context, or hallucinate?), **answer relevance**, and often an **LLM-as-judge** rubric — which the AI-Engineering module (08) covers in depth.

**Interview trap:** Evaluating a RAG system end-to-end only (final answer quality) without separately measuring **retrieval recall**. If the answer is wrong, you can't tell whether retrieval failed (the chunk wasn't fetched — a recall@k problem) or generation failed (the chunk was there but the LLM ignored/misused it — a faithfulness problem). Measuring retrieval recall@k *separately* localizes the failure: fix the retriever vs fix the prompt/generation. This decomposition is exactly the debugging discipline an FDE brings to a customer's broken RAG pipeline.

**Production war story:** A customer's RAG chatbot gave wrong answers ~30% of the time and the team kept rewriting the system prompt. Measuring **recall@5** revealed the answer chunk was retrieved only 55% of the time — the real problem was chunking (answers split across chunk boundaries) and embedding mismatch, not the prompt. Fixing chunk size and adding hybrid (keyword + vector) search lifted recall@5 to 90% and the wrong-answer rate collapsed. Without the retrieval metric, they'd have kept tuning the wrong component. Measure the pieces separately.

---

### Q15. How do you evaluate a multiclass classifier — what changes from binary?

**Answer:**

With more than two classes, precision/recall/F1 are computed **per class** (one-vs-rest), then aggregated. The aggregation choice matters:

- **Macro-average** — compute the metric for each class, then take the unweighted mean. **Treats every class equally regardless of size** — so it surfaces poor performance on rare classes. Use when minority-class performance matters (usually the point).
- **Micro-average** — pool all TP/FP/FN across classes, then compute one metric. **Dominated by the large classes** (equivalent to overall accuracy for single-label problems). Use when every *instance* matters equally.
- **Weighted-average** — per-class metric weighted by class support (count). A compromise; reflects overall performance but still lets big classes dominate.

The **confusion matrix** becomes n×n, and reading it reveals *which* classes get confused for which (e.g. "class 3 is frequently misclassified as class 5") — far more actionable than a single number.

**Worked intuition.** With classes of size [900, 90, 10] and per-class recall [0.95, 0.70, 0.20]: macro recall = (0.95+0.70+0.20)/3 = **0.617** (the rare class's failure drags it down); micro/weighted recall ≈ 0.92 (dominated by the big class). The gap between macro and micro *is the signal* that a minority class is being neglected.

**Interview trap:** Reporting only micro-average (or overall accuracy) on an imbalanced multiclass problem, hiding that rare-but-important classes perform terribly. If the rare classes are the ones you care about (rare disease subtypes, rare fraud patterns), **macro-average** is the honest metric — and the macro-vs-micro gap itself diagnoses class neglect. Always look at the per-class breakdown and the confusion matrix, not just the aggregate.

---

### Q16. What's the difference between offline metrics and online metrics, and why does it matter?

**Answer:**

- **Offline metrics** are computed on a static held-out dataset before deployment (precision, recall, AUC, nDCG). They're cheap, repeatable, and necessary for model selection — but they measure *predictive* quality on historical data, not *business* impact.
- **Online metrics** are measured on live traffic after deployment (via A/B tests): click-through rate, conversion, revenue, user engagement, task-completion rate, latency. They measure what the business actually cares about.

The two can **diverge**: a model with better offline AUC can perform *worse* online because offline metrics don't capture user behavior, feedback loops, distribution shift, latency effects, or the fact that the model's own recommendations change what data you collect next. The gold standard is to validate offline (to decide *what to ship*), then confirm with an **online A/B test** on a business metric (to decide *whether it actually helped*).

**Interview trap:** Believing that better offline metrics guarantee better business outcomes. They don't — offline is a *proxy*. A recommendation model with higher offline precision might tank engagement because it's less diverse, or a fraud model with better AUC might hurt revenue by declining too many legit transactions. The senior framing: "offline metrics gate what we're *allowed* to ship; an online A/B test on the real business KPI decides whether it *actually* wins." Bridging offline and online is core FDE judgment — the customer cares about revenue and user outcomes, not your validation AUC.

---

### Q17. How do you know your evaluation itself is trustworthy? (Evaluation of the evaluation.)

**Answer:**

Metrics lie if the evaluation setup is flawed. The trust checklist:

1. **Representative test set.** The test data must match the production distribution. If your test set is from last year and the world shifted (distribution shift), the metric is stale. For temporal data, test on a *recent future* window.
2. **Enough data for stable estimates.** A recall of "3/4 = 75%" on 4 positive examples is statistical noise — report **confidence intervals** (bootstrap the metric) so you don't over-read a lucky number. Small test sets give wide, untrustworthy estimates.
3. **No leakage into evaluation** (file 03) — preprocessing fit on train only, no entity/time overlap between train and test.
4. **The metric matches the objective** — you're measuring what the business cares about, with the cost-appropriate metric, not a convenient default.
5. **Statistical significance for comparisons** — when comparing two models or A/B variants, is the difference significant or within noise? Use a significance test, don't ship on a 0.3% difference that's inside the confidence interval.
6. **Slice-based evaluation** — check performance on important *subgroups* (by region, user segment, device), not just the aggregate. An aggregate metric can hide catastrophic failure on a critical slice (fairness and reliability both live here).

**Interview trap:** Trusting a single point-estimate metric on a small or unrepresentative test set. "Model A got 82.1% and Model B got 82.4%, ship B" is meaningless if the confidence interval is ±3%. Senior evaluation reports **uncertainty** (intervals), checks **slices**, confirms the **test set is representative**, and tests **significance** before declaring a winner. Evaluating the evaluation is itself a seniority signal — and it's exactly the rigor a customer needs when a model's decisions carry real cost.

---

### Q18. Summarize the metric-selection decision — which metric for which situation?

**Answer:**

The master selection table interviewers want you to navigate fluently:

| Situation | Primary metric(s) | Why |
|---|---|---|
| Balanced binary classification | Accuracy, ROC-AUC, F1 | Accuracy is meaningful when balanced |
| Imbalanced classification | Precision, recall, F-beta, **PR-AUC** | Accuracy/ROC-AUC inflated by majority/TN |
| Miss is catastrophic (medical, fraud, security) | **Recall** (F2) | Minimize false negatives |
| False alarm is costly (spam, moderation) | **Precision** (F0.5) | Minimize false positives |
| Need probabilities for downstream decisions | Calibration (reliability, Brier) + AUC | Ranking ≠ calibrated probability |
| Regression, outliers present | **MAE** | Robust to outliers |
| Regression, big misses very bad | **RMSE/MSE** | Penalizes large errors |
| Regression, compare across datasets | R² (adjusted) | Unitless, variance-explained |
| Ranking, "find one answer" | **MRR** | Rewards first relevant hit |
| Ranking, "find all relevant" | Recall@k, **nDCG** | Coverage + graded relevance + position |
| RAG retrieval | **Recall@k** (+ precision@k, MRR) | Did the answer chunk get retrieved? |
| Multiclass, rare classes matter | **Macro-F1** + confusion matrix | Surfaces minority-class failure |
| Business impact | Online A/B on the KPI | Offline is only a proxy |

**Interview trap:** Reciting metrics without connecting them to **cost and context**. Every good answer names the metric *and* the situation/cost that motivates it: "PR-AUC *because* the classes are imbalanced and I care about the positive class"; "recall *because* a missed fraud costs far more than a false alarm"; "MAE *because* the data has outliers I don't want to over-weight." The metric is downstream of the cost structure — lead with the cost, and the metric follows. That reasoning chain is the entire point of an ML-evaluation interview.

---

## Summary

Metrics interviews reward **cost-aware, imbalance-aware** thinking, never a default number. Ground everything in the **confusion matrix** and keep FP (false alarm) vs FN (miss) straight. Choose **precision vs recall by the cost of each error** (recall when misses kill — medical/fraud; precision when false alarms hurt — spam/moderation), and use **F-beta** to encode that asymmetry. Never quote **accuracy** on imbalanced data — it rewards predicting the majority; switch to precision/recall/F1 and **PR-AUC** (honest under imbalance because precision has no TN term, unlike ROC's FPR). Tune the **threshold** by cost, not by defaulting to 0.5, and check **calibration** when the probability's *value* drives decisions. For regression, pick **MAE** (outlier-robust) vs **RMSE** (punishes big misses) deliberately, and pair R² with an absolute metric. For ranking and **RAG**, know **precision@k / recall@k** (recall@k is the make-or-break RAG retrieval metric), **MRR** (first-hit), and **nDCG** (graded + position-discounted). Handle **imbalance** with class weights first, then resampling/SMOTE (train-fold only), always paired with the right metric. And validate the evaluation itself — representative test set, confidence intervals, slices, significance, and an **online A/B test** on the real business KPI, because offline metrics are only a proxy for the impact the customer actually cares about.
