# SQL Injection Prevention: Critical Security Practice

SQL injection is one of the most dangerous and common security vulnerabilities. Understanding how to prevent it is essential for building secure applications.

## What is SQL Injection?

**SQL Injection** is an attack where malicious SQL code is inserted into application queries, allowing attackers to:
- Access unauthorized data
- Modify or delete data
- Execute administrative operations
- Bypass authentication

### How It Works

**Vulnerable Code:**
```javascript
// ❌ DANGEROUS: String concatenation
const query = `SELECT * FROM users WHERE email = '${email}' AND password = '${password}'`;
```

**Attack:**
```javascript
// Attacker inputs:
email = "admin@example.com'--"
password = "anything"

// Resulting query:
SELECT * FROM users WHERE email = 'admin@example.com'--' AND password = 'anything'
// -- comments out rest of query, bypassing password check!
```

## Real Attack Examples

### Example 1: Authentication Bypass

**Vulnerable:**
```sql
-- Application code (DANGEROUS)
SELECT * FROM users 
WHERE email = '$email' AND password = '$password';

-- Attacker input:
email = "admin@example.com' OR '1'='1'--"
password = "anything"

-- Resulting query:
SELECT * FROM users 
WHERE email = 'admin@example.com' OR '1'='1'--' AND password = 'anything';
-- Condition always true! Logs in as first user
```

### Example 2: Data Extraction

**Vulnerable:**
```sql
-- Application code (DANGEROUS)
SELECT * FROM products WHERE id = $product_id;

-- Attacker input:
product_id = "1 UNION SELECT username, password FROM users--"

-- Resulting query:
SELECT * FROM products WHERE id = 1 
UNION SELECT username, password FROM users--;
-- Returns products AND user passwords!
```

### Example 3: Data Deletion

**Vulnerable:**
```sql
-- Application code (DANGEROUS)
DELETE FROM orders WHERE id = $order_id;

-- Attacker input:
order_id = "1 OR 1=1--"

-- Resulting query:
DELETE FROM orders WHERE id = 1 OR 1=1--;
-- Deletes ALL orders!
```

## Prevention: Parameterized Queries (Prepared Statements)

**The Solution:** Use parameterized queries (prepared statements) instead of string concatenation.

### How Parameterized Queries Work

**Instead of:**
```sql
-- ❌ Bad: String concatenation
SELECT * FROM users WHERE email = 'user@example.com';
```

**Use:**
```sql
-- ✅ Good: Parameterized query
SELECT * FROM users WHERE email = ?;
-- Database treats ? as parameter, not SQL code
```

**How it works:**
1. Query template sent to database: `SELECT * FROM users WHERE email = ?`
2. Database parses and compiles query
3. Parameter value sent separately: `'user@example.com'`
4. Database treats parameter as data, not SQL
5. Even if parameter contains SQL, it's treated as literal string

## Implementation Examples

### PostgreSQL (node-postgres)

```javascript
// ✅ Good: Parameterized query
const result = await db.query(
    'SELECT * FROM users WHERE email = $1 AND password = $2',
    [email, password]
);

// ✅ Good: Named parameters
const result = await db.query(
    'SELECT * FROM users WHERE email = $1::text',
    [email]
);
```

### MySQL (mysql2)

```javascript
// ✅ Good: Parameterized query
const [rows] = await db.execute(
    'SELECT * FROM users WHERE email = ? AND password = ?',
    [email, password]
);
```

### Python (psycopg2)

```python
# ✅ Good: Parameterized query
cursor.execute(
    "SELECT * FROM users WHERE email = %s AND password = %s",
    (email, password)
);
```

### Python (SQLAlchemy)

```python
# ✅ Good: SQLAlchemy automatically parameterizes
result = session.execute(
    select(User).where(User.email == email, User.password == password)
);
```

## ORM Protection

ORMs (Object-Relational Mappers) automatically use parameterized queries.

### SQLAlchemy (Python)

```python
# ✅ Good: SQLAlchemy uses parameterized queries automatically
user = session.query(User).filter(
    User.email == email,
    User.password == password
).first();

# Generated SQL (parameterized):
# SELECT * FROM users WHERE email = :email AND password = :password
# Parameters: {'email': 'user@example.com', 'password': 'hashed'}
```

### Sequelize (Node.js)

