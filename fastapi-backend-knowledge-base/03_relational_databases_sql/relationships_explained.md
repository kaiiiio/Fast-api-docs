# Database Relationships: Complete Guide A-Z

Understanding relationships is crucial for database design. This guide explains relationships from scratch using our e-commerce example, showing exactly what they mean and how to use them.

## What Are Relationships?

**In simple terms:**
A relationship connects two tables. It's like saying "this record in table A is related to that record in table B."

**Real-world analogy:**
- A **User** places **Orders** (one user, many orders)
- An **Order** contains **OrderItems** (one order, many items)
- An **OrderItem** references a **Product** (many items, one product)

## Types of Relationships

There are three main types:
1. **One-to-Many** - Most common (e.g., one user has many orders)
2. **Many-to-Many** - Less common (e.g., products can be in many orders, orders have many products)
3. **One-to-One** - Rare (e.g., one user has one profile)

Let's understand each with our e-commerce example.

## Relationship 1: One-to-Many - User to Orders

### Understanding the Concept

**Real-world meaning:**
- One customer (User) can place many orders
- Each order belongs to exactly one customer

**Database structure:**
```
users table:
  id | email           | full_name
  1  | john@example.com| John Doe
  2  | jane@example.com| Jane Smith

orders table:
  id | user_id | total_amount | status
  1  | 1       | 99.99        | pending
  2  | 1       | 149.99       | completed
  3  | 2       | 49.99        | pending
```

Notice: `orders.user_id` references `users.id`. This is a **foreign key**.

### Step 1: Creating the Tables

Let's see how to define this relationship:

```python
from sqlalchemy import Column, Integer, String, Numeric, ForeignKey
from sqlalchemy.orm import relationship

class User(Base):
    """
    Customer in our e-commerce system.
    One user can have many orders.
    """
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True)
    full_name = Column(String(200))
    
    # Relationship: One user has many orders
    # This lets you do: user.orders to get all orders
    orders = relationship("Order", back_populates="user")


class Order(Base):
    """
    Order placed by a user.
    Each order belongs to one user.
    """
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True)
    
    # Foreign Key: Links to users table
    # This column stores the user's ID
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    total_amount = Column(Numeric(10, 2))
    status = Column(String(50))
    
    # Relationship: Order belongs to one user
    # This lets you do: order.user to get the user
    user = relationship("User", back_populates="orders")
```

### Understanding Foreign Keys

**What is a foreign key?**
- `user_id = ForeignKey("users.id")` means:
  - This column references the `id` column in the `users` table
  - Database enforces: you can't create an order with a user_id that doesn't exist
  - If you try: `Order(user_id=999)` where user 999 doesn't exist → ERROR

**Why use foreign keys?**
- **Data integrity**: Prevents orphaned records
- **Relationships**: Database knows tables are connected
- **Performance**: Can create indexes on foreign keys

### Understanding `relationship()` and `back_populates`

**What `relationship()` does:**
- Creates a Python attribute to access related objects
- Doesn't create a database column (that's the foreign key's job)
- Allows navigation: `user.orders` or `order.user`

**What `back_populates` does:**
- Creates bidirectional link between two relationships
- `User.orders` and `Order.user` know about each other
- When you add order to user.orders, order.user is automatically set

**Example:**
```python
user = User(email="john@example.com", full_name="John Doe")
order = Order(total_amount=99.99)

# Method 1: Set foreign key directly
order.user_id = user.id

# Method 2: Use relationship (easier!)
user.orders.append(order)  # Automatically sets order.user_id
# Now order.user also points to user automatically!
```

### Using One-to-Many Relationships

Let's see relationships in action:

**Example 1: Creating related records**

```python
async def create_user_with_order():
    """Create a user and their first order."""
    async with async_session_maker() as session:
        # Create user
        user = User(
            email="john@example.com",
            full_name="John Doe"
        )
        session.add(user)
        await session.flush()  # Gets user.id
        
        # Create order using relationship
        order = Order(
            total_amount=99.99,
            status="pending",
            user=user  # Use relationship, not user_id!
        )
        session.add(order)
        
        # Or add order to user's orders list
        # user.orders.append(order)  # Alternative way
        
        await session.commit()
        
        return user, order
```

**Example 2: Reading related data**

```python
async def get_user_with_orders(user_id: int):
    """Get a user and all their orders."""
    from sqlalchemy.orm import selectinload
    
    async with async_session_maker() as session:
        # Load user with orders eagerly
        stmt = select(User).options(
            selectinload(User.orders)  # Load orders immediately
        ).where(User.id == user_id)
        
        result = await session.execute(stmt)
        user = result.scalar_one_or_none()
        
        if user:
            print(f"User: {user.full_name}")
            print(f"Orders: {len(user.orders)}")
            for order in user.orders:
                print(f"  - Order #{order.id}: ${order.total_amount}")
        
        return user
```

