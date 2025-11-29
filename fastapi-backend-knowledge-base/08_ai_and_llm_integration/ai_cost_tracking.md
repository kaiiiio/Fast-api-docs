# AI Cost Tracking: Complete Budget Management Guide

Tracking LLM API costs is crucial for budget management and optimization. This comprehensive guide covers cost tracking, analytics, budgeting, and cost optimization strategies.

## Understanding AI Costs

**Why track costs?**
- LLM APIs charge per token (input + output)
- Costs can scale quickly with usage
- Need to stay within budget
- Optimize expensive operations

**Cost factors:**
- Model pricing (different models have different costs)
- Input tokens (prompt length)
- Output tokens (response length)
- API overhead

## Step 1: Basic Cost Tracking

### Database Schema for Cost Tracking

```python
from sqlalchemy import Column, Integer, Float, DateTime, String, Text, Index
from datetime import datetime

class LLMCallLog(Base):
    """Track all LLM API calls and their costs."""
    __tablename__ = "llm_call_logs"
    
    id = Column(Integer, primary_key=True)
    
    # Request details
    model = Column(String(50), nullable=False, index=True)  # 'gpt-4', 'gpt-3.5-turbo'
    provider = Column(String(50), nullable=False)  # 'openai', 'anthropic'
    
    # Token usage
    input_tokens = Column(Integer, nullable=False)
    output_tokens = Column(Integer, nullable=False)
    total_tokens = Column(Integer, nullable=False)
    
    # Cost calculation
    input_cost = Column(Float, nullable=False)  # Cost for input tokens
    output_cost = Column(Float, nullable=False)  # Cost for output tokens
    total_cost = Column(Float, nullable=False, index=True)  # Total cost
    
    # Context
    user_id = Column(Integer, nullable=True, index=True)  # Who made the call
    endpoint = Column(String(255), nullable=True, index=True)  # Which endpoint
    prompt_hash = Column(String(64), index=True)  # Hash for deduplication
    
    # Metadata
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    duration_ms = Column(Float)  # How long the call took
    success = Column(Boolean, default=True, index=True)
    error_message = Column(Text, nullable=True)
    
    __table_args__ = (
        Index('idx_llm_logs_user_timestamp', 'user_id', 'timestamp'),
        Index('idx_llm_logs_model_timestamp', 'model', 'timestamp'),
    )
```

### Pricing Configuration

```python
# Pricing per 1M tokens (as of 2024 - update regularly!)
LLM_PRICING = {
    "openai": {
        "gpt-4": {
            "input": 30.0,   # $30 per 1M input tokens
            "output": 60.0   # $60 per 1M output tokens
        },
        "gpt-4-turbo": {
            "input": 10.0,
            "output": 30.0
        },
        "gpt-3.5-turbo": {
            "input": 0.5,    # $0.50 per 1M input tokens
            "output": 1.5    # $1.50 per 1M output tokens
        },
        "text-embedding-3-large": {
            "input": 0.13,   # $0.13 per 1M tokens
            "output": 0.0
        }
    },
    "anthropic": {
        "claude-3-opus": {
            "input": 15.0,
            "output": 75.0
        },
        "claude-3-sonnet": {
            "input": 3.0,
            "output": 15.0
        }
    }
}

def calculate_cost(
    model: str,
    provider: str,
    input_tokens: int,
    output_tokens: int
) -> dict:
    """Calculate cost for LLM call."""
    pricing = LLM_PRICING[provider][model]
    
    input_cost = (input_tokens / 1_000_000) * pricing["input"]
    output_cost = (output_tokens / 1_000_000) * pricing["output"]
    total_cost = input_cost + output_cost
    
    return {
        "input_cost": round(input_cost, 6),
        "output_cost": round(output_cost, 6),
        "total_cost": round(total_cost, 6)
    }
```

## Step 2: Logging LLM Calls

### Automatic Cost Logging

