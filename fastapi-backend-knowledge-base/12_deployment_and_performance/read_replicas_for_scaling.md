# Read Replicas for Scaling: Complete Implementation Guide

Read replicas distribute read load across multiple database servers, enabling horizontal scaling for read-heavy applications. This guide covers setup, routing, and best practices.

## Understanding Read Replicas

**What are read replicas?**
Duplicate database servers that receive copies of data from the primary (master) database and serve read queries.

**Architecture:**
```
Primary Database (Write)
    │
    │ Replication
    ├──────────────┐
    │              │
    ▼              ▼
Replica 1      Replica 2
(Read)         (Read)
```

**Benefits:**
- Distribute read load
- Scale horizontally
- Improve read performance
- Geographic distribution

## Step 1: Setting Up Read Replicas

### Database Configuration

**PostgreSQL Primary Setup:**
```sql
-- Enable replication
ALTER SYSTEM SET wal_level = replica;
ALTER SYSTEM SET max_wal_senders = 3;
ALTER SYSTEM SET max_replication_slots = 3;
```

**PostgreSQL Replica Setup:**
```bash
# Create replica using pg_basebackup
pg_basebackup -h primary-host -D /var/lib/postgresql/data -U replicator -v -P -W
```

### Connection Strings

```python
# Primary (write) database
WRITE_DATABASE_URL = "postgresql+asyncpg://user:password@primary-db:5432/mydb"

# Read replicas
READ_REPLICA_1_URL = "postgresql+asyncpg://user:password@replica-1:5432/mydb"
READ_REPLICA_2_URL = "postgresql+asyncpg://user:password@replica-2:5432/mydb"
```

## Step 2: Creating Separate Engines

### Engine Configuration

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

# Primary engine (writes)
write_engine = create_async_engine(
    WRITE_DATABASE_URL,
    pool_size=10,
    max_overflow=10,
    pool_pre_ping=True
)

# Read replica engines
read_replica_1_engine = create_async_engine(
    READ_REPLICA_1_URL,
    pool_size=20,  # Larger pool for reads
    max_overflow=20,
    pool_pre_ping=True
)

read_replica_2_engine = create_async_engine(
    READ_REPLICA_2_URL,
    pool_size=20,
    max_overflow=20,
    pool_pre_ping=True
)

# Session factories
WriteSession = async_sessionmaker(write_engine, expire_on_commit=False)
ReadSession1 = async_sessionmaker(read_replica_1_engine, expire_on_commit=False)
ReadSession2 = async_sessionmaker(read_replica_2_engine, expire_on_commit=False)
```

## Step 3: Database Router

### Basic Router

```python
import random
from typing import List

class DatabaseRouter:
    """Route queries to appropriate database."""
    
    def __init__(
        self,
        write_engine,
        read_engines: List
    ):
        self.write_engine = write_engine
        self.read_engines = read_engines
        self.read_session_makers = [
            async_sessionmaker(engine, expire_on_commit=False)
            for engine in read_engines
        ]
        self.write_session_maker = async_sessionmaker(
            write_engine,
            expire_on_commit=False
        )
    
    def get_read_session(self) -> AsyncSession:
        """Get session from random read replica (load balancing)."""
        session_maker = random.choice(self.read_session_makers)
        return session_maker()
    
    def get_write_session(self) -> AsyncSession:
        """Get session for write operations."""
        return self.write_session_maker()
    
    async def close_all(self):
        """Close all engines."""
        await self.write_engine.dispose()
        for engine in self.read_engines:
            await engine.dispose()

# Initialize router
db_router = DatabaseRouter(
    write_engine=write_engine,
    read_engines=[read_replica_1_engine, read_replica_2_engine]
)
```

### Advanced Router with Health Checks

```python
class HealthyDatabaseRouter:
    """Router with health checks and automatic failover."""
    
    def __init__(self, write_engine, read_engines: List):
        self.write_engine = write_engine
        self.read_engines = read_engines
        self.healthy_read_engines = read_engines.copy()
        self.health_check_interval = 60  # Check every minute
        self._last_health_check = 0
    
    async def _check_replica_health(self, engine) -> bool:
        """Check if replica is healthy."""
        try:
            async with engine.begin() as conn:
                await conn.execute(text("SELECT 1"))
            return True
        except Exception:
            return False
    
    async def _update_healthy_replicas(self):
        """Update list of healthy replicas."""
        current_time = time.time()
        if current_time - self._last_health_check < self.health_check_interval:
            return
        
        self._last_health_check = current_time
        healthy = []
        
        for engine in self.read_engines:
            if await self._check_replica_health(engine):
                healthy.append(engine)
        
        self.healthy_read_engines = healthy
    
    def get_read_session(self) -> AsyncSession:
        """Get session from healthy replica."""
        if not self.healthy_read_engines:
            # Fallback to write database if all replicas down
            return async_sessionmaker(self.write_engine)()
        
        engine = random.choice(self.healthy_read_engines)
        return async_sessionmaker(engine)()
    
    def get_write_session(self) -> AsyncSession:
        """Get write session."""
        return async_sessionmaker(self.write_engine)()
