# Search Algorithms in AI: Navigation & Intelligence

In AI, many problems (Games, Pathfinding, Planning) are framed as **Search Problems**.

## 🌲 Tree & Graph Search Basics
- **State**: A configuration of the problem (e.g., current board position).
- **Action**: A transition from one state to another.
- **Goal Test**: Checking if the current state is the solution.

---

## 🔍 Uninformed Search (Blind Search)
No knowledge of the goal's location.
1. **BFS (Breadth-First Search)**:
    - **Logic**: Explores layer by layer.
    - **Pros**: Finds the shortest path.
2. **DFS (Depth-First Search)**:
    - **Logic**: Goes as deep as possible before backtracking.
    - **Pros**: Uses less memory.

---

## 💡 Informed Search (Heuristic Search)
Uses a **Heuristic ($h(n)$)**—an educated guess of the distance to the goal.

### 1. A* Search (The Industry Standard)
- **Concept**: Combines path cost $g(n)$ and heuristic $h(n)$.
- **Formula**: $f(n) = g(n) + h(n)$
- **Use Case**: Google Maps, Game pathfinding.

### 2. Best-First Search
- **Concept**: Expands the node that *looks* closest to the goal based only on $h(n)$.

---

## 🎮 Adversarial Search (Game Theory)
Used for games like Chess/Tic-Tac-Toe.

### 1. Minimax Algorithm
- **Logic**: One player tries to **Maximize** their score, while the other tries to **Minimize** it.
- **The Tree**: Builds a tree of all possible future moves.

### 2. Alpha-Beta Pruning
- **Concept**: An optimization for Minimax. If we find a branch that is obviously worse than one we already explored, we "prune" (ignore) it.
- **Benefit**: Significantly speeds up the search.

---

## 🐍 Python: BFS Simulation
```python
from collections import deque

def bfs(graph, start_node):
    visited = set()
    queue = deque([start_node])
    
    while queue:
        node = queue.popleft()
        if node not in visited:
            print(f"Visiting: {node}")
            visited.add(node)
            queue.extend(graph[node])

# Graph: A -> B,C | B -> D | C -> E
graph = {'A': ['B', 'C'], 'B': ['D'], 'C': ['E'], 'D': [], 'E': []}
bfs(graph, 'A')
```
