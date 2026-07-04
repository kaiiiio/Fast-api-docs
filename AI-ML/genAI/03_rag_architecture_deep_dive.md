# RAG (Retrieval Augmented Generation): Senior Guide

## 1. What is RAG? (Theory)
LLMs are static (frozen in time). RAG allows them to "search" a database *before* they answer. 
*   **Concepts:** It's "Open-Book" testing for AI. It combines the reasoning of an LLM with the knowledge of your data.
*   **The Main Benefit:** Zero hallucinations for your own data (e.g., your company's latest PDFs).

## 2. The RAG Pipeline Diagram
```mermaid
graph LR
    A[User Query] --> B[Generate Embedding Vector]
    B --> C[Vector DB Search]
    C --> D[Top K Results]
    D --> E[Query + Top K + System Prompt]
    E --> F[LLM (Final Response)]
```

## 3. High-level Strategy (Senior Path)
1.  **Chunking:** Splitting a 100-page PDF into 500-token chunks.
    - **Overlapping:** 10-20% overlap between chunks ensures context isn't lost.
2.  **Embeddings:** Converting chunks into high-dimensional vectors (e.g., `1536` dimensions).
3.  **Vector Store:** Specialized DBs (e.g., **Pinecone**, **Milvus**, **Weaviate**) to find "similar" vectors.

## 4. Advanced RAG (Mid-to-Senior)
*   **Query Expansion:** Rewrite the user query into 3 different versions for better search coverage.
*   **Reranking:** Collect 20 chunks from the DB, but only give the LLM the top 5 most relevant ones (using a Reranker model).
*   **Hybrid Search:** Semantic (Meaning) + Keyword (Exact match) search combined.

## 5. RAG vs. Fine-tuning
- ✅ **RAG:** Best for new facts, company data, and updating info (e.g., Today's stock price).
- ✅ **Fine-tuning:** Best for changing the model's "style" or "tone" or for highly specialized task mastery.

## Summary Checklist
- ✅ Data Ingestion (PDF/Text)
- ✅ Chunking Strategy (500 tokens + Overlap)
- ✅ Embedding Model (OpenAI ada-002)
- ✅ Semantic Search (Vector DB)
- ✅ Reranking (Post-retrieval)
