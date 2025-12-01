# ⚔️ LeetCode 703: Kth Largest Element in a Stream

**Difficulty**: Easy
**Pattern**: Min Heap

## Problem
Design a class to find the `k`th largest element in a stream.

## Approach
Maintain a Min Heap of size `k`.
The root of the heap is always the `k`th largest element.
When adding a number:
1.  Push to heap.
2.  If size > k, Pop min.
3.  Return heap[0].

*   Time: O(log K) per add.
*   Space: O(K).

```python
import heapq

class KthLargest:
    def __init__(self, k, nums):
        self.k = k
        self.heap = []
        for n in nums:
            self.add(n)
            
    def add(self, val):
        heapq.heappush(self.heap, val)
        if len(self.heap) > self.k:
            heapq.heappop(self.heap)
        return self.heap[0]
```
