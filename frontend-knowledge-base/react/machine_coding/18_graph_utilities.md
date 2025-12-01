# Graph Utilities: BFS, DFS, Shortest Path

Graph algorithms and data structure implementations.

## 1. Graph Representation

### Question
Implement graph data structures using adjacency list and matrix.

### Solution

```javascript
// Adjacency List
class Graph {
    constructor() {
        this.adjacencyList = {};
    }
    
    addVertex(vertex) {
        if (!this.adjacencyList[vertex]) {
            this.adjacencyList[vertex] = [];
        }
    }
    
    addEdge(vertex1, vertex2) {
        if (!this.adjacencyList[vertex1]) {
            this.addVertex(vertex1);
        }
        if (!this.adjacencyList[vertex2]) {
            this.addVertex(vertex2);
        }
        
        this.adjacencyList[vertex1].push(vertex2);
        this.adjacencyList[vertex2].push(vertex1); // Undirected
    }
    
    removeEdge(vertex1, vertex2) {
        this.adjacencyList[vertex1] = this.adjacencyList[vertex1].filter(
            v => v !== vertex2
        );
        this.adjacencyList[vertex2] = this.adjacencyList[vertex2].filter(
            v => v !== vertex1
        );
    }
    
    removeVertex(vertex) {
        while (this.adjacencyList[vertex].length) {
            const adjacentVertex = this.adjacencyList[vertex].pop();
            this.removeEdge(vertex, adjacentVertex);
        }
        delete this.adjacencyList[vertex];
    }
}

// Adjacency Matrix
class GraphMatrix {
    constructor(vertices) {
        this.vertices = vertices;
        this.matrix = Array(vertices).fill(null).map(() => 
            Array(vertices).fill(0)
        );
    }
    
    addEdge(from, to, weight = 1) {
        this.matrix[from][to] = weight;
        this.matrix[to][from] = weight; // Undirected
    }
    
    hasEdge(from, to) {
        return this.matrix[from][to] !== 0;
    }
}
```

---

## 2. Depth-First Search (DFS)

### Question
Implement DFS traversal for a graph.

### Solution

```javascript
// Recursive DFS
function dfsRecursive(graph, start, visited = new Set(), result = []) {
    visited.add(start);
    result.push(start);
    
    for (let neighbor of graph[start] || []) {
        if (!visited.has(neighbor)) {
            dfsRecursive(graph, neighbor, visited, result);
        }
    }
    
    return result;
}

// Iterative DFS
function dfsIterative(graph, start) {
    const stack = [start];
    const visited = new Set();
    const result = [];
    
    while (stack.length > 0) {
        const vertex = stack.pop();
        
        if (!visited.has(vertex)) {
            visited.add(vertex);
            result.push(vertex);
            
            // Add neighbors in reverse order for same traversal
            for (let i = graph[vertex].length - 1; i >= 0; i--) {
                const neighbor = graph[vertex][i];
                if (!visited.has(neighbor)) {
                    stack.push(neighbor);
                }
            }
        }
    }
    
    return result;
}

// Usage
const graph = {
    A: ['B', 'C'],
    B: ['A', 'D', 'E'],
    C: ['A', 'F'],
    D: ['B'],
    E: ['B', 'F'],
    F: ['C', 'E']
};

console.log(dfsRecursive(graph, 'A')); // ['A', 'B', 'D', 'E', 'F', 'C']
```

---

## 3. Breadth-First Search (BFS)

### Question
Implement BFS traversal for a graph.

### Solution

```javascript
function bfs(graph, start) {
    const queue = [start];
    const visited = new Set([start]);
    const result = [];
    
    while (queue.length > 0) {
        const vertex = queue.shift();
        result.push(vertex);
        
        for (let neighbor of graph[vertex] || []) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push(neighbor);
            }
        }
    }
    
    return result;
}

// BFS with path tracking
function bfsWithPath(graph, start, target) {
    const queue = [[start, [start]]];
    const visited = new Set([start]);
    
    while (queue.length > 0) {
        const [vertex, path] = queue.shift();
        
        if (vertex === target) {
            return path;
        }
        
        for (let neighbor of graph[vertex] || []) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push([neighbor, [...path, neighbor]]);
            }
        }
    }
    
    return null; // No path found
}

// Usage
console.log(bfs(graph, 'A')); // ['A', 'B', 'C', 'D', 'E', 'F']
```

---

## 4. Shortest Path (Dijkstra's)

### Question
Implement Dijkstra's algorithm to find shortest path.

### Solution

