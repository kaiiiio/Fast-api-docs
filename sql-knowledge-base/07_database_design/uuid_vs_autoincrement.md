# UUID vs Auto-Increment IDs: Choosing the Right Primary Key

Choosing between UUIDs and auto-increment integers for primary keys is an important design decision. Each has advantages and trade-offs.

## Auto-Increment IDs

### How They Work

```sql
-- Auto-increment (SERIAL in PostgreSQL)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,  -- 1, 2, 3, 4, ...
    name VARCHAR(255)
);

-- Auto-increment (AUTO_INCREMENT in MySQL)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,  -- 1, 2, 3, 4, ...
    name VARCHAR(255)
);
```

### Advantages

1. **Performance**
   - Smaller size (4-8 bytes)
   - Faster indexes (B-tree friendly)
   - Sequential inserts (better for indexes)

2. **Simplicity**
   - Easy to use
   - Human-readable
   - Simple to debug

3. **Storage**
   - Minimal storage overhead
   - Efficient foreign keys

### Disadvantages

1. **Predictability**
   - Sequential, easy to guess
   - Security concern (enumeration attacks)

2. **Distributed Systems**
   - Hard to generate unique IDs across servers
   - Requires coordination

3. **Privacy**
   - Exposes record count
   - Can infer business metrics

## UUIDs (Universally Unique Identifiers)

### How They Work

```sql
-- UUID (PostgreSQL)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255)
);

-- UUID (MySQL)
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255)
);
```

### UUID Formats

**UUID v4 (Random):**
```
550e8400-e29b-41d4-a716-446655440000
```

**Characteristics:**
- 128 bits (16 bytes)
- Globally unique
- Non-sequential

### Advantages

1. **Uniqueness**
   - Globally unique
   - No coordination needed
   - Perfect for distributed systems

2. **Security**
   - Non-sequential
   - Hard to guess
   - No enumeration attacks

3. **Privacy**
   - Doesn't expose record count
   - Can't infer business metrics

4. **Merging**
   - Easy to merge data from different sources
   - No ID conflicts

### Disadvantages

1. **Performance**
   - Larger size (16 bytes vs 4-8 bytes)
   - Random inserts (index fragmentation)
   - Slower indexes

2. **Storage**
   - 4x larger than integers
   - More storage for foreign keys

3. **Readability**
   - Hard to remember
   - Difficult to debug
   - Not human-friendly

## Performance Comparison

### Storage Size

```sql
-- Auto-increment: 4 bytes (INTEGER)
CREATE TABLE users (
    id INTEGER PRIMARY KEY,  -- 4 bytes
    name VARCHAR(255)
);

-- UUID: 16 bytes
CREATE TABLE users (
    id UUID PRIMARY KEY,  -- 16 bytes
    name VARCHAR(255)
);

-- Impact: UUID uses 4x more storage
```

### Index Performance

```sql
-- Auto-increment: Sequential inserts (fast)
INSERT INTO users (name) VALUES ('User 1');  -- ID: 1
INSERT INTO users (name) VALUES ('User 2');  -- ID: 2
-- Index pages filled sequentially (efficient)

-- UUID: Random inserts (slower)
INSERT INTO users (name) VALUES ('User 1');  -- ID: random UUID
INSERT INTO users (name) VALUES ('User 2');  -- ID: random UUID
-- Index pages fragmented (less efficient)
```

### Query Performance

```sql
-- Auto-increment: Faster lookups
SELECT * FROM users WHERE id = 1;  -- Fast (sequential index)

-- UUID: Slightly slower
SELECT * FROM users WHERE id = '550e8400-...';  -- Still fast, but larger index
```

## Real-World Examples

### Example 1: Single Database

**Use Auto-Increment:**
```sql
-- Single database, no distribution
CREATE TABLE users (
    id SERIAL PRIMARY KEY,  -- ✅ Auto-increment
    name VARCHAR(255)
);
```

