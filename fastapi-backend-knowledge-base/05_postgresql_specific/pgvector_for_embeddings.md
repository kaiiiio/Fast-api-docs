# pgvector for Embeddings: Complete Guide

pgvector is a PostgreSQL extension that enables storing and searching vector embeddings directly in your database. This guide explains everything step by step, from basic concepts to production usage.

## What Are Embeddings?

Before we dive into pgvector, let's understand what embeddings are and why they matter:

**In simple terms:** An embedding is a list of numbers that represents the meaning of text, images, or other data. Similar things have similar embeddings (close numbers).

**Example:** "dog" → [0.2, 0.8, 0.1, ...] (1536 numbers), "puppy" → [0.21, 0.79, 0.12, ...] (very similar numbers), "airplane" → [0.9, 0.1, 0.8, ...] (very different numbers).

**Why embeddings matter:** Traditional search: "dog" only matches "dog". Embedding search: "dog" matches "puppy", "canine", "pet" (semantic similarity).

## Why Use pgvector?

You could store embeddings in a separate vector database (like Pinecone or Weaviate), but pgvector lets you keep everything together (embeddings and relational data in one database), use SQL (leverage existing PostgreSQL knowledge), ensure transactions (consistency between embeddings and metadata), and save costs (one database instead of multiple services).

## Installation

### Step 1: Install pgvector Extension

**On Ubuntu/Debian:**
```bash
sudo apt install postgresql-15-pgvector
```

**On macOS with Homebrew:**
```bash
brew install pgvector
```

**On Docker:**
Use the `pgvector/pgvector` image:
```yaml
services:
  postgres:
    image: pgvector/pgvector:pg15
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
```

### Step 2: Enable Extension in Database

Connect to your PostgreSQL database and run:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

**What this does:** Loads the vector extension, adds the `vector` data type, and adds vector operators (for similarity search).

**Verify installation:**
```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
-- Should return one row
```

## Basic Usage

### Step 1: Create a Table with Vector Column

Let's start simple. We'll create a table to store documents and their embeddings:

```sql
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    content TEXT,
    embedding vector(1536)  -- 1536 dimensions for OpenAI embeddings
);
```

**Understanding the vector type:** `vector(1536)` means each vector has exactly 1536 numbers. The number must match your embedding model's output dimension. Common dimensions: 384, 768, 1536.

**In SQLAlchemy:**
```python
from sqlalchemy import Column, Integer, String, Text
from pgvector.sqlalchemy import Vector
from app.db.base import Base

class Document(Base):
    __tablename__ = 'documents'
    
    id = Column(Integer, primary_key=True)
    content = Column(Text)
    embedding = Column(Vector(1536))  # 1536-dimensional vector (matches OpenAI embeddings)
```

### Step 2: Generate and Insert Embeddings

First, let's see how to generate embeddings. We'll use OpenAI's API as an example:

```python
from openai import OpenAI

client = OpenAI()

def get_embedding(text: str, model: str = "text-embedding-ada-002") -> list:
    """
    Convert text to an embedding vector.
    
    Args:
        text: The text to embed
        model: The embedding model to use
    
    Returns:
        A list of floats (the embedding vector)
    """
    response = client.embeddings.create(
        input=text,
        model=model
    )
    return response.data[0].embedding  # Returns list like [0.1, 0.2, ...]
```

**Understanding what happens:** Your text goes to OpenAI's API, their model converts it to 1536 numbers, you get back a list of floats, and you store this list in PostgreSQL. pgvector handles the conversion automatically.

**Inserting the embedding:**
```python
from sqlalchemy.ext.asyncio import AsyncSession

async def create_document(content: str, session: AsyncSession):
    # Step 1: Generate embedding
    embedding = get_embedding(content)
    
    # Step 2: Store in database
    document = Document(
        content=content,
        embedding=embedding  # pgvector handles the conversion
    )
    session.add(document)
    await session.commit()
    return document
```

**What pgvector does:** Takes your Python list `[0.1, 0.2, ...]`, converts it to PostgreSQL's vector format, and stores it efficiently for fast similarity searches.

## Similarity Search

This is where pgvector shines. Let's learn how to find similar documents.

### Understanding Distance Functions

pgvector supports three ways to measure "how similar" two vectors are:

**1. Cosine Distance (most common for embeddings):** Measures the angle between vectors. Range: 0 (identical) to 2 (opposite). Best for: Text embeddings, semantic search.

