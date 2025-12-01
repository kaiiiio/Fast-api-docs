class Stack:
    """
    LIFO (Last In First Out) - Like a stack of plates.
    """
    def __init__(self):
        self.items = []
        
    def push(self, item):
        # O(1) amortized
        self.items.append(item)
        
    def pop(self):
        # O(1)
        if not self.is_empty():
            return self.items.pop()
        return None
        
    def peek(self):
        if not self.is_empty():
            return self.items[-1]
        return None
        
    def is_empty(self):
        return len(self.items) == 0
        
    def size(self):
        return len(self.items)
