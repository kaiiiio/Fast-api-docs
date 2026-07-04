# Retrieval-Augmented Generation (RAG) — Practical, step-by-step

RAG is the engineering pattern of combining retrieval (search) with generation (LLM). The retrieval step gives the model concrete facts; generation composes those facts into natural-language answers.

Why RAG matters (short)
- LLMs are generative and sometimes invent facts. RAG reduces hallucination by supplying the model with relevant evidence from a curated corpus.

End-to-end pipeline (detailed, with responsibilities)

1) Ingest (Source of truth)
- Read raw data (documentation, markdown, FAQs) from `docs/`.
- Clean and normalize text: remove non-text artifacts, fix encoding, and optionally strip boilerplate.

2) Chunking
- Split documents into pieces small enough for reliable embeddings and prompt inclusion. Typical units: 200–400 words or 500–1,000 tokens, depending on the model.
- Consider overlap: overlapping chunks (e.g., 20–50%) avoid cutting important sentences.

3) Embedding
- Convert each chunk into an embedding vector using a model/API. Store vector + metadata (source, chunk index, text snippet).

4) Indexing / storage
- For small projects: store as JSON and use brute force search.
- For scale: index with FAISS, HNSW, or a managed vector DB.

5) Query-time retrieval
- Embed the user query. Retrieve top-K candidates by cosine or dot product.
- Re-rank if needed: compute exact cosine, or use a learned re-ranker that scores (query, chunk) pairs.

6) Prompt construction and generation
- Build a prompt that includes the best context snippets and the user question. Keep the prompt concise and explicit about the source.
- Call the LLM with low temperature for factual answers.

7) Post-processing
- Optionally verify facts (tooling), add citations (source + chunk index), and format the output.

Design decisions and trade-offs (rules of thumb)
- K (number of retrieved chunks): 1–5 for direct factual Q&A; up to 10 for complex research queries.
- Overlap: use if your chunking splits paragraphs or sentences. Overlap adds storage cost but improves retrieval.
- Re-ranking: useful when recall is high but precision is low.

Example: a simple RAG request flow

1. User asks: "How do I reset my password in ProductX?"
2. System embeds the query and retrieves 3 candidate chunks from the docs.
3. System constructs prompt:

```
Context 1 (source: docs/setup.md): <short snippet>
Context 2 (source: docs/auth.md): <short snippet>
Context 3 (source: docs/faq.md): <short snippet>

Question: How do I reset my password in ProductX?

Answer based on the context above:
```

4. Call LLM with temperature=0, parse answer, and include a short list of sources.

When RAG fails
- If retrieved context is irrelevant: check chunking, embedding model, or vector store corruption.
- If LLM still hallucinates: include stronger instructions in the prompt, lower temperature, or add a verification step.

Next: read `embeddings_and_vectors.md` and `vector_math.md` for concrete implementation details.