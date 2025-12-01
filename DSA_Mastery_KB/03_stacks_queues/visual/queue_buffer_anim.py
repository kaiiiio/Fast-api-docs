import time
import os

class CircularQueueVisualizer:
    def __init__(self, k):
        self.k = k
        self.queue = [None] * k
        self.head = -1
        self.tail = -1
        
    def enqueue(self, value):
        print(f"\n📥 Enqueue: {value}")
        if (self.tail + 1) % self.k == self.head:
            print("❌ Queue Full!")
            return False
            
        if self.head == -1:
            self.head = 0
            
        self.tail = (self.tail + 1) % self.k
        self.queue[self.tail] = value
        self.print_state()
        time.sleep(1)
        return True
        
    def dequeue(self):
        print("\n📤 Dequeue")
        if self.head == -1:
            print("❌ Queue Empty!")
            return False
            
        self.queue[self.head] = None # Clear for visualization
        
        if self.head == self.tail:
            self.head = -1
            self.tail = -1
        else:
            self.head = (self.head + 1) % self.k
            
        self.print_state()
        time.sleep(1)
        return True
        
    def print_state(self):
        # os.system('cls' if os.name == 'nt' else 'clear')
        print(f"Buffer (Size {self.k}): {self.queue}")
        print(f"Head: {self.head}, Tail: {self.tail}")

if __name__ == "__main__":
    q = CircularQueueVisualizer(3)
    q.enqueue(1)
    q.enqueue(2)
    q.enqueue(3)
    q.enqueue(4) # Full
    q.dequeue()
    q.enqueue(4) # Wrap around
