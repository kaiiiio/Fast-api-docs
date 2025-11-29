# How to Debug a Slow Vector Search: Complete Troubleshooting Guide

Systematic approach to debugging slow vector search performance in production systems, covering identification, analysis, and optimization strategies.

## Understanding Vector Search Performance

**What makes vector search slow?**
- Large vector dimensions
- Missing or incorrect indexes
- Inefficient query patterns
- High-dimensional spaces
- Large dataset sizes

**Performance targets:**
- < 50ms for small datasets (< 100K vectors)
- < 200ms for medium datasets (100K - 1M vectors)
- < 500ms for large datasets (> 1M vectors)

## Step 1: Identify the Problem

### Symptoms of Slow Vector Search

**Indicators:**
- High latency on search endpoints
- Timeout errors
- High CPU usage during searches
- Slow response times in logs

### Initial Diagnostics

```python
import time
import logging

logger = logging.getLogger(__name__)

async def debug_vector_search(query_embedding: List[float], limit: int = 10):
    """Search with performance tracking."""
    start_time = time.time()
    
    try:
        # Execute search
        results = await vector_search(query_embedding, limit=limit)
        
        duration = time.time() - start_time
        
        logger.info(
            "vector_search_completed",
            duration_ms=duration * 1000,
            results_count=len(results),
            embedding_dimension=len(query_embedding),
            limit=limit
        )
        
        if duration > 0.5:  # > 500ms is slow
            logger.warning(
                "slow_vector_search",
                duration_ms=duration * 1000,
                threshold_ms=500
            )
        
        return results
    
    except Exception as e:
        duration = time.time() - start_time
        logger.error(
            "vector_search_failed",
            duration_ms=duration * 1000,
            error=str(e)
        )
        raise
```

## Step 2: Check Index Configuration

### Verify Index Exists

**PostgreSQL with pgvector:**
```sql
-- Check if vector index exists
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'documents'
AND indexdef LIKE '%vector%';

-- Check index type and parameters
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE indexname LIKE '%embedding%';
```

**Expected output:**
```sql
-- Should see HNSW or IVFFlat index
CREATE INDEX idx_documents_embedding_hnsw 
ON documents USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

### Check Index Usage

```sql
-- Explain query to see if index is used
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, content, embedding <-> $1 AS distance
FROM documents
ORDER BY embedding <-> $1
LIMIT 10;

-- Look for:
-- - Index Scan using idx_documents_embedding_hnsw
-- - NOT Seq Scan (sequential scan is slow!)
```

**If no index scan:**
- Index might not exist
- Query might not match index operator
- Index might be too large to use

### Verify Index Parameters

```python
# Check index creation parameters
async def check_index_parameters(db: AsyncSession):
    """Check if index parameters are optimal."""
    query = text("""
        SELECT 
            indexname,
            indexdef
        FROM pg_indexes
        WHERE indexname LIKE '%embedding%'
    """)
    
    result = await db.execute(query)
    indexes = result.fetchall()
    
    for idx in indexes:
        indexdef = idx.indexdef
        
        # Check HNSW parameters
        if 'hnsw' in indexdef.lower():
            # Extract m and ef_construction
            if 'm = 16' not in indexdef:
                logger.warning("HNSW index m parameter might be suboptimal")
            
            # For large datasets, m should be 32-64
            # For smaller datasets, m = 16 is fine
        
        # Check IVFFlat parameters
        if 'ivfflat' in indexdef.lower():
            # Extract lists parameter
            # Should be sqrt(total_rows) / 1000
            logger.info("IVFFlat index detected - verify lists parameter")
```

## Step 3: Check Vector Dimensions

### Dimension Mismatch

**Problem:** Query vector dimension doesn't match index dimension.

```python
async def verify_dimensions(query_embedding: List[float], db: AsyncSession):
    """Verify embedding dimensions match."""
    # Check query dimension
    query_dim = len(query_embedding)
    
    # Check stored vector dimension
    result = await db.execute(text("""
        SELECT vector_dims(embedding) as dims
        FROM documents
        LIMIT 1
    """))
    
    stored_dim = result.scalar()
    
    if query_dim != stored_dim:
        raise ValueError(
            f"Dimension mismatch: query={query_dim}, stored={stored_dim}"
        )
    
    logger.info(
        "dimension_check",
        query_dimension=query_dim,
        stored_dimension=stored_dim,
        match=True
    )
```

**Common dimension issues:**
- Using different embedding models
- Truncated embeddings
- Padding/truncation errors

### Dimension Impact on Performance

```python
# Higher dimensions = slower search
DIMENSION_PERFORMANCE = {
    384: "Very fast",
    768: "Fast",
    1536: "Moderate",
    3072: "Slow",
    4096: "Very slow"
}

