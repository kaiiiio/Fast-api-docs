# Seeding Data: Populating Databases with Initial Data

Seeding data involves populating databases with initial or test data. This guide covers strategies for seeding databases effectively.

## What is Data Seeding?

**Data seeding** is the process of populating a database with initial data, such as default values, reference data, or test data.

### Use Cases

```sql
-- ✅ Reference data (categories, statuses)
-- ✅ Default users (admin, test users)
-- ✅ Test data (development, testing)
-- ✅ Sample data (demos, examples)
```

## Seeding Strategies

### Strategy 1: SQL Scripts

```sql
-- seed.sql
-- Insert reference data
INSERT INTO categories (name, slug) VALUES
    ('Electronics', 'electronics'),
    ('Clothing', 'clothing'),
    ('Books', 'books');

-- Insert default users
INSERT INTO users (name, email, role) VALUES
    ('Admin', 'admin@example.com', 'admin'),
    ('Test User', 'test@example.com', 'user');
```

### Strategy 2: Migration-Based Seeding

```sql
-- Migration: 999_seed_initial_data.sql
-- Seed data as part of migrations

-- Insert categories
INSERT INTO categories (name, slug) VALUES
    ('Electronics', 'electronics'),
    ('Clothing', 'clothing')
ON CONFLICT (slug) DO NOTHING;

-- Down migration: Remove seed data
DELETE FROM categories WHERE slug IN ('electronics', 'clothing');
```

### Strategy 3: Application-Level Seeding

```python
# Python example
def seed_database():
    # Seed categories
    categories = [
        {'name': 'Electronics', 'slug': 'electronics'},
        {'name': 'Clothing', 'slug': 'clothing'},
    ]
    
    for cat in categories:
        db.execute(
            "INSERT INTO categories (name, slug) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (cat['name'], cat['slug'])
        )
```

## Real-World Examples

### Example 1: Reference Data

```sql
-- Seed: Product categories
INSERT INTO categories (name, slug, description) VALUES
    ('Electronics', 'electronics', 'Electronic devices and gadgets'),
    ('Clothing', 'clothing', 'Apparel and accessories'),
    ('Books', 'books', 'Books and publications'),
    ('Home & Garden', 'home-garden', 'Home and garden products')
ON CONFLICT (slug) DO NOTHING;

-- Seed: Order statuses
INSERT INTO order_statuses (name, description) VALUES
    ('pending', 'Order is pending'),
    ('processing', 'Order is being processed'),
    ('shipped', 'Order has been shipped'),
    ('delivered', 'Order has been delivered'),
    ('cancelled', 'Order has been cancelled')
ON CONFLICT (name) DO NOTHING;
```

### Example 2: Default Users

```sql
-- Seed: Admin user
INSERT INTO users (name, email, password_hash, role) VALUES
    (
        'Admin User',
        'admin@example.com',
        '$2b$12$...',  -- Hashed password
        'admin'
    )
ON CONFLICT (email) DO NOTHING;

-- Seed: Test users
INSERT INTO users (name, email, password_hash, role) VALUES
    ('Test User 1', 'test1@example.com', '$2b$12$...', 'user'),
    ('Test User 2', 'test2@example.com', '$2b$12$...', 'user')
ON CONFLICT (email) DO NOTHING;
```

### Example 3: Sample Data

```sql
-- Seed: Sample products
INSERT INTO products (name, description, price, category_id) VALUES
    (
        'Laptop',
        'High-performance laptop',
        999.99,
        (SELECT id FROM categories WHERE slug = 'electronics')
    ),
    (
        'T-Shirt',
        'Comfortable cotton t-shirt',
        19.99,
        (SELECT id FROM categories WHERE slug = 'clothing')
    )
ON CONFLICT DO NOTHING;
```

## Idempotent Seeding

### Using ON CONFLICT

```sql
-- ✅ Idempotent: Can run multiple times
INSERT INTO categories (name, slug) VALUES
    ('Electronics', 'electronics'),
    ('Clothing', 'clothing')
ON CONFLICT (slug) DO NOTHING;

-- Safe to run multiple times
-- Won't create duplicates
```

### Using IF NOT EXISTS

