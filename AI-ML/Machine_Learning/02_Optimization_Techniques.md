# Optimization Techniques: Minimizing the Error

Optimization is the process of adjusting model parameters (weights) to minimize the **Loss Function**.

## 📉 1. Gradient Descent (GD)
The base algorithm.
- **Concept**: Calculate the gradient of the loss function and take small steps towards the minimum.
- **Learning Rate ($\eta$)**: The size of the step. Too big = overshoot; too small = never finishes.

### GD Variations
1. **Batch Gradient Descent**: Calculates the gradient using the *entire* dataset. Slow for big data.
2. **Stochastic Gradient Descent (SGD)**: Updates weights using only *one* data point at a time. Very fast but "noisy" (zig-zags).
3. **Mini-Batch GD**: The middle ground. Uses a small subset (e.g., 32 or 64 samples) to update weights. Best for GPUs.

---

## 🚀 2. Advanced Optimizers (The Modern Standard)

### Momentum
- **Concept**: Adds a fraction of the previous update to the current one. Helps "roll down" the loss landscape faster and overcome small local minima.

### Adagrad & RMSProp
- **Concept**: Adaptive learning rates. It decreases the learning rate for features that occur frequently and increases it for rare ones.

### Adam (Adaptive Moment Estimation)
- **Concept**: Combines Momentum and RMSProp. It's the "Default" choice for almost all Deep Learning projects because it's robust and fast.

---

## ⚖️ 3. Optimization Challenges
- **Local Minima**: Getting stuck in a small "valley" instead of the deepest one.
- **Saddle Points**: Points where the gradient is zero but it's not a minimum.
- **Vanishing/Exploding Gradients**: When gradients become too small (training stops) or too large (weights become NaN) in deep networks.

---

## 🐍 Python: SGD with Scikit-Learn
```python
from sklearn.linear_model import SGDClassifier
import numpy as np

X = np.array([[1], [2], [3], [4]])
y = np.array([0, 0, 1, 1])

# Using SGD (Stochastic Gradient Descent) for classification
clf = SGDClassifier(loss="log_loss", max_iter=1000)
clf.fit(X, y)

print(f"Prediction for 3.5: {clf.predict([[3.5]])}")
```
