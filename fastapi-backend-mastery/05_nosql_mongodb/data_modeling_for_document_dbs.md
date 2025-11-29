# Data Modeling for Document Databases: Complete Guide

Document databases like MongoDB require different thinking than relational databases. This guide teaches you how to model data effectively in MongoDB, covering embedding vs referencing, schema design patterns, and when to use each approach.

## The Key Decision: Embed vs Reference

This is the most important concept in MongoDB data modeling. Let's understand it deeply.

### Embedding (One Document Contains Everything)

**Concept:**
Put related data inside the same document. Like putting a shopping list inside a shopping bag.

**Example:**
```python
# User document with embedded profile and addresses
{
    "_id": ObjectId("..."),
    "email": "john@example.com",
    "profile": {  # Embedded
        "full_name": "John Doe",
        "bio": "Software developer",
        "avatar_url": "https://..."
    },
    "addresses": [  # Embedded array
        {
            "type": "home",
            "street": "123 Main St",
            "city": "New York",
            "zip": "10001"
        },
        {
            "type": "work",
            "street": "456 Office Blvd",
            "city": "New York",
            "zip": "10002"
        }
    ]
}
```

**When to embed:**
- ✅ Data is always read together
- ✅ One-to-one or one-to-few relationships
- ✅ Data doesn't change frequently
- ✅ Related data belongs conceptually together

### Referencing (Separate Documents, Linked by ID)

**Concept:**
Store related data in separate documents, link them with IDs. Like having a library system with separate books and borrowers.

**Example:**
```python
# User document (references orders)
{
    "_id": ObjectId("user123"),
    "email": "john@example.com",
    "name": "John Doe",
    "order_ids": [ObjectId("order1"), ObjectId("order2")]  # References
}

# Order documents (separate)
{
    "_id": ObjectId("order1"),
    "user_id": ObjectId("user123"),  # Reference back
    "total": 99.99,
    "items": [...]
}

{
    "_id": ObjectId("order2"),
    "user_id": ObjectId("user123"),
    "total": 149.99,
    "items": [...]
}
```

**When to reference:**
- ✅ One-to-many or many-to-many relationships
- ✅ Data grows unbounded (like orders)
- ✅ Data is accessed independently
- ✅ Need to query referenced data separately

## Step 1: Understanding Document Structure

Let's build our e-commerce system in MongoDB:

### Pattern 1: Fully Embedded (Simple Cases)

**Use for: User Profile**

```python
# Single document with everything embedded
{
    "_id": ObjectId("..."),
    "email": "john@example.com",
    "profile": {
        "first_name": "John",
        "last_name": "Doe",
        "phone": "555-1234",
        "birthday": ISODate("1990-01-15")
    },
    "preferences": {
        "theme": "dark",
        "language": "en",
        "notifications": {
            "email": True,
            "sms": False,
            "push": True
        }
    },
    "created_at": ISODate("2024-01-01"),
    "updated_at": ISODate("2024-01-15")
}
```

**Why embed here:**
- Profile is always read with user
- One profile per user (one-to-one)
- Profile rarely accessed independently
- Small, bounded size

### Pattern 2: Embedded Array (One-to-Few)

**Use for: Product Reviews**

```python
# Product with embedded reviews
{
    "_id": ObjectId("..."),
    "name": "Gaming Laptop",
    "price": 1299.99,
    "reviews": [  # Embedded array
        {
            "user_id": ObjectId("user1"),
            "rating": 5,
            "comment": "Amazing laptop!",
            "created_at": ISODate("2024-01-10")
        },
        {
            "user_id": ObjectId("user2"),
            "rating": 4,
            "comment": "Good but battery life could be better",
            "created_at": ISODate("2024-01-12")
        }
        // Limited to ~100-1000 reviews max
    ],
    "review_count": 2,
    "average_rating": 4.5
}
```

