# CRUD with Repository Pattern: Complete E-Commerce Guide

This guide teaches the Repository pattern using our e-commerce example. We'll build complete repositories for Users, Products, Orders, and OrderItems, showing every operation from scratch.

## Understanding the Repository Pattern

**The Problem:** Without repositories, database code is scattered everywhere. If you change databases, you have to update code in many places.

**The Solution:** Repository pattern centralizes all database operations in one place. Your business logic (services) calls repositories, and repositories handle all database details.

**Benefits:** All database code in one place, easy to test (mock repositories), easy to switch databases, and clean separation of concerns.

## Our E-Commerce Models

We'll work with these tables throughout (using Sequelize):

```javascript
// User model: Base user entity.
const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    email: {
        type: DataTypes.STRING(255),
        unique: true,
        allowNull: false
    },
    full_name: {
        type: DataTypes.STRING(200),
        allowNull: false
    }
});

// Product model: Product entity.
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
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    stock_quantity: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
});

// Order model: Order entity with relationships.
const Order = sequelize.define('Order', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' }
    },
    total_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    status: {
        type: DataTypes.STRING(50),
        defaultValue: 'pending'
    }
});

// Define relationships
User.hasMany(Order, { foreignKey: 'user_id' });
Order.belongsTo(User, { foreignKey: 'user_id' });
```

## Step 1: Base Repository Interface

Let's start by defining what a repository should do. This is our contract:

```javascript
// BaseRepository: Abstract base class for all repositories.
class BaseRepository {
    constructor(model) {
        this.model = model;  // Sequelize model
    }
    
    // getById: Get a record by its primary key.
    async getById(id) {
        return await this.model.findByPk(id);
    }
    
    // getAll: Get all records with pagination.
    async getAll(options = {}) {
        const { limit = 100, offset = 0, where = {} } = options;
        return await this.model.findAll({
            where,
            limit,
            offset,
            order: [['id', 'DESC']]
        });
    }
    
    // create: Create a new record.
    async create(data) {
        return await this.model.create(data);
    }
    
    // update: Update an existing record.
    async update(id, data) {
        const record = await this.model.findByPk(id);
        if (!record) {
            throw new Error('Record not found');
        }
        return await record.update(data);
    }
    
    // delete: Delete a record by ID.
    async delete(id) {
        const record = await this.model.findByPk(id);
        if (!record) {
            throw new Error('Record not found');
        }
        await record.destroy();
        return true;
    }
}

module.exports = BaseRepository;
```

## Step 2: User Repository - Complete Implementation

Let's build a complete User repository step by step:

```javascript
const BaseRepository = require('./baseRepository');
const { User } = require('../models');

// UserRepository: Repository for User operations, handles all database interactions.
class UserRepository extends BaseRepository {
    constructor() {
        super(User);  // Pass User model to base repository
    }
    
    // CREATE operations
    
    // create: Create a new user.
    async create(email, fullName) {
        /**
         * Create a new user.
         * 
         * @param {string} email - User's email address (must be unique)
         * @param {string} fullName - User's full name
         * @returns {Object} Created User object with ID assigned
         * 
         * @example
         * const user = await repo.create("john@example.com", "John Doe");
         * console.log(user.id);  // Auto-generated ID
         */
        // Create the user: Sequelize handles ID generation.
        const user = await this.model.create({
            email: email,
            full_name: fullName
        });
        
        return user;
    }
    
    // createMultiple: Create multiple users in one transaction.
    async createMultiple(usersData) {
        /**
         * Create multiple users efficiently.
         * 
         * @param {Array} usersData - Array of {email, full_name} objects
         * @returns {Array} Created users
         */
        return await this.model.bulkCreate(usersData);  // Bulk insert
    }
    
    // READ operations
    
    // getById: Get user by ID (inherited from BaseRepository, but can override).
    async getById(userId) {
        return await this.model.findByPk(userId);
    }
    
    // findByEmail: Find user by email (custom query method).
    async findByEmail(email) {
        /**
         * Find user by email address.
         * 
         * @param {string} email - Email to search for
         * @returns {Object|null} User object or null if not found
         */
        return await this.model.findOne({
            where: { email: email }  // Find by email field
        });
    }
    
    // getAll: Get all users with pagination (inherited, but can customize).
    async getAll(skip = 0, limit = 100) {
        return await this.model.findAll({
            limit: limit,
            offset: skip,
            order: [['created_at', 'DESC']]  // Order by creation date
        });
    }
    
    // getWithOrders: Get user with their orders (eager loading).
    async getWithOrders(userId) {
        /**
         * Get user with all their orders (includes related data).
         * 
         * @param {number} userId - User ID
         * @returns {Object} User with orders array
         */
        return await this.model.findByPk(userId, {
            include: [{
                model: Order,  // Include Order model
                as: 'orders'  // Alias defined in association
            }]
        });
    }
    
    // UPDATE operations
    
    // update: Update user (inherited from BaseRepository).
    async update(userId, updates) {
        /**
         * Update user fields.
         * 
         * @param {number} userId - User ID to update
         * @param {Object} updates - Fields to update {email, full_name, etc.}
         * @returns {Object} Updated user object
         */
        const user = await this.model.findByPk(userId);
        if (!user) {
            throw new Error('User not found');
        }
        
        return await user.update(updates);  // Sequelize update method
    }
    
    // DELETE operations
    
    // delete: Delete user (inherited from BaseRepository).
    async delete(userId) {
        const user = await this.model.findByPk(userId);
        if (!user) {
            throw new Error('User not found');
        }
        
        await user.destroy();  // Soft delete or hard delete (depends on model config)
        return true;
    }
    
    // SEARCH operations
    
    // search: Search users by name or email.
    async search(query, limit = 20) {
        /**
         * Search users by name or email.
         * 
         * @param {string} query - Search term
         * @param {number} limit - Maximum results
         * @returns {Array} Matching users
         */
        const { Op } = require('sequelize');  // Sequelize operators
        
        return await this.model.findAll({
            where: {
                [Op.or]: [
                    { full_name: { [Op.like]: `%${query}%` } },  // Search in name
                    { email: { [Op.like]: `%${query}%` } }  // Search in email
                ]
            },
            limit: limit
        });
    }
}

module.exports = new UserRepository();
```

