class DisjointSet:
    """
    Union Find with Path Compression and Union by Rank.
    """
    def __init__(self, size):
        self.parent = [i for i in range(size)]
        self.rank = [1] * size
        
    def find(self, i):
        if self.parent[i] != i:
            # Path Compression
            self.parent[i] = self.find(self.parent[i])
        return self.parent[i]
        
    def union(self, i, j):
        root_i = self.find(i)
        root_j = self.find(j)
        
        if root_i != root_j:
            # Union by Rank
            if self.rank[root_i] < self.rank[root_j]:
                self.parent[root_i] = root_j
            elif self.rank[root_i] > self.rank[root_j]:
                self.parent[root_j] = root_i
            else:
                self.parent[root_j] = root_i
                self.rank[root_i] += 1
            return True
        return False

if __name__ == "__main__":
    dsu = DisjointSet(5)
    dsu.union(0, 1)
    dsu.union(1, 2)
    print(dsu.find(0) == dsu.find(2)) # True
