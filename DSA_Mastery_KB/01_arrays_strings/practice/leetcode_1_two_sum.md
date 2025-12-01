# ⚔️ LeetCode 1: Two Sum

**Difficulty**: Easy
**Pattern**: Hash Map (or Two Pointers if sorted)

## Problem
Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.

## Approach 1: Brute Force
Nested loops.
*   Time: O(N^2)
*   Space: O(1)

## Approach 2: Hash Map (Optimal)
Store `val -> index` in a map.
For each number `x`, check if `target - x` exists in the map.
*   Time: O(N)
*   Space: O(N)

```python
def twoSum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []
```
