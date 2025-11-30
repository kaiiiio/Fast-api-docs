# Inheritance Patterns: Modeling Object-Oriented Concepts in SQL

Inheritance patterns allow you to model object-oriented concepts (like class hierarchies) in relational databases. They're useful when you have entities that share common attributes but also have specific differences.

## Three Main Patterns

1. **Single Table Inheritance**: All types in one table
2. **Class Table Inheritance**: Separate table per type
3. **Polymorphic Associations**: Flexible type references

## Pattern 1: Single Table Inheritance (STI)

**Single Table Inheritance** stores all types in a single table with a discriminator column.

### Structure

```sql
-- Single table for all types
CREATE TABLE vehicles (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50),  -- Discriminator: 'car', 'truck', 'motorcycle'
    make VARCHAR(255),
    model VARCHAR(255),
    year INTEGER,
    -- Car-specific
    doors INTEGER,     -- NULL for non-cars
    -- Truck-specific
    cargo_capacity DECIMAL(10, 2),  -- NULL for non-trucks
    -- Motorcycle-specific
    engine_cc INTEGER  -- NULL for non-motorcycles
);
```

### Example: Vehicle Types

```sql
-- Insert different types
INSERT INTO vehicles (type, make, model, year, doors) 
VALUES ('car', 'Toyota', 'Camry', 2023, 4);

INSERT INTO vehicles (type, make, model, year, cargo_capacity) 
VALUES ('truck', 'Ford', 'F-150', 2023, 1500.00);

INSERT INTO vehicles (type, make, model, year, engine_cc) 
VALUES ('motorcycle', 'Honda', 'CBR', 2023, 600);

-- Query specific type
SELECT * FROM vehicles WHERE type = 'car';

-- Query all with type-specific attributes
SELECT 
    id,
    type,
    make,
    model,
    CASE 
        WHEN type = 'car' THEN doors::TEXT
        WHEN type = 'truck' THEN cargo_capacity::TEXT
        WHEN type = 'motorcycle' THEN engine_cc::TEXT
    END AS type_specific_attr
FROM vehicles;
```

### Pros and Cons

**Pros:**
- ✅ Simple queries (single table)
- ✅ Easy polymorphic queries (all types together)
- ✅ No JOINs needed

**Cons:**
- ❌ Many NULL columns (sparse data)
- ❌ Can't enforce type-specific constraints
- ❌ Table grows large with many types

## Pattern 2: Class Table Inheritance (CTI)

**Class Table Inheritance** uses separate tables for each type, with a base table for common attributes.

### Structure

```sql
-- Base table (common attributes)
CREATE TABLE vehicles (
    id SERIAL PRIMARY KEY,
    make VARCHAR(255),
    model VARCHAR(255),
    year INTEGER,
    created_at TIMESTAMP
);

-- Car table (car-specific)
CREATE TABLE cars (
    vehicle_id INTEGER PRIMARY KEY REFERENCES vehicles(id) ON DELETE CASCADE,
    doors INTEGER,
    fuel_type VARCHAR(50)
);

-- Truck table (truck-specific)
CREATE TABLE trucks (
    vehicle_id INTEGER PRIMARY KEY REFERENCES vehicles(id) ON DELETE CASCADE,
    cargo_capacity DECIMAL(10, 2),
    towing_capacity DECIMAL(10, 2)
);

-- Motorcycle table (motorcycle-specific)
CREATE TABLE motorcycles (
    vehicle_id INTEGER PRIMARY KEY REFERENCES vehicles(id) ON DELETE CASCADE,
    engine_cc INTEGER,
    has_sidecar BOOLEAN
);
```

### Example: Vehicle Types

```sql
-- Insert car
INSERT INTO vehicles (make, model, year) 
VALUES ('Toyota', 'Camry', 2023)
RETURNING id;  -- Returns 1

INSERT INTO cars (vehicle_id, doors, fuel_type) 
VALUES (1, 4, 'gasoline');

-- Insert truck
INSERT INTO vehicles (make, model, year) 
VALUES ('Ford', 'F-150', 2023)
RETURNING id;  -- Returns 2

INSERT INTO trucks (vehicle_id, cargo_capacity, towing_capacity) 
VALUES (2, 1500.00, 5000.00);

-- Query all vehicles
SELECT v.*, 'car' AS type
FROM vehicles v
JOIN cars c ON v.id = c.vehicle_id

UNION ALL

SELECT v.*, 'truck' AS type
FROM vehicles v
JOIN trucks t ON v.id = t.vehicle_id

UNION ALL

SELECT v.*, 'motorcycle' AS type
FROM vehicles v
JOIN motorcycles m ON v.id = m.vehicle_id;
```

### Pros and Cons

**Pros:**
- ✅ No NULL columns (clean data)
- ✅ Type-specific constraints possible
- ✅ Clear separation of concerns

**Cons:**
- ❌ Requires JOINs for queries
- ❌ More complex queries
- ❌ More tables to manage

## Pattern 3: Polymorphic Associations

**Polymorphic Associations** use a type column to reference different tables.

### Structure