```javascript
// ✅ Good: Sequelize uses parameterized queries
const user = await User.findOne({
    where: {
        email: email,
        password: password
    }
});

// Generated SQL (parameterized):
// SELECT * FROM users WHERE email = ? AND password = ?
```

### Prisma (Node.js)

```javascript
// ✅ Good: Prisma uses parameterized queries
const user = await prisma.user.findFirst({
    where: {
        email: email,
        password: password
    }
});
```

## Additional Security Measures

### 1. Input Validation

```javascript
// Validate input before using in query
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
    }
    if (email.length > 255) {
        throw new Error('Email too long');
    }
    return email;
}

// Use validated input
const validEmail = validateEmail(email);
const result = await db.query(
    'SELECT * FROM users WHERE email = $1',
    [validEmail]
);
```

### 2. Least Privilege Principle

```sql
-- Create database user with minimal privileges
CREATE USER app_user WITH PASSWORD 'secure_password';

-- Grant only necessary permissions
GRANT SELECT, INSERT, UPDATE ON users TO app_user;
GRANT SELECT ON products TO app_user;

-- Don't grant dangerous permissions
-- REVOKE DELETE, DROP, ALTER FROM app_user;
```

### 3. Whitelist Input

```javascript
// Whitelist allowed values
const allowedStatuses = ['pending', 'completed', 'cancelled'];

if (!allowedStatuses.includes(status)) {
    throw new Error('Invalid status');
}

// Safe to use
const result = await db.query(
    'SELECT * FROM orders WHERE status = $1',
    [status]
);
```

### 4. Escape Special Characters (Last Resort)

```javascript
// ⚠️ Only if parameterized queries aren't possible
// Most databases provide escape functions
const escapedEmail = db.escape(email);
const query = `SELECT * FROM users WHERE email = ${escapedEmail}`;
// Still prefer parameterized queries!
```

## Common Vulnerable Patterns

### ❌ Pattern 1: String Concatenation

```javascript
// ❌ DANGEROUS
const query = `SELECT * FROM users WHERE email = '${email}'`;
await db.query(query);

// ✅ SAFE
await db.query('SELECT * FROM users WHERE email = $1', [email]);
```

### ❌ Pattern 2: Dynamic Table/Column Names

```javascript
// ❌ DANGEROUS: Can't parameterize table/column names
const query = `SELECT * FROM ${tableName} WHERE ${columnName} = $1`;
// Table/column names must be whitelisted!

// ✅ SAFE: Whitelist allowed values
const allowedTables = ['users', 'products', 'orders'];
const allowedColumns = ['id', 'email', 'name'];

if (!allowedTables.includes(tableName) || !allowedColumns.includes(columnName)) {
    throw new Error('Invalid table or column');
}

const query = `SELECT * FROM ${tableName} WHERE ${columnName} = $1`;
await db.query(query, [value]);
```

### ❌ Pattern 3: IN Clause with String Concatenation

```javascript
// ❌ DANGEROUS
const ids = [1, 2, 3];
const query = `SELECT * FROM users WHERE id IN (${ids.join(',')})`;
// If ids contains SQL, injection possible

// ✅ SAFE: Use parameterized query
const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
const query = `SELECT * FROM users WHERE id IN (${placeholders})`;
await db.query(query, ids);
```

## Testing for SQL Injection

### Manual Testing

```javascript
// Test inputs that might cause injection
const testInputs = [
    "admin'--",
    "admin' OR '1'='1",
    "'; DROP TABLE users;--",
    "1' UNION SELECT * FROM users--",
    "admin'/*",
];

// Test each input with parameterized queries
// Should all be safe (treated as literal strings)
```

### Automated Testing

```javascript
// Use security testing tools
// - SQLMap (automated SQL injection tool)
// - OWASP ZAP
// - Burp Suite
```

## Best Practices

1. **Always Use Parameterized Queries**: Never concatenate user input
2. **Validate Input**: Check format, length, type
3. **Whitelist Values**: For table/column names, use whitelists
4. **Least Privilege**: Database user with minimal permissions
5. **Error Handling**: Don't expose SQL errors to users
6. **Regular Updates**: Keep database and drivers updated
7. **Code Reviews**: Review all database queries
8. **Security Testing**: Regular penetration testing

## Summary

**SQL Injection Prevention:**

