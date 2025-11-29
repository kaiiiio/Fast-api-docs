# PostgreSQL Array and Enum Types: Complete Guide

PostgreSQL offers powerful native types for arrays and enums that can simplify your data model and improve performance. This guide teaches you when and how to use them effectively in your FastAPI applications.

## Understanding PostgreSQL Arrays

**The concept:**
Instead of creating a separate table or using JSON, PostgreSQL can store arrays directly in a column.

**When arrays are useful:**
- Tags (product tags, user interests)
- Multiple values of the same type (phone numbers, addresses)
- Ordered lists (product images, steps in a process)
- When you always query the array as a whole

**When NOT to use arrays:**
- Need to query individual elements frequently
- Need foreign key relationships
- Arrays can get very large
- Need to query "which records contain X"

### Basic Array Columns

Let's add arrays to our e-commerce models:

```python
from sqlalchemy import Column, Integer, String, Numeric
from sqlalchemy.dialects.postgresql import ARRAY, ENUM
import enum

class Product(Base):
    """
    Product with array columns for tags and image URLs.
    """
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    
    # Array of strings - product tags
    tags = Column(ARRAY(String), default=[], nullable=False)
    
    # Array of strings - image URLs
    image_urls = Column(ARRAY(String), default=[], nullable=False)
    
    # Array of integers - related product IDs
    related_product_ids = Column(ARRAY(Integer), nullable=True)

# Usage
product = Product(
    name="Gaming Laptop",
    price=1299.99,
    tags=["electronics", "gaming", "laptop", "gaming-laptop"],
    image_urls=[
        "https://example.com/image1.jpg",
        "https://example.com/image2.jpg",
        "https://example.com/image3.jpg"
    ],
    related_product_ids=[5, 12, 23]
)
```

**Understanding ARRAY syntax:**
- `ARRAY(String)` - Array of strings
- `ARRAY(Integer)` - Array of integers
- `default=[]` - Empty array by default
- Arrays can be NULL or empty `[]`

## Querying Arrays

This is where arrays become powerful - you can query inside them:

### Check if Array Contains Value

```python
from sqlalchemy import select

async def find_products_by_tag(tag: str):
    """Find all products with a specific tag."""
    async with async_session_maker() as session:
        # Method 1: Using ANY (checks if any element matches)
        stmt = select(Product).where(
            Product.tags.any(tag)
        )
        
        result = await session.execute(stmt)
        return list(result.scalars().all())

async def find_products_with_all_tags(required_tags: List[str]):
    """Find products that have ALL specified tags."""
    async with async_session_maker() as session:
        stmt = select(Product)
        
        # Product must contain all tags
        for tag in required_tags:
            stmt = stmt.where(Product.tags.any(tag))
        
        result = await session.execute(stmt)
        return list(result.scalars().all())

# Usage
gaming_laptops = await find_products_by_tag("gaming")
high_end_gaming = await find_products_with_all_tags(["gaming", "premium"])
```

**Understanding `.any()`:**
- Checks if array contains the value
- Works with any array type
- Can use in WHERE clauses

### Array Length and Operations

```python
from sqlalchemy import func

async def find_products_with_multiple_images(min_images: int = 2):
    """Find products with at least N images."""
    async with async_session_maker() as session:
        stmt = select(Product).where(
            func.array_length(Product.image_urls, 1) >= min_images
        )
        
        result = await session.execute(stmt)
        return list(result.scalars().all())

async def get_products_with_tag_count():
    """Get products with count of tags."""
    async with async_session_maker() as session:
        stmt = select(
            Product,
            func.array_length(Product.tags, 1).label('tag_count')
        ).where(
            func.array_length(Product.tags, 1) > 0
        ).order_by(
            func.array_length(Product.tags, 1).desc()
        )
        
        result = await session.execute(stmt)
        return result.all()
```

### Array Indexing and Slicing

```python
async def get_first_image_url(product_id: int):
    """Get the first image URL from product's image array."""
    async with async_session_maker() as session:
        product = await session.get(Product, product_id)
        
        if product and product.image_urls:
            return product.image_urls[0]  # First element
        return None

async def get_all_images_except_first(product_id: int):
    """Get all images except the first one."""
    async with async_session_maker() as session:
        product = await session.get(Product, product_id)
        
        if product and len(product.image_urls) > 1:
            return product.image_urls[1:]  # All except first
        return []
```

**Note:** Array indexing in Python works naturally with PostgreSQL arrays!

### Updating Arrays

```python
async def add_tag_to_product(product_id: int, new_tag: str):
    """Add a tag to a product's tags array."""
    async with async_session_maker() as session:
        product = await session.get(Product, product_id)
        
        if not product:
            return None
        
        # Check if tag already exists
        if new_tag not in product.tags:
            product.tags.append(new_tag)
            await session.commit()
        
        return product

async def remove_tag_from_product(product_id: int, tag_to_remove: str):
    """Remove a tag from a product."""
    async with async_session_maker() as session:
        product = await session.get(Product, product_id)
        
        if product and tag_to_remove in product.tags:
            product.tags.remove(tag_to_remove)
            await session.commit()
        
        return product
```

## Understanding PostgreSQL Enums

**The concept:**
Enums define a fixed set of allowed values. They're type-safe and efficient.

**When enums are useful:**
- Status fields (order status, user status)
- Fixed categories (product type, payment method)
- Any field with limited, known values

**Benefits:**
- Type safety (database enforces valid values)
- Efficient storage (stores as integers internally)
- Self-documenting (schema shows allowed values)

### Creating Enums

