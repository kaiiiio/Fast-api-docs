from collections import deque

def bfs_blueprint(graph, start_node):
    """
    Blueprint for BFS (Shortest Path, Level Order)
    Time: O(V+E), Space: O(V)
    """
    queue = deque([start_node])
    visited = set([start_node])
    
    while queue:
        node = queue.popleft()
        print(f"Visiting: {node}")
        
        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)

def dfs_blueprint(graph, node, visited=None):
    """
    Blueprint for DFS (Maze, Path Finding)
    Time: O(V+E), Space: O(V) - Recursion Stack
    """
    if visited is None:
        visited = set()
    
    visited.add(node)
    print(f"Visiting: {node}")
    
    for neighbor in graph[node]:
        if neighbor not in visited:
            dfs_blueprint(graph, neighbor, visited)