## Step 3: Using the Repository in Services

```javascript
const userRepository = require('../repositories/userRepository');
const { NotFoundError, ValidationError } = require('../utils/errors');

// UserService: Business logic layer, uses repository for data access.
class UserService {
    // getUserById: Get user with business logic.
    async getUserById(userId) {
        const user = await userRepository.getById(userId);
        
        if (!user) {
            throw new NotFoundError('User not found');
        }
        
        return user;
    }
    
    // createUser: Create user with validation.
    async createUser(userData) {
        // Business validation: Check if email already exists.
        const existingUser = await userRepository.findByEmail(userData.email);
        if (existingUser) {
            throw new ValidationError('Email already exists');
        }
        
        // Create user: Delegate to repository.
        return await userRepository.create(userData.email, userData.full_name);
    }
    
    // updateUser: Update user with validation.
    async updateUser(userId, updates) {
        const user = await userRepository.getById(userId);
        if (!user) {
            throw new NotFoundError('User not found');
        }
        
        // Business rule: Don't allow email change if new email exists.
        if (updates.email && updates.email !== user.email) {
            const emailExists = await userRepository.findByEmail(updates.email);
            if (emailExists) {
                throw new ValidationError('Email already in use');
            }
        }
        
        return await userRepository.update(userId, updates);
    }
}

module.exports = new UserService();
```

## Step 4: Using in Controllers

```javascript
const userService = require('../services/userService');
const { successResponse, errorResponse } = require('../utils/response');

// UserController: HTTP layer, calls service for business logic.
class UserController {
    // GET /users/:id: Get user by ID.
    async getUserById(req, res, next) {
        try {
            const { id } = req.params;
            const user = await userService.getUserById(parseInt(id));
            res.json(successResponse(user));
        } catch (error) {
            if (error instanceof NotFoundError) {
                return res.status(404).json(errorResponse(error.message));
            }
            next(error);
        }
    }
    
    // POST /users: Create new user.
    async createUser(req, res, next) {
        try {
            const user = await userService.createUser(req.body);
            res.status(201).json(successResponse(user));
        } catch (error) {
            if (error instanceof ValidationError) {
                return res.status(400).json(errorResponse(error.message));
            }
            next(error);
        }
    }
}

module.exports = new UserController();
```

## Best Practices

### 1. **Repository Returns Models**
Repositories return Sequelize models, services convert to DTOs:

```javascript
// Repository returns model
const user = await userRepository.getById(1);

// Service converts to DTO
const userDTO = {
    id: user.id,
    email: user.email,
    name: user.full_name
};
```

### 2. **Error Handling**
Repositories throw errors, services catch and convert:

```javascript
// Repository throws generic error
if (!user) {
    throw new Error('User not found');
}

// Service converts to domain error
try {
    const user = await userRepository.getById(id);
} catch (error) {
    throw new NotFoundError('User not found');
}
```

### 3. **Transactions**
Use transactions for multi-step operations:

```javascript
const { sequelize } = require('../models');

async function createUserWithProfile(userData, profileData) {
    const transaction = await sequelize.transaction();
    
    try {
        const user = await userRepository.create(userData, { transaction });
        const profile = await profileRepository.create(
            { ...profileData, user_id: user.id },
            { transaction }
        );
        
        await transaction.commit();
        return { user, profile };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}
```

## Summary

Repository pattern in Express.js requires: Creating base repository for common CRUD operations, extending base repository for entity-specific methods, using repositories in services for business logic, and keeping controllers thin (just HTTP handling). This pattern provides clean separation of concerns, easy testing, and database independence.

