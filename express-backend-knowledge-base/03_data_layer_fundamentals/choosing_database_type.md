# Choosing Database Type: SQL vs NoSQL for Express.js

Choosing the right database type (SQL vs NoSQL) is crucial for application success. This guide helps you make informed decisions based on your requirements.

## SQL Databases (Relational)

**SQL databases** store data in tables with relationships. They enforce schema and support ACID transactions.

### Characteristics

```
- Structured data (tables, rows, columns)
- Schema enforcement
- ACID transactions
- SQL query language
- Relationships (foreign keys)
```

### When to Use SQL

```javascript
// ✅ Good for: Structured data with relationships
// E-commerce: Users, Orders, Products, OrderItems
// Financial: Accounts, Transactions
// Content Management: Posts, Comments, Categories

// Example: E-commerce schema
const User = sequelize.define('User', {
    id: { type: Sequelize.INTEGER, primaryKey: true },
    email: { type: Sequelize.STRING, unique: true },
    name: Sequelize.STRING
});

const Order = sequelize.define('Order', {
    id: { type: Sequelize.INTEGER, primaryKey: true },
    user_id: { type: Sequelize.INTEGER, references: { model: User, key: 'id' } },
    total: Sequelize.DECIMAL
});

// Relationships
User.hasMany(Order);
Order.belongsTo(User);
```

**Use SQL when:**
- Data has clear structure and relationships
- Need ACID transactions
- Complex queries with JOINs
- Data integrity is critical
- Schema is well-defined

## NoSQL Databases (Document, Key-Value, etc.)

**NoSQL databases** store data in flexible formats (documents, key-value pairs). They're schema-less and scale horizontally.

### Types of NoSQL

```
1. Document: MongoDB (JSON-like documents)
2. Key-Value: Redis (simple key-value pairs)
3. Column: Cassandra (wide columns)
4. Graph: Neo4j (nodes and edges)
```

### When to Use NoSQL

```javascript
// ✅ Good for: Flexible schema, high write throughput
// User profiles: Varying fields per user
// Content: Blog posts, articles with different structures
// Real-time: Chat messages, notifications
// Analytics: Event logs, time-series data

// Example: MongoDB user profile
const userSchema = new mongoose.Schema({
    email: String,
    name: String,
    profile: {
        age: Number,
        location: String,
        preferences: {
            theme: String,
            notifications: Boolean
        },
        // Flexible: Can add fields dynamically
        customFields: mongoose.Schema.Types.Mixed
    }
});
```

**Use NoSQL when:**
- Schema is flexible or evolving
- High write throughput needed
- Horizontal scaling required
- Simple queries (no complex JOINs)
- Document-based data (JSON)

## Comparison Table

| Feature | SQL | NoSQL |
|---------|-----|-------|
| Schema | Fixed | Flexible |
| Transactions | ACID | Eventual consistency |
| Scaling | Vertical | Horizontal |
| Queries | Complex JOINs | Simple lookups |
| Relationships | Foreign keys | Embedded/References |
| Use Case | Structured data | Flexible data |

## Real-World Examples

### Example 1: E-Commerce (SQL)

```javascript
// SQL is better: Clear relationships
// Users → Orders → OrderItems → Products

const sequelize = new Sequelize('ecommerce', 'user', 'password', {
    dialect: 'postgres'
});

// Models with relationships
const User = sequelize.define('User', { ... });
const Order = sequelize.define('Order', { ... });
const Product = sequelize.define('Product', { ... });
const OrderItem = sequelize.define('OrderItem', { ... });

// Relationships
User.hasMany(Order);
Order.belongsTo(User);
Order.hasMany(OrderItem);
OrderItem.belongsTo(Order);
OrderItem.belongsTo(Product);

// Complex query with JOINs
const orders = await Order.findAll({
    include: [
        { model: User },
        { model: OrderItem, include: [Product] }
    ],
    where: { user_id: userId }
});
```

### Example 2: Content Management (NoSQL)

```javascript
// NoSQL is better: Flexible content structure
// Blog posts with varying fields

const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    title: String,
    content: String,
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Flexible metadata
    metadata: mongoose.Schema.Types.Mixed,
    // Different post types have different fields
    postType: String,
    // Type-specific fields stored flexibly
    customFields: mongoose.Schema.Types.Mixed
});

const Post = mongoose.model('Post', postSchema);

// Easy to add new fields without migration
const post = new Post({
    title: 'My Post',
    content: 'Content here',
    postType: 'article',
    customFields: {
        tags: ['tech', 'nodejs'],
        featured: true,
        // Can add any fields
        seo: { keywords: '...', description: '...' }
    }
});
```