**Example 3: Navigating from order to user**

```python
async def get_order_with_customer(order_id: int):
    """Get an order and its customer information."""
    from sqlalchemy.orm import selectinload
    
    async with async_session_maker() as session:
        stmt = select(Order).options(
            selectinload(Order.user)  # Load user immediately
        ).where(Order.id == order_id)
        
        result = await session.execute(stmt)
        order = result.scalar_one_or_none()
        
        if order:
            print(f"Order #{order.id}: ${order.total_amount}")
            print(f"Customer: {order.user.full_name} ({order.user.email})")
        
        return order
```

## Relationship 2: Many-to-Many - Orders and Products

### Understanding the Concept

**Real-world meaning:**
- One order can contain many products
- One product can be in many orders

**The problem:**
You can't put a foreign key in either table because:
- Order table: Can't have multiple product_id columns (how many? unknown)
- Product table: Can't have multiple order_id columns (same problem)

**The solution:**
Create a **join table** (also called junction table or association table):
```
order_items table:
  id | order_id | product_id | quantity | unit_price
  1  | 1        | 5          | 2        | 99.99
  2  | 1        | 8          | 1        | 49.99
  3  | 2        | 5          | 1        | 99.99
```

This table links orders and products. Each row represents "order X has Y quantity of product Z".

### Step 1: Creating the Join Table

```python
class OrderItem(Base):
    """
    Join table between Orders and Products.
    This represents "one product in one order".
    """
    __tablename__ = "order_items"
    
    id = Column(Integer, primary_key=True)
    
    # Foreign keys to both orders and products
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    
    # Additional data specific to this relationship
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)  # Price at time of purchase
    
    # Relationships: Access parent order and product
    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")


class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    total_amount = Column(Numeric(10, 2))
    
    user = relationship("User", back_populates="orders")
    
    # Relationship: One order has many items
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(200))
    price = Column(Numeric(10, 2))
    
    # Relationship: One product can be in many order items
    order_items = relationship("OrderItem", back_populates="product")
```

### Understanding Cascade

**`cascade="all, delete-orphan"` means:**
- When you delete an order, automatically delete its items
- When you remove an item from `order.items`, delete it from database
- Prevents orphaned records (items without an order)

**Other cascade options:**
- `cascade="all"` - Delete items when order deleted
- `cascade="save-update"` - Save items when order saved
- No cascade - Items remain even if order deleted (orphaned!)

### Using Many-to-Many Relationships

**Example 1: Creating order with multiple products**

```python
async def create_order_with_items(user_id: int, items: List[Dict]):
    """
    Create an order with multiple products.
    
    Args:
        user_id: User placing the order
        items: List of {"product_id": X, "quantity": Y}
    
    Example:
        order = await create_order_with_items(
            user_id=1,
            items=[
                {"product_id": 1, "quantity": 2},  # 2 laptops
                {"product_id": 2, "quantity": 1},  # 1 mouse
            ]
        )
    """
    async with async_session_maker() as session:
        # Get user
        user = await session.get(User, user_id)
        
        # Calculate total
        total = 0
        order_items = []
        
        for item_data in items:
            product = await session.get(Product, item_data["product_id"])
            quantity = item_data["quantity"]
            
            item_total = float(product.price) * quantity
            total += item_total
            
            # Create order item
            order_item = OrderItem(
                product=product,  # Use relationship
                quantity=quantity,
                unit_price=product.price
            )
            order_items.append(order_item)
        
        # Create order with items using relationship
        order = Order(
            user=user,
            total_amount=total,
            status="pending",
            items=order_items  # Add all items at once
        )
        
        session.add(order)
        await session.commit()
        
        return order
```

**Example 2: Finding all products in an order**

```python
async def get_products_in_order(order_id: int):
    """Get all products in an order."""
    from sqlalchemy.orm import selectinload
    
    async with async_session_maker() as session:
        stmt = select(Order).options(
            selectinload(Order.items).selectinload(OrderItem.product)
        ).where(Order.id == order_id)
        
        result = await session.execute(stmt)
        order = result.scalar_one_or_none()
        
        if order:
            print(f"Order #{order.id} contains:")
            for item in order.items:
                print(f"  - {item.product.name}: {item.quantity}x ${item.unit_price}")
        
        return order
```

**Example 3: Finding all orders containing a product**

```python
async def get_orders_with_product(product_id: int):
    """Find all orders that contain a specific product."""
    from sqlalchemy.orm import selectinload
    
    async with async_session_maker() as session:
        stmt = select(OrderItem).where(
            OrderItem.product_id == product_id
        ).options(
            selectinload(OrderItem.order).selectinload(Order.user)
        )
        
        result = await session.execute(stmt)
        order_items = result.scalars().all()
        
        orders = {}
        for item in order_items:
            if item.order_id not in orders:
                orders[item.order_id] = {
                    "order": item.order,
                    "quantity": 0
                }
            orders[item.order_id]["quantity"] += item.quantity
        
        return orders
```

