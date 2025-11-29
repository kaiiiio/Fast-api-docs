# JSONB and Full Text Search in PostgreSQL

PostgreSQL's JSONB and full-text search capabilities are powerful features that let you combine structured relational data with flexible JSON storage and fast text search. This guide teaches you everything from basics to advanced patterns.

## Understanding JSONB: Why Not Just JSON?

**The problem with regular JSON column:**
- Stored as text (slow to query)
- No indexing support
- Every query parses the entire JSON
- Can't efficiently search inside JSON

**JSONB (Binary JSON) solves this:**
- Stored in binary format (faster)
- Supports indexing (GIN indexes)
- Can query inside JSON efficiently
- Best of both worlds: flexibility + performance

**Real-world use case in our e-commerce system:**
- Product metadata (varies by product type)
- User preferences (different fields per user)
- Order metadata (tracking info, special instructions)
- Search indexes (store searchable text)

## Step 1: Basic JSONB Storage

Let's start by adding JSONB columns to our models:

```python
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime

class Product(Base):
    """
    Product with flexible JSONB metadata.
    
    Example metadata:
    {
        "color": "red",
        "size": "large",
        "material": "cotton",
        "specifications": {
            "weight": "500g",
            "dimensions": "30x40cm"
        }
    }
    """
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    
    # JSONB column for flexible metadata
    metadata = Column(JSONB, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True)
    full_name = Column(String(200))
    
    # JSONB for user preferences
    preferences = Column(JSONB, default={}, nullable=False)
    
    # JSONB for profile data (varies per user)
    profile_data = Column(JSONB, nullable=True)
```

**Understanding JSONB in SQLAlchemy:**
- `JSONB` type from `sqlalchemy.dialects.postgresql`
- Stores Python dict/list as JSONB in PostgreSQL
- Automatically serializes/deserializes

## Step 2: Storing Data in JSONB

Let's see how to insert and query JSONB data:

```python
async def create_product_with_metadata():
    """Create a product with JSONB metadata."""
    async with async_session_maker() as session:
        product = Product(
            name="Gaming Laptop",
            price=1299.99,
            metadata={
                "brand": "TechCorp",
                "specs": {
                    "cpu": "Intel i7",
                    "ram": "16GB",
                    "storage": "512GB SSD",
                    "gpu": "RTX 3060"
                },
                "features": ["RGB Keyboard", "High Refresh Display"],
                "warranty_years": 2
            }
        )
        
        session.add(product)
        await session.commit()
        
        return product
```

**What happens:**
- Python dict is automatically converted to JSONB
- Stored efficiently in PostgreSQL
- Can query individual fields inside metadata

## Step 3: Querying JSONB Data

This is where JSONB shines - you can query inside the JSON structure:

### Basic JSONB Queries

```python
from sqlalchemy import select, text

async def find_products_by_brand(brand: str):
    """Find products by brand stored in metadata."""
    async with async_session_maker() as session:
        # Method 1: Using JSONB operator ->
        stmt = select(Product).where(
            Product.metadata['brand'].astext == brand
        )
        
        result = await session.execute(stmt)
        return list(result.scalars().all())

async def find_products_by_spec(spec_key: str, spec_value: str):
    """Find products by specification."""
    async with async_session_maker() as session:
        # Navigate nested JSON: metadata->specs->cpu
        stmt = select(Product).where(
            Product.metadata['specs'][spec_key].astext == spec_value
        )
        
        result = await session.execute(stmt)
        return list(result.scalars().all())

# Usage
laptops = await find_products_by_spec('cpu', 'Intel i7')
```

**Understanding JSONB operators:**
- `metadata['brand']` - Access top-level key
- `metadata['specs']['cpu']` - Navigate nested structure
- `.astext` - Convert JSONB value to text for comparison

### Using JSONB Contains (@>)

The `@>` operator checks if JSONB contains specific values:

```python
async def find_products_with_feature(feature: str):
    """Find products that have a specific feature."""
    async with async_session_maker() as session:
        # Check if features array contains "RGB Keyboard"
        stmt = select(Product).where(
            Product.metadata['features'].astext.contains(feature)
        )
        
        # Or using PostgreSQL's @> operator (more efficient)
        stmt = select(Product).where(
            Product.metadata.contains({"features": [feature]})
        )
        
        result = await session.execute(stmt)
        return list(result.scalars().all())
```

### Advanced JSONB Queries

