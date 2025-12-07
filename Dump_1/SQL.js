// ============================================================================
// 📚 POSTGRESQL LEARNING NOTES - Complete Guide with Definitions & Theory
// ============================================================================
// PostgreSQL is an open-source, object-relational database system (ORDBMS)
// that uses SQL (Structured Query Language) as its query language.
//
// Key Concepts:
// - SQL: The language standard for querying relational databases
// - PostgreSQL: A specific database system that implements and extends SQL
// - RDBMS: Relational Database Management System (stores data in tables)
//
// ============================================================================

// 📖 BASIC QUERY EXAMPLE
// ============================================================================
// SELECT: Retrieves data from database
// * : Means "all columns" (you can also specify column names)
// FROM: Specifies which table to query
// ORDER BY: Sorts the results (ASC = ascending, DESC = descending)
// 
// This query retrieves all columns from the 'cars' table and sorts by 'year'
// ============================================================================
SELECT * FROM cars
ORDER BY year;
// 💡 Remember: Always end SQL statements with a semicolon (;)
// This tells PostgreSQL that the statement is complete
// ------------------------------------------------------------

// 📖 CREATE TABLE - Defining Database Structure
// ============================================================================
// CREATE TABLE: Creates a new table in the database
// Table Name: 'cars' - the name of the table
// Columns: brand, model, year - attributes that define the structure
//
// Data Types in PostgreSQL:
// - VARCHAR(255): Variable-length string, max 255 characters
//   (Use for text of varying lengths like names, descriptions)
// - INT: Integer (whole numbers like 1, 2, 100)
//
// Why VARCHAR instead of CHAR?
// - VARCHAR: Variable length, saves space (stores only what's needed)
// - CHAR: Fixed length, pads with spaces (use when length is always same)
// ============================================================================
CREATE TABLE cars (
    brand VARCHAR(255),    // Car manufacturer name (e.g., "Toyota", "BMW")
    model VARCHAR(255),    // Car model name (e.g., "Camry", "M1")
    year INT               // Manufacturing year (e.g., 2020, 1968)
);
// 💡 PostgreSQL is case-insensitive for keywords (CREATE = create)
// But table and column names can be case-sensitive if quoted: "Cars"

// ------------------------------------------------------------

// 📖 INSERT INTO - Adding Data to Table
// ============================================================================
// INSERT INTO: Adds new rows (records) to a table
// Syntax: INSERT INTO table_name (column1, column2, ...) VALUES (value1, value2, ...)
//
// Multiple rows can be inserted in a single statement:
// - Separate each row with a comma
// - Maintain order: column order must match VALUES order
//
// Return value: "INSERT 0 3" means:
// - 0: No OID (Object Identifier) returned
// - 3: Three rows were successfully inserted
// ============================================================================
INSERT INTO cars (brand, model, year)
VALUES ('Volvo', 'p1800', 1968),      // First row
  ('BMW', 'M1', 1978),                // Second row
  ('Toyota', 'Celica', 1975);         // Third row
// Return: INSERT 0 3 (means 3 rows inserted successfully)
// 💡 Tip: Single quotes (') for text values, no quotes for numbers
// 💡 PostgreSQL uses single quotes, not double quotes for strings

// ------------------------------------------------------------

// 📖 SELECT - Retrieving Data
// ============================================================================
// SELECT * : Retrieves all columns and all rows from the table
// The asterisk (*) is a wildcard meaning "all columns"
//
// Alternative: SELECT column1, column2 FROM cars; (specific columns only)
// ============================================================================
SELECT * FROM cars;
// This displays all data in the cars table
// Output will show: brand, model, year for all rows

// ------------------------------------------------------------

// 📖 ALTER TABLE - Modifying Table Structure
// ============================================================================
// ALTER TABLE: Modifies the structure of an existing table
// ADD: Adds a new column to the table
//
// Common ALTER TABLE operations:
// - ADD column_name datatype          (add new column)
// - DROP COLUMN column_name           (remove column)
// - ALTER COLUMN column_name TYPE new_type  (change data type)
// - RENAME COLUMN old_name TO new_name     (rename column)
//
// Why ALTER instead of recreating table?
// - Preserves existing data
// - No need to backup/restore data
// - Can be done on live databases with minimal downtime
// ============================================================================
ALTER TABLE cars
ADD color VARCHAR(255);    // Adds a new column 'color' to store car colors
// 💡 After this, existing rows will have NULL for the color column
// You'll need to UPDATE rows to set color values

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------
// 📖 DELETE - Removing Data from Table
// ============================================================================
// DELETE FROM: Removes rows from a table
// WHERE: Specifies which rows to delete (condition-based)
//
// ⚠️ CRITICAL WARNING:
// - DELETE without WHERE clause deletes ALL rows!
// - Always use WHERE clause unless you want to delete everything
// - Consider using transactions (BEGIN...ROLLBACK) for testing
//
// Syntax: DELETE FROM table_name WHERE condition;
// ============================================================================
DELETE FROM cars WHERE brand = 'Volvo';  // Fixed: Added space and semicolon
// 💡 This deletes only rows where brand equals 'Volvo'
// 💡 Use single quotes for string comparisons in PostgreSQL
// 💡 Always test DELETE queries with SELECT first: SELECT * FROM cars WHERE brand = 'Volvo';

// ------------------------------------------------------------
// 📖 CREATE TABLE with PRIMARY KEY and SERIAL
// ============================================================================
// PRIMARY KEY: Uniquely identifies each row in a table
// - Must be UNIQUE (no duplicates)
// - Must be NOT NULL (cannot be empty)
// - Only ONE primary key per table (but can be composite - multiple columns)
//
// SERIAL: Auto-incrementing integer (PostgreSQL-specific)
// - Automatically generates next number (1, 2, 3, ...)
// - Equivalent to AUTO_INCREMENT in MySQL
// - Actually creates a sequence behind the scenes
//
// NOT NULL: Column cannot contain NULL values
// - Ensures data integrity
// - Required for PRIMARY KEY columns
//
// Why use PRIMARY KEY?
// - Ensures each row is unique
// - Improves query performance (index is automatically created)
// - Required for foreign key relationships
// ============================================================================
CREATE TABLE categories (
    category_id SERIAL NOT NULL PRIMARY KEY,    // Auto-increment ID, unique identifier
    category_name VARCHAR(255),                 // Category name (e.g., "Electronics")
    description VARCHAR(255)                    // Category description
);
// 💡 SERIAL is PostgreSQL shorthand for:
//   INT NOT NULL DEFAULT nextval('categories_category_id_seq')
// 💡 PRIMARY KEY automatically creates an index for fast lookups

// ------------------------------------------------------------

// 📖 INSERT INTO (Alternative Syntax)
// ============================================================================
// When inserting into all columns (in order), you can omit column names
// Syntax: INSERT INTO table_name VALUES (value1, value2, ...);
//
// However, specifying columns is RECOMMENDED because:
// - More readable
// - Not affected by column order changes
// - Can omit columns with DEFAULT values or NULL
// ============================================================================
INSERT INTO categories (category_name, description)
VALUES ('Electronics', 'Electronic devices and gadgets');
// 💡 Note: category_id is not specified - SERIAL auto-generates it
// 💡 This is the recommended way - explicit column names

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------

// ------------------------------------------------------------
// Perfect 😎 — let’s go blazingly fast but solid.

// We’ll move from basics → intermediate → advanced in bite-sized, practical bursts — you’ll learn by doing small queries that actually build up intuition.

// ============================================================================
// 📚 SECTION: CORE SQL CONCEPTS AND CRUD OPERATIONS
// ============================================================================

// ⚡ Step 1: What SQL Actually Is
// ============================================================================
// SQL (Structured Query Language) is a standardized language used to communicate
// with relational databases. It allows you to:
// - Query data (SELECT)
// - Modify data (INSERT, UPDATE, DELETE)
// - Define structure (CREATE, ALTER, DROP)
// - Control access and transactions
//
// Relational Database: Data organized in tables (rows and columns)
// Each table represents an entity (like "users", "orders", "products")
// Relationships between tables are established through foreign keys
//
// Example Table Structure:
// ============================================================================
// id  | name  | age
// ----|-------|-----
// 1   | Alice | 24
// 2   | Bob   | 30
// ============================================================================

// ⚙️ Step 2: Core SQL Commands (CRUD Operations)
// ============================================================================
// CRUD = Create, Read, Update, Delete
// These are the four basic operations for managing data
//
// 1️⃣ CREATE TABLE - Define table structure
// ============================================================================
// CREATE TABLE: Creates a new table in the database
// INT: Integer data type (whole numbers)
// PRIMARY KEY: Uniquely identifies each row (cannot be NULL or duplicate)
// AUTO_INCREMENT: Automatically generates next number (MySQL syntax)
//   Note: In PostgreSQL, use SERIAL instead of AUTO_INCREMENT
// VARCHAR(50): Variable-length string, max 50 characters
// ============================================================================
// CREATE TABLE users (
//   id INT PRIMARY KEY AUTO_INCREMENT,  // Auto-incrementing unique ID
//   name VARCHAR(50),                    // User's name (max 50 chars)
//   age INT                              // User's age (integer)
// );
//
// PostgreSQL Equivalent:
// CREATE TABLE users (
//   id SERIAL PRIMARY KEY,  // SERIAL = auto-increment in PostgreSQL
//   name VARCHAR(50),
//   age INT
// );

// 2️⃣ INSERT - Add new data (Create operation)
// ============================================================================
// INSERT INTO: Adds new rows (records) to a table
// Syntax: INSERT INTO table_name (column1, column2, ...) VALUES (value1, value2, ...)
// Multiple rows can be inserted in one statement (separated by commas)
// ============================================================================
// INSERT INTO users (name, age)
// VALUES ('Alice', 24),    // First row
//        ('Bob', 30);       // Second row
// 💡 Return value: "INSERT 0 2" means 2 rows inserted successfully

// 3️⃣ SELECT - Retrieve data (Read operation)
// ============================================================================
// SELECT: Retrieves data from one or more tables
// * : Wildcard meaning "all columns"
// FROM: Specifies which table(s) to query
// WHERE: Filters rows based on conditions
//
// Different SELECT patterns:
// ============================================================================
// SELECT * FROM users;              // All columns, all rows
// SELECT name FROM users;           // Only 'name' column, all rows
// SELECT * FROM users WHERE age > 25;  // All columns, filtered rows (age > 25)
//
// Comparison Operators:
// - =  : Equal to
// - != or <> : Not equal to
// - >  : Greater than
// - <  : Less than
// - >= : Greater than or equal to
// - <= : Less than or equal to
// - BETWEEN: Range (e.g., age BETWEEN 20 AND 30)
// - IN: Match any value in list (e.g., age IN (20, 25, 30))
// - LIKE: Pattern matching (e.g., name LIKE 'A%' - starts with 'A')
// - IS NULL / IS NOT NULL: Check for NULL values

// 4️⃣ UPDATE - Modify existing data (Update operation)
// ============================================================================
// UPDATE: Modifies existing rows in a table
// SET: Specifies which columns to change and their new values
// WHERE: Specifies which rows to update (CRITICAL - without WHERE, updates ALL rows!)
//
// ⚠️ WARNING: Always use WHERE clause unless you want to update every row!
// ============================================================================
// UPDATE users
// SET age = 25              // Change age to 25
// WHERE name = 'Alice';     // Only for rows where name is 'Alice'
//
// Multiple columns:
// UPDATE users
// SET age = 26, name = 'Alice Smith'  // Update multiple columns
// WHERE id = 1;

// 5️⃣ DELETE - Remove data (Delete operation)
// ============================================================================
// DELETE FROM: Removes rows from a table
// WHERE: Specifies which rows to delete (CRITICAL - without WHERE, deletes ALL rows!)
//
// ⚠️ WARNING: DELETE without WHERE deletes EVERYTHING!
// Always test with SELECT first:
//   SELECT * FROM users WHERE id = 1;  // Check what will be deleted
//   DELETE FROM users WHERE id = 1;    // Then delete
// ============================================================================
// DELETE FROM users WHERE id = 1;  // Delete row where id = 1
// 💡 Tip: In PostgreSQL, you can use RETURNING to see what was deleted:
//   DELETE FROM users WHERE id = 1 RETURNING *;

// 🧠 Step 3: Filtering & Sorting
// ============================================================================
// WHERE: Filters rows based on conditions
// BETWEEN: Checks if value is within a range (inclusive - includes boundaries)
// ORDER BY: Sorts results (ASC = ascending, DESC = descending)
// LIMIT: Restricts number of rows returned (useful for pagination)
//
// Clause Order: SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT
// ============================================================================
// SELECT * FROM users
// WHERE age BETWEEN 20 AND 30    // Age between 20 and 30 (inclusive)
// ORDER BY age DESC               // Sort by age, highest first (DESC = descending)
// LIMIT 2;                        // Return only first 2 rows
//
// Additional Sorting:
// ORDER BY age DESC, name ASC;   // Sort by age (desc), then name (asc)
// ORDER BY 2 DESC;               // Sort by 2nd column (numeric position)
//
// LIMIT and OFFSET (for pagination):
// SELECT * FROM users LIMIT 10 OFFSET 20;  // Skip first 20, return next 10
// -- Equivalent to: "Show page 3 if 10 items per page"

// 🔗 Step 4: Joins (Combining Tables)
// ============================================================================
// JOIN: Combines rows from two or more tables based on related columns
// Essential for relational databases - allows you to query related data
//
// Types of JOINs:
// 1. INNER JOIN: Returns only matching rows from both tables
// 2. LEFT JOIN (LEFT OUTER JOIN): Returns all rows from left table + matching from right
// 3. RIGHT JOIN (RIGHT OUTER JOIN): Returns all rows from right table + matching from left
// 4. FULL OUTER JOIN: Returns all rows from both tables
// 5. CROSS JOIN: Returns cartesian product (all combinations)
//
// Foreign Key: A column in one table that references PRIMARY KEY in another
// ============================================================================

// Example: Two related tables
// ============================================================================
// CREATE TABLE orders (
//   id INT PRIMARY KEY AUTO_INCREMENT,
//   user_id INT,                    // Foreign key referencing users.id
//   product VARCHAR(50),
//   FOREIGN KEY (user_id) REFERENCES users(id)  // Establishes relationship
// );
//
// PostgreSQL equivalent:
// CREATE TABLE orders (
//   id SERIAL PRIMARY KEY,
//   user_id INT REFERENCES users(id),  // Shorthand foreign key syntax
//   product VARCHAR(50)
// );

// INNER JOIN - Most Common
// ============================================================================
// Returns only rows where there's a match in both tables
// If user has no orders, they won't appear
// If order has invalid user_id, it won't appear
// ============================================================================
// SELECT users.name, orders.product
// FROM users
// JOIN orders ON users.id = orders.user_id;
// -- Equivalent to: SELECT users.name, orders.product FROM users INNER JOIN orders ON users.id = orders.user_id;
//
// Result: Only users who have orders, with their products

// LEFT JOIN - Keep All Left Table Rows
// ============================================================================
// Returns ALL rows from left table (users) + matching rows from right (orders)
// If user has no orders, they still appear (with NULL in order columns)
// ============================================================================
// SELECT users.name, orders.product
// FROM users
// LEFT JOIN orders ON users.id = orders.user_id;
//
// Result: All users, even those without orders (product will be NULL)

// RIGHT JOIN - Keep All Right Table Rows
// ============================================================================
// Returns ALL rows from right table (orders) + matching rows from left (users)
// If order has invalid user_id, it still appears (name will be NULL)
// ============================================================================
// SELECT users.name, orders.product
// FROM users
// RIGHT JOIN orders ON users.id = orders.user_id;
//
// Result: All orders, even those with invalid user_id (name will be NULL)

// FULL OUTER JOIN - Keep Everything
// ============================================================================
// Returns all rows from both tables
// Missing matches show NULL in the other table's columns
// ============================================================================
// SELECT users.name, orders.product
// FROM users
// FULL OUTER JOIN orders ON users.id = orders.user_id;
//
// Result: All users AND all orders, with NULLs where no match

// Multiple JOINs
// ============================================================================
// You can join multiple tables in one query
// Example: users → orders → order_items → products
// ============================================================================
// SELECT users.name, products.name, order_items.quantity
// FROM users
// JOIN orders ON users.id = orders.user_id
// JOIN order_items ON orders.id = order_items.order_id
// JOIN products ON order_items.product_id = products.id;

// 💡 JOIN Tips:
// - Always specify table aliases for readability: FROM users u JOIN orders o
// - Use WHERE clause after JOINs for filtering
// - JOIN performance: INNER JOIN is usually fastest, FULL OUTER is slowest

// 📊 Step 5: Aggregation (Summaries)
// ============================================================================
// Aggregation Functions: Perform calculations on groups of rows
// Common functions: COUNT, SUM, AVG, MIN, MAX
//
// GROUP BY: Groups rows with same values in specified columns
// HAVING: Filters groups (similar to WHERE but for groups)
// WHERE vs HAVING:
//   - WHERE filters rows BEFORE grouping
//   - HAVING filters groups AFTER grouping
// ============================================================================

// COUNT - Count number of rows
// ============================================================================
// COUNT(*): Counts all rows (including NULLs)
// COUNT(column): Counts non-NULL values in column
// COUNT(DISTINCT column): Counts unique non-NULL values
// ============================================================================
// SELECT COUNT(*) AS total_users FROM users;
// -- Returns: total_users = 2 (if 2 users exist)
//
// SELECT COUNT(DISTINCT age) AS unique_ages FROM users;
// -- Returns: number of unique age values

// AVG, SUM, MIN, MAX - Statistical Functions
// ============================================================================
// AVG: Average (mean) of numeric column
// SUM: Sum of numeric column
// MIN: Minimum value
// MAX: Maximum value
// ============================================================================
// SELECT AVG(age) AS avg_age FROM users;
// -- Returns: average age of all users
//
// SELECT SUM(age) AS total_age, MIN(age) AS youngest, MAX(age) AS oldest
// FROM users;

// GROUP BY - Group Rows by Column Values
// ============================================================================
// Groups rows that have same values in specified columns
// Each group becomes one row in result
// Must use aggregation functions with GROUP BY
// ============================================================================
// SELECT age, COUNT(*) AS user_count
// FROM users
// GROUP BY age;
// -- Returns: Each age value with count of users having that age
//
// Example output:
// age | user_count
// ----|------------
// 24  | 1
// 30  | 1

// GROUP BY Multiple Columns
// ============================================================================
// SELECT department, age, COUNT(*) AS count
// FROM employees
// GROUP BY department, age;
// -- Groups by both department AND age

// HAVING - Filter Groups
// ============================================================================
// Filters groups after GROUP BY
// Use for conditions on aggregated values
// ============================================================================
// SELECT age, COUNT(*) AS user_count
// FROM users
// GROUP BY age
// HAVING COUNT(*) > 1;  -- Only show ages with more than 1 user
//
// Compare:
// WHERE age > 25        -- Filters rows BEFORE grouping
// HAVING COUNT(*) > 1   -- Filters groups AFTER grouping

// 💡 Aggregation Tips:
// - NULL values are ignored by aggregation functions (except COUNT(*))
// - Can't use WHERE with aggregated values - use HAVING instead
// - GROUP BY columns can appear in SELECT (others need aggregation)

// ⚡ Step 6: Subqueries & Aliases
// ============================================================================
// Subquery (Nested Query): A query inside another query
// Used when you need data that depends on another query's result
//
// Types of Subqueries:
// 1. Scalar Subquery: Returns single value (used with =, >, <, etc.)
// 2. Row Subquery: Returns single row (multiple columns)
// 3. Table Subquery: Returns multiple rows (used with IN, EXISTS, etc.)
//
// Alias: Short name for table or column (improves readability)
// ============================================================================

// Scalar Subquery Example
// ============================================================================
// Returns single value - can be used in WHERE, SELECT, etc.
// ============================================================================
// SELECT name
// FROM users
// WHERE age > (SELECT AVG(age) FROM users);
// -- Returns users older than average age
//
// Breakdown:
// 1. Inner query: (SELECT AVG(age) FROM users) → returns average age (e.g., 27)
// 2. Outer query: SELECT name FROM users WHERE age > 27

// Subquery with IN
// ============================================================================
// Returns multiple values - use with IN operator
// ============================================================================
// SELECT name
// FROM users
// WHERE id IN (SELECT user_id FROM orders WHERE product = 'iPhone');
// -- Returns users who ordered iPhone
//
// IN: Matches if value is in the list
// NOT IN: Matches if value is NOT in the list (watch out for NULLs!)

// Subquery with EXISTS
// ============================================================================
// Checks if subquery returns any rows (returns TRUE/FALSE)
// Often faster than IN for large datasets
// ============================================================================
// SELECT name
// FROM users u
// WHERE EXISTS (
//   SELECT 1 FROM orders o 
//   WHERE o.user_id = u.id AND o.product = 'iPhone'
// );
// -- Returns users who have at least one iPhone order
//
// EXISTS: Returns TRUE if subquery returns at least one row
// NOT EXISTS: Returns TRUE if subquery returns no rows

// Correlated Subquery
// ============================================================================
// Inner query references outer query's columns
// Executes once for each row in outer query (can be slow)
// ============================================================================
// SELECT name, 
//        (SELECT COUNT(*) FROM orders WHERE user_id = users.id) AS order_count
// FROM users;
// -- Returns each user with their order count
//
// Note: Inner query uses "users.id" from outer query

// Alias - Table Alias
// ============================================================================
// Short name for table - improves readability, required for self-joins
// ============================================================================
// SELECT u.name, o.product
// FROM users AS u              -- 'u' is alias for 'users'
// JOIN orders AS o             -- 'o' is alias for 'orders'
//   ON u.id = o.user_id;
//
// Shorthand: AS is optional
// SELECT u.name FROM users u;  -- same as "FROM users AS u"

// Alias - Column Alias
// ============================================================================
// Renames column in result set (doesn't change table structure)
// ============================================================================
// SELECT 
//   name AS user_name,           -- Column renamed to 'user_name'
//   age AS user_age,             -- Column renamed to 'user_age'
//   AVG(age) AS average_age      -- Aggregation with alias
// FROM users;

// 💡 Subquery Tips:
// - Use JOINs when possible (usually faster than subqueries)
// - EXISTS is often faster than IN for large datasets
// - Correlated subqueries can be slow - consider JOINs or window functions
// - Always test subqueries separately before using in outer query

// 🚀 Step 7: Constraints & Indexes

// Constraints help enforce data rules:

// CREATE TABLE employees (
//   id INT PRIMARY KEY,
//   email VARCHAR(100) UNIQUE,
//   age INT CHECK (age > 18),
//   dept_id INT NOT NULL
// );


// Add index for faster search:

// CREATE INDEX idx_email ON employees(email);

