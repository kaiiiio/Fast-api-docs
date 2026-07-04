# PgVector for Embeddings: Minimal Guide

## Core Concept
*   **Definition:** Extension for PostgreSQL that allows storing and querying high-dimensional vectors (Embeddings).
*   **Extension:** `CREATE EXTENSION IF NOT EXISTS vector;`.

## Implementation in SQLAlchemy
*   **Column:** `embedding = Column(Vector(1536))` (e.g., OpenAI dimension size).
*   **Similarity:** Use `<->` (L2 distance), `<#>` (Inner product), or `cosine_distance(|)` for matching.

## Indexing (Performance)
1.  **HNSW:** Hierarchical Navigable Small World. Fast, high recall, but uses more memory. Best for production.
2.  **IVFFlat:** Inverted File Flat. Simpler, low memory, but slower search for massive datasets.

## Implementation Essentials
- ✅ Use **Cosine Distance** for most embedding-based searches.
- ✅ Always explicitly use **`Vector(dimension)`** for column definition.
- ✅ Store **Embeddings** separately from main metadata for better cache performance.

## Summary Checklist
- ✅ Extension enabled
- ✅ Vector column defined
- ✅ HNSW index created for speed
