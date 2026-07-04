# Multi-Agent Systems: Mid-to-Senior Guide

## 1. What is a Multi-Agent System (MAS)? (Theory)
A system where multiple agents (LLMs with distinct roles) collaborate to solve a task.
*   **The Concept:** Specialization beats Generalization. One agent for "Research", one for "Writing", and one for "Critique".
*   **Orchestration:** How to manage the sequence and "State" of conversations between agents.

## 2. Multi-Agent Orchestration Diagram
```mermaid
graph TD
    A[User Task] --> B[Manager Agent (Plan)]
    B --> C[Researcher Agent (Search)]
    B --> D[Engineer Agent (Code)]
    C --> E(Result)
    D --> E
    E --> F[Reviewer Agent (Verify)]
    F -->|Fail| B
    F -->|Pass| G[Final Output]
```

## 3. High-level Design (Senior Path)
1.  **Shared Memory:** A common database where agents can read/write shared context (e.g., **Redis**). 
2.  **State Management:** Using **LangGraph** (Cyclic DAGs) to define which agent goes next based on "Logic Gates".
3.  **Human-in-the-loop (HITL):** Forcing the agent to wait for a human "Approve/Reject" before performing a critical action (e.g., "Send Email").

## 4. Key Agent Archetypes
- 🛡️ **The Manager:** Breaks down tasks, assigns agents, and verifies the final output.
- 🔍 **The Researcher:** Specialized in RAG, Web search, and PDF parsing.
- 🛠️ **The Executor:** Specialized in writing and running code.
- 🚦 **The Reviewer:** Specialized in identifying errors, hallucinations, or security leaks.

## 5. Main Frameworks (Mid-to-Senior)
*   **CrewAI:** Best for role-based processes (sequential or hierarchical).
*   **LangGraph:** Best for complex state-machines where agents can "loop back" freely.
*   **AutoGen (Microsoft):** Best for open-ended agent-to-agent conversations.

## Summary Checklist
- ✅ Role-based specialization (Distinct LLMs)
- ✅ Orchestration strategy (Sequential/DAG/Hierarchical)
- ✅ Shared memory (Redis/Context)
- ✅ State machine (Cyclic loops)
- ✅ Human-in-the-loop (Safety)