# Pagination Strategies: Minimal Guide

## Offset/Limit (Simple)
*   **Definition:** Uses `SKIP` and `TAKE` (SQL: `OFFSET` and `LIMIT`).
*   **Best for:** Small datasets, low traffic.
*   **Pros:** Easy to implement, random access to any page.
*   **Cons:** Extremely slow for large datasets (e.g., millions of rows).

## Cursor-based (Fastest)
*   **Definition:** Uses a unique, sorted field (e.g., `id` or `created_at`) to fetch the "next" batch.
*   **Best for:** Infinite scroll, real-time feeds, large datasets.
*   **Pros:** Fast, consistent performance, handles data insertions better.
*   **Cons:** No "Page 10" random access; logic is slightly more complex.

## Implementation Example
```python
# Limit/Offset
query = select(User).offset(20).limit(10)

# Cursor-based
# Fetch 10 users with id > last_user_id
query = select(User).where(User.id > last_id).limit(10).order_by(User.id)
```

## Best Practices
- ✅ Metadata: Always return total count (`Total-Count` header or response body).
- ✅ Sort Order: Define a consistent `ORDER BY` for both strategies.
- ✅ URL Params: Use `page` + `size` (Offset) or `cursor` + `size` (Cursor).
- ✅ Validation: Ensure `size` is within a reasonable limit (e.g., 1-100).