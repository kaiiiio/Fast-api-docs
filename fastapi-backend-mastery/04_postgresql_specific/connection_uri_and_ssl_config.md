# PostgreSQL Connection URI and SSL Configuration

Configuring database connections correctly is critical for production. This guide explains connection URIs, SSL setup, and security best practices step by step.

## Understanding Connection URIs

**What is a connection URI?**
A connection URI (Uniform Resource Identifier) is a string that contains all information needed to connect to a database.

**Basic format:**
```
postgresql://username:password@hostname:port/database_name
```

**Example:**
```
postgresql://myuser:mypassword@localhost:5432/mydb
```

### Breaking Down the URI

Let's understand each part:

```
postgresql://  myuser  :  mypassword  @  localhost  :  5432  /  mydb
    │              │        │            │          │        │    │
    │              │        │            │          │        │    └─ Database name
    │              │        │            │          │        └────── Port (default: 5432)
    │              │        │            │          └─────────────── Hostname/IP
    │              │        │            └────────────────────────── Password
    │              │        └─────────────────────────────────────── Username
    │              └──────────────────────────────────────────────── Protocol
    └─────────────────────────────────────────────────────────────── Scheme
```

## Step 1: Basic Connection Setup

Let's start with the simplest connection:

```python
from sqlalchemy.ext.asyncio import create_async_engine

# Basic connection (development only - no SSL!)
DATABASE_URL = "postgresql+asyncpg://user:password@localhost:5432/mydb"

engine = create_async_engine(DATABASE_URL)
```

**Security warning:**
This connection is NOT encrypted. Never use this in production!

## Step 2: Understanding Async Drivers

PostgreSQL async drivers:

**`asyncpg` (Recommended):**
- Fastest async driver
- Native async support
- URI: `postgresql+asyncpg://...`

**`psycopg` (Alternative):**
- More mature
- Better compatibility
- URI: `postgresql+psycopg://...`

**For this guide, we'll use asyncpg** (fastest for async FastAPI).

## Step 3: Connection URI with Parameters

You can add parameters to the URI:

```python
DATABASE_URL = (
    "postgresql+asyncpg://user:password@localhost:5432/mydb"
    "?pool_size=10"              # Connection pool size
    "&max_overflow=20"           # Additional connections
    "&pool_timeout=30"           # Wait time for connection
    "&pool_recycle=3600"         # Recycle connections after 1 hour
    "&echo=False"                # Don't log SQL queries
)
```

**Better approach - use URL object:**

```python
from sqlalchemy.engine import URL

database_url = URL.create(
    "postgresql+asyncpg",
    username="myuser",
    password="mypassword",
    host="localhost",
    port=5432,
    database="mydb",
    query={
        "pool_size": "10",
        "max_overflow": "20",
        "pool_timeout": "30",
        "pool_recycle": "3600"
    }
)

engine = create_async_engine(database_url)
```

## Step 4: SSL/TLS Configuration

**Why SSL matters:**
- Encrypts data in transit
- Prevents man-in-the-middle attacks
- Required for production databases

### Development (No SSL)

```python
# Local development - no SSL needed
DATABASE_URL = "postgresql+asyncpg://user:password@localhost:5432/mydb"

engine = create_async_engine(DATABASE_URL)
```

### Production with SSL

```python
from ssl import create_default_context

# Production - SSL required
DATABASE_URL = (
    "postgresql+asyncpg://user:password@db.example.com:5432/mydb"
)

# SSL context
ssl_context = create_default_context()

engine = create_async_engine(
    DATABASE_URL,
    connect_args={
        "ssl": ssl_context  # Use system's default SSL certificates
    }
)
```

### SSL with Custom Certificates

For managed databases (AWS RDS, Google Cloud SQL, etc.):

```python
import ssl

# SSL with custom CA certificate
ssl_context = ssl.create_default_context()
ssl_context.load_verify_locations("path/to/ca-certificate.crt")

engine = create_async_engine(
    DATABASE_URL,
    connect_args={
        "ssl": ssl_context
    }
)
```

