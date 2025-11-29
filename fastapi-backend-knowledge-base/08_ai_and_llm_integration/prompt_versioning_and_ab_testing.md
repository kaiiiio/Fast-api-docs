# Prompt Versioning and A/B Testing: Complete Guide

Versioning prompts and A/B testing helps optimize AI performance and iterate on prompt engineering. This guide covers comprehensive prompt management and testing strategies.

## Understanding Prompt Management

**Why version prompts?**
- Track prompt changes over time
- Rollback to previous versions
- Compare prompt performance
- A/B test variations

**Why A/B test?**
- Optimize prompt effectiveness
- Compare prompt variations
- Measure performance improvements
- Data-driven decisions

## Step 1: Prompt Versioning System

### Database Schema for Prompts

```python
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Float, JSON

class PromptVersion(Base):
    """Store prompt versions with metadata."""
    __tablename__ = "prompt_versions"
    
    id = Column(Integer, primary_key=True)
    
    # Prompt identification
    name = Column(String(100), nullable=False, index=True)  # 'resume_parser', 'job_matcher'
    version = Column(String(20), nullable=False)  # 'v1.0', 'v2.0', 'A', 'B'
    
    # Prompt content
    prompt_template = Column(Text, nullable=False)  # Full prompt template
    system_message = Column(Text, nullable=True)  # System message if separate
    prompt_variables = Column(JSON)  # Available variables: ['resume_text', 'job_description']
    
    # Version control
    is_active = Column(Boolean, default=False, index=True)  # Currently active version
    is_default = Column(Boolean, default=False)  # Default version for new requests
    
    # Metadata
    description = Column(Text)  # What changed in this version
    created_by = Column(Integer)  # User who created
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Performance tracking
    avg_quality_score = Column(Float)  # Average quality metric
    total_uses = Column(Integer, default=0)  # How many times used
    
    __table_args__ = (
        Index('idx_prompt_name_active', 'name', 'is_active'),
        UniqueConstraint('name', 'version', name='unique_prompt_version'),
    )
```

### Prompt Service

```python
class PromptService:
    """Service for managing prompt versions."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_active_prompt(self, name: str) -> PromptVersion:
        """Get currently active prompt version."""
        stmt = select(PromptVersion).where(
            PromptVersion.name == name,
            PromptVersion.is_active == True
        )
        
        result = await self.db.execute(stmt)
        prompt = result.scalar_one_or_none()
        
        if not prompt:
            raise ValueError(f"No active prompt found for: {name}")
        
        return prompt
    
    async def get_prompt_version(self, name: str, version: str) -> PromptVersion:
        """Get specific prompt version."""
        stmt = select(PromptVersion).where(
            PromptVersion.name == name,
            PromptVersion.version == version
        )
        
        result = await self.db.execute(stmt)
        return result.scalar_one()
    
    async def create_prompt_version(
        self,
        name: str,
        version: str,
        prompt_template: str,
        system_message: Optional[str] = None,
        description: Optional[str] = None,
        is_active: bool = False
    ) -> PromptVersion:
        """Create new prompt version."""
        prompt = PromptVersion(
            name=name,
            version=version,
            prompt_template=prompt_template,
            system_message=system_message,
            description=description,
            is_active=is_active,
            created_at=datetime.utcnow()
        )
        
        self.db.add(prompt)
        await self.db.commit()
        await self.db.refresh(prompt)
        
        return prompt
    
    async def activate_version(self, name: str, version: str):
        """Activate a specific prompt version."""
        # Deactivate all versions of this prompt
        await self.db.execute(
            update(PromptVersion)
            .where(PromptVersion.name == name)
            .values(is_active=False)
        )
        
        # Activate specified version
        await self.db.execute(
            update(PromptVersion)
            .where(
                PromptVersion.name == name,
                PromptVersion.version == version
            )
            .values(is_active=True)
        )
        
        await self.db.commit()
    
    async def render_prompt(
        self,
        name: str,
        variables: Dict[str, Any],
        version: Optional[str] = None
    ) -> str:
        """Render prompt template with variables."""
        if version:
            prompt = await self.get_prompt_version(name, version)
        else:
            prompt = await self.get_active_prompt(name)
        
        # Render template (simple string formatting)
        rendered = prompt.prompt_template.format(**variables)
        
        return rendered
```

## Step 2: Template Rendering

### Advanced Template Rendering