### Example 3: Real-Time Chat (NoSQL)

```javascript
// NoSQL is better: High write throughput, flexible messages
// Chat messages with varying content

const messageSchema = new mongoose.Schema({
    room_id: String,
    user_id: String,
    content: String,
    message_type: String,  // 'text', 'image', 'file'
    // Flexible attachments
    attachments: [{
        type: String,
        url: String,
        metadata: mongoose.Schema.Types.Mixed
    }],
    created_at: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

// High write throughput
app.post('/messages', async (req, res) => {
    const message = new Message(req.body);
    await message.save();  // Fast writes
    io.to(req.body.room_id).emit('message', message);
    res.json(message);
});
```

### Example 4: Financial System (SQL)

```javascript
// SQL is better: ACID transactions, data integrity
// Banking: Accounts, Transactions

const sequelize = new Sequelize('banking', 'user', 'password', {
    dialect: 'postgres'
});

// Transaction with ACID guarantees
app.post('/transfer', async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        // Deduct from source
        await Account.decrement('balance', {
            by: req.body.amount,
            where: { id: req.body.from_account_id },
            transaction
        });
        
        // Add to destination
        await Account.increment('balance', {
            by: req.body.amount,
            where: { id: req.body.to_account_id },
            transaction
        });
        
        // Record transaction
        await Transaction.create({
            from_account_id: req.body.from_account_id,
            to_account_id: req.body.to_account_id,
            amount: req.body.amount
        }, { transaction });
        
        await transaction.commit();
        res.json({ success: true });
    } catch (error) {
        await transaction.rollback();
        res.status(500).json({ error: error.message });
    }
});
```

## Hybrid Approach

### Using Both SQL and NoSQL

```javascript
// SQL for structured data
const User = sequelize.define('User', {
    id: Sequelize.INTEGER,
    email: Sequelize.STRING,
    name: Sequelize.STRING
});

// NoSQL for flexible data
const userProfileSchema = new mongoose.Schema({
    user_id: Number,  // Reference to SQL user
    preferences: mongoose.Schema.Types.Mixed,
    activity_log: [mongoose.Schema.Types.Mixed]
});

// Use both
app.get('/users/:id', async (req, res) => {
    // Get structured data from SQL
    const user = await User.findByPk(req.params.id);
    
    // Get flexible data from NoSQL
    const profile = await UserProfile.findOne({ user_id: user.id });
    
    res.json({ ...user.toJSON(), profile: profile.toJSON() });
});
```

## Decision Framework

```
Start
  │
  ├─ Need ACID transactions? → SQL
  │
  ├─ Complex relationships? → SQL
  │
  ├─ Flexible schema? → NoSQL
  │
  ├─ High write throughput? → NoSQL
  │
  ├─ Horizontal scaling needed? → NoSQL
  │
  └─ Simple queries? → NoSQL
```

## Best Practices

1. **Start with SQL**: Default to SQL unless you have specific NoSQL needs
2. **Consider Hybrid**: Use both SQL and NoSQL for different parts
3. **Evaluate Requirements**: Consider data structure, query patterns, scale
4. **Team Expertise**: Consider team's familiarity with database type
5. **Future Growth**: Plan for future scaling and requirements

## Common Mistakes

### ❌ Choosing NoSQL for Everything

```javascript
// ❌ Bad: Using NoSQL for structured relational data
// E-commerce with clear relationships
// Should use SQL, not MongoDB

// ✅ Good: Use SQL for structured data
const User = sequelize.define('User', { ... });
const Order = sequelize.define('Order', { ... });
```

### ❌ Choosing SQL for High-Volume Writes

```javascript
// ❌ Bad: Using SQL for high-volume event logging
// Millions of writes per day
// Should use NoSQL or time-series database

// ✅ Good: Use NoSQL for high-volume writes
const eventSchema = new mongoose.Schema({
    event_type: String,
    data: mongoose.Schema.Types.Mixed,
    timestamp: Date
});
```

## Summary

