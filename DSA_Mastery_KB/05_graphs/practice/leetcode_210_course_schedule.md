# ⚔️ LeetCode 210: Course Schedule II

**Difficulty**: Medium
**Pattern**: Topological Sort

## Problem
Return the ordering of courses you should take to finish all courses.

## Approach: Kahn's Algorithm (BFS)
1.  Build Adjacency List and In-Degree array.
2.  Add courses with 0 In-Degree to Queue.
3.  Process Queue, adding to result list.
4.  If result length == numCourses, valid. Else, cycle detected.

```python
from collections import deque

def findOrder(numCourses, prerequisites):
    adj = {i: [] for i in range(numCourses)}
    in_degree = {i: 0 for i in range(numCourses)}
    
    for course, pre in prerequisites:
        adj[pre].append(course)
        in_degree[course] += 1
        
    queue = deque([c for c in in_degree if in_degree[c] == 0])
    res = []
    
    while queue:
        course = queue.popleft()
        res.append(course)
        
        for neighbor in adj[course]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)
                
    return res if len(res) == numCourses else []
```
