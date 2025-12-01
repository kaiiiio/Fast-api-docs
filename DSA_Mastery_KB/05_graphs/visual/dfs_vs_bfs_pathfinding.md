# DFS vs BFS: The Maze Runners

## DFS (Depth-First Search)
"The Bold Explorer". Goes as deep as possible, then backtracks.
**Stack** based (Recursion).

```
    A
   / \
  B   C
 /
D
```
Path: `A -> B -> D -> (back) -> C`
**Use Case**: Maze solving, Finding *any* path, Cycle detection.

## BFS (Breadth-First Search)
"The Cautious Shockwave". Explores neighbors layer by layer.
**Queue** based.

```
    A
   / \
  B   C
 /
D
```
Path: `A -> B -> C -> D`
**Use Case**: **Shortest Path** in unweighted graph, GPS, Social Network degrees.
