# Embedding Generation and Storage: Vector Embeddings

Vector embeddings enable semantic search and similarity matching. This guide covers generating and storing embeddings in Express.js applications.

## What are Embeddings?

**Embeddings** are numerical representations of text that capture semantic meaning. Similar texts have similar embeddings.

## Generating Embeddings

```javascript
const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateEmbedding(text) {
    const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text
    });
    
    return response.data[0].embedding;  // Array of 1536 numbers
}

// Batch generation
async function generateEmbeddings(texts) {
    const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts  // Array of texts
    });
    
    return response.data.map(item => item.embedding);
}
```

## Storing Embeddings

### PostgreSQL with pgvector

```javascript
// Create table with vector column
await sequelize.query(`
    CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        content TEXT,
        embedding vector(1536)
    )
`);

// Store document with embedding
async function storeDocument(content) {
    const embedding = await generateEmbedding(content);
    
    await sequelize.query(`
        INSERT INTO documents (content, embedding)
        VALUES (:content, :embedding::vector)
    `, {
        replacements: {
            content,
            embedding: JSON.stringify(embedding)
        }
    });
}
```

## Real-World Examples

### Example 1: Document Search

```javascript
// Store and search documents
class DocumentService {
    async storeDocument(content, metadata = {}) {
        const embedding = await generateEmbedding(content);
        
        const result = await sequelize.query(`
            INSERT INTO documents (content, embedding, metadata)
            VALUES (:content, :embedding::vector, :metadata::jsonb)
            RETURNING id
        `, {
            replacements: {
                content,
                embedding: JSON.stringify(embedding),
                metadata: JSON.stringify(metadata)
            },
            type: sequelize.QueryTypes.SELECT
        });
        
        return result[0].id;
    }
    
    async searchDocuments(query, limit = 10) {
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
}

// Use in routes
app.post('/documents', async (req, res) => {
    const docId = await documentService.storeDocument(req.body.content);
    res.json({ id: docId });
});

app.get('/documents/search', async (req, res) => {
    const results = await documentService.searchDocuments(req.query.q);
    res.json(results);
});
```

### Example 2: Product Recommendations

```javascript
// Generate and store product embeddings
async function indexProduct(product) {
    const text = `${product.name} ${product.description} ${product.category}`;
    const embedding = await generateEmbedding(text);
    
    await sequelize.query(`
        UPDATE products
        SET embedding = :embedding::vector
        WHERE id = :id
    `, {
        replacements: {
            id: product.id,
            embedding: JSON.stringify(embedding)
        }
    });
}

// Find similar products
async function findSimilarProducts(productId, limit = 5) {
    const product = await Product.findByPk(productId);
    
    const results = await sequelize.query(`
        SELECT 
            id,
            name,
            price,
            1 - (embedding <=> :embedding::vector) AS similarity
        FROM products
        WHERE id != :id
          AND embedding IS NOT NULL
          AND 1 - (embedding <=> :embedding::vector) > 0.8
        ORDER BY embedding <=> :embedding::vector
        LIMIT :limit
    `, {
        replacements: {
            id: productId,
            embedding: product.embedding,
            limit
        },
        type: sequelize.QueryTypes.SELECT
    });
    
    return results;
}
```

## Best Practices

1. **Batch Processing**: Generate embeddings in batches
2. **Cache Embeddings**: Cache for repeated texts
3. **Index Vectors**: Create HNSW or IVFFlat indexes
4. **Monitor Costs**: Track embedding API costs
5. **Update Embeddings**: Re-generate when content changes

## Summary

**Embedding Generation and Storage:**

1. **Purpose**: Semantic search and similarity matching
2. **Generation**: OpenAI embeddings API
3. **Storage**: PostgreSQL with pgvector
4. **Best Practice**: Batch processing, cache, index
5. **Use Cases**: Document search, recommendations

**Key Takeaway:**
Embeddings enable semantic search and similarity matching. Generate embeddings using OpenAI API. Store in PostgreSQL with pgvector. Create indexes (HNSW or IVFFlat) for performance. Batch process embeddings and cache when possible. Monitor API costs.

**Embedding Strategy:**
- Generate with OpenAI
- Store in pgvector
- Create indexes
- Batch process
- Cache when possible

**Next Steps:**
- Learn [pgvector](../05_postgresql_specific/pgvector_for_embeddings.md) for storage
- Study [Hybrid Search](../05_postgresql_specific/hybrid_search_sql_plus_vector.md) for combined search
- Master [Cost Tracking](ai_cost_tracking.md) for monitoring

