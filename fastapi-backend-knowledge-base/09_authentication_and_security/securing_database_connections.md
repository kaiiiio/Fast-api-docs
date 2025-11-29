# Securing Database Connections: Complete Security Guide

Secure database connections protect data in transit and at connection time. This comprehensive guide covers SSL/TLS configuration, credential management, and production security practices.

## Understanding Connection Security

**Why secure database connections?**
- Prevent data interception (man-in-the-middle attacks)
- Encrypt data in transit
- Verify server identity
- Protect credentials

**Security layers:**
1. **Connection encryption** (SSL/TLS)
2. **Credential protection** (secrets management)
3. **Network security** (VPN, private networks)
4. **Access control** (user privileges)

## Step 1: SSL/TLS for PostgreSQL

### Basic SSL Configuration

```python
from sqlalchemy.ext.asyncio import create_async_engine
from ssl import create_default_context
import os

# Create SSL context
ssl_context = create_default_context()

# Configure SSL for asyncpg
engine = create_async_engine(
    DATABASE_URL,
    connect_args={
        "ssl": ssl_context
    }
)
```

### SSL Modes

**PostgreSQL SSL modes:**

1. **disable**: No SSL (not recommended)
2. **allow**: Try SSL, fallback if unavailable
3. **prefer**: Prefer SSL, fallback if unavailable
4. **require**: Require SSL, fail if unavailable ✅ (recommended)
5. **verify-ca**: Require SSL + verify CA certificate ✅✅
6. **verify-full**: Require SSL + verify CA + hostname ✅✅✅ (most secure)

### Production SSL Configuration

```python
from ssl import SSLContext, create_default_context, CERT_REQUIRED
import ssl

def create_ssl_context(mode: str = "verify-full") -> SSLContext:
    """Create SSL context based on security requirements."""
    
    if mode == "verify-full":
        # Most secure - verify certificate and hostname
        ssl_context = create_default_context()
        ssl_context.check_hostname = True
        ssl_context.verify_mode = CERT_REQUIRED
        return ssl_context
    
    elif mode == "verify-ca":
        # Verify CA certificate, but not hostname
        ssl_context = create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = CERT_REQUIRED
        return ssl_context
    
    elif mode == "require":
        # Require SSL but don't verify certificate
        ssl_context = create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        return ssl_context
    
    else:
        raise ValueError(f"Invalid SSL mode: {mode}")

# Use in engine
engine = create_async_engine(
    DATABASE_URL,
    connect_args={
        "ssl": create_ssl_context(mode="verify-full")
    }
)
```

### SSL in Connection String

```python
# In connection string
DATABASE_URL = (
    "postgresql+asyncpg://user:password@host:5432/database"
    "?sslmode=require"  # Require SSL
)

# More secure options
DATABASE_URL = (
    "postgresql+asyncpg://user:password@host:5432/database"
    "?sslmode=verify-ca"  # Verify CA certificate
)

# Most secure
DATABASE_URL = (
    "postgresql+asyncpg://user:password@host:5432/database"
    "?sslmode=verify-full"  # Verify CA and hostname
)
```

## Step 2: Custom SSL Certificates

### Using Custom CA Certificate

```python
def create_ssl_context_with_ca(ca_cert_path: str) -> SSLContext:
    """Create SSL context with custom CA certificate."""
    ssl_context = create_default_context()
    ssl_context.load_verify_locations(ca_cert_path)
    ssl_context.check_hostname = True
    ssl_context.verify_mode = CERT_REQUIRED
    return ssl_context

# Use custom CA
engine = create_async_engine(
    DATABASE_URL,
    connect_args={
        "ssl": create_ssl_context_with_ca("/path/to/ca-cert.pem")
    }
)
```

### Client Certificate Authentication

```python
def create_ssl_context_with_client_cert(
    ca_cert_path: str,
    client_cert_path: str,
    client_key_path: str
) -> SSLContext:
    """Create SSL context with client certificate (mutual TLS)."""
    ssl_context = create_default_context()
    
    # CA certificate
    ssl_context.load_verify_locations(ca_cert_path)
    ssl_context.check_hostname = True
    ssl_context.verify_mode = CERT_REQUIRED
    
    # Client certificate
    ssl_context.load_cert_chain(client_cert_path, client_key_path)
    
    return ssl_context

# Mutual TLS (most secure)
engine = create_async_engine(
    DATABASE_URL,
    connect_args={
        "ssl": create_ssl_context_with_client_cert(
            ca_cert_path="/path/to/ca-cert.pem",
            client_cert_path="/path/to/client-cert.pem",
            client_key_path="/path/to/client-key.pem"
        )
    }
)
```