1. **Use Parameterized Queries**: Always, for all user input
2. **Never Concatenate**: Don't build queries with string concatenation
3. **Validate Input**: Check format and constraints
4. **Whitelist**: For dynamic table/column names
5. **Least Privilege**: Minimal database permissions
6. **Error Handling**: Don't expose SQL errors

**Key Takeaway:**
SQL injection is preventable. Always use parameterized queries (prepared statements) for any user input. Never concatenate user input into SQL strings. ORMs automatically protect you, but understand how they work.

**Vulnerable Pattern:**
```javascript
// ❌ NEVER DO THIS
const query = `SELECT * FROM users WHERE email = '${email}'`;
```

**Safe Pattern:**
```javascript
// ✅ ALWAYS DO THIS
await db.query('SELECT * FROM users WHERE email = $1', [email]);
```

**Next Steps:**
- Learn [Prepared Statements](prepared_statements.md) for deeper understanding
- Study [Database Roles & Permissions](roles_permissions.md) for access control
- Master [Security Best Practices](../12_security/) for comprehensive security

---

## 🎯 Interview Questions: SQL

### Q1: Explain SQL injection attacks in detail, including how they work, different types of SQL injection, and how to prevent them. Provide examples of vulnerable code and secure alternatives using parameterized queries.

**Answer:**

**SQL Injection Definition:**

SQL injection is a security vulnerability that occurs when an attacker can manipulate SQL queries by injecting malicious SQL code through user input. This happens when user input is directly concatenated into SQL queries without proper sanitization or parameterization, allowing attackers to execute arbitrary SQL commands.

**How SQL Injection Works:**

**Vulnerable Code Pattern:**
```javascript
// ❌ VULNERABLE: String concatenation
const email = req.body.email;
const query = `SELECT * FROM users WHERE email = '${email}'`;
db.query(query);
```

**Attack Scenario:**
```javascript
// Attacker input
email = "admin' OR '1'='1"

// Resulting query
SELECT * FROM users WHERE email = 'admin' OR '1'='1'
// Returns all users! (because '1'='1' is always true)
```

**Types of SQL Injection:**

**1. Classic SQL Injection (Union-Based):**

**Attack:**
```javascript
// User input
email = "admin' UNION SELECT * FROM users--"

// Vulnerable query
const query = `SELECT * FROM users WHERE email = '${email}'`;
// Result: SELECT * FROM users WHERE email = 'admin' UNION SELECT * FROM users--'
// Executes: Returns admin user + all users from UNION
```

**Impact:**
- Retrieves unauthorized data
- Can access entire database
- Bypasses authentication

**2. Boolean-Based Blind SQL Injection:**

**Attack:**
```javascript
// User input
id = "1' AND (SELECT COUNT(*) FROM users) > 100--"

// Vulnerable query
const query = `SELECT * FROM products WHERE id = ${id}`;
// Result: SELECT * FROM products WHERE id = 1' AND (SELECT COUNT(*) FROM users) > 100--'
// If query returns results: More than 100 users exist
// If query fails: Less than or equal to 100 users
```

**Impact:**
- Extracts data through true/false responses
- Can enumerate entire database
- Time-consuming but effective

**3. Time-Based Blind SQL Injection:**

**Attack:**
```javascript
// User input
id = "1'; WAITFOR DELAY '00:00:05'--"

// Vulnerable query
const query = `SELECT * FROM products WHERE id = ${id}`;
// Result: SELECT * FROM products WHERE id = 1'; WAITFOR DELAY '00:00:05'--'
// Query delays 5 seconds if injection successful
```

**Impact:**
- Confirms injection vulnerability
- Can extract data through timing
- Very difficult to detect

**4. Second-Order SQL Injection:**

**Attack:**
```javascript
// Step 1: Register with malicious input
username = "admin'--"
password = "password"
// Stored in database: username = "admin'--"

// Step 2: Later query uses stored value
const query = `SELECT * FROM users WHERE username = '${storedUsername}'`;
// Result: SELECT * FROM users WHERE username = 'admin'--'
// Comment out rest of query
```

**Impact:**
- Bypasses initial input validation
- Exploits stored data
- More difficult to detect

**Real-World Attack Examples:**

**Example 1: Authentication Bypass**

**Vulnerable Code:**
```javascript
// ❌ VULNERABLE
const email = req.body.email;
const password = req.body.password;
const query = `SELECT * FROM users WHERE email = '${email}' AND password = '${password}'`;
const user = db.query(query);
if (user) {
    // Login successful
}
```

