
# AI & Machine Learning Overview

This document gives a compact, practical introduction to the parts of machine learning that matter for this project: representation learning (embeddings), pretraining, and model APIs. The goal is for a junior developer to understand not just terms but how to reason about design choices.

1) What is AI and ML (practical view)
- AI: building systems that perform tasks like humans — but in practice we combine algorithms, data, and compute to produce behavior that looks intelligent.
- Machine learning: we provide data and an objective (a loss) and let the model learn parameters that minimize that objective. You write less explicit logic and rely on learned patterns.

2) Common learning paradigms
- Supervised learning: learn to map inputs -> outputs (e.g., text classification). You need labeled examples.
- Unsupervised learning: discover structure without labels (e.g., clustering, dimensionality reduction).
- Self-supervised learning: create labels from the data itself (e.g., predict next token). This is how large language models are trained and why they generalize well.

3) Why transformers and large models
- Transformers use attention mechanisms to model relationships between tokens. They scale well with data and compute.
- Large models are powerful because they learn broad language patterns from huge corpora; that makes them useful for many downstream tasks with little or no task-specific data.

4) Representation learning and embeddings
- The key idea: the model builds dense vector representations (embeddings) for inputs. Those vectors are useful because similar inputs map to nearby vectors.
- In RAG, we rely on embeddings to retrieve relevant context before asking the LLM to generate responses.

5) Hosted APIs vs local models — tradeoffs
- Hosted APIs (OpenAI, Groq, Voyage): easy to use, maintain, and usually have production-grade latency and safety. Cost and data control are tradeoffs.
- Local/self-hosted models: more control and privacy but require hardware, ops, and sometimes model engineering.

6) Failure modes to watch
- Hallucinations: LLMs may confidently state incorrect facts — retrieval helps reduce this.
- Bias and toxicity: models can reproduce biases from training data.
- Data leakage and privacy: embedding or sending sensitive data to third-party APIs has risks.

7) How this applies to the repo
- We use prebuilt embedding and LLM APIs to keep the code small and focused on RAG composition. Understanding representation learning helps you tune chunking, retrieval, and prompt composition.

Next: read `llm_architecture.md` and `embeddings_and_vectors.md` for specific, actionable details about tokens, embeddings, and using APIs.
