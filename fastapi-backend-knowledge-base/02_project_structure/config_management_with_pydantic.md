# Configuration Management with Pydantic

Pydantic provides excellent configuration management for FastAPI applications, offering validation, type safety, and environment variable handling out of the box.

## Basic Configuration Setup

### Using Pydantic Settings

```python
# app/core/config.py
# pydantic_settings.BaseSettings - Special Pydantic class for configuration management
# Automatically reads from environment variables and .env files
# Provides type validation, default values, and nested configuration
# Different from BaseModel: BaseModel for request/response, BaseSettings for config
# Use case: Loading app configuration from environment variables
from pydantic_settings import BaseSettings
from typing import List, Optional


# BaseSettings: Pydantic class that automatically reads from environment variables.
class Settings(BaseSettings):
    # Application settings: Basic types with defaults.
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
    
    # Config inner class: Controls Pydantic behavior. env_file loads variables from .env; case_sensitive=True distinguishes 'DEBUG' from 'debug'.
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()
```
**Explanation:**
This defines a `Settings` class inheriting from `BaseSettings`. It declares configuration fields with type hints and default values. The `Config` inner class tells Pydantic to read values from a `.env` file, automatically mapping environment variables (e.g., `PROJECT_NAME`) to class attributes.

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
**Explanation:**
This is a standard `.env` file. Pydantic reads these key-value pairs and injects them into the `Settings` class. It handles type conversion automatically (e.g., `DEBUG=true` becomes a Python boolean `True`).

## Advanced Configuration Patterns

### 1. **Nested Configuration Classes**

Groups related settings into sub-models. The `env_prefix` prevents naming collisions and organizes environment variables by domain.

```python
from pydantic import Field
from pydantic_settings import BaseSettings

# DatabaseSettings: Groups all database-related config with DB_ prefix.
class DatabaseSettings(BaseSettings):
    url: str
    pool_size: int = 10
    max_overflow: int = 20
    echo: bool = False
    
    class Config:
        env_prefix = "DB_"  # Reads DB_URL, DB_POOL_SIZE, etc.

# SecuritySettings: Groups security config with SECURITY_ prefix.
class SecuritySettings(BaseSettings):
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    
    class Config:
        env_prefix = "SECURITY_"  # Reads SECURITY_SECRET_KEY, etc.

# Settings: Main config that nests sub-configs.
class Settings(BaseSettings):
    project_name: str = "My FastAPI App"
    # default_factory: Creates new instance for each Settings object.
    database: DatabaseSettings = Field(default_factory=DatabaseSettings)
    security: SecuritySettings = Field(default_factory=SecuritySettings)
    
    class Config:
        env_file = ".env"


settings = Settings()
# Access: settings.database.url
# Access: settings.security.secret_key
```
**Explanation:**
This pattern groups related settings into sub-models (`DatabaseSettings`, `SecuritySettings`). The `env_prefix` config ensures that `DatabaseSettings` only reads variables starting with `DB_` (e.g., `DB_URL`), preventing naming collisions and keeping the environment namespace organized.

### 2. **Environment-Specific Configuration**

Uses Enum for type-safe environments and `model_post_init` to automatically configure settings based on the environment.

```python
from enum import Enum
from pydantic_settings import BaseSettings

# Environment: Enum ensures only valid environment values are accepted.
class Environment(str, Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"

class Settings(BaseSettings):
    environment: Environment = Environment.DEVELOPMENT
    
    # Development-specific: Flags that change based on environment.
    debug: bool = False
    reload: bool = False
    
    # Database configuration: Required field loaded from env vars/.env.
    database_url: str
    
    # @property: Computed properties for environment checks.
    @property
    def is_development(self) -> bool:
        return self.environment == Environment.DEVELOPMENT
    
    @property
    def is_production(self) -> bool:
        return self.environment == Environment.PRODUCTION
    
    # model_post_init: Runs after initialization, perfect for dependent configuration.
    def model_post_init(self, __context):
        # Auto-configure debug/reload based on environment.
        if self.is_development:
            self.debug = True
            self.reload = True
    
    class Config:
        env_file = ".env"


settings = Settings()
```
**Explanation:**
This snippet uses an `Enum` to define valid environments. The `model_post_init` method (available in Pydantic V2) allows for dynamic configuration logic—in this case, automatically enabling debug mode and reloading when the environment is set to `DEVELOPMENT`.

