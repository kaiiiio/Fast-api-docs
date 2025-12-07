# Avoiding N+1 Queries: Optimizing Relationship Queries

N+1 query problem occurs when you fetch a list of records and then make additional queries for each record's related data. It's a common performance issue that can be easily fixed.

## What is the N+1 Query Problem?

**N+1 queries** means executing 1 query to get N records, then N additional queries to get related data for each record.

### Example: The Problem

```sql
-- Query 1: Get all users (1 query)
SELECT * FROM users;
-- Returns: 100 users

-- Then for each user, query orders (100 queries)
SELECT * FROM orders WHERE user_id = 1;
SELECT * FROM orders WHERE user_id = 2;
SELECT * FROM orders WHERE user_id = 3;
-- ... (100 more queries)

-- Total: 1 + 100 = 101 queries (N+1 problem!)
```

## Solution 1: JOIN (Single Query)

### Using JOIN to Fetch Related Data

```sql
-- ✅ Good: Single query with JOIN
SELECT 
    u.id AS user_id,
    u.name AS user_name,
    o.id AS order_id,
    o.total AS order_total
FROM users u
LEFT JOIN orders o ON u.id = o.user_id;

-- Returns all users with their orders in one query
-- Total: 1 query (solves N+1!)
```

### Handling Multiple Relationships

```sql
-- Users with orders and order items
SELECT 
    u.id AS user_id,
    u.name AS user_name,
    o.id AS order_id,
    o.total AS order_total,
    oi.id AS item_id,
    oi.quantity AS item_quantity
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
LEFT JOIN order_items oi ON o.id = oi.order_id;

-- Single query gets all related data
```

## Solution 2: IN Clause (Two Queries)

### Fetch Related Data with IN

```sql
-- ✅ Good: Two queries instead of N+1
-- Query 1: Get users
SELECT * FROM users;
-- Returns: 100 users

-- Query 2: Get all orders for those users
SELECT * FROM orders 
WHERE user_id IN (1, 2, 3, ..., 100);
-- Returns: All orders for all users

-- Total: 2 queries (much better than 101!)
```

### Application-Level Combination

```python
# Python example
users = db.query("SELECT * FROM users")
user_ids = [user.id for user in users]

orders = db.query(
    "SELECT * FROM orders WHERE user_id IN %s",
    (tuple(user_ids),)
)

# Combine in application
for user in users:
    user.orders = [o for o in orders if o.user_id == user.id]
```

## Solution 3: Subquery (Single Query)

### Using Subquery

```sql
-- ✅ Good: Single query with subquery
SELECT 
    u.*,
    (
        SELECT COUNT(*)
        FROM orders o
        WHERE o.user_id = u.id
    ) AS order_count
FROM users u;

-- Gets users with order count in one query
```

### Correlated Subquery

```sql
-- Get users with latest order
SELECT 
    u.*,
    (
        SELECT o.total
        FROM orders o
        WHERE o.user_id = u.id
        ORDER BY o.created_at DESC
        LIMIT 1
    ) AS latest_order_total
FROM users u;
```

## Real-World Examples

### Example 1: Blog Posts with Comments

```sql
-- ❌ N+1 Problem
-- Query 1: Get posts
SELECT * FROM posts;

-- Query 2-N: Get comments for each post
SELECT * FROM comments WHERE post_id = 1;
SELECT * FROM comments WHERE post_id = 2;
-- ... (N queries)

-- ✅ Solution: JOIN
SELECT 
    p.id AS post_id,
    p.title AS post_title,
    c.id AS comment_id,
    c.content AS comment_content
FROM posts p
LEFT JOIN comments c ON p.id = c.post_id;
```

### Example 2: Products with Categories

```sql
-- ❌ N+1 Problem
SELECT * FROM products;
-- Then: SELECT * FROM categories WHERE id = ? (for each product)

-- ✅ Solution: JOIN
SELECT 
    p.id AS product_id,
    p.name AS product_name,
    c.id AS category_id,
    c.name AS category_name
FROM products p
LEFT JOIN categories c ON p.category_id = c.id;
```

### Example 3: Users with Roles

```sql
-- ❌ N+1 Problem (Many-to-Many)
SELECT * FROM users;
-- Then: SELECT * FROM user_roles WHERE user_id = ? (for each user)
-- Then: SELECT * FROM roles WHERE id = ? (for each role)

-- ✅ Solution: JOINs
SELECT 
    u.id AS user_id,
    u.name AS user_name,
    r.id AS role_id,
    r.name AS role_name
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id;
```