```sql
-- Check before insert
INSERT INTO categories (name, slug)
SELECT 'Electronics', 'electronics'
WHERE NOT EXISTS (
    SELECT 1 FROM categories WHERE slug = 'electronics'
);
```

## Seeding Tools

### Database-Specific

```sql
-- PostgreSQL: COPY for bulk inserts
COPY categories (name, slug) FROM '/path/to/categories.csv' CSV;

-- MySQL: LOAD DATA
LOAD DATA INFILE '/path/to/categories.csv'
INTO TABLE categories
FIELDS TERMINATED BY ','
LINES TERMINATED BY '\n';
```

### Application Frameworks

```python
# Django: Fixtures
python manage.py loaddata initial_data.json

# Rails: Seeds
rails db:seed

# Laravel: Seeders
php artisan db:seed
```

## Environment-Specific Seeding

### Development

```sql
-- Development: Full test data
-- Many users, products, orders
-- For testing and development
```

### Staging

```sql
-- Staging: Production-like data
-- Realistic data volumes
-- For pre-production testing
```

### Production

```sql
-- Production: Only reference data
-- Categories, statuses, default admin
-- No test data
```

## Best Practices

1. **Idempotent**: Seeding should be safe to run multiple times
2. **Environment-Aware**: Different data for different environments
3. **Reference Data**: Seed in migrations or separate scripts
4. **Test Data**: Keep separate from reference data
5. **Documentation**: Document what gets seeded and why

## Common Patterns

### Pattern 1: Reference Data in Migrations

```sql
-- Migration: 010_seed_categories.sql
INSERT INTO categories (name, slug) VALUES
    ('Electronics', 'electronics'),
    ('Clothing', 'clothing')
ON CONFLICT (slug) DO NOTHING;

-- Down: Remove seed data
DELETE FROM categories WHERE slug IN ('electronics', 'clothing');
```

### Pattern 2: Separate Seed Scripts

```sql
-- seed_reference_data.sql
-- Run separately from migrations
-- For reference data that changes infrequently
```

### Pattern 3: Factory Functions

```python
# Python: Factory functions for test data
def create_test_user(name='Test User', email=None):
    email = email or f'test_{random.randint(1000, 9999)}@example.com'
    return db.execute(
        "INSERT INTO users (name, email) VALUES (%s, %s) RETURNING id",
        (name, email)
    )
```

## Common Mistakes

### ❌ Non-Idempotent Seeding

```sql
-- ❌ Bad: Creates duplicates
INSERT INTO categories (name, slug) VALUES
    ('Electronics', 'electronics');

-- Run twice = duplicate error

-- ✅ Good: Idempotent
INSERT INTO categories (name, slug) VALUES
    ('Electronics', 'electronics')
ON CONFLICT (slug) DO NOTHING;
```

### ❌ Seeding Production

```sql
-- ❌ Bad: Seed test data in production
INSERT INTO users (name, email) VALUES
    ('Test User', 'test@example.com');
-- Don't seed test data in production!

-- ✅ Good: Only reference data in production
INSERT INTO categories (name, slug) VALUES
    ('Electronics', 'electronics')
ON CONFLICT DO NOTHING;
```

## Summary

**Seeding Data:**

1. **Purpose**: Populate database with initial or test data
2. **Strategies**: SQL scripts, migrations, application-level
3. **Idempotent**: Safe to run multiple times
4. **Environment-Aware**: Different data for different environments
5. **Best Practice**: Use ON CONFLICT for idempotency

**Key Takeaway:**
Data seeding populates databases with initial data like reference data, default users, or test data. Make seeding idempotent using ON CONFLICT or IF NOT EXISTS so it can run multiple times safely. Use different seeding strategies for different environments (development gets test data, production only gets reference data). Keep reference data in migrations, test data separate.

**Seeding Principles:**
- Idempotent (safe to run multiple times)
- Environment-aware (different data per environment)
- Reference data in migrations
- Test data separate
- Document what gets seeded

**Next Steps:**
- Learn [Versioned Migrations](versioned_migrations.md) for migration management
- Study [Production Migration Best Practices](production_migration_best_practices.md) for deployment
- Master [Rollbacks](rollbacks.md) for reverting changes

