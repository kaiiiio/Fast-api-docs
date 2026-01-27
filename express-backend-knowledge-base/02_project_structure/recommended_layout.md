# Recommended Project Layout for Express.js Applications

A well-organized project structure is crucial for maintainability, scalability, and team collaboration. This guide presents production-ready layouts for Express.js applications.

## Standard Production Layout

```
my_express_app/
├── src/
│   ├── app.js                      # Application entry point
│   ├── server.js                   # Server setup
│   │
│   ├── config/                     # Configuration
│   │   ├── database.js            # Database configuration
│   │   ├── redis.js               # Redis configuration
│   │   └── env.js                 # Environment variables
│   │
│   ├── routes/                     # API routes
│   │   ├── index.js               # Route aggregation
│   │   ├── v1/                    # API versioning
│   │   │   ├── index.js
│   │   │   ├── users.js
│   │   │   ├── auth.js
│   │   │   └── products.js
│   │
│   ├── controllers/                # Route handlers (thin layer)
│   │   ├── userController.js
│   │   ├── authController.js
│   │   └── productController.js
│   │
│   ├── models/                     # Database models (Sequelize/Mongoose)
│   │   ├── User.js
│   │   ├── Product.js
│   │   └── index.js               # Model associations
│   │
│   ├── repositories/               # Data access layer
│   │   ├── baseRepository.js      # Base repository
│   │   ├── userRepository.js
│   │   └── productRepository.js
│   │
│   ├── services/                   # Business logic layer
│   │   ├── userService.js
│   │   ├── authService.js
│   │   └── productService.js
│   │
│   ├── middleware/                 # Custom middleware
│   │   ├── auth.js                # Authentication middleware
│   │   ├── errorHandler.js        # Error handling
│   │   ├── validation.js         # Request validation
│   │   └── logger.js              # Request logging
│   │
│   ├── utils/                      # Utility functions
│   │   ├── jwt.js                 # JWT helpers
│   │   ├── hashPassword.js       # Password hashing
│   │   └── validators.js          # Validation schemas
│   │
│   └── types/                      # TypeScript types (if using TS)
│       ├── user.types.ts
│       └── common.types.ts
│
├── tests/                          # Test suite
│   ├── unit/
│   │   ├── services.test.js
│   │   └── repositories.test.js
│   ├── integration/
│   │   ├── api.test.js
│   │   └── db.test.js
│   └── fixtures/
│       └── factories.js
│
├── migrations/                     # Database migrations
│   └── 20240101000000-create-users.js
│
├── scripts/                        # Utility scripts
│   └── seed.js
│
├── .env                            # Environment variables (not in git)
├── .env.example                    # Example environment file
├── .gitignore
├── package.json                    # Dependencies
├── package-lock.json
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## Detailed Breakdown   --- IMP

### 1. `src/app.js` - Application Entry Point

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { errorHandler } = require('./middleware/errorHandler');
const { logger } = require('./middleware/logger');
const routes = require('./routes');

// Express app: Initialize Express application.
const app = express();

// Security middleware: Helmet sets various HTTP headers for security.
app.use(helmet());

// CORS: Allow cross-origin requests from frontend.
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));

// Body parsing: Parse JSON and URL-encoded request bodies.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging: Log all HTTP requests.
app.use(morgan('combined'));
app.use(logger);

// Routes: Include all API routes.
app.use('/api/v1', routes);

// Health check: Simple endpoint to verify server is running.
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling: Must be last middleware to catch all errors.
app.use(errorHandler);

module.exports = app;
```

**Explanation:**
The `app.js` file sets up the Express application, middleware (security, CORS, logging), and includes routes. Error handling middleware is added last to catch all errors.

### 2. `src/server.js` - Server Setup

```javascript
const app = require('./app');
const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');

const PORT = process.env.PORT || 3000;

// Start server: Initialize database, Redis, then start HTTP server.
async function startServer() {
    try {
        // Connect to database: Initialize database connection pool.
        await connectDB();
        console.log('✅ Database connected');
        
        // Connect to Redis: Initialize Redis connection.
        await connectRedis();
        console.log('✅ Redis connected');
        
        // Start HTTP server: Listen on specified port.
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown: Close connections on process termination.
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await closeConnections();
    process.exit(0);
});

startServer();
```