**Attack:**
```javascript
// Attacker input
email = "admin'--"
password = "anything"

// Resulting query
SELECT * FROM users WHERE email = 'admin'--' AND password = 'anything'
// Commented out password check!
// Returns admin user regardless of password
```

**Secure Code:**
```javascript
// ✅ SECURE: Parameterized query
const email = req.body.email;
const password = req.body.password;
const query = 'SELECT * FROM users WHERE email = $1 AND password = $2';
const user = db.query(query, [email, password]);
// Parameters are treated as data, not SQL code
// Attack input becomes literal string: "admin'--"
```

**Example 2: Data Extraction**

**Vulnerable Code:**
```javascript
// ❌ VULNERABLE
const userId = req.params.id;
const query = `SELECT * FROM orders WHERE user_id = ${userId}`;
const orders = db.query(query);
```

**Attack:**
```javascript
// Attacker input
userId = "1 UNION SELECT username, password FROM users--"

// Resulting query
SELECT * FROM orders WHERE user_id = 1 UNION SELECT username, password FROM users--'
// Returns orders + all usernames and passwords!
```

**Secure Code:**
```javascript
// ✅ SECURE: Parameterized query
const userId = req.params.id;
const query = 'SELECT * FROM orders WHERE user_id = $1';
const orders = db.query(query, [userId]);
// userId is treated as integer, not SQL code
```

**Example 3: Database Manipulation**

**Vulnerable Code:**
```javascript
// ❌ VULNERABLE
const tableName = req.body.table;
const query = `SELECT * FROM ${tableName}`;
const data = db.query(query);
```

**Attack:**
```javascript
// Attacker input
tableName = "users; DROP TABLE orders;--"

// Resulting query
SELECT * FROM users; DROP TABLE orders;--'
// Executes: SELECT, then DROP TABLE!
// Deletes orders table!
```

**Secure Code:**
```javascript
// ✅ SECURE: Whitelist validation
const allowedTables = ['users', 'products', 'orders'];
const tableName = req.body.table;

if (!allowedTables.includes(tableName)) {
    throw new Error('Invalid table name');
}

const query = `SELECT * FROM ${tableName}`;  // Safe: validated
const data = db.query(query);
// Or use parameterized query if database supports it
```

**Prevention Methods:**

**1. Parameterized Queries (Prepared Statements):**

**How It Works:**
- SQL structure is separated from data
- Parameters are treated as literal values
- Database prevents parameter values from being executed as SQL

**Example:**
```javascript
// ✅ SECURE: Parameterized query
const email = req.body.email;
const query = 'SELECT * FROM users WHERE email = $1';
const user = db.query(query, [email]);

// Even if email = "admin' OR '1'='1"
// Query becomes: SELECT * FROM users WHERE email = 'admin'' OR ''1''=''1'
// Treated as literal string, not SQL code
```

**2. Input Validation:**

**Validate Format:**
```javascript
// Validate email format
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
    }
    if (email.length > 255) {
        throw new Error('Email too long');
    }
    return email;
}

// Use validated input
const validEmail = validateEmail(req.body.email);
const query = 'SELECT * FROM users WHERE email = $1';
db.query(query, [validEmail]);
```

**Validate Type:**
```javascript
// Validate integer
function validateInteger(id) {
    const num = parseInt(id, 10);
    if (isNaN(num) || num <= 0) {
        throw new Error('Invalid ID');
    }
    return num;
}

const validId = validateInteger(req.params.id);
const query = 'SELECT * FROM orders WHERE user_id = $1';
db.query(query, [validId]);
```

**3. Whitelisting:**

**For Dynamic Table/Column Names:**
```javascript
// Whitelist allowed values
const allowedTables = ['users', 'products', 'orders'];
const allowedColumns = ['id', 'name', 'email', 'created_at'];

function validateTableName(tableName) {
    if (!allowedTables.includes(tableName)) {
        throw new Error('Invalid table name');
    }
    return tableName;
}

function validateColumnName(columnName) {
    if (!allowedColumns.includes(columnName)) {
        throw new Error('Invalid column name');
    }
    return columnName;
}

// Safe to use after validation
const table = validateTableName(req.body.table);
const column = validateColumnName(req.body.column);
const query = `SELECT ${column} FROM ${table} WHERE id = $1`;
db.query(query, [id]);
```

**4. Least Privilege Principle:**

