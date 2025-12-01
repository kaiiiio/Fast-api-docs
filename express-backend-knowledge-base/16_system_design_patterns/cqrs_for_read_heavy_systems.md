# CQRS for Read-Heavy Systems: Complete Implementation Guide

CQRS (Command Query Responsibility Segregation) separates read and write operations, optimizing each independently. This guide covers CQRS implementation in Express.js applications.

## Understanding CQRS

**What is CQRS?** Separating read operations (queries) from write operations (commands) into different models and databases.

**Key principle:** Commands change state (writes) - optimized for consistency. Queries read data - optimized for performance.

## Implementation

### Write Model (Normalized)

```javascript
// Write model: Normalized structure
const Order = sequelize.define('Order', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

const OrderItem = sequelize.define('OrderItem', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    order_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false }
});
```

### Read Model (Denormalized)

```javascript
// Read model: Denormalized for fast queries
const OrderReadModel = sequelize.define('OrderReadModel', {
    id: { type: DataTypes.INTEGER, primaryKey: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false, index: true },
    user_email: { type: DataTypes.STRING(255), allowNull: false, index: true },  // Denormalized
    user_name: { type: DataTypes.STRING(255) },  // Denormalized
    status: { type: DataTypes.STRING(20), allowNull: false, index: true },
    total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, index: true },
    items: { type: DataTypes.JSONB, allowNull: false },  // Full item details
    created_at: { type: DataTypes.DATE, allowNull: false, index: true }
}, {
    indexes: [
        { fields: ['user_id', 'status'] },
        { fields: ['status', 'created_at'] }
    ]
});
```

## Command Service (Writes)

```javascript
class OrderCommandService {
    async createOrder(orderData) {
        // Create in write database
        const order = await Order.create({
            user_id: orderData.user_id,
            status: 'pending',
            created_at: new Date()
        });
        
        // Create order items
        for (const itemData of orderData.items) {
            await OrderItem.create({
                order_id: order.id,
                product_id: itemData.product_id,
                quantity: itemData.quantity,
                price: itemData.price
            });
        }
        
        // Update read model asynchronously
        await this.updateReadModel(order.id);
        
        return order;
    }
    
    async updateReadModel(orderId) {
        // Get order with relations
        const order = await Order.findByPk(orderId, {
            include: [
                { model: OrderItem, include: ['Product'] },
                { model: User }
            ]
        });
        
        // Update read model
        await OrderReadModel.upsert({
            id: order.id,
            user_id: order.user_id,
            user_email: order.User.email,
            user_name: order.User.name,
            status: order.status,
            total_amount: order.OrderItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
            items: order.OrderItems.map(item => ({
                product_id: item.product_id,
                product_name: item.Product.name,
                quantity: item.quantity,
                price: item.price
            })),
            created_at: order.created_at
        });
    }
}
```

## Query Service (Reads)

```javascript
class OrderQueryService {
    async getUserOrders(userId, status = null) {
        const where = { user_id: userId };
        if (status) {
            where.status = status;
        }
        
        // Fast query on denormalized read model
        return await OrderReadModel.findAll({
            where,
            order: [['created_at', 'DESC']]
        });
    }
    
    async getOrderById(orderId) {
        // Fast query, no joins needed
        return await OrderReadModel.findByPk(orderId);
    }
}
```

## Real-World Examples

### Example 1: E-Commerce Orders

```javascript
// Command: Create order
app.post('/orders', async (req, res) => {
    const order = await orderCommandService.createOrder(req.body);
    res.status(201).json(order);
});

// Query: Get user orders (fast!)
app.get('/users/:userId/orders', async (req, res) => {
    const orders = await orderQueryService.getUserOrders(req.params.userId);
    res.json(orders);
});
```

## Best Practices

1. **Separate Models**: Write (normalized) and read (denormalized)
2. **Async Updates**: Update read model asynchronously
3. **Event-Driven**: Use events for read model updates
4. **Optimize Reads**: Index read model appropriately
5. **Eventual Consistency**: Accept eventual consistency

## Summary

**CQRS for Read-Heavy Systems:**

1. **Purpose**: Optimize reads and writes independently
2. **Pattern**: Separate write and read models
3. **Benefits**: Fast reads, optimized writes
4. **Best Practice**: Async updates, eventual consistency
5. **Use Cases**: Read-heavy systems, complex queries

**Key Takeaway:**
CQRS separates read and write operations. Use normalized write models for consistency. Use denormalized read models for performance. Update read models asynchronously. Accept eventual consistency. Optimize read models with indexes.

**CQRS Strategy:**
- Separate write/read models
- Async read model updates
- Event-driven updates
- Optimize read models
- Accept eventual consistency

**Next Steps:**
- Learn [Event Sourcing](event_sourcing_vs_crud.md) for events
- Study [Outbox Pattern](outbox_pattern_for_transactional_events.md) for reliability
- Master [Saga Pattern](saga_pattern_for_distributed_tx.md) for transactions