### SSL in Connection URI

You can also specify SSL in the URI:

```python
DATABASE_URL = (
    "postgresql+asyncpg://user:password@db.example.com:5432/mydb"
    "?sslmode=require"                    # Require SSL
    "&sslcert=/path/to/client-cert.crt"   # Client certificate
    "&sslkey=/path/to/client-key.key"     # Client private key
    "&sslrootcert=/path/to/ca-cert.crt"   # CA certificate
)
```

**SSL modes:**
- `disable` - No SSL (development only)
- `allow` - Try SSL, fallback if not available
- `prefer` - Prefer SSL, fallback if not available
- `require` - Require SSL, fail if not available (production)
- `verify-ca` - Require SSL and verify CA
- `verify-full` - Require SSL, verify CA and hostname (most secure)

## Step 5: Environment-Based Configuration

Let's create a production-ready configuration:

```python
from pydantic_settings import BaseSettings
from ssl import create_default_context
import os

class DatabaseSettings(BaseSettings):
    """Database connection settings."""
    
    # Connection details
    db_host: str
    db_port: int = 5432
    db_name: str
    db_user: str
    db_password: str
    
    # Connection pool settings
    pool_size: int = 10
    max_overflow: int = 20
    pool_timeout: int = 30
    pool_recycle: int = 3600
    
    # SSL settings
    ssl_mode: str = "prefer"  # prefer, require, verify-full
    ssl_cert_path: str = None
    ssl_key_path: str = None
    ssl_root_cert_path: str = None
    
    @property
    def database_url(self) -> str:
        """Build database URL from components."""
        return (
            f"postgresql+asyncpg://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )
    
    def get_engine_kwargs(self):
        """Get engine creation arguments."""
        kwargs = {
            "pool_size": self.pool_size,
            "max_overflow": self.max_overflow,
            "pool_timeout": self.pool_timeout,
            "pool_recycle": self.pool_recycle,
            "echo": False,
        }
        
        # Add SSL if configured
        if self.ssl_mode != "disable":
            ssl_context = create_default_context()
            
            if self.ssl_root_cert_path:
                ssl_context.load_verify_locations(self.ssl_root_cert_path)
            
            connect_args = {"ssl": ssl_context}
            
            if self.ssl_cert_path and self.ssl_key_path:
                connect_args["ssl"] = {
                    "ssl": ssl_context,
                    "ssl_cert": self.ssl_cert_path,
                    "ssl_key": self.ssl_key_path,
                }
            
            kwargs["connect_args"] = connect_args
        
        return kwargs
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# Usage
db_settings = DatabaseSettings()

engine = create_async_engine(
    db_settings.database_url,
    **db_settings.get_engine_kwargs()
)
```

## Step 6: Connection String Examples

### Local Development

```python
# .env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecommerce_dev
DB_USER=dev_user
DB_PASSWORD=dev_password
SSL_MODE=disable
```

### Docker Compose

```python
# docker-compose.yml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: ecommerce
      POSTGRES_USER: app_user
      POSTGRES_PASSWORD: secure_password
    ports:
      - "5432:5432"

# Connection from app
DATABASE_URL = "postgresql+asyncpg://app_user:secure_password@postgres:5432/ecommerce"
```

### AWS RDS

```python
# .env
DB_HOST=my-db.xxxxxxxxxx.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=ecommerce_prod
DB_USER=admin
DB_PASSWORD=${DB_PASSWORD}  # From secrets manager
SSL_MODE=verify-full
SSL_ROOT_CERT_PATH=/path/to/rds-ca-cert.pem
```

### Google Cloud SQL

```python
# Cloud SQL Proxy connection
DATABASE_URL = "postgresql+asyncpg://user:password@localhost:5432/mydb"

# With SSL
DATABASE_URL = (
    "postgresql+asyncpg://user:password@/mydb"
    "?host=/cloudsql/myproject:region:instance"
)
```

### Heroku Postgres