**Explanation:**
The `server.js` file handles server startup, database connections, and graceful shutdown. It ensures all connections are established before accepting requests.

### 3. `src/config/env.js` - Configuration Management

```javascript
require('dotenv').config();

// Configuration: Centralized environment variable management.
const config = {
    // Application settings
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT, 10) || 3000,
    PROJECT_NAME: process.env.PROJECT_NAME || 'My Express App',
    
    // Database: PostgreSQL connection string.
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/mydb',
    
    // Redis: Cache/session storage URL.
    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
    
    // Security: JWT token configuration.
    JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '30m',
    
    // CORS: Allowed origins for cross-origin requests.
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
};

// Validation: Ensure required environment variables are set.
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
requiredEnvVars.forEach(varName => {
    if (!config[varName]) {
        throw new Error(`Missing required environment variable: ${varName}`);
    }
});

module.exports = config;
```

**Explanation:**
Configuration is centralized in `env.js` using `dotenv`. This ensures type safety and validation of required environment variables. Other parts of the app import `config` from here.  --- IMP

### 4. `src/routes/v1/users.js` - Route Handlers

```javascript
const express = require('express');
const router = express.Router();

const { authenticate } = require('../../../middleware/auth');
const { validateRequest } = require('../../../middleware/validation');
const userController = require('../../../controllers/userController');
const { createUserSchema, updateUserSchema } = require('../../../utils/validators');

// GET /users/:id: Get user by ID (requires authentication).
router.get('/:id', authenticate, userController.getUserById);

// POST /users: Create new user (with validation).
router.post('/', validateRequest(createUserSchema), userController.createUser);

// PUT /users/:id: Update user (requires auth + validation).
router.put('/:id', authenticate, validateRequest(updateUserSchema), userController.updateUser);

// DELETE /users/:id: Delete user (requires auth).
router.delete('/:id', authenticate, userController.deleteUser);

module.exports = router;
```

**Explanation:**
Routes are thin - they just define endpoints and apply middleware. Business logic is in controllers, validation is in middleware.

### 5. `src/controllers/userController.js` - Controller Layer

```javascript
const userService = require('../services/userService');
const { successResponse, errorResponse } = require('../utils/response');

// Controller: Thin layer that handles HTTP request/response.
class UserController {
    // GET /users/:id: Get user by ID.
    async getUserById(req, res, next) {
        try {
            const { id } = req.params;
            const user = await userService.getUserById(parseInt(id));
            
            if (!user) {
                return res.status(404).json(errorResponse('User not found'));
            }
            
            res.json(successResponse(user));
        } catch (error) {
            next(error);  // Pass to error handler
        }
    }
    
    // POST /users: Create new user.
    async createUser(req, res, next) {
        try {
            const userData = req.body;  // Already validated by middleware
            const user = await userService.createUser(userData);
            
            res.status(201).json(successResponse(user));
        } catch (error) {
            next(error);
        }
    }
    
    // PUT /users/:id: Update user.
    async updateUser(req, res, next) {
        try {
            const { id } = req.params;
            const updates = req.body;  // Already validated
            const user = await userService.updateUser(parseInt(id), updates);
            
            res.json(successResponse(user));
        } catch (error) {
            next(error);
        }
    }
    
    // DELETE /users/:id: Delete user.
    async deleteUser(req, res, next) {
        try {
            const { id } = req.params;
            await userService.deleteUser(parseInt(id));
            
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new UserController();
```

**Explanation:**
Controllers handle HTTP request/response. They call services for business logic and format responses. Errors are passed to error handling middleware.

### 6. `src/services/userService.js` - Business Logic Layer

