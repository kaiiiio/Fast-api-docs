# Explaining Data Model for AI Job Platform: Complete Interview Guide

How to clearly explain your data model design in interviews, demonstrating deep understanding of database design, relationships, and AI-specific considerations for Express.js applications.

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

```javascript
// User model
const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    email: { type: DataTypes.STRING(255), unique: true, allowNull: false, index: true },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    user_type: { type: DataTypes.ENUM('job_seeker', 'employer', 'admin'), allowNull: false, index: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE }
});

// Job Seeker model
const JobSeeker = sequelize.define('JobSeeker', {
    id: { type: DataTypes.INTEGER, primaryKey: true },
    first_name: { type: DataTypes.STRING(100), allowNull: false },
    last_name: { type: DataTypes.STRING(100), allowNull: false },
    phone: { type: DataTypes.STRING(20) },
    location: { type: DataTypes.STRING(100) },
    resume_data: { type: DataTypes.JSONB },  // Structured resume
    resume_text: { type: DataTypes.TEXT },  // Full text
    resume_embedding: { type: DataTypes.TEXT }  // Vector embedding (JSON string)
});

// Employer model
const Employer = sequelize.define('Employer', {
    id: { type: DataTypes.INTEGER, primaryKey: true },
    company_name: { type: DataTypes.STRING(200), allowNull: false },
    company_size: { type: DataTypes.STRING(50) },
    industry: { type: DataTypes.STRING(100) },
    website: { type: DataTypes.STRING(255) }
});
```

## Best Practices

1. **Polymorphic Design**: Handle different user types
2. **Embeddings**: Store vector embeddings for semantic search
3. **JSONB**: Use for flexible resume data
4. **Indexes**: Index frequently queried fields
5. **Relationships**: Define clear relationships

## Summary

**AI Job Platform Data Model:**

1. **Entities**: Users, Job Seekers, Employers, Jobs, Applications, Matches
2. **Relationships**: Polymorphic users, many-to-many skills
3. **AI Features**: Embeddings for semantic search
4. **Best Practice**: Normalize core data, denormalize for performance
5. **Use Cases**: Job matching, skill extraction, recommendations

**Key Takeaway:**
AI job platform data model uses polymorphic users, stores embeddings for semantic search, and uses JSONB for flexible data. Design for both structured queries and AI-powered matching. Index appropriately and use relationships effectively.

**Model Strategy:**
- Polymorphic users
- Embeddings for AI
- JSONB for flexibility
- Clear relationships
- Appropriate indexes

**Next Steps:**
- Learn [Data Modeling](../03_data_layer_fundamentals/data_modeling_principles.md) for design
- Study [pgvector](../05_postgresql_specific/pgvector_for_embeddings.md) for embeddings
- Master [Relationships](../04_relational_databases_sql/relationships_explained.md) for associations