## ORM Patterns

### Django ORM

```python
# ❌ N+1 Problem
users = User.objects.all()
for user in users:
    print(user.orders.all())  # Query for each user

# ✅ Solution: select_related or prefetch_related
users = User.objects.prefetch_related('orders')
for user in users:
    print(user.orders.all())  # No additional queries
```

### SQLAlchemy

```python
# ❌ N+1 Problem
users = session.query(User).all()
for user in users:
    print(user.orders)  # Query for each user

# ✅ Solution: joinedload
from sqlalchemy.orm import joinedload

users = session.query(User).options(joinedload(User.orders)).all()
for user in users:
    print(user.orders)  # No additional queries
```

### Sequelize

```javascript
// ❌ N+1 Problem
const users = await User.findAll();
for (const user of users) {
    const orders = await user.getOrders();  // Query for each user
}

// ✅ Solution: include
const users = await User.findAll({
    include: [{ model: Order }]
});
// All orders loaded in one query
```

## Performance Impact

### N+1 Queries

```
100 users × 1 query each = 100 queries
+ 1 initial query = 101 total queries
Time: 101 × 10ms = 1,010ms (1 second)
```

### Optimized (JOIN)

```
1 query with JOIN = 1 query
Time: 1 × 50ms = 50ms
Improvement: 20x faster!
```

## Best Practices

1. **Always JOIN**: Use JOINs for related data
2. **Use IN**: When JOINs aren't suitable
3. **ORM Eager Loading**: Use ORM features (prefetch_related, include)
4. **Monitor Queries**: Log queries to detect N+1
5. **Test Performance**: Measure before/after optimization

## Detecting N+1 Queries

### Query Logging

```sql
-- Enable query logging
SET log_statement = 'all';
SET log_duration = on;

-- Check logs for repeated patterns
```

### Application Monitoring

```python
# Count queries
query_count = 0

def log_query(query):
    global query_count
    query_count += 1
    print(f"Query {query_count}: {query}")

# After operation, check query_count
# If count >> expected, likely N+1 problem
```

## Common Mistakes

### ❌ Fetching in Loop

```python
# ❌ Bad: N+1 queries
users = get_all_users()
for user in users:
    orders = get_orders_for_user(user.id)  # Query in loop!

# ✅ Good: Single query
users = get_all_users()
all_orders = get_all_orders_for_users([u.id for u in users])
# Combine in application
```

### ❌ Missing JOIN

```sql
-- ❌ Bad: Separate queries
SELECT * FROM users;
SELECT * FROM orders WHERE user_id = 1;
SELECT * FROM orders WHERE user_id = 2;

-- ✅ Good: JOIN
SELECT u.*, o.*
FROM users u
LEFT JOIN orders o ON u.id = o.user_id;
```

## Summary

**Avoiding N+1 Queries:**

1. **Problem**: 1 query + N queries for related data
2. **Solution 1**: JOIN (single query)
3. **Solution 2**: IN clause (2 queries)
4. **Solution 3**: Subquery (single query)
5. **Impact**: Massive performance improvement

**Key Takeaway:**
N+1 queries are a common performance problem where you fetch N records and then make N additional queries for related data. Solve it by using JOINs, IN clauses, or subqueries to fetch all related data in fewer queries. Use ORM eager loading features. Always monitor queries to detect N+1 problems.

**Solutions:**
- JOIN: Single query with all data
- IN: Two queries (fetch list, then fetch related)
- Subquery: Single query with aggregated data

**Next Steps:**
- Learn [JOINs](../04_joins/inner_join.md) for relationship queries
- Study [Query Optimization Tips](query_optimization_tips.md) for techniques
- Master [Performance Optimization](../10_performance_optimization/) for tuning

---

## 🎯 Interview Questions: SQL

### Q1: Explain the N+1 query problem in detail. Provide examples showing how it occurs, why it's a performance issue, and multiple solutions (JOINs, batch loading, eager loading) with performance comparisons. Discuss how to detect and prevent N+1 queries in both raw SQL and ORM contexts.

**Answer:**

**N+1 Query Problem Definition:**

