# Monorepo vs Microservices: Architecture Decisions for Express.js

Choosing between monorepo and microservices architecture is a critical decision that affects development velocity, deployment, and team structure. This guide helps you make informed decisions.

## What is a Monorepo?

**Monorepo** is a single repository containing multiple related projects or services. All code lives in one place, making it easier to share code and coordinate changes.

### Monorepo Structure

```
monorepo/
├── packages/
│   ├── api/              # Express.js API
│   ├── auth-service/     # Authentication service
│   ├── user-service/     # User service
│   ├── shared/           # Shared utilities
│   └── types/            # Shared TypeScript types
├── package.json
└── lerna.json            # Monorepo tooling
```

## What are Microservices?

**Microservices** are independent services that communicate over the network. Each service has its own repository, deployment, and team.

### Microservices Structure

```
api-service/              # Separate repository
├── src/
├── package.json
└── Dockerfile

auth-service/             # Separate repository
├── src/
├── package.json
└── Dockerfile

user-service/             # Separate repository
├── src/
├── package.json
└── Dockerfile
```

## Monorepo Advantages

### 1. Code Sharing

```javascript
// Shared utilities in monorepo
// packages/shared/utils/validation.js
export function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Used in multiple services
// packages/api/src/routes/users.js
import { validateEmail } from '@shared/utils/validation';

// packages/auth-service/src/controllers/auth.js
import { validateEmail } from '@shared/utils/validation';
```

**Explanation:**
In a monorepo, shared code is easily accessible across services without publishing packages or duplicating code.

### 2. Atomic Changes

```javascript
// Change shared type affects all services immediately
// packages/shared/types/user.js
export interface User {
    id: number;
    name: string;
    email: string;
    // Added new field
    phone?: string;  // All services see this change
}
```

**Explanation:**
Changes to shared code are immediately available to all services, ensuring consistency.

### 3. Easier Refactoring

```javascript
// Refactor shared function
// packages/shared/utils/date.js
export function formatDate(date) {
    // Old implementation
    // return date.toISOString();
    
    // New implementation - all services get update
    return new Intl.DateTimeFormat('en-US').format(date);
}
```

**Explanation:**
Refactoring shared code updates all services at once, reducing the risk of inconsistencies.

## Monorepo Disadvantages

### 1. Larger Repository

```
Monorepo size: 2GB
- Multiple services
- Shared dependencies
- History of all services
```

### 2. Build Complexity

```json
// Complex build configuration
{
  "scripts": {
    "build": "lerna run build --parallel",
    "test": "lerna run test",
    "deploy": "lerna run deploy --scope=@app/api"
  }
}
```

### 3. Deployment Coupling

```javascript
// Deploying one service might require rebuilding others
// Change in shared code triggers builds for all services
```

## Microservices Advantages

### 1. Independent Deployment

```javascript
// Each service deploys independently
// api-service: Deploy version 1.2.3
// auth-service: Deploy version 2.1.0
// user-service: Deploy version 1.0.5

// No coordination needed
```

**Explanation:**
Services can be deployed independently, allowing teams to release at their own pace.

### 2. Technology Diversity

```javascript
// Different services can use different technologies
// api-service: Express.js
// auth-service: Express.js
// analytics-service: Python (FastAPI)
// ml-service: Python (Flask)
```

**Explanation:**
Each service can use the best technology for its specific needs.

### 3. Team Autonomy

```
Team A: Owns api-service
Team B: Owns auth-service
Team C: Owns user-service

Each team works independently
```

## Microservices Disadvantages

### 1. Code Duplication

```javascript
// Same validation logic in multiple services
// api-service/src/utils/validation.js
export function validateEmail(email) { ... }

// auth-service/src/utils/validation.js
export function validateEmail(email) { ... }  // Duplicated!

// user-service/src/utils/validation.js
export function validateEmail(email) { ... }  // Duplicated!
```

**Explanation:**
Shared logic must be duplicated or published as separate packages, increasing maintenance burden.

### 2. Network Complexity

```javascript
// Service-to-service communication
// api-service
app.post('/orders', async (req, res) => {
    // Call user-service
    const user = await fetch('http://user-service:3000/users/123');
    
    // Call inventory-service
    const inventory = await fetch('http://inventory-service:3000/check');
    
    // Call payment-service
    const payment = await fetch('http://payment-service:3000/charge', {
        method: 'POST',
        body: JSON.stringify({ ... })
    });
});
```

