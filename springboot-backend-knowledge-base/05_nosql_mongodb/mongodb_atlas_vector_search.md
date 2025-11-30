# MongoDB Atlas Vector Search

## 1. What is it?

MongoDB Atlas (the cloud version) supports **Vector Search** natively. You can store embeddings (arrays of floats) alongside your documents and query them with k-NN.

**Why?** You don't need a separate Pinecone/Milvus database. Keep your data and vectors together.

---

## 2. The Schema

You need to define the vector field in your Atlas Search Index definition (JSON config in Atlas UI).

```json
{
  "mappings": {
    "dynamic": true,
    "fields": {
      "embedding": {
        "type": "knnVector",
        "dimensions": 1536,
        "similarity": "cosine"
      }
    }
  }
}
```

---

## 3. Spring Boot Implementation

Use the `$vectorSearch` aggregation stage.

```java
public List<Document> searchSimilar(List<Double> queryVector) {
    
    // 1. Define the Vector Search Stage
    String searchStage = """
        {
            "$vectorSearch": {
                "index": "vector_index",
                "path": "embedding",
                "queryVector": %s,
                "numCandidates": 100,
                "limit": 10
            }
        }
    """.formatted(queryVector.toString());

    // 2. Execute Aggregation
    Aggregation aggregation = newAggregation(
        new CustomAggregationOperation(searchStage),
        project("title", "description", "score")
    );
    
    return mongoTemplate.aggregate(aggregation, "products", Document.class).getMappedResults();
}
```

*Note: `CustomAggregationOperation` is a helper class you write to pass raw JSON to the pipeline, as Spring Data might not support the latest Atlas stages immediately.*
