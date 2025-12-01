# Jest Fixtures for Database Testing: Complete Guide

Proper fixtures make database testing clean and isolated. This guide covers Jest fixtures for database testing in Express.js applications.

## Understanding Test Fixtures

**Fixtures** are reusable setup/teardown code that prepares test environment.

## Database Setup Fixture

```javascript
const { Sequelize } = require('sequelize');

let testSequelize;

// Setup test database
beforeAll(async () => {
    testSequelize = new Sequelize({
        dialect: 'postgres',
        host: process.env.TEST_DB_HOST || 'localhost',
        database: process.env.TEST_DB_NAME || 'test_db',
        username: process.env.TEST_DB_USER || 'test',
        password: process.env.TEST_DB_PASSWORD || 'test',
        logging: false
    });
    
    // Create tables
    await testSequelize.sync({ force: true });
});

// Cleanup
afterAll(async () => {
    await testSequelize.close();
});
```

## Transaction-Based Fixtures

```javascript
let transaction;

beforeEach(async () => {
    // Start transaction
    transaction = await testSequelize.transaction();
});

afterEach(async () => {
    // Rollback transaction
    await transaction.rollback();
});

// Use in tests
test('create user', async () => {
    const user = await User.create({
        email: 'test@example.com',
        name: 'Test User'
    }, { transaction });
    
    expect(user.email).toBe('test@example.com');
    // Transaction rolled back automatically
});
```

## Real-World Examples

### Example 1: Complete Test Setup

```javascript
const { Sequelize } = require('sequelize');
const { User, Order } = require('../models');

let sequelize;
let transaction;

beforeAll(async () => {
    sequelize = new Sequelize({
        dialect: 'postgres',
        host: process.env.TEST_DB_HOST,
        database: process.env.TEST_DB_NAME,
        username: process.env.TEST_DB_USER,
        password: process.env.TEST_DB_PASSWORD,
        logging: false
    });
    
    await sequelize.authenticate();
    await sequelize.sync({ force: true });
});

afterAll(async () => {
    await sequelize.close();
});

beforeEach(async () => {
    transaction = await sequelize.transaction();
});

afterEach(async () => {
    await transaction.rollback();
});

// Test with transaction
test('user can create order', async () => {
    const user = await User.create({
        email: 'user@example.com',
        name: 'User'
    }, { transaction });
    
    const order = await Order.create({
        user_id: user.id,
        total: 100.00
    }, { transaction });
    
    expect(order.user_id).toBe(user.id);
});
```

### Example 2: Test Data Factories

```javascript
// Test data factory
function createUserData(overrides = {}) {
    return {
        email: 'test@example.com',
        name: 'Test User',
        ...overrides
    };
}

// Use in tests
test('update user', async () => {
    const userData = createUserData({ email: 'updated@example.com' });
    const user = await User.create(userData, { transaction });
    
    await user.update({ name: 'Updated Name' }, { transaction });
    
    expect(user.name).toBe('Updated Name');
});
```

## Best Practices

1. **Use Transactions**: Rollback after each test
2. **Isolate Tests**: Each test should be independent
3. **Clean Setup**: Create fresh data for each test
4. **Factory Functions**: Use factories for test data
5. **Teardown**: Clean up properly

## Summary

**Jest Fixtures for Database Testing:**

1. **Purpose**: Clean, isolated database tests
2. **Pattern**: Transaction-based rollback
3. **Setup**: Create tables, start transactions
4. **Best Practice**: Use transactions, isolate tests
5. **Benefits**: Fast, isolated, reliable tests

**Key Takeaway:**
Jest fixtures provide clean database testing. Use transactions that rollback after each test for isolation. Create fresh test data for each test. Use factory functions for test data generation. Properly setup and teardown database connections.

**Testing Strategy:**
- Use transactions
- Isolate tests
- Factory functions
- Clean setup
- Proper teardown

**Next Steps:**
- Learn [Integration Testing](integration_testing.md) for API tests
- Study [Unit Testing](unit_testing_services.md) for service tests
- Master [Mocking](mocking_external_apis.md) for external services