## Step 3: Credential Management

### Environment Variables

```python
from pydantic_settings import BaseSettings
import os

class DatabaseSettings(BaseSettings):
    """Database configuration from environment."""
    
    db_host: str
    db_port: int = 5432
    db_name: str
    db_user: str
    db_password: str  # Never hardcode!
    
    @property
    def database_url(self) -> str:
        """Build database URL from components."""
        return (
            f"postgresql+asyncpg://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
            f"?sslmode=require"
        )
    
    class Config:
        env_file = ".env"
        env_prefix = "DB_"

settings = DatabaseSettings()
engine = create_async_engine(settings.database_url)
```

### AWS Secrets Manager

```python
import boto3
import json

class SecretsManagerClient:
    """Client for AWS Secrets Manager."""
    
    def __init__(self, region: str = "us-east-1"):
        self.client = boto3.client("secretsmanager", region_name=region)
    
    def get_secret(self, secret_name: str) -> dict:
        """Get secret from AWS Secrets Manager."""
        response = self.client.get_secret_value(SecretId=secret_name)
        return json.loads(response["SecretString"])

# Use in settings
class DatabaseSettings(BaseSettings):
    """Database settings with secrets manager."""
    
    secrets_manager_arn: Optional[str] = None
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        
        if self.secrets_manager_arn:
            secrets_client = SecretsManagerClient()
            secrets = secrets_client.get_secret(self.secrets_manager_arn)
            
            self.db_host = secrets["host"]
            self.db_port = secrets.get("port", 5432)
            self.db_name = secrets["database"]
            self.db_user = secrets["username"]
            self.db_password = secrets["password"]
```

### HashiCorp Vault

```python
import hvac

class VaultClient:
    """Client for HashiCorp Vault."""
    
    def __init__(self, vault_url: str, token: str):
        self.client = hvac.Client(url=vault_url, token=token)
    
    def get_database_credentials(self, path: str) -> dict:
        """Get database credentials from Vault."""
        response = self.client.secrets.kv.v2.read_secret_version(path=path)
        return response["data"]["data"]

# Use Vault
vault_client = VaultClient(
    vault_url=os.getenv("VAULT_ADDR"),
    token=os.getenv("VAULT_TOKEN")
)

db_creds = vault_client.get_database_credentials("database/creds")
DATABASE_URL = f"postgresql+asyncpg://{db_creds['username']}:{db_creds['password']}@{db_creds['host']}:5432/{db_creds['database']}"
```

## Step 4: Connection String Security

### Secure Connection String Builder

```python
from urllib.parse import quote_plus

class SecureDatabaseURL:
    """Build secure database connection string."""
    
    def __init__(
        self,
        host: str,
        port: int,
        database: str,
        username: str,
        password: str,
        ssl_mode: str = "require"
    ):
        self.host = host
        self.port = port
        self.database = database
        self.username = quote_plus(username)  # URL encode
        self.password = quote_plus(password)  # URL encode
        self.ssl_mode = ssl_mode
    
    def build_url(self) -> str:
        """Build connection URL with security parameters."""
        base_url = (
            f"postgresql+asyncpg://{self.username}:{self.password}"
            f"@{self.host}:{self.port}/{self.database}"
        )
        
        params = {
            "sslmode": self.ssl_mode,
            "connect_timeout": "10",
            "application_name": "fastapi_app"
        }
        
        query_string = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{base_url}?{query_string}"

# Usage
db_url = SecureDatabaseURL(
    host=os.getenv("DB_HOST"),
    port=5432,
    database=os.getenv("DB_NAME"),
    username=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    ssl_mode="verify-full"
).build_url()

engine = create_async_engine(db_url)
```

## Step 5: Connection Pool Security

### Secure Connection Pool Configuration

