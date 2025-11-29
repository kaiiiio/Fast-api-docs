# Health Checks for DB and Cache: Complete Implementation Guide

Health checks verify database and cache connectivity, enabling orchestration systems (Kubernetes, Docker Swarm) to manage application lifecycle and route traffic correctly.

## Understanding Health Checks

**What are health checks?**
Endpoints that verify if the application and its dependencies are functioning correctly.

**Types of health checks:**
- **Liveness**: Is the application running?
- **Readiness**: Is the application ready to serve traffic?
- **Startup**: Has the application finished starting up?

**Why they matter:**
- Container orchestration uses them for routing
- Load balancers check before routing traffic
- Monitoring systems alert on failures
- Auto-scaling decisions

## Step 1: Basic Health Check Endpoints

### Liveness Check (Is App Running?)

```python
from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

router = APIRouter()

@router.get("/health/live")
async def liveness_check():
    """
    Liveness probe - checks if application is running.
    
    Returns 200 if app is alive, no dependency checks.
    Use this for: Container orchestration restart decisions
    """
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "status": "alive",
            "timestamp": datetime.utcnow().isoformat()
        }
    )
```

**When to fail:**
- Application is crashing
- Deadlock detected
- Should NOT fail for dependency issues

### Readiness Check (Is App Ready?)

```python
@router.get("/health/ready")
async def readiness_check(
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis)
):
    """
    Readiness probe - checks if app can serve traffic.
    
    Returns 200 if all dependencies are healthy.
    Use this for: Traffic routing decisions
    """
    checks = {}
    all_healthy = True
    
    # Check database
    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = {"status": "healthy"}
    except Exception as e:
        checks["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        all_healthy = False
    
    # Check cache
    try:
        await redis.ping()
        checks["cache"] = {"status": "healthy"}
    except Exception as e:
        checks["cache"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        all_healthy = False
    
    status_code = status.HTTP_200_OK if all_healthy else status.HTTP_503_SERVICE_UNAVAILABLE
    
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "ready" if all_healthy else "not_ready",
            "checks": checks,
            "timestamp": datetime.utcnow().isoformat()
        }
    )
```

**When to fail:**
- Database is down
- Cache is unreachable
- Critical dependencies unavailable

## Step 2: Comprehensive Health Check Service

### Health Check Service Class

```python
from enum import Enum
from typing import Dict, List, Optional
from dataclasses import dataclass

class HealthStatus(str, Enum):
    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    DEGRADED = "degraded"

@dataclass
class ComponentHealth:
    """Health status of a single component."""
    name: str
    status: HealthStatus
    response_time_ms: Optional[float] = None
    error: Optional[str] = None
    details: Optional[Dict] = None

class HealthCheckService:
    """Service for performing health checks."""
    
    def __init__(
        self,
        db: Optional[AsyncSession] = None,
        redis: Optional[aioredis.Redis] = None
    ):
        self.db = db
        self.redis = redis
    
    async def check_database(self) -> ComponentHealth:
        """Check database health."""
        start_time = time.time()
        
        try:
            # Simple query to verify connectivity
            await self.db.execute(text("SELECT 1"))
            
            # Optional: Check connection pool
            pool_size = self.db.bind.pool.size() if hasattr(self.db.bind, 'pool') else None
            
            response_time = (time.time() - start_time) * 1000
            
            # Determine if healthy (response time threshold)
            if response_time > 1000:  # > 1 second is degraded
                return ComponentHealth(
                    name="database",
                    status=HealthStatus.DEGRADED,
                    response_time_ms=response_time,
                    details={"pool_size": pool_size}
                )
            
            return ComponentHealth(
                name="database",
                status=HealthStatus.HEALTHY,
                response_time_ms=response_time,
                details={"pool_size": pool_size}
            )
        
        except Exception as e:
            return ComponentHealth(
                name="database",
                status=HealthStatus.UNHEALTHY,
                error=str(e)
            )
    
    async def check_cache(self) -> ComponentHealth:
        """Check Redis cache health."""
        start_time = time.time()
        
        try:
            # Ping Redis
            pong = await self.redis.ping()
            
            if not pong:
                return ComponentHealth(
                    name="cache",
                    status=HealthStatus.UNHEALTHY,
                    error="Ping failed"
                )
            
            response_time = (time.time() - start_time) * 1000
            
            # Optional: Check Redis info
            info = await self.redis.info("server")
            redis_version = info.get("redis_version", "unknown")
            
            return ComponentHealth(
                name="cache",
                status=HealthStatus.HEALTHY,
                response_time_ms=response_time,
                details={"redis_version": redis_version}
            )
        
        except Exception as e:
            return ComponentHealth(
                name="cache",
                status=HealthStatus.UNHEALTHY,
                error=str(e)
            )
    
    async def check_all(self) -> Dict[str, ComponentHealth]:
        """Check all components."""
        checks = {}
        
        if self.db:
            checks["database"] = await self.check_database()
        
        if self.redis:
            checks["cache"] = await self.check_cache()
        
        return checks
    
    def get_overall_status(self, checks: Dict[str, ComponentHealth]) -> HealthStatus:
        """Determine overall health status."""
        statuses = [check.status for check in checks.values()]
        
        if HealthStatus.UNHEALTHY in statuses:
            return HealthStatus.UNHEALTHY
        elif HealthStatus.DEGRADED in statuses:
            return HealthStatus.DEGRADED
        else:
            return HealthStatus.HEALTHY
```