```python
from enum import Enum as PyEnum
from sqlalchemy.dialects.postgresql import ENUM

# Define Python enum first
class OrderStatus(PyEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class PaymentMethod(PyEnum):
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    PAYPAL = "paypal"
    BANK_TRANSFER = "bank_transfer"

# Create PostgreSQL enum types
order_status_enum = ENUM(OrderStatus, name="order_status_enum", create_type=True)
payment_method_enum = ENUM(PaymentMethod, name="payment_method_enum", create_type=True)

# Use in models
class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    total_amount = Column(Numeric(10, 2))
    
    # Use enum type
    status = Column(order_status_enum, default=OrderStatus.PENDING, nullable=False)
    payment_method = Column(payment_method_enum, nullable=True)

# Usage
order = Order(
    user_id=1,
    total_amount=99.99,
    status=OrderStatus.PENDING,  # Type-safe!
    payment_method=PaymentMethod.CREDIT_CARD
)
```

**Understanding enum creation:**
- `create_type=True` - Creates PostgreSQL enum type in database
- Enum values stored efficiently (as integers internally)
- Type-safe - can't insert invalid values

### Querying with Enums

```python
async def get_orders_by_status(status: OrderStatus):
    """Get all orders with a specific status."""
    async with async_session_maker() as session:
        stmt = select(Order).where(Order.status == status)
        
        result = await session.execute(stmt)
        return list(result.scalars().all())

async def get_pending_orders():
    """Get all pending orders."""
    return await get_orders_by_status(OrderStatus.PENDING)

async def update_order_status(order_id: int, new_status: OrderStatus):
    """Update order status (with validation)."""
    # Valid status transitions
    valid_transitions = {
        OrderStatus.PENDING: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
        OrderStatus.PROCESSING: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
        OrderStatus.SHIPPED: [OrderStatus.DELIVERED],
        OrderStatus.DELIVERED: [],  # Final state
        OrderStatus.CANCELLED: []   # Final state
    }
    
    async with async_session_maker() as session:
        order = await session.get(Order, order_id)
        
        if not order:
            return None
        
        # Validate transition
        if new_status not in valid_transitions.get(order.status, []):
            raise ValueError(
                f"Cannot transition from {order.status.value} to {new_status.value}"
            )
        
        order.status = new_status
        await session.commit()
        return order
```

## Practical Patterns

### Pattern 1: Tags with Array

```python
class Product(Base):
    """Product with tags stored as array."""
    
    tags = Column(ARRAY(String), default=[], nullable=False, index=True)
    
    def has_tag(self, tag: str) -> bool:
        """Check if product has a specific tag."""
        return tag in self.tags
    
    def add_tag(self, tag: str):
        """Add tag if not already present."""
        if tag not in self.tags:
            self.tags.append(tag)
    
    def remove_tag(self, tag: str):
        """Remove tag if present."""
        if tag in self.tags:
            self.tags.remove(tag)

# Create index for tag searches
# Migration
op.execute("""
    CREATE INDEX idx_products_tags_gin
    ON products USING gin (tags);
""")
```

### Pattern 2: Status State Machine with Enum

```python
class Order(Base):
    """Order with status enum and state machine logic."""
    
    status = Column(order_status_enum, default=OrderStatus.PENDING)
    status_history = Column(ARRAY(order_status_enum), default=[], nullable=False)
    
    def transition_to(self, new_status: OrderStatus):
        """Safely transition order status."""
        # Validate transition
        valid_next = {
            OrderStatus.PENDING: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
            OrderStatus.PROCESSING: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
            OrderStatus.SHIPPED: [OrderStatus.DELIVERED],
        }
        
        if new_status not in valid_next.get(self.status, []):
            raise ValueError(f"Invalid transition: {self.status} -> {new_status}")
        
        # Add to history
        self.status_history.append(self.status)
        self.status = new_status
```

### Pattern 3: Multi-select Options

```python
class UserPreference(Base):
    """User preferences with array of enum values."""
    
    # Array of notification types user wants
    notification_types = Column(
        ARRAY(ENUM("email", "sms", "push", name="notification_type_enum")),
        default=[],
        nullable=False
    )
    
    def enable_notification(self, notification_type: str):
        """Enable a notification type."""
        if notification_type not in self.notification_types:
            self.notification_types.append(notification_type)
    
    def disable_notification(self, notification_type: str):
        """Disable a notification type."""
        if notification_type in self.notification_types:
            self.notification_types.remove(notification_type)
```

## Performance Considerations

### Indexing Arrays

```python
# GIN index for array containment queries
op.execute("""
    CREATE INDEX idx_products_tags_gin
    ON products USING gin (tags);
""")

# This makes queries like this fast:
# WHERE tags @> ARRAY['gaming']  (contains gaming tag)
# WHERE tags && ARRAY['gaming', 'laptop']  (overlaps with array)
```

### Indexing Enums

Enums are already efficient, but you can still index them:

```python
# B-tree index for enum column
op.create_index('idx_orders_status', 'orders', ['status'])

# Useful for queries like:
# WHERE status = 'pending'
# ORDER BY status
```

## Best Practices

1. **Use arrays for:**
   - Small, bounded lists
   - Tags, categories, lists
   - When you query the whole array

2. **Use enums for:**
   - Fixed set of values
   - Status fields
   - Type-safe categories

3. **Don't use arrays for:**
   - Large, unbounded lists
   - Data that needs foreign keys
   - Frequently queried individual elements

4. **Always index:**
   - Array columns you query
   - Enum columns you filter by

## Summary

Arrays and enums provide:
- **Arrays**: Flexible lists stored efficiently
- **Enums**: Type-safe, fixed value sets
- **Native support**: Built into PostgreSQL
- **Performance**: Indexed queries are fast

Use them when they fit your use case - they can simplify your schema and improve performance!

