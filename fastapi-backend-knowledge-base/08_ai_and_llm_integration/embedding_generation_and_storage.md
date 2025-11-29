# Embedding Generation and Storage: Complete Guide

Generating and storing embeddings is fundamental for semantic search and AI applications. This guide covers embedding generation, storage strategies, and optimization techniques.

## Understanding Embeddings

**What are embeddings?**
Dense vector representations of text that capture semantic meaning. Similar texts have similar vectors.

**Why use embeddings?**
- Semantic search (find similar content)
- Clustering and classification
- Recommendation systems
- Anomaly detection

**How they work:**
```
Text: "Python programming language"
        ↓ Embedding Model
Vector: [0.123, -0.456, 0.789, ...] (1536 dimensions)
```

## Step 1: Generating Embeddings

### Basic Embedding Generation

```python
from openai import AsyncOpenAI
from typing import List

class EmbeddingService:
    """Service for generating text embeddings."""
    
    def __init__(self, openai_client: AsyncOpenAI):
        self.client = openai_client
        self.model = "text-embedding-3-small"  # 1536 dimensions
        # Alternative: "text-embedding-3-large" (3072 dimensions)
    
    async def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for single text.
        
        Args:
            text: Input text (max 8191 tokens)
        
        Returns:
            List of floats representing the embedding vector
        """
        response = await self.client.embeddings.create(
            model=self.model,
            input=text,
            encoding_format="float"  # Or "base64" for smaller size
        )
        
        return response.data[0].embedding
    
    async def generate_embeddings_batch(
        self,
        texts: List[str],
        batch_size: int = 100
    ) -> List[List[float]]:
        """
        Generate embeddings for multiple texts (batch processing).
        
        Args:
            texts: List of input texts
            batch_size: Process in batches (max 2048 per request)
        
        Returns:
            List of embedding vectors
        """
        all_embeddings = []
        
        # Process in batches
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            
            response = await self.client.embeddings.create(
                model=self.model,
                input=batch,  # Batch input
                encoding_format="float"
            )
            
            batch_embeddings = [item.embedding for item in response.data]
            all_embeddings.extend(batch_embeddings)
        
        return all_embeddings
```

### Alternative Embedding Models

```python
class MultiProviderEmbeddingService:
    """Support multiple embedding providers."""
    
    def __init__(self):
        self.openai_client = AsyncOpenAI()
        # Could also add: Cohere, Hugging Face, etc.
    
    async def generate_with_openai(self, text: str, model: str = "text-embedding-3-small"):
        """Generate using OpenAI."""
        response = await self.openai_client.embeddings.create(
            model=model,
            input=text
        )
        return {
            "embedding": response.data[0].embedding,
            "provider": "openai",
            "model": model,
            "dimensions": len(response.data[0].embedding)
        }
    
    async def generate_with_cohere(self, text: str):
        """Generate using Cohere (alternative provider)."""
        # Cohere API implementation
        # Returns similar structure
        pass

# Choose model based on requirements
async def get_embedding(text: str, provider: str = "openai"):
    """Get embedding from chosen provider."""
    service = MultiProviderEmbeddingService()
    
    if provider == "openai":
        return await service.generate_with_openai(text)
    elif provider == "cohere":
        return await service.generate_with_cohere(text)
    else:
        raise ValueError(f"Unknown provider: {provider}")
```

## Step 2: Storing Embeddings in PostgreSQL

### PostgreSQL with pgvector

