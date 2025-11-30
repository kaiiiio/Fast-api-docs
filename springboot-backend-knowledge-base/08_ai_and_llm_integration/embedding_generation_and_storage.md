# Embedding Generation and Storage

## 1. What are Embeddings?

Turning text into numbers (`[0.1, -0.5, 0.9]`).
Similar text = Similar numbers.
Used for **Semantic Search** (RAG).

---

## 2. Spring AI Implementation

Spring AI provides a unified interface for OpenAI, Azure, Ollama, etc.

```java
@Service
public class EmbeddingService {

    @Autowired
    private EmbeddingClient embeddingClient;

    public List<Double> embed(String text) {
        return embeddingClient.embed(text);
    }
}
```

---

## 3. Storing in Vector DB (PGVector)

Don't use a separate DB. Use PostgreSQL with `pgvector`.

### Entity
```java
@Entity
@Table(name = "documents")
public class Document {
    @Id
    private Long id;
    
    private String content;
    
    @Column(columnDefinition = "vector(1536)")
    private List<Double> embedding;
}
```

### Repository
Spring Data JPA doesn't support vector search natively yet (as of 2024). Use native queries.

```java
public interface DocumentRepository extends JpaRepository<Document, Long> {

    @Query(value = "SELECT * FROM documents ORDER BY embedding <-> cast(:vector as vector) LIMIT 5", nativeQuery = true)
    List<Document> searchSimilar(@Param("vector") String vectorString);
}
```

**Note**: `<->` is the Euclidean distance operator in pgvector.

---

## 4. Chunking

You cannot embed a 100-page PDF. You must **Chunk** it.
- **Token Splitter**: Split by 500 tokens.
- **Recursive Character Splitter**: Split by paragraphs, then sentences.

Spring AI has built-in `TokenTextSplitter`.