```python
import hashlib
from functools import wraps

def log_llm_cost(
    db: AsyncSession,
    user_id: Optional[int] = None,
    endpoint: Optional[str] = None
):
    """Decorator to automatically log LLM call costs."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            
            try:
                # Call LLM
                response = await func(*args, **kwargs)
                
                # Extract usage information
                usage = response.usage
                model = kwargs.get("model") or "gpt-4"
                provider = "openai"  # Extract from client
                
                # Calculate cost
                costs = calculate_cost(
                    model=model,
                    provider=provider,
                    input_tokens=usage.prompt_tokens,
                    output_tokens=usage.completion_tokens
                )
                
                # Hash prompt for deduplication (optional)
                prompt = kwargs.get("prompt", "")
                prompt_hash = hashlib.md5(prompt.encode()).hexdigest()
                
                # Log to database
                duration = (time.time() - start_time) * 1000
                
                log_entry = LLMCallLog(
                    model=model,
                    provider=provider,
                    input_tokens=usage.prompt_tokens,
                    output_tokens=usage.completion_tokens,
                    total_tokens=usage.total_tokens,
                    input_cost=costs["input_cost"],
                    output_cost=costs["output_cost"],
                    total_cost=costs["total_cost"],
                    user_id=user_id,
                    endpoint=endpoint,
                    prompt_hash=prompt_hash,
                    duration_ms=duration,
                    success=True
                )
                
                db.add(log_entry)
                await db.commit()
                
                return response
            
            except Exception as e:
                duration = (time.time() - start_time) * 1000
                
                # Log failed call
                log_entry = LLMCallLog(
                    model=kwargs.get("model", "unknown"),
                    provider="openai",
                    input_tokens=0,
                    output_tokens=0,
                    total_tokens=0,
                    input_cost=0.0,
                    output_cost=0.0,
                    total_cost=0.0,
                    user_id=user_id,
                    endpoint=endpoint,
                    duration_ms=duration,
                    success=False,
                    error_message=str(e)
                )
                
                db.add(log_entry)
                await db.commit()
                
                raise
        
        return wrapper
    return decorator

# Usage
@log_llm_cost(db=db, user_id=1, endpoint="/chat")
async def call_llm(prompt: str, model: str = "gpt-4"):
    """LLM call with automatic cost logging."""
    response = await openai_client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}]
    )
    return response
```

### Service-Level Cost Tracking

```python
class LLMCostTracker:
    """Service for tracking and managing LLM costs."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def log_call(
        self,
        model: str,
        provider: str,
        input_tokens: int,
        output_tokens: int,
        user_id: Optional[int] = None,
        endpoint: Optional[str] = None,
        duration_ms: Optional[float] = None,
        prompt: Optional[str] = None,
        success: bool = True,
        error: Optional[str] = None
    ):
        """Log LLM call with cost calculation."""
        costs = calculate_cost(model, provider, input_tokens, output_tokens)
        
        prompt_hash = None
        if prompt:
            prompt_hash = hashlib.md5(prompt.encode()).hexdigest()
        
        log_entry = LLMCallLog(
            model=model,
            provider=provider,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=input_tokens + output_tokens,
            input_cost=costs["input_cost"],
            output_cost=costs["output_cost"],
            total_cost=costs["total_cost"],
            user_id=user_id,
            endpoint=endpoint,
            prompt_hash=prompt_hash,
            duration_ms=duration_ms,
            success=success,
            error_message=error
        )
        
        self.db.add(log_entry)
        await self.db.commit()
        
        return log_entry
```

## Step 3: Cost Analytics

### Daily Cost Analysis

