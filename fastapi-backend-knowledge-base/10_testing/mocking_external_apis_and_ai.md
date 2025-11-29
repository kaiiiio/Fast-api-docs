# Mocking External APIs and AI: Complete Testing Guide

Mocking external APIs and AI services makes tests fast, reliable, and independent. This guide covers comprehensive mocking strategies for external dependencies.

## Understanding Mocking

**Why mock external services?**
- Tests run faster (no network calls)
- Tests are reliable (no dependency on external services)
- Tests are isolated (don't affect external systems)
- Control responses (test error cases)

**What to mock:**
- HTTP APIs
- AI/LLM services
- Database connections (sometimes)
- Third-party services

## Step 1: Mocking HTTP Clients

### Basic HTTP Mocking

```python
from unittest.mock import AsyncMock, patch, MagicMock
import httpx
import pytest

@pytest.mark.asyncio
async def test_external_api_call():
    """Test with mocked HTTP client."""
    with patch('httpx.AsyncClient.get') as mock_get:
        # Setup mock response
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "status": "success",
            "data": {"id": 1, "name": "Test"}
        }
        mock_get.return_value = mock_response
        
        # Execute
        async with httpx.AsyncClient() as client:
            response = await client.get("https://api.example.com/data")
        
        # Verify
        assert response.status_code == 200
        assert response.json()["status"] == "success"
        mock_get.assert_called_once()

@pytest.mark.asyncio
async def test_http_error_handling():
    """Test error handling with mocked errors."""
    with patch('httpx.AsyncClient.get') as mock_get:
        # Mock error response
        mock_response = AsyncMock()
        mock_response.status_code = 500
        mock_response.raise_for_status = MagicMock(side_effect=httpx.HTTPStatusError(
            "Server Error",
            request=MagicMock(),
            response=mock_response
        ))
        mock_get.return_value = mock_response
        
        # Test error handling
        async with httpx.AsyncClient() as client:
            response = await client.get("https://api.example.com/data")
            with pytest.raises(httpx.HTTPStatusError):
                response.raise_for_status()
```

### Using Responses Library

```python
import responses
import requests

@responses.activate
def test_external_api_with_responses():
    """Test with responses library (synchronous)."""
    # Mock GET request
    responses.add(
        responses.GET,
        "https://api.example.com/users/1",
        json={"id": 1, "name": "John"},
        status=200
    )
    
    response = requests.get("https://api.example.com/users/1")
    
    assert response.status_code == 200
    assert response.json()["id"] == 1

@responses.activate
def test_multiple_requests():
    """Mock multiple API calls."""
    responses.add(
        responses.GET,
        "https://api.example.com/users/1",
        json={"id": 1, "name": "John"},
        status=200
    )
    
    responses.add(
        responses.POST,
        "https://api.example.com/users",
        json={"id": 2, "name": "Jane"},
        status=201
    )
    
    # Test GET
    get_response = requests.get("https://api.example.com/users/1")
    assert get_response.status_code == 200
    
    # Test POST
    post_response = requests.post("https://api.example.com/users", json={"name": "Jane"})
    assert post_response.status_code == 201
```

### Async HTTP Mocking

```python
from aioresponses import aioresponses

@pytest.mark.asyncio
async def test_async_http_client():
    """Test async HTTP client with aioresponses."""
    with aioresponses() as m:
        # Mock GET request
        m.get(
            "https://api.example.com/users/1",
            payload={"id": 1, "name": "John"},
            status=200
        )
        
        async with httpx.AsyncClient() as client:
            response = await client.get("https://api.example.com/users/1")
        
        assert response.status_code == 200
        assert response.json()["id"] == 1

@pytest.mark.asyncio
async def test_async_error_responses():
    """Test async error responses."""
    with aioresponses() as m:
        m.get(
            "https://api.example.com/users/1",
            exception=httpx.HTTPError("Connection error")
        )
        
        async with httpx.AsyncClient() as client:
            with pytest.raises(httpx.HTTPError):
                await client.get("https://api.example.com/users/1")
```

## Step 2: Mocking OpenAI/LLM Services

### Mock OpenAI Client

```python
from unittest.mock import AsyncMock, MagicMock
from openai.types.chat import ChatCompletion, ChatCompletionMessage

@pytest.fixture
def mock_openai_client():
    """Fixture for mocked OpenAI client."""
    client = AsyncMock()
    
    # Mock chat completion response
    mock_response = ChatCompletion(
        id="chat-123",
        object="chat.completion",
        created=1234567890,
        model="gpt-4",
        choices=[
            MagicMock(
                message=ChatCompletionMessage(
                    role="assistant",
                    content="Mocked response"
                ),
                finish_reason="stop",
                index=0
            )
        ],
        usage=MagicMock(
            prompt_tokens=10,
            completion_tokens=20,
            total_tokens=30
        )
    )
    
    client.chat.completions.create = AsyncMock(return_value=mock_response)
    
    return client

@pytest.mark.asyncio
async def test_llm_call_with_mock(mock_openai_client):
    """Test LLM call with mocked client."""
    response = await mock_openai_client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": "Test prompt"}]
    )
    
    assert response.choices[0].message.content == "Mocked response"
    assert response.usage.total_tokens == 30

@pytest.mark.asyncio
async def test_embedding_generation(mock_openai_client):
    """Test embedding generation with mock."""
    mock_embedding_response = MagicMock()
    mock_embedding_response.data = [
        MagicMock(embedding=[0.1] * 1536)
    ]
    
    mock_openai_client.embeddings.create = AsyncMock(return_value=mock_embedding_response)
    
    response = await mock_openai_client.embeddings.create(
        model="text-embedding-3-small",
        input="test text"
    )
    
    assert len(response.data[0].embedding) == 1536
```

### LLM Service Mock

```python
class MockLLMService:
    """Mock LLM service for testing."""
    
    def __init__(self):
        self.responses = {}
        self.call_history = []
    
    async def chat_completion(
        self,
        prompt: str,
        model: str = "gpt-4"
    ) -> str:
        """Mock chat completion."""
        self.call_history.append({"prompt": prompt, "model": model})
        
        # Return predefined response if available
        if prompt in self.responses:
            return self.responses[prompt]
        
        # Default mock response
        return "Mocked LLM response"
    
    def set_response(self, prompt: str, response: str):
        """Set predefined response for prompt."""
        self.responses[prompt] = response

@pytest.fixture
def mock_llm_service():
    """Mock LLM service fixture."""
    return MockLLMService()

@pytest.mark.asyncio
async def test_with_mock_llm_service(mock_llm_service):
    """Test using mock LLM service."""
    # Set predefined response
    mock_llm_service.set_response(
        "Parse this resume",
        '{"name": "John Doe", "skills": ["Python"]}'
    )
    
    response = await mock_llm_service.chat_completion("Parse this resume")
    
    assert "John Doe" in response
    assert len(mock_llm_service.call_history) == 1
```

## Step 3: Mocking with Dependency Injection

### Override Dependencies in FastAPI

```python
from fastapi import Depends
from unittest.mock import AsyncMock

@pytest.fixture
def mock_openai_client():
    """Mock OpenAI client."""
    client = AsyncMock()
    client.chat.completions.create = AsyncMock(
        return_value=MagicMock(
            choices=[MagicMock(message=MagicMock(content="Mocked"))]
        )
    )
    return client

@pytest.fixture
def app_with_mocks(mock_openai_client):
    """FastAPI app with mocked dependencies."""
    # Override OpenAI dependency
    def override_get_openai():
        return mock_openai_client
    
    app.dependency_overrides[get_openai_client] = override_get_openai
    
    yield app
    
    # Cleanup
    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_chat_endpoint_with_mock(async_client, mock_openai_client):
    """Test chat endpoint with mocked OpenAI."""
    response = await async_client.post(
        "/chat",
        json={"prompt": "Hello"}
    )
    
    assert response.status_code == 200
    assert "Mocked" in response.json()["response"]
```

## Step 4: Advanced Mocking Patterns

### Context Manager for Mocks

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def mock_openai_client_context():
    """Context manager for mocking OpenAI."""
    with patch('openai.AsyncOpenAI') as mock_openai:
        mock_client = AsyncMock()
        mock_client.chat.completions.create = AsyncMock(
            return_value=MagicMock(
                choices=[MagicMock(message=MagicMock(content="Mocked"))]
            )
        )
        mock_openai.return_value = mock_client
        
        yield mock_client

@pytest.mark.asyncio
async def test_with_context_manager():
    """Test using context manager for mocking."""
    async with mock_openai_client_context() as mock_client:
        # Use mocked client
        response = await mock_client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": "Test"}]
        )
        assert response.choices[0].message.content == "Mocked"