**Choosing Database Type:**

1. **SQL**: Structured data, relationships, ACID transactions
2. **NoSQL**: Flexible schema, high write throughput, horizontal scaling
3. **Decision Factors**: Data structure, query patterns, scale, team expertise
4. **Hybrid**: Use both for different parts of application
5. **Best Practice**: Start with SQL, use NoSQL when needed

**Key Takeaway:**
Choose SQL for structured data with relationships and ACID transaction requirements. Choose NoSQL for flexible schema, high write throughput, and horizontal scaling needs. Consider your data structure, query patterns, and scaling requirements. You can use both SQL and NoSQL in the same application for different purposes.

**Decision Guide:**
- SQL: Structured data, relationships, ACID
- NoSQL: Flexible schema, high writes, horizontal scale
- Hybrid: Use both for different needs

**Next Steps:**
- Learn [Sequelize Deep Dive](../04_relational_databases_sql/sequelize_deep_dive.md) for SQL
- Study [MongoDB Setup](../06_nosql_mongodb/) for NoSQL
- Master [Data Modeling](../03_data_layer_fundamentals/data_modeling_principles.md) for design

---

## 🎯 Interview Questions: Database Selection & Architecture

### Q1: When would you choose SQL vs NoSQL for an Express.js application? Explain with real-world scenarios.

**Answer:**

**SQL (PostgreSQL, MySQL) - Choose When:**

```
SQL Best For:
├─ Structured data with relationships
├─ ACID transactions required
├─ Complex queries and joins
├─ Data integrity critical
└─ Reporting and analytics
```

**Real-world Examples:**

```javascript
// E-commerce: Orders, Products, Users (relationships)
// SQL: Perfect for joins and transactions

// Order creation requires:
// 1. Create order (ACID)
// 2. Update inventory (ACID)
// 3. Create payment record (ACID)
// All must succeed or rollback → SQL transactions

const order = await db.transaction(async (trx) => {
    const order = await Order.create(orderData, { transaction: trx });
    await Inventory.decrement('quantity', { where: { productId }, transaction: trx });
    await Payment.create({ orderId: order.id }, { transaction: trx });
    return order;
});
```

**NoSQL (MongoDB, Redis) - Choose When:**

```
NoSQL Best For:
├─ Flexible, evolving schema
├─ High write throughput
├─ Horizontal scaling needed
├─ Document/JSON data
└─ Simple queries, no joins
```

**Real-world Examples:**

```javascript
// User profiles: Flexible fields per user
// NoSQL: Schema can vary

// User 1: { name, email, preferences: {...} }
// User 2: { name, email, social: {...}, preferences: {...} }
// Different structure per document → NoSQL

const user = await User.create({
    name: 'John',
    email: 'john@example.com',
    preferences: { theme: 'dark', notifications: true },
    // Can add new fields without migration
    customFields: { company: 'Acme' }
});
```

**Hybrid Approach:**

```javascript
// Use both: SQL for structured, NoSQL for flexible

// SQL: Orders, Payments (structured, transactional)
const order = await Order.create(orderData);

// NoSQL: User sessions, cache (flexible, fast)
await Session.create({
    userId: user.id,
    data: { cart: [...], preferences: {...} }
});

// Redis: Real-time data (fast, temporary)
await redis.set(`user:${userId}:session`, sessionData, 'EX', 3600);
```

**Decision Matrix:**

| Scenario | SQL | NoSQL | Why |
|----------|-----|-------|-----|
| E-commerce orders | ✅ | ❌ | Transactions, relationships |
| User profiles | ⚠️ | ✅ | Flexible schema |
| Financial transactions | ✅ | ❌ | ACID required |
| Real-time analytics | ⚠️ | ✅ | High writes |
| Content management | ✅ | ⚠️ | Relationships |
| Session storage | ❌ | ✅ | Temporary, fast |

---

### Q2: Explain ACID properties in databases. Why are they important for Express.js applications?

**Answer:**

**ACID** = Atomicity, Consistency, Isolation, Durability - guarantees for database transactions.

**1. Atomicity - All or Nothing:**

```javascript
// Either all operations succeed, or all fail
await db.transaction(async (trx) => {
    await Order.create(orderData, { transaction: trx });
    await Inventory.decrement('quantity', { where: { productId }, transaction: trx });
    await Payment.create({ orderId: order.id }, { transaction: trx });
    // If any fails, all rollback
});
```

