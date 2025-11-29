# ODM Comparison: Beanie vs Umongo - Complete Guide

ODMs (Object Document Mappers) provide SQLAlchemy-like interfaces for MongoDB in Python. This comprehensive guide compares Beanie and Umongo to help you choose the right ODM for your FastAPI application.

## Understanding ODMs

**What are ODMs?**
Object Document Mappers - convert MongoDB documents to Python objects, similar to how ORMs work with relational databases.

**Benefits:**
- Type safety and IDE autocomplete
- Data validation
- Easier querying (Pythonic syntax)
- Schema definition and migration support
- Relationship handling

**When to use an ODM:**
- Building type-safe MongoDB applications
- Need validation on document fields
- Want Pythonic query syntax
- Working with complex document structures

## Overview: Beanie vs Umongo

**Beanie**: Modern, Pydantic-based ODM designed for async Python
**Umongo**: Mature, Marshmallow-based ODM with async support

## Part 1: Beanie Deep Dive

### Core Features

Beanie is built on top of Motor (async MongoDB driver) and Pydantic, providing type-safe, async-first MongoDB operations.

### Basic Setup

```python
from beanie import Document, init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

# Define document model
class User(Document):
    email: EmailStr
    full_name: str
    age: int = Field(ge=0, le=150)
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "users"  # Collection name
        indexes = [
            [("email", 1)],  # Email index
            [("created_at", -1)],  # Descending index
        ]

# Initialize Beanie
async def init_beanie_connection():
    client = AsyncIOMotorClient("mongodb://localhost:27017/")
    await init_beanie(
        database=client.ecommerce,
        document_models=[User]
    )

# In FastAPI startup
@app.on_event("startup")
async def startup():
    await init_beanie_connection()
```

### CRUD Operations with Beanie

```python
# Create
user = User(
    email="john@example.com",
    full_name="John Doe",
    age=30
)
await user.insert()  # Insert single document

# Batch insert
users = [
    User(email=f"user{i}@example.com", full_name=f"User {i}", age=20+i)
    for i in range(10)
]
await User.insert_many(users)

# Read
user = await User.get("document_id")  # Get by ID
user = await User.find_one(User.email == "john@example.com")  # Find one
users = await User.find(User.age > 25).to_list()  # Find many

# Update
user = await User.get("document_id")
user.age = 31
await user.save()  # Update

# Or update directly
await User.find_one(User.email == "john@example.com").update(
    {"$set": {"age": 31}}
)

# Delete
user = await User.get("document_id")
await user.delete()  # Delete single

await User.find(User.age < 18).delete()  # Delete many
```

### Advanced Queries

```python
# Complex queries
active_adults = await User.find(
    User.age >= 18,
    User.is_active == True
).to_list()

# Sorting and limiting
users = await User.find().sort(-User.created_at).limit(10).to_list()

# Aggregation
pipeline = [
    {"$match": {"is_active": True}},
    {"$group": {"_id": None, "avg_age": {"$avg": "$age"}}}
]
result = await User.aggregate(pipeline).to_list()

# Text search
users = await User.find({"$text": {"$search": "john"}}).to_list()
```

### Relationships with Beanie

```python
from typing import List
from beanie import Link

class Order(Document):
    user: Link[User]  # Reference to User
    items: List[str]
    total: float
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "orders"

# Create order with user reference
user = await User.get("user_id")
order = Order(
    user=user,  # Link to user
    items=["item1", "item2"],
    total=100.0
)
await order.insert()

# Fetch order with user
order = await Order.get("order_id", fetch_links=True)
print(order.user.email)  # Access user data
```

### Pydantic Validation

```python
from pydantic import validator

class User(Document):
    email: EmailStr
    age: int = Field(ge=0, le=150)
    
    @validator("age")
    def validate_age(cls, v):
        if v < 18:
            raise ValueError("Must be 18 or older")
        return v
    
    class Settings:
        name = "users"

# Validation happens automatically
try:
    user = User(email="test@example.com", age=17)  # Will raise ValidationError
except ValidationError as e:
    print(e)
```

### Beanie Pros and Cons

**Pros:**
- ✅ **Pydantic integration**: Native validation and type safety
- ✅ **Modern async/await**: Built for async Python
- ✅ **Type hints everywhere**: Excellent IDE support
- ✅ **Active development**: Regular updates and improvements
- ✅ **FastAPI integration**: Works seamlessly with FastAPI
- ✅ **Pythonic syntax**: Clean, readable queries

