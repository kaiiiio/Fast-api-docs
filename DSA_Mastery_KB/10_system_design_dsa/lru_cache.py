class Node:
    def __init__(self, key, val):
        self.key = key
        self.val = val
        self.prev = None
        self.next = None

class LRUCache:
    """
    Least Recently Used (LRU) Cache.
    Get: O(1)
    Put: O(1)
    Uses HashMap + Doubly Linked List.
    """
    def __init__(self, capacity):
        self.capacity = capacity
        self.cache = {} # Map<Key, Node>
        
        # Dummy head and tail
        self.head = Node(0, 0)
        self.tail = Node(0, 0)
        self.head.next = self.tail
        self.tail.prev = self.head
        
    def _remove(self, node):
        prev = node.prev
        nxt = node.next
        prev.next = nxt
        nxt.prev = prev
        
    def _add(self, node):
        # Add to right (Most Recently Used)
        prev = self.tail.prev
        prev.next = node
        self.tail.prev = node
        node.prev = prev
        node.next = self.tail
        
    def get(self, key):
        if key in self.cache:
            node = self.cache[key]
            self._remove(node)
            self._add(node) # Move to MRU
            return node.val
        return -1
        
    def put(self, key, value):
        if key in self.cache:
            self._remove(self.cache[key])
        
        node = Node(key, value)
        self._add(node)
        self.cache[key] = node
        
        if len(self.cache) > self.capacity:
            # Evict LRU (from left)
            lru = self.head.next
            self._remove(lru)
            del self.cache[lru.key]

if __name__ == "__main__":
    lru = LRUCache(2)
    lru.put(1, 1)
    lru.put(2, 2)
    print(lru.get(1)) # 1 (1 is now MRU)
    lru.put(3, 3)     # Evicts 2
    print(lru.get(2)) # -1 (Not found)
