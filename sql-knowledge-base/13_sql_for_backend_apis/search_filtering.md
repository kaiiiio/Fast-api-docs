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

---

## 🎯 Interview Questions: SQL

### Q1: Explain how to implement efficient search and filtering in SQL, including different search strategies (LIKE, full-text search), dynamic WHERE clause construction, and performance optimization. Provide examples showing how to build flexible filtering systems for backend APIs.

**Answer:**

**Search and Filtering Overview:**

Implementing efficient search and filtering is crucial for backend APIs. It requires understanding different search methods, building dynamic queries, and optimizing for performance. The approach depends on search complexity, data volume, and performance requirements.

**Search Strategies:**

**1. LIKE/ILIKE Pattern Matching:**

**Basic LIKE:**
```sql
-- Case-sensitive pattern matching
SELECT * FROM products 
WHERE name LIKE '%laptop%';
-- Matches: "Laptop", "Gaming Laptop"
-- Does NOT match: "LAPTOP" (case-sensitive)
```

**ILIKE (PostgreSQL - Case-Insensitive):**
```sql
-- Case-insensitive pattern matching
SELECT * FROM products 
WHERE name ILIKE '%laptop%';
-- Matches: "Laptop", "LAPTOP", "laptop", "Gaming Laptop"
```

**Performance Characteristics:**

**Leading Wildcard (Slow):**
```sql
-- ❌ Slow: Leading wildcard prevents index usage
SELECT * FROM products 
WHERE name LIKE '%laptop%';
-- Execution: Sequential scan
-- Time: ~5,000ms for 1 million rows
-- Cannot use index efficiently
```

**Trailing Wildcard (Faster):**
```sql
-- ✅ Faster: Trailing wildcard can use index
SELECT * FROM products 
WHERE name LIKE 'laptop%';
-- Execution: Index scan (prefix search)
-- Time: ~50ms
-- Can use B-tree index for prefix matching
```

**2. Full-Text Search:**

**PostgreSQL Full-Text Search Setup:**
```sql
-- Add search vector column
ALTER TABLE products 
ADD COLUMN search_vector tsvector 
GENERATED ALWAYS AS (
    to_tsvector('english', 
        COALESCE(name, '') || ' ' || 
        COALESCE(description, '')
    )
) STORED;

-- Create GIN index for full-text search
CREATE INDEX idx_products_search_vector 
ON products USING GIN(search_vector);
```

**Full-Text Search Query:**
```sql
-- Search with relevance ranking
SELECT 
    id,
    name,
    description,
    ts_rank(search_vector, query) AS relevance
FROM products, to_tsquery('english', 'laptop & gaming') query
WHERE search_vector @@ query
ORDER BY relevance DESC
LIMIT 20;
```

**Benefits:**
- **Fast**: Uses GIN index (very efficient)
- **Relevance Ranking**: Results sorted by relevance
- **Word Variations**: Handles plurals, synonyms
- **Boolean Operators**: AND, OR, NOT support
- **Better than LIKE**: For large datasets and complex searches

**3. Dynamic WHERE Clause Construction:**

**Building Flexible Filters:**

**JavaScript Example:**
```javascript
function buildProductQuery(filters) {
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
    if (filters.min_price !== undefined) {
        conditions.push(`price >= $${paramIndex}`);
        params.push(filters.min_price);
        paramIndex++;
    }
    
    if (filters.max_price !== undefined) {
        conditions.push(`price <= $${paramIndex}`);
        params.push(filters.max_price);
        paramIndex++;
    }
    
    // Search (text)
    if (filters.search) {
        conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
        params.push(`%${filters.search}%`);
        paramIndex++;
    }
    
    // Status filter
    if (filters.status) {
        conditions.push(`status = $${paramIndex}`);
        params.push(filters.status);
        paramIndex++;
    }
    
    // In stock filter
    if (filters.in_stock === true) {
        conditions.push(`stock_quantity > 0`);
    }
    
    // Build WHERE clause
    const whereClause = conditions.length > 0 
        ? 'WHERE ' + conditions.join(' AND ')
        : '';
    
    // Build ORDER BY
    const orderBy = getOrderByClause(filters.sort_by);
    
    // Build complete query
    const query = `
        SELECT 
            id,
            name,
            price,
            stock_quantity,
            category_id
        FROM products
        ${whereClause}
        ${orderBy}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(filters.limit || 20);
    params.push((filters.page - 1) * (filters.limit || 20));
    
    return { query, params };
}

