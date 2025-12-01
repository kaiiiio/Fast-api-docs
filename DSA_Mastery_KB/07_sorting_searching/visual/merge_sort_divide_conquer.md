# Merge Sort: Divide and Conquer

"Divide the problem until it's trivial, then combine."

## The Process
1.  **Divide**: Split array in half.
2.  **Conquer**: Recursively sort both halves.
3.  **Combine**: Merge two sorted halves.

```
       [38, 27, 43, 3]
          /      \
    [38, 27]    [43, 3]
     /    \      /    \
   [38]  [27]  [43]  [3]  <-- Base Case (Sorted!)
     \    /      \    /
    [27, 38]    [3, 43]   <-- Merge
          \      /
       [3, 27, 38, 43]    <-- Final Merge
```

## Complexity
*   **Time**: O(N log N) always.
*   **Space**: O(N) (Auxiliary array).