```python
from sqlalchemy import func, extract
from datetime import date, timedelta

class LLMCostAnalytics:
    """Analytics for LLM costs."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_daily_costs(
        self,
        start_date: date,
        end_date: date
    ) -> List[dict]:
        """Get daily cost breakdown."""
        stmt = (
            select(
                func.date(LLMCallLog.timestamp).label("date"),
                func.sum(LLMCallLog.total_cost).label("total_cost"),
                func.sum(LLMCallLog.input_cost).label("input_cost"),
                func.sum(LLMCallLog.output_cost).label("output_cost"),
                func.count(LLMCallLog.id).label("call_count")
            )
            .where(
                func.date(LLMCallLog.timestamp) >= start_date,
                func.date(LLMCallLog.timestamp) <= end_date
            )
            .group_by(func.date(LLMCallLog.timestamp))
            .order_by(func.date(LLMCallLog.timestamp))
        )
        
        result = await self.db.execute(stmt)
        return [
            {
                "date": row.date.isoformat(),
                "total_cost": float(row.total_cost),
                "input_cost": float(row.input_cost),
                "output_cost": float(row.output_cost),
                "call_count": row.call_count
            }
            for row in result.all()
        ]
    
    async def get_cost_by_model(self, start_date: date, end_date: date) -> List[dict]:
        """Get cost breakdown by model."""
        stmt = (
            select(
                LLMCallLog.model,
                func.sum(LLMCallLog.total_cost).label("total_cost"),
                func.sum(LLMCallLog.input_tokens).label("total_input_tokens"),
                func.sum(LLMCallLog.output_tokens).label("total_output_tokens"),
                func.count(LLMCallLog.id).label("call_count")
            )
            .where(
                func.date(LLMCallLog.timestamp) >= start_date,
                func.date(LLMCallLog.timestamp) <= end_date
            )
            .group_by(LLMCallLog.model)
            .order_by(func.sum(LLMCallLog.total_cost).desc())
        )
        
        result = await self.db.execute(stmt)
        return [
            {
                "model": row.model,
                "total_cost": float(row.total_cost),
                "input_tokens": row.total_input_tokens,
                "output_tokens": row.total_output_tokens,
                "call_count": row.call_count
            }
            for row in result.all()
        ]
    
    async def get_cost_by_user(self, start_date: date, end_date: date) -> List[dict]:
        """Get cost breakdown by user."""
        stmt = (
            select(
                LLMCallLog.user_id,
                func.sum(LLMCallLog.total_cost).label("total_cost"),
                func.count(LLMCallLog.id).label("call_count")
            )
            .where(
                func.date(LLMCallLog.timestamp) >= start_date,
                func.date(LLMCallLog.timestamp) <= end_date,
                LLMCallLog.user_id.isnot(None)
            )
            .group_by(LLMCallLog.user_id)
            .order_by(func.sum(LLMCallLog.total_cost).desc())
            .limit(100)  # Top 100 users
        )
        
        result = await self.db.execute(stmt)
        return [
            {
                "user_id": row.user_id,
                "total_cost": float(row.total_cost),
                "call_count": row.call_count
            }
            for row in result.all()
        ]
    
    async def get_total_cost(self, start_date: date, end_date: date) -> float:
        """Get total cost for period."""
        stmt = (
            select(func.sum(LLMCallLog.total_cost))
            .where(
                func.date(LLMCallLog.timestamp) >= start_date,
                func.date(LLMCallLog.timestamp) <= end_date
            )
        )
        
        result = await self.db.execute(stmt)
        return float(result.scalar() or 0.0)
```

## Step 4: Budget Management

### Budget Tracking and Alerts

```python
class Budget:
    """Budget configuration."""
    __tablename__ = "llm_budgets"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    budget_type = Column(String(20), nullable=False)  # 'daily', 'monthly', 'total'
    amount = Column(Float, nullable=False)  # Budget amount in USD
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=True)  # None for ongoing
    
    # Scope
    user_id = Column(Integer, nullable=True)  # Budget per user
    model = Column(String(50), nullable=True)  # Budget per model
    endpoint = Column(String(255), nullable=True)  # Budget per endpoint
    
    created_at = Column(DateTime, default=datetime.utcnow)

class BudgetTracker:
    """Track budgets and alert on exceeding."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def check_budget_status(self, budget_id: int) -> dict:
        """Check if budget is being exceeded."""
        budget = await self.db.get(Budget, budget_id)
        
        # Calculate current spending
        filters = {}
        if budget.user_id:
            filters["user_id"] = budget.user_id
        if budget.model:
            filters["model"] = budget.model
        if budget.endpoint:
            filters["endpoint"] = budget.endpoint
        
        if budget.budget_type == "daily":
            start_date = datetime.utcnow().date()
            end_date = start_date
        elif budget.budget_type == "monthly":
            start_date = datetime.utcnow().replace(day=1).date()
            end_date = datetime.utcnow().date()
        else:  # total
            start_date = budget.period_start.date()
            end_date = budget.period_end.date() if budget.period_end else datetime.utcnow().date()
        
        stmt = select(func.sum(LLMCallLog.total_cost)).where(
            func.date(LLMCallLog.timestamp) >= start_date,
            func.date(LLMCallLog.timestamp) <= end_date,
            **filters
        )
        
        result = await self.db.execute(stmt)
        current_spending = float(result.scalar() or 0.0)
        
        percentage_used = (current_spending / budget.amount) * 100
        
        return {
            "budget_id": budget_id,
            "budget_amount": budget.amount,
            "current_spending": current_spending,
            "remaining": budget.amount - current_spending,
            "percentage_used": percentage_used,
            "status": "exceeded" if current_spending > budget.amount else "within_budget"
        }
    
    async def check_and_alert(self, budget_id: int):
        """Check budget and send alert if exceeded."""
        status = await self.check_budget_status(budget_id)
        
        if status["percentage_used"] > 80:
            await send_budget_alert(status)
        
        if status["status"] == "exceeded":
            await send_budget_exceeded_alert(status)
            # Optionally: Stop processing requests
```

## Step 5: Cost Optimization

### Track Expensive Operations