## Step 3: FastAPI Health Check Endpoints

### Comprehensive Health Endpoint

```python
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse

router = APIRouter()

@router.get("/health")
async def health_check(
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis)
):
    """
    Comprehensive health check endpoint.
    
    Returns detailed status of all components.
    """
    health_service = HealthCheckService(db=db, redis=redis)
    checks = await health_service.check_all()
    overall_status = health_service.get_overall_status(checks)
    
    # Convert to dict for JSON response
    checks_dict = {
        name: {
            "status": check.status.value,
            "response_time_ms": check.response_time_ms,
            "error": check.error,
            "details": check.details
        }
        for name, check in checks.items()
    }
    
    # Determine HTTP status code
    if overall_status == HealthStatus.UNHEALTHY:
        http_status = status.HTTP_503_SERVICE_UNAVAILABLE
    elif overall_status == HealthStatus.DEGRADED:
        http_status = status.HTTP_200_OK  # Still accept traffic
    else:
        http_status = status.HTTP_200_OK
    
    return JSONResponse(
        status_code=http_status,
        content={
            "status": overall_status.value,
            "timestamp": datetime.utcnow().isoformat(),
            "checks": checks_dict
        }
    )
```

### Separate Component Checks

```python
@router.get("/health/db")
async def database_health_check(db: AsyncSession = Depends(get_db)):
    """Check database health only."""
    health_service = HealthCheckService(db=db)
    check = await health_service.check_database()
    
    status_code = (
        status.HTTP_503_SERVICE_UNAVAILABLE
        if check.status == HealthStatus.UNHEALTHY
        else status.HTTP_200_OK
    )
    
    return JSONResponse(
        status_code=status_code,
        content={
            "status": check.status.value,
            "response_time_ms": check.response_time_ms,
            "error": check.error,
            "details": check.details
        }
    )

@router.get("/health/cache")
async def cache_health_check(redis: aioredis.Redis = Depends(get_redis)):
    """Check cache health only."""
    health_service = HealthCheckService(redis=redis)
    check = await health_service.check_cache()
    
    status_code = (
        status.HTTP_503_SERVICE_UNAVAILABLE
        if check.status == HealthStatus.UNHEALTHY
        else status.HTTP_200_OK
    )
    
    return JSONResponse(
        status_code=status_code,
        content=check.__dict__
    )
```

## Step 4: Advanced Health Checks

### Database Connection Pool Check

```python
async def check_database_pool(db: AsyncSession) -> ComponentHealth:
    """Check database connection pool health."""
    engine = db.bind
    
    try:
        pool = engine.pool
        
        # Check pool statistics
        pool_stats = {
            "size": pool.size(),
            "checked_out": pool.checkedout(),
            "overflow": pool.overflow(),
            "checked_in": pool.checkedin()
        }
        
        # Check if pool is exhausted
        if pool.checkedout() >= pool.size() + pool.max_overflow():
            return ComponentHealth(
                name="database_pool",
                status=HealthStatus.DEGRADED,
                details={
                    "message": "Connection pool exhausted",
                    **pool_stats
                }
            )
        
        return ComponentHealth(
            name="database_pool",
            status=HealthStatus.HEALTHY,
            details=pool_stats
        )
    
    except Exception as e:
        return ComponentHealth(
            name="database_pool",
            status=HealthStatus.UNHEALTHY,
            error=str(e)
        )
```

### Cache Memory and Performance Check

```python
async def check_cache_performance(redis: aioredis.Redis) -> ComponentHealth:
    """Check Redis performance and memory."""
    try:
        # Get Redis info
        info = await redis.info("all")
        
        # Check memory usage
        used_memory = info.get("used_memory", 0)
        max_memory = info.get("maxmemory", 0)
        
        memory_percent = (used_memory / max_memory * 100) if max_memory > 0 else 0
        
        # Check if memory is getting full
        if memory_percent > 90:
            return ComponentHealth(
                name="cache",
                status=HealthStatus.DEGRADED,
                details={
                    "memory_usage_percent": memory_percent,
                    "used_memory_mb": used_memory / (1024 * 1024),
                    "max_memory_mb": max_memory / (1024 * 1024) if max_memory > 0 else None
                }
            )
        
        return ComponentHealth(
            name="cache",
            status=HealthStatus.HEALTHY,
            details={
                "memory_usage_percent": memory_percent,
                "connected_clients": info.get("connected_clients", 0),
                "total_commands_processed": info.get("total_commands_processed", 0)
            }
        )
    
    except Exception as e:
        return ComponentHealth(
            name="cache",
            status=HealthStatus.UNHEALTHY,
            error=str(e)
        )
```

