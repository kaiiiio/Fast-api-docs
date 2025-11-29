# CRUD with Repository Pattern: Complete E-Commerce Guide

This guide teaches the Repository pattern using our e-commerce example. We'll build complete repositories for Users, Products, Orders, and OrderItems, showing every operation from scratch.

## Understanding the Repository Pattern

**The Problem:**
Without repositories, database code is scattered everywhere. If you change databases, you have to update code in many places.

**The Solution:**
Repository pattern centralizes all database operations in one place. Your business logic (services) calls repositories, and repositories handle all database details.

**Benefits:**
- ✅ All database code in one place
- ✅ Easy to test (mock repositories)
- ✅ Easy to switch databases
- ✅ Clean separation of concerns

## Our E-Commerce Models

We'll work with these tables throughout:

```python
# Simplified models for reference
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True)
    full_name = Column(String(200))
    orders = relationship("Order", back_populates="user")

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True)
    name = Column(String(200))
    price = Column(Numeric(10, 2))
    stock_quantity = Column(Integer, default=0)
    category_id = Column(Integer, ForeignKey("categories.id"))
    category = relationship("Category", back_populates="products")

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    total_amount = Column(Numeric(10, 2))
    status = Column(String(50), default="pending")
    items = relationship("OrderItem", back_populates="order")
    user = relationship("User", back_populates="orders")

class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer)
    unit_price = Column(Numeric(10, 2))
    order = relationship("Order", back_populates="items")
    product = relationship("Product")
```

## Step 1: Base Repository Interface

Let's start by defining what a repository should do. This is our contract:

```python
from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any

class BaseRepositoryInterface(ABC):
    """
    Base interface that all repositories must implement.
    This defines the standard CRUD operations.
    """
    
    @abstractmethod
    async def get_by_id(self, id: int):
        """Get a record by its primary key."""
        pass
    
    @abstractmethod
    async def get_all(self, skip: int = 0, limit: int = 100):
        """Get all records with pagination."""
        pass
    
    @abstractmethod
    async def create(self, data: Dict[str, Any]):
        """Create a new record."""
        pass
    
    @abstractmethod
    async def update(self, id: int, data: Dict[str, Any]):
        """Update an existing record."""
        pass
    
    @abstractmethod
    async def delete(self, id: int):
        """Delete a record by ID."""
        pass
```

## Step 2: User Repository - Basic Implementation

Let's build a complete User repository step by step:

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
from app.models import User

