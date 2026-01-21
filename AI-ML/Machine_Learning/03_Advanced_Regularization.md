# Advanced Regularization: Preventing Overfitting

Regularization adds a penalty term to the loss function to discourage the model from learning overly complex patterns (overfitting).

## 📉 1. L1 Regularization (Lasso)
- **Penalty**: Adds the absolute value of the weights ($|w|$).
- **Effect**: It can shrink some weights to **exactly zero**.
- **Use Case**: **Feature Selection**. It naturally removes unimportant features from the model.

## 📉 2. L2 Regularization (Ridge)
- **Penalty**: Adds the square of the weights ($w^2$).
- **Effect**: It shrinks weights towards zero but **never exactly to zero**.
- **Use Case**: General purpose; prevents any single feature from having too much influence.

## ⚖️ 3. Elastic Net
- **Concept**: A hybrid approach that combines both L1 and L2 penalties. Best used when there are multiple correlated features.

---

## 🧠 4. Deep Learning Specific Regularization

### Dropout
- **Concept**: Randomly "turning off" neurons during training.
- **Why it works**: It forces the network to learn redundant representations and not rely on specific neurons.

### Early Stopping
- **Concept**: Monitoring performance on a validation set. As soon as the validation error starts to increase (while training error still decreases), stop the training.
- **Benefit**: Simplest way to prevent a model from memorizing noise.

### Batch Normalization
- **Concept**: Normalizing the inputs of each layer so they have a mean of zero and unit variance.
- **Benefit**: Speeds up training and provides a slight regularization effect.

---

## 🐍 Python: Lasso Regression Example
```python
from sklearn.linear_model import Lasso
import numpy as np

# X: [Feature 1, Feature 2] where Feature 2 is just noise
X = [[1, 100], [2, 101], [3, 102]] 
y = [10, 20, 30]

# Lasso will penalize the noise feature (100, 101, 102)
model = Lasso(alpha=0.1)
model.fit(X, y)

print(f"Weights: {model.coef_}") # Feature 2 weight should be near or at 0
```
