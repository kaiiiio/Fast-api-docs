# pgvector for Embeddings: Vector Search in PostgreSQL

pgvector is a PostgreSQL extension that enables storing and searching vector embeddings directly in your database. This guide covers using pgvector in Express.js applications for AI-powered search.

## What are Embeddings?

**Embeddings** are numerical representations of text, images, or other data. Similar items have similar embeddings (close vectors).

### Example

```
"dog" → [0.2, 0.8, 0.1, ...] (1536 numbers)
"puppy" → [0.21, 0.79, 0.12, ...] (very similar)
"airplane" → [0.9, 0.1, 0.8, ...] (very different)
```

## Why pgvector?

**Benefits:**
- Keep embeddings with relational data
- Use SQL for queries
- ACID transactions
- Single database (cost-effective)

## Installation

### Enable Extension

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### Using pgvector Package

```bash
npm install pgvector
```

## Basic Usage

### Create Table with Vector Column

```sql
-- Create table with vector column
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    content TEXT,
    embedding vector(1536)  -- 1536 dimensions for OpenAI
);

-- Create index for similarity search
CREATE INDEX ON documents 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

### Using with Sequelize

```javascript
const { Sequelize, DataTypes } = require('sequelize');
const { DataTypes: PgVectorTypes } = require('pgvector/sequelize');

// Note: Sequelize doesn't have built-in pgvector support
// Use raw SQL or custom type

// Create table with raw SQL
await sequelize.query(`
    CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        content TEXT,
        embedding vector(1536)
    )
`);

// Create index
await sequelize.query(`
    CREATE INDEX IF NOT EXISTS documents_embedding_idx 
    ON documents USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100)
`);
```

## Storing Embeddings

### Generate and Store Embeddings

```javascript
const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Generate embedding
async function generateEmbedding(text) {
    const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text
    });
    return response.data[0].embedding;
}

// Store document with embedding
app.post('/documents', async (req, res) => {
    const { content } = req.body;
    
    // Generate embedding
    const embedding = await generateEmbedding(content);
    
    // Store in database
    const result = await sequelize.query(`
        INSERT INTO documents (content, embedding)
        VALUES (:content, :embedding::vector)
        RETURNING id, content
    `, {
        replacements: {
            content,
            embedding: JSON.stringify(embedding)
        },
        type: sequelize.QueryTypes.SELECT
    });
    
    res.status(201).json(result[0]);
});
```

## Similarity Search

### Cosine Similarity Search

```javascript
// Find similar documents
app.get('/documents/search', async (req, res) => {
    const { query } = req.query;
    
    if (!query) {
        return res.status(400).json({ error: 'Query required' });
    }
    
    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query);
    
    // Similarity search
    const results = await sequelize.query(`
        SELECT 
            id,
            content,
            1 - (embedding <=> :embedding::vector) AS similarity
        FROM documents
        ORDER BY embedding <=> :embedding::vector
        LIMIT 10
    `, {
        replacements: {
            embedding: JSON.stringify(queryEmbedding)
        },
        type: sequelize.QueryTypes.SELECT
    });
    
    res.json(results);
});
```

### Similarity Operators

```sql
-- Cosine distance (<=>)
-- Returns distance (0 = identical, 2 = opposite)
SELECT embedding <=> '[0.1,0.2,0.3]'::vector AS distance;