## Step 5: Health Check with Timeouts

### Timeout Protection

```python
import asyncio

async def check_with_timeout(
    check_func,
    timeout: float = 5.0
) -> ComponentHealth:
    """Run health check with timeout."""
    try:
        result = await asyncio.wait_for(check_func(), timeout=timeout)
        return result
    except asyncio.TimeoutError:
        return ComponentHealth(
            name="timeout",
            status=HealthStatus.UNHEALTHY,
            error=f"Health check timed out after {timeout}s"
        )
    except Exception as e:
        return ComponentHealth(
            name="error",
            status=HealthStatus.UNHEALTHY,
            error=str(e)
        )

@router.get("/health/timeout-safe")
async def health_check_with_timeout(
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis)
):
    """Health check with timeout protection."""
    health_service = HealthCheckService(db=db, redis=redis)
    
    # Run checks in parallel with timeout
    db_check_task = check_with_timeout(health_service.check_database, timeout=2.0)
    cache_check_task = check_with_timeout(health_service.check_cache, timeout=1.0)
    
    checks_result = await asyncio.gather(db_check_task, cache_check_task, return_exceptions=True)
    
    checks = {
        "database": checks_result[0] if not isinstance(checks_result[0], Exception) else ComponentHealth(
            name="database",
            status=HealthStatus.UNHEALTHY,
            error=str(checks_result[0])
        ),
        "cache": checks_result[1] if not isinstance(checks_result[1], Exception) else ComponentHealth(
            name="cache",
            status=HealthStatus.UNHEALTHY,
            error=str(checks_result[1])
        )
    }
    
    overall_status = health_service.get_overall_status(checks)
    
    return JSONResponse(
        status_code=status.HTTP_200_OK if overall_status != HealthStatus.UNHEALTHY else status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "status": overall_status.value,
            "checks": {name: check.__dict__ for name, check in checks.items()}
        }
    )
```

## Step 6: Kubernetes Integration

### Kubernetes Health Check Configuration

```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fastapi-app
spec:
  template:
    spec:
      containers:
      - name: app
        image: fastapi-app:latest
        ports:
        - containerPort: 8000
        
        # Liveness probe - restart container if fails
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        
        # Readiness probe - remove from service if fails
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        
        # Startup probe - wait for app to start
        startupProbe:
          httpGet:
            path: /health/live
            port: 8000
          initialDelaySeconds: 0
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 30  # Allow up to 150 seconds for startup
```

**Understanding probes:**
- **livenessProbe**: Kills and restarts container if unhealthy
- **readinessProbe**: Removes from service endpoints if not ready
- **startupProbe**: Gives app time to start before liveness/readiness checks

## Step 7: Health Check Metrics

### Track Health Check Results

```python
from prometheus_client import Counter, Gauge

health_check_total = Counter(
    'health_check_total',
    'Total health checks',
    ['endpoint', 'status']
)

health_check_duration = Histogram(
    'health_check_duration_seconds',
    'Health check duration',
    ['endpoint']
)

component_health = Gauge(
    'component_health',
    'Component health status (1=healthy, 0=unhealthy)',
    ['component']
)

@router.get("/health/metrics")
async def health_check_with_metrics(
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis)
):
    """Health check with Prometheus metrics."""
    start_time = time.time()
    
    health_service = HealthCheckService(db=db, redis=redis)
    checks = await health_service.check_all()
    overall_status = health_service.get_overall_status(checks)
    
    duration = time.time() - start_time
    
    # Record metrics
    health_check_total.labels(
        endpoint="/health",
        status=overall_status.value
    ).inc()
    
    health_check_duration.labels(endpoint="/health").observe(duration)
    
    # Update component health gauges
    for name, check in checks.items():
        component_health.labels(component=name).set(
            1 if check.status == HealthStatus.HEALTHY else 0
        )
    
    # Return response
    status_code = (
        status.HTTP_503_SERVICE_UNAVAILABLE
        if overall_status == HealthStatus.UNHEALTHY
        else status.HTTP_200_OK
    )
    
    return JSONResponse(
        status_code=status_code,
        content={
            "status": overall_status.value,
            "checks": {name: check.__dict__ for name, check in checks.items()},
            "duration_ms": duration * 1000
        }
    )
```

## Best Practices

1. **Fast checks**: Health checks should complete quickly (< 1 second)
2. **Timeout protection**: Don't let health checks hang
3. **Separate liveness/readiness**: Different endpoints for different purposes
4. **Don't check non-critical dependencies**: Only check what affects serving traffic
5. **Cache results**: Cache health status briefly to reduce load

## Summary

Health checks provide:
- ✅ Container orchestration integration
- ✅ Automatic failover
- ✅ Traffic routing decisions
- ✅ System monitoring

Implement comprehensive health checks for production deployments!
