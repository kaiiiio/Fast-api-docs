# JSONB and Full Text Search: PostgreSQL Advanced Features in Express.js

PostgreSQL's JSONB and full-text search capabilities combine structured relational data with flexible JSON storage and fast text search. This guide covers using these features in Express.js applications.

## What is JSONB?

**JSONB** (Binary JSON) stores JSON data in binary format, enabling efficient querying and indexing. Unlike regular JSON (text), JSONB is optimized for performance.

### JSON vs JSONB

```sql
-- JSON: Stored as text
-- ❌ Slow queries, no indexing, parses every time

-- JSONB: Stored in binary format
-- ✅ Fast queries, supports indexing (GIN), efficient search
```

## Using JSONB with Sequelize

### Define JSONB Column

```javascript
const { Sequelize, DataTypes } = require('sequelize');

const Product = sequelize.define('Product', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    // JSONB column for flexible metadata
    metadata: {
        type: DataTypes.JSONB,
        allowNull: true
    }
});
```

### Storing JSONB Data

```javascript
// Create product with JSONB metadata
const product = await Product.create({
    name: 'Laptop',
    price: 999.99,
    metadata: {
        color: 'silver',
        brand: 'Dell',
        specifications: {
            ram: '16GB',
            storage: '512GB SSD',
            processor: 'Intel i7'
        },
        tags: ['electronics', 'computers', 'laptops']
    }
});
```

## Querying JSONB

### Access JSONB Fields

```javascript
// Query by JSONB field
const products = await Product.findAll({
    where: sequelize.where(
        sequelize.cast(sequelize.col('metadata->>\'brand\''), 'TEXT'),
        'Dell'
    )
});

// Or using Sequelize JSONB operators
const products = await Product.findAll({
    where: {
        'metadata.brand': 'Dell'  // Dot notation
    }
});
```

### JSONB Operators

```javascript
// Check if key exists
const products = await sequelize.query(`
    SELECT * FROM products 
    WHERE metadata ? 'brand'
`, { type: sequelize.QueryTypes.SELECT });

// Check if key-value pair exists
const products = await sequelize.query(`
    SELECT * FROM products 
    WHERE metadata @> '{"brand": "Dell"}'::jsonb
`, { type: sequelize.QueryTypes.SELECT });

// Check if any key in array exists
const products = await sequelize.query(`
    SELECT * FROM products 
    WHERE metadata ?| array['brand', 'color']
`, { type: sequelize.QueryTypes.SELECT });
```

## Full-Text Search

### Creating Full-Text Search Index

```sql
-- Create full-text search index
CREATE INDEX idx_products_content_search 
ON products USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Or on JSONB field
CREATE INDEX idx_products_metadata_search 
ON products USING gin(to_tsvector('english', metadata->>'description'));
```

### Full-Text Search Queries

```javascript
// Full-text search query
const products = await sequelize.query(`
    SELECT *, 
           ts_rank(to_tsvector('english', name || ' ' || COALESCE(description, '')), 
                   plainto_tsquery('english', :search)) AS rank
    FROM products
    WHERE to_tsvector('english', name || ' ' || COALESCE(description, '')) 
          @@ plainto_tsquery('english', :search)
    ORDER BY rank DESC
`, {
    replacements: { search: 'laptop computer' },
    type: sequelize.QueryTypes.SELECT
});
```

## Real-World Examples

### Example 1: Product Catalog with JSONB

```javascript
// Product model with JSONB metadata
const Product = sequelize.define('Product', {
    name: DataTypes.STRING,
    price: DataTypes.DECIMAL(10, 2),
    metadata: DataTypes.JSONB
});

// Create product with flexible metadata
app.post('/products', async (req, res) => {
    const product = await Product.create({
        name: req.body.name,
        price: req.body.price,
        metadata: {
            category: req.body.category,
            attributes: req.body.attributes,  // Flexible attributes
            specifications: req.body.specifications,
            tags: req.body.tags
        }
    });
    
    res.status(201).json(product);
});

// Search products by metadata
app.get('/products/search', async (req, res) => {
    const { brand, color, minPrice, maxPrice } = req.query;
    
    const whereClause = {};
    
    if (brand) {
        whereClause['metadata.brand'] = brand;
    }
    
    if (color) {
        whereClause['metadata.color'] = color;
    }
    
    if (minPrice || maxPrice) {
        whereClause.price = {};
        if (minPrice) whereClause.price[Sequelize.Op.gte] = minPrice;
        if (maxPrice) whereClause.price[Sequelize.Op.lte] = maxPrice;
    }
    
    const products = await Product.findAll({ where: whereClause });
    res.json(products);
});
```

