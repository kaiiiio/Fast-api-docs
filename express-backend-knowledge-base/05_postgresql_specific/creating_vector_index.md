# Creating Vector Index: Optimizing pgvector Performance

Creating proper indexes on vector columns is crucial for performance. This guide covers creating and optimizing vector indexes for pgvector in Express.js applications.

## Why Index Vector Columns?

**Vector indexes** enable fast similarity search on large datasets. Without indexes, similarity search requires scanning all vectors.

### Performance Impact

```sql
-- Without index: Sequential scan (slow)
SELECT * FROM documents 
ORDER BY embedding <=> '[0.1,0.2,...]'::vector 
LIMIT 10;
-- Time: O(n) - scans all vectors

-- With index: Index scan (fast)
-- After creating index
-- Time: O(log n) - uses index
```

## Index Types

### IVFFlat Index

**IVFFlat** (Inverted File with Flat compression) is an approximate index for fast similarity search.

```sql
-- Create IVFFlat index
CREATE INDEX idx_documents_embedding_ivfflat 
ON documents 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Parameters:
-- lists: Number of clusters (more = slower build, faster search)
-- Recommended: sqrt(total_rows) to total_rows/10
```

### HNSW Index

**HNSW** (Hierarchical Navigable Small World) provides fast approximate search with better quality.

```sql
-- Create HNSW index
CREATE INDEX idx_documents_embedding_hnsw 
ON documents 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Parameters:
-- m: Number of connections (more = better quality, slower)
-- ef_construction: Search width during build (more = better quality, slower)
```

## Choosing Index Type

### IVFFlat vs HNSW

| Feature | IVFFlat | HNSW |
|---------|---------|------|
| Build Speed | Faster | Slower |
| Search Speed | Fast | Very Fast |
| Quality | Good | Better |
| Memory | Less | More |
| Use When | Large datasets, approximate OK | Need quality, smaller datasets |

## Real-World Examples

### Example 1: Creating Index for Documents

```javascript
// Create vector index
async function createVectorIndex() {
    await sequelize.query(`
        -- Drop existing index if any
        DROP INDEX IF EXISTS idx_documents_embedding_ivfflat;
        
        -- Create IVFFlat index
        CREATE INDEX idx_documents_embedding_ivfflat 
        ON documents 
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);
    `);
    
    console.log('Vector index created');
}

// Create index after bulk insert
app.post('/documents/bulk', async (req, res) => {
    const documents = req.body;
    
    // Insert documents
    for (const doc of documents) {
        const embedding = await generateEmbedding(doc.content);
        await sequelize.query(`
            INSERT INTO documents (content, embedding)
            VALUES (:content, :embedding::vector)
        `, {
            replacements: {
                content: doc.content,
                embedding: JSON.stringify(embedding)
            }
        });
    }
    
    // Rebuild index after bulk insert
    await createVectorIndex();
    
    res.json({ message: 'Documents inserted and index created' });
});
```

### Example 2: HNSW Index for Quality

```javascript
// Create HNSW index for better quality
async function createHNSWIndex() {
    await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_documents_embedding_hnsw 
        ON documents 
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64);
    `);
}

// Use for high-quality search
app.get('/documents/search', async (req, res) => {
    const { q } = req.query;
    const queryEmbedding = await generateEmbedding(q);
    
    // Search uses HNSW index automatically
    const results = await sequelize.query(`
        SELECT 
            id,
            content,
            1 - (embedding <=> :embedding::vector) AS similarity
        FROM documents
        WHERE 1 - (embedding <=> :embedding::vector) > 0.8
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

## Index Maintenance

### Rebuilding Indexes

```javascript
// Rebuild index after bulk operations
async function rebuildVectorIndex() {
    await sequelize.query(`
        -- Reindex
        REINDEX INDEX idx_documents_embedding_ivfflat;
    `);
}

// Or drop and recreate
async function recreateVectorIndex() {
    await sequelize.query(`
        DROP INDEX IF EXISTS idx_documents_embedding_ivfflat;
        
        CREATE INDEX idx_documents_embedding_ivfflat 
        ON documents 
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);
    `);
}
```

### Monitoring Index Usage

```sql
-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan AS index_scans
FROM pg_stat_user_indexes
WHERE indexname LIKE '%embedding%'
ORDER BY idx_scan DESC;
```

## Best Practices

1. **Choose Right Index**: IVFFlat for large datasets, HNSW for quality
2. **Tune Parameters**: Adjust lists (IVFFlat) or m/ef_construction (HNSW)
3. **Rebuild After Bulk Inserts**: Rebuild indexes after large inserts
4. **Monitor Performance**: Track index usage and query performance
5. **Test Different Configurations**: Find optimal parameters for your data

## Summary

**Creating Vector Index:**

1. **Purpose**: Enable fast similarity search on vectors
2. **Types**: IVFFlat (fast build) or HNSW (better quality)
3. **Parameters**: Tune lists (IVFFlat) or m/ef_construction (HNSW)
4. **Maintenance**: Rebuild after bulk operations
5. **Best Practice**: Choose based on dataset size and quality needs

**Key Takeaway:**
Vector indexes are essential for fast similarity search on large datasets. Use IVFFlat for large datasets where approximate search is acceptable, or HNSW for better quality. Tune index parameters (lists, m, ef_construction) based on your data size and quality requirements. Rebuild indexes after bulk inserts for optimal performance.

**Index Selection:**
- IVFFlat: Large datasets, fast build
- HNSW: Better quality, smaller datasets
- Tune parameters for your data
- Rebuild after bulk operations

**Next Steps:**
- Learn [pgvector for Embeddings](pgvector_for_embeddings.md) for vector usage
- Study [Hybrid Search](hybrid_search_sql_plus_vector.md) for combined search
- Master [Performance Optimization](../15_deployment_and_performance/performance_optimization.md) for tuning

