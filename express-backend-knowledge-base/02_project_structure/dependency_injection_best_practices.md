# Dependency Injection Best Practices in Express.js

Dependency injection (DI) in Express.js enables clean, testable, and maintainable code by managing dependencies explicitly. While Express doesn't have built-in DI like FastAPI, we can implement it effectively using patterns and libraries.

## Understanding Dependency Injection in Express.js

**Dependency Injection** is a design pattern where dependencies are provided to a function or class from the outside, rather than being created inside. This makes code more testable and flexible.

### Why Dependency Injection?

```javascript
// ❌ Bad: Hard-coded dependencies
class UserService {
    constructor() {
        this.db = new Database();  // Hard to test, hard to replace
    }
    
    async getUser(id) {
        return this.db.query('SELECT * FROM users WHERE id = ?', [id]);
    }
}

// ✅ Good: Dependencies injected
class UserService {
    constructor(db) {  // Dependency injected via constructor
        this.db = db;  // Can be mocked in tests
    }
    
    async getUser(id) {
        return this.db.query('SELECT * FROM users WHERE id = ?', [id]);
    }
}
```

**Explanation:**
By injecting dependencies, we can easily replace them with mocks in tests and swap implementations without changing the service code.

## Dependency Injection Patterns

### Pattern 1: Constructor Injection

**Constructor injection** passes dependencies through the constructor. This is the most common and recommended pattern:

```javascript
// Service with injected dependencies
class UserService {
    constructor(userRepository, emailService) {
        this.userRepository = userRepository;  // Database operations
        this.emailService = emailService;      // Email sending
    }
    
    async createUser(userData) {
        // Use injected repository
        const user = await this.userRepository.create(userData);
        
        // Use injected email service
        await this.emailService.sendWelcomeEmail(user.email);
        
        return user;
    }
}

// Dependency setup
const userRepository = new UserRepository(db);
const emailService = new EmailService(emailConfig);
const userService = new UserService(userRepository, emailService);

// Use in route
app.post('/users', async (req, res) => {
    const user = await userService.createUser(req.body);
    res.json(user);
});
```

**Explanation:**
Dependencies are provided when creating the service instance. This makes it clear what the service needs and allows easy testing by injecting mocks.

### Pattern 2: Factory Functions

**Factory functions** create and configure service instances with their dependencies:

```javascript
// Factory function creates service with dependencies
function createUserService(db, emailConfig) {
    const userRepository = new UserRepository(db);
    const emailService = new EmailService(emailConfig);
    return new UserService(userRepository, emailService);
}

// Create service instance
const userService = createUserService(db, emailConfig);

// Use in route
app.post('/users', async (req, res) => {
    const user = await userService.createUser(req.body);
    res.json(user);
});
```

**Explanation:**
Factory functions encapsulate dependency creation logic, making it easier to manage complex dependency graphs.

### Pattern 3: Dependency Container

**Dependency container** manages and resolves dependencies automatically:

```javascript
// Simple dependency container
class Container {
    constructor() {
        this.services = new Map();
        this.singletons = new Map();
    }
    
    // Register service factory
    register(name, factory, singleton = false) {
        this.services.set(name, { factory, singleton });
    }
    
    // Resolve dependency
    resolve(name) {
        const service = this.services.get(name);
        if (!service) {
            throw new Error(`Service ${name} not found`);
        }
        
        // Return singleton if exists
        if (service.singleton && this.singletons.has(name)) {
            return this.singletons.get(name);
        }
        
        // Create instance
        const instance = service.factory(this);
        
        // Cache singleton
        if (service.singleton) {
            this.singletons.set(name, instance);
        }
        
        return instance;
    }
}

// Setup container
const container = new Container();

// Register services
container.register('db', () => createDatabase(), true);  // Singleton
container.register('userRepository', (c) => {
    return new UserRepository(c.resolve('db'));
});
container.register('userService', (c) => {
    return new UserService(
        c.resolve('userRepository'),
        c.resolve('emailService')
    );
});

// Use in route
app.post('/users', async (req, res) => {
    const userService = container.resolve('userService');
    const user = await userService.createUser(req.body);
    res.json(user);
});
```

**Explanation:**
A dependency container automatically resolves dependencies, creating instances as needed. Singletons are cached for performance.

## Real-World Examples

### Example 1: Database Connection Injection

```javascript
// Database connection as dependency
class Database {
    constructor(connectionString) {
        this.connectionString = connectionString;
        this.pool = null;
    }
    
    async connect() {
        this.pool = await mysql.createPool({
            connectionLimit: 10,
            host: this.connectionString.host,
            user: this.connectionString.user,
            password: this.connectionString.password,
            database: this.connectionString.database
        });
    }
    
    async query(sql, params) {
        return new Promise((resolve, reject) => {
            this.pool.query(sql, params, (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });
    }
}

// Repository uses injected database
class UserRepository {
    constructor(db) {  // Database injected
        this.db = db;
    }
    
    async findById(id) {
        return this.db.query('SELECT * FROM users WHERE id = ?', [id]);
    }
}

// Service uses injected repository
class UserService {
    constructor(userRepository) {  // Repository injected
        this.userRepository = userRepository;
    }
    
    async getUser(id) {
        return this.userRepository.findById(id);
    }
}

// Setup dependencies
const db = new Database(dbConfig);
await db.connect();

const userRepository = new UserRepository(db);
const userService = new UserService(userRepository);

// Use in route
app.get('/users/:id', async (req, res) => {
    const user = await userService.getUser(req.params.id);
    res.json(user);
});
```

### Example 2: Middleware with Dependencies

