# Vector Embeddings: Minimal Guide

## Core Flow
1.  **Generate:** Clean text → `OpenAI` / `HuggingFace` → Generate `1536` dimension vector.
2.  **Store:** Save Vector and Metadata into **PGVector** or **Pinecone**.
3.  **Search:** Query text → Convert to Vector → **ANN (Approximate Nearest Neighbor)** search.

## Best Practices
- ✅ Metadata: Store original text and its vector in the same record for speed.
- ✅ Caching: Cache common queries and their generated embeddings in **Redis**.
- ✅ Chunking: Split long documents into chunks (e.g., 500-1000 tokens) before embedding.
- ✅ Indexing: Use **HNSW** for fast production searches.

## Code Essentials (Pseudocode)
```python
# Create embedding
embedding = await ai_client.embeddings.create(input=text)

# Save to PGVector
stmt = insert(Doc).values(content=text, vector=embedding.data[0].embedding)
await db.execute(stmt)
```

## Summary Checklist
- ✅ Document chunking strategy
- ✅ Embedding provider chosen
- ✅ PGVector or Vector DB initialized
- ✅ Search with Cosine Distance
