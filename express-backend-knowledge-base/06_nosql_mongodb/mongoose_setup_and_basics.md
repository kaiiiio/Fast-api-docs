# Mongoose Setup and Basics: Working with MongoDB in Express.js

Mongoose is the most popular MongoDB ODM (Object Document Mapper) for Node.js. This guide covers setting up Mongoose and working with MongoDB in Express.js applications.

## What is Mongoose?

**Mongoose** provides a schema-based solution to model application data for MongoDB. It includes built-in type casting, validation, query building, and business logic hooks.

### Why Mongoose?

```javascript
// Without Mongoose: Raw MongoDB driver
const { MongoClient } = require('mongodb');
const client = new MongoClient('mongodb://localhost:27017');
const db = client.db('mydb');
const users = db.collection('users');
await users.insertOne({ name: 'John', email: 'john@example.com' });

// With Mongoose: Schema-based, validated
const User = mongoose.model('User', userSchema);
const user = new User({ name: 'John', email: 'john@example.com' });
await user.save();  // Validated, type-cast, hooks executed
```

**Explanation:**
Mongoose provides schema validation, type casting, and middleware hooks that make working with MongoDB easier and safer.

## Installation and Setup

### Install Mongoose

```bash
npm install mongoose
```

### Basic Connection

```javascript
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/mydb', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Connection events
mongoose.connection.on('connected', () => {
    console.log('MongoDB connected');
});

mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
});
```

### Connection with Environment Variables

```javascript
// .env
// MONGODB_URI=mongodb://localhost:27017/mydb

require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
```

## Defining Schemas

### Basic Schema

```javascript
const mongoose = require('mongoose');
const { Schema } = mongoose;

// Define schema
const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    age: {
        type: Number,
        min: 0,
        max: 150
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Create model
const User = mongoose.model('User', userSchema);
```

### Schema with Validation

```javascript
const userSchema = new Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
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
        min: [0, 'Age cannot be negative'],
        max: [150, 'Age cannot exceed 150']
    },
    tags: {
        type: [String],
        validate: {
            validator: function(v) {
                return v.length <= 10;
            },
            message: 'Cannot have more than 10 tags'
        }
    }
});
```

## CRUD Operations

### Create

```javascript
// Create single document
const user = new User({
    name: 'John Doe',
    email: 'john@example.com',
    age: 30
});
await user.save();

// Or use create
const user = await User.create({
    name: 'John Doe',
    email: 'john@example.com',
    age: 30
});

// Create multiple
const users = await User.insertMany([
    { name: 'John', email: 'john@example.com' },
    { name: 'Jane', email: 'jane@example.com' }
]);
```

### Read

```javascript
// Find all
const users = await User.find();

// Find by condition
const user = await User.findOne({ email: 'john@example.com' });

// Find by ID
const user = await User.findById(userId);

// Find with conditions
const activeUsers = await User.find({ isActive: true });

// Find with projection
const users = await User.find({}, 'name email');  // Only name and email

// Find with limit and skip
const users = await User.find().limit(10).skip(20);
```

### Update

```javascript
// Update single document
await User.updateOne(
    { email: 'john@example.com' },
    { name: 'John Smith' }
);

// Update multiple
await User.updateMany(
    { isActive: false },
    { lastLogin: new Date() }
);

// Find and update
const user = await User.findOneAndUpdate(
    { email: 'john@example.com' },
    { name: 'John Smith' },
    { new: true }  // Return updated document
);

// Update by ID
await User.findByIdAndUpdate(userId, { name: 'John Smith' });
```

### Delete

```javascript
// Delete single
await User.deleteOne({ email: 'john@example.com' });

// Delete multiple
await User.deleteMany({ isActive: false });

// Find and delete
const user = await User.findOneAndDelete({ email: 'john@example.com' });

// Delete by ID
await User.findByIdAndDelete(userId);
```

## Real-World Examples

### Example 1: User Model with Express Routes

```javascript
// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        index: true
    },
    name: {
        type: String,
        required: true
    },
    passwordHash: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
});

module.exports = mongoose.model('User', userSchema);

// routes/users.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Get all users
router.get('/', async (req, res) => {
    try {
        const users = await User.find({ isActive: true });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user by ID
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create user
router.post('/', async (req, res) => {
    try {
        const user = new User(req.body);
        await user.save();
        res.status(201).json(user);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ error: 'Email already exists' });
        }
        res.status(400).json({ error: error.message });
    }
});

// Update user
router.put('/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete user
router.delete('/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
```

### Example 2: Nested Documents

```javascript
// User with embedded address
const addressSchema = new mongoose.Schema({
    street: String,
    city: String,
    state: String,
    zipCode: String
});

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    address: addressSchema  // Embedded document
});

const User = mongoose.model('User', userSchema);

// Create user with address
const user = new User({
    name: 'John Doe',
    email: 'john@example.com',
    address: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001'
    }
});
await user.save();
```

### Example 3: References (Relationships)

```javascript
// User references Orders
const userSchema = new mongoose.Schema({
    name: String,
    email: String
});

const orderSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',  // Reference to User model
        required: true
    },
    total: Number,
    items: [{
        product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        quantity: Number,
        price: Number
    }]
});

const User = mongoose.model('User', userSchema);
const Order = mongoose.model('Order', orderSchema);

// Populate references
const order = await Order.findById(orderId)
    .populate('user_id')  // Populate user
    .populate('items.product_id');  // Populate products

console.log(order.user_id.name);  // User name
console.log(order.items[0].product_id.name);  // Product name
```

## Middleware (Hooks)

### Pre-Save Hook

```javascript
const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    
    const bcrypt = require('bcrypt');
    this.password = await bcrypt.hash(this.password, 10);
    next();
});
```

### Post-Save Hook

```javascript
// Send welcome email after user creation
userSchema.post('save', async function(doc) {
    if (this.isNew) {
        // Send welcome email
        await sendWelcomeEmail(doc.email);
    }
});
```

## Best Practices

1. **Use Schemas**: Always define schemas for validation
2. **Index Fields**: Index frequently queried fields
3. **Handle Errors**: Proper error handling for validation and duplicates
4. **Use Middleware**: Use hooks for common operations (hashing, timestamps)
5. **Connection Management**: Handle connection lifecycle properly

## Summary

**Mongoose Setup and Basics:**

1. **Purpose**: Schema-based MongoDB ODM for Node.js
2. **Setup**: Connect to MongoDB, define schemas, create models
3. **Operations**: CRUD operations with validation
4. **Features**: Validation, type casting, middleware hooks
5. **Best Practice**: Use schemas, index fields, handle errors

**Key Takeaway:**
Mongoose provides a schema-based solution for working with MongoDB in Express.js. Define schemas with validation, create models, and use CRUD operations. Mongoose handles type casting, validation, and provides middleware hooks. Always define schemas for data validation and structure.

**Mongoose Features:**
- Schema definition with validation
- Type casting
- Middleware hooks
- Query building
- Population (references)

**Next Steps:**
- Learn [MongoDB Aggregation](../06_nosql_mongodb/aggregation_pipeline.md) for complex queries
- Study [Data Modeling for Document DBs](../06_nosql_mongodb/data_modeling_for_document_dbs.md) for schema design
- Master [Change Streams](../06_nosql_mongodb/change_streams_for_events.md) for real-time updates