```python
# Heroku provides DATABASE_URL environment variable
import os

DATABASE_URL = os.getenv("DATABASE_URL")

# Heroku URL format:
# postgres://user:password@host:port/dbname
# Note: Heroku uses 'postgres://' not 'postgresql://'

# Convert if needed
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
```

## Step 7: Connection Pool Configuration

Understanding pool parameters:

```python
engine = create_async_engine(
    DATABASE_URL,
    pool_size=10,          # Always maintain 10 connections
    max_overflow=20,       # Can create 20 more = 30 total max
    pool_timeout=30,       # Wait max 30 seconds for connection
    pool_recycle=3600,     # Recreate connections after 1 hour
    pool_pre_ping=True,    # Check connection before use
    echo=False,            # Don't log SQL (set True for debugging)
)
```

**Tuning guidelines:**
- `pool_size`: Start with 5-10, increase based on traffic
- `max_overflow`: 2x pool_size for traffic spikes
- `pool_recycle`: 3600 seconds (1 hour) prevents stale connections
- `pool_pre_ping`: Always True in production

## Step 8: Security Best Practices

### 1. Never Hardcode Credentials

```python
# ❌ BAD
DATABASE_URL = "postgresql+asyncpg://admin:password123@db.example.com/mydb"

# ✅ GOOD
DATABASE_URL = os.getenv("DATABASE_URL")
# Or use pydantic settings
```

### 2. Use Secrets Management

```python
# AWS Secrets Manager example
import boto3
import json

def get_database_url_from_secrets():
    client = boto3.client('secretsmanager')
    secret = client.get_secret_value(SecretId='prod/database')
    secrets = json.loads(secret['SecretString'])
    return (
        f"postgresql+asyncpg://{secrets['username']}:{secrets['password']}"
        f"@{secrets['host']}:{secrets['port']}/{secrets['database']}"
    )
```

### 3. Use Read-Only Users When Possible

```python
# Separate URLs for read/write
DATABASE_URL_WRITE = os.getenv("DATABASE_URL_WRITE")
DATABASE_URL_READ = os.getenv("DATABASE_URL_READ")  # Read-only user

write_engine = create_async_engine(DATABASE_URL_WRITE)
read_engine = create_async_engine(DATABASE_URL_READ)
```

### 4. Enable SSL in Production

```python
# Always require SSL in production
ssl_context = create_default_context()
engine = create_async_engine(
    DATABASE_URL,
    connect_args={"ssl": ssl_context}
)
```

## Step 9: Complete Production Configuration

Here's a complete, production-ready setup:

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from pydantic_settings import BaseSettings
from ssl import create_default_context
import os

Base = declarative_base()

class Settings(BaseSettings):
    """Application settings."""
    
    # Database
    database_url: str
    pool_size: int = 10
    max_overflow: int = 20
    pool_timeout: int = 30
    pool_recycle: int = 3600
    
    # SSL
    ssl_mode: str = "require"
    ssl_ca_cert_path: str = None
    
    @property
    def engine_kwargs(self):
        """Engine configuration."""
        kwargs = {
            "pool_size": self.pool_size,
            "max_overflow": self.max_overflow,
            "pool_timeout": self.pool_timeout,
            "pool_recycle": self.pool_recycle,
            "pool_pre_ping": True,
            "echo": False,
        }
        
        # SSL configuration
        if self.ssl_mode != "disable":
            ssl_context = create_default_context()
            
            if self.ssl_ca_cert_path:
                ssl_context.load_verify_locations(self.ssl_ca_cert_path)
            
            kwargs["connect_args"] = {"ssl": ssl_context}
        
        return kwargs
    
    class Config:
        env_file = ".env"

settings = Settings()

# Create engine
engine = create_async_engine(
    settings.database_url,
    **settings.engine_kwargs
)

# Create session factory
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)
```

## Summary

Connection configuration essentials:
- ✅ Use connection URIs for simplicity
- ✅ Always use SSL in production
- ✅ Store credentials in environment variables
- ✅ Configure connection pools appropriately
- ✅ Use secrets management for production
- ✅ Test connections before deployment

A well-configured connection is the foundation of a reliable database layer!

