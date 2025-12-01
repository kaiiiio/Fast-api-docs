# Soft Delete Patterns: Preserving Data Instead of Deleting

Soft deletes mark records as deleted instead of physically removing them from the database. This preserves data for auditing, recovery, and compliance while maintaining application functionality.

## What is Soft Delete?

**Soft delete** marks records as deleted using a flag or timestamp instead of physically deleting them. The record remains in the database but is excluded from normal queries.

### Hard Delete vs Soft Delete

```javascript
// ❌ Hard Delete: Physically removes record
await User.destroy({ where: { id: userId } });
// Record is gone, cannot recover

// ✅ Soft Delete: Marks as deleted
await User.update(
    { deleted_at: new Date() },
    { where: { id: userId } }
);
// Record remains, can be recovered
```

## Implementation Patterns

### Pattern 1: Boolean Flag

```javascript
// Add deleted flag to model
const User = sequelize.define('User', {
    email: DataTypes.STRING,
    name: DataTypes.STRING,
    deleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        index: true  // Index for performance
    }
});

// Soft delete
await User.update(
    { deleted: true },
    { where: { id: userId } }
);

// Query only non-deleted users
const users = await User.findAll({
    where: { deleted: false }
});
```

### Pattern 2: Timestamp (Recommended)

```javascript
// Add deleted_at timestamp
const User = sequelize.define('User', {
    email: DataTypes.STRING,
    name: DataTypes.STRING,
    deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
        index: true
    }
});

// Soft delete
await User.update(
    { deleted_at: new Date() },
    { where: { id: userId } }
);

// Query only non-deleted users
const users = await User.findAll({
    where: { deleted_at: null }
});
```

### Pattern 3: Using Sequelize Paranoid

```javascript
// Sequelize built-in soft delete
const User = sequelize.define('User', {
    email: DataTypes.STRING,
    name: DataTypes.STRING
}, {
    paranoid: true  // Enables soft delete
});

// Soft delete (automatically sets deletedAt)
await User.destroy({ where: { id: userId } });

// Query automatically excludes deleted records
const users = await User.findAll();  // Only non-deleted

// Include deleted records
const allUsers = await User.findAll({
    paranoid: false  // Include deleted
});

// Restore deleted record
await User.restore({ where: { id: userId } });
```

**Explanation:**
Sequelize's `paranoid` option automatically handles soft deletes using a `deletedAt` timestamp. It's the easiest and most recommended approach.

## Real-World Examples

### Example 1: User Soft Delete

```javascript
const User = sequelize.define('User', {
    email: { type: DataTypes.STRING, unique: true },
    name: DataTypes.STRING,
    deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
        index: true
    }
}, {
    // Default scope excludes deleted users
    defaultScope: {
        where: { deleted_at: null }
    },
    // Named scope for all users (including deleted)
    scopes: {
        withDeleted: {
            where: {}
        },
        onlyDeleted: {
            where: { deleted_at: { [Op.ne]: null } }
        }
    }
});

// Soft delete user
app.delete('/users/:id', async (req, res) => {
    await User.update(
        { deleted_at: new Date() },
        { where: { id: req.params.id } }
    );
    res.json({ message: 'User deleted' });
});

// Get users (automatically excludes deleted)
app.get('/users', async (req, res) => {
    const users = await User.findAll();  // Only non-deleted
    res.json(users);
});

// Get all users including deleted
app.get('/users/all', async (req, res) => {
    const users = await User.scope('withDeleted').findAll();
    res.json(users);
});

// Restore deleted user
app.post('/users/:id/restore', async (req, res) => {
    await User.update(
        { deleted_at: null },
        { where: { id: req.params.id } }
    );
    res.json({ message: 'User restored' });
});
```

### Example 2: Cascade Soft Delete

```javascript
// When user is soft deleted, soft delete related orders
const User = sequelize.define('User', {
    email: DataTypes.STRING,
    name: DataTypes.STRING,
    deleted_at: DataTypes.DATE
});

const Order = sequelize.define('Order', {
    user_id: { type: DataTypes.INTEGER, references: { model: User, key: 'id' } },
    total: DataTypes.DECIMAL(10, 2),
    deleted_at: DataTypes.DATE
});

// Soft delete user and related orders
app.delete('/users/:id', async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        // Soft delete user
        await User.update(
            { deleted_at: new Date() },
            { where: { id: req.params.id }, transaction }
        );
        
        // Soft delete related orders
        await Order.update(
            { deleted_at: new Date() },
            { where: { user_id: req.params.id }, transaction }
        );
        
        await transaction.commit();
        res.json({ message: 'User and orders deleted' });
    } catch (error) {
        await transaction.rollback();
        res.status(500).json({ error: error.message });
    }
});
```

