# ⚔️ LeetCode 912: Sort an Array

**Difficulty**: Medium
**Pattern**: Merge Sort / Heap Sort

## Problem
Sort an array of integers in O(N log N) time.

## Approach: Merge Sort
Implement Merge Sort from scratch.
(Quick Sort might TLE on LeetCode due to worst-case test cases).

```python
def sortArray(nums):
    if len(nums) <= 1:
        return nums
        
    mid = len(nums) // 2
    left = sortArray(nums[:mid])
    right = sortArray(nums[mid:])
    
    return merge(left, right)

def merge(left, right):
    res = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] < right[j]:
            res.append(left[i])
            i += 1
        else:
            res.append(right[j])
            j += 1
    res.extend(left[i:])
    res.extend(right[j:])
    return res
```