```javascript
function dijkstra(graph, start) {
    const distances = {};
    const previous = {};
    const unvisited = new Set();
    const visited = new Set();
    
    // Initialize distances
    for (let vertex in graph) {
        distances[vertex] = Infinity;
        unvisited.add(vertex);
    }
    distances[start] = 0;
    
    while (unvisited.size > 0) {
        // Find unvisited vertex with smallest distance
        let current = null;
        let minDistance = Infinity;
        
        for (let vertex of unvisited) {
            if (distances[vertex] < minDistance) {
                minDistance = distances[vertex];
                current = vertex;
            }
        }
        
        if (current === null) break;
        
        unvisited.delete(current);
        visited.add(current);
        
        // Update distances to neighbors
        for (let neighbor in graph[current]) {
            if (!visited.has(neighbor)) {
                const weight = graph[current][neighbor];
                const alt = distances[current] + weight;
                
                if (alt < distances[neighbor]) {
                    distances[neighbor] = alt;
                    previous[neighbor] = current;
                }
            }
        }
    }
    
    return { distances, previous };
}

// Reconstruct path
function getPath(previous, target) {
    const path = [];
    let current = target;
    
    while (current !== undefined) {
        path.unshift(current);
        current = previous[current];
    }
    
    return path;
}

// Usage
const weightedGraph = {
    A: { B: 4, C: 2 },
    B: { A: 4, C: 1, D: 5 },
    C: { A: 2, B: 1, D: 8, E: 10 },
    D: { B: 5, C: 8, E: 2 },
    E: { C: 10, D: 2 }
};

const { distances, previous } = dijkstra(weightedGraph, 'A');
console.log(distances); // { A: 0, B: 3, C: 2, D: 8, E: 10 }
```

---

## 5. Topological Sort

### Question
Implement topological sort for a directed acyclic graph (DAG).

### Solution

```javascript
function topologicalSort(graph) {
    const inDegree = {};
    const queue = [];
    const result = [];
    
    // Calculate in-degrees
    for (let vertex in graph) {
        inDegree[vertex] = 0;
    }
    
    for (let vertex in graph) {
        for (let neighbor of graph[vertex]) {
            inDegree[neighbor] = (inDegree[neighbor] || 0) + 1;
        }
    }
    
    // Find vertices with no incoming edges
    for (let vertex in inDegree) {
        if (inDegree[vertex] === 0) {
            queue.push(vertex);
        }
    }
    
    // Process vertices
    while (queue.length > 0) {
        const vertex = queue.shift();
        result.push(vertex);
        
        for (let neighbor of graph[vertex] || []) {
            inDegree[neighbor]--;
            if (inDegree[neighbor] === 0) {
                queue.push(neighbor);
            }
        }
    }
    
    // Check for cycle
    if (result.length !== Object.keys(graph).length) {
        return null; // Cycle detected
    }
    
    return result;
}

// Usage
const dag = {
    A: ['C'],
    B: ['C', 'D'],
    C: ['E'],
    D: ['F'],
    E: ['F'],
    F: []
};

console.log(topologicalSort(dag)); // ['A', 'B', 'C', 'D', 'E', 'F']
```

---

## 6. Cycle Detection

### Question
Implement a function to detect cycles in a directed graph.

### Solution

```javascript
function hasCycle(graph) {
    const WHITE = 0; // Unvisited
    const GRAY = 1;  // Visiting
    const BLACK = 2; // Visited
    
    const color = {};
    
    // Initialize all vertices as white
    for (let vertex in graph) {
        color[vertex] = WHITE;
    }
    
    function dfs(vertex) {
        color[vertex] = GRAY;
        
        for (let neighbor of graph[vertex] || []) {
            if (color[neighbor] === GRAY) {
                return true; // Back edge found (cycle)
            }
            if (color[neighbor] === WHITE && dfs(neighbor)) {
                return true;
            }
        }
        
        color[vertex] = BLACK;
        return false;
    }
    
    for (let vertex in graph) {
        if (color[vertex] === WHITE) {
            if (dfs(vertex)) {
                return true;
            }
        }
    }
    
    return false;
}

// Usage
const cyclicGraph = {
    A: ['B'],
    B: ['C'],
    C: ['A']
};

console.log(hasCycle(cyclicGraph)); // true
```

---

## 7. Number of Islands

### Question
Implement a function that counts the number of islands in a 2D grid.

### Solution

```javascript
function numIslands(grid) {
    if (!grid || grid.length === 0) return 0;
    
    const rows = grid.length;
    const cols = grid[0].length;
    let count = 0;
    
    function dfs(row, col) {
        if (row < 0 || row >= rows || 
            col < 0 || col >= cols || 
            grid[row][col] === '0') {
            return;
        }
        
        grid[row][col] = '0'; // Mark as visited
        
        // Check all 4 directions
        dfs(row - 1, col);
        dfs(row + 1, col);
        dfs(row, col - 1);
        dfs(row, col + 1);
    }
    
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            if (grid[i][j] === '1') {
                count++;
                dfs(i, j);
            }
        }
    }
    
    return count;
}

// Usage
const grid = [
    ['1', '1', '0', '0', '0'],
    ['1', '1', '0', '0', '0'],
    ['0', '0', '1', '0', '0'],
    ['0', '0', '0', '1', '1']
];

console.log(numIslands(grid)); // 3
```

---

## Key Patterns

1. **Graph Representation**: Adjacency list vs matrix
2. **Traversal**: DFS (recursive/iterative), BFS
3. **Shortest Path**: Dijkstra's algorithm
4. **Topological Sort**: For DAGs
5. **Cycle Detection**: DFS with colors
6. **Grid Problems**: 2D array as graph

## Best Practices

- ✅ Choose appropriate representation
- ✅ Handle disconnected graphs
- ✅ Detect cycles
- ✅ Optimize for large graphs
- ✅ Use appropriate algorithm
- ✅ Handle edge cases

