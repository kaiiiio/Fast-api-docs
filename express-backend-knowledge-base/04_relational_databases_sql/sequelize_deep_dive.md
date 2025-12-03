# Sequelize Deep Dive: Complete E-Commerce Example

This guide teaches Sequelize from scratch using a real e-commerce example. We'll build a complete system with Users, Products, Orders, and OrderItems, learning every concept step by step.

## Our Example: E-Commerce System

Throughout this guide, we'll work with these tables:
- **users** - Customer information
- **products** - Available items for sale
- **categories** - Product categories
- **orders** - Customer orders
- **order_items** - Items in each order

Let's build this from the ground up!

## Step 1: Setting Up Sequelize

Before we can do anything, we need to connect to PostgreSQL. Let's understand each part:

```javascript
const { Sequelize, DataTypes } = require('sequelize');

// Step 1.1: Create Sequelize instance - manages connection to PostgreSQL.
const sequelize = new Sequelize(
    process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/ecommerce_db',
    {
        dialect: 'postgres',  // Use PostgreSQL
        logging: console.log,  // Log SQL queries (helpful for learning, remove in production!)
        pool: {
            max: 10,  // Maximum connections in pool
            min: 0,  // Minimum connections in pool
            acquire: 30000,  // Maximum time to wait for connection (ms)
            idle: 10000  // Maximum time connection can be idle (ms)
        }
    }
);

// Test connection: Verify database connection works.
async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}

testConnection();
```

**Understanding each part:** `new Sequelize()` creates a connection pool (reuses connections efficiently), `dialect: 'postgres'` specifies PostgreSQL, `logging: console.log` prints all SQL queries (remove in production), and `pool` configures connection pool settings. `sequelize.authenticate()` tests the connection.

## Step 2: Creating Our First Model - Users

Let's start simple with just a users model:

```javascript
const { DataTypes } = require('sequelize');

// User model: Represents a customer in our e-commerce system.
const User = sequelize.define('User', {
    // Primary key: Uniquely identifies each user (auto-incremented).
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    
    // Email: Must be unique, indexed for fast lookups.
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,  // Required field
        unique: true,  // Must be unique
        validate: {
            isEmail: true  // Validate email format
        }
    },
    
    // Full name: Up to 200 characters, required.
    full_name: {
        type: DataTypes.STRING(200),
        allowNull: false
    },
    
    // Timestamp: Auto-set when user is created.
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false
    }
}, {
    tableName: 'users',  // Table name in database
    timestamps: true,  // Automatically add createdAt and updatedAt
    underscored: true  // Use snake_case for column names
});

module.exports = User;
```

**What each DataType means:** `INTEGER` stores integers, `STRING(255)` stores text (max 255 characters), `DATE` stores dates/timestamps, `primaryKey: true` is the unique identifier, `autoIncrement: true` lets database auto-assign IDs, `unique: true` prevents duplicates, `allowNull: false` makes field required, and `validate` adds custom validation.

## Step 3: Creating Products and Categories Models

Now let's add products with categories:

```javascript
// Category model: Product categories (e.g., "Electronics", "Books", "Clothing").
const Category = sequelize.define('Category', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    },
    description: {
        type: DataTypes.STRING(500),
        allowNull: true  // Optional field
    }
}, {
    tableName: 'categories',
    timestamps: true
});

// Product model: Products available for purchase.
const Product = sequelize.define('Product', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(200),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),  // Decimal: 10 digits, 2 decimals
        allowNull: false,
        validate: {
            min: 0  // Price must be positive
        }
    },
    stock_quantity: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
        validate: {
            min: 0  // Stock can't be negative
        }
    },
    
    // Foreign Key: Links product to category (each product must belong to a category).
    category_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'categories',  // References categories table
            key: 'id'
        }
    }
}, {
    tableName: 'products',
    timestamps: true
});
```

**Understanding Foreign Keys:** A foreign key creates a relationship. `category_id` with `references` means each product references one category, the category must exist (database enforces this), and if you try to delete a category with products, you'll get an error.

## Step 4: Understanding Relationships - One-to-Many