function getOrderByClause(sortBy) {
    const sortMap = {
        'price_asc': 'price ASC',
        'price_desc': 'price DESC',
        'name_asc': 'name ASC',
        'name_desc': 'name DESC',
        'newest': 'created_at DESC',
        'oldest': 'created_at ASC'
    };
    
    return `ORDER BY ${sortMap[sortBy] || 'created_at DESC'}`;
}
```

**API Usage:**
```javascript
// GET /api/products?category_id=1&min_price=50&max_price=200&search=laptop&page=1&limit=20&sort_by=price_asc

const filters = {
    category_id: req.query.category_id,
    min_price: req.query.min_price,
    max_price: req.query.max_price,
    search: req.query.search,
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
    sort_by: req.query.sort_by || 'newest'
};

const { query, params } = buildProductQuery(filters);
const products = await db.query(query, params);
```

**Performance Optimization:**

**1. Index Filter Columns:**

**Single-Column Indexes:**
```sql
-- Index frequently filtered columns
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_stock ON products(stock_quantity);
```

**Composite Indexes:**
```sql
-- Index common filter combinations
CREATE INDEX idx_products_category_price 
ON products(category_id, price);

-- Query uses composite index
SELECT * FROM products
WHERE category_id = 1 AND price BETWEEN 50 AND 200;
-- Efficient: Single index lookup
```

**2. Partial Indexes:**

**Index Only Active Products:**
```sql
-- Partial index: Only index active products
CREATE INDEX idx_products_active 
ON products(category_id, price) 
WHERE status = 'active';

-- Query uses partial index
SELECT * FROM products
WHERE status = 'active' 
  AND category_id = 1 
  AND price BETWEEN 50 AND 200;
-- Smaller index, faster queries
```

**3. Covering Indexes:**

**Index-Only Scans:**
```sql
-- Covering index: Include all selected columns
CREATE INDEX idx_products_covering 
ON products(category_id, price) 
INCLUDE (id, name, stock_quantity);

-- Query uses index-only scan
SELECT id, name, price, stock_quantity
FROM products
WHERE category_id = 1 AND price BETWEEN 50 AND 200;
-- No table access needed!
```

**4. Full-Text Search Indexes:**

**GIN Index for Full-Text:**
```sql
-- GIN index for full-text search
CREATE INDEX idx_products_search 
ON products USING GIN(search_vector);

-- Fast full-text search
SELECT * FROM products
WHERE search_vector @@ to_tsquery('english', 'laptop');
-- Very fast with GIN index
```

**Advanced Filtering Patterns:**

**1. Multi-Select Filters:**

**IN Clause:**
```sql
-- Filter by multiple categories
SELECT * FROM products
WHERE category_id = ANY(:category_ids);  -- PostgreSQL
-- OR
WHERE category_id IN (:category_ids);    -- Standard SQL
```

**Implementation:**
```javascript
// Build IN clause dynamically
if (filters.category_ids && filters.category_ids.length > 0) {
    const placeholders = filters.category_ids
        .map((_, i) => `$${paramIndex + i}`)
        .join(',');
    conditions.push(`category_id IN (${placeholders})`);
    params.push(...filters.category_ids);
    paramIndex += filters.category_ids.length;
}
```

**2. Optional Filters:**

**NULL Handling:**
```sql
-- Optional filters: Only apply if value provided
SELECT * FROM products
WHERE 
    (:category_id IS NULL OR category_id = :category_id)
    AND (:min_price IS NULL OR price >= :min_price)
    AND (:max_price IS NULL OR price <= :max_price)
    AND (:search IS NULL OR name ILIKE '%' || :search || '%');
```

**3. Faceted Search:**

**Get Available Filter Options:**
```sql
-- Get available categories for current filters
WITH filtered_products AS (
    SELECT * FROM products
    WHERE 
        (:min_price IS NULL OR price >= :min_price)
        AND (:max_price IS NULL OR price <= :max_price)
)
SELECT 
    category_id,
    COUNT(*) AS product_count
FROM filtered_products
GROUP BY category_id;
-- Shows available categories for current price range
```

**4. Relevance-Based Search:**

**Scoring Results:**
```sql
-- Search with relevance scoring
SELECT 
    id,
    name,
    price,
    CASE
        WHEN name ILIKE :exact_search THEN 10
        WHEN name ILIKE '%' || :search || '%' THEN 5
        WHEN description ILIKE '%' || :search || '%' THEN 2
        ELSE 0
    END AS relevance_score
