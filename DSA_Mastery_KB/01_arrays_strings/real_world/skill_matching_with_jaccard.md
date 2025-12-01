# 🌍 Real World: Skill Matching (Jaccard Similarity)

**Scenario**: You are building an AI Job Assistant.
**User Skills**: `["python", "fastapi", "aws"]`
**Job Skills**: `["python", "django", "aws", "docker"]`

How do you calculate a "Match Score"?

## The Algorithm: Jaccard Index
`J(A, B) = |Intersection| / |Union|`

### Implementation (Two Pointers approach if sorted)
If lists are sorted:
1.  Use Two Pointers to find Intersection count.
2.  Union count = `len(A) + len(B) - Intersection`.

```python
def jaccard_similarity(user_skills, job_skills):
    # Sort first: O(N log N)
    user_skills.sort()
    job_skills.sort()
    
    intersection = 0
    i = 0
    j = 0
    
    while i < len(user_skills) and j < len(job_skills):
        if user_skills[i] == job_skills[j]:
            intersection += 1
            i += 1
            j += 1
        elif user_skills[i] < job_skills[j]:
            i += 1
        else:
            j += 1
            
    union = len(user_skills) + len(job_skills) - intersection
    return intersection / union if union > 0 else 0

# Example
u = ["python", "fastapi", "aws"]
j = ["aws", "docker", "python", "django"]
print(jaccard_similarity(u, j)) 
# Intersection: python, aws (2)
# Union: python, fastapi, aws, docker, django (5)
# Score: 2/5 = 0.4
```