```python
from jinja2 import Template, Environment

class TemplateEngine:
    """Advanced template rendering with Jinja2."""
    
    def __init__(self):
        self.env = Environment(
            autoescape=False,
            trim_blocks=True,
            lstrip_blocks=True
        )
    
    def render(self, template_str: str, variables: Dict[str, Any]) -> str:
        """Render template with variables."""
        template = self.env.from_string(template_str)
        return template.render(**variables)

# Prompt template with variables
RESUME_PARSER_PROMPT = """
Parse the following resume and extract structured information.

Resume Text:
{{ resume_text }}

Extract:
- Name
- Email
- Phone
- Work Experience (with dates)
- Education
- Skills

Return as JSON format.
"""

# Usage
template_engine = TemplateEngine()
rendered = template_engine.render(RESUME_PARSER_PROMPT, {
    "resume_text": user_resume
})
```

## Step 3: A/B Testing Framework

### Variant Assignment

```python
import hashlib

class ABTestService:
    """Service for A/B testing prompts."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    def assign_variant(self, prompt_name: str, user_id: int) -> str:
        """
        Assign user to variant (deterministic - same user always gets same variant).
        
        Uses consistent hashing to ensure same assignment.
        """
        # Create hash from prompt name and user ID
        hash_input = f"{prompt_name}:{user_id}"
        hash_value = int(hashlib.md5(hash_input.encode()).hexdigest(), 16)
        
        # Assign to variant based on hash
        variant = "A" if hash_value % 2 == 0 else "B"
        
        return variant
    
    async def get_variant_prompt(
        self,
        prompt_name: str,
        user_id: int
    ) -> PromptVersion:
        """Get prompt variant for user."""
        variant = self.assign_variant(prompt_name, user_id)
        variant_name = f"{prompt_name}:{variant}"
        
        # Get active variant
        prompt = await self.get_active_prompt(variant_name)
        return prompt
```

### A/B Test Execution

```python
class PromptABTest:
    """Execute A/B test for prompts."""
    
    def __init__(self, db: AsyncSession, ab_service: ABTestService):
        self.db = db
        self.ab_service = ab_service
    
    async def call_llm_with_ab_test(
        self,
        prompt_name: str,
        variables: Dict[str, Any],
        user_id: int,
        model: str = "gpt-4"
    ):
        """Call LLM with A/B test variant."""
        # Assign variant
        variant = self.ab_service.assign_variant(prompt_name, user_id)
        
        # Get variant prompt
        prompt_version = await self.ab_service.get_variant_prompt(prompt_name, user_id)
        
        # Render prompt
        prompt_service = PromptService(self.db)
        rendered_prompt = await prompt_service.render_prompt(
            prompt_version.name,
            variables,
            version=prompt_version.version
        )
        
        # Call LLM
        response = await openai_client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": prompt_version.system_message or ""},
                {"role": "user", "content": rendered_prompt}
            ]
        )
        
        # Log A/B test result
        await self.log_ab_result(
            prompt_name=prompt_name,
            variant=variant,
            user_id=user_id,
            prompt_version_id=prompt_version.id,
            response=response
        )
        
        return response
```

## Step 4: A/B Test Analytics

### Track A/B Test Results

```python
class PromptAnalytics(Base):
    """Track prompt performance for A/B testing."""
    __tablename__ = "prompt_analytics"
    
    id = Column(Integer, primary_key=True)
    
    # Test identification
    prompt_name = Column(String(100), nullable=False, index=True)
    variant = Column(String(10), nullable=False, index=True)  # 'A', 'B'
    prompt_version_id = Column(Integer, ForeignKey("prompt_versions.id"))
    
    # User and context
    user_id = Column(Integer, index=True)
    request_id = Column(String(100), index=True)
    
    # Metrics
    response_quality_score = Column(Float)  # User rating, model score, etc.
    response_length = Column(Integer)
    tokens_used = Column(Integer)
    latency_ms = Column(Float)
    
    # User interaction
    user_satisfaction = Column(Integer)  # 1-5 rating
    user_feedback = Column(Text)
    
    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    __table_args__ = (
        Index('idx_analytics_prompt_variant', 'prompt_name', 'variant', 'created_at'),
    )

class ABTestAnalytics:
    """Analyze A/B test results."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_variant_performance(
        self,
        prompt_name: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Dict]:
        """Compare variant performance metrics."""
        filters = [PromptAnalytics.prompt_name == prompt_name]
        
        if start_date:
            filters.append(PromptAnalytics.created_at >= start_date)
        if end_date:
            filters.append(PromptAnalytics.created_at <= end_date)
        
        stmt = (
            select(
                PromptAnalytics.variant,
                func.count(PromptAnalytics.id).label('total_requests'),
                func.avg(PromptAnalytics.response_quality_score).label('avg_quality'),
                func.avg(PromptAnalytics.user_satisfaction).label('avg_satisfaction'),
                func.avg(PromptAnalytics.latency_ms).label('avg_latency'),
                func.avg(PromptAnalytics.tokens_used).label('avg_tokens')
            )
            .where(*filters)
            .group_by(PromptAnalytics.variant)
        )
        
        result = await self.db.execute(stmt)
        
        performance = {}
        for row in result.all():
            performance[row.variant] = {
                "total_requests": row.total_requests,
                "avg_quality_score": float(row.avg_quality) if row.avg_quality else None,
                "avg_satisfaction": float(row.avg_satisfaction) if row.avg_satisfaction else None,
                "avg_latency_ms": float(row.avg_latency) if row.avg_latency else None,
                "avg_tokens": float(row.avg_tokens) if row.avg_tokens else None
            }
        
        return performance
    
    async def determine_winner(
        self,
        prompt_name: str,
        metric: str = "response_quality_score"
    ) -> Optional[str]:
        """Determine winning variant based on metric."""
        performance = await self.get_variant_performance(prompt_name)
        
        if len(performance) < 2:
            return None  # Not enough data
        
        # Compare variants
        variant_a_score = performance.get("A", {}).get(f"avg_{metric}", 0)
        variant_b_score = performance.get("B", {}).get(f"avg_{metric}", 0)
        
        if variant_a_score > variant_b_score:
            return "A"
        elif variant_b_score > variant_a_score:
            return "B"
        else:
            return None  # Tie
```

