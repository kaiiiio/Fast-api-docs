**Architecture:**
```
Database
  ├── Collection 1
  │   ├── Document 1
  │   ├── Document 2
  │   └── Document 3
  └── Collection 2
      ├── Document 1
      └── Document 2
```

### MongoDB vs RDBMS

| Feature | MongoDB | RDBMS |
|---------|---------|-------|
| Data Model | Document-oriented | Table-based |
| Schema | Dynamic/Flexible | Fixed/Predefined |
| Relationships | Embedded documents | Foreign keys |
| Scaling | Horizontal (sharding) | Vertical (hardware) |
| Query Language | MongoDB Query Language | SQL |
| Transactions | Multi-document (4.0+) | ACID compliant |

### MongoDB vs MySQL

| Aspect | MongoDB | MySQL |
|--------|---------|-------|
| Storage | BSON documents | Tables with rows |
| Schema Changes | No migration needed | ALTER TABLE required |
| Joins | $lookup (limited) | Complex JOINs supported |
| Performance | Better for read-heavy | Better for complex queries |
| Use Case | Flexible, evolving schemas | Structured, relational data |

---

## 2. MongoDB Basics {#basics}

### Database, Collection, and Document

**Database**: Container for collections
**Collection**: Group of MongoDB documents (like a table)
**Document**: A record in BSON format (like a row)

```javascript
// Example Document Structure
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  name: "John Doe",
  age: 30,
  email: "john@example.com",
  address: {
    street: "123 Main St",
    city: "New York",
    zipcode: "10001"
  },
  hobbies: ["reading", "gaming", "cooking"]
}
```

### MongoDB Cursor
A cursor is a pointer to the result set of a query. It allows you to iterate through results efficiently.

```javascript
// Cursor example
const cursor = db.users.find({age: {$gt: 25}});

// Iterate through cursor
cursor.forEach(doc => {
  print(doc.name);
});

// Cursor methods
cursor.limit(10);     // Limit results
cursor.skip(5);       // Skip first 5 results
cursor.sort({age: -1}); // Sort by age descending
```

### Data Types in MongoDB

```javascript
{
  // String
  name: "Alice",
  
  // Number (Integer, Double, Long, Decimal128)
  age: 28,
  salary: 75000.50,
  
  // Boolean
  isActive: true,
  
  // Date
  createdAt: new Date(),
  
  // Array
  skills: ["JavaScript", "Python", "MongoDB"],
  
  // Object/Embedded Document
  address: {
    city: "Boston",
    country: "USA"
  },
  
  // ObjectId
  _id: ObjectId("507f1f77bcf86cd799439011"),
  
  // Null
  middleName: null,
  
  // Binary Data
  profilePic: BinData(0, "base64encodedstring"),
  
  // Regular Expression
  pattern: /^test/i,
  
  // Timestamp
  lastModified: Timestamp(1622547600, 1)
}
```

### ObjectId in MongoDB
ObjectId is a 12-byte unique identifier automatically generated for the `_id` field.

**Structure (24 hex characters):**
- 4 bytes: Timestamp (seconds since Unix epoch)
- 5 bytes: Random value
- 3 bytes: Incrementing counter

```javascript
// Creating ObjectId
const id = new ObjectId();
console.log(id); // 507f1f77bcf86cd799439011

// Extract timestamp
const timestamp = id.getTimestamp();
console.log(timestamp); // Date object

// Convert string to ObjectId
const objId = ObjectId("507f1f77bcf86cd799439011");
```

### MongoDB Query
A query is a request to retrieve or manipulate data from MongoDB collections.

```javascript
// Basic query structure
db.collection.find(
  { filter },      // What to find
  { projection }   // What fields to return
)
```

### Introduction to JSON
JSON (JavaScript Object Notation) is a lightweight data-interchange format.

```json
{
  "name": "Alice",
  "age": 30,
  "skills": ["MongoDB", "Node.js"],
  "address": {
    "city": "NYC",
    "zipcode": "10001"
  }
}
```

### Introduction to BSON
BSON (Binary JSON) is MongoDB's binary representation of JSON with additional data types.

**What is BSON?**
- BSON = Binary JSON (JSON का binary format)
- MongoDB internally stores data as BSON (not JSON)
- JSON से convert होता है storage के लिए, और वापस JSON में convert होता है retrieval के लिए

**JSON vs BSON - Detailed Comparison:**

```javascript
// ========== JSON (JavaScript Object Notation) ==========
// JSON - Text-based, human-readable format
// Limited data types: string, number, boolean, null, object, array

const jsonExample = {
  "name": "John",
  "age": 30,                    // JSON में सिर्फ number (int/float difference नहीं)
  "isActive": true,
  "birthdate": "1993-01-15",    // JSON में date string के रूप में (actual Date type नहीं)
  "salary": 50000.50,
  "tags": ["developer", "react"],
  "address": null
};

// JSON Limitations:
// ❌ No Date type (stored as string)
// ❌ No distinction between int32, int64, double
// ❌ No Binary data type
// ❌ No ObjectId type
// ❌ No Decimal128 type
// ❌ No Timestamp type
// ❌ No Regular Expression type

// ========== BSON (Binary JSON) ==========
// BSON - Binary format, machine-readable
// Extended data types: All JSON types + additional MongoDB types

const bsonExample = {
  name: "John",
  age: NumberInt(30),                    // BSON में int32 type
  isActive: true,
  birthdate: ISODate("1993-01-15"),      // BSON में actual Date type
  salary: NumberDecimal("50000.50"),      // BSON में Decimal128 (precise decimal)
  tags: ["developer", "react"],
  address: null,
  _id: ObjectId("507f1f77bcf86cd799439011"),  // BSON में ObjectId type
  profileImage: BinData(0, "base64data"),     // BSON में Binary data
  createdAt: new Timestamp(),                  // BSON में Timestamp type
  regex: /pattern/i                            // BSON में RegExp type
};

// BSON Advantages:
// ✅ Date type (ISODate) - proper date handling
// ✅ Number types: Int32, Int64, Double, Decimal128
// ✅ Binary data type (BinData) - for images, files
// ✅ ObjectId type - unique identifiers
// ✅ Timestamp type - for versioning
// ✅ RegExp type - for pattern matching
// ✅ Traversable - length prefixes for fast scanning
// ✅ Efficient storage - binary format is smaller
```

**Key Differences:**

| Feature | JSON | BSON |
|---------|------|------|
| **Format** | Text-based (human-readable) | Binary (machine-readable) |
| **Data Types** | 6 types (string, number, boolean, null, object, array) | 20+ types (includes Date, ObjectId, Binary, etc.) |
| **Size** | Larger (text format) | Smaller (binary encoding) |
| **Parsing Speed** | Slower (text parsing) | Faster (binary parsing) |
| **Date Handling** | String only | Native Date type |
| **Number Types** | Generic number | Int32, Int64, Double, Decimal128 |
| **Binary Data** | Base64 string | Native BinData type |
| **Traversability** | Must parse entire document | Can skip fields (length prefixes) |

**Practical Example:**

```javascript
// JSON Example (what you send/receive from API)
const jsonDoc = {
  "_id": "507f1f77bcf86cd799439011",
  "name": "John",
  "age": 30,
  "birthdate": "1993-01-15T00:00:00.000Z",
  "profileImage": "data:image/png;base64,iVBORw0KGgo..."
};

// BSON Example (what MongoDB stores internally)
const bsonDoc = {
  _id: ObjectId("507f1f77bcf86cd799439011"),  // Edge case: ObjectId instead of string
  name: "John",
  age: NumberInt(30),                          // Edge case: Specific int type
  birthdate: ISODate("1993-01-15"),            // Edge case: Actual Date object
  profileImage: BinData(0, Buffer.from("...")) // Edge case: Binary data type
};

// When you query MongoDB:
// 1. MongoDB stores as BSON (binary)
// 2. MongoDB driver converts BSON → JSON (for JavaScript)
// 3. You receive JSON in your application
// 4. When you save, JSON → BSON conversion happens automatically
```

**Why BSON is Better for MongoDB:**

1. **Type Safety**: 
   - JSON: `{"age": 30}` - क्या यह int है या float? पता नहीं
   - BSON: `{age: NumberInt(30)}` - clearly int32 type

2. **Date Handling**:
   - JSON: `"1993-01-15"` - string, date operations नहीं कर सकते
   - BSON: `ISODate("1993-01-15")` - actual Date, queries में use कर सकते हैं

3. **Performance**:
   - JSON: पूरा document parse करना पड़ता है
   - BSON: Length prefixes की वजह से specific fields skip कर सकते हैं (faster)

4. **Storage Efficiency**:
   - JSON: Text format - larger size
   - BSON: Binary format - compressed, smaller size

**Edge Cases:**

```javascript
// Edge case: JSON में number precision issue
{"price": 0.1 + 0.2}  // Result: 0.30000000000000004 (floating point error)

// Edge case: BSON में Decimal128 - precise decimal
{price: NumberDecimal("0.3")}  // Result: 0.3 (exact, no precision loss)

// Edge case: JSON में date comparison नहीं कर सकते
{"createdAt": "2024-01-15"}  // String comparison only

// Edge case: BSON में date queries कर सकते हैं
{createdAt: ISODate("2024-01-15")}  // Can use $gte, $lte, date functions
```

**Detailed Explanation of BSON Types:**

```javascript
// ========== BSON Data Types Deep Dive ==========

// 1. Number Types in BSON
{
  smallNumber: NumberInt(30),        // 32-bit integer (-2^31 to 2^31-1)
  bigNumber: NumberLong(9007199254740991),  // 64-bit integer (for very large numbers)
  decimal: NumberDecimal("123.456"), // 128-bit decimal (precise for financial data)
  double: 123.456                    // 64-bit floating point (standard JavaScript number)
}

// Edge case: JavaScript number is 64-bit float (double precision)
// JSON always treats numbers as doubles - no way to specify int32 or int64
// BSON allows explicit type specification for better type safety

// 2. Date and Timestamp Types
{
  createdAt: ISODate("2024-01-15T10:30:00Z"),  // Date type - stores exact date/time
  updatedAt: new Timestamp(),                   // Timestamp type - MongoDB internal versioning
  timestampValue: Timestamp(0, 1234567890)      // Timestamp with time_t and increment
}

// Edge case: ISODate allows date queries and operations
db.collection.find({ createdAt: { $gte: ISODate("2024-01-01") } })

// Edge case: JSON date strings require parsing and string comparison
// BSON dates allow native date operations and indexing

// 3. ObjectId Type
{
  _id: ObjectId("507f1f77bcf86cd799439011")  // 12-byte unique identifier
}

// Edge case: ObjectId structure:
// - 4 bytes: Unix timestamp (when created)
// - 5 bytes: Random value (machine + process unique)
// - 3 bytes: Counter (starts random, increments)

// Edge case: ObjectId is sortable by creation time
// JSON string IDs require manual sorting logic

// 4. Binary Data Type
{
  image: BinData(0, Buffer.from("binarydata")),      // Generic binary subtype
  imageUuid: BinData(3, "uuid-binary"),              // UUID subtype
  imageMd5: BinData(5, "md5-hash-binary")            // MD5 subtype
}

// Edge case: BSON BinData is more efficient than JSON base64 strings
// JSON: Base64 encoding increases size by ~33%
// BSON: Stores binary directly, no encoding overhead

// 5. Regular Expression Type
{
  pattern: /^[A-Z][a-z]+$/i,        // RegExp type - can be indexed and queried
  emailPattern: /^[\w\.-]+@[\w\.-]+\.\w+$/
}

// Edge case: BSON RegExp allows indexing regex patterns
// JSON regex stored as strings - cannot be indexed efficiently

// 6. Undefined and Null Types
{
  value: null,              // Null type - explicitly no value
  // undefined not supported in JSON but supported in BSON
}

// Edge case: JSON doesn't support undefined (converts to null)
// BSON preserves undefined as separate type from null
```

**How BSON Length Prefixes Work:**

```javascript
// BSON Structure with Length Prefixes:
// [total_length][field1_type][field1_name][field1_value][field2_type][field2_name][field2_value]...[\0]

// Example: { name: "John", age: 30 }
// Byte structure:
// - 4 bytes: Total document length (e.g., 45 bytes)
// - 1 byte: Field type (0x02 = string)
// - 5 bytes: Field name "name"
// - \0: Name terminator
// - 4 bytes: String length
// - 4 bytes: "John"
// - 1 byte: Field type (0x10 = int32)
// - 4 bytes: Field name "age"
// - \0: Name terminator
// - 4 bytes: Value (30)
// - 1 byte: Document terminator (\0)

// Edge case: Length prefixes allow MongoDB to:
// 1. Skip entire documents without parsing (if size check fails)
// 2. Jump to specific fields (knowing exact byte positions)
// 3. Efficiently scan large collections (fast size checks)
// 4. Avoid parsing entire document when filtering by first few fields

// JSON requires full parsing:
// - Must read entire document as string
// - Must parse entire string to JSON
// - Cannot skip any part until fully parsed
```

**Real-World Conversion Example:**

```javascript
// JavaScript Object (what you write in code)
const user = {
  name: "John",
  age: 30,
  createdAt: new Date("2024-01-15"),
  profileImage: Buffer.from("binarydata")
};

// Step 1: JavaScript → JSON (when sending to API)
const jsonString = JSON.stringify(user);
// Result: {"name":"John","age":30,"createdAt":"2024-01-15T00:00:00.000Z","profileImage":"YmluYXJ5ZGF0YQ=="}
// Edge case: Date becomes string, Buffer becomes base64 string

// Step 2: JSON → BSON (when saving to MongoDB)
// MongoDB driver automatically converts:
// - String dates → ISODate
// - Base64 strings → BinData
// - Numbers → NumberInt or Double (based on value)
// Result stored in BSON format (binary)

// Step 3: BSON → JSON (when retrieving from MongoDB)
// MongoDB driver converts back:
// - ISODate → Date string in JSON
// - BinData → Base64 string in JSON
// - ObjectId → String in JSON
// Result: JSON that JavaScript can use

// Edge case: Type information is lost in JSON round-trip
// BSON preserves exact types, JSON converts everything to basic types
```

**Performance Comparison:**

```javascript
// Example: 1 million documents, each 1KB

// JSON Storage:
// - Text format: ~1KB per document = 1GB total
// - Parsing: Must parse entire document (1KB) to access any field
// - Indexing: Slower (text-based comparison)
// - Network transfer: Larger payloads

// BSON Storage:
// - Binary format: ~800 bytes per document = 800MB total (20% smaller)
// - Parsing: Can skip fields using length prefixes
// - Indexing: Faster (binary comparison)
// - Network transfer: Smaller payloads (compressed)

// Edge case: BSON traversability example
// Document: { a: {...large object...}, b: 30, c: "value" }
// Query: Find documents where b = 30

// JSON: Must parse entire document including large object 'a' before checking 'b'
// BSON: Can skip field 'a' by reading its length prefix, jump directly to 'b'
```

---

## 3. MongoDB Setup {#setup}

### MongoDB Atlas (Cloud)
MongoDB Atlas is a fully-managed cloud database service.

**Setup Steps:**
1. Sign up at mongodb.com/cloud/atlas
2. Create a cluster (free tier available)
3. Create database user
4. Whitelist IP address
5. Get connection string

```javascript
// Connection string format
mongodb+srv://username:password@cluster.mongodb.net/dbname
```

### MongoDB Compass (GUI)
MongoDB Compass is the official GUI for MongoDB.

**Features:**
- Visual query builder
- Schema analysis
- Performance monitoring
- Index management
- Data visualization

**Usage:**
1. Download from mongodb.com/products/compass
2. Install and open
3. Connect using connection string
4. Browse databases and collections visually

### MongoDB Shell (mongosh)
Interactive JavaScript shell for MongoDB.

**Installation:**
```bash
# Install mongosh
npm install -g mongosh

# Connect to MongoDB
mongosh "mongodb://localhost:27017"

# Connect to Atlas
mongosh "mongodb+srv://cluster.mongodb.net/mydb" --username user
```

**Basic Commands:**
```javascript
// Show databases
show dbs

// Switch/create database
use myDatabase

// Show collections
show collections

// Get help
help
db.help()
```

---

## 4. Database and Collection Operations {#database-operations}

### Create Database

**Method 1: Using MongoDB Shell**
```javascript
// Switch to new database (creates if doesn't exist)
use myNewDatabase

// Database is created when you insert first document
db.users.insertOne({name: "Alice"})

// Verify
show dbs
```

**Method 2: Using MongoDB Compass**
1. Click "Create Database"
2. Enter database name
3. Enter initial collection name
4. Click "Create Database"

**Example:**
```javascript
// Create e-commerce database
use ecommerce

// Create first collection
db.createCollection("products")

// Insert sample document
db.products.insertOne({
  name: "Laptop",
  price: 999.99,
  category: "Electronics"
})
```

### Drop Database

```javascript
// Switch to database
use myDatabase

// Drop current database
db.dropDatabase()

// Returns: { "ok" : 1 }
```

**Example with confirmation:**
```javascript
use testDatabase
db.dropDatabase()

// Output:
// { "dropped" : "testDatabase", "ok" : 1 }
```

### Create Collection

**Method 1: Explicit Creation**
```javascript
// Basic creation
db.createCollection("users")

// With options
db.createCollection("orders", {
  capped: true,           // Fixed size
  size: 100000,          // Max size in bytes
  max: 5000,             // Max documents
  validator: {           // Schema validation
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "email"],
      properties: {
        name: {
          bsonType: "string",
          description: "must be a string and required"
        },
        email: {
          bsonType: "string",
          pattern: "^.+@.+$",
          description: "must be a valid email"
        }
      }
    }
  }
})
```

**Method 2: Implicit Creation**
```javascript
// Collection created automatically on first insert
db.newCollection.insertOne({name: "Auto-created"})
```

### Drop Collection

```javascript
// Method 1: drop()
db.users.drop()
// Returns: true if successful

// Method 2: Using deleteMany() (empties but keeps collection)
db.users.deleteMany({})

// Example
use ecommerce
db.oldProducts.drop()
// Output: true
```

---

## 5. CRUD Operations {#crud-operations}

## INSERT OPERATIONS

### insertOne()
Inserts a single document into a collection.

```javascript
// Basic syntax
db.collection.insertOne(document, options)

// Example 1: Simple insert
db.users.insertOne({
  name: "John Doe",
  email: "john@example.com",
  age: 30
})

// Returns:
// {
//   acknowledged: true,
//   insertedId: ObjectId("...")
// }

// Example 2: With explicit _id
db.users.insertOne({
  _id: "user001",
  name: "Alice Smith",
  role: "admin",
  createdAt: new Date()
})

// Example 3: Nested document
db.products.insertOne({
  name: "MacBook Pro",
  price: 1999.99,
  specs: {
    processor: "M2",
    ram: "16GB",
    storage: "512GB"
  },
  tags: ["laptop", "apple", "premium"]
})
```

### insertMany()
Inserts multiple documents in a single operation.

```javascript
// Basic syntax
db.collection.insertMany([document1, document2, ...], options)

// Example 1: Multiple users
db.users.insertMany([
  {
    name: "Bob Wilson",
    email: "bob@example.com",
    age: 25
  },
  {
    name: "Carol Davis",
    email: "carol@example.com",
    age: 35
  },
  {
    name: "David Brown",
    email: "david@example.com",
    age: 28
  }
])

// Returns:
// {
//   acknowledged: true,
//   insertedIds: {
//     '0': ObjectId("..."),
//     '1': ObjectId("..."),
//     '2': ObjectId("...")
//   }
// }

// Example 2: With ordered insertion (default)
db.products.insertMany([
  {name: "Product A", price: 10},
  {name: "Product B", price: 20},
  {name: "Product C", price: 30}
], {ordered: true}) // Stops on first error

// Example 3: Unordered insertion
db.products.insertMany([
  {name: "Item 1", stock: 100},
  {name: "Item 2", stock: 200},
  {name: "Item 3", stock: 150}
], {ordered: false}) // Continues after errors
```

### insert() (Deprecated)
Legacy method that can insert one or multiple documents.

```javascript
// Single document
db.users.insert({name: "Old Method", age: 40})

// Multiple documents
db.users.insert([
  {name: "User 1"},
  {name: "User 2"}
])

// Note: Use insertOne() or insertMany() instead
```

---

## UPDATE OPERATIONS

### updateOne()
Updates the first document matching the filter.

```javascript
// Basic syntax
db.collection.updateOne(filter, update, options)

// Example 1: Update single field
db.users.updateOne(
  {name: "John Doe"},           // Filter
  {$set: {age: 31}}            // Update
)

// Returns:
// {
//   acknowledged: true,
//   matchedCount: 1,
//   modifiedCount: 1
// }

// Example 2: Update nested field
db.users.updateOne(
  {email: "john@example.com"},
  {$set: {"address.city": "Boston"}}
)

// Example 3: Multiple operations
db.products.updateOne(
  {name: "MacBook Pro"},
  {
    $set: {price: 1899.99},
    $inc: {views: 1},
    $currentDate: {lastModified: true}
  }
)

// Example 4: Upsert (insert if not found)
db.users.updateOne(
  {email: "newuser@example.com"},
  {
    $set: {name: "New User", age: 25}
  },
  {upsert: true}
)
```

**What is `$` (Dollar Sign) in MongoDB?**

The `$` (dollar sign) is a **prefix** used by MongoDB to indicate **operators** - special keywords that tell MongoDB to perform specific operations. It distinguishes MongoDB operators from regular field names in your documents.

```javascript
// ========== WHY $ SIGN? ==========
// MongoDB uses $ prefix to differentiate between:
// 1. Field names (your data) - no $
// 2. MongoDB operators (commands) - with $

// Example:
{
  name: "John",        // Field name (your data)
  $set: {age: 30}      // Operator (MongoDB command) - WRONG! $set not allowed as field name
}

// Field names cannot start with $
// Operators must start with $
```

**Three Main Categories of $ Operators:**

```javascript
// ========== 1. UPDATE OPERATORS ($set, $inc, $push, etc.) ==========
// Used in update operations to modify documents

db.products.updateOne(
  {name: "MacBook Pro"},
  {
    $set: {price: 1899.99},           // Set value (replace if exists, create if not)
    $inc: {views: 1},                  // Increment by 1
    $currentDate: {lastModified: true} // Set to current date/time
  }
)

// Common Update Operators:
// $set       - Set field value
// $inc       - Increment numeric value
// $push      - Add to array
// $pull      - Remove from array
// $unset     - Remove field
// $rename    - Rename field
// $mul       - Multiply numeric value
// $min/$max  - Update only if new value is min/max
// $currentDate - Set to current date/time

// ========== 2. QUERY OPERATORS ($lt, $gt, $in, $or, etc.) ==========
// Used in queries to filter documents

db.users.find({
  age: {$lt: 30},              // Less than 30
  city: {$in: ["NYC", "LA"]},  // In array
  $or: [                        // Logical OR
    {status: "active"},
    {status: "pending"}
  ]
})

// Common Query Operators:
// $eq        - Equal to
// $ne        - Not equal to
// $gt        - Greater than
// $gte       - Greater than or equal
// $lt        - Less than
// $lte       - Less than or equal
// $in        - Value in array
// $nin       - Value not in array
// $exists    - Field exists
// $regex     - Pattern matching
// $or        - Logical OR
// $and       - Logical AND
// $not       - Logical NOT
// $nor       - Logical NOR

// ========== 3. AGGREGATION OPERATORS ($match, $group, $project, etc.) ==========
// Used in aggregation pipeline for data processing

db.orders.aggregate([
  {$match: {status: "completed"}},    // Filter documents
  {$group: {                          // Group by field
    _id: "$customerId",               // Note: $customerId (field reference, not operator)
    total: {$sum: "$amount"}          // Sum aggregation
  }},
  {$sort: {total: -1}}                // Sort results
])

// Common Aggregation Operators:
// $match     - Filter documents (like find)
// $group     - Group documents
// $project   - Select fields (like SELECT in SQL)
// $sort      - Sort documents
// $limit     - Limit number of documents
// $skip      - Skip documents
// $sum       - Sum values
// $avg       - Average values
// $min/$max  - Min/max values
// $count     - Count documents
```

**Important Distinctions:**

```javascript
// ========== $ in Field Reference vs $ as Operator ==========

// In Aggregation Pipeline:
db.orders.aggregate([
  {
    $group: {                         // $group = operator (MongoDB command)
      _id: "$customerId",             // $customerId = field reference (references field name)
      total: {$sum: "$amount"}        // $sum = operator, $amount = field reference
    }
  }
])

// Key Difference:
// - $group, $sum = Operators (tell MongoDB what to do)
// - $customerId, $amount = Field references (which field to use)

// ========== Field Names CANNOT Start with $ ==========

// ❌ INVALID - Field name starting with $
db.collection.insertOne({
  $name: "John",    // Error: Field names cannot start with $
  age: 30
})

// ✅ VALID - Regular field names
db.collection.insertOne({
  name: "John",     // Valid field name
  age: 30
})

// ========== Edge Cases ==========

// Edge case: Using $ in field names (nested, escaped)
// MongoDB allows $ in middle or end of field names, just not at start
db.collection.insertOne({
  "user$name": "John",        // ✅ Valid (not at start)
  "price$USD": 100,           // ✅ Valid
  "$invalid": "value"         // ❌ Invalid (starts with $)
})

// Edge case: $set vs $setOnInsert
db.collection.updateOne(
  {email: "test@example.com"},
  {
    $set: {name: "Test"},           // Always updates
    $setOnInsert: {createdAt: new Date()}  // Only sets if document is inserted (not updated)
  },
  {upsert: true}
)

// Edge case: $expr for comparing fields
db.users.find({
  $expr: {$gt: ["$salary", "$budget"]}  // Compare two fields
})
// $expr = operator to use expressions
// $salary, $budget = field references
```

**Summary:**

| Type | Purpose | Example |
|------|---------|---------|
| **Update Operator** | Modify documents | `$set`, `$inc`, `$push` |
| **Query Operator** | Filter documents | `$lt`, `$gt`, `$in`, `$or` |
| **Aggregation Operator** | Process data pipeline | `$match`, `$group`, `$project` |
| **Field Reference** | Reference field in aggregation | `"$fieldName"` (in quotes) |
| **Field Name** | Cannot start with `$` | `name: "John"` ✅ |
///////////////////////////////////////////
### updateMany()
Updates all documents matching the filter.

```javascript
// Basic syntax
db.collection.updateMany(filter, update, options)

// Example 1: Update multiple documents
db.users.updateMany(
  {age: {$lt: 30}},              // All users under 30
  {$set: {category: "young"}}
)

// Returns:
// {
//   acknowledged: true,
//   matchedCount: 15,
//   modifiedCount: 15
// }

// Example 2: Increment field for all
db.products.updateMany(
  {category: "Electronics"},
  {$inc: {price: 50}}           // Add $50 to all
)

// Example 3: Update array elements
db.users.updateMany(
  {},                            // All documents
  {$push: {notifications: "New feature released"}}
)

// Example 4: Multiple conditions
db.orders.updateMany(
  {
    status: "pending",
    createdAt: {$lt: new Date("2024-01-01")}
  },
  {
    $set: {status: "cancelled"},
    $currentDate: {cancelledAt: true}
  }
)
```

### update() (Deprecated)
Legacy update method.

```javascript
// Update one
db.users.update(
  {name: "John"},
  {$set: {age: 35}}
)

// Update many
db.users.update(
  {age: {$lt: 30}},
  {$set: {status: "active"}},
  {multi: true}  // Required for multiple
)

// Note: Use updateOne() or updateMany() instead
```

### replaceOne()
Replaces entire document (except _id).

```javascript
// Basic syntax
db.collection.replaceOne(filter, replacement, options)

// Example 1: Complete replacement
db.users.replaceOne(
  {name: "John Doe"},
  {
    name: "John Doe",
    email: "john.new@example.com",
    age: 31,
    status: "active",
    updatedAt: new Date()
  }
)

// Example 2: With upsert
db.settings.replaceOne(
  {userId: "user123"},
  {
    userId: "user123",
    theme: "dark",
    notifications: true,
    language: "en"
  },
  {upsert: true}
)

// Warning: All old fields are removed!
// Before: {name: "John", age: 30, email: "john@ex.com", hobbies: ["reading"]}
// After:  {name: "John", age: 31}  // email and hobbies are gone!
```

---

## DELETE OPERATIONS

### deleteOne()
Deletes the first document matching the filter.

```javascript
// Basic syntax
db.collection.deleteOne(filter, options)

// Example 1: Delete by _id
db.users.deleteOne({_id: ObjectId("507f1f77bcf86cd799439011")})

// Returns:
// {
//   acknowledged: true,
//   deletedCount: 1
// }

// Example 2: Delete by condition
db.users.deleteOne({email: "user@example.com"})

// Example 3: Delete oldest document
db.logs.deleteOne(
  {},
  {sort: {createdAt: 1}}  // Sort ascending, delete first
)
```

### deleteMany()
Deletes all documents matching the filter.

```javascript
// Basic syntax
db.collection.deleteMany(filter, options)

// Example 1: Delete by condition
db.users.deleteMany({status: "inactive"})

// Returns:
// {
//   acknowledged: true,
//   deletedCount: 23
// }

// Example 2: Delete all documents
db.tempData.deleteMany({})

// Example 3: Delete with date range
db.logs.deleteMany({
  createdAt: {
    $lt: new Date("2023-01-01")
  }
})

// Example 4: Multiple conditions
db.products.deleteMany({
  stock: 0,
  discontinued: true
})
```

### remove() (Deprecated)
Legacy delete method.

```javascript
// Remove one
db.users.remove({name: "John"}, {justOne: true})

// Remove many
db.users.remove({status: "inactive"})

// Remove all
db.users.remove({})

// Note: Use deleteOne() or deleteMany() instead
```

---

## 6. Query Operations {#query-operations}

### find()
Retrieves documents matching the query criteria.

```javascript
// Basic syntax
db.collection.find(query, projection)

// Example 1: Find all documents
db.users.find()

// Example 2: Find with filter
db.users.find({age: 30})

// Example 3: Find with multiple conditions
db.users.find({
  age: {$gte: 25},
  status: "active"
})

// Example 4: Projection (select specific fields)
db.users.find(
  {age: {$gt: 25}},
  {name: 1, email: 1, _id: 0}  // Include name, email; exclude _id
)

// Example 5: Find nested fields
db.users.find({"address.city": "New York"})

// Example 6: Array queries
db.users.find({hobbies: "reading"})  // Array contains value

// Example 7: Regex search
db.users.find({name: /^John/i})  // Case-insensitive starts with "John"

// Example 8: With cursor methods
db.users.find({age: {$gt: 25}})
  .sort({age: -1})    // Sort descending
  .limit(10)          // First 10 results
  .skip(5)            // Skip first 5

// Example 9: Pretty print
db.users.find().pretty()
```

### findOne()
Returns the first document matching the query.

```javascript
// Basic syntax
db.collection.findOne(query, projection)

// Example 1: Find by _id
db.users.findOne({_id: ObjectId("507f1f77bcf86cd799439011")})

// Example 2: Find with condition
const user = db.users.findOne({email: "john@example.com"})
print(user.name)

// Example 3: With projection
db.users.findOne(
  {status: "active"},
  {name: 1, email: 1}
)

// Example 4: Find latest document
db.orders.findOne(
  {},
  {sort: {createdAt: -1}}
)

// Returns: Single document or null
```

### findAndModify()
Finds and modifies a document atomically.

```javascript
// Basic syntax
db.collection.findAndModify({
  query: {},
  update: {},
  options
})

// Example 1: Find and update
db.users.findAndModify({
  query: {name: "John"},
  update: {$set: {age: 31}},
  new: true  // Return updated document
})

// Example 2: Find and remove
db.users.findAndModify({
  query: {status: "inactive"},
  remove: true
})

// Example 3: Upsert
db.counters.findAndModify({
  query: {_id: "page_views"},
  update: {$inc: {count: 1}},
  upsert: true,
  new: true
})

// Example 4: With sort
db.queue.findAndModify({
  query: {status: "pending"},
  sort: {priority: -1},  // Highest priority first
  update: {$set: {status: "processing"}},
  new: true
})
```

### findOneAndDelete()
Finds and deletes a document, returning the deleted document.

```javascript
// Basic syntax
db.collection.findOneAndDelete(filter, options)

// Example 1: Delete and return
const deleted = db.users.findOneAndDelete({
  email: "user@example.com"
})
print(deleted.name)  // Access deleted document

// Example 2: Delete with sort
db.logs.findOneAndDelete(
  {level: "debug"},
  {sort: {createdAt: 1}}  // Delete oldest debug log
)

// Example 3: Delete with projection
db.sessions.findOneAndDelete(
  {expired: true},
  {projection: {sessionId: 1, userId: 1}}
)
```

### findOneAndUpdate()
Finds and updates a document, returning either the original or updated document.

```javascript
// Basic syntax
db.collection.findOneAndUpdate(filter, update, options)

// Example 1: Update and return new
db.users.findOneAndUpdate(
  {email: "john@example.com"},
  {$set: {lastLogin: new Date()}},
  {returnNewDocument: true}
)

// Example 2: Upsert with return
db.pageViews.findOneAndUpdate(
  {page: "/home"},
  {$inc: {views: 1}},
  {
    upsert: true,
    returnNewDocument: true
  }
)

// Example 3: Update with sort
db.tasks.findOneAndUpdate(
  {status: "pending"},
  {$set: {status: "in_progress"}},
  {
    sort: {priority: -1},  // Highest priority
    returnNewDocument: true
  }
)

// Example 4: Increment counter
const result = db.counters.findOneAndUpdate(
  {_id: "orderNumber"},
  {$inc: {sequence: 1}},
  {returnNewDocument: true}
)
print("Next order number:", result.sequence)
```

### findOneAndReplace()
Finds and replaces a document, returning either the original or new document.

```javascript
// Basic syntax
db.collection.findOneAndReplace(filter, replacement, options)

// Example 1: Replace user document
db.users.findOneAndReplace(
  {email: "old@example.com"},
  {
    email: "old@example.com",
    name: "Updated Name",
    age: 35,
    status: "active",
    updatedAt: new Date()
  },
  {returnNewDocument: true}
)

// Example 2: Replace with upsert
db.settings.findOneAndReplace(
  {userId: "user123"},
  {
    userId: "user123",
    theme: "dark",
    language: "en",
    notifications: {
      email: true,
      push: false
    }
  },
  {
    upsert: true,
    returnNewDocument: true
  }
)
```

### Query Arrays

```javascript
// Example 1: Array contains value
db.users.find({hobbies: "reading"})

// Example 2: Array contains all values
db.users.find({
  hobbies: {$all: ["reading", "coding"]}
})

// Example 3: Array element match
db.users.find({
  "scores.0": {$gt: 90}  // First score > 90
})

// Example 4: $elemMatch (complex array queries)
db.students.find({
  scores: {
    $elemMatch: {
      type: "exam",
      score: {$gt: 85}
    }
  }
})

// Example 5: Array size
db.users.find({
  hobbies: {$size: 3}  // Exactly 3 hobbies
})

// Example 6: $slice projection
db.posts.find(
  {category: "tech"},
  {comments: {$slice: 5}}  // First 5 comments
)
```

### Query for Null or Missing Fields

```javascript
// Example 1: Field is null
db.users.find({middleName: null})
// Returns: Documents where middleName is null OR doesn't exist

// Example 2: Field doesn't exist
db.users.find({middleName: {$exists: false}})
// Returns: Only documents missing middleName field

// Example 3: Field exists
db.users.find({email: {$exists: true}})

// Example 4: Field is null (explicit)
db.users.find({
  middleName: {$type: "null"}
})

// Example 5: Not null or missing
db.users.find({
  email: {$ne: null, $exists: true}
})

// Example 6: Check type
db.users.find({
  age: {$type: "number"}
})
```

---

## 7. Operators {#operators}

## COMPARISON OPERATORS

### $eq (Equal)
```javascript
// Matches values equal to specified value
db.users.find({age: {$eq: 30}})
// Same as: db.users.find({age: 30})

// With nested field
db.users.find({"address.zipcode": {$eq: "10001"}})

// With date
db.orders.find({
  createdAt: {$eq: ISODate("2024-01-15T00:00:00Z")}
})
```

### $ne (Not Equal)
```javascript
// Matches values not equal to specified value
db.users.find({status: {$ne: "inactive"}})

// Includes documents without the field
db.products.find({category: {$ne: "Electronics"}})

// Not equal to null
db.users.find({email: {$ne: null}})
```

### $gt (Greater Than)
```javascript
// Matches values greater than specified value
db.products.find({price: {$gt: 100}})

// With date
db.orders.find({
  createdAt: {$gt: ISODate("2024-01-01")}
})

// Nested field
db.users.find({"profile.age": {$gt: 25}})
```

### $gte (Greater Than or Equal)
```javascript
// Matches values >= specified value
db.users.find({age: {$gte: 18}})

// Range with $gte and $lte
db.products.find({
  price: {$gte: 50, $lte: 200}
})
```

### $lt (Less Than)
```javascript
// Matches values less than specified value
db.products.find({stock: {$lt: 10}})

// Warning: low stock
db.products.find({
  stock: {$lt: 5},
  status: "active"
})
```

### $lte (Less Than or Equal)
```javascript
// Matches values <= specified value
db.users.find({age: {$lte: 65}})

// Date range
db.logs.find({
  timestamp: {
    $gte: ISODate("2024-01-01"),
    $lte: ISODate("2024-12-31")
  }
})
```

### $in (In Array)
```javascript
// Matches any value in array
db.users.find({
  status: {$in: ["active", "pending"]}
})

// With numbers
db.products.find({
  category_id: {$in: [1, 2, 5, 10]}
})

// With ObjectIds
db.orders.find({
  userId: {$in: [
    ObjectId("..."),
    ObjectId("...")
  ]}
})
```

### $nin (Not In Array)
```javascript
// Matches values not in array
db.users.find({
  role: {$nin: ["admin", "moderator"]}
})

// Exclude categories
db.products.find({
  category: {$nin: ["Discontinued", "Out of Stock"]}
})
```

### $cmp (Compare)
Used in aggregation pipeline.

```javascript
// Returns: -1 if expr1 < expr2, 0 if equal, 1 if expr1 > expr2
db.products.aggregate([
  {
    $project: {
      name: 1,
      price: 1,
      comparePrice: {
        $cmp: ["$price", 100]
      }
    }
  }
])
```

---

## LOGICAL OPERATORS

### $and
```javascript
// Joins query clauses with AND
db.users.find({
  $and: [
    {age: {$gte: 25}},
    {age: {$lte: 40}},
    {status: "active"}
  ]
})

// Simplified (implicit AND)
db.users.find({
  age: {$gte: 25, $lte: 40},
  status: "active"
})

// When same field needs multiple conditions
db.products.find({
  $and: [
    {price: {$gt: 50}},
    {price: {$lt: 200}}
  ]
})
```

### $or
```javascript
// Joins query clauses with OR
db.users.find({
  $or: [
    {age: {$lt: 18}},
    {age: {$gt: 65}}
  ]
})

// Multiple conditions
db.products.find({
  $or: [
    {category: "Electronics"},
    {category: "Computers"},
    {featured: true}
  ]
})

// Combine with AND
db.users.find({
  status: "active",
  $or: [
    {role: "admin"},
    {role: "moderator"}
  ]
})
```

### $not
```javascript
// Inverts the effect of a query expression
db.users.find({
  age: {$not: {$gt: 30}}
})
// Returns: age <= 30 OR age doesn't exist

// With regex
db.products.find({
  name: {$not: /^test/i}  // Not starting with "test"
})

// With $exists
db.users.find({
  email: {$not: {$exists: false}}
})
```

### $nor
```javascript
// Joins query clauses with NOR (not OR)
// Returns documents that fail ALL clauses
db.users.find({
  $nor: [
    {status: "inactive"},
    {age: {$lt: 18}}
  ]
})
// Returns: status != "inactive" AND age >= 18

// Multiple conditions
db.products.find({
  $nor: [
    {stock: 0},
    {discontinued: true},
    {price: {$gt: 1000}}
  ]
})
```

---

## ARITHMETIC OPERATORS (Aggregation)

### $add
```javascript
// Adds numbers or dates
db.sales.aggregate([
  {
    $project: {
      item: 1,
      total: {
        $add: ["$price", "$tax", "$shipping"]
      }
    }
  }
])

// Add days to date
db.orders.aggregate([
  {
    $project: {
      orderId: 1,
      estimatedDelivery: {
        $add: ["$orderDate", 7 * 24 * 60 * 60 * 1000]  // Add 7 days in ms
      }
    }
  }
])

// Multiple additions
db.expenses.aggregate([
  {
    $group: {
      _id: "$category",
      totalExpense: {
        $sum: {$add: ["$amount", "$fees"]}
      }
    }
  }
])
```

### $subtract
```javascript
// Subtracts two numbers or dates
db.products.aggregate([
  {
    $project: {
      name: 1,
      discount: {
        $subtract: ["$originalPrice", "$salePrice"]
      }
    }
  }
])

// Calculate age from birthdate
db.users.aggregate([
  {
    $project: {
      name: 1,
      age: {
        $subtract: [
          {$year: new Date()},
          {$year: "$birthdate"}
        ]
      }
    }
  }
])

// Date difference in days
db.orders.aggregate([
  {
    $project: {
      orderId: 1,
      processingTime: {
        $divide: [
          {$subtract: ["$shippedDate", "$orderDate"]},
          1000 * 60 * 60 * 24  // Convert ms to days
        ]
      }
    }
  }
])
```

### $multiply
```javascript
// Multiplies numbers
db.orderItems.aggregate([
  {
    $project: {
      product: 1,
      totalPrice: {
        $multiply: ["$quantity", "$unitPrice"]
      }
    }
  }
])

// Calculate with discount
db.products.aggregate([
  {
    $project: {
      name: 1,
      finalPrice: {
        $multiply: [
          "$price",
          {$subtract: [1, {$divide: ["$discountPercent", 100]}]}
        ]
      }
    }
  }
])

// Multiple multiplications
db.sales.aggregate([
  {
    $project: {
      revenue: {
        $multiply: ["$quantity", "$price", "$exchangeRate"]
      }
    }
  }
])
```

### $divide
```javascript
// Divides two numbers
db.products.aggregate([
  {
    $project: {
      name: 1,
      pricePerUnit: {
        $divide: ["$totalPrice", "$quantity"]
      }
    }
  }
])

// Calculate percentage
db.students.aggregate([
  {
    $project: {
      name: 1,
      percentage: {
        $multiply: [
          {$divide: ["$obtainedMarks", "$totalMarks"]},
          100
        ]
      }
    }
  }
])

// Avoid division by zero
db.stats.aggregate([
  {
    $project: {
      ratio: {
        $cond: {
          if: {$eq: ["$denominator", 0]},
          then: null,
          else: {$divide: ["$numerator", "$denominator"]}
        }
      }
    }
  }
])
```

### $abs (Absolute Value)
```javascript
// Returns absolute value
db.transactions.aggregate([
  {
    $project: {
      amount: 1,
      absoluteAmount: {$abs: "$amount"}
    }
  }
])

// Calculate distance
db.measurements.aggregate([
  {
    $project: {
      difference: {
        $abs: {$subtract: ["$actual", "$expected"]}
      }
    }
  }
])
```

### $floor
```javascript
// Returns largest integer <= number
db.products.aggregate([
  {
    $project: {
      name: 1,
      price: 1,
      flooredPrice: {$floor: "$price"}
    }
  }
])
// Example: 19.99 -> 19

// Round down rating
db.reviews.aggregate([
  {
    $project: {
      rating: 1,
      roundedRating: {$floor: "$rating"}
    }
  }
])
```

### $ceil (Ceiling)
```javascript
// Returns smallest integer >= number
db.orders.aggregate([
  {
    $project: {
      boxesNeeded: {
        $ceil: {$divide: ["$quantity", "$boxCapacity"]}
      }
    }
  }
])
// Example: 10.1 -> 11
```

### $mod (Modulo)
```javascript
// Returns remainder of division
db.numbers.aggregate([
  {
    $project: {
      value: 1,
      isEven: {
        $eq: [{$mod: ["$value", 2]}, 0]
      }
    }
  }
])
```

### $round
```javascript
// Rounds to specified decimal places
db.products.aggregate([
  {
    $project: {
      price: 1,
      roundedPrice: {$round: ["$price", 2]}
    }
  }
])
// Example: 19.996 -> 20.00
```

---

## FIELD UPDATE OPERATORS

### $set
```javascript
// Sets field value
db.users.updateOne(
  {name: "John"},
  {$set: {age: 31, status: "active"}}
)

// Set nested field
db.users.updateOne(
  {_id: ObjectId("...")},
  {$set: {"address.city": "Boston"}}
)

// Set array element
db.users.updateOne(
  {name: "John"},
  {$set: {"hobbies.0": "swimming"}}
)
```

### $unset
```javascript
// Removes field from document
db.users.updateOne(
  {name: "John"},
  {$unset: {tempField: ""}}  // Value doesn't matter
)

// Remove multiple fields
db.products.updateMany(
  {},
  {$unset: {oldField1: "", oldField2: ""}}
)
```

### $inc (Increment)
```javascript
// Increments numeric field value
db.products.updateOne(
  {_id: ObjectId("...")},
  {$inc: {views: 1}}
)

// Increment by different amount
db.users.updateOne(
  {email: "user@example.com"},
  {$inc: {loginCount: 1, points: 10}}
)

// Decrement (negative increment)
db.inventory.updateOne(
  {sku: "ABC123"},
  {$inc: {quantity: -5}}
)

// Nested field increment
db.stats.updateOne(
  {_id: "daily"},
  {$inc: {"metrics.pageViews": 1}}
)
```

### $mul (Multiply)
```javascript
// Multiplies field value
db.products.updateOne(
  {sku: "ITEM001"},
  {$mul: {price: 1.1}}  // 10% increase
)

// Apply discount
db.cart.updateMany(
  {userId: "user123"},
  {$mul: {price: 0.9}}  // 10% discount
)

// Set to zero
db.items.updateOne(
  {_id: ObjectId("...")},
  {$mul: {score: 0}}
)
```

### $min (Minimum)
```javascript
// Updates if specified value is less than current
db.scores.updateOne(
  {playerId: "player1"},
  {$min: {lowScore: 50}}
)
// If lowScore > 50, updates to 50
// If lowScore <= 50, no change

// Update lowest price
db.products.updateOne(
  {sku: "ABC"},
  {$min: {lowestPrice: 29.99}}
)
```

### $max (Maximum)
```javascript
// Updates if specified value is greater than current
db.scores.updateOne(
  {playerId: "player1"},
  {$max: {highScore: 1000}}
)
// If highScore < 1000, updates to 1000
// If highScore >= 1000, no change

// Track highest bid
db.auctions.updateOne(
  {itemId: "item123"},
  {$max: {highestBid: 500}}
)
```

### $rename
```javascript
// Renames a field
db.users.updateMany(
  {},
  {$rename: {"oldFieldName": "newFieldName"}}
)

// Multiple renames
db.products.updateMany(
  {},
  {
    $rename: {
      "desc": "description",
      "qty": "quantity"
    }
  }
)

// Rename nested field
db.users.updateOne(
  {_id: ObjectId("...")},
  {$rename: {"name.first": "name.firstName"}}
)
```

### $currentDate
```javascript
// Sets field to current date
db.users.updateOne(
  {_id: ObjectId("...")},
  {$currentDate: {lastModified: true}}
)

// Set as timestamp
db.logs.insertOne({
  event: "login",
  $currentDate: {
    timestamp: {$type: "timestamp"}
  }
})

// Multiple date fields
db.orders.updateOne(
  {orderId: "ORD123"},
  {
    $set: {status: "shipped"},
    $currentDate: {
      shippedAt: true,
      lastModified: true
    }
  }
)
```

---

## ARRAY UPDATE OPERATORS

### $push
```javascript
// Adds element to array
db.users.updateOne(
  {name: "John"},
  {$push: {hobbies: "photography"}}
)

// Push multiple values
db.users.updateOne(
  {name: "John"},
  {
    $push: {
      hobbies: {
        $each: ["cooking", "gardening"]
      }
    }
  }
)

// Push with sort and limit
db.students.updateOne(
  {studentId: "S001"},
  {
    $push: {
      scores: {
        $each: [89, 92],
        $sort: -1,          // Sort descending
        $slice: 5           // Keep only top 5
      }
    }
  }
)

// Push with position
db.users.updateOne(
  {name: "John"},
  {
    $push: {
      hobbies: {
        $each: ["reading"],
        $position: 0        // Insert at beginning
      }
    }
  }
)
```

### $pop
```javascript
// Removes first or last array element
// Remove last element (-1 for first, 1 for last)
db.users.updateOne(
  {name: "John"},
  {$pop: {hobbies: 1}}
)

// Remove first element
db.users.updateOne(
  {name: "John"},
  {$pop: {notifications: -1}}
)
```

### $pull
```javascript
// Removes all matching array elements
db.users.updateOne(
  {name: "John"},
  {$pull: {hobbies: "gaming"}}
)

// Pull with condition
db.students.updateOne(
  {studentId: "S001"},
  {
    $pull: {
      scores: {$lt: 60}  // Remove scores below 60
    }
  }
)

// Pull from nested array
db.posts.updateOne(
  {_id: ObjectId("...")},
  {
    $pull: {
      comments: {userId: "user123"}
    }
  }
)

// Multiple conditions
db.inventory.updateOne(
  {storeId: "store1"},
  {
    $pull: {
      items: {
        quantity: 0,
        discontinued: true
      }
    }
  }
)
```

### $pullAll
```javascript
// Removes all specified values from array
db.users.updateOne(
  {name: "John"},
  {
    $pullAll: {
      hobbies: ["gaming", "watching TV", "sleeping"]
    }
  }
)

// Remove multiple IDs
db.groups.updateOne(
  {groupId: "group1"},
  {
    $pullAll: {
      members: [
        ObjectId("..."),
        ObjectId("..."),
        ObjectId("...")
      ]
    }
  }
)
```

### $addToSet
```javascript
// Adds element only if it doesn't exist (no duplicates)
db.users.updateOne(
  {name: "John"},
  {$addToSet: {hobbies: "reading"}}
)

// Add multiple unique values
db.users.updateOne(
  {name: "John"},
  {
    $addToSet: {
      hobbies: {
        $each: ["coding", "music", "sports"]
      }
    }
  }
)

// Combine with array of objects (checks entire object)
db.products.updateOne(
  {sku: "ABC"},
  {
    $addToSet: {
      tags: {
        $each: [
          {name: "featured", priority: 1},
          {name: "sale", priority: 2}
        ]
      }
    }
  }
)
```

### $ (Positional Operator)
```javascript
// Updates first matching array element
db.students.updateOne(
  {
    studentId: "S001",
    "scores.type": "homework"
  },
  {
    $set: {"scores.$.score": 95}
  }
)

// Update nested array element
db.posts.updateOne(
  {
    _id: ObjectId("..."),
    "comments.userId": "user123"
  },
  {
    $set: {"comments.$.approved": true}
  }
)

// Increment array element
db.inventory.updateOne(
  {
    storeId: "store1",
    "items.sku": "ABC123"
  },
  {
    $inc: {"items.$.quantity": 10}
  }
)
```

### $[] (All Positional Operator)
```javascript
// Updates all array elements
db.students.updateOne(
  {studentId: "S001"},
  {
    $inc: {"scores.$[].attempts": 1}
  }
)

// Set field on all array elements
db.products.updateOne(
  {_id: ObjectId("...")},
  {
    $set: {"reviews.$[].verified": false}
  }
)
```

**Detailed Explanation of `$[]` (All Positional Operator):**

```javascript
// ========== WHAT IS $[]? ==========
// $[] is the "All Positional Operator" in MongoDB
// It updates ALL elements in an array, not just the first matching one

// Key Differences:
// - $     → Updates FIRST matching array element
// - $[]   → Updates ALL array elements (no filter needed)
// - $[elem] → Updates ALL elements matching filter (with arrayFilters)

// ========== HOW $[] WORKS ==========

// Example 1: Understanding the syntax
// Document structure:
{
  studentId: "S001",
  scores: [
    {type: "quiz", score: 85, attempts: 1},
    {type: "homework", score: 90, attempts: 1},
    {type: "exam", score: 95, attempts: 1}
  ]
}

// Query with $[]:
db.students.updateOne(
  {studentId: "S001"},  // Filter document (NOT array elements)
  {
    $inc: {"scores.$[].attempts": 1}  // $[] means "all elements in scores array"
  }
)

// Result:
// All three objects in scores array get attempts incremented by 1
{
  studentId: "S001",
  scores: [
    {type: "quiz", score: 85, attempts: 2},      // 1 → 2
    {type: "homework", score: 90, attempts: 2},  // 1 → 2
    {type: "exam", score: 95, attempts: 2}       // 1 → 2
  ]
}

// ========== DETAILED BREAKDOWN ==========

// Syntax: "arrayField.$[].fieldName"
//          |           |   |        |
//          |           |   |        └─ Field to update in each element
//          |           |   └─ Empty brackets = ALL elements
//          |           └─ Positional operator for arrays
//          └─ Array field name

// Step-by-step what happens:
// 1. MongoDB finds document where studentId = "S001"
// 2. MongoDB looks at "scores" array field
// 3. $[] tells MongoDB: "apply update to ALL elements in this array"
// 4. For each element in scores array, increment the "attempts" field by 1

// ========== MORE EXAMPLES ==========

// Example 2: Setting a field on all array elements
db.products.updateOne(
  {_id: ObjectId("...")},
  {
    $set: {"reviews.$[].verified": false}
  }
)

// Document before:
{
  _id: ObjectId("..."),
  reviews: [
    {userId: "user1", rating: 5, comment: "Great!", verified: true},
    {userId: "user2", rating: 4, comment: "Good", verified: true},
    {userId: "user3", rating: 3, comment: "Okay", verified: true}
  ]
}

// Document after:
{
  _id: ObjectId("..."),
  reviews: [
    {userId: "user1", rating: 5, comment: "Great!", verified: false},  // All set to false
    {userId: "user2", rating: 4, comment: "Good", verified: false},
    {userId: "user3", rating: 3, comment: "Okay", verified: false}
  ]
}

// Example 3: Adding field to all array elements
db.users.updateOne(
  {email: "john@example.com"},
  {
    $set: {"orders.$[].status": "pending"}
  }
)

// Example 4: Incrementing nested array field
db.inventory.updateOne(
  {storeId: "store1"},
  {
    $inc: {"items.$[].stock": -1}  // Decrease stock by 1 for ALL items
  }
)

// Example 5: Multiple updates on all elements
db.orders.updateOne(
  {orderId: "ORD001"},
  {
    $set: {
      "items.$[].processed": true,
      "items.$[].processedAt": new Date()
    }
  }
)

// ========== COMPARISON: $ vs $[] vs $[elem] ==========

// Document:
{
  studentId: "S001",
  scores: [
    {type: "quiz", score: 85},
    {type: "homework", score: 90},
    {type: "exam", score: 95}
  ]
}

// 1. $ (First matching element only)
db.students.updateOne(
  {studentId: "S001", "scores.type": "quiz"},  // Filter matches first element
  {$set: {"scores.$.score": 100}}
)
// Result: Only first element updated
// scores[0].score = 100  ✅
// scores[1].score = 90   (unchanged)
// scores[2].score = 95   (unchanged)

// 2. $[] (ALL elements - no filter)
db.students.updateOne(
  {studentId: "S001"},  // Filter matches document, NOT array elements
  {$set: {"scores.$[].score": 100}}
)
// Result: ALL elements updated
// scores[0].score = 100  ✅
// scores[1].score = 100  ✅
// scores[2].score = 100  ✅

// 3. $[elem] (Filtered elements - with arrayFilters)
db.students.updateOne(
  {studentId: "S001"},
  {$set: {"scores.$[elem].score": 100}},
  {arrayFilters: [{"elem.score": {$gte: 90}}]}  // Only elements where score >= 90
)
// Result: Only matching elements updated
// scores[0].score = 85   (unchanged, 85 < 90)
// scores[1].score = 100  ✅ (90 >= 90)
// scores[2].score = 100  ✅ (95 >= 90)

// ========== NESTED ARRAYS WITH $[] ==========

// Example: Updating nested array elements
db.posts.updateOne(
  {_id: ObjectId("...")},
  {
    $set: {"comments.$[].replies.$[].edited": true}
  }
)

// This updates:
// - ALL comments in comments array
// - ALL replies within each comment's replies array
// - Sets "edited" field to true in ALL nested replies

// Document structure:
{
  _id: ObjectId("..."),
  comments: [
    {
      userId: "user1",
      text: "First comment",
      replies: [
        {userId: "user2", text: "Reply 1", edited: false},
        {userId: "user3", text: "Reply 2", edited: false}
      ]
    },
    {
      userId: "user4",
      text: "Second comment",
      replies: [
        {userId: "user5", text: "Reply 3", edited: false}
      ]
    }
  ]
}

// After update: ALL replies in ALL comments get edited: true

// ========== EDGE CASES AND IMPORTANT NOTES ==========

// Edge case 1: Empty array
db.students.updateOne(
  {studentId: "S001", scores: []},  // Empty array
  {$inc: {"scores.$[].attempts": 1}}
)
// Result: No error, but nothing happens (no elements to update)

// Edge case 2: Field doesn't exist in all elements
db.students.updateOne(
  {studentId: "S001"},
  {$set: {"scores.$[].newField": "value"}}
)
// Result: newField is added to ALL array elements, even if some already have it

// Edge case 3: Cannot use $[] with upsert
// ❌ This will NOT work:
db.students.updateOne(
  {studentId: "S001"},
  {$set: {"scores.$[].attempts": 1}},
  {upsert: true}  // Error: Cannot use positional operator with upsert
)

// Edge case 4: $[] works with multiple update operators
db.students.updateOne(
  {studentId: "S001"},
  {
    $inc: {"scores.$[].attempts": 1},
    $set: {"scores.$[].lastAttempt": new Date()}
  }
)
// Both operations apply to ALL array elements

// ========== REAL-WORLD USE CASES ==========

// Use case 1: Mark all items in cart as processed
db.orders.updateOne(
  {orderId: "ORD123"},
  {$set: {"cart.$[].processed": true}}
)

// Use case 2: Increment view count for all videos in playlist
db.playlists.updateOne(
  {playlistId: "PL001"},
  {$inc: {"videos.$[].views": 1}}
)

// Use case 3: Set status for all tasks in project
db.projects.updateOne(
  {projectId: "PRJ001"},
  {$set: {"tasks.$[].status": "completed"}}
)

// Use case 4: Update timestamp for all notifications
db.users.updateOne(
  {userId: "user123"},
  {$currentDate: {"notifications.$[].readAt": true}}
)
```

**Summary:**

| Operator | Updates | Filter Needed? | Use Case |
|----------|---------|----------------|----------|
| **`$`** | First matching element | ✅ Yes (in query) | Update specific element found by query |
| **`$[]`** | ALL elements | ❌ No | Update all elements regardless of values |
| **`$[elem]`** | Filtered elements | ✅ Yes (arrayFilters) | Update elements matching specific conditions |

**Key Points:**
- `$[]` updates **ALL** array elements at once
- No filter needed in query (unlike `$`)
- No `arrayFilters` needed (unlike `$[elem]`)
- Syntax: `"arrayField.$[].fieldName"`
- Can be used with any update operator (`$set`, `$inc`, `$unset`, etc.)
- Works with nested arrays: `"array1.$[].array2.$[].field"`

### $[element] (Filtered Positional)
```javascript
// Updates array elements matching filter
db.students.updateOne(
  {studentId: "S001"},
  {
    $set: {"scores.$[elem].grade": "A"}
  },
  {
    arrayFilters: [{"elem.score": {$gte: 90}}]
  }
)

// Multiple filters
db.products.updateOne(
  {_id: ObjectId("...")},
  {
    $set: {"items.$[item].discount": 0.2}
  },
  {
    arrayFilters: [
      {"item.category": "Electronics"},
      {"item.price": {$gt: 100}}
    ]
  }
)

// Nested array update
db.posts.updateOne(
  {_id: ObjectId("...")},
  {
    $set: {"comments.$[comment].replies.$[reply].hidden": true}
  },
  {
    arrayFilters: [
      {"comment.approved": false},
      {"reply.flagged": true}
    ]
  }
)
```

---

## ARRAY EXPRESSION OPERATORS (Aggregation)

### $isArray
```javascript
// Checks if field is an array
db.data.aggregate([
  {
    $project: {
      item: 1,
      isArrayField: {$isArray: "$tags"}
    }
  }
])

// Conditional logic
db.products.aggregate([
  {
    $project: {
      name: 1,
      tagsCount: {
        $cond: {
          if: {$isArray: "$tags"},
          then: {$size: "$tags"},
          else: 0
        }
      }
    }
  }
])
```

**Detailed Explanation of `$cond`, `$isArray`, and `$size`:**

```javascript
// ========== BREAKDOWN OF THE CODE ==========

tagsCount: {
  $cond: {                          // Conditional operator (like if-else)
    if: {$isArray: "$tags"},        // Condition: Check if "tags" is an array
    then: {$size: "$tags"},         // If TRUE: Return size of tags array
    else: 0                         // If FALSE: Return 0
  }
}

// ========== HOW IT WORKS STEP BY STEP ==========

// Step 1: $isArray checks if field is an array
// Input document:
{
  name: "Laptop",
  tags: ["electronics", "computers", "gaming"]  // This IS an array
}

// $isArray: "$tags" evaluates to: true
// Result: Condition is TRUE

// Step 2: Since condition is TRUE, execute "then"
// $size: "$tags" counts elements: ["electronics", "computers", "gaming"]
// Result: 3

// Final output:
{
  name: "Laptop",
  tagsCount: 3  // Size of tags array
}

// ========== EDGE CASE: NON-ARRAY FIELD ==========

// Input document:
{
  name: "Product",
  tags: null  // NOT an array (or doesn't exist)
}

// $isArray: "$tags" evaluates to: false
// Result: Condition is FALSE

// Step 2: Since condition is FALSE, execute "else"
// Return: 0

// Final output:
{
  name: "Product",
  tagsCount: 0  // Safe default for non-arrays
}

// ========== WHY USE THIS PATTERN? ==========

// Without $isArray check:
{
  tagsCount: {$size: "$tags"}  // ❌ ERROR if tags is null or not an array
}
// Error: "$size requires an array argument"

// With $isArray check:
{
  tagsCount: {
    $cond: {
      if: {$isArray: "$tags"},
      then: {$size: "$tags"},
      else: 0  // ✅ Safe fallback
    }
  }
}
// No error - handles null/undefined/missing fields gracefully

// ========== DETAILED EXPLANATION OF EACH OPERATOR ==========

// 1. $cond - Conditional Operator (if-else)
$cond: {
  if: <condition>,    // Expression that evaluates to true/false
  then: <value>,      // Return this if condition is true
  else: <value>       // Return this if condition is false
}

// Example 1: Simple conditional
{
  status: {
    $cond: {
      if: {$gt: ["$price", 100]},  // If price > 100
      then: "expensive",            // Return "expensive"
      else: "cheap"                 // Otherwise return "cheap"
    }
  }
}

// Example 2: Nested conditionals
{
  category: {
    $cond: {
      if: {$gt: ["$price", 1000]},
      then: "premium",
      else: {
        $cond: {
          if: {$gt: ["$price", 500]},
          then: "mid-range",
          else: "budget"
        }
      }
    }
  }
}

// 2. $isArray - Array Type Checker
// Returns: true if field is an array, false otherwise

$isArray: "$fieldName"  // Check if field is an array

// Example 1: Direct check
{
  isArray: {$isArray: "$tags"}  // Returns boolean: true or false
}

// Example 2: Combined with $cond
{
  arraySize: {
    $cond: {
      if: {$isArray: "$items"},
      then: {$size: "$items"},
      else: 0
    }
  }
}

// Common use cases for $isArray:
// - Validate data type before processing
// - Prevent errors when using array operators
// - Handle mixed data types gracefully

// 3. $size - Array Length Operator
// Returns: Number of elements in array
// ⚠️ WARNING: Fails if field is not an array!

$size: "$arrayField"  // Returns count of array elements

// Example 1: Basic usage
{
  hobbyCount: {$size: "$hobbies"}
}
// Input: {hobbies: ["reading", "gaming", "coding"]}
// Output: {hobbyCount: 3}

// Example 2: With safe check (your code pattern)
{
  hobbyCount: {
    $cond: {
      if: {$isArray: "$hobbies"},
      then: {$size: "$hobbies"},
      else: 0
    }
  }
}
// Safe: Returns 0 if hobbies is null/undefined/not an array

// ========== COMPLETE EXAMPLE WITH REAL DATA ==========

// Input documents:
[
  {
    name: "Laptop",
    tags: ["electronics", "computers", "gaming"],
    price: 1200
  },
  {
    name: "Book",
    tags: null,  // Not an array!
    price: 20
  },
  {
    name: "Phone",
    tags: ["electronics", "smartphone"],  // Array with 2 elements
    price: 800
  }
]

// Aggregation pipeline:
db.products.aggregate([
  {
    $project: {
      name: 1,
      tagsCount: {
        $cond: {
          if: {$isArray: "$tags"},
          then: {$size: "$tags"},
          else: 0
        }
      },
      price: 1
    }
  }
])

// Output:
[
  {
    name: "Laptop",
    tagsCount: 3,    // Array had 3 elements
    price: 1200
  },
  {
    name: "Book",
    tagsCount: 0,    // Not an array → 0 (safe fallback)
    price: 20
  },
  {
    name: "Phone",
    tagsCount: 2,    // Array had 2 elements
    price: 800
  }
]

// ========== ALTERNATIVE PATTERNS ==========

// Pattern 1: Using $ifNull (simpler but less explicit)
{
  tagsCount: {
    $size: {
      $ifNull: ["$tags", []]  // Replace null with empty array
    }
  }
}
// Works if tags is null, but fails if tags is string/number

// Pattern 2: Using $cond with $ifNull (most robust)
{
  tagsCount: {
    $cond: {
      if: {$isArray: {$ifNull: ["$tags", []]}},
      then: {$size: "$tags"},
      else: 0
    }
  }
}

// Pattern 3: Using $switch (multiple conditions)
{
  tagsCount: {
    $switch: {
      branches: [
        {
          case: {$isArray: "$tags"},
          then: {$size: "$tags"}
        },
        {
          case: {$eq: ["$tags", null]},
          then: 0
        }
      ],
      default: 0
    }
  }
}

// ========== EDGE CASES AND COMMON ERRORS ==========

// Edge case 1: Field doesn't exist
{
  name: "Product"  // No "tags" field
}
// $isArray: "$tags" → false
// Result: tagsCount = 0 ✅ (safe)

// Edge case 2: Field is null
{
  name: "Product",
  tags: null
}
// $isArray: "$tags" → false
// Result: tagsCount = 0 ✅ (safe)

// Edge case 3: Field is empty array
{
  name: "Product",
  tags: []
}
// $isArray: "$tags" → true
// $size: "$tags" → 0
// Result: tagsCount = 0 ✅ (correct)

// Edge case 4: Field is string (NOT array)
{
  name: "Product",
  tags: "electronics"  // String, not array
}
// $isArray: "$tags" → false
// Result: tagsCount = 0 ✅ (safe)

// ❌ ERROR: Using $size without check
{
  tagsCount: {$size: "$tags"}  // Fails if tags is null/string/number
}
// Error: "$size requires an array argument"

// ✅ SAFE: Using $isArray check first
{
  tagsCount: {
    $cond: {
      if: {$isArray: "$tags"},
      then: {$size: "$tags"},
      else: 0
    }
  }
}
// No error - handles all edge cases

// ========== REAL-WORLD USE CASES ==========

// Use case 1: Count array elements safely
db.users.aggregate([
  {
    $project: {
      email: 1,
      orderCount: {
        $cond: {
          if: {$isArray: "$orders"},
          then: {$size: "$orders"},
          else: 0
        }
      }
    }
  }
])

// Use case 2: Calculate average with null safety
db.products.aggregate([
  {
    $project: {
      name: 1,
      reviewCount: {
        $cond: {
          if: {$isArray: "$reviews"},
          then: {$size: "$reviews"},
          else: 0
        }
      },
      averageRating: {
        $cond: {
          if: {
            $and: [
              {$isArray: "$reviews"},
              {$gt: [{$size: "$reviews"}, 0]}
            ]
          },
          then: {$avg: "$reviews.rating"},
          else: 0
        }
      }
    }
  }
])

// Use case 3: Conditional array operations
db.posts.aggregate([
  {
    $project: {
      title: 1,
      commentCount: {
        $cond: {
          if: {$isArray: "$comments"},
          then: {$size: "$comments"},
          else: 0
        }
      },
      hasComments: {
        $cond: {
          if: {
            $and: [
              {$isArray: "$comments"},
              {$gt: [{$size: "$comments"}, 0]}
            ]
          },
          then: true,
          else: false
        }
      }
    }
  }
])
```

**Summary:**

| Operator | Purpose | Returns |
|----------|---------|---------|
| **`$cond`** | Conditional logic (if-else) | Value based on condition |
| **`$isArray`** | Check if field is array | `true` or `false` |
| **`$size`** | Count array elements | Number (fails if not array) |

**Your Code Pattern:**
```javascript
tagsCount: {
  $cond: {
    if: {$isArray: "$tags"},     // ✅ Safe check first
    then: {$size: "$tags"},      // ✅ Count only if array
    else: 0                      // ✅ Default for non-arrays
  }
}
```

**Key Benefits:**
- ✅ Prevents errors when field is null/undefined
- ✅ Handles mixed data types gracefully
- ✅ Provides safe default value (0)
- ✅ Best practice for array operations in MongoDB

### $size
```javascript
// Returns number of array elements
db.users.aggregate([
  {
    $project: {
      name: 1,
      hobbyCount: {$size: "$hobbies"}
    }
  }
])

// Filter by array size
db.users.aggregate([
  {
    $match: {
      $expr: {$gt: [{$size: "$orders"}, 5]}
    }
  }
])

// Size with default for non-arrays
db.products.aggregate([
  {
    $project: {
      name: 1,
      reviewCount: {
        $cond: {
          if: {$isArray: "$reviews"},
          then: {$size: "$reviews"},
          else: 0
        }
      }
    }
  }
])
```

### $arrayElemAt
```javascript
// Returns element at specified index
db.users.aggregate([
  {
    $project: {
      name: 1,
      firstHobby: {$arrayElemAt: ["$hobbies", 0]},
      lastHobby: {$arrayElemAt: ["$hobbies", -1]}
    }
  }
])

// Access nested array
db.orders.aggregate([
  {
    $project: {
      orderId: 1,
      firstItem: {
        $arrayElemAt: ["$items", 0]
      }
    }
  }
])

// With computed index
db.data.aggregate([
  {
    $project: {
      middleElement: {
        $arrayElemAt: [
          "$values",
          {$floor: {$divide: [{$size: "$values"}, 2]}}
        ]
      }
    }
  }
])
```

### $concatArrays
```javascript
// Concatenates arrays
db.users.aggregate([
  {
    $project: {
      name: 1,
      allInterests: {
        $concatArrays: ["$hobbies", "$skills", "$interests"]
      }
    }
  }
])

// With literal arrays
db.products.aggregate([
  {
    $project: {
      allTags: {
        $concatArrays: ["$tags", ["featured", "new"]]
      }
    }
  }
])

// Conditional concatenation
db.items.aggregate([
  {
    $project: {
      combined: {
        $concatArrays: [
          "$primary",
          {$cond: {
            if: "$includeSecondary",
            then: "$secondary",
            else: []
          }}
        ]
      }
    }
  }
])
```

**Detailed Explanation of `$concatArrays` with Conditional `$cond`:**

```javascript
// ========== BREAKDOWN OF THE CODE ==========

combined: {
  $concatArrays: [                          // Concatenate arrays together
    "$primary",                             // First array (always included)
    {                                       // Second array (conditional)
      $cond: {
        if: "$includeSecondary",           // Check boolean flag
        then: "$secondary",                // If TRUE: include secondary array
        else: []                           // If FALSE: include empty array
      }
    }
  ]
}

// ========== HOW IT WORKS STEP BY STEP ==========

// Example 1: When includeSecondary = true
// Input document:
{
  primary: ["apple", "banana"],
  secondary: ["orange", "grape"],
  includeSecondary: true  // Boolean flag
}

// Step 1: Evaluate $cond
// if: "$includeSecondary" → true
// then: "$secondary" → ["orange", "grape"]
// Result of $cond: ["orange", "grape"]

// Step 2: Execute $concatArrays
// $concatArrays: [
//   "$primary",                              // ["apple", "banana"]
//   ["orange", "grape"]                     // Result from $cond
// ]

// Final output:
{
  combined: ["apple", "banana", "orange", "grape"]  // Arrays concatenated
}

// ========== EXAMPLE 2: When includeSecondary = false ==========

// Input document:
{
  primary: ["apple", "banana"],
  secondary: ["orange", "grape"],
  includeSecondary: false  // Boolean flag is false
}

// Step 1: Evaluate $cond
// if: "$includeSecondary" → false
// else: [] → empty array
// Result of $cond: []

// Step 2: Execute $concatArrays
// $concatArrays: [
//   "$primary",                              // ["apple", "banana"]
//   []                                       // Empty array from $cond
// ]

// Final output:
{
  combined: ["apple", "banana"]  // Only primary array (secondary ignored)
}

// ========== WHAT IS $concatArrays? ==========

// $concatArrays: Combines multiple arrays into one array
// Syntax: $concatArrays: [array1, array2, array3, ...]
// Returns: Single combined array

// Example 1: Basic concatenation
{
  result: {
    $concatArrays: [
      ["a", "b"],      // First array
      ["c", "d"]       // Second array
    ]
  }
}
// Output: ["a", "b", "c", "d"]

// Example 2: Multiple arrays
{
  result: {
    $concatArrays: [
      ["red", "blue"],
      ["green"],
      ["yellow", "orange"]
    ]
  }
}
// Output: ["red", "blue", "green", "yellow", "orange"]

// Example 3: With field references
{
  allItems: {
    $concatArrays: ["$array1", "$array2"]  // Combine two field arrays
  }
}

// ========== WHY USE CONDITIONAL CONCATENATION? ==========

// Problem: Sometimes you want to include array only if condition is met
// Solution: Use $cond to conditionally return array or empty array

// Without $cond (always concatenates):
{
  combined: {
    $concatArrays: ["$primary", "$secondary"]
  }
}
// Problem: Always includes secondary, even if you don't want it

// With $cond (conditional):
{
  combined: {
    $concatArrays: [
      "$primary",
      {
        $cond: {
          if: "$includeSecondary",
          then: "$secondary",    // Include only if flag is true
          else: []              // Empty array = no addition
        }
      }
    ]
  }
}
// Solution: Only includes secondary when flag is true

// ========== COMPLETE EXAMPLE WITH REAL DATA ==========

// Input documents:
[
  {
    _id: 1,
    primary: ["JavaScript", "React"],
    secondary: ["Node.js", "MongoDB"],
    includeSecondary: true
  },
  {
    _id: 2,
    primary: ["Python", "Django"],
    secondary: ["Flask", "FastAPI"],
    includeSecondary: false  // Don't include secondary
  },
  {
    _id: 3,
    primary: ["Java", "Spring"],
    secondary: ["Hibernate", "JPA"],
    includeSecondary: true
  }
]

// Aggregation pipeline:
db.items.aggregate([
  {
    $project: {
      combined: {
        $concatArrays: [
          "$primary",
          {
            $cond: {
              if: "$includeSecondary",
              then: "$secondary",
              else: []
            }
          }
        ]
      }
    }
  }
])

// Output:
[
  {
    _id: 1,
    combined: ["JavaScript", "React", "Node.js", "MongoDB"]  // ✅ Includes secondary
  },
  {
    _id: 2,
    combined: ["Python", "Django"]  // ❌ Secondary excluded (includeSecondary = false)
  },
  {
    _id: 3,
    combined: ["Java", "Spring", "Hibernate", "JPA"]  // ✅ Includes secondary
  }
]

// ========== DETAILED BREAKDOWN OF $cond IN ARRAY CONTEXT ==========

// $cond structure in this context:
{
  $cond: {
    if: "$includeSecondary",  // Condition: boolean field
    then: "$secondary",       // If TRUE: return secondary array
    else: []                  // If FALSE: return empty array
  }
}

// Why empty array [] in else?
// - Empty array concatenated = no change
// - ["a", "b"] + [] = ["a", "b"] (same as original)
// - This effectively "ignores" secondary array when flag is false

// Alternative (less elegant):
{
  $cond: {
    if: "$includeSecondary",
    then: {
      $concatArrays: ["$primary", "$secondary"]  // Concatenate if true
    },
    else: "$primary"  // Just primary if false
  }
}
// This works but duplicates "$primary" in both branches

// Better pattern (your code):
{
  $concatArrays: [
    "$primary",                                // Always first
    {
      $cond: {
        if: "$includeSecondary",
        then: "$secondary",                    // Add secondary if true
        else: []                               // Add nothing if false
      }
    }
  ]
}
// Cleaner: primary listed once, conditional only for secondary

// ========== EDGE CASES AND COMMON SCENARIOS ==========

// Edge case 1: null or undefined arrays
{
  primary: null,
  secondary: ["b", "c"],
  includeSecondary: true
}
// Result: Error - $concatArrays requires arrays
// Solution: Add null checks first

// Edge case 2: Empty arrays
{
  primary: [],
  secondary: ["b", "c"],
  includeSecondary: true
}
// Result: {combined: ["b", "c"]}  ✅ Works fine

// Edge case 3: Non-boolean includeSecondary
{
  primary: ["a"],
  secondary: ["b"],
  includeSecondary: "yes"  // String, not boolean
}
// Result: {combined: ["a", "b"]}  // String is truthy, includes secondary

// Edge case 4: Missing includeSecondary field
{
  primary: ["a"],
  secondary: ["b"]
  // No includeSecondary field
}
// Result: {combined: ["a"]}  // Missing field = falsy, excludes secondary

// ========== SAFER PATTERN WITH NULL CHECKS ==========

// More robust version:
{
  combined: {
    $concatArrays: [
      {
        $cond: {
          if: {$isArray: "$primary"},
          then: "$primary",
          else: []
        }
      },
      {
        $cond: {
          if: {
            $and: [
              "$includeSecondary",
              {$isArray: "$secondary"}
            ]
          },
          then: "$secondary",
          else: []
        }
      }
    ]
  }
}
// Handles: null, undefined, non-array values gracefully

// ========== ADVANCED PATTERNS ==========

// Pattern 1: Multiple conditional arrays
{
  allTags: {
    $concatArrays: [
      "$required",
      {
        $cond: {
          if: "$includeOptional",
          then: "$optional",
          else: []
        }
      },
      {
        $cond: {
          if: "$includePremium",
          then: "$premium",
          else: []
        }
      }
    ]
  }
}

// Pattern 2: Conditional with default values
{
  combined: {
    $concatArrays: [
      {
        $ifNull: ["$primary", []]  // Default to empty array if null
      },
      {
        $cond: {
          if: "$includeSecondary",
          then: {$ifNull: ["$secondary", []]},
          else: []
        }
      }
    ]
  }
}

// Pattern 3: Nested conditionals
{
  combined: {
    $concatArrays: [
      "$primary",
      {
        $cond: {
          if: "$includeSecondary",
          then: {
            $concatArrays: [
              "$secondary",
              {
                $cond: {
                  if: "$includeTertiary",
                  then: "$tertiary",
                  else: []
                }
              }
            ]
          },
          else: []
        }
      }
    ]
  }
}

// ========== REAL-WORLD USE CASES ==========

// Use case 1: User permissions - include admin features conditionally
db.users.aggregate([
  {
    $project: {
      allPermissions: {
        $concatArrays: [
          "$basePermissions",
          {
            $cond: {
              if: "$isAdmin",
              then: "$adminPermissions",
              else: []
            }
          }
        ]
      }
    }
  }
])

// Use case 2: Product tags - include premium tags if feature enabled
db.products.aggregate([
  {
    $project: {
      allTags: {
        $concatArrays: [
          "$categoryTags",
          {
            $cond: {
              if: "$showPremiumTags",
              then: "$premiumTags",
              else: []
            }
          }
        ]
      }
    }
  }
])

// Use case 3: Order items - include gift items if gift option selected
db.orders.aggregate([
  {
    $project: {
      allItems: {
        $concatArrays: [
          "$cartItems",
          {
            $cond: {
              if: "$isGift",
              then: "$giftItems",
              else: []
            }
          }
        ]
      }
    }
  }
])

// Use case 4: Blog post categories - include trending if enabled
db.posts.aggregate([
  {
    $project: {
      categories: {
        $concatArrays: [
          "$baseCategories",
          {
            $cond: {
              if: "$isTrending",
              then: ["trending"],
              else: []
            }
          }
        ]
      }
    }
  }
])
```

**Summary:**

| Component | Purpose | Returns |
|-----------|---------|---------|
| **`$concatArrays`** | Combine multiple arrays | Single merged array |
| **`$cond`** | Conditional logic | Array or empty array based on condition |
| **`if: "$includeSecondary"`** | Check boolean flag | `true` or `false` |
| **`then: "$secondary"`** | Include if true | Secondary array |
| **`else: []`** | Exclude if false | Empty array (no addition) |

**Your Code Pattern:**
```javascript
combined: {
  $concatArrays: [
    "$primary",                    // ✅ Always included
    {
      $cond: {
        if: "$includeSecondary",   // ✅ Check flag
        then: "$secondary",        // ✅ Include if true
        else: []                   // ✅ Ignore if false
      }
    }
  ]
}
```

**Key Benefits:**
- ✅ Conditionally includes arrays based on flags
- ✅ Clean syntax - primary listed once
- ✅ Empty array trick: `[] + array = array` (no change)
- ✅ Flexible - easy to add more conditional arrays
- ✅ Common pattern for feature flags in aggregations

### $reverseArray
```javascript
// Reverses array order
db.users.aggregate([
  {
    $project: {
      name: 1,
      reversedHobbies: {$reverseArray: "$hobbies"}
    }
  }
])

// Get last N elements
db.posts.aggregate([
  {
    $project: {
      latestComments: {
        $slice: [{$reverseArray: "$comments"}, 5]
      }
    }
  }
])
```

### $slice (Array)
```javascript
// Returns subset of array
db.posts.aggregate([
  {
    $project: {
      title: 1,
      firstThreeComments: {$slice: ["$comments", 3]}
    }
  }
])

// Skip and limit
db.posts.aggregate([
  {
    $project: {
      title: 1,
      comments: {$slice: ["$comments", 5, 10]}  // Skip 5, return 10
    }
  }
])

// Last N elements
db.posts.aggregate([
  {
    $project: {
      recentComments: {$slice: ["$comments", -5]}
    }
  }
])
```

### $filter
```javascript
// Filters array based on condition
db.sales.aggregate([
  {
    $project: {
      quarter: 1,
      highValueItems: {
        $filter: {
          input: "$items",
          as: "item",
          cond: {$gte: ["$item.price", 100]}
        }
      }
    }
  }
])

// Complex filtering
db.students.aggregate([
  {
    $project: {
      name: 1,
      passedExams: {
        $filter: {
          input: "$exams",
          as: "exam",
          cond: {
            $and: [
              {$gte: ["$exam.score", 60]},
              {$eq: ["$exam.submitted", true]}
            ]
          }
        }
      }
    }
  }
])
```

### $map
```javascript
// Applies expression to each array element
db.orders.aggregate([
  {
    $project: {
      orderId: 1,
      itemPrices: {
        $map: {
          input: "$items",
          as: "item",
          in: "$item.price"
        }
      }
    }
  }
])

// Calculate values
db.products.aggregate([
  {
    $project: {
      name: 1,
      discountedPrices: {
        $map: {
          input: "$prices",
          as: "price",
          in: {$multiply: ["$price", 0.9]}
        }
      }
    }
  }
])

// Complex transformation
db.users.aggregate([
  {
    $project: {
      name: 1,
      fullNames: {
        $map: {
          input: "$contacts",
          as: "contact",
          in: {
            $concat: ["$contact.firstName", " ", "$contact.lastName"]
          }
        }
      }
    }
  }
])
```

### $reduce
```javascript
// Applies expression to array to reduce to single value
db.orders.aggregate([
  {
    $project: {
      orderId: 1,
      totalAmount: {
        $reduce: {
          input: "$items",
          initialValue: 0,
          in: {$add: ["$value", "$this.price"]}
        }
      }
    }
  }
])

// Concatenate strings
db.users.aggregate([
  {
    $project: {
      name: 1,
      hobbiesString: {
        $reduce: {
          input: "$hobbies",
          initialValue: "",
          in: {
            $concat: [
              "$value",
              {$cond: [{$eq: ["$value", ""]}, "", ", "]},
              "$this"
            ]
          }
        }
      }
    }
  }
])
```

---

## STRING EXPRESSION OPERATORS (Aggregation)

### $concat
```javascript
// Concatenates strings
db.users.aggregate([
  {
    $project: {
      fullName: {
        $concat: ["$firstName", " ", "$lastName"]
      }
    }
  }
])

// With null handling
db.users.aggregate([
  {
    $project: {
      address: {
        $concat: [
          {$ifNull: ["$street", ""]},
          ", ",
          {$ifNull: ["$city", ""]},
          ", ",
          {$ifNull: ["$zipcode", ""]}
        ]
      }
    }
  }
])

// Concatenate array elements
db.products.aggregate([
  {
    $project: {
      tagString: {
        $reduce: {
          input: "$tags",
          initialValue: "",
          in: {$concat: ["$value", " #", "$this"]}
        }
      }
    }
  }
])
```

**Detailed Explanation of `$reduce`:**

```javascript
// ========== WHAT IS $reduce? ==========
// $reduce is MongoDB's aggregation operator that processes an array
// and combines all elements into a single value using an accumulator
// Similar to JavaScript's Array.reduce() method

// Syntax:
$reduce: {
  input: <array>,           // Array to process
  initialValue: <value>,    // Starting value (accumulator)
  in: <expression>          // Expression to combine accumulator with each element
}

// ========== BREAKDOWN OF YOUR CODE ==========

tagString: {
  $reduce: {
    input: "$tags",                          // Array to process: ["javascript", "react", "node"]
    initialValue: "",                        // Start with empty string
    in: {$concat: ["$value", " #", "$this"]} // Combine accumulator with current element
  }
}

// Key variables in $reduce:
// - "$value" = accumulator (starts with initialValue, updates each iteration)
// - "$this" = current array element being processed

// ========== HOW IT WORKS STEP BY STEP ==========

// Input document:
{
  _id: 1,
  tags: ["javascript", "react", "node"]
}

// Execution flow:

// Iteration 1: First element "javascript"
//   $value = "" (initialValue)
//   $this = "javascript" (first element)
//   Expression: {$concat: ["", " #", "javascript"]}
//   Result: " #javascript"
//   $value = " #javascript" (updated accumulator)

// Iteration 2: Second element "react"
//   $value = " #javascript" (from previous iteration)
//   $this = "react" (second element)
//   Expression: {$concat: [" #javascript", " #", "react"]}
//   Result: " #javascript #react"
//   $value = " #javascript #react" (updated accumulator)

// Iteration 3: Third element "node"
//   $value = " #javascript #react" (from previous iteration)
//   $this = "node" (third element)
//   Expression: {$concat: [" #javascript #react", " #", "node"]}
//   Result: " #javascript #react #node"
//   $value = " #javascript #react #node" (final accumulator)

// Final output:
{
  _id: 1,
  tagString: " #javascript #react #node"
}

// ========== UNDERSTANDING THE VARIABLES ==========

// "$value" - The accumulator variable
//   - Starts with initialValue
//   - Updates each iteration with the result of "in" expression
//   - Carries forward the accumulated result

// "$this" - The current element
//   - Represents the current array element being processed
//   - Changes each iteration (moves through array)

// ========== MORE EXAMPLES ==========

// Example 1: Sum array of numbers
db.sales.aggregate([
  {
    $project: {
      total: {
        $reduce: {
          input: "$amounts",              // [100, 200, 300]
          initialValue: 0,                // Start at 0
          in: {$add: ["$value", "$this"]} // Add accumulator + current element
        }
      }
    }
  }
])

// Execution:
// Iteration 1: $value = 0, $this = 100 → result = 100
// Iteration 2: $value = 100, $this = 200 → result = 300
// Iteration 3: $value = 300, $this = 300 → result = 600
// Output: {total: 600}

// Example 2: Find maximum value
db.scores.aggregate([
  {
    $project: {
      maxScore: {
        $reduce: {
          input: "$scores",              // [85, 92, 78, 95]
          initialValue: 0,               // Start at 0
          in: {
            $cond: {
              if: {$gt: ["$this", "$value"]},  // If current > accumulator
              then: "$this",                    // Use current
              else: "$value"                    // Keep accumulator
            }
          }
        }
      }
    }
  }
])

// Execution:
// Iteration 1: $value = 0, $this = 85 → max(0, 85) = 85
// Iteration 2: $value = 85, $this = 92 → max(85, 92) = 92
// Iteration 3: $value = 92, $this = 78 → max(92, 78) = 92
// Iteration 4: $value = 92, $this = 95 → max(92, 95) = 95
// Output: {maxScore: 95}

// Example 3: Count elements matching condition
db.users.aggregate([
  {
    $project: {
      activeCount: {
        $reduce: {
          input: "$orders",
          initialValue: 0,
          in: {
            $cond: {
              if: {$eq: ["$this.status", "active"]},
              then: {$add: ["$value", 1]},  // Increment if active
              else: "$value"                 // Keep count if not
            }
          }
        }
      }
    }
  }
])

// Example 4: Build object from array
db.products.aggregate([
  {
    $project: {
      tagMap: {
        $reduce: {
          input: "$tags",                // ["electronics", "gaming"]
          initialValue: {},              // Start with empty object
          in: {
            $mergeObjects: [
              "$value",                  // Existing accumulator
              {
                $arrayToObject: [[       // Convert to key-value pair
                  {k: "$this", v: true}
                ]]
              }
            ]
          }
        }
      }
    }
  }
])

// Result: {tagMap: {electronics: true, gaming: true}}

// Example 5: Join strings with comma
db.products.aggregate([
  {
    $project: {
      tagList: {
        $reduce: {
          input: "$tags",
          initialValue: "",
          in: {
            $cond: {
              if: {$eq: ["$value", ""]},    // If accumulator is empty
              then: "$this",                 // Just use first element
              else: {$concat: ["$value", ", ", "$this"]}  // Add comma before element
            }
          }
        }
      }
    }
  }
])

// Input: tags: ["js", "react", "node"]
// Output: {tagList: "js, react, node"}

// ========== COMPARING WITH OTHER ARRAY OPERATORS ==========

// $map - Transform each element
{
  doubled: {
    $map: {
      input: "$numbers",      // [1, 2, 3]
      as: "num",
      in: {$multiply: ["$num", 2]}  // Each element * 2
    }
  }
}
// Output: [2, 4, 6]  (array of same length)

// $filter - Select elements
{
  evens: {
    $filter: {
      input: "$numbers",      // [1, 2, 3, 4]
      as: "num",
      cond: {$eq: [{$mod: ["$num", 2]}, 0]}  // Where num % 2 == 0
    }
  }
}
// Output: [2, 4]  (filtered array)

// $reduce - Combine all elements into single value
{
  sum: {
    $reduce: {
      input: "$numbers",      // [1, 2, 3]
      initialValue: 0,
      in: {$add: ["$value", "$this"]}
    }
  }
}
// Output: 6  (single value, not array)

// ========== ADVANCED PATTERNS ==========

// Pattern 1: Calculate average (sum + count)
db.scores.aggregate([
  {
    $project: {
      stats: {
        $reduce: {
          input: "$scores",              // [85, 92, 78]
          initialValue: {sum: 0, count: 0},  // Object as accumulator
          in: {
            sum: {$add: ["$value.sum", "$this"]},
            count: {$add: ["$value.count", 1]}
          }
        }
      }
    }
  },
  {
    $project: {
      average: {$divide: ["$stats.sum", "$stats.count"]}
    }
  }
])

// Pattern 2: Build nested structure
db.products.aggregate([
  {
    $project: {
      categories: {
        $reduce: {
          input: "$tags",
          initialValue: [],
          in: {
            $concatArrays: [
              "$value",
              [{
                name: "$this",
                count: 1
              }]
            ]
          }
        }
      }
    }
  }
])

// Pattern 3: Conditional accumulation
db.orders.aggregate([
  {
    $project: {
      summary: {
        $reduce: {
          input: "$items",
          initialValue: {total: 0, tax: 0, discount: 0},
          in: {
            total: {$add: ["$value.total", "$this.price"]},
            tax: {$add: ["$value.tax", {$multiply: ["$this.price", 0.1]}]},
            discount: {
              $cond: {
                if: {$gt: ["$this.price", 100]},
                then: {$add: ["$value.discount", {$multiply: ["$this.price", 0.1]}]},
                else: "$value.discount"
              }
            }
          }
        }
      }
    }
  }
])

// ========== EDGE CASES ==========

// Edge case 1: Empty array
{
  tags: []
}
// Result: tagString = "" (returns initialValue)

// Edge case 2: Single element
{
  tags: ["javascript"]
}
// Result: tagString = " #javascript"

// Edge case 3: Array with null/undefined
{
  tags: ["js", null, "react"]
}
// $concat handles null gracefully
// Result: tagString = " #js #null #react"

// Edge case 4: Different data types
{
  tags: ["string", 123, true]
}
// $concat converts to strings
// Result: tagString = " #string #123 #true"

// ========== REAL-WORLD USE CASES ==========

// Use case 1: Generate CSV from array
db.orders.aggregate([
  {
    $project: {
      csvItems: {
        $reduce: {
          input: "$items",
          initialValue: "",
          in: {
            $cond: {
              if: {$eq: ["$value", ""]},
              then: "$this.name",
              else: {$concat: ["$value", ",", "$this.name"]}
            }
          }
        }
      }
    }
  }
])

// Use case 2: Calculate total order value with discounts
db.orders.aggregate([
  {
    $project: {
      finalTotal: {
        $reduce: {
          input: "$items",
          initialValue: 0,
          in: {
            $add: [
              "$value",
              {
                $subtract: [
                  "$this.price",
                  {$multiply: ["$this.price", "$this.discount"]}
                ]
              }
            ]
          }
        }
      }
    }
  }
])

// Use case 3: Create hashtag string (your example)
db.posts.aggregate([
  {
    $project: {
      hashtags: {
        $reduce: {
          input: "$tags",
          initialValue: "",
          in: {$concat: ["$value", " #", "$this"]}
        }
      }
    }
  }
])

// Use case 4: Build URL query string
db.products.aggregate([
  {
    $project: {
      filters: {
        $reduce: {
          input: "$filters",
          initialValue: "",
          in: {
            $cond: {
              if: {$eq: ["$value", ""]},
              then: {$concat: ["?", "$this.key", "=", "$this.value"]},
              else: {$concat: ["$value", "&", "$this.key", "=", "$this.value"]}
            }
          }
        }
      }
    }
  }
])

// ========== COMMON MISTAKES ==========

// ❌ MISTAKE 1: Forgetting initialValue
{
  $reduce: {
    input: "$tags",
    in: {$concat: ["$value", "$this"]}  // Error: initialValue missing
  }
}

// ✅ CORRECT: Always provide initialValue
{
  $reduce: {
    input: "$tags",
    initialValue: "",                     // ✅ Required
    in: {$concat: ["$value", "$this"]}
  }
}

// ❌ MISTAKE 2: Using wrong variable names
{
  $reduce: {
    input: "$tags",
    initialValue: "",
    in: {$concat: ["$accumulator", "$element"]}  // Wrong variable names
  }
}

// ✅ CORRECT: Use "$value" and "$this"
{
  $reduce: {
    input: "$tags",
    initialValue: "",
    in: {$concat: ["$value", "$this"]}  // ✅ Correct variables
  }
}

// ❌ MISTAKE 3: Not updating accumulator properly
{
  $reduce: {
    input: "$tags",
    initialValue: "",
    in: "$this"  // Always overwrites, doesn't accumulate
  }
}

// ✅ CORRECT: Combine accumulator with current element
{
  $reduce: {
    input: "$tags",
    initialValue: "",
    in: {$concat: ["$value", "$this"]}  // ✅ Accumulates
  }
}
```

**Summary:**

| Component | Purpose | Example |
|-----------|---------|---------|
| **`input`** | Array to process | `"$tags"` → `["js", "react"]` |
| **`initialValue`** | Starting accumulator | `""` (empty string) |
| **`in`** | Combination expression | `{$concat: ["$value", "$this"]}` |
| **`$value`** | Accumulator variable | Carries forward result |
| **`$this`** | Current element | Current array item |

**Your Code Pattern:**
```javascript
tagString: {
  $reduce: {
    input: "$tags",                        // ✅ Array to process
    initialValue: "",                      // ✅ Start with empty string
    in: {$concat: ["$value", " #", "$this"]} // ✅ Build hashtag string
  }
}
```

**Key Benefits:**
- ✅ Transforms array into single value
- ✅ Flexible - can accumulate any data type
- ✅ Powerful for complex calculations
- ✅ Similar to JavaScript's `reduce()` method

### $strcasecmp
```javascript
// Case-insensitive string comparison
// Returns: 0 (equal), 1 (str1 > str2), -1 (str1 < str2)
db.products.aggregate([
  {
    $project: {
      name: 1,
      comparison: {
        $strcasecmp: ["$category", "electronics"]
      }
    }
  }
])

// Filtering with comparison
db.users.aggregate([
  {
    $match: {
      $expr: {
        $eq: [{$strcasecmp: ["$status", "ACTIVE"]}, 0]
      }
    }
  }
])
```

### $toUpper
```javascript
// Converts string to uppercase
db.users.aggregate([
  {
    $project: {
      name: 1,
      upperName: {$toUpper: "$name"}
    }
  }
])

// Use in grouping
db.products.aggregate([
  {
    $group: {
      _id: {$toUpper: "$category"},
      count: {$sum: 1}
    }
  }
])
```

### $toLower
```javascript
// Converts string to lowercase
db.users.aggregate([
  {
    $project: {
      email: 1,
      lowerEmail: {$toLower: "$email"}
    }
  }
])

// Normalize for matching
db.users.aggregate([
  {
    $match: {
      $expr: {
        $eq: [{$toLower: "$status"}, "active"]
      }
    }
  }
])
```

### $substr / $substrCP
```javascript
// Extracts substring (character position)
db.users.aggregate([
  {
    $project: {
      name: 1,
      initials: {
        $concat: [
          {$substrCP: ["$firstName", 0, 1]},
          {$substrCP: ["$lastName", 0, 1]}
        ]
      }
    }
  }
])

// Extract area code
db.contacts.aggregate([
  {
    $project: {
      phone: 1,
      areaCode: {$substrCP: ["$phone", 0, 3]}
    }
  }
])

// $substrCP works with Unicode code points
// $substr works with bytes (use substrCP for international text)
```

### $strLen / $strLenCP
```javascript
// Returns string length
db.posts.aggregate([
  {
    $project: {
      title: 1,
      titleLength: {$strLenCP: "$title"}
    }
  }
])

// Filter by length
db.passwords.aggregate([
  {
    $match: {
      $expr: {$gte: [{$strLenCP: "$password"}, 8]}
    }
  }
])
```

### $split
```javascript
// Splits string into array
db.users.aggregate([
  {
    $project: {
      email: 1,
      emailParts: {$split: ["$email", "@"]}
    }
  }
])

// Extract domain
db.users.aggregate([
  {
    $project: {
      email: 1,
      domain: {
        $arrayElemAt: [{$split: ["$email", "@"]}, 1]
      }
    }
  }
])

// Split CSV
db.data.aggregate([
  {
    $project: {
      tagsArray: {$split: ["$tagsString", ","]}
    }
  }
])
```

### $trim / $ltrim / $rtrim
```javascript
// Remove whitespace
db.users.aggregate([
  {
    $project: {
      name: 1,
      cleanName: {$trim: {input: "$name"}}
    }
  }
])

// Custom characters
db.data.aggregate([
  {
    $project: {
      cleaned: {
        $trim: {
          input: "$text",
          chars: " .,;-"
        }
      }
    }
  }
])

// Left and right trim
db.strings.aggregate([
  {
    $project: {
      leftTrimmed: {$ltrim: {input: "$value"}},
      rightTrimmed: {$rtrim: {input: "$value"}}
    }
  }
])
```

**Detailed Explanation of `$ltrim` and `$rtrim`:**

```javascript
// ========== WHAT ARE $ltrim AND $rtrim? ==========
// $ltrim (Left Trim): Removes whitespace/characters from the START (left side) of string
// $rtrim (Right Trim): Removes whitespace/characters from the END (right side) of string
// $trim: Removes from BOTH sides (left + right)

// ========== KEY DIFFERENCES ==========

// $trim   → Removes from both left AND right sides
// $ltrim  → Removes ONLY from left side (start)
// $rtrim  → Removes ONLY from right side (end)

// ========== BREAKDOWN OF YOUR CODE ==========

leftTrimmed: {
  $ltrim: {
    input: "$value"  // String to trim from left side
  }
}

rightTrimmed: {
  $rtrim: {
    input: "$value"  // String to trim from right side
  }
}

// ========== HOW IT WORKS STEP BY STEP ==========

// Input document:
{
  _id: 1,
  value: "   Hello World   "
  //      ^^^ left spaces    ^^^ right spaces
}

// Execution:

// 1. $ltrim (Left Trim) - Removes left spaces only
leftTrimmed: {
  $ltrim: {
    input: "   Hello World   "
  }
}
// Result: "Hello World   " (left spaces removed, right spaces remain)

// 2. $rtrim (Right Trim) - Removes right spaces only
rightTrimmed: {
  $rtrim: {
    input: "   Hello World   "
  }
}
// Result: "   Hello World" (right spaces removed, left spaces remain)

// Final output:
{
  _id: 1,
  leftTrimmed: "Hello World   ",    // Left trimmed
  rightTrimmed: "   Hello World"    // Right trimmed
}

// ========== COMPARISON: $trim vs $ltrim vs $rtrim ==========

// Input string: "   Hello World   "
//                ^^^ left      ^^^ right

// $trim - Removes from BOTH sides
{
  clean: {
    $trim: {
      input: "   Hello World   "
    }
  }
}
// Output: "Hello World"  (both sides trimmed)

// $ltrim - Removes from LEFT side only
{
  leftClean: {
    $ltrim: {
      input: "   Hello World   "
    }
  }
}
// Output: "Hello World   "  (only left trimmed)

// $rtrim - Removes from RIGHT side only
{
  rightClean: {
    $rtrim: {
      input: "   Hello World   "
    }
  }
}
// Output: "   Hello World"  (only right trimmed)

// ========== COMPLETE EXAMPLE WITH REAL DATA ==========

// Input documents:
[
  {
    _id: 1,
    value: "   JavaScript   "  // Spaces on both sides
  },
  {
    _id: 2,
    value: "   React"  // Spaces only on left
  },
  {
    _id: 3,
    value: "Node.js   "  // Spaces only on right
  },
  {
    _id: 4,
    value: "MongoDB"  // No spaces
  }
]

// Aggregation pipeline:
db.strings.aggregate([
  {
    $project: {
      original: "$value",
      leftTrimmed: {$ltrim: {input: "$value"}},
      rightTrimmed: {$rtrim: {input: "$value"}},
      bothTrimmed: {$trim: {input: "$value"}}
    }
  }
])

// Output:
[
  {
    _id: 1,
    original: "   JavaScript   ",
    leftTrimmed: "JavaScript   ",    // Left spaces removed
    rightTrimmed: "   JavaScript",   // Right spaces removed
    bothTrimmed: "JavaScript"        // Both removed
  },
  {
    _id: 2,
    original: "   React",
    leftTrimmed: "React",            // Left spaces removed
    rightTrimmed: "   React",        // No right spaces to remove
    bothTrimmed: "React"             // Both removed
  },
  {
    _id: 3,
    original: "Node.js   ",
    leftTrimmed: "Node.js   ",       // No left spaces to remove
    rightTrimmed: "Node.js",         // Right spaces removed
    bothTrimmed: "Node.js"           // Both removed
  },
  {
    _id: 4,
    original: "MongoDB",
    leftTrimmed: "MongoDB",          // No spaces
    rightTrimmed: "MongoDB",         // No spaces
    bothTrimmed: "MongoDB"           // No spaces
  }
]

// ========== CUSTOM CHARACTERS (Advanced) ==========

// By default, $ltrim and $rtrim remove whitespace
// You can specify custom characters to trim

// Example 1: Trim specific characters from left
{
  leftTrimmed: {
    $ltrim: {
      input: "...,Hello World",
      chars: ".,;-"  // Remove dots, commas, semicolons, hyphens from left
    }
  }
}
// Input: "...,Hello World"
// Output: "Hello World"  (removed "...," from left)

// Example 2: Trim specific characters from right
{
  rightTrimmed: {
    $rtrim: {
      input: "Hello World...",
      chars: ".,;-"  // Remove dots, commas, semicolons, hyphens from right
    }
  }
}
// Input: "Hello World..."
// Output: "Hello World"  (removed "..." from right)

// Example 3: Trim custom characters from both sides
{
  cleaned: {
    $trim: {
      input: "...,Hello World...",
      chars: ".,;-"
    }
  }
}
// Input: "...,Hello World..."
// Output: "Hello World"  (removed from both sides)

// ========== REAL-WORLD USE CASES ==========

// Use case 1: Clean user input (remove left spaces)
db.users.aggregate([
  {
    $project: {
      username: {
        $ltrim: {
          input: "$username"  // Remove accidental leading spaces
        }
      }
    }
  }
])

// Use case 2: Clean file paths (remove trailing slashes)
db.files.aggregate([
  {
    $project: {
      cleanPath: {
        $rtrim: {
          input: "$path",
          chars: "/"  // Remove trailing slashes
        }
      }
    }
  }
])

// Use case 3: Clean email addresses (remove spaces from left)
db.contacts.aggregate([
  {
    $project: {
      email: {
        $ltrim: {
          input: "$email"  // Remove leading spaces from email
        }
      }
    }
  }
])

// Use case 4: Clean phone numbers (remove leading zeros)
db.users.aggregate([
  {
    $project: {
      phone: {
        $ltrim: {
          input: "$phone",
          chars: "0"  // Remove leading zeros
        }
      }
    }
  }
])

// Use case 5: Clean URLs (remove trailing slash)
db.links.aggregate([
  {
    $project: {
      url: {
        $rtrim: {
          input: "$url",
          chars: "/"  // Remove trailing slash
        }
      }
    }
  }
])

// Use case 6: Clean tags (remove leading/trailing commas)
db.posts.aggregate([
  {
    $project: {
      tags: {
        $trim: {
          input: "$tags",
          chars: ", "  // Remove commas and spaces
        }
      }
    }
  }
])

// Use case 7: Normalize strings (left trim for alignment)
db.products.aggregate([
  {
    $project: {
      name: 1,
      description: {
        $ltrim: {
          input: "$description"  // Remove leading spaces
        }
      }
    }
  }
])

// ========== COMBINING LEFT AND RIGHT TRIM ==========

// If you need both left and right trim separately:
{
  cleaned: {
    $rtrim: {
      input: {
        $ltrim: {
          input: "$value"  // First trim left, then trim right
        }
      }
    }
  }
}
// Same as: {$trim: {input: "$value"}}

// Step-by-step:
// 1. $ltrim removes left spaces: "   Hello   " → "Hello   "
// 2. $rtrim removes right spaces: "Hello   " → "Hello"
// Result: "Hello" (both sides trimmed)

// ========== EDGE CASES ==========

// Edge case 1: Only left spaces
{
  value: "   Hello"
}
// $ltrim: "Hello" ✅
// $rtrim: "   Hello" (no change, no right spaces)
// $trim: "Hello" ✅

// Edge case 2: Only right spaces
{
  value: "Hello   "
}
// $ltrim: "Hello   " (no change, no left spaces)
// $rtrim: "Hello" ✅
// $trim: "Hello" ✅

// Edge case 3: Spaces in middle (not trimmed)
{
  value: "Hello   World"  // Spaces between words
}
// $ltrim: "Hello   World" (doesn't remove middle spaces)
// $rtrim: "Hello   World" (doesn't remove middle spaces)
// $trim: "Hello   World" (doesn't remove middle spaces)
// Note: Only leading/trailing characters are removed

// Edge case 4: Empty string
{
  value: ""
}
// $ltrim: "" (no change)
// $rtrim: "" (no change)
// $trim: "" (no change)

// Edge case 5: Only spaces
{
  value: "     "
}
// $ltrim: "" (all spaces removed)
// $rtrim: "" (all spaces removed)
// $trim: "" (all spaces removed)

// Edge case 6: Mixed whitespace (tabs, newlines, spaces)
{
  value: "\t\n   Hello   \t\n"
}
// $ltrim: "Hello   \t\n" (removes leading tabs, newlines, spaces)
// $rtrim: "\t\n   Hello" (removes trailing tabs, newlines, spaces)
// $trim: "Hello" (removes from both sides)

// Edge case 7: Null or undefined
{
  value: null
}
// $ltrim: null (returns null)
// $rtrim: null (returns null)
// $trim: null (returns null)
// Note: Use $ifNull for default values

// ========== SAFE PATTERN WITH NULL HANDLING ==========

// More robust version:
{
  cleaned: {
    $ltrim: {
      input: {
        $ifNull: ["$value", ""]  // Handle null/undefined
      }
    }
  }
}

// Or combine both trims safely:
{
  cleaned: {
    $trim: {
      input: {
        $ifNull: ["$value", ""]
      }
    }
  }
}

// ========== ADVANCED PATTERNS ==========

// Pattern 1: Trim and uppercase
{
  normalized: {
    $toUpper: {
      $trim: {
        input: "$name"
      }
    }
  }
}

// Pattern 2: Multiple trims (remove multiple character types)
{
  cleaned: {
    $trim: {
      input: {
        $trim: {
          input: "$value",
          chars: " "  // First remove spaces
        }
      },
      chars: "\t\n"  // Then remove tabs and newlines
    }
  }
}

// Pattern 3: Conditional trim
{
  cleaned: {
    $cond: {
      if: {$isString: "$value"},
      then: {
        $trim: {
          input: "$value"
        }
      },
      else: "$value"
    }
  }
}

// Pattern 4: Trim and validate
{
  email: {
    $cond: {
      if: {
        $gt: [
          {$strLenCP: {
            $trim: {
              input: "$email"
            }
          }},
          0
        ]
      },
      then: {
        $trim: {
          input: "$email"
        }
      },
      else: null
    }
  }
}
```

**Summary:**

| Operator | Removes From | Default Behavior | Use Case |
|----------|--------------|------------------|----------|
| **`$ltrim`** | Left side (start) | Whitespace | Remove leading spaces/characters |
| **`$rtrim`** | Right side (end) | Whitespace | Remove trailing spaces/characters |
| **`$trim`** | Both sides | Whitespace | Remove leading and trailing spaces/characters |

**Your Code Pattern:**
```javascript
leftTrimmed: {
  $ltrim: {
    input: "$value"  // ✅ Removes spaces from LEFT side only
  }
}

rightTrimmed: {
  $rtrim: {
    input: "$value"  // ✅ Removes spaces from RIGHT side only
  }
}
```

**Key Points:**
- `$ltrim` = Remove from **start** (left)
- `$rtrim` = Remove from **end** (right)
- `$trim` = Remove from **both** sides
- Can specify custom characters with `chars` parameter
- Only removes leading/trailing characters, not middle ones
- Returns `null` if input is `null` or `undefined`

**When to Use:**
- **`$ltrim`**: Clean user input, remove leading zeros, normalize indentation
- **`$rtrim`**: Remove trailing slashes from URLs, clean file paths, remove trailing punctuation
- **`$trim`**: General string cleaning, email normalization, tag cleanup

### $indexOfCP
```javascript
// Returns index of substring
db.posts.aggregate([
  {
    $project: {
      content: 1,
      hashtagPosition: {
        $indexOfCP: ["$content", "#"]
      }
    }
  }
])

// With start and end positions
db.data.aggregate([
  {
    $project: {
      position: {
        $indexOfCP: ["$text", "search", 5, 100]
      }
    }
  }
])
```

### $regexFind / $regexMatch
```javascript
// Find regex pattern
db.users.aggregate([
  {
    $project: {
      email: 1,
      emailMatch: {
        $regexFind: {
          input: "$email",
          regex: /^([a-z0-9]+)@/
        }
      }
    }
  }
])

// Check if matches
db.products.aggregate([
  {
    $project: {
      sku: 1,
      isValid: {
        $regexMatch: {
          input: "$sku",
          regex: /^[A-Z]{3}-\d{4}$/
        }
      }
    }
  }
])
```

---

## ADVANCED QUERY EXAMPLES

### Complex Aggregation Pipeline
```javascript
// Sales analysis with multiple stages
db.orders.aggregate([
  // Stage 1: Match date range
  {
    $match: {
      orderDate: {
        $gte: ISODate("2024-01-01"),
        $lt: ISODate("2025-01-01")
      },
      status: "completed"
    }
  },
  // Stage 2: Unwind items array
  {
    $unwind: "$items"
  },
  // Stage 3: Lookup product details
  {
    $lookup: {
      from: "products",
      localField: "items.productId",
      foreignField: "_id",
      as: "productInfo"
    }
  },
  // Stage 4: Add calculated fields
  {
    $addFields: {
      itemTotal: {
        $multiply: ["$items.quantity", "$items.price"]
      },
      productName: {
        $arrayElemAt: ["$productInfo.name", 0]
      }
    }
  },
  // Stage 5: Group by product
  {
    $group: {
      _id: "$items.productId",
      productName: {$first: "$productName"},
      totalQuantity: {$sum: "$items.quantity"},
      totalRevenue: {$sum: "$itemTotal"},
      orderCount: {$sum: 1}
    }
  },
  // Stage 6: Sort by revenue
  {
    $sort: {totalRevenue: -1}
  },
  // Stage 7: Limit to top 10
  {
    $limit: 10
  },
  // Stage 8: Format output
  {
    $project: {
      _id: 0,
      productName: 1,
      totalQuantity: 1,
      totalRevenue: {$round: ["$totalRevenue", 2]},
      orderCount: 1,
      avgOrderValue: {
        $round: [{$divide: ["$totalRevenue", "$orderCount"]}, 2]
      }
    }
  }
])
```

### Text Search
```javascript
// Create text index first
db.articles.createIndex({
  title: "text",
  content: "text",
  tags: "text"
})

// Basic text search
db.articles.find({
  $text: {$search: "mongodb database"}
})

// Text search with score
db.articles.find(
  {$text: {$search: "mongodb tutorial"}},
  {score: {$meta: "textScore"}}
).sort({score: {$meta: "textScore"}})

// Exact phrase search
db.articles.find({
  $text: {$search: "\"NoSQL database\""}
})

// Exclude words
db.articles.find({
  $text: {$search: "mongodb -sql"}
})

// Case sensitive search
db.articles.find({
  $text: {
    $search: "MongoDB",
    $caseSensitive: true
  }
})
```

### Geospatial Queries
```javascript
// Create 2dsphere index
db.places.createIndex({location: "2dsphere"})

// Insert location data
db.places.insertOne({
  name: "Central Park",
  location: {
    type: "Point",
    coordinates: [-73.968285, 40.785091]  // [longitude, latitude]
  }
})

// Find nearby places
db.places.find({
  location: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [-73.9667, 40.7833]
      },
      $maxDistance: 1000  // meters
    }
  }
})

// Find within area
db.places.find({
  location: {
    $geoWithin: {
      $centerSphere: [
        [-73.9667, 40.7833],
        5 / 3963.2  // 5 miles in radians
      ]
    }
  }
})

// Find within polygon
db.places.find({
  location: {
    $geoWithin: {
      $geometry: {
        type: "Polygon",
        coordinates: [[
          [-73.9, 40.7],
          [-73.9, 40.8],
          [-74.0, 40.8],
          [-74.0, 40.7],
          [-73.9, 40.7]
        ]]
      }
    }
  }
})

// Geospatial aggregation
db.places.aggregate([
  {
    $geoNear: {
      near: {type: "Point", coordinates: [-73.9667, 40.7833]},
      distanceField: "distance",
      maxDistance: 5000,
      spherical: true
    }
  },
  {
    $project: {
      name: 1,
      distanceInKm: {$divide: ["$distance", 1000]}
    }
  }
])
```

**Detailed Explanation of `$geoWithin`, `$centerSphere`, and `$geoNear`:**

```javascript
// ========== WHAT ARE GEOSPATIAL QUERIES? ==========
// Geospatial queries allow you to search for documents based on geographic location
// MongoDB supports queries like: "Find all restaurants within 5 miles of this location"
// Requires: 2dsphere index on location field

// Key Concepts:
// - Location stored as GeoJSON: {type: "Point", coordinates: [longitude, latitude]}
// - Coordinates: [longitude, latitude] (NOT latitude, longitude!)
// - longitude: -180 to 180 (negative = west, positive = east)
// - latitude: -90 to 90 (negative = south, positive = north)

// ========== 1. $geoWithin ==========
// Finds documents with locations INSIDE a specified geographic area
// Does NOT require 2dsphere index (but benefits from it)
// Does NOT sort results by distance

// Syntax:
{
  location: {
    $geoWithin: {
      $geometry: <GeoJSON>,      // Polygon or MultiPolygon
      $centerSphere: <array>,    // Circle defined by center and radius
      $box: <array>,            // Rectangle (2d only)
      $polygon: <array>         // Polygon (2d only)
    }
  }
}

// ========== 2. $centerSphere ==========
// Defines a CIRCLE area on Earth's surface
// Used with $geoWithin to find points within radius

// Syntax:
$centerSphere: [
  [longitude, latitude],  // Center point [lon, lat]
  radiusInRadians         // Radius in radians (NOT meters/miles!)
]

// ========== BREAKDOWN OF YOUR CODE ==========

db.places.find({
  location: {
    $geoWithin: {
      $centerSphere: [
        [-73.9667, 40.7833],    // Center: NYC coordinates [longitude, latitude]
        5 / 3963.2               // Radius: 5 miles converted to radians
      ]
    }
  }
})

// Step-by-step:
// 1. $centerSphere creates a circle
//    - Center: [-73.9667, 40.7833] (NYC coordinates)
//    - Radius: 5 / 3963.2 radians
// 2. $geoWithin finds all locations INSIDE this circle
// 3. Returns places within 5 miles of NYC

// ========== RADIUS CONVERSION ==========

// Earth's radius: ~3,963.2 miles or ~6,378.1 kilometers

// Convert miles to radians:
// radians = miles / 3963.2
// Example: 5 miles = 5 / 3963.2 = 0.001261 radians

// Convert kilometers to radians:
// radians = kilometers / 6378.1
// Example: 10 km = 10 / 6378.1 = 0.001568 radians

// Common conversions:
5 miles    = 5 / 3963.2     = 0.001261 radians
10 miles   = 10 / 3963.2    = 0.002522 radians
1 km       = 1 / 6378.1     = 0.000157 radians
10 km      = 10 / 6378.1    = 0.001568 radians

// ========== COMPLETE EXAMPLES ==========

// Example 1: Find places within 5 miles of NYC
db.places.find({
  location: {
    $geoWithin: {
      $centerSphere: [
        [-73.9667, 40.7833],  // NYC: Longitude, Latitude
        5 / 3963.2             // 5 miles in radians
      ]
    }
  }
})

// Example 2: Find places within 10 km of London
db.places.find({
  location: {
    $geoWithin: {
      $centerSphere: [
        [-0.1276, 51.5074],   // London coordinates
        10 / 6378.1            // 10 km in radians
      ]
    }
  }
})

// Example 3: Find places within polygon (custom area)
db.places.find({
  location: {
    $geoWithin: {
      $geometry: {
        type: "Polygon",
        coordinates: [[
          [-73.9, 40.7],   // Corner 1
          [-73.9, 40.8],   // Corner 2
          [-74.0, 40.8],   // Corner 3
          [-74.0, 40.7],   // Corner 4
          [-73.9, 40.7]    // Close polygon (back to start)
        ]]
      }
    }
  }
})

// ========== 3. $geoNear (Aggregation) ==========
// Finds documents near a point AND sorts by distance
// MUST be first stage in aggregation pipeline
// REQUIRES 2dsphere index
// Calculates actual distance and adds it to results

// Syntax:
{
  $geoNear: {
    near: {type: "Point", coordinates: [lon, lat]},  // Center point
    distanceField: "distance",                        // Field to store distance
    maxDistance: <number>,                            // Max distance in meters
    minDistance: <number>,                            // Min distance in meters
    spherical: true,                                  // Use spherical calculations
    query: <filter>,                                  // Additional filters
    limit: <number>                                   // Max results
  }
}

// ========== BREAKDOWN OF YOUR $geoNear CODE ==========

db.places.aggregate([
  {
    $geoNear: {
      near: {type: "Point", coordinates: [-73.9667, 40.7833]},  // NYC
      distanceField: "distance",                                 // Add distance field
      maxDistance: 5000,                                         // Max 5000 meters (5 km)
      spherical: true                                            // Earth's surface calculation
    }
  },
  {
    $project: {
      name: 1,
      distanceInKm: {$divide: ["$distance", 1000]}  // Convert meters to km
    }
  }
])

// How it works:
// 1. $geoNear finds places near [-73.9667, 40.7833]
// 2. Calculates distance for each document (in meters)
// 3. Adds "distance" field to each result
// 4. Sorts by distance (closest first)
// 5. Limits to 5000 meters (5 km)
// 6. $project converts distance to kilometers

// Result example:
[
  {
    _id: 1,
    name: "Central Park",
    distance: 1234,           // meters from NYC
    distanceInKm: 1.234       // converted to km
  },
  {
    _id: 2,
    name: "Times Square",
    distance: 2345,           // meters from NYC
    distanceInKm: 2.345       // converted to km
  }
]

// ========== KEY DIFFERENCES ==========

// $geoWithin vs $geoNear:

// $geoWithin:
// ✅ Finds locations within area
// ❌ Does NOT sort by distance
// ❌ Does NOT calculate distance
// ✅ Can use without index (slower)
// ✅ Works with find() and aggregate()

// $geoNear:
// ✅ Finds locations near point
// ✅ Sorts by distance (closest first)
// ✅ Calculates actual distance
// ✅ Requires 2dsphere index
// ✅ Only works in aggregate() pipeline
// ✅ MUST be first stage in pipeline

// ========== PRACTICAL EXAMPLES ==========

// Example 1: Find nearby restaurants (using $geoWithin)
db.restaurants.find({
  location: {
    $geoWithin: {
      $centerSphere: [
        [-73.9667, 40.7833],  // User's location
        2 / 3963.2             // 2 miles radius
      ]
    }
  },
  cuisine: "Italian"  // Additional filter
})

// Example 2: Find closest restaurants sorted by distance (using $geoNear)
db.restaurants.aggregate([
  {
    $geoNear: {
      near: {type: "Point", coordinates: [-73.9667, 40.7833]},
      distanceField: "distance",
      maxDistance: 3218,      // 2 miles = 3218 meters
      spherical: true,
      query: {cuisine: "Italian"}  // Additional filter
    }
  },
  {
    $limit: 10  // Top 10 closest
  },
  {
    $project: {
      name: 1,
      cuisine: 1,
      distanceInMiles: {$divide: ["$distance", 1609.34]}  // Convert to miles
    }
  }
])

// Example 3: Find places within custom polygon area
db.places.find({
  location: {
    $geoWithin: {
      $geometry: {
        type: "Polygon",
        coordinates: [[
          [-74.0059, 40.7128],  // NYC boundaries
          [-74.0059, 40.7580],
          [-73.9352, 40.7580],
          [-73.9352, 40.7128],
          [-74.0059, 40.7128]   // Close polygon
        ]]
      }
    }
  }
})

// Example 4: $geoNear with complex aggregation
db.places.aggregate([
  {
    $geoNear: {
      near: {type: "Point", coordinates: [-73.9667, 40.7833]},
      distanceField: "distance",
      maxDistance: 5000,
      spherical: true,
      query: {
        rating: {$gte: 4.0},  // Only highly rated places
        category: "restaurant"
      }
    }
  },
  {
    $sort: {rating: -1}  // Sort by rating (descending)
  },
  {
    $limit: 5  // Top 5
  },
  {
    $project: {
      name: 1,
      rating: 1,
      distance: 1,
      distanceKm: {$divide: ["$distance", 1000]},
      distanceMiles: {$divide: ["$distance", 1609.34]}
    }
  }
])

// ========== SETUP REQUIREMENTS ==========

// Step 1: Create 2dsphere index (required for $geoNear, recommended for $geoWithin)
db.places.createIndex({location: "2dsphere"})

// Step 2: Store location as GeoJSON Point
db.places.insertOne({
  name: "Central Park",
  location: {
    type: "Point",
    coordinates: [-73.968285, 40.785091]  // [longitude, latitude]
  }
})

// Step 3: Query with geospatial operators
db.places.find({
  location: {
    $geoWithin: {
      $centerSphere: [[-73.9667, 40.7833], 5 / 3963.2]
    }
  }
})

// ========== COORDINATE FORMAT ==========

// ✅ CORRECT: [longitude, latitude]
{
  type: "Point",
  coordinates: [-73.9667, 40.7833]  // [lon, lat]
}

// ❌ WRONG: [latitude, longitude]
{
  type: "Point",
  coordinates: [40.7833, -73.9667]  // Wrong order!
}

// Common mistake: Reversing longitude and latitude
// Remember: GeoJSON uses [longitude, latitude] NOT [latitude, longitude]

// ========== DISTANCE UNITS ==========

// $geoNear distance is ALWAYS in METERS
{
  $geoNear: {
    distanceField: "distance",  // This will be in METERS
    maxDistance: 5000           // 5000 meters = 5 km
  }
}

// Convert to other units:
distanceInKm = distance / 1000          // meters to kilometers
distanceInMiles = distance / 1609.34    // meters to miles
distanceInFeet = distance * 3.28084     // meters to feet

// $centerSphere radius is ALWAYS in RADIANS
{
  $centerSphere: [
    [lon, lat],
    radiusInRadians  // Must be in radians!
  ]
}

// Convert to radians:
radians = miles / 3963.2      // miles to radians
radians = km / 6378.1         // kilometers to radians

// ========== EDGE CASES ==========

// Edge case 1: No results within radius
db.places.find({
  location: {
    $geoWithin: {
      $centerSphere: [
        [-73.9667, 40.7833],
        0.001 / 3963.2  // Very small radius (1 meter)
      ]
    }
  }
})
// Result: Empty array (no places within 1 meter)

// Edge case 2: Very large radius
db.places.find({
  location: {
    $geoWithin: {
      $centerSphere: [
        [-73.9667, 40.7833],
        1000 / 3963.2  // 1000 miles radius
      ]
    }
  }
})
// Result: Many places (entire region)

// Edge case 3: Missing location field
// Documents without location field are excluded from results

// Edge case 4: Invalid coordinates
{
  type: "Point",
  coordinates: [200, 100]  // Invalid: longitude > 180, latitude > 90
}
// Error: Invalid coordinates

// ========== REAL-WORLD USE CASES ==========

// Use case 1: Find nearby restaurants
db.restaurants.aggregate([
  {
    $geoNear: {
      near: {type: "Point", coordinates: [-73.9667, 40.7833]},
      distanceField: "distance",
      maxDistance: 5000,  // 5 km
      spherical: true,
      query: {isOpen: true}
    }
  },
  {
    $limit: 20
  }
])

// Use case 2: Find delivery areas within coverage zone
db.deliveryAreas.find({
  location: {
    $geoWithin: {
      $geometry: {
        type: "Polygon",
        coordinates: [[
          [-73.9, 40.7],
          [-73.9, 40.8],
          [-74.0, 40.8],
          [-74.0, 40.7],
          [-73.9, 40.7]
        ]]
      }
    }
  }
})

// Use case 3: Find all events within city
db.events.find({
  location: {
    $geoWithin: {
      $centerSphere: [
        [-73.9667, 40.7833],  // City center
        10 / 3963.2            // 10 miles radius
      ]
    }
  }
})

// Use case 4: Location-based search with distance
db.places.aggregate([
  {
    $geoNear: {
      near: {type: "Point", coordinates: [-73.9667, 40.7833]},
      distanceField: "distance",
      maxDistance: 10000,  // 10 km
      spherical: true
    }
  },
  {
    $match: {
      category: {$in: ["restaurant", "cafe"]},
      rating: {$gte: 4.0}
    }
  },
  {
    $project: {
      name: 1,
      category: 1,
      rating: 1,
      distanceKm: {$divide: ["$distance", 1000]},
      distanceMiles: {$divide: ["$distance", 1609.34]}
    }
  },
  {
    $sort: {distance: 1}  // Closest first
  },
  {
    $limit: 10
  }
])
```

**Summary:**

| Operator | Purpose | Sorts by Distance? | Calculates Distance? | Requires Index? | Use Case |
|----------|---------|-------------------|---------------------|----------------|----------|
| **`$geoWithin`** | Find locations within area | ❌ No | ❌ No | ⚠️ Recommended | Within radius/polygon |
| **`$centerSphere`** | Define circle area | - | - | - | Circle radius (with $geoWithin) |
| **`$geoNear`** | Find and sort by distance | ✅ Yes | ✅ Yes | ✅ Required | Nearest locations |

**Your Code Patterns:**

```javascript
// Pattern 1: $geoWithin with $centerSphere
{
  location: {
    $geoWithin: {
      $centerSphere: [
        [-73.9667, 40.7833],    // ✅ Center [lon, lat]
        5 / 3963.2               // ✅ Radius in radians (5 miles)
      ]
    }
  }
}

// Pattern 2: $geoNear aggregation
{
  $geoNear: {
    near: {type: "Point", coordinates: [-73.9667, 40.7833]},
    distanceField: "distance",  // ✅ Distance in meters
    maxDistance: 5000,          // ✅ Max 5000 meters
    spherical: true             // ✅ Use Earth's surface
  }
}
```

**Key Points:**
- Coordinates format: `[longitude, latitude]` (NOT `[latitude, longitude]`)
- `$centerSphere` radius: Must be in radians (miles/3963.2 or km/6378.1)
- `$geoNear` distance: Always in meters
- `$geoNear` must be first stage in aggregation pipeline
- Requires 2dsphere index for best performance
- `$geoWithin` = within area (no sorting)
- `$geoNear` = nearest (sorted by distance)

**Common Conversions:**
- Miles to radians: `miles / 3963.2`
- Kilometers to radians: `km / 6378.1`
- Meters to kilometers: `meters / 1000`
- Meters to miles: `meters / 1609.34`

### Working with Dates
```javascript
// Date range query
db.orders.find({
  createdAt: {
    $gte: ISODate("2024-01-01"),
    $lt: ISODate("2024-12-31")
  }
})

// Extract date parts
db.orders.aggregate([
  {
    $project: {
      orderId: 1,
      year: {$year: "$createdAt"},
      month: {$month: "$createdAt"},
      day: {$dayOfMonth: "$createdAt"},
      hour: {$hour: "$createdAt"},
      dayOfWeek: {$dayOfWeek: "$createdAt"}
    }
  }
])

// Group by date
db.sales.aggregate([
  {
    $group: {
      _id: {
        year: {$year: "$date"},
        month: {$month: "$date"}
      },
      totalSales: {$sum: "$amount"},
      count: {$sum: 1}
    }
  },
  {
    $sort: {"_id.year": 1, "_id.month": 1}
  }
])

// Calculate date differences
db.orders.aggregate([
  {
    $project: {
      orderId: 1,
      processingTime: {
        $divide: [
          {$subtract: ["$shippedDate", "$orderDate"]},
          1000 * 60 * 60 * 24  // Convert to days
        ]
      }
    }
  }
])

// Date truncation
db.logs.aggregate([
  {
    $group: {
      _id: {
        $dateToString: {
          format: "%Y-%m-%d",
          date: "$timestamp"
        }
      },
      count: {$sum: 1}
    }
  }
])
```

### Transactions (Multi-document ACID)
```javascript
// Start a session
const session = db.getMongo().startSession()

// Start transaction
session.startTransaction()

try {
  const ordersDB = session.getDatabase("ecommerce").orders
  const inventoryDB = session.getDatabase("ecommerce").inventory
  
  // Insert order
  ordersDB.insertOne({
    orderId: "ORD123",
    userId: "user456",
    items: [{productId: "PROD789", quantity: 2}],
    total: 199.98,
    status: "pending"
  })
  
  // Update inventory
  inventoryDB.updateOne(
    {productId: "PROD789"},
    {$inc: {quantity: -2}}
  )
  
  // Commit transaction
  session.commitTransaction()
  print("Transaction committed successfully")
  
} catch (error) {
  // Rollback on error
  session.abortTransaction()
  print("Transaction aborted:", error)
  
} finally {
  session.endSession()
}
```

**In-Depth Explanation of MongoDB Transactions:**

```javascript
// ========== WHAT ARE TRANSACTIONS? ==========
// Transactions ensure ACID properties for multi-document operations
// ACID = Atomicity, Consistency, Isolation, Durability
// All operations succeed together OR all fail together (rollback)

// Key Concepts:
// - Session: Context for transaction operations
// - Transaction: Group of operations that must succeed or fail together
// - Commit: Save all changes permanently
// - Rollback/Abort: Undo all changes if any operation fails

// ========== ACID PROPERTIES EXPLAINED ==========

// 1. ATOMICITY
// All operations in transaction succeed together OR all fail together
// No partial updates - it's all or nothing

// Example: Money transfer
// Operation 1: Deduct $100 from Account A
// Operation 2: Add $100 to Account B
// If Operation 2 fails, Operation 1 is automatically rolled back

// 2. CONSISTENCY
// Database remains in valid state before and after transaction
// All constraints and rules are maintained

// Example: Order creation
// - Order document created
// - Inventory updated
// - Both must be consistent (inventory can't go negative)

// 3. ISOLATION
// Concurrent transactions don't interfere with each other
// Each transaction sees consistent snapshot of data

// Example: Two users buying last item
// - Transaction 1: Check stock (1 left), reserve item
// - Transaction 2: Check stock (1 left), reserve item
// - Only one transaction succeeds (isolation prevents double-sale)

// 4. DURABILITY
// Once transaction commits, changes are permanent
// Survives system crashes, power failures

// ========== WHEN TO USE TRANSACTIONS ==========

// ✅ USE TRANSACTIONS FOR:
// - Multi-document operations that must be atomic
// - Financial operations (money transfers, payments)
// - Order processing (order + inventory update)
// - User registration (user + profile + settings)
// - Any operation where partial success is unacceptable

// ❌ DON'T USE TRANSACTIONS FOR:
// - Single document operations (already atomic)
// - Read-only operations
// - Operations that can tolerate eventual consistency
// - High-frequency operations (performance overhead)

// ========== DETAILED BREAKDOWN OF YOUR CODE ==========

// Step 1: Start Session
const session = db.getMongo().startSession()
// Creates a session object that tracks all operations
// Session is required for transactions

// Step 2: Start Transaction
session.startTransaction()
// Begins transaction - all subsequent operations are part of this transaction
// Changes are NOT visible to other sessions until commit

// Step 3: Perform Operations (within try block)
const ordersDB = session.getDatabase("ecommerce").orders
const inventoryDB = session.getDatabase("ecommerce").inventory

// CRITICAL: Must use session-specific collections!
// ❌ WRONG: db.orders.insertOne(...)  // Not part of transaction
// ✅ CORRECT: session.getDatabase("ecommerce").orders.insertOne(...)

// Operation 1: Insert order
ordersDB.insertOne({
  orderId: "ORD123",
  userId: "user456",
  items: [{productId: "PROD789", quantity: 2}],
  total: 199.98,
  status: "pending"
})
// This operation is part of transaction
// Not visible to other sessions yet

// Operation 2: Update inventory
inventoryDB.updateOne(
  {productId: "PROD789"},
  {$inc: {quantity: -2}}
)
// This operation is also part of transaction
// If this fails, order insertion will be rolled back

// Step 4: Commit Transaction
session.commitTransaction()
// Saves all changes permanently
// Makes changes visible to all other sessions
// Transaction is now complete

// Step 5: Error Handling
catch (error) {
  session.abortTransaction()
  // Undoes ALL operations in transaction
  // Database returns to state before transaction started
}

// Step 6: Cleanup
finally {
  session.endSession()
  // Always close session, even if transaction fails
  // Releases resources
}

// ========== COMPLETE REAL-WORLD EXAMPLE ==========

// Example: E-commerce Order Processing
async function processOrder(orderData) {
  const session = client.startSession();
  
  try {
    // Start transaction
    session.startTransaction();
    
    const ordersCollection = session.getDatabase("ecommerce").orders;
    const inventoryCollection = session.getDatabase("ecommerce").inventory;
    const usersCollection = session.getDatabase("ecommerce").users;
    
    // Step 1: Check inventory availability
    const product = await inventoryCollection.findOne(
      {productId: orderData.productId},
      {session}
    );
    
    if (!product || product.quantity < orderData.quantity) {
      throw new Error("Insufficient inventory");
    }
    
    // Step 2: Create order
    const order = await ordersCollection.insertOne({
      orderId: generateOrderId(),
      userId: orderData.userId,
      productId: orderData.productId,
      quantity: orderData.quantity,
      total: orderData.total,
      status: "pending",
      createdAt: new Date()
    }, {session});
    
    // Step 3: Update inventory
    await inventoryCollection.updateOne(
      {productId: orderData.productId},
      {$inc: {quantity: -orderData.quantity}},
      {session}
    );
    
    // Step 4: Update user's order count
    await usersCollection.updateOne(
      {userId: orderData.userId},
      {$inc: {orderCount: 1}},
      {session}
    );
    
    // Step 5: Process payment (external API call)
    const paymentResult = await processPayment(orderData.paymentInfo);
    
    if (!paymentResult.success) {
      throw new Error("Payment failed");
    }
    
    // Step 6: Update order status
    await ordersCollection.updateOne(
      {_id: order.insertedId},
      {$set: {status: "confirmed", paymentId: paymentResult.paymentId}},
      {session}
    );
    
    // All operations successful - commit transaction
    await session.commitTransaction();
    
    return {
      success: true,
      orderId: order.insertedId
    };
    
  } catch (error) {
    // Any error - rollback everything
    await session.abortTransaction();
    
    console.error("Transaction failed:", error);
    return {
      success: false,
      error: error.message
    };
    
  } finally {
    // Always close session
    await session.endSession();
  }
}

// ========== TRANSACTION ISOLATION LEVELS ==========

// MongoDB uses Snapshot Isolation by default
// Each transaction sees consistent snapshot of data

// Example: Read Uncommitted (MongoDB doesn't support)
// Transaction A: Updates document
// Transaction B: Can see uncommitted changes ❌ (not in MongoDB)

// Example: Read Committed (MongoDB default)
// Transaction A: Updates document (not committed yet)
// Transaction B: Cannot see uncommitted changes ✅
// Transaction B: Can see changes after Transaction A commits ✅

// Example: Repeatable Read (MongoDB default)
// Transaction A: Reads document (value = 100)
// Transaction B: Updates document (value = 200) and commits
// Transaction A: Reads same document again (still sees 100) ✅
// Transaction A sees consistent snapshot throughout

// Example: Serializable (highest isolation)
// Transactions execute as if they were serial (one after another)
// Prevents all concurrency issues

// ========== TRANSACTION LIMITATIONS ==========

// 1. Replica Set Required
// Transactions require replica set (at least 1 node)
// Single-node MongoDB cannot use transactions

// 2. WiredTiger Storage Engine
// Transactions only work with WiredTiger storage engine
// MMAPv1 (deprecated) doesn't support transactions

// 3. 16MB Document Size Limit
// Transaction operations still subject to 16MB document limit

// 4. Write Conflicts
// If two transactions modify same document, one will fail
// Error: WriteConflict - transaction must be retried

// 5. Performance Overhead
// Transactions have performance cost
// Use only when necessary

// 6. Timeout
// Transactions have default timeout (60 seconds)
// Long-running transactions may timeout

// ========== HANDLING WRITE CONFLICTS ==========

// Write Conflict: Two transactions try to modify same document
async function updateWithRetry(collection, filter, update, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const session = client.startSession();
    
    try {
      session.startTransaction();
      
      await collection.updateOne(filter, update, {session});
      
      await session.commitTransaction();
      return {success: true};
      
    } catch (error) {
      await session.abortTransaction();
      
      // Check if it's a write conflict
      if (error.hasErrorLabel('TransientTransactionError')) {
        // Retry transaction
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
          continue;
        }
      }
      
      throw error;
      
    } finally {
      await session.endSession();
    }
  }
}

// ========== TRANSACTION OPTIONS ==========

// Read Concern: What data can transaction read?
session.startTransaction({
  readConcern: {
    level: "snapshot"  // Read consistent snapshot
  },
  writeConcern: {
    w: "majority",     // Wait for majority of nodes
    wtimeout: 5000     // 5 second timeout
  }
});

// Read Concern Levels:
// - "local": Read latest data (may include uncommitted)
// - "majority": Read only committed data
// - "snapshot": Read consistent snapshot (for transactions)

// Write Concern Levels:
// - w: 1 - Wait for primary only
// - w: "majority" - Wait for majority of nodes
// - wtimeout: Timeout in milliseconds

// ========== NESTED TRANSACTIONS ==========

// MongoDB does NOT support nested transactions
// One transaction per session

// ❌ WRONG: Nested transactions
const session = client.startSession();
session.startTransaction();
// ... operations ...
session.startTransaction();  // Error: Already in transaction

// ✅ CORRECT: Single transaction
const session = client.startSession();
session.startTransaction();
// ... all operations ...
session.commitTransaction();

// ========== TRANSACTION ACROSS COLLECTIONS ==========

// Transactions can span multiple collections
async function transferMoney(fromUserId, toUserId, amount) {
  const session = client.startSession();
  
  try {
    session.startTransaction();
    
    const accountsCollection = session.getDatabase("bank").accounts;
    
    // Deduct from sender
    const fromResult = await accountsCollection.updateOne(
      {userId: fromUserId, balance: {$gte: amount}},
      {$inc: {balance: -amount}},
      {session}
    );
    
    if (fromResult.matchedCount === 0) {
      throw new Error("Insufficient balance");
    }
    
    // Add to receiver
    await accountsCollection.updateOne(
      {userId: toUserId},
      {$inc: {balance: amount}},
      {session}
    );
    
    // Create transaction record
    const transactionsCollection = session.getDatabase("bank").transactions;
    await transactionsCollection.insertOne({
      fromUserId,
      toUserId,
      amount,
      timestamp: new Date()
    }, {session});
    
    await session.commitTransaction();
    
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
}

// ========== TRANSACTION ACROSS DATABASES ==========

// Transactions can span multiple databases (same MongoDB instance)
async function crossDatabaseTransaction() {
  const session = client.startSession();
  
  try {
    session.startTransaction();
    
    // Database 1: E-commerce
    const ordersCollection = session.getDatabase("ecommerce").orders;
    await ordersCollection.insertOne({orderId: "ORD123"}, {session});
    
    // Database 2: Analytics
    const analyticsCollection = session.getDatabase("analytics").events;
    await analyticsCollection.insertOne({event: "order_created"}, {session});
    
    // Database 3: Notifications
    const notificationsCollection = session.getDatabase("notifications").queue;
    await notificationsCollection.insertOne({type: "order"}, {session});
    
    await session.commitTransaction();
    
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
}

// ========== TRANSACTION BEST PRACTICES ==========

// 1. Keep transactions short
// Long transactions increase conflict probability
// ❌ BAD: Long transaction with external API calls
// ✅ GOOD: Short transaction, external calls outside transaction

// 2. Handle write conflicts
// Always retry on TransientTransactionError
async function safeTransaction(operations) {
  const maxRetries = 3;
  
  for (let i = 0; i < maxRetries; i++) {
    const session = client.startSession();
    
    try {
      session.startTransaction();
      
      // Perform operations
      for (const op of operations) {
        await op(session);
      }
      
      await session.commitTransaction();
      return {success: true};
      
    } catch (error) {
      await session.abortTransaction();
      
      if (error.hasErrorLabel('TransientTransactionError') && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
        continue;
      }
      
      throw error;
      
    } finally {
      await session.endSession();
    }
  }
}

// 3. Use appropriate read/write concerns
session.startTransaction({
  readConcern: {level: "snapshot"},
  writeConcern: {w: "majority"}
});

// 4. Always use try-catch-finally
// Ensure session is always closed

// 5. Don't mix session and non-session operations
// ❌ BAD:
db.orders.insertOne({...});  // Not in transaction
session.getDatabase("ecommerce").inventory.updateOne(...);  // In transaction

// ✅ GOOD:
session.getDatabase("ecommerce").orders.insertOne({...}, {session});
session.getDatabase("ecommerce").inventory.updateOne(..., {session});

// ========== MONITORING TRANSACTIONS ==========

// Check transaction status
db.currentOp({
  "active": true,
  "secs_running": {$gt: 1},
  "op": "command",
  "command.transaction": {$exists: true}
});

// View transaction statistics
db.serverStatus().transactions;

// ========== COMMON PATTERNS ==========

// Pattern 1: Order Processing
async function createOrder(orderData) {
  const session = client.startSession();
  try {
    session.startTransaction();
    
    // Create order
    const order = await orders.insertOne(orderData, {session});
    
    // Update inventory
    await inventory.updateOne(
      {productId: orderData.productId},
      {$inc: {stock: -orderData.quantity}},
      {session}
    );
    
    // Update user stats
    await users.updateOne(
      {userId: orderData.userId},
      {$inc: {totalOrders: 1, totalSpent: orderData.total}},
      {session}
    );
    
    await session.commitTransaction();
    return order;
    
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
}

// Pattern 2: Two-Phase Commit (for distributed systems)
// Phase 1: Prepare (all participants ready)
// Phase 2: Commit (all participants commit)

// Pattern 3: Saga Pattern (alternative to transactions)
// For microservices where transactions span multiple services
// Each service has compensating transaction for rollback

// ========== EDGE CASES ==========

// Edge case 1: Transaction timeout
session.startTransaction({
  maxTimeMS: 30000  // 30 second timeout
});

// Edge case 2: Concurrent transactions
// Two transactions modifying same document
// One will succeed, other will get WriteConflict error
// Solution: Retry with exponential backoff

// Edge case 3: Network partition
// If replica set loses majority, transactions cannot commit
// Solution: Wait for network recovery or use write concern

// Edge case 4: Large transactions
// Transactions with many operations may be slow
// Solution: Break into smaller transactions if possible

// ========== PERFORMANCE CONSIDERATIONS ==========

// Transaction overhead:
// - Session creation: ~1ms
// - Transaction start: ~1ms
// - Each operation: +5-10ms (due to transaction tracking)
// - Commit: ~10-50ms (depending on write concern)

// Optimization tips:
// 1. Minimize operations in transaction
// 2. Use appropriate write concern (w: 1 is faster than w: "majority")
// 3. Keep transactions short
// 4. Avoid long-running operations inside transaction
// 5. Use indexes to reduce operation time

// ========== COMPARISON: TRANSACTIONS vs NO TRANSACTIONS ==========

// WITHOUT TRANSACTIONS:
db.orders.insertOne({orderId: "ORD123"});
db.inventory.updateOne({productId: "PROD789"}, {$inc: {quantity: -2}});
// Problem: If inventory update fails, order still exists (inconsistent state)

// WITH TRANSACTIONS:
const session = client.startSession();
session.startTransaction();
session.getDatabase("ecommerce").orders.insertOne({orderId: "ORD123"}, {session});
session.getDatabase("ecommerce").inventory.updateOne({productId: "PROD789"}, {$inc: {quantity: -2}}, {session});
session.commitTransaction();
// Solution: If inventory update fails, order insertion is rolled back (consistent state)
```

**Summary:**

| Concept | Description |
|---------|-------------|
| **Session** | Context for transaction operations |
| **Transaction** | Group of operations that succeed or fail together |
| **Commit** | Save all changes permanently |
| **Abort/Rollback** | Undo all changes |
| **ACID** | Atomicity, Consistency, Isolation, Durability |
| **Write Conflict** | Two transactions modifying same document |

**Key Requirements:**
- ✅ Replica Set (at least 1 node)
- ✅ WiredTiger storage engine
- ✅ All operations must use session
- ✅ Proper error handling with retry logic

**Best Practices:**
- Keep transactions short
- Handle write conflicts with retry
- Always close session in finally block
- Use appropriate read/write concerns
- Don't mix session and non-session operations

### Indexes and Performance
```javascript
// Create single field index
db.users.createIndex({email: 1})

// Compound index
db.orders.createIndex({userId: 1, orderDate: -1})

// Unique index
db.users.createIndex({email: 1}, {unique: true})

// Sparse index (only for documents with field)
db.users.createIndex({phoneNumber: 1}, {sparse: true})

// TTL index (auto-delete after time)
db.sessions.createIndex(
  {createdAt: 1},
  {expireAfterSeconds: 3600}  // 1 hour
)

// Partial index (conditional)
db.orders.createIndex(
  {orderDate: -1},
  {partialFilterExpression: {status: "completed"}}
)

// Text index
db.articles.createIndex({
  title: "text",
  content: "text"
})

// List all indexes
db.users.getIndexes()

// Drop index
db.users.dropIndex("email_1")

// Explain query performance
db.users.find({email: "user@example.com"}).explain("executionStats")

// Create index in background
db.products.createIndex(
  {name: 1},
  {background: true}
)
```

**In-Depth Explanation of Indexes and Performance:**

```javascript
// ========== WHAT ARE INDEXES? ==========
// Indexes are data structures that improve query performance
// Similar to book index - helps find data quickly without scanning entire collection
// Without index: MongoDB scans EVERY document (Collection Scan - slow)
// With index: MongoDB uses index to find documents directly (Index Scan - fast)

// Key Concepts:
// - Index: Data structure that stores field values + document locations
// - Collection Scan: Check every document (O(n) - slow)
// - Index Scan: Use index to find documents (O(log n) - fast)
// - Index Size: Takes storage space, but dramatically improves query speed

// ========== WHY USE INDEXES? ==========

// WITHOUT INDEX (Collection Scan):
db.users.find({email: "user@example.com"})
// MongoDB must check EVERY document in collection
// 1 million documents = 1 million checks ❌ (very slow)

// WITH INDEX (Index Scan):
db.users.createIndex({email: 1})
db.users.find({email: "user@example.com"})
// MongoDB uses index to find document directly
// 1 million documents = ~20 index lookups ✅ (very fast)

// Performance Difference:
// Collection Scan: O(n) - Linear time (1M docs = 1M operations)
// Index Scan: O(log n) - Logarithmic time (1M docs = ~20 operations)
// Speed improvement: 50,000x faster for large collections!

// ========== 1. SINGLE FIELD INDEX ==========

// Create index on single field
db.users.createIndex({email: 1})
// {email: 1} = Ascending order (A-Z, 0-9)
// {email: -1} = Descending order (Z-A, 9-0)

// How it works:
// Index structure (simplified):
// email          → document location
// "alice@..."    → document_123
// "bob@..."      → document_456
// "charlie@..."  → document_789

// Query: db.users.find({email: "bob@..."})
// 1. Look up "bob@..." in index
// 2. Get document location: document_456
// 3. Fetch document directly
// Result: Fast! ✅

// Sort order matters for queries:
db.users.createIndex({age: 1})  // Ascending
db.users.find({age: {$gte: 18}}).sort({age: 1})   // ✅ Uses index
db.users.find({age: {$gte: 18}}).sort({age: -1})    // ⚠️ May not use index efficiently

// ========== 2. COMPOUND INDEX ==========

// Index on multiple fields
db.orders.createIndex({userId: 1, orderDate: -1})
// Order matters! (userId first, then orderDate)

// Index structure (simplified):
// userId | orderDate → document location
// user1  | 2024-01-15 → doc_1
// user1  | 2024-01-14 → doc_2
// user1  | 2024-01-13 → doc_3
// user2  | 2024-01-15 → doc_4

// Query patterns that use this index:
db.orders.find({userId: "user1"})                                    // ✅ Uses index
db.orders.find({userId: "user1"}).sort({orderDate: -1})             // ✅ Uses index
db.orders.find({userId: "user1", orderDate: {$gte: ISODate("2024-01-01")}})  // ✅ Uses index

// Query patterns that DON'T use this index efficiently:
db.orders.find({orderDate: {$gte: ISODate("2024-01-01")}})         // ❌ Can't use (no userId)
db.orders.find({userId: "user1"}).sort({total: -1})                 // ❌ Different sort field

// Compound Index Rule: Left-to-Right Prefix Rule
// Index: {userId: 1, orderDate: -1, status: 1}
// ✅ Can use: {userId}
// ✅ Can use: {userId, orderDate}
// ✅ Can use: {userId, orderDate, status}
// ❌ Can't use: {orderDate} (skipped userId)
// ❌ Can't use: {status} (skipped userId, orderDate)

// ========== 3. UNIQUE INDEX ==========

// Prevents duplicate values
db.users.createIndex({email: 1}, {unique: true})

// How it works:
// - Index enforces uniqueness constraint
// - Inserting duplicate email will fail
// - Useful for primary keys, email addresses, usernames

// Example:
db.users.insertOne({email: "user@example.com"})  // ✅ Success
db.users.insertOne({email: "user@example.com"})  // ❌ Error: duplicate key

// Edge cases:
// - null values: Multiple nulls allowed (unless sparse: true)
// - Missing fields: Multiple missing fields allowed
// - Compound unique: Combination must be unique

// Compound unique index:
db.users.createIndex({email: 1, phone: 1}, {unique: true})
// Allows: {email: "a@x.com", phone: "123"} and {email: "a@x.com", phone: "456"}
// Prevents: Two documents with same {email: "a@x.com", phone: "123"}

// ========== 4. SPARSE INDEX ==========

// Only indexes documents that have the field
db.users.createIndex({phoneNumber: 1}, {sparse: true})

// Without sparse:
// - Indexes ALL documents (including those without phoneNumber)
// - Documents without phoneNumber have null in index
// - Takes more space

// With sparse:
// - Only indexes documents WITH phoneNumber
// - Documents without phoneNumber are NOT in index
// - Saves space, faster queries for documents with field

// Example:
// Documents:
// {_id: 1, name: "Alice", phoneNumber: "123-456-7890"}
// {_id: 2, name: "Bob"}  // No phoneNumber
// {_id: 3, name: "Charlie", phoneNumber: "987-654-3210"}

// Sparse index only indexes documents 1 and 3
// Document 2 is not in index

// Use cases:
// - Optional fields (phone, address, etc.)
// - Fields that exist in < 50% of documents
// - When you only query documents with the field

// ========== 5. TTL INDEX (Time-To-Live) ==========

// Automatically deletes documents after specified time
db.sessions.createIndex(
  {createdAt: 1},
  {expireAfterSeconds: 3600}  // Delete after 1 hour
)

// How it works:
// - MongoDB background process checks TTL index every 60 seconds
// - Deletes documents where: createdAt + expireAfterSeconds < current time
// - Field must be Date type or array of Dates

// Example:
// Document created at: 2024-01-01 10:00:00
// expireAfterSeconds: 3600 (1 hour)
// Document deleted at: 2024-01-01 11:00:00 (automatically)

// Use cases:
// - Session data
// - Temporary logs
// - Cache entries
// - OTP codes
// - Temporary uploads

// Edge cases:
// - Background process runs every 60 seconds (not instant)
// - Deletion may be delayed up to 60 seconds
// - Only works on single field (not compound)
// - Field must be Date type

// Multiple TTL indexes:
// - Only one TTL index per collection
// - MongoDB uses the first TTL index found

// ========== 6. PARTIAL INDEX ==========

// Index only documents matching filter condition
db.orders.createIndex(
  {orderDate: -1},
  {partialFilterExpression: {status: "completed"}}
)

// How it works:
// - Only indexes documents where status = "completed"
// - Saves space (smaller index)
// - Faster queries for completed orders
// - Cannot use for queries on other statuses

// Example:
// Documents:
// {_id: 1, orderDate: ISODate("2024-01-15"), status: "completed"}
// {_id: 2, orderDate: ISODate("2024-01-14"), status: "pending"}
// {_id: 3, orderDate: ISODate("2024-01-13"), status: "completed"}

// Partial index only indexes documents 1 and 3
// Document 2 (pending) is not in index

// Query patterns:
db.orders.find({status: "completed"}).sort({orderDate: -1})  // ✅ Uses index
db.orders.find({status: "pending"}).sort({orderDate: -1})    // ❌ Can't use index

// Use cases:
// - Index only active/important documents
// - Reduce index size for large collections
// - Common query patterns on subset of data

// ========== 7. TEXT INDEX ==========

// Full-text search index
db.articles.createIndex({
  title: "text",
  content: "text"
})

// How it works:
// - Creates searchable index of text content
// - Supports language-specific stemming
// - Enables $text search queries

// Query with text index:
db.articles.find({
  $text: {
    $search: "mongodb database",
    $caseSensitive: false
  }
})

// Text index features:
// - Case-insensitive search
// - Word stemming (run, runs, running → run)
// - Stop words removed (the, a, an, etc.)
// - Relevance scoring

// Limitations:
// - Only one text index per collection
// - Can combine with other fields in compound index
// - Language-specific (default: English)

// ========== 8. GEOSPATIAL INDEX (2dsphere) ==========

// For location-based queries
db.places.createIndex({location: "2dsphere"})

// Required for:
// - $near queries
// - $geoWithin queries
// - $geoNear aggregation

// Example:
db.places.find({
  location: {
    $near: {
      $geometry: {type: "Point", coordinates: [-73.9667, 40.7833]},
      $maxDistance: 1000
    }
  }
})

// ========== INDEX OPTIONS ==========

// 1. Background Index
db.products.createIndex({name: 1}, {background: true})
// - Creates index without blocking other operations
// - Slower than foreground (default)
// - Use for production systems

// 2. Name Index
db.users.createIndex({email: 1}, {name: "email_index"})
// - Custom name for index
// - Default: field_1_field_-1 (e.g., "email_1")

// 3. Collation
db.users.createIndex({name: 1}, {collation: {locale: "en", strength: 2}})
// - Language-specific sorting rules
// - Case-insensitive comparisons

// 4. Hidden Index
db.users.createIndex({email: 1}, {hidden: true})
// - Index exists but query planner ignores it
// - Useful for testing index removal

// ========== QUERY PERFORMANCE ANALYSIS ==========

// Explain query execution
db.users.find({email: "user@example.com"}).explain("executionStats")

// Output shows:
// - executionStats.stage: "IXSCAN" (index scan) or "COLLSCAN" (collection scan)
// - executionStats.executionTimeMillis: Query time
// - executionStats.totalDocsExamined: Documents checked
// - executionStats.totalKeysExamined: Index keys checked

// Good query (uses index):
{
  "executionStats": {
    "stage": "IXSCAN",              // ✅ Using index
    "executionTimeMillis": 5,       // ✅ Fast (5ms)
    "totalDocsExamined": 1,         // ✅ Only 1 document
    "totalKeysExamined": 1          // ✅ Only 1 index key
  }
}

// Bad query (collection scan):
{
  "executionStats": {
    "stage": "COLLSCAN",            // ❌ Collection scan
    "executionTimeMillis": 5000,    // ❌ Slow (5 seconds)
    "totalDocsExamined": 1000000,   // ❌ Checked 1M documents
    "totalKeysExamined": 0          // ❌ No index used
  }
}

// ========== INDEX SELECTION ==========

// MongoDB query planner chooses best index
// Factors:
// - Query shape (which fields are queried)
// - Sort order
// - Index selectivity (how unique values are)
// - Index size

// Example: Multiple indexes
db.users.createIndex({email: 1})
db.users.createIndex({email: 1, name: 1})
db.users.createIndex({name: 1})

// Query: db.users.find({email: "user@example.com"})
// MongoDB chooses: {email: 1} (most specific, smallest)

// Query: db.users.find({email: "user@example.com", name: "John"})
// MongoDB chooses: {email: 1, name: 1} (matches all query fields)

// ========== INDEX MAINTENANCE ==========

// List all indexes
db.users.getIndexes()
// Returns array of index definitions

// Drop index
db.users.dropIndex("email_1")  // By name
db.users.dropIndex({email: 1})  // By specification

// Drop all indexes (except _id)
db.users.dropIndexes()

// Rebuild index
db.users.reIndex()
// Rebuilds all indexes (rarely needed)

// Index statistics
db.users.stats().indexSizes
// Shows size of each index

// ========== INDEX BEST PRACTICES ==========

// 1. Index fields used in queries
// ✅ GOOD: Index fields in find(), sort(), $match
// ❌ BAD: Index fields never queried

// 2. Index fields used in sort
// ✅ GOOD: Index supports sort order
// ❌ BAD: Sort without index (in-memory sort is slow)

// 3. Compound index order matters
// ✅ GOOD: {userId: 1, orderDate: -1} for queries on userId
// ❌ BAD: {orderDate: -1, userId: 1} for queries on userId only

// 4. Use sparse indexes for optional fields
// ✅ GOOD: Sparse index on phoneNumber (only 30% have it)
// ❌ BAD: Regular index on phoneNumber (70% null values)

// 5. Use partial indexes for filtered queries
// ✅ GOOD: Partial index on completed orders (only 10% of data)
// ❌ BAD: Full index when querying subset

// 6. Monitor index usage
db.users.aggregate([
  {$indexStats: {}}
])
// Shows how often each index is used

// 7. Remove unused indexes
// Unused indexes waste space and slow writes
// Check index usage and drop unused ones

// 8. Index selectivity
// More selective indexes are better
// High selectivity: email (unique values)
// Low selectivity: gender (2-3 values)
// Index high-selectivity fields first in compound index

// ========== INDEX TRADE-OFFS ==========

// Benefits:
// ✅ Faster queries (10x to 1000x faster)
// ✅ Faster sorts
// ✅ Enforce uniqueness
// ✅ Support geospatial queries

// Costs:
// ❌ Storage space (indexes take disk space)
// ❌ Slower writes (must update index on insert/update/delete)
// ❌ Memory usage (indexes loaded into RAM)
// ❌ Maintenance overhead

// Rule of thumb:
// - Read-heavy: More indexes = better
// - Write-heavy: Fewer indexes = better
// - Balance based on query patterns

// ========== COMPOUND INDEX OPTIMIZATION ==========

// Example: E-commerce orders
db.orders.createIndex({userId: 1, status: 1, orderDate: -1})

// Query patterns:
// 1. Find user's orders: {userId: "user123"}
// 2. Find user's pending orders: {userId: "user123", status: "pending"}
// 3. Find user's recent orders, sorted: {userId: "user123"}.sort({orderDate: -1})

// Index order optimization:
// - Most selective field first (userId - many unique values)
// - Equality fields before range fields (userId, status before orderDate)
// - Sort field last if used for sorting

// ESR Rule (Equality, Sort, Range):
// 1. Equality: Fields with exact matches (userId, status)
// 2. Sort: Fields used for sorting (orderDate)
// 3. Range: Fields with ranges ($gte, $lt, etc.)

// ========== INDEX COVERAGE ==========

// Covered Query: Query can be answered using only index
// No need to fetch documents from collection

// Example:
db.users.createIndex({email: 1, name: 1})

// Covered query:
db.users.find({email: "user@example.com"}, {email: 1, name: 1, _id: 0})
// All fields in projection are in index
// MongoDB returns data from index only (very fast!)

// Not covered:
db.users.find({email: "user@example.com"}, {email: 1, name: 1, age: 1})
// age is not in index, must fetch document

// ========== INDEX INTERSECTION ==========

// MongoDB can use multiple indexes for single query
db.users.createIndex({email: 1})
db.users.createIndex({status: 1})

// Query:
db.users.find({email: "user@example.com", status: "active"})
// MongoDB may use both indexes and intersect results

// Usually less efficient than compound index:
db.users.createIndex({email: 1, status: 1})  // Better

// ========== COMMON MISTAKES ==========

// Mistake 1: Too many indexes
db.users.createIndex({email: 1})
db.users.createIndex({email: 1, name: 1})
db.users.createIndex({email: 1, name: 1, age: 1})
// Compound index {email: 1, name: 1, age: 1} covers all three
// Remove redundant indexes

// Mistake 2: Wrong index order
db.orders.createIndex({orderDate: -1, userId: 1})
// Query: db.orders.find({userId: "user123"})
// Can't use index efficiently
// Should be: {userId: 1, orderDate: -1}

// Mistake 3: Indexing low-selectivity fields first
db.users.createIndex({gender: 1, email: 1})
// gender has only 2-3 values, not selective
// Should be: {email: 1, gender: 1}

// Mistake 4: Not indexing sort fields
db.orders.find({userId: "user123"}).sort({orderDate: -1})
// Without index on orderDate, MongoDB does in-memory sort (slow)
// Should create: {userId: 1, orderDate: -1}

// Mistake 5: Creating index on every field
// More indexes ≠ better performance
// Each index slows writes and uses space

// ========== PERFORMANCE MONITORING ==========

// Check slow queries
db.setProfilingLevel(2)  // Log all operations
db.setProfilingLevel(1, {slowms: 100})  // Log operations > 100ms

// View slow queries
db.system.profile.find().sort({ts: -1}).limit(10)

// Index usage statistics
db.users.aggregate([{$indexStats: {}}])

// Collection statistics
db.users.stats()
// Shows: size, indexes, average document size

// ========== REAL-WORLD EXAMPLES ==========

// Example 1: User authentication
db.users.createIndex({email: 1}, {unique: true})
// Fast login queries, prevents duplicate emails

// Example 2: E-commerce product search
db.products.createIndex({category: 1, price: 1})
db.products.createIndex({name: "text", description: "text"})
// Fast category filtering and text search

// Example 3: Time-series data
db.logs.createIndex({timestamp: -1}, {expireAfterSeconds: 2592000})  // 30 days TTL
// Auto-delete old logs, fast recent log queries

// Example 4: Social media feed
db.posts.createIndex({userId: 1, createdAt: -1})
// Fast user timeline queries

// Example 5: Analytics queries
db.events.createIndex({eventType: 1, timestamp: -1})
db.events.createIndex({userId: 1, timestamp: -1})
// Fast filtering by event type or user
```

**Summary:**

| Index Type | Purpose | Use Case |
|------------|---------|----------|
| **Single Field** | Fast queries on one field | `{email: 1}` |
| **Compound** | Multiple fields together | `{userId: 1, orderDate: -1}` |
| **Unique** | Prevent duplicates | Email, username |
| **Sparse** | Only documents with field | Optional fields |
| **TTL** | Auto-delete after time | Sessions, logs |
| **Partial** | Only matching documents | Filtered queries |
| **Text** | Full-text search | Articles, content |
| **2dsphere** | Geospatial queries | Location-based |

**Key Performance Tips:**
- ✅ Index fields used in queries and sorts
- ✅ Use compound indexes for multi-field queries
- ✅ Put most selective fields first
- ✅ Use sparse/partial indexes when appropriate
- ✅ Monitor index usage and remove unused indexes
- ✅ Balance read performance vs write performance

**Performance Impact:**
- Without index: O(n) - Collection scan (slow)
- With index: O(log n) - Index scan (fast)
- Speed improvement: 10x to 1000x faster for large collections

### Schema Validation
```javascript
// Create collection with validation
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "email", "age"],
      properties: {
        name: {
          bsonType: "string",
          description: "must be a string and is required"
        },
        email: {
          bsonType: "string",
          pattern: "^.+@.+$",
          description: "must be a valid email address"
        },
        age: {
          bsonType: "int",
          minimum: 0,
          maximum: 150,
          description: "must be an integer between 0 and 150"
        },
        status: {
          enum: ["active", "inactive", "pending"],
          description: "can only be one of the enum values"
        },
        address: {
          bsonType: "object",
          properties: {
            street: {bsonType: "string"},
            city: {bsonType: "string"},
            zipcode: {bsonType: "string"}
          }
        }
      }
    }
  },
  validationLevel: "strict",  // or "moderate"
  validationAction: "error"   // or "warn"
})

// Add validation to existing collection
db.runCommand({
  collMod: "products",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "price"],
      properties: {
        name: {
          bsonType: "string"
        },
        price: {
          bsonType: "double",
          minimum: 0
        }
      }
    }
  }
})
```

### Bulk Write Operations
```javascript
// Bulk write with multiple operations
db.users.bulkWrite([
  {
    insertOne: {
      document: {
        name: "Alice",
        email: "alice@example.com"
      }
    }
  },
  {
    updateOne: {
      filter: {name: "Bob"},
      update: {$set: {status: "active"}}
    }
  },
  {
    updateMany: {
      filter: {age: {$lt: 18}},
      update: {$set: {category: "minor"}}
    }
  },
  {
    deleteOne: {
      filter: {status: "deleted"}
    }
  },
  {
    replaceOne: {
      filter: {_id: ObjectId("...")},
      replacement: {name: "New Name", status: "active"}
    }
  }
])

// Ordered vs Unordered bulk operations
db.users.bulkWrite(
  [...operations],
  {ordered: false}  // Continue on errors
)

// Initialize bulk operation (legacy)
const bulk = db.users.initializeUnorderedBulkOp()
bulk.insert({name: "User 1"})
bulk.insert({name: "User 2"})
bulk.find({name: "User 1"}).updateOne({$set: {status: "active"}})
bulk.execute()
```

**Detailed Explanation of Bulk Operations:**

```javascript
// ========== WHAT ARE BULK OPERATIONS? ==========
// Bulk operations allow you to perform multiple write operations efficiently
// Instead of sending individual requests, batch multiple operations together
// Much faster than individual insert/update/delete operations

// Key Concepts:
// - Bulk operations: Batch multiple operations in single request
// - Ordered: Execute in order, stop on first error
// - Unordered: Execute in parallel, continue on errors
// - Performance: 10x to 100x faster than individual operations

// ========== TWO APPROACHES ==========

// 1. MODERN: bulkWrite() (Recommended)
db.users.bulkWrite([
  {insertOne: {document: {...}}},
  {updateOne: {filter: {...}, update: {...}}},
  {deleteOne: {filter: {...}}}
])

// 2. LEGACY: initializeOrderedBulkOp() / initializeUnorderedBulkOp()
const bulk = db.users.initializeUnorderedBulkOp()
bulk.insert({...})
bulk.find({...}).updateOne({...})
bulk.execute()

// ========== BREAKDOWN OF YOUR CODE ==========

// Step 1: Initialize unordered bulk operation
const bulk = db.users.initializeUnorderedBulkOp()
// Creates bulk operation object
// Unordered = operations execute in parallel, continue on errors

// Step 2: Queue operations
bulk.insert({name: "User 1"})  // Operation 1: Insert document
bulk.insert({name: "User 2"})  // Operation 2: Insert document
bulk.find({name: "User 1"}).updateOne({$set: {status: "active"}})  // Operation 3: Update document

// Step 3: Execute all operations
bulk.execute()
// Sends all queued operations to MongoDB in single request
// Returns result with success/failure counts

// ========== ORDERED vs UNORDERED ==========

// Ordered Bulk Operations
const orderedBulk = db.users.initializeOrderedBulkOp()
orderedBulk.insert({name: "User 1"})     // Operation 1
orderedBulk.insert({email: "duplicate"}) // Operation 2
orderedBulk.insert({name: "User 3"})     // Operation 3 (if operation 2 fails, this won't execute)

// Characteristics:
// - Execute in order (sequential)
// - Stop on first error
// - Faster to detect first error
// - Slower overall (must wait for each operation)

// Example: Operation 2 fails (duplicate key)
// Result: Only Operation 1 executes, Operations 2 & 3 skipped

// Unordered Bulk Operations
const unorderedBulk = db.users.initializeUnorderedBulkOp()
unorderedBulk.insert({name: "User 1"})     // Operation 1
unorderedBulk.insert({email: "duplicate"}) // Operation 2 (may fail)
unorderedBulk.insert({name: "User 3"})     // Operation 3 (executes regardless)

// Characteristics:
// - Execute in parallel (may reorder)
// - Continue on errors
// - All operations attempt to execute
// - Faster overall (parallel execution)

// Example: Operation 2 fails (duplicate key)
// Result: Operations 1 & 3 execute, Operation 2 fails

// ========== COMPLETE EXAMPLE ==========

// Input: Array of user data
const usersToInsert = [
  {name: "Alice", email: "alice@example.com"},
  {name: "Bob", email: "bob@example.com"},
  {name: "Charlie", email: "charlie@example.com"}
]

// Unordered bulk insert
const bulk = db.users.initializeUnorderedBulkOp()

usersToInsert.forEach(user => {
  bulk.insert(user)
})

// Execute and get results
const result = bulk.execute()

// Result object:
{
  ok: 1,                    // Success indicator
  writeErrors: [],          // Array of errors (if any)
  writeConcernErrors: [],   // Write concern errors
  nInserted: 3,             // Number of documents inserted
  nUpserted: 0,             // Number of documents upserted
  nMatched: 0,              // Number of documents matched
  nModified: 0,             // Number of documents modified
  nRemoved: 0,              // Number of documents removed
  upserted: []              // Array of upserted document IDs
}

// ========== BULK OPERATION METHODS ==========

// Insert operations
bulk.insert({name: "User 1"})  // Insert single document
bulk.insert({name: "User 2"})

// Update operations
bulk.find({name: "User 1"}).updateOne({$set: {status: "active"}})  // Update first match
bulk.find({age: {$lt: 18}}).updateMany({$set: {category: "minor"}})  // Update all matches
bulk.find({email: "user@example.com"}).replaceOne({name: "New User", email: "user@example.com"})  // Replace document
bulk.find({name: "User"}).upsert().updateOne({$set: {status: "active"}})  // Upsert (insert if not found)

// Delete operations
bulk.find({status: "deleted"}).deleteOne()  // Delete first match
bulk.find({expired: true}).deleteMany()     // Delete all matches

// Mixed operations example
const bulk = db.users.initializeUnorderedBulkOp()

// Insert new users
bulk.insert({name: "User 1", email: "user1@example.com"})
bulk.insert({name: "User 2", email: "user2@example.com"})

// Update existing users
bulk.find({name: "Old User"}).updateOne({$set: {status: "active"}})
bulk.find({age: {$lt: 18}}).updateMany({$set: {category: "minor"}})

// Delete users
bulk.find({status: "deleted"}).deleteMany()

// Execute all operations
const result = bulk.execute()
console.log(`Inserted: ${result.nInserted}, Updated: ${result.nModified}, Deleted: ${result.nRemoved}`)

// ========== MODERN APPROACH: bulkWrite() ==========

// Recommended: Use bulkWrite() instead (cleaner API)
db.users.bulkWrite([
  // Insert operations
  {
    insertOne: {
      document: {
        name: "Alice",
        email: "alice@example.com"
      }
    }
  },
  
  // Update operations
  {
    updateOne: {
      filter: {name: "Bob"},
      update: {$set: {status: "active"}},
      upsert: true  // Optional: insert if not found
    }
  },
  {
    updateMany: {
      filter: {age: {$lt: 18}},
      update: {$set: {category: "minor"}}
    }
  },
  
  // Replace operation
  {
    replaceOne: {
      filter: {_id: ObjectId("...")},
      replacement: {name: "New Name", status: "active"}
    }
  },
  
  // Delete operations
  {
    deleteOne: {
      filter: {status: "deleted"}
    }
  },
  {
    deleteMany: {
      filter: {expired: true}
    }
  }
], {
  ordered: false,  // Unordered execution
  writeConcern: {w: "majority"}  // Optional: write concern
})

// Result:
{
  acknowledged: true,
  insertedCount: 1,
  matchedCount: 5,
  modifiedCount: 3,
  deletedCount: 10,
  upsertedCount: 1,
  upsertedIds: {...},
  insertedIds: {...}
}

// ========== WHEN TO USE BULK OPERATIONS ==========

// ✅ USE BULK OPERATIONS FOR:
// - Inserting multiple documents (100+ documents)
// - Updating many documents
// - Data migration
// - Batch processing
// - Performance-critical operations

// ❌ DON'T USE BULK OPERATIONS FOR:
// - Single document operations (regular insert/update is fine)
// - Real-time operations (use regular operations)
// - Operations requiring individual error handling

// ========== PERFORMANCE COMPARISON ==========

// Without bulk operations (1000 inserts):
for (let i = 0; i < 1000; i++) {
  db.users.insertOne({name: `User ${i}`})  // 1000 separate requests
}
// Time: ~10 seconds ❌ (network overhead for each request)

// With bulk operations (1000 inserts):
const bulk = db.users.initializeUnorderedBulkOp()
for (let i = 0; i < 1000; i++) {
  bulk.insert({name: `User ${i}`})
}
bulk.execute()  // Single request
// Time: ~0.5 seconds ✅ (10x to 20x faster!)

// ========== ERROR HANDLING ==========

// Ordered bulk operations
const orderedBulk = db.users.initializeOrderedBulkOp()
orderedBulk.insert({name: "User 1"})           // ✅ Success
orderedBulk.insert({email: "duplicate@..."})   // ❌ Error: duplicate
orderedBulk.insert({name: "User 3"})           // ❌ Skipped (stopped on error)

try {
  const result = orderedBulk.execute()
} catch (error) {
  console.log("Error:", error)
  // First error stops execution
}

// Unordered bulk operations
const unorderedBulk = db.users.initializeUnorderedBulkOp()
unorderedBulk.insert({name: "User 1"})         // ✅ Success
unorderedBulk.insert({email: "duplicate@..."}) // ❌ Error: duplicate (logged)
unorderedBulk.insert({name: "User 3"})         // ✅ Success (continues)

try {
  const result = unorderedBulk.execute()
  if (result.writeErrors.length > 0) {
    console.log("Some operations failed:", result.writeErrors)
    console.log("Successful operations:", result.nInserted)
  }
} catch (error) {
  console.log("Fatal error:", error)
}

// Access individual errors:
result.writeErrors.forEach(error => {
  console.log(`Operation ${error.index} failed: ${error.errmsg}`)
})

// ========== BEST PRACTICES ==========

// 1. Use unordered for better performance
// ✅ GOOD: Unordered (parallel execution)
const bulk = db.users.initializeUnorderedBulkOp()

// ⚠️ USE ORDERED: When operations depend on order
const orderedBulk = db.users.initializeOrderedBulkOp()
orderedBulk.insert({_id: 1, name: "User 1"})
orderedBulk.find({refId: 1}).updateOne({$set: {refName: "User 1"}})

// 2. Batch size limits
// MongoDB has 16MB limit per operation
// For very large batches, split into chunks:
const BATCH_SIZE = 1000
const users = [...10000 users...]

for (let i = 0; i < users.length; i += BATCH_SIZE) {
  const batch = users.slice(i, i + BATCH_SIZE)
  const bulk = db.users.initializeUnorderedBulkOp()
  
  batch.forEach(user => {
    bulk.insert(user)
  })
  
  bulk.execute()
}

// 3. Handle write errors
const result = bulk.execute()

if (result.writeErrors && result.writeErrors.length > 0) {
  // Some operations failed
  result.writeErrors.forEach(error => {
    console.error(`Operation ${error.index} failed:`, error.errmsg)
  })
} else {
  // All operations succeeded
  console.log("All operations completed successfully")
}

// 4. Use write concern for important operations
const bulk = db.users.initializeUnorderedBulkOp()
bulk.insert({...})
bulk.insert({...})

bulk.execute({
  writeConcern: {w: "majority", wtimeout: 5000}
})

// ========== REAL-WORLD EXAMPLES ==========

// Example 1: Bulk user import
async function importUsers(usersArray) {
  const bulk = db.users.initializeUnorderedBulkOp()
  
  usersArray.forEach(user => {
    bulk.insert({
      name: user.name,
      email: user.email,
      createdAt: new Date()
    })
  })
  
  const result = await bulk.execute()
  return {
    success: result.nInserted,
    errors: result.writeErrors.length
  }
}

// Example 2: Batch status update
function updateUserStatuses(userIds, status) {
  const bulk = db.users.initializeUnorderedBulkOp()
  
  userIds.forEach(userId => {
    bulk.find({_id: userId}).updateOne({
      $set: {status: status, updatedAt: new Date()}
    })
  })
  
  return bulk.execute()
}

// Example 3: Data migration
function migrateData() {
  const bulk = db.users_new.initializeUnorderedBulkOp()
  
  // Fetch all old users
  const oldUsers = db.users_old.find().toArray()
  
  oldUsers.forEach(user => {
    // Transform data
    const newUser = {
      name: user.fullName,
      email: user.emailAddress,
      age: user.age,
      migratedAt: new Date()
    }
    
    bulk.insert(newUser)
  })
  
  return bulk.execute()
}
```

**In-Depth Explanation of Data Migration in MongoDB:**

```javascript
// ========== WHAT IS DATA MIGRATION? ==========
// Data migration is the process of moving, transforming, or restructuring data
// from one format/structure to another within MongoDB or between systems
// Common scenarios: Schema changes, collection restructuring, data cleanup, system upgrades

// Key Concepts:
// - Source: Where data currently exists (old collection/schema)
// - Target: Where data should be moved (new collection/schema)
// - Transformation: Converting data format/structure
// - Validation: Ensuring data integrity after migration
// - Rollback: Ability to undo migration if needed

// ========== TYPES OF MIGRATIONS ==========

// 1. SCHEMA MIGRATION
// Changing document structure without moving collections
// Example: Adding/removing fields, changing field types, renaming fields

// Before:
{
  _id: 1,
  fullName: "John Doe",
  emailAddress: "john@example.com"
}

// After migration:
{
  _id: 1,
  name: "John Doe",        // Renamed from fullName
  email: "john@example.com", // Renamed from emailAddress
  createdAt: new Date()    // New field added
}

// 2. COLLECTION MIGRATION
// Moving data between collections
// Example: Splitting large collection, merging collections, archiving old data

// 3. DATABASE MIGRATION
// Moving data between databases
// Example: Moving from dev to prod, consolidating databases

// 4. DATA TRANSFORMATION
// Changing data format/values
// Example: Converting string dates to Date objects, normalizing phone numbers

// 5. DATA CLEANUP
// Removing invalid/duplicate data
// Example: Deduplication, removing null values, fixing corrupted data

// ========== MIGRATION STRATEGIES ==========

// Strategy 1: BIG BANG MIGRATION
// Migrate all data at once, switch immediately
// Pros: Fast, simple
// Cons: High risk, downtime required

async function bigBangMigration() {
  // Step 1: Migrate all data
  const oldData = await db.oldCollection.find().toArray()
  const bulk = db.newCollection.initializeUnorderedBulkOp()
  
  oldData.forEach(doc => {
    const transformed = transformDocument(doc)
    bulk.insert(transformed)
  })
  
  await bulk.execute()
  
  // Step 2: Switch application to new collection
  // Step 3: Drop old collection
  await db.oldCollection.drop()
}

// Strategy 2: INCREMENTAL MIGRATION
// Migrate data in batches, gradual switch
// Pros: Lower risk, no downtime
// Cons: More complex, takes longer

async function incrementalMigration() {
  const BATCH_SIZE = 1000
  let skip = 0
  let hasMore = true
  
  while (hasMore) {
    // Fetch batch
    const batch = await db.oldCollection
      .find()
      .skip(skip)
      .limit(BATCH_SIZE)
      .toArray()
    
    if (batch.length === 0) {
      hasMore = false
      break
    }
    
    // Transform and insert batch
    const bulk = db.newCollection.initializeUnorderedBulkOp()
    batch.forEach(doc => {
      const transformed = transformDocument(doc)
      bulk.insert(transformed)
    })
    
    await bulk.execute()
    
    skip += BATCH_SIZE
    console.log(`Migrated ${skip} documents`)
  }
}

// Strategy 3: DUAL WRITE (ZERO DOWNTIME)
// Write to both old and new collections
// Pros: Zero downtime, safe rollback
// Cons: Double writes, more complex

async function dualWriteMigration() {
  // Phase 1: Enable dual writes
  async function createUser(userData) {
    // Write to both collections
    await Promise.all([
      db.oldCollection.insertOne(userData),
      db.newCollection.insertOne(transformDocument(userData))
    ])
  }
  
  // Phase 2: Migrate existing data (background)
  await migrateExistingData()
  
  // Phase 3: Switch reads to new collection
  // Phase 4: Stop writing to old collection
  // Phase 5: Drop old collection
}

// Strategy 4: REPLICATION-BASED
// Use MongoDB replication for migration
// Pros: Built-in, reliable
// Cons: Requires replica set

// ========== COMPLETE MIGRATION EXAMPLE ==========

// Example: User Schema Migration
// Old schema: {fullName, emailAddress, phoneNumber}
// New schema: {name, email, phone, createdAt, updatedAt}

async function migrateUserSchema() {
  const session = client.startSession()
  
  try {
    session.startTransaction()
    
    const oldCollection = session.getDatabase("app").users_old
    const newCollection = session.getDatabase("app").users_new
    
    // Step 1: Get all documents
    const oldUsers = await oldCollection.find({}, {session}).toArray()
    
    console.log(`Starting migration of ${oldUsers.length} users`)
    
    // Step 2: Process in batches
    const BATCH_SIZE = 1000
    let migrated = 0
    let errors = []
    
    for (let i = 0; i < oldUsers.length; i += BATCH_SIZE) {
      const batch = oldUsers.slice(i, i + BATCH_SIZE)
      const bulk = newCollection.initializeUnorderedBulkOp()
      
      batch.forEach(oldUser => {
        try {
          // Transform document
          const newUser = {
            name: oldUser.fullName,              // Rename field
            email: oldUser.emailAddress,         // Rename field
            phone: normalizePhone(oldUser.phoneNumber), // Transform data
            createdAt: oldUser.createdAt || new Date(),
            updatedAt: new Date(),
            migratedAt: new Date(),
            migrationId: oldUser._id.toString()  // Track original
          }
          
          // Validate transformed data
          if (!newUser.name || !newUser.email) {
            throw new Error("Missing required fields")
          }
          
          bulk.insert(newUser)
          
        } catch (error) {
          errors.push({
            originalId: oldUser._id,
            error: error.message
          })
        }
      })
      
      // Execute batch
      const result = await bulk.execute({session})
      migrated += result.nInserted
      
      console.log(`Migrated batch: ${migrated}/${oldUsers.length}`)
    }
    
    // Step 3: Validate migration
    const oldCount = await oldCollection.countDocuments({}, {session})
    const newCount = await newCollection.countDocuments({}, {session})
    
    if (oldCount !== newCount) {
      throw new Error(`Count mismatch: old=${oldCount}, new=${newCount}`)
    }
    
    // Step 4: Commit transaction
    await session.commitTransaction()
    
    return {
      success: true,
      migrated,
      errors: errors.length,
      errorDetails: errors
    }
    
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    await session.endSession()
  }
}

// Helper function: Transform phone number
function normalizePhone(phone) {
  if (!phone) return null
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')
  
  // Format: +1-123-456-7890
  if (digits.length === 11 && digits[0] === '1') {
    return `+${digits[0]}-${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  
  // Format: 123-456-7890
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  
  return phone // Return as-is if can't normalize
}

// ========== MIGRATION WITH VALIDATION ==========

async function migrateWithValidation() {
  const stats = {
    total: 0,
    migrated: 0,
    skipped: 0,
    errors: []
  }
  
  const cursor = db.oldCollection.find()
  
  for await (const oldDoc of cursor) {
    stats.total++
    
    try {
      // Transform document
      const newDoc = transformDocument(oldDoc)
      
      // Validate transformed document
      const validation = validateDocument(newDoc)
      if (!validation.valid) {
        stats.skipped++
        stats.errors.push({
          id: oldDoc._id,
          reason: validation.errors
        })
        continue
      }
      
      // Check for duplicates
      const existing = await db.newCollection.findOne({email: newDoc.email})
      if (existing) {
        stats.skipped++
        stats.errors.push({
          id: oldDoc._id,
          reason: "Duplicate email"
        })
        continue
      }
      
      // Insert into new collection
      await db.newCollection.insertOne(newDoc)
      stats.migrated++
      
    } catch (error) {
      stats.errors.push({
        id: oldDoc._id,
        reason: error.message
      })
    }
  }
  
  return stats
}

// Validation function
function validateDocument(doc) {
  const errors = []
  
  if (!doc.name || doc.name.trim() === '') {
    errors.push("Name is required")
  }
  
  if (!doc.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(doc.email)) {
    errors.push("Invalid email format")
  }
  
  if (doc.age && (doc.age < 0 || doc.age > 150)) {
    errors.push("Invalid age")
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

// ========== MIGRATION WITH ROLLBACK ==========

async function migrateWithRollback() {
  const migrationId = new ObjectId()
  const rollbackData = []
  
  try {
    const cursor = db.oldCollection.find()
    
    for await (const oldDoc of cursor) {
      // Transform document
      const newDoc = transformDocument(oldDoc)
      
      // Store rollback info
      rollbackData.push({
        oldId: oldDoc._id,
        newId: null, // Will be set after insert
        oldDoc: oldDoc,
        migrationId: migrationId
      })
      
      // Insert into new collection
      const result = await db.newCollection.insertOne(newDoc)
      rollbackData[rollbackData.length - 1].newId = result.insertedId
    }
    
    // Save rollback data
    await db.migration_log.insertOne({
      migrationId,
      timestamp: new Date(),
      status: "completed",
      count: rollbackData.length,
      rollbackData
    })
    
    return {success: true, migrationId}
    
  } catch (error) {
    // Rollback on error
    await rollbackMigration(migrationId, rollbackData)
    throw error
  }
}

// Rollback function
async function rollbackMigration(migrationId, rollbackData) {
  console.log(`Rolling back migration ${migrationId}`)
  
  // Delete all migrated documents
  const newIds = rollbackData.map(r => r.newId).filter(id => id !== null)
  if (newIds.length > 0) {
    await db.newCollection.deleteMany({_id: {$in: newIds}})
  }
  
  // Update migration log
  await db.migration_log.updateOne(
    {migrationId},
    {$set: {status: "rolled_back", rolledBackAt: new Date()}}
  )
  
  console.log(`Rollback completed: ${newIds.length} documents deleted`)
}

// ========== FIELD-LEVEL MIGRATION ==========

// Migrate specific fields in existing collection
async function migrateFields() {
  const cursor = db.users.find({
    $or: [
      {fullName: {$exists: true}},      // Has old field
      {emailAddress: {$exists: true}}   // Has old field
    ]
  })
  
  const bulk = db.users.initializeUnorderedBulkOp()
  let count = 0
  
  for await (const user of cursor) {
    const update = {}
    
    // Rename fullName to name
    if (user.fullName && !user.name) {
      update.name = user.fullName
      update.$unset = {fullName: ""}
    }
    
    // Rename emailAddress to email
    if (user.emailAddress && !user.email) {
      update.email = user.emailAddress
      if (!update.$unset) update.$unset = {}
      update.$unset.emailAddress = ""
    }
    
    // Add updatedAt if not exists
    if (!user.updatedAt) {
      update.updatedAt = new Date()
    }
    
    if (Object.keys(update).length > 0) {
      bulk.find({_id: user._id}).updateOne({
        $set: update,
        ...(update.$unset && {$unset: update.$unset})
      })
      count++
    }
  }
  
  if (count > 0) {
    await bulk.execute()
    console.log(`Migrated ${count} documents`)
  }
}

// ========== DATA TYPE MIGRATION ==========

// Convert field types (string to Date, number to string, etc.)
async function migrateDataTypes() {
  const cursor = db.events.find({
    dateString: {$exists: true, $type: "string"}  // Has string date
  })
  
  const bulk = db.events.initializeUnorderedBulkOp()
  let count = 0
  
  for await (const event of cursor) {
    try {
      // Convert string date to Date object
      const dateObj = new Date(event.dateString)
      
      if (isNaN(dateObj.getTime())) {
        console.warn(`Invalid date for event ${event._id}: ${event.dateString}`)
        continue
      }
      
      bulk.find({_id: event._id}).updateOne({
        $set: {
          date: dateObj,
          migratedAt: new Date()
        },
        $unset: {
          dateString: ""
        }
      })
      
      count++
      
    } catch (error) {
      console.error(`Error migrating event ${event._id}:`, error)
    }
  }
  
  if (count > 0) {
    await bulk.execute()
    console.log(`Migrated ${count} date fields`)
  }
}

// ========== NESTED STRUCTURE MIGRATION ==========

// Flatten or restructure nested documents
async function migrateNestedStructure() {
  // Before: {user: {name: "John", contact: {email: "john@x.com", phone: "123"}}}
  // After: {name: "John", email: "john@x.com", phone: "123"}
  
  const cursor = db.oldCollection.find({
    "user.name": {$exists: true}
  })
  
  const bulk = db.newCollection.initializeUnorderedBulkOp()
  
  for await (const oldDoc of cursor) {
    const newDoc = {
      name: oldDoc.user?.name,
      email: oldDoc.user?.contact?.email,
      phone: oldDoc.user?.contact?.phone,
      migratedAt: new Date()
    }
    
    bulk.insert(newDoc)
  }
  
  await bulk.execute()
}

// ========== COLLECTION SPLIT MIGRATION ==========

// Split one collection into multiple collections
async function splitCollection() {
  const cursor = db.allProducts.find()
  
  const electronicsBulk = db.electronics.initializeUnorderedBulkOp()
  const booksBulk = db.books.initializeUnorderedBulkOp()
  const clothingBulk = db.clothing.initializeUnorderedBulkOp()
  
  for await (const product of cursor) {
    const transformed = {
      ...product,
      migratedAt: new Date()
    }
    
    switch (product.category) {
      case "Electronics":
        electronicsBulk.insert(transformed)
        break
      case "Books":
        booksBulk.insert(transformed)
        break
      case "Clothing":
        clothingBulk.insert(transformed)
        break
      default:
        console.warn(`Unknown category: ${product.category}`)
    }
  }
  
  await Promise.all([
    electronicsBulk.execute(),
    booksBulk.execute(),
    clothingBulk.execute()
  ])
}

// ========== COLLECTION MERGE MIGRATION ==========

// Merge multiple collections into one
async function mergeCollections() {
  const collections = [db.users_v1, db.users_v2, db.users_v3]
  const bulk = db.users_merged.initializeUnorderedBulkOp()
  
  for (const collection of collections) {
    const cursor = collection.find()
    
    for await (const doc of cursor) {
      const merged = {
        ...doc,
        source: collection.getName(),
        mergedAt: new Date()
      }
      
      bulk.insert(merged)
    }
  }
  
  await bulk.execute()
}

// ========== MIGRATION WITH DEDUPLICATION ==========

// Remove duplicates during migration
async function migrateWithDeduplication() {
  const seenEmails = new Set()
  const cursor = db.oldUsers.find()
  const bulk = db.newUsers.initializeUnorderedBulkOp()
  
  let duplicates = 0
  
  for await (const user of cursor) {
    const email = user.email?.toLowerCase()
    
    if (seenEmails.has(email)) {
      duplicates++
      console.log(`Skipping duplicate: ${email}`)
      continue
    }
    
    seenEmails.add(email)
    bulk.insert(transformDocument(user))
  }
  
  await bulk.execute()
  console.log(`Migrated with ${duplicates} duplicates removed`)
}

// ========== MIGRATION MONITORING ==========

// Track migration progress
async function migrateWithMonitoring() {
  const total = await db.oldCollection.countDocuments()
  const migrationLog = {
    startTime: new Date(),
    total,
    processed: 0,
    successful: 0,
    failed: 0,
    status: "in_progress"
  }
  
  await db.migration_log.insertOne(migrationLog)
  
  const cursor = db.oldCollection.find()
  const bulk = db.newCollection.initializeUnorderedBulkOp()
  let batchCount = 0
  
  for await (const doc of cursor) {
    try {
      bulk.insert(transformDocument(doc))
      batchCount++
      migrationLog.processed++
      
      // Execute batch every 1000 documents
      if (batchCount >= 1000) {
        await bulk.execute()
        bulk = db.newCollection.initializeUnorderedBulkOp()
        batchCount = 0
        
        // Update progress
        await db.migration_log.updateOne(
          {_id: migrationLog._id},
          {
            $set: {
              processed: migrationLog.processed,
              progress: (migrationLog.processed / total * 100).toFixed(2) + "%"
            }
          }
        )
      }
      
    } catch (error) {
      migrationLog.failed++
      console.error(`Error migrating document ${doc._id}:`, error)
    }
  }
  
  // Final batch
  if (batchCount > 0) {
    await bulk.execute()
  }
  
  // Complete migration log
  await db.migration_log.updateOne(
    {_id: migrationLog._id},
    {
      $set: {
        status: "completed",
        endTime: new Date(),
        successful: migrationLog.processed - migrationLog.failed,
        failed: migrationLog.failed
      }
    }
  )
}

// ========== MIGRATION BEST PRACTICES ==========

// 1. Backup before migration
async function backupBeforeMigration() {
  // Create backup collection
  await db.users.aggregate([
    {$match: {}},
    {$out: "users_backup_" + Date.now()}
  ])
  
  console.log("Backup created")
}

// 2. Test migration on subset
async function testMigration() {
  // Migrate small sample first
  const sample = await db.oldCollection.find().limit(100).toArray()
  
  // Test transformation
  const transformed = sample.map(transformDocument)
  
  // Validate
  transformed.forEach(doc => {
    if (!validateDocument(doc).valid) {
      throw new Error("Validation failed in test")
    }
  })
  
  console.log("Test migration successful")
}

// 3. Migrate in transactions (for consistency)
async function migrateInTransaction() {
  const session = client.startSession()
  
  try {
    session.startTransaction()
    
    const oldCollection = session.getDatabase("app").oldCollection
    const newCollection = session.getDatabase("app").newCollection
    
    const cursor = oldCollection.find({}, {session})
    
    for await (const oldDoc of cursor) {
      const newDoc = transformDocument(oldDoc)
      await newCollection.insertOne(newDoc, {session})
    }
    
    await session.commitTransaction()
    
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    await session.endSession()
  }
}

// 4. Verify data integrity after migration
async function verifyMigration() {
  const oldCount = await db.oldCollection.countDocuments()
  const newCount = await db.newCollection.countDocuments()
  
  if (oldCount !== newCount) {
    throw new Error(`Count mismatch: ${oldCount} vs ${newCount}`)
  }
  
  // Sample verification
  const sample = await db.oldCollection.find().limit(10).toArray()
  for (const oldDoc of sample) {
    const newDoc = await db.newCollection.findOne({
      migrationId: oldDoc._id.toString()
    })
    
    if (!newDoc) {
      throw new Error(`Document ${oldDoc._id} not found in new collection`)
    }
    
    // Verify key fields
    if (oldDoc.fullName !== newDoc.name) {
      throw new Error(`Name mismatch for ${oldDoc._id}`)
    }
  }
  
  console.log("Migration verification passed")
}

// 5. Gradual migration (zero downtime)
async function gradualMigration() {
  // Phase 1: Dual write
  async function createUser(userData) {
    await Promise.all([
      db.oldCollection.insertOne(userData),
      db.newCollection.insertOne(transformDocument(userData))
    ])
  }
  
  // Phase 2: Migrate existing data in background
  await migrateExistingData()
  
  // Phase 3: Switch reads to new collection
  // Phase 4: Stop writing to old collection
  // Phase 5: Final sync and drop old collection
}

// ========== COMMON MIGRATION PATTERNS ==========

// Pattern 1: Field Renaming
async function renameFields() {
  await db.users.updateMany(
    {fullName: {$exists: true}},
    [
      {
        $set: {
          name: "$fullName",
          updatedAt: new Date()
        }
      },
      {
        $unset: "fullName"
      }
    ]
  )
}

// Pattern 2: Add Default Values
async function addDefaultValues() {
  await db.users.updateMany(
    {status: {$exists: false}},
    {
      $set: {
        status: "active",
        createdAt: new Date()
      }
    }
  )
}

// Pattern 3: Remove Fields
async function removeFields() {
  await db.users.updateMany(
    {},
    {
      $unset: {
        deprecatedField: "",
        oldField: ""
      }
    }
  )
}

// Pattern 4: Convert Array to Object
async function arrayToObject() {
  // Before: {tags: ["tag1", "tag2"]}
  // After: {tags: {tag1: true, tag2: true}}
  
  const cursor = db.products.find({tags: {$type: "array"}})
  const bulk = db.products.initializeUnorderedBulkOp()
  
  for await (const product of cursor) {
    const tagsObj = {}
    product.tags.forEach(tag => {
      tagsObj[tag] = true
    })
    
    bulk.find({_id: product._id}).updateOne({
      $set: {tags: tagsObj}
    })
  }
  
  await bulk.execute()
}

// Pattern 5: Split Array into Multiple Documents
async function splitArray() {
  // Before: {userId: 1, orders: [{id: 1}, {id: 2}]}
  // After: Two documents: {userId: 1, orderId: 1}, {userId: 1, orderId: 2}
  
  const cursor = db.users.find({orders: {$exists: true, $ne: []}})
  const bulk = db.user_orders.initializeUnorderedBulkOp()
  
  for await (const user of cursor) {
    user.orders.forEach(order => {
      bulk.insert({
        userId: user._id,
        orderId: order.id,
        orderData: order,
        createdAt: new Date()
      })
    })
  }
  
  await bulk.execute()
}

// ========== MIGRATION TOOLS AND TECHNIQUES ==========

// Tool 1: Migration Script Template
class Migration {
  constructor(name, version) {
    this.name = name
    this.version = version
    this.startTime = null
    this.endTime = null
  }
  
  async up() {
    // Migration logic here
    throw new Error("Must implement up() method")
  }
  
  async down() {
    // Rollback logic here
    throw new Error("Must implement down() method")
  }
  
  async execute() {
    this.startTime = new Date()
    
    try {
      await this.up()
      this.endTime = new Date()
      
      await db.migrations.insertOne({
        name: this.name,
        version: this.version,
        status: "completed",
        startTime: this.startTime,
        endTime: this.endTime
      })
      
    } catch (error) {
      this.endTime = new Date()
      
      await db.migrations.insertOne({
        name: this.name,
        version: this.version,
        status: "failed",
        error: error.message,
        startTime: this.startTime,
        endTime: this.endTime
      })
      
      throw error
    }
  }
}

// Usage:
class RenameUserFields extends Migration {
  constructor() {
    super("rename_user_fields", "1.0.0")
  }
  
  async up() {
    await db.users.updateMany(
      {fullName: {$exists: true}},
      [
        {$set: {name: "$fullName"}},
        {$unset: "fullName"}
      ]
    )
  }
  
  async down() {
    await db.users.updateMany(
      {name: {$exists: true}},
      [
        {$set: {fullName: "$name"}},
        {$unset: "name"}
      ]
    )
  }
}

// ========== MIGRATION CHECKLIST ==========

/*
✅ PRE-MIGRATION:
1. Backup original data
2. Test migration on sample data
3. Document migration plan
4. Schedule maintenance window (if needed)
5. Notify stakeholders

✅ DURING MIGRATION:
1. Monitor progress
2. Log errors
3. Track metrics (speed, errors, etc.)
4. Validate data integrity
5. Keep old data until verified

✅ POST-MIGRATION:
1. Verify data counts match
2. Sample data validation
3. Run application tests
4. Monitor application performance
5. Keep backup for rollback period
6. Document migration results

✅ ROLLBACK PLAN:
1. Keep old collection/database
2. Store rollback data
3. Test rollback procedure
4. Document rollback steps
*/

// ========== REAL-WORLD MIGRATION SCENARIOS ==========

// Scenario 1: E-commerce Product Schema Update
async function migrateProductSchema() {
  // Old: {productName, productPrice, productCategory}
  // New: {name, price, category, sku, description}
  
  const cursor = db.products_old.find()
  const bulk = db.products_new.initializeUnorderedBulkOp()
  
  for await (const oldProduct of cursor) {
    const newProduct = {
      name: oldProduct.productName,
      price: parseFloat(oldProduct.productPrice),
      category: oldProduct.productCategory,
      sku: generateSKU(oldProduct),
      description: oldProduct.description || "",
      migratedAt: new Date()
    }
    
    bulk.insert(newProduct)
  }
  
  await bulk.execute()
}

// Scenario 2: User Authentication System Migration
async function migrateUserAuth() {
  // Migrate from old auth system to new
  const cursor = db.users_legacy.find()
  const bulk = db.users_new.initializeUnorderedBulkOp()
  
  for await (const oldUser of cursor) {
    // Hash password with new algorithm
    const newPasswordHash = await hashPassword(oldUser.password, "bcrypt")
    
    const newUser = {
      email: oldUser.email,
      passwordHash: newPasswordHash,
      authMethod: "bcrypt",
      migratedFrom: "legacy",
      migratedAt: new Date()
    }
    
    bulk.insert(newUser)
  }
  
  await bulk.execute()
}

// Scenario 3: Multi-tenant Data Isolation
async function migrateToMultiTenant() {
  // Add tenantId to all documents
  const TENANT_ID = "tenant_123"
  
  await db.products.updateMany(
    {tenantId: {$exists: false}},
    {
      $set: {
        tenantId: TENANT_ID,
        migratedAt: new Date()
      }
    }
  )
}

// ========== MIGRATION PERFORMANCE OPTIMIZATION ==========

// Optimize migration speed
async function optimizedMigration() {
  // 1. Use bulk operations
  const bulk = db.newCollection.initializeUnorderedBulkOp()
  
  // 2. Process in parallel batches
  const BATCH_SIZE = 5000
  const cursor = db.oldCollection.find().batchSize(BATCH_SIZE)
  
  // 3. Use projection to reduce data transfer
  const cursorOptimized = db.oldCollection.find(
    {},
    {projection: {field1: 1, field2: 1}} // Only needed fields
  )
  
  // 4. Disable indexes during migration (recreate after)
  await db.newCollection.dropIndexes()
  
  // Migrate data...
  
  // Recreate indexes
  await db.newCollection.createIndex({email: 1})
  await db.newCollection.createIndex({createdAt: -1})
}
```

**Summary:**

| Migration Type | Description | Use Case |
|----------------|-------------|----------|
| **Schema Migration** | Change document structure | Field renaming, type changes |
| **Collection Migration** | Move between collections | Data reorganization |
| **Database Migration** | Move between databases | System consolidation |
| **Data Transformation** | Change data format | Normalization, cleanup |
| **Incremental Migration** | Migrate in batches | Large datasets, zero downtime |
| **Big Bang Migration** | Migrate all at once | Small datasets, maintenance window |

**Best Practices:**
- ✅ Always backup before migration
- ✅ Test on sample data first
- ✅ Use transactions for consistency
- ✅ Monitor progress and log errors
- ✅ Verify data integrity after migration
- ✅ Keep rollback plan ready
- ✅ Use bulk operations for performance
- ✅ Document migration process

**Common Challenges:**
- Large datasets (use incremental migration)
- Data inconsistencies (validate before migration)
- Downtime requirements (use dual-write strategy)
- Rollback complexity (store rollback data)
- Performance impact (migrate during low traffic)

**Summary:**

| Method | Description | Use Case |
|--------|-------------|----------|
| **`initializeOrderedBulkOp()`** | Sequential execution, stops on error | Dependent operations |
| **`initializeUnorderedBulkOp()`** | Parallel execution, continues on error | Independent operations |
| **`bulkWrite()`** | Modern API (recommended) | All bulk operations |
| **`bulk.insert()`** | Queue insert operation | Multiple inserts |
| **`bulk.find().updateOne()`** | Queue update operation | Single document update |
| **`bulk.find().updateMany()`** | Queue update many | Multiple documents |
| **`bulk.find().deleteOne()`** | Queue delete operation | Single document delete |
| **`bulk.execute()`** | Execute all queued operations | Run all operations |

### Aggregation Framework - Advanced Stages

```javascript
// $facet - Multiple pipelines
db.products.aggregate([
  {
    $facet: {
      categoryCounts: [
        {$group: {_id: "$category", count: {$sum: 1}}},
        {$sort: {count: -1}}
      ],
      priceStats: [
        {
          $group: {
            _id: null,
            avgPrice: {$avg: "$price"},
            maxPrice: {$max: "$price"},
            minPrice: {$min: "$price"}
          }
        }
      ],
      topProducts: [
        {$sort: {sales: -1}},
        {$limit: 5}
      ]
    }
  }
])
```

**Detailed Explanation of `$facet` (Multiple Pipelines):**

```javascript
// ========== WHAT IS $facet? ==========
// $facet allows you to run MULTIPLE aggregation pipelines on the SAME input
// Each pipeline processes the same documents independently
// Results are combined into separate fields in output document
// Useful for generating multiple analytics/metrics in single query

// Key Concepts:
// - Multiple pipelines: Run different aggregations simultaneously
// - Same input: All pipelines process same documents
// - Independent: Each pipeline runs separately
// - Combined output: All results in single document

// ========== BREAKDOWN OF YOUR CODE ==========

{
  $facet: {
    categoryCounts: [         // Pipeline 1: Category statistics
      {$group: {_id: "$category", count: {$sum: 1}}},
      {$sort: {count: -1}}
    ],
    priceStats: [             // Pipeline 2: Price statistics
      {
        $group: {
          _id: null,
          avgPrice: {$avg: "$price"},
          maxPrice: {$max: "$price"},
          minPrice: {$min: "$price"}
        }
      }
    ],
    topProducts: [            // Pipeline 3: Top products
      {$sort: {sales: -1}},
      {$limit: 5}
    ]
  }
}

// How it works:
// 1. All three pipelines receive same input (all products)
// 2. Each pipeline processes independently
// 3. Results combined into single document with three fields

// Output structure:
{
  categoryCounts: [...],  // Result from Pipeline 1
  priceStats: [...],      // Result from Pipeline 2
  topProducts: [...]      // Result from Pipeline 3
}

// ========== COMPLETE EXAMPLE ==========

// Input documents:
[
  {_id: 1, name: "Laptop", category: "Electronics", price: 1200, sales: 150},
  {_id: 2, name: "Phone", category: "Electronics", price: 800, sales: 200},
  {_id: 3, name: "Book", category: "Books", price: 20, sales: 500},
  {_id: 4, name: "Tablet", category: "Electronics", price: 600, sales: 120},
  {_id: 5, name: "Pen", category: "Books", price: 2, sales: 1000}
]

// Aggregation with $facet:
db.products.aggregate([
  {
    $facet: {
      categoryCounts: [
        {$group: {_id: "$category", count: {$sum: 1}}},
        {$sort: {count: -1}}
      ],
      priceStats: [
        {
          $group: {
            _id: null,
            avgPrice: {$avg: "$price"},
            maxPrice: {$max: "$price"},
            minPrice: {$min: "$price"}
          }
        }
      ],
      topProducts: [
        {$sort: {sales: -1}},
        {$limit: 3}
      ]
    }
  }
])

// Output (single document):
[
  {
    categoryCounts: [
      {_id: "Electronics", count: 3},  // 3 electronics products
      {_id: "Books", count: 2}          // 2 books
    ],
    priceStats: [
      {
        _id: null,
        avgPrice: 524.4,                // Average of all prices
        maxPrice: 1200,                 // Highest price
        minPrice: 2                     // Lowest price
      }
    ],
    topProducts: [
      {_id: 5, name: "Pen", sales: 1000},     // Top seller
      {_id: 3, name: "Book", sales: 500},
      {_id: 2, name: "Phone", sales: 200}
    ]
  }
]

// ========== HOW $facet WORKS ==========

// Step-by-step execution:

// 1. $facet receives input documents
// Input: All products (5 documents)

// 2. Pipeline 1: categoryCounts
//   - Receives: All 5 products
//   - Groups by category
//   - Counts products per category
//   - Sorts by count
//   - Result: [{_id: "Electronics", count: 3}, {_id: "Books", count: 2}]

// 3. Pipeline 2: priceStats
//   - Receives: All 5 products (same input as Pipeline 1)
//   - Groups all products (_id: null)
//   - Calculates avg, max, min prices
//   - Result: [{_id: null, avgPrice: 524.4, maxPrice: 1200, minPrice: 2}]

// 4. Pipeline 3: topProducts
//   - Receives: All 5 products (same input as Pipeline 1)
//   - Sorts by sales (descending)
//   - Limits to 3 products
//   - Result: [top 3 products by sales]

// 5. Combine results
// All three results combined into single document

// ========== KEY BENEFITS ==========

// Without $facet (Multiple queries):
db.products.aggregate([...])  // Query 1: categoryCounts
db.products.aggregate([...])  // Query 2: priceStats
db.products.aggregate([...])  // Query 3: topProducts
// Problem: 3 separate queries, 3x network overhead

// With $facet (Single query):
db.products.aggregate([
  {$facet: {
    categoryCounts: [...],
    priceStats: [...],
    topProducts: [...]
  }}
])
// Solution: 1 query, all results together ✅

// Benefits:
// ✅ Single database round-trip
// ✅ All results in one response
// ✅ Faster overall (one query vs multiple)
// ✅ Atomic results (all from same snapshot)

// ========== MORE EXAMPLES ==========

// Example 1: Dashboard analytics
db.orders.aggregate([
  {
    $facet: {
      totalSales: [
        {
          $group: {
            _id: null,
            total: {$sum: "$amount"},
            count: {$sum: 1}
          }
        }
      ],
      salesByMonth: [
        {
          $group: {
            _id: {$dateToString: {format: "%Y-%m", date: "$date"}},
            total: {$sum: "$amount"}
          }
        },
        {$sort: {_id: 1}}
      ],
      topCustomers: [
        {
          $group: {
            _id: "$customerId",
            totalSpent: {$sum: "$amount"}
          }
        },
        {$sort: {totalSpent: -1}},
        {$limit: 10}
      ],
      recentOrders: [
        {$sort: {date: -1}},
        {$limit: 5}
      ]
    }
  }
])

// Output: Single document with all dashboard metrics

// Example 2: User profile with statistics
db.users.aggregate([
  {$match: {userId: "user123"}},
  {
    $facet: {
      profile: [
        {$project: {name: 1, email: 1, createdAt: 1}}
      ],
      orderStats: [
        {
          $lookup: {
            from: "orders",
            localField: "userId",
            foreignField: "userId",
            as: "orders"
          }
        },
        {
          $project: {
            totalOrders: {$size: "$orders"},
            totalSpent: {$sum: "$orders.amount"}
          }
        }
      ],
      recentActivity: [
        {
          $lookup: {
            from: "activities",
            localField: "userId",
            foreignField: "userId",
            as: "activities"
          }
        },
        {$unwind: "$activities"},
        {$sort: {"activities.timestamp": -1}},
        {$limit: 10},
        {$project: {activity: "$activities.type", timestamp: "$activities.timestamp"}}
      ]
    }
  }
])

// Example 3: Product details page
db.products.aggregate([
  {$match: {productId: "PROD123"}},
  {
    $facet: {
      productInfo: [
        {$project: {name: 1, price: 1, description: 1}}
      ],
      reviews: [
        {
          $lookup: {
            from: "reviews",
            localField: "productId",
            foreignField: "productId",
            as: "reviews"
          }
        },
        {$unwind: "$reviews"},
        {$sort: {"reviews.rating": -1, "reviews.date": -1}},
        {$limit: 10}
      ],
      similarProducts: [
        {
          $lookup: {
            from: "products",
            let: {category: "$category", productId: "$productId"},
            pipeline: [
              {$match: {
                $expr: {
                  $and: [
                    {$eq: ["$category", "$$category"]},
                    {$ne: ["$productId", "$$productId"]}
                  ]
                }
              }},
              {$limit: 5}
            ],
            as: "similar"
          }
        },
        {$project: {similar: 1}}
      ],
      priceHistory: [
        {
          $lookup: {
            from: "price_changes",
            localField: "productId",
            foreignField: "productId",
            as: "priceHistory"
          }
        },
        {$unwind: "$priceHistory"},
        {$sort: {"priceHistory.date": -1}},
        {$limit: 30}
      ]
    }
  }
])

// ========== NESTED $facet ==========

// $facet can be nested (facet within facet)
db.products.aggregate([
  {
    $facet: {
      categoryAnalysis: [
        {
          $group: {
            _id: "$category",
            count: {$sum: 1},
            avgPrice: {$avg: "$price"}
          }
        },
        {
          $facet: {
            topCategories: [
              {$sort: {count: -1}},
              {$limit: 5}
            ],
            expensiveCategories: [
              {$sort: {avgPrice: -1}},
              {$limit: 5}
            ]
          }
        }
      ]
    }
  }
])

// ========== $facet WITH OTHER STAGES ==========

// $facet can be combined with other stages
db.orders.aggregate([
  {$match: {status: "completed"}},  // Filter before facet
  {
    $facet: {
      summary: [
        {$group: {_id: null, total: {$sum: "$amount"}}}
      ],
      details: [
        {$project: {orderId: 1, amount: 1, date: 1}}
      ]
    }
  },
  {$unwind: "$summary"},  // Unwind after facet
  {
    $project: {
      total: "$summary.total",
      orderCount: {$size: "$details"}
    }
  }
])

// ========== EDGE CASES ==========

// Edge case 1: Empty input
// All pipelines return empty arrays
db.emptyCollection.aggregate([
  {
    $facet: {
      pipeline1: [{$group: {_id: "$field"}}],
      pipeline2: [{$sort: {field: 1}}]
    }
  }
])
// Output: {pipeline1: [], pipeline2: []}

// Edge case 2: Pipeline with no output
db.products.aggregate([
  {
    $facet: {
      valid: [
        {$match: {price: {$gt: 1000}}}  // No products match
      ],
      invalid: [
        {$match: {price: {$lt: 0}}}     // No products match
      ]
    }
  }
])
// Output: {valid: [], invalid: []}

// Edge case 3: Different pipeline lengths
// Each pipeline can produce different number of results
db.products.aggregate([
  {
    $facet: {
      allCategories: [
        {$group: {_id: "$category"}}  // May return 10 categories
      ],
      topThree: [
        {$sort: {sales: -1}},
        {$limit: 3}  // Always returns 3 products
      ]
    }
  }
])
// Output: {allCategories: [10 items], topThree: [3 items]}

// ========== PERFORMANCE CONSIDERATIONS ==========

// $facet processes same documents multiple times
// Each pipeline runs independently on same input

// Example:
{
  $facet: {
    pipeline1: [...],  // Processes all 1M documents
    pipeline2: [...],  // Processes all 1M documents again
    pipeline3: [...]   // Processes all 1M documents again
  }
}
// Total processing: 3M document operations

// Optimization:
// 1. Use $match early to filter documents
db.products.aggregate([
  {$match: {category: "Electronics"}},  // Filter first
  {
    $facet: {
      // Pipelines only process filtered documents
    }
  }
])

// 2. Use $project to reduce document size
db.products.aggregate([
  {$project: {category: 1, price: 1, sales: 1}},  // Only needed fields
  {
    $facet: {
      // Pipelines process smaller documents
    }
  }
])

// ========== REAL-WORLD USE CASES ==========

// Use case 1: Dashboard with multiple metrics
db.sales.aggregate([
  {
    $facet: {
      totalRevenue: [
        {$group: {_id: null, total: {$sum: "$amount"}}}
      ],
      salesByRegion: [
        {$group: {_id: "$region", total: {$sum: "$amount"}}},
        {$sort: {total: -1}}
      ],
      topProducts: [
        {$group: {_id: "$productId", sales: {$sum: "$quantity"}}},
        {$sort: {sales: -1}},
        {$limit: 10}
      ],
      recentSales: [
        {$sort: {date: -1}},
        {$limit: 20}
      ]
    }
  }
])

// Use case 2: Product listing page
db.products.aggregate([
  {
    $facet: {
      products: [
        {$match: {status: "active"}},
        {$sort: {createdAt: -1}},
        {$limit: 20}
      ],
      filters: [
        {
          $group: {
            _id: null,
            categories: {$addToSet: "$category"},
            priceRange: {
              min: {$min: "$price"},
              max: {$max: "$price"}
            }
          }
        }
      ],
      pagination: [
        {$match: {status: "active"}},
        {$count: "total"}
      ]
    }
  }
])

// Use case 3: Analytics report
db.events.aggregate([
  {
    $facet: {
      eventCounts: [
        {$group: {_id: "$eventType", count: {$sum: 1}}},
        {$sort: {count: -1}}
      ],
      dailyStats: [
        {
          $group: {
            _id: {$dateToString: {format: "%Y-%m-%d", date: "$timestamp"}},
            count: {$sum: 1}
          }
        },
        {$sort: {_id: 1}}
      ],
      userStats: [
        {
          $group: {
            _id: "$userId",
            eventCount: {$sum: 1},
            lastEvent: {$max: "$timestamp"}
          }
        },
        {$sort: {eventCount: -1}},
        {$limit: 100}
      ],
      hourlyDistribution: [
        {
          $group: {
            _id: {$hour: "$timestamp"},
            count: {$sum: 1}
          }
        },
        {$sort: {_id: 1}}
      ]
    }
  }
])
```

**Summary:**

| Concept | Description | Use Case |
|---------|-------------|----------|
| **`$facet`** | Run multiple pipelines on same input | Multiple analytics in one query |
| **Multiple Pipelines** | Independent aggregation pipelines | Different metrics from same data |
| **Combined Output** | All results in single document | Dashboard, reports, analytics |

**Key Benefits:**
- ✅ Single database query
- ✅ All results together (atomic snapshot)
- ✅ Faster than multiple queries
- ✅ Perfect for dashboards and reports
- ✅ Each pipeline processes same input independently

**Performance Tips:**
- Use `$match` before `$facet` to filter early
- Use `$project` to reduce document size
- Each pipeline processes full input (be mindful of large collections)

// $bucket - Group by ranges
db.users.aggregate([
  {
    $bucket: {
      groupBy: "$age",
      boundaries: [0, 18, 30, 50, 100],
      default: "Other",
      output: {
        count: {$sum: 1},
        users: {$push: "$name"}
      }
    }
  }
])

// $bucketAuto - Auto-calculate buckets
db.products.aggregate([
  {
    $bucketAuto: {
      groupBy: "$price",
      buckets: 5,
      output: {
        count: {$sum: 1},
        avgPrice: {$avg: "$price"}
      }
    }
  }
])
```

**Detailed Explanation of `$bucketAuto`:**

```javascript
// ========== WHAT IS $bucketAuto? ==========
// $bucketAuto automatically divides documents into specified number of buckets
// Unlike $bucket, you don't need to specify boundaries manually
// MongoDB automatically calculates optimal boundaries for equal distribution

// Key Concepts:
// - Automatic boundaries: MongoDB calculates bucket ranges
// - Equal distribution: Tries to distribute documents evenly
// - Specified bucket count: You specify how many buckets you want
// - Numeric grouping: Works with numeric fields (price, age, score, etc.)

// ========== BREAKDOWN OF YOUR CODE ==========

{
  $bucketAuto: {
    groupBy: "$price",     // Field to group by (must be numeric)
    buckets: 5,            // Number of buckets to create
    output: {              // Output fields for each bucket
      count: {$sum: 1},    // Count documents in each bucket
      avgPrice: {$avg: "$price"}  // Average price in each bucket
    }
  }
}

// How it works:
// 1. Finds min and max values of $price
// 2. Divides range into 5 equal buckets
// 3. Groups documents into buckets
// 4. Calculates output fields for each bucket

// Example Input:
[
  {_id: 1, name: "Laptop", price: 1200},
  {_id: 2, name: "Phone", price: 800},
  {_id: 3, name: "Tablet", price: 600},
  {_id: 4, name: "Mouse", price: 20},
  {_id: 5, name: "Keyboard", price: 50},
  {_id: 6, name: "Monitor", price: 300},
  {_id: 7, name: "Speaker", price: 150},
  {_id: 8, name: "Headphones", price: 100}
]

// MongoDB calculates:
// Min price: 20, Max price: 1200
// Bucket ranges: [20-256), [256-492), [492-728), [728-964), [964-1200]

// Output:
[
  {
    _id: {min: 20, max: 256},
    count: 4,
    avgPrice: 80
  },
  {
    _id: {min: 256, max: 492},
    count: 1,
    avgPrice: 300
  },
  {
    _id: {min: 492, max: 728},
    count: 1,
    avgPrice: 600
  },
  {
    _id: {min: 728, max: 964},
    count: 1,
    avgPrice: 800
  },
  {
    _id: {min: 964, max: 1200},
    count: 1,
    avgPrice: 1200
  }
]

// ========== $bucketAuto vs $bucket ==========

// $bucket (Manual boundaries):
db.users.aggregate([
  {
    $bucket: {
      groupBy: "$age",
      boundaries: [0, 18, 30, 50, 100],  // You specify boundaries
      default: "Other"
    }
  }
])
// Pros: Full control over ranges
// Cons: Must know data distribution

// $bucketAuto (Automatic boundaries):
db.users.aggregate([
  {
    $bucketAuto: {
      groupBy: "$age",
      buckets: 5  // MongoDB calculates boundaries
    }
  }
])
// Pros: No need to know data distribution
// Cons: Less control over exact ranges

// ========== COMPLETE EXAMPLES ==========

// Example 1: Price ranges for products
db.products.aggregate([
  {
    $bucketAuto: {
      groupBy: "$price",
      buckets: 5,
      output: {
        count: {$sum: 1},
        minPrice: {$min: "$price"},
        maxPrice: {$max: "$price"},
        avgPrice: {$avg: "$price"},
        products: {$push: "$name"}
      }
    }
  }
])

// Example 2: Score distribution
db.examResults.aggregate([
  {
    $bucketAuto: {
      groupBy: "$score",
      buckets: 4,  // A, B, C, D grades
      output: {
        count: {$sum: 1},
        avgScore: {$avg: "$score"},
        students: {$push: "$studentName"}
      }
    }
  }
])

// Example 3: Sales amount distribution
db.orders.aggregate([
  {$match: {status: "completed"}},
  {
    $bucketAuto: {
      groupBy: "$totalAmount",
      buckets: 10,
      output: {
        count: {$sum: 1},
        totalRevenue: {$sum: "$totalAmount"},
        avgOrderValue: {$avg: "$totalAmount"}
      }
    }
  },
  {$sort: {"_id.min": 1}}
])

// ========== ADVANCED OPTIONS ==========

// granularity: Control bucket boundaries
db.products.aggregate([
  {
    $bucketAuto: {
      groupBy: "$price",
      buckets: 5,
      granularity: "R5",  // Round boundaries to R5 series (1, 1.6, 2.5, 4, 6.3, 10)
      output: {
        count: {$sum: 1}
      }
    }
  }
])

// Granularity options:
// - "R5": 1, 1.6, 2.5, 4, 6.3, 10, 16, 25, 40, 63, 100...
// - "R10": 1, 1.25, 1.6, 2, 2.5, 3.15, 4, 5, 6.3, 8, 10...
// - "R20": More fine-grained
// - "R40": Even more fine-grained
// - "R80": Most fine-grained
// - "E6": 1, 1.5, 2.2, 3.3, 4.7, 6.8, 10...
// - "E12": 1, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2, 10...
// - "E24": Most fine-grained E series
// - "1-2-5": 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000...
// - "POWERSOF2": 1, 2, 4, 8, 16, 32, 64, 128, 256...

// Example with granularity:
db.sales.aggregate([
  {
    $bucketAuto: {
      groupBy: "$amount",
      buckets: 5,
      granularity: "1-2-5",  // Nice round numbers
      output: {
        count: {$sum: 1},
        total: {$sum: "$amount"}
      }
    }
  }
])

// ========== EDGE CASES ==========

// Edge case 1: Empty collection
db.emptyCollection.aggregate([
  {
    $bucketAuto: {
      groupBy: "$value",
      buckets: 5
    }
  }
])
// Output: []

// Edge case 2: All values are same
db.sameValues.aggregate([
  {
    $bucketAuto: {
      groupBy: "$value",
      buckets: 5,
      output: {count: {$sum: 1}}
    }
  }
])
// Output: [{_id: {min: 100, max: 100}, count: 10}]
// Only one bucket with same min and max

// Edge case 3: Null values
db.products.aggregate([
  {
    $bucketAuto: {
      groupBy: "$price",  // Some documents have null price
      buckets: 5
    }
  }
])
// Documents with null/undefined are excluded from bucketing

// Edge case 4: Non-numeric values
db.products.aggregate([
  {
    $bucketAuto: {
      groupBy: "$price",  // Some have string prices
      buckets: 5
    }
  }
])
// Only numeric values are bucketed, others excluded

// ========== REAL-WORLD USE CASES ==========

// Use case 1: Customer lifetime value segmentation
db.customers.aggregate([
  {
    $lookup: {
      from: "orders",
      localField: "_id",
      foreignField: "customerId",
      as: "orders"
    }
  },
  {
    $project: {
      name: 1,
      lifetimeValue: {$sum: "$orders.total"}
    }
  },
  {
    $bucketAuto: {
      groupBy: "$lifetimeValue",
      buckets: 4,
      output: {
        count: {$sum: 1},
        avgLTV: {$avg: "$lifetimeValue"},
        segment: {
          $cond: {
            if: {$lte: ["$_id.min", 100]},
            then: "Low Value",
            else: {
              $cond: {
                if: {$lte: ["$_id.min", 500]},
                then: "Medium Value",
                else: {
                  $cond: {
                    if: {$lte: ["$_id.min", 1000]},
                    then: "High Value",
                    else: "VIP"
                  }
                }
              }
            }
          }
        }
      }
    }
  }
])

// Use case 2: Product price distribution analysis
db.products.aggregate([
  {
    $bucketAuto: {
      groupBy: "$price",
      buckets: 10,
      granularity: "1-2-5",
      output: {
        count: {$sum: 1},
        revenue: {$sum: {$multiply: ["$price", "$stock"]}},
        avgPrice: {$avg: "$price"},
        priceRange: {
          $concat: [
            {$toString: "$_id.min"},
            " - ",
            {$toString: "$_id.max"}
          ]
        }
      }
    }
  },
  {$sort: {"_id.min": 1}}
])

// Use case 3: Performance score distribution
db.employees.aggregate([
  {
    $bucketAuto: {
      groupBy: "$performanceScore",
      buckets: 5,
      output: {
        count: {$sum: 1},
        avgScore: {$avg: "$performanceScore"},
        employees: {$push: "$name"},
        department: {$addToSet: "$department"}
      }
    }
  }
])

// $graphLookup - Recursive lookup
db.employees.aggregate([
  {
    $graphLookup: {
      from: "employees",
      startWith: "$reportsTo",
      connectFromField: "reportsTo",
      connectToField: "_id",
      as: "managementChain",
      maxDepth: 3
    }
  }
])
```

**Detailed Explanation of `$graphLookup`:**

```javascript
// ========== WHAT IS $graphLookup? ==========
// $graphLookup performs recursive lookup to traverse relationships
// Unlike $lookup (which does one-level join), $graphLookup traverses multi-level relationships
// Perfect for hierarchical data: organization charts, categories, tree structures, comment threads

// Key Concepts:
// - Recursive traversal: Follows relationships through multiple levels
// - Tree/hierarchical data: Perfect for parent-child relationships
// - Graph traversal: Can traverse complex relationship graphs
// - Depth control: Limit how deep to traverse with maxDepth

// ========== BREAKDOWN OF YOUR CODE ==========

{
  $graphLookup: {
    from: "employees",           // Collection to lookup from
    startWith: "$reportsTo",     // Starting point (manager ID)
    connectFromField: "reportsTo", // Field in current document (employee's manager)
    connectToField: "_id",       // Field in foreign collection (manager's _id)
    as: "managementChain",       // Output array field name
    maxDepth: 3                  // Maximum levels to traverse
  }
}

// How it works:
// 1. Starts with employee's reportsTo field
// 2. Finds manager document (_id matches reportsTo)
// 3. Looks at manager's reportsTo field
// 4. Finds manager's manager
// 5. Repeats until maxDepth or no more connections
// 6. Returns all found documents in array

// Example Input (employees collection):
[
  {_id: 1, name: "CEO", reportsTo: null},
  {_id: 2, name: "VP Engineering", reportsTo: 1},
  {_id: 3, name: "VP Sales", reportsTo: 1},
  {_id: 4, name: "Engineering Manager", reportsTo: 2},
  {_id: 5, name: "Senior Engineer", reportsTo: 4},
  {_id: 6, name: "Junior Engineer", reportsTo: 4}
]

// For employee with _id: 5 (Senior Engineer):
// 1. Start with reportsTo: 4 (Engineering Manager)
// 2. Find employee _id: 4, reportsTo: 2 (VP Engineering)
// 3. Find employee _id: 2, reportsTo: 1 (CEO)
// 4. Find employee _id: 1, reportsTo: null (stop)

// Output:
{
  _id: 5,
  name: "Senior Engineer",
  reportsTo: 4,
  managementChain: [
    {_id: 4, name: "Engineering Manager", reportsTo: 2},
    {_id: 2, name: "VP Engineering", reportsTo: 1},
    {_id: 1, name: "CEO", reportsTo: null}
  ]
}

// ========== $graphLookup vs $lookup ==========

// $lookup (Single level):
db.orders.aggregate([
  {
    $lookup: {
      from: "products",
      localField: "productId",
      foreignField: "_id",
      as: "product"
    }
  }
])
// Finds one related document per order

// $graphLookup (Multi-level):
db.employees.aggregate([
  {
    $graphLookup: {
      from: "employees",
      startWith: "$reportsTo",
      connectFromField: "reportsTo",
      connectToField: "_id",
      as: "managementChain"
    }
  }
])
// Finds all managers up the chain (recursive)

// ========== COMPLETE EXAMPLES ==========

// Example 1: Organization hierarchy
db.employees.aggregate([
  {
    $graphLookup: {
      from: "employees",
      startWith: "$reportsTo",
      connectFromField: "reportsTo",
      connectToField: "_id",
      as: "allManagers",
      maxDepth: 5,
      depthField: "level"  // Add depth level to each result
    }
  }
])

// Example 2: Category hierarchy
db.categories.aggregate([
  {
    $graphLookup: {
      from: "categories",
      startWith: "$parentCategoryId",
      connectFromField: "parentCategoryId",
      connectToField: "_id",
      as: "parentCategories"
    }
  }
])

// Example 3: Comment thread (nested comments)
db.comments.aggregate([
  {
    $graphLookup: {
      from: "comments",
      startWith: "$parentCommentId",
      connectFromField: "parentCommentId",
      connectToField: "_id",
      as: "replyThread"
    }
  }
])

// ========== ADVANCED OPTIONS ==========

// restrictSearchWithMatch: Filter documents during traversal
db.employees.aggregate([
  {
    $graphLookup: {
      from: "employees",
      startWith: "$reportsTo",
      connectFromField: "reportsTo",
      connectToField: "_id",
      as: "managementChain",
      restrictSearchWithMatch: {
        department: "Engineering"  // Only traverse Engineering department
      }
    }
  }
])

// depthField: Add depth level to each result
db.employees.aggregate([
  {
    $graphLookup: {
      from: "employees",
      startWith: "$reportsTo",
      connectFromField: "reportsTo",
      connectToField: "_id",
      as: "managementChain",
      depthField: "level"  // Each item has "level" field (0, 1, 2...)
    }
  }
])

// Example with depthField:
{
  _id: 5,
  managementChain: [
    {_id: 4, name: "Manager", level: 0},      // Direct manager
    {_id: 2, name: "VP", level: 1},           // Manager's manager
    {_id: 1, name: "CEO", level: 2}           // Top level
  ]
}

// ========== REAL-WORLD USE CASES ==========

// Use case 1: Product category hierarchy
db.products.aggregate([
  {
    $graphLookup: {
      from: "categories",
      startWith: "$categoryId",
      connectFromField: "parentId",
      connectToField: "_id",
      as: "categoryPath"
    }
  },
  {
    $project: {
      name: 1,
      categoryPath: {
        $map: {
          input: "$categoryPath",
          as: "cat",
          in: "$$cat.name"
        }
      }
    }
  }
])

// Use case 2: Find all subordinates (reverse hierarchy)
db.employees.aggregate([
  {$match: {_id: 1}},  // CEO
  {
    $graphLookup: {
      from: "employees",
      startWith: "$_id",
      connectFromField: "_id",
      connectToField: "reportsTo",
      as: "allSubordinates"
    }
  }
])
// This finds all employees who report to CEO (directly or indirectly)

// Use case 3: Social network friends (multi-level)
db.users.aggregate([
  {
    $graphLookup: {
      from: "friendships",
      startWith: "$userId",
      connectFromField: "friendId",
      connectToField: "userId",
      as: "friendsOfFriends",
      maxDepth: 2  // Friends and friends of friends
    }
  }
])

// Use case 4: File/folder hierarchy
db.files.aggregate([
  {
    $graphLookup: {
      from: "files",
      startWith: "$parentFolderId",
      connectFromField: "parentFolderId",
      connectToField: "_id",
      as: "folderPath"
    }
  },
  {
    $project: {
      fileName: 1,
      fullPath: {
        $concat: [
          {$reduce: {
            input: "$folderPath",
            initialValue: "",
            in: {$concat: ["$$value", "$$this.name", "/"]}
          }},
          "$fileName"
        ]
      }
    }
  }
])

// $lookup with pipeline
db.orders.aggregate([
  {
    $lookup: {
      from: "products",
      let: {order_items: "$items"},
      pipeline: [
        {
          $match: {
            $expr: {
              $in: ["$_id", "$order_items.productId"]
            }
          }
        },
        {
          $project: {name: 1, price: 1}
        }
      ],
      as: "productDetails"
    }
  }
])
```

**Detailed Explanation of `$lookup` with Pipeline:**

```javascript
// ========== WHAT IS $lookup WITH PIPELINE? ==========
// $lookup with pipeline allows complex joins with custom filtering and transformation
// Unlike basic $lookup (simple equality match), pipeline gives full control over join logic
// Can perform: complex filters, multiple conditions, aggregations, transformations

// Key Concepts:
// - Pipeline-based join: Full aggregation pipeline for join logic
// - Complex conditions: Not limited to simple equality
// - Variables: Use "let" to pass variables into pipeline
// - Full control: Filter, project, transform joined data

// ========== BREAKDOWN OF YOUR CODE ==========

{
  $lookup: {
    from: "products",          // Collection to join with
    let: {order_items: "$items"}, // Variables available in pipeline
    pipeline: [                // Aggregation pipeline for join logic
      {
        $match: {
          $expr: {
            $in: ["$_id", "$order_items.productId"]  // Match if _id in array
          }
        }
      },
      {
        $project: {name: 1, price: 1}  // Only include name and price
      }
    ],
    as: "productDetails"       // Output field name
  }
}

// How it works:
// 1. Gets order document with items array
// 2. Creates variable order_items from $items
// 3. Runs pipeline on products collection
// 4. Matches products where _id is in order_items.productId array
// 5. Projects only name and price fields
// 6. Returns matched products as array

// Example Input:
// orders collection:
{_id: 1, items: [{productId: 10, quantity: 2}, {productId: 20, quantity: 1}]}

// products collection:
[
  {_id: 10, name: "Laptop", price: 1200, category: "Electronics"},
  {_id: 20, name: "Mouse", price: 20, category: "Accessories"},
  {_id: 30, name: "Keyboard", price: 50, category: "Accessories"}
]

// Output:
{
  _id: 1,
  items: [{productId: 10, quantity: 2}, {productId: 20, quantity: 1}],
  productDetails: [
    {_id: 10, name: "Laptop", price: 1200},    // Matched
    {_id: 20, name: "Mouse", price: 20}        // Matched
  ]
}

// ========== BASIC $lookup vs PIPELINE $lookup ==========

// Basic $lookup (simple equality):
db.orders.aggregate([
  {
    $lookup: {
      from: "products",
      localField: "productId",
      foreignField: "_id",
      as: "product"
    }
  }
])
// Simple one-to-one or one-to-many join

// Pipeline $lookup (complex conditions):
db.orders.aggregate([
  {
    $lookup: {
      from: "products",
      let: {order_items: "$items"},
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                {$in: ["$_id", "$$order_items.productId"]},
                {$eq: ["$status", "active"]},
                {$gte: ["$price", 100]}
              ]
            }
          }
        }
      ],
      as: "productDetails"
    }
  }
])
// Complex filtering, multiple conditions, aggregations

// ========== ADVANCED EXAMPLES ==========

// Example 1: Join with multiple conditions
db.orders.aggregate([
  {
    $lookup: {
      from: "products",
      let: {
        orderDate: "$orderDate",
        items: "$items"
      },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                {$in: ["$_id", "$$items.productId"]},
                {$gte: ["$$orderDate", "$availableFrom"]},
                {$lte: ["$$orderDate", "$availableTo"]}
              ]
            }
          }
        },
        {
          $project: {
            name: 1,
            price: 1,
            category: 1
          }
        }
      ],
      as: "availableProducts"
    }
  }
])

// Example 2: Join with aggregation
db.orders.aggregate([
  {
    $lookup: {
      from: "orderItems",
      let: {orderId: "$_id"},
      pipeline: [
        {
          $match: {
            $expr: {$eq: ["$orderId", "$$orderId"]}
          }
        },
        {
          $group: {
            _id: null,
            totalQuantity: {$sum: "$quantity"},
            totalAmount: {$sum: "$amount"}
          }
        }
      ],
      as: "orderSummary"
    }
  },
  {
    $unwind: "$orderSummary"
  }
])

// Example 3: Join with sorting and limiting
db.orders.aggregate([
  {
    $lookup: {
      from: "products",
      let: {items: "$items"},
      pipeline: [
        {
          $match: {
            $expr: {$in: ["$_id", "$$items.productId"]}
          }
        },
        {$sort: {price: -1}},  // Sort joined results
        {$limit: 5}            // Limit joined results
      ],
      as: "topProducts"
    }
  }
])

// Example 4: Join with computed fields
db.orders.aggregate([
  {
    $lookup: {
      from: "products",
      let: {items: "$items"},
      pipeline: [
        {
          $match: {
            $expr: {$in: ["$_id", "$$items.productId"]}
          }
        },
        {
          $project: {
            name: 1,
            price: 1,
            discountedPrice: {
              $multiply: ["$price", 0.9]  // 10% discount
            }
          }
        }
      ],
      as: "productDetails"
    }
  }
])

// ========== REAL-WORLD USE CASES ==========

// Use case 1: E-commerce order with product details
db.orders.aggregate([
  {
    $lookup: {
      from: "products",
      let: {orderItems: "$items"},
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                {$in: ["$_id", "$$orderItems.productId"]},
                {$eq: ["$status", "active"]}
              ]
            }
          }
        },
        {
          $lookup: {
            from: "categories",
            localField: "categoryId",
            foreignField: "_id",
            as: "category"
          }
        },
        {$unwind: "$category"},
        {
          $project: {
            name: 1,
            price: 1,
            categoryName: "$category.name"
          }
        }
      ],
      as: "productDetails"
    }
  }
])

// Use case 2: User with recent orders
db.users.aggregate([
  {
    $lookup: {
      from: "orders",
      let: {userId: "$_id"},
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                {$eq: ["$customerId", "$$userId"]},
                {$gte: ["$orderDate", new Date(Date.now() - 30*24*60*60*1000)]}
              ]
            }
          }
        },
        {$sort: {orderDate: -1}},
        {$limit: 10}
      ],
      as: "recentOrders"
    }
  }
])

// Use case 3: Product with inventory and pricing
db.products.aggregate([
  {
    $lookup: {
      from: "inventory",
      let: {productId: "$_id"},
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                {$eq: ["$productId", "$$productId"]},
                {$gt: ["$quantity", 0]}
              ]
            }
          }
        },
        {
          $group: {
            _id: "$warehouseId",
            totalQuantity: {$sum: "$quantity"}
          }
        }
      ],
      as: "inventory"
    }
  },
  {
    $lookup: {
      from: "pricing",
      let: {productId: "$_id"},
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                {$eq: ["$productId", "$$productId"]},
                {$gte: [new Date(), "$validFrom"]},
                {$lte: [new Date(), "$validTo"]}
              ]
            }
          }
        },
        {$sort: {priority: -1}},
        {$limit: 1}
      ],
      as: "currentPrice"
    }
  }
])

// $merge - Output to collection
db.dailySales.aggregate([
  {
    $group: {
      _id: {$dateToString: {format: "%Y-%m", date: "$date"}},
      totalSales: {$sum: "$amount"}
    }
  },
  {
    $merge: {
      into: "monthlySales",
      whenMatched: "replace",
      whenNotMatched: "insert"
    }
  }
])
```

**Detailed Explanation of `$merge`:**

```javascript
// ========== WHAT IS $merge? ==========
// $merge writes aggregation results to a collection
// Unlike $out (which replaces), $merge can update existing documents or insert new ones
// Perfect for: Incremental updates, data warehousing, materialized views, ETL processes

// Key Concepts:
// - Write to collection: Output aggregation results to target collection
// - Merge strategy: Update existing or insert new documents
// - Incremental updates: Can update specific documents without replacing entire collection
// - Non-destructive: Doesn't drop target collection like $out

// ========== BREAKDOWN OF YOUR CODE ==========

{
  $merge: {
    into: "monthlySales",       // Target collection
    whenMatched: "replace",     // Action when document exists (by _id)
    whenNotMatched: "insert"    // Action when document doesn't exist
  }
}

// How it works:
// 1. Aggregation produces documents (e.g., monthly totals)
// 2. For each document, check if _id exists in target collection
// 3. If exists (matched): Replace entire document
// 4. If not exists: Insert new document
// 5. Continues until all documents processed

// Example:
// dailySales collection:
[
  {date: ISODate("2024-01-15"), amount: 100},
  {date: ISODate("2024-01-20"), amount: 200},
  {date: ISODate("2024-02-10"), amount: 150}
]

// Aggregation groups by month:
[
  {_id: "2024-01", totalSales: 300},
  {_id: "2024-02", totalSales: 150}
]

// $merge writes to monthlySales:
// - If "2024-01" exists: Replace with new totalSales
// - If "2024-02" doesn't exist: Insert new document

// ========== $merge vs $out ==========

// $out (Replace entire collection):
db.products.aggregate([
  {$match: {status: "active"}},
  {$out: "activeProducts"}
])
// Replaces entire collection, drops existing data

// $merge (Update or insert):
db.dailySales.aggregate([
  {$group: {_id: "$month", total: {$sum: "$amount"}}},
  {
    $merge: {
      into: "monthlySales",
      whenMatched: "replace",
      whenNotMatched: "insert"
    }
  }
])
// Updates existing documents, inserts new ones, keeps other documents

// ========== MERGE STRATEGIES ==========

// Strategy 1: Replace (your code)
{
  $merge: {
    into: "monthlySales",
    whenMatched: "replace",      // Replace entire document
    whenNotMatched: "insert"
  }
}

// Strategy 2: Merge (combine fields)
{
  $merge: {
    into: "monthlySales",
    whenMatched: "merge",        // Merge new fields with existing
    whenNotMatched: "insert"
  }
}
// Example:
// Existing: {_id: "2024-01", totalSales: 300, count: 10}
// New: {_id: "2024-01", totalSales: 350}
// Result: {_id: "2024-01", totalSales: 350, count: 10}

// Strategy 3: Keep existing
{
  $merge: {
    into: "monthlySales",
    whenMatched: "keepExisting",  // Don't update if exists
    whenNotMatched: "insert"
  }
}

// Strategy 4: Fail on duplicate
{
  $merge: {
    into: "monthlySales",
    whenMatched: "fail",          // Error if document exists
    whenNotMatched: "insert"
  }
}

// Strategy 5: Custom pipeline
{
  $merge: {
    into: "monthlySales",
    whenMatched: [
      {
        $set: {
          totalSales: {$add: ["$totalSales", "$$new.totalSales"]},
          updatedAt: "$$NOW"
        }
      }
    ],
    whenNotMatched: "insert"
  }
}

// ========== COMPLETE EXAMPLES ==========

// Example 1: Incremental aggregation (materialized view)
db.orders.aggregate([
  {
    $match: {
      orderDate: {
        $gte: new Date("2024-01-01"),
        $lt: new Date("2024-02-01")
      }
    }
  },
  {
    $group: {
      _id: "$customerId",
      totalOrders: {$sum: 1},
      totalAmount: {$sum: "$amount"},
      lastOrderDate: {$max: "$orderDate"}
    }
  },
  {
    $merge: {
      into: "customerStats",
      whenMatched: "replace",
      whenNotMatched: "insert"
    }
  }
])
// Updates customer stats without replacing entire collection

// Example 2: Merge with custom logic
db.dailySales.aggregate([
  {
    $group: {
      _id: {$dateToString: {format: "%Y-%m", date: "$date"}},
      totalSales: {$sum: "$amount"},
      count: {$sum: 1}
    }
  },
  {
    $merge: {
      into: "monthlySales",
      whenMatched: [
        {
          $set: {
            totalSales: {$add: ["$totalSales", "$$new.totalSales"]},
            count: {$add: ["$count", "$$new.count"]},
            updatedAt: "$$NOW"
          }
        }
      ],
      whenNotMatched: "insert"
    }
  }
])
// Accumulates values instead of replacing

// Example 3: Multi-database merge
db.sales.aggregate([
  {$group: {_id: "$region", total: {$sum: "$amount"}}},
  {
    $merge: {
      into: {
        db: "analytics",        // Different database
        coll: "regionStats"
      },
      whenMatched: "replace",
      whenNotMatched: "insert"
    }
  }
])

// ========== ADVANCED OPTIONS ==========

// on: Custom matching field (not just _id)
{
  $merge: {
    into: "userStats",
    on: "userId",              // Match on userId instead of _id
    whenMatched: "replace",
    whenNotMatched: "insert"
  }
}

// Multiple fields for matching:
{
  $merge: {
    into: "salesByRegionAndMonth",
    on: ["region", "month"],   // Match on multiple fields
    whenMatched: "replace",
    whenNotMatched: "insert"
  }
}

// let: Variables for custom pipeline
{
  $merge: {
    into: "customerStats",
    let: {currentDate: new Date()},
    whenMatched: [
      {
        $set: {
          totalOrders: {$add: ["$totalOrders", "$$new.totalOrders"]},
          lastUpdated: "$$currentDate"
        }
      }
    ],
    whenNotMatched: "insert"
  }
}

// ========== REAL-WORLD USE CASES ==========

// Use case 1: Real-time analytics dashboard
db.events.aggregate([
  {
    $match: {
      timestamp: {$gte: new Date(Date.now() - 60*60*1000)} // Last hour
    }
  },
  {
    $group: {
      _id: "$eventType",
      count: {$sum: 1},
      uniqueUsers: {$addToSet: "$userId"}
    }
  },
  {
    $project: {
      _id: 1,
      count: 1,
      uniqueUsersCount: {$size: "$uniqueUsers"}
    }
  },
  {
    $merge: {
      into: "hourlyStats",
      whenMatched: "replace",
      whenNotMatched: "insert"
    }
  }
])
// Updates hourly statistics incrementally

// Use case 2: Data warehouse ETL
db.transactions.aggregate([
  {
    $facet: {
      daily: [
        {
          $group: {
            _id: {$dateToString: {format: "%Y-%m-%d", date: "$date"}},
            total: {$sum: "$amount"}
          }
        }
      ],
      monthly: [
        {
          $group: {
            _id: {$dateToString: {format: "%Y-%m", date: "$date"}},
            total: {$sum: "$amount"}
          }
        }
      ]
    }
  },
  {$unwind: "$daily"},
  {
    $merge: {
      into: "warehouse.dailyTotals",
      whenMatched: "replace",
      whenNotMatched: "insert"
    }
  }
])

// Use case 3: Product catalog update
db.products.aggregate([
  {
    $lookup: {
      from: "inventory",
      localField: "_id",
      foreignField: "productId",
      as: "inventory"
    }
  },
  {
    $project: {
      name: 1,
      price: 1,
      inStock: {
        $gt: [{$sum: "$inventory.quantity"}, 0]
      },
      totalStock: {$sum: "$inventory.quantity"}
    }
  },
  {
    $merge: {
      into: "productCatalog",
      on: "_id",
      whenMatched: "merge",
      whenNotMatched: "insert"
    }
  }
])
// Updates product catalog with inventory status

// ========== PERFORMANCE TIPS ==========

// 1. Index the matching field
db.monthlySales.createIndex({_id: 1})  // Index for matching

// 2. Use projection to reduce data
db.orders.aggregate([
  {$match: {status: "completed"}},
  {$project: {customerId: 1, amount: 1}},  // Only needed fields
  {$group: {...}},
  {$merge: {...}}
])

// 3. Batch processing for large datasets
// Process data in chunks and merge incrementally

// ========== ERROR HANDLING ==========

// $merge can fail if:
// - Target collection doesn't exist (created automatically)
// - whenMatched: "fail" and document exists
// - Database/collection access permissions

// Best practice: Wrap in try-catch
try {
  await db.sales.aggregate([
    {$group: {...}},
    {$merge: {...}}
  ]).toArray()
} catch (error) {
  console.error("Merge failed:", error)
}
```

**Detailed Explanation of `$out`:**

```javascript
// ========== WHAT IS $out? ==========
// $out writes aggregation results to a new collection
// Replaces entire target collection with aggregation results
// Perfect for: One-time transformations, data exports, collection snapshots

// Key Concepts:
// - Replace collection: Drops target collection and creates new one
// - Atomic operation: All or nothing (entire collection replaced)
// - No incremental updates: Can't update individual documents
// - Final stage: Must be last stage in pipeline

// ========== BREAKDOWN OF YOUR CODE ==========

db.products.aggregate([
  {$match: {status: "active"}},  // Filter active products
  {$out: "activeProducts"}       // Write to new collection
])

// How it works:
// 1. Aggregation processes documents
// 2. Filters products with status: "active"
// 3. Drops "activeProducts" collection if exists
// 4. Creates new "activeProducts" collection
// 5. Writes all results to new collection

// Example:
// products collection:
[
  {_id: 1, name: "Laptop", status: "active"},
  {_id: 2, name: "Phone", status: "inactive"},
  {_id: 3, name: "Tablet", status: "active"}
]

// After $out:
// activeProducts collection:
[
  {_id: 1, name: "Laptop", status: "active"},
  {_id: 3, name: "Tablet", status: "active"}
]

// ========== $out vs $merge ==========

// $out: Replace entire collection
db.products.aggregate([
  {$match: {status: "active"}},
  {$out: "activeProducts"}
])
// Drops and recreates collection

// $merge: Update or insert
db.products.aggregate([
  {$match: {status: "active"}},
  {$merge: {into: "activeProducts", whenMatched: "replace"}}
])
// Updates existing, inserts new, keeps others

// ========== COMPLETE EXAMPLES ==========

// Example 1: Create snapshot
db.orders.aggregate([
  {
    $group: {
      _id: "$customerId",
      totalOrders: {$sum: 1},
      totalAmount: {$sum: "$amount"}
    }
  },
  {$out: "customerSnapshot"}
])

// Example 2: Transform and export
db.products.aggregate([
  {$match: {category: "Electronics"}},
  {
    $project: {
      name: 1,
      price: 1,
      discountedPrice: {$multiply: ["$price", 0.9]}
    }
  },
  {$out: "electronicsCatalog"}
])

// Example 3: Different database
db.sales.aggregate([
  {$group: {_id: "$region", total: {$sum: "$amount"}}},
  {
    $out: {
      db: "analytics",
      coll: "regionTotals"
    }
  }
])

// ========== LIMITATIONS ==========

// 1. Must be last stage (can't have stages after $out)
// ❌ WRONG:
db.products.aggregate([
  {$out: "activeProducts"},
  {$sort: {name: 1}}  // Error!
])

// ✅ CORRECT:
db.products.aggregate([
  {$sort: {name: 1}},
  {$out: "activeProducts"}  // Last stage
])

// 2. Replaces entire collection (no incremental updates)
// 3. Can't use with sharded collections in all scenarios
// 4. Target collection must be in same database (unless specified)

// ========== USE CASES ==========

// ✅ Use $out for:
// - One-time data transformations
// - Creating collection snapshots
// - Data exports
// - Initializing materialized views
// - Simple replacements

// ❌ Don't use $out for:
// - Incremental updates (use $merge)
// - Real-time aggregations (use $merge)
// - Data that changes frequently (use $merge)
```

**Detailed Explanation of `$unionWith`:**

```javascript
// ========== WHAT IS $unionWith? ==========
// $unionWith combines documents from two collections
// Similar to SQL UNION: combines results from multiple sources
// Perfect for: Merging time-series data, combining related collections, querying across collections

// Key Concepts:
// - Combine collections: Merge documents from multiple collections
// - Union operation: Similar to SQL UNION (removes duplicates)
// - Pipeline support: Can filter/transform second collection before union
// - Sequential processing: Processes current collection, then second collection

// ========== BREAKDOWN OF YOUR CODE ==========

{
  $unionWith: {
    coll: "orders2023",        // Collection to union with
    pipeline: [                // Optional: Pipeline for second collection
      {$match: {status: "completed"}}
    ]
  }
}

// How it works:
// 1. Processes documents from orders2024
// 2. Applies unionWith stage
// 3. Runs pipeline on orders2023 (filter by status: "completed")
// 4. Combines results from both collections
// 5. Continues pipeline with combined results

// Example:
// orders2024 collection:
[
  {_id: 1, customerId: "A", amount: 100, status: "completed"},
  {_id: 2, customerId: "B", amount: 200, status: "pending"}
]

// orders2023 collection:
[
  {_id: 10, customerId: "A", amount: 150, status: "completed"},
  {_id: 11, customerId: "C", amount: 75, status: "completed"},
  {_id: 12, customerId: "B", amount: 300, status: "pending"}
]

// After $unionWith:
[
  {_id: 1, customerId: "A", amount: 100, status: "completed"},  // From 2024
  {_id: 2, customerId: "B", amount: 200, status: "pending"},    // From 2024
  {_id: 10, customerId: "A", amount: 150, status: "completed"}, // From 2023 (filtered)
  {_id: 11, customerId: "C", amount: 75, status: "completed"}   // From 2023 (filtered)
]
// Note: _id: 12 excluded (status: "pending" doesn't match filter)

// ========== $unionWith vs $lookup ==========

// $lookup (Join - keeps documents separate):
db.orders.aggregate([
  {
    $lookup: {
      from: "products",
      localField: "productId",
      foreignField: "_id",
      as: "product"
    }
  }
])
// Creates array of related documents

// $unionWith (Union - combines documents):
db.orders2024.aggregate([
  {
    $unionWith: {
      coll: "orders2023"
    }
  }
])
// Combines documents into single stream

// ========== COMPLETE EXAMPLES ==========

// Example 1: Combine yearly data
db.orders2024.aggregate([
  {$match: {status: "completed"}},
  {
    $unionWith: {
      coll: "orders2023",
      pipeline: [
        {$match: {status: "completed"}}
      ]
    }
  },
  {
    $group: {
      _id: "$customerId",
      totalOrders: {$sum: 1},
      totalAmount: {$sum: "$amount"}
    }
  }
])
// Combines 2023 and 2024 orders, then groups by customer

// Example 2: Merge multiple collections
db.currentInventory.aggregate([
  {
    $unionWith: {
      coll: "historicalInventory",
      pipeline: [
        {$match: {date: {$gte: new Date("2024-01-01")}}}
      ]
    }
  },
  {
    $unionWith: {
      coll: "warehouseInventory"
    }
  },
  {
    $group: {
      _id: "$productId",
      totalQuantity: {$sum: "$quantity"}
    }
  }
])
// Combines three collections, then aggregates

// Example 3: Time-series data
db.analytics2024.aggregate([
  {
    $unionWith: {
      coll: "analytics2023",
      pipeline: [
        {$match: {eventType: "purchase"}},
        {
          $project: {
            eventType: 1,
            timestamp: 1,
            userId: 1,
            amount: 1
          }
        }
      ]
    }
  },
  {$sort: {timestamp: -1}},
  {$limit: 1000}
])
// Combines analytics data, filters, projects, sorts

// Example 4: User activity across collections
db.loginEvents.aggregate([
  {
    $unionWith: {
      coll: "logoutEvents"
    }
  },
  {
    $unionWith: {
      coll: "pageViews"
    }
  },
  {
    $group: {
      _id: {
        userId: "$userId",
        date: {$dateToString: {format: "%Y-%m-%d", date: "$timestamp"}}
      },
      events: {$push: "$eventType"},
      count: {$sum: 1}
    }
  }
])
// Combines all event types, groups by user and date

// ========== ADVANCED OPTIONS ==========

// Pipeline for filtering/transforming second collection
db.orders2024.aggregate([
  {
    $unionWith: {
      coll: "orders2023",
      pipeline: [
        {$match: {status: "completed"}},        // Filter
        {$project: {customerId: 1, amount: 1}}, // Project
        {$limit: 1000}                          // Limit
      ]
    }
  }
])

// Multiple unionWith stages
db.collection1.aggregate([
  {$unionWith: {coll: "collection2"}},
  {$unionWith: {coll: "collection3"}},
  {$unionWith: {coll: "collection4"}}
])
// Combines all four collections

// ========== REAL-WORLD USE CASES ==========

// Use case 1: Cross-year analytics
db.orders2024.aggregate([
  {
    $unionWith: {
      coll: "orders2023",
      pipeline: [
        {$match: {status: "completed"}}
      ]
    }
  },
  {
    $unionWith: {
      coll: "orders2022",
      pipeline: [
        {$match: {status: "completed"}}
      ]
    }
  },
  {
    $group: {
      _id: {
        year: {$year: "$orderDate"},
        month: {$month: "$orderDate"}
      },
      totalRevenue: {$sum: "$amount"},
      orderCount: {$sum: 1}
    }
  },
  {$sort: {_id: 1}}
])
// Combines multiple years of orders, groups by month

// Use case 2: Multi-source inventory
db.mainWarehouse.aggregate([
  {
    $unionWith: {
      coll: "secondaryWarehouse",
      pipeline: [
        {$match: {status: "active"}}
      ]
    }
  },
  {
    $unionWith: {
      coll: "thirdPartyInventory"
    }
  },
  {
    $group: {
      _id: "$productId",
      totalQuantity: {$sum: "$quantity"},
      warehouses: {$addToSet: "$warehouseId"}
    }
  }
])
// Combines inventory from multiple sources

// Use case 3: Unified event log
db.userEvents.aggregate([
  {
    $unionWith: {
      coll: "systemEvents",
      pipeline: [
        {$match: {severity: {$in: ["high", "critical"]}}}
      ]
    }
  },
  {
    $unionWith: {
      coll: "adminEvents"
    }
  },
  {$sort: {timestamp: -1}},
  {$limit: 1000}
])
// Combines all event types, sorted by timestamp

// ========== PERFORMANCE TIPS ==========

// 1. Filter early in pipeline
db.orders2024.aggregate([
  {$match: {status: "completed"}},  // Filter before union
  {
    $unionWith: {
      coll: "orders2023",
      pipeline: [
        {$match: {status: "completed"}}  // Filter in union
      ]
    }
  }
])

// 2. Use projection to reduce data size
db.collection1.aggregate([
  {$project: {field1: 1, field2: 1}},
  {
    $unionWith: {
      coll: "collection2",
      pipeline: [
        {$project: {field1: 1, field2: 1}}
      ]
    }
  }
])

// 3. Limit results if possible
db.collection1.aggregate([
  {$limit: 1000},
  {
    $unionWith: {
      coll: "collection2",
      pipeline: [
        {$limit: 1000}
      ]
    }
  }
])

// ========== EDGE CASES ==========

// Edge case 1: Empty collections
db.empty1.aggregate([
  {$unionWith: {coll: "empty2"}}
])
// Returns empty result

// Edge case 2: Duplicate _ids (from different collections)
// MongoDB allows duplicate _ids from different collections
// If you group by _id, duplicates will be combined

// Edge case 3: Schema differences
db.collection1.aggregate([
  {
    $unionWith: {
      coll: "collection2"  // Different schema
    }
  }
])
// Documents can have different fields - union will include all fields
```

### Working with Embedded Documents vs References

```javascript
// Embedded documents approach
db.posts.insertOne({
  title: "MongoDB Tutorial",
  content: "...",
  author: {
    _id: ObjectId("..."),
    name: "John Doe",
    email: "john@example.com"
  },
  comments: [
    {
      text: "Great post!",
      author: "Alice",
      date: new Date()
    },
    {
      text: "Very helpful",
      author: "Bob",
      date: new Date()
    }
  ]
})

// Query embedded documents
db.posts.find({"author.name": "John Doe"})
db.posts.find({"comments.author": "Alice"})

// Update embedded document
db.posts.updateOne(
  {_id: ObjectId("...")},
  {$set: {"author.email": "newemail@example.com"}}
)

// References approach
db.posts.insertOne({
  title: "MongoDB Tutorial",
  content: "...",
  authorId: ObjectId("..."),
  commentIds: [
    ObjectId("..."),
    ObjectId("...")
  ]
})

// Manual reference resolution
const post = db.posts.findOne({_id: ObjectId("...")})
const author = db.users.findOne({_id: post.authorId})
const comments = db.comments.find({
  _id: {$in: post.commentIds}
}).toArray()

// Using $lookup for references
db.posts.aggregate([
  {
    $lookup: {
      from: "users",
      localField: "authorId",
      foreignField: "_id",
      as: "author"
    }
  },
  {
    $unwind: "$author"
  },
  {
    $lookup: {
      from: "comments",
      localField: "commentIds",
      foreignField: "_id",
      as: "comments"
    }
  }
])
```

### Change Streams (Real-time Data)
```javascript
// Watch for changes
const changeStream = db.orders.watch()

changeStream.on("change", (change) => {
  console.log("Change detected:", change)
})

// Watch specific operations
const pipeline = [
  {
    $match: {
      operationType: {$in: ["insert", "update"]}
    }
  }
]
const changeStream = db.products.watch(pipeline)

// Watch with full document
const changeStream = db.users.watch([], {
  fullDocument: "updateLookup"
})

changeStream.on("change", (change) => {
  if (change.operationType === "update") {
    console.log("Updated document:", change.fullDocument)
  }
})

// Resume from token (for fault tolerance)
const resumeToken = changeStream.resumeToken
const newStream = db.orders.watch([], {
  resumeAfter: resumeToken
})
```

### Data Modeling Patterns

```javascript
// 1. Polymorphic Pattern
// Different document types in same collection
db.products.insertMany([
  {
    type: "book",
    title: "MongoDB Guide",
    author: "John Doe",
    isbn: "123-456",
    pages: 300
  },
  {
    type: "electronic",
    name: "Laptop",
    brand: "TechCorp",
    specs: {
      processor: "Intel i7",
      ram: "16GB"
    }
  }
])

// Query by type
db.products.find({type: "book"})

// 2. Attribute Pattern
// Dynamic attributes for variable schemas
db.products.insertOne({
  name: "Laptop",
  attributes: [
    {key: "processor", value: "Intel i7"},
    {key: "ram", value: "16GB"},
    {key: "storage", value: "512GB"}
  ]
})

// Create index on attributes
db.products.createIndex({"attributes.key": 1, "attributes.value": 1})

// Query attributes
db.products.find({
  attributes: {
    $elemMatch: {
      key: "ram",
      value: "16GB"
    }
  }
})

// 3. Bucket Pattern
// Group time-series data
db.sensorData.insertOne({
  sensorId: "sensor_001",
  date: ISODate("2024-01-01"),
  measurements: [
    {time: ISODate("2024-01-01T00:00:00Z"), temp: 20.5},
    {time: ISODate("2024-01-01T00:15:00Z"), temp: 20.7},
    {time: ISODate("2024-01-01T00:30:00Z"), temp: 21.0}
  ],
  count: 3,
  avgTemp: 20.73
})

// 4. Computed Pattern
// Pre-calculate frequently accessed values
db.orders.insertOne({
  orderId: "ORD123",
  items: [
    {name: "Item A", price: 10, quantity: 2},
    {name: "Item B", price: 20, quantity: 1}
  ],
  // Computed fields
  totalItems: 3,
  subtotal: 40,
  tax: 4,
  total: 44
})

// 5. Extended Reference Pattern
// Copy frequently accessed fields
db.orders.insertOne({
  orderId: "ORD123",
  customerId: ObjectId("..."),
  // Extended reference
  customerInfo: {
    name: "John Doe",
    email: "john@example.com"
    // Don't copy everything, just what's needed
  }
})
```

### Performance Optimization Tips

```javascript
// 1. Use projection to limit returned fields
db.users.find(
  {status: "active"},
  {name: 1, email: 1, _id: 0}
)

// 2. Use covered queries (all fields in index)
db.users.createIndex({status: 1, name: 1, email: 1})
db.users.find(
  {status: "active"},
  {name: 1, email: 1, _id: 0}
)

// 3. Use $hint to force index usage
db.users.find({email: "user@example.com"})
  .hint({email: 1})

// 4. Limit results early
db.posts.find({category: "tech"})
  .sort({createdAt: -1})
  .limit(10)

// 5. Use $exists sparingly
// Instead of: {field: {$exists: true}}
// Use: {field: {$ne: null}} if possible

// 6. Batch operations
const batch = []
for (let i = 0; i < 1000; i++) {
  batch.push({name: `User ${i}`, status: "active"})
  
  if (batch.length === 100) {
    db.users.insertMany(batch)
    batch.length = 0
  }
}

// 7. Use aggregation for complex queries
// Instead of multiple finds, use aggregation pipeline

// 8. Optimize with proper index selection
db.orders.createIndex({
  customerId: 1,
  orderDate: -1,
  status: 1
})

// 9. Use lean queries (Mongoose)
// Returns plain JavaScript objects instead of Mongoose documents

// 10. Monitor slow queries
db.setProfilingLevel(1, {slowms: 100})
db.system.profile.find().sort({ts: -1}).limit(5)
```

### Backup and Restore

```bash
# Backup entire database
mongodump --db=myDatabase --out=/backup/path

# Backup specific collection
mongodump --db=myDatabase --collection=users --out=/backup/path

# Backup with query filter
mongodump --db=myDatabase --collection=orders \
  --query='{"status": "completed"}' \
  --out=/backup/path

# Restore database
mongorestore --db=myDatabase /backup/path/myDatabase

# Restore specific collection
mongorestore --db=myDatabase --collection=users \
  /backup/path/myDatabase/users.bson

# Export to JSON
mongoexport --db=myDatabase --collection=users \
  --out=users.json

# Import from JSON
mongoimport --db=myDatabase --collection=users \
  --file=users.json

# Export to CSV
mongoexport --db=myDatabase --collection=users \
  --type=csv --fields=name,email,age \
  --out=users.csv
```

### Security Best Practices

```javascript
// 1. Create users with specific roles
db.createUser({
  user: "appUser",
  pwd: "securePassword123",
  roles: [
    {role: "readWrite", db: "myDatabase"}
  ]
})

// 2. Create read-only user
db.createUser({
  user: "reportUser",
  pwd: "password123",
  roles: [
    {role: "read", db: "myDatabase"}
  ]
})

// 3. Grant specific privileges
db.grantRolesToUser("appUser", [
  {role: "dbAdmin", db: "myDatabase"}
])

// 4. Revoke privileges
db.revokeRolesFromUser("appUser", [
  {role: "dbAdmin", db: "myDatabase"}
])

// 5. Enable authentication in mongod.conf
// security:
//   authorization: enabled

// 6. Use SSL/TLS for connections
// net:
//   ssl:
//     mode: requireSSL
//     PEMKeyFile: /path/to/cert.pem

// 7. Encrypt data at rest
// security:
//   enableEncryption: true
//   encryptionKeyFile: /path/to/keyfile

// 8. Field-level encryption (Client-side)
const ClientEncryption = require('mongodb-client-encryption')

// 9. IP whitelist in MongoDB Atlas

// 10. Audit logging
// auditLog:
//   destination: file
//   format: JSON
//   path: /var/log/mongodb/audit.json
```

---

## SUMMARY OF KEY CONCEPTS

### When to Use MongoDB
✅ **Good for:**
- Flexible, evolving schemas
- Hierarchical data structures
- High-volume read/write operations
- Rapid development and iteration
- Horizontal scaling requirements
- Document-oriented data

❌ **Not ideal for:**
- Complex transactions across multiple operations
- Heavy relational joins
- Strict ACID requirements (though MongoDB 4.0+ supports transactions)
- Highly normalized data

### Query Performance Tips
1. **Create appropriate indexes**
2. **Use projection to limit fields**
3. **Avoid $where and JavaScript execution**
4. **Use covered queries when possible**
5. **Limit and skip early in the pipeline**
6. **Use explain() to analyze queries**
7. **Batch operations when possible**
8. **Monitor with profiler**

### Common Pitfalls to Avoid
1. **Not indexing query fields**
2. **Using unbounded arrays**
3. **Not validating schemas**
4. **Ignoring index size**
5. **Not monitoring performance**
6. **Over-embedding documents**
7. **Not using transactions when needed**
8. **Storing large files directly (use GridFS)**

---

## QUICK REFERENCE CHEAT SHEET

```javascript
// DATABASE OPERATIONS
use dbName                          // Switch/create database
show dbs                           // List databases
db.dropDatabase()                  // Drop current database

// COLLECTION OPERATIONS
db.createCollection("name")        // Create collection
show collections                   // List collections
db.collection.drop()               // Drop collection

// INSERT
db.col.insertOne({})              // Insert single document
db.col.insertMany([{}, {}])       // Insert multiple documents

// FIND
db.col.find({})                   // Find all
db.col.findOne({})                // Find one
db.col.find({}).limit(10)         // Limit results
db.col.find({}).sort({field: -1}) // Sort descending
db.col.find({}).skip(10)          // Skip documents

// UPDATE
db.col.updateOne({}, {$set: {}})      // Update one
db.col.updateMany({}, {$set: {}})     // Update many
db.col.replaceOne({}, {})             // Replace document

// DELETE
db.col.deleteOne({})              // Delete one
db.col.deleteMany({})             // Delete many

// OPERATORS
{field: {$eq: value}}             // Equal
{field: {$gt: value}}             // Greater than
{field: {$gte: value}}            // Greater than or equal
{field: {$lt: value}}             // Less than
{field: {$lte: value}}            // Less than or equal
{field: {$ne: value}}             // Not equal
{field: {$in: [values]}}          // In array
{field: {$nin: [values]}}         // Not in array
{$and: [{}, {}]}                  // AND
{$or: [{}, {}]}                   // OR
{$not: {}}                        // NOT
{$nor: [{}, {}]}                  // NOR

// AGGREGATION
db.col.aggregate([
  {$match: {}},                   // Filter
  {$group: {_id: "$field"}},      // Group
  {$sort: {field: -1}},           // Sort
  {$project: {}},                 // Select fields
  {$limit: 10},                   // Limit
  {$skip: 5},                     // Skip
  {$lookup: {}},                  // Join
  {$unwind: "$array"}             // Unwind array
])

// INDEXES
db.col.createIndex({field: 1})    // Create ascending index
db.col.getIndexes()               // List indexes
db.col.dropIndex("indexName")     // Drop index
```

This completes the comprehensive MongoDB guide covering all major functions, operators, and concepts from basic to advanced level!






# Complete MongoDB Functions Guide - From Basics to Advanced

## Table of Contents
1. [Introduction to NoSQL and MongoDB](#introduction)
2. [MongoDB Setup](#setup)
3. [Database and Collection Operations](#database-operations)
4. [CRUD Operations](#crud-operations)
5. [Query Operations](#query-operations)
6. [Operators](#operators)
7. [Advanced Queries](#advanced-queries)
8. [Aggregation Framework](#aggregation)
9. [Indexing](#indexing)
10. [Transactions](#transactions)
11. [Data Modeling](#data-modeling)
12. [Replication and Sharding](#replication-sharding)
13. [Security](#security)

---

## 1. Introduction to NoSQL and MongoDB {#introduction}

### What is NoSQL?

**Definition**: NoSQL (Not Only SQL) refers to non-relational database management systems that provide mechanisms for storage and retrieval of data that is modeled in means other than tabular relations used in relational databases.

**Key Characteristics:**
- **Schema-less**: No predefined schema required
- **Horizontal Scalability**: Easy to scale across multiple servers
- **High Performance**: Optimized for specific data models
- **Flexible Data Models**: Support for various data structures

### Types of NoSQL Databases

1. **Document-Based Databases**
   - Store data as documents (JSON, BSON, XML)
   - Examples: MongoDB, CouchDB
   - Use case: Content management, catalogs, user profiles

2. **Key-Value Stores**
   - Simple key-value pairs
   - Examples: Redis, DynamoDB, Riak
   - Use case: Session management, caching, shopping carts

3. **Column-Family Stores**
   - Store data in columns instead of rows
   - Examples: Cassandra, HBase
   - Use case: Analytics, time-series data

4. **Graph Databases**
   - Store entities and relationships
   - Examples: Neo4j, ArangoDB
   - Use case: Social networks, recommendation engines

### Introduction to MongoDB

**Definition**: MongoDB is a source-available, cross-platform document-oriented database program. It uses JSON-like documents with optional schemas and is classified as a NoSQL database.

**Core Components:**
- **Database**: Container for collections
- **Collection**: Group of MongoDB documents (equivalent to table)
- **Document**: A record in MongoDB (equivalent to row)
- **Field**: A key-value pair in a document (equivalent to column)

**BSON Format:**
```javascript
// Update user password
db.changeUserPassword("appUser", "newSecurePassword")

// Grant additional roles
db.grantRolesToUser("appUser", [
  { role: "dbAdmin", db: "myDatabase" }
])

// Revoke roles
db.revokeRolesFromUser("appUser", [
  { role: "dbAdmin", db: "myDatabase" }
])

// Drop user
db.dropUser("appUser")

// List all users
db.getUsers()

// Show user info
db.getUser("appUser")

// List all roles
db.getRoles()
```

### 13.3 Built-in Roles

**Database User Roles:**
```javascript
// read - Read data from all non-system collections
{ role: "read", db: "myDatabase" }

// readWrite - Read and write to all non-system collections
{ role: "readWrite", db: "myDatabase" }
```

**Database Admin Roles:**
```javascript
// dbAdmin - Schema management, indexing, stats (no user management)
{ role: "dbAdmin", db: "myDatabase" }

// dbOwner - Full privileges (readWrite + dbAdmin + userAdmin)
{ role: "dbOwner", db: "myDatabase" }

// userAdmin - Create and modify users and roles
{ role: "userAdmin", db: "myDatabase" }
```

**Cluster Admin Roles:**
```javascript
// clusterAdmin - Full cluster administration
{ role: "clusterAdmin", db: "admin" }

// clusterManager - Manage and monitor cluster
{ role: "clusterManager", db: "admin" }

// clusterMonitor - Read-only access to monitoring tools
{ role: "clusterMonitor", db: "admin" }

// hostManager - Monitor and manage servers
{ role: "hostManager", db: "admin" }
```

**Backup and Restore Roles:**
```javascript
// backup - Backup database
{ role: "backup", db: "admin" }

// restore - Restore database
{ role: "restore", db: "admin" }
```

**All-Database Roles:**
```javascript
// readAnyDatabase - Read from all databases
{ role: "readAnyDatabase", db: "admin" }

// readWriteAnyDatabase - Read/write to all databases
{ role: "readWriteAnyDatabase", db: "admin" }

// userAdminAnyDatabase - Manage users in all databases
{ role: "userAdminAnyDatabase", db: "admin" }

// dbAdminAnyDatabase - Admin operations on all databases
{ role: "dbAdminAnyDatabase", db: "admin" }
```

**Superuser Role:**
```javascript
// root - Full access to all resources
{ role: "root", db: "admin" }
```

### 13.4 Custom Roles

```javascript
// Create custom role
use admin
db.createRole({
  role: "customAppRole",
  privileges: [
    {
      resource: { db: "myDatabase", collection: "users" },
      actions: ["find", "insert", "update"]
    },
    {
      resource: { db: "myDatabase", collection: "orders" },
      actions: ["find"]
    }
  ],
  roles: [
    { role: "read", db: "logs" }
  ]
})

// Create role with more privileges
db.createRole({
  role: "reportingRole",
  privileges: [
    {
      resource: { db: "sales", collection: "" },  // All collections
      actions: ["find", "listCollections", "listIndexes"]
    },
    {
      resource: { cluster: true },
      actions: ["serverStatus", "top"]
    }
  ],
  roles: []
})

// Grant custom role to user
db.grantRolesToUser("analyst", [
  { role: "customAppRole", db: "admin" }
])

// Update role
db.updateRole("customAppRole", {
  privileges: [
    {
      resource: { db: "myDatabase", collection: "users" },
      actions: ["find", "insert", "update", "remove"]
    }
  ]
})

// Drop role
db.dropRole("customAppRole")

// View role details
db.getRole("customAppRole", { showPrivileges: true })
```

**Available Actions:**
```javascript
// Query and Write Actions
"find", "insert", "remove", "update"

// Database Management
"changeStream", "createCollection", "dropCollection"
"createIndex", "dropIndex", "listIndexes"
"renameCollectionSameDB"

// Deployment Management
"serverStatus", "replSetGetStatus", "replSetGetConfig"
"shardingState", "listShards"

// Replication Actions
"replSetConfigure", "replSetStateChange"
"resync"

// Sharding Actions
"addShard", "removeShard", "shardingState"
"flushRouterConfig", "getShardMap"

// User/Role Management
"createUser", "dropUser", "changeOwnPassword", "changeOwnCustomData"
"grantRole", "revokeRole", "viewRole", "viewUser"

// Complete list at: mongodb.com/docs/manual/reference/privilege-actions/
```

### 13.5 Authentication Mechanisms

```javascript
// SCRAM (default, recommended)
db.createUser({
  user: "user1",
  pwd: "password",
  roles: ["readWrite"],
  mechanisms: ["SCRAM-SHA-256"]
})

// Connect with SCRAM
mongosh "mongodb://user1:password@localhost:27017/mydb?authMechanism=SCRAM-SHA-256"

// X.509 Certificate Authentication
mongod --tlsMode requireTLS \
       --tlsCertificateKeyFile /path/to/mongodb.pem \
       --tlsCAFile /path/to/ca.pem

// LDAP Authentication
mongod --auth \
       --setParameter authenticationMechanisms=PLAIN \
       --setParameter saslauthdPath=/var/run/saslauthd/mux

// Kerberos Authentication
mongod --setParameter authenticationMechanisms=GSSAPI

// MongoDB Enterprise only: LDAP, Kerberos, LDAP Proxy
```

### 13.6 Network Security

```javascript
// Bind to specific IP
mongod --bind_ip localhost,192.168.1.5

// Enable TLS/SSL
mongod --tlsMode requireTLS \
       --tlsCertificateKeyFile /path/to/mongodb.pem

// IP Whitelist (firewall)
// Configure at OS level or MongoDB Atlas

// VPC/VPN
// Deploy in private network

// mongod.conf configuration
net:
  port: 27017
  bindIp: 127.0.0.1,192.168.1.5
  tls:
    mode: requireTLS
    certificateKeyFile: /path/to/mongodb.pem
    CAFile: /path/to/ca.pem
```

### 13.7 Encryption

**Encryption at Rest:**
```javascript
// MongoDB Enterprise feature
mongod --enableEncryption \
       --encryptionKeyFile /path/to/keyfile

// WiredTiger storage engine encryption
storage:
  dbPath: /data/db
  engine: wiredTiger
  wiredTiger:
    engineConfig:
      cacheSizeGB: 2
security:
  enableEncryption: true
  encryptionKeyFile: /path/to/keyfile
```

**Encryption in Transit (TLS/SSL):**
```javascript
// Server configuration
mongod --tlsMode requireTLS \
       --tlsCertificateKeyFile /path/to/mongodb.pem

// Client connection
mongosh "mongodb://hostname:27017" \
        --tls \
        --tlsCAFile /path/to/ca.pem \
        --tlsCertificateKeyFile /path/to/client.pem
```

**Client-Side Field Level Encryption (CSFLE):**
```javascript
// Create data encryption key
const client = new MongoClient(uri, {
  autoEncryption: {
    keyVaultNamespace: "encryption.__keyVault",
    kmsProviders: {
      local: {
        key: localMasterKey
      }
    }
  }
})

// Define encrypted fields
const encryptedFieldsMap = {
  "mydb.users": {
    fields: [
      {
        path: "ssn",
        bsonType: "string",
        keyId: dataEncryptionKey
      }
    ]
  }
}

// Insert encrypted data (automatic)
db.users.insertOne({
  name: "John Doe",
  ssn: "123-45-6789"  // Automatically encrypted
})
```

### 13.8 Auditing (Enterprise)

```javascript
// Enable auditing
mongod --auditDestination file \
       --auditFormat JSON \
       --auditPath /var/log/mongodb/audit.json

// Configuration file
auditLog:
  destination: file
  format: JSON
  path: /var/log/mongodb/audit.json
  filter: '{ atype: { $in: ["authenticate", "createUser", "dropUser"] } }'

// Audit filter examples
// Authentication events
{ atype: "authenticate" }

// DDL operations
{ atype: { $in: ["createCollection", "dropCollection", "createIndex"] } }

// Specific user actions
{ "param.user": "admin" }

// Failed operations
{ result: { $ne: 0 } }

// Specific database
{ "param.ns": /^mydb\./ }
```

### 13.9 Security Checklist

```javascript
// 1. Enable Authentication
mongod --auth

// 2. Create Admin User
use admin
db.createUser({
  user: "admin",
  pwd: "strongPassword",
  roles: ["root"]
})

// 3. Enable TLS/SSL
mongod --tlsMode requireTLS \
       --tlsCertificateKeyFile /path/to/cert.pem

// 4. Bind to Specific IP
mongod --bind_ip localhost,10.0.0.5

// 5. Use Strong Passwords
// - Minimum 12 characters
// - Mix of uppercase, lowercase, numbers, symbols

// 6. Principle of Least Privilege
// - Grant minimum required roles
// - Use custom roles

// 7. Regular Security Updates
// - Keep MongoDB updated
// - Apply security pat JSON format (human-readable)
{
  "name": "John Doe",
  "age": 30
}

// BSON format (binary representation, MongoDB's internal format)
// Includes type information and is more efficient for storage and traversal
```

**Key Features:**
1. **Ad-hoc queries**: Support for field, range, and regex searches
2. **Indexing**: Any field can be indexed
3. **Replication**: High availability with replica sets
4. **Load Balancing**: Automatic data distribution via sharding
5. **File Storage**: GridFS for storing files larger than 16MB
6. **Aggregation**: MapReduce and aggregation pipeline
7. **Server-side JavaScript**: Execution of JavaScript functions

---

## 2. MongoDB Setup {#setup}

### Installation Steps

**On Windows:**
```bash
# Download MongoDB Community Server from mongodb.com
# Run the installer
# Add MongoDB to PATH
C:\Program Files\MongoDB\Server\{version}\bin

# Start MongoDB service
net start MongoDB
```

**On macOS:**
```bash
# Using Homebrew
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community
```

**On Linux (Ubuntu):**
```bash
# Import public key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Create list file
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
```

### Connecting to MongoDB

**Using MongoDB Shell (mongosh):**
```bash
# Connect to local MongoDB instance
mongosh

# Connect to remote MongoDB
mongosh "mongodb://username:password@host:port/database"

# Connect with options
mongosh "mongodb://localhost:27017" --username admin --password password123
```

**Using Node.js Driver:**
```javascript
const { MongoClient } = require('mongodb');

// Connection URI
const uri = "mongodb://localhost:27017";

// Create client
const client = new MongoClient(uri);

async function connect() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Connection failed:", error);
  }
}

connect();
```

---

## 3. Database and Collection Operations {#database-operations}

### Database Operations

#### 3.1 Create/Switch Database

**Definition**: The `use` command switches to a specified database. If the database doesn't exist, MongoDB creates it when you first store data.

```javascript
// Switch to database (creates if doesn't exist)
use myDatabase

// Current database
db

// Example output: myDatabase
```

**Note**: The database is not actually created until you insert data into it.

#### 3.2 Show All Databases

**Definition**: Lists all databases on the MongoDB server.

```javascript
// Show all databases
show dbs
// or
show databases

// Example output:
// admin     40.00 KiB
// config    108.00 KiB
// local     40.00 KiB
// myDatabase  8.00 KiB
```

#### 3.3 Get Database Statistics

**Definition**: Returns statistics about the database including size, number of collections, and indexes.

```javascript
// Get database stats
db.stats()

// Example output:
{
  db: 'myDatabase',
  collections: 3,
  views: 0,
  objects: 1250,
  avgObjSize: 512.5,
  dataSize: 640625,
  storageSize: 286720,
  indexes: 5,
  indexSize: 102400,
  totalSize: 389120,
  scaleFactor: 1,
  fsUsedSize: 1024000000,
  fsTotalSize: 10240000000,
  ok: 1
}
```

#### 3.4 Drop Database

**Definition**: Deletes the current database and all its collections.

```javascript
// Drop current database
db.dropDatabase()

// Example output:
{ ok: 1, dropped: 'myDatabase' }
```

**Warning**: This operation is irreversible!

### Collection Operations

#### 3.5 Create Collection

**Definition**: Creates a new collection in the current database.

**Syntax:**
```javascript
db.createCollection(name, options)
```

**Parameters:**
- `name`: Name of the collection
- `options`: Optional configuration object

**Options:**
- `capped`: Boolean - Creates a fixed-size collection
- `size`: Number - Maximum size in bytes (for capped collections)
- `max`: Number - Maximum number of documents (for capped collections)
- `validator`: Object - Document validation rules
- `validationLevel`: String - How strictly validation is applied
- `validationAction`: String - Action when validation fails

```javascript
// Simple collection creation
db.createCollection("users")

// Collection with options
db.createCollection("logs", {
  capped: true,
  size: 5242880,  // 5MB
  max: 5000       // Maximum 5000 documents
})

// Collection with validation
db.createCollection("products", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "price"],
      properties: {
        name: {
          bsonType: "string",
          description: "must be a string and is required"
        },
        price: {
          bsonType: "number",
          minimum: 0,
          description: "must be a number >= 0 and is required"
        }
      }
    }
  },
  validationAction: "error"
})
```

**Implicit Creation:**
```javascript
// Collections are created automatically when you insert data
db.newCollection.insertOne({ name: "John" })
// This creates "newCollection" if it doesn't exist
```

#### 3.6 Show Collections

**Definition**: Lists all collections in the current database.

```javascript
// Show all collections
show collections
// or
show tables
// or
db.getCollectionNames()

// Example output:
// users
// products
// orders
// logs
```

#### 3.7 Get Collection Statistics

**Definition**: Returns statistics about a specific collection.

```javascript
// Get collection stats
db.users.stats()

// Example output:
{
  ns: 'myDatabase.users',
  size: 327680,
  count: 640,
  avgObjSize: 512,
  storageSize: 143360,
  freeStorageSize: 0,
  capped: false,
  nindexes: 2,
  indexBuilds: [],
  totalIndexSize: 40960,
  totalSize: 184320,
  indexSizes: {
    _id_: 20480,
    email_1: 20480
  },
  ok: 1
}
```

#### 3.8 Rename Collection

**Definition**: Renames an existing collection.

```javascript
// Rename collection
db.oldCollectionName.renameCollection("newCollectionName")

// With dropTarget option (drops target collection if exists)
db.oldName.renameCollection("newName", true)

// Example
db.users.renameCollection("customers")
```

#### 3.9 Drop Collection

**Definition**: Deletes a collection and all its documents and indexes.

```javascript
// Drop collection
db.users.drop()

// Example output:
true  // Success
false // Collection doesn't exist

// Alternative method
db.runCommand({ drop: "users" })
```

---

## 4. CRUD Operations {#crud-operations}

### Create Operations

#### 4.1 insertOne()

**Definition**: Inserts a single document into a collection.

**Syntax:**
```javascript
db.collection.insertOne(
  document,
  {
    writeConcern: <document>
  }
)
```

**Parameters:**
- `document`: The document to insert
- `writeConcern`: Optional - Level of acknowledgment

**Returns:** An object containing:
- `acknowledged`: Boolean
- `insertedId`: The _id of the inserted document

```javascript
// Basic insert
db.users.insertOne({
  name: "Alice Johnson",
  email: "alice@example.com",
  age: 28,
  active: true
})

// Output:
{
  acknowledged: true,
  insertedId: ObjectId("507f1f77bcf86cd799439011")
}

// Insert with custom _id
db.users.insertOne({
  _id: "user001",
  name: "Bob Smith",
  email: "bob@example.com",
  age: 35
})

// Insert with nested documents
db.users.insertOne({
  name: "Charlie Brown",
  email: "charlie@example.com",
  address: {
    street: "123 Main St",
    city: "New York",
    zipCode: "10001"
  },
  hobbies: ["reading", "gaming", "hiking"]
})

// Insert with date
db.users.insertOne({
  name: "Diana Prince",
  email: "diana@example.com",
  createdAt: new Date(),
  lastLogin: ISODate("2024-01-15T10:30:00Z")
})
```

#### 4.2 insertMany()

**Definition**: Inserts multiple documents into a collection in a single operation.

**Syntax:**
```javascript
db.collection.insertMany(
  [document1, document2, ...],
  {
    writeConcern: <document>,
    ordered: <boolean>
  }
)
```

**Parameters:**
- `documents`: Array of documents to insert
- `ordered`: Boolean - If true (default), stops on first error. If false, continues inserting remaining documents

```javascript
// Basic multiple insert
db.users.insertMany([
  {
    name: "Emma Watson",
    email: "emma@example.com",
    age: 32
  },
  {
    name: "Frank Miller",
    email: "frank@example.com",
    age: 45
  },
  {
    name: "Grace Lee",
    email: "grace@example.com",
    age: 29
  }
])

// Output:
{
  acknowledged: true,
  insertedIds: {
    '0': ObjectId("507f1f77bcf86cd799439012"),
    '1': ObjectId("507f1f77bcf86cd799439013"),
    '2': ObjectId("507f1f77bcf86cd799439014")
  }
}

// Unordered insert (continues on error)
db.users.insertMany([
  { _id: 1, name: "User 1" },
  { _id: 2, name: "User 2" },
  { _id: 1, name: "Duplicate" },  // This will fail
  { _id: 3, name: "User 3" }      // This will still be inserted
], { ordered: false })

// Batch insert with validation
db.products.insertMany([
  {
    name: "Laptop",
    price: 999.99,
    category: "Electronics",
    stock: 50,
    specifications: {
      processor: "Intel i7",
      ram: "16GB",
      storage: "512GB SSD"
    }
  },
  {
    name: "Mouse",
    price: 29.99,
    category: "Electronics",
    stock: 200
  }
])
```

#### 4.3 insert()

**Definition**: Legacy method that can insert one or multiple documents. **Deprecated** in favor of `insertOne()` and `insertMany()`.

```javascript
// Insert single document
db.users.insert({ name: "John", age: 30 })

// Insert multiple documents
db.users.insert([
  { name: "Jane", age: 25 },
  { name: "Bob", age: 35 }
])
```

### Read Operations

#### 4.4 find()

**Definition**: Selects documents from a collection and returns a cursor to the selected documents.

**Syntax:**
```javascript
db.collection.find(
  query,
  projection
)
```

**Parameters:**
- `query`: Selection filter using query operators
- `projection`: Fields to include or exclude

```javascript
// Find all documents
db.users.find()

// Find with query filter
db.users.find({ age: 30 })

// Find with multiple conditions
db.users.find({
  age: { $gte: 25 },
  active: true
})

// Find with projection (include specific fields)
db.users.find(
  { age: { $gte: 25 } },
  { name: 1, email: 1, _id: 0 }
)
// Output: Only name and email fields

// Find with exclusion projection
db.users.find(
  {},
  { password: 0 }
)
// Output: All fields except password

// Find nested documents
db.users.find({
  "address.city": "New York"
})

// Find in arrays
db.users.find({
  hobbies: "gaming"
})

// Find with regex
db.users.find({
  name: /^John/i  // Case-insensitive, starts with "John"
})

// Complex query example
db.orders.find({
  status: "pending",
  total: { $gte: 100 },
  "customer.country": "USA",
  items: { $size: { $gt: 2 } }
})
```

#### 4.5 findOne()

**Definition**: Returns a single document that satisfies the query criteria.

```javascript
// Find first document
db.users.findOne()

// Find specific document
db.users.findOne({ email: "alice@example.com" })

// Find with projection
db.users.findOne(
  { _id: ObjectId("507f1f77bcf86cd799439011") },
  { name: 1, email: 1 }
)

// Find latest document (with sort)
db.users.findOne(
  {},
  { sort: { createdAt: -1 } }
)
```

#### 4.6 Cursor Methods

**Definition**: Methods that modify the behavior of cursors returned by `find()`.

**limit()** - Limits the number of documents returned
```javascript
// Return first 5 users
db.users.find().limit(5)

// Combine with query
db.users.find({ age: { $gte: 25 } }).limit(10)
```

**skip()** - Skips a specified number of documents
```javascript
// Skip first 10 documents
db.users.find().skip(10)

// Pagination: Page 2, 10 items per page
db.users.find().skip(10).limit(10)

// Pagination: Page 3, 20 items per page
const page = 3;
const pageSize = 20;
db.users.find()
  .skip((page - 1) * pageSize)
  .limit(pageSize)
```

**sort()** - Sorts the documents
```javascript
// Sort ascending (1)
db.users.find().sort({ age: 1 })

// Sort descending (-1)
db.users.find().sort({ age: -1 })

// Multiple sort fields
db.users.find().sort({ age: -1, name: 1 })

// Sort nested fields
db.users.find().sort({ "address.city": 1 })
```

**count() / countDocuments()** - Counts documents
```javascript
// Count all documents
db.users.countDocuments()

// Count with filter
db.users.countDocuments({ age: { $gte: 25 } })

// Legacy method (deprecated)
db.users.count()
```

**distinct()** - Returns distinct values for a field
```javascript
// Get distinct ages
db.users.distinct("age")
// Output: [25, 28, 30, 32, 35, 45]

// Distinct with query
db.users.distinct("city", { age: { $gte: 30 } })

// Distinct on nested field
db.users.distinct("address.city")
```

**Combining Cursor Methods:**
```javascript
// Complete pagination with sorting
db.products.find({ category: "Electronics" })
  .sort({ price: -1 })
  .skip(20)
  .limit(10)
  .projection({ name: 1, price: 1 })

// Find top 5 expensive products
db.products.find()
  .sort({ price: -1 })
  .limit(5)

// Get second page of active users, sorted by registration date
db.users.find({ active: true })
  .sort({ registeredAt: -1 })
  .skip(10)
  .limit(10)
```

### Update Operations

#### 4.7 updateOne()

**Definition**: Updates a single document that matches the filter criteria.

**Syntax:**
```javascript
db.collection.updateOne(
  filter,
  update,
  options
)
```

**Parameters:**
- `filter`: Selection criteria
- `update`: Modifications to apply
- `options`: Optional settings (upsert, arrayFilters, etc.)

```javascript
// Basic update
db.users.updateOne(
  { email: "alice@example.com" },
  { $set: { age: 29 } }
)

// Output:
{
  acknowledged: true,
  matchedCount: 1,
  modifiedCount: 1
}

// Update multiple fields
db.users.updateOne(
  { _id: ObjectId("507f1f77bcf86cd799439011") },
  {
    $set: {
      age: 30,
      city: "Boston",
      lastModified: new Date()
    }
  }
)

// Update nested document
db.users.updateOne(
  { email: "bob@example.com" },
  {
    $set: {
      "address.street": "456 Oak Ave",
      "address.zipCode": "02101"
    }
  }
)

// Update with upsert (insert if not exists)
db.users.updateOne(
  { email: "new@example.com" },
  {
    $set: {
      name: "New User",
      age: 25
    }
  },
  { upsert: true }
)

// Increment numeric field
db.users.updateOne(
  { email: "alice@example.com" },
  { $inc: { loginCount: 1 } }
)

// Add to array
db.users.updateOne(
  { email: "charlie@example.com" },
  { $push: { hobbies: "photography" } }
)

// Remove from array
db.users.updateOne(
  { email: "charlie@example.com" },
  { $pull: { hobbies: "gaming" } }
)

// Update with multiple operators
db.products.updateOne(
  { _id: 1 },
  {
    $set: { name: "Updated Product" },
    $inc: { views: 1 },
    $currentDate: { lastModified: true }
  }
)
```

#### 4.8 updateMany()

**Definition**: Updates all documents that match the filter criteria.

```javascript
// Update multiple documents
db.users.updateMany(
  { age: { $lt: 25 } },
  { $set: { category: "young" } }
)

// Output:
{
  acknowledged: true,
  matchedCount: 15,
  modifiedCount: 15
}

// Increment field for all documents
db.products.updateMany(
  { category: "Electronics" },
  { $inc: { price: 50 } }
)

// Add field to all documents
db.users.updateMany(
  {},
  { $set: { status: "active", updatedAt: new Date() } }
)

// Update based on condition
db.orders.updateMany(
  { status: "pending", createdAt: { $lt: new Date("2024-01-01") } },
  {
    $set: { status: "expired" },
    $currentDate: { expiredAt: true }
  }
)

// Update array elements (add to all)
db.users.updateMany(
  { role: "premium" },
  { $addToSet: { features: "advanced-analytics" } }
)
```

#### 4.9 replaceOne()

**Definition**: Replaces a single document entirely (except _id field).

```javascript
// Replace entire document
db.users.replaceOne(
  { email: "old@example.com" },
  {
    name: "Completely New User",
    email: "new@example.com",
    age: 40,
    active: true
  }
)

// Note: _id remains the same, all other fields are replaced

// With upsert
db.users.replaceOne(
  { email: "nonexistent@example.com" },
  {
    name: "New Person",
    email: "nonexistent@example.com",
    age: 30
  },
  { upsert: true }
)
```

#### 4.10 findOneAndUpdate()

**Definition**: Finds a document, updates it, and returns either the original or updated document.

**Syntax:**
```javascript
db.collection.findOneAndUpdate(
  filter,
  update,
  {
    returnDocument: "before" | "after",
    sort: <document>,
    projection: <document>,
    upsert: <boolean>
  }
)
```

```javascript
// Return original document (default)
db.users.findOneAndUpdate(
  { email: "alice@example.com" },
  { $inc: { loginCount: 1 } }
)

// Return updated document
db.users.findOneAndUpdate(
  { email: "alice@example.com" },
  { $set: { lastLogin: new Date() } },
  { returnDocument: "after" }
)

// With sorting (update first matching sorted document)
db.queue.findOneAndUpdate(
  { status: "pending" },
  { $set: { status: "processing" } },
  {
    sort: { priority: -1, createdAt: 1 },
    returnDocument: "after"
  }
)

// With projection
db.users.findOneAndUpdate(
  { _id: ObjectId("507f1f77bcf86cd799439011") },
  { $inc: { points: 10 } },
  {
    returnDocument: "after",
    projection: { name: 1, points: 1 }
  }
)

// Upsert example
db.counters.findOneAndUpdate(
  { _id: "pageViews" },
  { $inc: { count: 1 } },
  {
    upsert: true,
    returnDocument: "after"
  }
)
```

#### 4.11 findOneAndReplace()

**Definition**: Finds a document, replaces it, and returns either the original or replaced document.

```javascript
// Replace and return new document
db.users.findOneAndReplace(
  { email: "old@example.com" },
  {
    name: "New Name",
    email: "old@example.com",
    age: 35,
    updatedAt: new Date()
  },
  { returnDocument: "after" }
)

// With sorting
db.sessions.findOneAndReplace(
  { active: false },
  {
    userId: "user123",
    active: true,
    startTime: new Date()
  },
  {
    sort: { endTime: 1 },
    returnDocument: "after"
  }
)
```

### Delete Operations

#### 4.12 deleteOne()

**Definition**: Deletes a single document that matches the filter.

```javascript
// Delete single document
db.users.deleteOne({ email: "delete@example.com" })

// Output:
{
  acknowledged: true,
  deletedCount: 1
}

// Delete with multiple conditions
db.users.deleteOne({
  age: { $lt: 18 },
  active: false
})

// Delete first matching document (with sort)
db.logs.deleteOne(
  { level: "debug" },
  { sort: { timestamp: 1 } }
)

// If no match, deletedCount is 0
db.users.deleteOne({ email: "nonexistent@example.com" })
// Output: { acknowledged: true, deletedCount: 0 }
```

#### 4.13 deleteMany()

**Definition**: Deletes all documents that match the filter.

```javascript
// Delete multiple documents
db.users.deleteMany({ active: false })

// Output:
{
  acknowledged: true,
  deletedCount: 25
}

// Delete all documents (BE CAREFUL!)
db.tempData.deleteMany({})

// Delete with date condition
db.logs.deleteMany({
  timestamp: { $lt: new Date("2024-01-01") }
})

// Delete with complex condition
db.orders.deleteMany({
  status: "cancelled",
  createdAt: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
})
// Deletes cancelled orders older than 90 days

// Delete nested document match
db.users.deleteMany({
  "address.country": "Unknown"
})
```

#### 4.14 findOneAndDelete()

**Definition**: Finds a document, deletes it, and returns the deleted document.

```javascript
// Delete and return document
const deletedUser = db.users.findOneAndDelete({
  email: "todelete@example.com"
})

// Output: The deleted document
{
  _id: ObjectId("..."),
  name: "To Delete",
  email: "todelete@example.com",
  age: 30
}

// With sorting (delete oldest)
db.messages.findOneAndDelete(
  { read: true },
  { sort: { timestamp: 1 } }
)

// With projection
db.sessions.findOneAndDelete(
  { expired: true },
  {
    sort: { endTime: 1 },
    projection: { _id: 1, userId: 1 }
  }
)

// Use case: Queue processing
const job = db.jobQueue.findOneAndDelete(
  { status: "pending" },
  { sort: { priority: -1, createdAt: 1 } }
)
if (job) {
  // Process the job
  console.log("Processing job:", job._id);
}
```

---

## 5. Query Operations {#query-operations}

### Query Selectors

#### 5.1 Comparison Operators

**$eq** - Equals
```javascript
// Explicit equality
db.users.find({ age: { $eq: 30 } })

// Implicit equality (same as above)
db.users.find({ age: 30 })

// With null
db.users.find({ deletedAt: { $eq: null } })
```

**$ne** - Not equal
```javascript
// Not equal to value
db.users.find({ status: { $ne: "inactive" } })

// Not null
db.users.find({ email: { $ne: null } })
```

**$gt** - Greater than
```javascript
// Age greater than 25
db.users.find({ age: { $gt: 25 } })

// Date greater than
db.orders.find({
  createdAt: { $gt: ISODate("2024-01-01") }
})
```

**$gte** - Greater than or equal
```javascript
// Age 25 or older
db.users.find({ age: { $gte: 25 } })

// Price at least 100
db.products.find({ price: { $gte: 100 } })
```

**$lt** - Less than
```javascript
// Age less than 30
db.users.find({ age: { $lt: 30 } })

// Stock below 10
db.products.find({ stock: { $lt: 10 } })
```

**$lte** - Less than or equal
```javascript
// Age 30 or younger
db.users.find({ age: { $lte: 30 } })

// Orders up to $500
db.orders.find({ total: { $lte: 500 } })
```

**$in** - Matches any value in array
```javascript
// Status is either pending or processing
db.orders.find({
  status: { $in: ["pending", "processing"] }
})

// Age is 25, 30, or 35
db.users.find({
  age: { $in: [25, 30, 35] }
})

// Multiple fields
db.products.find({
  category: { $in: ["Electronics", "Computers"] },
  brand: { $in: ["Apple", "Dell", "HP"] }
})
```

**$nin** - Not in array
```javascript
// Status is not cancelled or rejected
db.orders.find({
  status: { $nin: ["cancelled", "rejected"] }
})

// Exclude certain categories
db.products.find({
  category: { $nin: ["Outdated", "Discontinued"] }
})
```

#### 5.2 Logical Operators

**$and** - Logical AND
```javascript
// Explicit AND
db.users.find({
  $and: [
    { age: { $gte: 25 } },
    { age: { $lte: 35 } },
    { active: true }
  ]
})

// Implicit AND (same as above, preferred)
db.users.find({
  age: { $gte: 25, $lte: 35 },
  active: true
})

// When same field has multiple conditions
db.products.find({
  $and: [
    { price: { $ne: 100 } },
    { price: { $exists: true } }
  ]
})
```

**$or** - Logical OR
```javascript
// Either condition matches
db.users.find({
  $or: [
    { age: { $lt: 25 } },
    { age: { $gt: 60 } }
  ]
})

// Multiple OR conditions
db.orders.find({
  $or: [
    { status: "urgent" },
    { priority: { $gte: 8 } },
    { customer: "VIP" }
  ]
})

// Combining AND and OR
db.products.find({
  category: "Electronics",
  $or: [
    { price: { $lt: 500 } },
    { discount: { $gte: 20 } }
  ]
})
```

**$not** - Logical NOT
```javascript
// Not matching condition
db.users.find({
  age: { $not: { $gte: 30 } }
})
// Same as: age < 30

// Not matching regex
db.users.find({
  email: { $not: /^admin/ }
})

// Not in range
db.products.find({
  price: { $not: { $gte: 100, $lte: 500 } }
})
```

**$nor** - Logical NOR (not any condition)
```javascript
// Neither condition matches
db.users.find({
  $nor: [
    { age: { $lt: 18 } },
    { status: "banned" }
  ]
})
// Returns users who are NOT under 18 AND NOT banned

// Multiple NOR conditions
db.products.find({
  $nor: [
    { category: "Discontinued" },
    { stock: 0 },
    { price: { $lt: 10 } }
  ]
})
```

#### 5.3 Element Operators

**$exists** - Field exists or not
```javascript
// Documents where email field exists
db.users.find({ email: { $exists: true } })

// Documents without phone field
db.users.find({ phone: { $exists: false } })

// Combining with other conditions
db.users.find({
  email: { $exists: true, $ne: null }
})

// Check nested field exists
db.users.find({
  "address.zipCode": { $exists: true }
})
```

**$type** - Field is of specific BSON type
```javascript
// Find documents where age is a number
db.users.find({ age: { $type: "number" } })

// Find documents where age is a string
db.users.find({ age: { $type: "string" } })

// Using type code
db.users.find({ age: { $type: 16 } })  // 16 = 32-bit integer

// Multiple types
db.users.find({
  value: { $type: ["number", "string"] }
})

// Common BSON types:
// "double" (1), "string" (2), "object" (3), "array" (4)
// "objectId" (7), "bool" (8), "date" (9), "null" (10)
// "int" (16), "long" (18), "decimal" (19)

// Find null or missing fields
db.users.find({
  deletedAt: { $type: "null" }
})

// Find arrays
db.users.find({
  hobbies: { $type: "array" }
})
```

#### 5.4 Array Operators

**$all** - Array contains all specified elements
```javascript
// Array contains both "reading" and "gaming"
db.users.find({
  hobbies: { $all: ["reading", "gaming"] }
})

// Order doesn't matter
db.products.find({
  tags: { $all: ["sale", "featured"] }
})

// Can contain additional elements
// Document: { hobbies: ["reading", "gaming", "hiking"] }
// Matches: { hobbies: { $all: ["reading", "gaming"] } }
```

**$elemMatch** - Array element matches all conditions
```javascript
// Scores array has element >= 80 and <= 90
db.students.find({
  scores: { $elemMatch: { $gte: 80, $lte: 90 } }
})

// Array of embedded documents
db.orders.find({
  items: {
    $elemMatch: {
      quantity: { $gt: 10 },
      price: { $lt: 50 }
    }
  }
})

// Complex nested conditions
db.users.find({
  "history": {
    $elemMatch: {
      event: "purchase",
      amount: { $gte: 100 },
      date: { $gte: ISODate("2024-01-01") }
    }
  }
})

// Without $elemMatch (different behavior)
db.students.find({
  scores: { $gte: 80, $lte: 90 }
})
// This could match different elements: one >= 80, another <= 90
```

**$size** - Array has specific length
```javascript
// Array has exactly 3 elements
db.users.find({
  hobbies: { $size: 3 }
})

// Empty array
db.users.find({
  tags: { $size: 0 }
})

// Note: $size doesn't accept ranges
// For ranges, use different approach:
db.users.find({
  $expr: {
    $and: [
      { $gte: [{ $size: "$hobbies" }, 2] },
      { $lte: [{ $size: "$hobbies" }, 5] }
    ]
  }
})
```

#### 5.5 String Operators

**Regular Expressions**
```javascript
// Case-sensitive match
db.users.find({
  name: /^John/
})

// Case-insensitive match
db.users.find({
  name: /john/i
})

// Using $regex operator
db.users.find({
  email: { $regex: /gmail\.com$/, $options: "i" }
})

// Pattern matching
db.products.find({
  name: { $regex: "laptop", $options: "i" }
})

// Multiple patterns
db.users.find({
  $or: [
    { email: /gmail\.com$/ },
    { email: /yahoo\.com$/ }
  ]
})

// Escaping special characters
const searchTerm = "user.name"; // Contains dot
db.users.find({
  username: {
    $regex: searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\// Implicit AND (same as above, preferred)
db.users.find({
  age: { $gte')
  }
})
```

**$text** - Text search (requires text index)
```javascript
// Create text index first
db.articles.createIndex({ title: "text", content: "text" })

// Search for words
db.articles.find({
  $text: { $search: "mongodb database" }
})

// Exact phrase search
db.articles.find({
  $text: { $search: "\"NoSQL database\"" }
})

// Exclude words
db.articles.find({
  $text: { $search: "mongodb -sql" }
})

// Case-sensitive search
db.articles.find({
  $text: { $search: "MongoDB", $caseSensitive: true }
})

// Get text score
db.articles.find(
  { $text: { $search: "mongodb" } },
  { score: { $meta: "textScore" } }
).sort({ score: { $meta: "textScore" } })
```

#### 5.6 Evaluation Operators

**$expr** - Use aggregation expressions in query
```javascript
// Compare two fields
db.orders.find({
  $expr: { $gt: ["$spent", "$budget"] }
})
// Finds orders where spent > budget

// Arithmetic operations
db.products.find({
  $expr: {
    $gt: [
      { $multiply: ["$price", 0.9] },
      "$cost"
    ]
  }
})
// 90% of price is still greater than cost

// String operations
db.users.find({
  $expr: {
    $eq: [
      { $substr: ["$email", 0, 5] },
      "admin"
    ]
  }
})

// Date operations
db.events.find({
  $expr: {
    $eq: [
      { $year: "$createdAt" },
      2024
    ]
  }
})

// Array size comparison
db.users.find({
  $expr: { $gte: [{ $size: "$hobbies" }, 3] }
})
```

**$jsonSchema** - Validate documents against JSON Schema
```javascript
// Create collection with schema validation
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "email", "age"],
      properties: {
        name: {
          bsonType: "string",
          description: "must be a string and is required"
        },
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9+_.-]+@[a-zA-Z0-9.-]+$",
          description: "must be a valid email"
        },
        age: {
          bsonType: "int",
          minimum: 0,
          maximum: 120,
          description: "must be an integer between 0 and 120"
        },
        address: {
          bsonType: "object",
          properties: {
            street: { bsonType: "string" },
            city: { bsonType: "string" }
          }
        }
      }
    }
  }
})

// Query with schema
db.users.find({
  $jsonSchema: {
    required: ["phone"],
    properties: {
      phone: { bsonType: "string" }
    }
  }
})
```

**$mod** - Modulo operation
```javascript
// Find even numbers
db.numbers.find({
  value: { $mod: [2, 0] }
})

// Find odd numbers
db.numbers.find({
  value: { $mod: [2, 1] }
})

// Every 5th item
db.items.find({
  index: { $mod: [5, 0] }
})
```

**$where** - JavaScript expression (SLOW, avoid if possible)
```javascript
// Using JavaScript function
db.users.find({
  $where: function() {
    return this.age > 25 && this.name.length > 5;
  }
})

// Using string expression
db.users.find({
  $where: "this.age > 25 && this.name.length > 5"
})

// Better alternative using $expr
db.users.find({
  $expr: {
    $and: [
      { $gt: ["$age", 25] },
      { $gt: [{ $strLenCP: "$name" }, 5] }
    ]
  }
})
```

---

## 6. Operators {#operators}

### Update Operators

#### 6.1 Field Update Operators

**$set** - Sets field value
```javascript
// Set single field
db.users.updateOne(
  { _id: 1 },
  { $set: { age: 30 } }
)

// Set multiple fields
db.users.updateOne(
  { _id: 1 },
  {
    $set: {
      age: 30,
      city: "Boston",
      updatedAt: new Date()
    }
  }
)

// Set nested field
db.users.updateOne(
  { _id: 1 },
  { $set: { "address.city": "New York" } }
)

// Set array element
db.users.updateOne(
  { _id: 1 },
  { $set: { "hobbies.0": "reading" } }
)
```

**$unset** - Removes field
```javascript
// Remove single field
db.users.updateOne(
  { _id: 1 },
  { $unset: { tempField: "" } }
)
// Value doesn't matter, field is removed

// Remove multiple fields
db.users.updateOne(
  { _id: 1 },
  {
    $unset: {
      oldField1: "",
      oldField2: "",
      deprecated: ""
    }
  }
)

// Remove nested field
db.users.updateOne(
  { _id: 1 },
  { $unset: { "address.apartment": "" } }
)
```

**$inc** - Increment numeric value
```javascript
// Increment by 1
db.users.updateOne(
  { _id: 1 },
  { $inc: { loginCount: 1 } }
)

// Increment by specific value
db.products.updateOne(
  { _id: 1 },
  { $inc: { stock: 50 } }
)

// Decrement (negative increment)
db.products.updateOne(
  { _id: 1 },
  { $inc: { stock: -5 } }
)

// Increment multiple fields
db.users.updateOne(
  { _id: 1 },
  {
    $inc: {
      loginCount: 1,
      points: 10,
      level: 0.5
    }
  }
)

// If field doesn't exist, it's created with increment value
db.counters.updateOne(
  { _id: "pageViews" },
  { $inc: { count: 1 } },
  { upsert: true }
)
```

**$mul** - Multiply field value
```javascript
// Double the price
db.products.updateOne(
  { _id: 1 },
  { $mul: { price: 2 } }
)

// Apply discount (multiply by 0.9 for 10% off)
db.products.updateMany(
  { category: "Sale" },
  { $mul: { price: 0.9 } }
)

// Multiply by 0 to zero out
db.users.updateOne(
  { _id: 1 },
  { $mul: { points: 0 } }
)

// If field doesn't exist, sets to 0
```

**$min** - Update only if new value is less
```javascript
// Update to lower price if found
db.products.updateOne(
  { _id: 1 },
  { $min: { price: 99.99 } }
)
// Only updates if current price > 99.99

// Track minimum score
db.stats.updateOne(
  { userId: 1 },
  { $min: { lowestScore: 75 } }
)

// With dates (earlier date)
db.users.updateOne(
  { _id: 1 },
  { $min: { firstLoginDate: new Date() } }
)
```

**$max** - Update only if new value is greater
```javascript
// Update to higher price
db.products.updateOne(
  { _id: 1 },
  { $max: { price: 199.99 } }
)
// Only updates if current price < 199.99

// Track maximum score
db.stats.updateOne(
  { userId: 1 },
  { $max: { highestScore: 95 } }
)

// With dates (later date)
db.users.updateOne(
  { _id: 1 },
  { $max: { lastLoginDate: new Date() } }
)
```

**$rename** - Rename field
```javascript
// Rename single field
db.users.updateMany(
  {},
  { $rename: { "oldName": "newName" } }
)

// Rename multiple fields
db.users.updateMany(
  {},
  {
    $rename: {
      "addr": "address",
      "ph": "phone"
    }
  }
)

// Rename nested field
db.users.updateOne(
  { _id: 1 },
  { $rename: { "address.zip": "address.zipCode" } }
)
```

**$currentDate** - Set to current date
```javascript
// Set to current date
db.users.updateOne(
  { _id: 1 },
  { $currentDate: { lastModified: true } }
)

// Set as Date type
db.users.updateOne(
  { _id: 1 },
  {
    $currentDate: {
      lastModified: { $type: "date" }
    }
  }
)

// Set as Timestamp type
db.users.updateOne(
  { _id: 1 },
  {
    $currentDate: {
      lastModified: { $type: "timestamp" }
    }
  }
)

// Multiple date fields
db.orders.updateOne(
  { _id: 1 },
  {
    $currentDate: {
      updatedAt: true,
      processedAt: true
    }
  }
)
```

#### 6.2 Array Update Operators

**$push** - Add element to array
```javascript
// Add single element
db.users.updateOne(
  { _id: 1 },
  { $push: { hobbies: "painting" } }
)

// Add multiple elements
db.users.updateOne(
  { _id: 1 },
  {
    $push: {
      hobbies: {
        $each: ["painting", "photography", "cooking"]
      }
    }
  }
)

// Add with position
db.users.updateOne(
  { _id: 1 },
  {
    $push: {
      hobbies: {
        $each: ["swimming"],
        $position: 0  // Add at beginning
      }
    }
  }
)

// Add with sort
db.students.updateOne(
  { _id: 1 },
  {
    $push: {
      scores: {
        $each: [85, 92],
        $sort: -1  // Sort descending
      }
    }
  }
)

// Add with limit (keep last 5)
db.logs.updateOne(
  { _id: 1 },
  {
    $push: {
      messages: {
        $each: ["New log entry"],
        $slice: -5  // Keep last 5 elements
      }
    }
  }
)

// Add with sort and limit
db.leaderboard.updateOne(
  { _id: 1 },
  {
    $push: {
      topScores: {
        $each: [{ player: "Alice", score: 95 }],
        $sort: { score: -1 },
        $slice: 10  // Keep top 10 scores
      }
    }
  }
)
```

**$pop** - Remove first or last array element
```javascript
// Remove last element
db.users.updateOne(
  { _id: 1 },
  { $pop: { hobbies: 1 } }
)

// Remove first element
db.users.updateOne(
  { _id: 1 },
  { $pop: { hobbies: -1 } }
)

// Remove from multiple arrays
db.users.updateOne(
  { _id: 1 },
  {
    $pop: {
      recentOrders: 1,
      notifications: -1
    }
  }
)
```

**$pull** - Remove all matching elements
```javascript
// Remove specific value
db.users.updateOne(
  { _id: 1 },
  { $pull: { hobbies: "gaming" } }
)

// Remove with condition
db.students.updateOne(
  { _id: 1 },
  { $pull: { scores: { $lt: 60 } } }
)

// Remove from embedded documents
db.orders.updateOne(
  { _id: 1 },
  {
    $pull: {
      items: { productId: 123 }
    }
  }
)

// Remove multiple matching
db.users.updateOne(
  { _id: 1 },
  {
    $pull: {
      tags: { $in: ["outdated", "deprecated"] }
    }
  }
)
```

**$pullAll** - Remove all specified values
```javascript
// Remove multiple specific values
db.users.updateOne(
  { _id: 1 },
  { $pullAll: { hobbies: ["gaming", "reading", "cooking"] } }
)

// Remove numbers
db.numbers.updateOne(
  { _id: 1 },
  { $pullAll: { values: [1, 3, 5, 7] } }
)
```

**$addToSet** - Add element only if doesn't exist
```javascript
// Add if not present
db.users.updateOne(
  { _id: 1 },
  { $addToSet: { hobbies: "painting" } }
)
// Won't add duplicate if "painting" already exists

// Add multiple unique elements
db.users.updateOne(
  { _id: 1 },
  {
    $addToSet: {
      hobbies: {
        $each: ["painting", "drawing", "sculpting"]
      }
    }
  }
)
// Only adds elements that don't already exist

// Add to multiple fields
db.products.updateOne(
  { _id: 1 },
  {
    $addToSet: {
      tags: "featured",
      categories: "electronics"
    }
  }
)
```

**$** - Positional operator (update first matching element)
```javascript
// Update first matching array element
db.students.updateOne(
  { _id: 1, "scores.subject": "math" },
  { $set: { "scores.$.grade": 95 } }
)

// Increment matched element
db.orders.updateOne(
  { _id: 1, "items.productId": 123 },
  { $inc: { "items.$.quantity": 1 } }
)

// Update nested field in matched element
db.users.updateOne(
  { _id: 1, "addresses.type": "home" },
  { $set: { "addresses.$.verified": true } }
)
```

**$[]** - All positional operator (update all elements)
```javascript
// Update all array elements
db.students.updateOne(
  { _id: 1 },
  { $inc: { "scores.$[].attempts": 1 } }
)

// Set field in all embedded documents
db.orders.updateOne(
  { _id: 1 },
  { $set: { "items.$[].status": "pending" } }
)
```

**$[identifier]** - Filtered positional (update matching elements)
```javascript
// Update elements matching condition
db.students.updateOne(
  { _id: 1 },
  { $set: { "scores.$[elem].grade": "A" } },
  {
    arrayFilters: [{ "elem.score": { $gte: 90 } }]
  }
)

// Multiple conditions
db.orders.updateOne(
  { _id: 1 },
  {
    $set: {
      "items.$[item].discount": 10,
      "items.$[item].discountedPrice": true
    }
  },
  {
    arrayFilters: [
      { "item.price": { $gte: 100 } },
      { "item.category": "Electronics" }
    ]
  }
)

// Nested arrays
db.surveys.updateOne(
  { _id: 1 },
  { $set: { "questions.$[q].answers.$[a].verified": true } },
  {
    arrayFilters: [
      { "q.type": "multiple-choice" },
      { "a.correct": true }
    ]
  }
)
```

---

## 7. Advanced Queries {#advanced-queries}

### Projection

**Definition**: Projection determines which fields are returned in the query results.

```javascript
// Include specific fields (1 = include)
db.users.find(
  {},
  { name: 1, email: 1, age: 1 }
)
// Returns: _id, name, email, age (_id included by default)

// Exclude _id
db.users.find(
  {},
  { name: 1, email: 1, _id: 0 }
)
// Returns: only name and email

// Exclude specific fields (0 = exclude)
db.users.find(
  {},
  { password: 0, securityQuestion: 0 }
)
// Returns: all fields except password and securityQuestion

// Nested field projection
db.users.find(
  {},
  { name: 1, "address.city": 1, "address.country": 1 }
)

// Array element projection
db.users.find(
  {},
  { name: 1, hobbies: { $slice: 3 } }  // First 3 hobbies
)

// Skip and limit array elements
db.users.find(
  {},
  { name: 1, hobbies: { $slice: [2, 5] } }  // Skip 2, return 5
)

// Array element match
db.students.find(
  { "scores.type": "exam" },
  {
    name: 1,
    scores: { $elemMatch: { type: "exam" } }
  }
)
// Returns only matching array elements

// Positional operator in projection
db.students.find(
  { "scores.type": "exam", "scores.score": { $gte: 90 } },
  { "scores.$": 1 }
)
// Returns first matching array element
```

### Cursor Methods (Advanced)

```javascript
// pretty() - Format output (shell only)
db.users.find().pretty()

// explain() - Query execution plan
db.users.find({ age: { $gte: 25 } }).explain("executionStats")

// forEach() - Iterate cursor
db.users.find().forEach(function(doc) {
  print("Name: " + doc.name);
})

// map() - Transform results
db.users.find().map(function(doc) {
  return { name: doc.name, email: doc.email };
})

// toArray() - Convert to array
const usersArray = db.users.find().toArray()

// hasNext() and next() - Manual iteration
const cursor = db.users.find();
while (cursor.hasNext()) {
  const doc = cursor.next();
  printjson(doc);
}

// batchSize() - Control batch size
db.users.find().batchSize(100)

// noCursorTimeout() - Prevent cursor timeout
db.users.find().noCursorTimeout()

// allowDiskUse() - Allow using disk for sorting
db.users.find().sort({ name: 1 }).allowDiskUse()

// hint() - Force index usage
db.users.find({ age: { $gte: 25 } }).hint({ age: 1 })

// readPref() - Set read preference
db.users.find().readPref("secondary")

// maxTimeMS() - Set query timeout
db.users.find().maxTimeMS(5000)  // 5 seconds

// collation() - Specify collation
db.users.find().collation({ locale: "en", strength: 2 })
```

---

## 8. MongoDB Aggregation Framework {#aggregation}

**Definition**: The aggregation framework provides a way to process data records and return computed results. It's MongoDB's equivalent to SQL's GROUP BY.

### Basic Aggregation

```javascript
// Basic aggregation pipeline
db.collection.aggregate([
  { $stage1 },
  { $stage2 },
  { $stage3 }
])

// Simple example
db.orders.aggregate([
  { $match: { status: "completed" } },
  { $group: { _id: "$customerId", total: { $sum: "$amount" } } }
])
```

### 8.1 Aggregation Pipeline Stages

#### $match

**Definition**: Filters documents (like WHERE in SQL).

```javascript
// Basic match
db.orders.aggregate([
  { $match: { status: "completed" } }
])

// Match with multiple conditions
db.orders.aggregate([
  {
    $match: {
      status: "completed",
      total: { $gte: 100 },
      orderDate: { $gte: ISODate("2024-01-01") }
    }
  }
])

// Match with operators
db.products.aggregate([
  {
    $match: {
      $or: [
        { category: "Electronics" },
        { price: { $lt: 50 } }
      ]
    }
  }
])

// Best practice: Place $match early in pipeline
db.orders.aggregate([
  { $match: { status: "completed" } },  // Filter first
  { $group: { _id: "$customerId", count: { $sum: 1 } } }
])
```

#### $group

**Definition**: Groups documents by a specified expression and outputs one document per group.

```javascript
// Group by single field
db.orders.aggregate([
  {
    $group: {
      _id: "$customerId",
      totalAmount: { $sum: "$amount" },
      orderCount: { $sum: 1 }
    }
  }
])

// Group by multiple fields
db.orders.aggregate([
  {
    $group: {
      _id: {
        customer: "$customerId",
        status: "$status"
      },
      count: { $sum: 1 }
    }
  }
])

// Group all documents (no grouping)
db.orders.aggregate([
  {
    $group: {
      _id: null,
      totalRevenue: { $sum: "$amount" },
      avgOrder: { $avg: "$amount" },
      maxOrder: { $max: "$amount" },
      minOrder: { $min: "$amount" }
    }
  }
])

// Accumulator operators
db.sales.aggregate([
  {
    $group: {
      _id: "$product",
      totalQty: { $sum: "$quantity" },
      avgPrice: { $avg: "$price" },
      maxPrice: { $max: "$price" },
      minPrice: { $min: "$price" },
      firstSale: { $first: "$date" },
      lastSale: { $last: "$date" },
      allPrices: { $push: "$price" },
      uniquePrices: { $addToSet: "$price" }
    }
  }
])

// Complex grouping
db.orders.aggregate([
  {
    $group: {
      _id: {
        year: { $year: "$orderDate" },
        month: { $month: "$orderDate" }
      },
      revenue: { $sum: "$total" },
      orders: { $sum: 1 },
      customers: { $addToSet: "$customerId" }
    }
  }
])
```

#### $project

**Definition**: Reshapes documents by including, excluding, or adding new fields.

```javascript
// Include specific fields
db.users.aggregate([
  {
    $project: {
      name: 1,
      email: 1,
      age: 1
    }
  }
])

// Exclude fields
db.users.aggregate([
  {
    $project: {
      password: 0,
      securityAnswer: 0
    }
  }
])

// Rename fields
db.users.aggregate([
  {
    $project: {
      fullName: "$name",
      emailAddress: "$email",
      userAge: "$age"
    }
  }
])

// Computed fields
db.orders.aggregate([
  {
    $project: {
      orderNumber: 1,
      total: 1,
      tax: { $multiply: ["$total", 0.1] },
      grandTotal: {
        $add: ["$total", { $multiply: ["$total", 0.1] }]
      }
    }
  }
])

// String operations
db.users.aggregate([
  {
    $project: {
      name: 1,
      email: 1,
      initials: {
        $concat: [
          { $substr: ["$firstName", 0, 1] },
          { $substr: ["$lastName", 0, 1] }
        ]
      },
      uppercase: { $toUpper: "$name" },
      lowercase: { $toLower: "$email" }
    }
  }
])

// Conditional projection
db.orders.aggregate([
  {
    $project: {
      orderNumber: 1,
      total: 1,
      category: {
        $cond: {
          if: { $gte: ["$total", 1000] },
          then: "High Value",
          else: "Standard"
        }
      }
    }
  }
])

// Array operations
db.users.aggregate([
  {
    $project: {
      name: 1,
      hobbyCount: { $size: "$hobbies" },
      firstHobby: { $arrayElemAt: ["$hobbies", 0] },
      hasHobbies: { $gt: [{ $size: "$hobbies" }, 0] }
    }
  }
])

// Date operations
db.orders.aggregate([
  {
    $project: {
      orderNumber: 1,
      year: { $year: "$orderDate" },
      month: { $month: "$orderDate" },
      day: { $dayOfMonth: "$orderDate" },
      dayOfWeek: { $dayOfWeek: "$orderDate" }
    }
  }
])
```

#### $sort

**Definition**: Sorts documents by specified fields.

```javascript
// Sort ascending
db.users.aggregate([
  { $sort: { age: 1 } }
])

// Sort descending
db.users.aggregate([
  { $sort: { age: -1 } }
])

// Multiple sort fields
db.users.aggregate([
  { $sort: { age: -1, name: 1 } }
])

// Sort after grouping
db.orders.aggregate([
  {
    $group: {
      _id: "$customerId",
      totalSpent: { $sum: "$amount" }
    }
  },
  { $sort: { totalSpent: -1 } }
])

// Memory limit: Use indexes or allowDiskUse
db.orders.aggregate(
  [
    { $sort: { orderDate: -1 } }
  ],
  { allowDiskUse: true }
)
```

#### $limit

**Definition**: Limits the number of documents passed to the next stage.

```javascript
// Get first 10 documents
db.users.aggregate([
  { $limit: 10 }
])

// Top 5 customers by spending
db.orders.aggregate([
  {
    $group: {
      _id: "$customerId",
      totalSpent: { $sum: "$amount" }
    }
  },
  { $sort: { totalSpent: -1 } },
  { $limit: 5 }
])
```

#### $skip

**Definition**: Skips a specified number of documents.

```javascript
// Skip first 10 documents
db.users.aggregate([
  { $skip: 10 }
])

// Pagination: Page 2, 10 per page
db.users.aggregate([
  { $skip: 10 },
  { $limit: 10 }
])

// Skip and limit with sort
db.products.aggregate([
  { $sort: { price: -1 } },
  { $skip: 20 },
  { $limit: 10 }
])
```

#### $unwind

**Definition**: Deconstructs an array field, creating one document per array element.

```javascript
// Unwind array
db.users.aggregate([
  { $unwind: "$hobbies" }
])
// Input: { _id: 1, name: "John", hobbies: ["reading", "gaming"] }
// Output:
// { _id: 1, name: "John", hobbies: "reading" }
// { _id: 1, name: "John", hobbies: "gaming" }

// Unwind with options
db.users.aggregate([
  {
    $unwind: {
      path: "$hobbies",
      includeArrayIndex: "hobbyIndex",
      preserveNullAndEmptyArrays: true
    }
  }
])

// Unwind nested arrays
db.orders.aggregate([
  { $unwind: "$items" },
  { $unwind: "$items.options" }
])

// Common use case: Array analysis
db.orders.aggregate([
  { $unwind: "$items" },
  {
    $group: {
      _id: "$items.product",
      totalSold: { $sum: "$items.quantity" },
      revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } }
    }
  },
  { $sort: { totalSold: -1 } }
])
```

#### $lookup

**Definition**: Performs a left outer join with another collection.

```javascript
// Basic lookup
db.orders.aggregate([
  {
    $lookup: {
      from: "customers",
      localField: "customerId",
      foreignField: "_id",
      as: "customerInfo"
    }
  }
])

// Lookup with unwind
db.orders.aggregate([
  {
    $lookup: {
      from: "customers",
      localField: "customerId",
      foreignField: "_id",
      as: "customerInfo"
    }
  },
  { $unwind: "$customerInfo" }
])

// Pipeline lookup (more powerful)
db.orders.aggregate([
  {
    $lookup: {
      from: "products",
      let: { orderItems: "$items" },
      pipeline: [
        {
          $match: {
            $expr: {
              $in: ["$_id", "$orderItems.productId"]
            }
          }
        },
        { $project: { name: 1, price: 1 } }
      ],
      as: "productDetails"
    }
  }
])

// Multiple lookups
db.orders.aggregate([
  {
    $lookup: {
      from: "customers",
      localField: "customerId",
      foreignField: "_id",
      as: "customer"
    }
  },
  {
    $lookup: {
      from: "products",
      localField: "productId",
      foreignField: "_id",
      as: "product"
    }
  }
])

// Nested lookup
db.orders.aggregate([
  {
    $lookup: {
      from: "customers",
      localField: "customerId",
      foreignField: "_id",
      as: "customer"
    }
  },
  { $unwind: "$customer" },
  {
    $lookup: {
      from: "addresses",
      localField: "customer.addressId",
      foreignField: "_id",
      as: "customer.address"
    }
  }
])
```

#### $addFields / $set

**Definition**: Adds new fields to documents.

```javascript
// Add computed field
db.orders.aggregate([
  {
    $addFields: {
      totalWithTax: {
        $multiply: ["$total", 1.1]
      }
    }
  }
])

// Add multiple fields
db.users.aggregate([
  {
    $addFields: {
      fullName: { $concat: ["$firstName", " ", "$lastName"] },
      age: {
        $divide: [
          { $subtract: [new Date(), "$birthDate"] },
          365 * 24 * 60 * 60 * 1000
        ]
      },
      isAdult: { $gte: ["$age", 18] }
    }
  }
])

// $set is alias for $addFields
db.products.aggregate([
  {
    $set: {
      discountPrice: { $multiply: ["$price", 0.9] }
    }
  }
])
```

#### $replaceRoot / $replaceWith

**Definition**: Replaces the document with specified embedded document.

```javascript
// Replace with nested document
db.users.aggregate([
  { $replaceRoot: { newRoot: "$address" } }
])

// Replace with computed document
db.orders.aggregate([
  {
    $replaceRoot: {
      newRoot: {
        orderId: "$_id",
        total: "$total",
        customer: "$customerInfo.name"
      }
    }
  }
])

// $replaceWith is simpler syntax
db.users.aggregate([
  { $replaceWith: "$contact" }
])
```

#### $count

**Definition**: Counts the number of documents.

```javascript
// Count documents
db.orders.aggregate([
  { $match: { status: "completed" } },
  { $count: "completedOrders" }
])
// Output: { completedOrders: 150 }

// Count after grouping
db.orders.aggregate([
  { $group: { _id: "$customerId" } },
  { $count: "uniqueCustomers" }
])
```

#### $out

**Definition**: Writes the aggregation pipeline results to a new collection.

```javascript
// Write to new collection
db.orders.aggregate([
  { $match: { status: "completed" } },
  {
    $group: {
      _id: "$customerId",
      totalSpent: { $sum: "$amount" }
    }
  },
  { $out: "customerStats" }
])

// Replace existing collection
db.sales.aggregate([
  {
    $group: {
      _id: { year: { $year: "$date" }, month: { $month: "$date" } },
      revenue: { $sum: "$amount" }
    }
  },
  { $out: "monthlySales" }  // Replaces collection if exists
])

// $out must be last stage
// Cannot output to capped collections
// Cannot output to sharded collections
```

#### $merge

**Definition**: Writes aggregation results to a collection (more flexible than $out).

```javascript
// Basic merge
db.orders.aggregate([
  {
    $group: {
      _id: "$customerId",
      totalSpent: { $sum: "$amount" }
    }
  },
  {
    $merge: {
      into: "customerStats",
      whenMatched: "replace",
      whenNotMatched: "insert"
    }
  }
])

// Merge options
db.sales.aggregate([
  {
    $group: {
      _id: "$productId",
      totalSold: { $sum: "$quantity" }
    }
  },
  {
    $merge: {
      into: "productStats",
      on: "_id",
      whenMatched: "merge",      // Merge fields
      whenNotMatched: "insert"
    }
  }
])

// Merge to different database
db.orders.aggregate([
  { $match: { status: "completed" } },
  {
    $merge: {
      into: { db: "analytics", coll: "completedOrders" },
      whenMatched: "replace",
      whenNotMatched: "insert"
    }
  }
])

// Update with pipeline
db.inventory.aggregate([
  {
    $group: {
      _id: "$productId",
      totalStock: { $sum: "$quantity" }
    }
  },
  {
    $merge: {
      into: "products",
      on: "_id",
      whenMatched: [
        { $set: { stock: "$totalStock", updatedAt: "$NOW" } }
      ],
      whenNotMatched: "discard"
    }
  }
])
```

#### $bucket

**Definition**: Categorizes documents into groups (buckets) based on a specified expression and boundaries.

```javascript
// Age groups
db.users.aggregate([
  {
    $bucket: {
      groupBy: "$age",
      boundaries: [0, 18, 30, 50, 100],
      default: "Other",
      output: {
        count: { $sum: 1 },
        users: { $push: "$name" }
      }
    }
  }
])
// Output:
// { _id: 0, count: 5, users: [...] }    // 0-17
// { _id: 18, count: 20, users: [...] }  // 18-29
// { _id: 30, count: 15, users: [...] }  // 30-49
// { _id: 50, count: 8, users: [...] }   // 50-99

// Price ranges
db.products.aggregate([
  {
    $bucket: {
      groupBy: "$price",
      boundaries: [0, 50, 100, 500, 1000],
      default: "Premium",
      output: {
        count: { $sum: 1 },
        avgPrice: { $avg: "$price" },
        products: { $push: "$name" }
      }
    }
  }
])
```

#### $bucketAuto

**Definition**: Automatically determines bucket boundaries.

```javascript
// Auto-create 5 buckets
db.products.aggregate([
  {
    $bucketAuto: {
      groupBy: "$price",
      buckets: 5,
      output: {
        count: { $sum: 1 },
        avgPrice: { $avg: "$price" }
      }
    }
  }
])

// With granularity
db.orders.aggregate([
  {
    $bucketAuto: {
      groupBy: "$total",
      buckets: 4,
      granularity: "POWERSOF2"  // R5, R10, R20, R40, R80, 1-2-5, POWERSOF2
    }
  }
])
```

#### $facet

**Definition**: Processes multiple aggregation pipelines within a single stage.

```javascript
// Multiple aggregations at once

db.products.aggregate([
  {
    $facet: {
      // Price statistics
      priceStats: [
        {
          $group: {
            _id: null,
            avgPrice: { $avg: "$price" },
            minPrice: { $min: "$price" },
            maxPrice: { $max: "$price" }
          }
        }
      ],
      
      // Category breakdown
      byCategory: [
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ],
      
      // Top products
      topProducts: [
        { $sort: { sales: -1 } },
        { $limit: 5 },
        { $project: { name: 1, sales: 1 } }
      ]
    }
  }
])

// Output:
// {
//   priceStats: [ { _id: null, avgPrice: 250, minPrice: 10, maxPrice: 1000 } ],
//   byCategory: [ { _id: "Electronics", count: 50 }, ... ],
//   topProducts: [ { name: "Product 1", sales: 1000 }, ... ]
// }
```

#### $graphLookup

**Definition**: Performs recursive search on a collection (for hierarchical data).

```javascript
// Organizational hierarchy
db.employees.aggregate([
  {
    $graphLookup: {
      from: "employees",
      startWith: "$reportsTo",
      connectFromField: "reportsTo",
      connectToField: "_id",
      as: "reportingHierarchy",
      maxDepth: 3
    }
  }
])

// Category hierarchy
db.categories.aggregate([
  {
    $graphLookup: {
      from: "categories",
      startWith: "$parentId",
      connectFromField: "parentId",
      connectToField: "_id",
      as: "ancestors",
      depthField: "level"
    }
  }
])

// Social network (friends of friends)
db.users.aggregate([
  {
    $match: { _id: "user123" }
  },
  {
    $graphLookup: {
      from: "users",
      startWith: "$friends",
      connectFromField: "friends",
      connectToField: "_id",
      as: "network",
      maxDepth: 2,
      restrictSearchWithMatch: { active: true }
    }
  }
])
```

#### $redact

**Definition**: Restricts the contents of documents based on document content.

```javascript
// Redact sensitive fields
db.users.aggregate([
  {
    $redact: {
      $cond: {
        if: { $eq: ["$level", "public"] },
        then: "$DESCEND",  // Include field and continue
        else: "$PRUNE"     // Exclude field and stop
      }
    }
  }
])

// Multi-level redaction
db.documents.aggregate([
  {
    $redact: {
      $cond: {
        if: { $in: ["$clearanceLevel", [3, 4, 5]] },
        then: "$DESCEND",
        else: "$REDACT"  // Redact at this level but continue
      }
    }
  }
])
```

### 8.2 Aggregation Pipeline Optimization

```javascript
// 1. Place $match early
// Good
db.orders.aggregate([
  { $match: { status: "completed" } },
  { $group: { _id: "$customerId", total: { $sum: "$amount" } } }
])

// Bad
db.orders.aggregate([
  { $group: { _id: "$customerId", total: { $sum: "$amount" } } },
  { $match: { total: { $gte: 1000 } } }
])

// 2. Place $project/$unset early to reduce document size
db.orders.aggregate([
  { $project: { customerId: 1, amount: 1, status: 1 } },  // Reduce size
  { $match: { status: "completed" } },
  { $group: { _id: "$customerId", total: { $sum: "$amount" } } }
])

// 3. Use indexes
// $match and $sort can use indexes if they're early in pipeline
db.orders.aggregate([
  { $match: { orderDate: { $gte: ISODate("2024-01-01") } } },  // Can use index
  { $sort: { orderDate: -1 } }  // Can use index
])

// 4. Avoid unnecessary stages
// Don't use $project just to exclude _id (use projection option instead)

// 5. Use $limit after $sort
db.products.aggregate([
  { $sort: { price: -1 } },
  { $limit: 10 }  // MongoDB can optimize this
])

// 6. Use allowDiskUse for large datasets
db.orders.aggregate(
  [
    { $group: { _id: "$customerId", total: { $sum: "$amount" } } },
    { $sort: { total: -1 } }
  ],
  { allowDiskUse: true }
)
```

### 8.3 Aggregation Pipeline Limits

```javascript
// 1. Result size limit: 16MB per document
// Solution: Use $limit or $project to reduce size

// 2. Memory limit: 100MB per stage
// Solution: Use allowDiskUse
db.collection.aggregate(
  [/* pipeline */],
  { allowDiskUse: true }
)

// 3. Pipeline stage limit: 1000 stages (rarely hit)

// 4. $graphLookup depth: Default unlimited (can cause performance issues)
// Solution: Set maxDepth
db.employees.aggregate([
  {
    $graphLookup: {
      from: "employees",
      startWith: "$reportsTo",
      connectFromField: "reportsTo",
      connectToField: "_id",
      as: "hierarchy",
      maxDepth: 5  // Limit recursion
    }
  }
])
```

### 8.4 Map-Reduce (Legacy)

**Definition**: Legacy data aggregation method (superseded by aggregation pipeline).

```javascript
// Map-Reduce example
db.orders.mapReduce(
  // Map function
  function() {
    emit(this.customerId, this.amount);
  },
  
  // Reduce function
  function(key, values) {
    return Array.sum(values);
  },
  
  // Options
  {
    query: { status: "completed" },
    out: "customerTotals"
  }
)

// Modern equivalent (aggregation pipeline)
db.orders.aggregate([
  { $match: { status: "completed" } },
  {
    $group: {
      _id: "$customerId",
      total: { $sum: "$amount" }
    }
  },
  { $out: "customerTotals" }
])

// Note: Aggregation pipeline is preferred over map-reduce
```

---

## 9. Indexing {#indexing}

**Definition**: Indexes support efficient execution of queries. Without indexes, MongoDB must scan every document (collection scan).

### 9.1 Create Index

```javascript
// Single field index (ascending)
db.users.createIndex({ email: 1 })

// Single field index (descending)
db.users.createIndex({ age: -1 })

// Compound index
db.users.createIndex({ lastName: 1, firstName: 1 })

// Unique index
db.users.createIndex({ email: 1 }, { unique: true })

// Sparse index (only indexes documents with the field)
db.users.createIndex({ phone: 1 }, { sparse: true })

// TTL index (automatically delete documents)
db.sessions.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 3600 }  // Delete after 1 hour
)

// Partial index (index subset of documents)
db.orders.createIndex(
  { customerId: 1, orderDate: -1 },
  {
    partialFilterExpression: {
      status: { $in: ["pending", "processing"] }
    }
  }
)

// Background index creation
db.users.createIndex({ name: 1 }, { background: true })

// Case-insensitive index
db.users.createIndex(
  { email: 1 },
  {
    collation: {
      locale: "en",
      strength: 2  // Case-insensitive
    }
  }
)
```

### 9.2 Get Indexes

```javascript
// List all indexes
db.users.getIndexes()

// Output:
[
  { v: 2, key: { _id: 1 }, name: "_id_" },
  { v: 2, key: { email: 1 }, name: "email_1", unique: true },
  { v: 2, key: { lastName: 1, firstName: 1 }, name: "lastName_1_firstName_1" }
]

// Get index names only
db.users.getIndexKeys()

// Get index specifications
db.users.getIndexSpecs()
```

### 9.3 Drop Index

```javascript
// Drop by name
db.users.dropIndex("email_1")

// Drop by specification
db.users.dropIndex({ email: 1 })

// Drop all indexes except _id
db.users.dropIndexes()

// Drop multiple specific indexes
db.users.dropIndexes(["email_1", "age_-1"])
```

### 9.4 Index Types

#### Single Field Indexes

**Definition**: Index on a single field.

```javascript
// Create single field index
db.users.createIndex({ email: 1 })

// Supports queries like:
db.users.find({ email: "user@example.com" })
db.users.find({ email: { $in: ["a@ex.com", "b@ex.com"] } })

// Supports sorting
db.users.find().sort({ email: 1 })
```

#### Compound Indexes

**Definition**: Index on multiple fields.

```javascript
// Create compound index
db.users.createIndex({ lastName: 1, firstName: 1, age: -1 })

// Index prefixes (can use for queries)
// Supports queries on:
// - { lastName: 1 }
// - { lastName: 1, firstName: 1 }
// - { lastName: 1, firstName: 1, age: -1 }

// Does NOT support:
// - { firstName: 1 }
// - { age: -1 }

// Query examples that use this index
db.users.find({ lastName: "Smith" })
db.users.find({ lastName: "Smith", firstName: "John" })
db.users.find({ lastName: "Smith", firstName: "John", age: { $gte: 25 } })

// Sort optimization
db.users.find({ lastName: "Smith" }).sort({ firstName: 1, age: -1 })

// Index order matters for sorting
// Good: Uses index
db.users.find().sort({ lastName: 1, firstName: 1 })

// Bad: Cannot use index (reverse order)
db.users.find().sort({ lastName: -1, firstName: 1 })
```

#### Multikey Indexes

**Definition**: Indexes on array fields. MongoDB creates separate index entries for each element.

```javascript
// Create multikey index
db.users.createIndex({ hobbies: 1 })

// Automatically detects arrays
db.users.insertOne({
  name: "Alice",
  hobbies: ["reading", "gaming", "hiking"]
})
// Creates 3 index entries: "reading", "gaming", "hiking"

// Query examples
db.users.find({ hobbies: "reading" })
db.users.find({ hobbies: { $in: ["reading", "gaming"] } })

// Compound multikey index
db.products.createIndex({ category: 1, tags: 1 })

// Limitation: Cannot have more than one array field in compound index
// This will fail:
db.collection.createIndex({ array1: 1, array2: 1 })  // Error!

// Nested array indexing
db.users.createIndex({ "addresses.city": 1 })

// Query nested arrays
db.users.find({ "addresses.city": "New York" })
```

#### Text Indexes

**Definition**: Supports text search queries on string content.

```javascript
// Create text index on single field
db.articles.createIndex({ content: "text" })

// Create text index on multiple fields
db.articles.createIndex({
  title: "text",
  content: "text",
  tags: "text"
})

// Text index with weights (importance)
db.articles.createIndex(
  {
    title: "text",
    content: "text"
  },
  {
    weights: {
      title: 10,    // Title is 10x more important
      content: 5
    },
    name: "ArticleTextIndex"
  }
)

// Default language
db.articles.createIndex(
  { content: "text" },
  { default_language: "english" }
)

// Text search queries
db.articles.find({ $text: { $search: "mongodb tutorial" } })

// Phrase search
db.articles.find({ $text: { $search: "\"NoSQL database\"" } })

// Exclude words
db.articles.find({ $text: { $search: "mongodb -sql" } })

// Text score (relevance)
db.articles.find(
  { $text: { $search: "mongodb" } },
  { score: { $meta: "textScore" } }
).sort({ score: { $meta: "textScore" } })

// Language-specific search
db.articles.find({
  $text: {
    $search: "café",
    $language: "french"
  }
})

// Limitations:
// - Only one text index per collection
// - Text indexes are case-insensitive
// - Text indexes do not store stop words
```

#### Wildcard Indexes

**Definition**: Index on all fields or fields matching a pattern.

```javascript
// Index all fields
db.products.createIndex({ "$**": 1 })

// Index all fields under a path
db.products.createIndex({ "attributes.$**": 1 })

// Query any field
db.products.find({ "attributes.color": "red" })
db.products.find({ "attributes.size": "Large" })

// Include specific fields
db.products.createIndex(
  { "$**": 1 },
  {
    wildcardProjection: {
      "attributes.color": 1,
      "attributes.size": 1
    }
  }
)

// Exclude specific fields
db.products.createIndex(
  { "$**": 1 },
  {
    wildcardProjection: {
      "internal": 0,
      "debug": 0
    }
  }
)
```

#### Geospatial Indexes

**Definition**: Indexes for geospatial coordinate data.

**2dsphere Index** (for spherical geometry)
```javascript
// Create 2dsphere index
db.places.createIndex({ location: "2dsphere" })

// Insert GeoJSON data
db.places.insertOne({
  name: "Central Park",
  location: {
    type: "Point",
    coordinates: [-73.9654, 40.7829]  // [longitude, latitude]
  }
})

// Near query
db.places.find({
  location: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [-73.9665, 40.7831]
      },
      $maxDistance: 1000  // meters
    }
  }
})

// Within polygon
db.places.find({
  location: {
    $geoWithin: {
      $geometry: {
        type: "Polygon",
        coordinates: [[
          [-73.99, 40.75],
          [-73.98, 40.75],
          [-73.98, 40.76],
          [-73.99, 40.76],
          [-73.99, 40.75]
        ]]
      }
    }
  }
})

// Intersection query
db.places.find({
  location: {
    $geoIntersects: {
      $geometry: {
        type: "LineString",
        coordinates: [
          [-73.99, 40.75],
          [-73.98, 40.76]
        ]
      }
    }
  }
})
```

**2d Index** (for flat geometry)
```javascript
// Create 2d index
db.places.createIndex({ location: "2d" })

// Insert legacy coordinate pair
db.places.insertOne({
  name: "Store",
  location: [40.7829, -73.9654]  // [latitude, longitude]
})

// Near query
db.places.find({
  location: {
    $near: [40.7831, -73.9665],
    $maxDistance: 0.01
  }
})
```

#### Hashed Indexes

**Definition**: Index on hashed value of a field (useful for sharding).

```javascript
// Create hashed index
db.users.createIndex({ _id: "hashed" })

// Supports equality queries only
db.users.find({ _id: "user123" })

// Does NOT support:
// - Range queries
// - Sorting
// - Multikey (arrays)

// Use case: Shard key
sh.shardCollection("mydb.users", { _id: "hashed" })
```

### 9.5 Index Properties

```javascript
// Unique index
db.users.createIndex({ email: 1 }, { unique: true })

// Partial index
db.orders.createIndex(
  { customerId: 1 },
  {
    partialFilterExpression: {
      status: { $eq: "active" }
    }
  }
)

// Sparse index
db.users.createIndex(
  { phone: 1 },
  { sparse: true }
)

// TTL index
db.logs.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 86400 }  // 24 hours
)

// Hidden index (for testing)
db.users.createIndex(
  { email: 1 },
  { hidden: true }
)

// Unhide index
db.users.unhideIndex("email_1")

// Case-insensitive index
db.users.createIndex(
  { username: 1 },
  {
    collation: {
      locale: "en",
      strength: 1  // Primary level (case-insensitive)
    }
  }
)
```

### 9.6 Index Management

```javascript
// Rebuild indexes
db.users.reIndex()

// Get index stats
db.users.stats().indexSizes

// Explain query plan
db.users.find({ email: "user@example.com" }).explain("executionStats")

// Check if index is used
db.users.find({ email: "user@example.com" }).explain("executionStats").executionStats.totalDocsExamined
// If totalDocsExamined is low, index is being used

// Monitor index usage
db.users.aggregate([
  { $indexStats: {} }
])

// Index build progress
db.currentOp({
  $or: [
    { op: "command", "command.createIndexes": { $exists: true } },
    { op: "insert", ns: /\.system\.indexes\b/ }
  ]
})
```

---

## 10. Transactions {#transactions}

**Definition**: Transactions are logical groups of operations that execute atomically (all or nothing).

### 10.1 ACID Properties

- **Atomicity**: All operations succeed or all fail
- **Consistency**: Database remains in valid state
- **Isolation**: Concurrent transactions don't interfere
- **Durability**: Committed changes persist

### 10.2 Transaction Examples

```javascript
// Start a session
const session = db.getMongo().startSession()

// Start transaction
session.startTransaction()

try {
  const ordersCol = session.getDatabase("mydb").orders
  const inventoryCol = session.getDatabase("mydb").inventory
  
  // Operation 1: Create order
  ordersCol.insertOne(
    {
      orderId: 1001,
      customerId: "C123",
      items: [{ productId: "P456", quantity: 2 }],
      total: 200
    },
    { session }
  )
  
  // Operation 2: Update inventory
  inventoryCol.updateOne(
    { productId: "P456" },
    { $inc: { stock: -2 } },
    { session }
  )
  
  // Commit transaction
  session.commitTransaction()
  console.log("Transaction committed")
  
} catch (error) {
  // Abort transaction on error
  session.abortTransaction()
  console.error("Transaction aborted:", error)
  
} finally {
  session.endSession()
}

// Multi-document transaction
session.startTransaction({
  readConcern: { level: "snapshot" },
  writeConcern: { w: "majority" },
  readPreference: "primary"
})

try {
  db.accounts.updateOne(
    { accountId: "A123" },
    { $inc: { balance: -100 } },
    { session }
  )
  
  db.accounts.updateOne(
    { accountId: "B456" },
    { $inc: { balance: 100 } },
    { session }
  )
  
  session.commitTransaction()
} catch (error) {
  session.abortTransaction()
  throw error
} finally {
  session.endSession()
}
```

### 10.3 Transactions with Callback API

```javascript
// Using withTransaction (recommended)
const session = db.getMongo().startSession()

await session.withTransaction(async () => {
  const ordersCol = session.getDatabase("mydb").orders
  const inventoryCol = session.getDatabase("mydb").inventory
  
  await ordersCol.insertOne(
    { orderId: 1001, total: 200 },
    { session }
  )
  
  await inventoryCol.updateOne(
    { productId: "P456" },
    { $inc: { stock: -2 } },
    { session }
  )
})

session.endSession()
```

### 10.4 Transaction Limitations

```javascript
// Limitations:
// 1. Maximum transaction time: 60 seconds (default)
// 2. Maximum transaction size: 16MB
// 3. Cannot write to capped collections
// 4. Cannot read/write to system collections
// 5. Requires replica set or sharded cluster

// Set transaction options
session.startTransaction({
  maxCommitTimeMS: 30000,  // 30 seconds
  readConcern: { level: "snapshot" },
  writeConcern: { w: "majority", wtimeout: 5000 }
})
```

---

## 11. Data Modeling {#data-modeling}

### 11.1 MongoDB Relationships

**Types of Relationships:**
1. One-to-One (1:1)
2. One-to-Many (1:N)
3. Many-to-Many (M:N)

#### One-to-One Relationship

**Embedding** (Preferred for 1:1)
```javascript
// User with embedded address
{
  _id: ObjectId("..."),
  name: "John Doe",
  email: "john@example.com",
  address: {
    street: "123 Main St",
    city: "Boston",
    zipCode: "02101",
    country: "USA"
  }
}

// When to embed:
// - Data is always accessed together
// - Small subdocuments
// - Subdocument doesn't grow unbounded
```

**Referencing**
```javascript
// User collection
{
  _id: ObjectId("user123"),
  name: "John Doe",
  email: "john@example.com",
  addressId: ObjectId("addr456")
}

// Address collection
{
  _id: ObjectId("addr456"),
  street: "123 Main St",
  city: "Boston",
  zipCode: "02101"
}

// When to reference:
// - Data is rarely accessed together
// - Large subdocuments
// - Need to share data across documents
```

#### One-to-Many Relationship

**Embedding** (for "few")
```javascript
// Blog post with comments (if few comments)
{
  _id: ObjectId("..."),
  title: "MongoDB Guide",
  content: "...",
  comments: [
    {
      user: "Alice",
      text: "Great article!",
      date: ISODate("2024-01-15")
    },
    {
      user: "Bob",
      text: "Very helpful",
      date: ISODate("2024-01-16")
    }
  ]
}

// Good when:
// - Maximum ~100-200 subdocuments
// - Subdocuments accessed with parent
// - Subdocuments don't change often
```

**Referencing** (for "many")
```javascript
// User collection
{
  _id: ObjectId("user123"),
  name: "John Doe"
}

// Orders collection (many orders per user)
{
  _id: ObjectId("order1"),
  userId: ObjectId("user123"),
  total: 150,
  items: [...]
}

{
  _id: ObjectId("order2"),
  userId: ObjectId("user123"),
  total: 200,
  items: [...]
}

// Query orders for user
db.orders.find({ userId: ObjectId("user123") })

// Good when:
// - Many subdocuments
// - Subdocuments accessed independently
// - Subdocuments change frequently
```

**Parent Referencing** (store reference in child)
```javascript
// Category (parent)
{
  _id: ObjectId("cat123"),
  name: "Electronics"
}

// Products (children)
{
  _id: ObjectId("prod1"),
  name: "Laptop",
  categoryId: ObjectId("cat123")
}

{
  _id: ObjectId("prod2"),
  name: "Mouse",
  categoryId: ObjectId("cat123")
}
```

**Child Referencing** (store references in parent)
```javascript
// Category with product references
{
  _id: ObjectId("cat123"),
  name: "Electronics",
  products: [
    ObjectId("prod1"),
    ObjectId("prod2"),
    ObjectId("prod3")
  ]
}

// Use when:
// - Limited number of children
// - Need to access all children with parent
```

#### Many-to-Many Relationship

**Array of References** (Two-Way Referencing)
```javascript
// Students collection
{
  _id: ObjectId("student1"),
  name: "Alice",
  courses: [
    ObjectId("course1"),
    ObjectId("course2")
  ]
}

// Courses collection
{
  _id: ObjectId("course1"),
  title: "MongoDB 101",
  students: [
    ObjectId("student1"),
    ObjectId("student2")
  ]
}

// Find courses for student
db.courses.find({ _id: { $in: student.courses } })

// Find students in course
db.students.find({ _id: { $in: course.students } })
```

**Junction Collection** (like SQL join table)
```javascript
// Students collection
{
  _id: ObjectId("student1"),
  name: "Alice"
}

// Courses collection
{
  _id: ObjectId("course1"),
  title: "MongoDB 101"
}

// Enrollments collection (junction)
{
  _id: ObjectId("enroll1"),
  studentId: ObjectId("student1"),
  courseId: ObjectId("course1"),
  enrolledDate: ISODate("2024-01-15"),
  grade: "A"
}

// Query with aggregation
db.enrollments.aggregate([
  { $match: { studentId: ObjectId("student1") } },
  {
    $lookup: {
      from: "courses",
      localField: "courseId",
      foreignField: "_id",
      as: "courseInfo"
    }
  }
])

// Use junction when:
// - Need metadata about relationship
// - Relationship has its own properties
```

### 11.2 Embedding vs Referencing

**When to Embed:**
- Data is always accessed together
- One-to-one or one-to-few relationships
- Small subdocuments
- Data doesn't change often
- Need atomic updates

**When to Reference:**
- Data is large
- One-to-many or many-to-many
- Data accessed separately
- Data changes frequently
- Need to share data across documents
- Document size approaching 16MB limit

### 11.3 Schema Design Patterns

#### Attribute Pattern
```javascript
// Instead of:
{
  color: "blue",
  size: "Large",
  material: "Cotton"
}

// Use:
{
  attributes: [
    { key: "color", value: "blue" },
    { key: "size", value: "Large" },
    { key: "material", value: "Cotton" }
  ]
}

// Benefits:
// - Easy to add new attributes
// - Can index on attributes array
db.products.createIndex({ "attributes.key": 1, "attributes.value": 1 })
```

#### Bucket Pattern
```javascript
// IoT sensor data - instead of one document per reading
// Use bucket to group readings
{
  _id: ObjectId("..."),
  sensorId: "sensor123",
  date: ISODate("2024-01-15"),
  readings: [
    { timestamp: ISODate("2024-01-15T10:00:00Z"), temp: 72.5 },
    { timestamp: ISODate("2024-01-15T10:01:00Z"), temp: 72.7 },
    { timestamp: ISODate("2024-01-15T10:02:00Z"), temp: 72.6 }
    // ... up to 100-1000 readings per bucket
  ]
}

// Benefits:
// - Reduces number of documents
// - Better index efficiency
// - Improved query performance
```

#### Subset Pattern
```javascript
// Product with many reviews
{
  _id: ObjectId("prod123"),
  name: "Laptop",
  price: 999,
  recentReviews: [  // Embed recent 10 reviews
    { user: "Alice", rating: 5, text: "Great!" },
    { user: "Bob", rating: 4, text: "Good value" }
  ],
  reviewCount: 1247,
  avgRating: 4.5
}

// Full reviews in separate collection
// reviews collection
{
  _id: ObjectId("..."),
  productId: ObjectId("prod123"),
  user: "Charlie",
  rating: 5,
  text: "Excellent product",
  date: ISODate("2024-01-15")
}

// Benefits:
// - Keep frequently accessed data embedded
// - Full data available via reference
// - Prevents document size issues
```

#### Extended Reference Pattern
```javascript
// Order with customer info
{
  _id: ObjectId("order123"),
  customerId: ObjectId("cust456"),
  // Duplicate frequently accessed customer fields
  customerName: "John Doe",
  customerEmail: "john@example.com",
  items: [...],
  total: 250
}

// Full customer data in customers collection
{
  _id: ObjectId("cust456"),
  name: "John Doe",
  email: "john@example.com",
  address: {...},
  phone: "555-0123",
  // ... many more fields
}

// Benefits:
// - Avoid joins for common queries
// - Accept some data duplication
// - Update carefully to maintain consistency
```

### 11.4 JSON Schema Validation

**Definition**: Enforce document structure and data types.

```javascript
// Create collection with validation
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "email", "age"],
      properties: {
        name: {
          bsonType: "string",
          description: "must be a string and is required"
        },
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
          description: "must be a valid email address"
        },
        age: {
          bsonType: "int",
          minimum: 0,
          maximum: 120,
          description: "must be an integer between 0 and 120"
        },
        phone: {
          bsonType: "string",
          pattern: "^\\d{3}-\\d{3}-\\d{4}$"
        },
        address: {
          bsonType: "object",
          required: ["street", "city"],
          properties: {
            street: { bsonType: "string" },
            city: { bsonType: "string" },
            state: { bsonType: "string" },
            zipCode: {
              bsonType: "string",
              pattern: "^\\d{5}$"
            }
          }
        },
        hobbies: {
          bsonType: "array",
          items: {
            bsonType: "string"
          },
          maxItems: 10
        },
        status: {
          enum: ["active", "inactive", "suspended"],
          description: "must be one of the enum values"
        }
      }
    }
  },
  validationLevel: "strict",  // or "moderate"
  validationAction: "error"   // or "warn"
})

// Add validation to existing collection
db.runCommand({
  collMod: "users",
  validator: {
    $jsonSchema: {
      // schema here
    }
  }
})

// Validation levels:
// - strict: Apply to all inserts and updates
// - moderate: Apply to valid documents only

// Validation actions:
// - error: Reject invalid documents
// - warn: Log warning but allow operation
```

---

## 12. Replication and Sharding {#replication-sharding}

### 12.1 MongoDB Replication

**Definition**: Replication provides redundancy and high availability by maintaining multiple copies of data across servers.

**Replica Set Components:**
- **Primary**: Receives all write operations
- **Secondary**: Replicates primary's data
- **Arbiter**: Participates in elections (no data)

```javascript
// Initiate replica set
rs.initiate({
  _id: "myReplicaSet",
  members: [
    { _id: 0, host: "mongodb0.example.net:27017" },
    { _id: 1, host: "mongodb1.example.net:27017" },
    { _id: 2, host: "mongodb2.example.net:27017" }
  ]
})

// Check replica set status
rs.status()

// Add member to replica set
rs.add("mongodb3.example.net:27017")

// Remove member
rs.remove("mongodb3.example.net:27017")

// Add arbiter
rs.addArb("mongodb4.example.net:27017")

// Check replica set configuration
rs.conf()

// Reconfigure replica set
cfg = rs.conf()
cfg.members[0].priority = 2  // Higher priority for primary election
rs.reconfig(cfg)

// Step down primary (force election)
rs.stepDown(60)  // Step down for 60 seconds

// Check if current node is primary
db.isMaster()
```

**Read Preferences:**
```javascript
// Read from primary (default)
db.users.find().readPref("primary")

// Read from primary preferred
db.users.find().readPref("primaryPreferred")

// Read from secondary
db.users.find().readPref("secondary")

// Read from secondary preferred
db.users.find().readPref("secondaryPreferred")

// Read from nearest (lowest latency)
db.users.find().readPref("nearest")
```

**Write Concern:**
```javascript
// Write must be acknowledged by primary only (default)
db.users.insertOne(
  { name: "Alice" },
  { writeConcern: { w: 1 } }
)

// Write must be acknowledged by majority
db.users.insertOne(
  { name: "Bob" },
  { writeConcern: { w: "majority", wtimeout: 5000 } }
)

// Write to all members
db.users.insertOne(
  { name: "Charlie" },
  { writeConcern: { w: 3 } }  // 3 members
)

// Journaled write
db.users.insertOne(
  { name: "Diana" },
  { writeConcern: { w: 1, j: true } }
)
```

### 12.2 MongoDB Sharding

**Definition**: Sharding distributes data across multiple servers for horizontal scaling.

**Sharded Cluster Components:**
- **Shard**: Stores subset of data
- **Config Servers**: Store cluster metadata
- **Mongos**: Query router

```javascript
// Enable sharding on database
sh.enableSharding("myDatabase")

// Shard collection with hashed shard key
sh.shardCollection("myDatabase.users", { _id: "hashed" })

// Shard collection with ranged shard key
sh.shardCollection("myDatabase.orders", { customerId: 1, orderDate: 1 })

// Check sharding status
sh.status()

// Add shard
sh.addShard("shard1.example.net:27017")

// Remove shard
use admin
db.runCommand({ removeShard: "shard1" })

// Check shard distribution
db.users.getShardDistribution()

// Move chunk manually
sh.moveChunk(
  "myDatabase.users",
  { _id: ObjectId("...") },
  "shard2"
)

// Split chunk
sh.splitAt("myDatabase.users", { _id: ObjectId("...") })

// Enable balancer
sh.startBalancer()

// Disable balancer
sh.stopBalancer()

// Check balancer status
sh.getBalancerState()
```

**Shard Keys:**
```javascript
// Good shard keys have:
// 1. High cardinality (many unique values)
// 2. Good write distribution
// 3. Query isolation (queries target specific shards)

// Hashed shard key (good write distribution)
sh.shardCollection("mydb.users", { _id: "hashed" })

// Compound shard key
sh.shardCollection("mydb.orders", { customerId: 1, orderDate: 1 })

// Bad shard key examples:
// - Monotonically increasing (e.g., timestamp, auto-increment)
// - Low cardinality (e.g., country with few values)
// - Causes hotspots

// Ranged sharding
// - Data distributed based on shard key ranges
// - Good for range queries
// - Risk of hotspots

// Hashed sharding
// - Even distribution
// - Cannot use range queries on shard key
// - Better write distribution
```

### 12.3 Change Streams

**Definition**: Allow applications to access real-time data changes.

```javascript
// Watch all changes
const changeStream = db.users.watch()

changeStream.on("change", (change) => {
  console.log("Change detected:", change)
})

// Watch specific operations
const changeStream = db.users.watch([
  { $match: { operationType: "insert" } }
])

// Watch with full document
const changeStream = db.users.watch([], {
  fullDocument: "updateLookup"
})

changeStream.on("change", (change) => {
  console.log("Full document:", change.fullDocument)
})

// Filter changes
const pipeline = [
  {
    $match: {
      $and: [
        { "fullDocument.age": { $gte: 18 } },
        { operationType: { $in: ["insert", "update"] } }
      ]
    }
  }
]

const changeStream = db.users.watch(pipeline)

// Resume change stream
const changeStream = db.users.watch([], {
  resumeAfter: resumeToken
})

// Close change stream
changeStream.close()
```

---

## 13. Security {#security}

### 13.1 Enable Access Control

```javascript
// 1. Start MongoDB without access control
mongod --port 27017 --dbpath /data/db

// 2. Connect and create admin user
use admin
db.createUser({
  user: "admin",
  pwd: passwordPrompt(),  // or "password123"
  roles: [
    { role: "userAdminAnyDatabase", db: "admin" },
    { role: "readWriteAnyDatabase", db: "admin" }
  ]
})

// 3. Restart MongoDB with access control
mongod --auth --port 27017 --dbpath /data/db

// 4. Authenticate
mongosh --port 27017 -u "admin" -p "password123" --authenticationDatabase "admin"

// Or authenticate after connecting
use admin
db.auth("admin", "password123")
```

### 13.2 User Management

```javascript
// Create database user
use myDatabase
db.createUser({
  user: "appUser",
  pwd: "securePassword",
  roles: [
    { role: "readWrite", db: "myDatabase" }
  ]
})

// Create read-only user
db.createUser({
  user: "analyst",
  pwd: "password123",
  roles: [
    { role: "read", db: "myDatabase" }
  ]
})

// Create user with multiple roles
db.createUser({
  user: "powerUser",
  pwd: "password123",
  roles: [
    { role: "readWrite", db: "myDatabase" },
    { role: "dbAdmin", db: "myDatabase" },
    { role: "read", db: "otherDatabase" }
  ]
})

//