### Example 3: Permanent Delete After Period

```javascript
// Permanently delete records after 30 days
const cron = require('node-cron');

// Run daily at 2 AM
cron.schedule('0 2 * * *', async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Permanently delete records soft deleted more than 30 days ago
    await User.destroy({
        where: {
            deleted_at: {
                [Op.lt]: thirtyDaysAgo
            }
        },
        force: true  // Hard delete
    });
});
```

## Querying Soft Deleted Records

### Exclude Deleted (Default)

```javascript
// Automatically excludes deleted
const users = await User.findAll();

// Explicitly exclude deleted
const users = await User.findAll({
    where: { deleted_at: null }
});
```

### Include Deleted

```javascript
// Include deleted records
const allUsers = await User.findAll({
    where: {},
    paranoid: false  // Sequelize paranoid mode
});

// Or with custom field
const allUsers = await User.unscoped().findAll();
```

### Only Deleted

```javascript
// Get only deleted records
const deletedUsers = await User.findAll({
    where: { deleted_at: { [Op.ne]: null } }
});
```

## Best Practices

### 1. Use Timestamps

```javascript
// ✅ Good: Timestamp (knows when deleted)
deleted_at: DataTypes.DATE

// ❌ Less ideal: Boolean (doesn't know when)
deleted: DataTypes.BOOLEAN
```

### 2. Index the Deleted Field

```javascript
// Index for performance
deleted_at: {
    type: DataTypes.DATE,
    index: true  // Important for query performance
}
```

### 3. Use Default Scopes

```javascript
// Automatically exclude deleted in queries
defaultScope: {
    where: { deleted_at: null }
}
```

### 4. Handle Unique Constraints

```javascript
// Problem: Unique constraint on email
// If user deleted, can't create new user with same email

// Solution: Include deleted_at in unique constraint
const User = sequelize.define('User', {
    email: DataTypes.STRING,
    deleted_at: DataTypes.DATE
}, {
    indexes: [
        {
            unique: true,
            fields: ['email', 'deleted_at']  // Composite unique index
        }
    ]
});
```

## Common Mistakes

### ❌ Not Indexing Deleted Field

```javascript
// ❌ Bad: No index on deleted_at
deleted_at: DataTypes.DATE
// Queries will be slow

// ✅ Good: Indexed
deleted_at: {
    type: DataTypes.DATE,
    index: true
}
```

### ❌ Forgetting to Exclude in Queries

```javascript
// ❌ Bad: Includes deleted records
const users = await User.findAll();
// Might return deleted users if not using default scope

// ✅ Good: Explicitly exclude
const users = await User.findAll({
    where: { deleted_at: null }
});
```

## Summary

**Soft Delete Patterns:**

1. **Purpose**: Preserve data instead of physically deleting
2. **Patterns**: Boolean flag, timestamp, Sequelize paranoid
3. **Benefits**: Data recovery, auditing, compliance
4. **Best Practice**: Use timestamps, index deleted field, use default scopes
5. **Querying**: Exclude deleted by default, include when needed

**Key Takeaway:**
Soft deletes preserve data by marking records as deleted instead of removing them. Use timestamps (`deleted_at`) for better tracking, index the deleted field for performance, and use default scopes to automatically exclude deleted records. Sequelize's `paranoid` option provides built-in soft delete functionality.

**Implementation:**
- Use `deleted_at` timestamp
- Index the field
- Use default scopes
- Handle unique constraints
- Consider permanent deletion after period

**Next Steps:**
- Learn [Sequelize Deep Dive](sequelize_deep_dive.md) for ORM features
- Study [CRUD with Repository Pattern](crud_with_repository_pattern.md) for data access
- Master [Data Modeling](../03_data_layer_fundamentals/data_modeling_principles.md) for schema design

