# Architecture Philosophy: Building Maintainable Express.js Applications

Express.js's flexibility allows for clean, maintainable architectures. Understanding these principles will help you build scalable, testable applications.

## Core Principles

### 1. **Modularity**

Organize code into focused, independent modules that have clear responsibilities.

**Anti-pattern:**
```javascript
// Everything in one file
app.get("/users/:user_id", (req, res) => {
    // Database logic
    db.query("SELECT * FROM users WHERE id = ?", [req.params.user_id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        // Business logic
        const user = results[0];
        if (user) {
            user.status = user.last_login > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
                ? "active" 
                : "inactive";
        }
        
        // Response formatting
        res.json({ id: user.id, name: user.name, status: user.status });
    });
});
```

**Good pattern:**
```javascript
// Separated concerns
// models/user.model.js
class User {
    constructor(id, name, status) {
        this.id = id;
        this.name = name;
        this.status = status;
    }
}

// repositories/userRepository.js
class UserRepository {
    async findById(userId) {
        // Only database logic
        const result = await db.query("SELECT * FROM users WHERE id = ?", [userId]);
        return result[0] || null;
    }
}

// services/userService.js
class UserService {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    
    async getUser(userId) {
        const user = await this.userRepository.findById(userId);
        if (user) {
            user.status = this._calculateStatus(user);
        }
        return user;
    }
    
    _calculateStatus(user) {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return user.last_login > thirtyDaysAgo ? "active" : "inactive";
    }
}

// routes/users.routes.js
router.get("/users/:user_id", async (req, res, next) => {
    try {
        const user = await userService.getUser(req.params.user_id);
        res.json(user);
    } catch (error) {
        next(error);
    }
});
```

**Benefits:** Each module has a single responsibility, easy to test individual components, easy to modify one part without affecting others, and clear dependencies between layers.

### 2. **Separation of Concerns**

Divide your application into distinct layers:

```
┌─────────────────────────────────────┐
│         API Layer (Routes)          │  ← HTTP handling, request/response
├─────────────────────────────────────┤
│        Service Layer (Business)     │  ← Business logic, orchestration
├─────────────────────────────────────┤
│     Repository Layer (Data Access)  │  ← Database operations
├─────────────────────────────────────┤
│          Domain Models              │  ← Data structures, validation
└─────────────────────────────────────┘
```

**API Layer** - Handles HTTP concerns (request/response, status codes, exceptions):

```javascript
// routes/users.routes.js
const express = require('express');
const router = express.Router();
const userService = require('../../services/userService');
const { validateUserCreate } = require('../../validators/userValidator');

// Route handler: Thin layer, delegates to service.
router.post("/", validateUserCreate, async (req, res, next) => {
    try {
        const user = await userService.createUser(req.body);  // Delegate to service
        res.status(201).json(user);
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message });  // Convert to HTTP error
        }
        next(error);
    }
});
```

**Service Layer** - Contains business logic (rules, orchestration, side effects):

```javascript
// services/userService.js
const userRepository = require('../repositories/userRepository');
const emailService = require('./emailService');

// UserService: Business logic layer (enforces rules, orchestrates operations).
class UserService {
    constructor(userRepository, emailService) {
        this.userRepository = userRepository;  // Injected dependencies
        this.emailService = emailService;
    }
    
    async createUser(userData) {
        // Business rules: Enforce domain constraints.
        const existingUser = await this.userRepository.findByEmail(userData.email);
        if (existingUser) {
            throw new ValidationError("Email already exists");
        }
        
        // Create user: Delegate to repository.
        const user = await this.userRepository.create(userData);
        
        // Side effects: Send welcome email (not part of core creation).
        await this.emailService.sendWelcomeEmail(user.email);
        
        return user;
    }
}

module.exports = new UserService(userRepository, emailService);
```

**Repository Layer** - Handles data access (database operations only):

