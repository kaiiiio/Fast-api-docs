# Stack: LIFO (Last In, First Out)

Think of a stack of plates. You can only add or remove from the **TOP**.

```
      |     |      Push(3)      |     |
      |     |    ---------->    |  3  |  <-- Top
      |  2  |                   |  2  |
      |  1  |                   |  1  |
      +-----+                   +-----+
```

## Operations
1.  **Push(x)**: Add `x` to top. O(1).
2.  **Pop()**: Remove top. O(1).
3.  **Peek()**: Look at top. O(1).
