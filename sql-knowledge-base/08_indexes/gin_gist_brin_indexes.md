# GIN, GiST, and BRIN Indexes: Specialized PostgreSQL Indexes

PostgreSQL provides specialized index types (GIN, GiST, BRIN) for specific use cases like full-text search, geometric data, and large tables. Understanding these helps optimize performance for specialized scenarios.

## GIN Index (Generalized Inverted Index)

**GIN** indexes are optimized for cases where multiple values map to a single row, like arrays, JSONB, and full-text search.

### Use Cases

```sql
-- ✅ Arrays
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    tags TEXT[]  -- Array of tags
);

CREATE INDEX idx_products_tags_gin ON products USING gin(tags);

-- Query: Find products with specific tag
SELECT * FROM products WHERE 'electronics' = ANY(tags);
-- Uses GIN index
```

### JSONB Indexing

```sql
-- ✅ JSONB columns
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    metadata JSONB
);

CREATE INDEX idx_users_metadata_gin ON users USING gin(metadata);

-- Query: Find users with specific JSON key
SELECT * FROM users WHERE metadata @> '{"role": "admin"}';
-- Uses GIN index
```

### Full-Text Search

```sql
-- ✅ Full-text search
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    content TEXT
);

CREATE INDEX idx_articles_content_gin 
ON articles USING gin(to_tsvector('english', content));

-- Query: Full-text search
SELECT * FROM articles 
WHERE to_tsvector('english', content) @@ to_tsquery('english', 'database');
-- Uses GIN index
```

## GiST Index (Generalized Search Tree)

**GiST** indexes are flexible indexes that can be extended for custom data types. They're useful for geometric data, range types, and full-text search.

### Geometric Data

```sql
-- ✅ Geometric data (points, polygons)
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    coordinates POINT
);

CREATE INDEX idx_locations_coordinates_gist 
ON locations USING gist(coordinates);

-- Query: Find locations within distance
SELECT * FROM locations 
WHERE coordinates <-> POINT(0, 0) < 1000;
-- Uses GiST index
```

### Range Types

```sql
-- ✅ Range types
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    room_id INTEGER,
    booking_period TSRANGE  -- Time range
);

CREATE INDEX idx_bookings_period_gist 
ON bookings USING gist(booking_period);

-- Query: Find overlapping bookings
SELECT * FROM bookings 
WHERE booking_period && '[2023-01-01, 2023-01-31]'::TSRANGE;
-- Uses GiST index
```

### Full-Text Search (Alternative)

```sql
-- ✅ Full-text search with GiST
CREATE INDEX idx_articles_content_gist 
ON articles USING gist(to_tsvector('english', content));

-- GiST is faster to build but slower for queries
-- GIN is slower to build but faster for queries
```

## BRIN Index (Block Range Index)

**BRIN** indexes store summary information about ranges of table blocks. They're very small and fast to build, ideal for large tables with natural ordering.

### Use Cases

```sql
-- ✅ Large tables with natural ordering
CREATE TABLE sensor_readings (
    id SERIAL PRIMARY KEY,
    sensor_id INTEGER,
    reading_time TIMESTAMP,
    value DECIMAL(10, 2)
);

CREATE INDEX idx_readings_time_brin 
ON sensor_readings USING brin(reading_time);

-- Query: Time-range queries
SELECT * FROM sensor_readings 
WHERE reading_time BETWEEN '2023-01-01' AND '2023-01-31';
-- Uses BRIN index
```

### When BRIN is Effective

```sql
-- ✅ Data is naturally ordered (timestamp, auto-increment ID)
-- ✅ Large tables (millions+ rows)
-- ✅ Queries on ordered columns
-- ✅ Low write frequency (BRIN is slow to update)
```

## Comparison Table

| Index Type | Best For | Size | Build Speed | Query Speed |
|------------|----------|------|-------------|-------------|
| B-Tree | General purpose | Medium | Fast | Fast |
| Hash | Equality only | Small | Fast | Very Fast |
| GIN | Arrays, JSONB, Full-text | Large | Slow | Very Fast |
| GiST | Geometric, Ranges | Medium | Medium | Fast |
| BRIN | Large ordered tables | Very Small | Very Fast | Medium |

