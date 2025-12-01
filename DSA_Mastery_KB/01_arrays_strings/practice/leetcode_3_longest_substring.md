# ⚔️ LeetCode 3: Longest Substring Without Repeating Characters

**Difficulty**: Medium
**Pattern**: Sliding Window

## Problem
Given a string `s`, find the length of the longest substring without repeating characters.

## Approach: Sliding Window
Use a set (or map) to track characters in the current window.
1.  Expand `right` pointer.
2.  If `s[right]` is in set, shrink `left` pointer until duplicate is removed.
3.  Update `max_len`.

*   Time: O(N)
*   Space: O(min(N, 26))

```python
def lengthOfLongestSubstring(s):
    char_set = set()
    left = 0
    max_len = 0
    
    for right in range(len(s)):
        while s[right] in char_set:
            char_set.remove(s[left])
            left += 1
        char_set.add(s[right])
        max_len = max(max_len, right - left + 1)
        
    return max_len
```
