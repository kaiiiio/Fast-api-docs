# Math for Machine Learning: The Foundation

ML isn't just magic; it's high-dimensional mathematics.

## 📐 1. Linear Algebra
The language of data.
- **Vectors & Matrices**: How data is represented ($X = [x_1, x_2, ...]$).
- **Dot Product**: Measures similarity between two vectors. Foundation of Neural Net layers.
- **Matrix Multiplication**: Transforming data from one space to another.
- **Eigenvalues & Eigenvectors**: Essential for PCA (Dimensionality reduction).

---

## 📈 2. Multivariate Calculus
The machine that helps ML "learn."
- **Derivatives**: Measuring the rate of change.
- **Partial Derivatives**: How a multi-variable function (like Loss) changes when one variable (like a Weight) changes.
- **The Gradient**: A vector of all partial derivatives. **Gradient Descent** moves in the opposite direction of the gradient to reach the minimum loss.
- **Chain Rule**: The secret sauce behind **Backpropagation**.

---

## 📊 3. Probability & Statistics
Making decisions under uncertainty.
- **Probability Distributions**: Gaussian (Normal), Bernoulli, Poisson.
- **Expected Value & Variance**: Measuring the "center" and "spread" of data.
- **Bayes' Theorem**: Updating beliefs based on new evidence.
    - $P(A|B) = \frac{P(B|A) \cdot P(A)}{P(B)}$
- **Likelihood**: How well a model explains the observed data.

---

## 🛡️ 4. Information Theory
- **Entropy**: Measure of randomness or uncertainty in data.
- **Cross-Entropy Loss**: A standard loss function for classification that compares the predicted probability distribution to the actual distribution.

---

## 🐍 Python: Dot Product Calculation
```python
import numpy as np

# Weights
W = np.array([0.5, 0.2, -0.1])
# Inputs
X = np.array([10, 5, 2])

# Simple Calculation: W1X1 + W2X2 + W3X3
output = np.dot(W, X)
print(f"Neuron Summation (z): {output}") # Result: 5.8
```
