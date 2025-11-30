# Search + Filtering Query Patterns: Building Flexible APIs

Building APIs that support search and filtering is a common requirement. This guide covers efficient query patterns for dynamic search and filtering.

## Basic Filtering Pattern

### Single Filter

```sql
-- Filter by status
SELECT *
FROM orders
WHERE status = :status
ORDER BY created_at DESC
LIMIT :limit OFFSET :offset;
```

### Multiple Filters

```sql
-- Filter by multiple conditions
SELECT *
FROM products
WHERE 
    category_id = :category_id
    AND price BETWEEN :min_price AND :max_price
    AND stock_quantity > 0
    AND status = 'active'
ORDER BY created_at DESC
LIMIT :limit OFFSET :offset;
```

## Dynamic Filtering Pattern

### Building Dynamic WHERE Clauses

**Problem:** Different filters may or may not be provided.

**Solution:** Build query dynamically based on provided filters.

#### Pattern 1: Conditional WHERE (Application Logic)

```javascript
// Backend: Build query dynamically
function buildProductQuery(filters) {
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    // Add filters conditionally
    if (filters.category_id) {
        query += ` AND category_id = $${paramIndex}`;
        params.push(filters.category_id);
        paramIndex++;
    }
    
    if (filters.min_price) {
        query += ` AND price >= $${paramIndex}`;
        params.push(filters.min_price);
        paramIndex++;
    }
    
    if (filters.max_price) {
        query += ` AND price <= $${paramIndex}`;
        params.push(filters.max_price);
        paramIndex++;
    }
    
    if (filters.in_stock) {
        query += ` AND stock_quantity > 0`;
    }
    
    query += ' ORDER BY created_at DESC LIMIT $' + paramIndex + ' OFFSET $' + (paramIndex + 1);
    params.push(filters.limit || 20);
    params.push((filters.page - 1) * (filters.limit || 20));
    
    return { query, params };
}

// Usage
const { query, params } = buildProductQuery({
    category_id: 1,
    min_price: 50,
    max_price: 200,
    in_stock: true,
    page: 1,
    limit: 20
});
```

#### Pattern 2: COALESCE for Optional Filters

```sql
-- Use COALESCE to handle NULL (optional filters)
SELECT *
FROM products
WHERE 
    (:category_id IS NULL OR category_id = :category_id)
    AND (:min_price IS NULL OR price >= :min_price)
    AND (:max_price IS NULL OR price <= :max_price)
    AND (:in_stock IS NULL OR (in_stock = true AND stock_quantity > 0))
ORDER BY created_at DESC
LIMIT :limit OFFSET :offset;
```

**Usage:**
```javascript
// Pass NULL for filters not provided
await db.query(query, {
    category_id: filters.category_id || null,
    min_price: filters.min_price || null,
    max_price: filters.max_price || null,
    in_stock: filters.in_stock || null,
    limit: 20,
    offset: 0
});
```

## Text Search Patterns

### Pattern 1: LIKE/ILIKE (Simple Search)

```sql
-- Case-insensitive search
SELECT *
FROM products
WHERE 
    name ILIKE '%' || :search || '%'
    OR description ILIKE '%' || :search || '%'
ORDER BY created_at DESC
LIMIT :limit;
```

**Performance:** Can be slow on large tables. Use full-text search for better performance.

### Pattern 2: Full-Text Search (PostgreSQL)

```sql
-- Create full-text search index
ALTER TABLE products 
ADD COLUMN search_vector tsvector 
GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
) STORED;

CREATE INDEX idx_products_search ON products USING GIN(search_vector);

-- Search query
SELECT 
    id,
    name,
    description,
    ts_rank(search_vector, query) AS rank
FROM products, to_tsquery('english', :search) query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT :limit;
```

### Pattern 3: Multiple Search Fields

```sql
-- Search across multiple fields
SELECT *
FROM users
WHERE 
    email ILIKE '%' || :search || '%'
    OR name ILIKE '%' || :search || '%'
    OR phone ILIKE '%' || :search || '%'
ORDER BY 
    CASE 
        WHEN email ILIKE :search THEN 1
        WHEN name ILIKE :search THEN 2
        ELSE 3
    END,
    created_at DESC
LIMIT :limit;
```

## Advanced Filtering Patterns

