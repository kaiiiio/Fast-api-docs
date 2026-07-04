# Config Management: Minimal Guide

## Pydantic `BaseSettings`
*   **Definition:** Specialized Pydantic model (`Settings`) that reads configuration from environment variables.
*   **`.env` Support:** Use `Config` class inside `Settings` to specify `env_file = ".env"`.
*   **Validation:** Automatically validates types (e.g., `TIMEOUT: int`). Crashes if mandatory vars are missing.
*   **Nested Configs:** Group settings into classes (e.g., `db`, `redis`, `auth`) for better organization.

## Implementation Example
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DB_URL: str
    REDIS_HOST: str = "localhost"  # Default value
    DEBUG: bool = False
    
    class Config:
        env_file = ".env"

settings = Settings()
```

## Best Practices
- ✅ Keep secrets in `.env` (don't commit to Git).
- ✅ Use type hints for all configuration fields.
- ✅ Group related settings (Database, API, Security) for modularity.