Now let's see how to navigate between related models. Sequelize relationships let you access related data easily:

```javascript
// Define relationships: One category has many products.
Category.hasMany(Product, {
    foreignKey: 'category_id',  // Foreign key in products table
    as: 'products'  // Alias for accessing: category.products
});

// Define relationships: Each product belongs to one category.
Product.belongsTo(Category, {
    foreignKey: 'category_id',  // Foreign key in products table
    as: 'category'  // Alias for accessing: product.category
});
```

**What this means:** These relationships create bidirectional links. From category: `category.products` → array of all products in that category. From product: `product.category` → the category this product belongs to.

## Step 5: Creating Orders and OrderItems

Let's add orders with order items:

```javascript
// Order model: Customer orders.
const Order = sequelize.define('Order', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    total_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled'),
        defaultValue: 'pending',
        allowNull: false
    }
}, {
    tableName: 'orders',
    timestamps: true
});

// OrderItem model: Items in each order (many-to-many relationship).
const OrderItem = sequelize.define('OrderItem', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    order_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'orders',
            key: 'id'
        }
    },
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id'
        }
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1  // Must order at least 1 item
        }
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false  // Price at time of order (may differ from current price)
    }
}, {
    tableName: 'order_items',
    timestamps: true
});
```

## Step 6: Defining All Relationships

```javascript
// User relationships: One user has many orders.
User.hasMany(Order, {
    foreignKey: 'user_id',
    as: 'orders'
});
Order.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
});

// Order relationships: One order has many order items.
Order.hasMany(OrderItem, {
    foreignKey: 'order_id',
    as: 'items'
});
OrderItem.belongsTo(Order, {
    foreignKey: 'order_id',
    as: 'order'
});

// Product relationships: One product can be in many order items.
Product.hasMany(OrderItem, {
    foreignKey: 'product_id',
    as: 'order_items'
});
OrderItem.belongsTo(Product, {
    foreignKey: 'product_id',
    as: 'product'
});
```

## Step 7: Creating and Reading Records

### Creating Records

```javascript
// Create user: Simple creation.
const user = await User.create({
    email: 'john@example.com',
    full_name: 'John Doe'
});

// Create category: Create category first.
const category = await Category.create({
    name: 'Electronics',
    description: 'Electronic devices and gadgets'
});

// Create product: With foreign key.
const product = await Product.create({
    name: 'Laptop',
    description: 'High-performance laptop',
    price: 999.99,
    stock_quantity: 10,
    category_id: category.id  // Reference to category
});
```

### Reading Records

```javascript
// Find all users: Get all records.
const users = await User.findAll();

// Find by ID: Get single record.
const user = await User.findByPk(1);

// Find with conditions: WHERE clause.
const products = await Product.findAll({
    where: {
        stock_quantity: { [Op.gt]: 0 }  // Stock > 0
    }
});

// Find with relationships: Include related data.
const order = await Order.findByPk(1, {
    include: [
        { model: User, as: 'user' },  // Include user
        {
            model: OrderItem,
            as: 'items',
            include: [{ model: Product, as: 'product' }]  // Include product in items
        }
    ]
});
```

## Step 8: Updating and Deleting Records

```javascript
// Update record: Modify existing record.
await User.update(
    { full_name: 'Jane Doe' },
    { where: { id: 1 } }
);

// Delete record: Remove record.
await User.destroy({
    where: { id: 1 }
});
```

## Step 9: Database Synchronization

```javascript
// Sync models: Create tables in database (development only!).
async function syncDatabase() {
    try {
        // Force: true drops existing tables (DANGEROUS in production!).
        await sequelize.sync({ force: false });  // Use migrations in production
        console.log('Database synchronized successfully.');
    } catch (error) {
        console.error('Error synchronizing database:', error);
    }
}

// In production, use migrations instead:
// npx sequelize-cli db:migrate
```

## Best Practices

1. **Use Migrations**: Never use `sync()` in production
2. **Index Foreign Keys**: Add indexes to foreign key columns
3. **Validate Data**: Use Sequelize validators
4. **Handle Errors**: Always wrap database operations in try-catch
5. **Use Transactions**: For multiple related operations

