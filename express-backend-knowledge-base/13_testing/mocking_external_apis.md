# Mocking External APIs: Testing with External Dependencies

Mocking external APIs allows you to test your application without making real API calls. This makes tests faster, more reliable, and independent of external services.

## Why Mock External APIs?

**Mocking external APIs** replaces real API calls with fake responses during testing. This provides:

```
- Faster tests (no network calls)
- Reliable tests (no external service failures)
- Controlled responses (test different scenarios)
- No API costs (no charges for test calls)
```

## Mocking HTTP Requests

### Using nock

```bash
npm install --save-dev nock
```

```javascript
const nock = require('nock');
const axios = require('axios');

describe('External API Integration', () => {
    it('should fetch user data from external API', async () => {
        // Mock external API
        nock('https://api.external.com')
            .get('/users/123')
            .reply(200, {
                id: 123,
                name: 'John Doe',
                email: 'john@example.com'
            });

        // Make request (will use mock)
        const response = await axios.get('https://api.external.com/users/123');
        
        expect(response.data.name).toBe('John Doe');
    });

    it('should handle API errors', async () => {
        // Mock error response
        nock('https://api.external.com')
            .get('/users/123')
            .reply(500, { error: 'Internal Server Error' });

        try {
            await axios.get('https://api.external.com/users/123');
        } catch (error) {
            expect(error.response.status).toBe(500);
        }
    });
});
```

## Mocking Payment Gateways

### Stripe Mocking

```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Mock Stripe
jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => {
        return {
            charges: {
                create: jest.fn()
            },
            customers: {
                create: jest.fn()
            }
        };
    });
});

describe('Payment Processing', () => {
    it('should process payment successfully', async () => {
        // Mock successful charge
        stripe.charges.create.mockResolvedValue({
            id: 'ch_123',
            amount: 1000,
            status: 'succeeded'
        });

        const result = await processPayment({
            amount: 1000,
            token: 'tok_123'
        });

        expect(result.success).toBe(true);
        expect(stripe.charges.create).toHaveBeenCalledWith({
            amount: 1000,
            currency: 'usd',
            source: 'tok_123'
        });
    });

    it('should handle payment failure', async () => {
        // Mock failed charge
        stripe.charges.create.mockRejectedValue({
            type: 'StripeCardError',
            message: 'Your card was declined.'
        });

        await expect(processPayment({
            amount: 1000,
            token: 'tok_123'
        })).rejects.toThrow('Your card was declined.');
    });
});
```

## Mocking Email Services

### SendGrid Mocking

```javascript
const sgMail = require('@sendgrid/mail');

// Mock SendGrid
jest.mock('@sendgrid/mail', () => ({
    setApiKey: jest.fn(),
    send: jest.fn()
}));

describe('Email Service', () => {
    it('should send welcome email', async () => {
        sgMail.send.mockResolvedValue([{ statusCode: 202 }]);

        await sendWelcomeEmail('user@example.com');

        expect(sgMail.send).toHaveBeenCalledWith({
            to: 'user@example.com',
            from: 'noreply@example.com',
            subject: 'Welcome!',
            text: 'Welcome to our service!'
        });
    });

    it('should handle email errors', async () => {
        sgMail.send.mockRejectedValue(new Error('Email service unavailable'));

        await expect(sendWelcomeEmail('user@example.com'))
            .rejects.toThrow('Email service unavailable');
    });
});
```

## Real-World Examples

### Example 1: Weather API Integration

```javascript
const axios = require('axios');
const nock = require('nock');

// Service that uses external API
async function getWeather(city) {
    const response = await axios.get(`https://api.weather.com/v1/weather?city=${city}`);
    return response.data;
}

describe('Weather Service', () => {
    it('should fetch weather data', async () => {
        nock('https://api.weather.com')
            .get('/v1/weather')
            .query({ city: 'New York' })
            .reply(200, {
                city: 'New York',
                temperature: 72,
                condition: 'Sunny'
            });

        const weather = await getWeather('New York');
        
        expect(weather.temperature).toBe(72);
        expect(weather.condition).toBe('Sunny');
    });

    it('should handle API timeout', async () => {
        nock('https://api.weather.com')
            .get('/v1/weather')
            .query({ city: 'New York' })
            .delayConnection(2000)  // Simulate delay
            .reply(200, {});

        // Test timeout handling
        await expect(getWeather('New York')).rejects.toThrow();
    });
});
```

### Example 2: Third-Party Authentication

```javascript
const axios = require('axios');
const nock = require('nock');

async function verifyGoogleToken(token) {
    const response = await axios.get('https://www.googleapis.com/oauth2/v1/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
}

describe('Google OAuth', () => {
    it('should verify valid token', async () => {
        nock('https://www.googleapis.com')
            .get('/oauth2/v1/userinfo')
            .matchHeader('Authorization', 'Bearer valid-token')
            .reply(200, {
                id: '123',
                email: 'user@gmail.com',
                name: 'John Doe'
            });

        const user = await verifyGoogleToken('valid-token');
        
        expect(user.email).toBe('user@gmail.com');
    });

    it('should reject invalid token', async () => {
        nock('https://www.googleapis.com')
            .get('/oauth2/v1/userinfo')
            .reply(401, { error: 'Invalid token' });

        await expect(verifyGoogleToken('invalid-token'))
            .rejects.toThrow();
    });
});
```

## Best Practices

1. **Mock at Service Boundary**: Mock external services, not internal code
2. **Test Different Scenarios**: Success, failure, timeout, rate limits
3. **Verify Calls**: Ensure services are called with correct parameters
4. **Clean Up**: Clear mocks between tests
5. **Use Real APIs in Integration Tests**: Test with real APIs in integration tests

## Common Patterns

### Pattern 1: Service Mock

```javascript
// Mock entire service module
jest.mock('../services/paymentService', () => ({
    processPayment: jest.fn(),
    refundPayment: jest.fn()
}));

const paymentService = require('../services/paymentService');

describe('Order Service', () => {
    it('should process order payment', async () => {
        paymentService.processPayment.mockResolvedValue({ success: true });
        
        const order = await createOrder(orderData);
        
        expect(paymentService.processPayment).toHaveBeenCalled();
    });
});
```

### Pattern 2: HTTP Interceptor

```javascript
// Mock axios requests
const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');

const mock = new MockAdapter(axios);

describe('API Client', () => {
    beforeEach(() => {
        mock.reset();
    });

    it('should handle successful requests', async () => {
        mock.onGet('/users/1').reply(200, { id: 1, name: 'John' });
        
        const user = await getUser(1);
        expect(user.name).toBe('John');
    });
});
```

## Summary

**Mocking External APIs:**

1. **Purpose**: Test without real API calls
2. **Benefits**: Faster, reliable, controlled tests
3. **Tools**: nock, jest.mock, axios-mock-adapter
4. **Best Practices**: Mock at boundaries, test scenarios, verify calls
5. **Use Cases**: Payment gateways, email services, third-party APIs

**Key Takeaway:**
Mocking external APIs allows you to test your application without making real API calls. Use tools like nock for HTTP mocking or jest.mock for module mocking. Test different scenarios (success, failure, timeout) and verify that services are called with correct parameters. Mock at service boundaries, not internal code.

**Mocking Strategy:**
- Mock external services
- Test different scenarios
- Verify service calls
- Clean up between tests
- Use real APIs in integration tests

**Next Steps:**
- Learn [Integration Testing](integration_testing.md) for end-to-end tests
- Study [Unit Testing Services](unit_testing_services.md) for isolated tests
- Master [Test Fixtures](../13_testing/test_fixtures.md) for test data