async def check_dimension_performance(db: AsyncSession):
    """Check if dimensions are causing slowness."""
    result = await db.execute(text("""
        SELECT vector_dims(embedding) as dims
        FROM documents
        LIMIT 1
    """))
    
    dims = result.scalar()
    
    if dims > 1536:
        logger.warning(
            "high_dimension_vectors",
            dimension=dims,
            recommendation="Consider dimensionality reduction or smaller model"
        )
```

## Step 4: Analyze Query Patterns

### Query Performance Analysis

```python
class VectorSearchProfiler:
    """Profile vector search queries."""
    
    def __init__(self):
        self.query_times = []
        self.result_counts = []
    
    async def profile_search(
        self,
        query_embedding: List[float],
        limit: int,
        search_func: callable
    ):
        """Profile a search query."""
        # Time the search
        start = time.time()
        results = await search_func(query_embedding, limit=limit)
        duration = time.time() - start
        
        self.query_times.append(duration)
        self.result_counts.append(len(results))
        
        return {
            "duration_ms": duration * 1000,
            "results_count": len(results),
            "avg_time": np.mean(self.query_times),
            "p95_time": np.percentile(self.query_times, 95)
        }
```

### Check Query Parameters

**pgvector HNSW search parameters:**
```python
async def vector_search_with_params(
    query_embedding: List[float],
    limit: int = 10,
    ef_search: int = 40  # HNSW parameter
):
    """
    Vector search with tunable parameters.
    
    ef_search: Higher = more accurate but slower
    - Default: 40
    - Fast: 20-30
    - Accurate: 50-100
    """
    query = text("""
        SELECT id, content, embedding <-> :query_vec AS distance
        FROM documents
        ORDER BY embedding <-> :query_vec
        LIMIT :limit
    """)
    
    # For HNSW, we can set ef_search
    # This requires special syntax or function call
    
    result = await db.execute(
        query,
        {
            "query_vec": query_embedding,
            "limit": limit
        }
    )
    
    return result.fetchall()
```

## Step 5: Database Query Analysis

### Check Query Execution Plan

```python
async def analyze_vector_query(db: AsyncSession, query_embedding: List[float]):
    """Analyze vector query execution plan."""
    explain_query = text("""
        EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON)
        SELECT id, content, embedding <-> :query_vec AS distance
        FROM documents
        ORDER BY embedding <-> :query_vec
        LIMIT 10
    """)
    
    result = await db.execute(explain_query, {"query_vec": query_embedding})
    plan = result.fetchone()[0]
    
    # Parse plan
    execution_time = plan[0]["Execution Time"]
    planning_time = plan[0]["Planning Time"]
    
    logger.info(
        "query_plan_analysis",
        execution_time_ms=execution_time,
        planning_time_ms=planning_time,
        total_time_ms=execution_time + planning_time
    )
    
    # Check for sequential scans
    def check_node(node):
        if node["Node Type"] == "Seq Scan":
            logger.warning(
                "sequential_scan_detected",
                table=node.get("Relation Name"),
                recommendation="Index might be missing or not used"
            )
        
        if "Plans" in node:
            for child in node["Plans"]:
                check_node(child)
    
    check_node(plan[0]["Plan"])
    
    return plan
```

### Check Table Statistics

```sql
-- Check table size
SELECT 
    pg_size_pretty(pg_total_relation_size('documents')) AS total_size,
    pg_size_pretty(pg_relation_size('documents')) AS table_size,
    pg_size_pretty(pg_indexes_size('documents')) AS indexes_size;

-- Check row count
SELECT COUNT(*) FROM documents;

-- Check index statistics
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,  -- Number of times index used
    idx_tup_read,  -- Rows read using index
    idx_tup_fetch  -- Rows fetched using index
FROM pg_stat_user_indexes
WHERE tablename = 'documents';
```

## Step 6: Common Issues and Solutions

### Issue 1: No Index

**Symptom:** Sequential scan in EXPLAIN output.

**Solution:**
```sql
-- Create HNSW index
CREATE INDEX idx_documents_embedding_hnsw
ON documents
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- For large datasets, use higher m
CREATE INDEX idx_documents_embedding_hnsw_large
ON documents
USING hnsw (embedding vector_cosine_ops)
WITH (m = 32, ef_construction = 128);
```

### Issue 2: Wrong Index Type

**Problem:** Using IVFFlat when HNSW would be better.

**Comparison:**
- **IVFFlat**: Smaller, faster build, slower queries
- **HNSW**: Larger, slower build, faster queries

**Solution:**
```sql
-- Drop IVFFlat
DROP INDEX IF EXISTS idx_documents_embedding_ivfflat;