**Explanation:**
Microservices communicate over the network, adding latency and complexity.

### 3. Distributed System Challenges

```javascript
// Handling failures across services
try {
    const user = await fetch('http://user-service:3000/users/123');
    const inventory = await fetch('http://inventory-service:3000/check');
    // What if user-service succeeds but inventory-service fails?
    // Need distributed transactions or eventual consistency
} catch (error) {
    // Complex error handling across services
}
```

## When to Use Monorepo

### ✅ Good For:

- **Small to Medium Teams**: Easier coordination
- **Related Services**: Services share significant code
- **Rapid Development**: Need to move fast with shared changes
- **Startups**: Simpler setup and deployment

### Example: E-Commerce Platform

```javascript
// Monorepo structure
monorepo/
├── packages/
│   ├── api/              # Main API gateway
│   ├── auth/             # Authentication (shares user types)
│   ├── products/         # Products service (shares validation)
│   ├── orders/           # Orders service (shares payment types)
│   └── shared/           # Shared code
```

## When to Use Microservices

### ✅ Good For:

- **Large Teams**: Multiple teams working independently
- **Different Technologies**: Services need different stacks
- **Independent Scaling**: Services have different load patterns
- **Mature Organizations**: Have infrastructure for distributed systems

### Example: Large Platform

```javascript
// Microservices architecture
// api-service: Express.js (Node.js team)
// auth-service: Express.js (Security team)
// analytics-service: Python (Data team)
// ml-service: Python (ML team)
// Each in separate repository
```

## Hybrid Approach

### Monorepo with Microservices

```javascript
// Monorepo containing microservices
monorepo/
├── services/
│   ├── api/              # Express.js service
│   ├── auth/             # Express.js service
│   └── analytics/        # Python service
├── shared/               # Shared code
└── infrastructure/       # Docker, Kubernetes configs
```

**Explanation:**
Combine benefits: code sharing from monorepo, independent deployment of microservices.

## Real-World Examples

### Example 1: Startup (Monorepo)

```javascript
// Small team, fast iteration
monorepo/
├── packages/
│   ├── api/
│   ├── auth/
│   └── shared/

// Benefits:
// - Easy code sharing
// - Atomic changes
// - Simple deployment
```

### Example 2: Enterprise (Microservices)

```javascript
// Large organization, multiple teams
// api-service/ (Team A)
// auth-service/ (Team B)
// analytics-service/ (Team C)

// Benefits:
// - Team autonomy
// - Independent deployment
// - Technology diversity
```

## Best Practices

### For Monorepo:

1. **Use Tools**: Lerna, Nx, or Turborepo for management
2. **Clear Boundaries**: Define package boundaries clearly
3. **Shared Code**: Keep shared code in dedicated packages
4. **CI/CD**: Set up proper build and test pipelines

### For Microservices:

1. **API Contracts**: Define clear API contracts between services
2. **Service Discovery**: Use service discovery (Consul, Eureka)
3. **Monitoring**: Implement distributed tracing
4. **Documentation**: Document service boundaries and APIs

## Decision Framework

```
Start
  │
  ├─ Small team (< 10)? → Consider Monorepo
  │
  ├─ Services share > 30% code? → Consider Monorepo
  │
  ├─ Need independent deployment? → Consider Microservices
  │
  ├─ Multiple teams? → Consider Microservices
  │
  └─ Need different technologies? → Consider Microservices
```

## Summary

**Monorepo vs Microservices:**

1. **Monorepo**: Single repository, easier code sharing, simpler setup
2. **Microservices**: Separate repositories, independent deployment, team autonomy
3. **Choose Monorepo**: Small teams, shared code, rapid development
4. **Choose Microservices**: Large teams, independent scaling, technology diversity
5. **Hybrid**: Monorepo containing microservices for best of both

**Key Takeaway:**
Monorepo is better for small teams with shared code and rapid development needs. Microservices are better for large teams needing independent deployment and scaling. Consider your team size, code sharing needs, and deployment requirements when choosing. You can also use a hybrid approach: monorepo containing microservices.

**Decision Factors:**
- Team size
- Code sharing needs
- Deployment requirements
- Technology diversity
- Organizational maturity

**Next Steps:**
- Learn [Recommended Layout](recommended_layout.md) for project structure
- Study [Dependency Injection](dependency_injection_best_practices.md) for service design
- Master [Deployment](../15_deployment_and_performance/) for production setup