## Real-World Examples

### Example 1: E-Commerce Tags

```sql
-- Products with tags array
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    tags TEXT[]
);

-- GIN index for array queries
CREATE INDEX idx_products_tags_gin ON products USING gin(tags);

-- Fast queries
SELECT * FROM products WHERE tags && ARRAY['electronics', 'sale'];
SELECT * FROM products WHERE 'electronics' = ANY(tags);
```

### Example 2: Geographic Data

```sql
-- Locations with coordinates
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    coordinates POINT
);

-- GiST index for geometric queries
CREATE INDEX idx_locations_coordinates_gist 
ON locations USING gist(coordinates);

-- Spatial queries
SELECT * FROM locations 
WHERE coordinates <-> POINT(0, 0) < 1000;  -- Within distance
```

### Example 3: Time-Series Data

```sql
-- Large time-series table
CREATE TABLE metrics (
    id BIGSERIAL PRIMARY KEY,
    metric_name VARCHAR(255),
    timestamp TIMESTAMP,
    value DECIMAL(10, 2)
);

-- BRIN index for time-based queries
CREATE INDEX idx_metrics_timestamp_brin 
ON metrics USING brin(timestamp);

-- Efficient time-range queries on large table
SELECT * FROM metrics 
WHERE timestamp BETWEEN '2023-01-01' AND '2023-01-31';
```

## Choosing the Right Index

### Use GIN When:

- ✅ Array columns (tags, categories)
- ✅ JSONB columns (flexible schema)
- ✅ Full-text search (with to_tsvector)
- ✅ Need fast lookups in complex data

### Use GiST When:

- ✅ Geometric data (points, polygons)
- ✅ Range types (time ranges, numeric ranges)
- ✅ Custom data types
- ✅ Need spatial queries

### Use BRIN When:

- ✅ Very large tables (millions+ rows)
- ✅ Naturally ordered data (timestamp, auto-increment)
- ✅ Range queries on ordered columns
- ✅ Need small index size
- ✅ Low write frequency

## Best Practices

1. **Choose Wisely**: Match index type to use case
2. **Monitor Size**: GIN indexes can be large
3. **Rebuild Periodically**: Especially for BRIN
4. **Test Performance**: Compare different index types
5. **Consider Maintenance**: GIN is slow to build

## Common Mistakes

### ❌ Wrong Index Type

```sql
-- ❌ Bad: B-Tree on array
CREATE INDEX idx_products_tags ON products(tags);  -- Doesn't help array queries

-- ✅ Good: GIN on array
CREATE INDEX idx_products_tags_gin ON products USING gin(tags);
```

### ❌ BRIN on Unordered Data

```sql
-- ❌ Bad: BRIN on random data
CREATE INDEX idx_users_email_brin ON users USING brin(email);  -- Not effective

-- ✅ Good: BRIN on ordered data
CREATE INDEX idx_users_created_brin ON users USING brin(created_at);
```

## Summary

**GIN, GiST, BRIN Indexes:**

1. **GIN**: Arrays, JSONB, full-text search
2. **GiST**: Geometric data, range types
3. **BRIN**: Large ordered tables
4. **Specialized**: Each optimized for specific use cases
5. **PostgreSQL**: Available in PostgreSQL, not all databases

**Key Takeaway:**
GIN, GiST, and BRIN are specialized PostgreSQL indexes for specific use cases. GIN is great for arrays and JSONB. GiST is ideal for geometric and range data. BRIN is perfect for large ordered tables. Choose the right index type based on your data and query patterns.

**When to Use:**
- GIN: Arrays, JSONB, full-text search
- GiST: Geometric data, ranges
- BRIN: Large ordered tables

**Next Steps:**
- Learn [B-Tree Index](b_tree_index.md) for general indexing
- Study [Index Selectivity](index_selectivity.md) for optimization
- Master [Query Optimization](../10_performance_optimization/) for performance

