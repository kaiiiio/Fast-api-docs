# Async SQLAlchemy Deep Dive: Complete E-Commerce Example

This guide teaches async SQLAlchemy from scratch using a real e-commerce example. We'll build a complete system with Users, Products, Orders, and OrderItems, learning every concept step by step.

## Our Example: E-Commerce System

Throughout this guide, we'll work with these tables:
- **users** - Customer information
- **products** - Available items for sale
- **categories** - Product categories
- **orders** - Customer orders
- **order_items** - Items in each order

Let's build this from the ground up!

## Step 1: Setting Up the Database Engine

Before we can do anything, we need to connect to PostgreSQL. Let's understand each part:

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import Column, Integer, String, DateTime, Numeric, ForeignKey
from datetime import datetime

# Step 1.1: Create the base class for all models
Base = declarative_base()

# Step 1.2: Create the async engine
# This manages the connection pool to PostgreSQL
engine = create_async_engine(
    "postgresql+asyncpg://user:password@localhost/ecommerce_db",
    echo=True,  # Shows SQL queries in console (helpful for learning!)
    future=True,
    pool_size=10,  # Keep 10 connections ready
    max_overflow=20  # Can create 20 more if needed
)

# Step 1.3: Create session factory
# Sessions are like "workspaces" for database operations
async_session_maker = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False  # Keep objects after commit (useful!)
)
```

**Understanding each part:**

**`create_async_engine`:**
- Creates a connection pool (reuses connections efficiently)
- `postgresql+asyncpg` - Uses asyncpg driver (async PostgreSQL)
- `echo=True` - Prints all SQL queries (remove in production)
- `pool_size=10` - Maintains 10 connections ready to use

**`sessionmaker`:**
- Factory that creates new sessions
- `AsyncSession` - Async version (non-blocking)
- `expire_on_commit=False` - Objects stay valid after commit

## Step 2: Creating Our First Table - Users

Let's start simple with just a users table:

```python
class User(Base):
    """
    Represents a customer in our e-commerce system.
    
    Attributes:
        id: Unique identifier (auto-incrementing)
        email: Customer email (must be unique)
        full_name: Customer's full name
        created_at: When account was created
    """
    __tablename__ = "users"  # Table name in database
    
    # Primary key - uniquely identifies each user
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Email must be unique - no two users can have same email
    email = Column(String(255), unique=True, nullable=False, index=True)
    
    # Full name can be up to 200 characters
    full_name = Column(String(200), nullable=False)
    
    # Timestamp when user was created
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}')>"
```

**What each Column parameter means:**

- `Integer` - Stores integers (1, 2, 3, ...)
- `String(255)` - Stores text, max 255 characters
- `primary_key=True` - This is the unique identifier
- `autoincrement=True` - Database automatically assigns 1, 2, 3, ...
- `unique=True` - No duplicates allowed
- `nullable=False` - Cannot be empty/NULL
- `index=True` - Creates index for faster lookups

## Step 3: Creating Products and Categories Tables

Now let's add products with categories:

```python
class Category(Base):
    """
    Product categories (e.g., "Electronics", "Books", "Clothing").
    """
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(500), nullable=True)  # Optional field
    created_at = Column(DateTime, default=datetime.utcnow)


class Product(Base):
    """
    Products available for purchase.
    
    Each product belongs to a category (foreign key relationship).
    """
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    price = Column(Numeric(10, 2), nullable=False)  # Decimal: 10 digits, 2 decimals
    stock_quantity = Column(Integer, default=0, nullable=False)
    
    # Foreign Key: Links product to category
    # This means each product must belong to a category
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
```

**Understanding Foreign Keys:**

A foreign key creates a relationship. `category_id = ForeignKey("categories.id")` means:
- Each product references one category
- The category must exist (database enforces this)
- If you try to delete a category with products, you'll get an error

## Step 4: Understanding Relationships - One-to-Many

Now let's see how to navigate between related tables. SQLAlchemy relationships let you access related data easily:

```python
from sqlalchemy.orm import relationship

class Category(Base):
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    
    # Relationship: One category has many products
    # This lets you do: category.products to get all products
    products = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    
    # Relationship: Each product belongs to one category
    # This lets you do: product.category to get the category
    category = relationship("Category", back_populates="products")