```python
from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, Integer, Text, Index

class Document(Base):
    """Document with embedding for semantic search."""
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True)
    content = Column(Text, nullable=False)
    embedding = Column(Vector(1536), nullable=False)  # OpenAI embedding dimension
    
    # Metadata
    title = Column(String(255))
    author = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Index for fast similarity search
    __table_args__ = (
        Index('idx_document_embedding', 'embedding', postgresql_using='hnsw',
              postgresql_ops={'embedding': 'vector_cosine_ops'}),
    )

class DocumentRepository:
    """Repository for document operations."""
    
    def __init__(self, db: AsyncSession, embedding_service: EmbeddingService):
        self.db = db
        self.embedding_service = embedding_service
    
    async def create_document(self, content: str, title: Optional[str] = None) -> Document:
        """Create document with generated embedding."""
        # Generate embedding
        embedding = await self.embedding_service.generate_embedding(content)
        
        # Create document
        doc = Document(
            content=content,
            embedding=embedding,
            title=title
        )
        
        self.db.add(doc)
        await self.db.commit()
        await self.db.refresh(doc)
        
        return doc
    
    async def search_similar(
        self,
        query: str,
        limit: int = 10,
        similarity_threshold: float = 0.7
    ) -> List[Document]:
        """Search for similar documents using vector similarity."""
        # Generate embedding for query
        query_embedding = await self.embedding_service.generate_embedding(query)
        
        # Vector similarity search
        stmt = (
            select(Document)
            .order_by(
                Document.embedding.cosine_distance(query_embedding)
            )
            .limit(limit)
        )
        
        result = await self.db.execute(stmt)
        documents = result.scalars().all()
        
        # Filter by similarity threshold
        similar_docs = []
        for doc in documents:
            # Calculate similarity (1 - distance)
            distance = await self.db.execute(
                select(func.cosine_distance(Document.embedding, query_embedding))
                .where(Document.id == doc.id)
            )
            similarity = 1 - distance.scalar()
            
            if similarity >= similarity_threshold:
                similar_docs.append(doc)
        
        return similar_docs
```

### Batch Storage

```python
async def bulk_create_documents(
    documents: List[dict],
    db: AsyncSession,
    embedding_service: EmbeddingService
):
    """Bulk create documents with embeddings."""
    # Extract texts
    texts = [doc["content"] for doc in documents]
    
    # Generate embeddings in batch
    embeddings = await embedding_service.generate_embeddings_batch(texts)
    
    # Create document objects
    db_documents = [
        Document(
            content=doc["content"],
            embedding=embeddings[i],
            title=doc.get("title")
        )
        for i, doc in enumerate(documents)
    ]
    
    # Bulk insert
    db.add_all(db_documents)
    await db.commit()
    
    return db_documents
```

## Step 3: Storing Embeddings in MongoDB

### MongoDB Document Storage

```python
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

class MongoDocumentRepository:
    """Repository for documents in MongoDB."""
    
    def __init__(
        self,
        mongo_client: AsyncIOMotorClient,
        embedding_service: EmbeddingService
    ):
        self.db = mongo_client["documents_db"]
        self.collection = self.db["documents"]
        self.embedding_service = embedding_service
    
    async def create_document(self, content: str, metadata: Optional[dict] = None):
        """Create document with embedding in MongoDB."""
        # Generate embedding
        embedding = await self.embedding_service.generate_embedding(content)
        
        # Create document
        doc = {
            "content": content,
            "embedding": embedding,
            "metadata": metadata or {},
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await self.collection.insert_one(doc)
        return result.inserted_id
    
    async def search_similar(
        self,
        query: str,
        limit: int = 10,
        similarity_threshold: float = 0.7
    ) -> List[dict]:
        """Search similar documents using MongoDB Atlas Vector Search."""
        # Generate query embedding
        query_embedding = await self.embedding_service.generate_embedding(query)
        
        # MongoDB Atlas Vector Search aggregation
        pipeline = [
            {
                "$vectorSearch": {
                    "index": "vector_index",  # Pre-created in Atlas
                    "path": "embedding",
                    "queryVector": query_embedding,
                    "numCandidates": limit * 10,  # Search more candidates
                    "limit": limit,
                    "filter": {
                        "metadata.status": "active"  # Optional filter
                    }
                }
            },
            {
                "$addFields": {
                    "similarity_score": {
                        "$subtract": [1, {"$meta": "vectorSearchScore"}]
                    }
                }
            },
            {
                "$match": {
                    "similarity_score": {"$gte": similarity_threshold}
                }
            }
        ]
        
        cursor = self.collection.aggregate(pipeline)
        results = await cursor.to_list(length=limit)
        
        return results
```

## Step 4: Embedding Optimization

### Chunking Large Documents

