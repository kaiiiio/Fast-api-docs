# Generative AI, NLP & Computer Vision

## ✨ Generative AI (GenAI)
The shift from **Discriminative** (Classifying data) to **Generative** (Creating data).

### Popular GenAI Tools
- **Text**: ChatGPT (OpenAI), Claude (Anthropic), Gemini (Google).
- **Code**: GitHub Copilot, Cursor AI, Cline.
- **Images**: Midjourney, DALL-E 3, Stable Diffusion.

---

## 🗣️ Natural Language Processing (NLP) & LLMs
The bridge between human language and machine understanding.

### Core Concepts
- **Tokens**: Breaking down text into smaller units (words or sub-words).
- **Embeddings**: Representing words as high-dimensional vectors (e.g., "King" - "Man" + "Woman" = "Queen").
- **Context Window**: The amount of text the model can "remember" at once during a conversation.
- **LLMs (Large Language Models)**: Massive transformers trained on petabytes of text (Petabytes -> Terabytes -> GPT).

---

## 👁️ Computer Vision (CV)
Helping machines "see" and interpret the visual world.

### Tasks
- **Image Classification**: "What is in this image?"
- **Object Detection**: "Where is the cat and where is the dog?" (Bounding Boxes).
- **Segmentation**: Pixel-level understanding (Self-driving cars identifying "road" vs "sidewalk").

---

## 🛡️ Anomaly Detection: Isolated Forest
Used for finding outliers in unsupervised data.

- **How it works**: It isolates observations by randomly selecting a feature and a split value. Outliers are "weird" and take fewer splits to isolate than normal points.
- **Use Case**: Credit card fraud, network intrusion.

### 🐍 Python: Isolated Forest (Scikit-Learn)
```python
from sklearn.ensemble import IsolationForest
import numpy as np

# Normal Data + 1 Outlier
data = np.array([[1], [1.1], [0.9], [1.05], [5]]) 

clf = IsolationForest(contamination=0.2) # Expecting 20% outliers
clf.fit(data)

# Predict (-1 for outlier, 1 for inlier)
predictions = clf.predict(data)
print(predictions) # Output: [ 1  1  1  1 -1]
```

---

## 🛠️ Essential Tools for ML/AI
- **Libraries**: Numpy, Pandas, Scikit-Learn (Basic ML).
- **Frameworks**: PyTorch, TensorFlow, Keras (Deep Learning).
- **Deployment**: Ollama (Local LLMs), AWS SageMaker, MLOps (Monitoring/Scaling).