**Why:** Better performance, simpler, sufficient for single DB

### Example 2: Distributed System

**Use UUID:**
```sql
-- Multiple databases, need unique IDs
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- ✅ UUID
    name VARCHAR(255)
);
```

**Why:** No coordination needed, globally unique

### Example 3: Public APIs

**Use UUID:**
```sql
-- Public API, security important
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- ✅ UUID
    user_id INTEGER,
    total DECIMAL(10, 2)
);
```

**Why:** Prevents enumeration attacks, hides record count

### Example 4: Internal Systems

**Use Auto-Increment:**
```sql
-- Internal system, performance critical
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,  -- ✅ Auto-increment
    amount DECIMAL(10, 2)
);
```

**Why:** Better performance, simpler debugging

## Hybrid Approach

### Expose UUID, Use Auto-Increment Internally

```sql
-- Internal ID (auto-increment)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,  -- Internal use
    public_id UUID UNIQUE DEFAULT gen_random_uuid(),  -- Public API
    name VARCHAR(255)
);

-- Use public_id in API responses
SELECT public_id, name FROM users WHERE id = 1;
-- Returns: public_id (UUID), not id (integer)
```

**Benefits:**
- Performance of auto-increment
- Security of UUID
- Best of both worlds

## Decision Matrix

| Factor | Auto-Increment | UUID |
|--------|----------------|------|
| **Performance** | ✅ Faster | ⚠️ Slower |
| **Storage** | ✅ Smaller | ❌ Larger |
| **Uniqueness** | ⚠️ Single DB | ✅ Global |
| **Security** | ❌ Predictable | ✅ Random |
| **Distributed** | ❌ Needs coordination | ✅ No coordination |
| **Readability** | ✅ Human-friendly | ❌ Hard to read |
| **Merging** | ⚠️ ID conflicts | ✅ No conflicts |

## Best Practices

1. **Default to Auto-Increment**: Unless you need UUID benefits
2. **Use UUID for Public APIs**: Security and privacy
3. **Use UUID for Distributed**: No coordination needed
4. **Use Auto-Increment for Internal**: Better performance
5. **Consider Hybrid**: UUID for public, auto-increment for internal

## Common Mistakes

### ❌ Using UUID Unnecessarily

```sql
-- ❌ Bad: Single database, using UUID
CREATE TABLE internal_logs (
    id UUID PRIMARY KEY,  -- Unnecessary overhead
    message TEXT
);

-- ✅ Good: Use auto-increment
CREATE TABLE internal_logs (
    id SERIAL PRIMARY KEY,
    message TEXT
);
```

### ❌ Exposing Auto-Increment in APIs

```sql
-- ❌ Bad: Expose sequential IDs
GET /api/users/1
GET /api/users/2
GET /api/users/3
-- Easy to enumerate!

-- ✅ Good: Use UUID in API
GET /api/users/550e8400-e29b-41d4-a716-446655440000
-- Hard to guess
```

## Summary

**UUID vs Auto-Increment:**

1. **Auto-Increment**: Faster, smaller, simpler, but predictable
2. **UUID**: Globally unique, secure, but slower and larger
3. **Choose Based On**: Performance needs, security requirements, distribution
4. **Hybrid**: Use both (auto-increment internal, UUID public)

**Key Takeaway:**
Use auto-increment for single-database, internal systems where performance matters. Use UUIDs for distributed systems, public APIs, or when security/privacy is important. Consider hybrid approach for best of both worlds.

**Decision Guide:**
- Single DB, internal? → Auto-increment
- Distributed system? → UUID
- Public API? → UUID
- Performance critical? → Auto-increment
- Need both? → Hybrid approach

**Next Steps:**
- Learn [Primary Keys](../01_fundamentals/relational_concepts.md) for key design
- Study [Indexes](../08_indexes/what_is_index.md) for performance
- Master [Database Design](normalization.md) for complete design

