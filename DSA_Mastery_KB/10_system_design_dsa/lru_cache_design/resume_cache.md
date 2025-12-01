# 🌍 Real World: Resume Cache

**Scenario**: You have 1 million resumes. Parsing them is slow (5 seconds).
Users often view the same resume multiple times (Recruiter A, then Recruiter B).

## The Solution: LRU Cache
Store the *parsed* JSON in memory.

1.  **Key**: Resume ID (or File Hash).
2.  **Value**: Parsed JSON Object.
3.  **Capacity**: 10,000 resumes (approx 1GB RAM).

## Why LRU?
*   **Locality of Reference**: Resumes that are popular *now* (active job application) are likely to be viewed again soon.
*   **Automatic Cleanup**: Old resumes naturally fall off the end.
