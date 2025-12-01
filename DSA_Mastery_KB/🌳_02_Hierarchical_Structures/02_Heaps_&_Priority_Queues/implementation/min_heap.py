class MinHeap:
    def __init__(self):
        self.heap = []
        
    def push(self, val):
        self.heap.append(val)
        self._sift_up(len(self.heap) - 1)
        
    def pop(self):
        if not self.heap: return None
        if len(self.heap) == 1: return self.heap.pop()
        
        root = self.heap[0]
        self.heap[0] = self.heap.pop() # Move last to root
        self._sift_down(0)
        return root
        
    def _sift_up(self, i):
        parent = (i - 1) // 2
        if i > 0 and self.heap[i] < self.heap[parent]:
            self.heap[i], self.heap[parent] = self.heap[parent], self.heap[i]
            self._sift_up(parent)
            
    def _sift_down(self, i):
        smallest = i
        left = 2 * i + 1
        right = 2 * i + 2
        
        if left < len(self.heap) and self.heap[left] < self.heap[smallest]:
            smallest = left
            
        if right < len(self.heap) and self.heap[right] < self.heap[smallest]:
            smallest = right
            
        if smallest != i:
            self.heap[i], self.heap[smallest] = self.heap[smallest], self.heap[i]
            self._sift_down(smallest)

if __name__ == "__main__":
    h = MinHeap()
    h.push(10)
    h.push(5)
    h.push(20)
    print(h.pop()) # 5
    print(h.pop()) # 10