```javascript
const userRepository = require('../repositories/userRepository');
const { NotFoundError, ValidationError } = require('../utils/errors');

// Service: Business logic layer, coordinates between controllers and repositories.
class UserService {
    // Get user by ID: Business logic for retrieving user.
    async getUserById(userId) {
        const user = await userRepository.findById(userId);
        
        if (!user) {
            throw new NotFoundError('User not found');
        }
        
        return user;
    }
    
    // Create user: Business logic for creating user (validation, email check).
    async createUser(userData) {
        // Business validation: Check if email already exists.
        const existingUser = await userRepository.findByEmail(userData.email);
        if (existingUser) {
            throw new ValidationError('Email already exists');
        }
        
        // Create user: Delegate to repository.
        return await userRepository.create(userData);
    }
    
    // Update user: Business logic for updating user.
    async updateUser(userId, updates) {
        // Check if user exists: Business rule.
        const user = await userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError('User not found');
        }
        
        // Update user: Delegate to repository.
        return await userRepository.update(userId, updates);
    }
    
    // Delete user: Business logic for deleting user.
    async deleteUser(userId) {
        const user = await userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError('User not found');
        }
        
        await userRepository.delete(userId);
    }
}

module.exports = new UserService();
```

**Explanation:**
Services contain business logic. They coordinate between controllers and repositories, handle business rules (like email uniqueness), and throw appropriate errors.

### 7. `src/repositories/userRepository.js` - Data Access Layer

```javascript
const { User } = require('../models');
const BaseRepository = require('./baseRepository');

// Repository: Data access layer, handles all database operations.
class UserRepository extends BaseRepository {
    constructor() {
        super(User);  // Pass model to base repository
    }
    
    // Find by email: Custom query method.
    async findByEmail(email) {
        return await this.model.findOne({ where: { email } });
    }
    
    // Find with orders: Include related data.
    async findWithOrders(userId) {
        return await this.model.findByPk(userId, {
            include: ['orders']  // Eager load orders
        });
    }
}

module.exports = new UserRepository();
```

**Explanation:**
Repositories handle all database operations. They extend a base repository for common CRUD operations and add custom query methods.

## Best Practices

### 1. **Separation of Concerns**
- **Routes**: Define endpoints and middleware
- **Controllers**: Handle HTTP request/response
- **Services**: Business logic
- **Repositories**: Database operations

### 2. **Dependency Injection**
Use dependency injection for testability:

```javascript
// Service with dependency injection: Easy to test with mocks.
class UserService {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    
    async getUserById(id) {
        return await this.userRepository.findById(id);
    }
}

// Usage
const userService = new UserService(userRepository);
```

### 3. **API Versioning**
Use version prefixes for API evolution:

```javascript
// v1 routes
app.use('/api/v1', v1Routes);

// v2 routes (when needed)
app.use('/api/v2', v2Routes);
```

### 4. **Error Handling**
Centralized error handling:

```javascript
// middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
    console.error(err);
    
    if (err instanceof ValidationError) {
        return res.status(400).json({ error: err.message });
    }
    
    if (err instanceof NotFoundError) {
        return res.status(404).json({ error: err.message });
    }
    
    res.status(500).json({ error: 'Internal server error' });
};
```

### 5. **Thin Routes**
Routes should be thin - just define endpoints:

```javascript
// ✅ Good: Thin route
router.get('/:id', authenticate, userController.getUserById);

// ❌ Bad: Business logic in route
router.get('/:id', async (req, res) => {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json(user);
});
```

## Alternative Layouts

### Microservices Layout
```
services/
├── user-service/
│   └── [same structure as above]
├── product-service/
│   └── [same structure as above]
└── shared/
    └── common utilities
```

### Monorepo Layout
```
packages/
├── api/              # Express API
├── shared/           # Shared code
└── database/         # Database models
```

## Summary

Effective Express.js project structure requires: Separation of concerns (routes, controllers, services, repositories), dependency injection for testability, API versioning for evolution, centralized error handling, and thin routes (business logic in services).

---

## 🎯 Interview Questions: Project Structure & Architecture   --- IMP

### Q1: How would you structure a large Express.js application for a team of 20+ developers? What principles guide your structure?

**Answer:**

Structure should support **team collaboration**, **scalability**, and **maintainability**.

**Recommended Structure:**

```
project/
├── src/
│   ├── modules/              # Feature-based modules
│   │   ├── users/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── repositories/
│   │   │   ├── routes/
│   │   │   ├── models/
│   │   │   └── index.js
│   │   ├── orders/
│   │   └── products/
│   ├── shared/               # Shared code
│   │   ├── middleware/
│   │   ├── utils/
│   │   ├── validators/
│   │   └── errors/
│   ├── config/              # Configuration
│   └── app.js               # Application entry
├── tests/
└── package.json
```

