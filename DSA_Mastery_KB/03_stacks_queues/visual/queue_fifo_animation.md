# Queue: FIFO (First In, First Out)

Think of a line at a store. You join at the **Back** and leave from the **Front**.

```
      Front                            Back
      +---+---+---+      Enqueue(4)    +---+---+---+---+
<---- | 1 | 2 | 3 |   <-------------   | 1 | 2 | 3 | 4 | <----
      +---+---+---+                    +---+---+---+---+
```

## Operations
1.  **Enqueue(x)**: Add `x` to back. O(1).
2.  **Dequeue()**: Remove front. O(1).
