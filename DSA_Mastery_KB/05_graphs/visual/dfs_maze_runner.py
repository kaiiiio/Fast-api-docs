import time
import os

def visualize_dfs(graph, node, visited=None, path=None):
    if visited is None: visited = set()
    if path is None: path = []
    
    visited.add(node)
    path.append(node)
    
    print(f"🏃 DFS Runner: At {node} | Path: {' -> '.join(path)}")
    time.sleep(1)
    
    for neighbor in graph[node]:
        if neighbor not in visited:
            print(f"  ⬇️ Going deep into {neighbor}...")
            visualize_dfs(graph, neighbor, visited, path)
            print(f"  ⬆️ Backtracking to {node}")
            
    path.pop()

if __name__ == "__main__":
    # A -- B -- C
    # |
    # D
    graph = {
        "A": ["B", "D"],
        "B": ["A", "C"],
        "C": ["B"],
        "D": ["A"]
    }
    visualize_dfs(graph, "A")
