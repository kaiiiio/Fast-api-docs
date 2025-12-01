# ⚔️ LeetCode 206: Reverse Linked List

**Difficulty**: Easy
**Pattern**: In-Place Reversal

## Problem
Given the head of a singly linked list, reverse the list, and return the reversed list.

## Approach: Iterative
Use 3 pointers: `prev`, `curr`, `next_temp`.
1.  Save `curr.next` to `next_temp`.
2.  Point `curr.next` backwards to `prev`.
3.  Move `prev` to `curr`.
4.  Move `curr` to `next_temp`.

*   Time: O(N)
*   Space: O(1)

```python
def reverseList(head):
    prev = None
    curr = head
    
    while curr:
        next_temp = curr.next
        curr.next = prev
        prev = curr
        curr = next_temp
        
    return prev
```
