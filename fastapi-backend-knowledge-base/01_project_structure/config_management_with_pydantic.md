# Configuration Management with Pydantic

Pydantic provides excellent configuration management for FastAPI applications, offering validation, type safety, and environment variable handling out of the box.

## Basic Configuration Setup

### Using Pydantic Settings

```python
# app/core/config.py
from pydantic_settings import BaseSettings
from typing import List, Optional


class Settings(BaseSettings):
    # Application settings
    PROJECT_NAME: str = "My FastAPI App"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    
    # Server settings
    API_V1_PREFIX: str = "/api/v1"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Database
    DATABASE_URL: str
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()
```

### Environment File (.env)

```bash
# .env
PROJECT_NAME=My FastAPI App
VERSION=1.0.0
DEBUG=true
ENVIRONMENT=development

DATABASE_URL=postgresql+asyncpg://user:password@localhost/dbname
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

CORS_ORIGINS=["http://localhost:3000","http://localhost:8080"]

REDIS_URL=redis://localhost:6379
```

## Advanced Configuration Patterns

### 1. **Nested Configuration Classes**

```python
from pydantic import Field
from pydantic_settings import BaseSettings


class DatabaseSettings(BaseSettings):
    url: str
    pool_size: int = 10
    max_overflow: int = 20
    echo: bool = False
    
    class Config:
        env_prefix = "DB_"


class SecuritySettings(BaseSettings):
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    
    class Config:
        env_prefix = "SECURITY_"


class Settings(BaseSettings):
    project_name: str = "My FastAPI App"
    database: DatabaseSettings = Field(default_factory=DatabaseSettings)
    security: SecuritySettings = Field(default_factory=SecuritySettings)
    
    class Config:
        env_file = ".env"


settings = Settings()
# Access: settings.database.url
# Access: settings.security.secret_key
```

### 2. **Environment-Specific Configuration**

```python
from enum import Enum
from pydantic_settings import BaseSettings


class Environment(str, Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


class Settings(BaseSettings):
    environment: Environment = Environment.DEVELOPMENT
    
    # Development-specific
    debug: bool = False
    reload: bool = False
    
    # Database
    database_url: str
    
    @property
    def is_development(self) -> bool:
        return self.environment == Environment.DEVELOPMENT
    
    @property
    def is_production(self) -> bool:
        return self.environment == Environment.PRODUCTION
    
    def model_post_init(self, __context):
        # Set debug based on environment
        if self.is_development:
            self.debug = True
            self.reload = True
    
    class Config:
        env_file = ".env"


settings = Settings()
```

### 3. **Validated Configuration Values**

```python
from pydantic import Field, validator
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Validated fields
    port: int = Field(ge=1, le=65535, default=8000)
    max_workers: int = Field(ge=1, le=100, default=4)
    
    # List validation
    cors_origins: List[str] = Field(default_factory=list)
    
    # Custom validation
    secret_key: str = Field(min_length=32)
    
    @validator("cors_origins", pre=True)
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            # Handle JSON string from .env
            import json
            return json.loads(v)
        return v
    
    @validator("secret_key")
    def validate_secret_key(cls, v):
        if len(v) < 32:
            raise ValueError("Secret key must be at least 32 characters")
        return v
    
    class Config:
        env_file = ".env"


settings = Settings()
```

### 4. **Configuration with Computed Properties**

```python
from pydantic_settings import BaseSettings
from urllib.parse import urlparse


class Settings(BaseSettings):
    database_url: str
    
    @property
    def database_host(self) -> str:
        parsed = urlparse(self.database_url)
        return parsed.hostname
    
    @property
    def database_port(self) -> int:
        parsed = urlparse(self.database_url)
        return parsed.port or 5432
    
    @property
    def database_name(self) -> str:
        parsed = urlparse(self.database_url)
        return parsed.path.lstrip("/")
    
    class Config:
        env_file = ".env"


settings = Settings()
# Access: settings.database_host
```

## Multi-Environment Configuration

### Strategy 1: Multiple Config Files

```python
# app/core/config.py
import os
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    environment: str = "development"
    
    # Load environment-specific .env file
    class Config:
        env_file = f".env.{os.getenv('ENVIRONMENT', 'development')}"
        env_file_encoding = "utf-8"


# .env.development
ENVIRONMENT=development
DEBUG=true
DATABASE_URL=postgresql://localhost/dev_db

# .env.production
ENVIRONMENT=production
DEBUG=false
DATABASE_URL=postgresql://prod-host/prod_db
```

### Strategy 2: Configuration Factory

