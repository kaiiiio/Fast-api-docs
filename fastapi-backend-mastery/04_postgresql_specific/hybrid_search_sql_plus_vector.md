# Hybrid Search: SQL + Vector Search Combined

Hybrid search combines traditional SQL queries with vector similarity search, giving you the best of both worlds: structured filtering AND semantic search. This guide shows you how to build production-ready hybrid search systems.

## Understanding Hybrid Search

**The problem with separate searches:**
- SQL search: Finds by exact matches (tags, categories, price range)
- Vector search: Finds by meaning (semantic similarity)

**The solution:**
Combine both! Filter by structured data, then rank by semantic similarity.

**Real-world example:**
"Find gaming laptops under $1500" requires:
- SQL: `category = 'laptops'`, `price < 1500`, `tags @> 'gaming'`
- Vector: Semantic match for "gaming laptop" in descriptions

Hybrid search does both simultaneously.

## Setting Up Hybrid Search Schema

Let's build a complete product search system:

```python
from sqlalchemy import Column, Integer, String, Numeric, Text
from sqlalchemy.dialects.postgresql import ARRAY, TSVECTOR
from pgvector.sqlalchemy import Vector

class Product(Base):
    """
    Product model optimized for hybrid search.
    """
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    price = Column(Numeric(10, 2), nullable=False, index=True)
    
    # Structured fields for SQL filtering
    category_id = Column(Integer, ForeignKey("categories.id"), index=True)
    tags = Column(ARRAY(String), default=[], nullable=False)
    in_stock = Column(Boolean, default=True, nullable=False)
    
    # Vector embedding for semantic search
    embedding = Column(Vector(1536), nullable=True)  # OpenAI embeddings
    
    # Full-text search vector
    search_vector = Column(TSVECTOR, nullable=True)
    
    # Combination vector (description + tags + category)
    combined_search_vector = Column(TSVECTOR, nullable=True)
```

## Step 1: Basic Hybrid Search Pattern

Let's start with a simple hybrid search:

```python
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload

async def hybrid_search(
    query_text: str,
    category_id: int = None,
    max_price: float = None,
    min_price: float = None,
    tags: List[str] = None,
    limit: int = 20,
    session: AsyncSession
):
    """
    Hybrid search combining SQL filters and vector similarity.
    
    Args:
        query_text: Semantic search query (e.g., "gaming laptop")
        category_id: Filter by category (SQL)
        max_price: Maximum price filter (SQL)
        min_price: Minimum price filter (SQL)
        tags: Required tags (SQL)
        limit: Maximum results
    
    Returns:
        List of products ranked by relevance
    """
    # Step 1: Generate query embedding
    query_embedding = get_embedding(query_text)
    
    # Step 2: Build base query with SQL filters
    stmt = select(Product).where(Product.in_stock == True)
    
    # Apply SQL filters
    if category_id:
        stmt = stmt.where(Product.category_id == category_id)
    
    if max_price:
        stmt = stmt.where(Product.price <= max_price)
    
    if min_price:
        stmt = stmt.where(Product.price >= min_price)
    
    if tags:
        # Product must have all specified tags
        for tag in tags:
            stmt = stmt.where(Product.tags.contains([tag]))
    
    # Step 3: Add vector similarity scoring
    # Calculate cosine distance (lower = more similar)
    vector_distance = func.cosine_distance(Product.embedding, query_embedding)
    
    # Convert distance to similarity score (1 - distance, normalized)
    similarity_score = (1 - vector_distance) * 100  # Scale to 0-100
    
    # Step 4: Filter by minimum similarity threshold
    stmt = stmt.where(
        Product.embedding.isnot(None),  # Must have embedding
        similarity_score > 50  # Minimum 50% similarity
    )
    
    # Step 5: Order by similarity (best matches first)
    stmt = stmt.order_by(
        similarity_score.desc()
    ).limit(limit)
    
    # Step 6: Execute and return results
    result = await session.execute(stmt)
    products = result.scalars().all()
    
    return products
```

**Understanding the flow:**
1. SQL filters narrow down the candidate set (fast)
2. Vector search ranks by semantic similarity
3. Combined result: relevant AND matching filters

## Step 2: Weighted Hybrid Search

Different signals should have different weights. Let's add weighting:

```python
async def weighted_hybrid_search(
    query_text: str,
    category_id: int = None,
    max_price: float = None,
    tags: List[str] = None,
    vector_weight: float = 0.7,  # 70% semantic similarity
    price_weight: float = 0.2,    # 20% price (lower = better)
    recency_weight: float = 0.1,  # 10% how new the product is
    session: AsyncSession
):
    """
    Hybrid search with weighted scoring.
    
    Combines multiple signals into a single relevance score.
    """
    query_embedding = get_embedding(query_text)
    
    # Base query with filters
    stmt = select(Product).where(Product.in_stock == True)
    
    if category_id:
        stmt = stmt.where(Product.category_id == category_id)
    
    if max_price:
        stmt = stmt.where(Product.price <= max_price)
    
    if tags:
        for tag in tags:
            stmt = stmt.where(Product.tags.contains([tag]))
    
    # Calculate individual scores
    # 1. Vector similarity score (0-100)
    vector_sim = (1 - func.cosine_distance(Product.embedding, query_embedding)) * 100
    
    # 2. Price score (lower price = higher score, normalized)
    max_price_in_results = func.max(Product.price).over()
    price_score = (1 - (Product.price / max_price_in_results)) * 100
    
    # 3. Recency score (newer = higher score)
    days_old = func.extract('day', func.now() - Product.created_at)
    recency_score = func.greatest(0, 100 - days_old)  # Decreases over time
    
    # Combined weighted score
    combined_score = (
        vector_sim * vector_weight +
        price_score * price_weight +
        recency_score * recency_weight
    )
    
    stmt = stmt.where(
        Product.embedding.isnot(None),
        vector_sim > 50  # Minimum semantic similarity
    ).order_by(
        combined_score.desc()
    ).limit(20)
    
    result = await session.execute(stmt)
    return result.scalars().all()
```

## Step 3: Combining Full-Text and Vector Search

Add keyword matching to semantic search:

```python
async def triple_hybrid_search(
    query_text: str,
    category_id: int = None,
    max_price: float = None,
    session: AsyncSession
):
    """
    Combines SQL filters + full-text search + vector search.
    
    Three search methods working together!
    """
    query_embedding = get_embedding(query_text)
    
    # Base query
    stmt = select(Product).where(Product.in_stock == True)
    
    if category_id:
        stmt = stmt.where(Product.category_id == category_id)
    
    if max_price:
        stmt = stmt.where(Product.price <= max_price)
    
    # Full-text search score
    tsquery = func.plainto_tsquery('english', query_text)
    fulltext_score = func.ts_rank(Product.search_vector, tsquery) * 100
    
    # Vector similarity score
    vector_score = (1 - func.cosine_distance(Product.embedding, query_embedding)) * 100
    
    # Combined score (full-text + vector)
    # Full-text is good for exact keyword matches
    # Vector is good for semantic/synonym matches
    search_score = func.greatest(fulltext_score, vector_score * 0.8)
    
    # Must match either full-text or vector
    stmt = stmt.where(
        or_(
            Product.search_vector.match(query_text),  # Full-text match
            func.cosine_distance(Product.embedding, query_embedding) < 0.3  # Vector match
        )
    ).order_by(
        search_score.desc()
    ).limit(20)
    
    result = await session.execute(stmt)
    return result.scalars().all()
```

## Step 4: Advanced Hybrid Search with Faceting

Faceting lets users see how many results in each category/price range:

```python
async def hybrid_search_with_facets(
    query_text: str,
    filters: dict,
    session: AsyncSession
):
    """
    Hybrid search that returns results AND facet counts.
    
    Facets show: "50 results in Electronics", "30 results under $500", etc.
    """
    query_embedding = get_embedding(query_text)
    
    # Base search query
    base_stmt = select(Product).where(
        Product.in_stock == True,
        Product.embedding.isnot(None)
    )
    
    # Apply search scoring
    vector_score = (1 - func.cosine_distance(Product.embedding, query_embedding)) * 100
    base_stmt = base_stmt.where(vector_score > 50)
    
    # Get results
    results_stmt = base_stmt.order_by(vector_score.desc()).limit(20)
    result = await session.execute(results_stmt)
    products = result.scalars().all()
    
    # Get facet counts (without limit, for counting)
    # Category facets
    category_facets = await session.execute(
        select(
            Category.id,
            Category.name,
            func.count(Product.id).label('count')
        ).join(
            Product, Category.id == Product.category_id
        ).where(
            # Same filters as main search
            Product.in_stock == True,
            vector_score > 50
        ).group_by(Category.id, Category.name)
    )
    
    # Price range facets
    price_facets = await session.execute(
        select(
            func.case(
                (Product.price < 100, "Under $100"),
                (Product.price < 500, "$100-$500"),
                (Product.price < 1000, "$500-$1000"),
                else_="Over $1000"
            ).label('range'),
            func.count(Product.id).label('count')
        ).where(
            Product.in_stock == True,
            vector_score > 50
        ).group_by('range')
    )
    
    return {
        "products": products,
        "facets": {
            "categories": category_facets.all(),
            "price_ranges": price_facets.all()
        }
    }
```