### Example 2: User Preferences in JSONB

```javascript
// User model with JSONB preferences
const User = sequelize.define('User', {
    email: DataTypes.STRING,
    name: DataTypes.STRING,
    preferences: {
        type: DataTypes.JSONB,
        defaultValue: {}
    }
});

// Update user preferences
app.put('/users/:id/preferences', async (req, res) => {
    const user = await User.findByPk(req.params.id);
    
    // Merge preferences
    user.preferences = {
        ...user.preferences,
        ...req.body
    };
    
    await user.save();
    res.json(user);
});

// Query users by preferences
app.get('/users', async (req, res) => {
    const { theme, language } = req.query;
    
    const whereClause = {};
    
    if (theme) {
        whereClause['preferences.theme'] = theme;
    }
    
    if (language) {
        whereClause['preferences.language'] = language;
    }
    
    const users = await User.findAll({ where: whereClause });
    res.json(users);
});
```

### Example 3: Full-Text Search for Articles

```javascript
// Article model
const Article = sequelize.define('Article', {
    title: DataTypes.STRING,
    content: DataTypes.TEXT,
    tags: DataTypes.ARRAY(DataTypes.STRING)
});

// Full-text search endpoint
app.get('/articles/search', async (req, res) => {
    const { q } = req.query;
    
    if (!q) {
        return res.status(400).json({ error: 'Search query required' });
    }
    
    const articles = await sequelize.query(`
        SELECT 
            id,
            title,
            content,
            ts_rank(
                to_tsvector('english', title || ' ' || COALESCE(content, '')),
                plainto_tsquery('english', :query)
            ) AS rank
        FROM articles
        WHERE to_tsvector('english', title || ' ' || COALESCE(content, '')) 
              @@ plainto_tsquery('english', :query)
        ORDER BY rank DESC
        LIMIT 20
    `, {
        replacements: { query: q },
        type: sequelize.QueryTypes.SELECT
    });
    
    res.json(articles);
});
```

## JSONB Indexing

### GIN Index for JSONB

```sql
-- Create GIN index on JSONB column
CREATE INDEX idx_products_metadata_gin 
ON products USING gin(metadata);

-- Enables fast queries on JSONB fields
```

### Partial Indexes

```sql
-- Index only products with specific metadata
CREATE INDEX idx_products_brand_gin 
ON products USING gin(metadata) 
WHERE metadata ? 'brand';
```

## Best Practices

1. **Use JSONB for Flexible Data**: When schema varies
2. **Index JSONB Fields**: Create GIN indexes for frequently queried fields
3. **Full-Text Search**: Use tsvector for text search
4. **Validate JSONB**: Validate structure in application layer
5. **Consider Performance**: JSONB queries can be slower than regular columns

## Summary

**JSONB and Full-Text Search:**

1. **JSONB**: Binary JSON for flexible, queryable data
2. **Full-Text Search**: tsvector/tsquery for text search
3. **Indexing**: GIN indexes for JSONB and full-text search
4. **Use Cases**: Flexible metadata, user preferences, search
5. **Best Practice**: Index frequently queried fields, validate structure

**Key Takeaway:**
JSONB provides flexible JSON storage with efficient querying and indexing. Use JSONB for data with varying structure (metadata, preferences). Full-text search enables semantic text search using tsvector and tsquery. Create GIN indexes on JSONB columns and full-text search fields for performance.

**JSONB Use Cases:**
- Product metadata
- User preferences
- Configuration data
- Flexible schemas

**Next Steps:**
- Learn [Array and Enum Types](array_and_enum_types.md) for PostgreSQL types
- Study [pgvector for Embeddings](pgvector_for_embeddings.md) for vector search
- Master [Connection URI and SSL](connection_uri_and_ssl_config.md) for production

