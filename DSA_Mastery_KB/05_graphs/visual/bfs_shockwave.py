import time
import os
from collections import deque

def visualize_bfs(graph, start):
    print(f"🌊 BFS SHOCKWAVE (Start: {start})")
    print("-----------------------------------")
    
    queue = deque([start])
    visited = set([start])
    level = 0
    
    while queue:
        print(f"\n🌊 Wave Level {level}: {list(queue)}")
        time.sleep(1)
        
        level_size = len(queue)
        for _ in range(level_size):
            node = queue.popleft()
            print(f"  👉 Visiting: {node}")
            
            for neighbor in graph[node]:
                if neighbor not in visited:
                    print(f"     Found new neighbor: {neighbor}")
                    visited.add(neighbor)
                    queue.append(neighbor)
        level += 1

if __name__ == "__main__":
    # A -- B -- C
    # |    |
    # D -- E
    graph = {
        "A": ["B", "D"],
        "B": ["A", "C", "E"],
        "C": ["B"],
        "D": ["A", "E"],
        "E": ["B", "D"]
    }
    visualize_bfs(graph, "A")