```

## Step 4: FastAPI Integration

### Dependency Injection

```python
from fastapi import Depends

async def get_read_db() -> AsyncSession:
    """Dependency for read operations."""
    session = db_router.get_read_session()
    try:
        yield session
    finally:
        await session.close()

async def get_write_db() -> AsyncSession:
    """Dependency for write operations."""
    session = db_router.get_write_session()
    try:
        yield session
    finally:
        await session.close()

# Usage in routes
@router.get("/users/{user_id}")
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_read_db)  # Use read replica
):
    """Read operation - uses replica."""
    user = await db.get(User, user_id)
    return user

@router.post("/users")
async def create_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_write_db)  # Use primary
):
    """Write operation - uses primary."""
    user = User(**user_data.dict())
    db.add(user)
    await db.commit()
    return user
```

## Step 5: Automatic Routing

### Router Based on Query Type

```python
class AutoRouter:
    """Automatically route based on operation type."""
    
    def __init__(self, router: DatabaseRouter):
        self.router = router
    
    async def get_session(self, read_only: bool = False) -> AsyncSession:
        """Get appropriate session based on operation."""
        if read_only:
            return self.router.get_read_session()
        else:
            return self.router.get_write_session()

# Dependency that auto-routes
async def get_db(read_only: bool = False) -> AsyncSession:
    """Auto-route database session."""
    auto_router = AutoRouter(db_router)
    session = await auto_router.get_session(read_only=read_only)
    try:
        yield session
    finally:
        await session.close()

# Usage - FastAPI will use read replica for GET
@router.get("/products")
async def list_products(
    db: AsyncSession = Depends(get_db(read_only=True))
):
    """Read operation - auto-routed to replica."""
    products = await db.execute(select(Product))
    return products.scalars().all()

# Write operation - auto-routed to primary
@router.post("/products")
async def create_product(
    product_data: ProductCreate,
    db: AsyncSession = Depends(get_db(read_only=False))
):
    """Write operation - auto-routed to primary."""
    product = Product(**product_data.dict())
    db.add(product)
    await db.commit()
    return product
```

## Step 6: Load Balancing Strategies

### Round-Robin

```python
class RoundRobinRouter:
    """Round-robin load balancing."""
    
    def __init__(self, read_engines: List):
        self.read_engines = read_engines
        self.current_index = 0
    
    def get_read_session(self) -> AsyncSession:
        """Get session using round-robin."""
        engine = self.read_engines[self.current_index]
        self.current_index = (self.current_index + 1) % len(self.read_engines)
        return async_sessionmaker(engine)()
```

### Weighted Random

```python
class WeightedRouter:
    """Weighted random load balancing."""
    
    def __init__(self, read_engines: List, weights: List[float]):
        self.read_engines = read_engines
        self.weights = weights
    
    def get_read_session(self) -> AsyncSession:
        """Get session using weighted random."""
        engine = random.choices(self.read_engines, weights=self.weights)[0]
        return async_sessionmaker(engine)()
```

## Step 7: Replication Lag Handling

### Checking Replication Lag

```python
async def get_replication_lag(replica_engine) -> float:
    """Get replication lag in seconds."""
    async with replica_engine.begin() as conn:
        result = await conn.execute(text("""
            SELECT EXTRACT(EPOCH FROM (NOW() - pg_last_xact_replay_timestamp())) AS lag
        """))
        lag = result.scalar()
        return lag or 0.0

async def get_read_session_with_lag_check():
    """Get read session from replica with acceptable lag."""
    for engine in db_router.read_engines:
        lag = await get_replication_lag(engine)
        if lag < 1.0:  # Acceptable lag < 1 second
            return async_sessionmaker(engine)()
    
    # If all replicas lagging, use primary
    return db_router.get_write_session()
```

## Step 8: Monitoring Replica Health

### Health Check Endpoints

```python
@router.get("/health/replicas")
async def check_replica_health():
    """Check health of all replicas."""
    replicas = []
    
    for i, engine in enumerate(db_router.read_engines):
        try:
            async with engine.begin() as conn:
                await conn.execute(text("SELECT 1"))
            
            lag = await get_replication_lag(engine)
            
            replicas.append({
                "replica": f"replica-{i+1}",
                "status": "healthy",
                "replication_lag_s": lag
            })
        except Exception as e:
            replicas.append({
                "replica": f"replica-{i+1}",
                "status": "unhealthy",
                "error": str(e)
            })
    
    return {"replicas": replicas}
```

## Best Practices

1. **Route writes to primary**: All writes must go to primary
2. **Route reads to replicas**: Distribute read load
3. **Handle replication lag**: Account for eventual consistency
4. **Monitor replica health**: Remove unhealthy replicas
5. **Fallback to primary**: Use primary if replicas unavailable

## Summary

Read replicas provide:
- ✅ Horizontal scaling for reads
- ✅ Load distribution
- ✅ Better read performance
- ✅ Geographic distribution

Implement read replicas for scalable, high-performance applications!
