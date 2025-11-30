# E-commerce Schema: Complete Database Design

A comprehensive e-commerce database schema covering users, products, orders, payments, and inventory. This is a real-world, production-ready design.

## Schema Overview

**Core Entities:**
- Users (customers, admins)
- Products (catalog, inventory)
- Categories (product organization)
- Orders (purchases)
- Order Items (order details)
- Payments (transaction records)
- Reviews (product ratings)
- Cart (shopping cart)

## Complete Schema Design

### 1. Users Table

```sql
-- Users: Customer and admin accounts
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    
    -- Account status
    is_active BOOLEAN DEFAULT true NOT NULL,
    is_email_verified BOOLEAN DEFAULT false NOT NULL,
    role VARCHAR(20) DEFAULT 'customer' NOT NULL,  -- 'customer', 'admin', 'moderator'
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_login_at TIMESTAMP,
    deleted_at TIMESTAMP,  -- Soft delete
    
    -- Indexes
    CONSTRAINT users_email_unique UNIQUE (email),
    CONSTRAINT users_role_check CHECK (role IN ('customer', 'admin', 'moderator'))
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created ON users(created_at);
```

### 2. Categories Table

```sql
-- Categories: Product organization
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,  -- URL-friendly identifier
    description TEXT,
    parent_id INTEGER,  -- For hierarchical categories
    image_url VARCHAR(500),
    display_order INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Self-referential foreign key
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);
```

### 3. Products Table

```sql
-- Products: Product catalog
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    description TEXT,
    short_description VARCHAR(500),
    
    -- Pricing
    price DECIMAL(10, 2) NOT NULL,
    compare_at_price DECIMAL(10, 2),  -- Original price (for discounts)
    cost_price DECIMAL(10, 2),  -- Internal cost
    
    -- Inventory
    sku VARCHAR(100) UNIQUE,  -- Stock Keeping Unit
    stock_quantity INTEGER DEFAULT 0 NOT NULL,
    low_stock_threshold INTEGER DEFAULT 10,
    track_inventory BOOLEAN DEFAULT true NOT NULL,
    
    -- Product details
    category_id INTEGER NOT NULL,
    weight DECIMAL(8, 2),  -- For shipping
    dimensions JSONB,  -- {length, width, height}
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft' NOT NULL,  -- 'draft', 'active', 'archived'
    is_featured BOOLEAN DEFAULT false NOT NULL,
    
    -- SEO
    meta_title VARCHAR(255),
    meta_description TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    published_at TIMESTAMP,
    
    -- Constraints
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    CONSTRAINT products_price_check CHECK (price > 0),
    CONSTRAINT products_stock_check CHECK (stock_quantity >= 0),
    CONSTRAINT products_status_check CHECK (status IN ('draft', 'active', 'archived'))
);

-- Indexes
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(status) WHERE status = 'active';
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_featured ON products(is_featured) WHERE is_featured = true;
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_stock ON products(stock_quantity) WHERE track_inventory = true;
```

### 4. Product Images Table

```sql
-- Product Images: Multiple images per product
CREATE TABLE product_images (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    alt_text VARCHAR(255),
    display_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT false NOT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_product_images_product ON product_images(product_id);
CREATE INDEX idx_product_images_primary ON product_images(product_id, is_primary) 
WHERE is_primary = true;
```

### 5. Orders Table

```sql
-- Orders: Customer orders
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,  -- Human-readable: ORD-2024-001234
    
    -- Customer
    user_id INTEGER NOT NULL,
    guest_email VARCHAR(255),  -- For guest checkout
    
    -- Pricing
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    shipping_amount DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    discount_amount DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' NOT NULL,
    -- 'pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
    
    -- Shipping
    shipping_address JSONB NOT NULL,  -- {street, city, state, zip, country}
    billing_address JSONB NOT NULL,
    shipping_method VARCHAR(50),
    tracking_number VARCHAR(100),
    
    -- Payment
    payment_status VARCHAR(20) DEFAULT 'pending' NOT NULL,
    -- 'pending', 'paid', 'failed', 'refunded'
    payment_method VARCHAR(50),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    
    -- Constraints
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT orders_total_check CHECK (total > 0),
    CONSTRAINT orders_status_check CHECK (
        status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')
    )
);

-- Indexes
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
```

### 6. Order Items Table

```sql
-- Order Items: Products in each order
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    
    -- Product snapshot (price may change, but order should reflect original)
    product_name VARCHAR(200) NOT NULL,  -- Snapshot at time of order
    product_sku VARCHAR(100),
    product_price DECIMAL(10, 2) NOT NULL,  -- Price at time of order
    
    -- Quantity and pricing
    quantity INTEGER NOT NULL,
    line_total DECIMAL(10, 2) NOT NULL,  -- quantity * product_price
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Constraints
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    CONSTRAINT order_items_quantity_check CHECK (quantity > 0),
    CONSTRAINT order_items_price_check CHECK (product_price > 0)
);

-- Indexes
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
```

### 7. Payments Table

```sql
-- Payments: Payment transactions
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    
    -- Payment details
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
    payment_method VARCHAR(50) NOT NULL,  -- 'credit_card', 'paypal', 'stripe'
    
    -- Transaction
    transaction_id VARCHAR(255) UNIQUE,  -- External payment gateway ID
    status VARCHAR(20) DEFAULT 'pending' NOT NULL,
    -- 'pending', 'processing', 'completed', 'failed', 'refunded'
    
    -- Payment gateway response
    gateway_response JSONB,  -- Store full response from payment gateway
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    processed_at TIMESTAMP,
    
    -- Constraints
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
    CONSTRAINT payments_amount_check CHECK (amount > 0),
    CONSTRAINT payments_status_check CHECK (
        status IN ('pending', 'processing', 'completed', 'failed', 'refunded')
    )
);

-- Indexes
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_transaction ON payments(transaction_id);
CREATE INDEX idx_payments_created ON payments(created_at);
```