```python
from typing import List

def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
    """
    Split large text into overlapping chunks.
    
    Overlap ensures context isn't lost at chunk boundaries.
    """
    words = text.split()
    chunks = []
    
    for i in range(0, len(words), chunk_size - overlap):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
        
        if i + chunk_size >= len(words):
            break
    
    return chunks

async def create_document_with_chunks(
    content: str,
    db: AsyncSession,
    embedding_service: EmbeddingService
) -> List[Document]:
    """Create document with chunked embeddings."""
    # Split into chunks
    chunks = chunk_text(content, chunk_size=1000, overlap=200)
    
    # Generate embeddings for all chunks
    embeddings = await embedding_service.generate_embeddings_batch(chunks)
    
    # Create document objects
    documents = [
        Document(
            content=chunk,
            embedding=embedding,
            metadata={"chunk_index": i, "total_chunks": len(chunks)}
        )
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings))
    ]
    
    db.add_all(documents)
    await db.commit()
    
    return documents
```

### Caching Embeddings

```python
from functools import lru_cache
import hashlib

def hash_text(text: str) -> str:
    """Hash text for cache key."""
    return hashlib.md5(text.encode()).hexdigest()

class CachedEmbeddingService(EmbeddingService):
    """Embedding service with caching."""
    
    def __init__(self, *args, redis_client=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.redis = redis_client
    
    async def generate_embedding_cached(self, text: str) -> List[float]:
        """Generate embedding with Redis cache."""
        cache_key = f"embedding:{self.model}:{hash_text(text)}"
        
        # Check cache
        cached = await self.redis.get(cache_key)
        if cached:
            return json.loads(cached)
        
        # Generate embedding
        embedding = await self.generate_embedding(text)
        
        # Cache for 30 days (embeddings don't change)
        await self.redis.setex(cache_key, 30 * 24 * 3600, json.dumps(embedding))
        
        return embedding
```

## Step 5: FastAPI Integration

### Embedding Generation Endpoint

```python
@router.post("/documents")
async def create_document(
    content: str,
    title: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    embedding_service: EmbeddingService = Depends(get_embedding_service)
):
    """Create document with automatic embedding generation."""
    repo = DocumentRepository(db, embedding_service)
    
    doc = await repo.create_document(content, title=title)
    
    return {
        "id": doc.id,
        "title": doc.title,
        "content_preview": doc.content[:200],
        "embedding_dimensions": len(doc.embedding)
    }

@router.post("/documents/search")
async def search_documents(
    query: str,
    limit: int = 10,
    similarity_threshold: float = 0.7,
    db: AsyncSession = Depends(get_db),
    embedding_service: EmbeddingService = Depends(get_embedding_service)
):
    """Search documents using semantic similarity."""
    repo = DocumentRepository(db, embedding_service)
    
    results = await repo.search_similar(query, limit=limit, similarity_threshold=similarity_threshold)
    
    return {
        "query": query,
        "results": [
            {
                "id": doc.id,
                "title": doc.title,
                "content_preview": doc.content[:200],
                "similarity": similarity  # Would need to calculate
            }
            for doc in results
        ],
        "count": len(results)
    }
```

## Step 6: Embedding Quality and Validation

### Validate Embedding Dimensions

```python
def validate_embedding(embedding: List[float], expected_dimensions: int = 1536):
    """Validate embedding format and dimensions."""
    if not isinstance(embedding, list):
        raise ValueError(f"Embedding must be a list, got {type(embedding)}")
    
    if len(embedding) != expected_dimensions:
        raise ValueError(
            f"Embedding dimensions mismatch: expected {expected_dimensions}, "
            f"got {len(embedding)}"
        )
    
    if not all(isinstance(x, (int, float)) for x in embedding):
        raise ValueError("Embedding must contain only numbers")
    
    return True

async def generate_embedding_validated(
    text: str,
    embedding_service: EmbeddingService,
    expected_dimensions: int = 1536
) -> List[float]:
    """Generate and validate embedding."""
    embedding = await embedding_service.generate_embedding(text)
    validate_embedding(embedding, expected_dimensions)
    return embedding
```

## Best Practices

1. **✅ Choose right model**: Balance quality vs cost vs dimensions
2. **✅ Batch operations**: Generate embeddings in batches
3. **✅ Cache embeddings**: Same text = same embedding
4. **✅ Chunk large documents**: Better context preservation
5. **✅ Index properly**: Use HNSW indexes for fast search
6. **✅ Validate dimensions**: Ensure consistency

## Summary

Embedding generation and storage provides:
- ✅ Semantic search capabilities
- ✅ Efficient storage strategies
- ✅ Fast similarity queries
- ✅ Scalable architecture

Implement comprehensive embedding pipelines for AI-powered applications!