// 🔥 Step 8: Real-world Example Challenge

// You try:

// Get the names of users who ordered a product named “iPhone”.

// Would you like me to make this interactive, where I teach you concept-by-concept with a small task after every step (and we go from beginner → pro in ~10 sessions)?
// That’s the fastest way to actually learn it.


// 🧩 SQL vs PostgreSQL — Not the Same Thing
// 1️⃣ SQL → The Language

// SQL (Structured Query Language) is a standard language used to talk to relational databases.

// Think of it like English grammar — it defines how you express instructions such as:

// SELECT * FROM users WHERE age > 20;


// Every relational database (MySQL, PostgreSQL, SQLite, SQL Server, Oracle) understands SQL — but each adds its own flavor or extensions.

// 2️⃣ PostgreSQL → The Database System

// PostgreSQL (or Postgres) is an open-source RDBMS (Relational Database Management System) that implements SQL — and extends it massively.

// Think of it like:
// 🧠 SQL = language,
// ⚙️ Postgres = program that executes it (with extra powers).

// ⚔️ SQL (Standard) vs PostgreSQL (Implementation)
// Concept	SQL (Standard)	PostgreSQL (Implementation)
// Definition	Query language for relational data	A database system that uses SQL
// Creator	ANSI/ISO standard	Open-source, originally by UC Berkeley
// Scope	Rules & syntax only	Full DB engine (storage, indexing, execution, transactions)
// Data types	Basic (INT, VARCHAR, DATE)	Rich (JSON, ARRAY, HSTORE, UUID, etc.)
// Extensions	None defined	Many (PostGIS, full-text search, custom functions)
// ACID compliance	Defined by SQL standard	Fully ACID-compliant
// Procedural language	Optional	Has PL/pgSQL, Python, etc.
// Performance tuning	N/A	Postgres has advanced indexing, CTEs, partitioning
// 🧠 Example

// SQL (Standard):

// SELECT name FROM users WHERE age > 25;


// PostgreSQL (Extended):

// SELECT name
// FROM users
// WHERE details->>'city' = 'Delhi';  -- JSON query (Postgres feature)


// SQL itself doesn’t define ->> (that’s Postgres’s extension to handle JSON).

// 🧰 Think of it like this analogy
// Analogy	Meaning
// “C language”	SQL syntax/standards
// “GCC Compiler”	PostgreSQL engine that runs your SQL
// “GCC has extensions like __attribute__”	PostgreSQL adds its own SQL extensions
// 🏁 TL;DR

// SQL → The language standard for databases.

// PostgreSQL → A powerful open-source database that uses and extends SQL.



// Let’s go step-by-step and make this crystal clear 👇

// ⚙️ MySQL vs PostgreSQL — The Big Picture
// Feature	MySQL	PostgreSQL
// 🧠 Type	Relational Database (RDBMS)	Object-Relational Database (ORDBMS)
// 💬 Query Language	Uses SQL (with MySQL flavor)	Uses SQL (with PostgreSQL flavor, more standard-compliant)
// 🚀 Performance	Super fast for read-heavy apps	Slightly slower writes, but handles complex queries better
// 🧩 Data Integrity & Standards	Focused on simplicity and speed	Fully ACID compliant, strict about data integrity
// 🧰 Advanced Data Types	Basic (INT, VARCHAR, DATE, etc.)	Rich (JSONB, ARRAY, UUID, HSTORE, RANGE, etc.)
// 🧮 Joins & Complex Queries	Optimized for simpler joins	Excellent for complex joins, subqueries, and CTEs
// 🔍 Indexing	B-Tree, Fulltext (from v5.6+), Spatial (via InnoDB)	B-Tree, GiST, GIN, BRIN, HASH, SP-GiST, etc.
// ⚡ JSON Support	JSON (text-based, limited)	JSONB (binary, indexable, super fast)
// 🔒 Transactions (ACID)	Supported (depends on engine; InnoDB = yes)	Fully ACID by design
// 🔁 Replication	Master-slave, Group replication	Streaming, Logical, Physical, Bidirectional replication
// 🧩 Extensions	Limited	Rich ecosystem (PostGIS, TimescaleDB, pgVector, etc.)
// 🧠 Stored Procedures / Functions	Supported (SQL/PSM)	Supported (SQL, PL/pgSQL, Python, etc.)
// 🛠 Community / Ecosystem	Huge (especially for web apps)	Developer-oriented, strong in data engineering / analytics
// 🌍 Used By	Facebook, YouTube, Airbnb, Shopify	Instagram, Reddit, Spotify, Apple, NASA
// 💾 Best For	Simpler web apps (CRUD, dashboards)	Complex analytics, geospatial, fintech, data-heavy systems
// 🧩 Philosophy Difference
// Philosophy	MySQL	PostgreSQL
// ⚙️ “Make it simple & fast.”	Prioritizes speed & ease for developers.	
// 🧠 “Follow standards & be powerful.”		Prioritizes correctness, power, and extensibility.

// MySQL = practical and forgiving.
// Postgres = precise and powerful.

// 🔥 Real Example: JSON Difference

// In MySQL:

// SELECT data->"$.name" FROM users;


// Only text-level JSON, limited indexing.

// In PostgreSQL:

// SELECT data->>'name' FROM users WHERE data->>'city' = 'Delhi';


// Binary JSON (JSONB) with index support → faster queries.

// ⚖️ When to Use Which
// Use Case	Choose
// Simple web app, CRUD-heavy	🟢 MySQL
// Real-time analytics, large data, or complex relations	🔵 PostgreSQL
// Financial / scientific / geospatial data	🔵 PostgreSQL
// Read-heavy CMS (WordPress, Drupal, etc.)	🟢 MySQL
// AI / ML data storage (e.g., pgVector embeddings)	🔵 PostgreSQL
// 🧠 TL;DR Summary

// MySQL → Simple, fast, great for typical web apps.

// PostgreSQL → Advanced, reliable, great for data-heavy or complex logic apps.


// 🧱 Example 1: Table Creation

// 🟢 MySQL

// CREATE TABLE users (
//   id INT AUTO_INCREMENT PRIMARY KEY,
//   name VARCHAR(50),
//   email VARCHAR(100) UNIQUE,
//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// );


// 🔵 PostgreSQL

// CREATE TABLE users (
//   id SERIAL PRIMARY KEY,
//   name VARCHAR(50),
//   email VARCHAR(100) UNIQUE,
//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// );


// 📘 Difference:

// MySQL uses AUTO_INCREMENT

// PostgreSQL uses SERIAL (or GENERATED ALWAYS AS IDENTITY in newer versions)

// 🧩 Example 2: String Concatenation

// 🟢 MySQL

// SELECT CONCAT(first_name, ' ', last_name) AS full_name FROM users;


// 🔵 PostgreSQL

// SELECT first_name || ' ' || last_name AS full_name FROM users;


// 📘 Difference:

// MySQL uses CONCAT()

// PostgreSQL uses || for string concatenation (more SQL-standard)

// 🔍 Example 3: JSON Handling

// 🟢 MySQL

// CREATE TABLE users (
//   id INT PRIMARY KEY AUTO_INCREMENT,
//   data JSON
// );

// SELECT data->"$.name" AS name FROM users;


// 🔵 PostgreSQL

// CREATE TABLE users (
//   id SERIAL PRIMARY KEY,
//   data JSONB
// );

// SELECT data->>'name' AS name FROM users
// WHERE data->>'city' = 'Delhi';


// 📘 Difference:

// PostgreSQL uses JSONB (binary JSON — faster & indexable).

// MySQL’s JSON is text-based and slower for large data.

// 📊 Example 4: Aggregate & Filtering

// 🟢 MySQL

// SELECT department, COUNT(*) AS total
// FROM employees
// GROUP BY department
// HAVING total > 5;


// 🔵 PostgreSQL

// SELECT department, COUNT(*) AS total
// FROM employees
// GROUP BY department
// HAVING COUNT(*) > 5;


// 📘 Difference:

// MySQL allows alias (HAVING total > 5)

// PostgreSQL requires the aggregate directly (HAVING COUNT(*) > 5)

// 🔗 Example 5: Case-Insensitive Search

// 🟢 MySQL

// SELECT * FROM users WHERE name LIKE '%john%';


// 🔵 PostgreSQL

// SELECT * FROM users WHERE name ILIKE '%john%';


// 📘 Difference:

// MySQL’s LIKE is case-insensitive only if the column uses a case-insensitive collation.

// PostgreSQL has ILIKE (built-in case-insensitive matching) — more explicit.

// ⚙️ Example 6: Default Boolean Handling

// 🟢 MySQL

// CREATE TABLE flags (active BOOLEAN DEFAULT TRUE);
// -- Internally stored as TINYINT(1)


// 🔵 PostgreSQL

// CREATE TABLE flags (active BOOLEAN DEFAULT TRUE);
// -- Native boolean type (true/false)


// 📘 Difference:

// MySQL treats BOOLEAN as TINYINT(1) (0/1).

// PostgreSQL has a true boolean type.

// 🧠 Example 7: Common Table Expressions (CTEs)

// 🟢 MySQL (v8.0+)

// WITH recent_users AS (
//   SELECT * FROM users WHERE created_at > NOW() - INTERVAL 7 DAY
// )
// SELECT * FROM recent_users WHERE name LIKE '%John%';


// 🔵 PostgreSQL

// WITH recent_users AS (
//   SELECT * FROM users WHERE created_at > NOW() - INTERVAL '7 days'
// )
// SELECT * FROM recent_users WHERE name ILIKE '%John%';


// 📘 Difference:

// MySQL supports CTEs only from version 8.0+.

// PostgreSQL supported them long before and with recursive capabilities.

// 🧩 Example 8: Arrays (Only PostgreSQL!)

// 🔵 PostgreSQL

// CREATE TABLE users (
//   id SERIAL PRIMARY KEY,
//   skills TEXT[]
// );

// INSERT INTO users (skills) VALUES (ARRAY['Node.js', 'Postgres', 'Redis']);

// SELECT * FROM users WHERE 'Redis' = ANY(skills);


// 📘 Difference:
// MySQL doesn’t have true array support — you’d need another table or store it as JSON.

// 🧰 Example 9: Upsert (Insert or Update)

// 🟢 MySQL

// INSERT INTO users (id, name, email)
// VALUES (1, 'Karan', 'karan@mail.com')
// ON DUPLICATE KEY UPDATE
//   name = VALUES(name);


// 🔵 PostgreSQL

// INSERT INTO users (id, name, email)
// VALUES (1, 'Karan', 'karan@mail.com')
// ON CONFLICT (id) DO UPDATE
// SET name = EXCLUDED.name;


// 📘 Difference:

// PostgreSQL uses ON CONFLICT (more flexible & SQL-standard).

// MySQL uses ON DUPLICATE KEY UPDATE.

// 🔥 Example 10: Case Expressions

// 🟢 MySQL

// SELECT name,
//   CASE
//     WHEN age < 18 THEN 'Minor'
//     WHEN age < 60 THEN 'Adult'
//     ELSE 'Senior'
//   END AS category
// FROM users;


// 🔵 PostgreSQL
// (same syntax)

// SELECT name,
//   CASE
//     WHEN age < 18 THEN 'Minor'
//     WHEN age < 60 THEN 'Adult'
//     ELSE 'Senior'
//   END AS category
// FROM users;


// 📘 Same in both — this one’s fully SQL-standard.

// 🧭 Summary
// Feature	MySQL	PostgreSQL
// JSON support	Basic	Advanced (JSONB, indexable)
// Array support	❌	✅
// Boolean type	❌ (tinyint)	✅ (true boolean)
// Case-insensitive search	Only via collation	✅ ILIKE
// Recursive CTEs	✅ (v8+)	✅ (long ago)
// Upsert syntax	ON DUPLICATE KEY	ON CONFLICT
// Data consistency	Relaxed	Strict
// Speed	Faster for simple reads	Better for complex workloads


Great question 👌
Let’s go step-by-step — here’s a **clear and complete explanation of *method overloading* in C++**, with examples and notes on how it works under the hood.

---

## 🧠 **What is Method Overloading in C++?**

**Definition:**
👉 **Method Overloading** (also called **Function Overloading**) in C++ means **defining multiple functions with the same name but different parameter lists** (different number or types of arguments).

The **compiler decides which version to call at compile time** — this is known as **compile-time polymorphism**.

---

## 📘 **Example 1: Basic Method Overloading**

```cpp
#include <iostream>
using namespace std;

class Print {
public:
    void show(int x) {
        cout << "Integer: " << x << endl;
    }

    void show(double y) {
        cout << "Double: " << y << endl;
    }

    void show(string z) {
        cout << "String: " << z << endl;
    }
};

int main() {
    Print obj;

    obj.show(10);         // calls show(int)
    obj.show(12.5);       // calls show(double)
    obj.show("Nikita");   // calls show(string)

    return 0;
}
```

### 🧩 Output:

```
Integer: 10
Double: 12.5
String: Nikita
```

✅ Here, **all three functions have the same name `show`**, but they take different parameter types — that’s **method overloading**.

---

## ⚙️ **How It Works (Under the Hood)**

During **compilation**, the C++ compiler **creates a unique function signature** for each overloaded method based on:

* Function name
* Number of parameters
* Parameter types

Example:
For the above code, compiler internally might treat them as:

```
show_int(int)
show_double(double)
show_string(std::string)
```

This process is called **Name Mangling**.

---

## 📘 **Example 2: Different Number of Arguments**

```cpp
class Math {
public:
    int add(int a, int b) {
        return a + b;
    }

    int add(int a, int b, int c) {
        return a + b + c;
    }
};

int main() {
    Math m;
    cout << m.add(5, 10) << endl;       // calls add(int, int)
    cout << m.add(5, 10, 15) << endl;   // calls add(int, int, int)
}
```

### Output:

```
15
30
```

---

## 🚫 **What cannot be overloaded**

You **cannot overload** functions just by:

* Changing the **return type only** (parameters must differ)

❌ Invalid example:

```cpp
int test() {}
double test() {}  // ❌ Error: redefinition of ‘test’
```

Compiler can’t distinguish them because parameters are identical.

---

## 🧱 **Overloading vs Overriding**

| Concept       | Method Overloading        | Method Overriding               |
| ------------- | ------------------------- | ------------------------------- |
| Type          | Compile-time polymorphism | Run-time polymorphism           |
| Function name | Same                      | Same                            |
| Parameters    | Must differ               | Must be same                    |
| Classes       | Same class                | Different classes (inheritance) |
| Keyword       | None                      | `virtual` / `override` used     |

---

## 🧩 **Example 3: Constructor Overloading**

Constructors can also be overloaded — they just have different parameters.

```cpp
class Student {
public:
    string name;
    int age;

    Student() { // default constructor
        name = "Unknown";
        age = 0;
    }

    Student(string n, int a) { // parameterized constructor
        name = n;
        age = a;
    }

    void display() {
        cout << name << " - " << age << endl;
    }
};

int main() {
    Student s1;
    Student s2("Nikita", 23);

    s1.display();
    s2.display();
}
```

### Output:

```
Unknown - 0
Nikita - 23
```

---

## ✅ **Summary Table**

| Feature          | Description                                      |
| ---------------- | ------------------------------------------------ |
| Purpose          | To use same function name for similar operations |
| Decided at       | Compile-time                                     |
| Based on         | Number/type/order of parameters                  |
| Cannot differ by | Return type only                                 |
| Example          | `void show(int)`, `void show(string)`            |

---

Would you like me to explain **operator overloading** next (e.g., `+`, `==`, `<<` custom behavior for classes)? It’s the next logical topic after method overloading in C++.


Perfect! Let’s do a **deep-dive PostgreSQL tutorial** covering **complex queries, transactions, JSONB, custom data types, MVCC, joins, and more** — all with **real SQL examples** in a logical flow. I’ll provide **code + short explanations** so it’s practical.

---

# **1️⃣ Create Database and Connect**

```sql
-- Create database
CREATE DATABASE schoolDB;

-- Connect to the database
\c schoolDB
```

**Explanation:** Creates a DB `schoolDB` and connects to it.

---

# **2️⃣ Create Custom Data Types**

```sql
-- Custom enum type for grades
CREATE TYPE grade_enum AS ENUM ('A', 'B', 'C', 'D', 'F');
```

**Explanation:** `grade_enum` allows only predefined values for grade field.

---

# **3️⃣ Create Tables with Constraints**

```sql
-- Students table
CREATE TABLE students (
    student_id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    age INT CHECK(age > 0),
    grade grade_enum
);

-- Subjects table
CREATE TABLE subjects (
    subject_id SERIAL PRIMARY KEY,
    subject_name VARCHAR(50) UNIQUE NOT NULL
);

-- Student-Subjects mapping (many-to-many)
CREATE TABLE student_subjects (
    student_id INT REFERENCES students(student_id) ON DELETE CASCADE,
    subject_id INT REFERENCES subjects(subject_id) ON DELETE CASCADE,
    marks INT CHECK(marks >= 0 AND marks <= 100),
    PRIMARY KEY(student_id, subject_id)
);
```

**Explanation:**

* `students` with `grade_enum` and `CHECK` constraints.
* `student_subjects` implements **many-to-many relation**.

---

# **4️⃣ Insert Sample Data**

```sql
INSERT INTO students(name, age, grade)
VALUES
('Nikita', 20, 'A'),
('Karan', 18, 'B'),
('Sumit', 22, 'C');

INSERT INTO subjects(subject_name)
VALUES
('Math'), ('Science'), ('English');

INSERT INTO student_subjects(student_id, subject_id, marks)
VALUES
(1, 1, 90),
(1, 2, 85),
(2, 1, 70),
(2, 3, 88),
(3, 2, 75),
(3, 3, 80);
```

---

# **5️⃣ Complex Queries with Joins**

```sql
-- Join students with subjects and marks
SELECT s.name, sub.subject_name, ss.marks
FROM student_subjects ss
JOIN students s ON ss.student_id = s.student_id
JOIN subjects sub ON ss.subject_id = sub.subject_id
ORDER BY s.name, sub.subject_name;
```

**Explanation:** Shows **student name, subject, marks** using **INNER JOIN**.

---

# **6️⃣ JSONB Storage and Queries**

```sql
-- Add JSONB column for student profile
ALTER TABLE students ADD COLUMN profile JSONB;

-- Insert JSON data
UPDATE students SET profile = '{"hobbies":["reading","chess"], "city":"Delhi"}' WHERE student_id=1;
UPDATE students SET profile = '{"hobbies":["football","music"], "city":"Mumbai"}' WHERE student_id=2;

-- Query JSONB: get students in Delhi
SELECT name, profile->>'city' AS city
FROM students
WHERE profile->>'city' = 'Delhi';

-- Query JSONB array: check if hobby exists
SELECT name
FROM students
WHERE profile->'hobbies' ? 'chess';  -- ? operator checks key/array element
```

---

# **7️⃣ Transactions and Rollback**

```sql
BEGIN;  -- start transaction

UPDATE students SET age = age + 1 WHERE student_id = 1;
INSERT INTO student_subjects(student_id, subject_id, marks) VALUES (1, 3, 95);

-- Rollback if something goes wrong
ROLLBACK;  

-- Or commit changes
-- COMMIT;
```

**Explanation:** Ensures multiple operations succeed together; otherwise rollback (atomicity).

---

# **8️⃣ Aggregate and Window Functions**

```sql
-- Average marks per student
// /*************  ✨ Windsurf Command 🌟  *************/
// -- Calculate average marks per student
// -- Use aggregate function AVG to calculate average
// -- Use JOIN to combine student_subjects and students tables
// -- Use GROUP BY to group results by student name
// -- Use ORDER BY to sort results by average marks in descending order
SELECT s.name, AVG(ss.marks) AS avg_marks
FROM student_subjects ss
JOIN students s ON ss.student_id = s.student_id
GROUP BY s.name
ORDER BY avg_marks DESC;

// -- Rank students by total marks
// -- Use aggregate function SUM to calculate total marks
// -- Use RANK() window function to rank students
// -- Use JOIN to combine student_subjects and students tables
// -- Use GROUP BY to group results by student name
SELECT s.name, SUM(ss.marks) AS total_marks,
       RANK() OVER(ORDER BY SUM(ss.marks) DESC) AS rank
FROM student_subjects ss
JOIN students s ON ss.student_id = s.student_id
GROUP BY s.name;
/*******  587c8f97-b257-4469-a8cd-06c7091598f3  *******/
```

---

# **9️⃣ Multi-Version Concurrency Control (MVCC) Example**

```sql
-- Transaction 1
BEGIN;
UPDATE students SET age = age + 1 WHERE student_id = 1;

-- Transaction 2 in parallel (reads old value)
SELECT age FROM students WHERE student_id = 1;

-- Transaction 1 COMMIT; now Transaction 2 sees new value
```

**Explanation:** PostgreSQL uses **MVCC**, so readers don’t block writers and always see **consistent snapshot**.

---

# **🔟 CTEs and Recursive Queries**

```sql
-- CTE example: students with average marks
WITH student_avg AS (
  SELECT student_id, AVG(marks) AS avg_marks
  FROM student_subjects
  GROUP BY student_id
)
SELECT s.name, sa.avg_marks
FROM students s
JOIN student_avg sa ON s.student_id = sa.student_id
WHERE sa.avg_marks > 80;
```

---

# **1️⃣1️⃣ Upsert (Insert or Update) using ON CONFLICT**

```sql
INSERT INTO subjects(subject_name)
VALUES ('History')
ON CONFLICT(subject_name) DO UPDATE
SET subject_name = EXCLUDED.subject_name || ' (updated)';
```

**Explanation:** If `subject_name` exists, updates it; otherwise inserts.

---

# **1️⃣2️⃣ Indexing for Performance**

```sql
CREATE INDEX idx_student_grade ON students(grade);
CREATE INDEX idx_marks ON student_subjects(marks);
```

---

# **Summary of Features Covered**

| Feature           | PostgreSQL Example                                  |
| ----------------- | --------------------------------------------------- |
| Custom data types | `CREATE TYPE grade_enum AS ENUM ('A','B',...)`      |
| JSONB storage     | `profile JSONB` with `->>` and `?` operators        |
| Joins             | `JOIN students s ON ss.student_id = s.student_id`   |
| Transactions      | `BEGIN ... COMMIT/ROLLBACK`                         |
| MVCC              | Concurrent reads/writes work without blocking       |
| Aggregation       | `AVG`, `SUM`, `RANK() OVER()`                       |
| CTEs              | `WITH student_avg AS (...)`                         |
| Upsert            | `ON CONFLICT ... DO UPDATE`                         |
| Indexing          | `CREATE INDEX idx_student_grade ON students(grade)` |

---

If you want, I can make a **single, ready-to-run SQL script** that:

1. Creates DB
2. Adds tables + constraints
3. Inserts data
4. Runs all complex queries (joins, JSONB, aggregation, transactions)

…so you can **just paste and test everything at once**.

Do you want me to do that?



Absolutely! Let’s do this in a **memory-friendly, structured way** for PostgreSQL SQL queries, including **easy + tough interview-level stuff** and **all important keywords**. I’ll organize it **logically by use case**, with **short mental hooks** so you can recall them quickly during interviews.

---

# **📌 PostgreSQL Queries & Keywords Cheat Sheet (Interview Friendly)**

---

## **1️⃣ Database and Table Basics**

**Create DB**

```sql
CREATE DATABASE db_name;
\c db_name; -- connect
```

💡 *Tip to remember:* “`CREATE` creates, `\c` connects.”

**Create Table**

```sql
CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50),
  age INT,
  grade CHAR(1) CHECK (grade IN ('A','B','C','D','F'))
);
```

* Keywords: `CREATE`, `TABLE`, `PRIMARY KEY`, `CHECK`, `SERIAL`, `VARCHAR`, `INT`

**Drop / Rename Table**

```sql
DROP TABLE table_name;
ALTER TABLE table_name RENAME TO new_name;
```

---

## **2️⃣ Insert, Update, Delete**

**Insert Single / Multiple Rows**

```sql
INSERT INTO students(name, age, grade)
VALUES ('Nikita', 20, 'A'),
       ('Karan', 18, 'B');
```

**Upsert (Insert or Update)**

```sql
INSERT INTO subjects(name)
VALUES ('Math')
ON CONFLICT(name) DO UPDATE SET name = EXCLUDED.name;
```

* Keywords: `INSERT`, `VALUES`, `ON CONFLICT`, `EXCLUDED`

**Update**

```sql
UPDATE students SET age = age + 1 WHERE grade = 'A';
```

**Delete**

```sql
DELETE FROM students WHERE age < 18;
```

💡 *Tip:* Think: **Insert adds, Update changes, Delete removes** → CRUD.

---

## **3️⃣ Select Queries (Basic + Advanced)**

**Select All / Specific Columns**

```sql
SELECT * FROM students;
SELECT name, grade FROM students;
```

**Filtering**

```sql
SELECT * FROM students WHERE age > 18 AND grade = 'A';
SELECT * FROM students WHERE grade IN ('A','B');
SELECT * FROM students WHERE name LIKE 'N%';
```

* Keywords: `SELECT`, `FROM`, `WHERE`, `AND`, `OR`, `IN`, `LIKE`

**Sorting / Limiting**

```sql
SELECT * FROM students ORDER BY age DESC LIMIT 3 OFFSET 1;
```

* Keywords: `ORDER BY`, `LIMIT`, `OFFSET`

**Aggregate Functions**

```sql
SELECT COUNT(*) FROM students;
SELECT AVG(age) FROM students;
SELECT MAX(age), MIN(age) FROM students;
```

* Keywords: `COUNT`, `SUM`, `AVG`, `MAX`, `MIN`, `GROUP BY`, `HAVING`

---

## **4️⃣ Joins (Most Interview-Tricky)**

**INNER JOIN** (common rows)

```sql
SELECT s.name, sub.subject_name
FROM students s
JOIN student_subjects ss ON s.id = ss.student_id
JOIN subjects sub ON ss.subject_id = sub.id;
```

**LEFT JOIN** (all left table rows)

```sql
SELECT s.name, sub.subject_name
FROM students s
LEFT JOIN student_subjects ss ON s.id = ss.student_id
LEFT JOIN subjects sub ON ss.subject_id = sub.id;
```

**RIGHT JOIN** (all right table rows)
**FULL OUTER JOIN** (all rows from both tables)

💡 *Tip:* Remember:

* **INNER** = common
* **LEFT** = keep all from left
* **RIGHT** = keep all from right
* **FULL** = keep everything

---

## **5️⃣ Transactions (Atomicity / Tough Interview Topic)**

```sql
BEGIN; -- start transaction
UPDATE students SET age = age + 1 WHERE id = 1;
INSERT INTO student_subjects(student_id, subject_id, marks) VALUES (1, 3, 95);
COMMIT; -- save
ROLLBACK; -- undo if error
```

* Keywords: `BEGIN`, `COMMIT`, `ROLLBACK`
* Memory hook: **“Begin → do stuff → commit to save / rollback to cancel”**

---

## **6️⃣ JSONB Storage (Postgres Unique Feature)**

```sql
ALTER TABLE students ADD COLUMN profile JSONB;

UPDATE students SET profile = '{"hobbies":["reading","chess"], "city":"Delhi"}' WHERE id = 1;
/* 
This code snippet is using the JSONB data type in PostgreSQL to query data from a table named 'students'. 

The '->>' operator is used to get a text representation of a JSONB value. In this case, it is used to get the value of the 'city' key from the 'profile' JSONB object.

The result of this query will be a list of names and cities of students who have 'Delhi' as their city in their profile JSONB object.

The '->>' operator is used to access JSONB values in PostgreSQL. It is used to get a text representation of a JSONB value, which can then be used in queries. */

SELECT name FROM students WHERE profile->'hobbies' ? 'chess';
```

* Keywords: `JSONB`, `->`, `->>`, `?`
* Tip: `->` returns JSON object, `->>` returns text
* `?` checks if key/array exists

---

## **7️⃣ Complex Queries / CTEs / Window Functions**

**Common Table Expressions (CTE)**

```sql
WITH student_avg AS (
    SELECT student_id, AVG(marks) AS avg_marks
    FROM student_subjects
    GROUP BY student_id
)
SELECT s.name, sa.avg_marks
FROM students s
JOIN student_avg sa ON s.id = sa.student_id
WHERE sa.avg_marks > 80;
```

**Window Functions / Ranking**

/*
 * RANK() OVER() is a window function that assigns a rank to each row within a result set.
 * The rank is based on the ORDER BY clause specified in the OVER() clause.
 * In this case, the rank is based on the SUM of marks in descending order.
 * So, the student with the highest total marks will have a rank of 1, the student with the second highest total marks will have a rank of 2, and so on.
 */
```sql
SELECT s.name, SUM(ss.marks) AS total_marks,
       RANK() OVER(ORDER BY SUM(ss.marks) DESC) AS rank
FROM student_subjects ss
JOIN students s ON ss.student_id = s.id
GROUP BY s.name;
```
/*
 * WITH clause is used to create temporary result sets that are defined within the execution of a single SELECT, INSERT, UPDATE, or DELETE statement.
 * The temporary result set is referred to by a name specified in the WITH clause.
 * The WITH clause is used to break down complex queries into simpler forms.
 *
 * Example:
 * WITH student_avg AS (
 *   SELECT student_id, AVG(marks) AS avg_marks
 *   FROM student_subjects
 *   GROUP BY student_id
 * )
 * SELECT s.name, sa.avg_marks
 * FROM students s
 * JOIN student_avg sa ON s.id = sa.student_id
 * WHERE sa.avg_marks > 80;
 *
 * OVER clause is used to define a window over which a function is applied.
 * The function is applied to all the rows that fall within the window frame.
 * The window frame is defined using the ROWS or RANGE clause of the OVER() function.
 *
 * Example:
 * SELECT s.name, SUM(ss.marks) AS total_marks,
 *        RANK() OVER(ORDER BY SUM(ss.marks) DESC) AS rank
 * FROM student_subjects ss
 * JOIN students s ON ss.student_id = s.id
 * GROUP BY s.name;
 *
 * RANK() function assigns a rank to each row within a result set.
 * The rank is based on the ORDER BY clause specified in the OVER() clause.
 *
 * Example:
 * SELECT s.name, SUM(ss.marks) AS total_marks,
 *        RANK() OVER(ORDER BY SUM(ss.marks) DESC) AS rank
 * FROM student_subjects ss
 * JOIN students s ON ss.student_id = s.id
 * GROUP BY s.name;
 *
 * SUM() function returns the total sum of a set of values.
 *
 * Example:
 * SELECT SUM(marks) AS total_marks
 * FROM student_subjects;
 *
 * GROUP BY clause is used to group the result set of a query based on one or more columns.
 *
 * Example:
 * SELECT student_id, AVG(marks) AS avg_marks
 * FROM student_subjects
 * GROUP BY student_id;

💡 Tip: CTEs are “temporary result sets” → make complex queries readable.

---

## **8️⃣ Indexing & Performance**

```sql
CREATE INDEX idx_grade ON students(grade);
CREATE INDEX idx_marks ON student_subjects(marks);
```

* Keywords: `CREATE INDEX`
* Memory hook: “Index = speed boost”

---

## **9️⃣ MVCC (High Concurrency)**

PostgreSQL automatically uses **Multi-Version Concurrency Control**:

```sql
-- Transaction 1
BEGIN;
UPDATE students SET age = age + 1 WHERE id = 1;

-- Transaction 2 (reads old value)
SELECT age FROM students WHERE id = 1;

-- Transaction 1 COMMIT;
```

* Tip: **Readers don’t block writers**, and vice versa.
* Keywords: `BEGIN`, `COMMIT`, `ROLLBACK` (used with MVCC)

---

## **🔟 Trick / Tough Interview Questions**

1. **Upsert multiple columns**

```sql
INSERT INTO students(id, name) VALUES (1, 'Nikita')
ON CONFLICT(id) DO UPDATE SET name = EXCLUDED.name, age = EXCLUDED.age;
```

2. **Recursive CTE (hierarchy / reporting)**

```sql
WITH RECURSIVE emp_hierarchy AS (
    SELECT id, name, manager_id FROM employees WHERE manager_id IS NULL
    UNION ALL
    SELECT e.id, e.name, e.manager_id
    FROM employees e
    JOIN emp_hierarchy eh ON e.manager_id = eh.id
)
SELECT * FROM emp_hierarchy;
```

3. **JSONB array aggregation**

```sql
SELECT jsonb_agg(subject_id) FROM student_subjects WHERE student_id = 1;
```

---

## **💡 Memory Tips to Remember Queries**

* **CRUD first** → Insert / Select / Update / Delete
* **Joins second** → Inner / Left / Right / Full
* **Aggregates** → COUNT, SUM, AVG, MIN, MAX
* **Window / Ranking / CTE** → Advanced but logical
* **Transactions** → Begin → do → commit/rollback
* **JSONB** → `->` = object, `->>` = text, `?` = exists
* **Indexes** → always after table creation
* **MVCC** → default behavior → focus on explanation, not query

---

If you want, I can **make a single “interview-ready visual flow chart”** of **all PostgreSQL queries + keywords** in one image — so you can **recall all queries in order** in 30 seconds.

Do you want me to do that?


Perfect! Let’s make this **super concise, structured, and interview-friendly**, covering all the PostgreSQL commands and clauses you mentioned — grouped logically, with **short explanations** and **tough examples** where necessary. I’ll also include **keywords for querying and filtering**, **data types**, and **table/database management**.

---

# **📌 PostgreSQL Cheat Sheet — All in One**

---

## **1️⃣ Joins**

| Join Type       | Description                       | Example                                        |
| --------------- | --------------------------------- | ---------------------------------------------- |
| INNER JOIN      | Only matching rows                | `SELECT * FROM a INNER JOIN b ON a.id=b.a_id;` |
| LEFT JOIN       | All left rows, matched right rows | `SELECT * FROM a LEFT JOIN b ON a.id=b.a_id;`  |
| RIGHT JOIN      | All right rows, matched left rows | `SELECT * FROM a RIGHT JOIN b ON a.id=b.a_id;` |
| FULL OUTER JOIN | All rows from both tables         | `SELECT * FROM a FULL JOIN b ON a.id=b.a_id;`  |

---

## **2️⃣ Database Management**

| Command         | Description        | Example                                                |
| --------------- | ------------------ | ------------------------------------------------------ |
| CREATE DATABASE | Create DB          | `CREATE DATABASE schoolDB;`                            |
| ALTER DATABASE  | Modify DB settings | `ALTER DATABASE schoolDB OWNER TO new_owner;`          |
| DROP DATABASE   | Delete DB          | `DROP DATABASE schoolDB;`                              |
| RENAME DATABASE | Rename DB          | `ALTER DATABASE schoolDB RENAME TO newDB;`             |
| COPY DATABASE   | Duplicate DB       | `CREATE DATABASE newDB WITH TEMPLATE oldDB;`           |
| DB Size         | Check DB size      | `SELECT pg_size_pretty(pg_database_size('schoolDB'));` |

---

## **3️⃣ Data Types (Grouped for Memory)**

**Numeric**: `INT, BIGINT, SMALLINT, DECIMAL, NUMERIC, REAL, DOUBLE PRECISION, SERIAL`
**Character**: `CHAR(n), VARCHAR(n), TEXT`
**Date/Time**: `DATE, TIME, TIMESTAMP, TIMESTAMPTZ, INTERVAL`
**Boolean**: `BOOLEAN`
**UUID / Binary**: `UUID, BYTEA`
**JSON / JSONB**: `JSON, JSONB`
**Enum / Custom**: `CREATE TYPE grade_enum AS ENUM ('A','B','C');`

---

## **4️⃣ Querying & Filtering Keywords (One-liner)**

`SELECT, SELECT DISTINCT, WHERE, ORDER BY, LIMIT, FETCH, IN, IS NULL, LIKE, NOT LIKE, BETWEEN, GROUP BY, HAVING`

---

### **Examples of Tough Queries**

```sql
-- Select distinct students in A grade older than 18
SELECT DISTINCT name
FROM students
WHERE grade='A' AND age>18
ORDER BY age DESC
LIMIT 5;

-- Fetch next 5 rows
SELECT * FROM students
ORDER BY age
OFFSET 5
FETCH NEXT 5 ROWS ONLY;

-- Using IN
SELECT name FROM students WHERE grade IN ('A','B');

-- NULL check
SELECT * FROM students WHERE age IS NULL;

-- Pattern matching
SELECT * FROM students WHERE name LIKE 'N%' AND name NOT LIKE '%t';

-- Between example
SELECT * FROM students WHERE age BETWEEN 18 AND 25;

-- Grouping and HAVING
SELECT grade, AVG(age) AS avg_age
FROM students
GROUP BY grade
HAVING AVG(age) > 20;
```

---

## **5️⃣ Table Management**

| Command            | Description                 | Example                                                            |
| ------------------ | --------------------------- | ------------------------------------------------------------------ |
| CREATE TABLE       | Create table                | `CREATE TABLE students (id SERIAL PRIMARY KEY, name VARCHAR(50));` |
| SELECT INTO        | Copy table structure + data | `SELECT * INTO students_copy FROM students;`                       |
| SERIAL / Identity  | Auto-increment              | `id SERIAL PRIMARY KEY` or `id INT GENERATED ALWAYS AS IDENTITY`   |
| CREATE SEQUENCE    | Custom sequence             | `CREATE SEQUENCE student_seq START 1;`                             |
| ALTER TABLE        | Modify table                | `ALTER TABLE students ADD COLUMN age INT;`                         |
| RENAME TABLE       | Rename table                | `ALTER TABLE students RENAME TO learners;`                         |
| ADD COLUMN         | Add column                  | `ALTER TABLE students ADD COLUMN grade CHAR(1);`                   |
| DROP COLUMN        | Remove column               | `ALTER TABLE students DROP COLUMN age;`                            |
| CHANGE COLUMN TYPE | Modify type                 | `ALTER TABLE students ALTER COLUMN age TYPE SMALLINT;`             |
| RENAME COLUMN      | Rename column               | `ALTER TABLE students RENAME COLUMN name TO full_name;`            |
| DROP TABLE         | Delete table                | `DROP TABLE students;`                                             |
| TRUNCATE TABLE     | Remove all rows             | `TRUNCATE TABLE students;`                                         |

---

## **6️⃣ Temporary Tables**
// Temporary tables are tables that exist for the duration of a session
// and are automatically dropped at the end of the session. They are
// useful for storing intermediate results in a complex query or for
// storing data temporarily while performing a complex operation.
// Temporary tables are stored in the pg_temp schema and are
// accessible only by the session that created them.

```sql
-- Create temporary table
CREATE TEMP TABLE temp_students (id SERIAL, name VARCHAR(50));

-- Temporary table specific name
SELECT * FROM pg_temp.temp_students;

-- Remove temporary table
DROP TABLE pg_temp.temp_students;
```

---

## **7️⃣ Copying & Comparing Tables**

```sql
-- Copy table
CREATE TABLE students_copy AS TABLE students;

-- Compare two tables
SELECT * FROM students EXCEPT SELECT * FROM students_copy;
```

---

## **8️⃣ Describe Table / Show Tables**

```sql
-- Describe table
\d students
-- List all tables
\dt
```

---

## **9️⃣ Import CSV into Table**

```sql
COPY students(name, age, grade)
FROM '/path/to/students.csv'
DELIMITER ','
CSV HEADER;
```

* Keywords: `COPY`, `FROM`, `DELIMITER`, `CSV HEADER`

---

# **Memory Tips**

1. **Joins:** Inner = common, Left = all left, Right = all right, Full = all rows
2. **CRUD:** Create, Select, Update, Delete → think order
3. **Query filters:** WHERE, IN, LIKE, BETWEEN, IS NULL, HAVING → conditions
4. **Sorting / limiting:** ORDER BY → LIMIT / OFFSET → FETCH
5. **Tables:** CREATE → ALTER → DROP → TRUNCATE → TEMPORARY
6. **Auto-increment:** SERIAL or GENERATED AS IDENTITY
7. **Data types:** Group as numeric / char / date / boolean / json / uuid / enum

---

I can also **make a single “visual mind map / flow chart”** with **all these commands grouped by Database → Table → Query → Joins → Filters → Advanced**.

This helps you **recall everything in one glance during interviews**.

Do you want me to make that visual map?

Perfect! Let’s do a **deep dive into modifying data and control flow in PostgreSQL**, covering **everything from basic INSERT/UPDATE to conditional logic, loops, and flow control** — with **examples, tough scenarios, and explanations** so it’s interview-ready.

---

# **1️⃣ Modifying Data — DML (INSERT, UPDATE, DELETE, UPSERT)**

---

### **1. INSERT**

**Single row:**

```sql
INSERT INTO students(name, age, grade)
VALUES ('Nikita', 20, 'A');
```

**Insert multiple rows:**

```sql
INSERT INTO students(name, age, grade)
VALUES
('Karan', 18, 'B'),
('Sumit', 22, 'C'),
('Ramesh', 19, 'A');
```

✅ **Tip:** Use `RETURNING *` to get inserted rows:

```sql
INSERT INTO students(name, age, grade)
VALUES ('Suresh', 23, 'B')
RETURNING student_id, name;
```

---

### **2. UPDATE**

```sql
UPDATE students
SET grade = 'A+'
WHERE age > 20;
```

**Tough scenario: Update based on another table (subquery):**

```sql
UPDATE students s
SET grade = 'A+'
WHERE s.student_id IN (
    SELECT student_id
    FROM student_subjects
    GROUP BY student_id
    HAVING AVG(marks) > 85
);
```

---

### **3. DELETE**

```sql
DELETE FROM students
WHERE grade = 'F';
```

**Tough scenario: Delete rows based on join**

```sql
DELETE FROM students s
USING student_subjects ss
WHERE s.student_id = ss.student_id AND ss.marks < 30;
```

---

### **4. UPSERT (INSERT ON CONFLICT)**

```sql
INSERT INTO students(student_id, name, grade)
VALUES (1, 'Nikita', 'A')
ON CONFLICT(student_id)
DO UPDATE SET name = EXCLUDED.name, grade = EXCLUDED.grade;
```

* **EXCLUDED** = values from the insert attempt
* **Tip:** Always define a **unique key or primary key** for upsert to work.

---

### **5. Conditionals — CASE Statement**

**Inline conditional in SELECT**

```sql
SELECT name, age,
CASE 
    WHEN age < 18 THEN 'Minor'
    WHEN age BETWEEN 18 AND 25 THEN 'Youth'
    ELSE 'Adult'
END AS age_group
FROM students;
```

**Update using CASE**

```sql
UPDATE students
SET grade = CASE
    WHEN age < 18 THEN 'C'
    WHEN age BETWEEN 18 AND 22 THEN 'B'
    ELSE 'A'
END;
```

---
/**
 * COALESCE returns the first non-NULL value from the list of arguments.
 * Useful for combining multiple optional columns into one.
 *
 * Example output:
 * SELECT COALESCE(phone, email, 'N/A') AS contact
 * FROM students;
 * Output: '1234567890' (if phone is not null), 'nikita@example.com' (if phone is null but email is not null), 'N/A' (if both phone and email are null)
 */

Returns the first **non-NULL** value:

```sql
SELECT name, COALESCE(age, 0) AS age
FROM students;
```

* **Tough use case:** Combine multiple optional columns:

```sql
SELECT name, COALESCE(phone, email, 'N/A') AS contact
FROM students;
```

---

### **7. NULLIF**

Returns NULL if the two values are equal:

```sql
SELECT name, NULLIF(grade, 'F') AS grade
FROM students;
```

* **Tough use:** Avoid division by zero

```sql
SELECT marks / NULLIF(total_marks, 0) AS percentage
FROM student_subjects;
```

---

### **8. CAST**

Change data type:

```sql
SELECT name, age::TEXT AS age_text
FROM students;

-- Tough scenario: String to numeric
SELECT CAST('123.45' AS NUMERIC);
```

---

# **2️⃣ Control Flow — IF, CASE, Loops**

---

### **1. IF Statement (PL/pgSQL)**

```plpgsql
DO $$
BEGIN
    IF EXISTS(SELECT 1 FROM students WHERE grade='A') THEN
        RAISE NOTICE 'There are students with grade A';
    ELSE
        RAISE NOTICE 'No grade A students';
    END IF;
END
$$;
```

---

### **2. CASE Statement**

Used inline in **queries**:

```sql
SELECT name,
CASE 
    WHEN age < 18 THEN 'Minor'
    WHEN age BETWEEN 18 AND 25 THEN 'Youth'
    ELSE 'Adult'
END AS age_group
FROM students;
```

* **Tip:** Use in `SELECT`, `UPDATE`, or `ORDER BY`.

---

### **3. LOOP Statement**

```plpgsql
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT * FROM students LOOP
        RAISE NOTICE 'Student: %, Age: %', r.name, r.age;
    END LOOP;
END
$$;
```

---

### **4. WHILE Loop**

```plpgsql
DO $$
DECLARE
    counter INT := 1;
BEGIN
    WHILE counter <= 5 LOOP
        RAISE NOTICE 'Counter: %', counter;
        counter := counter + 1;
    END LOOP;
END
$$;
```

---

### **5. FOR Loops**

**Loop through range:**

```plpgsql
DO $$
BEGIN
    FOR i IN 1..5 LOOP
        RAISE NOTICE 'Iteration %', i;
    END LOOP;
END
$$;
```

