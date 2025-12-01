# ⚔️ LeetCode 141: Linked List Cycle

**Difficulty**: Easy
**Pattern**: Fast & Slow Pointers (Floyd's Cycle Finding Algorithm)

## Problem
Determine if a linked list has a cycle in it.

## Approach
Use two pointers: `slow` (moves 1 step) and `fast` (moves 2 steps).
If there is a cycle, `fast` will eventually lap `slow` and they will meet.
If `fast` reaches `None`, there is no cycle.

*   Time: O(N)
*   Space: O(1)

```python
def hasCycle(head):
    slow = head
    fast = head
    
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        
        if slow == fast:
            return True
            
    return False
```
