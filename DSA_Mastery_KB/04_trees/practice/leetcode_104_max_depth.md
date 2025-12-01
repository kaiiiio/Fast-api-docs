# ⚔️ LeetCode 104: Maximum Depth of Binary Tree

**Difficulty**: Easy
**Pattern**: DFS (Recursion)

## Problem
Find the number of nodes along the longest path from root to leaf.

## Approach
Recursive DFS.
`Depth = 1 + max(Depth(Left), Depth(Right))`
Base case: If node is None, depth is 0.

*   Time: O(N)
*   Space: O(H) (Height of tree)

```python
def maxDepth(root):
    if not root:
        return 0
    return 1 + max(maxDepth(root.left), maxDepth(root.right))
```
