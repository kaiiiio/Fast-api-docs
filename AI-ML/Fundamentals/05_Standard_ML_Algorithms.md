# Standard ML Algorithms: The Essential Arsenal

## 🎯 1-Line Definitions
- **Linear Regression**: Predicting a continuous number (e.g., Salary) based on input variables.
- **Logistic Regression**: Predicting a category (e.g., Yes/No) by calculating probabilities.
- **Decision Trees**: A flowchart-like structure that makes decisions based on feature values.
- **Random Forest**: An "ensemble" of many decision trees to increase accuracy and reduce overfitting.
- **SVM (Support Vector Machines)**: Finding the best boundary (hyperplane) that separates two classes with the widest margin.
- **K-Means Clustering**: Unsupervised grouping of data into 'K' clusters based on distance.
- **XGBoost / LightGBM**: High-performance "Gradient Boosting" that builds trees sequentially to correct previous errors.
- **PCA (Principal Component Analysis)**: Reducing the number of features (dimensions) while keeping the most important information.

---

## 🛠️ Deep Dive: Core Algorithms

### 1. Logistic Regression (The Classification Workhorse)
- **Concept**: Despite the name, it's for **Classification**. It uses the **Sigmoid Function** to squash any real-valued number into a range between 0 and 1.
- **Formula**: $P(Y=1) = \frac{1}{1 + e^{-z}}$
- **Use Case**: Predicting if an email is Spam (1) or Not Spam (0).

### 2. Random Forest (Strength in Numbers)
- **Concept**: Instead of one Decision Tree (which is prone to overfitting), it creates hundreds of trees using **Bootstrap Aggregating (Bagging)** and takes a "Majority Vote."
- **Benefit**: Extremely robust and handles missing data well.

### 3. Support Vector Machines (SVM)
- **Concept**: It looks for the **Maximum Margin Hyperplane**. If the data isn't linearly separable, it uses the **Kernel Trick** to project data into a higher dimension where it *is* separable.
- **Use Case**: Complex text classification or image recognition.

### 4. XGBoost (The Competition Winner)
- **Concept**: A type of **Boosting**. It adds trees one by one, where each new tree is trained to predict the "Residuals" (errors) of the previous trees.
- **Benefit**: Optimized for speed and performance; the "Go-to" algorithm for Kaggle competitions.

---

## 🐍 Python Implementation: Random Forest (Scikit-Learn)
```python
from sklearn.ensemble import RandomForestClassifier
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split

# Load data
iris = load_iris()
X_train, X_test, y_train, y_test = train_test_split(iris.data, iris.target, test_size=0.2)

# Create and Train
clf = RandomForestClassifier(n_estimators=100)
clf.fit(X_train, y_train)

# Accuracy
print(f"Model Accuracy: {clf.score(X_test, y_test) * 100:.2f}%")
```
