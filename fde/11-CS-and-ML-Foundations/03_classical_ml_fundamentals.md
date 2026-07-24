# Classical ML Fundamentals - Senior Interview Deep Dive

> Module: CS & ML Foundations | Level: Senior/Staff | FDE Interview Prep

The single most common mistake a "GenAI engineer" makes in an FDE interview is reaching for an LLM when a logistic regression would be cheaper, faster, more accurate, and interpretable. FDE and AI-engineer loops deliberately test whether you know **when classical ML beats GenAI**, and whether you can reason about the core algorithms — not derive them, but explain what they do, when to use each, and how to diagnose when a model is broken. This file covers the ML-vs-GenAI decision, the algorithm zoo an FDE must speak to, the bias-variance tradeoff, over/underfitting diagnosis and fixes, regularization, feature engineering, and the validation discipline (train/val/test, cross-validation, and data leakage — the #1 real-world mistake that inflates offline metrics and collapses in production).

No heavy math derivations — this is the reasoning layer. Where code helps, it's illustrative pseudocode/TypeScript-flavored logic, not a full sklearn pipeline.

---

## When Classical ML Beats GenAI

### Q1. An interviewer describes a business problem and asks "would you use an LLM or classical ML?" How do you decide?

**Answer:**

This is *the* FDE gate question. The instinct they're testing: don't default to the LLM because it's shiny. Walk this decision framework aloud:

| Factor | Favors classical ML | Favors LLM/GenAI |
|---|---|---|
| **Task shape** | Structured input → fixed label/number (classification, regression, ranking) | Open-ended generation, reasoning over unstructured text, few-shot novel tasks |
| **Labeled data** | You have thousands of labeled examples | Little/no labeled data; task defined by instructions |
| **Latency** | Need <10ms (ad ranking, fraud at swipe-time) | 100ms–seconds acceptable |
| **Cost at scale** | Millions/billions of predictions/day | Thousands to low-millions of calls |
| **Interpretability** | Regulated domain — must explain each decision (credit, medical, hiring) | Explanation optional |
| **Input type** | Tabular/numeric features | Free text, images, multimodal |
| **Accuracy ceiling** | A well-tuned classifier already hits the bar | Task genuinely needs language understanding/generation |

The one-sentence heuristic: **if the task is "map structured features to a label or number, at scale, with labeled data available," classical ML wins on cost, latency, and interpretability. If the task is "understand or generate open-ended natural language with little task-specific data," reach for the LLM.**

**Interview trap:** Answering "LLM" reflexively for a tabular classification problem like fraud detection or churn prediction. A gradient-boosted tree on tabular features will beat an LLM on accuracy, cost (fractions of a cent vs cents per prediction), and latency (sub-millisecond vs hundreds of ms) — and it's auditable. Naming those three axes (cost, latency, interpretability) unprompted is the strong-hire signal.

---

### Q2. Give three concrete scenarios where you'd deliberately NOT use an LLM, with the reasoning.

**Answer:**

1. **Real-time fraud scoring at transaction time.** Every card swipe needs a score in single-digit milliseconds, billions of times a day. A gradient-boosted tree (XGBoost/LightGBM) scores in microseconds for a fraction of a cent; an LLM adds 200ms+ latency and cents of cost per call — economically and technically infeasible. Classical ML wins outright.

2. **Credit approval / loan underwriting.** Regulation (e.g. fair-lending laws, "right to explanation") requires you to justify *why* an applicant was declined, per-feature. A logistic regression or a monotonic GBM gives auditable coefficients and reason codes; an LLM is a black box you cannot defend to a regulator. Interpretability is a hard requirement, not a nice-to-have.

3. **High-volume tabular prediction with abundant labels** — ad click-through-rate, demand forecasting, recommendation ranking. You have millions of labeled rows and need billions of low-latency predictions. Classical models trained on your data outperform a general LLM on the specific distribution, at a tiny fraction of the cost.

The connective tissue: **latency budgets, per-prediction cost at scale, regulatory interpretability, and the availability of labeled data** all push toward classical ML. LLMs shine where the input is genuinely unstructured language and labeled data is scarce.

**Interview trap:** Not recognizing that these are *also* the places where an LLM can *help build* the classical system — using an LLM offline to generate labels, extract features from text, or bootstrap a training set, then deploying a cheap classical model for the actual real-time inference. The senior answer is often a **hybrid**: LLM for the hard-to-label offline work, classical ML for the hot path. Mentioning that hybrid pattern shows real FDE judgment.

**Production war story:** A team replaced a working logistic-regression spam filter (sub-ms, ~$0/prediction) with an LLM classifier because "LLMs are better at language." Accuracy improved 1%, but per-message cost went from effectively zero to a cent, latency went from 2ms to 400ms, and the monthly bill for a high-volume mail system hit six figures. They reverted, kept the LLM only for the ambiguous 3% the cheap model flagged as low-confidence — a cascade that captured most of the accuracy gain at 3% of the cost.

---

## Core Algorithms an FDE Should Reason About

### Q3. Linear regression and logistic regression — intuition and when to use each.

**Answer:**

**Linear regression** predicts a continuous number as a weighted sum of features: `ŷ = w·x + b`. It fits the line/hyperplane minimizing squared error. Use it when the target is a *quantity* (price, temperature, demand) and relationships are roughly linear. Its coefficients are directly interpretable: "each additional bedroom adds $X to the predicted price."

**Logistic regression** predicts a *probability* for classification by squashing the same linear combination through a sigmoid: `p = σ(w·x + b)`, then thresholding (default 0.5). Despite the name it's a **classifier**. Use it for binary (or, via softmax, multiclass) classification where you want calibrated probabilities and interpretable feature weights: spam/not-spam, churn/retain, fraud/legit.

| | Linear regression | Logistic regression |
|---|---|---|
| Output | Continuous number | Probability → class |
| Loss | Mean squared error | Log loss (cross-entropy) |
| Interpretation | Coefficient = change in y per unit x | Coefficient = change in log-odds per unit x |
| Use when | Predicting a quantity | Predicting a category / probability |

Both are **linear models** — fast to train, cheap to serve, and interpretable, which is why they're the baseline you *always* try first. If a linear model is "good enough," you're done; if not, it's your benchmark for justifying something fancier.

**Interview trap:** Calling logistic regression a regression algorithm (predicting numbers). It's a *classification* algorithm — it models the probability of a class. The "regression" in the name refers to the linear regression on log-odds under the hood. Getting this wrong signals shaky fundamentals. Also: linear/logistic models capture only *linear* relationships (in the features as given); non-linear patterns need feature engineering (interactions, polynomials) or a non-linear model.

---

### Q4. Decision trees and random forests — how do they work, and what's the trade-off?

**Answer:**

A **decision tree** splits the data by asking a sequence of feature threshold questions ("is income > 50k?", "is age < 30?"), each split chosen to best separate the target (by Gini impurity or information gain for classification, variance reduction for regression). The leaves hold the prediction. Trees are wonderfully **interpretable** (you can read the rules) and handle non-linear relationships and feature interactions naturally — but a single deep tree **overfits** badly, memorizing noise.

A **random forest** fixes overfitting by ensembling: train many trees, each on a bootstrap sample of the rows *and* a random subset of features per split, then average their predictions (or majority-vote). This **decorrelates** the trees so their individual errors cancel — variance drops dramatically while bias stays low. It's a robust, low-tuning default for tabular data.

| | Single decision tree | Random forest |
|---|---|---|
| Bias | Low | Low |
| Variance | High (overfits) | Much lower (averaging) |
| Interpretability | High (readable rules) | Lower (many trees) but has feature importances |
| Tuning effort | Low | Low — works well out of the box |
| Training | Fast | Parallelizable (trees are independent) |

**Interview trap:** Not being able to explain *why* a forest beats a single tree. The answer is **variance reduction through decorrelated averaging** — bagging the rows and randomly subsetting features at each split makes the trees make *different* mistakes, so averaging cancels the noise. If the trees were identical (no randomness), averaging would do nothing. The randomness is the whole point.

---

### Q5. Gradient boosting / XGBoost — why is it the default winner for tabular data?

**Answer:**

**Gradient boosting** builds trees *sequentially*, where each new tree fits the **residual errors** of the ensemble so far — it "boosts" by repeatedly correcting the current mistakes. Unlike a random forest (independent trees, averaged), boosting is additive and adaptive: tree 2 focuses on what tree 1 got wrong, and so on, gradually reducing bias. **XGBoost**, **LightGBM**, and **CatBoost** are optimized implementations with regularization, clever handling of missing values, and speed tricks (histogram binning, leaf-wise growth).

Why it dominates tabular ML competitions and production: it captures complex non-linear interactions, handles mixed feature types and missing data gracefully, needs relatively little feature scaling, and — with proper regularization and early stopping — achieves top accuracy on structured data. For most "predict a label/number from tabular features" problems, a tuned GBM is the model to beat.

| | Random forest (bagging) | Gradient boosting |
|---|---|---|
| Tree relationship | Independent, parallel | Sequential, each corrects prior errors |
| Reduces primarily | Variance | Bias (and variance, with regularization) |
| Overfitting risk | Low, self-regularizing | Higher — needs tuning (learning rate, depth, early stopping) |
| Tuning effort | Low | Higher, but higher ceiling |
| Typical winner? | Strong baseline | Usually the best tabular accuracy |

**Interview trap:** Confusing bagging (random forest — parallel, reduces variance) with boosting (sequential, reduces bias). The one-liner: **bagging averages independent high-variance models to cut variance; boosting sequentially adds weak learners that each fix the ensemble's current errors to cut bias.** Also know boosting's failure mode: because each tree chases residuals, it will happily overfit noise if you let it train too long — hence early stopping on a validation set and a small learning rate are essential.

---

### Q6. k-NN, k-means, and SVM — one-line intuition and when to use each.

**Answer:**

**k-NN (k-Nearest Neighbors)** — *supervised, lazy.* To classify a point, look at its k closest training points and take the majority vote (or average, for regression). No training phase — it just stores the data — but prediction is O(n) per query (must compare to all points) and it needs feature scaling (distances dominate by large-magnitude features). Use for small datasets, as a simple baseline, or when the decision boundary is highly irregular. It struggles in high dimensions (the curse of dimensionality — everything becomes equidistant).

**k-means** — *unsupervised clustering.* Partition data into k clusters by iteratively assigning points to the nearest centroid and moving centroids to their cluster's mean. Use for exploratory segmentation (customer groups, document topics) when you have no labels. You must choose k (elbow method / silhouette score) and it assumes roughly spherical, similarly-sized clusters.

**SVM (Support Vector Machine)** — *supervised classifier.* Finds the hyperplane that separates classes with the **maximum margin** (largest gap to the nearest points, the "support vectors"). The **kernel trick** lets it draw non-linear boundaries by implicitly mapping to higher dimensions. Strong on small-to-medium datasets with clear margins and high-dimensional data (e.g. text); less practical on very large datasets (training scales poorly).

| Algorithm | Learning | Use when | Key gotcha |
|---|---|---|---|
| k-NN | Supervised, lazy | Small data, irregular boundary, quick baseline | Slow inference, needs scaling, curse of dimensionality |
| k-means | Unsupervised | Segmentation without labels | Must pick k; assumes spherical clusters |
| SVM | Supervised | Small/medium, high-dim, clear margin | Slow on huge data; kernel/C tuning |

**Interview trap:** Confusing **k-NN** (supervised classification, k = number of neighbors to vote) with **k-means** (unsupervised clustering, k = number of clusters). They share a letter and nothing else. State it crisply: "k-NN is supervised — it uses labels to vote; k-means is unsupervised — it groups unlabeled data into k clusters." Mixing them up is an instant fundamentals red flag.

---

## Bias-Variance & Over/Underfitting

### Q7. Explain the bias-variance tradeoff so a customer's engineer would understand it.

**Answer:**

Every model's expected error decomposes into three parts: **bias² + variance + irreducible noise.**

- **Bias** = error from wrong assumptions — the model is too simple to capture the true pattern. High bias = **underfitting**. (Example: fitting a straight line to data that's actually curved.)
- **Variance** = error from sensitivity to the specific training sample — the model captures noise and changes wildly if you resample the data. High variance = **overfitting**. (Example: a deep tree that memorizes every training point.)
- **Irreducible noise** = randomness in the data you can never model away.

The **tradeoff**: simple models (linear regression, shallow trees) have high bias, low variance; complex models (deep trees, high-degree polynomials, large neural nets) have low bias, high variance. As you increase complexity, bias falls but variance rises. Total error is U-shaped — there's a **sweet spot** of complexity that minimizes the sum.

The analogy that lands with non-experts: **bias is being consistently wrong in the same way (a bent ruler); variance is being inconsistent (a shaky hand).** You want a straight ruler and a steady hand — but reducing one often worsens the other, so you tune to the minimum-total-error point.

**Interview trap:** Describing bias and variance as independent knobs you can both crank down freely. They **trade off** — that's the whole point. You reduce variance (regularize, simplify, add data, ensemble) usually at the cost of some bias, and vice versa. The goal isn't zero bias *and* zero variance; it's the complexity that minimizes their *sum* on unseen data, found via a validation set.

---

### Q8. How do you diagnose whether a model is overfitting or underfitting?

**Answer:**

Compare **training error** to **validation error** — the gap and the levels tell you which failure you have:

| Symptom | Diagnosis | What it means |
|---|---|---|
| High train error **and** high val error (close together) | **Underfitting** (high bias) | Model too simple — can't even fit the training data |
| Low train error but **much higher** val error (big gap) | **Overfitting** (high variance) | Model memorized training data, doesn't generalize |
| Low train error **and** low val error (small gap) | **Good fit** | The target |
| Both errors still falling as you add data | Add more data / train longer | Not yet converged |

The visual tool is the **learning curve**: plot train and validation error as a function of training-set size. If the two curves converge at a high error, you're underfitting (more data won't help — you need a more expressive model). If there's a persistent large gap (low train, high val), you're overfitting (more data or regularization will help).

**Interview trap:** Judging a model on **training accuracy alone**. A model with 99% training accuracy might be catastrophically overfit and useless on new data — you'd never know without a held-out validation set. The senior instinct: *always* report the train/validation gap, never a single training number. "It's 99% accurate" without "...on held-out data" is meaningless or misleading.

---

### Q9. Give the fixes for overfitting and underfitting, in priority order.

**Answer:**

**To fix underfitting (high bias — model too simple):**
1. Use a more expressive model (linear → tree → boosting → neural net) or increase capacity (deeper tree, more parameters).
2. Add features / better feature engineering (interactions, non-linear transforms) — give the model more signal.
3. Reduce regularization (it may be over-constraining).
4. Train longer (if it hasn't converged).

**To fix overfitting (high variance — model too complex for the data):**
1. **Get more training data** — the most reliable fix; more data makes it harder to memorize.
2. **Regularization** — L1/L2 penalties, dropout (neural nets), max-depth/min-samples limits (trees), early stopping (boosting/NNs).
3. **Simplify the model** — fewer features, shallower trees, fewer parameters.
4. **Ensemble / bagging** — averaging decorrelated models reduces variance (random forest).
5. **Feature selection / dimensionality reduction** — remove noisy features.
6. **Cross-validation** to tune hyperparameters honestly.

**Interview trap:** Prescribing "get more data" for *underfitting*. More data does **nothing** for a model that's too simple to fit the data you already have — an underfit linear model on curved data stays underfit no matter how many points you add. More data fixes *overfitting* (variance), not underfitting (bias). Match the fix to the diagnosis: bias → more capacity/features; variance → more data/regularization/simplification.

---

## Regularization

### Q10. What is regularization, and what's the difference between L1 and L2?

**Answer:**

Regularization discourages overfitting by adding a **penalty for model complexity** to the loss function, so the optimizer can't just chase training accuracy — it must also keep the weights small/simple. For linear models the two classic penalties:

- **L2 (Ridge)** adds `λ · Σ wᵢ²` (sum of squared weights). It shrinks all weights *toward* zero smoothly but rarely *to* exactly zero. Good default; handles correlated features gracefully by spreading weight among them.
- **L1 (Lasso)** adds `λ · Σ |wᵢ|` (sum of absolute weights). It drives some weights **exactly to zero**, performing automatic **feature selection** — the model ends up sparse, using only a subset of features.

`λ` (lambda) is the regularization strength: higher λ = more penalty = simpler model = more bias, less variance. You tune it on a validation set.

| | L1 (Lasso) | L2 (Ridge) |
|---|---|---|
| Penalty | Σ\|wᵢ\| | Σ wᵢ² |
| Effect on weights | Some become exactly 0 (sparse) | All shrink toward 0 (rarely exactly 0) |
| Feature selection? | Yes — built-in | No |
| Correlated features | Picks one, zeros others | Spreads weight across them |
| Use when | You want a sparse, interpretable model | You want stable shrinkage, many small effects |

**(Elastic Net** combines both, giving sparsity plus stability.)

**Interview trap:** Not knowing that **L1 produces sparsity (feature selection) and L2 does not**. The geometric reason (the diamond-shaped L1 constraint has corners on the axes, so the optimum tends to land where some weights are exactly zero) is a nice bonus, but the practical takeaway is what matters: **choose L1 when you want the model to automatically discard irrelevant features; choose L2 when you want smooth shrinkage of all weights.** Regularization is also *the* connection to bias-variance: it deliberately adds bias to cut variance.

---

## Feature Engineering

### Q11. Why do people say "feature engineering matters more than the model," and what does it involve?

**Answer:**

For classical (especially tabular) ML, the quality of your **features** — the input representation — usually determines performance more than which algorithm you pick. A great feature set with a simple model beats raw features with a fancy model. Feature engineering is the craft of turning raw data into signals the model can use:

- **Scaling/normalization** — standardize features to comparable ranges (essential for distance-based models like k-NN, SVM, and gradient descent; irrelevant for trees).
- **Encoding categoricals** — one-hot for low-cardinality, target/frequency encoding for high-cardinality, embeddings for very high cardinality.
- **Handling missing values** — impute (mean/median/model-based) or use a "missing" indicator; some models (XGBoost) handle NaNs natively.
- **Creating interactions and transforms** — products of features, ratios, polynomial terms, log transforms for skewed distributions, binning continuous values.
- **Temporal/domain features** — day-of-week, time-since-last-event, rolling aggregates; domain knowledge encoded as features (e.g. "transaction amount / account average").
- **Feature selection** — drop redundant/noisy features (via L1, importance scores, or correlation analysis).

**Interview trap:** Underestimating scaling for distance/gradient-based models. If one feature is "income" (0–1,000,000) and another is "age" (0–100), a k-NN or SVM will let income dominate the distance entirely, ignoring age. **Standardize before distance-based or gradient-based models.** (Trees are scale-invariant — they split on thresholds — so scaling doesn't matter for them, a distinction worth stating.)

**Production war story:** A churn model plateaued at mediocre accuracy across three different algorithms. The breakthrough wasn't a better model — it was adding one engineered feature: "days since last login" as a rolling value. Domain insight (disengagement precedes churn) beat weeks of hyperparameter tuning. The lesson FDEs live: understand the customer's domain, and the features write themselves.

---

### Q12. What is the curse of dimensionality, and how does it affect model choice?

**Answer:**

As the number of features (dimensions) grows, the volume of the feature space grows exponentially, so data becomes **sparse** — points spread out and every point becomes roughly equidistant from every other. Consequences:

- **Distance-based methods break** (k-NN, k-means, RBF-kernel SVM): "nearest neighbor" becomes meaningless when all distances converge. This is why k-NN degrades in high dimensions.
- **Overfitting gets easier**: with many features and limited rows, a model can find spurious patterns that fit the training data by chance. You need exponentially more data to fill high-dimensional space.
- **Computation and storage grow.**

Mitigations: **dimensionality reduction** (PCA to project onto the directions of most variance; feature selection to drop irrelevant features), **regularization** (L1 to zero out features), and using models that are robust to high dimensions (tree ensembles handle many features better than distance-based methods; linear models with strong regularization work for high-dimensional sparse data like text).

**Interview trap:** Adding features indiscriminately thinking "more information = better." Beyond a point, extra features (especially noisy/irrelevant ones) *hurt* — they add variance and dilute the signal. The senior instinct is **parsimony**: prefer the smallest feature set that captures the signal, and use feature selection/regularization to enforce it. "More features" and "better model" are not synonyms.

---

## Validation & The #1 Real-World Mistake

### Q13. Explain train/validation/test splits. Why three sets and not two?

**Answer:**

You split your labeled data into three disjoint sets, each with a distinct job:

- **Training set (~60–80%)** — the model learns its parameters (weights, tree splits) here.
- **Validation set (~10–20%)** — you tune **hyperparameters** (regularization strength, tree depth, learning rate) and make model-selection decisions by evaluating here. The model doesn't train on it, but *you* use it to steer choices.
- **Test set (~10–20%)** — touched **once**, at the very end, to get an unbiased estimate of real-world performance. It simulates unseen data.

Why three and not two: if you tune hyperparameters against your test set, you **leak** information about it into your model-selection process — you've effectively "trained" (indirectly) on the test set, and its performance estimate becomes optimistic. The validation set absorbs the tuning; the test set stays pristine for one honest final measurement. **The test set is sacred — look at it once.**

**Interview trap:** Repeatedly evaluating on the test set while iterating ("let me try another config and check test accuracy again"). Each peek and adjust leaks test information and inflates your estimate — by the tenth iteration you've overfit to the test set through your own decisions. This is subtle because no code trained on it, but *you* did the overfitting. Use the validation set for iteration; reserve the test set for the final, single verdict.

---

### Q14. What is cross-validation, and when do you use it over a single validation split?

**Answer:**

**k-fold cross-validation** splits the training data into k equal folds, then trains k times — each time holding out a different fold as the validation set and training on the other k−1. You average the k validation scores for a more robust performance estimate. Common k = 5 or 10.

Why it's better than a single split: a single validation set might be lucky or unlucky (an unrepresentative slice), giving a noisy estimate. Cross-validation uses *every* example for both training and validation (across folds), yielding a lower-variance estimate and using data more efficiently — critical when data is **limited**.

Variants: **stratified** k-fold (preserves class proportions in each fold — essential for imbalanced classification), **time-series** CV (respects temporal order — you can only validate on the *future* of what you trained on; a random shuffle would leak the future into the past), and **leave-one-out** (k = n, expensive, for tiny datasets).

**Interview trap:** Using **standard (shuffled) k-fold cross-validation on time-series data.** Shuffling lets the model train on future data to predict the past — a form of leakage that makes offline metrics look great and production performance collapse. For temporal data you must use **forward-chaining / time-based splits** where the validation fold is always *later* than the training data. Recognizing that "time-ordered data breaks random CV" is a senior-level distinction interviewers specifically probe.

---

### Q15. Data leakage — the #1 real-world ML mistake. What is it and how does it sneak in?

**Answer:**

**Data leakage** is when information that wouldn't be available at prediction time (or information from the validation/test set) contaminates training, making offline metrics look fantastic and then **collapsing in production**. It's the single most common and most damaging real-world ML mistake because it's *invisible* — your metrics say the model is brilliant right up until it fails on live data.

Common ways it sneaks in:

1. **Target leakage** — a feature that's a proxy for (or derived from) the target and only available *after* the outcome is known. Classic: including "account_closed_date" to predict churn, or "was_prescribed_antibiotics" to predict infection — the feature exists only *because* the outcome happened.
2. **Train/test contamination** — fitting a scaler, imputer, or encoder on the **full dataset** (including test) before splitting. The test set's statistics leak into training. Fix: **fit all preprocessing on the training fold only**, then apply to validation/test.
3. **Temporal leakage** — using future information to predict the past (shuffled CV on time-series, or a feature computed with a look-ahead window).
4. **Duplicate/near-duplicate rows** spanning train and test (e.g. the same user in both), so the model "memorizes" specific instances.
5. **Group leakage** — related samples split across train and test (multiple images of the same patient, multiple sessions of the same user) inflate scores because the model recognizes the entity, not the pattern.

**Interview trap:** Fitting preprocessing (StandardScaler, imputation, target encoding) on the entire dataset before the train/test split. This is the most common leakage in practice and it's easy to miss because it "feels" like clean preprocessing. The rule: **all fitting — scalers, imputers, encoders, feature selection — must happen inside the training fold only, then transform the held-out data with those fitted parameters.** In sklearn this is exactly what a `Pipeline` inside cross-validation enforces; describing that shows you've been burned by it.

**Production war story:** A medical-risk model hit 95% AUC in offline validation and everyone celebrated — until it flatlined at ~60% in production. The culprit: a feature encoding *which hospital ward* the patient was in, which leaked the outcome (high-risk patients were pre-assigned to the ICU ward, so "ward = ICU" was really "outcome = bad"). The model learned the leak, not the medicine. Root-causing it required asking, for *every* feature, "would this value actually be available at the moment I need to predict, and is it caused by the thing I'm predicting?" That single question is the FDE's leakage checklist.

---

### Q16. How do you actually catch leakage before it burns you?

**Answer:**

A practical leakage-detection checklist to run on every model:

1. **The "available at prediction time?" audit.** For each feature, ask: at the exact moment the model runs in production, would this value genuinely be known, and is it *caused by* the target rather than a cause/predictor of it? Any "yes-caused-by-target" feature is target leakage — drop it.
2. **Suspiciously high performance.** If a model is *shockingly* accurate (99% AUC on a hard problem), be suspicious first, not proud. Leakage is the most likely explanation. Investigate before celebrating.
3. **Feature importance sanity check.** If one feature dominates importance and it "shouldn't" be that predictive, it's probably leaking. (The "ward = ICU" feature would top the importance chart.)
4. **Split before you touch anything.** Split into train/val/test *first*, then fit every transformation on train only. Wrap preprocessing in a pipeline so it's cross-validated correctly.
5. **Respect entity and time boundaries.** Split by group (user/patient) not by row when samples cluster; split by time for temporal data.
6. **Backtest on a truly held-out time period** that mimics deployment — train on the past, evaluate on a future window you never touched.

**Interview trap:** Treating high offline metrics as proof of success. Senior ML engineers treat *too-good* results as a **red flag** demanding investigation, not a win. The reflex "these numbers are suspiciously good — what's leaking?" is exactly the skepticism that separates someone who's shipped real models from someone who's only done tutorials where the data is pre-cleaned and leak-free.

---

### Q17. What's your first-week playbook when a customer hands you a labeled dataset?

**Answer:**

The FDE's disciplined starting sequence (state this as a process, which is what they're grading):

1. **Understand the target and the business cost.** What are we predicting, and what does a false positive vs false negative *cost*? (This drives the metric — see file 04.) Confirm the target is defined the way you think.
2. **EDA (exploratory data analysis).** Distributions, missing-value patterns, class balance, obvious data-quality issues, leaky-looking features. Plot before you model.
3. **Establish a baseline.** A trivial baseline (majority class, or a simple logistic regression) sets the bar. Everything fancier must beat it to justify its complexity.
4. **Clean split discipline.** Train/val/test (or CV) with correct grouping and temporal ordering; all preprocessing fit on train only.
5. **Start simple, then escalate.** Logistic regression / a shallow tree first → gradient boosting if needed. Only reach for deep learning if the data type (text/images) or scale demands it.
6. **Diagnose, don't just tune.** Use train/val gap and learning curves to know whether you're bias- or variance-limited, then apply the matching fix (Q9).
7. **Pick the metric that matches the business cost** (not accuracy by default — see file 04), and validate honestly.
8. **Hunt for leakage** at every step (Q16).

**Interview trap:** Jumping straight to "I'd train an XGBoost / a neural net." The senior answer *leads with understanding the problem and the cost of errors, establishing a baseline, and setting up honest validation* — the modeling is almost an afterthought. FDEs are hired to bring engineering discipline to a customer's messy reality, and this playbook *is* that discipline. Naming the baseline-first, cost-aware, leakage-paranoid process is worth more than naming any algorithm.

---

### Q18. Precision, recall, and why "accuracy" is often the wrong first metric (bridge to file 04).

**Answer:**

A quick but essential bridge, because model *evaluation* is where the ML-fundamentals interview usually goes next (file 04 covers it in depth). **Accuracy** = fraction of correct predictions. It's intuitive but dangerously misleading under **class imbalance**: if 99% of transactions are legitimate, a model that predicts "legit" for everything scores 99% accuracy while catching *zero* fraud — useless.

For imbalanced problems you need:
- **Precision** = of the items you flagged positive, what fraction actually were? (Cost of false positives.)
- **Recall** = of the actual positives, what fraction did you catch? (Cost of false negatives.)
- **F1** = harmonic mean of the two, when you need one balanced number.

Which to optimize depends on the **cost of each error type**: for fraud/medical screening, false negatives (missing a real case) are catastrophic → optimize recall; for spam/content moderation, false positives (blocking legit content) annoy users → weight precision. This cost-driven metric selection is *the* evaluation skill.

**Interview trap:** Reporting accuracy on an imbalanced dataset and declaring victory. State the imbalance first and switch to precision/recall/F1 (and PR-AUC). "The dataset is 99:1, so accuracy is meaningless here — I'd look at recall for the minority class given the cost of a miss" is the sentence that shows you understand evaluation. File 04 drills the full confusion-matrix machinery, threshold selection, ROC-vs-PR-AUC, and imbalance handling.

---

### Q19. Supervised vs unsupervised vs semi-supervised vs reinforcement — quick taxonomy.

**Answer:**

The learning-paradigm map every FDE should state crisply:

| Paradigm | Data | Goal | Examples |
|---|---|---|---|
| **Supervised** | Labeled (input → known output) | Predict labels for new inputs | Classification, regression (fraud, price prediction) |
| **Unsupervised** | Unlabeled | Find structure | Clustering (k-means), dimensionality reduction (PCA), anomaly detection |
| **Semi-supervised** | Small labeled + large unlabeled | Leverage cheap unlabeled data to improve a model with few labels | Label propagation; pretrain-then-fine-tune |
| **Self-supervised** | Unlabeled, but labels derived from the data itself | Learn representations from structure (predict masked/next token) | How LLMs and modern embeddings are pretrained |
| **Reinforcement** | Reward signals from interaction | Learn a policy that maximizes cumulative reward | Robotics, game-playing, RLHF for LLM alignment |

The practical FDE angle: most business problems are **supervised** (you have historical labeled outcomes) or **unsupervised** (segment/find-anomalies with no labels). **Self-supervised** is how foundation models are pretrained (masked/next-token prediction manufactures labels from raw text) — the conceptual bridge to file 05's deep learning. **Reinforcement learning** appears mainly as RLHF in the LLM alignment story.

**Interview trap:** Calling LLM pretraining "unsupervised." It's **self-supervised** — the model *does* have labels (the next token / the masked word), but those labels are generated automatically from the unlabeled text rather than hand-annotated. The distinction matters because it explains how LLMs learn from web-scale text without human labeling: the data supervises itself. This is the exact link to how transformers are trained (file 05).

---

### Q20. Summarize the classical-ML judgment an FDE is actually being tested on.

**Answer:**

Boiled down, the interview is probing four judgments:

1. **Model selection under constraints** — knowing that for tabular data with labels, at scale, with latency/cost/interpretability requirements, a gradient-boosted tree or logistic regression usually beats an LLM. Not defaulting to GenAI.
2. **Diagnosis over tuning** — reading the train/validation gap to distinguish bias (underfitting → more capacity/features) from variance (overfitting → more data/regularization/simplification), and applying the *matching* fix rather than randomly trying things.
3. **Honest validation** — proper train/val/test discipline, cross-validation matched to the data structure (stratified for imbalance, time-based for temporal), and a pristine test set touched once.
4. **Leakage paranoia** — treating suspiciously-good metrics as a warning, fitting preprocessing on train only, auditing every feature for "available at prediction time and not caused by the target," and respecting entity/time boundaries in splits.

The connective theme with the DSA files: **state your reasoning and its preconditions.** Just as you name a pattern and its precondition in a coding round, here you name the model *and why it fits the constraints*, the diagnosis *and the evidence for it*, the metric *and the business cost that motivates it*. That reasoning-out-loud, cost-and-constraint-aware judgment is what "senior FDE" means — the algorithms are table stakes.

**Interview trap:** Treating ML as "pick the fanciest model and tune it." The senior signal is the opposite: understand the problem and its costs, establish a baseline, validate honestly, stay paranoid about leakage, and reach for the *simplest* model that meets the constraints. The deep-learning and evaluation specifics live in files 04 and 05 — but this judgment layer is what an FDE deploys on day one at a customer site.

---

## Summary

Classical ML is not a legacy topic for FDEs — it's the correct answer to a large fraction of real problems, and interviewers test whether you know *when*. Lead with the **ML-vs-GenAI decision** (structured + labeled + scale + latency + interpretability → classical; open-ended language + scarce labels → LLM; often a **hybrid**). Speak fluently to the algorithm zoo — linear/logistic regression (interpretable baselines), decision trees/random forests (bagging cuts variance via decorrelation), gradient boosting/XGBoost (sequential residual-fitting, the tabular champion), k-NN/k-means/SVM (know supervised-vs-unsupervised and their gotchas). Own the **bias-variance tradeoff** and diagnose over/underfitting from the **train/validation gap**, applying the matching fix. Use **regularization** (L1 for sparsity/feature-selection, L2 for smooth shrinkage) as your variance lever. Respect **feature engineering** as the highest-leverage work. And above all, enforce **validation discipline** and stay paranoid about **data leakage** — the #1 mistake that makes offline metrics lie. File 04 turns to the evaluation metrics that quantify all of this.
