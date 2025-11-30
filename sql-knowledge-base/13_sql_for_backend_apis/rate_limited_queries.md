# Rate-Limited Queries: Preventing Database Abuse

Rate-limiting queries prevents database abuse and ensures fair resource usage. This guide covers strategies for implementing query rate limiting.

## What is Query Rate Limiting?

**Query rate limiting** restricts the number of queries a user or service can execute within a time period. It prevents abuse and ensures database stability.

### Basic Concept

```
User can execute:
- 100 queries per minute
- 1000 queries per hour
- 10000 queries per day

If limit exceeded:
- Query rejected
- Error returned
- Wait before retry
```

## Application-Level Rate Limiting

### Token Bucket Algorithm

```python
# Python: Token bucket rate limiter
import time
from collections import defaultdict

class RateLimiter:
    def __init__(self, max_queries, window_seconds):
        self.max_queries = max_queries
        self.window_seconds = window_seconds
        self.requests = defaultdict(list)
    
    def is_allowed(self, user_id):
        now = time.time()
        user_requests = self.requests[user_id]
        
        # Remove old requests outside window
        user_requests[:] = [
            req_time for req_time in user_requests
            if now - req_time < self.window_seconds
        ]
        
        # Check limit
        if len(user_requests) >= self.max_queries:
            return False
        
        # Add current request
        user_requests.append(now)
        return True

# Usage
limiter = RateLimiter(max_queries=100, window_seconds=60)

def execute_query(user_id, query):
    if not limiter.is_allowed(user_id):
        raise RateLimitError("Too many queries")
    
    return db.execute(query)
```

### Sliding Window

```python
# Sliding window rate limiter
from collections import deque

class SlidingWindowLimiter:
    def __init__(self, max_queries, window_seconds):
        self.max_queries = max_queries
        self.window_seconds = window_seconds
        self.requests = defaultdict(deque)
    
    def is_allowed(self, user_id):
        now = time.time()
        user_requests = self.requests[user_id]
        
        # Remove expired requests
        while user_requests and now - user_requests[0] > self.window_seconds:
            user_requests.popleft()
        
        # Check limit
        if len(user_requests) >= self.max_queries:
            return False
        
        # Add current request
        user_requests.append(now)
        return True
```

## Database-Level Rate Limiting

### Connection Limits

```sql
-- PostgreSQL: Limit connections per user
ALTER ROLE app_user CONNECTION LIMIT 10;
-- User can have max 10 connections
```

### Query Timeout

```sql
-- Set query timeout
SET statement_timeout = '30s';
-- Queries longer than 30 seconds are cancelled
```

### Resource Limits

```sql
-- Limit resources per role
ALTER ROLE app_user SET work_mem = '64MB';
ALTER ROLE app_user SET max_connections = 10;
```

## Redis-Based Rate Limiting

### Using Redis

```python
# Python: Redis rate limiter
import redis
import time

redis_client = redis.Redis(host='localhost', port=6379)

def is_rate_limited(user_id, max_queries, window_seconds):
    key = f"rate_limit:{user_id}"
    current = redis_client.incr(key)
    
    if current == 1:
        redis_client.expire(key, window_seconds)
    
    return current > max_queries

# Usage
def execute_query(user_id, query):
    if is_rate_limited(user_id, max_queries=100, window_seconds=60):
        raise RateLimitError("Too many queries")
    
    return db.execute(query)
```

### Sliding Window with Redis

```python
# Redis sliding window
def is_rate_limited_sliding(user_id, max_queries, window_seconds):
    key = f"rate_limit:{user_id}"
    now = time.time()
    
    # Remove old entries
    redis_client.zremrangebyscore(key, 0, now - window_seconds)
    
    # Count current requests
    count = redis_client.zcard(key)
    
    if count >= max_queries:
        return True
    
    # Add current request
    redis_client.zadd(key, {str(now): now})
    redis_client.expire(key, window_seconds)
    
    return False
```

