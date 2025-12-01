# DP: Memoization Tree (Top-Down)

## Problem: Fibonacci(5)
Without Memoization: O(2^N) - Exponential
With Memoization: O(N) - Linear

### The Pruned Tree
```
          fib(5)
         /      \
    fib(4)      fib(3)  <-- CACHED! (Don't recompute)
    /    \
fib(3)  fib(2)
  |       |
Cached  Cached
```

### The Cache (HashMap)
`{ 0:0, 1:1, 2:1, 3:2, 4:3, 5:5 }`

**Key Insight**: We only compute each sub-problem ONCE.
The tree becomes a straight line (conceptually).
