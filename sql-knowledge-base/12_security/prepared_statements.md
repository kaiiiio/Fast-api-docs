# Prepared Statements: Parameterized Queries for Security

Prepared statements (parameterized queries) separate SQL code from data, preventing SQL injection and improving performance through query plan caching.

## What are Prepared Statements?

**Prepared statements** pre-compile SQL queries with placeholders, then execute them with parameter values. This separates code from data.

### Basic Concept

```sql
-- Query template (prepared)
SELECT * FROM users WHERE email = ?;

-- Execute with parameter
EXECUTE prepared_statement WITH ('user@example.com');
```

## How Prepared Statements Work

### Step 1: Prepare Statement

```sql
-- Database parses and compiles query
PREPARE get_user AS
SELECT * FROM users WHERE email = $1;
-- Query plan created, optimized
```

### Step 2: Execute with Parameters

```sql
-- Execute with parameter value
EXECUTE get_user('user@example.com');
-- Parameter treated as data, not SQL code
```

### Step 3: Reuse

```sql
-- Execute multiple times with different parameters
EXECUTE get_user('user1@example.com');
EXECUTE get_user('user2@example.com');
EXECUTE get_user('user3@example.com');
-- Same query plan reused (faster)
```

## Security Benefits

### Prevents SQL Injection

```sql
-- ❌ Vulnerable: String concatenation
SELECT * FROM users WHERE email = 'user@example.com' OR '1'='1';
-- Attacker input: user@example.com' OR '1'='1

-- ✅ Safe: Prepared statement
PREPARE get_user AS SELECT * FROM users WHERE email = $1;
EXECUTE get_user('user@example.com'' OR ''1''=''1');
-- Parameter treated as literal string, injection prevented
```

### How It Works

```
1. Query template sent: SELECT * FROM users WHERE email = $1
2. Database parses and compiles (no user input yet)
3. Parameter value sent separately: 'user@example.com'
4. Database treats parameter as data, not SQL
5. Even if parameter contains SQL, it's treated as literal string
```

## Performance Benefits

### Query Plan Caching

```sql
-- First execution: Parse, plan, execute
PREPARE get_user AS SELECT * FROM users WHERE email = $1;
EXECUTE get_user('user1@example.com');
-- Query plan cached

-- Subsequent executions: Reuse plan (faster)
EXECUTE get_user('user2@example.com');  -- Uses cached plan
EXECUTE get_user('user3@example.com');  -- Uses cached plan
```

### Reduced Parsing Overhead

```sql
-- Without prepared statement: Parse every time
SELECT * FROM users WHERE email = 'user1@example.com';  -- Parse
SELECT * FROM users WHERE email = 'user2@example.com';  -- Parse again
SELECT * FROM users WHERE email = 'user3@example.com';  -- Parse again

-- With prepared statement: Parse once
PREPARE get_user AS SELECT * FROM users WHERE email = $1;
EXECUTE get_user('user1@example.com');  -- Reuse plan
EXECUTE get_user('user2@example.com');  -- Reuse plan
EXECUTE get_user('user3@example.com');  -- Reuse plan
```

## Implementation Examples

### PostgreSQL: psycopg2

```python
# Prepared statement
import psycopg2

conn = psycopg2.connect("postgresql://...")
cursor = conn.cursor()

# Prepare statement
cursor.execute("PREPARE get_user AS SELECT * FROM users WHERE email = $1")

# Execute with parameters
cursor.execute("EXECUTE get_user (%s)", ('user@example.com',))
user = cursor.fetchone()

# Or use parameterized query (automatic prepared statement)
cursor.execute("SELECT * FROM users WHERE email = %s", ('user@example.com',))
user = cursor.fetchone()
```

### PostgreSQL: asyncpg

```python
# Async prepared statement
import asyncpg

conn = await asyncpg.connect("postgresql://...")

# Parameterized query (automatic prepared statement)
user = await conn.fetchrow(
    "SELECT * FROM users WHERE email = $1",
    'user@example.com'
)
```

### MySQL: mysql2

```javascript
// Prepared statement
const mysql = require('mysql2');

const connection = mysql.createConnection({...});

// Parameterized query (automatic prepared statement)
connection.execute(
    'SELECT * FROM users WHERE email = ?',
    ['user@example.com'],
    (err, results) => {
        // Handle results
    }
);
```