**Why embed reviews:**
- Reviews are always shown with product
- Limited number (won't grow unbounded)
- Quick to read (all reviews in one query)

**When NOT to embed:**
- Product has 10,000+ reviews (document too large)
- Need to query reviews independently
- Reviews updated frequently

### Pattern 3: Reference Pattern (One-to-Many)

**Use for: User Orders**

```python
# User document (references orders)
{
    "_id": ObjectId("user123"),
    "email": "john@example.com",
    "order_ids": [  # Just IDs, not full documents
        ObjectId("order1"),
        ObjectId("order2"),
        ObjectId("order3")
    ],
    "order_count": 3
}

# Order documents (separate collection)
{
    "_id": ObjectId("order1"),
    "user_id": ObjectId("user123"),  # Reference back to user
    "total": 99.99,
    "status": "completed",
    "items": [
        {"product_id": ObjectId("prod1"), "quantity": 2, "price": 49.99}
    ],
    "created_at": ISODate("2024-01-10")
}
```

**Why reference orders:**
- Users can have many orders (unbounded)
- Orders are large documents
- Orders queried independently
- Need to query "all orders from January"

## Step 2: Practical Patterns

### Pattern 1: Denormalization for Read Performance

**The concept:**
Store some duplicate data to avoid lookups.

**Example: Order with Product Info**

```python
# Order document with denormalized product data
{
    "_id": ObjectId("order1"),
    "user_id": ObjectId("user123"),
    "items": [
        {
            "product_id": ObjectId("prod1"),  # Reference
            "product_name": "Gaming Laptop",   # Denormalized (snapshot)
            "product_price": 1299.99,          # Denormalized (at time of purchase)
            "quantity": 1,
            "subtotal": 1299.99
        }
    ],
    "total": 1299.99
}
```

**Why denormalize:**
- Product name/price might change later
- Want to show "what they ordered" not "current product"
- Avoid lookup during order display
- Historical accuracy

### Pattern 2: Two-Way Referencing

**When you need to navigate both ways:**

```python
# User document
{
    "_id": ObjectId("user123"),
    "email": "john@example.com",
    "order_ids": [ObjectId("order1"), ObjectId("order2")]
}

# Order document
{
    "_id": ObjectId("order1"),
    "user_id": ObjectId("user123"),
    "user_email": "john@example.com",  # Denormalized for quick access
    "total": 99.99
}
```

**Benefits:**
- Can find orders by user: `db.orders.find({"user_id": user_id})`
- Can find user from order: `db.users.find_one({"_id": order["user_id"]})`
- Denormalized email avoids user lookup for common queries

### Pattern 3: Bucketing Pattern (Time-Series)

**For data that grows over time (like order history):**

```python
# Instead of one document per order item, bucket by month
{
    "_id": ObjectId("..."),
    "user_id": ObjectId("user123"),
    "year": 2024,
    "month": 1,  # January
    "orders": [  # All January orders
        {
            "order_id": ObjectId("order1"),
            "date": ISODate("2024-01-10"),
            "total": 99.99
        },
        {
            "order_id": ObjectId("order2"),
            "date": ISODate("2024-01-15"),
            "total": 149.99
        }
    ],
    "total_orders": 2,
    "total_amount": 249.98
}
```

**Benefits:**
- Limits document growth (one per month)
- Efficient queries ("all orders in January")
- Can still reference full order documents if needed

## Step 3: Schema Design Patterns

### Pattern 1: Attribute Pattern

**For products with varying attributes:**

```python
# Electronics product
{
    "_id": ObjectId("..."),
    "name": "Gaming Laptop",
    "category": "electronics",
    "price": 1299.99,
    "attributes": {
        "cpu": "Intel i7",
        "ram": "16GB",
        "storage": "512GB SSD",
        "gpu": "RTX 3060",
        "screen_size": "15.6 inches"
    }
}

# Clothing product (different attributes!)
{
    "_id": ObjectId("..."),
    "name": "Cotton T-Shirt",
    "category": "clothing",
    "price": 29.99,
    "attributes": {
        "size": "Large",
        "color": "Red",
        "material": "Cotton",
        "care_instructions": "Machine wash cold"
    }
}
```

**Benefits:**
- Same collection for different product types
- Flexible attributes per category
- Easy to add new attribute types

### Pattern 2: Extended Reference

**Store minimal data + reference:**

```python
# Order with extended product reference
{
    "_id": ObjectId("order1"),
    "items": [
        {
            "product_id": ObjectId("prod1"),
            "product_name": "Gaming Laptop",  # Minimal denormalization
            "quantity": 1,
            "price_at_purchase": 1299.99
            // Full product details via product_id if needed
        }
    ]
}
```

## Step 4: Querying Patterns

### Querying Embedded Data

```python
# Find users with specific address
users = await db.users.find({
    "addresses.city": "New York"  # Query inside embedded object
}).to_list(length=None)

# Find products with 5-star reviews
products = await db.products.find({
    "reviews.rating": 5,  # Query array elements
    "reviews": {"$elemMatch": {"rating": 5}}  # More specific
}).to_list(length=None)
```

### Querying with References

```python
# Get user's orders
user = await db.users.find_one({"_id": user_id})
order_ids = user["order_ids"]

# Get orders
orders = await db.orders.find({
    "_id": {"$in": order_ids}  # Find by referenced IDs
}).to_list(length=None)

# Or directly by user_id (if stored in order)
orders = await db.orders.find({
    "user_id": user_id
}).to_list(length=None)
```

## Step 5: Best Practices

### 1. Document Size Limits

**MongoDB limit: 16MB per document**

**What this means:**
- Don't embed unbounded arrays
- Don't store large binary data (use GridFS)
- Split large documents

### 2. Read vs Write Patterns

**Optimize for your access patterns:**

```python
# If you always read user with orders:
# Option 1: Embed recent orders
{
    "_id": ObjectId("user123"),
    "email": "john@example.com",
    "recent_orders": [order1, order2, order3],  # Last 10 orders
    "all_order_ids": [id1, id2, ...]  # Reference to older
}

# Option 2: Reference all orders (if orders large/independent)
{
    "_id": ObjectId("user123"),
    "order_ids": [id1, id2, ...]  # All referenced
}
```

### 3. Indexing Strategy

```python
# Index commonly queried fields
await db.users.create_index("email")  # Unique index
await db.users.create_index("addresses.city")  # Embedded field
await db.users.create_index("order_ids")  # Array of references
await db.orders.create_index("user_id")  # Reference field
await db.orders.create_index([("user_id", 1), ("created_at", -1)])  # Compound
```

## Summary: Decision Framework

**Embed when:**
1. ✅ Data always read together
2. ✅ One-to-one or one-to-few
3. ✅ Bounded growth
4. ✅ Related data conceptually together

**Reference when:**
1. ✅ One-to-many or many-to-many
2. ✅ Unbounded growth
3. ✅ Data accessed independently
4. ✅ Need to query referenced data separately

**Key principles:**
- Model for your queries (how will you read the data?)
- Consider document size (stay under 16MB)
- Denormalize for read performance
- Use references for large/independent data

Mastering embed vs reference is the key to effective MongoDB modeling!

