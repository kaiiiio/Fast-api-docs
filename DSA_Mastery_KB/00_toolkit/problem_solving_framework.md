# 🧩 The DSA Problem Solving Framework

Don't panic. Follow the system.

## 1. 🧪 Understand (The "Input/Output" Phase)
*   **Read twice.**
*   **Example Walkthrough**: Take the provided example and trace it manually.
*   **Constraints**:
    *   `N <= 10^5` -> O(N) or O(N log N).
    *   `N <= 20` -> O(2^N) (Backtracking).
*   **Edge Cases**: Empty input? Negative numbers? Duplicates?

## 2. 🔨 Brute Force (The "Naive" Phase)
*   State the stupidest solution first.
*   "I could check every substring..." -> O(N^2).
*   **Why?** It proves you understand the problem and gives you a baseline to beat.

## 3. 🧠 Pattern Match (The "Tool Selection" Phase)
*   **Sorted Array?** -> Binary Search, Two Pointers.
*   **"Top K" elements?** -> Heap.
*   **"Shortest Path"?** -> BFS.
*   **"Combinations/Permutations"?** -> Backtracking.
*   **"Subarrays/Substrings"?** -> Sliding Window.

## 4. ⚡ Optimize (The "Refinement" Phase)
*   Can we use a HashMap to trade space for time?
*   Can we do it in one pass?
*   Can we use pointers instead of slicing?

## 5. 📝 Code (The "Implementation" Phase)
*   Write clean, modular code.
*   Use meaningful variable names (`left_ptr`, `max_window_size`).

## 6. 🐞 Dry Run (The "Verification" Phase)
*   Don't run it yet.
*   Step through your code with the example input line-by-line.
*   Catch off-by-one errors here.
