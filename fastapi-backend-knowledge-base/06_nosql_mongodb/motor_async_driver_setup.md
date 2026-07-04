# Motor (Async MongoDB): Minimal Guide

## Core Setup
*   **Driver:** `motor` (Async driver based on `pymongo`).
*   **Client:** `AsyncIOMotorClient("mongodb://host:port")`.
*   **Database:** `db = client.my_awesome_database`.
*   **Collection:** `collection = db.users`.

## Basic CRUD (Async)
```python
# Create
result = await collection.insert_one({"name": "John", "age": 30})

# Read (Single)
user = await collection.find_one({"name": "John"})

# Read (Many)
cursor = collection.find({"age": {"$gt": 18}}).limit(10)
async for doc in cursor:
    print(doc)

# Update
await collection.update_one({"name": "John"}, {"$set": {"age": 31}})

# Delete
await collection.delete_one({"name": "John"})
```

## Best Practices
- ✅ Use **Indices** for frequently queried fields (e.g., `_id`, `email`, `status`).
- ✅ Singleton Client: Don't create a new client on every request. Create it once on app startup.
- ✅ Use **Pydantic** to validate and serialize MongoDB documents.
- ✅ Motor **Cursors** are async iterators (`async for`).

## Summary Checklist
- ✅ Client created once (Startup)
- ✅ Database/Collection accessed via `client.db.collection`
- ✅ Async CRUD operations
- ✅ Indices created for performance
