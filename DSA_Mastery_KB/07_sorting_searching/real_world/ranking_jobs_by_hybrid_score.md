# 🌍 Real World: Ranking Jobs (Hybrid Score)

**Scenario**: You want to show "Best Matches" first.
Score = `(SkillMatch * 0.7) + (Recency * 0.2) + (Salary * 0.1)`

## The Problem
You have 10,000 jobs. You calculate the score for all of them.
Now you need to sort them.

## The Solution: Custom Comparator
Most languages allow sorting objects with a custom function.

```python
jobs = [
    {"id": 1, "score": 0.85},
    {"id": 2, "score": 0.92},
    {"id": 3, "score": 0.60}
]

# Sort descending by score
jobs.sort(key=lambda x: x["score"], reverse=True)
```

## Under the Hood
Python uses **Timsort** (Hybrid Merge Sort + Insertion Sort).
It's stable and incredibly fast for real-world data (which is often partially sorted).