## Step 5: Production-Ready Hybrid Search Service

Let's build a complete service:

```python
from pydantic import BaseModel
from typing import Optional, List
from enum import Enum

class SearchSortBy(str, Enum):
    RELEVANCE = "relevance"
    PRICE_LOW = "price_low"
    PRICE_HIGH = "price_high"
    NEWEST = "newest"

class SearchFilters(BaseModel):
    query: str
    category_id: Optional[int] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    tags: Optional[List[str]] = None
    in_stock_only: bool = True
    sort_by: SearchSortBy = SearchSortBy.RELEVANCE
    limit: int = 20
    offset: int = 0

class HybridSearchService:
    """Service for hybrid search operations."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def search(self, filters: SearchFilters):
        """
        Perform hybrid search with all filters and sorting.
        """
        query_embedding = get_embedding(filters.query)
        
        # Build query
        stmt = select(Product)
        
        # Apply filters
        conditions = []
        
        if filters.in_stock_only:
            conditions.append(Product.in_stock == True)
        
        if filters.category_id:
            conditions.append(Product.category_id == filters.category_id)
        
        if filters.min_price:
            conditions.append(Product.price >= filters.min_price)
        
        if filters.max_price:
            conditions.append(Product.price <= filters.max_price)
        
        if filters.tags:
            for tag in filters.tags:
                conditions.append(Product.tags.contains([tag]))
        
        # Vector similarity
        vector_score = (1 - func.cosine_distance(Product.embedding, query_embedding)) * 100
        conditions.append(Product.embedding.isnot(None))
        conditions.append(vector_score > 30)  # Minimum threshold
        
        stmt = stmt.where(and_(*conditions))
        
        # Apply sorting
        if filters.sort_by == SearchSortBy.RELEVANCE:
            stmt = stmt.order_by(vector_score.desc())
        elif filters.sort_by == SearchSortBy.PRICE_LOW:
            stmt = stmt.order_by(Product.price.asc(), vector_score.desc())
        elif filters.sort_by == SearchSortBy.PRICE_HIGH:
            stmt = stmt.order_by(Product.price.desc(), vector_score.desc())
        elif filters.sort_by == SearchSortBy.NEWEST:
            stmt = stmt.order_by(Product.created_at.desc(), vector_score.desc())
        
        # Pagination
        stmt = stmt.offset(filters.offset).limit(filters.limit)
        
        # Execute
        result = await self.session.execute(stmt)
        products = result.scalars().all()
        
        # Get total count (for pagination)
        count_stmt = select(func.count(Product.id)).where(and_(*conditions))
        total_result = await self.session.execute(count_stmt)
        total = total_result.scalar()
        
        return {
            "products": products,
            "total": total,
            "limit": filters.limit,
            "offset": filters.offset,
            "has_more": (filters.offset + filters.limit) < total
        }
```

## Step 6: FastAPI Endpoint

```python
@app.post("/products/search")
async def search_products(
    filters: SearchFilters,
    session: AsyncSession = Depends(get_db)
):
    """
    Hybrid search endpoint combining SQL + vector search.
    
    Example:
        POST /products/search
        {
            "query": "gaming laptop",
            "category_id": 1,
            "max_price": 1500,
            "tags": ["gaming"],
            "sort_by": "relevance",
            "limit": 20
        }
    """
    service = HybridSearchService(session)
    results = await service.search(filters)
    
    return results
```

## Performance Optimization

### Indexes for Hybrid Search

```python
# Migration: Create indexes
def upgrade():
    # Vector index for similarity search
    op.execute("""
        CREATE INDEX idx_products_embedding_hnsw
        ON products USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64);
    """)
    
    # Full-text search index
    op.execute("""
        CREATE INDEX idx_products_search_vector
        ON products USING gin (search_vector);
    """)
    
    # Composite index for common filter combinations
    op.create_index(
        'idx_products_category_price',
        'products',
        ['category_id', 'price', 'in_stock']
    )
    
    # GIN index for array tags
    op.execute("""
        CREATE INDEX idx_products_tags_gin
        ON products USING gin (tags);
    """)
```

## Summary

Hybrid search combines:
- **SQL filters**: Exact matches (category, price, tags)
- **Vector search**: Semantic similarity
- **Full-text search**: Keyword matching

This gives users powerful, intuitive search that understands both structure and meaning. Perfect for e-commerce, content platforms, and any search-heavy application!

