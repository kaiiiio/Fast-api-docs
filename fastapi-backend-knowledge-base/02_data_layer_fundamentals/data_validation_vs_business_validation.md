# Data Validation vs Business Validation

Understanding the distinction between data validation (syntax) and business validation (semantics) is crucial for building robust FastAPI applications.

## Key Differences

### Data Validation (Syntax)
- **What**: Format, type, structure correctness
- **When**: At API boundary (request/response)
- **Where**: Pydantic models, schema validation
- **Purpose**: Ensure data is well-formed

### Business Validation (Semantics)
- **What**: Business rules, domain logic
- **When**: During business operations
- **Where**: Service layer, domain logic
- **Purpose**: Ensure data makes business sense

## Data Validation with Pydantic

### Request Validation

```python
from pydantic import BaseModel, EmailStr, Field, validator
from datetime import datetime

class UserCreate(BaseModel):
    email: EmailStr  # Data validation: email format
    password: str = Field(min_length=8, max_length=100)  # Length
    age: int = Field(ge=0, le=150)  # Range
    
    @validator('password')
    def validate_password_strength(cls, v):
        # Data validation: format requirements
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain uppercase')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain digit')
        return v

# FastAPI automatically validates
@app.post("/users/", response_model=UserResponse)
async def create_user(user: UserCreate):
    # user is already validated by Pydantic
    pass
```

### Response Validation

```python
class UserResponse(BaseModel):
    id: int
    email: EmailStr
    created_at: datetime
    
    class Config:
        from_attributes = True  # For SQLAlchemy models

@app.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: int):
    # Response automatically validated and serialized
    return user
```

## Business Validation in Service Layer

### Domain Rules

```python
# app/services/user_service.py
from app.core.exceptions import BusinessRuleViolation

class UserService:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo
    
    async def create_user(self, user_data: UserCreate) -> User:
        # Business validation: Check if email exists
        if await self.user_repo.email_exists(user_data.email):
            raise BusinessRuleViolation(
                "Email already registered",
                code="EMAIL_EXISTS"
            )
        
        # Business validation: Check age restrictions
        if user_data.age < 18:
            raise BusinessRuleViolation(
                "Must be 18 or older to register",
                code="AGE_RESTRICTION"
            )
        
        # Create user (data already validated by Pydantic)
        return await self.user_repo.create(user_data)
```

### Complex Business Rules

```python
class OrderService:
    async def create_order(
        self,
        user_id: int,
        items: List[OrderItemCreate]
    ) -> Order:
        # Business validation: User must exist
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise BusinessRuleViolation("User not found")
        
        # Business validation: User must be active
        if not user.is_active:
            raise BusinessRuleViolation("User account is inactive")
        
        # Business validation: Check inventory
        for item in items:
            product = await self.product_repo.get_by_id(item.product_id)
            if not product:
                raise BusinessRuleViolation(
                    f"Product {item.product_id} not found"
                )
            if product.stock < item.quantity:
                raise BusinessRuleViolation(
                    f"Insufficient stock for {product.name}"
                )
        
        # Business validation: Minimum order value
        total = sum(item.price * item.quantity for item in items)
        if total < 50:
            raise BusinessRuleViolation(
                "Minimum order value is $50"
            )
        
        # All validations passed, create order
        return await self.order_repo.create(user_id, items)
```

## Layered Validation Strategy

### Layer 1: Pydantic (Data Validation)

```python
class PaymentCreate(BaseModel):
    amount: Decimal = Field(gt=0, decimal_places=2)  # Positive, 2 decimals
    currency: str = Field(regex="^[A-Z]{3}$")  # ISO currency code
    payment_method: Literal["credit_card", "debit_card", "paypal"]
    
    @validator('amount')
    def validate_amount(cls, v):
        # Data validation: format
        if v <= 0:
            raise ValueError('Amount must be positive')
        if v.as_tuple().exponent < -2:
            raise ValueError('Maximum 2 decimal places')
        return v
```

### Layer 2: Service Layer (Business Validation)