## Summary

Sequelize deep dive covers: Setting up Sequelize connection, defining models with DataTypes, creating relationships (hasMany, belongsTo), CRUD operations (create, read, update, delete), including related data, and database synchronization. Sequelize provides a powerful ORM for Express.js applications working with relational databases.

---

## 🎯 Interview Questions: Sequelize ORM

### Q1: Explain the benefits and drawbacks of using Sequelize ORM vs raw SQL queries in Express.js.

**Answer:**

**Sequelize Benefits:**

```javascript
// ✅ Type-safe queries
const user = await User.findOne({ where: { email: 'user@example.com' } });
// Auto-completion, type checking

// ✅ Relationships handled automatically
const user = await User.findByPk(1, {
    include: [Order, Profile]  // Automatic JOINs
});

// ✅ Migrations for schema management
// ✅ Model validation
// ✅ Protection against SQL injection
```

**Raw SQL Benefits:**

```javascript
// ✅ Full control over queries
const result = await db.query(`
    SELECT 
        u.id,
        u.name,
        COUNT(o.id) as order_count,
        SUM(o.total) as total_spent
    FROM users u
    LEFT JOIN orders o ON u.id = o.user_id
    WHERE u.created_at > $1
    GROUP BY u.id
    HAVING COUNT(o.id) > 5
    ORDER BY total_spent DESC
`, [date]);

// ✅ Complex queries easier
// ✅ Better performance (no ORM overhead)
// ✅ Database-specific features
```

**Comparison:**

| Aspect | Sequelize | Raw SQL |
|--------|-----------|---------|
| **Learning Curve** | Steeper | Easier |
| **Type Safety** | ✅ Yes | ❌ No |
| **Complex Queries** | ⚠️ Limited | ✅ Full control |
| **Performance** | ⚠️ Overhead | ✅ Optimal |
| **Maintainability** | ✅ High | ⚠️ Lower |
| **SQL Injection** | ✅ Protected | ⚠️ Manual |

**When to Use Each:**

```
Sequelize:
├─ Standard CRUD operations
├─ Type safety needed
├─ Team prefers ORM
└─ Rapid development

Raw SQL:
├─ Complex queries (aggregations, window functions)
├─ Performance critical
├─ Database-specific features
└─ Reporting/analytics
```

---

### Q2: How do you optimize Sequelize queries for performance? Explain N+1 queries and eager loading.

**Answer:**

**N+1 Query Problem:**

```javascript
// ❌ Problem: N+1 queries
const users = await User.findAll(); // 1 query
for (const user of users) {
    const orders = await user.getOrders(); // N queries (one per user)
}
// Total: 1 + N queries
```

**Solution: Eager Loading:**

```javascript
// ✅ Solution: Single query with JOIN
const users = await User.findAll({
    include: [{
        model: Order,
        as: 'orders'
    }]
});
// Total: 1 query (with JOIN)
```

**Advanced Optimizations:**

```javascript
// 1. Select specific fields
const users = await User.findAll({
    attributes: ['id', 'name', 'email'],  // Only fetch needed fields
    include: [{
        model: Order,
        attributes: ['id', 'total']  // Only fetch needed fields
    }]
});

// 2. Use raw queries for complex operations
const result = await sequelize.query(`
    SELECT u.*, COUNT(o.id) as order_count
    FROM users u
    LEFT JOIN orders o ON u.id = o.user_id
    GROUP BY u.id
`, { type: QueryTypes.SELECT });

// 3. Use findAndCountAll for pagination
const { count, rows } = await User.findAndCountAll({
    limit: 10,
    offset: 0
});

// 4. Batch operations
await User.bulkCreate(users, { validate: true });
await User.bulkUpdate(updates, { where: { active: true } });
```

---

## Summary

These interview questions cover:
- ✅ Sequelize vs raw SQL trade-offs
- ✅ Query optimization techniques
- ✅ N+1 query prevention
- ✅ Performance best practices

Master these for senior-level interviews focusing on ORM usage and performance.

