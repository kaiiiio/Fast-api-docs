# Advanced Ensemble Methods: Stacking, Blending & Voting

Ensemble methods combine multiple models to create a single, more powerful model.

## 🧱 1. Basic Ensembles (Recall)
- **Bagging (Bootstrap Aggregating)**: Parallel models on different data subsets (e.g., Random Forest).
- **Boosting**: Sequential models where each fixes the previous one's errors (e.g., AdaBoost, XGBoost).

---

## 🚀 2. Advanced Techniques

### Stacking (Stacked Generalization)
- **Concept**: You train multiple "Base Models" (e.g., SVM, Random Forest, KNN). Instead of just voting, you use their predictions as inputs to a **Meta-Model** (usually Logistic Regression) that decides how to weigh them.
- **Pros**: Can capture complex patterns between the predictions of different models.

### Blending
- **Concept**: Similar to stacking, but instead of cross-validation, it uses a simple "Hold-out" validation set to train the meta-model.
- **Pros**: Simpler than stacking; less prone to data leakage.

### Voting Classifiers
- **Hard Voting**: Majority rule. If 2 models say "Cat" and 1 says "Dog," the result is "Cat."
- **Soft Voting**: Average the probabilities. If the average probability of "Cat" is 0.7 vs 0.3 for "Dog," the result is "Cat."

---

## 🐍 Python: Stacking Classifier (Scikit-Learn)
```python
from sklearn.ensemble import StackingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC

# Base models
estimators = [
    ('rf', RandomForestClassifier(n_estimators=10)),
    ('svr', SVC(probability=True))
]

# Final meta-model
clf = StackingClassifier(
    estimators=estimators, 
    final_estimator=LogisticRegression()
)

# Training would happen normally with clf.fit(X, y)
```
