# Integration Testing: Testing Express.js Applications with Databases

Integration tests verify that different parts of your application work together correctly, including database interactions, API endpoints, and external services.

## What is Integration Testing?

**Integration testing** tests multiple components together to ensure they work correctly as a system. In Express.js, this typically means testing routes with real database connections.

### Unit Test vs Integration Test

```javascript
// Unit Test: Tests function in isolation
describe('UserService', () => {
    it('should create user', () => {
        const mockRepo = { create: jest.fn() };
        const service = new UserService(mockRepo);
        // Test with mocked dependencies
    });
});

// Integration Test: Tests with real database
describe('User API', () => {
    it('should create user via API', async () => {
        const response = await request(app)
            .post('/users')
            .send({ name: 'John', email: 'john@example.com' });
        // Tests with real database
        expect(response.status).toBe(201);
    });
});
```

## Setting Up Test Database

### Test Database Configuration

```javascript
// config/test.js
module.exports = {
    database: {
        host: process.env.TEST_DB_HOST || 'localhost',
        name: process.env.TEST_DB_NAME || 'test_db',
        user: process.env.TEST_DB_USER || 'test_user',
        password: process.env.TEST_DB_PASSWORD || 'test_password'
    }
};

// Setup test database connection
const mongoose = require('mongoose');

beforeAll(async () => {
    await mongoose.connect(process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/test_db');
});

afterAll(async () => {
    await mongoose.connection.close();
});
```

### Clean Database Between Tests

```javascript
// Clean database before each test
beforeEach(async () => {
    // Clear all collections
    await User.deleteMany({});
    await Order.deleteMany({});
    await Product.deleteMany({});
});

// Or use transactions (PostgreSQL/MySQL)
beforeEach(async () => {
    await sequelize.transaction(async (t) => {
        // Tests run in transaction
        // Rollback after test
    });
});
```

## Testing Express Routes

### Basic Route Testing

```javascript
const request = require('supertest');
const app = require('../app');
const User = require('../models/User');

describe('User Routes', () => {
    beforeEach(async () => {
        await User.deleteMany({});
    });

    describe('POST /users', () => {
        it('should create a new user', async () => {
            const userData = {
                name: 'John Doe',
                email: 'john@example.com',
                password: 'password123'
            };

            const response = await request(app)
                .post('/users')
                .send(userData)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.email).toBe(userData.email);

            // Verify in database
            const user = await User.findById(response.body.id);
            expect(user).toBeTruthy();
            expect(user.email).toBe(userData.email);
        });

        it('should return 409 if email already exists', async () => {
            // Create existing user
            await User.create({
                name: 'Existing User',
                email: 'existing@example.com',
                password: 'password123'
            });

            const response = await request(app)
                .post('/users')
                .send({
                    name: 'New User',
                    email: 'existing@example.com',
                    password: 'password123'
                })
                .expect(409);

            expect(response.body.error).toContain('already exists');
        });
    });

    describe('GET /users/:id', () => {
        it('should get user by id', async () => {
            const user = await User.create({
                name: 'John Doe',
                email: 'john@example.com',
                password: 'password123'
            });

            const response = await request(app)
                .get(`/users/${user.id}`)
                .expect(200);

            expect(response.body.id).toBe(user.id.toString());
            expect(response.body.email).toBe(user.email);
        });

        it('should return 404 if user not found', async () => {
            const response = await request(app)
                .get('/users/nonexistent-id')
                .expect(404);

            expect(response.body.error).toContain('not found');
        });
    });
});
```

## Testing with Authentication

### Authenticated Routes

```javascript
const jwt = require('jsonwebtoken');

// Helper to create auth token
function createAuthToken(userId) {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

describe('Protected Routes', () => {
    let authToken;
    let user;

    beforeEach(async () => {
        user = await User.create({
            name: 'Test User',
            email: 'test@example.com',
            password: 'password123'
        });
        authToken = createAuthToken(user.id);
    });

    it('should access protected route with valid token', async () => {
        const response = await request(app)
            .get('/protected')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

        expect(response.body.userId).toBe(user.id.toString());
    });

    it('should return 401 without token', async () => {
        const response = await request(app)
            .get('/protected')
            .expect(401);

        expect(response.body.error).toContain('Unauthorized');
    });

    it('should return 401 with invalid token', async () => {
        const response = await request(app)
            .get('/protected')
            .set('Authorization', 'Bearer invalid-token')
            .expect(401);
    });
});
```