The N+1 query problem is a common database performance anti-pattern where an application makes N+1 database queries to fetch related data instead of fetching it in a single query or a small number of queries. The "N" represents the number of parent records, and the "+1" represents the initial query to fetch those parent records.

**How N+1 Problem Occurs:**

**Basic Pattern:**
1. Execute 1 query to fetch N parent records
2. For each of the N records, execute 1 query to fetch related data
3. Total: 1 + N queries (hence "N+1")

**Example Scenario:**

**Schema:**
```sql
CREATE TABLE users (
    id INT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(255)
);

CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id INT REFERENCES users(id),
    total DECIMAL(10,2),
    created_at TIMESTAMP
);
```

**N+1 Problem Example:**

**Application Code (Pseudo-code):**
```python
# Query 1: Fetch all users
users = db.query("SELECT * FROM users");
# Returns: 100 users

# Query 2-101: For each user, fetch their orders
for user in users:
    orders = db.query("SELECT * FROM orders WHERE user_id = ?", user.id);
    # Executes 100 times!
    # Total: 1 + 100 = 101 queries
```

**SQL Execution:**
```sql
-- Query 1 (executed once)
SELECT * FROM users;
-- Returns: 100 rows

-- Query 2 (executed 100 times, once per user)
SELECT * FROM orders WHERE user_id = 1;
SELECT * FROM orders WHERE user_id = 2;
SELECT * FROM orders WHERE user_id = 3;
-- ... (97 more queries)
SELECT * FROM orders WHERE user_id = 100;
```

**Why It's a Performance Problem:**

**Performance Impact:**

**Scenario:** 1,000 users, average 10 orders per user

**N+1 Approach:**
```
Queries: 1 + 1,000 = 1,001 queries
Time per query: ~10ms (network + database)
Total time: 1,001 × 10ms = 10,010ms ≈ 10 seconds
Database load: 1,001 query executions
Network round trips: 1,001
```

**Optimized Approach (JOIN):**
```
Queries: 1
Time: ~50ms (single query with JOIN)
Total time: 50ms
Database load: 1 query execution
Network round trips: 1
Improvement: 200x faster!
```

**Problems:**
1. **Excessive Database Load**: Many queries stress the database
2. **Network Latency**: Each query has network overhead
3. **Slow Response Times**: User experiences delays
4. **Scalability Issues**: Performance degrades with data growth
5. **Resource Waste**: Unnecessary CPU and I/O usage

**Solutions:**

**Solution 1: JOIN (Single Query)**

**Approach:** Fetch all data in one query using JOINs

**SQL:**
```sql
-- Single query with JOIN
SELECT 
    u.id AS user_id,
    u.name AS user_name,
    u.email AS user_email,
    o.id AS order_id,
    o.total AS order_total,
    o.created_at AS order_date
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
ORDER BY u.id, o.created_at DESC;
```

**Result Structure:**
```
┌─────────┬──────────┬──────────────────┬───────────┬──────────┬─────────────────────┐
│ user_id │ user_name│ user_email       │ order_id  │ order_total│ order_date        │
├─────────┼──────────┼──────────────────┼───────────┼──────────┼─────────────────────┤
│ 1       │ John     │ john@example.com │ 101       │ 99.99    │ 2024-01-15 10:00:00 │
│ 1       │ John     │ john@example.com │ 102       │ 149.99   │ 2024-01-20 14:30:00 │
│ 2       │ Jane     │ jane@example.com │ 103       │ 79.99    │ 2024-01-18 09:15:00 │
│ 3       │ Bob      │ bob@example.com  │ NULL      │ NULL     │ NULL                │
└─────────┴──────────┴──────────────────┴───────────┴──────────┴─────────────────────┘
```

**Application Code:**
```python
# Single query
results = db.query("""
    SELECT u.*, o.*
    FROM users u
    LEFT JOIN orders o ON u.id = o.user_id
""");

# Group results in application
users_with_orders = {}
for row in results:
    user_id = row['user_id']
    if user_id not in users_with_orders:
        users_with_orders[user_id] = {
            'user': {'id': row['user_id'], 'name': row['user_name'], ...},
            'orders': []
        }
    if row['order_id']:
        users_with_orders[user_id]['orders'].append({
            'id': row['order_id'], 'total': row['order_total'], ...
        });
```

**Performance:**
- **Queries**: 1
- **Time**: ~50ms
- **Efficiency**: Excellent