```javascript
// repositories/userRepository.js
const { User } = require('../models');

// UserRepository: Data access layer (only database operations, no business logic).
class UserRepository {
    constructor(db) {
        this.db = db;  // Injected database connection
    }
    
    async create(userData) {
        // Database operation: Create record.
        const result = await this.db.query(
            "INSERT INTO users (email, name) VALUES (?, ?)",
            [userData.email, userData.name]
        );
        return await this.findById(result.insertId);
    }
    
    async findByEmail(email) {
        // Database query: Check existence.
        const result = await this.db.query(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );
        return result[0] || null;
    }
    
    async findById(id) {
        const result = await this.db.query(
            "SELECT * FROM users WHERE id = ?",
            [id]
        );
        return result[0] || null;
    }
}

module.exports = new UserRepository(db);
```

### 3. **Testability**

Design components that are easy to test in isolation.

**Key principles:**

1. **Dependency Injection**: Pass dependencies rather than creating them
```javascript
// ✅ Testable - dependencies injected
class UserService {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
}

// ❌ Hard to test - creates own dependencies
class UserService {
    constructor() {
        this.userRepository = new UserRepository(require('db'));
    }
}
```

2. **Interface Abstractions**: Use classes/interfaces for dependencies
```javascript
// interfaces/userRepository.js
class IUserRepository {
    async findById(userId) {
        throw new Error('Not implemented');
    }
}

// services/userService.js
class UserService {
    constructor(userRepository) {
        this.userRepository = userRepository;  // Accepts any implementation
    }
}

// tests/mocks/mockUserRepository.js
class MockUserRepository extends IUserRepository {
    async findById(userId) {
        return { id: userId, name: "Test User" };
    }
}
```

3. **Pure Functions**: Business logic without side effects
```javascript
// ✅ Pure function - easy to test
function calculateDiscount(price, userTier) {
    const discounts = { gold: 0.2, silver: 0.1, bronze: 0.05 };
    return price * (discounts[userTier] || 0);
}

// Test
test('calculateDiscount', () => {
    expect(calculateDiscount(100, 'gold')).toBe(20);
});
```

### 4. **Configuration Management**

Separate configuration from code:

```javascript
// config/index.js
require('dotenv').config();

// Configuration: Centralized config management.
const config = {
    appName: process.env.APP_NAME || "My API",
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    secretKey: process.env.SECRET_KEY,
    debug: process.env.NODE_ENV === 'development',
};

module.exports = config;
```

**Benefits:** Environment-specific configs (dev, staging, prod), secrets not in code, and easy to change without redeploying.

### 5. **Error Handling**

Centralized error handling with clear error types:

```javascript
// utils/errors.js
class ApplicationError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        Error.captureStackTrace(this, this.constructor);
    }
}

class NotFoundError extends ApplicationError {
    constructor(message = 'Resource not found') {
        super(message, 404);
    }
}

class ValidationError extends ApplicationError {
    constructor(message = 'Validation error') {
        super(message, 400);
    }
}

module.exports = { ApplicationError, NotFoundError, ValidationError };
```

```javascript
// middleware/errorHandler.js
const { ApplicationError, NotFoundError, ValidationError } = require('../utils/errors');

// Error handler: Centralized error handling middleware.
function errorHandler(err, req, res, next) {
    console.error(err);
    
    // Application errors: Return appropriate status code.
    if (err instanceof ApplicationError) {
        return res.status(err.statusCode).json({
            error: err.message,
            name: err.name
        });
    }
    
    // Server errors: Don't expose internal errors.
    res.status(500).json({
        error: 'Internal server error'
    });
}

module.exports = errorHandler;
```

### 6. **Dependency Injection**

Express.js doesn't have built-in DI like FastAPI, but you can implement it:

```javascript
// utils/dependencies.js
const db = require('../config/db');
const userRepository = require('../repositories/userRepository');
const userService = require('../services/userService');

// Dependency injection: Create and inject dependencies.
function getUserRepository() {
    return new userRepository(db);
}

function getUserService() {
    return new userService(getUserRepository());
}

// Middleware: Inject dependencies into request.
function injectDependencies(req, res, next) {
    req.userService = getUserService();
    next();
}

module.exports = { injectDependencies };
```