---

## 🎯 Interview Questions: JSONB & Full-Text Search

### Q1: Explain JSONB vs JSON in PostgreSQL. When would you use JSONB in an Express.js application?

**Answer:**

**JSON vs JSONB:**

```sql
-- JSON: Stored as text
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    metadata JSON  -- Stored as text, parsed on every query
);

-- JSONB: Stored in binary format
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    metadata JSONB  -- Stored in binary, indexed, fast queries
);
```

**Key Differences:**

| Aspect | JSON | JSONB |
|--------|------|-------|
| **Storage** | Text | Binary |
| **Indexing** | ❌ No | ✅ GIN index |
| **Query Speed** | Slow (parses each time) | Fast (pre-parsed) |
| **Size** | Smaller | Slightly larger |
| **Order** | Preserves key order | Doesn't preserve order |

**JSONB Use Cases:**

```javascript
// 1. Flexible metadata
const product = await Product.create({
    name: 'Laptop',
    metadata: {
        specs: { ram: '16GB', storage: '512GB' },
        reviews: [{ rating: 5, comment: 'Great!' }],
        // Structure can vary per product
    }
});

// 2. User preferences
const user = await User.create({
    email: 'user@example.com',
    preferences: {
        theme: 'dark',
        notifications: { email: true, sms: false },
        language: 'en'
    }
});

// 3. Configuration data
const config = await Config.create({
    key: 'app_settings',
    value: {
        features: { new_ui: true, beta_features: false },
        limits: { max_upload: 100, max_users: 1000 }
    }
});
```

**Querying JSONB:**

```sql
-- Query nested fields
SELECT * FROM products 
WHERE metadata->>'brand' = 'Apple';

-- Query arrays
SELECT * FROM products 
WHERE metadata->'tags' @> '["electronics"]'::jsonb;

-- Full-text search on JSONB
SELECT * FROM products 
WHERE to_tsvector('english', metadata::text) @@ to_tsquery('laptop');
```

---

### Q2: How do you implement full-text search in PostgreSQL for an Express.js application?

**Answer:**

**Full-Text Search Setup:**

```sql
-- Create table with text search
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    content TEXT,
    search_vector tsvector  -- Generated column for search
);

-- Create index
CREATE INDEX idx_articles_search ON articles USING GIN(search_vector);

-- Generate search vector
CREATE TRIGGER articles_search_vector_update 
BEFORE INSERT OR UPDATE ON articles
FOR EACH ROW EXECUTE FUNCTION 
tsvector_update_trigger(search_vector, 'pg_catalog.english', title, content);
```

**Express.js Implementation:**

```javascript
// Search endpoint
app.get('/articles/search', async (req, res) => {
    const query = req.query.q;
    
    const articles = await db.query(`
        SELECT 
            id,
            title,
            content,
            ts_rank(search_vector, query) AS rank
        FROM articles, to_tsquery('english', $1) AS query
        WHERE search_vector @@ query
        ORDER BY rank DESC
        LIMIT 20
    `, [query]);
    
    res.json(articles.rows);
});

// Advanced: Phrase search, ranking
app.get('/articles/search', async (req, res) => {
    const query = req.query.q;
    const searchQuery = query.split(' ').join(' & ');  // AND search
    
    const articles = await db.query(`
        SELECT 
            id,
            title,
            content,
            ts_rank_cd(search_vector, to_tsquery('english', $1)) AS rank,
            ts_headline('english', content, to_tsquery('english', $1)) AS snippet
        FROM articles
        WHERE search_vector @@ to_tsquery('english', $1)
        ORDER BY rank DESC
        LIMIT 20
    `, [searchQuery]);
    
    res.json(articles.rows);
});
```

**Benefits:**
- ✅ Fast text search (indexed)
- ✅ Ranking by relevance
- ✅ Highlighting matches
- ✅ Language-aware (stemming, stop words)

---

## Summary

These interview questions cover:
- ✅ JSONB vs JSON differences and use cases
- ✅ Full-text search implementation
- ✅ Querying JSONB data
- ✅ Performance optimization

Master these for senior-level interviews focusing on PostgreSQL advanced features.