**Principles:**

```
1. Feature-Based Modules
   ├─ Each feature is self-contained
   ├─ Teams can work independently
   └─ Easy to locate code

2. Separation of Concerns
   ├─ Routes: HTTP handling
   ├─ Controllers: Request/response
   ├─ Services: Business logic
   └─ Repositories: Data access

3. Shared Code
   ├─ Common utilities
   ├─ Shared middleware
   └─ Error handlers

4. Clear Boundaries
   ├─ Modules don't depend on each other
   ├─ Communication via events/services
   └─ Easy to test
```

**Implementation:**

```javascript
// modules/users/index.js
const userRoutes = require('./routes/user.routes');
const userService = require('./services/user.service');

module.exports = {
    routes: userRoutes,
    service: userService
};

// app.js
const userModule = require('./modules/users');
const orderModule = require('./modules/orders');

app.use('/api/users', userModule.routes);
app.use('/api/orders', orderModule.routes);
```

**Team Collaboration:**

```
Team Structure:
├─ Team 1: Users Module (5 developers)
├─ Team 2: Orders Module (5 developers)
├─ Team 3: Products Module (4 developers)
├─ Team 4: Payments Module (3 developers)
└─ Team 5: Infrastructure (3 developers)

Benefits:
├─ Parallel Development: Teams work independently
├─ Clear Ownership: Each module has owners
├─ Reduced Conflicts: Less code overlap
└─ Faster Onboarding: Clear structure
```

---

### Q2: Explain the difference between feature-based and layer-based project structure. When would you use each?

**Answer:**

**Feature-Based Structure** (Recommended for large teams):

```
modules/
├── users/
│   ├── controllers/
│   ├── services/
│   ├── repositories/
│   └── routes/
├── orders/
│   └── [same structure]
└── products/
    └── [same structure]
```

**Benefits:**
- ✅ Teams work on complete features
- ✅ Easy to locate related code
- ✅ Independent deployment possible
- ✅ Clear ownership

**Layer-Based Structure** (Traditional):

```
src/
├── controllers/
│   ├── user.controller.js
│   ├── order.controller.js
│   └── product.controller.js
├── services/
│   ├── user.service.js
│   ├── order.service.js
│   └── product.service.js
└── repositories/
    ├── user.repository.js
    ├── order.repository.js
    └── product.repository.js
```

**Benefits:**
- ✅ Clear separation by layer
- ✅ Easy to understand architecture
- ✅ Good for small teams

**Comparison:**

| Aspect | Feature-Based | Layer-Based |
|--------|---------------|-------------|
| **Team Size** | Large (10+) | Small (< 10) |
| **Code Location** | Easy (all in module) | Harder (scattered) |
| **Parallel Work** | Easy (different modules) | Harder (same files) |
| **Testing** | Module-level | Layer-level |
| **Scalability** | High | Medium |

**When to Use:**

```
Feature-Based:
├─ Large teams (10+ developers)
├─ Multiple features
├─ Independent deployment needed
└─ Microservices architecture

Layer-Based:
├─ Small teams (< 10 developers)
├─ Simple applications
├─ Learning/teaching
└─ Monolithic architecture
```

---

### Q3: How do you handle API versioning in Express.js? What are the different strategies?

**Answer:**

**API Versioning** allows **backward compatibility** while evolving APIs.

**Strategy 1: URL Path Versioning**

```javascript
// v1
app.use('/api/v1/users', userRoutesV1);

// v2
app.use('/api/v2/users', userRoutesV2);

// Usage:
// GET /api/v1/users/1
// GET /api/v2/users/1
```

**Strategy 2: Header Versioning**

```javascript
app.use('/api/users', (req, res, next) => {
    const version = req.headers['api-version'] || 'v1';
    req.apiVersion = version;
    next();
});

app.get('/api/users/:id', (req, res) => {
    if (req.apiVersion === 'v2') {
        // New response format
        res.json({ user: user, metadata: {...} });
    } else {
        // Old response format
        res.json(user);
    }
});
```

**Strategy 3: Query Parameter**

```javascript
app.get('/api/users/:id', (req, res) => {
    const version = req.query.version || 'v1';
    // Handle based on version
});
```

