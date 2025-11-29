# Indexing in MongoDB: Complete Guide

Indexes are crucial for MongoDB performance. Without indexes, MongoDB must scan every document to find matches (slow!). This guide teaches you MongoDB indexing from basics to advanced patterns.

## Understanding MongoDB Indexes

**What is an index?**
A data structure that makes queries faster by storing a sorted reference to documents.

**Real-world analogy:**
- **Without index**: Like finding a word in a book by reading every page
- **With index**: Like using the book's index to jump directly to the right page

**Why indexes matter:**
- Query performance: Milliseconds vs seconds
- Sort performance: Indexes are pre-sorted
- Unique constraints: Enforce uniqueness

## Step 1: Basic Index Creation

### Single Field Index

The most common type:

```python
from motor.motor_asyncio import AsyncIOMotorClient

async def create_basic_indexes():
    """Create basic single-field indexes."""
    db = client.ecommerce
    
    # Index on email field (common query)
    await db.users.create_index("email")
    
    # Unique index (enforces uniqueness)
    await db.users.create_index("email", unique=True)
    
    # Index with direction (for sorting)
    await db.products.create_index([("created_at", -1)])  # Descending
    
    # Compound index (multiple fields)
    await db.orders.create_index([
        ("user_id", 1),   # Ascending
        ("created_at", -1)  # Descending
    ])
```

**Understanding index direction:**
- `1`: Ascending (A-Z, 1-100)
- `-1`: Descending (Z-A, 100-1)
- Matters for sorting and range queries

## Step 2: Compound Indexes

**When you query multiple fields together:**

```python
async def create_compound_indexes():
    """Create compound indexes for common query patterns."""
    db = client.ecommerce
    
    # Query: Find orders by user, sorted by date
    # Index: user_id + created_at
    await db.orders.create_index([
        ("user_id", 1),
        ("created_at", -1)
    ])
    
    # Query: Find products by category and price range
    # Index: category + price
    await db.products.create_index([
        ("category", 1),
        ("price", 1)
    ])
    
    # Query: Find products by category, then by name
    # Index: category + name
    await db.products.create_index([
        ("category", 1),
        ("name", 1)
    ])
```

**Understanding compound index order:**
- Order matters! Index `(A, B)` is different from `(B, A)`
- Left-prefix rule: Index `(A, B, C)` can be used for queries on:
  - `A`
  - `A, B`
  - `A, B, C`
- But NOT for queries on just `B` or `C`

## Step 3: Text Indexes for Full-Text Search

```python
async def create_text_index():
    """Create text index for search."""
    db = client.ecommerce
    
    # Single field text index
    await db.products.create_index([("name", "text")])
    
    # Multiple field text index
    await db.products.create_index([
        ("name", "text"),
        ("description", "text")
    ])
    
    # Search using text index
    results = await db.products.find({
        "$text": {"$search": "gaming laptop"}
    }).to_list(length=None)
```

## Step 4: Special Index Types

### TTL Index (Time-To-Live)

Automatically delete documents after time:

```python
async def create_ttl_index():
    """Create TTL index for auto-deleting old documents."""
    db = client.ecommerce
    
    # Delete sessions after 24 hours
    await db.sessions.create_index(
        "expires_at",
        expireAfterSeconds=0  # Delete when expires_at time is reached
    )
    
    # Or delete documents 7 days after creation
    await db.logs.create_index(
        "created_at",
        expireAfterSeconds=604800  # 7 days in seconds
    )
```

**Use cases:**
- Session data
- Temporary logs
- Cache entries
- Any time-based cleanup

### Partial Index

Index only documents matching a condition:

```python
async def create_partial_index():
    """Create partial index for active records only."""
    db = client.ecommerce
    
    # Index only active users
    await db.users.create_index(
        "email",
        partialFilterExpression={"is_active": True}
    )
    
    # Index only completed orders
    await db.orders.create_index(
        "user_id",
        partialFilterExpression={"status": "completed"}
    )
```

**Benefits:**
- Smaller index (only indexed documents)
- Faster queries on filtered subset
- Less memory usage

### Sparse Index

Index only documents with the field:

```python
async def create_sparse_index():
    """Create sparse index for optional fields."""
    db = client.ecommerce
    
    # Index only users with phone number
    await db.users.create_index("phone", sparse=True)
```

## Step 5: Index Performance Analysis

### Check Which Indexes Are Used

```python
async def analyze_query():
    """Analyze query execution plan."""
    db = client.ecommerce
    
    # Use explain() to see query plan
    cursor = db.products.find({"category": "electronics"}).explain()
    plan = await cursor
    
    # Check if index was used
    if plan["executionStats"]["executionStages"]["stage"] == "IXSCAN":
        print("✅ Index used!")
    else:
        print("❌ Collection scan (slow!)")
```

### Index Statistics

```python
async def get_index_stats():
    """Get index usage statistics."""
    db = client.ecommerce
    
    stats = await db.command("collStats", "products")
    
    # View index sizes
    for index in stats.get("indexSizes", {}):
        print(f"{index}: {stats['indexSizes'][index]} bytes")
```

## Step 6: Index Best Practices

### 1. Index Frequently Queried Fields

```python
# ✅ Good: Index fields used in queries
await db.products.create_index("category")  # Queried often
await db.products.create_index("price")     # Queried often

# ❌ Bad: Index rarely queried fields
await db.products.create_index("internal_notes")  # Never queried
```

### 2. Index for Sort Operations

```python
# If you sort by created_at, index it
await db.products.create_index("created_at")

# Query with sort
products = await db.products.find().sort("created_at", -1)
```

### 3. Compound Index Order Matters

```python
# Query: Find by category, sort by price
# ✅ Good: category first, then price
await db.products.create_index([
    ("category", 1),
    ("price", 1)
])

# ❌ Bad: price first (can't use for category-only queries)
await db.products.create_index([
    ("price", 1),
    ("category", 1)
])
```

### 4. Monitor Index Usage

```python
async def check_index_usage():
    """Find unused indexes."""
    db = client.ecommerce
    
    # Get index usage stats
    stats = await db.command("collStats", "products", indexDetails=True)
    
    for index_name, details in stats.get("indexDetails", {}).items():
        access_ops = details.get("accesses", {}).get("ops", 0)
        if access_ops == 0:
            print(f"⚠️ Unused index: {index_name}")
```

## Step 7: Common Indexing Patterns

### Pattern 1: User Lookups

```python
# Index for user queries
await db.users.create_index("email", unique=True)
await db.users.create_index("username", unique=True)
await db.users.create_index("created_at")  # For sorting
```

### Pattern 2: Order Queries

```python
# Index for order queries
await db.orders.create_index([
    ("user_id", 1),
    ("created_at", -1)
])
await db.orders.create_index("status")
await db.orders.create_index("payment_status")
```

### Pattern 3: Product Search

```python
# Indexes for product search
await db.products.create_index("category")
await db.products.create_index([("category", 1), ("price", 1)])
await db.products.create_index([
    ("name", "text"),
    ("description", "text")
])
```

## Summary

MongoDB indexing essentials:
- ✅ Index frequently queried fields
- ✅ Use compound indexes for multi-field queries
- ✅ Consider sort direction when creating indexes
- ✅ Monitor index usage
- ✅ Remove unused indexes

Proper indexing makes MongoDB queries fast. Invest time in index design!