```python
async def find_products_by_warranty(min_years: int):
    """Find products with warranty >= X years."""
    async with async_session_maker() as session:
        stmt = select(Product).where(
            Product.metadata['warranty_years'].astext.cast(Integer) >= min_years
        )
        
        result = await session.execute(stmt)
        return list(result.scalars().all())

async def update_product_metadata(product_id: int, updates: dict):
    """Update specific fields in JSONB without replacing entire object."""
    async with async_session_maker() as session:
        product = await session.get(Product, product_id)
        
        if product.metadata is None:
            product.metadata = {}
        
        # Merge updates into existing metadata
        product.metadata.update(updates)
        
        await session.commit()
        return product

# Usage: Add new field without losing existing data
await update_product_metadata(1, {"color": "black"})
```

## Step 4: Creating JSONB Indexes for Performance

JSONB queries can be slow without indexes. Let's create GIN indexes:

```python
# In Alembic migration
from alembic import op

def upgrade():
    # GIN index on entire JSONB column (supports all queries)
    op.create_index(
        'idx_products_metadata_gin',
        'products',
        ['metadata'],
        postgresql_using='gin'
    )
    
    # Or index specific JSONB paths (more efficient for specific queries)
    op.execute("""
        CREATE INDEX idx_products_metadata_brand
        ON products USING gin ((metadata -> 'brand'))
    """)

def downgrade():
    op.drop_index('idx_products_metadata_gin', table_name='products')
    op.drop_index('idx_products_metadata_brand', table_name='products')
```

**When to use GIN indexes:**
- Querying inside JSONB frequently
- Using `@>` (contains) operator
- Searching in JSONB arrays
- Performance is critical

## Step 5: Full Text Search Basics

PostgreSQL's full-text search is powerful and doesn't require external tools like Elasticsearch for many use cases.

**When to use full-text search:**
- Product search (find "laptop" even if searching "laptops")
- User search (find "John" in "John Smith")
- Content search (search descriptions, reviews)

**How it works:**
1. Text is broken into tokens (words)
2. Tokens are normalized (stemming, lowercasing)
3. Search matches on normalized tokens

### Setting Up Full Text Search

```python
from sqlalchemy import Column, String, Text
from sqlalchemy.dialects.postgresql import TSVECTOR

class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    
    # TSVECTOR column stores searchable text
    search_vector = Column(TSVECTOR, nullable=True)
```

### Creating Search Vectors

```python
# In Alembic migration
def upgrade():
    # Create TSVECTOR column
    op.add_column('products', Column('search_vector', TSVECTOR))
    
    # Create function to update search vector automatically
    op.execute("""
        CREATE OR REPLACE FUNCTION update_product_search_vector()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.search_vector :=
                setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
                setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    
    # Create trigger to auto-update search vector
    op.execute("""
        CREATE TRIGGER product_search_vector_update
        BEFORE INSERT OR UPDATE ON products
        FOR EACH ROW
        EXECUTE FUNCTION update_product_search_vector();
    """)
    
    # Create GIN index for fast searches
    op.execute("""
        CREATE INDEX idx_products_search_vector
        ON products USING gin (search_vector);
    """)
```

**Understanding the trigger:**
- Automatically creates search vector when product is inserted/updated
- Combines name (weight A - high priority) and description (weight B - lower)
- Uses 'english' language for stemming

### Performing Full Text Searches

```python
from sqlalchemy import select, func, text

async def search_products(search_query: str):
    """
    Search products using full-text search.
    
    Finds products matching the search query with relevance ranking.
    """
    async with async_session_maker() as session:
        # Convert search query to tsquery
        tsquery = func.plainto_tsquery('english', search_query)
        
        # Search and rank by relevance
        stmt = select(
            Product,
            func.ts_rank(Product.search_vector, tsquery).label('rank')
        ).where(
            Product.search_vector.match(search_query)  # @@ operator
        ).order_by(
            func.ts_rank(Product.search_vector, tsquery).desc()
        ).limit(20)
        
        result = await session.execute(stmt)
        
        products_with_rank = result.all()
        return [
            {"product": product, "relevance": rank}
            for product, rank in products_with_rank
        ]

# Usage
results = await search_products("gaming laptop")
for item in results:
    print(f"{item['product'].name} (relevance: {item['relevance']})")
```

**Understanding the query:**
- `plainto_tsquery()` - Converts user input to search query
- `match()` - Uses `@@` operator to match search vector
- `ts_rank()` - Calculates relevance score (higher = better match)