```javascript
// routes/users.routes.js
const { injectDependencies } = require('../utils/dependencies');

router.use(injectDependencies);  // Inject dependencies for all routes

router.get("/users/:user_id", async (req, res, next) => {
    try {
        const user = await req.userService.getUser(req.params.user_id);
        res.json(user);
    } catch (error) {
        next(error);
    }
});
```

**Benefits:** Automatic lifecycle management, easy to swap implementations (e.g., test vs production), and clear dependency graph.

## Recommended Project Structure

```
src/
├── app.js                      # Application entry point
├── config/                     # Core functionality
│   ├── index.js               # Configuration
│   ├── db.js                  # Database connection
│   └── logger.js              # Logging
├── api/                        # API routes
│   ├── v1/
│   │   ├── index.js           # Router aggregation
│   │   └── routes/           # Route handlers
│   │       ├── users.routes.js
│   │       └── products.routes.js
│   └── middleware/            # Express middleware
│       ├── auth.middleware.js
│       └── error.middleware.js
├── models/                     # Database models
│   ├── user.model.js
│   └── product.model.js
├── repositories/               # Data access layer
│   ├── userRepository.js
│   └── productRepository.js
├── services/                   # Business logic
│   ├── userService.js
│   └── productService.js
├── validators/                 # Validation schemas
│   ├── userValidator.js
│   └── productValidator.js
├── utils/                      # Utility functions
│   ├── errors.js
│   └── helpers.js
└── tests/                      # Test suite
    ├── unit/
    ├── integration/
    └── setup.js
```

## Design Patterns for Express.js

### 1. Repository Pattern

Abstracts data access logic:

```javascript
// repositories/baseRepository.js
class BaseRepository {
    constructor(model) {
        this.model = model;
    }
    
    async findById(id) {
        return await this.model.findByPk(id);
    }
    
    async findAll() {
        return await this.model.findAll();
    }
    
    async create(data) {
        return await this.model.create(data);
    }
}

// repositories/userRepository.js
class UserRepository extends BaseRepository {
    constructor(User) {
        super(User);
        this.User = User;
    }
    
    async findByEmail(email) {
        return await this.User.findOne({ where: { email } });
    }
}
```

### 2. Service Layer Pattern

Encapsulates business logic:

```javascript
class UserService {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    
    async getActiveUser(userId) {
        const user = await this.userRepository.findById(userId);
        if (!user || !user.is_active) {
            throw new NotFoundError("User not found or inactive");
        }
        return user;
    }
}
```

### 3. Middleware Pattern

Express.js's middleware system:

```javascript
// Middleware: Authentication check
function authenticateToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
        const user = verifyToken(token);
        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid token' });
    }
}

// Use middleware
router.get("/profile", authenticateToken, async (req, res) => {
    res.json({ user: req.user });
});
```

## Testing Strategy

With good architecture, testing becomes straightforward:

```javascript
// tests/unit/services/userService.test.js
const UserService = require('../../../services/userService');
const MockUserRepository = require('../../mocks/mockUserRepository');

describe('UserService', () => {
    let userService;
    let mockRepository;
    
    beforeEach(() => {
        mockRepository = new MockUserRepository();
        userService = new UserService(mockRepository);
    });
    
    test('getActiveUser returns user when found and active', async () => {
        // Arrange
        mockRepository.users = [{ id: 1, is_active: true }];
        
        // Act
        const user = await userService.getActiveUser(1);
        
        // Assert
        expect(user.id).toBe(1);
        expect(user.is_active).toBe(true);
    });
    
    test('getActiveUser throws NotFoundError when user not found', async () => {
        // Arrange
        mockRepository.users = [];
        
        // Act & Assert
        await expect(userService.getActiveUser(999))
            .rejects.toThrow('User not found or inactive');
    });
});
```

## Summary

Express.js architecture philosophy emphasizes:

1. **Modularity** - Focused, independent components
2. **Separation of Concerns** - Clear layer boundaries
3. **Testability** - Easy to test in isolation
4. **Dependency Injection** - Managed dependencies
5. **Configuration Management** - Separated from code
6. **Error Handling** - Centralized and consistent