```javascript
// Authentication middleware with injected service
function createAuthMiddleware(authService) {  // Service injected
    return async (req, res, next) => {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        try {
            const user = await authService.verifyToken(token);
            req.user = user;  // Attach user to request
            next();
        } catch (error) {
            return res.status(401).json({ error: 'Invalid token' });
        }
    };
}

// Setup
const authService = new AuthService(jwtSecret);
const authMiddleware = createAuthMiddleware(authService);

// Use middleware
app.get('/protected', authMiddleware, (req, res) => {
    res.json({ user: req.user });
});
```

### Example 3: Service Layer with Multiple Dependencies

```javascript
// Order service with multiple dependencies
class OrderService {
    constructor(
        orderRepository,    // Database operations
        paymentService,     // Payment processing
        emailService,       // Email notifications
        inventoryService    // Inventory management
    ) {
        this.orderRepository = orderRepository;
        this.paymentService = paymentService;
        this.emailService = emailService;
        this.inventoryService = inventoryService;
    }
    
    async createOrder(orderData) {
        // Check inventory
        const available = await this.inventoryService.checkAvailability(
            orderData.productId,
            orderData.quantity
        );
        
        if (!available) {
            throw new Error('Product out of stock');
        }
        
        // Process payment
        const payment = await this.paymentService.processPayment(
            orderData.paymentInfo
        );
        
        // Create order
        const order = await this.orderRepository.create({
            ...orderData,
            paymentId: payment.id
        });
        
        // Send confirmation email
        await this.emailService.sendOrderConfirmation(order);
        
        return order;
    }
}

// Setup all dependencies
const orderRepository = new OrderRepository(db);
const paymentService = new PaymentService(paymentConfig);
const emailService = new EmailService(emailConfig);
const inventoryService = new InventoryService(inventoryDb);

const orderService = new OrderService(
    orderRepository,
    paymentService,
    emailService,
    inventoryService
);
```

## Testing with Dependency Injection

### Mocking Dependencies

```javascript
// Test with mocked dependencies
describe('UserService', () => {
    let userService;
    let mockUserRepository;
    
    beforeEach(() => {
        // Create mock repository
        mockUserRepository = {
            findById: jest.fn(),
            create: jest.fn()
        };
        
        // Inject mock into service
        userService = new UserService(mockUserRepository);
    });
    
    it('should get user by id', async () => {
        // Setup mock
        mockUserRepository.findById.mockResolvedValue({
            id: 1,
            name: 'John',
            email: 'john@example.com'
        });
        
        // Test service
        const user = await userService.getUser(1);
        
        // Verify
        expect(mockUserRepository.findById).toHaveBeenCalledWith(1);
        expect(user.name).toBe('John');
    });
});
```

**Explanation:**
By injecting dependencies, we can easily replace them with mocks in tests, allowing isolated unit testing.

## Best Practices

### 1. Use Constructor Injection

```javascript
// ✅ Good: Constructor injection
class UserService {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
}

// ❌ Bad: Service locator pattern
class UserService {
    constructor() {
        this.userRepository = ServiceLocator.get('userRepository');
    }
}
```

### 2. Keep Dependencies Explicit

```javascript
// ✅ Good: Dependencies in constructor
class UserService {
    constructor(userRepository, emailService, logger) {
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.logger = logger;
    }
}

// ❌ Bad: Hidden dependencies
class UserService {
    constructor() {
        this.userRepository = require('./repositories/userRepository');
    }
}
```

### 3. Use Dependency Container for Complex Apps

```javascript
// For large applications, use a DI container
const container = new Container();
container.register('userService', (c) => {
    return new UserService(
        c.resolve('userRepository'),
        c.resolve('emailService')
    );
});
```

## Common Mistakes

### ❌ Creating Dependencies Inside Classes

```javascript
// ❌ Bad: Creating dependencies inside
class UserService {
    async getUser(id) {
        const db = new Database();  // Hard to test, new connection each time
        return db.query('SELECT * FROM users WHERE id = ?', [id]);
    }
}

// ✅ Good: Inject dependency
class UserService {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    
    async getUser(id) {
        return this.userRepository.findById(id);
    }
}
```

### ❌ Global Dependencies

```javascript
// ❌ Bad: Global dependencies
const db = require('./db');  // Global, hard to test

class UserService {
    async getUser(id) {
        return db.query('SELECT * FROM users WHERE id = ?', [id]);
    }
}

// ✅ Good: Injected dependency
class UserService {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    
    async getUser(id) {
        return this.userRepository.findById(id);
    }
}
```

## Summary

**Dependency Injection in Express.js:**

1. **Purpose**: Make code testable and maintainable
2. **Patterns**: Constructor injection, factory functions, dependency containers
3. **Benefits**: Easy testing, flexible implementations, clear dependencies
4. **Best Practice**: Use constructor injection, keep dependencies explicit
5. **Testing**: Mock dependencies for isolated unit tests

**Key Takeaway:**
Dependency injection in Express.js is achieved through constructor injection, factory functions, or dependency containers. Inject dependencies rather than creating them inside classes. This makes code testable, maintainable, and flexible. Use constructor injection for simple cases, dependency containers for complex applications.

**Implementation:**
- Constructor injection: Pass dependencies via constructor
- Factory functions: Create services with dependencies
- Dependency containers: Automatic dependency resolution

**Next Steps:**
- Learn [Recommended Layout](recommended_layout.md) for project structure
- Study [Config Management](config_management_with_dotenv.md) for configuration
- Master [Testing](../13_testing/unit_testing_services.md) for testing with DI