**Loop through query results:**

```plpgsql
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN SELECT * FROM students LOOP
        RAISE NOTICE 'Student: %', rec.name;
    END LOOP;
END
$$;
```

---

### **6. EXIT and CONTINUE**

```plpgsql
DO $$
DECLARE
    i INT := 0;
BEGIN
    FOR i IN 1..10 LOOP
        IF i = 5 THEN
            CONTINUE; -- skip 5
        ELSIF i = 8 THEN
            EXIT; -- stop loop at 8
        END IF;
        RAISE NOTICE 'i = %', i;
    END LOOP;
END
$$;
```

* **Output:** 1,2,3,4,6,7
* **Tip:** EXIT = stop loop; CONTINUE = skip iteration

---

# **3️⃣ Tough Interview Scenarios / Questions**

1. **Update based on conditional aggregate**

```sql
UPDATE students
SET grade = CASE 
    WHEN student_id IN (SELECT student_id FROM student_subjects GROUP BY student_id HAVING AVG(marks) > 85)
    THEN 'A+'
    ELSE grade
END;
```

2. **Loop through table, calculate bonus marks, skip failing students**

```plpgsql
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT * FROM student_subjects LOOP
        IF r.marks < 40 THEN
            CONTINUE; -- skip failing students
        END IF;
        UPDATE student_subjects
        SET marks = marks + 5
        WHERE student_id = r.student_id AND subject_id = r.subject_id;
    END LOOP;
END
$$;
```

3. **Use COALESCE + CASE together**

```sql
SELECT name,
COALESCE(
    CASE WHEN age < 18 THEN 'Minor'
         WHEN age BETWEEN 18 AND 25 THEN 'Youth'
         ELSE 'Adult' END,
    'Unknown') AS age_group
FROM students;
```

4. **Prevent division by zero using NULLIF**

```sql
SELECT student_id, marks / NULLIF(total_marks, 0) AS percentage
FROM student_subjects;
```

---

# **Memory Tips for Interviews**

* **DML:** INSERT, UPDATE, DELETE, UPSERT → think CRUD
* **Conditionals:** CASE = inline, IF = procedural
* **Null Handling:** COALESCE = default, NULLIF = avoid division by zero
* **Control Flow:** LOOP / FOR / WHILE → use EXIT / CONTINUE to control flow
* **Casting:** `::` or CAST()
* **Tough pattern:** Combine loops + conditionals + null handling → often interview favorite

---

If you want, I can **make a “single-page PostgreSQL procedural & DML cheat sheet”** that has **all INSERT/UPDATE/DELETE + CASE + COALESCE + LOOP + IF + EXIT + CONTINUE** with **ready-to-use tough examples**, perfect for interviews.

Do you want me to make that?



Perfect 💪
Now let’s cover **PostgreSQL Transactions, Constraints, Joins, and Schemas** —
everything you must know for **interviews + real projects**, explained **logically, deeply, and with examples** (and tricks to remember).

---

# 🧱 **1️⃣ Transactions in PostgreSQL**

### 💡 What is a Transaction?

A **Transaction** = a group of SQL operations executed as one logical unit.
It follows the **ACID** properties:

* **A**tomicity – All or none executed
* **C**onsistency – Keeps data valid
* **I**solation – Multiple transactions don’t clash
* **D**urability – Once committed, data stays even after crash

---

### **Basic Transaction Syntax**

```sql
BEGIN;  -- start transaction

UPDATE accounts SET balance = balance - 500 WHERE id = 1;
UPDATE accounts SET balance = balance + 500 WHERE id = 2;

COMMIT;  -- make permanent
```

✅ Both statements succeed → changes saved.
❌ Any error → `ROLLBACK` undoes all.

---

### **ROLLBACK Example**

```sql
BEGIN;

UPDATE accounts SET balance = balance - 1000 WHERE id = 1;
UPDATE accounts SET balance = balance + 1000 WHERE id = 99;  -- invalid user

ROLLBACK;  -- cancels everything
```

💡 Always use transactions in **banking, order, or payment flows** to maintain consistency.

---

### **SAVEPOINT (Partial Rollback)**

```sql
BEGIN;
UPDATE students SET grade='B' WHERE id=1;
SAVEPOINT s1;

UPDATE students SET grade='Z' WHERE id=2;  -- invalid
ROLLBACK TO s1;   -- undo from here, not full

COMMIT;
```

---

### 🧠 **Remember Shortcut:**

* `BEGIN` → start
* `COMMIT` → save
* `ROLLBACK` → cancel
* `SAVEPOINT` → partial undo

---

# 🧩 **2️⃣ Constraints (Data Integrity Rules)**

Constraints = rules to maintain data accuracy.

---

### **1. PRIMARY KEY**

→ Uniquely identifies each record.
Automatically **NOT NULL + UNIQUE**.

```sql
CREATE TABLE students (
    student_id SERIAL PRIMARY KEY,
    name VARCHAR(50),
    age INT
);
```

---

### **2. FOREIGN KEY**

→ Links two tables.
Ensures child rows refer to valid parent rows.

```sql
CREATE TABLE student_subjects (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(student_id),
    subject_id INT,
    marks INT
);
```

**ON DELETE / ON UPDATE actions:**

```sql
FOREIGN KEY (student_id)
REFERENCES students(student_id)
ON DELETE CASCADE
ON UPDATE CASCADE;
```

🧠 Tip:

* `CASCADE` = delete/update child when parent changes
* `SET NULL` = nullify foreign key
* `RESTRICT` = prevent delete/update

---

### **3. UNIQUE**

→ Prevents duplicate values in a column.

```sql
ALTER TABLE students
ADD CONSTRAINT unique_name UNIQUE (name);
```

---

### **4. CHECK**

→ Validates a condition before inserting/updating.

```sql
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    salary NUMERIC CHECK (salary > 0 AND salary < 100000)
);
```

**Tough example:**

```sql
ALTER TABLE students
ADD CONSTRAINT grade_check CHECK (grade IN ('A','B','C','D'));
```

---

### **5. NOT NULL**

→ Ensures a column must have a value.

```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_date DATE NOT NULL
);
```

---

### 🧠 **Constraint Summary Table**

| Constraint  | Ensures               | Example                 |
| ----------- | --------------------- | ----------------------- |
| PRIMARY KEY | Uniqueness + Not null | `PRIMARY KEY(id)`       |
| FOREIGN KEY | Referential integrity | `REFERENCES parent(id)` |
| UNIQUE      | No duplicates         | `UNIQUE(name)`          |
| CHECK       | Custom condition      | `CHECK (age > 18)`      |
| NOT NULL    | Must have value       | `NOT NULL`              |

---

# 🔗 **3️⃣ Joins (Combining Data)**

Joins combine rows from multiple tables using a related column.

---

### **1. INNER JOIN**

→ Only matching rows from both tables.

```sql
SELECT s.name, ss.marks
FROM students s
INNER JOIN student_subjects ss
ON s.student_id = ss.student_id;
```

📘 Result: Students who have subject entries.

---

### **2. LEFT JOIN**

→ All rows from left table + matched right table.

```sql
SELECT s.name, ss.marks
FROM students s
LEFT JOIN student_subjects ss
ON s.student_id = ss.student_id;
```

📘 Result: All students, even those without marks (NULLs for missing).

---

### **3. RIGHT JOIN**

→ All rows from right table + matched left.

```sql
SELECT s.name, ss.marks
FROM students s
RIGHT JOIN student_subjects ss
ON s.student_id = ss.student_id;
```

---

### **4. FULL OUTER JOIN**

→ All rows from both tables (matched + unmatched).

```sql
SELECT s.name, ss.marks
FROM students s
FULL OUTER JOIN student_subjects ss
ON s.student_id = ss.student_id;
```

📘 NULL where there’s no match on either side.

---

### **5. SELF JOIN**

→ Join table with itself (useful for hierarchical data).

```sql
SELECT e1.name AS employee, e2.name AS manager
FROM employees e1
JOIN employees e2
ON e1.manager_id = e2.id;
```

📘 Example: Employee-manager relationships.

---

### 🧠 **Join Memory Trick:**

| Join  | Keeps                    |
| ----- | ------------------------ |
| INNER | Common only              |
| LEFT  | All Left + matched Right |
| RIGHT | All Right + matched Left |
| FULL  | All records from both    |
| SELF  | Same table twice         |

---

# 🗂️ **4️⃣ Schemas**

Schemas = **namespaces / logical containers** for tables, views, and functions.
Default schema = `public`.

---

### **CREATE SCHEMA**

```sql
CREATE SCHEMA school AUTHORIZATION postgres;
```

Now create table inside schema:

```sql
CREATE TABLE school.students (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50)
);
```

---

### **Accessing Schema Objects**

```sql
SELECT * FROM school.students;
```

---

### **ALTER SCHEMA**

Rename or change owner.

```sql
ALTER SCHEMA school RENAME TO college;
ALTER SCHEMA college OWNER TO karan;
```

---

### **DROP SCHEMA**

```sql
DROP SCHEMA school CASCADE;
```

* `CASCADE` removes all objects inside.
* `RESTRICT` prevents drop if not empty.

---

### 🧠 **Schema Quick Facts**

| Operation     | Meaning                  |
| ------------- | ------------------------ |
| CREATE SCHEMA | New namespace            |
| DROP SCHEMA   | Delete schema            |
| ALTER SCHEMA  | Rename or reassign owner |
| public schema | Default                  |
| Access object | `schema.table_name`      |

---

# ⚙️ **5️⃣ Advanced: Combining Transactions + Constraints + Joins**

### ✅ Example: Safe student data update

```sql
BEGIN;

UPDATE student_subjects ss
SET marks = marks + 5
FROM students s
WHERE ss.student_id = s.student_id
AND s.grade = 'A';

COMMIT;
```

### ❌ Error Handling with Rollback

```sql
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 99; -- invalid
ROLLBACK;
```

---

# 🧩 **6️⃣ Interview-Favorite Questions**

✅ **Q1:** Difference between `ROLLBACK` and `ROLLBACK TO SAVEPOINT`
→ `ROLLBACK` undoes whole transaction; `ROLLBACK TO SAVEPOINT` undoes from that point onward.

✅ **Q2:** What happens if you forget `COMMIT`?
→ Changes stay in memory until session ends → then automatically rolled back.

✅ **Q3:** Can a table have multiple unique constraints?
→ Yes. But only **one primary key**.

✅ **Q4:** How to enforce both `NOT NULL` and `UNIQUE`?
→ Just use PRIMARY KEY or combine both manually.

✅ **Q5:** What is difference between schema and database?
→ Database = whole container; Schema = section inside it (like folders inside a drive).

✅ **Q6:** Can you join more than 2 tables?
→ Yes, chain joins using multiple `JOIN` clauses.

✅ **Q7:** What is CASCADE in schema/foreign keys?
→ Automatically apply delete/update changes to dependent rows or objects.

---

# 🧠 **Memory Summary**

| Category    | Key Commands                              | Remember Tip              |
| ----------- | ----------------------------------------- | ------------------------- |
| Transaction | BEGIN / COMMIT / ROLLBACK / SAVEPOINT     | Think "start-save-cancel" |
| Constraints | PRIMARY, FOREIGN, UNIQUE, CHECK, NOT NULL | Data safety               |
| Joins       | INNER, LEFT, RIGHT, FULL, SELF            | Which side keeps all rows |
| Schema      | CREATE, ALTER, DROP                       | Namespace system          |

---

If you want, I can now create the **final PostgreSQL "Master Sheet"** (Transactions + Constraints + Joins + Schema + DML + Control Flow)
→ all on **one printable PDF cheat sheet** — perfect for quick revision before interviews.

Do you want me to generate that next?



Bhai perfect 🔥 — ab main **Roles & Permissions + Working with Sets** ke sab kuch ekdum **interview-level + memory-friendly + example-based** tareeke se samjhaata hoon.
Aise likha hai ki **yaad bhi rahe, confuse bhi na ho**, aur **tough questions** handle kar sake.

---

## 🧩 1️⃣ ROLES & PERMISSIONS — Security & Access Control in SQL (PostgreSQL)

Roles ≈ Users or Groups
They control **who can access**, **what they can do**, and **on which objects** (tables, DBs, etc).

---

### 🧱 CREATE ROLE

Creates a **new role (user or group)**.

```sql
CREATE ROLE sales_user LOGIN PASSWORD 'sales@123';
```

🔹 `LOGIN` → means this role can log in (like a user).
🔹 Without LOGIN → acts as a **group role** (used only for granting permissions).

**Example 2:**

```sql
CREATE ROLE analyst;
-- analyst = group role (cannot login)
```

---

### 🧩 ALTER ROLE

Used to modify a role’s attributes.

```sql
ALTER ROLE sales_user WITH SUPERUSER;
ALTER ROLE sales_user PASSWORD 'newpass';
ALTER ROLE sales_user NOLOGIN;
```

👉 Common attributes:

* `SUPERUSER` → full access
* `CREATEDB` → can create databases
* `CREATEROLE` → can create roles
* `INHERIT` → inherit privileges
* `LOGIN` → can log in

---

### ❌ DROP ROLE

Delete a role (must not own any objects or sessions).

```sql
DROP ROLE sales_user;
```

---

### 🎁 GRANT (Permissions)

Used to **give access rights** on DB objects or assign a role.

```sql
GRANT SELECT, INSERT ON employees TO sales_user;
GRANT ALL PRIVILEGES ON DATABASE company TO admin;
```

---

### 🚫 REVOKE (Remove Access)

Take back privileges.

```sql
REVOKE INSERT ON employees FROM sales_user;
```

---

### 👥 ROLE MEMBERSHIP (Like Group Permission)

You can assign a **group role** to multiple users:

```sql
CREATE ROLE analysts;
CREATE ROLE analyst1 LOGIN PASSWORD '123';
CREATE ROLE analyst2 LOGIN PASSWORD '456';

GRANT analysts TO analyst1;
GRANT analysts TO analyst2;
```

➡️ Now any privilege given to `analysts` is automatically inherited by both users.

---

### 🧠 Interview Tip:

| Concept         | Question Example                       | Trick                                            |
| --------------- | -------------------------------------- | ------------------------------------------------ |
| Role vs User    | “What’s the diff?”                     | Every login user is a role with LOGIN privilege. |
| GRANT vs REVOKE | “How to restrict access?”              | Use REVOKE to undo GRANT.                        |
| Group Role      | “How to manage multiple users easily?” | Use Role membership.                             |

---

## 🔥 2️⃣ WORKING WITH SETS — Combining Query Results

These operators work **on result sets (rows)** of two or more queries.

---

### ⚙️ UNION

Combines results from multiple SELECT queries
✅ Removes duplicates by default.

```sql
SELECT name FROM students
UNION
SELECT name FROM teachers;
```

➡️ Both queries must have **same number of columns + compatible data types**.

🧠 **Trick:**
`UNION ALL` → Keeps duplicates (faster).

```sql
SELECT name FROM students
UNION ALL
SELECT name FROM teachers;
```

---

### ⚔️ INTERSECT

Returns **common rows** between queries.

```sql
SELECT name FROM students
INTERSECT
SELECT name FROM alumni;
```

➡️ Output = names that exist in both tables.

---

### 🚫 EXCEPT

Returns rows from the **first query** that are **not in the second**.

```sql
SELECT name FROM students
EXCEPT
SELECT name FROM alumni;
```

➡️ Output = current students who are not alumni.

---

### 📊 GROUPING SETS

Used for **multiple GROUP BY combinations** in one query (super powerful).

```sql
SELECT region, product, SUM(sales)
FROM sales_data
GROUP BY GROUPING SETS (
  (region, product),
  (region),
  (product),
  ()
);
```

➡️ It creates multiple groupings in a single query —
like:

* Region + Product total
* Region total
* Product total
* Grand total

---

### 🧮 CUBE

Generates **all possible combinations** of grouping columns.

```sql
SELECT region, product, SUM(sales)
FROM sales_data
GROUP BY CUBE (region, product);
```

➡️ Equivalent to all grouping sets combinations:
(region, product), (region), (product), ()

💡 *Used in OLAP / BI reports.*

---

### 🧱 ROLLUP

Like CUBE, but **hierarchical** — generates subtotals along a hierarchy.

```sql
SELECT region, product, SUM(sales)
FROM sales_data
GROUP BY ROLLUP (region, product);
```

➡️ Gives:

1. region + product totals
2. region subtotal
3. grand total

🧠 Think: “Roll up → roll up the hierarchy to totals.”

---

### ⚡ Summary Table

| Operator        | Purpose                           | Removes Duplicates | Example Output       |
| --------------- | --------------------------------- | ------------------ | -------------------- |
| `UNION`         | Combines all unique rows          | ✅ Yes              | A ∪ B                |
| `UNION ALL`     | Combines all rows                 | ❌ No               | A + B                |
| `INTERSECT`     | Common rows                       | ✅ Yes              | A ∩ B                |
| `EXCEPT`        | Rows in A not in B                | ✅ Yes              | A − B                |
| `GROUPING SETS` | Custom grouping combinations      | —                  | Region, Product, All |
| `CUBE`          | All combinations of group columns | —                  | (R,P), (R), (P), ()  |
| `ROLLUP`        | Hierarchical subtotals            | —                  | (R,P), (R), ()       |

---

### ⚙️ Practice Question (Interview Level)

1. **Find all students who are not in alumni list:**

   ```sql
   SELECT name FROM students
   EXCEPT
   SELECT name FROM alumni;
   ```

2. **Show total sales by region, product, and overall using one query:**

   ```sql
   SELECT region, product, SUM(sales)
   FROM sales_data
   GROUP BY ROLLUP (region, product);
   ```

3. **Show all common employees between HR and Finance:**

   ```sql
   SELECT emp_id FROM hr
   INTERSECT
   SELECT emp_id FROM finance;
   ```

---

### 🧠 Remember Like This

| Action    | Mnemonic             |
| --------- | -------------------- |
| UNION     | “All together now!”  |
| INTERSECT | “What’s common?”     |
| EXCEPT    | “This but not that.” |
| CUBE      | “All combos.”        |
| ROLLUP    | “Roll up to totals.” |

---

Would you like me to continue next with 🔹**Views, Indexes & Performance Optimization** — in the same “memory + code + interview” format? (That’s the next big SQL interview section.)


Perfect bhai 🔥 — ab tu enter kar raha hai **advanced SQL zone** — jahan interviewers tricky subquery & function ke question poochte hain.
Main ye sab **deep + easy-to-remember + example-heavy + interview-style** way me explain kar raha hoon.

---

## 🧩 PART 1️⃣ — SUBQUERIES & CTEs (Common Table Expressions)

---

### 🔹 What is a Subquery?

A **query inside another query**.

💡 Used when ek query ka result doosre query ke liye input ban jaata hai.

#### Example 1: Simple Subquery

```sql
SELECT name, salary
FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees);
```

➡️ Finds all employees earning more than the average.

🧠 Trick: Parentheses = nested query.
Main query reads from subquery’s result.

---

### 🔸 Types of Subqueries

| Type           | Use Case               | Example                                      |
| -------------- | ---------------------- | -------------------------------------------- |
| **Scalar**     | Returns 1 value        | `(SELECT COUNT(*) FROM users)`               |
| **Row**        | Returns 1 row          | `(SELECT name, age FROM users WHERE id=1)`   |
| **Table**      | Returns multiple rows  | `(SELECT * FROM employees WHERE dept_id=10)` |
| **Correlated** | Depends on outer query | See below 👇                                 |

#### Example 2: Correlated Subquery

```sql
SELECT e.name, e.salary
FROM employees e
WHERE e.salary > (
  SELECT AVG(salary)
  FROM employees
  WHERE department_id = e.department_id
);
```

➡️ For each employee, inner query runs separately using outer query’s value.

🧠 Trick: "Correlated" = inner query depends on outer query.

---

## ⚙️ Subquery Operators

---

### 1️⃣ `ANY` Operator

Compare with **any** value in a subquery result.

```sql
SELECT name
FROM employees
WHERE salary > ANY (SELECT salary FROM employees WHERE department_id = 2);
```

➡️ Means: employee whose salary > *at least one* salary in department 2.

🧠 Trick: “ANY = at least one match”.

---

### 2️⃣ `ALL` Operator

Compare with **all** values in subquery.

```sql
SELECT name
FROM employees
WHERE salary > ALL (SELECT salary FROM employees WHERE department_id = 2);
```

➡️ Means: employee whose salary is greater than *everyone’s* salary in department 2.

🧠 Trick: “ALL = better than everyone”.

---

### 3️⃣ `EXISTS` Operator

Checks **if subquery returns any row** (boolean true/false).

```sql
SELECT name
FROM department d
WHERE EXISTS (
  SELECT 1
  FROM employees e
  WHERE e.department_id = d.id
);
```

➡️ Means: show departments having at least one employee.

🧠 Trick: EXISTS = “Does any matching record exist?”

---

### 🧹 Deleting Duplicate Rows using Subquery

Let’s say table `students(id, name, age)` has duplicates.

```sql
DELETE FROM students
WHERE id NOT IN (
  SELECT MIN(id)
  FROM students
  GROUP BY name, age
);
```

➡️ Keeps only 1 unique record per (name, age).

🧠 Trick: Always use `MIN(id)` or `ROW_NUMBER()` to preserve one row.

---

### 📜 Common Table Expressions (CTE)

CTE = temporary result set you can reuse in a query.

#### Example:

```sql
WITH avg_salary AS (
  SELECT department_id, AVG(salary) AS avg_sal
  FROM employees
  GROUP BY department_id
)
SELECT e.name, e.salary, a.avg_sal
FROM employees e
JOIN avg_salary a
ON e.department_id = a.department_id
WHERE e.salary > a.avg_sal;
```

➡️ Reusable subquery with clean readability.

🧠 Trick:
`WITH name AS (subquery)`
→ then use it as a table.

---

### 🧠 Subquery vs CTE (Interview)

| Feature           | Subquery         | CTE                 |
| ----------------- | ---------------- | ------------------- |
| Readability       | Nested, messy    | Clean, readable     |
| Reusability       | No               | Yes                 |
| Performance       | Sometimes slower | Sometimes optimized |
| Recursive Queries | ❌                | ✅                   |

---

## 🧮 Practice Question

**Q:** Find employees who earn more than average salary of their department.
✅ Using CTE:

```sql
WITH dept_avg AS (
  SELECT department_id, AVG(salary) AS avg_salary
  FROM employees
  GROUP BY department_id
)
SELECT e.name, e.salary
FROM employees e
JOIN dept_avg d ON e.department_id = d.department_id
WHERE e.salary > d.avg_salary;
```

---

## 🧩 PART 2️⃣ — USER-DEFINED FUNCTIONS (UDFs)

---