### 3. **Validated Configuration Values**

Uses `Field` for declarative validation and `@validator` for custom validation logic. Ensures configuration values meet requirements before the app starts.

```python
from pydantic import Field, validator
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # Validated fields: Field() enforces constraints (ge=min, le=max).
    port: int = Field(ge=1, le=65535, default=8000)  # Valid port range
    max_workers: int = Field(ge=1, le=100, default=4)  # Reasonable worker limit
    
    # List validation: default_factory=list creates fresh list per instance.
    cors_origins: List[str] = Field(default_factory=list)
    
    # Custom validation: min_length enforces security requirements.
    secret_key: str = Field(min_length=32)  # Minimum security requirement
    
    # @validator: Custom validation logic. pre=True runs before Pydantic parsing.
    @validator("cors_origins", pre=True)
    def parse_cors_origins(cls, v):
        # Handle JSON string from .env: Converts "[\"url1\",\"url2\"]" to list.
        if isinstance(v, str):
            import json
            return json.loads(v)
        return v
    
    @validator("secret_key")
    def validate_secret_key(cls, v):
        # Custom validation: Enforce minimum length for security.
        if len(v) < 32:
            raise ValueError("Secret key must be at least 32 characters")
        return v
    
    class Config:
        env_file = ".env"


settings = Settings()
```
**Explanation:**
Pydantic's `Field` allows for declarative validation (e.g., `ge=1` for minimum port number). The `@validator` decorator enables custom logic, such as parsing a JSON string from an environment variable into a Python list for `cors_origins`, or enforcing minimum length on secrets.

### 4. **Configuration with Computed Properties**

Derives configuration values from others using `@property`. Ensures consistency without storing redundant data.

```python
from pydantic_settings import BaseSettings
from urllib.parse import urlparse

class Settings(BaseSettings):
    database_url: str  # Single source of truth
    
    # @property: Computes values on access, extracting from database_url.
    @property
    def database_host(self) -> str:
        # urlparse - Python stdlib function to parse URLs into components
        # Breaks "postgresql://user:pass@localhost:5432/dbname" into parts
        # Returns ParseResult with: scheme, netloc, hostname, port, path, etc.
        # .hostname extracts just the host part (e.g., "localhost")
        parsed = urlparse(self.database_url)
        return parsed.hostname  # Extract hostname from URL
    
    @property
    def database_port(self) -> int:
        parsed = urlparse(self.database_url)
        return parsed.port or 5432  # Default PostgreSQL port if not specified
    
    @property
    def database_name(self) -> str:
        parsed = urlparse(self.database_url)
        return parsed.path.lstrip("/")  # Extract database name from path
    
    class Config:
        env_file = ".env"


settings = Settings()
# Access: settings.database_host  # Computed on access, not stored
```
**Explanation:**
Using `@property` decorators allows you to derive configuration values from others. Here, `database_host`, `database_port`, and `database_name` are automatically extracted from the `database_url` whenever they are accessed, ensuring consistency without storing redundant data.

## Multi-Environment Configuration

### Strategy 1: Multiple Config Files

Uses different `.env` files for each environment. The `Config` class dynamically selects the correct file based on the `ENVIRONMENT` variable.

```python
# app/core/config.py
import os
from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    environment: str = "development"
    
    # Config: Dynamic env_file path loads .env.development, .env.production, etc.
    class Config:
        env_file = f".env.{os.getenv('ENVIRONMENT', 'development')}"  # Selects file based on env
        env_file_encoding = "utf-8"


# .env.development: Development-specific settings.
ENVIRONMENT=development
DEBUG=true
DATABASE_URL=postgresql://localhost/dev_db

# .env.production: Production-specific settings.
ENVIRONMENT=production
DEBUG=false
DATABASE_URL=postgresql://prod-host/prod_db
```
**Explanation:**
This strategy uses different `.env` files for each environment (e.g., `.env.development`, `.env.production`). The `Config` class dynamically selects the correct file based on the `ENVIRONMENT` environment variable, keeping configurations isolated and manageable.