-- Create HNSW (better for read-heavy workloads)
CREATE INDEX idx_documents_embedding_hnsw
ON documents
USING hnsw (embedding vector_cosine_ops);
```

### Issue 3: Suboptimal ef_search

**Problem:** Default ef_search might be too high/low.

**Solution:**
```python
# Use lower ef_search for speed
async def fast_vector_search(query_embedding: List[float], limit: int = 10):
    """Fast but less accurate search."""
    # Set ef_search parameter (implementation depends on driver)
    # For pgvector, might need to use function
    query = text("""
        SELECT * FROM (
            SELECT id, content, embedding <-> :query_vec AS distance
            FROM documents
        ) sub
        ORDER BY distance
        LIMIT :limit
    """)
    # Note: ef_search tuning depends on pgvector version
    return await db.execute(query, {"query_vec": query_embedding, "limit": limit})
```

### Issue 4: Too Many Results

**Problem:** Fetching too many results, then limiting in application.

**Solution:**
```python
# ❌ Bad: Fetch all, limit in Python
all_results = await db.execute(select(Document))
results = all_results.fetchall()[:10]  # Slow!

# ✅ Good: Limit in database
results = await db.execute(
    select(Document)
    .order_by(Document.embedding.l2_distance(query_embedding))
    .limit(10)
)
```

### Issue 5: Large Vectors

**Problem:** Very high-dimensional vectors (e.g., 4096 dimensions).

**Solution:**
```python
# Use dimensionality reduction
from sklearn.decomposition import PCA

def reduce_dimensions(embeddings: np.ndarray, target_dim: int = 768):
    """Reduce embedding dimensions."""
    pca = PCA(n_components=target_dim)
    reduced = pca.fit_transform(embeddings)
    return reduced

# Or use smaller embedding model
# text-embedding-3-small: 1536 dims
# text-embedding-3-large: 3072 dims
```

## Step 7: Performance Monitoring

### Track Vector Search Metrics

```python
from prometheus_client import Histogram, Counter

vector_search_duration = Histogram(
    'vector_search_duration_seconds',
    'Vector search duration',
    ['index_type', 'dimension'],
    buckets=(0.01, 0.05, 0.1, 0.5, 1.0, 2.5, 5.0)
)

vector_search_count = Counter(
    'vector_searches_total',
    'Total vector searches',
    ['status']  # success, timeout, error
)

async def monitored_vector_search(query_embedding: List[float], limit: int):
    """Vector search with metrics."""
    start_time = time.time()
    
    try:
        results = await vector_search(query_embedding, limit)
        
        duration = time.time() - start_time
        
        vector_search_duration.labels(
            index_type="hnsw",
            dimension=len(query_embedding)
        ).observe(duration)
        
        vector_search_count.labels(status="success").inc()
        
        return results
    
    except Exception as e:
        vector_search_count.labels(status="error").inc()
        raise
```

## Step 8: Optimization Strategies

### Strategy 1: Use Approximate Search

```python
# Exact search (slow for large datasets)
exact_results = await db.execute(
    select(Document)
    .order_by(Document.embedding.l2_distance(query_embedding))
    .limit(10)
)

# Approximate search (faster, slightly less accurate)
# Use HNSW index with lower ef_search
approximate_results = await approximate_vector_search(query_embedding, limit=10, ef_search=20)
```

### Strategy 2: Pre-filter Before Vector Search

```python
# Filter before vector search to reduce dataset
filtered_results = await db.execute(
    select(Document)
    .where(Document.category == "technology")  # Pre-filter
    .order_by(Document.embedding.l2_distance(query_embedding))
    .limit(10)
)
```

### Strategy 3: Cache Frequent Queries

```python
from functools import lru_cache
import hashlib

def hash_embedding(embedding: List[float]) -> str:
    """Hash embedding for cache key."""
    return hashlib.md5(str(embedding).encode()).hexdigest()

@lru_cache(maxsize=1000)
async def cached_vector_search(embedding_hash: str, limit: int):
    """Cache vector search results."""
    # Implementation
    pass
```

### Strategy 4: Batch Searches

```python
# Single search
result1 = await vector_search(query1)
result2 = await vector_search(query2)

# Batch search (more efficient)
results = await batch_vector_search([query1, query2])
```

## Summary

Debugging slow vector search requires:
- ✅ Verify index exists and is used
- ✅ Check vector dimensions match
- ✅ Analyze query execution plans
- ✅ Monitor performance metrics
- ✅ Optimize index parameters
- ✅ Use appropriate index type (HNSW vs IVFFlat)

Systematic debugging identifies and fixes performance bottlenecks!