```python
# app/core/config.py
from functools import lru_cache
from pydantic_settings import BaseSettings
import os


class Settings(BaseSettings):
    environment: str = "development"
    debug: bool = False
    database_url: str
    
    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    environment = os.getenv("ENVIRONMENT", "development")
    
    # Load base settings
    settings = Settings()
    
    # Override based on environment
    if environment == "production":
        settings.debug = False
        settings.database_url = os.getenv("DATABASE_URL")
    
    return settings


# Usage
settings = get_settings()
```

## Configuration with Secrets Management

### Integration with Vault/AWS Secrets Manager

```python
# app/core/config.py
import os
from pydantic_settings import BaseSettings
from typing import Optional
import boto3  # For AWS Secrets Manager
import json


class Settings(BaseSettings):
    environment: str
    secret_key: str
    database_url: str
    
    @classmethod
    def from_secrets_manager(cls):
        """Load secrets from AWS Secrets Manager"""
        if os.getenv("ENVIRONMENT") == "production":
            client = boto3.client("secretsmanager")
            secret = client.get_secret_value(
                SecretId="my-app/secrets"
            )
            secrets = json.loads(secret["SecretString"])
            return cls(**secrets)
        else:
            # Use .env for local development
            return cls()
    
    class Config:
        env_file = ".env"


# Usage
settings = Settings.from_secrets_manager()
```

## Configuration Validation at Startup

```python
# app/core/config.py
from pydantic_settings import BaseSettings
from pydantic import ValidationError
import sys


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    redis_url: str
    
    class Config:
        env_file = ".env"


def validate_settings() -> Settings:
    """Validate settings at application startup"""
    try:
        return Settings()
    except ValidationError as e:
        print("Configuration validation failed:")
        for error in e.errors():
            print(f"  {error['loc']}: {error['msg']}")
        sys.exit(1)


settings = validate_settings()
```

## Using Settings in FastAPI

```python
# app/main.py
from fastapi import FastAPI
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    debug=settings.DEBUG
)

# Use in dependencies
from fastapi import Depends

def get_settings():
    return settings

@app.get("/config")
async def get_config(settings = Depends(get_settings)):
    return {
        "project_name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }
```

## Testing with Configuration

```python
# tests/conftest.py
import pytest
from app.core.config import Settings, get_settings


@pytest.fixture
def test_settings():
    """Override settings for testing"""
    return Settings(
        DATABASE_URL="sqlite+aiosqlite:///:memory:",
        SECRET_KEY="test-secret-key",
        DEBUG=True
    )


@pytest.fixture
def override_settings(test_settings):
    """Override settings dependency"""
    from app.main import app
    from app.core.config import get_settings
    
    def _get_settings():
        return test_settings
    
    app.dependency_overrides[get_settings] = _get_settings
    yield
    app.dependency_overrides.clear()
```

## Best Practices

### 1. **Use Environment Variables for Secrets**

```python
# ✅ Good - secrets in environment
SECRET_KEY=${SECRET_KEY}  # Set in environment

# ❌ Bad - secrets in code
SECRET_KEY = "hardcoded-secret"
```

### 2. **Provide Sensible Defaults**

```python
# ✅ Good
HOST: str = "0.0.0.0"
PORT: int = 8000

# ❌ Bad - no defaults
HOST: str  # Will fail if not set
```

### 3. **Validate Configuration at Startup**

```python
# Validate early
settings = Settings()  # Raises ValidationError if invalid
```

### 4. **Use Type Hints**

```python
# ✅ Good - clear types
PORT: int = 8000
DEBUG: bool = False

# ❌ Bad - unclear types
PORT = "8000"  # String, needs conversion
```

### 5. **Document Configuration Options**

```python
class Settings(BaseSettings):
    """Application settings loaded from environment variables.
    
    Attributes:
        DATABASE_URL: PostgreSQL connection string
        SECRET_KEY: Secret key for JWT tokens (min 32 chars)
        CORS_ORIGINS: List of allowed CORS origins
    """
    DATABASE_URL: str
    SECRET_KEY: str = Field(min_length=32)
    CORS_ORIGINS: List[str] = []
```

## Summary

Pydantic Settings provides:
- ✅ Type-safe configuration
- ✅ Automatic environment variable loading
- ✅ Validation of configuration values
- ✅ Support for nested configuration
- ✅ Environment-specific configurations
- ✅ Easy testing with overrides

Use it for:
- Application settings
- Database configuration
- Security settings
- External service URLs
- Feature flags
- Environment-specific overrides