```

**What `back_populates` means:**

- `products = relationship("Product", back_populates="category")` in Category
- `category = relationship("Category", back_populates="products")` in Product

These two create a **bidirectional link**:
- From category: `category.products` → list of all products in that category
- From product: `product.category` → the category this product belongs to

## Step 5: Creating Orders and OrderItems - Many-to-Many

An order can have multiple products, and a product can be in multiple orders. This is a many-to-many relationship, but we implement it with an intermediate table:

```python
class Order(Base):
    """
    Customer order.
    
    One order can have many items (one-to-many with OrderItem).
    """
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Foreign key to user
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Order status
    status = Column(String(50), default="pending", nullable=False)  # pending, completed, cancelled
    total_amount = Column(Numeric(10, 2), nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationship: One order has many items
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    
    # Relationship: Order belongs to one user
    user = relationship("User", back_populates="orders")


class OrderItem(Base):
    """
    Individual item in an order.
    
    This is the "join table" between Order and Product.
    Each row represents one product in one order with a quantity.
    """
    __tablename__ = "order_items"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Foreign keys: Links to both order and product
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    
    # How many of this product in the order
    quantity = Column(Integer, nullable=False)
    
    # Price at time of purchase (snapshot, in case product price changes)
    unit_price = Column(Numeric(10, 2), nullable=False)
    
    # Relationships
    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")


# Add relationship to User
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    full_name = Column(String(200), nullable=False)
    
    # Relationship: One user has many orders
    orders = relationship("Order", back_populates="user")


# Add relationship to Product
class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    
    category = relationship("Category", back_populates="products")
    
    # Relationship: One product can be in many order items
    order_items = relationship("OrderItem", back_populates="product")
```

**Understanding cascade:**

`cascade="all, delete-orphan"` means:
- When you delete an order, automatically delete its items
- When you remove an item from order.items list, delete it from database
- This prevents orphaned records

## Step 6: Creating the Database Tables

Now let's create all these tables in PostgreSQL:

```python
async def create_tables():
    """Create all tables in the database."""
    async with engine.begin() as conn:
        # This creates all tables defined in Base
        await conn.run_sync(Base.metadata.create_all)
        print("Tables created successfully!")

# Run it
import asyncio
asyncio.run(create_tables())
```

**What happens:**
1. SQLAlchemy looks at all classes that inherit from `Base`
2. Creates SQL CREATE TABLE statements
3. Executes them in PostgreSQL
4. All tables are now ready!

## Step 7: Basic CRUD Operations - Create

Let's start creating data:

```python
async def create_category(name: str, description: str = None):
    """
    Create a new category.
    
    Example:
        category = await create_category("Electronics", "Electronic devices")
    """
    async with async_session_maker() as session:
        # Step 1: Create the object
        category = Category(
            name=name,
            description=description
        )
        
        # Step 2: Add to session (stages it for insert)
        session.add(category)
        
        # Step 3: Flush - sends SQL to database, gets ID back
        await session.flush()
        print(f"Category created with ID: {category.id}")
        
        # Step 4: Commit - makes changes permanent
        await session.commit()
        
        # Step 5: Refresh - reloads from database (gets any defaults)
        await session.refresh(category)
        
        return category

# Usage
category = await create_category("Electronics", "Electronic devices and gadgets")
```

**Understanding the steps:**

1. **Create object** - Just a Python object, not in database yet
2. **session.add()** - Tells SQLAlchemy "I want to save this"
3. **session.flush()** - Sends INSERT to database, gets auto-generated ID
4. **session.commit()** - Makes transaction permanent (can be rolled back before this)
5. **session.refresh()** - Reloads from database (useful if database sets defaults)

## Step 8: Creating Related Data

Now let's create a product that belongs to a category:

```python
async def create_product(name: str, price: float, category_id: int, stock: int = 0):
    """
    Create a new product in a category.
    
    Example:
        product = await create_product(
            "Laptop", 
            999.99, 
            category_id=1,  # Electronics category
            stock=10
        )
    """
    async with async_session_maker() as session:
        # Create product object
        product = Product(
            name=name,
            price=price,
            category_id=category_id,
            stock_quantity=stock
        )
        
        session.add(product)
        await session.flush()  # Gets ID
        await session.commit()
        await session.refresh(product)
        
        return product

# Usage
laptop = await create_product("Gaming Laptop", 1299.99, category_id=1, stock=5)
```

**Using relationships instead of IDs:**

You can also use the relationship:

```python
async def create_product_with_category(name: str, price: float, category: Category):
    """
    Create product using relationship instead of ID.
    
    Example:
        electronics = await create_category("Electronics")
        laptop = await create_product_with_category("Laptop", 999.99, electronics)
    """
    async with async_session_maker() as session:
        # Add category to session if it's new
        session.add(category)
        
        # Create product using relationship
        product = Product(
            name=name,
            price=price,
            category=category  # Use relationship, not category_id!
        )
        
        session.add(product)
        await session.commit()
        
        return product
```

## Step 9: Reading Data - SELECT Operations

Let's learn to query data:

### Reading a Single Record by ID

```python
async def get_user_by_id(user_id: int):
    """
    Get a user by their ID.
    
    Returns None if user doesn't exist.
    """
    async with async_session_maker() as session:
        # Method 1: Using get() - simplest for primary key
        user = await session.get(User, user_id)
        return user

# Usage
user = await get_user_by_id(1)
if user:
    print(f"Found user: {user.email}")
else:
    print("User not found")
```

### Reading with Conditions

```python
async def get_user_by_email(email: str):
    """
    Find user by email address.
    
    Example:
        user = await get_user_by_email("john@example.com")
    """
    from sqlalchemy import select
    
    async with async_session_maker() as session:
        # Create SELECT statement
        stmt = select(User).where(User.email == email)
        
        # Execute and get result
        result = await session.execute(stmt)
        
        # Get one result or None
        user = result.scalar_one_or_none()
        return user
```

**Understanding `select()`:**

- `select(User)` - SELECT * FROM users
- `.where(User.email == email)` - WHERE email = ?
- `scalar_one_or_none()` - Returns one object or None (safe)

### Reading Multiple Records

```python
async def get_all_products():
    """
    Get all products.
    
    Returns list of all Product objects.
    """
    from sqlalchemy import select
    
    async with async_session_maker() as session:
        stmt = select(Product).order_by(Product.created_at.desc())
        
        result = await session.execute(stmt)
        
        # Get all results as a list
        products = result.scalars().all()
        return products

async def get_products_in_category(category_id: int):
    """
    Get all products in a specific category.
    
    Example:
        electronics_products = await get_products_in_category(1)
    """
    from sqlalchemy import select
    
    async with async_session_maker() as session:
        stmt = select(Product).where(
            Product.category_id == category_id
        ).order_by(Product.name)
        
        result = await session.execute(stmt)
        return list(result.scalars().all())
```

## Step 10: Using Relationships to Navigate

This is where relationships shine - you can navigate between related data easily:

```python
async def get_category_with_products(category_id: int):
    """
    Get a category and all its products using relationships.
    
    Example:
        electronics = await get_category_with_products(1)
        print(f"Category: {electronics.name}")
        for product in electronics.products:
            print(f"  - {product.name}: ${product.price}")
    """
    async with async_session_maker() as session:
        category = await session.get(Category, category_id)
        
        if category:
            # Access products through relationship
            # This triggers a lazy load (separate query)
            print(f"Category: {category.name}")
            for product in category.products:
                print(f"  Product: {product.name}, Price: ${product.price}")
        
        return category
```

**Problem with lazy loading:**

By default, relationships load lazily (separate query when accessed). If session is closed, this fails:

```python
# ❌ This will fail!
async def bad_example():
    async with async_session_maker() as session:
        category = await session.get(Category, 1)
    # Session closed here!
    print(category.products)  # Error: session closed
```

**Solution: Eager Loading**

Load relationships immediately:

```python
from sqlalchemy.orm import selectinload

async def get_category_with_products_eager(category_id: int):
    """
    Get category with products loaded immediately (eager loading).
    
    This avoids the lazy loading problem.
    """
    from sqlalchemy import select
    
    async with async_session_maker() as session:
        # Load category AND products in one go
        stmt = select(Category).options(
            selectinload(Category.products)  # Eager load products
        ).where(Category.id == category_id)
        
        result = await session.execute(stmt)
        category = result.scalar_one_or_none()
        
        # Products are already loaded - no additional query!
        if category:
            print(f"Category: {category.name}")
            for product in category.products:  # Already loaded!
                print(f"  Product: {product.name}")
        
        return category
```

## Step 11: Complex Queries - Joins

Let's query across multiple tables:

```python
async def get_orders_with_items_and_products(user_id: int):
    """
    Get all orders for a user, including items and product details.
    
    This requires joining orders -> order_items -> products
    """
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload, joinedload
    
    async with async_session_maker() as session:
        # Load order with nested relationships
        stmt = select(Order).where(
            Order.user_id == user_id
        ).options(
            # Load order items
            selectinload(Order.items).selectinload(OrderItem.product)
        )
        
        result = await session.execute(stmt)
        orders = result.scalars().all()
        
        # Now you can navigate easily
        for order in orders:
            print(f"Order #{order.id}: ${order.total_amount}")
            for item in order.items:
                print(f"  - {item.product.name}: {item.quantity}x ${item.unit_price}")
        
        return orders
```

## Step 12: Creating an Order with Items - Complex Example

Let's create a complete order with multiple items:

```python
async def create_order(user_id: int, items: list[dict]):
    """
    Create an order with multiple items.
    
    Args:
        user_id: ID of the user placing the order
        items: List of dicts with 'product_id' and 'quantity'
    
    Example:
        order = await create_order(
            user_id=1,
            items=[
                {"product_id": 1, "quantity": 2},  # 2 laptops
                {"product_id": 2, "quantity": 1},  # 1 mouse
            ]
        )
    """
    async with async_session_maker() as session:
        try:
            # Step 1: Get user
            user = await session.get(User, user_id)
            if not user:
                raise ValueError(f"User {user_id} not found")
            
            # Step 2: Calculate total and validate stock
            total_amount = 0
            order_items = []
            
            for item_data in items:
                product = await session.get(Product, item_data["product_id"])
                if not product:
                    raise ValueError(f"Product {item_data['product_id']} not found")
                
                quantity = item_data["quantity"]
                
                # Check stock
                if product.stock_quantity < quantity:
                    raise ValueError(
                        f"Not enough stock for {product.name}. "
                        f"Available: {product.stock_quantity}, Requested: {quantity}"
                    )
                
                # Calculate item total
                item_total = float(product.price) * quantity
                total_amount += item_total
                
                # Create order item
                order_item = OrderItem(
                    product_id=product.id,
                    quantity=quantity,
                    unit_price=product.price
                )
                order_items.append(order_item)
                
                # Reduce stock
                product.stock_quantity -= quantity
            
            # Step 3: Create order
            order = Order(
                user_id=user_id,
                total_amount=total_amount,
                status="pending",
                items=order_items  # Add items using relationship
            )
            
            session.add(order)
            await session.flush()  # Gets order ID, saves items
            await session.commit()
            await session.refresh(order)
            
            return order
            
        except Exception as e:
            await session.rollback()  # Undo all changes on error
            raise
```

**Understanding transactions:**

All these operations happen in one transaction:
- If any step fails, `rollback()` undoes everything
- If all succeed, `commit()` makes it permanent
- This ensures data consistency (all or nothing)

## Step 13: Update Operations

Let's update existing records:

```python
async def update_product_price(product_id: int, new_price: float):
    """
    Update a product's price.
    
    Example:
        await update_product_price(1, 899.99)
    """
    async with async_session_maker() as session:
        # Get existing product
        product = await session.get(Product, product_id)
        if not product:
            raise ValueError(f"Product {product_id} not found")
        
        # Update the attribute
        product.price = new_price
        
        # Commit the change
        await session.commit()
        await session.refresh(product)
        
        return product
```

**Batch updates:**

Update multiple records at once:

```python
async def update_stock_for_category(category_id: int, stock_change: int):
    """
    Add stock to all products in a category.
    
    Example:
        # Add 10 units to all electronics
        await update_stock_for_category(1, 10)
    """
    from sqlalchemy import update
    
    async with async_session_maker() as session:
        stmt = update(Product).where(
            Product.category_id == category_id
        ).values(
            stock_quantity=Product.stock_quantity + stock_change
        )
        
        await session.execute(stmt)
        await session.commit()
```

## Step 14: Delete Operations

Deleting records:

```python
async def delete_product(product_id: int):
    """
    Delete a product (if no orders reference it).
    
    Example:
        await delete_product(5)
    """
    async with async_session_maker() as session:
        product = await session.get(Product, product_id)
        if not product:
            raise ValueError(f"Product {product_id} not found")
        
        # Check if product is in any orders
        if product.order_items:
            raise ValueError(
                f"Cannot delete product {product_id}: "
                f"it has been ordered {len(product.order_items)} times"
            )
        
        await session.delete(product)
        await session.commit()
```

## Step 15: Aggregations and Grouping

Let's calculate statistics:

```python
async def get_category_stats():
    """
    Get statistics for each category: product count, total value, etc.
    
    Example:
        stats = await get_category_stats()
        for stat in stats:
            print(f"{stat.category_name}: {stat.product_count} products, "
                  f"total value: ${stat.total_value}")
    """
    from sqlalchemy import select, func
    
    async with async_session_maker() as session:
        stmt = select(
            Category.name.label("category_name"),
            func.count(Product.id).label("product_count"),
            func.sum(Product.price * Product.stock_quantity).label("total_value"),
            func.avg(Product.price).label("avg_price")
        ).join(
            Product, Category.id == Product.category_id
        ).group_by(
            Category.id, Category.name
        )
        
        result = await session.execute(stmt)
        return result.all()
```

## Complete Working Example

Here's a complete example putting it all together:

```python
async def complete_example():
    """Complete example: Create categories, products, user, and order."""
    async with async_session_maker() as session:
        try:
            # 1. Create categories
            electronics = Category(name="Electronics", description="Electronic devices")
            books = Category(name="Books", description="Physical and digital books")
            session.add_all([electronics, books])
            await session.flush()
            
            # 2. Create products
            laptop = Product(
                name="Gaming Laptop",
                price=1299.99,
                stock_quantity=10,
                category=electronics
            )
            book = Product(
                name="Python Programming",
                price=49.99,
                stock_quantity=50,
                category=books
            )
            session.add_all([laptop, book])
            await session.flush()
            
            # 3. Create user
            user = User(
                email="john@example.com",
                full_name="John Doe"
            )
            session.add(user)
            await session.flush()
            
            # 4. Create order with items
            order_item1 = OrderItem(
                product=laptop,
                quantity=1,
                unit_price=laptop.price
            )
            order_item2 = OrderItem(
                product=book,
                quantity=2,
                unit_price=book.price
            )
            
            order = Order(
                user=user,
                total_amount=float(laptop.price) + (2 * float(book.price)),
                status="pending",
                items=[order_item1, order_item2]
            )
            session.add(order)
            
            # 5. Update stock
            laptop.stock_quantity -= 1
            book.stock_quantity -= 2
            
            # 6. Commit everything
            await session.commit()
            
            # 7. Query and display
            await session.refresh(order)
            print(f"Order #{order.id} created for {user.full_name}")
            print(f"Total: ${order.total_amount}")
            for item in order.items:
                print(f"  - {item.product.name}: {item.quantity}x ${item.unit_price}")
            
            return order
            
        except Exception as e:
            await session.rollback()
            print(f"Error: {e}")
            raise
```

## Summary

You've learned:
1. ✅ Setting up async SQLAlchemy engine and sessions
2. ✅ Creating tables with columns and data types
3. ✅ Understanding foreign keys and relationships
4. ✅ One-to-many relationships (category → products)
5. ✅ Many-to-many via join table (orders ↔ products via order_items)
6. ✅ CRUD operations (Create, Read, Update, Delete)
7. ✅ Eager loading relationships
8. ✅ Complex queries with joins and aggregations
9. ✅ Transactions and error handling

Practice with these examples, and you'll master async SQLAlchemy!