### Strategy 2: Configuration Factory

Uses `lru_cache` to load settings once and reuse them. Factory function allows environment-specific overrides.

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

# @lru_cache: Caches result to avoid re-reading files/env vars on every call.
@lru_cache()
def get_settings() -> Settings:
    environment = os.getenv("ENVIRONMENT", "development")
    
    # Load base settings: Reads from .env file.
    settings = Settings()
    
    # Override based on environment: Manually set values for production.
    if environment == "production":
        settings.debug = False  # Force debug off in production
        settings.database_url = os.getenv("DATABASE_URL")  # Override from env
    
    return settings


# Usage: Call once, cached for subsequent calls.
settings = get_settings()
```
**Explanation:**
Using `lru_cache` ensures that settings are loaded only once, improving performance. The factory function `get_settings` allows for logic to override values based on the environment (e.g., forcing `debug=False` in production) before returning the settings object.

## Configuration with Secrets Management

### Integration with Vault/AWS Secrets Manager

For production, fetch secrets from secure vaults instead of files. Falls back to `.env` for local development.

```python
# app/core/config.py
import os
from pydantic_settings import BaseSettings
# Optional - Type hint indicating value can be None
# Optional[str] is equivalent to Union[str, None] or str | None (Python 3.10+)
# Use when a value might not be present (e.g., optional config, nullable fields)
# Helps IDEs and type checkers understand None is a valid value
from typing import Optional
import boto3  # For AWS Secrets Manager
import json

class Settings(BaseSettings):
    environment: str
    secret_key: str
    database_url: str
    
    # @classmethod: Factory method to load settings from external sources.
    @classmethod
    def from_secrets_manager(cls):
        """Load secrets from AWS Secrets Manager"""
        if os.getenv("ENVIRONMENT") == "production":
            # Production: Fetch from AWS Secrets Manager.
            # boto3.client - AWS SDK for Python, creates service client
            # "secretsmanager" - AWS service for storing/retrieving secrets securely
            # Alternative to storing secrets in .env files (more secure for production)
            # Requires AWS credentials configured (IAM role, env vars, or ~/.aws/credentials)
            client = boto3.client("secretsmanager")
            secret = client.get_secret_value(
                SecretId="my-app/secrets"
            )
            secrets = json.loads(secret["SecretString"])
            # cls(**secrets) - Unpacks dictionary as keyword arguments to create Settings
            # Example: cls(**{"secret_key": "abc", "database_url": "..."}) 
            # → Settings(secret_key="abc", database_url="...")
            # cls is the class itself (Settings), not an instance
            return cls(**secrets)  # Create Settings from secrets
        else:
            # Use .env for local development: Fallback for dev/test.
            return cls()
    
    class Config:
        env_file = ".env"


# Usage: Factory method selects source based on environment.
settings = Settings.from_secrets_manager()
```
**Explanation:**
For high security, secrets should not be stored in files. This pattern uses a factory method `from_secrets_manager` to fetch sensitive data directly from a secure vault (like AWS Secrets Manager) when running in production, while falling back to `.env` for local development.

## Configuration Validation at Startup

Validates configuration at startup to catch errors early. Prevents runtime failures from missing or invalid settings.

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
    # Validation: Instantiating Settings() triggers validation. Fail fast if invalid.
    try:
        return Settings()
    except ValidationError as e:
        # Print clear error messages for missing/invalid settings.
        print("Configuration validation failed:")
        for error in e.errors():
            print(f"  {error['loc']}: {error['msg']}")
        sys.exit(1)  # Exit immediately, don't start app with bad config


settings = validate_settings()  # Validates on import
```
**Explanation:**
Validating configuration at the very start of the application prevents runtime errors later. This script attempts to instantiate `Settings`; if it fails (e.g., missing required variables), it catches the `ValidationError`, prints a clear error message, and exits the process immediately.