**2. L2 Distance (Euclidean):** Measures straight-line distance. Range: 0 (identical) to infinity. Best for: Image embeddings, coordinates.

**3. Inner Product:** Measures how aligned vectors are. Range: -infinity to infinity. Best for: Specific ML models that use it.

**Which to use?** For most embedding use cases (like OpenAI, Cohere, etc.), use cosine distance.

### Basic Similarity Query

Let's find documents similar to a query:

```sql
-- Find 5 most similar documents
SELECT 
    id,
    content,
    1 - (embedding <=> '[0.1,0.2,...]'::vector) AS similarity
FROM documents
ORDER BY embedding <=> '[0.1,0.2,...]'::vector
LIMIT 5;
```

**Breaking down the syntax:** `embedding <=> '[0.1,0.2,...]'::vector` uses `<=>` (cosine distance operator) to calculate distance between stored embedding and query vector (lower distance = more similar). `1 - (embedding <=> ...)` converts distance to similarity (distance 0 → similarity 1.0 (100% similar), distance 1 → similarity 0.0 (0% similar)).

**In SQLAlchemy:**
```python
from sqlalchemy import select, func
from pgvector.sqlalchemy import Vector

async def search_similar(query_text: str, limit: int = 5, session: AsyncSession):
    # Step 1: Generate embedding for query
    query_embedding = get_embedding(query_text)
    
    # Step 2: Find similar documents
    result = await session.execute(
        select(
            Document,
            (1 - func.cosine_distance(
                Document.embedding,
                query_embedding
            )).label('similarity')
        )
        .order_by(func.cosine_distance(Document.embedding, query_embedding))
        .limit(limit)
    )
    
    return result.all()
```

## Creating Indexes for Performance

Without an index, similarity search scans all vectors. For millions of vectors, this is slow. Let's create an index:

### HNSW Index (Recommended)

HNSW (Hierarchical Navigable Small World) is the best choice for most applications:

```sql
CREATE INDEX ON documents 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

**What this does:**
- Creates a graph structure connecting similar vectors
- Makes queries 100-1000x faster
- Takes time to build (minutes to hours for large datasets)

**Parameters explained:**
- `m = 16`: Connections per node (higher = more accurate, slower)
- `ef_construction = 64`: Quality during build (higher = better, slower)

**In a migration (Alembic):**
```python
from alembic import op
import sqlalchemy as sa

def upgrade():
    op.execute('CREATE EXTENSION IF NOT EXISTS vector')
    op.create_index(
        'documents_embedding_idx',
        'documents',
        ['embedding'],
        postgresql_using='hnsw',
        postgresql_with={'m': 16, 'ef_construction': 64},
        postgresql_ops={'embedding': 'vector_cosine_ops'}
    )
```

## Common Patterns

### Pattern 1: Semantic Search

Search documents by meaning, not keywords:

```python
async def semantic_search(
    query: str,
    threshold: float = 0.7,  # Minimum similarity
    limit: int = 10,
    session: AsyncSession
):
    query_embedding = get_embedding(query)
    
    result = await session.execute(
        select(Document)
        .where(
            func.cosine_distance(Document.embedding, query_embedding) < (1 - threshold)
        )
        .order_by(func.cosine_distance(Document.embedding, query_embedding))
        .limit(limit)
    )
    
    return result.scalars().all()
```

### Pattern 2: Hybrid Search (Text + Vector)

Combine traditional keyword search with semantic search:

```python
from sqlalchemy import or_

async def hybrid_search(
    query: str,
    session: AsyncSession
):
    query_embedding = get_embedding(query)
    
    # Keyword search score
    keyword_score = func.ts_rank(
        func.to_tsvector('english', Document.content),
        func.plainto_tsquery('english', query)
    )
    
    # Vector similarity score
    vector_score = 1 - func.cosine_distance(Document.embedding, query_embedding)
    
    # Combine scores (weighted average)
    combined_score = (keyword_score * 0.3) + (vector_score * 0.7)
    
    result = await session.execute(
        select(
            Document,
            combined_score.label('score')
        )
        .where(
            or_(
                keyword_score > 0,  # Has keyword match
                vector_score > 0.7  # Or high similarity
            )
        )
        .order_by(combined_score.desc())
        .limit(10)
    )
    
    return result.all()
