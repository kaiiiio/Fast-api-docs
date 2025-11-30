# Partitioning: Dividing Large Tables

Partitioning splits large tables into smaller, manageable pieces within a single database. It improves query performance and maintenance for large datasets.

## What is Partitioning?

**Partitioning** divides a table into smaller physical pieces (partitions) while maintaining logical unity. Each partition can be stored and managed separately.

### Partitioning Benefits

```
- Improved query performance
- Easier data management
- Faster data loading
- Efficient archiving
```

## Partitioning Types

### Range Partitioning

```sql
-- Partition by date range
CREATE TABLE orders (
    id SERIAL,
    user_id INTEGER,
    total DECIMAL(10, 2),
    created_at TIMESTAMP,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create partitions
CREATE TABLE orders_2023_01 PARTITION OF orders
    FOR VALUES FROM ('2023-01-01') TO ('2023-02-01');

CREATE TABLE orders_2023_02 PARTITION OF orders
    FOR VALUES FROM ('2023-02-01') TO ('2023-03-01');

CREATE TABLE orders_2023_03 PARTITION OF orders
    FOR VALUES FROM ('2023-03-01') TO ('2023-04-01');
```

### Hash Partitioning

```sql
-- Partition by hash of column
CREATE TABLE users (
    id SERIAL,
    name VARCHAR(255),
    email VARCHAR(255),
    PRIMARY KEY (id)
) PARTITION BY HASH (id);

-- Create partitions
CREATE TABLE users_0 PARTITION OF users
    FOR VALUES WITH (MODULUS 4, REMAINDER 0);

CREATE TABLE users_1 PARTITION OF users
    FOR VALUES WITH (MODULUS 4, REMAINDER 1);

CREATE TABLE users_2 PARTITION OF users
    FOR VALUES WITH (MODULUS 4, REMAINDER 2);

CREATE TABLE users_3 PARTITION OF users
    FOR VALUES WITH (MODULUS 4, REMAINDER 3);
```

### List Partitioning

```sql
-- Partition by list of values
CREATE TABLE products (
    id SERIAL,
    name VARCHAR(255),
    category VARCHAR(50),
    price DECIMAL(10, 2),
    PRIMARY KEY (id, category)
) PARTITION BY LIST (category);

-- Create partitions
CREATE TABLE products_electronics PARTITION OF products
    FOR VALUES IN ('electronics', 'computers', 'phones');

CREATE TABLE products_clothing PARTITION OF products
    FOR VALUES IN ('clothing', 'shoes', 'accessories');

CREATE TABLE products_books PARTITION OF products
    FOR VALUES IN ('books', 'magazines');
```

## Real-World Examples

### Example 1: Time-Based Partitioning

```sql
-- Partition orders by month
CREATE TABLE orders (
    id BIGSERIAL,
    user_id INTEGER,
    total DECIMAL(10, 2),
    created_at TIMESTAMP,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE orders_2023_01 PARTITION OF orders
    FOR VALUES FROM ('2023-01-01') TO ('2023-02-01');

CREATE TABLE orders_2023_02 PARTITION OF orders
    FOR VALUES FROM ('2023-02-01') TO ('2023-03-01');

-- Query automatically uses correct partition
SELECT * FROM orders WHERE created_at >= '2023-01-15';
-- Only scans orders_2023_01 partition
```

### Example 2: Multi-Level Partitioning

```sql
-- Partition by region, then by date
CREATE TABLE events (
    id BIGSERIAL,
    region VARCHAR(50),
    event_type VARCHAR(50),
    created_at TIMESTAMP,
    PRIMARY KEY (id, region, created_at)
) PARTITION BY LIST (region);

-- Create region partitions
CREATE TABLE events_us PARTITION OF events
    FOR VALUES IN ('us-east', 'us-west')
    PARTITION BY RANGE (created_at);

CREATE TABLE events_eu PARTITION OF events
    FOR VALUES IN ('eu-west', 'eu-central')
    PARTITION BY RANGE (created_at);

-- Create date sub-partitions
CREATE TABLE events_us_2023_01 PARTITION OF events_us
    FOR VALUES FROM ('2023-01-01') TO ('2023-02-01');
```

### Example 3: Partition Maintenance

```sql
-- Add new partition
CREATE TABLE orders_2023_04 PARTITION OF orders
    FOR VALUES FROM ('2023-04-01') TO ('2023-05-01');

-- Drop old partition (archive)
ALTER TABLE orders DETACH PARTITION orders_2023_01;

-- Archive detached partition
CREATE TABLE orders_2023_01_archive (LIKE orders_2023_01 INCLUDING ALL);
INSERT INTO orders_2023_01_archive SELECT * FROM orders_2023_01;
DROP TABLE orders_2023_01;
```

## Query Performance

### Partition Pruning

```sql
-- Automatic partition pruning
SELECT * FROM orders 
WHERE created_at >= '2023-01-15' AND created_at < '2023-02-15';
-- Only scans orders_2023_01 and orders_2023_02 partitions

-- Without partition pruning
SELECT * FROM orders;
-- Scans all partitions (slower)
```

### Indexes on Partitions

```sql
-- Create index on partitioned table
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Index created on all partitions automatically
-- Each partition has its own index
```

## Best Practices

1. **Choose Partition Key**: Frequently used in WHERE clauses
2. **Partition Size**: Keep partitions manageable (millions of rows)
3. **Regular Maintenance**: Add new partitions, archive old ones
4. **Monitor Performance**: Track partition usage and query performance
5. **Plan Ahead**: Create partitions in advance

## Common Patterns

### Pattern 1: Monthly Partitions

```sql
-- Partition by month
CREATE TABLE logs (
    ...
) PARTITION BY RANGE (created_at);

-- Monthly partitions
CREATE TABLE logs_2023_01 PARTITION OF logs
    FOR VALUES FROM ('2023-01-01') TO ('2023-02-01');
```

### Pattern 2: Hash Partitions

```sql
-- Distribute data evenly
CREATE TABLE users (
    ...
) PARTITION BY HASH (id);

-- 4 hash partitions
CREATE TABLE users_0 PARTITION OF users
    FOR VALUES WITH (MODULUS 4, REMAINDER 0);
```

## Summary

**Partitioning:**

1. **Purpose**: Divide large tables into smaller pieces
2. **Types**: Range, hash, list partitioning
3. **Benefits**: Better performance, easier management
4. **Maintenance**: Add new partitions, archive old ones
5. **Best Practice**: Partition by frequently queried columns

**Key Takeaway:**
Partitioning divides large tables into smaller physical pieces within a single database. Use range partitioning for time-based data, hash partitioning for even distribution, and list partitioning for categorical data. Partitioning improves query performance through partition pruning and makes data management easier. Regularly maintain partitions by adding new ones and archiving old ones.

**Partitioning Strategy:**
- Choose appropriate partition key
- Keep partitions manageable size
- Regular maintenance (add/archive)
- Monitor performance
- Plan partitions in advance

**Next Steps:**
- Learn [Sharding](sharding.md) for multi-database partitioning
- Study [Performance Optimization](../10_performance_optimization/) for query tuning
- Master [Monitoring](monitoring.md) for partition health