## Using Settings in FastAPI

Inject settings via dependencies for testability. Allows overriding settings in tests without changing environment variables.

```python
# app/main.py
from fastapi import FastAPI
from app.core.config import settings

# Use settings directly in app initialization.
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    debug=settings.DEBUG
)

# Use in dependencies: Wrap in function for dependency injection.
from fastapi import Depends

def get_settings():
    return settings  # Can be overridden in tests

@app.get("/config")
# Depends(get_settings): Dependency injection ensures settings are loaded/cached efficiently.
async def get_config(settings = Depends(get_settings)):
    return {
        "project_name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }
```
**Explanation:**
This shows how to inject settings into FastAPI endpoints. Using `Depends(get_settings)` is crucial because it allows FastAPI to cache the settings object (if `lru_cache` is used) and, more importantly, allows you to override the settings dependency during testing.

## Testing with Configuration

Override settings in tests using FastAPI's dependency overrides. Use test-specific values without changing environment variables.

```python
# tests/conftest.py
import pytest
from app.core.config import Settings, get_settings

@pytest.fixture
def test_settings():
    """Override settings for testing: Use in-memory DB and test values."""
    return Settings(
        DATABASE_URL="sqlite+aiosqlite:///:memory:",  # In-memory DB for tests
        SECRET_KEY="test-secret-key",  # Test secret, not real one
        DEBUG=True
    )

@pytest.fixture
def override_settings(test_settings):
    """Override settings dependency: Replace get_settings with test version."""
    from app.main import app
    from app.core.config import get_settings
    
    def _get_settings():
        return test_settings  # Return test settings instead of real ones
    
    # app.dependency_overrides: FastAPI feature to replace dependencies during testing.
    app.dependency_overrides[get_settings] = _get_settings
    yield
    app.dependency_overrides.clear()  # Clean up after test
```
**Explanation:**
This `pytest` fixture demonstrates how to mock configuration for tests. By overriding the `get_settings` dependency, you can inject a `Settings` object with test-specific values (like an in-memory SQLite database) without changing your actual environment variables or `.env` files.

## Best Practices

### 1. **Use Environment Variables for Secrets**

**Why:** Never hardcode secrets in code. Use environment variables or secrets managers to keep sensitive data secure and environment-specific.

```python
# ✅ Good - secrets in environment
SECRET_KEY=${SECRET_KEY}  # Set in environment

# ❌ Bad - secrets in code
SECRET_KEY = "hardcoded-secret"  # Security risk, not environment-specific
```

### 2. **Provide Sensible Defaults**

**Why:** Defaults make development easier and prevent startup failures. Required fields should only be used for truly critical settings.

```python
# ✅ Good: Defaults allow app to run without all env vars set.
HOST: str = "0.0.0.0"
PORT: int = 8000

# ❌ Bad - no defaults: App fails if env var missing.
HOST: str  # Will fail if not set
```

### 3. **Validate Configuration at Startup**

**Why:** Catch configuration errors immediately at startup, not during runtime. Prevents mysterious failures later.

```python
# Validate early: Fail fast if configuration is invalid.
settings = Settings()  # Raises ValidationError if invalid
```

### 4. **Use Type Hints**

**Why:** Type hints enable automatic type conversion and validation. Pydantic converts strings to appropriate types automatically.

```python
# ✅ Good - clear types: Pydantic auto-converts "8000" to int.
PORT: int = 8000
DEBUG: bool = False

# ❌ Bad - unclear types: Manual conversion needed, error-prone.
PORT = "8000"  # String, needs conversion
```

### 5. **Document Configuration Options**

**Why:** Documentation helps team members understand what each setting does and what values are expected.

```python
# Document settings: Docstrings help developers understand configuration options.
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

**Key Benefits:** Type-safe configuration, automatic environment variable loading, validation of configuration values, support for nested configuration, environment-specific configurations, and easy testing with overrides.

**Use for:** Application settings, database configuration, security settings, external service URLs, feature flags, and environment-specific overrides.