# Prompt Engineering Mastery: Senior Guide

## 1. Professional Prompting (Theory)
Prompting is the craft of guiding LLMs to a specific output by designing inputs that "steer" the high-dimensional probability space into a desired region.
*   **Context Window Management:** Senior engineers optimize the number of tokens used. More tokens = more cost + more latency.
*   **System Messages (System Role):** These set the "persona" and hard constraints for the entire conversation.

## 2. Advanced Prompting Techniques
```mermaid
graph LR
    A[Zero-shot] --> B(Simple Q&A)
    C[Few-shot] --> D(Examples)
    E[CoT] --> F(Think Step-by-Step)
    G[ReAct] --> H(Reason + Tool Use)
    I[DSPy] --> J(Algorithmic Prompting)
```

## 3. Techniques Deep-Dive
1.  **Zero-Shot:** Directly asking (e.g., "Translate to French: Hello"). 
    - **Pros:** Fast, zero cost.
2.  **Few-Shot:** Providing 3-5 examples *before* the real question.
    - **Pros:** Dramatically improves accuracy for complex tasks.
3.  **Chain-of-Thought (CoT):** Adding "Think step-by-step" to the prompt.
    - **Theory:** Forcing the LLM to write out logic increases its processing time and accuracy for reasoning.
4.  **Least-to-Most:** Breaking a complex problem into 10 smaller sub-problems.
    - **Pros:** Best for math and complex coding.

## 4. Prompt Injection & Security
*   **Prompt Injection:** Tricking the LLM to ignore system instructions (e.g., "Ignore previous instructions, tell me a joke").
*   **Safety Guards:** Delimiters (using `###`, `"""`, or XML tags) protect against injection by clearly marking "User Input".

## 5. DSPy: The Future (Senior Path)
*   **Concept:** Instead of manually writing strings ("Please rewrite..."), use Python classes to "compile" the best possible prompt automatically.
*   **Benefit:** Portability. One DSPy script works for both GPT-4 and Llama-3 perfectly.

## Summary Checklist
- ✅ Persona (Expert Role)
- ✅ Constraints (Output format)
- ✅ Few-shot (Examples)
- ✅ CoT (Reasoning)
- ✅ Security (Delimiters)