```

## Best Practices

1. **Match dimensions** - Ensure vector dimension matches your embedding model
2. **Use indexes** - Always create HNSW index for production
3. **Normalize vectors** - Some models require normalization before storage
4. **Batch inserts** - Insert multiple embeddings at once for better performance
5. **Monitor performance** - Use EXPLAIN ANALYZE to check query plans

## Summary

pgvector enables:
- Storing embeddings in PostgreSQL
- Fast similarity search with indexes
- Combining vector search with SQL queries
- Keeping all data in one database

Start by enabling the extension, creating a vector column, generating embeddings, and then creating indexes for performance.

---

## 🎯 Interview Questions: FastAPI

### Q1: Explain pgvector for embeddings in FastAPI, including how to store vectors, create indexes, perform similarity search, and implement hybrid search. Provide detailed examples showing vector operations and performance optimization.

**Answer:**

**pgvector Overview:**

pgvector is a PostgreSQL extension that enables storing and querying vector embeddings directly in PostgreSQL. It's ideal for semantic search, recommendation systems, and AI applications.

**Why pgvector:**

**Without pgvector (External Vector DB):**
```python
# ❌ Bad: Separate vector database
# PostgreSQL for structured data
# Separate vector DB for embeddings
# Problem: Data split, complex queries
```

**With pgvector:**
```python
# ✅ Good: All data in PostgreSQL
# Structured data + vectors together
# SQL queries with vector similarity
# Benefit: Simpler architecture, powerful queries
```

**Setting Up pgvector:**
```python
# Enable extension
CREATE EXTENSION IF NOT EXISTS vector;

# Create table with vector column
class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True)
    content = Column(Text)
    embedding = Column(Vector(1536))  # OpenAI embeddings dimension
```

**Storing Embeddings:**
```python
async def store_document(content: str, embedding: List[float]):
    """Store document with embedding."""
    document = Document(
        content=content,
        embedding=embedding  # Store as vector
    )
    session.add(document)
    await session.commit()
```

**Similarity Search:**
```python
from sqlalchemy import func

async def semantic_search(query_embedding: List[float], limit: int = 10):
    """Search by vector similarity."""
    result = await session.execute(
        select(Document)
        .order_by(
            func.cosine_distance(Document.embedding, query_embedding)
        )
        .limit(limit)
    )
    return result.scalars().all()
```

**HNSW Index:**
```python
# Create index for fast similarity search
CREATE INDEX ON documents 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

**Hybrid Search:**
```python
# Combine keyword and vector search
keyword_score = func.ts_rank(...)
vector_score = 1 - func.cosine_distance(...)
combined_score = (keyword_score * 0.3) + (vector_score * 0.7)
```

**Best Practices:**

**1. Match Dimensions:**
```python
# Ensure vector dimension matches model
# OpenAI: 1536 dimensions
# Check before storing
```

**2. Use Indexes:**
```python
# HNSW index for production
# 100-1000x faster queries
# Worth the build time
```

**3. Normalize Vectors:**
```python
# Some models require normalization
# Check model requirements
```

**System Design Consideration**: pgvector provides:
1. **Unified Storage**: All data in one database
2. **Performance**: Fast similarity search with indexes
3. **Flexibility**: SQL + vector queries
4. **Simplicity**: No separate vector DB

pgvector is essential for AI applications. Understanding vector storage, indexing, similarity search, and hybrid search is crucial for building semantic search systems.

---

### Q2: Explain HNSW indexes, vector similarity metrics (cosine, L2, inner product), and when to use each. Discuss performance optimization and best practices for large-scale vector search.

**Answer:**

**HNSW Indexes:**

**Hierarchical Navigable Small World:**
```python
# Graph-based index structure
# Fast approximate nearest neighbor search
# Parameters: m (connections), ef_construction (quality)
```

**Similarity Metrics:**

**1. Cosine Distance:**
```python
# Measures angle between vectors
# Good for normalized vectors
# Range: 0 (same) to 2 (opposite)
```

**2. L2 Distance:**
```python
# Euclidean distance
# Good for magnitude matters
# Range: 0 to infinity
```

**3. Inner Product:**
```python
# Dot product
# Good for normalized vectors
# Range: -1 to 1
```

**Performance Optimization:**
```python
# Use HNSW indexes
# Tune index parameters
# Batch operations
# Monitor query performance
```

**System Design Consideration**: Vector search requires:
1. **Indexing**: HNSW for performance
2. **Metrics**: Choose appropriate distance
3. **Normalization**: Some models require it
4. **Monitoring**: Track query performance

Understanding HNSW indexes, similarity metrics, and optimization is essential for building scalable vector search systems.