### 🔹 CREATE FUNCTION Statement

Used to define reusable logic blocks (custom SQL functions).

#### Example:

```sql
CREATE FUNCTION get_total_sales(region TEXT)
RETURNS NUMERIC AS $$
  SELECT SUM(amount) FROM sales WHERE sales.region = $1;
$$ LANGUAGE SQL;
```

➡️ `$1` = first parameter
`RETURNS` defines output type
`LANGUAGE SQL` means written in SQL (can also be PL/pgSQL).

---

### 🔸 Function Parameter Modes

| Mode    | Meaning              | Example             |
| ------- | -------------------- | ------------------- |
| `IN`    | Input only (default) | `IN name TEXT`      |
| `OUT`   | Output only          | `OUT total NUMERIC` |
| `INOUT` | Both input & output  | `INOUT counter INT` |

#### Example:

```sql
CREATE FUNCTION add_numbers(IN a INT, IN b INT, OUT sum INT)
AS $$
  SELECT a + b;
$$ LANGUAGE SQL;
```

➡️ Call: `SELECT add_numbers(5, 10);`

---

### 🔁 Function Overloading

You can define **multiple functions with same name**, but different parameters.

```sql
CREATE FUNCTION get_discount(price NUMERIC) RETURNS NUMERIC AS $$
  SELECT price * 0.1;
$$ LANGUAGE SQL;

CREATE FUNCTION get_discount(price NUMERIC, category TEXT) RETURNS NUMERIC AS $$
  SELECT CASE
    WHEN category = 'VIP' THEN price * 0.2
    ELSE price * 0.1
  END;
$$ LANGUAGE SQL;
```

🧠 Trick: PostgreSQL differentiates by **parameter signature**.

---

### 📋 Function Returning Table

Used to return multiple rows and columns.

```sql
CREATE FUNCTION get_top_students(min_marks INT)
RETURNS TABLE(id INT, name TEXT, marks INT) AS $$
  SELECT id, name, marks FROM students WHERE marks > min_marks;
$$ LANGUAGE SQL;
```

➡️ Call:

```sql
SELECT * FROM get_top_students(80);
```

---

### ❌ Drop Function

```sql
DROP FUNCTION get_total_sales(TEXT);
DROP FUNCTION get_top_students(INT);
```

💡 You must specify parameter types when dropping.

---

### ⚙️ Example — Real-World Combined Use

```sql
CREATE FUNCTION get_high_earners(min_salary NUMERIC)
RETURNS TABLE(name TEXT, dept TEXT, salary NUMERIC) AS $$
  SELECT e.name, d.dept_name, e.salary
  FROM employees e
  JOIN departments d ON e.department_id = d.id
  WHERE e.salary > min_salary;
$$ LANGUAGE SQL;

-- usage
SELECT * FROM get_high_earners(50000);
```

---

### 🧠 Interview Key Takeaways

| Concept              | Mnemonic / Tip             |
| -------------------- | -------------------------- |
| Subquery             | "Query inside query"       |
| Correlated Subquery  | "Inner depends on outer"   |
| ANY                  | “At least one match”       |
| ALL                  | “Every match must pass”    |
| EXISTS               | “Does it exist?”           |
| CTE                  | “Reusable temporary table” |
| Function             | “Reusable logic block”     |
| Function Overloading | “Same name, diff params”   |
| RETURNS TABLE        | “Return multiple rows”     |

---

### ⚡ Challenge (Tough Interview Practice)

**Q:** Write a function to return all employees whose salary is above department average (using subquery inside function).

```sql
CREATE FUNCTION get_above_avg()
RETURNS TABLE(name TEXT, salary NUMERIC, dept_id INT) AS $$
  SELECT e.name, e.salary, e.department_id
  FROM employees e
  WHERE e.salary > (
    SELECT AVG(salary)
    FROM employees
    WHERE department_id = e.department_id
  );
$$ LANGUAGE SQL;

SELECT * FROM get_above_avg();
```

➡️ This combines **function + correlated subquery** — high-level interview pattern 💪

---

Would you like me to continue next with 🔹**Views, Indexes, and Performance Optimization** (covering `CREATE VIEW`, `INDEX`, `EXPLAIN ANALYZE`, `CLUSTER`, etc.) — next big interview topic after this?


Perfect bhai 🔥 — ab tu aa gaya SQL ke **in-built functions** ke powerhouse section pe — jahan se **90% interviews me direct ya indirect question** aate hain.
Main tujhe **short + deep + mnemonic-based + example-heavy** format me samjhaata hoon taaki tu **easily yaad rakhe + confidently explain kare** 💪

---

# 🧩 SQL — Important Built-in Functions (PostgreSQL Focus)

---

## 🧮 1️⃣ Aggregate Functions

> Work on **sets of rows** → return **a single result**.

---

### 🔹 `AVG()` — Average of numeric values

```sql
SELECT AVG(salary) AS avg_salary FROM employees;
```

🧠 *Remember:* “A = Average”
💡 Use with `GROUP BY` for per-department average:

```sql
SELECT department_id, AVG(salary)
FROM employees
GROUP BY department_id;
```

---

### 🔹 `COUNT()` — Count rows

```sql
SELECT COUNT(*) FROM employees;
SELECT COUNT(DISTINCT department_id) FROM employees;
```

🧠 *COUNT(*) counts all rows; COUNT(column) skips NULLs.*

---

### 🔹 `MAX()` — Maximum value

```sql
SELECT MAX(salary) FROM employees;
```

💡 *Find the highest salary.*

---

### 🔹 `MIN()` — Minimum value

```sql
SELECT MIN(salary) FROM employees;
```

💡 *Find the smallest or earliest (dates) value.*

---

### 🔹 `SUM()` — Sum of all numeric values

```sql
SELECT SUM(salary) FROM employees WHERE department_id = 2;
```

💡 Often used for totals, billing, sales, etc.

---

## 🧮 2️⃣ Window (Analytic) Functions

> Perform calculations across rows **without collapsing** into one row.

---

### 🔹 `FIRST_VALUE()` — First value in a group/window

```sql
SELECT 
  department_id,
  name,
  salary,
  FIRST_VALUE(name) OVER (PARTITION BY department_id ORDER BY salary DESC) AS highest_earner
FROM employees;
```

💡 *Gives top salary name per department.*

---

### 🔹 `LAST_VALUE()` — Last value in the window

```sql
SELECT 
  department_id,
  name,
  salary,
  LAST_VALUE(name) OVER (
    PARTITION BY department_id 
    ORDER BY salary DESC 
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) AS lowest_earner
FROM employees;
```

🧠 Trick: Always set **window frame** properly or it gives partial results.

---

### 🔹 `NTH_VALUE()` — nth value in the ordered set

```sql
SELECT 
  department_id,
  NTH_VALUE(name, 2) OVER (PARTITION BY department_id ORDER BY salary DESC) AS second_highest
FROM employees;
```

💡 *E.g. get 2nd highest salary name.*

---

### 🔹 `ROW_NUMBER()` — Assigns sequential numbers

```sql
SELECT 
  name, 
  salary, 
  ROW_NUMBER() OVER (ORDER BY salary DESC) AS rank
FROM employees;
```

💡 *Can be used to find nth highest salary using CTE.*

```sql
WITH ranked AS (
  SELECT name, salary, ROW_NUMBER() OVER (ORDER BY salary DESC) AS r
  FROM employees
)
SELECT name, salary FROM ranked WHERE r = 3;
```

🧠 *ROW_NUMBER resets if you add PARTITION BY.*

---

## 📅 3️⃣ Date & Time Functions

---

### 🔹 `CURRENT_DATE` — System’s current date

```sql
SELECT CURRENT_DATE;
-- 2025-11-13
```

---

### 🔹 `CURRENT_TIME` — System’s current time

```sql
SELECT CURRENT_TIME;
-- 11:25:47.123456+05:30
```

---

### 🔹 `EXTRACT()` — Extract specific part from date/time

```sql
SELECT EXTRACT(YEAR FROM CURRENT_DATE);   -- 2025
SELECT EXTRACT(MONTH FROM CURRENT_DATE);  -- 11
SELECT EXTRACT(DAY FROM CURRENT_DATE);    -- 13
```

💡 *Also works for hour, minute, second, etc.*

🧠 Mnemonic: “EXTRACT pulls out date parts.”

---

## 🔤 4️⃣ String Functions

---

### 🔹 `CONCAT()` — Join multiple strings

```sql
SELECT CONCAT(first_name, ' ', last_name) AS full_name FROM employees;
```

💡 *Can also use `||` operator in PostgreSQL:*

```sql
SELECT first_name || ' ' || last_name;
```

---

### 🔹 `FORMAT()` — Dynamic text formatting

```sql
SELECT FORMAT('Employee %s earns ₹%s', name, salary) AS info FROM employees;
```

💡 Similar to `printf()` in C.

---

### 🔹 `UPPER()` — Convert to uppercase

```sql
SELECT UPPER(name) FROM employees;
```

➡️ “nikita” → “NIKITA”

---

### 🔹 `LOWER()` — Convert to lowercase

```sql
SELECT LOWER('HELLO SQL');
```

➡️ “HELLO SQL” → “hello sql”

---

### 🔹 `REPLACE()` — Replace all occurrences of substring

```sql
SELECT REPLACE('SQL is hard', 'hard', 'easy');
```

➡️ Output: “SQL is easy”

---

### 🔹 `REGEXP_MATCHES()` — Extract pattern using regex

```sql
SELECT REGEXP_MATCHES('user123@mail.com', '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}');
```

➡️ Returns `{"user123@mail.com"}` if matches regex.

🧠 Trick: Always returns **array** of matches.

---

### 🔹 `REGEXP_REPLACE()` — Replace using regex

```sql
SELECT REGEXP_REPLACE('Phone: +91-9876543210', '[^0-9]', '', 'g');
```

➡️ Removes all non-numeric chars → “919876543210”

💡 `'g'` means “global” replacement.

---

## ⚙️ 5️⃣ Real-Life Combo Example

```sql
SELECT
  department_id,
  COUNT(*) AS emp_count,
  ROUND(AVG(salary)) AS avg_sal,
  CONCAT(UPPER(FIRST_VALUE(name) OVER w), ' earns ₹', MAX(salary)) AS top_earner
FROM employees
WINDOW w AS (PARTITION BY department_id ORDER BY salary DESC)
GROUP BY department_id;
```

➡️ Combines **aggregate + window + string** functions.

---

## 🧠 Interview Quick Reference

| Function          | Purpose            | Example                                 |
| ----------------- | ------------------ | --------------------------------------- |
| AVG()             | Average            | AVG(salary)                             |
| COUNT()           | Count rows         | COUNT(*)                                |
| MAX(), MIN()      | Highest/Lowest     | MAX(salary)                             |
| SUM()             | Total              | SUM(amount)                             |
| FIRST_VALUE       | First record       | FIRST_VALUE(name) OVER (...)            |
| LAST_VALUE        | Last record        | LAST_VALUE(name) OVER (...)             |
| NTH_VALUE         | Nth record         | NTH_VALUE(name, 2) OVER (...)           |
| ROW_NUMBER        | Ranking            | ROW_NUMBER() OVER (...)                 |
| CURRENT_DATE/TIME | Current date/time  | CURRENT_DATE                            |
| EXTRACT           | Get year/month/day | EXTRACT(YEAR FROM NOW())                |
| CONCAT            | Merge text         | CONCAT('A', 'B')                        |
| FORMAT            | Template strings   | FORMAT('%s: %s', name, salary)          |
| UPPER / LOWER     | Case conversion    | UPPER(name)                             |
| REPLACE           | Replace substring  | REPLACE('A_B','_','')                   |
| REGEXP_MATCHES    | Regex find         | REGEXP_MATCHES(text, pattern)           |
| REGEXP_REPLACE    | Regex replace      | REGEXP_REPLACE(text, '[^0-9]', '', 'g') |

---

### ⚡ Tough Interview Questions

1. **Find 2nd highest salary using window function:**

   ```sql
   SELECT name, salary
   FROM (
     SELECT name, salary, ROW_NUMBER() OVER (ORDER BY salary DESC) AS rn
     FROM employees
   ) t
   WHERE rn = 2;
   ```

2. **Get all employees whose email is valid:**

   ```sql
   SELECT name, email
   FROM employees
   WHERE REGEXP_MATCHES(email, '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
   ```

3. **Extract month from joining date & count employees per month:**

   ```sql
   SELECT EXTRACT(MONTH FROM join_date) AS month, COUNT(*) AS total
   FROM employees
   GROUP BY month
   ORDER BY month;
   ```

4. **Replace all non-numeric characters from phone numbers:**

   ```sql
   SELECT REGEXP_REPLACE(phone, '[^0-9]', '', 'g') AS cleaned_phone FROM users;
   ```

---

### 🧠 Memory Trick Summary

| Category   | Mnemonic                                                                              |
| ---------- | ------------------------------------------------------------------------------------- |
| Aggregates | “AVG COUNT MAX MIN SUM” → ACMMS                                                       |
| Windows    | “Row First Last Nth” → R-F-L-N                                                        |
| Date       | “Current Extract”                                                                     |
| String     | “C-F-U-L-R-RR-RM” → (Concat, Format, Upper, Lower, Replace, RegexReplace, RegexMatch) |

---

Would you like me to move next to 🔹**Views, Indexes & Query Optimization (EXPLAIN ANALYZE, CLUSTER, PARTITION, etc.)** — the most **interview-heavy performance topic** after functions?


Bhai 🔥 ab tu aa gaya **advanced PostgreSQL control structures** pe —
ye section interview ke “real-world database developer” part me aata hai — jahan tu variables, procedures, aur triggers samjhega (pure backend ke backbone).

Main isko explain kar raha hoon **flow + examples + interview notes + memory tricks** ke saath 👇

---

# 🧩 PART 1️⃣ — Variables & Constants in PostgreSQL (PL/pgSQL)

> Ye sab **Stored Procedures / Functions** ke andar hi use hote hain.
> Outside, sirf `SELECT INTO` ka limited use hota hai.

---

## 🔹 Variable Declaration Syntax

```sql
DECLARE
  variable_name data_type [DEFAULT value];
```

**Example:**

```sql
DO $$
DECLARE
  total_sales NUMERIC := 0;
BEGIN
  SELECT SUM(amount) INTO total_sales FROM sales;
  RAISE NOTICE 'Total Sales = %', total_sales;
END $$;
```

💡 `DO $$ ... $$;` = anonymous block (temporary procedure to test logic)

🧠 Trick: Always start block with `DECLARE` → variables live inside it.

---

## 🔹 SELECT INTO (Store Query Result into Variable)

```sql
DO $$
DECLARE
  emp_count INT;
BEGIN
  SELECT COUNT(*) INTO emp_count FROM employees WHERE department_id = 2;
  RAISE NOTICE 'Dept 2 employees: %', emp_count;
END $$;
```

💡 **`SELECT INTO`** moves query result into variable(s).

---

## 🔹 Row Type Variables

Store **an entire row** from a table in one variable.

```sql
DO $$
DECLARE
  emp_row employees%ROWTYPE;
BEGIN
  SELECT * INTO emp_row FROM employees WHERE id = 1;
  RAISE NOTICE 'Employee name: % salary: %', emp_row.name, emp_row.salary;
END $$;
```

🧠 Trick: `%ROWTYPE` copies **entire table structure**.

---

## 🔹 Record Type Variables

Generic record — doesn’t depend on a specific table.

```sql
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT name, salary FROM employees LOOP
    RAISE NOTICE 'Name: %, Salary: %', rec.name, rec.salary;
  END LOOP;
END $$;
```

💡 Use `RECORD` when structure unknown (dynamic queries).

---

## 🔹 Constants

Value cannot be changed once set.

```sql
DO $$
DECLARE
  company_name CONSTANT TEXT := 'TechNova Pvt Ltd';
BEGIN
  RAISE NOTICE 'Company: %', company_name;
END $$;
```

🧠 Trick: Constant = Immutable variable.

---

# ⚙️ PART 2️⃣ — Stored Procedures

---

## 💡 What is a Stored Procedure?

A **precompiled SQL block** stored in the database that performs an operation (insert/update/delete/logic) and can be executed anytime.

---

### 🔹 CREATE PROCEDURE

```sql
CREATE PROCEDURE update_salary(IN dept_id INT, IN percent_raise NUMERIC)
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE employees
  SET salary = salary + (salary * percent_raise / 100)
  WHERE department_id = dept_id;

  RAISE NOTICE 'Salary updated for department %', dept_id;
END;
$$;
```

➡️ Call it using:

```sql
CALL update_salary(3, 10);
```

🧠 Trick:

* Functions → return value
* Procedures → perform action (no return)

---

### 🔹 Drop Procedure

```sql
DROP PROCEDURE update_salary(INT, NUMERIC);
```

💡 You must specify argument types.

---

### 🔹 Procedure vs Function (Interview)

| Feature             | Procedure        | Function                   |
| ------------------- | ---------------- | -------------------------- |
| Return value        | ❌ No             | ✅ Yes                      |
| Call                | `CALL proc()`    | `SELECT func()`            |
| Used in SELECT      | ❌                | ✅                          |
| Purpose             | Operations / DML | Calculations / Data return |
| Transaction control | ✅ allowed        | ❌ not allowed              |

---

## ⚡ Example: Procedure Using Variables

```sql
CREATE PROCEDURE transfer_funds(IN from_id INT, IN to_id INT, IN amt NUMERIC)
LANGUAGE plpgsql
AS $$
DECLARE
  from_balance NUMERIC;
BEGIN
  SELECT balance INTO from_balance FROM accounts WHERE id = from_id;
  IF from_balance < amt THEN
    RAISE EXCEPTION 'Insufficient funds!';
  ELSE
    UPDATE accounts SET balance = balance - amt WHERE id = from_id;
    UPDATE accounts SET balance = balance + amt WHERE id = to_id;
  END IF;
END;
$$;

CALL transfer_funds(1, 2, 1000);
```

💡 Demonstrates:

* Variable usage
* Conditionals
* Updates
* Error handling

---

# 🧩 PART 3️⃣ — Triggers (Automatic Actions)

---

## 💡 What is a Trigger?

> A **special procedure** that automatically runs on INSERT, UPDATE, or DELETE.

Used for **auditing, logging, validation, auto-update**, etc.

---

### 🔹 CREATE TRIGGER

```sql
CREATE TABLE employees_audit (
  emp_id INT,
  action TEXT,
  changed_on TIMESTAMP DEFAULT NOW()
);
```

#### Trigger Function:

```sql
CREATE OR REPLACE FUNCTION log_employee_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO employees_audit(emp_id, action)
    VALUES (NEW.id, 'Inserted');
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO employees_audit(emp_id, action)
    VALUES (NEW.id, 'Updated');
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO employees_audit(emp_id, action)
    VALUES (OLD.id, 'Deleted');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### Trigger Definition:

```sql
CREATE TRIGGER employee_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON employees
FOR EACH ROW
EXECUTE FUNCTION log_employee_change();
```

🧠 Trick:

* `NEW` → new record
* `OLD` → old record
* `TG_OP` → operation type (`INSERT`, `UPDATE`, `DELETE`)

---

### 🔹 DROP TRIGGER

```sql
DROP TRIGGER employee_audit_trigger ON employees;
```

---

### 🔹 ALTER TRIGGER (Rename)

```sql
ALTER TRIGGER employee_audit_trigger ON employees RENAME TO emp_audit_trig;
```

---

### 🔹 Disabling a Trigger

```sql
ALTER TABLE employees DISABLE TRIGGER employee_audit_trigger;
```

---

### 🔹 Enabling a Trigger

```sql
ALTER TABLE employees ENABLE TRIGGER employee_audit_trigger;
```

---

## ⚙️ Real-Life Example: Auto-updating “last_modified_at”

```sql
CREATE OR REPLACE FUNCTION update_modified_time()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_timestamp
BEFORE UPDATE ON employees
FOR EACH ROW
EXECUTE FUNCTION update_modified_time();
```

💡 Automatically updates timestamp when record changes.

---

## 🧠 INTERVIEW NOTES — Variables, Procedures, Triggers

| Concept     | Key Point                   | Example                           |
| ----------- | --------------------------- | --------------------------------- |
| Variable    | Declared in `DECLARE` block | `DECLARE total INT;`              |
| SELECT INTO | Store query result          | `SELECT COUNT(*) INTO total`      |
| ROWTYPE     | Holds entire table row      | `emp employees%ROWTYPE;`          |
| RECORD      | Holds any query result      | `rec RECORD;`                     |
| CONSTANT    | Immutable variable          | `CONSTANT company TEXT := 'X';`   |
| Procedure   | Perform action              | `CREATE PROCEDURE ... CALL ...`   |
| Function    | Returns data                | `SELECT func()`                   |
| Trigger     | Auto executes               | `CREATE TRIGGER ... AFTER UPDATE` |
| NEW / OLD   | Access row values           | `NEW.salary`, `OLD.name`          |
| TG_OP       | Operation type              | `'INSERT'`, `'DELETE'`            |

---

### ⚡ Tough Interview Questions

**Q1:** Write a trigger that prevents salary from being decreased.

```sql
CREATE OR REPLACE FUNCTION prevent_salary_decrease()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.salary < OLD.salary THEN
    RAISE EXCEPTION 'Salary decrease not allowed!';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER no_salary_cut
BEFORE UPDATE ON employees
FOR EACH ROW
EXECUTE FUNCTION prevent_salary_decrease();
```

---

**Q2:** Write a procedure to delete inactive users and log the count.

```sql
CREATE PROCEDURE delete_inactive_users()
LANGUAGE plpgsql
AS $$
DECLARE
  del_count INT;
BEGIN
  DELETE FROM users WHERE active = false RETURNING * INTO del_count;
  RAISE NOTICE '% inactive users deleted', del_count;
END;
$$;

