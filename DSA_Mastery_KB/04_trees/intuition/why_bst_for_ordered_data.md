# 🧠 Why BST for Ordered Data?

Why not just use an Array?

## The Problem: Keeping things sorted
If you have a sorted array `[1, 5, 10, 20]`:
*   **Search**: O(log N) (Binary Search) - Great!
*   **Insert**: O(N) (Shift everyone over) - Bad.

## The Solution: Binary Search Tree (BST)
A BST is like a "dynamic sorted array".
*   **Search**: O(log N) (Go left/right).
*   **Insert**: O(log N) (Find spot, link new node). No shifting!

## The Catch: Balance
If you insert `1, 2, 3, 4, 5` in order, the tree becomes a line (Linked List).
Search becomes O(N).
**Fix**: Self-Balancing Trees (AVL, Red-Black) keep height at O(log N).
