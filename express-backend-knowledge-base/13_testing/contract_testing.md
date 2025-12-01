# Contract Testing for APIs: Ensuring Compatibility

Contract testing ensures API contracts are maintained between services. This guide covers contract testing in Express.js applications.

## What is Contract Testing?

**Contract testing** verifies that API contracts (request/response schemas) are maintained.

## Schema Validation

```javascript
const Ajv = require('ajv');
const ajv = new Ajv();

// Define contract schema
const userResponseSchema = {
    type: 'object',
    properties: {
        id: { type: 'number' },
        email: { type: 'string' },
        name: { type: 'string' }
    },
    required: ['id', 'email']
};

const validate = ajv.compile(userResponseSchema);

// Test contract
test('user endpoint matches contract', async () => {
    const response = await request(app)
        .get('/users/1')
        .expect(200);
    
    const valid = validate(response.body);
    expect(valid).toBe(true);
    if (!valid) {
        console.error(validate.errors);
    }
});
```

## Real-World Examples

### Example 1: API Contract Tests

```javascript
describe('User API Contracts', () => {
    const userSchema = {
        type: 'object',
        properties: {
            id: { type: 'number' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'email']
    };
    
    const validate = ajv.compile(userSchema);
    
    test('GET /users/:id matches contract', async () => {
        const response = await request(app)
            .get('/users/1')
            .expect(200);
        
        expect(validate(response.body)).toBe(true);
    });
    
    test('POST /users matches contract', async () => {
        const response = await request(app)
            .post('/users')
            .send({ email: 'test@example.com', name: 'Test' })
            .expect(201);
        
        expect(validate(response.body)).toBe(true);
    });
});
```

## Best Practices

1. **Define Schemas**: Use JSON Schema
2. **Test All Endpoints**: Verify all API contracts
3. **Version Contracts**: Handle API versioning
4. **Document Changes**: Track contract changes
5. **Automate**: Run in CI/CD

## Summary

**Contract Testing:**

1. **Purpose**: Ensure API contracts are maintained
2. **Method**: Schema validation
3. **Best Practice**: Define schemas, test all endpoints
4. **Benefits**: Compatibility, early detection
5. **Use Cases**: API versioning, service integration

**Key Takeaway:**
Contract testing ensures API contracts are maintained. Use JSON Schema to define contracts. Validate all API responses against schemas. Test all endpoints. Handle API versioning. Automate contract tests in CI/CD.

**Contract Strategy:**
- Define JSON schemas
- Test all endpoints
- Version contracts
- Document changes
- Automate in CI/CD

**Next Steps:**
- Learn [Integration Testing](integration_testing.md) for API tests
- Study [Unit Testing](unit_testing_services.md) for service tests
- Master [Mocking](mocking_external_apis.md) for external services