CALL delete_inactive_users();
```

---

**Q3:** What’s the difference between BEFORE and AFTER triggers?

| Type   | When it fires      | Use case                    |
| ------ | ------------------ | --------------------------- |
| BEFORE | Before data change | Validate or modify values   |
| AFTER  | After data change  | Log, audit, cascade updates |

---

### 🧠 Mnemonics to Remember

| Concept     | Mnemonic                          |
| ----------- | --------------------------------- |
| Variables   | “DECLARE before you BEGIN”        |
| SELECT INTO | “Put result INTO variable”        |
| ROWTYPE     | “Row from table = structure copy” |
| RECORD      | “Dynamic row”                     |
| Procedure   | “CALLable action”                 |
| Trigger     | “AUTO reaction”                   |

---

Would you like me to continue next with 🔹**Views, Indexes, Query Optimization (EXPLAIN, ANALYZE, PARTITION, CLUSTER)** — the final “performance & tuning” section (most asked in senior-level interviews)?


Perfect 🔥 bhai ab tu SQL ke **performance aur debugging** zone me aa gaya —
yani wo part jo **real production systems** me sabse zyada use hota hai (index tuning + error handling).

Main isko explain kar raha hoon flow me:
→ Indexes (types + usage + examples + interview tricks)
→ Error Handling (EXCEPTION, ASSERT)

---

# 🧩 PART 1️⃣ — INDEXES in PostgreSQL

> **Index** ek “lookup table” hota hai jo queries ko **super fast** banata hai.
> Without index = full table scan
> With index = only few rows accessed

---

## 🔹 Syntax — CREATE INDEX

```sql
CREATE INDEX index_name
ON table_name (column_name);
```

**Example:**

```sql
CREATE INDEX idx_employees_name ON employees(name);
```

➡️ Speeds up queries like:

```sql
SELECT * FROM employees WHERE name = 'Rahul';
```

💡 **Default type** in Postgres = `B-tree` index (balanced tree)

---

### ⚙️ How Index Works

* Think of it as a **dictionary lookup** — jumps directly to matching row instead of scanning all.
* Index lives **separately from data** but references it.
* Needs **maintenance** on `INSERT`, `UPDATE`, `DELETE` (so don’t overuse).

---

## 🔹 DROP INDEX

```sql
DROP INDEX idx_employees_name;
```

💡 Use `IF EXISTS` to avoid error:

```sql
DROP INDEX IF EXISTS idx_employees_name;
```

---

## 🔹 List All Indexes

**Method 1 (psql command):**

```sql
\d employees
```

**Method 2 (SQL query):**

```sql
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public';
```

---

## 🔹 UNIQUE INDEX

> Ensures all indexed values are **unique** (no duplicates allowed).

```sql
CREATE UNIQUE INDEX idx_users_email
ON users(email);
```

💡 Same effect as `UNIQUE` constraint but more flexible.

---

## 🔹 Partial Index

> Index only a **subset of rows** based on a condition (saves space).

```sql
CREATE INDEX idx_active_users
ON users(email)
WHERE active = true;
```

🧠 Trick: “Partial index = WHERE condition inside index”.

💡 Useful when 80% data is inactive → reduces bloat.

---

## 🔹 Index on Expression

> Index not on a column directly but on an **expression or function**.

```sql
CREATE INDEX idx_lower_email
ON users(LOWER(email));
```

✅ Now queries like:

```sql
SELECT * FROM users WHERE LOWER(email) = 'test@gmail.com';
```

will use this index.

🧠 Trick: Always use same expression in query as in index.

---

## 🔹 Multicolumn Index

> Index on **multiple columns**.

```sql
CREATE INDEX idx_emp_dept_salary
ON employees(department_id, salary);
```

💡 Works best for queries filtering on **both** columns (in order).

📌 Important Rule:
Order matters → `(department_id, salary)` ≠ `(salary, department_id)`

---

## 🔹 REINDEX (Rebuild Index)

> Rebuilds corrupted or bloated indexes without dropping them.

```sql
REINDEX INDEX idx_employees_name;
```

Or rebuild all indexes on a table:

```sql
REINDEX TABLE employees;
```

💡 Used for **database optimization** after heavy updates.

---

### 🧠 INTERVIEW CHEATSHEET — Indexes

| Type             | Purpose         | Example                                         |
| ---------------- | --------------- | ----------------------------------------------- |
| Simple Index     | Basic lookup    | `CREATE INDEX idx_name ON emp(name)`            |
| Unique Index     | No duplicates   | `CREATE UNIQUE INDEX idx_email ON users(email)` |
| Partial Index    | Filtered rows   | `WHERE active=true`                             |
| Expression Index | Function result | `LOWER(email)`                                  |
| Multicolumn      | Multiple cols   | `(dept_id, salary)`                             |
| Reindex          | Rebuild old one | `REINDEX TABLE employees`                       |

---

### ⚡ Interview Questions

**Q1:** When not to use indexes?
➡️ When table is small or frequently updated (indexes slow down writes).

**Q2:** How does PostgreSQL pick which index to use?
➡️ Using the **query planner** (`EXPLAIN ANALYZE` shows it).

**Q3:** Difference between unique constraint and unique index?
➡️ Constraint = logical rule; Index = physical structure.
Unique constraint automatically creates a unique index under the hood.

---

# 🧩 PART 2️⃣ — Errors & Exception Handling

---

## 🔹 Exception Handling Basics

> Used in **functions/procedures** to handle runtime errors gracefully.

### Syntax:

```sql
BEGIN
  -- main code
EXCEPTION
  WHEN condition THEN
    -- handle error
END;
```

---

### ⚡ Example 1: Handling Division by Zero

```sql
DO $$
DECLARE
  result NUMERIC;
BEGIN
  BEGIN
    result := 100 / 0;
  EXCEPTION
    WHEN division_by_zero THEN
      RAISE NOTICE 'Cannot divide by zero!';
  END;
END $$;
```

💡 Always use `EXCEPTION WHEN <error_type>` inside `BEGIN…END`.

---

### ⚡ Example 2: Catching Any Error

```sql
DO $$
BEGIN
  INSERT INTO employees(id, name) VALUES (1, 'A');
  INSERT INTO employees(id, name) VALUES (1, 'B'); -- duplicate key
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Something went wrong: %', SQLERRM;
END $$;
```

🧠 Trick:

* `WHEN OTHERS` → catches any error
* `SQLERRM` → gives actual error message

---

### ⚡ Example 3: Custom Exception

```sql
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM employees) > 100 THEN
    RAISE EXCEPTION 'Too many employees!';
  END IF;
END $$;
```

💡 `RAISE EXCEPTION` = throw error manually.

---

### ⚙️ Nested Exception Example

```sql
DO $$
BEGIN
  BEGIN
    INSERT INTO users VALUES (1, 'A');
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE 'Duplicate user skipped';
  END;

  RAISE NOTICE 'Process completed';
END $$;
```

---

## 🔹 RAISE Statement Levels

| Level     | Use Case       | Example                             |
| --------- | -------------- | ----------------------------------- |
| NOTICE    | Informative    | `RAISE NOTICE 'Inserted record';`   |
| WARNING   | Minor issue    | `RAISE WARNING 'Old data';`         |
| EXCEPTION | Stop execution | `RAISE EXCEPTION 'Critical error';` |

---

## 🔹 ASSERT (Debugging Helper)

> Checks if a condition is true — otherwise throws an error.

```sql
DO $$
DECLARE
  total INT := 50;
BEGIN
  ASSERT total > 0, 'Total must be positive';
  RAISE NOTICE 'All good!';
END $$;
```

💡 `ASSERT` is great for validating assumptions during development.

🧠 Trick:
Think of it as SQL’s **unit test**.

---

### ⚡ Example: Assertion Failure

```sql
DO $$
DECLARE
  count_emp INT := (SELECT COUNT(*) FROM employees);
BEGIN
  ASSERT count_emp < 500, 'Too many employees!';
END $$;
```

➡️ If count ≥ 500 → raises an exception instantly.

---

## 🧠 INTERVIEW CHEATSHEET — Errors & Messages

| Command         | Purpose            | Example                           |
| --------------- | ------------------ | --------------------------------- |
| RAISE NOTICE    | Log info           | `RAISE NOTICE 'Done';`            |
| RAISE WARNING   | Warn but continue  | `RAISE WARNING 'Low stock';`      |
| RAISE EXCEPTION | Abort              | `RAISE EXCEPTION 'Invalid data';` |
| WHEN condition  | Catch error        | `WHEN division_by_zero THEN ...`  |
| WHEN OTHERS     | Catch all          | `WHEN OTHERS THEN ...`            |
| SQLERRM         | Error message      | `RAISE NOTICE '%', SQLERRM;`      |
| ASSERT          | Validate condition | `ASSERT count < 10;`              |

---

### ⚡ Tough Interview Questions

**Q1:** What’s the difference between `RAISE EXCEPTION` and `ASSERT`?

* `RAISE EXCEPTION` → you manually throw error.
* `ASSERT` → automatically throws if condition false.

**Q2:** Can we rollback inside an EXCEPTION block?
➡️ Yes, PostgreSQL automatically rolls back to the **beginning of the block**, unless you use **SAVEPOINTs**.

**Q3:** How to handle multiple specific errors?

```sql
EXCEPTION
  WHEN unique_violation THEN ...
  WHEN division_by_zero THEN ...
  WHEN OTHERS THEN ...