class UserRepository:
    """
    Repository for User operations.
    Handles all database interactions for users.
    """
    
    def __init__(self, session: AsyncSession):
        """
        Initialize repository with a database session.
        
        Args:
            session: AsyncSession from SQLAlchemy
        """
        self.session = session
    
    # CREATE operations
    
    async def create(self, email: str, full_name: str) -> User:
        """
        Create a new user.
        
        Args:
            email: User's email address (must be unique)
            full_name: User's full name
        
        Returns:
            Created User object with ID assigned
        
        Example:
            user = await repo.create("john@example.com", "John Doe")
            print(user.id)  # Auto-generated ID
        """
        # Create the user object
        user = User(
            email=email,
            full_name=full_name
        )
        
        # Add to session (stages for insert)
        self.session.add(user)
        
        # Flush to get ID from database
        await self.session.flush()
        
        # Refresh to get any defaults from database
        await self.session.refresh(user)
        
        return user
    
    async def create_multiple(self, users_data: List[Dict[str, str]]) -> List[User]:
        """
        Create multiple users at once (bulk insert).
        
        Args:
            users_data: List of dicts with 'email' and 'full_name'
        
        Example:
            users = await repo.create_multiple([
                {"email": "alice@example.com", "full_name": "Alice Smith"},
                {"email": "bob@example.com", "full_name": "Bob Johnson"},
            ])
        """
        users = [
            User(email=data["email"], full_name=data["full_name"])
            for data in users_data
        ]
        
        self.session.add_all(users)
        await self.session.flush()
        
        # Refresh all users
        for user in users:
            await self.session.refresh(user)
        
        return users
    
    # READ operations
    
    async def get_by_id(self, user_id: int) -> Optional[User]:
        """
        Get a user by their ID.
        
        Args:
            user_id: The user's ID
        
        Returns:
            User object or None if not found
        
        Example:
            user = await repo.get_by_id(1)
            if user:
                print(user.email)
        """
        return await self.session.get(User, user_id)
    
    async def get_by_email(self, email: str) -> Optional[User]:
        """
        Find a user by email address.
        
        Args:
            email: Email address to search for
        
        Returns:
            User object or None if not found
        
        Example:
            user = await repo.get_by_email("john@example.com")
        """
        stmt = select(User).where(User.email == email)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
    
    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        order_by: str = "created_at"
    ) -> List[User]:
        """
        Get all users with pagination.
        
        Args:
            skip: Number of records to skip (for pagination)
            limit: Maximum number of records to return
            order_by: Field to sort by (default: created_at)
        
        Returns:
            List of User objects
        
        Example:
            # Get first 20 users
            users = await repo.get_all(skip=0, limit=20)
            
            # Get next 20 users (page 2)
            users = await repo.get_all(skip=20, limit=20)
        """
        stmt = select(User)
        
        # Order by specified field
        if hasattr(User, order_by):
            order_column = getattr(User, order_by)
            stmt = stmt.order_by(order_column.desc())
        else:
            stmt = stmt.order_by(User.created_at.desc())
        
        # Apply pagination
        stmt = stmt.offset(skip).limit(limit)
        
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
    
    async def search_by_name(self, search_term: str) -> List[User]:
        """
        Search users by name (case-insensitive partial match).
        
        Args:
            search_term: Text to search for in user names
        
        Returns:
            List of matching User objects
        
        Example:
            users = await repo.search_by_name("john")  # Finds "John", "Johnson", etc.
        """
        stmt = select(User).where(
            User.full_name.ilike(f"%{search_term}%")
        ).order_by(User.full_name)
        
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
    
    async def count(self) -> int:
        """
        Count total number of users.
        
        Returns:
            Total count of users
        
        Example:
            total_users = await repo.count()
            print(f"We have {total_users} users")
        """
        from sqlalchemy import func
        
        stmt = select(func.count(User.id))
        result = await self.session.execute(stmt)
        return result.scalar()
    
    # UPDATE operations
    
    async def update(self, user_id: int, updates: Dict[str, Any]) -> Optional[User]:
        """
        Update user fields.
        
        Args:
            user_id: ID of user to update
            updates: Dictionary of fields to update
        
        Returns:
            Updated User object or None if not found
        
        Example:
            user = await repo.update(1, {"full_name": "John Smith"})
            user = await repo.update(1, {"email": "newemail@example.com"})
        """
        # Get existing user
        user = await self.get_by_id(user_id)
        if not user:
            return None
        
        # Update fields
        for key, value in updates.items():
            if hasattr(user, key):
                setattr(user, key, value)
        
        # Flush changes to database
        await self.session.flush()
        await self.session.refresh(user)
        
        return user
    
    async def update_email(self, user_id: int, new_email: str) -> Optional[User]:
        """
        Update user email with validation.
        
        Args:
            user_id: ID of user
            new_email: New email address
        
        Returns:
            Updated User or None if not found
        
        Raises:
            ValueError: If email already exists
        """
        # Check if email is already taken
        existing = await self.get_by_email(new_email)
        if existing and existing.id != user_id:
            raise ValueError(f"Email {new_email} is already in use")
        
        return await self.update(user_id, {"email": new_email})
    
    # DELETE operations
    
    async def delete(self, user_id: int) -> bool:
        """
        Delete a user by ID.
        
        Args:
            user_id: ID of user to delete
        
        Returns:
            True if deleted, False if user not found
        
        Example:
            deleted = await repo.delete(1)
            if deleted:
                print("User deleted successfully")
        """
        user = await self.get_by_id(user_id)
        if not user:
            return False
        
        await self.session.delete(user)
        await self.session.flush()
        return True
    
    async def delete_by_email(self, email: str) -> bool:
        """
        Delete a user by email address.
        
        Args:
            email: Email of user to delete
        
        Returns:
            True if deleted, False if not found
        """
        user = await self.get_by_email(email)
        if not user:
            return False
        
        await self.session.delete(user)
        await self.session.flush()
        return True
