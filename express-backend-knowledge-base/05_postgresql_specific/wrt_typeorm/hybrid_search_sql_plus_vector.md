# Hybrid Search: Combining SQL and Vector Search in TypeORM

Hybrid search is the practice of combining traditional relational database filters (where, price, category) with vector similarity search (semantic meaning). This allows for highly precise and contextually relevant search results.

## 📝 Interview-Ready Definitions  --- IMP

**Hybrid Search:** A search strategy that uses both structural metadata filters (SQL) and semantic vector distance (pgvector) to refine results. It solves the "semantic gap" where a user might search for "notebook" but only find "laptop" if using traditional keyword search.

**Reciprocal Rank Fusion (RRF):** An algorithm frequently used in hybrid search to combine rankings from different search methods (e.g., Full-Text Search and Vector Search) without needing to normalize their scores into the same range.

---

## 1. Implementation in TypeORM

In TypeORM, hybrid search is best implemented using the `QueryBuilder` to combine standard relational conditions with vector distance operators.

### Basic Hybrid Search (Metadata + Vector)

```typescript
async function hybridSearch(query: string, maxPrice: number, category: string) {
    // 1. Generate Query Embedding (externally via OpenAI/HuggingFace)
    const queryVector = await getEmbedding(query);

    // 2. Combine SQL Filters and Vector Similarity
    return await productRepo.createQueryBuilder("p")
        .select("p.id", "id")
        .addSelect("p.name", "name")
        .addSelect("p.price", "price")
        // Vector similarity score
        .addSelect("1 - (p.embedding <=> :vector)", "similarity")
        .where("p.price <= :maxPrice", { maxPrice })
        .andWhere("p.category = :category", { category })
        // Set a minimum similarity threshold for relevance
        .andWhere("p.embedding <=> :vector < :threshold", { 
            vector: JSON.stringify(queryVector),
            threshold: 0.4
        })
        .orderBy("1 - (p.embedding <=> :vector)", "DESC")
        .getRawMany();
}
```

---

## 2. Advanced Hybrid: Text Search + Vector Search

For the highest quality results, you can combine PostgreSQL's **Full-Text Search (TSVector)** with **Vector Search (pgvector)**.

```typescript
async function advancedHybridSearch(query: string) {
    const vector = await getEmbedding(query);

    return await articleRepo.createQueryBuilder("a")
        .select("a.title", "title")
        // Combine TS_Rank and Vector Similarity using weighted addition
        .addSelect(`
            (ts_rank(to_tsvector('english', a.content), plainto_tsquery('english', :query)) * 0.4) + 
            ((1 - (a.embedding <=> :vector)) * 0.6)
        `, "combined_score")
        .where(`
            to_tsvector('english', a.content) @@ plainto_tsquery('english', :query)
            OR a.embedding <=> :vector < 0.5
        `, { 
            query,
            vector: JSON.stringify(vector)
        })
        .orderBy("combined_score", "DESC")
        .getRawMany();
}
```

---

## 3. Best Practices  --- IMP

1. **Score Weighting:** Finding the right balance between SQL filters and vector similarity often requires manual tuning (e.g., Vector = 70%, Text Search = 30%).
2. **Filtering Efficiency:** Always apply your "hard" filters (like `is_active = true` or `user_id = 1`) first to reduce the number of entries PostgreSQL has to calculate vector distances for.
3. **Indexing:** For hybrid search to be fast, you must have BOTH a standard index (B-tree) on your filter columns and a vector index (HNSW/IVFFlat) on your embedding column.
4. **Distance Metrics:** Ensure your vector distance operator (`<=>` for Cosine, `<->` for L2) matches what your embedding model was trained on.

---

## 🎯 Interview Questions: Hybrid Search

### Q1: What is the "Semantic Gap" and how does Hybrid Search solve it?

**Answer:**

The **Semantic Gap** occurs when a traditional SQL/Keyword search fails to understand the meaning behind a user's query. For example, a search for "warm winter coat" might not return a "thermal parka" if the literal words don't match. 
Hybrid Search solves this by using **Vector Search** to find meaning ("thermal parka" is semantically close to "winter coat") while using **SQL Filters** to respect hard constraints like "price < 100" and "size = L".

### Q2: Why is performance a concern in Hybrid Search, and how do you optimize it?

**Answer:**

Performance is a concern because calculating vector distance is computationally expensive compared to standard B-tree lookups. 

**Optimizations:**
1. **Pre-filtering:** Apply SQL filters first to narrow down the candidate set. 
2. **Indexing:** Use HNSW indexes for the vectors. 
3. **Quantization:** Reducing the precision of vectors to speed up distance calculations.
4. **Caching:** Cache the results of frequent broad semantic queries.

### Q3: Explain how you would weight different search scores in TypeORM.

**Answer:**

Since different search methods produce scores in different ranges (e.g., `ts_rank` is 0 to infinity, but Cosine similarity is 0 to 1), you must **normalize** the scores before combining them. A common approach in TypeORM is to use a weighted average in the `SELECT` clause, or simple addition if the ranges are comparable, allowing you to prioritize one method (like semantic similarity) over another based on the specific use case.

---

## Summary

1. **Hybrid Search** combines the precision of SQL with the intelligence of Vectors.
2. **TypeORM QueryBuilder** allows for seamless integration of both filter types.
3. **Weighted Scoring** is key to balancing text relevance and semantic similarity.
4. **Optimization** via pre-filtering and indexing is mandatory for production scale.