**Database User Permissions:**
```sql
-- Create application user with minimal privileges
CREATE USER app_user WITH PASSWORD 'secure_password';

-- Grant only necessary permissions
GRANT SELECT, INSERT, UPDATE ON users TO app_user;
GRANT SELECT ON products TO app_user;

-- Don't grant dangerous permissions
-- REVOKE DELETE, DROP, ALTER, CREATE FROM app_user;
```

**Impact:**
- Even if injection occurs, attacker has limited access
- Cannot drop tables or modify schema
- Damage is contained

**5. ORM Protection:**

**ORMs Automatically Use Parameterized Queries:**
```javascript
// Sequelize (Node.js)
const user = await User.findOne({
    where: { email: req.body.email }
});
// Automatically uses parameterized queries

// Prisma
const user = await prisma.user.findFirst({
    where: { email: req.body.email }
});
// Automatically uses parameterized queries
```

**Testing for SQL Injection:**

**Manual Testing:**
```javascript
// Test inputs
const testInputs = [
    "admin'--",
    "admin' OR '1'='1",
    "'; DROP TABLE users;--",
    "1' UNION SELECT * FROM users--",
    "admin'/*",
    "1'; WAITFOR DELAY '00:00:05'--"
];

// Test each input
for (const input of testInputs) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = db.query(query, [input]);
    // Should all be safe (treated as literal strings)
}
```

**System Design Consideration**: Preventing SQL injection is critical for:
1. **Data Security**: Protecting sensitive data
2. **System Integrity**: Preventing unauthorized access
3. **Compliance**: Meeting security standards (OWASP, PCI-DSS)
4. **Trust**: Maintaining user trust

SQL injection is a serious security vulnerability that can lead to data breaches, unauthorized access, and data loss. The primary defense is using parameterized queries (prepared statements) for all user input. Never concatenate user input into SQL strings. ORMs provide automatic protection, but understanding how they work is essential. Always validate input, use least privilege principles, and regularly test for vulnerabilities.

---

### Q2: Explain prepared statements (parameterized queries) in detail, including how they prevent SQL injection, their performance benefits, and how they work internally. Provide examples showing the difference between prepared and unprepared queries.

**Answer:**

**Prepared Statement Definition:**

A prepared statement (also called a parameterized query) is a database feature that separates SQL code from data values. The SQL structure is prepared once with placeholders for parameters, and then executed multiple times with different parameter values. This provides both security (prevents SQL injection) and performance (query plan caching) benefits.

**How Prepared Statements Work:**

**Two-Phase Process:**

**Phase 1: Preparation**
- SQL structure is parsed and validated
- Query execution plan is created and optimized
- Plan is cached for reuse
- Placeholders are identified

**Phase 2: Execution**
- Parameter values are bound to placeholders
- Values are treated as data, not SQL code
- Query is executed with bound parameters
- Results are returned

**Visual Process:**

```
Unprepared Query (Vulnerable):
┌─────────────────────────────────────┐
│ User Input: "admin' OR '1'='1"     │
│                                     │
│ String Concatenation:               │
│ "SELECT * FROM users                │
│  WHERE email = 'admin' OR '1'='1'" │
│                                     │
│ Database:                           │
│ 1. Parse entire string              │
│ 2. Execute as SQL code              │
│ 3. Returns all users! (injection)   │
└─────────────────────────────────────┘

Prepared Statement (Secure):
┌─────────────────────────────────────┐
│ Phase 1: Preparation                │
│ "SELECT * FROM users                │
│  WHERE email = ?"                   │
│                                     │
│ Database:                           │
│ 1. Parse SQL structure              │
│ 2. Create execution plan            │
│ 3. Cache plan                       │
│ 4. Identify placeholder (?)        │
└─────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ Phase 2: Execution                  │
│ Parameter: "admin' OR '1'='1"      │
│                                     │
│ Database:                           │
│ 1. Bind parameter to placeholder   │
│ 2. Treat as literal string         │
│ 3. Execute with bound value         │
│ 4. Returns: No users (safe!)       │
└─────────────────────────────────────┘
```

**Security: How They Prevent SQL Injection:**

**Key Principle:** Parameters are treated as data values, not executable SQL code.