By following these principles, you build applications that are:
- ✅ Easy to understand and navigate
- ✅ Easy to test and debug
- ✅ Easy to modify and extend
- ✅ Production-ready and maintainable

---

## 🎯 Interview Questions: Architecture & Design Patterns

### Q1: Explain the separation of concerns in Express.js. How would you structure a large-scale application?

**Answer:**

**Separation of Concerns** means each layer has a **single responsibility**. This makes code maintainable, testable, and scalable.

**Typical Architecture:**

```
┌─────────────────────────────────────────┐
│         Route Layer (Controllers)       │
│  - Handle HTTP requests/responses       │
│  - Input validation                     │
│  - Call service layer                   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         Service Layer (Business Logic)  │
│  - Business rules                       │
│  - Data transformation                  │
│  - Orchestration                        │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      Repository Layer (Data Access)     │
│  - Database queries                     │
│  - Data mapping                         │
│  - Caching logic                        │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│            Database Layer               │
│  - PostgreSQL, MongoDB, etc.          │
└─────────────────────────────────────────┘
```

**Implementation:**

```javascript
// 1. Route Layer (controllers/user.controller.js)
const userService = require('../services/user.service');

exports.getUser = async (req, res, next) => {
    try {
        const user = await userService.getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        next(error);
    }
};

// 2. Service Layer (services/user.service.js)
const userRepository = require('../repositories/user.repository');

exports.getUserById = async (userId) => {
    // Business logic
    if (!userId) {
        throw new Error('User ID required');
    }
    
    const user = await userRepository.findById(userId);
    
    // Transform data
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        // Don't expose password
    };
};

// 3. Repository Layer (repositories/user.repository.js)
const { Pool } = require('pg');
const pool = new Pool();

exports.findById = async (userId) => {
    const result = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
    );
    return result.rows[0];
};
```

**Benefits:**

```
Separation of Concerns:
├─ Testability: Test each layer independently
├─ Maintainability: Changes isolated to one layer
├─ Reusability: Services can be reused
├─ Scalability: Easy to add new features
└─ Team Collaboration: Different teams work on different layers
```

---

### Q2: What is Dependency Injection in Express.js? How does it improve testability?

**Answer:**

**Dependency Injection (DI)** means **passing dependencies** to functions/classes instead of creating them inside. This makes code **testable** and **flexible**.

**Without DI (Tight Coupling):**

```javascript
// ❌ Problem: Hard to test, tight coupling
const db = require('./db'); // Direct dependency

exports.getUser = async (req, res) => {
    const user = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    res.json(user);
};

// Testing is hard - need real database
```

**With DI (Loose Coupling):**

```javascript
// ✅ Solution: Inject dependencies
class UserService {
    constructor(userRepository) {
        this.userRepository = userRepository; // Injected
    }
    
    async getUserById(id) {
        return await this.userRepository.findById(id);
    }
}

// Usage
const userRepository = require('./repositories/user.repository');
const userService = new UserService(userRepository);

// Testing: Inject mock repository
const mockRepository = {
    findById: jest.fn().mockResolvedValue({ id: 1, name: 'John' })
};
const userService = new UserService(mockRepository);
```

**Express.js DI Pattern:**

```javascript
// Dependency container
class Container {
    constructor() {
        this.services = {};
    }
    
    register(name, factory) {
        this.services[name] = factory;
    }
    
    get(name) {
        return this.services[name]();
    }
}

// Setup
const container = new Container();

container.register('userRepository', () => require('./repositories/user.repository'));
container.register('userService', () => {
    const userRepository = container.get('userRepository');
    return new UserService(userRepository);
});

// Usage in routes
app.get('/users/:id', async (req, res) => {
    const userService = container.get('userService');
    const user = await userService.getUserById(req.params.id);
    res.json(user);
});
```

**Benefits:**

```
Dependency Injection:
├─ Testability: Easy to mock dependencies
├─ Flexibility: Swap implementations easily
├─ Maintainability: Clear dependencies
└─ Reusability: Services can be reused
```

---

### Q3: Explain the Repository Pattern. Why use it in Express.js applications?

**Answer:**