**Solution 2: Batch Loading (IN Clause)**

**Approach:** Fetch related data in batches using IN clause

**SQL:**
```sql
-- Query 1: Fetch users
SELECT * FROM users;
-- Returns: 100 users

-- Query 2: Fetch all orders for those users (single query)
SELECT * FROM orders 
WHERE user_id IN (1, 2, 3, ..., 100);
-- Single query for all orders
```

**Application Code:**
```python
# Query 1: Fetch users
users = db.query("SELECT * FROM users");
user_ids = [user['id'] for user in users];

# Query 2: Fetch all orders in one query
placeholders = ','.join(['?'] * len(user_ids));
orders = db.query(f"SELECT * FROM orders WHERE user_id IN ({placeholders})", *user_ids);

# Group orders by user_id in application
orders_by_user = {};
for order in orders:
    user_id = order['user_id'];
    if user_id not in orders_by_user:
        orders_by_user[user_id] = [];
    orders_by_user[user_id].append(order);

# Combine
for user in users:
    user['orders'] = orders_by_user.get(user['id'], []);
```

**Performance:**
- **Queries**: 2 (instead of 1,001)
- **Time**: ~60ms
- **Efficiency**: Very good (slightly slower than JOIN due to 2 queries)

**Solution 3: Eager Loading (ORM)**

**Approach:** Use ORM features to automatically load related data

**Django ORM:**
```python
# ❌ N+1 Problem
users = User.objects.all()
for user in users:
    print(user.orders.all())  # Query for each user
# 1 + N queries

# ✅ Solution: prefetch_related
users = User.objects.prefetch_related('orders')
for user in users:
    print(user.orders.all())  # No additional queries
# 2 queries total (users + orders)
```

**SQLAlchemy:**
```python
# ❌ N+1 Problem
users = session.query(User).all()
for user in users:
    print(user.orders)  # Query for each user

# ✅ Solution: joinedload
from sqlalchemy.orm import joinedload
users = session.query(User).options(joinedload(User.orders)).all()
for user in users:
    print(user.orders)  # No additional queries
# 1 query with JOIN
```

**Sequelize (Node.js):**
```javascript
// ❌ N+1 Problem
const users = await User.findAll();
for (const user of users) {
    const orders = await user.getOrders();  // Query for each user
}

// ✅ Solution: include
const users = await User.findAll({
    include: [{ model: Order }]
});
// All orders loaded in one query
```

**Performance Comparison:**

**Test Scenario:** 1,000 users, average 10 orders per user

| Approach | Queries | Time | Database Load | Network Round Trips |
|----------|---------|------|---------------|---------------------|
| **N+1** | 1,001 | 10,010ms | Very High | 1,001 |
| **JOIN** | 1 | 50ms | Low | 1 |
| **IN Clause** | 2 | 60ms | Low | 2 |
| **Eager Loading** | 1-2 | 50-60ms | Low | 1-2 |

**JOIN is fastest, but all optimized approaches are 200x faster than N+1!**

**Detecting N+1 Queries:**

**1. Query Logging:**

**Enable Database Query Logging:**
```sql
-- PostgreSQL
SET log_statement = 'all';
SET log_duration = on;

-- Check logs for repeated query patterns
-- Look for: Same query with different parameters executed many times
```

**2. Application Monitoring:**

**Count Queries:**
```python
query_count = 0

def log_query(query):
    global query_count
    query_count += 1
    print(f"Query {query_count}: {query}")

# After operation
print(f"Total queries: {query_count}")
# If count >> expected, likely N+1 problem
```

**3. ORM Query Logging:**

**Django:**
```python
# settings.py
LOGGING = {
    'loggers': {
        'django.db.backends': {
            'level': 'DEBUG',
        },
    },
}
# Logs all SQL queries
```

**SQLAlchemy:**
```python
import logging
logging.basicConfig()
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
# Logs all SQL queries
```

**4. Performance Profiling:**

**Identify Slow Operations:**
```python
import time

start = time.time()
# Your code that might have N+1
users = get_users_with_orders()
end = time.time()

if end - start > 1.0:  # Takes more than 1 second
    # Likely performance issue, check for N+1
    print("Warning: Slow operation detected")
```

**Preventing N+1 Queries:**

