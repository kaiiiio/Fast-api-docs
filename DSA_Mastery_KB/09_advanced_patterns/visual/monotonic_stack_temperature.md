# Monotonic Stack: Daily Temperatures

**Problem**: For each day, how many days until a warmer temperature?
Input: `[73, 74, 75, 71, 69, 72, 76]`

## The Pattern
We want to find the **Next Greater Element**.
Use a **Decreasing Stack**.

## Visual
Stack stores indices `(index, temp)`.

1.  `73`: Push. Stack: `[(0, 73)]`
2.  `74`: `74 > 73`. Pop `73`. Answer for `0` is `1-0=1`. Push `74`. Stack: `[(1, 74)]`
3.  `75`: `75 > 74`. Pop `74`. Answer for `1` is `2-1=1`. Push `75`. Stack: `[(2, 75)]`
4.  `71`: `71 < 75`. Push. Stack: `[(2, 75), (3, 71)]`
5.  ...
6.  `72`: `72 > 71`. Pop `71`. Answer for `3` is `5-3=2`.

## Key Idea
Keep the stack sorted. When you find a "breaker" (larger element), you resolve everything in the stack smaller than it.
