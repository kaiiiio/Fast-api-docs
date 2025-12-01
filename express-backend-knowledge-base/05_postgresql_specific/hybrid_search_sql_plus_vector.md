# Hybrid Search: Combining SQL and Vector Search

Hybrid search combines traditional SQL queries with vector similarity search, enabling powerful search capabilities that leverage both structured data and semantic understanding.

## What is Hybrid Search?

**Hybrid search** combines:
- **SQL queries**: Filter by structured data (price, category, date)
- **Vector search**: Find semantically similar content

### Why Hybrid Search?

```javascript
// SQL only: Can filter by price, category
// But can't find "laptop" when searching "notebook computer"

// Vector only: Can find "laptop" when searching "notebook computer"
// But can't filter by price range

// Hybrid: Best of both!
// Filter by price AND find semantically similar products
```

## Implementation

### Basic Hybrid Search

```javascript
// Hybrid search: SQL filters + vector similarity
app.get('/products/search', async (req, res) => {
    const { query, minPrice, maxPrice, category } = req.query;
    
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);
    
    // Hybrid search query
    const results = await sequelize.query(`
        SELECT 
            p.id,
            p.name,
            p.price,
            p.category,
            -- Vector similarity score
            1 - (p.embedding <=> :embedding::vector) AS similarity,
            -- SQL filters
            CASE 
                WHEN p.price BETWEEN :minPrice AND :maxPrice THEN 1 
                ELSE 0 
            END AS price_match,
            CASE 
                WHEN p.category = :category THEN 1 
                ELSE 0 
            END AS category_match
        FROM products p
        WHERE 
            -- Vector similarity threshold
            1 - (p.embedding <=> :embedding::vector) > 0.7
            -- SQL filters
            AND (:minPrice IS NULL OR p.price >= :minPrice)
            AND (:maxPrice IS NULL OR p.price <= :maxPrice)
            AND (:category IS NULL OR p.category = :category)
        ORDER BY 
            -- Combined score: similarity + filters
            (1 - (p.embedding <=> :embedding::vector)) * 
            (price_match + category_match + 1) DESC
        LIMIT 20
    `, {
        replacements: {
            embedding: JSON.stringify(queryEmbedding),
            minPrice: minPrice || null,
            maxPrice: maxPrice || null,
            category: category || null
        },
        type: sequelize.QueryTypes.SELECT
    });
    
    res.json(results);
});
```

## Real-World Examples

### Example 1: Product Search with Filters

```javascript
// Hybrid product search
async function searchProducts(query, filters = {}) {
    const { minPrice, maxPrice, category, brand, inStock } = filters;
    
    // Generate embedding
    const queryEmbedding = await generateEmbedding(query);
    
    // Build WHERE clause
    let whereConditions = [
        `1 - (p.embedding <=> :embedding::vector) > 0.7`  // Similarity threshold
    ];
    
    const replacements = {
        embedding: JSON.stringify(queryEmbedding)
    };
    
    if (minPrice) {
        whereConditions.push('p.price >= :minPrice');
        replacements.minPrice = minPrice;
    }
    
    if (maxPrice) {
        whereConditions.push('p.price <= :maxPrice');
        replacements.maxPrice = maxPrice;
    }
    
    if (category) {
        whereConditions.push('p.category = :category');
        replacements.category = category;
    }
    
    if (brand) {
        whereConditions.push('p.brand = :brand');
        replacements.brand = brand;
    }
    
    if (inStock) {
        whereConditions.push('p.stock > 0');
    }
    
    const sql = `
        SELECT 
            p.*,
            1 - (p.embedding <=> :embedding::vector) AS similarity
        FROM products p
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY similarity DESC
        LIMIT 20
    `;
    
    return await sequelize.query(sql, {
        replacements,
        type: sequelize.QueryTypes.SELECT
    });
}

// Use in route
app.get('/products/search', async (req, res) => {
    const results = await searchProducts(req.query.q, {
        minPrice: req.query.min_price,
        maxPrice: req.query.max_price,
        category: req.query.category,
        brand: req.query.brand,
        inStock: req.query.in_stock === 'true'
    });
    
    res.json(results);
});
```

### Example 2: Combining Full-Text and Vector Search

```javascript
// Hybrid: Full-text + Vector search
app.get('/articles/search', async (req, res) => {
    const { q } = req.query;
    
    // Generate embedding
    const queryEmbedding = await generateEmbedding(q);
    
    // Hybrid search
    const results = await sequelize.query(`
        SELECT 
            a.id,
            a.title,
            a.content,
            -- Full-text search rank
            ts_rank(
                to_tsvector('english', a.title || ' ' || COALESCE(a.content, '')),
                plainto_tsquery('english', :query)
            ) AS text_rank,
            -- Vector similarity
            1 - (a.embedding <=> :embedding::vector) AS vector_similarity,
            -- Combined score
            (
                ts_rank(
                    to_tsvector('english', a.title || ' ' || COALESCE(a.content, '')),
                    plainto_tsquery('english', :query)
                ) * 0.4 +
                (1 - (a.embedding <=> :embedding::vector)) * 0.6
            ) AS combined_score
        FROM articles a
        WHERE 
            -- Full-text match OR vector similarity
            (
                to_tsvector('english', a.title || ' ' || COALESCE(a.content, '')) 
                @@ plainto_tsquery('english', :query)
            )
            OR
            (
                1 - (a.embedding <=> :embedding::vector) > 0.7
            )
        ORDER BY combined_score DESC
        LIMIT 20
    `, {
        replacements: {
            query: q,
            embedding: JSON.stringify(queryEmbedding)
        },
        type: sequelize.QueryTypes.SELECT
    });
    
    res.json(results);
});
```

## Best Practices

1. **Combine Scores**: Weight SQL filters and vector similarity
2. **Set Thresholds**: Minimum similarity for vector search
3. **Index Both**: Index SQL columns and vector embeddings
4. **Tune Weights**: Adjust weights for SQL vs vector
5. **Monitor Performance**: Track query performance

## Summary

**Hybrid Search:**

1. **Purpose**: Combine SQL filters with vector similarity
2. **Benefits**: Structured filtering + semantic search
3. **Implementation**: SQL WHERE + vector similarity
4. **Best Practice**: Weight scores, set thresholds, index both
5. **Use Cases**: Product search, content search, recommendations

**Key Takeaway:**
Hybrid search combines SQL queries (structured filters) with vector search (semantic similarity) for powerful search capabilities. Filter by structured data (price, category) while finding semantically similar content. Weight SQL filters and vector similarity scores appropriately. Index both SQL columns and vector embeddings for performance.

**Hybrid Search Strategy:**
- SQL for structured filters
- Vector for semantic similarity
- Combine scores appropriately
- Set similarity thresholds
- Index for performance

**Next Steps:**
- Learn [pgvector for Embeddings](pgvector_for_embeddings.md) for vector search
- Study [JSONB and Full-Text Search](jsonb_and_full_text_search.md) for text search
- Master [Performance Optimization](../15_deployment_and_performance/performance_optimization.md) for tuning