The **Repository Pattern** abstracts data access logic, making it easier to **swap databases** and **test** code.

**Without Repository Pattern:**

```javascript
// ❌ Problem: Database logic in controllers
app.get('/users/:id', async (req, res) => {
    const result = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [req.params.id]
    );
    res.json(result.rows[0]);
});

// Hard to test, hard to swap database
```

**With Repository Pattern:**

```javascript
// Repository (repositories/user.repository.js)
class UserRepository {
    constructor(db) {
        this.db = db;
    }
    
    async findById(id) {
        const result = await this.db.query(
            'SELECT * FROM users WHERE id = $1',
            [id]
        );
        return result.rows[0];
    }
    
    async findByEmail(email) {
        const result = await this.db.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        return result.rows[0];
    }
    
    async create(userData) {
        const result = await this.db.query(
            'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
            [userData.name, userData.email]
        );
        return result.rows[0];
    }
}

// Usage
const userRepository = new UserRepository(pool);

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

**Testing:**

```javascript
// Mock repository for testing
const mockRepository = {
    findById: jest.fn().mockResolvedValue({ id: 1, name: 'John' }),
    findByEmail: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: 1, name: 'John' })
};

// Test service with mock
const userService = new UserService(mockRepository);
const user = await userService.getUserById(1);
expect(mockRepository.findById).toHaveBeenCalledWith(1);
```

---

### Q4: How would you design a modular Express.js application for a team of 10+ developers?

**Answer:**

Design a **modular architecture** with clear boundaries and **independent modules**.

**Modular Structure:**

```
project/
├── src/
│   ├── modules/
│   │   ├── users/
│   │   │   ├── controllers/
│   │   │   │   └── user.controller.js
│   │   │   ├── services/
│   │   │   │   └── user.service.js
│   │   │   ├── repositories/
│   │   │   │   └── user.repository.js
│   │   │   ├── routes/
│   │   │   │   └── user.routes.js
│   │   │   ├── models/
│   │   │   │   └── user.model.js
│   │   │   └── index.js
│   │   ├── orders/
│   │   │   └── ... (same structure)
│   │   └── products/
│   │       └── ... (same structure)
│   ├── shared/
│   │   ├── middleware/
│   │   ├── utils/
│   │   └── config/
│   └── app.js
└── package.json
```

**Module Definition:**

```javascript
// modules/users/index.js
const userRoutes = require('./routes/user.routes');
const userService = require('./services/user.service');
const userRepository = require('./repositories/user.repository');

module.exports = {
    routes: userRoutes,
    service: userService,
    repository: userRepository
};
```

**App Integration:**

```javascript
// app.js
const express = require('express');
const app = express();

// Load modules
const userModule = require('./modules/users');
const orderModule = require('./modules/orders');
const productModule = require('./modules/products');

// Register routes
app.use('/api/users', userModule.routes);
app.use('/api/orders', orderModule.routes);
app.use('/api/products', productModule.routes);
```

**Team Collaboration:**

```
Team Structure:
├─ Team 1: Users Module (3 developers)
├─ Team 2: Orders Module (3 developers)
├─ Team 3: Products Module (2 developers)
└─ Team 4: Shared/Infrastructure (2 developers)

Benefits:
├─ Independent Development: Teams work in parallel
├─ Clear Ownership: Each module has owners
├─ Easy Testing: Test modules independently
└─ Scalable: Add new modules easily
```

**Communication Between Modules:**

```javascript
// Use events or service calls
const EventEmitter = require('events');
const eventBus = new EventEmitter();

// Users module
eventBus.emit('user.created', { userId: 1, email: 'user@example.com' });

// Orders module
eventBus.on('user.created', (data) => {
    // Create welcome order, etc.
});
```

---

### Q5: Explain Clean Architecture in Express.js. How does it differ from traditional MVC?

**Answer:**

**Clean Architecture** organizes code in **layers** with **dependency inversion** - inner layers don't depend on outer layers.

**Traditional MVC:**

```
┌─────────────────────────────────┐
│         Controller              │
│  (depends on Model & View)      │
└──────────────┬──────────────────┘
               │
    ┌──────────┴──────────┐
    │                      │
    ▼                      ▼
