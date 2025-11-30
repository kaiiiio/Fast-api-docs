# Data Model: AI Job Platform

## 1. Core Entities

### Users (PostgreSQL)
- `id` (UUID)
- `email` (Unique)
- `password_hash`
- `role` (CANDIDATE, RECRUITER)

### Jobs (PostgreSQL + Elasticsearch)
- `id`
- `title`
- `description`
- `company_id`
- `embedding` (Vector - stored in pgvector or Pinecone)

### Applications (PostgreSQL)
- `user_id`
- `job_id`
- `status` (APPLIED, INTERVIEW, REJECTED)
- `resume_id`

---

## 2. Why Hybrid Storage?

- **PostgreSQL**: Source of Truth. ACID transactions for "Applying" (Can't apply twice).
- **Elasticsearch/Vector DB**: Search. "Find jobs similar to this resume".

---

## 3. The Matching Algorithm (SQL Query)

"Find candidates for this job".

```sql
SELECT u.* 
FROM users u
JOIN resumes r ON u.id = r.user_id
ORDER BY r.embedding <-> (SELECT embedding FROM jobs WHERE id = ?)
LIMIT 10;
```

---

## 4. Optimization

**Problem**: Vector search is slow on 1 million rows.
**Solution**: Pre-filter.
"Only search candidates in 'New York' who know 'Java'".

```sql
SELECT ...
WHERE r.city = 'NY' -- Metadata Filter
ORDER BY r.embedding <-> ...
```
