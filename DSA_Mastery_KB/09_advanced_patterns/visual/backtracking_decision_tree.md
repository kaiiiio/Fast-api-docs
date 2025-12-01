# Backtracking: The Decision Tree

"Explore every path. If you hit a wall, go back."

Problem: Permutations of `[1, 2]`

```
          Root
         /    \
      [1]      [2]
       |        |
    [1, 2]    [2, 1]
```

## The Algorithm
1.  **Choose**: Add an element to current path.
2.  **Explore**: Recurse.
3.  **Un-Choose**: Remove element (Backtrack).

## Visual Trace
1.  Start `[]`.
2.  Choose `1` -> `[1]`.
3.  Choose `2` -> `[1, 2]`. (Done!)
4.  Backtrack -> `[1]`.
5.  Backtrack -> `[]`.
6.  Choose `2` -> `[2]`.
7.  Choose `1` -> `[2, 1]`. (Done!)
