class GraphMatrix:
    """
    Adjacency Matrix Implementation.
    Pros: O(1) to check edge existence.
    Cons: O(V^2) space. Bad for sparse graphs.
    """
    def __init__(self, size):
        self.size = size
        self.matrix = [[0] * size for _ in range(size)]
        self.vertex_map = {} # "A" -> 0
        self.index_map = {}  # 0 -> "A"
        self.count = 0
        
    def add_vertex(self, vertex):
        if vertex not in self.vertex_map:
            self.vertex_map[vertex] = self.count
            self.index_map[self.count] = vertex
            self.count += 1
            
    def add_edge(self, v1, v2, weight=1):
        if v1 in self.vertex_map and v2 in self.vertex_map:
            i = self.vertex_map[v1]
            j = self.vertex_map[v2]
            self.matrix[i][j] = weight
            self.matrix[j][i] = weight # Undirected
            
    def print_matrix(self):
        print("  " + " ".join([self.index_map[i] for i in range(self.count)]))
        for i in range(self.count):
            row = [str(val) for val in self.matrix[i][:self.count]]
            print(f"{self.index_map[i]} {' '.join(row)}")

if __name__ == "__main__":
    g = GraphMatrix(3)
    g.add_vertex("A")
    g.add_vertex("B")
    g.add_vertex("C")
    g.add_edge("A", "B")
    g.print_matrix()