```

### Mock with Side Effects

```python
@pytest.mark.asyncio
async def test_mock_with_side_effects():
    """Test with mock side effects (different responses)."""
    mock_client = AsyncMock()
    
    # Return different responses on each call
    mock_client.chat.completions.create = AsyncMock(
        side_effect=[
            MagicMock(choices=[MagicMock(message=MagicMock(content="First"))]),
            MagicMock(choices=[MagicMock(message=MagicMock(content="Second"))]),
            MagicMock(choices=[MagicMock(message=MagicMock(content="Third"))])
        ]
    )
    
    # First call
    response1 = await mock_client.chat.completions.create()
    assert response1.choices[0].message.content == "First"
    
    # Second call
    response2 = await mock_client.chat.completions.create()
    assert response2.choices[0].message.content == "Second"
```

## Step 5: Testing Error Scenarios

### Mock API Errors

```python
@pytest.mark.asyncio
async def test_openai_rate_limit_error():
    """Test handling OpenAI rate limit errors."""
    mock_client = AsyncMock()
    mock_client.chat.completions.create = AsyncMock(
        side_effect=openai.RateLimitError(
            message="Rate limit exceeded",
            response=MagicMock(status_code=429),
            body=None
        )
    )
    
    with pytest.raises(openai.RateLimitError):
        await mock_client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": "Test"}]
        )