```sql
-- Comments can belong to different entities
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    content TEXT,
    commentable_type VARCHAR(50),  -- 'post', 'video', 'photo'
    commentable_id INTEGER,        -- ID in the referenced table
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP
);

-- Posts table
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    content TEXT
);

-- Videos table
CREATE TABLE videos (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    url VARCHAR(255)
);

-- Photos table
CREATE TABLE photos (
    id SERIAL PRIMARY KEY,
    caption TEXT,
    url VARCHAR(255)
);
```

### Example: Comments on Multiple Types

```sql
-- Insert comment on post
INSERT INTO comments (content, commentable_type, commentable_id, user_id)
VALUES ('Great post!', 'post', 1, 1);

-- Insert comment on video
INSERT INTO comments (content, commentable_type, commentable_id, user_id)
VALUES ('Nice video!', 'video', 1, 1);

-- Query comments with their parent
SELECT 
    c.id,
    c.content,
    c.commentable_type,
    c.commentable_id,
    CASE c.commentable_type
        WHEN 'post' THEN p.title
        WHEN 'video' THEN v.title
        WHEN 'photo' THEN ph.caption
    END AS parent_title
FROM comments c
LEFT JOIN posts p ON c.commentable_type = 'post' AND c.commentable_id = p.id
LEFT JOIN videos v ON c.commentable_type = 'video' AND c.commentable_id = v.id
LEFT JOIN photos ph ON c.commentable_type = 'photo' AND c.commentable_id = ph.id;
```

### Pros and Cons

**Pros:**
- ✅ Flexible (can reference any table)
- ✅ Simple structure
- ✅ Easy to add new types

**Cons:**
- ❌ No foreign key constraints (data integrity risk)
- ❌ Complex queries (multiple JOINs)
- ❌ Can't enforce referential integrity

## Real-World Examples

### Example 1: Content Management System

```sql
-- Single Table Inheritance: All content types
CREATE TABLE content (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50),  -- 'article', 'video', 'podcast'
    title VARCHAR(255),
    slug VARCHAR(255),
    -- Article-specific
    body TEXT,
    -- Video-specific
    video_url VARCHAR(255),
    duration INTEGER,
    -- Podcast-specific
    audio_url VARCHAR(255),
    transcript TEXT
);
```

### Example 2: Payment Methods

```sql
-- Class Table Inheritance: Payment methods
CREATE TABLE payment_methods (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    type VARCHAR(50),  -- 'credit_card', 'paypal', 'bank_account'
    is_default BOOLEAN
);

CREATE TABLE credit_cards (
    payment_method_id INTEGER PRIMARY KEY REFERENCES payment_methods(id),
    card_number_last4 VARCHAR(4),
    expiry_month INTEGER,
    expiry_year INTEGER
);

CREATE TABLE paypal_accounts (
    payment_method_id INTEGER PRIMARY KEY REFERENCES payment_methods(id),
    email VARCHAR(255)
);

CREATE TABLE bank_accounts (
    payment_method_id INTEGER PRIMARY KEY REFERENCES payment_methods(id),
    account_number_last4 VARCHAR(4),
    routing_number VARCHAR(9)
);
```

### Example 3: Activity Feed

```sql
-- Polymorphic Associations: Activities
CREATE TABLE activities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    activity_type VARCHAR(50),  -- 'like', 'comment', 'share'
    target_type VARCHAR(50),    -- 'post', 'photo', 'video'
    target_id INTEGER,
    created_at TIMESTAMP
);
```

## Choosing the Right Pattern

### Use Single Table Inheritance When:

- ✅ Types are similar (few type-specific attributes)
- ✅ You need simple queries across all types
- ✅ Types don't change frequently

### Use Class Table Inheritance When:

- ✅ Types are very different (many type-specific attributes)
- ✅ You need type-specific constraints
- ✅ You want clean, normalized data

### Use Polymorphic Associations When:

- ✅ You need flexibility (many different types)
- ✅ Types are unrelated
- ✅ You can't predict all types upfront

## Best Practices

1. **Choose Wisely**: Consider trade-offs of each pattern
2. **Document**: Clearly document which pattern you're using
3. **Constraints**: Add constraints where possible
4. **Indexes**: Index type columns and foreign keys
5. **Queries**: Optimize queries for your chosen pattern

## Summary

**Inheritance Patterns:**

1. **Single Table Inheritance**: All types in one table with discriminator
2. **Class Table Inheritance**: Base table + separate tables per type
3. **Polymorphic Associations**: Type column references different tables

**Key Takeaway:**
Inheritance patterns model object-oriented concepts in SQL. Single Table Inheritance is simple but can have many NULLs. Class Table Inheritance is clean but requires JOINs. Polymorphic Associations are flexible but lack referential integrity. Choose based on your specific needs.

**When to Use:**
- STI: Similar types, simple queries
- CTI: Different types, need constraints
- Polymorphic: Many unrelated types, need flexibility

**Next Steps:**
- Learn [Normalization](normalization.md) for database design
- Study [Junction Tables](junction_tables.md) for relationships
- Master [Data Modeling](data_modeling_er_diagrams.md) for design

