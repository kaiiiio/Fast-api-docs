# Data Modeling for Document Databases: MongoDB Schema Design

Document databases like MongoDB require different modeling approaches than relational databases. This guide covers effective data modeling for MongoDB in Express.js applications.

## Document Database Principles

### Embedding vs Referencing

**Embedding**: Store related data in the same document
**Referencing**: Store references to other documents

### When to Embed

```javascript
// ✅ Good: Embed small, frequently accessed data
const userSchema = new mongoose.Schema({
    email: String,
    name: String,
    // Embed address (small, always needed together)
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String
    }
});
```

### When to Reference

```javascript
// ✅ Good: Reference large or infrequently accessed data
const orderSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    items: [{
        product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        quantity: Number,
        price: Number
    }]
});
```

## Real-World Examples

### Example 1: E-Commerce Schema

```javascript
// Users: Embed profile, reference orders
const userSchema = new mongoose.Schema({
    email: { type: String, unique: true, index: true },
    name: String,
    // Embed: Small, always needed
    profile: {
        phone: String,
        address: {
            street: String,
            city: String,
            state: String,
            zipCode: String
        }
    },
    // Reference: Large collection
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }]
});

// Products: Embed specifications, reference category
const productSchema = new mongoose.Schema({
    name: { type: String, index: true },
    price: Number,
    // Embed: Varies by product type
    specifications: mongoose.Schema.Types.Mixed,
    // Reference: Shared category
    category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' }
});

// Orders: Embed items, reference user
const orderSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    // Embed: Order-specific data
    items: [{
        product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: String,  // Snapshot
        price: Number,  // Snapshot
        quantity: Number
    }],
    total: Number,
    status: String,
    created_at: { type: Date, default: Date.now, index: true }
});
```

### Example 2: Blog Schema

```javascript
// Posts: Embed comments, reference author
const postSchema = new mongoose.Schema({
    title: { type: String, index: true },
    content: String,
    author_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    // Embed: Small, frequently accessed
    comments: [{
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        content: String,
        created_at: { type: Date, default: Date.now }
    }],
    // Denormalized for performance
    comment_count: { type: Number, default: 0 },
    like_count: { type: Number, default: 0 },
    tags: [String],
    created_at: { type: Date, default: Date.now, index: true }
});
```

## Best Practices

1. **Embed Small Data**: Embed small, frequently accessed data
2. **Reference Large Data**: Reference large collections
3. **Denormalize for Reads**: Store frequently accessed data
4. **Consider Growth**: Avoid unbounded arrays
5. **Index Appropriately**: Index frequently queried fields

## Summary

**Data Modeling for Document Databases:**

1. **Principles**: Embed vs reference, denormalization
2. **Embedding**: Small, frequently accessed data
3. **Referencing**: Large collections, infrequent access
4. **Best Practice**: Balance embedding and referencing
5. **Performance**: Denormalize for read performance

**Key Takeaway:**
Document database modeling balances embedding (fast reads, data duplication) with referencing (normalized, requires joins). Embed small, frequently accessed data. Reference large collections. Denormalize for read performance. Consider data growth and query patterns when designing schemas.

**Modeling Strategy:**
- Embed small, frequently accessed data
- Reference large collections
- Denormalize for reads
- Index appropriately
- Consider growth

---

## 🎯 Interview Questions: Document Data Modeling

### Q1: Embed vs Reference — how do you decide in MongoDB?

**Answer:**

```
Embed (Denormalize):
├─ Small, bounded subdocuments
├─ Frequently read together with parent
├─ 1-to-few relationships (profile, preferences)
├─ Read-heavy workloads

Reference (Normalize):
├─ Large or unbounded relationships (posts → comments)
├─ Shared data across many parents (tags)
├─ Write-heavy or frequently updated subdocs
├─ Need independent lifecycle
```

**Decision Matrix:**

| Criterion           | Embed             | Reference             |
|---------------------|-------------------|-----------------------|
| Data size           | Small             | Large/unbounded       |
| Access pattern      | Read together     | Separate reads        |
| Duplication impact  | Acceptable        | Should avoid          |
| Update frequency    | Rare              | Frequent              |

### Q2: How do you design a schema for an e-commerce order system?

**Answer:**

```
User
├─ Profile (embedded)
└─ Orders (referenced or embedded depending on size)

Order
├─ orderItems (embedded array)
└─ payment, shipment (embedded snapshots)

Product
└─ Current data (referenced)
```

```javascript
// Example order document
{
  _id: ObjectId(),
  userId: ObjectId('...'),            // reference
  status: 'COMPLETED',
  total: 129.99,
  items: [                            // embedded (small, read with order)
    { productId: ObjectId('...'), name: 'Laptop', qty: 1, price: 129.99 }
  ],
  shipping: {                         // snapshot data
    address: '123 Main St',
    city: 'NYC',
    country: 'US'
  },
  createdAt: ISODate('2024-01-01')
}
```

---

## Summary

These interview questions cover:
- ✅ Embed vs reference decision-making
- ✅ E-commerce schema design
- ✅ Practical modeling heuristics

Master these for mid/senior interviews focused on MongoDB schema design.

**Next Steps:**
- Learn [Mongoose Setup](mongoose_setup_and_basics.md) for ODM usage
- Study [Aggregation Pipeline](aggregation_pipeline.md) for complex queries
- Master [Change Streams](change_streams_for_events.md) for real-time updates

