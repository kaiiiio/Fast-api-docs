# ⚔️ LeetCode 1: Two Sum (Hash Map)

**Difficulty**: Easy
**Pattern**: Hash Map

## Problem
Find two numbers that add up to `target`.

## Approach
Iterate through the array.
For each number `x`, we need `y = target - x`.
Check if `y` is in our Hash Map.
If yes, return indices.
If no, add `x` to Hash Map.

*   Time: O(N)
*   Space: O(N)

```python
def twoSum(nums, target):
    seen = {} # Val -> Index
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []
```
