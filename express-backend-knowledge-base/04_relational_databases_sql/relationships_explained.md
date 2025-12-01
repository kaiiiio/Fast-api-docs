# Relationships Explained: Modeling Data Relationships in Express.js

Understanding database relationships is crucial for designing effective schemas. This guide covers one-to-one, one-to-many, and many-to-many relationships in Express.js with Sequelize.

## Types of Relationships

### 1. One-to-One

**One-to-One** relationship means one record in table A relates to exactly one record in table B.

```javascript
// User has one Profile
const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    email: { type: DataTypes.STRING, unique: true },
    name: DataTypes.STRING
});

const Profile = sequelize.define('Profile', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: {
        type: DataTypes.INTEGER,
        unique: true,  // One-to-one: unique constraint
        references: { model: User, key: 'id' }
    },
    bio: DataTypes.TEXT,
    avatar_url: DataTypes.STRING,
    phone: DataTypes.STRING
});

// Define relationship
User.hasOne(Profile, { foreignKey: 'user_id' });
Profile.belongsTo(User, { foreignKey: 'user_id' });

// Usage
const user = await User.findByPk(1, {
    include: [Profile]  // Eager load profile
});
console.log(user.Profile.bio);
```

**Explanation:**
One-to-one relationships use a unique foreign key. Each user has exactly one profile, and each profile belongs to exactly one user.

### 2. One-to-Many

**One-to-Many** relationship means one record in table A relates to many records in table B.

```javascript
// User has many Orders
const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    email: DataTypes.STRING,
    name: DataTypes.STRING
});

const Order = sequelize.define('Order', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: {
        type: DataTypes.INTEGER,
        references: { model: User, key: 'id' }
    },
    total: DataTypes.DECIMAL(10, 2),
    status: DataTypes.STRING
});

// Define relationship
User.hasMany(Order, { foreignKey: 'user_id' });
Order.belongsTo(User, { foreignKey: 'user_id' });

// Usage
const user = await User.findByPk(1, {
    include: [Order]  // Eager load all orders
});
console.log(user.Orders.length);  // Array of orders

// Create order for user
const order = await Order.create({
    user_id: user.id,
    total: 99.99,
    status: 'pending'
});
```

**Explanation:**
One-to-many relationships use a foreign key in the "many" side. One user can have many orders, but each order belongs to one user.

### 3. Many-to-Many

**Many-to-Many** relationship means records in table A relate to many records in table B, and vice versa.

```javascript
// Users have many Roles, Roles have many Users
const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    email: DataTypes.STRING,
    name: DataTypes.STRING
});

const Role = sequelize.define('Role', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, unique: true },
    description: DataTypes.TEXT
});

// Junction table (automatically created)
const UserRole = sequelize.define('UserRole', {
    user_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        references: { model: User, key: 'id' }
    },
    role_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        references: { model: Role, key: 'id' }
    },
    assigned_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

// Define relationship
User.belongsToMany(Role, { through: UserRole, foreignKey: 'user_id' });
Role.belongsToMany(User, { through: UserRole, foreignKey: 'role_id' });

// Usage
const user = await User.findByPk(1, {
    include: [Role]  // Eager load roles
});
console.log(user.Roles);  // Array of roles

// Assign role to user
await user.addRole(role);
// Or
await UserRole.create({ user_id: 1, role_id: 2 });
```

**Explanation:**
Many-to-many relationships require a junction table (UserRole) that stores pairs of related IDs. Users can have multiple roles, and roles can be assigned to multiple users.

## Real-World Examples

### Example 1: E-Commerce Relationships

```javascript
// Users → Orders → OrderItems → Products
const User = sequelize.define('User', {
    email: DataTypes.STRING,
    name: DataTypes.STRING
});

const Order = sequelize.define('Order', {
    user_id: { type: DataTypes.INTEGER, references: { model: User, key: 'id' } },
    total: DataTypes.DECIMAL(10, 2),
    status: DataTypes.STRING
});

const Product = sequelize.define('Product', {
    name: DataTypes.STRING,
    price: DataTypes.DECIMAL(10, 2),
    stock: DataTypes.INTEGER
});

const OrderItem = sequelize.define('OrderItem', {
    order_id: { type: DataTypes.INTEGER, references: { model: Order, key: 'id' } },
    product_id: { type: DataTypes.INTEGER, references: { model: Product, key: 'id' } },
    quantity: DataTypes.INTEGER,
    price: DataTypes.DECIMAL(10, 2)  // Snapshot price
});

// Relationships
User.hasMany(Order, { foreignKey: 'user_id' });
Order.belongsTo(User, { foreignKey: 'user_id' });

Order.hasMany(OrderItem, { foreignKey: 'order_id' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id' });

Product.hasMany(OrderItem, { foreignKey: 'product_id' });
OrderItem.belongsTo(Product, { foreignKey: 'product_id' });

// Query with relationships
const order = await Order.findByPk(1, {
    include: [
        { model: User },
        {
            model: OrderItem,
            include: [Product]
        }
    ]
});

// Access related data
console.log(order.User.name);  // User name
console.log(order.OrderItems[0].Product.name);  // Product name
```

### Example 2: Blog with Categories and Tags

