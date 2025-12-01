# Load Testing: Performance Testing for Express.js

Load testing measures application performance under load. This guide covers load testing Express.js applications.

## Using Artillery

### Installation

```bash
npm install -g artillery
```

### Basic Test

```yaml
# load-test.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10  # 10 requests per second

scenarios:
  - name: 'Get users'
    flow:
      - get:
          url: '/users'
```

### Run Test

```bash
artillery run load-test.yml
```

## Real-World Examples

### Example 1: Comprehensive Load Test

```yaml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: 'Warm up'
    - duration: 120
      arrivalRate: 50
      name: 'Sustained load'
    - duration: 60
      arrivalRate: 100
      name: 'Spike test'

scenarios:
  - name: 'User operations'
    flow:
      - post:
          url: '/users'
          json:
            email: 'test@example.com'
            name: 'Test User'
      - get:
          url: '/users/{{ userId }}'
      - put:
          url: '/users/{{ userId }}'
          json:
            name: 'Updated Name'
```

## Best Practices

1. **Start Small**: Gradually increase load
2. **Monitor Metrics**: Response time, error rate
3. **Test Realistic Scenarios**: Simulate real usage
4. **Monitor Resources**: CPU, memory, database
5. **Iterate**: Test, optimize, retest

## Summary

**Load Testing:**

1. **Purpose**: Measure performance under load
2. **Tools**: Artillery, k6, Locust
3. **Metrics**: Response time, throughput, error rate
4. **Best Practice**: Start small, monitor metrics
5. **Benefits**: Performance validation, capacity planning

**Key Takeaway:**
Load testing measures application performance under load. Use tools like Artillery to simulate load. Start with small load and gradually increase. Monitor response times, throughput, and error rates. Test realistic scenarios. Monitor system resources (CPU, memory, database).

**Testing Strategy:**
- Start small
- Monitor metrics
- Test realistic scenarios
- Monitor resources
- Iterate and optimize

**Next Steps:**
- Learn [Performance Optimization](performance_optimization.md) for tuning
- Study [Scaling Strategies](scaling_strategies.md) for growth
- Master [Monitoring](../14_observability/) for observability

