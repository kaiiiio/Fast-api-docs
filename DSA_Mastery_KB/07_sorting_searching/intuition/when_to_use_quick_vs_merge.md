# 🧠 Quick Sort vs Merge Sort

Both are O(N log N). Which one wins?

## Quick Sort
*   **Pros**: Faster in practice (better cache locality). In-place (O(log N) stack space).
*   **Cons**: Worst case O(N^2) (rare with random pivot). Unstable (reorders equal elements).
*   **Use When**: General purpose in-memory sorting (Arrays.sort in Java uses Dual-Pivot Quicksort for primitives).

## Merge Sort
*   **Pros**: Stable. Guaranteed O(N log N). Good for Linked Lists (no random access needed).
*   **Cons**: Uses O(N) extra memory.
*   **Use When**: Sorting Linked Lists, External Sorting (Data too big for RAM), or Stability is required (Python's Timsort is based on Merge Sort).