```python
async def identify_expensive_operations(
    db: AsyncSession,
    start_date: date,
    limit: int = 10
) -> List[dict]:
    """Identify most expensive LLM operations."""
    stmt = (
        select(
            LLMCallLog.endpoint,
            LLMCallLog.model,
            func.avg(LLMCallLog.total_cost).label("avg_cost"),
            func.sum(LLMCallLog.total_cost).label("total_cost"),
            func.count(LLMCallLog.id).label("call_count")
        )
        .where(
            func.date(LLMCallLog.timestamp) >= start_date,
            LLMCallLog.endpoint.isnot(None)
        )
        .group_by(LLMCallLog.endpoint, LLMCallLog.model)
        .order_by(func.sum(LLMCallLog.total_cost).desc())
        .limit(limit)
    )
    
    result = await self.db.execute(stmt)
    return [
        {
            "endpoint": row.endpoint,
            "model": row.model,
            "avg_cost": float(row.avg_cost),
            "total_cost": float(row.total_cost),
            "call_count": row.call_count
        }
        for row in result.all()
    ]
```

### Cost per Token Analysis

```python
async def get_cost_per_token_stats(db: AsyncSession) -> dict:
    """Analyze cost efficiency."""
    stmt = (
        select(
            LLMCallLog.model,
            func.avg(LLMCallLog.total_cost / LLMCallLog.total_tokens).label("cost_per_token"),
            func.avg(LLMCallLog.total_cost).label("avg_cost_per_call"),
            func.count(LLMCallLog.id).label("call_count")
        )
        .where(LLMCallLog.success == True)
        .group_by(LLMCallLog.model)
    )
    
    result = await self.db.execute(stmt)
    return {
        row.model: {
            "cost_per_token": float(row.cost_per_token),
            "avg_cost_per_call": float(row.avg_cost_per_call),
            "call_count": row.call_count
        }
        for row in result.all()
    }
```

## Step 6: FastAPI Integration

### Cost Tracking Endpoints

```python
@router.get("/analytics/costs/daily")
async def get_daily_costs(
    start_date: date,
    end_date: date,
    analytics: LLMCostAnalytics = Depends(get_cost_analytics)
):
    """Get daily cost breakdown."""
    costs = await analytics.get_daily_costs(start_date, end_date)
    return {"daily_costs": costs}

@router.get("/analytics/costs/by-model")
async def get_costs_by_model(
    start_date: date,
    end_date: date,
    analytics: LLMCostAnalytics = Depends(get_cost_analytics)
):
    """Get cost breakdown by model."""
    costs = await analytics.get_cost_by_model(start_date, end_date)
    return {"costs_by_model": costs}

@router.get("/analytics/costs/total")
async def get_total_cost(
    start_date: date,
    end_date: date,
    analytics: LLMCostAnalytics = Depends(get_cost_analytics)
):
    """Get total cost for period."""
    total = await analytics.get_total_cost(start_date, end_date)
    return {"total_cost": total, "currency": "USD"}
```

## Step 7: Real-Time Cost Tracking

### In-Memory Cost Tracking

```python
from collections import defaultdict
from datetime import datetime, timedelta

class RealTimeCostTracker:
    """Track costs in real-time (in-memory)."""
    
    def __init__(self):
        self.hourly_costs = defaultdict(float)  # {hour: total_cost}
        self.model_costs = defaultdict(float)  # {model: total_cost}
    
    def record_cost(self, model: str, cost: float):
        """Record cost in real-time."""
        hour = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
        self.hourly_costs[hour] += cost
        self.model_costs[model] += cost
    
    def get_hourly_costs(self, hours: int = 24) -> List[dict]:
        """Get hourly costs for last N hours."""
        now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
        result = []
        
        for i in range(hours):
            hour = now - timedelta(hours=i)
            cost = self.hourly_costs.get(hour, 0.0)
            result.append({
                "hour": hour.isoformat(),
                "cost": cost
            })
        
        return reversed(result)  # Oldest first
    
    def get_model_costs(self) -> dict:
        """Get current model costs."""
        return dict(self.model_costs)
```

## Best Practices

1. **✅ Track all calls**: Don't miss any API calls
2. **✅ Update pricing regularly**: Model prices change
3. **✅ Set budgets**: Prevent unexpected costs
4. **✅ Monitor trends**: Identify cost increases early
5. **✅ Optimize expensive operations**: Use cheaper models when possible

## Summary

Cost tracking provides:
- ✅ Budget management
- ✅ Cost optimization insights
- ✅ Usage analytics
- ✅ Budget alerts

Implement comprehensive cost tracking for AI applications!