```

## Step 3: Product Repository with Relationships

Now let's build a Product repository that handles category relationships:

```python
from app.models import Product, Category
from sqlalchemy.orm import selectinload

class ProductRepository:
    """Repository for Product operations."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    # CREATE operations
    
    async def create(
        self,
        name: str,
        price: float,
        category_id: int,
        description: str = None,
        stock_quantity: int = 0
    ) -> Product:
        """
        Create a new product.
        
        Args:
            name: Product name
            price: Product price
            category_id: ID of category this product belongs to
            description: Optional product description
            stock_quantity: Initial stock quantity
        
        Returns:
            Created Product object
        
        Example:
            product = await repo.create(
                name="Gaming Laptop",
                price=1299.99,
                category_id=1,  # Electronics
                description="High-performance gaming laptop",
                stock_quantity=10
            )
        """
        product = Product(
            name=name,
            price=price,
            category_id=category_id,
            description=description,
            stock_quantity=stock_quantity
        )
        
        self.session.add(product)
        await self.session.flush()
        await self.session.refresh(product)
        
        return product
    
    async def create_with_category(
        self,
        name: str,
        price: float,
        category: Category,
        **kwargs
    ) -> Product:
        """
        Create product using Category object instead of ID.
        
        Example:
            electronics = await category_repo.get_by_id(1)
            laptop = await repo.create_with_category(
                "Laptop",
                999.99,
                electronics
            )
        """
        product = Product(
            name=name,
            price=price,
            category=category,  # Use relationship
            **kwargs
        )
        
        self.session.add(product)
        await self.session.flush()
        await self.session.refresh(product)
        
        return product
    
    # READ operations
    
    async def get_by_id(self, product_id: int, include_category: bool = False) -> Optional[Product]:
        """
        Get product by ID.
        
        Args:
            product_id: Product ID
            include_category: If True, eagerly load category relationship
        
        Returns:
            Product object or None
        """
        if include_category:
            stmt = select(Product).options(
                selectinload(Product.category)
            ).where(Product.id == product_id)
            
            result = await self.session.execute(stmt)
            return result.scalar_one_or_none()
        else:
            return await self.session.get(Product, product_id)
    
    async def get_by_category(self, category_id: int) -> List[Product]:
        """
        Get all products in a category.
        
        Args:
            category_id: Category ID
        
        Returns:
            List of products in that category
        
        Example:
            electronics_products = await repo.get_by_category(1)
        """
        stmt = select(Product).where(
            Product.category_id == category_id
        ).order_by(Product.name)
        
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
    
    async def search(self, query: str, min_price: float = None, max_price: float = None) -> List[Product]:
        """
        Search products by name with optional price filters.
        
        Args:
            query: Text to search in product names
            min_price: Minimum price filter
            max_price: Maximum price filter
        
        Returns:
            List of matching products
        
        Example:
            # Search for "laptop" between $500 and $2000
            products = await repo.search("laptop", min_price=500, max_price=2000)
        """
        from sqlalchemy import and_
        
        stmt = select(Product).where(
            Product.name.ilike(f"%{query}%")
        )
        
        # Add price filters if provided
        conditions = []
        if min_price is not None:
            conditions.append(Product.price >= min_price)
        if max_price is not None:
            conditions.append(Product.price <= max_price)
        
        if conditions:
            stmt = stmt.where(and_(*conditions))
        
        stmt = stmt.order_by(Product.price)
        
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
    
    async def get_low_stock(self, threshold: int = 5) -> List[Product]:
        """
        Get products with low stock.
        
        Args:
            threshold: Stock quantity threshold
        
        Returns:
            List of products with stock <= threshold
        
        Example:
            low_stock = await repo.get_low_stock(threshold=10)
        """
        stmt = select(Product).where(
            Product.stock_quantity <= threshold
        ).order_by(Product.stock_quantity)
        
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
    
    # UPDATE operations
    
    async def update_price(self, product_id: int, new_price: float) -> Optional[Product]:
        """Update product price."""
        product = await self.get_by_id(product_id)
        if not product:
            return None
        
        product.price = new_price
        await self.session.flush()
        await self.session.refresh(product)
        return product
    
    async def update_stock(self, product_id: int, quantity_change: int) -> Optional[Product]:
        """
        Update stock quantity (add or subtract).
        
        Args:
            product_id: Product ID
            quantity_change: Amount to add (positive) or subtract (negative)
        
        Returns:
            Updated Product or None
        
        Example:
            # Add 10 units
            await repo.update_stock(1, 10)
            
            # Subtract 5 units
            await repo.update_stock(1, -5)
        """
        product = await self.get_by_id(product_id)
        if not product:
            return None
        
        new_quantity = product.stock_quantity + quantity_change
        if new_quantity < 0:
            raise ValueError(
                f"Cannot reduce stock below 0. "
                f"Current: {product.stock_quantity}, Requested change: {quantity_change}"
            )
        
        product.stock_quantity = new_quantity
        await self.session.flush()
        await self.session.refresh(product)
        return product
    
    async def bulk_update_prices(self, updates: Dict[int, float]) -> int:
        """
        Update prices for multiple products.
        
        Args:
            updates: Dictionary mapping product_id -> new_price
        
        Returns:
            Number of products updated
        
        Example:
            updated_count = await repo.bulk_update_prices({
                1: 999.99,
                2: 49.99,
                3: 199.99,
            })
        """
        from sqlalchemy import update
        
        count = 0
        for product_id, new_price in updates.items():
            stmt = update(Product).where(
                Product.id == product_id
            ).values(price=new_price)
            
            result = await self.session.execute(stmt)
            if result.rowcount > 0:
                count += 1
        
        await self.session.flush()
        return count
```

## Step 4: Order Repository - Complex Relationships

Orders are more complex because they involve relationships with users and items:

```python
from app.models import Order, OrderItem, User, Product

class OrderRepository:
    """Repository for Order operations with complex relationships."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    # CREATE operations
    
    async def create_order(
        self,
        user_id: int,
        items: List[Dict[str, Any]]
    ) -> Order:
        """
        Create a complete order with items.
        
        Args:
            user_id: ID of user placing the order
            items: List of dicts with 'product_id', 'quantity'
        
        Returns:
            Created Order with items
        
        Example:
            order = await repo.create_order(
                user_id=1,
                items=[
                    {"product_id": 1, "quantity": 2},  # 2 laptops
                    {"product_id": 2, "quantity": 1},  # 1 mouse
                ]
            )
        """
        # Get user
        user = await self.session.get(User, user_id)
        if not user:
            raise ValueError(f"User {user_id} not found")
        
        # Calculate total and create items
        total_amount = 0
        order_items = []
        
        for item_data in items:
            product = await self.session.get(Product, item_data["product_id"])
            if not product:
                raise ValueError(f"Product {item_data['product_id']} not found")
            
            quantity = item_data["quantity"]
            
            # Validate stock
            if product.stock_quantity < quantity:
                raise ValueError(
                    f"Insufficient stock for {product.name}. "
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
            
            # Update stock
            product.stock_quantity -= quantity
        
        # Create order
        order = Order(
            user_id=user_id,
            total_amount=total_amount,
            status="pending",
            items=order_items
        )
        
        self.session.add(order)
        await self.session.flush()
        await self.session.refresh(order)
        
        return order
    
    # READ operations
    
    async def get_by_id(self, order_id: int, include_items: bool = True, include_user: bool = False) -> Optional[Order]:
        """
        Get order by ID with optional relationships.
        
        Args:
            order_id: Order ID
            include_items: Load order items (default: True)
            include_user: Load user info (default: False)
        
        Returns:
            Order object or None
        """
        if include_items or include_user:
            stmt = select(Order).where(Order.id == order_id)
            
            if include_items:
                stmt = stmt.options(selectinload(Order.items).selectinload(OrderItem.product))
            
            if include_user:
                stmt = stmt.options(selectinload(Order.user))
            
            result = await self.session.execute(stmt)
            return result.scalar_one_or_none()
        else:
            return await self.session.get(Order, order_id)
    
    async def get_by_user(self, user_id: int, status: str = None) -> List[Order]:
        """
        Get all orders for a user, optionally filtered by status.
        
        Args:
            user_id: User ID
            status: Optional status filter (pending, completed, cancelled)
        
        Returns:
            List of orders
        
        Example:
            # Get all orders
            orders = await repo.get_by_user(1)
            
            # Get only pending orders
            pending = await repo.get_by_user(1, status="pending")
        """
        stmt = select(Order).where(Order.user_id == user_id)
        
        if status:
            stmt = stmt.where(Order.status == status)
        
        stmt = stmt.order_by(Order.created_at.desc())
        
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
    
    async def get_order_with_details(self, order_id: int) -> Optional[Order]:
        """
        Get order with all related data loaded.
        
        Returns order with user, items, and products all loaded.
        
        Example:
            order = await repo.get_order_with_details(1)
            print(f"Order for {order.user.full_name}")
            for item in order.items:
                print(f"  - {item.product.name}: {item.quantity}x")
        """
        stmt = select(Order).options(
            selectinload(Order.user),
            selectinload(Order.items).selectinload(OrderItem.product)
        ).where(Order.id == order_id)
        
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
    
    # UPDATE operations
    
    async def update_status(self, order_id: int, new_status: str) -> Optional[Order]:
        """
        Update order status.
        
        Valid statuses: pending, processing, completed, cancelled
        
        Example:
            await repo.update_status(1, "completed")
        """
        order = await self.get_by_id(order_id, include_items=False)
        if not order:
            return None
        
        order.status = new_status
        await self.session.flush()
        await self.session.refresh(order)
        return order
```

## Step 5: Using Repositories in Services

Now let's see how services use repositories:

```python
class OrderService:
    """
    Business logic layer that uses repositories.
    Services contain business rules, repositories handle data access.
    """
    
    def __init__(
        self,
        order_repo: OrderRepository,
        user_repo: UserRepository,
        product_repo: ProductRepository
    ):
        self.order_repo = order_repo
        self.user_repo = user_repo
        self.product_repo = product_repo
    
    async def place_order(self, user_id: int, items: List[Dict]) -> Order:
        """
        Place an order with business logic validation.
        
        Business rules:
        - User must exist
        - All products must exist
        - Stock must be available
        - Minimum order value of $10
        """
        # Business validation: User exists
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise ValueError(f"User {user_id} not found")
        
        # Calculate total first (business logic)
        total = 0
        for item in items:
            product = await self.product_repo.get_by_id(item["product_id"])
            if not product:
                raise ValueError(f"Product {item['product_id']} not found")
            total += float(product.price) * item["quantity"]
        
        # Business rule: Minimum order value
        if total < 10.0:
            raise ValueError("Minimum order value is $10.00")
        
        # Create order (repository handles database details)
        return await self.order_repo.create_order(user_id, items)
```

## Step 6: Dependency Injection Setup

Finally, let's wire everything together in FastAPI:

```python
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

# Dependency to get database session
async def get_db() -> AsyncSession:
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

# Dependency to get repositories
def get_user_repository(session: AsyncSession = Depends(get_db)) -> UserRepository:
    return UserRepository(session)

def get_order_repository(session: AsyncSession = Depends(get_db)) -> OrderRepository:
    return OrderRepository(session)

# Use in routes
@app.post("/orders/")
async def create_order(
    order_data: OrderCreate,
    order_repo: OrderRepository = Depends(get_order_repository)
):
    return await order_repo.create_order(
        user_id=order_data.user_id,
        items=order_data.items
    )
```

## Summary

You've learned:
1. ✅ Repository pattern structure and benefits
2. ✅ Complete User repository with all CRUD operations
3. ✅ Product repository with relationships
4. ✅ Order repository with complex relationships
5. ✅ Using repositories in services
6. ✅ Dependency injection in FastAPI

Repositories provide clean separation: business logic in services, data access in repositories!
