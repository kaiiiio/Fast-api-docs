# 🧠 Intuition: Overlapping Subproblems

When should you use Dynamic Programming?
When you are solving the **same problem** over and over again.

## Example: Fibonacci(5)
```
      F(5)
     /    \
   F(4)   F(3)
   /  \   /  \
 F(3) F(2) F(2) F(1)
```
Notice `F(3)` is calculated TWICE.
`F(2)` is calculated THREE times.

## The Fix: Memoization (Caching)
"If I've seen this input before, return the saved answer."

## DP vs Divide & Conquer
*   **Divide & Conquer (Merge Sort)**: Subproblems are unique (splitting unique array parts).
*   **DP**: Subproblems overlap (same index, same state).
