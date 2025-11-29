# Contract Testing for APIs: Complete Guide

Contract testing ensures API consumers and providers stay compatible, preventing breaking changes from reaching production. This guide covers comprehensive contract testing strategies.

## Understanding Contract Testing

**What is contract testing?**
Testing that APIs adhere to agreed-upon contracts (schemas, response formats) between services.

**Why it matters:**
- Prevents breaking changes
- Ensures service compatibility
- Catches issues early
- Documents API expectations

**Types:**
- **Provider contracts**: Service defines expected requests/responses
- **Consumer contracts**: Client defines expected API behavior
- **Bi-directional**: Both sides validate contracts

## Step 1: Pydantic-Based Contracts

### Define Response Contracts

```python
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime

class UserResponse(BaseModel):
    """API response contract for user data."""
    id: int = Field(..., description="User ID", gt=0)
    email: EmailStr = Field(..., description="User email")
    name: str = Field(..., min_length=1, max_length=255)
    created_at: datetime = Field(..., description="Account creation time")
    is_active: bool = Field(default=True)
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": 1,
                "email": "user@example.com",
                "name": "John Doe",
                "created_at": "2024-01-15T10:00:00Z",
                "is_active": True
            }
        }

class UserListResponse(BaseModel):
    """API response contract for user list."""
    users: List[UserResponse]
    total: int = Field(..., ge=0)
    page: int = Field(..., ge=1)
    page_size: int = Field(..., ge=1, le=100)

# Use in route
@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: int):
    """Get user - response must match UserResponse contract."""
    user = await get_user_from_db(user_id)
    
    # FastAPI automatically validates response against schema
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        created_at=user.created_at,
        is_active=user.is_active
    )
```

### Define Request Contracts

```python
class UserCreate(BaseModel):
    """Request contract for creating user."""
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=8)

class UserUpdate(BaseModel):
    """Request contract for updating user."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    is_active: Optional[bool] = None

@router.post("/users", response_model=UserResponse, status_code=201)
async def create_user(user_data: UserCreate):
    """Create user - request must match UserCreate contract."""
    # Pydantic validates request automatically
    user = await create_user_in_db(user_data)
    return user
```

## Step 2: Testing Contract Compliance

### Test Response Matches Contract

```python
import pytest
from fastapi.testclient import TestClient

def test_user_response_contract(client: TestClient):
    """Test that user endpoint returns data matching contract."""
    response = client.get("/users/1")
    
    assert response.status_code == 200
    
    # Validate response matches contract
    data = response.json()
    user = UserResponse(**data)  # Will raise ValidationError if contract broken
    
    # Additional assertions
    assert user.id > 0
    assert "@" in user.email
    assert user.name is not None
    assert isinstance(user.created_at, datetime)

def test_user_list_response_contract(client: TestClient):
    """Test user list endpoint contract."""
    response = client.get("/users?page=1&page_size=10")
    
    assert response.status_code == 200
    
    # Validate list response contract
    data = response.json()
    user_list = UserListResponse(**data)
    
    assert len(user_list.users) <= user_list.page_size
    assert user_list.total >= 0
    assert user_list.page == 1
```

### Test Request Validation

```python
def test_create_user_request_contract(client: TestClient):
    """Test that invalid requests are rejected."""
    # Valid request
    valid_data = {
        "email": "test@example.com",
        "name": "Test User",
        "password": "securepassword123"
    }
    
    response = client.post("/users", json=valid_data)
    assert response.status_code == 201
    
    # Invalid email
    invalid_data = valid_data.copy()
    invalid_data["email"] = "not-an-email"
    
    response = client.post("/users", json=invalid_data)
    assert response.status_code == 422  # Validation error
    
    # Missing required field
    invalid_data = {"email": "test@example.com"}  # Missing name and password
    
    response = client.post("/users", json=invalid_data)
    assert response.status_code == 422
```

## Step 3: JSON Schema Validation

### Generate and Validate JSON Schemas

```python
from jsonschema import validate, ValidationError

# Generate JSON schema from Pydantic model
USER_RESPONSE_SCHEMA = UserResponse.model_json_schema()

def test_response_matches_json_schema(client: TestClient):
    """Test response matches JSON schema."""
    response = client.get("/users/1")
    
    assert response.status_code == 200
    data = response.json()
    
    # Validate against JSON schema
    try:
        validate(instance=data, schema=USER_RESPONSE_SCHEMA)
    except ValidationError as e:
        pytest.fail(f"Response doesn't match schema: {e.message}")

# Or use Pydantic's built-in validation
def test_response_schema_validation(client: TestClient):
    """Test using Pydantic validation."""
    response = client.get("/users/1")
    
    assert response.status_code == 200
    data = response.json()
    
    # Pydantic will raise ValidationError if schema doesn't match
    try:
        UserResponse(**data)
    except ValidationError as e:
        pytest.fail(f"Response doesn't match contract: {e}")
```

## Step 4: Contract Testing with Pact

