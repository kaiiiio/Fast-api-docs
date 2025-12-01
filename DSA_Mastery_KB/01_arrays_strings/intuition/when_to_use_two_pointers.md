# 🧠 When to Use Two Pointers

Stop using nested loops.

## The Problem: O(N^2)
You want to find a pair of numbers, or a substring, or compare ends of an array.
Naive approach:
```python
for i in range(n):
    for j in range(i+1, n):
        # ... check arr[i] and arr[j]
```
This is slow.

## The Solution: O(N)
Use two pointers to scan the array in one pass.

## 🚦 Signals to Use It
1.  **Sorted Array**: If the array is sorted, you can make decisions to move `left` or `right` based on the sum. (e.g., Two Sum II).
2.  **Palindrome**: Comparing start and end characters moving inwards.
3.  **In-Place Operations**: Removing duplicates or moving zeros (one "read" pointer, one "write" pointer).
4.  **Merging**: Merging two sorted arrays (Merge Sort step).

## 🔄 Types
1.  **Opposite Direction**: `left -> ... <- right`. (Two Sum, Palindrome, Container With Most Water).
2.  **Same Direction**: `slow -> ... fast ->`. (Remove Duplicates, Cycle Detection).