### 8. Shopping Cart Table

```sql
-- Shopping Cart: User's cart items
CREATE TABLE cart_items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Constraints
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT cart_items_quantity_check CHECK (quantity > 0),
    CONSTRAINT cart_items_unique UNIQUE (user_id, product_id)  -- One row per user-product
);

-- Indexes
CREATE INDEX idx_cart_items_user ON cart_items(user_id);
CREATE INDEX idx_cart_items_product ON cart_items(product_id);
```

### 9. Reviews Table

```sql
-- Reviews: Product reviews and ratings
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    order_id INTEGER,  -- Verify purchase (optional)
    
    -- Review content
    rating INTEGER NOT NULL,  -- 1-5 stars
    title VARCHAR(200),
    comment TEXT,
    
    -- Status
    is_approved BOOLEAN DEFAULT false NOT NULL,  -- Moderation
    is_verified_purchase BOOLEAN DEFAULT false NOT NULL,
    
    -- Helpful votes
    helpful_count INTEGER DEFAULT 0 NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Constraints
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    CONSTRAINT reviews_rating_check CHECK (rating >= 1 AND rating <= 5),
    CONSTRAINT reviews_unique UNIQUE (product_id, user_id)  -- One review per user per product
);

-- Indexes
CREATE INDEX idx_reviews_product ON reviews(product_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_approved ON reviews(product_id, is_approved) WHERE is_approved = true;
CREATE INDEX idx_reviews_rating ON reviews(product_id, rating);
```

## Common Queries

### Query 1: Get User's Order History

```sql
-- User's orders with item count
SELECT 
    o.id,
    o.order_number,
    o.total,
    o.status,
    o.created_at,
    COUNT(oi.id) AS item_count
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.user_id = :user_id
GROUP BY o.id, o.order_number, o.total, o.status, o.created_at
ORDER BY o.created_at DESC
LIMIT :limit OFFSET :offset;
```

### Query 2: Get Product Details with Reviews

```sql
-- Product with average rating and review count
SELECT 
    p.id,
    p.name,
    p.price,
    p.stock_quantity,
    COALESCE(AVG(r.rating), 0) AS avg_rating,
    COUNT(r.id) AS review_count,
    pi.image_url AS primary_image
FROM products p
LEFT JOIN reviews r ON p.id = r.product_id AND r.is_approved = true
LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
WHERE p.status = 'active'
GROUP BY p.id, p.name, p.price, p.stock_quantity, pi.image_url
ORDER BY avg_rating DESC, review_count DESC;
```

### Query 3: Get Order with All Details

```sql
-- Complete order information
SELECT 
    o.id,
    o.order_number,
    o.total,
    o.status,
    u.email AS user_email,
    u.first_name || ' ' || u.last_name AS user_name,
    json_agg(
        json_build_object(
            'product_name', oi.product_name,
            'quantity', oi.quantity,
            'price', oi.product_price,
            'line_total', oi.line_total
        )
    ) AS items
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN order_items oi ON o.id = oi.order_id
WHERE o.id = :order_id
GROUP BY o.id, o.order_number, o.total, o.status, u.email, u.first_name, u.last_name;
```

### Query 4: Get Shopping Cart with Product Details

```sql
-- User's cart with current product info
SELECT 
    ci.id AS cart_item_id,
    ci.quantity,
    p.id AS product_id,
    p.name,
    p.price AS current_price,
    p.stock_quantity,
    pi.image_url,
    (ci.quantity * p.price) AS line_total
FROM cart_items ci
JOIN products p ON ci.product_id = p.id
LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
WHERE ci.user_id = :user_id
  AND p.status = 'active'
ORDER BY ci.created_at DESC;
```

### Query 5: Sales Analytics

```sql
-- Daily sales summary
SELECT 
    DATE(o.created_at) AS sale_date,
    COUNT(DISTINCT o.id) AS order_count,
    COUNT(oi.id) AS item_count,
    SUM(o.total) AS revenue,
    AVG(o.total) AS avg_order_value
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
WHERE o.status != 'cancelled'
  AND o.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(o.created_at)
ORDER BY sale_date DESC;
```

## Best Practices

1. **Use Soft Deletes**: Keep historical data
2. **Snapshot Prices**: Store product price in order_items
3. **Index Foreign Keys**: For JOIN performance
4. **Use JSONB**: For flexible data (addresses, dimensions)
5. **Status Enums**: Use CHECK constraints for valid values
6. **Timestamps**: Track created_at, updated_at for audit
7. **Unique Constraints**: Prevent duplicates (cart, reviews)

## Summary

**E-commerce Schema Essentials:**

1. **Users**: Customer accounts with roles
2. **Products**: Catalog with inventory tracking
3. **Categories**: Hierarchical organization
4. **Orders**: Purchase records with status tracking
5. **Order Items**: Product snapshots in orders
6. **Payments**: Transaction records
7. **Cart**: Shopping cart items
8. **Reviews**: Product ratings and comments

**Key Design Decisions:**
- Soft deletes for data retention
- Price snapshots in order_items
- JSONB for flexible data
- Status state machines
- Comprehensive indexing

**Next Steps:**
- Learn [Data Modeling](../07_database_design/data_modeling.md) for schema design
- Study [Relationships](../01_fundamentals/relational_concepts.md) for foreign keys
- Master [Performance Optimization](../10_performance_optimization/) for query tuning