### Consumer-Driven Contracts

```python
from pact import Consumer, Provider, Like, EachLike

# Define consumer contract
pact = Consumer("Frontend").has_pact_with(
    Provider("UserAPI"),
    host_name="localhost",
    port=8000
)

def test_user_api_contract():
    """Test API contract using Pact."""
    pact.start_service()
    
    expected_response = {
        "id": Like(1),
        "email": Like("user@example.com"),
        "name": Like("John Doe"),
        "created_at": Like("2024-01-15T10:00:00Z"),
        "is_active": Like(True)
    }
    
    (
        pact
        .given("user exists")
        .upon_receiving("a request for a user")
        .with_request("GET", "/users/1")
        .will_respond_with(200, body=expected_response)
    )
    
    # Test actual API
    response = requests.get("http://localhost:8000/users/1")
    
    assert response.status_code == 200
    assert response.json()["id"] == 1
    
    pact.verify()
    pact.stop_service()
```

## Step 5: API Versioning and Contracts

### Versioned Contracts

```python
class UserResponseV1(BaseModel):
    """Version 1 contract."""
    id: int
    email: str
    name: str

class UserResponseV2(BaseModel):
    """Version 2 contract - added fields."""
    id: int
    email: str
    name: str
    created_at: datetime  # New field
    is_active: bool  # New field

@router.get("/v1/users/{user_id}", response_model=UserResponseV1)
async def get_user_v1(user_id: int):
    """V1 endpoint - maintains old contract."""
    user = await get_user_from_db(user_id)
    return UserResponseV1(
        id=user.id,
        email=user.email,
        name=user.name
    )

@router.get("/v2/users/{user_id}", response_model=UserResponseV2)
async def get_user_v2(user_id: int):
    """V2 endpoint - new contract with additional fields."""
    user = await get_user_from_db(user_id)
    return UserResponseV2(
        id=user.id,
        email=user.email,
        name=user.name,
        created_at=user.created_at,
        is_active=user.is_active
    )

def test_backward_compatibility():
    """Test that v1 contract still works."""
    # V1 consumers should still work
    response_v1 = client.get("/v1/users/1")
    assert response_v1.status_code == 200
    UserResponseV1(**response_v1.json())  # Should validate
    
    # V2 consumers get new fields
    response_v2 = client.get("/v2/users/1")
    assert response_v2.status_code == 200
    UserResponseV2(**response_v2.json())  # Should validate
```

## Step 6: Contract Testing in CI/CD

### Automated Contract Tests

```python
# tests/contracts/test_api_contracts.py

import pytest
from fastapi.testclient import TestClient

class TestAPIContracts:
    """Contract tests for API endpoints."""
    
    def test_all_endpoints_have_contracts(self, client: TestClient):
        """Ensure all endpoints define response models."""
        # Get OpenAPI schema
        schema = client.app.openapi()
        paths = schema["paths"]
        
        for path, methods in paths.items():
            for method, spec in methods.items():
                if "responses" in spec:
                    # Check that responses define schema
                    for status_code, response in spec["responses"].items():
                        if status_code.startswith("2"):  # Success responses
                            assert "content" in response, f"{method} {path} missing response content"
                            assert "application/json" in response["content"], f"{method} {path} missing JSON schema"
    
    def test_response_contracts_match_implementation(self, client: TestClient):
        """Test that actual responses match defined contracts."""
        # Test user endpoint
        response = client.get("/users/1")
        if response.status_code == 200:
            data = response.json()
            # Should match UserResponse contract
            UserResponse(**data)  # Will raise if contract broken
```

## Step 7: Schema Evolution Testing

### Test Backward Compatibility

```python
def test_schema_evolution():
    """Test that schema changes don't break existing consumers."""
    
    # Old consumer expects only these fields
    old_contract = {
        "id": int,
        "email": str,
        "name": str
    }
    
    # New API returns additional fields
    response = client.get("/users/1")
    data = response.json()
    
    # Old consumer should still work (extra fields are OK)
    assert all(key in data for key in old_contract.keys())
    
    # New consumer can use additional fields
    assert "created_at" in data  # New field available

def test_breaking_changes_detected():
    """Test that breaking changes are caught."""
    # Removing a field breaks contract
    response = client.get("/users/1")
    data = response.json()
    
    # If contract requires 'email', but response doesn't have it, test should fail
    assert "email" in data, "Breaking change: 'email' field removed"
```

## Best Practices

1. **✅ Define contracts explicitly**: Use Pydantic models
2. **✅ Test contracts in CI/CD**: Catch breaking changes early
3. **✅ Version APIs**: Support multiple contract versions
4. **✅ Document contracts**: OpenAPI/Swagger docs
5. **✅ Test backward compatibility**: Don't break existing consumers

## Summary

Contract testing ensures:
- ✅ API stability
- ✅ Service compatibility
- ✅ Early detection of breaking changes
- ✅ Clear API documentation

Implement contract testing for reliable, stable APIs!