**Cons:**
- ⚠️ **Newer**: Less mature ecosystem
- ⚠️ **Smaller community**: Fewer examples and tutorials
- ⚠️ **Migration tools**: Less mature migration support

## Part 2: Umongo Deep Dive

### Core Features

Umongo uses Marshmallow for validation and provides both sync and async support. It's more mature and stable than Beanie.

### Basic Setup

```python
from umongo import Document, fields, Instance
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime

# Create database connection
db = AsyncIOMotorClient("mongodb://localhost:27017/").ecommerce
instance = Instance(db)

# Define document model
@instance.register
class User(Document):
    email = fields.EmailField(required=True)
    full_name = fields.StrField(required=True)
    age = fields.IntField(required=True, validate=lambda v: 0 <= v <= 150)
    is_active = fields.BoolField(default=True)
    created_at = fields.DateTimeField(default=datetime.utcnow)
    
    class Meta:
        collection_name = "users"
        indexes = [
            ("email", {"unique": True}),
            ("created_at", {"expireAfterSeconds": 3600})  # TTL index
        ]
```

### CRUD Operations with Umongo

```python
# Create
user = User(
    email="john@example.com",
    full_name="John Doe",
    age=30
)
await user.commit()  # Insert single document

# Batch insert
users = [
    User(email=f"user{i}@example.com", full_name=f"User {i}", age=20+i)
    for i in range(10)
]
await User.commit(users)

# Read
user = await User.find_one({"email": "john@example.com"})  # Find one
users = await User.find({"age": {"$gt": 25}}).to_list()  # Find many

# Update
user = await User.find_one({"email": "john@example.com"})
user.age = 31
await user.commit()  # Update

# Or update directly
await User.collection.update_one(
    {"email": "john@example.com"},
    {"$set": {"age": 31}}
)

# Delete
user = await User.find_one({"email": "john@example.com"})
await user.delete()  # Delete single

await User.find({"age": {"$lt": 18}}).delete()  # Delete many
```

### Advanced Queries

```python
# Complex queries
active_adults = await User.find({
    "age": {"$gte": 18},
    "is_active": True
}).to_list()

# Sorting and limiting
users = await User.find().sort([("created_at", -1)]).limit(10).to_list()

# Aggregation
pipeline = [
    {"$match": {"is_active": True}},
    {"$group": {"_id": None, "avg_age": {"$avg": "$age"}}}
]
result = await User.aggregate(pipeline).to_list()
```

### Relationships with Umongo

```python
from umongo import Reference

@instance.register
class Order(Document):
    user = Reference("User", required=True)  # Reference to User
    items = fields.ListField(fields.StrField())
    total = fields.FloatField(required=True)
    created_at = fields.DateTimeField(default=datetime.utcnow)
    
    class Meta:
        collection_name = "orders"

# Create order with user reference
user = await User.find_one({"email": "john@example.com"})
order = Order(
    user=user,
    items=["item1", "item2"],
    total=100.0
)
await order.commit()

# Fetch order with user
order = await Order.find_one({"user": user.id})
await order.user.fetch()  # Fetch referenced user
print(order.user.email)
```

### Marshmallow Validation

```python
from umongo import fields, validators

@instance.register
class User(Document):
    email = fields.EmailField(required=True)
    age = fields.IntField(
        required=True,
        validate=validators.And(
            validators.Range(min=18, max=150),
            lambda v: v >= 18 or ValueError("Must be 18 or older")
        )
    )
    
    class Meta:
        collection_name = "users"
```

### Umongo Pros and Cons

**Pros:**
- ✅ **Mature and stable**: Production-ready, battle-tested
- ✅ **Marshmallow validation**: Powerful validation library
- ✅ **Good documentation**: Comprehensive docs and examples
- ✅ **Flexible**: Works with sync and async code
- ✅ **Index support**: Easy index definition

**Cons:**
- ⚠️ **Less Pythonic**: More verbose syntax
- ⚠️ **Limited type hints**: Less IDE support
- ⚠️ **Marshmallow dependency**: Different from Pydantic (FastAPI standard)
- ⚠️ **Smaller feature set**: Fewer modern features

## Part 3: Detailed Comparison

### Feature Comparison Matrix

