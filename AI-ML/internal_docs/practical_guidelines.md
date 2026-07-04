# Practical Guidelines — Building and Maintaining a RAG System

This file contains practical tips and best practices for working with RAG systems and the code in this repo.

1) Keys and security
- Keep API keys out of source control (`.env`, secrets manager).

2) Chunking strategy
- Choose chunk size to balance context and specificity. Consider overlaps (20–50% overlap) to preserve continuity.

3) Batching
- Batch embedding requests where supported. For example send 50–100 chunks in one call if the API supports it.

4) Caching
- Cache embeddings and LLM responses when appropriate to avoid repeated calls and reduce cost.

5) Indexing at scale
- Move to an ANN index (FAISS, HNSW) when vector counts exceed a few tens of thousands.

6) Re-ranking and safety
- Re-rank ANN candidates with exact cosine or a lightweight cross-encoder.
- Sanitize or redact sensitive info before sending to external APIs.

7) Testing
- Unit-test chunking logic and vector math with deterministic inputs.
- Mock embedding APIs in CI to avoid cost.

8) Monitoring
- Track latency, costs, and quality (human evaluations, precision metrics).
