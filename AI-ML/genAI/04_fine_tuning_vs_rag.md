# Fine-Tuning vs RAG: Senior Guide

## 1. The Core Choice (Theory)
A Senior Engineer chooses based on the **Problem**, not the **Hype**.
*   **Fine-Tuning:** Changing the "Weights" (Self-training). It's like teaching a student a new language.
*   **RAG:** Changing the "Context" (Searching). It's like giving a student a textbook during an exam.

## 2. Comparison Table
| Feature | RAG (Retrieval) | Fine-Tuning (Training) |
|---------|-----------------|------------------------|
| **Freshness** | ✅ Real-time (Now) | ❌ Static (Training date) |
| **Accuracy** | ✅ Explains "Why" | ❌ Just "Guesses" |
| **Training Cost** | ⚡ Cheap (None) | 🐌 Expensive (GPU/Time) |
| **New Knowledge** | ✅ Best for facts | ❌ Bad for new facts |
| **Role/Persona** | ❌ Harder to tune | ✅ Best for style/tone |

## 3. When to Fine-Tune?
1.  **Specialized Vocabulary:** Training a model for Law or Medical jargon it has never seen.
2.  **Specific JSON Output:** Forcing the model to ALWAYS return a very complex structure.
3.  **Efficiency:** Fine-tuning a smaller model (e.g., Llama-7B) to perform as well as GPT-4 on one specific task. (Saves $ in production).

## 4. When to Use RAG?
1.  **Frequently Changing Data:** Stock prices, news, company internal wikis.
2.  **Privacy:** You can just delete a chunk in the database. You **cannot** "un-train" a fine-tuned model easily.
3.  **Traceability:** RAG tells you exactly which document it used. Fine-tuning just says "I think this is the answer".

## 5. Hybrid Approach (The Senior Path)
- **Step 1:** RAG first. (Low risk, high value).
- **Step 2:** Fine-tune only if RAG fails to capture the "Domain Style" or the model is consistently ignoring your system prompt.

## Summary Checklist
- ✅ Data freshness (RAG)
- ✅ Style/Persona (Fine-Tuning)
- ✅ Traceability (RAG)
- ✅ Infrastructure cost (RAG is cheaper)
- ✅ Dataset size (Fine-tuning needs 1000s of examples)
