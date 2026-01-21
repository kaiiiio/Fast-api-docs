# Deep Learning & Neural Networks: The Engines of AI

## 🧠 What is a Neural Network?
A mathematical model inspired by the human brain that consists of interconnected "neurons" arranged in layers.

### 1. The Anatomy of a Neuron
A single neuron performs a simple computation:
1. **Inputs ($x$)**: Incoming data.
2. **Weights ($w$)**: Importance of each input.
3. **Bias ($b$)**: Offset to shift the activation.
4. **Summation**: $z = (w_1x_1 + w_2x_2 + ...) + b$
5. **Activation Function ($f$)**: Determines if the neuron "fires" (e.g., ReLU, Sigmoid).
   - **Output**: $a = f(z)$

---

## 🏗️ Neural Network Layers
- **Input Layer**: Receives the raw data.
- **Hidden Layers**: Layers between input and output where feature extraction happens.
- **Output Layer**: Produces the final prediction (Probability or Value).

---

## 🔄 The Training Process: Forward & Backward Prop
Training is an iterative "Guess and Correct" cycle:
1. **Forward Propagation**: Data flows through the network to generate a prediction.
2. **Loss Function**: Calculates the "Error" (difference between prediction and actual value).
3. **Backward Propagation**: Uses **Gradients** to update $w$ and $b$ to minimize the loss.
4. **Optimizer**: The strategy used to update weights (e.g., Adam, SGD).

---

## 🚀 Common Neural Network Architectures

### 1. Feedforward Neural Networks (FNN)
- **Structure**: Information moves in one direction—from input to output.
- **Use Case**: Simple tabular data classification.

### 2. Recurrent Neural Networks (RNN) & LSTM
- **Structure**: Features "Memory"; output of one step is fed as input to the next.
- **Deep Dive (LSTM)**: Long Short-Term Memory handles the "Vanishing Gradient" problem in pure RNNs.
- **Use Case**: Time-Series (Stock price), Translation (NLP).

### 3. Convolutional Neural Networks (CNN)
- **Structure**: Uses **Convolution** filters to detect spatial patterns (edges, shapes).
- **Layers**: Convolution -> Pooling -> Fully Connected.
- **Use Case**: Computer Vision (Images, Videos), Facial Recognition.

### 4. Transformers (The Modern Standard)
- **Structure**: Uses **Attention Mechanisms** to process all tokens in a sequence simultaneously (Parallelism).
- **Impact**: Replaced RNNs for NLP; the architecture behind BERT and GPT.

---

## 🐍 Python Implementation: Simple Neural Net (PyTorch)
```python
import torch
import torch.nn as nn

# Define a simple FNN
class SimpleNet(nn.Module):
    def __init__(self):
        super(SimpleNet, self).__init__()
        self.hidden = nn.Linear(10, 5) # 10 inputs, 5 hidden neurons
        self.output = nn.Linear(5, 1)  # 1 output
        self.relu = nn.ReLU()

    def forward(self, x):
        x = self.relu(self.hidden(x))
        x = self.output(x)
        return x

# Initialize Model
model = SimpleNet()
print(model)
```