### Advanced Full Text Search

```python
async def advanced_search(search_query: str, category_id: int = None):
    """
    Advanced search with multiple filters.
    
    Supports:
    - Phrase matching: "gaming laptop"
    - AND/OR operators: "laptop AND gaming"
    - Category filtering
    """
    async with async_session_maker() as session:
        tsquery = func.plainto_tsquery('english', search_query)
        
        stmt = select(
            Product,
            func.ts_rank_cd(Product.search_vector, tsquery).label('rank')
        ).where(
            Product.search_vector.match(search_query)
        )
        
        # Add category filter if provided
        if category_id:
            stmt = stmt.where(Product.category_id == category_id)
        
        stmt = stmt.order_by(
            func.ts_rank_cd(Product.search_vector, tsquery).desc()
        ).limit(20)
        
        result = await session.execute(stmt)
        return result.all()

# Usage
results = await advanced_search("gaming laptop", category_id=1)
```

## Step 6: Combining JSONB and Full Text Search

This is powerful - search inside JSONB fields:

```python
async def search_in_jsonb_metadata(search_query: str):
    """
    Full-text search inside JSONB metadata.
    
    Searches in all text fields within metadata JSONB.
    """
    async with async_session_maker() as session:
        # Extract all text from JSONB and create search vector
        stmt = select(Product).where(
            func.to_tsvector('english', 
                func.jsonb_path_query_array(
                    Product.metadata,
                    '$.** ? (@.type() == "string")'
                )::text
            ).match(search_query)
        )
        
        result = await session.execute(stmt)
        return list(result.scalars().all())
```

## Step 7: Practical Patterns

### Pattern 1: Flexible Product Attributes

```python
class Product(Base):
    """Product with structured fields + flexible JSONB attributes."""
    
    # Structured data (queryable, indexed)
    id = Column(Integer, primary_key=True)
    name = Column(String(200))
    price = Column(Numeric(10, 2))
    category_id = Column(Integer, ForeignKey("categories.id"))
    
    # Flexible attributes (vary by product type)
    attributes = Column(JSONB, default={})
    
    # Example attributes for different product types:
    # Electronics: {"warranty": 2, "brand": "TechCorp", "model": "XL-500"}
    # Clothing: {"size": "L", "color": "red", "material": "cotton"}
    # Books: {"author": "John Doe", "pages": 300, "isbn": "123-456"}
```

### Pattern 2: User Preferences

```python
class User(Base):
    """User with JSONB preferences."""
    
    preferences = Column(JSONB, default={
        "theme": "dark",
        "language": "en",
        "notifications": {
            "email": True,
            "sms": False,
            "push": True
        },
        "preferred_categories": [1, 3, 5]
    })
    
async def update_user_preference(user_id: int, key: str, value: Any):
    """Update a single preference without replacing all."""
    async with async_session_maker() as session:
        user = await session.get(User, user_id)
        
        # Navigate nested structure
        keys = key.split('.')
        current = user.preferences
        
        # Navigate to parent
        for k in keys[:-1]:
            if k not in current:
                current[k] = {}
            current = current[k]
        
        # Set value
        current[keys[-1]] = value
        
        await session.commit()
        return user

# Usage
await update_user_preference(1, "notifications.email", False)
await update_user_preference(1, "theme", "light")
```

## Step 8: Performance Optimization

### Indexing Strategy

```python
# Index commonly queried JSONB paths
op.execute("""
    CREATE INDEX idx_products_attributes_brand
    ON products USING btree ((attributes->>'brand'));
""")

# Index for array containment
op.execute("""
    CREATE INDEX idx_products_attributes_features
    ON products USING gin ((attributes->'features'));
""")

# Composite index for common queries
op.execute("""
    CREATE INDEX idx_products_category_attributes
    ON products (category_id, (attributes->>'brand'));
""")
```

## Summary

JSONB and full-text search give you:
- **Flexibility**: Store varying data structures
- **Performance**: Indexed queries are fast
- **Power**: Query inside JSON structures
- **Native**: Built into PostgreSQL (no external tools needed)

Use JSONB for:
- Flexible metadata
- User preferences
- Product attributes that vary
- Any data where structure changes

Use full-text search for:
- Product search
- Content search
- User search
- Any free-text searching

Combine them for powerful, flexible data storage and retrieval!

