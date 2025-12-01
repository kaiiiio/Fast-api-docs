class Graph:
    """
    Adjacency List Implementation.
    Pros: Saves space for sparse graphs. O(1) to find neighbors.
    Cons: O(V) to check edge existence.
    """
    def __init__(self):
        self.adj_list = {}
        
    def add_vertex(self, vertex):
        if vertex not in self.adj_list:
            self.adj_list[vertex] = []
            
    def add_edge(self, v1, v2, bidirectional=True):
        self.add_vertex(v1)
        self.add_vertex(v2)
        
        self.adj_list[v1].append(v2)
        if bidirectional:
            self.adj_list[v2].append(v1)
            
    def print_graph(self):
        for vertex, neighbors in self.adj_list.items():
            print(f"{vertex} -> {neighbors}")

if __name__ == "__main__":
    g = Graph()
    g.add_edge("A", "B")
    g.add_edge("A", "C")
    g.print_graph()
