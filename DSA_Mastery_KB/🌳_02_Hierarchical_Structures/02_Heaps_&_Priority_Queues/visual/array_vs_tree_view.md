# Heap: Array vs Tree View

## The Magic Trick
A Heap is a **Tree** that lives inside an **Array**.

### Tree View
```
      10 (Index 0)
     /  \
   20    5 (Index 2)
  /  \
 30  40
```

### Array View
`[ 10, 20, 5, 30, 40 ]`

### The Formulas
For any node at index `i`:
- **Left Child**: `2*i + 1`
- **Right Child**: `2*i + 2`
- **Parent**: `(i - 1) // 2`

**Example**:
Node `20` is at index `1`.
- Left Child: `2*1 + 1 = 3` -> Value `30`
- Right Child: `2*1 + 2 = 4` -> Value `40`
- Parent: `(1 - 1) // 2 = 0` -> Value `10`