### Pattern 1: Range Filters

```sql
-- Price range
SELECT *
FROM products
WHERE 
    price BETWEEN :min_price AND :max_price
    AND created_at BETWEEN :start_date AND :end_date
ORDER BY price ASC
LIMIT :limit;
```

### Pattern 2: IN Clause (Multiple Values)

```sql
-- Filter by multiple categories
SELECT *
FROM products
WHERE category_id = ANY(:category_ids)  -- PostgreSQL
-- OR
WHERE category_id IN (:category_ids)  -- Standard SQL
ORDER BY created_at DESC
LIMIT :limit;
```

**Implementation:**
```javascript
// Build IN clause dynamically
const placeholders = categoryIds.map((_, i) => `$${i + 1}`).join(',');
const query = `SELECT * FROM products WHERE category_id IN (${placeholders})`;
await db.query(query, categoryIds);
```

### Pattern 3: Boolean Filters

```sql
-- Multiple boolean conditions
SELECT *
FROM products
WHERE 
    (:is_featured IS NULL OR is_featured = :is_featured)
    AND (:in_stock IS NULL OR stock_quantity > 0)
    AND (:on_sale IS NULL OR discount_percent > 0)
ORDER BY created_at DESC
LIMIT :limit;
```

### Pattern 4: Sorting Options

```sql
-- Dynamic sorting
SELECT *
FROM products
WHERE category_id = :category_id
ORDER BY 
    CASE :sort_by
        WHEN 'price_asc' THEN price
        WHEN 'price_desc' THEN -price
        WHEN 'name_asc' THEN name
        WHEN 'name_desc' THEN -name
        ELSE created_at
    END
LIMIT :limit OFFSET :offset;
```

**Better Approach (PostgreSQL):**
```sql
-- Use NULLS LAST for proper sorting
SELECT *
FROM products
WHERE category_id = :category_id
ORDER BY 
    CASE :sort_by
        WHEN 'price_asc' THEN price
    END ASC NULLS LAST,
    CASE :sort_by
        WHEN 'price_desc' THEN price
    END DESC NULLS LAST,
    created_at DESC
LIMIT :limit OFFSET :offset;
```

## Complex Search Patterns

### Pattern 1: Multi-Criteria Search

```sql
-- Search with multiple criteria
SELECT 
    p.id,
    p.name,
    p.price,
    c.name AS category_name,
    -- Relevance score
    CASE
        WHEN p.name ILIKE :exact_search THEN 10
        WHEN p.name ILIKE '%' || :search || '%' THEN 5
        WHEN p.description ILIKE '%' || :search || '%' THEN 2
        ELSE 0
    END AS relevance
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE 
    (
        p.name ILIKE '%' || :search || '%'
        OR p.description ILIKE '%' || :search || '%'
        OR c.name ILIKE '%' || :search || '%'
    )
    AND (:category_id IS NULL OR p.category_id = :category_id)
    AND (:min_price IS NULL OR p.price >= :min_price)
    AND (:max_price IS NULL OR p.price <= :max_price)
ORDER BY relevance DESC, p.created_at DESC
LIMIT :limit;
```

### Pattern 2: Faceted Search

```sql
-- Get products with facet counts
WITH filtered_products AS (
    SELECT *
    FROM products
    WHERE 
        (:category_id IS NULL OR category_id = :category_id)
        AND (:min_price IS NULL OR price >= :min_price)
        AND (:max_price IS NULL OR price <= :max_price)
)
SELECT 
    fp.*,
    -- Facet: Available categories
    (SELECT json_agg(DISTINCT category_id) FROM filtered_products) AS available_categories,
    -- Facet: Price range
    (SELECT MIN(price) FROM filtered_products) AS min_price,
    (SELECT MAX(price) FROM filtered_products) AS max_price
FROM filtered_products fp
ORDER BY fp.created_at DESC
LIMIT :limit;
```

## Performance Optimization

### 1. Index Filter Columns

```sql
-- Create indexes on frequently filtered columns
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_status ON products(status) WHERE status = 'active';
CREATE INDEX idx_products_stock ON products(stock_quantity) WHERE stock_quantity > 0;

-- Composite index for common filter combinations
CREATE INDEX idx_products_category_price ON products(category_id, price);
```

### 2. Partial Indexes

