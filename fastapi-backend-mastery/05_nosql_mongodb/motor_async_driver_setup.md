# Motor Async Driver Setup: Complete MongoDB Guide

Motor is the official async MongoDB driver for Python. This guide teaches you how to set it up from scratch, understand connection patterns, and use it effectively in FastAPI.

## Understanding Motor

**What is Motor?**
Motor is the async version of PyMongo, MongoDB's official Python driver. It provides non-blocking, async database operations.

**Why Motor?**
- Native async/await support
- Works seamlessly with FastAPI
- Non-blocking I/O operations
- High performance

## Step 1: Installation and Basic Setup

First, let's install and configure Motor:

```bash
pip install motor
```

### Basic Connection Setup

```python
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure
import os

# Basic connection
client = AsyncIOMotorClient("mongodb://localhost:27017/")

# Test connection
async def test_connection():
    try:
        await client.admin.command('ping')
        print("Connected to MongoDB!")
    except ConnectionFailure:
        print("Failed to connect to MongoDB")
```

**Understanding the connection:**
- `AsyncIOMotorClient` - Async MongoDB client
- Connection string format: `mongodb://host:port/`
- Connection is lazy (doesn't connect until first operation)

## Step 2: Connection Configuration

Let's set up a production-ready connection:

```python
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.server_api import ServerApi
from pymongo import ReadPreference
from typing import Optional

class MongoDBConfig:
    """MongoDB connection configuration."""
    
    def __init__(
        self,
        host: str = "localhost",
        port: int = 27017,
        database: str = "mydb",
        username: Optional[str] = None,
        password: Optional[str] = None,
        auth_source: str = "admin",
        max_pool_size: int = 100,
        min_pool_size: int = 10,
        max_idle_time_ms: int = 45000,
    ):
        self.host = host
        self.port = port
        self.database = database
        self.username = username
        self.password = password
        self.auth_source = auth_source
        self.max_pool_size = max_pool_size
        self.min_pool_size = min_pool_size
        self.max_idle_time_ms = max_idle_time_ms
    
    @property
    def connection_string(self) -> str:
        """Build MongoDB connection string."""
        if self.username and self.password:
            return (
                f"mongodb://{self.username}:{self.password}"
                f"@{self.host}:{self.port}/{self.database}"
                f"?authSource={self.auth_source}"
            )
        return f"mongodb://{self.host}:{self.port}/{self.database}"
    
    def create_client(self) -> AsyncIOMotorClient:
        """Create configured MongoDB client."""
        return AsyncIOMotorClient(
            self.connection_string,
            maxPoolSize=self.max_pool_size,
            minPoolSize=self.min_pool_size,
            maxIdleTimeMS=self.max_idle_time_ms,
            serverSelectionTimeoutMS=5000,  # Fail fast if can't connect
            retryWrites=True,  # Retry write operations
        )

# Usage
config = MongoDBConfig(
    host="localhost",
    port=27017,
    database="ecommerce",
    username="admin",
    password="secure_password"
)

client = config.create_client()
db = client.ecommerce  # Get database
```

**Understanding connection parameters:**
- `maxPoolSize` - Maximum connections in pool
- `minPoolSize` - Minimum connections to maintain
- `maxIdleTimeMS` - Close idle connections after this time
- `serverSelectionTimeoutMS` - Timeout for initial connection

## Step 3: Database and Collection Access

Understanding how to work with databases and collections:

```python
# Get database
db = client["ecommerce"]
# Or
db = client.ecommerce

# Get collection
users_collection = db["users"]
# Or
users_collection = db.users
```

**MongoDB structure:**
```
MongoDB Server
  └── Database (ecommerce)
      ├── Collection (users)
      ├── Collection (products)
      └── Collection (orders)
```

## Step 4: Basic CRUD Operations

Let's learn CRUD operations step by step:

### Create (Insert)

```python
async def create_user(user_data: dict):
    """Create a new user document."""
    result = await db.users.insert_one(user_data)
    print(f"Created user with ID: {result.inserted_id}")
    return result.inserted_id

# Usage
user_id = await create_user({
    "email": "john@example.com",
    "full_name": "John Doe",
    "created_at": datetime.utcnow()
})

# Insert multiple documents
async def create_multiple_users(users: list):
    """Create multiple users at once."""
    result = await db.users.insert_many(users)
    return result.inserted_ids
```

### Read (Find)

```python
async def get_user_by_id(user_id: str):
    """Get user by ID."""
    from bson import ObjectId
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    return user

async def get_user_by_email(email: str):
    """Find user by email."""
    user = await db.users.find_one({"email": email})
    return user

async def get_all_users(limit: int = 100, skip: int = 0):
    """Get all users with pagination."""
    cursor = db.users.find().skip(skip).limit(limit)
    users = await cursor.to_list(length=limit)
    return users

async def search_users(query: str):
    """Search users by name (case-insensitive)."""
    cursor = db.users.find({
        "full_name": {"$regex": query, "$options": "i"}  # Case-insensitive
    })
    users = await cursor.to_list(length=None)
    return users
```

### Update

```python
async def update_user(user_id: str, updates: dict):
    """Update user fields."""
    from bson import ObjectId
    
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": updates}  # $set updates specified fields
    )
    
    return result.modified_count > 0

async def increment_user_score(user_id: str, amount: int):
    """Increment a numeric field."""
    from bson import ObjectId
    
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$inc": {"score": amount}}  # Increment operator
    )
    
    return result.modified_count > 0
```

### Delete

```python
async def delete_user(user_id: str):
    """Delete a user."""
    from bson import ObjectId
    
    result = await db.users.delete_one({"_id": ObjectId(user_id)})
    return result.deleted_count > 0

async def delete_users_by_email(email_pattern: str):
    """Delete multiple users matching pattern."""
    result = await db.users.delete_many({
        "email": {"$regex": email_pattern}
    })
    return result.deleted_count
```

## Step 5: Working with FastAPI

Let's integrate Motor with FastAPI properly:

```python
from fastapi import FastAPI, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from contextlib import asynccontextmanager

# Global client (created at startup)
client: Optional[AsyncIOMotorClient] = None
database = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage MongoDB connection lifecycle."""
    global client, database
    
    # Startup
    client = AsyncIOMotorClient("mongodb://localhost:27017/")
    database = client.ecommerce
    
    # Test connection
    await client.admin.command('ping')
    print("MongoDB connected!")
    
    yield
    
    # Shutdown
    if client:
        client.close()
        print("MongoDB disconnected")

app = FastAPI(lifespan=lifespan)

# Dependency to get database
async def get_db():
    """Dependency to get database instance."""
    return database

# Use in routes
@app.get("/users/{user_id}")
async def get_user(user_id: str, db = Depends(get_db)):
    from bson import ObjectId
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Convert ObjectId to string for JSON serialization
    user["_id"] = str(user["_id"])
    return user
```

## Step 6: Configuration with Pydantic Settings

Production-ready configuration:

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application settings."""
    
    # MongoDB
    mongodb_url: str = "mongodb://localhost:27017/"
    mongodb_database: str = "ecommerce"
    mongodb_max_pool_size: int = 100
    mongodb_min_pool_size: int = 10
    
    class Config:
        env_file = ".env"

settings = Settings()

# Create client with settings
client = AsyncIOMotorClient(
    settings.mongodb_url,
    maxPoolSize=settings.mongodb_max_pool_size,
    minPoolSize=settings.mongodb_min_pool_size,
)

db = client[settings.mongodb_database]
```

## Step 7: Error Handling

Proper error handling patterns:

```python
from pymongo.errors import DuplicateKeyError, OperationFailure

async def create_user_safe(user_data: dict):
    """Create user with error handling."""
    try:
        result = await db.users.insert_one(user_data)
        return {"success": True, "user_id": str(result.inserted_id)}
    
    except DuplicateKeyError:
        raise HTTPException(
            status_code=400,
            detail="User with this email already exists"
        )
    
    except OperationFailure as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database operation failed: {str(e)}"
        )
```

## Summary

Motor provides:
- ✅ Native async MongoDB operations
- ✅ Connection pooling
- ✅ Easy FastAPI integration
- ✅ Production-ready configuration

Key takeaways:
- Use connection pooling for performance
- Handle ObjectId conversion for JSON
- Use proper error handling
- Configure timeouts and pool sizes appropriately

Now you can use MongoDB effectively in your FastAPI applications!