## Step 5: Automatic Prompt Versioning

### Version Management

```python
class PromptVersionManager:
    """Manage prompt versions automatically."""
    
    async def create_new_version(
        self,
        name: str,
        prompt_template: str,
        description: str,
        auto_activate: bool = False
    ) -> PromptVersion:
        """Create new version with automatic versioning."""
        # Get latest version number
        latest = await self.get_latest_version(name)
        
        if latest:
            # Increment version
            version_parts = latest.version.split('.')
            if len(version_parts) == 2:
                major, minor = version_parts
                new_version = f"{major}.{int(minor) + 1}"
            else:
                new_version = "v1.0"
        else:
            new_version = "v1.0"
        
        # Create new version
        prompt = await self.create_prompt_version(
            name=name,
            version=new_version,
            prompt_template=prompt_template,
            description=description,
            is_active=auto_activate
        )
        
        return prompt
    
    async def get_latest_version(self, name: str) -> Optional[PromptVersion]:
        """Get latest version (by creation date)."""
        stmt = (
            select(PromptVersion)
            .where(PromptVersion.name == name)
            .order_by(PromptVersion.created_at.desc())
            .limit(1)
        )
        
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
```

## Step 6: FastAPI Integration

### Prompt Management Endpoints

```python
@router.post("/prompts")
async def create_prompt_version(
    name: str,
    version: str,
    prompt_template: str,
    description: Optional[str] = None,
    is_active: bool = False,
    prompt_service: PromptService = Depends(get_prompt_service)
):
    """Create new prompt version."""
    prompt = await prompt_service.create_prompt_version(
        name=name,
        version=version,
        prompt_template=prompt_template,
        description=description,
        is_active=is_active
    )
    
    return {
        "id": prompt.id,
        "name": prompt.name,
        "version": prompt.version,
        "is_active": prompt.is_active
    }

@router.get("/prompts/{name}/active")
async def get_active_prompt(
    name: str,
    prompt_service: PromptService = Depends(get_prompt_service)
):
    """Get active prompt version."""
    prompt = await prompt_service.get_active_prompt(name)
    
    return {
        "name": prompt.name,
        "version": prompt.version,
        "prompt_template": prompt.prompt_template,
        "created_at": prompt.created_at.isoformat()
    }

@router.post("/prompts/{name}/activate")
async def activate_prompt_version(
    name: str,
    version: str,
    prompt_service: PromptService = Depends(get_prompt_service)
):
    """Activate specific prompt version."""
    await prompt_service.activate_version(name, version)
    
    return {"status": "activated", "name": name, "version": version}

@router.get("/prompts/{name}/analytics")
async def get_prompt_analytics(
    name: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    analytics: ABTestAnalytics = Depends(get_ab_analytics)
):
    """Get A/B test analytics for prompt."""
    performance = await analytics.get_variant_performance(
        prompt_name=name,
        start_date=start_date,
        end_date=end_date
    )
    
    return {"prompt_name": name, "variants": performance}
```

## Best Practices

1. **✅ Version all prompts**: Track changes over time
2. **✅ A/B test systematically**: Measure performance differences
3. **✅ Consistent variant assignment**: Same user = same variant
4. **✅ Track metrics**: Quality, latency, user satisfaction
5. **✅ Statistical significance**: Ensure enough data before conclusions
6. **✅ Document changes**: Explain why prompts changed

## Summary

Prompt versioning and A/B testing provide:
- ✅ Version control for prompts
- ✅ Performance optimization
- ✅ Data-driven improvements
- ✅ Systematic prompt engineering

Implement comprehensive prompt management for better AI performance!
