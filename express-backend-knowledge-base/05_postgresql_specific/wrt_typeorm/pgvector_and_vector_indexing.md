# pgvector and Vector Indexing: AI Search in TypeORM

pgvector is a PostgreSQL extension for vector similarity search. In the context of LLMs and AI, it allows you to store and search "embeddings" (mathematical representations of meaning) directly alongside your relational data in TypeORM.

## 📝 Interview-Ready Definitions  --- IMP

**Vector Embeddings:** Numerical representations of data (text, images, audio) in high-dimensional space. Similar items are closer together in this space.

**Cosine Similarity:** A metric used to measure how similar two vectors are. In PostgreSQL, this is calculated using the `<=>` operator (distance = 1 - similarity).

**HNSW (Hierarchical Navigable Small World):** A state-of-the-art index for approximate nearest neighbor search. It is faster and more accurate than IVFFlat for most similarity search use cases but uses more memory and takes longer to build.

**IVFFlat (Inverted File with Flat Compression):** An index that divides vectors into clusters. It is faster to build and uses less memory than HNSW but offers lower search quality (recall).

---

## 1. Setup and Entity Definition

### Install Requirements
```bash
npm install pgvector
```

### Entity Configuration
TypeORM doesn't have a native `vector` type in its standard decorators, so we use the `column` type property and the `pgvector` library for helper types.

```typescript
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Document {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('text')
    content: string;

    // 1536 is the dimension for OpenAI's text-embedding-3-small
    @Column({
        type: 'vector',
        length: 1536,
        nullable: true
    })
    embedding: string; // Stored as a string representation of the array
}
```

---

## 2. Similarity Search in TypeORM

Performing similarity search requires using the `QueryBuilder` to access PostgreSQL's specific vector operators.

### Semantic Search Example

```typescript
import { AppDataSource } from "../data-source";
import { Document } from "../entity/Document";

const documentRepo = AppDataSource.getRepository(Document);

async function semanticSearch(queryVector: number[]) {
    // 1 - (A <=> B) converts Cosine Distance to Cosine Similarity
    return await documentRepo
        .createQueryBuilder("doc")
        .select("doc.id", "id")
        .addSelect("doc.content", "content")
        .addSelect("1 - (doc.embedding <=> :vector)", "similarity")
        .where("doc.embedding <=> :vector < :threshold", { 
            vector: JSON.stringify(queryVector),
            threshold: 0.3 // Distance threshold
        })
        .orderBy("doc.embedding <=> :vector", "ASC")
        .limit(5)
        .getRawMany();
}
```

---

## 3. Vector Indexing Strategies  --- IMP

Indexing is critical for performance when your dataset grows beyond a few thousand vectors.

### HNSW Index (Recommended for Quality)
HNSW creates a multi-layered graph for fast navigation to similar vectors.

```typescript
// Migration code
await queryRunner.query(`
    CREATE INDEX idx_document_embedding_hnsw 
    ON document USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
`);
```

### IVFFlat Index (Recommended for Memory/Build Speed)
IVFFlat partitions the space into clusters.

```typescript
// Migration code
await queryRunner.query(`
    CREATE INDEX idx_document_embedding_ivfflat 
    ON document USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
`);
```

| Index Type | Build Speed | Search Speed | Memory Usage | Quality (Recall) |
|------------|-------------|--------------|--------------|------------------|
| **HNSW**   | ❌ Slow      | ✅ Very Fast  | ❌ High       | ✅ High           |
| **IVFFlat**| ✅ Fast      | ⚠️ Medium     | ✅ Low        | ⚠️ Medium         |

---

## 4. Best Practices

1. **Match Dimensions:** Ensure the `length` in your TypeORM column exactly matches the output dimensions of your embedding model (e.g., 1536 for OpenAI, 384 for many HuggingFace models).
2. **Normalize Vectors:** If using Inner Product (`<#>`), ensure your vectors are normalized to unit length. For Cosine Distance (`<=>`), normalization is handled automatically.
3. **Thresholding:** Always provide a distance or similarity threshold in the `WHERE` clause to avoid returning irrelevant "least similar" results.
4. **Batch Processing:** When embedding large datasets, use a task queue (like BullMQ) to avoid blocking your Express.js event loop with expensive HTTP calls to AI providers.

---

## 🎯 Interview Questions: pgvector & AI Search

### Q1: Why use pgvector instead of a dedicated Vector DB like Pinecone or Weaviate?

**Answer:**

The primary reason is **Data Locality and Simplicity**. By using pgvector, you can perform **Hybrid Queries** (filtering by relational data AND vector similarity) in a single SQL statement. 

**Example:** "Find the 5 most similar documents *created by user X* in the *last 30 days*."
In a dedicated vector DB, you would have to sync data between two systems, which adds complexity, latency, and consistency issues. PostgreSQL gives you ACID compliance for your vectors.

### Q2: What happens if I query a vector column without an index?

**Answer:**

PostgreSQL will perform a **Sequential Scan (Exact Search)**. It will calculate the distance between your query vector and every single vector in the table. While this is 100% accurate, it is extremely slow ($O(N)$) and will crash or hang your Express.js application once you have more than a few thousand rows. 

### Q3: When should I choose HNSW over IVFFlat?

**Answer:**

Choose **HNSW** for most production applications where search speed and result quality (recall) are the top priorities, and you have enough RAM to store the index. 
Choose **IVFFlat** only if you have massive datasets where HNSW memory usage becomes prohibitive, or if you need to build/rebuild indexes very frequently during development.

---

## Summary

1. **pgvector** turns PostgreSQL into a high-performance Vector Database.
2. **TypeORM** handles vector columns via the `vector` type and `QueryBuilder` distance operators (`<=>`).
3. **HNSW** is the gold standard for vector indexing in production.
4. **Hybrid Search** is the biggest advantage of pgvector, allowing relational and semantic filters in one query.
