class DynamicArray:
    """
    A simplified Python implementation of a Dynamic Array (like Java ArrayList).
    """
    def __init__(self):
        self.capacity = 2
        self.size = 0
        self.array = [0] * self.capacity
        
    def append(self, val):
        if self.size == self.capacity:
            self._resize()
            
        self.array[self.size] = val
        self.size += 1
        
    def _resize(self):
        """
        Doubles the capacity. O(N) operation, but amortized O(1).
        """
        print(f"⚠️ Resizing from {self.capacity} to {self.capacity * 2}")
        self.capacity *= 2
        new_array = [0] * self.capacity
        
        # Copy elements
        for i in range(self.size):
            new_array[i] = self.array[i]
            
        self.array = new_array
        
    def __str__(self):
        return str(self.array[:self.size]) + f" (Capacity: {self.capacity})"

if __name__ == "__main__":
    arr = DynamicArray()
    arr.append(1)
    arr.append(2)
    print(arr) # [1, 2] (Capacity: 2)
    
    arr.append(3) # Triggers resize
    print(arr) # [1, 2, 3] (Capacity: 4)
