# 🍳 Time Complexity Cookbook

Know your limits.

## 📈 The Growth Charts

| Notation | Name | Speed | Input Size (approx) | Algorithms |
| :--- | :--- | :--- | :--- | :--- |
| **O(1)** | Constant | ⚡ Instant | Infinite | Hash Map Lookup, Array Index |
| **O(log N)** | Logarithmic | 🏎️ Very Fast | billions | Binary Search |
| **O(N)** | Linear | 🏃 Fast | ~10^8 | Iteration, Two Pointers |
| **O(N log N)**| Linearithmic | 🚶 Decent | ~10^6 | Merge Sort, Quick Sort |
| **O(N^2)** | Quadratic | 🐢 Slow | ~5,000 | Nested Loops (Bubble Sort) |
| **O(2^N)** | Exponential | 🐌 Crawling | ~20 | Recursion (Fibonacci) |
| **O(N!)** | Factorial | 🛑 Stalled | ~10 | Permutations |

## 🧠 Mental Shortcuts
*   **Halving the input?** -> `O(log N)`
*   **One loop?** -> `O(N)`
*   **Loop inside a loop?** -> `O(N^2)`
*   **Sorting?** -> `O(N log N)`
*   **"Try all combinations"?** -> `O(2^N)` or `O(N!)`