```sql
-- Index only active products
CREATE INDEX idx_products_active ON products(category_id, price) 
WHERE status = 'active';

-- Query uses index
SELECT * FROM products 
WHERE status = 'active' 
  AND category_id = 1 
  AND price BETWEEN 50 AND 100;
```

### 3. Covering Indexes

```sql
-- Index includes all needed columns
CREATE INDEX idx_products_covering ON products(category_id, price) 
INCLUDE (name, stock_quantity);

-- Query uses index only scan
SELECT category_id, price, name, stock_quantity
FROM products
WHERE category_id = 1 AND price BETWEEN 50 AND 100;
```

## API Implementation Examples

### RESTful Filtering API

```javascript
// GET /api/products?category_id=1&min_price=50&max_price=200&search=laptop&page=1&limit=20

async function getProducts(filters) {
    const conditions = [];
    const params = [];
    let paramIndex = 1;
    
    // Category filter
    if (filters.category_id) {
        conditions.push(`category_id = $${paramIndex}`);
        params.push(filters.category_id);
        paramIndex++;
    }
    
    // Price range
    if (filters.min_price) {
        conditions.push(`price >= $${paramIndex}`);
        params.push(filters.min_price);
        paramIndex++;
    }
    
    if (filters.max_price) {
        conditions.push(`price <= $${paramIndex}`);
        params.push(filters.max_price);
        paramIndex++;
    }
    
    // Search
    if (filters.search) {
        conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
        params.push(`%${filters.search}%`);
        paramIndex++;
    }
    
    // Stock filter
    if (filters.in_stock) {
        conditions.push(`stock_quantity > 0`);
    }
    
    // Status
    conditions.push(`status = $${paramIndex}`);
    params.push('active');
    paramIndex++;
    
    // Build query
    const whereClause = conditions.length > 0 
        ? 'WHERE ' + conditions.join(' AND ')
        : '';
    
    const query = `
        SELECT *
        FROM products
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(filters.limit || 20);
    params.push((filters.page - 1) * (filters.limit || 20));
    
    return await db.query(query, params);
}
```

## Common Patterns

### Pattern 1: Search with Autocomplete

```sql
-- Autocomplete: Return matching products
SELECT 
    id,
    name,
    category_id
FROM products
WHERE name ILIKE :prefix || '%'
ORDER BY name
LIMIT 10;
```

### Pattern 2: Filter with Count

```sql
-- Get filtered products with total count
SELECT 
    p.*,
    (SELECT COUNT(*) FROM products WHERE category_id = p.category_id) AS category_count
FROM products p
WHERE category_id = :category_id
ORDER BY created_at DESC
LIMIT :limit;
```

### Pattern 3: Multi-Select Filters

```sql
-- Filter by multiple values
SELECT *
FROM products
WHERE 
    category_id = ANY(:category_ids)
    AND status = ANY(:statuses)
    AND price BETWEEN :min_price AND :max_price
ORDER BY created_at DESC
LIMIT :limit;
```

## Best Practices

1. **Index Filter Columns**: For performance
2. **Validate Input**: Check filter values
3. **Limit Results**: Always use LIMIT
4. **Use Parameterized Queries**: Prevent SQL injection
5. **Cache Common Queries**: For frequently accessed filters
6. **Document Filters**: API documentation for available filters

## Summary

**Search + Filtering Essentials:**

1. **Dynamic WHERE**: Build conditions based on provided filters
2. **Text Search**: LIKE/ILIKE or full-text search
3. **Range Filters**: BETWEEN for dates, prices
4. **Multiple Values**: IN or ANY for lists
5. **Performance**: Index filter columns, use partial indexes
6. **API Design**: Clear filter parameters, consistent responses

**Key Takeaway:**
Building flexible search and filtering requires dynamic query construction. Always use parameterized queries, index filter columns, and validate input. Balance flexibility with performance.

**Common Patterns:**
- Dynamic WHERE clauses
- Text search (LIKE or full-text)
- Range filters (BETWEEN)
- Multi-select (IN/ANY)
- Sorting options

**Next Steps:**
- Learn [Pagination Queries](pagination_queries.md) to combine with filtering
- Study [Performance Optimization](../10_performance_optimization/) for query tuning
- Master [Indexes](../08_indexes/what_is_index.md) for filter performance

