# Autonomous Agents Intro: Mid-to-Senior Guide

## 1. What is an Agent? (Theory)
An Agent is an LLM with **Agency**. It doesn't just "talk"; it acts.
*   **The Concept:** LLM (The Brain) + Planning (The Loop) + Tools (The Hands).
*   **Reasoning Loop:** The agent generates an internal "Thought" → Decides on an "Action" → Observes the "Result" (Environment) → Repeats until done.

## 2. Agentic Reasoning Diagram
```mermaid
graph TD
    A[Task (User Query)] --> B[Thought: What do I do? ]
    B --> C[Action: Run Tool (Search/Python)]
    C --> D[Observation: I found X]
    D --> E{Is Task Done? }
    E -->|No| B
    E -->|Yes| F[Final Answer]
```

## 3. High-level Design (Senior Path)
1.  **Memory:**
    - **Short-term:** Context window (what happened in the last 10 steps).
    - **Long-term:** External DB (RAG) (what we did in the project 3 months ago).
2.  **Tool Use:** Exposing a simple JSON-encoded function call to the LLM. 
    - **Example:** `{"tool": "google_search", "query": "latest news about AI"}`.
3.  **Self-Correction:** If the code the agent wrote fails, it sees the traceback and rewrites the code automatically.

## 4. Why Agents Fail? (Senior Insight)
*   **Looping:** The agent gets stuck in a "Thought-Action" loop without progressing.
*   **Hallucinating Tools:** Inventing tools that don't exist (e.g., trying to use "admin_super_access").
*   **Instruction Drift:** Forgetting the original task after 50 steps of reasoning.

## 5. Main Frameworks
- 🏗️ **LangChain (LangGraph):** Best for complex, cyclic state-machines.
- 🏗️ **CrewAI:** Best for multi-agent "Roles" (Manager, Researcher, Writer).
- 🏗️ **AutoGen:** Microsoft's framework for multi-agent conversations.

## Summary Checklist
- ✅ Task decomposition (Splitting big tasks)
- ✅ Planning (Reasoning loops)
- ✅ Tool selection (External API access)
- ✅ Memory management (Retrieval)
- ✅ Agentic self-correction (Refinement)