## Testing Database Transactions

### Testing Transactional Operations

```javascript
describe('Order Creation', () => {
    it('should create order with items atomically', async () => {
        const user = await User.create({ name: 'John', email: 'john@example.com' });
        const product = await Product.create({ name: 'Product', price: 10, stock: 100 });

        const response = await request(app)
            .post('/orders')
            .send({
                user_id: user.id,
                items: [
                    { product_id: product.id, quantity: 2 }
                ]
            })
            .expect(201);

        // Verify order created
        const order = await Order.findById(response.body.id);
        expect(order).toBeTruthy();

        // Verify order items created
        const orderItems = await OrderItem.find({ order_id: order.id });
        expect(orderItems.length).toBe(1);
    });

    it('should rollback on error', async () => {
        const user = await User.create({ name: 'John', email: 'john@example.com' });
        const product = await Product.create({ name: 'Product', price: 10, stock: 0 });

        // Try to order more than available
        const response = await request(app)
            .post('/orders')
            .send({
                user_id: user.id,
                items: [
                    { product_id: product.id, quantity: 10 }  // More than stock
                ]
            })
            .expect(400);

        // Verify no order created
        const orders = await Order.find({ user_id: user.id });
        expect(orders.length).toBe(0);
    });
});
```

## Testing Error Handling

### Testing Error Responses

```javascript
describe('Error Handling', () => {
    it('should handle validation errors', async () => {
        const response = await request(app)
            .post('/users')
            .send({
                name: 'John',
                // Missing required email
            })
            .expect(400);

        expect(response.body.error).toBeDefined();
    });

    it('should handle database errors', async () => {
        // Mock database error
        jest.spyOn(User, 'create').mockRejectedValue(new Error('Database error'));

        const response = await request(app)
            .post('/users')
            .send({
                name: 'John',
                email: 'john@example.com'
            })
            .expect(500);

        expect(response.body.error).toBeDefined();
    });
});
```

## Best Practices

1. **Use Test Database**: Always use separate test database
2. **Clean Between Tests**: Clear data before each test
3. **Isolate Tests**: Tests should not depend on each other
4. **Test Real Scenarios**: Test realistic user flows
5. **Mock External Services**: Mock external APIs, payment gateways

## Common Patterns

### Pattern 1: Test Helpers

```javascript
// test/helpers.js
async function createTestUser(userData = {}) {
    return await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        ...userData
    });
}

async function createTestProduct(productData = {}) {
    return await Product.create({
        name: 'Test Product',
        price: 10,
        stock: 100,
        ...productData
    });
}

// Use in tests
const user = await createTestUser({ email: 'custom@example.com' });
```

### Pattern 2: Test Fixtures

```javascript
// test/fixtures.js
const fixtures = {
    users: [
        { name: 'John', email: 'john@example.com' },
        { name: 'Jane', email: 'jane@example.com' }
    ],
    products: [
        { name: 'Product 1', price: 10 },
        { name: 'Product 2', price: 20 }
    ]
};

// Load fixtures
beforeEach(async () => {
    await User.insertMany(fixtures.users);
    await Product.insertMany(fixtures.products);
});
```

## Summary

**Integration Testing:**

1. **Purpose**: Test components working together
2. **Setup**: Test database, clean between tests
3. **Testing**: Routes, authentication, transactions
4. **Best Practices**: Isolate tests, use test database, mock external services
5. **Tools**: Supertest for HTTP testing, Jest/Mocha for test framework

**Key Takeaway:**
Integration tests verify that different parts of your application work together correctly. Use a separate test database, clean data between tests, and test realistic scenarios. Test routes with real database connections, handle authentication, and verify transactional operations. Isolate tests and use helpers for common setup.

**Testing Strategy:**
- Use test database
- Clean between tests
- Test real scenarios
- Mock external services
- Isolate tests

**Next Steps:**
- Learn [Unit Testing Services](unit_testing_services.md) for isolated tests
- Study [Mocking External APIs](../13_testing/mocking_external_apis.md) for external services
- Master [Test Fixtures](../13_testing/test_fixtures.md) for test data