**1. Always Use JOINs for Related Data:**
```sql
-- ✅ Good: JOIN
SELECT u.*, o.*
FROM users u
LEFT JOIN orders o ON u.id = o.user_id;

-- ❌ Bad: Separate queries
SELECT * FROM users;
-- Then: SELECT * FROM orders WHERE user_id = ? (for each user)
```

**2. Use ORM Eager Loading:**
```python
# ✅ Always use eager loading
users = User.objects.prefetch_related('orders')
# or
users = session.query(User).options(joinedload(User.orders)).all()
```

**3. Batch Load Related Data:**
```python
# ✅ Fetch related data in batches
user_ids = [user.id for user in users]
orders = Order.objects.filter(user_id__in=user_ids)
# Then group in application
```

**4. Use Select Related (One-to-One, Foreign Key):**
```python
# Django: select_related for ForeignKey/OneToOne
users = User.objects.select_related('profile')
# Single JOIN query
```

**5. Use Prefetch Related (Many-to-Many, Reverse Foreign Key):**
```python
# Django: prefetch_related for ManyToMany/Reverse FK
users = User.objects.prefetch_related('orders')
# Two queries: users + orders
```

**Real-World Example: E-commerce API**

**Endpoint:** GET /api/users/{id}/orders

**❌ N+1 Problem:**
```python
def get_user_orders(user_id):
    # Query 1
    user = db.query("SELECT * FROM users WHERE id = ?", user_id)
    
    # Query 2
    orders = db.query("SELECT * FROM orders WHERE user_id = ?", user_id)
    
    # Query 3-N: For each order, fetch items
    for order in orders:
        items = db.query("SELECT * FROM order_items WHERE order_id = ?", order.id)
        # N+1 problem!
    
    return {'user': user, 'orders': orders}
```

**✅ Optimized:**
```python
def get_user_orders(user_id):
    # Single query with JOINs
    results = db.query("""
        SELECT 
            u.*,
            o.id AS order_id,
            o.total AS order_total,
            oi.id AS item_id,
            oi.product_id,
            oi.quantity,
            oi.price
        FROM users u
        JOIN orders o ON u.id = o.user_id
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE u.id = ?
    """, user_id)
    
    # Group results in application
    # ... grouping logic ...
    
    return {'user': user, 'orders': orders}
```

**System Design Consideration**: Preventing N+1 queries is crucial for:
1. **API Performance**: Fast response times for users
2. **Database Efficiency**: Reducing database load
3. **Scalability**: Ensuring performance scales with data growth
4. **Cost**: Reducing database compute costs

The N+1 query problem is a critical performance issue that can make applications slow and unresponsive. The solution is to fetch related data in fewer queries using JOINs, batch loading, or ORM eager loading. Always monitor queries and use appropriate loading strategies to prevent N+1 problems. Understanding and preventing N+1 queries is essential for building performant database-backed applications.

---

### Q2: Explain how to optimize queries that fetch related data to avoid N+1 problems. Discuss different strategies for one-to-many, many-to-many, and nested relationships. Provide code examples showing the transformation from N+1 queries to optimized queries.

**Answer:**

**Optimization Strategies by Relationship Type:**

Different relationship types require different optimization strategies. Understanding how to optimize each type is crucial for eliminating N+1 queries and improving application performance.

**1. One-to-Many Relationships:**

**Scenario:** Users have many Orders

**❌ N+1 Problem:**
```sql
-- Query 1: Fetch users
SELECT * FROM users;
-- Returns: 100 users

-- Queries 2-101: Fetch orders for each user
SELECT * FROM orders WHERE user_id = 1;
SELECT * FROM orders WHERE user_id = 2;
-- ... (98 more queries)
```

**✅ Solution 1: LEFT JOIN**
```sql
-- Single query with JOIN
SELECT 
    u.id AS user_id,
    u.name AS user_name,
    u.email AS user_email,
    o.id AS order_id,
    o.total AS order_total,
    o.created_at AS order_date
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
ORDER BY u.id, o.created_at DESC;
```

**Result Processing:**
```python
# Group results in application
users_dict = {}
for row in results:
    user_id = row['user_id']
    if user_id not in users_dict:
        users_dict[user_id] = {
            'id': row['user_id'],
            'name': row['user_name'],
            'email': row['user_email'],
            'orders': []
        }
    if row['order_id']:  # User has orders
        users_dict[user_id]['orders'].append({
            'id': row['order_id'],
            'total': row['order_total'],
            'created_at': row['order_date']
        })
```

