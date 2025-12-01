# Data Modeling Principles: Designing Effective Database Schemas

Data modeling is the process of designing database schemas to efficiently store and retrieve data. This guide covers principles for designing effective database schemas in Express.js applications.

## Core Principles

### 1. Normalization

**Normalization** reduces data redundancy by organizing data into related tables.

```javascript
// ❌ Bad: Denormalized (redundant data)
const orderSchema = new mongoose.Schema({
    user_name: String,      // Redundant: user name stored in every order
    user_email: String,     // Redundant: user email stored in every order
    product_name: String,   // Redundant: product name stored in every order
    product_price: Number,  // Redundant: product price stored in every order
    quantity: Number,
    total: Number
});

// ✅ Good: Normalized (references)
const orderSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    items: [{
        product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        quantity: Number,
        price: Number  // Snapshot price at time of order
    }],
    total: Number
});
```

**Explanation:**
Normalization reduces redundancy and ensures data consistency. User and product information is stored once and referenced.

### 2. Denormalization (When Appropriate)

**Denormalization** adds redundancy for performance when needed.

```javascript
// Denormalize for read performance
const postSchema = new mongoose.Schema({
    title: String,
    content: String,
    author_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Denormalized: Store author name for fast reads
    author_name: String,  // Denormalized field
    likes_count: Number,  // Denormalized: Count for fast queries
    comments_count: Number
});
```

**Explanation:**
Denormalize when read performance is critical and data doesn't change frequently.

### 3. Appropriate Data Types

```javascript
// ✅ Good: Appropriate data types
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true },
    age: { type: Number, min: 0, max: 150 },
    created_at: { type: Date, default: Date.now },
    is_active: { type: Boolean, default: true },
    tags: [String]  // Array of strings
});

// ❌ Bad: Wrong data types
const userSchema = new mongoose.Schema({
    email: Number,        // Wrong: Email should be String
    age: String,          // Wrong: Age should be Number
    created_at: String,   // Wrong: Should be Date
    is_active: String     // Wrong: Should be Boolean
});
```

### 4. Indexes for Performance

```javascript
// Index frequently queried fields
const userSchema = new mongoose.Schema({
    email: { type: String, index: true },      // Indexed for lookups
    username: { type: String, index: true },   // Indexed for lookups
    created_at: { type: Date, index: true }    // Indexed for sorting
});

// Compound index for common queries
userSchema.index({ email: 1, is_active: 1 });  // Query by email and active status
```

## Real-World Examples

### Example 1: E-Commerce Schema

```javascript
// Users
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    password_hash: { type: String, required: true },
    created_at: { type: Date, default: Date.now, index: true }
});

// Products
const productSchema = new mongoose.Schema({
    name: { type: String, required: true, index: true },
    description: String,
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', index: true },
    created_at: { type: Date, default: Date.now }
});

// Orders
const orderSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: [{
        product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true }  // Snapshot price
    }],
    total: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'processing', 'shipped', 'delivered'], default: 'pending', index: true },
    created_at: { type: Date, default: Date.now, index: true }
});
```

### Example 2: Social Media Schema

```javascript
// Posts with denormalized counts
const postSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content: { type: String, required: true },
    // Denormalized for performance
    likes_count: { type: Number, default: 0, index: true },
    comments_count: { type: Number, default: 0 },
    shares_count: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now, index: true }
});

// Likes (junction table for many-to-many)
const likeSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    post_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    created_at: { type: Date, default: Date.now }
});

// Compound index for uniqueness
likeSchema.index({ user_id: 1, post_id: 1 }, { unique: true });
```

### Example 3: Blog Schema with Categories

```javascript
// Categories
const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: String
});

// Posts
const postSchema = new mongoose.Schema({
    title: { type: String, required: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    content: { type: String, required: true },
    excerpt: String,
    author_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', index: true },
    tags: [String],  // Array of tag strings
    published: { type: Boolean, default: false, index: true },
    published_at: Date,
    created_at: { type: Date, default: Date.now, index: true },
    updated_at: { type: Date, default: Date.now }
});

// Update updated_at on save
postSchema.pre('save', function(next) {
    this.updated_at = new Date();
    next();
});
```

## Best Practices

### 1. Use References for Relationships

```javascript
// ✅ Good: Reference to related document
const orderSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    items: [{
        product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }
    }]
});

// ❌ Bad: Embedding everything
const orderSchema = new mongoose.Schema({
    user: {
        id: String,
        name: String,
        email: String
        // Embedding user data (redundant)
    }
});
```

### 2. Index Frequently Queried Fields

```javascript
// Index fields used in queries
userSchema.index({ email: 1 });                    // Lookup by email
userSchema.index({ created_at: -1 });              // Sort by date
userSchema.index({ status: 1, created_at: -1 });  // Compound query
```

### 3. Use Enums for Fixed Values

```javascript
// ✅ Good: Enum for fixed values
const orderSchema = new mongoose.Schema({
    status: {
        type: String,
        enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
    }
});

// ❌ Bad: Free-form string
const orderSchema = new mongoose.Schema({
    status: String  // Can be anything, no validation
});
```

### 4. Add Validation

```javascript
// Validate data at schema level
const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        validate: {
            validator: function(v) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: 'Invalid email format'
        }
    },
    age: {
        type: Number,
        min: 0,
        max: 150
    }
});
```

## Common Patterns

### Pattern 1: Soft Deletes

```javascript
const userSchema = new mongoose.Schema({
    email: String,
    name: String,
    deleted_at: Date,  // Soft delete timestamp
    deleted: { type: Boolean, default: false, index: true }
});

// Query only non-deleted users
User.find({ deleted: false });
```

### Pattern 2: Audit Fields

```javascript
const baseSchema = new mongoose.Schema({
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});
```

### Pattern 3: Versioning

```javascript
const documentSchema = new mongoose.Schema({
    title: String,
    content: String,
    version: { type: Number, default: 1 },
    previous_version_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' }
});
```

## Summary

**Data Modeling Principles:**

1. **Normalization**: Reduce redundancy, ensure consistency
2. **Denormalization**: Add redundancy for performance when needed
3. **Data Types**: Use appropriate types for each field
4. **Indexes**: Index frequently queried fields
5. **Validation**: Validate data at schema level

**Key Takeaway:**
Effective data modeling balances normalization (consistency) with denormalization (performance). Use appropriate data types, add indexes for frequently queried fields, and validate data at the schema level. Consider relationships, query patterns, and performance requirements when designing schemas.

**Design Principles:**
- Normalize to reduce redundancy
- Denormalize for read performance
- Use appropriate data types
- Index frequently queried fields
- Validate data at schema level

**Next Steps:**
- Learn [Sequelize Deep Dive](../04_relational_databases_sql/sequelize_deep_dive.md) for SQL modeling
- Study [MongoDB Setup](../06_nosql_mongodb/) for NoSQL modeling
- Master [Relationships](../04_relational_databases_sql/relationships_explained.md) for relational design