```javascript
// Posts → Categories (many-to-one)
// Posts ↔ Tags (many-to-many)
const Post = sequelize.define('Post', {
    title: DataTypes.STRING,
    content: DataTypes.TEXT,
    category_id: { type: DataTypes.INTEGER, references: { model: 'Categories', key: 'id' } }
});

const Category = sequelize.define('Category', {
    name: DataTypes.STRING,
    slug: { type: DataTypes.STRING, unique: true }
});

const Tag = sequelize.define('Tag', {
    name: { type: DataTypes.STRING, unique: true },
    slug: { type: DataTypes.STRING, unique: true }
});

const PostTag = sequelize.define('PostTag', {
    post_id: { type: DataTypes.INTEGER, primaryKey: true },
    tag_id: { type: DataTypes.INTEGER, primaryKey: true }
});

// Relationships
Post.belongsTo(Category, { foreignKey: 'category_id' });
Category.hasMany(Post, { foreignKey: 'category_id' });

Post.belongsToMany(Tag, { through: PostTag, foreignKey: 'post_id' });
Tag.belongsToMany(Post, { through: PostTag, foreignKey: 'tag_id' });

// Usage
const post = await Post.findByPk(1, {
    include: [Category, Tag]
});

console.log(post.Category.name);  // Category name
console.log(post.Tags);  // Array of tags
```

### Example 3: Social Media Relationships

```javascript
// Users → Posts (one-to-many)
// Users ↔ Users (many-to-many, self-referential)
// Posts ↔ Users (many-to-many, likes)
const User = sequelize.define('User', {
    email: DataTypes.STRING,
    name: DataTypes.STRING
});

const Post = sequelize.define('Post', {
    user_id: { type: DataTypes.INTEGER, references: { model: User, key: 'id' } },
    content: DataTypes.TEXT
});

// Self-referential: Users following Users
const UserFollow = sequelize.define('UserFollow', {
    follower_id: { type: DataTypes.INTEGER, primaryKey: true },
    following_id: { type: DataTypes.INTEGER, primaryKey: true }
});

// Posts liked by Users
const PostLike = sequelize.define('PostLike', {
    user_id: { type: DataTypes.INTEGER, primaryKey: true },
    post_id: { type: DataTypes.INTEGER, primaryKey: true }
});

// Relationships
User.hasMany(Post, { foreignKey: 'user_id' });
Post.belongsTo(User, { foreignKey: 'user_id' });

// Self-referential many-to-many
User.belongsToMany(User, {
    through: UserFollow,
    as: 'Followers',
    foreignKey: 'following_id'
});
User.belongsToMany(User, {
    through: UserFollow,
    as: 'Following',
    foreignKey: 'follower_id'
});

// Posts and Users (likes)
Post.belongsToMany(User, { through: PostLike, foreignKey: 'post_id', as: 'LikedBy' });
User.belongsToMany(Post, { through: PostLike, foreignKey: 'user_id', as: 'LikedPosts' });

// Usage
const user = await User.findByPk(1, {
    include: [
        { model: Post },
        { model: User, as: 'Followers' },
        { model: User, as: 'Following' }
    ]
});
```

## Querying Relationships

### Eager Loading

```javascript
// Load related data in single query
const user = await User.findByPk(1, {
    include: [
        { model: Order },
        { model: Profile }
    ]
});
```

### Lazy Loading

```javascript
// Load related data on demand
const user = await User.findByPk(1);
const orders = await user.getOrders();  // Separate query
```

### Filtering with Relationships

```javascript
// Find users with pending orders
const users = await User.findAll({
    include: [{
        model: Order,
        where: { status: 'pending' },
        required: true  // INNER JOIN
    }]
});
```

## Best Practices

1. **Use Appropriate Relationships**: Choose the right relationship type
2. **Index Foreign Keys**: Index foreign key columns for performance
3. **Eager Load When Needed**: Use eager loading to avoid N+1 queries
4. **Define Both Sides**: Define relationships on both models
5. **Use Aliases**: Use aliases for multiple relationships to same model

## Common Mistakes

### ❌ Not Defining Both Sides

```javascript
// ❌ Bad: Only one side defined
User.hasMany(Order);
// Missing: Order.belongsTo(User);

// ✅ Good: Both sides defined
User.hasMany(Order, { foreignKey: 'user_id' });
Order.belongsTo(User, { foreignKey: 'user_id' });
```

### ❌ N+1 Query Problem

```javascript
// ❌ Bad: N+1 queries
const users = await User.findAll();
for (const user of users) {
    const orders = await user.getOrders();  // Query for each user!
}

// ✅ Good: Eager loading
const users = await User.findAll({
    include: [Order]  // Single query with JOIN
});
```

## Summary

**Relationships Explained:**

1. **One-to-One**: Unique foreign key, one-to-one mapping
2. **One-to-Many**: Foreign key in "many" side, one-to-many mapping
3. **Many-to-Many**: Junction table, many-to-many mapping
4. **Querying**: Eager loading, lazy loading, filtering
5. **Best Practice**: Define both sides, use eager loading, index foreign keys

**Key Takeaway:**
Database relationships model how data entities relate to each other. Use one-to-one for exclusive relationships, one-to-many for parent-child relationships, and many-to-many for bidirectional relationships. Always define relationships on both models, use eager loading to avoid N+1 queries, and index foreign keys for performance.

**Relationship Types:**
- One-to-One: User → Profile
- One-to-Many: User → Orders
- Many-to-Many: Users ↔ Roles

**Next Steps:**
- Learn [Sequelize Deep Dive](sequelize_deep_dive.md) for advanced ORM usage
- Study [CRUD with Repository Pattern](crud_with_repository_pattern.md) for data access
- Master [Data Modeling](../03_data_layer_fundamentals/data_modeling_principles.md) for schema design