## ORM Automatic Prepared Statements

### SQLAlchemy

```python
# SQLAlchemy automatically uses prepared statements
from sqlalchemy import create_engine, text

engine = create_engine("postgresql://...")

# Parameterized query (automatic prepared statement)
with engine.connect() as conn:
    result = conn.execute(
        text("SELECT * FROM users WHERE email = :email"),
        {"email": "user@example.com"}
    )
```

### Sequelize

```javascript
// Sequelize automatically uses prepared statements
const User = require('./models/User');

// Parameterized query
const user = await User.findOne({
    where: { email: 'user@example.com' }
});
// Generated SQL uses parameters
```

## Best Practices

1. **Always Use Parameters**: Never concatenate user input
2. **Use ORMs**: ORMs automatically use prepared statements
3. **Reuse Statements**: Prepare once, execute many times
4. **Validate Input**: Still validate parameter values
5. **Handle Errors**: Proper error handling for prepared statements

## Common Mistakes

### ❌ String Concatenation

```python
# ❌ Dangerous: String concatenation
email = request.form['email']
query = f"SELECT * FROM users WHERE email = '{email}'"
# SQL injection risk!

# ✅ Safe: Parameterized query
email = request.form['email']
query = "SELECT * FROM users WHERE email = %s"
cursor.execute(query, (email,))
```

### ❌ Partial Parameterization

```python
# ❌ Bad: Only some parameters
query = f"SELECT * FROM users WHERE email = '{email}' AND status = %s"
cursor.execute(query, (status,))
# email still vulnerable!

# ✅ Good: All parameters
query = "SELECT * FROM users WHERE email = %s AND status = %s"
cursor.execute(query, (email, status))
```

## Summary

**Prepared Statements:**

1. **Purpose**: Separate SQL code from data
2. **Security**: Prevents SQL injection
3. **Performance**: Query plan caching, reduced parsing
4. **Implementation**: Use parameterized queries
5. **Best Practice**: Always use parameters, never concatenate

**Key Takeaway:**
Prepared statements are essential for security and performance. They prevent SQL injection by treating parameters as data, not SQL code. They also improve performance through query plan caching. Always use parameterized queries, never concatenate user input into SQL strings.

**Implementation:**
- Use parameterized queries: `WHERE email = ?` or `WHERE email = $1`
- Pass parameters separately: `execute(query, (param,))`
- ORMs automatically use prepared statements

**Next Steps:**
- Learn [SQL Injection Prevention](sql_injection_prevention.md) for security
- Study [Performance Optimization](../10_performance_optimization/) for tuning
- Master [Database Security](../12_security/) for comprehensive security

---

## 🎯 Interview Questions: SQL

### Q1: Explain prepared statements in detail, including how they work internally, their security benefits, and performance advantages. Provide examples showing the difference between prepared and unprepared queries, and explain when prepared statements are most beneficial.

**Answer:**

**Prepared Statement Definition:**

A prepared statement (parameterized query) is a database feature that separates SQL structure from data values. The SQL query template is prepared once with placeholders, and then executed multiple times with different parameter values. This provides both security (prevents SQL injection) and performance (query plan caching) benefits.

**How Prepared Statements Work Internally:**

**Two-Phase Execution:**

**Phase 1: Preparation (Compilation)**
```sql
-- Database receives prepared statement
PREPARE get_user AS 
    SELECT * FROM users WHERE email = $1 AND age > $2;
```

**Database Actions:**
1. **Parse SQL Structure**: Validates syntax, checks table/column existence
2. **Create Execution Plan**: Optimizer creates query execution plan
3. **Cache Plan**: Stores plan in memory with identifier "get_user"
4. **Identify Placeholders**: Marks $1 and $2 as parameter positions

**Phase 2: Execution (Runtime)**
```sql
-- Execute with parameters
EXECUTE get_user('user@example.com', 18);
```

**Database Actions:**
1. **Retrieve Cached Plan**: Looks up "get_user" plan from cache
2. **Bind Parameters**: Binds 'user@example.com' to $1, 18 to $2
3. **Type Validation**: Ensures parameter types match expected types
4. **Escape Values**: Automatically escapes special characters
5. **Execute Plan**: Runs cached plan with bound parameters
6. **Return Results**: Returns query results

