# MongoDB Aggregation Pipeline: Minimal Guide

## Core Concept
*   **Pipeline:** An array of `stages` (match, group, sort, limit, project) where each stage processes and passes data to the next.
*   **Performance:** All heavy work (grouping, filtering) happens on the DB server, making it faster than doing it in your app code.

## Key Pipeline Stages
1.  **`$match`:** Filter documents (like SQL WHERE).
2.  **`$group`:** Group documents (like SQL GROUP BY).
3.  **`$sort` / `$limit`:** Rank and cap results.
4.  **`$project`:** Focus on only the fields you need (schema transformation).
5.  **`$lookup`:** Join documents from other collections (like SQL JOIN).

## Implementation Example
```python
# Simple Aggregation in FastAPI (via Motor)
pipeline = [
    {"$match": {"status": "active"}},       # Filter active only
    {"$group": {"_id": "$category", "count": {"$sum": 1}}}, # Group by category
    {"$sort": {"count": -1}}               # Sort by most items first
]
cursor = collection.aggregate(pipeline)
results = await cursor.to_list(length=100) # Get results
```

## Best Practices
- ✅ Use **`$match`** as early as possible in the pipeline to filter row-count.
- ✅ Use **GIN Indexes** for full-text search and $match on indexed fields.
- ✅ Avoid **`$lookup`** if you can; it's slow compared to relational joins.
- ✅ Use **`$project`** or **`$unset`** to remove sensitive data (e.g., passwords).

## Summary Checklist
- ✅ Pipeline array defined
- ✅ Matches/Filters first
- ✅ Result limit as final stage
- ✅ Consistent $grouping keys
