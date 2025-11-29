# MongoDB Atlas Vector Search: Semantic Search Guide

MongoDB Atlas Vector Search enables semantic search using vector embeddings. This guide teaches you how to implement vector search in MongoDB for AI-powered applications.

## Understanding Vector Search

**What is vector search?**
Finding similar documents by comparing their vector embeddings (numerical representations of meaning).

**Use cases:**
- Semantic search (find similar meaning, not just keywords)
- Recommendation systems
- RAG (Retrieval Augmented Generation)
- Image similarity search

## Step 1: Setting Up Vector Search Index

First, create a vector search index in Atlas:

```javascript
// In MongoDB Atlas UI or via API
{
  "mappings": {
    "dynamic": true,
    "fields": {
      "embedding": {
        "type": "knnVector",
        "dimensions": 1536,  // OpenAI embedding dimensions
        "similarity": "cosine"
      }
    }
  }
}
```

## Step 2: Storing Documents with Embeddings

```python
from motor.motor_asyncio import AsyncIOMotorClient
from openai import OpenAI
import numpy as np

async def store_product_with_embedding(product_data: dict):
    """Store product with generated embedding."""
    client = AsyncIOMotorClient("mongodb://localhost:27017/")
    db = client.ecommerce
    
    # Generate embedding
    openai_client = OpenAI()
    response = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=f"{product_data['name']} {product_data['description']}"
    )
    embedding = response.data[0].embedding
    
    # Store with embedding
    product = {
        **product_data,
        "embedding": embedding  # Vector array
    }
    
    result = await db.products.insert_one(product)
    return result.inserted_id
```

## Step 3: Performing Vector Search

```python
async def vector_search(query: str, limit: int = 10):
    """Search products using vector similarity."""
    client = AsyncIOMotorClient("mongodb://localhost:27017/")
    db = client.ecommerce
    
    # Generate query embedding
    openai_client = OpenAI()
    response = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=query
    )
    query_embedding = response.data[0].embedding
    
    # Vector search aggregation pipeline
    pipeline = [
        {
            "$vectorSearch": {
                "index": "vector_index",  # Index name
                "path": "embedding",
                "queryVector": query_embedding,
                "numCandidates": 100,  # Candidates to evaluate
                "limit": limit
            }
        },
        {
            "$project": {
                "name": 1,
                "description": 1,
                "price": 1,
                "score": {"$meta": "vectorSearchScore"}  # Similarity score
            }
        }
    ]
    
    cursor = db.products.aggregate(pipeline)
    results = await cursor.to_list(length=limit)
    
    return results
```

## Step 4: Hybrid Search (Text + Vector)

Combine traditional text search with vector search:

```python
async def hybrid_search(query: str, limit: int = 10):
    """Combine text and vector search."""
    client = AsyncIOMotorClient("mongodb://localhost:27017/")
    db = client.ecommerce
    
    # Generate query embedding
    query_embedding = await generate_embedding(query)
    
    pipeline = [
        {
            "$vectorSearch": {
                "index": "vector_index",
                "path": "embedding",
                "queryVector": query_embedding,
                "numCandidates": 100,
                "limit": 50  # Get more candidates
            }
        },
        {
            "$match": {
                "$or": [
                    {"name": {"$regex": query, "$options": "i"}},
                    {"description": {"$regex": query, "$options": "i"}}
                ]
            }
        },
        {
            "$project": {
                "name": 1,
                "description": 1,
                "price": 1,
                "vectorScore": {"$meta": "vectorSearchScore"},
                "textMatch": {
                    "$cond": {
                        "if": {"$regexMatch": {"input": "$name", "regex": query}},
                        "then": 1,
                        "else": 0.5
                    }
                }
            }
        },
        {
            "$addFields": {
                "combinedScore": {
                    "$add": [
                        {"$multiply": ["$vectorScore", 0.7]},  # 70% vector
                        {"$multiply": ["$textMatch", 0.3]}      # 30% text
                    ]
                }
            }
        },
        {
            "$sort": {"combinedScore": -1}
        },
        {
            "$limit": limit
        }
    ]
    
    cursor = db.products.aggregate(pipeline)
    return await cursor.to_list(length=limit)
```

## Step 5: FastAPI Integration

```python
from fastapi import APIRouter

router = APIRouter()

@router.post("/search/semantic")
async def semantic_search(request: SearchRequest):
    """
    Semantic product search using vector embeddings.
    
    Finds products by meaning, not just keywords.
    """
    results = await vector_search(request.query, limit=request.limit)
    return {"results": results}
```

## Summary

MongoDB Atlas Vector Search provides:
- ✅ Semantic search capabilities
- ✅ Integration with embeddings
- ✅ Hybrid search (text + vector)
- ✅ Production-ready vector search

Perfect for AI-powered applications with semantic search needs!