**Visual Process:**

```
Unprepared Query:
┌─────────────────────────────────────┐
│ Query: "SELECT * FROM users         │
│        WHERE email = 'user@ex.com'" │
│                                     │
│ Database:                           │
│ 1. Parse entire string             │
│ 2. Create execution plan           │
│ 3. Execute plan                     │
│ 4. Discard plan                     │
│                                     │
│ Time: Parse + Plan + Execute       │
│ Each execution: Full process       │
└─────────────────────────────────────┘

Prepared Statement:
┌─────────────────────────────────────┐
│ Phase 1: PREPARE                    │
│ "SELECT * FROM users                │
│  WHERE email = $1"                  │
│                                     │
│ Database:                           │
│ 1. Parse structure                  │
│ 2. Create plan                      │
│ 3. Cache plan (identifier)         │
│                                     │
│ Time: Parse + Plan (once)           │
└─────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ Phase 2: EXECUTE (many times)      │
│ Parameter: 'user@example.com'       │
│                                     │
│ Database:                           │
│ 1. Retrieve cached plan            │
│ 2. Bind parameter                   │
│ 3. Execute plan                     │
│                                     │
│ Time: Bind + Execute (fast!)       │
│ Reuses cached plan                  │
└─────────────────────────────────────┘
```

**Security Benefits:**

**1. SQL Injection Prevention:**

**Vulnerable Code:**
```javascript
// ❌ VULNERABLE: String concatenation
const email = req.body.email;  // "admin' OR '1'='1"
const query = `SELECT * FROM users WHERE email = '${email}'`;
db.query(query);

// Database executes:
SELECT * FROM users WHERE email = 'admin' OR '1'='1'
// Returns all users! (injection successful)
```

**Secure Code with Prepared Statement:**
```javascript
// ✅ SECURE: Parameterized query
const email = req.body.email;  // "admin' OR '1'='1"
const query = 'SELECT * FROM users WHERE email = $1';
db.query(query, [email]);

// Database processes:
// Structure: SELECT * FROM users WHERE email = $1
// Parameter binding: $1 = 'admin'' OR ''1''=''1' (escaped)
// Executed query: SELECT * FROM users WHERE email = 'admin'' OR ''1''=''1'
// Result: No users found (safe! Treated as literal string)
```

**How It Prevents Injection:**