**Visual:**

```
Transaction:
┌─────────────────────┐
│ 1. Create Order     │
│ 2. Update Inventory │
│ 3. Create Payment   │
└─────────────────────┘
    │
    ├─ All succeed → Commit ✅
    └─ Any fails → Rollback ❌
```

**2. Consistency - Valid State:**

```javascript
// Database always in valid state
// Constraints enforced (foreign keys, checks)

await db.transaction(async (trx) => {
    // If user doesn't exist, transaction fails
    await Order.create({
        userId: 999, // Invalid user
        // Foreign key constraint → Transaction fails
    }, { transaction: trx });
});
```

**3. Isolation - Concurrent Transactions:**

```javascript
// Transactions don't interfere with each other

// Transaction 1: Reading
const user1 = await User.findByPk(1); // Reads balance: $100

// Transaction 2: Writing (concurrent)
await User.update({ balance: 150 }, { where: { id: 1 } });

// Transaction 1: Still sees $100 (isolation)
// Until Transaction 1 commits, it sees consistent snapshot
```

**4. Durability - Persistence:**

```javascript
// Once committed, data is permanent (even if server crashes)

await db.transaction(async (trx) => {
    await Order.create(orderData, { transaction: trx });
    await trx.commit(); // Data written to disk
    // Even if server crashes now, order is saved
});
```

**Why Important for Express.js:**

```javascript
// E-commerce: Order creation
app.post('/orders', async (req, res) => {
    await db.transaction(async (trx) => {
        // Atomicity: All or nothing
        const order = await Order.create(orderData, { transaction: trx });
        
        // Consistency: Inventory check
        const inventory = await Inventory.findOne({ 
            where: { productId: orderData.productId },
            transaction: trx 
        });
        if (inventory.quantity < orderData.quantity) {
            throw new Error('Insufficient inventory'); // Rollback
        }
        
        // Isolation: Other orders don't see this until commit
        await Inventory.decrement('quantity', {
            by: orderData.quantity,
            where: { productId: orderData.productId },
            transaction: trx
        });
        
        // Durability: Committed to disk
        await trx.commit();
        
        res.json(order);
    });
});
```

**ACID vs NoSQL:**

```
SQL (ACID):
├─ Guarantees: Strong consistency
├─ Use: Financial, e-commerce
└─ Trade-off: Slower, harder to scale

NoSQL (BASE):
├─ Guarantees: Eventually consistent
├─ Use: Social media, analytics
└─ Trade-off: Faster, easier to scale
```

---

### Q3: How would you design a database schema for a multi-tenant SaaS application in Express.js?

**Answer:**

**Multi-tenant** = Single application serves multiple customers (tenants) with data isolation.

**Approach 1: Shared Database, Tenant ID Column (Recommended for Startups):**

```javascript
// Schema
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX idx_users_tenant_id ON users(tenant_id);

// Express.js Implementation
class UserRepository {
    async findByTenant(tenantId, userId) {
        return await db.query(
            'SELECT * FROM users WHERE id = $1 AND tenant_id = $2',
            [userId, tenantId]
        );
    }
}

// Middleware to inject tenant
app.use((req, res, next) => {
    req.tenantId = req.headers['x-tenant-id'] || req.user.tenantId;
    next();
});

// Route
app.get('/users/:id', async (req, res) => {
    const user = await userRepository.findByTenant(req.tenantId, req.params.id);
    res.json(user);
});
```

**Approach 2: Separate Database per Tenant (Enterprise):**

```javascript
// Each tenant has own database
// tenant_1_db, tenant_2_db, etc.

class DatabaseManager {
    getTenantDb(tenantId) {
        return new Pool({
            database: `tenant_${tenantId}_db`,
            // ... config
        });
    }
}

// Usage
app.get('/users/:id', async (req, res) => {
    const db = databaseManager.getTenantDb(req.tenantId);
    const user = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    res.json(user.rows[0]);
});
```

**Approach 3: Schema per Tenant (PostgreSQL):**