**✅ Solution 2: Batch Loading with IN**
```sql
-- Query 1: Fetch users
SELECT * FROM users;

-- Query 2: Fetch all orders in one query
SELECT * FROM orders 
WHERE user_id IN (1, 2, 3, ..., 100);
```

**Application Code:**
```python
# Fetch users
users = db.query("SELECT * FROM users")
user_ids = [u['id'] for u in users]

# Fetch all orders
placeholders = ','.join(['?'] * len(user_ids))
orders = db.query(
    f"SELECT * FROM orders WHERE user_id IN ({placeholders})",
    *user_ids
)

# Group orders by user_id
orders_by_user = {}
for order in orders:
    user_id = order['user_id']
    if user_id not in orders_by_user:
        orders_by_user[user_id] = []
    orders_by_user[user_id].append(order)

# Attach orders to users
for user in users:
    user['orders'] = orders_by_user.get(user['id'], [])
```

**2. Many-to-Many Relationships:**

**Scenario:** Users have many Roles through user_roles junction table

**Schema:**
```sql
CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(100));
CREATE TABLE roles (id INT PRIMARY KEY, name VARCHAR(100));
CREATE TABLE user_roles (
    user_id INT REFERENCES users(id),
    role_id INT REFERENCES roles(id),
    PRIMARY KEY (user_id, role_id)
);
```

**❌ N+1 Problem:**
```sql
-- Query 1: Fetch users
SELECT * FROM users;

-- Queries 2-101: Fetch roles for each user
SELECT r.* 
FROM roles r
JOIN user_roles ur ON r.id = ur.role_id
WHERE ur.user_id = 1;

SELECT r.* 
FROM roles r
JOIN user_roles ur ON r.id = ur.role_id
WHERE ur.user_id = 2;
-- ... (98 more queries)
```

**✅ Solution: Multiple JOINs**
```sql
-- Single query with JOINs
SELECT 
    u.id AS user_id,
    u.name AS user_name,
    r.id AS role_id,
    r.name AS role_name
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
ORDER BY u.id, r.id;
```

**Result Processing:**
```python
# Group results
users_dict = {}
for row in results:
    user_id = row['user_id']
    if user_id not in users_dict:
        users_dict[user_id] = {
            'id': user_id,
            'name': row['user_name'],
            'roles': []
        }
    if row['role_id']:  # User has roles
        users_dict[user_id]['roles'].append({
            'id': row['role_id'],
            'name': row['role_name']
        })
```

**✅ Alternative: Batch Loading**
```sql
-- Query 1: Fetch users
SELECT * FROM users;

-- Query 2: Fetch all user-role mappings
SELECT ur.user_id, r.*
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
WHERE ur.user_id IN (1, 2, 3, ..., 100);
```

**3. Nested Relationships (Multiple Levels):**

**Scenario:** Users → Orders → Order Items → Products

**❌ N+1 Problem (Multiple Levels):**
```sql
-- Query 1: Users
SELECT * FROM users;

-- Queries 2-101: Orders for each user
SELECT * FROM orders WHERE user_id = 1;
-- ...

-- Queries 102-1001: Order items for each order
SELECT * FROM order_items WHERE order_id = 101;
-- ...

-- Queries 1002-5001: Products for each item
SELECT * FROM products WHERE id = 501;
-- ...
-- Total: 1 + 100 + 1,000 + 4,000 = 5,101 queries!
```

**✅ Solution: Multiple JOINs**
```sql
-- Single query with all JOINs
SELECT 
    u.id AS user_id,
    u.name AS user_name,
    o.id AS order_id,
    o.total AS order_total,
    oi.id AS item_id,
    oi.quantity AS item_quantity,
    p.id AS product_id,
    p.name AS product_name,
    p.price AS product_price
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN products p ON oi.product_id = p.id
ORDER BY u.id, o.id, oi.id;
```

