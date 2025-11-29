# Explaining Data Model for AI Job Platform: Complete Interview Guide

How to clearly explain your data model design in interviews, demonstrating deep understanding of database design, relationships, and AI-specific considerations.

## Overview: AI Job Platform

**What we're building:**
A platform that matches job seekers with employers using AI. Key features:
- Job postings and applications
- AI-powered resume parsing
- Skill matching and recommendations
- Vector search for semantic matching

## Core Entities and Relationships

### Entity Relationship Diagram

```
Users (Polymorphic)
    ├─ Job Seekers
    │   ├─ Profiles
    │   ├─ Resumes (with embeddings)
    │   └─ Skills (many-to-many)
    │
    └─ Employers
        ├─ Company Info
        └─ Job Postings
            ├─ Requirements
            ├─ Descriptions
            └─ Embeddings

Applications
    ├─ Job Seeker (FK)
    ├─ Job (FK)
    └─ Status

Matches (AI-Generated)
    ├─ Job Seeker (FK)
    ├─ Job (FK)
    ├─ Match Score (AI)
    └─ Reasoning (AI)
```

## Detailed Data Model

### 1. Users (Polymorphic Design)

**Design Decision:** Use polymorphic association pattern to handle different user types.

```python
class User(Base):
    """Base user entity - shared attributes."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    user_type = Column(String(20), nullable=False, index=True)  # 'job_seeker' | 'employer' | 'admin'
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    
    # Relationships (polymorphic)
    job_seeker_profile = relationship("JobSeeker", back_populates="user", uselist=False)
    employer_profile = relationship("Employer", back_populates="user", uselist=False)

class JobSeeker(Base):
    """Job seeker specific attributes."""
    __tablename__ = "job_seekers"
    
    id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(20))
    location = Column(String(100))
    
    # Resume storage (JSONB for flexibility)
    resume_data = Column(JSONB)  # Structured resume data
    resume_text = Column(Text)   # Full text for parsing
    resume_embedding = Column(Vector(1536))  # For semantic search
    
    # Relationships
    user = relationship("User", back_populates="job_seeker_profile")
    skills = relationship("Skill", secondary="job_seeker_skills", back_populates="job_seekers")
    applications = relationship("Application", back_populates="job_seeker")
    matches = relationship("Match", back_populates="job_seeker")

class Employer(Base):
    """Employer specific attributes."""
    __tablename__ = "employers"
    
    id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    company_name = Column(String(200), nullable=False)
    company_size = Column(String(50))  # 'startup', 'small', 'medium', 'large'
    industry = Column(String(100))
    website = Column(String(255))
    
    user = relationship("User", back_populates="employer_profile")
    job_postings = relationship("Job", back_populates="employer")
```

**Why this design:**
- ✅ Shared authentication in one place
- ✅ Easy to query all users
- ✅ Type-specific data separated
- ✅ Polymorphic queries supported

### 2. Skills (Many-to-Many)

```python
class Skill(Base):
    """Skills catalog - normalized for consistency."""
    __tablename__ = "skills"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    category = Column(String(50), index=True)  # 'technical', 'soft', 'language'
    description = Column(Text)
    
    # Many-to-many with job seekers
    job_seekers = relationship("JobSeeker", secondary="job_seeker_skills", back_populates="skills")
    # Many-to-many with jobs
    jobs = relationship("Job", secondary="job_skills", back_populates="required_skills")

# Association tables
job_seeker_skills = Table(
    "job_seeker_skills",
    Base.metadata,
    Column("job_seeker_id", Integer, ForeignKey("job_seekers.id"), primary_key=True),
    Column("skill_id", Integer, ForeignKey("skills.id"), primary_key=True),
    Column("proficiency_level", String(20)),  # 'beginner', 'intermediate', 'expert'
    Column("years_experience", Integer)
)

job_skills = Table(
    "job_skills",
    Base.metadata,
    Column("job_id", Integer, ForeignKey("jobs.id"), primary_key=True),
    Column("skill_id", Integer, ForeignKey("skills.id"), primary_key=True),
    Column("required", Boolean, default=True),  # Required vs nice-to-have
    Column("priority", Integer)  # 1 = must have, 2 = important, 3 = nice to have
)
```