```javascript
// PostgreSQL: Each tenant has own schema
// tenant_1.users, tenant_2.users

class SchemaManager {
    async setTenantSchema(tenantId) {
        await db.query(`SET search_path TO tenant_${tenantId}`);
    }
}

// Usage
app.use(async (req, res, next) => {
    await schemaManager.setTenantSchema(req.tenantId);
    next();
});

// Now queries automatically use tenant schema
app.get('/users/:id', async (req, res) => {
    const user = await User.findByPk(req.params.id); // Uses tenant schema
    res.json(user);
});
```

**Comparison:**

| Approach | Pros | Cons | Use Case |
|----------|------|------|----------|
| **Shared DB, Tenant ID** | Simple, cost-effective | Data leakage risk | Startups, < 1000 tenants |
| **Separate DB** | Strong isolation | Complex, expensive | Enterprise, > 1000 tenants |
| **Schema per Tenant** | Good isolation, single DB | PostgreSQL only | Medium scale |

**Security Best Practices:**

```javascript
// Always filter by tenant_id
// ❌ Dangerous
app.get('/users/:id', async (req, res) => {
    const user = await User.findByPk(req.params.id); // No tenant check!
    res.json(user);
});

// ✅ Safe
app.get('/users/:id', async (req, res) => {
    const user = await User.findOne({
        where: { id: req.params.id, tenantId: req.tenantId }
    });
    if (!user) {
        return res.status(404).json({ error: 'Not found' });
    }
    res.json(user);
});
```

---

### Q4: Explain database indexing strategies. How do you optimize queries in Express.js applications?

**Answer:**

**Indexes** speed up queries by creating **sorted data structures** for fast lookups.

**How Indexes Work:**

```
Without Index:
┌─────────────────────────────────┐
│ Full Table Scan                 │
│ Scan 1,000,000 rows             │
│ Time: 500ms                     │
└─────────────────────────────────┘

With Index:
┌─────────────────────────────────┐
│ Index Lookup                    │
│ B-tree search: O(log n)         │
│ Time: 5ms                       │
└─────────────────────────────────┘
```

**Common Index Types:**

**1. Single Column Index:**

```sql
-- Create index
CREATE INDEX idx_users_email ON users(email);

-- Query uses index
SELECT * FROM users WHERE email = 'user@example.com';
-- Fast: Uses idx_users_email
```

**2. Composite Index:**

```sql
-- Multiple columns
CREATE INDEX idx_users_tenant_email ON users(tenant_id, email);

-- Query uses index
SELECT * FROM users WHERE tenant_id = 1 AND email = 'user@example.com';
-- Fast: Uses composite index

-- Order matters!
-- ✅ Good: WHERE tenant_id = 1 AND email = '...'
-- ❌ Slow: WHERE email = '...' AND tenant_id = 1 (can't use index efficiently)
```

**3. Partial Index:**

```sql
-- Index only active users
CREATE INDEX idx_users_active ON users(email) WHERE active = true;

-- Query uses index
SELECT * FROM users WHERE email = '...' AND active = true;
-- Fast: Uses partial index
```

**Express.js Optimization:**

```javascript
// ❌ Problem: N+1 queries
app.get('/orders', async (req, res) => {
    const orders = await Order.findAll();
    for (const order of orders) {
        const user = await User.findByPk(order.userId); // N queries!
    }
    res.json(orders);
});

// ✅ Solution: Eager loading with indexes
app.get('/orders', async (req, res) => {
    const orders = await Order.findAll({
        include: [{ model: User }], // Single query with JOIN
        // Ensure indexes exist:
        // CREATE INDEX idx_orders_user_id ON orders(user_id);
    });
    res.json(orders);
});
```

**Index Strategy:**

```
Indexing Strategy:
├─ Primary Key: Always indexed (automatic)
├─ Foreign Keys: Index for JOINs
├─ WHERE clauses: Index columns in WHERE
├─ ORDER BY: Index columns in ORDER BY
└─ Composite: Index common query patterns
```

**Monitoring:**

```sql
-- PostgreSQL: Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans
FROM pg_stat_user_indexes
WHERE idx_scan = 0; -- Unused indexes

-- Explain query plan
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'user@example.com';
```

---

## Summary

These interview questions cover:
- ✅ SQL vs NoSQL selection criteria
- ✅ ACID properties and importance
- ✅ Multi-tenant database design
- ✅ Indexing strategies and query optimization
- ✅ Real-world scenarios and trade-offs

Master these for senior-level interviews focusing on database architecture and performance.

