# Array and Enum Types: PostgreSQL-Specific Data Types

PostgreSQL supports arrays and enums as first-class data types. This guide covers using arrays and enums in Express.js with Sequelize.

## PostgreSQL Arrays

**Arrays** allow storing multiple values in a single column, useful for tags, categories, and lists.

### Defining Array Columns

```javascript
const { Sequelize, DataTypes } = require('sequelize');

// Array of strings
const Product = sequelize.define('Product', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: DataTypes.STRING,
    tags: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: []
    },
    // Array of integers
    categoryIds: {
        type: DataTypes.ARRAY(DataTypes.INTEGER),
        defaultValue: []
    }
});
```

### Working with Arrays

```javascript
// Create product with tags
const product = await Product.create({
    name: 'Laptop',
    tags: ['electronics', 'computers', 'laptops'],
    categoryIds: [1, 2, 3]
});

// Query by array contains
const products = await Product.findAll({
    where: {
        tags: {
            [Sequelize.Op.contains]: ['electronics']  // Contains 'electronics'
        }
    }
});

// Query by array overlap
const products = await Product.findAll({
    where: sequelize.where(
        sequelize.fn('array_overlap', sequelize.col('tags'), ['electronics', 'computers']),
        true
    )
});
```

## PostgreSQL Enums

**Enums** restrict column values to a predefined set, ensuring data integrity.

### Creating Enum Type

```sql
-- Create enum type
CREATE TYPE order_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled');

-- Use in table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    status order_status DEFAULT 'pending'
);
```

### Using Enums with Sequelize

```javascript
// Define enum in Sequelize
const Order = sequelize.define('Order', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: DataTypes.INTEGER,
    status: {
        type: DataTypes.ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled'),
        defaultValue: 'pending'
    }
});

// Create order
const order = await Order.create({
    user_id: 1,
    status: 'pending'
});

// Query by enum value
const pendingOrders = await Order.findAll({
    where: { status: 'pending' }
});
```

## Real-World Examples

### Example 1: Product Tags

```javascript
// Products with tags array
const Product = sequelize.define('Product', {
    name: DataTypes.STRING,
    price: DataTypes.DECIMAL(10, 2),
    tags: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: []
    }
});

// Create product with tags
app.post('/products', async (req, res) => {
    const product = await Product.create({
        name: req.body.name,
        price: req.body.price,
        tags: req.body.tags || []
    });
    res.status(201).json(product);
});

// Search products by tags
app.get('/products', async (req, res) => {
    const { tags } = req.query;
    
    let whereClause = {};
    
    if (tags) {
        const tagArray = tags.split(',');
        whereClause = {
            tags: {
                [Sequelize.Op.overlap]: tagArray  // Overlaps with any tag
            }
        };
    }
    
    const products = await Product.findAll({ where: whereClause });
    res.json(products);
});
```

### Example 2: Order Status Enum

```javascript
// Orders with status enum
const Order = sequelize.define('Order', {
    user_id: DataTypes.INTEGER,
    total: DataTypes.DECIMAL(10, 2),
    status: {
        type: DataTypes.ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled'),
        defaultValue: 'pending'
    }
});

// Update order status
app.put('/orders/:id/status', async (req, res) => {
    const { status } = req.body;
    
    // Validate enum value
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    
    const order = await Order.findByPk(req.params.id);
    if (!order) {
        return res.status(404).json({ error: 'Order not found' });
    }
    
    order.status = status;
    await order.save();
    
    res.json(order);
});

// Get orders by status
app.get('/orders', async (req, res) => {
    const { status } = req.query;
    
    const whereClause = status ? { status } : {};
    const orders = await Order.findAll({ where: whereClause });
    
    res.json(orders);
});
```

### Example 3: User Roles Array

```javascript
// Users with roles array
const User = sequelize.define('User', {
    email: DataTypes.STRING,
    name: DataTypes.STRING,
    roles: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: ['user']
    }
});

// Add role to user
app.post('/users/:id/roles', async (req, res) => {
    const { role } = req.body;
    const user = await User.findByPk(req.params.id);
    
    if (!user.roles.includes(role)) {
        user.roles = [...user.roles, role];
        await user.save();
    }
    
    res.json(user);
});

// Check if user has role
function hasRole(user, role) {
    return user.roles.includes(role);
}

// Middleware
function requireRole(role) {
    return async (req, res, next) => {
        const user = await User.findByPk(req.user.id);
        
        if (!hasRole(user, role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        
        next();
    };
}
```

## Array Operations

### Array Functions

```javascript
// Append to array
await sequelize.query(`
    UPDATE products 
    SET tags = array_append(tags, :tag)
    WHERE id = :id
`, {
    replacements: { id: productId, tag: 'new-tag' }
});

// Remove from array
await sequelize.query(`
    UPDATE products 
    SET tags = array_remove(tags, :tag)
    WHERE id = :id
`, {
    replacements: { id: productId, tag: 'old-tag' }
});

// Array length
const products = await sequelize.query(`
    SELECT *, array_length(tags, 1) AS tag_count
    FROM products
    WHERE array_length(tags, 1) > 0
`, { type: sequelize.QueryTypes.SELECT });
```

## Best Practices

1. **Use Arrays Sparingly**: Prefer normalized tables for complex relationships
2. **Index Arrays**: Create GIN indexes for array columns
3. **Validate Enums**: Validate enum values in application
4. **Consider Performance**: Array operations can be slower than joins
5. **Use Cases**: Tags, categories, simple lists

## Summary

**Array and Enum Types:**

1. **Arrays**: Store multiple values in single column
2. **Enums**: Restrict values to predefined set
3. **Use Cases**: Tags (arrays), status (enums)
4. **Best Practice**: Index arrays, validate enums
5. **Performance**: Consider normalization for complex cases

**Key Takeaway:**
PostgreSQL arrays and enums provide flexible data types. Use arrays for simple lists (tags, categories) and enums for fixed value sets (status, type). Create GIN indexes on array columns for performance. Validate enum values in application code. Consider normalization for complex relationships.

**When to Use:**
- Arrays: Simple lists, tags, categories
- Enums: Fixed value sets, status fields

**Next Steps:**
- Learn [JSONB and Full-Text Search](jsonb_and_full_text_search.md) for flexible data
- Study [Connection URI and SSL](connection_uri_and_ssl_config.md) for production
- Master [Sequelize Deep Dive](../04_relational_databases_sql/sequelize_deep_dive.md) for ORM usage