**Parameter Binding Process:**
1. Parameter value is treated as **data**, not SQL code
2. Database automatically **escapes** special characters
3. Single quotes are **doubled** (' becomes '')
4. SQL operators are **literalized** (OR becomes part of string)
5. Result: Attack string becomes harmless literal value

**2. Type Safety:**

**Automatic Type Validation:**
```javascript
// Prepared statement expects integer
const query = 'SELECT * FROM users WHERE id = $1';
db.query(query, ['not-a-number']);
// Error: Parameter $1 must be integer, not string
// Prevents type-related attacks
```

**Performance Benefits:**

**1. Query Plan Caching:**

**Unprepared Query (No Caching):**
```javascript
// Each execution requires full processing
for (let i = 0; i < 1000; i++) {
    const query = `SELECT * FROM users WHERE email = 'user${i}@example.com'`;
    db.query(query);
    // Each time:
    // - Parse SQL: ~2ms
    // - Create plan: ~3ms
    // - Optimize: ~2ms
    // - Execute: ~1ms
    // Total per query: ~8ms
    // 1000 queries: 8,000ms
}
```

**Prepared Statement (With Caching):**
```javascript
// Prepare once
const query = 'SELECT * FROM users WHERE email = $1';
const stmt = db.prepare(query);
// First time: Parse + Plan + Cache = ~7ms

// Execute many times
for (let i = 0; i < 1000; i++) {
    stmt.execute(['user' + i + '@example.com']);
    // Each time:
    // - Retrieve cached plan: ~0.1ms
    // - Bind parameter: ~0.1ms
    // - Execute: ~1ms
    // Total per query: ~1.2ms
    // 1000 queries: 7 + (1000 × 1.2) = 1,207ms
}
```

**Performance Improvement: 6.6x faster!**

**2. Reduced Parsing Overhead:**

**Parsing Comparison:**
```
Unprepared:
- Parse SQL string: O(n) where n = query length
- 1000 queries = 1000 parses
- Time: 1000 × parse_time

Prepared:
- Parse once: O(n)
- 1000 executions = 1 parse
- Time: 1 × parse_time
- 1000x reduction in parsing!
```

**3. Network Efficiency:**

**Unprepared:**
```javascript
// Sends full SQL string each time
"SELECT * FROM users WHERE email = 'user1@example.com'"  // 50 bytes
"SELECT * FROM users WHERE email = 'user2@example.com'"  // 50 bytes
// 1000 queries = 50,000 bytes
```

**Prepared:**
```javascript
// Sends structure once, then just parameters
"SELECT * FROM users WHERE email = $1"  // 40 bytes (once)
"user1@example.com"  // 18 bytes
"user2@example.com"  // 18 bytes
// 1000 queries = 40 + (1000 × 18) = 18,040 bytes
// 64% reduction in network traffic!
```

**When Prepared Statements Are Most Beneficial:**

**1. Repeated Queries:**

**High-Volume Scenarios:**
```javascript
// API endpoint called 10,000 times per minute
app.get('/api/users/:id', (req, res) => {
    const query = 'SELECT * FROM users WHERE id = $1';
    const user = db.query(query, [req.params.id]);
    // Prepared statement cached and reused
    // Massive performance benefit
});
```

**2. Batch Operations:**
```javascript
// Insert 10,000 records
const query = 'INSERT INTO orders (user_id, total) VALUES ($1, $2)';
const stmt = db.prepare(query);

for (const order of orders) {
    stmt.execute([order.user_id, order.total]);
    // Reuses cached plan for each insert
    // Much faster than unprepared queries
}
```

**3. Complex Queries:**
```javascript
// Complex query with multiple joins
const query = `
    SELECT u.*, o.total, p.name
    FROM users u
    JOIN orders o ON u.id = o.user_id
    JOIN products p ON o.product_id = p.id
    WHERE u.email = $1 AND o.status = $2
`;
// Plan creation is expensive
// Caching provides significant benefit
```

**Limitations:**

**1. Cannot Parameterize Table/Column Names:**
```javascript
// ❌ Cannot do this
const query = 'SELECT * FROM $1 WHERE $2 = $3';
// Table/column names must be in SQL structure

// ✅ Solution: Whitelist validation
const allowedTables = ['users', 'products'];
const table = allowedTables.includes(req.body.table) 
    ? req.body.table 
    : 'users';
const query = `SELECT * FROM ${table} WHERE id = $1`;
```

**2. First Execution Overhead:**
```javascript
// First execution: Must prepare (slightly slower)
const query = 'SELECT * FROM users WHERE email = $1';
db.query(query, ['user@example.com']);  // ~8ms (prepare + execute)

// Subsequent executions: Use cache (faster)
db.query(query, ['user2@example.com']);  // ~1ms (execute only)
```

**3. Plan Cache Management:**
```javascript
// Database manages cache size
// Old/unused plans may be evicted
// May need to re-prepare if cache is full
```

**Best Practices:**

**1. Always Use for User Input:**
```javascript
// ✅ Always parameterize user input
const query = 'SELECT * FROM users WHERE email = $1';
db.query(query, [req.body.email]);
```

**2. Reuse Prepared Statements:**
```javascript
// ✅ Prepare once, execute many times
const stmt = db.prepare('SELECT * FROM users WHERE email = $1');
// Use stmt.execute() multiple times
```

**3. Validate Input:**
```javascript
// ✅ Validate before using
function validateEmail(email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Invalid email');
    }
    return email;
}

const validEmail = validateEmail(req.body.email);
const query = 'SELECT * FROM users WHERE email = $1';
db.query(query, [validEmail]);
```

**System Design Consideration**: Prepared statements are essential for:
1. **Security**: Primary defense against SQL injection
2. **Performance**: Query plan caching significantly improves efficiency
3. **Scalability**: Better performance under high load
4. **Reliability**: Type validation prevents errors

Prepared statements are fundamental to secure and performant database access. They prevent SQL injection by treating parameters as data, not executable code. They improve performance through query plan caching, reducing parsing and planning overhead. Always use parameterized queries for user input, and leverage ORMs that automatically use prepared statements. Understanding how prepared statements work internally helps you write secure, efficient database code.