**Result Processing (Nested Grouping):**
```python
# Nested grouping
users_dict = {}
for row in results:
    user_id = row['user_id']
    
    # Initialize user
    if user_id not in users_dict:
        users_dict[user_id] = {
            'id': user_id,
            'name': row['user_name'],
            'orders': {}
        }
    
    # Initialize order
    if row['order_id']:
        order_id = row['order_id']
        if order_id not in users_dict[user_id]['orders']:
            users_dict[user_id]['orders'][order_id] = {
                'id': order_id,
                'total': row['order_total'],
                'items': []
            }
        
        # Add item
        if row['item_id']:
            users_dict[user_id]['orders'][order_id]['items'].append({
                'id': row['item_id'],
                'quantity': row['item_quantity'],
                'product': {
                    'id': row['product_id'],
                    'name': row['product_name'],
                    'price': row['product_price']
                }
            })

# Convert to lists
for user in users_dict.values():
    user['orders'] = list(user['orders'].values())
    for order in user['orders']:
        order['items'] = list(order['items'])
```

**✅ Alternative: Staged Batch Loading**
```python
# Stage 1: Fetch users
users = db.query("SELECT * FROM users")
user_ids = [u['id'] for u in users]

# Stage 2: Fetch all orders
orders = db.query(
    "SELECT * FROM orders WHERE user_id IN (?)",
    user_ids
)
order_ids = [o['id'] for o in orders]

# Stage 3: Fetch all order items
items = db.query(
    "SELECT * FROM order_items WHERE order_id IN (?)",
    order_ids
)
product_ids = [item['product_id'] for item in items]

# Stage 4: Fetch all products
products = db.query(
    "SELECT * FROM products WHERE id IN (?)",
    product_ids
)

# Group in application (4 queries total instead of 5,101!)
```

**4. Conditional Relationships:**

**Scenario:** Fetch users with their active orders only

**❌ N+1 Problem:**
```python
users = db.query("SELECT * FROM users")
for user in users:
    orders = db.query(
        "SELECT * FROM orders WHERE user_id = ? AND status = 'active'",
        user['id']
    )
```

**✅ Solution: Filter in JOIN**
```sql
-- Filter in JOIN condition
SELECT 
    u.*,
    o.id AS order_id,
    o.total,
    o.created_at
FROM users u
LEFT JOIN orders o ON u.id = o.user_id AND o.status = 'active'
WHERE u.is_active = true;
```

**5. Aggregated Related Data:**

**Scenario:** Users with order counts and totals

**❌ N+1 Problem:**
```python
users = db.query("SELECT * FROM users")
for user in users:
    count = db.query(
        "SELECT COUNT(*) FROM orders WHERE user_id = ?",
        user['id']
    )
    total = db.query(
        "SELECT SUM(total) FROM orders WHERE user_id = ?",
        user['id']
    )
```

**✅ Solution: JOIN with Aggregation**
```sql
-- Single query with aggregation
SELECT 
    u.id,
    u.name,
    u.email,
    COUNT(o.id) AS order_count,
    COALESCE(SUM(o.total), 0) AS total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name, u.email;
```

**Performance Comparison:**

**Test Scenario:** 1,000 users, 10,000 orders, 50,000 order items

| Approach | Queries | Time | Improvement |
|----------|---------|------|-------------|
| **N+1 (Nested)** | 5,101 | 51,010ms | Baseline |
| **Multiple JOINs** | 1 | 200ms | 255x faster |
| **Staged Batch** | 4 | 80ms | 637x faster |

**Best Practices:**

**1. Use JOINs for Simple Relationships:**
```sql
-- One-to-many: Use LEFT JOIN
SELECT u.*, o.*
FROM users u
LEFT JOIN orders o ON u.id = o.user_id;
```

**2. Use Batch Loading for Complex Scenarios:**
```python
# When JOINs become too complex
# Fetch in stages and group in application
```

**3. Use Aggregations in SQL:**
```sql
-- Don't calculate in application
-- Use SQL aggregations
SELECT u.id, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id;
```

**4. Filter Early:**
```sql
-- Filter in JOIN or WHERE, not in application
SELECT u.*, o.*
FROM users u
LEFT JOIN orders o ON u.id = o.user_id AND o.status = 'active'
WHERE u.is_active = true;
```

**System Design Consideration**: Optimizing related data queries is essential for:
1. **API Performance**: Fast response times
2. **Database Efficiency**: Minimizing query count
3. **Scalability**: Performance that scales with data
4. **User Experience**: Responsive applications

Optimizing queries that fetch related data requires understanding relationship types and choosing appropriate strategies. JOINs work well for simple relationships, while staged batch loading is better for complex nested relationships. The key is to minimize database round trips and leverage SQL's power for aggregations and filtering. Always measure performance and choose the strategy that best fits your use case.