```

**Q4:** How to rethrow an exception?
➡️ Just use `RAISE;` inside EXCEPTION block.

---

# ✅ SUMMARY

### 🎯 INDEX KEYWORDS

`CREATE INDEX`, `DROP INDEX`, `UNIQUE INDEX`, `PARTIAL INDEX`,
`INDEX ON EXPRESSION`, `REINDEX`, `MULTICOLUMN INDEX`

### 🎯 ERROR KEYWORDS

`BEGIN`, `EXCEPTION`, `WHEN`, `RAISE`, `NOTICE`, `WARNING`,
`EXCEPTION`, `SQLERRM`, `ASSERT`

---

Would you like me to continue next with
👉 **Views, Query Optimization (EXPLAIN, ANALYZE, VACUUM, CLUSTER, PARTITIONING)** —
the **final performance chapter**, which covers how to read query plans & tune databases (a hot interview topic)?

// ============================================================================
// 📚 COMPREHENSIVE COMPARISON: PostgreSQL vs MySQL vs SQL Standard
// ============================================================================
// This section provides detailed comparison for interview preparation
// Understanding these differences is crucial for database selection and optimization
// ============================================================================

// 🔍 1. SQL STANDARD vs PostgreSQL vs MySQL
// ============================================================================
//
// SQL (Structured Query Language):
// - Definition: ANSI/ISO standardized language for relational databases
// - Purpose: Universal syntax for querying relational data
// - Creator: ANSI/ISO (standardized in 1986, updated regularly)
// - Scope: Defines syntax and rules only (language specification)
// - Data Types: Basic types (INT, VARCHAR, DATE, TIMESTAMP, etc.)
// - Extensions: None (pure standard)
// - Examples: SELECT, INSERT, UPDATE, DELETE, JOIN, etc.
//
// PostgreSQL:
// - Definition: Open-source Object-Relational Database Management System (ORDBMS)
// - Purpose: Advanced database system that implements and extends SQL
// - Creator: Originally UC Berkeley, now PostgreSQL Global Development Group
// - Scope: Full database engine (storage, indexing, execution, transactions, etc.)
// - Data Types: Rich types (JSONB, ARRAY, UUID, HSTORE, RANGE, XML, etc.)
// - Extensions: Many (PostGIS, pgVector, TimescaleDB, full-text search, etc.)
// - Compliance: Very close to SQL standard (one of the most compliant)
//
// MySQL:
// - Definition: Open-source Relational Database Management System (RDBMS)
// - Purpose: Fast, simple database for web applications
// - Creator: MySQL AB (now owned by Oracle)
// - Scope: Full database engine with focus on speed and simplicity
// - Data Types: Standard types + some MySQL-specific (TINYINT for boolean)
// - Extensions: Limited (compared to PostgreSQL)
// - Compliance: Less strict SQL standard compliance (more permissive)
//
// ============================================================================

// 🔍 2. ARCHITECTURAL DIFFERENCES
// ============================================================================
//
// PostgreSQL (Object-Relational):
// - Supports inheritance (tables can inherit from other tables)
// - Supports custom data types (user-defined types)
// - Supports functions, operators, and aggregates written in multiple languages
// - Multi-Version Concurrency Control (MVCC) for all transactions
// - Write-Ahead Logging (WAL) for durability
// - Process-based architecture (one process per connection)
//
// MySQL (Relational):
// - Pure relational model (no inheritance)
// - Limited custom data types
// - Thread-based architecture (one thread per connection)
// - Multiple storage engines (InnoDB, MyISAM, etc.)
// - ACID compliance depends on storage engine (InnoDB = yes, MyISAM = no)
//
// ============================================================================

// 🔍 3. DATA TYPE COMPARISON
// ============================================================================
//
// Feature                | SQL Standard | PostgreSQL        | MySQL
// ----------------------|--------------|-------------------|------------------
// Boolean                | ✅ BOOLEAN   | ✅ BOOLEAN (true) | ❌ TINYINT(1)
// Integer Types          | INT          | INT, BIGINT, etc. | INT, BIGINT, etc.
// String Types           | VARCHAR      | VARCHAR, TEXT     | VARCHAR, TEXT
// JSON Support           | ✅ (SQL:2016)| ✅ JSONB (binary) | ✅ JSON (text)
// Array Support          | ❌           | ✅ ARRAY[]         | ❌
// UUID                   | ❌           | ✅ UUID            | ❌ (v8.0+ UUID() func)
// Range Types            | ❌           | ✅ RANGE           | ❌
// HSTORE (key-value)     | ❌           | ✅ HSTORE          | ❌
// Full-Text Search       | ❌           | ✅ tsvector/tsquery| ✅ FULLTEXT index
//
// PostgreSQL JSONB Example:
// CREATE TABLE users (id SERIAL, data JSONB);
// INSERT INTO users (data) VALUES ('{"name": "John", "age": 30}'::jsonb);
// SELECT data->>'name' FROM users;  -- JSONB operator
//
// MySQL JSON Example:
// CREATE TABLE users (id INT AUTO_INCREMENT, data JSON);
// INSERT INTO users (data) VALUES ('{"name": "John", "age": 30}');
// SELECT JSON_EXTRACT(data, '$.name') FROM users;  -- Function-based
//
// ============================================================================

// 🔍 4. SYNTAX DIFFERENCES (Common Examples)
// ============================================================================
//
// 1. AUTO_INCREMENT / SERIAL:
// ----------------------------------------
// MySQL:
// CREATE TABLE users (
//   id INT PRIMARY KEY AUTO_INCREMENT,
//   name VARCHAR(50)
// );
//
// PostgreSQL:
// CREATE TABLE users (
//   id SERIAL PRIMARY KEY,  -- or BIGSERIAL for larger numbers
//   name VARCHAR(50)
// );
//
// 2. LIMIT / OFFSET:
// ----------------------------------------
// Both support: SELECT * FROM users LIMIT 10 OFFSET 20;
// MySQL also supports: SELECT * FROM users LIMIT 20, 10;  (offset, limit)
// PostgreSQL: Must use LIMIT ... OFFSET ... format
//
// 3. String Concatenation:
// ----------------------------------------
// PostgreSQL:
// SELECT 'Hello' || ' ' || 'World';  -- Returns: 'Hello World'
//
// MySQL:
// SELECT CONCAT('Hello', ' ', 'World');  -- Returns: 'Hello World'
// SELECT 'Hello' || 'World';  -- ❌ Won't work (|| is OR operator)
//
// 4. Case-Insensitive String Matching:
// ----------------------------------------
// PostgreSQL:
// SELECT * FROM users WHERE name ILIKE 'john%';  -- Case-insensitive LIKE
//
// MySQL:
// SELECT * FROM users WHERE name LIKE 'john%' COLLATE utf8_general_ci;
// -- Need to specify collation
//
// 5. Upsert (Insert or Update):
// ----------------------------------------
// PostgreSQL:
// INSERT INTO users (id, name) VALUES (1, 'John')
// ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
//
// MySQL:
// INSERT INTO users (id, name) VALUES (1, 'John')
// ON DUPLICATE KEY UPDATE name = VALUES(name);
//
// 6. Date/Time Functions:
// ----------------------------------------
// PostgreSQL:
// SELECT CURRENT_TIMESTAMP;  -- Returns: 2024-01-01 12:00:00
// SELECT NOW();  -- Same as CURRENT_TIMESTAMP
// SELECT EXTRACT(YEAR FROM date_col) FROM table;
//
// MySQL:
// SELECT NOW();  -- Returns: 2024-01-01 12:00:00
// SELECT YEAR(date_col) FROM table;  -- Function-based
//
// ============================================================================

// 🔍 5. PERFORMANCE & OPTIMIZATION
// ============================================================================
//
// PostgreSQL Strengths:
// - Excellent for complex queries (multiple JOINs, subqueries, CTEs)
// - Better query planner (can handle complex optimization)
// - Advanced indexing (GIN, GiST, BRIN, SP-GiST, Hash, etc.)
// - Better for analytical workloads
// - Handles concurrent writes better (MVCC)
//
// MySQL Strengths:
// - Faster for simple reads (optimized for simple queries)
// - Better for read-heavy applications
// - Simpler queries are very fast
// - Good for web applications with simple CRUD
//
// When to Use PostgreSQL:
// - Complex queries and analytics
// - Need advanced data types (JSON, arrays, etc.)
// - Geospatial data (with PostGIS extension)
// - Need strict ACID compliance
// - Data integrity is critical
// - Complex transactions
//
// When to Use MySQL:
// - Simple web applications
// - Read-heavy workloads
// - Need maximum read performance
// - Large community and ecosystem
// - Web frameworks with strong MySQL support
//
// ============================================================================

// 🔍 6. ACID COMPLIANCE & TRANSACTIONS
// ============================================================================
//
// PostgreSQL:
// - Fully ACID compliant by design
// - All operations are transactional (including DDL)
// - MVCC ensures consistency
// - Supports nested transactions with SAVEPOINT
// - Isolation levels: READ UNCOMMITTED, READ COMMITTED (default), REPEATABLE READ, SERIALIZABLE
//
// MySQL:
// - ACID compliance depends on storage engine
// - InnoDB: Fully ACID compliant
// - MyISAM: No transactions, no ACID
// - Default isolation level: REPEATABLE READ (different from PostgreSQL!)
// - DDL statements are auto-committed (can't rollback)
//
// Transaction Example:
// --------------------
// PostgreSQL & MySQL (InnoDB):
// BEGIN;
//   UPDATE users SET balance = balance - 100 WHERE id = 1;
//   UPDATE users SET balance = balance + 100 WHERE id = 2;
// COMMIT;  -- or ROLLBACK;
//
// ============================================================================

// 🔍 7. INDEXING COMPARISON
// ============================================================================
//
// PostgreSQL Index Types:
// - B-Tree: Default, good for equality and range queries
// - Hash: Fast for equality only
// - GiST: Generalized Search Tree (geometric, full-text, etc.)
// - GIN: Generalized Inverted Index (arrays, full-text, JSONB)
// - BRIN: Block Range Index (for large, sorted tables)
// - SP-GiST: Space-Partitioned GiST
//
// MySQL Index Types:
// - B-Tree: Default (used by InnoDB, MyISAM)
// - Hash: Only for MEMORY tables
// - FULLTEXT: For text searching
// - Spatial: For geographic data
//
// Example - Creating Index:
// -------------------------
// PostgreSQL:
// CREATE INDEX idx_name ON users(name);
// CREATE INDEX idx_json ON users USING GIN (data);  -- GIN index for JSONB
// CREATE INDEX idx_partial ON users(name) WHERE age > 18;  -- Partial index
//
// MySQL:
// CREATE INDEX idx_name ON users(name);
// CREATE FULLTEXT INDEX idx_text ON articles(content);
//
// ============================================================================

// 🔍 8. STORED PROCEDURES & FUNCTIONS
// ============================================================================
//
// PostgreSQL:
// - Supports multiple languages: SQL, PL/pgSQL, Python, Perl, Tcl, etc.
// - Functions can return tables, sets, etc.
// - Very powerful and flexible
//
// MySQL:
// - Supports SQL/PSM (Persistent Stored Module)
// - More limited compared to PostgreSQL
//
// Example - Simple Function:
// --------------------------
// PostgreSQL:
// CREATE OR REPLACE FUNCTION get_user_age(user_id INT)
// RETURNS INT AS $$
// BEGIN
//   RETURN (SELECT age FROM users WHERE id = user_id);
// END;
// $$ LANGUAGE plpgsql;
//
// MySQL:
// DELIMITER //
// CREATE FUNCTION get_user_age(user_id INT)
// RETURNS INT
// BEGIN
//   DECLARE user_age INT;
//   SELECT age INTO user_age FROM users WHERE id = user_id;
//   RETURN user_age;
// END//
// DELIMITER ;
//
// ============================================================================

// 🔍 9. REPLICATION & HIGH AVAILABILITY
// ============================================================================
//
// PostgreSQL:
// - Streaming replication (physical)
// - Logical replication
// - Bidirectional replication (with extensions)
// - More complex setup but very flexible
//
// MySQL:
// - Master-slave replication
// - Master-master replication
// - Group replication
// - Easier setup, widely used
//
// ============================================================================

// 🔍 10. LICENSE & COMMUNITY
// ============================================================================
//
// PostgreSQL:
// - License: PostgreSQL License (BSD-like, very permissive)
// - Community: Developer-focused, strong in data engineering
// - Corporate backing: Independent (not owned by single company)
//
// MySQL:
// - License: GPL (open-source) or commercial
// - Community: Huge (especially web developers)
// - Corporate backing: Oracle Corporation
//
// ============================================================================

// ============================================================================
// 📚 POSTGRESQL INTERVIEW QUESTIONS - TRICKY QUERIES & THEORY
// ============================================================================
// This section covers advanced PostgreSQL questions commonly asked in interviews
// Focus on both theoretical understanding and practical query skills
// ============================================================================

// 🔥 1. WHAT IS MVCC (MULTI-VERSION CONCURRENCY CONTROL)?
// ============================================================================
// Answer:
// MVCC is PostgreSQL's mechanism to handle concurrent transactions without locking.
// Instead of locking rows for reads, PostgreSQL maintains multiple versions of data.
//
// How it works:
// - Each row has transaction IDs (xmin, xmax)
// - Read operations see data as it existed when transaction started
// - Write operations create new versions (no blocking of reads)
// - Old versions are cleaned up by VACUUM process
//
// Benefits:
// - Readers don't block writers
// - Writers don't block readers
// - Better concurrency than traditional locking
//
// Example:
// Transaction 1 (T1) starts at time T, reads row R
// Transaction 2 (T2) starts at time T+1, updates row R
// T1 still sees old version of R (snapshot isolation)
// T2 sees new version
// Both can proceed without blocking
//
// ============================================================================

// 🔥 2. EXPLAIN THE DIFFERENCE BETWEEN TRUNCATE, DELETE, AND DROP
// ============================================================================
// Answer:
//
// TRUNCATE:
// - Removes all rows from table (much faster than DELETE)
// - Cannot use WHERE clause (removes everything)
// - Resets auto-increment counter
// - Cannot rollback (in PostgreSQL, but can with transaction)
// - Faster because it doesn't scan table row-by-row
// Example: TRUNCATE TABLE users;
//
// DELETE:
// - Removes specific rows (can use WHERE clause)
// - Can rollback
// - Slower (scans and deletes row-by-row)
// - Triggers fired
// - Returns number of deleted rows
// Example: DELETE FROM users WHERE age < 18;
//
// DROP:
// - Removes entire table (structure and data)
// - Cannot rollback
// - Fastest operation
// - Drops indexes, constraints, triggers
// Example: DROP TABLE users;
//
// Performance Comparison:
// DROP > TRUNCATE >> DELETE (when deleting all rows)
//
// ============================================================================

// 🔥 3. WHAT IS THE DIFFERENCE BETWEEN INNER JOIN AND LEFT JOIN?
// ============================================================================
// Answer with Example:
//
// Tables:
// users:              orders:
// id | name           id | user_id | product
// ---|-------         ---|---------|----------
// 1  | Alice          1  | 1       | iPhone
// 2  | Bob            2  | 3       | Laptop
// 3  | Charlie
//
// INNER JOIN (returns only matching rows):
// SELECT u.name, o.product
// FROM users u
// INNER JOIN orders o ON u.id = o.user_id;
//
// Result:
// name    | product
// --------|--------
// Alice   | iPhone
//
// LEFT JOIN (returns all left table rows):
// SELECT u.name, o.product
// FROM users u
// LEFT JOIN orders o ON u.id = o.user_id;
//
// Result:
// name    | product
// --------|--------
// Alice   | iPhone
// Bob     | NULL
// Charlie | NULL
//
// Key Difference:
// - INNER JOIN: Only matching rows from both tables
// - LEFT JOIN: All rows from left table + matching from right
//
// ============================================================================

// 🔥 4. WHAT IS A WINDOW FUNCTION? GIVE EXAMPLES
// ============================================================================
// Answer:
// Window functions perform calculations across a set of rows related to current row
// without grouping rows into single output row (unlike GROUP BY).
//
// Syntax:
// function_name() OVER (PARTITION BY col ORDER BY col)
//
// Common Window Functions:
// - ROW_NUMBER(): Sequential number to each row
// - RANK(): Rank with gaps (1, 2, 2, 4)
// - DENSE_RANK(): Rank without gaps (1, 2, 2, 3)
// - LAG() / LEAD(): Previous/next row value
// - SUM() / AVG() OVER: Running totals/averages
//
// Example - Ranking:
// ------------------
// SELECT name, salary,
//        ROW_NUMBER() OVER (ORDER BY salary DESC) as row_num,
//        RANK() OVER (ORDER BY salary DESC) as rank,
//        DENSE_RANK() OVER (ORDER BY salary DESC) as dense_rank
// FROM employees;
//
// Output:
// name  | salary | row_num | rank | dense_rank
// ------|--------|---------|------|------------
// Alice | 50000  | 1       | 1    | 1
// Bob   | 40000  | 2       | 2    | 2
// Charlie| 40000 | 3       | 2    | 2
// David | 30000  | 4       | 4    | 3
//
// Example - Running Total:
// ------------------------
// SELECT date, amount,
//        SUM(amount) OVER (ORDER BY date) as running_total
// FROM sales;
//
// ============================================================================

// 🔥 5. EXPLAIN COMMON TABLE EXPRESSIONS (CTEs) vs SUBQUERIES
// ============================================================================
// Answer:
//
// CTE (WITH clause):
// - Defined once, can be referenced multiple times
// - More readable for complex queries
// - Can be recursive (RECURSIVE CTE)
// - Executed once and materialized (in PostgreSQL)
//
// Subquery:
// - Defined inline where needed
// - Can be executed multiple times (if used multiple times)
// - Less readable for complex queries
// - Can be correlated or non-correlated
//
// Example - CTE:
// --------------
// WITH high_salary AS (
//   SELECT * FROM employees WHERE salary > 50000
// ),
// department_counts AS (
//   SELECT department, COUNT(*) as count
//   FROM high_salary
//   GROUP BY department
// )
// SELECT * FROM department_counts WHERE count > 5;
//
// Example - Equivalent Subquery:
// -------------------------------
// SELECT department, COUNT(*) as count
// FROM (
//   SELECT * FROM employees WHERE salary > 50000
// ) AS high_salary
// GROUP BY department
// HAVING COUNT(*) > 5;
//
// Recursive CTE Example:
// ----------------------
// WITH RECURSIVE numbers AS (
//   SELECT 1 AS n
//   UNION ALL
//   SELECT n + 1 FROM numbers WHERE n < 10
// )
// SELECT * FROM numbers;
// -- Returns: 1, 2, 3, ..., 10
//
// ============================================================================

// 🔥 6. WHAT IS THE DIFFERENCE BETWEEN WHERE AND HAVING?
// ============================================================================
// Answer:
//
// WHERE:
// - Filters rows BEFORE grouping (GROUP BY)
// - Cannot use aggregate functions
// - Applied to individual rows
// - Used with SELECT, UPDATE, DELETE
//
// HAVING:
// - Filters groups AFTER grouping (GROUP BY)
// - Can use aggregate functions
// - Applied to groups
// - Only used with SELECT (and GROUP BY)
//
// Example:
// --------
// SELECT department, AVG(salary) as avg_salary
// FROM employees
// WHERE age > 25              -- Filter rows before grouping
// GROUP BY department
// HAVING AVG(salary) > 50000  -- Filter groups after grouping
// ORDER BY avg_salary DESC;
//
// Execution Order:
// FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY
//
// ============================================================================

// 🔥 7. EXPLAIN TRANSACTION ISOLATION LEVELS
// ============================================================================
// Answer:
//
// Isolation Levels (from least to most strict):
//
// 1. READ UNCOMMITTED:
//    - Can read uncommitted data (dirty reads)
//    - Lowest consistency, highest performance
//    - Not supported in PostgreSQL (lowest is READ COMMITTED)
//
// 2. READ COMMITTED (PostgreSQL default):
//    - Can only read committed data
//    - No dirty reads, but non-repeatable reads possible
//    - Each statement sees snapshot at statement start
//
// 3. REPEATABLE READ:
//    - Same reads return same results
//    - No dirty reads, no non-repeatable reads
//    - Phantom reads still possible
//    - PostgreSQL: Prevents phantom reads too (SQL standard violation)
//
// 4. SERIALIZABLE:
//    - Transactions appear to run serially
//    - Highest consistency, lowest performance
//    - Prevents all anomalies (dirty read, non-repeatable read, phantom read)
//
// Setting Isolation Level:
// ------------------------
// SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
// BEGIN;
//   -- Your queries
// COMMIT;
//
// Anomalies:
// - Dirty Read: Reading uncommitted changes
// - Non-repeatable Read: Same query returns different results
// - Phantom Read: New rows appear between queries
//
// ============================================================================

// 🔥 8. HOW DOES POSTGRESQL HANDLE NULL VALUES?
// ============================================================================
// Answer:
//
// NULL represents missing/unknown data (not empty string or zero).
//
// Key Points:
// - NULL != NULL (use IS NULL or IS NOT NULL)
// - NULL with any operator returns NULL (except IS NULL, IS NOT NULL)
// - Aggregation functions ignore NULL (except COUNT(*))
// - NULL in WHERE conditions can cause unexpected results
//
// Examples:
// --------
// -- Comparing with NULL (WRONG):
// SELECT * FROM users WHERE age = NULL;  -- Returns nothing!
//
// -- Correct way:
// SELECT * FROM users WHERE age IS NULL;
// SELECT * FROM users WHERE age IS NOT NULL;
//
// -- NULL in expressions:
// SELECT 5 + NULL;  -- Returns NULL
// SELECT NULL OR TRUE;  -- Returns TRUE
// SELECT NULL AND TRUE;  -- Returns NULL
//
// -- Aggregation with NULL:
// SELECT COUNT(*) FROM users;  -- Counts all rows (including NULLs)
// SELECT COUNT(age) FROM users;  -- Counts only non-NULL ages
// SELECT AVG(age) FROM users;  -- Ignores NULL values
//
// -- COALESCE (handles NULL):
// SELECT COALESCE(age, 0) FROM users;  -- Returns 0 if age is NULL
//
// -- NULLIF (converts value to NULL):
// SELECT NULLIF(age, 0) FROM users;  -- Returns NULL if age is 0
//
// ============================================================================

// 🔥 9. WHAT IS A SELF-JOIN? GIVE EXAMPLE
// ============================================================================
// Answer:
//
// Self-join: Joining a table with itself
// Used when comparing rows within the same table
// Requires table aliases (must distinguish between copies)
//
// Example - Employee Manager Hierarchy:
// -------------------------------------
// Table: employees
// id | name     | manager_id
// ---|----------|------------
// 1  | Alice    | NULL
// 2  | Bob      | 1
// 3  | Charlie  | 1
// 4  | David    | 2
//
// Query - Find employees with their manager names:
// SELECT e.name AS employee, m.name AS manager
// FROM employees e
// LEFT JOIN employees m ON e.manager_id = m.id;
//
// Result:
// employee | manager
// ---------|--------
// Alice    | NULL
// Bob      | Alice
// Charlie  | Alice
// David    | Bob
//
// Example - Find all pairs of employees with same salary:
// SELECT e1.name AS emp1, e2.name AS emp2, e1.salary
// FROM employees e1
// JOIN employees e2 ON e1.salary = e2.salary AND e1.id < e2.id;
// -- e1.id < e2.id prevents duplicate pairs (A-B and B-A)
//
// ============================================================================

// 🔥 10. EXPLAIN DIFFERENT INDEX TYPES IN POSTGRESQL
// ============================================================================
// Answer:
//
// 1. B-Tree Index (Default):
//    - Balanced tree structure
//    - Good for: Equality and range queries (=, <, >, BETWEEN)
//    - Example: CREATE INDEX idx_name ON users(name);
//
// 2. Hash Index:
//    - Hash table structure
//    - Good for: Equality only (=)
//    - Fast but limited
//    - Example: CREATE INDEX idx_hash ON users USING HASH (email);
//
// 3. GIN (Generalized Inverted Index):
//    - Good for: Arrays, full-text search, JSONB
//    - Slower updates but fast queries
//    - Example: CREATE INDEX idx_gin ON users USING GIN (tags);
//
// 4. GiST (Generalized Search Tree):
//    - Good for: Geometric data, full-text search, custom operators
//    - Flexible but can be slower than B-Tree
//    - Example: CREATE INDEX idx_gist ON locations USING GIST (point);
//
// 5. BRIN (Block Range Index):
//    - Good for: Large, naturally sorted tables
//    - Very small, fast for range queries
//    - Example: CREATE INDEX idx_brin ON log_entries USING BRIN (timestamp);
//
// 6. SP-GiST (Space-Partitioned GiST):
//    - Good for: Non-balanced data (trees, networks)
//    - Example: CREATE INDEX idx_spgist ON ip_addresses USING SPGIST (ip);
//
// Choosing Index Type:
// - B-Tree: Default choice for most cases
// - GIN: Arrays, JSONB, full-text
// - GiST: Geometric, full-text, custom types
// - BRIN: Large sorted tables
// - Hash: Equality only (rarely used)
//
// ============================================================================

// 🔥 11. WHAT IS VACUUM IN POSTGRESQL?
// ============================================================================
// Answer:
//
// VACUUM: Reclaims storage occupied by dead tuples (deleted/updated rows)
//
// Why needed:
// - MVCC creates new row versions instead of deleting
// - Old versions become "dead tuples"
// - Dead tuples take space but aren't visible
// - VACUUM marks space as reusable
//
// Types:
// ------
// 1. VACUUM (regular):
//    - Reclaims space
//    - Doesn't lock table
//    - Can run while database is active
//    - Example: VACUUM users;
//
// 2. VACUUM FULL:
//    - Reclaims space AND compacts table
//    - Locks table
//    - Slower but more effective
//    - Example: VACUUM FULL users;
//
// 3. VACUUM ANALYZE:
//    - Reclaims space AND updates statistics
//    - Statistics help query planner
//    - Example: VACUUM ANALYZE users;
//
// Auto-VACUUM:
// - PostgreSQL runs VACUUM automatically
// - Configured via autovacuum parameters
// - Usually sufficient for most cases
//
// When to run manually:
// - After bulk deletes/updates
// - If table size is unexpectedly large
// - Before performance-critical queries
//
// ============================================================================

// 🔥 12. EXPLAIN EXPLAIN ANALYZE
// ============================================================================
// Answer:
//
// EXPLAIN: Shows query execution plan (without running query)
// EXPLAIN ANALYZE: Shows plan AND runs query, showing actual times
//
// Understanding Output:
// --------------------
// EXPLAIN SELECT * FROM users WHERE id = 1;
//
// Output:
// Index Scan using users_pkey on users  (cost=0.00..8.27 rows=1 width=36)
//   Index Cond: (id = 1)
//
// Key Terms:
// - cost=0.00..8.27: Estimated cost (startup..total)
// - rows=1: Estimated rows returned
// - width=36: Estimated row width in bytes
//
// EXPLAIN ANALYZE adds:
// - Actual time: 0.123..0.124 ms
// - Actual rows: 1
// - Actual loops: 1
//
// Scan Types:
// -----------
// 1. Seq Scan (Sequential Scan):
//    - Scans entire table
//    - Slow for large tables
//    - Used when no index available
//
// 2. Index Scan:
//    - Uses index to find rows
//    - Fast
//    - Used when index available
//
// 3. Index Only Scan:
//    - All data from index (no table access)
//    - Fastest
//    - Used when all columns are in index
//
// 4. Bitmap Index Scan:
//    - Builds bitmap from index
//    - Good for multiple rows
//    - Used for range queries
//
// Optimization Tips:
// - Look for Seq Scan on large tables (may need index)
// - Compare estimated vs actual rows (statistics may be outdated)
// - Look for high costs (optimize those parts first)
//
// ============================================================================

// 🔥 13. WHAT IS A PARTIAL INDEX?
// ============================================================================
// Answer:
//
// Partial Index: Index on subset of rows (filtered by WHERE clause)
// Smaller than full index, faster to maintain
//
// Syntax:
// CREATE INDEX idx_name ON table_name(column) WHERE condition;
//
// Example:
// --------
// -- Full index (all rows):
// CREATE INDEX idx_active ON users(email);
//
// -- Partial index (only active users):
// CREATE INDEX idx_active ON users(email) WHERE is_active = TRUE;
//
// Benefits:
// - Smaller index size
// - Faster updates (only maintains subset)
// - Better performance for filtered queries
//
// Use Cases:
// - Indexing only recent data
// - Indexing only specific status values
// - Excluding NULL values
//
// Example - Recent orders only:
// CREATE INDEX idx_recent_orders ON orders(created_at)
// WHERE created_at > '2024-01-01';
//
// ============================================================================

// 🔥 14. WHAT IS A COMPOSITE INDEX AND INDEX COLUMN ORDER?
// ============================================================================
// Answer:
//
// Composite Index: Index on multiple columns
// Column order matters! Left-most columns are most important
//
// Example:
// --------
// CREATE INDEX idx_composite ON employees(department, salary, age);
//
// This index is useful for:
// - Queries on (department, salary, age)
// - Queries on (department, salary)
// - Queries on (department) only
//
// NOT useful for:
// - Queries on (salary) alone
// - Queries on (age) alone
// - Queries on (salary, department) (wrong order)
//
// Rule: Order columns by selectivity (most selective first)
//       But consider query patterns!
//
// Example Query:
// SELECT * FROM employees
// WHERE department = 'IT' AND salary > 50000;
// -- Index can be used (uses department, then salary)
//
// Example - Wrong Order:
// CREATE INDEX idx_wrong ON employees(salary, department);
// -- Won't help query: WHERE department = 'IT'
//
// ============================================================================

// 🔥 15. TRICKY QUERY: FIND NTH HIGHEST SALARY
// ============================================================================
// Answer:
//
// Problem: Find 3rd highest salary
//
// Solution 1 - Using LIMIT and OFFSET:
// -------------------------------------
// SELECT salary
// FROM employees
// ORDER BY salary DESC
// LIMIT 1 OFFSET 2;  -- Skip first 2, get next 1
//
// Solution 2 - Using Window Function:
// ------------------------------------
// SELECT salary
// FROM (
//   SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) as rnk
//   FROM employees
// ) ranked
// WHERE rnk = 3;
//
// Solution 3 - Using Subquery:
// -----------------------------
// SELECT MAX(salary)
// FROM employees
// WHERE salary < (
//   SELECT MAX(salary)
//   FROM employees
//   WHERE salary < (SELECT MAX(salary) FROM employees)
// );
//
// Handle Ties:
// ------------
// DENSE_RANK() treats ties as same rank (1, 2, 2, 3)
// ROW_NUMBER() gives unique numbers (1, 2, 3, 4)
// RANK() leaves gaps (1, 2, 2, 4)
//
// ============================================================================

// 🔥 16. TRICKY QUERY: DELETE DUPLICATES
// ============================================================================
// Answer:
//
// Problem: Delete duplicate rows, keep one
//
// Solution 1 - Using CTE and ROW_NUMBER():
// -----------------------------------------
// WITH ranked AS (
//   SELECT id,
//          ROW_NUMBER() OVER (PARTITION BY email ORDER BY id) as rn
//   FROM users
// )
// DELETE FROM users
// WHERE id IN (
//   SELECT id FROM ranked WHERE rn > 1
// );
//
// Solution 2 - Using Subquery:
// -----------------------------
// DELETE FROM users
// WHERE id NOT IN (
//   SELECT MIN(id)
//   FROM users
//   GROUP BY email
// );
//
// Solution 3 - Using EXISTS:
// ---------------------------
// DELETE FROM users u1
// WHERE EXISTS (
//   SELECT 1 FROM users u2
//   WHERE u2.email = u1.email AND u2.id < u1.id
// );
//
// ============================================================================

// 🔥 17. TRICKY QUERY: FIND EMPLOYEES EARNING MORE THAN THEIR MANAGER
// ============================================================================
// Answer:
//
// Problem: Compare employee salary with manager salary
//
// Solution - Self-Join:
// ---------------------
// SELECT e.name AS employee, e.salary,
//        m.name AS manager, m.salary AS manager_salary
// FROM employees e
// JOIN employees m ON e.manager_id = m.id
// WHERE e.salary > m.salary;
//
// Alternative - Correlated Subquery:
// -----------------------------------
// SELECT name, salary
// FROM employees e
// WHERE salary > (
//   SELECT salary FROM employees m WHERE m.id = e.manager_id
// );
//
// ============================================================================

// 🔥 18. TRICKY QUERY: FIND CONSECUTIVE RECORDS
// ============================================================================
// Answer:
//
// Problem: Find 3 consecutive login dates for users
//
// Solution - Using Window Functions:
// -----------------------------------
// WITH logins AS (
//   SELECT user_id, login_date,
//          LAG(login_date, 1) OVER (PARTITION BY user_id ORDER BY login_date) as prev1,
//          LAG(login_date, 2) OVER (PARTITION BY user_id ORDER BY login_date) as prev2
//   FROM user_logins
// )
// SELECT user_id, login_date
// FROM logins
// WHERE login_date = prev1 + INTERVAL '1 day'
//   AND prev1 = prev2 + INTERVAL '1 day';
//
// ============================================================================

// 🔥 19. TRICKY QUERY: PIVOT TABLE (ROWS TO COLUMNS)
// ============================================================================
// Answer:
//
// Problem: Convert rows to columns (pivot)
//
// Table: sales
// month | product | amount
// ------|---------|--------
// Jan   | A       | 100
// Jan   | B       | 200
// Feb   | A       | 150
//
// Desired Output:
// month | A   | B
// ------|-----|-----
// Jan   | 100 | 200
// Feb   | 150 | NULL
//
// Solution - Using CASE and Aggregation:
// ---------------------------------------
// SELECT month,
//        SUM(CASE WHEN product = 'A' THEN amount END) AS A,
//        SUM(CASE WHEN product = 'B' THEN amount END) AS B
// FROM sales
// GROUP BY month;
//
// PostgreSQL - Using crosstab (requires tablefunc extension):
// -----------------------------------------------------------
// CREATE EXTENSION IF NOT EXISTS tablefunc;
// SELECT * FROM crosstab(
//   'SELECT month, product, amount FROM sales ORDER BY 1,2'
// ) AS (month TEXT, A INT, B INT);
//
// ============================================================================

// 🔥 20. HOW DOES POSTGRESQL STORE DATA INTERNALLY?
// ============================================================================
// Answer:
//
// Storage Structure:
// ------------------
// 1. Tables stored in files (one per table)
// 2. Each table file divided into pages (8KB default)
// 3. Each page contains rows (tuples)
// 4. Rows have fixed header + variable data
//
// Tuple Structure:
// ----------------
// - Tuple header: Transaction IDs, visibility info, NULL bitmap
// - Data: Actual column values
// - TOAST: For large values (>2KB), stored separately
//
// MVCC Implementation:
// --------------------
// - xmin: Transaction that created tuple
// - xmax: Transaction that deleted tuple (or lock info)
// - Each update creates new tuple version
// - Old versions kept until VACUUM
//
// Write-Ahead Logging (WAL):
// ---------------------------
// - All changes written to WAL first
// - Ensures durability (can recover after crash)
// - Can be used for replication
//
// ============================================================================

// 🔥 21. WHAT IS A SEQUENCE IN POSTGRESQL?
// ============================================================================
// Answer:
//
// Sequence: Database object that generates unique numbers
// Used by SERIAL, BIGSERIAL data types
//
// Example:
// --------
// -- SERIAL creates sequence automatically:
// CREATE TABLE users (id SERIAL PRIMARY KEY, name VARCHAR(50));
//
// -- Behind the scenes:
// CREATE SEQUENCE users_id_seq;
// ALTER TABLE users ALTER COLUMN id SET DEFAULT nextval('users_id_seq');
//
// Manual Sequence:
// ----------------
// CREATE SEQUENCE order_number_seq START 1000;
// SELECT nextval('order_number_seq');  -- Returns: 1000, 1001, 1002...
//
// Sequence Functions:
// -------------------
// nextval('seq_name'): Get next value
// currval('seq_name'): Get current value
// setval('seq_name', value): Set value
//
// ============================================================================

// 🔥 22. EXPLAIN JSONB vs JSON IN POSTGRESQL
// ============================================================================
// Answer:
//
// JSON:
// - Stored as text (exact copy of input)
// - Faster inserts
// - Slower queries
// - Preserves whitespace, key order
//
// JSONB:
// - Stored as binary (decomposed format)
// - Slower inserts (parsing overhead)
// - Faster queries
// - Indexable (can create GIN indexes)
// - Doesn't preserve whitespace, key order
//
// Example:
// --------
// CREATE TABLE products (
//   id SERIAL PRIMARY KEY,
//   data_json JSON,
//   data_jsonb JSONB
// );
//
// INSERT INTO products (data_json, data_jsonb)
// VALUES ('{"name": "iPhone", "price": 999}', '{"name": "iPhone", "price": 999}');
//
// Querying:
// ---------
// SELECT data_json->>'name' FROM products;  -- JSON
// SELECT data_jsonb->>'name' FROM products;  -- JSONB (same syntax)
//
// Indexing JSONB:
// ---------------
// CREATE INDEX idx_jsonb ON products USING GIN (data_jsonb);
// SELECT * FROM products WHERE data_jsonb @> '{"name": "iPhone"}';
//
// When to Use:
// ------------
// JSON: Need exact formatting, simple storage
// JSONB: Need querying, indexing, better performance
//
// ============================================================================

// 🔥 23. WHAT IS A FULL OUTER JOIN AND WHEN TO USE IT?
// ============================================================================
// Answer:
//
// FULL OUTER JOIN: Returns all rows from both tables
// Missing matches filled with NULL
//
// Example:
// --------
// Table A:        Table B:
// id | name       id | city
// ---|-------     ---|--------
// 1  | Alice      1  | Delhi
// 2  | Bob        3  | Mumbai
// 3  | Charlie
//
// Query:
// SELECT a.name, b.city
// FROM table_a a
// FULL OUTER JOIN table_b b ON a.id = b.id;
//
// Result:
// name    | city
// --------|--------
// Alice   | Delhi
// Bob     | NULL
// Charlie | Mumbai
// NULL    | Mumbai
//
// When to Use:
// - Need all data from both tables
// - Finding what's missing in either table
// - Merging data from two sources
//
// Alternative - UNION of LEFT and RIGHT JOIN:
// -------------------------------------------
// SELECT a.name, b.city FROM table_a a LEFT JOIN table_b b ON a.id = b.id
// UNION
// SELECT a.name, b.city FROM table_a a RIGHT JOIN table_b b ON a.id = b.id;
//
// ============================================================================

// 🔥 24. EXPLAIN PREPARED STATEMENTS
// ============================================================================
// Answer:
//
// Prepared Statement: Pre-compiled SQL statement with parameters
// Benefits: Performance, security (prevents SQL injection)
//
// Example:
// --------
// PREPARE get_user AS
// SELECT * FROM users WHERE id = $1;
//
// EXECUTE get_user(1);
// EXECUTE get_user(2);
//
// DEALLOCATE get_user;
//
// Why Faster:
// - Query parsed and planned once
// - Reused for different parameters
// - Reduced parsing overhead
//
// SQL Injection Prevention:
// -------------------------
// -- Vulnerable:
// SELECT * FROM users WHERE name = '$user_input';  -- Can inject SQL
//
// -- Safe (with prepared statement):
// PREPARE safe_query AS SELECT * FROM users WHERE name = $1;
// EXECUTE safe_query('user_input');  -- Parameterized, safe
//
// ============================================================================

// 🔥 25. WHAT IS THE DIFFERENCE BETWEEN CHAR, VARCHAR, AND TEXT?
// ============================================================================
// Answer:
//
// CHAR(n):
// - Fixed length (n characters)
// - Padded with spaces
// - Faster for fixed-length data
// - Example: CHAR(10) - always 10 characters
//
// VARCHAR(n):
// - Variable length (max n characters)
// - No padding
// - Storage: actual length + overhead
// - Example: VARCHAR(255) - up to 255 characters
//
// TEXT:
// - Variable length (unlimited in PostgreSQL)
// - No length limit
// - Same as VARCHAR without limit
// - Example: TEXT - any length
//
// PostgreSQL Specific:
// - VARCHAR without length = TEXT
// - All three have same performance
// - TEXT recommended for most cases (simpler)
//
// When to Use:
// - CHAR: Fixed-length codes (e.g., 'USA', 'IND')
// - VARCHAR: Limited length (e.g., email, username)
// - TEXT: Unbounded text (e.g., descriptions, content)
//
// ============================================================================

// 💡 INTERVIEW TIPS:
// ============================================================================
// 1. Always explain your thought process
// 2. Mention trade-offs (performance vs maintainability)
// 3. Discuss optimization strategies
// 4. Show understanding of internals (MVCC, indexing, etc.)
// 5. Ask clarifying questions about requirements
// 6. Consider edge cases (NULL, duplicates, empty results)
// 7. Discuss alternative solutions
// 8. Mention best practices (indexes, constraints, normalization)
//
// Common Interview Topics:
// - Joins and subqueries
// - Window functions
// - Index optimization
// - Transaction isolation
// - MVCC and concurrency
// - Performance tuning
// - Data modeling
// - Query optimization
//
// ============================================================================

// ===================================================================
// HASHING, ENCODING, AND ENCRYPTION - COMPREHENSIVE GUIDE
// ===================================================================

## Hashing, Encoding, and Encryption Explained

**Key Differences:**

| Feature | Encoding | Encryption | Hashing |
|---------|----------|------------|---------|
| **Reversible?** | ✅ Yes (always) | ✅ Yes (with key) | ❌ No (one-way) |
| **Purpose** | Data format conversion | Data protection | Data integrity/verification |
| **Key Required?** | ❌ No | ✅ Yes | ❌ No |
| **Output Size** | Variable | Variable | Fixed (for same algorithm) |
| **Use Case** | Data transmission, storage | Secure communication | Password storage, checksums |

---

## 1. ENCODING

**What is Encoding?**
Encoding is the process of converting data from one format to another for **efficient transmission or storage**. It's **NOT for security** - it's easily reversible.

**Common Encoding Types:**

### Base64 Encoding
```javascript
// ========== Base64 Encoding ==========
// Purpose: Convert binary data to text format (safe for URLs, emails, etc.)