**Example:**
```javascript
// Prepared statement
const query = 'SELECT * FROM users WHERE email = $1';
const email = "admin' OR '1'='1";
db.query(query, [email]);

// What happens:
// 1. SQL structure: SELECT * FROM users WHERE email = $1
// 2. Parameter binding: $1 = "admin' OR '1'='1" (as literal string)
// 3. Executed query: SELECT * FROM users WHERE email = 'admin'' OR ''1''=''1'
// 4. Database treats it as: WHERE email = 'admin'' OR ''1''=''1' (literal string)
// 5. No user found (safe!)
```

**Comparison:**

**Unprepared Query (Vulnerable):**
```javascript
// ❌ VULNERABLE
const email = "admin' OR '1'='1";
const query = `SELECT * FROM users WHERE email = '${email}'`;
db.query(query);

// Database sees:
SELECT * FROM users WHERE email = 'admin' OR '1'='1'
// Executes as SQL: Returns all users (injection successful!)
```

**Prepared Statement (Secure):**
```javascript
// ✅ SECURE
const email = "admin' OR '1'='1";
const query = 'SELECT * FROM users WHERE email = $1';
db.query(query, [email]);

// Database sees:
// Structure: SELECT * FROM users WHERE email = $1
// Parameter: 'admin'' OR ''1''=''1' (escaped, treated as data)
// Executes safely: No users found (injection prevented!)
```

**Performance Benefits:**

**1. Query Plan Caching:**

**Unprepared Query:**
```javascript
// Each execution:
for (let i = 0; i < 1000; i++) {
    const query = `SELECT * FROM users WHERE email = 'user${i}@example.com'`;
    db.query(query);
    // Database must:
    // 1. Parse SQL
    // 2. Create execution plan
    // 3. Optimize plan
    // 4. Execute
    // Time: 1000 × (parse + plan + execute) = Slow
}
```

**Prepared Statement:**
```javascript
// Prepare once
const query = 'SELECT * FROM users WHERE email = $1';
const stmt = db.prepare(query);

// Execute many times
for (let i = 0; i < 1000; i++) {
    stmt.execute(['user' + i + '@example.com']);
    // Database:
    // 1. Uses cached plan (no parsing/planning)
    // 2. Binds parameter
    // 3. Executes
    // Time: 1 × (parse + plan) + 1000 × (bind + execute) = Fast
}
```

**Performance Improvement:**
- **First execution**: Similar time (must prepare)
- **Subsequent executions**: 2-5x faster (uses cached plan)
- **High-volume scenarios**: Significant performance gain

**2. Reduced Parsing Overhead:**

**Unprepared:**
```
Each query: Parse → Plan → Optimize → Execute
Time per query: 10ms
1000 queries: 10,000ms
```

**Prepared:**
```
First query: Parse → Plan → Optimize → Cache → Execute (10ms)
Next 999 queries: Bind → Execute (2ms each)
1000 queries: 10 + (999 × 2) = 2,008ms
5x faster!
```

**3. Network Efficiency:**

**Unprepared:**
```javascript
// Sends full SQL string each time
"SELECT * FROM users WHERE email = 'user1@example.com'"
"SELECT * FROM users WHERE email = 'user2@example.com'"
// Large network payload
```

**Prepared:**
```javascript
// Sends structure once, then just parameters
"SELECT * FROM users WHERE email = $1"  // Once
"user1@example.com"  // Small payload
"user2@example.com"  // Small payload
// Smaller network payload
```

**Implementation Examples:**

**PostgreSQL (Node.js with pg):**
```javascript
// Prepared statement
const query = 'SELECT * FROM users WHERE email = $1 AND age > $2';
const result = await db.query(query, ['user@example.com', 18]);

// Multiple parameters
const query = 'INSERT INTO users (name, email, age) VALUES ($1, $2, $3)';
await db.query(query, ['John', 'john@example.com', 25]);
```

**MySQL (Node.js with mysql2):**
```javascript
// Prepared statement
const query = 'SELECT * FROM users WHERE email = ? AND age > ?';
const [rows] = await db.execute(query, ['user@example.com', 18]);

// Multiple parameters
const query = 'INSERT INTO users (name, email, age) VALUES (?, ?, ?)';
await db.execute(query, ['John', 'john@example.com', 25]);
```

**Python (psycopg2):**
```python
# Prepared statement
query = "SELECT * FROM users WHERE email = %s AND age > %s"
cursor.execute(query, ('user@example.com', 18))

# Multiple parameters
query = "INSERT INTO users (name, email, age) VALUES (%s, %s, %s)"
cursor.execute(query, ('John', 'john@example.com', 25))
```