## Real-World Examples

### Example 1: API Rate Limiting

```python
# API endpoint with rate limiting
from flask import Flask, request, jsonify
from functools import wraps

app = Flask(__name__)
limiter = RateLimiter(max_queries=100, window_seconds=60)

def rate_limit(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = request.headers.get('X-User-ID')
        
        if not limiter.is_allowed(user_id):
            return jsonify({'error': 'Rate limit exceeded'}), 429
        
        return f(*args, **kwargs)
    return decorated_function

@app.route('/api/users/<user_id>')
@rate_limit
def get_user(user_id):
    user = db.query("SELECT * FROM users WHERE id = %s", user_id)
    return jsonify(user)
```

### Example 2: Per-User Limits

```python
# Different limits for different users
def get_rate_limit(user_id):
    # Premium users: higher limits
    if is_premium_user(user_id):
        return RateLimiter(max_queries=1000, window_seconds=60)
    
    # Regular users: standard limits
    return RateLimiter(max_queries=100, window_seconds=60)

# Usage
limiter = get_rate_limit(user_id)
if not limiter.is_allowed(user_id):
    raise RateLimitError("Too many queries")
```

### Example 3: Query Type Limits

```python
# Different limits for different query types
READ_LIMIT = RateLimiter(max_queries=1000, window_seconds=60)
WRITE_LIMIT = RateLimiter(max_queries=100, window_seconds=60)

def execute_query(user_id, query, query_type):
    if query_type == 'read':
        if not READ_LIMIT.is_allowed(user_id):
            raise RateLimitError("Read limit exceeded")
    elif query_type == 'write':
        if not WRITE_LIMIT.is_allowed(user_id):
            raise RateLimitError("Write limit exceeded")
    
    return db.execute(query)
```

## Best Practices

1. **Set Appropriate Limits**: Balance usability and protection
2. **Different Limits**: Different limits for different users/operations
3. **Clear Errors**: Return clear rate limit error messages
4. **Monitor**: Track rate limit hits and adjust limits
5. **Graceful Degradation**: Handle rate limits gracefully

## Common Mistakes

### ❌ Too Restrictive

```python
# ❌ Bad: Too restrictive
limiter = RateLimiter(max_queries=10, window_seconds=60)
# Users hit limit too quickly

# ✅ Good: Reasonable limits
limiter = RateLimiter(max_queries=100, window_seconds=60)
```

### ❌ No Rate Limiting

```python
# ❌ Bad: No rate limiting
def execute_query(query):
    return db.execute(query)
# Vulnerable to abuse

# ✅ Good: Rate limiting
def execute_query(user_id, query):
    if not limiter.is_allowed(user_id):
        raise RateLimitError("Too many queries")
    return db.execute(query)
```

## Summary

**Rate-Limited Queries:**

1. **Purpose**: Prevent database abuse and ensure fair usage
2. **Methods**: Application-level, database-level, Redis-based
3. **Algorithms**: Token bucket, sliding window
4. **Implementation**: Per-user, per-operation, per-time-window
5. **Best Practice**: Set appropriate limits, monitor usage

**Key Takeaway:**
Rate-limiting queries prevents database abuse by restricting the number of queries users can execute within a time period. Implement rate limiting at the application level using token bucket or sliding window algorithms, or use Redis for distributed rate limiting. Set appropriate limits based on user types and operations. Monitor rate limit hits and adjust limits as needed.

**Rate Limiting Strategy:**
- Set reasonable limits (100 queries/minute typical)
- Different limits for different users/operations
- Use Redis for distributed systems
- Monitor and adjust limits
- Return clear error messages

**Next Steps:**
- Learn [Connection Pooling](../09_transactions_concurrency/connection_pooling.md) for connection management
- Study [Performance Optimization](../10_performance_optimization/) for tuning
- Master [Caching Strategies](../10_performance_optimization/caching_strategies.md) for reducing queries

