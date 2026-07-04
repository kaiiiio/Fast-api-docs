# LLM Fundamentals: Mid-to-Senior Guide

## 1. What is an LLM? (Theory)
Large Language Models (LLMs) are deep learning models (Transformers) trained on massive datasets to predict the next token in a sequence.
*   **The Concept:** They are high-dimensional probability engines. They don't "think"; they calculate the most likely continuation of text.
*   **Tokenization:** Text is broken into "tokens" (chunks of ~4 chars). LLMs process tokens, not words.
*   **Parameters:** The "weights" in the neural network. GPT-4 has ~1.76 trillion parameters. More parameters = more capacity for complex reasoning.

## 2. Transformer Architecture (Diagram)
```mermaid
graph TD
    A[Input Token] --> B[Self-Attention Layer]
    B --> C[Feed Forward Network]
    C --> D[Residual Connection & Normalization]
    D --> E[Output Logits (Probability)]
    E --> F[Next Token Prediction]
```

## 3. Key Concepts for Seniors
*   **Context Window:** The maximum number of tokens the model can "remember" in a single conversation. (e.g., 128k for Claude 3).
*   **Temperature (0 to 2):** 
    - **Low (0.1):** Deterministic, factual, boring. (Best for coding/math).
    - **High (1.0+):** Creative, random, hallucination-prone. (Best for creative writing).
*   **Top-P (Nucleus Sampling):** Samples from the smallest set of tokens whose cumulative probability is P. Helps prevent repetitiveness.

## 4. Training Stages
1.  **Pre-training:** Next-token prediction on the entire internet (Raw knowledge).
2.  **SFT (Supervised Fine-Tuning):** Tuning on human-written Q&A pairs (Follows instructions).
3.  **RLHF (Reinforcement Learning from Human Feedback):** Ranking responses (Aligns with human values/safety).

## 5. Hallucinations (Why they happen)
*   **Definition:** Confidently stating false information.
*   **Cause:** LLMs always prioritize a high-probability continuation, even if the "truth" isn't in their training data.
*   **Fix:** RAG (Retrieval) or grounding in external evidence.

## Summary Checklist
- ✅ Tokenization (Input)
- ✅ Transformer (Computation)
- ✅ Reward Models (Alignment)
- ✅ Context Window (Memory)
- ✅ Temperature/Top-P (Creativity control)