**Recommended: URL Path Versioning**

```javascript
// routes/v1/user.routes.js
const express = require('express');
const router = express.Router();

router.get('/:id', async (req, res) => {
    const user = await userService.getUser(req.params.id);
    res.json({ id: user.id, name: user.name }); // v1 format
});

// routes/v2/user.routes.js
router.get('/:id', async (req, res) => {
    const user = await userService.getUser(req.params.id);
    res.json({
        id: user.id,
        name: user.name,
        email: user.email,        // v2 additions
        metadata: {...}           // v2 additions
    });
});

// app.js
app.use('/api/v1/users', require('./routes/v1/user.routes'));
app.use('/api/v2/users', require('./routes/v2/user.routes'));
```

**Versioning Best Practices:**

```
API Versioning:
├─ Always version breaking changes
├─ Keep old versions for 6-12 months
├─ Document deprecation timeline
├─ Use semantic versioning (v1, v2, v3)
└─ Communicate changes to clients
```

---

### Q4: How would you organize routes, controllers, and services in a scalable Express.js application?

**Answer:**

**Three-Layer Architecture:**

```
Routes → Controllers → Services → Repositories → Database
```

**1. Routes (Thin Layer):**

```javascript
// routes/user.routes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');

router.get('/:id', userController.getUser);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;
```

**2. Controllers (Request/Response Handling):**

```javascript
// controllers/user.controller.js
const userService = require('../services/user.service');

exports.getUser = async (req, res, next) => {
    try {
        const user = await userService.getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'Not found' });
        }
        res.json(user);
    } catch (error) {
        next(error);
    }
};

exports.createUser = async (req, res, next) => {
    try {
        const user = await userService.createUser(req.body);
        res.status(201).json(user);
    } catch (error) {
        next(error);
    }
};
```

**3. Services (Business Logic):**

```javascript
// services/user.service.js
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
        email: user.email
        // Don't expose password
    };
};

exports.createUser = async (userData) => {
    // Validation
    if (!userData.email || !userData.password) {
        throw new Error('Email and password required');
    }
    
    // Business rules
    const existing = await userRepository.findByEmail(userData.email);
    if (existing) {
        throw new Error('Email already exists');
    }
    
    // Create user
    return await userRepository.create(userData);
};
```

**Responsibilities:**

```
Routes:
├─ Define endpoints
├─ Map to controllers
└─ Handle HTTP methods

Controllers:
├─ Extract request data
├─ Call services
├─ Format responses
└─ Handle errors

Services:
├─ Business logic
├─ Data transformation
├─ Orchestration
└─ Validation
```

---

### Q5: How do you handle shared code and utilities across multiple modules?

**Answer:**

Create a **shared directory** for common code used across modules.

**Structure:**

```
src/
├── shared/
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   ├── validation.middleware.js
│   │   └── error.middleware.js
│   ├── utils/
│   │   ├── logger.js
│   │   ├── date.utils.js
│   │   └── string.utils.js
│   ├── validators/
│   │   ├── user.validator.js
│   │   └── common.validator.js
│   └── errors/
│       ├── AppError.js
│       └── errorHandler.js
```

**Shared Middleware:**

```javascript
// shared/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');

exports.authenticate = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Usage in any module
const { authenticate } = require('../../shared/middleware/auth.middleware');
router.get('/profile', authenticate, userController.getProfile);
```

**Shared Utilities:**

```javascript
// shared/utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

module.exports = logger;

// Usage
const logger = require('../../shared/utils/logger');
logger.info('User created', { userId: 1 });
```

**Shared Errors:**

```javascript
// shared/errors/AppError.js
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;

// Usage
const AppError = require('../../shared/errors/AppError');
throw new AppError('User not found', 404);
```

**Best Practices:**

```
Shared Code:
├─ Keep it generic (no business logic)
├─ Document usage
├─ Version carefully (breaking changes affect all)
└─ Test thoroughly
```

---

## Summary

These interview questions cover:
- ✅ Large-scale project structure for teams
- ✅ Feature-based vs layer-based architecture
- ✅ API versioning strategies
- ✅ Routes, controllers, services organization
- ✅ Shared code management

Master these for senior-level interviews focusing on architecture and scalability.

