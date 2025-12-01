# 🐛 Debugging DSA Errors

Why is my code broken?

## 1. ♾️ Infinite Loops / Recursion Error
*   **Cause**: Base case missing or condition never met.
*   **Fix**:
    *   **While Loop**: Print the loop variable (`i`, `left`, `right`) at the start of the loop. Is it changing?
    *   **Recursion**: Check your `if n == 0: return` statement.

## 2. 💥 Index Out of Bounds
*   **Cause**: Accessing `arr[i]` when `i` is too big.
*   **Fix**:
    *   Check loop condition: `while i < len(arr)` vs `while i <= len(arr)`.
    *   Check `arr[i+1]` checks. Always ensure `i+1 < len(arr)`.

## 3. 🐌 Time Limit Exceeded (TLE)
*   **Cause**: Your algorithm is too slow (e.g., O(N^2) when O(N) is needed).
*   **Fix**:
    *   Look for nested loops. Can you use a HashMap?
    *   Are you re-calculating things? Use Memoization (DP).
    *   Input size check: If `N=10^5`, you need O(N) or O(N log N).

## 4. ❌ Wrong Answer
*   **Cause**: Logic error or edge case.
*   **Fix**:
    *   Test **Empty Input**: `[]` or `""`.
    *   Test **Single Element**: `[1]`.
    *   Test **Duplicates**: `[1, 2, 2, 3]`.
    *   Test **Negative Numbers**.