**Why normalized skills:**
- ✅ Consistency (avoid duplicates like "Python" vs "python")
- ✅ Easy to search and match
- ✅ Can add metadata (category, description)

### 3. Job Postings

```python
class Job(Base):
    """Job posting entity."""
    __tablename__ = "jobs"
    
    id = Column(Integer, primary_key=True)
    employer_id = Column(Integer, ForeignKey("employers.id"), nullable=False, index=True)
    
    title = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=False)  # Full job description
    requirements = Column(JSONB)  # Structured requirements
    location = Column(String(100), index=True)
    remote_allowed = Column(Boolean, default=False)
    employment_type = Column(String(50))  # 'full_time', 'part_time', 'contract'
    salary_min = Column(Numeric(10, 2))
    salary_max = Column(Numeric(10, 2))
    currency = Column(String(3), default="USD")
    
    # AI-related fields
    description_embedding = Column(Vector(1536))  # For semantic matching
    requirements_embedding = Column(Vector(1536))
    
    # Status and dates
    status = Column(String(20), default="active", index=True)  # 'draft', 'active', 'closed'
    posted_at = Column(DateTime, default=datetime.utcnow, index=True)
    expires_at = Column(DateTime, index=True)
    
    # Relationships
    employer = relationship("Employer", back_populates="job_postings")
    required_skills = relationship("Skill", secondary="job_skills", back_populates="jobs")
    applications = relationship("Application", back_populates="job")
    matches = relationship("Match", back_populates="job")
    
    __table_args__ = (
        Index('idx_job_status_posted', 'status', 'posted_at'),
        Index('idx_job_location_remote', 'location', 'remote_allowed'),
    )
```

**Key design decisions:**
- ✅ JSONB for flexible requirements structure
- ✅ Separate embeddings for description and requirements
- ✅ Indexes on common query patterns
- ✅ Status field for filtering active jobs

### 4. Applications

```python
class Application(Base):
    """Job application entity."""
    __tablename__ = "applications"
    
    id = Column(Integer, primary_key=True)
    job_seeker_id = Column(Integer, ForeignKey("job_seekers.id"), nullable=False, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False, index=True)
    
    cover_letter = Column(Text)
    status = Column(String(50), default="submitted", index=True)  # 'submitted', 'reviewed', 'interview', 'rejected', 'accepted'
    
    # AI-generated insights
    match_score = Column(Float)  # AI-generated match score
    match_reasoning = Column(Text)  # Why this match was made
    
    submitted_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    
    # Relationships
    job_seeker = relationship("JobSeeker", back_populates="applications")
    job = relationship("Job", back_populates="applications")
    
    __table_args__ = (
        UniqueConstraint('job_seeker_id', 'job_id', name='unique_application'),  # One application per job
        Index('idx_application_status_submitted', 'status', 'submitted_at'),
    )
```

**Design rationale:**
- ✅ Unique constraint prevents duplicate applications
- ✅ Status tracking for workflow
- ✅ AI match score stored for analysis

### 5. Matches (AI-Generated)

```python
class Match(Base):
    """AI-generated job matches for job seekers."""
    __tablename__ = "matches"
    
    id = Column(Integer, primary_key=True)
    job_seeker_id = Column(Integer, ForeignKey("job_seekers.id"), nullable=False, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False, index=True)
    
    # AI matching scores
    semantic_score = Column(Float)  # Vector similarity score
    skill_match_score = Column(Float)  # Skill overlap score
    overall_score = Column(Float, nullable=False, index=True)  # Combined score
    
    # AI reasoning
    match_reasoning = Column(Text)  # Why this match was made
    matched_skills = Column(JSONB)  # Which skills matched
    missing_skills = Column(JSONB)  # Which skills are missing
    
    # User interaction
    viewed_at = Column(DateTime, nullable=True)
    applied = Column(Boolean, default=False)
    
    generated_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    job_seeker = relationship("JobSeeker", back_populates="matches")
    job = relationship("Job", back_populates="matches")
    
    __table_args__ = (
        UniqueConstraint('job_seeker_id', 'job_id', name='unique_match'),
        Index('idx_match_score', 'job_seeker_id', 'overall_score'),
    )
```

