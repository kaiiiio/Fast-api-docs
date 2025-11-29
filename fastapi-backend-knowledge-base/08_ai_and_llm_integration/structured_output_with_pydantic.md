# Structured Output with Pydantic: LLM Integration Guide

Getting structured, validated output from LLMs is crucial for production AI applications. This guide shows you how to use Pydantic models to ensure LLMs return valid, structured data.

## The Problem with LLM Output

**Without structured output:**
- LLMs return free-form text
- Need manual parsing
- Inconsistent formats
- Hard to validate

**Example:**
```python
response = await openai_client.chat.completions.create(...)
text = response.choices[0].message.content
# "The user is John Doe, age 30, email john@example.com"
# How do we parse this? Split? Regex? Fragile!
```

**With structured output:**
- LLMs return JSON matching your schema
- Automatic validation
- Type-safe
- Consistent format

## Step 1: Basic Structured Output

Let's use OpenAI's function calling with Pydantic:

```python
from openai import OpenAI
from pydantic import BaseModel, Field
from typing import List

class UserInfo(BaseModel):
    """Information extracted about a user."""
    name: str = Field(description="User's full name")
    age: int = Field(description="User's age", ge=0, le=150)
    email: str = Field(description="User's email address")
    interests: List[str] = Field(description="User's interests")

async def extract_user_info(text: str) -> UserInfo:
    """
    Extract structured user information from text.
    
    Example text: "Hi, I'm John Doe, 30 years old. My email is john@example.com. I love coding and hiking."
    """
    client = OpenAI()
    
    response = await client.beta.chat.completions.parse(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "Extract user information from the text."},
            {"role": "user", "content": text}
        ],
        response_format=UserInfo  # Pydantic model as schema!
    )
    
    # Automatically parsed and validated
    user_info: UserInfo = response.choices[0].message.parsed
    
    return user_info
```

**What happens:**
1. Pydantic model converted to JSON schema
2. LLM returns JSON matching schema
3. Automatically parsed into Pydantic model
4. Validated (age constraints, email format, etc.)

## Step 2: Complex Structured Outputs

For more complex extraction:

```python
class ProductRecommendation(BaseModel):
    """Product recommendation with reasoning."""
    product_id: int = Field(description="Recommended product ID")
    product_name: str = Field(description="Product name")
    match_score: float = Field(description="How well it matches (0-1)", ge=0, le=1)
    reasons: List[str] = Field(description="Why this product is recommended")
    price: float = Field(description="Product price")
    alternative_ids: List[int] = Field(description="Alternative product IDs", default=[])

async def get_product_recommendations(
    user_query: str,
    available_products: List[dict]
) -> ProductRecommendation:
    """Get AI-powered product recommendations."""
    client = OpenAI()
    
    products_text = json.dumps(available_products, indent=2)
    
    response = await client.beta.chat.completions.parse(
        model="gpt-4",
        messages=[
            {
                "role": "system",
                "content": "You are a product recommendation assistant. Recommend products based on user needs."
            },
            {
                "role": "user",
                "content": f"User query: {user_query}\n\nAvailable products:\n{products_text}"
            }
        ],
        response_format=ProductRecommendation
    )
    
    return response.choices[0].message.parsed
```

## Step 3: Using with FastAPI

Integrate into your API:

```python
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class ExtractRequest(BaseModel):
    text: str

@router.post("/extract/user-info")
async def extract_user_info(request: ExtractRequest):
    """
    Extract structured user information from free text.
    
    Example:
        POST /extract/user-info
        {
            "text": "I'm John Doe, 30 years old. Email me at john@example.com"
        }
    """
    user_info = await extract_user_info(request.text)
    return user_info  # Automatically validated Pydantic model
```

## Step 4: Error Handling

Handle cases where LLM doesn't follow schema:

```python
from openai import BadRequestError

async def extract_user_info_safe(text: str) -> Optional[UserInfo]:
    """Extract with error handling."""
    try:
        client = OpenAI()
        response = await client.beta.chat.completions.parse(
            model="gpt-4",
            messages=[...],
            response_format=UserInfo
        )
        return response.choices[0].message.parsed
    
    except BadRequestError as e:
        # LLM didn't follow schema
        print(f"LLM parsing error: {e}")
        return None
    
    except ValidationError as e:
        # Pydantic validation failed
        print(f"Validation error: {e}")
        return None
```

## Summary

Structured output provides:
- ✅ Type-safe LLM responses
- ✅ Automatic validation
- ✅ Consistent formats
- ✅ Easy integration with FastAPI

Use Pydantic models with LLMs for production-ready AI features!

