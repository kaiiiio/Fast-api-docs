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

