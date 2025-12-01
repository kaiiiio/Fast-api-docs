class ListNode:
    def __init__(self, key, val):
        self.key = key
        self.val = val
        self.next = None

class HashMap:
    """
    Simple HashMap with Chaining.
    """
    def __init__(self, capacity=100):
        self.capacity = capacity
        self.buckets = [None] * capacity
        
    def _hash(self, key):
        return hash(key) % self.capacity
        
    def put(self, key, val):
        index = self._hash(key)
        head = self.buckets[index]
        
        # Check if key exists (Update)
        curr = head
        while curr:
            if curr.key == key:
                curr.val = val
                return
            curr = curr.next
            
        # Insert new node at head
        new_node = ListNode(key, val)
        new_node.next = head
        self.buckets[index] = new_node
        
    def get(self, key):
        index = self._hash(key)
        curr = self.buckets[index]
        while curr:
            if curr.key == key:
                return curr.val
            curr = curr.next
        return -1

if __name__ == "__main__":
    hm = HashMap()
    hm.put("name", "Alice")
    hm.put("age", 30)
    print(hm.get("name")) # Alice
