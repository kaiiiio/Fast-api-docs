# Database Engines: PostgreSQL, MySQL, MariaDB, SQLite

Understanding different SQL database engines helps you choose the right one for your project. Each has unique features, strengths, and use cases.

## Overview

**SQL Database Engines:**
- **PostgreSQL**: Advanced features, open-source
- **MySQL**: Popular, widely used
- **MariaDB**: MySQL fork, community-driven
- **SQLite**: Embedded, file-based

## PostgreSQL

### Overview

**PostgreSQL** is an advanced, open-source relational database with extensive features and strong ACID compliance.

### Key Features

1. **Advanced Data Types**
   - JSON/JSONB support
   - Array types
   - Custom types
   - Full-text search

2. **Advanced SQL Features**
   - Window functions
   - Common Table Expressions (CTEs)
   - Recursive queries
   - Full-text search

3. **Extensibility**
   - Extensions (PostGIS, pgvector)
   - Custom functions
   - Procedural languages

### Use Cases

- **Complex applications** requiring advanced features
- **Geospatial data** (with PostGIS)
- **JSON-heavy applications**
- **Data warehousing**
- **Enterprise applications**

### Example

```sql
-- PostgreSQL: JSONB support
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    attributes JSONB  -- Store flexible attributes
);

INSERT INTO products (name, attributes)
VALUES ('Laptop', '{"brand": "Dell", "ram": "16GB", "storage": "512GB"}'::JSONB);

-- Query JSONB
SELECT * FROM products
WHERE attributes->>'brand' = 'Dell';
```

### Pros

- ✅ Advanced features
- ✅ Strong ACID compliance
- ✅ Excellent JSON support
- ✅ Extensible
- ✅ Great for complex queries

### Cons

- ⚠️ Steeper learning curve
- ⚠️ More resource-intensive
- ⚠️ Less common in shared hosting

## MySQL

### Overview

**MySQL** is the world's most popular open-source relational database, known for speed and ease of use.

### Key Features

1. **Performance**
   - Fast reads
   - Good for web applications
   - Optimized for simple queries

2. **Ease of Use**
   - Simple setup
   - Wide hosting support
   - Large community

3. **Replication**
   - Master-slave replication
   - Read replicas
   - High availability

### Use Cases

- **Web applications**
- **Content management systems** (WordPress, Drupal)
- **E-commerce platforms**
- **High-traffic websites**

### Example

```sql
-- MySQL: Simple and fast
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    name VARCHAR(100)
);

INSERT INTO users (email, name)
VALUES ('user@example.com', 'John Doe');

-- Fast queries
SELECT * FROM users WHERE email = 'user@example.com';
```

### Pros

- ✅ Fast performance
- ✅ Easy to use
- ✅ Wide hosting support
- ✅ Large community
- ✅ Good documentation

### Cons

- ⚠️ Fewer advanced features than PostgreSQL
- ⚠️ Some features require paid version
- ⚠️ Less strict SQL compliance

## MariaDB

### Overview

**MariaDB** is a community-driven fork of MySQL, created after Oracle acquired MySQL.

### Key Features

1. **MySQL Compatibility**
   - Drop-in replacement for MySQL
   - Same APIs and protocols
   - Easy migration

2. **Open Source**
   - Fully open-source
   - Community-driven
   - No licensing concerns

3. **Enhanced Features**
   - Better performance in some cases
   - Additional storage engines
   - More active development

### Use Cases

- **MySQL replacements**
- **Open-source projects**
- **Community-driven applications**
- **When you want MySQL without Oracle**

### Example

```sql
-- MariaDB: Same syntax as MySQL
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    total DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Works exactly like MySQL
SELECT * FROM orders WHERE user_id = 1;
```

### Pros

- ✅ MySQL compatible
- ✅ Fully open-source
- ✅ Community-driven
- ✅ Enhanced features
- ✅ Active development

### Cons

- ⚠️ Smaller ecosystem than MySQL
- ⚠️ Less enterprise support
- ⚠️ Some MySQL features may differ

