# Big O: The Growth Charts

## 1. It's Not About "Time"

Big O does **not** measure seconds. It measures **Operations vs Input Size (N)**.
If `N` doubles, how much does the work increase?

---

## 2. The Hierarchy of Speed

| Notation | Name | Analogy | Example |
|---|---|---|---|
| **O(1)** | Constant | "Instant" | Accessing Array Index `arr[5]` |
| **O(log N)** | Logarithmic | "Cutting in Half" | Binary Search |
| **O(N)** | Linear | "Reading a Book" | Iterating a List |
| **O(N log N)** | Linearithmic | "Smart Sorting" | Merge Sort, Quick Sort |
| **O(N^2)** | Quadratic | "Handshakes" | Nested Loops (Bubble Sort) |
| **O(2^N)** | Exponential | "Cell Division" | Recursive Fibonacci |
| **O(N!)** | Factorial | "Permutations" | Traveling Salesman |

---

## 3. Visualizing the Curves

```
Operations
  ^
  |                                 / O(N!)
  |                               /
  |                             / O(2^N)
  |                           /
  |                         / O(N^2)
  |                       /
  |                     /
  |                   / O(N log N)
  |                 /
  |               / O(N)
  |             /
  |___________/____________________ O(log N)
  |________________________________ O(1)
  +---------------------------------> Input Size (N)
```

**Rule of Thumb**:
- `N = 1,000,000` -> Aim for **O(N)** or **O(N log N)**.
- `N = 10,000` -> **O(N^2)** might survive.
- `N = 20` -> **O(2^N)** is acceptable.
