# ⚔️ LeetCode 70: Climbing Stairs

**Difficulty**: Easy
**Pattern**: DP (Fibonacci)

## Problem
You are climbing a staircase. It takes `n` steps to reach the top.
Each time you can climb 1 or 2 steps.
How many distinct ways can you climb to the top?

## Approach
To reach step `i`, you could have come from:
1.  Step `i-1` (took 1 step).
2.  Step `i-2` (took 2 steps).

So: `Ways(i) = Ways(i-1) + Ways(i-2)`.
This is exactly the Fibonacci sequence.

*   Time: O(N)
*   Space: O(1) (Optimized)

```python
def climbStairs(n):
    if n <= 2: return n
    a, b = 1, 2
    for _ in range(3, n + 1):
        a, b = b, a + b
    return b
```
