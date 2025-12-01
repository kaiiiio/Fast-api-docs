# ⚔️ LeetCode 200: Number of Islands

**Difficulty**: Medium
**Pattern**: DFS / BFS (Flood Fill)

## Problem
Given a grid of '1's (land) and '0's (water), count the number of islands.

## Approach
Iterate through every cell.
If we find a '1':
1.  Increment Island Count.
2.  Trigger a **DFS** (or BFS) to sink the island.
    *   Mark current cell as '0' (visited).
    *   Recursively visit up, down, left, right.

*   Time: O(M * N)
*   Space: O(M * N) (Recursion stack)

```python
def numIslands(grid):
    if not grid: return 0
    count = 0
    
    def dfs(r, c):
        if r < 0 or c < 0 or r >= len(grid) or c >= len(grid[0]) or grid[r][c] == '0':
            return
        grid[r][c] = '0' # Sink it
        dfs(r+1, c)
        dfs(r-1, c)
        dfs(r, c+1)
        dfs(r, c-1)
        
    for r in range(len(grid)):
        for c in range(len(grid[0])):
            if grid[r][c] == '1':
                count += 1
                dfs(r, c)
    return count
```