```python
class PaymentService:
    async def process_payment(
        self,
        payment_data: PaymentCreate,
        user_id: int
    ):
        # Business validation: User exists and is active
        user = await self.user_repo.get_by_id(user_id)
        if not user or not user.is_active:
            raise BusinessRuleViolation("Invalid user")
        
        # Business validation: Payment method available for user
        if payment_data.payment_method == "paypal":
            if not user.paypal_account:
                raise BusinessRuleViolation(
                    "PayPal account not linked"
                )
        
        # Business validation: Account balance sufficient
        if payment_data.amount > user.account_balance:
            raise BusinessRuleViolation("Insufficient funds")
        
        # Business validation: Daily limit check
        daily_total = await self.get_daily_payment_total(user_id)
        if daily_total + payment_data.amount > 10000:
            raise BusinessRuleViolation("Daily limit exceeded")
        
        # Process payment
        return await self.payment_repo.create(payment_data)
```

## Error Handling

### Custom Exception Types

```python
# app/core/exceptions.py
class ApplicationError(Exception):
    """Base application error"""
    def __init__(self, message: str, code: str = None):
        self.message = message
        self.code = code
        super().__init__(self.message)

class ValidationError(ApplicationError):
    """Data validation error (400)"""
    pass

class BusinessRuleViolation(ApplicationError):
    """Business rule violation (400)"""
    pass

class NotFoundError(ApplicationError):
    """Resource not found (404)"""
    pass
```

### Exception Handlers

```python
# app/main.py
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

app = FastAPI()

@app.exception_handler(ValidationError)
async def validation_error_handler(
    request: Request,
    exc: ValidationError
):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error": "validation_error",
            "message": exc.message,
            "code": exc.code
        }
    )

@app.exception_handler(BusinessRuleViolation)
async def business_rule_handler(
    request: Request,
    exc: BusinessRuleViolation
):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error": "business_rule_violation",
            "message": exc.message,
            "code": exc.code
        }
    )
```

## Testing Both Layers

### Test Data Validation

```python
def test_user_create_validation():
    # Invalid email format
    with pytest.raises(ValidationError):
        UserCreate(email="not-an-email", password="Test123!")
    
    # Password too short
    with pytest.raises(ValidationError):
        UserCreate(email="test@example.com", password="Short")
    
    # Age out of range
    with pytest.raises(ValidationError):
        UserCreate(
            email="test@example.com",
            password="Test123!",
            age=200
        )
```

### Test Business Validation

```python
@pytest.mark.asyncio
async def test_create_user_business_rules():
    service = UserService(mock_repository)
    
    # Business rule: Email must be unique
    mock_repository.email_exists.return_value = True
    with pytest.raises(BusinessRuleViolation) as exc:
        await service.create_user(UserCreate(...))
    assert exc.value.code == "EMAIL_EXISTS"
    
    # Business rule: Age restriction
    with pytest.raises(BusinessRuleViolation) as exc:
        await service.create_user(
            UserCreate(age=17, ...)
        )
    assert exc.value.code == "AGE_RESTRICTION"
```

## Best Practices

### 1. **Separate Concerns**

```python
# ✅ Good: Clear separation
# Pydantic: Data validation
class UserCreate(BaseModel):
    email: EmailStr
    age: int = Field(ge=0, le=150)

# Service: Business validation
class UserService:
    async def create_user(self, data: UserCreate):
        if await self.repo.email_exists(data.email):
            raise BusinessRuleViolation("Email exists")
        # ...

# ❌ Bad: Mixed validation
class UserCreate(BaseModel):
    email: EmailStr
    
    @validator('email')
    def check_email_exists(cls, v):
        # Business rule in data validation!
        if db.email_exists(v):
            raise ValueError("Email exists")
```

### 2. **Validate Early, Validate Often**

```python
# ✅ Validate at API boundary
@app.post("/users/")
async def create_user(user: UserCreate):  # Pydantic validates
    # Then validate business rules
    return await service.create_user(user)

# ❌ Don't skip validation
@app.post("/users/")
async def create_user(data: dict):  # No validation!
    return await service.create_user(data)
```

### 3. **Clear Error Messages**

```python
# ✅ Descriptive errors
raise BusinessRuleViolation(
    "Cannot create order: Insufficient inventory for 'Widget X'",
    code="INSUFFICIENT_INVENTORY"
)

# ❌ Vague errors
raise ValueError("Invalid")
```

## Summary

- **Data Validation** (Pydantic): Format, type, structure
  - Email format, string length, number ranges
  - Happens at API boundary
  - Automatic with FastAPI

- **Business Validation** (Service Layer): Domain rules
  - Uniqueness, relationships, business constraints
  - Happens in service layer
  - Explicit checks

Both are essential for robust applications. Data validation ensures requests are well-formed, while business validation ensures they make business sense.