## SQLite

### Overview

**SQLite** is a file-based, embedded database engine. The entire database is a single file.

### Key Features

1. **Zero Configuration**
   - No server process
   - No installation
   - Single file database

2. **Lightweight**
   - Small footprint
   - Fast for small datasets
   - Perfect for embedded systems

3. **Portable**
   - Single file
   - Easy to backup
   - Cross-platform

### Use Cases

- **Mobile applications**
- **Desktop applications**
- **Development/testing**
- **Small websites**
- **Embedded systems**

### Example

```sql
-- SQLite: No server needed
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    name TEXT
);

INSERT INTO users (email, name)
VALUES ('user@example.com', 'John Doe');

-- Database is just a file: database.db
```

### Pros

- ✅ Zero configuration
- ✅ Lightweight
- ✅ Portable
- ✅ Perfect for small apps
- ✅ Fast for small datasets

### Cons

- ⚠️ Not suitable for high concurrency
- ⚠️ Limited to single file
- ⚠️ No user management
- ⚠️ Limited features

## Comparison Matrix

| Feature | PostgreSQL | MySQL | MariaDB | SQLite |
|---------|------------|-------|---------|--------|
| **Type** | Server | Server | Server | Embedded |
| **Complexity** | High | Medium | Medium | Low |
| **Performance** | Excellent | Fast | Fast | Fast (small) |
| **JSON Support** | ✅ Excellent | ⚠️ Limited | ⚠️ Limited | ⚠️ Limited |
| **Advanced Features** | ✅ Many | ⚠️ Some | ⚠️ Some | ❌ Few |
| **Ease of Use** | Medium | Easy | Easy | Very Easy |
| **Hosting Support** | Good | Excellent | Good | N/A |
| **Best For** | Complex apps | Web apps | Open-source | Embedded |

## When to Choose Which

### Choose PostgreSQL When:
- You need advanced features (JSON, arrays, full-text search)
- Building complex applications
- Need geospatial data (PostGIS)
- Enterprise applications
- Data warehousing

### Choose MySQL When:
- Building web applications
- Need wide hosting support
- Want large community
- Simple to medium complexity
- High-traffic websites

### Choose MariaDB When:
- Want MySQL without Oracle
- Prefer fully open-source
- Community-driven projects
- Need MySQL compatibility

### Choose SQLite When:
- Building mobile/desktop apps
- Small websites
- Development/testing
- Embedded systems
- Single-user applications

## Migration Between Engines

### MySQL to PostgreSQL

```sql
-- MySQL
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255)
);

-- PostgreSQL equivalent
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255)
);
```

### PostgreSQL to MySQL

```sql
-- PostgreSQL
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    data JSONB
);

-- MySQL equivalent
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    data JSON
);
```

## Best Practices

1. **Choose Based on Needs**: Not just popularity
2. **Consider Hosting**: Some hosts prefer MySQL
3. **Team Expertise**: Use what your team knows
4. **Future Requirements**: Consider scalability needs
5. **Performance Testing**: Test with your workload

## Summary

**Database Engines:**

1. **PostgreSQL**: Advanced features, complex applications
2. **MySQL**: Popular, web applications, easy to use
3. **MariaDB**: MySQL alternative, fully open-source
4. **SQLite**: Embedded, lightweight, single-file

**Key Takeaway:**
Each database engine has strengths. PostgreSQL for advanced features, MySQL for popularity and ease, MariaDB for open-source MySQL alternative, SQLite for embedded applications. Choose based on your specific needs, not just popularity.

**Decision Guide:**
- Complex features? → PostgreSQL
- Web applications? → MySQL/MariaDB
- Embedded/mobile? → SQLite
- Team expertise? → Use what they know

**Next Steps:**
- Learn [SQL Dialects](sql_dialects.md) for syntax differences
- Study [Relational Concepts](relational_concepts.md) for database design
- Master [Performance Optimization](../10_performance_optimization/) for tuning

