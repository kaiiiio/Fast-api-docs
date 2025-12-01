# DP Table: Fibonacci

"Bottom-Up: Solving small problems to solve big ones."

Goal: `Fib(5)`
Base Cases: `Fib(0)=0`, `Fib(1)=1`

## The Table
| Index | 0 | 1 | 2 | 3 | 4 | 5 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Val** | 0 | 1 | 1 | 2 | 3 | 5 |

## The Logic
`dp[i] = dp[i-1] + dp[i-2]`

1.  `dp[2] = 1 + 0 = 1`
2.  `dp[3] = 1 + 1 = 2`
3.  `dp[4] = 2 + 1 = 3`
4.  `dp[5] = 3 + 2 = 5`

**Result**: 5.
**Time**: O(N). **Space**: O(N) (or O(1) if optimized).