```python
from sqlalchemy.pool import QueuePool

engine = create_async_engine(
    DATABASE_URL,
    
    # Connection pool security
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,  # Verify connections before use
    
    # Connection arguments
    connect_args={
        "ssl": create_ssl_context(mode="verify-full"),
        "server_settings": {
            "application_name": "fastapi_production",
            # Additional security settings
        }
    }
)
```

### Connection Validation

```python
from sqlalchemy import event

@event.listens_for(Engine, "connect")
def validate_connection(dbid, connection_rec):
    """Validate connection security settings."""
    # Check SSL
    result = connection_rec.execute(text("SHOW ssl"))
    ssl_enabled = result.scalar()
    
    if ssl_enabled != "on":
        logger.warning("SSL not enabled on database connection!")
    
    # Log connection details (without credentials)
    logger.info(f"Database connection established to {connection_rec.engine.url.host}")
```

## Step 6: Network Security

### Private Network Connections

```python
# Use private network endpoint (not public)
DATABASE_URL_PRIVATE = (
    "postgresql+asyncpg://user:password@"
    "db-private.example.com:5432/database"  # Private endpoint
    "?sslmode=require"
)

# In cloud environments, use:
# - AWS: PrivateLink, VPC peering
# - GCP: Private Service Connect
# - Azure: Private Link
```

### VPN Connection

```python
# When database is behind VPN
# Ensure VPN is connected before starting application

import subprocess

def ensure_vpn_connected():
    """Ensure VPN is connected before database connection."""
    try:
        result = subprocess.run(
            ["ping", "-c", "1", "database-host"],
            timeout=5,
            capture_output=True
        )
        if result.returncode != 0:
            raise ConnectionError("Database host not reachable - VPN may be disconnected")
    except Exception as e:
        raise ConnectionError(f"Cannot connect to database: {e}")

# Check before creating engine
ensure_vpn_connected()
engine = create_async_engine(DATABASE_URL)
```

## Step 7: Production Security Checklist

### Security Configuration

```python
class ProductionDatabaseConfig:
    """Production database security configuration."""
    
    # Connection security
    SSL_MODE = "verify-full"  # Highest security
    CONNECTION_TIMEOUT = 10  # Fail fast if can't connect
    
    # Credential management
    USE_SECRETS_MANAGER = True  # Never store in code
    ROTATE_CREDENTIALS = True  # Regular rotation
    
    # Network security
    USE_PRIVATE_NETWORK = True  # Private endpoints only
    USE_VPN = False  # If required
    
    # Connection pool
    POOL_SIZE = 10
    MAX_OVERFLOW = 20
    POOL_PRE_PING = True  # Verify connections
    
    # Logging (without sensitive data)
    LOG_QUERIES = False  # Don't log in production
    LOG_CONNECTION_INFO = True  # Log connection events (no credentials)
```

## Step 8: Security Monitoring

### Monitor Connection Security

```python
from prometheus_client import Counter, Gauge

insecure_connections = Counter(
    'db_insecure_connections_total',
    'Connections without SSL'
)

ssl_connection_status = Gauge(
    'db_ssl_enabled',
    'SSL enabled on database connections',
    1  # 1 = enabled, 0 = disabled
)

@event.listens_for(Engine, "connect")
def monitor_connection_security(dbid, connection_rec):
    """Monitor connection security."""
    # Check SSL status
    result = connection_rec.execute(text("SHOW ssl"))
    ssl_status = result.scalar()
    
    if ssl_status == "on":
        ssl_connection_status.set(1)
    else:
        ssl_connection_status.set(0)
        insecure_connections.inc()
        logger.error("Insecure database connection detected!")
```

## Best Practices Summary

1. **✅ Always use SSL in production**: `sslmode=require` minimum
2. **✅ Verify certificates**: Use `verify-full` when possible
3. **✅ Store credentials securely**: Use secrets manager, never hardcode
4. **✅ Use private networks**: Avoid public database endpoints
5. **✅ Rotate credentials regularly**: Change passwords periodically
6. **✅ Limit connection privileges**: Use least-privilege users
7. **✅ Monitor connection security**: Alert on insecure connections
8. **✅ Use connection pooling**: Pre-validate connections

## Summary

Securing database connections provides:
- ✅ Data encryption in transit
- ✅ Server identity verification
- ✅ Credential protection
- ✅ Network security

Implement comprehensive connection security for production deployments!