// Example 1: Basic Base64
const originalText = "Hello World";
const encoded = btoa(originalText);  // Browser API
console.log(encoded);  // "SGVsbG8gV29ybGQ="

const decoded = atob(encoded);
console.log(decoded);  // "Hello World"

// Example 2: Node.js Base64
const crypto = require('crypto');
const text = "Hello World";
const encoded2 = Buffer.from(text).toString('base64');
console.log(encoded2);  // "SGVsbG8gV29ybGQ="

const decoded2 = Buffer.from(encoded2, 'base64').toString('utf-8');
console.log(decoded2);  // "Hello World"

// Example 3: Base64 in URLs
const urlData = "user=john&id=123";
const urlEncoded = btoa(urlData);
const safeUrl = `https://api.example.com/data?token=${urlEncoded}`;
console.log(safeUrl);
// "https://api.example.com/data?token=dXNlcj1qb2huJmlkPTEyMw=="

// Edge case: Base64 increases size by ~33%
// Original: "Hello" (5 bytes)
// Base64: "SGVsbG8=" (8 bytes) - 60% larger
```

### URL Encoding (Percent Encoding)
```javascript
// ========== URL Encoding ==========
// Purpose: Make data safe for URLs (replace special characters)

// Example 1: Basic URL Encoding
const url = "https://example.com/search?q=hello world&page=1";
const encodedUrl = encodeURIComponent("hello world");
console.log(encodedUrl);  // "hello%20world"

const fullUrl = `https://example.com/search?q=${encodedUrl}&page=1`;
console.log(fullUrl);
// "https://example.com/search?q=hello%20world&page=1"

// Example 2: Encoding special characters
const specialChars = "user@example.com";
const encoded = encodeURIComponent(specialChars);
console.log(encoded);  // "user%40example.com"

const decoded = decodeURIComponent(encoded);
console.log(decoded);  // "user@example.com"

// Common URL encoded characters:
// Space → %20
// @ → %40
// # → %23
// & → %26
// = → %3D
```

### HTML Encoding
```javascript
// ========== HTML Encoding ==========
// Purpose: Prevent XSS attacks, display HTML as text

// Example 1: HTML Entity Encoding
function htmlEncode(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

const userInput = '<script>alert("XSS")</script>';
const safe = htmlEncode(userInput);
console.log(safe);  // "&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;"

// Example 2: Using built-in methods
const div = document.createElement('div');
div.textContent = '<script>alert("XSS")</script>';
console.log(div.innerHTML);  // "&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;"
```

**Encoding Summary:**
- ✅ Always reversible
- ✅ No key needed
- ✅ Not for security
- ✅ Used for data format conversion

---

## 2. ENCRYPTION

**What is Encryption?**
Encryption is the process of converting data into a **secure format** that can only be read by someone with the **decryption key**. It's **reversible** with the correct key.

**Two Main Types:**

### Symmetric Encryption (Same Key)
```javascript
// ========== Symmetric Encryption ==========
// Same key for encryption and decryption
// Fast, but key distribution is a challenge

// Example 1: AES Encryption (Node.js)
const crypto = require('crypto');

function encryptAES(text, secretKey) {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(secretKey, 'salt', 32);
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    encrypted: encrypted,
    iv: iv.toString('hex')
  };
}

function decryptAES(encryptedData, secretKey) {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(secretKey, 'salt', 32);
  const iv = Buffer.from(encryptedData.iv, 'hex');
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Usage:
const secretKey = "my-secret-key-12345";
const originalText = "Sensitive data: Credit card 1234-5678-9012-3456";

const encrypted = encryptAES(originalText, secretKey);
console.log("Encrypted:", encrypted.encrypted);
// "Encrypted: a1b2c3d4e5f6..." (encrypted hex string)

const decrypted = decryptAES(encrypted, secretKey);
console.log("Decrypted:", decrypted);
// "Decrypted: Sensitive data: Credit card 1234-5678-9012-3456"

// Edge case: Same plaintext + same key = different ciphertext (due to IV)
const encrypted1 = encryptAES("Hello", secretKey);
const encrypted2 = encryptAES("Hello", secretKey);
console.log(encrypted1.encrypted !== encrypted2.encrypted);  // true (different IV)
```

### Asymmetric Encryption (Public/Private Key)
```javascript
// ========== Asymmetric Encryption (RSA) ==========
// Different keys for encryption and decryption
// More secure, but slower

// Example 1: RSA Key Pair Generation
const crypto = require('crypto');

// Generate key pair
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

console.log("Public Key:", publicKey.substring(0, 50) + "...");
console.log("Private Key:", privateKey.substring(0, 50) + "...");

// Example 2: Encrypt with Public Key, Decrypt with Private Key
function encryptRSA(text, publicKey) {
  const buffer = Buffer.from(text, 'utf8');
  const encrypted = crypto.publicEncrypt(publicKey, buffer);
  return encrypted.toString('base64');
}

function decryptRSA(encryptedText, privateKey) {
  const buffer = Buffer.from(encryptedText, 'base64');
  const decrypted = crypto.privateDecrypt(privateKey, buffer);
  return decrypted.toString('utf8');
}

// Usage:
const message = "Secret message for recipient only";
const encrypted = encryptRSA(message, publicKey);
console.log("Encrypted:", encrypted);
// "Encrypted: aBcD1234..." (base64 encoded)

const decrypted = decryptRSA(encrypted, privateKey);
console.log("Decrypted:", decrypted);
// "Decrypted: Secret message for recipient only"

// Edge case: Cannot decrypt with public key (one-way for encryption)
// Only private key can decrypt what public key encrypted
```

### Hybrid Encryption (Best Practice)
```javascript
// ========== Hybrid Encryption ==========
// Combine symmetric + asymmetric encryption
// 1. Use symmetric encryption for data (fast)
// 2. Use asymmetric encryption for symmetric key (secure)

function hybridEncrypt(data, recipientPublicKey) {
  // Step 1: Generate random symmetric key
  const symmetricKey = crypto.randomBytes(32);
  
  // Step 2: Encrypt data with symmetric key (fast)
  const encryptedData = encryptAES(data, symmetricKey.toString('hex'));
  
  // Step 3: Encrypt symmetric key with recipient's public key (secure)
  const encryptedKey = encryptRSA(symmetricKey.toString('hex'), recipientPublicKey);
  
  return {
    encryptedData: encryptedData,
    encryptedKey: encryptedKey
  };
}

function hybridDecrypt(encryptedPackage, recipientPrivateKey) {
  // Step 1: Decrypt symmetric key with private key
  const symmetricKey = decryptRSA(encryptedPackage.encryptedKey, recipientPrivateKey);
  
  // Step 2: Decrypt data with symmetric key
  const data = decryptAES(encryptedPackage.encryptedData, symmetricKey);
  
  return data;
}
```

**Encryption Summary:**
- ✅ Reversible (with key)
- ✅ Requires key(s)
- ✅ For security/protection
- ✅ Two types: Symmetric (fast) and Asymmetric (secure)

---

## 3. HASHING

**What is Hashing?**
Hashing is a **one-way function** that converts data into a **fixed-size string**. It's **NOT reversible** - you cannot get original data from hash.

**Key Properties:**
1. **Deterministic**: Same input always produces same hash
2. **One-way**: Cannot reverse hash to get original data
3. **Fixed size**: Output always same length (for same algorithm)
4. **Avalanche effect**: Small input change = completely different hash

### Common Hashing Algorithms

```javascript
// ========== MD5 (Deprecated - Not Secure) ==========
// 128-bit hash, 32 hex characters
// ❌ DO NOT USE for security (collision vulnerabilities)

const crypto = require('crypto');

function hashMD5(text) {
  return crypto.createHash('md5').update(text).digest('hex');
}

const hash1 = hashMD5("Hello World");
console.log(hash1);  // "b10a8db164e0754105b7a99be72e3fe5"
const hash2 = hashMD5("Hello World");
console.log(hash1 === hash2);  // true (deterministic)

// Edge case: Different inputs can produce same hash (collision)
// This is why MD5 is insecure
```

### SHA-256 (Secure)
```javascript
// ========== SHA-256 Hashing ==========
// 256-bit hash, 64 hex characters
// ✅ Secure for most purposes

function hashSHA256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

const password = "myPassword123";
const hash = hashSHA256(password);
console.log("Hash:", hash);
// "Hash: a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3"

// Edge case: Same input = same hash (deterministic)
console.log(hashSHA256("test") === hashSHA256("test"));  // true

// Edge case: Small change = completely different hash
const hash1 = hashSHA256("Hello");
const hash2 = hashSHA256("hello");  // Only 'H' changed to 'h'
console.log(hash1 === hash2);  // false (avalanche effect)
```

### Password Hashing (with Salt)
```javascript
// ========== Password Hashing with Salt ==========
// NEVER store plaintext passwords!
// Use salt to prevent rainbow table attacks

// Example 1: bcrypt (Recommended for passwords)
const bcrypt = require('bcrypt');

async function hashPassword(password) {
  const saltRounds = 10;  // Higher = more secure but slower
  const hash = await bcrypt.hash(password, saltRounds);
  return hash;
}

async function verifyPassword(password, hash) {
  const isValid = await bcrypt.compare(password, hash);
  return isValid;
}

// Usage:
const userPassword = "mySecurePassword123";
const hashedPassword = await hashPassword(userPassword);
console.log("Hashed:", hashedPassword);
// "Hashed: $2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"

const isValid = await verifyPassword(userPassword, hashedPassword);
console.log("Valid:", isValid);  // true

// Edge case: Same password = different hash (due to random salt)
const hash1 = await hashPassword("password");
const hash2 = await hashPassword("password");
console.log(hash1 !== hash2);  // true (different salts)
```

### SHA-256 with Salt (Manual)
```javascript
// ========== SHA-256 with Salt ==========
// Manual salt implementation

function hashWithSalt(text, salt) {
  return crypto.createHash('sha256').update(text + salt).digest('hex');
}

function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

// Usage:
const password = "myPassword";
const salt = generateSalt();
const hashed = hashWithSalt(password, salt);

console.log("Salt:", salt);
console.log("Hashed:", hashed);

// Store both salt and hash in database
// When verifying: hashWithSalt(inputPassword, storedSalt) === storedHash
```

### Hash-based Message Authentication Code (HMAC)
```javascript
// ========== HMAC (Hash-based MAC) ==========
// Combines hashing with secret key
// Used for message authentication

function createHMAC(message, secretKey) {
  return crypto.createHmac('sha256', secretKey)
    .update(message)
    .digest('hex');
}

// Example: API Signature
const apiKey = "my-secret-api-key";
const message = "GET /api/users?page=1";
const signature = createHMAC(message, apiKey);

console.log("Signature:", signature);
// "Signature: a1b2c3d4e5f6..." (64 hex characters)

// Server verifies: createHMAC(receivedMessage, apiKey) === receivedSignature
```

### Use Cases for Hashing

```javascript
// ========== 1. Password Storage ==========
// ✅ DO: Store hash of password
// ❌ DON'T: Store plaintext password

const userPassword = "user123";
const passwordHash = hashSHA256(userPassword);
// Store passwordHash in database, NOT userPassword

// When user logs in:
const loginPassword = "user123";
const loginHash = hashSHA256(loginPassword);
if (loginHash === storedPasswordHash) {
  // Login successful
}

// ========== 2. Data Integrity (Checksums) ==========
// Verify file hasn't been tampered with

function calculateFileHash(filePath) {
  const fs = require('fs');
  const fileContent = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileContent).digest('hex');
}

// Download file, calculate hash, compare with published hash
const downloadedFileHash = calculateFileHash('./downloaded-file.zip');
const publishedHash = "a1b2c3d4e5f6...";
if (downloadedFileHash === publishedHash) {
  console.log("File integrity verified!");
} else {
  console.log("File may be corrupted or tampered!");
}

// ========== 3. Digital Signatures ==========
// Verify message authenticity

function signMessage(message, privateKey) {
  const sign = crypto.createSign('SHA256');
  sign.update(message);
  sign.end();
  return sign.sign(privateKey, 'hex');
}

function verifySignature(message, signature, publicKey) {
  const verify = crypto.createVerify('SHA256');
  verify.update(message);
  verify.end();
  return verify.verify(publicKey, signature, 'hex');
}

// ========== 4. Deduplication ==========
// Identify duplicate files/data

const file1Hash = hashSHA256(file1Content);
const file2Hash = hashSHA256(file2Content);
if (file1Hash === file2Hash) {
  console.log("Files are identical (deduplicate)");
}

// ========== 5. Blockchain ==========
// Each block contains hash of previous block
// Creates immutable chain

function createBlock(data, previousHash) {
  const block = {
    data: data,
    previousHash: previousHash,
    timestamp: Date.now()
  };
  block.hash = hashSHA256(JSON.stringify(block));
  return block;
}
```

**Hashing Summary:**
- ❌ NOT reversible (one-way)
- ❌ No key needed (but can use salt/secret)
- ✅ For data integrity, password storage
- ✅ Fixed output size
- ✅ Deterministic (same input = same output)

---

## COMPARISON TABLE

| Aspect | Encoding | Encryption | Hashing |
|--------|----------|------------|---------|
| **Reversible?** | ✅ Always | ✅ With key | ❌ Never |
| **Purpose** | Format conversion | Data protection | Integrity/verification |
| **Key Required?** | ❌ No | ✅ Yes | ❌ No (but salt helps) |
| **Output Size** | Variable | Variable | Fixed |
| **Security** | ❌ None | ✅ High | ✅ One-way security |
| **Speed** | ⚡ Very Fast | 🐢 Slower | ⚡ Fast |
| **Use Cases** | URLs, Base64, HTML | Secure communication | Passwords, checksums |

## REAL-WORLD EXAMPLES

```javascript
// ========== Example 1: User Registration ==========
// 1. User submits password
const userPassword = "myPassword123";

// 2. Hash password (NEVER store plaintext)
const hashedPassword = await hashPassword(userPassword);

// 3. Store in database
// users table: { email: "user@example.com", password: hashedPassword }

// ========== Example 2: API Authentication ==========
// 1. Client creates request
const apiKey = "secret-key-123";
const timestamp = Date.now();
const message = `GET /api/data?timestamp=${timestamp}`;

// 2. Create HMAC signature
const signature = createHMAC(message, apiKey);

// 3. Send request with signature
// Headers: { "X-API-Key": apiKey, "X-Signature": signature, "X-Timestamp": timestamp }

// 4. Server verifies signature
const serverSignature = createHMAC(`GET /api/data?timestamp=${timestamp}`, apiKey);
if (serverSignature === receivedSignature) {
  // Request is authentic
}

// ========== Example 3: Encrypted Database Fields ==========
// 1. Encrypt sensitive data before storing
const creditCard = "1234-5678-9012-3456";
const encryptedCard = encryptAES(creditCard, databaseKey);

// 2. Store encrypted data
// users table: { email: "user@example.com", card: encryptedCard }

// 3. Decrypt when needed
const decryptedCard = decryptAES(storedEncryptedCard, databaseKey);

// ========== Example 4: Secure File Transfer ==========
// 1. Encrypt file
const fileContent = fs.readFileSync('sensitive-document.pdf');
const encryptedFile = encryptAES(fileContent.toString('base64'), sharedKey);

// 2. Calculate hash for integrity
const fileHash = hashSHA256(fileContent);

// 3. Send both encrypted file and hash
// { encryptedFile: "...", hash: "a1b2c3..." }

// 4. Receiver decrypts and verifies
const decrypted = decryptAES(receivedEncryptedFile, sharedKey);
const receivedHash = hashSHA256(decrypted);
if (receivedHash === sentHash) {
  // File integrity verified
}
```

## BEST PRACTICES

```javascript
// ========== DO's and DON'Ts ==========

// ✅ DO: Use bcrypt/argon2 for passwords
const passwordHash = await bcrypt.hash(password, 10);

// ❌ DON'T: Use MD5/SHA-256 directly for passwords (no salt)
const badHash = hashSHA256(password);  // Vulnerable to rainbow tables

// ✅ DO: Use HTTPS (encryption) for data transmission
// ✅ DO: Encrypt sensitive data at rest (database)
// ✅ DO: Use HMAC for API authentication
const signature = createHMAC(message, secretKey);

// ❌ DON'T: Use encoding for security (Base64 is NOT encryption)
const encoded = btoa("password");  // NOT secure! Easily decoded

// ✅ DO: Use strong encryption algorithms (AES-256, RSA-2048+)
// ❌ DON'T: Use weak encryption (DES, RC4)

// ✅ DO: Store hashes, not plaintext passwords
// ❌ DON'T: Store passwords in plaintext

// ✅ DO: Use salt for password hashing
// ❌ DON'T: Hash passwords without salt
```

---

## SUMMARY

**Encoding:**
- Purpose: Format conversion (Base64, URL encoding)
- Reversible: ✅ Yes
- Security: ❌ None
- Example: `btoa("Hello")` → `"SGVsbG8="`

**Encryption:**
- Purpose: Data protection
- Reversible: ✅ Yes (with key)
- Security: ✅ High
- Example: AES encryption with secret key

**Hashing:**
- Purpose: Data integrity, password storage
- Reversible: ❌ No (one-way)
- Security: ✅ One-way security
- Example: SHA-256, bcrypt for passwords

**Remember:**
- 🔐 **Encryption** = Protect data (reversible with key)
- 🔒 **Hashing** = Verify integrity (one-way, not reversible)
- 📝 **Encoding** = Format conversion (not for security)