**Why separate match table:**
- ✅ Store AI-generated recommendations
- ✅ Track match quality over time
- ✅ Improve matching algorithm
- ✅ User feedback for learning

## Key Design Decisions Explained

### 1. Resume Storage: JSONB + Text + Embedding

**Problem:** Resumes have varying structures but need:
- Fast text search
- Structured data access
- Semantic search

**Solution:** Three-layer approach

```python
resume_data = Column(JSONB)  # Structured: {name, experience: [], education: []}
resume_text = Column(Text)   # Full text for parsing and full-text search
resume_embedding = Column(Vector(1536))  # For semantic matching
```

**Benefits:**
- ✅ Flexible structure (JSONB)
- ✅ Full-text search capability
- ✅ Vector similarity search
- ✅ Can rebuild embedding from text if needed

### 2. Polymorphic Users

**Problem:** Job seekers and employers are different but share authentication.

**Solution:** Single User table + type-specific tables

**Benefits:**
- ✅ Single authentication system
- ✅ Easy to add new user types
- ✅ Shared user management

### 3. Normalized Skills Catalog

**Problem:** Users might enter "Python", "python", "PYTHON" - all same skill.

**Solution:** Separate skills table with normalization

**Benefits:**
- ✅ Consistent skill names
- ✅ Easy skill matching
- ✅ Can add skill metadata
- ✅ Career path recommendations

### 4. Separate Match Table

**Problem:** Need to store AI recommendations separately from applications.

**Solution:** Match table tracks AI-generated matches

**Benefits:**
- ✅ Track match quality
- ✅ A/B test matching algorithms
- ✅ Improve recommendations over time

## Query Patterns

### Common Queries Explained

**1. Find jobs matching a job seeker:**
```python
async def find_matching_jobs(job_seeker_id: int, limit: int = 10):
    """Find jobs using vector similarity + skill matching."""
    job_seeker = await db.get(JobSeeker, job_seeker_id)
    
    # Vector similarity search
    semantic_matches = await db.execute(
        select(Job)
        .order_by(Job.description_embedding.cosine_distance(job_seeker.resume_embedding))
        .where(Job.status == "active")
        .limit(limit)
    )
    
    return semantic_matches.scalars().all()
```

**2. Get job seeker applications:**
```python
async def get_applications(job_seeker_id: int):
    """Get all applications with job details."""
    return await db.execute(
        select(Application, Job)
        .join(Job)
        .where(Application.job_seeker_id == job_seeker_id)
        .order_by(Application.submitted_at.desc())
    )
```

**3. Find job seekers for a job:**
```python
async def find_candidates(job_id: int, min_score: float = 0.7):
    """Find matching candidates using AI scores."""
    return await db.execute(
        select(Match, JobSeeker)
        .join(JobSeeker)
        .where(Match.job_id == job_id)
        .where(Match.overall_score >= min_score)
        .order_by(Match.overall_score.desc())
    )
```

## Scalability Considerations

**1. Indexes for performance:**
- User email (unique lookups)
- Job status + posted_at (filtering active jobs)
- Match scores (ranking candidates)

**2. Vector indexes:**
- HNSW index on embeddings for fast similarity search

**3. Partitioning (future):**
- Partition matches table by date for historical data

## Interview Talking Points

1. **Polymorphic design**: Explain why you chose single User table vs separate tables
2. **JSONB usage**: Why flexibility matters for resumes
3. **Embeddings**: How vector search enables semantic matching
4. **Normalization**: Why skills are normalized (consistency vs flexibility trade-off)
5. **Index strategy**: Which queries need indexes and why

## Summary

This data model demonstrates:
- ✅ Understanding of relationships (one-to-one, many-to-many)
- ✅ AI-specific considerations (embeddings, semantic search)
- ✅ Scalability thinking (indexes, partitioning)
- ✅ Trade-offs (JSONB flexibility vs normalization)
- ✅ Real-world complexity (status workflows, match tracking)

Explain each decision clearly with trade-offs and alternatives considered!
