# JSONB & Full-Text Search: Minimal Guide

## JSONB (Binary JSON)
*   **Definition:** Indexed, binary version of JSON (faster than plain text JSON).
*   **Queries:** Check existence (`?`), containment (`@>`), and get key (`->` / `->>`).
*   **SQLAlchemy:** `Column(JSONB)` (e.g., storing metadata or user preferences).
*   **Index:** Use **GIN Index** on the column to speed up queries.

## Full-Text Search (TSVector)
*   **Definition:** Efficiently search large text bodies using linguistic concepts.
*   **Components:** `tsvector` (words) and `tsquery` (search term).
*   **GIN Index:** Essential for production speed.

## Hybrid Search (SQL + Vector)
- **Concept:** Mix standard SQL filters (e.g., `user_id = 1`) with Vector search for most relevant results.
- **SQLAlchemy:** Combine `where()` with `.order_by(embedding.cosine_distance(vec))`.

## Best Practices
- ✅ Use **`JSONB`** for data that evolves or has no fixed schema.
- ✅ Use **GIN Indexes** for both JSONB key/value access and full-text search.
- ✅ Avoid **`JSON`** (plain text); always use **`JSONB`**.
- ✅ Use **`to_tsvector('english', column)`** for text normalization.

## Summary Checklist
- ✅ JSONB for flex schemas
- ✅ Full-text search (GIN index)
- ✅ Indexed JSONB keys
- ✅ English language support in search