@pytest.mark.asyncio
async def test_openai_timeout_error():
    """Test handling OpenAI timeout errors."""
    mock_client = AsyncMock()
    mock_client.chat.completions.create = AsyncMock(
        side_effect=openai.APITimeoutError(
            message="Request timeout",
            request=MagicMock()
        )
    )
    
    with pytest.raises(openai.APITimeoutError):
        await mock_client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": "Test"}]
        )

@pytest.mark.asyncio
async def test_http_connection_error():
    """Test handling connection errors."""
    with aioresponses() as m:
        m.get(
            "https://api.example.com/data",
            exception=httpx.ConnectError("Connection failed")
        )
        
        async with httpx.AsyncClient() as client:
            with pytest.raises(httpx.ConnectError):
                await client.get("https://api.example.com/data")
```

## Step 6: Mock Data Builders

### Test Data Builders

```python
class MockResponseBuilder:
    """Builder for mock API responses."""
    
    @staticmethod
    def openai_chat_response(content: str = "Mocked response"):
        """Build OpenAI chat response."""
        return MagicMock(
            id="chat-123",
            model="gpt-4",
            choices=[
                MagicMock(
                    message=MagicMock(
                        role="assistant",
                        content=content
                    ),
                    finish_reason="stop"
                )
            ],
            usage=MagicMock(
                prompt_tokens=10,
                completion_tokens=20,
                total_tokens=30
            )
        )
    
    @staticmethod
    def openai_embedding_response(dimensions: int = 1536):
        """Build OpenAI embedding response."""
        return MagicMock(
            data=[
                MagicMock(
                    embedding=[0.1] * dimensions
                )
            ]
        )
    
    @staticmethod
    def http_response(status_code: int = 200, json_data: dict = None):
        """Build HTTP response."""
        response = AsyncMock()
        response.status_code = status_code
        response.json = AsyncMock(return_value=json_data or {})
        return response

# Usage
@pytest.mark.asyncio
async def test_with_builder():
    """Test using response builder."""
    mock_response = MockResponseBuilder.openai_chat_response(
        content="Custom response"
    )
    
    mock_client = AsyncMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
    
    response = await mock_client.chat.completions.create()
    assert response.choices[0].message.content == "Custom response"
```

## Step 7: Integration with FastAPI Tests

### End-to-End Mocking

```python
@pytest.mark.asyncio
async def test_chat_endpoint_integration():
    """Test chat endpoint with mocked OpenAI."""
    # Mock OpenAI dependency
    mock_response = MockResponseBuilder.openai_chat_response(
        content="Hello from mock!"
    )
    
    mock_client = AsyncMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
    
    # Override dependency
    app.dependency_overrides[get_openai_client] = lambda: mock_client
    
    try:
        # Test endpoint
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(
                "/chat",
                json={"prompt": "Hello"}
            )
        
        assert response.status_code == 200
        assert "Hello from mock!" in response.json()["response"]
        
        # Verify OpenAI was called
        mock_client.chat.completions.create.assert_called_once()
    
    finally:
        app.dependency_overrides.clear()
```

## Best Practices

1. **✅ Mock external dependencies**: HTTP APIs, AI services
2. **✅ Test error cases**: Rate limits, timeouts, errors
3. **✅ Use fixtures**: Reusable mock setup
4. **✅ Verify calls**: Ensure mocks were called correctly
5. **✅ Keep mocks realistic**: Match real API responses

## Summary

Mocking external APIs provides:
- ✅ Fast tests (no network calls)
- ✅ Reliable tests (no external dependencies)
- ✅ Isolated tests (independent execution)
- ✅ Error testing (simulate failures)

Implement comprehensive mocking for reliable test suites!
