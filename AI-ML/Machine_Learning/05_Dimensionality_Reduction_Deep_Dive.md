# Dimensionality Reduction Deep Dive: PCA, t-SNE & UMAP

When data has hundreds of features, it suffers from the **"Curse of Dimensionality"**—the data becomes sparse, and distance-based algorithms (like KNN) fail.

## 📉 1. PCA (Principal Component Analysis)
- **Concept**: Linear transformation that finds new axes (**Principal Components**) that maximize the **Variance** of the data.
- **Math**: Uses Eigen-decomposition of the covariance matrix.
- **Pros**: Fast, deterministic, preserves global structure.
- **Use Case**: Feature compression, noise reduction.

---

## 🌀 2. t-SNE (t-Distributed Stochastic Neighbor Embedding)
- **Concept**: Non-linear dimensionality reduction. It converts similarities between data points to joint probabilities.
- **Goal**: Keeps similar points close together and dissimilar points far apart in a 2D/3D space.
- **Pros**: Excellent for **Visualization**.
- **Use Case**: Visualizing high-dimensional clusters (e.g., MNIST digits).

---

## 🚀 3. UMAP (Uniform Manifold Approximation & Projection)
- **Concept**: Newer than t-SNE; based on Riemannian geometry.
- **Pros**: Much faster than t-SNE and preserves more of the **Global Structure** (not just local clusters).
- **Use Case**: The modern standard for high-dimensional biological or NLP data visualization.

---

## ⚖️ PCA vs. t-SNE vs. UMAP
| Feature | PCA | t-SNE | UMAP |
| :--- | :--- | :--- | :--- |
| **Type** | Linear | Non-linear | Non-linear |
| **Speed** | Extremely Fast | Slow | Fast |
| **Preserves** | Global Variance | Local Clusters | Global + Local |
| **Use Case** | Data Preprocessing | Visualization Only | Preprocessing + Viz |

---

## 🐍 Python: PCA with Scikit-Learn
```python
from sklearn.decomposition import PCA
import numpy as np

# Data: 10 samples with 50 features
X = np.random.rand(10, 50)

# Reduce 50 features down to 3
pca = PCA(n_components=3)
X_reduced = pca.fit_transform(X)

print(f"Original shape: {X.shape}")         # (10, 50)
print(f"Reduced shape: {X_reduced.shape}")   # (10, 3)
```