## Relationship 3: One-to-One - User to Profile

### Understanding the Concept

**Real-world meaning:**
- One user has exactly one profile
- One profile belongs to exactly one user

**When to use:**
- Optional data that's not always needed
- Separate table for organization
- Rare, but useful in some cases

### Implementation

```python
class UserProfile(Base):
    """
    Additional profile information for a user.
    One-to-one relationship with User.
    """
    __tablename__ = "user_profiles"
    
    id = Column(Integer, primary_key=True)
    
    # Foreign key with unique constraint = one-to-one
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    
    bio = Column(Text, nullable=True)
    phone = Column(String(20), nullable=True)
    address = Column(String(500), nullable=True)
    
    # Relationship: Profile belongs to one user
    user = relationship("User", back_populates="profile")


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True)
    
    orders = relationship("Order", back_populates="user")
    
    # Relationship: User has one profile (optional)
    profile = relationship("UserProfile", back_populates="user", uselist=False)
```

**Key difference:**
- `uselist=False` tells SQLAlchemy this is one-to-one, not one-to-many
- `unique=True` on foreign key ensures one-to-one in database

## Understanding Lazy vs Eager Loading

This is crucial for relationships!

### Lazy Loading (Default)

**What it means:**
- Relationships are loaded only when accessed
- Separate database query is made when you access the relationship

**Example:**
```python
# Query 1: Get user
user = await session.get(User, 1)

# Query 2: Load orders when accessed (lazy load)
for order in user.orders:  # Triggers separate SELECT query
    print(order.id)
```

**Problem:**
- If session is closed, accessing relationship fails
- Can cause N+1 query problem (many queries for many records)

### Eager Loading (Recommended)

**What it means:**
- Load relationships immediately in the same or separate query
- Relationships are available even after session closes

**Methods:**

**1. Selectinload (separate query, recommended)**
```python
from sqlalchemy.orm import selectinload

stmt = select(User).options(
    selectinload(User.orders)  # Load orders in separate query
)
user = await session.execute(stmt).scalar_one()
# user.orders is already loaded!
```

**2. Joinedload (single query with JOIN)**
```python
from sqlalchemy.orm import joinedload

stmt = select(User).options(
    joinedload(User.orders)  # JOIN orders table
)
user = await session.execute(stmt).scalar_one()
# user.orders loaded via JOIN
```

## Complete Example: All Relationships Together

Let's see everything working together:

```python
async def complete_relationship_example():
    """Complete example using all relationship types."""
    async with async_session_maker() as session:
        # 1. Create user with profile (one-to-one)
        user = User(email="john@example.com", full_name="John Doe")
        profile = UserProfile(
            user=user,  # One-to-one relationship
            bio="Software developer",
            phone="555-1234"
        )
        session.add_all([user, profile])
        await session.flush()
        
        # 2. Get products
        laptop = await session.get(Product, 1)
        mouse = await session.get(Product, 2)
        
        # 3. Create order with items (one-to-many, many-to-many)
        order_item1 = OrderItem(
            product=laptop,
            quantity=1,
            unit_price=laptop.price
        )
        order_item2 = OrderItem(
            product=mouse,
            quantity=2,
            unit_price=mouse.price
        )
        
        order = Order(
            user=user,  # One-to-many: user has many orders
            total_amount=float(laptop.price) + (2 * float(mouse.price)),
            items=[order_item1, order_item2]  # One-to-many: order has many items
        )
        session.add(order)
        
        await session.commit()
        
        # 4. Navigate relationships
        print(f"User: {user.full_name}")
        print(f"Profile: {user.profile.bio}")  # One-to-one
        print(f"Orders: {len(user.orders)}")  # One-to-many
        
        for order in user.orders:
            print(f"  Order #{order.id}: ${order.total_amount}")
            for item in order.items:  # One-to-many: order to items
                print(f"    - {item.product.name}")  # Many-to-one: item to product
        
        return user
```

## Summary: Relationship Cheat Sheet

| Relationship Type | Example | Foreign Key | relationship() |
|------------------|---------|-------------|----------------|
| **One-to-Many** | User → Orders | In "many" table (orders.user_id) | `user.orders = relationship("Order")` |
| **Many-to-One** | OrderItem → Product | In "many" table (order_items.product_id) | `item.product = relationship("Product")` |
| **Many-to-Many** | Orders ↔ Products | In join table (order_items) | Join table has both relationships |
| **One-to-One** | User ↔ Profile | In one table with unique=True | `uselist=False` |

**Key Takeaways:**
1. Foreign keys go in the "many" side of relationships
2. `relationship()` creates Python attributes for navigation
3. `back_populates` creates bidirectional links
4. Use eager loading (selectinload) for production
5. Cascade controls what happens when parent is deleted

Now you understand relationships from A to Z!