FROM products
WHERE 
    name ILIKE '%' || :search || '%'
    OR description ILIKE '%' || :search || '%'
ORDER BY relevance_score DESC, created_at DESC
LIMIT 20;
```

**Performance Best Practices:**

**1. Always Use Parameterized Queries:**
```javascript
// ✅ Safe: Parameterized
const query = 'SELECT * FROM products WHERE name ILIKE $1';
await db.query(query, [`%${search}%`]);

// ❌ Dangerous: String concatenation
const query = `SELECT * FROM products WHERE name ILIKE '%${search}%'`;
// SQL injection risk!
```

**2. Index Frequently Filtered Columns:**
```sql
-- Analyze query patterns
-- Index columns used in WHERE clauses
CREATE INDEX idx_products_category_price_status 
ON products(category_id, price, status);
```

**3. Limit Result Sets:**
```sql
-- Always use LIMIT
SELECT * FROM products
WHERE category_id = 1
LIMIT 20;
-- Prevents returning too many rows
```

**4. Use EXPLAIN ANALYZE:**
```sql
-- Analyze query performance
EXPLAIN ANALYZE
SELECT * FROM products
WHERE category_id = 1 AND price BETWEEN 50 AND 200;
-- Verify indexes are used
```

**System Design Consideration**: Efficient search and filtering requires:
1. **Index Strategy**: Matching indexes to filter patterns
2. **Query Building**: Dynamic WHERE clause construction
3. **Search Method**: Choosing appropriate search technique
4. **Performance**: Optimizing for speed and scalability

Efficient search and filtering requires proper indexing, dynamic query construction, and choosing the right search method (LIKE for simple, full-text for complex). Always use parameterized queries, index filter columns, and optimize based on your specific use case and query patterns.

---

### Q2: Explain how to implement faceted search (filtering with available options) and multi-criteria filtering in SQL. Provide examples showing how to build queries that return both filtered results and available filter options, and discuss performance considerations.

**Answer:**

**Faceted Search Definition:**

Faceted search (also called guided navigation) allows users to filter results by multiple criteria while showing available filter options based on current selections. It's common in e-commerce, where users can filter by category, price range, brand, etc., and see how many products match each filter option.

**How Faceted Search Works:**

**Process:**
1. User applies filters (e.g., category, price range)
2. System returns filtered products
3. System also returns available filter options for remaining results
4. User can refine filters further

**Example: E-commerce Product Search**

**Initial Query:**
```sql
-- Get products with current filters
SELECT 
    id,
    name,
    price,
    category_id,
    brand_id,
    stock_quantity
FROM products
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 20;
```

**With Filters:**
```sql
-- Get filtered products
SELECT 
    id,
    name,
    price,
    category_id,
    brand_id
FROM products
WHERE status = 'active'
  AND category_id = 1
  AND price BETWEEN 50 AND 200
ORDER BY created_at DESC
LIMIT 20;
```

**Get Available Filter Options:**

**Available Categories:**
```sql
-- Get categories available for current filters
SELECT 
    c.id,
    c.name,
    COUNT(p.id) AS product_count
FROM categories c
JOIN products p ON c.id = p.category_id
WHERE p.status = 'active'
  AND p.price BETWEEN 50 AND 200  -- Current price filter
GROUP BY c.id, c.name
ORDER BY product_count DESC;
```

**Available Price Ranges:**
```sql
-- Get price range for current filters
SELECT 
    MIN(price) AS min_price,
    MAX(price) AS max_price,
    AVG(price) AS avg_price
FROM products
WHERE status = 'active'
  AND category_id = 1;  -- Current category filter