-- Inner product (<#>)
SELECT embedding <#> '[0.1,0.2,0.3]'::vector AS distance;

-- L2 distance (<->)
SELECT embedding <-> '[0.1,0.2,0.3]'::vector AS distance;
```

## Real-World Examples

### Example 1: Document Search

```javascript
// Store and search documents
const Document = {
    async create(content) {
        const embedding = await generateEmbedding(content);
        
        const result = await sequelize.query(`
            INSERT INTO documents (content, embedding)
            VALUES (:content, :embedding::vector)
            RETURNING *
        `, {
            replacements: {
                content,
                embedding: JSON.stringify(embedding)
            },
            type: sequelize.QueryTypes.SELECT
        });
        
        return result[0];
    },
    
    async search(query, limit = 10) {
        const queryEmbedding = await generateEmbedding(query);
        
        const results = await sequelize.query(`
            SELECT 
                id,
                content,
                1 - (embedding <=> :embedding::vector) AS similarity
            FROM documents
            WHERE 1 - (embedding <=> :embedding::vector) > 0.7
            ORDER BY embedding <=> :embedding::vector
            LIMIT :limit
        `, {
            replacements: {
                embedding: JSON.stringify(queryEmbedding),
                limit
            },
            type: sequelize.QueryTypes.SELECT
        });
        
        return results;
    }
};

// Use in routes
app.post('/documents', async (req, res) => {
    const document = await Document.create(req.body.content);
    res.status(201).json(document);
});

app.get('/documents/search', async (req, res) => {
    const results = await Document.search(req.query.q);
    res.json(results);
});
```

### Example 2: Product Recommendations

```javascript
// Product recommendations using embeddings
app.get('/products/:id/recommendations', async (req, res) => {
    // Get product embedding
    const product = await sequelize.query(`
        SELECT embedding FROM products WHERE id = :id
    `, {
        replacements: { id: req.params.id },
        type: sequelize.QueryTypes.SELECT
    });
    
    if (!product[0]) {
        return res.status(404).json({ error: 'Product not found' });
    }
    
    // Find similar products
    const recommendations = await sequelize.query(`
        SELECT 
            id,
            name,
            price,
            1 - (embedding <=> :embedding::vector) AS similarity
        FROM products
        WHERE id != :id
          AND 1 - (embedding <=> :embedding::vector) > 0.8
        ORDER BY embedding <=> :embedding::vector
        LIMIT 5
    `, {
        replacements: {
            id: req.params.id,
            embedding: product[0].embedding
        },
        type: sequelize.QueryTypes.SELECT
    });
    
    res.json(recommendations);
});
```

## Indexing Strategies

### IVFFlat Index

```sql
-- IVFFlat index for approximate search
CREATE INDEX ON documents 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Lists: Number of clusters (more = slower build, faster search)
-- Use when: Large datasets, approximate search OK
```

### HNSW Index

```sql
-- HNSW index for fast approximate search
CREATE INDEX ON documents 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- m: Number of connections (more = better quality, slower)
-- ef_construction: Search width during build
-- Use when: Need fast search with good quality
```

## Best Practices

1. **Choose Right Index**: IVFFlat for large datasets, HNSW for quality
2. **Batch Embeddings**: Generate embeddings in batches
3. **Similarity Threshold**: Set minimum similarity threshold
4. **Monitor Performance**: Track query performance
5. **Update Indexes**: Rebuild indexes after bulk inserts

## Summary

**pgvector for Embeddings:**

1. **Purpose**: Store and search vector embeddings in PostgreSQL
2. **Installation**: Enable extension, use pgvector package
3. **Operations**: Store embeddings, similarity search
4. **Indexing**: IVFFlat or HNSW indexes
5. **Use Cases**: Semantic search, recommendations, AI features

**Key Takeaway:**
pgvector enables storing and searching vector embeddings directly in PostgreSQL. Generate embeddings using AI models (OpenAI, etc.), store them as vectors, and use similarity operators (<=>, <#>, <->) for search. Create appropriate indexes (IVFFlat or HNSW) for performance. Use pgvector for semantic search, recommendations, and AI-powered features.

**pgvector Features:**
- Vector storage
- Similarity search
- Multiple distance metrics
- Efficient indexing
- SQL integration

**Next Steps:**
- Learn [Hybrid Search](hybrid_search_sql_plus_vector.md) for combined search
- Study [JSONB and Full-Text Search](jsonb_and_full_text_search.md) for text search
- Master [Creating Vector Index](creating_vector_index.md) for performance