**How They Work Internally:**

**1. Preparation Phase:**

```sql
-- Database receives prepared statement
PREPARE get_user AS 
    SELECT * FROM users WHERE email = $1;

-- Database actions:
-- 1. Parse SQL structure
-- 2. Validate syntax
-- 3. Check table/column existence
-- 4. Create execution plan
-- 5. Optimize plan
-- 6. Cache plan with name "get_user"
```

**2. Execution Phase:**

```sql
-- Execute with parameters
EXECUTE get_user('user@example.com');

-- Database actions:
-- 1. Retrieve cached plan for "get_user"
-- 2. Bind parameter: $1 = 'user@example.com'
-- 3. Validate parameter type matches expected
-- 4. Escape parameter value (if needed)
-- 5. Execute plan with bound parameter
-- 6. Return results
```

**3. Parameter Binding:**

**Type Safety:**
```javascript
// Database validates parameter types
const query = 'SELECT * FROM users WHERE id = $1';
db.query(query, ['not-a-number']);
// Error: Parameter $1 must be integer, not string
```

**Escape Handling:**
```javascript
// Database automatically escapes special characters
const query = 'SELECT * FROM users WHERE email = $1';
db.query(query, ["admin'--"]);
// Database escapes: 'admin''--'
// Safe: Treated as literal string
```

**Reusing Prepared Statements:**

**Explicit Preparation:**
```javascript
// Prepare once
const stmt = db.prepare('SELECT * FROM users WHERE email = $1');

// Execute many times
for (const email of emailList) {
    const user = stmt.execute([email]);
    // Fast: Uses cached plan
}

// Clean up
stmt.close();
```

**Automatic Preparation (Most ORMs):**
```javascript
// ORMs automatically prepare and reuse
const user = await User.findOne({ where: { email: 'user@example.com' } });
// First call: Prepares statement
// Subsequent calls: Reuses prepared statement
```

**Limitations and Considerations:**

**1. Dynamic Table/Column Names:**

**Cannot Parameterize:**
```javascript
// ❌ Cannot parameterize table/column names
const query = 'SELECT * FROM $1 WHERE $2 = $3';
// Doesn't work: Table/column names must be in SQL structure
```

**Solution: Whitelist:**
```javascript
// ✅ Whitelist validation
const allowedTables = ['users', 'products', 'orders'];
const table = allowedTables.includes(req.body.table) ? req.body.table : 'users';

const query = `SELECT * FROM ${table} WHERE id = $1`;
db.query(query, [id]);
```

**2. IN Clause with Variable List:**

**Challenge:**
```javascript
// Variable number of parameters
const ids = [1, 2, 3, 4, 5];
// Need: WHERE id IN (?, ?, ?, ?, ?)
```

**Solution:**
```javascript
// Build placeholders dynamically
const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
const query = `SELECT * FROM users WHERE id IN (${placeholders})`;
db.query(query, ids);
```

**3. Performance Overhead (First Execution):**

**Trade-off:**
- First execution: Slightly slower (must prepare)
- Subsequent executions: Faster (uses cache)
- Best for: Queries executed multiple times

**Best Practices:**

**1. Always Use Parameterized Queries:**
```javascript
// ✅ Always use parameters for user input
const query = 'SELECT * FROM users WHERE email = $1';
db.query(query, [email]);
```

**2. Validate Input:**
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

**3. Use ORMs:**
```javascript
// ✅ ORMs automatically use prepared statements
const user = await User.findOne({ where: { email: req.body.email } });
```

**4. Reuse Prepared Statements:**
```javascript
// ✅ Prepare once, execute many times
const stmt = db.prepare('SELECT * FROM users WHERE email = $1');
// Use stmt.execute() multiple times
```

**System Design Consideration**: Prepared statements are essential for:
1. **Security**: Primary defense against SQL injection
2. **Performance**: Query plan caching improves efficiency
3. **Reliability**: Type validation prevents errors
4. **Maintainability**: Clear separation of SQL and data

Prepared statements are the foundation of secure and performant database access. They prevent SQL injection by treating parameters as data, not executable code. They also improve performance through query plan caching. Always use parameterized queries for user input, and leverage ORMs that automatically use prepared statements. Understanding how prepared statements work internally helps you write secure, efficient database code.