| Feature | Beanie | Umongo | Winner |
|---------|--------|--------|--------|
| **Validation** | Pydantic (built-in) | Marshmallow | Beanie (FastAPI integration) |
| **Type Hints** | ✅ Excellent | ⚠️ Limited | Beanie |
| **Async Support** | ✅ Native | ✅ Yes | Tie |
| **Maturity** | Newer (2020+) | Mature (2016+) | Umongo |
| **Community** | Growing | Established | Umongo |
| **Documentation** | Good | Good | Tie |
| **FastAPI Integration** | ✅ Seamless | ⚠️ Works but separate | Beanie |
| **Query Syntax** | ✅ Pythonic | ⚠️ Dict-based | Beanie |
| **Migration Tools** | ⚠️ Limited | ⚠️ Limited | Tie |
| **Performance** | ✅ Fast | ✅ Fast | Tie |

### Code Comparison Examples

#### Creating a Document

**Beanie:**
```python
class User(Document):
    email: EmailStr
    name: str
    age: int
```

**Umongo:**
```python
@instance.register
class User(Document):
    email = fields.EmailField(required=True)
    name = fields.StrField(required=True)
    age = fields.IntField(required=True)
```

#### Querying

**Beanie:**
```python
# More Pythonic
users = await User.find(User.age > 25, User.is_active == True).to_list()
```

**Umongo:**
```python
# More MongoDB-like
users = await User.find({
    "age": {"$gt": 25},
    "is_active": True
}).to_list()
```

## Part 4: FastAPI Integration

### Beanie Integration

```python
from fastapi import FastAPI, Depends
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

app = FastAPI()

@app.on_event("startup")
async def init_db():
    client = AsyncIOMotorClient("mongodb://localhost:27017/")
    await init_beanie(database=client.ecommerce, document_models=[User])

@app.get("/users/{user_id}")
async def get_user(user_id: str):
    user = await User.get(user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return user.dict()
```

### Umongo Integration

```python
from fastapi import FastAPI
from motor.motor_asyncio import AsyncIOMotorClient
from umongo import Instance

app = FastAPI()
db = AsyncIOMotorClient("mongodb://localhost:27017/").ecommerce
instance = Instance(db)

@app.get("/users/{user_id}")
async def get_user(user_id: str):
    user = await User.find_one({"_id": user_id})
    if not user:
        raise HTTPException(404, "User not found")
    return user.dump()  # Convert to dict
```

## Part 5: Decision Guide

### Choose Beanie When:

1. ✅ **Using FastAPI**: Native Pydantic integration
2. ✅ **Type safety is critical**: Excellent type hints
3. ✅ **Modern Python patterns**: Async-first, type hints
4. ✅ **Team prefers Pydantic**: Already using Pydantic for validation
5. ✅ **New project**: Can adopt modern tooling

**Example use case:**
- FastAPI backend with strict type checking
- Need seamless Pydantic integration
- Want Pythonic query syntax

### Choose Umongo When:

1. ✅ **Need mature solution**: Production stability required
2. ✅ **Already using Marshmallow**: Existing validation with Marshmallow
3. ✅ **Simple requirements**: Basic ODM features sufficient
4. ✅ **Migration from older code**: Easier transition path
5. ✅ **Team familiar with Marshmallow**: Existing expertise

**Example use case:**
- Legacy application with Marshmallow
- Need stable, proven solution
- Simple document operations

## Part 6: Migration Considerations

### Migrating from Umongo to Beanie

```python
# Umongo model
@instance.register
class User(Document):
    email = fields.EmailField(required=True)
    name = fields.StrField(required=True)

# Beanie equivalent
class User(Document):
    email: EmailStr
    name: str
    
    class Settings:
        name = "users"
```

### Best Practices

1. **Start small**: Migrate one model at a time
2. **Test thoroughly**: Validate all queries work correctly
3. **Update dependencies**: Ensure compatibility
4. **Document changes**: Keep team informed

## Summary

**Beanie** is ideal for:
- Modern FastAPI applications
- Type-safe development
- Pydantic-based validation
- Pythonic query syntax

**Umongo** is ideal for:
- Stable, production applications
- Marshmallow-based validation
- Simple ODM requirements
- Legacy codebases

**Recommendation:**
For new FastAPI projects, **Beanie is the better choice** due to:
- Native Pydantic integration
- Better type safety
- More Pythonic syntax
- Active development

For existing applications using Marshmallow or requiring maximum stability, **Umongo remains a solid choice**.

Both ODMs are capable and production-ready. The choice depends on your validation library preference, type safety requirements, and project needs!