┌─────────┐          ┌─────────┐
│  Model  │          │  View   │
│  (DB)   │          │  (UI)   │
└─────────┘          └─────────┘
```

**Clean Architecture:**

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│  (Controllers, Routes, Middleware)     │
└──────────────┬──────────────────────────┘
               │ depends on
               ▼
┌─────────────────────────────────────────┐
│         Application Layer               │
│  (Use Cases, Services)                 │
└──────────────┬──────────────────────────┘
               │ depends on
               ▼
┌─────────────────────────────────────────┐
│         Domain Layer                    │
│  (Entities, Business Rules)            │
└──────────────┬──────────────────────────┘
               │ depends on
               ▼
┌─────────────────────────────────────────┐
│         Infrastructure Layer            │
│  (Database, External APIs)              │
└─────────────────────────────────────────┘
```

**Express.js Implementation:**

```javascript
// 1. Domain Layer (entities/user.entity.js)
class User {
    constructor(id, name, email) {
        this.id = id;
        this.name = name;
        this.email = email;
    }
    
    isValid() {
        return this.email.includes('@');
    }
}

// 2. Application Layer (use-cases/get-user.use-case.js)
class GetUserUseCase {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    
    async execute(userId) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    }
}

// 3. Infrastructure Layer (repositories/user.repository.js)
class UserRepository {
    constructor(db) {
        this.db = db;
    }
    
    async findById(id) {
        const result = await this.db.query('SELECT * FROM users WHERE id = $1', [id]);
        return result.rows[0];
    }
}

// 4. Presentation Layer (controllers/user.controller.js)
class UserController {
    constructor(getUserUseCase) {
        this.getUserUseCase = getUserUseCase;
    }
    
    async getUser(req, res) {
        try {
            const user = await this.getUserUseCase.execute(req.params.id);
            res.json(user);
        } catch (error) {
            res.status(404).json({ error: error.message });
        }
    }
}
```

**Key Differences:**

| Aspect | MVC | Clean Architecture |
|--------|-----|-------------------|
| **Dependencies** | Controller → Model | Inner → Outer (inverted) |
| **Testability** | Hard (DB coupling) | Easy (interfaces) |
| **Flexibility** | Limited | High (swap implementations) |
| **Complexity** | Low | Higher |
| **Use Case** | Small apps | Large, complex apps |

---

### Q6: How do you handle configuration management in a large Express.js application?

**Answer:**

**Configuration management** separates **environment-specific settings** from code.

**Basic Approach:**

```javascript
// config/index.js
module.exports = {
    port: process.env.PORT || 3000,
    db: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        name: process.env.DB_NAME || 'mydb',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD
    },
    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    }
};
```

**Advanced: Environment-Specific Config:**

```javascript
// config/development.js
module.exports = {
    db: {
        host: 'localhost',
        port: 5432
    },
    logging: {
        level: 'debug'
    }
};

// config/production.js
module.exports = {
    db: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        ssl: true
    },
    logging: {
        level: 'error'
    }
};

// config/index.js
const env = process.env.NODE_ENV || 'development';
const config = require(`./${env}`);

module.exports = config;
```

**Validation:**

```javascript
// config/validate.js
const required = ['DB_HOST', 'DB_PASSWORD', 'JWT_SECRET'];

function validateConfig() {
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing required env vars: ${missing.join(', ')}`);
    }
}

validateConfig();
```

**Best Practices:**

```
Configuration Management:
├─ Environment Variables: Use for secrets
├─ Config Files: Use for structure
├─ Validation: Validate on startup
├─ Defaults: Provide sensible defaults
└─ Type Safety: Use TypeScript for types
```

---

## Summary

These interview questions cover:
- ✅ Separation of concerns and layered architecture
- ✅ Dependency injection and testability
- ✅ Repository pattern and data access abstraction
- ✅ Modular architecture for large teams
- ✅ Clean Architecture vs MVC
- ✅ Configuration management strategies

Master these for senior-level interviews focusing on architecture and design patterns.

