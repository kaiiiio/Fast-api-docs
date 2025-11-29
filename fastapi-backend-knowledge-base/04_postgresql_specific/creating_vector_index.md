# Creating Vector Index: A Step-by-Step Guide

Vector indexes are crucial for fast similarity search in AI applications. This guide walks you through creating and optimizing vector indexes in PostgreSQL using pgvector, explaining each step clearly.

## Understanding Vector Indexes

Before we dive into creating indexes, let's understand what they do:

**Without an index:**
- Every similarity search scans all vectors
- For 1 million vectors, that's 1 million distance calculations
- Query time: seconds or even minutes

**With an index:**
- The index organizes vectors for efficient searching
- Only relevant vectors are examined
- Query time: milliseconds

## Types of Vector Indexes

PostgreSQL with pgvector supports two main index types. Let's understand each:

### 1. **IVFFlat Index** (Inverted File with Flat Compression)

**How it works:**
- Divides vectors into clusters (like folders)
- For a search, checks only relevant clusters
- Faster to build, uses more memory

**Best for:**
- Small to medium datasets (up to 1 million vectors)
- When build time matters more than query speed
- Limited memory

### 2. **HNSW Index** (Hierarchical Navigable Small World)

**How it works:**
- Creates a graph structure connecting similar vectors
- Navigates the graph to find nearest neighbors
- Slower to build, but faster queries

**Best for:**
- Large datasets (millions of vectors)
- When query speed is critical
- When you can wait for index build time

## Step 1: Enable pgvector Extension

First, we need to enable the pgvector extension in PostgreSQL. This is a one-time setup:

```sql
-- Connect to your database and run:
CREATE EXTENSION IF NOT EXISTS vector;
```

**What this does:**
- Loads the vector extension into your database
- Gives you access to the `vector` data type
- Enables index creation functions

**Verify it worked:**
```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
-- Should return one row showing the extension
```

## Step 2: Create a Table with Vector Column

Now let's create a table that can store vectors:

```sql
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    content TEXT,
    embedding vector(1536)  -- 1536 dimensions (OpenAI's text-embedding-ada-002)
);
```

**Understanding the vector type:**
- `vector(1536)` means each vector has 1536 dimensions
- This matches the dimension of your embedding model
- Common dimensions: 384, 768, 1536

**In SQLAlchemy:**
```python
from sqlalchemy import Column, Integer, String
from pgvector.sqlalchemy import Vector

class Document(Base):
    __tablename__ = 'documents'
    
    id = Column(Integer, primary_key=True)
    content = Column(String)
    embedding = Column(Vector(1536))  # 1536 dimensions
```

## Step 3: Insert Some Vectors

Before creating an index, let's understand what we're indexing. Here's how you'd insert vectors:

```python
# Generate embedding (example using OpenAI)
from openai import OpenAI

client = OpenAI()

def get_embedding(text: str) -> list:
    response = client.embeddings.create(
        input=text,
        model="text-embedding-ada-002"
    )
    return response.data[0].embedding

# Insert document with embedding
embedding = get_embedding("This is a sample document")
await session.execute(
    insert(Document).values(
        content="This is a sample document",
        embedding=embedding
    )
)
```

**What's happening:**
- Your text is converted to a 1536-dimensional vector
- This vector represents the semantic meaning of the text
- Similar texts have similar vectors (close in 1536-dimensional space)

## Step 4: Choose Your Index Type

Now, let's decide which index to create. Here's a simple decision guide:

**Choose IVFFlat if:**
- You have less than 1 million vectors
- You need to create the index quickly
- Memory is limited

**Choose HNSW if:**
- You have more than 1 million vectors
- Query speed is critical
- You can wait for index creation

Let's start with HNSW since it's more commonly used for production applications.

## Step 5: Create HNSW Index

Here's how to create an HNSW index, explained step by step:

```sql
CREATE INDEX ON documents 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

**Breaking down the syntax:**

**`CREATE INDEX ON documents`**
- Creates an index on the `documents` table

**`USING hnsw`**
- Specifies we want an HNSW index type

**`(embedding vector_cosine_ops)`**
- `embedding` is the column name
- `vector_cosine_ops` is the operator class (how to measure distance)
  - `vector_cosine_ops` - for cosine distance (most common for embeddings)
  - `vector_l2_ops` - for Euclidean distance
  - `vector_ip_ops` - for inner product

**`WITH (m = 16, ef_construction = 64)`**
- These are tuning parameters

**Understanding the parameters:**

**`m = 16`** (default is 16):
- Number of connections each node has in the graph
- Higher = better accuracy, slower builds, more memory
- Range: 4-64
- **Start with 16**, increase if queries are slow

**`ef_construction = 64`** (default is 64):
- How many neighbors to consider when building
- Higher = better index quality, slower builds
- Range: 4-1000
- **Start with 64**, increase if accuracy matters more than build time

**What happens during index creation:**
1. PostgreSQL reads all your vectors
2. Builds a graph connecting similar vectors
3. This can take time (minutes to hours for millions of vectors)
4. Once done, queries will be much faster

## Step 6: Create IVFFlat Index (Alternative)

If you chose IVFFlat instead, here's how:

```sql
CREATE INDEX ON documents
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

**Understanding `lists = 100`:**
- Number of clusters to create
- Rule of thumb: `lists = sqrt(rows) / 10`
- For 1 million rows: `lists = 1000`
- Too many lists = slower queries
- Too few lists = less accurate

## Step 7: Test Your Index

Now let's verify the index is working and measure performance:

```sql
-- Search without index (for comparison)
EXPLAIN ANALYZE
SELECT id, content, embedding <=> '[0.1,0.2,...]'::vector AS distance
FROM documents
ORDER BY embedding <=> '[0.1,0.2,...]'::vector
LIMIT 10;

-- Search with index
EXPLAIN ANALYZE
SELECT id, content, embedding <=> '[0.1,0.2,...]'::vector AS distance
FROM documents
ORDER BY embedding <=> '[0.1,0.2,...]'::vector
LIMIT 10;
```

**What to look for:**
- The second query should show `Index Scan using documents_embedding_idx`
- Query time should be much faster

**In FastAPI/SQLAlchemy:**
```python
from sqlalchemy import select, func
from pgvector.sqlalchemy import Vector

# Generate query vector
query_embedding = get_embedding("search query")

# Find similar documents
result = await session.execute(
    select(
        Document,
        func.cosine_distance(Document.embedding, query_embedding).label('distance')
    )
    .order_by('distance')
    .limit(10)
)

documents = result.all()
for doc, distance in documents:
    print(f"Content: {doc.content}, Distance: {distance}")
```

## Step 8: Tune Your Index

After creating the index, you might need to tune it based on your query patterns:

**If queries are slow:**
```sql
-- Increase m for HNSW
DROP INDEX documents_embedding_idx;
CREATE INDEX ON documents 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 32, ef_construction = 128);
```

**If index build is too slow:**
```sql
-- Decrease ef_construction
DROP INDEX documents_embedding_idx;
CREATE INDEX ON documents 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 32);
```

**Important:** After changing index parameters, you need to drop and recreate the index.

## Common Issues and Solutions

### Issue 1: Index creation fails

**Error:** "index row size exceeds maximum"

**Solution:** Your vectors might be too large or too many. Try:
- Using fewer dimensions
- Using IVFFlat instead of HNSW
- Increasing `maintenance_work_mem`

```sql
SET maintenance_work_mem = '2GB';  -- Give more memory for index creation
CREATE INDEX ...;
```

### Issue 2: Queries still slow

**Possible causes:**
- Index not being used (check with EXPLAIN)
- Wrong distance function
- Need to increase `m` or `ef_construction`

**Solution:**
```sql
-- Check if index is used
EXPLAIN ANALYZE SELECT ...;

-- If not using index, might need to increase ef_search
SET hnsw.ef_search = 100;  -- Increase search width
```

### Issue 3: Memory errors during build

**Solution:**
- Use IVFFlat instead of HNSW
- Create index in batches
- Increase server memory

## Best Practices

1. **Create index after loading data** - Index creation is faster with all data present
2. **Monitor query performance** - Use EXPLAIN ANALYZE regularly
3. **Match dimensions** - Ensure vector dimension matches your embedding model
4. **Choose right distance** - Cosine for embeddings, L2 for coordinates
5. **Start with defaults** - Tune only if needed

## Summary

Creating vector indexes is a multi-step process:

1. Enable pgvector extension
2. Create table with vector column
3. Insert vectors (generate embeddings)
4. Choose index type (HNSW for large datasets)
5. Create index with appropriate parameters
6. Test and verify
7. Tune based on performance

The key is understanding what each parameter does and starting with sensible defaults, then tuning based on your specific needs.