```

**Complete Faceted Search Implementation:**

**Single Query Approach:**
```sql
WITH filtered_products AS (
    SELECT *
    FROM products
    WHERE status = 'active'
      AND (:category_id IS NULL OR category_id = :category_id)
      AND (:min_price IS NULL OR price >= :min_price)
      AND (:max_price IS NULL OR price <= :max_price)
      AND (:brand_id IS NULL OR brand_id = :brand_id)
),
product_results AS (
    SELECT 
        id,
        name,
        price,
        category_id,
        brand_id
    FROM filtered_products
    ORDER BY created_at DESC
    LIMIT :limit OFFSET :offset
),
facet_categories AS (
    SELECT 
        c.id,
        c.name,
        COUNT(fp.id) AS product_count
    FROM categories c
    LEFT JOIN filtered_products fp ON c.id = fp.category_id
    GROUP BY c.id, c.name
    HAVING COUNT(fp.id) > 0
    ORDER BY product_count DESC
),
facet_brands AS (
    SELECT 
        b.id,
        b.name,
        COUNT(fp.id) AS product_count
    FROM brands b
    LEFT JOIN filtered_products fp ON b.id = fp.brand_id
    GROUP BY b.id, b.name
    HAVING COUNT(fp.id) > 0
    ORDER BY product_count DESC
),
facet_price_range AS (
    SELECT 
        MIN(price) AS min_price,
        MAX(price) AS max_price
    FROM filtered_products
)
SELECT 
    json_build_object(
        'products', (SELECT json_agg(row_to_json(p)) FROM product_results p),
        'facets', json_build_object(
            'categories', (SELECT json_agg(row_to_json(fc)) FROM facet_categories fc),
            'brands', (SELECT json_agg(row_to_json(fb)) FROM facet_brands fb),
            'price_range', (SELECT row_to_json(fpr) FROM facet_price_range fpr),
            'total_count', (SELECT COUNT(*) FROM filtered_products)
        )
    ) AS result;
```

**Separate Queries Approach (More Efficient):**

**Query 1: Get Products**
```sql
SELECT 
    id,
    name,
    price,
    category_id,
    brand_id
FROM products
WHERE status = 'active'
  AND (:category_id IS NULL OR category_id = :category_id)
  AND (:min_price IS NULL OR price >= :min_price)
  AND (:max_price IS NULL OR price <= :max_price)
  AND (:brand_id IS NULL OR brand_id = :brand_id)
ORDER BY created_at DESC
LIMIT :limit OFFSET :offset;
```

**Query 2: Get Facets**
```sql
-- Get available filter options
WITH filtered_products AS (
    SELECT *
    FROM products
    WHERE status = 'active'
      AND (:category_id IS NULL OR category_id = :category_id)
      AND (:min_price IS NULL OR price >= :min_price)
      AND (:max_price IS NULL OR price <= :max_price)
      AND (:brand_id IS NULL OR brand_id = :brand_id)
)
SELECT 
    -- Categories
    (SELECT json_agg(json_build_object('id', c.id, 'name', c.name, 'count', COUNT(fp.id)))
     FROM categories c
     LEFT JOIN filtered_products fp ON c.id = fp.category_id
     GROUP BY c.id, c.name
     HAVING COUNT(fp.id) > 0) AS categories,
    
    -- Brands
    (SELECT json_agg(json_build_object('id', b.id, 'name', b.name, 'count', COUNT(fp.id)))
     FROM brands b
     LEFT JOIN filtered_products fp ON b.id = fp.brand_id
     GROUP BY b.id, b.name
     HAVING COUNT(fp.id) > 0) AS brands,
    
    -- Price range
    (SELECT json_build_object('min', MIN(price), 'max', MAX(price))
     FROM filtered_products) AS price_range,
    
    -- Total count
    (SELECT COUNT(*) FROM filtered_products) AS total_count;
```

**Performance Optimization:**

**1. Cache Facets:**
```javascript
// Cache facets for common filter combinations
const cacheKey = `facets:${JSON.stringify(filters)}`;
const cached = await redis.get(cacheKey);
if (cached) {
    return JSON.parse(cached);
}

// Calculate facets
const facets = await calculateFacets(filters);

// Cache for 5 minutes
await redis.setex(cacheKey, 300, JSON.stringify(facets));
```

**2. Materialized Views:**
```sql
-- Pre-compute common facets
CREATE MATERIALIZED VIEW product_facets AS
SELECT 
    category_id,
    brand_id,
    price_range,
    COUNT(*) AS product_count
FROM products
WHERE status = 'active'
GROUP BY category_id, brand_id, price_range;

-- Refresh periodically
REFRESH MATERIALIZED VIEW product_facets;
```

**3. Index Strategy:**
```sql
-- Index filter columns
CREATE INDEX idx_products_category_price_brand 
ON products(category_id, price, brand_id) 
WHERE status = 'active';

-- Fast filtering and faceting
```

**System Design Consideration**: Faceted search requires:
1. **Efficient Filtering**: Fast product queries
2. **Facet Calculation**: Computing available options
3. **Caching**: Reducing computation overhead
4. **Indexing**: Supporting filter combinations

Faceted search enhances user experience by showing available filter options. Implementation requires efficient filtering queries and facet calculation. Caching and materialized views can significantly improve performance for frequently accessed filter combinations.