---

## 🎯 Interview Questions: Repository Pattern & CRUD Operations

### Q1: Explain the Repository Pattern. Why is it beneficial in Express.js applications?

**Answer:**

**Repository Pattern** = Abstraction layer between business logic and data access. It hides database implementation details.

**Without Repository:**

```javascript
// ❌ Problem: Database logic in controllers
app.get('/users/:id', async (req, res) => {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    res.json(result.rows[0]);
});

// Hard to test, hard to swap database
```

**With Repository:**

```javascript
// ✅ Solution: Repository abstracts data access
class UserRepository {
    async findById(id) {
        return await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    }
}

app.get('/users/:id', async (req, res) => {
    const user = await userRepository.findById(req.params.id);
    res.json(user);
});
```

**Benefits:**

```
Repository Pattern:
├─ Abstraction: Hide database details
├─ Testability: Mock repository for tests
├─ Flexibility: Swap PostgreSQL → MongoDB easily
├─ Reusability: Use in multiple services
└─ Maintainability: Database changes in one place
```

**Base Repository:**

```javascript
class BaseRepository {
    constructor(model) {
        this.model = model;
    }
    
    async findAll(options = {}) {
        return await this.model.findAll(options);
    }
    
    async findById(id) {
        return await this.model.findByPk(id);
    }
    
    async create(data) {
        return await this.model.create(data);
    }
    
    async update(id, data) {
        const record = await this.findById(id);
        if (!record) throw new Error('Not found');
        return await record.update(data);
    }
    
    async delete(id) {
        const record = await this.findById(id);
        if (!record) throw new Error('Not found');
        return await record.destroy();
    }
}

// Extend for specific entities
class UserRepository extends BaseRepository {
    constructor() {
        super(User);
    }
    
    async findByEmail(email) {
        return await this.model.findOne({ where: { email } });
    }
}
```

---

### Q2: How do you implement pagination with the Repository Pattern? Compare offset vs cursor-based pagination.

**Answer:**

**Offset-Based Pagination:**

```javascript
class UserRepository extends BaseRepository {
    async findAllPaginated(page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        
        const { count, rows } = await this.model.findAndCountAll({
            limit,
            offset,
            order: [['created_at', 'DESC']]
        });
        
        return {
            data: rows,
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        };
    }
}

// Usage
app.get('/users', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await userRepository.findAllPaginated(page, limit);
    res.json(result);
});
```

**Cursor-Based Pagination:**

```javascript
class UserRepository extends BaseRepository {
    async findAllCursor(cursor, limit = 10) {
        const where = cursor ? { id: { [Op.gt]: cursor } } : {};
        
        const users = await this.model.findAll({
            where,
            limit: limit + 1, // Fetch one extra to check if more exists
            order: [['id', 'ASC']]
        });
        
        const hasMore = users.length > limit;
        const data = hasMore ? users.slice(0, limit) : users;
        const nextCursor = hasMore ? data[data.length - 1].id : null;
        
        return {
            data,
            cursor: nextCursor,
            hasMore
        };
    }
}

// Usage
app.get('/users', async (req, res) => {
    const cursor = req.query.cursor;
    const limit = parseInt(req.query.limit) || 10;
    const result = await userRepository.findAllCursor(cursor, limit);
    res.json(result);
});
```

**Comparison:**

| Aspect | Offset | Cursor |
|--------|--------|--------|
| **Performance** | Degrades with large offset | Consistent |
| **Consistency** | Can skip/duplicate items | Stable |
| **Complexity** | Simple | More complex |
| **Use Case** | Small datasets | Large datasets |

---

### Q3: How do you handle transactions with the Repository Pattern?

**Answer:**

**Transaction Support:**

```javascript
class BaseRepository {
    async create(data, options = {}) {
        return await this.model.create(data, options);
    }
    
    async update(id, data, options = {}) {
        const record = await this.findById(id, options);
        if (!record) throw new Error('Not found');
        return await record.update(data, options);
    }
}

// Service uses transaction
class UserService {
    constructor(userRepository, profileRepository) {
        this.userRepository = userRepository;
        this.profileRepository = profileRepository;
    }
    
    async createUserWithProfile(userData, profileData) {
        const transaction = await sequelize.transaction();
        
        try {
            const user = await this.userRepository.create(userData, { transaction });
            const profile = await this.profileRepository.create(
                { ...profileData, user_id: user.id },
                { transaction }
            );
            
            await transaction.commit();
            return { user, profile };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}
```

---

## Summary

These interview questions cover:
- ✅ Repository Pattern benefits and implementation
- ✅ Pagination strategies (offset vs cursor)
- ✅ Transaction handling with repositories
- ✅ Base repository design
- ✅ Testing with repositories

Master these for senior-level interviews focusing on data access patterns.

