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

